# Requisitos de accesibilidad

> **Estado**: Comprometido (nivel elegido por el usuario; cumplimiento parcial, ver brechas al final)
> **Autor**: usuario + ux-designer
> **Última actualización**: 2026-11-14
> **Nivel de accesibilidad comprometido**: Estándar
> **Plataformas**: Web. Navegador de escritorio primero (mouse y teclado); celular por navegador (pantalla táctil, barra inferior debajo de 760 px).
> **Normas externas**:
> - WCAG 2.1 nivel AA para toda la interfaz, más dos criterios de WCAG 2.2 AA: 2.5.8 (tamaño de los objetivos táctiles) y 2.4.11 (foco no tapado).
> - Game Accessibility Guidelines: niveles básico e intermedio, en lo que aplica a un juego de gestión por turnos.
> - AbleGamers / CVAA: no aplica. El juego no tiene chat, voz ni mensajería entre personas.
> - Xbox Accessibility Guidelines (XAG): No. No hay versión de consola.
> - PlayStation Accessibility: No.
> - Apple / Google: no aplica. No hay app nativa; en el celular rige lo que da el navegador.
> **Consultor de accesibilidad**: ninguno.
> **Documentos vinculados**: `CLAUDE.md`, `docs/plan-ui-ux.md` (la etapa 6 ya hizo trabajo de accesibilidad). No existen `design/gdd/systems-index.md` ni `design/ux/interaction-patterns.md`.
> **Plantilla**: Accessibility Requirements

> **Supuestos de esta versión**
> - No hay GDD ni documento de concepto. El juego se describe con `CLAUDE.md` y `docs/plan-ui-ux.md`, y los "sistemas" de la matriz son las pantallas y los módulos de `src/ui/`.
> - Entrada: mouse y teclado en escritorio, toque en el celular. **El gamepad queda fuera de alcance**: no hay soporte y no se pide.
> - El juego no tiene audio: no hay música, efectos ni voces (no aparece `Audio`, `AudioContext` ni ningún archivo de sonido en `src/`). Por eso los requisitos auditivos de la plantilla quedan como reglas para el día que se agregue sonido.
> - El estado de cada requisito sale de leer el código, sin correr el juego. Lo que solo se puede confirmar en el navegador dice "a confirmar en navegador".
> - Los contrastes se calcularon con la fórmula de WCAG 2.1 sobre los valores finales de los tokens. `src/styles.css` redefine `:root` tres veces y mandan los del bloque "portal" (líneas 393-395). El acento lo pone cada club en tiempo de ejecución (`clubTheme` en `src/ui/common.tsx:22`), así que también se calculó para los colores de los 86 clubes argentinos de `src/data/db.json`.

---

## Definición del nivel de accesibilidad

### Definiciones de los niveles

| Nivel | Compromiso | Esfuerzo típico |
|------|----------------|----------------|
| **Básico** | El texto importante se lee bien con la resolución habitual. Nada depende solo del color. El juego se puede terminar sin riesgo de fotosensibilidad. (El volumen separado no aplica porque no hay audio.) | Bajo |
| **Estándar** | Lo Básico, más: controles remapeables, texto de tamaño ajustable, al menos un modo para daltonismo y ninguna acción con tiempo que no se pueda pausar o alargar. Los subtítulos no aplican porque no hay voces. En este proyecto incluye además WCAG 2.1 AA para la interfaz web. | Medio |
| **Completo** | Lo Estándar, más: lector de pantalla en menús, modo de dificultad asistida, paneles reubicables, movimiento reducido, alto contraste. | Alto |
| **Ejemplar** | Lo Completo, más: personalización total del texto, herramientas de carga cognitiva y auditoría externa. | Muy alto |

### Compromiso de este proyecto

**Nivel**: Estándar.

**Por qué**: Technical Area es un juego de gestión de fútbol que se juega por turnos. El tiempo avanza solo cuando el jugador lo pide, y el partido en vivo se puede pausar. Así que las barreras motoras de los juegos de acción casi no aparecen. Las barreras fuertes son de lectura y de color: mucho texto chico en tablas densas, escalas que van del verde al rojo, colores de clubes como acento, gráficos y una cancha 2D. Para un juego web, el nivel Estándar significa WCAG 2.1 AA: contraste, teclado completo, foco visible, texto que se agranda sin romper la pantalla y atajos que se pueden apagar. La etapa 6 ya hizo buena parte de esto (modo para daltonismo, movimiento reducido, enlace para saltar al contenido, filas de tabla con teclado), así que llegar al nivel cuesta poco. Quedarse en Básico dejaría afuera a quien usa solo el teclado o necesita remapear atajos. El lector de pantalla completo es del nivel Completo, y en una app de tablas y lienzos como esta requiere un trabajo de arquitectura que hoy no entra en el plan.

**Funciones dentro del alcance que superan el nivel Estándar** (ya hechas y se mantienen):
- Movimiento reducido (nivel Completo en la plantilla). Hay un ajuste propio y además se respeta `prefers-reduced-motion`. Hace falta porque el juego tiene transiciones de pantalla y una cancha animada.
- Paneles del día de partido reubicables (nivel Completo, "HUD repositioning"): `settings.matchPanels` y `bigPitch`.
- Delegar tareas (entrenamiento y prensa) en el ayudante. Funciona como asistencia para la carga cognitiva.
- Vista de tabla en cada gráfico del centro de datos.

**Funciones fuera del alcance**:
- Gamepad: el juego no es para consola (ver Limitaciones).
- Lector de pantalla completo para la cancha 2D (`canvas`) y para las tablas complejas (nivel Completo). Se mantienen las etiquetas ARIA baratas que ya existen.
- Modo de alto contraste (nivel Completo).
- Subtítulos, volumen por canal y audio mono: hoy no hay audio.

---

## Accesibilidad visual

Estado: **Cumple** = está hecho y el código lo prueba; **Parcial** = existe pero tiene huecos; **Falta** = no existe.

### Contrastes medidos (tokens finales)

