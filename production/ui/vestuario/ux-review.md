## UX Review: Vestuario (`LockerPage`, `TalkModal`, `LockerCard`)
**Date**: 2026-11-15
**Reviewer**: ux-review skill (revisión independiente; no escribí la spec)
**Document**: `design/ux/vestuario.md` (rama `vestuario-ui`)
**Checklist**: 3A (línea `> **Template**: UX Spec`)
**Platform Target**: Web; teclado y mouse primero, toque parcial, sin gamepad (`project.yaml`: `targets: [Web]`, `primary_input: Keyboard & Mouse`, `touch_support: Partial`, `gamepad_support: None`). Coincide con el encabezado.
**Accessibility Tier**: Estándar, comprometido en `design/accessibility-requirements.md` (WCAG 2.1 AA, más 2.5.8 y 2.4.11; AV-04: 12 px para texto secundario y celdas).

**Reglas de esta pasada.** Lo que la sección 15 marca "Resuelto (usuario)" o "decidido por el orquestador" vale por encima del GDD. No cuentan como bloqueantes, por estar anotados con dueño: los cambios a los GDD y a `bandeja.md` (pregunta 19), a la biblioteca de patrones (pregunta 20) y a `Gauge`/`Modal` (pregunta 21). Contrasté cada requisito del motor (R1-R12) con el código actual: `src/engine/squad.ts`, `inbox.ts`, `game.ts` (`decisionKeyOf`, `readDecisionNews`), `career.ts` (`marketTick`, `askingPrice`, `doTransfer`, `applyRenewal`), y la interfaz que se reemplaza (`Locker.tsx`, `PlayerPage.tsx`, `PlayerTable.tsx`, `Home.tsx`, `common.tsx`, `styles.css`).

---

### Completeness: 15/15 secciones presentes

- [x] Encabezado con Status, Author, Platform Target (y Template, Tier, GDD, specs relacionadas)
- [x] Purpose & Player Need — desde el DT ("¿a quién tengo que atender esta semana y por qué?")
- [x] Player Context on Arrival — cinco llegadas concretas
- [x] Navigation Position — jerarquía y tabla "Dónde vive cada cosa"
- [x] Entry & Exit Points — tablas completas, con reemplazo/apilado
- [x] Layout Specification — wireframes de escritorio, celular, ventana y caso "charla usada"; zonas; inventario
- [x] States & Variants — carga (no aplica, justificado), vacío, error al guardar, partida vieja, avance en curso
- [x] Interaction Map — teclado, mouse y toque
- [x] Data Requirements — fuente y dueño por dato; R1-R12
- [x] Events Fired — cada acción con su función o "ninguno"
- [x] Transitions & Animations — entrada, salida, ventana, movimiento reducido
- [x] Input Method Completeness Checklist — teclado, mouse, toque; gamepad fuera de alcance
- [x] Accessibility — contraste, daltonismo, orden de foco, devolución del foco, anuncios
- [x] Localization — largos máximos por texto
- [x] Acceptance Criteria — más de 60, con rendimiento y resoluciones

La spec está completa y casi todas las lecciones de la bandeja y del Mercado están incorporadas desde el diseño. Los problemas son de **coherencia con el motor** y de **bordes de flujo**, no de estructura.

---

### Quality Issues: 22 encontrados (9 bloqueantes, 13 recomendados)

#### Bloqueantes

