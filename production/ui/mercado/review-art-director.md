# Revisión visual del Mercado de pases (fase 4 de /team-ui)

> **Revisor**: art-director
> **Fecha**: 2026-11-15
> **Rama**: `mercado-ui` (commit `184c7f4`)
> **Contrato**: `production/ui/mercado/visual-design.md`. El usuario aceptó tres decisiones: (1) la misma tarjeta de trato en todos lados (bandeja, Tratos, caja de oferta), (2) fila elegida distinta de fila marcada, (3) un solo primario relleno, y solo en las decisiones.
> **Implementación revisada**: `src/ui/Market.tsx`, `src/ui/deal.tsx`, sección `/* portal: mercado */` de `src/styles.css` (líneas 858-1077), caja de oferta en `src/ui/PlayerPage.tsx`, `NegotiationModal` en `src/ui/Locker.tsx` y plantillas de trato en `src/ui/Inbox.tsx`.
> **Capturas propias**: `production/ui/mercado/shots/review/` (281 archivos). Playwright con Chromium, `deviceScaleFactor` 1 y tratos inyectados con el `setupDeals` de `tests/ui/mercado.cjs`. Hay seis anchos: 1920×1080, 1440×900, 1024×768, 820×1000, 390×844 y 360×740. Hay cuatro clubes: Independiente (rojo, acento medio), Boca Juniors (azul), Gimnasia (LP) (azul marino, el acento más oscuro) y Defensa y Justicia (amarillo). Hay texto al 120 % y colores para daltonismo (`cvd`). Los nombres siguen la forma `<vista>-<club>[-t120][-cvd]-<ancho>.png`. Las miré todas.
> **Contraste**: `node production/ui/mercado/contraste.mjs` da **0 fallas** (67 pares). `node tools/check-contrast.mjs` también da **0 fallas**. Ojo: los dos scripts miden los pares del diseño, no los de la implementación. Los pares nuevos que trae la implementación se midieron aparte (sección 4).

---

## Veredicto: NECESITA CAMBIOS

Hay cosas que están bien hechas. La franja de estado reemplaza bien al "hero". Las pestañas tienen ✓ y la píldora "!4". El libro abierto, por cerrar y cerrado tiene ícono y palabra. Elegido y marcado están separados, como se pidió, en los cuatro clubes. La confirmación F6 funciona en el lugar. Con `cvd`, los íconos ✓ / ! / ✗ siguen siendo de forma distinta, y los dos scripts de contraste pasan.

Pero hay cinco bloqueantes:

1. Un error de dibujo real deja la pantalla en blanco.
2. La primera decisión que aceptó el usuario no está cumplida: el trato no se ve igual en la bandeja y en Tratos.
3. La tabla de impacto, que es la pieza que decide, se rompe en cada contenedor angosto.
4. El título de la caja de oferta mide menos que el piso de 12 px.
5. La ficha muestra exacto el sueldo de jugadores ajenos, que el ojeo debería mostrar como rango.

---

## 1. Bloqueantes

### B1. Pantalla en blanco: se desplaza la raíz del documento, no `#main`. Es un error real, no un problema de las capturas

**Qué pasa.** Las capturas del implementador (`shots/tratos-1440.png`, `shots/tratos-2-1440.png`) no dibujan nada debajo de unos 600 px y esconden la barra superior. No es la captura: **todo el documento quedó desplazado**.

En Tratos con tratos abiertos, `document.scrollingElement.scrollHeight` da **2353 px a 1440×900** y **4242 px a 390×844**, contra 900 y 844 en Inicio, Plantel, Bandeja, Buscar y Presupuesto.

**Cómo lo reproduje** (script en el scratchpad de la sesión, no en el repo):
- Con la rueda del mouse pasado el final de Tratos, el desplazamiento encadena a la raíz y la sube **1453 px**. Resultado: una pantalla vacía de color `#0a0c1b`, sin barra ni contenido (`bug-rueda-pantalla-vacia-ind-1440.png`). Le pasa a cualquier jugador con rueda o touchpad. En celular, el arrastre encadena igual.
- `scrollIntoView({ block: 'center' })` (lo usa `seen()` en `tests/ui/mercado.cjs`) sube la raíz **299 px**: la barra desaparece y abajo queda una franja vacía (`bug-raiz-desplazada-ind-1440.png`). Por eso aparecen las capturas cortadas del implementador.
- Tab y Fin (`End`) no lo disparan, porque desplazan solo `#main`.

