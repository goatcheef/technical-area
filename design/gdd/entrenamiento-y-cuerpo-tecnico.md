---
status: reverse-documented
source: src/engine/week.ts, src/engine/ai.ts, src/ui/Week.tsx, src/ui/Inbox.tsx
date: 2026-11-14
verified-by: pending review
---

# Entrenamiento y cuerpo técnico

> **Reverse-documented from implementation** — generado por `/reverse-document` desde
> `src/engine/week.ts` (más `src/engine/ai.ts`, `src/ui/Week.tsx`, `src/ui/Inbox.tsx`) el 2026-11-14, en el commit `d9b251a`.
> Esto registra lo que el código **hace**; lo marcado `INTENT UNKNOWN` se infirió y el autor no lo confirmó.
> Donde este documento y el código no coincidan, no supongas que el documento es el requisito.

> Authoring guidance: .claude/docs/templates/guidance/game-design-document-guide.md

> **Status**: Implemented
> **Author**: usuario + game-designer (reverse-doc)
> **Last Updated**: 2026-11-14
> **Last Verified**: 2026-11-14 (contra el commit `d9b251a`)
> **Implements Pillar**: "La semana" (etapa 2 del plan de jugabilidad de `CLAUDE.md`). Toca también "El plantel como grupo" por la mejora de los jugadores.

## Summary

El sistema de la semana entre partidos: el DT elige cada día cuánto y qué entrena el plantel, y eso mueve el físico, las lesiones, la familiaridad con el dibujo y la mejora lenta de los atributos. Un cuerpo técnico de cinco puestos (ayudante, preparador físico, médico, jefe de scouting y coordinador de inferiores) multiplica esos efectos y le saca tareas al DT si las delega. Existe para que lo que pasa entre partido y partido tenga peso y para que la plantilla crezca por lo que decide el DT.

> **Quick reference** — Layer: `Core` · Priority: `MVP` (implementado) · Key deps: `motor-de-partido`, `plantel`, `temporada-y-ligas`, `economia-y-dirigencia`, `comunicacion-y-bandeja`

## Overview

**Propósito.** Darle al DT palancas diarias que pesen en el partido siguiente y a lo largo de la temporada: llegar fresco o llegar trabajado, asimilar un dibujo nuevo, prevenir lesiones, desarrollar juveniles. **Alcance.** Incluye el cuerpo técnico (`g.staff`, `sab`, contratar y desvincular, bolsa de libres, sueldos), el entrenamiento diario del club del DT (`dailyTraining`: intensidad, foco colectivo, foco individual, descanso posterior, lesiones de práctica, familiaridad, progreso `p.tx`), la ventaja del foco en el próximo partido (`trainEdge`), el plan del ayudante cuando el entrenamiento está delegado (`assistantPlan`), el informe semanal y el entrenamiento semanal de los planteles de la IA (`weeklyAiTraining`). **Queda afuera:** la evolución de fin de temporada (`develop` en `game.ts`, ver `temporada-y-ligas`), la recuperación diaria de base (`passDays`, compartida con el resto del juego), el informe del rival y la prensa (ver `prensa-e-informes`), el ojeo (ver `ojeo`).

**Design intent (inferido):**
- Que la carga de la semana sea un dilema: mejorar más rápido cuesta físico y lesiones. `INTENT UNKNOWN — inferido de los textos de ayuda (`INTENSITY`, `FOCUS`), no confirmado`.
- Que el cuerpo técnico sea una inversión de dinero con efecto visible pero chico, y que un puesto vacante castigue (rinde como capacidad 4).
- Que el DT que no quiere microgestionar pueda delegar sin quedar en desventaja grave.

## Player Fantasy

`[inferred — confirm]` Sos el DT que "trabaja la semana": decidís si el martes se mete carga o se cuida al plantel para el domingo, ves en la tabla de trabajo individual cómo se llena la barra del pibe de 18 años y cada lunes el ayudante te deja el parte de quién mejoró. Armás tu cuerpo técnico como armás el plantel: un buen preparador físico se nota en el último cuarto de hora y un médico bueno te devuelve antes al nueve lesionado. Estética MDA principal: **Challenge** (gestión de recursos bajo presión de calendario) y **Fantasy** (ser el DT del día a día); secundaria **Discovery** (ver crecer a un juvenil). SDT: **Competence** (la consecuencia del plan se ve en el físico del día del partido) y **Autonomy** (se puede delegar todo).

## Detailed Design

### Core Rules

**Cuerpo técnico**

