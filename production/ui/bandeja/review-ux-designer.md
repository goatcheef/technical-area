# Revisión UX: Bandeja de entrada (fase 4 de /team-ui)

> **Revisor**: ux-designer
> **Fecha**: 2026-11-14
> **Contrato**: `design/ux/bandeja.md` (secciones 4, 5.3, 6, 7 y 14)
> **Código revisado**: `src/ui/Inbox.tsx`, `src/ui/msg.tsx`, `src/ui/App.tsx` (insignia, freno del avance con `sel`, regla de `nav` en ≤ 900 px), `src/ui/Home.tsx` (mosaico Mensajes), `src/engine/inbox.ts`, `src/styles.css` (bloque de la bandeja), commit `59f0672`.

## Veredicto: NECESITA CAMBIOS

La lógica de la bandeja está bien resuelta y casi todo el contrato se cumple: bloque "Para decidir" con orden y plazos, regla de leído, insignia sin doble conteo, `listbox` con foco itinerante, confirmación en el lugar, estado "Resuelto" con "Siguiente pendiente", valores viejos de `tab`, plantillas por tipo y rendimiento holgado. Pero **la fila de acciones no se ve en ninguna anchura**. Los botones de cada decisión (Aceptar, Pedir más, Rechazar, Responder…) quedan recortados en una franja de 17 px. Lo mismo pasa con la confirmación, la nota de resultado, "Siguiente pendiente", la ayuda de "Pedir más" y las consecuencias de aceptar un trabajo. En celular, además, la barra queda detrás de la navegación inferior y "Rechazar" sale de la pantalla. Así no se cumple el propósito de la pantalla, que es resolver cada decisión ahí mismo.

La corrida automática del implementador (40 OK) no lo detecta por dos motivos. Se corrió a las 19:48:53, antes de la última edición de `Inbox.tsx` y `styles.css` (19:49:04). Y Playwright hace clic en elementos recortados por `overflow`. La repetí sobre el código actual (`rev/ac-rerun.cjs`) y vuelve a dar todo OK, con capturas que muestran la franja recortada. Por eso hay que sumar un control visual a esa corrida (ver H1).

Con H1 y H2 arreglados y repetida la corrida con ese control, el veredicto pasaría a APROBADO CON CAMBIOS MENORES (M1 a M5).

## Cómo se verificó

Scripts y capturas en el directorio de trabajo de la sesión, `/tmp/claude-0/-home-user-technical-area/76ec2d0e-cad7-592f-9aa5-d997ca7a1c22/scratchpad/rev/`:

- `lib.cjs`: partida nueva con Independiente y acceso al estado del juego a través del contexto de React (`GameCtx`: `g`, `nav`, `refresh`) para inyectar casos (lesión, ofertas de trabajo de los dos tipos, oferta en su último día, 320 a 400 mensajes, conferencia, jugador que quiere irse, ojeo, rival, entrenamiento, fin de temporada).
- `review.cjs`, `review2.cjs`, `review3.cjs`: lesión, trabajos, vencimiento con la oferta elegida, valores viejos de `tab`, "Mostrar más", pase completo de teclado, buscador, avance en curso, ventana angosta (860 px) con teclado, axe-core 4.10.2 y plantillas.
- `perf.cjs`, `perf2.cjs`: rendimiento sobre un build de producción (`vite build --outDir` al directorio de trabajo, servido aparte; no se tocó `dist/` del repo) y sobre el servidor de desarrollo.
- `mob2.cjs`, `fixsim.cjs`: medición de la barra de acciones (alto, posición, `elementFromPoint`) a 1440, 800 y 360 px, y simulación del arreglo de H1 para ver lo que queda (H2). Capturas: `mob-1440.png`, `mob-360.png`, `fixsim-360.png`, `shots/escritorio-confirmacion.png`.
- `ac-rerun.cjs`: la corrida del implementador repetida sobre el código actual (capturas y resultados al directorio de trabajo, no a `production/`).

Gamepad: fuera de alcance (AM-10).

## Criterios de aceptación (sección 14)

