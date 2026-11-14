# Technical Area

Manager de fútbol argentino (género "football manager") con clubes, planteles y escudos reales. Proyecto personal del usuario. Todo el texto de la interfaz va en español rioplatense.

## Comandos

- `npm run dev`: servidor local (Vite).
- `npm run build`: chequeo de tipos + build.
- `npm run sim -- 3`: simula N temporadas sin interfaz y muestra métricas (goles por partido, localía, finanzas, pases). Correrlo después de tocar el motor o la economía.
- `npm run db`: regenera `src/data/db.json` desde `data/clubs_raw.json`.
- `python3 tools/import_wiki.py`: reimporta clubes y planteles de Wikipedia en español. `python3 tools/fetch_crests.py`: escudos.
- `python3 tools/import_extra.py`: clubes sin plantel conocido (tercera categoría y rivales sudamericanos) a `data/clubs_extra.json`, con escudos. Sus jugadores los genera `tools/build-db.ts` con nombres ficticios.

## Arquitectura

- `src/engine/` es TypeScript puro, sin React, con estado JSON serializable (`Game` en `types.ts`).
  - `match.ts`: motor de partido por jugadas (`MatchSim`). Cada minuto un equipo tiene la pelota y la jugada pasa por salida, elaboración, último tercio y definición; cada fase es un duelo entre jugadores concretos según puesto, rol e instrucciones. Controlable en vivo (cambios, táctica, roles, charla). `sim.frame` describe el último minuto (quiénes la tocaron, carril, tipo de jugada) para la cancha 2D. `sim.an` registra por bando ataques y xG por sector, pérdidas por fase y duelos por jugador: de ahí salen los consejos del ayudante (`insights`) y el análisis del informe (`f.analysis`). Público (`opts.crowd`, escala la localía), árbitro con criterio propio (`opts.ref`, nombres ficticios), envión tras el gol, cansancio comparado entre equipos y final de partido más abierto.
  - `ai.ts`: el cerebro de los DT rivales. `planMatch` arma el plan de cada partido (fuerza de los dos onces con el físico del día y la localía; repliegue o presión, ataque al lateral flojo, marca personal a la figura, salida larga contra presión alta, dibujo defensivo contra rivales superiores) sobre la identidad táctica del club (`club.style`); rota si hay otro partido cerca. `weeklyAiTraining`: los planteles rivales entrenan. En el partido (`aiManage` en `match.ts`) la IA cambia el dibujo y mete delanteros si pierde, se cierra si gana por uno al final y se reacomoda tras una expulsión.
  - `game.ts`: nueva partida, armado de equipos, fixture, tablas, fases, avance de días, cambio de temporada.
  - `career.ts`: DT, dirigencia, finanzas, mercado de pases, contratos, juveniles.
  - `squad.ts`: el plantel como grupo. Personalidad (`persOf`: ambición, temperamento, lealtad, presión), rol en el plantel (`p.status`) y minutos esperados, conformidad (`p.happy`), promesas, charlas, armonía del vestuario (afecta el rendimiento), reserva, ojeo con incertidumbre (`knowOf`, `shown`: los jugadores ajenos se ven como rangos) y negociación de contratos (`demand`, `evalOffer`).
  - `cups.ts`: tercera categoría (`T3`, Primera B y Federal A, dos zonas), Copa Argentina (`CA`, 64 equipos, miércoles), Libertadores y Sudamericana (`LIB`, `SUD`: grupos, cuartos y semis de ida y vuelta con `leg`/`pair` y global en `opts.agg`, final única). `computeQual` define los clasificados de la temporada siguiente (`g.qual`).
  - `week.ts`: la semana. Cuerpo técnico (`g.staff`, `sab(g, rol)` da la capacidad 1-20), entrenamiento diario (`dailyTraining`: físico, lesiones, familiaridad y mejora de atributos con `p.tx`), informe del rival (`scoutReport`), conferencias de prensa (`g.press`) y eventos del día (`dayEvents`).
  - El tiempo avanza día por día: `advanceDay` (un día) y `advanceToMatch` (hasta el partido, frenando si hay prensa). `continueGame` es solo para simulaciones sin interfaz.
  - `positions.ts`: puestos, formaciones, valoración por puesto y roles (`ROLES`: cada rol cambia el aporte del puesto, cuánto crea y cuánto remata). `rng.ts`: azar con semilla.
