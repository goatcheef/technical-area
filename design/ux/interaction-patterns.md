# Biblioteca de patrones de interacción

> **Estado**: Estable (documenta lo implementado; las propuestas están marcadas como tales)
> **Autor**: usuario + ux-designer
> **Última actualización**: 2026-11-15
> **Versión**: 1.1 (patrones del Mercado: `design/ux/mercado.md`, sección 15, pregunta 15)
> **Motor**: aplicación web, sin motor de juego (React 18 + TypeScript + Vite)
> **Marco de interfaz**: componentes React propios (`src/ui/`) y una hoja de estilos única (`src/styles.css`)
> **Documentos relacionados**:
> - `CLAUDE.md`: arquitectura y decisiones de interfaz
> - `docs/plan-ui-ux.md`: principios y las seis etapas de UI (todas hechas)
> - `design/art/art-bible.md`: no existe; las decisiones visuales viven en `src/styles.css`
> - `design/accessibility-requirements.md`: no existe todavía
> - `design/ux/bandeja.md` y `design/ux/mercado.md`: especificaciones que usan y amplían F1, F2, F3, F4, F6 y D1, y de donde salen F9, F10, F11 e I3
>
> **Plantilla**: Interaction Pattern Library

> **Para qué sirve.** Cada pantalla nueva tiene que poder decir "usa la Tabla de jugadores" o "usa la Ventana modal" en lugar de volver a especificar el foco, el teclado y los estados. Este documento recoge los patrones que **ya existen en el código** para que las pantallas siguientes los reutilicen. Cuando un patrón cambia, cambia acá y en su componente al mismo tiempo.
>
> **Estados de un patrón.** *Estable*: implementado y en uso en al menos una pantalla. *Especificado*: definido en una especificación de pantalla aprobada y en implementación; se usa como si fuera estable. *Propuesta*: todavía no existe; sale de un hueco o de una inconsistencia que se ve en el código. *Obsoleto*: se está reemplazando y no hay que usarlo en pantallas nuevas.

---

## Resumen

### Supuestos y faltantes

- **No hay GDD, mapa del recorrido del jugador ni documento de concepto.** El contexto sale de `CLAUDE.md` y de `docs/plan-ui-ux.md`. Ningún patrón de acá se justifica con un requisito de GDD; todos se derivaron del código.
- **No hay especificaciones de pantalla** en `design/ux/` todavía. La columna "Dónde se usa" del índice se armó leyendo los componentes, no especificaciones.
- **No hay "art bible".** El lenguaje visual vigente es el bloque "estilo portal" al final de `src/styles.css` (desde `/* === estilo "portal" ... === */`), que pisa a los bloques anteriores. Para un valor visual, manda la última regla de la hoja.
- **No hay requisitos de accesibilidad formales.** Lo que se hizo está en la etapa 6 del plan: contraste del texto tenue por encima de 5:1, modo para daltonismo, teclado completo, movimiento reducido y diseño para celular. Este documento lo toma como piso.
- **"Motor" quiere decir React + CSS.** Las notas de implementación nombran archivo, componente y clase CSS.
- **Entradas.** Teclado y mouse como entrada principal (escritorio primero y denso). Táctil parcial: hay un diseño propio para celular por debajo de 760 px. Sin joystick.
- **Sin sonido.** El juego no tiene audio, así que la sección de sonido de la plantilla no aplica.

### Cómo usar esta biblioteca

- **Si diseñás una pantalla:** buscá en el índice antes de inventar una interacción. Si un patrón sirve, nombralo en la especificación ("la lista usa Fila clickeable", "la decisión usa Acción en el mensaje"). Si no hay ninguno, proponelo acá antes de la primera especificación que lo use.
- **Si implementás:** el campo "Dónde está" lleva al componente y a la clase que hay que reutilizar. No copies el marcado: importá el componente (`Modal`, `Seg`, `PlayerTable`, `ChartCard`, `PageTip`...).
- **Si revisás:** todo elemento interactivo tiene que nombrar un patrón de acá o traer su especificación completa. "Un botón normal" no alcanza.
- **Si cambiás un patrón estable:** buscá todos sus usos (el componente o la clase), medí el impacto y actualizá este documento junto con el código.

### Principios que todos los patrones respetan

Los ocho principios de `docs/plan-ui-ux.md`, en su forma operativa:

1. **Escritorio primero y denso.** Nada de espacio vacío de tablet. El celular tiene su propia disposición, no una versión estirada.
2. **Uno o dos clics.** Toda pantalla está a un clic de la navegación o a una tecla.
3. **Nada de ventanas sobre ventanas.** Las fichas son páginas; las ventanas modales quedan para decisiones cortas.
4. **La información viene a vos.** Lo pendiente se calcula del estado y se muestra donde se decide.
5. **El mouse informa.** Cualquier jugador o club muestra su ficha breve al pasar el mouse.
6. **El jugador decide cuánto ver.** Columnas, vistas, paneles y mosaicos son configurables y se recuerdan.
7. **Rápido siempre.** Cambio de pantalla instantáneo; el avance de días cede el turno al navegador.
8. **Cada decisión se entiende.** Toda opción táctica o de gestión explica su efecto (`title`, texto de ayuda, ayudante).

---

## Catálogo de patrones

### Índice

> Agregá una fila cada vez que se suma un patrón. La columna "Dónde se usa" es el registro de usos: actualizala cuando una pantalla nueva lo adopte.

| # | Patrón | Categoría | Descripción | Dónde se usa | Estado |
|---|--------|-----------|-------------|--------------|--------|
| N1 | Navegación en dos niveles | Navegación | Secciones arriba, pantallas de la sección abajo. | Toda la partida (escritorio) | Estable |
| N2 | Menú desplegable | Navegación | Menú al pasar el mouse o con flecha abajo; flechas, Esc y clic afuera. | Secciones, Favoritos, menú del DT | Estable |
| N3 | Navegación inferior del celular | Navegación | Cuatro pantallas principales abajo y "Más" con el menú completo. | Toda la partida (≤ 760 px) | Estable |
| N4 | Historial con atrás y adelante | Navegación | Pila de rutas con scroll recordado por entrada. | Toda la partida | Estable |
| N5 | Ficha como página con pestañas | Navegación | Jugador y club son páginas con migas, banda y pestañas. | Ficha de jugador, ficha de club | Estable |
| N6 | Pestañas | Navegación | Secciones de una misma pantalla, una visible por vez. | Fichas, Bandeja, Centro de datos | Estable |
| N7 | Barra de comandos | Navegación / Entrada | Buscador universal de jugadores, clubes, pantallas y acciones. | Global (Ctrl+K o /) | Estable |
| N8 | Búsqueda rápida de jugadores | Entrada | Campo en la barra superior con resultados al escribir. | Barra superior | Estable |
| N9 | Atajos de teclado y Esc | Navegación / Entrada | Mapa único de teclas y reglas de Esc. | Global y día de partido | Estable |
| N10 | Favoritos | Navegación | Hasta 8 jugadores o clubes fijados. | Menú de la estrella, menú "Más" del celular | Estable |
| I1 | Ficha breve al pasar el mouse | Información | Tarjeta flotante para cualquier `data-pid` o `data-cid`. | Todas las pantallas | Estable |
| I2 | Explicación en `title` | Información | Texto de ayuda nativo sobre controles y encabezados. | Todas las pantallas | Estable |
| I3 | Franja de estado | Información | Una tarjeta baja y fija arriba de las pestañas con el estado que condiciona toda la pantalla (el libro) y los límites (presupuesto, caja, tope). | Mercado | Especificado |
| D1 | Tabla de jugadores | Datos | Tabla única con vistas, columnas, orden, filtros y selección; modo `onPick` con fila elegida (una) distinta de las marcadas (casillas) y foco itinerante. | Plantel, ficha de club, mercado, seguimiento, estadísticas | Estable (`onPick`: Especificado) |
| D2 | Selección múltiple y acciones masivas | Datos / Entrada | Casillas, rangos con Mayús y barra de acciones. | Tabla de jugadores | Estable |
| D3 | Comparador | Datos | Dos o tres jugadores lado a lado. | Tabla de jugadores | Estable |
| D4 | Dato con incertidumbre | Datos / Juego | Valores ajenos como rango según el ojeo. | Valoración, atributos, comparador, ficha | Estable |
| D5 | Gráfico con tooltip y tabla | Datos | Gráfico SVG con tooltip y vista alternativa en tabla. | Centro de datos | Estable |
| D6 | Escalas y chips de estado | Datos | Valoración, físico, estado, puesto y forma con color y texto. | Todas las pantallas con jugadores | Estable |
| D7 | Fila clickeable | Datos / Entrada | Fila de tabla que abre algo; alcanzable con Tab y Enter. | Tablas en general | Estable |
| F1 | Lista y lectura lado a lado | Decisión | Bandeja: `listbox` con foco itinerante, bloque "Para decidir" arriba, mensajes por día; lectura al lado (o detalle aparte en ≤ 900 px con barra de acciones fija que nunca se mueve por el foco). | Bandeja | Estable |
| F2 | Acción en el mensaje | Decisión | Los botones para decidir viven en el mismo mensaje; solo el más nuevo de una decisión la ofrece; los viejos dicen por qué no (chip "Trato"). | Bandeja, Pendientes, Mercado | Estable (`deal`: Especificado) |
| F3 | Indicador de pendientes | Información | Insignias y botón que resumen lo que falta decidir; una decisión suma 1. Mercado cuenta ofertas por tus jugadores, contraofertas y acuerdos. | Navegación, barra de pantallas, Inicio | Estable |
| F4 | Avance progresivo con freno | Juego / Información | Continuar un día o avanzar hasta el partido con progreso y Esc; frena por una decisión nueva y el último día para responder. | Barra superior | Estable |
| F5 | Ventana modal | Modal | Decisión corta con foco atrapado y Esc. | Negociación, charla, prensa, informes, ajustes, atajos, comparador | Estable |
| F6 | Confirmación en dos pasos en el lugar | Entrada | El botón se transforma en "Confirmar / No" para lo irreversible o con costo; Confirmar primario para aceptar, en peligro para rechazar. | Cuerpo técnico, Bandeja (ofertas, trabajos), Mercado (vender, fichar, préstamo, cancelar un trato) | Estable |
| F7 | Nota de resultado en el lugar | Información | Texto que confirma lo que hizo una acción, junto a ella. | Acciones masivas, ofertas, ficha de jugador, cuerpo técnico | Estable |
| F8 | Estado vacío | Información | Texto tenue que explica por qué no hay nada y cuándo habrá. | Listas, tablas, mosaicos, paneles | Estable |
| F9 | Panel de lectura al costado de una tabla | Decisión | Variante de F1 para una tabla: la fila elegida se lee y se decide en un panel fijo a la derecha. | Mercado › Buscar | Especificado |
| F10 | Tarjeta de trato | Decisión | Una operación con estado, plazo, cifras, impacto y acciones; la misma anatomía en Tratos, `BidBox` y bandeja. | Mercado › Tratos, panel del jugador, ficha, Bandeja | Especificado |
| F11 | Vista previa de impacto | Información | Antes → después de lo que cambia una operación (plata libre, caja, sueldos con el tope, plantel), con el veredicto en palabras. | `BidBox`, tarjetas de trato, negociación, venta | Especificado |
| C1 | Selector segmentado | Entrada | Elección exclusiva entre 2 y 6 opciones visibles. | Ajustes, tabla, partido, Inicio | Estable |
| C2 | Botones | Entrada | Primario, CTA, común, alternable, peligro, ícono, enlace. | Todas las pantallas | Estable |
| C3 | Disposición personalizable | Entrada | Modo edición con botones de orden, ancho y ocultar. | Inicio, paneles del partido, columnas | Estable |
| C4 | Estado de pantalla que se recuerda | Persistencia | Tres niveles: memoria de navegación, navegador y partida. | Filtros, pestañas, ajustes, partida | Estable |
| C5 | Filtro con chips y contador | Entrada | Alcance segmentado más chips de tema con contador de sin leer; una parada de Tab por grupo. | Bandeja | Estable |
| M1 | Paneles del día de partido | Juego / Disposición | Siete paneles al costado, abajo u ocultos; cancha grande. | Día de partido | Estable |
| M2 | Control de ritmo del partido | Juego / Entrada | Velocidad, modo, ir al final y pausas automáticas. | Día de partido | Estable |
| M3 | Selección en dos toques | Entrada | Primer toque marca, segundo ejecuta (cambio o intercambio). | Día de partido, Tácticas | Estable |
| M4 | Flujo en pasos | Navegación | Pasos numerados con "Saltear todo". | Después del partido | Estable |
| M5 | Resaltado en vivo | Información | Gol reciente, equipos jugando, subas y bajas en la tabla. | Otros partidos, tabla en vivo | Estable |
| O1 | Recorrido guiado | Ayuda | Ocho pasos que señalan partes de la pantalla. | Primera partida (y desde Ajustes) | Estable |
| O2 | Ayuda de pantalla descartable | Ayuda | Nota la primera vez que se entra a una pantalla. | Plantel, Tácticas, Entrenamiento, Vestuario, Mercado, Bandeja, Centro de datos | Estable |
| A1 | Ajustes de presentación | Accesibilidad | Densidad, texto, movimiento y colores para daltonismo. | Ajustes | Estable |
| A2 | Foco y teclado | Accesibilidad | Foco visible, salto al contenido, filas con Tab. | Global | Estable |
| A3 | Tema del club | Visual | El acento de la interfaz sale de los colores del club. | Global, fichas | Estable |

