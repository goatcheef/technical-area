---
status: reverse-documented
source: src/engine/game.ts (news, advanceDay, markRead, readDecisionNews), src/engine/inbox.ts (pendientes y conteo), src/engine/career.ts (tratos), src/engine/types.ts (News, Deal), src/ui/Inbox.tsx, src/ui/App.tsx, src/ui/Home.tsx, src/ui/TopNav.tsx
date: 2026-11-15
verified-by: pending review
---

# Comunicación y bandeja

> **Reverse-documented from implementation** — generado por `/reverse-document` desde
> `src/engine/game.ts` (`news`, `advanceDay`), `src/engine/types.ts` (`News`), `src/ui/Inbox.tsx`, `src/ui/App.tsx`, `src/ui/Home.tsx` y `src/ui/TopNav.tsx` el 2026-11-14, en el commit `d9b251a`.
> Esto registra lo que el código **hace**; lo marcado `INTENT UNKNOWN` se infirió y el autor no lo confirmó.
> Donde este documento y el código no coincidan, no supongas que el documento es el requisito.
> Actualizado el 2026-11-15 con las decisiones de los tratos del mercado (`8fe1dcb`; `design/ux/bandeja.md` pregunta 22, `design/ux/mercado.md` preguntas 20 y 24): pendiente `deal`, regla del mensaje más nuevo (`newestOf`), regla de leído al resolver (`readDecisionNews`), conteo y freno.

> Authoring guidance: .claude/docs/templates/guidance/game-design-document-guide.md

> **Status**: Implemented
> **Author**: usuario + game-designer (reverse-doc)
> **Last Updated**: 2026-11-15
> **Last Verified**: 2026-11-15 (secciones A, C, D, E, F, H, I, J y F3 contra `8fe1dcb`; el resto, contra `d9b251a`)
> **Implements Pillar**: Principio 4 de `docs/plan-ui-ux.md`, "La información viene a vos" (bandeja única con acciones directas; el botón de continuar muestra qué está pendiente), y etapa 2 del plan de UI/UX ("bandeja de entrada y ritmo"). Sostiene el bucle de "La semana" del plan de jugabilidad.
> **Related UX spec**: `design/ux/bandeja.md` (se revisa contra este documento; las diferencias están en UI Requirements y Open Questions).

## Summary

El sistema de mensajes del juego: todo lo que pasa en el mundo y le importa al DT llega como una noticia con, si corresponde, la acción para resolverlo en el mismo mensaje; lo que espera una respuesta (ofertas, ofertas de trabajo, jugadores que quieren irse, conferencias, fin de temporada) se calcula del estado como "pendiente" y frena el avance hasta el partido cuando aparece algo nuevo. Existe para que el DT sepa de un vistazo qué tiene que decidir antes de seguir y no se entere tarde.

> **Quick reference** — Layer: `Foundation` (el modelo de noticias y pendientes) + `Presentation` (bandeja, insignias, mosaico) · Priority: `MVP` (implementado) · Key deps: todos los sistemas que emiten noticias; `mercado-de-pases`, `carrera-del-dt`, `plantel`, `prensa-e-informes` para las decisiones.

## Overview

**Propósito.** Unificar la comunicación del juego en un solo canal y convertir cada aviso accionable en un mensaje con su botón. **Alcance.** Incluye el modelo `News` y su emisor `news()` (campos `pid`, `act`, `ref`, `me`, `read`), la poda, el catálogo de emisores del motor, las decisiones pendientes (`pendingOf`, `pendingText`, `decisionKeys`), el estado leído/no leído, el freno del avance (`advance` en `App.tsx`), los vencimientos, las insignias y el botón de pendientes, la bandeja (`Inbox.tsx`) y el mosaico "Mensajes" del Inicio (`Home.tsx`). **Queda afuera:** las reglas de cada decisión (aceptar una oferta, aceptar un trabajo, hablar con un jugador, responder la prensa), que son de `mercado-de-pases`, `carrera-del-dt`, `plantel` y `prensa-e-informes`; aquí solo importan su vigencia y su acción en el mensaje. El diseño visual y de interacción detallado de la pantalla es de `design/ux/bandeja.md`.

**Current implementation.** Las noticias viven en `g.news` (más nueva primero, se guardan con la partida). Los pendientes **no se guardan**: el motor los recalcula del estado en cada dibujo (`pendingAll(g)`, `src/engine/inbox.ts:21`; `pendingOf` es la misma lista sin los tratos, para la interfaz anterior), así nunca queda un pendiente viejo. La bandeja muestra pendientes arriba y mensajes abajo, en lista y lectura lado a lado.

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
| `act?` | `offer` · `job` · `out` · `scout` · `rival` · `train` · `result` · `injury` · `deal` | Qué se puede hacer desde la bandeja. `deal`: respuesta de un club, caída o vencimiento de un trato del DT (`types.ts:281`). |
| `ref?` | int | Referencia de la acción: id de la oferta (`offer`), del trato (`deal`, `Deal.id`), del club (`job`) o del partido (`rival`, `result`). |
| `me?` | `true` o ausente | Es para el DT. Solo se escribe cuando es verdadero. |
| `read?` | `true` o ausente | Ausente = sin leer. El emisor puede crearlo leído (`news(g, { …, read: true })`) cuando es la consecuencia directa de algo que el DT acaba de hacer y ver (regla F.3). |

#### B. Emisión (`news()`, `game.ts:176-185`)

