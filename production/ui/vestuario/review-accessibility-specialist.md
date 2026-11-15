# Revisión de accesibilidad: Vestuario (fase 4 de /team-ui)

> **Revisor**: accessibility-specialist · **Fecha**: 2026-11-15 · **Rama**: `vestuario-ui` (`3d097ad`)
> **Nivel**: Estándar (`design/accessibility-requirements.md`): WCAG 2.1 AA + 2.5.8 y 2.4.11 de WCAG 2.2, más la sección 12 de `design/ux/vestuario.md`.
> **Alcance**: `src/ui/Locker.tsx` (`LockerPage`, `LockerCard`, `TalkModal`), `src/ui/mood.tsx`, `src/ui/PlayerTable.tsx` (vistas `vestuario` y `reserva`, `ResToggle`, `prio`/`keep`), `src/ui/PlayerPage.tsx` (banda "Hablar", pestaña Vestuario), plantilla `out` de `src/ui/Inbox.tsx`, `Gauge` y `Status` de `src/ui/common.tsx`, bloque `/* portal: vestuario */` de `src/styles.css`.
> **Método**: Chromium (Playwright 1.63) contra `npm run dev`; axe-core 4.14.0 (etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`); recorridos solo con teclado en 1440×900, 390×844 (táctil), 320×568 (táctil) y 320×256; emulación de acromatopsia, deuteranopía (con el modo `cvd`) y protanopía por CDP; `prefers-reduced-motion` y `settings.motion`; zoom 200 % (1280 → 640 px CSS), texto del juego al 120 % en 320 px; espaciado de texto de 1.4.12 inyectado; `settings.singleKeys === false`. Además: `node tools/check-contrast.mjs`, `node production/ui/vestuario/contraste.mjs` y la prueba de aceptación `tests/ui/vestuario.cjs` con `AXE=` (373 de 373 pasan). Los guiones de esta revisión quedaron en el scratchpad de la sesión (temporal); sus salidas clave están copiadas abajo.

## Accesibilidad: NO CUMPLE (nivel Estándar)

La base está bien hecha: escalas con número y palabra, medidor con nombre, `radiogroup` con reglas en `aria-describedby`, notas F7 en `role="status"`, devolución del foco correcta desde el Vestuario, contraste del tema en los 86 clubes, daltonismo y movimiento reducido. Pero hay **8 bloqueantes**: Esc en la charla abierta desde la ficha cierra la ventana **y saca al DT de la ficha**; el foco se pierde en `body` después de "A la reserva"; tras "Armar la reserva" el foco queda fuera de la pantalla; la barra masiva tapa el foco en 320×256; el chip "Quiere irse" no llega a 4,5:1 (2,52:1 en Defensa) y mide 10,6 px en la banda de la ficha, la ficha breve y la bandeja; el selector de rol está anidado dentro de un `role="radio"`; los cambios de reserva no se anuncian; y quedan objetivos de menos de 44 px en el celular.

---

## 1. Requisitos aplicables

| Requisito | Estado | Evidencia |
|---|---|---|
| 1.1.1 Contenido no textual | **Cumple, con hueco** | `Gauge`: `role="img"`, «Armonía 58 de 100: clima normal». `MoodBar`/`MoraleBar`: la pista es `aria-hidden` y el número y la palabra son texto («44 Conforme»), con `dt` o encabezado de columna como contexto. Hueco: la marca de umbral de `MinsBar` chica (tabla) no tiene equivalente en texto (P2) |
| 1.3.1 Información y relaciones | **Cumple, con hueco** | `ul` con `aria-labelledby="vt-att-t"`; `dl` en la tarjeta, las partes y la personalidad; tabla con encabezados (botones `th-sort` con `.vh` explicativo); `radiogroup` con nombre. Hueco: el nombre de la fila de la grilla tapa los datos de la vista (P2) |
| 1.4.1 Uso del color | **Cumple** | En acromatopsia y deuteranopía (con `.cvd`) y en protanopía: motivo con texto e ícono, «!» y «Resta», «Para decidir» con texto, elegido con riel y fondo, radio con punto, tendencia con flecha y palabra, historial con ✓ y ✗ más texto |
| 1.4.3 Contraste (texto) | **NO CUMPLE** | B5: «Quiere irse» (`.chip.bad`) en 2,52:1 (Defensa), 3,35 (Boca), 3,52 (Independiente) en la banda de la ficha; 4,09 en la ficha breve; 3,62 en la bandeja. Lo demás pasa: `check-contrast.mjs` y `contraste.mjs` con 0 fallas; axe sin fallas en el Vestuario |
| 1.4.4 Cambio de tamaño del texto | **Cumple** | A 640 px CSS (zoom 200 % sobre 1280) no hay desborde ni recortes en el Vestuario, la charla ni la ficha |
| 1.4.10 Reajuste (320 px) | **Cumple, con hueco** | Sin desplazamiento horizontal en 320×568 ni 320×256; la charla se desplaza dentro de la ventana. Hueco: los nombres de la tabla se cortan a 56 px (31 px con texto al 120 %) (P5) |
| 1.4.11 Contraste sin texto | **Cumple** | Rellenos sobre la pista ≥ 4,24; marca de umbral con halo; foco `--sel` ≥ 4,96 en los 86 clubes; riel `--warn` 9,30 |
| 1.4.12 Espaciado del texto | **Cumple** | No se pierde texto. Solo se recorta el borde derecho de «✓ Anotado» (celda de 100 px) y «Jugador clave» pasa a «Jugador…» (captura en la sección 4) |
| 1.4.13 Contenido al pasar el mouse | No evaluado a fondo | La ficha breve es global (AC-06 sigue parcial); aparece en el Vestuario con `data-pid` |
| 2.1.1 Teclado | **Cumple** | Los tres recorridos se completan solo con teclado en las cuatro medidas (sección 3) |
| 2.1.2 Sin trampa | **Cumple** | La ventana retiene Tab a propósito; Esc, ✕, Cancelar y Listo salen |
| 2.1.4 Atajos de una tecla | **Cumple** | Con `singleKeys: false`, Espacio, 1, 3, /, ? y Mayús+Espacio no hacen nada. Encendidos, Espacio sobre una fila de "Para atender" la activa y no avanza el día; Espacio sobre una opción de la charla la marca; 1, 2, / y ? con la ventana abierta no hacen nada |
| 2.4.3 Orden del foco | **NO CUMPLE** | B1: Esc en la charla abierta desde la ficha vuelve a la página anterior. B2: el foco cae en `body` después de "A la reserva". Los destinos de la tabla de la spec se cumplen en todo lo demás |
| 2.4.6 Encabezados y etiquetas | **Cumple** | `h1` Vestuario, `h2` "Para atender", `h3` por sección de la tarjeta, ventana con `aria-labelledby` al `h2` "Charla con …" |
| 2.4.7 Foco visible | **NO CUMPLE** | B3: después de "Armar la reserva" el foco queda en una fila fuera de la pantalla. Además hay destinos de foco sin indicador (P1) |
| 2.4.11 Foco no tapado (2.2) | **NO CUMPLE** | B3 (1440×900 y 320×568) y B4 (320×256: la barra masiva fija tapa la fila con foco) |
| 2.5.3 Etiqueta en el nombre | Advertencia | axe marca las opciones de la lista de la bandeja (`label-content-name-mismatch`): solo cambia la puntuación («·» en pantalla y «,» en el nombre). Es de la bandeja y no bloquea (P6) |
| 2.5.8 Tamaño del objetivo (2.2, 24 px) | **Cumple** | Lo que mide menos de 24 px en escritorio (referentes 18 px, encabezados 14 px, casillas 13 px) pasa por la excepción de espaciado |
| Objetivos de 44 px en el celular (spec, criterio 14 «a 360 px, todos ≥ 44») | **NO CUMPLE** | B8: referentes de 70×28 y 57×42, «Seleccionar todos» de 13×13 a 390 px |
| 3.2.2 Al introducir datos / AM-07 | **NO CUMPLE** | B1: una tecla de la ventana (Esc) cambia de página |
| 4.1.2 Nombre, función, valor | **NO CUMPLE** | B6: `nested-interactive` (botones de "Nuevo rol" dentro de `role="radio"`). Lo demás está bien: `aria-pressed` en los chips, la vista y el alternable; `aria-checked` y `aria-disabled` en las opciones; `aria-current` en la fila elegida; `aria-describedby` de las reglas, los rasgos, `vt-letgo` y la confirmación (todas las referencias existen y no hay ids repetidos) |
| 4.1.3 Mensajes de estado | **NO CUMPLE** | B7: los cambios de reserva por el alternable no se anuncian (la spec pide la nota F7). Cumplen: respuesta (`role="status"` con foco), notas F7, nota de la barra masiva y contador `aria-live` |
| AV-07 / AV-08 Daltonismo | **Cumple** | Ver 1.4.1 |
| AV-10 Movimiento reducido | **Cumple** | Con el ajuste y con `prefers-reduced-motion`: `.vt-opt`, `.modal`, `.modal-bg` y el chevrón del disclosure en `0s / none` |
| AV-04 Texto ≥ 12 px (spec 12) | **NO CUMPLE** | Dentro de `.vt`, `.modal` y `.vt-scope`, nada baja de 12 px (prueba de aceptación). Pero «Quiere irse» mide 10,64 px en la banda de la ficha y en la ficha breve (B5) |
| Spec 12: devolución del foco | **NO CUMPLE** | Fila y `LockerCard`: correcto. Banda y ficha › Vestuario con Cancelar o ✕: correcto. Con Esc: no (B1) |
| Spec 12: anuncios | **NO CUMPLE** | B7 (reserva). El filtro anuncia «36 jugadores.», no «Plantel: 8 jugadores en la reserva.» (P8) |
| Spec 12: motivo de cada botón deshabilitado en `aria-describedby` | **Con huecos** | P4 |

---

## 2. Resultados de axe-core por estado

axe-core 4.14.0. Entre paréntesis, los nodos de contraste que axe deja «a revisar» por fondos con degradé o pseudoelementos. Esos pares los cubren `contraste.mjs` (pares 41-53, por club) y el muestreo de píxeles de la sección 4.

| Estado | 1440×900 | 390×844 |
|---|---|---|
| Vestuario con todos los motivos (`out`, `outListed`, `promiseRisk`, `upset`, `falling`, `leader`, `promiseOk`) | 0 (18) | 0 (14) |
| Panel con cada motivo elegido (7 estados) | 0 en los 7 (13-18) | — (sin panel) |
| "Armar la reserva" (vista Reserva) | 0 (20) | 0 (15) |
| Tabla, vista Vestuario | 0 (2) | 0 (2) |
| Filtros En la reserva / Juveniles | 0 / 0 | 0 / 0 |
| Charla: elegir | 0 | 0 |
| Charla: elegir con «Cambiarle el rol» marcada | **`nested-interactive` (serious) ×1** | **ídem** |
| Charla: confirmación (cambiar el rol) | **`nested-interactive` ×1** (12) | **ídem** (12) |
| Charla: respuesta | 0 | 0 (3) |
| Charla: «ya hablaron» | 0 (2) | 0 (5) |
| Ficha › Vestuario (quiere irse; promesa con registro) | 0 (27) / 0 (27) | 0 (28) / 0 (28) |
| Bandeja · `out` con la charla disponible | **`color-contrast` ×2** (3,62 y 4,09), `label-content-name-mismatch` ×4 | **`color-contrast` ×1** (4,09) |
| Bandeja · `out` con la charla usada | ídem | ídem |

Salida textual de las infracciones:

```
nested-interactive: div[data-k="status"] :: <div data-k="status" class="vt-opt" role="radio" aria-checked="true" tabindex="0"
  aria-describedby="vt-or-status vt-ow-status"> :: Element has focusable descendants.
color-contrast: .ib-who-s > .chip.bad :: <span class="chip bad">Quiere irse</span> :: 3.62 (#ff5d6c sobre #473659, 12.04px)
color-contrast: .wrap > .chip.bad    :: <span class="chip bad">Quiere irse</span> :: 4.09 (#ff5d6c sobre #402e4e, 10.64px)   ← ficha breve (Nav.tsx:123)
label-content-name-mismatch: [role=option] aria-label="Para decidir. Vestuario, Facundo Zabala. Facundo Zabala quiere irse. No vence"
  texto visible «Vestuario · Facundo Zabala Facundo Zabala quiere irse No vence»
```

La prueba de aceptación (`SHOTS=0 AXE=… node tests/ui/vestuario.cjs`) da **373 de 373**. Su axe no pasa por la opción «Cambiarle el rol» marcada ni por la bandeja, así que no veía B5 ni B6.

---

## 3. Recorridos con el teclado y foco

**Recorridos** (solo teclado, en 1440×900, 390×844, 320×568 y 320×256):

| Recorrido | Resultado |
|---|---|
| A. Hablar con el que quiere irse: foco al entrar en la fila → Tab «Hablar» → Enter → primera opción («Decirle que no se va») → Espacio la marca (el día no avanza) → ↓ ↑ → Tab Cancelar → Hablar → Enter → respuesta con foco (`role="status"`) → Tab «Listo» → Enter → el foco vuelve al botón de la fila | **Se completa** en las 4 medidas. Esc sin hablar devuelve el foco a «Hablar» de la fila. Hueco: la respuesta no muestra indicador de foco (P1) |
| B. Declararlo transferible con la charla usada: Tab desde la fila → «Declararlo transferible» (`aria-describedby="vt-lg-<id>"`, existe) → Enter → el foco va a la nota F7 (`role="status"`), `listed=true`. Desde el panel (1440): 24 Tab hasta el botón y el foco queda en la nota F7 de la `LockerCard` | **Se completa** en las 4 medidas |
| C. Armar la reserva: «Armar la reserva» → Enter → foco en la fila de la tabla → Espacio, ↓, Espacio (el día no avanza) → Mayús+Tab hasta «A la reserva» → Enter | **Se completa, con fallas**: tras Enter el foco queda fuera de la pantalla en 1440 y 320×568 (B3); en 320×256 la barra masiva tapa la fila con foco (B4); después de «A la reserva» el foco cae en **`body`** en las 4 medidas (B2) |
| D. Charla desde la ficha (banda en Estadísticas y pestaña Vestuario) | Cancelar y ✕ devuelven el foco a «Hablar» o «Hablar con él» en la misma pestaña; después de hablar, el foco va al texto de `talkState` de la banda (en Estadísticas). **Esc vuelve a la página anterior** (B1). Esc en la confirmación vuelve a elegir y no sale de la ficha |

Salida clave (`MIRAR` = falla o hueco; `vis` = puntos de 5 visibles con `elementFromPoint`; `ind` = contorno o sombra de foco):

```
1440×900  MIRAR A5 respuesta (role=status): DIV.vt-reply vis 5/5 ind NO
1440×900  MIRAR C2 después de "Armar la reserva": TR.click «Facundo Zabala, LI, …» vis 0/5 [33,934,826,47]   (ventana de 900 de alto)
1440×900  MIRAR C5 después de "A la reserva": BODY · anotados 2; status «Anotaste a 2 en la reserva.»; línea del encabezado viva: no
1440×900  C6 alternable del panel con Enter: aria-pressed=true «✓ Anotado en la reserva»; nota F7 (role=status): []
1440×900  D1 banda: Esc sin hablar → ruta {"page":"locker","sel":"p528"} (esperado: "Hablar" de la banda en la ficha)
1440×900  D1b ficha › Vestuario: Esc sin hablar → ruta {"page":"locker",…}
390×844   MIRAR C5 después de "A la reserva": BODY
320×568   MIRAR C2 después de "Armar la reserva": TR.click «Joaquín Blázquez, …» vis 0/5 [25,576,270,59]   (ventana de 568)
320×568   MIRAR C5 después de "A la reserva": BODY
320×256   MIRAR C3 fila con foco tras ↓: vis 0/5 [25,123,270,59] → elementFromPoint cae en .bulkbar (sticky, 68–234 px de alto en un main de 200 px)
320×256   C4 «Seleccionar todos» vis 0/5 (debajo de la barra masiva)
320×256   MIRAR C5: BODY
Banda · Cancelar → BUTTON.vt-band-hablar (player › personal) · ✕ → ídem · Esc → BUTTON.vt-att-pick (página locker)
Ficha › Vestuario · Cancelar → BUTTON.vt-card-talk · ✕ → ídem · Esc → BUTTON.vt-att-pick (página locker)
```

**Orden de Tab en 1440** (35 paradas, igual que la spec 12): referentes (3) → Cómo se eligen → Armar la reserva → por cada fila, botón de fila y su «Hablar» → chips (una parada) → vista (4) → Columnas → Seleccionar todos → encabezados → tabla (una parada) → panel: ¿Moral o conformidad? → Hablar con él → Declararlo transferible → Contrato y renovación → Anotar en la reserva → Ver la ficha. En 320 px: Qué la mueve → Referentes → Armar la reserva → filas → chips → … (22 paradas). Bajando con Tab, ningún foco queda tapado ni sin indicador en 1440, 390 y 320×568. En 320×256 tres botones de fila quedan tapados en parte (1/5 y 3/5): no falla 2.4.11 AA, que pide que no quede tapado del todo.

---

## 4. Otras mediciones

**Contraste.** `node tools/check-contrast.mjs`: 86 clubes, `FALLAS … 0` (tinta sobre acento mínimo 4,58; `--sel` sobre panel2 mínimo 4,96; distancia a `--warn` 34,2°). `node production/ui/vestuario/contraste.mjs`: `FALLAS 0` (pares 1-53; 52 «`--dim` / banda: no se usa», ver P9). Muestreo de píxeles en el navegador (fondo predominante contra el píxel de texto más lejano):

```
«Quiere irse» (.chip.bad, 10,64 px) en la banda de la ficha:  Defensa 2,52:1 · Boca 3,35:1 · Independiente 3,52:1
--dim (fecha de nacimiento, pie) en la banda de la ficha, Defensa: 3,73:1 y 4,16:1   (fuera del alcance del Vestuario)
```

**Nombres y estados** (DOM, 1440):

```
gauge: img «Armonía 58 de 100: clima normal»
escala de la tabla: sin rol «44 Conforme», pista aria-hidden=true
minutos (tabla): «94/62 %»; la marca de umbral solo es visual
fila de la grilla: aria-label «Rodrigo Rey, ARQ, Independiente, 34 años, valoración 78»   (sin conformidad, minutos, moral ni reserva)
chips: aria-pressed true «Todo el plantel, 36 jugadores» · false «En la reserva, 8 anotados» · false «Juveniles, 17 con rol Promesa»
summary: «Cómo se eligen», «¿Moral o conformidad?» (svg aria-hidden) · en 390 además «Qué la mueve», «Referentes»
regiones vivas: 5 × status .vt-att-note, polite «36 jugadores.», status .vt-card-note
opciones: stay tab=0 desc=vt-or-stay vt-ow-stay · promise desc=vt-or-promise · status desc=vt-or-status vt-ow-status · …
referencias aria rotas: ninguna · ids repetidos: ninguno (Vestuario, panel y charla)
```

**Reajuste y espaciado.**

```
zoom 200 % (640 px): sin desborde; charla 1061>358 con overflow-y auto; ficha sin recortes
320 px, texto 120 %: sin desborde de página; mk-name de la tabla 31 px de ancho («Rodrigo Rey» necesita 98)
320×256: sin desborde; mk-name 56 px
1.4.12 en 1440: TD «✓ Anotado» 123 > 100 px (se corta el borde del botón), «ARQ» 69 > 58, «Jugador clave» 128 > 92 (elipsis)
1.4.12 en 390/320: mismos recortes de nombre con elipsis; charla y bandeja sin recortes
```

**Movimiento reducido:** con el sistema y con el ajuste, `{"opt":"0s/none","modal":"0s/none","bg":"0s/none","svg":"0s/none"}`.

**Daltonismo:** capturas en acromatopsia (Vestuario, charla y bandeja), deuteranopía con `.cvd` y protanopía. Toda la información sigue disponible sin color: «Para decidir», «Resta», «!», ✓ y ✗, flechas de tendencia, radio con punto, número y palabra de cada escala.

**Objetivos:**

```
1440 (24 px): referentes 82×18, 118×18, 90×18; encabezados 14 px de alto; casillas 13×13 → todos pasan por la excepción de espaciado de 2.5.8
390 (44 px): referentes 70×28, 57×42, 57×42; «Seleccionar todos» 13×13 → por debajo de 44 (criterio de la spec)
390: charla, ficha (banda y Vestuario) y bandeja `out`: todo ≥ 44
```

---

## 5. Infracciones, de la más grave a la menos grave

### Bloqueantes

**B1. Esc en la charla abierta desde la ficha cierra la ventana y además vuelve a la página anterior.** (2.4.3, 3.2.2, AM-07; spec 12: «Cerró sin hablar → el Hablar de la banda / Hablar con él»). Pasa desde la banda (cualquier pestaña) y desde ficha › Vestuario, también si se llegó desde la bandeja («Hablar con él» lleva a la ficha): el DT pierde la ficha y el foco cae en otra pantalla.
- Causa: `src/ui/common.tsx:198`. El `keydown` de `Modal` está en `document`, hace `preventDefault()` y cierra. React quita la ventana antes de que corra el oyente de `window` de `src/ui/App.tsx:130`. Ese oyente ya no encuentra `.modal` y, como la página es `player`, llama a `back()`.
- Arreglo: en `App.tsx:130`, salir si `e.defaultPrevented` antes de evaluar Esc. Además, o como alternativa, `e.stopPropagation()` en el Esc de `Modal`. Afecta a toda ventana abierta sobre una ficha (también `NegotiationModal`). Agregar a `tests/ui/vestuario.cjs` el caso Esc desde la banda y desde ficha › Vestuario.

**B2. El foco cae en `body` después de una acción masiva que se esconde a sí misma** («A la reserva»; lo mismo «Declarar transferibles» y cualquier `ownBulk` cuyo `show` deja de cumplirse). (2.4.3; spec 12: «nunca a `body`»). Pasa en las 4 medidas.
- Dónde: `src/ui/PlayerTable.tsx:224` (`runBulk`) y `:278` (el botón deja de dibujarse).
- Arreglo: después de `runBulk`, llevar el foco a la nota `role="status"` (`:280`, con `tabIndex={-1}`) o a la fila con foco itinerante de la tabla. Que nunca quede en un botón que desaparece.

**B3. Tras «Armar la reserva» el foco queda en una fila fuera de la pantalla.** (2.4.7, 2.4.11). En 1440×900 la fila con foco está en y = 934 de una ventana de 900. En 320×568 está en y = 576. En 1440 además no es la primera fila: es la del elegido del panel, que el orden por Reserva movió para abajo.
- Dónde: `src/ui/Locker.tsx:99` (`enterArmar` llama a `focusLater` a los 30 ms) y `src/ui/PlayerTable.tsx:179`. La vista y el orden del modo se aplican en un efecto posterior, el `scrollIntoView({ block: 'nearest' })` corre antes del reordenamiento y la fila se mueve.
- Arreglo: enfocar y desplazar cuando `PlayerTable` ya aplicó `mode` (un callback `onModeApplied`, o enfocar en el mismo efecto de `:179` con `requestAnimationFrame` doble). Que el foco vaya a la primera fila del orden nuevo, con `scrollIntoView({ block: 'center' })`.

**B4. En 320×256 la barra masiva fija tapa la fila con foco.** (2.4.11). Con una fila marcada, `.bulkbar` (`position: sticky`, `src/styles.css:182`) ocupa de 68 a 234 px de un `main` de 200 px. La fila a la que se baja con ↓ queda tapada del todo (`elementFromPoint` cae en `.bulkbar`), igual que «Seleccionar todos».
- Arreglo: con poca altura, la barra no es fija (`@media (max-height: 500px) { .bulkbar { position: static } }`) o se compacta a una línea. Además, `scroll-padding-top: var(--bulkbar-h)` en `#main` para que ↓ (`onRowKey`) deje la fila debajo de la barra. Hoy `--bulkbar-h` solo se usa en `.vt-att-row`.

**B5. «Quiere irse» (`.chip.bad`) no llega a 4,5:1 y mide 10,6 px fuera de `.vt` y `.vt-scope`.** (1.4.3; AV-04; spec 12, «nada por debajo de 12 px»).
- Banda de la ficha (`src/ui/PlayerPage.tsx:62`, `Status`): 2,52:1 en Defensa, 3,35 en Boca y 3,52 en Independiente, a 10,64 px.
- Ficha breve (`src/ui/Nav.tsx:123`): 4,09:1 a 10,64 px.
- Bandeja `out`, franja del jugador (`src/ui/Inbox.tsx:419`): 3,62:1.
- El arreglo de `src/styles.css:1414` (`.vt .chip.bad, .vt-scope .chip.bad { color: var(--text) }`) solo cubre el Vestuario y la tarjeta.
- Arreglo: llevar esa regla a `.chip.bad` global (`styles.css:61`: texto `--text` sobre el tinte rojo, con un ícono «!» como en `vt-chip-bang`) y `font-size: max(.76rem, 12px)` en `.chip` (`styles.css:60`). Sumar los tres lugares a `contraste.mjs`: el par sobre la banda va por club.

**B6. El selector «Nuevo rol» está dentro de un `role="radio"`.** (4.1.2; axe `nested-interactive`, serious). Los hijos de un radio son presentacionales: un lector de pantalla no anuncia los botones de rol como botones ni su `aria-pressed`, aunque se alcancen con Tab.
- Dónde: `src/ui/Locker.tsx:496-499` (`.vt-opt-extra` con `Seg` dentro de `div[role=radio]`, `:489`). Lo mismo vale para `LetGo` dentro de la opción «free» (`:500`), que no es interactivo pero conviene sacar por coherencia.
- Arreglo: dibujar la extra como hermano del radio, dentro de un contenedor por opción: `<div class="vt-opt-wrap"><div role="radio">…</div>{extra}</div>`. Las extras quedan dentro del `radiogroup`, fuera del radio, y el diseño no cambia.

**B7. Los cambios de reserva por el alternable no se anuncian.** (4.1.3; spec 12: «Declarado transferible, reserva cambiada → la nota F7 (`role="status"`)»). Con Enter en «Anotar en la reserva» de la `LockerCard`, `aria-pressed` pasa a `true`, pero no hay nota F7. La línea del encabezado («Reserva: 2 anotados y sanos, faltan 5 …», `Locker.tsx:246-249`), el contador del modo (`:164`) y `vt-res-side` (`:370`) cambian sin región viva. El alternable de la tabla (`PlayerTable.tsx:319-320`) tampoco anuncia nada.
- Arreglo: en `toggleRes` (`Locker.tsx:321`) poner la nota F7 («Anotaste a X en la reserva: 7 anotados y sanos, juega el mié 14 ene» o «… faltan 2»). Para la tabla, una región `role="status"` en `.vt-resmode-n` (`Locker.tsx:164`) o la nota de la barra masiva.

**B8. Objetivos de menos de 44 px en el celular** (spec 14: «a 360 px, todos los objetivos táctiles miden al menos 44 × 44 px»; AM-09). A 390 px:
- Los nombres de los referentes miden 70×28 y 57×42 (`Locker.tsx:225`, `.vt-lead-n` es `linkish`, y la prueba `under44` excluye `.linkish`).
- «Seleccionar todos» mide 13×13 (`PlayerTable.tsx:288`; la celda del encabezado no tiene clic, a diferencia de las casillas de las filas, donde toda la `td` responde).
- Por WCAG 2.5.8 AA (24 px) pasan con la excepción de espaciado. El incumplimiento es del criterio propio.
- Arreglo: `@media (max-width: 760px) { .vt-lead-n { min-height: 44px; display: inline-flex; align-items: center } }`, y que la `th` de la casilla tenga el mismo `onClick` que las `td` (o una `label` de 44 px).

### Huecos (no bloquean el nivel; arreglarlos en esta etapa)

- **P1. Destinos de foco sin indicador.** El `h2` «Para atender» (`styles.css:1245`), el `h3` «Charla» (`:1311`) y el contenedor de la respuesta `.vt-reply` (`:1376`) reciben el foco por programa (spec 12) con `outline: none`. Quien usa el teclado no ve dónde quedó: no es un control, así que 2.4.7 no aplica en sentido estricto. Arreglo: un indicador suave en `:focus-visible` (subrayado `--sel` o contorno de 2 px como `.vt-talkst`).
- **P2. Lector de pantalla en la grilla.** El `aria-label` de la fila (`PlayerTable.tsx:234-235`) solo dice nombre, puesto, club, edad y valoración. En las vistas Vestuario y Reserva no nombra la conformidad, los minutos, la moral ni si está anotado en la reserva. Para quien arma la reserva con lector de pantalla, la fila no dice si ya está anotado. Además, la marca de umbral de `MinsBar` chica (`mood.tsx:57-60`) no tiene texto. El nivel deja fuera el lector de pantalla completo en tablas complejas, pero el arreglo es barato: agregar a `rowName` los datos de la vista (`moodOf`, «20 de 62 % de los minutos», «anotado en la reserva») y un `.vh` «, se molesta por debajo de 53 %» en la `MinsBar` chica.
- **P3. El alternable cambia el texto y `aria-pressed` a la vez** (`Locker.tsx:369`, `PlayerTable.tsx:320`): suena «✓ Anotado en la reserva, botón de alternancia, presionado». La APG recomienda un rótulo fijo («Anotado en la reserva») con `aria-pressed`. Es una mejora, no una falla.
- **P4. Botones deshabilitados durante el avance** (`busy`). En las filas (`Locker.tsx:266-267`, aviso `:280`) y en la `LockerCard` (`:354-356`), el motivo «Frená el avance…» se ve pero no está en `aria-describedby`. En la banda (`PlayerPage.tsx:81`) no hay ningún motivo visible. La spec 12 pide las dos cosas.
- **P5. Nombres cortados a 320 px.** Vista Vestuario: 56 px por nombre; con el texto al 120 %, 31 px. Con la silueta genérica, la fila no se identifica a simple vista. El nombre completo está en el `aria-label` y en la ficha (1.4.10 lo admite), pero conviene que el nombre pase a dos renglones antes que cortarse, o subir `keep` de su ancho.
- **P6. `label-content-name-mismatch` en la lista de la bandeja** (opciones con `aria-label`; solo cambia «·» por «,»). Viene de la bandeja. Basta con usar la misma puntuación.
- **P7. «Para decidir» queda en «!» por debajo de 760 px** (`.ib-tag-t` recortado a 1×1, texto `.vh`). Con zoom al 200 % la palabra no se ve. El riel y «!» lo compensan, pero el texto visible ayudaría.
- **P8. El anuncio del filtro** dice «36 jugadores.» (`PlayerTable.tsx:272`) y no «Plantel: 8 jugadores en la reserva.» (spec 12). Funciona, pero no nombra el filtro.
- **P9. Fuera del alcance:** en la banda de la ficha, `--dim` se usa para la fecha de nacimiento y el pie (3,73:1 y 4,16:1 en Defensa). `contraste.mjs` (par 52) dice «no se usa». Avisar al dueño de la ficha y corregir el script.

---

## 6. Lo que está bien

- Devolución del foco desde la fila (Esc → «Hablar»; después de hablar → botón de fila) y desde la `LockerCard` (→ «Hablar con él» / título Charla). Desde la banda con Cancelar o ✕, y después de hablar, va al texto de `talkState` en la pestaña donde se estaba. Nunca va a un control deshabilitado. Al declararlo transferible, el foco va a la nota F7.
- Charla: `radiogroup` con nombre, foco itinerante que salta las deshabilitadas, regla y rasgo en `aria-describedby`, confirmación con la consecuencia en `aria-describedby`, Esc en la confirmación vuelve a elegir sin gastar la charla, respuesta en `role="status"` con foco y antes → después en una tabla con `th scope="row"`.
- `Gauge` con nombre; escalas con número y palabra siempre visibles; tendencia con flecha y palabra.
- Contraste del tema en los 86 clubes y del Vestuario (dos scripts, 0 fallas); daltonismo y movimiento reducido completos.
- Atajos: con el ajuste apagado, ninguna tecla suelta hace nada; encendidos, Espacio sobre un control lo activa y no avanza el día.
- Sin desborde horizontal en 320 px ni con zoom al 200 %; nada por debajo de 12 px dentro del Vestuario, la charla y la ficha › Vestuario.

## 7. Para cerrar el nivel

Arreglar B1 a B8 y sumar a `tests/ui/vestuario.cjs`:
1. Esc desde la banda y desde ficha › Vestuario, con la ruta y el foco esperados.
2. El foco después de «Armar la reserva» y después de «A la reserva» (visible, nunca `body`).
3. Una pasada en 320×256 con una fila marcada.
4. axe con la opción «Cambiarle el rol» marcada y sobre la bandeja `out`.
5. El contraste de `.chip.bad` en la banda, la ficha breve y la bandeja (por club).
6. `under44` sin excluir `.linkish` y con la casilla del encabezado.

Después, actualizar la fila «Vestuario, charlas y negociación» de la matriz de `design/accessibility-requirements.md` y su historial de auditorías.