**Causa.** El `<span class="vh"> pasa a </span>` de la flecha del impacto (`.mk-arr`, `ImpactBox` en `src/ui/deal.tsx:108`). `.vh` es `position: absolute !important` (`src/styles.css:653`). Entre ese span y la raíz no hay ningún antecesor posicionado: `.main` (`styles.css:49`), `.mk-card` y `.mk-impact` son `static`.

Entonces su bloque contenedor es el inicial: el recorte de `.main { overflow: auto }` no lo alcanza y cada span estira el área desplazable del documento hasta su posición. Hay 12 de esos spans en Tratos, que es la única pantalla con varias tablas de impacto apiladas. Los de Buscar y la bandeja caen dentro de la ventana o dentro de un antecesor posicionado.

**Cambio.**
- `styles.css:49`: `.main { position: relative; }`. Hace a `#main` bloque contenedor de todo `.vh` y de cualquier absoluto futuro, y los recorta.
- Por las dudas, `.mk-arr { position: relative; }`.
- Opcional: `.main { overscroll-behavior: contain; }` para que el desplazamiento nunca encadene a la raíz.

Después hay que confirmar que la ficha breve (`HoverCard`) y los menús que se posicionan dentro de `#main` siguen en su lugar: correr `node tests/ui/bandeja.cjs`.

**Criterio de aceptación.** Agregar a `tests/ui/mercado.cjs` que en cada pestaña `document.scrollingElement.scrollHeight <= innerHeight` y que `document.scrollingElement.scrollTop === 0` después de `seen()`.

### B2. La tarjeta del trato no es la misma en la bandeja, en Tratos y en la caja de oferta (decisión 1, aceptada por el usuario)

Comparé el mismo trato abierto en los dos lugares, al mismo ancho:

- `par-bandeja-acuerdo-ind-1440.png` contra `par-tratos-acuerdo-ind-1440.png` (y `-390`).
- `par-bandeja-contra-ind-1440.png` y `par-bandeja-deal-fin-ind-1440.png` contra `par-tratos-contra-ind-1440.png`.
- `par-bandeja-oferta-ind-1440.png` y `par-bandeja-offer-fin-ind-1440.png` contra `par-tratos-oferta-ind-1440.png`.
- La caja de oferta: `bidbox-acordado-ind-1440.png`.

| Pieza | Bandeja | Tratos | Contrato (4.11, decisión 2) |
|-------|---------|--------|-----------------------------|
| Cabecera (tipo + plazo) | Etiqueta "Mercado", título y fecha arriba; plazo con reloj debajo de las cifras | `DealCard` **no tiene `.mk-card-h`**: el tipo y el plazo viven en `DealBlock`, en la columna derecha. A 1024 px y menos quedan **en el medio de la tarjeta**, después del jugador, el club y las cifras (`tratos-a-ind-1024.png`, `tratos-b-ind-390.png`). `OfferCard` solo dice "! Vence el 19 ene", sin "Oferta por tu jugador" | Cabecera arriba de todo, de borde a borde: ícono de estado, tipo en 700 y `.ib-due` |
| Cifras del acuerdo | Acordado · **Pedido original** · Pediría (rango) | Acordado · **Pedido público** | Mismas cifras y mismos rótulos |
| Cifras de la contraoferta | Pide (tu oferta debajo) · Pedido público · Libre para ofertar | Tu oferta · Pide · Pedido público | Tu oferta · **Pide** · Pedido público · Libre para ofertar |
| Cifras de la oferta | … Sueldo **US$ 13 mil** · Contrato dic 2028 | … Sueldo que liberás **US$ 12,5 mil** | El mismo número tiene que tener el mismo formato |
| Impacto de la oferta | No hay | "Si lo vendés" | En las dos |
| Entidades | Dos columnas, con metadatos y chevron | Apiladas, sin metadatos ni chevron. A 1024 px son cajas de 960 px casi vacías | Dos columnas, escala compacta |
| Orden de acciones | Enlaces ("Ver todos los tratos", "Ver la ficha"), después texto, y **el primario al final**: a 1440×900, "Aceptar US$ 20 mil" queda en y = 906, debajo del pliegue | Primario primero | Primario → comunes → enlaces → peligro |
| Rieles | Uno | **Dos**: `.mk-card.dec` (3 px `--warn`) más `.mk-deal.dec` (3 px `--warn`) adentro. Si la tarjeta está elegida, se suma un tercero de 3 px `--sel` (`tratos-a-ind-1440.png`) | Uno, que pasa a 6 px `--sel` cuando la tarjeta está elegida |