---

## Patrones

Cada patrón sigue el mismo formato: **cuándo usarlo**, **anatomía**, **estados**, **teclado y mouse**, **accesibilidad**, **dónde está** y **hacé / no hagas**.

### Navegación

---

#### N1. Navegación en dos niveles

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: para llegar a cualquier pantalla fija del juego en escritorio. Cada sección agrupa pantallas afines.
**Cuándo no**: para fichas de una entidad (jugador, club), que son páginas aparte (N5), ni para cambiar de vista dentro de una pantalla (N6).

**Anatomía**
- **Barra superior** (`header.top`, 64 px): atrás y adelante, escudo del club (abre su ficha), **secciones** (`Sections`), herramientas (`Tools`: búsqueda, barra de comandos, favoritos, atajos, ajustes), fecha y el par **Ir al partido / Continuar** (F4).
- **Barra de pantallas** (`SubNav`, 42 px): las pantallas de la sección activa, a la derecha lo pendiente (F3), el próximo rival y el menú del DT.
- Secciones actuales (`GROUPS` en `App.tsx`): **Inicio** (Resumen, Bandeja, Calendario, Fixture, Posiciones, Estadísticas), **Plantel** (Plantel, Vestuario, Cuerpo técnico), **Partido** (Tácticas, Entrenamiento, Centro de datos), **Mercado** y **Club**.

**Estados**

| Estado | Visual | Respuesta |
|--------|--------|-----------|
| Sección activa | Texto en el color de acento (`.nav.sec.on`) | `aria-current="true"` |
| Pantalla activa | Subrayado de acento de 2 px (`.nav.sub.on`) | `aria-current="page"` |
| Hover | Fondo levemente más claro | Si la sección tiene varias pantallas, abre su menú (N2) |
| Con insignia | Contador (`.dot`, `.dot.warn` si hay pendientes) | Ver F3 |
| En una ficha | La sección activa queda en la última usada | La barra de pantallas no cambia |
| Ancho ≤ 1240 px | Se ocultan nombre y prestigio del menú del DT | — |
| Ancho ≤ 1280 / 1060 px | Se ocultan la fecha, luego la búsqueda | La barra de comandos sigue disponible |

**Teclado y mouse**
- Clic en una sección: va a su primera pantalla y cierra cualquier menú.
- Flecha abajo sobre una sección con menú: abre el menú y enfoca la primera opción (N2).
- Teclas 1 a 9 y 0: pantallas en el orden de `PAGES` (ver N9).

**Accesibilidad**: las dos filas son `nav` con `aria-label` ("Secciones", "Pantallas de …"). El estado activo no depende solo del color: hay subrayado y `aria-current`.

**Dónde está**: `src/ui/TopNav.tsx` (`Sections`, `SubNav`, `Tools`), armado en `src/ui/App.tsx` (`GROUPS`, `PAGES`). CSS: `.sections`, `.nav.sec`, `.subnav`, `.nav.sub`, `.tools`.

**Hacé**: sumá una pantalla nueva a un grupo existente de `GROUPS` y a `PAGES`. **No hagas**: una tercera fila de navegación ni una barra lateral en escritorio (el rediseño la ocultó a propósito: `@media (min-width: 761px) { .side { display: none } }`).

---

#### N2. Menú desplegable

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: para una lista corta de destinos o comandos que cuelga de un botón de la barra (pantallas de una sección, favoritos, menú del DT).
**Cuándo no**: para elegir un valor de un formulario (usá `select` o C1) ni para contenido largo (usá una pantalla).

**Anatomía**: botón que abre (`data-opens`, `aria-haspopup="menu"`, `aria-expanded`) y caja `.tn-menu` (`role="menu"`) con opciones `.tn-opt` (`role="menuitem"`): ícono, texto y, si corresponde, insignia. `.tn-menu.right` alinea a la derecha.

**Estados**

| Estado | Disparador | Respuesta | Tiempo |
|--------|-----------|-----------|--------|
| Cerrado | — | — | — |
| Abriendo por hover | Mouse sobre la sección | Se abre | 110 ms de espera; animación `pop` de 120 ms |
| Cerrando por hover | Mouse fuera de botón y menú | Se cierra | 180 ms de espera (permite cruzar el hueco) |
| Abierto por teclado | Flecha abajo en el botón | Se abre y enfoca la primera opción | Inmediato |
| Abierto por clic | Clic en Favoritos o en el DT | Alterna abierto y cerrado | Inmediato |
| Opción con foco | Flechas | Fondo `--panel3` | — |
| Vacío | Sin favoritos | Texto que explica cómo agregarlos | — |

**Teclado y mouse**: flecha abajo y arriba recorren las opciones en ciclo; Enter elige; Esc cierra y devuelve el foco al botón que lo abrió; clic afuera cierra. Elegir una opción cierra el menú y navega.

**Accesibilidad**: roles `menu` y `menuitem`, `aria-expanded` en el botón. Esc frena la propagación para que no dispare también el Esc global.

**Dónde está**: `useMenus()` en `src/ui/TopNav.tsx` (devuelve `Menu` y `opener`). CSS: `.tn-item`, `.tn-menu`, `.tn-opt`.

**Hacé**: reutilizá `useMenus()` para cualquier menú nuevo de la barra. **No hagas**: menús anidados, ni menús que solo se abran con hover (siempre tiene que haber teclado o clic).

---

#### N3. Navegación inferior del celular

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: solo por debajo de 760 px; reemplaza a N1.
**Cuándo no**: en escritorio.

**Anatomía**: la barra `aside.side` pasa a ser una barra fija inferior con las cuatro pantallas principales (`.nav.prim`: Inicio, Bandeja, Plantel, Tácticas) y el botón **Más** (`.more-btn`, `aria-expanded`). "Más" despliega el menú completo con todas las pantallas, los favoritos y el bloque del DT (ajustes, atajos, menú principal). La barra superior queda compacta: escudo, fecha y Continuar.

**Estados**: cerrado (barra de 62 px más el área segura), abierto (`.shell.side-open`: lista vertical que ocupa la pantalla bajo la barra superior). Cambiar de pantalla cierra el menú.

**Teclado y mouse**: toque en una pantalla navega; "Más" alterna el menú con el texto "Cerrar".

**Accesibilidad**: respeta `env(safe-area-inset-bottom)`; el contenido deja 84 px abajo para no quedar tapado.

**Dónde está**: `aside.side` en `src/ui/App.tsx`; CSS en el bloque `/* celular: navegación abajo ... */` y los `@media (max-width: 760px)` del final de `src/styles.css`.

**Hacé**: si una pantalla nueva es de uso frecuente en el celular, evaluá si merece estar entre las cuatro principales (`prim`). **No hagas**: más de cuatro pantallas en la barra inferior.

---

#### N4. Historial con atrás y adelante

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: siempre que se cambia de pantalla. Toda navegación pasa por `nav({ page, id, tab })` del contexto (o sus atajos `go`, `openPlayer`, `openClub`).
**Cuándo no**: para abrir una ventana modal: las modales no son entradas del historial.

**Reglas**

| Regla | Comportamiento |
|-------|----------------|
| Ruta igual a la actual | No apila nada |
| Misma ficha (`page` e `id` iguales), otra pestaña | Reemplaza la entrada actual |
| Ruta nueva | Corta lo que había adelante y apila; máximo 60 entradas |
| Volver o avanzar | Restaura el scroll que tenía esa entrada |
| Entrada nueva | Empieza arriba |
| Cambio de pantalla | Animación `page-in` de 160 ms (se apaga con movimiento reducido) |

**Teclado y mouse**: botones ◂ y ▸ en la barra superior (deshabilitados en los extremos); Alt + ← y Alt + →; botones laterales del mouse (3 y 4); Esc vuelve desde una ficha (N9).

**Accesibilidad**: los botones tienen `aria-label` y `title` con su atajo.

**Dónde está**: `nav`, `back`, `fwd`, `remember` en `src/ui/App.tsx`; el tipo `Route` en `src/store.ts`.

**Hacé**: navegá siempre con `nav`, nunca cambiando estado local para "simular" otra pantalla. **No hagas**: rutas que dependan de estado que no está en `Route` (si hace falta volver a ella, tiene que estar en `page`, `id` o `tab`).

---

#### N5. Ficha como página con pestañas

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: para toda entidad con mucha información propia (jugador, club). Es la respuesta al principio "nada de ventanas sobre ventanas".
**Cuándo no**: para una decisión corta sobre la entidad (negociar, hablar): eso es una ventana modal (F5) que se abre desde la ficha.

**Anatomía**
- **Migas** (`.crumbs`): ◂ Atrás › club › jugador.
- **Banda de encabezado**: `.pband` en la ficha de jugador, teñida con los colores de su club (A3), con identidad, club, contrato, valoración y potencial (D4); `.hero` en la ficha de club, con escudo, categoría, estadio, reputación y forma.
- **Pestañas** (N6) en la misma banda, con las acciones a la derecha: Favorito (N10), Seguir, Mandar a ojear, Hablar y el botón primario (Contrato u Ofertar).
- Pestañas actuales. Jugador: Resumen, Contrato y mercado, Estadísticas, Vestuario (propio) u Ojeo (ajeno). Club: Plantel, Partidos, El club.

**Estados**: entidad inexistente (jugador retirado o ido al exterior) muestra un mensaje y "◂ Atrás"; ficha propia o ajena cambia pestañas y acciones.

**Teclado y mouse**: Esc vuelve (si no hay modal abierta ni foco en un campo). Las pestañas reemplazan la entrada del historial (N4).

**Dónde está**: `PlayerPage` en `src/ui/PlayerPage.tsx` (página `player`), `ClubPage` en `src/ui/Nav.tsx` (página `clubv`).

**Hacé**: una ficha nueva (por ejemplo, la de un DT rival) sigue esta anatomía y se abre con `nav({ page, id, tab })`. **No hagas**: una ficha dentro de una ventana modal.

---

#### N6. Pestañas

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: para dividir una pantalla en secciones de las que se ve una por vez (de 3 a 7).
**Cuándo no**: para alternar entre dos o tres modos de un mismo panel (usá C1), ni para pasos ordenados (usá M4).

**Anatomía**: `.tabs` con botones; el activo lleva `.on` (texto pleno y subrayado de acento de 2 px). Puede llevar contador (`.cnt`). En la ficha de jugador, las pestañas comparten fila con las acciones (`.pband-tabs`).

**Estados**: inactiva (tenue), hover (texto pleno), activa (subrayado), con contador. Si no entran, la fila se desplaza de costado (`overflow-x: auto`).

**Teclado y mouse**: clic o Tab + Enter. La pestaña es parte de la ruta (`tab`), así que se puede volver a ella con el historial.

**Accesibilidad**: el estado activo combina color y subrayado. Falta la semántica ARIA de pestañas (ver G3).

**Dónde está**: CSS `.tabs` en `src/styles.css`. Usos: `PlayerPage`, `ClubPage`, `Inbox` (categorías), `DataCenter`.

**Hacé**: guardá la pestaña en la ruta y, si la pantalla no es una ficha, también en `useSticky` para que al volver aparezca la misma (como `Inbox` y `DataCenter`). **No hagas**: pestañas cuyo contenido dependa de estado local que se pierde al navegar.

---

#### N7. Barra de comandos

**Categoría**: Navegación / Entrada · **Estado**: Estable

**Cuándo usarlo**: es el atajo universal: saltar a cualquier jugador, club o pantalla, o ejecutar una acción frecuente sin buscarla.
**Cuándo no**: no reemplaza a la navegación visible; todo lo que está acá también tiene que estar en N1.

**Anatomía**: caja `.palette` arriba al centro (12 % de la altura) sobre un fondo oscurecido; campo de texto, lista de hasta 14 resultados (`.palette-list`) con ícono, nombre y pista a la derecha (tipo y atajo), y un pie con las teclas.

**Orden de resultados**: acciones (Continuar o Jugar, Ir al partido, Responder la conferencia si hay, Ajustes, Atajos), pantallas (con su tecla), y desde 2 letras, hasta 5 clubes y 8 jugadores (ordenados por habilidad).

**Estados**: vacío (muestra acciones y pantallas), filtrando, sin coincidencias ("No hay coincidencias."), resultado activo (`.on`, fondo de acento suave).

**Teclado y mouse**: Ctrl+K (o Cmd+K) desde cualquier lado, o / fuera de un campo. ↑ ↓ mueven, Enter ejecuta, Esc cierra; el mouse sobre un resultado lo activa; clic afuera cierra. Ejecutar cierra la barra antes de correr la acción.

**Accesibilidad**: el campo toma el foco al abrir. Falta la semántica de combobox y el atrapado de foco de F5 (ver G3).

**Dónde está**: `CommandPalette` en `src/ui/Nav.tsx`; acciones armadas en `src/ui/App.tsx`.

**Hacé**: cuando sumes una acción frecuente nueva, agregala a `actions` con una pista (`hint`). **No hagas**: acciones destructivas en la barra de comandos.

---

#### N8. Búsqueda rápida de jugadores

**Categoría**: Entrada · **Estado**: Estable

**Cuándo usarlo**: para ir a un jugador por nombre desde la barra superior, sin abrir la barra de comandos.
**Cuándo no**: para clubes, pantallas o acciones (eso es N7; el `title` del campo lo dice).

**Anatomía**: `.searchbox` dentro de `Tools`, con ícono de lupa; desde 2 letras despliega hasta 8 jugadores (cara, nombre, club, puesto y valoración). Cada resultado lleva `data-pid`, así que también muestra la ficha breve (I1).