| # | Criterio | Estado | Evidencia |
|---|----------|--------|-----------|
| **Rendimiento** | | | |
| R1 | Primer cuadro < 100 ms con 400 mensajes | cumple | Producción: 21, 22, 28, 38 y 42 ms desde `nav` hasta el cuadro con filas (5 corridas). En desarrollo, 144 ms (React en modo desarrollo). |
| R2 | ↓ actualiza el panel en < 50 ms, sostenido | cumple | Producción, 90 ↓ seguidas: mediana 8,9 ms, p95 23 ms, máximo 34,5 ms (de la tecla al cuadro siguiente). En desarrollo, p95 51 ms. |
| R3 | Buscador < 50 ms por tecla con 400 mensajes | cumple | Producción: 1,8 a 5,9 ms por tecla. |
| **Propósito de la pantalla** | | | |
| 1 | "Para decidir · 2" a la vista con Torneos, a 1440 × 900 y 360 × 740 | cumple | Corrida automática repetida: OK en las dos anchuras. |
| 2 | Con 0 pendientes, la lista empieza con "Nada para decidir…" | cumple | Corrida repetida. |
| 3 | Bloque ordenado por plazo, conferencia primero | cumple | Con conferencia inyectada: `press…pre`, `out526`. Con dos trabajos y una oferta: trabajo (6 días), oferta (9), trabajo de fin de temporada. La corrida del implementador no tenía conferencia, así que no lo probaba. |
| 4 | Aceptar y rechazar una oferta toman 2 clics; ninguno con 1 | **no cumple** | La lógica está bien (F6 en los dos). Pero los botones no se ven ni se pueden clickear con el mouse: `elementFromPoint` en el centro de "Aceptar" devuelve `.ib-read`. Ver **H1**. |
| 5 | Tras confirmar: nota de resultado y "Siguiente pendiente" con el foco; el panel no salta | **no cumple** | El foco va a "Siguiente pendiente" y la selección no salta, pero la nota y el botón están dentro de la barra recortada (H1). |
| 6 | Oferta nueva: la insignia dice 1, no 2 | cumple | Corrida repetida: insignia 106 = 4 pendientes + 102 sin leer sin decisión. |
| 7 | Entrar sin tocar nada no baja el contador; ↓ y ↑ marcan leído | cumple | Corrida repetida. Ver **M2** (Enter no marca leído). |
| 8 | Tras "Pedir más" con éxito, el mensaje original muestra el monto nuevo con Aceptar, Pedir más y Rechazar | **no cumple** | La lógica cumple (`haggle` conserva el id; corrida original: "Vélez mejoró su oferta"). Pero los botones no se ven (H1). |
| 9 | Trabajo de fin de temporada: se pierde al comenzar; a mitad: desde mañana; los dos con lo que se cancela | **no cumple** | Los textos están bien: "Respondé antes de comenzar la próxima temporada: si la comenzás sin responder, la oferta se pierde.", "Si aceptás, dirigís Racing Club desde mañana." y "Si aceptás, se cancelan 1 oferta por tus jugadores, 1 oferta de otros clubes y tu cuerpo técnico queda en Independiente." Pero la línea de consecuencias vive dentro de `.ib-actwrap.bar` y queda recortada (H1). Ver **M4** (concordancia y "antes del"). |
| 10 | "Quiere irse" dice que no vence; la conferencia, que habla el ayudante | cumple | "No vence: sigue pendiente hasta que lo declares transferible o deje de pedir irse." y "Si seguís sin responder, habla el ayudante." |
| 11 | Cada tipo muestra las tarjetas, cifras y acciones de su plantilla | **no cumple** | Tarjetas y cifras: bien en oferta, trabajo, quiere irse, conferencia, lesión, resultado, ojeo, rival, entrenamiento, temporada y premio. Acciones: el orden y el primario son correctos, pero no se ven (H1). Detalles menores en **M4** (el rival no muestra la fecha del partido). "Seguir" falta en ojeo: desvío aceptado (ver abajo). |
| 12 | Lesión: días que faltan hoy, fecha de vuelta, partidos que se pierde | cumple | Mensaje que dice "unos 40 días" y lesión real de 30: el panel muestra "Días afuera 30 · Vuelve lun 9 feb · Partidos que se pierde 3" (3 es lo esperado). Al pasar un día, 29. Recuperado: "Ya está recuperado." sin cifras. Titular: el primario es "Ir a Tácticas". |
| **Navegación** | | | |
| 13 | El avance frenado por una oferta nueva abre la bandeja con esa oferta elegida | cumple | Corrida repetida: `offer101683` elegida. |
| 14 | Clic en un mensaje del mosaico del Inicio lo abre elegido | cumple | Corrida repetida. `Home.tsx:56` marca leído y pasa `sel`. |
| 15 | Tres cambios de tema y un Atrás salen de la bandeja | cumple | Corrida repetida. |
| 16 | Abrir una ficha y volver deja el mismo alcance, tema, selección y scroll | **no cumple** | Alcance y tema sí. La selección se pierde si el mensaje estaba después de los primeros 150 (fila 200 → al volver, la primera decisión), y el scroll de la lista no se restaura (1500 → 942). Ver **M1**. |
| 17 | 360 px: tocar abre el detalle; Atrás y "◂ Bandeja" vuelven con el foco en la fila | cumple | Corrida repetida. También con teclado a 860 px: Enter abre el detalle con el foco en el título, › pasa al siguiente y Esc vuelve con el foco en la fila leída. |
| 18 | `tab: 'pend'` y los valores viejos abren la vista equivalente sin error | cumple | `me` → Mi club / Todo, `all` → Todo el fútbol / Todo, `partido` → Partidos, `torneo` → Torneos, `pend` → Mi club / Todo con la primera decisión. Los valores desconocidos caen en `club.todo`. Sin errores en la consola. |
| **Estados vacíos y errores** | | | |
| 19 | Cada tema vacío con su texto; búsqueda sin coincidencias con "Borrar búsqueda" | cumple | Corrida repetida (Dirigencia). `EMPTY` en `Inbox.tsx:34` coincide palabra por palabra con la sección 13. |
| 20 | Oferta que vence mientras está elegida: botones reemplazados por texto, sin errores | cumple | Oferta en su último día: "Vence mañana", al día siguiente "Vence hoy", y al otro los botones se reemplazan por "Esta oferta venció el 12 ene 2026." (la variante específica de la sección 6). La fila dice "Ya no está vigente" y desaparece al cambiar la selección. Consola limpia. |
| 21 | Jugador que ya no existe: "Ya no está en el fútbol argentino." y sin acciones sobre él | cumple | Informe de ojeo con un `pid` inexistente. |
| **Teclado e interacción** | | | |
| 22 | Con un menú de la barra abierto, ↑ ↓ no cambian la selección | cumple | Corrida repetida. El oyente está en el `listbox` y respeta `defaultPrevented`. |
| 23 | Espacio sobre un botón del panel lo activa y no avanza el día | cumple | Corrida repetida y chips (Espacio elige "Mercado" y la fecha no cambia). El botón enfocado no se ve hasta que se arregle H1. |
| 24 | La lista es una sola parada de Tab; ↑ ↓ mueven foco y selección; Enter al primario; Esc a la fila | cumple | Inicio, Fin, Re Pág y Av Pág (±10) y ↑ ↓ mueven foco y selección juntos. Fin va a la última fila cargada. Enter lleva a "Aceptar" (o al título si el mensaje no tiene acciones) y Esc vuelve a la fila. El foco cae en un botón recortado (H1), así que hoy el foco no es visible (2.4.7). |
| 25 | Esc con una confirmación abierta la cancela y deja el foco en el botón que la abrió | cumple | Ofertas (corrida repetida) y trabajos (mi prueba). |
| 26 | Sin atajos de una tecla nuevos | cumple | `Inbox.tsx` no agrega oyentes en `window`. |
| 27 | La pantalla no asigna propiedades de `g` | cumple | No hay `n.read =`, `g.jobOffers =` ni `.listed =`. Queda `Object.assign(g.clubs[…].tactic, pp)` en `Inbox.tsx:543` (aplicar sugerencias del rival), que la sección 9 dejó fuera de alcance a propósito. |
| **Accesibilidad** | | | |
| 28 | Nada por debajo de 12 px | cumple | Corrida repetida (escritorio). |
| 29 | Contraste ≥ 4,5:1 con el acento de los 86 clubes, botón primario incluido | cumple | `node tools/check-contrast.mjs`: "BAJO 4,5 (tinta / acento): 0". Pares propios de la bandeja: `contraste-medido.md`, 0 fallas. |
| 30 | Estado activo del alcance y los chips: borde, fondo suave, ✓ y texto normal | cumple | Corrida repetida: `aria-pressed`, ✓ y `rgb(241, 242, 250)` sobre `accent-soft`. |
| 31 | "Mostrar más" fuera del `listbox`, parada siguiente a la lista, Espacio sin avanzar | cumple | Con 320 mensajes: 150 filas más el bloque, y "Mostrar 150 más" fuera del `listbox`. Tab desde la fila lo alcanza y Espacio carga 150 (de 150 a 300 filas) sin cambiar la fecha. El foco se queda y se anuncia "150 mensajes más.". Ver **M3** (foco al terminar). |
| 32 | Foco en una fila: Espacio avanza el día y Enter va al primario | cumple | Corrida repetida (5 jul → 6 jul) y criterio 24. |
| 33 | Daltonismo y emulación de deuteranopía: estados por texto, forma o peso | no verificado | No corrí la emulación. Por inspección del código cumple: "Para decidir" con ícono "!", negrita y punto con `aria-label`, borde izquierdo de 3 px en la elegida, ✓ en el activo, "Vence hoy" / "Vence mañana" y "Victoria / Empate / Derrota" en palabras. |
| 34 | axe-core sin infracciones A/AA (con pendientes, con elegido y en el detalle del celular) | cumple | axe-core 4.10.2: 0 infracciones en `.ib-page` (1440, con pendiente elegido) y en `.ib-detail` (860 px). axe no detecta el recorte de H1. |
| 35 | `aria-pressed`, `listbox` con `aria-selected` y nota `role="status"` | cumple | Corrida repetida e inspección. |
| 36 | Movimiento reducido: entrada y detalle instantáneos | cumple | Con `prefers-reduced-motion: reduce`, `.page-in` queda con `animation-name: none` (`styles.css:246`), igual que con la clase `reduce-motion` (`:245`). |
| 37 | 360 px: objetivos táctiles de al menos 44 × 44 | **no cumple** | Filas, chips, alcance, "◂ Bandeja" y ‹ › cumplen. Los botones de la barra miden 44 px pero no se ven (H1), quedan debajo de la navegación inferior y "Rechazar" queda en x 321–414 (fuera de los 360 px). Ver **H2**. |

