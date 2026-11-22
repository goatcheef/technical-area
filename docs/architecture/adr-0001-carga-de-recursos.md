# ADR-0001: Carga de escudos y datos fuera del paquete principal

## Status
Proposed

## Date
2026-11-22

## Last Verified
2026-11-22

## Decision Makers
usuario (dueño del proyecto) y technical-director

## Summary
La descarga inicial del juego pesa 3,06 MB brotli (2,0× el presupuesto de 1,5 MB) porque los 102 escudos viajan como PNG en base64 dentro del único chunk de JS, y en un Android de gama media con 4G la pantalla de inicio tarda 3,43 s (presupuesto 3 s). Se decide servir cada escudo como archivo WebP propio (64 y 128 px, generados en el build desde `crests.json`, `<img loading="lazy" decoding="async">` con caché HTTP), partir el código por pantalla con `React.lazy`, cargar `db.json` como chunk propio y alojar las fuentes en el propio sitio.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web: React 19.3.1 + TypeScript 7.0.2 + Vite 8.3.8 (Rolldown), @vitejs/plugin-react 6.3.0 (verificado en `node_modules`); sin motor de juego |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | LOW: plataforma web estándar (`import()` dinámico, `React.lazy`, `<img loading="lazy">`, `srcset`/`sizes`, caché HTTP, `@font-face` con `font-display`, `<link rel="preload">`) |
| **References Consulted** | ninguna (no hay `docs/engine-reference/` para Web). Documentación de la herramienta Artifact (vía el usuario, 2026-11-22): artefactos de varios archivos, hasta 255 por publicación |
| **Post-Cutoff APIs Used** | Ninguna. Verificado por el lead-programmer en Vite 8.3.8: `import.meta.glob` con `query: '?url'`, `import: 'default'`, `eager: true` da URLs con hash; `build.assetsInlineLimit` como función `(filePath, content) => boolean \| undefined` con `false` deja 0 `data:image` en los JS; `<link rel="preload" as="font">` en `index.html` se reescribe con hash; `import()` de `db.json` anda en `tsx` (`default` y claves con nombre) |
| **Verification Required** | (1) `loading="lazy"` dentro del contenedor desplazable `.main` en Firefox y Safari 16.4+ (en Chromium anda: usa el recorte del ancestro). (2) WebP con transparencia en Safari 14+ (101 PNG con alfa, un JPEG). (3) En el artefacto de claude.ai publicado con varios archivos: rutas relativas (`base: './'`), `import()` dinámico de chunks, tipos MIME de `.webp`, `.woff2` y `.js`, cabeceras de caché, y **CORS**: Vite emite `<script type="module" crossorigin>` y `<link as="font" crossorigin>`, que fallan si el anfitrión sirve desde un origen opaco (`sandbox` sin `allow-same-origin`) o sin `Access-Control-Allow-Origin` en `.js`, `.woff2` y `.webp`. (4) El artefacto admite hasta 255 archivos por publicación (documentación de Artifact, vía el usuario): este ADR publica ~230 (~204 escudos + ~20 chunks + 2 fuentes + `index.html` y CSS); `tests/perf/sizes.mjs` cuenta los archivos de `dist/`. (5) El "¡GOOOL!" del lienzo (`Pitch2D.tsx:179`) se dibuja con Barlow Condensed ya cargada (`document.fonts.load` antes del primer dibujo). (6) Volver a hacer `import()` de un chunk que falló: en Chromium 153 sigue fallando aunque el servidor ya responda (el mapa de módulos recuerda el fallo); no se asume que en Firefox o Safari funcione. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | None |
| **Blocks** | None (no hay épicas en `production/`); es requisito para cumplir los presupuestos de descarga y tiempo hasta poder jugar de `technical-preferences.md` |
| **Ordering Note** | Las páginas diferidas pueden fallar al bajar su chunk: las fronteras de error de ADR-0003 tienen que estar antes o en el mismo cambio que `React.lazy`, si no un chunk caído deja la pantalla en blanco. Los escudos pueden ir primero y solos (hotspot 1, 88 % del peso). Orden en `main.tsx`: `installGlobalHandlers` (ADR-0003) → `createRoot` con sus opciones → `loadDb()` e `initSaves()` (ADR-0002) en paralelo → frontera raíz con el cascarón de carga. |

