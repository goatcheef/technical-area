# ADR-0002: Guardado en segundo plano, por momentos, con copias

## Status
Accepted

## Date
2026-11-22

## Last Verified
2026-11-22

## Decision Makers
usuario (dueño del proyecto) y technical-director

## Summary
Hoy `saveGame` (`src/store.ts:56`) serializa el `Game` completo (2,2-5,3 MB, sin tope por `players[].history`) en el hilo principal en cada día y lo pisa en una sola clave `'auto'`: 31-81 ms en desktop y 109-256 ms con CPU 4× contra 50 ms de presupuesto, y un fallo a mitad de escritura no deja copia buena. Se decide guardar la partida (una sola a la vez, como hoy) en un Web Worker (copia por `postMessage`, `JSON` + `CompressionStream` gzip, escritura en IndexedDB) solo en momentos clave y cada 7 días de juego, de a una escritura por vez, en un anillo de 3 copias automáticas con puntero atómico, con exportar/importar, tope al historial y migración versionada (`Game.version` 7).

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web: React 19.3.1 + TypeScript 7.0.2 + Vite 8.3.8 (verificado en `node_modules`); guardado en IndexedDB |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | LOW: plataforma web estándar (Web Workers de módulo, `postMessage` con clonado estructurado, `CompressionStream`/`DecompressionStream` gzip, IndexedDB con transacciones de varios almacenes, `visibilitychange`/`pagehide`, `navigator.storage.persist`) |
| **References Consulted** | ninguna (no hay `docs/engine-reference/` para Web). Documentación de la herramienta Artifact (vía el usuario, 2026-11-22): IndexedDB y `localStorage` andan dentro de un artefacto publicado (cada uno tiene su origen) y hay artefactos de varios archivos (hasta 255 por publicación) |
| **Post-Cutoff APIs Used** | Ninguna. Verificado por el lead-programmer en Chromium 153 con `g-s3.json` (5,29 MB): Worker `{ type: 'module' }` emitido por Vite 8 como archivo aparte; `postMessage(g)` 26 ms en el hilo principal; en el worker `stringify` 80 ms + gzip 165 ms + transacción `readwrite` de dos almacenes 34 ms; 5,29 → 0,84 MB. `requestIdleCallback` no existe en Safari/iOS: se usa `idle()` con respaldo |
| **Verification Required** | Al implementar: (1) `CompressionStream('gzip')` en Chrome 80+, Firefox 113+ y Safari 16.4+; sin él, el worker guarda sin comprimir (`codec: 'json'`). (2) Worker de módulo dentro del artefacto publicado (no verificado; IndexedDB y `localStorage` sí, según la documentación): si no arranca, modo en hilo. (3) `ArrayBuffer` dentro de IndexedDB en Safari (se evita `Blob`). (4) La descarga en el artefacto con la capacidad `downloads` y qué pasa sin ella. (5) Costo de `postMessage(g)` con CPU 4× (desktop: 26 ms con 5,3 MB). (6) Que una escritura lanzada en `visibilitychange` oculto termine en Chrome Android y Safari iOS al cambiar de app (el trabajo del worker tarda ~280 ms en desktop y ~4× en un celular de gama media). (7) `durability: 'strict'` en la transacción del puntero en Chrome (por defecto `relaxed`; irrelevante en Safari y Firefox). (8) El selector de archivos de iOS con `accept=".tasave,.json,.gz,application/octet-stream,application/json"`. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | ADR-0003 (exportar desde la pantalla de recuperación, última copia buena, `blockSaves`/`unblockSaves`, `listSaves` para "Elegir otra copia") |
| **Blocks** | None como épica (no hay épicas en `production/`). Bloquea la implementación completa de ADR-0003 |
| **Ordering Note** | El tope del historial y la migración v6 → v7 van en el mismo cambio que el formato nuevo, para subir `Game.version` una sola vez. En el mismo cambio se adaptan todos los tests que tocan IndexedDB (ver Risks). `idle()` (`src/idle.ts`) es el de ADR-0001; si este ADR va primero, lo crea. En `main.tsx`, `initSaves()` corre después de `installGlobalHandlers` y `createRoot` (ADR-0003) y en paralelo con `loadDb()` (ADR-0001). |

## Context

### Problem Statement
`persist` (`App.tsx:114`) llama a `saveGame` en cada `Continuar`, al terminar "Ir al partido", tras cada partido y desde unas 25 acciones de pantalla (`ctx.save()`); cada llamada hace `JSON.stringify(g)` en el hilo y un `put` en la clave `'auto'` (hotspots 2, 6 y 9 del informe del 2026-11-19). El costo crece con la carrera: el JSON llega a 7,25 MB a las 10 temporadas por `players[].history` (`game.ts:805`, ~170 B por jugador y temporada, ~0,5 MB por temporada). Hay una sola copia: una pestaña cerrada a mitad de un `put`, una base corrupta o un error que se guarda (ADR-0003) se llevan la carrera. `exportGame` existe (`store.ts`) pero no hay importar, aunque `game-concept.md` lo promete. Hay que decidirlo ahora: es el formato que todo lo demás va a leer y cambiarlo después cuesta otra migración.