Total: 40 criterios. 32 cumplen, 7 no cumplen (6 de ellos solo por H1 y H2; el otro es el 16, por M1) y 1 no verificado.

### Orden de Tab medido (escritorio, desde el principio del documento)

"Saltar al contenido" → barra global (Atrás, secciones, buscador global, herramientas, Ir al partido, Continuar, pantallas de Inicio, pendientes, próximo rival, menú del DT) → **Entendido** (ayuda) → **Buscar en los mensajes** → **Marcar 161 como leídos** → **Mi club** (una parada) → **Todo, 160 sin leer** (una parada) → **fila elegida** (una parada) → **Mostrar 150 más** → tarjeta del jugador → tarjeta del club → Aceptar → Pedir más → Ver la ficha → Rechazar.

Coincide con la sección 12. En un pendiente sin mensaje no aparece "Marcar como no leído", y es lo correcto.

## Desvíos declarados por el implementador

| Desvío | Juicio | Motivo |
|--------|--------|--------|
| "Seguir" fuera de la plantilla de ojeo | **Aceptado** | El informe completo llega cuando termina el ojeo, y `scout()` (`squad.ts:206-210`) ya suma al jugador al seguimiento. El botón diría casi siempre "En seguimiento". Además, no hay una función del motor para alternarlo: las otras pantallas escriben `g.shortlist` a mano. Hay que actualizar la especificación (5.3, 7.2 y 9) para sacarlo y anotar que "función existente de seguimiento" no existía. |
| "Error al guardar" sin implementar | **Aceptado como diferido** | La propia especificación lo condiciona a la pregunta 6, que sigue abierta. `saveGame` (`store.ts`) se traga el error con `console.warn`. Queda como riesgo en CONCERNS. |
| Componente propio con foco itinerante (`Toggles`) en lugar de `Seg` | **Aceptado** | `Seg` trabaja con índices numéricos y no tiene foco itinerante. `Toggles` cumple con `role="group"`, `aria-label`, `aria-pressed`, ← → y una parada de Tab, y usa el mismo estado visual que `.seg button[aria-pressed=true]`, que ya cambió globalmente (`styles.css:446`). Sugerencia para más adelante: que `Seg` use `Toggles` por dentro, así todas las pantallas ganan el foco itinerante. |
| Punto de sin leer en "Todo el fútbol" para los mensajes del DT | **Aceptado** | Es coherente con la sección 6: solo las noticias del resto del fútbol no tienen estado de sin leer. Un mismo mensaje no cambia de aspecto según el alcance. Hay que actualizar `visual-design.md`. |
| "Más acciones" sin construir ("ninguna plantilla tiene más de 4 botones") | **Rechazado** | La premisa no es correcta: la regla de la sección 5.2 es "si hay más de 3", y la oferta tiene 4 (Aceptar, Pedir más, Ver la ficha, Rechazar). A 360 px, "Rechazar" queda fuera de la pantalla. Cambio en **H2**. |

