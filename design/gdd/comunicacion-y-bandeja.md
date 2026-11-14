---
status: reverse-documented
source: src/engine/game.ts (news, advanceDay), src/engine/types.ts (News), src/ui/Inbox.tsx, src/ui/App.tsx, src/ui/Home.tsx, src/ui/TopNav.tsx
date: 2026-11-14
verified-by: pending review
---

# Comunicación y bandeja

> **Reverse-documented from implementation** — generado por `/reverse-document` desde
> `src/engine/game.ts` (`news`, `advanceDay`), `src/engine/types.ts` (`News`), `src/ui/Inbox.tsx`, `src/ui/App.tsx`, `src/ui/Home.tsx` y `src/ui/TopNav.tsx` el 2026-11-14, en el commit `d9b251a`.
> Esto registra lo que el código **hace**; lo marcado `INTENT UNKNOWN` se infirió y el autor no lo confirmó.
> Donde este documento y el código no coincidan, no supongas que el documento es el requisito.

> Authoring guidance: .claude/docs/templates/guidance/game-design-document-guide.md

> **Status**: Implemented
> **Author**: usuario + game-designer (reverse-doc)
> **Last Updated**: 2026-11-14
> **Last Verified**: 2026-11-14 (contra el commit `d9b251a`)
> **Implements Pillar**: Principio 4 de `docs/plan-ui-ux.md`, "La información viene a vos" (bandeja única con acciones directas; el botón de continuar muestra qué está pendiente), y etapa 2 del plan de UI/UX ("bandeja de entrada y ritmo"). Sostiene el bucle de "La semana" del plan de jugabilidad.
> **Related UX spec**: `design/ux/bandeja.md` (se revisa contra este documento; las diferencias están en UI Requirements y Open Questions).

## Summary

El sistema de mensajes del juego: todo lo que pasa en el mundo y le importa al DT llega como una noticia con, si corresponde, la acción para resolverlo en el mismo mensaje; lo que espera una respuesta (ofertas, ofertas de trabajo, jugadores que quieren irse, conferencias, fin de temporada) se calcula del estado como "pendiente" y frena el avance hasta el partido cuando aparece algo nuevo. Existe para que el DT sepa de un vistazo qué tiene que decidir antes de seguir y no se entere tarde.

> **Quick reference** — Layer: `Foundation` (el modelo de noticias y pendientes) + `Presentation` (bandeja, insignias, mosaico) · Priority: `MVP` (implementado) · Key deps: todos los sistemas que emiten noticias; `mercado-de-pases`, `carrera-del-dt`, `plantel`, `prensa-e-informes` para las decisiones.

## Overview

**Propósito.** Unificar la comunicación del juego en un solo canal y convertir cada aviso accionable en un mensaje con su botón. **Alcance.** Incluye el modelo `News` y su emisor `news()` (campos `pid`, `act`, `ref`, `me`, `read`), la poda, el catálogo de emisores del motor, las decisiones pendientes (`pendingOf`, `pendingText`, `decisionKeys`), el estado leído/no leído, el freno del avance (`advance` en `App.tsx`), los vencimientos, las insignias y el botón de pendientes, la bandeja (`Inbox.tsx`) y el mosaico "Mensajes" del Inicio (`Home.tsx`). **Queda afuera:** las reglas de cada decisión (aceptar una oferta, aceptar un trabajo, hablar con un jugador, responder la prensa), que son de `mercado-de-pases`, `carrera-del-dt`, `plantel` y `prensa-e-informes`; aquí solo importan su vigencia y su acción en el mensaje. El diseño visual y de interacción detallado de la pantalla es de `design/ux/bandeja.md`.

**Current implementation.** Las noticias viven en `g.news` (más nueva primero, se guardan con la partida). Los pendientes **no se guardan**: `pendingOf(g)` los recalcula del estado en cada dibujo, así nunca queda un pendiente viejo (`Inbox.tsx:20-29`). La bandeja muestra pendientes arriba y mensajes abajo, en lista y lectura lado a lado.

**Design intent (inferido de `docs/plan-ui-ux.md` y comentarios del código):**
- "Lo que tenés que decidir aparece primero" (`Guide.tsx:80`).
- Responder una oferta en 1 clic desde Pendientes (plan de UI/UX, etapa 2).
- El avance no frena por cualquier noticia, solo por una decisión nueva (`App.tsx:124-127`).
- Los mensajes del DT duran más que las noticias del resto del fútbol (`game.ts:179`).

## Player Fantasy

`[inferred — confirm]` La bandeja es el escritorio del DT entre partido y partido: arriba lo que hay que firmar, abajo la correspondencia, y cada papel trae la lapicera. Apretás "Ir al partido" con tranquilidad porque, si llega algo que necesita tu firma, el juego se frena y te lo pone adelante. Estética MDA: **Submission** (ritmo cómodo de avanzar sin miedo) y **Fantasy** (ser el que recibe los llamados); secundaria **Narrative** (la temporada contada en titulares). SDT: **Autonomy** (decidís qué atender y qué dejar que venza o delegar) y **Competence** (nunca te enterás tarde de algo que podías resolver). El sentimiento a evitar: "me vendieron la oferta" o "venció y no me avisó".

## Detailed Design

### Core Rules

#### A. El mensaje (`News`, `types.ts:232-247`)

| Campo | Tipo | Significado |
|-------|------|-------------|
| `id` | int | `g.nextId++` al crearse (contador compartido con otras entidades no jugador). |
| `date` | ISO | `g.date` al crearse. |
| `title`, `body` | texto | Escritos por el emisor, en español rioplatense. |
| `tag` | `partido` · `torneo` · `lesion` · `club` · `mercado` · `premio` · `directiva` | Tema. La interfaz lo muestra como Partido, Torneo, Parte médico, Club, Mercado, Premio, Dirigencia (`Inbox.tsx:55`). |
| `clubId?` | int | Club del que habla (escudo en la fila y tarjeta del club). |
| `pid?` | int | Jugador del que habla (cara en la fila y tarjeta del jugador). |
| `act?` | `offer` · `job` · `out` · `scout` · `rival` · `train` · `result` · `injury` | Qué se puede hacer desde la bandeja. |
| `ref?` | int | Referencia de la acción: id de la oferta (`offer`), del club (`job`) o del partido (`rival`, `result`). |
| `me?` | `true` o ausente | Es para el DT. Solo se escribe cuando es verdadero. |
| `read?` | `true` o ausente | Ausente = sin leer. |

#### B. Emisión (`news()`, `game.ts:176-185`)

1. `me` se calcula **una sola vez, al crear el mensaje** (F1): verdadero si `clubId` es el club del DT, o si tiene `act`, o si `pid` es un jugador que en ese momento está en el club del DT.
2. El mensaje se agrega **al principio** de `g.news` con `id` y `date`.
3. Poda (F2): si hay más de 320, se borran los más viejos que **no** son `me` hasta dejar 300; si aun así quedan más de 400, se corta a 400 (ahí sí caen mensajes `me`, los más viejos).
4. Regla de proyecto (`CLAUDE.md`): al crear una noticia nueva desde el motor hay que completar `pid`, `act` y `ref` para que la bandeja ofrezca la acción.

