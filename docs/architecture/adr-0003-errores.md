# ADR-0003: Errores sin pantalla en blanco

## Status
Accepted

## Date
2026-11-22

## Last Verified
2026-11-22

## Decision Makers
usuario (dueño del proyecto) y technical-director

## Summary
Hoy no hay ninguna frontera de error (`main.tsx` monta `<App />` sin nada alrededor): una excepción al dibujar deja la pantalla en blanco, y una excepción a mitad de `advanceDay` o de una acción deja el `Game` a medio cambiar y el próximo guardado lo escribe en disco. Se decide una frontera de error por página y una en la raíz, manejadores de `error` y `unhandledrejection`, una pantalla de recuperación en español ("Volver al inicio", "Exportar la partida", "Recargar"), bloquear el guardado tras una excepción del motor y volver a la última copia buena de ADR-0002, y un registro local de los últimos 20 errores visible en Ajustes, sin telemetría.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web: React 19.3.1 + react-dom 19.3.1 + TypeScript 7.0.2 + Vite 8.3.8 (verificado en `node_modules`) |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | LOW: plataforma web estándar y React 19 estable (componentes de clase con `getDerivedStateFromError`/`componentDidCatch`, `createRoot(el, { onCaughtError, onUncaughtError, onRecoverableError })`, eventos `error` y `unhandledrejection`, `localStorage`, `navigator.clipboard.writeText`) |
| **References Consulted** | ninguna (no hay `docs/engine-reference/` para Web) |
| **Post-Cutoff APIs Used** | Ninguna. Verificado por el lead-programmer: firma `onCaughtError(error, errorInfo)` con `errorInfo.componentStack` y `errorBoundary` (`@types/react-dom/client.d.ts`); Vite 8 despacha `vite:preloadError` en `window` antes de relanzar un fallo de precarga; en Chromium 153 un `import()` que falló sigue fallando aunque el servidor vuelva |
| **Verification Required** | (1) React 19.3 llama a `onCaughtError` por cada error que atrapa una frontera y no lo vuelve a tirar a `window`. (2) Un error en un manejador de evento de React llega a `window` `error` con `error` y `stack`. (3) Un `import()` de chunk que falla llega a la frontera de página con un error reconocible en Chromium, Firefox y Safari ("Failed to fetch dynamically imported module", "error loading dynamically imported module", "Importing a module script failed", y el de Vite "Unable to preload CSS for …"). (4) `navigator.clipboard.writeText` dentro del iframe del artefacto (pide `allow="clipboard-write"` en la política de permisos del anfitrión); si rechaza, `textarea` seleccionado + `document.execCommand('copy')`. (5) `ResizeObserver loop completed with undelivered notifications` llega como `error` sin `error.stack` y debe ignorarse. (6) En un iframe `sandbox` sin `allow-same-origin`, leer la propiedad `localStorage` ya lanza `SecurityError` (medido). |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0002: `blockSaves`, `unblockSaves`, `savesBlocked`, `loadSave` (con `recover: true`), `listSaves`, `exportSave`, `requestSave` (debe estar Accepted antes de implementar la vuelta a la última copia buena, el exportar y "Reintentar"). ADR-0001: el tipo `LazyPage` de `src/ui/pages.ts` |
| **Enables** | None |
| **Blocks** | None como épica (no hay épicas en `production/`). Es condición para activar `lazyPage` de ADR-0001 |
| **Ordering Note** | Las fronteras, el registro y la pantalla de página pueden ir antes que ADR-0002 (con "Exportar" sobre el estado en memoria y "Recargar" sin guardar); el bloqueo de guardado y "Volver al inicio" con la última copia buena llegan con ADR-0002. Orden en `main.tsx`: `installGlobalHandlers` → `createRoot` con `onCaughtError`/`onUncaughtError` → `loadDb()` e `initSaves()` en paralelo → frontera raíz con el cascarón de carga. |

## Context

