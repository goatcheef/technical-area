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
  - `match.ts`: motor de partido minuto a minuto (`MatchSim`), controlable en vivo (cambios, táctica).
  - `game.ts`: nueva partida, armado de equipos, fixture, tablas, fases, avance de días, cambio de temporada.
  - `career.ts`: DT, dirigencia, finanzas, mercado de pases, contratos, juveniles.
  - `positions.ts`: puestos, formaciones, valoración por puesto. `rng.ts`: azar con semilla.
- `src/ui/` es React. `common.tsx` tiene los componentes compartidos (escudo, cara, radar, mapa de remates, ficha de jugador).
- La partida se guarda en IndexedDB (`src/store.ts`). `Game.version` es 2; si cambia el formato, subir la versión.

## Decisiones tomadas

- El usuario pidió nombres, clubes y escudos reales.
- La interfaz es un diseño propio: moderna, del género, sin copiar la de Football Manager.
- Foto de jugadores: la silueta genérica que eligió el usuario (`src/assets/player.webp`). El DT usa el avatar ilustrado. No usar fotos reales.
- La valoración sale de la reputación del club, la edad y la trayectoria real (`data/players_meta.json`: puesto, debut, selección, exterior, notoriedad). No dice quién es titular hoy: eso se corrige en `data/overrides.json` (clave `Club corto|Nombre`) y después `npm run db`.
- Juveniles con proyección: `tools/prospects.py` cruza los planteles con las listas de selecciones juveniles de Wikipedia (`data/raw/sel/`, sub-15 a sub-23) y genera `data/prospects.json`; suben habilidad y potencial. Los que el usuario conoce y no figuran ahí se cargan en `data/overrides.json` con `prospect` (1 a 6).
- No se usan datos de Football Manager ni de sitios que los republican: es una base propietaria. El usuario lo pidió y se le explicó que no.
- La temporada inicial es 2026 con las zonas reales de ese año.

## Calibración de referencia del motor

Alrededor de 2,2 a 2,4 goles por partido, 42 % de triunfos locales, 28 % de empates, 22 remates, 5 amarillas y 0,2 rojas por partido.

## Pendiente (en orden sugerido)

1. Cancha 2D animada en los partidos.
2. Corregir puestos y calidad de los jugadores más conocidos.
3. Ajustar la economía: los clubes grandes acumulan demasiada caja con los años.
4. Copa Argentina, Libertadores y Sudamericana.
5. Descensos desde la Primera Nacional (no hay tercera categoría).
6. Entrenamientos, ojeadores, cuerpo técnico, conferencias de prensa.
7. Escudos faltantes: Aldosivi, Ciudad de Bolívar y Gimnasia y Tiro.