### Constraints
- Una sola partida a la vez (decisión del usuario): crear una partida nueva reemplaza la anterior tras confirmar, como hoy.
- `Ctx.save(): Promise<boolean>` y `Ctx.lastSaveError` conservan su contrato: `false` si falló, y el aviso del armazón ("No se pudo guardar la partida. Lo que hiciste sigue en esta sesión; probá exportar la partida desde Ajustes.") no cambia.
- `src/engine/` sigue puro: la migración y el tope del historial son funciones del motor; workers, IndexedDB y archivos viven fuera.
- Sin red: nada sale del navegador (privacidad, `CLAUDE.md`).
- El juego se publica como artefacto de claude.ai: descargas solo con la capacidad `downloads`; IndexedDB es el del origen propio del artefacto.
- `npm run sim` y los resultados con la misma semilla no cambian (el historial no alimenta al azar ni a ninguna fórmula).

### Requirements
- Presupuesto de guardado (aceptado por el usuario el 2026-11-22): desktop ≤ 50 ms de hilo principal por guardado; celular (CPU 4×) ≤ 50 ms por día de avance en promedio y ninguna tarea de guardado > 150 ms; nunca en el camino clic → dibujo.
- Un fallo a mitad de escritura nunca deja sin la última copia buena.
- Ningún cambio pedido con `ctx.save()` se pierde por una regla de "sin cambios".
- La partida guardada en la clave `'auto'` (versión 6) carga sin que el usuario haga nada.
- Exportar e importar un archivo.
- El guardado no crece sin tope con las temporadas.

## Decision

