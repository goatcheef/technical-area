# Revisión de arte: Vestuario

> **Fase**: 4 de /team-ui (revisión)
> **Autor**: art-director
> **Fecha**: 2026-11-15
> **Rama**: `vestuario-ui`
> **Contrato**: `production/ui/vestuario/visual-design.md` y `production/ui/vestuario/contraste.mjs`, más dos decisiones del usuario: escalas en rojo, gris y blanco con número y palabra (sin verde), y botones comunes en "Para atender" (el primario relleno solo va en la `LockerCard`, en la charla y en la bandeja).
> **Capturas propias**: `production/ui/vestuario/shots/review/` (25 JPEG al 80 %, `deviceScaleFactor` 1). Las saqué con un script de Playwright fuera del repositorio, que arma el plantel como `tests/ui/vestuario.cjs` y agrega dos motivos que esa prueba no cubre: "Quiere irse · transferible" y "Minutos prometidos". Para medir también usé recortes a 2× que no guardé.

## Veredicto: NECESITA CAMBIOS

La pantalla cumple el contrato en casi todo, y lo que importa está bien:

- Las escalas tienen tres tonos y ningún verde.
- El ámbar aparece solo en lo que espera tu respuesta.
- "Para atender" no tiene ningún primario.
- Hay un solo primario por decisión.
- La bandeja y el Vestuario usan las mismas piezas.
- Nada baja de 12 px dentro de `.vt`, `.vt-scope` y la ventana.
- La raíz del documento no se desplaza en ninguna de las siete resoluciones.

Quedan dos bloqueantes, y los dos se arreglan rápido:

- **B1**: el chip "Quiere irse" no llega al contraste mínimo fuera del Vestuario, en la banda de la ficha y en la bandeja.
- **B2**: al empezar la temporada, la tabla del plantel ocupa el doble de alto. Nace del texto que yo mismo pedí en 4.3.

Con B1 y B2 corregidos, la pantalla pasa a **APROBADO CON CAMBIOS MENORES** sin otra revisión completa: alcanza con volver a sacar las capturas 04, 21 y 24 y una de la tabla al empezar una partida.

---

## Lo que se midió

| Control | Resultado |
|---|---|
| La raíz del documento no se desplaza más allá de `.main` (`scrollingElement.scrollHeight − innerHeight`) | 0 en todas: 1920 × 1080, 1440 × 900, 1024 × 768, 820 × 1000, 390 × 844, 360 × 740 (texto al 120 %) y 320 × 568. También en la ventana, la bandeja y la ficha |
| Sin desplazamiento horizontal | Pasa en todas |
| Texto de menos de 12 px en `.vt`, `.modal` y `.vt-scope` (el del SVG, medido como se dibuja) | Ninguno. El número del medidor se dibuja a unos 26 px |
| Texto de menos de 12 px en la banda de la ficha (`.pband`) | **`chip bad` "Quiere irse" a 10,6 px** (B1) |
| Rellenos de las escalas (computados) | Solo `rgb(255, 93, 108)` (`--bad`), `rgb(163, 168, 200)` (`--dim`) y `rgb(241, 242, 250)` (`--text`). En `.cvd`, `--bad` pasa a `rgb(240, 140, 58)`. Ningún verde |
| Primarios en "Para atender" | 0 en todas las pasadas. En la `LockerCard`: "Hablar con él", o "Declararlo transferible" con la charla usada. En la bandeja: "Declararlo transferible" |
| Botones de las filas | 32 px en escritorio y 44 px en el celular |
| `node production/ui/vestuario/contraste.mjs` | **FALLAS 0** |
| `node tools/check-contrast.mjs` | **FALLAS 0** |

**Pares que el script no cubre** (los medí con muestras de píxeles: el texto se pone transparente y se mide el fondo real):

