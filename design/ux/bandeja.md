# UX Spec: Bandeja de entrada

> **Status**: In Design
> **Author**: usuario + ux-designer
> **Last Updated**: 2026-11-14
> **Journey Phase(s)**: bucle semanal entre partidos (supuesto: no hay mapa del recorrido del jugador; ver "Supuestos")
> **Screen / Flow Name**: `Inbox` (página `inbox` de `src/ui/Inbox.tsx`)
> **Platform Target**: web. Escritorio primero (mouse y teclado); celular por navegador (toque) por debajo de 760 px. Sin gamepad (fuera de alcance, `design/accessibility-requirements.md`, AM-10).
> **Related GDDs**: no hay GDD. Fuentes: `CLAUDE.md` (bandeja, `pendingOf`, campos `pid`/`act`/`ref`/`me`) y `docs/plan-ui-ux.md` (etapa 2: bandeja de entrada y ritmo).
> **Related ADRs**: ninguna. Restricciones de `CLAUDE.md`: estado `Game` serializable, sin web worker, navegación por `nav()`.
> **Related UX Specs**: `design/ux/interaction-patterns.md` (patrones por id), mosaico "Mensajes" del Inicio (`src/ui/Home.tsx`, sin especificación propia).
> **Accessibility Tier**: Standard (`design/accessibility-requirements.md`: WCAG 2.1 AA, más 2.5.8 y 2.4.11; texto mínimo 14/12/11 px)
> **Template**: UX Spec

> **Supuestos de esta especificación**
> - **No hay GDD, documento de concepto, mapa del recorrido ni documento de HUD.** El contexto del jugador de la sección 2 es una suposición explícita: el jugador es un DT entre partidos que revisa qué tiene que decidir antes de apretar Continuar; las sesiones son frecuentes y cortas; la bandeja tiene que contestar "¿qué tengo que decidir ahora?" de un vistazo.
> - **"Eventos"** quiere decir llamadas a funciones del motor (`src/engine/`) seguidas de `save()` y `refresh()`. No hay bus de eventos ni sistema de analítica: ninguna acción dispara analítica.
> - **Sin audio**: las columnas de sonido de las tablas dicen "—".
> - **Un solo idioma** (español rioplatense). La sección 13 cubre largos de nombres reales y formatos, no traducción.
> - **Lenguaje visual**: el bloque "estilo portal" del final de `src/styles.css` y la anatomía de fila del mosaico "Mensajes" del Inicio (`.msg-day`, `.msg`, `.msg-ico`, `.msg-from`, `.msg-t`, `.msg-dot`), que el usuario aprobó. Las decisiones de color, tipografía y peso visual son del art-director; acá solo se fija jerarquía, estados y contraste mínimo.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

El DT necesita saber, sin leer nada, si hay algo que lo frena antes de seguir: una oferta por un jugador que vence, un club que lo quiere, un jugador que pide irse, una conferencia. Después, y solo si quiere, ponerse al día con lo que pasó en su club (lesiones, resultados, informes) y en el resto del fútbol. La bandeja es el escritorio del DT entre partido y partido: lo que hay que firmar arriba, la correspondencia abajo, y cada papel trae la lapicera para resolverlo ahí mismo (F2). Lo que más frustra es descubrir tarde que se venció una oferta, vender a alguien por un clic distraído, o tener que ir a otra pantalla para responder algo que ya está leyendo.

**The player goal**:

Ver en el primer vistazo cuántas decisiones esperan respuesta y resolver cada una sin salir de la bandeja, con un máximo de dos clics (o dos teclas) por decisión irreversible.

**The game goal**:

Que ninguna decisión pendiente (`pendingOf`) pase desapercibida antes de avanzar el tiempo, y que cada respuesta llegue al motor por su función (`acceptOffer`, `haggle`, `rejectOffer`, `acceptJob`, etc.) con el estado guardado.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Tres casos (supuestos): (a) apretó Continuar o Ir al partido y el avance se frenó por una decisión nueva (F4); (b) volvió del partido o del Inicio y quiere ver novedades (insignia de Bandeja, F3); (c) tocó un mensaje en el mosaico del Inicio. |
| What is their emotional state? | Calma con algo de expectativa. Si el avance se frenó, leve urgencia ("¿qué pasó?"). Nunca presión de tiempo real: el tiempo no corre en la bandeja (AC-01). |
| What cognitive load are they carrying? | Media: tiene en la cabeza el próximo partido y el plan de la semana. No quiere cargar más; quiere vaciar lo pendiente y seguir. |
| What information do they already have? | El número de la insignia (sin leer + pendientes) y, si vino del botón de pendientes o del freno del avance, la frase de `pendingText` ("una conferencia y 2 ofertas por jugadores"). |
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
- Selección: una clave de texto única para pendientes y mensajes (`"n<id>"` para un mensaje; la `key` de `pendingOf` para un pendiente, como `"offer12"` o `"press34pre"`). **Requiere sumar un campo opcional `sel?: string` a `Route`** (`src/store.ts`), porque `id` es numérico y los pendientes no tienen id. Ver pregunta abierta 1.
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

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Cambiar de alcance o de tema | La misma pantalla | En el lugar; **reemplaza** la entrada del historial (resuelve G6) | `tab` en la ruta y en `ib.tab` | No apila: volver atrás sale de la bandeja, no recorre filtros. |
| Elegir otro mensaje (escritorio) | La misma pantalla | En el lugar; reemplaza la entrada | `sel` en la ruta; el mensaje queda leído | Volver a la bandeja desde una ficha devuelve la misma selección. |
| Abrir un mensaje (celular / ≤ 900 px) | Detalle del mensaje | **Apila** una entrada nueva; `page-in` 160 ms | `sel` en la ruta | Es la única selección que apila, para que "Atrás" del navegador y "◂ Bandeja" vuelvan a la lista. |
| "◂ Bandeja", Esc o Atrás desde el detalle | Lista | Vuelve en el historial | Restaura el scroll de la lista | El foco va a la fila del mensaje que se estaba leyendo. |
| Aceptar / Rechazar / Pedir más (oferta), Aceptar / Rechazar (trabajo), Que hable el ayudante, Declararlo transferible | La misma pantalla, estado "Resuelto" | En el lugar | El motor cambia el estado; `save()` | Ver sección 6, "Resuelto". Aceptar un trabajo cambia el club del DT: el tema del club (A3) cambia en el mismo cuadro. |
| Responder (prensa) | `PressModal` (F5) | Modal | — | Al cerrar, si la conferencia se respondió, la decisión pasa a "Resuelto". |
| Ver el informe del partido / del rival | `MatchReport` / `ReportModal` (F5) | Modal | Aplicar sugerencias del rival cambia `club.tactic` | Al cerrar, foco al botón que la abrió. |
| Tarjeta del jugador o del club, "Ver la ficha", "Ver el club", "Hablar con él", "Ofertar" | Ficha (N5) en la pestaña que corresponda | `nav()`, apila | — | "Hablar con él" abre la pestaña `personal`; "Ofertar", `contrato`. |
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