### Problem Statement
El motor muta `g` en el lugar (`advanceDay`, `finishUserMatch`, `startNewSeason`, `acceptOffer`, `sendTerms`, `talkResult`…) y la interfaz llama a `ctx.save()` justo después. Si algo lanza a mitad de una de esas funciones, el estado queda incoherente (una fecha jugada sin tabla, una venta sin plata) y hoy se guarda igual: el error pasa a ser permanente. Si lanza al dibujar, React desmonta todo y queda la pantalla en blanco sin forma de exportar ni de saber qué pasó. Con ADR-0001 aparece un error nuevo: un chunk de pantalla que no baja (pasa al republicar el artefacto). El juego no tiene telemetría ni la va a tener (privacidad, `CLAUDE.md`), así que el único que puede contar el error es el usuario, y necesita el detalle a mano.

### Constraints
- Sin red: el registro queda en el navegador; nada se manda.
- Sin datos personales en el registro (ni el nombre del DT ni textos que escribió el usuario).
- El motor sigue puro: no conoce las fronteras ni el registro.
- Toda la interfaz en español rioplatense; foco, contraste y anuncios como el resto (`design/accessibility-requirements.md`, `--sel` para el foco).
- Un `structuredClone` del estado antes de cada acción cuesta 40 / 51 / 76 ms con 2,2 / 4,1 / 5,3 MB (Node, medido el 2026-11-22; 63 ms en Chromium con 5,3 MB), ~4× con CPU 4×: no entra en un clic.

### Requirements
- Ninguna excepción deja la pantalla en blanco.
- Nunca se guarda un estado posterior a una excepción del motor.
- El usuario puede siempre exportar su última partida buena desde la pantalla de error.
- Cada error queda una sola vez en el registro, con su contexto, para que el usuario lo copie.
- Costo nulo cuando no hay errores.

## Decision

- **Frontera en la raíz** (`<ErrorBoundary scope="root">` en `main.tsx`, por fuera de `App` y del tema del club): pantalla de recuperación completa sin depender de `g`, del tema, de chunks diferidos ni de `localStorage` al dibujar. También recibe los fallos de `loadDb()` e `initSaves()`. Motivo: último recurso, tiene que dibujarse aunque todo lo demás esté roto.
- **Frontera por página** (alrededor del contenido de cada página de `App.tsx`, incluidos el día de partido y el flujo posterior, con `resetKey` = `page` + `id`): la barra de navegación sigue andando y cambiar de página reinicia la frontera. Motivo: un error en Estadísticas no tiene por qué tirar el resto del juego.
- **Toda llamada al motor desde un efecto o un `useMemo` pasa por `guarded`**: hoy hay efectos que llaman al motor y guardan (`Locker.tsx:573`: `save(); refresh()` en un `useEffect`); si un error en un efecto así llegara a la frontera, no se podría distinguir de un error de dibujo puro (`componentStack` no lo dice). Con `guarded`, el error contamina antes de llegar a la frontera. Motivo: así la regla siguiente es cierta.
- **Error al dibujar sin `guarded` no contamina**: un error que atrapa la frontera sin que `guarded` haya contaminado antes viene del dibujo puro, que no muta `g`; la partida sigue sana y el guardado sigue. Si `savesBlocked()` ya es verdadero, la frontera muestra la recuperación completa. Motivo: la mayoría de los errores de interfaz no tocan el estado.
- **Error fuera del dibujo contamina**: toda excepción no atrapada en manejadores, temporizadores, el avance, el partido en vivo o promesas (`window` `error`/`unhandledrejection`, registrados **sin captura**), con una partida cargada, llama a `blockSaves()` (ADR-0002) y muestra la recuperación completa. Excepciones (`classify` → benigno o chunk): errores que `vite:preloadError` ya marcó, mensajes de chunk que no carga, `ResizeObserver loop…`, `"Script error."` sin pila o de archivos fuera del origen del juego, y `SaveError` (ya tiene su aviso). Motivo: desde `window` no se puede saber si el motor llegó a mutar algo; tratar todo como sospechoso cuesta como mucho los días desde la última copia. Sin captura, la falla de un `<img>` (escudo 404, que ADR-0001 maneja con `onError`) no llega acá.
- **`guarded(acción, fn)`** envuelve las entradas del motor que mutan mucho (`advanceDay` en el bucle de `advance`, `finishUserMatch`, `startNewSeason`, `newGame`, `takeJob`, el paso del partido en vivo, los ayudantes de acción compartidos `run`/`act` de `deal.tsx` y la resolución en `Inbox.tsx` y `Locker.tsx`) y toda llamada al motor desde efectos. Motivo: nombra la acción en el registro y contamina en el acto, sin esperar a que el error llegue a `window`.
- **Un error se registra una sola vez**: un `WeakSet<object>` de errores ya registrados que consultan `logError`, `onCaughtError`, `onUncaughtError` y los manejadores globales; los valores lanzados que no son objeto (`throw 'x'`) se envuelven en `Error` al entrar. Motivo: `guarded` registra y relanza, y el error vuelve a llegar a `window`.
- **Sin copia previa por acción**: no se toma `structuredClone` antes de actuar; la vuelta atrás es la última copia buena en disco (ADR-0002 guarda tras cada decisión y acción, partido, freno del avance, temporada y cada 7 días). Motivo: 40-76 ms por clic en desktop y 160-300 ms con CPU 4× es inaceptable para algo que casi nunca pasa.
- **Recuperación completa** (estado contaminado): "Algo salió mal y frenamos el juego para no guardar datos dañados. Tu última partida guardada es del {fecha de juego} ({hace cuánto})." Botones:
  - **Volver al inicio** (principal): `loadSave(cabeza, { recover: true })` en memoria (llama a `unblockSaves()` al cargar bien), `refreshDb`, Inicio. Sin recargar la página.
  - **Exportar la partida**: `exportSave(id de la cabeza)`, la última copia buena, nunca el estado contaminado.
  - **Recargar**: `location.reload()` sin guardar (el guardado está bloqueado).
  - Secundarios: **Elegir otra copia** (las 3 copias automáticas de `listSaves()`, por si la última repite el error; también con `recover: true`) y **Copiar el detalle**.
