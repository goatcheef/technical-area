## Verificación: Vestuario (`design/ux/vestuario.md`, revisión posterior a /ux-review)
**Fecha**: 2026-11-15
**Alcance**: verificación focalizada de los arreglos (no es una revisión completa, por decisión del usuario). Fuente de los problemas: `production/ui/vestuario/ux-review.md` (9 bloqueantes, 13 recomendados). Contrasté cada arreglo con el código actual de la rama `vestuario-ui`: `src/engine/inbox.ts`, `game.ts` (`decisionKeyOf`, `readDecisionNews`, `news`, `startNewSeason`), `squad.ts` (`afterUserMatch`, `harmony`, `talk`, `setListed`, `applyRenewal`, `demand`), `career.ts` (`askingPrice`, `doTransfer`, `sellAbroad`, `removePlayer`, `acceptOffer`, `marketTick`, `windowOpen`, `windowState`, `seasonTurnover`), `src/ui/Locker.tsx`, `PlayerTable.tsx`, `Inbox.tsx`, `src/styles.css`, y `design/ux/bandeja.md`.

### Veredicto: NO VERIFICADO

Siete de los nueve bloqueantes quedan resueltos y los trece recomendados tienen su arreglo. Quedan dos problemas bloqueantes, los dos de una línea:

- **N1**: la venta al exterior sigue resolviendo el pedido de salida sin marcar leído su mensaje. Es el bloqueante 2, que quedó a medias.
- **N2**: las prioridades de columna de la spec están al revés de las de `PlayerTable`. Hacen que el alternable de la reserva sea la primera columna que se oculta, así que el bloqueante 6 vuelve en pantallas angostas.

Con N1 y N2 corregidos, el veredicto pasa a VERIFICADO CON OBSERVACIONES sin otra pasada.

---

### 1. Los 9 bloqueantes

