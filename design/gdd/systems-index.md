# Índice de sistemas: Technical Area

> **Estado**: Borrador (documentado a partir del juego construido)
> **Creado**: 2026-11-14
> **Última actualización**: 2026-11-14
> **Concepto de origen**: `design/gdd/game-concept.md`
> **Otros documentos**: `design/player-journey.md` (contexto del jugador por pantalla), `design/accessibility-requirements.md`, `design/ux/interaction-patterns.md`, `docs/plan-ui-ux.md`

---

## Panorama

Technical Area es un manager de fútbol argentino con clubes, planteles y escudos reales. Su bucle central es la semana: se avanza día por día, se entrena, se prepara el partido (informe del rival, conferencia, táctica), se juega en vivo y se reacciona (vestuario, dirigencia, prensa). Eso pide un motor de partido por jugadas que se pueda dirigir en vivo, un calendario argentino completo (tres categorías y cuatro copas con su formato real), sistemas de gestión alrededor del partido (plantel, entrenamiento, ojeo, mercado, economía, carrera) y una capa que le acerque al jugador lo que tiene que decidir (bandeja y pendientes). Los 13 sistemas de este índice están **construidos**; sus GDD se están escribiendo a partir del código. La lógica vive en `src/engine/` (TypeScript puro, estado JSON serializable en `Game`, `types.ts`) y la interfaz en `src/ui/`. Fuera del índice quedan el guardado (IndexedDB, `src/store.ts`), los ajustes, la guía y la accesibilidad, que cubren `design/accessibility-requirements.md` y `docs/plan-ui-ux.md`.

---

## Enumeración de sistemas

"Requisitos de UI" indica si el sistema tiene pantallas propias que una spec de UX tiene que cubrir. El detalle por pantalla está en "Requisitos de UI por sistema", más abajo.

| # | Sistema | Categoría | Capa | Prioridad | Estado | Documento | Depende de | Requisitos de UI |
|---|---------|-----------|------|-----------|--------|-----------|------------|------------------|
| 1 | Base de datos | Datos | Foundation | MVP | Implementado (GDD en redacción) | `design/gdd/base-de-datos.md` | — | No (canal sin interfaz) |
| 2 | Motor de partido | Juego | Core | MVP | Implementado (GDD en redacción) | `design/gdd/motor-de-partido.md` | Base de datos | Sí |
| 3 | Temporada y ligas | Núcleo | Core | MVP | Implementado (GDD en redacción) | `design/gdd/temporada-y-ligas.md` | Base de datos, Motor de partido | Sí |
| 4 | Economía y dirigencia | Economía | Core | Alpha | Implementado (GDD en redacción) | `design/gdd/economia-y-dirigencia.md` | Base de datos, Temporada y ligas | Sí |
| 5 | IA de los rivales | Juego | Feature | Vertical Slice | Implementado (GDD en redacción) | `design/gdd/ia-rivales.md` | Base de datos, Motor de partido, Temporada y ligas | Indirectos (se ve en el informe del rival, el relato y el centro de datos) |
| 6 | Copas | Juego | Feature | Alpha | Implementado (GDD en redacción) | `design/gdd/copas.md` | Temporada y ligas, Motor de partido, Economía y dirigencia | Sí |
| 7 | Plantel | Juego | Feature | Vertical Slice | Implementado (GDD en redacción) | `design/gdd/plantel.md` | Base de datos, Motor de partido, Temporada y ligas, Carrera del DT | Sí |
| 8 | Entrenamiento y cuerpo técnico | Progresión | Feature | Vertical Slice | Implementado (GDD en redacción) | `design/gdd/entrenamiento-y-cuerpo-tecnico.md` | Base de datos, Temporada y ligas, Economía y dirigencia, Plantel | Sí |
| 9 | Ojeo | Juego | Feature | Alpha | Implementado (GDD en redacción) | `design/gdd/ojeo.md` | Base de datos, Motor de partido, Plantel, Entrenamiento y cuerpo técnico | Sí |
| 10 | Mercado de pases | Economía | Feature | Alpha | Implementado (GDD en redacción) | `design/gdd/mercado-de-pases.md` | Base de datos, Temporada y ligas, Economía y dirigencia, Plantel, Ojeo, Carrera del DT | Sí |
| 11 | Carrera del DT | Progresión | Feature | Alpha | Implementado (GDD en redacción) | `design/gdd/carrera-del-dt.md` | Temporada y ligas, Economía y dirigencia, Plantel | Sí |
| 12 | Prensa e informes | Narrativa | Feature | Vertical Slice | Implementado (GDD en redacción) | `design/gdd/prensa-e-informes.md` | Temporada y ligas, IA de los rivales, Plantel, Economía y dirigencia, Carrera del DT, Entrenamiento y cuerpo técnico | Sí |
| 13 | Comunicación y bandeja | Interfaz | Presentation | MVP | Implementado (GDD en redacción) | `design/gdd/comunicacion-y-bandeja.md` | Temporada y ligas, Mercado de pases, Carrera del DT, Plantel, Ojeo, Prensa e informes, Entrenamiento y cuerpo técnico | Sí |

