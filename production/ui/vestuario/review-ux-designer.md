# Revisión UX del Vestuario (fase 4 de /team-ui)

- **Revisor**: ux-designer
- **Fecha**: 2026-11-15
- **Rama**: `vestuario-ui` (código de `3d097ad`; `6e63588` solo suma la revisión del art-director)
- **Contrato**: `design/ux/vestuario.md` (secciones 4 a 7, tabla de foco de la 12 y criterios de la 14) y `design/ux/bandeja.md` sección 15, entradas 24 y 25.
- **Cómo se revisó**: leí el código y probé todo con scripts propios de Playwright, no solo con la prueba del implementador. Los scripts y las capturas están en el scratchpad de la sesión (`kb.cjs`, `flow.cjs`, `misc.cjs`, `perf.cjs`, `axe2.cjs`, `axe3.cjs`, `fit.mjs`, `shots/`). Hice lo siguiente:
  - una pasada solo con teclado a 1440 × 900 y a 1024 × 768;
  - un flujo real: ocho jugadores disconformes, una charla con dos de ellos, el partido jugado desde la interfaz ("Ir al partido", "Jugar", "Ir al final", "Continuar", "Saltear todo"), dos pedidos de salida reales y las respuestas desde la bandeja y desde el Vestuario; después avancé día por día hasta que la charla volvió a estar disponible;
  - "Armar la reserva" de punta a punta, a 1440 y a 320, hasta el mensaje del miércoles;
  - el celular a 390 × 844 y la tabla a 320, 360 y 390, también con el texto al 120 %;
  - un jugador vendido con la pantalla abierta y un pedido cerrado por una cláusula;
  - el avance en curso; 1280 × 720, 1180 y 1181 px y deuteranopía;
  - axe-core en estados que la prueba del implementador no mide;
  - rendimiento sobre el build de producción (`vite preview :4318`).
  
  La prueba del implementador (`tests/ui/vestuario.cjs`) pasa completa (368 de 368, y 36 de 36 con axe), y `npm run test:engine` también (278 comprobaciones en vestuario, 0 fallas).

## Veredicto: **APROBADO CON CAMBIOS MENORES**

Lo central del contrato funciona en el juego real, no solo con estados inyectados:

- Un pedido de salida que llega después de un partido jugado cuenta 1 en la insignia, no 2, y no se repite en el Inicio.
- Se resuelve desde la bandeja, desde la ficha y desde el Vestuario, y en cada camino el mensaje queda leído.
- Con la charla ya usada, la acción principal es "Declararlo transferible", nunca un "Hablar" deshabilitado, y la charla vuelve a los 7 días.
- La reserva se arma con el mouse, con el teclado y con el toque.
- El foco vuelve al lugar que dice la tabla de la sección 12.

Encontré **seis cambios menores y algunos detalles, ninguno bloqueante**, pero dos criterios de la sección 14 no se cumplen:

- la tabla del Plantel cambió qué columnas oculta;
- la ficha breve sigue dibujando la moral con `Cond`.

Además falla un contraste AA en la bandeja. Los seis cambios menores son baratos y conviene hacerlos antes de cerrar la fase.

## Desvíos declarados: dictamen

