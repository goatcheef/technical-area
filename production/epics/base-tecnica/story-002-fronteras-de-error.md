# Story 002: Fronteras de error y registro local

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-008` (parte: fronteras, registro, recuperación de página y exportar/recargar sobre el estado en memoria; el resto va en la historia 008)
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0003: Errores sin pantalla en blanco
**ADR Decision Summary**: Frontera raíz y por página, manejadores globales sin captura, `guarded` en las acciones del motor, un registro local `ta-errors` (últimos 20) y pantalla de recuperación en español; sin telemetría y sin recarga automática.
**ADR Version**: 2026-11-22

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Verificar al implementar (ADR-0003): (1) React 19.3 llama a `onCaughtError` por cada error atrapado y no lo vuelve a tirar a `window`; (2) un error en un manejador de evento de React llega a `window` `error` con `stack`; (5) `ResizeObserver loop completed…` llega sin `error.stack` y se ignora; (6) en un iframe `sandbox` sin `allow-same-origin` leer `localStorage` ya lanza `SecurityError`; (4) `navigator.clipboard.writeText` puede rechazar dentro del artefacto.

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0003)*:
- Required: cada página de `App.tsx` dentro de `ErrorBoundary scope="page"`; `guarded` en las llamadas al motor desde efectos/`useMemo`; un solo lugar escribe el registro (`src/errors.ts`).
- Forbidden: `auto_reload_on_error`, `network_error_telemetry`, `per_action_state_clone`, `page_without_error_boundary`, `unguarded_engine_call_in_effect`, `save_after_engine_exception`.
- Guardrail: `error-handling` costo nulo sin errores; registro ≤ 80 KB.

---

## Acceptance Criteria

*From ADR-0003 (Decision, Validation Criteria) and TR-base-tecnica-008, scoped to this story:*

- [ ] `src/errors.ts` (sin React) exporta `logError`, `recentErrors`, `clearErrors`, `errorsAsText`, `classify`, `installGlobalHandlers`, `setErrorContext`, `guarded` y `reloadSafely` con las firmas del ADR; `logError` y `recentErrors` nunca lanzan (`try/catch` también al leer la propiedad `localStorage`; sin él el registro queda en memoria).
- [ ] El registro `localStorage` `ta-errors` guarda los últimos 20 (pila recortada a 4 KB), con tipo, mensaje, pila, página, acción, fecha de juego, temporada, código del club, `Game.version`, id del build y hora real; no hace pedidos de red ni guarda el nombre del DT ni texto escrito por el usuario.
- [ ] Un error se registra una sola vez (`WeakSet`) aunque pase por `guarded`, `onCaughtError`/`onUncaughtError` y los manejadores globales; un valor lanzado que no es objeto se envuelve en `Error`. `classify` da benigno para `ResizeObserver loop…`, `"Script error."` sin pila o de fuera del origen y `SaveError`, chunk para lo marcado por `vite:preloadError` y los mensajes de chunk que no carga, y fatal en el resto; los manejadores globales van sin captura (la falla de un `<img>` no llega).
- [ ] `main.tsx`: `installGlobalHandlers` → `createRoot` con `onCaughtError`/`onUncaughtError` (que escriben en el registro y en desarrollo siguen llamando a `console.error(error, errorInfo.componentStack)`) → frontera raíz por fuera de `App` y del tema del club; la raíz usa solo HTML con estilos en línea mínimos y no depende de `g`, de `clubTheme`, de un chunk diferido ni de `localStorage` al dibujar.
- [ ] Cada página de `App.tsx` (incluidos el día de partido y el flujo posterior) está dentro de `ErrorBoundary scope="page"` con `resetKey` = `page` + `id`: la barra de navegación sigue usable y cambiar de página reinicia la frontera.
- [ ] Un error al dibujar sin `guarded` no contamina: pantalla "Esta pantalla tuvo un problema. Tu partida está bien." con "Volver al inicio" (navega a Inicio y reinicia la frontera), "Exportar la partida" (el estado en memoria, con el `exportGame` actual), "Recargar" (`reloadSafely`: guarda por el camino de guardado actual y recarga) y "Copiar el detalle" (con respaldo `textarea` + `execCommand('copy')`).
- [ ] `guarded` envuelve `advanceDay` (en el bucle de `advance`), `finishUserMatch`, `startNewSeason`, `newGame`, `takeJob`, el paso del partido en vivo, `run`/`act` de `deal.tsx`, la resolución en `Inbox.tsx` y `Locker.tsx` y toda llamada al motor desde un `useEffect`/`useMemo` (empezando por `Locker.tsx:573`); si lanza, registra con el nombre de la acción, marca el estado como contaminado y relanza. Una excepción fuera del dibujo con partida cargada muestra una pantalla de recuperación completa con solo "Recargar" (`location.reload()` sin guardar) y "Copiar el detalle", y el camino de guardado actual no vuelve a escribir (bandera local de `errors.ts` hasta que la historia 006 la reemplace por `blockSaves`).
- [ ] La pantalla de recuperación lleva el foco a su título (`tabIndex={-1}`), se anuncia con `role="alert"`, usa `--sel` para el foco y pasa las comprobaciones de visibilidad de `tests/ui/helpers.cjs`; los atajos `window.__boom` existen solo con `import.meta.env.DEV`.
- [ ] `npm run build` y `npm run test:engine` pasan; pasan los `tests/ui/*.cjs` que toca (`bandeja.cjs`, `mercado.cjs`, `vestuario.cjs`, `guardado.cjs` sin cambios).

---

## Implementation Notes

*Derived from ADR-0003 Implementation Guidelines:*

- Cada página de `App.tsx` debe estar dentro de una `ErrorBoundary scope="page"` con `resetKey` de su ruta; ninguna página nueva se agrega sin ella.
- La frontera raíz y `RecoveryScreen scope="root"` no deben importar nada que dependa de `g`, de `clubTheme` ni de un chunk diferido, ni leer `localStorage` al dibujar; usan HTML con estilos en línea mínimos.
- Las entradas del motor listadas y toda llamada al motor desde un `useEffect` o un `useMemo` deben pasar por `guarded` con el nombre de la acción.
- Los manejadores globales deben registrarse sin captura (`capture: false`).
- Todo error debe pasar por el `WeakSet` antes de registrarse; nunca se registra dos veces.
- El registro nunca debe hacer pedidos de red ni guardar el nombre del DT, nombres de partidas ni texto que escribió el usuario.
- `logError` y `recentErrors` no deben lanzar nunca (`try/catch` también al acceder a `localStorage`).
- `onCaughtError`/`onUncaughtError` deben seguir llamando a `console.error` en desarrollo.
- "Copiar el detalle" debe tener el respaldo de `textarea` seleccionado + `execCommand('copy')`.
- La pantalla de recuperación debe llevar el foco a su título (`tabIndex={-1}`), anunciarse con `role="alert"`, usar `--sel` para el foco y pasar las comprobaciones de visibilidad de `tests/ui/helpers.cjs`.
- Nunca se debe tomar un `structuredClone` del `Game` como respaldo previo a una acción. Ninguna recarga ni navegación automática tras un error.
- Los atajos de prueba (`window.__boom`) deben existir solo con `import.meta.env.DEV`.
- Orden de implementación (Ordering Note de ADR-0003): las fronteras, el registro y la pantalla de página van antes que ADR-0002, con "Exportar" sobre el estado en memoria y "Recargar" sin guardar; `blockSaves` y "Volver al inicio" con la última copia buena llegan con la historia 006 y 008.
- **Pendiente de UX:** las dos pantallas de recuperación necesitan su especificación (`/ux-design`: textos finales y distribución en celular) antes de implementar su interfaz (Migration Plan 7 de ADR-0003).

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 006 (`story-006-guardado-en-segundo-plano.md`): `blockSaves`/`unblockSaves`/`savesBlocked` reales y `requestSave`.
- Story 007 (`story-007-exportar-importar.md`): `exportSave` y el formato `.tasave`.
- Story 008 (`story-008-recuperacion-completa.md`): "Volver al inicio" con la última copia, "Elegir otra copia", "Reintentar" de chunk y Ajustes › "Errores".
- Story 004 (`story-004-paginas-datos-fuentes.md`): `lazyPage` y fallos de `loadDb()`.

---

## Files

- `src/errors.ts` (nuevo)
- `src/ui/errors.tsx` (nuevo: `ErrorBoundary`, `RecoveryScreen`)
- `src/main.tsx`
- `src/ui/App.tsx`
- `src/ui/deal.tsx`, `src/ui/Inbox.tsx`, `src/ui/Locker.tsx`, `src/ui/MatchView.tsx`
- `tests/ui/errores.cjs` (nuevo, parte de ADR-0003 Validation Criteria; waived at qa.level minimal)

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Integration
**Required evidence**:
- Integration: Test: waived at qa.level minimal (advisory)

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/base-tecnica/story-004-paginas-datos-fuentes.md`, `production/epics/base-tecnica/story-008-recuperacion-completa.md`