| # | Problema | Estado | Evidencia |
|---|---|---|---|
| 1 | Las palabras de la personalidad no esconden los números | **Resuelto** (decisión del usuario) | Fuga aceptada y detallada en la pregunta 1 (l. 833); `LockerCard` punto 3 (l. 344); orden de `pers` por banda y nombre, nunca por el valor, con regla para los ajenos al 60-99 % (l. 315, criterio l. 753); pregunta 23 cerrada (l. 855) con R13 y R14 (l. 577-578); los ajenos sin la excepción (l. 412). |
| 2 | `out<pid>` contaba dos veces y había caminos que lo resolvían sin marcar leído | **Parcial** | Lo que está bien, comparado con el motor: (a) `decisionKeyOf` reescrita para `out<pid>` sin `ref` (l. 544): hoy sale `null` (`game.ts:270`) y `pendingKeyOf` cae en la rama de la l. 81 de `inbox.ts`. Con R1 entra en la rama `dk && game`, y el chequeo de abierto nuevo (l. 545: propio, `wantsOut`, `!listed`) es la misma condición de `pendingAll` (`inbox.ts:30`). (b) Con eso, `unreadOf` (`inbox.ts:88-97`) salta los mensajes que no son los más nuevos, no cuenta el más nuevo mientras está abierto y lo cuenta una vez cuando se cierra: la cuenta da 1 en los casos pedido nuevo, reabierto, nueva temporada y cláusula. (c) `readDecisionNews` va en `talk` (`stay`, `promise`, `status` con subida, `free`: son exactamente los casos que ponen `wantsOut = false` o `listed = true` en `squad.ts:201-220`), en `setListed`, en `applyRenewal` (`squad.ts:375`, que solo llama `Locker.tsx:137`) y en `doTransfer` con `read`. `ownBulk` pasa por `setListed` (l. 316). La nueva temporada manda un mensaje propio (l. 548, sobre `game.ts:803`). **Lo que falta**: la venta al exterior (N1). |
| 3 | "En baja" y la tendencia no seguían `tol` | **Resuelto con observaciones** | `minutesOf.tol` y `nextDelta` con `moodDelta`, la misma función que `afterUserMatch` (l. 521, R12 l. 576). Las cifras coinciden con `squad.ts:88-94`: umbral × 0,85, `tol` 0 / 0,6 / 0,5 / 1, déficit × 22 × `tol` × ambición × lealtad, +2 o +4. "En baja" depende de `nextDelta < 0` (l. 334). `canAskOut` y el texto "después del próximo partido" (l. 522) coinciden con `squad.ts:97`. Hay criterio para la Promesa (l. 745). Quedan cuatro diferencias de borde con el motor (m3). |
| 4 | `letGoInfo` prometía ofertas con el libro cerrado y el 25 % en todos los caminos | **Resuelto con observaciones** | `window` y `price.scope: 'refuerzo'` (l. 538, R11 l. 575). El alcance coincide con el motor: el 0,75 vive solo en `askingPrice` (`career.ts:287`), que usa el camino de refuerzo (`career.ts:415-427`); el interés por transferibles ofrece entre 0,7 y 1,1 del valor sin mirar `listed` (`career.ts:461`); con el libro cerrado, `marketTick` corta (`career.ts:396`). Texto condicional en `vt-letgo` (l. 323), en el motivo de rango 1 (l. 330) y en el criterio (l. 768). Pero la fecha de reapertura es errónea (m1) y quedan textos que prometen ofertas sin condición (m2). |
| 5 | `talkOptions` sin regla | **Resuelto** | Tabla "Disponibilidad de las charlas" con oculta / deshabilitada / disponible / confirmación y su precedencia (l. 365-377), y tabla "Orden de las opciones" (l. 379-388). Cada fila es un caso de prueba (l. 377, criterio l. 754-755). Contra `Locker.tsx:65-72` (hoy): prometer `(happy < 60 \|\| wantsOut) && !promise`, paciencia `happy < 60`, "no se va" `wantsOut`, "buscar club" `!listed` con el motivo del préstamo, felicitar, exigir y el rol siempre. La tabla las conserva y solo cambia oculto por deshabilitado. Hay un detalle de redacción (m7). |
| 6 | La reserva no tenía un flujo posible | **Parcial (regresión)** | El flujo quedó coherente: modo "Armar la reserva" (l. 311, 435), filtro vacío sin contradicción (l. 436), 7.2 (l. 488), `tab: 'armar'` (l. 112), alternable con `aria-pressed` y 44 px (l. 315), criterio a 390 × 844 y 320 × 568 (l. 789). Es implementable: la tabla ya frena el clic de la fila en los controles internos (`PlayerTable.tsx:254-256`) y Espacio marca la fila (`PlayerTable.tsx:209`). **Pero** las prioridades de columna que fija la spec contradicen la convención de `PRIO`, y el alternable `res` queda como la primera columna que se oculta (N2). |
| 7 | El foco se perdía (banda de la ficha, "Ya hablaron") | **Resuelto** | Tabla de devolución del foco por origen (l. 682-690): fila, `LockerCard` y banda en cualquier pestaña. El destino de la banda es el texto de `talkState`, con `tabindex="-1"`. Un lugar de nota por origen: `vt-att-note`, `vt-card-note` y `vt-band-note` (l. 363, 484). "Nunca a `body`" (l. 690) y criterio con `document.activeElement` desde Resumen (l. 812). Hueco menor al entrar por debajo de 1180 px (m8). |
| 8 | El prefijo `lk-` estaba tomado | **Resuelto** | `grep` en `src/styles.css` (1142 líneas): no hay ninguna clase ni subcadena `vt`, ni selectores `[class*=…]`. Las `lk-*` siguen en las l. 230-231 y la spec las nombra como prohibidas (l. 22, 810). El criterio pasa a ser "ninguna clase nueva coincide con una existente". `@container vt-head` / `vt-card` son nombres de contenedor, no clases: no chocan. |
| 9 | El foco de llegada caía en "Declararlo transferible" | **Resuelto** | El foco va al `h3` "Charla", con `tabindex="-1"`, y el botón es la siguiente parada (l. 124, 213, 347, 390), con criterio (l. 782). Ninguna regla de foco de la spec cae en un botón que decide sin F6: "Hablar con él" abre la ventana; en ella, el foco va a la primera opción, a la respuesta o a "Listo" (l. 390). |

### 2. Fuga aceptada (pregunta 1) contra el motor

**Correcta en lo esencial. Sobreestima dos puntos y no oculta nada.**

