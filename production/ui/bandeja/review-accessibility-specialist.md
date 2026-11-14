# Revisión de accesibilidad: bandeja de entrada (fase 4)

> **Revisor**: accessibility-specialist · **Fecha**: 2026-11-14 · **Código revisado**: `9a99596` (bandeja `59f0672` más la revisión visual, sin cambios en `src/`)
> **Nivel comprometido**: Estándar (`design/accessibility-requirements.md`): WCAG 2.1 AA más 2.5.8 y 2.4.11 de WCAG 2.2; en el celular, 44 px para los objetivos de toque (AM-09).
> **Alcance**: los requisitos que la especificación (`design/ux/bandeja.md`, sección 12) le asigna a la bandeja: AV-01 a 04, 06 a 09, 13; AM-01 a 03, 07, 09; AC-02, 03, 05, 06, 07, 09.

## Accesibilidad: NO CUMPLE (nivel Estándar)

La estructura accesible está bien hecha: `listbox` con opciones y `aria-selected`, filtros con `aria-pressed` y foco itinerante, confirmación en el lugar que devuelve el foco, nota de resultado en una región `role="status"` que ya existe antes del texto, contraste ≥ 4,5:1 en los 86 clubes, nada por debajo de 12 px en la pantalla y axe sin violaciones A/AA. Pero **la fila de acciones no se ve** (choque con la clase global `.bar`): en el celular los botones de decisión quedan escondidos detrás de la navegación inferior, así que **con el dedo no se puede responder ninguna oferta** y con el teclado el foco cae en botones invisibles (2.4.11). A eso se suman el desborde lateral de la barra del celular (1.4.10), los atajos de una tecla sin interruptor (2.1.4 / AM-03), el avance que deja vencer un trabajo pendiente (AC-02), la fila de decisión elegida que solo se distingue por el tono (AV-13) y la insignia de la navegación (AV-04, AV-08).

axe no detecta el problema principal: un botón recortado por `overflow` o tapado por un elemento fijo no es una violación para axe. Por eso cada estado se revisó también midiendo dónde cae el foco y qué elemento hay realmente en ese punto (`elementFromPoint`).

---

## 1. Cómo se probó

