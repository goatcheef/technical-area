# UX Spec: Bandeja de entrada

> **Status**: In Design (ajustada el 2026-11-15 tras la verificación focalizada del Vestuario, `production/ui/vestuario/verificacion.md`: la venta al exterior marca leído el pedido de salida (`acceptOffer`), Enter sobre la fila no deja el foco en un primario que decide sin F6, un solo texto para el jugador que ya no está en un mensaje `out`, notas que no prometen ofertas con el libro cerrado; ver la pregunta 25. Antes: ajustada el 2026-11-15 con la decisión "jugador que quiere irse" que comparte con el Vestuario, tras /ux-review de `design/ux/vestuario.md`: plantilla con `outActions` y la comparación de los dos caminos, conteo de `out<pid>` y regla de leído de todos los caminos que lo resuelven, acción "Armar la reserva"; ver la pregunta 24. Antes: ajustada el 2026-11-15 con la segunda revisión de /ux-review del Mercado, `production/ui/mercado/ux-review-2.md`: barra angosta que no cambia de posición, chip "Trato", paciencia solo desde la mesa, Cancelar el trato con F6, sueldo que pediría de una sola fuente, ofertas canceladas por una venta y tratos podados; ver la pregunta 22. Antes: segunda revisión tras /ux-review contra el documento de diseño: NEEDS REVISION; correcciones aplicadas, ver sección 15, preguntas 12 a 17. Ampliada el 2026-11-14 con las decisiones del mercado que viven en la bandeja: pendiente `deal` (contraoferta y acuerdo para cerrar), su lugar en pantallas angostas, los tratos en la confirmación de un trabajo y la regla de leído de los mensajes de una decisión; fuente `design/ux/mercado.md`, ver la pregunta 22)
> **Author**: usuario + ux-designer
> **Last Updated**: 2026-11-15
> **Journey Phase(s)**: `design/player-journey.md`: bucle semanal entre partidos (fase 3), mercado y copas (fase 4), fin de temporada (fase 5) y mercado de entrenadores (fase 6)
> **Screen / Flow Name**: `Inbox` (página `inbox` de `src/ui/Inbox.tsx`)
> **Platform Target**: web. Escritorio primero (mouse y teclado); celular por navegador (toque) por debajo de 760 px. Sin gamepad (fuera de alcance, `design/accessibility-requirements.md`, AM-10).
> **Related GDDs**: `design/gdd/comunicacion-y-bandeja.md` (requisitos UR-01 a UR-41, la fuente principal), y lo que cada sistema manda a la bandeja en `design/gdd/mercado-de-pases.md`, `carrera-del-dt.md`, `plantel.md`, `ojeo.md`, `prensa-e-informes.md`, `entrenamiento-y-cuerpo-tecnico.md` y `economia-y-dirigencia.md`. Otras fuentes: `CLAUDE.md` y `docs/plan-ui-ux.md` (etapa 2: bandeja de entrada y ritmo).
> **Related ADRs**: ninguna. Restricciones de `CLAUDE.md`: estado `Game` serializable, sin web worker, navegación por `nav()`.
> **Related UX Specs**: `design/ux/interaction-patterns.md` (patrones por id), `design/ux/mercado.md` (las decisiones del mercado: `OfferDecision` y `DealDecision` son los mismos componentes en las dos pantallas; tratos, plazos, conteo y regla de leído de sus mensajes en su sección 8), mosaico "Mensajes" del Inicio (`src/ui/Home.tsx`, sin especificación propia).
> **Accessibility Tier**: Standard (`design/accessibility-requirements.md`: WCAG 2.1 AA, más 2.5.8 y 2.4.11; texto mínimo 14/12/11 px)
> **Template**: UX Spec

> **Supuestos de esta especificación**
> - **Documentos de diseño.** El concepto, el recorrido del jugador y los documentos de cada sistema se escribieron a partir del código (`design/gdd/`, `design/player-journey.md`). El contexto del jugador de la sección 2 sale del recorrido: un DT entre partidos que revisa qué tiene que decidir antes de apretar Continuar, en sesiones frecuentes y cortas; la bandeja contesta "¿qué tengo que decidir ahora?" de un vistazo. No hay documento de HUD. Donde esta especificación se aparta a propósito de un requisito del documento de comunicación (por ejemplo, el bloque "Para decidir" reemplaza a la pestaña "Pendientes" de UR-06), lo dice y queda anotado para actualizar el documento (pregunta 17).
> - **"Eventos"** quiere decir llamadas a funciones del motor (`src/engine/`) seguidas de `save()` y `refresh()`. No hay bus de eventos ni sistema de analítica: ninguna acción dispara analítica.
> - **Sin audio**: las columnas de sonido de las tablas dicen "—".
> - **Un solo idioma** (español rioplatense). La sección 13 cubre largos de nombres reales y formatos, no traducción.
> - **Lenguaje visual**: el bloque "estilo portal" del final de `src/styles.css` y la anatomía de fila del mosaico "Mensajes" del Inicio (`.msg-day`, `.msg`, `.msg-ico`, `.msg-from`, `.msg-t`, `.msg-dot`), que el usuario aprobó. Las decisiones de color, tipografía y peso visual son del art-director; acá solo se fija jerarquía, estados y contraste mínimo.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

El DT necesita saber, sin leer nada, si hay algo que lo frena antes de seguir: una oferta por un jugador que vence, la respuesta de un club a una oferta suya (una contraoferta o un acuerdo para cerrar), un club que lo quiere, un jugador que pide irse, una conferencia. Después, y solo si quiere, ponerse al día con lo que pasó en su club (lesiones, resultados, informes) y en el resto del fútbol. La bandeja es el escritorio del DT entre partido y partido: lo que hay que firmar arriba, la correspondencia abajo, y cada papel trae la lapicera para resolverlo ahí mismo (F2). Lo que más frustra es descubrir tarde que se venció una oferta, vender a alguien por un clic distraído, o tener que ir a otra pantalla para responder algo que ya está leyendo.

**The player goal**:

Ver en el primer vistazo cuántas decisiones esperan respuesta y resolver cada una sin salir de la bandeja, con un máximo de dos clics (o dos teclas) por decisión irreversible.

**The game goal**:

Que ninguna decisión pendiente (`pendingOf`) pase desapercibida antes de avanzar el tiempo, y que cada respuesta llegue al motor por su función (`acceptOffer`, `haggle`, `rejectOffer`, `acceptJob`, etc.) con el estado guardado.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Tres casos (fase 3 de `design/player-journey.md`): (a) apretó Continuar o Ir al partido y el avance se frenó por una decisión nueva (F4); (b) volvió del partido o del Inicio y quiere ver novedades (insignia de Bandeja, F3); (c) tocó un mensaje en el mosaico del Inicio. |
| What is their emotional state? | Calma con algo de expectativa. Si el avance se frenó, leve urgencia ("¿qué pasó?"). Nunca presión de tiempo real: el tiempo no corre en la bandeja (AC-01). |
| What cognitive load are they carrying? | Media: tiene en la cabeza el próximo partido y el plan de la semana. No quiere cargar más; quiere vaciar lo pendiente y seguir. |
| What information do they already have? | El número de la insignia (pendientes más mensajes sin leer que no tienen una decisión abierta; cada decisión cuenta una vez, ver "Número de la insignia" en la sección 8) y, si vino del botón de pendientes o del freno del avance, la frase de `pendingText` ("una conferencia y 2 ofertas por jugadores"). |
| What are they most likely trying to do? | Resolver lo pendiente y volver a Continuar. Segundo: revisar lesiones y resultados de su club. Tercero (ocasional): leer noticias del resto del fútbol. |
| What are they likely afraid of? | Perder una oferta por vencimiento; aceptar o rechazar por error algo irreversible (vender a un titular, irse de club); no entender las consecuencias ("si pido más, ¿se va?"); que se pierda el lugar donde estaba al volver de una ficha. |

**Emotional design target for this screen**:

Al día y en control: el DT sabe en un segundo si hay algo para decidir, tiene todos los datos para decidirlo en el mismo mensaje y nada irreversible pasa sin que lo confirme.

---

## 3. Navigation Position

**Screen hierarchy**:

```
Partida (barra superior, N1)
  └── Inicio (sección)
        └── Bandeja de entrada (pantalla `inbox`)   ← esta pantalla
              ├── Ficha de jugador (N5, página `player`)        — desde la tarjeta del jugador
              ├── Ficha de club (N5, página `clubv`)            — desde la tarjeta del club
              ├── Entrenamiento / Posiciones / Tácticas         — botones de mensajes puntuales
              ├── Conferencia de prensa (F5, `PressModal`)      — modal sobre la bandeja
              ├── Informe del partido (F5, `MatchReport`)       — modal sobre la bandeja
              └── Informe del rival (F5, `ReportModal`)         — modal sobre la bandeja
```

En celular y por debajo de 900 px, el mensaje elegido es una vista aparte ("detalle") dentro de la misma página, con su propia entrada en el historial (ver sección 4).

**Modal behavior**: Non-modal. Es una página de la navegación (N1/N3). El tiempo no avanza mientras está abierta salvo que el jugador apriete Continuar (F4). Las ventanas que abre (prensa, informes) son F5: Esc o "Cerrar" las cierran y el foco vuelve al botón que las abrió.

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Inicio → Bandeja (barra de pantallas, N1) | Clic | Entrada principal en escritorio. Lleva insignia F3. |
| Barra inferior del celular (N3) | Toque en "Bandeja" | Es una de las cuatro principales. |
| Tecla 2 (N9, orden de `PAGES`) | Tecla, fuera de campos | Atajo de una tecla: se apaga con el interruptor de AM-03 cuando exista. |
| Barra de comandos (N7) | Ctrl+K → "Bandeja" | — |
| Botón de pendientes (F3, `.pendbtn`) | Clic | Llega con la primera decisión pendiente elegida. |
| Freno del avance por decisión nueva (F4) | Sistema | Llega con **la decisión que frenó** elegida (no la primera). |
| Mosaico "Mensajes" del Inicio | Clic en un mensaje | Llega con **ese** mensaje elegido. Hoy navega sin selección (`go('inbox')`): hay que pasar la selección. |
| Mosaico "Mensajes": "Pendiente: …" (`.ib-pend`) | Clic | Igual que el botón de pendientes. |
| Historial (N4) | ◂ ▸, Alt+←/→ | Restaura filtro, selección y scroll. |

---

## 4. Entry & Exit Points

**Ruta de la bandeja.** Toda la configuración visible va en la ruta (N4: "si hace falta volver a ella, tiene que estar en `page`, `id` o `tab`"):

- `tab`: `"<alcance>.<tema>"`, por ejemplo `"club.todo"`, `"club.mercado"`, `"futbol.torneos"`. Valores: alcance `club` | `futbol`; tema `todo` | `plantel` | `mercado` | `partidos` | `torneos` | `dirigencia`. Compatibilidad: `tab: "pend"` (usado hoy por F3 y F4) equivale a `"club.todo"` con la primera decisión pendiente elegida; cualquier otro valor viejo (`me`, `all`, `partido`, `torneo`) se traduce al nuevo.
- Selección: una clave de texto única para pendientes y mensajes (`"n<id>"` para un mensaje; la `key` de `pendingOf` para un pendiente, como `"offer12"` o `"press34pre"`). **Se suma un campo opcional `sel?: string` a `Route`** (`src/store.ts`), porque `id` es numérico y los pendientes no tienen id. Decidido (pregunta 1 de la sección 15).
- Alcance y tema también se guardan con `useSticky` (`ib.tab`) para que, al entrar sin `tab`, aparezca lo último usado (C4).

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Clic en Bandeja (N1/N3), tecla 2, barra de comandos | Cualquier pantalla | Reemplazo de página, `page-in` 160 ms | `{ page: 'inbox' }` | Usa el `tab` recordado (`ib.tab`, por defecto `club.todo`). Selección inicial: regla de "selección al entrar" (abajo). |
| Botón de pendientes, `.ib-pend` del Inicio | Barra de pantallas, Inicio | Igual | `{ page: 'inbox', tab: 'pend' }` | Abre `club.todo` con la primera decisión pendiente elegida. |
| Avance frenado por decisión nueva | F4 (avance en curso) | Igual | `{ page: 'inbox', tab: 'pend', sel: <key nueva> }` | La clave sale de la diferencia entre `decisionKeys` antes y después del día. Si hay varias nuevas, la primera en el orden del bloque. |
| Clic en un mensaje del mosaico | Inicio | Igual | `{ page: 'inbox', tab: 'club.todo', sel: 'n<id>' }` | En celular abre directamente el detalle de ese mensaje. |
| Atrás o adelante | Ficha, otra pantalla | Restaura la entrada, sin animación de entrada nueva | La ruta guardada + scroll de la lista | Si la selección guardada ya no existe (oferta respondida), se aplica la regla de "selección al entrar". |

**Selección al entrar** (escritorio, más de 900 px): la de la ruta si existe; si no, la primera decisión pendiente; si no hay, el primer mensaje sin leer de la vista; si no hay, el primero de la vista; si la vista está vacía, ninguna. En celular y por debajo de 900 px no se elige nada al entrar: se ve la lista (salvo que la ruta traiga `sel`, que abre el detalle).

**La selección automática no marca leído** (decisión 12, UR-22): el mensaje elegido por la regla anterior se muestra en el panel, pero sigue sin leer hasta que el DT lo elige a propósito. Solo la selección que trae la ruta desde un clic del DT (un mensaje del mosaico del Inicio) cuenta como apertura a propósito.

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Cambiar de alcance o de tema | La misma pantalla | En el lugar; **reemplaza** la entrada del historial (resuelve G6) | `tab` en la ruta y en `ib.tab` | No apila: volver atrás sale de la bandeja, no recorre filtros. |
| Elegir otro mensaje (escritorio) | La misma pantalla | En el lugar; reemplaza la entrada | `sel` en la ruta; el mensaje queda leído | Volver a la bandeja desde una ficha devuelve la misma selección. |
| Abrir un mensaje (celular / ≤ 900 px) | Detalle del mensaje | **Apila** una entrada nueva; `page-in` 160 ms | `sel` en la ruta | Es la única selección que apila, para que "Atrás" del navegador y "◂ Bandeja" vuelvan a la lista. |
| "◂ Bandeja", Esc o Atrás desde el detalle | Lista | Vuelve en el historial | Restaura el scroll de la lista | El foco va a la fila del mensaje que se estaba leyendo. |
| Aceptar / Rechazar / Pedir más (oferta), Aceptar / Rechazar (trabajo), Que hable el ayudante, Declararlo transferible; de un trato: Aceptar US$ X, Mejorar, Retirar la oferta, Confirmar el préstamo, Cancelar el trato | La misma pantalla, estado "Resuelto" | En el lugar | El motor cambia el estado; `save()` | Ver sección 6, "Resuelto". Aceptar un trabajo cambia el club del DT: el tema del club (A3) cambia en el mismo cuadro, y los tratos de mercado abiertos se caen (la confirmación los nombra). Aceptar US$ X deja la decisión abierta como acuerdo (misma clave `deal<id>`): no pasa a "Resuelto", pasa a la plantilla "Acuerdo para cerrar". |
| Negociar contrato / Seguir negociando (acuerdo de compra) | `NegotiationModal` (F5) sobre la bandeja | Modal | Términos y paciencia guardados en el trato | Al cerrar, foco al botón que la abrió; si se firmó, "Resuelto". |
| Ver todos los tratos | Mercado › Tratos con ese trato o esa oferta elegido (`sel: 'deal<id>'` / `'offer<id>'`) | `nav()`, apila | — | Solo lectura; no responde. |
| Responder (prensa) | `PressModal` (F5) | Modal | — | Al cerrar, si la conferencia se respondió, la decisión pasa a "Resuelto". |
| Ver el informe del partido / del rival | `MatchReport` / `ReportModal` (F5) | Modal | Aplicar sugerencias del rival cambia `club.tactic` | Al cerrar, foco al botón que la abrió. |
| Tarjeta del jugador o del club, "Ver la ficha", "Ver el club", "Hablar con él", "Ofertar" | Ficha (N5) en la pestaña que corresponda | `nav()`, apila | — | "Hablar con él" abre la pestaña `personal` (Vestuario), con el foco en "Hablar con él" de la `LockerCard` (`design/ux/vestuario.md`, sección 4); "Ofertar", `contrato`. |
| "Armar la reserva" (mensaje "Reserva: no hubo partido", `act: 'reserve'`, nuevo) | Vestuario en el modo "Armar la reserva" (`{ page: 'locker', tab: 'armar' }`) | `nav()`, apila | — | Lo define `vestuario.md` (7.2). Solo navega: no marca nada fuera de la regla de leído de siempre. |
| "Ir a Entrenamiento", "Ver posiciones", "Ir a Tácticas" | Esa pantalla | `nav()`, apila | — | — |
| Continuar o Ir al partido (barra superior, Espacio según G1) | La misma pantalla mientras avanza | F4 | — | La lista se actualiza día por día; las acciones se deshabilitan durante el avance (sección 7.3). |
| Cualquier otra navegación | Otra pantalla | `nav()` | `ib.tab` y scroll quedan guardados | — |

---

## 5. Layout Specification

Resolución de referencia: 1440 × 900 en escritorio; 360 × 740 en celular.

### 5.1 ASCII Wireframe

