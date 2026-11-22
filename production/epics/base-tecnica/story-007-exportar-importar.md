# Story 007: Exportar e importar la partida

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-006`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0002: Guardado en segundo plano, por momentos, con copias
**ADR Decision Summary**: Archivo `.tasave` (gzip de `{ format, formatVersion, meta, game }`) con `exportSave`/`importSave`; importar acepta también el `.json` viejo y texto pegado; dentro del artefacto la descarga lleva un panel "¿No se descargó?" con la copia como texto.
**ADR Version**: 2026-11-22

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Verificar (ADR-0002): (4) la descarga en el artefacto con la capacidad `downloads` y qué pasa sin ella; (8) el selector de archivos de iOS con `accept=".tasave,.json,.gz,application/octet-stream,application/json"`; `navigator.clipboard.writeText` pide `allow="clipboard-write"` del anfitrión (si rechaza, `textarea` + `execCommand('copy')`).

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0002)*:
- Required: `exportSave(src: Game | Slot)` e `importSave(src: File | string)` en `src/save/index.ts` (`save_recovery`).
- Forbidden: `storage_outside_save_service`, `overwrite_head_slot` (importar nunca borra el anillo antes de escribir la partida nueva), `save_after_engine_exception`.
- Guardrail: `save-size` gzip ≤ 1,1 MB a las 10 temporadas (el `.tasave` pesa ~0,8 MB).

---

## Acceptance Criteria

*From ADR-0002 (Decision, Validation Criteria) and TR-base-tecnica-006:*

- [ ] `exportSave(src: Game | Slot)` baja `technical-area-<CÓDIGO>-<fecha>.tasave`, un gzip de `{ format: 'technical-area', formatVersion: 1, meta, game }`; acepta el `Game` en memoria o una copia guardada (`'a0'`-`'a2'`).
- [ ] `importSave(src: File | string)` acepta `.tasave`, el `.json` que exporta hoy `exportGame` y texto pegado (base64 del gzip); valida, migra con `migrateGame` y devuelve el `Game` sin escribir; el llamador pide la confirmación "Importar reemplaza tu partida guardada" y hace `requestSave(g, 'new')`. Un archivo dañado o de otro formato muestra un mensaje en lugar de lanzar sin atrapar; `version: 99` se rechaza con "Esta partida es de una versión más nueva del juego".
- [ ] Ida y vuelta: exportar y luego importar da un `Game` con el mismo `JSON.stringify` (salvo `careerTotals` ya plegado); importar el `.json` viejo funciona y pide confirmar el reemplazo; con una partida de 5,3 MB el `.tasave` pesa ~0,8 MB.
- [ ] Exportar agrega el `<a download>` al DOM antes del `click()` y revoca la URL `blob:` con `setTimeout(…, 4000)`; el artefacto se publica con la capacidad `downloads`.
- [ ] Al exportar se ofrece siempre el panel "¿No se descargó?" con "Copiar la partida como texto" (base64 del gzip) por `navigator.clipboard.writeText` y, si rechaza, un `textarea` seleccionado con `document.execCommand('copy')`; "Importar" acepta "Pegar partida".
- [ ] El `<input type="file">` usa `accept=".tasave,.json,.gz,application/octet-stream,application/json"`; las entradas de exportar e importar de `Start.tsx` y de los menús usan `exportSave`/`importSave` (el `exportGame` actual deja de usarse).
- [ ] Casos d, e y g de `tests/ui/guardado-copias.cjs` (exportar → importar con el mismo `Game`; importar el `.json` viejo con confirmación; con `downloads` bloqueado el panel ofrece el texto y con `clipboard-write` bloqueado, el `textarea`).
- [ ] `npm run build` y `npm run test:engine` pasan; pasan los `tests/ui/*.cjs` que toca (`guardado.cjs`, `guardado-copias.cjs`, `bandeja.cjs`).

---

## Implementation Notes

*Derived from ADR-0002 Implementation Guidelines:*

- Exportar debe agregar el `<a>` al DOM, revocar la URL a los 4 s y ofrecer siempre el panel "¿No se descargó?" con la copia como texto (portapapeles o `textarea` + `execCommand('copy')`).
- Crear o importar una partida nunca debe borrar el anillo antes de que la nueva esté escrita.
- Toda escritura de la partida debe pasar por `requestSave`/`flushNow`; ningún otro módulo debe llamar a `indexedDB` ni a `JSON.stringify(g)` para guardar.
- Revocar la URL enseguida cancela descargas de ~1 MB en Safari y Firefox; un iframe sin la capacidad `downloads` bloquea la descarga en silencio y no hay forma confiable de detectarlo (por eso el panel se ofrece siempre).
- Safari borra el almacenamiento a los 7 días sin uso (ITP): la ayuda recomienda exportar seguido en Safari.
- Nunca se debe exportar el estado en memoria cuando está contaminado (ADR-0003): la pantalla de recuperación usa `exportSave(id)` de una copia guardada (historia 008).

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 006 (`story-006-guardado-en-segundo-plano.md`): el servicio de guardado, `requestSave(g, 'new')` y el anillo.
- Story 005 (`story-005-formato-7-historial.md`): `migrateGame` y `foldHistory`.
- Story 008 (`story-008-recuperacion-completa.md`): "Exportar la partida" desde la pantalla de recuperación completa.

---

## Files

- `src/save/index.ts`, `src/save/exchange.ts` (nuevo: sobre `.tasave`, texto base64, descarga y portapapeles)
- `src/ui/Start.tsx`, `src/ui/Nav.tsx` (menús de exportar e importar), `src/store.ts` (retira `exportGame`)
- `tests/ui/guardado-copias.cjs`

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

- Depends on: `production/epics/base-tecnica/story-006-guardado-en-segundo-plano.md`
- Unlocks: `production/epics/base-tecnica/story-008-recuperacion-completa.md`
