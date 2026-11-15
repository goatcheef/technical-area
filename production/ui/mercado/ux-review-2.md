## UX Review: Mercado de pases (segunda pasada)
**Date**: 2026-11-15
**Reviewer**: ux-review skill (revisión independiente; el revisor no escribió la spec ni la primera revisión)
**Document**: `design/ux/mercado.md` (rama `mercado-ui`, commit `5b058c1`), con el lado de la bandeja en `design/ux/bandeja.md` (sección 15, pregunta 22)
**Checklist**: 3A (línea `> **Template**: UX Spec` del encabezado)
**Platform Target**: encabezado: "web. Escritorio primero (mouse y teclado); celular por navegador (toque) por debajo de 760 px. Sin gamepad". Manda `project.yaml` (`targets: [Web]`, `primary_input: Keyboard & Mouse`, `touch_support: Partial`, `gamepad_support: None`): se revisan teclado y mouse, y toque. Coinciden.
**Accessibility Tier**: Estándar, comprometido en `design/accessibility-requirements.md` (WCAG 2.1 AA más 2.5.8 y 2.4.11). El encabezado dice lo mismo.

**Contexto cargado (fase 2)**: `project.yaml` (`workflow: minimal`); `design/accessibility-requirements.md`; `design/ux/interaction-patterns.md` (F1, F2, F6, D1, D2); `design/gdd/mercado-de-pases.md` (UI Requirements, "Lo que el mercado manda a la bandeja", Edge Cases); los UR de `ojeo.md`, `plantel.md`, `economia-y-dirigencia.md` y `comunicacion-y-bandeja.md` que ya cruzó la primera revisión; `design/player-journey.md` (fases 4 a 6); la primera revisión `production/ui/mercado/ux-review.md`; `design/ux/bandeja.md` completo en lo que toca a `deal` (4, 5.2, 5.3, 6, 7.2, 7.3, 8, 9, 14 y 15). Código contrastado: `src/engine/inbox.ts` (entero), `src/engine/career.ts` (`switchClub`, `jobConsequences`, `evaluateBid`, `wageDemand`, `doTransfer`, `acceptOffer`, `haggle`, `marketTick`, `pushOffer`, `dailyFinances`), `src/engine/squad.ts` (`demand`, `evalOffer`, `naturalStatusFor`, `STATUS`, `knowOf`, `shown`, `applyRenewal`), `src/engine/game.ts` (`news`, `isMine`, `markRead`, `advanceDay`, `finishUserMatch`), `src/ui/App.tsx` (pantalla de despido), `src/ui/Inbox.tsx:555`. Se corrió `node tools/check-contrast.mjs` (0 fallas).

**Reglas de esta pasada.** Lo que la sección 15 marca "Resuelto (usuario)" vale por encima del GDD. No son bloqueantes, por estar anotados con dueño: los cambios a los GDD (pregunta 16), a la biblioteca de patrones (pregunta 15), los números nuevos de E16, `Game.version` (pregunta 36: el orquestador decidió no subirla, con campos opcionales y valor por defecto), el id por oferta de trabajo (`bandeja.md`, pregunta 22) y el filtro de Plantel (pregunta 32).

---

### Seguimiento de la primera revisión