## Hallazgos

### Bloqueantes

**H1. La fila de acciones queda recortada en todas las anchuras (choque de nombre de clase `.bar`).**

- Dónde: `Inbox.tsx:535` agrega la clase `bar` a `.ib-actwrap` cuando hay acciones o nota. `styles.css:75` ya tiene la utilidad global `.bar` de las barras de progreso (`height: 5px; overflow: hidden; min-width: 40px; border-radius: 3px; background: var(--panel3)`).
- Medido: `.ib-actwrap` mide 17 px de alto (5 más el relleno) en 1440, 800 y 360 px. Los botones quedan fuera de esa franja: a 1440, la franja va de 687 a 704 y "Aceptar" de 704 a 742. `elementFromPoint` en el centro de cada botón devuelve `.ib-read`, no el botón. Captura: `rev/mob-1440.png` (una franja gris en lugar de los botones) y `rev/shots/escritorio-confirmacion.png` (la confirmación cortada).
- Afecta a todo lo que está dentro: acciones, confirmación F6, ayuda de "Pedir más", motivo del libro de pases cerrado, consecuencias de aceptar un trabajo, nota F7 (`role="status"`), "Siguiente pendiente" y "Frená el avance para decidir". El foco de teclado cae en botones invisibles (2.4.7 y 2.4.11).
- Cambio: renombrar la clase, por ejemplo a `ib-bar`, en `Inbox.tsx:535` y en `styles.css:766`. Repetir la corrida automática con un control visual, porque Playwright hace clic en elementos recortados por `overflow`. Por ejemplo, para cada botón de `.ib-acts`, comprobar que `document.elementFromPoint` en su centro devuelve el mismo botón y que su caja cae dentro del viewport. También hay que volver a sacar las capturas de `shots/`, que son anteriores a esta edición.