| Desvío | Dictamen |
|---|---|
| Anchos `happy` 124, `mins` 96 y `res` 100 | **Aceptado para el Vestuario, con dos efectos que hay que corregir.** (1) `happy` y `mor` son columnas compartidas, así que las otras tablas ahora ocultan columnas en otros anchos (hallazgo M2). (2) A 320 px el nombre queda en 102 px y los 36 nombres se cortan en 5 o 6 letras (hallazgo M3). |
| Nombre accesible del alternable de reserva ("Anotar a X en la reserva" / "✓ Anotado: X en la reserva") en lugar de "Sacar a X…" | **Aceptado: es mejor que la spec.** Con `aria-pressed="true"`, el nombre "Sacar a X de la reserva" se leería como "Sacar…, presionado", y el texto visible "✓ Anotado" no estaría en el nombre accesible (WCAG 2.5.3). Hay que corregir la spec. |
| Chip "Quiere irse" en `--text` sobre filas elegidas | **Aceptado**, pero no alcanza: el mismo chip falla contraste en la tarjeta del jugador de la bandeja y en el Plantel de Independiente (hallazgo M1). |
| En la bandeja, Tab desde el título salta directo a "Declararlo transferible" | **Aceptado con reparo** (hallazgo M5). El orden del foco no es recíproco: Tab saltea la tarjeta del jugador, pero Mayús + Tab desde el primario vuelve a ella. Funciona y no decide sin querer. |
| "Hablar" de la ventana enfocable, con `aria-disabled` y el motivo a la vista | **Aceptado.** Tiene el motivo visible y en `aria-describedby` ("Elegí qué decirle." / "Elegí un rol distinto del que tiene."), y Enter no hace nada mientras no esté listo. Es lo que pide la sección 12. |
| El encabezado pasa a `<details>` por debajo de 560 px | **Aceptado.** Es lo que dice la 5.2. Se mide con `ResizeObserver` y escala con el tamaño del texto en lugar de `@container`; se probó a 320, 360 y 390, y con el texto al 120 %. |

## Lo que el implementador dejó afuera: dictamen

| Punto | Dictamen y evidencia |
|---|---|
| Texto de `TIPS.locker` (`Guide.tsx:78`) | **No cumple la 5.3.** La ayuda sigue con el texto viejo y no dice para qué sirve la pantalla nueva (hallazgo m1). |
| Ficha breve con la moral en `Cond` (`Nav.tsx:128`) | **No cumple la 14** ("ninguna pantalla dibuja la conformidad ni la moral con `Cond`"). La revisión de código de la prueba no la detecta porque no mira `Nav.tsx` (hallazgo M4). |
| 1280 × 720 y deuteranopía sin automatizar | **Verificado a mano.** Ver la tabla de la sección 14. |
| Rendimiento sin medir | **Medido: cumple.** Ver la sección 14. |
| "Hablar con él" desde la bandeja sin clic en la prueba | **Verificado con un pedido real**: lleva a la ficha › Vestuario con el foco en "Hablar con él"; "Decirle que no se va", Listo y Atrás devuelven a la bandeja con la decisión resuelta, el mensaje leído y la insignia en 7 → 6. |
| Vendido con el panel abierto | **Cumple con un club argentino.** Si el jugador sale del juego (venta al exterior), el panel salta en silencio a otro jugador (hallazgo m3). Con la charla abierta, el foco queda en `body` (hallazgo m4). |
| Pedido cerrado sin decisión del DT | **Cumple.** Con la cláusula (`doTransfer`), el pendiente desaparece y el mensaje cuenta 1 como mensaje común. La insignia suma además 1 por la noticia nueva del pase, que es correcto. La plantilla dice "Ya no está en el plantel." y no ofrece acciones. |

## Criterios de la sección 14

### Rendimiento (build de producción, plantel de 36)

| Criterio | Estado | Evidencia |
|---|---|---|
| Primer cuadro < 100 ms (mediana de 5) | cumple | Mediana de 66,7 ms en 7 medidas (56,7 a 114,5 ms). Con la CPU 4 veces más lenta, 322 ms: el margen es chico en máquinas modestas. |
| Elegir otra fila < 50 ms (p95 de 30) | cumple | p95 de 26,8 ms (mediana 23,1). Con la CPU 4 veces más lenta, p95 de 119 ms. |
| Abrir la charla < 100 ms | cumple | Mediana de 31,7 ms. |
| `attentionOf` + `harmony` + `promiseStatus` < 2 ms | cumple | Mediana de 0,4 ms y p95 de 0,7 ms en dev (que es más lento que producción). |

### Propósito de la pantalla

