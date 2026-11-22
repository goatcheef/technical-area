# Story 009: IA rival más liviana con resultados idénticos

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-009`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`: la planificación de partidos de la IA rival cuesta menos con resultados idénticos por semilla)*

**ADR Governing Implementation**: N/A — optimización aprobada en la fase 5 del perfil (hotspot 3, `production/polish/full-report-2026-11-19.md`)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: N/A — sin ADR. Hotspot 3: `planMatch` → `makePlan` es el 46,6 % de la CPU del motor en una temporada; `autoPick` 24,5 % propio; `squadOf` recorre los 3.200 jugadores en cada llamada (35,5 µs, 51 llamadas en el código); `finishUserMatch` 122,6 ms de mediana, `startNewSeason` ~490 ms.

**Control Manifest Rules (this layer)**: N/A — `docs/architecture/control-manifest.md` does not exist; ningún ADR gobierna esta historia, así que el registro (`docs/registry/architecture.yaml`) no aporta reglas. Regla del proyecto (`CLAUDE.md`): `src/engine/` es TypeScript puro con estado JSON serializable.

---

## Acceptance Criteria

*From the epic's requirement TR-base-tecnica-009 and hotspot 3 of the profile:*

- [ ] `squadOf` (`game.ts:62`) deja de filtrar `Object.values(g.players)` en cada llamada: usa un índice de jugadores por club (`Map<clubId, Player[]>`) armado una vez por día o temporada y se invalida ante cualquier cambio de club de un jugador (fichajes, préstamos, juveniles, altas y bajas, cambio de temporada); devuelve el mismo conjunto en el mismo orden que antes.
- [ ] `autoPick` (`game.ts:64-85`) precalcula `posRating` por jugador y puesto una vez por llamada en vez de recalcularlo en cada una de las 11 vueltas del bucle, sin cambiar el once elegido ni el desempate.
- [ ] El índice y cualquier caché quedan fuera de `Game` (el estado sigue siendo JSON serializable, `Game.version` no cambia) y no se altera el orden de las tiradas del azar con semilla.
- [ ] Resultados idénticos: `npm run sim -- 3 12345`, `npm run sim -- 3 777` y `npm run sim -- 3 4242` dan exactamente las mismas métricas antes y después (se guarda la salida de antes de tocar nada) y `npm run test:engine` pasa sin cambios.
- [ ] Costo medido antes y después con `node --expose-gc --import tsx tests/perf/engine-bench.ts 3 12345`, `npx tsx tests/perf/engine-micro.ts` y `node --cpu-prof … engine-bench.ts 1 12345` + `cpuprof.mjs`: mediana de `finishUserMatch` (hoy 122,6 ms), participación de `planMatch` (hoy 46,6 %), `startNewSeason` (hoy ~490 ms) y `squadOf` (hoy 35,5 µs); el perfil estima ~80 ms por fecha y ~300 ms de `startNewSeason` (estimado, a confirmar con la medición).
- [ ] `npm run build` pasa; pasan los `tests/ui/*.cjs` que toca (los que abren el día de partido: `bandeja.cjs`, `mercado.cjs`, `vestuario.cjs`).

---

## Implementation Notes

*Hotspot 3 y su Approach del perfil (no hay ADR):*

- (a) Índice de jugadores por club (o una `Map<clubId, Player[]>` armada una vez por día/temporada) en lugar de filtrar `Object.values(g.players)` en `squadOf`: mismo resultado, es lo más seguro.
- (b) En `autoPick`, precalcular `posRating` por jugador y puesto una vez por llamada en vez de recalcularlo en cada una de las 11 vueltas del bucle `for (const i of open) for (const p of pool)`.
- Hacer (a) y (b) y volver a medir con `tests/perf/engine-bench.ts` y `cpuprof.mjs`.
- Criterio de aceptación del perfil: el simulador da exactamente los mismos resultados con la misma semilla; cualquier cambio en el orden de las tiradas o en el desempate cambia resultados y calibración.
- Usar `g.nextId` para jugadores pasa `g.players` a modo diccionario y vuelve lento todo el juego (`CLAUDE.md`): no tocar la numeración de ids.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Reutilizar la selección de once entre formaciones cercanas en `bestFormation`/`makePlan` (opción (c) del perfil: puede cambiar resultados; no aprobada acá).
- Story 010 (`story-010-redibujar-lo-que-cambia.md`): costo de dibujo de las pantallas.
- Story 001 (`story-001-cancha-en-pausa.md`): bucle de dibujo de la cancha.

---

## Files

- `src/engine/game.ts` (`squadOf`, `autoPick`, `bestFormation`), `src/engine/ai.ts` (`planMatch`, `makePlan`, `xiStrength`, `pickWithRotation`)
- `src/engine/positions.ts` (solo si `posRating` lo requiere)
- `tests/perf/engine-bench.ts`, `tests/perf/engine-micro.ts` (mediciones)
- `tests/engine/` (sin tests nuevos obligatorios; los existentes deben pasar sin cambios)

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
- Unlocks: None