**Escritorio (más de 900 px)**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ (barra superior N1 y barra de pantallas: Inicio › Resumen  [Bandeja 3]  Calendario …)        │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ (i) Ayuda de pantalla O2, solo la primera vez                                     [Entendido] │
│ BANDEJA DE ENTRADA                                    [⌕ Buscar en los mensajes   ] [Marcar 5 │
│                                                                                    leídos ] │
│ [Mi club] [Todo el fútbol]   (Todo 5) (Plantel 2) (Mercado 1) (Partidos 2) (Torneos) (Dirig.)│ ← FILTROS
├────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ PARA DECIDIR · 3                   │ MERCADO                       ofrecida el 10 nov 2026   │
│┃● (!) Oferta · Racing Club         │ Racing ofrece US$ 2,4 M por Juan Pérez                  │
││   Racing ofrece US$ 2,4 M por J.P.│                                                         │
││   Vence en 3 días · el 18 nov  ›  │ ┌───────────────────────────┐ ┌───────────────────────┐ │
│┃  (!) Vestuario · M. Gómez         │ │{cara} Juan Pérez   DC  74 │ │{escudo} Racing Club   │ │
││   Gómez quiere irse               │ │ 24 años · Titular · 18 PJ │ │ Liga Profesional · 4.º│ │
│┃  (!) Prensa                       │ │ Contrato dic 2028          │ └───────────────────────┘ │
││   Conferencia previa al partido   │ └───────────────────────────┘                           │
├────────────────────────────────────┤  OFERTA      VALOR       DIFERENCIA   SUELDO            │
│ HOY · SÁB 14 NOV                   │  US$ 2,4 M   US$ 2,0 M   +20 %        US$ 18 mil/mes    │
│  (✚) Parte médico · L. Díaz      ● │  Vence en 3 días (el 18 nov). Libro de pases abierto.   │
│      Díaz se lesionó en la práctica│  Si lo vendés te quedan 2 delanteros centro.            │
│  (⚽) Partido                       │                                                         │
│      Ganaste 2-1 a Lanús           │  Racing ofrece US$ 2.400.000 por el pase de…  {cuerpo}  │
│ AYER · VIE 13 NOV                  │                                                         │
│  (⇄) Mercado · Scouting            │  [● Aceptar]  [Pedir más]  [Rechazar]                   │
│      Informe completo: R. Sosa     │  Pedir más: Racing puede mejorar la oferta o retirarse. │
│  …                                 │  {nota de resultado F7, role=status}                    │
│ [Mostrar 150 más]                  │                                                         │
└────────────────────────────────────┴─────────────────────────────────────────────────────────┘
   LISTA (≈ 40 %, desplazable)           LECTURA (≈ 60 %, fija al desplazar la página)
