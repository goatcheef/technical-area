# Diseño visual: Bandeja de entrada

> **Fase**: 2 de /team-ui (diseño visual)
> **Autor**: art-director
> **Fecha**: 2026-11-14
> **Entrada**: `design/ux/bandeja.md` (secciones 5, 6, 10 y 12), bloque "estilo portal" de `src/styles.css`, mosaico "Mensajes" del Inicio (`src/ui/Home.tsx`), capturas de `production/ui/bandeja/ref/`
> **Decisiones del usuario que acá se dan por cerradas**: (1) tinta por contraste WCAG sobre el acento y acento desplazado si hace falta, arreglo global de la fase 3; (2) estado activo de `Seg` y chips con borde de acento, fondo `--accent-soft`, ✓ y texto `--text`; (3) la selección automática no marca leído y el panel muestra "Sin leer".
> **No hay art bible**: este documento usa como fuente el estilo portal y, donde fija algo nuevo (por ejemplo `--accent-hi`), lo dice para que se pueda llevar a otras pantallas.

---

## 0. Decisiones de este documento

1. **Ícono de fila (pregunta 9 de la especificación)**: en la lista va siempre el ícono redondo del tema, igual que en el mosaico del Inicio. Las filas de decisión llevan un "!" en el mismo círculo, con tinte de advertencia. La cara y el escudo pasan al panel de lectura. La justificación está en la sección 8.
2. **Sin mayúsculas**: los títulos que el wireframe escribe en mayúsculas ("BANDEJA DE ENTRADA", "PARA DECIDIR", "HOY · SÁB 14 NOV", "OFERTA", "VALOR") se escriben con mayúscula inicial y nada más. La jerarquía se marca con peso, tamaño, color de título portal y contenedor, no con versalitas (sección 3.1).
3. **Un solo lenguaje de "elegido"** en toda la pantalla: fondo `--accent-soft` sobre `--panel` más una marca de `--accent-hi`, que es la barra en las filas y el borde en los chips, el segmentado y los botones alternables. En los chips, el segmentado y los alternables se suma la ✓. El ámbar (`--warn`) significa siempre "decisión que espera respuesta" y nada más.
4. **Token nuevo `--accent-hi`** = acento mezclado al 70 % con blanco, la misma mezcla que el punto de sin leer ya medido (5,81 a 12,54 sobre `--panel`). Se usa en la barra de la fila elegida, en los anillos de foco de la bandeja, en el punto de sin leer y en el borde del chip o segmento activo. Resuelve el club en el que el acento puro no llega a 3:1 sobre la fila elegida.
5. **`--faint` no se usa en ningún texto de la bandeja.** Todo texto secundario va en `--dim`, que pasa sobre los cuatro fondos que usa la pantalla.

---

## 1. Principios visuales de la pantalla

- **Arriba lo que hay que firmar, abajo la correspondencia.** El bloque "Para decidir" es el único con color de advertencia. El resto de la lista es neutro y el color del club queda para la selección. Si todo grita, nada grita.
- **Misma familia que el mosaico "Mensajes".** La anatomía de fila del Inicio (círculo de tema, remitente arriba, título abajo, punto a la derecha, encabezados de día en píldora) es la de la bandeja. Las dos pantallas comparten las clases `.msg*`: lo que se corrige acá (tamaños mínimos) se corrige también en el Inicio.
- **El panel de lectura es un documento.** La identidad del jugador o del club (cara, escudo, banda de color) vive en su ficha; acá va como tarjeta neutra que lleva a esa ficha. El panel prioriza cifras y botones.
- **Nada depende solo del color.** Cada estado tiene una segunda marca: texto, forma, peso o posición (sección 9.3).

---

## 2. Tokens

### 2.1 Existentes que usa la pantalla (bloque portal)

| Token | Valor | Uso en la bandeja |
|-------|-------|-------------------|
| `--panel` | #1b1e36 | Fondo de la lista, del panel de lectura y del detalle del celular (todos `.card`) |
| `--panel2` | #23274a | Encabezados de día, tarjetas de entidad, cajas de cifras, botones comunes, hover de fila |
| `--panel3` | #2b3056 | Hover de tarjetas de entidad y de botones, fondo del contador de chip. **Sin `--faint` encima** |
| `--line` / `--line2` | #363c66 / #2a2e50 | Bordes de controles / separadores de filas y tarjetas |
| `--text` | #f1f2fa | Títulos, valores, texto principal |
| `--dim` | #a3a8c8 | Todo el texto secundario (remitente, fecha, etiquetas, cuerpo, ayudas) |
| `--warn` | #ffb547 (`.cvd`: #f3d34a) | Decisiones pendientes y plazo corto, nada más |
| `--good` / `--bad` | #3ddc97 / #ff5d6c (`.cvd`: #4aa3ff / #f08c3a) | Barra de la nota F7 de éxito / texto de la nota F7 de error |
| `--accent`, `--accent-soft` | del club (`clubTheme`) | Fondo de lo elegido (`--accent-soft` sobre `--panel`), botón primario (con la tinta de la decisión 1) |
| `--info` | #5aa9ff | Solo la ayuda O2 (`.pagetip`, existente) |
| Fondo de campos | #12152b (portal `input[type=search]`) | Buscador |
| Fondo de barras fijas | #11132a (portal `.top`, `.subnav`) | Barra de acciones fija del celular |
| Fondo del marcador | #0d0f22 (`.mb-score`) | Marcador del mensaje de resultado |

### 2.2 Nuevos

| Token | Definición | Dónde se declara | Por qué |
|-------|------------|------------------|---------|
| `--accent-hi` | Acento al 70 % con blanco: en `clubTheme` es `mix(a, .30)`, que equivale a `color-mix(in srgb, var(--accent) 70%, #fff)` | **Lo devuelve `clubTheme`** (`src/ui/common.tsx`), junto a `--accent` y `--accent-soft`. No va en `:root`: una variable que usa `var(--accent)` se resuelve donde se declara, y en `:root` tomaría el verde por defecto en lugar del color del club (el tema se aplica en línea sobre el contenedor, `App.tsx:177`) | Ya es el color de "activo" del portal (`.nav.sub.on`, `.tabs button.on`, `.qbar`, `.msg-dot`) y está medido: 5,81 a 12,54 sobre `--panel` |
| `--danger` | #ff8a95 | `:root` del bloque portal | Ya existe como hex suelto en `.btn.danger` y `.mb-rc`; medido 7,25 sobre `--panel`. Darle nombre evita un tercer hex |

**Tintes de advertencia y peligro**: no se declaran como tokens en `:root` por el mismo motivo. `.cvd` cambia `--warn` en un descendiente, y un token de `:root` no se enteraría. Se escriben en la regla que los usa, por ejemplo `color-mix(in srgb, var(--warn) 10%, var(--panel))`, y así siguen al modo para daltonismo.

---

## 3. Tipografía, espaciado, radios y elevación

Fuente única: Plus Jakarta Sans, pesos cargados 400, 500, 600, 700 y 800 (`index.html`). No se usan pesos intermedios (650, 750): el navegador los redondea distinto según el sistema. Base 14 px.

### 3.1 Escala tipográfica

| Rol | Clase | Tamaño | Peso | Color | Interlineado / notas |
|-----|-------|--------|------|-------|----------------------|
| Título de pantalla "Bandeja de entrada" | `h2` portal | 1,55rem = 21,7 px (celular 1,4rem = 19,6 px, texto "Bandeja") | 700, −0,025em | `--text` | 1,2 |
| Encabezado "Para decidir · N" | `.ib-block-h` | 1rem = 14 px | 800 | `--text` | El número va en `.pdot` |
| Encabezado de día | `.msg-day` | 0,86rem = 12 px (hoy 0,8rem = 11,2 px) | 600; "Hoy" / "Ayer" 700 en `--text` | `--dim` | — |
| Remitente y entidad | `.msg-from` | 0,86rem = 12 px (hoy 0,72rem = 10,1 px) | 600; en decisiones el tipo ("Oferta") 700 en `--text` | `--dim` | La entidad lleva elipsis; el remitente nunca |
| Título de fila | `.msg-t` | 1rem = 14 px (hoy 0,95rem = 13,3 px) | 500 leído / 700 sin leer / 600 decisión | `--dim` leído, `--text` sin leer, elegido o decisión | 1,4; una línea con elipsis |
| Plazo en fila | `.ib-due` | 0,86rem = 12 px | 600 normal / 700 corto | `--dim` / `--warn` | Con ícono de 14 px |
| Chip de fila | `.ib-tag` | 0,86rem = 12 px | 700 | `--text` o `--dim` | Hoy `.chip` mide 0,76rem = 10,6 px |
| Segmentado y chips de tema | `.seg button`, `.ibchip` | 0,86rem = 12 px | 600; activo 700 | `--text` | — |
| Contador del chip | `.ibchip .cnt` | 0,86rem = 12 px | 800, cifras tabulares | `--text` | Hoy `.tabs .cnt` mide 9,5 px |
| Tema en el encabezado de lectura | `.ib-rhead h3` (título portal) | 1,08rem = 15,1 px | 700, −0,015em | `color-mix(--accent 62 %, #fff)` | Igual que `.card > h3` |
| Fecha y metadatos de lectura | `.ib-rhead .ib-date` | 0,86rem = 12 px | 600 | `--dim` | "ofrecida el 10 nov 2026" |
| Título de lectura | `.ib-h` (`h2`) | 1,4rem = 19,6 px (celular 1,25rem = 17,5 px) | 700, −0,02em | `--text` | 1,3; varias líneas, sin elipsis |
| Nombre en tarjeta de entidad | `.ib-who b` | 1rem = 14 px | 700 | `--text` | — |
| Datos de la tarjeta | `.ib-who-m` | 0,86rem = 12 px | 500 | `--dim` | "24 años · Titular · 18 PJ" |
| Etiqueta de cifra | `.ib-kpi-l` | 0,86rem = 12 px | 600 | `--dim` | Reemplaza a `.kpi h3` (11,2 px) |
| Valor de cifra | `.ib-kpi-v` | 1,35rem = 18,9 px; la cifra clave 1,55rem = 21,7 px | 800, cifras tabulares, −0,02em | `--text` | Como `.tkpis b` de Tácticas |
| Aclaración de cifra | `.ib-kpi-s` | 0,86rem = 12 px | 500 | `--dim` | "sobre su valor", "por mes" |
| Cuerpo | `.ib-body` | 1rem = 14 px | 500 | `--dim` | 1,6; ancho máximo 68ch |
| Líneas de hecho y plazo | `.ib-facts` | 1rem = 14 px | 500 | `--text` | 1,5 |
| Ayuda bajo los botones | `.ib-help` | 0,86rem = 12 px | 500; el nombre del botón 700 en `--text` | `--dim` | Siempre visible |
| Botones comunes y primario | `.btn` | 1rem = 14 px | 700 | según el tipo | — |
| Botón chico | `.btn.sm` (en la bandeja) | 0,86rem = 12 px (hoy 0,82rem = 11,5 px) | 700 | `--text` | — |
| Nota de resultado F7 | `.ib-result` | 1rem = 14 px | 600 | `--text` (error: `--bad`) | 1,45 |
| Marcador del resultado | `.ib-score b` | 2,2rem = 30,8 px | 800, cifras tabulares, −0,03em | `--text` | Como `.mb-score` del celular |

