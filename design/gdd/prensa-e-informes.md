---
status: reverse-documented
source: src/engine/week.ts, src/engine/game.ts, src/ui/Week.tsx, src/ui/MatchPanels.tsx, src/ui/Inbox.tsx, src/ui/Home.tsx
date: 2026-11-14
verified-by: pending review
---

# Prensa e informes

> **Reverse-documented from implementation** — generado por `/reverse-document` desde
> `src/engine/week.ts` (más `src/engine/game.ts`, `src/ui/Week.tsx`, `src/ui/MatchPanels.tsx`, `src/ui/Inbox.tsx`, `src/ui/Home.tsx`) el 2026-11-14, en el commit `d9b251a`.
> Esto registra lo que el código **hace**; lo marcado `INTENT UNKNOWN` se infirió y el autor no lo confirmó.
> Donde este documento y el código no coincidan, no supongas que el documento es el requisito.

> Authoring guidance: .claude/docs/templates/guidance/game-design-document-guide.md

> **Status**: Implemented
> **Author**: usuario + game-designer (reverse-doc)
> **Last Updated**: 2026-11-14
> **Last Verified**: 2026-11-14 (contra el commit `d9b251a`)
> **Implements Pillar**: "La semana" (etapa 2 del plan de jugabilidad de `CLAUDE.md`: informe del rival con sugerencias aplicables, conferencias previas y posteriores delegables). Principio 8 de `docs/plan-ui-ux.md`: "Cada decisión se entiende".

## Summary

Tres piezas que rodean cada partido del DT: el informe del rival (llega 3 días antes, describe cómo juega, su once probable con rangos según el scouting y sugerencias tácticas que se aplican con un botón), la conferencia de prensa previa (el día antes) y la posterior (al terminar el partido), cuyas respuestas mueven la moral del plantel o de un jugador, la confianza de la dirigencia y el prestigio del DT. La programación diaria de todo eso vive en `dayEvents`. Existe para que la previa y el después del partido tengan decisiones propias.

> **Quick reference** — Layer: `Feature` · Priority: `MVP` (implementado) · Key deps: `entrenamiento-y-cuerpo-tecnico`, `motor-de-partido`, `economia-y-dirigencia`, `carrera-del-dt`, `comunicacion-y-bandeja`

## Overview

**Propósito.** Que el DT prepare cada partido con información sobre el rival y que lo que dice en público tenga costo o beneficio. **Alcance.** Incluye `scoutReport` (contenido, precisión, sugerencias), el envío del informe (`dayEvents`), la creación de las conferencias (`makePrePress`, `makePostPress`), las respuestas (`answerPress`), la delegación (`delegatePress`, `g.delegate.press`), la delegación forzada si no se responde, y el resto de `dayEvents` en lo que toca a este sistema. **Queda afuera:** el entrenamiento y el cuerpo técnico (ver `entrenamiento-y-cuerpo-tecnico`; `dayEvents` también aplica el plan delegado, el parte del lunes, el mercado de entrenadores y los sueldos, documentados allá o en `carrera-del-dt`), la bandeja como pantalla (ver `comunicacion-y-bandeja`), la charla previa y del entretiempo (ver `motor-de-partido`).

**Design intent (inferido):**
- Informe: recompensar al jugador que mira antes de jugar, con sugerencias que bajan la barrera táctica para el que no sabe qué tocar. `INTENT UNKNOWN`.
- Prensa: un dilema chico de comunicación (moral contra dirigencia contra prestigio), sin texto libre, que se puede delegar del todo. `INTENT UNKNOWN`.

## Player Fantasy

`[inferred — confirm]` El jueves te llega la carpeta del jefe de scouting: "presiona alto, su lateral derecho es el más flojo, cuidado con su nueve". Aplicás dos ajustes con un clic y te sentís preparado. El sábado, en la conferencia, elegís si bancás al plantel o le pasás la factura, y lo que dijiste aparece en la bandeja con tus palabras entre comillas. Estética MDA: **Fantasy** (ser el DT ante los micrófonos) y **Challenge** (leer al rival); secundaria **Expression** (el tono de las respuestas). SDT: **Competence** (la sugerencia se entiende y se aplica) y **Autonomy** (responder, delegar una vez o delegar siempre).

## Detailed Design

### Core Rules

**Programación diaria** (`dayEvents`, `week.ts:293-327`). Corre una vez por día, con la fecha ya avanzada, desde `advanceDay` (`game.ts:567`) y desde `finishUserMatch` (`game.ts:596`). En lo que toca a este sistema:

1. Calcula `días` = días enteros hasta el próximo partido del DT (`nextUserFixture`).
2. **Informe del rival**: si `días ≤ 3` y todavía no se mandó para ese partido (`training.reportFor ≠ id`), marca `reportFor = id`, arma `scoutReport` y emite una noticia `tag: 'club'`, `clubId: rival`, `act: 'rival'`, `ref: id del partido`. El cuerpo lleva las dos primeras líneas de estilo y el punto débil, firmados por el jefe de scouting (o "El cuerpo técnico" si está vacante).
3. **Conferencia previa**: si `días = 1` y todavía no se generó para ese partido (`training.pressFor ≠ id`): sin conferencia abierta, marca `pressFor = id` y crea `g.press = makePrePress` (si `g.delegate.press` está activo, la responde el ayudante en el acto); si sigue abierta la posterior del partido anterior (partidos a dos días), le suma las dos primeras preguntas de la previa y se responde o se delega antes del partido.
4. El lunes, `dayEvents` además emite el parte de entrenamiento y corre el mercado de entrenadores (fuera de este documento). Todos los días descuenta los sueldos del cuerpo técnico.

**Informe del rival** (`scoutReport`, `week.ts:142-193`). Se recalcula **cada vez que se abre**, con el estado del momento; la noticia es una foto del día en que llegó.

5. **Precisión**: `acc = round(scout × 0,6 + asst × 0,4)` (F1). Con `acc ≥ 16` las valoraciones son exactas; si no, son rangos de ancho `2 × spread` (F2). La pantalla dice precisión alta (≥ 16), media (≥ 10) o baja.
6. **Once probable**: el plan que la IA prevé para ese partido (`predictPlan`: dibujo, once, rotación e instrucciones, con el mismo azar que el plan del día). Se lista ordenado por la valoración que estima el cuerpo técnico (punto medio del rango), no por la real.
7. **Cómo juega**: frases según las instrucciones del rival. Siempre una de mentalidad (≤ 1 replegado, ≥ 3 ofensivo, si no equilibrado) y una de salida (larga, corta o mixta); además presión alta o nula, línea adelantada o baja, centros (`finalThird = 2`), remate de media distancia (`finalThird = 3`) y contragolpe (`onWin = 1`).
8. **Forma**: G, E o P de sus últimos 5 partidos jugados (todas las competencias) y goles a favor y en contra por partido.
9. **Punto débil**: el defensor de menor valoración. El texto dice su puesto, la valoración si `acc ≥ 10` y por dónde atacar: su lateral derecho → "por tu izquierda" (`focus 0`), su lateral izquierdo → "por tu derecha" (`focus 2`), un central → "por el medio" (`focus 1`). Sin defensores: "No se le ve un punto débil claro en la defensa."
10. **Peligro**: el delantero o enganche (`AMC`) de mayor valoración, con el aviso de que se le puede poner marca personal durante el partido desde la pestaña Rival.
11. **Sugerencias** (`tips`): cada una trae un texto y un `patch` sobre la táctica del DT. Se generan en este orden, cuando se cumple su condición:

| # | Condición | Texto (resumen) | Patch |
|---|-----------|----------------|-------|
| T1 | Hay defensores | "Cargar el juego por {lado}, sobre {jugador}." | `focus` 0, 1 o 2 |
| T2 | Su central más lento pierde por ≥ 5 en `pac + acc` con tu delantero más rápido | "{central} es lento y {delantero} le gana en velocidad: pases filtrados a la espalda" (+ "aprovechando su línea adelantada" si `line = 2`) | `finalThird: 0, tempo: 2` |
| T3 | Presiona alto (`pressing = 2`) | "salir largo evita perder la pelota cerca de tu arco" | `passing: 2` |
| T4 | Contragolpea y es ofensivo (`onWin = 1`, `mentality ≥ 3`) | "no te desarmes y salí rápido de contra" | `onWin: 1, onLoss: 0` |
| T5 | Su once promedia > 4 más que el tuyo | "bloque bajo y salida rápida de contra" | `mentality: 1, line: 0, onWin: 1` |
| T6 | El tuyo promedia > 4 más que el suyo (excluye T5) | "adelantá el equipo y presioná" | `mentality: 3, pressing: 2` |

12. Aplicar una sugerencia hace `Object.assign(club.tactic, patch)` y la marca "✓ Aplicado"; "Aplicar todo" aparece con 2 o más y las aplica en orden (si dos tocan el mismo campo, gana la última). Sin sugerencias: "No hay ajustes que recomendar: con tu planteo alcanza." Las marcas de aplicado no se guardan: al reabrir el informe vuelven a "Aplicar".
13. `scoutReport` también calcula las 3 figuras (`stars`), pero ninguna pantalla las muestra.

**Conferencia previa** (`makePrePress`, `week.ts:206-245`). Hasta 3 preguntas, en este orden de prioridad (se corta en 3). La elección es determinista: no usa azar, depende del estado y del id del partido.

