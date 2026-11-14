## UX Review: Mercado de pases
**Date**: 2026-11-14
**Reviewer**: ux-review skill (revisión independiente; el revisor no escribió la spec)
**Document**: `design/ux/mercado.md` (rama `mercado-ui`)
**Checklist**: 3A (línea `> **Template**: UX Spec` del encabezado)
**Platform Target**: encabezado: "web. Escritorio primero (mouse y teclado); celular por navegador (toque) por debajo de 760 px. Sin gamepad". Fuente que manda (`project.yaml`, bloque `platform`): `targets: [Web]`, `primary_input: Keyboard & Mouse`, `touch_support: Partial`, `gamepad_support: None`. Métodos de entrada que se revisan: teclado y mouse, y toque. Coinciden con el encabezado.
**Accessibility Tier**: Estándar, comprometido en `design/accessibility-requirements.md` (WCAG 2.1 AA más 2.5.8 y 2.4.11). El encabezado de la spec dice lo mismo.

**Contexto cargado (fase 2)**: `project.yaml`; `design/accessibility-requirements.md`; `design/ux/interaction-patterns.md` (N4, N9, D1, D4, D7, F1 a F8, G1 a G9); secciones UI Requirements, Core Rules, States y Edge Cases de `design/gdd/mercado-de-pases.md`, `economia-y-dirigencia.md`, `ojeo.md`, `plantel.md` y `comunicacion-y-bandeja.md` (UR-01 a UR-41, tablas D, E, H, I); `design/player-journey.md` (fases 2, 4, 5 y 6, y ventanas de pases); `production/ui/bandeja/review-*.md`; `design/ux/bandeja.md` (5.2, regla de leído). Para contrastar plazos, cálculos y fugas se leyó el código: `src/engine/inbox.ts`, `src/engine/career.ts` (`windowOpen`, `evaluateBid`, `doTransfer`, `acceptOffer`, `offerDeadline`, `haggle`, `marketTick`, `pushOffer`, `switchClub`), `src/engine/game.ts` (`valuation`, `passDays`, `advanceDay`, `finishUserMatch`, `startNewSeason`), `src/engine/squad.ts` (`demand`, `evalOffer`, `naturalStatusFor`) y `src/styles.css` (barra fija `.ib-actbar` de la bandeja). Configuración del flujo: `workflow: minimal`. La biblioteca de patrones existe, así que esa dimensión se evalúa.

**Cómo se tomaron las decisiones del usuario.** Lo que la sección 15 marca como **"Resuelto (usuario)"** vale por encima del texto viejo de los GDD. Eso incluye la demora de 1 a 3 días, la paciencia visible y guardada, el acuerdo como pendiente con plazo de 7 días, valor y pedido exactos, "Para renovar" y los avisos de cierre sin freno. Lo que la spec marca como **"Resuelto en el diseño"** (preguntas 21 y 22) no es una decisión del usuario. Si eso contradice un GDD, se informa como contradicción.

---

### Completeness: 15/15 secciones presentes

- [x] Encabezado con Status ("In Design"), Author y Platform Target
- [x] Purpose & Player Need: necesidad desde el jugador ("no perder una oferta…, encontrar el refuerzo…, saber en qué quedó cada cosa…")
- [x] Player Context on Arrival: cinco formas de llegar, estado emocional, carga, miedos
- [x] Navigation Position: jerarquía y tabla "Dónde vive cada flujo"
- [x] Entry & Exit Points: tablas de entrada y salida, ruta, selección al entrar
- [x] Layout Specification: wireframes de escritorio, panel, variantes del `BidBox`, Tratos, celular y negociación; zonas; inventario de componentes; plantillas de tarjeta
- [x] States & Variants: carga (no existe, justificado), vacío y poblado, error al guardar y la tabla de estados de un trato con su ciclo
- [x] Interaction Map: teclado, mouse y toque (gamepad fuera de alcance, AM-10)
- [x] Data Requirements: fuente y dueño por dato, lo que falta en el motor (E1 a E14), forma de `Deal`, reglas y conteo
- [x] Events Fired: cada acción con su función del motor o "ninguno"
- [x] Transitions & Animations: entrada, salida, modales y movimiento reducido
- [x] Input Method Completeness Checklist: teclado, mouse y toque marcados; gamepad fuera de alcance (no se completa, justificado)
- [x] Accessibility Requirements: requisitos por pantalla, contrastes, daltonismo, orden de foco, anuncios
- [x] Localization Considerations: máximos de caracteres por texto
- [x] Acceptance Criteria: unos 70 criterios, con rendimiento y resoluciones

