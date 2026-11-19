## Performance Profile: Full
Generated: 2026-11-19 · Rama `base-tecnica` (7e71dd0) · Primer perfil del proyecto: no hay informe previo con el que comparar, así que no hay regresiones que reportar (`production/polish/` estaba vacía).

Enforcement resuelto: `performance.enforce: warn`. Las violaciones son hallazgos, no bloquean. No se cambió ningún presupuesto ni ningún archivo de `src/`.

> Este informe lo pidió el usuario para la fase 3-4 de `/perf-profile full`. Todo número sale de una medición (scripts en `tests/perf/`, ver "Cómo repetir"). Lo que no se pudo medir está marcado `NOT ASSESSED` o `ESTIMADO`, con el motivo.

---

### 0. Entradas y condiciones de la medición

| Entrada | Estado |
|---|---|
| `project.yaml` → `performance.*` | FOUND: `target_framerate 60`, `frame_budget_ms 16.67`, `memory_ceiling_mb 250`; `draw_call_limit` sin definir |
| `.claude/docs/technical-preferences.md` → Performance Budgets | FOUND, todos marcados "propuesto" salvo el de un día de avance: descarga inicial 1,5 MB, tiempo hasta poder jugar 3 s (Android gama media, 4G), guardado de un día 50 ms, un día de avance 1 ms de mediana |
| Informe de perfil anterior | ABSENT (primer perfil) |
| Dispositivo Android real / GPU real | ABSENT: todo se midió en Chromium headless (Playwright 1.63), 4 núcleos, render por software |
| Salida a Google Fonts (`index.html` pide una hoja de estilos externa) | ABSENT en el sandbox: se abortó el pedido en cada corrida; su costo real en 4G no se midió |

**Perfiles de emulación** (CDP): *desktop* = sin limitación, 1440×900. *mobile4g* = red 9 Mbps de bajada / 1,5 Mbps de subida / 70 ms de latencia (el perfil "Fast 4G" de las DevTools) + CPU 4× más lenta + viewport 412×915. *cpu4* = solo CPU 4×, red local. La CPU 4× es un modelo de "Android de gama media", no un aparato real: tomar las cifras de celular como orden de magnitud.

**Servidor**: `vite preview` NO comprime (sirve los 5,3 MB crudos), así que las cargas con red emulada se midieron con `tests/perf/serve-compressed.mjs` (brotli 11, como lo haría un hosting real). Las cargas se miden sobre el build de producción (`npm run build`); el servidor de desarrollo no se usó para ninguna cifra de carga. Memoria, guardado, pantallas y partido se midieron sobre un build de producción idéntico con el motor expuesto en `window.__eng` (`tests/perf/vite.perf.config.mjs`, +3 KB) para poder simular temporadas dentro de la página.

---

### Performance Budgets

Convención de estado (mía, no un presupuesto comprometido): `OK` ≤ 80 % del tope · `WARNING` entre 80 % y 100 % · `OVER` por encima. Los números son medianas; entre paréntesis p95 cuando corresponde.

| Metric | Budget | Measured | Status |
|--------|--------|----------|--------|
| Frame time, día de partido con cancha 2D (60 fps) | 16,67 ms | desktop: p50 16,7 · p95 16,7-16,8 · máx 17 ms, 0 cuadros > 20 ms en 1200 por velocidad (pausa, 1×, 2×, 5×). CPU 4×: p50 16,7 · p95 16,7-16,8 · máx 33-50 ms, 1-2 cuadros > 33 ms y 2-6 > 20 ms de cada ~1200 (≤ 0,5 %), 1 tarea larga de 53 ms a 1×. Mide la cadencia del hilo principal (rAF); el raster de GPU real no se midió | OK (con la salvedad de arriba) |
| Un día de avance (motor) | 1 ms de mediana | Node: 1,57 ms (3 temporadas) / 1,83 ms (10) · p95 27-29 ms · máx 127-146 ms. Chromium desktop: 1,6-1,8 ms. CPU 4×: 7,5-7,7 ms. No reproduce el "1 ms medido" de `CLAUDE.md` | OVER (+57 % a +83 %) |
| Guardado de un día | ≤ 50 ms | Desktop, camino real `Continuar`, estado de arranque de temporada (2,2 / 3,0 / 4,1 MB): `stringify` + escritura a IndexedDB completa = 31 / 47 / 52 ms. Peor caso, fin de temporada (4,1 / 5,3 MB): 59 / 81 ms (p95 84 / 94). CPU 4×: 109-165 ms (arranque), 187-256 ms (fin de temporada). El tramo que bloquea el hilo (`stringify` + `put` síncrono) es 19-31 ms desktop / 97-143 ms con CPU 4× | OVER (desktop al límite a mitad de temporada y por encima a fin; celular 2-5×) |
| Descarga inicial (comprimida, antes de la primera pantalla) | ≤ 1,5 MB | 3,06 MB brotli (JS 3,04 MB + CSS 0,02 MB); 3,16 MB con gzip; 5,44 MB crudos. Un solo chunk: escudos 2,70 MB brotli (88 %), `db.json` 0,13 MB, código + React 0,21 MB | OVER (2,0×) |
| Tiempo hasta poder jugar (Android gama media, 4G) | ≤ 3 s | mobile4g, 10 corridas en frío: FCP 3,49 s (p95 3,54); pantalla de inicio interactiva 3,43 s (p95 3,49). Con partida guardada: botón "Continuar partida" 3,66 s (p95 3,78) y hasta ver el Inicio 4,2 s (+0,54 s; p95 4,4) con 4,1 MB guardados, 4,3 s con 5,3 MB. Excluye el CSS de Google Fonts (no medido) | OVER (+14 % partida nueva, +40-43 % continuando) |
| Memoria con la partida cargada | 250 MB | Heap de JS tras GC: 9,1 MB (partida nueva) / 15-18 MB (tras 1 y 3 temporadas simuladas en la página) / 10-15 MB al cargar un guardado en un navegador limpio. RSS del proceso renderer (about:blank = 78 MB): 169-209 MB con un guardado cargado y recorridas 6 pantallas; 248 MB (desktop) tras simular 3 temporadas en la misma sesión. El tope no dice si es heap o proceso: el heap es 7 %, el proceso 84-99 % | WARNING (según proceso) / OK (según heap): pedir al technical-director que fije la definición |
| Draw calls | sin definir | no aplica: DOM + SVG + un `<canvas>` 2D; no hay presupuesto comprometido | NOT ASSESSED |
| Cambio de pantalla (Inicio → otra) | sin presupuesto propio | desktop 1440×900: de 23 a 77 ms (Plantel 33-60, Vestuario 50-63, Mercado/Buscar 59-71, Estadísticas 72-77). CPU 4× viewport celular: Plantel 108-148, Vestuario 198-269, Mercado/Buscar 174-214, Bandeja 190-195, Estadísticas 363-370 ms. Son tareas puntuales, no cuadros; el presupuesto de 16,67 ms es por cuadro | NOT ASSESSED (sin presupuesto; los valores están abajo) |
| Cuadro de "Ir al partido" por día de avance | sin presupuesto propio | desktop: 0-4 ms/día de trabajo propio, sin tareas largas, cuadros p95 17 ms. CPU 4×: 26-36 ms/día, 1 tarea larga de 88-133 ms por tramo | NOT ASSESSED (el 1 ms/día del motor es la fila de arriba) |