| # | Issue (primera pasada) | Estado | Prueba |
|---|---|---|---|
| 1 | Tratos abiertos al cambiar de club (B) | **Resuelto** | `mercado.md:464` (estado "Cambio de club con tratos abiertos"), `:648` (regla), `:746` (`switchClub` antes de cambiar `g.userClubId`), `:752` (`dailyDeals` cierra con `club` lo de otro club), `:984` (criterio); `bandeja.md` 5.3, plantilla "Oferta de trabajo" ("Se caen tus 3 tratos de mercado…") y 9 (`acceptJob`). El despido sin tratos tocados coincide con el motor: `advanceDay` y `finishUserMatch` no avanzan con `g.board.fired` (`game.ts:677`, `:710`). |
| 2 | Mensajes y tratos, regla de leído (B) | **Resuelto** (con dos detalles nuevos: A3 y A2) | Trato nuevo por oferta nueva: `:647`, `:511`; un mensaje por decisión (`newestOf`): `:702`, `:622`; regla de leído en tres partes: `:707-712`; fila `act: 'deal'` de la tabla D y F2: `:714-718`; del lado de la bandeja, `bandeja.md` 6 ("Sin leer", "Mensaje reemplazado", "Mensajes de una decisión del mercado") y 8 (insignia). |
| 3 | `DealDecision` en la barra fija de la bandeja ≤ 900 px (B) | **Resuelto** (con una consecuencia nueva: A1) | `mercado.md:381` y pregunta 20 (8) `:1060`; criterio `:1017`; `bandeja.md` 5.2 (barra: primario y un único botón, campo Mejorar en el contenido, `position: static` con el foco en Mejorar) y su criterio "Detalle ≤ 900 px". Las dos specs dicen lo mismo, palabra por palabra. |
| 4 | Fuga de `ca` y de personalidad (B) | **Parcialmente resuelto** | Las cuatro vías listadas se cerraron o las aceptó el usuario con la fuga a la vista: sueldo que cobra y que pediría como rango (`wageShown`, E15, `:618`, `:657-663`); prima sin ambición y margen del representante (E16, `:619`); paciencia en palabra (`:388`); rol pedido y sueldo pedido como fuga aceptada (pregunta 9, `:1049`, puntos (c) y (d)). **Queda abierta una vía de la misma clase que la revisión anterior no vio** y que la regla del usuario prohíbe: la contraoferta del representante despeja la ambición (N1). Además, la premisa con la que se aceptó la fuga del préstamo es falsa (A8). |
| 5 | Selección en Tratos sin disparador | **Resuelto** | `:136`, `:533`, criterio `:994`. |
| 6 | Reglas nuevas sin decisión del usuario | **Resuelto** | Preguntas 21 y 22 pasan a "Resuelto (usuario, segunda revisión)" (`:1061-1062`); la 16 (`:1056`) anota para el GDD el préstamo con F6, el tope de 5, lo comprometido y la protección del acuerdo. |
| 7 | Balance de la temporada | **Resuelto** (con un error de dato nuevo: A5) | Componente `:392`, zona `:358`, E20 `:623`, criterio `:986`. |
| 8 | Criterios contra los umbrales del ojeo | **Resuelto** | `:942` (95/91/70/60 con prueba a 35, 94 y 96 %); "nada por debajo de 12 px" `:835` y `:1022`. |
| 9 | Último día y Mejorar contra `bidCheck` | **Resuelto** | `:429`, `:401`, `:562`, `:583`, criterio `:948`. |
| 10 | Fechas del libro y aviso de ofertas recibidas | **Resuelto** | `windowState` con `nextSeason` (`:602`), "reabre al comenzar la temporada 2027 (10 ene)" (`:368`, `:431`), aviso que nombra las ofertas recibidas (`:430`), criterios `:936` y `:979`. |
| 11 | Espacio distinto en Mercado y Bandeja | **Resuelto** | `:521`, `:532`, `:811`, pregunta 29; el cambio en F1 y D1 queda en la pregunta 15 (dueño: ux-designer). |
| 12 | Contrastes sin medir | **Resuelto** | Tabla `:822-833`. Un número no coincide con la medición (A10). |
| 13 | Foco tapado arriba | **Resuelto** | `:360`, criterio `:1015`. |
| 14 | Cedidos en "Para renovar"; "sacarse un jugador" sin camino | **Resuelto** | `:405`, `:692`, `:253`, `:474`, criterios `:981`, `:985`; filtro de Plantel en la pregunta 32 (dueño: ui-programmer). |
| 15 | Ruptura de una renovación | **Resuelto** | E18 `:621`, `:745`, criterio `:982`. |
| 16 | Navegación ambigua | **Resuelto** | `:123`, `:112`, `:125`, criterios `:995-996`. |
| 17 | Cifras del ejemplo y referencia rota | **Parcialmente resuelto** | Lo listado se corrigió (`:173-175`, `:217`, `:289`; ya no hay "E3"). Quedan otras cifras que no cierran (A10). |
| 18 | `Game.version` y valor inicial del campo Oferta | **Resuelto** | Campo: `:380`, `:558`, `:949`. Versión: la decidió el orquestador (sin subir, campos opcionales con valor por defecto). Falta escribirlo: E2 (`:603`) y la pregunta 36 (`:1076`) siguen diciendo "pendiente del lead-programmer" y la pregunta 1 (`:1041`) ya lo da por resuelto. No se cuenta como issue. |

