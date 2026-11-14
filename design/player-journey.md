# Mapa del recorrido del jugador: Technical Area

> **Estado**: Borrador (documentado a partir del juego construido)
> **Autor**: game-designer
> **Última actualización**: 2026-11-14
> **Vincula con**: `design/gdd/game-concept.md` (los pilares están ahí; no hay `design/gdd/game-pillars.md`), `design/gdd/systems-index.md`, `design/accessibility-requirements.md`, `docs/plan-ui-ux.md`

> **Cómo leer este documento.** Describe el recorrido real por el juego que ya existe: qué pantalla tiene delante el jugador en cada momento (ids de página de `src/ui/App.tsx`), qué necesita ahí y qué sistema se lo da. Las specs de UX lo leen como "contexto del jugador al llegar". Los tiempos de cada fase y los estados emocionales son **supuestos**: el juego no tiene telemetría y el usuario todavía no jugó una temporada completa. Lo demás sale del código.

---

## Mapa de pantallas (referencia)

La navegación tiene dos niveles (`TopNav.tsx`): arriba las secciones (`GROUPS` de `App.tsx`), abajo las pantallas de la sección activa, lo pendiente, el próximo rival y el menú del DT. En las fichas de jugador o club queda activa la última sección usada.

| Sección | Pantallas (id de página) |
| ---- | ---- |
| **Inicio** | Inicio (`home`), Bandeja (`inbox`), Calendario (`calendar`), Fixture (`fixtures`), Posiciones (`tables`), Estadísticas (`stats`) |
| **Plantel** | Plantel (`squad`), Vestuario (`locker`), Cuerpo técnico (`staff`) |
| **Partido** | Tácticas (`tactics`), Entrenamiento (`training`), Centro de datos (`data`) |
| **Mercado** | Mercado (`market`: buscar, ofertas recibidas, seguimiento, movimientos, finanzas) |
| **Club** | Club y DT (`club`) |
| **Fichas** | Jugador (`player`: resumen, contrato y mercado, estadísticas, vestuario u ojeo), Club (`clubv`: plantel, partidos, el club) |
| **Fuera de la navegación** | Inicio de partida (`Start`), Día de partido (`MatchView`), Después del partido (`PostMatch`), Fin de ciclo (despido) |
| **Ventanas cortas** | Conferencia (`PressModal`), Informe del rival (`ReportModal`), Charla individual (`TalkModal`), Negociación (`NegotiationModal`), Informe de partido (`MatchReport`), Barra de comandos, Atajos, Ajustes, Guía |

En el celular (hasta 760 px) la barra inferior tiene Inicio, Bandeja, Plantel, Tácticas y "Más", que abre el menú completo.

---

## Panorama del recorrido

Supuesto. El jugador llega con una expectativa concreta: un manager del género pero con su fútbol, el argentino, de verdad. El primer golpe es reconocer el escudo, el estadio y los nombres del plantel que eligió; enseguida descubre que la semana es corta y que el partido se dirige en vivo. En las primeras fechas aprende a leer al ayudante y el xG y a preparar cada partido con el informe del rival. A mitad de temporada aparece la profundidad que no se ve de entrada: el vestuario que reclama minutos, el ojeo que angosta rangos, la Copa Argentina un miércoles entre dos fechas, la tabla de promedios. El cierre de temporada pone en juego lo que construyó (ascensos, descensos, clasificación a las copas, ofertas de otros clubes) y lo sostiene después la carrera del DT: subir de club, o ser echado y empezar de nuevo en otro lado.

---

## Arquetipo del jugador

Un jugador que terminó varias temporadas de otros managers de fútbol y llega con una hipótesis: "esto es eso, pero argentino". Lee las ayudas cuando le resuelven algo concreto y las descarta después; espera densidad, atajos y pocos clics, y le molestan las ventanas sobre ventanas y lo que tarda. Le importa que los datos sean reales y se da cuenta si un jugador está mal ubicado. Prefiere entender por qué ganó a ganar fácil. (Supuesto armado con lo que dice `CLAUDE.md` del usuario.)