---

### Resultados medidos (detalle)

#### 1. Descarga (build de producción, `dist/assets`)

| Archivo | Crudo | gzip -9 | brotli -11 |
|---|---:|---:|---:|
| `index-*.js` (único chunk) | 5.320.017 | 3.133.085 | 3.037.937 |
| `index-*.css` | 118.729 | 22.714 | 19.911 |
| **Total** | **5.438.746** | **3.155.799** | **3.057.848** |

Qué hay adentro del JS (se armó el bundle con cada dato reemplazado por un stub, `tests/perf/vite.stub.config.mjs`):

| Parte | Crudo | Brotli (por diferencia de bundles) |
|---|---:|---:|
| `src/data/crests.json` (102 escudos PNG 250×250 en base64 dentro del JS) | 3,66 MB | 2,70 MB (88 %) |
| `src/data/db.json` (109 clubes, 3.208 jugadores) | 0,86 MB | 0,13 MB |
| Código de la app + React 19 | 0,81 MB | 0,205 MB |

Los PNG en base64 ya vienen comprimidos: brotli recupera solo el 26 % del base64 (3,66 → 2,70 MB). Cuánto bajaría sacando los escudos del bundle, medido (build sin escudos, mismo perfil mobile4g, 8 corridas): pantalla de inicio interactiva **0,85 s** (p95 0,87), FCP 0,92 s, JS 335 KB. Esa es la cota inferior medida; falta sumarle que la pantalla de inicio muestra unos 28 escudos que hay que traer aparte. Medición de la recompresión (script ad hoc con Pillow, no versionado): los 102 escudos a 168 px en WebP calidad 80 pesan 0,71 MB en binario (hoy 2,74 MB binarios); sin pérdida 1,41 MB. Se muestran a 18-84 px.

La nota de `technical-preferences.md` ya dice "los escudos y los datos se cargan aparte": hoy no se cumple (están en el chunk principal). Hay que avisárselo al dueño de ese documento.

#### 2. Tiempo hasta poder jugar (carga en frío, contexto nuevo en cada corrida)

Servidor con brotli. `ready` = aparece `#mgr-name` (pantalla de inicio usable) o, con partida guardada, el botón "Continuar partida". "Continuar → Inicio" = clic hasta que se dibuja `.shell` y pasan dos cuadros.

| Escenario | n | FCP (med · p95) | Pantalla de inicio lista (med · p95) | Descarga del JS lista | Tarea larga (med) | Continuar → Inicio (med · p95) |
|---|---:|---|---|---:|---:|---|
| desktop, partida nueva | 10 | 248 · 276 ms | 221 · 250 ms | 75 ms | 85 ms | n/a |
| desktop, guardado 4,1 MB | 10 | 240 · 264 ms | 281 · 303 ms | 75 ms | 87 ms | 128 · 148 ms |
| solo CPU 4×, partida nueva | 10 | 668 · 700 ms | 607 · 643 ms | 107 ms | 412 ms | n/a |
| **mobile4g, partida nueva** | 10 | **3.488 · 3.544 ms** | **3.430 · 3.488 ms** | 2.914 ms | 393 ms | n/a |
| **mobile4g, guardado 4,1 MB** | 10 | 3.500 · 3.612 ms | 3.662 · 3.784 ms | 2.915 ms | 590 ms | 541 · 628 ms |
| mobile4g, guardado 5,3 MB | 7 | 3.488 · 3.552 ms | 3.696 · 3.776 ms | n/d | n/d | 619 · 681 ms |
| mobile4g, SIN escudos (cota inferior) | 8 | 916 · 936 ms | 851 · 870 ms | 510 ms | 260 ms | n/a |