1. `me` se calcula **una sola vez, al crear el mensaje** (F1): verdadero si `clubId` es el club del DT, o si tiene `act`, o si `pid` es un jugador que en ese momento está en el club del DT.
2. El mensaje se agrega **al principio** de `g.news` con `id` y `date`.
3. Poda (F2): si hay más de 320, se borran los más viejos que **no** son `me` hasta dejar 300; si aun así quedan más de 400, se corta a 400 (ahí sí caen mensajes `me`, los más viejos).
4. Regla de proyecto (`CLAUDE.md`): al crear una noticia nueva desde el motor hay que completar `pid`, `act` y `ref` para que la bandeja ofrezca la acción.
5. Los mensajes de un trato salen de un solo emisor (`dealNews`, `career.ts:539`): `tag: 'mercado'`, `act: 'deal'`, `ref: deal.id`, `pid`, `me: true`, `clubId` del club del trato. Un trato puede tener varios mensajes (la contraoferta, la respuesta a una mejora, el acuerdo, el vencimiento).

La interfaz decide el alcance con `isMine(g, n) = n.me ?? n.clubId === g.userClubId` (`Inbox.tsx:45`): el `clubId` actual es el respaldo para mensajes sin `me`.

#### C. Catálogo de emisores

Todas las llamadas a `news()` del código (52 en `src/engine/`, una de ellas `dealNews`, que emite todos los mensajes de un trato; 1 en `src/ui/`). Las líneas de `career.ts` y `squad.ts` son de `8fe1dcb`; las de `game.ts`, `week.ts` y `cups.ts`, de `d9b251a`. "Para el DT" aplica F1 al momento de emitir.

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
| `squad.ts:99` | Un jugador quiere irse | club | DT | jugador | `out` | Sí |
| `squad.ts:119`, `124` | Promesa cumplida o rota | club | DT | jugador | — | Sí |
| `squad.ts:136` | Ojeo completo de un jugador ajeno | mercado | su club | jugador | `scout` | Sí (por `act`) |
| `squad.ts:147`, `158` | Resultado de la reserva (miércoles) | partido | DT | — | — | Sí |
| `squad.ts:365` | Renovación de un jugador del DT | club | DT | jugador | — | Sí |
| `squad.ts:372` | Se cortó la renovación (`renewWalk`); nace leída | club | DT | jugador | — | Sí |
| `cups.ts:110` | Ascensos desde la tercera categoría | torneo | — | — | — | No |
| `cups.ts:121`, `165` | Campeón de copa | torneo | campeón | — | — | Si es el DT |
| `cups.ts:127` | El DT avanzó o quedó afuera en la Copa Argentina | torneo | DT | — | — | Sí |
| `cups.ts:141` | El DT pasó o no la fase de grupos internacional | torneo | DT | — | — | Sí |
| `career.ts:117` | El DT fue despedido | directiva | DT | — | — | Sí |
| `career.ts:149`, `151` | El DT firmó con otro club (y quién llega con él) | club | club nuevo | — | — | Sí |
| `career.ts:194` | Un club que había ofrecido trabajo nombra DT | club | ese club | — | — | No |
| `career.ts:196` | Venció una oferta de trabajo | directiva | ese club | — | `ref` / club | Sí |
| `career.ts:227` | Oferta de trabajo a mitad de temporada | directiva | club | — | `job` / club | Sí (por `act`) |
| `career.ts:230` | Otro club echó a su DT | club | ese club | — | — | No |
| `career.ts:243` | Oferta de trabajo de fin de temporada | directiva | club | — | `job` / club | Sí (por `act`) |
| `career.ts:354` | Pase entre clubes argentinos (del DT o de US$ 1,5 M o más) | mercado | comprador | jugador | — | Sí si es del DT (`me` si vende); leída si el DT la confirmó (venta o fichaje) |
| `career.ts:364` | Venta al exterior | mercado | vendedor | jugador | — | Si vende el DT; leída si la confirmó |
| `career.ts:450` | Un club pagó la cláusula de un jugador del DT | mercado | DT | jugador | — | Sí |
| `career.ts:472` | Un club de la IA compra en el exterior (≥ US$ 1,5 M) | mercado | comprador | jugador | — | No |
| `career.ts:496` | Oferta por un jugador del DT | mercado | DT | jugador | `offer` / oferta | Sí |
| `career.ts:417` | Venció una oferta por un jugador del DT | mercado | DT | jugador | `offer` / oferta | Sí |
| `career.ts:681`, `682`, `685`, `691` | Respuesta de un club a una oferta del DT: acuerdo (compra o préstamo), contraoferta, rechazo | mercado | club del trato | jugador | `deal` / trato | Sí |
| `career.ts:696`, `713`, `720`, `726` | Venció un acuerdo; caducó una oferta con el cierre del libro; otro club compró al jugador; venció una contraoferta | mercado | club del trato | jugador | `deal` / trato | Sí |
| `career.ts:136` | Un trato se cayó porque el DT cambió de club (leído si aceptó el trabajo) | mercado | club del trato | jugador | `deal` / trato | Sí |
| `career.ts:811`, `820` | Se cayó el pase con el representante (`walkAway`); el DT canceló el trato (`cancelDeal`); nacen leídas | mercado | club del trato | jugador | `deal` / trato | Sí |
| `career.ts:748` | Aviso de cierre del libro (7 días antes y el último día) | mercado | DT | — | — | Sí |
| `career.ts:932` | Se retira un jugador del DT | club | DT | jugador (se borra) | — | Sí |
| `career.ts:938` | Un jugador del DT se va libre | mercado | DT | jugador | — | Sí |
| `career.ts:956` | Suben juveniles al plantel del DT | club | DT | mejor juvenil | — | Sí |
| `Locker.tsx:107` (en `8fe1dcb`) | Se cayó un pase por el jugador (camino viejo de la ventana de negociación; la interfaz del Mercado en implementación lo reemplaza por `walkAway`, `career.ts:811`) | mercado | DT | — | — | Sí |

#### D. Acción en el mensaje (`Message`, `Inbox.tsx:189-213`)