**H2. La barra fija del detalle (≤ 900 px) no cumple la sección 5.2.** Medido con H1 neutralizado (`rev/fixsim.cjs`, `rev/fixsim-360.png`):

- (a) A ≤ 760 px queda detrás de la navegación inferior: va de 656 a 740 y la navegación empieza en 683. La regla `.ib-detail .ib-actwrap { bottom: calc(62px + env(safe-area-inset-bottom)) }` (`styles.css:775`, especificidad 0,2,0) pierde contra `.ib-detail .ib-actwrap.bar { bottom: 0 }` (`styles.css:766`, 0,3,0). Cambio: usar en la regla de 760 px el mismo selector que la de 900 px (`.ib-detail .ib-actwrap.ib-bar`).
- (b) El primario no ocupa una fila propia. `grid-column: 1 / -1` (`styles.css:769`) no abarca nada en una grilla sin columnas explícitas (`grid-auto-flow: column`): los 4 botones quedan en una sola fila y a 360 px "Rechazar" queda en x 321–414. Cambio: columnas explícitas (`grid-template-columns: repeat(3, 1fr)`, con el primario y la confirmación en `1 / -1`), o `flex-wrap` con el primario en `flex-basis: 100%`.
- (c) "Más acciones" (desvío rechazado). La salida mínima que acepto: en ≤ 900 px, sacar "Ver la ficha" de la barra (la tarjeta del jugador, justo arriba, ya abre la ficha). Así la oferta queda con el primario en su fila y Pedir más y Rechazar en la segunda. Si se prefiere conservarlo, va como enlace dentro del contenido, no en la barra.

### Menores

**M1. Volver de una ficha no conserva la selección más allá de 150 ni el scroll de la lista** (criterio 16).