| Criterio | Estado | Evidencia |
|---|---|---|
| Orden de "Para atender" con 4 motivos, primera fila a la vista a 1440 × 900 y a 360 × 740 | cumple | La prueba lo comprueba; a 390 la primera fila está en y = 437. A 320 × 568 queda debajo del pliegue, pero ese tamaño no está en el criterio. |
| Dos motivos, una sola fila; N cuenta jugadores | cumple | Prueba; el "Muy molesto" aparece como chip secundario del pedido. |
| Causa con números y consecuencia en cada fila | cumple | Visto en el flujo real: "Quiere irse: juega 0 % y espera 62 %. Si no le respondés, resta armonía y, con el libro abierto, siguen llegando ofertas por él." |
| Promesa que va bien y promesa en riesgo con sus cifras | cumple (pantalla) / no verificado (casos de borde) | Vi "Le prometiste 58 % hasta el 3 feb: lleva 31 %. Le faltan 122 minutos en 2 partidos." No probé "Ya no llega" ni el partido el mismo día de `until`. |
| "Qué la mueve" suma exactamente | cumple | Pantalla: +64 −6 = 58. Los casos de borde, según `test:engine`. |
| Temperamental 14/13 | cumple según `test:engine` | No lo revisé en pantalla. |
| Promesa con 0 minutos, Suplente "En baja" | cumple según `test:engine` | No lo revisé en pantalla. |
| "Puede pedir irse después del próximo partido…" | cumple | `LockerCard`; no encontré "en cualquier momento". |
| "Muy molesto" con 14 y "Molesto" con 30, igual en las tres vistas | cumple | Fila, `LockerCard` y tabla (captura con deuteranopía). |
| Línea del Inicio con N y sin nombrar el pedido | cumple | Flujo real: "Pendiente: 2 jugadores que quieren irse" y "Vestuario: clima normal (45) · 8 casos". |
| Referente con 44: "! Resta" | cumple | Encabezado y fila "Referente que resta". |
| Misma palabra y mismo corte en todas las pantallas; sin `moodTxt` | **no cumple (parcial)** | `moodTxt` ya no está. Pero la ficha breve todavía usa `Cond`, con sus cortes 85/65 y sin palabra (M4). Además, la conformidad sin dato se toma como 50 en la bandeja (`Inbox.tsx:532`), como 60 en la tabla (`PlayerTable.tsx:70`) y como 70 en el motor (m5). |
| Personalidad en palabras; `persLabels` en ninguna pantalla | cumple | Liderazgo solo como "Líder natural", como dice la sección 8. |
| Lealtad 12/13, profesionalismo, ambición 11/12 y 14/15 | cumple según `test:engine` | En el flujo real, lealtad 6 con "Decirle que no se va" dio "de mala gana" (14 → 0, moral −8), como anuncia la regla. |
| Columna `pers` ordenada por banda | no verificado en pantalla | `persSort` arma la clave por banda y después el nombre (`PlayerTable.tsx`). |
| Disponibilidad de las charlas | cumple según `test:engine` | En la ventana, "No disponibles ahora…" aparece debajo del grupo. |
| "En baja" con 70: primero "Cambiarle el rol"; con pedido, primero "Decirle que no se va" | cumple | Prueba y flujo real (`stay,promise,status,free,patience,praise,demand`). |
| Ninguna opción anticipa el resultado | cumple | Revisé los textos de `TALK_RULE`. |
| `test:engine` y `sim` | cumple (`test:engine`) / no verificado (`sim`) | No corrí `npm run sim`. |
| Antes → después iguales al motor, con los cambios de estado | cumple | Teclado: "Conformidad 50 pasa a 68 · Moral 62 pasa a 67 · Minutos prometidos hasta el 14 feb". |
| Confirmación solo en prometer, rol y club; "No" y Esc vuelven | cumple | Teclado: Hablar → foco en "Confirmar: prometerle minutos"; Mayús + Tab → "No"; Esc vuelve a elegir. |
| Cerrar sin hablar no cambia `p.lastTalk` | cumple | Prueba. |
| Charla usada: el mismo texto en todas partes y ningún "Hablar" deshabilitado | cumple | Fila, `LockerCard`, banda y bandeja. En la bandeja el texto sale **dos veces** (m2). |
| Registro "Charlas y promesas" | cumple (pantalla) | No probé una partida vieja. |
| Prórroga de la promesa (R6) | no verificado | — |

### Dos caminos para dejarlo ir