- **Worker de guardado** (`src/save/save.worker.ts`): recibe el `Game` por `postMessage` (clonado estructurado), hace `JSON.stringify`, comprime con `CompressionStream('gzip')` y escribe en IndexedDB. Motivo: `stringify` + gzip + escritura (~280 ms medidos en desktop con 5,3 MB) salen del hilo; queda solo el clonado (26 ms).
- **Copia tomada en reposo con `idle()`**: el pedido se agenda con `idle(fn, { timeout: 1000, fallbackMs: 50 })` (`src/idle.ts`: `requestIdleCallback` si existe, `setTimeout` si no, como en Safari/iOS) después del dibujo del clic. `visibilitychange` oculto y `pagehide` no pasan por `idle`: toman la copia en el acto. Motivo: el clonado no cae entre el clic y el cuadro siguiente, y en Safari igual se guarda.
- **Momentos de guardado**: al resolver cualquier decisión y en toda acción que hoy llama a `ctx.save()`; al terminar un partido; al frenar "Ir al partido" (partido, decisión, prensa, Esc); al cerrar la temporada (`'season'` de `advanceDay`) y al empezar la siguiente; al crear la partida, tomar un trabajo e ir al menú principal; en `visibilitychange` oculto (y `pagehide` como mejor esfuerzo); y cada **N = 7 días de juego** avanzados (con `Continuar` o dentro de "Ir al partido"). Motivo: entre esos momentos solo pasan días sin decisiones; perder como máximo 6 de esos días es aceptable (aceptado por el usuario) y saca ~7 de cada 8 escrituras del avance.
- **Regla de suciedad**: el servicio lleva `rev` (sube en cada `refresh()` y en cada `requestSave`) y `savedRev` (el `rev` de la última escritura **buena**). Todo `requestSave` con `why` distinto de `'hidden'` y `'days'` marca sucio por sí mismo (`dirtySince = ++rev`) y siempre escribe, haya o no `refresh()`. `'hidden'` y `'days'` se saltean solo si `rev === savedRev`. Una escritura fallida no actualiza `savedRev`: el próximo pedido vuelve a escribir. Motivo: varios sitios mutan y llaman a `save()` sin `refresh()` o antes (`Home.tsx:45`, `:63`, `:203`, `Locker.tsx:597`, `PlayerTable.tsx:253`); que una acción dependa de `refresh()` para guardarse perdería decisiones.
- **Una escritura por vez, fusionada**: estados `idle → scheduled → writing (→ dirty)`; un pedido durante `writing` marca `dirty` y, al terminar, se toma una copia nueva con el estado de ese momento. Cada promesa se resuelve con la primera escritura cuya copia es posterior al pedido. Motivo: nunca dos copias de 5 MB en vuelo ni escrituras desordenadas.
- **`blockSaves()` / `unblockSaves()`**: `blockSaves(reason)` cancela el `idle` agendado, descarta un `dirty` pendiente y hace que todo pedido nuevo se resuelva en `false` sin escribir; una escritura ya en vuelo puede terminar, porque su copia se tomó antes del error y es buena. `unblockSaves()` lo levanta; lo llama `loadSave()` cuando carga un estado del disco en la ruta de recuperación de ADR-0003 ("Volver al inicio", "Elegir otra copia"). Motivo: ADR-0003 necesita cortar y reanudar el guardado sin recargar.
- **Anillo de 3 copias automáticas + puntero atómico**: el worker escribe la ranura más vieja (`a0`, `a1`, `a2`) y mueve `head.autoHead` a ella en **la misma transacción** `readwrite` sobre `blob`, `meta` y `head`. Motivo: IndexedDB confirma todo o nada, y la copia anterior nunca se toca; si la pestaña muere a mitad, el puntero sigue en la última buena.
- **Partida nueva o importada reemplaza en el mismo paso**: "Firmar contrato" conserva su confirmación de reemplazo (`carrera-del-dt.md`), pero ya no borra antes (`deleteSave` de `Start.tsx:33` se va): el primer guardado de la partida nueva (`requestSave(g, 'new')`) escribe `a0`, borra `a1` y `a2` y mueve el puntero en una sola transacción. Importar sigue el mismo camino con la confirmación "Importar reemplaza tu partida guardada". Motivo: si la partida nueva no llega a guardarse, la anterior sigue entera.
- **Carga con respaldo**: `loadSave()` lee la cabeza; si no descomprime, no parsea o no migra, prueba la copia anterior por `seq` y avisa "Cargamos la copia anterior del {fecha}". `listSaves()` devuelve las 3 copias (la más nueva primero) para "Elegir otra copia" de ADR-0003. Motivo: una copia dañada no se lleva la carrera.
- **Actualización de la base solo en `initSaves()`**: el hilo principal abre `'technical-area'` en versión 2 (almacenes `meta`, `blob`, `head`; `saves` queda) **antes** de crear el worker; el worker abre sin número de versión. Toda conexión lleva `db.onversionchange = () => db.close()`, y `onblocked` muestra "Cerrá las otras pestañas del juego para terminar de actualizar". Motivo: dos hilos o una pestaña vieja abierta en v1 bloquean `onupgradeneeded`.
- **Una conexión por hilo**: `src/save/idb.ts` abre una vez y la reutiliza (hotspot 9). Motivo: hoy se abre una conexión por guardado y no se cierra.
- **Modo sin worker**: `new Worker(…)` va en `try/catch` (puede lanzar `SecurityError` de forma síncrona), y `worker.onerror` (el script no cargó o el worker murió) también pasa a modo en hilo: las mismas funciones (`format.ts`, `idb.ts`) corren en el hilo principal. Si IndexedDB también lanza, el guardado falla como hoy y cae en el aviso de guardado fallido. Motivo: guardar lento es mejor que no guardar; no guardar tiene que avisarse.
- **`SaveError` vive en `src/save/types.ts`** y `src/store.ts` lo reexporta. Motivo: evita la importación circular `store.ts` ↔ `src/save/`.
- **Exportar e importar**: archivo `technical-area-<CÓDIGO>-<fecha>.tasave` = gzip de `{ format: 'technical-area', formatVersion: 1, meta, game }`. Importar acepta `.tasave`, el `.json` que exporta hoy `exportGame` y texto pegado; valida, migra y devuelve el `Game`, que reemplaza a la partida guardada tras confirmar. El `<input type="file">` usa `accept=".tasave,.json,.gz,application/octet-stream,application/json"` (iOS deja en gris las extensiones que no conoce). Motivo: el archivo comprimido pesa ~0,8 MB en vez de 5 MB, y las exportaciones viejas siguen sirviendo.
- **Exportar dentro del artefacto**: el artefacto se publica con la capacidad `downloads`; se exporta con un `<a download>` agregado al DOM antes del `click()` y la URL `blob:` se revoca con `setTimeout(…, 4000)` (revocarla enseguida cancela descargas de ~1 MB en Safari y Firefox). Como un iframe sin esa capacidad bloquea la descarga en silencio, al exportar se abre un panel "¿No se descargó?" con "Copiar la partida como texto" (base64 del gzip, ~1,1 MB) por `navigator.clipboard.writeText` y, si rechaza (sin `allow="clipboard-write"`), un `textarea` seleccionado con `document.execCommand('copy')`; "Importar" acepta "Pegar partida". Motivo: no hay forma confiable de detectar la descarga bloqueada.
- **Tope del historial** (aceptado por el usuario): `HISTORY_SEASONS = 3` temporadas detalladas por jugador; las más viejas se suman en `p.careerTotals` (`seasons`, `apps`, `subs`, `goals`, `ast`, `clubs`); nunca se pliegan las temporadas en clubes que dirigió el DT (`manager.career[].clubId` y el club actual). Lo hace `foldHistory` en `startNewSeason` y en la migración. Motivo: corta el crecimiento de ~0,5 MB por temporada y la ficha sigue mostrando carrera y totales.
- **Versión**: `Game.version` pasa de 6 a **7** (cambia la forma de `history` y aparece `careerTotals`). `migrateGame` encadena migraciones `v → v+1` (6 → 7 pliega el historial); una partida de versión mayor a la del juego no se abre ("Esta partida es de una versión más nueva del juego"); una de versión menor a 6 tampoco. Después de migrar corre `refreshDb` como hoy. Motivo: un build viejo cacheado rechaza una partida 7 en vez de leerla mal, y `App.tsx` deja de descartar en silencio todo lo que no sea 6.
- **Migración de `'auto'`**: al arrancar, si hay `saves/'auto'` y el anillo está vacío, se migra como `a0`. `saves` se borra cuando el anillo tiene sus 3 copias. Motivo: el usuario no pierde la partida y hay vuelta atrás hasta tener copias nuevas.

### Architecture Diagram

