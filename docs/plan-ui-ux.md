# Plan de UI/UX: ser la referencia del género

Investigación de noviembre de 2026. El objetivo es que Technical Area se juegue mejor que Football Manager, no que se le parezca: diseño propio, con las lecciones de los aciertos y errores del género.

## Lo que enseña la competencia

**Football Manager 26 (nov. 2025).** Pasó a Unity y reemplazó la barra lateral y las vistas densas por un sistema de "mosaicos y tarjetas" pensado para pantallas táctiles y consolas. La crítica elogió el motor de partido y castigó la interfaz:

- Navegar se volvió una búsqueda: funciones básicas a varios clics, paneles poco intuitivos.
- Menos información por pantalla, más espacio vacío, texto más chico; un diseño de tablet que rompe el uso de escritorio.
- Se perdieron cosas útiles: el calendario en la pantalla de inicio, una pantalla propia para los contratos.
- Transiciones lentas.
- Fue la entrega peor puntuada de la serie y llegó a tener reseñas mayormente negativas en Steam.
- Lo que sí se valoró: el día de partido, más limpio.

**Football Manager 27 (anunciado para nov. 2026).** Corrige en parte:

- Los mosaicos pasan a ser solo informativos y la navegación vuelve a un menú fijo.
- Menos ventanas emergentes, más pantallas completas.
- Atajos remapeables, marcadores y mosaicos intercambiables.
- Tablas que muestran todo lo posible sin desplazamiento horizontal y aprovechan las pantallas grandes.

La comunidad sigue comparándolo con FM24, que considera la referencia.

**FM24 y anteriores.** Lo que los jugadores extrañan: la barra lateral siempre visible, las vistas de tabla personalizables (columnas a elección, sin desplazamiento horizontal), mucha información por pantalla y pocos clics para todo.

**Out of the Park Baseball.** La referencia de densidad en juegos de gestión: el jugador elige cuánta información ve y con qué profundidad, y al pasar el mouse sobre un nombre aparece una ficha breve. Se elogia la función por encima de la estética.

**Juegos para celular (Top Eleven, Soccer Manager).** Priorizan la simplicidad y el ritmo, con menos profundidad.

## Principios

1. **Escritorio primero y denso.** Mucha información legible por pantalla; nada de diseño de tablet en una computadora. El celular tiene su propio diseño, no una versión estirada.
2. **Todo a uno o dos clics.** Barra lateral fija (ya la tenemos), historial con atrás y adelante, atajos de teclado, buscador universal, favoritos.
3. **Nada de ventanas sobre ventanas.** Las fichas (jugador, club, rival) son páginas con pestañas; las ventanas emergentes quedan solo para decisiones cortas.
4. **La información viene a vos.** Bandeja de entrada única con acciones directas; el botón de continuar muestra qué está pendiente.
5. **El mouse informa.** Ficha breve al pasar sobre cualquier jugador o club, en cualquier pantalla.
6. **El jugador decide cuánto ver.** Columnas, filtros y vistas guardadas en las tablas; densidad y tamaño de texto ajustables.
7. **Rápido siempre.** Cambios de pantalla instantáneos; el avance de días no congela la interfaz y muestra progreso.
8. **Cada decisión se entiende.** Toda táctica, rol o instrucción explica su efecto y el juego muestra la consecuencia (ayudante, análisis).

## Etapas

### Etapa 1: navegación y densidad (base de todo lo demás) — hecha
- Rutas con historial: atrás y adelante (botones, teclado y mouse).
- Ficha de jugador como página con pestañas: resumen, atributos, estadísticas, contrato, historial, informes de ojeo.
- Ficha de club como página: plantel, partidos, finanzas, historia.
- Ficha breve al pasar el mouse sobre cualquier nombre de jugador o club.
- Barra de comandos (Ctrl+K): buscar jugadores, clubes y pantallas, y ejecutar acciones ("ir a tácticas", "continuar").
- Atajos de teclado para lo frecuente (continuar, pantallas principales, pausar el partido).
- Ajustes: densidad (cómoda, compacta), tamaño de texto, velocidad de partido por defecto.
- Favoritos: fijar jugadores, clubes o pantallas en la barra lateral.

Resultado: cambio de pantalla entre 2 y 84 ms (en modo desarrollo), plantel sin desplazamiento horizontal a 1440 px, filtros y scroll que se conservan al volver. Las pantallas siguen siendo fijas en la barra lateral; los favoritos son jugadores y clubes.

### Etapa 2: bandeja de entrada y ritmo — hecha
- Bandeja única que reemplaza las noticias sueltas: ofertas, prensa, informes, avisos del cuerpo técnico, pedidos de jugadores, con botones de acción en el mismo mensaje.
- Continuar con bloqueos visibles: "Tenés una oferta y una conferencia pendientes".
- Avance de días en segundo plano (web worker) con indicador de progreso.
- Inicio configurable: mosaicos que el jugador elige y ordena, que informan pero no esconden la navegación.

Resultado: bandeja con pestañas (para vos, pendientes, plantel, mercado, partidos, torneos, todo el fútbol), lista y lectura lado a lado, y acciones en el mensaje (aceptar, pedir más o rechazar una oferta; aceptar un trabajo; hablar con un jugador o declararlo transferible; ver informes). Responder una oferta pasa de 3 clics a 1 desde Pendientes. El avance a la siguiente fecha muestra el progreso, nunca bloquea la interfaz más de 18 ms y frena cuando llega algo para decidir. En lugar del web worker se avanza día por día cediendo el turno al navegador, porque un día cuesta 1 ms y copiar el estado al worker costaría más.