**Estados**: vacío, con resultados, sin resultados (no muestra lista). Se oculta por debajo de 1060 px.

**Dónde está**: `#global-search` en `src/ui/App.tsx`. CSS: `.searchbox`, `.results`.

---

#### N9. Atajos de teclado y Esc

**Categoría**: Navegación / Entrada · **Estado**: Estable

**Cuándo usarlo**: toda tecla nueva se registra en `SHORTCUTS` (que alimenta la ayuda con ?) y respeta las guardas de abajo.

**Mapa vigente**

| Contexto | Tecla | Acción |
|----------|-------|--------|
| Global | Espacio | Continuar un día, o jugar si hay partido; durante el avance, frena |
| Global | Mayús + Espacio | Ir al partido (F4) |
| Global | Ctrl + K, / | Barra de comandos |
| Global | 1 a 9, 0 | Pantallas en el orden de `PAGES` |
| Global | Alt + ←, Alt + → | Atrás y adelante |
| Global | ? | Ayuda de atajos |
| Global | Enter sobre `tr.click` o `[data-click]` | Lo activa |
| Bandeja | ↑ ↓ | Recorren la lista (F1) |
| Gráficos | ← → | Recorren los puntos de un gráfico de líneas (D5) |
| Recorrido guiado | ← →, Esc | Paso anterior o siguiente, saltear |
| Día de partido | Espacio | Pausar o reanudar |
| Día de partido | 1 a 4 | Pausa, normal, rápido, muy rápido |
| Día de partido | M | Partido completo o jugadas clave |
| Día de partido | C, T, R | Mi equipo, Táctica, Rival |
| Día de partido | P | Elegir paneles |
| Día de partido | Esc | Cancela el cambio o la orden en curso y cierra el menú de paneles |

**Guardas (en este orden)**
1. Ctrl+K funciona siempre.
2. Enter sobre una fila clickeable la activa.
3. Esc, de más específico a más general: frena el avance de días; si no, cierra la superposición abierta (barra de comandos, atajos, ajustes); si no, vuelve desde una ficha. Una ventana modal (F5) y un menú (N2) atienden su propio Esc antes.
4. Ninguna otra tecla global actúa si el foco está en un campo (`input`, `textarea`, `select`, editable), si hay una modal o superposición abierta, o si se está en el día de partido o en el flujo posterior.
5. Durante el avance de días, Espacio y Esc frenan y las teclas 1 a 0 no navegan.

**Accesibilidad**: ningún atajo es la única forma de hacer algo; todo tiene un botón visible. Los `title` de los botones nombran su tecla.

**Dónde está**: `api.current.key` en `src/ui/App.tsx`; `SHORTCUTS` y `ShortcutsHelp` en `src/ui/Nav.tsx`; teclas del partido en `MatchView.tsx`.

**Hacé**: agregá la tecla a `SHORTCUTS` en el mismo cambio que la implementa. **No hagas**: atajos de una letra fuera del día de partido (chocan con escribir) ni atajos que ignoren la guarda de campos.

---

#### N10. Favoritos

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: para fijar jugadores o clubes que el DT consulta seguido (hasta 8; al pasar el tope se va el más viejo).

**Anatomía**: botón alternable "☆ Favorito / ★ Favorito" (C2, `.btn.on`) en la ficha; en escritorio, el ícono de estrella de `Tools` con contador y un menú (N2) con cara o escudo y nombre; en el celular, una lista dentro de "Más".

**Estados**: sin favoritos (el menú explica cómo agregarlos), con favoritos, favorito activo (la ficha abierta se resalta en la lista del celular).

**Dónde está**: `FavButton` en `src/ui/PlayerPage.tsx`, menú en `Tools` (`src/ui/TopNav.tsx`), datos en `g.favs`.

---

### Información al pasar

---

#### I1. Ficha breve al pasar el mouse

**Categoría**: Información · **Estado**: Estable

**Cuándo usarlo**: en todo lugar donde aparezca un jugador o un club. Basta con poner `data-pid` o `data-cid` en el elemento; el componente global hace el resto.
**Cuándo no**: para información que hace falta para decidir (no se ve en celular ni con teclado); esa va en la pantalla.

**Anatomía**: `.hovercard` fija de 320 px. Jugador: cara, nombre, club, edad, nacionalidad, valoración (D4), puesto y estado (D6), temporada, contrato, valor, y físico y moral si es propio, o el conocimiento si es ajeno. Club: escudo, nombre, categoría, posición, forma, DT, estadio y reputación. Pie: "Clic para ver la ficha completa".

**Estados**

| Estado | Disparador | Respuesta | Tiempo |
|--------|-----------|-----------|--------|
| Oculta | — | — | — |
| Esperando | Mouse entra en `[data-pid]` o `[data-cid]` | Arranca el temporizador | 380 ms |
| Visible | Termina la espera | Debajo del elemento; arriba si no entra; nunca fuera de la pantalla | Aparece en 120 ms |
| Oculta por acción | Mouse sale, scroll o clic | Se cierra | Inmediato |

**Clic en escudos y nombres de club sueltos**: un `data-cid` que no está dentro de un botón, enlace, campo, fila clickeable, `data-pid` o modal abre la ficha del club. Si está dentro de algo clickeable, manda ese clic.

**Accesibilidad**: no captura el puntero (`pointer-events: none`), así que nunca tapa un clic. No se dispara con el foco del teclado ni en táctil (ver G4).

**Dónde está**: `HoverCard` en `src/ui/Nav.tsx`, montado una vez en `App.tsx`. `Badge` pone `data-cid` solo.

**Hacé**: poné `data-pid` en cada fila, nombre o cara de jugador. **No hagas**: un segundo tooltip propio sobre jugadores o clubes; tampoco `data-pid` en algo que no sea un jugador real (los puntajes de jugadores que ya no existen lo omiten).

---

#### I2. Explicación en `title`

**Categoría**: Información · **Estado**: Estable

**Cuándo usarlo**: para explicar el efecto de un control (roles, órdenes, instrucciones), el significado de una columna abreviada, o el atajo de un botón. Es la forma corriente de cumplir "cada decisión se entiende".
**Cuándo no**: como único lugar de información necesaria para decidir; en ese caso, texto visible (`.dim.sm` debajo del control, como en Ajustes).

**Ejemplos**: encabezados de la tabla ("Valoración en su mejor puesto (rango si no lo conocés bien). Clic para ordenar; Mayús + clic suma un criterio."), órdenes sobre rivales, roles del partido, "Ir al partido" ("Avanza día por día hasta el próximo partido. Se frena si llega algo para decidir.").

**Accesibilidad**: el `title` nativo no aparece con teclado ni en táctil. Lo importante va además en texto visible o en el nombre accesible.

---

#### I3. Franja de estado

**Categoría**: Información · **Estado**: Especificado (`design/ux/mercado.md` 5.2 y 5.3; `production/ui/mercado/visual-design.md`, decisión 1)

**Cuándo usarlo**: cuando un estado del mundo condiciona todo lo que se puede hacer en la pantalla y cambia con los días (el libro de pases abierto o cerrado, cuánto queda) junto con los límites que la gobiernan (presupuesto y lo libre, caja, sueldos y tope). Se lee primero y está igual en todas las pestañas.
**Cuándo no**: para cifras que solo importan en una pestaña (van en su tarjeta) ni como encabezado decorativo.

**Anatomía**: título `h2` de la pantalla y una tarjeta baja (unos 72 px; dos filas por debajo de 900 px; 2 × 2 en el celular) con el **estado** en texto con ícono ("Libro abierto · cierra el 20 de febrero (quedan 12 días)", "! … cierra mañana", "Libro cerrado · reabre el 25 de junio (faltan 41 días)", "… reabre al comenzar la temporada 2027 (10 ene)", sin contar días entre temporadas) y tres KPI con su leyenda ("US$ 1,4 M comprometidos en 1 oferta", "para primas", "margen US$ 70 mil por mes"). Nunca elipsis en el estado; los montos con `money()`.

**Estados**: abierto; abierto, última semana ("!"); último día; cerrado con reapertura; caja negativa (rojo con signo "−"); masa sobre el tope ("pasaste el tope por US$ X" con "!").

**Accesibilidad**: el estado se dice en texto, no con color; la franja tiene una región `aria-live="polite"` que anuncia una vez por día los cambios de estado del libro y las respuestas de los clubes que llegan con la pantalla abierta.

**Dónde está**: datos de `windowState`, `closedReason`, `committed`, `wageBill` (`src/engine/career.ts`); componente en el Mercado (en implementación).

---

### Datos

---

#### D1. Tabla de jugadores

**Categoría**: Datos · **Estado**: Estable

**Cuándo usarlo**: **toda** lista de jugadores con más de unos pocos datos. Es un componente único: no se escribe otra tabla de jugadores.
**Cuándo no**: listas cortas dentro de un mosaico (Inicio) o tablas que no son de jugadores (posiciones, fixture, cuerpo técnico).

**Anatomía**
1. **Barra** (`.ptable-bar`): vistas (C1), botón **Columnas** (avisa "· N ocultas por el ancho"), filtro por línea (Todos, Arq, Def, Med, Del), filtro por nombre, orden actual con "Quitar" si hay más de un criterio, y total de jugadores.
2. **Barra de acciones masivas** (D2), solo con selección.
3. **Tabla** (`.card.ptable`, `table-layout: fixed`): casilla, columnas visibles y "Mostrar N más" si hay más de `limit` (200).

**Vistas**: General, Físico, Contrato, Ojeo y Estadísticas (`VIEWS`), más las propias del jugador ("mine:<nombre>"). Editar columnas crea una vista "Personalizada" hasta guardarla.

**Selector de columnas** (`ColMenu`): las columnas elegidas como chips con ◂ ▸ para ordenarlas y ✕ para quitarlas (las ocultas por el ancho se ven sin acento); casillas agrupadas (Datos, Estado, Temporada, Contrato y mercado, Técnicos, Mentales, Físicos, Arquero); campo de nombre con "Guardar como vista" y, en una vista propia, "Borrar esta vista". Cualquier atributo es una columna (`a_xxx`).

**Ajuste al ancho**: sin desplazamiento horizontal. Si las columnas no entran, se ocultan por prioridad (`PRIO`; primero las de número más bajo; a igual prioridad, la de más a la derecha). Siempre quedan el nombre y al menos tres columnas. El botón Columnas dice cuántas se ocultaron.

**Orden**: clic en un encabezado ordena por esa columna (texto y fechas ascendente, números descendente); otro clic invierte. Mayús + clic suma un criterio (hasta 3) o invierte el que ya estaba. El encabezado muestra ▴ o ▾ y el número de criterio. Sin orden elegido, se usa `defSort` o el puesto.

**Estados**

| Estado | Visual |
|--------|--------|
| Sin jugadores | Texto `empty` del llamador (F8) |
| Fila propia en tabla ajena | `.me` (fondo de acento) |
| Fila marcada (casilla, D2) | `.selrow`; en modo `onPick`, solo la casilla tildada, sin fondo |
| Fila elegida (modo `onPick`) | Fondo `--accent-soft`, riel de 3 px `--sel` a la izquierda, nombre en 700, `aria-selected="true"` |
| Columnas ocultas | Aviso en el botón y chips sin acento |
| Más de `limit` | Botón "Mostrar N más" |

**Teclado y mouse**: clic en la fila abre la ficha (D7); clic en la casilla selecciona (D2); Tab llega a las filas y Enter las abre.

**Modo `onPick`** (Especificado, `design/ux/mercado.md` secciones 7 y 12, pregunta 12; solo en Mercado › Buscar a ≥ 1180 px; el resto de D1 sigue igual):
- **Elegida y marcada son dos cosas distintas.** *Elegida* es una sola fila: la que se lee en el panel (F9), va en la ruta (`sel`, reemplaza la entrada) y se marca con fondo, riel y peso. *Marcadas* son las de la casilla (D2): varias, para comparar o seguir, no se recuerdan y se ven solo por la casilla tildada (sin fondo, para que no se confundan con la elegida). Una fila puede ser las dos cosas y lleva los dos tratamientos.
- **Clic** en la fila la elige (no mueve el foco al panel); el nombre es un enlace que abre la ficha. Por debajo de 1180 px, el clic y Enter abren la ficha como en D7.
- **Foco itinerante**: la tabla es **una sola parada de Tab** (la fila elegida o la primera, `tabindex="0"`); "Mostrar N más" es la parada siguiente, fuera de la tabla. ↑ ↓, Inicio, Fin, Re Pág y Av Pág mueven el foco sin elegir (con `scrollIntoView({ block: 'nearest' })` y `scroll-margin-top` igual a la barra de acciones masivas). El oyente va en la tabla, no en `window`, y respeta `defaultPrevented`.
- **Enter elige** y lleva el foco al campo "Oferta" del panel. **Espacio marca o desmarca la casilla** (como en todo `listbox` de selección múltiple); Mayús + ↑ ↓ extiende la marca. **Sobre una fila del Mercado, Espacio nunca avanza el día**: es distinto de la bandeja (F1), donde Espacio sobre una fila es Continuar; la diferencia se dice en la ayuda del panel sin elegir ("Espacio marca la casilla; acá no avanza el día") y en la ayuda de atajos.
- **Estados de foco**: foco sin elegir, contorno de 2 px `--sel` a −2 px, sin fondo; elegida con foco, los dos.
- **Columna "Trato"** en la vista Ojeo: chip con ícono y palabra (Esperando, Contraoferta, Acordado, Sin acuerdo, Bloqueado hasta {fecha}, "–"); solo los dos que son decisiones llevan el tinte de aviso.

