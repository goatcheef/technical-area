# UX Spec: Mercado de pases

> **Status**: In Design (revisada con las decisiones del usuario el 2026-11-14: respuesta del club con 1 a 3 días de demora, paciencia del representante visible y guardada, valor y pedido exactos, "Para renovar" y avisos de cierre del libro dentro del alcance; ver la sección 15. Sin revisar con /ux-review)
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
> - **Qué hace hoy el código** (la base de este diseño, verificada en `Market.tsx`, `PlayerPage.tsx`, `Locker.tsx`, `career.ts`, `squad.ts`): (1) la respuesta del club a una oferta es **instantánea** (`evaluateBid`); no existe "esperando respuesta". (2) El motor **no guarda nada** de lo que el DT oferta: el "sí" del club vive en el estado local de la ficha y se pierde si se cierra la ventana; la paciencia del representante vive en el estado local de la ventana y se reinicia al reabrirla. (3) Las ofertas recibidas viven en `g.offers` solo mientras están abiertas; aceptadas, rechazadas, retiradas y vencidas no dejan registro propio (solo la noticia de vencimiento y `g.transfers`). (4) En la pestaña Ofertas recibidas de hoy, Aceptar y Rechazar actúan con un solo clic y sin confirmación. (5) En la negociación, "Ofrecer" con un puntaje que alcanza ejecuta el pase en el mismo clic. La sección 8 lista lo que hace falta en el motor para el cuadro "dónde está cada trato". **Con las decisiones del usuario** (sección 15) la respuesta deja de ser instantánea: una oferta del DT queda "Esperando respuesta" y el club contesta entre 1 y 3 días después con un mensaje; el acuerdo y la contraoferta pasan a ser decisiones de la bandeja.
> - **"Eventos"** quiere decir llamadas a funciones del motor (`src/engine/`) seguidas de `save()` y `refresh()`. No hay analítica.
> - **Sin audio**: las columnas de sonido dicen "—". **Un solo idioma** (español rioplatense).
> - **Lenguaje visual**: el estilo portal vigente y lo que aprobó el usuario en la bandeja (alcance segmentado, chips con contador, confirmación en el lugar, nota de resultado). Color, tipografía y peso visual son del art-director; acá solo se fija jerarquía, estados y contraste mínimo.
> - **Lecciones de las revisiones de la bandeja** (`production/ui/bandeja/review-*.md`) que esta spec incorpora desde el diseño: (a) la fila de acciones quedó recortada por reutilizar la clase global `.bar` (barra de progreso de 5 px) y por una barra fija detrás de la navegación inferior del celular: ninguna acción de esta pantalla va en una barra fija ni en un contenedor con `overflow` recortado, y ningún contenedor de acciones reutiliza clases genéricas (prefijo propio `mk-`); (b) Playwright hace clic en elementos recortados: los criterios de la sección 14 piden comprobar con `elementFromPoint` que cada botón y cada foco se ven; (c) el foco no puede quedar tapado por barras fijas (2.4.11): `scroll-margin`/`scroll-padding` de la altura de las barras; (d) cambiar de pestaña o de selección reemplaza la entrada del historial; (e) cada decisión cuenta una vez; (f) solo se marca como hecho lo que el DT hace a propósito.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

En una ventana de pases el DT hace cuatro cosas, siempre en este orden de preocupación: no perder una oferta por un jugador suyo ni un acuerdo que vence, encontrar el refuerzo que le falta sin gastar de más, saber en qué quedó cada cosa que empezó ("¿Lanús ya contestó? ¿Cuándo contesta? ¿Qué me falta firmar? ¿Cuánto tengo comprometido?"), y no pasarse de plata ni del tope de sueldos sin enterarse. El Mercado es el escritorio de esa ventana: arriba, si el libro está abierto y cuánto queda y cuánta plata hay; abajo, buscar, comparar, ofertar y llevar los tratos. Lo que más frustra: descubrir que el libro cerró mientras ojeaba, vender o fichar por un clic distraído (hoy "Aceptar" una venta y "Ofrecer" al representante son irreversibles sin confirmar), perder el "sí" del club por cerrar una ventana, y ver el valor exacto de un jugador que todavía no ojeó.

**The player goal**:

Encontrar un jugador, compararlo con otros dos y ofertar por él en tres pasos desde la tabla (elegir, escribir el monto, ofertar), saber cuándo contesta el club ("responde entre el 12 y el 14 ene"), y, cuando llega el "sí", cerrarlo en dos pasos más desde la bandeja o Tratos (negociar el contrato, confirmar); responder una oferta por uno propio o una contraoferta en dos pasos (acción, confirmación si es irreversible), sabiendo antes de confirmar cuánto cambian el presupuesto, la caja y la masa salarial.

**The game goal**:

Que toda oferta, respuesta, acuerdo y venta pase por una función del motor con el estado guardado y deje un registro legible (`g.deals`); que la respuesta del club llegue con demora, como un mensaje, y que lo que haya que decidir con ella (acuerdo, contraoferta) sea un pendiente de la bandeja contado una vez; que lo irreversible se confirme con su consecuencia a la vista; que lo que el DT no ojeó se vea como rango (D4) y lo contractual (valor, pedido, sueldo, cláusula) como dato público y exacto; y que ninguna oferta caducada, acuerdo caído o cierre del libro pase en silencio.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Cinco casos: (a) tocó Mercado en la barra o la tecla de la pantalla (fase 4, planificando refuerzos); (b) llegó desde la insignia del mercado, el botón "Ir al mercado" de "Para atender" del Inicio o el enlace "Ver todos los tratos" de una oferta, una contraoferta o un acuerdo de la bandeja; (c) "Ir al partido" frenó porque llegó la respuesta de un club (la bandeja abre con esa decisión; desde ahí pasa a Tratos o negocia en el lugar); (d) volvió de una ficha de jugador (atrás) a su búsqueda; (e) cerró la ventana de negociación y vuelve al trato. |
| What is their emotional state? | Expectativa y algo de ansiedad por la plata ("¿me alcanza?"). Con ofertas propias esperando respuesta, expectativa por el "sí" ("¿cuándo contesta?"): por eso la fecha esperada se ve siempre. Con ofertas, contraofertas o acuerdos abiertos, urgencia leve por el plazo. Con el libro por cerrar, presión de calendario: es la única pantalla del juego donde el tiempo del juego corre contra el jugador, por eso el plazo se dice siempre en palabras (AC-02). Nunca presión de tiempo real: el tiempo no corre mientras la pantalla está abierta (AC-01, AC-03). |
| What cognitive load are they carrying? | Alta: tiene en la cabeza el hueco del plantel (qué puesto falta), la plata, el tope de sueldos, cuántos días quedan y lo que sabe y no sabe de cada candidato. Mitigación en 12: el estado del libro y los tres topes siempre en la misma franja, y el impacto de cada operación antes de confirmar. |
| What information do they already have? | El número de la insignia de Mercado (decisiones del mercado: ofertas por sus jugadores, contraofertas y acuerdos para cerrar) y, si vino de la bandeja, la decisión elegida y el mensaje con la respuesta del club. Del jugador que busca sabe lo que vio en la ficha breve o en el plantel rival: rangos de valoración y atributos, "conocés el N %". |
| What are they most likely trying to do? | Primero: responder una oferta abierta o una contraoferta, o cerrar un acuerdo que llegó. Segundo: buscar un refuerzo por puesto, edad y precio, compararlo y ofertar. Tercero: ver qué ofertas suyas siguen esperando y cuándo contestan; retomar una negociación empezada. Cuarto (ocasional): revisar los movimientos del resto del mercado y las finanzas. |
| What are they likely afraid of? | Perder una oferta, una contraoferta o un acuerdo por vencimiento; vender a un titular sin querer; fichar a alguien peor de lo que parecía (el rango era ancho); pasarse del tope salarial y quedar sin margen para renovar; que el representante se levante de la mesa sin aviso; cancelar la ventana y perder el acuerdo o las rondas; que el club conteste después de que cierre el libro; que otro club le compre al jugador mientras espera; ofertar por más plata de la que le queda sumando las ofertas abiertas; no entender por qué el club o el jugador dijeron que no. |

**Emotional design target for this screen**:

En control de la plata y del reloj: el DT sabe cuántos días quedan, qué puede pagar (descontado lo que ya comprometió en ofertas abiertas), cuándo contesta cada club, en qué quedó cada trato y qué cambia con cada operación, y nada irreversible pasa sin que lo confirme con su costo escrito, ni siquiera mientras avanzan los días.

---

## 3. Navigation Position

**Screen hierarchy**:

```
Partida (barra superior, N1)
  └── Mercado (sección; una sola pantalla `market`)   ← esta pantalla
        ├── Buscar        (tabla de jugadores ajenos + panel del jugador con la oferta)
        ├── Tratos        (para responder, esperando respuesta, para cerrar, para renovar, historial)
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

**Modal behavior**: Non-modal. Es una página de la navegación (N1/N6). El tiempo no avanza mientras está abierta, salvo que el jugador apriete Continuar o Ir al partido (F4). La negociación y el comparador son ventanas F5 (Esc o "Cancelar" cierran y el foco vuelve al botón que las abrió); cerrar la negociación **no pierde el trato ni las rondas**: queda como "Acordado con el club" en Tratos › Para cerrar y en la bandeja, con los términos y la paciencia del representante como estaban (sección 6). Las respuestas de los clubes llegan solo cuando pasa un día (Continuar o Ir al partido), nunca con la pantalla quieta.

**Dónde vive cada flujo** (la decisión de diseño central, pregunta 6 de la sección 15):

| Flujo | Dónde | Por qué |
|-------|-------|---------|
| Buscar, filtrar, comparar y elegir | Mercado › Buscar y Seguimiento | Es el trabajo de la ventana: mirar muchos candidatos y descartar. Una tabla con la oferta al costado permite recorrer filas y ver el impacto sin salir. |
| **Ofertar por el pase o pedir un préstamo** | **Los dos**: panel del jugador de Mercado (≥ 1180 px) y ficha › Contrato y mercado, con **el mismo componente** (`BidBox`: mismo texto, mismas llamadas al motor, mismo registro). Después de ofertar, el `BidBox` muestra el trato en curso ("Esperando respuesta", la contraoferta o el acuerdo) en lugar del formulario | Desde la tabla el DT quiere ofertar sin abrir la ficha (3 pasos, sin apilar historial); desde una ficha que le llegó por otro camino (informe de ojeo de la bandeja, ficha breve, club rival) la oferta ya está ahí. Con un solo componente no hay dos comportamientos. |
| **Responder una contraoferta o cerrar un acuerdo** (la respuesta del club a una oferta del DT) | **Los dos**: Mercado › Tratos (Para responder, Para cerrar) y Bandeja ("Para decidir"), mismo componente (`DealDecision`), misma clave `deal<id>`, mismas confirmaciones y notas; también el `BidBox` del jugador | La respuesta llega como mensaje: la bandeja es donde el DT la encuentra al frenar el avance; el Mercado es donde la compara con el resto de sus tratos y con la plata. Es **una decisión** por trato, contada una vez. |
| **Negociar con el representante** | `NegotiationModal` (F5), abierto desde un acuerdo (`DealDecision` en Tratos o en la bandeja, o el `BidBox` en estado acordado); **el trato y la paciencia quedan guardados** | Es una decisión corta de 2 o 3 rondas (F5 la nombra); lo que cambia es que cerrarla no destruye el trato ni devuelve las rondas gastadas. |
| **Responder una oferta por un jugador propio** | **Los dos**: Mercado › Tratos y Bandeja (bloque "Para decidir"), mismo componente (`OfferDecision`), misma clave `offer{id}`, misma confirmación F6 y nota F7 | La bandeja es el lugar de "¿qué tengo que decidir?"; el Mercado es donde el DT compara ofertas entre sí y contra el presupuesto. Es **una decisión** (un `Offer` en `g.offers`): se responde una vez, en cualquiera de los dos lugares, y desaparece de los dos. |
| Dónde está cada trato (incluidas las ofertas que esperan respuesta) | Mercado › Tratos | Es la vista que hoy no existe. "Esperando respuesta" vive solo acá y en el `BidBox`: no es una decisión, no va a la bandeja hasta que el club contesta. |
| Renovar un contrato | Ficha › Contrato (como hoy) y acceso desde Tratos › Para renovar (decisión del usuario, pregunta 18) | La renovación usa la misma negociación pero no depende del libro; en la ventana el DT necesita ver quién se le va libre en diciembre. |

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Mercado en la barra de secciones (N1) | Clic | Insignia F3 con las decisiones del mercado: ofertas por tus jugadores, contraofertas y acuerdos para cerrar (el mismo número que los pendientes `offer` y `deal` de la bandeja; "esperando respuesta" no suma; ver "Conteo" en la sección 8). |
| Barra inferior del celular, "Más" (N3) | Toque | Mercado no es una de las cuatro principales; está en el menú completo. |
| Tecla de número según el orden de `PAGES` (N9) | Tecla fuera de campos | Atajo de una tecla: se apaga con `settings.singleKeys`. |
| Barra de comandos (N7) | Ctrl+K → "Mercado" | Se suma "Tratos" como destino directo (`tab: 'tratos'`). |
| Insignia de Mercado | Clic | Abre Tratos con la primera decisión (la de plazo más corto, en el orden de `pendingOf`). |
| "Ir al mercado" de "Para atender" (Inicio) | Clic | Abre la última pestaña usada. |
| "Ver todos los tratos" en una oferta, contraoferta, acuerdo o respuesta de un club en la bandeja | Clic | Abre Tratos con ese trato elegido (`sel: 'offer12'` o `sel: 'deal7'`). Enlace de lectura; no responde. |
| Freno de "Ir al partido" por la respuesta de un club (F4) | Sistema | No entra al Mercado: abre la bandeja con la decisión `deal<id>` elegida (regla vigente de `App.tsx`). Desde ahí, "Ver todos los tratos". |
| "Ofertar" de un informe de ojeo de la bandeja, "Ofertar ▸" de la banda de la ficha | Clic | Va a la ficha › Contrato y mercado (el `BidBox` de la ficha). |
| Historial (N4) | ◂ ▸, Alt+←/→ | Restaura pestaña, filtros, selección, orden y scroll. |
| Guía de la primera partida (O1) y ayuda de pantalla (O2) | Sistema | El paso "Mercado" señala la barra de secciones. |

---

## 4. Entry & Exit Points

**Ruta del Mercado.** Toda la configuración visible va en la ruta (N4):

- `tab`: `buscar` | `tratos` | `seguimiento` | `movimientos` | `presupuesto`. Compatibilidad: `search` → `buscar`, `offers` → `tratos`, `short` → `seguimiento`, `moves` → `movimientos`, `fin` → `presupuesto`; cualquier otro valor cae en la pestaña por defecto.
- `sel` (campo opcional que ya existe en `Route`): en Buscar y Seguimiento, `p<id>` (el jugador del panel); en Tratos, la clave del trato (`offer<id>` como la de `pendingOf`, `deal<id>`, `renew<pid>`). Una sola clave de texto por selección.
- **Pestaña por defecto** (si la ruta no trae `tab`): la recordada con `useSticky('mk.tab')`; si nunca se eligió una, `tratos` cuando hay decisiones del mercado (ofertas por tus jugadores, contraofertas o acuerdos para cerrar) y `buscar` si no (la regla de hoy, `Market.tsx:18`, ampliada a los pendientes `deal`).
- Filtros de Buscar (`mk.pos`, `mk.age`, `mk.val`, `mk.ovr`, `mk.div`, `mk.only`), orden, línea y nombre de la tabla (`tbl.*.market`, `tbl.*.shortlist`) y la vista de columnas (`ta-table-<id>`) se recuerdan como hoy (C4). La selección de casillas no.

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Clic en Mercado, tecla, barra de comandos | Cualquier pantalla | Reemplazo de página, `page-in` 160 ms | `{ page: 'market' }` | Usa la pestaña recordada. |
| Insignia de Mercado | Barra de secciones | Igual | `{ page: 'market', tab: 'tratos' }` | Elige la primera decisión del mercado (la de plazo más corto). |
| "Ver todos los tratos" | Bandeja: oferta, contraoferta, acuerdo o mensaje con la respuesta de un club | Igual; apila | `{ page: 'market', tab: 'tratos', sel: 'offer<id>' \| 'deal<id>' }` | El foco va a esa tarjeta (regla de "Primary focus element on open"). Si el trato ya es terminal, a su fila del historial. |
| "Ver en Tratos" desde la ficha (`BidBox` con un trato abierto) | Ficha | Igual; apila | `{ page: 'market', tab: 'tratos', sel: 'deal<id>' }` | Opcional: el `BidBox` de la ficha ya permite retirar, responder la contraoferta y abrir la negociación sin salir. |
| Atrás o adelante | Ficha, otra pantalla | Restaura la entrada, sin `page-in` nuevo | Ruta guardada + scroll de la entrada | Si el `sel` guardado ya no existe (oferta respondida, jugador fichado), cae en la regla de "Selección al entrar". |

**Selección al entrar** (Buscar y Seguimiento, ≥ 1180 px): la de la ruta si existe y sigue en la tabla; si no, **ninguna** (el panel muestra "Elegí un jugador de la tabla para ver su oferta y su impacto" con la ayuda de teclado de la sección 7). No se elige la primera fila por defecto: ofertar sobre un jugador que el DT no eligió sería un error costoso, y no hay "leído" que proteger. En Tratos: la de la ruta; si no, la primera decisión del mercado en el orden de `pendingOf` (ofertas por tus jugadores, contraofertas y acuerdos, por plazo); si no hay, la primera oferta esperando respuesta; si no, ninguna.

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Cambiar de pestaña | La misma pantalla | En el lugar; **reemplaza** la entrada del historial | `tab` en la ruta y en `mk.tab` | No apila: volver atrás sale del Mercado, no recorre pestañas. |
| Elegir otro jugador o trato (≥ 1180 px) | La misma pantalla | En el lugar; reemplaza la entrada | `sel` en la ruta | — |
| Clic o Enter en el nombre del jugador, "Ver la ficha" | Ficha (N5) | `nav()`, apila | — | Vuelve con pestaña, filtros, selección y scroll. |
| Clic en una fila (≤ 1180 px) | Ficha (N5) | `nav()`, apila | — | Sin panel: la oferta está en la ficha › Contrato y mercado. |
| Clic en un escudo o nombre de club (`data-cid`) | Ficha de club | `nav()`, apila | — | — |
| Ofertar compra o pedir préstamo | La misma pantalla | En el lugar; el `BidBox` pasa a "Esperando respuesta" | `placeBid`: trato `waiting` en `g.deals` con la fecha esperada; `save()` | Ya no abre la negociación: el club contesta entre 1 y 3 días después con un mensaje. |
| Retirar la oferta (esperando respuesta o contraoferta) | La misma pantalla | En el lugar | `withdrawBid`: trato `fell` ("la retiraste"); `save()` | Sin F6: no se pagó nada y se puede volver a ofertar. |
| Aceptar la contraoferta | La misma pantalla, estado "Resuelto" | En el lugar | `acceptCounter`: trato `agreed`; `save()` | La tarjeta pasa a Para cerrar con el foco en "Negociar contrato" (compra) o "Confirmar el préstamo". |
| Mejorar la oferta (contraoferta) | La misma pantalla | En el lugar | `placeBid` sobre el mismo trato: vuelve a `waiting` con una fecha esperada nueva | — |
| Negociar contrato / Seguir negociando (acuerdo de compra) | `NegotiationModal` (F5) | Modal | Rondas y términos guardados en el trato | Esc o Cancelar cierran y el trato queda como estaba. |
| Confirmar el préstamo (acuerdo de préstamo) | La misma pantalla, "Resuelto" | En el lugar, F6 | `signDeal` (préstamo): ejecuta el pase; trato `loaned` | Sin negociación con el representante (regla de `mercado-de-pases`). |
| Aceptar, Pedir más o Rechazar una oferta | La misma pantalla, estado "Resuelto" | En el lugar | `acceptOffer` / `haggle` / `rejectOffer`; `save()` | Igual que en la bandeja (bandeja.md, sección 6). |
| Comparar (D3) | `Compare` (F5) | Modal | — | Cada columna trae "Ofertar" y "Seguir"; cerrar y elegir al jugador en el panel (o abrir su ficha, ≤ 1180 px). |
| "Negociar renovación" | `NegotiationModal` modo `renew` | Modal | — | Igual que desde la ficha. |
| Continuar o Ir al partido (barra superior, Espacio según G1) | La misma pantalla mientras avanza; la bandeja si frena por una decisión | F4 | — | Las acciones de oferta se deshabilitan durante el avance (7.3). "Ir al partido" frena cuando llega una contraoferta o un acuerdo (clave nueva `deal<id>`) y el último día para responderlos (`expiringKeys`), y abre la bandeja con esa decisión elegida. **No** frena por el cierre del libro ni por un rechazo (solo mensajes). |
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
│ │ Cierra el 20 de febrero  │ │ libre 0,7 M │ │ para primas  │ │ margen US$ 70 mil por mes          │ │
│ │ (quedan 12 días)         │ └─────────────┘ └──────────────┘ └────────────────────────────────────┘ │
│ └──────────────────────────┘                                                                         │
│ (KPI de presupuesto: "libre" = presupuesto menos lo comprometido en ofertas y acuerdos abiertos;      │
│  debajo, "US$ 1,4 M comprometidos en 1 oferta", solo si hay)                                         │
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
│ Si el club acepta y firma:                │
│   Libre p/ ofertar 2,1 M → 0,7 M   entra  │
│   Caja         3,0 M → 1,6 M              │
│   Sueldos/mes  410 mil → 418 mil (tope 480)│
│   Plantel      27 → 28                    │
│ Lanús responde entre el 12 y el 14 ene.   │  ← fecha esperada antes de ofertar
│ [● Ofertar compra]                        │
│ Préstamo: cargo [ 80.000 ] hasta fin de   │
│ temporada, cobra US$ 7,1 mil/mes.         │
│ [Pedir préstamo]                          │
│ Ofertas esperando respuesta: 2 de 5.      │
│ {nota F7, role=status}                    │
└──────────────────────────────────────────┘
```