La spec está completa en estructura y es muy detallada. Los problemas están en **comportamientos que faltan o se contradicen entre secciones, con el motor y con la bandeja**, no en secciones ausentes.

---

### Quality Issues: 18 encontrados (4 bloqueantes, 14 recomendados)

#### Bloqueantes

1. **No dice qué pasa con los tratos abiertos cuando el DT cambia de club** [BLOCKING]
   - Qué está mal: `switchClub` (`career.ts:129-145`, lo llaman `acceptJob` y `takeJob`) borra `g.offers`, `g.jobOffers` y `g.press`. Pero la spec no dice qué pasa con `g.deals` en `waiting`, `countered` o `agreed`. Según las reglas de la sección 8, al día siguiente pasaría esto: `committed(g)` le descuenta al **club nuevo** la plata comprometida por el anterior; `dailyDeals` contesta las ofertas del club viejo como si fueran del nuevo (`clubAnswer` usa `g.userClubId`); y un acuerdo `agreed` se firma con `signDeal` hacia el club nuevo. El caso es común: el mercado de entrenadores corre cada lunes de la fase de liga (`player-journey.md`, fase 6) y el primer libro (10 de enero al 20 de febrero) cae dentro de esa fase. Además, la confirmación F6 de aceptar un trabajo en la bandeja (`jobConsequences`: "Si aceptás, se cancelan 1 oferta por tus jugadores…") no nombraría los tratos que se pierden. El caso del despido (`g.board.fired` y después `takeJob`) tampoco está.
   - Dónde: secciones 6 (estados), 8 (reglas del trato, orden del día de `dailyDeals`), 9 y 14. Falta en la pregunta 20 (lo que necesita la bandeja).
   - Cómo arreglarlo: sumar el estado "Cambio de club" (`fell`, `why: 'club'`, "Se cayó: dejaste {club}"), que `switchClub` cierre los tratos abiertos con un mensaje por trato (o uno solo que los liste), sumar los tratos abiertos a `jobConsequences` y a la etiqueta F6 de "Aceptar trabajo" de la bandeja, y agregar un criterio de aceptación.

2. **La unión entre mensajes y tratos, y la regla de leído, quedan mal definidas: una decisión puede contar más de una vez y mensajes viejos pueden mostrar acciones vigentes** [BLOCKING]
   - Qué está mal:
     - (a) **Varios mensajes por trato.** Todos los mensajes `act: 'deal'` de un trato llevan `ref: deal.id` (la contraoferta, el acuerdo que llega después de "Mejorar", el rechazo, la caducidad), y `pendingKeyOf` los asocia a todos con `deal<id>`. Mientras el trato es pendiente, ninguno cuenta como sin leer. En cuanto el DT lo resuelve desde Mercado, los mensajes que nunca abrió pasan **todos** a sin leer. Ejemplo: firma desde Tratos y la insignia de la Bandeja **sube en 2** justo después de decidir. Eso choca con "una decisión, una vez" (8, Conteo; AC de las líneas 888 y 901) y con UR-02.
     - (b) **El trato reabierto hereda mensajes viejos.** La regla "ofertar de nuevo después de `refused` o `fell` **reabre el mismo** `Deal`" (sección 8) conserva el id. Así, el mensaje viejo sin leer "Colón no acepta tu oferta por A. Paz" vuelve a quedar ligado a un pendiente vigente `deal<id>`. Deja de contar como sin leer y, en la bandeja (F2: "el que avisa ofrece el botón"), mostraría las acciones de la contraoferta nueva bajo un título de rechazo.
     - (c) **No se define la regla de leído en el Mercado.** No se dice si abrir o resolver un trato en Tratos o en el `BidBox` marca leídos sus mensajes (con `markRead`). La lección (f) de los supuestos ("solo se marca como hecho lo que el DT hace a propósito") no llega a ninguna regla concreta.
     - (d) **Falta la fila `act: 'deal'` de la tabla D y de F2.** No están la etiqueta de la fila (`ACT_LABEL`), la condición de vigencia, la acción vigente de un mensaje cuyo trato ya es terminal ni el texto cuando no está vigente. La pregunta 20 (6) solo cubre "Ya respondiste esta contraoferta" y "Este acuerdo venció".
   - Dónde: secciones 8 (reglas del trato, Conteo) y 15 (pregunta 20, puntos 2 y 6).
   - Cómo arreglarlo: (1) un trato reabierto recibe **id nuevo** (o el pendiente se asocia al **último** mensaje del trato, por ejemplo `News.ref` más un número de ronda, y `pendingKeyOf` solo devuelve la clave para ese mensaje); (2) regla explícita: resolver un trato en el Mercado marca leídos sus mensajes con `markRead`, o esos mensajes no cuentan como sin leer después de resolverse; elegir una y escribir el criterio "resolver en Tratos no sube la insignia de la Bandeja"; (3) sumar la fila `deal` a la tabla D o F2 con su vigencia y su texto cuando no está vigente.