| Criterio | Estado | Evidencia |
|---|---|---|
| La comparación se ve sin abrir nada | cumple | Fila, `LockerCard`, bandeja y opción de la charla. |
| Efectos de cada camino | cumple | Prueba y flujo real. |
| Libro cerrado: fechas de `windowState`, nunca "1 ene" | no verificado | Probé con el libro abierto. Las variantes están en `LetGo` y `listedNote` (`mood.tsx`). |
| Charla usada: "(charla, desde el 31 ene)" | cumple | Bandeja y fila en el flujo real. |

### Una decisión, una vez

| Criterio | Estado | Evidencia |
|---|---|---|
| Un pedido nuevo suma 1, no 2; el Vestuario no tiene insignia; el Inicio lo nombra una vez | cumple | Flujo real: dos pedidos dan dos pendientes y 0 "sin leer" extra; el Vestuario no tiene insignia. |
| Resolver desde el Vestuario, la ficha y la bandeja | cumple | Flujo real, insignia 7 → 6 → 5. |
| `pendingKeyOf`/`unreadOf` | cumple | Contado con `unreadOf` con y sin los mensajes `out`. |
| Renovar, vender a un club argentino o al exterior, acción masiva | cumple | Prueba (exterior y renovación) y mi prueba de venta. |
| Cláusula, préstamo, libre, retiro, cambio de club | cumple (cláusula) / no verificado (el resto) | — |
| "Quitar de transferibles" reabre | cumple | Prueba. |
| Temporada nueva: "sigue queriendo irse" | no verificado | — |
| Felicitar o exigir no resuelven el pedido | no verificado en pantalla | — |
| Dos mensajes del mismo jugador | no verificado | — |
| Bandeja › "Hablar con él" → foco → resolver → Atrás | cumple | Flujo real (ver arriba). |
| Charla usada: el foco en el título "Charla" y Enter no decide | cumple | Prueba. |
| Charla un día y pedido otro, de vuelta "Hablar" el lunes siguiente | cumple | Flujo real: charla el 24 ene, pedido después del partido del mismo día, "Declararlo transferible" como primario en las tres vistas y "Hablar" de vuelta el 31 ene. |

### Navegación e historial

| Criterio | Estado | Evidencia |
|---|---|---|
| Tres filtros y Atrás sale | cumple | Prueba. |
| ≥ 1180 no apila; a 1024 abre la ficha y Atrás devuelve el foco a la fila | cumple | Teclado: `history.length` no cambia con Enter en la tabla. A 390, Atrás deja el foco en la fila de la que salió. |
| Mosaico del Inicio con el primero elegido; "Armar la reserva" del mensaje | cumple | Flujo real del miércoles, a 1440 y a 320: modo Reserva, `tab: 'todo'`, y Atrás vuelve a la bandeja. |
| Reserva con toque a 390 y 320, y con teclado a 1024 | cumple | Toque: 5 sanos + 1 lesionado → "Reserva: 5 anotados y sanos, faltan 2"; alternables de 86 × 44. |
| Prioridades de columna; las otras tablas sin cambios | **no cumple (otras tablas)** | Vestuario y Reserva, según lo pedido. Plantel › Contrato a 1024 ya no muestra Conformidad, y General pierde Sueldo en presupuestos de 1134 a 1304 px (M2). |
| Foco al entrar a 1024 y a 390 | cumple | Primera fila, sin `aria-current`. |
| "Contrato y renovación" y "Ver transferibles" | cumple | Prueba y flujo real. |

### Estados vacíos y errores

| Criterio | Estado | Evidencia |
|---|---|---|
| Nadie para atender | no verificado | — |
| Comienzo de temporada | no verificado | — |
| Reserva con 5 sanos o sin anotados | cumple | "! Reserva: 5 anotados y sanos, faltan 2 para el mié 14 ene"; "sin anotados (no se juega)". La línea del modo dice "6 anotados" sin aclarar cuántos están sanos (m6). |
| `save()` que falla | cumple en la respuesta de la charla | Desde el estado "Ya hablaron", "Declararlo transferible" pierde el aviso (`Locker.tsx:457`, m7). |
| Vendido con el panel abierto | cumple con un club argentino | Al exterior, ver m3. |

### Jugadores ajenos