Lectura: en celular el cuello es la descarga (el JS termina de bajar a los 2,9 s: 3,04 MB a 9 Mbps) y después hay ~0,5 s de análisis + ejecución + primer render con una tarea larga de ~0,4 s. Con la partida guardada se suma leer y parsear el JSON (221-269 ms) y construir el Inicio (0,54-0,62 s). Con gzip en vez de brotli, esperar unos +80 ms.

#### 3. Memoria

Heap de JS (`Runtime.getHeapUsage` tras dos GC), nodos DOM (`Memory.getDOMCounters`) y RSS del renderer. Sesión desktop; en la última columna el RSS de un navegador nuevo que carga un guardado (sin la basura de haber simulado en la página).

| Momento | Heap JS | Nodos DOM (Inicio) | RSS renderer | RSS con guardado cargado + 6 pantallas |
|---|---:|---:|---:|---:|
| about:blank | n/d | n/d | 78 MB | n/d |
| Pantalla de inicio | 7,9 MB | 258 | 134 MB | n/d |
| Partida nueva (Inicio) | 9,1 MB | 1.135 | 183 MB | 186 MB (2,2 MB guardados) |
| Tras 1 temporada | 15,5 MB | 2.573 | 229 MB | 208 MB (4,1 MB) |
| Tras 3 temporadas | 18,2 MB | 2.627 | 248 MB | 209 MB (5,3 MB) |

En la corrida con viewport de celular el heap fue 9,0 / 14,9 / 16,9 MB. El heap crece poco; el proceso crece más porque la simulación dentro de la página deja basura que el sistema operativo no recupera enseguida (los 248 MB son de una sesión larga con simulación, los 209 MB de un guardado recién cargado).

Nodos DOM de las pantallas pesadas (desktop 1440×900, partida nueva → tras 3 temporadas; celular entre paréntesis, tras 3 temporadas):

| Pantalla | Nodos | Notas |
|---|---:|---|
| Plantel | 2.015 → 1.497 (617) | `PlayerTable`, sin virtualizar |
| Mercado › Buscar | 1.641 → 1.640 (817) | 400 resultados filtrados, tabla hasta 200 filas |
| Vestuario | 1.554 → 1.452 (846) | |
| Centro de datos › Jugadores | 202 → 1.289 (1.289) | crece con la historia |
| Estadísticas | 315 → 4.245 (2.398) | 8 rankings + tabla de 100 filas |
| Bandeja | 269 → 2.271 (2.661) | muestra todos los mensajes (hasta 400) |
| Ficha de club | 1.591 → 1.649 (652) | |
| Día de partido | 754 | |

#### 4. Guardado y carga (`src/store.ts`)

`saveGame` hace `JSON.stringify(g)` del estado completo y lo escribe en IndexedDB como un solo string, y se llama desde `persist` en cada `Continuar` (un día) y al terminar "Ir al partido" o un partido (`App.tsx:114, 163, 184`). No hay guardado incremental. `open()` abre una conexión nueva en cada guardado y no la cierra (`store.ts:40-62`).

Tamaño del `Game` serializado y costo en Node (mediana de 5), 3 temporadas simuladas con la semilla 12345 (la extrapolación a 10 temporadas es otra corrida):

| Momento | JSON | `stringify` | `parse` | Notas |
|---|---:|---:|---:|---|
| Partida nueva | 2,16 MB | 10-12 ms | 10 ms | players 1,89 MB |
| Fin temporada 1 | 4,13 MB | 22-26 ms | 23-30 ms | fixtures 1,85 MB, players 2,05 MB |
| Fin temporada 3 | 5,29 MB | 29-32 ms | 25 ms | players 3,29 MB |
| Fin temporada 5 | 6,19 MB | 40 ms | 34 ms | |
| Fin temporada 10 | 7,25 MB | **52 ms** | 44 ms | solo `stringify` ya supera los 50 ms |

Por el camino real de la app (Chromium, instrumentando `JSON.stringify`/`JSON.parse` e IndexedDB; 12 días por escenario):

| | Estado (arranque de temporada) | `stringify` (bloquea) | `put` síncrono | Escritura completa | Clic "Continuar" → 2 cuadros (med · p95) |
|---|---|---:|---:|---:|---|
| desktop | 2,2 MB | 15,4 ms | 3,5 ms | 15,6 ms | 29 · 56 ms |
| desktop | 3,0 MB | 24,1 ms | 4,9 ms | 23,2 ms | 44 · 66 ms |
| desktop | 4,1 MB | 24,3 ms | 6,5 ms | 28,1 ms | 45 · 61 ms |
| CPU 4× | 2,2 MB | 79,5 ms | 17,0 ms | 29,9 ms | 151 · 250 ms |
| CPU 4× | 3,0 MB | 95,2 ms | 23,7 ms | 40,6 ms | 172 · 284 ms |
| CPU 4× | 4,1 MB | 111,3 ms | 31,6 ms | 54,1 ms | 195 · 280 ms |