## Context

### Problem Statement
`src/ui/common.tsx:2,12` importa `src/data/crests.json` (102 escudos PNG de 250×250 en base64, 3,66 MB crudos, 2,70 MB brotli) y `src/engine/game.ts:2` importa `src/data/db.json` (0,86 MB crudos, 0,13 MB brotli): todo queda en un solo chunk de 5,3 MB que se baja, analiza y ejecuta antes del primer dibujo. Medido en `production/polish/full-report-2026-11-19.md` (hotspots 1 y 7): FCP 3,49 s y pantalla de inicio lista 3,43 s en mobile4g; sin escudos, 0,85 s. Las fuentes salen de Google Fonts con una hoja de estilos que bloquea el render (`index.html:7`, no medido). Hay que decidirlo ahora porque `technical-preferences.md` ya dice "los escudos y los datos se cargan aparte" y hoy no se cumple.

### Constraints
- `Badge({ club, size })` conserva su API (75 usos en `src/ui/`) y el escudo de reemplazo (colores y código desde 40 px) cuando falta la imagen.
- `src/engine/` sigue siendo TypeScript puro sin React; `npm run sim`, `npm run test:engine` y los scripts de `tests/perf/` corren en Node.
- Escudos reales (decisión del usuario); no fotos ni datos de terceros nuevos.
- Se publica como artefacto de claude.ai de varios archivos (`files` de la herramienta Artifact); ya no hace falta un solo archivo.
- Proyecto de una persona: nada de infraestructura (CDN, servidor propio, service worker) en este cambio.

### Requirements
- Descarga inicial ≤ 1,5 MB comprimidos antes de la primera pantalla.
- Tiempo hasta poder jugar ≤ 3 s en el perfil mobile4g de `tests/perf/load-time.cjs`.
- Escudos nítidos de 16 a 96 px (tamaños usados hoy) con densidad 1× y 2×.
- `npm run db` y los scripts de escudos (`tools/fetch_crests.py`, `tools/import_extra.py`) siguen siendo la fuente; ningún paso manual nuevo.

## Decision

- **Escudos como archivos**: `tools/build-crests.ts` (`npm run crests`, corre en `predev` y `prebuild`, se saltea si el sello coincide) lee `data/crests.json` y escribe `src/assets/crests/<id>-64.webp` y `<id>-128.webp`. Motivo: Vite les pone hash y se cachean como inmutables.
- **`crests.json` sale de `src/`** y pasa a `data/crests.json` (los dos scripts de Python escriben ahí). Motivo: que nadie pueda volver a importarlo al bundle.
- **`Badge` con `<img loading="lazy" decoding="async">`**, `srcSet` 64w/128w, `sizes={size + 'px'}` y `width`/`height` fijos. Motivo: el navegador elige el archivo por densidad sin cambiar la API, y el lugar reservado evita saltos de diseño.
- **Reemplazo**: sin entrada en el mapa, o con `onError`, `Badge` dibuja el escudo de reemplazo de hoy. Motivo: los 7 clubes sin escudo y una red caída se ven igual que ahora.
- **Código por pantalla**: cada página de `App.tsx` (Inicio, Plantel, Tácticas, Mercado, Bandeja, Partido y flujo posterior, Centro de datos, Tablas/Estadísticas, Vestuario, Semana, fichas de jugador y club) pasa a `lazyPage(() => import('./X').then(m => ({ default: m.X })))` con `Suspense`; el armazón (`App`, `TopNav`, `Nav`, `common`, `msg`, `Start`, `Guide`) queda en el chunk principal. Motivo: el chunk principal solo lleva lo que dibuja la primera pantalla; las páginas siguen con sus exportaciones con nombre.
- **`lazyPage` es un envoltorio normal, no un `LazyExoticComponent`**: devuelve un `ComponentType` con `retry()`; `retry()` guarda (`requestSave(g, 'menu')`, ADR-0002) y hace `location.reload()`. Motivo: un `lazy` rechazado queda rechazado y además el navegador recuerda el fallo del módulo (medido en Chromium 153); recargar es lo único que funciona en los tres navegadores, y pasa seguido al republicar el artefacto (los chunks viejos con hash desaparecen). Es el mismo tipo que usa ADR-0003.
- **Precarga en reposo**: después del primer dibujo, `prefetchPages()` pide todos los chunks de pantallas con `idle()` (Inicio, Plantel, Tácticas y Bandeja primero), cada uno con `.catch(() => {})`. Motivo: cambiar de pantalla no espera red y el juego sigue andando sin conexión una vez cargado (salvo escudos no vistos); un fallo en reposo no debe volverse un `unhandledrejection`.
- **`idle(fn, { timeout, fallbackMs })`** (`src/idle.ts`, compartido con ADR-0002): `requestIdleCallback` si existe y, si no (Safari/iOS), `setTimeout(fn, fallbackMs)`; la precarga usa `fallbackMs: 200`. Motivo: Safari no tiene `requestIdleCallback`.
- **`db.json` como chunk propio**: `loadDb()` hace `import('../data/db.json')`; `main.tsx` lo dispara antes de montar React, en paralelo con `initSaves()`. Toda lectura de la base sale del nivel de módulo (`game.ts:15-16` y cualquier otra constante derivada) y pasa por `getDb()`. Motivo: sigue siendo un módulo de TS (Node lo lee igual) y no bloquea el análisis del chunk principal. Se acepta la cascada (el chunk dinámico arranca después del principal, ~70 ms en mobile4g): no se puede poner un `modulepreload` fijo por el hash.
- **Cascarón de carga**: `index.html` trae dentro de `#root` un "Cargando…" con `role="status"` y estilos en línea, que React reemplaza al montar; la frontera raíz muestra lo mismo hasta que `loadDb()` e `initSaves()` terminan. Motivo: no hay pantalla en blanco mientras baja la base.
- **Fuentes propias**: Plus Jakarta Sans variable (latín, que cubre á é í ó ú ñ ü ¿ ¡) en `woff2` con `font-display: swap` y `<link rel="preload">`; Barlow Condensed 700 sin precarga (solo la usa el lienzo del partido). Licencia OFL copiada junto a los archivos. Motivo: se va la hoja de estilos externa que bloquea el render.

