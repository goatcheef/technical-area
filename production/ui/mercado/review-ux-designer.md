# Revisión UX del Mercado (fase 4 de /team-ui)

> **Revisor**: ux-designer · **Fecha**: 2026-11-15 · **Rama**: `mercado-ui` (commit `184c7f4`)
> **Contrato**: `design/ux/mercado.md` (secciones 4 a 7 y 14) y `design/ux/bandeja.md` (sección 15, pregunta 22).
> **Método**: lectura del código de la pantalla y del motor de tratos; pase solo con teclado y flujos completos con días reales en Playwright (scripts en el scratchpad de la sesión, `uxmk/k1.cjs`, `f1.cjs` a `f8.cjs`, `perf.cjs`); axe-core; texto al 120 %; celular 390 × 844. Se volvió a correr la prueba del implementador (`tests/ui/mercado.cjs` en 1440, 820 y 390: 143 comprobaciones, 0 fallas) y las del motor (`tests/engine/deals.ts`, `negotiation.ts`, `wage-shown.ts`: 612 comprobaciones, 0 fallas). Lo que sigue son fallas que esas pruebas no ven.

## Veredicto: NECESITA CAMBIOS

Los dos flujos centrales funcionan de punta a punta con días reales: buscar, comparar, ofertar, esperar, aceptar la contraoferta, negociar y firmar (todo con teclado), y responder una oferta por un jugador propio. Las insignias cuentan bien en los casos que medí (acuerdo +1/+1, aceptar la contraoferta N, firmar o vender N − 1, rechazo solo como sin leer), el libro cierra y caduca lo abierto como dice la spec, y axe no informa infracciones. Hay **dos bloqueantes**, los dos chicos de arreglar. Los dos están en el camino principal: el foco se escapa de la ventana de negociación justo después del paso irreversible, y hay un botón visible que no hace nada. Además hay una lista de cambios menores, varios de ellos criterios de la sección 14 que no se cumplen.

---

## Criterios de la sección 14

Leyenda: **cumple** / **no cumple** / **no verificado**. "Prueba del motor" = `tests/engine/*.ts`, que corrí y pasan; no audité su contenido línea por línea.

### Rendimiento

| Criterio | Estado | Evidencia |
|---|---|---|
| 400 filas: primer cuadro < 100 ms | **no cumple** (en dev) | Clic en Mercado hasta dos `requestAnimationFrame`: 110 a 322 ms (5 mediciones, servidor de desarrollo). Dibuja 100 filas de 400. Hay que volver a medir en un build de producción antes de darlo por cumplido |
| ↓ y Enter < 50 ms sostenido | **no cumple** (en dev) | ↓: mediana 24 ms, p95 105 ms. Enter (elige): mediana 25 ms, máximo 116 ms |
| Monto: impacto < 50 ms por tecla | cumple | Mediana 12 ms, máximo 17 ms |

### Propósito de la pantalla

