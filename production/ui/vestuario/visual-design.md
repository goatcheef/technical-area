# Diseño visual: Vestuario

> **Fase**: 2 de /team-ui (diseño visual)
> **Autor**: art-director
> **Fecha**: 2026-11-15
> **Entrada**: `design/ux/vestuario.md` (secciones 5, 6, 10, 12 y lo visual de 15), `production/ui/bandeja/visual-design.md` y `production/ui/mercado/visual-design.md` (aprobados e implementados), bloques portal, bandeja y mercado de `src/styles.css`, `src/ui/deal.tsx`, `src/ui/Market.tsx`, `src/ui/PlayerTable.tsx`, `src/ui/Locker.tsx`, `src/ui/PlayerPage.tsx` (banda, `Cond`, `Gauge`), `src/ui/common.tsx` (`clubTheme`, `accentOf`, `Val`, `dec`, `Status`, `Seg`, `Modal`), `src/ui/msg.tsx` (`IC`, `TAG_ICON`).
> **Capturas del punto de partida**: `production/ui/vestuario/ref/` (Playwright, `deviceScaleFactor` 1, Independiente, 10 ene 2026, con un pedido de salida, una promesa, un suplente con la charla usada, un referente con conformidad 44 y 8 anotados en la reserva): Vestuario a 1440, 1024 y 390 px; la charla a 1440 y 390; ficha › Vestuario a 1440 y 390; banda de la ficha en Resumen; bandeja con el pedido elegido; Inicio.
> **Contraste**: `production/ui/vestuario/contraste.mjs` (adaptado de `production/ui/mercado/contraste.mjs`; acento con `tools/club-accent.mjs`). Todas las cifras de 10.2 son **medidas**. `node tools/check-contrast.mjs`: 0 fallas. `node production/ui/vestuario/contraste.mjs`: 0 fallas.
> **No hay art bible.** Lo que la bandeja y el Mercado ya decidieron se da por cerrado y acá solo se dice dónde se usa: sin mayúsculas, `--sel` para selección y foco, `--accent-hi` para lo activo, peligro bordeado, `--faint` nunca sobre `--panel3` ni en filas elegidas, nota F7 sin fondo, confirmación F6 en el lugar, un primario relleno por decisión, nada por debajo de 12 px, 44 px en el celular.
> **Este documento no escribe código.** Las clases para la fase 3 están en la sección 12.

---

## 0. Decisiones de este documento

Cada una se puede revertir sin tocar el resto. Las que conviene que el usuario mire primero llevan **(para el usuario)**.

1. **Una sola forma para las tres escalas ordinales, sin semáforo** **(para el usuario)**. Conformidad (5 palabras), moral (4) y armonía (4) se dibujan igual: una pista **cortada en tramos** en los cortes de sus palabras (la forma dice "esto es una escala con N escalones" y dónde cambia la palabra), el relleno con el largo del valor, el número siempre a la vista y la palabra. El relleno tiene **tres tonos y nada más**: `--bad` debajo de la línea del motor (conformidad y moral < 35; armonía < 45, donde el equipo ya rinde menos), `--dim` en el medio y `--text` arriba. Es un orden de luminosidad que se lee igual con cualquier tipo de daltonismo, y además la palabra de las bandas bajas va en 700. Hoy hay cinco escalas con verde, ámbar y rojo (`Cond` 85/65, `Bar` 60/35, bandeja 65/35, `Gauge` 60/30): el ámbar de "Conforme" chocaba con "para decidir" y el rojo contra el verde es el par que no ven los deuteranopes. Alternativa descartada (B): verde arriba en lugar de blanco; más festivo, pero con 30 filas verdes los 3 rojos dejan de saltar a la vista ("si todo grita, nada grita") y vuelve el par rojo-verde. Las escalas **no usan el acento del club**: en 24 clubes (Independiente, River, Huracán, Lanús…) el acento claro está a menos de 25° del rojo de `--bad` (medido, 10.2).
2. **El ámbar, solo para lo que espera tu respuesta y para el "!" de un aviso con costo.** La fila "Quiere irse" sin declarar transferible es la decisión `out<pid>` de la bandeja y se ve igual que allá: riel ámbar de 3 px y chip `.ib-tag.dec` "Para decidir". Los demás motivos llevan el "!" ámbar dentro de un chip neutro (el "aviso con costo" del Mercado, `.mk-st.bang`), sin tinte ni riel. La línea "Vestuario" del Inicio, que hoy se pinta toda de ámbar, pasa a texto normal. El chip "Molesto" de `Status` (hoy texto ámbar) pasa a la palabra de `moodOf` en un chip neutro con "!" (cambio global, sección 12).
3. **Encabezado neutro en lugar del "hero" con degradé del club** (captura `vestuario-1440.jpg`: 155 px de alto con un párrafo de ayuda repetido, un medidor con el rótulo "ARMONÍA" a 8 px en mayúsculas y los referentes sueltos). Pasa a una `.card` de unos 150 px con cuatro celdas y una franja de reserva, como la franja del Mercado. El degradé queda para la banda de la ficha (regla de la bandeja y del Mercado).
4. **Un primario relleno por decisión, y nunca en una lista.** Los botones de las filas de "Para atender" ("Hablar", "Declararlo transferible", "Ver transferibles en Plantel") son comunes de 32 px: con cuatro filas, cuatro botones rojos (Independiente) competirían entre sí. El primario vive en la `LockerCard` ("Hablar con él"; con la charla usada, "Declararlo transferible"), en la ventana ("Hablar", "Confirmar", "Listo") y en la bandeja, como hoy.
5. **La comparación de los dos caminos es texto, no tabla.** `vt-letgo` va en la caja de consecuencias de la bandeja (`.ib-conseq`: `--panel2` con riel neutro) con dos párrafos que empiezan por el nombre del camino en 700 y los números en 700; la frase de las ofertas va aparte con el ícono ⇄. Una tabla se leería más rápido con la vista, pero la especificación la usa como `aria-describedby` de dos botones y un lector de pantalla la leería como una lista de celdas sin encabezados. Es la misma pieza en las cuatro vistas.

---

## 1. Principios visuales de la pantalla

- **Arriba el grupo en una franja; después, a quién atender.** El encabezado es contexto: bajo, neutro, con números. "Para atender" es la tarea y es lo primero con peso visual.
- **Una escala, una forma.** Las palabras del humor se ven siempre con la misma pista cortada, el mismo número y la misma palabra, en la tabla, el panel, la ventana, la ficha, la ficha breve y la bandeja. La barra de minutos es otra cosa (una proporción con un umbral) y tiene otra forma: pista entera con una marca vertical.
- **Rojo = debajo de la línea del motor; ámbar = te toca a vos.** Solo lo que ya está costando (conformidad o moral debajo de 35, armonía que resta, minutos que le bajan la conformidad, una promesa que al ritmo de hoy no se cumple) lleva `--bad`, y siempre con número y palabra. La decisión lleva ámbar, como en la bandeja.
- **Los números no se pintan por dirección.** "14 → 32", "+5", "−6" se leen por el signo y la flecha (regla del Mercado).
- **Nada se mueve bajo el puntero.** Anotar en la reserva no cambia el ancho del botón; elegir una fila no cambia alturas; la confirmación de la charla reemplaza al botón en su lugar.

---

## 2. Tokens

### 2.1 Existentes que usa la pantalla