La interfaz decide el alcance con `isMine(g, n) = n.me ?? n.clubId === g.userClubId` (`Inbox.tsx:45`): el `clubId` actual es el respaldo para mensajes sin `me`.

#### C. Catálogo de emisores

Todas las llamadas a `news()` del código (45 en `src/engine/`, 1 en `src/ui/`). "Para el DT" aplica F1 al momento de emitir.

| Origen (archivo:línea) | Cuándo | `tag` | `clubId` | `pid` | `act` / `ref` | ¿Para el DT? |
|---|---|---|---|---|---|---|
| `game.ts:279` | Nueva partida: "{DT} asume en {club}" | club | DT | — | — | Sí |
| `game.ts:300` | Se actualizó la base de jugadores | club | — | — | — | **No** (le habla al DT: "Revisá tu once") |
| `game.ts:371` | Lesión en un partido de un jugador del DT | lesion | DT | jugador | `injury` | Sí |
| `game.ts:400` | Resultado de un partido del DT | partido | DT | figura | `result` / partido | Sí |
| `game.ts:437` | Primera: definidos los octavos | torneo | — | — | — | No |
| `game.ts:447` | Campeón de liga o copa de liga | torneo | campeón | — | — | Si el campeón es el DT |
| `game.ts:474`, `475` | Primera Nacional: descensos; final por el ascenso | torneo | — | — | — | No |
| `game.ts:483`, `498` | Ascenso directo; ganador del Reducido | torneo | ganador | — | — | Si es el DT |
| `game.ts:516` | Fin de temporada | torneo | — | — | — | No |
| `game.ts:522` | Clasificados a las copas | torneo | — | — | — | No |
| `game.ts:525` | Goleador de la temporada | premio | su club | goleador | — | Si es del DT |
| `game.ts:537` | Balance de la dirigencia sobre el objetivo | directiva | DT | — | — | Sí |
| `game.ts:666` | Arranca la temporada | torneo | — | — | — | No |
| `week.ts:40` | Contratación en el cuerpo técnico | club | DT | — | — | Sí |
| `week.ts:114` | Lesión en la práctica | lesion | DT | jugador | `injury` | Sí |
| `week.ts:286` | Conferencia respondida (por el DT o el ayudante) | club | DT | — | — | Sí |
| `week.ts:303` | Informe del rival (3 días antes) | club | rival | — | `rival` / partido | Sí (por `act`) |
| `week.ts:317` | Parte semanal del entrenamiento (lunes) | club | DT | — | `train` | Sí |
| `squad.ts:83` | Un jugador quiere irse | club | DT | jugador | `out` | Sí |
| `squad.ts:99`, `104` | Promesa cumplida o rota | club | DT | jugador | — | Sí |
| `squad.ts:116` | Ojeo completo de un jugador ajeno | mercado | su club | jugador | `scout` | Sí (por `act`) |
| `squad.ts:131` | Resultado de la reserva (miércoles) | partido | DT | — | — | Sí |
| `squad.ts:259` | Renovación de un jugador del DT | club | DT | jugador | — | Sí |
| `cups.ts:110` | Ascensos desde la tercera categoría | torneo | — | — | — | No |
| `cups.ts:121`, `165` | Campeón de copa | torneo | campeón | — | — | Si es el DT |
| `cups.ts:127` | El DT avanzó o quedó afuera en la Copa Argentina | torneo | DT | — | — | Sí |
| `cups.ts:141` | El DT pasó o no la fase de grupos internacional | torneo | DT | — | — | Sí |
| `career.ts:82` | El DT fue despedido | directiva | DT | — | — | Sí |
| `career.ts:105` | El DT firmó con otro club | club | club nuevo | — | — | Sí |
| `career.ts:114` | Un club que había ofrecido trabajo nombra DT | club | ese club | — | — | No |
| `career.ts:132` | Oferta de trabajo a mitad de temporada | directiva | club | — | `job` / club | Sí (por `act`) |
| `career.ts:135` | Otro club echó a su DT | club | ese club | — | — | No |
| `career.ts:148` | Oferta de trabajo de fin de temporada | directiva | club | — | `job` / club | Sí (por `act`) |
| `career.ts:228` | Pase entre clubes argentinos (del DT o de US$ 1,5 M o más) | mercado | comprador | jugador | — | Si compra el DT; **no si vende el DT** (el jugador ya cambió de club) |
| `career.ts:238` | Venta al exterior | mercado | vendedor | jugador | — | Si vende el DT |
| `career.ts:293` | Un club pagó la cláusula de un jugador del DT | mercado | DT | jugador | — | Sí |
| `career.ts:315` | Un club de la IA compra en el exterior (≥ US$ 1,5 M) | mercado | comprador | jugador | — | No |
| `career.ts:339` | Oferta por un jugador del DT | mercado | DT | jugador | `offer` / oferta | Sí |
| `career.ts:396` | Se retira un jugador del DT | club | DT | jugador (se borra) | — | Sí |
| `career.ts:402` | Un jugador del DT se va libre | mercado | DT | jugador | — | Sí |
| `career.ts:420` | Suben juveniles al plantel del DT | club | DT | mejor juvenil | — | Sí |
| `Locker.tsx:101` | Se cayó un pase por el jugador | mercado | DT | — | — | Sí |

#### D. Acción en el mensaje (`Message`, `Inbox.tsx:189-213`)

| `act` | Etiqueta en la fila (`ACT_LABEL`) | Acción si está vigente | Vigencia | Si no está vigente |
|---|---|---|---|---|
| `offer` | "para responder" | Tarjetas Oferta, Valor, Sueldo, Contrato; Aceptar (deshabilitado con el libro cerrado), Pedir más, Rechazar | Existe en `g.offers` una oferta con `id = ref` y el jugador existe | "Esta oferta ya fue respondida o venció." |
| `job` | "oferta de trabajo" | Aceptar, Rechazar, Ver el club | Existe en `g.jobOffers` con `clubId = ref` y `until ≥ hoy` | "La oferta ya no está vigente." |
| `out` | "quiere irse" | Hablar con él (ficha, pestaña Personal); Declararlo transferible (si no lo es) | El jugador existe y `wantsOut` | "Ya no pide irse." (sin texto si el jugador ya no existe) |
| `scout` | "informe" | Ver la ficha; Ofertar (pestaña Contrato) si no es del DT | El jugador existe | Sin acción |
| `rival` | "informe" | Ver el informe del rival (ventana con sugerencias aplicables) | `ref` es el próximo partido del DT | "Ese partido ya se jugó." |
| `train` | "informe" | Ir a Entrenamiento | Siempre | — |
| `result` | "ver informe" | Ver el informe del partido | El partido existe | Sin acción |
| `injury` | (vacía) | Ninguna | — | — |
| sin `act`, `tag: 'torneo'` | — | Ver posiciones | Siempre | — |

Todo mensaje muestra además: tema, fecha completa, título, una tarjeta del jugador (cara, club, puesto, valoración; abre la ficha) y una del club si es otro que el del jugador (abre la ficha), y el cuerpo.

#### E. Pendientes (`pendingOf`, `Inbox.tsx:20-29`)

5. Se calculan en este orden fijo, y ese es el orden en que se muestran:

| Tipo `k` | Condición | Clave (`key`) | Fila: título · meta |
|---|---|---|---|
| `season` | `g.seasonOver` | `season` | "Terminó la temporada {año}" · "Comenzá la próxima desde acá" |
| `press` | `g.press` no nulo | `press{fixtureId}{kind}` | "Conferencia de prensa previa / después del partido" · "Si no respondés, habla el ayudante" |
| `job` | cada `g.jobOffers` con `until ≥ hoy` | `job{clubId}` | "{club} te quiere como DT" · "Respondé antes del {until}" |
| `offer` | cada `g.offers` cuyo jugador existe | `offer{id}` | "{club} ofrece {monto} por {jugador}" · "Vence el {date + 8}" |
| `out` | cada jugador del DT con `wantsOut` y no transferible | `out{pid}` | "{jugador} quiere irse" · "Hablale o declaralo transferible" |

6. `pendingText` arma la frase "Pendiente: la nueva temporada, una conferencia, 2 ofertas de trabajo, una oferta por un jugador y un jugador que quiere irse" (singular o plural por tipo, comas y "y" final; `Inbox.tsx:31-40`).
7. `decisionKeys(g)` = las claves de todos los pendientes **menos** `season` (`Inbox.tsx:42`).
8. El detalle de cada pendiente (`PendDetail`, `Inbox.tsx:166-187`):
   - `press`: preguntas entre comillas; Responder (abre la ventana de prensa), Que hable el ayudante.
   - `offer`: tarjeta del jugador y del club comprador; las mismas acciones que el mensaje `offer`.
   - `job`: tarjeta del club; división, reputación, presupuesto, "Tenés tiempo hasta el {until}"; Aceptar, Rechazar, Ver el club.
   - `out`: tarjeta del jugador; conformidad; Hablar con él, Declararlo transferible.
   - `season`: "El resumen está en el inicio."; Ir al inicio.

#### F. Leído y no leído

9. Un mensaje pasa a leído cuando **queda activo** en el panel de lectura de la bandeja (`Inbox.tsx:75`). Queda activo al tocarlo, al recorrer la lista con ↑ ↓ y **por la selección automática**: si no hay selección válida, el activo es la primera fila de la lista (`Inbox.tsx:72`). Si la primera fila es un pendiente, ningún mensaje se marca solo.
10. "Marcar {N} como leídas" aparece si la vista tiene mensajes sin leer y marca todos los de la vista (máximo 120; `Inbox.tsx:99`).
11. El Inicio nunca marca leído. No hay forma de volver un mensaje a "sin leer".
12. Los pendientes no tienen estado leído: están mientras la decisión siga abierta.
13. `unreadOf(g)` cuenta los mensajes sin leer **para el DT** (`isMine`; `Inbox.tsx:56`). Los del resto del fútbol nunca cuentan, aunque en "Todo el fútbol" se dibujan en negrita si no tienen `read`.

#### G. Vistas de la bandeja (`CATS`, `Inbox.tsx:46-54`)

| Pestaña | Contenido | Contador |
|---|---|---|
| Para vos (por defecto) | Pendientes + mensajes `isMine` | sin leer + pendientes |
| Pendientes | Solo pendientes | pendientes |
| Plantel | `isMine` y (`lesion`, o `club` con `pid`, o `act` `out` o `train`) | — |
| Mercado | `tag: 'mercado'` (propios y ajenos) | — |
| Partidos | `tag: 'partido'` o `act: 'rival'` (propios y ajenos) | — |
| Torneos | `tag` `torneo` o `premio` | — |
| Todo el fútbol | Todo | — |

14. Cada vista muestra como máximo los **120** mensajes más nuevos que cumplen (`Inbox.tsx:68`), sin "mostrar más".
15. La pestaña elegida se recuerda entre visitas (`useSticky('ib.cat')`) y se puede abrir por ruta (`nav({ page: 'inbox', tab })`). Cambiar de pestaña agrega una entrada al historial y borra la selección.
16. Los mensajes `directiva` (ofertas de trabajo, balance de la dirigencia, despido) no tienen pestaña propia: están en Para vos y Todo el fútbol.

#### H. Avance y freno (`advance`, `App.tsx:128-155`; `advanceDay`, `game.ts:557-571`)

17. **Continuar** (un día, botón principal o Espacio): corre un `advanceDay`, guarda y, si el resultado es `press`, abre la ventana de prensa. **No** lleva a la bandeja si aparece una decisión nueva.
18. **Ir al partido** (▸▸ o Mayús + Espacio):
    1. Toma la foto `before = decisionKeys(g)`.
    2. Repite `advanceDay`, cediéndole el turno al navegador **45 ms** entre días y mostrando "Avanzando · {fecha}" con barra de progreso (días hechos / días hasta el partido).
    3. Se detiene si `advanceDay` devuelve `match`, `season` o `press`; si aparece **una clave nueva** que no estaba en `before`; si el jugador frena (botón Frenar, Esc o Espacio); o a los 400 días.
    4. Al detenerse guarda; con `press` abre la ventana de prensa; con una decisión nueva navega a `inbox`, pestaña `pend`.
19. **Jugar** (hay partido hoy): abre el partido; no avanza días.
20. **Nueva temporada** (temporada terminada): va al Inicio. `advanceDay` devuelve `season` y no avanza mientras `seasonOver` o con el DT despedido.
21. Al empezar cada `advanceDay`, si hay una conferencia abierta, **la responde el ayudante** (`game.ts:560`).
22. Lo que **no** frena: noticias sin decisión (lesiones, resultados, informe del rival, parte semanal, ojeo completo), decisiones que ya estaban pendientes al empezar el avance (aunque venzan en el camino) y una oferta que reaparece con la misma clave.

#### I. Vencimientos

| Decisión | Plazo | Dónde se aplica | Qué pasa al vencer | ¿Queda rastro? |
|---|---|---|---|---|
| Oferta por un jugador | Vigente mientras `hoy ≤ o.date + 8` | `marketTick` (`career.ts:266`), que corre en `passDays` **antes** de cambiar la fecha | Se borra de `g.offers` | No. El mensaje original pasa a "Esta oferta ya fue respondida o venció." |
| ↳ otros cierres | — | Venta o traspaso del jugador (`career.ts:225`, `243`), Rechazar, Pedir más fallido, nueva temporada (`game.ts:654`), cambio de club (`career.ts:104`) | Se borra | No |
| Oferta de trabajo a mitad de temporada | `until = emisión + 6` | `pendingOf` la oculta desde `until + 1`; `managerMarket` la borra el lunes siguiente (`career.ts:112-116`) | El club nombra un DT nuevo (noticia que no es para el DT) | Indirecto |
| Oferta de trabajo de fin de temporada | `until = emisión + 20` | Igual; mientras la temporada está terminada no corre el tiempo | Vence si la temporada nueva (10 de enero) empieza después de `until` | No |
| Conferencia previa o posterior | Hasta el próximo `advanceDay` o el final del próximo partido | `game.ts:560`, `585` | Responde el ayudante con la opción 0 | Sí: noticia "{ayudante}: «…»" |
| ↳ cierres sin efecto | — | Nueva temporada (`game.ts:658`), cambio de club | Se descarta sin efectos | No |
| Jugador que quiere irse | No vence | — | Sigue pendiente hasta que se lo declare transferible o deje de pedir irse | — |
| Informe del rival (acción del mensaje) | Hasta que el partido deja de ser el próximo | `Message` | "Ese partido ya se jugó." | — |
| Fin de temporada | Hasta "Nueva temporada" | — | — | — |