`●` en la columna de lectura marca el foco al pulsar Enter en la lista (botón primario). Al entrar a la pantalla, el foco está en la fila elegida de la lista.

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
| Lista: mensajes por día | Mensajes de la vista agrupados por fecha | 40 % del ancho (mín. 360 px), alto `100vh − 230 px` | Sí, vertical, independiente de la página | Rinde 150 filas y "Mostrar 150 más" (F8 para el final de la lista) |
| Lectura | Plantilla del mensaje o la decisión elegida | 60 % del ancho, mín. 260 px de alto, `position: sticky` | Sí, vertical, si el contenido supera el alto visible | El cuerpo largo se lee completo; las acciones quedan al final del contenido (escritorio) |
| Barra de acciones (celular) | Botones de la decisión, fija sobre la barra inferior N3 | Ancho completo, 56–112 px | No | Primario a todo el ancho en su propia fila; secundarios en una segunda fila; si hay más de 3, el cuarto pasa a "Más acciones" dentro del contenido (no a un menú) |

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| Ayuda de pantalla | Nota | Ayuda | Explica la regla de la bandeja una vez ("Lo que tenés que decidir está siempre arriba. Cada mensaje trae los botones para resolverlo.") | Sí | Sí — O2 `PageTip`; actualizar el texto en `TIPS` |
| Título "Bandeja de entrada" | `h2` | Encabezado | Nombre de la pantalla (AC-09) | Sí | Sí |
| Buscador | Campo `input type="search"` con `aria-label="Buscar en los mensajes"` | Encabezado | Filtra la vista por título, cuerpo, jugador o club | Sí | No — nuevo (estilo de `.searchbox`, N8) |
| Marcar como leídos | Botón chico `.btn.sm` | Encabezado | Marca leídos los mensajes sin leer **de la vista actual** (alcance, tema y búsqueda); dice cuántos | Sí (solo si hay sin leer en la vista) | Sí — C2 |
| Selector de alcance | Segmentado, 2 opciones: Mi club / Todo el fútbol | Filtros | Separa lo del DT del diario | Sí | Sí — C1 `Seg`, con el arreglo de contraste y `aria-pressed` (ver 12) |
| Chip de tema | Botón alternable con contador | Filtros | Todo, Plantel, Mercado, Partidos, Torneos, Dirigencia; uno activo por vez | Sí | **No — patrón nuevo "Filtro con chips y contador"** (sumar a la biblioteca como C5; ver pregunta abierta 3). Se arma sobre `.chip` del estilo portal |
| Encabezado del bloque "Para decidir · N" | Encabezado de grupo (`role="group"` con nombre) | Lista | Responde la pregunta principal | Sí | No — variante de `.msg-day` con borde de advertencia |
| Fila de decisión | Opción de lista | Lista | Una decisión: ícono, remitente, título, plazo | Sí | Sí — anatomía de `.msg` del Inicio + `.ib-row.pend` (F1); `PendRow` a rediseñar |
| Encabezado de día | Separador `.msg-day` | Lista | "Hoy · sáb 14 nov", "Ayer · vie 13 nov", luego `fmtDate` | Sí | Sí — `.msg-day` del Inicio (subir a 12 px, ver 12) |
| Fila de mensaje | Opción de lista | Lista | Ícono redondo por tema (`TAG_ICON`), remitente + entidad, título, marca de sin leer, chip de acción | Sí | Sí — `.msg`, `.msg-ico`, `.msg-from`, `.msg-t`, `.msg-dot` del Inicio (mover `TAG_ICON` y `TAG_NAME` a un módulo compartido) |
| Chip de acción en la fila | Chip | Lista | "Para decidir" (si el mensaje tiene una decisión abierta), "Ver informe" (resultado), "Informe" (ojeo/rival). Texto, no ícono | No | Sí — D6 `.chip` |
| Mostrar más | Botón chico | Lista | Carga 150 filas más | Sí (si hay más) | Sí — mismo texto que D1 ("Mostrar N más") |
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
| Oferta por un jugador (`offer`, pendiente `offer`) | Jugador (con rol en el plantel y partidos de la temporada) y club que ofrece | Oferta, Valor, Diferencia ("+20 %" o "−15 %", con signo y palabra "sobre/bajo su valor"), Sueldo, Contrato | Plazo; estado del libro de pases; "Si lo vendés te quedan N en su puesto" | **Aceptar** (primario, F6: "Confirmar: vender a X por US$ Y"; deshabilitado con el libro cerrado, con motivo visible debajo, no solo en `title`), Pedir más (común; debajo, siempre visible: "El club puede mejorar la oferta o retirarse"), **Rechazar** (peligro, F6: "Confirmar rechazo"), Ver la ficha (común) |
| Oferta de trabajo (`job`, pendiente `job`) | Club que ofrece, comparado con el club actual | Categoría, Posición, Reputación, Presupuesto, cada una "ese club / el tuyo" | Plazo ("Respondé antes del …"); si es de fin de temporada: "Empezás la próxima temporada" | **Aceptar** (primario, F6: "Confirmar: dejar {club actual} y dirigir {club}"), Ver el club, **Rechazar** (peligro, F6) |
| Jugador que quiere irse (`out`, pendiente `out`) | Jugador con conformidad (`Cond`) y rol | Conformidad, Rol, Minutos esperados vs. jugados | Promesas vigentes, si hay | **Hablar con él** (primario, ficha › Vestuario), Declararlo transferible (común, reversible desde la ficha: sin F6) |
| Conferencia (pendiente `press`) | — | Partido y rival | Las preguntas en cursiva | **Responder** (primario, `PressModal`), Que hable el ayudante (común, sin F6: bajo costo) |
| Lesión (`injury`) | Jugador con estado de lesión (D6) | Días afuera (actuales, no los del mensaje), Vuelve (fecha estimada), Partidos que se pierde (fixtures propios hasta esa fecha) | Si ya se recuperó: "Ya está recuperado" en lugar de las cifras | **Ir a Tácticas** (primario, si era titular), Ver la ficha |
| Resultado (`result`) | Ambos escudos con marcador grande; figura (`pid`) con su puntaje | Marcador, torneo, resultado en palabras (Victoria, Empate, Derrota) | — | **Ver el informe del partido** (primario, `MatchReport`), Ver posiciones (si es de liga) |
| Informe de ojeo (`scout`) | Jugador con valoración y potencial (ya conocidos: D4 exacto) | Los 4 mejores atributos con número y tono, el más flojo, personalidad, valor, pedido de sueldo | Club y contrato | **Ver la ficha** (primario), Seguir (alternable), Ofertar (común; solo si no es propio) |
| Informe del rival (`rival`) | Club rival y fecha del partido | Estilo, punto débil (del informe) | "Ese partido ya se jugó" si `ref` ya no es el próximo | **Ver el informe del rival** (primario, `ReportModal` con sugerencias aplicables) |
| Entrenamiento (`train`) | — | — | — | **Ir a Entrenamiento** (común) |
| Fin de temporada (pendiente `season`) | — | Posición final, objetivo de la dirigencia (si se conoce) | — | **Ir al inicio** (primario) |
| Torneo y premio | Club, si hay | — | — | Ver posiciones (común) |
| Cualquier otro | Jugador o club, si hay | — | — | Ninguna (solo lectura) |