---

### Completeness: 15/15 secciones presentes

- [x] Encabezado con Status ("In Design", revisada tras la primera revisión), Author y Platform Target
- [x] Purpose & Player Need, desde el jugador
- [x] Player Context on Arrival (cinco formas de llegar, incluido el freno del avance)
- [x] Navigation Position (jerarquía y "Dónde vive cada flujo")
- [x] Entry & Exit Points (ruta, selección al entrar, salidas con su disparador)
- [x] Layout Specification (wireframes, zonas, inventario, plantillas de tarjeta)
- [x] States & Variants (carga justificada, vacíos, error al guardar, estados y ciclo del trato, cambio de club)
- [x] Interaction Map (teclado, mouse y toque)
- [x] Data Requirements (E1 a E20, forma de `Deal`, reglas, conteo, regla de leído, tabla D)
- [x] Events Fired (cada acción con su función o "ninguno")
- [x] Transitions & Animations
- [x] Input Method Completeness Checklist (gamepad fuera de alcance, justificado)
- [x] Accessibility Requirements
- [x] Localization Considerations
- [x] Acceptance Criteria (más de 80, con rendimiento y resoluciones)

La revisión cerró casi todo lo de la primera pasada y lo llevó bien a la bandeja: claves, conteo, regla de leído, freno, barra angosta y F6 del trabajo coinciden en las dos specs. Los dos bloqueantes nuevos salen de contrastar las reglas nuevas con el motor de negociación (`squad.ts`), que la revisión no tocó.

---

### Quality Issues: 12 encontrados (2 bloqueantes, 10 recomendados)

#### Bloqueantes

**N1. La contraoferta del representante despeja la ambición: contradice la decisión del usuario de la pregunta 9 y el criterio de la línea 944** [BLOCKING] (resto del issue 4)
- Qué está mal: el usuario decidió "ningún dato de la personalidad como número… que ningún cociente de cifras visibles despeje un rasgo" (pregunta 9, `:1049`; E16, `:619`), y la spec muestra exactas las contraofertas del representante ("sus palabras", `:649`, `:944`). Pero `evalOffer` (`squad.ts:286-305`) arma la contraoferta con un puntaje que depende de la ambición: sin cláusula suma `0,02 + (amb − 10) × 0,004` (`:294`), con cláusula `(amb − 8) × 0,006`, y con un rol menor al pedido `0,1 + (amb − 10) × 0,01`. La contraoferta es `need = sueldo ofrecido × (1 + (0,985 − puntaje) × 1,15)` redondeado a US$ 100 (`:302`). El DT conoce todo lo demás: el pedido exacto, la prima, los años, el rol que pide y la edad. Con la **primera oferta que propone la propia ventana** (90 % del sueldo y 60 % de la prima, `:454`), sin cláusula y con el rol pedido, la contraoferta despeja la ambición. Ejemplo con un pedido de US$ 8.700: ambición 1 → pide US$ 8.500; 5 → 8.400; 10 → 8.200; 15 → 8.000. Son unos US$ 36 por punto, o sea ±1,5 puntos de ambición, sin conocer al jugador (la spec dice "Personalidad: desconocida" por debajo de 60 %, `:437`). El criterio de la línea 944 solo pide revisar `demand` ("el cociente prima / sueldo no depende de la ambición"): pasa, y la fuga queda.
- Dónde: 8 (E16), 9 (`sendTerms`), 14 (`:944`), 15 (pregunta 9).
- Cómo arreglarlo: (a) sumar a E16 que `evalOffer` no use la ambición en los términos de los que sale la contraoferta (cláusula, rol). Si la ambición tiene que pesar, que pese solo en lo que la interfaz muestra en palabra (cuánto baja la paciencia), o que la contraoferta se redondee a pasos que no la revelen (por ejemplo, US$ 1 mil o 5 % del pedido). (b) Reescribir el criterio de la línea 944 para que cubra `evalOffer`. Por ejemplo: "con dos ajenos iguales salvo la ambición (5 y 14), la misma secuencia de ofertas da las mismas contraofertas". (c) O volver a mostrarle esta fuga al usuario y anotarla en la pregunta 9 como el punto (e), si la acepta.