#### J. Insignias y botón de pendientes

23. **Bandeja**: número `sin leer + pendientes` si es mayor que 0; con estilo de aviso (`warn`) si hay algún pendiente; título "Pendiente: {frase}" o "{N} sin leer" (`App.tsx:162`). Aparece en la sección Inicio de la barra superior (la sección muestra la primera insignia de sus pantallas, `TopNav.tsx:43`), en su menú desplegable (`TopNav.tsx:50`), en la barra secundaria (`TopNav.tsx:89`) y en la barra inferior del celular (`App.tsx:184`).
24. **Mercado**: número de ofertas por jugadores del DT (`g.offers.length`).
25. **Botón de pendientes** (barra secundaria, derecha; `App.tsx:225`): número de pendientes y la frase con mayúscula inicial; oculto mientras avanza; lleva a Bandeja › Pendientes.
26. **Dentro de la bandeja**: chip "Pendiente: {frase}" junto al título; contadores en las pestañas Para vos y Pendientes; separador "Mensajes" entre pendientes y mensajes; filas pendientes con borde de aviso y "!" si no tienen cara ni escudo.
27. **Barra de comandos**: "Responder la conferencia de prensa" mientras haya conferencia (`App.tsx:239`).

#### K. Mosaico "Mensajes" del Inicio (`Home.tsx:47-60`)

28. Título "Mensajes" y botón "Abrir bandeja".
29. Filtro de tres botones: Todos, Sin leer ({`unreadOf`}), Con acción (mensajes con cualquier `act`, también `injury` y `result`). El filtro no se recuerda (estado local).
30. Si hay pendientes: botón "{N} Pendiente: {frase}" que lleva a Bandeja › Pendientes.
31. Lista de hasta **14** mensajes `isMine` del filtro, agrupados por día con un separador de fecha; cada fila: ícono por tema, remitente (tema), título y punto de sin leer.
32. Tocar una fila abre la bandeja (`go('inbox')`) **sin elegir ese mensaje** y sin marcarlo leído.
33. El mosaico ocupa la primera posición del Inicio por defecto (ancho 4, alto 3; `Home.tsx:192`). El mosaico "Para atender" repite la frase de pendientes con un botón Ver.

#### L. Teclado

34. ↑ ↓ recorren pendientes y mensajes de la vista y hacen visible la fila (`Inbox.tsx:77-89`). No actúan si el foco está en un campo de texto o selector, o si hay una ventana abierta.
35. Espacio avanza (Continuar); Mayús + Espacio, Ir al partido; Esc frena el avance (`App.tsx:113`, `120`).

### States and Transitions

**Mensaje**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| Sin leer | `news()` | Queda activo en la bandeja o "Marcar como leídas" | Punto y negrita; cuenta en las insignias si es para el DT. |
| Leído | Regla 9 o 10 | Nunca vuelve | — |
| Podado | Regla 3 | — | Desaparece de `g.news`. |

**Acción del mensaje** (independiente de leído): Vigente → Resuelta o Vencida (tabla D: el mensaje queda y muestra el texto de no vigente).

**Pendiente** (calculado): Ausente → Presente (la condición de la tabla E se cumple) → Ausente (resuelto, vencido o descartado). Ninguna transición se guarda.

**Avance hasta el partido**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| Quieto | Inicio, o fin de un avance | Ir al partido | Botones Continuar e Ir al partido; botón de pendientes visible. |
| Avanzando | Ir al partido | `match`, `season`, `press`, decisión nueva, Frenar / Esc / Espacio, 400 días | Barra de progreso, fecha, Frenar; se oculta el botón de pendientes. |
| Frenado por decisión | Clave nueva | Inmediata | Navega a Bandeja › Pendientes. |
| Frenado por prensa | `press` | Inmediata | Abre la ventana de prensa. |
| Llegó el partido | `match` | Inmediata | El botón principal pasa a "Jugar". |

### Interactions with Other Systems

| Sistema | Entra a este sistema | Sale de este sistema | Responsable |
|---------|---------------------|---------------------|-------------|
| Todos los emisores (tabla C) | Noticias por `news()` | — | Cada emisor completa `tag`, `clubId`, `pid`, `act`, `ref`. |
| `mercado-de-pases` | `g.offers`, vencimiento a 8 días, `windowOpen` | Llamadas a `acceptOffer`, `haggle`, `rejectOffer` | Las reglas son de ellos; la bandeja solo llama. |
| `carrera-del-dt` | `g.jobOffers` (`until`) | `acceptJob`; Rechazar borra la oferta **desde la interfaz** (`Inbox.tsx:179`, `197`) | Mixto: la interfaz escribe estado directamente. |
| `plantel` | `wantsOut`, `listed`, `happy` | Declararlo transferible escribe `p.listed = true` **desde la interfaz** | Mixto. |
| `prensa-e-informes` | `g.press`, `DayResult 'press'`, noticia `rival` | `delegatePress`, apertura de la ventana de prensa y del informe | Ellos crean; la bandeja muestra y delega. |
| `temporada-y-ligas` | `advanceDay`, `seasonOver`, fixture, `nextUserFixture` | — | Ellos avanzan; la interfaz decide cuándo frenar. |
| `entrenamiento-y-cuerpo-tecnico` | Noticias `injury`, `train` | Ir a Entrenamiento | — |
| `ojeo` | Noticia `scout` | Ver la ficha, Ofertar | — |
| `motor-de-partido` | Noticias `result`, `injury` | Ver el informe del partido | — |

## Formulas

**F1. Para el DT** (`game.ts:177`)
```
me = (clubId = userClubId) o (act definido) o (pid definido y players[pid].clubId = userClubId)
isMine(n) = n.me ?? (n.clubId = userClubId)            // en la interfaz, Inbox.tsx:45
```
Se evalúa al emitir. Un cambio posterior de club del DT no cambia `me` de los mensajes viejos; los que no tienen `me` se reevalúan contra el club actual.

**F2. Poda** (`game.ts:180-184`)
```
si len > 320:
    drop = len − 300
    recorrer de la más vieja a la más nueva: borrar si !me, hasta drop = 0
    si len > 400: len = 400
```
| Variable | Valor | Descripción |
|---|---|---|
| umbral | 320 | Dispara la poda. |
| objetivo | 300 | Cantidad a la que se intenta bajar borrando ajenas. |
| tope duro | 400 | Corte final; borra las más viejas aunque sean `me`. |

**Expected output**: 300 a 320 mensajes en régimen normal; hasta 400 si casi todos son para el DT. Con 400 mensajes `me`, cada mensaje nuevo borra el más viejo.

**F3. Número de la insignia de Bandeja** (`App.tsx:162`)
```
badge = unreadOf(g) + pendingOf(g).length        // se muestra si > 0
```
Una oferta por un jugador suma **2**: el pendiente y su mensaje `act: 'offer'` sin leer. Lo mismo pasa con una oferta de trabajo (`act: 'job'`) y con un jugador que quiere irse (`act: 'out'`). La conferencia suma 1, porque no emite mensaje hasta que se responde.

