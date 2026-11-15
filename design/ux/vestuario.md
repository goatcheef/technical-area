# UX Spec: Vestuario

> **Status**: In Design (primera versión, 2026-11-15; falta pasarla por /ux-review)
> **Author**: usuario + ux-designer
> **Last Updated**: 2026-11-15
> **Journey Phase(s)**: `design/player-journey.md`: fase 4 (descubrimiento de la profundidad: "el primer conflicto de vestuario resuelto con una charla o un cambio de rol"), fase 5 (juego habitual: "una promesa en curso" como gancho de fin de sesión) y fase 3 (después del partido: "conformidad según los minutos")
> **Screen / Flow Name**: `LockerPage` (página `locker` de `src/ui/Locker.tsx`), la charla individual (`TalkModal`, misma ruta) y el detalle de vestuario de un jugador (`LockerCard`, nuevo: panel de esta pantalla y pestaña Vestuario de `PlayerPage`)
> **Platform Target**: web. Escritorio primero (mouse y teclado); celular por navegador (toque) por debajo de 760 px. Sin gamepad (fuera de alcance, `design/accessibility-requirements.md`, AM-10). Fuente: `project.yaml` (`targets: [Web]`, `primary_input: Keyboard & Mouse`, `touch_support: Partial`, `gamepad_support: None`).
> **Related GDDs**: `design/gdd/plantel.md` (la fuente principal: Core Rules 1-27, F1-F7, Edge Cases y UI Requirements, con la tabla "Lo que este sistema manda a la bandeja"), `comunicacion-y-bandeja.md` (UR-02, UR-11, UR-18, UR-22; pregunta abierta sobre el costo por omisión), `mercado-de-pases.md` (renovación con ambición, lealtad y conformidad; transferibles y pedidos de salida que aumentan las ofertas), `prensa-e-informes.md` (la prensa mueve la moral de todo el plantel y de un jugador; F3), `entrenamiento-y-cuerpo-tecnico.md` (ningún puesto del cuerpo técnico mueve la conformidad ni la moral; `sab('youth')` y `sab('asst')` solo tocan juveniles y potencial). Otras fuentes: `CLAUDE.md` y `docs/plan-ui-ux.md`.
> **Related ADRs**: ninguna. Restricciones de `CLAUDE.md`: estado `Game` serializable, navegación por `nav()`, la pantalla no escribe en `g`, `PlayerTable` es la tabla única de jugadores, `Game.version` 6 (campos nuevos opcionales con valor por defecto, sin subir la versión, como decidió el orquestador para el Mercado).
> **Related UX Specs**: `design/ux/bandeja.md` (la decisión "jugador que quiere irse", pendiente `out<pid>`, vive ahí; esta spec cambia su botón "Hablar con él", pregunta 4), `design/ux/mercado.md` (la negociación de renovación, `NegotiationModal` modo `renew`, y "Ver tus transferibles y quienes quieren irse" → Plantel `tab: 'transferibles'`: se enlazan, no se rediseñan), `design/ux/interaction-patterns.md` (patrones por id). Sin spec propia: ficha de jugador (`PlayerPage`; acá entra su pestaña Vestuario y el botón "Hablar" de la banda), Plantel (`Squad.tsx`) y el Inicio (`Home.tsx`; acá entra la línea "Vestuario" del mosaico "Para atender").
> **Accessibility Tier**: Standard (`design/accessibility-requirements.md`: WCAG 2.1 AA, más 2.5.8 y 2.4.11; texto mínimo 14/12/11 px, y nada por debajo de 12 px en esta pantalla)
> **Template**: UX Spec

> **Supuestos de esta especificación**
> - **Documentos de diseño.** Los GDD y el recorrido del jugador se escribieron a partir del código (`plantel.md` es `reverse-documented`). Donde la spec necesita algo que el motor no tiene, lo dice en la sección 8 como función nueva o cambio, y las decisiones de juego quedan en la sección 15 para el usuario. Nada de esta spec cambia una regla del juego sin pasar por la sección 15.
> - **Qué hace hoy el código** (verificado en `Locker.tsx`, `squad.ts`, `PlayerPage.tsx`, `Squad.tsx`, `Home.tsx`, `Inbox.tsx`, `inbox.ts`, `game.ts`, `PlayerTable.tsx`, `common.tsx`): (1) el Vestuario es un encabezado (título por armonía, `Gauge`, referentes) más una tabla propia con `scroll-x` (no usa `PlayerTable`) y un aviso con los nombres de los disconformes; (2) el botón Reserva de la tabla escribe `p.reserve` desde la interfaz, igual que las acciones masivas de `ownBulk`; (3) `TalkModal` decide qué opciones mostrar con reglas escritas en la interfaz (conformidad < 60, `wantsOut`, `promise`, `listed`), que repiten condiciones del motor; las opciones que no aplican desaparecen sin decir por qué; (4) `talk` devuelve solo un texto: la ventana no dice qué cambió; (5) la personalidad se ve como rasgos sueltos (`persLabels`) que solo nombran los extremos (16 o más, 5 o menos), mientras las charlas reaccionan a otros umbrales (paciencia con lealtad 13, "no se va" con lealtad 12, exigir con profesionalismo 14 o temperamento 14): el DT no puede prever la respuesta; (6) hay cinco escalas distintas para la conformidad (`Cond` 85/65, `moodTxt` 80/60/40/25, `Bar` 60/35, la bandeja 65/35, el chip "Molesto" < 35) y "Molesto" quiere decir < 35 en el chip y < 50 junto a un referente; (7) resolver el pedido de salida con una charla no marca leído el mensaje "X quiere irse" (`decisionKeyOf` solo conoce `offer` y `deal`), así que la decisión, una vez resuelta, vuelve a contar como mensaje sin leer; (8) "Hablar con él" en la bandeja lleva a la ficha › Vestuario sin abrir la charla; (9) no queda registro de las charlas (solo `p.lastTalk`) ni de las promesas cumplidas o rotas (solo su noticia).
> - **"Eventos"** quiere decir llamadas a funciones del motor (`src/engine/`) seguidas de `save()` y `refresh()`. No hay analítica.
> - **Sin audio**: las columnas de sonido dicen "—". **Un solo idioma** (español rioplatense).
> - **Lenguaje visual**: el estilo portal vigente y lo aprobado en la bandeja y el Mercado (chips con contador y estado activo con borde, fondo suave y ✓; confirmación en el lugar; nota de resultado; panel al costado de una tabla). Color, tipografía y peso visual son del art-director; acá se fija jerarquía, estados y contraste mínimo.
> - **Lecciones de las revisiones de la bandeja y del Mercado** (`production/ui/bandeja/review-*.md`, `production/ui/mercado/ux-review.md`, `ux-review-2.md`, `verificacion.md`) que esta spec incorpora desde el diseño: (a) ninguna acción va en un contenedor con `overflow` recortado ni en una barra fija, y ningún contenedor reutiliza clases globales genéricas (`.bar` es la barra de progreso de 5 px): todo lo nuevo lleva el prefijo `lk-`; (b) los criterios de la sección 14 comprueban con `elementFromPoint` que cada botón y cada foco se ven; (c) el foco nunca queda tapado por la barra superior ni por la inferior del celular (2.4.11: `scroll-padding` de su alto); (d) cambiar de filtro o de selección reemplaza la entrada del historial, abrir una ficha apila; (e) una decisión cuenta una vez, también después de resolverla; (f) solo pasa a leído lo que el DT abre o resuelve a propósito; (g) el foco nunca vuelve a un botón que quedó deshabilitado o desapareció; (h) un concepto, un componente y una fuente de datos: las condiciones y los números salen del motor, no de la pantalla; (i) los motivos de un botón deshabilitado se leen en pantalla, no solo en `title` (AC-05); (j) las disposiciones dependen del ancho del contenedor (`@container`), no solo de la ventana.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

El DT tiene 30 jugadores y minutos para 14. Cada semana necesita saber, sin hacer cuentas, quién está molesto y por qué ("juega el 20 % y espera el 62 %"), qué le prometió a quién y cómo viene esa promesa, quién sostiene al grupo y quién lo está tirando abajo, con quién conviene sentarse a hablar esta semana y qué pasa si no hace nada. El Vestuario es la oficina del DT para el lado humano del plantel: arriba, cómo está el grupo y qué lo mueve; después, la lista corta de lo que hay que atender, cada caso con su causa, su consecuencia y la charla a mano; abajo, el plantel completo con su humor, sus minutos y la reserva. Lo que más frustra (fase 4 y "Momentos críticos" de `player-journey.md`): que un titular pida irse sin que se haya visto venir, no acordarse de una promesa hasta que se rompe, que una charla salga mal sin entender por qué, y tener que abrir 30 fichas para encontrar al que está mal.

**The player goal**:

Responder en un vistazo "¿a quién tengo que atender esta semana y por qué?" y, para cada caso, entender la causa con números y hablar con el jugador en dos pasos (Hablar, elegir la charla; un tercero para confirmar lo que deja una obligación), sabiendo antes de elegir cómo suele reaccionar alguien como él y después qué cambió.

**The game goal**:

Que el humor del plantel sea legible (Pilar 3 "Cada decisión se entiende" y la prueba de diseño de `game-concept.md`: "la armonía muestra referentes y disconformes, no solo un número"): cada cambio de conformidad se rastrea a una cifra visible, ningún pedido de salida ni promesa rota llega sin señales previas, la decisión "quiere irse" se cuenta una sola vez (la bandeja es su lugar y el Vestuario la muestra), y toda acción pasa por una función del motor con el estado guardado.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Cinco casos: (a) volvió de un partido y quiere ver quién se quedó con bronca por los minutos (fase 3); (b) tocó "Vestuario" en la línea del mosaico "Para atender" del Inicio, que avisa disconformes; (c) llegó desde la barra (Plantel › Vestuario) planificando la semana (fase 4 y 5); (d) leyó en la bandeja "X quiere irse", "X se siente engañado" o "Reserva: no hubo partido" y quiere ver el cuadro completo; (e) volvió de una ficha de jugador (atrás). |
| What is their emotional state? | Calma con algo de preocupación. Con un pedido de salida o una promesa por vencer, tensión leve ("¿lo pierdo?"). Nunca presión de tiempo real: el tiempo no corre en esta pantalla (AC-01, AC-03). |
| What cognitive load are they carrying? | Media-alta: tiene en la cabeza el once del próximo partido y quiere cruzarlo con quién necesita minutos. Por eso esta pantalla dice la causa y la consecuencia en cada fila, y la tabla muestra minutos jugados contra esperados al lado del humor. |
| What information do they already have? | El número del mosaico "Para atender" del Inicio ("3 para atender, 1 quiere irse") o el mensaje que leyó. Conoce a sus titulares; no se acuerda de los minutos exactos de los suplentes ni de las fechas de sus promesas. |
| What are they most likely trying to do? | Primero: responder al que quiere irse o al que está molesto (charla, rol, minutos). Segundo: revisar sus promesas ("¿le estoy cumpliendo?"). Tercero: elegir a quién hablarle esta semana (una charla por jugador cada 7 días). Cuarto: armar la reserva del miércoles. Ocasional: entender por qué la armonía bajó. |
| What are they likely afraid of? | Que una charla empeore las cosas sin aviso; prometer algo que no puede cumplir; perder a un referente; gastar la charla de la semana y no poder responder si después pide irse; que la reserva no se juegue por falta de anotados; no entender por qué la armonía bajó. |

**Emotional design target for this screen**:

Conocer a su grupo: el DT siente que sabe qué le pasa a cada uno y por qué, que sus palabras pesan y que nada de lo que prometió se le escapa.

---

## 3. Navigation Position

**Screen hierarchy**:

```
Partida (barra superior, N1)
  └── Plantel (sección; GROUPS de App.tsx: Plantel, Vestuario, Cuerpo técnico)
        └── Vestuario (página `locker`)   ← esta pantalla
              ├── Detalle de vestuario del jugador (`LockerCard`, panel fijo ≥ 1180 px)
              ├── Charla individual (F5, `TalkModal`)            — modal sobre la pantalla
              ├── Ficha de jugador (N5, `player`, pestaña `personal` "Vestuario")
              │     └── la misma `LockerCard` y el mismo `TalkModal`
              ├── Negociación de renovación (F5, `NegotiationModal` modo `renew`, spec del Mercado) — solo un enlace
              └── Plantel con `tab: 'transferibles'` (spec del Mercado) — solo un enlace
```