**Accesibilidad**: casillas con `aria-label` ("Seleccionar a …", "Seleccionar todos"); valores ajenos como rangos (D4). Los encabezados ordenables solo responden al mouse (ver G3). En modo `onPick`, la fila elegida lleva `aria-selected="true"` y el contador de jugadores de la barra es una región `aria-live="polite"` ("37 jugadores.", 500 ms después del último cambio de filtro).

**Persistencia**: vista y columnas en `localStorage` (`ta-table-<id>`); orden y filtros con `useSticky` (`tbl.sort.<id>`, `tbl.q.<id>`, `tbl.line.<id>`); la selección no se recuerda.

**Dónde está**: `PlayerTable`, `ColMenu`, `COLS`, `VIEWS`, `PRIO` en `src/ui/PlayerTable.tsx` (props `onPick` y `picked` para el modo de elegir). Usos: `SquadTable` (`Squad.tsx`, también en la ficha de club), `Market.tsx`, estadísticas.

**Hacé**: pasá un `id` propio por lugar de uso (así cada tabla recuerda lo suyo), las vistas que tienen sentido ahí y un `empty` que explique el vacío. Para un dato nuevo, sumá una columna a `COLS` con prioridad en `PRIO`. **No hagas**: ordenar o filtrar por el valor real de un dato que el ojeo no conoce: usá el punto medio del rango (`seen`).

---

#### D2. Selección múltiple y acciones masivas

**Categoría**: Datos / Entrada · **Estado**: Estable

**Cuándo usarlo**: cuando la misma acción tiene sentido para varios jugadores a la vez (al banco, a la reserva, transferibles, seguir, mandar a ojear, comparar).
**Cuándo no**: para acciones que necesitan decidir algo por jugador (ofertar, renovar).

**Anatomía**: casilla por fila y "seleccionar todos" en el encabezado. Con algo elegido aparece la barra `.bulkbar` (fija arriba al hacer scroll, borde de acento): "N seleccionados", **Comparar** (primario, habilitado con 2 o 3), las acciones que aplican a esa selección, **Limpiar** y la nota de resultado (F7).

**Reglas**
- Una acción solo aparece si aplica a alguno de los elegidos (`show`).
- Mayús + clic en una casilla selecciona el rango desde la última tocada, en el orden visible.
- Al cambiar la lista (por un filtro, por ejemplo), se descartan los que ya no están.
- Cada acción devuelve un texto que explica lo que pasó, incluidos los casos parciales ("No hay disponibles para el banco: están en el once, lesionados o suspendidos.").

**Dónde está**: `toggle`, `runBulk`, `Bulk` en `src/ui/PlayerTable.tsx`; conjuntos `ownBulk` (plantel propio) y `scoutBulk` (ajenos).

**Hacé**: armá la acción como `Bulk` con `show` y un mensaje de resultado. **No hagas**: una acción masiva irreversible sin confirmación (ver G5); `danger` solo la pinta de rojo.

---

#### D3. Comparador

**Categoría**: Datos · **Estado**: Estable

**Cuándo usarlo**: para decidir entre 2 o 3 jugadores (fichaje, titular, renovación).

**Anatomía**: ventana modal ancha (F5): radar superpuesto con un color por jugador (acento, info, advertencia), cabeceras con cara, club, puesto y conocimiento (botón a la ficha), filas de datos (valoración, edad, partidos, goles y asistencias, promedio, valor, sueldo, contrato, pedido) y atributos por grupo. El mejor de cada fila va en verde y negrita; si todos empatan, nadie.

**Reglas**: respeta lo que se conoce (D4): los ajenos se comparan por el punto medio del rango y se muestran como rango. En edad y sueldo, gana el menor.

**Dónde está**: `Compare` y `CompareRadar` en `src/ui/PlayerTable.tsx`.

---

#### D4. Dato con incertidumbre

**Categoría**: Datos / Juego · **Estado**: Estable

**Cuándo usarlo**: para todo atributo, valoración o potencial de un jugador ajeno. Es la regla del ojeo: lo que no se conoce se muestra como un rango que se achica con el conocimiento.

**Anatomía**: si se conoce, el valor exacto con su escala (D6); si no, el rango ("12–15") en tono neutro, con `title` "Rango estimado: mandalo a ojear para conocerlo mejor". En la ficha, "conocés el N %". El potencial ajeno se muestra como "Desconocido / Mandalo a ojear" hasta que se sepa.

**Reglas**: ordenar, comparar y destacar usan el punto medio del rango, nunca el valor real; los propios siempre se ven exactos.

**Dónde está**: `shown`, `fmtRange`, `knowOf` en `src/engine/squad.ts`; `Val` en `src/ui/common.tsx`; `seen`, `valSeen` en `src/ui/PlayerTable.tsx`.

**No hagas**: mostrar un dato ajeno exacto en una pantalla nueva sin pasar por `shown`.

---

#### D5. Gráfico con tooltip y tabla

**Categoría**: Datos · **Estado**: Estable

**Cuándo usarlo**: para toda serie numérica que se lea como tendencia, comparación o distribución.
**Cuándo no**: para un número suelto (usá una cifra `.stat`).

**Anatomía**: `ChartCard` con título, subtítulo, leyenda (solo con 2 series o más), el gráfico y el botón **Ver tabla / Ver gráfico** (`aria-pressed`). Tipos: columnas (`Columns`), líneas con mira vertical (`Lines`, rótulo directo al final de cada serie) y barras horizontales (`HBars`). Paleta `--s1`, `--s2`, `--s3`, `--s-muted`, validada para daltonismo y contraste.

**Estados**: normal, punto activo (tooltip `.chart-tip` y banda o mira resaltadas), vista de tabla.

**Teclado y mouse**: el puntero muestra el tooltip; en columnas, cada banda es enfocable con Tab y muestra su tooltip al enfocarla; en líneas, ← → recorren los puntos.

**Accesibilidad**: SVG con `role="img"` y `aria-label`; cada banda de columnas tiene un `aria-label` con todos sus valores; la tabla alternativa hace que ningún dato dependa del color ni del tooltip.

**Dónde está**: `src/ui/charts.tsx`; usos en `src/ui/DataCenter.tsx`.

**Hacé**: dale siempre la `table` con los mismos números. **No hagas**: gráficos sin vista de tabla ni colores fuera de la paleta de series.

---

#### D6. Escalas y chips de estado

**Categoría**: Datos · **Estado**: Estable

**Cuándo usarlo**: para mostrar de un vistazo calidad, estado físico y situación de un jugador, siempre igual en todo el juego.

| Elemento | Componente | Lectura |
|----------|-----------|---------|
| Valoración | `Ovr` / `Val` | Número sobre caja de color en 5 tramos (`.ovr.t1` a `.t5`) |
| Físico, moral, conformidad | `Cond` | Barra de 40 px (verde ≥ 85, amarillo ≥ 65, rojo) más el número |
| Atributo | `attrClass` / `attrTone` | Tono por tramo (≥ 16, ≥ 13, ≥ 9) más el número |
| Puesto | `PosPill` | Sigla con color por línea (`.pill.GK/DF/MF/FW`) |
| Estado | `Status` | Chips: lesión con días, suspensión, transferible, préstamo, quiere irse, molesto, promesa |
| Forma | `FormChips`, `rdot` | G/E/P en texto con color, o punto con `aria-label` |
| Resultado del ayudante y avisos | `.chip.acc/.warn/.bad` | Chip con fondo suave del color |

**Accesibilidad**: ninguna escala depende solo del color: siempre hay número, sigla o texto. El modo para daltonismo (A1) cambia verde y rojo por azul y naranja en todas.

**Dónde está**: `src/ui/common.tsx`; CSS `.ovr`, `.bar`, `.pill`, `.chip`, `.rdot`.

---

#### D7. Fila clickeable

**Categoría**: Datos / Entrada · **Estado**: Estable

**Cuándo usarlo**: cuando toda una fila de tabla lleva a un mismo lugar (ficha, informe del partido).

**Anatomía**: `tr.click` con cursor de mano y fondo `--panel2` al pasar. La fila propia lleva `.me`. Un efecto global le pone `tabIndex=0` a toda `tr.click`, y Enter la activa.

**Reglas**: si la fila tiene un control propio (la casilla de D2), ese control frena la propagación del clic.

**Accesibilidad**: foco visible con contorno de acento (A2).

**Dónde está**: CSS `tr.click`; teclado en `src/ui/App.tsx`.

**No hagas**: dos destinos distintos en la misma fila sin que uno sea un control explícito.

---

### Decisiones y avisos

---

#### F1. Lista y lectura lado a lado

**Categoría**: Decisión · **Estado**: Estable (variante `listbox`, especificada en `design/ux/bandeja.md`)

**Cuándo usarlo**: para recorrer muchos ítems y leer o resolver uno por vez sin cambiar de pantalla (la bandeja de entrada). Lo que espera respuesta va arriba, separado de la correspondencia.

**Anatomía**
- Encabezado: título, buscador (`input type=search`, no se recuerda al salir) y "Marcar N como leídos" (los sin leer de la vista, con "Deshacer").
- Filtros: alcance y tema (C5).
- Lista `.ib-list`: un `role="listbox"` con `aria-label="Mensajes"`. Adentro, el bloque **"Para decidir · N"** (`role="group"` con nombre, encabezado `.ib-block-h`) con las decisiones de `pendingOf` ordenadas por urgencia (conferencia, lo que vence antes, lo que no vence); nunca se filtra ni se busca. Con 0 decisiones, una línea "Nada para decidir. Podés seguir con Continuar." Después, los mensajes de la vista **agrupados por día** (`role="group"` por día, encabezado `.msg-day`: "Hoy · sáb 14 nov", "Ayer · …", la fecha). Filas con la anatomía `.msg` del mosaico del Inicio (`MsgBody` en `src/ui/msg.tsx`): ícono redondo del tema ("!" ámbar en las decisiones), remitente "Tipo · entidad", título, plazo (`.ib-due`) en las decisiones, chip de acción (`.ib-tag`: "Para decidir", "Ver informe", "Informe") y punto de sin leer. "Mostrar N más" es un botón **fuera** del `listbox`, la parada de Tab siguiente.
- Lectura `.ib-read`: plantilla por tipo (tarjetas de jugador y club, cifras `.ib-kpi`, plazo y hechos, cuerpo, acciones F2 con confirmación F6 y nota F7).
- ≤ 900 px: solo la lista; tocar una fila abre el **detalle** como entrada nueva del historial (la única selección que apila), con "◂ Bandeja", "N de M ‹ ›" y la barra de acciones fija abajo.

**Barra de acciones fija (≤ 900 px)** (`design/ux/bandeja.md` 5.2 y preguntas 21 y 22; `design/ux/mercado.md` pregunta 39)
- Fija sobre la navegación inferior (N3). El primario va a todo el ancho en su propia fila; los secundarios, en una segunda fila; si hay más de tres, el cuarto pasa a "Más acciones" **dentro del contenido**, nunca a un menú.
- **Una decisión de trato** (F10) lleva en la barra solo el primario (Aceptar US$ X, Negociar contrato / Seguir negociando o Confirmar el préstamo; con la F6 abierta, Confirmar y No en su lugar) y una segunda fila con **un único** botón común (Retirar la oferta o Cancelar el trato). El campo Mejorar con su "Ofertar", los avisos, el impacto (F11), "Ver todos los tratos" y "Ver la ficha" van en el contenido, después de las cifras. **Nunca un campo de texto en la barra fija.**
- **La barra nunca cambia de posición por el foco.** Sigue fija mientras se edita un campo del contenido; el bloque con el campo lleva `scroll-margin-bottom` igual al alto de la barra, así el campo y su botón quedan siempre por encima de ella, y con el teclado virtual el navegador desplaza el campo sin que el código mueva la barra. Se descartó "pasa a `position: static` con el foco en un campo": movía los botones entre el `mousedown` y el `mouseup` y el clic se perdía. La única regla de posición es la de ventana muy baja (`max-height: 520px`), que depende del alto de la ventana y no del foco; para que el teclado virtual no la dispare, la página no usa `interactive-widget=resizes-content`.

**Estados**

| Estado | Visual / respuesta |
|--------|-------------------|
| Sin leer | Título en 700 y punto `--accent-hi` con `aria-label="Sin leer"` (solo mensajes del DT) |
| Elegido | Fondo `--accent-soft`, barra izquierda de 3 px `--accent-hi`, `aria-selected="true"` |
| Elegido por el DT | Clic, ↑ ↓, Enter, ‹ › o un clic en el mosaico del Inicio: marca leído (`markRead`) |
| Elegido al entrar | La ruta (`sel`); si no, la primera decisión, el primer sin leer o el primero. **No marca leído**: el panel muestra "● Sin leer" |
| Decisión | Riel ámbar continuo y plazo en texto ("Vence en 3 días · el 18 nov", "Vence mañana", "No vence") |
| Resuelto | Tras responder, la fila queda en el bloque con ícono ✓ y "✓ Resuelto" hasta cambiar de selección; el panel muestra la nota F7 (`role="status"`) y "Siguiente pendiente" con el foco. El panel no salta a otro mensaje |
| Vencida o respondida en otro lado | Si seguía elegida, la fila queda como "Ya no está vigente" y el panel cambia las acciones por un texto tenue ("Esta oferta venció el …") |
| Vacío | F8 con el texto del tema; búsqueda sin coincidencias con "Borrar búsqueda" y "Buscar en todo el fútbol" |

