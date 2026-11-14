# Revisión visual: Bandeja de entrada

> **Fase**: 4 de /team-ui (revisión)
> **Autor**: art-director
> **Fecha**: 2026-11-14
> **Contrato**: `production/ui/bandeja/visual-design.md` (no hay art bible) y `production/ui/bandeja/contraste-medido.md`
> **Implementación revisada**: `src/ui/Inbox.tsx`, `src/ui/msg.tsx`, bloque `/* portal: bandeja */` y reglas `.msg*` de `src/styles.css`, mosaico "Mensajes" de `src/ui/Home.tsx` (commit `59f0672`)
> **Capturas**: `production/ui/bandeja/shots/review/` (74, deviceScaleFactor 1). Script: `ad-review.cjs`, `ad-futbol.cjs` y `ad-over.cjs` en el scratchpad de la sesión

---

## Veredicto: NECESITA CAMBIOS

El diseño visual está bien llevado al código: tokens, escala tipográfica, anatomía de fila, bloque "Para decidir", tarjetas de entidad, cifras, marcador, estados vacíos y de búsqueda coinciden con el contrato, ningún texto queda por debajo de 12 px (medido en todas las resoluciones, también al 120 %) y la familia con el Inicio, Tácticas y el día de partido se sostiene. Pero **la fila de acciones no se ve**: en escritorio queda recortada a una franja de 17 px y en el celular queda escondida detrás de la navegación inferior. Es el corazón de la pantalla ("cada mensaje trae los botones para resolverlo"), así que no se puede aprobar hasta arreglarlo. Con eso y el reparto de la barra del celular resueltos, el resto son cambios menores.

---

## Cómo se revisó

- Partidas nuevas con cinco clubes que cubren los acentos: **Independiente** (rojo, tinta oscura, choca con el peligro), **Defensa y Justicia** (amarillo claro, choca con `--warn`), **Boca Juniors** (azul medio), **Tigre** (azul oscuro, tinta blanca) y **Gimnasia (LP)** (gris azulado, casi sin saturación). En cada una se jugó la primera fecha y se agregó una oferta real (mismos campos que `pushOffer`) para tener el bloque con conferencia y oferta.
- Resoluciones: 1024 × 768, 1440 × 900, 1920 × 1080, 880 × 900, 761 × 800 y 360 × 740. Texto al 120 % (el ajuste "Muy grande" pone la raíz en 16,8 px; se aplicó igual) a 1024, 1440 y 360. Modo `.cvd` a 1440.
- Las capturas con **`SIN-PARCHE`** muestran la pantalla tal como está. Para poder juzgar el resto, las demás se tomaron con un parche de revisión que solo anula el choque del hallazgo B1 (`.ib-actwrap.bar { height: auto; overflow: visible; … }`); las que dicen **`parche2`** además apoyan la barra del celular sobre la navegación inferior (B2). Ninguna toca otra regla.

---

## Hallazgos bloqueantes

### B1. La fila de acciones queda recortada a 17 px en todas las pantallas (regla `.bar` global)

- **Capturas**: `independiente-1440-decision-SIN-PARCHE.png`, `boca-1440-todo-el-futbol.png`, `tigre-1440-decision-SIN-PARCHE.png`, `defensa-…`, `gimnasia-…-SIN-PARCHE.png`; en el celular `independiente-360-detalle-SIN-PARCHE.png`.
- **Qué pasa**: `Panel` (`Inbox.tsx:535`) le pone a la envoltura la clase `ib-actwrap bar`. `.bar` ya existe como la barrita de progreso (`styles.css:75`: `height: 5px; overflow: hidden; background: var(--panel3); border-radius: 3px; min-width: 40px`). La envoltura queda en 5 px más el padding y con `overflow: hidden`: se ve una franja `--panel3` vacía donde deberían estar Aceptar, Pedir más, Ver la ficha, Rechazar, Responder, la ayuda y la nota F7. Medido: `.ib-actwrap` de 17 px de alto con 54 px de contenido. Pasa con cualquier mensaje que tenga acciones o nota de resultado, en cualquier ancho.
- **Qué cambiar**: no reutilizar `bar` como modificador. El contrato ya nombra la clase: **`.ib-actbar`** (sección 11). Cambiar `bar` por `ib-actbar` en `Inbox.tsx:535` y `.ib-detail .ib-actwrap.bar` por `.ib-detail .ib-actwrap.ib-actbar` en el bloque de 900 px. Agregar al test de aceptación una comprobación de que `.ib-acts` se ve entera (`getBoundingClientRect().height ≥ 38` y dentro del viewport del panel).