| # | Condición | Pregunta | Opción 0 (la del ayudante) | Opción 1 | Opción 2 |
|---|-----------|----------|---------------------------|----------|----------|
| P1 | Clásico (`isDerby`, 18 pares en `RIVAL_PAIRS`) | ¿Qué significa este partido? | "Es un partido más" — sin efecto | "Es el partido del año" — moral +3, dirigencia +1, prestigio +1 | "La presión la tiene {rival}" — moral +2, prestigio −1 |
| P2 | ≥ 3 sin ganar | ¿Tu puesto corre riesgo? | "La presión es parte de este trabajo" — dirigencia +1 | "Confío en el plantel" — moral +3 | "Los jugadores tienen que dar más" — moral −4, dirigencia +2 |
| P3 | ≥ 3 victorias seguidas | ¿Exceso de confianza? | "Los pies sobre la tierra" — moral +1, dirigencia +1 | "Está para cosas grandes" — moral +3, prestigio +1 | "Todavía no ganamos nada" — dirigencia +1 |
| P4 | Rival con ≥ 8 de reputación más | ¿Firmás el empate? | "No firmo nada" — moral +3 | "Sería un buen resultado" — moral −2, dirigencia −1 | "El favoritismo no juega" — moral +1 |
| P5 | Rival con ≥ 8 de reputación menos (excluye P4) | ¿Es obligación ganar? | "Todos los partidos son difíciles" — moral +1 | "Tenemos que ganar" — moral +1, dirigencia +1 | "Si nos relajamos perdemos con cualquiera" — moral −1, dirigencia +1 |
| P6 | Menos de 3 preguntas e `id % 3 ≠ 0`; jugador = el disponible n.º `id % 4` por `ca` | ¿Cómo ves el momento de {jugador}? | "Es fundamental" — jugador +6 | "Uno más del plantel" — jugador −3, moral +1 | "Le pido más" — jugador −5, dirigencia +1 |
| P7 | Menos de 3 e `id % 2 = 0` | ¿Qué te preocupa de {rival}? | "Depende de nosotros" — moral +2 | "Muy bien trabajado" — prestigio +1 | "Sus delanteros" — moral −1, dirigencia +1 |
| P8 | Menos de 3 | ¿Cómo llega el equipo? | "Trabajamos toda la semana" — moral +1 | "Vamos a salir a ganar" — moral +2, dirigencia +1 | "Hay cosas para corregir" — moral −2 |

P8 garantiza al menos una pregunta.

**Conferencia posterior** (`makePostPress`, `week.ts:246-270`). Se crea en `finishUserMatch` (`game.ts:592`), salvo que la temporada haya terminado o el DT haya sido despedido. 1 o 2 preguntas:

| # | Condición | Pregunta | Opción 0 (la del ayudante) | Opción 1 | Opción 2 |
|---|-----------|----------|---------------------------|----------|----------|
| Q1 | Ganó (también por penales) | ¿La clave de la victoria? | "El trabajo de todo el plantel" — moral +2 | "El planteo funcionó" — moral +1, prestigio +1 | "Ganamos, pero jugamos mal" — moral −2, dirigencia +1 |
| Q2 | Empató sin penales | ¿Cómo analizás el empate? | "Merecimos ganarlo" — moral +1 | "Resultado justo" — sin efecto | "No me gustó" — moral −2, dirigencia +1 |
| Q3 | Perdió (también por penales) | ¿Qué le faltó? | "La responsabilidad es mía" — moral +2, dirigencia −1 | "No estuvieron a la altura" — moral −4, dirigencia +1 | "El arbitraje nos perjudicó" — moral +1, prestigio −2, dirigencia −1 |
| Q4 | El mejor puntaje propio fue ≥ 7,3 | ¿El partido de {jugador}? | "Fue la figura" — jugador +6 | "Hizo lo que tenía que hacer" — jugador +1, moral +1 | — |

**Responder** (`answerPress`, `week.ts:272-288`)

14. Por cada pregunta se toma la opción elegida (si falta, la 0). Se aplican los efectos (F3) con su peso: a mano ×1,5, delegada la mitad hacia cero. `morale` a **todo** el plantel (también lesionados), `star` al jugador de la pregunta, `board` a la confianza de la dirigencia, `rep` al prestigio del DT. `answerPress` devuelve el efecto en una línea ("Efecto: moral del plantel +5, …") que la ventana muestra al responder.
15. Sale una noticia `tag: 'club'`, `clubId: club del DT`, sin `act`, con título `{quién}: "{primera cita}"` y todas las citas en el cuerpo. `{quién}` es el DT, o el ayudante (o "El ayudante de campo" si está vacante) si se delegó.
16. `g.press` queda en `null`.