1. Hay cinco puestos (`STAFF_ROLES`, `types.ts:252-258`): `asst` ayudante de campo, `fit` preparador físico, `doc` médico, `scout` jefe de scouting, `youth` coordinador de inferiores. Cada profesional (`Staff`, `types.ts:259`) tiene `ability` 3–20, `wage` mensual, `contractEnd`, `age` y `clubId` (0 = libre).
2. Al crear la partida, el club del DT recibe un profesional por puesto con capacidad `4 + rep × 0,12 + gauss × 2,2`, acotada a 3–20 (`week.ts:16-21`), contrato hasta la temporada actual + 1 o 2.
3. `sab(g, rol)` devuelve la capacidad del que ocupa el puesto en el club del DT, o **4** si está vacante (`week.ts:32`). Todos los efectos leen `sab`; nunca la capacidad de un profesional de otro club.
4. **Bolsa de libres** (`refreshPool`, `week.ts:23-29`): cada profesional libre sigue en la bolsa con 60 % de probabilidad; después se completa hasta 4 libres por puesto con capacidad `6 + U(0,1) × 12` (6–18). Se refresca al crear la partida, al empezar cada temporada y los lunes con 25 % de probabilidad (`week.ts:320`).
5. **Contratar** (`hireStaff`, `week.ts:33-42`): el profesional tiene que estar libre, el puesto vacante y la caja del club tiene que ser ≥ 2 × su sueldo. Firma hasta la temporada actual + 2 y sale una noticia del club (sin `act`).
6. **Desvincular** (`fireStaff`, `week.ts:43-50`): cuesta una indemnización de 3 × el sueldo mensual, que se descuenta de la caja y se suma a `ledger.wages`. El profesional vuelve a la bolsa (puede recontratarse). No genera noticia; la interfaz muestra el texto devuelto.
7. **Sueldos**: cada día `dayEvents` descuenta `staffBill / 30` de la caja (`week.ts:325-326`). No cuentan para el tope salarial del plantel (texto en `Week.tsx:122`).
8. **Contratos**: al empezar la temporada, todo contrato vencido del club del DT se extiende un año (`game.ts:655`). En la práctica nadie se va por fin de contrato y la edad no avanza. Ver Open Questions.

**Entrenamiento diario** (`dailyTraining`, `week.ts:91-134`). Corre una vez por día en `advanceDay`, después de la recuperación de base (`passDays`) y antes de cambiar la fecha, solo si el club del DT **no** jugó hoy (`game.ts:565`). El día de partido no se entrena.

9. **Descanso posterior**: si `restAfter` está activo y el club jugó ayer, ese día no se entrena: cada jugador sano suma `6 + (fit − 10) × 0,3` de físico (máx. 100) y la función termina. No hay familiaridad, progreso ni riesgo de lesión.
10. **Familiaridad**: si el dibujo actual no es el que el club venía entrenando (`famKey`), se toma el nuevo y la familiaridad cae 30 puntos (mínimo 30). Después sube según la fórmula F3.
11. Para cada jugador sano del plantel, en este orden:
    1. Físico: se aplica F2 (cambio del día y tope por intensidad).
    2. Lesión: tirada con la probabilidad F4. Si se lesiona, toma una de cuatro lesiones de `TRAIN_INJ` (sobrecarga 3–7 días, contractura 5–11, esguince de tobillo 10–22, distensión del isquiotibial 12–26), la duración se multiplica por el factor del médico (F5), se anota en el parte semanal y sale una noticia `tag: 'lesion'`, `act: 'injury'`. Ese día no progresa.
    3. Progreso: `p.tx` suma F6. Si llega a 1, se resta 1 y el jugador sube un atributo (regla 12).
12. **Qué atributo sube**: si el jugador tiene foco individual (`p.tfocus`), el atributo sale de esa lista sin filtrar por puesto; si no, de la lista del foco colectivo filtrada a los atributos que pesan en su puesto (`POS_WEIGHTS > 0`); si queda vacía (foco Equilibrado), de todos los que pesan en su puesto. La elección es aleatoria ponderada por `(21 − valor) × (1 + peso del puesto)`: los atributos bajos e importantes suben antes. Si el elegido ya está en 20, se pierde el punto (el `tx` ya se descontó). Si sube, se recalcula `ca` con `rawRating`, `pa = max(pa, ca)`, `p.ups` suma 1 y se anota en el parte semanal.
13. **Intensidades** (`INTENSITY`, `week.ts:72-76`): 0 Suave, 1 Normal, 2 Intensa.
14. **Focos colectivos** (`FOCUS`, `week.ts:54-61`):

| Foco | Atributos que entrena | Efecto extra |
|------|----------------------|--------------|
| Equilibrado (`equil`) | los de su puesto | — |
| Táctico (`tact`) | dec, pos, vis, otb, wor | familiaridad +0,75 por día de base (F3) |
| Físico (`fis`) | pac, acc, sta, str, jmp | físico +1,2 por día y tope +1,5 (F2) |
| Ataque (`att`) | fin, dri, fto, otb, lsh, cro | ataque × 1,02 en el partido (F7) |
| Defensa (`def`) | tck, mar, pos, hea, agg | defensa × 1,02 en el partido (F7) |
| Pelota parada (`sp`) | set, hea, cro, jmp | pelota parada × 1,18 en el partido (F7) |

15. **Focos individuales** (`IND_FOCUS`, `week.ts:62-71`): Plan del equipo (ninguno), Definición, Creación, Desborde, Marca, Físico, Mental, Arquero. La interfaz solo ofrece Arquero a los arqueros y no se lo ofrece a los de campo; Mental y Plan del equipo están para todos (`Week.tsx:65`). El foco individual se borra cuando el jugador cambia de club (`career.ts:221`).
16. **Ventaja del foco** (`trainEdge`, `week.ts:136-139`): el foco **vigente al empezar el partido** multiplica ataque, defensa o pelota parada del DT en ese partido (`game.ts:327`). No depende de cuántos días se entrenó.