**Cambio.**
- Un solo componente de vista del trato en `deal.tsx`, por ejemplo `DealView`, que arme cabecera, entidades, cifras, hechos, impacto, Mejorar, `ActRow` y ayuda. Las cifras salen de una sola función (`dealKpis(g, deal)`).
- Lo usan las plantillas de `Inbox.tsx`, `OfferCard` y `DealCard` de `Market.tsx`, y `BidBox`. La caja de oferta lo usa sin las entidades, porque ya está en la ficha del jugador.
- La cabecera sale de `DealBlock` y va primera en `.mk-card`, encima de `.mk-card-b`.
- `.mk-card .mk-deal { border-left: 0; padding-left: 0; }`. El riel de `.mk-deal` queda solo para la caja de oferta, donde no hay tarjeta que lo lleve.
- En la bandeja, la fila de acciones va antes que el cuerpo del mensaje, como en Tratos.

### B3. La tabla de impacto se rompe en todo contenedor de menos de ~560 px

Medí las columnas de `.mk-impact` en una tarjeta de Tratos: 132 / 189 / 118 px. La columna de Tratos mide 440 px, **igual a 1440 que a 1920**, porque `.mk-card-b` reparte `1fr 1fr` dentro de 960 px.

"US$ 37,9 M → US$ 37,9 M" necesita unos 210 px, así que la flecha queda al final de un renglón y el "después" baja al siguiente (`tratos-a-ind-1440.png`, `tratos-a-ind-1920.png`). El arreglo de `white-space: nowrap` sacó la "M" sola, pero el corte pasó a la flecha.

En el panel del jugador (380 px) es peor: **la flecha queda sola en su renglón** y cada fila ocupa tres (`buscar-panel-fin-ind-1440.png`). Con texto al 120 % también se parte el rótulo ("Libre para / ofertar").

Es la pieza que dice "entra / no entra" y no se puede leer de un vistazo. El valor de 340 px del contrato tampoco alcanzaría: la regla tiene que depender del contenedor, no de la ventana.

**Cambio.**
- `.mk-impact-w { container-type: inline-size; }`.
- Llevar las reglas apiladas de `@media (max-width: 760px)` (`styles.css`, bloque final) a `@container (max-width: 560px)`: el rótulo arriba a todo el ancho, y abajo antes → después y el veredicto en una fila.
- Por encima de 560 px, la tabla de tres columnas sin `width: 30%` fijo en `th`.

**Además**, con montos chicos la fila no muestra el cambio. Al aceptar US$ 20 mil se lee "US$ 37,9 M → US$ 37,9 M" (`tratos-a-ind-1440.png`). Cuando la diferencia no se ve con el redondeo de `money()`, conviene escribir la diferencia ("−US$ 20 mil") en lugar del "después" redondeado.

### B4. Texto bajo 12 px y la caja de oferta sin título

| Elemento | Computado | Contrato | Dónde se ve |
|----------|-----------|----------|-------------|
| `.mk-bid > h3` ("Ofertar por …", "Oferta por …") | **11,2 px**, 600, `--dim` | `h3` de tarjeta portal: 15,1 px, 700, acento 62 % + blanco (4.8, 4.17) | `buscar-panel-fin-ind-1440.png`, `bidbox-form-ind-1440.png` (al lado, "Contrato" sí tiene el estilo de título) |
| "Ver la ficha" del Historial (`.linkish.sm`) | 11,8 px | ≥ 12 px | `tratos-e-ind-1440.png` |
| Contador "400 jugadores." (`.dim.sm`) | 11,8 px | 12 px | `buscar-ind-1440.png` |

La prueba `smallText` de `tests/ui/mercado.cjs` pasó porque se corre una sola vez, en Presupuesto. Hay que correrla en cada pestaña, en la ficha (`.mk-scope`) y en `.ib-read`.

