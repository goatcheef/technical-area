# Revisión de accesibilidad: Mercado de pases (fase 4)

> **Revisor**: accessibility-specialist · **Fecha**: 2026-11-15 · **Código revisado**: `34eb4fe` (el `src/` es el de `184c7f4`; la revisión visual no tocó código)
> **Nivel comprometido**: Estándar (`design/accessibility-requirements.md`): WCAG 2.1 AA más 2.5.8 y 2.4.11 de WCAG 2.2. En el celular, 44 px para los objetivos táctiles: AM-09 lo pide para la acción principal y la sección 11 de la especificación para todos.
> **Alcance**: los requisitos que la sección 12 de `design/ux/mercado.md` le asigna al Mercado (AV-01 a 04, 06 a 09 y 13; AM-01 a 03, 07 y 09; AC-01 a 03, 05 a 07 y 09) en `Market.tsx`, `deal.tsx`, `PlayerTable.tsx` (`onPick`), `Seg` y `Modal` de `common.tsx`, `NegotiationModal` (`Locker.tsx`), la caja de oferta de la ficha (`PlayerPage.tsx`), las decisiones de tratos en `Inbox.tsx`, `styles.css` y las insignias de `App.tsx`.

## Accesibilidad: NO CUMPLE (nivel Estándar)

La base está bien resuelta. El foco nunca queda tapado: se midió parada por parada en 1440, 1024, 390, 320 × 568, 320 × 256 y con zoom al 200 %. El contraste pasa en los 86 clubes y nada depende solo del color. Las respuestas y las notas van en `role="status"`. Las confirmaciones devuelven el foco. Espacio sobre un control activa ese control y nunca avanza el día. No hay desborde lateral en 320 px. El movimiento reducido apaga todo. La ficha breve ahora se cierra con Esc y aparece con el foco. axe no encuentra ninguna infracción en las pantallas del Mercado.

Quedan siete fallas del nivel. Cinco son de WCAG A/AA. **La tabla no se puede ordenar con el teclado (2.1.1).** **La fila que se elige con Enter no tiene nombre ni estado en el árbol de accesibilidad (4.1.2).** **Al firmar, el foco cae al `body` y Tab sale de la ventana modal (2.4.3).** **El formulario bloqueado y el botón "Ofertar ▸" de la ficha no llegan a 4,5:1 (1.4.3).** **Un monto inválido no se anuncia (4.1.3).** Las otras dos son del proyecto: los objetivos táctiles del Mercado no llegan a 44 px (AM-09 y la sección 11) y los encabezados de Movimientos miden 10,6 px (AV-04). Cada arreglo es acotado (sección 5).

---

## 1. Cómo se probó