---

## Fases del recorrido

---

### Fase 1: Primer contacto (0 a 5 minutos): nueva partida

**Pantalla**: `Start` (antes de que exista el juego; no hay navegación). Si hay una partida guardada de la versión 6, aparece arriba con "Continuar partida".

**Lo que hace el jugador, en tres pasos**:
1. **Tu perfil**: nombre, nacionalidad, edad (28 a 72), avatar (piel, pelo, peinado, barba, anteojos, traje).
2. **Trayectoria y estilo**: una de cuatro trayectorias (ex figura internacional, ex jugador de Primera, hecho en el ascenso, entrenador de escuela), que fijan el prestigio inicial (78 a 28) y los puntos para repartir (62 a 80); un estilo (equilibrado, ofensivo, pragmático, formador, motivador, manager) que reparte los puntos entre seis atributos del DT, ajustables con + y −, y un radar.
3. **Elegí tu club**: Liga Profesional, Primera Nacional o Primera B y Federal A; tarjetas de clubes ordenadas por reputación; al elegir uno se ven el objetivo de la dirigencia, el presupuesto y la dificultad ("Poca paciencia", "Normal", "Mucho respaldo"). "Firmar contrato" crea la partida; si había otra guardada, pide confirmar el reemplazo. También se puede importar una partida en JSON.

**Qué necesita**: reconocer su club (escudo, ciudad, estadio, zona), entender qué le van a pedir y cuánto margen tiene, y que su DT tenga identidad.

**Estado emocional al llegar**: expectante y desconfiado ("¿estará mi club, estarán bien los nombres?").

**Pregunta principal**: "¿Esto es de verdad el fútbol argentino?"

**Lo que el juego tiene que entregar**: ver su club real con el escudo, el estadio y el objetivo que le corresponde. La pantalla aclara la fuente ("Clubes, escudos, planteles y edades tomados de Wikipedia en español (noviembre de 2026); los atributos son estimaciones propias").

**Estado emocional al salir**: con un club y un objetivo propios, y una decisión tomada sobre quién es su DT.

**Riesgo si falla**: el club no está, el plantel no se parece al real o la elección de dificultad no se entiende; abandona antes de jugar.

---

### Fase 2: Orientación (5 a 30 minutos): la guía y la primera semana

**Pantallas**: Inicio (`home`) con la guía encima; después Bandeja, Plantel, Tácticas, Entrenamiento y Mercado.

**Lo que pasa**:
- La partida empieza el 10 de enero de 2026 con el libro de pases abierto hasta el 20 de febrero. La primera noticia presenta al DT, el objetivo y el presupuesto.
- **Guía de la primera partida** (`Guide.tsx`, ocho pasos, aparece solo si no se hizo antes y no se jugó ningún partido): bienvenida con el objetivo; Continuar e "Ir al partido"; la bandeja; la segunda fila de navegación; Plantel; Partido; Mercado; atajos y ajustes. Se saltea con Esc o "Saltear la guía" y se repite desde Ajustes.
- **Ayudas por pantalla** (`PageTip`): la primera vez que entra a Plantel, Tácticas, Entrenamiento, Vestuario, Mercado, Bandeja y Centro de datos, una línea explica lo esencial y se descarta con "Entendido".
- El Apertura arranca el primer sábado desde el 22 de enero; la Primera Nacional, desde el 5 de febrero; la tercera categoría, desde el 12 de febrero.

**Qué necesita en cada pantalla**:
- **Inicio**: el próximo partido, la tabla de su zona, lo pendiente, el estado de la dirigencia. Los mosaicos se pueden reordenar ("Personalizar inicio").
- **Plantel**: ver a todos sin desplazamiento horizontal, con vistas (General, Físico, Contrato, Ojeo, Estadísticas).
- **Tácticas**: dibujo, once, roles e instrucciones, con el análisis del once por líneas y avisos. La familiaridad empieza en 55 para el club del jugador (78 en los de la IA) y baja 30 puntos si se cambia el dibujo.
- **Entrenamiento**: intensidad, foco, descanso después del partido, o delegar en el ayudante.
- **Mercado**: buscar refuerzos con el libro abierto, sabiendo que de los ajenos ve rangos.