**Cambio.**
- `.mk-bid > h3 { font-size: 1.08rem; font-weight: 700; color: color-mix(in srgb, var(--accent) 62%, #fff); }`, o reutilizar la clase de título de tarjeta del portal.
- `.mk .linkish.sm, .mk .dim.sm { font-size: max(.86rem, 12px); }`.

### B5. La ficha muestra exacto el sueldo de un jugador ajeno, al lado del rango de la caja de oferta

En `bidbox-form-ind-1440.png`, Nazareno Colombo (Racing, conocido al 48 %) dice en la misma pantalla:
- "Sueldo mensual **US$ 15 mil**" en la tarjeta Contrato (`PlayerPage.tsx:121`, `money(p.wage)`).
- "US$ 15 mil/mes" en la banda (`PlayerPage.tsx:61`).
- En la caja de oferta, "Seguiría cobrando **entre US$ 12 y 19 mil** por mes".

Contradice el principio "Rango = gris, exacto = blanco" y la sección 4.17 del contrato, y revela lo que el ojeo no sabe (regla del juego en `CLAUDE.md`).

**Cambio.** Para jugadores de otro club, en los dos lugares usar `wr(wageShown(g, p, p.wage, 401))` en `.rng` con "(estimado)" debajo del 95 %, igual que el panel (`buscar-panel-ind-1440.png`: "US$ 30–46 mil por mes (estimado)").

---

## 2. Menores (ordenados por impacto)