**Delegación en el ayudante**

17. Con `g.delegate.training` activo, cada día `dayEvents` reemplaza intensidad, foco y descanso por `assistantPlan` (F8) y conserva el parte semanal y las marcas de informe y prensa (`week.ts:298`). Los focos individuales no se tocan. Sin próximo partido no se recalcula y queda el último plan.
18. En la pantalla, el plan delegado se muestra en gris y sin respuesta al mouse (`Week.tsx:40`); el calendario de 7 días muestra el plan del ayudante.

**Informe semanal y entrenamiento de la IA** (lunes, `week.ts:311-323`)

19. Cada lunes (día UTC 1 de la fecha ya avanzada), si en la semana hubo mejoras o lesiones de práctica, sale una noticia `act: 'train'` con las mejoras agrupadas por jugador, los lesionados en la práctica y la intensidad y el foco **de ese día**. Después se vacía el parte, se refresca la bolsa (25 %), corre el mercado de entrenadores (`managerMarket`) y entrenan los planteles de la IA.
20. **Entrenamiento de la IA** (`weeklyAiTraining`, `ai.ts:103-119`): una vez por semana, cada jugador sano de un club que no es el del DT, de 30 años o menos, suma F9 a `tx`; si llega a 1, sube como máximo **un** atributo de su puesto (ponderado igual que la regla 12). La IA no tiene físico de práctica, lesiones de práctica, foco ni cuerpo técnico.
21. **Familiaridad de todos los clubes** tras cada partido: +4 si jugó con el dibujo entrenado; si no, cae 30 (mínimo 30) y toma el nuevo (`game.ts:344`). Es la única fuente de familiaridad de la IA.

### States and Transitions

**Día de entrenamiento del club del DT**

| Estado | Entry Condition | Exit Condition | Behavior |
|--------|----------------|----------------|----------|
| Día de partido | Hay partido del DT hoy | Termina el partido (`finishUserMatch`) | No se entrena. `advanceDay` devuelve `match`. |
| Descanso | `restAfter` y el club jugó ayer | Fin del día | Regla 9: solo recuperación extra. |
| Práctica | Cualquier otro día | Fin del día | Reglas 10-12 con la intensidad y el foco vigentes. |

**Gestión del entrenamiento**

| Estado | Entry Condition | Exit Condition | Behavior |
|--------|----------------|----------------|----------|
| Manual | `delegate.training = false` (inicio) | El DT toca "Delegar en el ayudante" | El DT fija intensidad, foco y descanso; persisten hasta que los cambie. |
| Delegado | El DT toca "Delegar en el ayudante" | El DT toca "✓ Delegado en el ayudante" | Cada día se aplica `assistantPlan`. Al volver a manual queda el último plan del ayudante. |

**Puesto del cuerpo técnico**

| Estado | Entry Condition | Exit Condition | Behavior |
|--------|----------------|----------------|----------|
| Vacante | Desvinculación | Contratación | `sab = 4`. La fila dice "Vacante. Rinde como si lo ocupara alguien muy flojo." |
| Ocupado | Contratación o inicio de partida | Desvinculación (cuesta 3 sueldos) | `sab = ability`; cobra `wage / 30` por día. |

**Progreso de un jugador**: `tx` en [0, 1) → al llegar a 1 sube un atributo y vuelve a `tx − 1`. Lesionado: congelado.

### Interactions with Other Systems

| Sistema | Entra | Sale | Responsable |
|---------|-------|------|-------------|
| `motor-de-partido` | — | `p.cond` del día (efectividad `0,72 + 0,28 × cond/100`, `match.ts:119`), `club.fam` (multiplicador `0,94 + 0,06 × fam/100`, `match.ts:70`), `trainEdge` (ataque, defensa, pelota parada) | El motor lee; este sistema escribe. |
| `plantel` | `p.prof`, `p.birth`, `p.pa`, `POS_WEIGHTS` | `p.attrs`, `p.ca`, `p.pa`, `p.ups`, `p.injury` | Este sistema. |
| `temporada-y-ligas` | Fixture (`nextUserFixture`, partido ayer u hoy) | — | Calendario. `develop` de fin de temporada y `p.ups = 0` son de ese sistema. |
| `economia-y-dirigencia` | `club.balance` (para contratar) | Sueldos diarios e indemnizaciones a `ledger.wages` | Este sistema descuenta. |
| `ojeo` | — | `sab('scout')`: velocidad de ojeo `3 + scout × 0,35` por día (`squad.ts:108`) | Ojeo lee. |
| `prensa-e-informes` | — | `sab('scout')`, `sab('asst')` (precisión del informe), nombre del ayudante (prensa delegada) | Prensa lee. |
| `carrera-del-dt` / `plantel` (juveniles) | — | `sab('youth')`: calidad de la camada `(you − 10) × 0,5 + (youth − 10) × 0,4` (`career.ts:416`); `youth + asst ≥ 18` revela el potencial de los propios (`PlayerPage.tsx:37`) | Lo leen ellos. |
| `ia-rivales` | — | `weeklyAiTraining` | Vive en `ai.ts`, lo llama este sistema los lunes. |
| `comunicacion-y-bandeja` | — | Noticias: lesión en la práctica (`act: 'injury'`), parte semanal (`act: 'train'`), contratación (sin `act`) | La bandeja muestra; este sistema emite. |

