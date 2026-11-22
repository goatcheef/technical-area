# Concepto del juego: Technical Area

*Creado: 2026-11-14*
*Estado: Borrador (documentado a partir del juego ya construido y jugable)*

> **Cómo se escribió este documento.** El juego existe y se puede jugar. Este concepto se escribió leyendo el código (`src/engine/` y `src/ui/`), `CLAUDE.md` y `docs/plan-ui-ux.md`, no al revés. Cuando algo es una interpretación de diseño y no un hecho del código (pilares, público, estéticas, riesgos), está marcado como **supuesto**. Cada función figura como **hecha** (está en el código) o **planeada** (figura como "Falta" o "Pendiente" en `CLAUDE.md`).
>
> **Documentos relacionados**: `design/player-journey.md` (recorrido del jugador), `design/gdd/systems-index.md` (los 13 sistemas), `design/accessibility-requirements.md` (nivel de accesibilidad comprometido), `docs/plan-ui-ux.md` (principios de interfaz).

---

## Resumen en una frase (Elevator Pitch)

> Es un manager de fútbol en el que dirigís un club argentino real, con su plantel, su escudo y su estadio, para cumplir lo que te pide la dirigencia y llevarlo de la Primera B a la Libertadores: armás la semana día por día, preparás al equipo y jugás cada partido en vivo, decidiendo desde el banco.

Prueba de los 10 segundos: "Sos el DT de un club argentino de verdad; entrenás, elegís el once y dirigís el partido mientras se juega".

---

## Identidad

| Aspecto | Detalle |
| ---- | ---- |
| **Género** | Manager deportivo (género "football manager"): gestión, simulación por jugadas, táctica. |
| **Plataforma** | Web (React 18 + TypeScript, Vite). Navegador de escritorio primero, con teclado y mouse; diseño propio para celular por navegador (hasta 760 px). Sin gamepad ni app nativa. |
| **Público** | Ver "Perfil del jugador objetivo". Hoy: el propio usuario, hincha argentino. |
| **Jugadores** | Un jugador. Sin red ni multijugador. |
| **Duración de sesión** | Supuesto: de 30 minutos a 2 horas. No se midió. Un partido en modo "partido completo" a velocidad 1 dura unos 2 minutos y medio de reloj (1,5 s por minuto de juego, más pausas en goles y ocasiones); la semana entre partidos se avanza en segundos. |
| **Monetización** | Ninguna. Proyecto personal sin fines comerciales (lo dice la pantalla de inicio). |
| **Alcance estimado** | Grande: 13 sistemas construidos, unos 7.000 líneas de juego e interfaz, base de 109 clubes y 3.208 jugadores. |
| **Títulos comparables** | Football Manager 24, 26 y 27, Out of the Park Baseball (referencia de densidad), Top Eleven y Soccer Manager (referencia de ritmo en celular). Según `docs/plan-ui-ux.md`. Cifras de ventas: no investigadas. |

---

## Fantasía central (Core Fantasy)

Sos el técnico de tu club, el de verdad. Firmás contrato en un club argentino que conocés, con los jugadores que ves los domingos, y te sentás en el banco: elegís el once, hablás con el vestuario, aguantás a la prensa y a la comisión directiva, y cuando la pelota rueda decidís en vivo si meter otro delantero o cerrarte. Si te va bien, te llaman de un club más grande; si te va mal, te echan y tu carrera sigue en otro lado.

Lo que no se encuentra en otro lado (supuesto): el fútbol argentino contado como es, con su formato (dos zonas, octavos a partido único, tabla anual, promedios, Reducido, Copa Argentina un miércoles en cancha neutral, clásicos con más público) y en su idioma.

---

## Gancho (Unique Hook)

"Es como un manager de fútbol clásico **y además** está hecho entero para el fútbol argentino: clubes, planteles, escudos, formatos de torneo y descensos por promedio reales, con un motor de partido por jugadas que podés dirigir en vivo y que te explica por qué ganaste o perdiste."

El gancho afecta al juego, no solo a la estética: el promedio de tres temporadas condiciona a un club recién ascendido, el formato de zonas con octavos cambia cuánto pesa cada fecha, la Copa Argentina mete a un club de la B contra uno de Primera, y la cantidad de partidos (liga, copa y copas internacionales) obliga a rotar.

---