Peor caso (fin de temporada, `saveGame` repetido sobre la partida tal como queda): desktop 4,1 MB = 25 ms `stringify` + 34 ms IndexedDB = 59 ms; 5,3 MB = 37 + 43 = 81 ms. CPU 4×: 187 y 256 ms. Carga: lectura de IndexedDB 7-23 ms + `JSON.parse` 20 / 20 / 29 ms (desktop, 2,2 / 4,1 / 5,3 MB), 67 / 80 / 136 ms con CPU 4×.

Crecimiento sin tope (10 temporadas, semilla 12345): `news` queda en 400 (tope), `deals` en 60, `transfers` en 300 y `fixtures` se reemplaza cada temporada: todo eso está acotado. Lo que crece es `players[].history` (`game.ts:805`, una entrada de estadísticas por jugador por temporada, para los 3.200-3.500 jugadores) y la cantidad de jugadores (3.208 → 3.540): el JSON pasa de 4,13 MB (fin de la temporada 1) a 7,25 MB (fin de la 10), con pendiente que baja de ~0,5 MB/temporada a ~0,1 MB/temporada. El heap de Node tras GC: 25 → 49 MB.

#### 5. Tiempos de cuadro y avance

Día de partido (build de producción, Independiente, fecha con 14 partidos más). Ventanas de 20 s a cada velocidad, 5 s en pausa; cuadros medidos con un bucle de `requestAnimationFrame` en la página.

| Situación | desktop | CPU 4× (viewport celular, dpr 2) |
|---|---|---|
| Abrir el día de partido (propio + 14 `createMatch`) | 99 ms | 356 ms |
| Pausa, antes del primer minuto | 60 fps · p95 16,8 · CPU del hilo 9 % | 60 fps · p95 16,7 · CPU del hilo 26 % |
| Normal (1×) | 60 fps · p95 16,7 · máx 17 ms · 0 tareas largas · CPU 9 % (script 1 %) | 59,8 fps · máx 50 ms · 1 tarea larga de 53 ms · CPU 31 % |
| Rápido (2×) | 60 fps · máx 17 ms · CPU 10 % | 59,9 fps · máx 33 ms · CPU 33 % |
| Muy rápido (5×) | 60 fps · máx 17 ms · CPU 11 % (script 2 %) | 59,7 fps · máx 33 ms · 6 cuadros > 20 ms · CPU 40 % (script 8 %) |
| Pausa a mitad de partido | 60 fps · CPU del hilo **9 %** | 60 fps · CPU del hilo **30 %** |
| "Ir al final" (resto del partido y los otros 14) | n/d (el partido ya había terminado a 5×) | 65 ms |
| "Continuar" tras el partido (`finishUserMatch` + guardado + flujo posterior) | 120 ms | 561 ms |

Importante: la cancha consume 9 % del hilo principal en desktop (26-30 % con CPU 4×) **aun en pausa**: el bucle de `requestAnimationFrame` de `Pitch2D.tsx` no se detiene cuando no hay nada que animar (ver hotspot 5).

Avance:

| | desktop | CPU 4× |
|---|---|---|
| "Continuar" (un día), clic → 2 cuadros | 41 ms (p95 45) | 155 ms (p95 166) |
| "Ir al partido": trabajo por día (sin la pausa fija de 45 ms entre días), 3 tramos de 6-8 días | 0-4 ms/día, sin tareas largas | 26-36 ms/día, 1 tarea larga de 88-133 ms por tramo |
| Búsqueda global, tecla → 2 cuadros (escribir "martinez") | 14 ms (p95 24) | 31 ms (p95 44) |

Costo del motor por función (Node, `performance.now`; 144 partidos del DT en 3 temporadas; 725 días sin partido del DT):

| Función | Mediana | p95 | Máx |
|---|---:|---:|---:|
| `advanceDay` (día sin partido del DT) | 1,57 ms | 27,4 ms | 127 ms |
| `finishUserMatch` (cierra la fecha y simula los otros partidos) | **122,6 ms** | 172 ms | 197 ms |
| `createMatch` del DT | 0,97 ms | 2,9 ms | 4,5 ms |
| `MatchSim.runToEnd` del DT | 1,15 ms (0,013 ms por minuto) | 1,8 ms | 10 ms |
| `startNewSeason` | ~490 ms | | |
| `newGame` | ~510 ms | | |

Con 10 temporadas: `advanceDay` 1,83 ms (p95 28,7), `finishUserMatch` 138 ms (p95 192, máx 259). El simulador del partido en sí es barato; lo caro es lo que lo rodea.

Perfil de CPU de una temporada en Node (`--cpu-prof`, 8,2 s en total):

| Función | Tiempo propio | Inclusivo |
|---|---:|---:|
| `simFixture` (`game.ts:531`) | | 73 % |
| `planMatch` → `makePlan` (`ai.ts:162`, `80`) | | 46,6 % |
| `autoPick` (`game.ts:64`) | 24,5 % | 32,6 % |
| `pickWithRotation` (`ai.ts:63`) | 8,6 % | 25 % |
| `xiStrength` (`ai.ts:29`) | 6,9 % | 18,8 % |
| `familiarity` (`positions.ts:54`) | 5,0 % | 5,0 % |
| `MatchSim.step` y derivados (`match.ts`) | ~4,3 % | 21,6 % |

