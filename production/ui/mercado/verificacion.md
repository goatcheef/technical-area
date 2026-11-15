## Verificación de los arreglos de la segunda revisión: Mercado de pases
**Fecha**: 2026-11-15
**Documento**: `design/ux/mercado.md` (rama `mercado-ui`), con el lado de la bandeja en `design/ux/bandeja.md` (pregunta 22, puntos 10 a 17)
**Alcance**: verificación puntual de N1, N2 y A1 a A10 de `production/ui/mercado/ux-review-2.md`. No es una tercera revisión completa (decisión del usuario).
**Código contrastado**: `src/engine/squad.ts` (`persOf`, `hash01`, `STATUS`, `knowOf`, `rangeAround`, `shown`, `demand`, `evalOffer`, `naturalStatusFor`, `dailySquad`), `src/engine/career.ts` (`evaluateBid`, `doTransfer`, `sellAbroad`, `removePlayer`, `marketTick`), `src/engine/game.ts` (`valuation`), `src/ui/Inbox.tsx:555`, `src/ui/Locker.tsx:94`. Se corrió `node tools/check-contrast.mjs` (0 fallas) y una simulación de `wageShown` con la fórmula de la spec (2.000 jugadores sintéticos; script en el scratchpad de la sesión, no en el repo).

### Veredicto: VERIFICADO CON OBSERVACIONES

Los dos bloqueantes están cerrados. Con las reglas de E16, en modo `buy` ninguna cifra visible contiene un rasgo de personalidad. Solo queda la paciencia inicial, que es la fuga (d) aceptada. El "sueldo que pediría" tiene una sola fuente en todos los lugares. `wageShown` contiene siempre el valor real y su ancho ya no dice el sueldo. Los diez recomendados están aplicados, y la bandeja coincide con el Mercado en claves, conteo, regla de leído, freno, barra angosta y F6. No hay problemas bloqueantes nuevos. Hay seis problemas menores. Los más importantes son dos: el costo de salirse de un acuerdo no rige en la última semana de cada libro (A8), y el criterio de N1, corrido en secuencia, no prueba los términos de rol y de cláusula.

---

### Estado por ítem