**El mismo panel con un trato en curso** (el formulario se reemplaza por el estado del trato; una sola oferta abierta por jugador):

```
┌──────────────────────────────────────────┐   ┌──────────────────────────────────────────┐
│ (datos del jugador, igual que arriba)     │   │ (datos del jugador)                       │
├──────────────────────────────────────────┤   ├──────────────────────────────────────────┤
│ ⏳ Esperando respuesta de Lanús           │   │ ! Contraoferta · vence el 19 ene          │
│ Ofertaste US$ 1,4 M el 11 ene.            │   │ Lanús no aceptó US$ 1,4 M.                │
│ Responde entre el 12 y el 14 ene.         │   │ Pide US$ 1,6 M (+14 %).                   │
│ US$ 1,4 M comprometidos de tu presupuesto.│   │ {impacto con US$ 1,6 M}                   │
│ [Retirar la oferta]                       │   │ [● Aceptar US$ 1,6 M]  [Retirar la oferta]│
│ Para cambiar el monto, retirala y ofertá  │   │ Mejorar: [ 1.500.000 ] [Ofertar]          │
│ de nuevo: la espera vuelve a empezar.     │   │ Si mejorás, Lanús vuelve a responder en   │
│                                           │   │ 1 a 3 días.                               │
└──────────────────────────────────────────┘   └──────────────────────────────────────────┘
┌──────────────────────────────────────────┐   ┌──────────────────────────────────────────┐
│ ✓ Acordado con Lanús · vence el 18 ene    │   │ ✗ Su representante cortó la negociación   │
│ US$ 1,4 M. Falta el contrato con el       │   │ el 10 ene. No podés volver a ofertar por  │
│ jugador. Rondas: ●●○ quedan 2 de 3.       │   │ él hasta el 24 ene.                       │
│ [● Negociar contrato] [Cancelar el trato] │   │ (formulario deshabilitado)                │
└──────────────────────────────────────────┘   └──────────────────────────────────────────┘
```

`●` marca el foco al pulsar Enter en una fila (campo "Oferta"). "Mostrar 100 más" es un botón propio al pie de la tabla. "⏳" es ilustrativo: el ícono de "esperando" lo elige el art-director; siempre va con la palabra.

**Escritorio: Tratos**

```
│ [Buscar] [Tratos 3] [Seguimiento 6] [Movimientos] [Presupuesto]                                     │
│ PARA RESPONDER · 2   Ofertas por tus jugadores y contraofertas a las tuyas. Las que vencen antes, arriba.│
│ ┌ ! Vence en 3 días · el 18 nov ────────────────────────────────────────────────────────────────┐ │
│ │ {cara} Juan Pérez  DC 74 · Titular · 18 PJ          Racing Club  {escudo}  Liga Prof. · 4.º     │ │
│ │ OFERTA US$ 2,4 M   VALOR US$ 2,0 M   +20 % sobre su valor   SUELDO QUE LIBERÁS US$ 18 mil/mes   │ │
│ │ También ofertó Boca por Juan Pérez: US$ 2,1 M. Si aceptás una, la otra se cancela.             │ │
│ │ Si lo vendés: caja 3,0 → 5,4 M · presupuesto +1,44 M (60 %) · sueldos −18 mil · te quedan 2 DC │ │
│ │ [● Aceptar] [Pedir más] [Rechazar]   Pedir más: el club puede mejorar 15 % o retirarse.        │ │
│ │ {nota F7}                                                                                      │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ ! Contraoferta · vence el 19 ene ──────────────────────────────────────────────────────────────┐ │
│ │ {cara} T. Ruiz  DC 64–72 · conocés el 70 %             Vélez  {escudo}  Liga Prof. · 9.º       │ │
│ │ OFERTASTE US$ 0,9 M   PIDE US$ 1,2 M (+33 %)   PEDIDO PÚBLICO US$ 1,1 M   LIBRE US$ 2,1 M     │ │
│ │ Si aceptás y firma: presupuesto libre 2,1 → 0,9 M · sueldos +8 mil (tope 480) · plantel 28     │ │
│ │ [● Aceptar US$ 1,2 M]  Mejorar: [ 1.000.000 ] [Ofertar]  [Retirar la oferta]                   │ │
│ │ Si mejorás, Vélez vuelve a responder en 1 a 3 días. Si no respondés, vence el 19 ene.          │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ESPERANDO RESPUESTA · 2   Ofertas tuyas que el club todavía no contestó (no son decisiones)         │
│ ┌ Responde entre el 12 y el 14 ene ──────────────────────────────────────────────────────────────┐ │
│ │ G. Ibarra DC 62–74 · Lanús · ofertaste US$ 1,4 M el 11 ene (compra) · comprometido 1,4 M       │ │
│ │ [Retirar la oferta]  [Ver la ficha]                                                             │ │
│ ┌ Responde entre el 19 y el 21 feb · ! el libro cierra el 20 feb ────────────────────────────────┐ │
│ │ F. Leiva LI 66 · Tigre · pediste préstamo, cargo US$ 60 mil · si contesta el 21, caduca         │ │
│ │ [Retirar la oferta]  [Ver la ficha]                                                             │ │
│ PARA CERRAR · 1   Acuerdos con el club: falta el contrato con el jugador o tu confirmación          │
│ ┌ ! Vence el 18 ene (7 días o el cierre del libro) ──────────────────────────────────────────────┐ │
│ │ L. Gómez DC 70 · Banfield · acordado US$ 1,3 M · representante: ●●○ quedan 2 de 3 rondas      │ │
│ │ [● Seguir negociando] [Cancelar el trato]                                                      │ │
│ PARA RENOVAR · 3   Contratos que vencen en diciembre (se van libres si no renovás)                  │
│ ┌ M. Díaz MC 68 · dic 2026 · US$ 9 mil/mes · conformidad 62 ········ [Negociar renovación] ┐      │
│ HISTORIAL · 20 más recientes                                                       [Mostrar 20 más] │
│  14 ene  Firmado      Fichaste a R. Sosa · Talleres · US$ 1,1 M                                      │
│  13 ene  Sin acuerdo  Colón no acepta: "no puede desprenderse del jugador" (A. Paz)                  │
│  12 ene  Retirada     Retiraste la oferta de US$ 0,5 M por N. Vera (Sarmiento)                       │
│  10 ene  Se cayó      El representante de D. Sosa se levantó de la mesa · bloqueado hasta el 24 ene  │
```

"Tratos 3" cuenta las tres decisiones del ejemplo (la oferta de Racing, la contraoferta de Vélez y el acuerdo con Banfield), nunca las ofertas que esperan respuesta. "Para responder" y "Para cerrar" llevan el riel de aviso; "Esperando respuesta" va en tono neutro.

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
│ Si cerrás la ventana, la negociación queda como está hasta el 18 ene (vence el        │
│ acuerdo con Lanús). Si se levanta de la mesa, no podés volver a ofertar por él        │
│ durante 14 días.                                                                       │
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
| Tratos | Cinco grupos de tarjetas: Para responder, Esperando respuesta, Para cerrar, Para renovar, Historial | Ancho completo, columna de hasta 960 px | Con la página | Cada grupo con encabezado y número; "Para responder" y "Para cerrar" nunca se colapsan; un grupo vacío deja su línea F8 |
| Movimientos | Tabla simple con filtro "Mis pases / Todos" | Ancho completo | Con la página | "Mostrar 80 más" |
| Presupuesto | Tres medidores y balance de la temporada | Ancho completo, dos columnas ≥ 900 px | Con la página | — |

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| Ayuda de pantalla | Nota | Ayuda | "Lo que ves de un jugador ajeno es un rango; mandalo a ojear antes de ofertar. El libro de pases abre del 1 de enero al 20 de febrero y del 25 de junio al 10 de agosto." (corrige la guía, que hoy dice "enero y julio") | Sí | Sí — O2 `PageTip`; actualizar `TIPS` y el paso 6 de `Guide.tsx` |
| Título "Mercado de pases" | `h2` | Franja | Nombre de la pantalla (AC-09) | Sí | Sí |
| Estado del libro | Bloque de texto con ícono (✓ / ! / cerrado) | Franja | "Libro abierto · cierra el 20 de febrero (quedan 12 días)", "! … cierra mañana", "Libro cerrado · reabre el 25 de junio (faltan 41 días)". Texto, nunca solo color | Sí | No — nuevo; reemplaza al h1 "Libro abierto / cerrado". Datos de `windowState` (sección 8) |
| KPI de presupuesto | `.kpi` | Franja | Presupuesto de pases y lo **libre para ofertar** (presupuesto menos lo comprometido en ofertas esperando respuesta, contraofertas y acuerdos, `committed`); si hay comprometido, la leyenda dice "US$ 1,4 M comprometidos en 1 oferta"; si no, "para pases" | Sí | Sí — `.kpi` |
| KPI de caja | `.kpi` | Franja | Caja, con la leyenda "para primas"; en rojo y con signo "−" si es negativa | Sí | Sí — `.kpi` |
| KPI de sueldos | `.kpi` | Franja | Masa salarial / tope y el margen ("margen US$ 70 mil por mes"); si la masa pasa el tope, "pasaste el tope por US$ X" con "!" | Sí | Sí — `.kpi` |
| Pestañas del Mercado | Segmentado | Pestañas | Cinco secciones, una activa | Sí | Sí — C1 `Seg` (hoy un `.seg` armado a mano) con `aria-pressed` y estado activo con ✓ (decisión 3 de la bandeja); en celular, fila de chips desplazable (C5) |
| Contador de pestaña | Número `.cnt` + `.vh` | Pestañas | Tratos: decisiones del mercado (ofertas por tus jugadores, contraofertas y acuerdos para cerrar; en tono de aviso, con "!"; nunca las ofertas que esperan respuesta); Seguimiento: jugadores seguidos | Sí | Sí — contador de C5 |
| Filtros de Buscar | Selects, deslizadores y alternable | Filtros | Los de hoy, con nombres de categoría de `divName`/`DIV_NAMES` (hoy hardcodeados) y la opción "Primera B y Federal A" | Sí | Parcial — el bloque de hoy; el desplegable de celular es nuevo |
| Tabla de jugadores | `PlayerTable` con `onPick` | Tabla | La tabla única (D1) con vistas Ojeo, General, Contrato, Estadísticas y Físico; la vista Ojeo suma la columna `deal` ("Trato": Esperando, Contraoferta, Acordado, Sin acuerdo, Bloqueado hasta {fecha}, —) y `scoutEta` | Sí | Sí — D1; **cambios**: `onPick` (la fila elige en vez de abrir), foco itinerante, columna `deal` (pregunta 12) |
| Barra de acciones masivas | `.bulkbar` (D2) | Tabla | Seguir, Dejar de seguir, Mandar a ojear, Comparar | Sí (con selección) | Sí — D2 `scoutBulk`; con `scroll-margin-top` igual a su alto para no tapar el foco |
| Panel del jugador | Región (`aside` con `aria-label="Jugador elegido"`) | Panel | Datos del elegido, `BidBox` y notas | Sí (≥ 1180 px) | No — nuevo (patrón "panel de lectura al costado de una tabla", variante de F1; pregunta 15) |
| Datos del elegido | Bloque | Panel | Cara, nombre, puesto, valoración (`Val`, rango), club, categoría (`divName`), edad, "Conocés el N %", pedido, valor, sueldo, contrato, cláusula, potencial (si se sabe) | Sí | Sí — `Face`, `PosPill`, `Val` (D4), `Badge`, `knowOf` |
| Ojeo desde el panel | Botón + línea | Panel | "Mandar a ojear" y "Lo conocerías del todo en unos 15 días" (`scoutEta`); si el libro cierra antes, "El libro cierra antes: lo vas a conocer a medias" | Sí (si k < 100) | Sí — `scout`; texto nuevo |
| `BidBox` | Componente compartido | Panel y ficha › Contrato | Sin trato abierto: monto de la compra, estimación de sueldo, impacto, fecha esperada de respuesta ("Lanús responde entre el 12 y el 14 ene"), "Ofertar compra", bloque de préstamo con su propio cargo, "Ofertas esperando respuesta: N de 5", nota de resultado. Con trato abierto: su estado (esperando, contraoferta, acordado) con las acciones de `DealDecision`; con bloqueo tras una ruptura, el motivo y la fecha | Sí | No — nuevo, reemplaza la tarjeta "Negociar" de `PlayerPage.tsx:132-137` |
| `DealDecision` | Componente compartido | Tarjetas de Tratos, `BidBox`, detalle de la bandeja | La decisión que deja la respuesta de un club: contraoferta (Aceptar US$ X, Mejorar, Retirar la oferta) o acuerdo (Negociar contrato / Seguir negociando o Confirmar el préstamo, Cancelar el trato), con plazo, cifras e impacto | Sí | No — nuevo; mismo papel que `OfferDecision` para el otro lado del mercado |
| Vista previa de impacto (`DealImpact`) | Tabla de 4 filas | `BidBox`, negociación, tarjetas | Antes → después de lo libre para ofertar (con lo comprometido en otras ofertas, si hay), caja, sueldos por mes (con el tope) y plantel; "entra / no entra" en palabras | Sí | No — nuevo; datos de `dealImpact` (sección 8) |
| Nota de resultado | Texto `role="status"` | `BidBox`, tarjetas | "Oferta enviada a Lanús. Responde entre el 12 y el 14 ene." / "Retiraste la oferta por Juan Pérez." / "Aceptaste el pedido de Vélez: US$ 1,2 M. Falta el contrato con T. Ruiz." | Sí | Sí — F7, con `role="status"` |
| Tarjeta de trato | Grupo (`role="group"` con nombre) | Tratos | Una oferta por un jugador tuyo, una contraoferta, una oferta esperando respuesta, un acuerdo, un contrato por renovar o un cierre del historial; las plantillas están abajo | Sí | Parcial — anatomía de la plantilla "Oferta por un jugador" de la bandeja (`OfferDecision`), compartida con `DealDecision` |
| Encabezado de grupo de Tratos | `h3` con número | Tratos | "Para responder · 2", "Esperando respuesta · 2", "Para cerrar · 1", "Para renovar · 3", "Historial" | Sí | Sí — variante de `.ib-block-h` con borde de aviso en "Para responder" y "Para cerrar" (los dos tienen decisiones); "Esperando respuesta" en tono neutro |
| Confirmación en el lugar | Par de botones | Tarjeta, negociación | "Confirmar: vender a Pérez a Racing por US$ 2,4 M" / "No"; "Confirmar: fichar a Pérez, US$ 1,4 M + prima US$ 15 mil" / "Seguir negociando"; "Confirmar: F. Leiva llega a préstamo hasta fin de temporada, cargo US$ 60 mil, cobra US$ 6 mil por mes" / "No" | En lo irreversible | Sí — F6 (resuelve G5 para el mercado) |
| Ventana de negociación | Modal | Sobre la pantalla | Lo que pide el representante, formulario, paciencia ("quedan 2 de 3 rondas"), plazo del acuerdo, impacto, historial de respuestas y confirmación final | Sí | Sí — F5 `NegotiationModal`; **cambios**: paciencia, términos y respuestas guardados en el trato y visibles al reabrir, aviso del bloqueo de 14 días, impacto en vivo, confirmación final F6, sin datos exactos de ajenos (secciones 5.1 y 6) |
| Comparador | Modal | Sobre la pantalla | Dos o tres jugadores lado a lado; suma "Cabe en tu presupuesto" y "Cabe en tu tope" y por columna "Ofertar" y "Seguir" | Sí | Sí — D3 `Compare`; cambios menores |
| Tabla de movimientos | Tabla | Movimientos | Fecha, jugador, desde, hacia, monto; filtro "Mis pases / Todos" | Sí | Sí — la de hoy; `.me` en los propios |
| Medidor de límite | Barra + número + texto | Presupuesto | Presupuesto, caja y tope salarial: cuánto se usó, cuánto queda y qué limita cada uno | Sí | Sí — `.bar` con número visible (D6) |
| Estado vacío | Texto | Cada zona | F8 con causa y cuándo se llena | Sí | Sí — F8 |
| Estado del guardado | Nota F7 en `--bad` | Tarjeta, panel | "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión…" | Sí | Sí — `save()` devuelve booleano (resuelto en la bandeja) |