| Criterio | Estado | Evidencia |
|---|---|---|
| Libro en la franja, en las cinco pestañas, con sus textos | cumple | "cierra en 7 días (el 20 feb)" con "!" y "Atención:", "cierra mañana", "cierra hoy", "reabre el 25 jun · faltan 124 días" (f2, días reales). No verifiqué el texto desde el 11 de agosto. Con 390 px, al entrar a Tratos el foco automático desplaza la página y la franja queda fuera de la vista (captura `f4-tratos-390.png`) |
| Libro cerrado: botones deshabilitados con el motivo debajo de cada grupo | **no cumple** | El motivo de "Pedir préstamo" no se escribe cuando es igual al de "Ofertar compra" (`deal.tsx:301`). Con el libro cerrado y con 5 ofertas abiertas, el grupo del préstamo queda sin motivo |
| Franja: presupuesto, caja y sueldos/tope con margen; "−" en la caja | cumple | `Market.tsx:94-98`. No verifiqué la caja negativa en vivo |
| Ofertar con ↓ Enter Enter; firmar con Enter, rondas y "Confirmar: fichar…" | cumple | f1: 5 ofertas con Enter, Enter; la contraoferta con Enter; "Negociar contrato" con Enter; "Confirmar: fichar a Lucas Zelarayán…" con Enter. El trato quedó `agreed` hasta confirmar |
| Elegir una fila no hace nada irreversible y no elige la primera al entrar | cumple | k1 y la prueba del implementador |
| Impacto antes de ofertar y "no entra" en palabras | cumple | k1: con US$ 999.999.999, "no entra", "Ofertar compra" deshabilitado y "Te quedan libres US$ 3,02 M para pases." |
| Ajeno como lo devuelve el ojeo (35 / 94 / 96 %) | no verificado | En la tabla, el panel, el comparador y las tarjetas vi rangos al 35-60 %. El potencial del panel no usa el mismo texto que la ficha (ver menor 11) |
| Sueldo como rango por debajo de 95 % (prueba sobre 50 ajenos) | cumple | Prueba del motor `wage-shown.ts`, 109 comprobaciones |
| Un número, una fuente | no verificado | El panel y el `BidBox` coinciden (son el mismo componente). No crucé los cinco lugares |
| Lo único exacto de un ajeno | no verificado | En lo que vi: valor, pedido y cláusula exactos; el sueldo del préstamo, en rango |
| La mesa no despeja la personalidad | cumple | Prueba del motor `negotiation.ts`, 327 comprobaciones |
| Revisión de código: ningún texto de un ajeno sale de `p.ca` / `p.pa` sin el ojeo | **no cumple** | `deal.tsx:365`: el potencial del panel ("Mucho margen", "Buen margen", "Poco margen") sale de `p.pa - p.ca`. Va detrás de `k >= 70`, igual que la ficha, pero el criterio lo prohíbe en `BidBox` y en el panel, y el texto no coincide con el de la ficha |
| Ordenar y filtrar con `knownRating` | cumple | `Market.tsx:118` |
| "Mandar a ojear" dice los días y avisa si cierra antes | cumple | "Lo conocerías del todo en unos 6 días." (`deal.tsx:355-356`) |
| `BidBox`: "responde entre", aviso de caducidad, último día deshabilitado | cumple | f2, 20 feb: "Hoy cierra el libro: una oferta nueva ya no llegaría a tener respuesta."; el "Ofertar" de Mejorar deshabilitado; "Aceptar US$ 470 mil" y "Retirar la oferta" habilitados |
| El campo arranca en el pedido | cumple | 4.660.000 = `askingPrice` |
| Sueldo sobre el margen: aviso y el botón sigue habilitado | cumple | "Si pide lo que estimás (US$ 25–36 mil), puede que no entre en tu tope…"; ofertó (f4) |
| El club no dice sueldos | cumple | Prueba del motor, "El club no mira el tope ni el presupuesto" |
| Ofertar crea "Esperando respuesta", sin insignias ni freno; sin día exacto | cumple | f1: insignias sin cambio tras 5 ofertas |
| Respuesta en 1 a 3 días, como mensaje; determinista | cumple | f1 (al día siguiente) y f2 (tres días después); determinismo según la prueba del motor |
| Retirar la oferta, sin confirmación | cumple | Prueba del implementador y prueba del motor |
| Con una oferta abierta, el `BidBox` muestra el trato | cumple | f4, ficha en el celular |
| Con 5 ofertas, deshabilitado y "Ofertas abiertas: N de 5" | cumple (con el menor 6) | f1: "Ya tenés 5 ofertas abiertas…", "Ofertas abiertas: 5 de 5." |
| KPI de presupuesto: libre, comprometido y en cuántas | cumple | "de US$ 40 M · US$ 2,11 M comprometidos en 4 ofertas" |
| Un acuerdo suma 1 y 1, frena y abre la bandeja; resolver en un lugar lo saca de los otros | cumple | f1: Mercado 0 → 4, Bandeja 1 → 6 (4 decisiones y un rechazo sin leer); la prueba del implementador cubre el freno |
| Resolver en Tratos no sube la Bandeja (N − 1 / N) | cumple en lo medido | Firmar 6 → 5; aceptar la contraoferta 6 → 6; vender 2 → 1; pedir más 2 → 2. Sin medir: cancelar, retirar, mejorar, rechazar |
| Dos ofertas por el mismo jugador | no verificado | — |
| Trato con varios mensajes suma 1 | no verificado | — |
| Ofertar de nuevo tras un rechazo: otro id | no verificado | — |
| Elegir un trato no marca leído | cumple (código) | `pick` solo llama a `nav` (`Market.tsx:176`) |
| Contraoferta: acciones, pasa a Para cerrar, vence al historial | cumple | f1 y f2 ("Caducó: se cerró el libro") |
| Rechazo: motivo, solo sin leer, no frena, "Sin acuerdo" | cumple | f2: "Sin acuerdo con el club: Rodrigo Battaglia no ve con buenos ojos…" |
| Vencen a los 7 días o el último día del libro; frena el último día | cumple | f2: "Ir al partido" el 20 feb abrió la bandeja con `deal16` |
| Préstamo con "Confirmar el préstamo" (F6 con rango) | cumple | Código y capturas del implementador |
| Cancelar el trato: F6 con el costo, bloqueo y club molesto | cumple | Prueba del motor; F6 en `deal.tsx:168` |
| Acuerdo en Para cerrar tras Esc; "Seguir negociando" lo retoma igual | cumple | f1: después de Esc, el primario dice "Seguir negociando" y tiene el foco |
| No se ficha hasta confirmar; cambiar un campo cancela el acuerdo | cumple | f1; `Locker.tsx` `set()` limpia `agreed` |
| Sin paciencia antes de sentarse | cumple | `deal.tsx:194-197` |
| Ventana: paciencia en palabra, plazo, bloqueo, impacto; "no gasta paciencia" | cumple | f1 y f3 |
| Tras una ruptura, bloqueo escrito | cumple | Prueba del motor; `deal.tsx:304` |
| Tratos podados | cumple | Prueba del motor (poda); no miré la plantilla de la bandeja |
| Otro club lo compra mientras espera | cumple | Prueba del motor |
| Préstamo con su propio cargo (8 %) | cumple | 265.000 sobre un valor de 3,33 M |
| Tratos agrupados en orden | cumple | Prueba del implementador y k1 |
| Para responder y Para cerrar ordenados por plazo | cumple (código) | `dealsOf`, `career.ts:807` |
| Una oferta por un jugador propio suma 1 y 1; responderla la saca de la bandeja | cumple | f2: Mercado 1, Bandeja 2; vender la llevó a 0 / 1 y el mensaje quedó leído |
| Aceptar y rechazar en dos pasos; la F6 nombra la otra oferta y "exterior" | cumple | f2 y `Market.tsx:279` |
| "Pedir más": monto nuevo, misma clave | cumple | f2: "Huracán mejoró su oferta: ahora US$ 1,3 M", `offer101427` sin cambio |
| Vencida, vendida, rechazada o retirada en el Historial | cumple en parte | f2: el historial muestra "Venció…". Sin verificar: una oferta que vence mientras está elegida |
| El libro cierra: todo lo abierto caduca con un mensaje cada uno | cumple | f2, 21 feb: dos mensajes, ningún trato abierto |
| Avisos a los 7 días y el último día, sin freno ni insignia | cumple | f2 y prueba del motor |
| El último día frena solo si vence algo | cumple | f2 |
| Para renovar, con `negBlock` | cumple | k1 y código |
| La ruptura de una renovación usa `renewWalk` | cumple | Código y prueba del motor |
| Valor, pedido y cláusula exactos | cumple | Panel |
| Cambio de club: la F6 nombra los tratos; historial, mensajes leídos, comprometido en 0 | **no cumple** (solo la F6) | f3: la F6 dice "Confirmar: dejar Independiente y dirigir Vélez Sarsfield", sin los tratos; los nombra la línea de consecuencias. Lo demás cumple: 4 tratos "Se cayó: dejaste Independiente", mensajes leídos, comprometido 0 y nada respondido al día siguiente |
| "Ver tus transferibles…" abre Plantel con ese filtro | **no cumple** | `Squad.tsx` ignora `route.tab`: abre el plantel sin filtro (y si `sq.club` guardó otro club, el de otro club) |
| Presupuesto: balance, filas y resultado | cumple | Con el desvío (f), aceptado |

