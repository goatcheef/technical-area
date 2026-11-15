# Diseño visual: Mercado de pases

> **Fase**: 2 de /team-ui (diseño visual)
> **Autor**: art-director
> **Fecha**: 2026-11-15
> **Entrada**: `design/ux/mercado.md` (secciones 5, 6, 10, 12 y 15), `production/ui/bandeja/visual-design.md` (aprobado e implementado), bloques "portal" y "bandeja" de `src/styles.css`, `src/ui/Inbox.tsx`, `src/ui/msg.tsx`, `src/ui/PlayerTable.tsx`, `src/ui/Market.tsx`, banda de `src/ui/PlayerPage.tsx`, `src/ui/Tactics.tsx`, `src/ui/common.tsx` (`clubTheme`, `Val`, `money`, `dec`).
> **Capturas del punto de partida**: `production/ui/mercado/ref/` (Playwright, `deviceScaleFactor` 1, Independiente, 10 ene 2026, con una oferta inyectada): Mercado en sus cinco pestañas a 1440 px, Buscar con casillas marcadas, comparador, Buscar a 1024 y 390 px, ofertas a 390 px, ficha de un ajeno en Contrato y mercado, bandeja con la oferta elegida a 1440 y 390 px, Inicio y Tácticas.
> **Contraste**: `production/ui/mercado/contraste.mjs` (adaptado de `production/ui/bandeja/contraste-diseno.mjs`; misma regla de acento que `clubTheme` y `tools/check-contrast.mjs`). Todas las cifras de la sección 9.2 son **medidas**, no estimadas. `node tools/check-contrast.mjs`: 0 fallas.
> **No hay art bible**: la fuente es el estilo portal y el diseño visual de la bandeja. Todo lo que la bandeja ya decidió se da por cerrado y no se repite salvo para decir dónde se usa: sin mayúsculas, `--sel` para selección y foco, `--accent-hi` para lo activo, peligro bordeado con texto `--danger`, `--warn` reservado, `--faint` nunca en filas elegidas ni sobre `--panel3`, nota F7 sin fondo, confirmación F6 en el lugar.
> **Este documento no escribe código.** La lista de clases para la fase 3 está en la sección 11.

---

## 0. Decisiones de este documento

Cada una se puede revertir sin tocar el resto. Las que conviene que el usuario mire primero llevan **(para el usuario)**.

1. **Franja de estado neutra en lugar del "hero" con degradé del club.** El encabezado de hoy (captura `mercado-buscar-1440.png`) ocupa 110 px a 1440 y 230 px a 390, y repite tres cifras en 26 px con el degradé del club. Se reemplaza por un título `h2` y una `.card` de unos 76 px con cuatro celdas (Libro, Libre para ofertar, Caja, Sueldos / tope). El degradé del club queda para la banda de la ficha (decisión que ya tomó la bandeja: "el color del club significa estás en una ficha"). El estado del libro lleva ícono de forma distinta en cada estado (✓, !, candado) y la palabra; ámbar solo con 7 días o menos.
2. **Una sola anatomía de trato en todo el juego** **(para el usuario)**. `OfferDecision` y `DealDecision` se dibujan con las mismas piezas en la bandeja, en Tratos y en el `BidBox`: plazo (`.ib-due`), tarjetas de entidad (`.ib-who`), cifras (`.ib-kpis`), hechos (`.ib-facts`), impacto (`.mk-impact`, nuevo, una tabla de antes → después), acciones (`.ib-acts`), ayuda (`.ib-help`), confirmación (`.ib-confirm`) y nota (`.ib-result`). Lo único que cambia es la escala: en Tratos se usa la escala compacta que la bandeja ya usa en su detalle de 900 px o menos (cifras de 16,8 px, tarjetas de entidad en una fila). Así "la oferta de Racing" se ve igual en la bandeja y en el Mercado, como pide la especificación. Alternativa descartada: tarjetas de Tratos con las cifras en una línea de texto (como el wireframe 5.1); era más bajo, pero tenía otra forma que la misma decisión en la bandeja.
3. **El color en el Mercado tiene cuatro usos y nada más.** (a) Acento del club: lo elegido (fondo `--accent-soft`, marca `--sel`) y el primario. (b) Ámbar `--warn`: decisión que espera tu respuesta (riel y encabezado de grupo), plazo corto (hoy, mañana; el libro con 7 días o menos) y el ícono "!" de un aviso con costo. Nunca un fondo grande ni un texto largo. (c) `--bad`: un límite roto (caja negativa, resultado negativo, masa sobre el tope), siempre con signo "−" o "!" y palabras, y solo sobre `--panel`. (d) `--good`: el ícono ✓ de "entra", "Abierto", "Firmado". **Las cifras no se pintan por dirección** (sube / baja): el impacto se lee con "→", el signo y "entra / puede no entrar / no entra". Hoy Finanzas pinta todos los ingresos de verde y todos los egresos de rojo (captura `mercado-finanzas-1440.png`); deja de hacerlo.
4. **En la tabla, "elegido" y "marcado" dejan de parecerse** **(para el usuario)**. Hoy una fila marcada con la casilla toma `--accent-soft` (`.ptable tr.selrow`), el mismo fondo que tendrá la fila elegida para el panel. En el Mercado la fila elegida lleva `--accent-soft`, riel de 3 px `--sel` a la izquierda y nombre en 700 (como la fila elegida de la bandeja); la fila marcada solo lleva la casilla tildada y no cambia de fondo. Además, los encabezados de columna pasan de `--faint` a 10,6 px a `--dim` a 12 px (la especificación prohíbe menos de 12 px en el Mercado).
5. **Un solo primario relleno por decisión, y solo en las decisiones.** Las tarjetas de "Esperando respuesta" y "Para renovar" no llevan botón relleno: "Retirar la oferta" y "Negociar renovación" van como botones comunes **(para el usuario: la especificación llama "primario" a "Negociar renovación"; acá es el primero en el orden y recibe el foco, pero sin relleno)**. Con tres o cuatro renovaciones en columna, tres o cuatro botones rojos (en Independiente) competirían con los de "Para responder", que son los que vencen. La paciencia del representante es una palabra neutra; solo "poca" suma el "!" de aviso. Lo comprometido del presupuesto se dibuja rayado en el medidor (forma, no solo color).

---

## 1. Principios visuales de la pantalla

- **La franja manda.** Libro y plata se leen primero, en el mismo lugar en las cinco pestañas, con la misma forma. Nada debajo compite con ella en tamaño: el resto de los números grandes viven dentro de tarjetas.
- **Ámbar = te toca a vos.** "Para responder" y "Para cerrar" tienen riel y encabezado ámbar; "Esperando respuesta" es neutro, porque no hay nada que hacer. Es la regla de la bandeja aplicada a los grupos de Tratos.
- **Rango = gris, exacto = blanco.** Lo que el DT no conoce del todo se escribe con guion de rango ("62–74", "4,9–8,6 mil") en `--dim` 500 y lleva "(estimado)" en texto; lo exacto (valor, pedido, cláusula, lo que dice el club o el representante) va en `--text` 700. La forma (guion y palabra) es la marca; el tono la refuerza.
- **El trato es el mismo objeto en todas partes.** Bandeja, Tratos, panel, ficha y negociación usan las mismas piezas (decisión 2). Si se aprende a leer una, se leen todas.
- **Nada se mueve bajo el puntero.** Elegir un jugador o un trato no cambia la altura de nada de lo que está arriba del cursor; el panel no salta; la confirmación F6 reemplaza al botón en su lugar.

---

## 2. Tokens

### 2.1 Existentes que usa la pantalla