Micro-medidas sobre un guardado (Node, µs): `squadOf` 35,5 (recorre los 3.200 jugadores en cada llamada; hay 51 llamadas en el código), `autoPick` 338, nueve `autoPick` (lo que hace `bestFormation`) 3.051, `pendingAll` 47, `inboxCount` 105, `decisionKeys` 57, `userFixtureToday` 20, `nextUserFixture` 12. Lo que `App` ejecuta en cada render del estado (`pendingAll` + `inboxCount` + `nextUserFixture` + `userFixtureToday`): **166 µs**, o sea 1 % de un cuadro.

#### 6. Cambio de pantalla (mediana de 5 repeticiones desktop / 3 en CPU 4×; "trabajo" = script + layout + estilo del CDP)

| Pantalla | desktop nueva | desktop tras 3 temporadas | CPU 4× tras 3 temporadas (celular) |
|---|---:|---:|---:|
| Plantel | 60 ms | 33 ms | 108 ms |
| Táctica | 25 ms | 23 ms | 69 ms |
| Vestuario | 50 ms | 50 ms | 198 ms |
| Mercado › Buscar | 64 ms | 59 ms | 174 ms |
| Mercado › Tratos | 23 ms | 26 ms | 41 ms |
| Bandeja | 22 ms | 32 ms | 190 ms |
| Centro de datos (4 pestañas) | 24-25 ms | 24-26 ms | 57-88 ms |
| Estadísticas | 22 ms | 72 ms | 363 ms |
| Ficha de club | 33 ms | 31 ms | 120 ms |
| Ficha de jugador | 26 ms | 25 ms | 45 ms |
| Tablas, Fixture, Calendario, Cuerpo técnico, Club | 22-26 ms | 24-26 ms | 30-53 ms |

El piso de ~22-25 ms es el costo de esperar dos cuadros en el navegador sin carga de la prueba, no de la app. El trabajo propio de la app en las pantallas más pesadas fue de 46 ms (Plantel nuevo, desktop), 41-46 ms (Vestuario), 55 ms (Mercado › Buscar), 66 ms (Estadísticas tras 3 temporadas).

---

### Hotspots Identified

Ordenados por impacto medido. Esfuerzo: S < 1 día, M 1-3 días, L > 3 días.

| # | Location | Issue | Measured impact | Fix Effort |
|---|----------|-------|------------------|------------|
| 1 | `src/ui/common.tsx:2,12,107-108` (import de `src/data/crests.json`); `tools/fetch_crests.py` | 102 escudos PNG de 250×250 en base64 dentro del chunk principal; la descarga inicial es 2,0× el presupuesto y se bajan todos antes de mostrar la primera pantalla | 2,70 MB brotli de 3,06 MB (88 %). Sin ellos, la pantalla de inicio lista pasa de 3,43 s a 0,85 s en el mismo perfil | M |
| 2 | `src/store.ts:56-62` (`saveGame`), `src/ui/App.tsx:114,163,184` (`persist` en cada `Continuar`) | El estado completo se serializa en el hilo principal cada día y crece con la partida | 15-37 ms de `stringify` bloqueando en desktop (79-175 ms con CPU 4×); guardado total 31-81 ms desktop, 109-256 ms CPU 4× contra 50 ms de presupuesto; 52 ms solo de `stringify` a las 10 temporadas | M |
| 3 | `src/engine/ai.ts:29,63,80,162`; `src/engine/game.ts:62,64-85,90` (`squadOf`, `autoPick`, `bestFormation`) | El plan de partido de la IA recalcula once y fuerza para cada formación y cada club en cada fecha; `squadOf` recorre los 3.200 jugadores en cada llamada | `planMatch` es el 46,6 % de la CPU del motor en una temporada; una fecha cuesta 99-120 ms desktop (356-561 ms con CPU 4×) al abrir el día de partido o cerrarlo; `startNewSeason` ~490 ms | M |
| 4 | `src/ui/Pitch2D.tsx:110-183` (bucle `draw`) | El bucle de `requestAnimationFrame` redibuja toda la cancha en cada cuadro aunque el partido esté en pausa o terminado, con asignaciones por cuadro (`.map/.filter/new Set/.find/.findIndex` en `150-151`, `findIndex` por jugador) | 9-11 % del hilo principal en desktop y 26-40 % con CPU 4×, también en pausa (batería en celular) | S |
| 5 | `src/ui/App.tsx:109` (`refresh` = `useReducer` en la raíz) y todo `src/ui/*.tsx` (solo 2 `useMemo`, ningún `memo`) | Cada `refresh()` vuelve a renderizar toda la pantalla activa; Estadísticas, Bandeja, Vestuario y Mercado no cachean sus cálculos ni limitan nodos (`Tables.tsx:122-152`: 8 ordenamientos de todos los jugadores de la categoría + 100 filas; `Inbox.tsx:135`: renderiza todos los mensajes) | Cambio de pantalla con CPU 4×: Estadísticas 363-370 ms, Vestuario 198-269, Bandeja 190-195, Mercado › Buscar 174-214; 4.245 nodos en Estadísticas y 2.271-2.323 en Bandeja (desktop) | M |
| 6 | `src/engine/game.ts:805` (`p.history.push` por jugador y temporada) | Historial por jugador sin tope: es lo que hace crecer el estado guardado | JSON de 4,13 MB (fin de la temporada 1) a 7,25 MB (fin de la 10); pesa en los hotspots 2 y en el tiempo de carga con guardado | S |
| 7 | `index.html:7` | Hoja de estilos de Google Fonts como recurso que bloquea el render, desde un dominio externo | **No medido** (sin salida a esa red en el sandbox). Cuesta como mínimo una resolución DNS, un TLS y un pedido sobre una red de 70 ms de latencia antes del primer dibujo | S |
| 8 | `src/ui/MatchView.tsx:84` | `cols = duoColors(home, away)` devuelve un arreglo nuevo en cada render (cada minuto de juego), y es dependencia del `useEffect` de `Pitch2D.tsx:110-183`, que cancela y vuelve a pedir el `requestAnimationFrame` | no medido por separado; no se vio perder cuadros | S |
| 9 | `src/store.ts:40-62,74,83` | Cada guardado, carga y borrado abre una conexión nueva a IndexedDB sin `close()` | no medido (no se vio una consecuencia en 12 guardados seguidos) | S |