## Formulas

Constantes reales de `src/engine/week.ts` salvo que se indique. `fit`, `asst`, `doc` = `sab` del puesto (1–20, vacante 4). `k` = intensidad (0, 1, 2).

**F1. Sueldo de un profesional** (`week.ts:10`)
```
wage = round(900 × 1,22^(ability − 8) / 100) × 100      // US$ por mes
```
| ability | 3 | 4 | 8 | 10 | 12 | 14 | 16 | 18 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| wage | 300 | 400 | 900 | 1.300 | 2.000 | 3.000 | 4.400 | 6.600 | 9.800 |

Curva exponencial: cada punto cuesta 22 % más. Contratar exige caja ≥ 2 × wage; desvincular cuesta 3 × wage.

**F2. Físico en un día de práctica** (`week.ts:107-108`)
```
cap   = [100, 97, 91][k] + (fit − 10) × 0,3 + (foco = fis ? 1,5 : 0)
delta = [3, 0, −3,5][k] × (k = 2 ? 1,25 − fit × 0,025 : 1) + (fit − 10) × 0,25 + (foco = fis ? 1,2 : 0)
cond  = clamp(cond + delta, 20, min(100, cap))
```
| Variable | Tipo | Rango | Fuente | Descripción |
|---|---|---|---|---|
| cond | float | 20–100 | `p.cond` | Físico ya recuperado ese día por `passDays` (+`3,8 + sta × 0,2`, `game.ts:545`) |
| fit | int | 1–20 | `sab('fit')` | Preparador físico |

Ejemplo (fit 10, foco Equilibrado, jugador en 100): Suave queda en 100; Normal baja a 97; Intensa baja a 91 aunque `delta` sea −3,5, porque manda el tope. **Edge case**: el tope se aplica aunque el jugador ya esté por encima, así que una sola práctica intensa lleva a todo el plantel a ≤ 91 (es lo que avisa `Week.tsx:56`).

**F3. Familiaridad diaria** (`week.ts:101-102`)
```
si famKey ≠ formación: famKey = formación; fam = max(30, fam − 30)
fam = min(100, fam + (0,35 + (foco = tact ? 0,75 : 0)) × [0,7, 1, 1,25][k] × (0,75 + asst × 0,025))
```
Ejemplo: asst 10, Normal, Equilibrado: +0,35 por día. Táctico: +1,1. Táctico, Intensa, asst 20: +1,72. Más +4 por partido jugado con ese dibujo (`game.ts:344`). Inicio: 55 para el club del DT, 78 para la IA (`game.ts:262`).

**F4. Riesgo de lesión por jugador y día de práctica** (`week.ts:109`)
```
risk = 0,0007 × [0,4, 1, 2,3][k] × (1,3 − fit × 0,03) × (cond < 75 ? 1,7 : 1)
```
Ejemplo (fit 10, cond ≥ 75): 0,028 % Suave, 0,07 % Normal, 0,161 % Intensa. Con 25 jugadores y 6 prácticas, ~1 lesión cada 10 semanas en Normal y ~1 cada 4 semanas en Intensa. Con fit 20 el factor es 0,7; con fit 4 (vacante), 1,18.

**F5. Factor del médico** (`week.ts:88`)
```
docFactor = clamp(1,15 − doc × 0,016, 0,82, 1,1)
días = max(1, round(U(a, b) × docFactor))
```
doc 4 → 1,086; doc 10 → 0,99; doc 20 → 0,83. Se aplica a las lesiones de práctica y a las de partido del club del DT (`game.ts:370`).

**F6. Progreso diario** (`week.ts:118-119`)
```
ageF = edad ≤ 19: 1,8 | ≤ 21: 1,5 | ≤ 23: 1,15 | ≤ 26: 0,6 | ≤ 29: 0,3 | resto: 0,1
tx  += 0,007 × [0,55, 1, 1,4][k] × ageF × (0,55 + prof / 20) × (0,85 + asst × 0,015) × (ca < pa ? 1 : 0,15)
```
| Variable | Tipo | Rango | Fuente | Descripción |
|---|---|---|---|---|
| prof | int | 1–20 | `p.prof` | Profesionalismo |
| ca, pa | int | 1–99 | `p.ca`, `p.pa` | Nivel actual y potencial |

Ejemplo: 18 años, prof 15, Normal, asst 10: 0,0164 por día → un atributo cada ~61 días de práctica. 30 años, prof 10: 0,00074 → uno cada ~3,7 años. Un jugador que llegó a su potencial progresa al 15 %. **Expected output**: 0 a ~0,033 por día (máximo: ≤ 19 años, prof 20, Intensa, asst 20).