- **Recuperación de página** (error al dibujar, estado sano): "Esta pantalla tuvo un problema. Tu partida está bien." con **Volver al inicio** (navega a Inicio y reinicia la frontera), **Exportar la partida** (estado en memoria, que es válido), **Recargar** (`reloadSafely`: guarda con `requestSave(g, 'menu')` y después `location.reload()`) y **Copiar el detalle**.
- **Chunk que no carga**: "No se pudo cargar esta pantalla. Revisá la conexión." con **Reintentar**, que llama a `retry()` del `LazyPage` (ADR-0001) = `reloadSafely`: guarda y recarga. No vuelve a hacer `import()` (el navegador recuerda el fallo del módulo) y no hace falta `resetKey` para este caso. No contamina.
- **Sin partida cargada** (pantalla de inicio): la frontera raíz ofrece **Recargar** y **Exportar la partida** (la última copia buena, si hay).
- **Registro local**: `localStorage` `ta-errors`, los últimos **20** (pila recortada a 4 KB, ~80 KB como máximo), con tipo, mensaje, pila, página, acción, fecha de juego, temporada, código del club, `Game.version`, id del build y hora real; `navigator.userAgent` solo al copiar. Todo acceso a `localStorage` (incluida la lectura de la propiedad) va en `try/catch`; sin él, el registro queda en memoria por la sesión. Ajustes › "Errores": lista, **Copiar todo** (texto plano; portapapeles o `textarea` + `execCommand('copy')`) y **Borrar**. Motivo: el usuario puede contar el error sin que nada salga del navegador.
- **Registro también de lo atrapado**: `createRoot` con `onCaughtError`/`onUncaughtError` escribe en el registro y, en desarrollo, sigue llamando a `console.error(error, errorInfo.componentStack)` (la opción propia reemplaza la salida por defecto de React). Motivo: un solo lugar escribe y en desarrollo no se pierde la pista en la consola.
- **Nunca recargar sola**. Motivo: un error que se repite al cargar entraría en un bucle y se perdería lo que muestra la pantalla.

### Architecture Diagram