```
 hilo principal                                         worker de guardado (src/save/save.worker.ts)
 ─────────────────────────────────────────────          ─────────────────────────────────────────────
 App / pantallas                                         onmessage {t:'write', seq, game, meta, replace}
   ctx.save() ──┐ (marca sucio)                            │ JSON.stringify(game)            ~80 ms
   advance ─────┼─► requestSave(g, why) ──┐                │ CompressionStream('gzip')       ~165 ms
   visibility ──┘    noteDays(g, n)       │                │ tx readwrite [blob, meta, head]: ~34 ms
                                          ▼                │   blob[slot] = bytes; meta[slot] = {...}
                 SaveService (src/save/index.ts)           │   head.autoHead = slot   ← un solo commit
                 idle ─► scheduled ─► writing ─► (dirty)   │   (replace: además borra las otras dos ranuras)
                    idle() │ (rIC o setTimeout 50)         │
                           └─ postMessage(g) 26 ms ────────┼─► (la copia es el estado de ese instante)
                 ◄── {t:'done', seq, ok, bytes | error} ◄──┘
                 savedRev, lastSaveError, promesas resueltas
                 blockSaves(): cancela idle + descarta dirty   unblockSaves(): lo levanta (loadSave en recuperación)
                 sin worker (SecurityError / onerror) ─► mismas funciones en el hilo

 IndexedDB 'technical-area' v2 (la actualiza solo initSaves(), antes del worker; onversionchange → close; onblocked → aviso)
   meta  : SaveMeta por ranura ('a0', 'a1', 'a2')       ← "Continuar partida" lee solo esto
   blob  : ArrayBuffer gzip por ranura
   head  : un registro { autoHead, seq }
   saves : 'auto' (v1, solo lectura hasta migrar)

 carga: meta/head (Start) ─► blob ─► DecompressionStream ─► JSON.parse ─► migrateGame ─► refreshDb ─► App
```

### Key Interfaces

```ts
// src/save/types.ts
export class SaveError extends Error { constructor(readonly cause?: unknown) }   // movida desde src/store.ts, que la reexporta
export type SaveReason = 'new' | 'action' | 'decision' | 'match' | 'stop' | 'days' | 'season' | 'job' | 'menu' | 'hidden'
export type Slot = 'a0' | 'a1' | 'a2'
export interface SaveMeta {
  id: Slot; clubId: number; clubCode: string; clubShort: string; managerName: string
  season: number; date: string            // fecha del juego
  savedAt: number; seq: number            // hora real (ms) y orden creciente
  bytes: number; version: number; dbVersion?: number; codec: 'gzip-json' | 'json'
}
export interface SaveHead { autoHead: Slot; seq: number }

// src/idle.ts (el de ADR-0001)
export function idle(fn: () => void, o: { timeout: number; fallbackMs: number }): () => void   // devuelve cancelar

// src/save/index.ts: la única puerta al guardado desde la interfaz
export const SAVE_EVERY_DAYS = 7
export function initSaves(): Promise<{ last: SaveMeta | null; blocked?: 'other-tab' }>   // actualiza la base a v2, migra 'auto', crea el worker o pasa a modo en hilo
export function requestSave(g: Game, why: SaveReason): Promise<boolean> // salvo 'hidden'/'days', marca sucio y siempre escribe; 'new' reemplaza el anillo; true cuando está en disco
export function noteDays(g: Game, days: number): void                  // pide 'days' al llegar a SAVE_EVERY_DAYS
export function flushNow(g: Game): void                                // visibilitychange oculto / pagehide: copia en el acto ('hidden')
export function blockSaves(reason: string): void                       // ADR-0003: cancela idle y dirty; los pedidos devuelven false
export function unblockSaves(): void                                   // ADR-0003: tras cargar un estado del disco
export function savesBlocked(): boolean
export function listSaves(): Promise<SaveMeta[]>                       // las 3 copias automáticas, la más nueva primero
export function loadSave(id?: Slot, o?: { recover?: boolean }): Promise<{ g: Game; meta: SaveMeta; fellBack: boolean } | null>
//   sin id: la cabeza (y si falla, la anterior); recover: true llama a unblockSaves() al cargar bien
export function exportSave(src: Game | Slot): Promise<void>            // Game en memoria o una copia guardada → .tasave
export function importSave(src: File | string): Promise<Game>          // .tasave, .json viejo o texto pegado; no escribe: el llamador confirma y hace requestSave(g, 'new')
export function getLastSaveError(): SaveError | null

// src/engine/migrate.ts (puro, probado con tsx)
export const GAME_VERSION = 7
export const HISTORY_SEASONS = 3
export function migrateGame(raw: unknown): Game     // lanza SaveFormatError('future' | 'old' | 'shape')
export function foldHistory(g: Game): void          // idempotente
// types.ts: Player.careerTotals?: { seasons: number; apps: number; subs: number; goals: number; ast: number; clubs: number[] }

// protocolo del worker
type ToWorker = { t: 'write'; seq: number; slot: Slot; replace: boolean; game: Game; meta: Omit<SaveMeta, 'bytes' | 'codec'> }
              | { t: 'fault'; kind: 'quota' | 'none' }                 // solo en import.meta.env.DEV (pruebas)
type FromWorker = { t: 'done'; seq: number; ok: true; bytes: number; codec: SaveMeta['codec'] }
                | { t: 'done'; seq: number; ok: false; error: { name: string; message: string } }

// Ctx (src/store.ts) sin cambios de forma: save = () => requestSave(g, 'action'); lastSaveError igual
```