Revisado y descartado como hotspot (medido): el buscador global por tecla (14 ms desktop / 31 ms CPU 4×), lo que `App` calcula en cada render (166 µs), `advanceDay` del motor sin partidos del DT (mediana 1,6 ms), la simulación de un partido (1,2 ms), la memoria (heap 18 MB).

---

### Optimization Recommendations (Priority Order)

1. **Sacar los escudos del bundle y servirlos como archivos** — pasar `crests.json` a archivos de imagen estáticos (WebP, ~168 px) y cargarlos por URL.
   - Location: `src/ui/common.tsx:2,12,107-108`; `tools/fetch_crests.py` (generación); `vite.config.ts` (nada que cambiar: Vite sirve `public/` o `assets` importados).
   - Expected gain: descarga inicial 3,06 MB → ~0,35 MB brotli (JS 335 KB + CSS), y los ~28 escudos de la pantalla de inicio ≈ 0,2 MB más si se piden aparte (estimado a partir del 0,71 MB total). Tiempo hasta poder jugar en el perfil 4G: de 3,43 s a ~0,85-1,2 s (0,85 s medido sin escudos). Se cumplen la descarga (≤ 1,5 MB) y el tiempo (≤ 3 s).
   - Risk: Bajo-Medio. Los escudos pasan a depender de pedidos de red (con `img` normal: cacheo del navegador; hay que decidir si la partida debe poder jugarse sin conexión, ver "Requires Investigation"). `Badge` ya tiene un reemplazo para el club sin escudo (`common.tsx:109-113`), que sirve de estado de carga. El PNG con transparencia hay que verificarlo después de la conversión (la prueba de contraste de `tools/check-contrast.mjs` no los usa).
   - Approach: convertir y redimensionar (el tamaño mayor mostrado es 84 px; 168 px cubre densidad doble) fuera de la app; emitir `public/crests/<id>.webp`; `Badge` usa `src={`crests/${id}.webp`}` con `loading="lazy"` salvo en la pantalla de inicio; `db.json` (0,13 MB brotli) puede quedar en el bundle o pasar a `fetch` después. Ver si conviene precalentar los escudos de la categoría elegida.

2. **Guardar menos y fuera del hilo principal** — dejar de serializar los 4-7 MB completos en cada día.
   - Location: `src/store.ts:56-62`; `src/ui/App.tsx:114,163,184` (puntos de guardado).
   - Expected gain: quita 15-37 ms (desktop) y 80-175 ms (CPU 4×) de bloqueo del hilo en cada `Continuar`; el clic pasa de 155-195 ms a ~60-80 ms con CPU 4× (el resto es el re-render). Lleva el guardado dentro de los 50 ms.
   - Risk: Medio. Cambia el modelo de persistencia (consistencia ante cierre de pestaña; `Game.version` 6 y `tests/ui/guardado.cjs`).
   - Approach (el equipo elige; trade-offs en el orden): (a) guardar solo en momentos clave (fin de "Ir al partido", fin de partido, decisiones) y con retraso (`requestIdleCallback`) en el `Continuar` de un día — es lo más barato y reduce las escrituras ~8 veces, a costa de perder hasta un día si se cierra justo; (b) mover `stringify` + escritura a un Worker: copiar `g` (4-7 MB) al worker cuesta (`structuredClone` de objetos grandes) casi lo mismo que serializar — `CLAUDE.md` ya descartó el worker para el avance por esto y acá aplica igual; (c) guardado incremental por claves (jugadores, fixtures, resto) escribiendo solo lo que cambió — más trabajo (L) y más riesgo. Recomiendo (a) primero, junto con la 6. Además cerrar la conexión de IndexedDB tras cada operación o reutilizar una (hotspot 9).

3. **Acelerar el plan de partido de la IA** — evitar recalcular lo mismo y no recorrer todos los jugadores cada vez.
   - Location: `src/engine/game.ts:62` (`squadOf`), `:64-85` (`autoPick`), `:90` (`bestFormation`); `src/engine/ai.ts:29,63,80`.
   - Expected gain: `planMatch` es el 46,6 % del tiempo del motor; reducir a la mitad el `autoPick` (24,5 % propio) baja la fecha de ~120 a ~80 ms desktop y de ~360-560 a ~240-370 ms con CPU 4×, y `startNewSeason` de ~490 ms hacia ~300 ms (estimado a partir del perfil; hay que medir después).
   - Risk: Medio. Cualquier cambio en el orden de las tiradas o en el desempate cambia resultados y la calibración (`npm run sim -- 3 <semilla>` con tres semillas, y `tests/engine`): el criterio de aceptación es que el simulador dé exactamente los mismos resultados con la misma semilla.
   - Approach: (a) índice de jugadores por club (o una `Map<clubId, Player[]>` armada una vez por día/temporada) en lugar de filtrar `Object.values(g.players)` en `squadOf` — mismo resultado, es lo más seguro; (b) en `autoPick`, precalcular `posRating` por jugador y puesto una vez por llamada en vez de recalcularlo en cada una de las 11 vueltas del bucle `for (const i of open) for (const p of pool)`; (c) en `bestFormation`/`makePlan`, reutilizar la selección de once entre formaciones cercanas. Hacer (a) y (b) primero y volver a medir con `tests/perf/engine-bench.ts` y `cpuprof.mjs`.