**Estado emocional al llegar**: interesado, todavía sin comprometerse.

**Pregunta principal**: "¿Cómo funciona esto y qué tengo que tocar antes del primer partido?"

**Lo que el juego tiene que entregar**: la idea de que la semana se avanza día por día y frena sola cuando hay algo para decidir, y una primera decisión táctica propia (el dibujo y el once).

**Estado emocional al salir**: tiene un once armado y sabe dónde está cada cosa.

**Riesgo si falla**: se siente perdido entre trece pantallas, o toca "Ir al partido" sin preparar nada y no entiende por qué perdió.

---

### Fase 3: Primer dominio (30 minutos a 2 horas): la semana, el partido y el después

Es el bucle que se repite toda la carrera.

#### La semana tipo

**Pantallas**: Inicio, Bandeja, Entrenamiento, Tácticas, Calendario.

1. **Avanzar**: "Continuar" (Espacio) pasa un día o juega el partido si es hoy; "Ir al partido" (Mayús + Espacio) avanza día por día mostrando el progreso y se frena con Esc, con una conferencia o con una decisión nueva (oferta por un jugador, oferta de trabajo, jugador que quiere irse). Si frena por una decisión, abre la Bandeja en "Pendientes".
2. **Entrenar**: cada día sin partido hay práctica: sube o baja el físico según la intensidad, crece la familiaridad, puede haber lesiones, los jugadores acumulan progreso hasta ganar un atributo. Los lunes llega el informe semanal del entrenamiento a la bandeja.
3. **Informe del rival**: tres días antes del partido llega a la bandeja y queda en la tarjeta "Próximo partido" de Inicio. Muestra dibujo, once probable con valoraciones estimadas, estilo, forma, figuras, punto débil y sugerencias que se aplican a la táctica con un clic. Su precisión depende del jefe de scouting y del ayudante.
4. **Conferencia previa**: el día anterior al partido; tres preguntas con tres respuestas que mueven la moral del plantel, la de un jugador puntual, la confianza de la dirigencia o el prestigio del DT. Desde la misma ventana de la conferencia se puede dejar que hable siempre el ayudante; si no se contesta, la contesta el ayudante con la respuesta más prudente.

**Qué necesita**: saber cuánto falta para el partido (barra superior: próximo rival y fecha), el físico del once, qué hay pendiente.

#### El día de partido

**Pantalla**: `MatchView` (ocupa toda la pantalla; no hay navegación).

- **Antes del saque**: charla previa ("Tranquilos, jueguen como saben", "Hoy se gana sí o sí", "Nadie confía en nosotros: demuéstrenlo").
- **En vivo**: marcador de transmisión con goleadores, expulsiones, reloj, avance y posesión; cancha 2D; relato con íconos por tipo de jugada. Paneles configurables (mi equipo y táctica, ayudante, otros partidos, tabla en vivo, relato, estadísticas, remates y dominio) al costado, abajo u ocultos; modo cancha grande. Cambios, dibujo, roles, instrucciones y órdenes sobre rivales (marcar de cerca, ir fuerte, presionar) y marca personal. Velocidad y modo "partido completo" o "jugadas clave" (tecla M). Atajos: Espacio, 1 a 4, M, C, T, R, P y Esc.
- **Entretiempo**: charla ("Tranquilos, sigan así", "Quiero más de ustedes", "Los felicito").
- **Los otros partidos** del mismo torneo y día se juegan a la par, con el gol recién hecho resaltado; lo que se ve en vivo es lo que queda registrado.
- **Eliminación**: alargue, penales, y en la vuelta de una serie el global de la ida.

**Qué necesita**: entender qué está pasando (el ayudante señala por dónde ataca o sufre el equipo), reaccionar rápido sin perder la jugada, y saber cómo van los otros partidos que le importan.

#### Después del partido