### Architecture Diagram

```
 build (npm run build)
 data/crests.json ──tools/build-crests.ts──► src/assets/crests/<id>-{64,128}.webp ──Vite──► dist/assets/<id>-64-<hash>.webp
 src/data/db.json ──import() dinámico────────────────────────────────────────────────Vite──► dist/assets/db-<hash>.js
 src/ui/*Page ─────lazyPage()───────────────────────────────────────────────────────Vite──► dist/assets/<Pantalla>-<hash>.js
 src/assets/fonts/*.woff2 ──────────────────────────────────────────────────────────Vite──► dist/assets/*.woff2

 navegador (en el tiempo)
 index.html (cascarón "Cargando…") ─► CSS + preload fuente ─► main.js (React + armazón + Start + mapa de escudos ~8 KB)
     installGlobalHandlers ─► createRoot ─┬─► loadDb()    ─► db.js (0,13 MB, un viaje después de main.js) ┐ en paralelo
                                          ├─► initSaves() (ADR-0002)                                       ┘
                                          ├─► Start: <Badge> ─► <img lazy> ─► escudos visibles (~30)
                                          └─► idle(): prefetchPages() ─► chunks de pantallas (.catch)
 chunk que no baja ─► frontera de página (ADR-0003) ─► "Reintentar" = retry(): guardar + location.reload()
```

### Key Interfaces