**Teclado y mouse**: la lista es una sola parada de Tab (foco itinerante: solo la fila elegida tiene `tabindex=0`). El oyente está en el `listbox`, no en `window`, y respeta `defaultPrevented` (con un menú abierto la lista no recibe las teclas). ↑ ↓ eligen y mueven el foco juntos (sin dar la vuelta), Inicio y Fin, Re Pág y Av Pág (10 filas); Enter lleva el foco al botón primario del mensaje (en ≤ 900 px abre el detalle); Esc en el panel vuelve a la fila. Espacio sobre una fila sigue siendo Continuar (`role=option` no tiene función propia); **en la tabla del Mercado con `onPick` (D1), Espacio marca la casilla**: la diferencia es a propósito y las dos ayudas la dicen. Clic elige; hover solo cambia el fondo.

**Dónde está**: `Inbox`, `Panel`, `Actions`, `Toggles` en `src/ui/Inbox.tsx`; `MsgBody`, `DayHead`, `TAG_ICON` en `src/ui/msg.tsx`; motor en `src/engine/inbox.ts` (`pendingAll` con los tratos, `pendingOf` sin ellos, `pendingKeyOf`, `newestOf`, `unreadOf`, `inboxCount`). La selección va en `Route.sel` (`"n<id>"` o la clave del pendiente). CSS: `.inbox`, `.ib-*`, `.msg*`.

**Hacé**: que cada decisión cuente una vez (un mensaje con la decisión abierta suma como pendiente, no como sin leer; de varios mensajes de la misma decisión, solo cuenta el más nuevo). Que resolver una decisión en cualquier pantalla marque leídos sus mensajes, dentro de la función del motor que la resuelve (`readDecisionNews`), y que lo que el DT acaba de ver nazca leído. **No hagas**: marcar leído lo que el DT no abrió (elegir una tarjeta o una fila en otra pantalla no es abrir el mensaje), ni sacar la fila de la decisión de abajo del cursor al resolverla, ni poner un campo o mover la barra fija por el foco.

---

#### F2. Acción en el mensaje

**Categoría**: Decisión · **Estado**: Estable

**Cuándo usarlo**: para toda noticia que pide o permite actuar. La regla del juego: el que avisa también ofrece el botón para resolverlo (responder una oferta cuesta 1 clic desde Pendientes).

**Anatomía**: en la lectura, debajo del texto: quién está involucrado (`Who`: botón con cara o escudo que abre la ficha, con `data-pid` o `data-cid`), las cifras clave (`.kpi`) y una fila de botones: un primario (la acción esperada), comunes para las alternativas y, si corresponde, uno de peligro. El motor llena `pid`, `act` y `ref` en la noticia; la interfaz deriva los botones de `act`.

| `act` | Botones |
|-------|---------|
| `offer` | Aceptar (primario, F6; deshabilitado con el libro cerrado, con el motivo escrito debajo), Pedir más (con el riesgo escrito), Rechazar (peligro, F6) |
| `deal`, contraoferta | Aceptar US$ X (primario, sin F6, con el costo de salida escrito debajo), Mejorar (campo + Ofertar, en el contenido), Retirar la oferta (común, sin F6), Ver todos los tratos, Ver la ficha |
| `deal`, acuerdo de compra | Negociar contrato / Seguir negociando (primario, abre F5), Cancelar el trato (común, F6 con el costo), Ver todos los tratos, Ver la ficha |
| `deal`, acuerdo de préstamo | Confirmar el préstamo (primario, F6 con cargo, plazo y sueldo), Cancelar el trato (común, F6 con el costo) |
| `deal`, rechazo, caída o vencimiento | Ver todos los tratos, Ver la ficha |
| `job` | Aceptar, Rechazar, Ver el club |
| `out` | Hablar con él, Declararlo transferible |
| `scout` | Ver la ficha, Ofertar |
| `rival` | Ver el informe del rival |
| `result` | Ver el informe del partido |
| `train` | Ir a Entrenamiento |
| conferencia | Responder, Que hable el ayudante |

**Estados**
- **Vigente**: el mensaje es el **más nuevo** de su decisión (`newestOf`) y la decisión sigue abierta (`pendingKeyOf(g, n)`). Chip de la fila: "Para decidir".
- **Ya no vigente**: el botón se reemplaza por un texto tenue que dice por qué ("Esta oferta ya fue respondida o venció."). En un trato (`act: 'deal'`), el chip de la fila pasa a **"Trato"** y el texto distingue: un mensaje viejo de un trato que siguió ("Ya respondiste esta contraoferta: mejoraste tu oferta a US$ 1,5 M el 13 ene." / "Lanús respondió de nuevo el 15 ene.", con "Ver la respuesta nueva ▸"); un trato terminal (el texto de su estado: "Este acuerdo venció el 18 ene.", "Se cayó: dejaste Banfield."); si el DT volvió a ofertar por ese jugador, "Ver el trato nuevo ▸"; un trato que ya no está en el registro: "Este trato ya no figura en el historial." con solo "Ver la ficha". Siempre quedan Ver todos los tratos y Ver la ficha.
- **Actualizado**: un mensaje vigente cuyo trato pasó de contraoferta a acuerdo muestra las acciones del acuerdo con la línea "Actualizado: aceptaste su pedido el 13 ene; falta el contrato."
- **Resuelto ahora**: nota de resultado (F7).
- **Esperando respuesta** (variante: algo que el DT empezó y todavía no tiene respuesta). No es una decisión ni un mensaje: vive en la tarjeta de trato (F10) y en el `BidBox`. Dice el monto y **el rango de la fecha esperada** ("Responde entre el 12 y el 14 ene"), nunca el día exacto; si el rango pasa de un cierre, lo avisa ("! El libro cierra el 20 feb: si contesta después, la oferta caduca"). Su única acción es retirarla (común, sin F6, porque no tiene costo). No suma a ningún indicador (F3) ni frena el avance (F4). Ícono de reloj de arena y palabra, nunca solo color.

**Dónde está**: `Message`, `PendDetail`, `OfferActions`, `Who` en `src/ui/Inbox.tsx`. `OfferActions` también se usa en `Market.tsx`. Las decisiones de trato usan `DealDecision` (F10). La vigencia sale del motor: `pendingKeyOf(g, n)` y `newestOf` (`src/engine/inbox.ts`); `decisionKeyOf` (`src/engine/game.ts`) da la clave `offer<id>` o `deal<id>` de un mensaje.

**Hacé**: al crear una noticia nueva en el motor, completá `pid`, `act` y `ref` (y `me` si es para el DT) y sumá su caso acá. **No hagas**: una noticia accionable que obligue a ir a otra pantalla para resolverla.

---

#### F3. Indicador de pendientes

**Categoría**: Información · **Estado**: Estable

**Cuándo usarlo**: para que lo que falta decidir esté siempre a la vista. Lo pendiente se calcula del estado (`pendingAll`: nueva temporada, conferencia, ofertas de trabajo, ofertas por jugadores, contraofertas y acuerdos para cerrar, jugadores que quieren irse), nunca se guarda.
**Cuándo no**: para lo que el DT empezó y espera respuesta (una oferta enviada): no hay nada que decidir hasta que llega (F2, "Esperando respuesta").

**Anatomía**
- **Insignia** `.dot` en Bandeja (`inboxCount`: pendientes + sin leer; `.dot.warn` si hay pendientes) y en Mercado (**decisiones del mercado**: ofertas por tus jugadores, contraofertas y acuerdos para cerrar; los pendientes `offer` y `deal`). Tiene `title` y un `.vh` con lo que cuenta ("3 decisiones del mercado: 1 oferta por tus jugadores, 1 contraoferta y 1 acuerdo para cerrar"; "4 decisiones pendientes").
- **Una decisión suma 1** en cada indicador donde aparece y nunca 2: el mensaje ligado a un pendiente abierto no cuenta además como sin leer, y de varios mensajes de la misma oferta o trato solo cuenta el más nuevo. Resolverla en cualquier pantalla la saca de todos los indicadores en el mismo `refresh()` y nunca sube la insignia de la Bandeja.
- **Botón de pendientes** `.pendbtn` en la barra de pantallas: contador `.pdot` y la frase ("Tenés una conferencia y 2 ofertas por jugadores"); lleva a Bandeja > Pendientes.
- **En Inicio**: `.ib-pend` en el mosaico de mensajes y la fila "Pendiente" en "Para atender".

**Estados**: sin pendientes (no se muestra nada), con pendientes, durante el avance (el botón se oculta). Por debajo de 1500 px el botón le gana el lugar al próximo rival; en el celular queda solo el contador.

**Dónde está**: `pendingAll`, `pendingText`, `unreadOf`, `inboxCount`, `newestOf` en `src/engine/inbox.ts`; `badge` y `.pendbtn` en `src/ui/App.tsx`.

**Hacé**: un tipo nuevo de decisión se suma a `pendingAll` (con su `deadline` si vence) y a `pendingText`; queda incluido en `decisionKeys` y, si tiene plazo, en `expiringKeys`. Si sus mensajes pueden ser varios, que lleven `act` y `ref` para la regla del mensaje más nuevo. **No hagas**: contar con `pendingOf` (es la lista sin los tratos, para la interfaz anterior) ni con `g.offers.length`.

---

#### F4. Avance progresivo con freno

**Categoría**: Juego / Información · **Estado**: Estable

**Cuándo usarlo**: es el único modo de hacer pasar el tiempo. Cualquier proceso largo que corra en el hilo principal debe imitarlo: por pasos, cediendo el turno, con progreso visible y con freno.

**Anatomía**: botón **Ir al partido ▸▸** y botón CTA **Continuar / Jugar / Nueva temporada** a la derecha de la barra superior. Durante el avance, ambos se reemplazan por el bloque `.advancing` (`role="status"`): "Avanzando · fecha", barra de progreso y botón **Frenar**.

**Comportamiento**

| Acción | Resultado |
|--------|-----------|
| Continuar (Espacio) | Avanza un día. Si hay conferencia, la abre |
| Jugar (Espacio, con partido hoy) | Abre el día de partido |
| Ir al partido (Mayús + Espacio) | Avanza día por día (un día cada 45 ms) hasta el partido |
| Frenar (botón, Esc o Espacio) | Se detiene al final del día en curso |
| Aparece una decisión nueva (también la respuesta de un club, `deal<id>`, y otra vez la respuesta a una mejora) | Se detiene y abre Bandeja > Pendientes con esa decisión elegida |
| Es el último día para responder una decisión pendiente (oferta, trabajo, contraoferta o acuerdo; también si es el último día del libro) | Se detiene una vez por decisión y abre la bandeja con esa decisión elegida; si ya es ese día al apretar, no avanza |
| Aviso de cierre del libro, rechazo o caída de un trato, oferta enviada esperando respuesta | No frena |
| Aparece una conferencia | Se detiene y la abre |
| Termina la temporada | Se detiene; el botón pasa a "Nueva temporada" |

**Accesibilidad**: `role="status"` en el bloque de progreso; el freno es un botón visible, no solo una tecla. El progreso se calcula sobre los días hasta el partido.

**Dónde está**: `advance` y `expiring` en `src/ui/App.tsx`; `decisionKeys` y `expiringKeys` en `src/engine/inbox.ts`. CSS: `.advancing`, `.adv-bar`, `.btn.cta`.

**No hagas**: un web worker para esto (copiar el estado cuesta más que el día; ver `CLAUDE.md`), ni un avance que no se pueda frenar.

---

#### F5. Ventana modal

**Categoría**: Modal · **Estado**: Estable

**Cuándo usarlo**: para decisiones cortas o consultas puntuales que se resuelven y se cierran: negociación de contrato, charla con un jugador, conferencia de prensa, informe del rival, informe de un partido, comparador, ajustes, atajos.
**Cuándo no**: para fichas o pantallas con navegación propia (N5), ni para avisos que no piden nada (F7).

**Anatomía**: fondo `.modal-bg` (oscurecido con desenfoque; clic cierra); caja `.modal` (1000 px, o 1120 px con `wide`). Primera fila: título `h2` y botón de cierre a la derecha ("Cerrar", "Listo" o "Más tarde"). Contenido. Acciones abajo a la derecha cuando las hay.

**Estados**

| Estado | Respuesta | Tiempo |
|--------|-----------|--------|
| Abriendo | Foco al primer control; se recuerda quién tenía el foco | Fondo `fade` y caja `pop` de 140 ms |
| Activa | Tab y Mayús + Tab ciclan dentro de la ventana | — |
| Cerrando (Esc, clic afuera, botón) | Se devuelve el foco al elemento anterior | Inmediato |
| Apilada | Solo la de más arriba atiende el teclado | — |

**Accesibilidad**: `role="dialog"`, `aria-modal="true"`, foco atrapado y devuelto al cerrar. Falta asociar el título (ver G3).

**Dónde está**: `Modal` en `src/ui/common.tsx`. Usos: `Locker.tsx` (`TalkModal`, `NegotiationModal`), `Week.tsx` (`PressModal`, `ReportModal`), `common.tsx` (`MatchReport`), `PlayerTable.tsx` (`Compare`), `Nav.tsx` (`SettingsModal`, `ShortcutsHelp`).

**Hacé**: usá siempre `Modal`; nunca un `.modal-bg` a mano (la barra de comandos es la única excepción y hereda sus huecos). **No hagas**: abrir una modal desde otra salvo que sea un detalle de la primera.

