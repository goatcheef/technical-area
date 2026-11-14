# UX Spec: Mercado de pases

> **Status**: In Design (primera versión, escrita por el ux-designer sin sesión de preguntas; las decisiones que son del usuario están en la sección 15 con recomendación. Sin revisar con /ux-review)
> **Author**: usuario + ux-designer
> **Last Updated**: 2026-11-14
> **Journey Phase(s)**: `design/player-journey.md`: fase 4 (descubrimiento del mercado: ojear, ofertar, negociar, responder ofertas), fase 5 (juego habitual: los dos libros de pases de cada temporada, "un libro de pases a punto de cerrar" como gancho de fin de sesión) y fase 2 (primer libro abierto desde el 10 de enero)
> **Screen / Flow Name**: `Market` (página `market` de `src/ui/Market.tsx`), con la oferta (`BidBox`, nuevo, en el panel del mercado y en `PlayerPage.tsx` › Contrato y mercado) y la negociación con el representante (`NegotiationModal` de `src/ui/Locker.tsx`)
> **Platform Target**: web. Escritorio primero (mouse y teclado); celular por navegador (toque) por debajo de 760 px. Sin gamepad (fuera de alcance, `design/accessibility-requirements.md`, AM-10).
> **Related GDDs**: `design/gdd/mercado-de-pases.md` (la fuente principal: UI Requirements, Formulas, Edge Cases), `economia-y-dirigencia.md` (presupuesto, caja, tope salarial, finanzas), `ojeo.md` (rangos, conocimiento, seguimiento), `plantel.md` (jugador que quiere irse, transferibles, rol prometido), `comunicacion-y-bandeja.md` (lo que el mercado manda a la bandeja; UR-02, UR-05, UR-08, UR-13, UR-16, UR-36). Otras fuentes: `CLAUDE.md` y `docs/plan-ui-ux.md`.
> **Related ADRs**: ninguna. Restricciones de `CLAUDE.md`: estado `Game` serializable, sin web worker, navegación por `nav()`, la pantalla no escribe en `g`.
> **Related UX Specs**: `design/ux/bandeja.md` (la decisión "oferta por un jugador" vive también ahí; mismas claves, mismas confirmaciones, mismo plazo), `design/ux/interaction-patterns.md` (patrones por id). Sin spec propia todavía: ficha de jugador (`PlayerPage`, solo su pestaña Contrato y mercado entra acá) y ficha de club.
> **Accessibility Tier**: Standard (`design/accessibility-requirements.md`: WCAG 2.1 AA, más 2.5.8 y 2.4.11; texto mínimo 14/12/11 px)
> **Template**: UX Spec

> **Supuestos de esta especificación**
> - **Documentos de diseño.** Como en la bandeja: el concepto, el recorrido del jugador y los documentos de cada sistema salen del código. El contexto de la sección 2 sale del recorrido (fases 4 y 5): un DT en la ventana de pases que quiere encontrar un refuerzo o sacarse un jugador, sin perder una oferta y sin gastar de más. No hay documento de HUD.
> - **Qué hace hoy el código** (la base de este diseño, verificada en `Market.tsx`, `PlayerPage.tsx`, `Locker.tsx`, `career.ts`, `squad.ts`): (1) la respuesta del club a una oferta es **instantánea** (`evaluateBid`); no existe "esperando respuesta". (2) El motor **no guarda nada** de lo que el DT oferta: el "sí" del club vive en el estado local de la ficha y se pierde si se cierra la ventana; la paciencia del representante vive en el estado local de la ventana y se reinicia al reabrirla. (3) Las ofertas recibidas viven en `g.offers` solo mientras están abiertas; aceptadas, rechazadas, retiradas y vencidas no dejan registro propio (solo la noticia de vencimiento y `g.transfers`). (4) En la pestaña Ofertas recibidas de hoy, Aceptar y Rechazar actúan con un solo clic y sin confirmación. (5) En la negociación, "Ofrecer" con un puntaje que alcanza ejecuta el pase en el mismo clic. La sección 8 lista lo que hace falta en el motor para el cuadro "dónde está cada trato".
> - **"Eventos"** quiere decir llamadas a funciones del motor (`src/engine/`) seguidas de `save()` y `refresh()`. No hay analítica.
> - **Sin audio**: las columnas de sonido dicen "—". **Un solo idioma** (español rioplatense).
> - **Lenguaje visual**: el estilo portal vigente y lo que aprobó el usuario en la bandeja (alcance segmentado, chips con contador, confirmación en el lugar, nota de resultado). Color, tipografía y peso visual son del art-director; acá solo se fija jerarquía, estados y contraste mínimo.
> - **Lecciones de las revisiones de la bandeja** (`production/ui/bandeja/review-*.md`) que esta spec incorpora desde el diseño: (a) la fila de acciones quedó recortada por reutilizar la clase global `.bar` (barra de progreso de 5 px) y por una barra fija detrás de la navegación inferior del celular: ninguna acción de esta pantalla va en una barra fija ni en un contenedor con `overflow` recortado, y ningún contenedor de acciones reutiliza clases genéricas (prefijo propio `mk-`); (b) Playwright hace clic en elementos recortados: los criterios de la sección 14 piden comprobar con `elementFromPoint` que cada botón y cada foco se ven; (c) el foco no puede quedar tapado por barras fijas (2.4.11): `scroll-margin`/`scroll-padding` de la altura de las barras; (d) cambiar de pestaña o de selección reemplaza la entrada del historial; (e) cada decisión cuenta una vez; (f) solo se marca como hecho lo que el DT hace a propósito.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

En una ventana de pases el DT hace cuatro cosas, siempre en este orden de preocupación: no perder una oferta por un jugador suyo que vence, encontrar el refuerzo que le falta sin gastar de más, saber en qué quedó cada cosa que empezó ("¿Independiente aceptó? ¿Qué me falta firmar? ¿Me bajó el presupuesto?"), y no pasarse de plata ni del tope de sueldos sin enterarse. El Mercado es el escritorio de esa ventana: arriba, si el libro está abierto y cuánto queda y cuánta plata hay; abajo, buscar, comparar, ofertar y llevar los tratos. Lo que más frustra: descubrir que el libro cerró mientras ojeaba, vender o fichar por un clic distraído (hoy "Aceptar" una venta y "Ofrecer" al representante son irreversibles sin confirmar), perder el "sí" del club por cerrar una ventana, y ver el valor exacto de un jugador que todavía no ojeó.

**The player goal**:

Encontrar un jugador, compararlo con otros dos y ofertar por él en no más de cuatro pasos desde la tabla (elegir, escribir el monto, ofertar, firmar), y responder una oferta por uno propio en dos pasos (Aceptar, Confirmar), sabiendo antes de confirmar cuánto cambian el presupuesto, la caja y la masa salarial.

**The game goal**:

Que toda oferta, acuerdo y venta pase por una función del motor con el estado guardado y deje un registro legible (`g.deals`); que lo irreversible se confirme con su consecuencia a la vista; que lo que el DT no ojeó se vea como rango (D4) y lo contractual (valor, pedido, sueldo, cláusula) como dato público; y que ninguna oferta vencida, acuerdo caído o cierre del libro pase en silencio.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Cuatro casos: (a) tocó Mercado en la barra o la tecla de la pantalla (fase 4, planificando refuerzos); (b) llegó desde la insignia de ofertas, el botón "Ir al mercado" de "Para atender" del Inicio o el enlace "Ver todos los tratos" de una oferta de la bandeja; (c) volvió de una ficha de jugador (atrás) a su búsqueda; (d) cerró la ventana de negociación y vuelve al trato. |
| What is their emotional state? | Expectativa y algo de ansiedad por la plata ("¿me alcanza?"). Con ofertas abiertas, urgencia leve por el plazo. Con el libro por cerrar, presión de calendario: es la única pantalla del juego donde el tiempo del juego corre contra el jugador, por eso el plazo se dice siempre en palabras (AC-02). Nunca presión de tiempo real: el tiempo no corre mientras la pantalla está abierta (AC-01, AC-03). |
| What cognitive load are they carrying? | Alta: tiene en la cabeza el hueco del plantel (qué puesto falta), la plata, el tope de sueldos, cuántos días quedan y lo que sabe y no sabe de cada candidato. Mitigación en 12: el estado del libro y los tres topes siempre en la misma franja, y el impacto de cada operación antes de confirmar. |
| What information do they already have? | El número de la insignia de Mercado (ofertas por jugadores abiertas) y, si vino de la bandeja, la oferta elegida. Del jugador que busca sabe lo que vio en la ficha breve o en el plantel rival: rangos de valoración y atributos, "conocés el N %". |
| What are they most likely trying to do? | Primero: responder una oferta abierta. Segundo: buscar un refuerzo por puesto, edad y precio, compararlo y ofertar. Tercero: retomar una negociación empezada. Cuarto (ocasional): revisar los movimientos del resto del mercado y las finanzas. |
| What are they likely afraid of? | Perder una oferta por vencimiento; vender a un titular sin querer; fichar a alguien peor de lo que parecía (el rango era ancho); pasarse del tope salarial y quedar sin margen para renovar; que el representante se levante de la mesa sin aviso; cancelar la ventana y perder el acuerdo; que el libro cierre justo antes de cerrar un trato; no entender por qué el club o el jugador dijeron que no. |

**Emotional design target for this screen**:

En control de la plata y del reloj: el DT sabe cuántos días quedan, qué puede pagar, en qué quedó cada trato y qué cambia con cada operación, y nada irreversible pasa sin que lo confirme con su costo escrito.

---

## 3. Navigation Position

**Screen hierarchy**:

```
Partida (barra superior, N1)
  └── Mercado (sección; una sola pantalla `market`)   ← esta pantalla
        ├── Buscar        (tabla de jugadores ajenos + panel del jugador con la oferta)
        ├── Tratos        (para responder, para cerrar, para renovar, historial)
        ├── Seguimiento   (la misma tabla y panel, con los jugadores que seguís)
        ├── Movimientos   (pases de todo el mercado; "Mis pases")
        ├── Presupuesto   (cuánto podés gastar y el balance de la temporada)
        ├── Ficha de jugador (N5, página `player`)         — desde la tabla (≤ 1180 px) o "Ver la ficha" del panel
        │     └── pestaña Contrato y mercado: la misma oferta (`BidBox`)
        ├── Ficha de club (N5, página `clubv`)             — desde un escudo o nombre de club (`data-cid`)
        ├── Negociación con el representante (F5, `NegotiationModal`) — modal sobre la pantalla
        ├── Comparador (F5, `Compare`)                      — modal sobre la pantalla
        └── Plantel / Bandeja / Club (finanzas)            — enlaces de lectura
```

**Modal behavior**: Non-modal. Es una página de la navegación (N1/N6). El tiempo no avanza mientras está abierta, salvo que el jugador apriete Continuar o Ir al partido (F4). La negociación y el comparador son ventanas F5 (Esc o "Cancelar" cierran y el foco vuelve al botón que las abrió); cerrar la negociación **no pierde el trato**: queda como "Acordado con el club" en Tratos (sección 6).

**Dónde vive cada flujo** (la decisión de diseño central, pregunta 6 de la sección 15):

| Flujo | Dónde | Por qué |
|-------|-------|---------|
| Buscar, filtrar, comparar y elegir | Mercado › Buscar y Seguimiento | Es el trabajo de la ventana: mirar muchos candidatos y descartar. Una tabla con la oferta al costado permite recorrer filas y ver el impacto sin salir. |
| **Ofertar por el pase o pedir un préstamo** | **Los dos**: panel del jugador de Mercado (≥ 1180 px) y ficha › Contrato y mercado, con **el mismo componente** (`BidBox`: mismo texto, mismas llamadas al motor, mismo registro) | Desde la tabla el DT quiere ofertar sin abrir la ficha (4 pasos, sin apilar historial); desde una ficha que le llegó por otro camino (informe de ojeo de la bandeja, ficha breve, club rival) la oferta ya está ahí. Con un solo componente no hay dos comportamientos. |
| **Negociar con el representante** | `NegotiationModal` (F5), abierto desde `BidBox` o desde una tarjeta de Tratos; **el trato queda guardado** | Es una decisión corta de 2 o 3 rondas (F5 la nombra); lo que cambia es que cerrarla no destruye el trato. |
| **Responder una oferta por un jugador propio** | **Los dos**: Mercado › Tratos y Bandeja (bloque "Para decidir"), mismo componente (`OfferDecision`), misma clave `offer{id}`, misma confirmación F6 y nota F7 | La bandeja es el lugar de "¿qué tengo que decidir?"; el Mercado es donde el DT compara ofertas entre sí y contra el presupuesto. Es **una decisión** (un `Offer` en `g.offers`): se responde una vez, en cualquiera de los dos lugares, y desaparece de los dos. |
| Dónde está cada trato | Mercado › Tratos | Es la vista que hoy no existe. |
| Renovar un contrato | Ficha › Contrato (como hoy) y acceso desde Tratos › Para renovar | La renovación usa la misma negociación pero no depende del libro; en la ventana el DT necesita ver quién se le va libre en diciembre. |

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Mercado en la barra de secciones (N1) | Clic | Insignia F3 con las ofertas por tus jugadores abiertas (el mismo número que los pendientes de tipo oferta de la bandeja; ver "Conteo" en la sección 8). |
| Barra inferior del celular, "Más" (N3) | Toque | Mercado no es una de las cuatro principales; está en el menú completo. |
| Tecla de número según el orden de `PAGES` (N9) | Tecla fuera de campos | Atajo de una tecla: se apaga con `settings.singleKeys`. |
| Barra de comandos (N7) | Ctrl+K → "Mercado" | Se suma "Tratos" como destino directo (`tab: 'tratos'`). |
| Insignia de Mercado | Clic | Abre Tratos con la primera oferta para responder. |
| "Ir al mercado" de "Para atender" (Inicio) | Clic | Abre la última pestaña usada. |
| "Ver todos los tratos" en una oferta de la bandeja | Clic | Abre Tratos con esa oferta elegida (`sel: 'offer12'`). Enlace de lectura; no responde. |
| "Ofertar" de un informe de ojeo de la bandeja, "Ofertar ▸" de la banda de la ficha | Clic | Va a la ficha › Contrato y mercado (el `BidBox` de la ficha). |
| Historial (N4) | ◂ ▸, Alt+←/→ | Restaura pestaña, filtros, selección, orden y scroll. |
| Guía de la primera partida (O1) y ayuda de pantalla (O2) | Sistema | El paso "Mercado" señala la barra de secciones. |