### Navegación

| Criterio | Estado | Evidencia |
|---|---|---|
| Tres pestañas y Atrás sale del Mercado | cumple | Prueba del implementador; f5 (tres tarjetas y Atrás → Inicio) |
| Ficha y volver: pestaña, filtros, orden, selección y scroll | cumple | f8: scroll 500 → 500, `sel` igual. El foco cae en BODY (ver el menor 14) |
| La insignia abre Tratos con la decisión; "Ver todos los tratos" abre Tratos con la selección | cumple con mouse | f1 y f2. Con teclado, la insignia no se alcanza (desvío b) |
| `tab` viejos | cumple | Prueba del implementador |
| < 1180 px: la fila abre la ficha y su BidBox | cumple | f4. Abre la ficha en "Resumen": hace falta otro toque para llegar a la oferta (menor 15) |
| Clic o Tab en una tarjeta la elige y reemplaza la entrada; el foco no se mueve solo | cumple | f5; `cardProps` en `Market.tsx:204-207` |
| "Ver todos los tratos" de un trato fuera de los 20 | cumple en parte | f6: carga la fila y la elige (`aria-current`), pero queda en el borde de abajo (top 840 de 900) y el foco cae en BODY |
| Clic en Mercado apila | cumple | k1 |

### Estados vacíos y errores