**Plantillas de tarjeta de Tratos** (qué muestra cada tipo; el primario es la acción esperada y el peligro va último):

| Tipo | Quién | Cifras clave | Línea extra | Acciones (orden) |
|------|-------|--------------|-------------|-----------------|
| **Oferta por un jugador tuyo** (`offer`) | Jugador (cara, puesto, valoración exacta, rol en el plantel, partidos) y club que ofrece (escudo, categoría y puesto en la tabla, o chip "Exterior") | Oferta, Valor, Diferencia con signo y palabras ("+20 % sobre su valor", "15 % bajo su valor"), Tu pedido estimado, Sueldo que liberás | Plazo en palabras con fecha (`offerDeadline`); "Mejorada N veces" si `asks > 0`; otras ofertas por el mismo jugador ("También ofertó Boca: US$ 2,1 M. Si aceptás una, la otra se cancela"); impacto de la venta; si es del exterior, "Se va al exterior y no vuelve al fútbol argentino" | **Aceptar** (primario, F6: "Confirmar: vender a X a Racing por US$ 2,4 M"; deshabilitado con el libro cerrado y el motivo escrito debajo), **Pedir más** (común; deshabilitado con el libro cerrado; debajo, siempre visible: "El club puede mejorar 15 % o retirarse"), **Rechazar** (peligro bordeado, F6: "Confirmar rechazo") |
| **Contraoferta** (`deal` en estado `countered`; pendiente `deal`, grupo Para responder) | Jugador ajeno (valoración como rango, "conocés el N %") y club vendedor (escudo, categoría, puesto) | Tu oferta, Lo que pide el club con la diferencia ("+14 %"), Pedido público, Libre para ofertar | Plazo en palabras con fecha (`dealDeadline`: 7 días desde la respuesta o el cierre del libro, lo que llegue antes; "! el libro cierra antes" si corresponde); "Si mejorás, {club} vuelve a responder en 1 a 3 días"; impacto con el monto que pide; préstamo: "Pide un cargo de US$ X" | **Aceptar US$ X** (primario; sin F6: no se paga nada hasta firmar; pasa a Para cerrar; deshabilitado con el motivo si no te alcanza lo libre), **Mejorar** (campo con el monto + "Ofertar"; común; un monto igual o mayor al pedido avisa "Con US$ X ya es aceptar su pedido: usá Aceptar"), **Retirar la oferta** (común; sin F6) |
| **Esperando respuesta** (`deal` en estado `waiting`; no es pendiente) | Jugador ajeno y club | Monto ofertado (o cargo del préstamo), fecha de la oferta, comprometido | "Responde entre el {desde} y el {hasta}" (nunca el día exacto); si el rango pasa del cierre del libro: "! El libro cierra el 20 feb: si contesta después, la oferta caduca" | **Retirar la oferta** (común; sin F6), Ver la ficha. Sin primario: no hay nada que decidir |
| **Acuerdo por cerrar: compra** (`deal` en estado `agreed`, `side: 'buy'`; pendiente `deal`) | Jugador ajeno (valoración como rango) y club vendedor | Monto acordado, Pedido original, Sueldo que pide el representante (o el estimado si no abrió la mesa), Prima, Paciencia del representante ("●●○ quedan 2 de 3 rondas") | Plazo del acuerdo (`dealDeadline`, en palabras con fecha); "El club ya aceptó; falta el contrato con X."; impacto con los últimos términos ofrecidos | **Negociar contrato** (primario; "Seguir negociando" si ya hubo rondas; abre la negociación con la paciencia y los términos guardados), **Cancelar el trato** (común; sin F6: no se pagó nada, queda en el historial como "Cancelado por vos") |
| **Acuerdo por cerrar: préstamo** (`agreed`, `side: 'loan'`; pendiente `deal`) | Jugador ajeno y club | Cargo, Sueldo que se suma (el de hoy), Hasta fin de temporada | Plazo (`dealDeadline`); impacto | **Confirmar el préstamo** (primario, F6 con cargo, plazo y sueldo escritos), **Cancelar el trato** (común; sin F6) |
| **Contrato por renovar** (`renew`) | Jugador propio (cara, puesto, valoración, rol, conformidad con número) | Contrato ("dic 2026"), Sueldo, Valor | "Si no renueva, se va libre al empezar la temporada." / "No quiere negociar hasta el {fecha}" si `negBlock` | **Negociar renovación** (primario; deshabilitado con `negBlock`, con el motivo escrito), Ver la ficha |
| **Cierre del historial** | Jugador y club | Monto, fecha | Estado en texto con ícono (tabla de estados, sección 6); la contraoferta si el club la dio | Ver la ficha (enlace). Sin acciones |

**Primary focus element on open**: según la pestaña y cómo se llegó. Buscar: el primer control de filtro (Puesto); si la ruta trae `sel`, la fila elegida. Tratos: el botón primario de la tarjeta elegida (la de la ruta, o la primera decisión); si la elegida es una oferta esperando respuesta, su "Retirar la oferta" **no** recibe el foco solo: el foco va al título de la tarjeta; sin tratos, el título de la pestaña. Seguimiento: la primera fila de la tabla (o el texto vacío). Movimientos: el filtro "Mis pases / Todos". Presupuesto: el título. En todos los casos, tras un cambio de pestaña con teclado el foco **se queda en la pestaña** que se tocó (el contenido cambia, el foco no se mueve solo).

### 5.4 Information Hierarchy