**Delegar.** `delegatePress` responde la opción 0 de cada pregunta y firma el ayudante (`week.ts:290`). Se dispara:
- a mano: "Que hable el ayudante" (ventana, panel del post partido o bandeja);
- siempre: `g.delegate.press` ("Que hable siempre el ayudante"), apenas se crea la conferencia (`week.ts:308`, `game.ts:593`);
- **por omisión**: al empezar el siguiente `advanceDay` con una conferencia abierta (`game.ts:560`), al terminar un partido con una conferencia abierta (`game.ts:585`) y en las simulaciones sin interfaz (`continueGame`, `game.ts:581`).
- Al cambiar de temporada o de club, la conferencia abierta se descarta sin efectos ni noticia (`game.ts:658`, `career.ts:104`).

**Interfaz**
17. Al aparecer la conferencia previa, el avance se frena (`advanceDay` devuelve `press`) y se abre la ventana `PressModal` (`App.tsx:135`, `153`). La ventana tiene "Más tarde" (cierra sin responder), "Que hable siempre el ayudante", "Que hable el ayudante" y "Responder" (habilitado cuando todas las preguntas tienen respuesta). Avisa: "Si no respondés antes de seguir, habla el ayudante con respuestas prudentes."
18. La posterior es el paso 3 del flujo `PostMatch` (`MatchPanels.tsx:92-145`), que solo aparece si hay una conferencia posterior de ese partido. "Saltear todo" o "Volver al inicio" la dejan abierta, y queda como pendiente en la bandeja.
19. La conferencia abierta figura en Pendientes de la bandeja, con las preguntas y los botones Responder y Que hable el ayudante (`Inbox.tsx:170-174`), y en la barra de comandos como "Responder la conferencia de prensa" (`App.tsx:239`).
20. El informe se abre desde la noticia `rival` de la bandeja (solo mientras ese partido siga siendo el próximo), desde el mosaico "Próximo partido" del Inicio (`Home.tsx:106`; antes dice "El informe del rival llega 3 días antes") y se cierra con "Cerrar ✕" o Esc.

### States and Transitions

**Conferencia** (`g.press`, una por vez)

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| Sin conferencia | `g.press = null` | `dayEvents` con `días = 1` (previa) o `finishUserMatch` (posterior) | — |
| Abierta previa | Regla 3 | Responder; delegar a mano; avanzar un día; terminar un partido; cambio de temporada o de club | Frena "Ir al partido"; abre la ventana; pendiente en la bandeja. |
| Abierta posterior | `finishUserMatch` sin delegación siempre | Igual | Paso 3 del post partido; pendiente en la bandeja. |
| Respondida | `answerPress` | Inmediata | Efectos aplicados, noticia emitida, vuelve a Sin conferencia. |

**Informe del rival por partido**: No enviado (`reportFor ≠ id`) → Enviado (`días ≤ 3`) → Vencido (el partido ya no es el próximo: el botón de la noticia dice "Ese partido ya se jugó."). `reportFor` y `pressFor` se borran al empezar la temporada.

### Interactions with Other Systems

| Sistema | Entra | Sale | Responsable |
|---------|-------|------|-------------|
| `entrenamiento-y-cuerpo-tecnico` | `sab('scout')`, `sab('asst')`, nombres del jefe de scouting y del ayudante | — | Ellos proveen. |
| `ia-rivales` | Táctica del rival (`opp.tactic`), `autoPick` | — | Ellos proveen. El informe no ve el plan del partido (`planMatch`). |
| `motor-de-partido` | Resultado, puntajes (`f.lines`), penales | Táctica modificada por las sugerencias; moral (efectividad `0,95 + 0,1 × moral/100`, `match.ts:119`) | El motor lee la táctica y la moral. |
| `plantel` | Moral, disponibilidad, `ca` | `p.morale` | Este sistema escribe la moral. |
| `economia-y-dirigencia` | — | `g.board.confidence` | Este sistema escribe; la dirigencia decide despidos con ella. |
| `carrera-del-dt` | — | `g.manager.rep` | Este sistema escribe; el mercado de entrenadores lo lee. |
| `temporada-y-ligas` | Fixture, racha (orden de `g.fixtures`), clásicos | — | Ellos proveen. |
| `comunicacion-y-bandeja` | — | Noticia `rival`, noticia de la conferencia, pendiente `press` | La bandeja muestra; este sistema emite. |

## Formulas

**F1. Precisión del informe** (`week.ts:148`)
```
acc = round(sab('scout') × 0,6 + sab('asst') × 0,4)        // 1–20
```
Ejemplo: scout 12, asst 10 → 11 (media). Ambos vacantes (4) → 4 (baja).