```
 main.tsx
  installGlobalHandlers(onFatal) ── window 'error' / 'unhandledrejection' / 'vite:preloadError' (sin captura)
  createRoot(el, { onCaughtError, onUncaughtError }) ──► logError()  (WeakSet: una vez por error)
  loadDb() ∥ initSaves() ── fallo ──► frontera raíz
  └─ <ErrorBoundary scope="root">            classify(): benigno (ResizeObserver, Script error, SaveError) ─► logError
       └─ <App>                                          chunk (vite:preloadError, mensajes) ─► logError
            ├─ TopNav / SubNav (armazón)                 fatal con partida cargada ─► blockSaves() + logError + onFatal
            └─ <ErrorBoundary scope="page" resetKey={page+id}>                                     │
                 └─ <Suspense> <LazyPage/>                                                         ▼
                       ├─ error al dibujar ─► savesBlocked() ? completa : página (estado sano)   <RecoveryScreen kind="tainted">
                       └─ chunk que no baja ─► "Reintentar" = retry() = guardar + reload          Volver al inicio ─► loadSave(head,{recover}) ─► unblockSaves ─► Inicio
 acciones del motor y efectos que lo llaman:                                                     Exportar ─► exportSave(head)
  guarded('advanceDay', () => advanceDay(g)) ── lanza ──► blockSaves() + logError + onFatal ──┘  Recargar ─► location.reload()
```

### Key Interfaces

```ts
// src/errors.ts (sin React; lo usan main.tsx, App y src/save)
export type ErrorKind = 'render' | 'error' | 'rejection' | 'chunk' | 'engine'
export interface ErrorEntry {
  at: string; kind: ErrorKind; message: string; stack?: string
  page?: string; action?: string                  // ruta y acción de guarded()
  gameDate?: string; season?: number; club?: string   // código del club, nunca nombres que escribió el usuario
  version: number; build: string; tainted: boolean
}
export const MAX_ERRORS = 20
export function logError(e: unknown, ctx: Partial<ErrorEntry>): ErrorEntry | null   // null si ya estaba registrado (WeakSet)
export function recentErrors(): ErrorEntry[]                  // nunca lanza (try/catch también al leer la propiedad)
export function clearErrors(): void
export function errorsAsText(list: ErrorEntry[]): string      // lo que copia "Copiar todo"
export function classify(e: unknown): 'benign' | 'chunk' | 'fatal'   // primero el WeakSet de vite:preloadError, después el mensaje
export function installGlobalHandlers(onFatal: (e: ErrorEntry) => void): () => void   // addEventListener sin captura
export function guarded<T>(action: string, fn: () => T): T   // si lanza: blockSaves + logError + onFatal, y relanza
export function setErrorContext(c: () => Partial<ErrorEntry> & { game?: Game | null }): void   // App lo fija: página, fecha, club, partida
export function reloadSafely(): Promise<void>                // si hay partida y el guardado no está bloqueado: requestSave(g, 'menu'); después location.reload()

// src/ui/errors.tsx
export class ErrorBoundary extends Component<{ scope: 'root' | 'page'; resetKey?: string; children: ReactNode }, { error: unknown }>
export function RecoveryScreen(p: { scope: 'root' | 'page'; kind: 'tainted' | 'render' | 'chunk'; entry: ErrorEntry; onRetry?: () => void }): JSX.Element

// de ADR-0001 (src/ui/pages.ts), el mismo tipo en los dos ADR
export type LazyPage = ComponentType & { retry(): void }      // retry = reloadSafely()

// de ADR-0002: blockSaves, unblockSaves, savesBlocked, loadSave(id, { recover }), listSaves, exportSave, requestSave
```

