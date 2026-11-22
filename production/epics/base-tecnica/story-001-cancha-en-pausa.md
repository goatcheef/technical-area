# Story 001: La cancha 2D no dibuja en pausa

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-011`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`: la cancha 2D no dibuja cuadros con el partido en pausa o terminado, hoy 9 a 40 % del hilo principal)*

**ADR Governing Implementation**: N/A — arreglo rápido del perfil (hotspot 4, `production/polish/full-report-2026-11-19.md`)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: N/A — sin ADR. Hotspot 4: el bucle de `requestAnimationFrame` de `Pitch2D.tsx:110-183` redibuja siempre; 9-11 % del hilo en desktop, 26-40 % con CPU 4×, también en pausa.

**Control Manifest Rules (this layer)**: N/A — `docs/architecture/control-manifest.md` does not exist; ningún ADR gobierna esta historia, así que el registro (`docs/registry/architecture.yaml`) no aporta reglas.

---

## Acceptance Criteria

*From the epic's requirement TR-base-tecnica-011 and hotspot 4 of the profile:*

- [ ] El bucle de `requestAnimationFrame` de `Pitch2D.tsx` no pide el cuadro siguiente con el partido en pausa, con el partido terminado ni con la pestaña oculta; solo lo pide mientras `S.play` esté en curso, `S.flash` esté activo o los jugadores no hayan llegado a su destino.
- [ ] El dibujo se reanuda al llegar un minuto nuevo (`tick`), al salir de la pausa, al terminar el festejo de gol, al cambiar el tamaño o la densidad del lienzo y al volver a mostrarse la pestaña.
- [ ] Con el partido en marcha el dibujo se ve igual que antes (misma captura a velocidad 1× antes y después); el "¡GOOOL!" y la pausa se ven bien.
- [ ] `cols = duoColors(home, away)` de `MatchView.tsx:84` queda estable (`useMemo` o comparación por contenido) y deja de reiniciar el efecto de dibujo cada minuto.
- [ ] Sin asignaciones por cuadro en el bucle: no se crean `marks`/`marked` sin marca personal y el `findIndex` por jugador pasa a un `Map` por `pid` armado en el efecto del minuto nuevo.
- [ ] Medición antes y después con `node tests/perf/match-frames.cjs http://localhost:4321/ desktop 20` y `cpu4 20` (build con `window.__eng`): participación del hilo principal en pausa, hoy 9 % (desktop) y 26-30 % (CPU 4×); el informe de la historia registra ambos números y el objetivo del perfil es ~0 %.
- [ ] `npm run build` y `npm run test:engine` pasan; pasan los `tests/ui/*.cjs` que abren el día de partido.

---

## Implementation Notes

*Hotspot 4 y su Approach del perfil (no hay ADR):*

- Pedir el siguiente cuadro solo mientras `S.play` esté en curso o `S.flash` activo o los jugadores no hayan llegado a su destino.
- Reanudar al llegar un minuto nuevo (`tick`), al terminar el festejo de gol y al cambiar el tamaño/densidad del lienzo.
- Sacar las asignaciones del bucle: reutilizar un arreglo/`Set` entre cuadros y un `Map` por `pid` en lugar de `findIndex`.
- Estabilizar `cols` con `useMemo` o compararlo por contenido en la dependencia del efecto.
- Riesgo bajo; sin cambio visible.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 010 (`story-010-redibujar-lo-que-cambia.md`): memoización de las pantallas pesadas y granularidad de `refresh()`.
- Story 009 (`story-009-ia-rival-liviana.md`): costo de `planMatch`/`squadOf` en el motor.

---

## Files

- `src/ui/Pitch2D.tsx`
- `src/ui/MatchView.tsx`
- `tests/perf/match-frames.cjs` (solo si hace falta medir el hilo en pausa)
- `production/qa/evidence/cancha-en-pausa-evidence.md` (capturas y números antes/después)

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Visual/Feel
**Required evidence**:
- Visual/Feel: a retained screenshot in `production/qa/evidence/` + sign-off in `production/qa/evidence/cancha-en-pausa-evidence.md` (captura en juego, en pausa y al terminar; números de `match-frames.cjs` antes y después)

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: None