```

`●` en la columna de lectura marca el foco al pulsar Enter en la lista (botón primario). Al entrar a la pantalla, el foco está en la fila elegida de la lista. "[Mostrar 150 más]" se dibuja al pie de la columna pero **está fuera del `listbox`**: es un botón propio, una parada de Tab justo después de la lista.

**Celular (≤ 760 px) y ventana angosta (761–900 px): lista → detalle**

```
LISTA                                   DETALLE (entrada nueva del historial)
┌────────────────────────────────┐      ┌────────────────────────────────┐
│ [escudo] 14 nov  [Continuar]   │      │ [escudo] 14 nov  [Continuar]   │
├────────────────────────────────┤      ├────────────────────────────────┤
│ Bandeja               [⌕]      │      │ [◂ Bandeja]        3 de 3 [‹][›]│
│ [Mi club] [Todo el fútbol]     │      │ MERCADO · 10 nov               │
│ (Todo 5)(Plantel 2)(Mercado 1)→│      │ Racing ofrece US$ 2,4 M por    │
├────────────────────────────────┤      │ Juan Pérez                     │
│ PARA DECIDIR · 3               │      │ {tarjeta jugador}              │
│┃(!) Oferta · Racing      ›     │      │ {tarjeta club}                 │
│┃    Vence en 3 días            │      │ OFERTA US$ 2,4 M · VALOR 2,0 M │
│┃(!) Vestuario · M. Gómez ›     │      │ Vence en 3 días (18 nov)       │
├────────────────────────────────┤      │ {cuerpo del mensaje}           │
│ HOY · SÁB 14 NOV               │      │ ...                            │
│ (✚) Parte médico · L. Díaz ●  │      ├────────────────────────────────┤
│     Díaz se lesionó…           │      │ [      Aceptar (≥ 44 px)     ] │ ← BARRA DE
│ ...                            │      │ [Pedir más]      [Rechazar]    │   ACCIONES FIJA
├────────────────────────────────┤      ├────────────────────────────────┤
│ Inicio  Bandeja  Plantel  Tác. │      │ Inicio  Bandeja  Plantel  Tác. │ ← N3
└────────────────────────────────┘      └────────────────────────────────┘
```

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Ayuda de pantalla | `PageTip id="inbox"` (O2) | Ancho completo, una línea | No | Se descarta con "Entendido" |
| Encabezado | Título, búsqueda, "Marcar N como leídos" | Ancho completo, ~48 px | No | Por debajo de 1060 px, la búsqueda pasa a botón de lupa que despliega el campo en la misma fila |
| Filtros | Alcance (C1, 2 opciones) y temas (chips con contador) | Ancho completo, ~40 px | Horizontal solo en la fila de chips (celular) | Los chips nunca pasan a dos filas: se desplazan de costado con un degradé en el borde como señal; la página no se desplaza de costado (AV-06) |
| Lista: bloque "Para decidir" | Pendientes de `pendingOf`, siempre arriba, independiente de filtros y búsqueda | Columna de lista; alto según cantidad (normal 0 a 3 filas) | Con la lista | Nunca se oculta ni se colapsa; con 0 pendientes queda una línea (estado vacío) |
| Lista: mensajes por día | Mensajes de la vista agrupados por fecha | 40 % del ancho (mín. 360 px), alto `100vh − 230 px` | Sí, vertical, independiente de la página | Rinde 150 filas; "Mostrar 150 más" es un botón **fuera del `listbox`**, pegado al pie de la lista (una parada de Tab propia). Al cargar más, el foco se queda en el botón y se anuncia "150 mensajes más." |
| Lectura | Plantilla del mensaje o la decisión elegida | 60 % del ancho, mín. 260 px de alto, `position: sticky` | Sí, vertical, si el contenido supera el alto visible | El cuerpo largo se lee completo; las acciones quedan al final del contenido (escritorio) |
| Barra de acciones (celular) | Botones de la decisión, fija sobre la barra inferior N3 | Ancho completo, 56–112 px | No | Primario a todo el ancho en su propia fila; secundarios en una segunda fila; si hay más de 3, el cuarto pasa a "Más acciones" dentro del contenido (no a un menú). **Decisiones de un trato (`deal`, pregunta 22)**: la barra lleva solo el primario (Aceptar US$ X, Negociar contrato / Seguir negociando o Confirmar el préstamo; con la F6 abierta, Confirmar y No) y una segunda fila con **un único** botón (Retirar la oferta o Cancelar el trato). El campo Mejorar con su "Ofertar", sus avisos, el impacto, Ver todos los tratos y Ver la ficha van **en el contenido**, después de las cifras: **nunca un campo de texto en la barra fija**. **La barra no cambia de posición por el foco** (`mercado.md`, pregunta 39): sigue fija mientras se edita Mejorar, y el bloque Mejorar lleva `scroll-margin-bottom` igual al alto de la barra (`--ib-bar`), así el campo y su "Ofertar" quedan siempre por encima de ella. (Antes la barra pasaba a `position: static` con el foco en Mejorar: el `mousedown` en "Aceptar US$ X" sacaba el foco del campo, la barra saltaba y el clic se perdía.) La única regla de posición es la de ventana muy baja (`max-height: 520px`), que depende del alto y no del foco; la página no usa `interactive-widget=resizes-content`, para que el teclado virtual no la dispare |

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| Ayuda de pantalla | Nota | Ayuda | Explica la regla de la bandeja una vez ("Lo que tenés que decidir está siempre arriba, con su plazo: las ofertas y los trabajos vencen. Cada mensaje trae los botones para resolverlo.") | Sí | Sí — O2 `PageTip`; actualizar el texto en `TIPS` |
| Título "Bandeja de entrada" | `h2` | Encabezado | Nombre de la pantalla (AC-09) | Sí | Sí |
| Buscador | Campo `input type="search"` con `aria-label="Buscar en los mensajes"` | Encabezado | Filtra la vista por título, cuerpo, jugador o club | Sí | No — nuevo (estilo de `.searchbox`, N8) |
| Marcar como leídos | Botón chico `.btn.sm` | Encabezado | Marca leídos los mensajes sin leer **de la vista actual** (alcance, tema y búsqueda); dice cuántos | Sí (solo si hay sin leer en la vista) | Sí — C2 |
| Selector de alcance | Segmentado, 2 opciones: Mi club / Todo el fútbol | Filtros | Separa lo del DT del diario | Sí | Sí — C1 `Seg`, con el **estado activo nuevo** (decisión 3: borde de acento, fondo suave de acento y ✓ antes de la etiqueta, texto de color normal) y `aria-pressed`. Cambio global de `Seg` en todas las pantallas |
| Chip de tema | Botón alternable con contador | Filtros | Todo, Plantel, Mercado, Partidos, Torneos, Dirigencia; uno activo por vez; mismo estado activo que `Seg` | Sí | **No — patrón nuevo "Filtro con chips y contador"** (sumar a la biblioteca como C5; ver pregunta abierta 3). Se arma sobre `.chip` del estilo portal |
| Encabezado del bloque "Para decidir · N" | Encabezado de grupo (`role="group"` con nombre) | Lista | Responde la pregunta principal | Sí | No — variante de `.msg-day` con borde de advertencia |
| Fila de decisión | Opción de lista | Lista | Una decisión: ícono, remitente, título, plazo | Sí | Sí — anatomía de `.msg` del Inicio + `.ib-row.pend` (F1); `PendRow` a rediseñar |
| Encabezado de día | Separador `.msg-day` | Lista | "Hoy · sáb 14 nov", "Ayer · vie 13 nov", luego `fmtDate` | Sí | Sí — `.msg-day` del Inicio (subir a 12 px, ver 12) |
| Fila de mensaje | Opción de lista | Lista | Ícono redondo por tema (`TAG_ICON`), remitente + entidad, título, marca de sin leer, chip de acción | Sí | Sí — `.msg`, `.msg-ico`, `.msg-from`, `.msg-t`, `.msg-dot` del Inicio (mover `TAG_ICON` y `TAG_NAME` a un módulo compartido) |
| Chip de acción en la fila | Chip | Lista | "Para decidir" (si el mensaje tiene una decisión abierta), "Trato" (mensaje de un trato del mercado, `act: 'deal'`, que no es la decisión vigente: rechazo, caída, vencimiento o un mensaje viejo de un trato que siguió; tabla D de `mercado.md`), "Ver informe" (resultado), "Informe" (ojeo/rival). Texto, no ícono | No | Sí — D6 `.chip` |
| Mostrar más | Botón chico, **fuera del `listbox`** | Lista (pie, debajo del `listbox`) | Carga 150 filas más. Es una parada de Tab propia justo después de la lista, porque un botón dentro de `role="listbox"` no se alcanza con las flechas | Sí (si hay más) | Sí — mismo texto que D1 ("Mostrar N más") |
| Estado vacío de lista y de bloque | Texto | Lista | F8 con causa y cuándo se llena | Sí | Sí — F8 |
| Encabezado de lectura | Fila | Lectura | Tema (como `h3` teñido, estilo portal), fecha, "Marcar como no leído" | Sí | Sí, más un botón chico nuevo |
| Título de lectura | `h2` | Lectura | El título del mensaje | Sí | Sí |
| Tarjeta de jugador | Botón-tarjeta con `data-pid` | Lectura | Cara, nombre, puesto, valoración, edad, rol en el plantel, contrato; abre la ficha | Según tipo | Sí — `Who` + `Face`, `PosPill`, `Val` (D4), `Status` (D6), I1 |
| Tarjeta de club | Botón-tarjeta con `data-cid` | Lectura | Escudo, nombre, categoría, posición, reputación; abre la ficha | Según tipo | Sí — `Who` + `Badge`, I1 |
| Cifras clave | Fila de `.kpi` | Lectura | Los números que deciden (dinero, plazos, días afuera, marcador) | Según tipo | Sí — `.kpi` |
| Línea de plazo | Texto con ícono "!" | Lectura | "Vence en 3 días (el 18 nov)"; "Vence mañana" o "Vence hoy" en advertencia | En decisiones | No — nuevo texto; color de advertencia más texto |
| Cuerpo | Párrafo `.ib-body` | Lectura | El texto del motor | Sí | Sí |
| Fila de acciones | Botones | Lectura / Barra de acciones | Primario, comunes y peligro según `act` | Según tipo | Sí — F2 y C2; un primario por bloque |
| Confirmación en el lugar | Par de botones | Lectura / Barra de acciones | "Confirmar: vender a Pérez por US$ 2,4 M" / "No" | En acciones irreversibles | Sí — F6 (resuelve G5) |
| Nota de resultado | Texto `role="status"` | Lectura | "Vendiste a Pérez a Racing por US$ 2,4 M." | Tras una acción | Sí — F7, con `role="status"` (resuelve la parte de G3 que toca F7) |
| Siguiente pendiente | Botón primario | Lectura | Tras resolver, lleva a la próxima decisión | Si quedan pendientes | No — botón C2 con texto propio |
| Botón "◂ Bandeja" y "N de M ‹ ›" | Botón e íconos | Detalle (celular) | Volver a la lista; anterior y siguiente sin volver | Sí (≤ 900 px) | Sí — C2 icono con `aria-label` |
| Ventanas de prensa e informes | Modal | Sobre la pantalla | Responder la conferencia, leer informes | Según tipo | Sí — F5 `PressModal`, `MatchReport`, `ReportModal` |

**Plantillas de lectura por tipo** (qué muestra el panel según `act` o el tipo de pendiente). Todas comparten encabezado, título y cuerpo; cambian la tarjeta, las cifras y las acciones. El primario es la acción esperada; el peligro va último.

| Tipo | Tarjeta(s) | Cifras clave | Línea extra | Acciones (orden) |
|------|-----------|--------------|-------------|-----------------|
| Oferta por un jugador (`offer`, pendiente `offer`) | Jugador (con rol en el plantel y partidos de la temporada) y club que ofrece | Oferta, Valor, Diferencia ("+20 %" o "−15 %", con signo y palabra "sobre/bajo su valor"), Sueldo, Contrato | Plazo; estado del libro de pases; "Si lo vendés te quedan N en su puesto" | **Aceptar** (primario, F6: "Confirmar: vender a X por US$ Y"; deshabilitado con el libro cerrado, con motivo visible debajo, no solo en `title`), Pedir más (común; deshabilitado con el libro cerrado; debajo, siempre visible: "El club puede mejorar la oferta o retirarse"), **Rechazar** (peligro, F6: "Confirmar rechazo"), Ver la ficha (común) |
| **Contraoferta** (pendiente `deal`, `kind: 'countered'`; mensaje `act: 'deal'`) · fila del bloque: "Contraoferta, Lanús. Pide US$ 1,6 M por Juan Pérez. Vence en 5 días." | Jugador ajeno (cara, puesto, valoración como rango con "conocés el N %") y club vendedor (escudo, categoría, puesto en la tabla) | Tu oferta, Pide (con la diferencia: "+14 %"), Pedido público, Libre para ofertar | Plazo en palabras con fecha (`deal.deadline`: 7 días desde la respuesta o el cierre del libro, lo que llegue antes; "! el libro cierra antes" si corresponde); "Si mejorás, {club} vuelve a responder en 1 a 3 días"; si ese rango pasa del cierre, junto al campo Mejorar: "! El libro cierra el 20 feb: si {club} contesta después, la mejora caduca"; impacto con el monto que pide (sueldo como rango, `mercado.md` pregunta 9); préstamo: "Pide un cargo de US$ X" | **Aceptar US$ X** (primario; sin F6: no se paga nada hasta firmar; la decisión sigue abierta como "Acuerdo para cerrar"; deshabilitado con el motivo escrito si el monto supera lo libre), **Mejorar** (campo con tu oferta anterior + "Ofertar"; común; un monto igual o mayor al pedido avisa "Con US$ X ya es aceptar su pedido: usá Aceptar"; el último día del libro, deshabilitado con su motivo), **Retirar la oferta** (común, sin F6), Ver todos los tratos, Ver la ficha. En ≤ 900 px, ver la barra de acciones de 5.2 |
| **Acuerdo para cerrar** (pendiente `deal`, `kind: 'agreed'`; mensaje `act: 'deal'`) · fila del bloque, compra: "Acuerdo, Lanús. Aceptó US$ 1,4 M por Juan Pérez. Falta el contrato. Vence en 7 días."; préstamo: "Préstamo, Tigre. Te presta a F. Leiva. Falta tu confirmación. Vence en 7 días." | Las mismas del trato | Compra: Monto acordado, Pedido público, Sueldo que pide el representante (exacto si ya abrió la mesa; si no, el sueldo que pediría como rango, del mismo `demand`), Prima (si ya la pidió), Paciencia del representante en palabra ("mucha", "media" o "poca", nunca un número) **solo si ya se sentó a negociar** (`deal.neg`; antes, ninguna línea de paciencia). Préstamo: Cargo, Sueldo que se suma (rango hasta 95 % de conocimiento, también en la F6), Hasta fin de temporada | Plazo en palabras con fecha (`deal.deadline`); compra: "El club ya aceptó; falta el contrato con {jugador}."; impacto (libre para ofertar, caja, sueldos con el tope, plantel). Si llegó por "Aceptar US$ X" desde una contraoferta, arriba: "Actualizado: aceptaste su pedido el {fecha}; falta el contrato." Siempre: "Si lo cancelás o lo dejás vencer, no podés volver a ofertar por él durante 14 días y {club} va a pedir un 10 % más por sus jugadores hasta esa fecha." | Compra: **Negociar contrato** / **Seguir negociando** si ya hubo rondas (primario; abre `NegotiationModal` sobre la bandeja con los términos y la paciencia guardados; el fichaje se confirma ahí con F6). Préstamo: **Confirmar el préstamo** (primario, **F6**: "Confirmar: F. Leiva llega a préstamo hasta fin de temporada, cargo US$ 60 mil, cobra US$ 6 mil por mes"; con menos de 95 % de conocimiento, "cobra entre US$ X e Y por mes"). En los dos: **Cancelar el trato** (común, **F6** con el costo escrito: "Confirmar: cancelar el trato por L. Gómez. No vas a poder ofertar por él hasta el 26 ene y Banfield va a pedir un 10 % más por sus jugadores hasta esa fecha." / "No"), Ver todos los tratos, Ver la ficha. En ≤ 900 px, ver 5.2 |
| **Mensaje de un trato que ya no es la decisión vigente** (`act: 'deal'`: rechazo, caída, vencimiento, o un mensaje viejo de un trato que siguió) | Jugador y club | Monto | El texto del estado del trato (`mercado.md`, tabla de estados): "Colón no acepta: no puede desprenderse del jugador.", "Este acuerdo venció el 18 ene.", "Se cayó: dejaste Banfield.", "Firmaste: J. Pérez es jugador de Independiente.", "Cancelaste el trato · bloqueado hasta el 26 ene."; si el trato ya no está en el registro (se podó por el tope de 60), "Este trato ya no figura en el historial." con solo Ver la ficha y sin "trato nuevo"; en un mensaje viejo de un trato que siguió, "Ya respondiste esta contraoferta: mejoraste tu oferta a US$ 1,5 M el 13 ene." con "Ver la respuesta nueva ▸"; si el DT volvió a ofertar por el jugador, "Volviste a ofertar por él el 15 ene." con "Ver el trato nuevo ▸" | Ver todos los tratos (común), Ver la ficha. Sin acciones del trato: **nunca** las de otro mensaje o de otro trato |
| Oferta de trabajo (`job`, pendiente `job`) | Club que ofrece, comparado con el club actual | Categoría, Posición, Reputación, Presupuesto, cada una "ese club / el tuyo" | Plazo según el tipo (`kind`, sección 8). **A mitad de temporada**: "Respondé hasta el {until}." (el {until} todavía se puede responder) y "Si aceptás, dirigís {club} desde mañana." **De fin de temporada**: "Respondé antes de comenzar la próxima temporada: si la comenzás sin responder, la oferta se pierde." y "Empezás la próxima temporada en {club}." En los dos casos, lo que se pierde al aceptar, con números: "Si aceptás, se cancelan las {N} ofertas por tus jugadores y las {M} de otros clubes; el ayudante de campo y el preparador físico se van con vos y el médico, el scouting y las inferiores quedan en {club actual}." y, si hay tratos de mercado abiertos (`jobConsequences.deals`, pregunta 22), con nombre: "Se caen tus 3 tratos de mercado: la oferta por G. Ibarra (Lanús), la contraoferta de Vélez por T. Ruiz y el acuerdo con Banfield por L. Gómez." (con más de 3, nombra 3 y dice "y N más"; "se cae tu trato con…" si es uno) (cada parte solo si aplica, con concordancia: "se cancela la oferta por tu jugador", "se cancelan la oferta por tu jugador y la de otro club", "el preparador físico se va con vos", "el médico queda en {club actual}"; solo se nombran los puestos ocupados; la conferencia abierta también se descarta) | **Aceptar** (primario, F6: "Confirmar: dejar {club actual} y dirigir {club}"; la línea de consecuencias queda visible junto a la confirmación), Ver el club, **Rechazar** (peligro, F6) |
| Jugador que quiere irse (`out`, pendiente `out<pid>`; también el mensaje "{nombre} sigue queriendo irse" de la nueva temporada) | Jugador con conformidad (`MoodBar`: número y palabra de `moodOf`, la escala única del Vestuario; ya no `Cond`) y rol | Conformidad, Rol, Minutos esperados vs. jugados (`minutesOf`) | "No vence: sigue pendiente hasta que le respondas con una charla, lo declares transferible, renueve o se vaya." Promesas vigentes, si hay. Siempre, la comparación de los dos caminos (`vt-letgo` de `design/ux/vestuario.md`, con los números y fechas de `letGoInfo`: con el libro cerrado, la fecha en que abre; con la charla usada, "(charla, desde el {fecha})") | Salen de `outActions(g, p)` (`vestuario.md`, sección 8), no de la pantalla. **Charla disponible**: **Hablar con él** (primario, lleva a la ficha › Vestuario, pregunta 4 de `vestuario.md`), Declararlo transferible (común, reversible desde la ficha: sin F6). **Charla usada** (pregunta 8 de `vestuario.md`): la nota de `outActions` ("Hablaron el 12 nov · de nuevo desde el 19 nov. Mientras tanto, podés declararlo transferible…") y **Declararlo transferible** (primario, sin F6); "Hablar con él" no aparece como botón deshabilitado. **A préstamo**: sin acción, con "Está a préstamo: no se lo puede declarar transferible. Podés volver a hablarle desde el {fecha}. El pedido no vence." En todos, Ver la ficha |
| Conferencia (pendiente `press`) | — | Partido y rival | Las preguntas en cursiva. "Si seguís sin responder, habla el ayudante." | **Responder** (primario, `PressModal`), Que hable el ayudante (común, sin F6: bajo costo) |
| Lesión (`injury`) | Jugador con estado de lesión (D6) | Días afuera (actuales, no los del mensaje), Vuelve (fecha estimada), Partidos que se pierde (fixtures propios hasta esa fecha) | Si ya se recuperó: "Ya está recuperado" en lugar de las cifras | **Ir a Tácticas** (primario, si era titular), Ver la ficha |
| Resultado (`result`) | Ambos escudos con marcador grande; figura (`pid`) con su puntaje | Marcador, torneo, resultado en palabras (Victoria, Empate, Derrota) | — | **Ver el informe del partido** (primario, `MatchReport`), Ver posiciones (si es de liga) |
| Informe de ojeo (`scout`) | Jugador con valoración y potencial (ya conocidos: D4 exacto) | Los 4 mejores atributos con número y tono, el más flojo, personalidad, valor, pedido de sueldo (el sueldo que pediría del Mercado: `wageShown(g, p, demandWage(g, p), 402)`, la misma fuente que el panel, el `BidBox` y el primer pedido del representante; con el informe completo es exacto; `Inbox.tsx:555` ya usa `demand`, falta pasarlo por `wageShown`; `mercado.md`, pregunta 38) | Club y contrato | **Ver la ficha** (primario), Seguir (alternable), Ofertar (común; solo si no es propio) |
| Informe del rival (`rival`) | Club rival y fecha del partido | Estilo, punto débil (del informe) | "Ese partido ya se jugó" si `ref` ya no es el próximo | **Ver el informe del rival** (primario, `ReportModal` con sugerencias aplicables) |
| Entrenamiento (`train`) | — | — | — | **Ir a Entrenamiento** (común) |
| Fin de temporada (pendiente `season`) | — | Posición final, objetivo de la dirigencia (si se conoce) | — | **Ir al inicio** (primario) |
| Torneo y premio | Club, si hay | — | — | Ver posiciones (común) |
| Cualquier otro | Jugador o club, si hay | — | — | Ninguna (solo lectura) |

Si la entidad ya no existe (jugador retirado o ido al exterior, club sin datos), la tarjeta se reemplaza por "Ya no está en el fútbol argentino." y las acciones sobre él desaparecen (F8), **salvo en un mensaje `out`**: ahí manda la línea de vigencia "Ya no está en el plantel." (abajo) y la tarjeta del jugador se omite, sin una segunda frase (pregunta 25). Si la decisión ya no está vigente, las acciones se reemplazan por el texto tenue de F2 ("Esta oferta ya fue respondida o venció."). **Vigencia de un mensaje de oferta o de trato** (pregunta 22): un mensaje con `act: 'offer'` o `act: 'deal'` ofrece las acciones de la decisión solo si es **el más nuevo** de su clave (`offer<ref>` o `deal<ref>`, `newestOf` en `src/engine/inbox.ts`) y la decisión sigue pendiente; los demás muestran el texto de su estado (fila "Mensaje de un trato que ya no es la decisión vigente"). Las acciones siempre salen del estado del trato **ahora**, no del título del mensaje. **Vigencia de un mensaje de pedido de salida** (pregunta 24): un mensaje con `act: 'out'` ofrece las acciones solo si es el más nuevo de su clave `out<pid>` y el pedido sigue abierto (jugador propio, `wantsOut`, no transferible). Si no: "Ya respondiste este pedido." (un mensaje viejo, o el pedido se resolvió con una charla, una renovación o declarándolo transferible), "Ya no está en el plantel." (ya no está en el plantel del DT por cualquier camino: otro club, el exterior, retiro, o el DT cambió de club; es el único texto para ese caso en un mensaje `out`, el mismo de `vestuario.md`) o "Está declarado transferible." (lo está y sigue queriendo irse), con solo Ver la ficha.

**Primary focus element on open**: la fila elegida de la lista (regla de "selección al entrar"); si llegó por el freno del avance o por el botón de pendientes, esa decisión. Si la lista está vacía y no hay pendientes, el selector de alcance. En el detalle del celular, el título del mensaje (`h2` con `tabindex="-1"`), para que el lector y el foco empiecen por el contenido.

### 5.4 Information Hierarchy

1. **¿Hay algo para decidir? ¿Cuántas cosas?** El encabezado "Para decidir · N" y sus filas, arriba de todo, sin depender de filtros ni de la búsqueda. Es la pregunta de la pantalla. Con 0, una línea que lo dice.
2. **Qué vence primero.** Dentro del bloque, orden por plazo (lo que vence antes, arriba); sin plazo (prensa, temporada) al final del bloque, salvo la conferencia, que va primera porque bloquea el partido. Cada fila muestra el plazo en texto.
3. **Qué hay nuevo en mi club.** Mensajes sin leer en negrita con marca, agrupados por día con "Hoy" y "Ayer" (la memoria del jugador es por fecha de juego, como en el mosaico del Inicio).
4. **El contenido del elegido**: título, quién (tarjeta), los números que deciden y los botones. Las cifras van antes que el cuerpo porque el cuerpo repite lo que ya dicen.
5. **Qué filtros están puestos.** Alcance y tema visibles siempre, con contadores de sin leer: avisan dónde hay novedades sin abrirlas.
6. **Puede esperar**: el resto del fútbol (alcance "Todo el fútbol"), la búsqueda, "Marcar como leídos", mensajes viejos detrás de "Mostrar más".

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Carga | — | No existe: el estado está en memoria | — | La pantalla dibuja en el primer cuadro. No mostrar esqueletos. |
| Poblada | Hay mensajes en la vista | Lista agrupada por día; lectura con el elegido | Todo habilitado | Estado normal. |
| Con pendientes | `pendingOf(g).length > 0` | Bloque "Para decidir · N" con borde izquierdo de advertencia, ícono "!" y plazos | Las filas del bloque son las primeras en el orden de flechas | Un mensaje del día cuya decisión sigue abierta lleva el chip "Para decidir"; elegirlo muestra la misma plantilla que la fila del bloque. |
| Sin pendientes | `pendingOf(g).length === 0` | El bloque queda en una línea: "Nada para decidir. Podés seguir con Continuar." | No es seleccionable | Contesta la pregunta principal también cuando la respuesta es "nada". |
| Vista vacía (filtro) | El tema no tiene mensajes en el alcance | F8 en la lista con causa y cuándo se llena. Ej. Mercado / Mi club: "Todavía no hay mensajes de mercado de tu club. Acá llegan las ofertas por tus jugadores y los informes del scouting." | "Marcar como leídos" desaparece | Un texto por tema (sección 13). |
| Partida nueva | `g.news` sin mensajes propios | "Todavía no llegó nada. Los mensajes del cuerpo técnico, la dirigencia y el mercado van a aparecer acá a medida que pasen los días." | Lectura: "Elegí un mensaje de la lista." no se muestra; el panel repite la ayuda O2 | — |
| Búsqueda activa | Texto en el buscador | El campo muestra "✕ Borrar"; la lista solo tiene coincidencias, con el término resaltado en negrita (no solo color); encabezados de día se conservan | El bloque "Para decidir" **no** se filtra | La búsqueda no se recuerda al salir de la pantalla (excepción explícita a C4: una lista filtrada sin aviso al volver confunde más de lo que ayuda). |
| Búsqueda sin resultados | Ninguna coincidencia | "Ningún mensaje contiene «x» en esta vista." + botón "Buscar en todo el fútbol" (si el alcance es Mi club) + "Borrar búsqueda" | — | — |
| Elegido | Clic, flechas o ruta | Fila con fondo `--accent-soft`, borde izquierdo de acento de 3 px y `aria-selected="true"` | Si lo eligió el DT, el mensaje pasa a leído; la selección automática al entrar no lo marca (regla de leído) | El estado no depende solo del fondo: hay borde. |
| Sin leer | `!n.read` en un mensaje propio | Título en negrita, punto `.msg-dot` a la derecha con `aria-label="Sin leer"` | Cuenta en la insignia F3 y en los chips, **salvo que el mensaje tenga una decisión abierta**: entonces cuenta solo como pendiente (UR-02). Para ofertas y tratos (`act: 'offer'` y `'deal'`), por cada decisión cuenta a lo sumo **un** mensaje, el más nuevo de su clave; los más viejos siguen en negrita hasta abrirlos, pero no cuentan (pregunta 22) | Las noticias del resto del fútbol no tienen estado "sin leer" visible ni cuentan: son el diario, no tareas. |
| Confirmación pendiente | Clic en Aceptar o Rechazar (oferta o trabajo), en Confirmar el préstamo (acuerdo de préstamo) o en Cancelar el trato (acuerdo; tiene costo, `mercado.md` pregunta 46) | El botón se reemplaza en el lugar por "Confirmar: …" (peligro para rechazos; primario para aceptar) y "No" | Esc o "No" cancelan; cambiar de selección cancela; el foco va a "Confirmar" | F6. Nunca un "¿Estás seguro?" genérico. |
| Resuelto | Acción confirmada (o Pedir más, Que hable el ayudante, Declararlo transferible) | La fila queda en el bloque con "✓ Resuelto" en texto y tono tenue hasta que cambia la selección o se sale de la pantalla; la lectura muestra la nota F7 y, si quedan pendientes, "Siguiente pendiente ▸" (primario) | El foco va a "Siguiente pendiente" o, si no hay, a la nota | Evita que el panel desaparezca bajo el cursor (hoy salta al primero de la lista). La copia local de lo resuelto es estado de la interfaz, no del juego. |
| Pedir más con retiro | `haggle` devuelve falso | Nota F7 en tono de advertencia: "Racing se retiró de la negociación." | Igual que Resuelto | — |
| Decisión vencida o respondida en otro lado | La oferta venció en el avance o se respondió desde Mercado; la contraoferta o el acuerdo de un trato venció, se respondió en Mercado o se cayó (cierre del libro, otro club compró al jugador, cambio de club) | Acciones reemplazadas por texto tenue (F2): "Esta oferta venció el {fecha}." si venció, "Ya respondiste esta oferta." si se respondió; en un trato, el texto de su estado ("Este acuerdo venció el 18 ene.", "Ya respondiste esta contraoferta.", "Se cayó: dejaste Banfield."); en una oferta que se borró sin decisión del DT, el de su registro de venta ("Se canceló: vendiste a J. Pérez a Racing.", "Se canceló: Boca pagó la cláusula de J. Pérez.", `mercado.md` pregunta 40) | La fila del bloque desaparece al siguiente refresco si no está elegida. Si venció, llega además el mensaje del motor "Venció la oferta de {club} por {jugador}" (UR-36, pregunta 14), que pasa a llevar `act: 'offer'` y `ref` y es el más nuevo de su clave: reemplaza en el conteo al de la oferta (suma 1, no 2). Igual en un trato: el mensaje de vencimiento o caída reemplaza al de la contraoferta o el acuerdo | El registro de tratos del motor (`g.deals`, `mercado.md` sección 8) distingue "venció" de "respondida" para ofertas y tratos. |
| Mensaje reemplazado | Un mensaje de oferta o de trato que ya no es el más nuevo de su clave | Sin acciones de la decisión: el texto de su estado y, si corresponde, "Ver la respuesta nueva ▸" o "Ver el trato nuevo ▸" (elige ese mensaje o ese pendiente) | No cuenta como sin leer aunque esté en negrita; abrirlo lo marca leído como a cualquiera | Evita que un mensaje viejo ("Colón no acepta…") muestre las acciones de una oferta nueva por el mismo jugador. |
| Entidad inexistente | Jugador o club ya no está | Tarjeta reemplazada por "Ya no está en el fútbol argentino."; en un mensaje `out`, sin tarjeta y con la línea "Ya no está en el plantel." (5.3) | Acciones sobre la entidad ocultas | — |
| Libro de pases cerrado | `!windowOpen(g.date)` en una oferta | "Aceptar" y "Pedir más" deshabilitados; debajo, visible: "El libro de pases está cerrado: no podés aceptar ni pedir más, solo rechazar." | — | El motivo no queda solo en `title` (AC-05). Con el libro cerrado no quedan contraofertas ni acuerdos: caducan el primer día cerrado con un mensaje cada uno (`mercado.md`). |
| Último día del libro | `windowState(g.date).daysLeft === 0` en una contraoferta | "Ofertar" de Mejorar deshabilitado con "Hoy cierra el libro: una mejora ya no llegaría a tener respuesta. Podés aceptar su pedido o retirar la oferta." | Aceptar US$ X, Retirar la oferta, Negociar contrato y Confirmar el préstamo siguen | Mismo control que el Mercado (`bidCheck`). |
| Plazo corto | Vence hoy o mañana | "Vence hoy" / "Vence mañana" en advertencia, con "!" | — | Texto, no solo color. |
| Avance en curso | F4 corriendo | La lista se actualiza por día; botones de decisión deshabilitados con "Frená el avance para decidir" visible | Ver 7.3 | El avance se frena solo si llega una decisión nueva. |
| Modal abierta | Prensa o informes | Fondo oscurecido (F5) | La lista no responde al teclado | — |
| Error al guardar | `save()` falla (IndexedDB) | Nota F7 en `--bad`: "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes." | El estado del juego ya cambió en memoria; no se revierte | `save()` devuelve `false` si falla y la nota aparece debajo del resultado de la decisión (además del aviso general del armazón). Resuelto el 2026-11-14 (pregunta abierta 6). |
| Celular / ≤ 900 px: lista | Ancho ≤ 900 px | Una columna; sin panel de lectura | Tocar una fila abre el detalle | — |
| Celular / ≤ 900 px: detalle | Fila abierta | Vista aparte con "◂ Bandeja", "N de M ‹ ›" y barra de acciones fija | Esc o Atrás vuelven a la lista | — |

**Regla de leído** (decisión 12, UR-22). Un mensaje pasa a leído solo cuando el DT lo abre a propósito: clic o toque en la fila, ↑ ↓ sobre la lista, Enter, ‹ › en el detalle del celular, o un clic en ese mensaje en el mosaico del Inicio. La selección automática al entrar no lo marca: la fila sigue en negrita y con su punto, y el panel lo muestra con la marca "Sin leer" en el encabezado de lectura. En celular, al abrir el detalle. "Marcar como no leído" en el encabezado de lectura lo deshace. Un mensaje con una decisión abierta pasa a leído al abrirlo igual que cualquier otro; su decisión sigue en el bloque "Para decidir" hasta resolverse. "Marcar N como leídos" muestra la nota F7 "Marcaste N como leídos." con un botón "Deshacer" mientras la nota está visible.

**Mensajes de una decisión del mercado** (ofertas por tus jugadores y tratos; pregunta 22, fuente `mercado.md` sección 8). La regla de arriba no cambia: nada pasa a leído por una selección automática. Se suman tres cosas, para que una decisión cuente una sola vez **también después de resolverla**: (1) **resolver la decisión a propósito, en cualquier pantalla** (Aceptar, Pedir más o Rechazar una oferta; Aceptar US$ X, Mejorar, Retirar la oferta, Negociar contrato, Confirmar el préstamo o Cancelar el trato de un trato; en la bandeja, en Mercado › Tratos o en la ficha) marca leídos todos los mensajes de esa clave: es actuar sobre lo que traían. Lo hace la función del motor que resuelve (`readDecisionNews`, con `markRead`), no la pantalla; (2) **lo que el DT acaba de ver nace leído**: el mensaje que el motor emite como resultado directo de una acción suya con esa consecuencia a la vista (la ruptura de la negociación que la ventana ya mostró, el fichaje confirmado, la venta confirmada, la cancelación de un acuerdo confirmada con su F6, los tratos que se cayeron al aceptar un trabajo cuya confirmación los nombraba; y al aceptar una oferta, los mensajes de las otras ofertas por el mismo jugador, que la confirmación nombró y la venta cancela); lo que pasa sin el DT (la respuesta de un club, un vencimiento, una caída por el cierre del libro, los tratos que se caen al tomar un club después de un despido, la cláusula que paga otro club) nace sin leer, y las ofertas que esa cláusula cancela no se marcan leídas; (3) **por cada decisión cuenta a lo sumo el mensaje más nuevo** de su clave. Elegir un trato en Mercado › Tratos **no** marca nada leído: elegir no es abrir el mensaje.

---

## 7. Interaction Map

Entradas cubiertas: mouse y teclado (escritorio), toque (celular). Gamepad: fuera de alcance.

**Decisión de teclado.** No se agregan atajos de una letra (j/k, a, r, e…): la biblioteca los prohíbe fuera del día de partido (N9, "No hagas") y el nivel Estándar exige poder apagarlos (AM-03; el interruptor "Atajos de una tecla" de Ajustes existe desde la fase 5 y apaga los globales). En su lugar, la lista es un `listbox` con foco itinerante: ↑ ↓ eligen, Enter lleva al primario del mensaje, Esc vuelve a la lista. Con eso, responder una oferta con teclado es: ↓ hasta la oferta, Enter (abre el mensaje: el foco va a Aceptar), Enter (pasa a Confirmar), Enter (confirma). Espacio sobre una fila sigue siendo Continuar (decisión 2, resuelta).

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| ↑ / ↓ | Teclado, foco en la lista | Elige la fila anterior o siguiente (pendientes y mensajes en un solo recorrido; los encabezados de día se saltean) y mueve el foco a ella | Fila elegida y foco visibles; la lista se desplaza para dejarla a la vista (`block: 'nearest'`, sin desplazamiento suave) | — | El oyente va **en el contenedor de la lista**, no en `window` (resuelve G7: con un menú N2 abierto, el foco está en el menú y la lista no recibe la tecla). Además ignora la tecla si `defaultPrevented`. En los extremos no da la vuelta. |
| Inicio / Fin | Teclado, foco en la lista | Primera o última fila cargada | Igual | — | — |
| Re Pág / Av Pág | Teclado, foco en la lista | Salta 10 filas | Igual | — | — |
| Tab / Mayús + Tab | Teclado | Recorre zonas en el orden de la sección 12 | Foco visible (A2) | — | La lista es **una sola parada** de Tab (solo la fila elegida tiene `tabindex="0"`). "Mostrar más" es **otra parada, inmediatamente después de la lista** y fuera del `listbox`. |
| Enter | Teclado, foco en una fila | **Abre el mensaje**: lleva el foco al botón primario del panel de lectura (en ≤ 900 px, abre el detalle) | Foco en el primario | — | Si el mensaje no tiene acciones, al título del panel. **Si el primario decide sin F6** (el caso es "Declararlo transferible" de `out<pid>` con la charla usada), Enter lleva el foco al título del panel de lectura (`tabindex="-1"`), que se lee con la nota de `outActions` como `aria-describedby`; Tab sigue el orden visual sin saltos: la tarjeta del jugador y después el primario (fase 5 de /team-ui, pregunta 25): dos Enter seguidos nunca deciden (misma regla que `vestuario.md`, pregunta 32; pregunta 25). Elegir con ↑ ↓ ya lo muestra y lo marca leído; Enter es el paso a actuar. |
| Esc | Teclado, foco en el panel de lectura | Vuelve el foco a la fila elegida | — | — | Si hay una confirmación F6 abierta, primero la cancela. |
| Esc | Teclado, detalle del celular | Vuelve a la lista (atrás en el historial) | — | — | — |
| Esc | Teclado, foco en el buscador con texto | Borra la búsqueda | — | — | Sin texto, el Esc sigue al manejo global (N9). |
| Espacio | Teclado, foco en una fila de la lista | Sigue siendo **Continuar** (atajo global, N9) | El avance de F4 | — | **Resuelto (decisión 2).** La fila es `role="option"` de un `listbox` de selección única que sigue al foco: Espacio no tiene función propia, así que no choca con G1. Abrir el mensaje es Enter. Con los atajos de una tecla apagados (AM-03), no hace nada. |
| Enter / Espacio / clic | Todas, foco en "Mostrar más" | Carga 150 filas más | Aparecen las filas nuevas debajo de las actuales; el foco queda en el botón | — | Como es un botón, Espacio lo activa (G1). El contador "Mostrar N más" se actualiza o el botón desaparece si no queda nada (el foco pasa a la última fila de la lista). |
| Espacio | Teclado, foco en un botón, chip, segmentado o campo | Activa ese control (o escribe) | Nativo | — | Requiere el arreglo global de G1/AM-02 (`App.tsx`): Espacio no actúa como atajo sobre `button`, `[role=button]`, `a`, `input`, `tr.click`. La bandeja no tiene que hacer nada propio. |
| ← / → | Teclado, foco en el segmentado o en la fila de chips | Mueve el foco entre opciones del grupo | Foco visible | — | Grupos con foco itinerante; Enter o Espacio eligen. |
| Mouse: hover en fila | Escritorio | — | Fondo `--panel2` | — | No elige ni marca leído. |
| Mouse: hover en tarjeta | Escritorio | Ficha breve (I1) a los 380 ms | `.hovercard` | — | Con foco de teclado, también (G4; depende del arreglo de I1). |
| Clic en fila | Escritorio | Elige y marca leído | Elegido | — | No mueve el foco al panel. |
| Toque en fila | Celular | Abre el detalle | `page-in` 160 ms | — | — |
| Rueda | Escritorio | Desplaza la lista o el panel según dónde esté el puntero | — | — | Independientes; el panel es `sticky`. |
| Clic derecho | Escritorio | Sin acción propia (menú del navegador) | — | — | No hay menú contextual. |
| Deslizar | Celular | Desplazamiento vertical nativo; la fila de chips se desliza de costado | — | — | No hay gestos de deslizar para archivar o borrar (chocarían con el gesto de atrás del sistema y serían destructivos sin confirmación). |
| ‹ › en el detalle | Celular | Mensaje anterior o siguiente de la vista sin volver a la lista | Reemplaza la entrada del detalle | — | `aria-label` "Mensaje anterior" / "Mensaje siguiente". |

### 7.2 Action Inputs

| Input | Platform | Context (What must be focused) | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|-------------------------------|--------|----------|-----------|-----------|-------|
| Clic / Enter / Espacio / toque | Todas | Opción del selector de alcance | Cambia el alcance | Lista y chips se recalculan; **reemplaza** la entrada del historial | Ninguna | — | `aria-pressed`. La selección se conserva si el elegido sigue en la vista; si no, regla de "selección al entrar". |
| Igual | Todas | Chip de tema | Cambia el tema | Igual | Ninguna | — | `aria-pressed`. **Estado activo (decisión 3, igual en `Seg` y en los chips):** borde de acento, fondo `--accent-soft`, ✓ antes de la etiqueta y texto de color normal (`--text`); nunca texto blanco sobre relleno sólido de acento. |
| Escribir | Teclado | Buscador | Filtra la vista | La lista se filtra a cada tecla (sin esperar) | Ninguna | — | Con menos de 2 letras no filtra. |
| Clic / Enter | Todas | "Marcar N como leídos" | Marca leídos los de la vista | Nota F7 con "Deshacer" | Ninguna | — | — |
| Clic / Enter | Todas | "Marcar como no leído" (encabezado de lectura) | Lo vuelve a sin leer | Fila en negrita; el botón pasa a "Marcar como leído" | Ninguna | — | No se vuelve a marcar leído hasta que se elija de nuevo. |
| Clic / Enter / toque | Todas | **Aceptar** (oferta) | Abre la confirmación F6 | "Confirmar: vender a Pérez por US$ 2,4 M" (primario) y "No"; foco en Confirmar | Ninguna | — | — |
| Igual | Todas | Confirmar venta | `acceptOffer(g, o)` | Estado Resuelto; F7 "Vendiste a Pérez a Racing por US$ 2,4 M." | Ninguna | — | — |
| Igual | Todas | **Pedir más** | `haggle(g, o)` | F7: "Racing mejoró su oferta: ahora US$ 2,8 M." (la decisión sigue abierta, con las cifras nuevas, en la fila del bloque y en el mensaje original) o "Racing se retiró de la negociación." (Resuelto) | Ninguna | — | Sin F6: el riesgo está escrito junto al botón. **Requiere que `haggle` conserve el id de la oferta** (hoy crea una nueva, `career.ts:259`, y el mensaje original queda diciendo "ya fue respondida o venció"; UR-13). Así la clave `offer{id}`, la selección `sel` y el `ref` del mensaje siguen apuntando a la oferta mejorada. Pregunta 13. |
| Igual | Todas | **Rechazar** (oferta) | Abre F6 | "Confirmar rechazo" (peligro) y "No" | Ninguna | — | Resuelve G5 para la bandeja. |
| Igual | Todas | Confirmar rechazo | `rejectOffer(g, o)` | Resuelto; F7 "Rechazaste la oferta de Racing." | Ninguna | — | — |
| Igual | Todas | **Aceptar** (trabajo) | Abre F6 | "Confirmar: dejar Banfield y dirigir Racing" y "No" | Ninguna | — | — |
| Igual | Todas | Confirmar trabajo | `acceptJob(g, clubId)` | Resuelto; F7; el tema del club (A3) cambia | Ninguna | — | — |
| Igual | Todas | **Rechazar** (trabajo) → Confirmar | Función de motor nueva `rejectJob(g, clubId)` | Resuelto; F7 "Rechazaste la oferta de Racing." | Ninguna | — | Hoy la interfaz filtra `g.jobOffers` a mano (sección 8). |
| Igual | Todas | Hablar con él | `nav({ page: 'player', id, tab: 'personal' })` | Ficha | `page-in` | — | — |
| Igual | Todas | Declararlo transferible | Función de motor (`setListed(g, pid, true)`) | Resuelto; F7 "Declaraste transferible a Gómez." más la frase del libro de `vestuario.md` (7.2): abierto, "Las ofertas van a llegar a la bandeja."; cerrado hasta el 25 jun, "Las ofertas van a llegar cuando reabra el libro, el 25 jun."; cerrado desde el 11 ago, "Con el libro cerrado no van a llegar ofertas esta temporada, y la nueva (10 ene) vacía la lista de transferibles." (de `letGoInfo.window`) | Ninguna | — | Reversible desde la ficha: sin F6. Con el libro cerrado, ninguna nota promete ofertas (pregunta 25). |
| Igual | Todas | Responder (prensa) | `openPress()` | `PressModal` (F5) | `pop` 140 ms | — | Al cerrar, foco al botón; si se respondió, Resuelto. |
| Igual | Todas | Que hable el ayudante | `delegatePress(g)` | Resuelto; F7 "Habló el ayudante." | Ninguna | — | — |
| Igual | Todas | Ver el informe del partido / del rival | Abre F5 | Modal | `pop` 140 ms | — | En `ReportModal`, "Aplicar" cambia la táctica (ya existe). |
| Igual | Todas | Ver la ficha, Ver el club, Ofertar, Ir a Tácticas, Ir a Entrenamiento, Ver posiciones, Ir al inicio | `nav()` | Otra pantalla | `page-in` | — | — |
| Igual | Todas | Seguir (ojeo) | Función existente de seguimiento | El botón pasa a alternable "En seguimiento" | Ninguna | — | — |
| Igual | Todas | Siguiente pendiente | Elige el próximo del bloque | Panel con esa decisión; foco en su primario | Ninguna | — | — |
| Igual | Todas | **Aceptar US$ X** (contraoferta) | `acceptCounter(g, dealId)` | La plantilla pasa a "Acuerdo para cerrar" en el lugar (misma clave `deal<id>`, sigue en el bloque); F7 "Aceptaste el pedido de Lanús: US$ 1,6 M. Falta el contrato con Juan Pérez."; foco en "Negociar contrato" (o "Confirmar el préstamo") | Ninguna | — | Sin F6: no se paga nada hasta firmar. Deshabilitado con el motivo si el monto supera lo libre. |
| Escribir + Igual | Todas | **Mejorar** → campo + "Ofertar" (contraoferta) | `placeBid(g, pid, fee, loan)` sobre el mismo trato | "Resuelto"; F7 "Oferta mejorada enviada a Lanús. Responde entre el … y el …." La decisión sale del bloque (el trato vuelve a esperar respuesta, que no es pendiente) | Ninguna | — | Enter en el campo hace lo mismo. Deshabilitado el último día del libro y con un monto ≥ al pedido, con el motivo escrito. Cuando el club conteste, la respuesta es un mensaje nuevo y, si es una decisión, frena el avance otra vez. |
| Igual | Todas | **Retirar la oferta** (contraoferta) | `withdrawBid(g, dealId)` | "Resuelto"; F7 "Retiraste la oferta por Juan Pérez." | Ninguna | — | Sin F6: se puede volver a ofertar (con un trato nuevo). |
| Igual | Todas | **Negociar contrato** / **Seguir negociando** (acuerdo de compra) | `openNegotiation(g, dealId)` y abre `NegotiationModal` (F5) | Modal con los términos y la paciencia guardados | `pop` 140 ms | — | Al cerrar, el foco vuelve al botón; el acuerdo sigue en el bloque si no se firmó. |
| Igual | Todas | **Confirmar el préstamo** → Confirmar | Abre F6 → `signDeal(g, dealId)` | F6 con cargo, plazo y sueldo escritos; confirmado: "Resuelto", F7 "F. Leiva llega a préstamo hasta fin de temporada." | Ninguna | — | Irreversible: F6 (G5). |
| Igual | Todas | **Cancelar el trato** (acuerdo) → Confirmar | Abre F6 → `cancelDeal(g, dealId)` | F6 con el bloqueo de 14 días y el club molesto escritos; confirmado: "Resuelto", F7 "Cancelaste el trato por L. Gómez. No podés volver a ofertar por él hasta el 26 ene." | Ninguna | — | F6 desde la segunda revisión del Mercado: salirse de un acuerdo tiene costo (`mercado.md`, pregunta 46). |
| Igual | Todas | Ver todos los tratos, "Ver la respuesta nueva", "Ver el trato nuevo" | `nav({ page: 'market', tab: 'tratos', sel })` / elige ese mensaje en la lista | Mercado › Tratos, o el mensaje más nuevo elegido (y leído: es un clic a propósito) | `page-in` / ninguna | — | Solo lectura. |
| Esc / "No" / cambiar de selección | Todas | Confirmación F6 abierta | Cancela | Vuelven los botones originales; foco al botón que la abrió | Ninguna | — | — |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Avance en curso (F4) | Botones de decisión deshabilitados (motivo visible); flechas, filtros y lectura siguen | El estado cambia cada día; evitar responder algo que vence en el mismo cuadro. Espacio y Esc frenan (N9). |
| Confirmación F6 abierta | Solo Confirmar, No y Esc en ese bloque; el resto de la pantalla sigue activo; elegir otra fila la cancela | Es una confirmación en el lugar, no una modal. |
| Modal abierta (F5) | La lista y los atajos no reciben teclas | Foco atrapado en la modal (F5). |
| Menú de la barra abierto (N2) | La lista no reacciona a ↑ ↓ | El foco está en el menú (G7). |
| Foco en el buscador | ↑ ↓ no mueven la lista; ↓ con resultados lleva el foco a la primera fila | El campo es de texto. |
| Libro de pases cerrado | "Aceptar" y "Pedir más" (oferta) deshabilitados | Regla del juego (`windowOpen`; `haggle` no negocia con el libro cerrado). |
| Último día del libro | "Ofertar" de Mejorar (contraoferta) deshabilitado con su motivo | La respuesta a la mejora llegaría con el libro cerrado. |
| Foco en el campo Mejorar (≤ 900 px) | La barra de acciones **no cambia de posición** (sigue fija); el bloque Mejorar se desplaza por encima de ella con `scroll-margin-bottom` | Ni la barra ni el teclado virtual tapan el campo (2.4.11, 5.2), y ningún botón de la barra se mueve entre el `mousedown` y el `mouseup` (`mercado.md`, pregunta 39). |
| Resuelto | Las acciones de esa decisión no están | Ya se respondió. |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Decisiones pendientes | `pendingOf(g)` (`Inbox.tsx`; propuesta: moverla a `src/engine/` porque es lógica del juego) | En cada `refresh()` (al entrar, por día de avance, tras cada acción) | Motor (calculado del estado, nunca guardado) | `Pending[]` con `k`, `key` y datos por tipo | Arreglo vacío → "Nada para decidir…" |
| Plazo de una oferta | `Offer.date` + 9 días (`offerDeadline(o)`; es el último día para responder) | Igual | `career.ts` | Fecha ISO | Debe salir de una función del motor (`offerDeadline(o)`), no de una suma en la interfaz como hoy (`addDaysS`) |
| Plazo de un trabajo | `g.jobOffers[].until` | Igual | `career.ts` | Fecha ISO | Sin oferta vigente → texto F2 "La oferta ya no está vigente." |
| Tipo de oferta de trabajo | `g.jobOffers[].kind`: `'mid'` (a mitad de temporada, `managerMarket`) o `'season'` (fin de temporada, `seasonOffers`). **Campo nuevo** (pregunta 15) | Al crearse la oferta | `career.ts` | texto | Partidas viejas sin el campo: `'season'` si `g.seasonOver`, si no `'mid'` |
| Lo que se pierde al aceptar un trabajo | Cantidad de `g.offers`, de las otras `g.jobOffers` y si hay `g.press`, que `acceptJob` descarta; del cuerpo técnico (`g.staff`), el ayudante y el preparador físico se van con el DT y el médico, el scouting y las inferiores quedan en el club anterior | Al mostrar la oferta | `career.ts`: `jobConsequences(g, clubId)`, para que la interfaz no repita la regla de `acceptJob` | `{ offers, jobs, press, staff, follow, staffRoles, followRoles, deals }`; `deals` (nuevo, pregunta 22): los tratos de mercado abiertos (`waiting`, `countered`, `agreed`) con jugador, club y estado, que `switchClub` hace caer | Todo en cero → la línea solo dice lo del cuerpo técnico, si lo hay |
| Decisión de un trato | Pendiente `{ k: 'deal'; key: 'deal<id>'; d: Deal; kind: 'countered' \| 'agreed'; deadline }` en `pendingOf` (nuevo, pregunta 22), uno por trato en `countered` o `agreed` del club actual | En cada `refresh()` | Motor (`src/engine/inbox.ts`; el trato, en `g.deals` de `career.ts`) | `Pending` | Trato que dejó de estar en `countered` o `agreed` → sale del bloque; si estaba elegido, texto de su estado |
| Plazo de un trato | `deal.deadline` (`dealDeadline`: 7 días desde la respuesta del club o el último día del libro, lo que llegue antes; aceptar el pedido conserva el plazo de la contraoferta) | Al llegar la respuesta | `career.ts` | Fecha ISO, último día para responder | Se ordena con los demás pendientes por `deadline` |
| Número de la insignia y de los chips | Pendientes + mensajes del DT sin leer **que no tienen una decisión abierta**. Un mensaje con `act` `offer`, `job`, `out` o `deal` cuya clave sigue en `pendingOf` cuenta solo como pendiente (UR-02). Para `offer`, `deal` y `out`, además, solo puede contar el mensaje **más nuevo** de cada clave (`newestOf`): los viejos no cuentan nunca, y el de vencimiento o caída reemplaza al de la decisión (preguntas 22 y 24). Para `out<pid>`, `decisionKeyOf` reconoce la clave sin `ref` y `pendingKeyOf(g, n)` la da por abierta si el jugador es del DT, quiere irse y no es transferible (pregunta 24) | En cada `refresh()` | Motor (`inboxCount(g)`, `unreadOf`, `pendingKeyOf(g, n)` y `newestOf(g)` en `src/engine/inbox.ts`) | número | 0 → sin insignia |
| Mensajes | `g.news` (`News`: `id`, `date`, `title`, `body`, `tag`, `clubId`, `pid`, `act`, `ref`, `me`, `read`) | Igual | `game.ts` (`news()`), tope de 300–400 | Arreglo más nuevo primero | Vacío → estado "Partida nueva" |
| Alcance de un mensaje | `isMine(g, n)` = `n.me ?? n.clubId === g.userClubId` | Igual | Motor (propuesta: exportarla desde `game.ts`) | booleano | — |
| Tema de un mensaje | Reglas de la tabla de temas (abajo) | Igual | Interfaz (clasificación de presentación) | clave de tema | Sin tema específico → solo en "Todo" |
| Sin leer | `n.read` | Al abrirlo el DT a propósito (regla de leído) o con "Marcar…" | `Game` | booleano | `undefined` = sin leer |
| Jugador | `g.players[pid]` (nombre, puesto, `shown`/D4, edad, `status`, `contractEnd`, `wage`, `value`, `injury`, `happy`, estadísticas) | Igual | `Game` / `squad.ts` | `Player` | No existe → "Ya no está en el fútbol argentino." (en un mensaje `out`, "Ya no está en el plantel.", 5.3) |
| Club | `g.clubs[clubId]` (nombre, división, rep, presupuesto) y posición (`tableOf`) | Igual | `Game` / `game.ts` | `Club` | No existe → tarjeta oculta |
| Libro de pases | `windowOpen(g.date)` | Igual | `career.ts` | booleano | — |
| Partidos que se pierde un lesionado | Fixtures del club del DT entre hoy y hoy + `p.injury.days` | Al mostrar el mensaje | Motor (propuesta: `injuryOutlook(g, pid)` en `game.ts`) | `{ days, back: fecha, matches: n }` | Sin lesión → "Ya está recuperado" |
| Jugadores en su puesto | Plantel propio con el mismo primer puesto | Al mostrar una oferta | `squad.ts` / `positions.ts` | número | — |
| Partido de un resultado | `g.fixtures.find(id === ref)` | Al mostrar | `Game` | `Fixture` | No existe → sin botón de informe |
| Próximo partido (informe del rival) | `nextUserFixture(g)` | Al mostrar | `game.ts` | `Fixture` | Distinto de `ref` → "Ese partido ya se jugó." |
| Conferencia | `g.press` (`kind`, `questions`) | Igual | `week.ts` | objeto o nulo | Nulo → no hay pendiente |
| Alcance y tema elegidos | Ruta (`tab`) + `useSticky('ib.tab')` | Al cambiar | Interfaz (C4, memoria de navegación) | texto | Por defecto `club.todo` |
| Selección | Ruta (`sel`) | Al cambiar | Interfaz | texto | Regla de "selección al entrar" |
| Búsqueda | Estado local | Al escribir | Interfaz (no se recuerda) | texto | Vacío |
| Decisiones resueltas en esta visita | Estado local | Al resolver | Interfaz | lista de claves con su nota | Se descarta al salir |

**Temas** (alcance "Mi club"; en "Todo el fútbol" se aplican las mismas reglas por `tag` sin exigir `isMine`):

| Tema | Regla |
|------|-------|
| Todo | Todos los del alcance |
| Plantel | `tag` `lesion`; `tag` `club` con `pid`; `act` `out` o `train` |
| Mercado | `tag` `mercado` (ofertas, respuestas de los clubes a tus ofertas, caídas y vencimientos de tratos, avisos de cierre del libro, informes de ojeo). Todos los mensajes `act: 'deal'` llevan `tag: 'mercado'` y `me: true` |
| Partidos | `tag` `partido`; `act` `rival` |
| Torneos | `tag` `torneo` o `premio` |
| Dirigencia | `tag` `directiva` (ofertas de trabajo, dirigencia) — tema nuevo; hoy no tiene categoría propia |

**Textos del pendiente `deal`** (pregunta 22): `pendingText` suma "una contraoferta" / "N contraofertas" y "un acuerdo para cerrar" / "N acuerdos para cerrar" ("una conferencia, una oferta por un jugador y una contraoferta"). Fila del bloque: ícono del tema Mercado, remitente "Contraoferta · {club}" / "Acuerdo · {club}" / "Préstamo · {club}", título como en 5.3 y plazo en palabras ("Vence en 5 días", "Vence mañana", "Vence hoy" con "!"). Orden: con los demás pendientes, por `deadline`.

**Freno del avance con un trato** (regla vigente, pregunta 19, ampliada): un `deal<id>` nuevo en `decisionKeys` frena "Ir al partido" y abre la bandeja con esa decisión (también cuando llega la respuesta a una mejora, porque la clave vuelve a aparecer); `expiringKeys` incluye `k === 'deal'`: el último día para responder frena una vez por decisión, también si ese día es el último del libro. Los mensajes sin decisión (rechazos, caídas, vencimientos, avisos de cierre del libro) nunca frenan.

**Contadores de los chips**: mensajes sin leer del alcance "Mi club" en ese tema, con la misma exclusión que la insignia (un mensaje con decisión abierta no suma; de una oferta o un trato, solo el más nuevo). En "Todo el fútbol" los chips no llevan contador. El bloque "Para decidir" lleva su propio número y no suma a los chips.

**Regla**: la pantalla no escribe en `Game` directamente. Hoy sí lo hace en cuatro lugares que este diseño reemplaza por funciones del motor: `n.read = true` (→ `markRead(g, ids, leído)`), `g.jobOffers = … filter` (→ `rejectJob(g, clubId)`), `pl.listed = true` (→ `setListed(g, pid, true)`) y la suma del plazo (→ `offerDeadline`). Ver pregunta abierta 5.

---

## 9. Events Fired

No hay analítica. Toda fila de esta tabla es una llamada al motor seguida de `save()` y `refresh()`.

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Elegir un mensaje a propósito (clic, ↑ ↓, Enter, ‹ ›, o llegar desde un clic en el mosaico del Inicio) | `markRead` (nueva) | `{ ids: [id], read: true }` | `game.ts` | Solo si estaba sin leer. Cambia estado guardado. La selección automática al entrar no lo dispara. |
| Marcar como no leído | `markRead` | `{ ids: [id], read: false }` | `game.ts` | — |
| Marcar N como leídos / Deshacer | `markRead` | `{ ids, read: true }` / `{ ids, read: false }` | `game.ts` | Deshacer usa los mismos `ids` que guardó la nota. |
| Confirmar venta | `acceptOffer` | `(g, o)` | `career.ts` | Irreversible. Mueve al jugador, la plata y borra la oferta. Marca leídos los mensajes de `offer<id>` (pregunta 22). |
| Pedir más | `haggle` | `(g, o)` → booleano | `career.ts` | Puede retirar la oferta. Marca leídos los mensajes de `offer<id>`. |
| Confirmar rechazo de oferta | `rejectOffer` | `(g, o)` | `career.ts` | Irreversible. Marca leídos los mensajes de `offer<id>`. |
| Confirmar trabajo | `acceptJob` | `(g, clubId)` | `career.ts` | Irreversible; cambia `g.userClubId`. Antes, `switchClub` hace caer los tratos de mercado abiertos, con un mensaje por trato que nace leído (la confirmación los nombró; pregunta 22). |
| Aceptar el pedido de un club | `acceptCounter` | `(g, dealId)` → booleano | `career.ts` | `countered` → `agreed`; marca leídos los mensajes del trato. |
| Mejorar una contraoferta | `placeBid` | `(g, pid, fee, loan)` | `career.ts` | Vuelve a esperar respuesta (no es pendiente); marca leídos los mensajes del trato. |
| Retirar la oferta / Cancelar el trato | `withdrawBid` / `cancelDeal` | `(g, dealId)` | `career.ts` | Terminal; marca leídos los mensajes del trato. `cancelDeal` pone además `blockUntil = hoy + 14` y deja molesto al club hasta esa fecha (`mercado.md`, pregunta 46). |
| Negociar contrato | `openNegotiation` | `(g, dealId)` | `career.ts` / `squad.ts` | Abre `NegotiationModal`; marca leídos los mensajes del trato. |
| Confirmar el préstamo | `signDeal` | `(g, dealId)` | `career.ts` | Irreversible; marca leídos los mensajes del trato. |
| Confirmar rechazo de trabajo | `rejectJob` (nueva) | `(g, clubId)` | `career.ts` | Irreversible. |
| Declararlo transferible | `setListed` (nueva) | `(g, pid, true)` | `squad.ts` | Reversible desde la ficha. |
| Que hable el ayudante | `delegatePress` | `(g)` | `week.ts` | Irreversible, bajo costo. |
| Responder | `openPress` (contexto) | — | `App.tsx` → `PressModal` | Sin cambio hasta responder en la modal. |
| Aplicar sugerencias del rival | Ya existe en `ReportModal` (`Object.assign(club.tactic, …)`) | sugerencias | Táctica | Fuera de esta pantalla; mismo problema de escritura directa (anotado, no se resuelve acá). |
| Seguir | Función de seguimiento existente | `(g, pid)` | `squad.ts` | Reversible. |
| Cambiar alcance, tema, búsqueda, selección; abrir fichas e informes | ninguno | — | — | Estado de interfaz o navegación (`nav`), no del juego. |

---

## 10. Transitions & Animations

Principio: rápido siempre (principio 7). Dentro de la bandeja no hay animaciones decorativas.

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|--------------|--------|----------------|---------------------------|
| Entrada a la pantalla | `nav` a `inbox` | `page-in` existente | 160 | ease-out | Sí | Sí — instantáneo |
| Salida | `nav` a otra | Ninguna (la página nueva hace su `page-in`) | 0 | — | — | — |
| Cambio de selección | Clic, flechas | Cambio de contenido en el lugar, sin animación | 0 | — | — | No aplica |
| Desplazar la fila a la vista | Flechas | `scrollIntoView({ block: 'nearest' })` sin `smooth` | 0 | — | — | No aplica (nunca suave) |
| Abrir el detalle (≤ 900 px) | Toque en fila | `page-in` | 160 | ease-out | Sí | Sí — instantáneo |
| Volver a la lista | ◂ Bandeja, Esc, Atrás | Restaura la entrada | 0 | — | — | — |
| Confirmación F6 | Aceptar / Rechazar | Reemplazo de botones | 0 | — | — | No aplica |
| Nota F7 y Resuelto | Acción | Aparece en el lugar | 0 | — | — | No aplica |
| Modales (F5) | Botones de informe y prensa | `fade` + `pop` existentes | 140 | ease-out | No | Sí — instantáneo |
| Ficha breve (I1) | Hover | `hc-in` existente | 120 | ease-out | Sí | Sí |
| Hover de filas y chips | Mouse | Color de fondo | 120 | por defecto | Sí | Sí |

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone (sección 7.1; orden en 12)
- [x] Tab order follows visual reading order (sección 12)
- [x] Every action achievable by mouse is also achievable by keyboard (7.2; incluida la ficha breve, que depende del arreglo de G4 pero no es la única fuente de datos)
- [x] Focus is visible at all times (A2; la fila elegida con foco tiene contorno además del fondo)
- [x] Focus does not escape the screen while it is open — no aplica como trampa (pantalla no modal); las modales que abre sí atrapan (F5)
- [x] Esc key closes or cancels (cancela F6, vuelve a la lista, borra la búsqueda; nunca sale del juego)

**Gamepad** — fuera de alcance para el proyecto (`design/accessibility-requirements.md`, AM-10). No se completa.

**Mouse**
- [x] Hover states defined for all interactive elements (filas, chips, botones, tarjetas)
- [x] Clickable hit targets are at minimum 32x32px (filas ≥ 52 px de alto; chips y botones chicos ≥ 32 px de alto en escritorio)
- [x] Right-click behavior defined (sin acción propia)
- [x] Scroll wheel behavior defined in all scrollable zones

**Touch**
- [x] All touch targets are minimum 44x44px (filas, chips, botones de la barra de acciones, ◂ Bandeja, ‹ ›; los botones chicos de escritorio crecen en ≤ 760 px)
- [x] Swipe gestures do not conflict with system-level swipe navigation (no hay gestos propios)
- [x] All actions achievable with one hand in portrait orientation (acciones en la barra fija inferior; primario a todo el ancho)
- [x] Long-press behavior defined (sin acción propia; la ficha breve en táctil queda sujeta a la pregunta de G4)

---

## 12. Accessibility

Nivel **Estándar**. Requisitos de `design/accessibility-requirements.md` que la bandeja tiene que cumplir: AV-01, AV-02 (resueltos por la regla global de tinta y acento ajustado de la decisión 1; ver la tabla de contraste), AV-03, AV-04, AV-06, AV-07, AV-08, AV-09, AV-13; AM-01, AM-02, AM-03 (no sumar atajos de una tecla), AM-07 (modales), AM-09; AC-02, AC-03, AC-05, AC-06, AC-07, AC-09.

**Cómo resuelve la bandeja los huecos de la biblioteca**

| Hueco | Resolución en la bandeja | ¿Depende de un arreglo global? |
|-------|--------------------------|-------------------------------|
| G1 (Espacio con un control enfocado avanza el día) | Espacio activa el botón, chip, segmentado o "Mostrar más" enfocado. Sobre una fila de la lista (`role="option"`) sigue siendo Continuar a propósito (decisión 2, resuelta), porque la opción no tiene función propia con Espacio; abrir es Enter | Sí: la guarda de `App.tsx` (AM-02) |
| G3 (pestañas y segmentados sin ARIA) | Los filtros dejan de ser pestañas: son grupos de botones con `aria-pressed` (alcance: `role="group"` con `aria-label="Alcance"`; temas: `aria-label="Tema"`). La lista es `role="listbox"` con `aria-label="Mensajes"` y filas `role="option"` con `aria-selected`; el bloque de pendientes es un `role="group"` con nombre dentro del listbox. "Mostrar más" va **fuera** del listbox. La nota F7 lleva `role="status"`. Las modales, `aria-labelledby` | `Seg` necesita `aria-pressed` y el estado activo nuevo (G3, decisión 3); `Modal`, `aria-labelledby` |
| G4 (ficha breve sin teclado ni toque) | Ningún dato de decisión depende de la ficha breve: las tarjetas del panel muestran puesto, valoración, edad, rol, contrato y valor | Mostrar I1 con el foco es el arreglo global |
| G5 (destructivas sin confirmación) | F6 en Aceptar y Rechazar de ofertas y de trabajos, y en Confirmar el préstamo de un acuerdo (el fichaje de una compra se confirma con F6 dentro de la negociación). F6 también en Cancelar el trato (tiene costo: 14 días sin ofertar por el jugador y el club molesto). Sin F6: Pedir más (riesgo escrito), Aceptar US$ X, Mejorar y Retirar la oferta (no se paga nada hasta firmar), Que hable el ayudante, Declararlo transferible y Marcar como leídos (reversibles o de bajo costo) | No |
| G6 (pestañas que apilan historial) | Alcance, tema y selección reemplazan la entrada; solo abrir el detalle en ≤ 900 px apila | Sí: la regla de reemplazo de `nav` (`App.tsx`) para la misma `page` sin `id` |
| G7 (↑ ↓ con un menú abierto; el foco no sigue) | Oyente en la lista, no en `window`; respeta `defaultPrevented`; el foco sigue a la selección | No |
| G9 (filtro del mosaico del Inicio sin `useSticky`) | Fuera de esta pantalla. La bandeja usa `useSticky` para alcance y tema | — |

**Text contrast requirements for this screen**:

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Título de fila (sin leer y leído) `--text` / `--dim` | `--panel` | 4,5:1 | 14,64 / 6,99 | [x] |
| Título de fila elegida | `--accent-soft` sobre `--panel`, para los 86 clubes | 4,5:1 | TBD (calcular con el script de AV-01) | [ ] |
| Remitente (`.msg-from`) y encabezado de día (`.msg-day`) `--dim` | `--panel` / `--panel2` | 4,5:1 | 6,99 / TBD | [ ] |
| Plazo en advertencia `--warn` | `--panel` / fila elegida | 4,5:1 | 9,30 / TBD | [ ] |
| `--faint` en cualquier texto de la bandeja | `--panel3` | 4,5:1 | **4,05 (falla)** | [ ] — prohibido: no usar `--faint` sobre `--panel3` (hover o elegida) |
| Texto del chip activo y del segmento activo (`Seg`) | `--accent-soft` con borde de acento y ✓ (decisión 3); texto `--text`, no blanco sobre acento sólido | 4,5:1 | TBD: `--text` #f1f2fa contra `--accent-soft` sobre `--panel`, calcular para los 86 clubes. El patrón anterior (`.seg button.on`, 2,45:1) desaparece | [ ] — cambio global de `Seg` (ui-programmer) |
| Contador del chip | `--panel2` / `--panel3` | 4,5:1 | TBD | [ ] |
| Botón primario (Aceptar, Responder, Siguiente pendiente…), también CTA y todo texto sobre el acento | Acento del club | 4,5:1 | Hoy: 1,77 con el acento por defecto; < 4,5 en 83 de 86 clubes. **Resuelto por regla (decisión 1):** se conserva el color del club; el juego elige tinta clara u oscura por contraste WCAG y, si ninguna llega a 4,5:1, desplaza el acento (más oscuro o más claro) hasta que llegue. Resultado esperado: ≥ 4,5:1 en los 86 clubes | [ ] — **arreglo global, alcance del ui-programmer** (`clubTheme` e `ink` en `common.tsx`, `.btn.primary`, `.btn.cta`, `.mb-clock.live`, etc.); la bandeja solo hereda. Se tilda al correr el script de AV-01 sobre los 86 clubes |
| Botón de peligro `#ff8a95` | `--panel` | 4,5:1 | TBD | [ ] |
| Nota F7 de error `--bad` | `--panel` (nunca `--panel3`) | 4,5:1 | 5,47 | [x] |
| Marca de sin leer (no texto) | `--panel` | 3:1 | TBD | [ ] — respaldada por negrita y `aria-label` |
| Anillo de foco | `--panel` y fila elegida | 3:1 | ≥ 3,34 sobre `--panel` | [ ] sobre la fila elegida: TBD |