Si la entidad ya no existe (jugador retirado o ido al exterior, club sin datos), la tarjeta se reemplaza por "Ya no está en el fútbol argentino." y las acciones sobre él desaparecen (F8). Si la decisión ya no está vigente, las acciones se reemplazan por el texto tenue de F2 ("Esta oferta ya fue respondida o venció.").

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
| Elegido | Clic, flechas o ruta | Fila con fondo `--accent-soft`, borde izquierdo de acento de 3 px y `aria-selected="true"` | El mensaje pasa a leído (regla de leído) | El estado no depende solo del fondo: hay borde. |
| Sin leer | `!n.read` en un mensaje propio | Título en negrita, punto `.msg-dot` a la derecha con `aria-label="Sin leer"` | Cuenta en la insignia F3 y en los chips | Las noticias del resto del fútbol no tienen estado "sin leer" visible ni cuentan: son el diario, no tareas. |
| Confirmación pendiente | Clic en Aceptar o Rechazar (oferta o trabajo) | El botón se reemplaza en el lugar por "Confirmar: …" (peligro para rechazos; primario para aceptar) y "No" | Esc o "No" cancelan; cambiar de selección cancela; el foco va a "Confirmar" | F6. Nunca un "¿Estás seguro?" genérico. |
| Resuelto | Acción confirmada (o Pedir más, Que hable el ayudante, Declararlo transferible) | La fila queda en el bloque con "✓ Resuelto" en texto y tono tenue hasta que cambia la selección o se sale de la pantalla; la lectura muestra la nota F7 y, si quedan pendientes, "Siguiente pendiente ▸" (primario) | El foco va a "Siguiente pendiente" o, si no hay, a la nota | Evita que el panel desaparezca bajo el cursor (hoy salta al primero de la lista). La copia local de lo resuelto es estado de la interfaz, no del juego. |
| Pedir más con retiro | `haggle` devuelve falso | Nota F7 en tono de advertencia: "Racing se retiró de la negociación." | Igual que Resuelto | — |
| Decisión vencida o respondida en otro lado | La oferta venció en el avance o se respondió desde Mercado | Acciones reemplazadas por texto tenue (F2) | La fila del bloque desaparece al siguiente refresco si no está elegida | — |
| Entidad inexistente | Jugador o club ya no está | Tarjeta reemplazada por "Ya no está en el fútbol argentino." | Acciones sobre la entidad ocultas | — |
| Libro de pases cerrado | `!windowOpen(g.date)` en una oferta | "Aceptar" deshabilitado; debajo, visible: "El libro de pases está cerrado: podés pedir más o rechazar." | — | El motivo no queda solo en `title` (AC-05). |
| Plazo corto | Vence hoy o mañana | "Vence hoy" / "Vence mañana" en advertencia, con "!" | — | Texto, no solo color. |
| Avance en curso | F4 corriendo | La lista se actualiza por día; botones de decisión deshabilitados con "Frená el avance para decidir" visible | Ver 7.3 | El avance se frena solo si llega una decisión nueva. |
| Modal abierta | Prensa o informes | Fondo oscurecido (F5) | La lista no responde al teclado | — |
| Error al guardar | `save()` falla (IndexedDB) | Nota F7 en `--bad`: "No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes." | El estado del juego ya cambió en memoria; no se revierte | Depende de que `save()` informe el error; hoy no lo hace (pregunta abierta 6). |
| Celular / ≤ 900 px: lista | Ancho ≤ 900 px | Una columna; sin panel de lectura | Tocar una fila abre el detalle | — |
| Celular / ≤ 900 px: detalle | Fila abierta | Vista aparte con "◂ Bandeja", "N de M ‹ ›" y barra de acciones fija | Esc o Atrás vuelven a la lista | — |

**Regla de leído.** Un mensaje pasa a leído cuando se muestra en el panel de lectura, incluido el elegido automáticamente al entrar en escritorio (si está a la vista entera, está leído). En celular solo al abrir el detalle. "Marcar como no leído" en el encabezado de lectura lo deshace. "Marcar N como leídos" muestra la nota F7 "Marcaste N como leídos." con un botón "Deshacer" mientras la nota está visible.

---

## 7. Interaction Map

Entradas cubiertas: mouse y teclado (escritorio), toque (celular). Gamepad: fuera de alcance.