---

## 4. Entry & Exit Points

**Ruta del Mercado.** Toda la configuración visible va en la ruta (N4):

- `tab`: `buscar` | `tratos` | `seguimiento` | `movimientos` | `presupuesto`. Compatibilidad: `search` → `buscar`, `offers` → `tratos`, `short` → `seguimiento`, `moves` → `movimientos`, `fin` → `presupuesto`; cualquier otro valor cae en la pestaña por defecto.
- `sel` (campo opcional que ya existe en `Route`): en Buscar y Seguimiento, `p<id>` (el jugador del panel); en Tratos, la clave del trato (`offer<id>` como la de `pendingOf`, `deal<id>`, `renew<pid>`). Una sola clave de texto por selección.
- **Pestaña por defecto** (si la ruta no trae `tab`): la recordada con `useSticky('mk.tab')`; si nunca se eligió una, `tratos` cuando hay ofertas para responder y `buscar` si no (la regla de hoy, `Market.tsx:18`).
- Filtros de Buscar (`mk.pos`, `mk.age`, `mk.val`, `mk.ovr`, `mk.div`, `mk.only`), orden, línea y nombre de la tabla (`tbl.*.market`, `tbl.*.shortlist`) y la vista de columnas (`ta-table-<id>`) se recuerdan como hoy (C4). La selección de casillas no.

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Clic en Mercado, tecla, barra de comandos | Cualquier pantalla | Reemplazo de página, `page-in` 160 ms | `{ page: 'market' }` | Usa la pestaña recordada. |
| Insignia de Mercado | Barra de secciones | Igual | `{ page: 'market', tab: 'tratos' }` | Elige la primera oferta para responder (la de plazo más corto). |
| "Ver todos los tratos" | Bandeja, oferta | Igual; apila | `{ page: 'market', tab: 'tratos', sel: 'offer<id>' }` | El foco va a esa tarjeta (regla de "Primary focus element on open"). |
| "Seguir negociando" desde la ficha (nota del `BidBox`) | Ficha | Igual; apila | `{ page: 'market', tab: 'tratos', sel: 'deal<id>' }` | Opcional: la ficha ya abre la negociación sin salir. |
| Atrás o adelante | Ficha, otra pantalla | Restaura la entrada, sin `page-in` nuevo | Ruta guardada + scroll de la entrada | Si el `sel` guardado ya no existe (oferta respondida, jugador fichado), cae en la regla de "Selección al entrar". |

**Selección al entrar** (Buscar y Seguimiento, ≥ 1180 px): la de la ruta si existe y sigue en la tabla; si no, **ninguna** (el panel muestra "Elegí un jugador de la tabla para ver su oferta y su impacto" con la ayuda de teclado de la sección 7). No se elige la primera fila por defecto: ofertar sobre un jugador que el DT no eligió sería un error costoso, y no hay "leído" que proteger. En Tratos: la de la ruta; si no, la primera oferta para responder; si no hay, el primer trato para cerrar; si no, ninguna.

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Cambiar de pestaña | La misma pantalla | En el lugar; **reemplaza** la entrada del historial | `tab` en la ruta y en `mk.tab` | No apila: volver atrás sale del Mercado, no recorre pestañas. |
| Elegir otro jugador o trato (≥ 1180 px) | La misma pantalla | En el lugar; reemplaza la entrada | `sel` en la ruta | — |
| Clic o Enter en el nombre del jugador, "Ver la ficha" | Ficha (N5) | `nav()`, apila | — | Vuelve con pestaña, filtros, selección y scroll. |
| Clic en una fila (≤ 1180 px) | Ficha (N5) | `nav()`, apila | — | Sin panel: la oferta está en la ficha › Contrato y mercado. |
| Clic en un escudo o nombre de club (`data-cid`) | Ficha de club | `nav()`, apila | — | — |
| Ofertar compra, club acepta | `NegotiationModal` (F5) | Modal | El trato queda en `g.deals` como "Acordado con el club" | Se abre solo, como hoy; Esc o Cancelar cierran y el trato queda para seguir. |
| Pedir préstamo, club acepta | La misma pantalla | En el lugar | Préstamo ejecutado; trato "Prestado" | Sin negociación (regla de `mercado-de-pases`). |
| Aceptar, Pedir más o Rechazar una oferta | La misma pantalla, estado "Resuelto" | En el lugar | `acceptOffer` / `haggle` / `rejectOffer`; `save()` | Igual que en la bandeja (bandeja.md, sección 6). |
| Comparar (D3) | `Compare` (F5) | Modal | — | Cada columna trae "Ofertar" y "Seguir"; cerrar y elegir al jugador en el panel (o abrir su ficha, ≤ 1180 px). |
| "Negociar renovación" | `NegotiationModal` modo `renew` | Modal | — | Igual que desde la ficha. |
| Continuar o Ir al partido (barra superior, Espacio según G1) | La misma pantalla mientras avanza | F4 | — | Las acciones de oferta se deshabilitan durante el avance (7.3). |
| Cualquier otra navegación | Otra pantalla | `nav()` | `mk.tab`, filtros y scroll quedan guardados | — |

---

## 5. Layout Specification

Resolución de referencia: 1440 × 900 en escritorio; 360 × 740 en celular. Umbrales: panel del jugador desde **1180 px** (por debajo, la fila abre la ficha); franja de estado en dos filas por debajo de 900 px; navegación inferior y chips desplazables por debajo de 760 px.

### 5.1 ASCII Wireframe