| `act` | Etiqueta en la fila (`ACT_LABEL`) | Acción si está vigente | Vigencia | Si no está vigente |
|---|---|---|---|---|
| `offer` | "Para decidir" | Tarjetas Oferta, Valor, Sueldo, Contrato; Aceptar (F6; deshabilitado con el libro cerrado), Pedir más, Rechazar (F6) | Es el mensaje **más nuevo** de esa oferta (`newestOf`) **y** existe en `g.offers` una oferta con `id = ref` cuyo jugador existe (`pendingKeyOf(g, n)`, `inbox.ts:70`) | "Esta oferta ya fue respondida o venció." El mensaje de vencimiento (`act: 'offer'`) es el más nuevo y reemplaza al de la oferta |
| `deal` | "Para decidir" si es el más nuevo de su trato y el trato está en `countered` o `agreed`; si no, "Trato" | Las de `DealDecision` según el estado del trato **ahora**: contraoferta (Aceptar US$ X, Mejorar, Retirar la oferta) o acuerdo (Negociar contrato / Seguir negociando o Confirmar el préstamo con F6, Cancelar el trato con F6 y el costo escrito), más Ver todos los tratos y Ver la ficha | Es el mensaje más nuevo de su trato (`newestOf`) **y** el trato existe, es del club actual del DT y está en `countered` o `agreed` | Mensaje viejo de un trato que siguió: "Ya respondiste esta contraoferta…" / "{club} respondió de nuevo el {fecha}." con "Ver la respuesta nueva"; trato terminal: el texto de su estado ("Este acuerdo venció el 18 ene.", "Se cayó: dejaste Banfield."); si el DT volvió a ofertar por ese jugador, "Ver el trato nuevo"; trato podado (su `ref` ya no está en `g.deals`): "Este trato ya no figura en el historial." con solo Ver la ficha. Siempre quedan Ver todos los tratos y Ver la ficha (`design/ux/mercado.md`, sección 8, tabla D) |
| `job` | "oferta de trabajo" | Aceptar, Rechazar, Ver el club | Existe en `g.jobOffers` con `clubId = ref` y `until ≥ hoy` | "La oferta ya no está vigente." |
| `out` | "quiere irse" | Hablar con él (ficha, pestaña Personal); Declararlo transferible (si no lo es) | El jugador existe y `wantsOut` | "Ya no pide irse." (sin texto si el jugador ya no existe) |
| `scout` | "informe" | Ver la ficha; Ofertar (pestaña Contrato) si no es del DT | El jugador existe | Sin acción |
| `rival` | "informe" | Ver el informe del rival (ventana con sugerencias aplicables) | `ref` es el próximo partido del DT | "Ese partido ya se jugó." |
| `train` | "informe" | Ir a Entrenamiento | Siempre | — |
| `result` | "ver informe" | Ver el informe del partido | El partido existe | Sin acción |
| `injury` | (vacía) | Ninguna | — | — |
| sin `act`, `tag: 'torneo'` | — | Ver posiciones | Siempre | — |

Todo mensaje muestra además: tema, fecha completa, título, una tarjeta del jugador (cara, club, puesto, valoración; abre la ficha) y una del club si es otro que el del jugador (abre la ficha), y el cuerpo.

#### E. Pendientes (`pendingAll`, `src/engine/inbox.ts:21`)

5. Se calculan del estado y se ordenan por urgencia (`rank`, `inbox.ts:18`): la conferencia primero, después lo que tiene plazo (del más cercano al más lejano), después lo que no vence y la nueva temporada al final. `pendingOf` (`inbox.ts:34`) es la misma lista sin los `deal`, para la interfaz anterior; los contadores (`unreadOf`, `inboxCount`, `decisionKeys`, `expiringKeys`) usan `pendingAll`:

| Tipo `k` | Condición | Clave (`key`) | Fila: título · meta |
|---|---|---|---|
| `season` | `g.seasonOver` | `season` | "Terminó la temporada {año}" · "Comenzá la próxima desde acá" |
| `press` | `g.press` no nulo | `press{fixtureId}{kind}` | "Conferencia de prensa previa / después del partido" · "Si no respondés, habla el ayudante" |
| `job` | cada `g.jobOffers` con `until ≥ hoy` | `job{clubId}` | "{club} te quiere como DT" · "Respondé antes del {until}" |
| `offer` | cada `g.offers` cuyo jugador existe | `offer{id}` | "{club} ofrece {monto} por {jugador}" · "Vence el {offerDeadline}" (fecha + 9) |
| `deal` (`kind: 'countered'`) | cada trato del club actual en `countered` | `deal{id}` | "Contraoferta, {club}. Pide {monto} por {jugador}. Vence en N días." · plazo `deal.deadline` |
| `deal` (`kind: 'agreed'`) | cada trato del club actual en `agreed` | `deal{id}` (la misma clave que tenía como contraoferta: es la misma decisión) | "Acuerdo, {club}. Aceptó {monto} por {jugador}. Falta el contrato." · plazo `deal.deadline` |
| `out` | cada jugador del DT con `wantsOut` y no transferible | `out{pid}` | "{jugador} quiere irse" · "Hablale o declaralo transferible" |

6. `pendingText` arma la frase "Pendiente: la nueva temporada, una conferencia, 2 ofertas de trabajo, una oferta por un jugador, una contraoferta, 2 acuerdos para cerrar y un jugador que quiere irse" (singular o plural por tipo, comas y "y" final; `inbox.ts:36`).
7. `decisionKeys(g)` = las claves de todos los pendientes **menos** `season` (`inbox.ts:50`). Una oferta del DT que **espera respuesta** (`waiting`) no es pendiente: no hay nada que decidir hasta que el club contesta.
7b. `expiringKeys(g)` (`inbox.ts:57`) = las claves de `offer`, `job` y `deal` cuyo plazo es hoy (mañana ya no están).
8. El detalle de cada pendiente (`PendDetail`, `Inbox.tsx:166-187`):
   - `press`: preguntas entre comillas; Responder (abre la ventana de prensa), Que hable el ayudante.
   - `offer`: tarjeta del jugador y del club comprador; las mismas acciones que el mensaje `offer`.
   - `job`: tarjeta del club; división, reputación, presupuesto, "Tenés tiempo hasta el {until}"; Aceptar, Rechazar, Ver el club.
   - `out`: tarjeta del jugador; conformidad; Hablar con él, Declararlo transferible.
   - `season`: "El resumen está en el inicio."; Ir al inicio.
   - `deal`: plantillas "Contraoferta" y "Acuerdo para cerrar" de `design/ux/bandeja.md` (componente `DealDecision` compartido con el Mercado).