| Par | Contraste | Mínimo | Resultado |
|---|---|---|---|
| `--text` #f1f2fa sobre `--panel` #1b1e36 | 14,64:1 | 4,5 | Cumple |
| `--dim` #a3a8c8 sobre `--panel` | 6,99:1 | 4,5 | Cumple |
| `--faint` #8a90b4 sobre `--panel` | 5,23:1 | 4,5 | Cumple (el comentario de `styles.css:395` dice 5,2) |
| `--faint` sobre `--panel2` #23274a / `--panel3` #2b3056 | 4,61:1 / **4,05:1** | 4,5 | Cumple / **Falla** |
| `--faint` sobre `--bg` #0e1022 | 6,03:1 | 4,5 | Cumple |
| `--bad` #ff5d6c sobre `--panel` / `--panel3` | 5,47:1 / **4,24:1** | 4,5 | Cumple / **Falla** |
| `--good` (acento por defecto) #3ddc97, `--warn` #ffb547, `--info` #5aa9ff sobre `--panel` | 9,24 / 9,30 / 6,65 | 4,5 | Cumple |
| Modo daltonismo: `--good` #4aa3ff, `--bad` #f08c3a, `--warn` #f3d34a sobre `--panel` | 6,20 / 6,63 / 11,07 | 4,5 | Cumple |
| Series de gráficos `--s1`, `--s2`, `--s3` sobre `--panel` | 4,49 / 4,21 / 4,80 | 3 (gráfico) | Cumple |
| `--s-muted` #5b6a80 (puntos de la dispersión) sobre `--panel` | **2,97:1** | 3 | **Falla por poco** |
| `.btn.primary` y `.btn.cta`: texto #fff sobre el acento por defecto (`styles.css:438`, `:454`) | **1,77:1** (la CTA llega a 2,44 en el otro extremo del degradé) | 4,5 | **Falla** |
| `.seg button.on`: #fff sobre acento al 85 % (`styles.css:459`) | **2,45:1** | 4,5 | **Falla** |
| `.mb-clock.live`: #fff sobre acento al 80 % (`styles.css:614`) | **2,76:1** | 4,5 | **Falla** |
| `.cvd .ovr.t5`: #fff sobre #3987e5 (`styles.css:270`) | **3,64:1** | 4,5 (14,7 px en negrita no cuenta como texto grande) | **Falla** |
| `.ovr.t1`: #fff sobre #6b7789 | 4,54:1 | 4,5 | Cumple, sin margen |
| Anillo de foco (`--accent`) sobre `--panel`, para los 86 clubes | mínimo 3,34:1 | 3 | Cumple |
| Foco de `.tn-opt`: solo cambia el fondo de `--panel2` a `--panel3` (`styles.css:345`) | **1,14:1** | 3 | **Falla** |