**Escritorio (más de 1180 px): Buscar con el panel del jugador**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (barra superior N1 y barra de pantallas: Mercado [2])                                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ (i) Ayuda de pantalla O2, solo la primera vez                                            [Entendido] │
│ Mercado de pases                                                                                     │
│ ┌ LIBRO ───────────────────┐ ┌ PRESUPUESTO ┐ ┌ CAJA ────────┐ ┌ SUELDOS / TOPE ────────────────────┐ │
│ │ ✓ Abierto                │ │ US$ 2,1 M   │ │ US$ 3,0 M    │ │ US$ 410 mil / 480 mil              │ │
│ │ Cierra el 20 de febrero  │ │ para pases  │ │ para primas  │ │ margen US$ 70 mil por mes          │ │
│ │ (quedan 12 días)         │ └─────────────┘ └──────────────┘ └────────────────────────────────────┘ │
│ └──────────────────────────┘                                                                         │
│ [Buscar] [Tratos 2] [Seguimiento 6] [Movimientos] [Presupuesto]                      ← pestañas (C1) │
│ Puesto [Todos ▾] Categoría [Todas ▾] Val. mín. [60] Edad máx. [40] Precio [Sin límite ▾] [Solo trans…]│
├─────────────────────────────────────────────────────────────┬────────────────────────────────────────┤
│ [Ojeo|General|Contrato|Estadísticas|Físico] [Columnas]  [Todos|Arq|Def|Med|Del] [Filtrar por nombre] │
│ ☐ Jugador        Pos  Club        Edad  Val    Pot Conoc. Valor   Pedido  Sueldo  Contrato         │
│ ☐●Juan Pérez     DC   Lanús        24   62–74  –   35 %   1,0 M   1,4 M   7,1 mil 2027   ← fila    │
│ ☐ L. Gómez       DC   Banfield     27   70      ★★  100 %  1,2 M   1,3 M   9,0 mil 2026             │
│ …                                                           │ {panel del jugador, sticky, ver abajo} │
│ [Mostrar 100 más]                                           │                                        │
└─────────────────────────────────────────────────────────────┴────────────────────────────────────────┘
```

**Panel del jugador (columna derecha, 380 px, `position: sticky`, scroll propio si no entra)**

```
┌──────────────────────────────────────────┐
│ {cara 52} Juan Pérez            DC  62–74 │  ← valoración como rango (D4)
│ Lanús · Liga Profesional · 24 años        │
│ Conocés el 35 %   [Mandar a ojear]        │
│ Lo conocerías del todo en unos 15 días.   │
│ Pedido US$ 1,4 M · Valor US$ 1,0 M        │
│ Sueldo US$ 7,1 mil/mes · contrato dic 2027│
│ Potencial: Desconocido                    │
│ [Ver la ficha]  [☆ Seguir]  [Comparar]    │
├──────────────────────────────────────────┤
│ Ofertar por Juan Pérez                    │
│ Oferta (US$)  [ 1.400.000 ]               │
│ Cobraría unos US$ 7,9 mil por mes.        │  ← estimado (`wageDemand`)
│ Si el club acepta:                        │
│   Presupuesto  2,1 M → 0,7 M       entra  │
│   Caja         3,0 M → 1,6 M              │
│   Sueldos/mes  410 mil → 418 mil (tope 480)│
│   Plantel      27 → 28                    │
│ [● Ofertar compra]                        │
│ Préstamo: cargo [ 80.000 ] hasta fin de   │
│ temporada, cobra US$ 7,1 mil/mes.         │
│ [Pedir préstamo]                          │
│ {nota F7, role=status}                    │
└──────────────────────────────────────────┘
```

`●` marca el foco al pulsar Enter en una fila (campo "Oferta"). "Mostrar 100 más" es un botón propio al pie de la tabla.

**Escritorio: Tratos**

```
│ [Buscar] [Tratos 2] [Seguimiento 6] [Movimientos] [Presupuesto]                                     │
│ PARA RESPONDER · 2   Ofertas por tus jugadores. Vencen: las que vencen antes, arriba.               │
│ ┌ ! Vence en 3 días · el 18 nov ────────────────────────────────────────────────────────────────┐ │
│ │ {cara} Juan Pérez  DC 74 · Titular · 18 PJ          Racing Club  {escudo}  Liga Prof. · 4.º     │ │
│ │ OFERTA US$ 2,4 M   VALOR US$ 2,0 M   +20 % sobre su valor   SUELDO QUE LIBERÁS US$ 18 mil/mes   │ │
│ │ También ofertó Boca por Juan Pérez: US$ 2,1 M. Si aceptás una, la otra se cancela.             │ │
│ │ Si lo vendés: caja 3,0 → 5,4 M · presupuesto +1,44 M (60 %) · sueldos −18 mil · te quedan 2 DC │ │
│ │ [● Aceptar] [Pedir más] [Rechazar]   Pedir más: el club puede mejorar 15 % o retirarse.        │ │
│ │ {nota F7}                                                                                      │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ PARA CERRAR · 1   Acuerdos con el club a los que les falta el contrato                              │
│ ┌ Vence el 24 jun ───────────────────────────────────────────────────────────────────────────────┐ │
│ │ L. Gómez DC 70 · Banfield · acordado US$ 1,3 M · Rondas con el representante: 2 de 3           │ │
│ │ [● Seguir negociando] [Cancelar el trato]                                                      │ │
│ PARA RENOVAR · 3   Contratos que vencen en diciembre (se van libres si no renovás)                  │
│ ┌ M. Díaz MC 68 · dic 2026 · US$ 9 mil/mes · conformidad 62 ········ [Negociar renovación] ┐      │
│ HISTORIAL · 20 más recientes                                                       [Mostrar 20 más] │
│  14 nov  Firmado      Fichaste a R. Sosa · Talleres · US$ 1,1 M                                      │
│  12 nov  Sin acuerdo  Vélez no aceptó US$ 0,9 M por T. Ruiz · pidió US$ 1,2 M                        │
```

**Celular (≤ 760 px)**

```
BUSCAR                                  TRATOS
┌────────────────────────────────┐      ┌────────────────────────────────┐
│ [escudo] 14 nov  [Continuar]   │      │ [escudo] 14 nov  [Continuar]   │
├────────────────────────────────┤      ├────────────────────────────────┤
│ Mercado de pases               │      │ Mercado de pases               │
│ ✓ Libro abierto · cierra en    │      │ ! Libro abierto · cierra en    │
│   12 días (20 feb)             │      │   3 días (20 feb)              │
│ Presup. 2,1 M · Caja 3,0 M     │      │ Presup. 2,1 M · Caja 3,0 M     │
│ Sueldos 410 / 480 mil          │      │ Sueldos 410 / 480 mil          │
│ (Buscar)(Tratos 2)(Seguim.)→   │      │ (Buscar)(Tratos 2)(Seguim.)→   │
│ [Filtros: DC · ≤ 28 · ≥ 65 ▾]  │      │ PARA RESPONDER · 2             │
├────────────────────────────────┤      │ ┌ ! Vence en 3 días ─────────┐ │
│ {tabla: Jugador · Val · Pedido}│      │ │ Juan Pérez · DC 74         │ │
│ ☐ Juan Pérez DC   62–74 1,4 M  │      │ │ Racing ofrece US$ 2,4 M    │ │
│ ☐ L. Gómez   DC   70    1,3 M  │      │ │ +20 % sobre su valor       │ │
│ …                              │      │ │ [   Aceptar (≥ 44 px)    ] │ │
│ [Mostrar 100 más]              │      │ │ [Pedir más] [  Rechazar  ] │ │
├────────────────────────────────┤      │ └────────────────────────────┘ │
│ Inicio Bandeja Plantel Tác. Más│      │ Inicio Bandeja Plantel Tác. Más│
└────────────────────────────────┘      └────────────────────────────────┘
```

En celular las acciones van **dentro de la tarjeta, en el flujo del contenido** (no en una barra fija): el primario a todo el ancho en su fila, los demás en la fila siguiente. La página reserva `scroll-padding-bottom` igual a la navegación inferior más 16 px para que ningún foco quede tapado.

**Ventana de negociación (F5, 640 px de ancho máximo; en celular, ancho completo con scroll interno)**

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Contrato con Independiente                                                [Cancelar] │
│ {cara} Juan Pérez · 24 años · DC 62–74 · hoy cobra US$ 7,1 mil/mes                    │
│ Transferencia acordada: US$ 1,4 M (club: Lanús)                                       │
│ El representante pide US$ 8,7 mil por mes, 3 años, prima US$ 26 mil, rol Titular.     │
│ Paciencia: ●●○  quedan 2 de 3 rondas. Cada oferta que no alcanza gasta una.           │
│ Sueldo mensual [ 7.800 ]  Prima [ 15.000 ]  Cláusula (0 = sin) [ 0 ]                  │
│ Años [1][2][✓3][4][5]   Rol [Clave][✓Titular][Rotación][Suplente][Promesa]            │
│ ┌ Con estos términos ──────────────────────────────────────────────────────────────┐ │
│ │ Presupuesto 2,1 M → 0,7 M · Caja 3,0 M → 1,6 M (prima incluida)                  │ │
│ │ Sueldos/mes 410 mil → 418 mil · tope 480 mil · Plantel 27 → 28                   │ │
│ │ ! Con este sueldo superás el tope por US$ 3 mil (esto no gasta paciencia).        │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ {historial de respuestas del representante, role=status}                              │
│ [Cancelar]                                                              [● Ofrecer]   │
│ ── si hay acuerdo ─────────────────────────────────────────────────────────────────── │
│ ¡Hay acuerdo! Falta tu confirmación.   [Seguir negociando]  [● Confirmar: fichar a    │
│                                          Juan Pérez, US$ 1,4 M + prima US$ 15 mil]    │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Ayuda de pantalla | `PageTip id="market"` (O2) | Ancho completo, una línea | No | Se descarta con "Entendido" |
| Franja de estado | Libro (abierto, cuánto queda; cerrado, cuándo reabre) y tres KPI (Presupuesto, Caja, Sueldos/tope con margen). Reemplaza al encabezado "hero" de 2,2 rem de hoy | Ancho completo, ~72 px (dos filas de ~56 px por debajo de 900 px; 2 × 2 en celular) | No | Los montos largos se acortan con `money()`; nunca elipsis en el estado del libro |
| Pestañas | Cinco opciones (C1/N6) con contador solo en Tratos y Seguimiento | Ancho completo, ~40 px | Horizontal solo en celular (chips con degradé en el borde) | La página no se desplaza de costado (AV-06) |
| Filtros de Buscar | Puesto, categoría, valoración mínima, edad máxima, precio máximo, "Solo transferibles o con contrato por vencer" | Ancho completo, ~56 px (2 filas por debajo de 1100 px) | No | En celular, una línea-resumen "Filtros: DC · ≤ 28 · ≥ 65 ▾" que despliega los controles en el lugar (`aria-expanded`) |
| Tabla | `PlayerTable` (D1) con `onPick` | ≥ 1180 px: ancho restante menos 380 px, mín. 560 px; menos: ancho completo | Vertical con la página | Oculta columnas por prioridad (`PRIO`); sin desplazamiento horizontal |
| Panel del jugador | Datos del jugador elegido y `BidBox` | 380 px, `position: sticky` bajo la franja de pestañas | Vertical propio si no entra (`max-height` = alto visible menos barras) | El contenido largo se lee completo; los botones de oferta quedan al final del contenido, nunca en una barra fija |
| Tratos | Cuatro grupos de tarjetas: Para responder, Para cerrar, Para renovar, Historial | Ancho completo, columna de hasta 960 px | Con la página | Cada grupo con encabezado y número; "Para responder" nunca se colapsa |
| Movimientos | Tabla simple con filtro "Mis pases / Todos" | Ancho completo | Con la página | "Mostrar 80 más" |
| Presupuesto | Tres medidores y balance de la temporada | Ancho completo, dos columnas ≥ 900 px | Con la página | — |

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| Ayuda de pantalla | Nota | Ayuda | "Lo que ves de un jugador ajeno es un rango; mandalo a ojear antes de ofertar. El libro de pases abre del 1 de enero al 20 de febrero y del 25 de junio al 10 de agosto." (corrige la guía, que hoy dice "enero y julio") | Sí | Sí — O2 `PageTip`; actualizar `TIPS` y el paso 6 de `Guide.tsx` |
| Título "Mercado de pases" | `h2` | Franja | Nombre de la pantalla (AC-09) | Sí | Sí |
| Estado del libro | Bloque de texto con ícono (✓ / ! / cerrado) | Franja | "Libro abierto · cierra el 20 de febrero (quedan 12 días)", "! … cierra mañana", "Libro cerrado · reabre el 25 de junio (faltan 41 días)". Texto, nunca solo color | Sí | No — nuevo; reemplaza al h1 "Libro abierto / cerrado". Datos de `windowState` (sección 8) |
| KPI de presupuesto | `.kpi` | Franja | Presupuesto de pases, con la leyenda "para pases" | Sí | Sí — `.kpi` |
| KPI de caja | `.kpi` | Franja | Caja, con la leyenda "para primas"; en rojo y con signo "−" si es negativa | Sí | Sí — `.kpi` |
| KPI de sueldos | `.kpi` | Franja | Masa salarial / tope y el margen ("margen US$ 70 mil por mes"); si la masa pasa el tope, "pasaste el tope por US$ X" con "!" | Sí | Sí — `.kpi` |
| Pestañas del Mercado | Segmentado | Pestañas | Cinco secciones, una activa | Sí | Sí — C1 `Seg` (hoy un `.seg` armado a mano) con `aria-pressed` y estado activo con ✓ (decisión 3 de la bandeja); en celular, fila de chips desplazable (C5) |
| Contador de pestaña | Número `.cnt` + `.vh` | Pestañas | Tratos: ofertas para responder (en tono de aviso, con "!"); Seguimiento: jugadores seguidos | Sí | Sí — contador de C5 |
| Filtros de Buscar | Selects, deslizadores y alternable | Filtros | Los de hoy, con nombres de categoría de `divName`/`DIV_NAMES` (hoy hardcodeados) y la opción "Primera B y Federal A" | Sí | Parcial — el bloque de hoy; el desplegable de celular es nuevo |
| Tabla de jugadores | `PlayerTable` con `onPick` | Tabla | La tabla única (D1) con vistas Ojeo, General, Contrato, Estadísticas y Físico; la vista Ojeo suma la columna `deal` ("Trato": Acordado, Sin acuerdo, —) y `scoutEta` | Sí | Sí — D1; **cambios**: `onPick` (la fila elige en vez de abrir), foco itinerante, columna `deal` (pregunta 12) |
| Barra de acciones masivas | `.bulkbar` (D2) | Tabla | Seguir, Dejar de seguir, Mandar a ojear, Comparar | Sí (con selección) | Sí — D2 `scoutBulk`; con `scroll-margin-top` igual a su alto para no tapar el foco |
| Panel del jugador | Región (`aside` con `aria-label="Jugador elegido"`) | Panel | Datos del elegido, `BidBox` y notas | Sí (≥ 1180 px) | No — nuevo (patrón "panel de lectura al costado de una tabla", variante de F1; pregunta 15) |
| Datos del elegido | Bloque | Panel | Cara, nombre, puesto, valoración (`Val`, rango), club, categoría (`divName`), edad, "Conocés el N %", pedido, valor, sueldo, contrato, cláusula, potencial (si se sabe) | Sí | Sí — `Face`, `PosPill`, `Val` (D4), `Badge`, `knowOf` |
| Ojeo desde el panel | Botón + línea | Panel | "Mandar a ojear" y "Lo conocerías del todo en unos 15 días" (`scoutEta`); si el libro cierra antes, "El libro cierra antes: lo vas a conocer a medias" | Sí (si k < 100) | Sí — `scout`; texto nuevo |
| `BidBox` | Componente compartido | Panel y ficha › Contrato | Monto de la compra, estimación de sueldo, impacto, "Ofertar compra", bloque de préstamo con su propio cargo, nota de resultado | Sí | No — nuevo, reemplaza la tarjeta "Negociar" de `PlayerPage.tsx:132-137` |
| Vista previa de impacto (`DealImpact`) | Tabla de 4 filas | `BidBox`, negociación, tarjeta de oferta | Antes → después de presupuesto, caja, sueldos por mes (con el tope) y plantel; "entra / no entra" en palabras | Sí | No — nuevo; datos de `dealImpact` (sección 8) |
| Nota de resultado | Texto `role="status"` | `BidBox`, tarjetas | "Independiente aceptó US$ 1,4 M. Falta el contrato con el jugador." / "Lanús rechazó la oferta. Aceptarían US$ 1,6 M." con botón "Ofertar US$ 1,6 M" | Sí | Sí — F7, con `role="status"` |
| Tarjeta de trato | Grupo (`role="group"` con nombre) | Tratos | Una oferta, un acuerdo, un contrato por renovar o un cierre del historial; las plantillas están abajo | Sí | Parcial — anatomía de la plantilla "Oferta por un jugador" de la bandeja (`OfferDecision`), compartida |
| Encabezado de grupo de Tratos | `h3` con número | Tratos | "Para responder · 2", "Para cerrar · 1", "Para renovar · 3", "Historial" | Sí | Sí — variante de `.ib-block-h` con borde de aviso solo en "Para responder" |
| Confirmación en el lugar | Par de botones | Tarjeta, negociación | "Confirmar: vender a Pérez a Racing por US$ 2,4 M" / "No"; "Confirmar: fichar a Pérez, US$ 1,4 M + prima US$ 15 mil" / "Seguir negociando" | En lo irreversible | Sí — F6 (resuelve G5 para el mercado) |
| Ventana de negociación | Modal | Sobre la pantalla | Lo que pide el representante, formulario, paciencia, impacto, historial y confirmación final | Sí | Sí — F5 `NegotiationModal`; **cambios**: paciencia guardada y visible, impacto en vivo, confirmación final F6, sin datos exactos de ajenos (secciones 5.1 y 6) |
| Comparador | Modal | Sobre la pantalla | Dos o tres jugadores lado a lado; suma "Cabe en tu presupuesto" y "Cabe en tu tope" y por columna "Ofertar" y "Seguir" | Sí | Sí — D3 `Compare`; cambios menores |
| Tabla de movimientos | Tabla | Movimientos | Fecha, jugador, desde, hacia, monto; filtro "Mis pases / Todos" | Sí | Sí — la de hoy; `.me` en los propios |
| Medidor de límite | Barra + número + texto | Presupuesto | Presupuesto, caja y tope salarial: cuánto se usó, cuánto queda y qué limita cada uno | Sí | Sí — `.bar` con número visible (D6) |
| Estado vacío | Texto | Cada zona | F8 con causa y cuándo se llena | Sí | Sí — F8 |
| Estado del guardado | Nota F7 en `--bad` | Tarjeta, panel | "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión…" | Sí | Sí — `save()` devuelve booleano (resuelto en la bandeja) |

**Plantillas de tarjeta de Tratos** (qué muestra cada tipo; el primario es la acción esperada y el peligro va último):

| Tipo | Quién | Cifras clave | Línea extra | Acciones (orden) |
|------|-------|--------------|-------------|-----------------|
| **Oferta por un jugador tuyo** (`offer`) | Jugador (cara, puesto, valoración exacta, rol en el plantel, partidos) y club que ofrece (escudo, categoría y puesto en la tabla, o chip "Exterior") | Oferta, Valor, Diferencia con signo y palabras ("+20 % sobre su valor", "15 % bajo su valor"), Tu pedido estimado, Sueldo que liberás | Plazo en palabras con fecha (`offerDeadline`); "Mejorada N veces" si `asks > 0`; otras ofertas por el mismo jugador ("También ofertó Boca: US$ 2,1 M. Si aceptás una, la otra se cancela"); impacto de la venta; si es del exterior, "Se va al exterior y no vuelve al fútbol argentino" | **Aceptar** (primario, F6: "Confirmar: vender a X a Racing por US$ 2,4 M"; deshabilitado con el libro cerrado y el motivo escrito debajo), **Pedir más** (común; deshabilitado con el libro cerrado; debajo, siempre visible: "El club puede mejorar 15 % o retirarse"), **Rechazar** (peligro bordeado, F6: "Confirmar rechazo") |
| **Acuerdo por cerrar** (`deal` en estado `agreed`) | Jugador ajeno (valoración como rango) y club vendedor | Monto acordado, Pedido original, Sueldo que pide el representante (o el estimado si no abrió la mesa), Prima, Rondas con el representante ("2 de 3") | Plazo del acuerdo (pregunta 3); "El club ya aceptó; falta el contrato con X."; impacto con los últimos términos ofrecidos | **Seguir negociando** (primario; abre la negociación con la paciencia y los términos guardados), **Cancelar el trato** (común; sin F6: no se pagó nada, queda en el historial como "Cancelado por vos") |
| **Contrato por renovar** (`renew`) | Jugador propio (cara, puesto, valoración, rol, conformidad con número) | Contrato ("dic 2026"), Sueldo, Valor | "Si no renueva, se va libre al empezar la temporada." / "No quiere negociar hasta el {fecha}" si `negBlock` | **Negociar renovación** (primario; deshabilitado con `negBlock`, con el motivo escrito), Ver la ficha |
| **Cierre del historial** | Jugador y club | Monto, fecha | Estado en texto con ícono (tabla de estados, sección 6); la contraoferta si el club la dio | Ver la ficha (enlace). Sin acciones |

**Primary focus element on open**: según la pestaña y cómo se llegó. Buscar: el primer control de filtro (Puesto); si la ruta trae `sel`, la fila elegida. Tratos: el botón primario de la tarjeta elegida (la de la ruta, o la primera para responder); sin tratos, el título de la pestaña. Seguimiento: la primera fila de la tabla (o el texto vacío). Movimientos: el filtro "Mis pases / Todos". Presupuesto: el título. En todos los casos, tras un cambio de pestaña con teclado el foco **se queda en la pestaña** que se tocó (el contenido cambia, el foco no se mueve solo).

### 5.4 Information Hierarchy

1. **¿Está abierto el libro? ¿Cuánto queda?** La primera lectura de la pantalla, en la franja, con palabras. Condiciona qué botones funcionan.
2. **¿Tengo algo que responder?** La insignia y el contador de Tratos, y "Para responder" arriba de Tratos, ordenado por plazo (igual que "Para decidir" de la bandeja).
3. **¿Me alcanza?** Presupuesto, caja y masa salarial contra el tope, siempre visibles; y el impacto antes → después en cada oferta.
4. **Qué sé del jugador y qué no.** Valoración como rango, "Conocés el N %", potencial "Desconocido", y la salida directa a ojearlo, antes del precio.
5. **Qué hacer con él.** La oferta (monto, estimación de sueldo, impacto, botón).
6. **Dónde quedó cada cosa.** Para cerrar e Historial de Tratos.
7. **Puede esperar**: Movimientos del resto del mercado, el balance de la temporada, mensajes viejos del historial.

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Carga | — | No existe: el estado está en memoria | — | Dibuja en el primer cuadro. Sin esqueletos. |
| Libro abierto | `windowState.open` y quedan más de 7 días | "✓ Abierto · cierra el 20 de febrero (quedan 12 días)" | Todo habilitado | Estado normal. |
| Libro por cerrar | Quedan 7 días o menos | "! Abierto · cierra en 3 días (el 20 de febrero)"; "! cierra mañana"; "! cierra hoy" | Igual; las tarjetas de acuerdo muestran "el libro cierra antes de que venza" si corresponde | Texto con "!" y palabras, no solo tono de advertencia. |
| Libro cerrado | `!windowOpen` | "Libro cerrado · reabre el 25 de junio (faltan 41 días)"; tono neutro, no de error | Se deshabilitan **Ofertar compra, Pedir préstamo, Aceptar y Pedir más**, cada uno con el motivo escrito debajo ("El libro de pases está cerrado. Reabre el 25 de junio."); siguen habilitados buscar, filtrar, comparar, Seguir, Mandar a ojear, Rechazar, Negociar renovación, Cancelar el trato | El motivo no queda solo en `title` (AC-05). Los acuerdos abiertos pasan a "Se cayó: se cerró el libro" (pregunta 3). |
| Cambio de estado del libro | La fecha cruza una frontera (avance con la pantalla abierta) | La franja se actualiza; texto oculto `.vh` en una región `aria-live="polite"`: "El libro de pases cerró." / "Abrió el libro de pases." | — | Una sola vez por cruce; el resto de la franja no se anuncia. |
| Buscar poblado | Hay jugadores que cumplen los filtros | Tabla con vista Ojeo por defecto, orden por valoración conocida (`knownRating`) | Todo habilitado | — |
| Buscar vacío | Ningún jugador cumple | F8: "No hay jugadores que cumplan esos filtros. Probá con otro puesto, más edad o sin límite de precio. No hay jugadores libres para fichar: solo se compra o se pide a préstamo a jugadores de otros clubes." | "Limpiar filtros" (botón común) | — |
| Panel sin elegir | ≥ 1180 px, sin `sel` | "Elegí un jugador de la tabla para ver su oferta y su impacto. Con el foco en la tabla: ↑ ↓ para recorrer, Enter para elegir, Espacio para marcar." | — | La ayuda de teclado está escrita, no solo en `title` (AC-05). |
| Jugador elegido | Fila elegida | Fila con fondo `--accent-soft` y borde izquierdo de 3 px (`--sel`), `aria-selected="true"`; panel con sus datos | La selección va en la ruta (`sel`), reemplaza la entrada | El panel nunca muestra la valoración, potencial ni atributos exactos de un jugador con conocimiento < 100: usa `shown`. |
| Jugador desconocido | `knowOf < 60` | Valoración en rango, "Potencial: Desconocido", "Personalidad: desconocida" | Aviso no bloqueante junto a "Ofertar compra": "Lo conocés al 35 %: su valoración real puede estar en cualquier punto del rango." | La oferta no se confirma por esto; es información (el DT puede querer ofertar igual). |
| Jugador ojeándose | `g.scouting` lo incluye | Botón "Ojeándolo…" deshabilitado con "Lo van a conocer del todo en unos 9 días" | — | — |
| Ojeo lleno | Ya hay 10 en `g.scouting` y se manda uno más | Debajo del botón: "Ya ojeás a 10: al sumarlo se deja de ojear a {nombre}." | Sin F6: es reversible y barato | Hoy la ficha lo hace en silencio (`ojeo.md`, Edge Cases). |
| Oferta en edición | El DT cambia el monto | Impacto y texto de "entra / no entra" se recalculan a cada tecla | — | El campo acepta enteros; con 0 o vacío, "Ofertar compra" deshabilitado con "Escribí un monto". |
| Oferta bloqueada por el motor | `evaluateBid` devuelve `ok: false` | Nota F7 en tono de advertencia con el motivo del motor ("Banfield no puede desprenderse del jugador: se queda sin recambio.") | Ninguno de estos motivos cuesta nada | Cada motivo es el texto de `reason`; no se reescribe. |
| Rechazo con contraoferta | `evaluateBid` devuelve `counter` | Nota F7: "Lanús rechazó la oferta. Aceptarían US$ 1,6 M." más botón primario "Ofertar US$ 1,6 M" | El monto del campo pasa a 1.600.000 y se anuncia | Hoy el campo cambia en silencio. |
| Club acepta (compra) | `evaluateBid.ok` | Nota F7: "Lanús aceptó US$ 1,4 M. Ahora hay que arreglar con el jugador." y se abre la negociación | Se crea el trato en `g.deals` con estado "Acordado con el club" | Se abre sola, como hoy (Pilar 4: pocos clics). |
| Préstamo concedido | `evaluateBid.ok` con `loan` | Nota F7: "Juan Pérez llega a préstamo hasta fin de temporada. Cobra US$ 7,1 mil por mes." | Ejecuta el pase; trato "Prestado" | Sin F6 propia: el costo (cargo y sueldo) y el plazo están escritos junto al botón y en el impacto antes de apretar. |
| Negociación abierta | Se abre la ventana | Formulario con la primera oferta propuesta (90 % del sueldo y 60 % de la prima), paciencia con "N de M rondas", impacto en vivo | Paciencia y términos se guardan en el trato después de cada ronda (pregunta 4) | — |
| Control duro de la negociación | Sueldo sobre el tope o prima sobre la caja | Aviso "!" encima del botón: "Con este sueldo superás el tope por US$ 3 mil. Esto no gasta paciencia." | "Ofrecer" sigue habilitado; el motor contesta con el mismo texto y no resta paciencia | — |
| Acuerdo con el jugador (por confirmar) | `evalOffer.ok` | El bloque de abajo de la ventana cambia: "¡Hay acuerdo! Falta tu confirmación." con **Confirmar: fichar a X, US$ monto + prima US$ Y** (primario, F6) y "Seguir negociando" | **Ya no ejecuta el pase en el mismo clic de "Ofrecer"** (hoy sí, `Locker.tsx:104-105`) | Cambiar cualquier campo cancela el acuerdo y vuelve a "Ofrecer". |
| Firmado | Confirmar | Nota F7 en verde (con "✓"): "Firmó. Juan Pérez es nuevo jugador de Independiente." En el panel, "Ya es tuyo" y "Ver la ficha"; la fila sale de la tabla | `signDeal`; trato "Firmado"; sale de la lista de seguimiento (lo hace `doTransfer`) | Si el elegido deja la tabla, el foco va a la fila siguiente y se anuncia. |
| Ruptura | `evalOffer.walk` | Nota en `--bad` con "✗": "El representante de Juan Pérez da por terminada la negociación. La operación se cayó." | Trato "Se cayó"; noticia "Se cayó el pase de X" (ya existe); bloqueo para volver a ofertar por él (pregunta 4) | El motivo se dice en el texto; no solo color. |
| Trato pendiente al cerrar la ventana | Esc o Cancelar con acuerdo del club sin firmar | La ventana se cierra; en Tratos > Para cerrar aparece la tarjeta | El foco vuelve al botón que la abrió | Hoy el "sí" se perdía. |
| Oferta recibida vigente | `g.offers` | Tarjeta con acciones | — | — |
| Oferta mejorada | `haggle` devuelve `true` | Nota F7: "Racing mejoró su oferta: ahora US$ 2,8 M." (monto nuevo, mismo id y plazo); "Mejorada 1 vez" en la tarjeta | La tarjeta sigue en "Para responder" | Igual que la bandeja (conserva el id, `o.asks`). |
| Oferta retirada | `haggle` devuelve `false` | Nota F7 en advertencia: "Racing se retiró de la negociación." | Estado "Resuelto" (abajo); entra al historial como "Se retiró" | — |
| Resuelto | Acción confirmada | La tarjeta queda en su lugar con "✓ Resuelto" en texto y tono tenue hasta cambiar la selección o salir; muestra la nota F7 y, si quedan, "Siguiente para responder ▸" (primario) | El foco va a "Siguiente para responder" o, si no hay, a la nota | Igual que la bandeja: el panel no salta bajo el cursor. La copia local de lo resuelto es estado de la interfaz, no del juego. |
| Oferta vencida o respondida en la bandeja | La oferta desapareció de `g.offers` | La tarjeta, si estaba elegida, reemplaza sus acciones por texto tenue: "Esta oferta venció el 18 nov." / "Ya respondiste esta oferta." | Desaparece al refrescar si no está elegida | Distinguir "venció" de "respondida" sale del registro (`g.deals`); sin él, texto genérico de F2. |
| Plazo corto | Vence hoy o mañana | "Vence hoy" / "Vence mañana" con "!" | — | Texto, no solo color. |
| Avance en curso | F4 corriendo | Las acciones de oferta, Aceptar, Pedir más y las de la negociación se deshabilitan con "Frená el avance para decidir" visible; buscar y leer siguen | Ver 7.3 | — |
| Modal abierta | Negociación o comparador | Fondo oscurecido (F5) | La pantalla de atrás no responde al teclado | — |
| Entidad inexistente | El jugador se retiró, se fue al exterior o lo fichó otro | En un panel o tarjeta: "Ya no está disponible." y acciones ocultas; el historial conserva su nombre (snapshot) | El trato pasa a "Se cayó" | — |
| Jugador a préstamo en su club | `loanFrom != null` | En el panel: "Está a préstamo de {club}: no se puede comprar ni pedir a préstamo." (texto del motor) y botones deshabilitados con ese motivo | — | Regla de `evaluateBid`. |
| Plantel lleno | 45 jugadores | "Tu plantel ya tiene 45 jugadores: vendé o liberá a alguien antes de ofertar." (motivo escrito) | Botones deshabilitados | Se avisa antes de apretar, no solo después. |
| Tratos vacío | Sin tratos ni contratos por vencer | F8 por grupo: Para responder: "No hay ofertas por tus jugadores. Con el libro abierto los clubes del país y del exterior ofertan; si declarás transferible a alguno, llegan más." Para cerrar: "No hay acuerdos abiertos. Cuando un club acepte tu oferta y falte el contrato, aparece acá." Para renovar: "Ningún contrato vence este año." Historial: "Todavía no cerraste ningún trato." | — | — |
| Seguimiento vacío | `shortlist` vacío | F8: "No seguís a ningún jugador. Marcalos en Buscar y tocá Seguir; los que mandes a ojear entran solos." | — | — |
| Error al guardar | `save()` falla | Nota F7 en `--bad`: "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes." | El estado del juego ya cambió en memoria; no se revierte | Igual que la bandeja. |
| Celular / ≤ 1180 px: sin panel | Ancho ≤ 1180 px | La tabla ocupa todo; tocar una fila abre la ficha | La oferta está en la ficha › Contrato y mercado | — |

**Estados de un trato** (texto visible en historial y tarjetas; ícono + palabra, nunca solo color):

| Estado (`Deal.state`) | Lado | Texto | Terminal | Cómo se llega |
|---|---|---|---|---|
| `refused` | Compra o préstamo | "Sin acuerdo con el club" (+ "pidió US$ 1,6 M" si hubo contraoferta) | Sí, salvo que el DT vuelva a ofertar (actualiza el mismo trato) | `evaluateBid` con `ok: false` |
| `agreed` | Compra | "Acordado con el club · falta el contrato" | No | Club aceptó; la negociación no se cerró |
| `signed` | Compra | "Firmado" | Sí | `signDeal` |
| `loaned` | Préstamo | "Prestado hasta fin de temporada" | Sí | Préstamo ejecutado |
| `fell` | Compra | "Se cayó" + motivo: "el representante se levantó de la mesa", "se cerró el libro", "venció el acuerdo", "cancelado por vos", "otro club lo compró" | Sí | `walk`, cierre del libro, plazo, cancelar, jugador ya no está |
| `sold` | Venta | "Vendido a {club} por US$ X" | Sí | `acceptOffer` |
| `declined` | Venta | "Rechazaste la oferta de {club}" | Sí | `rejectOffer` |
| `withdrawn` | Venta | "{club} se retiró de la negociación" | Sí | `haggle` falso |
| `expired` | Venta | "Venció la oferta de {club}" | Sí | `marketTick` |

No hay "esperando respuesta": el club contesta al instante (pregunta 2).

---

## 7. Interaction Map

Entradas cubiertas: mouse y teclado (escritorio), toque (celular). Gamepad: fuera de alcance.

**Decisión de teclado.** No se agregan atajos de una letra (el nivel Estándar exige poder apagarlos, AM-03; la biblioteca los prohíbe fuera del partido, N9). En la tabla con `onPick`, las filas tienen **foco itinerante** (una sola parada de Tab, como la lista de la bandeja): ↑ ↓ mueven el foco, **Enter elige** al jugador (el panel se muestra y el foco pasa al campo "Oferta"), **Espacio marca o desmarca la casilla** de selección múltiple (D2; como en un `listbox` de selección múltiple, Espacio no es Continuar porque la fila tiene función propia, AM-02), Mayús + ↑ ↓ extiende la selección. Con eso, ofertar con teclado desde la tabla es: ↓ hasta la fila, Enter (foco al monto), Enter (ofertar), Enter (firmar en la ventana). Responder una oferta es: Tab a la tarjeta, Enter (Aceptar abre la confirmación), Enter (confirma).

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| Tab / Mayús + Tab | Teclado | Recorre zonas en el orden de la sección 12 | Foco visible (A2) | — | La tabla es **una sola parada** (la fila elegida o la primera, `tabindex="0"`); "Mostrar más" es otra parada, justo después, fuera de la tabla. |
| ← / → | Teclado, foco en las pestañas, en un segmentado o en la fila de chips | Mueve el foco entre opciones; Enter o Espacio eligen | Foco visible | — | Pestañas con foco itinerante (C1/N6). No cambian de pestaña solas al mover el foco. |
| ↑ / ↓ | Teclado, foco en una fila de la tabla (`onPick`) | Mueve el foco a la fila anterior o siguiente | Foco y `scrollIntoView({ block: 'nearest' })`, sin animación; con `scroll-margin` igual a las barras fijas | — | El oyente va en la tabla, no en `window`; ignora la tecla si `defaultPrevented` (con un menú N2 abierto el foco está en el menú). No elige: Enter elige. |
| Inicio / Fin, Re Pág / Av Pág | Teclado, foco en la tabla | Primera o última fila cargada; salta 10 filas | Igual | — | — |
| Enter | Teclado, foco en una fila | **Elige** al jugador y lleva el foco al campo "Oferta" del panel | Fila elegida (borde y fondo), panel | — | ≤ 1180 px, Enter abre la ficha (comportamiento de hoy, D7). Elegir **no** hace nada irreversible. |
| Espacio | Teclado, foco en una fila | Marca o desmarca su casilla (D2) | Casilla y barra de acciones masivas | — | Solo en la tabla con `onPick`. Con los atajos de una tecla apagados, igual. |
| Mayús + ↑ / ↓ | Teclado, foco en una fila | Extiende la selección de casillas (como Mayús + clic) | Casillas | — | Equivalente por teclado de la selección por rango de D2. |
| Esc | Teclado, foco en el panel | Vuelve el foco a la fila elegida | — | — | Si hay una confirmación F6 abierta, primero la cancela. |
| Esc | Teclado, ventana de negociación o comparador | Cierra (F5); el foco vuelve al botón que la abrió | — | — | Cerrar la negociación con un acuerdo del club guarda el trato; no pierde nada. |
| Esc | Teclado, desplegable de filtros del celular | Pliega los filtros; foco al botón "Filtros" | — | — | — |
| Esc | Teclado, tabla o tarjetas | Sin acción propia | — | — | Sigue al manejo global (N9). |
| Mouse: hover en fila | Escritorio | — | Fondo `--panel2` | — | No elige. |
| Mouse: hover en nombre o escudo (`data-pid`, `data-cid`) | Escritorio | Ficha breve (I1) a los 380 ms | `.hovercard` | — | Ninguna decisión depende de ella (AC-06): el panel y las tarjetas repiten los datos. |
| Clic en fila | Escritorio ≥ 1180 px | Elige al jugador (panel); no mueve el foco al panel | Fila elegida | — | El nombre es un enlace (`linkish`) que abre la ficha; el clic en el resto de la fila elige. ≤ 1180 px, el clic abre la ficha. |
| Toque en fila | Celular | Abre la ficha | `page-in` 160 ms | — | — |
| Rueda | Escritorio | Desplaza la página o el panel según dónde esté el puntero | — | — | El panel es `sticky` y con scroll propio. |
| Clic derecho | Escritorio | Sin acción propia | — | — | — |
| Deslizar | Celular | Desplazamiento vertical nativo; la fila de chips y la tabla (si hay columnas ocultas) no se desplazan de costado | — | — | Sin gestos propios (chocarían con el atrás del sistema). |

### 7.2 Action Inputs

| Input | Platform | Context (What must be focused) | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|-------------------------------|--------|----------|-----------|-----------|-------|
| Clic / Enter / Espacio / toque | Todas | Pestaña del Mercado | Cambia de pestaña | Contenido nuevo; **reemplaza** la entrada del historial; el foco queda en la pestaña | Ninguna | — | `aria-pressed`; estado activo con borde, fondo suave y ✓ (no relleno de acento). |
| Cambiar | Todas | Filtros de Buscar | Filtra la tabla | La tabla se recalcula a cada cambio; el contador "N jugadores" y la región `aria-live` dicen "37 jugadores" | Ninguna | — | Filtra por `knownRating` (rango), nunca por `ca`. Cap de 400. |
| Clic / Enter | Todas | "Limpiar filtros" | Restablece los filtros a los valores por defecto | Tabla recalculada | Ninguna | — | — |
| Clic / Enter | Todas | "Seguir" / "Dejar de seguir" (panel, barra masiva, ficha) | `toggleShortlist` | Botón alternable "✓ En seguimiento"; contador de la pestaña | Ninguna | — | Reversible, sin F6. |
| Clic / Enter | Todas | "Mandar a ojear" | `scout(g, p)` | "Ojeándolo…" y texto de días; si el tope está lleno, el texto de la sección 6 | Ninguna | — | — |
| Clic / Enter | Todas | "Comparar" (con 2 o 3 casillas) | Abre `Compare` (F5) | Modal | `pop` 140 ms | — | La barra masiva lo habilita con 2 o 3. |
| Escribir / cambiar | Todas | Campo "Oferta" | Recalcula el impacto | Filas "antes → después" y "entra / no entra" | Ninguna | — | `inputmode="numeric"`; separadores de miles al salir del campo. |
| Clic / Enter | Todas | **Ofertar compra** | `placeBid(g, pid, fee, false)` | Aceptó: nota F7 + se abre la negociación (trato "Acordado"). Rechazó: nota F7 con contraoferta y botón "Ofertar US$ X". Bloqueado: nota con el motivo | Ninguna | — | Enter dentro del campo "Oferta" hace lo mismo. El foco va a la nota o al botón de contraoferta. |
| Clic / Enter | Todas | **Ofertar US$ X** (contraoferta) | Ídem con el monto del club | Ídem | Ninguna | — | Un clic para aceptar la contraoferta del club. |
| Clic / Enter | Todas | **Pedir préstamo** | `placeBid(g, pid, loanFee, true)` | Concedido: se ejecuta, nota F7, trato "Prestado". Si el cargo es bajo, contraoferta del club (botón "Ofrecer US$ X") | Ninguna | — | Su cargo es un campo propio con valor por defecto `loanFee(p)` (8 % del valor): **el monto de la compra no se reutiliza** (hoy, el préstamo usa el pedido de la compra). |
| Clic / Enter | Todas | **Ofrecer** (negociación) | `sendTerms(g, dealId, terms)` | Acuerdo: pasa a "Hay acuerdo" (sin fichar). Contraoferta: carga los términos del representante y baja la paciencia. Ruptura: trato "Se cayó". Control duro: aviso sin gastar paciencia | Ninguna | — | El foco va al resultado (`role="status"`) y luego al primario del bloque. |
| Clic / Enter | Todas | **Confirmar: fichar a X…** | `signDeal(g, dealId, terms)` | Nota F7 en verde; trato "Firmado"; el pase se ejecuta (`doTransfer`) | Ninguna | — | F6: es el único paso irreversible de la compra. Esc o "Seguir negociando" lo cancelan. |
| Esc / "Seguir negociando" / cambiar un campo | Todas | Confirmación de fichaje abierta | Cancela la confirmación; vuelve a "Ofrecer" | — | Ninguna | — | — |
| Clic / Enter | Todas | **Seguir negociando** (tarjeta "Para cerrar") | Abre `NegotiationModal` con los términos y la paciencia guardados | Modal | `pop` 140 ms | — | — |
| Clic / Enter | Todas | **Cancelar el trato** | `cancelDeal(g, dealId)` | Pasa al historial como "Se cayó: cancelado por vos"; nota F7 | Ninguna | — | Sin F6: no se pagó nada y se puede volver a ofertar. |
| Clic / Enter | Todas | **Aceptar** (oferta recibida) | Abre F6 | "Confirmar: vender a Pérez a Racing por US$ 2,4 M" (primario) y "No"; el foco va a Confirmar | Ninguna | — | Si hay otra oferta por el mismo jugador, el texto la nombra ("se cancela la de Boca"). Si es del exterior, dice "se va al exterior". |
| Igual | Todas | Confirmar venta | `acceptOffer(g, o)` | "Resuelto"; nota F7 "Vendiste a Pérez a Racing por US$ 2,4 M." | Ninguna | — | Misma función y misma nota que la bandeja. |
| Igual | Todas | **Pedir más** | `haggle(g, o)` | Nota F7: "Racing mejoró su oferta: ahora US$ 2,8 M." o "Racing se retiró de la negociación." | Ninguna | — | Sin F6: el riesgo está escrito junto al botón. |
| Igual | Todas | **Rechazar** → Confirmar rechazo | `rejectOffer(g, o)` | "Resuelto"; nota "Rechazaste la oferta de Racing." | Ninguna | — | F6 (hoy, un clic). |
| Clic / Enter | Todas | **Negociar renovación** | Abre `NegotiationModal` modo `renew` | Modal | `pop` 140 ms | — | Deshabilitado con `negBlock`, con el motivo y la fecha escritos. |
| Clic / Enter | Todas | **Siguiente para responder** | Elige la próxima oferta | Tarjeta con el foco en su primario | Ninguna | — | — |
| Clic / Enter / toque | Todas | Nombre o cara del jugador, "Ver la ficha" | `nav({ page: 'player', id })` | Ficha | `page-in` | — | — |
| Clic / Enter | Todas | "Ver todos los tratos" (bandeja) | `nav({ page: 'market', tab: 'tratos', sel })` | Tratos con esa oferta | `page-in` | — | Solo lectura; no responde. |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Avance en curso (F4) | Acciones de oferta y de negociación deshabilitadas (motivo visible); buscar, filtrar, elegir y leer siguen | El estado cambia cada día; evitar responder algo que vence en el mismo cuadro. Espacio y Esc frenan (N9). |
| Libro cerrado | Ofertar compra, Pedir préstamo, Aceptar y Pedir más deshabilitados con motivo escrito; Rechazar, Cancelar el trato y Negociar renovación siguen | Regla del juego (`windowOpen`; `acceptOffer` y `haggle` devuelven `false`; `evaluateBid` rechaza). |
| Confirmación F6 abierta | Solo Confirmar, No y Esc en ese bloque; el resto de la pantalla sigue activo; elegir otra fila o tarjeta la cancela | Es una confirmación en el lugar, no una modal. |
| Modal abierta (F5) | La pantalla y los atajos no reciben teclas | Foco atrapado. |
| Foco en un campo (monto, cargo, sueldo, prima, nombre del filtro) | ↑ ↓ no mueven la tabla; los números no cambian de pantalla (decisión 18 de la bandeja) | El campo es de texto numérico. |
| Menú de la barra abierto (N2) | La tabla no reacciona a ↑ ↓ | El foco está en el menú (G7). |
| Jugador propio en Seguimiento o Buscar | No aparece (la tabla excluye el propio club) | `p.clubId !== club.id`. |
| Resuelto | Las acciones de esa tarjeta no están | Ya se respondió. |

---

## 8. Data Requirements

**Lo que el motor guarda hoy y lo que falta** (la base del cuadro "dónde está cada trato"):

| Cosa | Hoy | Falta (función o campo) |
|------|-----|-------------------------|
| Estado del libro y días que quedan | `windowOpen(date)` booleano | **E1** `windowState(date)` → `{ open, closesOn?, daysLeft?, opensOn?, daysToOpen? }` (cruza el cambio de año; "hoy" cuenta como el último día) |
| Ofertas del DT por jugadores ajenos | Nada: `evaluateBid` es una consulta; el "sí" vive en el estado local de `PlayerPage` | **E2** `g.deals` (`Deal[]`, opcional en `Game`, tope 60, los terminales más viejos se podan primero; partidas viejas: `g.deals ?? []`, sin subir `Game.version`) |
| Estado de una negociación con el representante | Local de `NegotiationModal` (`dem.patience` se reinicia al reabrir) | **E4** términos, paciencia y respuestas guardados en el `Deal` |
| Ofertas recibidas abiertas | `g.offers` (con `asks`, `date`, `fee`, `from`, `fromName`) | Monto inicial (`Offer.fee0`) para decir "mejoró de X a Y" (nice-to-have) |
| Ofertas recibidas cerradas | Nada propio: vendida → `g.transfers`; vencida → noticia "Venció…" (`me: true`); rechazada o retirada → nada | **E2** `acceptOffer`, `rejectOffer`, `haggle` y `marketTick` escriben el cierre en `g.deals` |
| Plazo de una oferta recibida | `offerDeadline(o)` | — (ya existe) |
| Impacto de una operación | Nada: cada pantalla suma por su cuenta | **E5** `dealImpact(g, kind, pid, fee, terms?)` pura |
| Cargo mínimo estimado de un préstamo | Fórmula dentro de `evaluateBid` | **E6** `loanFee(p)` exportada (también define el valor por defecto del campo) |
| Días que faltan para conocer a un jugador | Ritmo dentro de `dailySquad` | **E7** `scoutEta(g, p)` pura |
| Cierre de acuerdos al cerrar el libro o vencer su plazo | No existe | **E8** `marketTick` los pasa a `fell` y emite la noticia (`tag: 'mercado'`, `me: true`, `pid`, `ref`) |
| Pases propios en `g.transfers` | Solo nombres (`from`, `to`) | `Transfer.mine?: boolean` al registrar (pregunta 11) |
| Declarar transferible | `setListed` existe, pero `PlayerPage.tsx:133` y `ownBulk` escriben `p.listed` | **E9** usar `setListed` en los dos |
| Aviso de cierre del libro | No existe | **E10** noticia a los 7 días y el último día, y freno del avance (pregunta 8) |

**Forma de `Deal`** (para el ui-programmer y el gameplay-programmer; los nombres son propuestas):

```
Deal { id, side: 'buy' | 'loan' | 'sell', pid, name /* snapshot */, clubId, clubName,
       state: 'refused' | 'agreed' | 'signed' | 'loaned' | 'fell' | 'sold' | 'declined' | 'withdrawn' | 'expired',
       fee, counter?, opened, updated, deadline?, offerId?,
       neg?: { terms: Terms, patience: number, rounds: number },
       why?: string /* motivo de 'fell' */, steps: { date, text }[] /* hasta 8 */ }