### Qué cubre cada sistema (y dónde está en el código)

| Sistema | Alcance | Código |
| ---- | ---- | ---- |
| Base de datos | Importación de clubes y planteles de Wikipedia en español, escudos, clubes sin plantel conocido con jugadores ficticios, estadísticas 2026, juveniles con proyección, valoración (reputación, edad, trayectoria, presente), reparto de puestos genéricos, correcciones a mano (`data/overrides.json`), actualización de la base en partidas de la primera temporada (`refreshDb`). Puestos, valoración por puesto y roles (`positions.ts`). | `tools/`, `data/`, `src/data/db.json`, `src/engine/positions.ts`, `refreshDb` y `valuation` en `game.ts` |
| Motor de partido | Partido por jugadas (salida, elaboración, último tercio, definición) con duelos por puesto, rol e instrucciones; control en vivo (cambios, táctica, roles, órdenes sobre rivales, marca personal, charlas); público, árbitro, envión, cansancio; alargue, penales y global; `frame` para la cancha 2D; `an` para el análisis y los consejos del ayudante; manejo del partido de la IA (`aiManage`). | `src/engine/match.ts`, `createMatch` y `applyResult` en `game.ts` |
| Temporada y ligas | Fixture de Liga Profesional (Apertura y Clausura en dos zonas con fecha interzonal de clásicos, octavos a partido único) y Primera Nacional (dos zonas, final por el ascenso, Reducido); tablas, tabla anual, promedios de tres temporadas, descensos; avance de días (`advanceDay`, `advanceToMatch`); familiaridad, suspensiones, moral por resultado; cierre y cambio de temporada (desarrollo, retiros, contratos vencidos, juveniles). | `src/engine/game.ts`, `seasonTurnover` en `career.ts` |
| Copas | Tercera categoría (Primera B y Federal A, dos zonas, ascensos), Copa Argentina (64 equipos, miércoles, cancha neutral), Libertadores y Sudamericana (grupos, cuartos y semis de ida y vuelta, final única), premios y clasificados de la temporada siguiente (`computeQual`). | `src/engine/cups.ts` |
| Mercado de pases | Libro de pases; ofertas del usuario por pase y por préstamo (`evaluateBid`); pases entre clubes de la IA, compras en el exterior, ventas al exterior; ofertas por jugadores del usuario (aceptar, pedir más, rechazar); cláusulas; negociación de contratos con representante (`demand`, `evalOffer`) y renovaciones; lista de transferibles, seguimiento. | `src/engine/career.ts` (mercado), `src/engine/squad.ts` (negociación) |
| Economía y dirigencia | Caja, presupuesto de pases y tope salarial; TV, recaudación, premios y ventas contra sueldos y gastos de funcionamiento; reinversión anual; confianza de la dirigencia por partido y por temporada; objetivo según el ranking de reputación; despido. | `src/engine/career.ts` (finanzas y dirigencia), `seasonReview` en `game.ts` |
| Carrera del DT | Perfil (trayectoria, estilo, seis atributos con efecto en el juego), prestigio, historial y títulos; mercado de entrenadores semanal; ofertas de trabajo durante la temporada y al cierre; despido y nuevas ofertas; cambio de club. | `src/engine/career.ts`, `src/ui/Start.tsx`, `src/ui/Club.tsx` |
| Plantel | Personalidad (ambición, temperamento, lealtad, presión), rol en el plantel y minutos esperados, conformidad, pedidos para irse, promesas, charlas individuales, armonía y referentes, reserva semanal, juveniles de inferiores. | `src/engine/squad.ts`, `makeYouth` en `career.ts` |
| Ojeo | Conocimiento de cada jugador ajeno (0 a 100), rangos que siempre contienen el valor real (`shown`), ojeo activo de hasta diez jugadores, aprendizaje al enfrentarlos, informe completo; orden de tablas por el punto medio del rango. | `knowOf`, `shown`, `scout`, `learnFromMatch` y ojeo diario en `squad.ts`; `PlayerTable.tsx` |
| Entrenamiento y cuerpo técnico | Cuerpo técnico de cinco puestos (`sab`), bolsa de libres, contrataciones y despidos; entrenamiento diario (intensidad, foco colectivo e individual, descanso, delegación), físico, lesiones, familiaridad, mejora de atributos (`tx`); ventaja del foco en el próximo partido; informe semanal; entrenamiento semanal de los rivales. | `src/engine/week.ts`, `weeklyAiTraining` en `ai.ts` |
| IA de los rivales | Plan de cada partido (`planMatch`: fuerza de los onces, repliegue o presión, ataque al lateral flojo, marca personal, salida larga, dibujo defensivo), identidad táctica del club (`styleOf`), rotación con partidos cercanos; reacciones durante el partido (`aiManage`, en `match.ts`). | `src/engine/ai.ts`, `aiManage` en `match.ts` |
| Prensa e informes | Conferencias previas y posteriores con efectos en moral, confianza y prestigio; delegación en el ayudante; clásicos (`isDerby`); informe del rival con precisión según el cuerpo técnico y sugerencias aplicables a la táctica (`scoutReport`). | `src/engine/week.ts` |
| Comunicación y bandeja | Noticias (`news`) con `pid`, `act`, `ref` y `me`; categorías de la bandeja; pendientes calculados del estado (`pendingOf`); claves de decisión que frenan el avance (`decisionKeys`); contadores en la navegación; eventos del día (`dayEvents`) como disparador de informes y conferencias. | `news` en `game.ts`, `src/ui/Inbox.tsx`, `dayEvents` en `week.ts`, `advance` en `App.tsx` |

