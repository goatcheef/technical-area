# Story 006: Guardado en segundo plano con tres copias

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-004`, `TR-base-tecnica-005`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0002: Guardado en segundo plano, por momentos, con copias
**ADR Decision Summary**: `src/save/` es el único camino: la copia sale por `postMessage` a un worker que serializa, comprime con gzip y escribe en IndexedDB, solo en momentos clave y cada 7 días, una escritura por vez, en un anillo de 3 copias con puntero atómico y con modo en hilo como respaldo.
**ADR Version**: 2026-11-22

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Verificar (ADR-0002): (1) `CompressionStream('gzip')` en Chrome 80+, Firefox 113+, Safari 16.4+; sin él el worker guarda sin comprimir (`codec: 'json'`); (2) Worker de módulo dentro del artefacto publicado (no verificado; si no arranca, modo en hilo); (3) `ArrayBuffer` en IndexedDB en Safari (se evita `Blob`); (5) costo de `postMessage(g)` con CPU 4× (desktop 26 ms con 5,3 MB); (6) que una escritura lanzada en `visibilitychange` oculto termine en Chrome Android y Safari iOS; (7) `durability: 'strict'` en la transacción del puntero en Chrome.

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0002 y ADR-0001)*:
- Required: `requestSave`/`noteDays`/`flushNow`/`loadSave`/`listSaves` de `src/save/index.ts` como única puerta; `postMessage(g)` a un Worker de módulo, `JSON.stringify` + `CompressionStream` + IndexedDB en el worker (`save_serialization`); `idle()` en lugar de `requestIdleCallback`.
- Forbidden: `storage_outside_save_service`, `concurrent_save_writes`, `overwrite_head_slot`, `save_skip_by_refresh_only`, `direct_request_idle_callback`.
- Guardrail: `save-main-thread` ≤ 50 ms (desktop por guardado; CPU 4× ≤ 50 ms por día en promedio y ninguna tarea de guardado > 150 ms); `save-size` JSON ≤ 6 MB y gzip ≤ 1,1 MB a las 10 temporadas.

---

## Acceptance Criteria

*From ADR-0002 (Decision, Validation Criteria) and TR-base-tecnica-004/005:*

- [ ] `src/save/` es el único camino de guardado: `types.ts` (con `SaveError`, que `src/store.ts` reexporta, `SaveReason`, `Slot`, `SaveMeta`, `SaveHead`), `idb.ts` (una conexión por hilo, `onversionchange = () => db.close()`, `onblocked` con "Cerrá las otras pestañas del juego para terminar de actualizar"), `format.ts`, `index.ts` y `save.worker.ts`; ningún módulo fuera de `src/save/` llama a `indexedDB` ni a `JSON.stringify(g)` para guardar.
- [ ] `requestSave(g, why)`: salvo `'hidden'` y `'days'` marca sucio por sí mismo y siempre escribe, haya o no `refresh()`; `'hidden'` y `'days'` se saltean solo si `rev === savedRev`; `savedRev` avanza solo con una escritura buena; `noteDays(g, n)` pide `'days'` cada `SAVE_EVERY_DAYS = 7`; `flushNow(g)` (en `visibilitychange` oculto, y `pagehide` como mejor esfuerzo) toma la copia en el acto sin pasar por `idle`; los demás pedidos se agendan con `idle(fn, { timeout: 1000, fallbackMs: 50 })`. Los momentos de guardado del ADR (decisiones, `ctx.save()`, fin de partido, freno de "Ir al partido", temporada, partida nueva, trabajo, menú) pasan todos por `requestSave`; `Ctx.save = () => requestSave(g, 'action')`.
- [ ] Una sola escritura en vuelo (`idle → scheduled → writing (→ dirty)`): un pedido durante `writing` marca `dirty` y se toma una copia nueva al terminar; cada promesa se resuelve con la primera escritura cuya copia es posterior al pedido; la copia se toma con `postMessage(g)` en un solo paso síncrono, nunca dentro de un `advanceDay`.
- [ ] El worker hace `JSON.stringify`, `CompressionStream('gzip')` (sin él, `codec: 'json'`) y la escritura; `new Worker(…)` va en `try/catch` y `worker.onerror` también pasa al modo en hilo con las mismas funciones; `{ t: 'fault' }` existe solo con `import.meta.env.DEV`; `requestSave` devuelve `false` y deja `lastSaveError` si falla y `true` en el primer guardado bueno siguiente.
- [ ] IndexedDB `technical-area` v2 (`meta`, `blob`, `head`; `saves` queda), abierta con número de versión solo por `initSaves()` en el hilo principal antes de crear el worker; anillo `a0`-`a2`: se escribe la ranura más vieja y se mueve `head.autoHead` en la misma transacción `readwrite` (`durability: 'strict'` en esa transacción); nunca se sobrescribe la ranura a la que apunta `head`; `requestSave(g, 'new')` escribe `a0`, borra `a1` y `a2` y mueve el puntero en una sola transacción, `deleteSave` de `Start.tsx:33` se va y "Firmar contrato" conserva su confirmación de reemplazo y pide `navigator.storage.persist()` una vez.
- [ ] `loadSave(id?, { recover })` lee la cabeza, y si no descomprime, no parsea o no migra prueba la copia anterior por `seq` y avisa "Cargamos la copia anterior del {fecha}"; `listSaves()` devuelve las 3 copias, la más nueva primero; la pantalla de inicio lee solo `meta`/`head` para "Continuar partida" y el `blob` se baja al hacer clic o en reposo; `blockSaves(reason)` cancela el `idle` y descarta `dirty`, todo pedido nuevo se resuelve en `false` sin escribir y sin el aviso de guardado fallido, `unblockSaves()` lo levanta y lo llama `loadSave` con `recover: true`; `savesBlocked()` y `getLastSaveError()` exportados.
- [ ] Migración de `'auto'`: al arrancar, si hay `saves/'auto'` y el anillo está vacío se migra como `a0` (por `migrateGame`, historia 005); `saves` se borra cuando el anillo tiene sus 3 copias; la bandera de contaminación local de la historia 002 pasa a `blockSaves`. Tests existentes adaptados al formato nuevo: `tests/ui/guardado.cjs` (con `{ t: 'fault', kind: 'quota' }` → `false` con aviso, el siguiente `true`; con `Worker` roto guarda en hilo), `tests/ui/vestuario.cjs:489`, `tests/perf/load-time.cjs:31`, `memory-loaded.cjs:13`, `save-bench.cjs:24`, `save-direct.cjs:12/19`; y `tests/ui/guardado-copias.cjs` (nuevo: casos a, b, c, f, h, i, j, k del ADR).
- [ ] Presupuesto de guardado medido antes y después: desktop (`node tests/perf/save-bench.cjs http://localhost:4321/ desktop g-s3.json 12`) ninguna tarea de guardado > 50 ms y clic `Continuar` → 2 cuadros ≤ 50 ms de mediana; CPU 4× sobre 14 días de `Continuar` ≤ 50 ms de hilo de guardado por día en promedio, ninguna tarea > 150 ms y clic → 2 cuadros ≤ 100 ms de mediana; `save-direct.cjs … cpu4 g-s3.json 12`: el hilo principal no ejecuta `JSON.stringify` ni gzip; `load-time.cjs … mobile4g 10 g-s1.json`: "Continuar partida" ≤ 1,5 s.
- [ ] `npm run build` y `npm run test:engine` pasan; pasan `tests/ui/bandeja.cjs`, `mercado.cjs`, `vestuario.cjs` y `guardado.cjs` (reescrito).

