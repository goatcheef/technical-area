# Technical Area

Manager de fútbol argentino (género "football manager") con clubes, planteles y escudos reales. Proyecto personal del usuario. Todo el texto de la interfaz va en español rioplatense.

## Comandos

- `npm run dev`: servidor local (Vite).
- `npm run build`: chequeo de tipos + build.
- `npm run sim -- 3`: simula N temporadas sin interfaz y muestra métricas (goles por partido, localía, finanzas, pases). Correrlo después de tocar el motor o la economía.
- `npm run db`: regenera `src/data/db.json` desde `data/clubs_raw.json`.
- `python3 tools/import_wiki.py`: reimporta clubes y planteles de Wikipedia en español. `python3 tools/fetch_crests.py`: escudos.

## Arquitectura

- `src/engine/` es TypeScript puro, sin React, con estado JSON serializable (`Game` en `types.ts`).
  - `match.ts`: motor de partido por jugadas (`MatchSim`). Cada minuto un equipo tiene la pelota y la jugada pasa por salida, elaboración, último tercio y definición; cada fase es un duelo entre jugadores concretos según puesto, rol e instrucciones. Controlable en vivo (cambios, táctica, roles, charla). `sim.frame` describe el último minuto (quiénes la tocaron, carril, tipo de jugada) para la cancha 2D.
  - `game.ts`: nueva partida, armado de equipos, fixture, tablas, fases, avance de días, cambio de temporada.
  - `career.ts`: DT, dirigencia, finanzas, mercado de pases, contratos, juveniles.
  - `positions.ts`: puestos, formaciones, valoración por puesto y roles (`ROLES`: cada rol cambia el aporte del puesto, cuánto crea y cuánto remata). `rng.ts`: azar con semilla.
- `src/ui/` es React. `common.tsx` tiene los componentes compartidos (escudo, cara, radar, mapa de remates, ficha de jugador).
- La partida se guarda en IndexedDB (`src/store.ts`). `Game.version` es 3; si cambia el formato, subir la versión.

## Decisiones tomadas

- El usuario pidió nombres, clubes y escudos reales.
- La interfaz es un diseño propio: moderna, del género, sin copiar la de Football Manager.
- Foto de jugadores: la silueta genérica que eligió el usuario (`src/assets/player.webp`). El DT usa el avatar ilustrado. No usar fotos reales.
- En las fichas de Wikipedia, "delantero" o "mediocampista" a secas no dicen el puesto: `tools/build-db.ts` los reparte entre los puestos de la línea. Solo "centrodelantero", "extremo", "enganche", etc. se toman literales.
- La valoración sale de la reputación del club, la edad y la trayectoria real (`data/players_meta.json`: puesto, debut, selección, exterior, notoriedad). No dice quién es titular hoy: eso se corrige en `data/overrides.json` (clave `Club corto|Nombre`) y después `npm run db`.
- Juveniles con proyección: `tools/prospects.py` cruza los planteles con las listas de selecciones juveniles de Wikipedia (`data/raw/sel/`, sub-15 a sub-23) y genera `data/prospects.json`; suben habilidad y potencial. Los que el usuario conoce y no figuran ahí se cargan en `data/overrides.json` con `prospect` (1 a 6).
- No se usan datos de Football Manager ni de sitios que los republican: es una base propietaria. El usuario lo pidió y se le explicó que no.
- La temporada inicial es 2026 con las zonas reales de ese año.

## Calibración de referencia del motor

Alrededor de 2,2 a 2,4 goles por partido, 40-42 % de triunfos locales, 27 % de empates, 22-23 remates, 9 córners, 5 amarillas y 0,3 rojas por partido. Las constantes están en `attack`, `chance` y `shot` de `match.ts`; después de tocarlas, correr `npm run sim -- 2`.

## Plan de jugabilidad (acordado con el usuario)

1. **El partido como centro.** Hecho: motor por jugadas, roles, instrucciones con pelota / sin pelota / transiciones, pateadores, rutinas de córner, órdenes sobre rivales puntuales y marca personal (solo durante el partido, `tactic.oppo` y `tactic.manMark`), familiaridad táctica (`club.fam`), ritmo más lento con modos "partido completo" y "jugadas clave", charla del entretiempo.
2. **La semana:** avance día por día con calendario, entrenamiento, informe del rival, charlas y prensa, cuerpo técnico.
3. **El plantel como grupo:** personalidades, promesas de minutos, ojeo con rangos en vez de números exactos, negociación de contratos, reserva.
4. **El mundo:** copas, tercera categoría, economía, ofertas de trabajo.

## Pendiente (en orden sugerido)

1. Etapa 2 del plan: la semana.
2. Corregir puestos y calidad de los jugadores más conocidos.
3. Ajustar la economía: los clubes grandes acumulan demasiada caja con los años.
4. Copa Argentina, Libertadores y Sudamericana.
5. Descensos desde la Primera Nacional (no hay tercera categoría).
6. Entrenamientos, ojeadores, cuerpo técnico, conferencias de prensa.
7. Escudos faltantes: Aldosivi, Ciudad de Bolívar y Gimnasia y Tiro.