#### F. Leído y no leído

9. **Abrir** un mensaje a propósito lo marca leído (`markRead`, `game.ts:265`): clic, ↑ ↓, Enter, ‹ › o un clic en el mosaico del Inicio. La selección automática al entrar **no** marca nada (`design/ux/bandeja.md`, pregunta 12). Elegir un trato en Mercado › Tratos o mirarlo en el `BidBox` tampoco: elegir no es leer el mensaje.
9b. **Resolver una decisión a propósito, en cualquier pantalla, marca leídos todos los mensajes de esa clave** (`readDecisionNews(g, key)`, `game.ts:272`, sobre `decisionKeyOf`, `:270`). Lo hace el motor dentro de la función que resuelve, así ninguna pantalla escribe en `g`: del lado compra, `acceptCounter`, `placeBid` sobre una contraoferta (Mejorar), `withdrawBid`, `cancelDeal`, `openNegotiation` (abrir la mesa ya es actuar sobre el acuerdo), `signDeal`, `walkAway`; del lado venta, `acceptOffer`, `rejectOffer` y `haggle`. `acceptOffer` marca además los mensajes de las **otras** ofertas por el mismo jugador que la venta cancela (la confirmación las nombró); las que cancela una cláusula pagada por otro club, no. `switchClub` desde `acceptJob` marca los de las ofertas recibidas que se borran.
9c. **Lo que el DT acaba de ver nace leído** (`read: true` al emitir): la ruptura de `walkAway` y la renovación cortada de `renewWalk` (la ventana ya lo mostró), el fichaje de `signDeal`, la venta de `acceptOffer`, la cancelación de `cancelDeal` (su confirmación dijo el bloqueo) y las caídas por cambio de club de `acceptJob` (la confirmación las nombró). Lo que pasa sin el DT nace sin leer: la respuesta de un club, un vencimiento, la caída por el cierre del libro o porque otro club compró al jugador, las caídas por `takeJob` tras un despido, la cláusula que paga otro club.
9d. Criterio: resolver en el Mercado deja la insignia de la Bandeja igual o más baja, nunca más alta.
10. "Marcar {N} como leídas" aparece si la vista tiene mensajes sin leer y marca todos los de la vista (máximo 120; `Inbox.tsx:99`).
11. El Inicio nunca marca leído. No hay forma de volver un mensaje a "sin leer".
12. Los pendientes no tienen estado leído: están mientras la decisión siga abierta.
13. `unreadOf(g)` (`inbox.ts:88`) cuenta los mensajes sin leer **para el DT** (`isMine`). Los del resto del fútbol nunca cuentan, aunque en "Todo el fútbol" se dibujan en negrita si no tienen `read`.
13b. **Una decisión, una vez** (UR-02): un mensaje ligado a un pendiente abierto (`pendingKeyOf(g, n)`) no cuenta como sin leer: cuenta como pendiente. **Por cada oferta o trato cuenta a lo sumo un mensaje, el más nuevo de su clave** (`newestOf`, `inbox.ts:60`): mientras la decisión está abierta, ese mensaje está ligado al pendiente; los más viejos de la misma clave no cuentan nunca, aunque sigan en negrita hasta abrirlos. Una contraoferta que se acepta y pasa a acuerdo sigue siendo la misma decisión (`deal<id>`): cuenta 1. Un rechazo, una caducidad o un vencimiento son solo mensajes: suman como sin leer, y como son el más nuevo de su clave, reemplazan en el conteo al mensaje de la decisión que no se abrió (el vencimiento suma 1, no 2). Los avisos de cierre del libro no tienen clave: cuentan como cualquier mensaje.
13c. La regla del mensaje más nuevo no vale para las ofertas de trabajo: su clave (`job<clubId>`) se repite si el mismo club vuelve a ofertar (abierto, `bandeja.md` pregunta 22).

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
    3. Se detiene si `advanceDay` devuelve `match`, `season` o `press`; si aparece **una clave nueva** que no estaba en `before` (también `deal<id>`: la respuesta de un club, y otra vez la respuesta a una mejora, porque la clave sale de los pendientes mientras el trato vuelve a esperar); si es **el último día para responder** una decisión pendiente (`expiringKeys`: oferta, oferta de trabajo, contraoferta o acuerdo, una vez por decisión y por día, aunque no sea nueva y aunque ese día sea el último del libro); si el jugador frena (botón Frenar, Esc o Espacio); o a los 400 días. Si ya es el último día de algo al apretar, no avanza.
    4. Al detenerse guarda; con `press` abre la ventana de prensa; con una decisión nueva o que vence hoy navega a `inbox`, pestaña `pend`, con esa decisión elegida (`sel`).
19. **Jugar** (hay partido hoy): abre el partido; no avanza días.
20. **Nueva temporada** (temporada terminada): va al Inicio. `advanceDay` devuelve `season` y no avanza mientras `seasonOver` o con el DT despedido.
21. Al empezar cada `advanceDay`, si hay una conferencia abierta, **la responde el ayudante** (`game.ts:560`).
22. Lo que **no** frena: noticias sin decisión (lesiones, resultados, informe del rival, parte semanal, ojeo completo, rechazos y caídas de tratos), los **avisos de cierre del libro** (decisión del usuario, `mercado.md` pregunta 8), una oferta del DT que espera respuesta, decisiones que ya estaban pendientes al empezar el avance hasta su último día, y una oferta que reaparece con la misma clave.