**Títulos sin mayúsculas.** El wireframe usa mayúsculas para señalar rótulos; el estilo portal las prohíbe. Así se ven:
- "Bandeja de entrada": `h2` portal, 21,7 px 700.
- "Para decidir · 3": "Para decidir" en 14 px 800 `--text`, el 3 en la píldora ámbar `.pdot` y el ícono "!" delante. El conjunto va dentro de una píldora con tinte ámbar. Lo que lo hace título es el contenedor y el peso.
- "Hoy · sáb 14 nov": píldora `.msg-day`, "Hoy" en 700 `--text` y "· sáb 14 nov" en 600 `--dim`. La fecha queda en minúscula, como la escribe `fmtDate`.
- "Mercado" (tema en el encabezado de lectura): título de tarjeta portal, en color.
- "Oferta", "Valor", "Diferencia" (etiquetas de cifras): 12 px 600 `--dim`, arriba del valor grande. Lo que las marca es el contraste de tamaño entre etiqueta y valor (12 contra 19 px).

### 3.2 Espaciado (múltiplos de 2, escala 4 · 6 · 8 · 12 · 16 · 20 · 24)

| Elemento | Valor |
|----------|-------|
| Hueco entre zonas de la página (`.page`) | 16 px (entre encabezado y filtros, 12 px) |
| Hueco entre lista y lectura | 16 px |
| Fila de lista (padding) | 10 px 12 px; hueco interno 12 px. Alto: 56 px con dos líneas, 74 px con tres (decisiones). Densidad compacta: 8 px 12 px (52 px como mínimo) |
| Encabezado de día y del bloque | margen 8 px 8 px 4 px; padding 6 px 12 px |
| Panel de lectura (padding) | 20 px 24 px (celular 16 px) |
| Entre secciones del panel | Título → tarjetas 16 · tarjetas → cifras 16 · cifras → plazo y hechos 12 · hechos → cuerpo 16 · cuerpo → acciones 20 (más 16 de padding sobre el separador) · acciones → ayuda 8 · ayuda → nota F7 12 |
| Entre botones de acción | 8 px |
| Entre tarjetas de entidad y entre cajas de cifras | 10 px |

### 3.3 Radios

| Elemento | Radio |
|----------|-------|
| Tarjetas grandes (lista, lectura, detalle) | `--radius` 14 px |
| Tarjetas de entidad, marcador, confirmación F6, nota F7 | 12 px |
| Cajas de cifras, botones, buscador | 10 px |
| Chips de tema y segmentado | 9 px (como `.seg button` portal) |
| Píldoras de día y del bloque, chips de fila | 8 px |
| Ícono de tema, punto, contador, `.pdot` | 99 px (círculo) |

### 3.4 Bordes y elevación

- **Tarjetas**: `.card` portal sin cambios (borde `--line2`, sombra `0 18px 40px -28px #000`, reflejo superior de la versión rediseñada). Es el único relieve de la pantalla.
- **Dentro de una tarjeta, todo es plano**: tarjetas de entidad, cajas de cifras y marcador llevan borde de 1 px y fondo `--panel2`, sin sombra. Una tarjeta con sombra dentro de otra se ve como una ventana encima y confunde la jerarquía.
- **Separadores de fila**: 1 px `--line2` abajo, como `.msg`.
- **Separador antes de las acciones**: 1 px `--line2` arriba (como `.mb-ctrl`).
- **Barra fija del celular**: borde superior 1 px `--line2` y sombra hacia arriba `0 -14px 28px -18px #000`.

---

## 4. Zonas y componentes en escritorio (1440 × 900)

Retícula: `.inbox` en dos columnas, `minmax(360px, 2fr) minmax(0, 3fr)` (40/60). A 1440 px, con el padding de `.main`, quedan unos 554 px para la lista y 830 px para la lectura.

```
┌ h2 Bandeja de entrada ─────────────────────────────── [⌕ Buscar en los mensajes ] [Marcar 5 como leídos] ┐
│ [Mi club][✓ Todo el fútbol]  │  [✓ Todo 5][Plantel 2][Mercado 1][Partidos 2][Torneos][Dirigencia]          │
├──────────── lista .card ──────────────┬────────────────── lectura .card (sticky) ──────────────────────────┤
│ ╭(!) Para decidir (3)───────────────╮  │ Mercado  [● Sin leer]            ofrecida el 10 nov 2026 [No leído] │
│ ▌(!) Oferta · Racing Club            │ │ Racing ofrece US$ 2,4 M por Juan Pérez                              │
│ ▌    Racing ofrece US$ 2,4 M por J.P.│ │ ┌ {cara} Juan Pérez DC [74] › ┐ ┌ {escudo} Racing Club        › ┐  │
│ ▌    ◷ Vence en 3 días · el 18 nov   │ │ └ 24 años · Titular · 18 PJ   ┘ └ Liga Profesional · 4.º       ┘  │
│ ▌(!) Vestuario · M. Gómez            │ │ ┌Oferta───┐┌Valor───┐┌Diferencia┐┌Sueldo──┐┌Contrato┐             │
│ ▌    Gómez quiere irse   No vence    │ │ │US$ 2,4 M││US$ 2,0M││+20 %     ││US$ 18 mil││dic 2028│           │
│ (Hoy · sáb 14 nov)                   │ │ ◷ Vence en 3 días (el 18 nov) · Libro de pases abierto           │
│ (✚) Parte médico · L. Díaz         ● │ │ • Si lo vendés te quedan 2 delanteros centro.                     │
│     Díaz se lesionó en la práctica   │ │ Racing ofrece US$ 2.400.000 por el pase de… (cuerpo)              │
│ (⚽) Partido         [Ver informe]    │ │ ─────────────────────────────────────────────────────────────────  │
│     Ganaste 2-1 a Lanús              │ │ [Aceptar] [Pedir más] [Ver la ficha]                  [Rechazar]  │
│ …                                    │ │ Pedir más: Racing puede mejorar la oferta o retirarse.           │
│ [ Mostrar 150 más ]                  │ │ {nota F7}                                                         │
└──────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘
 ▌ = barra de 3 px: ámbar en decisiones, --accent-hi en la elegida        ● = punto de sin leer (--accent-hi)
```

### 4.1 Ayuda de pantalla (O2)

`.pagetip` existente, sin cambios: barra izquierda `--info`, ícono "i", texto de 12,3 px (0,88rem), "Entendido" como `.btn.sm`. Solo cambia el texto en `TIPS` (especificación 5.3).

### 4.2 Encabezado

- Fila flexible con hueco de 12 px: `h2` a la izquierda (crece) y a la derecha el buscador y "Marcar N como leídos".
- **Buscador** `.ib-search`: 280 px de ancho y 36 px de alto, fondo #12152b, borde 1 px `--line`, radio 10. Lupa existente (`.sb-ico`, 15 px, trazo 2,4, `--dim`) a 10 px del borde izquierdo y padding izquierdo de 32 px. Texto 14 px 500 `--text`; marcador de posición en `--dim`, nunca `--faint`. Con texto, aparece a la derecha un botón `✕` de 28 × 28 px (ícono de 14 px, `--dim`; con hover, `--text`) con `aria-label="Borrar búsqueda"`. Con foco: anillo de 2 px `--accent-hi` con 2 px de separación.
- **Por debajo de 1060 px**: el campo se pliega a un botón de lupa (`.btn.icon`, 36 × 36) y, al apretarlo, se despliega en la misma fila con 220 px de ancho.
- **"Marcar N como leídos"**: `.btn.sm`, 32 px de alto, 12 px 700. Desaparece si no hay sin leer en la vista.
- **Nota F7 de "Marcaste N como leídos."** (con "Deshacer"): aparece debajo del encabezado y encima de los filtros, a todo el ancho, con el formato de `.ib-result` (sección 4.14) y "Deshacer" como `.btn.sm`.

### 4.3 Filtros: alcance y temas