**Decisión de teclado.** No se agregan atajos de una letra (j/k, a, r, e…): la biblioteca los prohíbe fuera del día de partido (N9, "No hagas") y el nivel Estándar exige poder apagarlos (AM-03), cosa que todavía no existe. En su lugar, la lista es un `listbox` con foco itinerante: ↑ ↓ eligen, Enter lleva al primario del mensaje, Esc vuelve a la lista. Con eso, responder una oferta con teclado es: ↓ hasta la oferta, Enter (foco en Aceptar), Enter (pasa a Confirmar), Enter (confirma).

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| ↑ / ↓ | Teclado, foco en la lista | Elige la fila anterior o siguiente (pendientes y mensajes en un solo recorrido; los encabezados de día se saltean) y mueve el foco a ella | Fila elegida y foco visibles; la lista se desplaza para dejarla a la vista (`block: 'nearest'`, sin desplazamiento suave) | — | El oyente va **en el contenedor de la lista**, no en `window` (resuelve G7: con un menú N2 abierto, el foco está en el menú y la lista no recibe la tecla). Además ignora la tecla si `defaultPrevented`. En los extremos no da la vuelta. |
| Inicio / Fin | Teclado, foco en la lista | Primera o última fila cargada | Igual | — | — |
| Re Pág / Av Pág | Teclado, foco en la lista | Salta 10 filas | Igual | — | — |
| Tab / Mayús + Tab | Teclado | Recorre zonas en el orden de la sección 12 | Foco visible (A2) | — | La lista es **una sola parada** de Tab (solo la fila elegida tiene `tabindex="0"`). |
| Enter | Teclado, foco en una fila | Lleva el foco al botón primario del panel de lectura (en ≤ 900 px, abre el detalle) | Foco en el primario | — | Si el mensaje no tiene acciones, al título del panel. |
| Esc | Teclado, foco en el panel de lectura | Vuelve el foco a la fila elegida | — | — | Si hay una confirmación F6 abierta, primero la cancela. |
| Esc | Teclado, detalle del celular | Vuelve a la lista (atrás en el historial) | — | — | — |
| Esc | Teclado, foco en el buscador con texto | Borra la búsqueda | — | — | Sin texto, el Esc sigue al manejo global (N9). |
| Espacio | Teclado, foco en una fila de la lista | Pasa al atajo global Continuar (N9) | El avance de F4 | — | La fila es `role="option"` de un `listbox` de selección única que sigue al foco: Espacio no tiene función propia, así que no choca con G1. Con los atajos de una tecla apagados (AM-03), no hace nada. Ver pregunta abierta 2. |
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
| Igual | Todas | Chip de tema | Cambia el tema | Igual | Ninguna | — | `aria-pressed`. Chip activo: borde de acento, fondo `--accent-soft`, ✓ antes del nombre y negrita. |
| Escribir | Teclado | Buscador | Filtra la vista | La lista se filtra a cada tecla (sin esperar) | Ninguna | — | Con menos de 2 letras no filtra. |
| Clic / Enter | Todas | "Marcar N como leídos" | Marca leídos los de la vista | Nota F7 con "Deshacer" | Ninguna | — | — |
| Clic / Enter | Todas | "Marcar como no leído" (encabezado de lectura) | Lo vuelve a sin leer | Fila en negrita; el botón pasa a "Marcar como leído" | Ninguna | — | No se vuelve a marcar leído hasta que se elija de nuevo. |
| Clic / Enter / toque | Todas | **Aceptar** (oferta) | Abre la confirmación F6 | "Confirmar: vender a Pérez por US$ 2,4 M" (primario) y "No"; foco en Confirmar | Ninguna | — | — |
| Igual | Todas | Confirmar venta | `acceptOffer(g, o)` | Estado Resuelto; F7 "Vendiste a Pérez a Racing por US$ 2,4 M." | Ninguna | — | — |
| Igual | Todas | **Pedir más** | `haggle(g, o)` | F7: "Racing mejoró su oferta: ahora US$ 2,8 M." (la decisión sigue abierta, con las cifras nuevas) o "Racing se retiró de la negociación." (Resuelto) | Ninguna | — | Sin F6: el riesgo está escrito junto al botón. |
| Igual | Todas | **Rechazar** (oferta) | Abre F6 | "Confirmar rechazo" (peligro) y "No" | Ninguna | — | Resuelve G5 para la bandeja. |
| Igual | Todas | Confirmar rechazo | `rejectOffer(g, o)` | Resuelto; F7 "Rechazaste la oferta de Racing." | Ninguna | — | — |
| Igual | Todas | **Aceptar** (trabajo) | Abre F6 | "Confirmar: dejar Banfield y dirigir Racing" y "No" | Ninguna | — | — |
| Igual | Todas | Confirmar trabajo | `acceptJob(g, clubId)` | Resuelto; F7; el tema del club (A3) cambia | Ninguna | — | — |
| Igual | Todas | **Rechazar** (trabajo) → Confirmar | Función de motor nueva `rejectJob(g, clubId)` | Resuelto; F7 "Rechazaste la oferta de Racing." | Ninguna | — | Hoy la interfaz filtra `g.jobOffers` a mano (sección 8). |
| Igual | Todas | Hablar con él | `nav({ page: 'player', id, tab: 'personal' })` | Ficha | `page-in` | — | — |
| Igual | Todas | Declararlo transferible | Función de motor (`setListed(g, pid, true)`) | Resuelto; F7 "Declaraste transferible a Gómez. Las ofertas van a llegar a la bandeja." | Ninguna | — | Reversible desde la ficha: sin F6. |
| Igual | Todas | Responder (prensa) | `openPress()` | `PressModal` (F5) | `pop` 140 ms | — | Al cerrar, foco al botón; si se respondió, Resuelto. |
| Igual | Todas | Que hable el ayudante | `delegatePress(g)` | Resuelto; F7 "Habló el ayudante." | Ninguna | — | — |
| Igual | Todas | Ver el informe del partido / del rival | Abre F5 | Modal | `pop` 140 ms | — | En `ReportModal`, "Aplicar" cambia la táctica (ya existe). |
| Igual | Todas | Ver la ficha, Ver el club, Ofertar, Ir a Tácticas, Ir a Entrenamiento, Ver posiciones, Ir al inicio | `nav()` | Otra pantalla | `page-in` | — | — |
| Igual | Todas | Seguir (ojeo) | Función existente de seguimiento | El botón pasa a alternable "En seguimiento" | Ninguna | — | — |
| Igual | Todas | Siguiente pendiente | Elige el próximo del bloque | Panel con esa decisión; foco en su primario | Ninguna | — | — |
| Esc / "No" / cambiar de selección | Todas | Confirmación F6 abierta | Cancela | Vuelven los botones originales; foco al botón que la abrió | Ninguna | — | — |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Avance en curso (F4) | Botones de decisión deshabilitados (motivo visible); flechas, filtros y lectura siguen | El estado cambia cada día; evitar responder algo que vence en el mismo cuadro. Espacio y Esc frenan (N9). |
| Confirmación F6 abierta | Solo Confirmar, No y Esc en ese bloque; el resto de la pantalla sigue activo; elegir otra fila la cancela | Es una confirmación en el lugar, no una modal. |
| Modal abierta (F5) | La lista y los atajos no reciben teclas | Foco atrapado en la modal (F5). |
| Menú de la barra abierto (N2) | La lista no reacciona a ↑ ↓ | El foco está en el menú (G7). |
| Foco en el buscador | ↑ ↓ no mueven la lista; ↓ con resultados lleva el foco a la primera fila | El campo es de texto. |
| Libro de pases cerrado | "Aceptar" (oferta) deshabilitado | Regla del juego (`windowOpen`). |
| Resuelto | Las acciones de esa decisión no están | Ya se respondió. |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Decisiones pendientes | `pendingOf(g)` (`Inbox.tsx`; propuesta: moverla a `src/engine/` porque es lógica del juego) | En cada `refresh()` (al entrar, por día de avance, tras cada acción) | Motor (calculado del estado, nunca guardado) | `Pending[]` con `k`, `key` y datos por tipo | Arreglo vacío → "Nada para decidir…" |
| Plazo de una oferta | `Offer.date` + 8 días (misma regla que `career.ts:266`) | Igual | `career.ts` | Fecha ISO | Debe salir de una función del motor (`offerDeadline(o)`), no de una suma en la interfaz como hoy (`addDaysS`) |
| Plazo de un trabajo | `g.jobOffers[].until` | Igual | `career.ts` | Fecha ISO | Sin oferta vigente → texto F2 "La oferta ya no está vigente." |
| Mensajes | `g.news` (`News`: `id`, `date`, `title`, `body`, `tag`, `clubId`, `pid`, `act`, `ref`, `me`, `read`) | Igual | `game.ts` (`news()`), tope de 300–400 | Arreglo más nuevo primero | Vacío → estado "Partida nueva" |
| Alcance de un mensaje | `isMine(g, n)` = `n.me ?? n.clubId === g.userClubId` | Igual | Motor (propuesta: exportarla desde `game.ts`) | booleano | — |
| Tema de un mensaje | Reglas de la tabla de temas (abajo) | Igual | Interfaz (clasificación de presentación) | clave de tema | Sin tema específico → solo en "Todo" |
| Sin leer | `n.read` | Al mostrarse o con "Marcar…" | `Game` | booleano | `undefined` = sin leer |
| Jugador | `g.players[pid]` (nombre, puesto, `shown`/D4, edad, `status`, `contractEnd`, `wage`, `value`, `injury`, `happy`, estadísticas) | Igual | `Game` / `squad.ts` | `Player` | No existe → "Ya no está en el fútbol argentino." |
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
| Mercado | `tag` `mercado` (ofertas, informes de ojeo) |
| Partidos | `tag` `partido`; `act` `rival` |
| Torneos | `tag` `torneo` o `premio` |
| Dirigencia | `tag` `directiva` (ofertas de trabajo, dirigencia) — tema nuevo; hoy no tiene categoría propia |