- Chromium (Playwright) contra `npm run dev` (http://localhost:5173), con partida nueva con Independiente. Los tratos se armaron con las funciones del motor, como en `tests/ui/mercado.cjs`. Hubo uno de cada estado: esperando respuesta, contraoferta, acuerdo de compra, préstamo acordado, retirado, cancelado (bloqueo de 14 días) y una oferta por un jugador propio. También se probó con el libro cerrado (2 de marzo).
- axe-core 4.14.0, instalado en el scratchpad y no en el repo, con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`. Corrió en 32 estados (sección 3).
- Tamaños: escritorio 1440 × 900 (con panel) y 1024 × 768 (sin panel). Celular 390 × 844 con toque. Reflujo a 320 × 568 y 320 × 256. Zoom del 200 % emulado con 640 × 400 (1280 × 800 al 200 %). Texto del juego al 120 %. Espaciado de texto de 1.4.12 inyectado por CSS.
- Foco tapado (2.4.11): en cada parada de Tab se miró qué elemento hay en el centro y en cuatro puntos interiores (`elementFromPoint`). El primer recorrido marcó como "tapadas" las esquinas de botones redondeados, porque Chrome respeta el `border-radius` al buscar el elemento. Se repitió descontando los ancestros, y entonces no quedó ningún foco tapado.
- Árbol de accesibilidad leído por CDP (`Accessibility.getFullAXTree`) para la fila de la tabla, las pestañas y el panel.
- Deuteranopía y acromatopsia emuladas por CDP, con el ajuste `cvd` y sin él. Movimiento reducido con `prefers-reduced-motion` y con el ajuste del juego.
- `node tools/check-contrast.mjs`: 0 fallas (tinta sobre el acento ≥ 4,58; `--sel` ≥ 4,96 sobre `--panel2`). `node production/ui/mercado/contraste.mjs`: 0 fallas en los 54 pares y en los 86 clubes.
- Scripts en el scratchpad de la sesión: `/tmp/claude-0/-home-user-technical-area/76ec2d0e-cad7-592f-9aa5-d997ca7a1c22/scratchpad/a11y/` (`audit.cjs` con las partes `desktop`, `walks`, `phone`, `tiny`, `zoom` y `vision`, más `probe*.cjs`). Resultados en `out/results-*.json` y capturas en `out/`. El scratchpad es temporal.

**NO EVALUADO**: un lector de pantalla real (NVDA, VoiceOver). Los anuncios se revisaron en el árbol de accesibilidad y en el contenido de las regiones vivas, sin escucharlos. El nivel Estándar no exige lector de pantalla completo, pero sí que nombre, rol y estado sean correctos (4.1.2) y que los mensajes de estado se puedan determinar por programa (4.1.3). Eso sí se evaluó.

---

## 2. Requisitos aplicables

| Requisito | Estado | Evidencia |
|---|---|---|
| **1.3.1** Información y relaciones | Cumple | Grupos de Tratos como `section` con `aria-labelledby` en su `h3` (`Market.tsx:264-268`); impacto en `table` con `th scope="row"` (`deal.tsx:113-119`); datos del panel en `dl` (`deal.tsx:359-367`); filtros con `label` envolvente; panel como `aside` "Jugador elegido". |
| **1.4.1** Uso del color (AV-08) | Cumple | Estado del libro, veredictos, plazos y estados de trato en palabra + ícono (✓ entra, ! puede no entrar, ✗ no entra, "Vence mañana", "Esperando", "Contraoferta"). En acromatopsia emulada, la fila elegida se distingue por contorno y peso, y la pestaña activa por ✓ (capturas `v-achromatopsia-*`). Montos negativos con "−". |
| **1.4.3** Contraste (mínimo) (AV-01, AV-02) | **No cumple** | Los tokens y los 86 clubes pasan (los dos scripts dan 0 fallas). Fallan dos cosas: (a) la caja de oferta bloqueada atenúa todo el formulario con `opacity: .55` (`styles.css:934`, `deal.tsx:306`) y queda en 3,08:1 sobre `--panel` y 2,88:1 sobre la tabla de impacto (17 nodos según axe). El campo sigue habilitado, así que no entra en la excepción de "componente inactivo"; (b) "Ofertar ▸" en la banda de la ficha (`PlayerPage.tsx:75`) tiene texto `--text` sobre el acento del club del jugador (`styles.css:577` y `:579`), con valores de 1,58 a 3,62:1 en los seis estados probados. |
| **1.4.4** Texto al 200 % | Cumple | 640 × 400 (200 % de 1280 × 800) en Buscar, Tratos, Presupuesto y la ficha: sin desborde ni pérdida (`z200-*`). Texto del juego al 120 % en 1280: sin desborde. |
| **1.4.10** Reflujo a 320 px | Cumple | Sin desplazamiento lateral de página en las cinco pestañas, la ficha, la bandeja y la negociación, en 320 × 568 y 320 × 256. Las pestañas del Mercado son una tira que se desplaza sola y lleva el foco a la vista (`common.tsx:198`). Nota: en 320 × 256 las barras fijas de arriba y de abajo ocupan unos 118 de los 256 px. Es global, no rompe el criterio, pero deja poco lugar (ver 6). |
| **1.4.11** Contraste sin texto (AV-03) | Cumple | Foco `--sel` ≥ 4,96:1, borde de la pestaña activa ≥ 6,68, relleno de los medidores `--accent-hi` ≥ 4,35 en los 86 clubes (`contraste.mjs` 44-51). |
| **1.4.12** Espaciado del texto | **Parcial** | Con el espaciado de 1.4.12 no se pierde texto en Tratos, la ficha ni Presupuesto. En la tabla de Buscar y Seguimiento los encabezados se cortan con "…" ("Cono…", "Valor U…", "Pedido …", "Contra…"): `.ptable th { overflow: hidden; text-overflow: ellipsis }` (`styles.css:171`) más anchos fijos por columna (`COLS[k].w`). El nombre completo solo está en el `title`. Ver B9. |
| **1.4.13** Contenido al pasar el puntero o enfocar (AC-06) | Cumple | La ficha breve aparece con el mouse y con el foco, y Esc la cierra sin mover el puntero (medido en Tratos). |
| **2.1.1** Teclado (AM-01) | **No cumple** | Los cuatro recorridos se completan con el teclado (sección 4). **Ordenar la tabla no**: `<th onClick>` sin foco, sin botón y sin `aria-sort` (`PlayerTable.tsx:233`). En el Mercado no hay otro camino para ordenar por valor, pedido, edad o conocimiento. |
| **2.1.2** Sin trampa de teclado | Cumple | Las ventanas se cierran con Esc; ninguna parada atrapa el foco. |
| **2.1.4** Atajos de una tecla (AM-03) | Cumple | El Mercado no agrega atajos globales. Espacio en la fila marca la casilla, Enter elige y ↑ ↓ Inicio Fin Re Pág Av Pág mueven el foco. Todo eso vive en el `tbody` y solo actúa con la fila enfocada (`PlayerTable.tsx:185-203`), así que entra en la excepción de 2.1.4 ("activo solo cuando el componente tiene el foco"). Con `singleKeys === false`, Espacio en la fila sigue marcando la casilla, como Espacio en una casilla nativa, y no avanza el día; Espacio en el `body` o en la pestaña activa no hace nada; un dígito con la fila enfocada no cambia de pantalla. Con los atajos encendidos, "2" con una fila enfocada abre la bandeja (atajo global de `App.tsx:141`): es lo esperado y se apaga con el ajuste. |
| **2.4.3** Orden del foco (AM-07) | **No cumple** | El orden sigue el visual en Buscar, el panel, Tratos y la ficha. La negociación rompe el ciclo de la ventana: (a) después de "Confirmar: fichar…" el foco cae al `body` y el siguiente Tab va a "Saltar al contenido", **fuera de la ventana con `aria-modal`**; (b) cuando el representante se levanta de la mesa, el foco también cae al `body`, aunque Tab vuelve a "Listo". `Locker.tsx:129-137`, `:165-173`. |
| **2.4.6** Encabezados y rótulos (AC-09) | Cumple | `h2` "Mercado de pases", `h3` por grupo y por caja de oferta. La ventana de negociación toma su nombre del `h2` por `aria-labelledby` ("Contrato con Independiente"). |
| **2.4.7** Foco visible (AV-09) | Cumple | Contorno `--sel` en todas las paradas del Mercado (0 paradas sin anillo dentro del Mercado). |
| **2.4.11** Foco no tapado (AV-09) | Cumple | 0 paradas tapadas en 1440 (cinco pestañas, ficha, negociación, bandeja), 1024, 390, 320 × 568, 320 × 256 y 200 %. |
| **2.5.3** Etiqueta en el nombre | Cumple en el Mercado | Las pestañas se llaman "Tratos, 4 decisiones del mercado" y contienen el texto visible. Las opciones de tratos en la bandeja que marca la regla experimental de axe contienen el texto visible con otra puntuación ("Para decidir. Contraoferta, Atl. Tucumán. Atl. Tucumán pide…"), así que pasan. |
| **2.5.8** Tamaño del objetivo (24 px) | Cumple | Por debajo de 24 px quedan las casillas (13 px, pero la celda entera es el objetivo, 34 × 41), los nombres en las filas (18 px, dentro de la fila), los controles deslizantes (16 px) y los enlaces de texto ("Ver la ficha", "Ver las finanzas del club ▸"). Todos pasan por la excepción de espaciado o por estar dentro del texto: un círculo de 24 px no toca otro objetivo. |
| **AM-09 / sección 11** Objetivos táctiles de 44 px | **No cumple** | En 390 px: botones de las tarjetas y de la caja 40 px ("Aceptar US$ 20 mil", "Ofertar compra", "Negociar contrato"); vistas y líneas de la tabla 25 px; "Columnas" 32; "Filtrar por nombre" 30; campo "Mejorar" 36; "Ver en Tratos" 32; en la negociación, Años y Rol 27 px y "Cancelar" 32. La bandeja ya resolvió esto con `min-height: 44px` (`styles.css:819-847`); el Mercado no tiene esas reglas. |
| **AV-04** Tamaños mínimos | **No cumple** | Movimientos: encabezados y celdas `.r`/`.hide-sm` de 10,6 px (`th` global, `styles.css:64`, a `.68rem`): está debajo del piso de 11 px. Por debajo de los 12 px que pide la especificación: el `h3` de la caja de oferta 11,2 px, el contador "400 jugadores." y "Ver la ficha" del historial 11,8 px. |
| **AV-07** Modo para daltonismo | Cumple | Con `cvd`, el ícono del libro abierto pasa a azul; los veredictos y montos usan los tokens que cambia el modo (`contraste.mjs` 20c-43c). |
| **AV-13** Estado de los controles | **Parcial** | Pestañas del Mercado, vistas, líneas, "Solo transferibles" y "Seguir" con `aria-pressed` y ✓ (el árbol muestra `pressed=true`). **Las pestañas de la ficha** ("Contrato y mercado", camino a la caja en ≤ 1180 px) solo cambian la clase `.on`, sin `aria-pressed` ni `aria-selected` (`PlayerPage.tsx:69`). |
| **3.2.1 / 3.2.2** Al recibir el foco / al cambiar | Cumple | Enfocar una tarjeta solo cambia `sel` en la ruta, no la pantalla. Ver A3 sobre el foco al entrar a Tratos. |
| **3.3.1** Identificación de errores | Cumple | Un monto mayor que lo libre deshabilita "Ofertar compra" y lo explica en texto, en `#bid-why`, que el campo nombra con `aria-describedby` (`deal.tsx:307`, `:317`). |
| **3.3.2** Etiquetas o instrucciones | Cumple con nota | Los campos de monto tienen `label`. "Filtrar por nombre" solo tiene `placeholder` (`PlayerTable.tsx:215`): el nombre existe para el árbol de accesibilidad, pero el rótulo visible desaparece al escribir y con el espaciado de 1.4.12 se corta ("Filtrar por nomb"). Ver A2. |
| **4.1.2** Nombre, rol y valor | **No cumple** | La fila de la tabla con foco itinerante, la que se elige con Enter, aparece en el árbol de Chrome como `row` con **nombre vacío**, sin estado de elegida (el `aria-selected` se descarta fuera de `grid`) y dentro de una `table` sin nombre (`PlayerTable.tsx:228`, `:237-238`). La especificación pide `grid` o `listbox` y un nombre de fila (sección 12, G3). Las pestañas de la ficha no exponen su estado (AV-13). `.stars` de la ficha lleva `aria-label` en un `span` sin rol (`PlayerPage.tsx:175`; axe: `aria-prohibited-attr`). |
| **4.1.3** Mensajes de estado | **Parcial** | Cumplen: nota de resultado (`role="status"`, `deal.tsx:149`), respuestas del club y cambio del libro (región `aria-live` en la franja, `Market.tsx:99`), cantidad de jugadores (`PlayerTable.tsx:218`), historial del representante (`role="status"`, `Locker.tsx:165`). **No cumple**: con un monto inválido, Enter en el campo no hace nada y no se anuncia el motivo. `#bid-why` no es región viva y el campo no lleva `aria-invalid` (`deal.tsx:218-228`, `:294-296`, `:317`). Tampoco se anuncian el aviso "superás el tope" de la negociación (`Locker.tsx:164`) ni el impacto al cambiar el monto. La especificación pide este último (anuncio a los 500 ms). |
| **AM-02** Espacio sobre un control | Cumple | Espacio en "Retirar la oferta" retira la oferta y no avanza el día; Espacio en el control deslizante, en la pestaña o en la fila tampoco avanza. |
| **AM-07** Ventanas | **Parcial** | `Modal` atrapa Tab, cierra con Esc, devuelve el foco ("Seguir negociando" tras Esc) y se nombra por `aria-labelledby`. Falla el caso de 2.4.3: el foco se pierde dentro de la ventana. Desvío: el foco inicial cae en "Cancelar" y no en "Sueldo mensual" (sección 12 de la especificación). |
| **AC-01 a AC-03** | Cumple | Avanzar con una decisión abierta deshabilita las acciones con "Frená el avance para decidir"; los plazos se muestran en palabras; nada se cierra solo. |
| **AC-05** Explicaciones fuera del `title` | Cumple en el Mercado | Paciencia, costo de cancelar, plazo de respuesta y cláusula, en texto visible. Solo queda en el `title` el nombre largo de las columnas (B9). |
| **Movimiento reducido** (AV-10) | Cumple | Con `prefers-reduced-motion`, 0 transiciones o animaciones en `.mk`. Sin la preferencia hay transiciones de 0,06 a 0,15 s, y el ajuste del juego (`.reduce-motion`) las apaga todas (`styles.css:247`). |

---

## 3. axe-core por estado

Infracciones (`violations`) por estado. `.tn-me` es el botón del menú del DT en la barra superior (fuera del Mercado, sección 6). "Incompletos" son los casos que axe deja para revisar a mano: todos son de `color-contrast` sobre degradés o transparencias, y los cubre `contraste.mjs`, salvo el `.mk-off` de B4.

| Estado | Tamaño | Infracciones del Mercado | Otras infracciones en la página |
|---|---|---|---|
| Buscar, Tratos, Seguimiento, Movimientos, Presupuesto | 1440 | 0 | `label-content-name-mismatch` en `.tn-me` |
| Buscar con el panel: formulario, monto inválido, esperando respuesta | 1440 | 0 | ídem |
| Tratos: después de aceptar la contraoferta, con la confirmación de venta abierta, con el libro cerrado | 1440 | 0 | ídem |
| Negociación: abierta, con acuerdo | 1440 | 0 | ídem |
| Negociación después de firmar | 1440 | 0 | ídem, más `target-size` en "Atrás" y el escudo de la barra (tapados por el fondo de la ventana; efecto del foco perdido, B3) |
| Ficha › Contrato y mercado: contraoferta, acuerdo, préstamo, esperando, libre | 1440 | `color-contrast` 1 ("Ofertar ▸", B5) · `aria-prohibited-attr` 1 (`.stars`, B7) | `.tn-me` |
| Ficha › Contrato y mercado: bloqueado | 1440 | `color-contrast` 18 (17 por `.mk-off`, B4; 1 por "Ofertar ▸", B5) · `aria-prohibited-attr` 1 | `.tn-me` |
| Bandeja: contraoferta, acuerdo, oferta por un jugador propio | 1440 | 0 (las 18 opciones que marca `label-content-name-mismatch`, regla experimental, contienen el texto visible: pasan, ver 2.5.3) | `.tn-me` |
| Buscar, Buscar con los filtros abiertos, Tratos, Seguimiento, Movimientos, Presupuesto | 390 | 0 | 0 |
| Ficha › Contrato y mercado (contraoferta) | 390 | `color-contrast` 1 (B5) · `aria-prohibited-attr` 1 (B7) | 0 |
| Bandeja (contraoferta), negociación | 390 | 0 | 0 |

axe no detecta B1, B2, B3, B6 ni B8, que son las fallas más importantes. Salieron de los recorridos con el teclado, del árbol de accesibilidad y de las mediciones.

---

## 4. Recorridos solo con el teclado

| Tarea | Resultado | Detalle |
|---|---|---|
| **Ofertar por un jugador** (1440, Buscar) | Se completa | Hacen falta 21 Tab desde el `body` hasta la tabla (pestaña, seis filtros, cinco vistas, Columnas, cinco líneas, filtro por nombre, casilla "Seleccionar todos"). Después: ↓ ↓, Enter (el foco va a "Oferta (US$)"), escribir el monto y Enter. Queda "Esperando respuesta", el foco va a la nota "Oferta enviada a Talleres. Responde entre el 11 ene y el 13 ene." (`role="status"`) y el día no avanza. Esc vuelve a la fila elegida. **Hueco**: para un lector de pantalla, la fila no tiene nombre ni estado (B2). Un monto inválido + Enter no hace ni dice nada (B6). |
| **Responder una contraoferta** (Tratos) | Se completa | Foco en "Aceptar US$ 20 mil" y Enter: el trato pasa a acordado, se lee "Aceptaste el pedido de Aldosivi…" y el foco va a "Negociar contrato" de la misma tarjeta. También funciona desde la bandeja. |
| **Fichar después de negociar** (Tratos → ventana) | Se completa, con foco perdido | Enter en "Negociar contrato" abre la ventana con el foco en "Cancelar" (la especificación pide "Sueldo mensual"). Tab recorre Sueldo, Prima, Cláusula, Años 1-5, Rol, Cancelar y Ofrecer. Enter en "Ofrecer" lleva el foco a "Confirmar: fichar a …, US$ 1,44 M + prima US$ 10 mil", y Enter firma. **Después el foco queda en `body`, Tab sale a "Saltar al contenido" detrás de la ventana** y solo Esc la cierra (el foco va a "Siguiente para responder") (B3). |
| **Responder una oferta por un jugador propio** (Tratos y bandeja) | Se completa | Enter en "Aceptar" abre "Confirmar: vender a Facundo Zabala a Boca Juniors por US$ 3 M" con el foco (visible). Esc cancela y vuelve a "Aceptar". Enter vende, y el foco va a "Siguiente para responder" o a "Siguiente pendiente" con la nota en `role="status"`. |
| Ordenar la tabla por pedido o por edad | **No se puede** | B1. |

---

## 5. Infracciones, de la más grave a la menos grave

Todas son **BLOQUEANTES** para el nivel Estándar. La severidad usa la escala del proyecto.

| # | Infracción | Criterio | Sev. | Dónde | Arreglo |
|---|---|---|---|---|---|
| **B1** | Las columnas de la tabla del Mercado (Buscar y Seguimiento) no se pueden ordenar con el teclado: `<th onClick>` sin foco, sin rol de botón y sin `aria-sort`. Es la herramienta principal para comparar precios. | 2.1.1 (A); AM-01 | S2 | `src/ui/PlayerTable.tsx:233-234` | Poner un `<button className="linkish">` dentro de cada `th` con el mismo `onClick` (Mayús + Enter suma un criterio) y `aria-sort="ascending" / "descending"` en el `th` ordenado. El rótulo largo de `title` va en el botón como `aria-label` o con `.vh`. Arregla también el ordenamiento del Plantel. |
| **B2** | La fila con foco itinerante no tiene nombre (el árbol de Chrome muestra `row` con nombre vacío), no expone que está elegida (`aria-selected` se descarta fuera de `grid`) y la tabla no tiene nombre. Con lector de pantalla no se sabe qué jugador está enfocado ni cuál está elegido. | 4.1.2 (A); G3 de la especificación | S2 | `src/ui/PlayerTable.tsx:228` (tabla), `:237-238` (fila) | Con `onPick`: `role="grid"` y `aria-label="Jugadores del mercado"` en la tabla (`aria-rowcount` si se recorta a 100). En la fila, `aria-label` con nombre, puesto, club, edad, valoración (rango) y pedido, como pide la sección 12. `aria-selected` queda válido dentro de `grid`. Alternativa: `aria-describedby` hacia una celda oculta con "Elegido". |
| **B3** | En la negociación, el foco se pierde: al firmar o renovar desaparece "Confirmar" y no hay a dónde ir (el pie con "Listo" no se muestra porque `agreed` sigue cargado), así que el foco cae en `body` y Tab sale a la página de atrás con la ventana abierta. Cuando el representante se levanta de la mesa pasa lo mismo, aunque Tab vuelve a "Listo". | 2.4.3 (A); AM-07 | S2 | `src/ui/Locker.tsx:129-137` (`confirm`), `:115-128` (`send`), `:169-173` (pie condicionado a `!agreed`) | En `confirm` hacer `setAgreed(null)` junto con `setOver(...)` para que aparezca "Listo", y enfocar `.ib-result` (con `tabIndex={-1}`) o "Listo" en un efecto después del render. En `send`, cuando `r.walk`, enfocar "Listo". Para que nunca se escape, el `keydown` de `Modal` (`common.tsx:178-182`) tendría que llevar a `first` cualquier Tab que salga con el foco fuera de `el`. |
| **B4** | La caja de oferta bloqueada (después de cancelar un trato) atenúa todo el formulario con `opacity: .55`: rótulo "Oferta (US$)", notas, título y tabla de impacto quedan en 3,08:1 y 2,88:1. El campo sigue habilitado y las notas no son controles, así que no aplica la excepción de componente inactivo. | 1.4.3 (AA); AV-01 | S2 | `src/styles.css:934` (`.mk-off`), `src/ui/deal.tsx:306` | Sacar la opacidad. Para marcar que no se puede ofertar alcanza el bloque "Cancelaste el trato…" con ✗ y los botones deshabilitados. Si se quiere atenuar algo, solo los botones deshabilitados, o `--dim` (6,99:1) en vez de opacidad. Además, deshabilitar o hacer `readOnly` los dos campos mientras dure el bloqueo. |
| **B5** | "Ofertar ▸" en la banda de la ficha del jugador ajeno (el camino a la caja de oferta): texto `--text` #f1f2fa sobre el acento del club del jugador, entre 1,58:1 (#3ddc97) y 3,62:1 (#f03134) en los seis estados probados. La regla global de tinta sobre el acento (≥ 4,58 en 86/86) no llega acá porque `.pband-tabs > .btn` fija `color: var(--text)`. | 1.4.3 (AA); AV-01 | S2 | `src/styles.css:577` y `:579`; `src/ui/PlayerPage.tsx:75` | Agregar `color: var(--accent-ink)` a `.pband-tabs > .btn.primary` (`:579`). |
| **B6** | Con un monto inválido (mayor que lo libre, debajo del mínimo, bloqueo), Enter en el campo no hace nada y no anuncia nada. El motivo aparece en `#bid-why`, que no es región viva, y el campo no lleva `aria-invalid`. Quien no ve la pantalla aprieta Enter y no sabe por qué no salió la oferta. Lo mismo pasa en "Pedir préstamo": su campo ni siquiera nombra el motivo (`whyLoan`). Con el bloqueo, `#bid-why` queda vacío porque el motivo está arriba, fuera de la asociación. | 4.1.3 (AA); 3.3.1 | S3 | `src/ui/deal.tsx:218-228` (`Amount`), `:294-296` (`bid` sale sin aviso), `:307`, `:317`, `:320-323` | `aria-invalid` en `Amount` cuando hay motivo; `#bid-why` (y un `#loan-why` nuevo) con `role="status"`, siempre presente. Si Enter llega con motivo, que se repita en la región o que el foco vaya al texto. Cuando hay bloqueo, poner el texto del bloqueo en `#bid-why` o sumar su `id` al `aria-describedby`. IDs propios por instancia (`useId`) en vez del fijo `bid-why`. |
| **B7** | `.stars` (valoración y potencial en la banda de la ficha) lleva `aria-label` en un `span` sin rol: el nombre no se expone. | 4.1.2 (A) | S3 | `src/ui/PlayerPage.tsx:175` | `role="img"` en el `span` (el `aria-label` ya dice "2 estrellas de 5"). |
| **B8** | Objetivos táctiles por debajo de 44 px en el celular. La acción principal de cada tarjeta y de la caja mide 40 px, lo que incumple AM-09, que pide 44 para "la acción principal". Vistas y líneas de la tabla miden 25 px, "Columnas" 32, el filtro por nombre 30, "Mejorar" 36, "Ver en Tratos" 32, y los segmentos Años y Rol de la negociación 27, contra los 44 de la sección 11 para todos. | AM-09; sección 11 de la especificación (2.5.8 sí se cumple) | S3 | `src/styles.css` (no hay reglas `≤ 760 px` para `.mk-card .btn`, `.mk-bid .btn`, `.mk-improve`, `.ptable-bar .seg button`, `.mk-neg .seg button`) | Copiar el bloque de la bandeja (`styles.css:819-847`): en `@media (max-width: 760px)`, `min-height: 44px` para `.mk .btn`, `.mk-bid .btn`, `.mk .seg button`, `.mk input`, `.ptable-bar input[type=search]` y `.modal .seg button, .modal .btn.sm`. |
| **B9** | Movimientos usa el `th` global de `.68rem`: encabezados y celdas `.r`/`.hide-sm` de 10,6 px, debajo del piso de 11 px de AV-04 y de los 12 px que la especificación pide en el Mercado. Además, con el espaciado de 1.4.12, los encabezados de la tabla de Buscar se cortan con "…" y el nombre completo queda solo en `title`. | AV-04 (proyecto); 1.4.12 (AA) | S4 | `src/styles.css:64`, `:171`, `:1007-1008`; `src/ui/Market.tsx:341` | `.mk-moves th, .mk-moves td { font-size: max(12px, .86rem) }`. En `.ptable th`, `white-space: normal` con dos líneas, o contar el ancho del rótulo en `COLS[k].w` para que `PRIO` oculte columnas en vez de cortar texto. Al convertir los encabezados en botones (B1), el nombre completo también va en el nombre accesible. |

---

## 6. Heredadas o globales que se ven en el Mercado

No son código del Mercado. Las registro para que alguien las tome.

- **`.tn-me` (menú del DT, barra superior)**: `aria-label="Menú del DT"` no contiene el texto visible ("Director Técnico · Prestigio 60"). Es una falla de 2.5.3 (A) en todas las pantallas de escritorio (axe, `label-content-name-mismatch`). Arreglo: `aria-label="Director Técnico, menú"` o sacar el `aria-label` y dejar el texto.
- **Campo "Buscar jugador" de la barra superior**: no muestra anillo de foco (ni `outline` ni `box-shadow`) en ninguna pantalla. Hay que confirmarlo en `TopNav.tsx` y en `styles.css`. Es 2.4.7.
- **Barras fijas en 320 × 256**: la barra superior (unos 56 px) y la inferior (62 px) dejan unos 138 px para el contenido. 2.4.11 se cumple, pero conviene ocultar la barra inferior por debajo de unos 400 px de alto.
- **Orden de Tab en el celular**: después de "Saltar al contenido" viene la barra **inferior**, luego la superior y recién después el contenido. 2.4.3 no se rompe porque el enlace lleva al contenido, pero el orden no es el visual.

---

## 7. Desvíos de la especificación (no bloqueantes)

| # | Desvío | Dónde | Recomendación |
|---|---|---|---|
| A1 | Al entrar a Tratos (por la pestaña, por el menú o por la ruta), el foco salta solo al botón principal de la primera decisión, que muchas veces es "Aceptar US$ X", sin confirmación. Un segundo Enter por apuro o por repetición de tecla acepta la contraoferta. | `src/ui/Market.tsx:182-191` | Dejar el foco en la pestaña cuando se entra por la pestaña. Mover el foco a la tarjeta solo cuando la ruta trae un `sel` explícito, por ejemplo desde la insignia o la bandeja, y en ese caso al encabezado de la tarjeta (`.mk-card-t`, `tabIndex=-1`), no a un botón que decide. |
| A2 | "Filtrar por nombre" sin `label` (solo `placeholder`). | `src/ui/PlayerTable.tsx:215` | `aria-label="Filtrar por nombre"`, o un rótulo visible corto. |
| A3 | Pestañas del Mercado con foco itinerante en un `role="group"`: con lector de pantalla no se avisa que se recorren con ← →, y Tab saltea las otras cuatro. | `src/ui/common.tsx:193-203`; `src/ui/Market.tsx:58` | Con `roving`, `role="toolbar"` (que anuncia el uso de flechas) y `aria-label`, o `.vh` con "usá las flechas". |
| A4 | La negociación abre con el foco en "Cancelar" y no en "Sueldo mensual". | `src/ui/Locker.tsx:148`; `Modal` enfoca el primer control | Prop `initialFocus` en `Modal`, o `autoFocus` en `#neg-wage`. |
| A5 | No hay anuncio del impacto al cambiar el monto ("Presupuesto después de la oferta… Entra.", a los 500 ms) ni del aviso de tope en la negociación. | `src/ui/deal.tsx:310`; `src/ui/Locker.tsx:164` | Región `aria-live="polite"` con retardo, como pide la tabla de anuncios. |
| A6 | Entre 11 y 12 px: el `h3` de la caja (11,2 px), "400 jugadores." y "Ver la ficha" del historial (11,8 px). | `styles.css` (`.mk-bid h3`, `.dim.sm`, `.linkish.sm`) | Llevarlos a ≥ 12 px como dice la sección 12. |
| A7 | La región de la nota de la caja de oferta (`ResultNote`) se vuelve a montar cuando el trato pasa del formulario a `DealBlock`, porque cambia la rama del árbol. Una región viva que entra al DOM con texto no siempre se anuncia. Hoy no se pierde porque el foco va a la nota. | `src/ui/deal.tsx:278-287`, `:327` | Dejar `note` en el mismo lugar del árbol en las dos ramas. |

---

## 8. Lo que está bien y conviene no romper

- Foco nunca tapado en ningún tamaño, incluso 320 × 256 y 200 %. El panel `sticky` usa `--mk-top`.
- Espacio, Enter y las flechas de la tabla viven en el `tbody`, respetan `defaultPrevented` y no le ganan a la activación nativa. Ningún atajo nuevo de una tecla.
- Las confirmaciones en el lugar (F6) enfocan "Confirmar: …" con el texto completo de lo que pasa, Esc cancela y devuelve el foco a "Aceptar".
- Contraste: 0 fallas en 86 clubes en los dos scripts. Estados y veredictos en palabra + ícono, legibles en acromatopsia.
- Esc en el panel vuelve a la fila elegida (probado). Esc en los filtros del celular los pliega y devuelve el foco a "Filtros" (`Market.tsx:125`; leído en el código, no probado).