1. **¿Está abierto el libro? ¿Cuánto queda?** La primera lectura de la pantalla, en la franja, con palabras. Condiciona qué botones funcionan.
2. **¿Tengo algo que responder o cerrar?** La insignia y el contador de Tratos, y "Para responder" (ofertas por tus jugadores y contraofertas) y "Para cerrar" (acuerdos) arriba de Tratos, ordenados por plazo (igual que "Para decidir" de la bandeja).
3. **¿Me alcanza?** Presupuesto (con lo libre después de lo comprometido), caja y masa salarial contra el tope, siempre visibles; y el impacto antes → después en cada oferta.
4. **Qué sé del jugador y qué no.** Valoración como rango, "Conocés el N %", potencial "Desconocido", y la salida directa a ojearlo, antes del precio.
5. **Qué hacer con él.** La oferta (monto, estimación de sueldo, impacto, cuándo responde el club, botón).
6. **Dónde quedó cada cosa.** Esperando respuesta (con la fecha esperada) e Historial de Tratos.
7. **Puede esperar**: Movimientos del resto del mercado, el balance de la temporada, mensajes viejos del historial.

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Carga | — | No existe: el estado está en memoria | — | Dibuja en el primer cuadro. Sin esqueletos. |
| Libro abierto | `windowState.open` y quedan más de 7 días | "✓ Abierto · cierra el 20 de febrero (quedan 12 días)" | Todo habilitado | Estado normal. |
| Libro por cerrar | Quedan 7 días o menos | "! Abierto · cierra en 3 días (el 20 de febrero)"; "! cierra mañana"; "! cierra hoy" | Igual; las contraofertas y los acuerdos muestran "vence con el cierre del libro" si su plazo es el cierre; antes de ofertar, el `BidBox` avisa "Si Lanús contesta después del 20 feb, la oferta caduca" cuando el rango de respuesta pasa del cierre | Texto con "!" y palabras, no solo tono de advertencia. |
| Último día del libro | `daysLeft === 0` | "! Abierto · cierra hoy" | **Ofertar compra** y **Pedir préstamo** deshabilitados con el motivo escrito: "Hoy cierra el libro: una oferta nueva ya no llegaría a tener respuesta." Aceptar, Pedir más, Aceptar US$ X, Negociar contrato y Confirmar el préstamo siguen habilitados (son respuestas, no ofertas nuevas) | Toda respuesta llega al día siguiente como mínimo, y el día siguiente el libro está cerrado. |
| Aviso de cierre del libro (mensaje) | Faltan 7 días y el último día de cada libro (13 feb y 20 feb; 3 ago y 10 ago) | Mensaje en la bandeja, tema Mercado, `me: true`, sin `act`: "Faltan 7 días para que cierre el libro de pases (20 feb)" / "Hoy cierra el libro de pases". El cuerpo nombra lo abierto: "Tenés 2 ofertas esperando respuesta y 1 acuerdo sin firmar (L. Gómez, vence hoy). Una oferta que el club conteste después del cierre caduca." | **No frena "Ir al partido"** (decisión del usuario, pregunta 8). Suma como mensaje sin leer, no como pendiente | Una vez por libro y por aviso (lo emite el día que corresponde). Lo que sí puede frenar ese día es una decisión con plazo propio (un acuerdo o contraoferta que vence hoy), por la regla general de `expiringKeys`. |
| Libro cerrado | `!windowOpen` | "Libro cerrado · reabre el 25 de junio (faltan 41 días)"; tono neutro, no de error | Se deshabilitan **Ofertar compra, Pedir préstamo, Aceptar y Pedir más**, cada uno con el motivo escrito debajo ("El libro de pases está cerrado. Reabre el 25 de junio."); siguen habilitados buscar, filtrar, comparar, Seguir, Mandar a ojear, Rechazar, Negociar renovación | El motivo no queda solo en `title` (AC-05). El primer día con el libro cerrado, `dailyDeals` hace caducar las ofertas esperando respuesta, las contraofertas y los acuerdos abiertos (`fell`, "se cerró el libro"), con un mensaje por trato; no quedan tratos abiertos con el libro cerrado. |
| Cambio de estado del libro | La fecha cruza una frontera (avance con la pantalla abierta) | La franja se actualiza; texto oculto `.vh` en una región `aria-live="polite"`: "El libro de pases cerró." / "Abrió el libro de pases." | — | Una sola vez por cruce; el resto de la franja no se anuncia. |
| Buscar poblado | Hay jugadores que cumplen los filtros | Tabla con vista Ojeo por defecto, orden por valoración conocida (`knownRating`) | Todo habilitado | — |
| Buscar vacío | Ningún jugador cumple | F8: "No hay jugadores que cumplan esos filtros. Probá con otro puesto, más edad o sin límite de precio. No hay jugadores libres para fichar: solo se compra o se pide a préstamo a jugadores de otros clubes." | "Limpiar filtros" (botón común) | — |
| Panel sin elegir | ≥ 1180 px, sin `sel` | "Elegí un jugador de la tabla para ver su oferta y su impacto. Con el foco en la tabla: ↑ ↓ para recorrer, Enter para elegir, Espacio para marcar." | — | La ayuda de teclado está escrita, no solo en `title` (AC-05). |
| Jugador elegido | Fila elegida | Fila con fondo `--accent-soft` y borde izquierdo de 3 px (`--sel`), `aria-selected="true"`; panel con sus datos | La selección va en la ruta (`sel`), reemplaza la entrada | El panel nunca muestra la valoración, potencial ni atributos exactos de un jugador con conocimiento < 100: usa `shown`. |
| Jugador desconocido | `knowOf < 60` | Valoración en rango, "Potencial: Desconocido", "Personalidad: desconocida" | Aviso no bloqueante junto a "Ofertar compra": "Lo conocés al 35 %: su valoración real puede estar en cualquier punto del rango." | La oferta no se confirma por esto; es información (el DT puede querer ofertar igual). |
| Jugador ojeándose | `g.scouting` lo incluye | Botón "Ojeándolo…" deshabilitado con "Lo van a conocer del todo en unos 9 días" | — | — |
| Ojeo lleno | Ya hay 10 en `g.scouting` y se manda uno más | Debajo del botón: "Ya ojeás a 10: al sumarlo se deja de ojear a {nombre}." | Sin F6: es reversible y barato | Hoy la ficha lo hace en silencio (`ojeo.md`, Edge Cases). |
| Oferta en edición | El DT cambia el monto | Impacto, "entra / no entra" y la fecha esperada de respuesta se recalculan a cada tecla | — | El campo acepta enteros; con 0 o vacío, "Ofertar compra" deshabilitado con "Escribí un monto". |
| Oferta bloqueada antes de enviar | `bidCheck` (controles inmediatos de `placeBid`) devuelve un motivo | El botón queda deshabilitado con el motivo escrito debajo, antes de apretar: libro cerrado o último día, jugador a préstamo en su club, tu plantel con 45, el monto supera lo libre ("Te quedan libres US$ 0,7 M: tenés US$ 1,4 M comprometidos en 1 oferta"), el sueldo estimado supera el tope, ya hay una oferta abierta por él, tope de 5 ofertas esperando respuesta, bloqueo tras una ruptura | No se envía nada ni se gasta nada | Son los motivos que el DT puede saber sin preguntarle al club. Cada uno es un texto del motor; no se reescribe. |
| Oferta enviada (esperando respuesta) | `placeBid` ok | Nota F7: "Oferta enviada a Lanús. Responde entre el 12 y el 14 ene."; el `BidBox` pasa a la variante "Esperando respuesta" (sección 5.1); la tarjeta aparece en Tratos › Esperando respuesta; la fila de la tabla dice "Esperando" en la columna Trato | Trato `waiting` con `answerOn` (oculto) y el rango visible; el monto pasa a comprometido | **No** suma a ninguna insignia. El día exacto no se muestra (el rango es la información; el día exacto lo sabe solo el motor). |
| Retirar la oferta | "Retirar la oferta" (esperando o contraoferta) | Nota F7: "Retiraste la oferta por Juan Pérez."; el `BidBox` vuelve al formulario con el último monto | Trato `fell` ("la retiraste"); libera lo comprometido; se puede volver a ofertar en el acto (la espera empieza de nuevo) | Sin F6. Con una contraoferta abierta, la saca de los pendientes en el mismo `refresh()`. |
| Segunda oferta por el mismo jugador | Hay un trato abierto (`waiting`, `countered` o `agreed`) por ese jugador | En lugar del formulario, la variante del trato abierto; en la ficha y en el comparador, "Ya tenés una oferta por él: esperando respuesta de Lanús" | `placeBid` la rechaza ("Ya tenés una oferta abierta por él") | Una oferta abierta por jugador (compra **o** préstamo, no las dos). Para cambiar el monto: retirar y volver a ofertar, o "Mejorar" si hay contraoferta. |
| Tope de ofertas abiertas | 5 tratos en `waiting` o `countered` | Debajo de los botones: "Ya tenés 5 ofertas esperando respuesta o contraoferta: retirá una o esperá que contesten." | Ofertar compra y Pedir préstamo deshabilitados | Los acuerdos por cerrar no cuentan para el tope (ya los limita lo comprometido y su plazo). El contador "Ofertas esperando respuesta: N de 5" se ve siempre en el `BidBox`. |
| Llega la respuesta: acuerdo (compra) | `dailyDeals` el día `answerOn` y `clubAnswer` acepta | Mensaje a la bandeja (tema Mercado, `act: 'deal'`, `ref`, `pid`): "Lanús aceptó tu oferta por Juan Pérez" con "US$ 1,4 M. Falta el contrato con el jugador: tenés hasta el 18 ene." La tarjeta pasa a Para cerrar; el `BidBox`, a "Acordado" | Trato `agreed` con `deadline = dealDeadline`; pendiente nuevo `deal<id>`: suma 1 a las insignias de Mercado y Bandeja y **frena "Ir al partido"** (clave nueva) | El mensaje y el pendiente cuentan una vez (el mensaje se excluye de los sin leer mientras la decisión está abierta). No abre la negociación sola: la abre el DT. |
| Llega la respuesta: préstamo concedido | Igual, `side: 'loan'` | Mensaje: "Tigre te presta a F. Leiva" con "Cargo US$ 60 mil, hasta fin de temporada. Confirmá antes del 18 ene." | Trato `agreed` (préstamo); pendiente `deal<id>`; frena el avance | El pase no se ejecuta solo: se confirma con F6 (nada irreversible ocurre mientras avanzan los días). |
| Llega la respuesta: contraoferta | `clubAnswer` devuelve `counter` | Mensaje: "Lanús pide US$ 1,6 M por Juan Pérez" con "No aceptó tu oferta de US$ 1,4 M. Respondé antes del 18 ene: aceptar, mejorar o retirarla." La tarjeta pasa a Para responder | Trato `countered` con `counter` y `deadline = dealDeadline`; pendiente `deal<id>`; suma 1 a las insignias y frena el avance | Es una decisión porque el club espera una respuesta y vence. |
| Llega la respuesta: rechazo | `clubAnswer` sin `ok` ni `counter` | Mensaje con el motivo del club: "Colón no acepta tu oferta por A. Paz: no puede desprenderse del jugador." La tarjeta pasa al historial ("Sin acuerdo") | Trato `refused`; libera lo comprometido; **no** es pendiente ni frena el avance (solo suma como mensaje sin leer) | Se puede volver a ofertar (reabre el mismo trato). |
| Contraoferta o acuerdo vencidos | `dealDeadline` pasó sin respuesta del DT | Mensaje: "Lanús dio por terminada la negociación por Juan Pérez: no respondiste su pedido" / "Venció el acuerdo con Banfield por L. Gómez"; la tarjeta va al historial | Trato `fell` ("venció la contraoferta" / "venció el acuerdo"); el último día para responder frena "Ir al partido" una vez (`expiringKeys`) | Igual que las ofertas por tus jugadores (AC-02). |
| Caduca por el cierre del libro | Primer día con el libro cerrado y el trato en `waiting`, `countered` o `agreed` | Mensaje: "Tu oferta por Juan Pérez caducó: se cerró el libro de pases" (o "el acuerdo con Banfield se cayó: se cerró el libro"); historial "Caducó" | Trato `fell` ("se cerró el libro") | Una oferta cuyo club iba a contestar después del cierre nunca recibe respuesta: caduca. |
| El jugador se fue a otro club mientras tanto | En `dailyDeals`, el jugador ya no está en el club del trato (otro club lo compró, se fue al exterior, se retiró) | Mensaje: "Lanús vendió a Juan Pérez a Boca: tu oferta quedó sin efecto."; historial "Se cayó: otro club lo compró" | Trato `fell` ("otro club lo compró" / "ya no está disponible"); libera lo comprometido | Solo puede pasar mientras **espera respuesta** o con contraoferta: un jugador con un **acuerdo** (`agreed`) no se lo vende la IA a otro club hasta que venza (`marketTick` lo salta); el club dio su palabra. |
| Negociación abierta | Se abre la ventana | Formulario con la primera oferta propuesta (90 % del sueldo y 60 % de la prima) o con los últimos términos guardados, paciencia "●●○ quedan 2 de 3 rondas", plazo del acuerdo, historial de respuestas, impacto en vivo | Paciencia, términos y respuestas se guardan en el trato después de cada ronda (decisión del usuario, pregunta 4); cerrar la ventana no los reinicia | — |
| Control duro de la negociación | Sueldo sobre el tope o prima sobre la caja | Aviso "!" encima del botón: "Con este sueldo superás el tope por US$ 3 mil. Esto no gasta paciencia." | "Ofrecer" sigue habilitado; el motor contesta con el mismo texto y no resta paciencia | — |
| Acuerdo con el jugador (por confirmar) | `evalOffer.ok` | El bloque de abajo de la ventana cambia: "¡Hay acuerdo! Falta tu confirmación." con **Confirmar: fichar a X, US$ monto + prima US$ Y** (primario, F6) y "Seguir negociando" | **Ya no ejecuta el pase en el mismo clic de "Ofrecer"** (hoy sí, `Locker.tsx:104-105`) | Cambiar cualquier campo cancela el acuerdo y vuelve a "Ofrecer". |
| Firmado | Confirmar | Nota F7 en verde (con "✓"): "Firmó. Juan Pérez es nuevo jugador de Independiente." En el panel, "Ya es tuyo" y "Ver la ficha"; la fila sale de la tabla | `signDeal`; trato "Firmado"; sale de la lista de seguimiento (lo hace `doTransfer`) | Si el elegido deja la tabla, el foco va a la fila siguiente y se anuncia. |
| Ruptura | `evalOffer.walk` | Nota en `--bad` con "✗": "El representante de Juan Pérez da por terminada la negociación. La operación se cayó. No podés volver a ofertar por él hasta el 24 ene." | Trato `fell` ("el representante se levantó de la mesa") con `blockUntil = hoy + 14`; noticia "Se cayó el pase de X" (ya existe; la emite `walkAway`); el pendiente desaparece | El motivo y la fecha se dicen en el texto; no solo color. La ventana avisa del bloqueo antes de cada ronda ("Si se levanta, no podés volver a ofertar por él durante 14 días"). |
| Bloqueado tras una ruptura | `bidBlock(g, pid)` devuelve una fecha | En el `BidBox`, la ficha y la columna Trato: "✗ Su representante cortó la negociación el 10 ene. No podés volver a ofertar por él hasta el 24 ene." | Ofertar compra y Pedir préstamo deshabilitados con ese texto | 14 días de calendario; si en ese lapso cierra el libro, la fecha se dice igual. |
| Trato pendiente al cerrar la ventana | Esc o Cancelar con acuerdo del club sin firmar | La ventana se cierra; la tarjeta sigue en Tratos › Para cerrar y en la bandeja, con "●●○ quedan 2 de 3 rondas" y los últimos términos | El foco vuelve al botón que la abrió; la paciencia no se recupera al reabrir | Hoy el "sí" se perdía y la paciencia se reiniciaba. |
| Oferta recibida vigente | `g.offers` | Tarjeta con acciones | — | — |
| Oferta mejorada | `haggle` devuelve `true` | Nota F7: "Racing mejoró su oferta: ahora US$ 2,8 M." (monto nuevo, mismo id y plazo); "Mejorada 1 vez" en la tarjeta | La tarjeta sigue en "Para responder" | Igual que la bandeja (conserva el id, `o.asks`). |
| Oferta retirada | `haggle` devuelve `false` | Nota F7 en advertencia: "Racing se retiró de la negociación." | Estado "Resuelto" (abajo); entra al historial como "Se retiró" | — |
| Resuelto | Acción confirmada | La tarjeta queda en su lugar con "✓ Resuelto" en texto y tono tenue hasta cambiar la selección o salir; muestra la nota F7 y, si quedan, "Siguiente para responder ▸" (primario) | El foco va a "Siguiente para responder" o, si no hay, a la nota | Igual que la bandeja: el panel no salta bajo el cursor. La copia local de lo resuelto es estado de la interfaz, no del juego. |
| Oferta, contraoferta o acuerdo vencidos o respondidos en la bandeja | La oferta desapareció de `g.offers`, o el trato dejó de ser `countered`/`agreed` | La tarjeta, si estaba elegida, reemplaza sus acciones por texto tenue: "Esta oferta venció el 18 nov." / "Ya respondiste esta oferta." / "Este acuerdo venció el 18 ene." / "Ya respondiste esta contraoferta." | Desaparece al refrescar si no está elegida | Distinguir "venció" de "respondida" sale del registro (`g.deals`). |
| Plazo corto | Vence hoy o mañana | "Vence hoy" / "Vence mañana" con "!" | — | Texto, no solo color. |
| Avance en curso | F4 corriendo | Las acciones de oferta, Retirar la oferta, Aceptar, Pedir más, Aceptar US$ X, Mejorar y las de la negociación se deshabilitan con "Frená el avance para decidir" visible; buscar y leer siguen | Ver 7.3 | Las respuestas que llegan durante el avance actualizan Tratos en el mismo cuadro; si alguna es una decisión, el avance frena y abre la bandeja. |
| Llega una respuesta con la pantalla abierta | Continuar de un día (o el avance) con el Mercado a la vista | La tarjeta cambia de grupo en el lugar; si estaba elegida, conserva la selección | Región `aria-live="polite"` de la franja: "Llegó la respuesta de Lanús por Juan Pérez: aceptó." | Una línea por respuesta, como el cambio de estado del libro. |
| Modal abierta | Negociación o comparador | Fondo oscurecido (F5) | La pantalla de atrás no responde al teclado | — |
| Entidad inexistente | El jugador se retiró, se fue al exterior o lo fichó otro | En un panel o tarjeta: "Ya no está disponible." y acciones ocultas; el historial conserva su nombre (snapshot) | Si había un trato abierto, `dailyDeals` lo pasa a `fell` con su mensaje (fila "El jugador se fue a otro club mientras tanto") | — |
| Jugador a préstamo en su club | `loanFrom != null` | En el panel: "Está a préstamo de {club}: no se puede comprar ni pedir a préstamo." (texto del motor) y botones deshabilitados con ese motivo | — | Regla de `evaluateBid`. |
| Plantel lleno | 45 jugadores | "Tu plantel ya tiene 45 jugadores: vendé o liberá a alguien antes de ofertar." (motivo escrito) | Botones deshabilitados | Se avisa antes de apretar, no solo después. |
| Tratos vacío | Sin tratos ni contratos por vencer | F8 por grupo: Para responder: "No hay ofertas por tus jugadores ni contraofertas. Con el libro abierto los clubes del país y del exterior ofertan; si declarás transferible a alguno, llegan más." Esperando respuesta: "No tenés ofertas esperando respuesta. Cuando ofertes por un jugador, el club contesta en 1 a 3 días y la oferta espera acá." Para cerrar: "No hay acuerdos abiertos. Cuando un club acepte tu oferta, te llega un mensaje y el acuerdo aparece acá." Para renovar: "Ningún contrato vence este año." Historial: "Todavía no cerraste ningún trato." | — | — |
| Seguimiento vacío | `shortlist` vacío | F8: "No seguís a ningún jugador. Marcalos en Buscar y tocá Seguir; los que mandes a ojear entran solos." | — | — |
| Error al guardar | `save()` falla | Nota F7 en `--bad`: "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes." | El estado del juego ya cambió en memoria; no se revierte | Igual que la bandeja. |
| Celular / ≤ 1180 px: sin panel | Ancho ≤ 1180 px | La tabla ocupa todo; tocar una fila abre la ficha | La oferta está en la ficha › Contrato y mercado | — |

**Estados de un trato** (texto visible en historial y tarjetas; ícono + palabra, nunca solo color):

| Estado (`Deal.state`) | Lado | Texto | Terminal | ¿Pendiente? | Cómo se llega |
|---|---|---|---|---|---|
| `waiting` | Compra o préstamo | "Esperando respuesta · responde entre el 12 y el 14 ene" | No | No (no suma a ninguna insignia ni frena el avance) | `placeBid` (también "Mejorar" sobre una contraoferta) |
| `countered` | Compra o préstamo | "Contraoferta: {club} pide US$ 1,6 M · vence el 18 ene" | No | **Sí**, `deal<id>` con `deadline` | `clubAnswer` con `counter` |
| `agreed` | Compra | "Acordado con el club · falta el contrato · vence el 18 ene" | No | **Sí**, `deal<id>` con `deadline` | `clubAnswer` acepta, o `acceptCounter` |
| `agreed` | Préstamo | "Préstamo acordado · falta tu confirmación · vence el 18 ene" | No | **Sí**, `deal<id>` con `deadline` | Igual |
| `refused` | Compra o préstamo | "Sin acuerdo con el club" + el motivo del club | Sí, salvo que el DT vuelva a ofertar (reabre el mismo trato) | No | `clubAnswer` sin `ok` ni `counter` |
| `signed` | Compra | "Firmado" | Sí | No | `signDeal` |
| `loaned` | Préstamo | "Prestado hasta fin de temporada" | Sí | No | `signDeal` (préstamo) |
| `fell` | Compra o préstamo | Según `why`: "Retiraste la oferta" (`pulled`), "Cancelaste el trato" (`cancel`), "Caducó: se cerró el libro" (`window`), "Venció la contraoferta" / "Venció el acuerdo" (`deadline`), "El representante se levantó de la mesa · bloqueado hasta el {fecha}" (`walk`), "Se cayó: otro club lo compró" / "ya no está disponible" (`gone`) | Sí (tras `walk`, bloqueado 14 días; en los demás, se puede volver a ofertar) | No | `withdrawBid`, `cancelDeal`, `dailyDeals`, `walkAway` |
| `sold` | Venta | "Vendido a {club} por US$ X" | Sí | — | `acceptOffer` |
| `declined` | Venta | "Rechazaste la oferta de {club}" | Sí | — | `rejectOffer` |
| `withdrawn` | Venta | "{club} se retiró de la negociación" | Sí | — | `haggle` falso |
| `expired` | Venta | "Venció la oferta de {club}" | Sí | — | `marketTick` |

Las ofertas por tus jugadores (lado venta) siguen siendo pendientes `offer<id>` de `g.offers`; el registro de `g.deals` solo guarda su cierre.

**Ciclo de una oferta del DT** (compra o préstamo):