- (1) Ambición exacta: `mh(-12 - (amb - 10))` (`squad.ts:211`) = −2 − ambición, entera. Como se mueve en un entero, la diferencia entre los dos valores redondeados es exacta aunque `happy` sea decimal. El tope en 0 está bien dicho.
- (2) "Temperamento casi exacto": no lo es. `mm(-6 - (temp - 10) * 0.4)` avanza de a 0,4 por punto y la moral se muestra entera, así que la diferencia visible es el piso o el techo de 2 + 0,4 × temp. Eso deja unos cinco valores posibles (±2), no "casi exacto". Sobreestima la fuga, que es la dirección segura.
- (3) `1.5 + (temp - 10) * 0.12` = 0,3 + 0,12 × temp (`squad.ts:95`), con conformidad < 35: correcto.
- (4) La fórmula de la caída es la de `squad.ts:93`: correcta, con `tol` y el déficit a la vista (minutos de los últimos 6).
- (5) El sueldo de la renovación usa 0,022 y 0,012 y la prima, 1 + ambición / 5 (`squad.ts:332-333`): correcto. Pero las cifras se redondean a US$ 100 y US$ 1000, no son "pesos exactos". El texto dice pesos y la moneda es US$.
- (6) y (7): correctos. La paciencia del representante (`amb >= 15`, `squad.ts:325`) coincide con la banda "Muy alta" y no suma nada.

### 3. Recomendados 10 a 22 (muestreo)

| # | Estado | Evidencia |
|---|---|---|
| 10 | Hecho | `parts` con `base = round(prom × 0,7 + 18 + lead) − lead` y `clip` (l. 516, R5 l. 569). La suma cierra: `round(X + lead − 3n) = round(X + lead) − 3n`, porque el término de los disconformes es múltiplo entero. Hay criterio con casos de borde (l. 743). |
| 11 | Hecho | `MoodBar` y `MoraleBar` (l. 317, 519-520), también en la ficha breve; el texto trunco quedó completo (l. 519). |
| 12 | Hecho | El chip usa `moodOf(happy).word` (l. 333, 338) y hay criterio (l. 747). |
| 13 | En parte, con justificación | La línea del Inicio no repite los pedidos (l. 324, 748); el nombre "Para atender" se conserva, con razones (pregunta 36). |
| 14 | Hecho | `matchesLeft` va hasta el día anterior a `until` (l. 525), como evalúa `dailySquad` (`squad.ts:110`), y hay criterio (l. 742). |
| 15 | Hecho | "(charla, desde el {fecha})" (l. 323, criterio l. 769). |
| 16 | Hecho | Excepción `.bulkbar` nombrada (l. 22, 299; `styles.css:182`) y `scroll-margin-top` (l. 299, criterio l. 809). |
| 17 | Hecho | `scrollIntoView` antes de medir (l. 808). |
| 18 | Hecho | Está en la fila (l. 313, 331), en el orden de foco (l. 674) y en el criterio (l. 808). |
| 19 | Hecho, con restos | `talkState` da un texto largo y uno corto (l. 528). La nota F7 de la l. 320 conserva el texto viejo (m2). |
| 20 | Hecho | Variantes de D1 y C5 (l. 461, 852). |
| 21 | Hecho | Pregunta 20 (l. 852). |
| 22 | Hecho | Pregunta 45 (l. 877). |

### 4. `bandeja.md` contra el Vestuario (decisión `out`)

| Aspecto | ¿Coinciden? | Evidencia |
|---|---|---|
| Acción principal con la charla usada | Sí | "Declararlo transferible" es el primario, con la nota de `outActions` y sin "Hablar" deshabilitado (`bandeja.md` l. 255, 643, 725 (1); vestuario l. 430, 556). A préstamo, sin acción, en las dos. |
| Conteo | Sí | `decisionKeyOf`, `newestOf` y el chequeo de abierto en `pendingKeyOf` (`bandeja.md` l. 408, 725 (2); vestuario l. 544-545). |
| Regla de leído | Sí, con el mismo hueco | La lista de caminos coincide (`bandeja.md` l. 725 (3); vestuario l. 546), y a las dos les falta la venta al exterior (N1). El criterio de `bandeja.md` l. 642 ("vendiéndolo al aceptar una oferta") ya exige el caso que R1 no especifica: una implementación que siga R1 al pie de la letra falla ese criterio. |
| Comparación | Sí | `vt-letgo` siempre visible, con el libro y la fecha (`bandeja.md` l. 255). Hereda la fecha errónea (m1). La nota F7 de `bandeja.md` l. 365 ("Las ofertas van a llegar a la bandeja.") no tiene la versión con el libro cerrado que pone el Vestuario (vestuario l. 484) (m2). |
| Foco | Diferencia aceptada, no reconciliada | El Vestuario nunca deja el foco en "Declararlo transferible" (pregunta 32). En la bandeja, Enter sobre la fila lleva el foco a ese primario sin F6 (`bandeja.md` l. 330 y 725 (5)), así que con dos Enter se decide. La bandeja lo justifica como un paso explícito y la acción es reversible, pero es el mismo riesgo del "Enter de más" que dio origen al bloqueante 9 (m5). |
| Jugador que ya no está | Textos distintos | El Vestuario dice "Ya no está en el plantel." (l. 547, 776) y la bandeja, para un jugador borrado (retiro o exterior: `removePlayer` hace `delete g.players`), "Ya no está en el fútbol argentino." (`bandeja.md` l. 266). Hay que decir cuál manda en un mensaje `out` (m5). |