**F7. Ventaja del foco en el partido** (`week.ts:136-139`, usado en `game.ts:327`)
```
att = foco = att ? 1,02 : 1;  def = foco = def ? 1,02 : 1;  sp = foco = sp ? 1,18 : 1
```

**F8. Plan del ayudante** (`week.ts:80-87`)
```
cond = físico medio del once titular (100 si no hay once)
fam  = famKey = formación ? club.fam : 40
intensidad = (días ≤ 1 o cond < 82) ? Suave : (días ≥ 5 y cond ≥ 92) ? Intensa : Normal
foco       = fam < 72 ? Táctico : días ≤ 2 ? Pelota parada : Equilibrado
descanso   = siempre
```
`días` = días hasta el próximo partido del DT, calculados después de avanzar la fecha.

**F9. Progreso semanal de la IA** (`ai.ts:108-109`)
```
ageF = ≤ 19: 1,8 | ≤ 21: 1,5 | ≤ 23: 1,15 | ≤ 26: 0,6 | 27–30: 0,3 | > 30: no entrena
tx  += 6 × 0,007 × ageF × (0,55 + prof / 20) × (ca < pa ? 1 : 0,15)
```
Equivale a seis días de práctica Normal con ayudante de capacidad 10, sin foco, sin lesiones y con tope de un atributo por semana.

**F10. Capacidad inicial y de la bolsa** (`week.ts:18-19`, `27`)
```
inicial = clamp(round(4 + rep × 0,12 + gauss × 2,2), 3, 20)      // rep 80 → media 13,6
libre   = clamp(round(6 + U(0,1) × 12), 3, 20)                     // 6–18
```

## Edge Cases

**Handled in code**

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| Puesto vacante | `sab` devuelve 4 en todas las fórmulas | Castiga dejar el puesto vacío sin romper nada. |
| Contratar con el puesto ocupado o sin caja | `hireStaff` devuelve el texto del error; el botón Contratar está deshabilitado si el puesto está ocupado | Un puesto, una persona. |
| Profesional que ya no está libre | "Ese profesional ya no está disponible." | La bolsa cambia los lunes. |
| Jugador lesionado | No entrena, no progresa, no tira lesión, no recupera con el descanso | La recuperación de lesión es de `passDays`. |
| Atributo elegido en 20 | El punto se pierde | Evita pasar de 20. |
| Cambio de dibujo | Familiaridad −30 (mínimo 30), tanto en la práctica como en el partido | El sistema se asimila entrenándolo. |
| Sin partidos programados | El plan delegado no se recalcula; el calendario dice "No hay partidos programados." | — |
| Parte semanal vacío | No sale noticia ese lunes | Evita ruido. |
| Jugador vendido con foco individual | `tfocus` se borra en el traspaso | — |

**Not yet handled (detectados al analizar)**

| Scenario | Comportamiento actual | Nota |
|----------|----------------------|------|
| Contrato vencido de un profesional | Se extiende un año solo, sin costo ni aviso (`game.ts:655`) | El contrato que muestra la tabla no tiene efecto. |
| Edad del cuerpo técnico | No avanza nunca | Dato decorativo. |
| Caja negativa | Los sueldos se siguen descontando; la caja puede quedar negativa | No hay consecuencia propia de este sistema. |
| Plan delegado con controles en gris | `pointer-events: none` no bloquea el teclado: con Tab se puede cambiar un selector, y el cambio se pisa al día siguiente | Accesibilidad y claridad. |
| Foco individual fuera del puesto | Sube un atributo que no pesa en su puesto: `ca` no cambia | Puede ser intención (formar un jugador para otro puesto). `INTENT UNKNOWN`. |
| Informe semanal | Informa la intensidad y el foco del lunes, no los de la semana | Con delegación, lo de ese día. |
| Lesiones de partido | No figuran en el parte semanal | Solo cuenta las de práctica. |

**Degenerate strategies**

- **Foco Pelota parada fijo**: +18 % de pelota parada todos los partidos sin costo de físico. Su único costo es entrenar pocos atributos (set, hea, cro, jmp). Candidato a estrategia dominante. Ver Open Questions.
- **Cambiar el foco el día del partido**: `trainEdge` mira el foco vigente al jugar, no el de la semana. Se puede entrenar Táctico o Físico toda la semana y pasar a Ataque, Defensa o Pelota parada solo para el partido.
- **Intensa sin consecuencias en el partido**: con descanso y Suave el día previo, el plantel se recupera a ~97-100. El dilema depende de que el DT recuerde bajar la carga. El ayudante lo hace solo.

## Dependencies

| System | Direction | Nature of Dependency |
|--------|-----------|---------------------|
| `motor-de-partido` | El motor depende de este | Lee `cond`, `fam`, `trainEdge`. |
| `plantel` | Mutua | Lee profesionalismo, edad y potencial; escribe atributos, `ca`, `pa`, lesiones. |
| `temporada-y-ligas` | Este depende | Calendario de partidos; ciclo de días (`advanceDay`, `finishUserMatch`); extensión de contratos al cambiar de temporada. |
| `economia-y-dirigencia` | Este depende | Caja para contratar; escribe sueldos e indemnizaciones. |
| `ia-rivales` | La IA depende de este | `weeklyAiTraining` corre desde el lunes de `dayEvents`. |
| `ojeo`, `prensa-e-informes`, `carrera-del-dt` | Dependen de este | Leen `sab` de scout, asst y youth. |
| `comunicacion-y-bandeja` | Depende de este | Recibe noticias `injury`, `train` y de contratación. |