**Pantalla**: `PostMatch`, en pasos que se pueden saltear: **Resultado** (goles, puntajes y resto de la fecha), **Análisis** (ataques y xG por sector, pérdidas por fase, duelos) y **Conferencia** posterior (si no está delegada). Después vuelve a Inicio.

**Consecuencias que el jugador ve después**: moral por resultado y puntaje; conformidad según los minutos (los que juegan menos de lo que espera su rol se quejan); confianza de la dirigencia según los puntos contra lo esperado; lesiones (noticia con acción); suspensiones por roja o por cinco amarillas; lo que se aprendió de los rivales (ojeo).

**Estado emocional al llegar a la fase**: entiende lo básico y quiere ganar.

**Pregunta principal**: "¿Qué tengo que hacer para ganar? ¿Por qué perdí?"

**Lo que el juego tiene que entregar**: la primera victoria que se siente propia, por un cambio o una sugerencia del informe que funcionó, y una derrota que el análisis explica.

**Estado emocional al salir**: tiene una opinión sobre su sistema y ganas de jugar la fecha siguiente.

**Riesgo si falla**: siente el resultado como azar y deja de preparar los partidos.

---

### Fase 4: Descubrimiento de la profundidad (2 a 10 horas): el plantel, el mercado y las copas

**Pantallas**: Vestuario (`locker`), ficha de jugador (`player`), Mercado (`market`), Centro de datos (`data`), Posiciones (`tables`), Cuerpo técnico (`staff`).

**Lo que aparece**:
- **El vestuario**: cada jugador tiene un rol (jugador clave, titular, rotación, suplente, promesa) con minutos esperados; la conformidad baja si juega claramente menos; los ambiciosos se impacientan antes y los leales aguantan más. Con conformidad muy baja un jugador pide irse (pendiente que frena el avance). Charlas individuales una vez por semana por jugador (elogiar, exigir, prometer minutos por cinco semanas, pedir paciencia, cambiar el rol, declararlo transferible, convencerlo de quedarse). La armonía del vestuario, con sus referentes, afecta el rendimiento. La reserva juega los miércoles si hay al menos siete jugadores anotados.
- **El mercado**: ojear hasta diez jugadores a la vez para angostar los rangos (hasta el informe completo); ofertar por el pase o por un préstamo; si el club acepta, negociar el contrato con el representante (sueldo, años, rol, cláusula, prima), que tiene paciencia limitada; responder ofertas por los propios (aceptar, pedir más, rechazar) desde la bandeja; un rival puede pagar la cláusula de un jugador propio ambicioso. El libro cierra el 20 de febrero y reabre del 25 de junio al 10 de agosto.
- **El cuerpo técnico**: cinco puestos (ayudante, preparador físico, médico, jefe de scouting, coordinador de inferiores) con capacidad de 1 a 20; contratar de una bolsa de libres y despedir con indemnización.
- **Las copas**: Copa Argentina los miércoles a partido único en cancha neutral (desde febrero); Libertadores (martes) o Sudamericana (jueves) desde marzo si el club clasificó. El calendario se carga y hay que rotar.
- **El centro de datos**: Mi equipo, Jugadores (minutos, desgaste), Rivales y Liga, con tooltip y vista de tabla en cada gráfico.
- **El formato**: fin de la fase de zonas, octavos a partido único, la final en cancha neutral; la tabla anual y la de promedios en Posiciones.

**Estado emocional al llegar**: tiene una estrategia y empieza a ver sus límites (un titular que se queja, un rival que lo supera).

**Pregunta principal**: "¿Qué me estoy perdiendo? ¿Cuánto más hay?"

**Lo que el juego tiene que entregar**: el primer conflicto de vestuario resuelto con una charla o un cambio de rol, y el primer refuerzo traído después de ojearlo.

**Estado emocional al salir**: ve varias formas de manejar el mismo problema (minutos, rol, venta, promesa).

**Riesgo si falla**: no descubre el vestuario hasta que un jugador pide irse, o compra a ciegas y se decepciona.

---

### Fase 5: Juego habitual (10 a 50 horas): la temporada completa y su cierre