**N2. "Sueldo que pediría" sale de `wageDemand`, pero el representante pide con `demand`: el dato "exacto desde 95 %" no es lo que se va a pedir, y el veredicto del tope sale mal** [BLOCKING]
- Qué está mal: el `BidBox`, el comparador, `DealImpact` y el aviso del tope usan `wageShown(g, p, wageDemand(g, p, dest), 402)` (`:676`, `:380`, `:382`, `:442`). `wageDemand` (`career.ts:257-260`) es el sueldo de referencia. Lo que el representante pide en la mesa es `demand` (`squad.ts:278-284`): la misma base multiplicada por el rol que pide (`STATUS[...].wage`: ×1,25 "Clave", ×1,1 "Titular", ×0,8 "Promesa"), la ambición (de −20 % a +22 %), el atributo de negociación del DT y, desde E16, el margen de ±10 % del representante. Entre los dos puede haber de 0,65 a 1,65 veces de diferencia. Hay tres consecuencias. (1) El criterio `:943` ("exactos desde 95 %") y el `:944` (lo que pide el representante, exacto) se contradicen: un tester que conoce al jugador al 96 % ve "Pediría US$ 7.900" en el `BidBox` y "El representante pide US$ 10.900" en la ventana. (2) "Entra / puede no entrar / no entra" (`:382`, `:389`, `:442`) va a decir "entra" a quien no entra, justo en la tercera pregunta de la pantalla ("¿Me alcanza?", 5.4) y en la promesa del objetivo emocional ("en control de la plata"). (3) No coincide con la bandeja: el informe de ojeo ya muestra el pedido de sueldo con `demand(g, p, 'buy', naturalStatusFor(g, p)).terms.wage` (`Inbox.tsx:555`; `bandeja.md` 5.3, plantilla "Informe de ojeo": "pedido de sueldo"). Son dos números para el mismo dato en dos pantallas.
- Dónde: 5.1 (panel), 5.3 (`BidBox`, `DealImpact`, comparador), 6 ("Sueldo que podría pasar el tope"), 8 (fila "Sueldo que pediría", E15), 14 (`:943`, `:950`).
- Cómo arreglarlo: definir el "sueldo que pediría" como el pedido de `demand` con el rol natural (el mismo valor que pedirá el representante y que ya muestra el informe de ojeo), pasado por `wageShown`. Decir en E16 que el margen del representante entra también en ese valor. Sumar un criterio: "con un ajeno al 100 %, el sueldo que pediría del `BidBox`, el del informe de ojeo y el primer pedido del representante son el mismo número".

#### Recomendados

**A1. La barra de la bandeja que cambia de `fixed` a `static` según el foco mueve los botones entre el clic y su efecto** [ADVISORY]
- Qué está mal: con el foco en el bloque Mejorar, la barra pasa a `position: static` al final del contenido, y vuelve a ser fija "al salir del bloque" (`bandeja.md` 5.2; `mercado.md:381`, `:1060` punto 8). Supongamos que el DT escribió un monto y hace clic en "Aceptar US$ X" o en "Retirar la oferta", que en ese momento están en la barra estática. El `mousedown` mueve el foco fuera del bloque, la barra salta abajo de la pantalla y el `mouseup` cae sobre otro elemento: el clic se pierde, o cae en lo que quedó debajo del puntero. Pasa con mouse en una ventana de 761 a 900 px, y con lectores de pantalla que activan con un foco previo. Al cerrarse el teclado virtual también se mueve la página. El criterio (`bandeja.md` 14; `mercado.md:1017`) solo mira el estado con el foco adentro, no la transición.
- Cómo arreglarlo: que la barra siga estática mientras el foco esté en el bloque Mejorar **o en la propia barra**, y que vuelva a ser fija recién cuando el foco salga de los dos (o al terminar de desplazar). Sumar un criterio: "con el foco en el campo Mejorar, clic y toque en 'Aceptar US$ X' y en 'Retirar la oferta' ejecutan esa acción a 820 × 1000 y a 390 × 844". Anotar la variante en F1, en la pregunta 15.