**El acento de cada club** (`clubTheme`, `src/ui/common.tsx:22-28`), calculado para los 86 clubes de primera, segunda y tercera división:
- Texto blanco de los botones primarios sobre el acento: **no llega a 4,5:1 en 83 clubes** y no llega a 3:1 en 33. El peor caso es Defensa y Justicia (#ffd400), con 1,43:1.
- `ink()` (`common.tsx:20`) elige entre tinta oscura y blanca con un umbral de luminancia percibida de 150, y se equivoca con los tonos medios: **en 53 clubes la tinta elegida no llega a 4,5:1** (mínimo 2,61:1; por ejemplo River #eb4c55 queda en 3,69 y Boca #7c95b5 en 3,08).
- El acento usado directamente como texto sobre el panel (`.acc`, `.chip.acc`) **no llega a 4,5:1 en 35 clubes** (mínimo 3,34:1, Lanús #a05d71).
- Los títulos de tarjeta mezclan el acento con un 38 % de blanco (`styles.css:405`) y quedan bien (11,23:1 con el acento por defecto).

### Requisitos visuales

| ID | Requisito | Nivel | Verificación | Estado | Evidencia | Pantallas |
|---|---|---|---|---|---|---|
| AV-01 | Texto común: contraste ≥ 4,5:1 contra su fondo real. Texto grande (≥ 18,7 px en negrita o ≥ 24 px): ≥ 3:1. | Estándar (WCAG 1.4.3) | Script de contraste sobre los tokens y sobre el acento de todos los clubes; revisión con el inspector en cada pantalla | **Parcial** | Los tokens neutros cumplen (tabla de arriba). Fallan el texto sobre el acento (`styles.css:438`, `:454`, `:459`, `:614`), `ink()` (`common.tsx:20`), `--faint` y `--bad` sobre `--panel3`, y `.cvd .ovr.t5` | Todas; las más afectadas son la barra superior (Continuar), los segmentos de Ajustes, Tácticas y Entrenamiento, el marcador del partido y la ficha del jugador |
| AV-02 | El acento del club se ajusta solo: como fondo de texto, la tinta se elige por contraste WCAG (no por luminancia percibida); como texto o ícono sobre el panel, se aclara hasta llegar a 4,5:1. | Estándar | Prueba unitaria de `clubTheme` e `ink` sobre los colores de `db.json`; ningún club por debajo del mínimo | **Falta** | `common.tsx:20-28` no verifica contraste | Global (tema del club) |
| AV-03 | Lo que no es texto pero se necesita para entender o usar algo (bordes de controles, series de gráficos, marcas de estado, anillo de foco) tiene ≥ 3:1. | Estándar (WCAG 1.4.11) | Script de contraste | **Parcial** | Las series y el foco cumplen; `--s-muted` queda en 2,97 (`styles.css:221`) | Centro de datos (Liga), todas las pantallas (foco) |
| AV-04 | Tamaños mínimos con el texto en 100 % (base de 14 px): cuerpo ≥ 14 px; texto secundario y celdas ≥ 12 px; nada por debajo de 11 px, ni siquiera contadores, rótulos de la cancha o de la barra inferior. | Estándar (adaptado a pantalla de escritorio a unos 60 cm; la regla de 24 px de la plantilla es para TV) | Búsqueda de `font-size` menores a .79rem en CSS y TSX; inspección a 100 % | **Parcial** | Base de 14 px (`styles.css:8`). Por debajo del piso: `.slot .pc-role` .6rem, `.pc-role` .64rem, `.favs-h` .66rem, `.tabs .cnt` y los rótulos de la barra inferior .68rem = 9,5 px. Las insignias (`.nav .dot`, `.tn-opt .dot`) y el contador de favoritos (`.tn-count`) pasaron a 12 px en la fase 5 de la bandeja | Tácticas (cancha), barra superior y barra inferior, Bandeja, Comparador |
| AV-05 | Tamaño de texto ajustable dentro del juego, de 90 % a al menos 150 %, y que escale todo el texto, también el de los gráficos. | Estándar | Ajustes, todas las opciones, recorrido por las pantallas principales | **Parcial** | Hay cuatro pasos de 90 % a 120 % (`Nav.tsx:182`, `App.tsx:74`). Los rótulos de los gráficos usan px fijos (`styles.css:229-230`, 11 px) y el lienzo de la cancha usa 13 px fijos (`Pitch2D.tsx:155`) | Ajustes, Centro de datos, Partido |
| AV-06 | Con zoom del navegador al 200 % (en 1280 px de ancho) y en 320 px de ancho no se pierde contenido ni aparece desplazamiento horizontal de página. Las tablas pueden ocultar columnas como ya lo hacen. | Estándar (WCAG 1.4.4 y 1.4.10) | Zoom al 200 %; emulación de 360 y 320 px en DevTools | **Parcial** (a confirmar en navegador) | El zoom está permitido (`index.html`, viewport sin `maximum-scale`). Hay diseño de celular a 760 px (`styles.css:287-321`, `:474-479`) y `PlayerTable` oculta columnas por prioridad. El plan dice que inicio, plantel y partido no desbordan; el resto no se verificó | Todas |
| AV-07 | Al menos un modo para daltonismo que cubra **todas** las escalas y estados con color: valoración, atributos, físico, forma, resultados, zonas de tabla, puesto, fuera de puesto, tarjetas. Sin colores fijos que esquiven el modo. | Estándar | Activar el modo y emular protanopía, deuteranopía y tritanopía en DevTools (Rendering) en cada pantalla | **Parcial** | Existe el modo (`.cvd`, `styles.css:268-273`; ajuste en `Nav.tsx:187`; clase en `App.tsx:78`). No cubre los colores fijos de `.formbars` (`:549`), `.ratbox` (`:550`), `.pc-rt`/`.off` (`:571-572`), `.evi` (`:620-623`) ni la cancha (`Pitch2D.tsx:151`). En la ficha, `.attr .v.a-top` (`:542`) tiene más especificidad que `.cvd .a-top` (`:272`) y le gana | Ficha del jugador, Tácticas, Partido, Posiciones |
| AV-08 | Nada se comunica solo con color: cada señal de color tiene un respaldo de texto, forma, posición o número que funciona en los tres tipos de daltonismo. | Básico (WCAG 1.4.1) | Auditoría de la tabla siguiente | **Parcial** | Ver la auditoría: 3 faltantes y 5 parciales | Ver la auditoría |
| AV-09 | Foco visible en todo lo que se alcanza con el teclado: contorno de ≥ 2 px con ≥ 3:1, y que no quede tapado por la barra superior ni por la inferior. | Estándar (WCAG 2.4.7, 2.4.11 de 2.2) | Recorrido con Tab por cada pantalla | **Parcial** | Reglas generales en `styles.css:14` y `:263` (acento ≥ 3,34:1 en todos los clubes). Excepciones: `.tn-opt:focus-visible` sin contorno (`:345`); el gráfico de líneas no muestra nada al recibir el foco hasta que se aprieta una flecha (`:234`, `charts.tsx:112`). Que el foco no quede tapado, a confirmar en navegador | Menús de la barra superior, Centro de datos |
| AV-10 | Movimiento reducido: ajuste propio más `prefers-reduced-motion`. Apaga transiciones, animaciones de la interfaz, desplazamiento suave y el festejo animado del gol. El movimiento de los jugadores en la cancha se mantiene, porque sin él no se entiende la jugada. | Completo (dentro del alcance) | Activar el ajuste y el del sistema; recorrer pantallas y jugar un gol | **Parcial** | CSS cubierto (`styles.css:118`, `:218`, `:259-260`; `App.tsx:77`; `Nav.tsx:186`). No están cubiertos el festejo de gol del lienzo (`Pitch2D.tsx:162-166`) ni `scrollIntoView({ behavior: 'smooth' })` (`MatchView.tsx:78`) | Partido; global |
| AV-11 | Sin destellos: nada parpadea más de 3 veces por segundo. | Básico | Revisión de animaciones | **Cumple** | El festejo del gol es un solo fundido de 1,8 s (`Pitch2D.tsx:162-166`); `pulse` dura 1,6 s (`styles.css:209-210`) | Partido |
| AV-12 | Los gráficos no dependen del color ni del tooltip: leyenda o rótulo directo, tooltip también por teclado y una vista de tabla. | Estándar | Revisión de `charts.tsx` y prueba con teclado en el Centro de datos | **Cumple** | `ChartCard` con "Ver tabla" (`charts.tsx:34-46`); barras y puntos con foco y `aria-label` (`:79-81`, `:168`); líneas con flechas (`:112`); rótulos directos (`:109`) | Centro de datos, Comparador |
| AV-13 | Los estados de los controles (segmento activo, pestaña, opción) se distinguen por algo más que el tono: peso, subrayado o marca, más `aria-pressed`/`aria-selected`. | Estándar | Revisión y emulación de daltonismo | **Parcial** | Las pestañas usan subrayado (`styles.css:461`). El segmento activo solo cambia el fondo y el peso (`:459`), sin `aria-pressed` (`common.tsx:114-116`). "Delegado" agrega ✓ (`Week.tsx:39`) | Ajustes, Tácticas, Entrenamiento, Partido |
| AV-14 | Subtítulos | Estándar | — | **No aplica** | No hay voces ni audio | — |

### Auditoría de "solo color"

| Lugar | Señal de color | Qué comunica | Respaldo sin color | Estado |
|---|---|---|---|---|
| Posiciones: zonas de la tabla (`Tables.tsx:50-72`; `.zone-q/.zone-p/.zone-r`, `styles.css:68`) | Barra a la izquierda verde, azul o roja | Clasifica, Reducido o promoción, desciende | Ninguno. La leyenda dice "Verde: … Azul: …" (`Tables.tsx:65`). **En modo daltonismo `--good` pasa a #4aa3ff y queda casi igual a `--info` #5aa9ff, y la leyenda queda mal** | **Falta** |
| Cancha 2D (`Pitch2D.tsx:151`; `duoColors`, `common.tsx:190-196`) | Color de cada club en los puntos | De qué equipo es cada jugador | Solo el sentido del ataque. `duoColors` separa los colores por distancia RGB, que no sirve para daltonismo, y el modo `.cvd` no los toca | **Falta** |
| Insignias de la navegación (`.dot` y `.dot.warn`, `App.tsx:162`, `:184`) | Acento o ámbar | Sin leer o pendiente de decidir | Solo el `title`. El botón "Pendientes" de la barra muestra el texto, pero la insignia no | **Falta** (bajo impacto) |
| Resultados en Inicio (`Home.tsx:79`, `.rdot`; `Home.tsx:147`, marcador en `good`/`bad`) | Punto o número verde, gris o rojo | Ganado, empatado o perdido | `aria-label` en el punto y el marcador, que hay que interpretar según local o visitante | **Parcial**: agregar la letra G/E/P como en `FormChips` (`Nav.tsx:22`) |
| Calendario (`Week.tsx:94-96`) | Día en verde o rojo | Resultado del partido | El marcador, si se abre | **Parcial** |
| Forma del jugador (`PlayerPage.tsx:112`, `.formbars`) | Barras verdes, amarillas o rojas, con colores fijos | Puntajes de los últimos partidos | Alto de la barra y `title` con el número | **Parcial**: mostrar el número; tomar los colores de los tokens |
| Fuera de puesto en Tácticas (`Tactics.tsx:60`, `.pc-rt.off`) | Valor naranja en lugar de verde | El jugador está fuera de su mejor puesto | Solo el `title` | **Parcial**: agregar un ícono o una marca |
| Tarjetas en el relato (`.evi.yc` y `.evi.rc`, `styles.css:621`) | Rectángulo amarillo o rojo con la misma forma | Amarilla o roja | El texto del relato; en el marcador, la roja lleva ▮ (`MatchView.tsx:97`) | **Parcial** |
| Valoración (`.ovr`), atributos (`attrClass`), puntajes (`ratClass`) | Escala de colores | Nivel | El número siempre está visible | Cumple |
| Físico, moral y conformidad (`Cond`, `common.tsx:78-81`) | Barra verde, amarilla o roja | Estado | El número al lado | Cumple |
| Forma de los clubes (`FormChips`, `Nav.tsx:22`; Centro de datos, `DataCenter.tsx:181`) | Ficha de color | G/E/P | La letra | Cumple |
| Pendientes en la bandeja (`.ib-row.pend`) | Barra ámbar | Hay que decidir | Sección "Pendientes" y texto con la fecha en que vence (`Inbox.tsx:124-130`) | Cumple |
| Puesto (`.pill.GK/DF/MF/FW`) | Color del texto | Línea | La sigla del puesto | Cumple |
| Mapa de remates y dominio (`common.tsx:159-188`) | Color de cada club | Equipo | Lado de la cancha y arriba o abajo de la línea | Cumple |
| Series del Centro de datos | `--s1/--s2/--s3`, `--s-muted` | Serie, propio o ajeno | Leyenda, rótulo directo, tamaño del punto, tabla | Cumple |
| Comparador (`PlayerTable.tsx:260-261`) | Mejor valor en `good` | Quién es mejor | Negrita | Cumple |

---

## Accesibilidad motora

| ID | Requisito | Nivel | Verificación | Estado | Evidencia | Pantallas |
|---|---|---|---|---|---|---|
| AM-01 | Todo se puede hacer solo con el teclado: navegar, abrir fichas, ordenar y filtrar tablas, seleccionar, negociar, armar la táctica, jugar el partido y cerrar ventanas. Ningún clic de mouse queda sin equivalente. | Estándar (WCAG 2.1.1) | Recorrido completo de una semana de juego solo con teclado | **Parcial** | Cumplen: filas `tr.click` con Tab y Enter (`App.tsx:83`, `:112`), menús con flechas y Esc (`TopNav.tsx:21-33`), cancha de Tácticas con botones y clic-clic sin arrastre (`Tactics.tsx:57-58`), gráficos (`charts.tsx`). Faltan: **ordenar columnas** (`<th onClick>` sin foco, `PlayerTable.tsx:186`); celdas y `div` clickeables sin foco (`Locker.tsx:27`, `:36`, `Week.tsx:62`, `:96`, `Home.tsx:124`, `Market.tsx:55`, `Tables.tsx:31`); escudos con `data-cid` que solo se abren con el mouse (`Nav.tsx:86-90`); elegir un punto de la dispersión con Enter (`charts.tsx:168`) | Plantel, Mercado, Vestuario, Entrenamiento, Calendario, Inicio, Posiciones, Centro de datos |
| AM-02 | Ninguna tecla global le gana a la activación nativa: Espacio o Enter sobre un botón, enlace o fila enfocada activa ese elemento y no la acción global. | Estándar | Enfocar un botón cualquiera y apretar Espacio | **Falta** (a confirmar en navegador) | `App.tsx:110-120` solo excluye `INPUT`, `TEXTAREA` y `SELECT`. Con un botón enfocado, Espacio hace `preventDefault()` y `advance()`, o sea que **avanza un día en lugar de apretar el botón**. En el partido, `MatchView.tsx:76` hace lo mismo con la pausa | Global, Partido |
| AM-03 | Los atajos de una sola tecla (Espacio, 0-9, `/`, `?`; en el partido 1-4, C, T, R, M, P) se pueden apagar o remapear. | Estándar (WCAG 2.1.4, nivel A) | Ajustes: apagar los atajos y comprobar que esas teclas no hacen nada | **Cumple fuera del partido** (fase 5 de la bandeja) · el partido sigue abierto | Interruptor "Atajos de una tecla" en Ajustes › Accesibilidad (`settings.singleKeys`, `store.ts`; `SettingsModal` en `Nav.tsx`), encendido por defecto. Apagado, `App.tsx` no responde a Espacio, Mayús + Espacio, 0-9, `/` ni `?` (Espacio sobre una fila de lista tampoco desplaza); siguen Ctrl + K, Alt + flechas, Esc y Enter. La ayuda (`ShortcutsHelp`) muestra el estado y marca los de una tecla; las pistas de la barra de comandos y los `title` de las teclas desaparecen. Verificado en `tests/ui/bandeja.cjs` (cinco resoluciones). **Abierto**: los atajos del día de partido (`MatchView.tsx`: Espacio, 1-4, M, C, T, R, P) no entran en el interruptor, por decisión de alcance de esta fase | Ajustes, global, Partido |
| AM-04 | Remapeo de atajos: cada atajo de `SHORTCUTS` se puede reasignar, se avisa si dos chocan, se guarda en `localStorage` como el resto de los ajustes y la ayuda (`?`) muestra las teclas actuales. Ctrl+K, Esc, Tab y Enter quedan fijos. | Estándar (adaptado de "full input remapping" a teclado) | Remapear todo, reiniciar y jugar una semana y un partido | **Falta** | No existe; las teclas están escritas en el código | Ajustes, Atajos |
| AM-05 | Nada exige mantener apretado, apretar varias teclas a la vez (salvo los modificadores conocidos, que tienen alternativa con un clic) ni pulsar rápido. | Estándar | Revisión de los controladores de teclado | **Cumple** | Mayús+clic para ordenar o elegir rangos y Mayús+Espacio tienen alternativa (botón "Ir al partido", `App.tsx:219`; casillas una por una). No hay acciones de mantener apretado | Plantel, global |
| AM-06 | Nada exige arrastrar: todo lo que se pueda arrastrar también se hace con clics. | Estándar (WCAG 2.5.7 de 2.2) | Revisión | **Cumple** | No hay `draggable` ni `onDrag`; Tácticas usa clic-clic (`Guide.tsx:76`, `Tactics.tsx:57`) | Tácticas, Inicio (mosaicos) |
| AM-07 | Ventanas: el foco entra al abrir, Tab queda adentro, Esc cierra y el foco vuelve a donde estaba. Vale para todas las capas: ventanas, barra de comandos y guía. | Estándar | Abrir y cerrar cada capa con el teclado | **Parcial** | `Modal` cumple (`common.tsx:91-113`). La barra de comandos no usa `Modal`: no retiene Tab ni devuelve el foco (`Nav.tsx:146-162`). La guía enfoca el botón y responde a flechas y Esc (`Guide.tsx:37-46`), pero Tab se escapa al fondo | Barra de comandos, Guía |
| AM-08 | Enlace para saltar al contenido, primero en el orden de Tab. | Estándar (WCAG 2.4.1) | Tab al cargar | **Cumple** | `App.tsx:180`, `styles.css:264-266` | Global |
| AM-09 | Objetivos táctiles en el celular: ≥ 24×24 px de CSS (WCAG 2.2 2.5.8), salvo que haya un control equivalente más grande; la barra inferior y la acción principal, ≥ 44 px. | Estándar (dentro del alcance) | Emulación de 360 px y medición | **Parcial** (a confirmar en navegador) | La barra inferior mide 62 px (`styles.css:289`). `.btn.sm` queda cerca de 24 px; los puntos de noticias miden 8 px de alto (`styles.css:500`), aunque tienen flechas equivalentes (`Home.tsx:64`) | Celular: todas |
| AM-10 | Gamepad | — | — | **Fuera de alcance** | Ver Limitaciones | — |
| AM-11 | Paneles del partido reubicables | Completo (dentro del alcance) | Menú de paneles (P) | **Cumple** | `settings.matchPanels`, `bigPitch` (`MatchPanels.tsx`) | Partido |

---

## Accesibilidad cognitiva

| ID | Requisito | Nivel | Verificación | Estado | Evidencia | Pantallas |
|---|---|---|---|---|---|---|
| AC-01 | Ninguna acción con tiempo real que no se pueda pausar: el tiempo de juego avanza solo cuando el jugador lo pide, el avance largo se frena con Esc o con un botón y el partido arranca en pausa y se pausa solo en los momentos clave. | Estándar | Revisión y prueba | **Cumple** | `advance` avanza por pedido y frena con decisiones nuevas o con Esc (`App.tsx:113`, `:128-156`, `:216`). El partido arranca en pausa (`MatchView.tsx:24`) y se pausa con una roja, una lesión propia, el entretiempo o el final (`:45`). Velocidad 1-4 | Global, Partido |
| AC-02 | Lo que vence en tiempo de juego (ofertas, trabajos, prensa) muestra la fecha límite, y el avance automático frena antes de que venza algo pendiente aunque no sea nuevo. | Estándar | Dejar una oferta pendiente y usar "Ir al partido" | **Cumple** (fase 5 de la bandeja) | La fecha límite se muestra en la fila y en el panel. `expiringKeys(g)` (`src/engine/inbox.ts`) da las ofertas y ofertas de trabajo cuyo último día para responder es hoy; `advance` (`App.tsx`) frena ese día (el anterior al vencimiento), una vez por decisión, y abre la bandeja con esa decisión elegida; si ya es el último día al apretar "Ir al partido", no avanza. Verificado en `tests/ui/bandeja.cjs`. La prensa no vence: si no se responde, habla el ayudante (ya lo dice la bandeja). "Continuar" (un día) no frena: es un paso manual | Bandeja, barra superior |
| AC-03 | Nada que se pueda leer o decidir se cierra solo. | Estándar | Revisión de temporizadores | **Cumple** | Los únicos temporizadores son el avance, el partido y el retardo de la ficha breve (`Nav.tsx:78`); el carrusel de noticias es manual (`Home.tsx:64-69`) | Inicio, global |
| AC-04 | La guía y las ayudas se pueden volver a ver. | Estándar | Ajustes, "Volver a ver la guía" y volver a mostrar las ayudas | **Cumple** | `Nav.tsx:189-190`; al volver a mostrar las ayudas se reinician las vistas (`seenTips: []`); `PageTip` (`Guide.tsx:83-93`) | Guía, Ajustes |
| AC-05 | Toda explicación que sirve para decidir (efecto de una instrucción, rol, intensidad, cláusula) se puede leer con teclado y con toque, no solo con `title`. | Estándar | Revisar los `title` de más de 60 caracteres y su alternativa | **Parcial** | 12 `title` largos explicativos (por ejemplo `Tactics.tsx:178`, `Locker.tsx` en la cláusula) son la única fuente del texto. Los `title` no aparecen con foco ni con toque | Tácticas, Vestuario y negociación, Centro de datos, Partido |
| AC-06 | La ficha breve (al pasar el mouse) no es la única fuente de ningún dato, se cierra con Esc y también aparece cuando el elemento recibe el foco. | Estándar (WCAG 1.4.13) | Revisión y teclado | **Parcial** | Todos sus datos están en la ficha completa (`Nav.tsx:96-126`). Solo responde a `mouseover` y no se cierra con Esc (`Nav.tsx:73-93`) | Global |
| AC-07 | El objetivo y lo pendiente siempre están a un clic o una tecla. | Estándar | Revisión | **Cumple** | Botón "Pendientes" en la barra (`App.tsx:225`), objetivo de la dirigencia en la guía y en Club, barra de comandos (Ctrl+K) | Global |
| AC-08 | Carga cognitiva: las tareas repetitivas se pueden delegar, y la dificultad se elige al empezar (club y antecedentes del DT) y se explica en esa pantalla. | Estándar (adaptado de "difficulty options" a un juego de gestión) | Revisión | **Cumple** | Delegar entrenamiento y prensa (`Week.tsx:39`, `:170-172`); dificultad indicada al empezar (`Start.tsx:117`) | Inicio de partida, Entrenamiento, Prensa |
| AC-09 | Cada pantalla y cada ventana tiene un título visible; las ventanas lo exponen como nombre accesible (`aria-labelledby`). | Estándar (WCAG 2.4.6) | Revisión | **Parcial** | Los títulos se ven. `Modal` no tiene `aria-labelledby` (`common.tsx:112`); la guía sí (`Guide.tsx:57`) | Ventanas |

---

## Accesibilidad auditiva

El juego no tiene audio. Todo lo que pasa se ve: relato escrito, marcador, cancha, bandeja.

| ID | Requisito | Nivel | Verificación | Estado | Evidencia | Pantallas |
|---|---|---|---|---|---|---|
| AA-01 | Si se agrega sonido (gol, silbato, aviso), cada sonido que cambie lo que el jugador debe hacer tiene un equivalente visual, y hay volumen separado para música, efectos e interfaz desde el primer día. | Básico | Revisar este documento cuando se agregue audio | **No aplica hoy** | No hay audio en `src/` | Partido, global |
| AA-02 | Subtítulos, subtítulos de efectos, audio mono | Estándar / Completo | — | **No aplica** | Sin voces ni audio espacial | — |

### Auditoría de sonidos importantes para el juego

| Sonido | Qué comunica | Respaldo visual | ¿Necesita subtítulo? | Estado |
|---|---|---|---|---|
| (ninguno: el juego no tiene sonido) | — | — | — | No aplica |

---

## Integración con las APIs de accesibilidad de la plataforma

| Plataforma | API o norma | Qué se usa | Estado | Notas |
|---|---|---|---|---|
| Web (escritorio) | HTML semántico + ARIA (WAI-ARIA 1.2) | `lang="es"`, `nav` y `aside` con `aria-label`, `aria-current`, menús con `role="menu"`, `role="dialog"`/`aria-modal`, `aria-label` en botones de ícono, `role="status"` en el avance | Parcial | Alcanza para la navegación con teclado. El lector de pantalla completo es del nivel Completo (ver Limitaciones) |
| Web: preferencias del sistema | `prefers-reduced-motion` | Se respeta | Cumple | `styles.css:118`, `:218`, `:260` |
| Web: preferencias del sistema | `prefers-contrast`, `forced-colors` | No se usan | Fuera de alcance | Alto contraste es del nivel Completo |
| Celular (navegador) | Zoom del navegador, tamaño de texto del sistema | El zoom está permitido | Parcial | La base es `font-size` en px puesto desde JS (`App.tsx:74`), así que el "solo texto" del navegador no la escala; el zoom completo sí |
| Lector de pantalla (NVDA, VoiceOver) | Árbol de accesibilidad del navegador | Sin objetivo de nivel | Fuera de alcance | El lienzo de la cancha tiene `aria-label` y el relato escrito sirve de equivalente |
| Consolas, Steam, apps nativas | XAG, Sony, Steam Input, UIAccessibility, TalkBack | — | No aplica | No hay versiones para esas plataformas |

---

## Matriz de accesibilidad por sistema

| Sistema (pantalla / archivo) | Visual | Motor | Cognitivo | Auditivo | Resuelto | Notas |
|---|---|---|---|---|---|---|
| Navegación global (`App.tsx`, `TopNav.tsx`, `Nav.tsx`) | Insignia de la bandeja con "!" además del color, 12 px y nombre accesible ("Bandeja, 4 sin leer y 2 para decidir"); foco con `--sel` | Atajos de una tecla con interruptor (falta el remapeo); barra de comandos sin retener el foco | Ficha breve solo con mouse | — | Parcial | AM-04, AM-07 |
| Inicio (`Home.tsx`) | Resultados por color | Filas `div` sin foco (`:124`) | — | — | Parcial | |
| Bandeja (`Inbox.tsx`) | ≥ 12 px; decisión elegida con forma y peso además del color; `--sel` distinto del ámbar | `listbox` con foco itinerante; acciones visibles y sin tapar en todas las anchuras (barra fija medida, `scroll-padding`); 44 px en el celular | Fecha de vencimiento visible; el avance frena el día anterior | — | Cumple (falta probar con lector de pantalla real) | Fase 5 de /team-ui |
| Plantel y tablas (`PlayerTable.tsx`, `Squad.tsx`) | `--faint` en los encabezados, que cumple sobre `--panel` | **No se puede ordenar con el teclado** | Columnas y vistas configurables | — | Parcial | AM-01 |
| Ficha de jugador (`PlayerPage.tsx`) | Forma con colores fijos; atributos fuera del modo daltonismo | — | — | — | Parcial | AV-07 |
| Ficha de club (`Nav.tsx: ClubPage`) | Acento como texto | Filas con botones | — | — | Parcial | |
| Tácticas (`Tactics.tsx`) | Rótulos de 8,4-9 px; fuera de puesto solo por color | Clic-clic, sin arrastre | Explicaciones solo en `title` | — | Parcial | AV-04, AC-05 |
| Día de partido (`MatchView.tsx`, `Pitch2D.tsx`, `MatchPanels.tsx`) | **Equipos solo por color en la cancha**; reloj en vivo con poco contraste | Espacio pausa aunque haya un botón enfocado; atajos de letra sin apagar | Arranca en pausa y se pausa solo; modo jugadas clave | — | Parcial | AV-07, AM-02, AM-03, AV-10 |
| Después del partido (`MatchPanels.tsx: PostMatch`) | Resultado como texto (Victoria, Empate, Derrota) | — | Pasos que se pueden saltear | — | Cumple | |
| Semana: entrenamiento, calendario, cuerpo técnico (`Week.tsx`) | Calendario por color | Celdas `td.click` y `div.click` sin foco | Se puede delegar | — | Parcial | |
| Vestuario, charlas y negociación (`Locker.tsx`) | Registro por color, pero con texto | `td.click` y `div` sin foco | Cláusula explicada solo en `title` | — | Parcial | |
| Mercado (`Market.tsx`) | — | Nombre clickeable en un `div` | Rangos de ojeo explicados | — | Parcial | |
| Centro de datos (`DataCenter.tsx`, `charts.tsx`) | `--s-muted` en 2,97:1; rótulos en px fijos | Teclado en barras, puntos y líneas | Vista de tabla | — | Parcial | AV-03, AV-05 |
| Posiciones, fixture, estadísticas (`Tables.tsx`) | **Zonas solo por color; la leyenda queda mal en modo daltonismo** | Llaves de la fase final en `div` | — | — | Falta | Auditoría de solo color |
| Guía y ayudas (`Guide.tsx`) | — | Tab se escapa de la guía | Se puede volver a ver | — | Parcial | AM-07 |
| Inicio de partida (`Start.tsx`) | Botón primario con el acento por defecto (1,77:1) | Muestras de color con `aria-label` "Opción n" | Dificultad explicada | — | Parcial | |
| Ajustes (`Nav.tsx: SettingsModal`) | Segmento activo con poco contraste | `Modal` correcto | — | — | Parcial | Falta el ajuste de atajos |
| Diseño de celular (`styles.css` ≤ 760 px) | Barra inferior a 9,5 px | Objetivos de unos 24 px | — | — | Parcial | AM-09 |

---

## Plan de pruebas de accesibilidad

| Función | Método | Casos | Criterio de aprobación | Responsable | Estado |
|---|---|---|---|---|---|
| Contraste de los tokens | Automático: script con la fórmula WCAG sobre los tokens finales de `styles.css` | Todos los pares texto/fondo de la tabla de contrastes | Texto ≥ 4,5:1; texto grande y gráficos ≥ 3:1 | ux-designer | Hecho una vez (esta revisión); falta automatizarlo |
| Contraste del acento | Automático: prueba de `clubTheme`/`ink` con los colores de `db.json` | Los clubes de las divisiones 1, 2 y 3 | Ningún club por debajo de 4,5:1 (texto) ni de 3:1 (foco) | ui-programmer | Pendiente |
| Teclado | Manual: una semana completa y un partido sin mouse | Navegar, ordenar una tabla, ofertar, armar la táctica, hacer un cambio, conferencia | Todo se puede hacer; foco siempre visible; Espacio sobre un botón aprieta el botón | qa-tester | Pendiente |
| Atajos | Manual | Apagar los atajos de una tecla; remapear todos; reiniciar | Las teclas apagadas no hacen nada; los cambios persisten; se avisa si chocan | qa-tester | Pendiente (la función no existe) |
| Daltonismo | Manual: modo `.cvd` más emulación de DevTools (protanopía, deuteranopía, tritanopía, acromatopsia) | Posiciones, ficha, Tácticas, partido en vivo, Centro de datos | Ninguna información se pierde; las zonas y los equipos se distinguen | ux-designer | Pendiente |
| Tamaño de texto y zoom | Manual: texto al 120 % (y al 150 % cuando exista) y zoom al 200 % en 1280 px | Las pantallas principales | Sin solapamientos, sin desplazamiento horizontal de página, gráficos legibles | qa-tester | Pendiente |
| Movimiento reducido | Manual: ajuste propio y del sistema | Cambio de pantalla, ventanas, partido con gol | Sin transiciones ni festejo animado; la cancha sigue legible | ux-designer | Pendiente |
| Celular | Manual: emulación de 360×740 y un teléfono real | Inicio, plantel, Tácticas, partido, bandeja | Sin desborde; objetivos ≥ 24 px; barra inferior ≥ 44 px | qa-tester | Pendiente |
| Regresiones | Automático: las pruebas de navegador del plan (`docs/plan-ui-ux.md`, "Cómo medimos") más axe-core en Playwright | Una corrida por flujo principal | Sin infracciones de WCAG A/AA nuevas | ui-programmer | Pendiente |

---

## Limitaciones intencionales conocidas

| Función | Nivel que la pide | Por qué no se incluye | Riesgo e impacto | Mitigación |
|---|---|---|---|---|
| Gamepad | Estándar en la plantilla (cambio de método de entrada) | Juego web de escritorio pensado para mouse y teclado; no hay versión de consola | Quien solo juega con gamepad no puede jugar | Teclado completo y remapeable (AM-01, AM-04); las herramientas del sistema que convierten el gamepad en teclado funcionan si los atajos se pueden remapear |
| Lector de pantalla completo | Completo | Tablas densas con columnas dinámicas y una cancha en `canvas`; hace falta un trabajo de ARIA y de anuncios en vivo que no entra en el plan | Las personas ciegas no pueden jugar de forma independiente | Se mantienen las etiquetas existentes (`aria-label`, roles de menú y de diálogo); el relato escrito equivale a la cancha; revisar después del nivel Estándar |
| Alto contraste (`forced-colors`, `prefers-contrast`) | Completo | Fuera del nivel elegido | Quien usa los colores forzados de Windows puede perder bordes y estados | Que los estados no dependan solo del fondo (AV-13) mejora el resultado con colores forzados |
| Subtítulos, volumen por canal, audio mono | Básico, Estándar y Completo | No hay audio | Ninguno hoy | AA-01 obliga a resolverlo cuando se agregue sonido |
| Tamaño de texto sin límite | Ejemplar | El ajuste del juego llega a 150 % (objetivo) y más allá se usa el zoom del navegador | Bajo | AV-05 y AV-06 |

---

## Historial de auditorías

| Fecha | Auditor | Tipo | Alcance | Resumen | Estado |
|---|---|---|---|---|---|
| 2026-11-14 | Interno: accessibility-specialist | Auditoría de la bandeja (fase 4 de /team-ui) con Playwright, axe-core y emulación de daltonismo | Bandeja, insignia, barra superior | No cumplía: acciones recortadas y tapadas en el celular, desborde lateral, atajos sin interruptor, avance que dejaba vencer un trabajo, decisión elegida solo por color, insignia de 9,5 px | Resuelto en la fase 5 (`production/ui/bandeja/review-accessibility-specialist.md`; prueba `tests/ui/bandeja.cjs`). Abiertos: lector de pantalla real (NVDA, VoiceOver) sin probar; atajos del partido sin interruptor |
| 2026-11-14 | Interno: ux-designer | Revisión estática de código (sin correr el juego) contra el nivel Estándar | `src/styles.css`, `src/ui/*.tsx`, `index.html`, colores de los clubes de `db.json` | De 36 requisitos: 11 cumplen, 17 son parciales y 4 faltan; 3 no aplican y 1 queda fuera de alcance. Lo más grave: el texto sobre el acento del club no llega a 4,5:1 en 83 de 86 clubes; Espacio sobre un botón enfocado avanza el día; los atajos de una tecla no se pueden apagar; las zonas de las tablas y los equipos de la cancha se distinguen solo por color. Lo que la etapa 6 dice haber hecho (contraste de `--faint`, modo para daltonismo, teclado, movimiento reducido) está, pero con los huecos anotados | Abierto |

---

## Recursos externos

| Recurso | URL | Para qué sirve |
|---|---|---|
| WCAG 2.1 | https://www.w3.org/TR/WCAG21/ | Norma base: contraste, teclado, foco, reajuste del contenido, atajos (2.1.4) |
| WCAG 2.2 (2.4.11, 2.5.7, 2.5.8) | https://www.w3.org/TR/WCAG22/ | Foco no tapado, alternativas al arrastre y tamaño de los objetivos táctiles |
| WAI-ARIA Authoring Practices: menu button, dialog | https://www.w3.org/WAI/ARIA/apg/ | Patrones de menús y ventanas |
| Game Accessibility Guidelines | https://gameaccessibilityguidelines.com | Lista para juegos por costo y categoría |
| Emulación de deficiencias de visión en Chrome DevTools | https://developer.chrome.com/docs/devtools/rendering/emulate-css | Probar el modo para daltonismo |
| axe-core | https://github.com/dequelabs/axe-core | Pruebas automáticas en Playwright |
| Coblis | https://www.color-blindness.com/coblis-color-blindness-simulator/ | Simular daltonismo sobre capturas |

---

## Preguntas abiertas

| Pregunta | Responsable | Plazo | Resolución |
|---|---|---|---|
| ¿Cómo arreglamos el contraste del botón primario? (a) Mantener el color del club de fondo con la tinta elegida por contraste WCAG; (b) oscurecer o aclarar el acento hasta llegar a 4,5:1; (c) botones primarios en un color neutro propio y el club solo en detalles. Recomiendo (a) + (b): conserva la identidad del club y llega a 4,5:1 en todos. Es una decisión de estética. | usuario (con art-director) | Antes de corregir AV-01 y AV-02 | Sin resolver |
| ¿El remapeo arranca con un interruptor "apagar los atajos de una tecla" (cierra WCAG 2.1.4 con poco trabajo) y el editor completo viene después? | usuario + ui-programmer | Antes de la próxima etapa | **Resuelto en parte**: el usuario eligió el interruptor (fase 5 de la bandeja), hecho para los atajos globales. Pendiente: sumarle los del partido y el editor de remapeo (AM-04) |
| ¿Cómo se distinguen los equipos en la cancha 2D sin color? Opciones: aro blanco o relleno con borde para el visitante, forma distinta (círculo o rombo) o letra L/V. | usuario (con art-director) | Con AV-07 | Sin resolver |
| ¿El tamaño de texto sube a 150 %? Hace falta revisar Tácticas y la cancha a ese tamaño. | ux-designer | Con AV-05 | Sin resolver |
| ¿Se hace un nivel Completo (lector de pantalla en los menús) después de jugar la primera temporada completa? | usuario | Después de la etapa de pulido | Sin resolver |

---

## Brechas priorizadas

**P1: sin esto no se llega al nivel Estándar (fallas de WCAG A/AA que afectan todo el juego)**
1. **Contraste sobre el acento del club** (AV-01, AV-02): texto blanco en `.btn.primary`, `.btn.cta`, `.seg button.on` y `.mb-clock.live` (`styles.css:438`, `:454`, `:459`, `:614`); `ink()` con un umbral que se equivoca (`common.tsx:20`); acento como texto en 35 clubes. Arreglo: elegir la tinta por contraste WCAG y ajustar el acento en `clubTheme`.
2. **Espacio sobre un elemento enfocado dispara la acción global** (AM-02): `App.tsx:120` y `MatchView.tsx:76`. Arreglo: ignorar la tecla cuando el foco está en `button`, `a`, `[tabindex]`, `[role]` o `tr.click`.
3. ~~Atajos de una tecla que no se pueden apagar~~ (AM-03): interruptor hecho en la fase 5 de la bandeja. Queda: los atajos del partido (`MatchView.tsx`) y el remapeo (AM-04).
4. **Zonas de la tabla de posiciones solo por color, con la leyenda mal en modo daltonismo** (auditoría; `Tables.tsx:65`, `styles.css:68`, `:269`). Arreglo: marca con letra o forma por zona y una leyenda que no nombre colores.
5. **Equipos de la cancha 2D solo por color** (auditoría; `Pitch2D.tsx:151`).

**P2: completar el teclado y el modo para daltonismo**
6. Ordenar las tablas con el teclado (`PlayerTable.tsx:186`: encabezados como botones con `aria-sort`).
7. Elementos clickeables sin foco: `td.click` y `div` en `Locker.tsx`, `Week.tsx`, `Home.tsx`, `Market.tsx`, `Tables.tsx`; escudos con `data-cid`.
8. Colores fijos que esquivan `.cvd` (`.formbars`, `.ratbox`, `.pc-rt`, `.evi`, `.attr .v.a-top`) y `.cvd .ovr.t5` en 3,64:1.
9. Texto mínimo de 11 px y tamaño de texto hasta 150 %, también en los gráficos (AV-04, AV-05).
10. Explicaciones que solo están en `title` (AC-05).

**P3: pulido**
11. Barra de comandos y guía: retener el foco y devolverlo al cerrar (AM-07).
12. Foco visible en `.tn-opt` y en el gráfico de líneas (AV-09).
13. Movimiento reducido para el festejo del gol y el desplazamiento suave (AV-10).
14. Ficha breve con Esc y con foco (AC-06); `--s-muted` a ≥ 3:1; `aria-pressed` en `Seg` y `aria-labelledby` en `Modal`; objetivos táctiles en el celular fuera de la bandeja (AM-09). (AC-02, el freno antes de un vencimiento, quedó hecho en la fase 5 de la bandeja.)