| Par | Fondo medido | Contraste | ¿Llega? |
|---|---|---|---|
| "Quiere irse" `.chip.bad` `--bad` en la banda de la ficha | Independiente #622c41 / Defensa #684d37 / Boca #494264 | **3,60 / 2,60 / 3,13** (y a 10,6 px) | **No** (B1) |
| "Quiere irse" `.chip.bad` `--bad` en la tarjeta del jugador de la bandeja | #3f2d4e | **4,15** (12 px) | **No** (B1) |
| "Para decidir" `--text` sobre la fila elegida (Independiente, Defensa, Gimnasia) | #3f384a a #40394a | 9,89 a 10,05 | Sí |
| "Molesto" con "!" (`.chip.vt-chip-bang`) `--text` en la banda | #23274a | 12,89 | Sí |
| "Hablar" deshabilitado (opacidad 0,4) | — | Exento (deshabilitado), con `.ib-help` al lado | — |

---

## Hallazgos

### Bloqueantes

**B1. El chip "Quiere irse" no llega al contraste mínimo en la banda de la ficha ni en la bandeja, y se ve distinto según la pantalla.**

- **Capturas**: `24-ficha-vestuario-1440.jpg` (banda, debajo del nombre) y `21-bandeja-pedido-1440.jpg` (tarjeta del jugador). Contra `22-vestuario-pedido-charla-usada-1440.jpg`.
- **Qué pasa**:
  - `Status` (`src/ui/common.tsx:176`) dibuja `<span className="chip bad">Quiere irse</span>`.
  - La implementación vio que no llegaba a 4,5:1 y lo arregló solo adentro del Vestuario (`src/styles.css`, al final del bloque: `.vt .chip.bad, .vt-scope .chip.bad { color: var(--text) }`).
  - La banda de la ficha es `.pband`, no `.vt-scope`: ahí el chip queda rojo sobre rojo, entre 2,6:1 (Defensa) y 3,6:1, y a 10,6 px. Al lado, el chip "Molesto" nuevo mide 12 px y está en blanco.
  - En la bandeja, la plantilla `out` lo muestra rojo a 4,15:1.
  - Resultado: la etiqueta de la decisión se lee en blanco en el Vestuario y en rojo, ilegible, en la ficha. Y la ficha es justamente adonde manda el Vestuario por debajo de 1180 px.
  - El contrato (sección 12, `Status`) dijo "Quiere irse sin cambios". Fue un error mío: no medí ese chip fuera de `.vt`.
- **Cambio**: sacar la excepción del ámbito y hacerla global en el bloque del Vestuario, y subir el tamaño en la banda:
  ```css
  .chip.bad { color: var(--text); }                 /* el tinte queda; el texto, legible en cualquier fondo */
  .pband .chip { font-size: max(.86rem, 12px); }
  ```
  - "Quiere irse" sigue distinguiéndose por la palabra y por el tinte.
  - El chip de lesión "✚ 12 d" (`.chip.bad`, misma línea de `Status`) gana lo mismo.
  - Después hay que correr `node tools/check-contrast.mjs` y mirar Plantel y Mercado, donde ese chip también aparece.
  - Si se prefiere no tocar lo global, la opción mínima es `:is(.vt, .vt-scope, .pband, .ib-panel, .ib-detail) .chip.bad`.

**B2. Al empezar la temporada, la tabla del plantel ocupa el doble de alto.**

- **Captura**: no está en `review/` porque el cupo de 25 se fue en los estados poblados. Se reproduce con una partida nueva y Plantel › Vestuario a 1440, 1024 u 820. Medido: **36 filas de 84 a 85 px y una tabla de 3084 px**, cuando el objetivo es de 40 a 48 px por fila (10.1).
- **Qué pasa**:
  - Con `recent` vacío (toda partida nueva, y las dos primeras fechas de cada temporada), la celda `mins` de 96 px dibuja "—" y, debajo, "Todavía no cuenta (jugó 0)" (`MinsBar` `sm` en `src/ui/mood.tsx`, `.vt-mins-s`). Ese texto se parte en tres renglones.
  - Pasa lo mismo, en menor medida, con "no le pesa" (rol Promesa, filas de unos 56 px) y con "cuenta desde el próximo partido".
  - Las 36 filas repiten la misma frase, y el encabezado ya la dice una vez ("La conformidad empieza a moverse en el tercer partido…").
  - Es lo primero que ve el jugador en una partida nueva.
  - Las capturas de `shots/final/` no lo muestran porque la prueba carga `recent`.
