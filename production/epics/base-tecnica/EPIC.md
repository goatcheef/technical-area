# Epic: Base técnica

> **Layer**: Foundation
> **GDD**: N/A — épico técnico. Requisitos de `.claude/docs/technical-preferences.md` (Performance Budgets) y del perfil `production/polish/full-report-2026-11-19.md`; reglas de juego afectadas en `design/gdd/base-de-datos.md`, `temporada-y-ligas.md`, `comunicacion-y-bandeja.md` y `game-concept.md` (ya sincronizados con las ADR).
> **Architecture Module**: carga de recursos (`src/ui/crests.ts`, `src/ui/pages.ts`, `src/engine/db.ts`), guardado (`src/save/`, `src/engine/migrate.ts`), errores (`src/errors.ts`), rendimiento del motor y de la interfaz
> **Status**: Ready
> **Stories**: Not yet created — run `/create-stories base-tecnica`
> **Tier**: standard (`workflow_overrides.system_overrides.base-tecnica`, pedido del usuario); el resto del proyecto en minimal

## Overview

Que el juego abra rápido en un celular de gama media, no pierda partidas y no muestre nunca una pantalla en blanco: escudos y datos fuera del paquete principal y páginas cargadas por pantalla (ADR-0001), guardado en segundo plano por momentos con tres copias, exportar e importar y tope del historial (ADR-0002), fronteras de error con pantalla de recuperación que nunca guarda un estado roto (ADR-0003), y las optimizaciones que el usuario aprobó en la fase 5 del perfil: planificación de la IA rival con resultados idénticos por semilla, redibujos por pantalla y la cancha 2D que deja de dibujar en pausa.

## Governing ADRs

| ADR | Decision Summary | Engine Risk |
|-----|------------------|-------------|
| ADR-0001: Carga de escudos y datos fuera del paquete principal | Escudos como WebP sueltos (`crestSrc`, `Badge` sin cambios de API), páginas con `lazyPage`, `loadDb()`/`getDb()`, fuentes propias | LOW |
| ADR-0002: Guardado en segundo plano, por momentos, con copias | `src/save/` es el único camino: `requestSave` por momento y cada 7 días, worker con respaldo en el hilo, 3 copias rotativas atómicas, `.tasave`, `Game.version` 7 con `migrateGame` y `foldHistory` | LOW |
| ADR-0003: Errores sin pantalla en blanco | Frontera raíz y por página, `guarded` en las acciones del motor, `blockSaves` tras un error, pantalla de recuperación, registro local `ta-errors` | LOW |

## GDD Requirements

| TR-ID | Requirement | ADR Coverage |
|-------|-------------|--------------|
| TR-base-tecnica-001 | Descarga inicial ≤ 1,5 MB comprimido antes de la primera pantalla (hoy 3,06 MB) | ADR-0001 ✅ |
| TR-base-tecnica-002 | Tiempo hasta poder jugar ≤ 3 s en Android de gama media con 4G (hoy 3,43 s partida nueva, 4,2 s continuar) | ADR-0001 ✅ |
| TR-base-tecnica-003 | Cada escudo se ve como imagen propia y, si falta o falla, el escudo de reemplazo con el código | ADR-0001 ✅ |
| TR-base-tecnica-004 | Guardado: ≤ 50 ms de hilo principal por guardado en escritorio; en celular (CPU 4×) ≤ 50 ms por día en promedio y ninguna tarea de guardado de más de 150 ms | ADR-0002 ✅ |
| TR-base-tecnica-005 | Una sola partida con 3 copias automáticas rotativas; un guardado que falla a mitad nunca rompe la última copia buena; las partidas viejas migran a la versión 7 | ADR-0002 ✅ |
| TR-base-tecnica-006 | Exportar e importar la partida (`.tasave`; también los `.json` viejos y el texto pegado) | ADR-0002 ✅ |
| TR-base-tecnica-007 | El historial de cada jugador guarda 3 temporadas en detalle más los totales; las temporadas en los clubes del DT, enteras | ADR-0002 ✅ |
| TR-base-tecnica-008 | Si algo falla, nunca pantalla en blanco: pantalla de recuperación con "Volver al inicio", "Exportar la partida" y "Recargar"; nunca se guarda un estado después de un error | ADR-0003 ✅ |
| TR-base-tecnica-009 | La planificación de partidos de la IA rival cuesta menos con resultados idénticos por semilla (`npm run sim -- 3` y `npm run test:engine` sin cambios) | N/A — optimización sin decisión de arquitectura (aprobada en la fase 5 del perfil) |
| TR-base-tecnica-010 | Cambiar de pantalla y avanzar redibuja solo lo que cambió (hoy 190 a 363 ms en CPU 4×) | N/A — optimización sin decisión de arquitectura (aprobada en la fase 5 del perfil) |
| TR-base-tecnica-011 | La cancha 2D no dibuja cuadros con el partido en pausa o terminado (hoy 9 a 40 % del hilo principal) | N/A — arreglo rápido del perfil (hotspot 4) |

## Definition of Done

- Every story implemented, reviewed and closed with `/story-done`
- Cada requisito de la tabla verificado con su medición (`tests/perf/`) o su prueba
- Logic and Integration stories have passing tests in the test root
- Visual/Feel and UI stories have retained screenshots in `production/qa/evidence/`
- `npm run build`, `npm run test:engine`, `tests/ui/*.cjs` y `npm run sim -- 3` (tres semillas) pasan
