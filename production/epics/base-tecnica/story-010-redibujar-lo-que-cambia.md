# Story 010: Redibujar solo lo que cambia

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-010`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`: cambiar de pantalla y avanzar redibuja solo lo que cambió, hoy 190 a 363 ms en CPU 4×)*

**ADR Governing Implementation**: N/A — optimización aprobada en la fase 5 del perfil (hotspot 5, `production/polish/full-report-2026-11-19.md`)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: N/A — sin ADR. Hotspot 5: `refresh()` (`useReducer` en la raíz de `App.tsx:109`) vuelve a renderizar toda la pantalla activa; solo 2 `useMemo` y ningún `memo` en `src/ui/`. Los componentes dependen de que `g` se mute en el lugar: un `useMemo` con `g` como dependencia no se invalida solo.

**Control Manifest Rules (this layer)**: N/A — `docs/architecture/control-manifest.md` does not exist; ningún ADR gobierna esta historia, así que el registro (`docs/registry/architecture.yaml`) no aporta reglas. Regla del proyecto (`CLAUDE.md`): `useSticky` para el estado de pantalla que debe sobrevivir a la navegación; `PlayerTable.tsx` es el componente único de tablas de jugadores.

---

## Acceptance Criteria

*From the epic's requirement TR-base-tecnica-010 and hotspot 5 of the profile:*

- [ ] Estadísticas (`Tables.tsx:122-152`): los 8 rankings salen de un solo recorrido más un `useMemo` por categoría y fecha; los nodos DOM bajan de 4.245 a menos de 1.500 (objetivo del perfil).
- [ ] Bandeja (`Inbox.tsx:135`), Vestuario (`Locker.tsx:71`), Mercado › Buscar (`Market.tsx:117`) y Tablas memorizan sus cálculos y limitan los nodos que dibujan; las filas de `PlayerTable.tsx` pasan a `React.memo`.
- [ ] Las dependencias de cada `useMemo` usan claves que cambian con el estado (`g.date`, `g.news.length`, `g.transfers.length`, como ya hace Mercado) y no `g` solo: después de una acción que muta `g` y llama a `refresh()`, cada pantalla muestra los datos nuevos (los `tests/ui/*.cjs` lo comprueban). Granularidad de `refresh()`: el `refresh()` global de `App.tsx` no cambia de contrato; cada pantalla cachea lo suyo.
- [ ] Sin cambio visual: los textos, el orden, las columnas y lo que el DT ve por defecto no cambian; `bandeja.cjs`, `mercado.cjs` y `vestuario.cjs` pasan sin tocar sus aserciones.
- [ ] Medición antes y después con CPU 4× y la partida de 3 temporadas con `node tests/perf/memory-screens.cjs http://localhost:4321/ cpu4` (cambio de pantalla): hoy Estadísticas 363 ms, Bandeja 190, Vestuario 198, Mercado › Buscar 174; objetivos del perfil, Estadísticas < 150 ms y Bandeja < 100 ms; las demás cifras (Plantel 108, Ficha de club 120) quedan registradas y no empeoran; se agrega la comparación de nodos DOM.
- [ ] `npm run build` y `npm run test:engine` pasan; pasan `tests/ui/bandeja.cjs`, `mercado.cjs`, `vestuario.cjs` y los demás `tests/ui/*.cjs` que toca; `match-frames.cjs` sin diferencia medible.

---

## Implementation Notes

*Hotspot 5 y su Approach del perfil (no hay ADR):*

- Empezar por Estadísticas (los 8 rankings salen de un solo recorrido + un `useMemo` por categoría y fecha) y por la Bandeja (limitar y paginar los mensajes renderizados); después `React.memo` en filas de `PlayerTable`.
- No hace falta tocar `refresh()` global si cada pantalla cachea lo suyo.
- Un `useMemo` con `g` como dependencia no se invalida solo: usar claves como `g.date`, `g.news.length`, `g.transfers.length`.
- Si limitar la Bandeja cambia lo que el DT ve por defecto, confirmarlo con el usuario antes (el criterio de la historia es que no haya cambio visual).
- `PlayerTable.tsx:143` usa `limit` 200 sin virtualizar; recortar nodos DOM sin cambiar columnas ni anchos de `COLS` (`CLAUDE.md`).

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 001 (`story-001-cancha-en-pausa.md`): el bucle de dibujo de la cancha 2D.
- Story 009 (`story-009-ia-rival-liviana.md`): el costo del motor (`planMatch`, `squadOf`).
- Story 004 (`story-004-paginas-datos-fuentes.md`): carga diferida de las páginas.
- Virtualización de listas (no aprobada en la fase 5).

---

## Files

- `src/ui/Tables.tsx`, `src/ui/Inbox.tsx`, `src/ui/Locker.tsx`, `src/ui/Market.tsx`, `src/ui/PlayerTable.tsx`, `src/ui/App.tsx`
- `tests/perf/memory-screens.cjs` (medición antes y después)
- `tests/ui/bandeja.cjs`, `tests/ui/mercado.cjs`, `tests/ui/vestuario.cjs` (deben pasar sin cambios)

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
- Unlocks: None