#### I. Vencimientos

| Decisión | Plazo | Dónde se aplica | Qué pasa al vencer | ¿Queda rastro? |
|---|---|---|---|---|
| Oferta por un jugador | Último día `offerDeadline(o) = o.date + 9` (`career.ts:399`) | `marketTick` (`career.ts:415-420`), que corre en `passDays` **antes** de cambiar la fecha | Se borra de `g.offers` y queda en `g.deals` (`expired`) | Sí: "Venció la oferta de {club} por {jugador}" con `act: 'offer'` y `ref` |
| ↳ otros cierres | — | Venta o traspaso del jugador (`dropOffersFor`, `career.ts:375`), Rechazar, Pedir más fallido, nueva temporada (`game.ts:808`), cambio de club (`switchClub`) | Se borra y queda en `g.deals` (`sold`, `declined`, `withdrawn`, `fell`), salvo la nueva temporada | En el historial de Tratos; sin mensaje |
| Contraoferta de un club | `deal.deadline` = 7 días desde la respuesta o el último día del libro (`dealDeadline`, `career.ts:554`) | `dailyDeals` (`career.ts:704`) al empezar el día siguiente | `fell` (`deadline`), sin costo | Sí: "{club} dio por terminada la negociación…", con la fecha del plazo |
| Acuerdo para cerrar | El mismo plazo (`acceptCounter` conserva el de la contraoferta) | `dailyDeals`, también cuando el libro cierra | `fell` (`deadline`) con bloqueo de 14 días de libro abierto y el club molesto | Sí: "Venció el acuerdo con {club} por {jugador}", con el costo |
| Oferta del DT esperando respuesta | Hasta la respuesta (1 a 3 días) o el cierre del libro | `dailyDeals` | Caduca (`fell`, `window`) si el libro cerró antes | Sí: "Tu oferta por {jugador} caducó: se cerró el libro de pases" |
| Oferta de trabajo a mitad de temporada | `until = emisión + 6` | `pendingOf` la oculta desde `until + 1`; `managerMarket` la borra el lunes siguiente (`career.ts:112-116`) | El club nombra un DT nuevo (noticia que no es para el DT) | Indirecto |
| Oferta de trabajo de fin de temporada | `until = emisión + 20` | Igual; mientras la temporada está terminada no corre el tiempo | Vence si la temporada nueva (10 de enero) empieza después de `until` | No |
| Conferencia previa o posterior | Hasta el próximo `advanceDay` o el final del próximo partido | `game.ts:560`, `585` | Responde el ayudante con la opción 0 | Sí: noticia "{ayudante}: «…»" |
| ↳ cierres sin efecto | — | Nueva temporada (`game.ts:658`), cambio de club | Se descarta sin efectos | No |
| Jugador que quiere irse | No vence | — | Sigue pendiente hasta que se lo declare transferible o deje de pedir irse | — |
| Informe del rival (acción del mensaje) | Hasta que el partido deja de ser el próximo | `Message` | "Ese partido ya se jugó." | — |
| Fin de temporada | Hasta "Nueva temporada" | — | — | — |

#### J. Insignias y botón de pendientes

23. **Bandeja**: número `inboxCount(g)` = pendientes + sin leer (`inbox.ts:100`), con la regla 13b, si es mayor que 0; con estilo de aviso (`warn`) si hay algún pendiente; título "Pendiente: {frase}" o "{N} sin leer" (`App.tsx:162`). Aparece en la sección Inicio de la barra superior (la sección muestra la primera insignia de sus pantallas, `TopNav.tsx:43`), en su menú desplegable (`TopNav.tsx:50`), en la barra secundaria (`TopNav.tsx:89`) y en la barra inferior del celular (`App.tsx:184`).
24. **Mercado**: las decisiones del mercado: pendientes `offer` y `deal` de `pendingAll` (ofertas por tus jugadores, contraofertas y acuerdos para cerrar); lo que espera respuesta no suma (`design/ux/mercado.md`, sección 8, "Conteo"). Son dos preguntas distintas ("¿hay algo en el mercado?" y "¿cuánto tengo que decidir?"): cada decisión suma 1 en cada una y nunca 2. En `8fe1dcb` la interfaz todavía contaba `g.offers.length` (`App.tsx:197`); la interfaz del Mercado en implementación pasa a esta regla.
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

**F3. Número de la insignia de Bandeja** (`inboxCount`, `inbox.ts:100`)
```
pend   = pendingAll(g)                                   // incluye contraofertas y acuerdos (deal)
newest = newestOf(g)                                     // clave de decisión → id del mensaje más nuevo
unread = #{ n ∈ g.news : !n.read ∧ isMine(n)
            ∧ (decisionKeyOf(n) = null ∨ newest[decisionKeyOf(n)] = n.id)
            ∧ ¬(pendingKeyOf(g, n) ∈ pend) }
badge  = |pend| + unread                                 // se muestra si > 0
```
Una oferta por un jugador, una contraoferta o un acuerdo suman **1** (el pendiente; su mensaje más nuevo está ligado a él). Al vencer, suma 1 el mensaje de vencimiento. Una oferta de trabajo o un jugador que quiere irse también suman 1. La conferencia suma 1. La insignia de Mercado es `|{ p ∈ pend : p.k ∈ { offer, deal } }|`.