```ts
// src/ui/crests.ts (nuevo): el único lugar que sabe dónde están los escudos
const URLS = import.meta.glob('../assets/crests/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>
export function crestSrc(clubId: number): { src: string; srcSet: string } | null   // null: no hay escudo (reemplazo)

// src/ui/common.tsx: firma sin cambios
export function Badge({ club, size = 28 }: { club: ClubLike; size?: number }): JSX.Element

// src/engine/db.ts (nuevo, puro): la base deja de ser un import estático
export interface Db { start: string; dbVersion?: number; clubs: DbClub[]; players: DbPlayer[] }
export function loadDb(): Promise<Db>      // import('../data/db.json'), memoizada (una sola descarga)
export function getDb(): Db                // síncrona; lanza DbNotLoadedError si loadDb no terminó
export function dbClubs(): DbClub[]        // reemplaza a DB_CLUBS (Start.tsx)
// newGame, refreshDb y dbHash leen getDb(); Node (sim, tests de motor y de rendimiento) hace `await loadDb()` primero

// src/idle.ts (nuevo, compartido con ADR-0002)
export function idle(fn: () => void, o: { timeout: number; fallbackMs: number }): () => void   // devuelve cancelar

// src/ui/pages.ts (nuevo): el mismo tipo que usa ADR-0003
export type LazyPage = ComponentType & { retry(): void }   // retry: requestSave(g, 'menu') y location.reload()
export function lazyPage(load: () => Promise<{ default: ComponentType }>): LazyPage
export const PAGE_COMPONENTS: Record<string, LazyPage>   // una entrada por página
export function prefetchPages(): void      // idle(), Inicio primero, cada import() con .catch(() => {})

// tools/build-crests.ts (nuevo, devDependency `sharp`)
//   entrada data/crests.json → salida src/assets/crests/<id>-{64,128}.webp + src/assets/crests/.stamp (hash de la entrada)
```

### Implementation Guidelines
- Ningún archivo de `src/` debe importar `crests.json` ni contener imágenes en base64; `Badge` debe obtener la imagen solo de `crestSrc`.
- `vite.config.ts` debe excluir `src/assets/crests/` del inlineado (`build.assetsInlineLimit` como función que devuelve `false` para esa carpeta).
- `Badge` debe conservar `className="crest"`, `data-cid`, `alt={club.short}`, `width`/`height` y el escudo de reemplazo con sus reglas de tamaño; no debe pintar un relleno provisorio mientras carga.
- Todo `<img>` de escudo debe llevar `loading="lazy"` y `decoding="async"`; no se agregan props a `Badge`.
- Los WebP deben generarse con alfa (calidad 85, alfa sin pérdida) a 64 y 128 px de lado, centrados en un cuadrado transparente.
- `src/engine/` no debe hacer `fetch` ni tocar el DOM: la base llega con `import()` dinámico, que Node y Vite resuelven igual.
- Ningún módulo debe leer la base en el nivel de módulo; toda lectura debe pasar por `getDb()` dentro de una función. `App` no monta `Start` hasta que `loadDb()` se resuelva; los scripts de Node la esperan antes de `newGame`. `tools/check-contrast.mjs` y `tools/build-db.ts` leen el JSON con `fs` y no cambian.
- Un fallo de `loadDb()` debe llegar a la frontera raíz de ADR-0003, no quedar como promesa rechazada sin atender.
- Cada página nueva debe entrar por `PAGE_COMPONENTS` con `lazyPage` salvo que sea parte del armazón; el `Suspense` de página debe reservar el alto del área para no saltar.
- `lazyPage` nunca debe intentar recuperar un chunk volviendo a hacer `import()`: `retry()` siempre guarda y recarga.
- Todo `import()` de precarga debe llevar `.catch(() => {})`.
- Nada debe llamar a `requestIdleCallback` directamente: se usa `idle()`.
- `index.html` no debe pedir recursos de otros dominios y debe traer el cascarón de carga con `role="status"`.
- Publicación: `npm run build` y se suben todos los archivos de `dist/` con su ruta relativa como artefacto de varios archivos (`index.html` de entrada); no se arma un archivo único.

## Alternatives Considered

- **Un paquete de escudos bajado después del primer dibujo** (un JSON o sprite con los 102): menos pedidos, pero baja ~0,7 MB que la pantalla no usa y un escudo cambiado invalida todo. Rechazada por el usuario.
- **Escudos más chicos, todavía en el bundle** (WebP 64 px en base64): un solo archivo y sin pedidos, pero el peso sigue en la ruta crítica (~0,25-0,35 MB estimados) y crece con cada club. Rechazada por el usuario.
- **Reintentar el chunk con un `import()` nuevo (con `?t=` o un `lazy` nuevo)**: sin recargar, pero el mapa de módulos recuerda el fallo y una URL con consulta rompe el grafo de módulos compartidos. Rechazada tras la validación.
- **Service worker con caché sin conexión**: juego completo sin red, pero suma una capa de versiones y caché difícil de depurar en el artefacto. Postergada (punto abierto), no rechazada.