| Criterio | Estado | Evidencia |
|---|---|---|
| 59 %, 60-99 % y 100 % | cumple en la ficha | `PersView`; la tarjeta "Ánimo" ya no muestra el número. No revisé la ficha breve con un ajeno. |
| Los extremos caen dentro de su banda | cumple según el código (`isExtreme`) | — |
| Mensaje "Informe completo" | cumple | Texto en `squad.ts`. |

### La pantalla no escribe en `g`

| Criterio | Estado | Evidencia |
|---|---|---|
| Sin escrituras directas ni `Cond`; acciones y comparación del motor | **no cumple (parcial)** | No hay escrituras directas (`ownBulk` pasa por `setReserve` y `setListed`). Queda `Cond` para la moral en la ficha breve (M4). |

### Visibilidad de las acciones

| Criterio | Estado | Evidencia |
|---|---|---|
| `elementFromPoint` en todas las resoluciones | cumple | Prueba en 5 tamaños. A mano: 1280 × 720, 1180 y 1181. Las acciones del panel caen debajo del alto visible del panel a 1280 × 720 y se alcanzan con su desplazamiento propio, como pide la 5.2. |
| Tab: cada foco se ve, también con la barra masiva | cumple | Con filas marcadas y ↓ 14 veces, la fila con foco se ve entera. A 390, nada queda debajo de N3. |
| Nada fijo con acciones salvo `.bulkbar` | cumple | — |
| Charla a 320 con "Cambiarle el rol" | cumple | Prueba; a 390, el selector de rol mide 44 px. |
| Devolución del foco por origen | cumple | Fila, panel ("Hablar con él" sin hablar; título "Charla" después de hablar) y banda (prueba). Excepción: el jugador se va con la ventana abierta (m4). |
| Sin desplazamiento horizontal; texto al 120 % | cumple | Prueba y 390. A 320 los nombres se cortan (M3). |

### Accesibilidad

| Criterio | Estado | Evidencia |
|---|---|---|
| Nada por debajo de 12 px | cumple | Prueba. |
| `check-contrast` sin fallas | cumple, pero axe encuentra una | `check-contrast` y `contraste.mjs` dan 0 fallas. Pero axe da 4,09:1 para "Quiere irse" en la tarjeta de la bandeja (los tres clubes) y 4,34:1 en el Plantel de Independiente (M1). |
| Deuteranopía y modo daltónico | cumple | Captura con `cvd` y la emulación de CDP: conformidad y moral con número y palabra, minutos "20/62 %" con la marca, chips con "!" y forma, fila elegida con riel. |
| axe-core sin infracciones A/AA | cumple en lo que pide el criterio | Vestuario, ficha y ventana: 0. Fuera del criterio: bandeja (contraste M1, más un `label-content-name-mismatch` que ya estaba) y ficha › Resumen (`aria-prohibited-attr` en `.formbars`, que ya estaba). |
| `aria-labelledby`, `radiogroup`, `status`, `aria-pressed`, medidor `role="img"` | cumple | — |
| Movimiento reducido | no verificado | — |
| 44 × 44 a 360 | **cumple en el Vestuario** | En la ficha › Vestuario, las pestañas de la ficha miden 34 px y "☆ Favorito" y "Contrato ▸" de la banda 27 px. Eso es anterior y global de la ficha, pero el DT llega ahí desde el Vestuario angosto (m8). |
| Atajos de una tecla apagados; Espacio sobre la fila | cumple | Espacio en una fila de la tabla marca la fila y no avanza el día; en "Para atender" activa el botón. |

## Hallazgos

No hay bloqueantes.

### Menores (hacer antes de cerrar la fase)