3. **El lado de la bandeja de las decisiones `deal` choca con la barra de acciones fija de la bandeja en ≤ 900 px** [BLOCKING]
   - Qué está mal: la spec dice que `DealDecision` es **el mismo componente** en Tratos, en el `BidBox` y en el detalle de la bandeja (5.3, pregunta 20 (7)), y que "ninguna acción de esta pantalla va en una barra fija" (lección (a)). Pero la bandeja, en ≤ 900 px, pone las acciones en una barra `position: fixed` con `max-height: 45vh; overflow-y: auto` (`styles.css:816`, `bandeja.md` 5.2). Su regla es "si hay más de 3, el cuarto pasa a 'Más acciones'". La contraoferta tiene Aceptar US$ X, el campo Mejorar con "Ofertar", Retirar la oferta, Ver todos los tratos y Ver la ficha: un **campo de texto** y cuatro o cinco botones. Metida en esa barra fija, en un celular con el teclado virtual abierto, se repite justo el defecto que encontró la revisión de la bandeja (H1, H2), y en una barra con scroll interno. La pregunta 20 no resuelve qué regla manda, ni dónde va el impacto, ni cómo se reparten los botones en dos filas.
   - Dónde: 5.3 (`DealDecision`), 15 (pregunta 20), 14 (los criterios de visibilidad solo cubren "Tratos, el panel, la ficha y la negociación", no el detalle de la bandeja).
   - Cómo arreglarlo: en la pregunta 20, fijar el diseño de `DealDecision` en el detalle de la bandeja ≤ 900 px. Por ejemplo: el campo Mejorar y el impacto van en el contenido, y la barra fija lleva solo el primario y una segunda fila con a lo sumo dos botones; el resto va como "Más acciones" en el contenido, como pide la bandeja. Sumar el detalle de la bandeja a los criterios de `elementFromPoint` (líneas 933-934) y anotar el cambio como requisito para `design/ux/bandeja.md`.