- Chromium (Playwright) contra `npm run dev` (http://localhost:5173). Partida nueva con Independiente. En el guardado de IndexedDB se inyectaron una oferta por un jugador, una oferta de trabajo que **vence mañana** y un jugador que quiere irse, así los tres tipos de decisión están a la vez.
- axe-core 4.10.2 (instalado en el scratchpad, no en el repo), etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` y `best-practice`.
- Escritorio 1440 × 900 y 1280 × 720; celular 390 × 844 con toque; reflujo a 320 × 568 y 320 × 256; zoom de 200 % emulado con 640 × 450 (1280 × 900 al 200 %); texto del juego al 120 %.
- Deuteranopía y acromatopsia emuladas por CDP (`Emulation.setEmulatedVisionDeficiency`), con y sin el ajuste `cvd`. Movimiento reducido con el ajuste del juego y con `prefers-reduced-motion`.
- Contraste: `node tools/check-contrast.mjs` (0 fallas) y un script propio con los pares de la bandeja que ese script no cubre, sobre los 86 clubes.
- Scripts y capturas en el scratchpad de la sesión (`a11y-lib.cjs`, `a11y-desk.cjs`, `a11y-phone.cjs`, `a11y-phone2.cjs`, `a11y-vis.cjs`, `a11y-motion.cjs`, `a11y-extra.cjs`, `a11y-sim-fix.cjs`, `a11y-contrast.mjs`; capturas en `a11y-shots/`). El scratchpad es temporal: las capturas que conviene conservar del mismo defecto ya están en el repo (`shots/review/*-SIN-PARCHE.png` de la revisión del art-director).
- `a11y-sim-fix.cjs` inyecta en el navegador (sin tocar el repo) el arreglo de B1 y B2 que propone el art-director, para medir qué queda roto después.

Lo que no se pudo verificar: un lector de pantalla real (NVDA, VoiceOver). Los anuncios se revisaron por el árbol de accesibilidad y el contenido de las regiones vivas, no escuchándolos. Ese punto queda **NO EVALUADO**.

---

## 2. Requisitos aplicables

| Req. | Criterio | Estado | Evidencia |
|---|---|---|---|
| AV-01 | 1.4.3 Contraste (mínimo) | **Cumple** | `check-contrast.mjs`: tinta sobre el acento ≥ 4,55 en 86/86; texto sobre la fila elegida ≥ 10,62. Pares propios (86 clubes): `--dim` sobre la fila elegida ≥ 5,08; plazo `--warn` sobre la fila elegida ≥ 6,75 (cvd ≥ 8,03); título del panel (acento 62 % + blanco) ≥ 6,68; `--danger` sobre `--panel2` 6,38. axe: 0 violaciones de `color-contrast` en 7 estados, también con `cvd`. Los "incompletos" de axe (fondos con degradé en `.seg .on`, `.ibchip.on` y el título) se verificaron a mano: ≥ 10,62 |
| AV-02 | Acento ajustado por contraste | **Cumple** | `clubTheme` e `inked` (`common.tsx:32-45`); 0 clubes por debajo de 4,5 |
| AV-03 | 1.4.11 Contraste sin texto | **Cumple** | Anillo de foco de la bandeja (`--accent-hi`) ≥ 5,14 sobre `--panel2` y ≥ 5,09 sobre la fila elegida; punto de sin leer ≥ 5,84; borde del chip activo ≥ 5,84; riel ámbar 9,30. El anillo global `--accent` baja a 2,94 sobre `--panel2` con Lanús, pero en la bandeja solo lo usan el botón ✕ del buscador (sobre #12152b) y "Entendido" de la ayuda (sobre `--panel`, ≥ 3,34): pasan |
| AV-04 | Tamaños mínimos | **No cumple** | Toda la pantalla mide ≥ 12 px (escritorio y celular; el art-director midió también al 120 %). Falla la **insignia de la Bandeja** (F3): `.nav .dot` a .68rem = **9,5 px** (`styles.css:46`), por debajo del piso de 11 px |
| AV-06 | 1.4.4 y 1.4.10 | **No cumple** | Lista sin desplazamiento lateral a 320, 390 y 640 px (200 %). En el detalle, con B1/B2 resueltos, la barra de acciones se sale de costado: "Rechazar" termina en x = 414 con 320 y 390 px de ancho, y "Confirmar: vender a…" queda con 3/9 puntos dentro de la pantalla a 320 px (B3). A 320 × 256, las barras fijas (superior 56 + acciones ~99 + navegación 62 = 217 px de 256) dejan ~40 px para leer. Global: a 320 px la barra superior corta "Continuar" |
| AV-07 | Modo daltonismo completo | **Cumple** | Con `.cvd`, `--warn` pasa a #f3d34a y el plazo corto lo toma; la nota F7, el resultado (`.rdot`) y la conformidad usan los tokens. Los colores fijos de la bandeja (#12152b, #0d0f22, #11132a, #4a5185, #1d1300) no llevan significado |
| AV-08 | 1.4.1 Uso del color | **No cumple** | Bien respaldados: pendiente (ícono "!", encabezado "Para decidir · N" y plazo en palabras), sin leer (negrita y `aria-label`), plazo corto (ícono distinto y "Vence mañana"), resultado ("Victoria/Empate/Derrota"), conformidad (número), chip activo (✓ y `aria-pressed`). Fallan: **(1)** la fila elegida dentro de "Para decidir" (ver AV-13); **(2)** la insignia de la navegación: pendiente (ámbar) contra solo sin leer (acento) se distingue por el color y por un `title`. En escritorio lo compensa el botón de pendientes con texto; en el celular ese botón no está y la insignia de la barra inferior queda sola |
| AV-09 | 2.4.7 y 2.4.11 Foco visible y no tapado | **No cumple** | Contorno de 2 px `--accent-hi` en todas las paradas (filtros, buscador, filas, tarjetas, acciones, confirmación, "Siguiente pendiente"). **Celular**: Aceptar, Pedir más, Ver la ficha, Rechazar y "Confirmar: vender…" reciben el foco con **0 de 9 puntos visibles** (tapados por la navegación inferior y fuera de la pantalla). **Escritorio**: el foco en Aceptar o Confirmar queda recortado a una franja de unos 16 px de 38. Después del arreglo B1+B2 simulado, a 320 × 256 las tarjetas del jugador y del club reciben el foco debajo de la barra de acciones o de la navegación (0/9) |
| AV-13 | Estados con algo más que el tono | **No cumple** | Chips y alcance: borde, fondo, ✓ y `aria-pressed`, bien. Filas comunes: barra izquierda de 3 px que solo tiene la elegida, bien. **Filas de decisión**: todas tienen ya la barra de 3 px; la elegida solo cambia el **color** de la barra (ámbar → `--accent-hi`, contraste entre ambos 1,04 a 1,59 en los 86 clubes) y un tinte de fondo del 14 %. El peso del título es igual (600). Con deuteranopía y acromatopsia emuladas no se distingue cuál está elegida (captura `c2-deuteranopia.png`, `c3-acromatopsia.png`) |
| AM-01 | 2.1.1 Teclado | **Cumple (teclado)** · el toque falla en AM-09 | En escritorio, los dos flujos se completan solo con teclado y el foco va donde dice la especificación. **Rechazar un trabajo**: foco en la fila → Enter (Aceptar) → Tab (Ver el club) → Tab (Rechazar) → Enter ("Confirmar rechazo") → Esc vuelve a Rechazar → Enter → Enter: nota "Rechazaste la oferta de Racing Club." y foco en "Siguiente pendiente"; la fila pasa a "Resuelto". **Responder una oferta**: Esc (vuelve a la fila) → ↓ hasta la oferta → Enter (Aceptar) → Enter ("Confirmar: vender a Facundo Zabala por US$ 3.00 M") → Enter: "Vendiste a…", foco en "Siguiente pendiente". El orden de Tab coincide con la sección 12 (buscador → marcar leídos → alcance → tema → lista como una parada → tarjetas → acciones). Lo que hace mal B1 es que esos botones casi no se ven mientras se usan |
| AM-02 | Espacio no le gana a un control | **Cumple** | Espacio sobre un chip lo activa sin avanzar (19 ene → 19 ene); sobre "Siguiente pendiente" lo aprieta sin avanzar |
| AM-03 | 2.1.4 Atajos de una tecla | **No cumple** | En la bandeja están activos Espacio (Continuar), Mayús+Espacio (Ir al partido), 0-9, `/` y `?` (`App.tsx:117-129`), y no se pueden apagar ni reasignar. Verificado: Espacio sobre una fila avanzó el día (19 → 20 ene). Ver la sección 4 |
| AM-07 | Ventanas y capas | **Cumple** | Confirmación F6: el foco entra en "Confirmar…", Esc o "No" lo devuelven al botón de origen. Ventana del informe del rival (abierta con Enter): `role="dialog"`, `aria-modal`, 25 Tab sin salir, Esc la cierra y el foco vuelve a "Ver el informe del rival" |
| AM-09 | 2.5.8 y 44 px en el celular | **No cumple** | **Las acciones de decisión no se pueden tocar en el celular**: la barra fija tiene 17 px de alto y queda en `bottom: 0` debajo de la navegación inferior (z 30 contra 40); los botones caen en y = 836-880 con una pantalla de 844. Por debajo de 44 px (pasan 2.5.8, porque miden ≥ 24): "Entendido" 83×32, "Marcar como no leído" 148×32, "Deshacer" 78×32, "Buscar en todo el fútbol" 161×32, "Borrar búsqueda" (botón de texto) 120×32 y ✕ del buscador 28×28. Escritorio: nada por debajo de 24 px |
| AC-02 | Fecha límite y freno antes de que venza | **No cumple** | La fecha límite se muestra siempre (fila, panel, "Vence mañana · el 20 ene"). Pero con un trabajo que vencía al día siguiente, "Ir al partido" pasó del 11 al 23 ene sin frenar y el trabajo venció en el camino: `advance` (`App.tsx:150-153`) solo frena con decisiones **nuevas** |
| AC-03 | Nada se cierra solo | **Cumple** | La nota F7 queda hasta la próxima elección; la ficha breve no se cierra con un temporizador |
| AC-05 | Explicaciones fuera del `title` | **Cumple** | `Inbox.tsx` no usa `title`. La ayuda de "Pedir más" y las consecuencias del trabajo están en el texto visible |
| AC-06 | 1.4.13 Ficha breve | **Cumple** (con un efecto lateral) | Aparece con el foco en la tarjeta del jugador (sin tapar el foco), y Esc la cierra. El efecto lateral: la misma Esc también vuelve el foco a la lista (ver M4) |
| AC-07 | Lo pendiente a una tecla | **Cumple** | Bloque "Para decidir" arriba de todo y botón de pendientes en la barra superior |
| AC-09 | 2.4.6 Títulos y nombre de las ventanas | **Cumple** | "Bandeja de entrada" visible; ventana con `aria-labelledby` → "Informe del rival · 24 ene 2026" |
| — | 4.1.2 Nombre, función y valor | **Cumple** | `listbox` "Mensajes", 1 opción `aria-selected=true` en escritorio, grupos con nombre ("Para decidir 3", "Hoy · lun 19 ene"), nombres accesibles completos por fila ("Para decidir. Oferta, Boca Juniors. … Vence en 9 días · el 28 ene"), `aria-pressed` en 8 botones de filtro, un solo `tabindex=0` por grupo, sin botones dentro del `listbox` |
| — | 4.1.3 Mensajes de estado | **NO EVALUADO** con lector de pantalla | Las regiones existen y cambian bien (tema: "Mercado. 1 mensajes, 1 sin leer."; búsqueda: "Ningún mensaje contiene «qqqq» en esta vista."). Hay tres observaciones menores (M1 a M3) |
| AV-10 | Movimiento reducido (no exigido en la bandeja; revisado igual) | **Cumple** | Con el ajuste del juego o con `prefers-reduced-motion`, `.page-in` del detalle pasa a `none 0s` y las transiciones de `.ibchip` y `.ib-who` a 0 s. `scrollIntoView` no usa `smooth` |

---

## 3. Resultados de axe

| Estado | Violaciones A/AA | Prácticas recomendadas | Incompletos |
|---|---|---|---|
| Escritorio, con pendientes (trabajo elegido) | 0 | `empty-table-header` (1, `.ib-cmp thead th:first-child`), `page-has-heading-one` (global) | `color-contrast` 8: fondos con degradé y botones con solo un ícono, verificados a mano |
| Escritorio, confirmación abierta (rechazo) | 0 | las mismas dos | igual |
| Escritorio, confirmación abierta (venta; solo `.ib-read`) | 0 | — | — |
| Escritorio, mensaje común elegido | 0 | `page-has-heading-one` | igual |
| Escritorio con `cvd` (solo `wcag2aa`) | 0 | — | igual |
| Celular, lista | 0 | `page-has-heading-one` | igual |
| Celular, detalle de la oferta | 0 | `page-has-heading-one` | igual |
| Celular, confirmación abierta | 0 | `page-has-heading-one` | igual |
| Ventana del informe del rival | 0 | `heading-order` (1, dentro de `ReportModal`, fuera de `Inbox.tsx`) | — |

axe no ve B1, B2 ni B3: los tres son problemas de recorte, superposición y desborde que solo aparecen midiendo.

---

## 4. Espacio sobre una fila (decisión 2) y WCAG 2.1.4

**Respuesta corta: hoy no cumple el nivel comprometido; cumple en cuanto exista el interruptor de AM-03.**

- **La pantalla falla 2.1.4 (nivel A) aunque no se cuente Espacio.** Con el foco en la bandeja siguen activos `0`-`9` (cambian de pantalla), `/` (barra de comandos) y `?` (ayuda). Son atajos de una tecla con números o signos, justo lo que cubre 2.1.4, y no se pueden apagar, reasignar ni limitar al foco.
- **Espacio solo.** El texto normativo de 2.1.4 habla de letras, signos de puntuación, números o símbolos; el espacio es un caso dudoso. La excepción "solo activo cuando el componente tiene el foco" **no aplica**: Continuar con Espacio está activo en todo el documento salvo sobre controles (también en el `body`), así que no es un atajo propio de la opción. Y el requisito del proyecto, AM-03, nombra a Espacio en forma explícita. Contra el nivel comprometido, entonces, **no cumple**.
- **Riesgo propio de esta pantalla.** En un `listbox`, Espacio es la tecla con la que muchos usuarios esperan elegir. Un lector de pantalla en modo foco se la pasa a la página, y Mayús+Espacio desde una fila hace **Ir al partido** varios días de un golpe. Como el avance no frena antes de un vencimiento (AC-02), con una sola tecla se puede perder una oferta de trabajo, y no hay forma de deshacerlo.
- **Qué hace falta para que la decisión 2 cumpla.** El interruptor "Atajos de una tecla: sí/no" de AM-03, que apague Espacio, 0-9, `/` y `?` (la especificación ya prevé que, apagados, Espacio sobre una fila no haga nada). Mientras no exista, hay dos salidas: (a) sacar `[role=option]` de la excepción de `App.tsx:127`, para que Espacio sobre una fila no haga nada, o (b) que Mayús+Espacio no actúe sobre una fila. Prefiero (a), porque deja la decisión 2 lista para volver cuando esté el interruptor. Igual es una decisión del usuario.

---

## 5. Violaciones por gravedad

Etiquetas de la fase: **bloqueante** = no cumple un requisito del nivel Estándar o deja información en un solo canal; **menor** = recomendación que no rompe el nivel. La gravedad S1 a S4 sigue la escala de errores del proyecto.

### Bloqueantes

| # | Hallazgo | Criterio / req. | Grav. | Dónde | Arreglo |
|---|---|---|---|---|---|
| B1 | La envoltura de acciones usa la clase `bar`, que choca con la barrita de progreso global (`height: 5px; overflow: hidden`). En escritorio, Aceptar, Rechazar, la confirmación, la ayuda y la nota F7 quedan en una franja de 17 px: el resultado de la acción no se ve y el foco se ve en unos 16 px de 38. En el celular, la barra fija mide 17 px | 2.4.7, 2.4.11, 1.4.4 (contenido perdido); AV-09, AM-01 | S1 | `Inbox.tsx:535` (`'bar'`), `styles.css:75` (`.bar`), `styles.css:766` | Renombrar el modificador a `ib-actbar` (nombre del contrato visual) en `Inbox.tsx:535` y en `styles.css:766`. Es el mismo arreglo que el B1 del art-director. Agregar al test de aceptación que `.ib-acts` mida ≥ 38 px de alto, que quede dentro del área visible del panel y que el foco tenga 9/9 puntos visibles |
| B2 | En el celular, la barra de acciones queda en `bottom: 0`, debajo de la navegación inferior (z 30 contra 40): **no se puede tocar ningún botón de decisión** y el foco del teclado cae en botones invisibles (0/9) | 2.4.11, 2.5.8, 2.1.1 con toque; AM-09, AV-09 | S1 | `styles.css:766` (0,3,0) le gana a `styles.css:775` (0,2,0) | En el bloque de 760 px, usar el mismo selector que en el de 900: `.ib-detail .ib-actwrap.ib-actbar { bottom: calc(62px + env(safe-area-inset-bottom, 0px)) }` |
| B3 | Con B1 y B2 resueltos, la barra del celular arma una sola fila de columnas: "Rechazar" termina en x = 414 con 320 y 390 px y la confirmación larga se sale. Como la barra tiene `overflow-y: auto`, el desborde no se ve en el `scrollWidth` de la página | 1.4.10; AV-06 | S2 | `styles.css:767-769` (`grid-auto-flow: column` sin columnas explícitas; `1 / -1` abarca una sola) | `grid-template-columns: repeat(3, minmax(0, 1fr))` (o `repeat(auto-fit, minmax(96px, 1fr))`) con el primario y la confirmación en `grid-column: 1 / -1`, y `white-space: normal` en los botones de la barra. Volver a medir a 320 px que ningún botón pase de `innerWidth` |
| B4 | A 320 × 256 (1280 al 400 %), las tres barras fijas ocupan 217 de 256 px, y las tarjetas del jugador y del club reciben el foco tapadas por la barra de acciones o la navegación (0/9). Fuera de eso, el desplazamiento al foco no deja lugar para las barras fijas | 1.4.10, 2.4.11; AV-06, AV-09 | S2 | `styles.css:766` (barra fija sin condición de alto), sin `scroll-padding` en el contenedor | `@media (max-height: 520px) { .ib-detail .ib-actwrap.ib-actbar { position: static } }` y `scroll-padding-bottom` en el contenedor que se desplaza, igual al alto de la barra más la navegación (62 px). Verificar con Tab a 320 × 256 que cada parada quede 9/9 |
| B5 | La fila de decisión elegida solo se distingue por el color: la barra pasa de ámbar a `--accent-hi` (1,04 a 1,59:1 entre ambos) y el fondo toma un 14 % de tinte. No se distingue con deuteranopía ni con acromatopsia | 1.4.1; AV-13, AV-08 | S3 | `styles.css:657-658` (`.msg.ib-dec::before`, `[aria-selected=true]::before`) | Una marca de forma para la elegida dentro del bloque: barra de 5 px contra 3 px, o un contorno de 1 px `--accent-hi` alrededor de la fila elegida, más el título en 700. Si el art-director avanza con `--sel` (su B5, choque de tono con `--warn`), aplicarlo acá también |
| B6 | Atajos de una tecla activos en la bandeja que no se pueden apagar ni reasignar (Espacio y Mayús+Espacio sobre las filas, 0-9, `/`, `?`) | 2.1.4 (A); AM-03 | S2 | `App.tsx:124-129` (y `SHORTCUTS` en `Nav.tsx`) | Interruptor global en Ajustes (AM-03). Mientras tanto, la salida (a) de la sección 4 |
| B7 | "Ir al partido" (también Mayús+Espacio desde una fila) no frena antes de que venza una decisión pendiente: un trabajo que vencía al día siguiente se perdió en un avance de 12 días | AC-02 | S2 | `App.tsx:150-153` | En el bucle, frenar con `r = 'decision'` cuando a algún pendiente de `pendingOf(g)` con plazo le quede el último día para responder, aunque ya estuviera antes del avance. Ojo: las ofertas vencen el mismo día de `offerDeadline` (`career.ts:296-298`) y los trabajos el día después de `until`, así que el "último día" hay que calcularlo por tipo |
| B8 | Insignia de la Bandeja a 9,5 px | AV-04 | S3 | `styles.css:46` (`.nav .dot`), `:333` (`.tn-opt .dot`) | Subir a .86rem (12 px) con el alto de línea ajustado. Es un cambio global que también arregla Inicio y Mercado |
| B9 | Insignia de la Bandeja: "hay decisiones" (ámbar) contra "solo sin leer" (acento) se distingue por el color y el `title`. En el celular no hay texto que la acompañe. Además, su nombre accesible es "Bandeja4" | 1.4.1; AV-08 | S3 | `App.tsx:170` (`badge`) | Una marca de forma para el estado pendiente (por ejemplo "!" antes del número, o la insignia con borde) y un `aria-label` en el botón de navegación: "Bandeja, 3 para decidir y 1 sin leer". El texto ya lo arma `pendingText` |
| B10 | Objetivos de toque por debajo de 44 px en el celular: "Entendido", "Marcar como no leído", "Deshacer", "Buscar en todo el fútbol" y "Borrar búsqueda" a 32 px de alto; ✕ del buscador 28×28 (pasan 2.5.8, no pasan AM-09) | AM-09 (44 px del proyecto) | S4 | `styles.css:631` (`.btn.sm` a 32 px en la bandeja), `:628` (`.ib-search-x`), `.pagetip` del `PageTip` | En el bloque de 760 px: `.ib-page .btn.sm, .ib-detail .btn.sm, .pagetip .btn { min-height: 44px }` y `.ib-search-x { width: 44px; height: 44px; right: 0 }` |

### Menores

| # | Hallazgo | Dónde | Recomendación |
|---|---|---|---|
| M1 | "Marcaste N como leídos" usa un `role="status"` que se inserta junto con su texto: algunos lectores no anuncian una región viva que aparece ya llena | `Inbox.tsx:300` | Dejar una región `role="status"` vacía siempre montada en el encabezado y poner el texto adentro, como ya hace `.ib-status` en el panel |
| M2 | El anuncio del cambio de vista no nombra el alcance ("Mercado. 1 mensajes…" en Mi club y en Todo el fútbol). Si el texto queda igual, no se anuncia nada. Además dice "1 mensajes" | `Inbox.tsx:197` | "Todo el fútbol, Mercado. 1 mensaje, 1 sin leer." con singular y plural |
| M3 | Esc con la ficha breve abierta sobre una tarjeta la cierra, pero también devuelve el foco a la lista: el manejador del panel corre antes que el de la ficha (que está en `document`) | `Inbox.tsx:309`, `Nav.tsx:103` | En el `onKeyDown` del panel, no hacer nada si hay una `.hovercard` visible (o registrar la Esc de la ficha en captura y cortar la propagación) |
| M4 | Primer `<th>` vacío en la tabla comparativa del trabajo (axe `empty-table-header`) | `Inbox.tsx:424` | `<th><span className="vh">Dato</span></th>` o `<td />` |
| M5 | Encabezados fuera de orden en el panel (h3 del tema antes del h2 del título) y página sin h1 (global) | `Inbox.tsx:528-529` | El tema como `<p>` con la misma clase, o el título como h3. El h1 de pantalla es un arreglo global |
| M6 | A 320 px el nombre del jugador en la tarjeta se corta con elipsis ("Facundo …") y la barra superior corta "Continuar" (global) | `.ib-who-n .ell`; barra superior | Permitir dos renglones en `.ib-who-n b` debajo de 360 px; la barra superior es un arreglo global de AV-06 |
| M7 | 0-9 cambian de pantalla con el foco en una opción del `listbox`, donde se esperaría "escribir para buscar" | `App.tsx:129` | Se resuelve con el interruptor de B6; si se mantienen, no actuar sobre `[role=option]` |

---

## 6. Qué tiene que pasar para aprobar

1. B1 y B2 (un renombre y un selector): sin esto la pantalla no se puede usar en el celular.
2. B3 y B4 (reparto y altura de la barra del celular), verificados a 320 × 568, 320 × 256 y 390 × 844 con Tab, midiendo 9/9 puntos visibles en cada parada.
3. B5, B8, B9 y B10 (estado de la fila elegida, insignia y tamaños táctiles).
4. B6 y B7 son arreglos globales (`App.tsx`). Si el usuario acepta salir con ellos abiertos, tiene que quedar anotado en las brechas de `design/accessibility-requirements.md`. Hasta entonces, recomiendo la salida (a) de la sección 4 para Espacio sobre las filas.
5. Volver a pasar estos scripts y una prueba con NVDA o VoiceOver sobre los anuncios de la sección 12 de la especificación.