---

#### F6. Confirmación en dos pasos en el lugar

**Categoría**: Entrada · **Estado**: Estable

**Cuándo usarlo**: para una acción **irreversible o con costo**, sin interrumpir con una ventana. "Con costo" alcanza aunque se pueda volver atrás: cancelar un acuerdo del mercado no es irreversible en sentido estricto, pero cuesta 14 días sin ofertar por el jugador y un club molesto, así que lleva F6 (`design/ux/mercado.md` pregunta 46).
**Cuándo no**: para lo que no cuesta nada: retirar una oferta que espera respuesta o una contraoferta, aceptar el pedido de una contraoferta (no se paga nada hasta firmar; el costo de salirse del acuerdo se escribe **debajo** del botón, siempre visible), Pedir más (el riesgo va escrito debajo).

**Anatomía**: el botón se reemplaza, en el mismo lugar, por **Confirmar: {consecuencia}** y **No** (o "Seguir negociando" en la negociación). La etiqueta dice qué se confirma y lo que cuesta: "Confirmar: vender a Pérez a Racing por US$ 2,4 M", "Confirmar: fichar a Pérez, US$ 1,4 M + prima US$ 15 mil", "Confirmar: F. Leiva llega a préstamo hasta fin de temporada, cargo US$ 60 mil, cobra US$ 6 mil por mes" (el sueldo como rango si no se lo conoce al 95 %), "Confirmar: cancelar el trato por L. Gómez. No vas a poder ofertar por él hasta el 26 ene y Banfield va a pedir un 10 % más por sus jugadores hasta esa fecha.", "Confirmar (US$ 9.000)" en el cuerpo técnico.

**Dos variantes** (la biblioteca decía "Confirmar en peligro y No"; la bandeja y el Mercado usan las dos):
- **Aceptar o confirmar la acción esperada** (vender, fichar, confirmar un préstamo, aceptar un trabajo): **Confirmar** va como **primario**, porque es la acción que el DT ya eligió.
- **Rechazar, desvincular o salirse** (rechazar una oferta o un trabajo, desvincular a alguien del cuerpo técnico): **Confirmar** va **en peligro** (bordeado, sin relleno). Cancelar un trato va como botón común y su confirmación, en peligro.

**Estados**: botón; confirmación abierta (el foco pasa a Confirmar); confirmado (nota F7 con el resultado); cancelado con No o Esc (el foco vuelve al botón). Elegir otra tarjeta u otro mensaje cancela una confirmación abierta. En la barra fija de ≤ 900 px, la confirmación ocupa el lugar del primario (F1).

**Accesibilidad**: la etiqueta de Confirmar es el nombre accesible completo (la consecuencia escrita, no "Sí"); Esc cancela; el foco nunca se pierde al abrir o cerrar.

**Dónde está**: cuerpo técnico en `src/ui/Week.tsx` (estado `sure`); bandeja en `src/ui/Inbox.tsx` (fila de acciones con `confirm`, `danger` para rechazar); Mercado en `DealDecision` y la ventana de negociación (en implementación).

**Hacé**: usalo para toda acción irreversible o con costo nueva (ver G5) y escribí el costo en la etiqueta. **No hagas**: "¿Estás seguro?" genérico, "Sí / No" sin decir qué se confirma, ni F6 en lo que no cuesta nada.

---

#### F7. Nota de resultado en el lugar

**Categoría**: Información · **Estado**: Estable

**Cuándo usarlo**: para confirmar lo que hizo una acción justo donde se tocó, con una frase que diga el resultado ("Vendiste a X a Y por US$ 2,5 M.", "3 al banco de suplentes (máximo 9).").
**Cuándo no**: para algo que el DT tiene que resolver (es F2 o F3).

**Anatomía**: texto `.acc.sm` (o `.card.acc` en el cuerpo técnico; en la ficha de jugador, en verde o rojo según el resultado) junto a los botones. Queda hasta la próxima acción o hasta limpiar.

**Accesibilidad**: hoy no se anuncia a los lectores de pantalla (ver G3).

**Dónde está**: `note` en `PlayerTable` y en `OfferActions`; `msg` en `PlayerPage` y `StaffPage`.

**No hagas**: avisos emergentes que desaparecen solos: el juego no tiene "toasts" y no los necesita.

---

#### F8. Estado vacío

**Categoría**: Información · **Estado**: Estable

**Cuándo usarlo**: en toda lista, tabla, mosaico o panel que pueda quedar sin datos.

**Anatomía**: texto `.dim.sm` en el lugar del contenido que dice por qué no hay nada y, si se puede, cuándo va a haber ("Los mejores puntajes del plantel van a aparecer acá cuando empiece el torneo.", "El informe del rival llega 3 días antes") o qué hacer ("Marcá jugadores o clubes con '☆ Favorito' en su ficha y aparecen acá.").

**Hacé**: decí cuándo o cómo se llena. **No hagas**: un "Sin datos" a secas si se puede explicar; un ícono decorativo (el estilo del juego es texto).

---

#### F9. Panel de lectura al costado de una tabla

**Categoría**: Decisión · **Estado**: Especificado (`design/ux/mercado.md` 5.1 a 5.3, 6 y 7)

**Cuándo usarlo**: cuando hay que recorrer una tabla (D1) y decidir sobre una fila por vez sin dejar la tabla: elegir a un jugador y ofertar por él. Es la variante de F1 para una tabla en lugar de una lista de mensajes.
**Cuándo no**: si la decisión necesita más que un panel de 380 px (una ficha completa, N5), en pantallas de menos de 1180 px (ahí la fila abre la ficha, D7) o si la tabla no tiene una acción por fila.

**Anatomía**: tabla D1 en modo `onPick` a la izquierda (ancho restante, mínimo 560 px) y `aside` de 380 px con `aria-label` ("Jugador elegido"), `position: sticky` bajo las pestañas y scroll propio si no entra. Adentro, los datos del elegido (con rangos D4 para lo que no se conoce), el ojeo con la fecha estimada y el bloque de decisión (`BidBox`: monto, F11, fecha esperada de respuesta, costo de salida, botones). Los botones van al final del contenido, nunca en una barra fija.

**Estados**

| Estado | Respuesta |
|--------|-----------|
| Sin elegir | Texto F8 que explica cómo elegir y la diferencia de teclado ("Enter elige; Espacio marca la casilla; acá no avanza el día") |
| Elegido | La fila elegida (D1) y el panel con sus datos; la elección va en la ruta (`sel`) y reemplaza la entrada |
| Con trato abierto | El bloque de decisión muestra el estado del trato y sus acciones (F10) en lugar de la oferta nueva |
| Bloqueado | El motivo y la fecha escritos ("Cancelaste el trato por él el 12 ene. No podés volver a ofertar por él hasta el 26 ene.") con el botón deshabilitado |
| Llega una respuesta con la pantalla abierta | La elección se conserva y el bloque cambia en el lugar; la región `aria-live` de la franja (I3) lo anuncia |

**Teclado**: Enter en la tabla elige y lleva el foco al primer campo del panel; Esc en el panel vuelve el foco a la fila elegida (si hay una F6 abierta, primero la cancela).

**Accesibilidad**: el panel es una región con nombre; elegir no mueve el foco con el mouse; nada irreversible ocurre al elegir.

**Dónde está**: panel del jugador y `BidBox` (`src/ui/deal.tsx`, en implementación) sobre `PlayerTable` con `onPick`.

---

#### F10. Tarjeta de trato

**Categoría**: Decisión · **Estado**: Especificado (`design/ux/mercado.md` 5.3 "Plantillas de tarjeta de Tratos", 6 y 12; `design/ux/bandeja.md` 5.3)

**Cuándo usarlo**: para toda operación del mercado con estado propio: una oferta por un jugador tuyo, una contraoferta, una oferta esperando respuesta, un acuerdo para cerrar (compra o préstamo), un contrato por renovar o un cierre del historial. **La misma decisión tiene el mismo texto y las mismas llamadas al motor en todos lados** (Mercado › Tratos, `BidBox`, lectura y detalle de la bandeja); solo cambia dónde van las partes.
**Cuándo no**: para mensajes sin operación detrás (F2 a secas) ni para listas de muchas filas iguales (D1).

**Anatomía** (de arriba abajo): quién (cara, puesto y valoración del jugador, D4 si es ajeno; escudo y categoría del club) → estado en palabra e ícono → cifras clave (oferta, pedido, diferencia con signo y en palabras, lo libre) → plazo en palabras con fecha ("Vence en 5 días · el 19 ene"; "Responde entre el 12 y el 14 ene" si espera) → líneas extra (avisos de cierre del libro, costo de salirse de un acuerdo, otras ofertas por el mismo jugador, bloqueo) → impacto (F11) → acciones (primario, comunes, peligro al final; F6 donde corresponde) → nota F7. En Tratos va en grupos con encabezado y número: Para responder y Para cerrar (decisiones, riel de aviso), Esperando respuesta (neutro), Para renovar, Historial.

**Estados**

| Estado | Visual / respuesta |
|--------|-------------------|
| Decisión (contraoferta, acuerdo, oferta recibida) | Riel `--warn` y "!" en el encabezado del grupo; primario |
| Esperando respuesta | Reloj de arena, tono neutro, rango de fecha, solo "Retirar la oferta" (F2, variante) |
| Elegida | Borde `--sel` de 3 px, fondo suave, `aria-current="true"`; va en la ruta (`offer<id>`, `deal<id>`, `renew<pid>`). Clic o foco que entra en la tarjeta la eligen; elegir otra cancela una F6 abierta |
| Resuelta en esta visita | ✓ y "Resuelto" con la nota F7 hasta elegir otra; no salta sola |
| Vencida o respondida en otro lado | Las acciones se reemplazan por texto tenue ("Este acuerdo venció el 18 ene.", "Ya respondiste esta contraoferta.") |
| Historial | Estado en texto con ícono (✓, ✗, ⇄); sin acciones, salvo Ver la ficha |

**Accesibilidad**: cada tarjeta es un `role="group"` cuyo nombre accesible resume la decisión ("Contraoferta. Lanús pide 1,6 millones por Juan Pérez. Vence el 19 de enero."); el estado nunca depende solo del color (palabra e ícono); orden de Tab dentro de la tarjeta: jugador, club, acciones en orden visual, nota. Las respuestas que llegan con la pantalla abierta se anuncian una vez en la región `aria-live` de la franja (I3).

**Dónde está**: `DealDecision` (contraoferta y acuerdo) y `OfferDecision` (oferta recibida), compartidos por Mercado y bandeja; datos de `dealsOf`, `bidBlock`, `clubCool`, `dealDeadline` y `answerWindow` (`src/engine/career.ts`). En implementación en `src/ui/deal.tsx`.

**Hacé**: una sola fuente de texto y de acciones por tipo de decisión. **No hagas**: mostrar el día exacto de la respuesta, la paciencia del representante antes de que el DT se siente a negociar, o un sueldo ajeno exacto que no pase por `wageShown`.

---

#### F11. Vista previa de impacto

**Categoría**: Información · **Estado**: Especificado (`design/ux/mercado.md` 5.3 `DealImpact`, 8 y 12)

**Cuándo usarlo**: antes de confirmar o mientras se edita cualquier operación que mueve plata, sueldos o plantel (ofertar, aceptar un pedido, negociar, firmar, vender, confirmar un préstamo), para que el DT no tenga que hacer la cuenta.
**Cuándo no**: después de la operación (eso es F7) ni para datos que no cambian con la decisión.

**Anatomía**: tabla de cuatro filas "antes → después": **lo libre para ofertar** (con lo comprometido en otras ofertas, si hay), **caja**, **sueldos por mes** con el tope y el veredicto en palabras ("entra", "puede no entrar", "no entra") y **plantel** (total y de su línea). Mientras el sueldo es un rango (antes de la negociación), la fila de sueldos muestra un rango ("410 mil → 416–420 mil") y el veredicto sale del rango: "puede no entrar" si lo cruza; en un préstamo no hay "puede no entrar" (se controla con el máximo, igual que al firmar). Con el sueldo que ofrece el DT en la negociación, es exacta. Debajo, los controles duros que impiden la operación ("Te quedan libres US$ 0,7 M.", "Con este sueldo superás el tope por US$ 3 mil.").

**Estados**: entra (sin aviso); puede no entrar ("!" y la palabra); no entra o bloqueada (controles duros escritos; el botón queda deshabilitado con el mismo texto).

**Accesibilidad**: los montos que suben o bajan llevan signo o flecha y palabra, nunca solo verde y rojo; al cambiar el monto, un anuncio `aria-live="polite"` 500 ms después de la última tecla ("Presupuesto después de la oferta: 0,7 millones. Entra.").

**Dónde está**: `dealImpact(g, kind, pid, fee, terms?)` (`src/engine/career.ts`, pura) y su componente en `src/ui/deal.tsx` (en implementación).

**No hagas**: calcular el impacto en la pantalla con números propios, ni mostrar el sueldo real de un ajeno que el DT no conoce.

---

### Controles

---

#### C1. Selector segmentado

**Categoría**: Entrada · **Estado**: Estable

**Cuándo usarlo**: para elegir una opción entre 2 y 6 que conviene ver juntas (densidad, velocidad, vista de la tabla, filtro por línea, ubicación de un panel, rol del jugador).
**Cuándo no**: más de 6 opciones o nombres largos (usá `select`); acciones (usá botones).