| # | Problema | Captura | Regla o componente | Cambio |
|---|----------|---------|--------------------|--------|
| M1 | Movimientos: los pases propios se distinguen **solo por el color de fondo** (`tr.me`). Falta el chip "Tuyo". Falla WCAG 1.4.1 (sección 9.3 del contrato) | `movimientos-todos-ind-1440.png` | `Moves` en `Market.tsx` | `<span className="mk-st">Tuyo</span>` después del nombre cuando `t.mine` |
| M2 | Encabezados de grupo: el `h3` mide 15,4 px, 600, en `--dim` (gris, más débil que su descripción). No tiene tinte ámbar ni ícono, y el número es " · 2" en texto, no una píldora. El enlace a transferibles va como texto `--accent-hi` dentro de la descripción: en Independiente se lee rojo y en Defensa amarillo, como un aviso | `tratos-a-ind-1440.png`, `tratos-dyj-1440.png` | `.mk-gh`, `GH` en `Market.tsx` | Contrato 4.11: 14 px 800 `--text`, tinte `color-mix(warn 10%, panel)` con borde al 35 % en los grupos que piden decisión, ícono de 16 px, `.pdot` o `.mk-cnt`, y el enlace como `.btn.sm` debajo |
| M3 | El plazo de la cabecera (`.ib-due` dentro de `.mk-card-h` y `.mk-deal-h`) mide 12 px en `--dim`: el dato más urgente es el texto más débil de la tarjeta | `tratos-a-ind-1440.png` | `.mk-card-h .ib-due`, `.mk-deal-h .ib-due` | 14 px, 600, `--text`; el plazo corto sigue en `--warn` 700 |
| M4 | Dos primarios rellenos de **dos colores** en la ficha de un ajeno. "Ofertar ▸" de la banda va relleno con el color **del club del jugador** (verde Aldosivi, celeste Racing), y la decisión ("Aceptar US$ 20 mil", "Ofertar compra") con el tuyo. Contradice la decisión 3. Además, "Ofertar compra" ocupa 658 px en la ficha (computado), cuando el contrato pide ancho natural | `bidbox-contraoferta-gelp-1440.png`, `bidbox-form-ind-1440.png` | Banda de `PlayerPage.tsx`, `.mk-go.page` | "Ofertar ▸" de la banda como `.btn` común. `.mk-go.page { width: auto; }`: el padre `.mk-bid > div` estira el botón a pesar de `align-self` |
| M5 | Clubes amarillos (Defensa y otros cuatro): el acento coincide con `--warn`. La tarjeta elegida queda ocre, el primario amarillo cae dentro de un riel ámbar, el enlace amarillo parece un aviso y el rayado de lo comprometido, amarillo y negro, se lee como **cinta de peligro**. `clubTheme` ya neutraliza `--sel` para estos clubes, pero no lo demás | `tratos-dyj-1440.png`, `presupuesto-dyj-1440.png` | `clubTheme` (`common.tsx:77`), `.mk-bar .com` | Para que decida el usuario: (a) en esos clubes, rayar con `--dim` en lugar de `--accent-hi`; (b) además, fondo elegido neutro (`--panel2` y el contorno `--sel`) en lugar de `--accent-soft`; (c) aceptarlo como está, porque el ícono "!" y la palabra siguen distinguiendo. Recomiendo (b) |
| M6 | Texto al 120 %: el chip `Val` "83–93" se parte en dos renglones ("83–" / "93") y "Conocés el 48 %" deja el "%" solo. La franja sigue en cuatro columnas a 1440, cuando el contrato (6.3) pide dos filas desde 1180 con `.text-big` | `buscar-panel-ind-t120-1440.png`, `tratos-a-ind-t120-1440.png` | `Val`, `.mk-know`, `.mk-strip` | `white-space: nowrap` en los chips de valoración y de puesto; espacio duro antes de "%"; `@media (max-width: 1180px) { .text-big .mk-strip { grid-template-columns: 1fr 1fr } }` |
| M7 | Celular: la franja mide 258 px a 390 (el contrato pide unos 190) y a 360 parte "US$ 242 mil / 2,27 / M". El primer jugador de Buscar aparece en y ≈ 760 de 844: queda un solo renglón a la vista | `buscar-ind-390.png`, `buscar-filtros-ind-360.png` | `.mk-kpi-v`, `.mk-kpi-s` en ≤ 760 px | `white-space: nowrap` en `.mk-kpi-v`. En ≤ 760 px, acortar la leyenda de Libre ("US$ 2,11 M comprometidos") |
| M8 | Negociación: la ventana mide unos 1000 px (el contrato pide 640), así que la nota de consecuencias corre 160 caracteres por línea. `.mk-ask` va sin la caja de cita, las consecuencias en 12 px sueltas en lugar de `.ib-conseq`, y `.mk-agree` sin ✓ ni riel `--good`. "¡Hay acuerdo!" aparece dos veces (en el registro y en la caja). En la misma ventana se mezclan "US$ 3,4 mil" y "US$ 3.100". En celular, los botones de Años y Rol miden unos 30 px (el contrato pide 44) | `negociacion-acuerdo-ind-1440.png`, `negociacion-ronda-fin-ind-360.png` | `NegotiationModal` (`Locker.tsx`), `.mk-neg`, `.mk-agree` | `max-width: 640px`; estructura de la sección 4.16; formatear con `wm()` en el registro; `.mk-neg .seg button { min-height: 44px }` en ≤ 760 px |
| M9 | Presupuesto: Caja lleva barra (el contrato dice que no, porque no tiene tope). Pasado el tope, la barra queda llena en `--accent-hi` sin "!" y la leyenda va en `--dim`. El resultado negativo no está en `--bad` y "pérdida" va como texto, no como chip. Aparece "US$ 0 mil". "Ver las finanzas del club" es `.linkish`, no `.btn.sm`. En el impacto, el negativo se escribe con guion: "US$ -59,7 M" en lugar de "−US$" | `presupuesto-negativo-ind-1440.png`, `bidbox-form-noentra-ind-1440.png` | `Budget` en `Market.tsx`, `ImpactBox` | Sección 4.14 del contrato. Una función `signedMoney` con "−" (U+2212) para el impacto y el balance |
| M10 | Bandeja: la cifra "Pediría US$ 2,6–4,3 mil" es un rango pero va en `--text` 800 (estilo de exacto), y se repite como hecho justo debajo. El rótulo "Si firma" queda pegado a los hechos, sin aire | `par-bandeja-acuerdo-ind-390.png` | Plantilla de acuerdo en `Inbox.tsx` | El rango en `.rng` con "(estimado)", o sacarlo de las cifras (B2 lo resuelve si las cifras salen de `dealKpis`). Margen de 12 px antes de `.mk-impact-w` |
| M11 | "Esperando respuesta" mide unos 200 px (el contrato pide unos 92, en una línea y sin entidades). "Para renovar" mide 84 px por fila (el contrato pide 56) y repite "Si no renueva, se va libre…" siete veces. El chip "Retirada" del Historial lleva un punto en lugar del reloj | `tratos-b-ind-1440.png`, `tratos-e-ind-1440.png` | `DealCard` (espera), `.mk-renew`, `dealLabel` | Sección 4.11 del contrato: `.mk-card.wait` compacta, la frase de renovación una sola vez en la descripción del grupo, `MI.clock` para Retirada y Se retiró |
| M12 | Libro cerrado: "El libro de pases está cerrado" aparece dos veces en la misma tarjeta. Seguimiento vacío: texto de 12 px en la tabla en lugar de `.ib-empty` con la estrella, y el panel lateral explica cómo elegir en una tabla vacía | `cerrado-tratos-ind-1440.png`, `seguimiento-ind-1440.png` | `ActRow` (motivos), `PickTable` | Decir el motivo una vez por bloque; ocultar el panel cuando no hay jugadores |
| M13 | Al marcar la primera casilla aparece la barra de acciones masivas encima de la tabla y la empuja 58 px: la fila que se acaba de tocar se mueve bajo el puntero (principio "Nada se mueve bajo el puntero"). Viene de antes, de `PlayerTable` | `buscar-marcadas-ind-1440.png` | `.bulkbar` | Reservar el alto de la barra mientras haya tabla, o mostrarla fija abajo |