**Contadores de los chips**: mensajes sin leer del alcance "Mi club" en ese tema. En "Todo el fútbol" los chips no llevan contador. El bloque "Para decidir" lleva su propio número y no suma a los chips.

**Regla**: la pantalla no escribe en `Game` directamente. Hoy sí lo hace en cuatro lugares que este diseño reemplaza por funciones del motor: `n.read = true` (→ `markRead(g, ids, leído)`), `g.jobOffers = … filter` (→ `rejectJob(g, clubId)`), `pl.listed = true` (→ `setListed(g, pid, true)`) y la suma del plazo (→ `offerDeadline`). Ver pregunta abierta 5.

---

## 9. Events Fired

No hay analítica. Toda fila de esta tabla es una llamada al motor seguida de `save()` y `refresh()`.

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Elegir un mensaje (o entrar con uno elegido) | `markRead` (nueva) | `{ ids: [id], read: true }` | `game.ts` | Solo si estaba sin leer. Cambia estado guardado. |
| Marcar como no leído | `markRead` | `{ ids: [id], read: false }` | `game.ts` | — |
| Marcar N como leídos / Deshacer | `markRead` | `{ ids, read: true }` / `{ ids, read: false }` | `game.ts` | Deshacer usa los mismos `ids` que guardó la nota. |
| Confirmar venta | `acceptOffer` | `(g, o)` | `career.ts` | Irreversible. Mueve al jugador, la plata y borra la oferta. |
| Pedir más | `haggle` | `(g, o)` → booleano | `career.ts` | Puede retirar la oferta. |
| Confirmar rechazo de oferta | `rejectOffer` | `(g, o)` | `career.ts` | Irreversible. |
| Confirmar trabajo | `acceptJob` | `(g, clubId)` | `career.ts` | Irreversible; cambia `g.userClubId`. |
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