**F2. Rango de una valoración** (`week.ts:149-150`)
```
spread = acc ≥ 16 ? 0 : round((20 − acc) / 2,5)
w      = min(spread, knowWidth(jugador, 9))          // nunca peor que lo que ya se sabe por el ojeo
est(v) = rangeAround(pid, round(v), w, 61, 1, 99)    // corrimiento fijo de hasta 0,8·w: no se centra en el valor real
```
| acc | 4 | 8 | 10 | 12 | 14 | 15 | 16+ |
|---|---|---|---|---|---|---|---|
| spread | 6 | 5 | 4 | 3 | 2 | 2 | 0 |

Ejemplo: valoración real 72 con acc 11 y un jugador poco conocido → ancho 4, un rango de 8 puntos que contiene el 72 (por ejemplo "66-74").

**F3. Efectos de una respuesta** (`week.ts:280-283`)
```
peso(v)  = delegada ? trunc(v / 2) : signo(v) · round(|v| · 1,5)
para cada jugador del plantel: morale = clamp(morale + peso(a.morale), 5, 100)
jugador de la pregunta:       morale = clamp(morale + peso(a.star), 5, 100)
dirigencia:                   confidence = clamp(confidence + peso(a.board), 0, 100)
DT:                           rep = clamp(rep + peso(a.rep), 5, 99)
```
| Variable | Tipo | Rango | Fuente | Descripción |
|---|---|---|---|---|
| a.morale | int | −4 a +3 | tablas P y Q | A todo el plantel |
| a.star | int | −5 a +6 | P6, Q4 | A un jugador |
| a.board | int | −1 a +2 | tablas | Confianza de la dirigencia |
| a.rep | int | −2 a +1 | tablas | Prestigio del DT |

La moral vuelve sola hacia su punto medio a 0,3 por día fuera de una banda de ±5 (`game.ts:546-547`), así que un +3 dura unos días. **Expected output** por conferencia previa: moral del plantel entre −8 y +9 (3 preguntas), dirigencia entre −1 y +4. Posterior: moral entre −4 y +3, dirigencia entre −1 y +1.

**F4. Comparación de onces para T5 y T6** (`week.ts:186-189`)
```
myAvg = Σ posRating(mis 11 en su puesto) / 11
opAvg = Σ valoración de su once probable / cantidad
T5 si opAvg − myAvg > 4;  T6 si myAvg − opAvg > 4
```
`myAvg` divide por 11 aunque falten titulares (un hueco cuenta 0).

**F5. Plazos** (`week.ts:297-305`)
```
días = round((fecha del partido − fecha actual) / 1 día)
informe si días ≤ 3;  conferencia previa si días = 1
```

## Edge Cases

**Handled in code**

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| Partido a menos de 3 días del anterior | El informe sale el mismo día que se termina el partido anterior (`finishUserMatch` corre `dayEvents`) | Nunca se queda sin informe. |
| Rival sin partidos jugados | "Todavía no jugó esta temporada" en lugar de forma y goles | Evita dividir por cero (`max(1, n)`). |
| Jefe de scouting vacante | Firma "El cuerpo técnico" y el informe sale con precisión baja | — |
| Respuesta faltante | Se toma la opción 0 | `picks[i] ?? 0`. |
| Jugador de la pregunta que ya no existe | No se aplica el efecto `star` | Chequeo de `g.players[q.pid]`. |
| Conferencia abierta y se avanza | Habla el ayudante con la opción 0 | Nunca queda una conferencia vieja. |
| Ganar o perder por penales | Cuenta como victoria o derrota (Q1, Q3) | — |
| Fin de temporada o despido | No hay conferencia posterior | `finishUserMatch` sale antes. |

**Not yet handled (detectados al analizar)**

| Scenario | Comportamiento actual | Nota |
|----------|----------------------|------|
| Partido dos días después de otro | Las preguntas de la previa se suman a la posterior que sigue abierta (regla 3) | ✅ Resuelto (2026-11-14) |
| Conferencia previa sin responder y se juega | Imposible por el flujo actual (el avance la delega), salvo el caso anterior. Si existiera, `finishUserMatch` la delega después del partido y la moral llega tarde. | — |
| Rachas con copas | `streak` asume que `g.fixtures` está en orden de fecha; los partidos de copa se agregan aparte | A verificar. |
| El informe revela el orden real | El once se ordena por el punto medio del rango estimado | ✅ Resuelto (2026-11-14) |
| Once probable distinto del real | El informe usa el plan previsto (`predictPlan`), con el mismo azar que el plan del día | ✅ Resuelto (2026-11-14): solo difiere si cambia algo entre el informe y el partido (lesiones, físico) |
| `stars` calculado y no mostrado | — | Dato muerto. |
| Prestigio mínimo distinto | Prensa acota a 5–99; el cambio de club a 15–99 | Inconsistencia menor. |
| Moral a lesionados | La moral de la respuesta llega también a los lesionados | `INTENT UNKNOWN`. |
| Consecuencias posteriores | Lo dicho no se recuerda: "Tenemos que ganar" y perder no tiene efecto extra | `CLAUDE.md` lo lista como faltante. |