**F4. Plazos mostrados** (una función del motor para cada uno, la misma que lo vence)
```
oferta:              offerDeadline(o) = o.date + 9                      // career.ts:399
trabajo:             until = emisión + 6 o + 20
contraoferta/acuerdo: deal.deadline = min(respuesta + 7, cierre del libro)  // dealDeadline, career.ts:554
espera de respuesta: "responde entre el" answerFrom "y el" answerBy     // nunca answerOn
```

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
| **Doble conteo** | Una oferta, un trabajo o un pedido de salida sumaban 2 | ✅ Resuelto: `unreadOf` no cuenta el mensaje ligado a un pendiente y, por oferta o trato, solo el más nuevo (regla 13b) |
| **Selección automática marca leído** | — | ✅ Resuelto (`design/ux/bandeja.md` pregunta 12): solo lo que el DT abre; resolver la decisión marca sus mensajes (regla 9b) |
| **Clic en el mosaico del Inicio** | Abre la bandeja sin ese mensaje elegido; en general se ve otro | Media |
| **Freno sin la decisión elegida** | El freno abre la bandeja con la decisión que vence hoy o la nueva elegida (`sel`) | ✅ Resuelto para ofertas y trabajos. Para una contraoferta o un acuerdo nuevos la interfaz tiene que buscar la decisión en `pendingAll` (en `8fe1dcb`, `App.tsx:185` usaba `pendingOf`, sin tratos; en implementación) |
| **Vencimiento en silencio** | — | ✅ Resuelto: el avance frena el último día para responder (`expiringKeys`, también contraofertas y acuerdos) y lo que vence deja un mensaje |
| **Orden de pendientes** | — | ✅ Resuelto: `pendingAll` ordena por urgencia y plazo |
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
| **La interfaz escribe el estado** | La bandeja llama al motor (`markRead`, `acceptOffer`, `rejectJob`, `setListed`…); los pendientes y el conteo viven en `src/engine/inbox.ts` | ✅ Resuelto en la bandeja; en `8fe1dcb` la ventana de negociación todavía emitía la noticia del pase caído (`Locker.tsx:107`): la reemplaza `walkAway` |
| **Varios mensajes por trato** | Solo el más nuevo es la decisión vigente y puede contar; los viejos muestran el texto F2 con "Ver la respuesta nueva" | ✅ Resuelto (`mercado.md` pregunta 24) |
| **Trato reabierto que hereda mensajes viejos** | No pasa: ofertar de nuevo crea un trato con otro id | ✅ Resuelto (`mercado.md` pregunta 24) |
| **Mensaje de un trato podado** | Su `ref` ya no está en `g.deals` (tope 60, solo terminales sin bloqueo): "Este trato ya no figura en el historial." con solo Ver la ficha | ✅ Resuelto en el diseño (`mercado.md` pregunta 45) |
| **Resolver en el Mercado** | La decisión sale de la bandeja en el mismo `refresh()` y sus mensajes quedan leídos: la insignia de la Bandeja nunca sube | ✅ Resuelto (regla 9b) |
| **Botón de pendientes sin los tratos** | En `8fe1dcb`, `App.tsx:188` armaba el botón con `pendingOf` (sin tratos) mientras la insignia usaba `inboxCount` (con tratos): con una contraoferta, la insignia decía uno más que el botón. El botón tiene que usar `pendingAll` | Media (en implementación) |

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
| Vida de una oferta por un jugador (gate) | hasta el día 9 (`offerDeadline`) | 5–14 | Menos vencimientos | Más presión |
| Plazo de una contraoferta o un acuerdo (gate) | 7 días o el cierre del libro (`dealDeadline`) | 3–14 | Menos vencimientos | Más presión |
| Ofertas simultáneas por tus jugadores (gate) | 8 (`career.ts:493`) | — | — | — |
| Vida de una oferta de trabajo (gate) | 6 días (mitad de temporada), 20 (fin) | — | — | — |
| Qué frena el avance (gate) | Claves nuevas de conferencia, oferta, contraoferta, acuerdo, trabajo y salida; el último día de oferta, trabajo, contraoferta y acuerdo | — | Agregar `injury` frenaría seguido | Sacar el último día deja vencer en silencio |

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
2. **UR-02** Una decisión cuenta una sola vez en cualquier número (insignia, pestaña "Para vos"), también al resolverla en otra pantalla (sus mensajes quedan leídos) y cuando tiene varios mensajes (solo cuenta el más nuevo). — Hoy: `unreadOf`, `inboxCount`, `newestOf`, `readDecisionNews` (F3, reglas 9b y 13b). **Cumple** en el motor.
3. **UR-03** Fuera de la bandeja hay un botón con el número de pendientes y la frase ("Una conferencia y 2 ofertas por jugadores") que lleva a la lista de pendientes; no se muestra mientras avanza. — Hoy: `App.tsx:225`. **Cumple.**
4. **UR-04** La entrada a Mercado muestra el número de decisiones del mercado: ofertas por jugadores del DT, contraofertas y acuerdos para cerrar (nunca lo que espera respuesta). — En `8fe1dcb`: `App.tsx:197` contaba solo `g.offers.length`. **Parcial** (la interfaz del Mercado está en implementación).

**Ver qué hay que decidir y para cuándo**