**A2. Las ofertas por tus jugadores que se borran sin decisión del DT no tienen registro ni regla de leído** [ADVISORY]
- Qué está mal: `doTransfer` borra todas las ofertas por el jugador que se va (`career.ts:312`): las otras ofertas cuando se acepta una ("si aceptás una, la otra se cancela", `:400`) y todas cuando la IA paga la cláusula. `removePlayer` hace lo mismo (`:330`). E2 solo registra el cierre en `acceptOffer`, `rejectOffer`, `haggle` y `marketTick` (`:609`), y `readDecisionNews` solo marca la clave resuelta. El mensaje de la otra oferta ("Oferta de Boca por J. Pérez", sin abrir) queda como el más nuevo de una clave que ya no es pendiente. Pasa a contar como sin leer y, sin registro en `g.deals`, la bandeja no puede decir qué le pasó (F2 "distinguir venció de respondida sale del registro", `:466`). La tabla de estados del lado venta (`:491-495`) no tiene ese caso.
- Cómo arreglarlo: un estado del lado venta para "Se canceló: vendiste a {jugador} a {club}" (y "pagó la cláusula"), escrito por `doTransfer` y `removePlayer`. Como la F6 de la venta ya nombró la otra oferta, sus mensajes se marcan leídos en la misma llamada (regla 3, `:711`). Sumar un criterio con dos ofertas por el mismo jugador.

**A3. El criterio de la línea 958 espera N − 1 para acciones que dejan la decisión abierta** [ADVISORY]
- Qué está mal: "firmar desde Tratos deja la insignia en N − 1…; **lo mismo** con Aceptar US$ X… y con Aceptar, Pedir más…". Pero "Aceptar US$ X" deja el mismo `deal<id>` pendiente como acuerdo (`:702`, "cuenta 1, no 2"), y un "Pedir más" que sale bien deja el `offer<id>` pendiente. Lo correcto es N. Un tester marcaría falla sobre el comportamiento correcto. El criterio de la bandeja lo dice bien ("no sube la insignia"). Además, la salida "Aceptar la contraoferta → estado 'Resuelto'" (`:142`) choca con `:561` y con `bandeja.md` 4 ("no pasa a 'Resuelto', pasa a… 'Acuerdo para cerrar'").
- Cómo arreglarlo: "…deja la insignia en N − 1 al firmar, retirar, cancelar, mejorar, aceptar o rechazar una oferta; en N al aceptar el pedido o al pedir más con éxito; nunca en N + 1". Corregir la fila `:142`.

**A4. `clubAnswer` tiene que decir que no hereda el control del tope de `evaluateBid`** [ADVISORY]
- Qué está mal: `clubAnswer` es "la lógica de hoy de `evaluateBid` sin los controles inmediatos" (`:653`). El control del tope (`career.ts:274`: "Pide US$ {sueldo exacto} por mes y supera tu tope salarial") no es un control inmediato (`:652`), así que una lectura literal lo deja adentro. Si queda, el rechazo del club dice el sueldo exacto (la fuga de N2 y de la pregunta 9) y rechaza por el sueldo real, cuando la regla es que el tope se controla al firmar (`:442`). La lista que sigue no lo nombra, pero tampoco lo excluye.
- Cómo arreglarlo: "`clubAnswer` no mira el tope salarial ni el presupuesto (los controla `signDeal`)" en `:653` y en la fila de E12.