**Modal behavior**: Non-modal. Es una página de la navegación (N1/N3). El tiempo no avanza salvo que el DT apriete Continuar o Ir al partido (F4). La charla es una ventana F5: Esc o "Cerrar" la cierran sin gastar la charla mientras no se haya elegido una opción; el foco vuelve a un control habilitado (sección 12).

**Dónde vive cada cosa** (la decisión central, preguntas 4, 9 y 10):

| Cosa | Dónde | Por qué |
|------|-------|---------|
| Cómo está el grupo (armonía, qué la mueve, referentes, efecto en la cancha) | Vestuario, encabezado | Es la pregunta de la pantalla; hoy es un número sin causa. |
| A quién atender esta semana | Vestuario › "Para atender" (una fila por jugador, con causa y consecuencia) | Responde "¿a quién y por qué?" sin recorrer la tabla. Es la única lista que ordena por urgencia. |
| **Jugador que quiere irse** (decisión `out<pid>`) | **Una decisión, dos vistas.** La bandeja la tiene en "Para decidir" y la cuenta; el Vestuario la muestra en "Para atender" con el chip "Para decidir" **sin contarla de nuevo** (sin insignia propia). Las dos resuelven con lo mismo: la charla (`TalkModal`, abierta en el lugar) o "Declararlo transferible" (`setListed`) | Como `OfferDecision` en Bandeja y Mercado: un componente, una clave, un conteo. |
| Promesas vigentes | Vestuario › "Para atender" (toda promesa vigente tiene fila, vaya bien o mal) y `LockerCard` | "¿Qué le prometí?" no puede depender de acordarse del nombre. |
| Detalle de un jugador (por qué está así, personalidad, promesa, charla, reserva) | `LockerCard`: panel del Vestuario (≥ 1180 px) y ficha › Vestuario. **Un componente** | Hoy son tres armados distintos (fila de la tabla, pestaña de la ficha, encabezado de la charla). |
| La charla | `TalkModal` (F5), desde el Vestuario, la ficha y la bandeja | `CLAUDE.md`: las ventanas quedan para decisiones cortas (la charla está nombrada). |
| Plantel completo con humor, minutos y reserva | Vestuario › tabla (`PlayerTable`, vista `vestuario`) | La tabla única del proyecto (D1): columnas, prioridades y vistas propias; sin desplazamiento horizontal. |
| Renovar, declarar transferible desde la ficha | Ficha › Contrato y mercado (spec del Mercado) | No cambia. El Vestuario enlaza "Contrato y renovación ▸" desde la `LockerCard`. |

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Plantel › Vestuario (barra de pantallas, N1) | Clic | Sin insignia propia (pregunta 9). |
| Celular: "Más" (N3) › Vestuario | Toque | No es una de las cuatro principales. |
| Barra de comandos (N7) | Ctrl+K → "Vestuario" | — |
| Tecla de número (N9, orden de `PAGES`) | Tecla fuera de campos | Atajo de una tecla existente: respeta `settings.singleKeys`. No se agregan atajos nuevos. |
| Mosaico "Para atender" del Inicio, línea "Vestuario" | Clic en "Vestuario" | Abre con la primera fila de "Para atender" elegida (≥ 1180 px). |
| Mensaje "Reserva: no hubo partido" (bandeja) | Texto del motor "Podés marcar más desde el Vestuario" | Sin botón propio hoy; esta spec suma el botón "Armar la reserva" al mensaje (sección 8, mensajes), que abre `{ page: 'locker', tab: 'reserva' }`. |
| Ficha de jugador › Vestuario | Pestaña | Misma `LockerCard`. |
| Historial (N4) | ◂ ▸, Alt+←/→ | Restaura filtro, selección y scroll. |
| Ayuda de pantalla (O2) | Primera entrada | `PageTip id="locker"`, texto en la sección 5.3. |

---

## 4. Entry & Exit Points

**Ruta del Vestuario.** Lo que hace falta para volver va en la ruta (N4); el resto se recuerda con `useSticky` (C4):

- `tab`: filtro de la tabla: `todo` | `reserva` | `juveniles`. Por defecto el recordado (`useSticky('lk.tab')`) o `todo`. Valores desconocidos caen en `todo`.
- `sel`: `p<id>`, el jugador del panel. Una clave de texto, como en el Mercado.
- Orden, columnas y vista de la tabla: los de `PlayerTable` (`tbl.*.locker`, `ta-table-locker`), como hoy en las demás tablas.

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Clic en Vestuario, barra de comandos, tecla | Cualquier pantalla | Página nueva, apila; `page-in` 160 ms | `{ page: 'locker' }` | Filtro recordado; selección según "Selección al entrar". |
| "Vestuario" del mosaico "Para atender" | Inicio | Igual | `{ page: 'locker', sel: 'p<id>' }` con el primero de `attentionOf(g)` | Sin nadie para atender, sin `sel`. |
| "Armar la reserva" del mensaje de reserva | Bandeja | Igual | `{ page: 'locker', tab: 'reserva' }` | Nuevo (sección 8). |
| Atrás o adelante | Ficha u otra pantalla | Restaura la entrada | Ruta + scroll de la página | Si el `sel` ya no está en el plantel (vendido), cae en "Selección al entrar". |

**Selección al entrar** (≥ 1180 px): la de la ruta si sigue en el plantel; si no, la primera fila de "Para atender"; si no hay nadie para atender, **ninguna**: el panel muestra el resumen del grupo (estado "Sin elegido", sección 6). No se elige "el primero de la tabla": no hay nada que proteger, pero un panel con un jugador cualquiera se lee como "este tiene algo". Por debajo de 1180 px no hay panel: no se elige nada.

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Cambiar de filtro | La misma pantalla | En el lugar; **reemplaza** la entrada | `tab` en la ruta y en `lk.tab` | Volver atrás sale del Vestuario. |
| Elegir un jugador (≥ 1180 px): fila de "Para atender" o de la tabla | La misma pantalla | En el lugar; **reemplaza** la entrada | `sel` | Elegir no ejecuta nada. |
| Elegir un jugador (< 1180 px) | Ficha › Vestuario (`tab: 'personal'`) | `nav()`, **apila** | — | Misma `LockerCard`. Al volver, el foco va a la fila de la que salió. |
| Nombre del jugador, "Ver la ficha" | Ficha › Resumen | `nav()`, apila | — | — |
| Hablar | `TalkModal` (F5) | Modal | — | Sin historial. |
| Elegir una charla (sin costo duradero) | La misma ventana, estado "Respuesta" | En el lugar | `talk(g, p, kind)`; `save()` | Gasta la charla de la semana. |
| Elegir una charla con costo duradero (prometer, cambiar el rol, dejarlo buscar club) → Confirmar | La misma ventana, estado "Respuesta" | F6 en la ventana | `talk(g, p, kind, rol)`; `save()` | Ver sección 6, "Confirmación". |
| Declararlo transferible (fila "Quiere irse" o `LockerCard`) | La misma pantalla | En el lugar; nota F7 | `setListed(g, pid, true)` (o la función de la pregunta 5); `save()` | La decisión `out<pid>` se resuelve en la bandeja también. |
| Anotar o sacar de la reserva (panel, columna, acción masiva) | La misma pantalla | En el lugar | `setReserve(g, ids, on)` (nueva); `save()` | Reversible: sin F6. |
| "Contrato y renovación ▸" | Ficha › Contrato y mercado | `nav()`, apila | — | La renovación es de la spec del Mercado. |
| "Ver transferibles en Plantel" | Plantel, `tab: 'transferibles'` | `nav()`, apila | — | El filtro que ya usa el Mercado. |
| Continuar o Ir al partido | La misma pantalla mientras avanza; la bandeja si frena | F4 | — | Las acciones se deshabilitan durante el avance (7.3). Un pedido de salida nuevo frena (regla vigente, `decisionKeys`) y abre la bandeja con `out<pid>`. |

---

## 5. Layout Specification

Resolución de referencia: 1440 × 900 en escritorio; 360 × 740 en celular. Umbrales: panel del jugador desde **1180 px** (el mismo del Mercado; por debajo, elegir abre la ficha); encabezado en dos filas por debajo de 900 px (según el ancho de su contenedor, `@container lk-head`); navegación inferior por debajo de 760 px.

### 5.1 ASCII Wireframe

**Escritorio (≥ 1180 px)**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ (barra superior N1 · Plantel › [Plantel] [Vestuario] [Cuerpo técnico])                        │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ (i) Ayuda O2, solo la primera vez                                               [Entendido]  │
│ VESTUARIO                                                                                    │
│ ┌─ lk-head ───────────────────────────────────────────────────────────────────────────────┐  │
│ │ (◠ 62) Clima normal        QUÉ LA MUEVE                  REFERENTES                     │  │
│ │ Armonía 62 de 100          Conformidad promedio 68  +66  {cara} R. Rojas  Acompaña      │  │
│ │ En la cancha: sin efecto   Referentes            +5     {cara} L. Ortiz  Acompaña      │  │
│ │ notable (+0,1 %)           2 disconformes         −6    {cara} M. Gómez  ! Resta        │  │
│ │                            1 temperamental        −3     Cómo se eligen ▸               │  │
│ │ Reserva: 8 anotados (mín. 7) · juega el mié 18 nov   [Armar la reserva]                 │  │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┬────────────────────────────────────┤
│ PARA ATENDER · 4                                        │ ┌─ LockerCard (panel, sticky) ────┐ │
│┃● {cara} M. Gómez · Titular        [Para decidir]       │ │ {cara} M. Gómez   DC  Titular   │ │
││   Quiere irse: juega 20 % y espera 62 %.               │ │ Quiere irse · Muy molesto (14)  │ │
││   Si no le respondés, siguen llegando ofertas y        │ │ POR QUÉ ESTÁ ASÍ                │ │
││   resta armonía.                           [Hablar]    │ │ Minutos  ▓▓░░░░|░░  20 % de 62 %│ │
│┃  {cara} J. Paz · Rotación          [Promesa en riesgo] │ │ se molesta por debajo de 53 %   │ │
││   Le prometiste 58 % hasta el 20 dic: lleva 31 %.      │ │ Últimos 6: 0·45·0·18·45·0       │ │
││   Le faltan 166 min en 3 partidos.         [Hablar]    │ │ Conformidad 14 ↓ baja tras cada │ │
││  {cara} T. Ruiz · Suplente         [Molesto]           │ │ partido · Moral 41              │ │
││   Juega 0 % y espera 14 %. Pierde moral tras cada      │ │ PERSONALIDAD                    │ │
││   partido.                    Hablaron el 12 nov ·     │ │ Ambición alta · Lealtad normal  │ │
││                               de nuevo desde el 19 nov │ │ Temperamento tranquilo · ...    │ │
││  {cara} F. Leiva · Clave           [Minutos prometidos]│ │ Profesional · Líder natural     │ │
││   Le prometiste 90 % hasta el 4 ene: lleva 88 %. Va    │ │ CHARLA                          │ │
││   bien.                                    [Hablar]    │ │ [● Hablar con él]               │ │
├─────────────────────────────────────────────────────────┤ │ [Declararlo transferible]       │ │
│ PLANTEL   (Todo el plantel 30) (En la reserva 8)        │ │ RESERVA [✓ Anotado]             │ │
│           (Juveniles 6)                     [Columnas]  │ │ Contrato y renovación ▸         │ │
│ ┌ PlayerTable vista "vestuario" (role="grid") ────────┐ │ │ Ver la ficha ▸                  │ │
│ │ Jugador      Pos Rol      Minutos   Conform.  Moral │ │ └─────────────────────────────────┘ │
│ │ M. Gómez !   DC  Titular  20/62 %   14 Muy m.  41  │ │                                    │
│ │ R. Rojas     MC  Clave    86/82 %   81 Muy c.  77  │ │                                    │
│ │ ...                                                 │ │                                    │
│ └─────────────────────────────────────────────────────┘ │                                    │
└─────────────────────────────────────────────────────────┴────────────────────────────────────┘
   CONTENIDO (≈ 62 %, desplaza con la página)                PANEL (≈ 38 %, mín. 340 px, sticky)