5. **UR-05** Toda decisión abierta del DT aparece como pendiente mientras siga vigente, y desaparece apenas se resuelve en cualquier pantalla: conferencia, oferta por un jugador, contraoferta y acuerdo para cerrar de un trato, oferta de trabajo, jugador que quiere irse y no es transferible, fin de temporada. — Hoy: `pendingAll`. **Cumple** en el motor; la bandeja todavía no tiene las plantillas de trato.
6. **UR-06** Los pendientes están arriba de los mensajes en "Para vos" y solos en "Pendientes", separados de los mensajes. — Hoy: `Inbox.tsx:104-105`. **Cumple.**
7. **UR-07** Cada pendiente muestra su plazo en la fila: la oferta, la fecha de vencimiento; el trabajo, la fecha límite; la conferencia, que si no responde habla el ayudante; el pedido de salida, que no vence. — Hoy: `PendRow`; el pedido de salida no dice que no vence. **Parcial.**
8. **UR-08** El plazo de una decisión sale de la misma regla que la vence (una función del motor), y la fecha mostrada nunca es anterior a hoy. — Hoy: `offerDeadline`, `dealDeadline` y `until` (F4). **Cumple.**
9. **UR-09** Los pendientes se ordenan por urgencia: primero la conferencia, después por plazo más cercano. — Hoy: `pendingAll` (tabla E). **Cumple.**
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
33. **UR-33** Ninguna decisión vence durante un avance sin que el DT la haya visto: el avance se frena **el último día para responder** una decisión pendiente (mañana ya no está), una vez por decisión, también cuando ese día es el último del libro (decisión del usuario, `design/ux/bandeja.md` pregunta 19). — Hoy: `expiringKeys` con ofertas, trabajos, contraofertas y acuerdos. **Cumple.**
34. **UR-34** Mientras avanza se ve la fecha y el progreso, y se puede frenar con un botón, Esc o Espacio. — Hoy: `App.tsx:213-217`. **Cumple.**
35. **UR-35** "Continuar" con una conferencia abierta avisa que responderá el ayudante antes de hacerlo. — Hoy: solo el texto de la ventana; Continuar la delega sin aviso. **Parcial.**
36. **UR-36** Lo que vence sin respuesta deja un mensaje para el DT ("Venció la oferta de {club} por {jugador}"). — Hoy: ofertas por jugadores (`act: 'offer'`), ofertas de trabajo, contraofertas y acuerdos (`act: 'deal'`) y la prensa delegada. **Cumple.**

**Inicio**

37. **UR-37** El mosaico "Mensajes" muestra los últimos mensajes del DT agrupados por día, con filtro Todos / Sin leer (número) / Con acción, el acceso a pendientes y "Abrir bandeja". — Hoy: `Home.tsx:49-60`. **Cumple.**
38. **UR-38** Tocar un mensaje del mosaico abre la bandeja con ese mensaje elegido. — Hoy: abre la bandeja sin selección. **Falta.**

**Teclado, celular y ayuda**

39. **UR-39** ↑ ↓ recorren la lista de la bandeja sin interferir con campos, selectores ni ventanas. — Hoy: `Inbox.tsx:77-89`. **Cumple.** (El detalle de foco y Tab es de `design/ux/bandeja.md`.)
40. **UR-40** En el celular, tocar un mensaje muestra su detalle sin desplazarse por toda la lista, y se vuelve a la lista en la misma fila. — Hoy: debajo de 900 px el detalle queda abajo de la lista. **Falta.**
41. **UR-41** La primera vez, la pantalla explica que lo pendiente va primero y qué vence. — Hoy: `PageTip id="inbox"` y paso de la guía (`Guide.tsx:11`, `80`). **Cumple.**

**Decisiones del mercado** (`design/ux/bandeja.md` pregunta 22, `design/ux/mercado.md` preguntas 20 y 24)

42. **UR-42** Una contraoferta y un acuerdo para cerrar se resuelven desde la bandeja con las mismas acciones y textos que en Mercado › Tratos (`DealDecision`): plazo con fecha, cifras, impacto, y en un acuerdo el costo de cancelarlo escrito antes y en la confirmación. — Hoy: pendiente `deal` en el motor; plantillas por implementar. **Falta.**
43. **UR-43** Resolver una decisión en cualquier pantalla marca leídos sus mensajes; lo que el DT acaba de ver nace leído; elegir un trato no marca nada. — Hoy: `readDecisionNews` dentro de las funciones del motor (regla 9b, 9c). **Cumple** en el motor.
44. **UR-44** Un mensaje de un trato que ya no es la decisión vigente lo dice (texto F2 y chip "Trato") y ofrece ir a la respuesta nueva, al trato nuevo o al historial; un trato podado no rompe nada. — Hoy: `pendingKeyOf(g, n)` y `newestOf` en el motor; texto por implementar. **Parcial.**
45. **UR-45** Los avisos de cierre del libro (7 días antes y el último día) llegan como mensaje con lo abierto de los dos lados y no frenan el avance. — Hoy: `windowNotice` (`career.ts:735`). **Cumple.**

## Cross-References

| This Document References | Target GDD | Specific Element Referenced | Nature |
|--------------------------|-----------|----------------------------|--------|
| Ofertas por jugadores (último día D+9), pedir más | `design/gdd/mercado-de-pases.md` | `g.offers`, `marketTick`, `haggle`, `acceptOffer`, `rejectOffer`, `windowOpen`, `offerDeadline` | Rule dependency |
| Tratos del DT: respuesta del club, contraoferta, acuerdo, plazos, caídas, avisos de cierre | `design/gdd/mercado-de-pases.md` | `g.deals`, `dailyDeals`, `dealDeadline`, `dealNews`, `windowNotice` | Rule dependency / State trigger |
| Decisiones de trato en la pantalla del Mercado | `design/ux/mercado.md` | `DealDecision`, sección 8 ("Conteo", "Regla de leído", tabla D) | Ownership handoff |
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
- [x] Una oferta creada el día D figura en Pendientes desde D hasta el día D + 9 inclusive (`offerDeadline`), y al cerrar ese día deja el mensaje de vencimiento con `act: 'offer'`.
- [x] Una oferta de trabajo con `until = U` no figura en Pendientes el día U + 1.
- [x] Con una conferencia abierta, un `advanceDay` la responde con la opción 0 y emite una noticia firmada por el ayudante.
- [x] "Ir al partido" se detiene el mismo día en que aparece una oferta nueva y la pantalla queda en Bandeja › Pendientes.
- [x] "Ir al partido" no se detiene por una lesión, un resultado, el informe del rival ni el parte semanal.
- [x] "Ir al partido" no se detiene por una decisión que ya estaba pendiente al empezar.
- [x] Abrir un mensaje en la bandeja lo marca leído y baja en 1 la insignia.
- [x] La insignia de Bandeja muestra `sin leer + pendientes` y tiene estilo de aviso cuando hay al menos un pendiente.
- [x] El mensaje `rival` deja de ofrecer el informe cuando ese partido ya no es el próximo.
- [x] Una oferta del DT que espera respuesta no suma a la insignia ni frena; la respuesta con acuerdo o contraoferta es un pendiente `deal<id>` que frena al llegar y su último día (`tests/engine/deals.ts`).
- [x] La respuesta a una mejora vuelve a aparecer como decisión, y su mensaje es el más nuevo de la clave (`newestOf`).
- [x] Mejorar, retirar, aceptar el pedido, abrir la mesa, cancelar y firmar marcan leídos los mensajes del trato; la ruptura, la cancelación y el fichaje nacen leídos.
- [x] Con un rechazo, el mensaje viejo no hereda las acciones del trato nuevo (`pendingKeyOf(g, n) === null`).
- [x] El aviso de cierre del libro no tiene `act` y no es una decisión.
- [ ] Resolver una decisión desde Tratos deja la insignia de la Bandeja en N − 1 al firmar, cancelar, retirar, mejorar, aceptar o rechazar una oferta; en N al aceptar el pedido de una contraoferta o pedir más con éxito; nunca N + 1.