4. **Se muestran cifras que permiten calcular la valoración real y la personalidad de jugadores ajenos, más allá de lo que aceptó el usuario** [BLOCKING]
   - Qué está mal: la pregunta 9 documenta solo una fuga: el valor y el pedido exactos, más los motivos de rechazo. Hay otras más directas, y algunas las agrega esta spec:
     - **Sueldo que pediría** ("Cobraría unos US$ 7,9 mil por mes", `wageDemand`, en el `BidBox` de cualquier fila de la tabla y "Cabe en tu tope" en el comparador). `wageDemand` sale de `valuation(p).wage = 1400 · 1,5^((ca − 50)/5)` con un factor de edad (`game.ts:49`). Con la reputación de tu club a la vista, se despeja el `ca` con un decimal. Esto no es el sueldo actual ni el pedido.
     - **Lo que pide el representante** (negociación). El sueldo también sale de `valuation`. La **prima** es `sueldo × (1 + ambición/5)` (`squad.ts:283`), así que el cociente prima/sueldo da la **ambición exacta**. La **paciencia** visible (2 o 3, decisión del usuario en la pregunta 4) dice si la ambición es 15 o más. El **rol pedido** ("Titular") sale de `naturalStatusFor`, que ordena tu plantel por `bestRating` real (`squad.ts:310`). Con eso se ve la personalidad aunque el conocimiento sea menor a 60, cuando la spec dice "personalidad desconocida".
     - **El sueldo actual de un jugador de la IA** es `valuation().wage` desde el cambio de temporada (`game.ts`: `Object.assign(p, valuation(p, g.date))` para los clubes de la IA), es decir, el `ca` exacto. La pregunta 9 lo trata como "dato contractual público" sin decir que es la fuga más fuerte de todas.
   - El criterio de la línea 878 ("ninguna pantalla del Mercado muestra su `ca`… exactos… ni en la ventana de negociación") no se puede cumplir tal como está escrito. Choca con la regla de `CLAUDE.md` (lo ajeno como rango, `knownRating`) y con la "Regla para pantallas nuevas" de `ojeo.md`.
   - Dónde: 5.1 (panel y negociación), 5.3 (`BidBox`, comparador), 8 (filas "Estimación del sueldo que pedirá" y "Valor, sueldo…"), 15 (pregunta 9), 14 (línea 878).
   - Cómo arreglarlo: (a) volver a presentarle al usuario la fuga completa (sueldo ⇒ `ca`; prima y paciencia ⇒ ambición; rol ⇒ puesto real en tu plantel) y anotar lo que acepte en la pregunta 9 y en `ojeo.md`; o (b) para conocimiento menor a 100, mostrar el sueldo estimado como rango calculado sobre el `ca` estimado (`shown`/`knownRating`), redondear la prima a pasos que no revelen la ambición y rotular la paciencia y el rol como "lo que dice su representante" solo con conocimiento de 60 o más. En los dos casos, reescribir el criterio de la línea 878 para que diga exactamente qué se puede ver.

#### Recomendados

5. **La selección en Tratos no tiene disparador** [ADVISORY]
   - Qué está mal: Tratos usa `sel` (`deal<id>`, `offer<id>`, `renew<pid>`) y de esa selección dependen varias cosas: "Resuelto… hasta cambiar la selección", "la tarjeta, si estaba elegida, reemplaza sus acciones", "elegir otra fila o tarjeta cancela la F6" y la entrada del historial que se reemplaza. Pero ninguna fila de 7.1 o 7.2 dice cómo se elige una tarjeta: ¿clic en la tarjeta, foco adentro de la tarjeta, una acción?
   - Dónde: 4 ("Elegir otro jugador o trato"), 6, 7.
   - Cómo arreglarlo: definir que se elige una tarjeta con clic o toque en su cuerpo, o cuando el foco entra en ella (`focusin`), y que eso reemplaza `sel` en la ruta.

6. **Contradicción con el GDD sin decisión del usuario: el préstamo acordado, el tope de 5 ofertas, lo comprometido y la protección del acuerdo** [ADVISORY]
   - Qué está mal: `mercado-de-pases.md` (Core Rules, compra, punto 4) dice que el préstamo aceptado "se ejecuta en el acto". La spec lo cambia a confirmación F6 (pregunta 21). También agrega reglas de juego: tope de 5 ofertas, plata comprometida y "la IA no vende a un jugador con acuerdo" (pregunta 22). Todo eso figura como **"Resuelto en el diseño"** por el ux-designer, no por el usuario ni el game-designer. La pregunta 16 manda a documentar en el GDD el tope y lo comprometido, pero no el préstamo con F6 ni la protección del acuerdo.
   - Dónde: 15 (preguntas 16, 21, 22).
   - Cómo arreglarlo: pedir la confirmación del usuario o del game-designer para las preguntas 21 y 22, y sumar a la pregunta 16 el préstamo confirmado con F6 y la protección del acuerdo en `marketTick`.