**Tamaños mínimos (AV-04)**: título de fila y cuerpo ≥ 14 px; remitente, encabezado de día, plazo, contadores y chips ≥ 12 px (hoy `.msg-from` mide .72rem = 10,1 px, `.tabs .cnt` .68rem = 9,5 px e `.ib-sep` .66rem: los tres quedan reemplazados o se suben a .86rem). Nada por debajo de 11 px. Con el texto al 120 % (y al 150 % cuando exista), la lista no corta el título en más de una línea con elipsis y el panel no se superpone.

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Bloque y filas pendientes (barra ámbar) | Todos | Encabezado "Para decidir · N", ícono "!" y plazo en texto |
| Sin leer (punto de acento) | Todos; acentos de club de bajo contraste | Negrita del título y `aria-label="Sin leer"` |
| Plazo corto en advertencia | Todos | "Vence hoy", "Vence mañana" en palabras |
| Diferencia de la oferta (verde o rojo si se colorea) | Rojo-verde | Signo, porcentaje y "sobre/bajo su valor" |
| Resultado (marcador en `good`/`bad`) | Rojo-verde | "Victoria", "Empate" o "Derrota" en texto |
| Chip o segmento activo | Todos | Borde de acento, fondo suave, ✓ y `aria-pressed` (AV-13); no depende del tono |
| Fila elegida (fondo de acento suave) | Todos | Borde izquierdo de 3 px y `aria-selected` |
| Tono de atributos en el informe de ojeo | Rojo-verde | Número siempre visible (D6); cubierto por `.cvd` |
| Estado Resuelto (tono tenue) | Todos | "✓ Resuelto" en texto |