```

Un trato por jugador y lado y ventana: ofertar de nuevo por el mismo jugador actualiza el mismo `Deal` (suma un paso), no crea otro.

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Estado del libro | `windowState(g.date)` (E1) | En cada `refresh()` | `career.ts` | `{ open, closesOn, daysLeft, opensOn, daysToOpen }` | — |
| Presupuesto, caja, masa salarial y tope | `club.budget`, `club.balance`, `wageBill(g, id)`, `club.wageBudget` | En cada `refresh()` | `career.ts` / `economia-y-dirigencia` | números US$ | Caja negativa → rojo con signo "−" y la regla escrita en Presupuesto |
| Jugadores de la tabla | `g.players` de clubes con `division > 0`, sin el propio club | Al cambiar filtros, fecha o `g.transfers` | `Game` | `Player[]` (cap 400) | Vacío → F8 |
| Valoración mostrada | `shown` / `knownRating` / `Val` (D4) | Al dibujar | `squad.ts` | rango o exacto | Nunca `ca` ni `bestRating` directo de un ajeno |
| Conocimiento | `knowOf(g, p)` | Al dibujar | `squad.ts` | 0-100 | — |
| Pedido | `askingPrice(g, p)` | Al dibujar | `career.ts` | US$ | Dato público (pregunta 9) |
| Valor, sueldo, cláusula, vencimiento del contrato | `p.value`, `p.wage`, `p.clause`, `p.contractEnd` | Al dibujar | `Game` | US$, año | Datos contractuales públicos (pregunta 9) |
| Atributos clave del panel | `shown(g, p, v, 5, i)` | Al dibujar | `squad.ts` | rangos | Si k < 100, solo rangos; el potencial dice "Desconocido" hasta k ≥ 70 |
| Estimación del sueldo que pedirá | `wageDemand(g, p, dest)` | Al editar | `career.ts` | US$ por mes | Se rotula "unos" o "alrededor de" |
| Respuesta del club | `placeBid` (E3), que envuelve `evaluateBid` | Por acción | `career.ts` | `{ ok, reason?, counter?, deal }` | — |
| Impacto de una operación | `dealImpact` (E5) | Al editar el monto o los términos | `career.ts` | `{ budget: [a,b], balance: [a,b], wageBill: [a,b], cap, squad: [a,b], line?: [a,b], blocked?: string[] }` | `blocked` trae los controles duros ("supera el tope por US$ 3 mil") |
| Negociación | `demand`, `evalOffer`, `sendTerms` (E4) | Por ronda | `squad.ts` / `career.ts` | `Demand`, `NegResult` | Rondas: `deal.neg.patience` |
| Ofertas recibidas | `g.offers` | Al día | `career.ts` | `Offer[]` | Se ocultan las de jugadores inexistentes |
| Pendientes de tipo oferta | `pendingOf(g)` (`k: 'offer'`) | Al día | `inbox.ts` | `Pending[]` | La insignia de Mercado usa esta misma lista |
| Tratos | `g.deals` (E2), `dealsOf(g)` ordena por grupo | Por acción y por día | `career.ts` | `Deal[]` | Sin tratos → F8 |
| Contratos por vencer | `squadOf(g, clubId)` con `contractEnd <= g.season` y `negBlock` | Al día | `squad.ts` | `Player[]` | Ninguno → F8 |
| Días hasta conocer a un jugador | `scoutEta` (E7) | Al dibujar | `squad.ts` | días | k = 100 → no se muestra |
| Movimientos | `g.transfers` (tope 300; la tabla muestra 80) | Al día | `career.ts` | `Transfer[]` | Vacío → F8 |
| Pestaña, `sel`, filtros | Ruta + `useSticky` | Al cambiar | Interfaz (C4) | texto, números | Pestaña por defecto según la sección 4 |
| Resueltos en esta visita | Estado local | Al resolver | Interfaz | claves con su nota | Se descarta al salir |

**Conteo (una decisión, una vez)**:

- La insignia de **Mercado** y el contador de la pestaña **Tratos** valen lo mismo: la cantidad de pendientes de tipo `offer` de `pendingOf` (ofertas abiertas por jugadores que existen). Los acuerdos por cerrar y los contratos por renovar **no** suman a esa insignia ni a la de la Bandeja: no son decisiones que llegaron al DT sino trabajo que él empezó o que puede esperar (pregunta 3 para el freno del avance).
- Una oferta suma **1** en la insignia de Mercado y **1** (como pendiente, nunca además como mensaje sin leer) en la de la Bandeja. Son dos indicadores de dos preguntas distintas ("¿hay algo en el mercado?" y "¿cuánto tengo que decidir en total?"); en ninguno cuenta dos veces. Los `.vh` lo dicen: "2 ofertas por tus jugadores" en Mercado; "3 decisiones pendientes" en Bandeja.
- Responder la oferta en cualquiera de los dos lugares la saca de los dos en el mismo `refresh()`.

**Regla**: la pantalla no escribe en `Game` directamente. Hoy lo hace en tres lugares que este diseño reemplaza por funciones del motor: `acceptOffer`/`rejectOffer`/`haggle` desde `Market.tsx` sin confirmación (se mueven al componente compartido `OfferDecision`), `doTransfer(g, p, me.id, fee, false, false, offer)` y `news(...)` desde `NegotiationModal` (→ `signDeal`, `walkAway`) y `doTransfer(... loan)` y `p.listed = !p.listed` desde `PlayerPage` (→ `placeBid`, `setListed`). Ver pregunta 10.

---

## 9. Events Fired

No hay analítica. Toda fila de esta tabla es una llamada al motor seguida de `save()` y `refresh()`.

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Ofertar compra o pedir préstamo | `placeBid` (nueva, E3) | `(g, pid, fee, loan)` → `{ ok, reason?, counter?, deal }` | `career.ts` | Envuelve `evaluateBid`; crea o actualiza el `Deal`; el préstamo concedido ejecuta `doTransfer`. |
| Abrir la negociación | `openNegotiation` (nueva, E4) | `(g, dealId)` → `{ demand, patience, terms }` | `career.ts` / `squad.ts` | Retoma lo guardado; no reinicia la paciencia. |
| Ofrecer al representante | `sendTerms` (nueva, E4) | `(g, dealId, terms)` → `NegResult` | `squad.ts` | Envuelve `evalOffer`; guarda términos, paciencia y respuesta; **no ejecuta el pase**. |
| Confirmar el fichaje | `signDeal` (nueva, E4) | `(g, dealId, terms)` | `career.ts` | Ejecuta `doTransfer(..., terms)`; trato `signed`. Irreversible. |
| Ruptura de la negociación | `walkAway` (nueva, E4) | `(g, dealId)` | `career.ts` | Trato `fell`; noticia "Se cayó el pase de X" (hoy la emite la interfaz). |
| Cancelar el trato | `cancelDeal` (nueva, E4) | `(g, dealId)` | `career.ts` | Trato `fell` ("cancelado por vos"). |
| Confirmar venta | `acceptOffer` | `(g, o)` | `career.ts` | Irreversible; registra `sold`. |
| Pedir más | `haggle` | `(g, o)` → booleano | `career.ts` | Puede retirar la oferta (`withdrawn`). |
| Confirmar rechazo | `rejectOffer` | `(g, o)` | `career.ts` | Irreversible; registra `declined`. |
| Negociar renovación → firmar | `applyRenewal` | `(g, p, terms)` | `squad.ts` | Igual que hoy; con la confirmación final F6. |
| Ruptura de una renovación | `p.negBlock = hoy + 30` | — | `squad.ts` | Hoy lo hace la interfaz; pasa a `walkAway`. |
| Seguir, Dejar de seguir | `toggleShortlist` | `(g, pid)` | `squad.ts` | Reversible. |
| Mandar a ojear | `scout` | `(g, p)` | `squad.ts` | Reversible. |
| Declarar transferible | `setListed` | `(g, pid, bool)` | `squad.ts` | Reemplaza la escritura directa de `PlayerPage` y `ownBulk`. |
| Cambiar pestaña, filtros, elegir una fila o tarjeta, comparar, abrir fichas | ninguno | — | — | Estado de interfaz o navegación (`nav`), no del juego. |
| Paso de un día | `marketTick` (cambios, E8) | — | `career.ts` | Vence ofertas (registro `expired` + noticia ya existente), cierra acuerdos caídos (`fell` + noticia) y emite los avisos de cierre del libro (E10). |

---

## 10. Transitions & Animations

Principio: rápido siempre (principio 7). Dentro del Mercado no hay animaciones decorativas.

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|--------------|--------|----------------|---------------------------|
| Entrada a la pantalla | `nav` a `market` | `page-in` existente | 160 | ease-out | Sí | Sí — instantáneo |
| Cambio de pestaña | Clic, teclado | Cambio de contenido en el lugar | 0 | — | — | No aplica |
| Cambio de selección | Clic, flechas, Enter | Cambio de contenido en el lugar | 0 | — | — | No aplica |
| Desplazar la fila a la vista | Flechas | `scrollIntoView({ block: 'nearest' })` sin `smooth` | 0 | — | — | No aplica (nunca suave) |
| Desplegar los filtros (celular) | Toque en "Filtros" | Despliegue en el lugar, sin altura animada | 0 | — | — | No aplica |
| Confirmación F6 | Aceptar, Rechazar, Confirmar | Reemplazo de botones | 0 | — | — | No aplica |
| Nota F7 y Resuelto | Acción | Aparece en el lugar | 0 | — | — | No aplica |
| Impacto antes → después | Editar el monto | Cambia el texto; sin animar números | 0 | — | — | No aplica |
| Modales (F5) | Negociación, comparador | `fade` + `pop` existentes | 140 | ease-out | No | Sí — instantáneo |
| Abrir la ficha | Clic | `page-in` | 160 | ease-out | Sí | Sí — instantáneo |
| Ficha breve (I1) | Hover | `hc-in` existente | 120 | ease-out | Sí | Sí |
| Hover de filas, chips y botones | Mouse | Color de fondo | 120 | por defecto | Sí | Sí |

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone (sección 7.1; orden en 12)
- [x] Tab order follows visual reading order (sección 12)
- [x] Every action achievable by mouse is also achievable by keyboard (7.2; elegir, marcar, comparar, ofertar y responder tienen equivalente; la ficha breve no es la única fuente de ningún dato)
- [x] Focus is visible at all times (A2; la fila elegida con foco tiene contorno además del fondo)
- [x] Focus does not escape the screen while it is open — no aplica como trampa (pantalla no modal); las modales que abre sí atrapan (F5)
- [x] Esc key closes or cancels (cancela F6, cierra la negociación y el comparador, pliega los filtros, devuelve el foco del panel a la tabla; nunca sale del juego)

**Gamepad** — fuera de alcance para el proyecto (`design/accessibility-requirements.md`, AM-10). No se completa.

**Mouse**
- [x] Hover states defined for all interactive elements (filas, pestañas, botones, tarjetas, nombres)
- [x] Clickable hit targets are at minimum 32x32px (filas ≥ 36 px; botones chicos ≥ 32 px de alto en escritorio)
- [x] Right-click behavior defined (sin acción propia)
- [x] Scroll wheel behavior defined in all scrollable zones

**Touch**
- [x] All touch targets are minimum 44x44px (pestañas, filas, botones de tarjeta, casillas con su área ampliada, "Filtros", "Mostrar más"; los botones chicos de escritorio crecen en ≤ 760 px)
- [x] Swipe gestures do not conflict with system-level swipe navigation (no hay gestos propios)
- [x] All actions achievable with one hand in portrait orientation (acciones dentro de la tarjeta, primario a todo el ancho; sin barras fijas propias)
- [x] Long-press behavior defined (sin acción propia; la ficha breve en táctil queda sujeta a G4 y ningún dato depende de ella)

---

## 12. Accessibility

Nivel **Estándar**. Requisitos de `design/accessibility-requirements.md` que el Mercado tiene que cumplir: AV-01, AV-02, AV-03, AV-04, AV-06, AV-07, AV-08, AV-09, AV-13; AM-01, AM-02, AM-03 (no sumar atajos de una tecla), AM-07 (modales), AM-09; AC-01, AC-02, AC-03, AC-05, AC-06, AC-07, AC-09.

**Cómo resuelve el Mercado los huecos de la biblioteca**

| Hueco | Resolución en el Mercado | ¿Depende de un arreglo global? |
|-------|--------------------------|-------------------------------|
| G1 (Espacio con un control enfocado avanza el día) | Espacio activa el botón, pestaña o casilla enfocada. En la tabla con `onPick`, Espacio marca la casilla de la fila (función propia): no es Continuar | Sí: la guarda de `App.tsx` (AM-02) |
| G3 (pestañas y segmentados sin ARIA, notas sin región viva, modales sin título asociado) | Pestañas como grupo de botones con `aria-pressed` (`role="group"`, `aria-label="Mercado"`); notas F7 con `role="status"`; la negociación y el comparador con `aria-labelledby`; la tabla con `aria-label`; el panel como `aside` con nombre | `Seg` y `Modal` (arreglo global) |
| G4 (ficha breve sin teclado ni toque) | Ninguna decisión depende de la ficha breve: el panel y las tarjetas muestran puesto, valoración, edad, contrato, pedido y valor | Mostrar I1 con el foco es el arreglo global |
| G5 (destructivas sin confirmación) | F6 en Aceptar y Rechazar una oferta y en el fichaje final. Sin F6: Pedir más (riesgo escrito), Pedir préstamo (costo y plazo escritos), Cancelar el trato, Seguir, Mandar a ojear (reversibles o de bajo costo) | No |
| G6 (pestañas que apilan historial) | Pestaña, selección y filtros reemplazan la entrada; solo abrir una ficha apila | Sí: la regla de reemplazo de `nav` para la misma `page` sin `id` (ya aplicada en la bandeja) |
| G7 (↑ ↓ con un menú abierto) | Oyente en la tabla, no en `window`; respeta `defaultPrevented` | No |

**Text contrast requirements for this screen**:

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Texto común `--text` / `--dim` | `--panel` | 4,5:1 | 14,64 / 6,99 (medido en la bandeja) | [x] |
| Fila elegida de la tabla | `--accent-soft` sobre `--panel`, 86 clubes | 4,5:1 | TBD (script de AV-01; mismos pares que la bandeja: ≥ 10,62 para `--text`, ≥ 5,08 para `--dim`) | [ ] |
| Estado del libro por cerrar, plazo `--warn` | `--panel` / `--panel2` | 4,5:1 | 9,30 / 8,18 | [x] |
| Montos negativos `--bad` con signo "−" | `--panel` | 4,5:1 | 5,47 | [x] |
| Montos positivos `--good` (impacto, firmado) | `--panel` | 4,5:1 | TBD | [ ] |
| Botón primario (Ofertar compra, Aceptar, Seguir negociando, Confirmar) | Acento del club | 4,5:1 | Resuelto por regla global (decisión 1 de la bandeja): ≥ 4,55 en 86/86 | [x] (verificar con `tools/check-contrast.mjs`) |
| Botón de peligro (Rechazar) bordeado | `--panel` / `--panel2` | 4,5:1 | 6,38 (`--danger` sobre `--panel2`) | [x] |
| Texto de tarjeta sobre el fondo de aviso (Para responder) | `--panel` con riel `--warn` | 4,5:1 | TBD | [ ] |
| `--faint` en cualquier texto del Mercado | `--panel3` | 4,5:1 | **4,05 (falla)** | [ ] — prohibido: no usar `--faint` sobre `--panel3` |
| Texto del chip y la pestaña activos | `--accent-soft`, borde de acento y ✓ | 4,5:1 | ≥ 10,6 (`--text` sobre `--accent-soft`) | [x] |
| Anillo de foco `--sel` | `--panel`, `--panel2` y fila elegida | 3:1 | ≥ 5,09 | [x] |
| Barras de los medidores (no texto) | `--panel3` | 3:1 | TBD | [ ] — respaldadas por número y texto |

**Tamaños mínimos (AV-04)**: títulos de tarjeta, cuerpo, montos y botones ≥ 14 px; encabezados de columna, contadores, leyendas de los KPI ("para pases"), "Conoc. N %" y notas ≥ 12 px. Nada por debajo de 11 px. Con el texto al 120 % (y al 150 % cuando exista), la tabla oculta columnas por prioridad sin desplazar de costado, el panel hace scroll propio y las tarjetas de Tratos pasan a una columna con los botones en filas.

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Estado del libro (abierto / por cerrar / cerrado) | Verde-ámbar-gris | Texto con palabras ("Abierto", "cierra en 3 días", "cerrado") e ícono distinto (✓, !, cerrado) |
| Montos del impacto (suben o bajan) | Rojo-verde | Signo "+" / "−" o flecha "→", y "entra / no entra" en palabras |
| Diferencia de la oferta con el valor | Rojo-verde | "+20 % sobre su valor" / "15 % bajo su valor" con signo y texto |
| Caja negativa | Rojo | Signo "−" y la frase "en rojo: no podés pagar primas" en Presupuesto |
| Masa salarial sobre el tope | Rojo | "Pasaste el tope por US$ X" con "!" |
| Estado de un trato (firmado, se cayó, vendido…) | Todos | Palabra + ícono (✓, ✗, ⇄); no depende del tono |
| Pestaña, chip y fila activos | Todos | Borde, fondo suave, ✓, peso 700 y `aria-pressed` / `aria-selected` (AV-13) |
| Conocimiento y rango (D4) | Todos | "62–74" en texto con "Conocés el 35 %" |
| Plazo corto | Todos | "Vence hoy", "Vence mañana" con "!" |
| Paciencia del representante | Todos | Puntos llenos y vacíos (●●○) más "2 de 3 rondas" en texto |

**Focus order** (escritorio, pestaña Buscar):

1. Enlace para saltar al contenido (global, AM-08) → `#main`
2. "Entendido" de la ayuda O2 (si está)
3. Pestañas del Mercado (una parada; ← → entre opciones)
4. Filtros, en orden visual: Puesto, Categoría, Valoración mínima, Edad máxima, Precio máximo, "Solo transferibles…", "Limpiar filtros"
5. Barra de la tabla: vistas, Columnas, línea, filtro por nombre
6. Barra de acciones masivas (si hay selección): Comparar, Seguir, Dejar de seguir, Mandar a ojear, Limpiar
7. Tabla (una parada: fila elegida o primera; ↑ ↓ Inicio Fin Re Pág Av Pág adentro; Enter elige; Espacio marca)
8. "Mostrar más" (parada propia justo después de la tabla)
9. Panel del jugador: nombre (enlace a la ficha) → "Mandar a ojear" → "Ver la ficha" → "Seguir" → "Comparar" → campo "Oferta" → "Ofertar compra" (o "Ofertar US$ X") → campo "Cargo" → "Pedir préstamo" → botones de la nota
10. Sigue a la barra inferior del documento (no hay ciclo)