## Experiencia del jugador (marco MDA)

### Estéticas objetivo (lo que el jugador SIENTE)

Las prioridades son un **supuesto** derivado de dónde está puesto el esfuerzo en el código.

| Estética | Prioridad | Cómo se entrega |
| ---- | ---- | ---- |
| **Fantasía** (rol) | 1 | Clubes, jugadores y escudos reales; DT con perfil, trayectoria y avatar; dirigencia, prensa y vestuario que te tratan como el técnico. |
| **Desafío** (dominio) | 2 | Motor por jugadas con duelos entre jugadores concretos; IA rival que arma un plan por partido; objetivos de la dirigencia según el tamaño del club; despido. |
| **Descubrimiento** | 3 | Ojeo con rangos que se angostan; centro de datos (xG por sector, pérdidas por fase, goles por tramo); consejos del ayudante; personalidades que se revelan. |
| **Narrativa** (emergente) | 4 | Bandeja con noticias de tu club y del resto del fútbol; promesas que se cumplen o se rompen; jugadores que piden irse; campeones, ascensos y descensos. |
| **Expresión** | 5 | Nueve dibujos, 24 roles, instrucciones con y sin pelota, pateadores, rutinas de córner, marca personal; perfil del DT (trayectoria y estilo). |
| **Sumisión** (comodidad) | 6 | Avance día por día sin fricción, tareas delegables (entrenamiento y prensa), inicio configurable, partido en modo "jugadas clave". |
| **Sensación** | 7 | Cancha 2D, marcador de transmisión, íconos por tipo de jugada. Sin sonido. |
| **Compañerismo** | N/A | No hay juego social. |

### Dinámicas clave (conductas que queremos que aparezcan)

Supuesto: estas son las conductas que los sistemas construidos están preparados para producir.

- El jugador rota el plantel cuando se juntan partidos (miércoles de Copa Argentina, martes de Libertadores) porque la recuperación física es de unos 6 puntos por día.
- Mira el informe del rival tres días antes y aplica una de sus sugerencias de táctica con un clic.
- Cambia el planteo en el entretiempo después de leer al ayudante ("te están ganando por la derecha").
- Manda a ojear antes de ofertar, porque de los jugadores ajenos solo ve rangos.
- Administra minutos para que los titulares y los suplentes estén conformes, y piensa dos veces antes de prometer.
- Mira el xG para saber si el equipo juega bien o solo tuvo suerte.
- Cuida la confianza de la dirigencia en las rachas malas (resultados, conferencias).

### Mecánicas centrales (lo que construimos)

1. **Motor de partido por jugadas, controlable en vivo** (`match.ts`): cada minuto una jugada pasa por salida, elaboración, último tercio y definición, resuelta con duelos entre jugadores según puesto, rol e instrucciones. Hecho.
2. **La semana día por día** (`week.ts`, `game.ts`): entrenamiento diario, informe del rival, conferencias, eventos y avance que frena ante decisiones. Hecho.
3. **El plantel como grupo** (`squad.ts`): personalidad, rol acordado, minutos esperados, conformidad, promesas, armonía. Hecho.
4. **El mundo argentino** (`game.ts`, `cups.ts`): tres categorías, copas, ascensos, descensos por tabla anual y promedios. Hecho.
5. **Mercado, economía y carrera** (`career.ts`): pases con ojeo y negociación, finanzas por club, dirigencia, mercado de entrenadores. Hecho.

---

## Perfil de motivación

### Necesidades psicológicas (teoría de la autodeterminación)

| Necesidad | Cómo la satisface el juego | Peso |
| ---- | ---- | ---- |
| **Autonomía** | Elegís club (tres categorías), perfil de DT, dibujo, roles, instrucciones, plan de entrenamiento, a quién comprar, qué prometer y qué contestarle a la prensa. Todo lo rutinario se puede delegar. | Central |
| **Competencia** | El resultado sale de duelos legibles; el ayudante, el análisis posterior y el centro de datos explican por qué. La familiaridad táctica premia la constancia. | Central |
| **Vínculo** | Jugadores reales con personalidad, referentes del vestuario, el club propio, los clásicos. | De apoyo |

### Tipos de jugador (Bartle)