**Falta (de UI Requirements)**
- [ ] UR-04, UR-13, UR-14, UR-16, UR-17, UR-18, UR-38, UR-40, UR-42, UR-44.
- [ ] Rendimiento: con 400 mensajes y 60 tratos, `pendingAll`, `newestOf` y `unreadOf` corren en menos de 2 ms por dibujo (recorren `g.players` y `g.news` en cada `refresh`; a medir).
- [ ] Las constantes de poda y plazos viven en un archivo de datos.

**Experienciales**
- [ ] Un jugador de prueba no pierde ninguna oferta de trabajo por no haberla visto en su primera temporada.
- [ ] Un jugador de prueba resuelve una oferta por un jugador sin salir de la bandeja.

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ¿El avance tiene que frenar antes de que venza una decisión ya pendiente (UR-33)? | usuario | — | Resuelta (`design/ux/bandeja.md` pregunta 19): el último día para responder, una vez por decisión; también contraofertas y acuerdos, y el último día del libro (pregunta 22) |
| ¿"Continuar" de un día también tiene que llevar a la bandeja con una decisión nueva? | usuario | Ídem | `INTENT UNKNOWN` |
| `haggle` cambia el id de la oferta: ¿se conserva el id (y el `ref` del mensaje) o se actualiza el `ref`? | gameplay-programmer | Antes de implementar | Resuelta (2026-11-14): se conserva el id |
| ¿Una decisión cuenta una vez (pendiente) o dos (pendiente + mensaje sin leer)? | usuario + ux-designer | — | Resuelta: una vez; por oferta o trato, solo el mensaje más nuevo (regla 13b) |
| ¿La regla del mensaje más nuevo vale para las ofertas de trabajo? | gameplay-programmer | — | Abierta: haría falta un id por oferta de trabajo (`bandeja.md` pregunta 22) |
| Rechazar un trabajo deja al club con DT interino para siempre: ¿el motor tiene que nombrar uno al rechazar? | gameplay-programmer | — | Resuelta (2026-11-14): `rejectJob` nombra uno |
| ¿Las decisiones tienen que tener costo por omisión (por ejemplo, ignorar un pedido de salida empeora la armonía)? | usuario | — | `INTENT UNKNOWN` |
| ¿La venta de un jugador propio tiene que ser `me` (emitir con el `clubId` del vendedor o calcular `me` antes del traspaso)? | gameplay-programmer | — | Resuelta (2026-11-14): sí |
| ¿El pedido de salida tiene que vencer o escalar con el tiempo? | usuario | — | `INTENT UNKNOWN` |
| Mover `pendingOf`, `isMine` y las escrituras de la interfaz (`n.read`, `g.jobOffers`, `p.listed`) al motor (`design/ux/bandeja.md`, pregunta 5). | ui-programmer + lead-programmer | — | Resuelta: `src/engine/inbox.ts`, `markRead`, `rejectJob`, `setListed`. La interfaz pasa de `pendingOf` a `pendingAll` con la implementación del Mercado (en `8fe1dcb`: `App.tsx:185`, `:188`, `Inbox.tsx:120`) |
| ¿Hace falta un tema Dirigencia en la bandeja? (`design/ux/bandeja.md` lo propone) | usuario | — | Pendiente |

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-11-14 | Claude (reverse-doc) | Documentación inicial desde `news()`, `advanceDay`, `Inbox.tsx`, `App.tsx`, `Home.tsx`, `TopNav.tsx` |

*Generado por `/reverse-document design src/ui/Inbox.tsx`.*
| 2026-11-14 | Claude | Resueltos: id de la oferta al pedir más, venta propia y base actualizada en "Para vos", rechazar un trabajo; la nota "Error al guardar" (F7 en `--bad`) aparece tras una decisión si falla el guardado (`design/ux/bandeja.md`); la línea de consecuencias de un trabajo nombra al cuerpo técnico que se va con el DT y al que queda |
| 2026-11-15 | Claude | Tratos del mercado (`8fe1dcb`, `design/ux/bandeja.md` pregunta 22): `act: 'deal'` y sus emisores, pendiente `deal` (contraoferta y acuerdo) en `pendingAll` con plazo, fila `deal` de la tabla D, regla del mensaje más nuevo (`newestOf`), regla de leído al resolver (`readDecisionNews`) y mensajes que nacen leídos, conteo de una decisión una vez (F3), freno por la respuesta de un club y por el último día (UR-33 unificado a "el último día"), avisos de cierre del libro que no frenan, vencimientos con mensaje; UR-02, UR-08, UR-09, UR-33 y UR-36 cumplidos; UR-42 a UR-45 nuevos; líneas de `career.ts` y `squad.ts` del catálogo actualizadas |