Enter en la tabla salta al punto 9 (campo "Oferta"); Esc desde el panel vuelve al 7. **Tratos**: pestañas → por tarjeta, en orden visual: nombre del jugador → club → botones de acción en orden (primario, comunes, peligro) → "Siguiente para responder" → nota; entre tarjetas, el orden del documento (Para responder, Para cerrar, Para renovar, Historial). **Celular**: pestañas (chips) → "Filtros" → tabla → "Mostrar más"; en Tratos, las tarjetas como arriba; en la ficha, el `BidBox`.

**Negociación (F5)**: el foco entra al campo "Sueldo mensual"; Tab recorre Sueldo, Prima, Cláusula, Años, Rol, Cancelar, Ofrecer; tras "Ofrecer", el foco va a la respuesta (`role="status"`) y si hay acuerdo, a "Confirmar: fichar…". Esc cierra la ventana (guarda el trato) y devuelve el foco al botón que la abrió.

**Screen reader announcements for key state changes** (alcance barato del nivel Estándar):

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Cambio de filtro o de vista | "37 jugadores." (región `aria-live="polite"` en la barra de la tabla) | 500 ms después del último cambio |
| Foco en una fila | "Juan Pérez, delantero centro, Lanús, 24 años, valoración 62 a 74, pedido 1,4 millones de dólares." (nombre accesible de la fila) | Al llegar el foco |
| Elegir un jugador | "Jugador elegido: Juan Pérez. Panel de oferta abierto." | Al elegir |
| Cambio del monto con impacto | "Presupuesto después de la oferta: 0,7 millones. Entra." | 500 ms después de la última tecla |
| Respuesta del club | El texto de la nota F7 (`role="status"`) | Al aparecer |
| Cambio de estado del libro | "El libro de pases cerró." / "Abrió el libro de pases." | Una vez, al cruzar la frontera |
| Confirmación F6 abierta | El foco cae en "Confirmar: vender a Juan Pérez a Racing por 2,4 millones de dólares"; se lee el botón | Al abrir |
| Respuesta del representante | El texto del historial (`role="status"`), con "quedan 2 de 3 rondas" | Al aparecer |
| Resultado de una acción | "Vendiste a Juan Pérez a Racing por 2,4 millones." / "Firmó…" | Al aparecer |
| Sin ofertas al resolver la última | "No hay ofertas para responder." | Tras la nota F7 |