**F4. Plazos mostrados**
```
oferta:  "Vence el" fmtDate(o.date + 8)            // Inbox.tsx:128, suma propia de la interfaz (addDaysS)
trabajo: "Respondé antes del" fmtDate(until)        // until = emisión + 6 (career.ts:131) o + 20 (career.ts:147)
```
La oferta sigue en `g.offers` el día `date + 8` y se borra en el `passDays` de ese día, con lo que se ve hasta la mañana del día `date + 9` con "Vence el {ayer}".

**F5. Progreso del avance** (`App.tsx:138`)
```
total = max(1, round((fecha del próximo partido − hoy) / 1 día))   // 7 si no hay partido
barra = min(100 %, días avanzados / total)
```

## Edge Cases

**Handled in code**

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| Decisión resuelta en otra pantalla (Mercado, Vestuario) | Desaparece de Pendientes en el próximo dibujo | Los pendientes se calculan del estado. |
| El elemento elegido desaparece (oferta respondida) | La selección pasa a la primera fila | `Inbox.tsx:70-72`. |
| Oferta de un jugador que ya no existe | No figura en Pendientes; el mensaje dice "ya fue respondida o venció" | Chequeo `g.players[o.pid]`. |
| Oferta de trabajo vencida | No figura en Pendientes desde `until + 1`; el mensaje dice "La oferta ya no está vigente." | `until ≥ hoy`. |
| Jugador que quiere irse declarado transferible | Sale de Pendientes; el mensaje ofrece solo "Hablar con él" | `!p.listed`. |
| Vista sin mensajes | "No hay mensajes en esta categoría." o "No tenés nada pendiente." | — |
| Mosaico sin mensajes en el filtro | "No hay mensajes en esta vista." | — |
| Avance larguísimo | Se corta a los 400 días | Protección. |
| ↑ ↓ con una ventana abierta o escribiendo | No mueven la selección | — |

**Not yet handled (detectados al analizar)**

| Scenario | Comportamiento actual | Severidad |
|----------|----------------------|-----------|
| **Pedir más con éxito** | `haggle` le da a la oferta un `id` nuevo (`career.ts:259`); el mensaje original (`ref` = id viejo) pasa a "Esta oferta ya fue respondida o venció." aunque la oferta mejorada sigue en Pendientes. La nota "mejoró su oferta" se pierde con el redibujo. | ✅ Resuelto (2026-11-14): la oferta conserva su id (`o.asks`) y la bandeja deja la nota a la vista. Con el libro cerrado Pedir más está deshabilitado. |
| **Doble conteo** | Una oferta, un trabajo o un pedido de salida suman 2 en la insignia y en "Para vos" (F3) | Media |
| **Selección automática marca leído** | Al entrar a una vista sin pendientes, el primer mensaje queda leído sin que el DT lo mire; al recorrer con ↑ ↓ se marcan todos los que se cruzan | Media |
| **Clic en el mosaico del Inicio** | Abre la bandeja sin ese mensaje elegido; en general se ve otro | Media |
| **Freno sin la decisión elegida** | Al frenar por una oferta nueva, la bandeja abre en Pendientes con la primera fila (por ejemplo, una conferencia o un jugador viejo), no con la nueva | Media |
| **Vencimiento en silencio** | Una decisión que ya estaba pendiente al apretar Ir al partido puede vencer durante el avance sin freno ni aviso | Alta (es el miedo principal del jugador) |
| **Orden de pendientes** | Orden fijo por tipo, no por plazo: una oferta que vence mañana queda debajo de un trabajo que vence en 6 días | Media |
| **Plazos que no coinciden** | La oferta dice "vence en una semana" y dura 8 días (+ la mañana del noveno); el trabajo dice "Tenés una semana" y dura 6 días + hoy | Baja |
| **Textos que mandan a otra pantalla** | La oferta dice "desde la pantalla de Mercado" (`career.ts:339`) y el pedido de salida "desde el Vestuario" (`squad.ts:83`), aunque la acción está en el mensaje | Baja |
| **Venta propia fuera de "Para vos"** | La venta de un jugador del DT a un club argentino (`career.ts:228`) no es `me` ni cuenta como sin leer | ✅ Resuelto (2026-11-14): `doTransfer` marca `me` si vende tu club |
| **Aviso de base actualizada fuera de "Para vos"** | `game.ts:300` no lleva `clubId` del DT | ✅ Resuelto (2026-11-14): lleva `me` |
| **Acciones sin confirmación** | Aceptar o Rechazar una oferta y Aceptar un trabajo (cambia de club en el acto, a mitad de temporada) son de un clic | Alta |
| **Rechazar un trabajo** | Se borra la oferta desde la interfaz, sin noticia; el club queda con "Cuerpo técnico interino" para siempre, porque `managerMarket` solo reemplaza al interino de las ofertas que siguen en la lista | ✅ Resuelto (2026-11-14): `rejectJob` nombra DT en el acto |
| **Continuar de a un día** | Con una conferencia abierta, el ayudante la responde sin aviso (solo lo advierte el texto de la ventana); con una decisión nueva no lleva a la bandeja | Media |
| **Nota de resultado perdida** | Al aceptar o rechazar desde Pendientes, el pendiente desaparece y la nota ("Vendiste a…") no llega a verse | Media |
| **"Todo el fútbol" y leído** | Las ajenas se ven en negrita sin contar en ninguna insignia; "Marcar N como leídas" cuenta ajenas | Baja |
| **Más de 120 mensajes** | No se pueden ver los más viejos de la vista | Baja |
| **Lesión sin acción** | `act: 'injury'` no ofrece nada (ni ficha, ni días que faltan hoy, ni partidos que se pierde) | Baja |
| **Jugador retirado** | El mensaje conserva `pid` de un jugador borrado: sin tarjeta ni texto que lo explique | Baja |
| **Celular** | Por debajo de 900 px la lectura queda debajo de la lista (hasta 120 filas): hay que desplazarse para leer | Media |
| **La interfaz escribe el estado** | `n.read = true`, `g.jobOffers = …filter`, `pl.listed = true` se escriben desde `Inbox.tsx` | Deuda técnica (ver `design/ux/bandeja.md`, pregunta 5) |

**Degenerate strategies**

- **Ignorar la bandeja**: las conferencias se delegan solas con la opción más segura, las ofertas vencen sin costo y los pedidos de salida no vencen. No responder nunca es una estrategia viable con muy poco costo. `INTENT UNKNOWN` si es buscado (accesibilidad del ritmo) o si las decisiones deberían tener costo por omisión.
- **Avanzar de a un día para no frenar**: Continuar no frena por decisiones; no es una ventaja real, solo una forma de perderse avisos.

## Dependencies