4. **Que la cancha 2D deje de redibujar cuando no pasa nada.**
   - Location: `src/ui/Pitch2D.tsx:110-183`; `src/ui/MatchView.tsx:84`.
   - Expected gain: de 9 % a ~0 % del hilo principal en pausa y al final del partido en desktop, de 26-30 % a ~0 % con CPU 4×; menos consumo de batería en celular. Sin cambio visible. Con el partido en marcha el bucle sigue.
   - Risk: Bajo. Hay que reanudar el dibujo al llegar un minuto nuevo (`tick`), al terminar el festejo de gol y al cambiar el tamaño/densidad del lienzo.
   - Approach: pedir el siguiente cuadro solo mientras `S.play` esté en curso o `S.flash` activo o los jugadores no hayan llegado a su destino; sacar las asignaciones del bucle (reutilizar un arreglo/`Set` entre cuadros, `Map` por `pid` en lugar de `findIndex`); estabilizar `cols` con `useMemo` o compararlo por contenido en la dependencia del efecto.

5. **Dejar de renderizar de más en las pantallas pesadas.**
   - Location: `src/ui/Tables.tsx:122-152` (Estadísticas), `src/ui/Inbox.tsx:135` y el listado de mensajes, `src/ui/Locker.tsx:71`, `src/ui/Market.tsx:117` (ya tiene `useMemo`), `src/ui/PlayerTable.tsx:143` (`limit` 200 sin virtualizar), `src/ui/App.tsx:109`.
   - Expected gain: con CPU 4× bajar Estadísticas de 363 a <150 ms, Bandeja de 190 a <100 ms (ambos por memorizar los rankings y limitar los mensajes visibles a las últimas semanas con "mostrar más"), y recortar nodos DOM (4.245 → <1.500 en Estadísticas).
   - Risk: Medio. Los componentes dependen de que `g` se mute en el lugar y se llame a `refresh()`: un `useMemo` con `g` como dependencia no se invalida solo; hay que usar claves como `g.date`, `g.news.length`, `g.transfers.length` (como ya hace Mercado).
   - Approach: empezar por Estadísticas (los 8 rankings salen de un solo recorrido + un `useMemo` por categoría y fecha) y por la Bandeja (limitar y paginar); después `React.memo` en filas de `PlayerTable`. No hace falta tocar `refresh()` global si cada pantalla cachea lo suyo.

6. **Poner un tope a `players[].history`.**
   - Location: `src/engine/game.ts:805`; `src/engine/types.ts:67`.
   - Expected gain: el JSON deja de crecer ~0,1-0,5 MB por temporada (7,25 MB a las 10): menos `stringify`, `parse` y espacio en IndexedDB.
   - Risk: Medio. Hay que decidir qué se conserva (p. ej. toda la historia del plantel del DT y la de los jugadores que vea; resumida para el resto) y revisar qué pantallas leen `history` (ficha de jugador, estadísticas). Si cambia el formato, subir `Game.version` o tolerar los dos.
   - Approach: guardar un resumen (PJ, goles, asistencias, puntaje medio) para los que no son del club del DT ni están en su lista de seguimiento, y la historia completa para los otros; o limitar a las últimas N temporadas más los totales de carrera.

---

### Quick Wins (< 1 hora cada uno)

- Cerrar la conexión de IndexedDB después de cada guardado, carga y borrado (`db.close()` en `src/store.ts:56-62,74,83`) o reutilizar una conexión.
- Estabilizar `cols` de `MatchView.tsx:84` (`useMemo` por club local y visitante) para que el efecto del bucle de dibujo de la cancha no se reinicie cada minuto.
- En el bucle de `Pitch2D.tsx:150-151`, no crear `marks`/`marked` cuando ningún lado tiene marca personal (casi siempre) y reemplazar el `findIndex` por jugador por un `Map` que se arma en el efecto del minuto nuevo.
- Agregar `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` a `index.html` (y `fonts.googleapis.com`) como primera mitigación mientras se decide si se alojan las fuentes en el propio sitio.
- Fijar en `technical-preferences.md` qué mide el tope de 250 MB (heap de JS o proceso) y cuál es el "1 ms de mediana" de un día de avance (¿medido con qué partida y máquina?): hoy no se reproduce.

### Requires Investigation