1. **Las palabras de la personalidad no esconden los números: la respuesta de la charla y el detalle del jugador permiten despejarlos** [BLOCKING]
   - Qué está mal: la pregunta 1 (usuario) decidió "una palabra por rasgo, nunca números". Pero R2 muestra conformidad y moral antes → después con su número exacto, y el motor aplica deltas que dependen del rasgo:
     - Bajarle el rol: `mh(-12 - (q.amb - 10))` (`squad.ts:211`) = −2 − ambición. "Conformidad 50 → 36" dice **ambición 12, exacta**, con una sola charla. La moral (`−6 − (temp − 10)·0,4`) da el temperamento casi exacto.
     - Después de cada partido, la `LockerCard` muestra los minutos de los últimos 6 partidos, el umbral y la conformidad con número: la caída es `déficit × 22 × tol × (1 + (amb − 10)·0,05) × (1 − (loy − 10)·0,04)` (`squad.ts:93`), así que dos partidos seguidos dan el producto ambición·lealtad; con la ambición de la charla, sale la lealtad. La moral del molesto baja `1,5 + (temp − 10)·0,12` (`squad.ts:95`): con la moral exacta en pantalla, sale el temperamento.
     - "Qué la mueve" cuenta "temperamentales disconformes" con el corte 15 del motor (`squad.ts:168`) mientras la palabra "Temperamental" empieza en 14: un disconforme que la ficha llama "Temperamental" y que no figura en el término tiene **exactamente 14**. Es la pregunta 23, que sigue **Abierta** con plazo "antes de implementar".
     - La columna `pers` de la tabla no dice cómo ordena: si ordena por el valor real, el orden dentro de una banda revela los números (para los propios, contra la pregunta 1; para los ajenos al 60-99 %, contra la regla de D1 "no ordenar por el valor real de lo que el ojeo no conoce").
   - Dónde: sección 8 (R2, `persTraits`, `harmony.parts`), 5.3 (`TalkModal` punto 6, `LockerCard` punto 2, columna `pers`), pregunta 23.
   - Cómo arreglarlo: (a) volver a preguntarle al usuario con la fuga a la vista, como se hizo en el Mercado (`ux-review-2.md`, N1): o acepta que la conformidad y la moral exactas delatan los rasgos (y se anota en la pregunta 1), o la respuesta de las charlas cuyo efecto depende de un rasgo dice el cambio en palabras ("bajó mucho") y no la cifra; (b) cerrar la pregunta 23 (la recomendación de bajar la armonía a 14 resuelve el término); (c) `pers` ordena por banda (palabra), nunca por el valor, y para un ajeno al 60-99 % no ordena por los rasgos que no ve.

2. **R1 no alcanza para que el pedido de salida cuente una vez: `pendingKeyOf` lo desliga y hay cinco caminos que lo resuelven sin marcar leído** [BLOCKING]
   - Qué está mal:
     - Con R1, `decisionKeyOf` devuelve `out<pid>`, y `pendingKeyOf(g, n)` entra a la rama `dk && game`, cuyo chequeo de "decisión abierta" solo conoce ofertas y tratos (`inbox.ts:76`: si no es `offer`, busca un `Deal` con `msg.ref`, que el mensaje `out` no tiene). Devuelve `null` y `unreadOf` cuenta el mensaje como sin leer **mientras el pendiente también cuenta**: la insignia sube 2, no 1. El criterio "la insignia de la bandeja sube 1 (no 2)" fallaría con R1 tal como está escrito. Además `decisionKeyOf` hoy sale con `null` si `ref == null` (`game.ts:270`): hay que reescribirla, no "sumarle" un caso.
     - Resuelven el pedido sin pasar por `talk` ni `setListed`: `applyRenewal` (`squad.ts:375`, `wantsOut = false`, acción del DT), la venta (`doTransfer`, `career.ts:322`), la acción masiva "Declarar transferibles" de `ownBulk` (`PlayerTable.tsx:377`, escribe `p.listed = true` a mano) y "Quitar de transferibles" (reabre el pedido). Ninguno llama a `readDecisionNews('out<pid>')`: el "X quiere irse" vuelve a contar como sin leer. El criterio de "la pantalla no escribe en `g`" atraparía `ownBulk`, pero ningún requisito dice que pase a `setListed`.
     - El cambio de temporada pone `p.listed = false` a todos (`game.ts:803`): un "quiere irse · transferible" vuelve a ser pendiente con su mensaje viejo ya leído y frena "Ir al partido" como decisión nueva. La spec no lo trata.
   - Dónde: sección 8 ("Conteo y regla de leído", R1), sección 14 ("Una decisión, una vez").
   - Cómo arreglarlo: R1 suma (1) el chequeo de abierto para `out`: `players[pid]` propio con `wantsOut && !listed`; (2) `readDecisionNews('out<pid>')` dentro de `applyRenewal`, `doTransfer` (si el jugador era del DT) y `setListed`, y `ownBulk` llama a `setListed`; (3) una regla para el cambio de temporada (que no borre `listed` a quien quiere irse, o que el pendiente reaparecido tenga mensaje nuevo). Criterios para cada camino.