Una fila. A la izquierda el segmentado de alcance; después un separador vertical de 1 px `--line2`, 24 px de alto, con 12 px de aire a cada lado; después los chips. Los dos grupos se separan por proximidad y por la línea; cada uno es una parada de Tab.

**Segmentado de alcance (`Seg`, cambio global de la decisión 2)**

| Estado | Fondo | Borde | Texto | Extra |
|--------|-------|-------|-------|-------|
| Inactivo | `--panel` | 1 px `--line` | `--text` 600 | — |
| Hover | `--panel2` | 1 px #4a5185 (hover portal) | `--text` | Transición de fondo 120 ms |
| Activo | `--accent-soft` **compuesto sobre `--panel`**: `background: linear-gradient(var(--accent-soft), var(--accent-soft)), var(--panel)` | 1 px `--accent-hi` | `--text` 700 | ✓ de 12 px (trazo 3, `--text`) delante de la etiqueta, a 6 px; `aria-pressed="true"`. Sin sombra de color |
| Foco | igual | — | — | Anillo de 2 px `--accent-hi` con 2 px de separación |

Alto 32 px en escritorio y 44 px en celular; padding 0 12 px; radio 9. El fondo activo se compone sobre `--panel` a propósito: así el par es exactamente el que se midió (fila elegida, 10,57 a 12,78), aunque el segmentado esté sobre el fondo de la página.

**Chip de tema `.ibchip`**: el mismo aspecto y los mismos estados que un botón del segmentado (es la misma familia). El contador va después de la etiqueta, a 8 px: píldora `.cnt` de 20 px de ancho mínimo y 18 px de alto, fondo `--panel3`, 12 px 800 `--text`, cifras tabulares. En el chip activo el contador sigue sobre `--panel3`, porque la píldora es opaca y su contraste no depende del acento. Sin sin leer no hay contador (nada de "0"). Los chips nunca pasan a dos filas: en escritorio entran; por debajo de 1060 px y en celular la fila se desplaza de costado (sección 7).

Al activarse, la ✓ ensancha el botón unos 18 px. Se acepta: el cambio es inmediato y sin animación, y es la marca de forma que pide la decisión 2.

### 4.4 Lista: contenedor

- `.ib-list` es una `.card` con padding 6 px 0 (las filas van de borde a borde, como `.msglist`). Alto máximo `calc(100vh − 230px)`, desplazamiento vertical propio y barra de desplazamiento fina (`scrollbar-width: thin`, color `--line` sobre transparente).
- El `role="listbox"` envuelve el bloque y los días. "Mostrar más" queda dentro de la tarjeta pero fuera del `listbox`.

### 4.5 Bloque "Para decidir · N" y filas de decisión