**Focus order** (escritorio):

1. Enlace para saltar al contenido (global, AM-08) → `#main`
2. "Entendido" de la ayuda O2 (si está)
3. Buscador
4. "Marcar N como leídos" (si está)
5. Selector de alcance (una parada; ← → entre opciones)
6. Fila de chips de tema (una parada; ← → entre chips)
7. Lista (una parada: la fila elegida; ↑ ↓ Inicio Fin Re Pág Av Pág adentro). El `listbox` **no contiene botones**
8. "Mostrar más" (si hay más filas; **parada propia justo después de la lista**, fuera del `listbox`)
9. Panel de lectura: "Marcar como no leído" → tarjeta del jugador → tarjeta del club → botones de acción en orden visual → "Siguiente pendiente" (si está) → botones dentro de la nota F7 ("Deshacer")
10. Sigue a la barra inferior del documento (no hay ciclo dentro de la pantalla: no es modal)

Enter en la lista abre el mensaje: salta al primer botón de acción del punto 9 (o al título del panel si ese primario decide sin F6, 7.1); Esc desde el punto 9 vuelve al 7. En el detalle del celular: ◂ Bandeja → ‹ › → título → tarjetas → cuerpo (no enfocable) → barra de acciones.

**Screen reader announcements for key state changes** (alcance barato que permite el nivel Estándar; el lector de pantalla completo es del nivel Completo):

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Foco en una fila de decisión | "Para decidir. Oferta, Racing Club. Racing ofrece 2,4 millones de dólares por Juan Pérez. Vence en 3 días." / "Para decidir. Contraoferta, Lanús. Pide 1,6 millones de dólares por Juan Pérez. Vence en 5 días." / "Para decidir. Acuerdo, Lanús. Aceptó 1,4 millones por Juan Pérez. Falta el contrato. Vence en 7 días." (nombre accesible de la opción) | Al llegar el foco |
| Foco en una fila de mensaje | "Sin leer. Parte médico, Lucas Díaz. Díaz se lesionó en la práctica. Hoy." | Al llegar el foco |
| Cambio de alcance o tema | "Mercado. 4 mensajes, 1 sin leer." (región `aria-live="polite"` del encabezado de la lista) | Al cambiar |
| Búsqueda | "6 mensajes con «Pérez»." / "Ningún mensaje contiene «Pérez» en esta vista." | 500 ms después de la última tecla |
| Confirmación F6 abierta | El foco cae en "Confirmar: vender a Juan Pérez por 2,4 millones de dólares"; se lee el botón | Al abrir |
| Resultado de una acción | El texto de la nota F7 (`role="status"`) | Al aparecer |
| Sin pendientes al resolver el último | "Nada para decidir. Podés seguir con Continuar." | Tras la nota F7 |