**Técnicas**: `Rng` con semilla (`withRng`), estado serializable en `Game` (`g.staff`, `g.training`, `g.delegate`). **Contenido**: nombres del cuerpo técnico de `NOMBRES` y `APELLIDOS` (`career.ts`), ficticios.

## Tuning Knobs

Todas las constantes están en el código (`week.ts`, `ai.ts`), no en archivos de datos. Ver Open Questions.

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| Tope de físico por intensidad (curve) | 100 / 97 / 91 | Intensa 85–95 | Intensa casi gratis | Intensa castiga cualquier partido cercano |
| Riesgo base de lesión (curve) | 0,0007 por día | 0,0003–0,0015 | Más bajas, plantel corto | Intensa sin riesgo real |
| Multiplicador de riesgo por intensidad (curve) | 0,4 / 1 / 2,3 | Intensa 1,5–3 | Intensa desaconsejada | Siempre Intensa |
| Progreso base (curve) | 0,007 por día | 0,004–0,01 | Planteles que crecen rápido; inflación de nivel | Juveniles estancados |
| Factor de edad (curve) | 1,8 / 1,5 / 1,15 / 0,6 / 0,3 / 0,1 | — | — | — |
| Mejora por intensidad (curve) | 0,55 / 1 / 1,4 | Intensa 1,2–1,6 | Más incentivo a Intensa | Intensa solo por la familiaridad |
| Familiaridad base y bonus táctico (curve) | 0,35 + 0,75 por día | — | Cambiar de dibujo casi gratis | Dibujos casi fijos |
| Caída por cambio de dibujo (gate) | −30, mínimo 30 | 15–40 | Castiga experimentar | Cambiar sin costo |
| Familiaridad por partido (curve) | +4 | 2–6 | La IA se adapta rápido | — |
| Bonus de foco en el partido (feel) | 1,02 / 1,02 / 1,18 | sp 1,05–1,12 | — | Focos de partido irrelevantes |
| Descanso posterior (curve) | +6 + (fit − 10) × 0,3 | 4–8 | Partidos seguidos sin costo | Descanso inútil |
| Sueldo del cuerpo técnico (curve) | 900 × 1,22^(ab − 8) | base 1,15–1,3 | Cuerpo técnico caro | Todos con capacidad 20 |
| Indemnización (gate) | 3 sueldos | 1–6 | Cambiar de cuerpo técnico caro | Rotar sin pensar |
| Bolsa de libres (gate) | 4 por puesto, 6–18, 60 % siguen, 25 % por lunes | — | Más fácil encontrar un 18 | — |
| Factor del médico (curve) | 1,15 − doc × 0,016 (0,82–1,1) | — | — | — |
| Umbrales del ayudante (feel) | cond 82 / 92, días 1 / 2 / 5, fam 72 | — | — | — |
| Progreso de la IA (curve) | 6 días equivalentes por semana, ≤ 30 años, 1 atributo máximo | — | Rivales que crecen más que el DT | Ventaja del DT por entrenar |

**Balance concerns**
- ⚠️ El foco Pelota parada (× 1,18) es 9 veces más fuerte que Ataque o Defensa (× 1,02) y se elige el mismo día del partido. Hace falta medir cuánto mueve los goles con `npm run sim`.
- ⚠️ El costo del cuerpo técnico (máximo ~9.800 por mes por puesto) es chico frente a los presupuestos de Primera: el dilema económico casi no existe en los clubes grandes. A medir contra la economía (`economia-y-dirigencia`).
- Pasada recomendada: `/balance-check` del crecimiento de un juvenil (F6 más `develop`) contra el de un juvenil de la IA (F9 más `develop`) durante 3 temporadas.

## Visual/Audio Requirements

El juego no tiene audio (`design/accessibility-requirements.md`). Columna de audio: "—".

| Event | Visual Feedback | Audio Feedback | Priority |
|-------|----------------|---------------|----------|
| Cambio de intensidad o foco | Título del encabezado ("Intensa · Táctico"), texto de ayuda debajo del selector, calendario de 7 días | — | Alta (implementado) |
| Progreso del jugador | Barra "Progreso" (`tx × 100 %`) y "Mejoras" (+N en verde) en Trabajo individual | — | Alta (implementado) |
| Lesión en la práctica | Noticia en la bandeja con la cara del jugador; ícono de estado en el plantel | — | Alta (implementado) |
| Físico bajo | KPI "Físico medio" en color de aviso por debajo de 85 % | — | Media (implementado) |
| Capacidad del cuerpo técnico | Barra de 0 a 20 en verde ≥ 15, amarillo ≥ 10, rojo < 10 (`AbBar`) | — | Media (implementado) |
| Dibujo nuevo | Chip "Dibujo nuevo: el equipo tarda unos partidos en adaptarse" en Tácticas | — | Media (implementado) |