```

`●` marca el foco al entrar: la fila elegida de "Para atender" (o, sin nadie para atender, el primer chip de filtro). En la tabla, las columnas que no entran se ocultan por prioridad (`PRIO`); el nombre, el rol, los minutos y la conformidad nunca se ocultan.

**Celular (≤ 760 px) y ventana menor a 1180 px**

```
┌────────────────────────────────┐
│ [escudo] 14 nov   [Continuar]  │
├────────────────────────────────┤
│ Vestuario                      │
│ (◠ 62) Clima normal            │
│ Armonía 62 · sin efecto notable│
│ Qué la mueve ▾  Referentes ▾   │ ← dos disclosures (<details>)
│ Reserva: 8 anotados · mié 18   │
│ [Armar la reserva]             │
├────────────────────────────────┤
│ PARA ATENDER · 4               │
│┃{cara} M. Gómez [Para decidir] │ ← toda la fila es un botón (abre la ficha › Vestuario)
│┃ Quiere irse: juega 20 % de 62 │
│ [      Hablar (≥ 44 px)      ] │ ← botón hermano, no anidado
│┃{cara} J. Paz [Promesa en ries]│
│┃ Le faltan 166 min en 3 part.  │
│ [           Hablar           ] │
├────────────────────────────────┤
│ PLANTEL                        │
│ (Todo 30)(Reserva 8)(Juven. 6) │ ← chips; desplazables de costado
│ Jugador        Rol    Conform. │ ← PlayerTable con columnas por prioridad
│ M. Gómez !     Titular  14     │
│ ...                            │
├────────────────────────────────┤
│ Inicio  Bandeja  Plantel  Más  │ ← N3
└────────────────────────────────┘
```

**Charla individual (`TalkModal`, F5)**

```
╔══════════════════════════════════════════════════════════════╗
║ {cara} Charla con M. Gómez                          [✕]      ║ ← h2 = aria-labelledby
║ DC · Titular · Muy molesto (14) · moral 41 · Quiere irse     ║
║ ┌ Cómo está ───────────────────────────────────────────────┐ ║
║ │ Juega el 20 % de los minutos; su rol espera el 62 %.     │ ║
║ │ Ambición alta · Lealtad normal · Temperamento tranquilo  │ ║
║ │ · Profesional. Viene con promedio 6,4 (últimos 5).       │ ║
║ └──────────────────────────────────────────────────────────┘ ║
║ ( ) Decirle que no se va                                     ║ ← lista de opciones (radiogroup)
║     Acepta de buena gana si es leal. Él: lealtad normal.     ║
║ ( ) Prometerle más minutos                     tiene costo   ║
║     Hasta el 20 dic, jugar alrededor del 84 %: cumplís si    ║
║     juega al menos el 71 %. Quedan 5 partidos.               ║
║ ( ) Cambiarle el rol  [Clave|Titular|Rotación|Suplente|Pro.] ║
║ ( ) Pedirle paciencia                                        ║
║     Convence a los leales y a los poco ambiciosos. Él: no.   ║
║ ( ) Decirle que puede buscar club              tiene costo   ║
║ ( ) Felicitarlo · ( ) Exigirle más                           ║
║ Una charla por semana con cada jugador.                      ║
║                                   [Cancelar] [● Hablar]      ║ ← Hablar: primario, abajo, siempre visible
╚══════════════════════════════════════════════════════════════╝

Con una opción con costo, "Hablar" pasa en el lugar a:
║ Le vas a prometer jugar el 84 % hasta el 20 dic. Si no      ║
║ cumplís, se va a sentir engañado y el plantel lo nota.      ║
║                    [No] [● Confirmar: prometerle minutos]   ║