**Degenerate strategies**

- ✅ Resuelto (2026-11-14) con el peso de F3 (a mano ×1,5, delegada la mitad). Antes: **Delegar siempre era casi óptimo.** La opción 0 nunca baja la moral ni el prestigio, y su único costo posible es dirigencia −1 (Q3). En P1 hay una opción que domina a la 0 en todo (moral +3, dirigencia +1, prestigio +1 contra nada); en P4 la 0 (moral +3) ya es la mejor. El dilema existe solo para quien busca el máximo.
- **Respuestas dominantes**: P1 opción 1 domina a la 0; P3 opción 0 domina a la 2; Q1 opción 0 o 1 domina a la 2 si no importa la dirigencia. Ver Open Questions.
- **Aplicar todo sin pensar**: las sugerencias solo miran al rival, no tu plantel (salvo T2 y T5/T6). Aplicar todo siempre es razonable y achica la decisión táctica. `INTENT UNKNOWN` si es asistencia buscada.

## Dependencies

| System | Direction | Nature of Dependency |
|--------|-----------|---------------------|
| `entrenamiento-y-cuerpo-tecnico` | Este depende | Precisión del informe y nombres. |
| `ia-rivales` | Este depende | Táctica y once probable del rival. |
| `motor-de-partido` | Mutua | Resultado y puntajes para la posterior; táctica y moral para el partido. |
| `plantel` | Este escribe | Moral. |
| `economia-y-dirigencia` | Este escribe | Confianza de la dirigencia. |
| `carrera-del-dt` | Este escribe | Prestigio del DT. |
| `temporada-y-ligas` | Este depende | Fixture, clásicos, rachas. |
| `comunicacion-y-bandeja` | Depende de este | Noticias y pendiente de prensa. |

**Contenido**: textos de preguntas y respuestas escritos en `week.ts` (español rioplatense); pares de clásicos en `RIVAL_PAIRS` (`week.ts:196`) y `RIVALS` (`game.ts`, fixture), que son dos listas separadas.

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| Anticipación del informe (gate) | 3 días | 2–5 | Más tiempo para preparar | Informe casi el día del partido |
| Anticipación de la previa (gate) | 1 día | 1–2 | — | — |
| Peso del scout y del ayudante en la precisión (curve) | 0,6 / 0,4 | — | — | — |
| Umbral de precisión exacta (gate) | 16 | 14–18 | Exacto más difícil | Exacto con cualquiera |
| Divisor del rango (curve) | 2,5 | 2–4 | Rangos más chicos | Rangos más grandes |
| Umbral para mostrar la valoración del punto débil (gate) | `acc ≥ 10` | — | — | — |
| Diferencia para T5 y T6 (gate) | 4 | 3–6 | Menos sugerencias de bloque | Sugerencia casi siempre |
| Diferencia de velocidad para T2 (gate) | 5 | 3–8 | — | — |
| Umbral de reputación para P4 y P5 (gate) | ±8 | 5–12 | — | — |
| Racha para P2 y P3 (gate) | 3 | 2–5 | — | — |
| Puntaje para la pregunta del mejor jugador (gate) | 7,3 | 7–8 | — | — |
| Máximo de preguntas previas (gate) | 3 | 2–4 | — | — |
| Efectos de cada respuesta (curve) | moral −4 a +3; jugador −5 a +6; dirigencia −1 a +2; prestigio −2 a +1 (antes del peso) | — | La prensa pesa más que el resultado | Prensa decorativa |
| Peso de la respuesta (curve) | a mano ×1,5; delegada ×0,5 hacia cero | — | — | Delegar vuelve a ser óptimo |
| Opción del ayudante (feel) | siempre la 0, con la mitad del efecto | — | — | — |

**Balance concerns**
- ⚠️ Un +3 de moral a todo el plantel equivale, en el motor, a ~+0,3 % de efectividad: el efecto en el partido es casi invisible; el efecto real es en la dirigencia y el prestigio. Medir con `npm run sim`.
- ✅ Resuelto (2026-11-14): la delegación ya no es casi óptima. El ayudante mueve la mitad (hacia cero) y responder a mano pesa ×1,5, para bien y para mal.

## Visual/Audio Requirements

Sin audio en el juego. Columna de audio: "—".