| System | Direction | Nature of Dependency |
|--------|-----------|---------------------|
| Todos los que llaman a `news()` | Este depende | Contenido. Cada emisor es responsable de `pid`, `act`, `ref`. |
| `mercado-de-pases` | Mutua | Ofertas y su vencimiento; la bandeja llama a aceptar, pedir más y rechazar. |
| `carrera-del-dt` | Mutua | Ofertas de trabajo y su vencimiento; aceptar un trabajo. |
| `plantel` | Mutua | Pedidos de salida; transferible. |
| `prensa-e-informes` | Mutua | Conferencia, informe del rival, delegación. |
| `temporada-y-ligas` | Este depende | Avance de días y fin de temporada. |
| `entrenamiento-y-cuerpo-tecnico`, `ojeo`, `motor-de-partido`, `copas`, `economia-y-dirigencia` | Este depende | Emisores de noticias informativas o con acción. |

**Técnicas**: estado en `Game` (`g.news`, `g.offers`, `g.jobOffers`, `g.press`), guardado en IndexedDB; navegación con `nav({ page, tab })` y `useSticky`; avance asincrónico con `setTimeout(45)`.

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| Umbral / objetivo / tope de la poda (gate) | 320 / 300 / 400 | 200–1.000 | Más historia, partida guardada más grande, bandeja más lenta | Se pierden mensajes del DT |
| Mensajes por vista (gate) | 120 | 60–400 | Lista más larga | Historia inaccesible |
| Mensajes del mosaico del Inicio (gate) | 14 | 7–20 | — | — |
| Pausa entre días al avanzar (feel) | 45 ms | 0–100 | Se ve más el avance; tarda más | Avance instantáneo, sin sensación de tiempo |
| Tope de días por avance (gate) | 400 | — | — | — |
| Vida de una oferta por un jugador (gate) | 8 días | 5–14 | Menos vencimientos | Más presión |
| Ofertas simultáneas (gate) | 8 (`career.ts:336`) | — | — | — |
| Vida de una oferta de trabajo (gate) | 6 días (mitad de temporada), 20 (fin) | — | — | — |
| Qué frena el avance (gate) | Claves nuevas de conferencia, oferta, trabajo y salida | — | Agregar `injury` frenaría seguido | — |

## Visual/Audio Requirements

Sin audio en el juego (`design/accessibility-requirements.md`). Columna de audio: "—".

| Event | Visual Feedback | Audio Feedback | Priority |
|-------|----------------|---------------|----------|
| Llega una decisión nueva durante el avance | El avance se frena y se abre Bandeja › Pendientes | — | Alta (implementado) |
| Hay pendientes | Insignia de aviso en Bandeja; botón de pendientes con la frase | — | Alta (implementado) |
| Mensaje sin leer | Punto de acento y título en negrita | — | Alta (implementado) |
| Pendiente | Borde izquierdo de aviso y meta en color de aviso | — | Alta (implementado) |
| Acción resuelta | Nota en el panel (se pierde si el pendiente desaparece) | — | Media (parcial) |
| Avanzando | Barra de progreso y fecha cambiando | — | Alta (implementado) |

## Game Feel

**Feel Reference.** El "Continuar" de Football Manager que se frena cuando llega algo que requiere atención, con el correo del DT al costado. Lo que se toma: la confianza de que el juego te para cuando importa. Anti-referencia: un correo que interrumpe por cada noticia.

**Input Responsiveness**

| Action | Max Input-to-Response Latency (ms) | Frame Budget (at 60fps) | Notes |
|--------|-----------------------------------|------------------------|-------|
| Elegir un mensaje (clic o ↑ ↓) | 50 | 3 | Marca leído y guarda. |
| Cambiar de pestaña | 100 | 6 | Navegación con historial. |
| Resolver una decisión | 100 | 6 | Llama al motor, guarda y redibuja. |
| Frenar el avance (Esc, Espacio, botón) | 45 + 1 día | — | El freno se lee entre días. |
| Un día de avance | ~1 ms de cálculo + 45 ms de pausa | — | `CLAUDE.md`: 1 ms de mediana por día. |

**Animation Feel Targets**: no aplica (sin animaciones propias; las transiciones son de `design/ux/bandeja.md`).

**Impact Moments**

| Impact Type | Duration (ms) | Effect Description | Configurable? |
|-------------|--------------|-------------------|---------------|
| Freno por decisión | — | Corte del avance y salto a Pendientes | No |
| Freno por prensa | — | Corte del avance y ventana de prensa | Sí (delegación permanente) |

**Weight and Responsiveness Profile.** Liviano y reactivo: todo es un clic. El jugador controla siempre el ritmo (puede frenar en cualquier día). El freno es binario y claro. La falla (una oferta que venció) hoy se siente injusta porque no hubo aviso previo: el jugador no sabe que tenía que mirar antes.

**Feel Acceptance Criteria**
- [ ] En prueba de juego, ningún jugador dice "no me enteré" de una oferta o de un trabajo en la primera temporada.
- [ ] El jugador aprieta "Ir al partido" sin revisar la bandeja antes y confía en que lo van a frenar.
- [ ] El número de la insignia coincide con lo que el jugador cree que tiene para hacer.

## UI Requirements

Requisitos desde la necesidad del jugador. Cada uno dice dónde se cumple hoy y su estado: **Cumple**, **Parcial** o **Falta**. Pantallas: Bandeja (`Inbox.tsx`), barra superior y secundaria (`TopNav.tsx`, `App.tsx`), Inicio (`Home.tsx`), ventana de prensa (`Week.tsx`).

**Saber si hay algo para decidir sin entrar a la bandeja**

1. **UR-01** La entrada a Bandeja muestra un número cuando hay pendientes o mensajes sin leer para el DT, con un estilo distinto si hay al menos un pendiente y un título que nombra lo pendiente. Debe verse en la barra superior (sección Inicio y su menú), la barra secundaria y la barra inferior del celular. — Hoy: `App.tsx:162`, `184`; `TopNav.tsx:43`, `50`, `89`. **Cumple.**
2. **UR-02** Una decisión cuenta una sola vez en cualquier número (insignia, pestaña "Para vos"). — Hoy: una oferta cuenta 2 (F3). **Falta.**
3. **UR-03** Fuera de la bandeja hay un botón con el número de pendientes y la frase ("Una conferencia y 2 ofertas por jugadores") que lleva a la lista de pendientes; no se muestra mientras avanza. — Hoy: `App.tsx:225`. **Cumple.**
4. **UR-04** La entrada a Mercado muestra el número de ofertas por jugadores del DT. — Hoy: `App.tsx:162`. **Cumple.**

**Ver qué hay que decidir y para cuándo**

5. **UR-05** Toda decisión abierta del DT aparece como pendiente mientras siga vigente, y desaparece apenas se resuelve en cualquier pantalla: conferencia, oferta por un jugador, oferta de trabajo, jugador que quiere irse y no es transferible, fin de temporada. — Hoy: `pendingOf`. **Cumple.**
6. **UR-06** Los pendientes están arriba de los mensajes en "Para vos" y solos en "Pendientes", separados de los mensajes. — Hoy: `Inbox.tsx:104-105`. **Cumple.**
7. **UR-07** Cada pendiente muestra su plazo en la fila: la oferta, la fecha de vencimiento; el trabajo, la fecha límite; la conferencia, que si no responde habla el ayudante; el pedido de salida, que no vence. — Hoy: `PendRow`; el pedido de salida no dice que no vence. **Parcial.**
8. **UR-08** El plazo de una oferta sale de la misma regla que la vence (una función del motor), y la fecha mostrada nunca es anterior a hoy. — Hoy: la interfaz suma 8 días por su cuenta (`addDaysS`, `Inbox.tsx:134`) y se ve "Vence el {ayer}" la mañana del día 9 (F4). **Parcial.**
9. **UR-09** Los pendientes se ordenan por urgencia: primero la conferencia, después por plazo más cercano. — Hoy: orden fijo por tipo (tabla E). **Parcial.**
10. **UR-10** Los textos de plazo de los mensajes coinciden con el plazo real (oferta: 8 días; trabajo: 6 o 20 días). — Hoy: "vence en una semana" y "Tenés una semana". **Parcial.**