Los del bloque portal (`--panel` #1b1e36, `--panel2` #23274a, `--panel3` #2b3056, `--line` #363c66, `--line2` #2a2e50, `--text` #f1f2fa, `--dim` #a3a8c8, `--danger` #ff8a95) y los del bloque base (`--warn` #ffb547, `--good` #3ddc97, `--bad` #ff5d6c, `--info` #5aa9ff; en `.cvd`: #f3d34a, #4aa3ff, #f08c3a). De `clubTheme`: `--accent`, `--accent-ink`, `--accent-soft`, `--accent-hi`, `--sel`, `--band`.

| Token | Uso en el Vestuario |
|-------|---------------------|
| `--panel` | Encabezado, tarjeta "Para atender", tabla, panel, ventana de charla |
| `--panel2` | Chips, caja "Cómo está", `vt-letgo`, cita de la respuesta, línea del modo Reserva, hover de filas, botones comunes |
| `--panel3` | **Pista** de todas las escalas, de la barra de minutos y del arco de armonía; contador neutro. Sin texto `--dim` chico encima |
| `--accent-soft` compuesto sobre `--panel` | Fila elegida (lista y tabla), opción marcada de la charla, alternable "✓ Anotado" (`.btn.on`) |
| `--accent-hi` | Borde de la opción marcada, de los chips de filtro activos y del alternable activo |
| `--sel` | Riel de la fila elegida, anillo y punto del radio marcado, todos los focos |
| `--warn` | Riel y chip de "Para decidir"; ícono "!" de aviso con costo (chips de motivo, referente "Resta", reserva incompleta, "Puede pedir irse…", promesa en riesgo) |
| `--bad` | Relleno de escala, de minutos o de promesa **debajo de la línea**; arco de armonía < 45; texto de la nota de error |
| `--good` | Ícono ✓ ("Va bien", "Minutos prometidos", "cumpliste", "Le convenció") |
| `--danger` | Ícono ✗ ("Ya no llega", "no cumpliste", "Lo tomó mal") |
| `--dim` | Relleno medio de las escalas; relleno de minutos que no pesan; rótulos, consecuencias, regla de cada opción |
| `--text` | Relleno alto de las escalas; marca de umbral; números |
| `--band` | Solo la banda de la ficha (sin cambios) |

### 2.2 Nuevos

**Ningún token de color nuevo.** Las mezclas se escriben en la regla que las usa (así siguen a `.cvd`), y son las mismas de la bandeja: `color-mix(in srgb, var(--warn) 13%, var(--panel2))` en el chip "Para decidir" (es `.ib-tag.dec`).

**Variable de layout**: `--vt-top`, la altura de lo que queda fijo arriba (barra superior + barra de pantallas), medida en `Locker.tsx` como `--mk-top` en el Mercado; se usa **solo** en el `max-height` del panel (la especificación, pregunta 57, saca el `scroll-padding-top`: `.main` es lo que desplaza y la barra superior está fuera). `--bulkbar-h` (especificación 5.2) es el alto de la barra masiva, medido al dibujarla.

---

## 3. Tipografía, espaciado, radios y elevación

Plus Jakarta Sans, pesos 400 a 800, sin pesos intermedios en clases nuevas. Base 14 px. **Nada por debajo de 12 px** (0,86rem = 12,04 px es el mínimo; `.sm` global mide 0,84rem = 11,8 px y no se usa dentro de `.vt` ni de `.vt-scope` sin subirlo).

### 3.1 Escala

| Rol | Clase | Tamaño | Peso | Color |
|-----|-------|--------|------|-------|
| Título "Vestuario" (`h1`) | `.vt-title` | 1,55rem = 21,7 px (celular 1,4rem) | 700, −0,025em | `--text` |
| Estado de la armonía ("Clima normal") | `.vt-hstate` | 1,4rem = 19,6 px (celular 1,25rem) | 700, −0,02em | `--text` |
| "Armonía 62 de 100" y efecto en la cancha | `.vt-hsub` | 1rem = 14 px | 500; cifras 700 tabulares | `--dim`; cifras `--text` |
| Rótulo de celda del encabezado ("Qué la mueve", "Referentes") | `.vt-head-l` | 12 px | 600 | `--dim` |
| Término de "Qué la mueve" / valor | `.vt-parts` | 14 px 500 `--dim` / 14 px 700 tabulares `--text`; total 800 | | |
| Número dentro del medidor | SVG | 24 (de 110 de ancho) ≈ 26 px | 800 tabular | `--text` |
| Título de tarjeta "Para atender" | `h2.vt-att-t` | 1,08rem = 15,1 px | 700 | acento 62 % + blanco (título portal) |
| Nombre en la fila | `.vt-att-n` | 14 px | 700 | `--text` |
| Rol al lado del nombre | | 12 px | 500 | `--dim` |
| Causa | `.vt-att-c` | 14 px | 500; cifras 700 | `--text` |
| Consecuencia | `.vt-att-k` | 14 px | 500 | `--dim` |
| Chip de motivo | `.mk-st.vt-why`, `.ib-tag.dec` | 12 px | 700 | `--text` |
| Texto de la charla usada (`talkState`) | `.vt-talkst` | 12 px en filas y tabla, 14 px en la `LockerCard` | 600; fechas 700 `--text` | `--dim` |
| Número de escala | `.vt-scale-n` | 14 px | 700 tabulares | `--text` |
| Palabra de escala | `.vt-scale-w` | 14 px | banda baja 700 `--text`; las demás 500 `--dim` | |
| Celda de minutos ("20/62 %") | `.vt-mins-t` | 14 px | lo jugado 700 `--text`; "/62 %" 500 `--dim` | |
| Encabezado de columna (dentro de `.vt`) | `th` | 12 px | 600 | `--dim` (como el Mercado) |
| Nombre en el panel | `.vt-card-name` | 1,25rem = 17,5 px | 700 | `--text` |
| Título de sección de la `LockerCard` ("Por qué está así", "Charla") | `h3.vt-card-h` | 1rem = 14 px | 800 | `--text` (sin color: la tarjeta ya lleva su título) |
| Rótulo / dato de la `LockerCard` | `.vt-dl dt` / `dd` | 12 px 600 `--dim` / 14 px 500 `--text`, cifras 700 | | |
| Rasgo: nombre / palabra | `.vt-traits dt` / `dd` | 12 px 600 `--dim` / 14 px: "Normal" y "Tranquilo" 500 `--dim`, el resto 700 `--text` | | |
| Título de la ventana | `h2` de `Modal` | 1,3rem = 18,2 px (como `.mk-neg`) | 700 | `--text` |
| Línea de estado de la ventana | `.vt-talk-m` | 12 px | 500; "Quiere irse" y la palabra 700 `--text` | `--dim` |
| Título de opción | `.vt-opt-t` | 14 px | 700 (deshabilitada 600 `--dim`) | `--text` |
| Regla de la opción | `.vt-opt-r` | 14 px | 500 | `--dim` |
| "Él: leal" | `.vt-opt-who` | 14 px | "Él:" 500 `--dim`; la palabra 700 `--text` | |
| Motivo de una opción deshabilitada | `.vt-opt-why` | 14 px | 500 | `--dim`, con candado |
| Cita de la respuesta | `blockquote.mk-ask` | 1rem = 14 px | 500, cursiva | `--text` |
| Comparación `vt-letgo` | `.vt-letgo` | 14 px | 500; nombre del camino y cifras 700 `--text` | `--dim` |
| Pie de la ventana ("Una charla por semana…") | `.vt-talk-f` | 12 px | 500 | `--dim` |

El resto (cifras `.ib-kpi-*`, hechos, ayuda, nota, confirmación, chips `.mk-st`, impacto `.mk-impact`, historial `.mk-hist`) usa la escala de la bandeja y del Mercado sin cambios.

### 3.2 Espaciado (escala 4 · 6 · 8 · 12 · 16 · 20 · 24)

| Elemento | Valor |
|----------|-------|
| Hueco entre zonas de la página | 16 px (título → encabezado 12 px) |
| Encabezado | padding 16 px 0; celdas con padding 0 20 px y separador vertical 1 px `--line2`; franja de reserva con borde superior 1 px `--line2`, padding 10 px 20px 0 |
| Contenido y panel | `minmax(0, 1fr) minmax(340px, 38%)`, hueco 16 px |
| Fila de "Para atender" | padding 12 px 16 px; hueco entre líneas 4 px; cara → texto 12 px; alto mínimo 72 px; separador 1 px `--line2` |
| Panel (`LockerCard`) | padding 16 px 20 px; secciones separadas por 1 px `--line2` con 14 px a cada lado |
| Ventana de charla | padding 20 px 24 px; bloques con hueco 14 px; opciones con hueco 8 px y padding 12 px 14 px |
| Escala (pista → número → palabra) | 8 px · 6 px |

### 3.3 Radios

Como la bandeja y el Mercado: tarjetas 14; opciones de la charla, confirmación, nota y `.ib-who` 12; cajas ("Cómo está", `vt-letgo`, línea del modo Reserva), botones 10; chips 8; tramos de pista 2 por dentro y 99 en los extremos; radio 99.

### 3.4 Bordes y elevación

Solo las `.card` llevan sombra (encabezado, "Para atender", tabla, panel; la ventana tiene la suya). Todo lo de adentro es plano con borde de 1 px. Riel de decisión: `::before` de 3 px (6 px y contorno de 1 px `--sel` si está elegida), como `.msg.ib-dec`. Separadores 1 px `--line2`.

---

## 4. Las escalas: un lenguaje para la conformidad, la moral y la armonía

### 4.1 `MoodBar` y `MoraleBar` (`.vt-scale`)

Un componente de dibujo, dos escalas de datos. Anatomía en una fila (`inline-flex`, `align-items: center`):

```
 md:   ▐██▌▐██▌▐█▌   ▌    ▌     14  Muy molesto     ← banda baja: relleno --bad, palabra 700 --text
       ▐██▌▐██▌▐█████▌▐██▌      62  Contento        ← banda alta: relleno --text, palabra 500 --dim
       └ pista cortada en tramos (gap 2 px) ┘ número  palabra

 sm:   14 Muy molesto                                 ← tabla: número y palabra arriba…
       ▐█▌▐█▌▐▌ ▌ ▌                                   ← …y la pista de 64 × 4 debajo
```

| Parte | Tratamiento |
|-------|-------------|
| Pista `.vt-track` | `display: flex; gap: 2px`. Un tramo `<i>` por banda, con `flex-grow` igual al ancho de la banda: **conformidad** 18 · 17 · 25 · 20 · 20 (cortes 18, 35, 60, 80); **moral** 35 · 25 · 20 · 20 (cortes 35, 60, 80). Cada tramo: fondo `--panel3`, radio 2 (el primero y el último, 99 por fuera). Alto 4 px (`sm`) u 8 px (`md`). `aria-hidden="true"`: el valor lo dicen el número y la palabra |
| Relleno | Dentro de cada tramo, un `::before` con el ancho que le toca al valor (lleno en los tramos de abajo, parcial en el del valor, vacío arriba; la fase 3 lo resuelve con una variable `--f` por tramo). **Un solo color para todo el relleno**, según la banda del valor: `.lo` `--bad`, `.mid` `--dim`, `.hi` `--text` (tabla de abajo) |
| Número `.vt-scale-n` | 14 px 700 tabulares, ancho mínimo 2ch, alineado a la derecha |
| Palabra `.vt-scale-w` | 14 px; en `.lo`, 700 `--text`; si no, 500 `--dim` |
| Tamaños | `sm` (tabla y ficha breve): **apilada**, para no sumar ancho a la columna: arriba número y palabra, abajo, a 3 px, la pista de 64 × 4 px. `md` (`LockerCard`, ventana, tarjeta de la ficha): en fila, pista de 96 × 8. `kpi` (caja de cifra de la bandeja): el número es el de la cifra (21,7 px) y debajo van la pista `md` y la palabra, sin repetir el número |
| Orden de lectura | "14 Muy molesto" (el número primero, como la tabla de la especificación) |

| Escala | `.lo` (`--bad`) | `.mid` (`--dim`) | `.hi` (`--text`) |
|--------|-----------------|------------------|------------------|
| Conformidad (`moodOf`) | Muy molesto < 18, Molesto 18-34 | Conforme 35-59 | Contento 60-79, Muy contento ≥ 80 |
| Moral (`moraleWord`) | Bajo < 35 | Normal 35-59 | Bueno 60-79, Muy alto ≥ 80 |
| Armonía (`harmonyWord`, 4.2) | Vestuario partido < 25, Hay ruido 25-44 | Clima normal 45-69 | Grupo unido ≥ 70 |

Por qué así: la línea roja cae en el corte que usa el motor (35: pérdida de moral, resta armonía, no renueva; armonía < 45: el equipo rinde menos de −0,9 %). El orden rojo → gris → blanco es también un orden de luminosidad (0,30 · 0,39 · 0,88 de luminancia relativa), así que se lee sin ver el tono; en `.cvd` el rojo pasa a naranja. Con acromatopsia quedan el largo, el tramo, el número y la palabra en 700.

**Ajenos** (especificación 5.5): con 100 % de conocimiento, la moral se ve **solo con la palabra** (sin pista ni número, `.vt-scale-w` sola, 500 `--dim`); con menos, "Su ánimo lo dice el informe completo." en 12 px `--dim`.

### 4.2 Medidor de armonía (`Gauge` con cortes, `.vt-gauge`)

- El `Gauge` de hoy (110 × 66, arco de 9) con dos cambios en el Vestuario: el arco se dibuja en **cuatro tramos** separados por 3° en 25, 45 y 70 (extremos `stroke-linecap: butt`, para que se vean los cortes) y el relleno usa los tres tonos de 4.1 (`--bad` por debajo de 45). La pista es `--panel3`.
- **Se saca el rótulo "ARMONÍA" del SVG** (8 px en mayúsculas: rompe el mínimo de 12 px y la regla sin mayúsculas). Lo dice el texto de al lado.
- El número adentro, 24 en el `viewBox` (≈ 26 px a 120 px de ancho), 800 tabular `--text`.
- `role="img"`, `aria-label="Armonía 62 de 100: clima normal"`.
- Tamaño: 120 × 72 px en escritorio, 96 × 58 en el celular.
- **Solo el Vestuario** pasa los cortes: el `Gauge` de la confianza de la dirigencia (Inicio y Club) queda como hoy (sección 13).

### 4.3 Barra de minutos (`.vt-mins`)

Otra forma para otro dato: una proporción con una línea, no una escala de palabras.

```
 20/62 %                                   (tabla, sm apilada: texto arriba…
 ▐███░░░░░░░┃░░░▌                           …pista de 64 × 4 debajo)
 ▐████░░░░░░░░░░┃░░░░░░░░▌   20 % de 62 %   (panel, md: todo el ancho, hasta 240 × 8)
 se molesta por debajo de 53 %
```

| Parte | Tratamiento |
|-------|-------------|
| Pista | **Una sola pieza** (sin tramos), `--panel3`, radio 99, 4 px (`sm`) u 8 px (`md`) |
| Relleno | Ancho = lo que juega (`minutesOf.got`). `--bad` si al ritmo de hoy le baja la conformidad (`nextDelta < 0`); si no, `--dim` |
| Marca de umbral `.vt-mins-mark` | En `threshold` (85 % de lo esperado): 2 px de ancho, 6 px más alta que la pista (3 arriba y 3 abajo), `--text`, con un halo de 1 px `--panel` (`box-shadow: 0 0 0 1px var(--panel)`) para que se vea también sobre el relleno (sin halo, blanco sobre `--dim` da 2,09). Es la forma la que dice "acá empieza a molestarse" |
| Texto | Tabla (`sm`, apilada como las escalas: texto arriba, pista de 64 × 4 debajo, marca de 10 px): "20/62 %", lo jugado en 700 `--text`, "/62 %" en 500 `--dim`, espacio duro antes de "%". Panel y ventana (`md`, en fila): "20 % de 62 %" (700 / 500) y debajo, en 12 px `--dim`, "se molesta por debajo de 53 %" |
| Rol que no se molesta (`tol` 0) | Sin marca; relleno `--dim`; texto "20 % · no le pesa" (tabla) / "Con su rol no se molesta por los minutos." (panel) |
| `tol` 0,5 | Marca como siempre; texto "…pero la mitad de rápido que un titular" |
| Todavía no cuenta (0 o 1 partido) | Sin pista: "—" en `--dim` y el texto de la especificación (sección 6 y `LockerCard` punto 2) en 12 px `--dim`. Con 2 partidos ("cuenta desde el próximo partido"), la pista se dibuja normal y esa frase va debajo en 12 px `--dim` |

### 4.4 Promesa (`.vt-promise`)

La misma `vt-mins` `md`, con la marca en el umbral de la promesa ("cumplís si juega al menos el 71 %") y el relleno con lo que lleva desde que prometió. Relleno `--bad` si `onTrack` es falso (con 2 partidos o más), `--dim` si no. Debajo, el veredicto con la pieza del Mercado `.mk-verdict` (12 px 700, ícono de 14):

| Estado | Ícono | Texto |
|--------|-------|-------|
| Va bien | ✓ `--good` | "Va bien" |
| En riesgo | "!" `--warn` | "En riesgo: le faltan 166 minutos en 3 partidos" |
| Ya no llega | ✗ `--danger` | "Ya no llega" |
| Todavía no se mide | reloj `--dim` | "Todavía no jugó lo suficiente para medirla" |

Es el mismo trío que "entra / puede no entrar / no entra" del impacto: el DT ya lo sabe leer.

### 4.5 Tendencia

"↓ baja tras cada partido si sigue jugando así", "↑ sube", "— estable", "‖ en pausa" (lesionado o suspendido para el próximo partido, con el porqué): ícono de 14 px en `--dim` (flecha abajo, flecha arriba, raya, pausa; la raya no es una flecha para no confundirse con "pasa a" del impacto) y la palabra clave en 700 `--text`. Sin color: la palabra y la forma alcanzan, y el rojo ya está en la barra si corresponde. "Sin datos": sin ícono, la frase de "todavía no cuenta".

---

## 5. Zonas y componentes en escritorio (1440 × 900)

```
┌ barras N1 y de pantallas (106 px, existentes) ───────────────────────────────────────────────────────────────┐
│ (i) ayuda O2 .pagetip (solo la primera vez)                                                      [Entendido] │
│ Vestuario                                                                                     h1 con estilo h2 │
│ ┌ .vt-head .card ─────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ╭─62─╮  Clima normal          │ Qué la mueve                 │ Referentes                               │ │
│ │ ╰────╯  Armonía 62 de 100     │ Conformidad promedio   +66   │ {24} R. Rojas         Acompaña           │ │
│ │         En la cancha: sin     │ Referentes              +5   │ {24} L. Ortiz         Acompaña           │ │
│ │         efecto notable (+0,1 %)│ 2 disconformes         −6   │ {24} M. Gómez         (!) Resta          │ │
│ │                               │ 1 temperamental        −3   │ Cómo se eligen ▸                         │ │
│ │                               │ ─────────── Armonía    62   │                                          │ │
│ │ ──────────────────────────────────────────────────────────────────────────────────────────────────────── │ │
│ │ Reserva: 8 anotados (mínimo 7) · juega el mié 18 nov                                [Armar la reserva] │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ .vt-att .card ──────────────────────────────────────────┐ ┌ .vt-panel (aside, sticky) ─────────────────┐ │
│ │ Para atender (4)                                         │ │ {52} M. Gómez       DC  Titular            │ │
│ │▌{32} M. Gómez · Titular          [Para decidir]          │ │ Quiere irse · Muy molesto (14)             │ │
│ │▌ Quiere irse: juega 20 % y espera 62 %.                  │ │ ── Por qué está así ──                     │ │
│ │▌ Si no le respondés, resta armonía…            [Hablar]  │ │ Minutos  ▐██░░░░░░┃░░▌ 20 % de 62 %        │ │
│ │  {32} J. Paz · Rotación          [! Promesa en riesgo]   │ │ …                                          │ │
│ │  …                                                       │ │ ── Charla ──                               │ │
│ └──────────────────────────────────────────────────────────┘ │ [██ Hablar con él ██] [Declararlo transf.] │ │
│ ┌ tabla .card ─────────────────────────────────────────────┐ │ ┌ vt-letgo (.ib-conseq) ─────────────────┐ │ │
│ │ [✓ Todo el plantel 30] [En la reserva 8] [Juveniles 6]   │ │ │ Declararlo transferible: …             │ │ │
│ │ Jugador   Pos Rol     Minutos      Conformidad   Moral … │ │ └────────────────────────────────────────┘ │ │
│ │▌M. Gómez  DC  Titular ▐█░┃░▌20/62 % ▐█▌▐▌░ 14 Muy molesto │ │ ── Reserva ── [✓ Anotado en la reserva]   │ │
│ └──────────────────────────────────────────────────────────┘ └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 ▌ en "Para atender" = riel ámbar de la decisión (6 px --sel si está elegida); ▌ en la tabla = riel --sel de la fila elegida
```

Retícula: `.vt-main` en dos columnas desde 1181 px, `minmax(0, 1fr) minmax(340px, 38%)`, hueco 16 px; la columna izquierda lleva "Para atender" y la tabla una debajo de la otra.

### 5.1 Ayuda de pantalla (O2)

`.pagetip` existente sin cambios de forma; cambia el texto en `TIPS` (especificación 5.3). "Entendido" `.btn.sm`.

### 5.2 Encabezado `.vt-head`

`.card` con `container: vt-head / inline-size`, padding 16 px 0. Retícula `auto minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr)`, cada celda con padding 0 20 px y separador `border-left: 1px solid var(--line2)` desde la tercera (el medidor y su estado forman una sola celda visual).

1. **Medidor** (4.2), 120 × 72.
2. **Estado** `.vt-hstate`: "Clima normal" (19,6 px 700). Debajo, `.vt-hsub`: "Armonía **62** de 100" y "En la cancha: sin efecto notable (**+0,1 %**)" en dos renglones (14 px, la cifra con `dec()` y signo). Al empezar la temporada, debajo, una `.mk-note.info` ("i" `--dim`) con la frase de la especificación (sección 6, "Inicio de temporada").
3. **Qué la mueve** `.vt-parts`: rótulo `.vt-head-l`; lista `dl` de dos columnas (`1fr auto`, filas de 22 px): término en 14 px 500 `--dim`, valor en 14 px 700 tabulares `--text` alineado a la derecha, **con signo escrito** ("+66", "+5", "−6", con U+2212). Sin colores por signo. Última fila separada por 1 px `--line2`: "Armonía" en 700 `--text` y el total en 800. El término nulo no se dibuja; el recorte, si hay, es la fila "Tope de la escala" en 500 `--dim`. El número de cada término no se pinta; "2 disconformes" lleva el número en 700.
4. **Referentes** `.vt-leads`: rótulo; tres filas de 28 px: `Face` de 24, nombre (`.linkish` 14 px 600 `--text`, `data-pid`) y, a la derecha, el estado: "Acompaña" 12 px 500 `--dim`, o "Resta" 12 px 700 `--text` con el "!" de 12 px en `--warn` delante (aviso con costo). Debajo, `details.vt-disc` "Cómo se eligen": `summary` 12 px 600 `--dim` con chevron ▸ de 12 px que gira 90° abierto (sin animación); el texto adentro, 12 px `--dim`, máximo 36ch.
5. **Franja de reserva** `.vt-res-line` (de lado a lado, debajo de las cuatro celdas, borde superior 1 px `--line2`, padding 10 px 20px 0): texto de 14 px a la izquierda y "Armar la reserva" `.btn.sm` (32 px) a la derecha.

| Estado | Texto |
|--------|-------|
| Completa | "Reserva: **8 anotados** (mínimo 7) · juega el **mié 18 nov**" (`--text`, las cifras en 700) |
| Incompleta | "!" de 14 px `--warn` + "Reserva: **5 anotados y sanos**, faltan 2 para el mié 18 nov" (todo en 700 `--text`) |
| Sin anotados | "Reserva: sin anotados (no se juega)." en 500 `--dim` |

Alto: unos 150 px a 1440. Sin barras de progreso del 1 al 7 (como el Mercado con sus 5 ofertas: un número alcanza y no se confunde con ninguna escala).

### 5.3 "Para atender" `.vt-att`

`.card` con padding 12 px 0 4px (las filas van de borde a borde). Encabezado: `h2.vt-att-t` (título portal, 15,1 px en color, `tabindex="-1"` sin anillo, como `.ib-h`) y la cantidad en `.mk-cnt` neutro (`--panel3`, 12 px 800). Es un total, no un sin leer ni una decisión: nunca ámbar. Padding 0 16 px 8 px.

**Fila `li.vt-att-row`** (`ul` con `aria-labelledby` al `h2`):

```
│▌ {32}  M. Gómez · Titular                              [Para decidir]  │
│▌       Quiere irse: juega 20 % y espera 62 %.                          │
│▌       Si no le respondés, resta armonía; cuando abra el libro (1 ene), │
│▌       van a llegar ofertas por él.     No vence          [Hablar]     │
│▌       {nota F7}                                                       │
```

| Parte | Tratamiento |
|-------|-------------|
| Contenedor | `display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 4px 12px`; padding 12 px 16 px; separador superior 1 px `--line2` (no en la primera); alto mínimo 72 px; `position: relative` (riel) |
| Botón de fila `button.vt-att-pick` | Ocupa la primera columna. Adentro, retícula `32px minmax(0, 1fr)` con hueco 12: `Face` de 32 (arriba) y una columna de texto con hueco 4. Sin fondo propio: el hover y la elección pintan el `li` (`li:has(.vt-att-pick:hover)`), así el fondo cubre también la acción |
| Línea 1 | Nombre `.vt-att-n` (14 px 700) + " · Titular" (12 px 500 `--dim`) y, empujado a la derecha en la misma línea, el **chip del motivo principal**. Si no entra, el chip baja a su propia línea antes que cortar el nombre |
| Línea 2 | Causa `.vt-att-c` (14 px `--text`; las cifras en 700 tabulares) |
| Línea 3 | Consecuencia `.vt-att-k` (14 px `--dim`). En el rango 1, al final, `.ib-due` "No vence" (12 px 600 `--dim`, sin ícono) |
| Línea 4 (si hay) | Chips de los motivos secundarios (`.mk-st.vt-why`, hueco 6) |
| Acción hermana | Segunda columna, abajo a la derecha: `.btn.sm` común de 32 px ("Hablar"; "Declararlo transferible"; "Ver transferibles en Plantel" con chevron ▸). Si ya hablaron, en su lugar `.vt-talkst` (reloj de 12 px `--dim` + "Hablaron el 12 nov · de nuevo desde el 19 nov", 12 px 600 `--dim`, fechas 700 `--text`; `tabindex="-1"`, alineado a la derecha, hasta 22ch y en dos renglones) |
| Charla usada con pedido (rango 1) | La nota de `outActions` va como línea 4 en 14 px `--dim` (no en la columna de la acción) y la acción es "Declararlo transferible". La comparación `vt-letgo` va debajo, de lado a lado de la fila (5.7). A préstamo: sin acción, la nota dice por qué |
| Nota F7 `.vt-att-note` | Debajo, en la primera columna, `.ib-result` (sin fondo), margen superior 8 px |

**Estados de la fila** (mismo lenguaje que `.msg.ib-dec` de la bandeja):

| Estado | Fondo | Riel (`::before`) | Nombre |
|--------|-------|-------------------|--------|
| Rango 1 "Para decidir" | `--panel` | 3 px `--warn`, de borde a borde (cubre el separador) | 700 |
| Cualquier otro | `--panel` | — | 700 |
| Hover | `--panel2` | igual | igual |
| Elegida (`aria-current="true"` en el botón) | `--accent-soft` compuesto sobre `--panel` | 3 px `--sel`; si era rango 1, **6 px `--sel` y contorno de 1 px `--sel`** hacia adentro (AV-13: nunca dos rieles pegados, nunca ámbar + `--sel`) | 800 |
| Con foco (botón de fila) | igual | igual | contorno de 2 px `--sel` a −2 px sobre el `li` (`li:has(.vt-att-pick:focus-visible)`) |

**Chips de motivo**: la pieza `.mk-st` del Mercado (22 px, padding 0 8 px, radio 8, 12 px 700, ícono de 12 px a 4 px del texto) con el modificador `.vt-why` (texto `--text`, ícono `--dim` salvo que el modificador de ícono diga otro). Un ícono de forma distinta por motivo, así la lista se recorre sin color:

| Rango | Chip | Clases | Ícono (12 px) | Color del ícono | Fondo |
|-------|------|--------|---------------|-----------------|-------|
| 1 | "Para decidir" | `.ib-tag.dec` (la misma de la bandeja) | — en escritorio; "!" en celular (como la bandeja) | `--warn` | ámbar 13 % sobre `--panel2` |
| 1 | "Quiere irse · transferible" | `.mk-st.vt-why` | ⇄ (`MI.swap`) | `--dim` | `--panel2` |
| 2 | "Promesa en riesgo" | `.mk-st.vt-why.bang` | "!" (`MI.bang`) | `--warn` | `--panel2` |
| 3 | "Molesto" / "Muy molesto" | `.mk-st.vt-why.bang` | "!" | `--warn` | `--panel2` |
| 4 | "En baja" | `.mk-st.vt-why` | flecha abajo (nuevo) | `--dim` | `--panel2` |
| 5 | "Referente que resta" | `.mk-st.vt-why` | "−" en círculo (nuevo) | `--dim` | `--panel2` |
| 6 | "Minutos prometidos" | `.mk-st.vt-why.ok` | ✓ (`MI.ok`) | `--good` | `--panel2` |

Rango 1 con el pedido: además de "Para decidir", la palabra "Quiere irse" ya está en la causa; no lleva segundo chip.

**Vacío**: dentro de la tarjeta, la píldora `.ib-block-h.none` de la bandeja (neutra, ✓ de 16 px `--dim`): "**Nadie para atender:** todos juegan lo que esperan y no hay promesas en curso." No es seleccionable.

### 5.4 Tabla del plantel (`PlayerTable` vistas `vestuario` y `reserva`)

Base: la tabla única con `onPick`, con los mismos cambios del Mercado (que pasan a valer para `.mk` y `.vt`, sección 12): encabezados 12 px `--dim`; fila elegida con `--accent-soft`, riel `inset 3px 0 0 var(--sel)` y nombre en 800; fila marcada solo con la casilla; foco 2 px `--sel` a −2 px.

**Chips de filtro** encima de la tabla, en la barra de la tabla: el `Seg` con el estado activo C5 (fondo `--accent-soft` compuesto, borde `--accent-hi`, ✓, 700) y contador neutro `.mk-cnt` ("Todo el plantel 30", "En la reserva 8", "Juveniles 6"). 32 px y 12 px en escritorio. Nunca ámbar: cuentan totales.

| Columna | Ancho | Celda |
|---------|-------|-------|
| `mins` | 96 px | `vt-mins` `sm` apilada: "20/62 %" y la pista con su marca (4.3) |
| `happy` | 112 px | `MoodBar` `sm` apilada: "14 Muy molesto" y la pista de 64 debajo. "62 Muy contento" mide unos 111 px a 14 px; solo "100 Muy contento" pasa (≈ 120) y empuja la columna, sin cortarse |
| `mor` | 96 px | `MoraleBar` `sm` apilada |
| `pers` | 150 px | Hasta dos rasgos que no son "Normal" (en el orden fijo del motor) en 14 px 600 `--text`, uno por renglón si no entran en uno (la celda parte en dos renglones antes que cortar; la fila crece a unos 52 px), y "+2" en `.mk-cnt` neutro con `.vh` "rasgos más"; si todos son "Normal", "Sin rasgos marcados" en 500 `--dim`. Ajeno: la regla de 5.5 de la especificación; "—" en `--dim` |
| `st` | como hoy | chips de `Status` (cambio de 12: "Minutos prometidos" y la palabra de `moodOf` con "!") |
| `res` | 88 px | Alternable `.btn.sm.vt-res`: apagado "Anotar" (común); prendido `.on` ("✓ Anotado": `--accent` 22 % sobre `--panel2`, borde `--accent-hi`, texto `--text` 700, el alternable de "Seguir" del Mercado). **Ancho mínimo 86 px** (lo que mide "✓ Anotado" a 12 px 700 con su padding) para que no cambie al alternar. 32 px de alto (44 en celular). `tabindex="-1"` dentro de la grilla. En la vista Reserva, si está lesionado o suspendido, debajo del botón "Lesionado" / "Suspendido" en 12 px 600 `--dim` (la columna Estado es la primera en ocultarse) |
| `talk` | 104 px | "Disponible" 12 px 500 `--dim`, o reloj de 12 px + "desde el 19 nov" 12 px 600 `--dim` (fecha 700 `--text`) |

Los anchos son los de referencia de la especificación (5.3, "Prioridades de columna", con su comprobación a 320 px), salvo `happy` (112 en lugar de 110) y `res` (88 en lugar de 84): la comprobación sigue pasando (a 320 px el nombre queda con 122 y 146 px). Con poco ancho, `PlayerTable` oculta por las prioridades de cada vista de la especificación (en `vestuario`, primero la personalidad y la charla; la conformidad, la última). Las escalas apiladas no necesitan ocultar la pista en ningún ancho. La celda nunca corta "20/62 %" ni la palabra con "…".

**Modo "Armar la reserva"**: arriba de la tabla, dentro de su tarjeta, la línea `.vt-resmode` (fondo `--panel2`, radio 10, padding 10 px 14 px, de lado a lado; `display: flex; gap: 12px; align-items: center; flex-wrap: wrap`):
- A la izquierda, 14 px `--text`: "Anotá al menos 7 sanos: juega el mié 18 nov. Con el teclado, <kbd>Espacio</kbd> marca la fila y «A la reserva» anota a los marcados." (`kbd` igual que el del Mercado: 12 px 700 `--text`, fondo `--panel2`, borde 1 px `--line`, radio 6, padding 1 px 6 px; sobre la línea `--panel2` lo separa el borde).
- A la derecha (`margin-left: auto`), la cuenta viva "**8** anotados · **7** sanos como mínimo" 14 px; con menos de 7, el "!" de 14 px `--warn` delante y el texto en 700.
- La columna `res` va segunda después del nombre en la vista `reserva` y nunca se oculta. La vista activa de la tabla (`Reserva`) lleva el estado activo del segmentado de vistas: así se sale del modo como de cualquier vista.

**Filtro vacío**: dentro de la tarjeta de la tabla, `.mk-empty` (borde discontinuo) con el texto de la especificación y, para "En la reserva", "Armar la reserva" `.btn.sm`.

**Barra masiva**: `.bulkbar` de hoy (con `.idle` que reserva su alto); botones 12 px y 32 px; nota de resultado con ✓ de 12 px `--good` y texto `--text` 600, como el Mercado.

### 5.5 Panel `.vt-panel` y `LockerCard` `.vt-card`

**Panel**: `aside.card.vt-panel`, `position: sticky; top: 0` dentro de `.main` (especificación 5.2: la barra superior está fuera de `.main` y el panel no lleva `scroll-padding` por ella), `max-height: calc(100vh − var(--vt-top) − 16px)`, `overflow-y: auto`, `scrollbar-width: thin`, padding 16 px 20 px. Las acciones van dentro del contenido.

**Sin elegido** `.vt-panel.none`: alto mínimo 260 px; círculo `.msg-ico` de 40 px con `TAG_ICON.club` (personas) en `--dim`; el texto de la especificación en 14 px 500 `--dim`, máximo 36ch; debajo, "Promesas vigentes" (`h3.vt-card-h`) y una fila por promesa: nombre (`.linkish` 14 px 700), "hasta el 20 dic" 12 px `--dim` y el veredicto `.mk-verdict` a la derecha. Sin promesas: "No hay promesas en curso." 12 px `--dim`.

**`LockerCard`** (el mismo componente en el panel y en la ficha › Vestuario), contenedor `container: vt-card / inline-size`, columna con secciones separadas por 1 px `--line2` y 14 px a cada lado. Cada sección: `h3.vt-card-h` (14 px 800 `--text`) y su cuerpo.

1. **Encabezado** `.vt-card-top` (solo en el panel): `Face` de 52; a la derecha el nombre `.vt-card-name` (17,5 px 700, enlace a la ficha, subrayado al pasar el mouse) con `PosPill` y el rol (14 px 600 `--text`) en la misma fila; debajo, en 14 px: "Quiere irse" (700 `--text`) " · Muy molesto (14)" (la palabra en 700, el número en 500 `--dim`). Sin chips de color: es el resumen en palabras de lo que viene abajo.
2. **Por qué está así** — lista `.vt-dl` (rótulo de 96 px, 12 px 600 `--dim`; dato 14 px; filas de 28 px mínimo, hueco 4 px 10 px):
   - **Minutos**: `vt-mins` `md` (todo el ancho del dato, hasta 240) y debajo "20 % de 62 %" + "se molesta por debajo de 53 %" (4.3).
   - **Últimos 6**: "0 · 45 · 0 · 18 · 45 · 0" 14 px tabulares `--text`, separadores `--dim`. Con menos de 3: la frase de "todavía no cuenta".
   - **Conformidad**: `MoodBar` `md` y debajo la tendencia (4.5).
   - Si `canAskOut`: `.mk-note.warn` ("!" `--warn`, texto `--text` 14 px): "Puede pedir irse después del próximo partido (cada semana, una chance en dos)."
   - **Moral**: `MoraleBar` `md`.
   - `details.vt-disc` "¿Moral o conformidad?" (12 px 600 `--dim`, chevron) con la frase de la especificación.
   - **Causa** (si `moodCause` no son los minutos): "Desde que le bajaste el rol el 2 nov" 14 px `--text`.
3. **Personalidad** — `dl.vt-traits` de dos columnas: rasgo (12 px 600 `--dim`, 128 px) y palabra (14 px; "Normal" y "Tranquilo" en 500 `--dim`, el resto en 700 `--text`, así salta lo que distingue al jugador). Filas de 24 px. Liderazgo sin palabra: la fila no se dibuja. Nunca números ni chips.
4. **Promesa** (si hay): el párrafo de la especificación en 14 px `--text` con las cifras en 700; `vt-promise` (4.4); el aviso de la prórroga como `.mk-note.info` ("i" `--dim`); plazo corrido: `.mk-note.info` con la fecha nueva en 700.
5. **Pedido de salida** (si hay): "Quiere irse desde el 9 nov (…). No vence." 14 px; "Está declarado transferible." con ⇄ de 14 px `--dim`.
6. **Charla** — `h3.vt-card-h` "Charla" con `tabindex="-1"` (sin anillo, como `.ib-h`):
   - Con la charla disponible: `.ib-acts` con "Hablar con él" `.btn.primary` (40 px; en el panel, ancho natural) y, si corresponde, "Declararlo transferible" `.btn` común. Debajo, `vt-letgo` (5.7).
   - Con la charla usada: `.vt-talkst` en 14 px (reloj de 14 px `--dim` + "Hablaron el 12 nov (no le convenció) · de nuevo desde el 19 nov") y, si quiere irse, "Declararlo transferible" pasa a **primario**, con `vt-letgo` en su versión de charla usada.
   - Nota F7 `.vt-card-note` (`.ib-result`), y "Contrato y renovación ▸" `.btn.sm` con chevron de 16 px.
7. **Reserva**: alternable `.btn.sm.vt-res` ("✓ Anotado en la reserva" / "Anotar en la reserva"), y al lado, 12 px `--dim`: "Juega el mié 18 nov" o, con "!" de 12 px `--warn`, "La reserva no se juega con menos de 7 anotados y sanos (hoy 5)".
8. **Charlas y promesas** (solo en la ficha): la lista `.mk-hist` del Mercado (fecha 12 px 600 tabulares `--dim`, texto 14 px). Respuesta corta con ícono de 12 px y palabra: "Le convenció" (✓ `--good`), "No le convenció" (raya `--dim`), "Lo tomó mal" (✗ `--danger`). Promesas: "cumpliste" ✓ `--good`, "no cumpliste" ✗ `--danger`, "El plazo se corrió al 3 ene" reloj `--dim`. Sin registro: "Todavía no hablaste con él." 14 px `--dim`.
9. "Ver la ficha ▸" `.btn.sm` (solo en el panel).

**Jugador que ya no está**: el encabezado en `--dim` y, en lugar del resto, `.ib-who.gone` (borde discontinuo): "{nombre} ya no está en el plantel." con "Ver la ficha" `.btn.sm`.

### 5.6 Ficha › Vestuario (`.vt-scope`)

- La `LockerCard` sin su encabezado (lo dice la banda), dentro de una `.card` sin título propio. Desde 720 px de contenedor, dos columnas (`@container vt-card (min-width: 720px)`): izquierda "Por qué está así" y "Personalidad"; derecha "Promesa", "Pedido de salida", "Charla" y "Reserva"; "Charlas y promesas" abajo, de lado a lado.
- **Banda** (todas las pestañas): "Hablar" sigue siendo `.btn` de la banda. Con la charla usada, en su lugar `.vt-band-talk`: reloj de 14 px y "Hablaron hoy · de nuevo desde el 22 nov" en 12 px 600 **`--text`** (12,24 mínimo sobre la fila de pestañas de la banda; `--dim` sobre la banda no llega en 58 de 86 clubes, 10.2), `tabindex="-1"`. La nota F7 `.vt-band-note` es un `.ib-result` **con fondo `--panel`** (en la banda no hay fondo medido para el texto de error) y aparece debajo de la fila de pestañas, dentro de la banda.
- **Resumen › tarjeta de estado**: "Felicidad" pasa a "Conformidad" (propio): `.pc-v` con la palabra ("Muy molesto") y `MoodBar` `md` debajo. Para un ajeno pasa a "Ánimo": la palabra sola (100 %) o "Su ánimo lo dice el informe completo." en 12 px `--dim`. Sin "Moral 64". La tarjeta "Físico" queda como hoy (`Cond`).
- **Resumen › Información**: la personalidad con `vt-traits`, la misma lista de dos columnas (en esta tarjeta angosta, con el rótulo de 104 px).
- **Ojeo (ajeno)**: `vt-traits` con solo los extremos y la línea "Lo que se ve hasta ahora…" como `.mk-note.info`.

### 5.7 Comparación de los dos caminos `.vt-letgo`

Caja `.ib-conseq` (fondo `--panel2`, riel izquierdo de 3 px `--line`, radio 10, padding 10 px 14 px) con la clase `.vt-letgo` para su interior. Columna con hueco 8 px, 14 px, interlineado 1,5:

```
┌ Declararlo transferible: queda en la lista ya, sin gastar la charla; su       ┐
│ conformidad y su moral no cambian y sigue queriendo irse.                      │
│ "Decirle que puede buscar club" (charla): lo mismo y, como lo pidió,           │
│ conformidad +15 y moral +6; gasta la charla de esta semana.                    │
│ ⇄ Con el libro cerrado no llegan ofertas: vuelven a llegar cuando abra, el     │
│   1 ene.                                                                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

- Párrafo 1 y 2: el nombre del camino en 700 `--text`, el resto en 500 `--dim`, las cifras ("+15", "+6", "−20", "−12") en 700 `--text` tabulares, con signo y sin color.
- Párrafo 3 (las ofertas): ícono ⇄ de 14 px `--dim` delante; "12 %", "5 %", "25 %" y la fecha en 700 `--text`.
- Siempre visible; nunca en un disclosure ni en `title`. Es el `aria-describedby` de "Declararlo transferible" y de la opción "Decirle que puede buscar club".
- En el panel de 340 px ocupa 9 a 11 renglones; se acepta (especificación 13).
- En la fila de "Para atender" (rango 1, charla usada), va debajo de la fila, de lado a lado, con margen 8 px 16 px 12 px 60 px (alineada con el texto, no con la cara).

### 5.8 Ventana de charla `.vt-talk` (`TalkModal`, F5)

`Modal` de 640 px de ancho máximo (`.modal:has(.vt-talk)`), padding 20 px 24 px, columna con hueco 14 px, cuerpo con desplazamiento propio hasta 90 vh. Captura de hoy (`charla-quiere-irse.jpg`): todas las opciones salen deshabilitadas, con borde discontinuo y sin regla (sección 13).

**Elegir**

```
╔═══════════════════════════════════════════════════════════════╗
║ {52} Charla con M. Gómez                                 [✕]  ║ h2 18,2 px
║      DC · Titular · Muy molesto (14) · moral 41 · Quiere irse  ║ 12 px --dim
║ ┌ Cómo está (.vt-how) ──────────────────────────────────────┐ ║
║ │ Minutos ▐██░░░░┃░░▌ 20 % de 62 %                           │ ║
║ │ Ambición alta · Lealtad normal · Temperamento tranquilo ·  │ ║
║ │ Profesional. Viene con promedio 6,4 (últimos 5).           │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║ Qué le decís                                         12 px     ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ (◉) Decirle que no se va                                   │ ║ ← marcada: --accent-soft, borde --accent-hi
║ │     Acepta de buena gana si es leal o muy leal.            │ ║
║ │     Él: lealtad normal                                     │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ ( ) Prometerle más minutos                   [tiene costo] │ ║
║ │     Hasta el 20 dic, jugar alrededor del 84 %…             │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ ║ ← deshabilitada: borde discontinuo
║ ╎ (‥) Pedirle paciencia                                      ╎ ║
║ ╎     🔒 Todavía está contento (conformidad 70)…             ╎ ║
║ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ ║
║ 🔒 No disponibles ahora: Pedirle paciencia (…).               ║
║ ───────────────────────────────────────────────────────────── ║
║ Una charla por semana con cada jugador.   [Cancelar] [Hablar] ║
╚═══════════════════════════════════════════════════════════════╝
```

1. **Cabecera**: `Face` de 52; `h2` "Charla con M. Gómez"; debajo `.vt-talk-m`. A la derecha, ✕ `.btn.sm.icon` (32 × 32; 44 en celular) con `aria-label="Cerrar la charla"`. "Cerrar" en texto de hoy se reemplaza por el ícono: "Cancelar" ya está en el pie.
2. **Cómo está** `.vt-how`: caja `--panel2`, borde 1 px `--line2`, radio 10, padding 12 px 14 px, hueco 8 px. Minutos con `vt-mins` `sm` y la frase; rasgos en línea (la palabra de cada rasgo con la regla de `vt-traits`: "Normal" en `--dim`, el resto en 700 `--text`); forma "Viene con promedio **6,4**"; promesa vigente en una línea con su veredicto `.mk-verdict`.
3. **Opciones** `.vt-opts` (`role="radiogroup"`, nombre "Qué le decís", rótulo visible 12 px 600 `--dim`), columna con hueco 8 px. Cada opción `.vt-opt`:

| Parte / estado | Tratamiento |
|----------------|-------------|
| Caja | `display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 4px 10px`; padding 12 px 14 px; radio 12; borde 1 px `--line2`; fondo `--panel`; alto mínimo 48 px (56 en celular); cursor de puntero |
| Radio `.vt-radio` | 18 px, aro de 2 px `--dim`, fondo transparente. Marcado: aro `--sel` y punto de 8 px `--sel` (forma, no solo color). Dibujado con CSS sobre el `input` nativo oculto o con `role="radio"` (fase 3) |
| Título `.vt-opt-t` | 14 px 700 `--text` |
| Regla `.vt-opt-r` | 14 px 500 `--dim`, en la columna 2 |
| Rasgo que decide `.vt-opt-who` | 14 px: "Él:" 500 `--dim`, la palabra en 700 `--text` (la de `persTraits`). Dato ("Viene con promedio 6,4") igual |
| Etiqueta "tiene costo" | `.mk-st` neutro (12 px 700 `--dim`, sin ícono), arriba a la derecha (columna 3). Dice que habrá confirmación; no es un aviso |
| Hover | borde #4a5185, fondo `--panel2` |
| Marcada (`aria-checked`) | fondo `--accent-soft` compuesto sobre `--panel`; borde 1 px `--accent-hi`; título igual. El radio marcado es la segunda marca |
| Foco | contorno de 2 px `--sel` a 2 px (en la opción, porque el `input` está oculto) |
| Deshabilitada | borde 1 px **discontinuo** `--line`, fondo transparente, aro del radio discontinuo `--dim`, título 600 `--dim`; el motivo `.vt-opt-why` debajo con candado de 14 px `--dim` y texto 14 px 500 `--dim`. **Sin opacidad**: el motivo tiene que leerse (6,99:1) |
| Contenido extra (marcada) | Debajo de la regla, en la columna 2, con hueco 8 px: selector de rol `Seg` (C1, 32 px, `flex-wrap`) y sus dos frases (14 px `--text` / `--dim`); en "puede buscar club", `vt-letgo` |

   Debajo del grupo, si hay deshabilitadas: `.vt-opts-off`, candado de 14 px + "No disponibles ahora: …" en 14 px `--dim`.
4. **Pie** `.vt-talk-foot`: borde superior 1 px `--line2`, padding superior 14 px; `display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px`. A la izquierda `.vt-talk-f` (12 px `--dim`); a la derecha "Cancelar" (`.btn`, 40 px) y "Hablar" (`.btn.primary`, 40 px). "Hablar" deshabilitado: opacidad 0,4 y, a su izquierda, `.ib-help` "Elegí qué decirle" (o "Elegí un rol distinto del que tiene."). El pie va **al final del contenido**, no fijo.

**Confirmación** (F6): el pie se reemplaza en el lugar por `.ib-confirm.vt-confirm` (caja `--panel2`, borde `--line`, radio 12, padding 10 px 12 px) en columna: arriba la consecuencia en 14 px `--text` (con cifras y fecha en 700); abajo, alineados a la derecha, "No" (`.btn`) y "Confirmar: prometerle minutos" (`.btn.primary`, se parte en dos renglones antes que cortarse). El orden es el de la especificación (No → Confirmar), con el primario a la derecha como "Hablar".

**Respuesta** `.vt-reply` (`role="status"`, `tabindex="-1"`, sin anillo, como `.ib-h`): reemplaza opciones y pie.

```
« Le tomo la palabra. »                                  ← blockquote.mk-ask
┌ .mk-impact ──────────────────────────────────────┐
│ Conformidad   14 → 32            Conforme         │   ← antes 500 --dim, flecha, después 800 --text
│ Moral         41 → 46            Normal           │      palabra de la banda nueva, 12 px 600 --dim
└───────────────────────────────────────────────────┘
✓ Ya no pide irse                                       ← .ib-facts, ✓ 16 px --dim
✓ Minutos prometidos hasta el 20 dic
                                                [Listo]  ← primario
```

- La cita usa `.mk-ask` (son sus palabras, como lo que pide el representante), con «» y 14 px 500 cursiva.
- Antes → después con la tabla `.mk-impact` del Mercado (sin título; la columna del veredicto lleva la palabra de la banda nueva en 12 px 600 `--dim`, sin ícono). Si una cifra no cambió, se muestra igual ("70 → 70").
- Cambios de estado como `.ib-fact.ok` (✓ de 16 px `--dim`, texto 14 px `--text`).
- Si `talk` no hizo nada: solo la frase y "Listo".

**Ya hablaron**: `.vt-talkst` en 14 px y "Listo" (primario, recibe el foco). Si quiere irse, además `vt-letgo` y "Declararlo transferible" como **común** (decide sin F6: no recibe el foco ni va relleno).

**Ya no está**: "Ya no está en el plantel." 14 px `--dim` y "Listo".

### 5.9 Inicio: línea "Vestuario" del mosaico "Para atender"

Hoy (captura `inicio-1440.jpg`) toda la línea va en ámbar. Pasa a: "**Vestuario:** clima normal (62) · **4 casos**" en 14 px `--text` (las negritas en 700); sin casos, "· nada para atender" en 500 `--dim`. "Vestuario" `.btn.sm` común. La línea de pendientes del mosaico (`ib-pend`, ámbar) no cambia y es la única con ámbar.

### 5.10 Bandeja: plantilla "Jugador que quiere irse" (la misma decisión en las dos pantallas)

Para que `out<pid>` se vea igual en la bandeja y en el Vestuario, la plantilla toma las piezas de la `LockerCard`:

| Parte | Hoy (`bandeja-quiere-irse.jpg`) | Pasa a |
|-------|------|--------|
| Cifra Conformidad | número + `.bar` de 60 px con colores 65/35 | `.ib-kpi.key`: número de 21,7 px y debajo `MoodBar` `kpi` (pista `md` y palabra) |
| Cifra Minutos | "20 %" + "esperados 62 % · jugados 20 %" | `.ib-kpi`: "20 % de 62 %" (700 / 500) y debajo `vt-mins` `md` con su marca |
| Hechos | "No vence…" y chip "Promesa hasta el …" | `.ib-due` "No vence: …"; la charla usada como `.vt-talkst` 14 px; la promesa como `.mk-st.vt-why.ok` "Minutos prometidos" o `.bang` "Promesa en riesgo" |
| Acciones | Hablar con él (primario) · Declararlo transferible | Las de `outActions`: con la charla disponible, igual que hoy; con la charla usada, "Declararlo transferible" primario y la nota de `outActions` encima |
| Debajo de las acciones | — | `vt-letgo`, la misma caja |

Fila de la lista y bloque "Para decidir": sin cambios (`.msg.ib-dec`). En el celular, la barra fija de acciones lleva el primario y un común; `vt-letgo` queda en el contenido, encima.

### 5.11 Ficha breve (`HoverCard`)

"Moral" con `MoraleBar` `sm` (en lugar de `Cond`). "Físico" sigue con `Cond`. Para un ajeno, lo de 5.5 de la especificación.

---

## 6. Estados (especificación, sección 6)

| Estado | Tratamiento visual |
|--------|-------------------|
| Carga | No existe; sin esqueletos |
| Poblada | Sección 5 |
| Nadie para atender | `.ib-block-h.none` dentro de "Para atender"; panel sin elegido con las promesas |
| Inicio de temporada | Minutos "—" y "todavía no cuenta" (4.3); `.mk-note.info` en el encabezado |
| Con pedido de salida | Fila rango 1: riel ámbar y `.ib-tag.dec` "Para decidir"; en la tabla, chip "Quiere irse" de `Status` |
| Pedido reabierto / al empezar la temporada | La fila vuelve a rango 1 con el riel; nota F7 de advertencia ("!" `--warn`) en la fila |
| Lesionado o suspendido | Tendencia "‖ en pausa" con el porqué (4.5); sin chip "En baja" ni la nota "Puede pedir irse"; la barra de minutos se dibuja igual, con relleno `--dim` (no le baja la conformidad) |
| Promesa en riesgo | Chip "! Promesa en riesgo"; `vt-promise` con relleno `--bad` y veredicto "!" |
| Promesa que se extiende | `.mk-note.info` con la fecha nueva en la fila (línea 4) y en la tarjeta, 7 días |
| Charla ya usada | `.vt-talkst` en lugar del botón (fila, tarjeta, banda); "desde el 19 nov" en la tabla. Nunca un botón deshabilitado |
| Pedido con la charla usada | Rango 1 con la nota de `outActions`, "Declararlo transferible" (común en la fila, primario en la tarjeta) y `vt-letgo`. A préstamo: sin acción, la nota con el motivo |
| Reserva incompleta / sin reserva | Franja de reserva (5.2) |
| Elegido | Fila: fondo `--accent-soft`, riel `--sel` (6 px y contorno en el rango 1), nombre en 800; tabla: `aria-selected` con el riel del Mercado |
| Sin elegido | Panel `.vt-panel.none` |
| Modo "Armar la reserva" | `.vt-resmode` encima de la tabla; vista Reserva activa en el segmentado de vistas; alternables en cada fila |
| Filtro vacío | `.mk-empty` con el botón |
| Charla: elegir / confirmación / respuesta / ya hablaron / ya no está | 5.8 |
| Partida vieja sin registro | "Todavía no hablaste con él." en `--dim`; la línea "Quiere irse desde…" se omite si no hay fecha |
| Avance en curso | "Hablar", "Declararlo transferible" y los alternables en opacidad 0,4; un solo `.ib-help` "Frená el avance para hablar con el plantel." por bloque (fila elegida, tarjeta, franja de reserva) |
| Resuelta en otra pantalla | La fila cambia o desaparece sin animación |
| Jugador vendido | Desaparece de la lista y de la tabla; panel con `.ib-who.gone` |
| Error al guardar | `.ib-result.err` (✗ y texto `--bad`, sin fondo, sobre `--panel`) |
| < 1180 px / celular | Sección 7 |

---

## 7. Celular (390 px) y ventanas angostas

### 7.1 Umbrales

| Ancho | Qué cambia |
|-------|-----------|
| > 1180 px | Contenido + panel (`minmax(340px, 38%)`) |
| ≤ 1180 | Sin panel: una columna; el botón de fila abre la ficha › Vestuario y lleva un chevron › de 16 px `--dim` al final de su línea 1 ("abre otra vista") |
| Contenedor `vt-head` < 900 | Encabezado en dos filas: medidor + estado a todo el ancho arriba; "Qué la mueve" y "Referentes" abajo en dos columnas; la franja de reserva sigue abajo |
| Contenedor `vt-head` < 560 | "Qué la mueve" y "Referentes" pasan a `details.vt-disc` cerrados, uno al lado del otro (`summary` de 44 px, 14 px 600 `--text`, chevron ▾ de 16 px que gira 180° abierto, sin animación) |
| ≤ 760 | Celular (7.2) |
| `.text-big` | Los umbrales de `vt-head` se adelantan 20 % (lo hace la consulta de contenedor sola, porque el texto más grande ocupa más) |

### 7.2 Celular

```
┌────────────────────────────────────┐
│ [escudo] 10 ene        [Continuar] │ barra existente
├────────────────────────────────────┤
│ Vestuario                          │ h1, 19,6 px
│ ┌ .vt-head ───────────────────────┐│
│ │ ╭62╮ Clima normal               ││ medidor 96 × 58; 17,5 px
│ │ ╰──╯ Armonía 62 · sin efecto    ││
│ │ [Qué la mueve ▾][Referentes ▾]  ││ 44 px
│ │ ─────────────────────────────── ││
│ │ Reserva: 8 anotados · mié 18    ││
│ │ [      Armar la reserva       ] ││ 44 px, todo el ancho
│ └─────────────────────────────────┘│
│ ┌ Para atender (4) ───────────────┐│
│ │▌{32} M. Gómez · Titular   (!) › ││ ← toda la fila es el botón (≥ 72 px)
│ │▌                                ││   "Para decidir" como "!" (bandeja)
│ │▌ Quiere irse: juega 20 % de 62 %││
│ │▌ Si no le respondés…            ││
│ │ [          Hablar           ]   ││ ← hermano, 44 px, todo el ancho
│ │ ─────────────────────────────── ││
│ └─────────────────────────────────┘│
│ [✓ Todo 30][En la reserva 8][Juv▒ │ chips de 44 px, desplazables, máscara
│ ┌ tabla ──────────────────────────┐│
│ │ Jugador       Rol       Conform.││ filas de 48 px
│ │ M. Gómez !          14 Muy molesto ││ ← a 390 px: nombre y conformidad (apilada)
│ └─────────────────────────────────┘│
├────────────────────────────────────┤
│ Inicio Bandeja Plantel Tácticas Más│ 62 px
└────────────────────────────────────┘
```

- **Encabezado**: una columna; medidor 96 × 58 a la izquierda y el estado a la derecha (17,5 px); disclosures de 44 px; "Armar la reserva" a todo el ancho, 44 px. Unos 230 px de alto cerrado.
- **Para atender**: el `li` pasa a columna: el botón de fila arriba (todo el ancho, el chip principal en su propia línea, chevron ›), la acción hermana debajo, **a todo el ancho de la fila** (16 px de cada lado) y 44 px, para que sea fácil de tocar con el pulgar. `.vt-talkst` en el lugar de la acción, alineado a la izquierda. El chip "Para decidir" se ve como en la bandeja del celular: el "!" ámbar en un círculo de 22 px con el texto en el nombre accesible (la regla `.ib-tag.dec` de ≤ 760 px ya es global y no se pisa); el riel ámbar y la causa "Quiere irse: …" siguen a la vista.
- **Tabla**: columnas por prioridad (a 390 px, nombre y conformidad; en la vista Reserva, nombre y alternable); filas de 48 px; las escalas apiladas con su pista; el alternable `.vt-res` de 44 × 88.
- **Modo "Armar la reserva"**: `.vt-resmode` en dos renglones (texto arriba, cuenta abajo); la frase del teclado se oculta en celular (no hay teclado) y queda "Tocá «Anotar» en cada jugador. Hacen falta al menos 7 sanos."
- **Ficha › Vestuario**: la `LockerCard` en una columna; el primario "Hablar con él" a todo el ancho y 44 px; `vt-letgo` a todo el ancho.
- **Ventana de charla**: ocupa todo el ancho y el alto disponibles, con desplazamiento interno; opciones de 56 px como mínimo; el selector de rol en dos renglones; el pie **al final del contenido** (no fijo), con "Cancelar" y "Hablar" de 44 px en dos columnas iguales; la confirmación en columna con "No" y "Confirmar: …" en `grid-template-columns: auto 1fr` (el primario ancho, a la derecha). A 320 × 568, "Hablar" y "Confirmar" se alcanzan desplazando el cuerpo (especificación 14).
- **Reserva de foco**: la de `.main` en el celular ya existe y no cambia (especificación 5.2); filas y botones con `scroll-margin-top: var(--bulkbar-h)` mientras la barra masiva está a la vista.

### 7.3 Texto al 120 %

La tabla oculta columnas por prioridad; el panel desplaza; el encabezado pasa a dos filas o a disclosures por contenedor; las filas de "Para atender" crecen (nada se corta); en la ventana, la etiqueta "tiene costo" baja debajo del título.

---

## 8. Coherencia con lo que ya está hecho

| Pantalla | Qué se toma | Cómo |
|----------|-------------|------|
| Bandeja | La decisión `out<pid>` | Riel ámbar de 3 px, `.ib-tag.dec` "Para decidir", `.ib-due` "No vence", elegida con 6 px `--sel` y contorno; la plantilla de la bandeja toma `MoodBar`, `vt-mins`, `vt-talkst` y `vt-letgo` de la `LockerCard` (5.10). Un concepto, una pieza |
| Bandeja | Confirmación, nota, ayuda, vacío | `.ib-confirm`, `.ib-result`, `.ib-help`, `.ib-block-h.none`, `.ib-conseq`, `.ib-fact.ok`, `.ib-who.gone` |
| Mercado | Chips de estado | `.mk-st` con sus modificadores de ícono (`.bang`, `.ok`); `.vt-why` solo sube el texto a `--text` |
| Mercado | Veredictos e impacto | `.mk-verdict` para la promesa (✓ / ! / ✗); `.mk-impact` para "antes → después" de la charla; `.mk-ask` para la cita |
| Mercado | Avisos | `.mk-note.info` ("i") y `.mk-note.warn` ("!" ámbar) |
| Mercado | Tabla y panel | Fila elegida, fila marcada, encabezados a 12 px, panel pegajoso con acciones en el contenido, `.mk-empty`, `.mk-hist` para el registro de charlas, `kbd` |
| Mercado | Alternable | "✓ Anotado" es el `.btn.on` de "Seguir" |
| Ficha | Banda | Sin cambios de forma; solo `.vt-band-talk` y `.vt-band-note` en la fila de pestañas |
| Inicio | Mosaico "Para atender" | El N de la línea "Vestuario" es el de "Para atender (N)"; sin ámbar |
| Tácticas | Selector de rol | `Seg` C1 como en el rol prometido de la negociación |
| Botones | Sin cambios de forma | `.btn`, `.btn.primary` (tinta por contraste), `.btn.sm`, `.btn.on`; ningún peligro en esta pantalla |

---

## 9. Transiciones

Las de la especificación 10, sin agregar ninguna: `page-in` 160 ms al entrar y al abrir la ficha; `fade` + `pop` 140 ms en la ventana; hover de fondo 120 ms en filas, opciones, chips y botones (apagado con `.reduce-motion` y `prefers-reduced-motion`). Elegir, filtrar, marcar una opción, confirmar, mostrar la respuesta o la nota, anotar, abrir un disclosure, girar el chevron y cambiar el medidor: 0 ms. El relleno de las escalas no se anima.

---

## 10. Accesibilidad (nivel Estándar)

### 10.1 Tamaños mínimos (todo ≥ 12 px; cuerpo, filas y botones ≥ 14 px)

| Elemento | Hoy | Ahora |
|----------|-----|-------|
| Rótulo "ARMONÍA" del medidor | 8 px en mayúsculas | Fuera del SVG; "Armonía 62 de 100" a 14 px |
| Encabezados de la tabla | 10,6 px `--faint` | 12 px `--dim` |
| Rasgos y "Hablaron hace poco" (`.dim.sm`) | 11,8 px | 12 px (`.vt` sube `.sm` a 0,86rem) |
| `.btn.sm` ("Hablar", "Juega", "No") | 11,5 px | 12 px, 32 px de alto |
| Chips `Status` | 10,6 px | 12 px dentro de `.vt` y `.vt-scope` |
| `.pill` de puesto | 9,8 px | 12 px dentro de `.vt` |
| Nota de la reserva al pie de la tabla | 11,8 px | Se reemplaza por la franja de reserva (14 px) |

Objetivos: filas de lista ≥ 72 px, filas de tabla ≥ 40 px y botones ≥ 32 px en escritorio; en ≤ 760 px, 44 × 44 en filas, "Hablar", chips, disclosures, alternables, opciones, "Listo", "Confirmar", ✕.

### 10.2 Contraste (medido con `production/ui/vestuario/contraste.mjs`, 86 clubes con economía)

**Texto (mínimo 4,5)**

| # | Texto | Fondo | Medido |
|---|-------|-------|--------|
| 1 | Nombre, causa, cifras `--text` | `--panel` | 14,64 |
| 2 | Consecuencia, rótulos, `talkState` `--dim` | `--panel` | 6,99 |
| 3 | `--dim` | fila par de la tabla | 6,67 |
| 4 | `--dim` | hover `--panel2` | 6,16 |
| 5 | "Para decidir" `--text` | ámbar 13 % sobre `--panel2` | 9,87 (`.cvd` 9,51) |
| 6 | Chip de motivo `--text` | `--panel2` | 12,89 |
| 18 | Número de escala en caja / ventana `--text` | `--panel2` | 12,89 |
| 19 | Palabra de banda media o alta `--dim` | `--panel` | 6,99 |
| 20 | Número del medidor `--text` | `--panel` | 14,64 |
| 22, 24 | Regla de opción y motivo de deshabilitada `--dim` (sin opacidad) | `--panel` | 6,99 |
| 26–28 | "Cómo está", `vt-letgo`, cita `--text` / `--dim` | `--panel2` | 12,89 / 6,16 |
| 29 | "tiene costo" `--dim` | `--panel2` | 6,16 |
| 30 | `kbd` `--text` | `--panel2` | 12,89 |
| 31 | Texto `--dim` sobre la página | #0a0c1b | 8,32 |
| 41 | `--text` en fila elegida, opción marcada, "✓ Anotado" | `--accent-soft` sobre `--panel` | mín 10,89 (Temperley) |
| 42 | `--dim` en fila elegida (consecuencia, rasgo "Normal") | ídem | mín 5,20 (Temperley) |
| 49 | Título de tarjeta (acento 62 % + blanco) | `--panel` | mín 6,44 (Argentinos) |
| 50 | `talkState` en la banda `--text` | fila de pestañas de la banda | mín 12,24 (Defensa) |
| 51 | `--text` | banda, extremo izquierdo (34 %) | mín 5,98 (Defensa) |
| 52 | `--dim` | banda (34 %) | **mín 2,86: no llega en 58 de 86 — no se usa en la banda** (ver 13) |
| — | Botón primario (tinta / acento) | acento | mín 4,58 (`tools/check-contrast.mjs`) |
| — | `.btn.on` "✓ Anotado" `--text` | acento 22 % sobre `--panel2` | mín 7,96 (ídem) |
| 32 | `--faint` | `--panel3` | 4,05: prohibido, no se usa |

**No texto (mínimo 3)**

| # | Indicador | Fondo | Medido |
|---|-----------|-------|--------|
| 7, 8 | "!" de aviso `--warn` | `--panel2` / `--panel` | 8,18 / 9,30 (`.cvd` 9,74 / 11,07) |
| 9 | Riel de decisión `--warn` | `--panel` | 9,30 (`.cvd` 11,07) |
| 10 | Íconos neutros (↓, −, ⇄, reloj, candado) `--dim` | `--panel2` | 6,16 |
| 11 | ✓ `--good` | `--panel2` | 8,14 (`.cvd` 5,46) |
| 12 | ✗ `--danger` | `--panel` | 7,25 |
| 13 | Relleno bajo la línea `--bad` | pista `--panel3` | 4,24 (`.cvd` 5,13) |
| 14 | Relleno medio `--dim` | pista `--panel3` | 5,42 |
| 15 | Relleno alto `--text` | pista `--panel3` | 11,34 |
| 17 | Marca de umbral `--text` | `--panel` / pista | 14,64 / 11,34 |
| 17c | Marca `--text` sobre relleno `--dim` sin halo | — | 2,09: **por eso lleva halo** |
| 17d–f | Halo `--panel` de la marca | relleno `--dim` / `--bad` | 6,99 / 5,47 (`.cvd` 6,63) |
| 21 | Arco de armonía `--bad` | pista `--panel3` | 4,24 (`.cvd` 5,13) |
| 23 | Aro del radio sin marcar `--dim` | `--panel` | 6,99 |
| 43 | "!" `--warn` en fila elegida | `--accent-soft` sobre `--panel` | mín 6,91 (`.cvd` 8,23) |
| 44 | Riel 6 px, contorno y foco `--sel` | fila elegida | mín 4,97 (Lanús) |
| 45, 46 | Foco `--sel` | `--panel` / `--panel2` | mín 5,64 / 4,96 (Lanús) |
| 47 | Radio marcado `--sel` | opción marcada | mín 4,97 (Lanús) |
| 48 | Borde `--accent-hi` de la opción marcada y del alternable | `--panel` | mín 5,62 (Lanús) |
| 53 | Reloj de `talkState` en la banda `--text` | fila de pestañas | mín 12,24 |

**Resultado**: 0 fallas en los pares que se usan. El texto más justo es `--dim` sobre la fila elegida (5,20); el indicador más justo, el relleno `--bad` sobre la pista (4,24) y el foco sobre `--panel2` (4,96). Además, el script mide la distancia de matiz entre `--accent-hi` y `--bad`: mínimo 4,7°, 24 clubes a menos de 25° (decisión 1: por eso las escalas no usan el acento). `node tools/check-contrast.mjs`: 0 fallas. Si la fase 3 toca `clubTheme` o la banda, correr los dos scripts.

**La pista contra su fondo** (`--panel3` sobre `--panel` o `--panel2`) no llega a 3:1, igual que en los medidores del Mercado: el largo total de la escala se lee por los tramos y por el número, que siempre está.

### 10.3 Nada solo por color

| Estado | Color | Segunda marca |
|--------|-------|---------------|
| Conformidad, moral, armonía | Rojo / gris / blanco | Largo, tramos, número, palabra; palabra en 700 en las bandas bajas |
| Minutos debajo del umbral | Relleno rojo | Marca vertical (forma), "20/62 %", "se molesta por debajo de 53 %" |
| Promesa | Relleno y veredicto | Marca, ícono ✓ / ! / ✗ y palabra |
| Motivo de la fila | Tinte del chip | Texto del chip, ícono de forma distinta por motivo, riel solo en la decisión |
| Decisión `out<pid>` | Ámbar | Riel, chip "Para decidir", "No vence" |
| Referente "Resta" | — | "!" y la palabra; "Acompaña" en la otra |
| Tendencia | — | Flecha arriba / abajo o raya, y la palabra |
| Elegido | `--accent-soft` | Riel `--sel` (6 px y contorno en la decisión), 800, `aria-current` / `aria-selected` |
| Opción marcada | `--accent-soft` | Punto del radio, borde, `aria-checked` |
| Opción deshabilitada | — | Borde y aro discontinuos, candado y motivo escrito |
| Anotado en la reserva | Acento | "✓ Anotado", `aria-pressed` |
| Rasgo distintivo | — | 700 contra 500, palabra |
| Antes → después | — | Flecha, signo, palabra de la banda nueva |
| Nota F7 | Riel | Ícono ✓ / ! / ✗ y texto |

Con `.cvd` y con la emulación de deuteranopía, todo lo anterior sigue distinguiéndose: lo único que depende del tono es el refuerzo.

### 10.4 Foco

Todo foco es `outline: 2px solid var(--sel)` a 2 px hacia afuera, salvo filas (tabla y "Para atender": −2 px hacia adentro, sobre el `li`), opciones de la charla (en la caja de la opción) y lo que recibe el foco por programa sin ser un control (título "Para atender", "Charla", `.vt-talkst`, `.vt-reply`, notas F7: sin anillo, como `.ib-h`; las notas con `:focus-visible` sí lo llevan, como `.ib-result`). Por debajo de 1180 px, la primera fila de "Para atender" recibe el foco al entrar sin elegirse: se ve el anillo y no el fondo de elegida. `scroll-margin-top: var(--bulkbar-h)` en filas y botones con la barra masiva a la vista (especificación 5.2); nada más, porque la barra superior está fuera de `.main`.

---

## 11. Manifiesto de assets

Íconos SVG en línea con `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, extremos y uniones redondeados, `aria-hidden="true"` (el significado va en el texto o en el `aria-label`). Se dibujan con `ic(d, trazo)` de `src/ui/msg.tsx` o con `S` de `src/ui/deal.tsx`; los nuevos van en `IC` (`msg.tsx`). **Sin rasters nuevos**: solo los escudos y `src/assets/player.webp` (`Face` de 24, 32 y 52 px). **Sin fuentes nuevas.**

| Ícono | Trazado (`d`) | Trazo | Tamaños | Dónde | Estado |
|-------|---------------|-------|---------|-------|--------|
| "!" | `MI.bang` / `IC.bang` | 2,4 | 12 (chips, referente, reserva), 14 (franja de reserva, veredicto), 16 (avisos) | Motivos 2-3, "Resta", reserva incompleta, "Puede pedir irse", promesa en riesgo | Existe |
| ✓ | `MI.ok` / `IC.check` | 2,4 / 2,8 | 12 (chips, registro), 14 (veredicto), 16 (cambios de la respuesta, vacío) | "Minutos prometidos", "Va bien", "cumpliste", "Le convenció", "Nadie para atender" | Existe |
| ✗ | `MI.x` | 2,4 | 12, 14 | "Ya no llega", "no cumpliste", "Lo tomó mal" | Existe |
| Reloj | `MI.clock` / `IC.clock` | 2,4 | 12 (fila, tabla), 14 (tarjeta, banda) | `talkState`, "se corrió", promesa sin medir | Existe |
| Candado | `MI.lock` | 2,4 | 14 | Motivo de opción deshabilitada, "No disponibles ahora" | Existe |
| Información "i" | `MI.info` | 2,4 | 16 | `.mk-note.info` (inicio de temporada, prórroga, ajenos al 60-99 %) | Existe |
| ⇄ | `MI.swap` (= `TAG_ICON.mercado`) | 2,4 | 12 (chip), 14 (`vt-letgo`, "Está declarado transferible") | "Quiere irse · transferible", ofertas | Existe |
| Flecha "pasa a" | `MI.arrow` | 2,4 | 14 | `.mk-impact` de la respuesta | Existe |
| Chevron › | `IC.next` | 2,8 | 12 ("Cómo se eligen"), 16 (enlaces, filas angostas) | — | Existe |
| Chevron ▾ | `M6 9l6 6 6-6` (`TopNav.tsx:48`) | 2,6 | 16 | Disclosures del celular | Existe (pasar a `IC.down`, como pidió el Mercado) |
| Personas | `TAG_ICON.club` | 2,4 | 20 en círculo de 40 | Panel sin elegido | Existe |
| ✕ | `IC.x` | 2,4 | 14 | Cerrar la charla | Existe |
| **Tendencia: baja** | `M12 5v14M6 13l6 6 6-6` | 2,4 | 12 (chip "En baja"), 14 (tendencia) | Rango 4, `moodOutlook` | **Nuevo** (`IC.trendDown`) |
| **Tendencia: sube** | `M12 19V5M6 11l6-6 6 6` | 2,4 | 14 | `moodOutlook` | **Nuevo** (`IC.trendUp`) |
| **Estable** | `M6 12h12` | 2,8 | 14 | `moodOutlook` "estable", "No le convenció" | **Nuevo** (`IC.flat`; raya, no flecha) |
| **En pausa** | `M9 6v12M15 6v12` | 2,6 | 14 | `moodOutlook` "en pausa" (lesión o suspensión) | **Nuevo** (`IC.pause`) |
| **Resta** ("−" en círculo) | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12h8` | 2,4 | 12 | Rango 5 "Referente que resta" | **Nuevo** (`IC.minus`) |
| Pista cortada, relleno, marca de umbral | CSS (`.vt-track`, `.vt-mins-mark`) | — | 6 / 8 px de alto | Escalas y minutos | Nuevo, solo CSS |
| Medidor de armonía en tramos | SVG de `Gauge` (110 × 66, arco de 9, `butt`) | — | 120 × 72, 96 × 58 | Encabezado | Cambio de `Gauge` (prop opcional) |
| Radio | CSS (`.vt-radio`: aro de 2 px y punto de 8 px) | — | 18 px | Opciones de la charla | Nuevo, solo CSS |

---

## 12. Clases CSS para la fase 3

Todo en una sección `/* portal: vestuario (production/ui/vestuario/visual-design.md) */` después del bloque del Mercado en `src/styles.css`. Ámbito: `.vt` es la página (`<div className="page vt">`); la ficha › Vestuario y la banda llevan `.vt-scope`. **Comprobado contra `src/styles.css`**: no hay ninguna clase `.vt` ni `.vt-…`, y ninguna de las de abajo coincide con una existente (en particular, nada de `.lk-*` ni `.bar`). Lo que dice **global** cambia otras pantallas a propósito.

**Cambiar**

| Clase / lugar | Cambio |
|---------------|--------|
| `.mk .ptable th`, `.mk .ptable tr.selrow td`, `.mk .ptable tr[aria-selected=true] …`, `.mk .ptable tr:focus…`, `.mk .ptable tr { scroll-margin-top }` | Pasar el selector a `:is(.mk, .vt) .ptable …`: una regla para las dos tablas con panel (no copiarla) |
| `.mk button:focus-visible, …` y `.mk kbd` | Sumar `.vt`, `.vt-scope` y `.vt-talk` al selector |
| `.mk .btn.sm, .mk-scope .btn.sm, .mk .pill, .mk .chip` (12 px, 32 px) | Sumar `.vt`, `.vt-scope` |
| `.mk .linkish.sm, .mk .dim.sm, .mk-scope .dim.sm` | Sumar `.vt .sm`, `.vt-scope .sm` (≥ 12 px) |
| Bloque `@media (max-width: 760px)` de 44 px del Mercado | Sumar `.vt .btn`, `.vt-scope .btn`, `.vt-opt`, `.vt-disc summary`, `.vt-res` |
| `Gauge` (`common.tsx`) | Props opcionales `cuts` (tramos) y `tone` (`lo`/`mid`/`hi`), `role="img"` y `aria-label`; sin `label`, no dibuja el rótulo interno. Sin props, igual que hoy (Inicio y Club) |
| `Status` (`common.tsx`) | **Global**: "Promesa" (`.chip.acc`) pasa a "Minutos prometidos" en `.chip` neutro; "Molesto" (`.chip.warn`) pasa a la palabra de `moodOf` en `.chip` neutro con "!" de 12 px `--warn`; "Quiere irse" sin cambios |
| `Cond` (`common.tsx`) | Deja de usarse para conformidad y moral (`PlayerTable` columnas `happy` y `mor`, `PlayerPage`, `Nav.tsx:128`, `Locker.tsx`); sigue para el físico |
| `Bar` y `BarN` de `Locker.tsx` | Se borran (los reemplazan `vt-scale` y `vt-mins`) |
| `.hero` del Vestuario | Se retira de esta pantalla; la reemplaza `.vt-head` |
| Plantilla `out` de la bandeja (`Inbox.tsx`) | 5.10: `MoodBar` `kpi`, `vt-mins`, `vt-talkst`, `vt-letgo` |
| Mosaico "Para atender" (`Home.tsx:136`) | Sin `warn` en la línea "Vestuario" (5.9) |
| `IC` (`msg.tsx`) | Sumar `trendDown`, `trendUp`, `flat`, `pause`, `minus`, `down` (sección 11). **Global** |
| `TIPS.locker` (`Guide.tsx`) | Texto de la especificación 5.3 |

**Agregar**

| Clase | Qué dibuja |
|-------|-----------|
| `.vt`, `.vt-scope` | Ámbitos (sin `scroll-padding` propio: especificación 5.2) |
| `.vt-title` | `h1` "Vestuario" con el tamaño de `h2` portal |
| `.vt-head`, `.vt-head-l`, `.vt-hstate`, `.vt-hsub` | Encabezado (contenedor `vt-head`) y su texto |
| `.vt-gauge` | Envoltura del medidor (tamaños 120 / 96) |
| `.vt-parts`, `.vt-parts-total` | "Qué la mueve" |
| `.vt-leads`, `.vt-lead`, `.vt-lead-st`, `.vt-lead-st.minus` | Referentes y su estado |
| `.vt-disc` | `details` con `summary` de chevron (escritorio 12 px; celular 44 px) |
| `.vt-res-line`, `.vt-res-line.short` | Franja de reserva; `.short` = incompleta (700 con "!") |
| `.vt-main` | Retícula contenido + panel desde 1181 px |
| `.vt-att`, `.vt-att-t`, `.vt-att-list`, `.vt-att-row`, `.vt-att-row.dec`, `.vt-att-pick`, `.vt-att-n`, `.vt-att-c`, `.vt-att-k`, `.vt-att-more`, `.vt-att-act`, `.vt-att-note` | "Para atender": tarjeta, lista, fila (riel ámbar en `.dec`; elegida por `:has([aria-current=true])`), botón de fila, líneas, chips secundarios, acción hermana, nota |
| `.mk-st.vt-why` (`.bang`, `.ok`) | Chips de motivo: texto `--text`, ícono `--dim` salvo `.bang` (`--warn`) y `.ok` (`--good`) |
| `.vt-talkst` | Texto de `talkState` con reloj (12 / 14 px) |
| `.vt-scale`, `.vt-scale.sm` (apilada), `.vt-scale.md`, `.vt-scale.kpi`, `.vt-scale.lo`, `.vt-scale.mid`, `.vt-scale.hi`, `.vt-track`, `.vt-scale-n`, `.vt-scale-w` | `MoodBar` y `MoraleBar` (4.1) |
| `.vt-mins`, `.vt-mins.sm`, `.vt-mins.md`, `.vt-mins.low`, `.vt-mins-mark`, `.vt-mins-t` | Barra de minutos (4.3); `.low` = relleno `--bad` |
| `.vt-promise` | Promesa (4.4) |
| `.vt-trend` | Tendencia con ícono (4.5), también "en pausa" |
| `.vt-traits` | Personalidad en lista (y `.vt-traits.inline` para "Cómo está" y la columna `pers`) |
| `.vt-pers` | Celda de la columna `pers` |
| `.vt-res`, `.vt-res-sub` | Alternable de reserva (ancho mínimo 86 px) y su segunda línea "Lesionado" / "Suspendido" |
| `.vt-resmode` | Línea del modo "Armar la reserva" |
| `.vt-panel`, `.vt-panel.none` | Panel pegajoso y su estado sin elegido |
| `.vt-card`, `.vt-card-top`, `.vt-card-name`, `.vt-card-h`, `.vt-card-sec`, `.vt-card-note`, `.vt-dl` | `LockerCard` (contenedor `vt-card`; dos columnas desde 720 px) |
| `.vt-letgo` | Interior de la comparación (sobre `.ib-conseq`) |
| `.vt-band-talk`, `.vt-band-note` | Banda de la ficha: `talkState` y nota F7 con fondo `--panel` |
| `.vt-talk`, `.vt-talk-m`, `.vt-how`, `.vt-opts`, `.vt-opts-off`, `.vt-opt`, `.vt-opt[aria-checked=true]`, `.vt-opt[aria-disabled=true]`, `.vt-radio`, `.vt-opt-t`, `.vt-opt-r`, `.vt-opt-who`, `.vt-opt-why`, `.vt-opt-extra`, `.vt-talk-foot`, `.vt-talk-f`, `.vt-confirm`, `.vt-reply` | Ventana de charla (5.8) |

**Media queries y contenedores**

| Condición | Cambios |
|-----------|---------|
| `@container vt-head (max-width: 900px)` | Encabezado en dos filas |
| `@container vt-head (max-width: 560px)` | "Qué la mueve" y "Referentes" como `.vt-disc` cerrados |
| `@container vt-card (min-width: 720px)` | `LockerCard` en dos columnas |
| ≤ 1180 px | `.vt-main` en una columna; `.vt-panel` oculto; chevron en las filas |
| ≤ 760 px | Medidor 96 × 58; filas de "Para atender" en columna con la acción a todo el ancho (44 px); chips de filtro desplazables con máscara (44 px); `.vt-resmode` en dos renglones sin la frase del teclado; ventana a pantalla completa con pie en el flujo |

---

## 13. Riesgos y temas abiertos

- **Para el usuario**: la decisión 1 (escalas en rojo / gris / blanco, sin verde ni ámbar; la alternativa B es verde arriba) y la 4 (botones comunes en las filas, primario solo en la tarjeta y la ventana). Las dos se revierten sin tocar el resto.
- **La charla de hoy no funciona** (capturas `charla-quiere-irse.jpg` y `charla-390.jpg`): en `TalkModal` (`src/ui/Locker.tsx`), `opts.filter(o => o[3]).map(([k, t, d, no]) => …)` toma el cuarto elemento de cada opción (el `true` de "se muestra") como motivo de deshabilitado, así que **todas las opciones salen deshabilitadas** y sin su regla; solo se puede cambiar el rol. El rediseño lo reemplaza (`talkOptions`), pero si la fase 3 tarda, conviene arreglarlo antes.
- **`--dim` sobre la banda de la ficha** no llega a 4,5 en 26 (al 25 %) a 58 (al 34 %) de los 86 clubes (medido). Esta pantalla no lo usa ahí (`.vt-band-talk` va en `--text`), pero hoy la banda ya escribe en `--dim` la fecha de nacimiento y el pie hábil: deuda global, fuera de esta pantalla.
- **`Gauge`** de la confianza (Inicio y Club) sigue con el rótulo de 8 px en mayúsculas y los colores verde / ámbar / rojo; **`Cond`** del físico sigue con ámbar entre 65 y 85. Las dos son deuda global con la misma regla de este documento; se corrigen fuera del Vestuario.
- **`Status` es global**: el chip "Molesto" con la palabra de `moodOf` y "!" y el chip "Minutos prometidos" se ven también en Plantel, el Mercado y las fichas (a propósito: una palabra, un corte).
- **La pista de las escalas contra el panel** no llega a 3:1 (como en el Mercado); lo compensan los tramos y el número.
- **Clubes rojos**: el relleno `--bad` y el riel `--sel` tienen casi el mismo matiz en 24 clubes. No se confunden porque son formas distintas en lugares distintos (barra dentro de la celda contra riel en el borde de la fila) y la elegida lleva además fondo y 800; queda anotado para la verificación de la fase 4 con Independiente.
- **Las capturas de la fase 3** tienen que repetir el estado de `ref/` (pedido de salida, promesa, charla usada, referente que resta, reserva) más una promesa en riesgo, un "En baja", el modo "Armar la reserva", la ventana en sus cinco estados y Defensa y Justicia, y medir con `elementFromPoint` como `tests/ui/mercado.cjs`.