---

## Categorías

Categorías del proyecto (adaptadas de la plantilla; se sacaron Audio, porque el juego no tiene sonido, y Persistencia y Meta, que no tienen sistema propio en este índice).

| Categoría | Descripción | Sistemas |
|-----------|-------------|----------|
| **Datos** | El mundo real cargado como base del juego | Base de datos |
| **Núcleo** | Calendario, tiempo y estructura de la temporada | Temporada y ligas |
| **Juego** | Lo que pasa en la cancha y en el grupo | Motor de partido, IA de los rivales, Copas, Plantel, Ojeo |
| **Progresión** | Cómo crecen los jugadores y el DT | Entrenamiento y cuerpo técnico, Carrera del DT |
| **Economía** | Plata y pases | Economía y dirigencia, Mercado de pases |
| **Narrativa** | Historias emergentes y voz del mundo | Prensa e informes |
| **Interfaz** | Cómo le llega la información al jugador | Comunicación y bandeja |

---

## Niveles de prioridad

En un juego ya construido la prioridad indica cuánto depende de cada sistema el bucle central, no cuándo se construye.

| Nivel | Definición | Sistemas | Urgencia del GDD |
|-------|------------|----------|------------------|
| **MVP** | Sin esto no existe el bucle "avanzar, preparar, jugar, reaccionar" | Base de datos, Motor de partido, Temporada y ligas, Comunicación y bandeja | Primero |
| **Vertical Slice** | Completan la semana y el partido | IA de los rivales, Plantel, Entrenamiento y cuerpo técnico, Prensa e informes | Segundo |
| **Alpha** | El mundo y la gestión alrededor | Economía y dirigencia, Copas, Ojeo, Mercado de pases, Carrera del DT | Tercero |
| **Full Vision** | Lo planeado (ver "Funciones planeadas") | — | Según se necesite |

---

## Mapa de dependencias