3. **"En baja" y la tendencia "baja" no siguen la regla del motor: marcan a todas las Promesas sin minutos con algo que no pasa** [BLOCKING]
   - Qué está mal: la condición de rango 4 es `happy ≥ 35`, 3 partidos y minutos debajo de `share × 0,85`, y `moodOutlook.trend` es `baja` con la misma cuenta. El motor multiplica la caída por `tol` (`squad.ts:92`): Promesa 0 (salvo ambición ≥ 15 y 20 años o más), Suplente 0,5. Una Promesa con 0 minutos en 3 partidos (umbral 6,8 %) entra en "En baja" con "Su conformidad baja después de cada partido en que no juegue más" y "↓ baja tras cada partido", y su conformidad no se mueve. Con 6 juveniles (el wireframe), la lista "Para atender" se llena de falsas alarmas, contra el Pilar 3 y el criterio de feel de `plantel.md` ("puede explicar por qué mirando solo la fila"). "Puede pedir irse en cualquier momento" tampoco es así: es después de un partido, con 50 % por semana.
   - Dónde: 5.3, tabla "Motivos" (rangos 3 y 4); sección 8 (`moodOutlook`, `minutesOf`, `attentionOf`).
   - Cómo arreglarlo: que `minutesOf` exponga el delta del próximo partido con la misma función que usa `afterUserMatch` (déficit, `tol`, ambición, lealtad) y que "En baja" y `trend` dependan de que ese delta sea negativo; "Puede pedir irse después del próximo partido". Criterio: una Promesa con 0 minutos y ambición 10 no aparece en "Para atender".

4. **`letGoInfo` muestra como exactas cifras que el motor no cumple: las ofertas solo llegan con el libro abierto y el 25 % menos vale para un solo camino** [BLOCKING]
   - Qué está mal: el texto `lk-letgo` y la consecuencia de rango 1 dicen "Con los dos llegan más ofertas (la chance diaria pasa del 5 % al 12 %) y se pide un 25 % menos por él" y "Si no le respondés, siguen llegando ofertas por él". Pero `marketTick` corta con el libro cerrado (`career.ts:396`): la mayor parte del año no llega ninguna. El factor 0,75 está en `askingPrice` (`career.ts:287`), que usa el camino del club que busca reforzar un puesto; el camino del interés por transferibles (`career.ts:461`) ofrece `valor × (0,7 a 1,1)` sin mirar `listed`. Es la comparación que el usuario pidió para "elegir sabiendo" (pregunta 5): con cifras falsas, elige mal.
   - Dónde: 5.3 (`lk-letgo`, tabla "Motivos" rango 1), sección 8 (`letGoInfo`).
   - Cómo arreglarlo: `letGoInfo` suma `window: { open, opens? }` y la pantalla dice "con el libro abierto (abre el {fecha})"; la frase del precio se reescribe con lo que hace el motor ("algunos clubes ofertan un 25 % menos") o se saca. Criterio con el libro cerrado.

5. **R3 pide que `talkOptions` decida qué charla se muestra, cuál se deshabilita y por qué, pero la spec no dice la regla de ninguna** [BLOCKING]
   - Qué está mal: hoy la disponibilidad está en `Locker.tsx` (prometer: conformidad < 60 o quiere irse, sin promesa; paciencia: conformidad < 60; "puede buscar club": no transferible; "no se va": quiere irse). La spec dice que `TalkModal` deja de mirar esas condiciones, da dos ejemplos ("no se va" sin pedido no se muestra; "Ya tiene una promesa" deshabilitada) y nada más: no dice si el corte 60 sigue, si prometer y paciencia aparecen para un "En baja" con conformidad 70 (la fila le ofrece "Hablar" justamente por eso) ni qué pasa con "puede buscar club" si ya es transferible ("deshabilitada" en 5.3 punto 3 y punto 7.3, pero hoy se oculta). El defecto (3) que la spec diagnostica ("las opciones que no aplican desaparecen sin decir por qué") queda sin regla que lo corrija, y ningún criterio lo puede comprobar.
   - Dónde: 5.3 (`TalkModal` punto 3), sección 8 (`talkOptions`, R3), sección 14.
   - Cómo arreglarlo: una tabla por opción (oculta / deshabilitada con motivo / disponible) con la condición del motor, y cómo se ordena para cada motivo de "Para atender" (incluidos "En baja", "Promesa en riesgo" y "Referente que resta"). Criterio por fila de esa tabla.

