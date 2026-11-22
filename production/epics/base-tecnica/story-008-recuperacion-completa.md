# Story 008: Recuperación completa después de un error

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-008` (resto: recuperación completa con la última copia buena; la parte de fronteras y registro está en la historia 002)
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0003: Errores sin pantalla en blanco (y ADR-0002 para `blockSaves`, `loadSave`, `listSaves`, `exportSave`)
**ADR Decision Summary**: Tras una excepción fuera del dibujo se bloquea el guardado y la pantalla de recuperación vuelve a la última copia buena en memoria ("Volver al inicio"), exporta solo esa copia y ofrece otras copias; un chunk que no carga se reintenta guardando y recargando, y Ajustes › "Errores" muestra el registro.
**ADR Version**: 2026-11-22 (ADR-0003 y ADR-0002)

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Verificar (ADR-0003): (3) un `import()` de chunk que falla llega a la frontera de página con un error reconocible en Chromium, Firefox y Safari ("Failed to fetch dynamically imported module", "error loading dynamically imported module", "Importing a module script failed", "Unable to preload CSS for …"); (4) `navigator.clipboard.writeText` dentro del iframe del artefacto, con respaldo `textarea` + `execCommand('copy')`; (6) leer `localStorage` en un iframe `sandbox` sin `allow-same-origin` lanza `SecurityError`.

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0003 y ADR-0002)*:
- Required: `guarded` bloquea el guardado y registra (`engine_action_guard`); `blockSaves`/`unblockSaves`/`loadSave(id, { recover })`/`listSaves`/`exportSave` (`save_recovery`); retry de chunk con `location.reload()` tras `requestSave(g, 'menu')` (`chunk_failure_retry`).
- Forbidden: `save_after_engine_exception`, `auto_reload_on_error`, `chunk_reimport_retry`, `network_error_telemetry`, `per_action_state_clone`.
- Guardrail: `error-handling` costo nulo sin errores; registro ≤ 80 KB.

---

## Acceptance Criteria

*From ADR-0003 (Decision, Validation Criteria) and TR-base-tecnica-008:*

- [ ] Recuperación completa (estado contaminado): "Algo salió mal y frenamos el juego para no guardar datos dañados. Tu última partida guardada es del {fecha de juego} ({hace cuánto})." con "Volver al inicio" (principal: `loadSave(cabeza, { recover: true })` en memoria, `refreshDb`, Inicio, sin recargar la página), "Exportar la partida" (`exportSave(id de la cabeza)`: la última copia buena, nunca el estado en memoria), "Recargar" (`location.reload()` sin guardar), "Elegir otra copia" (las 3 de `listSaves()`, también con `recover: true`) y "Copiar el detalle".
- [ ] Una excepción fuera del dibujo con partida cargada (manejadores, temporizadores, avance, partido en vivo, promesas) y toda falla de `guarded` llaman a `blockSaves()` antes de cualquier otra cosa y muestran la recuperación completa: con una falla provocada en `advanceDay` el `seq` de la cabeza en IndexedDB no cambia, ni siquiera tras `visibilitychange` oculto; "Volver al inicio" carga una partida con la fecha de la última copia y un `Continuar` posterior vuelve a guardar (`seq` sube). Una falla dentro del efecto de `Locker.tsx:573` da la recuperación completa, no la de página. La frontera de página muestra la completa cuando `savesBlocked()` ya es verdadero.
- [ ] Chunk que no carga: "No se pudo cargar esta pantalla. Revisá la conexión." con "Reintentar", que llama a `retry()` del `LazyPage` (`reloadSafely`: `requestSave(g, 'menu')` y `location.reload()`), no vuelve a hacer `import()`, no contamina ni bloquea el guardado; con `page.route` devolviendo 404 para el chunk de Estadísticas, al quitar el bloqueo "Reintentar" recarga y se ve Estadísticas.
- [ ] Sin partida cargada (pantalla de inicio) la frontera raíz ofrece "Recargar" y "Exportar la partida" (la última copia buena, si hay); un fallo de `loadDb()` o `initSaves()` llega a esa pantalla.
- [ ] Ajustes › "Errores": lista, "Copiar todo" (texto plano por portapapeles o `textarea` + `execCommand('copy')`, también con el portapapeles bloqueado) y "Borrar"; con 25 errores provocados se ven 20; sin `localStorage` muestra "El registro no se guarda en este navegador"; un `Promise.reject` sin atrapar queda con `kind: 'rejection'` y una falla de `guarded`, una sola vez; sin pedidos a otros orígenes (`page.on('request')`).
- [ ] Las pantallas de recuperación llevan el foco a su título (`tabIndex={-1}`), se anuncian con `role="alert"`, usan `--sel` para el foco y pasan las comprobaciones de visibilidad de `tests/ui/helpers.cjs` (`H.visibility`) en cinco resoluciones, con los textos y la distribución de la especificación de UX (pendiente: `/ux-design` de las dos pantallas de recuperación antes de implementar la interfaz).
- [ ] Capturas retenidas en `production/qa/evidence/` de cada pantalla tocada: recuperación completa, recuperación de página, chunk que no carga, "Elegir otra copia" y Ajustes › "Errores".
- [ ] `npm run build` y `npm run test:engine` pasan; pasan `tests/ui/errores.cjs` (completo, con las comprobaciones de ADR-0003), `bandeja.cjs`, `mercado.cjs`, `vestuario.cjs` y `guardado.cjs`; `memory-screens.cjs … desktop 5` y `match-frames.cjs` sin diferencia medible (< 2 ms por pantalla, mismos cuadros).

---

## Implementation Notes

*Derived from ADR-0003 Implementation Guidelines:*

- Una excepción fuera del dibujo con partida cargada debe llamar a `blockSaves()` antes de cualquier otra cosa; después de eso nada debe escribir la partida hasta que "Volver al inicio" o "Elegir otra copia" cargue un estado del disco con `recover: true`.
- Nunca se debe exportar ni guardar el estado en memoria cuando está contaminado.
- "Reintentar" un chunk nunca debe volver a hacer `import()`: llama a `retry()` (guardar y recargar).
- Ninguna recarga ni navegación automática tras un error.
- Nunca se debe tomar un `structuredClone` del `Game` como respaldo previo a una acción.
- El registro nunca debe hacer pedidos de red ni guardar el nombre del DT, nombres de partidas ni texto que escribió el usuario; `logError` y `recentErrors` no deben lanzar nunca.
- "Copiar el detalle" y "Copiar todo" deben tener el respaldo de `textarea` seleccionado + `execCommand('copy')`.
- La pantalla de recuperación debe llevar el foco a su título (`tabIndex={-1}`), anunciarse con `role="alert"`, usar `--sel` para el foco y pasar las comprobaciones de visibilidad de `tests/ui/helpers.cjs`.
- `unblockSaves()` solo debe llamarse después de cargar un estado del disco (ADR-0002).
- Los atajos de prueba (`window.__boom`) y `{ t: 'fault' }` existen solo con `import.meta.env.DEV`.
- Riesgo del ADR: si el error se repite al volver a la última copia, "Elegir otra copia" con las 3 copias y el detalle para reportarlo.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 002 (`story-002-fronteras-de-error.md`): fronteras, registro, `guarded`, recuperación de página y manejadores globales.
- Story 006 (`story-006-guardado-en-segundo-plano.md`): `blockSaves`/`unblockSaves`/`loadSave`/`listSaves`.
- Story 007 (`story-007-exportar-importar.md`): `exportSave` y el formato `.tasave`.
- Story 004 (`story-004-paginas-datos-fuentes.md`): `lazyPage` y `LazyPage.retry`.

---

## Files

- `src/ui/errors.tsx`, `src/errors.ts`
- `src/ui/App.tsx`, `src/main.tsx`, `src/ui/Nav.tsx` (Ajustes › "Errores")
- `src/save/index.ts` (solo si falta alguna función de recuperación)
- `tests/ui/errores.cjs` (completo)
- `production/qa/evidence/` (capturas de cada pantalla)

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: UI
**Required evidence**:
- UI: a retained screenshot of each screen touched, in `production/qa/evidence/` (recuperación completa, de página, chunk, "Elegir otra copia", Ajustes › "Errores")

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/base-tecnica/story-002-fronteras-de-error.md`, `production/epics/base-tecnica/story-006-guardado-en-segundo-plano.md`, `production/epics/base-tecnica/story-007-exportar-importar.md`
- Unlocks: None