**Cognitive load assessment**: cinco flujos a la vez: (1) cuántas decisiones quedan, (2) qué filtro está puesto, (3) dónde está en la lista, (4) el contenido del elegido, (5) las acciones posibles. Dentro del 7 ± 2. Mitigaciones: el bloque "Para decidir" no cambia con los filtros (el flujo 1 no depende del 2); las cifras que deciden van en `.kpi` antes del cuerpo; cada acción con riesgo dice su consecuencia en su propia etiqueta; "Siguiente pendiente" saca al jugador de tener que buscar el próximo.

---

## 13. Localization Considerations

Un solo idioma (español rioplatense); no hay traducción prevista ni RTL. Lo que rompe la disposición son los nombres reales largos y los formatos. "Max Characters" es lo que entra sin cortar a 1440 px con texto al 100 %.

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| Título de fila | ~45 (es) | 48 en la lista (una línea) | — | No aplica | Elipsis; el título completo en el panel y en el nombre accesible | Medio — "Oferta de Club Atlético Independiente Rivadavia por …" |
| Remitente + entidad | ~25 | 34 | — | No aplica | Elipsis en la entidad, nunca en el remitente | Medio |
| Chips de tema | 4–10 ("Dirigencia") + contador | 14 | — | No aplica | Fila desplazable de costado; nunca se abrevian | Bajo |
| Alcance "Todo el fútbol" | 14 | 16 | — | No aplica | — | Bajo |
| Etiqueta F6 "Confirmar: vender a {jugador} por {monto}" | ~45 | 60 en escritorio; en celular, dos líneas | — | No aplica | Ajusta en dos líneas dentro del botón; nunca elipsis (es la consecuencia) | Alto — nombres largos |
| Etiqueta F6 "Confirmar: {jugador} llega a préstamo hasta fin de temporada, cargo {monto}, cobra {monto} por mes" | ~90 | 100 en escritorio; hasta tres líneas en la barra del celular | — | No aplica | Ajusta dentro del botón; nunca elipsis | Alto |
| Línea de tratos que se caen en la oferta de trabajo | ~180 | Sin límite | — | No aplica | Ajusta; con más de 3 tratos, nombra 3 y "y N más" | Medio |
| "Confirmar: dejar {club} y dirigir {club}" | ~50 | Igual | — | No aplica | Usa `club.short` si el nombre completo pasa de 60 | Alto |
| Título del panel | ~60 | Sin límite | — | No aplica | Ajusta en varias líneas | Bajo |
| Montos | "US$ 2,4 M" | 12 | — | No aplica | `money()` existente, formato es-AR | Bajo |
| Fechas | "sáb 14 nov" / `fmtDate` | 20 | — | No aplica | Sin año en la lista; con año en el panel | Bajo |
| Estados vacíos por tema | ~110 | Sin límite | — | No aplica | Ajusta | Bajo |

Textos de estado vacío por tema (alcance "Mi club"): Plantel: "Sin novedades del plantel. Acá llegan las lesiones, los pedidos de los jugadores y los informes de entrenamiento." · Mercado: "Todavía no hay mensajes de mercado de tu club. Acá llegan las ofertas por tus jugadores y los informes del scouting." · Partidos: "Los resultados y el informe del próximo rival llegan acá; el informe, unos días antes del partido." · Torneos: "Las noticias de tus torneos y los premios aparecen acá." · Dirigencia: "Acá llegan los mensajes de la dirigencia y las ofertas de otros clubes."

---

## 14. Acceptance Criteria

**Performance**
- [ ] Con 400 mensajes en `g.news`, la pantalla dibuja el primer cuadro en menos de 100 ms desde el clic en Bandeja (perfil de rendimiento del navegador, CPU sin limitar).
- [ ] Cambiar la selección con ↓ actualiza el panel en menos de 50 ms, sostenido apretando la tecla durante 3 s sin cuadros perdidos visibles.
- [ ] Escribir en el buscador filtra a cada tecla sin demora perceptible (< 50 ms por tecla con 400 mensajes).