### B2. En el celular la barra fija queda detrás de la navegación inferior

- **Captura**: `independiente-360-detalle-SIN-PARCHE.png` (y, ya con B1 resuelto, `tigre-360-detalle.png`, `boca-360-detalle.png`).
- **Qué pasa**: `.ib-detail .ib-actwrap.bar { bottom: 0 }` (bloque de 900 px, especificidad 0,3,0) le gana a `.ib-detail .ib-actwrap { bottom: calc(62px + env(safe-area-inset-bottom, 0px)) }` (bloque de 760 px, 0,2,0). La barra queda en `bottom: 0`, tapada por la navegación inferior: los botones no se pueden tocar (Playwright no pudo apretar "Aceptar": "aside.side intercepts pointer events").
- **Qué cambiar**: en el bloque de 760 px, usar el mismo selector que el de 900 (`.ib-detail .ib-actwrap.ib-actbar { bottom: calc(62px + env(safe-area-inset-bottom, 0px)) }`). Con eso la barra se apoya sobre la navegación, como dice la sección 6.2 (`independiente-360-detalle-parche2.png`).

### B3. La barra del celular y de la ventana angosta no arma las dos filas: los botones se salen de costado

- **Capturas**: `independiente-360-detalle-parche2.png` ("Rechazar" cortado: "Rec"), `independiente-360-confirmar.png` ("Confirmar: vender a Rodrigo Rey por US$ 2.40 M" apretado en una columna de cinco renglones y "Ver la ficha" cortado), `independiente-360-confirmar-rechazo.png` (la barra desplazada de costado: "Confirmar rechazo" cortado a la izquierda), `independiente-880-detalle.png` y `independiente-761-detalle-completo.png` (cuatro columnas iguales: el primario no tiene su fila).
- **Qué pasa**: `.ib-detail .ib-acts { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr }` con `[data-primary], .ib-confirm { grid-column: 1 / -1; grid-row: 1 }`. Sin `grid-template-columns` no hay columnas explícitas, así que `1 / -1` abarca una sola columna y cada botón abre una columna nueva en la misma fila. Como la barra tiene `overflow-y: auto`, el desborde horizontal se vuelve un desplazamiento interno en vez de un desborde de página, y no salta en el chequeo de `scrollWidth`.
- **Qué cambiar** (sección 6.2: fila 1 el primario a todo el ancho, fila 2 los comunes y el peligro con columnas iguales, peligro último):
  ```css
  .ib-detail .ib-acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .ib-detail .ib-acts > .btn { flex: 1 1 0; min-width: 0; min-height: 44px; }
  .ib-detail .ib-acts > [data-primary], .ib-detail .ib-confirm { flex: 1 0 100%; order: -1; }
  ```
  La confirmación (`.ib-confirm`, grid `1fr auto`) ya queda bien cuando ocupa la fila entera. Agregar al test que, en el detalle, ningún botón de `.ib-acts` termine fuera de `innerWidth`.

---

## Hallazgos menores

### M1. Clubes con acento amarillo o naranja: la selección y el "sin leer" se confunden con "decisión" (9 clubes)