- **Cambio** (corrige mi sección 4.3; `src/ui/mood.tsx`, `MinsBar` `sm`):
  - Sin datos, la celda dice solo "—" en `--dim`, con un `.vh` "Todavía no cuenta (jugó 0)". La explicación queda en la nota del encabezado.
  - Con `tol` 0, la celda es "94 % · no le pesa" en una línea (como pedía 4.3) o solo "94 %" sin marca: la falta de la marca ya lo dice.
  - "Cuenta desde el próximo partido" pasa al `title` o al `.vh` de la celda y queda visible en la `LockerCard`.
  - Objetivo: filas de 40 a 48 px en todos los estados. La conformidad y la moral apiladas ya dan 40 px.

### Menores (en orden de importancia)

| # | Dónde | Qué pasa | Cambio |
|---|---|---|---|
| M1 | Ventana de charla, opción marcada. `07-charla-prometer-marcada-1440.jpg` contra `08-charla-confirmacion-1440.jpg` | Mientras el puntero sigue sobre la opción que se acaba de marcar, que es siempre el caso después del clic, el estado marcado no se ve: solo cambia el punto del radio. `.vt-opt:hover:not([aria-disabled=true])` pesa 0,3,0 y le gana a `.vt-opt[aria-checked=true]`, que pesa 0,2,0. Medido: con el puntero encima, fondo `--panel2` y borde #4a5185; sin el puntero, `--accent-soft` y borde `--accent-hi`. Rompe "Nada se mueve bajo el puntero" | `.vt-opt:hover:not([aria-disabled=true]):not([aria-checked=true])`, o subir el peso de la regla de la opción marcada |
| M2 | "Para atender", línea 1. `02-vestuario-1440-independiente.jpg` | El chip del motivo principal no se alinea entre filas: cada `li` es su propia retícula y la columna `auto` de la acción mide distinto. Por ejemplo, la fila con "Ver transferibles en Plantel" deja el chip en x 650 y las demás en x 783. El borde derecho queda dentado y la lista se lee peor | `.vt-att-list { display: grid; grid-template-columns: minmax(0, 1fr) auto }` y `.vt-att-row { grid-column: 1 / -1; grid-template-columns: subgrid }`, así todas las filas comparten el ancho de la acción |
| M3 | "Para atender", consecuencia. `15-vestuario-1440-texto120.jpg` y `22-vestuario-pedido-charla-usada-1440.jpg` | Cuando no entra, "No vence" (`.vt-att-k .ib-due`, `margin-left: 8px`) baja a su propio renglón, corrido 8 px respecto del texto | `.vt-att-k .ib-due { margin-left: 0; white-space: nowrap }`, con un separador " · " dentro del texto, o `display: block; margin-top: 2px` |
| M4 | Fechas cortadas. `01-vestuario-1920.jpg` (fila de Montiel): "de nuevo desde el 14 / ene" | Entre el día y el mes hay un espacio común (`TalkSt` y `bnum` en `src/ui/Locker.tsx` y `src/ui/mood.tsx`) | Usar ` ` dentro de las fechas en 700, como ya se hace con "%" |
| M5 | Tabla, cortes con "…". `04-tabla-reserva-1440.jpg` y `03-vestuario-1440-entera.jpg` | Rol "Jugador cl…", el chip de Estado "Minutos prometi…" y la pastilla "MCD" que se desborda ("MCD ··") a 1440. El contrato dice que la celda nunca corta | Rol en dos renglones (`white-space: normal`) o "J. clave". Chips de `Status` con `white-space: normal` dentro de `.vt`. Columna Pos de al menos 52 px en `.vt` |
| M6 | Vista Reserva. `04-tabla-reserva-1440.jpg` | La columna Estado repite "Reserva" en cada fila anotada, al lado del "✓ Anotado" | En la vista `reserva`, `Status` sin el chip "Reserva" (o la columna `st` oculta en esa vista) |
| M7 | Encabezado. `02-vestuario-1440-independiente.jpg` y `01-vestuario-1920.jpg` | Mide 224 px, contra los "unos 150" de 5.2. Además, en "Qué la mueve" cada valor queda a 340 px de su término a 1440 y a unos 480 px a 1920: falla la proximidad y la cifra se separa de lo que explica | `.vt-parts { max-width: 22rem }` (o `.vt-parts > div { justify-content: flex-start; gap: 24px }` con el valor en una columna de ancho fijo). Si se acepta el alto, actualizo 5.2 |
| M8 | Bandeja, plantilla `out` con la charla usada. `21-bandeja-pedido-1440.jpg` | (a) "Hablaron el 8 ene…" aparece dos veces: como hecho, con viñeta "•" y reloj (dos marcas juntas), y dentro de la nota de `outActions`. (b) La caja `vt-letgo` queda pegada a la fila de botones (0 px). (c) La nota se dibuja en una caja en la bandeja y como texto en la fila del Vestuario | Sacar el hecho `.vt-talkst` cuando está la nota (o la nota repite solo la parte de "Mientras tanto…"), sin viñeta. `.ib-acts + .vt-letgo { margin-top: 12px }`. La nota con el mismo tratamiento en los dos lados (propongo texto de 14 px `--dim`, como en la fila) |
| M9 | `LockerCard`, lista `vt-dl`. `02` (panel) y el recorte a 2× | El rótulo (`dt` con `padding-top: 4px`) y el dato (`dd` centrado en 28 px) no comparten línea base. "Moral" queda unos 3 px más arriba que "41 Normal" | `.vt-dl dt { min-height: 28px; display: flex; align-items: center; padding-top: 0 }`, como `.vt-traits dt`. En las filas de dos renglones, `align-items: flex-start` con `padding-top: 6px` en las dos |
| M10 | Respuesta de la charla. `09-charla-respuesta-1440.jpg` | La cita va entre comillas rectas ("Le tomo la palabra."); 5.8 pide «» | Comillas latinas en `.mk-ask` del Vestuario (el texto sale del motor: cambiar la plantilla o envolverlo en la vista) |
| M11 | Ventana de charla en el celular. `20-charla-360-texto120.jpg` | La ventana tiene 16 px de margen, esquinas redondeadas y 90 vh; 7.2 pedía todo el ancho y el alto. A 360 × 740 con texto al 120 %, el cuerpo mide 1938 px dentro de 666: "Hablar" queda tres pantallas más abajo (la especificación lo acepta) | Cumplir 7.2 (`.modal:has(.vt-talk)` en ≤ 760 px: `inset: 0; border-radius: 0; max-height: 100dvh`) o dejarlo como el `Modal` de siempre y corregir 7.2. Prefiero cumplirlo: gana unos 70 px de lectura |
| M12 | Inicio. `23-inicio-linea-1440.jpg` | La línea cumple 5.9 (texto normal; el ámbar queda solo en "Pendiente"). El botón "Vestuario" mide 11,5 px (`.btn.sm` global) | Deuda global del Inicio, no de esta pantalla: anotarla para el pulido |

