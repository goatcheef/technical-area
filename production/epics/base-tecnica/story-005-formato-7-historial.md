# Story 005: Formato de partida 7 con tope del historial

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-007`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0002: Guardado en segundo plano, por momentos, con copias
**ADR Decision Summary**: `Game.version` pasa a 7; `migrateGame` encadena migraciones `v → v+1` y `foldHistory` deja 3 temporadas detalladas por jugador más `careerTotals`, sin plegar nunca las temporadas en clubes del DT.
**ADR Version**: 2026-11-22

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Sin APIs posteriores al corte (ADR-0002). `src/engine/migrate.ts` es TypeScript puro y se prueba con `tsx`.

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0002)*:
- Required: `GAME_VERSION = 7`, `migrateGame(raw)`, `foldHistory(g)`, `HISTORY_SEASONS = 3` en `src/engine/migrate.ts`; `startNewSeason` llama a `foldHistory`.
- Forbidden: `game_shape_change_without_version` (cambio de forma de `Game` sin subir `GAME_VERSION` y sin paso en `migrateGame`).
- Guardrail: `save-size` JSON ≤ 6 MB y gzip ≤ 1,1 MB a las 10 temporadas.

---

## Acceptance Criteria

*From ADR-0002 (Decision, Validation Criteria) and TR-base-tecnica-007:*

- [ ] `src/engine/migrate.ts` exporta `GAME_VERSION = 7`, `HISTORY_SEASONS = 3`, `migrateGame(raw): Game` (encadena `v → v+1`; 6 → 7 pliega el historial; lanza `SaveFormatError('future' | 'old' | 'shape')`) y `foldHistory(g)`; una partida de versión mayor a 7 se rechaza con "Esta partida es de una versión más nueva del juego" y una menor a 6 también; después de migrar corre `refreshDb` como hoy.
- [ ] `foldHistory` deja `HISTORY_SEASONS` (3) temporadas detalladas por jugador y suma las más viejas en `p.careerTotals` (`seasons`, `apps`, `subs`, `goals`, `ast`, `clubs`); es idempotente (dos veces = una vez) y los totales quedan iguales a la suma de lo plegado.
- [ ] `foldHistory` nunca pliega las temporadas en clubes que dirigió el DT (`manager.career[].clubId` y el club actual): quedan enteras.
- [ ] `startNewSeason` llama a `foldHistory` y `Game.version` de una partida nueva es 7; `Player.careerTotals?` está tipado en `types.ts`; `App.tsx` deja de descartar en silencio toda partida que no sea versión 6 (usa `migrateGame`).
- [ ] La ficha de jugador y las estadísticas que leen `history` siguen mostrando la carrera y los totales (con `careerTotals`) y no fallan con jugadores plegados.
- [ ] `node --expose-gc --import tsx tests/perf/engine-bench.ts 10 12345` da JSON a las 10 temporadas ≤ 6 MB (hoy 7,25 MB) y gzip ≤ 1,1 MB; las cifras antes y después quedan registradas.
- [ ] `tests/engine/migrate.ts` (agregado a `npm run test:engine`) cubre: `foldHistory` dos veces = una vez; totales = suma de lo plegado; temporadas en clubes del DT intactas; una partida v6 migra a v7; `version: 99` y versión < 6 se rechazan.
- [ ] `npm run sim -- 3` con las semillas 12345, 777 y 4242 queda dentro de la calibración de referencia; `npm run build` y `npm run test:engine` pasan; pasan los `tests/ui/*.cjs` que toca (`vestuario.cjs`, `mercado.cjs`, `bandeja.cjs`).

---

## Implementation Notes

*Derived from ADR-0002 Implementation Guidelines:*

- Todo cambio de forma de `Game` debe subir `GAME_VERSION` y agregar un paso a `migrateGame`; campos opcionales nuevos con `?? valor` no lo suben (regla actual).
- `foldHistory` nunca debe plegar temporadas en clubes que dirigió el DT y debe dejar los totales iguales a la suma de lo plegado.
- Se pliega en `startNewSeason` y en la migración (el historial crece ~0,5 MB por temporada: hotspot 6 del perfil).
- Una partida de versión mayor a la del juego no se abre; una de versión menor a 6 tampoco. Un build viejo cacheado rechaza una partida 7 en vez de leerla mal.
- Riesgo del ADR: la migración 6 → 7 puede estropear la partida; `tests/engine/migrate.ts` compara totales. (El `saves/'auto'` viejo se conserva en la historia 006.)

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 006 (`story-006-guardado-en-segundo-plano.md`): el servicio de guardado, la base IndexedDB v2 y la migración de la clave `'auto'`.
- Story 007 (`story-007-exportar-importar.md`): importar partidas viejas `.json` y `.tasave` (usa `migrateGame`).

---

## Files

- `src/engine/migrate.ts` (nuevo)
- `src/engine/types.ts`, `src/engine/game.ts`
- `src/ui/App.tsx` (carga), `src/ui/PlayerPage.tsx`, `src/ui/Tables.tsx` (lectura de `history`/`careerTotals`)
- `tests/engine/migrate.ts` (nuevo), `package.json` (`test:engine`)

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Logic
**Required evidence**:
- Logic: Test: waived at qa.level minimal (advisory)

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/base-tecnica/story-006-guardado-en-segundo-plano.md`
