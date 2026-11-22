# Story 004: Páginas por pantalla, datos aparte y fuentes propias

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-001`, `TR-base-tecnica-002`
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0001: Carga de escudos y datos fuera del paquete principal (también ADR-0003 para `LazyPage.retry`)
**ADR Decision Summary**: Cada página pasa a `lazyPage` con `Suspense`, `db.json` se carga con `loadDb()`/`getDb()` como chunk propio, las fuentes se alojan en el sitio y `index.html` trae un cascarón "Cargando…"; `retry()` guarda y recarga, nunca vuelve a hacer `import()`.
**ADR Version**: 2026-11-22 (ADR-0001 y ADR-0003)

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Verificar (ADR-0001): (3) en el artefacto de claude.ai con varios archivos: rutas relativas (`base: './'`), `import()` dinámico de chunks, tipos MIME de `.webp`/`.woff2`/`.js`, cabeceras de caché y CORS (`<script type="module" crossorigin>` y `<link as="font" crossorigin>` fallan con origen opaco o sin `Access-Control-Allow-Origin`); (4) hasta 255 archivos por publicación (~230 previstos); (5) `document.fonts.load` de Barlow Condensed antes del primer dibujo del "¡GOOOL!" (`Pitch2D.tsx:179`); (6) en Chromium 153 un `import()` fallido sigue fallando aunque el servidor vuelva: no se asume que en Firefox o Safari funcione.

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0001)*:
- Required: `loadDb()` una vez y después `getDb()`/`dbClubs()` síncronas; `idle()` de `src/idle.ts`; `PAGE_COMPONENTS` con `lazyPage`; `retry()` = guardar y recargar.
- Forbidden: `module_level_db_read`, `chunk_reimport_retry`, `direct_request_idle_callback`, `cross_origin_runtime_resources`.
- Guardrail: `initial-download` ≤ 1,5 MB comprimido (objetivo ADR ≤ 0,5 MB sin db, ≤ 0,65 MB con db); `time-to-playable` 3000 ms en Mobile (objetivo ADR ≤ 1,5 s); `dist/` ≤ 255 archivos.

---

## Acceptance Criteria

*From ADR-0001 (Decision, Validation Criteria) and TR-base-tecnica-001/002:*

- [ ] `src/idle.ts` exporta `idle(fn, { timeout, fallbackMs })` (`requestIdleCallback` o `setTimeout`, devuelve cancelar); nada llama a `requestIdleCallback` directamente. `src/ui/pages.ts` exporta `lazyPage(load)` (un `ComponentType & { retry() }`, no un `LazyExoticComponent`), `PAGE_COMPONENTS` con una entrada por página (Inicio, Plantel, Tácticas, Mercado, Bandeja, Partido y flujo posterior, Centro de datos, Tablas/Estadísticas, Vestuario, Semana, fichas de jugador y club) y `prefetchPages()`; el armazón (`App`, `TopNav`, `Nav`, `common`, `msg`, `Start`, `Guide`) queda en el chunk principal y el `Suspense` de página reserva el alto del área.
- [ ] `retry()` guarda y recarga con `reloadSafely` (historia 002) y nunca vuelve a hacer `import()`; `prefetchPages()` pide todos los chunks con `idle()` (Inicio, Plantel, Tácticas y Bandeja primero, `fallbackMs: 200`) con `.catch(() => {})` en cada `import()`: con `page.route` devolviendo 404 para un chunk durante la precarga no aparece ningún `unhandledrejection` en el registro.
- [ ] `src/engine/db.ts` exporta `loadDb()` (`import('../data/db.json')`, memoizada), `getDb()` (lanza `DbNotLoadedError` antes de `loadDb`) y `dbClubs()`; ningún módulo lee la base en el nivel de módulo (`game.ts:15-16` y las constantes derivadas pasan por `getDb()` dentro de funciones); `newGame`, `refreshDb` y `dbHash` leen `getDb()`; `npm run sim`, `tests/engine/*` y `tests/perf/*` hacen `await loadDb()`; `src/engine/` no hace `fetch` ni toca el DOM.
- [ ] `main.tsx` dispara `loadDb()` antes de montar React (en paralelo con `initSaves()` cuando exista), `App` no monta `Start` hasta que `loadDb()` se resuelve y un fallo de `loadDb()` llega a la frontera raíz de la historia 002.
- [ ] Fuentes propias: Plus Jakarta Sans variable (latín) en `woff2` con `font-display: swap` y `<link rel="preload">`, Barlow Condensed 700 sin precarga, licencia OFL junto a los archivos; `index.html` no pide recursos de otros dominios; el lienzo hace `document.fonts.load` de Barlow Condensed antes del primer dibujo.
- [ ] `index.html` trae dentro de `#root` un "Cargando…" con `role="status"` y estilos en línea que React reemplaza al montar; la frontera raíz muestra lo mismo hasta que `loadDb()` (e `initSaves()`, cuando exista) terminan. *(Pendiente de UX: texto y aspecto finales del cascarón, `/ux-design`.)*
- [ ] Presupuesto de descarga (TR-001): `npm run build && node tests/perf/sizes.mjs dist` da ≤ 0,5 MB brotli para lo que pide `index.html` (chunk principal + CSS + fuente precargada) y ≤ 0,65 MB con `db` (total inicial ≤ 1,5 MB, hoy 3,06 MB); `dist/` tiene ≤ 255 archivos. Se publica como artefacto de varios archivos (`base: './'`, todos los archivos de `dist/` con su ruta relativa, `index.html` de entrada), sin armar un archivo único.
- [ ] Presupuesto de tiempo (TR-002): `node tests/perf/load-time.cjs http://localhost:4320/ mobile4g 10` (con `serve-compressed.mjs`) da pantalla de inicio lista ≤ 3 s de mediana (objetivo del ADR ≤ 1,5 s y FCP ≤ 1,5 s; hoy 3,43 s) y el cascarón aparece antes de que termine `db.js`; con partida guardada (4.º argumento `g-s1.json`) "Continuar partida" ≤ 2 s (hoy 4,2 s). Las cifras antes y después quedan registradas.
- [ ] `node tests/perf/memory-loaded.cjs` da RSS ≤ 190 MB y `memory-screens.cjs … desktop 5` queda dentro de +10 ms de las cifras del informe del 2026-11-19 con la precarga terminada.
- [ ] `npm run sim -- 3 12345` da las mismas métricas antes y después; `npm run build` y `npm run test:engine` pasan; `tests/ui/bandeja.cjs`, `mercado.cjs`, `vestuario.cjs` y `guardado.cjs` pasan.

---

## Implementation Notes

*Derived from ADR-0001 Implementation Guidelines (y ADR-0003 para `retry`):*

- `src/engine/` no debe hacer `fetch` ni tocar el DOM: la base llega con `import()` dinámico, que Node y Vite resuelven igual.
- Ningún módulo debe leer la base en el nivel de módulo; toda lectura debe pasar por `getDb()` dentro de una función. `App` no monta `Start` hasta que `loadDb()` se resuelva; los scripts de Node la esperan antes de `newGame`. `tools/check-contrast.mjs` y `tools/build-db.ts` leen el JSON con `fs` y no cambian.
- Un fallo de `loadDb()` debe llegar a la frontera raíz de ADR-0003, no quedar como promesa rechazada sin atender.
- Cada página nueva debe entrar por `PAGE_COMPONENTS` con `lazyPage` salvo que sea parte del armazón; el `Suspense` de página debe reservar el alto del área para no saltar.
- `lazyPage` nunca debe intentar recuperar un chunk volviendo a hacer `import()`: `retry()` siempre guarda y recarga.
- Todo `import()` de precarga debe llevar `.catch(() => {})`.
- Nada debe llamar a `requestIdleCallback` directamente: se usa `idle()`.
- `index.html` no debe pedir recursos de otros dominios y debe traer el cascarón de carga con `role="status"`.
- Publicación: `npm run build` y se suben todos los archivos de `dist/` con su ruta relativa como artefacto de varios archivos (`index.html` de entrada); no se arma un archivo único.
- Cada página mantiene sus exportaciones con nombre: `lazyPage(() => import('./X').then(m => ({ default: m.X })))`.
- Se acepta la cascada de `db.js` (~70 ms en mobile4g); si el arranque pasa de 1,5 s, el ADR prevé volver a poner `db.json` en el chunk principal (+0,13 MB, dentro del presupuesto).
- Antes de publicar, verificar CORS, MIME y límite de 255 archivos (Engine Notes).

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 003 (`story-003-escudos-como-archivos.md`): escudos como WebP y `crestSrc`.
- Story 002 (`story-002-fronteras-de-error.md`): la frontera raíz y por página.
- Story 008 (`story-008-recuperacion-completa.md`): la pantalla "No se pudo cargar esta pantalla" con "Reintentar".
- Story 006 (`story-006-guardado-en-segundo-plano.md`): `initSaves()` y el guardado en segundo plano.

---

## Files

- `src/idle.ts` (nuevo), `src/ui/pages.ts` (nuevo), `src/engine/db.ts` (nuevo)
- `src/ui/App.tsx`, `src/ui/Start.tsx`, `src/main.tsx`, `src/engine/game.ts`
- `index.html`, `src/styles.css`, `src/assets/fonts/` (woff2 y licencia OFL), `vite.config.ts`
- `tools/sim.ts` (o el script de `npm run sim`), `tests/engine/*.ts`, `tests/perf/*` (`await loadDb()`)
- `tests/perf/sizes.mjs`, `tests/perf/load-time.cjs`
- `tests/ui/paginas.cjs` (nuevo, 404 de chunk en precarga; waived at qa.level minimal)

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

- Depends on: `production/epics/base-tecnica/story-002-fronteras-de-error.md`, `production/epics/base-tecnica/story-003-escudos-como-archivos.md`
- Unlocks: None