### Implementation Guidelines
- Toda escritura de la partida debe pasar por `requestSave`/`flushNow`; ningún otro módulo debe llamar a `indexedDB` ni a `JSON.stringify(g)`.
- Todo `requestSave` con `why` distinto de `'hidden'` y `'days'` debe escribir aunque no haya habido `refresh()`; solo `'hidden'` y `'days'` pueden saltearse con `rev === savedRev`, y `savedRev` solo debe avanzar con una escritura buena.
- La copia debe tomarse con `postMessage(g)` en un solo paso síncrono, entre llamadas al motor (nunca dentro de un `advanceDay`): así es siempre un estado coherente.
- Nada debe llamar a `requestIdleCallback` directamente: se usa `idle()`. `flushNow` nunca debe pasar por `idle`.
- Nunca debe haber más de una escritura en vuelo; un pedido durante una escritura debe fusionarse en la siguiente.
- La ranura nueva, su `meta` y el puntero `head` deben escribirse en una sola transacción; nunca se debe sobrescribir la ranura a la que apunta `head`, salvo en el reemplazo de `'new'`, que escribe y borra en esa misma transacción.
- Crear o importar una partida nunca debe borrar el anillo antes de que la nueva esté escrita.
- Solo `initSaves()`, en el hilo principal y antes de crear el worker, debe abrir la base con número de versión; toda conexión debe cerrarse en `onversionchange`.
- `new Worker(…)` debe ir en `try/catch` y el servicio debe escuchar `worker.onerror`; los dos pasan a modo en hilo.
- `requestSave` debe devolver `false` y dejar `lastSaveError` cuando falla la escritura, y `true` al primer guardado bueno siguiente (contrato de `tests/ui/guardado.cjs`).
- Con `savesBlocked()`, todo pedido debe resolverse en `false` sin escribir y sin mostrar el aviso de guardado fallido (lo reemplaza la pantalla de ADR-0003); `blockSaves` debe cancelar el `idle` agendado y descartar `dirty`.
- `unblockSaves()` solo debe llamarse después de cargar un estado del disco.
- La pantalla de inicio debe leer solo `meta`/`head` para mostrar "Continuar partida"; el `blob` se baja al hacer clic (o en reposo después del primer dibujo).
- Todo cambio de forma de `Game` debe subir `GAME_VERSION` y agregar un paso a `migrateGame`; campos opcionales nuevos con `?? valor` no lo suben (regla actual).
- `foldHistory` nunca debe plegar temporadas en clubes que dirigió el DT y debe dejar los totales iguales a la suma de lo plegado.
- Exportar debe agregar el `<a>` al DOM, revocar la URL a los 4 s y ofrecer siempre el panel "¿No se descargó?" con la copia como texto (portapapeles o `textarea` + `execCommand('copy')`).
- Los atajos de falla del worker (`t: 'fault'`) deben existir solo con `import.meta.env.DEV`.
- Pedir `navigator.storage.persist()` una vez, en el gesto de "Firmar contrato" (en Firefox muestra un permiso).

## Alternatives Considered

- **Guardar por partes con marcas de cambio** (almacenes por jugadores, fixture y resto; solo lo que cambió): menos bytes por escritura, pero cada mutación del motor tendría que marcar lo que toca y una parte vieja con otra nueva da un estado imposible. Rechazada por el usuario.
- **Solo comprimir y seguir guardando cada día en el hilo**: menos disco, pero suma 43-165 ms de gzip al bloqueo que ya está por encima del presupuesto. Rechazada por el usuario.
- **Varias partidas con nombre** (ranuras manuales, varias carreras): más libertad, pero más estado (carrera por partida, índice, pantalla propia) para algo que el usuario no necesita. Rechazada por el usuario el 2026-11-22: una partida a la vez.
- **`JSON.stringify` en el hilo y mandar el texto al worker**: más caro que el clonado (41 contra 26 ms con 5,3 MB, Chromium). No elegida.
- **Guardar todo con `put(g)` directo de IndexedDB** (clonado estructurado, sin JSON): evita `stringify`, pero sin comprimir son 5 MB por copia × 3, y el formato queda atado al clonado del navegador (no exportable tal cual). No elegida.
- **"Sin cambios" medido solo con `refresh()`**: simple, pero pierde las acciones que llaman a `save()` sin `refresh()`. Rechazada tras la validación.

## Consequences

### Positive
- El clic en `Continuar` deja de pagar el guardado: el clonado ocurre en reposo y ~1 de cada 7 días.
- `stringify`, gzip y escritura salen del hilo; cada copia ocupa ~0,25-0,85 MB en disco en vez de 2-5 MB (relación medida de 5,6× a 8,6×).
- Una pestaña cerrada a mitad de escritura, una copia corrupta o un error (ADR-0003) siempre dejan una copia buena anterior.
- Importar (prometido en `game-concept.md`) y migración real en vez de descartar.
- Crear una partida nueva ya no deja sin nada si falla a mitad.
- El guardado deja de crecer sin tope.

### Negative
- Se pueden perder hasta 6 días sin decisiones si el navegador mata la pestaña antes de que termine la escritura de `visibilitychange`.
- El clonado sigue en el hilo principal: 26 ms en desktop con 5,3 MB, ~100 ms con CPU 4× (estimado) cada vez que se guarda, aunque fuera del clic.
- `Ctx.save()` se resuelve más tarde (hasta 1 s de `idle` más ~280 ms de escritura): los avisos de error de guardado en `Market.tsx:209` y `Locker.tsx:41/165` llegan después.
- Más código de plataforma (`src/save/`: worker, protocolo, anillo, migración, exportar/importar).
- La ficha de un jugador ajeno muestra solo 3 temporadas detalladas y el resto como totales.
- Un build viejo cacheado no abre partidas guardadas por el nuevo (versión 7).