**Encabezado del bloque `.ib-block-h`**: misma familia que `.ib-pend` del mosaico del Inicio, aprobado por el usuario.
- Píldora de 36 px de alto, margen 8 px 8 px 4 px, padding 6 px 12 px, radio 8.
- Fondo `color-mix(in srgb, var(--warn) 10%, var(--panel))`, que se ve como #322d38. Borde 1 px `color-mix(in srgb, var(--warn) 35%, transparent)`.
- Contenido: ícono "!" en círculo de 16 px (`--warn`), "Para decidir" en 14 px 800 `--text` y la cantidad en `.pdot` (fondo `--warn`, tinta #1d1300, 12 px 800, padding 1 px 8 px; hoy mide 9,8 px y se sube en la bandeja).
- No es seleccionable ni enfocable; es el nombre del `role="group"`.

**Fila de decisión** (`.msg.ib-dec`, tres líneas, 74 px de alto):

| Parte | Tratamiento |
|-------|-------------|
| Riel | `::before` absoluto a la izquierda, 3 px de ancho, de `top: 0` a `bottom: -1px`, para que cubra el separador y las filas del bloque formen un riel continuo. Color `--warn` |
| Ícono | Círculo `.msg-ico.dec` de 32 px: fondo `color-mix(--warn 12 %, --panel)`, borde 1 px `color-mix(--warn 50 %, transparent)`, "!" de 16 px en `--warn` (trazo 2,6) |
| Línea 1 (remitente) | `.msg-from`: el tipo en 700 `--text` ("Oferta", "Oferta de trabajo", "Vestuario", "Prensa", "Temporada") y " · Racing Club" en 600 `--dim`, con elipsis solo en la entidad |
| Línea 2 (título) | `.msg-t` 14 px 600 `--text` |
| Línea 3 (plazo) | `.ib-due` (sección 4.12): "Vence en 3 días · el 18 nov", "Vence mañana · el 15 nov", "No vence", "Antes del partido" |
| Derecha | Nada en escritorio. En 900 px o menos, chevron › de 16 px en `--dim` |

Estados de la fila de decisión:

| Estado | Fondo | Riel | Ícono | Título | Línea 3 |
|--------|-------|------|-------|--------|---------|
| Pendiente | transparente (`--panel`) | `--warn` | "!" ámbar | 600 `--text` | Plazo |
| Hover | `--panel2` | `--warn` | igual | igual | igual |
| Elegida | `--accent-soft` | **`--accent-hi`** (el riel de esa fila pasa a marcar la selección) | igual | igual | igual |
| Elegida con foco | igual | igual | igual | igual | Contorno de 2 px `--accent-hi` con −2 px de separación (hacia adentro) |
| Resuelta | transparente; si sigue elegida, `--accent-soft` | `--line` (deja de ser pendiente); `--accent-hi` si está elegida | Círculo neutro (`--panel2`, borde `--line`) con ✓ de 16 px en `--dim` | 500 `--dim` (en `--text` si está elegida) | "✓ Resuelto", 12 px 700 `--dim` |

Cuando la fila de decisión está elegida pierde el ámbar del riel, pero sigue siendo una decisión: está dentro del bloque, tiene el "!" y el plazo. La selección tiene una sola forma en toda la lista y nunca hay dos barras de color pegadas.

**Bloque vacío**: una línea `.ib-block-h.none`, píldora neutra (`--panel2`, sin borde), con ✓ de 16 px en `--dim`, "Nada para decidir." en 700 `--text` y " Podés seguir con Continuar." en 500 `--dim`. No es seleccionable.

### 4.6 Encabezado de día

`.msg-day`, como en el Inicio, con dos cambios: 12 px y "Hoy" o "Ayer" resaltados (700 `--text`). Fondo `--panel2`, radio 8, padding 6 px 12 px, margen 8 px 8 px 4 px. No es sticky: en una lista corta por día, un encabezado fijo tapa más de lo que orienta.

### 4.7 Fila de mensaje

Anatomía de `.msg` del Inicio, sin cambios de estructura:

```
│▌ ( ícono 32 )  Parte médico · Lucas Díaz                 [chip]  ● │
│▌               Díaz se lesionó en la práctica                       │
   12 px de aire   remitente 12 px / título 14 px        chip 12 px   punto 8 px en una columna fija de 8 px
```

- **Ícono**: `.msg-ico` de 32 px, fondo `--panel2`, borde 1 px `--line`, ícono de tema de 16 px (`TAG_ICON`, trazo 2,4) en `--text`. Es el mismo en todos los estados.
- **Columna derecha**: chip de acción `.ib-tag` (si hay) y, en una columna fija de 8 px, el punto. La columna existe aunque el mensaje esté leído, así los chips quedan alineados (continuidad).
- **Chip de acción `.ib-tag`**: 22 px de alto, padding 0 8 px, radio 8, 12 px 700.
  - "Para decidir": fondo `color-mix(--warn 13 %, --panel2)`, sin borde, texto `--text`.
  - "Ver informe" e "Informe": fondo `--panel2`, borde 1 px `--line`, texto `--dim`.
  - Es solo texto: no es un botón ni una parada de Tab. La acción está en el panel.
- **Punto de sin leer** `.msg-dot`: 8 px, `--accent-hi`, `aria-label="Sin leer"`. En el alcance "Todo el fútbol" no hay punto: son noticias, no tareas.

| Estado | Fondo | Barra izquierda | Remitente | Título | Punto |
|--------|-------|-----------------|-----------|--------|-------|
| Leído | transparente | — | 600 `--dim` | 500 `--dim` | — |
| Sin leer | transparente | — | 600 `--dim` | 700 `--text` | ● |
| Hover (sin elegir) | `--panel2` | — | igual | igual | igual |
| Elegido, leído | `--accent-soft` | 3 px `--accent-hi` | 600 `--dim` | 500 `--text` | — |
| Elegido sin leer (selección automática al entrar) | `--accent-soft` | 3 px `--accent-hi` | 600 `--dim` | 700 `--text` | ● (se queda) |
| Elegido con foco (lista enfocada) | igual | igual | igual | igual | Contorno de 2 px `--accent-hi` con −2 px de separación, radio 6 |
| Coincidencia de búsqueda | sin cambio | — | — | El término en `<mark>`: fondo transparente, 800 `--text`, subrayado de 1 px a 2 px de la letra | — |

Con el mouse encima de la fila elegida no cambia nada: el fondo `--accent-soft` se mantiene y no pasa a `--panel2`.

### 4.8 "Mostrar 150 más"

`.btn.sm` a todo el ancho de la columna, margen 8 px 12 px 12 px, fuera del `listbox`, con el texto "Mostrar 150 más" (o la cantidad que quede). Tiene el foco normal de botón.

### 4.9 Panel de lectura: esqueleto común

`.ib-read` es una `.card` con padding 20 px 24 px, `position: sticky; top: 0`, alto mínimo 260 px, alto máximo `calc(100vh − 230px)` y desplazamiento propio. De arriba abajo:

1. **Encabezado `.ib-rhead`** (fila, hueco de 10 px, alineada al centro):
   - Tema como título portal en color (`h3`, 15,1 px 700).
   - Marca de estado en un chip `.chip.ib-state` (`--panel2`, 12 px 700 `--text`):
     - "● Sin leer": punto `--accent-hi` de 8 px más el texto. Solo si el mensaje no está leído (decisión 3).
     - "✓ Resuelto": ✓ de 12 px. Solo después de resolver.
     - "Para decidir": para un mensaje cuya decisión sigue abierta. Va con el tinte ámbar de `.ib-tag`.
   - A la derecha, la fecha `.ib-date` (12 px 600 `--dim`, con año) y "Marcar como no leído" / "Marcar como leído" (`.btn.sm`).
2. **Título `.ib-h`**: `h2`, 19,6 px 700, margen superior 6 px.
3. **Tarjetas de entidad `.ib-ents`**: retícula `repeat(auto-fit, minmax(240px, 1fr))` con hueco de 10 px (sección 4.10).
4. **Cifras clave `.ib-kpis`** (sección 4.11).
5. **Plazo y hechos `.ib-facts`** (sección 4.12).
6. **Cuerpo `.ib-body`** (sección 4.13).
7. **Acciones `.ib-acts`**, ayuda `.ib-help`, nota F7 y "Siguiente pendiente" (sección 4.14).

Lo que no aplica a un tipo de mensaje no se dibuja, sin dejar huecos. Si no hay acciones, tampoco hay separador.

### 4.10 Tarjetas de entidad

`.ib-who` es un `button.linkish` con `data-pid` o `data-cid`. Se rediseña:
- Fondo `--panel2`, borde 1 px `--line2`, radio 12, padding 12 px 14 px, alto mínimo 64 px, hueco interno 12 px.
- **Jugador**: silueta `Face` de 44 px (la genérica `player.webp`, sin fotos reales). A su derecha, una columna con dos líneas: el nombre (14 px 700 `--text`) más `PosPill` y `Val` en la misma línea; debajo, `.ib-who-m` (12 px `--dim`): "24 años · Titular · 18 PJ · contrato dic 2028". Si corresponde, los chips de `Status` van en una tercera línea.
- **Club**: escudo de 40 px. Nombre (14 px 700) y, debajo, `.ib-who-m`: "Liga Profesional · 4.º · reputación 72".
- Chevron › de 16 px en `--dim` contra el borde derecho: la tarjeta lleva a la ficha.
- Hover: fondo `--panel3`, borde #4a5185, chevron en `--text`. Foco: contorno de 2 px `--accent-hi` con 2 px de separación hacia afuera, para que caiga sobre `--panel` (par medido).
- Dentro de la tarjeta, `.pill` (hoy 0,7rem = 9,8 px), `.chip` (0,76rem = 10,6 px) y `.ovr` se suben a 12 px como mínimo.
- **Entidad inexistente** (`.ib-who.gone`): un `div`, no un botón. Borde 1 px **discontinuo** `--line`, fondo transparente, sin chevron, ícono de tema neutro de 32 px y "Ya no está en el fútbol argentino." en 14 px 500 `--dim`. Se distingue por la forma del borde y por el texto, no por el color.

### 4.11 Cifras clave

`.ib-kpis`: retícula `repeat(auto-fit, minmax(128px, 1fr))` con hueco de 10 px. Cada `.ib-kpi` sigue el modelo de `.tkpis > div` de Tácticas: fondo `--panel2`, borde 1 px `--line2`, radio 10, padding 10 px 12 px, columna con hueco de 4 px.
- Etiqueta `.ib-kpi-l` (12 px 600 `--dim`), valor `.ib-kpi-v` (18,9 px 800 `--text`, cifras tabulares) y aclaración opcional `.ib-kpi-s` (12 px `--dim`).
- **Cifra clave** (`.ib-kpi.key`, una por plantilla: la Oferta, los Días afuera, la Conformidad): borde 1 px `--line` y valor de 21,7 px. Se destaca por tamaño, no por color.
- **Las cifras no se colorean.** La diferencia de la oferta se escribe "+20 %" con la aclaración "sobre su valor" ("−15 %", "bajo su valor"). En verde o rojo se perdería para el daltonismo rojo-verde, y la palabra ya dice el sentido.
- Comparación de la oferta de trabajo (`.ib-cmp`): una tabla de tres columnas en lugar de ocho cajas. Rótulos en 12 px 600 `--dim`; "Ese club" con escudo de 20 px; "El tuyo" con el escudo propio de 20 px; valores en 14 px 700 `--text` con cifras tabulares. Filas de 36 px separadas por `--line2`, todo dentro de una caja `--panel2` de radio 10. No se marca quién gana fila por fila: comparar es del DT.

### 4.12 Línea de plazo y líneas de hecho

`.ib-facts` es una columna con hueco de 6 px y texto de 14 px `--text`.
- **Plazo `.ib-due`** (en la fila y en el panel es el mismo componente; en la fila mide 12 px):
  - Normal: reloj de 14 px y texto en `--dim` 600. "Vence en 3 días (el 18 nov)".
  - **Corto**, hoy o mañana: "!" en círculo de 14 px y texto en `--warn` 700. "Vence mañana (el 15 nov)" o "Vence hoy". El ícono cambia de forma (reloj por "!"), el peso sube y la palabra dice la urgencia.
  - Sin plazo: "No vence: sigue pendiente hasta que…", sin ícono, en `--dim`.
- **Hechos** ("Libro de pases abierto", "Si lo vendés te quedan 2 delanteros centro."): viñeta redonda de 5 px `--dim` y texto `--text`.
- **Consecuencias de la oferta de trabajo `.ib-conseq`**: caja `--panel2`, riel izquierdo de 3 px `--line` (neutro, porque no es una advertencia del sistema sino un dato para decidir), radio 10, padding 10 px 14 px, 14 px `--text`. Cuando se abre la confirmación F6 del trabajo, la caja queda inmediatamente arriba de los botones de confirmar, sin nada en el medio.

### 4.13 Cuerpo

`.ib-body`: 14 px 500 `--dim`, interlineado 1,6, ancho máximo 68ch. Las preguntas de prensa van en `.ib-quotes`: cada una en cursiva 14 px `--text`, con borde izquierdo de 2 px `--line`, padding izquierdo de 12 px y 8 px de hueco entre ellas.

### 4.14 Acciones, confirmación F6, nota F7, "Siguiente pendiente" y "Resuelto"

**Fila de acciones `.ib-acts`**: flex con `wrap`, hueco de 8 px, borde superior 1 px `--line2`, padding superior 16 px, margen superior 20 px.
- Orden: **primario** primero, después los **comunes** y, al final, **peligro** empujado al extremo derecho (`margin-left: auto`). La distancia física entre "Aceptar" y "Rechazar" protege de un clic errado. Cuando la fila se parte en dos líneas, peligro sigue último.
- Un solo `.btn.primary` por bloque. Su relleno y su tinta salen del arreglo global de la decisión 1; la bandeja no le agrega nada.
- Común `.btn`: fondo `--panel2`, borde `--line`, 14 px 700 `--text`, 38 px de alto.
- **Peligro `.btn.danger`**: el mismo fondo que el común, texto `--danger` y borde 1 px `color-mix(var(--danger) 45 %, var(--line))`, para que la forma también sea distinta.
- **Deshabilitado**: opacidad 0,4 (existente) y el motivo escrito en `.ib-help` justo debajo. Ejemplos: "El libro de pases está cerrado: podés pedir más o rechazar." y "Frená el avance para decidir.".
- **Ayuda `.ib-help`**: 12 px 500 `--dim`, con el nombre del botón en 700 `--text`. Ejemplo: "**Pedir más:** Racing puede mejorar la oferta o retirarse." Va a 8 px de la fila de botones y siempre está visible.

**Confirmación en el lugar (F6) `.ib-confirm`**: el botón que se apretó se reemplaza por una caja de fondo `--panel2`, borde 1 px `--line` y radio 12, con padding 8 px. Adentro van el botón de confirmar y "No" (`.btn`, común). El resto de los botones de la fila sigue a la vista y habilitado.
- Aceptar → **"Confirmar: vender a Juan Pérez por US$ 2,4 M"** con `.btn.primary`.
- Rechazar → **"Confirmar rechazo"** con `.btn.danger.strong`: fondo `color-mix(--bad 16 %, --panel2)` (≈ #46304f), borde 1,5 px `--danger` y texto `--text` 700. Se distingue del primario por el borde rojizo, el tinte y la palabra.
- La etiqueta de confirmar se ajusta en hasta dos líneas (`white-space: normal`, alineada a la izquierda, ancho máximo 100 %). Nunca lleva elipsis.
- No hay animación: el cambio es instantáneo (especificación 10).

**Nota de resultado (F7) `.ib-result`** (`role="status"`): va sobre `--panel`, **sin fondo propio**, porque el texto de error en `--bad` solo está medido sobre `--panel`. Borde 1 px `--line2`, riel izquierdo de 3 px, radio 12, padding 10 px 14 px, 14 px 600.

| Variante | Riel | Ícono (16 px) | Texto |
|----------|------|---------------|-------|
| Éxito ("Vendiste a…", "Habló el ayudante.") | `--good` | ✓ en `--good` | `--text` |
| Advertencia ("Racing se retiró de la negociación.") | `--warn` | "!" en `--warn` | `--text` |
| Error al guardar | `--bad` | "!" en `--bad` | `--bad` |

"Deshacer" va como `.btn.sm` a la derecha, dentro de la nota.

**"Siguiente pendiente"**: `.btn.primary` debajo de la nota, a 12 px, con la etiqueta "Siguiente pendiente" y un chevron › de 16 px (trazo 2,8) a la derecha. Cuando aparece, es el único primario del panel, porque las acciones de la decisión resuelta ya no están.

**Decisión vencida o respondida en otro lado**: las acciones se reemplazan por `.ib-gone`, una línea de 14 px 500 `--dim` sin separador: "Esta oferta venció el 18 nov." o "Ya respondiste esta oferta.".

### 4.15 Plantillas por tipo

Todas usan el esqueleto de 4.9. Acá va solo lo que cambia.

| Tipo | Tarjetas | Cifras (la clave en **negrita**) | Plazo y hechos | Acciones (orden visual) |
|------|----------|---------------------------------|----------------|-------------------------|
| Oferta por un jugador | Jugador (con rol, PJ y contrato) y club que ofrece | **Oferta** · Valor · Diferencia (+20 % / "sobre su valor") · Sueldo ("por mes") · Contrato | Plazo; libro de pases; "Si lo vendés te quedan N en su puesto" | Aceptar (primario) · Pedir más · Ver la ficha · · · Rechazar (peligro). "Ver la ficha" pasa delante de "Rechazar" por la regla de peligro al final. Ayuda de "Pedir más" siempre visible |
| Oferta de trabajo | Club que ofrece | Comparación `.ib-cmp` (Categoría, Posición, Reputación, Presupuesto) | Plazo según el tipo; "Si aceptás, dirigís…" / "Empezás la próxima temporada en…"; consecuencias en `.ib-conseq` | Aceptar (primario) · Ver el club · · · Rechazar (peligro) |
| Jugador que quiere irse | Jugador con `Status` | **Conformidad** (número y `.bar` de 60 px; color de la barra según `Cond`, con el número siempre visible) · Rol · Minutos ("esperados 60 % · jugados 22 %") | "No vence: …"; promesas vigentes como `.chip` "Promesa hasta el …" | Hablar con él (primario) · Declararlo transferible |
| Conferencia | — | Partido (escudo del rival de 20 px y "Lanús · sáb 21 nov") · Tipo (Previa / Posterior) | Preguntas en `.ib-quotes`; "Si seguís sin responder, habla el ayudante." | Responder (primario) · Que hable el ayudante |
| Lesión | Jugador con el chip de lesión | **Días afuera** · Vuelve (fecha) · Partidos que se pierde | Si ya se recuperó: ✓ y "Ya está recuperado", sin cifras | Ir a Tácticas (primario si era titular; si no, común) · Ver la ficha |
| Resultado | Marcador `.ib-score` en lugar de tarjetas; debajo, la figura como tarjeta de jugador compacta con `.ratbox` | Torneo y fecha en 12 px `--dim` debajo del marcador; resultado en palabras con `.ib-res` | — | Ver el informe del partido (primario) · Ver posiciones |
| Informe de ojeo | Jugador con valoración y potencial exactos | Cuatro mejores atributos y el más flojo en `.attr` de la ficha (rótulo y valor en caja con tono y número; rótulo subido a 12 px) en dos columnas · Personalidad · Valor · Pedido de sueldo | Club y contrato | Ver la ficha (primario) · Seguir / En seguimiento (alternable con el estado de la decisión 2 y ✓) · Ofertar |
| Informe del rival | Club rival | Estilo · Punto débil | "Ese partido ya se jugó" en `.ib-gone` si no es el próximo | Ver el informe del rival (primario) |
| Entrenamiento | — | — | — | Ir a Entrenamiento (común; no hay primario) |
| Fin de temporada | — | **Posición final** · Objetivo de la dirigencia | — | Ir al inicio (primario) |
| Torneo y premio | Club, si hay | — | — | Ver posiciones (común) |
| Cualquier otro | Jugador o club, si hay | — | — | Sin fila de acciones ni separador |

**Marcador `.ib-score`** (resultado): fila centrada con hueco de 16 px. Local: escudo de 48 px y nombre corto en 14 px 700. En el centro, la caja con el aspecto de `.mb-score`: fondo #0d0f22, borde 1 px `--line`, radio 12, padding 2 px 14 px, 30,8 px 800 tabular, y el guion en `--dim` (no `--faint` como en `.mb-score i`). Visitante: lo mismo, invertido. Debajo, `.ib-res`: un chip `--panel2` con `.rdot` (G, E o P) y la palabra "Victoria", "Empate" o "Derrota" en 12 px 700 `--text`. El color del punto refuerza; la palabra informa.

---

## 5. Estados (especificación, sección 6)

| Estado | Tratamiento visual |
|--------|-------------------|
| Carga | No existe. El primer cuadro ya está completo y no hay esqueletos |
| Poblada | Secciones 4.4 a 4.14 |
| Con pendientes | Bloque con encabezado ámbar y riel continuo (4.5); los mensajes con decisión abierta llevan el chip "Para decidir" |
| Sin pendientes | Una línea neutra con ✓: "Nada para decidir. Podés seguir con Continuar." (4.5) |
| Vista vacía (filtro) | `.ib-empty` dentro de la lista, debajo del bloque: ícono del tema en un círculo `.msg-ico` de 40 px (ícono de 20 px, `--dim`) y el texto de la sección 13 de la especificación en 14 px 500 `--dim`, con ancho máximo de 40ch, alineado a la izquierda y padding 24 px 16 px. "Marcar como leídos" desaparece. El panel de lectura muestra "Elegí un mensaje de la lista." en 14 px `--dim`, centrado en el alto mínimo |
| Partida nueva | Igual que la vista vacía, con el ícono de Bandeja (`App.tsx`) y el texto de partida nueva. El panel repite la ayuda O2 con el formato de `.pagetip` (riel `--info`) dentro de la tarjeta, sin el botón "Entendido" |
| Búsqueda activa | El campo muestra `✕`; las coincidencias van en negrita 800 con subrayado (4.7); los encabezados de día siguen; el bloque no se filtra |
| Búsqueda sin resultados | `.ib-empty` con "Ningún mensaje contiene «x» en esta vista." (con «x» en 700 `--text`) y debajo, a 12 px, "Buscar en todo el fútbol" (`.btn.sm`, solo en Mi club) y "Borrar búsqueda" (`.btn.sm`) |
| Elegido | Fondo `--accent-soft`, barra de 3 px `--accent-hi` y, si la lista tiene el foco, contorno (4.7) |
| Sin leer | Título 700 `--text` y punto `--accent-hi`; si además está elegido por selección automática, se mantienen los dos y el panel muestra el chip "● Sin leer" (decisión 3) |
| Confirmación pendiente (F6) | Caja `.ib-confirm` en el lugar del botón (4.14) |
| Resuelto | Fila: riel `--line`, ícono ✓ neutro, título tenue y "✓ Resuelto" en texto (4.5). Panel: chip "✓ Resuelto" en el encabezado, nota F7 de éxito y "Siguiente pendiente" |
| Pedir más con retiro | Nota F7 en la variante de advertencia |
| Vencida o respondida en otro lado | `.ib-gone` en el lugar de las acciones (4.14) |
| Entidad inexistente | `.ib-who.gone` con borde discontinuo (4.10) |
| Libro de pases cerrado | "Aceptar" con opacidad 0,4 y `.ib-help` con el motivo |
| Plazo corto | `.ib-due` corto: "!", `--warn` 700 y "hoy" o "mañana" (4.12) |
| Avance en curso | Botones de decisión deshabilitados y `.ib-help` "Frená el avance para decidir." debajo de cada fila de acciones. La lista se actualiza sin animación |
| Ventana abierta (F5) | `.modal-bg` existente |
| Error al guardar | Nota F7 en la variante de error |
| ≤ 900 px: lista y detalle | Sección 7 |

Transiciones (especificación, sección 10): no se agrega ninguna. Hover de filas, chips y tarjetas con transición de fondo de 120 ms (desactivada con `.reduce-motion` y `prefers-reduced-motion`, reglas existentes); entrada a la pantalla y al detalle con `page-in`. El cambio de selección, la confirmación F6 y la nota F7 aparecen en 0 ms.

---

## 6. Celular (390 px de ancho) y ventana angosta (761 a 900 px)

### 6.1 Lista

```
┌──────────────────────────────────────┐
│ [escudo] 14 nov            [Continuar]│  barra superior existente (56 px)
├──────────────────────────────────────┤
│ ┌ Bandeja ─────── [Marcar 5…] [⌕] ┐  │  h2 19,6 px; botones de 44 px
│ [Mi club][✓ Todo el fútbol]          │  segmentado, 44 px de alto
│ [✓ Todo 5][Plantel 2][Mercado 1][Pa▒ │  chips desplazables, degradé en el borde derecho
│ ┌ card ──────────────────────────┐   │
│ │ ╭(!) Para decidir (3)───────╮  │   │
│ │ ▌(!) Oferta · Racing      ›   │   │
│ │ ▌    Racing ofrece US$ 2,4 M… │   │
│ │ ▌    ◷ Vence en 3 días        │   │
│ │ (Hoy · sáb 14 nov)            │   │
│ │ (✚) Parte médico · L. Díaz ● ›│   │
│ │     Díaz se lesionó en la p…  │   │
│ └───────────────────────────────┘   │
├──────────────────────────────────────┤
│ Inicio  Bandeja  Plantel  Tácticas  Más│  navegación inferior existente (62 px)
└──────────────────────────────────────┘
```

- **Título**: "Bandeja" (como el wireframe del celular; " de entrada" va en un `span.hide-sm`). A la derecha, "Marcar N como leídos" (`.btn.sm`, 44 px de alto) y la lupa (`.btn.icon`, 44 × 44). Al abrir la búsqueda, el campo ocupa toda la fila del título con `✕` para cerrarla; el `h2` sigue en el documento como texto oculto visualmente.
- **Segmentado y chips**: 44 px de alto. Los chips van en una fila desplazable de costado (`overflow-x: auto`, sin barra visible) con un degradé de máscara en el borde derecho (`mask-image: linear-gradient(90deg, #000 88%, transparent)`) que avisa que hay más. La página nunca se desplaza de costado.
- **Filas**: las mismas de escritorio, con alto mínimo de 56 px y chevron › de 16 px `--dim` a la derecha (después del punto). En el celular el chevron dice "abre otra vista"; en escritorio no va, porque la lectura está al lado. Las filas de decisión conservan las tres líneas: con dos decisiones, el bloque termina a unos 410 px, dentro de los 740 de la pantalla de referencia.
- No hay fila elegida. Al volver del detalle, la fila que se leía recibe el foco y muestra el contorno `--accent-hi`.

### 6.2 Detalle del mensaje

```
┌──────────────────────────────────────┐
│ [◂ Bandeja]            3 de 3 [‹][›] │  44 px
│ ┌ card ──────────────────────────┐   │
│ │ Mercado  ● Sin leer   10 nov   │   │
│ │ Racing ofrece US$ 2,4 M por    │   │  h2 17,5 px
│ │ Juan Pérez                     │   │
│ │ [tarjeta jugador            ›] │   │  apiladas
│ │ [tarjeta club               ›] │   │
│ │ [Oferta     ][Valor      ]     │   │  cifras en 2 columnas
│ │ [Diferencia ][Sueldo     ]     │   │
│ │ ◷ Vence en 3 días (18 nov)     │   │
│ │ cuerpo…                        │   │
│ └────────────────────────────────┘   │
├──────────────────────────────────────┤
│ [          Aceptar             ]     │  barra de acciones fija
│ [Pedir más][Ver la ficha][Rechazar]  │
│ Pedir más: Racing puede mejorar…     │
├──────────────────────────────────────┤
│ Inicio  Bandeja  Plantel  Tácticas  Más│
└──────────────────────────────────────┘
```

- **Cabecera `.ib-dhead`**: "◂ Bandeja" es un `.btn` con flecha atrás de 18 px y texto de 14 px 700, de 44 px de alto. A la derecha, "3 de 3" (12 px 600 `--dim`) y dos `.btn.icon` de 44 × 44 con chevrones de 18 px y `aria-label`. En el primero y en el último de la lista, la flecha que no lleva a ningún lado queda deshabilitada (opacidad 0,4).
- **Contenido**: una `.card` con padding 16 px. Esqueleto de 4.9 con `h2` de 17,5 px, tarjetas de entidad apiladas, cifras en `repeat(2, 1fr)` con valores de 16,8 px (1,2rem) y la tabla de comparación del trabajo a todo el ancho. Al pie, un padding inferior igual al alto de la barra de acciones, para que el último párrafo no quede tapado.
- **Barra de acciones fija `.ib-actbar`**:
  - `position: fixed`, de borde a borde. En 760 px o menos va en `bottom: calc(62px + env(safe-area-inset-bottom))`, apoyada sobre la navegación inferior; entre 761 y 900 px, en `bottom: 0`.
  - Fondo #11132a, borde superior 1 px `--line2`, sombra hacia arriba y padding 8 px 12 px.
  - Fila 1: el primario a todo el ancho (44 px como mínimo). Fila 2: los comunes y el peligro en `grid-auto-flow: column`, con columnas iguales, 44 px de alto y 8 px de hueco; peligro último, a la derecha. Si hay más de tres botones, el cuarto pasa al contenido como "Más acciones" (especificación 5.2). Fila 3, si hace falta: `.ib-help` en 12 px.
  - La confirmación F6 ocupa la fila 1 con el botón de confirmar ajustado en dos líneas, y "No" pasa a la fila 2.
  - La nota F7 y "Siguiente pendiente" reemplazan el contenido de la barra hasta que se cambia de mensaje.
  - Alto: de 60 px (un botón) a unos 132 px (dos filas más la ayuda).

---

## 7. Pregunta 9: el ícono de la fila

**Decisión: siempre el ícono redondo del tema en la lista, con "!" para las decisiones. La cara y el escudo pasan al panel de lectura.** Se confirma la propuesta de la especificación.

Razones:
1. **La cara no informa nada.** Todos los jugadores usan la misma silueta genérica (`player.webp`, la que eligió el usuario; no hay fotos reales). En una lista, diez siluetas iguales son ruido que se parece a información. La captura `bandeja-1440.png` lo muestra: la silueta y el escudo se alternan sin decir nada.
2. **El escudo propio tampoco.** En "Mi club", casi todos los mensajes son del club del DT: la captura repite el escudo de Independiente en 7 de 10 filas. Lo que sí distingue es el tema (parte médico, partido, mercado, dirigencia).
3. **Semejanza (Gestalt) y lectura en columna.** La columna izquierda se recorre de un vistazo. Si todos los íconos son de la misma forma (círculo de 32 px, trazo de 2,4, un color), el ojo agrupa por tema y lo raro salta: el "!" ámbar de las decisiones. Si se mezclan escudos de colores de 86 clubes con siluetas, la columna compite con el título.
4. **Una sola familia con el Inicio.** El mosaico "Mensajes", aprobado, ya usa el ícono de tema. Con la misma anatomía, el DT reconoce la fila sin aprender nada nuevo.
5. **Quién es sigue escrito.** La entidad va en texto en el remitente ("Parte médico · L. Díaz"), y en el panel están la tarjeta con cara o escudo y el resumen de la ficha al pasar el mouse.

Descartado: un escudo de 14 px junto al remitente solo en "Todo el fútbol", donde sí distinguiría clubes. Daría dos anatomías de fila según el alcance y volvería a meter color en la columna de lectura. Si al jugar se extraña, se puede probar después sin tocar el resto.

---

## 8. Accesibilidad (nivel Estándar)

### 8.1 Tamaños mínimos

| Elemento | Antes | Ahora |
|----------|-------|-------|
| Título de fila `.msg-t` | 13,3 px | 14 px |
| Remitente `.msg-from` | 10,1 px | 12 px |
| Encabezado de día `.msg-day` | 11,2 px | 12 px |
| Separador `.ib-sep` | 9,2 px | se retira; lo reemplaza `.ib-block-h` (14 px) |
| Contador `.tabs .cnt` | 9,5 px | se retira; `.ibchip .cnt`, 12 px |
| `.pdot` en el bloque | 9,8 px | 12 px |
| Chips de fila y de estado (`.chip`) | 10,6 px | 12 px (`.ib-tag`, `.ib-state`) |
| `.pill`, `.attr-l` y `.chip` de `Status` en el panel | 9,8 / 11,2 / 10,6 px | 12 px dentro de `.ib-read` |
| Etiqueta de cifra (`.kpi h3`) | 11,2 px | 12 px (`.ib-kpi-l`) |
| `.btn.sm` | 11,5 px | 12 px dentro de la bandeja |
| Cuerpo y títulos | 14 px o más | sin cambios |

Nada de la pantalla queda por debajo de 12 px. Objetivos de clic: filas de 52 px o más, botones de 32 px o más en escritorio, y 44 × 44 px o más en el celular para filas, chips, segmentado, acciones, "◂ Bandeja" y ‹ ›.

**Texto al 120 %**: las filas mantienen una línea por renglón con elipsis (título y entidad); el remitente nunca se corta. El panel ajusta en varias líneas. La retícula de cifras usa `auto-fit`, así que baja de 5 a 3 o 2 columnas sin superponerse.

### 8.2 Contraste

Los valores **medidos** son los que pasó el orquestador. Los marcados **medir** son pares nuevos: van con los hex y una estimación propia (fórmula WCAG a mano, que reproduce los medidos: `--text` sobre `--panel` da 14,6 y `--warn` sobre `--panel`, 9,3), para que el orquestador los confirme.

**Texto**

| # | Texto | Fondo | Mínimo | Valor | Estado |
|---|-------|-------|--------|-------|--------|
| 1 | Título sin leer, valores, nombres `--text` | `--panel` | 4,5 | 14,64 | medido |
| 2 | Título leído, remitente, cuerpo, fecha, ayuda, plazo normal `--dim` | `--panel` | 4,5 | 6,99 | medido |
| 3 | Título `--text` en la fila elegida | `--accent-soft` sobre `--panel` | 4,5 | 10,57 a 12,78 | medido |
| 4 | Remitente y plazo normal `--dim` en la fila elegida | ídem | 4,5 | 5,05 a 6,11 | medido |
| 5 | Plazo corto `--warn` en la fila elegida | ídem | 4,5 | 6,71 a 8,12 | medido |
| 6 | Plazo corto `--warn` | `--panel` | 4,5 | 9,30 | medido |
| 7 | Remitente, título leído y plazo `--dim` en hover | `--panel2` | 4,5 | 6,16 | medido |
| 8 | Título y "Hoy" `--text` en hover y en encabezado de día | `--panel2` | 4,5 | 12,89 | medido |
| 9 | Plazo corto `--warn` (#ffb547) en hover | `--panel2` #23274a | 4,5 | ≈ 8,2 | **medir** |
| 10 | "Para decidir" `--text` en el encabezado del bloque | `--warn` 10 % sobre `--panel` ≈ #322d38 | 4,5 | ≈ 12,0 | **medir** |
| 11 | Número `.pdot` #1d1300 | `--warn` #ffb547 (`.cvd` #f3d34a) | 4,5 | ≈ 10,4 (más en `.cvd`) | **medir** |
| 12 | Chip "Para decidir" `--text` | `--warn` 13 % sobre `--panel2` ≈ #3a3346 | 4,5 | ≈ 11 | **medir** |
| 13 | Chip neutro `--dim` ("Ver informe") | `--panel2` | 4,5 | 6,16 | medido |
| 14 | Chip o segmento activo `--text` | `--accent-soft` **compuesto sobre `--panel`** | 4,5 | 10,57 a 12,78 | medido (el mismo compuesto que la fila elegida; ver 4.3) |
| 15 | Chip o segmento inactivo `--text` | `--panel` | 4,5 | 14,64 | medido |
| 16 | Contador `--text` | `--panel3` #2b3056 | 4,5 | ≈ 11,3 | **medir** |
| 17 | Texto del buscador `--text` / marcador de posición `--dim` | #12152b | 4,5 | ≈ 16 / ≈ 7,7 | **medir** |
| 18 | Tema del encabezado de lectura (acento 62 % + #fff) | `--panel` | 4,5 | ≥ 5,81 para los 86 clubes: tiene más blanco que la mezcla al 70 % del punto, medida en 5,81 a 12,54, y sobre un fondo oscuro más claro siempre es más contraste | **medir** (confirmar) |
| 19 | Nombre `--text` / datos `--dim` en tarjeta de entidad y cifras | `--panel2` | 4,5 | 12,89 / 6,16 | medido |
| 20 | Datos `--dim` con hover de tarjeta | `--panel3` | 4,5 | 5,42 | medido |
| 21 | Nombre `--text` con hover de tarjeta | `--panel3` | 4,5 | ≈ 11,3 | **medir** |
| 22 | Consecuencias `.ib-conseq` `--text` | `--panel2` | 4,5 | 12,89 | medido |
| 23 | Botón primario (y "Confirmar: vender…", "Siguiente pendiente") | acento con la tinta de la decisión 1 | 4,5 | ≥ 4,5 por regla | arreglo global de la fase 3; verificar con el script de AV-01 |
| 24 | Botón común `--text` | `--panel2` / hover `--panel3` | 4,5 | 12,89 / ≈ 11,3 | medido / **medir** |
| 25 | Botón de peligro `--danger` #ff8a95 | `--panel2` / hover `--panel3` | 4,5 | ≈ 6,4 / ≈ 5,6 | **medir** (sobre `--panel` está medido en 7,25) |
| 26 | "Confirmar rechazo" `--text` | `--bad` 16 % sobre `--panel2` ≈ #46304f | 4,5 | ≈ 10,5 | **medir** |
| 27 | Nota F7 de éxito y de advertencia `--text` | `--panel` | 4,5 | 14,64 | medido |
| 28 | Nota F7 de error `--bad` #ff5d6c (`.cvd` #f08c3a) | `--panel` | 4,5 | 5,47 (`.cvd` ≈ 6,6) | medido (`.cvd`: **medir**) |
| 29 | Vencida, "✓ Resuelto", estados vacíos `--dim` | `--panel` | 4,5 | 6,99 | medido |
| 30 | Marcador `--text` | #0d0f22 | 4,5 | ≈ 16,5 | **medir** |
| 31 | "N de M" `--dim` y textos del detalle | `--panel` (el detalle va en una tarjeta) | 4,5 | 6,99 | medido |
| 32 | Ayuda `--dim` y comunes `--text` en la barra fija | #11132a | 4,5 | ≈ 7,8 / ≈ 16 | **medir** |
| — | `--faint` | cualquiera | — | 3,78 a 4,61 en los fondos de esta pantalla | **no se usa en la bandeja** |

**No texto (3:1)**

| # | Elemento | Contra | Valor | Estado |
|---|----------|--------|-------|--------|
| 33 | Barra de la fila elegida `--accent-hi` | fila elegida | estimado ≥ 5: en el club más bajo, la fila elegida resta unos 13 % de contraste respecto de `--panel`, y 5,81 × 0,87 ≈ 5,0 | **medir** (resuelve el club en que el acento puro da 2,92) |
| 34 | Contorno de foco de fila `--accent-hi`, hacia adentro | fila elegida | ídem | **medir** |
| 35 | Punto de sin leer `--accent-hi` | `--panel` / fila elegida | 5,81 a 12,54 / ≈ ≥ 5 | medido / **medir** |
| 36 | Contorno de foco de botones, tarjetas, chips y buscador `--accent-hi`, hacia afuera | `--panel` | 5,81 a 12,54 | medido |
| 37 | Contorno de foco y borde activo del segmentado y los chips `--accent-hi` | fondo de página #0a0c1b | más que sobre `--panel`, porque el fondo es más oscuro | **medir** |
| 38 | Riel ámbar `--warn` | `--panel` | 9,30 | medido |
| 39 | "!" `--warn` en su círculo | `--warn` 12 % sobre `--panel` | ≈ 7,5 | **medir** |
| 40 | Borde de "Confirmar rechazo" `--danger` | #46304f / `--panel2` | ≈ 5,2 / ≈ 6,4 | **medir** |
| 41 | Riel de la nota F7 (`--good`, `--warn`, `--bad`) | `--panel` | `--warn` 9,30 y `--bad` 5,47 medidos; `--good` ≈ 9 | `--good`: **medir** |

**Si la fase 3 desplaza el acento** de algún club (decisión 1), cambian `--accent-soft` y `--accent-hi` de ese club: hay que volver a correr las filas 3 a 5, 14, 18 y 33 a 37 después de implementar.

### 8.3 Nada solo por color

| Estado | Color | Segunda marca |
|--------|-------|---------------|
| Decisión pendiente | Riel y "!" en ámbar | Bloque titulado "Para decidir · N", forma del ícono ("!" en lugar del tema), línea de plazo escrita |
| Sin leer | Punto de acento | Título en 700, chip "● Sin leer" en el panel, `aria-label` |
| Elegido | Fondo de acento suave | Barra de 3 px (forma), contorno con foco, `aria-selected` |
| Chip o segmento activo | Fondo y borde de acento | ✓ delante de la etiqueta, peso 700, `aria-pressed` |
| Plazo corto | Ámbar | "hoy" o "mañana" escrito, ícono que cambia de reloj a "!", peso 700 |
| Diferencia de la oferta | Ninguno | Signo, porcentaje y "sobre/bajo su valor" |
| Resultado | Punto G/E/P | "Victoria", "Empate", "Derrota" |
| Resuelto | Tono tenue | "✓ Resuelto" escrito, ícono ✓ |
| Peligro | Texto rojizo | Posición última y apartada, borde propio, palabra ("Rechazar", "Confirmar rechazo") |
| Nota F7 | Riel de color | Ícono (✓ o "!") y texto |
| Entidad inexistente | — | Borde discontinuo y texto |

En el modo para daltonismo (`.cvd`), `--warn`, `--good` y `--bad` cambian solos, porque todos los tintes de esta pantalla se escriben con `color-mix` sobre las variables y no con hex fijos.

---

## 9. Coherencia con lo que ya está hecho

| Pantalla | Qué se toma | Cómo |
|----------|-------------|------|
| Mosaico "Mensajes" del Inicio | Anatomía de fila completa | Mismas clases `.msg`, `.msg-ico`, `.msg-from`, `.msg-t`, `.msg-dot`, `.msg-day`. Los cambios de tamaño (12 y 14 px), el hover a `--panel2` y `--accent-hi` en el punto se aplican también al Inicio, a propósito. El bloque "Para decidir" usa el aspecto de `.ib-pend` del mosaico. El segmentado del mosaico (Todos / Sin leer / Con acción) toma el estado activo nuevo de la decisión 2. `TAG_ICON` y `TAG_NAME` pasan a un módulo compartido (lo pide la especificación) |
| Tácticas | Cajas de cifras | `.ib-kpi` copia a `.tkpis > div` (`--panel2`, borde `--line2`, radio 10, valor 800). El estado activo de `Seg` en Tácticas cambia igual (decisión 2) |
| Día de partido (`.mboard`) | Marcador | `.ib-score` usa la caja de `.mb-score` (fondo #0d0f22, borde `--line`, 800 tabular) a 30,8 px, como `.mb-score` en el celular |
| Ficha de jugador (`.pband`) | Estructura, no color | La ficha es el lugar de la identidad (banda con el degradé del club). El panel de lectura repite el orden de la banda (rótulo, nombre grande, datos en una línea) pero en neutro, y las tarjetas llevan a la ficha. Así el degradé del club sigue significando "estás en una ficha" y no se gasta en cada mensaje. Los atributos del informe de ojeo usan las cajas `.attr-l` y `.attr .v` de la ficha |
| Barra superior | Chrome | La barra de acciones fija del celular usa el fondo #11132a de `.top` y `.subnav`, así se lee como parte del marco y no del contenido |
| Botones | Sin cambios de forma | `.btn`, `.btn.primary` (con la tinta de la decisión 1), `.btn.sm`, `.btn.icon`. La bandeja no usa el CTA con degradé: ese queda solo para Continuar |

---

## 10. Manifiesto de assets

Todo ícono es SVG en línea con `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, extremos y uniones redondeados, y `aria-hidden="true"` (el significado va en el texto o en el `aria-label` del botón). No hay rasters nuevos: solo los escudos existentes y `src/assets/player.webp`. No hay fuentes nuevas.

| Ícono | Trazado (`d`) | Trazo | Tamaño en pantalla | Dónde | Estado |
|-------|---------------|-------|--------------------|-------|--------|
| Temas: partido, torneo, lesión, club, mercado, premio, dirigencia | `TAG_ICON` en `src/ui/Home.tsx:198` | 2,4 | 16 px en el círculo de 32 (20 px en el de 40 de los estados vacíos) | Filas, estados vacíos | **Existe**; mover a un módulo compartido |
| Bandeja | `M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5` (`App.tsx:27`) | 2,25 → 2,4 | 20 px | Estado de partida nueva | **Existe** |
| Lupa | círculo `cx 11 cy 11 r 7` + `M20 20l-3.5-3.5` (`App.tsx:207`, `.sb-ico`) | 2,4 | 15 px | Buscador, botón de lupa | **Existe** |
| Chevron derecha | `M9 6l6 6-6 6` (`App.tsx:220`) | 2,8 | 16 px (filas en celular, tarjetas, "Siguiente pendiente"); 18 px (› del detalle) | — | **Existe** |
| Chevron abajo | `M6 9l6 6 6-6` (`TopNav.tsx:48`) | 2,6 | — | No se usa en la bandeja | Existe |
| Chevron izquierda | `M15 6l-6 6 6 6` | 2,8 | 18 px | ‹ del detalle | **Nuevo** |
| Flecha atrás | `M19 12H5M11 6l-6 6 6 6` | 2,4 | 18 px | "◂ Bandeja" | **Nuevo** |
| Decisión "!" (dentro de un círculo CSS) | `M12 7v6.5M12 17h.01` | 2,6 | 16 px en el círculo de 32 | Ícono de fila de decisión | **Nuevo** |
| "!" en círculo | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5.5M12 16.5h.01` | 2,4 | 14 px (plazo corto); 16 px (encabezado del bloque y notas F7 de advertencia y error) | — | **Nuevo** |
| Reloj | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2` | 2,4 | 14 px | Plazo normal | **Nuevo** |
| ✓ | `M5 12.5l4.5 4.5L19 7.5` | 3 (12 px) / 2,8 (14–16 px) | 12 px en segmentado, chips, botón alternable y chip "✓ Resuelto"; 16 px en fila resuelta, nota F7 de éxito y bloque vacío | — | **Nuevo** |
| ✕ | `M6 6l12 12M18 6L6 18` | 2,4 | 14 px | Borrar búsqueda | **Nuevo** |
| Punto de sin leer | CSS (círculo de 8 px) | — | 8 px | Filas, chip "Sin leer" | Existe (`.msg-dot`) |
| `.rdot` G/E/P | CSS | — | 10 px | Resultado en palabras | Existe |

Los íconos nuevos van en el mismo módulo compartido que `TAG_ICON`, con la función `ic()` existente. El trazo se pasa por parámetro: la función hoy lo fija en 2,4.

---

## 11. Clases CSS para la fase 3

Todo va en el bloque portal de `src/styles.css`, en una sección `/* portal: bandeja */`. Las que dicen **global** afectan a otras pantallas a propósito.

**Cambiar**

| Clase | Cambio |
|-------|--------|
| `clubTheme` (`common.tsx`) | Devolver `--accent-hi` = `mix(a, .30)`. **Global** |
| `:root` portal | Agregar `--danger: #ff8a95`. Usarla en `.btn.danger` y `.mb-rc`. **Global** |
| `.seg button.on` (portal y rediseño) | Decisión 2: fondo `linear-gradient(var(--accent-soft), var(--accent-soft)), var(--panel)`, borde `--accent-hi`, color `--text`, 700, sin sombra de color. ✓ con `.seg-ck` (SVG de 12 px) en `Seg` y en los segmentados armados a mano. **Global** |
| `.msg-from` | 0,86rem; el tipo (`b`) en 700 `--text`; entidad en `span.ell`. **Global** (Inicio) |
| `.msg-t` | 1rem; `.msg.unread .msg-t` 700. **Global** (Inicio) |
| `.msg-day` | 0,86rem; `b` en 700 `--text`. **Global** (Inicio) |
| `.msg:hover` | Fondo `--panel2`. **Global** (Inicio) |
| `.msg-dot` | `background: var(--accent-hi)`. **Global** (Inicio) |
| `.inbox` | `grid-template-columns: minmax(360px, 2fr) minmax(0, 3fr)` |
| `.ib-list` | Padding 6 px 0; `scrollbar-width: thin` |
| `.ib-read` | Padding 20 px 24 px; `max-height: calc(100vh − 230px)`; `overflow-y: auto` |
| `.ib-body` | 1rem, 500, `max-width: 68ch` |
| `.ib-who` | Rediseño completo (4.10); `.ib-who.gone` |
| `.ib-read .pill`, `.ib-read .chip`, `.ib-read .attr-l`, `.inbox .btn.sm`, `.ib-block-h .pdot` | 0,86rem como mínimo |

**Retirar de la bandeja**: `.ib-row` (y `.on`, `.unread`, `.pend`), `.ib-ico`, `.ib-title`, `.ib-meta`, `.ib-sep`, `.tabs .cnt`. `.ib-pend` sigue en el Inicio.

**Agregar**

| Clase | Qué dibuja |
|-------|-----------|
| `.ib-head` | Fila de encabezado: título, buscador y "Marcar como leídos" |
| `.ib-search`, `.ib-search-x` | Buscador con lupa y botón ✕; variante plegada por debajo de 1060 px |
| `.ib-filters`, `.ib-filters-sep` | Fila de filtros y separador vertical |
| `.ibchip`, `.ibchip.on`, `.ibchip .cnt` | Chip de tema con contador (el mismo estado activo que `.seg button.on`) |
| `.msg.ib-opt` | Fila dentro del `listbox` (`position: relative` para la barra); `[aria-selected="true"]` con fondo `--accent-soft` y `::before` de 3 px `--accent-hi`; `:focus-visible` con contorno `--accent-hi` y −2 px |
| `.msg.ib-dec`, `.msg.ib-dec.done` | Fila de decisión con riel ámbar continuo (`::before` hasta `bottom: -1px`); variante resuelta |
| `.msg-ico.dec`, `.msg-ico.done` | Círculo "!" con tinte ámbar; círculo neutro con ✓ |
| `.ib-block-h`, `.ib-block-h.none` | Encabezado "Para decidir · N"; línea "Nada para decidir" |
| `.ib-due`, `.ib-due.short` | Línea de plazo (reloj / "!", `--dim` / `--warn` 700) |
| `.ib-tag`, `.ib-tag.dec` | Chip de acción de la fila; variante "Para decidir" |
| `.ib-more` | "Mostrar N más" al pie, fuera del `listbox` |
| `.ib-empty` | Estado vacío de la lista y de la búsqueda |
| `.ib-rhead`, `.ib-date`, `.ib-state` | Encabezado de lectura, fecha, chip "Sin leer" / "✓ Resuelto" / "Para decidir" |
| `.ib-h` | Título de lectura (19,6 px; 17,5 px en el celular) |
| `.ib-ents` | Retícula de tarjetas de entidad |
| `.ib-who-m` | Línea de datos de la tarjeta |
| `.ib-kpis`, `.ib-kpi`, `.ib-kpi.key`, `.ib-kpi-l`, `.ib-kpi-v`, `.ib-kpi-s` | Cifras clave |
| `.ib-cmp` | Tabla de comparación de la oferta de trabajo |
| `.ib-facts` | Líneas de plazo y hechos con viñeta |
| `.ib-conseq` | Caja de consecuencias de la oferta de trabajo |
| `.ib-quotes` | Preguntas de prensa |
| `.ib-score`, `.ib-res` | Marcador del resultado y resultado en palabras |
| `.ib-acts` | Fila de acciones con separador; el peligro va con `margin-left: auto` |
| `.ib-help` | Ayuda o motivo debajo de los botones |
| `.btn.danger.strong` | Botón "Confirmar rechazo" |
| `.ib-confirm` | Caja de confirmación en el lugar |
| `.ib-result`, `.ib-result.warn`, `.ib-result.err` | Nota F7 (riel, ícono, texto; sin fondo) |
| `.ib-gone` | Texto de decisión vencida o respondida |
| `.ib-detail`, `.ib-dhead` | Vista de detalle (≤ 900 px) y su cabecera con volver y ‹ › |
| `.ib-actbar` | Barra de acciones fija (≤ 900 px); su `bottom` depende de que haya o no navegación inferior |
| `.vh` | Texto oculto visualmente (si no existe ya) para el `h2` con la búsqueda abierta en el celular y la región `aria-live` |

**Media queries**

| Ancho | Cambios |
|-------|---------|
| Hasta 1060 px | `.ib-search` plegado; `.ib-filters` con desplazamiento lateral de los chips |
| Hasta 900 px | `.inbox` en una columna; lista o detalle; chevrons en las filas; `.ib-actbar` visible |
| Hasta 760 px | Alturas de 44 px en controles; `.ib-actbar` con `bottom` sobre la navegación inferior; `h2` "Bandeja" |

---

## 12. Riesgos y temas abiertos

- Hay 21 pares de color marcados **medir** en 8.2 (14 de texto y 7 de no texto). Ninguno está cerca del límite según la estimación (el más justo es el número 33, la barra elegida, ≈ 5 contra 3), pero no se dan por buenos hasta medirlos.
- **Tamaños globales por debajo de 11 px fuera de la bandeja**: `.chip` (10,6 px), `.pill` (9,8 px), `.nav .dot` y `.tn-count` (9,5 y 8,4 px), `.pdot` (9,8 px) y `.btn.sm` (11,5 px). La bandeja los sube dentro de su ámbito, pero el arreglo de fondo es global y no es parte de esta pantalla.
- **CTA con corte en diagonal**: el estilo acordado lo menciona, pero el bloque portal lo anula (`.btn.cta { clip-path: none }`) y la captura muestra Continuar sin corte. La bandeja no usa el CTA, así que no la afecta; queda anotado para revisar el estilo.
- `.btn.on` (botones alternables, como "Seguir") hoy usa el acento al 22 % sobre `--panel2`, que no está medido. En la bandeja se usa el estado de la decisión 2; llevarlo a todas las pantallas sería coherente, pero es una decisión global que va más allá de esta pantalla.