**Pantallas**: Inicio (tarjeta de fin de temporada), Posiciones, Bandeja (Pendientes), Club y DT.

**Lo que pasa a lo largo del año**:
- Apertura (enero a junio) y Clausura (julio a diciembre) en Primera; Primera Nacional con final por el ascenso y Reducido; tercera categoría con dos ascensos por zona.
- La dirigencia mide cada partido contra lo esperado según la diferencia de reputación y la localía. La confianza se ve en Inicio y en Club y DT.

**El cierre de temporada** (cuando terminan todas las competencias):
- Noticias del cierre: primero de la tabla anual, los dos que descienden (último de la anual y peor promedio), los que ascienden, los clasificados a Libertadores y Sudamericana del año siguiente, el goleador.
- **Revisión de la dirigencia**: si cumplió el objetivo (o salió campeón, o ascendió), sube la confianza y el prestigio; si no, bajan; descender pesa mucho. La temporada queda en la carrera del DT.
- **Ofertas de otros clubes**: si la confianza es de 60 o más, hasta dos clubes de más reputación pueden ofrecerle el cargo; aparecen en Pendientes.
- Inicio muestra "Terminó la temporada" con campeones, descensos y peor promedio, y el botón "Comenzar temporada". El botón Continuar de la barra pasa a decir "Nueva temporada".
- **Al comenzar la temporada nueva** (10 de enero): se retiran los veteranos; los jugadores con contrato vencido se van libres; vuelven los cedidos; suben de tres a cuatro juveniles (más con buen trabajo de juveniles y buen coordinador); los jugadores se desarrollan según edad, minutos y profesionalismo; se recalculan valores, presupuesto y masa salarial; nuevo objetivo; la confianza se acerca al centro (60 % de la anterior más 24).

**Estado emocional al llegar**: se considera competente; tiene un estilo propio.

**Pregunta principal**: "¿Cuál es mi próximo objetivo?"

**Lo que el juego tiene que entregar**: un cierre que cuente lo que hizo (objetivo, títulos, ascenso) y una razón para empezar otra temporada (juveniles nuevos, copas, una oferta).

**Estado emocional al salir**: con una meta para la temporada siguiente.

**Riesgo si falla**: el cierre pasa como una pantalla más, o pierde jugadores por contratos vencidos sin haberlo visto venir.

---

### Fase 6: Largo plazo (más de 50 horas): la carrera del DT

**Pantallas**: Bandeja (ofertas de trabajo), Fin de ciclo (si lo echan), Club y DT, ficha de club (`clubv`).

**Lo que pasa**:
- **Mercado de entrenadores** (cada lunes, durante la fase de liga): los clubes de la IA que andan mal echan a su DT. Si el club tiene una reputación parecida o mayor a la del tuyo y tu prestigio alcanza, te ofrecen el cargo por una semana (pendiente que frena el avance). Si aceptás, cambiás de club en el acto: nuevo plantel, nuevo objetivo, confianza 55.
- **El despido**: si la confianza llega a 6 o menos con al menos 10 partidos dirigidos, la dirigencia te echa. La pantalla "Fin de ciclo" reemplaza todo el juego: muestra el balance y tres clubes de menor reputación que te quieren; elegir uno es la única salida. El despido baja el prestigio.
- **El club y la pirámide**: reputación que sube con títulos y ascensos, promedios que arrastran tres temporadas, juveniles que maduran.

**Estado emocional al llegar**: veterano; el club es "suyo".

**Pregunta principal**: "¿Hasta dónde puedo llegar? ¿Me animo a cambiar de club?"

**Lo que el juego tiene que entregar**: decisiones de carrera con peso (dejar el club que armó por uno más grande) y un despido que no termina la partida.

**Estado emocional al salir**: tiene una historia de carrera que contar (clubes, títulos, ascensos).

**Riesgo si falla**: cuando el club ya gana todo no queda desafío (la caja de los grandes crece sin freno, y desde la tercera categoría no se desciende).

---

## Contexto del jugador al llegar a cada pantalla

