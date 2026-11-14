# Technical Area

Manager de fútbol argentino: Liga Profesional y Primera Nacional con clubes y planteles reales.

## Cómo jugar

```bash
npm install
npm run dev
```

Abrí la dirección que muestra la terminal. La partida se guarda sola en el navegador (IndexedDB) y se puede exportar a un archivo.

## Qué hay hoy

- 66 clubes reales (30 de Primera, 36 de la Primera Nacional) y 2.159 jugadores reales con edad, nacionalidad y línea.
- Motor de partido minuto a minuto: posesión, remates, xG, pases, faltas, tarjetas, lesiones, cansancio, cambios y puntajes.
- Tácticas: 9 formaciones, mentalidad, presión, línea, ritmo, pases, amplitud y entradas, con cambios en vivo.
- Apertura y Clausura con zonas, interzonales (clásicos) y playoffs; tabla anual, promedios, descensos y ascensos.
- Primera Nacional con dos zonas, final por el ascenso y Reducido.
- Estadísticas por jugador, noticias, lesiones, suspensiones, moral y progresión de juveniles entre temporadas.

- Creación del DT (perfil, apariencia, trayectoria y seis atributos que influyen en el juego), prestigio, carrera y despidos.
- Mercado de pases con dos ventanas: compras, préstamos, ofertas recibidas (del país y del exterior), transferibles, renovaciones y jugadores libres.
- Finanzas (recaudación, TV, premios, sueldos), dirigencia con objetivo y confianza, camadas de juveniles y retiros.
- Escudos reales (`tools/fetch_crests.py`), mapa de remates y gráfico de dominio en cada partido.

## Pendiente

Copa Argentina, copas internacionales, descensos desde la Primera Nacional, entrenamientos, ojeadores y cuerpo técnico.

## Datos

- `tools/import_wiki.py` descarga clubes y planteles de Wikipedia en español a `data/clubs_raw.json`.
- `tools/fetch_players.py` baja la ficha de cada jugador (puesto real, debut, selección, clubes) a `data/players_meta.json`.
- `data/overrides.json` fija a mano la valoración o el puesto de un jugador puntual.
- `npm run db` genera `src/data/db.json`. Los atributos y el puesto específico de cada jugador son estimaciones (Wikipedia solo informa arquero, defensor, mediocampista o delantero); se pueden corregir a mano en ese archivo.
- `npm run sim -- 3` simula temporadas completas y muestra métricas para calibrar el motor.