---

## Implementation Notes

*Derived from ADR-0002 Implementation Guidelines:*

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
- Los atajos de falla del worker (`t: 'fault'`) deben existir solo con `import.meta.env.DEV`.
- Pedir `navigator.storage.persist()` una vez, en el gesto de "Firmar contrato".
- Riesgos del ADR: pestaña vieja en v1 bloquea la actualización (`onversionchange`/`onblocked`); el clonado con CPU 4× puede pasar de 150 ms (si no alcanza, subir `SAVE_EVERY_DAYS`); `saves/'auto'` se conserva hasta tener 3 copias nuevas.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005 (`story-005-formato-7-historial.md`): `migrateGame`, `foldHistory` y `GAME_VERSION`.
- Story 007 (`story-007-exportar-importar.md`): `exportSave`/`importSave` y los casos d, e y g de `guardado-copias.cjs`.
- Story 008 (`story-008-recuperacion-completa.md`): la pantalla de recuperación que usa `blockSaves`/`loadSave(recover)`.
- Story 004 (`story-004-paginas-datos-fuentes.md`): `idle.ts` si todavía no existe (se comparte).

---

## Files

- `src/save/types.ts`, `src/save/idb.ts`, `src/save/format.ts`, `src/save/index.ts`, `src/save/save.worker.ts` (nuevos)
- `src/store.ts`, `src/idle.ts`
- `src/ui/App.tsx`, `src/ui/Start.tsx`, `src/ui/Home.tsx`, `src/ui/Locker.tsx`, `src/ui/PlayerTable.tsx`, `src/ui/MatchView.tsx`
- `src/errors.ts` (bandera de contaminación → `blockSaves`)
- `tests/ui/guardado.cjs`, `tests/ui/vestuario.cjs`, `tests/ui/guardado-copias.cjs` (nuevo)
- `tests/perf/load-time.cjs`, `tests/perf/memory-loaded.cjs`, `tests/perf/save-bench.cjs`, `tests/perf/save-direct.cjs`

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

- Depends on: `production/epics/base-tecnica/story-005-formato-7-historial.md`
- Unlocks: `production/epics/base-tecnica/story-007-exportar-importar.md`, `production/epics/base-tecnica/story-008-recuperacion-completa.md`