### 5. Problemas nuevos

#### Bloqueantes

**N1. La venta al exterior no marca leído el pedido de salida.**
- **Dónde**: R1 (l. 546, 565), criterio l. 775 y `bandeja.md` l. 725 (3).
- **Qué pasa**: R1 pone `readDecisionNews('out<pid>')` en "`doTransfer` con `read`". Pero `acceptOffer` (`career.ts:364`), con una oferta del exterior (`o.from === 0`), llama `sellAbroad` → `removePlayer` (`career.ts:334-346`) y no pasa por `doTransfer`. Las ofertas del exterior por jugadores del DT son frecuentes (`career.ts:452-455`). El DT vende a un jugador que quería irse y el pendiente desaparece, pero el mensaje "X quiere irse" sigue sin leer y cuenta 1, con "Ya no está…": una decisión resuelta a propósito que vuelve a contar. Es el defecto del bloqueante 2 en un camino que la revisión no enumeró.
- **Arreglo**: llamar `readDecisionNews(g, 'out' + pid)` en `acceptOffer`, que es la decisión del DT y cubre los dos destinos, en lugar de en `doTransfer`. Sumar el criterio "venderlo al exterior".

**N2. Las prioridades de columna están invertidas respecto de `PRIO` y no pueden variar por vista.**
- **Dónde**: 5.3, fila "Tabla del plantel" (l. 315), contra l. 198 y la vista `reserva`.
- **Qué pasa**: en `PlayerTable.tsx:79-81,156`, "se ocultan primero las de número más bajo" (por ejemplo, `num: 1` se va primero y `pos: 10`, al final). La spec fija `mins 2`, `happy 2`, `role 3`, `pers 7`, `res 6`, `talk 6` y, en la vista Reserva, "`res` (prioridad 1: nunca se oculta)". Implementado así:
  - los minutos y la conformidad son lo primero que se oculta, mientras `pers` queda casi siempre. Eso contradice la l. 198 ("el nombre, el rol, los minutos y la conformidad nunca se ocultan");
  - en la vista Reserva, el alternable `res` desaparece antes que todo. A 320 px, el modo "Armar la reserva" vuelve a quedar sin alternable: es el bloqueante 6 otra vez, y el criterio l. 789 fallaría.
  
  Además, `PRIO` es una tabla por columna: `res` no puede tener 6 en una vista y 1 en otra sin un mecanismo nuevo, y la spec no lo pide (R4 l. 568 solo pide abrir con una vista y un orden dados).
- **Arreglo**: reescribir los números con la convención del código (números altos para `mins`, `happy` y `role`; uno bajo para `pers` y `talk`). Para la vista Reserva, o se sube `res` arriba de todo en general, o se pide en R4 una prioridad por vista.

#### Menores

- **m1. Fecha de reapertura errónea.** "Abre el 1 ene" (l. 267, 330, 323, 484, criterio l. 768). Desde el 11 de agosto, el libro reabre al empezar la temporada siguiente, el 10 ene (`windowState`, `career.ts:252-259`, `nextSeason: true`; `startNewSeason` salta al 10 ene, `game.ts:799`). Entre el 21 feb y el 24 jun reabre el 25 jun. `letGoInfo.window.opens` debería salir de `windowState().opensOn` (y decir "al comenzar la temporada 2027" cuando `nextSeason`), no de "la próxima fecha en que `windowOpen` es verdadero", que daría el 1 ene. El criterio l. 768 fija el valor equivocado.
- **m2. Textos que siguen prometiendo ofertas sin mirar el libro.**
  - El wireframe de escritorio, fechado el 14 nov, dice "Si no le respondés, siguen llegando ofertas" (l. 172-174), y la pregunta 13 repite esa frase (l. 845).
  - La nota F7 del inventario (l. 320) y la de `bandeja.md` l. 365 dicen "Las ofertas van a llegar a la bandeja", sin la versión con el libro cerrado.
  - La respuesta del motor a `talk 'free'` ("los clubes interesados van a empezar a ofertar", `squad.ts:216`) aparece tal cual en el estado "Respuesta", y R2 no la cambia.