- **Dispositivo real.** Todo el celular es emulación (CPU 4×, red CDP) en Chromium headless con raster por software. Falta una medición en un Android de gama media real, especialmente: cuadros de la cancha 2D con GPU (la cadencia de `requestAnimationFrame` medida no incluye el raster), y consumo de batería con la cancha en pausa.
- **Google Fonts.** El costo real en 4G de la hoja de estilos externa de `index.html` (y de la caída de Barlow Condensed / Plus Jakarta Sans si no carga) no se midió. Se puede medir con el pedido real fuera del sandbox o decidir alojar las fuentes y evitar la pregunta.
- **Juego sin conexión.** Con escudos como archivos, ¿tiene que poder jugarse sin red después de la primera visita? Si sí, hace falta un service worker o `Cache-Control` agresivo; hoy el juego es un solo archivo y funciona sin red una vez cargado.
- **Qué parte del RSS es de la app.** El RSS del renderer de 169-248 MB incluye 78 MB de un navegador vacío; no se separó qué parte son las imágenes decodificadas de los escudos (250×250×4 = 250 KB cada una al decodificar) frente a DOM y heap. Si los escudos pasan a 168 px, la parte decodificada baja ~55 %: volver a medir.
- **`startNewSeason` (~490 ms en Node) y `newGame` (~510 ms)** no se midieron en el navegador por separado: con CPU 4× podrían estar en 1-2 s sin que haya un indicador de progreso. Hay un solo clic ("Nueva temporada" / "Firmar contrato": en el navegador, 525-537 ms desktop de punta a punta para la partida nueva).
- **`g.know`, `g.scouting` y `g.honours`** crecen con las temporadas pero son chicos (`know` 7 KB a las 3 temporadas, `honours` 60 entradas a las 10): no pesan hoy.
- **Tamaño del guardado con más de 10 temporadas** (extrapolación): la pendiente de 0,1 MB/temporada hace pensar que llega a ~8 MB en 20, pero no se corrió.
- **Por qué `advanceDay` tiene p95 de 27 ms** (días con partidos de otras copas, `simFixture` de los otros clubes) y máximo de 127-146 ms: cae en el hotspot 3, pero no se separó por tipo de día.

---

### Cómo repetir

Todo desde la raíz del repo. Los scripts de navegador usan Playwright de `/opt/node-tools` (como `tests/ui/helpers.cjs`) y no necesitan el servidor de desarrollo.

```bash
# 0. Build de producción y servidor que comprime (vite preview no comprime)
npm run build
node tests/perf/serve-compressed.mjs dist 4320 br &              # red/CPU emuladas: usar este
npx vite preview --port 4319 --strictPort &                      # alternativa sin compresión

# 1. Descarga: tamaño por archivo y qué pesa cada dato
node tests/perf/sizes.mjs dist
STUB=crests OUT=/tmp/dist-crests npx vite build --config tests/perf/vite.stub.config.mjs   # sin escudos (también STUB=db, STUB=crests,db)
node tests/perf/sizes.mjs /tmp/dist-crests

# 2. Tiempo hasta poder jugar (n corridas en frío; perfiles desktop | cpu4 | mobile4g; el 4.º argumento es una partida guardada)
node tests/perf/load-time.cjs http://localhost:4320/ mobile4g 10
node tests/perf/load-time.cjs http://localhost:4320/ mobile4g 10 /tmp/saves/g-s1.json

# 3-6. Motor sin interfaz (3 temporadas, semilla 12345); --save deja g-s0/g-s1/g-s3.json para los guardados
node --expose-gc --import tsx tests/perf/engine-bench.ts 3 12345 --save /tmp/saves
npx tsx tests/perf/engine-micro.ts /tmp/saves/g-s1.json
node --cpu-prof --cpu-prof-dir=/tmp/prof --import tsx tests/perf/engine-bench.ts 1 12345 && node tests/perf/cpuprof.mjs /tmp/prof/*.cpuprofile 22 32

# Las pruebas de navegador siguientes necesitan el build con el motor expuesto (window.__eng):
OUT=/tmp/dist-perf npx vite build --config tests/perf/vite.perf.config.mjs
node tests/perf/serve-compressed.mjs /tmp/dist-perf 4321 br &
node tests/perf/memory-screens.cjs http://localhost:4321/ desktop 5     # heap, nodos, RSS y cambio de pantalla: partida nueva, 1 y 3 temporadas (también cpu4)
node tests/perf/memory-loaded.cjs http://localhost:4321/ /tmp/saves/g-s1.json /tmp/saves/g-s3.json
node tests/perf/save-bench.cjs http://localhost:4321/ desktop /tmp/saves/g-s3.json 12     # guardado y carga por el camino real
node tests/perf/save-direct.cjs http://localhost:4321/ cpu4 /tmp/saves/g-s3.json 12       # guardado peor caso (fin de temporada)
node tests/perf/match-frames.cjs http://localhost:4321/ cpu4 20         # cuadros por velocidad, "Ir al partido", abrir/cerrar el día de partido
node tests/perf/search-typing.cjs http://localhost:4321/ cpu4           # latencia del buscador global
```

Las corridas de este informe: 10 por escenario de carga (7 para el guardado de 5,3 MB y 8 sin escudos), 5 repeticiones por pantalla en desktop y 3 con CPU 4×, 12 guardados por escenario, ventanas de 20 s por velocidad. Con n = 10 el p95 es casi el máximo; leerlo como cota superior observada.

Para que el perfil sea comparable en el futuro: misma máquina, mismo perfil de emulación, misma semilla (12345), mismo club (Independiente) y registrar el hash del commit en el nombre del informe.

Verdict: **COMPLETE** — perfil de rendimiento generado (guardado en `production/polish/full-report-2026-11-19.md`).