Para las specs de UX. "Llega desde" y "necesita" salen del flujo del código; el estado de ánimo es un supuesto.

| Pantalla | Llega desde | Cuándo | Qué necesita al llegar |
| ---- | ---- | ---- | ---- |
| `Start` | Abrir el juego, "Menú principal" | Primera vez o para cambiar de partida | Continuar la partida guardada en un clic; si es nueva, crear el DT y elegir club con el objetivo y la dificultad a la vista. |
| `home` | Fin de la guía, fin del partido, cambio de temporada, sección Inicio | Varias veces por semana de juego | Próximo partido, pendientes, tabla, dirigencia; el botón de fin de temporada cuando corresponde. |
| `inbox` | Avance frenado por una decisión (abre en Pendientes), contador de la barra, mosaico Mensajes | Cuando llega algo para decidir | La decisión primero, con la acción en el mismo mensaje (aceptar, pedir más, rechazar, hablar, ver informe). |
| `calendar` | Mosaico Agenda, sección Inicio | Al planificar la semana o una seguidilla de partidos | Qué partidos vienen y cuántos días hay entre ellos. |
| `fixtures`, `tables`, `stats` | Sección Inicio, mosaicos de tabla | Después de una fecha o al cierre | Cómo quedó la zona, la anual, los promedios, las copas; goleadores. |
| `squad` | Sección Plantel, mosaico "Para atender" (contratos) | Antes de un partido o en el mercado | El plantel entero sin desplazamiento horizontal, con estado físico, lesiones, contratos; acciones masivas (reserva, banco, transferibles, comparar). |
| `locker` | Noticia de jugador que quiere irse, mosaico "Para atender" | Cuando baja la armonía o hay disconformes | Quién está disconforme y por qué (minutos contra rol), referentes, charlas disponibles, reserva. |
| `staff` | Sección Plantel | Al empezar o cuando un área rinde poco | Capacidad de cada puesto y su efecto, bolsa de libres, costo de contratar y despedir. |
| `tactics` | "Preparar el equipo" en Inicio, sugerencias del informe | Antes de cada partido | Once, dibujo, roles, instrucciones, físico de cada titular, análisis del once y avisos. |
| `training` | Mosaico "Para atender", noticia del informe semanal | Al principio de la semana o tras lesiones | Días al próximo partido, físico medio, familiaridad, plan de la semana, foco individual; o delegar. |
| `data` | Sección Partido | Después de varios partidos | Si el equipo juega bien más allá del resultado (xG), desgaste del plantel, cómo juega el rival. |
| `market` | Sección Mercado, contador de ofertas, guía | Con el libro de pases abierto | Buscar con rangos de ojeo, ofertas recibidas, seguimiento, movimientos, finanzas. |
| `club` | Sección Club | Al revisar la carrera o la confianza | Confianza y objetivo, finanzas, perfil del DT, carrera y títulos. |
| `player` | Cualquier nombre de jugador (ficha breve al pasar el mouse) | En cualquier momento | Resumen, contrato y mercado (ofertar, renovar), estadísticas, vestuario (propio) u ojeo (ajeno). |
| `clubv` | Cualquier escudo o nombre de club, próximo rival en la barra | Al estudiar un rival o un destino | Plantel, partidos y datos del club. |
| `MatchView` | "Jugar" en la barra, "Continuar" el día del partido | Cada partido | Charla previa, el partido en vivo con el ayudante, cambios y táctica sin perder la jugada. |
| `PostMatch` | Fin del partido | Cada partido | Resultado y resto de la fecha, análisis, conferencia; poder saltearlo. |
| Fin de ciclo | Despido después de un partido | Raro | Entender por qué lo echaron y elegir dónde seguir. |

---

## Ventanas de pases a lo largo del año