## Consequences

### Positive
- La descarga inicial baja de 3,06 MB a ~0,5 MB estimados (35 % del presupuesto) y la pantalla de inicio de 3,43 s a ~1,0-1,4 s en mobile4g (con la cascada de `db.js`).
- Un escudo nuevo o corregido cambia dos archivos de ~2-5 KB, no el chunk principal.
- Cada imagen decodificada ocupa 64 KB (128²×4) en vez de 250 KB.
- Cambiar una pantalla no invalida la caché de las demás.
- Sin dependencia de Google en tiempo de ejecución.

### Negative
- Más archivos que publicar (~230) y más pedidos de red; el primer dibujo de una lista larga muestra huecos un instante.
- Sin conexión, los escudos que no se vieron antes salen con el reemplazo (hoy se ven todos).
- `getDb()` agrega un estado "base no cargada" que antes no existía; los scripts de Node y los tests de motor cambian una línea.
- Un chunk que no baja obliga a recargar la página (con guardado previo).
- `sharp` entra como devDependency (binario nativo, solo herramientas).
- `swap` trae un parpadeo de fuente (FOUT) la primera vez.

## Risks
- **El artefacto pasa el tope de 255 archivos** (hoy ~230: 25 de margen, unos 12 clubes nuevos con escudo) **o no sirve `.webp`**: mitigación, un sprite por tamaño (`crests-64.webp`, `crests-128.webp`) dibujado por `Badge` con `background-position`, sin cambiar su API.
- **El artefacto sirve desde un origen opaco o sin CORS** (`crossorigin` en módulos y fuentes): mitigación, verificación 3 antes de publicar; si falla, quitar `crossorigin` de las fuentes y pedir al anfitrión `allow-same-origin` (sin eso tampoco hay guardado, ADR-0002).
- **Vite inlinea los de 64 px**: mitigación, la exclusión de `assetsInlineLimit` y el control en `tests/perf/sizes.mjs`.
- **Escudos borrosos o con halo al bajar de 250 a 64 px**: mitigación, revisión visual en las capturas de `tests/ui/*.cjs` y ajuste de calidad por escudo en el script.
- **Las capturas de `tests/ui/*.cjs` salen con huecos** porque los escudos cargan en diferido: mitigación, los tests esperan `img.complete` de los `img.crest` visibles antes de cada captura.
- **Al republicar, un `index.html` cacheado pide chunks que ya no existen**: mitigación, la frontera de página ofrece "Reintentar" (guardar y recargar).
- **Safari sin `requestIdleCallback`**: mitigación, `idle()` con `setTimeout` de respaldo.
- **La cascada de `db.js` alarga el arranque más de lo estimado**: mitigación, medirlo con `load-time.cjs`; si pasa de 1,5 s, volver a poner `db.json` en el chunk principal (+0,13 MB, dentro del presupuesto).
- **Una pantalla diferida tarda en celular la primera vez que se abre antes de terminar la precarga**: mitigación, la precarga empieza por Inicio, Plantel, Tácticas y Bandeja.
- **`newGame` llamado sin base**: mitigación, `getDb()` lanza un error con nombre que ADR-0003 registra; nunca devuelve un arreglo vacío en silencio.
- **Scripts que dependen de `src/data/crests.json`**: `tests/perf/sizes.mjs:10` lo lee y `tests/perf/vite.stub.config.mjs` lo reemplaza; los dos se actualizan en el mismo cambio (Migration Plan 7).

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| base-de-datos.md | 28. "Escudo: `Badge` (`common.tsx:31-36`) usa `crests.json[club.id]`; si no hay, un círculo con los colores del club y las tres primeras letras del código." | El reemplazo se conserva igual y también cubre una imagen que no carga; la imagen sale de `crestSrc` en vez de `crests.json` (ver sincronización abajo). |
| base-de-datos.md | Tabla de casos borde: "Escudo faltante \| Círculo con colores y código (único desde el 2026-11-14) \| Fallback" | Mismo reemplazo; los 7 clubes sin escudo no tienen archivo y `crestSrc` devuelve `null`. |
| base-de-datos.md | 2. "`python3 tools/fetch_crests.py` → `data/crests/<id>.png` y `src/data/crests.json` (miniatura de 128 px del escudo de la ficha del club, como data URI; el id es la posición en `clubs_raw.json`)." | La salida pasa a `data/crests.json`; `tools/build-crests.ts` la convierte en WebP de 64 y 128 px. Los ids no cambian. |
| base-de-datos.md | "**Performance**: `npm run db` es un paso fuera del juego; `newGame` con 3208 jugadores dentro de la carga inicial sin bloqueo perceptible." | `db.json` baja como chunk propio y ya no alarga el análisis del chunk principal; `newGame` no cambia. |
| base-de-datos.md | "`tools/build-db.ts` (`npm run db`) … escribe `src/data/db.json`, que el juego importa al crear una partida." | El juego lo importa de forma dinámica (`loadDb()`) al arrancar; `npm run db` no cambia. |
| base-de-datos.md | Requisito de interfaz: "Clubes por categoría, ordenados por reputación, con escudo y presupuesto \| `Start.tsx:27-29`, `113-116` (desde `DB_CLUBS`) \| Al crear partida" | `Start` no se monta hasta que `loadDb()` termina y lee `dbClubs()`; los escudos de la lista cargan en diferido. |
| game-concept.md | Pilar 1 vía `base-de-datos.md`: "nombres, clubes y escudos reales" | Los mismos escudos, a menor tamaño de archivo; ninguno se reemplaza por uno genérico salvo que falle la imagen. |
| temporada-y-ligas.md, economia-y-dirigencia.md | Ninguno aplica: no tienen requisitos de carga, descarga ni escudos. | — |