Respuesta (role="status", recibe el foco):
║ «Le tomo la palabra.»                                        ║
║ Conformidad 14 → 32 · Moral 41 → 46 · Ya no pide irse ·     ║
║ Minutos prometidos hasta el 20 dic                           ║
║                                              [● Listo]      ║
```

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Ayuda de pantalla | `PageTip id="locker"` (O2) | Ancho completo, una o dos líneas | No | Se descarta con "Entendido" |
| Encabezado (`lk-head`) | Armonía (medidor con número y palabras), efecto en la cancha, "Qué la mueve", referentes, estado de la reserva | Ancho completo; ~140 px en escritorio | No | `@container lk-head`: por debajo de 900 px de contenedor pasa a dos filas; por debajo de 560 px, "Qué la mueve" y "Referentes" son disclosures (`<details>`) cerrados. Nunca desplazamiento horizontal (AV-06) |
| Para atender (`lk-att`) | Una fila por jugador que necesita algo, por urgencia | Columna de contenido; alto según cantidad (normal 0 a 6) | Con la página | Sin tope ni "mostrar más": cada fila es un jugador del plantel (máx. ~35). Con 0, una línea (estado vacío) |
| Tabla del plantel | Filtros (chips) + `PlayerTable` vista `vestuario` | Columna de contenido | Con la página | Oculta columnas por prioridad (`PRIO`); sin desplazamiento horizontal; con el texto al 120 % también |
| Panel del jugador (`lk-panel`) | `LockerCard` del elegido o, sin elegido, resumen del grupo | 38 % (mín. 340 px), `position: sticky` bajo la barra superior | Sí, vertical propio si supera el alto visible | Las acciones van **dentro del contenido del panel**, nunca en una barra fija ni en un contenedor con `overflow: hidden`; el panel tiene `scroll-padding-top` igual al alto de la barra superior |
| Ventana de charla | `TalkModal` | Hasta 640 px de ancho, alto hasta 90 vh | Sí, el cuerpo; el pie con Cancelar / Hablar queda al final del contenido | A 320 × 568, "Hablar" y "Confirmar" son alcanzables desplazando la ventana (no hay pie fijo que tape opciones) |

Reserva de foco (2.4.11): la página lleva `scroll-padding-top` igual al alto de la barra superior y, en ≤ 760 px, `scroll-padding-bottom` igual al alto de N3 (62 px más el área segura).

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| Ayuda de pantalla | Nota | Ayuda | Texto nuevo: "Cada jugador espera minutos según su rol. Acá ves quién está molesto y por qué, qué le prometiste y con quién conviene hablar esta semana. Una charla por semana con cada uno." | Sí | Sí — O2 `PageTip`; cambiar el texto en `TIPS` |
| Título "Vestuario" | `h1` | Encabezado | Nombre de la pantalla (AC-09). Hoy el `h1` es el estado ("Clima normal") y "Vestuario" un `h3`: se invierte | Sí | Sí |
| Medidor de armonía | Medidor con número | Encabezado | `Gauge` con el número dentro, más el estado en palabras al lado ("Clima normal") y "Armonía 62 de 100". `role="img"` y `aria-label="Armonía 62 de 100: clima normal"` | Sí | Sí — `Gauge`, con `role`/`aria-label` nuevos (hoy es un SVG mudo) |
| Efecto en la cancha | Texto | Encabezado | "En la cancha: rinde un poco más (+0,8 %)", "sin efecto notable (+0,1 %)" o "rinde un poco menos (−1,2 %)", con `dec()`. Sale de `harmonyBoost` | Sí | No — nuevo texto |
| Qué la mueve | Lista de 3 a 4 líneas con signo | Encabezado | Los términos de F6: conformidad promedio, aporte de los referentes, disconformes (−3 c/u), temperamentales disconformes (−3 c/u). Con signo y número; el término nulo no se muestra | Sí | No — nuevo; datos de `harmony(g).parts` (sección 8) |
| Referentes | Lista de 3 | Encabezado | Cara, nombre (`data-pid`, abre la ficha) y "Acompaña" o "! Resta" (conformidad < 50: su aporte es negativo). "Cómo se eligen ▸" abre un `<details>` con la regla en palabras ("los tres sanos con más liderazgo, edad y rol en el plantel") | Sí | Parcial — reemplaza el chip "Molesto" de hoy, que usaba < 50 y chocaba con el "Molesto" < 35 de la tabla (pregunta 11) |
| Estado de la reserva | Línea + botón | Encabezado | "Reserva: 8 anotados (mínimo 7) · juega el mié 18 nov"; con menos de 7 sanos, "! Reserva: 5 anotados y sanos, faltan 2 para el mié 18 nov"; sin anotados, "Reserva: sin anotados (no se juega)". "Armar la reserva" pone el filtro En la reserva | Sí | No — nuevo |
| Encabezado "Para atender · N" | `h2` | Para atender | N = jugadores con al menos un motivo (una fila por jugador; nunca dos) | Sí | No |
| Fila de "Para atender" (`lk-att-row`) | Botón de fila + botón "Hablar" hermano | Para atender | Cara, nombre, rol, chip del motivo principal (texto), la causa con números y la consecuencia de no hacer nada (tabla "Motivos" abajo). El botón de fila elige (≥ 1180) o abre la ficha › Vestuario (< 1180). "Hablar" abre la charla; si ya hablaron, en su lugar un texto visible "Hablaron el 12 nov · de nuevo desde el 19 nov" (no un botón deshabilitado) | Sí | No — nuevo; anatomía parecida a la fila del bloque "Para decidir" (F1) pero **no es un `listbox`**: son botones en una lista (`ul`), para que "Hablar" sea alcanzable con Tab |
| Chips de filtro de la tabla | Botones alternables con contador | Tabla | Todo el plantel · En la reserva · Juveniles (rol Promesa). Uno activo; estado activo de C5 (borde, fondo suave, ✓, `aria-pressed`) | Sí | Sí — C5 (sin "alcance") |
| Tabla del plantel | `PlayerTable` con `onPick`, vista nueva `vestuario` | Tabla | Columnas: `name`, `pos`, `role`, `mins` (nueva: "20/62 %" con barra, `minutesOf`), `happy` (cambia: número + palabra de `moodOf`), `mor`, `pers` (nueva: rasgos cortos), `st` (estado: chips), `res` (nueva: "Sí" / "—"), `talk` (nueva: "Disponible" o "desde el 19 nov"). Prioridades nuevas: `mins` 2, `happy` 2, `role` 3, `pers` 7, `res` 6, `talk` 6. Reemplaza la tabla propia de `Locker.tsx` y su `scroll-x` | Sí | Sí — D1 `PlayerTable` (tabla única de `CLAUDE.md`), con columnas nuevas en `COLS` |
| Acciones masivas | Barra de D2 | Tabla | "A la reserva" y "Sacar de la reserva" (las de `ownBulk`), que pasan a llamar `setReserve` | Sí | Sí — D2 `ownBulk` (cambia la escritura directa) |
| `LockerCard` | Tarjeta de detalle | Panel; ficha › Vestuario | Ver "Anatomía de `LockerCard`" abajo | Sí | No — nuevo, **único** para el detalle de vestuario de un jugador |
| Resumen del grupo (panel sin elegido) | Texto | Panel | "Elegí un jugador de la lista o de la tabla para ver por qué está así y hablar con él." más la lista de promesas vigentes (nombre, fecha, va bien / en riesgo) | Sí | No |
| Nota de resultado | Texto `role="status"` | Fila, panel | "Declaraste transferible a M. Gómez. Las ofertas van a llegar a la bandeja.", "Anotaste a 3 en la reserva." | Tras una acción | Sí — F7 |
| `TalkModal` | Ventana | Sobre la pantalla | Ver "Anatomía de `TalkModal`" abajo | Sí | Sí — F5 `Modal` (con `aria-labelledby`, AC-09), rediseño del contenido |
| Confirmación en el lugar | Par de botones | `TalkModal` | "Confirmar: prometerle minutos" / "No", con la consecuencia escrita arriba | En opciones con costo | Sí — F6 |
| Línea "Vestuario" del mosaico "Para atender" (Inicio) | Texto + botón | Inicio | "Vestuario: clima normal (62) · 4 para atender, 1 quiere irse" con concordancia; sin nadie, "Vestuario: clima normal (62) · nadie para atender". Botón "Vestuario" | Sí | Sí — `Home.tsx`, con los números de `attentionOf` en lugar de los de hoy (`hm.unhappy` y `wantsOut` contados aparte) |

**Motivos de "Para atender"** (una fila por jugador; el motivo principal es el de mayor rango y los demás van como chips secundarios; el orden de las filas es por rango y, dentro de un rango, por conformidad de menor a mayor). Todos salen de `attentionOf(g)` (sección 8); ninguno se calcula en la pantalla.

| Rango | Motivo (chip) | Condición (motor) | Causa (texto) | Consecuencia de no hacer nada (texto) |
|---|---|---|---|---|
| 1 | **Para decidir** · "Quiere irse" | `wantsOut && !listed` (es el pendiente `out<pid>` de la bandeja) | "Quiere irse: juega 20 % y espera 62 %." (o la causa que lo llevó: "desde que le dijiste que podía buscar club") | "Si no le respondés, siguen llegando ofertas por él y resta armonía." Sin plazo: "No vence." |
| 1 | "Quiere irse · transferible" | `wantsOut && listed` | "Está declarado transferible y quiere irse." | "Sigue disconforme hasta que se vaya o lo convenzas: resta armonía." Sin chip "Para decidir" (no es pendiente) |
| 2 | **Promesa en riesgo** | Promesa vigente por debajo de su umbral (`promiseStatus(...).onTrack === false`) | "Le prometiste 58 % hasta el 20 dic: lleva 31 %. Le faltan 166 minutos en 3 partidos." (o "Ya no llega: aunque juegue todo, no cumplís.") | "Si no juega más, el 20 dic se siente engañado: pierde mucha conformidad y moral, el plantel lo nota y baja tu prestigio." |
| 3 | **Molesto** | `happy < 35` | "Juega 0 % y espera 14 %." (o "Desde que le bajaste el rol", "Desde la promesa rota del 3 nov", si la causa fue esa; sección 8, `moodCause`) | "Pierde moral después de cada partido y resta armonía." Si además puede pedir irse (`happy < 18`, rol no Promesa, lealtad que lo permite): "Puede pedir irse en cualquier momento." |
| 4 | **En baja** | `happy ≥ 35`, al menos 3 partidos en `recent` y minutos por debajo de su umbral (`share × 0,85`) | "Juega 30 % y espera 62 %: se molesta por debajo de 53 %." | "Su conformidad baja después de cada partido en que no juegue más." |
| 5 | **Referente que resta** | Referente con `happy < 50` | "Es referente y no está contento (conformidad 44)." | "Mientras siga así, resta armonía en lugar de sumar." |
| 6 | **Minutos prometidos** | Promesa vigente que va bien | "Le prometiste 90 % hasta el 4 ene: lleva 88 %. Va bien." | "Si sigue así, cumplís." |

El "Molesto" del chip se queda con el umbral del motor (< 35, el de `harmony` y el de la pérdida de moral). El referente con conformidad entre 35 y 49 no es "molesto": "Resta" (pregunta 11).

**Anatomía de `LockerCard`** (el mismo componente en el panel y en la ficha › Vestuario; en la ficha va a dos columnas por `@container lk-card` desde 720 px):

1. **Encabezado**: cara, nombre, puesto, rol en el plantel (`STATUS[].name`) y el estado en palabras: "Quiere irse · Muy molesto (14)" (`moodOf`). En la ficha, el encabezado ya está en la banda: se omite.
2. **Por qué está así**: barra de minutos con su número ("20 % de 62 %"), una marca en el umbral y el texto "se molesta por debajo de 53 %"; los minutos de los últimos partidos que cuentan ("Últimos 6: 0 · 45 · 0 · 18 · 45 · 0", que dan el 20 %; con menos de 3, "Todavía no cuenta: jugó 2 de los 3 partidos que hacen falta"); conformidad con número, palabra y tendencia ("↓ baja tras cada partido", "↑ sube", "estable", sección 8, `moodOutlook`); moral con número y su diferencia con la conformidad en una línea: "La moral sube y baja con los resultados, la prensa y las charlas; la conformidad, con sus minutos y su rol." (una vez, colapsable); si la causa fue una charla, una promesa rota o un cambio de rol, esa línea ("Desde que le bajaste el rol el 2 nov").
3. **Personalidad**: los rasgos de `persTraits` (pregunta 1): una palabra por rasgo (ambición, lealtad, temperamento, presión), más profesionalismo y liderazgo; nunca números (decisión de diseño; la precisión es la pregunta 1).
4. **Promesa** (si hay): "Le prometiste jugar alrededor del 84 % hasta el 20 dic. Cumplís si juega al menos el 71 %. Lleva 31 % en 2 partidos; le faltan 266 minutos en los 3 partidos que quedan." Con el aviso del motor: "Si para el 20 dic jugó menos de 2 partidos, el plazo se corre 14 días."
5. **Pedido de salida** (si hay): "Quiere irse desde el 9 nov. No vence." y, si es transferible, "Está declarado transferible."
6. **Charla**: "Hablar con él" (primario) o, si ya hablaron, el texto "Hablaron el 12 nov ({respuesta corta}). Podés volver a hablarle desde el 19 nov." en lugar del botón; "Declararlo transferible" (común) solo si quiere irse y no es transferible y se puede vender (`canSell`); "Contrato y renovación ▸" (enlace).
7. **Reserva**: alternable "Anotado en la reserva" / "Anotar en la reserva" (`aria-pressed`), con "Juega el mié 18 nov" o "La reserva no se juega con menos de 7 anotados y sanos (hoy 5)".
8. **Charlas recientes** (solo en la ficha, si el motor guarda el registro, pregunta 7): las últimas 5 con fecha, charla y respuesta corta; y las promesas cumplidas o rotas de la temporada.
9. "Ver la ficha ▸" (solo en el panel).

**Anatomía de `TalkModal`**:

1. Título `h2` "Charla con {nombre}" (nombre accesible de la ventana) y la línea de estado (rol, conformidad en palabra y número, moral, "Quiere irse" si aplica). Botón ✕ con `aria-label="Cerrar la charla"`.
2. **Cómo está** (caja): minutos jugados contra esperados en una frase, los rasgos de personalidad, la forma reciente con el mismo cálculo que usa `talk` ("Viene con promedio 6,4", de `talkContext`), la promesa vigente si hay.
3. **Opciones** (`role="radiogroup"` con nombre "Qué le decís"): cada opción con su título, la regla en palabras y, cuando la regla depende de un rasgo o de un dato del jugador, ese rasgo o dato ("Él: lealtad normal", "Viene con promedio 6,4", pregunta 3). Disponibilidad, reglas y textos salen de `talkOptions(g, p)` del motor (sección 8), no de la pantalla. Orden: primero las que responden a su situación (si quiere irse: "Decirle que no se va", "Prometerle más minutos", "Cambiarle el rol", "Decirle que puede buscar club"; si está molesto: "Prometerle más minutos", "Pedirle paciencia", "Cambiarle el rol"), después "Felicitarlo" y "Exigirle más". Las que no tienen sentido no se muestran ("Decirle que no se va" sin pedido de salida); las que tienen sentido pero una regla las bloquea se muestran deshabilitadas con el motivo visible ("Ya tiene una promesa hasta el 20 dic.", "Está a préstamo: no se lo puede declarar transferible.", "Ya está declarado transferible.").
   - **Prometerle más minutos**: el objetivo y el umbral escritos ("jugar alrededor del 84 % hasta el 20 dic; cumplís si juega al menos el 71 %"), y cuántos partidos del club caen en ese plazo.
   - **Cambiarle el rol**: selector segmentado con los cinco roles (C1) dentro de la opción; debajo, lo que pasa: "Va a esperar jugar el 82 % (hoy juega el 20 %)." y "Subirle el rol lo pone contento, pero si no le das esos minutos se va a molestar más rápido." o "Bajarle el rol lo molesta: más si es ambicioso o temperamental."
   - **Decirle que puede buscar club**: "Queda transferible y los clubes van a ofertar. Si no lo pidió, se ofende y pasa a querer irse."
4. Pie: "Una charla por semana con cada jugador." y los botones "Cancelar" y "Hablar" (primario, deshabilitado hasta elegir una opción, con el motivo "Elegí qué decirle" visible al lado mientras esté deshabilitado).
5. **Confirmación** (F6, solo para opciones con costo duradero: prometer, cambiar el rol, dejarlo buscar club; pregunta 6): "Hablar" se reemplaza en el lugar por la consecuencia en una línea y "Confirmar: …" / "No".
6. **Respuesta**: la frase del jugador entre comillas, la línea de efectos con antes → después ("Conformidad 14 → 32 · Moral 41 → 46"), los cambios de estado ("Ya no pide irse", "Minutos prometidos hasta el 20 dic", "Quedó transferible", "Nuevo rol: Clave") y "Listo". Todo de lo que devuelve `talk` (sección 8, pregunta 14).
7. **Ya hablaron** (llega abierta por un camino que no la deshabilitó): "Ya hablaste con él el 12 nov. Podés volver a hablarle desde el 19 nov." y "Listo".

**Primary focus element on open**: en la página, la fila elegida de "Para atender" (o, sin nadie para atender, el chip de filtro activo); al volver de una ficha, la fila o la celda de la tabla de la que se salió. En `TalkModal`, la primera opción habilitada del `radiogroup`; en "Respuesta", el contenedor de la respuesta (`tabindex="-1"`); en "Ya hablaron", "Listo". En la ficha › Vestuario, el primer control de la `LockerCard`.

### 5.4 Information Hierarchy

1. **¿Hay alguien para atender? ¿Quién y por qué?** "Para atender · N" con su primera fila, arriba del pliegue a 1440 × 900 y a 360 × 740 (en celular, debajo del encabezado compacto). Con 0, una línea que lo dice.
2. **La causa con números y la consecuencia**: en cada fila, "juega 20 % y espera 62 %" y qué pasa si no hace nada. Es lo que el recorrido pide para que un pedido de salida no se sienta "un castigo sin aviso".
3. **Qué prometí**: toda promesa vigente tiene fila; la que va mal sube al rango 2.
4. **Cómo está el grupo**: armonía en palabras y número, qué la mueve y los referentes. Va arriba de todo pero en una franja baja: es contexto, no la tarea.
5. **El detalle de uno** (panel): por qué está así, personalidad, promesa, charla.
6. **El plantel completo**: la tabla con minutos, conformidad y reserva; ordenable.
7. **Puede esperar**: la regla de los referentes, las charlas recientes, la diferencia entre moral y conformidad (colapsables).

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Carga | — | No existe: el estado está en memoria | — | Dibuja en el primer cuadro; sin esqueletos. |
| Poblada | Plantel con jugadores | Encabezado, "Para atender", tabla y panel | Todo habilitado | Estado normal. |
| Nadie para atender | `attentionOf(g)` vacío | "Para atender" en una línea: "Nadie para atender: todos juegan lo que esperan y no hay promesas en curso." | Sin selección al entrar; el panel muestra el resumen del grupo | Contesta la pregunta también cuando es "nadie". |
| Inicio de temporada / plantel recién asumido | Nadie tiene 3 partidos en `recent` | En la tabla, minutos "—" con "Todavía no cuenta (2 de 3 partidos)"; en el encabezado, "La conformidad empieza a moverse después del tercer partido de cada jugador." | — | F8. Evita leer "0 %" como un problema. |
| Con pedido de salida | `wantsOut && !listed` | Fila con chip "Para decidir", rango 1; chip "Quiere irse" en la tabla (D6) | Resolver aquí también la resuelve en la bandeja (misma clave) | No suma a ninguna insignia del Vestuario. |
| Promesa en riesgo | `promiseStatus.onTrack === false` | Fila de rango 2 con "!" y los minutos que faltan | — | Texto y "!", no solo color. |
| Promesa que se extiende | Llega `until` con menos de 2 partidos | La fila y la `LockerCard` dicen "El plazo se corrió al {fecha nueva}: jugó menos de 2 partidos." durante 7 días | — | Hoy la prórroga es silenciosa (sección 8, mensajes). |
| Charla ya usada | `!canTalk(g, p)` | En la fila y en la `LockerCard`, el texto "Hablaron el … · de nuevo desde el …" en lugar del botón; en la tabla, la columna "desde el 19 nov"; en la banda de la ficha, el botón "Hablar desde el 19 nov" deshabilitado con ese texto como etiqueta | No abre la ventana | El motivo se lee siempre (AC-05). Ver pregunta 8 (charla pedida por el jugador). |
| Reserva incompleta | Anotados sanos < 7 y anotados > 0 | Línea del encabezado con "!" y cuántos faltan; chip En la reserva con el número | — | El miércoles llega el mensaje "Reserva: no hubo partido" (regla vigente). |
| Sin reserva | Nadie anotado | "Reserva: sin anotados (no se juega)." | — | No es un error: el DT puede no usarla. |
| Elegido (≥ 1180 px) | Clic, Enter, ruta | Fila o celda con fondo suave, borde izquierdo de 3 px y `aria-selected` (tabla) o `aria-current="true"` (fila de "Para atender"); `--sel`, nunca `--accent` ni `--warn` | Panel con su `LockerCard` | El estado no depende solo del fondo. |
| Sin elegido (≥ 1180 px) | Nadie para atender y sin `sel` | Panel con el resumen del grupo y las promesas vigentes | — | — |
| Filtro vacío | En la reserva sin anotados; Juveniles sin jugadores con rol Promesa | F8: "Nadie anotado en la reserva. Marcalos en la tabla o desde el panel: juega los miércoles con al menos siete." / "No tenés jugadores con rol Promesa. Los juveniles de inferiores suben al empezar cada temporada." | — | — |
| Charla: elegir | Ventana abierta, `canTalk` | Opciones con su regla; "Hablar" deshabilitado con "Elegí qué decirle" | Esc cierra sin gastar la charla | — |
| Charla: confirmación | Opción con costo + "Hablar" | Consecuencia escrita + "Confirmar: …" / "No" en el lugar de "Hablar" | Esc o "No" vuelven a elegir (no cierran); cambiar de opción cancela la confirmación | F6. |
| Charla: respuesta | `talk` devolvió el resultado | Frase, efectos antes → después, cambios de estado, "Listo" con el foco en la respuesta | Las opciones desaparecen; Esc o "Listo" cierran | La charla ya está gastada: cerrar no la devuelve. |
| Charla: ya hablaron | La ventana se abrió sin `canTalk` | Texto con la fecha y "Listo" | — | Respaldo: los botones de abrir no deberían permitirlo. |
| Charla: el jugador ya no está | Se vendió o se fue (no debería pasar con la ventana abierta) | "Ya no está en el plantel." y "Listo" | — | F8. |
| Avance en curso | F4 corriendo | La pantalla se actualiza por día; "Hablar", "Declararlo transferible" y los alternables de reserva deshabilitados con "Frená el avance para hablar con el plantel" visible | Ver 7.3 | Igual que la bandeja. |
| Decisión resuelta en otra pantalla | El pedido de salida se resolvió en la bandeja o en la ficha | La fila cambia de motivo o desaparece en el próximo `refresh()`; si estaba elegida, el panel la sigue mostrando con su estado nuevo | — | Las filas salen del estado, no se guardan. |
| Jugador vendido con la pantalla abierta | `p.clubId !== g.userClubId` en el próximo dibujo | Desaparece de la lista y la tabla; si estaba elegido, el panel dice "{nombre} ya no está en el plantel." con "Ver la ficha" | — | — |
| Error al guardar | `save()` devuelve `false` | Nota F7 en `--bad`: "No se pudo guardar la partida. La charla quedó hecha en esta sesión; probá exportar la partida desde Ajustes." | El estado ya cambió en memoria; no se revierte | Igual que bandeja y Mercado (`tests/ui/guardado.cjs`). |
| Celular / < 1180 px | Ancho | Sin panel; elegir abre la ficha › Vestuario | — | — |

---

## 7. Interaction Map

Entradas cubiertas: mouse y teclado (escritorio), toque (celular). Gamepad: fuera de alcance (AM-10). **No se agregan atajos de una tecla** (N9 y AM-03); Espacio sobre botones, campos y filas no es Continuar (regla global de `App.tsx`); sobre la fila de la tabla vale lo que defina D1 para `onPick` (lo mismo que el Mercado).

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| Tab / Mayús + Tab | Teclado | Recorre zonas en el orden de la sección 12 | Foco visible (A2, anillo `--sel`) | — | En "Para atender", dos paradas por fila (fila y "Hablar"); la tabla es una sola parada (D1, foco itinerante). |
| ↑ / ↓ | Teclado, foco en la tabla | Fila anterior o siguiente (D1 `onPick`) | Foco en la fila; no elige hasta Enter o clic (igual que el Mercado) | — | El oyente va en la tabla, no en `window`; ignora `defaultPrevented`. |
| Enter | Teclado, foco en una fila de la tabla | Elige (≥ 1180) o abre la ficha › Vestuario (< 1180) | Panel actualizado; el foco se queda en la fila | — | — |
| Enter / Espacio | Teclado, foco en una fila de "Para atender" | Igual que clic | Igual | — | Es un `button`. |
| ← / → | Teclado, foco en los chips de filtro o en el selector de rol | Mueve el foco en el grupo | Foco visible | — | Una parada de Tab por grupo (C5, C1). |
| ↑ / ↓ | Teclado, foco en el `radiogroup` de la charla | Mueve la opción marcada | Opción marcada con su ● y fondo suave | — | Patrón nativo de radios; Tab sale del grupo al botón "Hablar". |
| Esc | Teclado, ventana de charla | En "Confirmación", vuelve a elegir; en el resto, cierra | — | — | Esc no cierra mientras hay una confirmación abierta (primero la cancela). |
| Mouse: hover en fila o nombre | Escritorio | Ficha breve (I1) a los 380 ms en los elementos con `data-pid` | `.hovercard` | — | No elige. |
| Rueda | Escritorio | Desplaza la página o el panel según dónde esté el puntero | — | — | El panel es `sticky` con scroll propio. |
| Clic derecho | Escritorio | Sin acción propia | — | — | — |
| Deslizar | Celular | Desplazamiento vertical; los chips se deslizan de costado | — | — | Sin gestos propios. |

### 7.2 Action Inputs

| Input | Platform | Context (What must be focused) | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|-------------------------------|--------|----------|-----------|-----------|-------|
| Clic / Enter / toque | Todas | Fila de "Para atender" | Elige (≥ 1180) o `nav({ page: 'player', id, tab: 'personal' })` | Panel o ficha | Ninguna / `page-in` | — | Reemplaza / apila. |
| Igual | Todas | "Hablar" (fila, `LockerCard`, banda de la ficha) | Abre `TalkModal` | Ventana con el foco en la primera opción | `pop` 140 ms | — | — |
| Igual | Todas | Opción de la charla | La marca | ● y fondo suave; "Hablar" se habilita | Ninguna | — | — |
| Igual | Todas | "Hablar" (opción sin costo) | `talk(g, p, kind)` | Estado "Respuesta" con el foco en ella | Ninguna | — | Gasta la charla. |
| Igual | Todas | "Hablar" (opción con costo) | Abre F6 | Consecuencia + "Confirmar: …" con el foco | Ninguna | — | — |
| Igual | Todas | "Confirmar: …" | `talk(g, p, kind, rol)` | "Respuesta" | Ninguna | — | — |
| Igual | Todas | "No" (F6) | Cancela la confirmación | Vuelve "Hablar"; el foco a la opción marcada | Ninguna | — | — |
| Igual | Todas | "Listo" / ✕ / Esc | Cierra la ventana | El foco vuelve a un control habilitado (sección 12) | `fade` | — | En la bandeja, si la decisión `out<pid>` quedó resuelta, la bandeja pasa a "Resuelto" con la respuesta como nota F7 (pregunta 4). |
| Igual | Todas | "Declararlo transferible" | `setListed(g, pid, true)` (o la función de la pregunta 5) | Nota F7 "Declaraste transferible a {nombre}. Las ofertas van a llegar a la bandeja." La fila pasa a "Quiere irse · transferible" | Ninguna | — | Reversible desde la ficha › Contrato: sin F6 (igual que la bandeja). |
| Igual | Todas | Alternable de reserva (panel) | `setReserve(g, [pid], !on)` | `aria-pressed` y texto cambian; la línea del encabezado se actualiza | Ninguna | — | Reversible. |
| Igual | Todas | "A la reserva" / "Sacar de la reserva" (barra masiva) | `setReserve(g, ids, on)` | Nota F7 "Anotaste a 3 en la reserva." | Ninguna | — | D2. |
| Igual | Todas | "Armar la reserva" | Pone el filtro En la reserva (`tab: 'reserva'`, reemplaza) | Tabla filtrada; el foco al chip | Ninguna | — | Si nadie está anotado, el filtro muestra a todos con la columna Reserva primero: el estado vacío dice cómo marcarlos. |
| Igual | Todas | Chip de filtro | Cambia el filtro | Tabla filtrada; reemplaza la entrada | Ninguna | — | `aria-pressed`. |
| Igual | Todas | Encabezado de columna | Ordena (D1) | `aria-sort` | Ninguna | — | — |
| Igual | Todas | Nombre del jugador, referente, "Ver la ficha ▸" | `openPlayer(id)` | Ficha | `page-in` | — | Apila. |
| Igual | Todas | "Contrato y renovación ▸" | `nav({ page: 'player', id, tab: 'contrato' })` | Ficha › Contrato y mercado | `page-in` | — | La renovación es de la spec del Mercado. |
| Igual | Todas | "Ver transferibles en Plantel" (en la fila "Quiere irse · transferible") | `nav({ page: 'squad', tab: 'transferibles' })` | Plantel filtrado | `page-in` | — | — |
| Igual | Todas | "Cómo se eligen ▸", "Qué la mueve ▾", "Referentes ▾" | Abre o cierra el `<details>` | Contenido a la vista | Ninguna | — | Nativo. |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Avance en curso (F4) | "Hablar", "Declararlo transferible", reserva y acciones masivas deshabilitados con el motivo visible; elegir, filtrar y ordenar siguen | El estado cambia cada día. Espacio y Esc frenan (N9). |
| Ventana de charla abierta (F5) | La página no recibe teclas; foco atrapado | AM-07. |
| Confirmación F6 en la charla | Solo Confirmar, No, Esc y cambiar de opción (que la cancela) | Confirmación en el lugar. |
| Charla ya usada | No hay botón "Hablar": texto con la fecha | Regla del motor (`canTalk`), salvo la excepción de la pregunta 8. |
| Jugador a préstamo | "Declararlo transferible" no se muestra; en la charla, "Decirle que puede buscar club" deshabilitada con el motivo | `canSell`. |
| Menú de la barra abierto (N2) | La tabla no reacciona a ↑ ↓ | El foco está en el menú. |

---

## 8. Data Requirements

**Regla**: la pantalla no escribe en `Game`. Hoy lo hace en dos lugares que esta spec reemplaza: `p.reserve = !p.reserve` (`Locker.tsx`) y `p.reserve = true/false` (`ownBulk` de `PlayerTable.tsx`) → `setReserve(g, ids, on)`. `TalkModal` deja de decidir la disponibilidad de las charlas: lo hace `talkOptions`.

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Plantel propio | `squadOf(g, g.userClubId)` | En cada `refresh()` | `game.ts` | `Player[]` | Vacío: imposible en juego (el plantel nunca queda vacío); F8 genérico |
| Armonía, referentes, disconformes | `harmony(g)` | Igual | `squad.ts` | `{ value, leaders, unhappy, parts }`; **`parts` es nuevo**: `{ base: number (prom × 0,7 + 18), lead: number, unhappy: number (−3 × n), temper: number (−3 × n) }` con los mismos términos de F6, para "Qué la mueve" | — |
| Efecto en la cancha | `harmonyBoost(g)` | Igual | `squad.ts` | número (≈ 0,964 a 1,024) | Se muestra como porcentaje con `dec(v, 1)` y en palabras (≥ +0,5 % "rinde un poco más", ≤ −0,5 % "rinde un poco menos", si no "sin efecto notable") |
| Estado en palabras de la armonía | `harmonyWord(v)` (nueva; hoy el umbral 70/45/25 está en `Locker.tsx`) | Igual | `squad.ts` | "Grupo unido" ≥ 70, "Clima normal" ≥ 45, "Hay ruido" ≥ 25, "Vestuario partido" | — |
| **Conformidad en palabras** | `moodOf(happy)` (nueva, **única** escala) | Igual | `squad.ts` | `{ word, band }`: "Muy contento" ≥ 80, "Contento" ≥ 60, "Conforme" ≥ 35, "Molesto" ≥ 18, "Muy molesto" < 18. Los cortes 35 y 18 son los del motor (pérdida de moral y armonía; pedido de salida). Reemplaza `moodTxt` (`PlayerPage.tsx`), los colores de `Cond` para la conformidad, la `Bar` de `Locker.tsx`, los cortes 65/35 de la bandeja y el `Gauge` no | `happy` sin definir: 70 (`initSquad`) |
| Minutos jugados y esperados | `minutesOf(g, p)` (nueva; envuelve `minutesShare` y `STATUS`) | Tras cada partido del DT | `squad.ts` | `{ got, expected, threshold: expected × 0,85, recent: number[], counts: recent.length ≥ 3 }` | Con menos de 3: "Todavía no cuenta" |
| Tendencia de la conformidad | `moodOutlook(g, p)` (nueva) | Igual | `squad.ts` | `{ trend: 'baja' \| 'sube' \| 'estable' \| 'sin datos', canAskOut: boolean }`. `baja` si cuenta y `got < threshold`; `sube` si cuenta y `got ≥ threshold` y `happy < 100`; `canAskOut` si `happy < 18`, rol con nivel ≥ 1 y lealtad < 15. **No expone** el sorteo semanal (`hash01(id, semana)`) | — |
| Causa del humor | `moodCause(g, p)` (nueva) | Al cambiar | `squad.ts` | La última causa que no son los minutos, con fecha: promesa rota, rol bajado, charla mal recibida, "puede buscar club" sin pedirlo. **Necesita guardar** `p.moodNote?: { date, kind }` (campo opcional nuevo) en `talk` y en `dailySquad` | Sin nota: la causa es la de los minutos |
| Motivos de "Para atender" | `attentionOf(g)` (nueva, **única** fuente para la lista, el número N y la línea del Inicio) | En cada `refresh()` | `squad.ts` | `{ pid, reasons: Reason[], rank }[]` ordenado (tabla "Motivos" de 5.3) | Vacío → "Nadie para atender…" |
| Promesa vigente | `promiseStatus(g, p)` (nueva) | Tras cada partido; al pasar el día | `squad.ts` | `{ target, pass: target × 0,85, got, played: n, until, matchesLeft, minutesNeeded, onTrack, reachable, extended }`. `matchesLeft`: partidos del club del DT entre hoy y `until` (`g.fixtures`); `minutesNeeded = max(0, pass × 90 × (played + matchesLeft) − Σ mins)`; `onTrack`: `got ≥ pass` (al ritmo de hoy, cumple); `reachable`: `minutesNeeded ≤ 90 × matchesLeft` (si no, "Ya no llega: aunque juegue todo, no cumplís."). Con menos de 2 partidos jugados, `onTrack` es verdadero y la fila dice "Todavía no jugó lo suficiente para medirla" | Sin promesa: nulo |
| Personalidad visible | `persTraits(g, p)` (nueva; reemplaza a `persLabels` en todas las pantallas propias) | Fija | `squad.ts` | Una palabra por rasgo, con bandas cuyos cortes son los umbrales del motor (pregunta 1, opción B): **Ambición** "Alta" ≥ 15 (paciencia corta del representante, juvenil impaciente), "Normal" 9-14, "Baja" ≤ 8 (acepta pedirle paciencia); **Lealtad** "Muy leal" ≥ 16, "Leal" 13-15 (acepta paciencia; nunca pide irse desde 15), "Normal" 8-12, "Poco apegado" ≤ 7; **Temperamento** "Temperamental" ≥ 14 (se enoja si le exigís; resta armonía desde 15), "Tranquilo" ≤ 13; **Presión** "Aparece en los partidos grandes" ≥ 15, "Sufre la presión" ≤ 5, si no "Normal"; **Profesionalismo** "Profesional" ≥ 14 (toma bien que le exijan), "Poco profesional" ≤ 7, si no "Normal"; **Liderazgo** "Líder natural" con Liderazgo ≥ 15. Nunca números. Para un jugador ajeno sigue la regla del ojeo (pregunta 2) | — |
| Opciones de la charla | `talkOptions(g, p)` (nueva; las condiciones salen del motor y del mismo lugar que `talk`) | Al abrir la ventana | `squad.ts` | `{ kind, title, rule, trait?, shown: boolean, disabled?: string, cost: boolean, extra? }[]`; `extra` lleva el objetivo de la promesa o los minutos esperados del rol nuevo | — |
| Contexto de la charla | `talkContext(g, p)` (nueva) | Igual | `squad.ts` | `{ form, goals }` con el **mismo** cálculo que usa `talk` (promedio de `p.form`, 6,5 sin partidos) | — |
| Resultado de la charla | `talk(g, p, kind, rol)` **cambia** de `string` a `{ text, before: { happy, morale }, after: { happy, morale }, changes: string[], resolved?: 'out' }` | Al hablar | `squad.ts` | objeto | Si no hizo nada (ya hablaron, préstamo): `{ text }` sin `after` |
| Charla disponible | `canTalk(g, p)`, `nextTalk(p)`, `p.lastTalk` | Igual | `squad.ts` | booleano, fecha ISO | — |
| Registro de charlas | `p.talks?: { date, kind, reply }[]` (nuevo, opcional, últimas 5; pregunta 7) | Al hablar | `squad.ts` | arreglo | Sin registro: la sección no se muestra |
| Reserva | `p.reserve`; `setReserve(g, ids, on)` (nueva) | Al cambiar | `squad.ts` | booleano | — |
| Próximo partido de reserva | Próximo miércoles (`advanceDay` la corre el día UTC 3) | Igual | `squad.ts` (`nextReserveDay(g)`, nueva) | fecha ISO | — |
| Pedido de salida y transferible | `p.wantsOut`, `p.listed`, `canSell(p)`; pendiente `out<pid>` de `pendingAll` | Igual | `squad.ts`, `inbox.ts` | booleanos | — |
| Fecha del pedido de salida | `p.outDate?: string` (nuevo, opcional) | Al pedir irse | `squad.ts` (`afterUserMatch`, `talk 'free'`) | fecha ISO | Partidas viejas: la fecha del mensaje `act: 'out'` más nuevo; si no hay, sin fecha |
| Filtro y selección | Ruta (`tab`, `sel`) + `useSticky('lk.tab')` | Al cambiar | Interfaz (C4) | texto | `todo`; selección según "Selección al entrar" |

**Conteo y regla de leído del pedido de salida** (UR-02 y UR-22; lo que hoy falla, punto 7 de los supuestos). El pendiente `out<pid>` se cuenta **una vez**, en la bandeja (y en la insignia general); el Vestuario no tiene insignia (pregunta 9) y la línea del Inicio es texto, no un contador. Se suman tres cosas en el motor, iguales a las de ofertas y tratos:

1. `decisionKeyOf(n)` devuelve `out<pid>` para un mensaje con `act: 'out'` y `pid` (hoy solo conoce `offer` y `deal`), y `newestOf` cubre esa clave: de varios "X quiere irse" del mismo jugador (lo pidió, se le dijo que no, lo volvió a pedir) solo el más nuevo se liga al pendiente y puede contar.
2. **Resolver a propósito marca leídos sus mensajes**: `talk` con `stay`, `promise`, `status` (subida) o `free`, y `setListed(g, pid, true)` con `wantsOut`, llaman a `readDecisionNews(g, 'out<pid>')`. En cualquier pantalla (Vestuario, ficha, bandeja).
3. **Lo que el DT acaba de ver nace leído**: la respuesta de la charla ya la vio, y `talk` no emite mensaje (como hoy). Lo que pasa sin el DT nace sin leer: el pedido de salida, la promesa cumplida o rota, la reserva.

**Mensajes que este sistema manda a la bandeja** (cambios; el resto como en `plantel.md`):

| Mensaje | Cambio |
|---|---|
| "X quiere irse" (`act: 'out'`) | Texto del motor: "Podés responderle desde este mensaje." se mantiene (UR-18 ya cumple). La bandeja ofrece "Hablar con él" que abre la charla en el lugar (pregunta 4). |
| "X, conforme" / "X se siente engañado" | Suman `pid` (ya lo tienen) y, en el cuerpo, la cifra: "Jugó el 74 % de los minutos; le habías prometido el 84 % (cumplías con 71 %)." Sin acción. |
| Promesa extendida (nuevo, nace sin leer) | "El plazo de la promesa a {nombre} se corrió al {fecha}: jugó menos de 2 partidos." `tag: 'club'`, `pid`. Hoy la prórroga no avisa. |
| "Reserva: no hubo partido" | Suma la acción "Armar la reserva" (`act: 'reserve'`, nueva en la tabla de acciones de la bandeja) que abre `{ page: 'locker', tab: 'reserva' }`. |

---

## 9. Events Fired

No hay analítica. Cada fila es una llamada al motor seguida de `save()` y `refresh()`.

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Hablar (cualquier charla) / Confirmar | `talk` | `(g, p, kind, rol?)` → resultado (sección 8) | `squad.ts` | Cambia estado guardado: `lastTalk`, `happy`, `morale`, `promise`, `status`, `listed`, `wantsOut`, `moodNote`, `talks`. Con `stay`, `promise`, subida de rol o `free`, marca leídos los mensajes de `out<pid>`. Irreversible (gasta la charla). |
| Declararlo transferible | `setListed` (o la función de la pregunta 5) | `(g, pid, true)` | `squad.ts` | Reversible desde la ficha. Con `wantsOut`, resuelve `out<pid>` y marca sus mensajes leídos. |
| Anotar o sacar de la reserva | `setReserve` (nueva) | `(g, ids, on)` | `squad.ts` | Reversible. Solo jugadores propios. |
| Cambiar filtro, elegir, ordenar, abrir fichas, abrir y cerrar la ventana sin hablar, abrir disclosures | ninguno | — | — | Estado de interfaz o navegación. Abrir la charla **no** gasta la charla ni marca nada. |

---

## 10. Transitions & Animations

Principio: rápido siempre. Sin animaciones decorativas.

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|--------------|--------|----------------|---------------------------|
| Entrada a la pantalla | `nav` a `locker` | `page-in` existente | 160 | ease-out | Sí | Sí — instantáneo |
| Salida | `nav` a otra | Ninguna | 0 | — | — | — |
| Cambio de selección o de filtro | Clic, Enter | Contenido en el lugar | 0 | — | — | No aplica |
| Abrir / cerrar la charla | "Hablar" / "Listo", Esc | `fade` + `pop` existentes | 140 | ease-out | No | Sí — instantáneo |
| Elegir → confirmación → respuesta | Botones de la ventana | Reemplazo en el lugar | 0 | — | — | No aplica |
| Disclosures | Clic | Nativo, sin animación | 0 | — | — | No aplica |
| Medidor de armonía | Cambio de valor | Sin animación del arco | 0 | — | — | No aplica |
| Ficha breve (I1) | Hover | `hc-in` existente | 120 | ease-out | Sí | Sí |

---

## 11. Input Method Completeness Checklist

Gamepad: fuera de alcance (AM-10), sin bloque.

**Keyboard**
- [x] Todo elemento interactivo se alcanza con Tab y flechas (7.1, orden en 12)
- [x] El orden de Tab sigue el orden visual (12)
- [x] Toda acción con mouse tiene equivalente de teclado (7.2)
- [x] El foco se ve siempre y no queda tapado (A2, 5.2 reserva de foco; criterio en 14)
- [x] La ventana de charla atrapa el foco y lo devuelve a un control habilitado (12)
- [x] Esc cierra o cancela y no sale de la partida (7.1)

**Mouse**
- [x] Hover definido: filas y botones (`--panel2`), elementos con `data-pid` (I1)
- [x] Objetivos de clic ≥ 32 × 32 px en escritorio; `.btn.sm` de las filas ≥ 32 px de alto
- [x] Clic derecho: sin acción propia (menú del navegador)
- [x] Rueda: página y panel independientes

**Touch (≤ 760 px)**
- [x] Objetivos ≥ 44 × 44 px: filas de "Para atender", "Hablar", chips, filas de la tabla, opciones de la charla, alternable de reserva, "Listo", "Confirmar"
- [x] Sin gestos que choquen con el gesto de atrás del sistema
- [x] Todo se hace con una mano en vertical (sin barra fija propia; los botones van en el contenido)
- [x] Sin pulsación larga

---

## 12. Accessibility

Nivel Estándar (`design/accessibility-requirements.md`). Lo que esta pantalla tiene que cumplir además de lo global:

**Text contrast requirements for this screen** (a medir con `node tools/check-contrast.mjs`, ampliado con los pares nuevos, en los 86 clubes y con Defensa y Justicia como caso de acento amarillo):

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Texto de filas, causa y consecuencia (`--text`, `--dim`) | `--panel`, `--panel2` | 4,5:1 | A medir (pares existentes: pasan en la bandeja) | [ ] |
| Textos tenues (`--faint`, "Hablaron el …") | `--panel` | 4,5:1 (`--faint` tiene 5,2:1; no se usa sobre `--panel3`) | 5,2:1 | [ ] |
| Chips de motivo ("Para decidir", "Molesto", "Promesa en riesgo") | Fondo del chip | 4,5:1 | A medir | [ ] |
| Número dentro del medidor de armonía | `--panel` | 4,5:1 | A medir | [ ] |
| Arco del medidor y barras de minutos y conformidad | `--panel3` | 3:1 (AV-03) | A medir | [ ] |
| Anillo de foco y borde del elegido (`--sel`) | `--panel`, `--panel2`, fila elegida | 3:1 | ≈ 4,96 (medido en el Mercado) | [ ] |
| Botón primario ("Hablar", "Confirmar", "Listo") | Acento del club | 4,5:1 (tinta por contraste, AV-02) | Pasa en los 86 (`check-contrast.mjs`) | [ ] |

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Conformidad y moral (barras de colores) | Rojo/verde | Número al lado siempre (D6, `BarN`) y palabra de `moodOf` |
| Minutos jugados contra esperados | Verde/ámbar | "20/62 %" en texto y marca de umbral con forma (línea vertical), no solo color |
| Motivos de "Para atender" | Tono del chip | Texto del chip y "!" en los de rango 1-3 |
| Referente "Resta" | Ámbar | "!" y la palabra "Resta" |
| Armonía | Arco de color | Número y estado en palabras |
| Tendencia | Color de la flecha | Flecha con forma (↓ ↑) más la palabra ("baja", "sube") |
| Elegido | Fondo | Borde izquierdo de 3 px y `aria-selected` / `aria-current` |

**Focus order** (Tab, escritorio ≥ 1180 px):

1. "Saltar al contenido" y barra global (como en todas las pantallas).
2. "Entendido" de la ayuda (si está).
3. Encabezado: referentes (3 nombres, uno por parada), "Cómo se eligen ▸", "Armar la reserva".
4. "Para atender": por cada fila, el botón de fila y su "Hablar" (o nada si no hay botón).
5. Chips de filtro (una parada; ← → adentro).
6. "Columnas" de la tabla, encabezados de columna (botones `th-sort`), la tabla (una parada, foco itinerante), barra de acciones masivas si hay marcados.
7. Panel (`LockerCard`): "Hablar con él", "Declararlo transferible", alternable de reserva, "Contrato y renovación ▸", "Ver la ficha ▸", disclosures.
8. Vuelve a la barra global (sin ciclo forzado).

En < 1180 px no hay paso 7. En la ventana de charla: ✕ → opciones (una parada; ↑ ↓ adentro; el selector de rol es una parada propia cuando está la opción "Cambiarle el rol" marcada) → "Cancelar" → "Hablar"; en la confirmación, "No" → "Confirmar"; en la respuesta, "Listo".

**Devolución del foco al cerrar la charla** (lección g): al botón que la abrió si sigue habilitado y en la pantalla; si no (después de hablar, el "Hablar" de la fila se reemplaza por el texto "Hablaron hoy"), al botón de fila de ese jugador en "Para atender"; si la fila desapareció (ya no hay motivo), al encabezado "Para atender" (`tabindex="-1"`); en el panel o la ficha, al título de la sección Charla de la `LockerCard` (`tabindex="-1"`). En la bandeja, a "Siguiente pendiente" o a la nota F7 (regla de la bandeja). Nunca a `body` ni a un control deshabilitado.

**Screen reader announcements for key state changes**:

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Respuesta de la charla | La frase del jugador y la línea de efectos (`role="status"` del contenedor, que además recibe el foco) | Al responder |
| Confirmación abierta | El texto de la consecuencia (el botón Confirmar lo tiene en `aria-describedby`) | Al abrir |
| Declarado transferible, reserva cambiada | La nota F7 (`role="status"`) | Al actuar |
| Cambio de filtro | "Plantel: 8 jugadores en la reserva." (región `aria-live="polite"` del contador) | Al cambiar |
| Medidor de armonía | Sin región viva: `role="img"` con su `aria-label` | — |

Otros requisitos: la tabla con `onPick` es `role="grid"` con filas nombradas (D1); la lista "Para atender" es `ul` con `aria-labelledby` al `h2`; la ventana tiene `aria-labelledby` al `h2` "Charla con …" (AC-09; hoy `Modal` no lo tiene); las opciones son un `radiogroup` nombrado; cada botón deshabilitado tiene su motivo en texto visible y `aria-describedby`; ningún texto explicativo vive solo en `title` (AC-05: hoy los minutos y el rol de la tabla se explican solo en `title`); nada por debajo de 12 px; el texto al 120 % no rompe el encabezado ni la tabla.

**Cognitive load assessment**: el DT sigue a la vez el estado del grupo (1), la lista de casos (2), el detalle del elegido (3) y la tabla (4): cuatro flujos, dentro de 7 ± 2. Mitigaciones: una fila por jugador con un solo motivo principal; causa y consecuencia en la fila (no hay que cruzar con la tabla); la personalidad en palabras con la regla de cada charla al lado de la opción; los porcentajes del motor siempre con su referencia ("de 62 %"); los detalles de la regla (referentes, moral contra conformidad) en disclosures.

---

## 13. Localization Considerations

Un solo idioma. Lo que importa son los largos de nombres reales, las frases del motor y los formatos.

| Text Element | Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|-----------------|----------------|-----------------|--------------|-------------------|------|
| Nombre del jugador en filas y panel | 8-24 | 32 (nombres compuestos reales) | — | No aplica | Ajusta en dos líneas en el panel; en la tabla, elipsis con el nombre completo en la ficha breve y en el nombre accesible de la fila | Media |
| Causa y consecuencia de "Para atender" | 40-110 | 160 | Ajusta en varias líneas | No aplica | Nunca se corta: la fila crece | Media |
| Rasgos de personalidad | 4-31 ("Aparece en los partidos grandes") | 31 | — | No aplica | Chips que pasan de línea (`wrap`) en el panel; en la tabla, la columna `pers` muestra hasta dos rasgos y "+N", el resto en el panel | Alta (tabla) |
| Opciones de la charla (título + regla) | 20 + 60-140 | 200 | Ajusta | No aplica | La opción crece; la ventana desplaza su cuerpo | Baja |
| Respuesta del jugador | 20-120 | 160 | Ajusta | No aplica | — | Baja |
| Botón "Confirmar: prometerle minutos" / "Confirmar: bajarle el rol a Suplente" | 30-40 | 48 | — | No aplica | Ajusta en dos líneas antes que cortar | Media |
| "Hablaron el 12 nov · de nuevo desde el 19 nov" | 44 | 50 | — | No aplica | Ajusta | Baja |

Formatos: fechas con `fmtDate` / `fmtDay` ("19 nov", "mié 18 nov"); porcentajes enteros con espacio ("20 %"); decimales con `dec(v, d)` (coma); el efecto en la cancha con signo ("+0,8 %"). Concordancia en todos los conteos ("1 para atender", "4 para atender"; "1 quiere irse", "2 quieren irse"; "Anotaste a 1 en la reserva"). Voseo en todos los textos ("Hablá", "Elegí", "Podés").

---

## 14. Acceptance Criteria

**Rendimiento** (build de producción, plantel de 35)
- [ ] El primer cuadro del Vestuario con datos se dibuja en menos de 100 ms desde el `nav` (mediana de 5).
- [ ] Elegir otra fila actualiza el panel en menos de 50 ms (p95 de 30 elecciones con flechas y Enter).
- [ ] La ventana de charla se abre en menos de 100 ms.
- [ ] `attentionOf`, `harmony` (con `parts`) y `promiseStatus` del plantel completo tardan menos de 2 ms juntos.

**Propósito de la pantalla**
- [ ] Con un jugador que quiere irse, uno con una promesa en riesgo, uno molesto y uno en baja, "Para atender · 4" los muestra en ese orden, uno por fila, a la vista sin desplazar a 1440 × 900 y a 360 × 740 (la primera fila).
- [ ] Un jugador con dos motivos (molesto y referente que resta) tiene una sola fila, con el de mayor rango como chip principal; N cuenta jugadores, no motivos.
- [ ] Cada fila dice la causa con números ("juega 20 % y espera 62 %") y la consecuencia de no hacer nada; un tester que ve "Molesto" puede explicar por qué mirando solo la fila (criterio de feel de `plantel.md`).
- [ ] Con una promesa vigente que va bien, hay una fila "Minutos prometidos" con la fecha y lo que lleva; con la misma promesa en riesgo, la fila sube al rango 2 y dice los minutos que faltan y en cuántos partidos. Las cifras coinciden con `promiseStatus` (Titular: objetivo 84 %, umbral 71 %; Rotación con 31 % en 2 partidos y 3 por jugar: faltan 166 minutos). Si ni jugando todo llega, dice "Ya no llega".
- [ ] "Qué la mueve" suma (con el redondeo de F6) el número de la armonía; con dos disconformes dice "2 disconformes −6".
- [ ] Un referente con conformidad 44 dice "! Resta" (no "Molesto"); uno con 30 tiene además fila "Molesto" en "Para atender".
- [ ] La conformidad se nombra con la misma palabra y el mismo corte en el Vestuario, la `LockerCard`, la tabla, la ficha (tarjeta "Felicidad") y la bandeja: con 34, "Molesto" en todas; con 17, "Muy molesto"; con 70, "Contento". No queda ninguna otra escala (revisión de código: sin `moodTxt` ni cortes 65/35 propios).
- [ ] La personalidad de un jugador propio se ve como palabras (nunca números) en el panel, la ficha, la tabla y la charla, con las bandas de la sección 8.
- [ ] Con dos jugadores propios iguales salvo la lealtad (12 y 13), "Pedirle paciencia" muestra "Él: lealtad normal" y "Él: leal", y la respuesta coincide con lo que anuncia la regla (rechazo y aceptación). Lo mismo con exigir (profesionalismo 13 y 14; temperamento 13 y 14).
- [ ] Al hablar, la ventana muestra la frase, conformidad y moral antes → después iguales a los valores del jugador antes y después de `talk`, y los cambios de estado ("Ya no pide irse", "Minutos prometidos hasta el …").
- [ ] Prometer, cambiar el rol y dejarlo buscar club piden "Confirmar: …" con la consecuencia escrita; felicitar, exigir, pedir paciencia y decirle que no se va no piden confirmación. "No" y Esc en la confirmación vuelven a elegir sin gastar la charla.
- [ ] Cerrar la ventana sin hablar no cambia `p.lastTalk`.
- [ ] Con la charla usada, la fila, la `LockerCard` y la tabla dicen "Hablaron el … · de nuevo desde el …" en texto visible; la banda de la ficha muestra "Hablar desde el 19 nov" deshabilitado. No hay ningún motivo solo en `title`.

**Una decisión, una vez** (pedido de salida)
- [ ] Con un pedido de salida nuevo, la insignia de la bandeja sube 1 (no 2) y el Vestuario no tiene insignia; la línea del Inicio dice "1 quiere irse".
- [ ] Resolver el pedido con "Decirle que no se va" desde el Vestuario: el pendiente `out<pid>` desaparece de la bandeja, el mensaje "X quiere irse" queda leído y la insignia baja 1 (no queda el mensaje sin leer contando). Lo mismo con prometer, subir el rol, dejarlo buscar club y "Declararlo transferible", desde el Vestuario, la ficha y la bandeja.
- [ ] Felicitar o exigir a un jugador que quiere irse no resuelve el pedido ni marca leído el mensaje.
- [ ] Con dos mensajes "X quiere irse" del mismo jugador (lo pidió dos veces), solo el más nuevo cuenta y ofrece las acciones; el viejo dice "Ya respondiste este pedido".
- [ ] Desde la bandeja, "Hablar con él" abre la charla sobre la bandeja (pregunta 4); al cerrar después de "Decirle que no se va", la decisión pasa a "Resuelto" con la respuesta como nota y el foco en "Siguiente pendiente" (o en la nota).

**Navegación e historial**
- [ ] Cambiar tres veces de filtro y apretar Atrás sale del Vestuario (los filtros y la selección reemplazan la entrada).
- [ ] A ≥ 1180 px, elegir una fila no apila; a 1024 × 768, elegir abre la ficha › Vestuario y Atrás vuelve con el mismo filtro, el scroll de la página y el foco en la fila de la que salió.
- [ ] "Vestuario" en el mosaico del Inicio abre con el primero de "Para atender" elegido; "Armar la reserva" del mensaje de reserva abre con el filtro En la reserva.
- [ ] "Contrato y renovación ▸" abre la ficha › Contrato y mercado; "Ver transferibles en Plantel" abre Plantel con `tab: 'transferibles'`.

**Estados vacíos y errores**
- [ ] Sin nadie para atender, la lista dice "Nadie para atender…" y el panel muestra el resumen del grupo con las promesas vigentes.
- [ ] Al empezar la temporada (nadie con 3 partidos), los minutos dicen "Todavía no cuenta" y no aparece ningún "En baja".
- [ ] Con 5 anotados sanos en la reserva, el encabezado dice "! Reserva: 5 anotados y sanos, faltan 2 para el mié …"; sin anotados, "sin anotados (no se juega)".
- [ ] Con `save()` fallando (`tests/ui/guardado.cjs`), hablar muestra la nota de error y el estado de la charla queda hecho en la sesión.
- [ ] Vender al jugador elegido (otra pestaña del flujo) lo saca de la lista y la tabla y el panel dice "ya no está en el plantel" sin errores en la consola.

**La pantalla no escribe en `g`**
- [ ] Revisión de código: en `src/ui/Locker.tsx`, la `LockerCard`, `PlayerPage.tsx` y `PlayerTable.tsx` no aparecen `p.reserve =`, `p.listed =`, `p.happy =`, `p.morale =`, `p.status =`, `p.promise =` ni `p.wantsOut =`; las condiciones de las charlas no están escritas en la interfaz (salen de `talkOptions`).

**Visibilidad de las acciones** (script `tests/ui/vestuario.cjs`, a escribir al implementar, con `npm run dev`, en 1440 × 900, 1280 × 720, 1024 × 768, 820 × 1000, 390 × 844 y 320 × 568, con Independiente y con Defensa y Justicia)
- [ ] Para cada botón de "Para atender", de la `LockerCard` (panel y ficha), del encabezado, de los chips y de la ventana de charla (opciones, "Cancelar", "Hablar", "Confirmar", "No", "Listo", ✕), `document.elementFromPoint` en su centro devuelve el propio control en todas las resoluciones.
- [ ] Bajando con Tab por toda la pantalla y por la ventana, cada control con foco tiene su caja dentro de la ventana y no tapada por la barra superior ni por N3 (2.4.11), medido con `elementFromPoint` sobre puntos del anillo.
- [ ] Ninguna acción vive en un contenedor con `position: fixed` ni con `overflow` recortado; ningún contenedor nuevo usa la clase `.bar` ni otra clase global genérica (todas con prefijo `lk-`).
- [ ] A 320 × 568, en la ventana de charla con la opción "Cambiarle el rol" marcada, "Hablar" y "Confirmar" se alcanzan desplazando el cuerpo de la ventana.
- [ ] Al cerrar la charla después de hablar, `document.activeElement` es un control habilitado y visible de la pantalla de origen (nunca `body`).
- [ ] Sin desplazamiento horizontal de la página a 320, 390 y 640 px (200 %), y con el texto al 120 % a 1440 × 900 y 390 × 844: la tabla oculta columnas por prioridad sin cortar "20/62 %" y el encabezado pasa a dos filas o a disclosures.

**Accesibilidad**
- [ ] Ningún texto de la pantalla ni de la ventana queda por debajo de 12 px al 100 % (script que recorre los nodos de texto visibles y lee `getComputedStyle().fontSize`).
- [ ] `node tools/check-contrast.mjs`, ampliado con los pares de la sección 12, sin fallas en los 86 clubes.
- [ ] Con el modo para daltonismo y la emulación de deuteranopía, conformidad, minutos, motivos, tendencia, referente que resta y fila elegida se distinguen por texto, número, forma o peso.
- [ ] axe-core sin infracciones A/AA en el Vestuario con un jugador elegido, en la ficha › Vestuario y en la ventana de charla (en "elegir", "confirmación" y "respuesta").
- [ ] La ventana tiene `aria-labelledby`; las opciones, `role="radiogroup"` con nombre; la respuesta y las notas, `role="status"`; los chips, `aria-pressed`; el medidor, `role="img"` con "Armonía N de 100: {estado}".
- [ ] Con movimiento reducido, la entrada a la pantalla y la ventana son instantáneas.
- [ ] A 360 px, todos los objetivos táctiles miden al menos 44 × 44 px.
- [ ] Con los atajos de una tecla apagados (`settings.singleKeys === false`), la pantalla no agrega ninguno; con el foco en una fila de "Para atender", Espacio la activa y no avanza el día.

---

## 15. Open Questions

**Resuelto en el diseño** = lo decidió el ux-designer con la información disponible; el usuario puede revertirlo. **Para el usuario** = decisión de juego o de presentación que corresponde al usuario; lleva la recomendación. **Pendiente** = tarea de otra spec o de implementación.

| # | Question | Owner | Deadline | Resolution |
|---|----------|-------|----------|-----------|
| 1 | **Qué personalidad ve el DT de sus jugadores y con qué precisión.** (A) Como hoy: rasgos sueltos solo en los extremos (≥ 16, ≤ 5); las charlas reaccionan a otros umbrales y no se pueden prever. (B) Una palabra por rasgo (ambición, lealtad, temperamento, presión, profesionalismo, liderazgo) con bandas cuyos cortes son los umbrales del motor (tabla de la sección 8); nunca números. (C) Los números de 1 a 20. Variante de B: que la precisión crezca con el tiempo en el club ("todavía lo estás conociendo" el primer mes). | Usuario | Antes de implementar | **Recomendado: B, sin la variante.** Cumple el criterio de feel de `plantel.md` (prever 3 de cada 4 charlas) y el Pilar 3 sin mostrar números de personalidad (la misma regla que el usuario fijó para los ajenos en el Mercado, pregunta 9). C convierte las charlas en una cuenta; la variante necesita un campo nuevo y casi no cambia decisiones. |
| 2 | **Personalidad de los ajenos** (ficha › Ojeo). Hoy se ven los rasgos desde 60 % de conocimiento, pero el mensaje "Informe completo" dice que la personalidad se conoce al terminar el ojeo (100 %). | Usuario (con la spec del ojeo cuando exista) | — | **Recomendado**: los ajenos siguen con los rasgos de hoy desde 60 % y pasan a las bandas de B recién con el informe completo; corregir el texto del mensaje. Queda fuera de esta pantalla. |
| 3 | **Mostrar en cada opción de la charla el rasgo del jugador que decide la respuesta** ("Convence a los leales y a los poco ambiciosos. Él: lealtad normal, ambición alta"). | Usuario | Antes de implementar | **Recomendado: sí**, la regla y el rasgo, sin un veredicto ("va a salir bien"). Con B la respuesta queda prevista para quien lea; la gracia pasa a elegir entre opciones con costos distintos. Sin esto, B pierde la mitad de su valor. |
| 4 | **"Hablar con él" en la bandeja abre la charla sobre la bandeja** en lugar de navegar a la ficha › Vestuario (pregunta abierta de `plantel.md`). | Usuario (afecta `bandeja.md`) | Antes de implementar | **Recomendado: sí.** Es la acción de la decisión y la bandeja dice "cada papel trae la lapicera". Al cerrar, si `out<pid>` se resolvió, "Resuelto" con la respuesta como nota (como "Responder" de la prensa). Actualizar `bandeja.md` 5.3, 7.2 y 9. |
| 5 | **"Declararlo transferible" y la charla "Decirle que puede buscar club" llegan a lo mismo con efectos distintos**: la charla le da +15 de conformidad y +6 de moral si él lo pedía; el botón de la bandeja (`setListed`) no le da nada, y no gasta la charla. | Usuario | Antes de implementar | **Recomendado**: una función del motor (`letGo(g, pid)`) que use los dos caminos: si quería irse, los mismos +15 / +6; la charla además gasta la semana. Alternativa: que el botón abra la charla con esa opción marcada. |
| 6 | **Qué charlas piden confirmación (F6).** Propuesta: prometer minutos (crea una obligación con costo de prestigio), cambiar el rol (subir aumenta lo que espera; bajar lo molesta) y dejarlo buscar club (lo declara transferible). El resto, un clic. | Usuario | Antes de implementar | **Resuelto en el diseño** con esa lista; el usuario puede sumar "Decirle que no se va" (rechaza su pedido), que hoy no la tiene porque se puede volver a hablar la semana siguiente. |
| 7 | **Registro de charlas y de promesas** (`p.talks`, últimas 5, y las promesas cumplidas o rotas de la temporada en la ficha), y la nota de causa (`p.moodNote`). Campos opcionales, sin subir `Game.version`. | Usuario (con el lead-programmer) | Antes de implementar | **Recomendado: sí.** El recorrido nombra el riesgo "no recuerda haber prometido"; sin registro, la ficha no puede decir qué le dijo. Costo: unos bytes por jugador propio. |
| 8 | **Charla pedida por el jugador.** Si el DT lo felicitó el lunes y el miércoles pide irse, no puede hablarle hasta el lunes siguiente: la decisión de la bandeja queda con su primario sin poder usarse. | Usuario | Antes de implementar | **Recomendado**: un pedido de salida habilita una charla aunque haya hablado esa semana (una sola vez por pedido; `canTalk` mira `p.outDate`). La alternativa es dejarlo como está y escribir en la decisión "Podés hablarle desde el …; mientras tanto, podés declararlo transferible". |
| 9 | **Insignia del Vestuario.** | Usuario | — | **Resuelto en el diseño: sin insignia.** El pedido de salida ya cuenta en la bandeja; una segunda insignia lo contaría dos veces (UR-02). La línea del Inicio lo nombra como texto. |
| 10 | **La tabla del Vestuario pasa a `PlayerTable`** (vista `vestuario`, columnas nuevas `mins`, `pers`, `res`, `talk`), sin la tabla propia ni su `scroll-x`. | ux-designer | — | **Resuelto en el diseño** (regla de `CLAUDE.md`: tabla única). Los botones Reserva y Hablar dejan las filas: van al panel, a "Para atender" y a las acciones masivas. |
| 11 | **Dos sentidos de "Molesto".** Hoy el chip dice "Molesto" con conformidad < 35 y el referente con < 50. | ux-designer | — | **Resuelto en el diseño**: "Molesto" es < 35 en todas partes; el referente entre 35 y 49 dice "Resta". |
| 12 | **Choque de palabras: "Promesa"** es a la vez el rol de los juveniles (`STATUS.young`) y el chip de una promesa de minutos (`Status` en `common.tsx`). | Usuario | Antes de implementar | **Recomendado**: el rol sigue siendo "Promesa" (es como se dice en el fútbol) y el chip pasa a "Minutos prometidos"; en esta spec, el filtro del rol se llama "Juveniles". |
| 13 | **Ignorar un pedido de salida, ¿tiene costo con el tiempo?** (pregunta abierta de `comunicacion-y-bandeja.md`). Hoy no vence y su único costo es seguir disconforme (resta armonía, recibe más ofertas). | Usuario | — | **Recomendado: no por ahora.** La spec muestra el costo que ya existe ("siguen llegando ofertas y resta armonía"). Si el usuario quiere más, que sea algo visible en la misma fila (por ejemplo, que a las 3 semanas baje la moral del resto). |
| 14 | **Efectos de la charla con números** (conformidad y moral antes → después). | Usuario | Antes de implementar | **Recomendado: sí.** Los dos números ya se ven en la tabla; mostrar el cambio cumple "cada decisión se entiende". Requiere que `talk` devuelva un objeto (sección 8). |
| 15 | **Promesa con números exactos** ("alrededor del 84 %; cumplís si juega al menos el 71 %; le faltan 266 minutos en 3 partidos"). | Usuario | Antes de implementar | **Recomendado: sí.** Es la palabra del DT: tiene que saber qué prometió. No revela nada oculto (sale del rol y de una regla fija). |
| 16 | **Umbral de "Decirle que no se va"** (lealtad ≥ 12) contra el de "Pedirle paciencia" (≥ 13): con bandas, uno de los dos queda adentro de una banda y no se puede prever. | Usuario (cambio de juego) | Antes de implementar | **Recomendado**: subir "no se va" a 13, así "Leal" (13 o más) decide las dos. Alternativa: una banda más para lealtad 12. Correr `npm run test:engine` después. |
| 17 | **Efecto en la cancha en número** ("+0,8 %"). El GDD advierte que puede ser imperceptible. | Usuario | — | **Recomendado**: mostrarlo en palabras y en número; es honesto y explica por qué la armonía importa poco o mucho. Si el usuario sube el efecto (pregunta abierta de `plantel.md`), el texto lo sigue solo. |
| 18 | **Mensaje nuevo cuando la promesa se extiende** y cifras en "conforme" / "se siente engañado". | ux-designer | — | **Resuelto en el diseño** (sección 8, mensajes). Evita el "castigo sin explicación" del recorrido. |
| 19 | Actualizar `design/gdd/plantel.md` (UI Requirements, F5 si cambia la pregunta 16, la tabla de mensajes), `comunicacion-y-bandeja.md` (`out` en `decisionKeyOf`, `act: 'reserve'`) y `bandeja.md` (preguntas 4 y 5). | ux-designer / game-designer | Al aprobar esta spec | Pendiente. |
| 20 | Sumar a la biblioteca de patrones: fila de lista con acción hermana ("Para atender": botón de fila más "Hablar", no `listbox`) y opciones de decisión con regla y rasgo (`TalkModal`). | ux-designer | Al aprobar esta spec | Pendiente. |
| 21 | `Gauge` sin `role`/`aria-label` y `Modal` sin `aria-labelledby` son globales (AC-09); esta spec los pide para sus usos. | ui-programmer | Al implementar | Pendiente. |
| 22 | La ficha de un ajeno muestra su moral exacta en la tarjeta "Felicidad" ("Moral 64"), sin pasar por el ojeo. | Usuario (con la spec del ojeo) | — | **Recomendado**: mostrar a los ajenos solo la palabra, o nada por debajo del informe completo. Fuera de esta pantalla. |