- [x] **Achievers**: objetivos de la dirigencia, títulos, ascensos, carrera del DT con historial.
- [x] **Explorers**: ojeo, centro de datos, roles e instrucciones, personalidades ocultas que se descubren.
- [ ] **Socializers**: no aplica, no hay juego social.
- [ ] **Competitors**: no hay ranking ni rivales humanos; la competencia es contra la IA.

### Diseño del estado de flujo

- **Curva de entrada**: guía de ocho pasos al empezar una partida nueva (`Guide.tsx`), ayudas descartables la primera vez que se entra a siete pantallas (`PageTip`). La elección de club funciona como selector de dificultad: la pantalla de elección muestra objetivo, presupuesto y "Poca paciencia / Normal / Mucho respaldo" según el prestigio del DT contra la reputación del club. Hecho.
- **Escala de dificultad**: la elige el jugador (club chico o grande, categoría, trayectoria del DT). La dirigencia ajusta el objetivo al ranking de reputación del club dentro de su categoría. Hecho.
- **Claridad de la devolución**: consejos del ayudante en vivo, análisis del partido por sector y por fase, informe semanal de entrenamiento, tendencia de puntajes. Hecho.
- **Recuperación del fracaso**: una derrota cuesta confianza de a poco; el despido exige confianza de 6 o menos y al menos 10 partidos, y después hay tres ofertas de clubes para seguir. Hecho.

---

## Bucle central (Core Loop)

### Momento a momento (30 segundos)

Supuesto sobre qué hace el jugador la mayor parte del tiempo, según el peso de cada pantalla:

- **En la semana**: leer y responder la bandeja, ajustar el once o un rol, tocar Continuar. Un día cuesta 1 ms de mediana, así que el avance es instantáneo.
- **En el partido**: mirar la jugada en la cancha 2D y el relato, leer al ayudante y decidir un cambio, un ajuste táctico o una orden sobre un rival.

### Corto plazo (5 a 15 minutos): la semana y su partido

1. Avanzar día por día ("Continuar", Espacio) o hasta el partido ("Ir al partido", Mayús + Espacio). El avance frena solo si llega algo para decidir (oferta, oferta de trabajo, jugador que quiere irse, conferencia).
2. Entrenar: intensidad, foco colectivo, foco individual, descanso el día después del partido (o delegar en el ayudante).
3. Prepararse: informe del rival tres días antes, con sugerencias aplicables; conferencia previa el día anterior.
4. Jugar el partido en vivo: charla previa, cambios, táctica, roles, charla del entretiempo; los otros partidos del torneo se juegan a la par.
5. Reaccionar: resultado, análisis y conferencia posterior; conformidad del plantel según los minutos; confianza de la dirigencia.

### Sesión (30 a 120 minutos)

Supuesto: una sesión cubre varias fechas de un torneo (Apertura o Clausura) o un libro de pases completo. Paradas naturales: el final de un partido, el cierre del libro de pases (20 de febrero y 10 de agosto), el final de la fase de zonas o una final. La partida se guarda sola en IndexedDB después de cada avance. Propuesta (ADR-0002): se guarda sola, en segundo plano, en los momentos clave (al resolver una decisión o hacer una acción, al terminar un partido, al frenar "Ir al partido", al cerrar y empezar la temporada, al ocultar la pestaña) y cada 7 días de juego; quedan las 3 últimas copias automáticas de la única partida.

### Progresión a largo plazo

- **Temporada**: Apertura (enero a junio) y Clausura (julio a diciembre) en Primera, Primera Nacional de febrero a fin de año, tercera categoría cada 14 días, Copa Argentina los miércoles, Libertadores y Sudamericana de marzo a noviembre. Al cerrar, revisión de la dirigencia, clasificados a las copas, ofertas de otros clubes y comienzo de la temporada siguiente.
- **Carrera**: prestigio del DT, historial por temporada, títulos, mercado de entrenadores.
- **Club**: reputación que sube con títulos y ascensos y baja con descensos; caja, presupuesto y masa salarial; camadas de juveniles.
- **Jugadores**: mejoran entrenando (atributo por atributo) y al cambiar de temporada; los mayores de 31 pierden físico; se retiran.

### Ganchos de retención

- **Curiosidad**: cómo termina la zona, quién baja por promedios, qué rinde el juvenil que subió, qué dice el informe completo de un jugador ojeado.
- **Inversión**: el plantel que armaste, la familiaridad con tu sistema, las promesas en curso, la historia del DT.
- **Social**: no aplica.
- **Dominio**: ganarle a un rival superior con el planteo correcto; leer el xG; subir de categoría.