**M1. "Quiere irse" no llega a 4,5:1 en la tarjeta de la decisión de la bandeja.** `common.tsx:176` (`chip bad`), dentro de la tarjeta `ib-who`.
- axe mide 4,09:1 (#ff5d6c sobre #402e4e, 12 px) con Independiente, Boca y Defensa, y 4,34:1 en el Plantel de Independiente.
- Es la plantilla nueva del pedido de salida, la que el DT lee para decidir.
- **Cambio**: aplicar a `.chip.bad` dentro de tarjetas y filas tintadas el mismo arreglo del desvío aceptado (texto `--text` con el ícono o el borde en `--bad`), o subir el rojo del chip. Sumar ese par a `contraste.mjs` y correr axe sobre la bandeja en la prueba.

**M2. Las otras tablas ahora ocultan columnas en otros anchos.** `PlayerTable.tsx:69-70`: `mor` pasó de 80 a 96 y `happy` de 86 a 124 en `COLS`, que comparten todas las vistas. Lo simulé con el algoritmo de `fit()` comparado con `c789aa6`, y lo confirmé en la pantalla:
- Plantel › Contrato a 1024 × 768 ya no muestra **Conformidad** (antes sí); la vista difiere en presupuestos de 920 a 1164 px;
- Plantel › General pierde **Sueldo** en presupuestos de 1134 a 1304 px.

Esto no cumple el criterio de la pregunta 48. **Cambio**: un ancho por vista con el mismo mecanismo que `prio` y `keep` (`VIEWS[v].w`, que pisa a `COLS[k].w` solo en `vestuario` y `reserva`). También sirve dejar `COLS` como estaba y que `MoodBar sm` entre en 86 y 80 fuera de esas vistas.

**M3. A 320 px la tabla del Vestuario no deja leer los nombres.** Con `happy` en 124 y `keep: 2`, la columna del nombre queda en 102 px: cara de 26 px y unos 60 px de texto. Los 36 nombres se cortan en "Rodrig…", "Santia…", "Facun…", y tres "Santia…" no se distinguen (captura `table-320-100.png`). A 360 se cortan 21 de 36, pero se reconocen; a 390, 3. La spec calculaba 124 px de nombre con `happy` en 110. **Cambio** (cualquiera de estos):
- por debajo de 360 px, nombre corto ("S. Montiel") en la celda, con el nombre completo en el nombre accesible de la fila;
- en `sm` angosto, `MoodBar` con la palabra debajo del número y no al lado, para volver a unos 96 px;
- sacar la cara en la vista `vestuario` por debajo de 360 px.

**M4. La ficha breve sigue mostrando la moral con `Cond`.** `Nav.tsx:128` dibuja `<Cond v={p.morale} />` para los propios: barra con los cortes 85/65 de antes, sin palabra. No cumple el criterio de la sección 14 ni la 5.3, que pide `MoraleBar` en la ficha breve. La revisión de código de `tests/ui/vestuario.cjs` no lo detecta porque no lee `Nav.tsx`. **Cambio**: `<MoraleBar v={p.morale} size="sm" />` (y, si entra, `MoodBar` de la conformidad), y sumar `Nav.tsx` y `Inbox.tsx` a la lista de archivos de `codeChecks()`.

**M5. Bandeja: Tab desde el título salta la tarjeta del jugador y el orden queda asimétrico.** `Inbox.tsx:635`.
- Con la charla usada: Tab desde el título va a "Declararlo transferible" y Mayús + Tab desde ahí va a la tarjeta del jugador (`ib-who`), que con Tab desde el título nunca se alcanza.
- No decide sin querer, que era el objetivo de la pregunta 25, pero el orden del foco no sigue el orden visual (WCAG 2.4.3, débil).
- **Cambio**: no interceptar Tab y poner el bloque de acciones antes de la tarjeta en el DOM solo en esta plantilla, o aceptar la tarjeta como primera parada y corregir la pregunta 25 de `bandeja.md` para que diga "la siguiente parada de Tab después de la tarjeta". Recomiendo lo segundo: es el comportamiento nativo y la tarjeta solo navega.

**M6. La línea del modo Reserva cuenta a los lesionados como si sumaran.** `Locker.tsx:164`. Con 5 sanos y 1 lesionado, el encabezado dice "5 anotados y sanos, faltan 2", pero la línea del modo, que es la que se lee mientras se anota, dice "**6 anotados** · 7 sanos como mínimo": parece que falta uno. **Cambio**: "6 anotados, 5 sanos · faltan 2" (con `res.fit`), igual que el encabezado.

### Detalles (pueden ir con el pulido)

- **m1. `TIPS.locker` con el texto viejo** (`Guide.tsx:78`). Usar el de la 5.3: "Cada jugador espera minutos según su rol. Acá ves quién está molesto y por qué, qué le prometiste y con quién conviene hablar esta semana. Una charla por semana con cada uno."
- **m2. El texto de la charla usada sale dos veces en la bandeja** (`Inbox.tsx:537` y `:544`): una como dato ("Hablaron el 24 ene · de nuevo desde el 31 ene") y otra al principio de `oa.note`. Sacar el dato cuando hay `oa.note`.
- **m3. Venta al exterior con el jugador elegido**: el panel salta en silencio a otro jugador. Pasa porque `Locker.tsx:89` busca `g.players[want]`, y `sellAbroad` borra al jugador, así que `gone` queda en `null` y `picked` cae en `att[0]`. Guardar el nombre al elegir (`seen` como `Map<id, name>`) para poder decir "{nombre} ya no está en el plantel." aunque el jugador ya no exista. Es poco probable: la venta al exterior la acepta el DT en la bandeja.
- **m4. El jugador se va con la ventana de charla abierta**: la ventana pasa a "Ya no está en el plantel." y el foco queda en `body`, porque el radio que lo tenía desaparece y `data-autofocus` solo actúa al montar (`Locker.tsx:464`). Llevar el foco a "Listo" en un efecto cuando `mine` pasa a falso. Además, la línea de estado sigue mostrando su rol y su conformidad.
- **m5. Tres valores por defecto para la conformidad sin dato**: `Inbox.tsx:532` usa 50, `PlayerTable.tsx:70` usa 60 y el motor 70. Hoy no se nota (todos los propios tienen `happy`), pero el commit dice "conformidad por defecto unificados". Usar `p.happy ?? 70` o `moodOf(p.happy).n`.
- **m6. El porcentaje se separa del "%" al cortar la línea** en la ventana: "alrededor del 84 / %" a 390 px (`Locker.tsx:447`, `mood.tsx`). Usar ` ` antes del "%", como ya hace `bnum` en las filas.
- **m7. `listNow` pierde el aviso de guardado fallido**: `Locker.tsx:457` escribe `note.saveErr` después de `onClose`, sin volver a dibujar. Pasar `setNote` como en `LockerCard` o resolver el guardado antes de cerrar.
- **m8. Orden de Tab del panel**: hoy es nombre, "¿Moral o conformidad?", "Hablar con él", "Declararlo transferible", "Contrato y renovación", reserva, "Ver la ficha". La sección 12 pide la charla primero, después la reserva, "Contrato", "Ver la ficha" y por último los desplegables. Lo que molesta es "Contrato" antes que la reserva: invertir `talkSec` y `resSec` en el pie, o mover "Contrato y renovación" debajo de la reserva. Las pestañas de la ficha (34 px) y los botones de la banda (27 px) no llegan a 44 px en el celular. Es un problema global de la ficha, pero ahora es el destino del Vestuario angosto: anotarlo para el pulido.
- **m9. La banda de la ficha durante el avance**: "Hablar" queda deshabilitado sin decir por qué (`PlayerPage.tsx:81`), a diferencia de la `LockerCard` y las filas, que dicen "Frená el avance para hablar con el plantel."
- **m10. El modo "Armar la reserva" queda guardado**: la vista Reserva se guarda en las preferencias de la tabla y el Vestuario abre en ella las veces siguientes. Es coherente con `ta-table-<id>`, pero la spec lo llama "modo". Si se prefiere que el Vestuario abra siempre en la vista Vestuario, que el modo no se guarde. Lo decide el usuario.

## BLOCKED / CONCERNS

- **No verificado**: `npm run sim` con tres semillas, el libro cerrado (las fechas de `windowState` en las cuatro vistas), el mensaje de la temporada nueva "sigue queriendo irse", la prórroga de la promesa (R6), "Nadie para atender", el comienzo de temporada, el movimiento reducido y dos mensajes "quiere irse" del mismo jugador. La lógica está en el motor y `test:engine` pasa, pero no los vi en pantalla.
- **Rendimiento**: cumple, pero con la CPU 4 veces más lenta el primer cuadro tarda 322 ms y elegir una fila 119 ms de p95. Vale la pena vigilarlo si el plantel o la tabla crecen.