**Propósito de la pantalla**
- [ ] Con 2 decisiones pendientes y el tema "Torneos" elegido, el bloque "Para decidir · 2" se ve arriba de la lista sin desplazar, a 1440 × 900 y a 360 × 740.
- [ ] Con 0 pendientes, la lista empieza con "Nada para decidir. Podés seguir con Continuar."
- [ ] Las decisiones del bloque están ordenadas por plazo, con la conferencia primero.
- [ ] Desde la entrada por el botón de pendientes, aceptar una oferta toma 2 clics (Aceptar, Confirmar) y rechazarla también; ninguna de las dos se ejecuta con un solo clic.
- [ ] Tras confirmar una decisión, el panel muestra la nota de resultado y, si quedan pendientes, "Siguiente pendiente" con el foco puesto; el panel no salta a otro mensaje por su cuenta.
- [ ] Con una oferta nueva por un jugador (mensaje sin abrir y pendiente), la insignia de Bandeja dice 1, no 2.
- [ ] Entrar a la bandeja con 3 mensajes sin leer y sin tocar nada deja el contador de sin leer en 3; el mensaje elegido solo sigue en negrita y con su punto. Apretar ↓ y volver con ↑ lo marca leído.
- [ ] Después de un "Pedir más" con éxito, el mensaje original de la oferta muestra el monto nuevo con Aceptar, Pedir más y Rechazar (no "ya fue respondida o venció").
- [ ] Una oferta de trabajo de fin de temporada dice que se pierde al comenzar la temporada; una de mitad de temporada dice que el cambio es desde mañana. Las dos muestran cuántas ofertas por jugadores y de otros clubes se cancelan al aceptar.
- [ ] El pendiente "quiere irse" dice que no vence; la conferencia dice que si seguís sin responder habla el ayudante.
- [ ] Pedido de salida (pregunta 24): con un pedido nuevo, la insignia sube 1 (no 2: el mensaje no cuenta aparte mientras el pendiente esté abierto). Resolverlo con "Declararlo transferible" acá, con una charla o el botón en el Vestuario o la ficha, con la acción masiva de la tabla, renovándolo o vendiéndolo al aceptar una oferta (`acceptOffer`), de un club argentino **o del exterior**: el pendiente sale de "Para decidir", su mensaje queda leído y la insignia baja 1. Si se cierra sin decisión del DT sobre él (cláusula, préstamo, libre, retiro, o el DT cambia de club), el mensaje sin leer cuenta 1 como mensaje común y dice "Ya no está en el plantel." sin acciones y sin "Ya no está en el fútbol argentino.". El mensaje "{nombre} sigue queriendo irse" de la nueva temporada no llega a quien se retira, se va libre o vuelve de un préstamo en el mismo cambio. "Quitar de transferibles" lo vuelve a poner en "Para decidir" con su mensaje leído (cuenta 1). Con dos mensajes del mismo jugador, solo el más nuevo cuenta y ofrece acciones; el viejo dice "Ya respondiste este pedido."
- [ ] Con la charla de la semana ya usada, la decisión "quiere irse" tiene "Declararlo transferible" como primario, la nota con la fecha de la próxima charla y la comparación con "(charla, desde el {fecha})"; no hay un "Hablar con él" deshabilitado. A préstamo, no hay acción y el texto dice por qué. Con el libro cerrado, la comparación dice la fecha en que abre y no promete ofertas antes.
- [ ] Al comenzar la temporada, un jugador que estaba en la lista y sigue queriendo irse aparece en "Para decidir" con el mensaje nuevo "{nombre} sigue queriendo irse" sin leer; la insignia suma 1 por él.
- [ ] "Armar la reserva" del mensaje de reserva abre el Vestuario en el modo "Armar la reserva".
- [ ] Cada tipo de la tabla de plantillas (oferta, contraoferta, acuerdo para cerrar, mensaje de un trato, trabajo, quiere irse, conferencia, lesión, resultado, ojeo, rival, entrenamiento, temporada) muestra las tarjetas, cifras y acciones de esa tabla.
- [ ] Una lesión muestra los días que faltan hoy (no los del mensaje), la fecha de vuelta y cuántos partidos del club se pierde.

**Decisiones de un trato** (pregunta 22)
- [ ] Una contraoferta y un acuerdo para cerrar aparecen en "Para decidir" con su fila ("Contraoferta, Lanús. Pide US$ 1,6 M por Juan Pérez. Vence en 5 días.") y su plazo, ordenados por plazo con los demás, y muestran las cifras y acciones de sus plantillas de 5.3; `pendingText` los nombra.
- [ ] Un trato pendiente cuenta 1 en la insignia de Bandeja (no 2) aunque su mensaje no se haya abierto; aceptar el pedido de una contraoferta la pasa a "Acuerdo para cerrar" en el lugar, con la misma clave, y sigue contando 1.
- [ ] La respuesta de un club que es una decisión frena "Ir al partido" y abre la bandeja con ella elegida; el último día para responderla frena una vez, también si es el último día del libro. Un rechazo, una caída, un vencimiento o un aviso de cierre del libro no frenan.
- [ ] Resolver una oferta o un trato en Mercado › Tratos (Aceptar, Pedir más, Rechazar; Aceptar US$ X, Mejorar, Retirar la oferta, Cancelar el trato, firmar) no sube la insignia de la Bandeja: la deja en N − 1 si la decisión se cierra y en N si sigue abierta (Aceptar US$ X pasa a acuerdo; Pedir más con éxito), nunca en N + 1; sus mensajes figuran leídos al entrar a la bandeja. Aceptar una de dos ofertas por el mismo jugador la deja en N − 2 (la otra se cancela con su mensaje leído). Elegir un trato en Tratos sin resolverlo no marca leído ningún mensaje.
- [ ] Un trato con varios mensajes que vence sin que el DT abra ninguno suma 1 (el vencimiento), no 2 ni 3; una oferta por un jugador que vence sin abrirse suma 1 (el mensaje de vencimiento, ahora con `act: 'offer'`), no 2.
- [ ] Un mensaje que no es el más nuevo de su oferta o trato no muestra acciones: muestra el texto de su estado y, si corresponde, "Ver la respuesta nueva" o "Ver el trato nuevo"; el mensaje de un rechazo nunca muestra las acciones de una oferta nueva por el mismo jugador.
- [ ] "Confirmar el préstamo" pide F6 con cargo, plazo y sueldo escritos (el sueldo como rango por debajo de 95 % de conocimiento); "Cancelar el trato" pide F6 con el bloqueo y el club molesto escritos; "Negociar contrato" abre la negociación sobre la bandeja y, al cerrarla, el foco vuelve al botón; la paciencia se lee en palabra, nunca como número, y no aparece antes de la primera apertura de la mesa.
- [ ] El chip de la fila de un mensaje de trato que no es la decisión vigente dice "Trato"; el de un trato podado del registro muestra "Este trato ya no figura en el historial." con solo "Ver la ficha".
- [ ] El "pedido de sueldo" del informe de ojeo es el mismo número que el sueldo que pediría del `BidBox` y que el primer pedido del representante por ese jugador el mismo día.
- [ ] Con tratos de mercado abiertos, la confirmación de "Aceptar" una oferta de trabajo nombra los que se caen; al confirmar, llegan sus mensajes ya leídos y ninguno queda como pendiente.
- [ ] **Detalle ≤ 900 px** (`tests/ui/bandeja.cjs`, a 820 × 1000, 390 × 844 y 320 × 568): con una contraoferta, la barra fija tiene solo "Aceptar US$ X" y "Retirar la oferta"; con un acuerdo, solo el primario y "Cancelar el trato"; el campo Mejorar, su "Ofertar", sus avisos, el impacto, "Ver todos los tratos" y "Ver la ficha" están en el contenido; `elementFromPoint` en el centro de cada uno devuelve el propio control con el foco en él, y ninguno queda debajo de la barra. Con el foco en el campo Mejorar, el campo y su "Ofertar" quedan por encima de la barra.
- [ ] **La barra no se mueve bajo el puntero** (a 820 × 1000, 390 × 844 y 320 × 568, con una contraoferta): con el foco en el campo Mejorar y un monto escrito, el `position` de la barra y la caja de "Aceptar US$ X" y "Retirar la oferta" son los mismos antes, durante y después del foco en el campo; un clic de mouse y un toque en "Aceptar US$ X" ejecutan `acceptCounter`, y desde el mismo estado, en "Retirar la oferta", `withdrawBid`.

**Navegación**
- [ ] Si el avance se frena por una oferta nueva, la bandeja abre con **esa** oferta elegida.
- [ ] Clic en un mensaje del mosaico del Inicio abre la bandeja con ese mensaje elegido.
- [ ] Cambiar tres veces de tema y apretar Atrás una vez vuelve a la pantalla anterior a la bandeja (no recorre los temas).
- [ ] Abrir una ficha desde una tarjeta y volver deja el mismo alcance, tema, selección y scroll de la lista.
- [ ] En 360 px, tocar un mensaje abre el detalle; el Atrás del navegador y "◂ Bandeja" vuelven a la lista con el foco en esa fila.
- [ ] `tab: 'pend'` y los valores viejos (`me`, `all`, `partido`, `torneo`) abren la vista equivalente sin error.

**Estados vacíos y errores**
- [ ] Cada tema vacío muestra su texto de la sección 13; la búsqueda sin coincidencias muestra "Ningún mensaje contiene «x» en esta vista." con "Borrar búsqueda".
- [ ] Una oferta que vence mientras está elegida reemplaza sus botones por "Esta oferta ya fue respondida o venció." sin errores en la consola.
- [ ] Un mensaje de un jugador que ya no existe muestra "Ya no está en el fútbol argentino." y no muestra acciones sobre él; si el mensaje es `out`, muestra solo "Ya no está en el plantel." (pregunta 25).

**Teclado e interacción**
- [ ] Con un menú de la barra superior abierto, ↑ ↓ mueven solo el menú; la selección de la lista no cambia.
- [ ] Con el foco en un botón del panel, Espacio activa ese botón y no avanza el día (requiere AM-02).
- [ ] La lista es una sola parada de Tab; ↑ ↓ mueven foco y selección juntos; Enter lleva el foco al botón primario (al título del panel si el primario decide sin F6); Esc lo devuelve a la fila.
- [ ] Con la decisión "quiere irse" y la charla usada, Enter sobre la fila deja `document.activeElement` en el título del panel de lectura, un segundo Enter no cambia `p.listed`, el siguiente Tab llega a la tarjeta del jugador y el que sigue a "Declararlo transferible" (pregunta 25, revisada en la fase 5).
- [ ] Esc con una confirmación abierta la cancela y deja el foco en el botón que la abrió.
- [ ] La pantalla no agrega ningún atajo de una sola tecla nuevo (revisión de `SHORTCUTS` y de los oyentes de `Inbox.tsx`).
- [ ] Ninguna llamada de la pantalla asigna propiedades de `g` directamente (revisión de código: `n.read =`, `g.jobOffers =`, `.listed =` no aparecen en `src/ui/Inbox.tsx`).