**Resolver en el mismo lugar**

11. **UR-11** El detalle de cada pendiente trae todo para decidir y sus acciones: oferta (monto, valor, sueldo y contrato del jugador; Aceptar, Pedir más, Rechazar), trabajo (división, reputación, presupuesto, fecha límite; Aceptar, Rechazar, Ver el club), pedido de salida (conformidad; Hablar con él, Declararlo transferible), conferencia (preguntas; Responder, Que hable el ayudante), fin de temporada (Ir al inicio). — Hoy: `PendDetail`. **Cumple.**
12. **UR-12** Cada mensaje con `act` ofrece su acción mientras esté vigente y, si no, dice por qué no (tabla D). — Hoy: `Message`. **Cumple**, salvo UR-13 y UR-14.
13. **UR-13** Después de "Pedir más" con éxito, el mensaje de la oferta sigue mostrando la oferta mejorada y sus acciones. — Hoy: dice "ya fue respondida o venció" porque cambia el id. **Falta.**
14. **UR-14** Un mensaje de lesión muestra los días que faltan hoy, la fecha de vuelta y cuántos partidos se pierde, con acceso a la ficha. — Hoy: sin acción (`ACT_LABEL.injury = ''`); solo la tarjeta del jugador. **Falta.**
15. **UR-15** Aceptar con el libro de pases cerrado está deshabilitado y dice por qué de forma visible (no solo al pasar el mouse). — Hoy: `title` del botón (`Inbox.tsx:158`). **Parcial.**
16. **UR-16** Las acciones que no se pueden deshacer (aceptar o rechazar una oferta, aceptar o rechazar un trabajo) piden confirmación; aceptar un trabajo a mitad de temporada advierte que el cambio de club es inmediato. — Hoy: un clic. **Falta.**
17. **UR-17** Al resolver, el panel muestra el resultado ("Vendiste a…", "Rechazaste la oferta.", "{club} se retiró") hasta que el DT elija otra cosa; no salta solo a otro elemento. — Hoy: la nota se pierde cuando el pendiente desaparece. **Falta.**
18. **UR-18** Los textos del motor no mandan a otra pantalla cuando la acción está en el mensaje. — Hoy: "desde la pantalla de Mercado", "desde el Vestuario". **Falta.**
19. **UR-19** Un mensaje sobre un jugador o club que ya no existe se muestra sin tarjeta ni acciones, sin errores, con un texto que lo explique. — Hoy: sin tarjeta ni acciones, sin texto. **Parcial.**
20. **UR-20** Todo mensaje muestra tema, fecha, título, cuerpo y tarjetas del jugador y del club que abren su ficha. — Hoy: `Message`, `Who`. **Cumple.**

**Leído y no leído**

21. **UR-21** Un mensaje sin leer se distingue por forma y peso (punto y negrita), no solo por color, en la bandeja y en el Inicio. — Hoy: `.ib-row.unread`, `.msg-dot`. **Cumple.**
22. **UR-22** Un mensaje pasa a leído solo cuando el DT lo abre a propósito (clic, Enter o ↑ ↓ con intención), nunca por la selección automática al entrar. — Hoy: la primera fila se marca sola (regla 9). **Parcial.**
23. **UR-23** Se puede marcar como leída toda la vista de una vez. — Hoy: "Marcar N como leídas" (máximo 120). **Cumple.**
24. **UR-24** Solo los mensajes para el DT cuentan como sin leer y llevan estilo de sin leer; los del resto del fútbol no. — Hoy: no cuentan, pero en "Todo el fútbol" se ven en negrita y entran en "Marcar N". **Parcial.**
25. **UR-25** El estado leído se conserva al guardar y cargar la partida. — Hoy: `read` en `g.news`. **Cumple.**

**Orden, alcance e historia**

26. **UR-26** Los mensajes van del más nuevo al más viejo, con su fecha en cada fila. — Hoy: `Inbox.tsx:110`. **Cumple.** (La agrupación por día solo existe en el mosaico del Inicio.)
27. **UR-27** Todo mensaje sobre el club o los jugadores del DT está en "Para vos". — Hoy: la venta propia a un club argentino y el aviso de base actualizada quedan afuera. **Parcial.**
28. **UR-28** Hay vistas por tema (Plantel, Mercado, Partidos, Torneos, Todo el fútbol) y la elegida se recuerda al volver. — Hoy: `CATS`, `useSticky('ib.cat')`. **Cumple.** Falta tema Dirigencia (ofertas de trabajo y balance). **Parcial.**
29. **UR-29** Los mensajes del DT se conservan más que las noticias del resto del fútbol. — Hoy: poda F2. **Cumple.**
30. **UR-30** El DT puede llegar a cualquier mensaje conservado de la vista. — Hoy: corte en 120 sin "mostrar más". **Parcial.**

**Avanzar sin perderse nada**

31. **UR-31** "Ir al partido" se frena cuando aparece una decisión nueva y abre la bandeja **con esa decisión elegida**. — Hoy: se frena y abre Pendientes, pero elige la primera fila. **Parcial.**
32. **UR-32** "Ir al partido" se frena con la conferencia previa y abre la ventana de prensa. — Hoy: `App.tsx:145`, `153`. **Cumple.**
33. **UR-33** Ninguna decisión vence durante un avance sin que el DT la haya visto: el avance se frena el día anterior al vencimiento de una decisión pendiente. — Hoy: vencen en silencio. **Falta.**
34. **UR-34** Mientras avanza se ve la fecha y el progreso, y se puede frenar con un botón, Esc o Espacio. — Hoy: `App.tsx:213-217`. **Cumple.**
35. **UR-35** "Continuar" con una conferencia abierta avisa que responderá el ayudante antes de hacerlo. — Hoy: solo el texto de la ventana; Continuar la delega sin aviso. **Parcial.**
36. **UR-36** Lo que vence sin respuesta deja un mensaje para el DT ("Venció la oferta de {club} por {jugador}"). — Hoy: solo la prensa delegada deja mensaje. **Falta.**

**Inicio**

37. **UR-37** El mosaico "Mensajes" muestra los últimos mensajes del DT agrupados por día, con filtro Todos / Sin leer (número) / Con acción, el acceso a pendientes y "Abrir bandeja". — Hoy: `Home.tsx:49-60`. **Cumple.**
38. **UR-38** Tocar un mensaje del mosaico abre la bandeja con ese mensaje elegido. — Hoy: abre la bandeja sin selección. **Falta.**

**Teclado, celular y ayuda**