Ordenado de la base hacia arriba. Las dependencias salen de qué funciones llama cada módulo y de qué datos lee.

### Capa base (Foundation, sin dependencias)

1. **Base de datos**: todo el resto lee clubes, jugadores, atributos, puestos y valoraciones; se genera fuera del juego (`npm run db`).

### Capa núcleo (Core, depende de la base)

1. **Motor de partido**: depende de Base de datos (atributos, puestos, roles). Recibe del exterior, como parámetros de `createMatch`, la ventaja del DT, del entrenamiento y de la armonía.
2. **Temporada y ligas**: depende de Base de datos y Motor de partido (juega y registra los partidos de cada día).
3. **Economía y dirigencia**: depende de Base de datos (reputación) y Temporada y ligas (recaudación por partido, premios, puntos contra lo esperado, revisión de fin de temporada).

### Capa de funciones (Feature, depende del núcleo)

1. **IA de los rivales**: depende de Base de datos, Motor de partido, Temporada y ligas (calendario para rotar).
2. **Copas**: depende de Temporada y ligas (fixture, tablas, avance de fases), Motor de partido (eliminación, global), Economía y dirigencia (premios).
3. **Plantel**: depende de Base de datos, Motor de partido (minutos jugados), Temporada y ligas (después de cada partido y cada día), Carrera del DT (motivación y prestigio del DT).
4. **Entrenamiento y cuerpo técnico**: depende de Base de datos, Temporada y ligas (días al próximo partido), Economía y dirigencia (sueldos e indemnizaciones), Plantel (progreso `tx` compartido con la reserva y las charlas).
5. **Ojeo**: depende de Base de datos, Motor de partido (se aprende al enfrentar), Plantel (vive en `squad.ts`, revela la personalidad), Entrenamiento y cuerpo técnico (jefe de scouting).
6. **Mercado de pases**: depende de Base de datos, Temporada y ligas (fechas del libro), Economía y dirigencia (presupuesto, tope, caja), Plantel (rol, personalidad, conformidad), Ojeo (lo que se sabe del jugador), Carrera del DT (negociación).
7. **Carrera del DT**: depende de Temporada y ligas (tablas para el mercado de entrenadores), Economía y dirigencia (confianza, objetivo, despido), Plantel (al cambiar de club se inicializa el plantel nuevo).
8. **Prensa e informes**: depende de Temporada y ligas, IA de los rivales (táctica del rival en el informe), Plantel (moral), Economía y dirigencia (confianza), Carrera del DT (prestigio), Entrenamiento y cuerpo técnico (precisión del informe y delegación en el ayudante).

### Capa de presentación (Presentation, depende de las funciones)

1. **Comunicación y bandeja**: depende de todos los sistemas que generan noticias o decisiones (Temporada y ligas, Mercado de pases, Carrera del DT, Plantel, Ojeo, Prensa e informes, Entrenamiento y cuerpo técnico). Frena el avance de días cuando aparece una decisión nueva.

### Capa de pulido

Ningún sistema de este índice. El pulido (guía, ayudas, accesibilidad, ajustes, celular) está en `docs/plan-ui-ux.md` y `design/accessibility-requirements.md`.

---

## Orden recomendado de diseño

Los GDD se escriben en paralelo a partir del código; este orden es el de revisión. Los sistemas de una misma capa se pueden revisar a la vez.

| Orden | Sistema | Prioridad | Capa | Agentes | Esfuerzo |
|-------|---------|-----------|------|---------|----------|
| 1 | Base de datos | MVP | Foundation | game-designer | M |
| 2 | Motor de partido | MVP | Core | game-designer, systems-designer | L |
| 3 | Temporada y ligas | MVP | Core | game-designer | M |
| 4 | Economía y dirigencia | Alpha | Core | economy-designer | M |
| 5 | IA de los rivales | Vertical Slice | Feature | game-designer, systems-designer | M |
| 6 | Plantel | Vertical Slice | Feature | game-designer, systems-designer | M |
| 7 | Entrenamiento y cuerpo técnico | Vertical Slice | Feature | systems-designer | M |
| 8 | Prensa e informes | Vertical Slice | Feature | game-designer | S |
| 9 | Copas | Alpha | Feature | game-designer | S |
| 10 | Ojeo | Alpha | Feature | systems-designer | S |
| 11 | Mercado de pases | Alpha | Feature | economy-designer | L |
| 12 | Carrera del DT | Alpha | Feature | game-designer | S |
| 13 | Comunicación y bandeja | MVP | Presentation | game-designer, ux-designer | S |