### Implementation Guidelines
- Cada página de `App.tsx` debe estar dentro de una `ErrorBoundary scope="page"` con `resetKey` de su ruta; ninguna página nueva se agrega sin ella.
- La frontera raíz y `RecoveryScreen scope="root"` no deben importar nada que dependa de `g`, de `clubTheme` ni de un chunk diferido, ni leer `localStorage` al dibujar; usan HTML con estilos en línea mínimos.
- Una excepción fuera del dibujo con partida cargada debe llamar a `blockSaves()` antes de cualquier otra cosa; después de eso nada debe escribir la partida hasta que "Volver al inicio" o "Elegir otra copia" cargue un estado del disco con `recover: true`.
- Nunca se debe exportar ni guardar el estado en memoria cuando está contaminado.
- Nunca se debe tomar un `structuredClone` del `Game` como respaldo previo a una acción.
- Las entradas del motor listadas arriba y toda llamada al motor desde un `useEffect` o un `useMemo` deben pasar por `guarded` con el nombre de la acción.
- Los manejadores globales deben registrarse sin captura (`capture: false`).
- Todo error debe pasar por el `WeakSet` antes de registrarse; nunca se registra dos veces.
- "Reintentar" un chunk nunca debe volver a hacer `import()`: llama a `retry()` (guardar y recargar).
- El registro nunca debe hacer pedidos de red ni guardar el nombre del DT, nombres de partidas ni texto que escribió el usuario.
- `logError` y `recentErrors` no deben lanzar nunca (`try/catch` también al acceder a `localStorage`).
- `onCaughtError`/`onUncaughtError` deben seguir llamando a `console.error` en desarrollo.
- "Copiar el detalle" y "Copiar todo" deben tener el respaldo de `textarea` seleccionado + `execCommand('copy')`.
- La pantalla de recuperación debe llevar el foco a su título (`tabIndex={-1}`), anunciarse con `role="alert"`, usar `--sel` para el foco y pasar las comprobaciones de visibilidad de `tests/ui/helpers.cjs`.
- Ninguna recarga ni navegación automática tras un error.
- Los atajos de prueba para provocar errores (`window.__boom`) deben existir solo con `import.meta.env.DEV`.

## Alternatives Considered

- **Una sola frontera global**: menos código, pero cualquier error de dibujo saca al usuario del juego entero aunque la partida esté sana. Rechazada.
- **Recargar sola tras un error**: ningún botón que entender, pero puede entrar en bucle si el error se repite al cargar y borra lo que habría que copiar. Rechazada.
- **`structuredClone` del estado antes de cada acción y volver a esa copia**: no se pierde nada, pero 40-76 ms por clic en desktop y ~4× en celular. Rechazada.
- **Contaminar solo en `guarded`** (los errores que llegan a `window` no bloquean el guardado): menos falsos positivos, pero una acción sin envolver que rompe a medias se guarda. Rechazada: el costo de un falso positivo es volver a la última copia.
- **Tratar todo error que atrapa una frontera como contaminante**: más seguro, pero cada error de dibujo obliga a volver a la última copia. Rechazada: con `guarded` en los efectos alcanza.
- **"Reintentar" con un `import()` nuevo**: sin recargar, pero el navegador recuerda el fallo del módulo (medido). Rechazada tras la validación.

## Consequences

### Positive
- Nunca más pantalla en blanco: siempre hay botones, el detalle del error y forma de exportar.
- Un error del motor no queda guardado en la carrera.
- El usuario puede pasar el detalle exacto (pila, acción, fecha de juego) sin telemetría.
- Cubre la carga diferida de ADR-0001 (chunk que no baja → guardar y recargar).

### Negative
- Tras un error del motor se pierde lo hecho desde la última copia (como máximo 6 días sin decisiones y la acción que falló).
- Falsos positivos: un error ajeno al motor en un manejador también hace volver a la última copia.
- Si el error es determinista (está en los datos de la partida), vuelve a pasar al repetir el día; la pantalla lo admite ("Elegir otra copia", "Copiar el detalle") pero no lo arregla.
- Un chunk caído siempre cuesta una recarga.
- Más superficie que probar en cinco resoluciones, y una regla nueva (`guarded` en efectos) que revisar en cada pantalla.