**Cognitive load assessment**: seis flujos a la vez en Buscar: (1) estado del libro, (2) plata y tope, (3) filtros, (4) la tabla, (5) el jugador elegido, (6) la oferta. Está en el borde del 7 ± 2. Mitigaciones: el estado del libro y los tres topes son una sola franja estable que no cambia con la pestaña; los filtros se pliegan en celular a una línea-resumen; el panel no muestra nada hasta que el DT elige a propósito; el impacto está escrito antes de cada confirmación y no hay que calcularlo; el trato no se pierde al cerrar una ventana. En Tratos son tres: qué responder, qué cerrar y qué vence, con el plazo en palabras.

---

## 13. Localization Considerations

Un solo idioma (español rioplatense); no hay traducción prevista ni RTL. Lo que rompe la disposición son los nombres reales largos y los formatos. "Max Characters" es lo que entra sin cortar a 1440 px con texto al 100 %.

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| Nombre de jugador en la tabla | ~22 | 26 | — | No aplica | Elipsis; nombre completo en el panel y en el nombre accesible | Medio |
| Nombre de club | "Club Atlético Independiente Rivadavia" (37) | 24 en tabla (usa `short`); completo en tarjetas | — | No aplica | `short` en tabla y en F6 si el completo pasa de 60 | Medio |
| Estado del libro | ~60 | 64 en una línea; dos líneas en celular | — | No aplica | Ajusta; nunca elipsis (es la información) | Medio |
| Etiqueta F6 de venta "Confirmar: vender a {jugador} a {club} por {monto}" | ~60 | 80 en escritorio; dos líneas en celular | — | No aplica | Ajusta dentro del botón; nunca elipsis (es la consecuencia) | Alto — nombres largos y clubes del exterior ("Olympique de Marsella") |
| Etiqueta F6 de fichaje "Confirmar: fichar a {jugador}, {monto} + prima {monto}" | ~60 | Igual | — | No aplica | Igual | Alto |
| Montos | "US$ 2,4 M" / "US$ 7,1 mil" | 12 | — | No aplica | `money()` y `dec()` existentes, formato es-AR (coma decimal) | Bajo |
| Rango de valoración | "62–74" | 6 | — | No aplica | — | Bajo |
| Fechas | "20 de febrero" / `fmtDate` | 20 | — | No aplica | Sin año en la franja; con año en el historial | Bajo |
| Motivos del motor (`reason`) | ~90 | Sin límite | — | No aplica | Ajusta en varias líneas | Medio |
| Pestañas | "Seguimiento (6)" | 18 | — | No aplica | En celular, fila desplazable; nunca se abrevian | Bajo |
| Estados de un trato | "Acordado con el club · falta el contrato" | 44 | — | No aplica | Ajusta | Bajo |
| Estados vacíos por zona | ~120 | Sin límite | — | No aplica | Ajusta | Bajo |