- **m3. `minutesOf` y `moodOutlook` no siguen del todo a `afterUserMatch`.**
  - Un lesionado o suspendido que no juega no cambia de conformidad (`squad.ts:84`). La spec igual lo marca "En baja" o "↓ baja" y le pone `canAskOut`, que es una falsa alarma durante toda la lesión.
  - Con 2 partidos en `recent`, el próximo partido ya cuenta (la longitud pasa a 3 antes del corte, `squad.ts:85-87`), pero la spec da `nextDelta` 0 y "Todavía no cuenta".
  - `canAskOut` usa `min(0, nextDelta)`: avisa de más cuando la conformidad sube (por ejemplo, 16 + 4 = 20 no pide irse).
  - `moodDelta(p, share)` no recibe `g`, y `tol` necesita la edad a `g.date`.
- **m4. Orden del mensaje de la nueva temporada.**
  - `p.listed = false` (`game.ts:803`) corre antes de `seasonTurnover` (`game.ts:805`), que retira jugadores, deja ir libres a los de contrato vencido y devuelve préstamos (`career.ts:905-919`). Si "{nombre} sigue queriendo irse" se manda en la l. 803, nace sin leer para jugadores que se van en el mismo clic. La spec tiene que decir "después de `seasonTurnover`".
  - El cambio de club del DT (aceptar un trabajo) también cierra los pedidos de su club anterior sin decisión sobre el jugador, y no figura en la lista del punto 4 (l. 547).
- **m5. Las dos specs no se reconcilian en dos puntos.**
  - Foco: en la bandeja, Enter sobre la fila lleva el foco a "Declararlo transferible", que decide sin F6; el Vestuario lo prohíbe (pregunta 32).
  - Texto del jugador que ya no está: "Ya no está en el plantel." (vestuario) contra "Ya no está en el fútbol argentino." (`bandeja.md` l. 266).
- **m6. La pregunta 1 sobreestima la fuga en dos puntos** (sección 2): el temperamento queda en ±2, no "casi exacto", y la renovación va en US$ redondeados, no en "pesos exactos".
- **m7. Detalles de la tabla de disponibilidad.**
  - El párrafo dice "salvo dos cambios de presentación", pero la tabla también pasa a deshabilitada la paciencia de alguien que quiere irse con conformidad de 60 o más. Ese caso es alcanzable: con "puede buscar club" sin pedido, por ejemplo, 85 − 20 = 65.
  - "No está 'En baja'" no aclara si se refiere al motivo principal o a cualquier motivo de `attentionOf`.
  - La pregunta 46 sigue abierta (no bloquea: la tabla ya aplica la recomendación).
- **m8. Foco al entrar por debajo de 1180 px.** Allí no hay elegido (l. 126), pero el foco principal es "la fila elegida de 'Para atender'" (l. 198, 390): falta decir que va a la primera fila.
- **m9. Reserva de foco contradictoria.** La spec dice que la barra superior está fuera de `.main` (l. 299), pero pide `scroll-padding-top` para ella en la página y en el panel (l. 296, 299). Hay que aclarar qué contenedor desplaza.

### 6. Cosas que la revisión no rompió

- R1 a R14 son coherentes entre sí:
  - R12 es un refactor que debe dar la misma simulación.
  - R13 cambia `harmony` y, con eso, `harmonyBoost` y la simulación, con control de calibración.
  - R14 solo cambia lo que se muestra y debe dar la misma simulación.
  - El criterio l. 757 los separa bien.
- `parts.temper` (l. 516) usa el corte 14 de R13. La banda "Temperamental" ≥ 14 coincide.
- Los extremos de los ajenos (l. 409) son los de `persLabels` (`squad.ts:38-49`) y caen dentro de sus bandas.
- Ejemplos numéricos verificados:
  - Titular 0,62 + 0,22 = 84 %, umbral 71 %.
  - Rotación 58 %: 0,493 × 90 × 5 − 0,31 × 180 ≈ 166 minutos (l. 742).
  - 62 % × 0,85 ≈ 53 % (l. 334).