Los del bloque portal (`--panel` #1b1e36, `--panel2` #23274a, `--panel3` #2b3056, `--line` #363c66, `--line2` #2a2e50, `--text` #f1f2fa, `--dim` #a3a8c8, `--danger` #ff8a95, `--sel`) y los del bloque base (`--warn` #ffb547, `--good` #3ddc97, `--bad` #ff5d6c, `--info` #5aa9ff; en `.cvd`: #f3d34a, #4aa3ff, #f08c3a). De `clubTheme`: `--accent`, `--accent-ink`, `--accent-soft`, `--accent-hi`, `--sel`.

| Token | Uso en el Mercado |
|-------|-------------------|
| `--panel` | Franja, tarjetas de Tratos, panel del jugador, tablas, ventana de negociación |
| `--panel2` | Cajas de cifras, tarjetas de entidad, tabla de impacto, encabezados de grupo neutros, botones comunes, hover de fila, chips |
| `--panel3` | Pista de los medidores y del conocimiento, contador neutro de pestaña, chip de rango de `Val`. **Sin `--faint` ni `--dim` en texto de 12 px encima** (`--dim` sobre `--panel3` da 5,42: pasa, pero no se usa para texto chico) |
| `--accent-soft` compuesto sobre `--panel` | Fila elegida, tarjeta de trato elegida, pestaña activa, fila propia de Movimientos |
| `--accent-hi` | Borde de la pestaña activa, relleno de medidores y de la barra de conocimiento, rayado de lo comprometido |
| `--sel` | Riel de 3 px de la fila elegida, riel de 6 px y contorno de 1 px de la tarjeta elegida, todos los anillos de foco |
| `--warn` | Riel de los grupos con decisiones, ícono "!", contador de Tratos, plazo corto en texto |
| `--good` | Ícono ✓ (libro abierto, "entra", firmado), riel de "Hay acuerdo", ícono ⇄ de un pase cerrado |
| `--bad` | Texto de caja y resultado negativos (con "−"), texto de la nota de error |
| `--danger` | Texto y borde de los botones de peligro, ícono ✗ (no entra, bloqueado, se cayó) |
| #12152b | Campos de monto (oferta, cargo, mejora, sueldo, prima, cláusula) |
| #0a0c1b | Fondo de página, bajo las pestañas y las descripciones de grupo |

### 2.2 Nuevos

**Ningún token de color nuevo.** Todo lo nuevo se arma con los existentes y `color-mix` en la regla que lo usa, como pide la bandeja para que siga a `.cvd`:

| Mezcla | Dónde | Definición |
|--------|-------|-----------|
| Tinte de grupo con decisiones | `.mk-gh.dec` | `color-mix(in srgb, var(--warn) 10%, var(--panel))` (el mismo de `.ib-block-h`) |
| Tinte de chip de decisión | `.mk-st.dec` en la tabla y el historial | `color-mix(in srgb, var(--warn) 13%, var(--panel2))` (el mismo de `.ib-tag.dec`) |
| Círculo del "!" del libro | `.mk-book-ico.soon` | `color-mix(in srgb, var(--warn) 12%, var(--panel))` y borde al 50 % (el de `.msg-ico.dec`) |
| Rayado de lo comprometido | `.mk-meter .com` | `repeating-linear-gradient(135deg, var(--accent-hi) 0 3px, transparent 3px 6px)` sobre la pista `--panel3`, con borde de 1 px `--accent-hi` |

**Variable de layout** (no de color): `--mk-top`, la altura de lo que queda fijo arriba (barra superior + barra de pantallas), medida en `Market.tsx` como `--ib-bar` en la bandeja; se usa en `scroll-padding-top` y en el `top` y el `max-height` del panel pegajoso (especificación 5.2).

---

## 3. Tipografía, espaciado, radios y elevación

Plus Jakarta Sans, pesos cargados 400 a 800; sin pesos intermedios en clases nuevas (750 en `.btn.danger.strong` y 650 en `.btn` son heredados). Base 14 px. **Nada por debajo de 12 px** (especificación 12).

### 3.1 Escala

| Rol | Clase | Tamaño | Peso | Color |
|-----|-------|--------|------|-------|
| Título de pantalla "Mercado de pases" | `h2` portal | 1,55rem = 21,7 px (celular 1,4rem; texto "Mercado") | 700 | `--text` |
| Rótulo de celda de la franja | `.mk-kpi-l` | 0,86rem = 12 px | 600 | `--dim` |
| Valor de la franja | `.mk-kpi-v` | 1,35rem = 18,9 px (celular 1,2rem = 16,8 px) | 800, tabulares, −0,02em | `--text` |
| Leyenda de la franja ("para pases", "margen…") | `.mk-kpi-s` | 12 px | 500 | `--dim` |
| Plazo del libro ("cierra el 20 feb · quedan 12 días") | `.mk-book-d` | 1rem = 14 px | 600 | `--text`; hoy / mañana `--warn` 700 |
| Pestañas | `.mk-tabs button` | 14 px | 600; activa 700 | `--text` |
| Contador de pestaña | `.mk-cnt`, `.mk-cnt.dec` | 12 px | 800, tabulares | `--text` sobre `--panel3` / #1d1300 sobre `--warn` |
| Rótulo de filtro | `.mk .f` | 12 px (hoy `.f` mide 0,78rem = 10,9 px) | 600 | `--dim` |
| Encabezado de columna | `.mk .ptable th` | 12 px (hoy 0,76rem = 10,6 px en `--faint`) | 600 | `--dim` |
| Celda de tabla | `td` | 14 px | 500; nombre 600 (700 en la elegida) | exacto `--text`, rango `--dim` |
| Chip de estado de trato | `.mk-st` | 12 px | 700 | `--text` / `--dim` |
| Nombre en el panel | `.mk-side-n` | 1,25rem = 17,5 px | 700, −0,02em | `--text` |
| Metadatos del panel | `.mk-side-m` | 12 px | 500 | `--dim` |
| Rótulo y dato del panel | `.mk-dl dt` / `dd` | 12 px 600 `--dim` / 14 px 700 tabulares `--text` (rango: 500 `--dim`) | | |
| Título del `BidBox` | `h3` de tarjeta portal | 1,08rem = 15,1 px | 700 | acento 62 % + blanco |
| Campo de monto | `.mk-amt input` | 1,2rem = 16,8 px | 700, tabulares | `--text` |
| Línea de pista ("Pediría entre…") | `.mk-hint` | 14 px | 500 | `--dim`; montos en 700 `--text` |
| Rótulo / valor del impacto | `.mk-impact th` / `td` | 12 px 600 `--dim` / 14 px 700 tabulares `--text`; el "después" en 800 | | |
| Veredicto del impacto | `.mk-verdict` | 12 px | 700 | `--text` con ícono de color |
| Fecha de respuesta ("Lanús responde entre…") | `.ib-due` (reutilizado) | 14 px en panel y tarjeta | 600 | `--text` |
| Encabezado de grupo de Tratos | `.mk-gh` | 1rem = 14 px | 800 | `--text` |
| Descripción del grupo | `.mk-gh-s` | 12 px | 500 | `--dim` |
| Cabecera de tarjeta ("Contraoferta · vence el 19 ene") | `.mk-card-h` | 14 px; el tipo en 700 | | `--text`; plazo `.ib-due` |
| Fila del historial | `.mk-hist` | fecha 12 px 600 tabulares `--dim`; texto 14 px 500 `--text` | | |
| Medidor: nombre / cifras / leyenda | `.mk-meter` | 14 px 700 / 14 px 700 tabulares / 12 px 500 `--dim` | | |
| Resultado de la temporada | `.mk-bal-res` | 1,35rem = 18,9 px | 800, tabulares | `--text`; negativo `--bad` |
| Título de la negociación | `h2` de `Modal` | 1,4rem = 19,6 px | 700 | `--text` |
| Paciencia | `.mk-pat` | 14 px; la palabra en 700 `--text`, la frase en 500 `--dim` | | |

El resto (cifras `.ib-kpi-*`, hechos, ayuda, nota, confirmación, tarjeta de entidad) usa la escala de la bandeja (su sección 3.1) sin cambios.

### 3.2 Espaciado (escala 4 · 6 · 8 · 12 · 16 · 20 · 24)

| Elemento | Valor |
|----------|-------|
| Hueco entre zonas de la página | 16 px (título → franja 12 px) |
| Franja | padding 14 px 0; celdas con padding 0 20 px y separador vertical 1 px `--line2` |
| Pestañas → filtros / contenido | 12 px |
| Filtros (tarjeta) | padding 12 px 16 px; hueco entre controles 16 px horizontal, 10 px vertical |
| Tabla y panel | hueco 16 px |
| Panel del jugador | padding 16 px 20 px; secciones separadas 16 px; datos → `BidBox` con separador `--line2` y 16 px de cada lado |
| `BidBox` | hueco interno 12 px; bloque de préstamo separado por 1 px `--line2` y 12 px |
| Tarjeta de trato | padding 16 px 20 px; cabecera → entidades 12 · entidades → cifras 12 · cifras → hechos 12 · hechos/impacto → acciones 16 (con separador) |
| Entre tarjetas del mismo grupo | 10 px |
| Entre grupos | 24 px (el encabezado lleva 0 de margen arriba) |
| Fila del historial | 10 px 16 px, alto mínimo 44 px |

### 3.3 Radios

Como la bandeja: tarjetas grandes 14 (`--radius`); tarjetas de entidad, confirmación, nota y caja "Hay acuerdo" 12; cifras, impacto, botones, campos y medidores-caja 10; pestañas 9; chips y encabezados de grupo 8; barras de medidor 5; círculos 99.

### 3.4 Bordes y elevación

- Solo las `.card` llevan sombra (franja, filtros, tabla, panel, tarjetas de trato, medidores, balance). Todo lo que va adentro es plano con borde de 1 px (regla de la bandeja: una tarjeta con sombra dentro de otra parece una ventana).
- Riel de decisión: `::before` de 3 px a la izquierda de la tarjeta, de borde a borde en vertical, recortado por el radio (`overflow: hidden` en la tarjeta **no**: se dibuja con `border-left` de 3 px y el radio izquierdo baja a 10; ver 11). Elegida: 6 px `--sel`.
- Separadores: 1 px `--line2`.

---

## 4. Zonas y componentes en escritorio (1440 × 900)

```
┌ barras N1 y de pantallas (106 px, existentes) ─────────────────────────────────────────────────────────────┐
│ (i) ayuda O2 .pagetip (solo la primera vez)                                                    [Entendido] │
│ Mercado de pases                                                                                  h2 21,7 │
│ ┌ .mk-strip .card ─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ (✓) Libro           │ Libre para ofertar      │ Caja               │ Sueldos / tope                    │ │
│ │     Abierto          │ US$ 2,1 M               │ US$ 3,0 M          │ US$ 410 mil / 480 mil             │ │
│ │     cierra el 20 feb · quedan 12 días │ para pases │ para primas   │ margen US$ 70 mil por mes         │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ [✓ Buscar] [Tratos (!3)] [Seguimiento (6)] [Movimientos] [Presupuesto]                .mk-tabs, 36 px   │
│ ┌ filtros .card ───────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Puesto [Todos▾] Categoría [Todas▾] Val. mín 60 ═●══ Edad máx 40 ════● Precio [Sin límite▾] [Solo…] [Limpiar] │
│ └──────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ [✓ Ojeo][General][Contrato]… [Columnas]  [✓ Todos][Arq]…  [Filtrar por nombre]          37 jugadores    │
│ ┌ tabla .card ──────────────────────────────────────────────┐ ┌ .mk-side (aside, 380, sticky) ────────┐ │
│ │ ☐ Jugador        Pos Club    Edad Val    Conoc Pedido Trato│ │ {cara 52} Juan Pérez    [DC] [62–74]  │ │
│ │▌☐ Juan Pérez     DC  Lanús    24 62–74  35 %  1,4 M  —    │ │ Lanús · Liga Profesional · 24 años     │ │
│ │ ☐ L. Gómez       DC  Banfield 27 70     100 % 1,3 M [!Acordado]│ Conocés el 35 % ▬▬▭▭▭ [Mandar a ojear]│ │
│ │ …                                                          │ │ … datos · BidBox (4.8)                 │ │
│ │ [            Mostrar 100 más            ]                  │ └────────────────────────────────────────┘ │
│ └────────────────────────────────────────────────────────────┘                                           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 ▌ = riel de 3 px --sel de la fila elegida (fondo --accent-soft, nombre en 700)
```

### 4.1 Ayuda de pantalla (O2)

`.pagetip` existente sin cambios de forma (riel `--info`, ícono "i"). Su texto es de 0,88rem = 12,3 px: pasa el mínimo de 12. "Entendido" `.btn.sm`.

### 4.2 Título y franja de estado `.mk-strip`

- `h2` "Mercado de pases" sola en su fila. La región `aria-live="polite"` (cambio de libro, respuestas que llegan) es un `.vh` dentro de la franja.
- `.mk-strip` es una `.card` con `display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.3fr`, padding 14 px 0. Cada celda `.mk-kpi`: columna con hueco de 2 px, padding 0 20 px, separador `border-left: 1px solid var(--line2)` desde la segunda.
- **Celda Libro** `.mk-book`: fila con el círculo de estado (32 px, como `.msg-ico`) a la izquierda y el texto a la derecha.

| Estado | Círculo | Línea 1 (`.mk-kpi-v`) | Línea 2 (`.mk-book-d`) |
|--------|---------|------------------------|------------------------|
| Abierto, más de 7 días | `--panel2`, borde `--line`, ✓ 16 px `--good` | "Abierto" | "cierra el 20 de febrero · quedan 12 días", 14 px 600 `--text` |
| Por cerrar, 2 a 7 días | tinte ámbar (2.2), "!" 16 px `--warn` | "Abierto" | "cierra en 3 días (el 20 de febrero)", 14 px 600 `--text` |
| Cierra mañana / hoy | igual | "Abierto" | "cierra mañana" / "cierra hoy", 14 px **700 `--warn`** |
| Cerrado | `--panel2`, borde `--line`, candado 16 px `--dim` | "Cerrado" | "reabre el 25 de junio · faltan 41 días" / "reabre al comenzar la temporada 2027 (10 ene)", 14 px 600 `--text` |

  Rótulo de la celda "Libro de pases" en `.mk-kpi-l` encima. El estado cerrado es neutro, no de error: sin rojo. Nunca hay elipsis en esta celda: la línea 2 parte en dos renglones si hace falta.
- **Libre para ofertar**: rótulo "Libre para ofertar" (sin tratos abiertos, "Presupuesto"); valor `money()`; leyenda "para pases" o "de US$ 2,1 M · US$ 1,4 M comprometidos en 1 oferta".
- **Caja**: rótulo "Caja", valor, leyenda "para primas". Negativa: valor en `--bad` con "−" y leyenda "en rojo: no podés pagar primas" en `--dim`.
- **Sueldos / tope**: valor "US$ 410 mil / 480 mil" (el tope en 600 `--dim` para que lea primero la masa), leyenda "margen US$ 70 mil por mes". Sobre el tope: leyenda reemplazada por "! pasaste el tope por US$ 12 mil" con el "!" de 14 px en `--warn` y el texto en 700 `--text`.
- Sin barras en la franja: los medidores viven en Presupuesto. La franja se lee en un vistazo con cifras y palabras.
- Alto: unos 76 px (línea 2 del libro en un renglón). Igual en las cinco pestañas.

### 4.3 Pestañas `.mk-tabs`

- Grupo de botones con el estado activo de la decisión 2 de la bandeja (fondo `--accent-soft` compuesto sobre `--panel`, borde `--accent-hi`, ✓ de 12 px, 700, `aria-pressed`). Diferencia con los filtros: **36 px de alto y texto de 14 px** (los filtros y las vistas de la tabla quedan en 32 px y 12 px), porque son el primer nivel de la pantalla; la jerarquía es de tamaño, no de color.
- Contador: "Tratos" lleva `.mk-cnt.dec`, la píldora `.pdot` ámbar (tinta #1d1300, 12 px 800, padding 1 px 8 px) con "!" delante del número ("!3", como la insignia de Inicio) y un `.vh` "decisiones del mercado". "Seguimiento" lleva `.mk-cnt` neutro (`--panel3`, 12 px 800 `--text`, como `.ibchip .cnt`). Sin número, sin píldora (nunca "0"). Los paréntesis de hoy ("Ofertas recibidas (1)") desaparecen.
- Hueco 6 px. Foco: anillo 2 px `--sel` a 2 px, sobre el fondo de página (6,70 mínimo).
- `Seg` hoy recibe `string[]`: para el contador hace falta que acepte `ReactNode` o armar el grupo a mano con las mismas clases (sección 11).

### 4.4 Filtros de Buscar

- `.card` con `display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px 16px`. A 1440 entran en una fila; por debajo de 1100 px, dos.
- Rótulos `.f` a 12 px 600 `--dim` (dentro de `.mk`). Los deslizadores muestran el valor en el rótulo ("Valoración mínima: 60") con el número en 700 `--text`; `accent-color: var(--accent)` como hoy.
- Selects e inputs: 36 px de alto, fondo #12152b, borde `--line`, radio 10, 14 px.
- "Solo transferibles o con contrato por vencer": botón alternable con el estado activo de la decisión 2 (✓, `aria-pressed`), 36 px, 14 px 600. Hoy usa `.btn.on` (acento al 22 %), que no lleva ✓.
- "Limpiar filtros": `.btn.sm` común, empujado al final de la fila (`margin-left: auto`). Solo aparece si hay algún filtro distinto del valor por defecto.

### 4.5 Tabla (`PlayerTable` con `onPick`)

Base: la tabla única de hoy. Cambios dentro de `.mk`:

| Parte | Tratamiento |
|-------|-------------|
| Encabezados | 12 px 600 `--dim` (decisión 4). Flecha de orden en `--accent-hi` (hoy `.acc`, el acento puro, 3,28:1 en el peor club como texto) |
| Fila | alto mínimo 40 px (44 en celular); zebra existente (`rgba(255,255,255,.018)`) |
| Hover | `--panel2` (existente `tr.click:hover`) |
| **Elegida** (`aria-selected="true"`) | fondo `--accent-soft` en todas las celdas (sobre la zebra), `box-shadow: inset 3px 0 0 var(--sel)` en la primera celda, nombre en 700 `--text`. Con el mouse encima no cambia |
| Elegida con foco (foco itinerante) | además, contorno de 2 px `--sel` con −2 px de separación en la fila (`outline` en el `tr`) |
| Foco sin elegir | contorno de 2 px `--sel`, −2 px, sin fondo |
| **Marcada** (casilla) | solo la casilla tildada; sin fondo (`.mk .ptable tr.selrow td { background: none }`; la zebra sigue). Marcada y elegida: los dos tratamientos a la vez |
| Valor exacto | `--text`, cifras tabulares |
| Rango (valoración, atributos, sueldo) | `--dim` 500 con guion de rango (–); el chip de `Val` en rango sigue como hoy (`--panel3`, `--text`, 12,6 px). En la celda de sueldo, un `.vh` "estimado" (la columna ya dice "Sueldo US$") |
| Conocimiento | "35 %" en `--dim` tabulares; mientras se ojea, chip `.mk-st` con reloj de arena y "Ojeando" (hoy texto `.acc`) |
| Contrato por vencer | año en `--warn` como hoy (8,18 sobre hover, 6,71 sobre la elegida) |
| **Columna "Trato"** | chip `.mk-st` (22 px, padding 0 8 px, radio 8, 12 px 700, ícono de 12 px a 4 px del texto): **Esperando** (reloj de arena, `--panel2`, borde `--line`, texto `--dim`); **Contraoferta** ("!" `--warn`, tinte de decisión, texto `--text`); **Acordado** (✓ `--good`, tinte de decisión, texto `--text`); **Sin acuerdo** (✗ `--danger`, neutro, `--dim`); **Bloqueado hasta 24 ene** (candado `--dim`, neutro, `--dim`); sin trato, "–" `--dim`. Solo los dos que son decisiones llevan tinte ámbar |
| Escudos | 18 px como hoy |

**"Mostrar 100 más"** `.mk-more`: `.btn.sm` a todo el ancho de la tarjeta, margen 8 px 12 px 12 px, 36 px de alto; fuera de la tabla.

**Región "37 jugadores."**: el contador que ya existe a la derecha de la barra de la tabla (12 px `--dim`) pasa a ser la región `aria-live`.

### 4.6 Barra de acciones masivas

`.bulkbar` existente (sticky, `--panel2`, borde de acento). Dentro de `.mk`: botones `.btn.sm` a 12 px y 32 px; la nota de resultado deja `.acc` y pasa a `--text` 600 con el ✓ de 12 px en `--good`. "Comparar" sigue siendo el único primario de la barra.

### 4.7 Panel del jugador `.mk-side`

`aside.card`, 380 px, `position: sticky; top: 12px`, `max-height: calc(100vh − var(--mk-top) − 24px)`, `overflow-y: auto`, `scrollbar-width: thin`, padding 16 px 20 px. Los botones de oferta quedan al final del contenido (nunca en barra fija).

**Sin elegir** `.mk-side.none`: alto mínimo 260 px; ícono de mercado (⇄) en un círculo `.msg-ico` de 40 px en `--dim`, y el texto de la especificación en 14 px 500 `--dim`, máximo 36ch, alineado a la izquierda. Las teclas van en `<kbd>`: 12 px 700 `--text`, fondo `--panel2`, borde `--line`, radio 6, padding 1 px 6 px.

**Elegido** (de arriba abajo):

1. **Cabecera** `.mk-side-h`: `Face` de 52 px; a su derecha el nombre (17,5 px 700, enlace a la ficha: subrayado al pasar el mouse, foco `--sel`), y en la misma fila, empujados a la derecha, `PosPill` y `Val`. Debajo, `.mk-side-m` 12 px `--dim`: "Lanús · Liga Profesional · 24 años" con el escudo de 16 px delante del club (`data-cid`).
2. **Conocimiento** `.mk-know`: fila con "Conocés el 35 %" (14 px 600 `--text`), una barra de 60 × 6 px (pista `--panel3`, relleno `--accent-hi`, 4,35 mínimo) y "Mandar a ojear" `.btn.sm` a la derecha. Debajo, 12 px `--dim`: "Lo conocerías del todo en unos 15 días." Variantes: ojeándolo ("Ojeándolo…" deshabilitado + "Lo van a conocer del todo en unos 9 días"); el libro cierra antes (la misma línea con el ícono "i" de información en `--dim`, no ámbar: es un dato, no un costo); ojeo lleno ("Ya ojeás a 10: al sumarlo se deja de ojear a {nombre}.", con "i").
3. **Datos** `.mk-dl`: lista de dos columnas (rótulo 12 px 600 `--dim` a la izquierda, 120 px; dato a la derecha, 14 px). Orden: Pedido (exacto, 700 `--text`), Valor (exacto), Sueldo ("US$ 4,9–8,6 mil por mes" en 500 `--dim` + " (estimado)" en 12 px `--dim`; exacto desde 95 %, en 700 `--text` y sin la palabra), Contrato ("dic 2027"), Cláusula (exacta, si hay), Potencial ("Desconocido" en 500 `--dim` hasta 70 %), Personalidad ("desconocida"). Filas de 28 px, sin separadores.
4. **Acciones de lectura** `.mk-side-acts`: "Ver la ficha", "Seguir" (alternable con ✓ cuando está activo, decisión 2) y "Comparar", `.btn.sm`, hueco 8 px.
5. Separador `--line2` y el **`BidBox`** (4.8).

**Jugador ya no disponible**: el bloque 1 queda con `Face` y nombre en `--dim`; en lugar de lo demás, `.ib-who.gone` (borde discontinuo) con "Ya no está disponible."

**Firmado**: nota F7 de éxito y, en lugar del `BidBox`, "Ya es tuyo" (14 px 700) con "Ver la ficha" como primario.

### 4.8 `BidBox` (panel y ficha › Contrato y mercado)

Contenedor `.mk-bid`: columna, hueco 12 px. Título `h3` de tarjeta portal: "Ofertar por Juan Pérez" (en la ficha va como título de su `.card`).

#### a. Formulario (sin trato abierto)

```
Ofertar por Juan Pérez                          ← h3 en color
Oferta (US$)                                    ← .f 12 px
[ 1.400.000                              ]      ← 44 px, 16,8 px 700, #12152b
Pediría entre US$ 5,7 y 9,9 mil por mes.        ← .mk-hint 14 px
(i) Lo conocés al 35 %: su valoración real puede estar en cualquier punto del rango.
┌ Si el club acepta y firma ──────────────────┐ ← .mk-impact (4.9)
│ Libre para ofertar   2,1 M → 0,7 M   ✓ entra │
│ Caja                 3,0 M → 1,6 M           │
│ Sueldos por mes      410 → 416–420 mil       │
│                      tope 480 mil  ✓ entra   │
│ Plantel              27 → 28                 │
└──────────────────────────────────────────────┘
⧗ Lanús responde entre el 12 y el 14 ene.       ← .ib-due 14 px
[████████████ Ofertar compra ████████████]      ← primario a todo el ancho, 40 px
─────────────────────────────────────────────
Préstamo hasta fin de temporada                 ← 14 px 700
Cargo (US$) [ 80.000 ]                          ← campo de 36 px
Seguiría cobrando entre US$ 4,9 y 8,6 mil por mes.
[ Pedir préstamo ]                              ← común
Ofertas abiertas: 0 de 5.                       ← 12 px --dim
{nota F7}
```

- **Campo de monto** `.mk-amt`: rótulo arriba; `input` de 44 px de alto (40 en el préstamo), fondo #12152b, borde `--line`, radio 10, 16,8 px 700 tabulares, `inputmode="numeric"`; los miles con punto al salir del campo. Foco: 2 px `--sel` a 2 px (6,20 mínimo sobre #12152b).
- **Avisos dentro del `BidBox`** `.mk-note`: fila con ícono de 16 px y texto de 14 px. Dos tipos y nada más:
  - **Información** (ícono "i" en círculo, `--dim`; texto `--dim`): "Lo conocés al 35 %…", "El libro cierra antes: lo vas a conocer a medias".
  - **Aviso con costo** (ícono "!" en círculo, `--warn`; texto `--text`): "Si pide lo que estimás (US$ 5,7–9,9 mil), puede que no entre en tu tope…", "Banfield está molesto: …", "Si Lanús contesta después del 20 feb, la oferta caduca".
  - Ninguno lleva fondo; van alineados al texto del `BidBox`.
- **Botón primario** "Ofertar compra": `.btn.primary` a todo el ancho del panel (en la ficha, ancho natural), 40 px. "Pedir préstamo": `.btn` común, ancho natural.
- **Deshabilitado con motivo** (`bidCheck`, libro cerrado, último día, plantel lleno, 5 ofertas abiertas, monto sin cubrir, a préstamo en su club): opacidad 0,4 en el botón y el motivo en `.ib-help` (12 px 500 `--dim`) justo debajo, con `aria-describedby`. Si el motivo es una prohibición (bloqueo, a préstamo en su club), lleva delante el ✗ de 12 px en `--danger`; si es una condición de calendario o de plata, ningún ícono. "Escribí un monto" con el campo vacío.
- **Contador** "Ofertas abiertas: 3 de 5." 12 px 500 `--dim`; con 5, "Ya tenés 5 ofertas abiertas…" en `.ib-help` bajo los dos botones. Sin puntos ni barras de 5 (así no se confunde con ningún indicador de paciencia).
- **Avance en curso**: todos los botones deshabilitados y una sola línea `.ib-help` "Frená el avance para decidir." arriba del primario.

#### b. Variantes con un trato abierto

El formulario se reemplaza por un bloque `.mk-deal` con la anatomía de la decisión (decisión 2): una cabecera de estado, las líneas de hechos y las acciones. La cabecera es una fila `.mk-deal-h` con el ícono de estado de 16 px y la frase en 14 px; el bloque entero lleva el mismo riel que tendría su tarjeta en Tratos (`border-left: 3px`, padding izquierdo 12 px).

| Variante | Riel | Ícono · cabecera | Cuerpo | Acciones |
|----------|------|------------------|--------|----------|
| **Esperando respuesta** | `--line` (neutro) | reloj de arena `--dim` · "Esperando respuesta de Lanús" 700 `--text` | `.ib-facts`: "Ofertaste US$ 1,4 M el 11 ene."; `.ib-due` "Responde entre el 12 y el 14 ene."; "US$ 1,4 M comprometidos de tu presupuesto."; si el rango pasa del cierre, `.mk-note` de aviso | "Retirar la oferta" (común). Debajo, `.ib-help`: "Para cambiar el monto, retirala y ofertá de nuevo: la espera vuelve a empezar." |
| **Contraoferta** | `--warn` | "!" `--warn` · "Contraoferta" 700 + `.ib-due` "vence el 19 ene" (corto: hoy / mañana en `--warn` 700) | "Lanús no aceptó US$ 1,4 M." y "Pide **US$ 1,6 M** (+14 %)." (la cifra en 800 `--text`); impacto con US$ 1,6 M; bloque Mejorar (abajo) | "Aceptar US$ 1,6 M" (primario), "Retirar la oferta" (común) |
| **Acordado (compra)** | `--warn` | ✓ `--good` · "Acordado con Lanús" 700 + "vence el 19 ene" | "US$ 1,4 M. Falta el contrato con el jugador."; sueldo que pide (exacto si ya abrió la mesa) o el rango; paciencia (solo con `deal.neg`, 4.16); `.mk-note` de aviso con el costo de cancelar | "Negociar contrato" / "Seguir negociando" (primario), "Cancelar el trato" (común; su F6 en peligro) |
| **Acordado (préstamo)** | `--warn` | ✓ `--good` · "Préstamo acordado con Tigre" + plazo | cargo, sueldo (rango con "(estimado)" por debajo de 95 %), "hasta fin de temporada", impacto, aviso de costo | "Confirmar el préstamo" (primario, F6), "Cancelar el trato" (común, F6) |
| **Bloqueado** | `--line` | ✗ `--danger` · "Su representante cortó la negociación el 10 ene." / "Cancelaste el trato por él el 12 ene." / "Dejaste vencer el acuerdo por él el 18 ene." | "No podés volver a ofertar por él hasta el **24 ene**." (fecha en 700 `--text`) | El formulario abajo, deshabilitado (opacidad 0,4) y sin repetir el motivo |
| **Segunda oferta / desde el comparador** | — | — | "Ya tenés una oferta por él: esperando respuesta de Lanús." en `.ib-facts` con reloj de arena | "Ver en Tratos" (común) |

**Bloque Mejorar** `.mk-improve` (contraoferta, en el `BidBox`, en Tratos y en la bandeja): rótulo "Mejorar la oferta" (12 px 600 `--dim`); fila con el campo (36 px, crece) y "Ofertar" (`.btn` común, 36 px) a 8 px; debajo, 12 px `--dim`: "Si mejorás, Lanús vuelve a responder en 1 a 3 días."; los avisos ("! El libro cierra el 20 feb: si Lanús contesta después, la mejora caduca", "Con US$ 1,6 M ya es aceptar su pedido: usá Aceptar") como `.mk-note`; el último día del libro, el campo y "Ofertar" deshabilitados con el motivo en `.ib-help`. Caja `--panel2`, borde `--line2`, radio 10, padding 10 px 12 px, para que se lea como un formulario aparte del primario. En la bandeja de 900 px o menos lleva `scroll-margin-bottom: calc(var(--ib-bar) + 12px)` (especificación, pregunta 39).

### 4.9 Impacto antes → después `.mk-impact` (`DealImpact`)

Componente nuevo y el mismo en el `BidBox`, las tarjetas de Tratos, la lectura de la bandeja y la negociación.

- Caja `--panel2`, borde 1 px `--line2`, radio 10, padding 4 px 12 px. Título opcional arriba de la caja en 12 px 600 `--dim` ("Si el club acepta y firma", "Si lo vendés", "Si aceptás", "Con estos términos").
- `table` de tres columnas: rótulo (`th`, 12 px 600 `--dim`, izquierda), "antes → después" (`td`, 14 px tabulares; el antes en 500 `--dim`, la flecha SVG de 14 px en `--dim` con `.vh` "pasa a", el después en 800 `--text`), veredicto (derecha). Filas de 30 px separadas por `--line2`.
- **Veredicto** `.mk-verdict` (12 px 700 `--text`, ícono de 14 px a la izquierda): "entra" (✓ `--good`), "puede no entrar" ("!" `--warn`), "no entra" (✗ `--danger`). Solo en las filas que tienen un límite (Libre para ofertar, Sueldos / tope). El tope va como segunda línea de la fila de sueldos: "tope 480 mil" en 12 px `--dim`.
- **Rango**: "410 mil → 416–420 mil" con el después en `--dim` 600 (rango) en lugar de 800 `--text`, y "(estimado)" en 12 px.
- **Los números no se colorean.** Sube o baja lo dicen el signo y la flecha; si cabe o no, la palabra.
- En pantallas de 360 px la tabla no se desplaza de costado: el veredicto baja a una segunda línea bajo el "después".

### 4.10 Avisos, confirmación, nota de resultado y "Siguiente"

Sin cambios respecto de la bandeja (su 4.14), con las variantes que pide el Mercado:

| Acción | Confirmación F6 (`.ib-confirm` en el lugar del botón) |
|--------|----------------------------------------------------|
| Aceptar una oferta por tu jugador | "Confirmar: vender a Juan Pérez a Racing por US$ 2,4 M" (`.btn.primary`, ajusta en dos líneas) · "No" |
| Rechazar | "Confirmar rechazo" (`.btn.danger.strong`) · "No" |
| Fichar (negociación) | "Confirmar: fichar a Juan Pérez, US$ 1,4 M + prima US$ 15 mil" (primario) · "Seguir negociando" |
| Confirmar el préstamo | "Confirmar: F. Leiva llega a préstamo hasta fin de temporada, cargo US$ 60 mil, cobra entre US$ 5,1 y 6,9 mil por mes" (primario) · "No" |
| Cancelar el trato | "Confirmar: cancelar el trato por L. Gómez. No vas a poder ofertar por él hasta el 26 ene y Banfield va a pedir un 10 % más por sus jugadores hasta esa fecha." (`.btn.danger.strong`, ajusta hasta en cuatro líneas en celular) · "No" |

Nota F7 `.ib-result`: éxito (✓ `--good`: "Oferta enviada a Lanús. Responde entre el 12 y el 14 ene.", "Firmó…"), advertencia ("!" `--warn`: "Racing se retiró de la negociación."), error (✗ `--bad` y texto `--bad`: ruptura del representante, guardado fallido). La ruptura usa la variante de error porque cuesta 14 días, pero el texto dice el motivo y la fecha. "Siguiente para responder ›" como en la bandeja ("Siguiente pendiente").

### 4.11 Tratos

Columna de hasta 960 px, alineada a la izquierda (no centrada: la franja y las pestañas empiezan en el mismo borde).

#### Encabezado de grupo `.mk-gh`

Fila de 36 px como `.ib-block-h`: padding 6 px 12 px, radio 8, ícono de 16 px, título 14 px 800, número en píldora, y la descripción `.mk-gh-s` (12 px 500 `--dim`) a la derecha del título en la misma fila (debajo por debajo de 900 px). Margen inferior 10 px.

| Grupo | Fondo y borde | Ícono | Número |
|-------|---------------|-------|--------|
| Para responder | tinte ámbar al 10 %, borde ámbar al 35 % | "!" en círculo `--warn` | `.pdot` ámbar |
| Para cerrar | igual | "!" en círculo `--warn` | `.pdot` ámbar |
| Esperando respuesta | `--panel2`, sin borde | reloj de arena `--dim` | `.mk-cnt` neutro |
| Para renovar | `--panel2` | renovar (flechas en círculo) `--dim` | `.mk-cnt` neutro |
| Historial | `--panel2` | reloj `--dim` | ninguno; a la derecha "Mostrar 20 más" `.btn.sm` |

El enlace "Ver tus transferibles y quienes quieren irse ▸" va debajo del encabezado de "Para responder", alineado a la izquierda, como `.btn.sm` común con el chevron de 16 px (no como texto subrayado: es una salida a otra pantalla y necesita su área de 32 px).

#### Tarjeta de trato `.mk-card`

`.card` con `role="group"`, padding 16 px 20px, y la anatomía de la decisión 2 en escala compacta:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
▌ (!) Oferta por tu jugador · ◷ Vence en 3 días · el 18 nov                    [✓ Resuelto]    │ ← .mk-card-h
▌ [{cara 40} Juan Pérez  DC 74 · Titular · 18 PJ     ›] [{escudo 32} Racing Club · LPF · 4.º ›] │ ← .ib-ents compactas
▌ ┌Oferta────┐┌Valor───┐┌Diferencia───┐┌Sueldo que liberás┐                                     │
▌ │US$ 2,4 M ││US$ 2,0 M││+20 %        ││US$ 18 mil        │   ┌ Si lo vendés ──────────────┐  │
▌ └──────────┘└────────┘└sobre su valor┘└por mes───────────┘   │ Caja      3,0 → 5,4 M      │  │
▌ • También ofertó Boca: US$ 2,1 M. Si aceptás una, la otra se │ Presup.   +1,44 M (60 %)   │  │
▌   cancela.                                                   │ Sueldos   −18 mil          │  │
▌ • Si lo vendés te quedan 2 delanteros centro.                │ Plantel   27 → 26          │  │
▌                                                              └────────────────────────────┘  │
▌ ─────────────────────────────────────────────────────────────────────────────────────────── │
▌ [Aceptar] [Pedir más]  Ver la ficha                                              [Rechazar]  │
▌ Pedir más: el club puede mejorar 15 % o retirarse.                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Riel**: `border-left: 3px solid var(--warn)` en "Para responder" y "Para cerrar"; sin riel (borde normal) en los grupos neutros. Elegida: riel de 6 px `--sel`, contorno `inset 0 0 0 1px var(--sel)`, fondo `--accent-soft` compuesto sobre `--panel`. Igual que la decisión elegida de la bandeja (forma, peso y color: AV-13). Hover sobre el cuerpo de una tarjeta no elegida: borde `#343a62` (el hover de `.card`); el cursor es de puntero solo en el cuerpo, no en los controles.
- **Cabecera** `.mk-card-h`: ícono de estado de 16 px, tipo en 14 px 700 `--text` ("Oferta por tu jugador", "Contraoferta", "Acuerdo para cerrar", "Préstamo para confirmar"), " · " y el plazo `.ib-due` en 14 px (reloj; corto con "!" y `--warn` 700). A la derecha, si corresponde, chips de 12 px: "Mejorada 1 vez" (neutro), "Exterior" (neutro), "✓ Resuelto" (`.ib-state`). El título de la tarjeta (`tabindex="-1"`, recibe el foco por programa) es esta cabecera; sin anillo, como `.ib-h`.
- **Entidades**: `.ib-who` con alto mínimo 52 px, cara de 40 px y escudo de 32 px (la escala del detalle angosto de la bandeja), en dos columnas.
- **Cuerpo** (≥ 1100 px): dos columnas `minmax(0, 1fr) 340px` con hueco 16 px: a la izquierda cifras (`.ib-kpis` compactas: padding 8 px 10 px, valor 1,2rem; la cifra clave 1,35rem) y hechos; a la derecha `.mk-impact`. Por debajo de 1100 px, una columna: cifras, hechos, impacto.
- **Acciones**: `.ib-actwrap` con su separador; orden primario → comunes → enlaces de lectura → peligro al extremo derecho. "Ver la ficha" y "Ver todos los tratos" son `.btn` comunes (no texto suelto) para que tengan su área.
- **Sin acción posible** (vencida o respondida en otro lado): `.ib-gone` en lugar de la fila.

**Por plantilla** (especificación 5.3; lo que no se dice es como arriba):

| Plantilla | Ícono de estado | Cifras (clave en negrita) | Hechos | Acciones |
|-----------|-----------------|---------------------------|--------|----------|
| Oferta por tu jugador | "!" `--warn` | **Oferta** · Valor · Diferencia ("+20 %" / "sobre su valor") · Tu pedido estimado · Sueldo que liberás | otras ofertas por él; quedan N en su puesto; "Se va al exterior y no vuelve al fútbol argentino" | Aceptar (primario) · Pedir más · Ver la ficha · · · Rechazar (peligro); ayuda de Pedir más siempre visible |
| Contraoferta | "!" `--warn` | Tu oferta · **Pide** ("+33 %") · Pedido público · Libre para ofertar | "Si mejorás, Vélez vuelve a responder en 1 a 3 días"; "Si no respondés, vence el 19 ene" | Aceptar US$ X (primario) · bloque Mejorar (en el cuerpo, debajo de los hechos) · Ver la ficha · Retirar la oferta (común, último) |
| Acuerdo para cerrar (compra) | ✓ `--good` | **Acordado** · Pedido original · Sueldo que pide (o rango estimado) · Prima (si la pidió) | "El club ya aceptó; falta el contrato con L. Gómez."; paciencia si hay mesa; aviso de costo como `.mk-note` | Negociar contrato / Seguir negociando (primario) · Ver la ficha · Cancelar el trato (común, último; F6 en peligro) |
| Préstamo para confirmar | ✓ `--good` | **Cargo** · Sueldo que se suma (rango "estimado" bajo 95 %) · Hasta fin de temporada | aviso de costo | Confirmar el préstamo (primario, F6) · Cancelar el trato |

"Retirar la oferta" y "Cancelar el trato" van como **comunes** (no peligro), al final de la fila: retirar no tiene costo y cancelar ya lleva su F6 en peligro. Así el único botón rojizo de la fila es el que confirma algo caro.

**Tarjeta de "Esperando respuesta"** `.mk-card.wait`: más baja (unos 92 px). Cabecera con reloj de arena `--dim` y "Responde entre el 12 y el 14 ene" (14 px 700 `--text`); si el rango pasa del cierre, un segundo segmento " · ! el libro cierra el 20 feb" con el "!" `--warn`. Debajo, una línea de 14 px: cara de 24 px, nombre (700, enlace), `PosPill`, `Val`, "· Lanús · ofertaste US$ 1,4 M el 11 ene (compra) · comprometido 1,4 M" en `--dim`. Acciones en la misma fila a la derecha (≥ 900 px) o debajo: "Retirar la oferta", "Ver la ficha", ambos `.btn.sm`. Sin riel, sin primario.

**Fila de "Para renovar"** `.mk-renew`: `.card` de una línea (alto mínimo 56 px, padding 10 px 16 px), grilla `40px minmax(0,1fr) auto auto auto`: cara de 32 px; nombre (14 px 700) + `PosPill` + `Ovr` y debajo "Titular · conformidad 62" en 12 px `--dim` (con `Cond` de 40 px, número siempre visible); "dic 2026" (14 px 600 `--text`); "US$ 9 mil/mes" `--dim`; "Negociar renovación" `.btn.sm` común (decisión 5). Con `negBlock`: botón deshabilitado y "No quiere negociar hasta el 3 mar" en `.ib-help` debajo del nombre. Se apilan con 6 px de hueco.

**Historial** `.mk-hist`: una sola `.card` con padding 4 px 0 y filas de borde a borde (`role="list"`). Cada fila, grilla `64px 150px minmax(0,1fr)`: fecha (12 px 600 tabulares `--dim`), estado `.mk-st` con ícono y palabra (Firmado y Vendido: ⇄ `--good`; Prestado: ⇄ `--good`; Sin acuerdo, Se cayó, Venció, Caducó, Rechazaste: ✗ `--danger`; Retirada, Se retiró: reloj `--dim`; Cancelaste: ✗ `--danger` + "bloqueado hasta…" en el texto), texto de 14 px (nombre en 700, enlace; club con escudo de 16 px; el motivo del club entre comillas «» en `--dim`). Separador `--line2`. La fila pedida desde la bandeja se elige con el fondo `--accent-soft` y el riel de 3 px `--sel`, como la fila de la tabla. Todos los chips del historial son neutros (`--panel2`): ninguno es decisión.

**Estado vacío por grupo** `.mk-empty`: caja de borde 1 px **discontinuo** `--line`, fondo transparente, radio 12, padding 14 px 16 px, texto de 14 px 500 `--dim` con máximo 64ch. El borde discontinuo dice "acá no hay nada" (la misma forma que `.ib-who.gone`), no "error". "Para responder" vacío lleva además el enlace a transferibles como `.btn.sm`.

**Resuelto**: la tarjeta queda en su lugar con riel `--line` (o `--sel` si sigue elegida), el ícono de cabecera pasa a ✓ `--dim`, el tipo a 500 `--dim`, chip "✓ Resuelto", y en lugar de las acciones la nota F7 y "Siguiente para responder ›" (primario). Mismo alto o menos: nada salta debajo del cursor.

### 4.12 Seguimiento

Igual que Buscar, sin la tarjeta de filtros. Vacío: `.ib-empty` dentro de la tarjeta de la tabla, con la estrella (Seguir) en un círculo de 40 px `--dim` y el texto de la especificación.

### 4.13 Movimientos

- Arriba, un segmentado "Mis pases / Todos" (estado activo de la decisión 2, 32 px, 12 px).
- Tabla en `.card` (sin `scroll-x`: en angosto se ocultan Desde y se escribe "→ Hacia"). Columnas: Fecha (12 px tabulares `--dim`), Jugador (14 px 600, enlace), Desde, Hacia (escudo de 16 px + nombre), Monto (derecha, tabulares; "Préstamo" y "Libre" en `--dim`).
- **Propios**: fondo `.me` existente (acento al 14 %, `--text` 10,57 mínimo) **y** chip "Tuyo" `.mk-st` neutro de 12 px después del nombre: el color no es la única marca.
- "Mostrar 80 más" como `.mk-more`. Vacío: `.ib-empty` "Todavía no hubo movimientos en este mercado."

### 4.14 Presupuesto

Dos columnas desde 900 px (`minmax(0, 1fr) minmax(0, 1fr)`, hueco 16 px): medidores a la izquierda, balance a la derecha.

**Medidores** `.mk-meters`: una `.card` con título "Lo que podés gastar" y tres bloques separados por `--line2` (padding 14 px 0).

```
Presupuesto de pases                       US$ 3,66 M de 4,5 M
[▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨░░░░░░░]   ← 10 px; rayado = comprometido
Comprometido US$ 3,66 M en 3 ofertas y 1 acuerdo (rayado) · Libre para ofertar US$ 840 mil
Lo limita: cada compra y cada préstamo se pagan de acá.

Caja                                                        US$ 3,0 M
Para primas de fichaje y de renovación. (Sin barra: no tiene tope.)

Sueldos por mes                              US$ 410 mil de 480 mil
[██████████████████████████████████████████████░░░░░░░░]
Margen US$ 70 mil por mes · Lo limita: el contrato que firmes no puede pasar el tope.
```

- Fila superior: nombre 14 px 700 `--text` a la izquierda, cifras 14 px 700 tabulares a la derecha ("de 4,5 M" en 500 `--dim`).
- Barra `.mk-bar`: 10 px de alto, radio 5, pista `--panel3`. Relleno `--accent-hi` (4,35 mínimo sobre la pista; el acento puro daría 2,54 y la especificación lo prohíbe). En el presupuesto el relleno es **rayado** (2.2) con borde de 1 px `--accent-hi`: comprometido no es gastado, y la forma lo dice. La leyenda lo nombra ("(rayado)").
- Leyendas 12 px 500 `--dim`.
- **Sobre el tope**: barra llena, y debajo "! Pasaste el tope por US$ 12 mil: no podés firmar contratos nuevos hasta bajar la masa." con el "!" de 14 px `--warn` y el texto en `--text` 700. **Caja negativa**: cifra en `--bad` con "−", leyenda "En rojo: no podés pagar primas." en `--text`.
- La barra es `role="img"` con `aria-label` que repite las cifras; el texto visible ya las dice.

**Balance de la temporada** `.mk-bal`: `.card` con título "Balance de la temporada".

- Dos bloques "Ingresos" y "Egresos", cada uno con su rótulo de 12 px 600 `--dim` y filas de 36 px separadas por `--line2`: concepto en 14 px 500 `--dim`, monto en 14 px 700 tabulares `--text` a la derecha, con signo escrito ("+US$ 1,2 M", "−US$ 2,4 M"). **Sin verde ni rojo por fila** (hoy sí, captura `mercado-finanzas-1440.png`).
- Rótulos de egresos con lo que suman: "Sueldos, gastos de funcionamiento y primas de renovación"; "Compras y primas de fichaje" (pueden partir en dos líneas; el monto queda arriba a la derecha).
- **Resultado de la temporada**: fila separada por 1 px `--line` y 12 px, rótulo 14 px 700 `--text`, monto 18,9 px 800 tabulares con signo, y a su derecha un chip neutro `.mk-st` con la palabra ("ganancia" / "pérdida"). Si es negativo, el monto en `--bad` (5,47 sobre `--panel`; siempre sobre `--panel`, nunca dentro de una caja `--panel2`, donde daría 4,82).
- Debajo, "Ver las finanzas del club ›" como `.btn.sm`.
- Vacío: `.mk-empty` con el texto de la especificación, dentro de la tarjeta.

### 4.15 Comparador (`Compare`, D3)

Se mantiene el diseño de hoy (captura `mercado-comparador-1440.png`) con cuatro cambios:

1. **Filas nuevas** "Cabe en tu presupuesto" y "Tope de sueldos", después de "Pedido": valor en palabra con ícono de 14 px — "Sí" (✓ `--good`) / "No" (✗ `--danger`); "Entra" (✓) / "Puede no entrar" ("!" `--warn`) / "No entra" (✗). Mismo `.mk-verdict` que el impacto.
2. **El mejor valor por fila** hoy va solo en verde (`--good`): suma peso 800 y un `.vh` "mejor". Sin eso, en acromatopsia no se ve.
3. **Pie por columna**: "Ofertar" (`.btn` común, no primario: hay dos o tres columnas) y "Seguir" (alternable con ✓). Si ya hay un trato: en lugar de "Ofertar", la línea "Ya tenés una oferta por él: esperando respuesta de Lanús" con reloj de arena, 12 px `--dim`.
4. Rótulos de sección ("TÉCNICOS") en mayúsculas a 10,6 px pasan a "Técnicos" en 12 px 700 `--dim` (sin mayúsculas, regla del portal).

### 4.16 Ventana de negociación `.mk-neg` (`NegotiationModal`, F5)

`Modal` de 640 px de ancho máximo, padding 20 px 24 px, columna con hueco 14 px. Captura de hoy: no hay (se abre después del sí del club); el wireframe de la especificación 5.1 es la referencia.

1. **Cabecera**: fila con `Face` 52, título `h2` 19,6 px "Contrato con Independiente" y, a la derecha, "Cancelar" `.btn.sm`. Debajo, 12 px `--dim`: "Juan Pérez · 24 años · DC 62–74 · hoy cobra entre US$ 4,9 y 8,6 mil por mes (estimado)". Renovación: "Renovación de M. Díaz".
2. **Transferencia** `.ib-facts`: "Transferencia acordada: **US$ 1,4 M** (club: Lanús)".
3. **Lo que pide el representante** `.mk-ask`: caja `--panel2`, borde izquierdo 2 px `--line` (la forma de cita de `.ib-quotes`: son sus palabras), padding 10 px 14 px, 14 px `--text`: "El representante pide **US$ 8,7 mil por mes**, **3 años**, prima **US$ 26 mil**, rol **Titular**." Cifras en 700, exactas.
4. **Paciencia** `.mk-pat`: "Paciencia del representante: **media**." + la frase en `--dim`. "mucha" y "media" sin ícono; "poca" con el "!" de 16 px en `--warn` delante (aviso con costo, la misma marca que en el `BidBox`). Nunca puntos, barras ni "N de M".
5. **Consecuencias** `.ib-conseq` (caja neutra con riel `--line`): "Si cerrás la ventana, la negociación queda como está hasta el 19 ene. Si se levanta de la mesa, no podés volver a ofertar por él durante 14 días."
6. **Formulario**: grilla de tres columnas (Sueldo mensual, Prima, Cláusula, rótulos `.f` de 12 px; campos de 40 px, 14 px 700 tabulares); debajo, "Años" y "Rol" como `Seg` con ✓ (32 px, 12 px). La aclaración del rol en `.ib-help`.
7. **Impacto** `.mk-impact` con el título "Con estos términos", exacto (sueldo que ofrece el DT).
8. **Respuestas** `.mk-log` (`role="status"`): lista con una entrada por ronda; cada una con "Ronda 1" en 12 px 600 `--dim` y el texto en 14 px `--text`; la última sin separador, las anteriores con `--line2`. La contraoferta del representante en 700. Ruptura: `.ib-result.err`.
9. **Control duro**: `.mk-note` de aviso encima del pie ("Con este sueldo superás el tope por US$ 3 mil. Esto no gasta paciencia.").
10. **Pie**: "Cancelar" (común) a la izquierda y "Ofrecer" (primario) a la derecha, separador `--line2` arriba.
11. **Hay acuerdo** `.mk-agree`: el pie se reemplaza por una caja `--panel2`, borde `--line2`, riel izquierdo de 3 px `--good`, radio 12, padding 12 px 14 px: ✓ de 16 px `--good` + "¡Hay acuerdo! Falta tu confirmación." (14 px 700), y abajo "Seguir negociando" (común) y "Confirmar: fichar a Juan Pérez, US$ 1,4 M + prima US$ 15 mil" (primario, ajusta en dos líneas). El foco cae en el primario.

Celular: la ventana ocupa todo el ancho y el alto disponibles con desplazamiento interno; el formulario pasa a una columna; el pie va **al final del contenido**, no fijo (lección (a) de la especificación), con `scroll-padding-bottom` de 16 px.

### 4.17 Ficha › Contrato y mercado (jugador ajeno)

Captura `ficha-contrato-ajeno-1440.png`: hoy la tarjeta "Negociar" muestra "Cobraría alrededor de US$ 6 mil/mes" exacto y dos `.btn.sm` de 11,5 px. Pasa a:

- Tarjeta izquierda "Contrato": filas como hoy, con el sueldo como rango ("US$ 4,9–8,6 mil (estimado)" en 500 `--dim`) mientras no se lo conozca al 95 %.
- Tarjeta derecha: título "Ofertar por Lucas Acosta" (o "Trato con Aldosivi" con un trato abierto) y el `BidBox` completo, igual que en el panel, con el primario de ancho natural y 38 px.
- "Ofertar ▸" de la banda sigue llevando a esta pestaña.

---

## 5. Estados (especificación, sección 6)

| Estado | Tratamiento visual |
|--------|-------------------|
| Carga | No existe; sin esqueletos |
| Libro abierto | Celda Libro con ✓ `--good` y "cierra el … · quedan N días" (4.2) |
| Libro por cerrar | "!" ámbar en el círculo; "cierra en N días"; hoy / mañana en `--warn` 700. En contraofertas y acuerdos, `.ib-due` "vence con el cierre del libro" |
| Último día | "cierra hoy"; Ofertar compra, Pedir préstamo y el "Ofertar" de Mejorar en opacidad 0,4 con el motivo en `.ib-help` |
| Aviso de cierre (mensaje) | Solo bandeja: fila neutra de tema Mercado (no es decisión) |
| Libro cerrado | Candado neutro, "Cerrado · reabre…"; botones deshabilitados con motivo escrito |
| Cambio de libro | Solo `.vh` en la región viva; la franja cambia sin animación |
| Buscar poblado / vacío | Tabla (4.5) / `.ib-empty` dentro de la tarjeta de la tabla con "Limpiar filtros" `.btn.sm` |
| Panel sin elegir | 4.7, con `<kbd>` |
| Jugador elegido | Fila con riel `--sel`; panel con datos |
| Jugador desconocido (< 60 %) | Rangos en `--dim`; `.mk-note` de información junto a Ofertar |
| Ojeándolo / ojeo lleno | 4.7, con "i" |
| Oferta en edición | El impacto y la fecha cambian a cada tecla, sin animar (0 ms) |
| Oferta bloqueada antes de enviar | Botón 0,4 y motivo en `.ib-help` (con ✗ si es prohibición) |
| Sueldo que podría pasar el tope | Veredicto "puede no entrar" / "no entra" en el impacto + `.mk-note` de aviso; Ofertar sigue habilitado |
| Oferta enviada | Nota F7 de éxito; el `BidBox` pasa a "Esperando"; chip "Esperando" en la tabla |
| Retirar | Nota F7 de éxito (✓); vuelve el formulario con el último monto |
| Segunda oferta | Variante del trato abierto (4.8 b) |
| Tope de 5 ofertas | Botones 0,4 y el motivo; contador visible |
| Llega acuerdo / préstamo / contraoferta | La tarjeta aparece en su grupo con riel ámbar; el `BidBox` cambia de variante; chip de decisión en la tabla. Sin animación de llegada |
| Llega rechazo | Fila del historial con ✗ "Sin acuerdo" y el motivo |
| Vencidos / caducados / jugador vendido / cambio de club | Fila del historial con ✗ y el texto de su estado; si la tarjeta estaba elegida, `.ib-gone` en su lugar |
| Negociación abierta | 4.16 |
| Control duro | `.mk-note` de aviso sobre el pie |
| Acuerdo con el jugador | `.mk-agree` (4.16) |
| Firmado | Nota F7 de éxito "Firmó…"; "Ya es tuyo" en el panel; la fila sale de la tabla |
| Ruptura | `.ib-result.err` con ✗, motivo y fecha |
| Bloqueado | Variante "Bloqueado" del `BidBox` (✗ `--danger`); chip "Bloqueado hasta…" en la tabla |
| Club molesto | `.mk-note` de aviso en el `BidBox` de cualquier jugador de ese club |
| Trato pendiente al cerrar la ventana | La tarjeta sigue en "Para cerrar" con "Paciencia: media" en sus hechos |
| Oferta mejorada / retirada (haggle) | Nota F7 de éxito / de advertencia; chip "Mejorada 1 vez" |
| Resuelto | 4.11 |
| Respondida o vencida en otro lado | `.ib-gone` |
| Trato fuera del registro | Solo bandeja: texto tenue y "Ver la ficha" |
| Plazo corto | `.ib-due.short`: "!", `--warn` 700, "hoy" / "mañana" |
| Avance en curso | Botones de oferta y respuesta en 0,4 con "Frená el avance para decidir." una vez por bloque |
| Modal abierta | `.modal-bg` existente |
| Entidad inexistente | `.ib-who.gone` (borde discontinuo) |
| A préstamo en su club / plantel lleno | Motivo con ✗ / sin ícono bajo los botones |
| Tratos vacío / Seguimiento vacío | `.mk-empty` por grupo / `.ib-empty` |
| Error al guardar | `.ib-result.err` |
| ≤ 1180 px | Sin panel (sección 6) |

---

## 6. Celular (390 px) y ventanas angostas

### 6.1 Umbrales

| Ancho | Qué cambia |
|-------|-----------|
| > 1180 px | Tabla + panel de 380 px |
| 1101–1180 | Sin panel: la tabla a todo el ancho; la fila abre la ficha (chevron › de 16 px `--dim` al final de la fila para decir "abre otra vista", como la bandeja angosta) |
| ≤ 1100 | Filtros en dos filas; tarjetas de Tratos con el cuerpo en una columna |
| ≤ 900 | Franja en dos filas: Libro a todo el ancho arriba; Libre, Caja y Sueldos abajo en tres columnas. Presupuesto en una columna. Descripción de grupo debajo del título |
| ≤ 760 | Celular (6.2) |

### 6.2 Celular

```
┌──────────────────────────────────────┐
│ [◂][escudo] 10 ene  [▸▸] [Continuar] │ barra existente (56 px)
├──────────────────────────────────────┤
│ Mercado                              │ h2 19,6 px
│ ┌ .mk-strip ───────────────────────┐ │
│ │ (✓) Libro de pases               │ │
│ │     Abierto                      │ │
│ │     cierra el 20 feb · 12 días   │ │
│ │ ──────────────────────────────── │ │
│ │ Libre       │ Caja               │ │ dos columnas
│ │ US$ 2,1 M   │ US$ 3,0 M          │ │ 16,8 px
│ │ ──────────────────────────────── │ │
│ │ Sueldos / tope  US$ 410 / 480 mil│ │
│ └──────────────────────────────────┘ │
│ [✓ Buscar][Tratos !2][Seguim. 6][Mo▒ │ chips 44 px, desplazables, máscara
│ [⚲ Filtros: DC · ≤ 28 · ≥ 65    ▾]  │ 44 px, aria-expanded
│ ┌ tabla ───────────────────────────┐ │
│ │ ☐ Juan Pérez    DC  62–74  1,4 M›│ │ filas 48 px
│ │ …                                │ │
│ │ [       Mostrar 100 más        ] │ │ 44 px
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Inicio Bandeja Plantel Tácticas  Más │ navegación inferior (62 px)
└──────────────────────────────────────┘
```

- **Franja**: grilla `1fr 1fr` con Libro (fila 1, dos columnas), Libre y Caja (fila 2), Sueldos (fila 3, dos columnas); separadores horizontales `--line2`; valores a 16,8 px. Ocupa unos 190 px (hoy el hero ocupa 230).
- **Pestañas**: fila de chips de 44 px con `overflow-x: auto`, sin barra visible y la máscara de degradé en el borde derecho de la bandeja (`mask-image: linear-gradient(90deg, #000 88%, transparent)`). Los nombres no se acortan salvo "Seguimiento" → "Seguim." con el nombre completo en `aria-label`.
- **Filtros**: botón `.mk-filt` de 44 px a todo el ancho (`--panel2`, borde `--line`, radio 10, 14 px 600): ícono de embudo de 16 px, "Filtros:" y el resumen en `--dim`, chevron abajo a la derecha que gira 180° abierto (sin animación). Al abrir, la tarjeta de filtros aparece debajo en una columna (controles de 44 px).
- **Tabla**: las columnas que entran (Jugador, Pos, Val, Pedido, Trato si hay); filas de 48 px; casilla con área de 44 × 44.
- **Tratos**: tarjetas a todo el ancho, padding 14 px; entidades apiladas; cifras en dos columnas; impacto debajo; **acciones dentro de la tarjeta, en el flujo**: el primario en `flex: 1 0 100%` (44 px), los demás en la fila siguiente en columnas iguales (44 px), peligro último. La misma regla que la barra de la bandeja pero sin `position: fixed`. La confirmación F6 ocupa la fila del primario.
- **Esperando respuesta**: cabecera, línea del jugador en dos renglones y los dos botones de 44 px en una fila.
- **Historial**: fecha y estado en la primera línea, texto en la segunda.
- **Para renovar**: dos líneas; el botón a todo el ancho debajo.
- **Presupuesto**: una columna.
- **Movimientos**: Jugador, "→ Hacia" y Monto; la fecha debajo del nombre en 12 px.
- **Ficha › Contrato y mercado**: el `BidBox` con el primario a todo el ancho (44 px) y los campos de 44 px.
- **Reserva de foco**: `scroll-padding-bottom` = 62 px + 16 px + `env(safe-area-inset-bottom)` (especificación 5.2).
- **Bandeja ≤ 900 px con `DealDecision`**: la barra fija de la bandeja con solo el primario y un único común; el bloque Mejorar, avisos, impacto y enlaces en el contenido (especificación, preguntas 20 y 39). Visualmente idéntico a la oferta de hoy (captura `bandeja-390.png`).

### 6.3 Texto al 120 %

La tabla oculta columnas por prioridad; el panel hace scroll propio; la franja pasa a dos filas desde 1180 px (`.text-big` adelanta el umbral, como ya hace la barra superior); las cifras usan `auto-fit` y bajan de cuatro a dos columnas; las tarjetas de Tratos pasan a una columna desde 1300 px.

---

## 7. Coherencia con lo que ya está hecho

| Pantalla | Qué se toma | Cómo |
|----------|-------------|------|
| Bandeja | Toda la anatomía de una decisión | `.ib-due`, `.ib-who`, `.ib-kpis`, `.ib-facts`, `.ib-acts`, `.ib-help`, `.ib-confirm`, `.ib-result`, `.ib-gone`, `.ib-state`, `.ib-block-h` (como `.mk-gh`). La oferta por un jugador tuyo es la misma pieza en las dos pantallas; la contraoferta y el acuerdo también. `.mk-impact` y `.mk-improve` son nuevos y la bandeja los usa en sus plantillas "Contraoferta" y "Acuerdo para cerrar" |
| Bandeja | Lenguaje de "elegido" | Fondo `--accent-soft` compuesto, riel `--sel` (3 px en filas, 6 px y contorno en decisiones), 700. Igual en la fila de la tabla, la tarjeta de Tratos y la fila del historial |
| Bandeja | Segmentado y chips | Estado activo con ✓; contador neutro `--panel3`; contador de decisiones como `.pdot` |
| Inicio | Mosaico "Para atender" y la insignia | El contador de Tratos usa "!N" ámbar, como la insignia de Inicio y el "Pendiente" del mosaico |
| Tácticas | Cajas de cifras | `.ib-kpi` ya copia a `.tkpis > div`; la franja usa el mismo valor 800 tabular a 18,9 px que `.tkpis b` |
| Día de partido | Nada nuevo | El Mercado no usa el marcador. El reloj de arena de "esperando" no se parece al reloj del partido (forma distinta) |
| Ficha de jugador | Identidad | La banda con el degradé del club sigue siendo exclusiva de la ficha; el panel del Mercado repite su orden (cara, nombre, puesto y valoración, club, datos) en neutro. El `BidBox` es el mismo componente en las dos |
| Barra de comandos y navegación | — | Sin cambios; "Tratos" como destino directo |
| Botones | Sin cambios de forma | `.btn`, `.btn.primary` (tinta por contraste), `.btn.sm`, `.btn.danger` bordeado, `.btn.danger.strong`. El CTA con degradé queda solo para Continuar |

---

## 8. Transiciones

Las de la especificación 10, sin agregar ninguna: `page-in` 160 ms al entrar y al abrir la ficha; `fade` + `pop` 140 ms en la negociación y el comparador; hover de fondo 120 ms en filas, chips, pestañas, botones y tarjetas (desactivado con `.reduce-motion` y `prefers-reduced-motion`). Elegir, cambiar de pestaña, confirmar, mostrar la nota, recalcular el impacto, desplegar los filtros y girar el chevron: 0 ms. Nada parpadea al llegar una respuesta.

---

## 9. Accesibilidad (nivel Estándar)

### 9.1 Tamaños mínimos (todo el Mercado ≥ 12 px; cuerpo, títulos de fila y botones ≥ 14 px)

| Elemento | Hoy | Ahora |
|----------|-----|-------|
| Encabezado de columna `th` | 10,6 px `--faint` | 12 px `--dim` |
| Rótulo de filtro `.f` | 10,9 px | 12 px |
| Rótulo de KPI `.kpi h3` | 11,2 px | 12 px (`.mk-kpi-l`) |
| `.btn.sm` (ficha, barra de la tabla, panel) | 11,5 px | 12 px dentro de `.mk` y de la ficha › Contrato |
| `.pill` de puesto | 9,8 px | 12 px dentro de `.mk` (como en `.ib-read`) |
| `.chip` | 10,6 px | 12 px (`.mk-st`) |
| Rótulos de sección del comparador | 10,6 px en mayúsculas | 12 px sin mayúsculas |
| Contador en pestaña | paréntesis en el texto | 12 px en píldora |
| Pista "Cobraría…" de la ficha | 11,8 px (`.sm`) | 14 px (`.mk-hint`) |

Objetivos de clic: filas ≥ 40 px y botones ≥ 32 px en escritorio; en ≤ 760 px, 44 × 44 en chips, filas, casillas (área ampliada), "Filtros", campos, botones y "Mostrar más".

### 9.2 Contraste (medido con `production/ui/mercado/contraste.mjs`, 86 clubes con economía)

**Texto (mínimo 4,5)**

| # | Texto | Fondo | Medido |
|---|-------|-------|--------|
| 1 | Valores, estado del libro, nombres `--text` | `--panel` | 14,64 |
| 2 | Rótulos, leyendas, rangos `--dim` | `--panel` | 6,99 |
| 3 | "cierra hoy / mañana" `--warn` | `--panel` | 9,30 (`.cvd` 11,07) |
| 4 | Caja y resultado negativos `--bad` | `--panel` | 5,47 (`.cvd` 6,63) |
| 4b | `--bad` | `--panel2` | 4,82 (`.cvd` 5,83): pasa justo; **los negativos van sobre `--panel`** |
| 8 | Contador de Tratos #1d1300 | `--warn` | 10,44 (`.cvd` 12,42) |
| 9 | Contador neutro `--text` | `--panel3` | 11,34 |
| 10 | Encabezado de columna `--dim` | `--panel` | 6,99 |
| 11 | Rango `--dim` en fila par | zebra sobre `--panel` | 6,67 |
| 12 | `--dim` en hover | `--panel2` | 6,16 |
| 13 | Contrato por vencer `--warn` en hover | `--panel2` | 8,18 |
| 14 | Chip neutro `--dim` | `--panel2` | 6,16 |
| 15 | Chip de decisión `--text` | `--warn` 13 % sobre `--panel2` | 9,87 (`.cvd` 9,51) |
| 16 | Rango de `Val` `--text` | `--panel3` | 11,34 |
| 17 | Monto del campo `--text` | #12152b | 16,12 |
| 18–19 | Impacto: rótulo `--dim` / valor `--text` | `--panel2` | 6,16 / 12,89 |
| 27 | Encabezado de grupo con decisiones `--text` | `--warn` 10 % sobre `--panel` | 12,00 (`.cvd` 11,69) |
| 28 | Descripción de grupo `--dim` | fondo de página #0a0c1b | 8,32 |
| 29 | Encabezado de grupo neutro `--text` | `--panel2` | 12,89 |
| 31, 33 | Historial y estados vacíos `--dim` | `--panel` | 6,99 |
| 36 | Lo que pide el representante `--text` | `--panel2` | 12,89 |
| 38 | "Confirmar: cancelar el trato" `--danger` | `--panel2` | 6,38 |
| 39 | "Rechazar" `--danger` | `--panel` | 7,25 |
| 41 | `--text` en fila / tarjeta / pestaña elegida y fila propia | `--accent-soft` sobre `--panel` | mín 10,57 (Defensa), máx 13,08 |
| 42 | `--dim` en fila / tarjeta elegida | ídem | mín 5,05 (Defensa) |
| 43 | `--warn` en fila / tarjeta elegida | ídem | mín 6,71 (Defensa; `.cvd` 7,99) |
| 52 | Título de tarjeta (acento 62 % + blanco) | `--panel` | mín 6,44 (Argentinos) |
| — | Botón primario (tinta / acento) | acento | mín 4,58 (`tools/check-contrast.mjs`) |
| — | "Seguir" activo (`.btn.on`) | acento 22 % sobre `--panel2` | mín 7,56 (ídem) |
| 40 | `--faint` | `--panel3` | **4,05: falla — no se usa en el Mercado** |

**No texto (mínimo 3)**

| # | Indicador | Fondo | Medido |
|---|-----------|-------|--------|
| 5 | ✓ del libro `--good` | `--panel2` | 8,14 (`.cvd` 5,46) |
| 6 | "!" del libro `--warn` | su círculo | 7,28 (`.cvd` 8,39) |
| 7, 26 | Candado y reloj de arena `--dim` | `--panel2` | 6,16 |
| 20 | ✓ "entra" `--good` | `--panel2` | 8,14 (`.cvd` 5,46) |
| 21 | "!" "puede no entrar" `--warn` | `--panel2` | 8,18 (`.cvd` 9,74) |
| 22, 25 | ✗ "no entra" y bloqueo `--danger` | `--panel2` | 6,38 |
| 23 | "!" de aviso `--warn` | `--panel` | 9,30 |
| 24 | "i" de información `--dim` | `--panel` | 6,99 |
| 30 | Riel de decisión `--warn` | `--panel` | 9,30 (`.cvd` 11,07) |
| 32 | ⇄ / ✓ de cierre `--good` | `--panel2` | 8,14 |
| 37 | Riel de "Hay acuerdo" `--good` | `--panel2` | 8,14 (`.cvd` 5,46) |
| 44 | Riel 6 px, contorno y foco `--sel` | fila / tarjeta elegida | mín 4,97 (Lanús) |
| 45 | Foco `--sel` | `--panel` | mín 5,64 |
| 46 | Foco `--sel` | `--panel2` | mín 4,96 |
| 47 | Foco del campo `--sel` | #12152b | mín 6,20 |
| 48 | Foco de pestaña `--sel` | #0a0c1b | mín 6,70 |
| 49 | Borde de la pestaña activa `--accent-hi` | #0a0c1b | mín 6,68 |
| 50–51 | Relleno y rayado del medidor, barra de conocimiento `--accent-hi` | pista `--panel3` | mín 4,35 (Lanús) |

**Resultado**: 0 fallas en los 67 pares que se usan (68 medidos; `--faint` sobre `--panel3` queda prohibido). El par más justo de texto es `--dim` sobre la tarjeta elegida (5,05); el de indicador, el relleno del medidor (4,35) y el foco sobre `--panel2` (4,96). Si la fase 3 cambia la regla de `clubTheme`, hay que correr de nuevo el script (filas 41 a 54) y `tools/check-contrast.mjs`.

### 9.3 Nada solo por color

| Estado | Color | Segunda marca |
|--------|-------|---------------|
| Libro abierto / por cerrar / cerrado | verde / ámbar / gris | Ícono ✓ / "!" / candado y la palabra; "hoy" y "mañana" escritos |
| Decisión en Tratos | Riel y encabezado ámbar | Grupo titulado "Para responder" / "Para cerrar", ícono "!" en la cabecera, plazo escrito |
| Elegido (fila, tarjeta, historial) | `--accent-soft` | Riel `--sel` (forma), 700, contorno en tarjetas, `aria-selected` |
| Marcado (casilla) | — | Casilla tildada |
| Pestaña, filtro, alternable activos | Fondo y borde de acento | ✓ delante, 700, `aria-pressed` |
| Estado de un trato | Tinte en decisiones | Ícono distinto por estado (reloj de arena, !, ✓, ✗, ⇄, candado) y palabra |
| Exacto / rango | `--text` / `--dim` | Guion de rango y "(estimado)" |
| Impacto | — | Flecha, signo y "entra / puede no entrar / no entra" con ícono de forma distinta |
| Caja negativa, resultado negativo | `--bad` | Signo "−" y "en rojo" / "pérdida" |
| Sobre el tope | — | "!" y "Pasaste el tope por…" |
| Comprometido | — | Rayado y la palabra en la leyenda |
| Mejor valor del comparador | `--good` | 800 y `.vh` "mejor" |
| Pase propio en Movimientos | Fondo de acento | Chip "Tuyo" |
| Paciencia | — | Palabra y frase; "!" en "poca" |
| Peligro | Texto rojizo | Último y apartado, borde, palabra |
| Nota F7 | Riel de color | Ícono ✓ / ! / ✗ y texto |
| Vacío / inexistente | — | Borde discontinuo y texto |

### 9.4 Foco

Todo foco es `outline: 2px solid var(--sel)` con 2 px de separación hacia afuera, salvo filas (tabla, historial: −2 px hacia adentro) y títulos que reciben el foco por programa (sin anillo, como `.ib-h`). Las tarjetas de Tratos llevan `scroll-margin-top: calc(var(--mk-top) + 12px)` y, si la barra masiva está a la vista, su alto además (especificación 5.2).

---

## 10. Manifiesto de assets

Íconos SVG en línea con `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, extremos y uniones redondeados, `aria-hidden="true"` (el significado va en el texto o en el `aria-label`). Se dibujan con `ic(d, trazo)` de `src/ui/msg.tsx` y los nuevos van en el objeto `IC` del mismo archivo. **Sin rasters nuevos**: solo los escudos existentes y `src/assets/player.webp`. **Sin fuentes nuevas.**

| Ícono | Trazado (`d`) | Trazo | Tamaños | Dónde | Estado |
|-------|---------------|-------|---------|-------|--------|
| Decisión "!" | `IC.dec` | 2,6 | 16 px en círculo de 32 | — (círculo del libro por cerrar) | Existe (`msg.tsx`) |
| "!" en círculo | `IC.bang` | 2,4 | 12 (chips), 14 (plazo, veredicto, tope), 16 (avisos, cabeceras, grupos) | Avisos con costo, grupos con decisiones, contraoferta, paciencia "poca" | Existe |
| Reloj | `IC.clock` | 2,4 | 14 / 16 | Plazo normal, grupo Historial, chip "Retirada" | Existe |
| ✓ | `IC.check` | 2,8 (3 a 12 px) | 12 (pestaña activa, chips), 14 (veredicto), 16 (libro, acordado, "Hay acuerdo") | — | Existe |
| ✕ | `IC.x` | 2,4 | 14 | Cerrar en celular si hiciera falta | Existe |
| Chevron derecha | `IC.next` | 2,8 | 16 | "Siguiente para responder", enlaces "▸", filas en angosto | Existe |
| Flecha atrás | `IC.back` | 2,4 | 18 | — | Existe |
| Mercado ⇄ | `TAG_ICON.mercado` (`M4 7h13l-3-3M20 17H7l3 3`) | 2,4 | 12 (chips de historial), 20 (panel vacío) | Firmado, Vendido, Prestado; panel sin elegir | Existe |
| Estrella (Seguir) | `TAG_ICON.premio` | 2,4 | 20 | Seguimiento vacío | Existe |
| Chevron abajo | `M6 9l6 6 6-6` (`TopNav.tsx:48`) | 2,6 | 16 | "Filtros" del celular | Existe (mover a `IC`) |
| Lupa | `IC.search` | 2,4 | — | (filtro por nombre: lo dibuja `PlayerTable`) | Existe |
| **Reloj de arena** (esperando) | `M7 3h10M7 21h10M8 3v3.5l4 5.5-4 5.5V21M16 3v3.5L12 12l4 5.5V21` | 2,2 | 12, 14, 16 | Esperando respuesta (grupo, tarjeta, chip, `BidBox`), "Ojeando" | **Nuevo** |
| **Candado** (cerrado, bloqueado) | `M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z` | 2,4 | 12, 16 | Libro cerrado, chip "Bloqueado hasta…" | **Nuevo** |
| **✗ en círculo** | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6` | 2,4 | 12, 14, 16 | No entra, bloqueado, se cayó, motivos de prohibición | **Nuevo** |
| **Información "i"** | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5.5M12 7.5h.01` | 2,4 | 16 | Avisos de información | **Nuevo** |
| **Flecha "pasa a"** | `M5 12h14M13 6l6 6-6 6` | 2,4 | 14 | Impacto antes → después (con `.vh` "pasa a") | **Nuevo** |
| **Renovar** | `M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4h-4M5.5 21v-4h4` | 2,4 | 16 | Grupo "Para renovar" | **Nuevo** |
| **Embudo** (filtros) | `M4 5h16l-6 7.5V19l-4 2v-8.5z` | 2,4 | 16 | "Filtros" del celular | **Nuevo** |
| Barra de medidor | CSS (`.mk-bar`, rayado con `repeating-linear-gradient`) | — | 10 px de alto | Presupuesto, conocimiento (6 px) | Nuevo, solo CSS |
| `<kbd>` | CSS | — | 12 px | Ayuda del panel sin elegir | Nuevo, solo CSS |

Los íconos nuevos siguen el trazo y el radio de los de la bandeja; el reloj de arena va en 2,2 porque sus diagonales se empastan a 12 px con 2,4.

---

## 11. Clases CSS para la fase 3

Todo en una sección `/* portal: mercado (production/ui/mercado/visual-design.md) */` después del bloque de la bandeja en `src/styles.css`. Ámbito: `.mk` es la clase de la página del Mercado (`<div className="page mk">`); la ficha › Contrato y mercado lleva `.mk-scope` en su contenedor para tomar los mismos tamaños. Lo que dice **global** afecta otras pantallas a propósito.

**Cambiar**

| Clase / lugar | Cambio |
|---------------|--------|
| `.hero` del Mercado (`Market.tsx`) | Se retira de esta pantalla; la reemplaza `.mk-strip`. `.hero` sigue en las demás |
| `.mk .f`, `.mk-scope .f`, `.mk-neg .f` | 0,86rem; 600 |
| `.mk .ptable th` | 0,86rem; color `--dim` |
| `.mk .ptable tr.selrow td` | `background: none` (la casilla marca; decisión 4) |
| `.mk .acc`, `.mk-scope .acc` | `color: var(--accent-hi)` (texto de acento puro: 3,28 en el peor club) |
| `.mk .btn.sm`, `.mk-scope .btn.sm`, `.mk .pill`, `.mk .chip` | 0,86rem como mínimo; `.btn.sm` con `min-height: 32px` |
| `Seg` (`common.tsx`) | Aceptar `ReactNode` en `options` (contador de Tratos) o armar `.mk-tabs` a mano con las clases de `.seg`. **Global** si se cambia `Seg` |
| `IC` (`msg.tsx`) | Sumar `hourglass`, `lock`, `xc`, `info`, `arrow`, `renew`, `funnel`, `down` (sección 10). **Global** |
| `Compare` (`PlayerTable.tsx`) | Mejor valor con 800 y `.vh`; rótulos de sección a 12 px sin mayúsculas; filas y pie nuevos (4.15). **Global** (Plantel también lo usa) |
| `NegotiationModal` (`Locker.tsx`) | Estructura de 4.16; los `log` en `.mk-log` en lugar de `good` / `bad` / `warn` de texto |
| Movimientos | Sacar `scroll-x` de la tarjeta |

**Agregar**

| Clase | Qué dibuja |
|-------|-----------|
| `.mk` | Ámbito de la página; `scroll-padding-top: calc(var(--mk-top) + 12px)` en el contenedor que se desplaza |
| `.mk-strip`, `.mk-kpi`, `.mk-kpi-l`, `.mk-kpi-v`, `.mk-kpi-s` | Franja de estado y sus celdas |
| `.mk-book`, `.mk-book-ico` (`.open`, `.soon`, `.closed`), `.mk-book-d` (`.short`) | Celda del libro |
| `.mk-tabs`, `.mk-cnt`, `.mk-cnt.dec` | Pestañas de 36 px y contadores |
| `.mk-filters`, `.mk-filt` | Tarjeta de filtros; botón resumen del celular |
| `.mk-search` | Grilla tabla + panel (`minmax(560px, 1fr) 380px`) desde 1181 px |
| `.mk .ptable tr[aria-selected=true]` | Fila elegida: fondo, riel `inset 3px 0 0 var(--sel)` en la primera celda, nombre 700; `:focus-visible` con contorno −2 px |
| `.mk-st` (`.dec`, y modificadores de ícono) | Chip de estado de trato (tabla, historial, "Tuyo", "ganancia") |
| `.mk-more` | "Mostrar N más" |
| `.mk-side`, `.mk-side.none`, `.mk-side-h`, `.mk-side-n`, `.mk-side-m`, `.mk-know`, `.mk-dl`, `.mk-side-acts` | Panel del jugador |
| `kbd` (dentro de `.mk`) | Teclas en la ayuda |
| `.mk-bid`, `.mk-amt`, `.mk-hint`, `.mk-loan`, `.mk-count` | `BidBox` |
| `.mk-note`, `.mk-note.info`, `.mk-note.warn` | Avisos de información y con costo |
| `.mk-deal`, `.mk-deal-h`, `.mk-deal.wait`, `.mk-deal.dec`, `.mk-deal.block` | Variantes del `BidBox` con trato abierto |
| `.mk-improve` | Bloque Mejorar (también en la bandeja) |
| `.mk-impact`, `.mk-impact-t`, `.mk-verdict` (`.ok`, `.maybe`, `.no`) | Impacto antes → después (también en la bandeja y la negociación) |
| `.mk-deals` | Columna de Tratos (máximo 960 px) |
| `.mk-gh`, `.mk-gh.dec`, `.mk-gh-s` | Encabezado de grupo |
| `.mk-card`, `.mk-card.dec`, `.mk-card[aria-selected=true]`, `.mk-card.done`, `.mk-card-h`, `.mk-card-b` | Tarjeta de trato; cuerpo en dos columnas desde 1101 px |
| `.mk-card.wait` | Tarjeta de "Esperando respuesta" |
| `.mk-renew` | Fila de "Para renovar" |
| `.mk-hist`, `.mk-hist-row`, `.mk-hist-row[aria-selected=true]` | Historial |
| `.mk-empty` | Vacío por grupo (borde discontinuo) |
| `.mk-meters`, `.mk-meter`, `.mk-bar`, `.mk-bar .used`, `.mk-bar .com` | Medidores de Presupuesto |
| `.mk-bal`, `.mk-bal-row`, `.mk-bal-res` | Balance de la temporada |
| `.mk-neg`, `.mk-ask`, `.mk-pat`, `.mk-log`, `.mk-agree` | Ventana de negociación |
| `.ib-ents.compact`, `.ib-kpis.compact` | Escala compacta de la bandeja para las tarjetas de Tratos (cara 40, escudo 32, valor 1,2rem) |
| `.ib-acts.flow` | Acciones en el flujo de celular: primario `flex: 1 0 100%`, resto `flex: 1 1 0`, 44 px |

**Media queries**

| Ancho | Cambios |
|-------|---------|
| ≤ 1300 px con `.text-big` | `.mk-card-b` en una columna |
| ≤ 1180 px | `.mk-search` en una columna; `.mk-side` oculto; chevron en las filas |
| ≤ 1100 px | `.mk-filters` en dos filas; `.mk-card-b` en una columna |
| ≤ 900 px | `.mk-strip` en dos filas; Presupuesto en una columna; `.mk-gh-s` debajo del título |
| ≤ 760 px | Franja de tres filas, valores 1,2rem; `.mk-tabs` desplazable con máscara, 44 px; `.mk-filt` visible y la tarjeta de filtros plegada; `.ib-acts.flow`; controles de 44 px; `scroll-padding-bottom` con la navegación inferior; `.mk-neg` a pantalla completa con pie en el flujo |

---

## 12. Riesgos y temas abiertos

- **Para el usuario**: las decisiones 2 (una anatomía, tarjetas de Tratos más altas que el wireframe), 4 (fila marcada sin fondo) y 5 ("Negociar renovación" sin relleno; "!" en la paciencia "poca"). Las tres son reversibles sin tocar el resto.
- **`Seg` con `string[]`**: el contador de Tratos necesita JSX; cambiar `Seg` es global (lo usan Tácticas, la negociación y el Inicio).
- **Tamaños globales por debajo de 12 px** que el Mercado sube solo en su ámbito: `.f` (10,9 px), `th` (10,6 px en `--faint`), `.btn.sm` (11,5 px), `.pill` (9,8 px), `.chip` (10,6 px). Es la misma deuda que anotó la bandeja; el arreglo de fondo es global y sale de esta pantalla.
- **`.acc` como texto** (acento puro, 3,28:1 mínimo como texto en `PlayerTable`: flecha de orden, "Ojeando", nota de la barra masiva) falla 4,5 en algunos clubes fuera del Mercado también. Acá se corrige en el ámbito; conviene corregirlo global.
- **`--bad` sobre `--panel2`** pasa con 4,82: margen corto. La regla "negativos sobre `--panel`" lo evita; si en la fase 3 un negativo termina dentro de una caja, no hay falla, pero queda justo.
- **Comparador y negociación** son componentes compartidos con Plantel y renovaciones: sus cambios se ven también ahí (a propósito).
- **Sin captura de la negociación ni de Tratos con tratos**: el motor todavía no tiene `g.deals`; las capturas de la fase 3 tienen que inyectar tratos en los cinco estados y repetir las mediciones de `elementFromPoint` de la bandeja.