Los textos de los estados vacíos de Tratos y Seguimiento están en la sección 6.

---

## 14. Acceptance Criteria

**Performance**
- [ ] Con 400 filas en Buscar, la pantalla dibuja el primer cuadro en menos de 100 ms desde el clic en Mercado (perfil del navegador, CPU sin limitar).
- [ ] Cambiar el foco con ↓ en la tabla y actualizar el panel con Enter toma menos de 50 ms, sostenido apretando la tecla 3 s.
- [ ] Editar el monto de la oferta actualiza el impacto en menos de 50 ms por tecla.

**Propósito de la pantalla**
- [ ] El estado del libro se ve en la franja, con palabras y los días que quedan, en las cinco pestañas, a 1440 × 900 y a 360 × 740 sin desplazar. Con el libro a 3 días de cerrar dice "cierra en 3 días" con "!"; el último día, "cierra hoy"; cerrado, "reabre el 25 de junio (faltan N días)".
- [ ] Con el libro cerrado, Ofertar compra, Pedir préstamo, Aceptar y Pedir más están deshabilitados y el motivo está escrito debajo de cada grupo (no solo en `title`); Rechazar, Seguir, Mandar a ojear, Comparar y Negociar renovación siguen habilitados.
- [ ] La franja muestra Presupuesto, Caja y Sueldos/tope con el margen; con la caja negativa se ve el signo "−" y, en Presupuesto, la frase que dice qué bloquea.
- [ ] Desde la tabla, ofertar y firmar toma, con teclado, estos pasos: ↓ hasta la fila, Enter, Enter (ofertar), Enter (Confirmar el fichaje), más las rondas de la negociación que haga falta; con mouse, clic en la fila, "Ofertar compra" y la confirmación. Ningún clic ejecuta el fichaje sin la confirmación con el costo escrito.
- [ ] Elegir una fila no hace nada irreversible y no selecciona la primera fila al entrar.
- [ ] Antes de ofertar, el panel muestra el impacto en presupuesto, caja, sueldos por mes con el tope y plantel; con un monto mayor al presupuesto dice "no entra" en palabras.
- [ ] Un jugador con conocimiento menor a 100 se ve con valoración y atributos como rango (`shown`), potencial "Desconocido" si k < 70 y personalidad "desconocida" si k < 60, en la tabla, el panel, el comparador y la ventana de negociación. Ninguna pantalla del Mercado muestra su `ca`, `pa` ni `bestRating` exactos (revisión de código: no aparece `bestRating(p)` ni `p.ca` de un ajeno en `Market.tsx`, `BidBox` ni `NegotiationModal`).
- [ ] Ordenar y filtrar por valoración usan `knownRating` (un ajeno con rango 60-80 queda arriba de uno con 68-70).
- [ ] "Mandar a ojear" dice cuántos días faltan para conocerlo; si el libro cierra antes, lo dice.
- [ ] Un rechazo con contraoferta muestra el monto del club y un botón "Ofertar US$ X" que lo ofrece en un clic.
- [ ] Cuando el club acepta, el trato aparece en Tratos › Para cerrar como "Acordado con el club" aunque se cierre la ventana de negociación con Esc; "Seguir negociando" la reabre con los mismos términos y la misma paciencia.
- [ ] Cuando el representante acepta los términos, el pase **no** se ejecuta hasta "Confirmar: fichar a X…"; cambiar un campo cancela el acuerdo.
- [ ] La ventana de negociación muestra "quedan N de M rondas" y el impacto en vivo; un sueldo sobre el tope avisa "Esto no gasta paciencia" y la ronda no se descuenta.
- [ ] Pedir un préstamo usa su propio campo de cargo (por defecto el 8 % del valor), no el monto de la compra, y dice el plazo (fin de temporada) y el sueldo que se suma.
- [ ] Tratos agrupa Para responder, Para cerrar, Para renovar e Historial; cada tipo muestra las tarjetas, cifras y acciones de su plantilla.
- [ ] "Para responder" está ordenado por plazo (el que vence antes, arriba), con el plazo en palabras y la fecha que da `offerDeadline` (la misma que la bandeja).
- [ ] Una oferta nueva por un jugador suma 1 a la insignia de Mercado y 1 (no 2) a la de Bandeja; responderla en el Mercado la saca de la bandeja en el mismo `refresh()`, y a la inversa.
- [ ] Aceptar y rechazar una oferta toman dos pasos (acción y confirmación) en el Mercado, igual que en la bandeja; ninguno se ejecuta con un solo clic. El texto de la confirmación nombra la otra oferta que se cancela si la hay y "se va al exterior" si corresponde.
- [ ] Tras "Pedir más" con éxito, la tarjeta muestra el monto nuevo con Aceptar, Pedir más y Rechazar, y la clave `offer{id}` y la selección no cambian.
- [ ] Una oferta vencida, vendida, rechazada o retirada aparece en el Historial con su estado en texto; una oferta que vence mientras está elegida reemplaza sus botones por "Esta oferta venció el {fecha}." sin errores en la consola.
- [ ] Al cerrar el libro con un acuerdo abierto, el trato pasa a "Se cayó: se cerró el libro" y llega un mensaje a la bandeja.
- [ ] Para renovar lista a los jugadores propios con contrato que vence este año, con "Negociar renovación" (deshabilitado con el motivo y la fecha si hay `negBlock`).

**Navegación**
- [ ] Cambiar tres veces de pestaña y apretar Atrás una vez vuelve a la pantalla anterior al Mercado (no recorre las pestañas).
- [ ] Abrir una ficha desde la tabla y volver deja la misma pestaña, filtros, orden, selección y scroll.
- [ ] La insignia de Mercado abre Tratos con la oferta de plazo más corto elegida; "Ver todos los tratos" de la bandeja abre Tratos con esa oferta elegida.
- [ ] `tab: 'offers'`, `'search'`, `'short'`, `'moves'` y `'fin'` abren la pestaña equivalente sin error.
- [ ] Por debajo de 1180 px no hay panel y tocar una fila abre la ficha; la ficha › Contrato y mercado muestra el mismo `BidBox` con el mismo texto.

**Estados vacíos y errores**
- [ ] Cada zona vacía muestra el texto de la sección 6.
- [ ] Un jugador que ya no existe muestra "Ya no está disponible." sin acciones y sin errores en la consola.
- [ ] Con 45 jugadores en el plantel, "Ofertar compra" está deshabilitado con el motivo escrito.
- [ ] Un jugador a préstamo en su club dice el motivo y no permite ofertar.
- [ ] Con `save()` fallando, la decisión muestra la nota en `--bad` y el juego sigue.