7. **Falta especificar el balance de la temporada en Presupuesto (GDD de economía)** [ADVISORY]
   - Qué está mal: `economia-y-dirigencia.md` (UI Requirements) pide en Mercado › Finanzas los ingresos (recaudación, TV, premios, ventas), los egresos (sueldos, compras) y el resultado de la temporada. La spec nombra "balance de la temporada" en 5.2 y en la pregunta 13, pero no hay wireframe, ni componente en 5.3, ni fila de datos para `club.ledger`, ni estado vacío.
   - Dónde: 5.1, 5.3, 8.
   - Cómo arreglarlo: sumar el componente "Balance de la temporada" (filas del `ledger` con `money()`, resultado con signo) y su fila de datos.

8. **Hay criterios que contradicen los umbrales del ojeo** [ADVISORY]
   - Qué está mal: el criterio de la línea 878 y el estado "Jugador elegido" (línea 425) piden rangos para todo jugador con conocimiento menor a 100. Pero `shown` devuelve el valor exacto con 91 o más (atributos) y con 95 o más (valoración) (`ojeo.md`, umbrales). Un tester que pruebe con 96 % va a marcar falla sobre un comportamiento correcto. Además, el criterio de la línea 940 ("salvo los de 11 px permitidos…") no dice qué textos pueden tener 11 px.
   - Dónde: 6 y 14.
   - Cómo arreglarlo: "como `shown` lo devuelve (rango hasta los umbrales 91 y 95 de `ojeo.md`)"; listar los textos de 11 px permitidos o sacar la excepción.

9. **El último día y la ventana de la contraoferta no coinciden con `bidCheck`** [ADVISORY]
   - Qué está mal: "Mejorar" es `placeBid` y `bidCheck` lo bloquea el último día del libro. Pero las secciones 6 y 7.3 ("Último día del libro") no lo nombran entre lo deshabilitado. Tampoco se avisa que una mejora hecha a menos de tres días del cierre probablemente caduque (el aviso "si contesta después, la oferta caduca" está para Ofertar, no para Mejorar).
   - Dónde: 6 (Último día, Libro por cerrar), 7.3.
   - Cómo arreglarlo: sumar Mejorar a la lista del último día con su motivo, y el aviso de caducidad junto al campo Mejorar.

10. **Fechas del libro y del cambio de temporada** [ADVISORY]
    - Qué está mal: la temporada nueva empieza el 10 de enero (`startNewSeason`, `game.ts:783`) y mientras la temporada está terminada no corre el tiempo. Por eso "Libro cerrado · reabre el 1 de enero (faltan N días)" y la ayuda O2 ("abre del 1 de enero…") cuentan días hasta una fecha que el DT nunca juega. Además, el GDD pide avisar en la bandeja que el libro cerró cuando quedan **ofertas recibidas** abiertas (Edge Cases: "La bandeja debe decirlo"). Los avisos de cierre nombran las ofertas esperando respuesta y los acuerdos, pero no las ofertas por tus jugadores, que siguen abiertas con Aceptar deshabilitado.
    - Dónde: 5.3 (ayuda), 6 (Libro cerrado, Aviso de cierre), 8 (E1).
    - Cómo arreglarlo: que `windowState` diga "reabre con la temporada nueva (10 ene)" después del 10 de agosto, y que el último aviso nombre también las ofertas recibidas que quedan sin poder aceptarse.

11. **Espacio sobre una fila hace cosas distintas en el Mercado y en la Bandeja** [ADVISORY]
    - Qué está mal: en la bandeja, Espacio sobre una fila sigue siendo Continuar (F1: "`role=option` no tiene función propia"). En la tabla del Mercado con `onPick`, Espacio marca la casilla. Las dos listas tienen el mismo foco itinerante y la misma anatomía de "una parada de Tab". Quien aprendió una avanza un día sin querer en la otra, o al revés. La pregunta 12 anota el cambio en D1, pero no la diferencia con F1.
    - Dónde: 7.1, 12 (G1), 15 (pregunta 12).
    - Cómo arreglarlo: anotar la diferencia en F1 y D1 de la biblioteca y en la ayuda de teclado del panel, o unificar.