**Anatomía**: `.seg` con botones contiguos, dentro de un `role="group"` con `aria-label` (el rótulo visible del control). El elegido lleva `.on` y `aria-pressed="true"`; los demás, `aria-pressed="false"`. Elegido: borde `--accent-hi`, fondo `--accent-soft`, un ✓ delante del rótulo (por CSS, `.seg button.on::before`, oculto para el lector de pantalla porque ya anuncia `aria-pressed`), texto `--text` en negrita. Nunca texto blanco sobre el acento lleno. Puede llevar `title` por opción para explicar su efecto.

**Estados**: normal, hover, elegido. Si no entra, pasa a dos filas (`flex-wrap`).

**Accesibilidad**: el elegido se distingue por el ✓, el borde y el peso, no solo por tono. `aria-pressed` expone cuál está elegido. Contrastes: `--text` sobre `--accent-soft` 10,6:1 como mínimo y `--accent-hi` contra el fondo de la opción 5,1:1 como mínimo en los 86 clubes (`node tools/check-contrast.mjs`). Espacio sobre una opción la elige (no es Continuar, ver G1).

**Dónde está**: `Seg` en `src/ui/common.tsx` (prop `label` para el `aria-label`); los `.seg` armados a mano (tabla, partido, Inicio, Mercado, Tácticas, centro de datos, inicio de partida) repiten `role="group"`, `aria-label` y `aria-pressed`.

**Hacé**: usá `Seg` cuando las opciones son un índice; si armás uno a mano, poné `aria-pressed` en cada opción. **No hagas**: un segmentado que ejecute una acción en lugar de elegir un valor, ni un elegido con relleno de acento lleno.

---

#### C2. Botones

**Categoría**: Entrada · **Estado**: Estable

| Variante | Clase | Uso |
|----------|-------|-----|
| CTA | `.btn.primary.cta` | El avance del tiempo y el cierre de un flujo (Continuar, Jugar, Comenzar temporada, pasos del posterior). Uno por pantalla |
| Primario | `.btn.primary` | La acción esperada de un bloque (Aceptar, Responder, Mejor once y roles, Comparar). Uno por bloque |
| Común | `.btn` | Alternativas y navegación secundaria (Ver el club, Calendario) |
| Chico | `.btn.sm` | Barras de herramientas, filas, mosaicos |
| Alternable | `.btn.on` | Estado prendido de un interruptor (Favorito, En seguimiento, órdenes sobre un rival, Paneles abiertos) |
| Peligro | `.btn.danger` | Acción que rechaza, borra o saca (Rechazar, Borrar esta vista, ✕ de un mosaico) |
| Ícono | `.btn.icon`, `.tn-icon` | Flechas, cerrar, herramientas; siempre con `aria-label` o `title` |
| Enlace | `.linkish` | Nombre, cara o escudo clickeable dentro de texto o filas |

**Estados**: normal, hover (fondo más claro), presionado (baja 1 px), deshabilitado (opacidad 0,4, con `title` que explica por qué), foco (contorno de acento, A2).

**Hacé**: cuando un botón está deshabilitado, decí por qué en `title` ("El libro de pases está cerrado", "Elegí 2 o 3 jugadores"). **No hagas**: dos primarios en el mismo bloque.

---

#### C3. Disposición personalizable

**Categoría**: Entrada · **Estado**: Estable

**Cuándo usarlo**: cuando el jugador puede elegir qué bloques ve, en qué orden y de qué tamaño. Hoy: mosaicos del Inicio, paneles del día de partido (M1) y columnas de la tabla (D1). Las tres resuelven el orden con botones, sin arrastrar.

**Anatomía y estados**

| Superficie | Entrar | Ordenar | Tamaño o lugar | Sacar / agregar | Restablecer | Salir |
|------------|--------|---------|----------------|-----------------|-------------|-------|
| Inicio | "Personalizar inicio" | ◂ ▸ por mosaico | Ciclo Angosto → Completo | ✕ (peligro) / "+ nombre" | Sí | "Listo" (primario) |
| Paneles del partido | "Paneles" o P | ▴ ▾ | Al costado / Abajo / Oculto, y cancha grande | Oculto | Sí | "Listo" o Esc |
| Columnas | "Columnas" | ◂ ▸ en el chip | — | ✕ en el chip / casillas | Volver a la vista | "Cerrar" |

En modo edición, los mosaicos llevan contorno punteado (`.tile.editing`) y una barra de herramientas (`.tile-tools`) arriba a la derecha, y una frase explica qué se puede hacer y que se guarda en el navegador.

**Accesibilidad**: al no haber arrastre, todo se puede hacer con teclado y en el celular. Las flechas extremas se deshabilitan.

**Dónde está**: `Home` (`src/ui/Home.tsx`, `settings.home`), `PanelMenu` (`src/ui/MatchPanels.tsx`, `settings.matchPanels`), `ColMenu` (`src/ui/PlayerTable.tsx`).

**No hagas**: arrastrar y soltar como único método.

---

#### C4. Estado de pantalla que se recuerda

**Categoría**: Persistencia · **Estado**: Estable

**Regla**: todo lo que el jugador esperaría encontrar igual al volver se recuerda. Hay tres niveles:

| Nivel | Dura | Herramienta | Para qué |
|-------|------|-------------|----------|
| Memoria de navegación | Hasta recargar | `useSticky(clave, inicial)` de `src/store.ts` | Filtros, orden, pestañas, club elegido en Plantel |
| Navegador | Siempre, en ese navegador | `localStorage` (`ta-settings`, `ta-table-<id>`) | Ajustes, disposición del Inicio y del partido, vistas y columnas |
| Partida | Con la partida | Estado `Game` en IndexedDB | Favoritos, seguimiento, ojeo, todo lo del juego |

Más el scroll por entrada del historial (N4).

**Hacé**: usá `useSticky` en vez de `useState` para filtros, orden y pestañas. **No hagas**: guardar preferencias de presentación en `Game` (viajan con la partida y no son del juego), ni guardar en `Game` lo que se puede calcular (como los pendientes).

---

#### C5. Filtro con chips y contador

**Categoría**: Entrada · **Estado**: Estable

**Cuándo usarlo**: para filtrar una lista larga por dos ejes a la vez: un alcance de 2 opciones (segmentado C1) y un tema entre 4 y 7 opciones, cuando conviene ver dónde hay novedades sin abrirlas.
**Cuándo no**: si las opciones son vistas distintas de la pantalla (usá pestañas N6) o si hay que combinar varios temas (usá casillas).

**Anatomía**: una fila `.ib-filters`: el segmentado de alcance, un separador vertical de 1 px y los chips `.ibchip` de tema. Cada chip lleva su etiqueta y, si hay sin leer, un contador `.cnt` (píldora `--panel3`, 12 px 800, cifras tabulares; nada de "0"). Cada grupo es un `role="group"` con `aria-label` ("Alcance", "Tema") y cada botón expone `aria-pressed`. El contador se lee como ", 3 sin leer" (texto oculto). Un tema activo por vez.

**Estados**: normal; hover (`--panel2`); activo con el lenguaje único de "elegido": fondo `--accent-soft` compuesto sobre `--panel`, borde `--accent-hi`, ✓ antes de la etiqueta, texto `--text` 700 (nunca blanco sobre acento sólido); foco con anillo `--accent-hi`.

**Teclado**: cada grupo es una parada de Tab (foco itinerante en la opción activa); ← → mueven el foco dentro del grupo; Enter o Espacio eligen. Cambiar de alcance o tema **reemplaza** la entrada del historial y se recuerda con `useSticky` (C4).

**Celular (≤ 760 px)**: alcance y chips en dos filas, 44 px de alto; los chips nunca pasan a dos filas: se desplazan de costado con un degradé de máscara en el borde derecho. La página no se desplaza de costado.

**Dónde está**: `Toggles` en `src/ui/Inbox.tsx`. CSS: `.ib-filters`, `.ibchips`, `.ibchip`, `.ibchip .cnt`.

**Hacé**: contar solo lo que el jugador tiene que leer (en la bandeja, los sin leer del DT sin decisión abierta). **No hagas**: contadores en un alcance que no tiene "sin leer" (en "Todo el fútbol" los chips no cuentan).

---

### Día de partido

---

#### M1. Paneles del día de partido

**Categoría**: Juego / Disposición · **Estado**: Estable

**Cuándo usarlo**: para todo contenido que acompaña al partido en vivo. Un panel nuevo se suma a `PANELS` y hereda la configuración.

**Anatomía**: marcador de transmisión arriba (`.mboard`: escudos, goles y expulsiones, marcador, reloj, barra de minutos, global si es ida y vuelta, posesión), controles de ritmo (M2), la cancha 2D al centro y siete paneles: Mi equipo y táctica, Ayudante, Otros partidos, Tabla en vivo, Relato, Estadísticas, Remates y dominio. Cada uno puede ir al costado (columna de 380 px), abajo (grilla) u oculto. Con "cancha grande", la cancha ocupa el ancho y todos los paneles van abajo.

**Estados**: previa (charla previa con tres opciones), en juego, entretiempo (charla con tres opciones y aviso de que se pueden hacer cambios), final (CTA Continuar). Por debajo de 1100 px todo va en una columna.

**Dónde está**: `MatchView` en `src/ui/MatchView.tsx`; `PANELS`, `PanelMenu`, `LiveOthers`, `LiveTable` en `src/ui/MatchPanels.tsx`.

---

#### M2. Control de ritmo del partido

**Categoría**: Juego / Entrada · **Estado**: Estable

**Anatomía**: segmentado de velocidad (Pausa, Normal, Rápido, Muy rápido), segmentado de modo (Partido completo, Jugadas clave), "Ir al final", "Paneles" y una línea con las teclas.

**Reglas**
- El partido arranca en pausa (para la charla previa). Espacio reanuda a la velocidad preferida de Ajustes.
- Un minuto normal dura 1,5 s; un remate, 2,4 s; un gol, 3,6 s más 1,6 s de pausa, todo dividido por la velocidad. En jugadas clave, los minutos sin nada pasan en 130 ms.
- Pausa automática: expulsión o lesión propia, entretiempo y final.
- Los otros partidos del torneo avanzan al mismo minuto (`syncLive`); "Ir al final" los termina a todos.

**Dónde está**: `MatchView` en `src/ui/MatchView.tsx`.

---

#### M3. Selección en dos toques

**Categoría**: Entrada · **Estado**: Estable

**Cuándo usarlo**: para operaciones entre dos elementos (cambio de jugador, intercambio de puestos), sin arrastrar.

**Reglas**

| Lugar | Primer toque | Segundo toque | Cancelar |
|-------|--------------|---------------|----------|
| Partido, Mi equipo | Un titular (contorno de acento; aparece su rol y el banco se vuelve clickeable con el título "¿Quién entra por X?") | Un suplente: hace el cambio | Tocar el mismo titular o Esc |
| Partido, Rival | Un rival | Órdenes sobre él (marcarlo encima, entrarle fuerte, presionarlo, marca personal), cada una con su efecto en `title` | Tocar el mismo o Esc |
| Tácticas | Un puesto de la cancha (`.slot.sel`) | Otro puesto: los intercambia; un jugador de la lista: lo pone ahí | Tocar el mismo puesto |

**Accesibilidad**: los puestos son botones y las filas son `tr.click`, así que funciona con teclado. La instrucción del segundo paso aparece como texto visible.

**Dónde está**: `out`, `riv`, `doSub` en `src/ui/MatchView.tsx`; `sel`, `slotClick` en `src/ui/Tactics.tsx`.

---

#### M4. Flujo en pasos

**Categoría**: Navegación · **Estado**: Estable

**Cuándo usarlo**: para una secuencia que conviene recorrer en orden, pero que se puede saltear (después del partido: Resultado, Análisis y, si hay, Conferencia).
**Cuándo no**: para secciones que se consultan en cualquier orden (usá N6).

**Anatomía**: `.steps` con botones numerados (activo con acento, hechos en verde), "Saltear todo" y el CTA con el nombre del paso siguiente ("Análisis ▸") o "Volver al inicio ▸" en el último.

**Teclado y mouse**: cualquier paso se puede abrir directamente; el CTA avanza.

**Dónde está**: `PostMatch` en `src/ui/MatchPanels.tsx`.

---

#### M5. Resaltado en vivo

**Categoría**: Información · **Estado**: Estable

**Cuándo usarlo**: para llamar la atención sobre un cambio reciente sin interrumpir.

**Anatomía**: un gol de los últimos 3 minutos pinta la fila del otro partido (`.live-row.flash`) y su marcador con el acento; en la tabla en vivo, ▲ y ▼ marcan subas y bajas, y un punto que late (`.livedot`, `title` "Jugando ahora") indica los equipos en juego; el reloj lleva `.live`.

**Accesibilidad**: el latido se apaga con movimiento reducido; subas y bajas usan símbolo y color.

**Dónde está**: `LiveOthers`, `LiveTable` en `src/ui/MatchPanels.tsx`.

---

### Ayuda

---

#### O1. Recorrido guiado

**Categoría**: Ayuda · **Estado**: Estable

**Cuándo usarlo**: en la primera partida (si no hay partidos jugados y no se completó antes) y cuando el jugador lo pide desde Ajustes.

**Anatomía**: capa `.guide` que oscurece todo menos el elemento señalado (`.guide-spot` con borde de acento); tarjeta `.guide-card` al lado del elemento sin salirse de la pantalla (en el celular, fija abajo): "Paso N de 8", "Saltear la guía", título, texto con teclas en `.kbd`, Anterior y Siguiente (o "A jugar" al final) y puntos de progreso. Si el elemento no está visible, la tarjeta va al centro.