| Criterio | Estado | Evidencia |
|---|---|---|
| Textos de la sección 6 | no verificado | Los que vi coinciden |
| Un jugador que ya no existe: "Ya no está disponible." sin acciones | **no cumple** | f6: la tarjeta dice "Ya no está disponible." y sigue mostrando "Retirar la oferta" (`Market.tsx:318` y `DealBlock`) |
| 45 jugadores / jugador a préstamo | cumple (código) | `bidCheck` |
| `save()` falla | no verificado | — |

### Teclado e interacción

| Criterio | Estado | Evidencia |
|---|---|---|
| Menú abierto: ↑ ↓ no mueven la tabla | no verificado | El código respeta `defaultPrevented` |
| Espacio activa y no avanza | cumple | k1: ← y Espacio en las pestañas, el día no cambia |
| Tabla: una parada, ↑ ↓, Enter al campo Oferta, Espacio marca, Esc vuelve; las dos ayudas lo dicen | **no cumple** (solo la ayuda de atajos) | Lo demás cumple (k1: una sola fila con `tabindex=0`, Inicio, Fin, Av Pág, Mayús + ↓, Esc). La ayuda de atajos (`SHORTCUTS`, `Nav.tsx:188`) no dice que en el Mercado Espacio marca la casilla |
| Esc con una F6 la cancela y devuelve el foco; Esc en la negociación devuelve el foco | cumple | f2: el foco vuelve a "Aceptar"; f1: el foco vuelve a "Seguir negociando" |
| Ningún atajo de una tecla nuevo | cumple | Revisión de código |
| La pantalla no escribe en `g` | cumple | Revisión de código |

### Visibilidad de las acciones

| Criterio | Estado | Evidencia |
|---|---|---|
| `elementFromPoint` en cada botón, en todas las resoluciones | cumple | Prueba del implementador, vuelta a correr en 1440, 820 y 390 |
| Foco visible bajando con Tab | cumple | Prueba del implementador |
| Sin `fixed`, sin recorte, sin `.bar` | cumple | Prueba del implementador |
| Bandeja ≤ 900 px y "la barra no se mueve" | no verificado por mí | Corresponde a `tests/ui/bandeja.cjs` |
| Negociación a 320 × 568 | no verificado por mí | Lo cubre la prueba del implementador |
| Sin desplazamiento horizontal | cumple | 390 px (f4 y f5); 320 y 640 px según la prueba del implementador |

### Accesibilidad