**A5. El balance de la temporada parte de una premisa falsa: `Ledger.wages` ya incluye los gastos de funcionamiento y las primas de renovación** [ADVISORY]
- Qué está mal: E20 dice que `Ledger` "no los guarda" (`:623`), y el componente agrega "sin contar los gastos de funcionamiento" (`:392`). En el motor, `dailyFinances` suma los gastos en `ledger.wages` (`career.ts:53`: `wages += w + ops`, con `ops = rep² × 15` por mes), `applyRenewal` suma la prima de renovación también en `wages` (`squad.ts:318`) y la prima de un fichaje va a `buys` (`career.ts:306`). La fila "Sueldos" mostraría sueldos más gastos más primas, y la aclaración sería falsa: el resultado ya los descuenta.
- Cómo arreglarlo: o separar `Ledger` en `wages`, `costs` y `bonus` (E20 deja de ser opcional para que las filas digan lo que dicen), o rotular la fila "Sueldos y gastos de funcionamiento" y sacar la aclaración. Corregir la fila de datos (`:693`).

**A6. La paciencia se muestra antes de que exista** [ADVISORY]
- Qué está mal: `deal.neg` nace en `openNegotiation` (`:736`). Aun así, la tarjeta de Para cerrar y el `BidBox` acordado muestran "Paciencia del representante: media" con el botón "Negociar contrato", antes de cualquier ronda (`:240-243`, `:278`, plantilla `:403`, `bandeja.md` 5.3). La fila de datos (`:678`) no dice qué se muestra sin `deal.neg`. Mostrarla antes de sentarse también adelanta la fuga aceptada (d), que el usuario aceptó como "lo que un DT percibe **en la mesa**".
- Cómo arreglarlo: sin `deal.neg`, omitir la línea o decir "La vas a conocer al sentarte a negociar". Corregir los wireframes y las dos plantillas.

**A7. Tratos podados por el tope de 60 sin manejo de nulos** [ADVISORY]
- Qué está mal: `g.deals` poda primero los terminales más viejos (`:603`), pero los mensajes `act: 'deal'` duran más (`news` guarda hasta 400 del DT). Un mensaje cuyo trato se podó no tiene estado para el texto F2 (`:718`, `bandeja.md` "Mensaje de un trato…"), ni destino para "Ver todos los tratos" (`:125`), ni forma de saber si hay "trato nuevo". Con el lado venta registrado también, 60 se llena en una o dos temporadas.
- Cómo arreglarlo: texto de respaldo ("Este trato ya no figura en el historial.") con solo "Ver la ficha", y no podar tratos con `blockUntil` vigente.

**A8. La premisa de la fuga aceptada en el préstamo y en la mesa es falsa: cancelar es gratis** [ADVISORY]
- Qué está mal: la pregunta 9 justifica mostrar exacto lo que pide el representante y el sueldo del préstamo porque "solo existen después de que el club aceptó, o sea, cuando el DT ya se comprometió con el pase" (`:1049`, puntos (3) y (4)). Pero "Cancelar el trato" no tiene costo, ni F6, ni bloqueo (`:568`). Pedir un préstamo con un cargo cualquiera, esperar de 1 a 3 días, abrir "Confirmar el préstamo" (la F6 dice el sueldo exacto, que en un jugador de la IA es `valuation(ca)`) y cancelar da el `ca` exacto de cualquier jugador que se pueda pedir a préstamo, sin ojearlo.
- Cómo arreglarlo: volver a mostrarle al usuario la fuga con la premisa corregida, o ponerle un costo a cancelar un acuerdo (por ejemplo, el club no acepta otra oferta por ese jugador durante 14 días, como tras una ruptura), o mostrar el sueldo del préstamo como `wageShown` también en la F6.