GDD sync (hecha en el mismo cambio): `base-de-datos.md` usaba nombres que este ADR cambia: `crests.json[club.id]` → `crestSrc(club.id)` (regla 28 y la fila "Club con escudo \| Miniatura PNG/JPEG en `Badge`"), `src/data/crests.json` → `data/crests.json` (paso 2 y paso 6 de `import_extra.py`), `DB_CLUBS` → `dbClubs()` (requisito de interfaz de `Start.tsx`), "el juego importa" → `loadDb()`.

## Performance Implications
- **CPU**: el chunk principal pasa de 5,32 MB a ~0,4 MB crudos; la tarea larga del arranque baja de 393 ms a ~260 ms con CPU 4× (medido sin escudos). Decodificar escudos ocurre fuera de la ruta crítica (`decoding="async"`).
- **Memoria**: sin los 3,66 MB de base64 en el código fuente retenido; cada escudo decodificado pasa de 250 KB a 64 KB (128 px) o 16 KB (64 px), ~−74 % en las imágenes. Tope de 250 MB: sin riesgo nuevo.
- **Load Time**: descarga antes de la primera pantalla ≈ 0,15-0,2 MB de chunk principal + 0,13 MB de `db` + 0,02 MB de CSS + ~0,05 MB de fuente + ~0,1 MB de escudos visibles ≈ 0,5 MB (presupuesto 1,5 MB; ESTIMADO, se mide con `sizes.mjs`). Pantalla de inicio lista: 0,85 s medido sin escudos; con la cascada de `db.js` (~70 ms más un viaje), fuente propia y escudos en diferido se espera 1,0-1,4 s (presupuesto 3 s; ESTIMADO).
- **Network**: todos los escudos juntos pesan ~0,6 MB (estimado desde los 0,71 MB medidos a 168 px), pero cada pantalla pide solo los que muestra, una vez por versión (hash en el nombre). Precarga de chunks en reposo: ~0,1 MB más después del primer dibujo.