| # | Ítem | Estado | Prueba |
|---|---|---|---|
| N1 | La contraoferta despejaba la ambición | **Verificado** (con la observación m2 sobre el criterio) | E16 (`mercado.md:623`): (a) prima con `2 + 2·hash01(p.id, 17)`; (b) sueldo con margen `0,8 + 0,4·hash01(p.id, 23)` en lugar de `(1 + (amb − 10)·0,022)` (`squad.ts:281`); (c) `evalOffer` con los valores de hoy a ambición 10: rol 0,1, sin cláusula +0,02, cláusula < 1,6× +0,012, > 4× −0,05 (contrastado con `squad.ts:290-294`: coinciden); (d) pendiente `1 + 0,3·hash01(p.id, 29)`, de media 1,15 como la de hoy (`:302`); (e) ambición solo en `patience` (`:283`). Con eso, `need` depende del sueldo ofrecido, de lo que pide el representante (visible), del rol natural (fuga (c), aceptada), de la edad, de `p.value` (exacto) y de tres sorteos fijos por id. **Ningún rasgo entra en una cifra visible.** La única dependencia que queda es `patience` (2 o 3 rondas, según si `amb ≥ 15`): un bit, el mismo que da la palabra de paciencia al sentarse (fuga (d), `:1064`). La lealtad y la conformidad solo están en ramas `renew` (`:281`, `:295`), de jugadores propios. Los demás usos de `amb` en el motor son de jugadores propios (`career.ts:390`; `squad.ts:92-93`, `:204`, `:211`). Los sorteos nuevos no chocan con otros `hash01`: `weekNo` vale unos 2.900 y `wageShown` usa `p.id·131 + salt`. La cifra "unos 5 puntos" de la fuga (c) es correcta: el sueldo crece ×1,5 cada 5 puntos de `ca` (`game.ts:49`) y el margen va de 0,8 a 1,2. **Criterio** `:953`: sus puntos (1) y (4) atrapan una regresión en `demand` y cualquier `q.amb` fuera de `patience` y de `renew`. El punto (2), corrido con un solo `Demand`, solo compara la primera oferta (ver m2). |
| N2 | "Sueldo que pediría" con dos fuentes | **Verificado** (con la observación m3) | Una sola fuente, `demandWage(g, p) = demand(g, p, 'buy', naturalStatusFor(g, p)).terms.wage`, siempre a través de `wageShown(…, 402)`. Aparece así en E15 (`:622`), en la regla (`:654`), en la fila de datos (`:682`), en el `BidBox` (`:381`), en `DealImpact` (`:383`), en el comparador (`:390`), en la plantilla del acuerdo (`:404`), en el aviso y el veredicto del tope (`:443`), en el wireframe (`:205`, `:247`) y en el informe de ojeo de la bandeja (`bandeja.md:258`, que corrige a `Inbox.tsx:555`, hoy exacto). `wageDemand` queda solo para el motor (`:622`, criterio `:950`). La ventana actual usa el mismo rol (`Locker.tsx:94`). Los criterios `:950` (rango por debajo de 95 % y exacto desde 95 %, de `demandWage`) y `:951` (desde 95 %, el mismo número que el primer pedido del representante; por debajo, un rango que lo contiene) **coinciden**, y `bandeja.md:653` dice lo mismo. **Contiene el real**: el extremo bajo `(1 − w)(1 + s) ≤ 1 − 0,4w − 0,6w² < 1` y el alto `(1 + w)(1 + s) ≥ 1 + 0,4w − 0,6w² ≥ 1` mientras `w ≤ 2/3` (en el juego, `w ≤ 0,32`, porque `knowOf ≥ 20`). El redondeo hacia afuera lo conserva. En la simulación, 2.000 de 2.000 lo contienen. **Sin la fuga del ancho**: `hi − lo = 2w·v(1 + s)` dice el centro `v(1 + s)`, que el rango ya muestra, y no `v`. Antes daba `2wv`. Las cifras de ejemplo cierran: 5,7–9,9 mil al 35 % contiene los 8,7 mil del representante, y 4,9–8,6 mil es coherente con la fórmula. |
| A1 | Barra que pasaba a `static` con el foco | **Verificado** | La barra siempre fija y Mejorar con `scroll-margin-bottom`, sin `interactive-widget=resizes-content`: `mercado.md:382`, pregunta 20 (8) tachada y reemplazada (`:1075`), pregunta 39 (`:1094`), criterio de la transición `:1032`; `bandeja.md:212`, `:391`, `:655-656`. La regla de `max-height: 520px` depende del alto de la ventana, no del foco. |
| A2 | Ofertas borradas sin registro | **Verificado** (con la observación m7) | `dropOffersFor(g, pid, why)` con `sold` / `clause` / `gone` (`:613`, `:646`, estados del lado venta en la sección 6, `:748`, `:758`, pregunta 40 `:1095`); regla de leído 2 y 3 (`:717-718`); criterio con N − 2 y el caso de la cláusula (`:969`); `bandeja.md:311`, `:648`, pregunta 22 (15). |
| A3 | N − 1 contra N | **Verificado** | Criterio `:968` (N − 1 al cerrar, N al aceptar el pedido o al pedir más con éxito, nunca N + 1), igual que `bandeja.md:648`; la salida de la sección 4 dice "Acuerdo para cerrar" (`:142`). |
| A4 | `clubAnswer` y el tope | **Verificado** | `:608`, `:658`, pregunta 2 (g), criterio `:960` (revisión de código: `clubAnswer` no lee `wageBudget`, `wageBill` ni `wageDemand`). |
| A5 | `Ledger` del balance | **Verificado** | `:393`, `:627`, `:700`, criterio `:1000`, pregunta 43; coincide con `career.ts:53` y `squad.ts:318`. |
| A6 | Paciencia antes de `deal.neg` | **Verificado** | `:389`, `:404`, `:684`, criterio `:980`; `BidBox` acordado sin paciencia (`:238-242`); la tarjeta de Banfield (`:279`) la muestra con "Seguir negociando" (ya hubo mesa: es coherente); `bandeja.md:251`, `:651`. |
| A7 | Tratos podados | **Verificado** | `:607`, fila de la tabla D (`:725`), criterio `:983`, pregunta 45; `bandeja.md:252`, `:652`. |
| A8 | Cancelar gratis | **Verificado con observaciones** (m1, m4, m5) | (a) `cancelDeal` y el acuerdo vencido ponen `blockUntil = hoy + 14` y dejan molesto al club (`clubCool`, umbral ×1,1): `:644-646`, `:659`, `:692`, `:747`, `:759`, criterio `:977`. (b) F6 en Cancelar: `:404`, `:405`, 7.2, `bandeja.md:251`, `:294`, `:376`, `:651`. (c) El sueldo del préstamo como `wageShown(…, 401)` también en la F6: `:405`, `:952`, `bandeja.md:251`. **La fuga del préstamo queda cerrada, pero por el rango y no por el costo**, como la misma spec admite (pregunta 46 (c)): a quien solo quiere el dato, no poder ofertar por ese jugador no le cuesta nada. Lo que queda exacto en la mesa es la fuga (c) aceptada, abierta por el margen de ±20 %. **(e)**: es correcto que sea un bit (el sueldo real pasa o no el margen, que el DT ve exacto). Dos detalles están mal o faltan (m4). |
| A9 | Chip "Trato" | **Verificado** | `bandeja.md:228`, `:652`; tabla D `:725`; F2 en la pregunta 15 (`:1070`). |
| A10 | Cifras | **Verificado** | (a) "Entra en el tope (margen US$ 62 mil)" (`:335-337`; 480 − 418 = 62). (b) Lanús: ofertó el 11, responde del 12 al 14, vence el 19 (`:229-238`, `:247`). (c) `hash(deal.id · 31 + round, g.seed)` en `:658`, `:740` y la pregunta 2 (g). (d) `--sel` 5,64 / 4,96 / 4,97 y tinta 4,58 (`:834`, `:839`): coinciden con `check-contrast.mjs` de hoy. (e) `Game.version` en 6 en E2 (`:607`) y en las preguntas 1 y 36. |
| Bandeja | Lado de la bandeja (pregunta 22, puntos 10 a 17) | **Verificado** (con la observación m6) | Las claves `deal<id>` y `offer<id>` son iguales. El conteo coincide: N / N − 1 / N − 2 en `bandeja.md:648` contra `mercado.md:968-969`, y el vencimiento que reemplaza al mensaje en `:649` contra `:709-710`. La regla de leído es igual: `bandeja.md:311` contra `mercado.md:716-718`, con `sold` leído y `clause` sin leer. El freno no cambió (pregunta 22 (6)) y coincide con `:728`. La barra angosta es igual: `bandeja.md:212`, `:391` y `:655-656` contra `mercado.md:382` y `:1031-1032`. Las F6 coinciden: trabajo, préstamo con rango y Cancelar. La única diferencia es un texto viejo sin tachar en la pregunta 22 (7) (m6). |