12. **Contrastes sin medir en el nivel Estándar** [ADVISORY]
    - Qué está mal: cuatro pares quedan TBD: fila elegida sobre `--accent-soft` en los 86 clubes, montos `--good`, texto sobre el fondo de aviso y barras de los medidores. `--good` es fijo (#3ddc97, 9,24:1 sobre `--panel` según `accessibility-requirements.md`), así que se puede completar ya.
    - Dónde: 12, tabla de contraste.
    - Cómo arreglarlo: completar los cuatro valores (script de contraste de la bandeja) antes de la entrega a diseño visual.

13. **El foco tapado arriba no está cubierto en escritorio** [ADVISORY]
    - Qué está mal: la spec reserva `scroll-padding-bottom` para la navegación inferior del celular y `scroll-margin` para la barra masiva. Pero no dice cuánto reservar arriba por la barra superior o la franja de pestañas, si son `sticky`, cuando Tab baja por las tarjetas de Tratos o por el panel. El criterio de la línea 934 lo mide, pero la regla de diseño no está escrita.
    - Dónde: 5.2, 12.
    - Cómo arreglarlo: `scroll-padding-top` igual a la altura de las barras fijas de arriba, como regla de la pantalla.

14. **La parte de la ficha que entra en la spec deja abiertas renovaciones de cedidos y el "sacarse un jugador"** [ADVISORY]
    - Qué está mal: "Para renovar" toma los jugadores de `squadOf` con `contractEnd <= g.season`, y eso incluye a los cedidos en tu club. El GDD marca "Renovar a un jugador a préstamo… ⚠️ Sin control". Además, el propósito y el encabezado nombran "sacarse un jugador", "jugador que quiere irse" y "transferibles" (`plantel.md`), pero ninguna zona del Mercado los muestra ni permite declarar transferible. El vacío de "Para responder" dice "si declarás transferible a alguno, llegan más", pero no da el camino.
    - Dónde: 1, 5.3 (plantilla "Contrato por renovar"), 6 (Tratos vacío).
    - Cómo arreglarlo: excluir a los cedidos (`loanFrom != null`) de "Para renovar" y sumar un enlace "Ver transferibles y quienes quieren irse" (Plantel con filtro) o sacar ese uso del propósito.

15. **El evento de ruptura de una renovación no cierra** [ADVISORY]
    - Qué está mal: la sección 9 dice que `p.negBlock = hoy + 30` "pasa a `walkAway`", pero `walkAway(g, dealId)` trabaja sobre un `Deal` (bloqueo de 14 días) y las renovaciones no tienen `Deal`.
    - Dónde: 9.
    - Cómo arreglarlo: una función propia (`renewWalk(g, pid)`, 30 días) o el lado `renew` en `Deal`.

16. **Navegación: texto ambiguo y estado fuera de la ruta** [ADVISORY]
    - Qué está mal: la primera fila de la tabla de entrada dice "Reemplazo de página" para el clic en Mercado. Se puede leer como reemplazar la entrada del historial, lo que rompería el criterio de la línea 911. La sección 4 abre con "toda la configuración visible va en la ruta (N4)", pero los filtros viven en `useSticky` y no en la ruta. Y "Ver todos los tratos" con un trato terminal va "a su fila del historial", que puede no estar entre los 20 que se muestran.
    - Dónde: 4.
    - Cómo arreglarlo: decir "apila (N4); animación `page-in`", corregir la frase de la ruta y decir que el historial carga hasta la fila pedida.

17. **Cifras del ejemplo que no cierran y una referencia rota** [ADVISORY]
    - Qué está mal: en 5.1, el KPI dice "libre 0,7 M" (1,4 M comprometidos), pero el `BidBox` sin trato arranca con "Libre p/ ofertar 2,1 M → 0,7 M" (nada comprometido). El contador dice "Ofertas esperando respuesta: N de 5" y cuenta también las contraofertas. La sección 9 cita "E3", que no existe en la tabla E de la sección 8.
    - Dónde: 5.1, 6, 8, 9.
    - Cómo arreglarlo: alinear los ejemplos, llamar al contador "Ofertas abiertas: N de 5" y corregir la referencia.

18. **`Game.version` y valor inicial del campo Oferta** [ADVISORY]
    - Qué está mal: `CLAUDE.md` dice "si cambia el formato, subir la versión", y la spec agrega `g.deals` y `g.nextDeal` sin subirla (`?? []`). Es razonable, pero es una excepción a una regla del proyecto y la tiene que aprobar el lead-programmer. El valor inicial del campo "Oferta" (el GDD dice que arranca en `askingPrice`) solo aparece en el wireframe; con "Enter, Enter" se oferta ese monto, así que tiene que estar escrito.
    - Dónde: 8 (E2), 7.2.
    - Cómo arreglarlo: anotar la excepción con su dueño y escribir "el campo arranca en el pedido (`askingPrice`)".

---

### GDD Alignment: GAPS FOUND

- **`mercado-de-pases.md` UI Requirements: 10 de 10 cubiertos**, con cambios que respaldan decisiones del usuario: la insignia cuenta ofertas más tratos, la oferta queda esperando respuesta y la negociación se guarda.
  - Contradicciones sin decisión del usuario: el préstamo acordado se confirma con F6 en vez de ejecutarse en el acto (Core Rules, compra, punto 4); el tope de 5 ofertas, lo comprometido y la protección del acuerdo son reglas nuevas (pregunta 22) (issue 6).
  - Tabla "Lo que el mercado manda a la bandeja": 11 filas cubiertas, salvo "Pase caído con el representante" (sin `pid` en el GDD; la spec le agrega `act: 'deal'`, lo que hace falta escribir en el GDD, pregunta 16) y la renovación rota (issue 15).
  - Edge Cases: falta "Ofertas abiertas al cambiar de temporada **o de club**" aplicado a `g.deals` (issue 1). Falta "La ventana cierra con ofertas abiertas: la bandeja debe decirlo" para las ofertas recibidas (issue 10). Falta "Renovar a un jugador a préstamo" (issue 14). El control de tope salarial en `bidCheck` contradice la rama de cláusula del GDD (Core Rules, compra, punto 2: con la cláusula pagada no se mira el tope hasta la negociación); es un caso casi inalcanzable, pero hay que anotarlo.
- **`economia-y-dirigencia.md` UI Requirements: 1 cubierto y 1 parcial (de los 2 que tocan al Mercado).** Falta especificar ingresos, egresos y resultado de la temporada (issue 7).
- **`ojeo.md` UI Requirements: 12 de 12 cubiertos.** Pero la "Regla para pantallas nuevas" queda contradicha por el sueldo estimado, lo que pide el representante y la paciencia (issue 4), y los criterios no respetan los umbrales 91 y 95 (issue 8). La spec mejora el GDD en "ojeo lleno" (ahora avisa).
- **`plantel.md` UI Requirements: 0 filas para el Mercado.** El encabezado lo cita por "jugador que quiere irse" y "transferibles", que no tienen lugar en la pantalla (issue 14). El rol prometido en la negociación está cubierto.
- **`comunicacion-y-bandeja.md`: de los UR del encabezado (UR-02, 05, 08, 13, 16, 36), 5 de 6 cubiertos.** UR-02 ("una decisión cuenta una sola vez") no se cumple en el paso de pendiente a resuelto (issue 2). UR-04 (insignia = ofertas) se reemplaza con respaldo de la decisión del usuario. Faltan también UR-22 (leído solo a propósito; issue 2c) y la tabla D para `act: 'deal'` (issue 2d). UR-33 ("frenar el día anterior al vencimiento") se cumple con el criterio de la bandeja (el último día). Es coherente con `expiringKeys`, pero el GDD sigue diciendo "el día anterior" y conviene unificarlo.
- **Plazos y vencimientos contra el motor**: las ofertas usan `offerDeadline` = fecha + 9 y `marketTick` las borra al cerrar ese día (`career.ts:346`, `:362-364`); los tratos vencen en `dailyDeals` al empezar el día siguiente al plazo. La semántica es la misma ("el plazo vale todo el día"). Lo único distinto es la fecha del mensaje de vencimiento (las ofertas lo fechan el último día; los tratos, el día siguiente) y conviene unificarla. El orden de `dailyDeals` después de `g.date = addDays(...)` en `advanceDay` y `finishUserMatch` coincide con `game.ts:685` y `:714`. `expiringKeys` y `pendingKeyOf` necesitan los cambios que lista la pregunta 20. Están anotados, pero con los huecos de los issues 2 y 3.
- **`player-journey.md`**: el contexto de llegada (fases 4 y 5, el libro como gancho de fin de sesión) está bien usado. Pero la fase 6 (cambio de club a mitad del libro) no se tuvo en cuenta (issue 1).

---

### Accessibility: GAPS

- Target tier: **Estándar** (comprometido).
- Cumple: orden de foco escrito (12, con Buscar, Tratos, celular y negociación); tabla con una sola parada de Tab y oyente local que respeta `defaultPrevented` (resuelve G7); no se agregan atajos de una tecla (AM-03); Espacio no avanza el día sobre controles (G1/AM-02, depende del arreglo global); F6 en todo lo irreversible (G5); notas con `role="status"`; modales con `aria-labelledby`; motivos de deshabilitado escritos y asociados con `aria-describedby`, no solo en `title`; daltonismo cubierto con texto, ícono o forma en cada señal; objetivos táctiles de 44 px; acciones en el flujo del contenido, no en barras fijas, en el Mercado; criterios de `elementFromPoint` y 2.4.11 en seis resoluciones; movimiento reducido.
- Huecos:
  - (a) Cuatro contrastes TBD (issue 12).
  - (b) Foco tapado arriba sin regla (issue 13).
  - (c) La misma `DealDecision`, en la bandeja ≤ 900 px, iría a una barra fija con scroll interno y un campo de texto (issue 3; es de accesibilidad y bloqueante).
  - (d) Espacio con significado distinto en dos listas iguales (issue 11).
  - (e) La excepción de 11 px del criterio de la línea 940 no se puede verificar (issue 8).
  - (f) AV-05 (texto hasta 150 %) aparece como "cuando exista". Es coherente con el estado "Parcial" del requisito, pero el criterio de la línea 940 solo prueba al 100 %. Conviene un criterio al 120 % (el máximo actual).

### Pattern Library: INCONSISTENCIES FOUND

- La spec cita patrones por id (N1 a N9, C1, C4, C5, D1 a D7, F1 a F8, I1, O1, O2, A2, G1 a G7) y anota los nuevos en la pregunta 15: panel al costado de una tabla, tarjeta de trato, `DealImpact`, franja del libro, tabla con foco itinerante y "esperando respuesta".
- No se anotan los cambios a patrones existentes que esta spec obliga a hacer:
  - **F2**: tabla de `act` sin `deal`.
  - **F3**: "Insignia en Mercado (ofertas)" pasa a ofertas más tratos.
  - **F4**: "Aparece una decisión nueva → Bandeja > Pendientes" ahora incluye `deal` y su último día.
  - **F6**: la biblioteca dice "Confirmar en peligro y No"; la spec pone Confirmar como primario.
  - **F1 y D1**: Espacio y Enter sobre la fila cambian de sentido entre la bandeja y el Mercado (issue 11).
- Sumarlos a la pregunta 15 o a la 16.

### Verdict: NEEDS REVISION

**Blocking issues**: 4 — se resuelven antes de implementar:
1. Tratos abiertos al cambiar de club o al ser despedido (motor y confirmación del trabajo).
2. Unión entre mensajes y tratos, y regla de leído: el doble conteo después de resolver, el trato reabierto que hereda mensajes viejos y la falta de la fila `act: 'deal'` en la tabla D.
3. `DealDecision` en la barra fija de la bandeja ≤ 900 px (campo de texto y más de 3 acciones).
4. Fuga de `ca` y de personalidad por el sueldo estimado, lo que pide el representante y la paciencia, más allá de lo que aceptó el usuario.

**Advisory issues**: 14 — recomendados, no bloquean.
**Dimensions not assessed**: 0 — las cuatro dimensiones (completitud y calidad, GDD, accesibilidad, biblioteca de patrones) tenían fuente con qué comparar.

Address the 4 blocking issues above, then re-run `/ux-review`.

La estructura es sólida y casi todas las lecciones de la bandeja están incorporadas desde el diseño. Los cuatro bloqueantes son de **bordes del sistema** (otra pantalla, otro momento del juego o un dato que se filtra), no de la pantalla en sí: no hace falta rediseñar. Los issues 2 y 3 se resuelven en la misma tarea en que la pregunta 20 se lleve a `design/ux/bandeja.md`. El issue 4 requiere volver a preguntarle al usuario con la fuga completa a la vista.