```
            placeBid ──► waiting ──(dailyDeals, día answerOn: clubAnswer)──┬──► agreed ──► signDeal ──► signed / loaned
               ▲            │                                              ├──► countered ──► acceptCounter ──► agreed
               │            │ withdrawBid                                  │        │  placeBid (Mejorar) ──► waiting
               │            ▼                                              │        │  withdrawBid / vence ──► fell
               └──(otra vez)  fell ◄── cierre del libro, jugador vendido ◄─┴──► refused
                             ▲  agreed: cancelDeal, vence, walkAway (bloqueo 14 días), cierre del libro
```

---

## 7. Interaction Map

Entradas cubiertas: mouse y teclado (escritorio), toque (celular). Gamepad: fuera de alcance.

**Decisión de teclado.** No se agregan atajos de una letra (el nivel Estándar exige poder apagarlos, AM-03; la biblioteca los prohíbe fuera del partido, N9). En la tabla con `onPick`, las filas tienen **foco itinerante** (una sola parada de Tab, como la lista de la bandeja): ↑ ↓ mueven el foco, **Enter elige** al jugador (el panel se muestra y el foco pasa al campo "Oferta"), **Espacio marca o desmarca la casilla** de selección múltiple (D2; como en un `listbox` de selección múltiple, Espacio no es Continuar porque la fila tiene función propia, AM-02), Mayús + ↑ ↓ extiende la selección. Con eso, ofertar con teclado desde la tabla es: ↓ hasta la fila, Enter (foco al monto), Enter (ofertar: queda esperando respuesta). Cuando llega el "sí" (1 a 3 días después, en la bandeja o en Tratos): Enter en "Negociar contrato", las rondas que hagan falta, Enter en "Confirmar: fichar a X…". Responder una oferta por un jugador tuyo es: Tab a la tarjeta, Enter (Aceptar abre la confirmación), Enter (confirma). Responder una contraoferta: Enter en "Aceptar US$ X" (pasa a Para cerrar con el foco en "Negociar contrato").

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
| Escribir / cambiar | Todas | Campo "Oferta" | Recalcula el impacto y el motivo de bloqueo, si hay | Filas "antes → después", "entra / no entra" y "responde entre el … y el …" | Ninguna | — | `inputmode="numeric"`; separadores de miles al salir del campo. |
| Clic / Enter | Todas | **Ofertar compra** | `placeBid(g, pid, fee, false)` | Enviada: nota F7 "Oferta enviada a Lanús. Responde entre el 12 y el 14 ene." y el `BidBox` pasa a "Esperando respuesta". Bloqueada (no debería poder apretarse: el botón ya está deshabilitado con el motivo): nota con el motivo | Ninguna | — | Enter dentro del campo "Oferta" hace lo mismo. El foco va a la nota y después a "Retirar la oferta". Sin F6: no se paga nada hasta firmar. |
| Clic / Enter | Todas | **Pedir préstamo** | `placeBid(g, pid, loanFee, true)` | Igual: "Pedido enviado a Tigre. Responde entre el … y el …" | Ninguna | — | Su cargo es un campo propio con valor por defecto `loanFee(p)` (8 % del valor): **el monto de la compra no se reutiliza** (hoy, el préstamo usa el pedido de la compra). |
| Clic / Enter | Todas | **Retirar la oferta** (esperando respuesta o contraoferta) | `withdrawBid(g, dealId)` | Nota F7 "Retiraste la oferta por X."; el `BidBox` vuelve al formulario; la tarjeta pasa al historial | Ninguna | — | Sin F6 (se puede volver a ofertar en el acto). Con contraoferta, la decisión desaparece de la bandeja en el mismo `refresh()`. |
| Clic / Enter | Todas | **Aceptar US$ X** (contraoferta) | `acceptCounter(g, dealId)` | La tarjeta pasa a Para cerrar ("Acordado"), nota F7 "Aceptaste el pedido de Lanús: US$ 1,6 M. Falta el contrato con Juan Pérez."; el foco va a "Negociar contrato" (o "Confirmar el préstamo") | Ninguna | — | Sin F6: no paga nada hasta firmar y el acuerdo se puede cancelar. Deshabilitado con motivo si el monto supera lo libre. El plazo del acuerdo es el de la contraoferta (no se reinicia). |
| Escribir + Clic / Enter | Todas | **Mejorar** → campo + "Ofertar" (contraoferta) | `placeBid(g, pid, fee, loan)` sobre el mismo trato | Nota F7 "Oferta mejorada enviada a Lanús. Responde entre el … y el …"; la tarjeta pasa a Esperando respuesta | Ninguna | — | El campo arranca en tu oferta anterior; con un monto ≥ al pedido, "Ofertar" se deshabilita con "Con US$ X ya es aceptar su pedido: usá Aceptar". |
| Clic / Enter | Todas | **Confirmar el préstamo** (acuerdo de préstamo) | Abre F6 → `signDeal(g, dealId)` | F6: "Confirmar: F. Leiva llega a préstamo hasta fin de temporada, cargo US$ 60 mil, cobra US$ 6 mil por mes"; confirmado: nota F7, trato `loaned`, "Resuelto" | Ninguna | — | Es el paso irreversible del préstamo. |
| Clic / Enter | Todas | **Ofrecer** (negociación) | `sendTerms(g, dealId, terms)` | Acuerdo: pasa a "Hay acuerdo" (sin fichar). Contraoferta: carga los términos del representante, baja la paciencia y la guarda ("quedan 1 de 3 rondas"). Ruptura: trato "Se cayó" y bloqueo de 14 días con la fecha escrita. Control duro: aviso sin gastar paciencia | Ninguna | — | El foco va al resultado (`role="status"`) y luego al primario del bloque. |
| Clic / Enter | Todas | **Confirmar: fichar a X…** | `signDeal(g, dealId, terms)` | Nota F7 en verde; trato "Firmado"; el pase se ejecuta (`doTransfer`) | Ninguna | — | F6: es el único paso irreversible de la compra. Esc o "Seguir negociando" lo cancelan. |
| Esc / "Seguir negociando" / cambiar un campo | Todas | Confirmación de fichaje abierta | Cancela la confirmación; vuelve a "Ofrecer" | — | Ninguna | — | — |
| Clic / Enter | Todas | **Negociar contrato** / **Seguir negociando** (acuerdo de compra en Tratos, la bandeja o el `BidBox`) | `openNegotiation(g, dealId)` y abre `NegotiationModal` con los términos y la paciencia guardados | Modal | `pop` 140 ms | — | La misma ventana desde la bandeja: el foco vuelve al botón que la abrió. |
| Clic / Enter | Todas | **Cancelar el trato** | `cancelDeal(g, dealId)` | Pasa al historial como "Cancelaste el trato"; nota F7; libera lo comprometido; la decisión sale de la bandeja en el mismo `refresh()` | Ninguna | — | Sin F6: no se pagó nada y se puede volver a ofertar (la espera vuelve a empezar). |
| Clic / Enter | Todas | **Aceptar** (oferta recibida) | Abre F6 | "Confirmar: vender a Pérez a Racing por US$ 2,4 M" (primario) y "No"; el foco va a Confirmar | Ninguna | — | Si hay otra oferta por el mismo jugador, el texto la nombra ("se cancela la de Boca"). Si es del exterior, dice "se va al exterior". |
| Igual | Todas | Confirmar venta | `acceptOffer(g, o)` | "Resuelto"; nota F7 "Vendiste a Pérez a Racing por US$ 2,4 M." | Ninguna | — | Misma función y misma nota que la bandeja. |
| Igual | Todas | **Pedir más** | `haggle(g, o)` | Nota F7: "Racing mejoró su oferta: ahora US$ 2,8 M." o "Racing se retiró de la negociación." | Ninguna | — | Sin F6: el riesgo está escrito junto al botón. |
| Igual | Todas | **Rechazar** → Confirmar rechazo | `rejectOffer(g, o)` | "Resuelto"; nota "Rechazaste la oferta de Racing." | Ninguna | — | F6 (hoy, un clic). |
| Clic / Enter | Todas | **Negociar renovación** | Abre `NegotiationModal` modo `renew` | Modal | `pop` 140 ms | — | Deshabilitado con `negBlock`, con el motivo y la fecha escritos. |
| Clic / Enter | Todas | **Siguiente para responder** | Elige la próxima decisión del mercado (oferta, contraoferta o acuerdo, en el orden de `pendingOf`) | Tarjeta con el foco en su primario | Ninguna | — | — |
| Clic / Enter / toque | Todas | Nombre o cara del jugador, "Ver la ficha" | `nav({ page: 'player', id })` | Ficha | `page-in` | — | — |
| Clic / Enter | Todas | "Ver todos los tratos" (bandeja) | `nav({ page: 'market', tab: 'tratos', sel })` | Tratos con esa oferta | `page-in` | — | Solo lectura; no responde. |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Avance en curso (F4) | Acciones de oferta, de respuesta (Retirar, Aceptar US$ X, Mejorar) y de negociación deshabilitadas (motivo visible); buscar, filtrar, elegir y leer siguen | El estado cambia cada día (llegan respuestas, vencen plazos); evitar responder algo que cambia en el mismo cuadro. Espacio y Esc frenan (N9). |
| Último día del libro | Ofertar compra y Pedir préstamo deshabilitados con motivo escrito; las respuestas (Aceptar, Pedir más, Aceptar US$ X, Negociar contrato, Confirmar el préstamo) siguen | La respuesta del club llegaría con el libro cerrado. |
| Libro cerrado | Ofertar compra, Pedir préstamo, Aceptar y Pedir más deshabilitados con motivo escrito; Rechazar y Negociar renovación siguen. No hay tratos de compra abiertos (caducaron el primer día cerrado) | Regla del juego (`windowOpen`; `acceptOffer` y `haggle` devuelven `false`; `placeBid` rechaza). |
| Bloqueo tras ruptura | Ofertar compra y Pedir préstamo deshabilitados para ese jugador hasta la fecha escrita | Decisión del usuario (pregunta 4). |
| 5 ofertas abiertas | Ofertar compra y Pedir préstamo deshabilitados para cualquier jugador, con el motivo | Tope de ofertas simultáneas (pregunta 2). |
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
| Ofertas del DT por jugadores ajenos | Nada: `evaluateBid` es una consulta instantánea; el "sí" vive en el estado local de `PlayerPage` | **E2** `g.deals` (`Deal[]`, opcional en `Game`, tope 60, los terminales más viejos se podan primero y nunca un trato abierto; partidas viejas: `g.deals ?? []`, sin subir `Game.version`) y `g.nextDeal` (id consecutivo propio, no `g.nextId`) |
| Respuesta del club con demora | No existe | **E11** `placeBid` crea el trato `waiting` con `answerOn` (1 a 3 días); **E12** `dailyDeals(g)` lo contesta ese día con `clubAnswer` (la lógica de `evaluateBid`, sin los controles inmediatos) y emite el mensaje |
| Decisiones que deja la respuesta | No existe | **E13** pendiente `deal` en `pendingOf` (contraoferta y acuerdo), `pendingKeyOf` para `act: 'deal'`, `expiringKeys` con los `deal`, `News.act: 'deal'` |
| Estado de una negociación con el representante | Local de `NegotiationModal` (`dem.patience` se reinicia al reabrir) | **E4** términos, paciencia, rondas y respuestas guardados en el `Deal`; `blockUntil` tras una ruptura |
| Plata comprometida en ofertas abiertas | No existe | **E14** `committed(g)` y `bidCheck(g, pid, fee, loan)` (controles inmediatos, el mismo texto que el botón deshabilitado) |
| Ofertas recibidas abiertas | `g.offers` (con `asks`, `date`, `fee`, `from`, `fromName`) | Monto inicial (`Offer.fee0`) para decir "mejoró de X a Y" (nice-to-have) |
| Ofertas recibidas cerradas | Nada propio: vendida → `g.transfers`; vencida → noticia "Venció…" (`me: true`); rechazada o retirada → nada | **E2** `acceptOffer`, `rejectOffer`, `haggle` y `marketTick` escriben el cierre en `g.deals` |
| Plazo de una oferta recibida | `offerDeadline(o)` | — (ya existe) |
| Impacto de una operación | Nada: cada pantalla suma por su cuenta | **E5** `dealImpact(g, kind, pid, fee, terms?)` pura |
| Cargo mínimo estimado de un préstamo | Fórmula dentro de `evaluateBid` | **E6** `loanFee(p)` exportada (también define el valor por defecto del campo) |
| Días que faltan para conocer a un jugador | Ritmo dentro de `dailySquad` | **E7** `scoutEta(g, p)` pura |
| Cierre de tratos al cerrar el libro, vencer su plazo o irse el jugador | No existe | **E8** `dailyDeals` los pasa a `fell` y emite la noticia (`tag: 'mercado'`, `act: 'deal'`, `ref: deal.id`, `pid`); `marketTick` no vende a otro club a un jugador con un trato `agreed` |
| Pases propios en `g.transfers` | Solo nombres (`from`, `to`) | `Transfer.mine?: boolean` al registrar (pregunta 11) |
| Declarar transferible | `setListed` existe, pero `PlayerPage.tsx:133` y `ownBulk` escriben `p.listed` | **E9** usar `setListed` en los dos |
| Aviso de cierre del libro | No existe | **E10** mensaje a los 7 días y el último día de cada libro, emitido por `dailyDeals`; **sin** freno del avance (decisión del usuario, pregunta 8) |

**Forma de `Deal`** (para el ui-programmer y el gameplay-programmer; los nombres son propuestas):

```
Deal { id, side: 'buy' | 'loan' | 'sell', pid, name /* snapshot */, clubId, clubName,
       state: 'waiting' | 'countered' | 'agreed' | 'refused' | 'signed' | 'loaned' | 'fell'
            | 'sold' | 'declined' | 'withdrawn' | 'expired',
       fee            /* lo último que ofertó el DT (cargo, si es préstamo) */,
       counter?       /* lo que pide el club en 'countered' */,
       opened, updated /* ISO */,
       answerFrom?, answerBy? /* rango visible de la respuesta: placement + 1 y + 3 */,
       answerOn?      /* día real de la respuesta, sorteado; la interfaz nunca lo muestra */,
       deadline?      /* último día para responder en 'countered' y 'agreed' (dealDeadline) */,
       neg?: { terms: Terms, patience: number, max: number, log: string[] /* hasta 6 */ },
       blockUntil?    /* tras 'walk': no se puede volver a ofertar hasta esta fecha */,
       why?: 'pulled' | 'cancel' | 'window' | 'deadline' | 'walk' | 'gone',
       offerId?       /* lado venta */, steps: { date, text }[] /* hasta 8 */ }
```

**Reglas del trato**:

- **Una oferta abierta por jugador**, compra o préstamo (no las dos): mientras haya un trato `waiting`, `countered` o `agreed` por ese jugador, `placeBid` la rechaza ("Ya tenés una oferta abierta por él"). Ofertar de nuevo después de `refused` o `fell` (salvo bloqueo) **reabre el mismo** `Deal` si es del mismo libro (suma un paso); si es de otro libro, crea uno nuevo. "Mejorar" una contraoferta es `placeBid` sobre ese mismo trato: `bidCheck` no lo cuenta como "oferta abierta por él" ni como una oferta más para el tope, y lo comprometido pasa del monto viejo al nuevo.
- **Tope: 5 tratos en `waiting` o `countered` a la vez.** El motor no lo necesita para funcionar (cada respuesta cuesta poco), pero sin tope la demora se esquiva ofertando bajo por veinte jugadores a la vez y quedándose con el que acepta. Los `agreed` no cuentan: los limitan lo comprometido y su plazo.
- **Lo comprometido** (`committed`) es la suma de `fee` de los `waiting`, `countered` y `agreed` (en `countered`, la oferta del DT, no el pedido del club). Una oferta nueva necesita `fee ≤ budget − committed`; aceptar una contraoferta, `counter ≤ budget − committed + fee` del mismo trato. Firmar vuelve a controlar `fee ≤ budget`.
- **Controles inmediatos** (`bidCheck`, no esperan al club; son lo que el DT puede saber): libro cerrado, último día del libro, jugador a préstamo en su club, tu plantel con 45, monto mayor que lo libre, sueldo estimado (`wageDemand`) sobre el tope, oferta abierta por él, tope de 5, bloqueo tras ruptura, monto vacío.
- **Respuesta del club** (`clubAnswer`, el día `answerOn`): la lógica de hoy de `evaluateBid` sin los controles inmediatos y con el estado de ese día: cláusula pagada → acepta; club sin recambio, jugador que no quiere bajar de categoría o irse a un club menor, préstamo de un jugador importante → rechazo con su motivo; monto bajo el umbral (`hash(p.id, g.season)`, como hoy) → contraoferta con `counter = thr` (o el cargo mínimo `loanFee` en un préstamo); si no → acepta. El umbral ya es determinista; la demora se sortea en `placeBid` con `hash(deal.id, g.seed)` (como `haggle`, sin consumir `g.rngState`: ofertar no cambia el resto de la simulación y recargar la partida y repetir la oferta da la misma demora y la misma respuesta).
- **Plazo de las decisiones** (`dealDeadline(g, from)`): 7 días desde que llega la respuesta (o desde `acceptCounter`, que conserva el plazo de la contraoferta) o el último día del libro, lo que llegue antes. Igual para contraofertas y acuerdos: una sola regla.
- **Orden del día**: `dailyDeals` corre **al empezar el día** (después de `g.date = addDays(...)`, en `advanceDay` y en `finishUserMatch`, junto a `dayEvents`), para que una respuesta con `answerOn` = 12 ene se vea el 12 ene y un plazo "hasta el 18 ene" valga todo el 18. Primero hace caducar todo lo abierto si el libro está cerrado (`window`), después lo del jugador que ya no está en el club del trato (`gone`), después los plazos vencidos (`deadline < g.date`), después las respuestas del día y por último los avisos de cierre (E10).

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Estado del libro | `windowState(g.date)` (E1) | En cada `refresh()` | `career.ts` | `{ open, closesOn, daysLeft, opensOn, daysToOpen }` | — |
| Presupuesto, caja, masa salarial y tope | `club.budget`, `club.balance`, `wageBill(g, id)`, `club.wageBudget` | En cada `refresh()` | `career.ts` / `economia-y-dirigencia` | números US$ | Caja negativa → rojo con signo "−" y la regla escrita en Presupuesto |
| Jugadores de la tabla | `g.players` de clubes con `division > 0`, sin el propio club | Al cambiar filtros, fecha o `g.transfers` | `Game` | `Player[]` (cap 400) | Vacío → F8 |
| Valoración mostrada | `shown` / `knownRating` / `Val` (D4) | Al dibujar | `squad.ts` | rango o exacto | Nunca `ca` ni `bestRating` directo de un ajeno |
| Conocimiento | `knowOf(g, p)` | Al dibujar | `squad.ts` | 0-100 | — |
| Pedido | `askingPrice(g, p)` | Al dibujar | `career.ts` | US$ exactos | Dato público y exacto, con cualquier conocimiento (decisión del usuario, pregunta 9; fuga aceptada) |
| Valor, sueldo, cláusula, vencimiento del contrato | `p.value`, `p.wage`, `p.clause`, `p.contractEnd` | Al dibujar | `Game` | US$ exactos, año | Datos contractuales públicos y exactos (pregunta 9) |
| Atributos clave del panel | `shown(g, p, v, 5, i)` | Al dibujar | `squad.ts` | rangos | Si k < 100, solo rangos; el potencial dice "Desconocido" hasta k ≥ 70 |
| Estimación del sueldo que pedirá | `wageDemand(g, p, dest)` | Al editar | `career.ts` | US$ por mes | Se rotula "unos" o "alrededor de" |
| Controles antes de ofertar | `bidCheck(g, pid, fee, loan)` (E14) | Al editar el monto y en cada `refresh()` | `career.ts` | `string \| null` (motivo) | `null` → botón habilitado |
| Envío de la oferta | `placeBid` (E3/E11) | Por acción | `career.ts` | `{ ok, reason?, deal }` | Con `ok: false`, el mismo motivo de `bidCheck` |
| Fecha esperada de respuesta | `answerWindow(g, date)` → `{ from, by, afterClose: boolean, allAfterClose: boolean }` | Al dibujar | `career.ts` | ISO | Se muestra "entre el {from} y el {by}"; nunca `answerOn` |
| Respuesta del club | `clubAnswer(g, d)` dentro de `dailyDeals` (E12) | Al día | `career.ts` | `{ ok, reason?, counter? }` | — |
| Lo comprometido y lo libre | `committed(g)` (E14); libre = `club.budget − committed(g)` | En cada `refresh()` | `career.ts` | US$ | 0 → la leyenda del KPI dice "para pases" |
| Ofertas abiertas | `openBids(g)` (`waiting` + `countered`) | En cada `refresh()` | `career.ts` | número, tope 5 | — |
| Bloqueo tras ruptura | `bidBlock(g, pid)` → fecha o `undefined` | Al dibujar | `career.ts` | ISO | Sin bloqueo → no se muestra |
| Plazo de una contraoferta o un acuerdo | `dealDeadline(g, from)` guardado en `deal.deadline` | Al llegar la respuesta | `career.ts` | ISO | — |
| Impacto de una operación | `dealImpact` (E5) | Al editar el monto o los términos | `career.ts` | `{ budget: [a,b], balance: [a,b], wageBill: [a,b], cap, squad: [a,b], line?: [a,b], blocked?: string[] }` | `blocked` trae los controles duros ("supera el tope por US$ 3 mil") |
| Negociación | `demand`, `evalOffer`, `openNegotiation`, `sendTerms` (E4) | Por ronda | `squad.ts` / `career.ts` | `Demand`, `NegResult` | Rondas: `deal.neg.patience` de `deal.neg.max`; se guardan al cerrar la ventana |
| Ofertas recibidas | `g.offers` | Al día | `career.ts` | `Offer[]` | Se ocultan las de jugadores inexistentes |
| Pendientes del mercado | `pendingOf(g)` (`k: 'offer'` y `k: 'deal'`) | Al día | `inbox.ts` | `Pending[]` | La insignia de Mercado y el contador de Tratos usan esta misma lista filtrada |
| Tratos | `g.deals` (E2), `dealsOf(g)` agrupa (Para responder: `offer` + `countered`; Esperando respuesta: `waiting`; Para cerrar: `agreed`; Historial: terminales) y ordena por plazo o fecha | Por acción y por día | `career.ts` | `Deal[]` | Sin tratos → F8 por grupo |
| Contratos por vencer | `squadOf(g, clubId)` con `contractEnd <= g.season` y `negBlock` | Al día | `squad.ts` | `Player[]` | Ninguno → F8 |
| Días hasta conocer a un jugador | `scoutEta` (E7) | Al dibujar | `squad.ts` | días | k = 100 → no se muestra |
| Movimientos | `g.transfers` (tope 300; la tabla muestra 80) | Al día | `career.ts` | `Transfer[]` | Vacío → F8 |
| Pestaña, `sel`, filtros | Ruta + `useSticky` | Al cambiar | Interfaz (C4) | texto, números | Pestaña por defecto según la sección 4 |
| Resueltos en esta visita | Estado local | Al resolver | Interfaz | claves con su nota | Se descarta al salir |

**Conteo (una decisión, una vez)**:

- La insignia de **Mercado** y el contador de la pestaña **Tratos** valen lo mismo: la cantidad de pendientes `offer` y `deal` de `pendingOf` (ofertas abiertas por jugadores tuyos que existen, contraofertas y acuerdos para cerrar). **Esperando respuesta no suma** (no hay nada que decidir hasta que el club contesta) y los contratos por renovar tampoco (pueden esperar; se ven en su grupo con su número).
- Cada decisión suma **1** en la insignia de Mercado y **1** (como pendiente, nunca además como mensaje sin leer) en la de la Bandeja. El mensaje que trae la respuesta del club lleva `act: 'deal'` y `ref: deal.id`; mientras su trato es un pendiente, `pendingKeyOf` lo asocia a `deal<id>` y `unreadOf` no lo cuenta. Una contraoferta que se acepta y pasa a acuerdo sigue siendo **la misma decisión** (`deal<id>`): cuenta 1, no 2. Un rechazo, una caducidad o un aviso de cierre del libro son solo mensajes: suman como sin leer en la Bandeja y no en Mercado.
- Son dos indicadores de dos preguntas distintas ("¿hay algo en el mercado?" y "¿cuánto tengo que decidir en total?"); en ninguno cuenta dos veces. Los `.vh` lo dicen: "3 decisiones del mercado: 1 oferta por tus jugadores, 1 contraoferta y 1 acuerdo para cerrar" en Mercado; "4 decisiones pendientes" en Bandeja.
- Responder la decisión en cualquiera de los dos lugares la saca de los dos en el mismo `refresh()`.
- **Freno del avance**: un `deal<id>` que aparece en `decisionKeys` frena "Ir al partido" (regla vigente de `App.tsx`: clave nueva); como la clave sale de `pendingOf` cuando el trato vuelve a `waiting` (Mejorar), la respuesta siguiente vuelve a frenar. El último día para responder (`deadline === g.date`) frena una vez por decisión (`expiringKeys`). El aviso de cierre del libro no frena.

**Regla**: la pantalla no escribe en `Game` directamente. Hoy lo hace en tres lugares que este diseño reemplaza por funciones del motor: `acceptOffer`/`rejectOffer`/`haggle` desde `Market.tsx` sin confirmación (se mueven al componente compartido `OfferDecision`), `doTransfer(g, p, me.id, fee, false, false, offer)` y `news(...)` desde `NegotiationModal` (→ `signDeal`, `walkAway`) y `doTransfer(... loan)` y `p.listed = !p.listed` desde `PlayerPage` (→ `placeBid` + `signDeal`, `setListed`). Ver pregunta 10.

---

## 9. Events Fired

No hay analítica. Toda fila de esta tabla es una llamada al motor seguida de `save()` y `refresh()`.

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Ofertar compra o pedir préstamo; Mejorar una contraoferta | `placeBid` (nueva, E3/E11) | `(g, pid, fee, loan)` → `{ ok, reason?, deal }` | `career.ts` | Corre `bidCheck`; crea o reabre el `Deal` en `waiting` con `answerFrom`, `answerBy` y `answerOn` (sorteado con `hash(deal.id, g.seed)`); **no** consulta al club ni ejecuta nada. |
| Retirar la oferta | `withdrawBid` (nueva) | `(g, dealId)` | `career.ts` | `waiting` o `countered` → `fell` (`pulled`); libera lo comprometido. |
| Aceptar la contraoferta | `acceptCounter` (nueva) | `(g, dealId)` → booleano | `career.ts` | `countered` → `agreed` con `fee = counter`; conserva el `deadline`; `false` si no alcanza lo libre o el libro está cerrado. |
| Abrir la negociación | `openNegotiation` (nueva, E4) | `(g, dealId)` → `{ demand, patience, max, terms, log }` | `career.ts` / `squad.ts` | Retoma lo guardado; no reinicia la paciencia. La primera vez crea `deal.neg`. |
| Ofrecer al representante | `sendTerms` (nueva, E4) | `(g, dealId, terms)` → `NegResult` | `squad.ts` | Envuelve `evalOffer`; guarda términos, paciencia y respuesta; **no ejecuta el pase**; si `walk`, llama a `walkAway`. |
| Confirmar el fichaje o el préstamo | `signDeal` (nueva, E4) | `(g, dealId, terms?)` | `career.ts` | Compra: `doTransfer(..., terms)`, trato `signed`. Préstamo: `doTransfer(..., loan)`, trato `loaned`. Controla de nuevo libro, presupuesto, plantel y tope. Irreversible. |
| Ruptura de la negociación | `walkAway` (nueva, E4) | `(g, dealId)` | `career.ts` | Trato `fell` (`walk`) con `blockUntil = hoy + 14`; noticia "Se cayó el pase de X" (hoy la emite la interfaz). |
| Cancelar el trato | `cancelDeal` (nueva, E4) | `(g, dealId)` | `career.ts` | `agreed` → `fell` (`cancel`). |
| Confirmar venta | `acceptOffer` | `(g, o)` | `career.ts` | Irreversible; registra `sold`. |
| Pedir más | `haggle` | `(g, o)` → booleano | `career.ts` | Puede retirar la oferta (`withdrawn`). |
| Confirmar rechazo | `rejectOffer` | `(g, o)` | `career.ts` | Irreversible; registra `declined`. |
| Negociar renovación → firmar | `applyRenewal` | `(g, p, terms)` | `squad.ts` | Igual que hoy; con la confirmación final F6. |
| Ruptura de una renovación | `p.negBlock = hoy + 30` | — | `squad.ts` | Hoy lo hace la interfaz; pasa a `walkAway`. |
| Seguir, Dejar de seguir | `toggleShortlist` | `(g, pid)` | `squad.ts` | Reversible. |
| Mandar a ojear | `scout` | `(g, p)` | `squad.ts` | Reversible. |
| Declarar transferible | `setListed` | `(g, pid, bool)` | `squad.ts` | Reemplaza la escritura directa de `PlayerPage` y `ownBulk`. |
| Cambiar pestaña, filtros, elegir una fila o tarjeta, comparar, abrir fichas | ninguno | — | — | Estado de interfaz o navegación (`nav`), no del juego. |
| Paso de un día (fin del día) | `marketTick` (cambios) | — | `career.ts` | Vence ofertas por tus jugadores (registro `expired` + noticia ya existente); la IA no le compra a otro club un jugador con un trato `agreed` del DT. |
| Empieza un día | `dailyDeals` (nueva, E12, E8, E10) | `(g)` | `career.ts`, llamada desde `advanceDay` y `finishUserMatch` después de cambiar la fecha | En este orden: caducan los tratos abiertos con el libro cerrado (`window`), los de jugadores que ya no están en el club del trato (`gone`) y los plazos vencidos (`deadline`); contesta las ofertas con `answerOn <= g.date` con `clubAnswer` (→ `agreed`, `countered` o `refused`, con `dealDeadline`); emite un mensaje por cada cambio (`tag: 'mercado'`, `act: 'deal'`, `ref`, `pid`) y los avisos de cierre del libro a los 7 días y el último día (sin `act`). No frena nada por sí misma: el freno lo decide la interfaz con `decisionKeys` y `expiringKeys`. |

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
| G5 (destructivas sin confirmación) | F6 en Aceptar y Rechazar una oferta, en el fichaje final y en Confirmar el préstamo. Sin F6: Ofertar compra y Pedir préstamo (no se paga nada hasta confirmar; la espera y el plazo están escritos), Pedir más (riesgo escrito), Aceptar US$ X (no paga nada hasta firmar), Mejorar, Retirar la oferta, Cancelar el trato, Seguir, Mandar a ojear (reversibles o de bajo costo) | No |
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
| Estado de un trato (esperando, contraoferta, acordado, firmado, se cayó, vendido…) | Todos | Palabra + ícono (esperando, !, ✓, ✗, ⇄); no depende del tono; "Esperando respuesta" siempre con la fecha esperada en texto |
| Grupos con decisiones y sin decisiones en Tratos | Ámbar contra neutro | El encabezado dice qué es ("Para responder", "Esperando respuesta") y el número; el riel de aviso es un refuerzo |
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
9. Panel del jugador: nombre (enlace a la ficha) → "Mandar a ojear" → "Ver la ficha" → "Seguir" → "Comparar" → sin trato abierto: campo "Oferta" → "Ofertar compra" → campo "Cargo" → "Pedir préstamo" → botones de la nota; con trato abierto, las acciones de su variante en orden (esperando: "Retirar la oferta"; contraoferta: "Aceptar US$ X" → campo "Mejorar" → "Ofertar" → "Retirar la oferta"; acordado: "Negociar contrato" o "Confirmar el préstamo" → "Cancelar el trato")
10. Sigue a la barra inferior del documento (no hay ciclo)

Enter en la tabla salta al punto 9 (campo "Oferta"); Esc desde el panel vuelve al 7. **Tratos**: pestañas → por tarjeta, en orden visual: nombre del jugador → club → botones de acción en orden (primario, comunes, peligro) → "Siguiente para responder" → nota; entre tarjetas, el orden del documento (Para responder, Esperando respuesta, Para cerrar, Para renovar, Historial). **Celular**: pestañas (chips) → "Filtros" → tabla → "Mostrar más"; en Tratos, las tarjetas como arriba; en la ficha, el `BidBox`.

**Negociación (F5)**: el foco entra al campo "Sueldo mensual"; Tab recorre Sueldo, Prima, Cláusula, Años, Rol, Cancelar, Ofrecer; tras "Ofrecer", el foco va a la respuesta (`role="status"`) y si hay acuerdo, a "Confirmar: fichar…". Esc cierra la ventana (guarda el trato) y devuelve el foco al botón que la abrió.