**Teclado y mouse**: ← → cambian de paso; Esc saltea; el foco va al botón primario en cada paso.

**Accesibilidad**: `role="dialog"`, `aria-modal`, `aria-labelledby`.

**Dónde está**: `Guide` y `steps` en `src/ui/Guide.tsx`. Los pasos apuntan a selectores CSS (`.top .cta`, `.subnav [data-page="inbox"]`, `.sections [data-group="squad"]`...).

**Hacé**: si cambiás la navegación, revisá los selectores de `steps`.

---

#### O2. Ayuda de pantalla descartable

**Categoría**: Ayuda · **Estado**: Estable

**Cuándo usarlo**: la primera vez que se entra a una pantalla con reglas propias. Una sola idea por pantalla.

**Anatomía**: `.pagetip` (`role="note"`) arriba de la pantalla: ícono "i", título en negrita, texto tenue y "Entendido". Se apagan todas desde Ajustes.

**Dónde está**: `PageTip` y `TIPS` en `src/ui/Guide.tsx`; `settings.seenTips` y `settings.tips`.

**Hacé**: sumá la entrada a `TIPS` y poné `<PageTip id="…" />` arriba de la pantalla. **No hagas**: más de una ayuda por pantalla.

---

### Accesibilidad y presentación

---

#### A1. Ajustes de presentación

**Categoría**: Accesibilidad · **Estado**: Estable

| Ajuste | Opciones | Efecto |
|--------|----------|--------|
| Densidad | Cómoda, Compacta | `.dense`: menos relleno en tarjetas, celdas y navegación |
| Tamaño de texto | 90, 100, 110, 120 % | Cambia el tamaño base del documento (todo está en `rem`) |
| Velocidad del partido | Normal, Rápido, Muy rápido | La que usa Espacio en el partido |
| Modo de partido | Partido completo, Jugadas clave | Valor inicial de M2 |
| Movimiento | Según el sistema, Reducido | `.reduce-motion` apaga animaciones y transiciones; `prefers-reduced-motion` también |
| Daltonismo | No, Sí | `.cvd`: verde y rojo pasan a azul y naranja en escalas, valoración, atributos y puestos |
| Ayudas | Mostrar, Ocultar; "Volver a ver la guía" | O1 y O2 |

**Dónde está**: `SettingsModal` en `src/ui/Nav.tsx`; aplicación en `src/ui/App.tsx`; `Settings` en `src/store.ts`.

---

#### A2. Foco y teclado

**Categoría**: Accesibilidad · **Estado**: Estable

| Regla | Implementación |
|-------|----------------|
| Foco visible | Contorno de acento de 2 px en botones, campos, filas, enlaces y todo lo que tiene `tabindex` |
| Saltar al contenido | Enlace `.skip` que aparece con Tab y enfoca `#main` |
| Filas alcanzables | Toda `tr.click` recibe `tabIndex=0`; Enter la abre |
| Modal | Foco al primer control, atrapado y devuelto al cerrar (F5) |
| Menú | Flecha abajo lo abre; Esc devuelve el foco al botón (N2) |
| Recorrido guiado | El foco va al botón primario de cada paso |
| Contraste | El texto tenue (`--faint`) está en 5,2:1 sobre los paneles |

**Dónde está**: bloque "foco visible" de `src/styles.css`; `App.tsx`; `Modal` en `common.tsx`.

---

#### A3. Tema del club

**Categoría**: Visual · **Estado**: Estable

**Regla**: el acento de la interfaz (`--accent`, `--accent-ink`, `--accent-soft`) sale del color más saturado del club del DT, aclarado si es muy oscuro; los fondos de las bandas usan los dos colores del club (`--c1a`, `--c2a`). La ficha de jugador se tiñe con los colores del club del jugador; la ficha de club, en cambio, sigue usando el tema del club del DT.

**Dónde está**: `clubTheme` en `src/ui/common.tsx`; aplicado en `App.tsx` y en `PlayerPage`.

**No hagas**: colores de estado (`--good`, `--bad`, `--warn`) que dependan del club; esos son fijos (y cambian solo con el modo para daltonismo).

---

### Agregados de la fase 5 del Mercado (2026-11-15, implementados)

**Encabezado ordenable (D1).** Cada `th` de `PlayerTable` lleva un `button.th-sort` (Enter o clic ordena; Mayús suma un criterio, hasta tres) y el `th` del primer criterio dice `aria-sort="ascending" | "descending"`. El nombre largo de la columna va en un `.vh` dentro del botón (no solo en `title`). Los rótulos se parten en dos líneas antes que cortarse con "…".

**Tabla con foco itinerante (D1 + `onPick`).** La tabla es `role="grid"` con `aria-label` ("Jugadores del mercado"); cada fila, `aria-label` con lo que se ve (jugador, puesto, club, edad, valoración como la da el ojeo, pedido, "marcado") y `aria-selected` en la elegida.

**Vista del trato (F8).** Un solo componente (`DealView`, `deal.tsx`) para una decisión del mercado en la bandeja, en Tratos y en la caja de oferta: cabecera (ícono, tipo, plazo), entidades, cifras, hechos, impacto, Mejorar, acciones (primario → comunes → enlaces → peligro) y ayuda. Las cifras salen de `dealModel` / `offerModel`. En la bandeja los botones van en su barra, antes del cuerpo del mensaje.

**Insignia sin clic propio (N3).** Una insignia dentro de un botón de navegación no tiene objetivo propio: el botón hace lo que la insignia anuncia (con decisiones del mercado, la sección Mercado abre Tratos con la primera), igual con clic, Enter, toque o tecla.

**Foco al llegar a una lista de decisiones (F1).** Con una selección en la ruta, el foco va al **título** de la tarjeta elegida (`tabIndex=-1`), nunca a un botón que decide; un cambio de pestaña no mueve el foco.

**Ventana con foco inicial y sin fugas (AM-07).** `Modal` enfoca `[data-autofocus]` si existe; si el foco queda fuera de la caja (desapareció el botón que lo tenía), el siguiente Tab vuelve adentro. Después de una acción final dentro de la ventana, el foco va al resultado.

## Tiempos de animación

Valores vigentes en `src/styles.css` y en el código. Todos se apagan con movimiento reducido (ajuste propio o el del sistema).

| Animación | Duración | Curva | Dónde |
|-----------|----------|-------|-------|
| Cambio de pantalla (`page-in`) | 160 ms | ease-out | Contenedor de la página |
| Abrir ventana modal (`pop` y `fade`) | 140 ms | ease-out | `.modal`, `.modal-bg` |
| Abrir menú desplegable (`pop`) | 120 ms | ease-out | `.tn-menu` |
| Mostrar ficha breve (`hc-in`) | 120 ms | ease-out | `.hovercard` |
| Recorrido guiado | 160 a 180 ms | ease-out | `.guide-card`, `.guide-spot` |
| Hover de botones y pestañas | 120 ms | por defecto | `.btn`, `.tabs button` |
| Barra de avance | 80 ms | linear | `.adv-bar` |
| Latido "jugando ahora" | 1,6 s en bucle | ease-in-out | `.livedot` |
| Espera para abrir un menú por hover | 110 ms | — | `useMenus` |
| Espera para cerrarlo | 180 ms | — | `useMenus` |
| Espera de la ficha breve | 380 ms | — | `HoverCard` |

## Sonido

No aplica: el juego no tiene audio.

---

## Huecos y patrones a sumar

> **Todo lo de esta sección son propuestas.** Salen de inconsistencias o faltantes que se ven en el código actual. Ninguna está implementada; cada una necesita la aprobación del usuario antes de tocar código.

**G1. Espacio choca con la activación de botones (propuesta).** El atajo global de Espacio (Continuar) solo se ignora en campos de texto. Con el foco en un botón o en una fila, Espacio avanza un día y, como llama a `preventDefault`, puede cancelar además la activación del botón. Esto rompe la regla de teclado de que Espacio activa el control enfocado. Propuesta: que Espacio no actúe como atajo cuando el foco está en `button`, `[role=button]`, `tr.click` o una casilla. `src/ui/App.tsx`.

**G2. Textos que todavía nombran la barra lateral (propuesta).** En escritorio ya no hay barra lateral, pero la ayuda de atajos dice "1 a 9, 0: pantallas de la barra lateral, en orden" y el `title` del botón Favorito dice "Los favoritos aparecen en la barra lateral". Además, el orden de las teclas sigue a `PAGES` (Inicio, Bandeja, Plantel, Tácticas, Vestuario, Entrenamiento, Calendario, Mercado, Cuerpo técnico, Fixture) y no al orden de las secciones que se ve arriba. Propuesta: actualizar los textos y decidir si las teclas siguen a las secciones o se muestran junto a cada pantalla en los menús. `src/ui/Nav.tsx`, `src/ui/PlayerPage.tsx`, `src/ui/App.tsx`.

**G3. Semántica ARIA incompleta en los controles compartidos (propuesta).**
- Pestañas (N6): faltan `role="tablist"`, `role="tab"` y `aria-selected` (solo el carrusel de noticias del Inicio los tiene).
- Selector segmentado (C1): falta `aria-pressed` o `role="radiogroup"` con `aria-checked`.
- Encabezados ordenables (D1): no se alcanzan con Tab ni tienen `aria-sort`; ordenar solo se puede con el mouse.
- Ventana modal (F5): falta `aria-labelledby` hacia su título.
- Barra de comandos (N7): no usa `Modal`, así que no atrapa el foco ni lo devuelve, y le falta la semántica de combobox y listbox.
- Notas de resultado (F7): no se anuncian; un `role="status"` en el contenedor alcanzaría.
Propuesta: resolverlo en `Seg`, en un componente `Tabs` nuevo y en `Modal`, y migrar los `.seg` y `.tabs` armados a mano.

**G4. La ficha breve no existe para teclado ni táctil (propuesta).** `HoverCard` solo responde a `mouseover`. Con teclado o en el celular, el dato de "0 clics" (contrato de un jugador) no está. Propuesta: mostrarla también con el foco sobre un `data-pid` o `data-cid` (con la misma espera) y, en táctil, con una pulsación larga.

**G5. Acciones destructivas sin confirmación (propuesta, resuelta en parte).** La bandeja ya confirma aceptar y rechazar ofertas y trabajos, y el Mercado especifica F6 en vender, rechazar, fichar, confirmar un préstamo y cancelar un trato (F6, criterio "irreversible o con costo"). Siguen sin confirmación borrar una vista propia de la tabla y las acciones masivas marcadas `danger`. Propuesta: aplicar F6 a todo botón `.btn.danger` cuyo efecto no se pueda deshacer.

**G6. Cambiar de pestaña apila historial fuera de las fichas (propuesta).** En las fichas, cambiar de pestaña reemplaza la entrada (N4). En Bandeja y Centro de datos, cada cambio de pestaña apila una entrada nueva, porque la ruta no lleva `id`. Propuesta: que la regla de reemplazo se aplique a cualquier ruta con la misma `page`, haya o no `id`. `nav` en `src/ui/App.tsx`.

**G7. Las flechas de la bandeja se pisan con los menús (propuesta).** La bandeja escucha ↑ ↓ en `window` y no mira si otro control ya usó la tecla. Con un menú de la barra abierto (N2) sobre la bandeja, las flechas mueven a la vez el foco del menú y la selección de la lista. Además, la selección cambia pero el foco no la sigue. Propuesta: ignorar la tecla si `defaultPrevented` o si el foco está dentro de `[role=menu]`, y mover el foco a la fila elegida.

**G8. Menús de configuración sin cierre uniforme (propuesta).** El selector de columnas (D1) no se cierra con Esc ni con clic afuera; el menú de paneles (M1) se cierra con Esc solo porque lo maneja el día de partido. Propuesta: un comportamiento común de "popover" (Esc, clic afuera, foco devuelto al botón), reutilizando `useMenus` o `Modal`.

**G9. Estado que no se recuerda en Inicio (propuesta).** El filtro del mosaico de mensajes (Todos, Sin leer, Con acción) usa `useState` y vuelve a "Todos" al navegar, contra la regla de C4. Propuesta: pasarlo a `useSticky`. `src/ui/Home.tsx`.

---

## Preguntas abiertas

| Pregunta | Responsable | Para cuándo | Resolución |
|----------|-------------|-------------|------------|
| ¿Qué nivel de accesibilidad se compromete (`design/accessibility-requirements.md`)? Este documento toma como piso lo hecho en la etapa 6. | usuario + ux-designer | Antes de la próxima pantalla nueva | Sin resolver |
| ¿Las teclas 1 a 0 deben seguir el orden de `PAGES` o el de las secciones visibles? (G2) | usuario | Con la corrección de G2 | Sin resolver |
| ¿Qué acciones destructivas se pueden deshacer y cuáles necesitan confirmación? (G5) | usuario + game-designer | Antes de implementar G5 | Resuelta en parte: F6 en todo lo irreversible o con costo de la bandeja y el Mercado (`mercado.md` pregunta 46); quedan las vistas propias y las acciones masivas |
| ¿El celular necesita su propia forma de ver la ficha breve (pulsación larga) o alcanza con abrir la ficha? (G4) | usuario | Antes de implementar G4 | Sin resolver |
| No hay mapa del recorrido del jugador. Conviene escribirlo a mano desde `.claude/docs/templates/player-journey.md` antes de especificar pantallas nuevas. | usuario + ux-designer | Antes de la primera especificación de pantalla | Sin resolver |