**Accesibilidad**
- [ ] Ningún texto de la pantalla queda por debajo de 12 px al 100 % (salvo los de 11 px permitidos que no sean contadores ni remitentes), medido con el inspector.
- [ ] Todo texto pasa 4,5:1 con el acento de los 86 clubes, incluido el botón primario: el script de AV-01 sobre `db.json` no informa ningún club por debajo de 4,5:1 con la regla de tinta por contraste WCAG y acento ajustado (depende del arreglo global de la decisión 1).
- [ ] El estado activo del selector de alcance y de los chips muestra borde de acento, fondo suave, ✓ antes de la etiqueta y texto de color normal; no hay texto blanco sobre relleno sólido de acento (inspector, con 3 clubes de acento claro, medio y oscuro).
- [ ] "Mostrar más" no es descendiente del elemento `role="listbox"`; es la siguiente parada de Tab después de la lista, y Espacio lo activa sin avanzar el día.
- [ ] Con el foco en una fila, Espacio avanza el día (Continuar) y Enter pasa el foco al botón primario del mensaje (o al título del panel, si el primario decide sin F6).
- [ ] Con el modo para daltonismo y la emulación de deuteranopía, pendientes, sin leer, elegido, chip activo, plazo corto y resultado se distinguen por texto, forma o peso.
- [ ] axe-core no informa infracciones A/AA en la bandeja con pendientes, con un mensaje elegido y en el detalle del celular.
- [ ] Los filtros exponen `aria-pressed`; la lista, `role="listbox"` con `aria-selected`; la nota de resultado, `role="status"`.
- [ ] Con movimiento reducido, la entrada a la pantalla y al detalle son instantáneas.
- [ ] En 360 px, todos los objetivos táctiles miden al menos 44 × 44 px (filas, chips, acciones, volver).

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 1. Sumar `sel?: string` a `Route` (`src/store.ts`) para guardar la selección (los pendientes no tienen id numérico). Alternativa: darles id a los pendientes. | ui-programmer + usuario | Antes de implementar | **Resuelto**: se agrega `sel?: string` opcional a `Route` (decidido por el orquestador con la recomendación del ux-designer). Aplicado en la sección 4. |
| 2. ¿Espacio sobre una fila de la lista hace Continuar? | usuario | Antes de implementar | **Resuelto**: sí, Espacio sigue siendo Continuar sobre una fila; Enter abre el mensaje. Aplicado en 7 (decisión de teclado), 7.1 y 12. |
| 3. Sumar a `design/ux/interaction-patterns.md` el patrón "Filtro con chips y contador" (C5) y la variante de F1 con `listbox`, bloque "Para decidir", agrupación por día y estado "Resuelto". Esta especificación no toca ese archivo. | ux-designer | Con la implementación | Pendiente |
| 4. Contraste del botón primario sobre el acento del club (AV-01/AV-02, `design/accessibility-requirements.md`, pregunta 1). | usuario + art-director | Antes de dar por cumplido el nivel Estándar en la bandeja | **Resuelto**: se conserva el color del club; el juego elige tinta clara u oscura por contraste WCAG y, si ninguna llega a 4,5:1, desplaza el acento (más oscuro o más claro) hasta que llegue. Vale para `.btn.primary`, el CTA y todo texto sobre el acento. Es un arreglo global del ui-programmer; la bandeja solo lo hereda. Aplicado en la tabla de contraste de la sección 12. Queda abierto verificarlo con el script sobre los 86 clubes. |
| 5. Funciones del motor nuevas: `markRead`, `rejectJob`, `setListed`, `offerDeadline`, `injuryOutlook`, `jobConsequences`, `inboxCount`; mover `pendingOf` e `isMine` a `src/engine/`. Cambios a funciones existentes: `haggle` conserva el id (pregunta 13), `jobOffers[].kind` (15), mensaje de vencimiento (14) y `me: true` en dos noticias (16). Desde la pregunta 22: pendiente `deal` en `pendingOf`, `pendingText`, `decisionKeys` y `expiringKeys`; `newestOf(g)`; `pendingKeyOf(g, n)` (recibe `g`); `readDecisionNews(g, key)` dentro de las funciones que resuelven; noticias que nacen leídas; `jobConsequences.deals`; `act: 'offer'` en el vencimiento de una oferta (las funciones del trato están en `mercado.md`, sección 9). | ui-programmer (con lead-programmer) | Antes de implementar | Pendiente |
| 6. `save()` no informa si falla IndexedDB; el estado "Error al guardar" lo necesita. | ui-programmer | Con la implementación | Resuelta (2026-11-14): `save()` devuelve `Promise<boolean>`, `lastSaveError` en el contexto y la nota F7 en `--bad` tras la decisión |
| 7. Textos del motor que contradicen la acción en el mensaje: la oferta dice "desde la pantalla de Mercado" (`career.ts:339`) y el pedido de salida "desde el Vestuario" (`squad.ts:83`). Proponer "Podés responder desde este mensaje." También los plazos (UR-10): la oferta dice "vence en una semana" y vence a los 8 días; la oferta de trabajo dice "Tenés una semana" y vence a los 6 (mitad de temporada) o a los 20 días (fin de temporada). El texto debe salir del mismo plazo que usa el motor. | usuario (texto) + gameplay-programmer | Con la implementación | Pendiente |
| 8. AC-02: el avance no frena antes de que venza una decisión ya pendiente. La bandeja muestra el plazo, pero la protección completa es de F4. Recomiendo frenar el avance el día anterior al vencimiento. | usuario + ui-programmer | Con AC-02 | **Resuelto (fase 5, decisión del usuario)**: ver la pregunta 19. |
| 9. Icono de fila: esta especificación usa siempre el ícono redondo por tema (como el mosaico del Inicio) y lleva cara y escudo al panel. Confirmar con el art-director que se pierde la cara en la lista a cambio de coherencia con el Inicio. | art-director + usuario | Antes de implementar | Pendiente |
| 10. Estado activo de `Seg` (C1) y de los chips; hoy `Seg` usa texto blanco sobre acento (2,45:1). | art-director + ui-programmer | Antes de implementar | **Resuelto**: borde de acento, fondo suave de acento y ✓ antes de la etiqueta, texto de color normal; nunca texto blanco sobre relleno sólido de acento. Vale para `Seg` en todas las pantallas y para los chips. Aplicado en 5.3, 7.2, 12 y 14. Pendiente de ejecución: actualizar C1 en `design/ux/interaction-patterns.md` y migrar los `.seg` armados a mano (ui-programmer, fuera de esta pantalla). |
| 11. Revisión de /ux-review (aviso): "Mostrar más" dentro del `listbox` no se alcanza con flechas. | ux-designer | — | **Resuelto**: es un botón fuera del `listbox`, parada de Tab propia justo después de la lista. Aplicado en 5.2, 5.3, 7.1 y 12 (orden de foco). |
| 12. Segunda revisión: ¿la selección automática al entrar marca leído? (UR-22) | usuario | Antes de implementar | **Resuelto (opción a)**: solo se marca leído lo que el DT abre a propósito (clic, toque, ↑ ↓, Enter, ‹ ›, clic en el mosaico del Inicio). Aplicado en 4, 6 (regla de leído), 8, 9 y 14. |
| 13. Segunda revisión: "Pedir más" con éxito cambia el id de la oferta (`career.ts:259`) y el mensaje original queda como respondido (UR-13). | gameplay-programmer | Antes de implementar | **Resuelto en el diseño**: `haggle` conserva `o.id` y cambia el monto en el lugar. El id nuevo de hoy cumple una función: cambia el azar (`hash(o.id, p.id)`) del siguiente "Pedir más". Para no perderla, la oferta suma un contador de pedidos (`o.asks`) que entra en el azar (`hash(o.id * 31 + asks, p.id)`), así un segundo pedido no repite el resultado del primero. Aplicado en 7.2 y 14. Pendiente de ejecución en el motor. |
| 14. Segunda revisión: lo que vence sin respuesta no deja rastro (UR-36). | gameplay-programmer | Con la implementación | **Resuelto en el diseño**: al vencer una oferta (`marketTick`) o una oferta de trabajo, el motor emite "Venció la oferta de {club} por {jugador}" / "Venció la oferta de {club} para dirigir" con `pid`, `ref` y `me: true`, tema Mercado o Dirigencia, sin `act`. Aplicado en 6. El freno del avance antes del vencimiento sigue en la pregunta 8. **Ajuste del 2026-11-14 (pregunta 22):** el de la oferta por un jugador pasa a llevar `act: 'offer'` (con el mismo `ref`), para que reemplace en el conteo al mensaje de la oferta; el de la oferta de trabajo queda sin `act`. |
| 15. Segunda revisión: las ofertas de trabajo no dicen si son de mitad o de fin de temporada, y las de fin de temporada se pierden en silencio al apretar "Comenzar temporada" (UR-16; `carrera-del-dt.md`). | gameplay-programmer + usuario | Antes de implementar | **Resuelto en el diseño**: campo `kind` en `g.jobOffers` y textos de plazo y consecuencias por tipo (5.3, 8, 14). Fuera de esta pantalla: "Comenzar temporada" del Inicio debería avisar si quedan ofertas de trabajo sin responder (anotado para la pantalla de fin de temporada). |
| 16. Segunda revisión: la venta de un jugador propio a un club argentino (`career.ts:228`) y "Base de jugadores actualizada" no llevan `me` y quedan fuera de "Mi club" (UR-27). | gameplay-programmer | Con la implementación | Pendiente: emitir las dos con `me: true`. |
| 17. Segunda revisión: diferencias a propósito con `design/gdd/comunicacion-y-bandeja.md`. UR-06 nombra la pestaña "Pendientes", que acá se reemplaza por el bloque "Para decidir" siempre arriba (con `tab: 'pend'` como compatibilidad). UR-35 (Continuar con una conferencia abierta avisa antes de delegarla) es de la barra superior, no de esta pantalla. | ux-designer | Después de implementar | Pendiente: actualizar el documento de comunicación con el diseño final; UR-35 queda para la barra superior. |
| 18. Atajos de una tecla (AM-03, WCAG 2.1.4): Espacio sobre una fila es Continuar (pregunta 2) y no se podía apagar. | usuario | Fase 5 | **Resuelto (decisión del usuario)**: interruptor "Atajos de una tecla" en Ajustes › Accesibilidad (`settings.singleKeys`, encendido por defecto, en `localStorage`). Apagado, Espacio, Mayús + Espacio, 0-9, `/` y `?` no hacen nada fuera del partido; Espacio sobre una fila no hace nada (ni desplaza). Siguen Ctrl + K, Alt + ← →, Esc y Enter. La ayuda de atajos muestra el estado y marca cuáles son de una tecla. Además, con el foco en una fila los números no cambian de pantalla aunque estén encendidos. Los atajos del día de partido (`MatchView.tsx`) no entran en el interruptor. |
| 19. ¿Dónde frena el avance antes de un vencimiento? (AC-02, pregunta 8) | usuario | Fase 5 | **Resuelto (decisión del usuario)**: "Ir al partido" frena **el último día para responder** (mañana ya no está) una oferta por un jugador (`offerDeadline`) o una oferta de trabajo (`until`), aunque no sea nueva, y abre la bandeja con esa decisión elegida (`tab: 'pend'`, `sel`). Una sola vez por decisión en la sesión (se recuerda `clave@fecha`); el siguiente "Ir al partido" avanza. Si ya es el último día al apretarlo, no avanza y abre la bandeja. Si el avance termina en el día del partido o en una conferencia y ese día vence algo, también abre la bandeja. La lógica pura es `expiringKeys(g)` en `src/engine/inbox.ts`. "Continuar" (un día) no frena: es un paso manual de un día. **Ampliado el 2026-11-14 (pregunta 22):** la misma regla vale para las contraofertas y los acuerdos de un trato (`deal`, `deal.deadline`), también cuando el último día para responder es el último día del libro (confirmado por el usuario); los avisos de cierre del libro solos nunca frenan. |
| 20. Color de "elegido" en los clubes amarillos y naranjas (revisión visual, M1) y "Rechazar" en los clubes rojos (M2). | usuario + art-director | Fase 5 | **Resuelto (decisión del usuario)**: token propio `--sel` para selección y foco, derivado en `clubTheme` (`selColor`): el acento claro, salvo que su matiz quede a menos de 25° del ámbar de `--warn` o del amarillo de `.cvd` con saturación ≥ 0,35; entonces #f1f2fa. Lo usan la fila elegida, el punto de sin leer y todos los anillos de foco del juego. La fila de decisión elegida suma forma y peso (riel de 6 px, contorno de 1 px, título 700). Los botones de peligro pasan a bordeados con texto `--danger` y sin relleno, en todo el juego. Verificado por `tools/check-contrast.mjs` (contraste ≥ 3:1 y distancia de matiz). |
| 21. Con más de tres acciones en pantallas angostas, ¿qué pasa al contenido? (5.2, desvío rechazado en la fase 4) | ux-designer | Fase 5 | **Resuelto**: en ≤ 900 px, si un mensaje tiene más de tres acciones, las de solo lectura (en la oferta, "Ver la ficha") van al contenido como botones comunes; la barra queda con el primario en su fila y Pedir más y Rechazar en la segunda. Las de solo lectura siguen habilitadas durante el avance (7.3). Para las decisiones de un trato, ver la pregunta 22. |
| 22. **Decisiones del mercado que viven en la bandeja** (fuente: `design/ux/mercado.md`, sección 15, preguntas 20, 23, 24 y 25, tras su revisión con /ux-review, `production/ui/mercado/ux-review.md`, bloqueantes 1 a 3). Con la respuesta del club con demora, una oferta del DT por un jugador ajeno deja dos decisiones nuevas, y hacía falta definir su lugar en la bandeja, cómo cuentan sus mensajes y dónde van sus controles en pantallas angostas. | ux-designer + usuario | Antes de implementar la bandeja del mercado | **Resuelto (2026-11-14; las decisiones de fondo son del usuario en `mercado.md`: demora de 1 a 3 días, acuerdo y contraoferta como pendientes con plazo de 7 días o el cierre del libro, préstamo confirmado con F6, tratos que se caen al cambiar de club, freno el último día por plazo; el resto, del ux-designer).** (1) **Pendiente nuevo `deal`** (contraoferta, `kind: 'countered'`; acuerdo para cerrar, `kind: 'agreed'`), con su fila, su plazo (`deal.deadline`), su texto en `pendingText` y su orden por plazo (8). (2) **Plantillas** "Contraoferta", "Acuerdo para cerrar" (compra y préstamo) y "Mensaje de un trato que ya no es la decisión vigente", con cifras, acciones, F6 en Confirmar el préstamo y la paciencia en palabra (5.3, 7.2, 12 G5). (3) **Tema**: Mercado (8). (4) **Conteo**: una decisión cuenta una vez como pendiente; por cada oferta o trato, solo el mensaje más nuevo puede contar como sin leer; el vencimiento reemplaza al mensaje de la decisión; por eso el mensaje de vencimiento de una oferta pasa a llevar `act: 'offer'` (ajuste de la pregunta 14) (6, 8). (5) **Regla de leído**: la de la pregunta 12 no cambia; se suma que resolver la decisión a propósito en cualquier pantalla marca leídos sus mensajes (lo hace el motor), que lo que el DT acaba de ver nace leído y que elegir un trato en Mercado no marca nada (6). (6) **Freno**: `decisionKeys` y `expiringKeys` con `deal`, también el último día del libro; los avisos de cierre solos no frenan (8; ampliación de la pregunta 19). (7) **Pantallas angostas**: en la barra fija, solo el primario y un único botón; el campo Mejorar, sus avisos, el impacto y los enlaces en el contenido; ~~la barra deja de ser fija con el foco en Mejorar~~ (reemplazado por el punto 10: la barra sigue fija siempre) (5.2, 7.3). (8) **Oferta de trabajo**: la línea de consecuencias y la F6 nombran los tratos que se caen (`jobConsequences.deals`) (5.3, 8, 9). (9) Criterios de aceptación nuevos en 14. **Decisiones anteriores que se mantienen**: Espacio sobre una fila sigue siendo Continuar (pregunta 2; en la tabla del Mercado, Espacio marca la casilla, diferencia anotada en `mercado.md`); la selección automática no marca leído (12); el bloque "Para decidir" siempre arriba; F6 en lo irreversible; la barra fija de ≤ 900 px y su regla de "más de 3" (21) para el resto de los mensajes. **Queda abierto**: la regla del mensaje más nuevo no se aplica a las ofertas de trabajo, porque su clave (`job<clubId>`) se repite si el mismo club vuelve a ofertar; si hace falta, pide un id por oferta de trabajo (gameplay-programmer). **Segunda revisión del Mercado (2026-11-15, `production/ui/mercado/ux-review-2.md`; fuente `mercado.md`, preguntas 37 a 48)**: (10) **Barra angosta** [A1, decisión del usuario]: deja de pasar a `position: static` con el foco en Mejorar; sigue fija y el bloque Mejorar lleva `scroll-margin-bottom` (5.2, 7.3, 14, criterio "La barra no se mueve bajo el puntero"; `mercado.md` pregunta 39). (11) **Chip "Trato"** [A9] en la fila de un mensaje de trato que no es la decisión vigente (5.3). (12) **Paciencia** [A6]: la plantilla "Acuerdo para cerrar" no la muestra hasta la primera apertura de la mesa (5.3, 14). (13) **Cancelar el trato con F6** [A8, decisión del usuario]: 14 días sin ofertar por el jugador y el club molesto, con aviso en la plantilla; el sueldo de la F6 del préstamo pasa a rango por debajo de 95 % (5.3, 6, 7.2, 9, 12 G5, 14; `mercado.md` pregunta 46). (14) **Sueldo que pediría de una sola fuente** [N2, decisión del usuario]: el "pedido de sueldo" del informe de ojeo es `wageShown` de `demandWage`, el mismo número que el Mercado y el representante (5.3, 14; `mercado.md` pregunta 38). (15) **Ofertas borradas sin decisión** [A2]: las que cancela una venta o una cláusula quedan registradas en `g.deals` con su texto F2; al aceptar una oferta, las otras por el mismo jugador se marcan leídas (la confirmación las nombró) y la venta nace leída; las que cancela una cláusula, no (6; `mercado.md` pregunta 40). (16) **Tratos podados** [A7]: "Este trato ya no figura en el historial." con solo Ver la ficha (5.3, 14). (17) **Conteo al resolver** [A3]: el criterio distingue N − 1 (la decisión se cierra) de N (sigue abierta) (14). |
| 23. Fase 5 del Mercado: la decisión de un trato en la bandeja | ui-programmer | Hecho | **Resuelto (2026-11-15).** Las ofertas por un jugador propio y los tratos (`deal<id>`) se dibujan con la vista del trato del Mercado (`DealView`, `dealModel` / `offerModel` de `deal.tsx`): mismas cifras, mismos rótulos, mismo impacto ("Si lo vendés" también acá). El panel de lectura conserva su título, sus tarjetas de entidades y su barra de acciones (primario → comunes → "Ver la ficha" → peligro); la barra va **antes** del cuerpo del mensaje y "Ver todos los tratos" después. La F6 de "Aceptar" un trabajo nombra los tratos de mercado que se caen ("; se caen tus N tratos de mercado"). |
| 24. **La decisión "jugador que quiere irse" (`out<pid>`) que comparte con el Vestuario** (fuente: `design/ux/vestuario.md`, preguntas 4, 5, 8, 19 y 25 a 38, tras su revisión con /ux-review, `production/ui/vestuario/ux-review.md`, bloqueantes 2, 4 y 9 y recomendado 15). | ux-designer + usuario | Antes de implementar el Vestuario | **Resuelto (2026-11-15; las decisiones de fondo son del usuario en `vestuario.md`: "Hablar con él" sigue yendo a la ficha, dos caminos con efectos distintos y comparados con números, sin charla extra por pedido; el resto, del ux-designer).** (1) **Plantilla** (5.3): conformidad con `MoodBar` (escala única de `moodOf`), minutos de `minutesOf`, comparación `vt-letgo` siempre visible con los números de `letGoInfo` (solo lo que el mercado cumple: con el libro cerrado, la fecha en que abre; el 25 % menos solo para los clubes que lo buscan para reforzar un puesto) y acciones de `outActions`: con la charla disponible, "Hablar con él" (primario, a la ficha › Vestuario) y "Declararlo transferible" (común); **con la charla usada, "Declararlo transferible" es el primario**, con la nota de la próxima charla y la comparación con "(charla, desde el {fecha})"; a préstamo, sin acción y con el porqué. (2) **Conteo** (8): `decisionKeyOf` reconoce `out<pid>` sin `ref`, `newestOf` la cubre y `pendingKeyOf(g, n)` la da por abierta con jugador propio, `wantsOut` y no transferible: un pedido cuenta 1, no 2. (3) **Regla de leído** (la de las preguntas 12 y 22, sin cambios de fondo): resolver el pedido a propósito marca leídos sus mensajes dentro del motor (`talk`, `setListed`, `applyRenewal`, `acceptOffer` de una venta del DT a un club argentino o al exterior, y la acción masiva por `setListed`; tras la verificación, pregunta 25); lo que lo cierra sin el DT (cláusula, préstamo, libre, retiro, cambio de club del DT) deja el mensaje como uno común sin leer, igual que las ofertas canceladas por una cláusula (punto 15 de la pregunta 22); "Quitar de transferibles" reabre con el mensaje leído; la nueva temporada manda "{nombre} sigue queriendo irse" (nace sin leer), después de `seasonTurnover`, a quien estaba en la lista y sigue en el plantel queriendo irse. (4) **Vigencia** del mensaje viejo o resuelto: "Ya respondiste este pedido.", "Ya no está en el plantel." (el único texto para un jugador que ya no está, también si no existe) o "Está declarado transferible." (5.3). (5) **Foco**: la regla de llegada de la bandeja no cambia (la fila o el título, nunca un botón). "Declararlo transferible" no lleva F6 (es reversible desde la ficha › Contrato); con la charla usada es el primario y, **desde la verificación (pregunta 25)**, Enter sobre la fila lleva el foco al título del panel de lectura y no a él, como en la ficha › Vestuario: el primario queda como la siguiente parada de Tab después de la tarjeta del jugador (orden nativo; ver la pregunta 25). Al llegar a la ficha › Vestuario por "Hablar con él", el foco lo define `vestuario.md` (sección 4: nunca un botón que decide). (6) **Mensaje de reserva**: acción nueva "Armar la reserva" (`act: 'reserve'`) al modo "Armar la reserva" del Vestuario (4). Criterios nuevos en 14. |
| 25. **Verificación focalizada del Vestuario** (`production/ui/vestuario/verificacion.md`, N1 y m2, m5 en lo que toca a esta pantalla; `vestuario.md`, preguntas 47, 50, 52 y 54). | ux-designer | Antes de implementar el Vestuario | **Resuelto (2026-11-15).** (1) **Venta al exterior** (N1): la regla de leído del pedido de salida va en `acceptOffer`, que cubre la venta a un club argentino y al exterior (`sellAbroad` no pasa por `doTransfer`); criterio de la sección 14 ampliado. (2) **Cierres sin decisión**: el cambio de club del DT se suma a cláusula, préstamo, libre y retiro; el mensaje "sigue queriendo irse" sale después de `seasonTurnover`. (3) **Un texto para el jugador que ya no está** (m5): en un mensaje `out`, "Ya no está en el plantel." en todos los casos, sin la tarjeta "Ya no está en el fútbol argentino." (5.3, 6, 8, 14). (4) **Foco** (m5): Enter sobre la fila lleva el foco al título del panel cuando el primario decide sin F6 (hoy, "Declararlo transferible" con la charla usada), y no al primario: dos Enter seguidos nunca deciden, como en la ficha › Vestuario (7.1, 12, 14; corrige el punto (5) de la pregunta 24). (5) **Nota F7 de "Declararlo transferible"** (m2): con el libro cerrado dice cuándo reabre o que no van a llegar ofertas esta temporada, nunca "Las ofertas van a llegar a la bandeja." (7.2). (6) **Fase 5 de /team-ui (pulido, 2026-11-15; `production/ui/vestuario/review-ux-designer.md`, M5 y m2; `review-art-director.md`, B1 y M8)**: el título ya no intercepta Tab para saltar al primario: el orden del foco sigue el orden visual (título, tarjeta del jugador, primario) y es recíproco con Mayús + Tab; lo que importa de (4) se mantiene (Enter deja el foco en el título y dos Enter nunca deciden). En la plantilla `out`, la charla usada se dice una vez (la nota de `outActions`, como texto de 14 px en `--dim`, sin caja; sin el hecho `vt-talkst` aparte), la comparación `vt-letgo` va 12 px debajo de los botones y "Quiere irse" (`.chip.bad`) va en `--text` sobre su tinte en todo el juego. |