| Criterio | Estado | Evidencia |
|---|---|---|
| Nada por debajo de 12 px | **no cumple** | f5: en Tratos, el escudo de reemplazo de un club sin escudo ("ALD", Aldosivi) mide 9,6 px al 120 %, es decir 8 px al 100 %. La prueba del implementador mide solo Presupuesto |
| Texto al 120 % | **no cumple** | f5, captura `f5-buscar-1440-120.png`: la valoración del panel se parte en dos líneas ("82–" / "92": rango cortado) y "Conocés el 45 %" deja el "%" solo. En Tratos las tarjetas siguen en dos columnas (455 px + 455 px). Los encabezados de la tabla quedan cortados ("Cono…", "Pedido U…"). El panel sí tiene scroll propio (`overflow-y: auto`) |
| Contraste en los 86 clubes | no verificado por mí | Lo midió el art-director |
| Activo con borde, ✓ y `aria-pressed` | cumple | Capturas y DOM |
| Daltonismo | no verificado | Los estados llevan palabras |
| axe sin infracciones A/AA | cumple | f5: 0 infracciones en Buscar con un jugador elegido, en Tratos con ofertas y en la negociación |
| `aria-pressed`, `role="status"`, `aria-labelledby`, nombre del panel | cumple | DOM |
| Movimiento reducido | no verificado | — |
| 44 × 44 en celular | **no cumple** | f4, 390 px: vistas y líneas de la tabla de 25 px de alto, "Columnas" de 32, casillas de 13 × 13, rangos de los filtros de 16, "Retirar la oferta" de 40, nombres en las tarjetas de 18, "Ver tus transferibles…" de 15 |
| El cambio del libro se anuncia una vez | cumple (código) | `Market.tsx:76-99` |

---

## Hallazgos

### Bloqueantes

**B1. El foco se escapa de la ventana de negociación después de firmar** (y después de que el representante se levanta). `src/ui/Locker.tsx:129-139` (`confirm`) y `:115-127` (`send`). Cuando se confirma el fichaje, `over` reemplaza el bloque del acuerdo y el botón que tenía el foco desaparece: el foco cae en `BODY` (f1 y f3). Un Tab desde ahí lleva a "Saltar al contenido", detrás de la ventana, que sigue abierta con `aria-modal`. La trampa de `Modal` (`common.tsx:178-182`) solo actúa cuando el foco está en el primero o el último elemento. Es el paso irreversible del flujo principal y rompe AM-07, que la spec exige.
*Cambio:* después de `setOver(...)`, en los dos caminos (firma y ruptura), llevar el foco al resultado (`.ib-result`, con `tabIndex={-1}`) o a "Listo". Además, en `Modal`, si el foco está fuera de la caja al apretar Tab, devolverlo al primer elemento.

**B2. "Comparar" del panel no hace nada.** `src/ui/deal.tsx:371` llama a `onCompare`, y `Market.tsx:158` hace `setCmp([p.id])`, pero `Market.tsx:160` solo abre `Compare` con dos jugadores o más. Es un botón visible, que entra en el orden de Tab de la sección 12, y no responde (k1).
*Cambio:* que abra el comparador con el jugador del panel más las casillas marcadas. Sin casillas, deshabilitado con el motivo escrito ("Marcá 1 o 2 jugadores en la tabla para comparar"). La alternativa es sacarlo del panel.

### Menores (en orden de importancia)