S = una sesión, M = dos o tres, L = cuatro o más.

---

## Dependencias circulares

- **Motor de partido ↔ Plantel, Entrenamiento y Carrera del DT**: el motor usa la armonía (`harmonyBoost`), el foco del entrenamiento (`trainEdge`) y los atributos del DT (`mgrBoost`), y esos sistemas usan el resultado del partido. Se corta con el contrato de `createMatch`: los efectos entran como multiplicadores en `MatchOpts` (`boost`, `sp`) antes del partido y el resultado sale por `applyResult` después. El motor no importa esos módulos.
- **Temporada y ligas ↔ Copas**: `game.ts` llama a `scheduleCups` y `progressCup`, y `cups.ts` usa el fixture y las tablas de `game.ts`. Se diseñan juntos; el contrato es `Competition` y `Fixture` (`types.ts`). La tercera categoría vive en `cups.ts` pero intercambia clubes con la Primera Nacional en `startNewSeason`: los dos GDD tienen que citar la misma regla.
- **Economía y dirigencia ↔ Carrera del DT**: la confianza baja hasta el despido (dirigencia) y el cambio de club reinicia la dirigencia (carrera). El contrato es `Board` (`types.ts`).
- **Ojeo ↔ Entrenamiento y cuerpo técnico**: el ojeo usa la capacidad del jefe de scouting (`sab`) y `week.ts` importa de `career.ts`, que importa `sab` de `week.ts`. Es un ciclo de módulos, no de diseño.
- **Comunicación y bandeja ↔ todos**: todos los sistemas escriben noticias con `news()` y la bandeja los lee. Se corta con el contrato `News` (campos `pid`, `act`, `ref`, `me`), que conviene tratar como parte de la capa núcleo aunque la bandeja sea presentación.

---

## Sistemas de alto riesgo

| Sistema | Tipo de riesgo | Descripción | Mitigación |
|---------|----------------|-------------|------------|
| Motor de partido | Diseño | Cualquier cambio en `attack`, `chance` o `shot` mueve toda la calibración (2,1 a 2,3 goles por partido, 39 a 42 % de triunfos locales, 26 a 28 % de empates). | Correr `npm run sim -- 2` después de cada cambio; la calibración de referencia está en `CLAUDE.md`. |
| Economía y dirigencia | Diseño | La caja de los clubes grandes crece unos 10 millones por año, sobre todo por ventas al exterior. | Pendiente 3 de `CLAUDE.md`; medir con `npm run sim -- 3`. |
| Mercado de pases | Diseño | Depende de la economía: si la IA rica acumula, compra de más. Hoy no se pueden ceder jugadores propios a préstamo. | Revisar con la economía; préstamos de juveniles planeados. |
| Base de datos | Alcance | Depende de Wikipedia en español: fichas sin estadísticas (unos 20 jugadores), puestos genéricos, escudos faltantes. | `data/overrides.json`, `tools/fetch_stats.py`, `tools/fetch_crests.py`. |
| Temporada y ligas | Diseño | No hay descensos desde la tercera categoría (no hay cuarta), así que la base de la pirámide no tiene riesgo. | Planeado en `CLAUDE.md`. |
| Comunicación y bandeja | Diseño | Si una decisión nueva no entra en `pendingOf`, el avance hasta el partido no frena y el jugador la pierde. | Regla para cada sistema que agregue decisiones; criterio de aceptación en el GDD. |

---

## Funciones planeadas (no construidas)

De las secciones "Falta" y "Pendiente" de `CLAUDE.md`. Ningún GDD tiene que describirlas como hechas.