## Risks
- **`pagehide` no termina la escritura**: el worker muere con el documento y su trabajo tarda ~280 ms en desktop (~4× en celular). Mitigación, `pagehide` es solo mejor esfuerzo y no se promete; el momento confiable es `visibilitychange` oculto, que en el celular llega antes y deja la pestaña viva un rato.
- **El clonado con CPU 4× supera 150 ms y se nota como tirón**: mitigación, se agenda en reposo; si no alcanza, subir `SAVE_EVERY_DAYS` (menos tirones, más días en riesgo).
- **El Worker de módulo no arranca dentro del artefacto** (no verificado; IndexedDB y `localStorage` sí andan según la documentación de Artifact): mitigación, `try/catch` y `onerror` pasan a modo en hilo, o `?worker&inline` (Worker desde `blob:`, que anduvo en la prueba, sujeto a `worker-src` del anfitrión). Si IndexedDB fallara igual (un iframe `sandbox` sin `allow-same-origin` lo hace lanzar, medido), aviso de guardado fallido y exportar.
- **Una pestaña vieja en v1 bloquea la actualización**: mitigación, `onversionchange` cierra las conexiones y `onblocked` pide cerrar las otras pestañas.
- **Cuota de almacenamiento llena**: mitigación, 3 copias de ≤ 1 MB; `QuotaExceededError` mostrado con el aviso de siempre.
- **Safari borra el almacenamiento a los 7 días sin uso (ITP)** si el sitio no está en la pantalla de inicio, y `persist()` no lo evita: mitigación, la ayuda recomienda exportar seguido en Safari.
- **La migración v6 → v7 tiene un error y estropea la partida**: mitigación, `saves/'auto'` se conserva hasta tener 3 copias nuevas, y `tests/engine/migrate.ts` compara totales.
- **La descarga se bloquea en el artefacto o el portapapeles está bloqueado**: mitigación, panel "¿No se descargó?" con la copia como texto, `textarea` + `execCommand('copy')` y "Pegar partida".
- **El puntero se confirma con `durability: 'relaxed'` en Chrome** y un corte de luz podría perder la última copia (no la anterior): mitigación, `durability: 'strict'` en esa transacción (verificación 7); no cambia la atomicidad.
- **Tests que se rompen con el formato nuevo** (todos se adaptan en el mismo cambio): `tests/ui/guardado.cjs` (rompe `indexedDB.open` en la página, el worker no lo ve: pasa a `{t:'fault'}`); `tests/ui/vestuario.cjs:489` (reemplaza `indexedDB.open` y lanza); `tests/perf/load-time.cjs:31`, `memory-loaded.cjs:13`, `save-bench.cjs:24` y `save-direct.cjs:12/19` (abren `'technical-area'` en versión 1: `VersionError` con la base en v2; pasan a abrir sin número de versión o a sembrar por la página).

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| game-concept.md | "La partida se guarda sola en IndexedDB después de cada avance." | Cambia: se guarda sola al frenar cada avance y en cada momento clave, y cada 7 días dentro de un avance largo o de varios `Continuar` (GDD actualizado). |
| game-concept.md | "**Red** \| Ninguna. Guardado local en IndexedDB; exportar e importar la partida como JSON." | Guardado local; exportar e importar en `.tasave` (JSON comprimido con gzip) y también el `.json` viejo. Nada sale por la red. |
| game-concept.md | Riesgo técnico: "El estado completo se guarda en IndexedDB del navegador: borrar los datos del sitio borra la carrera (se mitiga con "Exportar partida")." | Exportar desde Ajustes, el aviso de guardado fallido y la pantalla de recuperación; `navigator.storage.persist()` al firmar contrato; aviso de ITP en Safari. |
| game-concept.md | Riesgo técnico: "Cambios de formato exigen subir `Game.version` (hoy 6); una partida de otra versión no carga." | `migrateGame` encadena migraciones: una partida vieja carga migrada; solo una de versión más nueva se rechaza, con mensaje. |
| comunicacion-y-bandeja.md | 17. "**Continuar** (un día, botón principal o Espacio): corre un `advanceDay`, guarda y, si el resultado es `press`, abre la ventana de prensa." | Cambia: `Continuar` cuenta el día (`noteDays`) y escribe al llegar a 7 o si el día dejó un momento clave (GDD actualizado). |
| comunicacion-y-bandeja.md | Avance, paso 4: "Al detenerse guarda; con `press` abre la ventana de prensa; con una decisión nueva o que vence hoy navega a `inbox`…" | Se conserva: frenar "Ir al partido" es el momento `'stop'`. |
| comunicacion-y-bandeja.md | Tabla de acciones: "Elegir un mensaje (clic o ↑ ↓) \| 50 \| 3 \| Marca leído y guarda." y "Resolver una decisión \| 100 \| 6 \| Llama al motor, guarda y redibuja." | `ctx.save()` sigue igual en esas acciones (`'action'`), marca sucio por sí mismo y siempre escribe, fusionado y en reposo. |
| comunicacion-y-bandeja.md | "**UR-25** El estado leído se conserva al guardar y cargar la partida." | `read` viaja en `g.news` dentro de la copia; `markRead` + `save()` sin `refresh()` (`Home.tsx:63`) también se escribe; la migración no toca `news`. |
| design/ux/bandeja.md (especificación de la bandeja) | "Error al guardar \| `save()` falla (IndexedDB) \| Nota F7 en `--bad`: "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes."" | `requestSave` devuelve `false` igual que hoy (más tarde, tras el `idle`); la nota y el aviso del armazón no cambian. |
| temporada-y-ligas.md | F.2: "`startNewSeason` … suma la temporada al historial de cada jugador, lo desarrolla o envejece (F9), reinicia estadísticas…" | Sigue sumándola y después `foldHistory` pliega lo que pasa de 3 temporadas (GDD actualizado); empezar la temporada es el momento `'season'`. |
| temporada-y-ligas.md | Perilla: "Tope de noticias \| 320 → 300, máximo 400 \| — \| Más historia, más peso del guardado" | Sin cambio; con el tope del historial, `news` y `deals` el guardado queda acotado. |
| carrera-del-dt.md | "**Elegí tu club** … "Firmar contrato" crea la partida (`newGame`); si ya hay una partida guardada, pide confirmar el reemplazo." | Se conserva: una partida a la vez y la misma confirmación; el reemplazo ocurre en la misma transacción que el primer guardado de la nueva. |
| base-de-datos.md | "Si la base cambia después de empezar una carrera, durante la primera temporada el juego trae los atributos y puestos nuevos a la partida guardada." | `refreshDb` corre después de `migrateGame`, como hoy después de `loadGame`. |
| economia-y-dirigencia.md | Ninguno aplica: no define cuándo ni cómo se guarda (el cambio de temporada lo cubre `temporada-y-ligas.md`). | — |