**Screen reader announcements for key state changes** (alcance barato del nivel Estándar):

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Cambio de filtro o de vista | "37 jugadores." (región `aria-live="polite"` en la barra de la tabla) | 500 ms después del último cambio |
| Foco en una fila | "Juan Pérez, delantero centro, Lanús, 24 años, valoración 62 a 74, pedido 1,4 millones de dólares." (nombre accesible de la fila) | Al llegar el foco |
| Elegir un jugador | "Jugador elegido: Juan Pérez. Panel de oferta abierto." | Al elegir |
| Cambio del monto con impacto | "Presupuesto después de la oferta: 0,7 millones. Entra." | 500 ms después de la última tecla |
| Oferta enviada | "Oferta enviada a Lanús. Responde entre el 12 y el 14 de enero." (nota F7, `role="status"`) | Al aparecer |
| Retirar la oferta, aceptar una contraoferta, mejorar | El texto de la nota F7 ("Retiraste la oferta por Juan Pérez." / "Aceptaste el pedido de Lanús: 1,6 millones. Falta el contrato.") | Al aparecer |
| Llega la respuesta de un club con el Mercado abierto | "Llegó la respuesta de Lanús por Juan Pérez: aceptó." / "…: pide 1,6 millones." / "…: no acepta." / "Tu oferta por Juan Pérez caducó: se cerró el libro." (región `aria-live="polite"` de la franja) | Una vez por respuesta, al cambiar el día |
| Foco en una tarjeta de Tratos | "Esperando respuesta. Juan Pérez, Lanús. Ofertaste 1,4 millones el 11 de enero. Responde entre el 12 y el 14 de enero." / "Contraoferta. Lanús pide 1,6 millones por Juan Pérez. Vence el 18 de enero." (nombre accesible del grupo) | Al llegar el foco |
| Bloqueo tras una ruptura | El motivo escrito bajo el botón deshabilitado, asociado con `aria-describedby` ("No podés volver a ofertar por él hasta el 24 de enero.") | Al llegar el foco al botón |
| Cambio de estado del libro | "El libro de pases cerró." / "Abrió el libro de pases." | Una vez, al cruzar la frontera |
| Confirmación F6 abierta | El foco cae en "Confirmar: vender a Juan Pérez a Racing por 2,4 millones de dólares"; se lee el botón | Al abrir |
| Respuesta del representante | El texto del historial (`role="status"`), con "quedan 2 de 3 rondas" | Al aparecer |
| Resultado de una acción | "Vendiste a Juan Pérez a Racing por 2,4 millones." / "Firmó…" | Al aparecer |
| Sin decisiones al resolver la última | "No quedan decisiones del mercado." (y, si hay, "2 ofertas tuyas esperan respuesta.") | Tras la nota F7 |

**Cognitive load assessment**: seis flujos a la vez en Buscar: (1) estado del libro, (2) plata y tope, (3) filtros, (4) la tabla, (5) el jugador elegido, (6) la oferta. Está en el borde del 7 ± 2. Mitigaciones: el estado del libro y los tres topes son una sola franja estable que no cambia con la pestaña; los filtros se pliegan en celular a una línea-resumen; el panel no muestra nada hasta que el DT elige a propósito; el impacto está escrito antes de cada confirmación y no hay que calcularlo; el trato no se pierde al cerrar una ventana. En Tratos son cuatro: qué responder, qué espera respuesta (y cuándo llega), qué cerrar y qué vence, con el plazo en palabras; solo los grupos con decisiones llevan el riel de aviso, para que "esperando" no compita con lo que hay que hacer.

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
| Fechas | "20 de febrero" / "12 ene" / `fmtDate` | 20 | — | No aplica | Sin año en la franja, en los plazos y en el rango de respuesta; con año en el historial | Bajo |
| Motivos del motor (`reason`) | ~90 | Sin límite | — | No aplica | Ajusta en varias líneas | Medio |
| Pestañas | "Seguimiento (6)" | 18 | — | No aplica | En celular, fila desplazable; nunca se abrevian | Bajo |
| Estados de un trato | "Acordado con el club · falta el contrato · vence el 18 ene" | 60 | — | No aplica | Ajusta | Bajo |
| Fecha esperada de respuesta | "Lanús responde entre el 12 y el 14 ene" / con club largo "Club Atlético Independiente Rivadavia responde entre el 28 feb y el 2 mar" | 72 | — | No aplica | Ajusta en dos líneas; usa `short` del club en la tabla y en la columna Trato | Medio — el rango puede cruzar de mes ("entre el 30 ene y el 1 feb") |
| Aviso de caducidad por el cierre | "! El libro cierra el 20 feb: si Lanús contesta después, la oferta caduca" | 76 | — | No aplica | Ajusta; nunca elipsis | Medio |
| Bloqueo tras ruptura | "Su representante cortó la negociación el 10 ene. No podés volver a ofertar por él hasta el 24 ene." | 100 | — | No aplica | Ajusta en varias líneas | Bajo |
| Etiqueta F6 de préstamo "Confirmar: {jugador} llega a préstamo hasta fin de temporada, cargo {monto}, cobra {monto} por mes" | ~90 | 100 en escritorio; tres líneas en celular | — | No aplica | Ajusta dentro del botón; nunca elipsis | Alto |
| "Aceptar US$ 1,6 M" | ~18 | 22 | — | No aplica | No se corta | Bajo |
| Títulos de mensaje de respuesta ("Lanús aceptó tu oferta por {jugador}", "{club} pide US$ X por {jugador}", "Tu oferta por {jugador} caducó: se cerró el libro de pases") | ~60 | 80 en la fila de la bandeja (la fila de la bandeja corta con elipsis según su spec) | — | No aplica | El detalle muestra el título completo | Medio |
| Avisos de cierre ("Faltan 7 días para que cierre el libro de pases (20 feb)", "Hoy cierra el libro de pases") | ~55 | 64 | — | No aplica | Ajusta | Bajo |
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
- [ ] Desde la tabla, ofertar toma, con teclado, ↓ hasta la fila, Enter y Enter (ofertar); con mouse, clic en la fila y "Ofertar compra". Cuando llega el acuerdo, firmar toma Enter en "Negociar contrato", las rondas que hagan falta y Enter en "Confirmar: fichar a X…". Ningún clic ni ningún día que pasa ejecuta un fichaje o un préstamo sin la confirmación con el costo escrito.
- [ ] Elegir una fila no hace nada irreversible y no selecciona la primera fila al entrar.
- [ ] Antes de ofertar, el panel muestra el impacto en presupuesto, caja, sueldos por mes con el tope y plantel; con un monto mayor al presupuesto dice "no entra" en palabras.
- [ ] Un jugador con conocimiento menor a 100 se ve con valoración y atributos como rango (`shown`), potencial "Desconocido" si k < 70 y personalidad "desconocida" si k < 60, en la tabla, el panel, el comparador y la ventana de negociación. Ninguna pantalla del Mercado muestra su `ca`, `pa` ni `bestRating` exactos (revisión de código: no aparece `bestRating(p)` ni `p.ca` de un ajeno en `Market.tsx`, `BidBox` ni `NegotiationModal`).
- [ ] Ordenar y filtrar por valoración usan `knownRating` (un ajeno con rango 60-80 queda arriba de uno con 68-70).
- [ ] "Mandar a ojear" dice cuántos días faltan para conocerlo; si el libro cierra antes, lo dice.
- [ ] Antes de ofertar, el `BidBox` dice "{club} responde entre el {día + 1} y el {día + 3}"; si el rango pasa del cierre del libro, avisa que la oferta caduca si contesta después; el último día del libro, Ofertar compra y Pedir préstamo están deshabilitados con el motivo escrito.
- [ ] Ofertar crea un trato "Esperando respuesta" que aparece en Tratos › Esperando respuesta y en el `BidBox` con la fecha de la oferta, el monto y el rango de respuesta; **no** suma a la insignia de Mercado ni a la de Bandeja y **no** frena "Ir al partido". El día exacto de la respuesta no aparece en ninguna pantalla.
- [ ] La respuesta llega entre 1 y 3 días después de la oferta, al empezar el día, como mensaje de la bandeja (tema Mercado). Con la misma partida guardada, repetir la misma oferta el mismo día da la misma demora y la misma respuesta.
- [ ] "Retirar la oferta" funciona mientras espera respuesta y con una contraoferta abierta, sin confirmación; libera lo comprometido y deja ofertar de nuevo en el acto.
- [ ] Con una oferta abierta por un jugador, el `BidBox` muestra ese trato en lugar del formulario y no se puede abrir otra (ni de compra ni de préstamo) por el mismo jugador.
- [ ] Con 5 ofertas esperando respuesta o con contraoferta, Ofertar compra y Pedir préstamo están deshabilitados para cualquier jugador con el motivo escrito; el `BidBox` muestra "Ofertas esperando respuesta: N de 5".
- [ ] El KPI de presupuesto muestra lo libre (presupuesto menos lo comprometido) y cuánto hay comprometido en cuántas ofertas; una oferta mayor que lo libre está deshabilitada con "Te quedan libres US$ X".
- [ ] Un acuerdo que llega suma 1 a la insignia de Mercado y 1 (no 2: el mensaje no cuenta además como sin leer) a la de Bandeja, frena "Ir al partido" y abre la bandeja con esa decisión elegida; la decisión se puede resolver desde la bandeja, desde Tratos o desde el `BidBox`, y resolverla en un lugar la saca de los otros en el mismo `refresh()`.
- [ ] Una contraoferta que llega es una decisión con las mismas reglas de conteo y freno, con "Aceptar US$ X", "Mejorar" y "Retirar la oferta"; aceptarla la pasa a Para cerrar sin confirmación y sin sumar otra decisión; mejorarla la vuelve a Esperando respuesta con un rango nuevo; si vence, llega el mensaje y pasa al historial como "Venció la contraoferta".
- [ ] Un rechazo llega como mensaje con el motivo del club, suma solo como sin leer en la Bandeja, no frena el avance y deja la tarjeta en el historial como "Sin acuerdo".
- [ ] Contraofertas y acuerdos vencen a los 7 días de llegar o el último día del libro, lo que ocurra antes; el plazo se ve en palabras con la fecha, y el último día frena "Ir al partido" una vez por decisión.
- [ ] El acuerdo de un préstamo no ejecuta el pase al llegar: se confirma con "Confirmar el préstamo" (F6 con cargo, plazo y sueldo escritos).
- [ ] Un acuerdo aparece en Tratos › Para cerrar como "Acordado con el club" aunque se cierre la ventana de negociación con Esc; "Seguir negociando" la reabre con los mismos términos, el mismo historial de respuestas y la misma paciencia ("quedan N de M rondas" no vuelve a M).
- [ ] Cuando el representante acepta los términos, el pase **no** se ejecuta hasta "Confirmar: fichar a X…"; cambiar un campo cancela el acuerdo.
- [ ] La ventana de negociación muestra "quedan N de M rondas", el plazo del acuerdo, el aviso del bloqueo de 14 días y el impacto en vivo; un sueldo sobre el tope avisa "Esto no gasta paciencia" y la ronda no se descuenta.
- [ ] Tras una ruptura, el `BidBox`, la ficha y la columna Trato dicen "No podés volver a ofertar por él hasta el {hoy + 14}" y los botones de oferta quedan deshabilitados hasta esa fecha.
- [ ] Si otro club compra al jugador mientras la oferta espera respuesta o tiene contraoferta, llega el mensaje "…tu oferta quedó sin efecto" y el trato pasa al historial; un jugador con acuerdo no lo compra otro club mientras el acuerdo esté vigente (`npm run sim` sin errores y revisión de `marketTick`).
- [ ] Pedir un préstamo usa su propio campo de cargo (por defecto el 8 % del valor), no el monto de la compra, y dice el plazo (fin de temporada) y el sueldo que se suma.
- [ ] Tratos agrupa Para responder, Esperando respuesta, Para cerrar, Para renovar e Historial, en ese orden; cada tipo muestra las tarjetas, cifras y acciones de su plantilla.
- [ ] "Para responder" (ofertas por tus jugadores y contraofertas) y "Para cerrar" están ordenados por plazo (el que vence antes, arriba), con el plazo en palabras y la fecha que da `offerDeadline` o `dealDeadline` (la misma que la bandeja).
- [ ] Una oferta nueva por un jugador suma 1 a la insignia de Mercado y 1 (no 2) a la de Bandeja; responderla en el Mercado la saca de la bandeja en el mismo `refresh()`, y a la inversa.
- [ ] Aceptar y rechazar una oferta toman dos pasos (acción y confirmación) en el Mercado, igual que en la bandeja; ninguno se ejecuta con un solo clic. El texto de la confirmación nombra la otra oferta que se cancela si la hay y "se va al exterior" si corresponde.
- [ ] Tras "Pedir más" con éxito, la tarjeta muestra el monto nuevo con Aceptar, Pedir más y Rechazar, y la clave `offer{id}` y la selección no cambian.
- [ ] Una oferta vencida, vendida, rechazada o retirada aparece en el Historial con su estado en texto; una oferta que vence mientras está elegida reemplaza sus botones por "Esta oferta venció el {fecha}." sin errores en la consola.
- [ ] Al cerrar el libro, cada oferta esperando respuesta, contraoferta y acuerdo abierto pasa al historial como "Caducó: se cerró el libro" el primer día cerrado, con un mensaje cada uno; con el libro cerrado no queda ningún trato de compra abierto.
- [ ] A los 7 días del cierre y el último día de cada libro llega un mensaje (tema Mercado) que nombra lo abierto; ninguno de los dos frena "Ir al partido" ni suma a la insignia de Mercado.
- [ ] Para renovar lista a los jugadores propios con contrato que vence este año, con "Negociar renovación" (deshabilitado con el motivo y la fecha si hay `negBlock`); no suma a ninguna insignia.
- [ ] Valor, pedido, sueldo y cláusula de un jugador ajeno se muestran exactos con cualquier conocimiento (decisión del usuario, pregunta 9).

**Navegación**
- [ ] Cambiar tres veces de pestaña y apretar Atrás una vez vuelve a la pantalla anterior al Mercado (no recorre las pestañas).
- [ ] Abrir una ficha desde la tabla y volver deja la misma pestaña, filtros, orden, selección y scroll.
- [ ] La insignia de Mercado abre Tratos con la decisión de plazo más corto elegida; "Ver todos los tratos" de la bandeja abre Tratos con esa oferta o ese trato (`deal<id>`) elegido.
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
- [ ] Ninguna llamada de la pantalla asigna propiedades de `g` ni llama a `doTransfer`, `news` o `evaluateBid` directamente (revisión de código: no aparecen `p.listed =`, `doTransfer(`, `news(`, `p.negBlock =`, `g.deals` asignado ni `evaluateBid(` en `src/ui/Market.tsx`, `BidBox`, `DealDecision`, `PlayerPage.tsx` ni `Locker.tsx`).

**Visibilidad de las acciones** (lección de la revisión de la bandeja; script `tests/ui/mercado.cjs`, a escribir al implementar, en 1440 × 900, 1280 × 720, 1024 × 768, 820 × 1000, 390 × 844 y 320 × 568)
- [ ] Para cada botón de cada tarjeta de Tratos, del panel, de la ficha › Contrato y de la ventana de negociación (Aceptar, Pedir más, Rechazar, Confirmar, No, Ofertar compra, Pedir préstamo, Retirar la oferta, Aceptar US$ X, Ofertar de Mejorar, Negociar contrato, Confirmar el préstamo, Ofrecer, Cancelar, Seguir negociando…), `document.elementFromPoint` en su centro devuelve el propio botón (no un contenedor recortado ni una barra fija), en todas las resoluciones.
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