## Game Feel

**Feel Reference.** La planilla semanal de un DT: decidir la carga mirando el calendario. Referencia de género: el entrenamiento por calendario de Football Manager (programar la semana y ver el efecto en el físico), con mucha menos granularidad. **Anti-referencia**: un minijuego de entrenamiento o una planilla de 20 controles por jugador.

**Input Responsiveness**

| Action | Max Input-to-Response Latency (ms) | Frame Budget (at 60fps) | Notes |
|--------|-----------------------------------|------------------------|-------|
| Cambiar intensidad o foco | 100 | 6 | Guarda y redibuja (`save(); refresh()`). |
| Cambiar foco individual | 100 | 6 | Selector nativo. |
| Contratar o desvincular | 100 | 6 | Desvincular pide confirmación en la misma fila con el costo. |

**Animation Feel Targets**: no aplica (no hay animaciones propias de este sistema).

**Impact Moments**

| Impact Type | Duration (ms) | Effect Description | Configurable? |
|-------------|--------------|-------------------|---------------|
| Parte del lunes | — | Mensaje en la bandeja con quién mejoró | No |
| Barra de progreso llena | — | La barra vuelve a cero y "Mejoras" suma 1 | No |

**Weight and Responsiveness Profile.** Peso medio y diferido: cada decisión cuesta un clic y se nota días después, en el físico del día del partido o en el parte del lunes. Control total (todo se puede cambiar en cualquier momento, sin compromiso). Paso discreto (tres intensidades, seis focos). La falla se lee como justa si el DT ve el físico de 91 % antes del partido; hoy el aviso existe (`Week.tsx:56`), pero el juego no avisa al jugar con el plantel cargado.

**Feel Acceptance Criteria**
- [ ] En una prueba de juego, el jugador explica sin ayuda por qué su equipo llegó con 91 % de físico.
- [ ] Ningún jugador de prueba dice que el entrenamiento "no hace nada" después de 4 semanas de juego.
- [ ] Un jugador que delega todo termina la primera temporada sin sentir que perdió partidos por eso.

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|-------------|-----------------|-----------------|-----------|
| Intensidad y foco vigentes, días al próximo partido, quién lo maneja | Entrenamiento (`TrainingPage`, encabezado) | Al cambiar o al avanzar | Siempre |
| Físico medio, familiaridad (proyectada si el dibujo cambió), capacidad del preparador físico | Entrenamiento, KPIs | Igual | Siempre |
| Selectores de intensidad, foco y descanso con su ayuda | Entrenamiento, "Plan de la semana" | Igual | Deshabilitados si está delegado |
| Calendario de 7 días (partido, local o visita, Descanso, intensidad) | Entrenamiento, "Los próximos 7 días" | Igual | Siempre |
| Por jugador: físico, progreso (`tx`), mejoras de la temporada, foco individual | Entrenamiento, "Trabajo individual" | Igual | Siempre |
| Intensidad y foco con "(ayudante)" y botón Ajustar | Inicio, mosaico "Para atender" (`Home.tsx:131`) | Igual | Siempre |
| Puestos con nombre, capacidad, edad, sueldo, contrato y Desvincular con confirmación y costo | Cuerpo técnico (`StaffPage`) | Al cambiar | Siempre |
| Profesionales libres por puesto, con Contratar | Cuerpo técnico, "Profesionales libres" | Al refrescarse la bolsa | Contratar deshabilitado si el puesto está ocupado |
| Sueldos del cuerpo técnico por mes y caja | Cuerpo técnico, KPIs | Igual | Siempre |
| Parte semanal con botón "Ir a Entrenamiento" | Bandeja (`Inbox.tsx:201`) | Lunes | Si hubo mejoras o lesiones |
| Lesión en la práctica | Bandeja, categoría Plantel | Al ocurrir | — |
| Ayuda de la pantalla | `PageTip id="training"` (`Guide.tsx:77`) | — | Hasta que se descarta |

**Faltan**: aviso al jugar con el plantel cansado por la práctica; ver qué atributo subió desde la tabla de trabajo individual (solo está en el parte semanal); motivo por el que el ayudante eligió su plan.

## Cross-References