GDD sync (hecha en el mismo cambio): `game-concept.md` (cuándo y cómo se guarda), `comunicacion-y-bandeja.md` regla 17, `temporada-y-ligas.md` F.2 (`foldHistory`) y `CLAUDE.md` (`Game.version` 7 con `migrateGame`, guardado solo por `src/save/`). `carrera-del-dt.md` no cambia.

## Performance Implications
- **CPU**: hilo principal por guardado = `postMessage(g)`: 26 ms en Chromium desktop con 5,3 MB (medido por el lead-programmer; Node `v8.serialize` 11 / 23 / 35 ms con 2,2 / 4,1 / 5,3 MB), contra 15-37 ms de `stringify` + `put` hoy; con CPU 4× ~100 ms (estimado). Fuera del clic y 1 de cada 7 días de avance: promedio por día con CPU 4× ≈ 15 ms (presupuesto 50 ms por día, tope 150 ms por tarea). Las acciones de pantalla siguen guardando cada vez (fusionadas). El clic en `Continuar` pasa de 155-195 ms a ~60-80 ms con CPU 4× (el resto es el redibujo, recomendación 2 del informe). Worker: `stringify` 80 + gzip 165 + IndexedDB 34 ≈ 280 ms en desktop, sin bloquear.
- **Memoria**: una copia del estado en el worker mientras escribe (~15-40 MB de montículo de forma pasajera; tope de 250 MB). El tope del historial deja el estado en ~5,5-6 MB a las 10 temporadas (hoy 7,25; ESTIMADO: 3.500 jugadores × 3 × 170 B ≈ 1,8 MB de historial como máximo).
- **Load Time**: "Continuar partida" se muestra leyendo solo `meta` (KB), no 2-5 MB de JSON (hoy 221-269 ms de lectura y `parse` antes del botón en mobile4g). Cargar: leer 0,25-0,85 MB + descomprimir + `JSON.parse` (20-29 ms desktop, 67-136 ms CPU 4×, como hoy).
- **Network**: ninguna. Disco: 3 copias de ~0,25-0,85 MB ≈ 2,6 MB como máximo.

## Migration Plan
1. `src/engine/migrate.ts` (`GAME_VERSION = 7`, `foldHistory`, `migrateGame`), `Player.careerTotals`, `foldHistory` en `startNewSeason`, ficha del jugador con totales; `tests/engine/migrate.ts` en `npm run test:engine`; `npm run sim -- 3` con tres semillas idéntico.
2. `src/idle.ts` (si ADR-0001 no lo trajo); `src/save/` (`types` con `SaveError`, `idb` con la base v2, `format`, `save.worker`, `index`); `src/store.ts` reexporta `SaveError` y deja `saveGame`/`loadGame`/`exportGame` como envoltorios por una versión.
3. `App.tsx`: `persist` → `requestSave`; `advance` llama `noteDays`; `visibilitychange`/`pagehide` → `flushNow`; `loadGame().then(s.version === 6 …)` → `initSaves` + `loadSave`. `Start.tsx`: se va `await deleteSave()`; la partida nueva se guarda con `'new'`.
4. Migración de `saves/'auto'` al arrancar; se borra al tener 3 copias.
5. Exportar con el panel "¿No se descargó?" e importar (archivo o texto pegado) en Ajustes y en la pantalla de inicio.
6. Reescribir `tests/ui/guardado.cjs`; adaptar `tests/ui/vestuario.cjs:489`, `tests/perf/load-time.cjs`, `memory-loaded.cjs`, `save-bench.cjs` y `save-direct.cjs`.