6. **Armar la reserva no tiene un flujo posible: el botón lleva a un filtro que esconde a los candidatos, y la tabla ya no tiene el alternable** [BLOCKING]
   - Qué está mal: "Armar la reserva" pone el filtro En la reserva (7.2); la misma fila dice que "si nadie está anotado, el filtro muestra a todos con la columna Reserva primero" y la sección 6 dice que con nadie anotado el filtro muestra el estado vacío "Nadie anotado… Marcalos en la tabla". Son dos comportamientos opuestos. Y con anotados, el filtro muestra solo a los que ya están: no se puede sumar a nadie desde ahí. La columna `res` pasa a ser texto ("Sí" / "—"), sin el botón que hoy tiene la tabla (`Locker.tsx:46`): por debajo de 1180 px (sin panel) solo queda marcar casillas y usar la barra masiva, o entrar a cada ficha. "Armar la reserva del miércoles" es el cuarto objetivo de la sección 2; el GDD pide la reserva en la tabla y no hay decisión que la saque.
   - Dónde: 5.3 (Estado de la reserva, columna `res`), 6 (Filtro vacío), 7.2 ("Armar la reserva").
   - Cómo arreglarlo: decidir un solo flujo. Por ejemplo: "Armar la reserva" deja "Todo el plantel" ordenado por la columna Reserva y con `res` como alternable (`aria-pressed`, 44 px en celular, `setReserve`), y el chip En la reserva sirve para revisar. Sacar la contradicción de 7.2 y 6, y un criterio para anotar a alguien a 390 × 844.

7. **El foco se pierde al cerrar la charla abierta desde la banda de la ficha y al declarar transferible desde la ventana** [BLOCKING]
   - Qué está mal: la banda de la ficha tiene "Hablar" en **todas** las pestañas (`PlayerPage.tsx:74`). La regla de la sección 12 manda el foco, "en el panel o la ficha, al título de la sección Charla de la `LockerCard`", que solo existe en la pestaña Vestuario; el botón de la banda queda deshabilitado ("Hablar desde el 19 nov"). Desde Resumen, Contrato o Estadísticas el foco no tiene destino y cae en `body` (lección g). Igual en el estado "Ya hablaron" de la ventana: "Declararlo transferible" cierra la ventana y "muestra la nota F7 en la pantalla de origen", pero la regla del foco dice "la nota F7 en el mismo lugar", que es la ventana cerrada.
   - Dónde: sección 12 ("Devolución del foco al cerrar la charla"), 5.3 (`TalkModal` punto 7), 6 ("Charla ya usada").
   - Cómo arreglarlo: para la banda, el foco va al texto que reemplaza al botón (`tabindex="-1"`, "Hablaron hoy · de nuevo desde el 22 nov") o a un control habilitado de la banda; para el estado 7, decir qué nota F7 aparece en cada origen (fila, panel, ficha, banda) y que el foco va a ella. Criterio: abrir la charla desde la banda en Resumen, hablar, cerrar y comprobar `document.activeElement`.

8. **El prefijo `lk-` ya está tomado por las claves de leyenda de los gráficos** [BLOCKING]
   - Qué está mal: la spec dice que todo lo nuevo lleva `lk-` para no chocar con clases globales (lección a), pero `styles.css:230-231` ya define `.lk-line`, `.lk-tick` y `.lk-box` (leyendas de `charts.tsx`). La spec pide "una marca en el umbral" de la barra de minutos y varias "líneas" (estado de la reserva, línea del Inicio): `.lk-tick` o `.lk-line` son los nombres obvios y heredarían 14 × 2 px `inline-block`. El criterio "todas con prefijo `lk-`" pasaría con la colisión adentro.
   - Dónde: supuestos (lección a), 5.2, 5.3, sección 14 ("Visibilidad de las acciones").
   - Cómo arreglarlo: otro prefijo sin uso (`vs-` o `vt-`; comprobar con una búsqueda en `styles.css`), o renombrar las leyendas a `chart-key-*`; el criterio pasa a ser "ninguna clase nueva coincide con una existente en `styles.css`".