- **Capturas**: `defensa-1440-decision.png`, `defensa-1440-lista.png`, `defensa-360-lista.png`.
- **Qué pasa**: el principio 3 del diseño dice que el ámbar significa siempre "decisión que espera respuesta". Con Defensa y Justicia el `--accent-hi` es #ffe14d: la barra de la fila elegida, el contorno de foco, los puntos de sin leer, el borde de los chips activos y el título de lectura quedan del mismo amarillo que el riel y el encabezado del bloque (#ffb547). La fila elegida dentro del bloque se lee como una decisión más resaltada, y la columna de puntos amarillos parece una lista de pendientes. Con Olimpo y Argentino de Merlo es peor: su `--accent-hi` (#ffa24d) está a 7° de tono de `--warn`. El contraste pasa en todos los casos (no es un problema de lectura), pero se pierde el código de color de la pantalla. Afecta a Defensa y Justicia, Almirante Brown, Deportivo Madryn, Mitre (SdE), Arsenal, Dock Sud, Juventud Antoniana (#ffe14d, 14° de `--warn`), Olimpo y Argentino de Merlo (#ffa24d).
- **Qué cambiar**: que `clubTheme` devuelva un token de selección propio, `--sel`, igual a `--accent-hi` salvo cuando su tono esté a menos de 25° del de `--warn` con saturación alta; en ese caso, `--text` (#f1f2fa). Usarlo en la barra de la fila elegida, el contorno de foco de fila y el punto de sin leer (`.msg-dot`, que también usa el Inicio). Los chips activos ya tienen la ✓ como segunda marca y pueden quedar con el acento. Es un cambio global chico que se mide con el script de contraste existente.

### M2. Clubes rojos: "Aceptar" rojo y "Rechazar" rosado quedan en la misma familia (19 clubes)

- **Capturas**: `independiente-1440-decision.png`, `independiente-1440-confirmar-rechazo.png`.
- **Qué pasa**: con Independiente, River, Estudiantes (LP), Huracán, Argentinos, Newell's y otros 13, el primario se rellena con #e1475c o #eb4c55 y el peligro es texto #ff8a95 con borde rojizo. Con "Confirmar rechazo" abierto quedan dos botones rojos en la misma fila. La distancia (peligro al extremo derecho), el relleno contra el contorno y la palabra los distinguen, como pide la sección 8.3, así que no es un error. Pero la primera lectura de color dice "dos acciones peligrosas".
- **Qué cambiar** (dos opciones, elegir una): (a) dejarlo así, porque es la identidad del club y está todo marcado dos veces (recomendado por ahora); (b) para los acentos de tono entre 340° y 15°, que `.btn.danger` y `.btn.danger.strong` usen un rojo más frío o magenta, por ejemplo `--danger: #ff8ac8` solo en esos temas, para separarlo del rojo del club. Si se elige (b), volver a medir las filas 25, 26 y 40 de contraste.

### M3. A 1024 px el nombre del jugador en la tarjeta se corta a 6 letras (3 al 120 %)

- **Capturas**: `independiente-1024-decision.png` ("Rodrig…"), `independiente-1024-texto120.png` ("Rod…").
- **Qué pasa**: `.ib-ents` usa `minmax(240px, 1fr)`. A 1024 entran dos tarjetas de unos 260 px y, en la del jugador, `PosPill` y `Val` le ganan el lugar a un `b.ell`. El nombre es el dato principal de la tarjeta.
- **Qué cambiar**: dejar que el nombre ajuste en dos líneas (`.ib-who-n { flex-wrap: wrap }` y `b` sin `ell`) o subir el mínimo a `minmax(min(100%, 19rem), 1fr)` para que las tarjetas se apilen antes. La segunda opción también sigue al tamaño de texto.

### M4. Al 120 % las cifras parten el monto en dos renglones

- **Captura**: `independiente-1440-texto120.png` ("US$ 2.40 / M", "US$ 425 / mil").
- **Qué pasa**: `.ib-kpis` usa `minmax(128px, 1fr)` en píxeles y `.ib-kpi-v` tiene `overflow-wrap: anywhere`. Al 120 % siguen entrando cinco columnas de 148 px y el valor de 26 px no cabe. La sección 8.1 prometía que la retícula baja de 5 a 3 o 2 columnas.
- **Qué cambiar**: mínimo en rem, `minmax(9.5rem, 1fr)`, y `white-space: nowrap` en `.ib-kpi-v` (dejando `overflow-wrap` solo para la comparación de trabajo, si hace falta).

### M5. Entre 761 y 1060 px los chips de tema se cortan sin aviso

- **Captura**: `independiente-761-lista.png` ("Diri…" cortado en seco).
- **Qué pasa**: el degradé de máscara de `.ibchips` está solo en el bloque de 760 px. En la ventana angosta la fila se desplaza de costado (`chipsHidden: true` a 761), pero el borde es un corte recto que parece un error de maquetación.
- **Qué cambiar**: llevar `mask-image` y `padding-right: 24px` de `.ibchips` al bloque de 1060 px.

### M6. En el celular el chip "Para decidir" de la fila se come el título

- **Capturas**: `independiente-360-lista.png`, `defensa-360-lista.png` ("Mercado · Rodrigo …" / "Oferta de Racin…").
- **Qué pasa**: a 360 px el chip (unos 90 px), el punto y el chevron dejan unos 110 px para el título. La misma oferta ya está arriba, en el bloque, con su "!".
- **Qué cambiar**: en 760 px o menos, ocultar el texto del chip de la fila y dejar un "!" de 14 px en `--warn` dentro de un círculo de 22 px (con el texto en `.vh`), o bajarlo a la línea del remitente. Los chips neutros ("Ver informe", "Informe") se pueden ocultar en el celular: la acción está en el detalle.

### M7. Anillo de foco sobre el título al abrir el detalle en el celular

- **Capturas**: `independiente-360-detalle.png`, `tigre-360-detalle.png` (en `independiente-880-detalle.png` no aparece).
- **Qué pasa**: al abrir el detalle, el foco pasa al `h2.ib-h` (correcto para el lector de pantalla) y en algunas aperturas Chromium le aplica `:focus-visible`: queda un recuadro de acento alrededor del título, como si estuviera elegido. Habría que confirmarlo con un toque real; en la captura viene después de una navegación con la barra de comandos.
- **Qué cambiar**: si se confirma, dejar el foco sin anillo en el título (`.ib-h:focus-visible { outline: none }`). Es un destino de foco programático, no un control.

### M8. Chip de fila y ✓ del activo: dos detalles de forma

- **Qué pasa**: (a) la ✓ de `.ibchip.on` y `.seg button.on` es el carácter "✓" de la fuente (`content: '✓'`), no el SVG de 12 px con trazo 3 del manifiesto (`.seg-ck`). En Plus Jakarta Sans el carácter cae a una fuente de sistema y su grosor cambia según el sistema operativo. (b) `.ib-pend` del Inicio sigue con el ámbar en hex fijo (`rgba(255, 181, 71, .1)` y `.35`): con `.cvd` el pendiente del Inicio queda naranja mientras el bloque de la bandeja pasa a amarillo.
- **Qué cambiar**: (a) aceptable como está; si se quiere el trazo uniforme, usar un `mask-image` con el trazado del ✓ en el `::before`. (b) Pasar `.ib-pend` a `color-mix(in srgb, var(--warn) 10%, var(--panel))` y `color-mix(in srgb, var(--warn) 35%, transparent)`, igual que `.ib-block-h`.

---

## Desvío declarado: punto y negrita de los mensajes propios en "Todo el fútbol"

**Se aprueba.** Capturas: `boca-1440-todo-el-futbol.png` e `independiente-1440-todo-el-futbol.png`.

El diseño pedía que en ese alcance no hubiera punto porque son noticias y no tareas. Pero "sin leer" es un estado del mensaje, no del alcance: si el punto desaparece al cambiar de alcance, el mismo mensaje parece leído en una vista y sin leer en la otra, y el contador de la insignia y el botón "Marcar N como leídos" (que solo cuenta los propios) dejan de coincidir con lo que se ve. En la captura funciona bien: las noticias ajenas van en 500 `--dim` sin punto ("Instituto se refuerza con Juan Cruz Rivero") y los mensajes del DT resaltan entre ellas. La columna no se vuelve toda negrita porque las ajenas nunca la llevan. Condición: actualizar la sección 4.7 de `visual-design.md` ("En el alcance «Todo el fútbol» el punto y la negrita quedan solo para los mensajes propios; las noticias ajenas nunca los llevan"). Ojo con M1: en los clubes amarillos, ahí es donde más se nota la columna de puntos.

---

## Lo que está bien (contra el contrato)

- **Escala y tamaños**: ningún texto por debajo de 12 px en 360, 761, 880, 1024, 1440 y 1920, ni al 120 % (medición por elemento). Filas de 56 y 74 px como pide la sección 3.2 (63 y 83 px al 120 %). Objetivos de 44 px en el celular.
- **Retícula**: 554 / 830 px a 1440 (40/60) y 387 / 581 a 1024, sin desplazamiento horizontal propio de la bandeja en ningún ancho (el que aparece a 761 es de la barra superior, ver CONCERNS).
- **Lenguaje de "elegido"**: fondo `--accent-soft` y barra de 3 px `--accent-hi`. En la fila de decisión elegida el riel pasa a `--accent-hi`, como se decidió, y nunca hay dos barras pegadas. Chips y segmentado con borde de acento, ✓ y texto `--text`, sin relleno sólido.
- **Bloque "Para decidir"**: píldora con tinte ámbar, "!" y `.pdot` de 12 px; riel continuo; fila resuelta con ✓ neutro y "✓ Resuelto" escrito; bloque vacío neutro.
- **Panel de lectura**: tema en color de título portal, chips de estado ("Sin leer", "Resuelto", "Para decidir"), tarjetas planas dentro de la tarjeta, cifras sin color y con la palabra ("sobre su valor"), plazo con reloj, hechos con viñeta, cuerpo de 68ch, peligro al extremo derecho, ayuda siempre visible, nota F7 sin fondo con riel y "Siguiente pendiente" como único primario (`independiente-360-resuelto.png`).
- **Estados**: vista vacía con ícono del tema y texto (`independiente-1440-vacia.png`, "Marcar como leídos" desaparece), búsqueda con ✕, coincidencia en 800 subrayada y el bloque sin filtrar (`independiente-1440-busqueda.png`), lupa plegada por debajo de 1060 y desplegada a 220 px (`independiente-1024-busqueda-abierta.png`).
- **Modo `.cvd`**: rieles, "!", `.pdot` y plazo siguen al amarillo #f3d34a porque todo está escrito con `color-mix` sobre las variables (`independiente-1440-cvd.png`).
- **Tinta del primario**: Tigre con tinta blanca sobre #5c75ae, Independiente y Defensa con tinta oscura (`tigre-1440-confirmar.png`, `defensa-1440-confirmar.png`). El arreglo global de la decisión 1 está aplicado.
- **Ícono de fila (decisión 0.1)**: la columna izquierda se lee por tema y el "!" salta. La cara y el escudo quedan en el panel.

---

## Coherencia con el resto del juego

| Pantalla | Resultado | Notas |
|----------|-----------|-------|
| Mosaico "Mensajes" del Inicio (`independiente-inicio-mosaico.png`, `boca-inicio-mosaico.png`) | **Misma familia** | Las mismas clases `.msg*`, tamaños de 12 y 14 px, encabezado de día en píldora, punto `--accent-hi` y segmentado con ✓. Dos diferencias: el pendiente del Inicio (`.ib-pend`) pone la cantidad delante y sin "!", mientras el bloque de la bandeja va "!" + "Para decidir" + cantidad, y el ámbar del Inicio no sigue a `.cvd` (M8b). Alinear el orden ("!", texto, cantidad) es opcional. Las filas del Inicio no muestran el chip "Para decidir": está bien, el mosaico tiene su pendiente arriba |
| Tácticas (`independiente-tacticas-1440.png`) | **Coherente** | Cajas de cifras `.tkpis` y `.ib-kpi` del mismo tipo (`--panel2`, radio 10, valor 800). Segmentados con el mismo estado activo |
| Día de partido (`independiente-partido-1440.png`) | **Coherente** | El marcador `.ib-sc-n` replica a `.mb-score` (#0d0f22, borde `--line`, 800 tabular) a 30,8 px, con el guion en `--dim` en lugar de `--faint`, como pide el contrato. Los botones de velocidad usan el mismo activo con ✓ |
| Ficha de jugador | **Coherente** | El panel repite el orden de la banda en neutro y las tarjetas llevan a la ficha. El degradé del club sigue reservado para la ficha |

---

## Para el orquestador

- Antes de la fase 5, resolver B1 a B3 y volver a sacar `escritorio-decision`, `escritorio-confirmacion`, `escritorio-resuelto` y una captura del detalle del celular con oferta (las de `shots/` no muestran el choque: las de escritorio probablemente se tomaron antes de que la envoltura recibiera la clase `bar`, y `celular-detalle.png` es un mensaje sin acciones).
- M1 y M2 son decisiones de identidad que tocan `clubTheme` (global): llevarlas al usuario con las opciones.
- M3 a M8 se pueden hacer en la fase de pulido.