## Validation Criteria
- `node tests/perf/save-bench.cjs http://localhost:4321/ desktop g-s3.json 12` (adaptado para medir tareas largas con `PerformanceObserver`): ninguna tarea de guardado > 50 ms en desktop; clic `Continuar` → 2 cuadros ≤ 50 ms de mediana.
- Lo mismo con `cpu4` sobre 14 días de `Continuar`: tiempo de hilo de guardado ≤ 50 ms por día en promedio y ninguna tarea de guardado > 150 ms; clic → 2 cuadros ≤ 100 ms de mediana.
- `node tests/perf/save-direct.cjs … cpu4 g-s3.json 12`: el hilo principal no ejecuta `JSON.stringify` ni gzip (perfil de CPU).
- `node --expose-gc --import tsx tests/perf/engine-bench.ts 10 12345`: JSON a las 10 temporadas ≤ 6 MB (hoy 7,25) y gzip ≤ 1,1 MB.
- `node tests/ui/guardado.cjs` reescrito: con `{t:'fault', kind:'quota'}` → `save()` devuelve `false` y aparece el aviso con su texto; el pedido siguiente sin falla devuelve `true` y lo saca (el intento fallido no cuenta como guardado); con `Worker` roto en la página (constructor que lanza y script que no carga), el modo en hilo guarda y el aviso no aparece; el aviso llega aunque tarde (espera al `idle`).
- Prueba nueva `tests/ui/guardado-copias.cjs`:
  - (a) cerrar la página con una escritura en vuelo → al volver carga la copia anterior;
  - (b) romper los bytes de la cabeza → carga la anterior y lo avisa;
  - (c) una base v1 con `'auto'` versión 6 → carga como 7 y deja 3 copias; con otra pestaña abierta en v1, aparece "Cerrá las otras pestañas del juego";
  - (d) exportar → importar da un `Game` con el mismo `JSON.stringify` (salvo `careerTotals` ya plegado);
  - (e) importar el `.json` viejo funciona y pide confirmar el reemplazo;
  - (f) una partida con `version: 99` se rechaza con el mensaje;
  - (g) con `downloads` bloqueado, el panel ofrece la copia como texto, y con `clipboard-write` bloqueado, el `textarea`;
  - (h) partida nueva con la escritura forzada a fallar → la partida anterior sigue cargando;
  - (i) `markRead` + `save()` sin `refresh()` queda en disco tras recargar;
  - (j) con `requestIdleCallback` borrado de `window` (como Safari), el guardado corre igual;
  - (k) `blockSaves()` con un guardado agendado: no se escribe nada más; `loadSave(head, { recover: true })` y un `Continuar` sí escriben; `listSaves()` devuelve 3 copias con `seq` decreciente.
- `tests/engine/migrate.ts`: `foldHistory` dos veces = una vez; totales = suma de lo plegado; temporadas en clubes del DT intactas.
- `node tests/perf/load-time.cjs … mobile4g 10 g-s1.json` (sembrando sin número de versión): botón "Continuar partida" ≤ 1,5 s (hoy 3,66 s, junto con ADR-0001).
- `bandeja.cjs`, `mercado.cjs` y `vestuario.cjs` (este con su línea 489 adaptada) pasan.
- Estuvo bien si en un mes de juego la carrera nunca se pierde y nadie nota el guardado.

## Related
- ADR-0003 (depende de este: `blockSaves`/`unblockSaves`, última copia buena, `listSaves`, `exportSave`).
- ADR-0001 (`initSaves()` corre en paralelo con `loadDb()`; comparte `idle()`).
- `production/polish/full-report-2026-11-19.md` (hotspots 2, 6 y 9, recomendaciones 2 y 6).
- `design/gdd/game-concept.md`, `design/gdd/comunicacion-y-bandeja.md`, `design/ux/bandeja.md`, `design/gdd/temporada-y-ligas.md`, `design/gdd/carrera-del-dt.md`.
- Decisiones del usuario (2026-11-22): presupuesto de guardado (desktop ≤ 50 ms de hilo por guardado; CPU 4× ≤ 50 ms por día en promedio y ninguna tarea > 150 ms); N = 7 días; 3 temporadas detalladas + totales, sin plegar las de clubes del DT; **una sola partida a la vez** (se quitaron las partidas con nombre, `saveAs`, el tope de 10 y la carrera por partida; quedan las 3 copias automáticas, exportar e importar); `.tasave` comprimido; exportar solo la última copia buena en la recuperación; Worker de módulo a verificar al implementar, con modo en hilo.
- Revisión tras la validación (5.5): regla de suciedad nueva, donde todo `requestSave` salvo `'hidden'`/`'days'` marca sucio y un fallo no cuenta como guardado (B2-1); `idle()` con respaldo `setTimeout` para Safari (B2-2); `unblockSaves()` y `blockSaves` que cancela `idle` y `dirty` (B2-3); cifras de Chromium (`postMessage` 26 ms, worker ~280 ms); `pagehide` solo mejor esfuerzo; actualización de la base solo en `initSaves()` con `onversionchange`/`onblocked`; `SaveError` a `src/save/types.ts`; `try/catch` y `onerror` del worker; exportar con `<a>` en el DOM y revocado a 4 s, `accept` para iOS, portapapeles con respaldo; ITP de Safari; `durability: 'strict'`; `Ctx.save()` más tardío; lista completa de tests que se rompen.