---

## Pilares del juego

Los pilares son un **supuesto**: el código y `CLAUDE.md` muestran estas prioridades, pero el usuario no los fijó con estas palabras. Hay que confirmarlos.

### Pilar 1: Todo real, todo argentino

Clubes, planteles, escudos, estadios, formatos de torneo y lenguaje son los del fútbol argentino de 2026; lo que no se sabe se estima o se inventa sin fingir que es real (árbitros y juveniles con nombres ficticios).

*Prueba de diseño*: si se discute entre una mecánica genérica del género y el formato real argentino (por ejemplo, descenso por tabla anual y promedios contra "los tres últimos bajan"), gana el formato real.

### Pilar 2: El partido como centro

Todo lo de la semana (entrenamiento, informe, charla, prensa, vestuario) desemboca en el partido, y el partido se dirige en vivo.

*Prueba de diseño*: si una función nueva no cambia lo que pasa en un partido ni cómo el jugador lo prepara o lo lee, va después.

### Pilar 3: Cada decisión se entiende

Toda táctica, rol o instrucción explica su efecto, y el juego muestra la consecuencia: ayudante, análisis, informes, rangos de ojeo que dicen cuánto no se sabe.

*Prueba de diseño*: si un efecto no se puede mostrar o explicar al jugador, se rediseña o se descarta antes de agregarlo (por ejemplo, la armonía muestra referentes y disconformes, no solo un número).

### Pilar 4: Profundo sin fricción

Sistemas profundos con una interfaz densa de escritorio: todo a uno o dos clics, teclado completo, y lo rutinario delegable.

*Prueba de diseño*: si una tarea se repite cada semana, tiene que poder delegarse o resolverse con un clic desde la bandeja (por eso existen "delegar entrenamiento" y "delegar prensa").

### Anti-pilares (lo que este juego NO es)

- **NO usa datos de Football Manager ni de sitios que los republican.** La base es propia (Wikipedia en español más estimaciones propias). El usuario lo pidió y se le explicó que no.
- **NO usa fotos reales de jugadores.** Silueta genérica elegida por el usuario; el DT usa avatar ilustrado.
- **NO copia la interfaz de Football Manager.** Diseño propio del género; sin barra lateral (pedido del usuario).
- **NO es arcade.** No se controla a los jugadores en la cancha; se dirige desde el banco.
- **NO es multijugador ni en línea.** Sin servidores; todo corre en el navegador.
- **NO tiene monetización.** Proyecto personal.
- **NO es un diseño de tablet en una computadora.** Escritorio denso primero; el celular tiene su propio diseño.

---

## Inspiración y referencias

| Referencia | Qué tomamos | Qué hacemos distinto | Por qué importa |
| ---- | ---- | ---- | ---- |
| Football Manager 24 | Densidad, tablas con columnas a elección, todo a pocos clics. | Diseño propio; sin datos de FM. | Es lo que la comunidad considera la referencia de interfaz (según `docs/plan-ui-ux.md`). |
| Football Manager 26 y 27 | El día de partido más limpio; navegación fija, menos ventanas emergentes, tablas sin desplazamiento horizontal. | Navegación arriba en dos niveles, fichas como páginas, avance que no congela. | FM26 fue castigada por la interfaz: muestra qué evitar. |
| Out of the Park Baseball | El jugador elige cuánto ver; ficha breve al pasar el mouse. | Aplicado al fútbol argentino. | Valida que la densidad se aprecia más que la estética. |
| Top Eleven, Soccer Manager | Ritmo y simplicidad en el celular. | Diseño de celular propio sin perder profundidad. | Referencia de ritmo para pantallas chicas. |

**Inspiraciones fuera de los juegos** (supuesto): las transmisiones de fútbol argentino (marcador, relato, "la figura"), la prensa deportiva y las conferencias, la cultura de los promedios y los clásicos.

---

## Perfil del jugador objetivo

Datos del usuario según `CLAUDE.md` y el encargo; el resto es **supuesto**.