**Riesgos que se mantienen (sin cambio pedido)**:

- **Clubes rojos.** En Independiente, la fila elegida del pedido es roja de fondo, con contorno y riel de 6 px también rojos (`02`). Se lee como "error", y al lado la escala usa el mismo rojo para "debajo de la línea".
  - La medición lo aprueba: matiz distinto de `--bad`, 800, fondo y riel.
  - Los alternables "✓ Anotado" en rojo (`04`) suman al efecto.
  - Si el usuario lo nota, la salida es la de los clubes amarillos: un `--sel` propio para los 24 clubes cuyo acento queda a menos de 25° de `--bad`.
- **Deuteranopía** (`14-vestuario-1440-deuteranopia.jpg`). El riel ámbar de la decisión y el riel `--sel` de Independiente se ven del mismo oliva. Se siguen distinguiendo por el fondo de la fila elegida, el peso 800 y el ancho de 6 px con contorno, como pide 10.3. La escala baja y la media quedan cerca en luminancia; las separan el número y la palabra en 700.
- **Opciones deshabilitadas** (las vi en un estado aparte: jugador contento). La forma está bien: borde y aro discontinuos, candado y motivo legible sin opacidad. Pero "No disponibles ahora: …" repite debajo, palabra por palabra, los motivos de cada opción. Es contenido de la especificación: se lo dejo al diseñador de UX.

---