9. **Al llegar desde "Hablar con él" con la charla usada, el foco va a "Declararlo transferible", un botón que decide sin confirmación** [BLOCKING]
   - Qué está mal: la sección 4 y "Primary focus element on open" mandan el foco a "Declararlo transferible" de la `LockerCard` cuando la charla ya se usó, también al llegar desde la bandeja. La biblioteca (agregado de la fase 5, "Foco al llegar a una lista de decisiones") lo prohíbe: "el foco va al título de la tarjeta elegida, nunca a un botón que decide". La acción resuelve `out<pid>` y no tiene F6: un Enter de más (el que navegó, repetido) la ejecuta.
   - Dónde: sección 4 (entrada desde la bandeja), 5.3 ("Primary focus element on open").
   - Cómo arreglarlo: el foco al título de la sección Charla (`tabindex="-1"`), con el botón como siguiente parada de Tab; criterio que lo compruebe.

#### Recomendados

10. **`harmony.parts` redondeado por término no suma el número de la armonía** [ADVISORY] — 5.3 "Qué la mueve", R5, criterio "suma el número". La armonía redondea la suma y la recorta a 0-100 (`squad.ts:168`); mostrar cada término redondeado puede dar 1 de diferencia (65,6 + 4,6 → 66 + 5 ≠ 70) y no cierra con valores fuera de 0-100. Arreglo: el motor da los términos ya redondeados con el resto en la base (o el recorte como término) y el criterio lo prueba con un caso de borde.

11. **Dos escalas para la moral y un componente de barra sin nombre** [ADVISORY] — sección 8 y R7. `moraleWord` corta en 80/60/35, pero la columna `mor`, la ficha breve (`Nav.tsx:128`) y la ficha siguen con `Cond` (colores 85/65). La conformidad deja `Cond` y no se dice qué barra la dibuja ni con qué colores. Arreglo: un componente (`MoodBar`) con los colores por banda de `moodOf`, otro igual para `moraleWord`, en todas las pantallas. Además el texto "…los cortes 65/35 de la bandeja y el `Gauge` no" está trunco.

12. **Chip "Molesto" contra "Muy molesto"** [ADVISORY] — tabla "Motivos" rango 3. Un jugador con 14 lleva el chip "Molesto" en la fila y "Muy molesto (14)" en la `LockerCard` y la tabla: dos palabras para el mismo estado en la misma pantalla. Arreglo: el chip usa `moodOf(happy).word`.

13. **El pedido de salida aparece dos veces en el mismo mosaico del Inicio, y "Para atender" nombra dos cosas** [ADVISORY] — 5.3 (línea "Vestuario"). El mosaico "Para atender" ya dice "Pendiente: … un jugador que quiere irse" (`pendingText`) y la línea nueva suma "1 quiere irse"; además el mosaico y la lista del Vestuario se llaman igual con contenidos distintos. Arreglo: la línea del Vestuario no repite los pedidos pendientes (o el pendiente no se repite), y decir si "quiere irse" cuenta también a los transferibles.

14. **Plazo de la promesa: `matchesLeft` no dice si cuenta el partido del día `until`** [ADVISORY] — sección 8, `promiseStatus`. `dailySquad` evalúa al empezar el día `until`, antes del partido de ese día: ese partido no cuenta. Arreglo: "partidos entre mañana y el día anterior a `until`" y el ejemplo del criterio con un partido ese día.

15. **La comparación con la charla usada ofrece una charla que no se puede usar** [ADVISORY] — 5.1 y 5.3 punto 6. Con la charla gastada, la `LockerCard` y la bandeja muestran `lk-letgo` completo ("…gasta la charla de esta semana"). Arreglo: en ese caso la línea de la charla dice "desde el 19 nov".