| Atributo | Detalle |
| ---- | ---- |
| **Edad** | No se sabe. |
| **Experiencia** | Hardcore dentro del género: conoce los managers de fútbol y la recreación de FM26 que mostró como referencia. |
| **Disponibilidad** | Supuesto: sesiones de media hora a dos horas. |
| **Plataforma** | Computadora con navegador; a veces el celular. |
| **Qué juega** | Supuesto: Football Manager. |
| **Qué busca** | Un manager del género pero argentino, "todo real" (clubes, jugadores, escudos), profundo, en español rioplatense. |
| **Qué lo alejaría** | Datos o nombres falsos donde podrían ser reales; una interfaz lenta, de tablet o llena de ventanas emergentes; resultados que no se entienden; jugadores mal ubicados de puesto (por eso existe `data/overrides.json`). |

---

## Consideraciones técnicas

| Consideración | Evaluación |
| ---- | ---- |
| **Motor** | Sin motor de juego: aplicación web con React 18 + TypeScript y Vite. La lógica (`src/engine/`) es TypeScript puro con estado JSON serializable; la interfaz (`src/ui/`) es React. |
| **Desafíos técnicos** | Calibrar el motor contra la realidad argentina (2,1 a 2,3 goles por partido, 39 a 42 % de triunfos locales); que el avance de días no congele la interfaz (se resolvió cediendo el turno al navegador entre días); mantener rápido un estado con 3.200 jugadores (ids consecutivos con `newPid`). |
| **Estilo de arte** | 2D plano: escudos reales, silueta genérica de jugador, avatar ilustrado del DT, cancha 2D en SVG, gráficos en SVG propios. |
| **Complejidad del arte** | Baja. |
| **Audio** | Ninguno. |
| **Red** | Ninguna. Guardado local en IndexedDB; exportar e importar la partida como JSON (Propuesta (ADR-0002): archivo `.tasave`, JSON comprimido con gzip; importar acepta también el `.json` viejo y texto pegado). |
| **Volumen de contenido** | 109 clubes (30 de Primera, 36 de Primera Nacional, 20 de tercera categoría, 23 del exterior), 3.208 jugadores, 9 dibujos, 24 roles. |
| **Sistemas procedurales** | Juveniles y jugadores de clubes sin plantel conocido con nombres ficticios; árbitros ficticios; personalidad derivada del jugador; azar con semilla (`rng.ts`). |

---

## Alcance: hecho y planeado

El estado sale del código; lo planeado, de las secciones "Falta" y "Pendiente" de `CLAUDE.md`.

| Área | Hecho | Planeado |
| ---- | ---- | ---- |
| Partido | Motor por jugadas; roles e instrucciones con y sin pelota y en transiciones; pateadores; rutinas de córner; órdenes sobre rivales y marca personal en vivo; familiaridad táctica; charla previa y del entretiempo; modos "partido completo" y "jugadas clave"; público, árbitro, envión tras el gol; alargue, penales y series con global; otros partidos de la fecha en vivo; análisis posterior. | — |
| Semana | Avance día por día con calendario; entrenamiento con intensidad, foco colectivo e individual y descanso; delegación; informe del rival con sugerencias; conferencias previas y posteriores (delegables); cuerpo técnico de cinco puestos con contrataciones y despidos; entrenamiento semanal de los planteles rivales (`weeklyAiTraining`). | Que la prensa tenga consecuencias más allá del partido (hoy mueve moral, confianza y prestigio en el momento). |
| Plantel | Personalidad; rol en el plantel con minutos esperados; conformidad; pedidos para irse; promesas; charlas; armonía y referentes; reserva semanal; juveniles por temporada. | Préstamos de juveniles propios a otros clubes; conflictos en los planteles rivales. |
| Mercado | Libro de pases (1 de enero a 20 de febrero y 25 de junio a 10 de agosto); ofertas por pase y por préstamo hacia tu club; ofertas por tus jugadores (con pedir más); cláusulas que pagan los rivales; ventas al exterior; negociación de contratos con representante; seguimiento y ojeo. | Ceder a préstamo jugadores propios. |
| Mundo | Liga Profesional (Apertura y Clausura), Primera Nacional, Primera B y Federal A con ascensos y descensos; tabla anual y promedios; Copa Argentina; Libertadores y Sudamericana con clasificación por la temporada anterior; premios; mercado de entrenadores; ofertas de fin de temporada. | Descensos desde la tercera categoría (no hay cuarta); Supercopa; Trofeo de Campeones. |
| Economía | TV, recaudación, premios y ventas contra sueldos y gastos de funcionamiento; reinversión de la IA; compras de los ricos en el exterior. | Frenar el crecimiento de la caja de los clubes más grandes (unos 10 millones por año, sobre todo por ventas al exterior). |
| Datos | Importación de Wikipedia en español; valoración propia; correcciones a mano (`data/overrides.json`); juveniles con proyección; escudos. | Completar estadísticas de unos 20 jugadores; escudos faltantes (Aldosivi, Ciudad de Bolívar, Gimnasia y Tiro, Deportivo Armenio, Real Pilar, Corinthians y Colo-Colo). |
| Interfaz | Las seis etapas del plan de UI/UX: navegación en dos niveles con historial, barra de comandos y atajos; bandeja con acciones; tablas únicas; día de partido configurable; centro de datos; guía, ayudas y accesibilidad; celular. | — |