Revisión del 2026-11-14 con las decisiones del usuario. **Resuelto** = lo decidió el usuario (dice qué y dónde se aplicó). **Resuelto en el diseño** = lo decidió el ux-designer con la información disponible y el usuario puede revertirlo. **Pendiente** = tarea de implementación o de otra spec, no una decisión del usuario.

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 1. ¿El motor guarda un registro de los tratos (`g.deals`) o la pestaña Tratos se arma reconstruyendo desde `g.transfers`, `g.news` y el estado local de la ficha? | usuario + gameplay-programmer | Antes de implementar | **Resuelto (usuario): `g.deals`, ahora obligatorio** por la respuesta con demora (pregunta 2): sin registro no hay "Esperando respuesta". Campo opcional en `Game` (`?? []`), tope 60 sin podar tratos abiertos, `g.nextDeal` propio, sin subir `Game.version`. Aplicado en: sección 6 (estados y ciclo de un trato), 8 (E2, forma de `Deal`, reglas del trato), 9 y 14. |
| 2. El usuario pidió ver "ofertas enviadas, esperando respuesta": hoy el club contesta **al instante**. ¿Se mantiene así o el club tarda 1 a 3 días en contestar (nueva decisión, nuevo mensaje, nuevo estado)? | usuario + game-designer | Antes de implementar | **Resuelto (usuario): el club contesta con 1 a 3 días de demora** (no era la recomendación). Diseño: (a) ofertar crea un trato `waiting` "Esperando respuesta · responde entre el 12 y el 14 ene" (rango visible, día real oculto), retirable sin confirmación; no es pendiente ni frena el avance. (b) La respuesta llega al empezar el día como mensaje (`act: 'deal'`): **acuerdo** → pendiente `deal<id>` (Para cerrar) con plazo de 7 días o el cierre del libro; **contraoferta** → también pendiente `deal<id>` (Para responder: Aceptar US$ X, Mejorar, Retirar) con el mismo plazo; **rechazo** → solo mensaje. Los dos pendientes frenan "Ir al partido" al llegar y su último día. (c) Si cierra el libro mientras espera, caduca con mensaje; el último día del libro no se puede ofertar (la respuesta llegaría cerrado) y antes se avisa si el rango pasa del cierre. (d) Si otro club compra al jugador mientras espera o hay contraoferta, el trato se cae con mensaje; con acuerdo, la IA no lo vende. (e) Una oferta abierta por jugador; tope de 5 en `waiting` + `countered`; lo comprometido se descuenta de lo libre. (f) El préstamo acordado se confirma con F6 (no se ejecuta solo). (g) La respuesta reusa la lógica de `evaluateBid` el día de la respuesta; la demora se sortea con `hash(deal.id, g.seed)`. Aplicado en: secciones 1 a 9, 12, 13 y 14 (en especial 5.1 variantes del `BidBox` y Tratos, 5.3 plantillas, 6 estados y ciclo, 8 reglas y conteo, 9 `placeBid`, `withdrawBid`, `acceptCounter`, `dailyDeals`). Lo que necesita la bandeja, en la pregunta 20. |
| 3. Un acuerdo con el club al que le falta el contrato: ¿cuánto dura, qué pasa cuando vence, frena el avance? Hoy se pierde al cerrar la ventana. | usuario + game-designer | Antes de implementar | **Resuelto (usuario, junto con la pregunta 2): dura 7 días desde que llega o hasta el último día del libro, lo que ocurra antes (`dealDeadline`, la misma regla para las contraofertas); al vencer pasa a `fell` con un mensaje. Cambia respecto de la recomendación: el acuerdo **es** un pendiente de la bandeja (`deal<id>`), suma 1 a las insignias de Mercado y Bandeja y frena "Ir al partido" al llegar y su último día.** Aplicado en: sección 5.3 (plantillas de acuerdo), 6 (llegada, vencimiento), 8 (reglas, conteo y freno) y 14. |
| 4. Paciencia del representante: ¿se guarda al cancelar la ventana, se muestra y se bloquea volver a ofertar tras una ruptura? Hoy se reinicia al reabrir (se puede cancelar y reintentar gratis) y no se ve. | usuario + game-designer | Antes de implementar | **Resuelto (usuario, como se recomendó): la paciencia se ve ("●●○ quedan 2 de 3 rondas"), se guarda en `deal.neg` con los términos y las respuestas (cerrar la ventana no la reinicia) y tras una ruptura no se puede volver a ofertar por ese jugador durante 14 días (`blockUntil`, `bidBlock`), con la fecha escrita.** Aplicado en: 5.1 (ventana de negociación y variante bloqueada del `BidBox`), 5.3, 6 (Ruptura, Bloqueado, Trato pendiente al cerrar la ventana, Negociación abierta), 7.2, 7.3, 8, 9 (`walkAway`), 12 y 14. |
| 5. Confirmación final antes de fichar: hoy "Ofrecer" ejecuta el pase en el mismo clic si el puntaje alcanza (`Locker.tsx:104`), sin mostrar el impacto. | usuario | Antes de implementar | **Resuelto (el usuario lo mantiene)**: `Ofrecer` solo evalúa; el acuerdo del jugador pasa a "Hay acuerdo" y el fichaje se confirma con F6 y el impacto a la vista (sección 6). Coherente con UR-16 de la bandeja (lo irreversible se confirma). Se extiende al préstamo: "Confirmar el préstamo" con F6 (pregunta 2). |
| 6. ¿Dónde viven la oferta y la negociación: en el Mercado, en la ficha o en los dos? | ux-designer + usuario | Antes de implementar | **Resuelto (el usuario lo mantiene): los dos con un solo componente** (`BidBox` en el panel del Mercado desde 1180 px y en ficha › Contrato y mercado; la negociación sigue siendo F5, pero guardada). Con la demora, el `BidBox` también muestra el trato en curso (esperando, contraoferta, acordado, bloqueado). Justificación en la sección 3. |
| 7. Las ofertas por jugadores propios, ¿se responden en la bandeja, en el Mercado o en los dos? | usuario | Antes de implementar | **Resuelto (se deduce de la decisión 1 del usuario: las decisiones del mercado viven en la bandeja y en Tratos y cuentan una vez en las dos insignias): en los dos con el mismo componente (`OfferDecision`), misma clave `offer{id}`, misma confirmación F6 y misma nota F7.** La misma regla se aplica a las respuestas de los clubes con `DealDecision` y la clave `deal<id>`. Aplicado en: sección 3 (dónde vive cada flujo), 5.3, 8 (conteo) y 14. Si el usuario prefiere que el Mercado solo lea, cambia la sección 3 y las acciones de Para responder y Para cerrar. |
| 8. El libro de pases cierra y la partida sigue sin aviso. ¿Avisar a los 7 días y el último día con un mensaje, y frenar "Ir al partido" el último día? | usuario | Con la implementación | **Resuelto (usuario): mensajes sí, freno no.** Mensaje en la bandeja (`tag: 'mercado'`, `me: true`, sin `act`) a los 7 días y el último día de cada libro (13 y 20 feb; 3 y 10 ago), emitido por `dailyDeals`, con lo abierto en el cuerpo; **"Ir al partido" no frena** por el cierre del libro. Sí puede frenar ese día una decisión con plazo propio que vence ese día (un acuerdo o una contraoferta cuyo plazo es el cierre), por la regla general de `expiringKeys`. Aplicado en: sección 4 (salidas), 6 (Último día del libro, Aviso de cierre), 8 (E10, freno), 9, 13 y 14. |
| 9. Valor, pedido, sueldo y cláusula de un jugador ajeno se muestran exactos (decisión de `ojeo.md`: son públicos). Pero `value` sale de `ca`, `pa` y edad, y `askingPrice` depende del lugar del jugador en su plantel por `ca` real; con la edad a la vista se puede despejar la valoración, y los motivos de rechazo ("lo considera importante") dicen el puesto real. | usuario + systems-designer | Antes de dar por cumplida la regla de "nunca revelar el valor real" | **Resuelto (usuario): valor y pedido (y sueldo y cláusula) se muestran exactos, como dato público del mercado.** **Fuga aceptada**: con `value` o `askingPrice` exactos y la edad a la vista se puede estimar la valoración real de un ajeno, y algunos motivos de rechazo del club ("lo considera importante") dicen su lugar real en el plantel; el usuario la acepta a cambio de que el mercado se lea como el de un DT real. Aplicado en: sección 1 (game goal), 8 (filas de pedido y contrato) y 14. Queda anotarla en `design/gdd/ojeo.md` (pregunta 16). |
| 10. Funciones del motor nuevas o cambiadas: `windowState`; `Deal`, `g.deals` y `g.nextDeal`; `bidCheck`, `committed`, `openBids`, `bidBlock`, `answerWindow`, `dealDeadline`; `placeBid`, `withdrawBid`, `acceptCounter`, `clubAnswer`, `dailyDeals` (desde `advanceDay` y `finishUserMatch`, al empezar el día); `openNegotiation`, `sendTerms`, `signDeal` (compra y préstamo), `walkAway`, `cancelDeal`; `dealImpact`, `loanFee`, `scoutEta`, `Offer.fee0`, `Transfer.mine`, `dealsOf`; `acceptOffer`, `rejectOffer`, `haggle` y `marketTick` registran el cierre de las ventas; `marketTick` no vende a un jugador con trato `agreed`; en `inbox.ts`, el pendiente `deal`, `pendingText`, `pendingKeyOf` y `expiringKeys`; `News.act: 'deal'`; `setListed` en `PlayerPage` y `ownBulk`. | ui-programmer + gameplay-programmer (con lead-programmer) | Antes de implementar | **Resuelto (usuario: acepta la recomendación)**: la lista de la izquierda es el alcance del motor; detalle en las secciones 8 y 9. Los nombres son propuestas que el programador puede ajustar sin cambiar el comportamiento. |
| 11. `g.transfers` guarda solo los nombres de los clubes: "Mis pases" se arma por nombre y falla si el DT cambia de club. | gameplay-programmer | Con la implementación | **Resuelto (usuario: acepta la recomendación): `Transfer.mine?: boolean` al registrar** (en `doTransfer`, `sellAbroad` y donde se registre un pase propio). Aplicado en: sección 8. |
| 12. Cambios en `PlayerTable` (D1) para el Mercado: `onPick` (la fila elige en vez de abrir la ficha), foco itinerante con ↑ ↓ y Enter, Espacio para marcar, Mayús + ↑ ↓, columna `deal` y `scoutEta` en la vista Ojeo, `scroll-margin` de la barra masiva. Hoy D1 tiene una parada de Tab por fila (hasta 100 o 400) y los encabezados solo responden al mouse. | ui-programmer + usuario | Antes de implementar | **Resuelto (usuario: acepta la recomendación): solo en modo `onPick`** (Mercado); el resto de D1 sigue igual por ahora. La columna `deal` suma los estados nuevos (Esperando, Contraoferta, Bloqueado hasta {fecha}). Aplicado en: secciones 5.3, 7.1 y 14. Actualizar D1 en `design/ux/interaction-patterns.md` queda en la pregunta 15. |
| 13. Nombres y estructura de las pestañas: "Ofertas recibidas" pasa a **Tratos** (para responder, esperando respuesta, para cerrar, para renovar, historial); "Finanzas" pasa a **Presupuesto** (los tres topes, lo comprometido y el balance, con enlace a Club › Finanzas); "Movimientos" suma el filtro "Mis pases". | usuario | Antes de implementar | **Resuelto (el usuario lo mantiene)**, con el grupo "Esperando respuesta" que pide la decisión 1 y "Para responder" ampliado a las contraofertas. |
| 14. Textos del motor que contradicen la pantalla: "vence en una semana" / "desde la pantalla de Mercado" (ya en la pregunta 7 de la bandeja). El Mercado usa `offerDeadline` y no repite el texto del motor. | usuario (texto) + gameplay-programmer | Con la implementación | Pendiente (ya anotado en la bandeja; no es decisión del usuario). Se suma el texto de `evaluateBid` "Reabre el 1 de enero y el 25 de junio", que con `windowState` puede decir la fecha exacta. |
| 15. Patrones nuevos para `design/ux/interaction-patterns.md`: panel de lectura al costado de una tabla (variante de F1), tarjeta de trato, vista previa de impacto (`DealImpact`), franja de estado del libro, tabla con foco itinerante (D1), estado "esperando respuesta" con fecha esperada (variante nueva de F2: algo que el jugador empezó y todavía no tiene respuesta). Esta spec no toca ese archivo. | ux-designer | Con la implementación | Pendiente (tarea del ux-designer, no decisión del usuario) |
| 16. Cambios a otras specs: `design/ux/bandeja.md` (pregunta 20) y el enlace "Ver todos los tratos" con el mismo texto de F6; `design/gdd/mercado-de-pases.md` documenta `g.deals`, la respuesta con demora, el tope de 5 ofertas, lo comprometido, las rondas guardadas, el bloqueo de 14 días y los avisos de cierre del libro; `design/gdd/ojeo.md` anota la fuga aceptada de la pregunta 9; `design/gdd/comunicacion-y-bandeja.md` suma el pendiente `deal`. | ux-designer + usuario | Después de implementar | Pendiente (tarea; esta revisión solo edita `mercado.md`) |
| 17. Pestaña por defecto al entrar: la regla de hoy (Tratos si hay ofertas, Buscar si no) o recordar siempre la última. | usuario | Con la implementación | **Resuelto (el usuario lo mantiene)**: la ruta manda; sin `tab`, la recordada; sin recordada, Tratos si hay decisiones del mercado (ofertas, contraofertas o acuerdos) y Buscar si no. Aplicado en: sección 4. |
| 18. Renovaciones en el Mercado: ¿"Para renovar" en Tratos o solo en Plantel y la ficha? | usuario | Con la implementación | **Resuelto (usuario): dentro del alcance**, como grupo de Tratos entre "Para cerrar" e "Historial" (lista y "Negociar renovación"; no suma a ninguna insignia). Aplicado en: secciones 3, 5.1, 5.3, 6 y 14. |
| 19. Jugadores libres (sin club) y préstamos de juveniles propios a otros clubes: no existen en el motor (`mercado-de-pases.md`, Open Questions). Esta spec no los cubre; el texto de Buscar vacío dice que no hay libres. | usuario + game-designer | — | Fuera de alcance; si se implementan, entran como filtro y como estados de `Deal` (`loan` de venta). |
| 20. **Lo que la bandeja necesita** para las respuestas de los clubes (`design/ux/bandeja.md` no es de esta revisión). (1) **Pendiente nuevo** en `pendingOf` (`src/engine/inbox.ts`): `{ k: 'deal'; key: 'deal<id>'; d: Deal; kind: 'countered' \| 'agreed'; deadline }`, con plazo, ordenado con los demás por `deadline`; `pendingText` suma "una contraoferta" / "N contraofertas" y "un acuerdo para cerrar" / "N acuerdos para cerrar"; `expiringKeys` incluye `k === 'deal'`; `decisionKeys` lo toma solo (frena al llegar). (2) **Mensajes**: `News.act` suma `'deal'` con `ref: deal.id` y `pid`; `pendingKeyOf` devuelve `deal<ref>` para `act: 'deal'` (el mensaje no cuenta como sin leer mientras su trato sea pendiente); los rechazos, caducidades y caídas usan el mismo `act` (la bandeja ofrece "Ver todos los tratos") y cuentan como sin leer. Los avisos de cierre del libro van sin `act`. (3) **Tema**: Mercado (todos con `tag: 'mercado'`). (4) **Plantilla de lectura "Contraoferta"** (fila del bloque "Para decidir": "Contraoferta, Lanús. Pide US$ 1,6 M por Juan Pérez. Vence en 5 días."): jugador (cara, puesto, valoración como rango, "conocés el N %"), club (escudo, categoría); cifras: Tu oferta, Pide (con "+14 %"), Pedido público, Libre para ofertar; línea: plazo en palabras con fecha, "Si mejorás, {club} vuelve a responder en 1 a 3 días", impacto con el monto pedido; acciones: **Aceptar US$ X** (primario, sin F6), **Mejorar** (campo + "Ofertar"), **Retirar la oferta** (común, sin F6), Ver todos los tratos, Ver la ficha. (5) **Plantilla "Acuerdo para cerrar"** (fila: "Acuerdo, Lanús. Aceptó US$ 1,4 M por Juan Pérez. Falta el contrato. Vence en 7 días."): mismas entidades; cifras: Monto acordado, Pedido público, Sueldo que pide el representante (o el estimado), Paciencia "●●○ quedan 2 de 3 rondas"; línea: plazo, impacto; acciones: **Negociar contrato** / **Seguir negociando** (primario, abre `NegotiationModal` sobre la bandeja) o, en un préstamo, **Confirmar el préstamo** (primario, F6 con cargo, plazo y sueldo), **Cancelar el trato** (común, sin F6), Ver todos los tratos. (6) **Estados**: Resuelto en el lugar con la nota F7 de la sección 7.2; "Ya respondiste esta contraoferta." / "Este acuerdo venció el {fecha}." si cambió en otro lado (F2). (7) Las dos plantillas son el componente `DealDecision` de esta spec, igual que `OfferDecision`. | ux-designer + usuario | Antes de implementar la bandeja del mercado | Pendiente (falta llevarlo a `design/ux/bandeja.md`) |
| 21. Préstamo acordado: ¿se confirma (F6) o se ejecuta solo cuando llega la respuesta? | usuario | Antes de implementar | **Resuelto en el diseño: se confirma.** La decisión 1 hace del acuerdo una decisión del DT; ejecutarlo solo haría algo irreversible (plantel, sueldo, cargo) un día en que el DT no está mirando y con la plata de ese día. Cuesta un clic. Revertible: si el usuario prefiere, el préstamo aceptado se ejecuta al llegar y el mensaje lo cuenta. |
| 22. Tope de ofertas abiertas, plata comprometida y protección del acuerdo | usuario + game-designer | Antes de implementar | **Resuelto en el diseño**: 5 tratos en `waiting` + `countered` a la vez (sin tope, la demora se esquiva ofertando bajo por muchos jugadores); lo comprometido se descuenta de lo libre para ofertar (si no, se podría comprometer el doble del presupuesto); un jugador con acuerdo no se lo vende la IA a otro club mientras el acuerdo esté vigente (el club dio su palabra; mientras solo espera respuesta, sí puede perderlo). Las tres son reglas de juego: el game-designer puede cambiar los números sin tocar la interfaz. |