## Risks
- **Un error se repite en bucle al volver a la última copia**: mitigación, "Elegir otra copia" con las 3 copias automáticas, y el detalle para reportarlo.
- **La frontera raíz falla al dibujar** (por ejemplo, el CSS no cargó): mitigación, la raíz usa solo HTML con estilos en línea mínimos.
- **Errores de extensiones o de otro origen contaminan sin motivo**: mitigación, `classify` trata como benignos los `"Script error."` sin pila y los de archivos fuera del origen del juego.
- **Un efecto que llama al motor sin `guarded` rompe a medias y la frontera lo toma por error de dibujo**: mitigación, la regla de las Guidelines, empezando por `Locker.tsx:573`, y una búsqueda de `useEffect`/`useMemo` que llamen funciones del motor en la revisión de código.
- **Un error se registra dos veces** (`guarded` relanza, React lo reporta, `window` lo recibe): mitigación, el `WeakSet`.
- **`classify` por mensaje es frágil entre navegadores**: mitigación, `vite:preloadError` marca el error en el `WeakSet` antes y el mensaje queda de respaldo, con la lista de la verificación 3.
- **Las fallas de carga de `<img>` entran como errores fatales**: mitigación, manejadores sin captura (el evento `error` de un `<img>` no burbujea).
- **`localStorage` lanza al solo leerlo en un iframe `sandbox`**: mitigación, `try/catch` en todo acceso y registro en memoria; Ajustes avisa "El registro no se guarda en este navegador".
- **El portapapeles está bloqueado en el artefacto**: mitigación, `textarea` + `execCommand('copy')`, como en exportar de ADR-0002.
- **Sin `console.error` en desarrollo se pierden las pilas**: mitigación, `onCaughtError` lo sigue llamando con `import.meta.env.DEV`.
- **El error ocurre dentro del worker de guardado**: mitigación, llega como `SaveError` (aviso de siempre, sin contaminar).

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| game-concept.md | Riesgo técnico: "El estado completo se guarda en IndexedDB del navegador: borrar los datos del sitio borra la carrera (se mitiga con "Exportar partida")." | "Exportar la partida" está en todas las pantallas de recuperación, también cuando nada más anda. |
| design/ux/bandeja.md (especificación de la bandeja) | "Error al guardar \| `save()` falla (IndexedDB) \| Nota F7 en `--bad` … \| El estado del juego ya cambió en memoria; no se revierte" | Se conserva para fallos de guardado (`SaveError` no contamina); este ADR solo agrega que, tras una excepción del motor, el guardado se bloquea y se vuelve a la última copia. |
| comunicacion-y-bandeja.md | "**UR-19** Un mensaje sobre un jugador o club que ya no existe se muestra sin tarjeta ni acciones, sin errores, con un texto que lo explique." | No lo reemplaza: la frontera de página es la red si un caso así se escapa; el requisito sigue siendo que la bandeja no lance. |
| temporada-y-ligas.md | Criterio: "Un día sin partido del usuario cuesta 1 ms de mediana (`CLAUDE.md`) y una temporada completa sin interfaz termina sin errores con `npm run sim -- 1`." | `guarded` es un `try/catch` sin costo en el camino feliz; el motor no cambia y `npm run sim` no pasa por la interfaz. |
| economia-y-dirigencia.md, base-de-datos.md | Ninguno aplica: no definen comportamiento ante errores. | — |
| (ningún GDD) | No hay requisito escrito para la pantalla de recuperación ni para el registro de errores. | Quedan definidos en este ADR; falta su especificación de UX (punto abierto). |

GDD sync: ningún GDD nombra interfaces que este ADR cambie.

## Performance Implications
- **CPU**: nulo sin errores (fronteras de clase y `try/catch` de `guarded`; los manejadores de `window` solo corren con un error). Sin `structuredClone` por acción: se evitan 40-76 ms por clic en desktop.
- **Memoria**: el registro ocupa ≤ 80 KB en `localStorage` y en memoria; el `WeakSet` no retiene errores.
- **Load Time**: la frontera raíz y `src/errors.ts` suman ~2-3 KB al chunk principal (presupuesto de 1,5 MB de ADR-0001 intacto).
- **Network**: ninguna, por diseño.