---

## 3. Coherencia con el resto del juego

| Pantalla | Qué coincide | Qué no coincide |
|----------|--------------|-----------------|
| **Bandeja** | Las clases `.ib-who`, `.ib-kpi`, `.ib-due`, `.ib-fact`, `.ib-acts` (peligro a la derecha), F6 y la nota F7 son las mismas. La insignia "!4" del Mercado coincide con "Para decidir 4" | La anatomía del trato no es la misma (B2): cabecera, cifras, rótulos, impacto, orden de acciones y rieles. El primario de la contraoferta queda debajo del pliegue a 1440×900 |
| **Inicio** | La píldora ámbar "!N" es la misma que en la pestaña Tratos y en la barra | Los mosaicos "Mensajes" y "Para atender" muestran **un solo** pendiente ("una oferta por un jugador"), mientras el Mercado dice "!4", la bandeja "Para decidir 4" y la barra "4 Una oferta por un jugador, una…" (`consist-inicio-ind-1440.png`). Los mosaicos no cuentan los tratos: falta usar `pendingAll` |
| **Tácticas** | Las cajas de cifras (`.tkpis`, 800 tabular) se leen como `.ib-kpi` y como la franja | `.mk-kpi-v` mide 1,45rem (20,3 px), no los 1,35rem (18,9 px) del contrato y de `.tkpis b`. La franja pesa un poco más que el resto de las cifras grandes del juego |
| **Ficha de jugador** | La banda con el degradé sigue siendo exclusiva de la ficha. El panel del Mercado repite su orden en neutro | El sueldo exacto de un ajeno (B5). "Ofertar ▸" relleno con el color del otro club (M4). El título de la caja de oferta no usa el estilo de título de tarjeta que tiene "Contrato" en la misma fila (B4). La banda escribe los rangos con guion ("73-83") y el Mercado con raya ("83–93") |

---

## 4. Contraste de la implementación

- Los dos scripts dan 0 fallas.
- Pares que agrega la implementación y no estaban en el script:
  - `--accent-hi` como texto de enlace sobre el fondo de página: mínimo 6,68 (fila 49 del script, mismo par). Pasa.
  - `.mk-st.dec` en `color-mix(warn 14%, panel)`, cuando el contrato decía sobre `--panel2`: queda más claro que el par 15 (9,87). Pasa.
- No encontré texto en `--faint` dentro del Mercado.
- El único texto que falla el piso es por **tamaño**, no por contraste (B4).

---

## 5. Lo que hay que volver a revisar después de los cambios

1. Las capturas de Tratos a 1440 y a 390 con la raíz en 0: con B1 arreglado, el `seen()` de la prueba ya no corta las capturas.
2. Los pares bandeja / Tratos del mismo trato, lado a lado, a 1440 y a 390 (B2).
3. El impacto en el panel, en Tratos y en la ficha a 1440 y con texto al 120 % (B3).
4. `smallText` en cada pestaña, en la ficha y en la bandeja (B4).
5. La ficha de un ajeno conocido por debajo del 95 % (B5).
6. Decisión del usuario sobre M5 (clubes amarillos).