**A9. La etiqueta "Trato" de la fila `act: 'deal'` no existe en la bandeja** [ADVISORY]
- Qué está mal: la tabla D de la spec pone el chip "Trato" en los mensajes de trato que no son la decisión vigente (`:718`). El componente "Chip de acción en la fila" de `bandeja.md` 5.3 solo tiene "Para decidir", "Ver informe" e "Informe". Es la única diferencia de texto entre las dos specs en la fila.
- Cómo arreglarlo: sumar "Trato" al chip de la bandeja (y a F2 en la pregunta 15), o sacarlo de la tabla D.

**A10. Cifras y textos que no cierran** [ADVISORY]
- Ventana de negociación: "Sueldos/mes 410 mil → 418 mil · tope 480 mil" y debajo "! Con este sueldo superás el tope por US$ 3 mil" (`:335-336`).
- `BidBox` y Tratos: "Ofertaste… el 11 ene. Responde entre el 12 y el 14 ene" y "Acordado con Lanús · vence el 18 ene" (`:229-230`, `:238`). Con 7 días desde la respuesta, el plazo más temprano es el 19.
- La demora es `hash(deal.id, g.seed)` en `:653` y en la pregunta 2 (g), y `hash(deal.id · 31 + round, g.seed)` en `:733`.
- El anillo `--sel` dice "≥ 5,09" (`:832`). `tools/check-contrast.mjs` mide 4,96 sobre `--panel2` y 4,97 sobre la fila elegida: pasa 3:1, pero el número está mal.
- `Game.version`: E2, la pregunta 1 y la pregunta 36 dicen tres cosas distintas (ver el issue 18 arriba).

---

### GDD Alignment: GAPS FOUND

- **`mercado-de-pases.md` UI Requirements: 10 de 10 cubiertos**, con los cambios que respaldan decisiones del usuario. Las contradicciones con Core Rules (préstamo con F6, tope de 5, lo comprometido, protección del acuerdo) ya tienen decisión del usuario (preguntas 21 y 22) y quedan para el GDD en la pregunta 16 (no bloquea). Tabla "Lo que el mercado manda a la bandeja": cubierta, incluidos "Pase caído con el representante" (ahora con `act: 'deal'`, `ref` y `pid`) y la renovación rota (`renewWalk`). Edge Cases: "Ofertas abiertas al cambiar de club" aplicado a `g.deals` (resuelto), "La ventana cierra con ofertas abiertas" (resuelto), "Renovar a un jugador a préstamo" (resuelto). **Hueco**: "Dos clubes ofertan por el mismo jugador: aceptar una borra las demás" no tiene registro ni regla de leído (A2).
- **Fórmulas del GDD contra la spec** ("Pedido del representante", "Puntaje de una oferta al representante"): la spec cambia `demand` (E16) pero no `evalOffer`, que sigue usando la ambición (N1). Y toma el "Pedido de sueldo para el control de tope" (`wageDemand`) como si fuera el "Pedido del representante" (`demand`), que son dos fórmulas distintas del mismo GDD (N2).
- **`ojeo.md`**: la "Regla para pantallas nuevas" se cumple en valoración, atributos y sueldos. Su actualización está anotada (pregunta 16). Las vías que quedan son N1 y A8.
- **`economia-y-dirigencia.md`**: el balance está especificado, pero con rubros que no coinciden con lo que guarda el motor (A5).
- **`plantel.md`**: cubierto con el enlace a Plantel (pregunta 32, con dueño).
- **`comunicacion-y-bandeja.md`**: UR-02 ("una decisión, una vez") se cumple ahora también después de resolver, salvo por las ofertas borradas por `doTransfer` (A2). UR-22 (leído solo a propósito) se cumple. La fila `deal` de la tabla D está escrita. UR-33 se unifica en la pregunta 16.
- **Bandeja contra Mercado** (lo que pidió esta pasada):
  - Claves `deal<id>` y `offer<id>`: iguales.
  - Conteo (pendiente una vez y solo el mensaje más nuevo por clave, con el vencimiento que reemplaza al de la decisión y `act: 'offer'` en el vencimiento): igual en `mercado.md` 8 y `bandeja.md` 6 y 8.
  - Regla de leído (elegir no marca, resolver marca con `readDecisionNews` y lo que el DT vio nace leído, con `acceptJob` leído y `takeJob` sin leer): igual.
  - Freno (`decisionKeys` con `deal` al llegar y al volver de una mejora, `expiringKeys` el último día también en el cierre del libro, avisos de cierre sin freno): igual, y coherente con `inbox.ts` (`decisionKeys` toma lo nuevo solo; `expiringKeys` hay que ampliarlo, como está anotado).
  - Barra angosta: igual, con A1.
  - F6 del trabajo (`jobConsequences.deals` con la forma `{ pid, name, clubName, state }`, que se agrega a la forma real de hoy, y la regla de "nombra 3 y dice y N más"): igual.
  - Solo difieren la etiqueta "Trato" (A9) y el número de sueldo pedido del informe de ojeo (N2).