| Función | Sistema |
| ---- | ---- |
| Préstamos de juveniles propios a otros clubes | Mercado de pases, Plantel |
| Conflictos en los planteles rivales | Plantel, IA de los rivales |
| Consecuencias de la prensa más allá del partido | Prensa e informes |
| Descensos desde la tercera categoría | Temporada y ligas, Copas |
| Supercopa y Trofeo de Campeones | Copas |
| Frenar el crecimiento de la caja de los grandes | Economía y dirigencia, Mercado de pases |
| Completar estadísticas y escudos faltantes | Base de datos |

`CLAUDE.md` también lista "que los rivales entrenen" como pendiente, pero el código ya lo hace: `weeklyAiTraining` (`ai.ts`) corre cada lunes desde `dayEvents` (`week.ts`). Se trata como construido.

---

## Requisitos de UI por sistema

Para la revisión de UX: cada sistema con "Sí" en la enumeración tiene que estar representado en estas pantallas (o justificar su ausencia).

| Sistema | Pantallas y componentes |
| ---- | ---- |
| Base de datos | Ninguna propia. Aviso de fuente en `Start`; noticia "Base de jugadores actualizada" cuando corre `refreshDb`. |
| Motor de partido | `MatchView` (marcador `.mboard`, cancha `Pitch2D`, relato, paneles de `MatchPanels`), `PostMatch`, `MatchReport` (`common.tsx`), `Tactics` (dibujo, roles, instrucciones, pateadores, córners). |
| Temporada y ligas | `home` (tabla de zona, próximo partido, última fecha, fin de temporada), `fixtures`, `tables` (Apertura, Clausura, Anual, Promedios, Primera Nacional), `stats`, `calendar`, barra superior (fecha, Continuar, Ir al partido, progreso del avance). |
| Economía y dirigencia | `club` (confianza, objetivo, finanzas), `market` pestaña Finanzas, mosaicos Dirigencia y "Para atender" de `home`. |
| IA de los rivales | Sin pantalla propia: informe del rival (`ReportModal`), relato del partido (cambios de la IA), `data` pestaña Rivales, ficha de club (`clubv`). |
| Copas | `tables` (Tercera, Copa Argentina, Libertadores, Sudamericana), `fixtures`, `calendar`, `home` (agenda). |
| Plantel | `squad` (`PlayerTable`, acciones masivas), `locker` (armonía, referentes, roles, minutos, reserva), `TalkModal`, ficha `player` pestaña Vestuario. |
| Entrenamiento y cuerpo técnico | `training`, `staff`, noticia del informe semanal. |
| Ojeo | Rangos en `PlayerTable` y en la ficha `player` (pestaña Ojeo), acción masiva de ojear (`scoutBulk`), seguimiento en `market`, `HoverCard`. |
| Mercado de pases | `market` (buscar, ofertas recibidas, seguimiento, movimientos), ficha `player` pestaña Contrato y mercado, `NegotiationModal`, acciones en la bandeja. |
| Carrera del DT | `Start` (perfil, trayectoria, estilo, club), `club` (perfil, carrera, títulos), pantalla Fin de ciclo (`App.tsx`), ofertas de trabajo en la bandeja. |
| Prensa e informes | `PressModal` y `PressPanel` (también en `PostMatch`), `ReportModal`, tarjeta "Próximo partido" de `home`. |
| Comunicación y bandeja | `inbox` (categorías, Pendientes, lectura con acciones), botón de pendientes y contadores en `TopNav`, mosaico Mensajes de `home`, freno del avance. |

---

## Seguimiento

| Métrica | Cantidad |
|---------|----------|
| Sistemas identificados | 13 |
| GDD empezados | 13 (en redacción en paralelo) |
| GDD revisados | 0 |
| GDD aprobados | 0 |
| Sistemas MVP con GDD | 0/4 aprobados |
| Sistemas Vertical Slice con GDD | 0/4 aprobados |

---

## Próximos pasos

- [ ] Revisar y aprobar esta enumeración con el usuario.
- [ ] Revisar primero los GDD de nivel MVP (Base de datos, Motor de partido, Temporada y ligas, Comunicación y bandeja).
- [ ] Pasar cada GDD terminado por revisión de diseño.
- [ ] Alinear los GDD de Temporada y ligas y Copas sobre la tercera categoría y el intercambio con la Primera Nacional.
- [x] Actualizar `CLAUDE.md` para sacar "que los rivales entrenen" de lo pendiente (hecho, 2026-11-14).