---

## Riesgos y preguntas abiertas

### Riesgos de diseño

- La caja de los clubes grandes crece unos 10 millones por año: a largo plazo la IA rica puede romper el equilibrio del mercado (señalado en `CLAUDE.md`).
- Sin descensos desde la tercera categoría, un club de la B nunca puede caer más: la carrera desde abajo pierde riesgo.
- Supuesto: la prensa sin consecuencias más allá del momento puede volverse un trámite que el jugador delega siempre.
- Supuesto: con mucha profundidad y sin ritmo propio, el jugador puede delegar todo y la semana perder decisiones.

### Riesgos técnicos

- El estado completo se guarda en IndexedDB del navegador: borrar los datos del sitio borra la carrera (se mitiga con "Exportar partida"; en Safari, el navegador borra los datos a los 7 días sin uso si el juego no está en la pantalla de inicio).
- Cambios de formato exigen subir `Game.version` (hoy 6); una partida de otra versión no carga. Propuesta (ADR-0002): `Game.version` 7 y `migrateGame` migran las partidas viejas; solo una de versión más nueva que el juego no carga.

### Riesgos de mercado

- No aplica: no hay intención comercial. Datos de mercado: no investigados.

### Riesgos de alcance

- La base depende de Wikipedia en español: fichas incompletas o mal clasificadas obligan a corregir a mano (`data/overrides.json`).

### Preguntas abiertas

- ¿Los cuatro pilares de este documento son los del usuario? Se resuelve preguntándole.
- ¿Cuánto dura una sesión y una temporada real del usuario? Se resuelve cuando juegue la temporada completa prevista en el plan de UI/UX.
- ¿Hace falta una cuarta categoría o alcanza con descensos al Federal A? Decisión de alcance del usuario.

---

## Definición del MVP

El juego ya pasó esta etapa; se deja como referencia de qué valida el núcleo.

**Hipótesis central**: dirigir un club argentino real, preparando la semana y decidiendo el partido en vivo, sostiene sesiones de más de 30 minutos y da ganas de jugar la fecha siguiente.

**Imprescindible para el MVP** (todo hecho):
1. Base de clubes y jugadores reales.
2. Motor de partido controlable en vivo.
3. Liga con fixture, tabla y avance de días.

**Fuera del MVP** (hecho después): copas, mercado, economía, carrera del DT, ojeo, plantel como grupo, prensa, centro de datos.

### Niveles de alcance

| Nivel | Contenido | Funciones | Estado |
| ---- | ---- | ---- | ---- |
| **MVP** | Primera división | Motor, liga, avance | Hecho |
| **Vertical slice** | Una temporada de Primera | Semana completa, IA rival, plantel, prensa | Hecho |
| **Alfa** | Tres categorías y cuatro copas | Mercado, economía, carrera, ojeo | Hecho |
| **Visión completa** | Pirámide completa y supercopas | Lo planeado de la tabla "Alcance" | En curso |

---

## Próximos pasos

- [ ] Confirmar con el usuario los pilares y las estéticas (son supuestos).
- [ ] Completar los 13 GDD de `design/gdd/systems-index.md` (en redacción en paralelo).
- [ ] Que el usuario juegue una temporada completa (lo prevé `docs/plan-ui-ux.md`) y medir duración de sesión y de temporada.
- [ ] Priorizar lo planeado según el orden de "Pendiente" de `CLAUDE.md`.