## Migration Plan
1. `src/errors.ts` y `src/ui/errors.tsx`; `main.tsx` en el orden de la Ordering Note, con la frontera raíz, `createRoot` con `onCaughtError`/`onUncaughtError` e `installGlobalHandlers`.
2. Frontera por página en `App.tsx`; `setErrorContext` con página, fecha, club y partida.
3. `guarded` en las entradas del motor y en los efectos que lo llaman (`Locker.tsx:573` y los que encuentre la búsqueda).
4. Ajustes › "Errores" (lista, copiar, borrar).
5. Con ADR-0002: `blockSaves`/`unblockSaves`, recuperación completa con `loadSave(…, { recover: true })`/`exportSave`/"Elegir otra copia", `reloadSafely`.
6. Con ADR-0001: `LazyPage.retry = reloadSafely` y el caso de chunk.
7. Especificación de UX de las dos pantallas de recuperación antes del paso 5 (textos finales, distribución en celular).

## Validation Criteria
- Prueba nueva `tests/ui/errores.cjs` (con `npm run dev`, cinco resoluciones como `bandeja.cjs`):
  - con `window.__boom = 'squad'`, Plantel muestra la recuperación de página con los tres botones visibles (`H.visibility`), el foco en el título y la barra de navegación usable; "Volver al inicio" abre Inicio y un `Continuar` posterior guarda (`seq` sube);
  - con una falla provocada en `advanceDay`, aparece la recuperación completa; el `seq` de la cabeza en IndexedDB no cambia, ni siquiera tras `visibilitychange` oculto; "Volver al inicio" carga una partida con la fecha de la última copia y un `Continuar` posterior vuelve a guardar;
  - con una falla provocada dentro del efecto de `Locker.tsx:573`, la recuperación es la completa (contaminado), no la de página;
  - "Exportar la partida" desde la recuperación completa baja la cabeza guardada, no el estado en memoria (fecha de juego del archivo = la de la copia);
  - un `Promise.reject` sin atrapar queda en el registro con `kind: 'rejection'`, y una falla de `guarded` queda **una sola vez**;
  - con 25 errores provocados, Ajustes › "Errores" muestra 20 y "Copiar todo" copia el texto (también con el portapapeles bloqueado, por el `textarea`);
  - con `page.route` devolviendo 404 para el chunk de Estadísticas: "No se pudo cargar esta pantalla"; se quita el bloqueo, "Reintentar" guarda y recarga, y la prueba espera la recarga y ve Estadísticas; el guardado nunca se bloquea;
  - con `page.route` devolviendo 404 para un escudo, no hay error fatal ni guardado bloqueado;
  - en ninguna de las pruebas hay pedidos a otros orígenes (`page.on('request')`).
- Tests existentes: `bandeja.cjs`, `mercado.cjs` y `vestuario.cjs` pasan; `guardado.cjs` pasa sin cambios hasta que entre ADR-0002 y, desde entonces, en su versión reescrita (igual que `vestuario.cjs:489`, ver ADR-0002).
- `node tests/perf/memory-screens.cjs … desktop 5` y `match-frames.cjs`: sin diferencia medible (< 2 ms por pantalla, mismos cuadros).
- Estuvo bien si el próximo error que encuentre el usuario llega como texto copiado desde Ajustes y su carrera sigue entera.

## Related
- ADR-0002 (depende de él: `blockSaves`/`unblockSaves`, última copia buena, `exportSave`).
- ADR-0001 (`LazyPage` compartido; chunks diferidos).
- `design/ux/bandeja.md` (nota de error al guardar), `design/accessibility-requirements.md`.
- Decisiones del usuario (2026-11-22): una sola partida a la vez (sin partidas con nombre): "Elegir otra copia" ofrece solo las 3 copias automáticas; exportar solo la última copia buena.
- Revisión tras la validación (5.5): "Reintentar" un chunk = `retry()` = guardar y recargar, sin reimportar y sin `resetKey` para ese caso (B3-1); `LazyPage` con el tipo de ADR-0001 (B1-2); `unblockSaves` y `loadSave(…, { recover: true })` en Depends On y en la recuperación (B3-2); `WeakSet` contra el registro doble; `vite:preloadError` y "Unable to preload CSS" en `classify`; manejadores sin captura; `guarded` también en efectos (`Locker.tsx:573`); `console.error` en desarrollo; `try/catch` al acceder a `localStorage`; portapapeles con respaldo; orden de `main.tsx`; tests existentes corregidos.