Nivel **Estándar**. Requisitos de `design/accessibility-requirements.md` que la bandeja tiene que cumplir: AV-01, AV-02 (en lo que use el acento), AV-03, AV-04, AV-06, AV-07, AV-08, AV-09, AV-13; AM-01, AM-02, AM-03 (no sumar atajos de una tecla), AM-07 (modales), AM-09; AC-02, AC-03, AC-05, AC-06, AC-07, AC-09.

**Cómo resuelve la bandeja los huecos de la biblioteca**

| Hueco | Resolución en la bandeja | ¿Depende de un arreglo global? |
|-------|--------------------------|-------------------------------|
| G1 (Espacio con un control enfocado avanza el día) | Espacio activa el botón, chip o segmentado enfocado. Sobre una fila de la lista (`role="option"`) pasa a Continuar a propósito, porque la opción no tiene función propia con Espacio | Sí: la guarda de `App.tsx` (AM-02) |
| G3 (pestañas y segmentados sin ARIA) | Los filtros dejan de ser pestañas: son grupos de botones con `aria-pressed` (alcance: `role="group"` con `aria-label="Alcance"`; temas: `aria-label="Tema"`). La lista es `role="listbox"` con `aria-label="Mensajes"` y filas `role="option"` con `aria-selected`; el bloque de pendientes es un `role="group"` con nombre dentro del listbox. La nota F7 lleva `role="status"`. Las modales, `aria-labelledby` | `Seg` necesita `aria-pressed` (G3); `Modal`, `aria-labelledby` |
| G4 (ficha breve sin teclado ni toque) | Ningún dato de decisión depende de la ficha breve: las tarjetas del panel muestran puesto, valoración, edad, rol, contrato y valor | Mostrar I1 con el foco es el arreglo global |
| G5 (destructivas sin confirmación) | F6 en Aceptar y Rechazar de ofertas y de trabajos. Sin F6: Pedir más (riesgo escrito), Que hable el ayudante, Declararlo transferible y Marcar como leídos (reversibles o de bajo costo) | No |
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
| Texto del chip activo y del segmento activo | `--accent-soft` con borde de acento (no relleno de acento) | 4,5:1 | TBD | [ ] — **diseño:** el chip activo no usa texto blanco sobre el acento (el patrón que hoy falla en `.seg button.on`, 2,45:1) |
| Contador del chip | `--panel2` / `--panel3` | 4,5:1 | TBD | [ ] |
| Botón primario (Aceptar, Responder, Siguiente pendiente…) | Acento del club | 4,5:1 | **1,77 con el acento por defecto; < 4,5 en 83 de 86 clubes (falla)** | [ ] — bloqueado por AV-01/AV-02 (decisión de estética pendiente) |
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
| Chip o segmento activo | Todos | Borde, ✓, negrita y `aria-pressed` (AV-13) |
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
7. Lista (una parada: la fila elegida; ↑ ↓ Inicio Fin Re Pág Av Pág adentro; "Mostrar más" al final se alcanza con ↓ y Enter)
8. Panel de lectura: "Marcar como no leído" → tarjeta del jugador → tarjeta del club → botones de acción en orden visual → "Siguiente pendiente" (si está) → botones dentro de la nota F7 ("Deshacer")
9. Sigue a la barra inferior del documento (no hay ciclo dentro de la pantalla: no es modal)

Enter en la lista salta al primer botón de acción del punto 8; Esc desde el punto 8 vuelve al 7. En el detalle del celular: ◂ Bandeja → ‹ › → título → tarjetas → cuerpo (no enfocable) → barra de acciones.

**Screen reader announcements for key state changes** (alcance barato que permite el nivel Estándar; el lector de pantalla completo es del nivel Completo):

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Foco en una fila de decisión | "Para decidir. Oferta, Racing Club. Racing ofrece 2,4 millones de dólares por Juan Pérez. Vence en 3 días." (nombre accesible de la opción) | Al llegar el foco |
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
- [ ] Cada tipo de la tabla de plantillas (oferta, trabajo, quiere irse, conferencia, lesión, resultado, ojeo, rival, entrenamiento, temporada) muestra las tarjetas, cifras y acciones de esa tabla.
- [ ] Una lesión muestra los días que faltan hoy (no los del mensaje), la fecha de vuelta y cuántos partidos del club se pierde.

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
- [ ] Un mensaje de un jugador que ya no existe muestra "Ya no está en el fútbol argentino." y no muestra acciones sobre él.