| Event | Visual Feedback | Audio Feedback | Priority |
|-------|----------------|---------------|----------|
| Llega el informe | Noticia en la bandeja con el escudo del rival; el mosaico "Próximo partido" cambia el texto por el botón "Informe del rival" | — | Alta (implementado) |
| Abrir el informe | Ventana ancha con escudo del rival, forma con colores G/E/P, tarjetas "Cómo juega", "Punto débil", "Cuidado con", sugerencias y once probable | — | Alta (implementado) |
| Aplicar una sugerencia | El botón pasa a "✓ Aplicado" | — | Alta (implementado) |
| Llega la conferencia previa | Se abre la ventana sola; pendiente con "!" en la bandeja | — | Alta (implementado) |
| Responder | Noticia con la cita del DT | — | Media (implementado) |
| Efecto de la respuesta | Ninguno: no se muestra cuánto cambió la moral ni la dirigencia | — | Media (falta) |

## Game Feel

**Feel Reference.** La carpeta del rival que el ayudante le deja al DT, y la conferencia del día previo de la TV argentina: preguntas cortas, respuestas de manual. Anti-referencia: diálogos largos con árbol de conversación.

**Input Responsiveness**

| Action | Max Input-to-Response Latency (ms) | Frame Budget (at 60fps) | Notes |
|--------|-----------------------------------|------------------------|-------|
| Abrir el informe | 100 | 6 | `scoutReport` se calcula al abrir. |
| Aplicar sugerencia | 100 | 6 | Cambia la táctica y guarda. |
| Elegir respuesta | 50 | 3 | Marca la opción. |
| Responder o delegar | 100 | 6 | Aplica, guarda y cierra. |

**Animation Feel Targets**: no aplica.

**Impact Moments**

| Impact Type | Duration (ms) | Effect Description | Configurable? |
|-------------|--------------|-------------------|---------------|
| Frenado por conferencia | — | "Ir al partido" se detiene y abre la ventana | No (sí la delegación permanente) |
| Cita en la bandeja | — | Tus palabras como título de la noticia | No |

**Weight and Responsiveness Profile.** Liviano y rápido: tres clics para responder, uno para delegar. Control total, sin compromiso hasta "Responder". La falla no se lee: el jugador no ve cuánto movió cada respuesta, así que no puede aprender qué conviene.

**Feel Acceptance Criteria**
- [ ] En prueba de juego, el jugador aplica al menos una sugerencia del informe en los primeros 5 partidos sin que se lo pidan.
- [ ] El jugador que responde la prensa puede decir, después de 5 conferencias, qué tipo de respuesta le sube la confianza de la dirigencia.

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|-------------|-----------------|-----------------|-----------|
| Rival, fecha, DT, dibujo, precisión y quién lo firmó | Informe (`ReportModal`, encabezado) | Al abrir | — |
| Forma (últimos 5) y goles por partido | Informe, KPIs | Al abrir | Si jugó; si no, "Todavía no jugó esta temporada" |
| Cómo juega, punto débil, peligro | Informe, tarjeta izquierda | Al abrir | — |
| Sugerencias con Aplicar y Aplicar todo (≥ 2) | Informe, "Lo que sugiere el cuerpo técnico" | Al abrir | Texto "con tu planteo alcanza" si no hay |
| Once probable con rangos, filas que abren la ficha | Informe, tabla | Al abrir | Aviso "con un mejor jefe de scouting…" si `acc < 16` |
| Acceso al informe | Mosaico "Próximo partido" del Inicio; noticia `rival` de la bandeja | Diario | Desde 3 días antes |
| Preguntas y opciones, Responder, Que hable el ayudante, Que hable siempre el ayudante, Más tarde | `PressModal` / `PressPanel` | Al aparecer | `g.press` no nulo |
| Paso "Conferencia" | `PostMatch`, paso 3 | Al terminar el partido | Si hay posterior sin delegar |
| Conferencia pendiente con las preguntas | Bandeja, Pendientes | Al aparecer | — |
| Comando "Responder la conferencia de prensa" | Barra de comandos | — | `g.press` no nulo |

**Faltan**: mostrar el efecto de cada respuesta (antes o después de elegir); recordar qué sugerencias se aplicaron; mostrar las figuras del rival (`stars`).

## Cross-References