---

### Problemas nuevos

**Bloqueantes: ninguno.**

**Menores**

**m1. El costo de salirse de un acuerdo no rige en la última semana de cada libro** (A8)
- El plazo de un acuerdo es "7 días o el cierre del libro" (`:660`). `dailyDeals` hace caducar primero todo lo abierto con el libro cerrado (`window`) y recién después los plazos vencidos (`deadline`) (`:661`, `:759`). Por eso, un acuerdo cuyo plazo es el último día del libro cae como `window`, que no tiene costo (`:659`, "las caídas que no dependen del DT"). Además, con el libro cerrado el bloqueo de 14 días y el club molesto no tienen efecto, porque no se puede ofertar hasta que reabra. Hasta Cancelar el trato es gratis en la práctica en esos días.
- Consecuencia: en la última semana de cada libro, abrir la mesa y dejar caer el acuerdo da el pedido exacto del representante sin ningún costo. La premisa corregida de la pregunta 9 (3) ("ahora cancelar o dejar vencer el acuerdo cuesta 14 días…") vuelve a ser falsa ahí. No reabre la fuga del préstamo, que está cerrada por el rango, y la fuga (c) está aceptada.
- Arreglo: que un `agreed` que vence el último día caiga como `deadline` (el DT pudo cerrarlo) y que el bloqueo y el club molesto se cuenten en días de libro abierto. O anotar el hueco en la pregunta 9 como parte de la fuga (c).

**m2. El criterio de N1 (`:953`), corrido en secuencia, no prueba los términos de rol ni de cláusula**
- Con un solo `Demand`, la primera propuesta (90 % / 60 %, sin cláusula, de 24 a 29 años) puntúa unos 0,944 y resta 1 de paciencia. La segunda, con un rol menor, puntúa unos 0,844, por debajo de 0,85, y resta 2. Con 3 o con 2 de paciencia, el representante se levanta en la segunda oferta en las tres ambiciones. Desde ahí, `evalOffer` devuelve `walk` sin contraoferta (`squad.ts:300-301`) y las respuestas "iguales" no prueban nada.
- El punto (2) solo atrapa el término sin cláusula, que es el del ejemplo de la revisión. Los términos de rol y de cláusula quedan cubiertos solo por la revisión de código del punto (4).
- Arreglo: evaluar cada una de las cinco ofertas contra un `demand` recién calculado (paciencia llena) y comparar aparte en qué ronda llega `walk`.