## Migration Plan
1. Mover `src/data/crests.json` a `data/crests.json` y actualizar `tools/fetch_crests.py` y `tools/import_extra.py`.
2. Agregar `sharp` (devDependency), `tools/build-crests.ts`, `npm run crests`, `predev`/`prebuild` y la exclusión de inlineado; `src/assets/crests/` en `.gitignore`.
3. `src/ui/crests.ts` y el cambio interno de `Badge`; los tests de capturas esperan `img.complete`; correr `tests/ui/*.cjs` y revisar capturas.
4. `src/engine/db.ts`; sacar toda lectura de la base del nivel de módulo en `game.ts`; `Start.tsx`, `tools/sim-season.ts`, `tests/engine/*.ts`, `tests/perf/engine-bench.ts` y `engine-micro.ts` esperan `loadDb()`. Correr `npm run sim -- 3` con las semillas 12345, 777 y otra: los resultados tienen que ser idénticos (la base no cambia).
5. Cascarón de carga en `index.html`; fuentes en `src/assets/fonts/` con `@font-face` en `styles.css`, `preload` en `index.html`, sacar Google Fonts.
6. `src/idle.ts`; fronteras de ADR-0003 y después `lazyPage` por página (con `.then(m => ({ default: m.X }))`) y `prefetchPages()`.
7. Actualizar `tests/perf/sizes.mjs` (deja de leer `src/data/crests.json`) y `tests/perf/vite.stub.config.mjs` (el stub de escudos ya no hace falta), y medir.
8. Actualizar `base-de-datos.md`, `CLAUDE.md` y la nota de `technical-preferences.md`.

## Validation Criteria
- `npm run build && node tests/perf/sizes.mjs dist`: lo que pide `index.html` (chunk principal + CSS + fuente precargada) ≤ 0,5 MB brotli, y con `db` ≤ 0,65 MB; ningún `.js` contiene `data:image/`; `dist/` tiene ≤ 255 archivos.
- `node tests/perf/load-time.cjs http://localhost:4320/ mobile4g 10` (con `serve-compressed.mjs`): pantalla de inicio lista ≤ 1,5 s de mediana y FCP ≤ 1,5 s (presupuesto 3 s); el cascarón "Cargando…" aparece antes de que termine `db.js`.
- Lo mismo con una partida guardada (4.º argumento, `g-s1.json`; el script ya sembrado como pide ADR-0002): botón "Continuar partida" ≤ 2 s.
- `node tests/perf/memory-loaded.cjs`: RSS con guardado cargado y 6 pantallas ≤ 190 MB (hoy 186-209).
- `node tests/perf/memory-screens.cjs … desktop 5`: cambio de pantalla dentro de +10 ms de las cifras del informe del 2026-11-19 con la precarga terminada.
- `tests/ui/bandeja.cjs`, `mercado.cjs` y `vestuario.cjs` pasan, esperando `img.complete` antes de las capturas; en las capturas los escudos se ven nítidos a 18-96 px. `guardado.cjs` pasa sin cambios hasta que entre ADR-0002; después, su versión reescrita.
- Prueba nueva: con `page.route` bloqueando `assets/*.webp`, cada `Badge` muestra el reemplazo con colores y código desde 40 px, sin errores en la consola ni guardado bloqueado (las fallas de `<img>` no son errores fatales, ADR-0003).
- Prueba nueva: con `page.route` devolviendo 404 para un chunk de pantalla durante la precarga, no aparece ningún `unhandledrejection` en el registro.
- `npm run sim -- 3 12345` da exactamente las mismas métricas antes y después.
- Estuvo bien si el usuario abre el artefacto en su celular con 4G y llega a elegir club en menos de 2 s.

## Related
- ADR-0003 (fronteras de error: cubren el chunk que no carga; comparte `LazyPage`).
- ADR-0002 (`initSaves()` corre en paralelo con `loadDb()`; comparte `idle()`; `retry()` usa `requestSave`).
- `production/polish/full-report-2026-11-19.md` (hotspots 1 y 7, recomendación 1).
- `design/gdd/base-de-datos.md`, `.claude/docs/technical-preferences.md` (Performance Budgets).
- Decisiones del usuario (2026-11-22): sin service worker por ahora; `sharp` como devDependency con los WebP generados fuera de git; límite de 255 archivos por publicación del artefacto.
- Revisión tras la validación (5.5): `lazyPage` pasa a envoltorio `LazyPage = ComponentType & { retry(): void }` y `retry` guarda y recarga en vez de reimportar (B1-1, B1-2); `prefetchPages` con `.catch`; `idle()` compartido con respaldo para Safari; versiones verificadas en Engine Compatibility; CORS y origen opaco en la verificación; cascada de `db.js` medida en la estimación; cascarón de carga; exportaciones con nombre; lecturas de la base fuera del nivel de módulo; `sizes.mjs` y `img.complete` en los tests; orden de `main.tsx`.