- (a) `shown` es `useState(150)` (`Inbox.tsx:103`) y vuelve a 150 al remontar la pantalla. Si `sel` está más abajo, `has(routeSel)` falla y la selección cae en la primera decisión. Medido: elegido `n101624` (fila 200) → al volver, `offer101744`. Cambio: guardar `shown` con `useSticky('ib.shown')` o, al montar, usar `Math.max(150, índice de sel + 1)`.
- (b) `.ib-list` tiene scroll propio (`styles.css:646`) y `App.tsx` solo recuerda el de `main`. Medido: 1500 → 942, porque el `scrollIntoView({ block: 'nearest' })` del foco deja la fila en el borde. Cambio: guardar el `scrollTop` de la lista en `useSticky('ib.scroll.<tab>')` al salir y restaurarlo antes de pedir el foco (el `focus({ preventScroll: true })` ya está).

**M2. Enter sobre el mensaje elegido al entrar no lo marca leído.** La regla de leído de la sección 6 cuenta Enter como apertura a propósito. En `Inbox.tsx:212`, cuando `cur === active`, solo se mueve el foco. Medido: la fila `n101427` sigue con `unread` y el panel con "Sin leer" después del Enter. Cambio: en esa rama, si es un mensaje propio sin leer, `markRead(g, [id], true)` y `save()`.

**M3. "Mostrar más" al cargar lo último: el foco cae en `body`.** La sección 7.1 pide que pase a la última fila. Medido: después de "Mostrar 20 más", `document.activeElement` es `BODY`. Cambio: en el `onClick` de `.ib-more`, si `view.length <= shown + 150`, pedir `focusReq.current = { to: 'row', key: <última clave> }`.

**M4. Textos.**

- (a) Concordancia en `Inbox.tsx:432-433`: "se cancelan 1 oferta por tus jugadores, 1 oferta de otros clubes". Debería decir "se cancela 1 oferta…" o, mejor, "se cancelan la oferta por tu jugador y la de otro club" según los números.
- (b) Trabajo a mitad de temporada: "Respondé antes del 16 ene 2026." Pero el 16 todavía se puede responder: `dropJob` corre cuando `until < date` (`career.ts:141`). La fila dice "Vence en 6 días · el 16 ene" y el cuerpo del motor "Respondé hasta el 16". Usar "Respondé hasta el {until}." y corregir el mismo texto en la sección 5.3 de la especificación.
- (c) Rival: el KPI "Estilo" une con ", " frases que ya terminan en punto ("Es un equipo equilibrado., No presiona…"). Usar " " como separador o una lista. La plantilla tampoco muestra la fecha del partido que pide la sección 5.3 ("Club rival y fecha del partido"); se puede sumar como `s` del KPI o en la línea extra.
- (d) Trabajo de fin de temporada: la fila dice "{club} te quiere como DT" y el mensaje del motor "{club} te ofrece dirigir". Unificar en `pendDesc` según `kind`.

**M5. Durante el avance también se deshabilita "Ver la ficha".** `Actions` deshabilita todos los botones cuando alguno tiene `confirm` (`Inbox.tsx:345`). La sección 7.3 dice que solo se deshabilitan los de decisión y que la lectura sigue. Cambio: deshabilitar solo las acciones con `confirm` o las que llaman a `run`.

### Notas (sin cambio pedido)

- `Object.assign(g.clubs[g.userClubId].tactic, pp)` en `Inbox.tsx:543` es la excepción que la sección 9 dejó fuera de alcance. Cuando se resuelva para `ReportModal` en Semana, hay que resolverlo también acá.
- Plazos de oferta: el motor usa ahora 9 días (`offerDeadline`) y la fila, el panel y el cuerpo del mensaje dicen lo mismo ("Vence mañana", "Vence hoy" y vence al día siguiente). Es coherente. La sección 8 de la especificación todavía dice "+ 8 días": actualizarla.
- El mosaico del Inicio y "Abrir bandeja" (`go('inbox')`) respetan la sección 4. `App.tsx:162` pasa `sel` con la decisión nueva que frenó el avance, como pide la tabla de entrada.

## BLOCKED / CONCERNS

- BLOCKED: nada impidió la revisión. Solo quedó sin correr la emulación de deuteranopía (criterio 33, que por inspección del código cumple).
- CONCERNS: la corrida automática da 40 OK sobre una interfaz que no muestra sus botones. Hay que sumarle el control de `elementFromPoint` antes de usarla como evidencia de cierre.
- CONCERNS: "Error al guardar" sigue sin camino (`saveGame` se traga el error). Si IndexedDB falla, una venta o un cambio de club se pierden en silencio al recargar. La pregunta 6 tiene que tener dueño y fecha.