## Coherencia con el resto del juego

| Pantalla | ¿Coincide? | Evidencia |
|---|---|---|
| Bandeja (`out`) | **Casi** | Las mismas piezas: `MoodBar` `kpi` (número de 21,7 px, pista y palabra), `vt-mins` `md` con su marca, `vt-talkst` y `vt-letgo` idénticos (`21` contra `22`). El primario es "Declararlo transferible" cuando la charla está usada, como en la `LockerCard`. Riel ámbar y "Para decidir" iguales en la lista. Diferencias: el chip "Quiere irse" rojo (B1), la charla usada dos veces y la nota en caja (M8) |
| Mercado | Sí | Los chips `.mk-st` llevan un ícono de forma distinta por motivo (⇄, "!", ↓, "−", ✓), el "!" ámbar adentro de un chip neutro y el contador `.mk-cnt` neutro. El alternable "✓ Anotado" es el `.btn.on` de "Seguir". Usan las mismas piezas `.mk-impact` (antes → después, flecha, cifra nueva en 800), `.mk-verdict`, `kbd` y `.mk-note`, y la tabla tiene la misma fila elegida (riel `--sel` y 800) |
| Inicio | Sí | "**Vestuario:** clima normal (47) · **8 casos**" en `--text`, y el ámbar solo en la línea de pendientes (`23`). Solo queda el botón de 11,5 px, que es global (M12) |
| Ficha del jugador | **Casi** | La banda muestra la charla usada en `--text` (12,24:1 como mínimo), la pestaña Vestuario tiene la `LockerCard` en dos columnas desde 720 px (`24`), la tarjeta "Conformidad" del Resumen usa `MoodBar` `md` y "Información" usa `vt-traits`. El chip "Molesto" con "!" mide 12 px, pero "Quiere irse" queda a 10,6 px y en rojo sobre rojo (B1) |
| Decisiones del usuario | Sí | Escalas en rojo, gris y blanco con número y palabra, sin verde (medido; `.cvd` en naranja, `13`). Botones comunes en "Para atender" (0 primarios en todas las pasadas). El primario relleno solo está en la `LockerCard`, la ventana ("Hablar", "Confirmar: …" y "Listo") y la bandeja |

## Capturas (`production/ui/vestuario/shots/review/`)

| Archivo | Qué muestra |
|---|---|
| `01-vestuario-1920` | 1920 × 1080: el ancho máximo y la fecha cortada (M4) |
| `02-vestuario-1440-independiente` | Encabezado, "Para atender" con el pedido elegido, `LockerCard` |
| `03-vestuario-1440-entera` | Página entera: los siete motivos y la tabla en la vista Vestuario |
| `04-tabla-reserva-1440` | "Armar la reserva": la vista Reserva, la línea del modo y los cortes (M5, M6) |
| `05-elegida-promesa-1440` | Fila elegida que no es una decisión, junto al riel ámbar de la decisión |
| `06`–`09` | Charla: elegir, opción marcada bajo el puntero (M1), confirmación en el lugar y respuesta |
| `10`–`12` | Boca (acento medio), Gimnasia (oscuro) y Defensa y Justicia (amarillo, acento verde) a 1440 |
| `13`, `14` | Ajuste `cvd` y deuteranopía emulada (`Emulation.setEmulatedVisionDeficiency`) |
| `15` | 1440 con texto al 120 % |
| `16`, `17` | 1024 (sin panel) y 820 (encabezado en dos filas) |
| `18` | 390 × 844, página entera (recortada a 4000 px) |
| `19`, `20` | 360 × 740 con texto al 120 %: los desplegables del encabezado y la charla (M11) |
| `21`, `22` | El mismo pedido, con la charla usada, en la bandeja y en el Vestuario (B1, M8) |
| `23` | Inicio, mosaico "Para atender" |
| `24`, `25` | Ficha › Vestuario a 1440 (banda: B1) y a 390 |

Faltan, por el cupo de 25: 320 × 568 (medido: la raíz no se desplaza y nada baja de 12 px; los botones de las filas miden 44 px), la ventana "Ya hablaron" y "Ya no está", y la tabla al empezar la temporada (B2, que se reproduce con cualquier partida nueva).