| This Document References | Target GDD | Specific Element Referenced | Nature |
|--------------------------|-----------|----------------------------|--------|
| El físico y la familiaridad afectan la efectividad | `design/gdd/motor-de-partido.md` | `x.eff` (`match.ts:119`), `s.fam` (`match.ts:70`), boost por foco (`game.ts:327`) | Data dependency (ellos consumen) |
| Recuperación de base y lesiones de partido | `design/gdd/motor-de-partido.md` | `res.injuries` con `docFactor` | Rule dependency |
| Evolución de fin de temporada | `design/gdd/temporada-y-ligas.md` | `develop`, `p.ups = 0`, extensión de contratos del cuerpo técnico | Rule dependency |
| Atributos, potencial y profesionalismo | `design/gdd/plantel.md` | `p.attrs`, `p.ca`, `p.pa`, `p.prof`, `POS_WEIGHTS` | Data dependency |
| Calidad de los juveniles | `design/gdd/carrera-del-dt.md` | Camada con `sab('youth')` | Data dependency (ellos consumen) |
| Velocidad del ojeo | `design/gdd/ojeo.md` | `3 + sab('scout') × 0,35` | Data dependency (ellos consumen) |
| Precisión del informe y prensa delegada | `design/gdd/prensa-e-informes.md` | `sab('scout')`, `sab('asst')`, nombre del ayudante | Data dependency (ellos consumen) |
| Entrenamiento de los rivales | `design/gdd/ia-rivales.md` | `weeklyAiTraining` | Ownership handoff |
| Caja y sueldos | `design/gdd/economia-y-dirigencia.md` | `club.balance`, `ledger.wages` | Data dependency |
| Noticias de lesión, parte y contratación | `design/gdd/comunicacion-y-bandeja.md` | `news()` con `act: 'injury'`, `'train'` | State trigger |

## Acceptance Criteria

**Funcionales (implementados)**
- [x] Con fit 10 y foco Equilibrado, un jugador sano en 100 % termina una práctica en 100 (Suave), 97 (Normal) o 91 (Intensa).
- [x] Con descanso activo, el día después de un partido nadie suma progreso ni familiaridad, y cada jugador sano suma `6 + (fit − 10) × 0,3` de físico además de la recuperación de base.
- [x] El día de partido no corre `dailyTraining`.
- [x] Cambiar de dibujo baja la familiaridad 30 puntos (mínimo 30) la primera vez que se entrena o se juega con él.
- [x] Con un puesto vacante, todos los efectos de ese puesto usan capacidad 4.
- [x] `hireStaff` rechaza la contratación si la caja es menor que 2 sueldos o si el puesto está ocupado.
- [x] `fireStaff` descuenta 3 sueldos y deja al profesional en la bolsa.
- [x] Un jugador con `tx` ≥ 1 sube exactamente un atributo ese día, `tx` baja 1 y `p.ups` suma 1.
- [x] Con delegación, el día previo a un partido el plan es Suave, y con familiaridad < 72 el foco es Táctico.
- [x] Cada lunes con mejoras o lesiones de práctica sale una noticia `act: 'train'` y el parte se vacía.
- [x] Los jugadores de la IA de más de 30 años no suben atributos con `weeklyAiTraining`.
- [x] El foco Pelota parada multiplica por 1,18 la pelota parada del DT en el partido.

**Falta (no implementado)**
- [ ] Los contratos del cuerpo técnico vencen y el profesional pide renovar o se va.
- [ ] Las constantes de este sistema viven en un archivo de datos.
- [ ] Rendimiento: `dailyTraining` con 40 jugadores corre en menos de 1 ms (el día completo cuesta ~1 ms de mediana según `CLAUDE.md`; a medir para este paso).

**Experienciales (prueba de juego)**
- [ ] Con 3 partidos en 8 días, el jugador que no baja la carga nota menos físico y se da cuenta de la causa.
- [ ] Un juvenil de 18 años con buen profesionalismo sube entre 3 y 6 atributos por temporada solo por la práctica (más la evolución de fin de temporada).

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ¿El × 1,18 de Pelota parada es intencional? Es 9 veces el bonus de Ataque o Defensa y se puede elegir el mismo día del partido. | usuario | Próxima pasada de balance (`npm run sim -- 2`) | `INTENT UNKNOWN` |
| ¿La ventaja del foco tiene que exigir días entrenados (por ejemplo, el foco de los últimos 3 días)? Hoy cuenta el del día del partido. | usuario | Ídem | Pendiente |
| ¿Los contratos del cuerpo técnico tienen que vencer? Hoy se extienden solos (`game.ts:655`) y la edad no avanza. | usuario | Antes de la segunda temporada de prueba | `INTENT UNKNOWN` |
| ¿El foco individual tiene que poder subir atributos que no pesan en el puesto? (`ca` no cambia) | usuario | — | `INTENT UNKNOWN` |
| `CLAUDE.md` todavía lista "que los rivales entrenen" como pendiente (Plan de jugabilidad 2 y Pendiente 2), pero `weeklyAiTraining` ya existe. ¿Se da por hecho? | usuario | Próxima edición de `CLAUDE.md` | Pendiente (este documento no toca `CLAUDE.md`) |
| ¿El cuerpo técnico de los clubes de la IA tiene que existir? Hoy solo lo tiene el club del DT. | usuario | — | Pendiente |
| ¿Hay que avisar al jugar con el plantel cargado o al dejar un puesto vacante? | usuario + ux-designer | — | Pendiente |
| Mover las constantes a un archivo de datos (la norma del agente lo pide; el proyecto hoy las tiene en código). | usuario + lead-programmer | — | Pendiente |

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-11-14 | Claude (reverse-doc) | Documentación inicial desde `src/engine/week.ts`, `src/engine/ai.ts`, `src/ui/Week.tsx` |

*Generado por `/reverse-document design src/engine/week.ts`.*