**Teclado e interacción**
- [ ] Con un menú de la barra superior abierto, ↑ ↓ mueven solo el menú; la tabla no cambia.
- [ ] Con el foco en un botón, pestaña o casilla, Espacio lo activa y no avanza el día (requiere AM-02).
- [ ] La tabla es una sola parada de Tab; ↑ ↓ mueven el foco; Enter elige y lleva el foco al campo "Oferta"; Espacio marca la casilla; Esc desde el panel vuelve a la fila.
- [ ] Esc con una confirmación abierta la cancela y deja el foco en el botón que la abrió; Esc en la negociación la cierra y devuelve el foco al botón que la abrió.
- [ ] La pantalla no agrega ningún atajo de una sola tecla nuevo (revisión de `SHORTCUTS` y de los oyentes de `Market.tsx`, `BidBox` y `PlayerTable.tsx`).
- [ ] Ninguna llamada de la pantalla asigna propiedades de `g` ni llama a `doTransfer` o `news` directamente (revisión de código: no aparecen `p.listed =`, `doTransfer(`, `news(`, `p.negBlock =` en `src/ui/Market.tsx`, `BidBox`, `PlayerPage.tsx` ni `Locker.tsx`).

**Visibilidad de las acciones** (lección de la revisión de la bandeja; script `tests/ui/mercado.cjs`, a escribir al implementar, en 1440 × 900, 1280 × 720, 1024 × 768, 820 × 1000, 390 × 844 y 320 × 568)
- [ ] Para cada botón de cada tarjeta de Tratos, del panel, de la ficha › Contrato y de la ventana de negociación (Aceptar, Pedir más, Rechazar, Confirmar, No, Ofertar compra, Pedir préstamo, Ofrecer, Cancelar, Seguir negociando…), `document.elementFromPoint` en su centro devuelve el propio botón (no un contenedor recortado ni una barra fija), en todas las resoluciones.
- [ ] Cada botón recibe el foco y, con el foco, su caja está dentro de la ventana y no está tapada por la barra superior, la inferior ni la barra masiva (2.4.11); medido con `elementFromPoint` sobre cada punto del anillo.
- [ ] Ninguna acción de oferta ni de negociación va en un contenedor con `position: fixed` ni con `overflow` recortado; ningún contenedor de acciones usa la clase global `.bar`.
- [ ] En la ventana de negociación a 320 × 568, "Ofrecer" y "Confirmar" son alcanzables desplazando el contenido de la ventana y nunca quedan fuera de la pantalla.
- [ ] Sin desplazamiento horizontal de la página a 320, 390 y 640 px (200 %).

**Accesibilidad**
- [ ] Ningún texto queda por debajo de 12 px al 100 % (salvo los de 11 px permitidos que no sean contadores ni leyendas), medido con el inspector.
- [ ] Todo texto pasa 4,5:1 con el acento de los 86 clubes (`node tools/check-contrast.mjs` sin fallas) y no se usa `--faint` sobre `--panel3`.
- [ ] La pestaña activa, el chip y la fila elegida muestran borde, fondo suave, ✓ o peso, y `aria-pressed` / `aria-selected`; no hay texto blanco sobre relleno sólido de acento.
- [ ] Con el modo para daltonismo y la emulación de deuteranopía, estado del libro, impacto, diferencia de la oferta, estado de un trato, paciencia y fila elegida se distinguen por texto, forma o peso.
- [ ] axe-core no informa infracciones A/AA en Buscar con un jugador elegido, Tratos con ofertas y la ventana de negociación.
- [ ] Las pestañas y filtros exponen `aria-pressed`; la nota de resultado y la respuesta del representante, `role="status"`; la ventana de negociación y el comparador, `aria-labelledby`; el panel, un nombre accesible.
- [ ] Con movimiento reducido, la entrada a la pantalla y a la ficha son instantáneas.
- [ ] En 360 px, todos los objetivos táctiles miden al menos 44 × 44 px (pestañas, filas, casillas, botones de tarjeta, "Filtros", "Mostrar más").
- [ ] El cambio de estado del libro se anuncia una sola vez; el resto de la franja no tiene región viva.

---

## 15. Open Questions

Las marcadas **Resuelto en el diseño** son decisiones que el ux-designer tomó con la información disponible y que el usuario puede revertir; las **Pendiente** necesitan al usuario. Cada pendiente trae la recomendación.

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 1. ¿El motor guarda un registro de los tratos (`g.deals`) o la pestaña Tratos se arma reconstruyendo desde `g.transfers`, `g.news` y el estado local de la ficha? | usuario + gameplay-programmer | Antes de implementar | **Pendiente. Recomendación: `g.deals`** (campo opcional, tope 60, sin subir `Game.version`). Reconstruir es frágil: las ofertas rechazadas y retiradas no dejan rastro, los vencimientos dependen de un texto de noticia, `g.news` se poda a 300-400 y `g.transfers` guarda solo nombres. Es el equivalente de la pregunta 5 de la bandeja. |
| 2. El usuario pidió ver "ofertas enviadas, esperando respuesta": hoy el club contesta **al instante**. ¿Se mantiene así o el club tarda 1 a 3 días en contestar (nueva decisión, nuevo mensaje, nuevo estado)? | usuario + game-designer | Antes de implementar | **Pendiente. Recomendación: mantener la respuesta instantánea.** Demorarla agrega una decisión que llega a la bandeja, un freno del avance más y un riesgo de pérdida por vencimiento; no mejora lo que el DT decide. Esta spec no tiene el estado "esperando respuesta"; si el usuario quiere la demora, se suma `waiting` a `Deal.state` y a `pendingOf`. |
| 3. Un acuerdo con el club al que le falta el contrato: ¿cuánto dura, qué pasa cuando vence, frena el avance? Hoy se pierde al cerrar la ventana. | usuario + game-designer | Antes de implementar | **Pendiente. Recomendación: dura 7 días o hasta que cierra el libro (lo que ocurra antes); al vencer pasa a `fell` con un mensaje en la bandeja (`me: true`, tema Mercado); no es un pendiente de la bandeja ni suma a las insignias; "Ir al partido" **no** frena por él, pero sí por el cierre del libro si hay un acuerdo abierto (pregunta 8).** Es un trato que el DT empezó: avisar sí, bloquearlo no. |
| 4. Paciencia del representante: ¿se guarda al cancelar la ventana, se muestra y se bloquea volver a ofertar tras una ruptura? Hoy se reinicia al reabrir (se puede cancelar y reintentar gratis) y no se ve. | usuario + game-designer | Antes de implementar | **Pendiente. Recomendación: guardarla en el `Deal`, mostrarla ("quedan 2 de 3 rondas") y bloquear por 14 días una nueva oferta por un jugador que se levantó de la mesa** (como `negBlock` de 30 días en renovaciones, `Locker.tsx:100`). Mostrarla evita "un castigo sin explicación" (antipatrón del recorrido); guardarla cierra la salida de reintentar gratis. La ventana avisa del bloqueo con la fecha. |
| 5. Confirmación final antes de fichar: hoy "Ofrecer" ejecuta el pase en el mismo clic si el puntaje alcanza (`Locker.tsx:104`), sin mostrar el impacto. | usuario | Antes de implementar | **Resuelto en el diseño**: `Ofrecer` solo evalúa; el acuerdo del jugador pasa a "Hay acuerdo" y el fichaje se confirma con F6 y el impacto a la vista (sección 6). Coherente con UR-16 de la bandeja (lo irreversible se confirma). Cuesta un clic más en el camino feliz. |
| 6. ¿Dónde viven la oferta y la negociación: en el Mercado, en la ficha o en los dos? | ux-designer + usuario | Antes de implementar | **Resuelto en el diseño: los dos con un solo componente** (`BidBox` en el panel del Mercado desde 1180 px y en ficha › Contrato y mercado; la negociación sigue siendo F5, pero guardada). Justificación en la sección 3. El usuario puede preferir solo ficha (menos trabajo: sin panel ni cambios en `PlayerTable`); costo: de la tabla a ofertar son 3 pasos de teclado más y una entrada más en el historial. |
| 7. Las ofertas por jugadores propios, ¿se responden en la bandeja, en el Mercado o en los dos? | usuario | Antes de implementar | **Pendiente. Recomendación: en los dos con el mismo componente (`OfferDecision`), misma clave `offer{id}`, misma confirmación F6 y misma nota F7.** Es una sola decisión y se cuenta una vez; la bandeja contesta "¿qué decido?" y el Mercado "¿cuál de las ofertas me conviene?" (comparar entre ellas y contra el presupuesto). Alternativa más estricta: el Mercado solo lee y manda a la bandeja a responder (un solo lugar, un paso más y rompe F2 "no obligar a ir a otra pantalla"). |
| 8. El libro de pases cierra y la partida sigue sin aviso. ¿Avisar a los 7 días y el último día con un mensaje, y frenar "Ir al partido" el último día? | usuario | Con la implementación | **Pendiente. Recomendación: sí a las dos, una vez por libro.** Mensaje en la bandeja (`tag: 'mercado'`, `me: true`, sin `act`) a los 7 días y el último día; el avance frena el último día solo si hay un acuerdo abierto o un jugador en seguimiento con ojeo en curso (misma regla que `expiringKeys`, AC-02). Cumple el gancho de fin de sesión "un libro de pases a punto de cerrar" sin pelear con el avance. |
| 9. Valor, pedido, sueldo y cláusula de un jugador ajeno se muestran exactos (decisión de `ojeo.md`: son públicos). Pero `value` sale de `ca`, `pa` y edad, y `askingPrice` depende del lugar del jugador en su plantel por `ca` real; con la edad a la vista se puede despejar la valoración, y los motivos de rechazo ("lo considera importante") dicen el puesto real. | usuario + systems-designer | Antes de dar por cumplida la regla de "nunca revelar el valor real" | **Pendiente. Recomendación: mantener exactos los datos contractuales** (es lo que ve un DT real en cualquier ficha de pases) **y anotar la fuga** en `ojeo.md`; si el usuario quiere cerrarla, mostrar `value` y `ask` redondeados a un rango cuando k < 60. No bloquea esta spec. |
| 10. Funciones del motor nuevas o cambiadas: `windowState`, `Deal` y `g.deals`, `placeBid`, `openNegotiation`, `sendTerms`, `signDeal`, `walkAway`, `cancelDeal`, `dealImpact`, `loanFee`, `scoutEta`, `Offer.fee0`, `Transfer.mine`, `dealsOf`; `acceptOffer`, `rejectOffer`, `haggle` y `marketTick` registran el cierre; `marketTick` cierra acuerdos y emite avisos; `setListed` en `PlayerPage` y `ownBulk`. | ui-programmer + gameplay-programmer (con lead-programmer) | Antes de implementar | Pendiente |
| 11. `g.transfers` guarda solo los nombres de los clubes: "Mis pases" se arma por nombre y falla si el DT cambia de club. | gameplay-programmer | Con la implementación | **Pendiente. Recomendación: `Transfer.mine?: boolean` al registrar.** |
| 12. Cambios en `PlayerTable` (D1) para el Mercado: `onPick` (la fila elige en vez de abrir la ficha), foco itinerante con ↑ ↓ y Enter, Espacio para marcar, Mayús + ↑ ↓, columna `deal` y `scoutEta` en la vista Ojeo, `scroll-margin` de la barra masiva. Hoy D1 tiene una parada de Tab por fila (hasta 100 o 400) y los encabezados solo responden al mouse. | ui-programmer + usuario | Antes de implementar | **Pendiente. Recomendación: aceptarlos solo en modo `onPick`** (Mercado) y llevar el resto a D1 después; es el mismo cambio que hizo la bandeja con `listbox`. Actualizar D1 en `design/ux/interaction-patterns.md`. |
| 13. Nombres y estructura de las pestañas: "Ofertas recibidas" pasa a **Tratos** (ofertas para responder, acuerdos por cerrar, contratos por renovar, historial); "Finanzas" pasa a **Presupuesto** (los tres topes y el balance, con enlace a Club › Finanzas); "Movimientos" suma el filtro "Mis pases". | usuario | Antes de implementar | **Resuelto en el diseño** (la pestaña Ofertas se queda corta: no cubre acuerdos ni historial; "Finanzas" duplicaba Club › Finanzas sin decir qué limita las compras). El usuario puede revertir los nombres sin tocar el resto. |
| 14. Textos del motor que contradicen la pantalla: "vence en una semana" / "desde la pantalla de Mercado" (ya en la pregunta 7 de la bandeja). El Mercado usa `offerDeadline` y no repite el texto del motor. | usuario (texto) + gameplay-programmer | Con la implementación | Pendiente (ya anotado en la bandeja) |
| 15. Patrones nuevos para `design/ux/interaction-patterns.md`: panel de lectura al costado de una tabla (variante de F1), tarjeta de trato, vista previa de impacto (`DealImpact`), franja de estado del libro, tabla con foco itinerante (D1). Esta spec no toca ese archivo. | ux-designer | Con la implementación | Pendiente |
| 16. Cambios a otras specs: `design/ux/bandeja.md` suma el enlace "Ver todos los tratos" a la plantilla "Oferta por un jugador" (recomendado) y el mismo texto de F6; `design/gdd/mercado-de-pases.md` documenta `g.deals`, las rondas guardadas, el bloqueo y el aviso de cierre del libro. | ux-designer + usuario | Después de implementar | Pendiente |
| 17. Pestaña por defecto al entrar: la regla de hoy (Tratos si hay ofertas, Buscar si no) o recordar siempre la última. | usuario | Con la implementación | **Resuelto en el diseño**: la ruta manda; sin `tab`, la recordada; sin recordada, Tratos si hay ofertas para responder y Buscar si no. |
| 18. Renovaciones en el Mercado: ¿"Para renovar" en Tratos o solo en Plantel y la ficha? | usuario | Con la implementación | **Pendiente. Recomendación: sí, como cuarto grupo de Tratos** (solo lectura de la lista y el botón "Negociar renovación"): en la ventana el DT necesita ver quién se le va libre en diciembre y hoy el único aviso es un contador en el Inicio (`mercado-de-pases.md`, pregunta abierta sobre avisar contratos por vencer). Es el grupo que más fácil se saca si el usuario lo considera fuera de alcance. |
| 19. Jugadores libres (sin club) y préstamos de juveniles propios a otros clubes: no existen en el motor (`mercado-de-pases.md`, Open Questions). Esta spec no los cubre; el texto de Buscar vacío dice que no hay libres. | usuario + game-designer | — | Fuera de alcance; si se implementan, entran como filtro y como estados de `Deal` (`loan` de venta). |