- `src/ui/` es React. `common.tsx` tiene los componentes compartidos (escudo, cara, radar, mapa de remates, informe de partido).
  - Navegación con historial (`App.tsx`): `nav({ page, id, tab })`, `back`, `openPlayer`, `openClub` en el contexto (`Ctx` de `store.ts`). Cambiar de pestaña dentro de una ficha reemplaza la entrada en vez de apilarla, y cada entrada recuerda su scroll.
  - Fichas como páginas con pestañas: `PlayerPage.tsx` (página `player`) y `ClubPage` en `Nav.tsx` (página `clubv`). Las ventanas emergentes quedan para decisiones cortas (negociación, charla, prensa).
  - `Nav.tsx`: ficha breve al pasar el mouse (`HoverCard`: cualquier elemento con `data-pid` o `data-cid`; un escudo o nombre de club suelto con `data-cid` abre su ficha al hacer clic), barra de comandos (Ctrl+K o /), atajos (`SHORTCUTS`) y ajustes (densidad, texto, velocidad y modo del partido; en `localStorage`).
  - `useSticky(clave, inicial)` de `store.ts`: estado de pantalla (filtros, orden, pestañas) que sobrevive a la navegación. Usarlo en vez de `useState` para todo lo que el jugador esperaría encontrar igual al volver.
  - Favoritos: `g.favs` (jugadores y clubes, hasta 8) en la barra lateral.
  - Bandeja de entrada (`Inbox.tsx`, página `inbox`): las noticias llevan `pid` (jugador), `act` (acción: oferta, trabajo, jugador que quiere irse, informe, resultado) y `ref` (oferta, club o partido), y `me` si son para el DT. Al crear una noticia nueva desde el motor, completar esos campos para que la bandeja ofrezca la acción. Los pendientes (`pendingOf`: prensa, ofertas, ofertas de trabajo, jugadores que quieren irse) se calculan del estado, no se guardan.
  - Avance: "Ir al partido" avanza día por día cediéndole el turno al navegador (se ve el progreso, se puede frenar con Esc) y se detiene si aparece una decisión nueva (`decisionKeys`). No hace falta un web worker: un día cuesta 1 ms de mediana y copiar el estado a un worker costaría más.
  - Inicio configurable: mosaicos con orden y ancho en `settings.home` (`localStorage`).
  - Día de partido (`MatchView.tsx` y `MatchPanels.tsx`): los otros partidos del mismo torneo y día (`sameRound`) se juegan en vivo a la par (`syncLive`) y `finishUserMatch` registra esos mismos resultados. Paneles configurables (`settings.matchPanels`, `bigPitch`), tabla en vivo para los torneos de liga, y flujo posterior en pasos (`PostMatch`: resultado, análisis, conferencia).
  - Tablas de jugadores: `PlayerTable.tsx` es el componente único (plantel, ficha de club, mercado, seguimiento, estadísticas). Columnas en `COLS` (cada atributo es una columna `a_xxx`), vistas en `VIEWS`, vistas propias del jugador y columnas en `localStorage` (`ta-table-<id>`). Sin desplazamiento horizontal: si no entra, oculta las columnas de menor prioridad (`PRIO`). Ordenar por un dato ajeno usa el punto medio del rango que se conoce, para no revelar lo que el ojeo no sabe. Acciones masivas en `ownBulk` y `scoutBulk`; el comparador es `Compare`.
- La partida se guarda en IndexedDB (`src/store.ts`). `Game.version` es 6; si cambia el formato, subir la versión.

## Decisiones tomadas

- El usuario pidió nombres, clubes y escudos reales.
- La interfaz es un diseño propio: moderna, del género, sin copiar la de Football Manager.
- Foto de jugadores: la silueta genérica que eligió el usuario (`src/assets/player.webp`). El DT usa el avatar ilustrado. No usar fotos reales.
- En las fichas de Wikipedia, "delantero" o "mediocampista" a secas no dicen el puesto: `tools/build-db.ts` los reparte entre los puestos de la línea. Solo "centrodelantero", "extremo", "enganche", etc. se toman literales.
- La valoración sale de la reputación del club, la edad, la trayectoria real (`data/players_meta.json`: puesto, debut, selección, exterior, notoriedad) y el presente: partidos jugados en 2026 según la tabla de estadísticas de cada ficha (`tools/fetch_stats.py` → `data/players_stats.json`).
- Puesto: manda el que dice la primera frase del artículo si es específico ("se desempeña como lateral izquierdo"); si no, el de la ficha. Un "delantero" a secas que convierte seguido en 2026 pasa a nueve. No dice quién es titular hoy: eso se corrige en `data/overrides.json` (clave `Club corto|Nombre`) y después `npm run db`.
- Juveniles con proyección: `tools/prospects.py` cruza los planteles con las listas de selecciones juveniles de Wikipedia (`data/raw/sel/`, sub-15 a sub-23) y genera `data/prospects.json`; suben habilidad y potencial. Los que el usuario conoce y no figuran ahí se cargan en `data/overrides.json` con `prospect` (1 a 6).
- No se usan datos de Football Manager ni de sitios que los republican: es una base propietaria. El usuario lo pidió y se le explicó que no.
- La temporada inicial es 2026 con las zonas reales de ese año.
- Clubes con división 0 son del exterior: solo juegan copas, no llevan economía y sus jugadores no aparecen en el mercado.
- Los ids de jugadores nuevos salen de `newPid` (consecutivos). Usar `g.nextId` para jugadores pasa `g.players` a modo diccionario y vuelve lento todo el juego.
- Economía: TV, recaudación y premios contra sueldos y gastos de funcionamiento (`rep² × 15` por mes). Los clubes de la IA reinvierten la caja (presupuesto y masa salarial) y los ricos compran refuerzos en el exterior.