| Fecha | Qué pasa | Dónde lo ve el jugador |
| ---- | ---- | ---- |
| 1 de enero a 20 de febrero | Libro abierto: la IA compra y vende entre clubes argentinos, los ricos compran en el exterior, llegan ofertas del exterior y de otros clubes por tus jugadores. | Fecha con "· pases" en la barra superior; "Libro de pases abierto" en "Para atender"; Mercado. |
| 21 de febrero a 24 de junio | Libro cerrado: no se puede ofertar; las ofertas vencen a los ocho días. | Mercado avisa que reabre el 25 de junio. |
| 25 de junio a 10 de agosto | Segundo libro, a mitad del año, entre el Apertura y el Clausura. | Igual que el primero. |
| Cambio de temporada | Vuelven los préstamos, se van libres los contratos vencidos, retiros, juveniles. | Noticias en la bandeja; nuevo plantel en Plantel. |

---

## Momentos críticos

| Momento | Fase | Objetivo emocional | Si falla |
| ---- | ---- | ---- | ---- |
| Ver el escudo, el estadio y el objetivo del club elegido | Primer contacto | "Es mi club, de verdad." | Duda de que la base sea real; no empieza. |
| El primer "Ir al partido" que frena solo por una oferta | Orientación | "El juego me avisa lo importante." | Siente que el avance le esconde cosas o que lo interrumpe por nada. |
| Aplicar una sugerencia del informe del rival y que funcione | Primer dominio | "Preparar el partido sirve." | El informe le parece decorativo. |
| El primer gol en vivo con el marcador de transmisión | Primer dominio | Emoción de cancha. | El partido se siente como una barra de progreso. |
| El cambio del entretiempo después de leer al ayudante | Primer dominio | "Lo di vuelta yo." | No entiende qué cambiar ni por qué. |
| El análisis de una derrota con más xG que el rival | Primer dominio | "Jugamos bien; fue mala suerte." | Culpa al motor de arbitrario. |
| Un titular que pide irse por falta de minutos | Descubrimiento | Sorpresa y una decisión con dilema. | Lo siente como un castigo sin aviso (no vio bajar la conformidad). |
| La primera promesa cumplida o rota | Descubrimiento | Las palabras del DT pesan. | No recuerda haber prometido y se siente engañado por el juego. |
| El informe completo de un jugador ojeado | Descubrimiento | "Ahora sé lo que compro." | Ofertó sin ojear y se decepcionó. |
| Copa Argentina contra un club de otra categoría | Descubrimiento | El batacazo, a favor o en contra. | Un trámite más en el calendario. |
| El cierre de temporada (descensos, promedios, clasificados) | Juego habitual | Orgullo o alivio. | Una pantalla que se saltea. |
| La camada de juveniles al empezar la temporada | Juego habitual | Esperanza nueva. | Nombres sin historia que nadie mira. |
| La primera oferta de trabajo de un club más grande | Largo plazo | Reconocimiento y dilema. | La pierde sin verla o le resulta indiferente. |
| El despido y la pantalla "Fin de ciclo" | Largo plazo | Golpe, pero la carrera sigue. | Siente que perdió la partida. |

---

## Ganchos de retención

| Tipo | Gancho | Sistemas que lo dan |
| ---- | ---- | ---- |
| **Inicio de sesión** | La partida sigue donde quedó con lo pendiente a la vista; el próximo partido está a pocos días. | Guardado en IndexedDB, Bandeja y pendientes, Inicio, Temporada y ligas. |
| **Fin de sesión** | Un partido grande que viene (clásico, eliminación, vuelta de una serie), un libro de pases a punto de cerrar, una promesa en curso. | Temporada y ligas, Copas, Mercado de pases, Plantel. |
| **Regreso diario** | No hay recompensas por día ni eventos por tiempo real. El gancho es la próxima fecha. | Temporada y ligas. |
| **Largo plazo** | Ascensos, descensos, promedios, clasificación a las copas, carrera del DT, juveniles. | Temporada y ligas, Copas, Carrera del DT, Plantel, Economía y dirigencia. |

---

## Sensación de progreso

La progresión principal es la **mejora de las decisiones**: el jugador tiene que sentir que lee mejor los partidos y el plantel, no que el juego se vuelve más fácil.