| This Document References | Target GDD | Specific Element Referenced | Nature |
|--------------------------|-----------|----------------------------|--------|
| Precisión del informe | `design/gdd/entrenamiento-y-cuerpo-tecnico.md` | `sab('scout')`, `sab('asst')` | Data dependency |
| Once probable y estilo del rival | `design/gdd/ia-rivales.md` | `club.tactic`, `autoPick` | Data dependency |
| Moral en la efectividad | `design/gdd/motor-de-partido.md` | Factor `0,95 + 0,1 × moral/100` | Data dependency (ellos consumen) |
| Marca personal sugerida | `design/gdd/motor-de-partido.md` | `tactic.manMark` en la pestaña Rival | Rule dependency |
| Confianza de la dirigencia | `design/gdd/economia-y-dirigencia.md` | `g.board.confidence` y despido | Ownership handoff |
| Prestigio del DT | `design/gdd/carrera-del-dt.md` | `g.manager.rep` en ofertas de trabajo | Ownership handoff |
| Racha, clásicos, fixture | `design/gdd/temporada-y-ligas.md` | `g.fixtures`, `RIVALS` | Data dependency |
| Pendiente, noticia y freno del avance | `design/gdd/comunicacion-y-bandeja.md` | Pendiente `press`, `DayResult 'press'`, noticia `act: 'rival'` | State trigger |

## Acceptance Criteria

**Funcionales (implementados)**
- [x] Con el próximo partido a 3 días o menos, al avanzar sale una sola noticia `act: 'rival'` con `ref` = id del partido.
- [x] Con scout 20 y asst 10 (acc 16), el once probable muestra números exactos; con scout 4 y asst 4, rangos de ±6.
- [x] Un rival con `pressing = 2` genera la sugerencia T3 y aplicarla deja `tactic.passing = 2`.
- [x] El día anterior a un partido (si no hay otra conferencia abierta) se crea una conferencia previa de 1 a 3 preguntas y "Ir al partido" se frena con la ventana abierta.
- [x] Con "Que hable siempre el ayudante", no queda ninguna conferencia pendiente y sale la noticia firmada por el ayudante.
- [x] Avanzar con una conferencia abierta la responde con la opción 0 de cada pregunta.
- [x] Responder "Los jugadores tienen que dar más" baja 4 la moral de todos los jugadores del plantel (mínimo 5) y sube 2 la confianza de la dirigencia (máximo 100).
- [x] Después de un partido sin delegación, el post partido tiene el paso "Conferencia"; con delegación, no.
- [x] La noticia de la conferencia lleva como título la cita de la primera respuesta.

**Falta (no implementado)**
- [ ] Hay conferencia previa para un partido dos días después de otro.
- [ ] El once del informe no revela el orden real cuando la precisión es menor que 16.
- [ ] Lo dicho en prensa tiene consecuencias después del partido.
- [ ] El jugador ve el efecto de su respuesta.

**Experienciales**
- [ ] El jugador lee el informe antes de al menos la mitad de los partidos de la primera rueda.
- [ ] El jugador que responde a mano siente que eligió algo distinto de lo que habría elegido el ayudante.

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ¿La opción del ayudante tiene que ser la 0 (hoy casi siempre la mejor)? | usuario | Próxima pasada de balance | Resuelta (2026-11-14): sigue siendo la 0, pero con la mitad del efecto; a mano pesa ×1,5 (F3) |
| Falta la conferencia previa con partidos a 2 días: ¿error o intención? | usuario + gameplay-programmer | Antes de la próxima versión | Resuelta (2026-11-14): era un error; las preguntas se suman a la posterior abierta |
| ¿Qué consecuencias más allá del partido tiene que tener la prensa? (`CLAUDE.md`: "Falta: que la prensa tenga consecuencias más allá del partido") | usuario | — | Pendiente |
| ¿El informe tiene que usar el plan real del rival (`planMatch`) en lugar de `autoPick`? | usuario | — | Resuelta (2026-11-14): sí (`predictPlan`) |
| ¿El orden del once del informe tiene que salir del punto medio del rango, como en las tablas? | usuario + ux-designer | — | Resuelta (2026-11-14): sí |
| ¿Se muestran las figuras del rival (`stars`) o se borra el cálculo? | usuario | — | Pendiente |
| Dos listas de clásicos (`RIVAL_PAIRS` en `week.ts`, `RIVALS` en `game.ts`): ¿se unifican? | lead-programmer | — | Pendiente |
| "Eventos del día" (`dayEvents`) no tiene eventos al azar: es la agenda diaria. ¿Hacen falta eventos propiamente dichos (visitas, pedidos de la prensa, rumores)? | usuario | — | Pendiente |

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-11-14 | Claude (reverse-doc) | Documentación inicial desde `src/engine/week.ts`, `src/engine/game.ts` y las pantallas de prensa e informe |

*Generado por `/reverse-document design src/engine/week.ts`.*
| 2026-11-14 | Claude | Resueltos: conferencia previa con partidos seguidos, peso de las respuestas (F3, delegar ya no es óptimo), informe con el plan previsto y orden por lo estimado, rango del informe sin centrar (F2) |