39. **UR-39** ↑ ↓ recorren la lista de la bandeja sin interferir con campos, selectores ni ventanas. — Hoy: `Inbox.tsx:77-89`. **Cumple.** (El detalle de foco y Tab es de `design/ux/bandeja.md`.)
40. **UR-40** En el celular, tocar un mensaje muestra su detalle sin desplazarse por toda la lista, y se vuelve a la lista en la misma fila. — Hoy: debajo de 900 px el detalle queda abajo de la lista. **Falta.**
41. **UR-41** La primera vez, la pantalla explica que lo pendiente va primero y qué vence. — Hoy: `PageTip id="inbox"` y paso de la guía (`Guide.tsx:11`, `80`). **Cumple.**

## Cross-References

| This Document References | Target GDD | Specific Element Referenced | Nature |
|--------------------------|-----------|----------------------------|--------|
| Ofertas por jugadores, vencimiento a 8 días, pedir más | `design/gdd/mercado-de-pases.md` | `g.offers`, `marketTick`, `haggle`, `acceptOffer`, `rejectOffer`, `windowOpen` | Rule dependency |
| Ofertas de trabajo y su plazo | `design/gdd/carrera-del-dt.md` | `g.jobOffers.until`, `managerMarket`, `seasonOffers`, `acceptJob` | Rule dependency |
| Pedido de salida | `design/gdd/plantel.md` | `p.wantsOut`, `p.listed`, `p.happy` | State trigger |
| Conferencia y delegación | `design/gdd/prensa-e-informes.md` | `g.press`, `delegatePress`, `DayResult 'press'` | State trigger |
| Informe del rival | `design/gdd/prensa-e-informes.md` | Noticia `act: 'rival'`, `ReportModal` | Data dependency |
| Parte semanal y lesión en la práctica | `design/gdd/entrenamiento-y-cuerpo-tecnico.md` | Noticias `act: 'train'`, `'injury'` | Data dependency |
| Ojeo completo | `design/gdd/ojeo.md` | Noticia `act: 'scout'` | Data dependency |
| Resultado y lesión de partido | `design/gdd/motor-de-partido.md` | Noticias `act: 'result'`, `'injury'`; informe del partido | Data dependency |
| Avance de días y fin de temporada | `design/gdd/temporada-y-ligas.md` | `advanceDay`, `seasonOver`, `startNewSeason` | State trigger |
| Noticias de copas | `design/gdd/copas.md` | `cups.ts` emisores | Data dependency |
| Despido y balance de la dirigencia | `design/gdd/economia-y-dirigencia.md` | Noticias `directiva` | Data dependency |
| Diseño de la pantalla | `design/ux/bandeja.md` | Toda la especificación | Ownership handoff (la pantalla es de la especificación; las reglas, de este documento) |

## Acceptance Criteria

**Funcionales (implementados)**
- [x] Un mensaje emitido con `act` queda con `me = true` aunque su `clubId` sea de otro club.
- [x] Con 321 mensajes de los que 100 son `me`, después de la poda quedan 300 y los 100 `me` siguen.
- [x] Con 401 mensajes todos `me`, quedan 400 y se borró el más viejo.
- [x] Una oferta creada el día D figura en Pendientes desde D hasta la mañana del día D + 9 inclusive, y desaparece con el avance de ese día.
- [x] Una oferta de trabajo con `until = U` no figura en Pendientes el día U + 1.
- [x] Con una conferencia abierta, un `advanceDay` la responde con la opción 0 y emite una noticia firmada por el ayudante.
- [x] "Ir al partido" se detiene el mismo día en que aparece una oferta nueva y la pantalla queda en Bandeja › Pendientes.
- [x] "Ir al partido" no se detiene por una lesión, un resultado, el informe del rival ni el parte semanal.
- [x] "Ir al partido" no se detiene por una decisión que ya estaba pendiente al empezar.
- [x] Abrir un mensaje en la bandeja lo marca leído y baja en 1 la insignia.
- [x] La insignia de Bandeja muestra `sin leer + pendientes` y tiene estilo de aviso cuando hay al menos un pendiente.
- [x] El mensaje `rival` deja de ofrecer el informe cuando ese partido ya no es el próximo.

**Falta (de UI Requirements)**
- [ ] UR-02, UR-13, UR-14, UR-16, UR-17, UR-18, UR-33, UR-36, UR-38, UR-40.
- [ ] Rendimiento: con 400 mensajes, `pendingOf` y `unreadOf` corren en menos de 2 ms por dibujo (recorren `g.players` y `g.news` en cada `refresh`; a medir).
- [ ] Las constantes de poda y plazos viven en un archivo de datos.

**Experienciales**
- [ ] Un jugador de prueba no pierde ninguna oferta de trabajo por no haberla visto en su primera temporada.
- [ ] Un jugador de prueba resuelve una oferta por un jugador sin salir de la bandeja.

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ¿El avance tiene que frenar antes de que venza una decisión ya pendiente (UR-33)? `design/ux/bandeja.md` (pregunta 8) recomienda el día anterior. | usuario | Antes de implementar la especificación de la bandeja | Pendiente |
| ¿"Continuar" de un día también tiene que llevar a la bandeja con una decisión nueva? | usuario | Ídem | `INTENT UNKNOWN` |
| `haggle` cambia el id de la oferta: ¿se conserva el id (y el `ref` del mensaje) o se actualiza el `ref`? | gameplay-programmer | Antes de implementar | Resuelta (2026-11-14): se conserva el id |
| ¿Una decisión cuenta una vez (pendiente) o dos (pendiente + mensaje sin leer)? | usuario + ux-designer | Ídem | Pendiente |
| Rechazar un trabajo deja al club con DT interino para siempre: ¿el motor tiene que nombrar uno al rechazar? | gameplay-programmer | — | Resuelta (2026-11-14): `rejectJob` nombra uno |
| ¿Las decisiones tienen que tener costo por omisión (por ejemplo, ignorar un pedido de salida empeora la armonía)? | usuario | — | `INTENT UNKNOWN` |
| ¿La venta de un jugador propio tiene que ser `me` (emitir con el `clubId` del vendedor o calcular `me` antes del traspaso)? | gameplay-programmer | — | Resuelta (2026-11-14): sí |
| ¿El pedido de salida tiene que vencer o escalar con el tiempo? | usuario | — | `INTENT UNKNOWN` |
| Mover `pendingOf`, `isMine` y las escrituras de la interfaz (`n.read`, `g.jobOffers`, `p.listed`) al motor (`design/ux/bandeja.md`, pregunta 5). | ui-programmer + lead-programmer | Antes de implementar | Pendiente |
| ¿Hace falta un tema Dirigencia en la bandeja? (`design/ux/bandeja.md` lo propone) | usuario | — | Pendiente |

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-11-14 | Claude (reverse-doc) | Documentación inicial desde `news()`, `advanceDay`, `Inbox.tsx`, `App.tsx`, `Home.tsx`, `TopNav.tsx` |

*Generado por `/reverse-document design src/ui/Inbox.tsx`.*
| 2026-11-14 | Claude | Resueltos: id de la oferta al pedir más, venta propia y base actualizada en "Para vos", rechazar un trabajo; la nota "Error al guardar" (F7 en `--bad`) aparece tras una decisión si falla el guardado (`design/ux/bandeja.md`); la línea de consecuencias de un trabajo nombra al cuerpo técnico que se va con el DT y al que queda |