16. **La barra masiva (D2) es una barra fija con acciones y la reserva de foco apunta a otra barra** [ADVISORY] — 5.2 y sección 14. `.bulkbar` es `position: sticky; top: 0` dentro de `.main` (`styles.css:182`), con "A la reserva": es la barra fija que la lección (a) excluye, y es la que tapa las filas con foco, no la barra superior (que está fuera de `.main`). El criterio solo mira `position: fixed`. Arreglo: nombrar la excepción de D2 y usar `scroll-margin-top` igual al alto de `.bulkbar` en filas y botones (como D1 `onPick`).

17. **Botones del panel con desplazamiento propio y `elementFromPoint`** [ADVISORY] — sección 14. El panel tiene scroll propio: un botón abajo del panel no está en su centro hasta desplazarlo. Arreglo: el criterio hace `scrollIntoView` dentro del panel antes de medir.

18. **"Ver transferibles en Plantel" no está en el inventario ni en el orden de foco** [ADVISORY] — 7.2 lo pone en la fila "Quiere irse · transferible", pero 5.3 (fila) y la sección 12 (paso 4) solo conocen "Hablar" y "Declararlo transferible". Arreglo: sumarlo a las dos y al criterio de visibilidad.

19. **El texto del caso "ya hablaron" cambia según la sección** [ADVISORY] — fila: "Hablaron el 12 nov · de nuevo desde el 19 nov"; sección 12: "Hablaron hoy"; ventana: "Ya hablaste con él el 12 nov". Arreglo: un solo texto del motor (`outActions.note` o `talkState`) para fila, panel, tabla, banda y ventana, incluido el caso de hoy.

20. **El modo `onPick` de D1 se usa con otra conducta y sin marcarla como variante** [ADVISORY] — 7.1. D1 dice que Enter elige y lleva el foco al panel; acá "el foco se queda en la fila". Los chips de filtro cuentan totales ("Todo el plantel 30"), y C5 reserva el contador para lo sin leer. Arreglo: anotar las dos diferencias como variantes en la pregunta 20.

21. **Cuatro componentes nuevos no figuran en la pregunta 20** [ADVISORY] — la comparación `lk-letgo`, la barra de minutos con marca de umbral (tabla, panel, ventana), "Qué la mueve" y la `LockerCard`. La pregunta 20 solo lleva la fila con acción hermana y las opciones con regla. Arreglo: sumarlos para la biblioteca.

22. **Requisitos del GDD que se caen sin decisión** [ADVISORY] — `plantel.md` UI Requirements pide "Hablar" y la reserva en la tabla del Vestuario (la tabla nueva no tiene ninguna de las dos acciones: ver bloqueante 6), y el rasgo "Modelo de profesional" (`persLabels`, `squad.ts:40`) desaparece de las bandas de `persTraits` sin que la pregunta 1 lo diga. Arreglo: anotar las dos cosas en la sección 15 (y en la pregunta 19 para el GDD).

---

### GDD Alignment: GAPS FOUND

- `design/gdd/plantel.md` UI Requirements — 8/10 cubiertos. Armonía, título y referentes (con "Resta" en lugar de "Molesto" < 50, pregunta 11); disconformes (filas de "Para atender"); ventana de charla; pestaña Vestuario con rol, minutos, conformidad, promesa y Hablar; tarjeta "Felicidad" (escala única); rasgos de personalidad (con `persTraits`, preguntas 1 y 2); columnas Conformidad y Rol; acciones masivas de reserva; línea del Inicio; ayuda de pantalla. Tabla de mensajes y decisión `out`: cubiertas.
- Faltan: "Hablar" y el alternable de reserva en la tabla del Vestuario (sin decisión, ver 6 y 22); "Modelo de profesional" (22).
- Reglas del motor que la spec contradice o no sigue: `tol` (3), ventana de pases y factor de precio (4), conteo del pedido (2), disponibilidad de las charlas (5). La pregunta 16 (lealtad 13) está bien aplicada en `persTraits`, R9 y los criterios.
- `comunicacion-y-bandeja.md`: UR-02 y UR-22 se cumplirían con R1 corregido (2); UR-11 y UR-18 cubiertos.
- `mercado-de-pases.md`: el 12 % / 5 % coincide con la regla 80, pero el GDD también dice que es con el libro abierto (4).
- `prensa-e-informes.md` y `entrenamiento-y-cuerpo-tecnico.md`: sin requisitos de interfaz para esta pantalla; nada que los contradiga.
- `design/player-journey.md`: fases 3, 4 y 5 bien servidas ("Para atender" con causa y consecuencia, "Puede pedir irse" como señal previa, promesa en curso). La falsa alarma de 3 va contra "Momentos críticos" (un aviso que no se cumple es tan ilegible como un castigo sin aviso).