### Etapa 3: tablas profesionales — hecha
- Componente de tabla único para todo el juego: columnas elegibles, orden por varias columnas, filtros, vistas guardadas (General, Físico, Contrato, Ojeo, Estadísticas).
- Sin desplazamiento horizontal: las columnas se adaptan al ancho.
- Comparador de jugadores lado a lado (radar, atributos, estadísticas, contrato).
- Selección múltiple con acciones (al banco, a la reserva, transferibles, ojear).

Resultado: una sola tabla para plantel, ficha de club, mercado, seguimiento y estadísticas. Tiene vistas General, Físico, Contrato, Ojeo y Estadísticas, más las que guarda el jugador. Cualquier dato o atributo puede ser columna, el orden admite hasta tres criterios (Mayús + clic) y hay filtro por línea y por nombre. Sin desplazamiento horizontal a 1440 ni a 1100 px: se ocultan las columnas menos importantes y se avisa cuántas. Selección múltiple con Mayús para rangos, acciones masivas y comparador de 2 o 3 jugadores (radar superpuesto, atributos con el mejor marcado, temporada y contrato) que respeta lo que se conoce de cada uno.

### Etapa 4: día de partido — hecha
- Disposición configurable: cancha grande, paneles a elección (estadísticas, ayudante, relato, mi equipo).
- Resultados en vivo de los otros partidos y tabla en vivo.
- Atajos (pausa, velocidad, cambios) y modo de resúmenes.
- Flujo posterior ordenado: resultado, análisis, conferencia.

Resultado: la cancha ocupa el centro y siete paneles (mi equipo y táctica, ayudante, otros partidos, tabla en vivo, relato, estadísticas, remates y dominio) se ponen al costado, abajo u ocultos; hay modo cancha grande. Los otros partidos del torneo se juegan minuto a minuto junto al tuyo, con el gol recién hecho resaltado, y la tabla en vivo muestra subas y bajas. Lo que se ve en vivo es lo que queda registrado. Atajos: Espacio, 1-4, M, C, T, R, P y Esc. Al terminar, tres pasos: resultado (goles, puntajes y resto de la fecha), análisis y conferencia, con la opción de saltearlos.

### Etapa 5: centro de datos — hecha
- Gráficos de rendimiento del equipo por partido y temporada: xG a favor y en contra, forma, peligro por sector.
- Rendimiento por jugador y por rol; minutos y desgaste del plantel.
- Análisis de rivales y de la liga.

Resultado: pantalla "Centro de datos" con cuatro pestañas.
- **Mi equipo:** seis cifras con su puesto en la categoría (puntos, xG a favor y en contra, definición, posesión, remates), xG por partido, carrera de puntos contra el líder, peligro por sector, pérdidas por fase y goles por tramo.
- **Jugadores:** minutos, promedio y su tendencia, G+A cada 90, puestos que ocupó con su promedio, minutos de los últimos cinco partidos y de los últimos 30 días, físico y aviso de desgaste.
- **Rivales:** cualquier club, con el próximo rival por defecto: estilo, cifras, xG por partido, resultados, goles por tramo, figuras y goleadores.
- **Liga:** dispersión de xG a favor contra xG en contra, goles por tramo de la categoría y tabla de xG ordenable.

Cada gráfico tiene tooltip y vista de tabla; la paleta pasó el validador de daltonismo y contraste sobre el fondo de los paneles.

### Etapa 6: pulido — hecha
- Microinteracciones y transiciones cortas, consistencia visual con un sistema de componentes.
- Primera partida guiada con ayudas contextuales.
- Accesibilidad: contraste, colores aptos para daltonismo en las escalas, teclado completo, movimiento reducido.
- Diseño propio para celular.

Resultado:
- **Movimiento:** transiciones cortas al cambiar de pantalla y al abrir ventanas, que se apagan con "movimiento reducido" (ajuste propio o el del sistema).
- **Primera partida guiada:** recorrido de ocho pasos que señala cada parte de la pantalla, más ayudas descartables la primera vez que se entra a siete pantallas.
- **Contraste:** el texto tenue pasó de 3,2:1 a 5,1:1.
- **Daltonismo:** modo que cambia el verde y el rojo de las escalas por azul y naranja.
- **Teclado completo:** enlace para saltar al contenido, filas de tablas con Tab y Enter, ventanas con Esc y el foco adentro.
- **Celular:** navegación inferior con menú completo en "Más", barra superior compacta, y el inicio, el plantel y el partido sin desbordes.

## Cómo medimos que somos mejores

- **Clics para las tareas frecuentes** (medidos antes y después de cada etapa):
  - Ver el contrato de un jugador: 0 (ficha breve).
  - Cambiar a un titular: 2.
  - Responder una oferta: 1 desde la bandeja.
  - Ir a cualquier pantalla: 1, o el teclado.
- **Velocidad:** cambio de pantalla en menos de 100 ms; una semana de juego sin congelar la interfaz.
- **Densidad:** el plantel completo visible sin desplazamiento horizontal en una pantalla de 1440 px.
- **Pruebas automáticas en el navegador** para cada flujo principal en cada etapa.