- **`player-journey.md`**: la fase 6 (cambio de club a mitad del libro) quedó cubierta.

---

### Accessibility: GAPS

- Target tier: **Estándar** (comprometido).
- Cumple:
  - Orden de foco escrito en Buscar, Tratos, el celular y la negociación.
  - Tabla con una sola parada de Tab y oyente local.
  - Ningún atajo de una tecla nuevo.
  - Espacio con significado propio sobre la fila, explicado donde se aprende.
  - F6 en todo lo irreversible: venta, rechazo, fichaje, préstamo y trabajo, este último con los tratos que se caen nombrados.
  - Motivos de deshabilitado escritos y con `aria-describedby`.
  - Daltonismo cubierto con texto, ícono o forma.
  - Paciencia en palabra.
  - Reserva de foco arriba y abajo (2.4.11).
  - Nada por debajo de 12 px.
  - Contrastes medidos. `check-contrast.mjs` sin fallas; las cifras de `--accent-hi` y de la fila elegida no las cubre el script, y este revisor no las volvió a medir.
  - Criterios de `elementFromPoint` también para el detalle de la bandeja.
- Huecos:
  - (a) La barra que cambia de posición con el foco puede perder el clic o mandarlo a otro control (A1). Es de accesibilidad de puntero y de foco: hay que cubrirla con un criterio.
  - (b) La cifra del anillo `--sel` no coincide con la medición (A10). Pasa igual.

### Pattern Library: INCONSISTENCIES FOUND (anotadas con dueño, no bloquean)

- La pregunta 15 ya lista los cambios a F1, D1, F2, F3, F4 y F6 que pidió la primera revisión (dueño: ux-designer). Quedan afuera dos variantes nuevas de esta revisión: la barra fija de F1 que pasa a estática con el foco en un campo (`bandeja.md` 5.2; ver A1) y el chip "Trato" de F2 (A9). Sumarlas a la pregunta 15.

### Verdict: NEEDS REVISION
**Blocking issues**: 2 — se resuelven antes de implementar:
1. N1: la contraoferta del representante (`evalOffer`) despeja la ambición. Es el resto del issue 4 y contradice la decisión del usuario de la pregunta 9 y el criterio `:944`.
2. N2: el "sueldo que pediría" sale de `wageDemand` y el representante pide con `demand`. El "exacto desde 95 %" y el "entra / no entra" del tope salen mal, y el número no coincide con el del informe de ojeo de la bandeja.

**Advisory issues**: 10 — recomendados, no bloquean (A1 a A10).
**Dimensions not assessed**: 0 — las cuatro dimensiones tenían con qué compararse.

Resolver los 2 bloqueantes y volver a correr `/ux-review`.

Los dos bloqueantes son de motor, no de pantalla: se arreglan en E16 (sumar `evalOffer`) y en la fila de datos del "sueldo que pediría" (usar `demand`). Ninguno obliga a cambiar el diseño de las pantallas. N1 puede terminar en una fuga más que el usuario acepte; en ese caso, anotarla en la pregunta 9 y reescribir el criterio `:944` alcanza. De los recomendados, conviene resolver A1, A2 y A3 en la misma pasada por la bandeja, porque tocan la barra angosta, el conteo y un criterio que hoy fallaría sobre el comportamiento correcto.