**Teclado e interacción**
- [ ] Con un menú de la barra superior abierto, ↑ ↓ mueven solo el menú; la selección de la lista no cambia.
- [ ] Con el foco en un botón del panel, Espacio activa ese botón y no avanza el día (requiere AM-02).
- [ ] La lista es una sola parada de Tab; ↑ ↓ mueven foco y selección juntos; Enter lleva el foco al botón primario; Esc lo devuelve a la fila.
- [ ] Esc con una confirmación abierta la cancela y deja el foco en el botón que la abrió.
- [ ] La pantalla no agrega ningún atajo de una sola tecla nuevo (revisión de `SHORTCUTS` y de los oyentes de `Inbox.tsx`).
- [ ] Ninguna llamada de la pantalla asigna propiedades de `g` directamente (revisión de código: `n.read =`, `g.jobOffers =`, `.listed =` no aparecen en `src/ui/Inbox.tsx`).

**Accesibilidad**
- [ ] Ningún texto de la pantalla queda por debajo de 12 px al 100 % (salvo los de 11 px permitidos que no sean contadores ni remitentes), medido con el inspector.
- [ ] Todo texto pasa 4,5:1 con el acento de los 86 clubes, incluido el botón primario (bloqueado hasta resolver AV-01/AV-02).
- [ ] Con el modo para daltonismo y la emulación de deuteranopía, pendientes, sin leer, elegido, chip activo, plazo corto y resultado se distinguen por texto, forma o peso.
- [ ] axe-core no informa infracciones A/AA en la bandeja con pendientes, con un mensaje elegido y en el detalle del celular.
- [ ] Los filtros exponen `aria-pressed`; la lista, `role="listbox"` con `aria-selected`; la nota de resultado, `role="status"`.
- [ ] Con movimiento reducido, la entrada a la pantalla y al detalle son instantáneas.
- [ ] En 360 px, todos los objetivos táctiles miden al menos 44 × 44 px (filas, chips, acciones, volver).

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 1. Sumar `sel?: string` a `Route` (`src/store.ts`) para guardar la selección (los pendientes no tienen id numérico). Alternativa: darles id a los pendientes. Recomiendo el campo de texto. | ui-programmer + usuario | Antes de implementar | Pendiente |
| 2. ¿Espacio sobre una fila de la lista hace Continuar? Recomiendo que sí (mantiene el hábito "reviso y sigo" y la opción no usa Espacio), con el riesgo de que alguien lo apriete esperando abrir el mensaje: abrir es Enter. Si el usuario prefiere lo contrario, la lista consume Espacio y no pasa nada. | usuario | Antes de implementar | Pendiente |
| 3. Sumar a `design/ux/interaction-patterns.md` el patrón "Filtro con chips y contador" (C5) y la variante de F1 con `listbox`, bloque "Para decidir", agrupación por día y estado "Resuelto". Esta especificación no toca ese archivo. | ux-designer | Con la implementación | Pendiente |
| 4. Contraste del botón primario sobre el acento del club: bloqueado por la decisión de estética de AV-01/AV-02 (`design/accessibility-requirements.md`, pregunta 1). La bandeja usa `.btn.primary` y hereda el arreglo. | usuario + art-director | Antes de dar por cumplido el nivel Estándar en la bandeja | Pendiente |
| 5. Funciones del motor nuevas: `markRead`, `rejectJob`, `setListed`, `offerDeadline`, `injuryOutlook`; mover `pendingOf` e `isMine` a `src/engine/`. | ui-programmer (con lead-programmer) | Antes de implementar | Pendiente |
| 6. `save()` no informa si falla IndexedDB; el estado "Error al guardar" lo necesita. | ui-programmer | Con la implementación | Pendiente |
| 7. Textos del motor que contradicen la acción en el mensaje: la oferta dice "desde la pantalla de Mercado" (`career.ts:339`) y el pedido de salida "desde el Vestuario" (`squad.ts:83`). Proponer "Podés responder desde este mensaje." | usuario (texto) + gameplay-programmer | Con la implementación | Pendiente |
| 8. AC-02: el avance no frena antes de que venza una decisión ya pendiente. La bandeja muestra el plazo, pero la protección completa es de F4. Recomiendo frenar el avance el día anterior al vencimiento. | usuario + ui-programmer | Con AC-02 | Pendiente (fuera de esta pantalla) |
| 9. Icono de fila: esta especificación usa siempre el ícono redondo por tema (como el mosaico del Inicio) y lleva cara y escudo al panel. Confirmar con el art-director que se pierde la cara en la lista a cambio de coherencia con el Inicio. | art-director + usuario | Antes de implementar | Pendiente |
| 10. El selector de alcance usa C1 (`Seg`), cuyo estado activo hoy es texto blanco sobre acento (2,45:1). La bandeja pide el mismo tratamiento que el chip activo (borde + fondo suave + ✓); si se cambia en `Seg`, afecta a todas las pantallas. | art-director + ui-programmer | Antes de implementar | Pendiente |