- **Al principio**: reacciona a lo que le pasa (un gol en contra, un jugador que se queja) y sigue las sugerencias del informe y del ayudante.
- **A mitad del recorrido**: anticipa (rota antes de la seguidilla, cuida los minutos de un titular sensible, ojea antes de que abra el libro).
- **Al final**: arma su club (sistema con familiaridad alta, juveniles que maduran, plantel equilibrado) y decide su carrera (cambiar de club, subir de categoría).

En paralelo crecen el prestigio del DT y la reputación del club, que abren clubes más grandes y mejores jugadores.

---

## Antipatrones a evitar

- **Que el avance esconda una decisión.** El avance hasta el partido frena cuando aparece una decisión nueva (`decisionKeys`) y abre Pendientes. Toda decisión nueva tiene que entrar en `pendingOf` para que esto siga valiendo.
- **Perder algo sin aviso.** Las ofertas vencen a los ocho días; la conferencia sin responder la contesta el ayudante; los contratos que vencen en diciembre se van libres al cambiar de temporada (Inicio los cuenta en "Para atender"). Hoy, "Comenzar temporada" corre la fecha al 10 de enero y vence en silencio las ofertas de trabajo de fin de temporada que estaban pendientes: hace falta un aviso antes.
- **Un castigo sin explicación.** Cada consecuencia visible (despido, jugador que pide irse, promesa rota) tiene que venir con su porqué en la noticia y con señales previas visibles (confianza, conformidad, plazo de la promesa).
- **Microgestión obligatoria.** Entrenamiento y prensa son delegables; lo que se agregue y se repita cada semana debería serlo también.
- **El despido como fin de la partida.** Siempre hay tres ofertas para seguir.
- **Quedarse sin desafío.** Con la caja de los grandes creciendo sin freno y sin descenso desde la tercera categoría, el largo plazo puede aplanarse (ver Preguntas abiertas).

---

## Preguntas de validación

**Primer contacto (0 a 5 minutos)**
- [ ] "Sin abrir ninguna ayuda, ¿qué creés que vas a hacer en este juego?"
- [ ] "¿Por qué elegiste este club? ¿Qué te pide la dirigencia?"

**Orientación (5 a 30 minutos)**
- [ ] "¿Qué hace Continuar y qué hace Ir al partido?"
- [ ] "¿Hay algo que sentís que tendrías que entender y no entendés?"

**Primer dominio (30 minutos a 2 horas)**
- [ ] "¿Por qué ganaste (o perdiste) el último partido?"
- [ ] "¿Qué cambiaste en el entretiempo y por qué?"

**Descubrimiento (2 a 10 horas)**
- [ ] "¿Algún jugador se quejó? ¿Qué hiciste?"
- [ ] "¿Compraste a alguien? ¿Lo ojeaste antes?"

**Juego habitual (10 a 50 horas)**
- [ ] "¿Cuál es tu objetivo para la próxima temporada?"
- [ ] "¿Qué te contó el cierre de temporada?"

**General**
- [ ] "Si tuvieras que dejar ahora, ¿para qué volverías?"
- [ ] "¿Hay algo que querés hacer y el juego no te deja?"

---

## Preguntas abiertas

| Pregunta | Responsable | Fecha límite | Resolución |
| ---- | ---- | ---- | ---- |
| ¿Cuánto duran de verdad las fases (sesión, temporada)? | game-designer con el usuario | Cuando el usuario juegue una temporada completa | Sin resolver |
| ¿Hace falta avisar antes de "Comenzar temporada" que se pierden las ofertas de trabajo pendientes? | game-designer, ux-designer | — | Sin resolver |
| ¿Cómo se sostiene el desafío a largo plazo (caja de los grandes, descensos desde la tercera categoría)? | game-designer, economy-designer | — | Sin resolver; ver "Pendiente" de `CLAUDE.md` |
| ¿La prensa necesita consecuencias más allá del partido para no volverse un trámite delegado? | game-designer | — | Sin resolver; planeado en `CLAUDE.md` |
| ¿La guía de ocho pasos alcanza para un jugador que no conoce el género? | ux-designer | — | Sin resolver (el usuario sí conoce el género) |