1. **Cambiar a Tratos con teclado roba el foco.** `Market.tsx:182-183`: al montarse, Tratos mueve el foco al primario de la tarjeta elegida. Si se llega desde otra pestaña con Enter, el foco salta a "Aceptar" (f6). La sección 5.3 dice que "tras un cambio de pestaña con teclado el foco **se queda en la pestaña**". *Cambio:* mover el foco al entrar solo cuando la ruta llega de otra pantalla (insignia, "Ver todos los tratos", Atrás con `sel`), no en un cambio de pestaña.
2. **Desvío (b), la insignia con clic propio: se acepta con un cambio.** `App.tsx:200-201`: el `span` con `onClick` dentro del botón solo funciona con mouse. Con teclado o lector de pantalla, Enter en "Mercado" abre la pestaña recordada (f1, f6). Además es un objetivo táctil de unos 22 px metido dentro de otro botón. *Cambio:* unificar. Con decisiones del mercado, entrar al Mercado desde la barra (con clic, Enter o toque) abre Tratos con la primera decisión, y la pestaña recordada vale cuando no hay decisiones. Sacar el `onClick` del `span`. Anotar la regla en la sección 4 de la spec.
3. **Desvío (a), el "✓ Resuelto" que queda: no se acepta tal como está.** `Market.tsx:175-176, 209-214`: el fantasma no se va nunca hasta la próxima acción o "Siguiente para responder" (f2: sigue después de elegir otra tarjeta). El motivo es real: si se borra en el `focus` del `mousedown`, la lista se mueve antes del `click`. *Cambio:* borrar el `flash` en el `onClick` de la otra tarjeta (el clic ya cayó, así que el movimiento posterior no le hace daño) y en el `focus` que no viene de un `mousedown` (con Tab). Otra opción: dejar la caja del fantasma con su alto y vaciarla.
4. **La F6 del cambio de club no nombra los tratos** (`Inbox.tsx:528`). La pregunta 22, punto (8), de la bandeja pide que la F6 los nombre, y por eso los mensajes nacen leídos. *Cambio:* sumar al rótulo "; se caen tus N tratos de mercado".
5. **"Ver tus transferibles y quienes quieren irse" no filtra** (`Market.tsx:218` → `Squad.tsx` no lee `route.tab`). *Cambio:* que Plantel acepte `tab: 'transferibles'` y abra la tabla propia con ese filtro, o cambiar el texto del enlace.
6. **Falta el motivo debajo de "Pedir préstamo"** cuando es el mismo que el de la compra (`deal.tsx:301`): libro cerrado, último día, 5 ofertas. *Cambio:* escribirlo también en el grupo del préstamo, o una sola vez arriba de los dos grupos, pero que se lea junto a los dos botones.
7. **Tamaños táctiles por debajo de 44 px en el celular** (ver la tabla). Las vistas y las líneas de `PlayerTable` y las casillas son compartidas, pero el criterio es del Mercado. *Cambio:* 44 px de alto con `pointer: coarse` en `.ptable-bar .seg button`, la celda de la casilla, "Retirar la oferta" y los nombres o enlaces de las tarjetas (o un área de toque con padding).
8. **Texto al 120 %**: la valoración del panel se corta, las tarjetas de Tratos no pasan a una columna y el escudo de reemplazo mide 9,6 px. *Cambio:* `white-space: nowrap` en la píldora de valoración y en "Conocés el N %"; con `.text-big`, `.mk-card-b` en una columna; tamaño mínimo de 12 px en el texto del escudo de reemplazo. Sumar a la prueba la medición de 12 px en las cinco pestañas (hoy mide solo Presupuesto) y el 120 %.
9. **Desvío del implementador sobre el comparador: no se acepta como omisión permanente.** La sección 4 pide "Ofertar" y "Seguir" en cada columna. Hoy los únicos botones del comparador son los nombres (k1), así que hay que cerrar y volver a elegir. *Cambio:* "Seguir" y "Ofertar" (este último elige al jugador en el panel, o abre su ficha por debajo de 1180 px) en cada columna. "Cabe en tu presupuesto" y el veredicto del tope pueden quedar para después si la spec lo anota.
10. **Un trato cuyo jugador ya no existe muestra acciones** (`Market.tsx:318`, `DealBlock` en `:325`). *Cambio:* con `!p`, no mostrar `DealBlock` (o mostrarlo sin `ActRow`).
11. **El potencial del panel no coincide con la ficha** (`deal.tsx:365`, "Mucho margen" contra `PlayerPage.tsx:38`, "Muy buen potencial"), y lee `p.pa - p.ca` en un archivo que la revisión de código pide limpio. *Cambio:* una función del ojeo (por ejemplo `potentialText(g, p)` en `squad.ts`) que usen los dos lugares.
12. **El sueldo propio con dos formatos.** La bandeja muestra "Sueldo US$ 5 mil" (`Inbox.tsx:465`, `money(p.wage)`) y Tratos "Sueldo que liberás US$ 4,7 mil" (`wm`) para el mismo jugador (f2). *Cambio:* `wm(p.wage)` en la bandeja.
13. **Signo negativo distinto en el impacto.** `ImpactBox` muestra "US$ -1,64 M" con guion ASCII y el signo después de la moneda (`deal.tsx:114-115`), mientras la franja usa "−US$". *Cambio:* el mismo formato con "−" en los dos lugares.
14. **El foco al llegar no sigue la regla de la sección 5.3.** Se acepta que Buscar, Movimientos y Presupuesto dejen el foco en la barra al abrirlos (hay enlace para saltar al contenido). Hay que cambiar dos cosas: (i) "Ver todos los tratos" a una fila del historial deja el foco en BODY (`Market.tsx:189`: la fila no es enfocable) y la fila en el borde de abajo; hay que darle `tabIndex={-1}` y `scrollIntoView({ block: 'center' })`. (ii) Volver de la ficha a Buscar con `sel` deja el foco en BODY: tiene que ir a la fila elegida.
15. **En el celular, la fila abre la ficha en "Resumen"** (`Market.tsx:151` → `PlayerTable.tsx:239`, `openPlayer(p.id)`). Ofertar pide un toque más. *Cambio:* desde el Mercado, abrir la ficha con `tab: 'contrato'`.
16. **La negociación empieza en "Cancelar".** `Modal` enfoca el primer botón, que es el "Cancelar" de la cabecera (`Locker.tsx:148`), y "Cancelar" aparece dos veces en el orden de Tab (f1). La sección 12 pide el foco en "Sueldo mensual". *Cambio:* `autoFocus` (o un `data-autofocus` que `Modal` respete) en `#neg-wage`; la cabecera puede tener solo el ✕ con `aria-label`.
17. **Después de ofertar, Tab sale del panel.** La nota con el foco queda después de "Retirar la oferta" en el DOM (`deal.tsx:283-288`), así que el siguiente Tab va a "Saltar al contenido" (f1). La sección 7.2 dice "el foco va a la nota y después a 'Retirar la oferta'". *Cambio:* poner la nota antes de `DealBlock`, o enfocar "Retirar la oferta" y dejar que el `role="status"` anuncie la nota.
18. **Enter en el campo Oferta con un monto bloqueado no dice nada** (`deal.tsx:295`). El motivo está escrito debajo del botón y asociado con `aria-describedby`, pero apretar Enter no da respuesta. *Cambio:* mostrar el motivo como nota F7 (`role="status"`) cuando se aprieta Enter bloqueado.
19. **La ayuda de atajos no menciona Espacio en el Mercado** (`Nav.tsx:188`). *Cambio:* sumar "En la tabla del Mercado: Espacio marca la casilla (no avanza el día)".
20. **Rendimiento.** Volver a medir los tres criterios en un build de producción. Si el primer cuadro sigue pasando de 100 ms, renderizar menos filas al entrar.