### Accessibility: GAPS

- Target tier: Estándar.
- Cumple en el diseño: orden de foco completo; Esc y foco atrapado; `aria-labelledby` en la ventana; `radiogroup` con nombre y `aria-describedby` por opción; motivos de deshabilitado visibles (AC-05); nada por debajo de 12 px; 44 px en celular para las acciones principales (supera AM-09); sin atajos nuevos y con el ajuste `singleKeys`; daltonismo con texto, número y forma en cada señal; movimiento reducido; contrastes con requisito y script.
- Falta: el foco se pierde en dos caminos (7); el foco al llegar cae en un botón que decide (9); la reserva de foco apunta a la barra equivocada y la barra masiva tapa filas (16).
- A cuidar al implementar: `Modal` hoy cierra con Esc siempre; la regla "Esc primero cancela la confirmación" pide interceptarlo. Las opciones deshabilitadas de un `radiogroup` no reciben foco: su motivo tiene que leerse también fuera de la opción (por ejemplo, como texto debajo del grupo).

### Pattern Library: INCONSISTENCIES FOUND

- Bien referenciados: N1-N9, I1, D1, D2, D6, F1, F4-F8, C1, C4, C5, O2, A2, con id. Los patrones nuevos (fila con acción hermana, opciones con regla y rasgo) están anotados en la pregunta 20.
- Choques: el foco de llegada contradice el agregado "Foco al llegar a una lista de decisiones" (9); D1 `onPick` con Enter distinto y C5 con contadores de totales sin marcarlos como variante (20); D2 como barra fija con acciones (16); componentes nuevos sin anotar (21).

### Verdict: NEEDS REVISION
**Blocking issues**: 9 — se resuelven antes de implementar:
1. Las bandas de personalidad no esconden los números (R2, deltas por partido, pregunta 23 abierta, orden de `pers`).
2. R1 no cubre `pendingKeyOf` ni los caminos que resuelven el pedido sin marcar leído (renovación, venta, `ownBulk`, cambio de temporada).
3. "En baja" y la tendencia ignoran `tol`: falsas alarmas con las Promesas.
4. `letGoInfo` ignora el libro cerrado y aplica el 25 % donde el motor no lo aplica.
5. `talkOptions` sin regla de qué se muestra, qué se deshabilita y por qué.
6. Flujo de la reserva contradictorio e imposible desde el filtro.
7. Foco perdido al cerrar la charla desde la banda de la ficha y desde el estado "Ya hablaron".
8. Prefijo `lk-` ya usado por las leyendas de los gráficos.
9. Foco de llegada en "Declararlo transferible".

**Advisory issues**: 13 — recomendados, no bloquean.
**Dimensions not assessed**: 0.

Address the 9 blocking issues above, then re-run `/ux-review`.

Cinco de los nueve (1 a 5) son de motor: se arreglan en la sección 8 sin rediseñar pantallas, contrastando cada función nueva con la regla que ya está en `squad.ts` y `career.ts`. El 1 necesita volver al usuario con la fuga a la vista, como pasó con el Mercado. El 6 es el único que cambia una pantalla (la tabla y el botón de la reserva). Los 7, 8 y 9 son de una línea cada uno. Conviene resolver 2, 4 y 15 en la misma pasada en que la pregunta 19 se lleve a `bandeja.md`, porque tocan la decisión `out<pid>` de las dos pantallas.