**m3. `wageShown` vuelve a sortear el corrimiento cada día de ojeo, y cruzar los rangos achica la franja** (N2)
- `k` no es entero: `dailySquad` le suma `rate · (0,8 + azar·0,4)` por día (`squad.ts:132`). Como `w = (100 − k)·0,4 %` y la semilla es `round(w·1000)`, cada día de ojeo trae un rango nuevo con un corrimiento independiente. Pasa lo mismo con `learnFromMatch` (+12).
- El DT que anota los rangos y los cruza (cada uno dice `v ∈ c/(1 ± 0,6w)`) llega, en la simulación, a unos ±5 % alrededor de k ≈ 60 después de unos 6 días, cuando la pantalla muestra ±17 %. Cerca de 94 % llega a ±2,2 %.
- No es la fuga del ancho, que quedó cerrada. Es la acumulación de la misma máquina que `shown`, pero con muchos más sorteos: `rangeAround` usa anchos enteros, unos 10. La frase "cambia solo cuando cambia el ancho (se conoce mejor al jugador)" (`:667`) lo subestima.
- Arreglo: cuantizar `w` en escalones, como `knowWidth`. No sirve fijar el corrimiento por jugador: con `s` proporcional a `w`, dos rangos despejan `v`.
- En la misma línea: el criterio `:950` pide un cociente `hi / lo` de "1,70 ± el redondeo". En la simulación, al 35 % va de 1,71 a 1,92 cuando el extremo alto pasa de US$ 10 mil y se redondea a US$ 1 mil. Conviene escribir la tolerancia o medir el cociente antes de redondear.

**m4. La fuga (e) está mal comparada y no dice que se repite** (A8)
- Hoy dice "el mismo que da hoy el tope al firmar una compra" (`:1064`). En el diseño nuevo, el `signDeal` de una compra controla el sueldo que **ofrece el DT**, que él ya conoce: no hay ningún bit oculto. El del préstamo, que controla el `p.wage` real, es el único.
- El bit se puede volver a pedir cada vez que cambia el margen (vender, ceder o fichar a otro), así que con varios intentos acota el sueldo real dentro del rango.
- Arreglo: corregir el texto. Opcionalmente, que `signDeal` del préstamo controle el tope con el máximo del rango mostrado, que es lo que el DT ve, y así el bit desaparece.

**m5. "Aceptar US$ X" lleva a un estado con costo de salida sin avisarlo** (consecuencia de A8)
- Una contraoferta se puede retirar gratis. Aceptada, pasa a acuerdo, y salir de un acuerdo cuesta 14 días y un club molesto.
- La fila de 7.2 todavía justifica la falta de F6 con "el acuerdo se puede cancelar" (`:565`). La plantilla Contraoferta (`:402`) no avisa del costo.
- El criterio nuevo de F6 es "irreversible **o con costo**" (`:1070`). Hay que decidir si Aceptar US$ X lleva F6 o solo un aviso, y escribir ese aviso en la plantilla Contraoferta y en el `BidBox` antes de ofertar ("Si el club acepta, salirte del acuerdo cuesta…").
- La ventana de negociación (`:329-331`) solo menciona el costo de que el representante se levante, no el de dejar vencer el acuerdo.

**m6. Textos viejos sin tachar**
- Pregunta 20, punto 5 (`:1075`): "Cancelar el trato (común, sin F6)" y "Paciencia en palabra ("media")" sin la condición de `deal.neg`. Las dos cosas contradicen las preguntas 44 y 46. El punto 8 de la misma pregunta sí se tachó.
- `bandeja.md`, pregunta 22, punto 7 (`:718`): "la barra deja de ser fija con el foco en Mejorar". Lo corrige el punto 10 más adelante, pero no está tachado.
- El encabezado (`:3`) y la entrada de la sección 15 (`:1052`) no cuentan la pregunta 25 entre las que cambiaron, y la pregunta 25 cambió (`:1080`).

**m7. `dropOffersFor` necesita el motivo, y las funciones de hoy no lo saben** (A2; para el programador)
- La misma `doTransfer` sirve para la venta aceptada (`sold`), para la cláusula (`clause`, `career.ts:392`) y para los pases entre clubes de la IA.
- `removePlayer` sirve para `sellAbroad` (`sold`, según `:748`) y para los recortes y retiros (`gone`, según `:758`).
- Arreglo: escribir que las dos reciben el `why`, o que llama a `dropOffersFor` quien vende (`acceptOffer`, `marketTick`, `sellAbroad`). Si no, el motivo puede quedar mal registrado.

**Observación fuera del alcance** (para el systems-designer; viene de la segunda revisión, no de esta):
- El sueldo que cobra un ajeno de la IA es una función exacta de `ca` y la edad, que crece ×1,5 cada 5 puntos (`game.ts:49`). Al 35 %, el rango de ±26 % equivale a unos 6,5 puntos de `ca`, contra los 12 del rango de valoración (`knowWidth` 6).
- El rango del sueldo dice el nivel con casi el doble de precisión que el de la valoración. Pesa justo en los jóvenes, donde el valor exacto (fuga (a)) está mezclado con el potencial.
- Si se quiere que el sueldo no sea "una segunda vía más directa" (pregunta 9 (a)), hay que calibrar `w` del sueldo con el ancho de la valoración.
- En la misma línea, pero ilustrativo: la tarjeta de Banfield en el wireframe de Tratos (`:278-280`) no muestra el aviso de costo que pide su plantilla (`:404`).