### Desvíos declarados: dictamen

| Desvío | Dictamen |
|---|---|
| (a) El "✓ Resuelto" no se va al elegir otra tarjeta | **Cambio requerido** (menor 3): borrar en `click`, no en `mousedown` |
| (b) Clic propio en la insignia del Mercado | **Aceptado con cambio** (menor 2): misma conducta con teclado y toque |
| (c) `nav` saca al Mercado de la regla de apilar en ≤ 900 px | **Aceptado**: la spec dice que elegir en el Mercado reemplaza en cualquier ancho, y la fila angosta abre la ficha (otra página, que apila) |
| (d) "Ver todos los tratos" en el contenido de la bandeja | **Aceptado**: es lo que pide la pregunta 22, punto (7), de la bandeja ("los enlaces en el contenido") |
| (e) La renovación también pide "Confirmar: renovar…" | **Aceptado**: compromete sueldo y prima, y es coherente con la compra. Anotarlo en la sección 7.2 |
| (f) "cuerpo técnico" en la fila del balance | **Aceptado**: `ledger.wages` incluye los sueldos del cuerpo técnico (`week.ts:370`). Corregir el texto del criterio en la sección 14 |
| Agregados del comparador sin hacer | **Cambio requerido** para "Ofertar" y "Seguir" (menor 9); lo demás puede esperar si la spec lo anota |
| "Comparar" del panel no abre nada | **Bloqueante** (B2) |
| axe, rendimiento y 120 % fuera de la prueba | axe da 0 (lo medí); el 120 % falla (menor 8); el rendimiento falla en dev (menor 20). Sumar las tres cosas a `tests/ui/mercado.cjs` |
| Foco al abrir solo en Tratos y con Enter desde la tabla | **Aceptado en parte**: ver el menor 14. Lo que se arrastra a Tratos (menor 1) es un error, no una omisión |