## Calibración de referencia del motor

Alrededor de 2,1 a 2,3 goles por partido (la liga argentina es de pocos goles), 39-42 % de triunfos locales, 26-28 % de empates, 12-14 % de 0-0, 22 remates, 9 córners, 3,4 offsides, 5 amarillas y 0,3 rojas por partido. Goles por tramo de 15 minutos parecidos a los reales (el último tramo es el de más goles). La recuperación física es de unos 6 puntos por día: un partido a mitad de semana se nota. Las constantes están en `attack`, `chance` y `shot` de `match.ts`; después de tocarlas, correr `npm run sim -- 2`.

## Plan de jugabilidad (acordado con el usuario)

1. **El partido como centro.** Hecho: motor por jugadas, roles, instrucciones con pelota / sin pelota / transiciones, pateadores, rutinas de córner, órdenes sobre rivales puntuales y marca personal (solo durante el partido, `tactic.oppo` y `tactic.manMark`), familiaridad táctica (`club.fam`), ritmo más lento con modos "partido completo" y "jugadas clave", charla del entretiempo.
2. **La semana.** Hecho: avance día por día con calendario, entrenamiento (intensidad, foco colectivo e individual, descanso posterior al partido, delegable), informe del rival con sugerencias aplicables, conferencias previas y posteriores (delegables), charla previa al partido, cuerpo técnico de cinco puestos con contrataciones y despidos. Falta: que los rivales también entrenen y que la prensa tenga consecuencias más allá del partido.
3. **El plantel como grupo.** Hecho: personalidades con efecto en juego (presión en partidos grandes, temperamento y tarjetas, ambición y lealtad en la conformidad y los contratos), roles en el plantel con minutos esperados, conformidad, pedidos para irse, promesas que se cumplen o se rompen, charlas individuales, armonía y referentes, reserva semanal, ojeo con rangos y conocimiento progresivo, negociación de contratos con representantes (sueldo, años, rol, cláusula, prima) y cláusulas que los rivales pueden pagar. Falta: préstamos de juveniles a otros clubes y que los planteles rivales también tengan conflictos.
4. **El mundo.** Hecho: tercera categoría con ascensos y descensos con la Primera Nacional, Copa Argentina, Libertadores y Sudamericana con clasificación según la temporada anterior, premios, mercado de entrenadores (los clubes que andan mal echan al DT y, si tu prestigio alcanza, te llaman) y ofertas de fin de temporada, economía con gastos de funcionamiento y reinversión de la IA. Falta: descensos desde la tercera categoría (no hay cuarta), Supercopa y Trofeo de Campeones.

## Plan de UI/UX (acordado con el usuario)

Ver `docs/plan-ui-ux.md`: investigación de la competencia (FM26, FM27, FM24, OOTP), principios y seis etapas (navegación y densidad, bandeja de entrada y ritmo, tablas profesionales, día de partido, centro de datos, pulido). Va antes de que el usuario juegue una temporada completa. Etapas 1 a 4 hechas.

## Pendiente (en orden sugerido)

1. Seguir corrigiendo a mano lo que el usuario detecte (`data/overrides.json`). Unos 20 jugadores con ficha quedaron sin estadísticas por rechazos de Wikipedia: `python3 tools/fetch_stats.py` los completa.
2. Préstamos de juveniles a otros clubes; conflictos en los planteles rivales; que los rivales entrenen.
3. La caja de los clubes más grandes todavía crece unos 10 millones por año (sobre todo por ventas al exterior).
4. Escudos faltantes: Aldosivi, Ciudad de Bolívar, Gimnasia y Tiro, Deportivo Armenio, Real Pilar, Corinthians y Colo-Colo.
