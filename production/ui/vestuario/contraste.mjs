// Mide los pares de color del diseño visual del Vestuario (production/ui/vestuario/visual-design.md, sección 9.2).
// Adaptado de production/ui/mercado/contraste.mjs. El acento de cada club sale de tools/club-accent.mjs (la regla de clubTheme,
// con el segundo color o el índigo en los clubes amarillos y naranjas). Mínimos: 4,5 para texto, 3 para indicadores ([3]).
// Uso: node production/ui/vestuario/contraste.mjs [-v]   (sale con código 1 si algún par usado no llega a su mínimo)
import fs from 'node:fs'
import { accentOf as clubAccent, inked as inkedHex } from '../../../tools/club-accent.mjs'
const db = JSON.parse(fs.readFileSync(new URL('../../../src/data/db.json', import.meta.url), 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const L = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2])
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a)) // fg al a sobre bg (también color-mix(fg a%, bg))
const wmix = (c, t) => c.map(v => v * t + 255 * (1 - t)) // c al t, resto blanco
const hs = c => { const [r, g, b] = c.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; if (!d) return [0, 0]; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(x * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))] }
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
const H = rgb
const panel = H('#1b1e36'), panel2 = H('#23274a'), panel3 = H('#2b3056'), text = H('#f1f2fa'), dim = H('#a3a8c8'), faint = H('#8a90b4'), page = H('#0a0c1b')
const warn = H('#ffb547'), warnC = H('#f3d34a'), good = H('#3ddc97'), goodC = H('#4aa3ff'), bad = H('#ff5d6c'), badC = H('#f08c3a'), danger = H('#ff8a95')
const zebra = over(H('#ffffff'), .018, panel) // fila par de la tabla
const warnChip = (w, bg) => over(w, .13, bg) // .ib-tag.dec "Para decidir"
const selOf = a => { const hi = wmix(a, .70).map(Math.round), [h, sa] = hs(hi); return sa >= .35 && [hs(warn)[0], hs(warnC)[0]].some(w => gap(h, w) < 25) ? text : hi }

// [nombre, texto/indicador, fondo, mínimo, ¿se usa?]
const fixed = [
  // filas de "Para atender", tabla y LockerCard
  ['1 nombre, causa y cifras --text / panel', text, panel, 4.5],
  ['2 consecuencia, rótulos y talkState --dim / panel', dim, panel, 4.5],
  ['3 --dim / fila par de la tabla', dim, zebra, 4.5],
  ['4 --dim / hover de fila panel2', dim, panel2, 4.5],
  ['5 chip "Para decidir" --text / warn13%·panel2 (= .ib-tag.dec)', text, warnChip(warn, panel2), 4.5],
  ['5c ídem .cvd', text, warnChip(warnC, panel2), 4.5],
  ['6 chip de motivo neutro --text / panel2 (.mk-st)', text, panel2, 4.5],
  ['7 ícono ! de aviso en chip --warn / panel2 [3]', warn, panel2, 3],
  ['7c ídem .cvd', warnC, panel2, 3],
  ['8 ícono ! de aviso --warn / panel (encabezado, referente "Resta", reserva) [3]', warn, panel, 3],
  ['8c ídem .cvd', warnC, panel, 3],
  ['9 riel de decisión --warn / panel [3]', warn, panel, 3],
  ['9c ídem .cvd', warnC, panel, 3],
  ['10 íconos de motivo neutros (↓, −, ⇄, reloj) --dim / panel2 [3]', dim, panel2, 3],
  ['11 ✓ "Va bien" / "Minutos prometidos" --good / panel2 [3]', good, panel2, 3],
  ['11c ídem .cvd', goodC, panel2, 3],
  ['12 ✗ "Ya no llega" --danger / panel [3]', danger, panel, 3],
  // escalas (MoodBar, MoraleBar, armonía) y barra de minutos: relleno contra la pista --panel3
  ['13 relleno bajo la línea --bad / pista panel3 [3]', bad, panel3, 3],
  ['13c ídem .cvd', badC, panel3, 3],
  ['14 relleno medio --dim / pista panel3 [3]', dim, panel3, 3],
  ['15 relleno alto --text / pista panel3 [3]', text, panel3, 3],
  ['16 relleno de minutos que no pesan --dim / pista panel3 [3]', dim, panel3, 3],
  ['17 marca de umbral --text / panel (lo que sobresale de la pista) [3]', text, panel, 3],
  ['17b marca de umbral --text / pista panel3 [3]', text, panel3, 3],
  ['17c marca de umbral --text / relleno --dim (sin halo: no alcanza; lleva halo --panel de 1 px) [3]', text, dim, 3, false],
  ['17d halo --panel de la marca / relleno --dim [3]', panel, dim, 3],
  ['17e halo --panel de la marca / relleno --bad [3]', panel, bad, 3],
  ['17f ídem .cvd', panel, badC, 3],
  ['18 número de la escala --text / panel2 (caja de cifra, ventana)', text, panel2, 4.5],
  ['19 palabra de banda media/alta --dim / panel', dim, panel, 4.5],
  ['20 número del medidor de armonía --text / panel', text, panel, 4.5],
  ['21 arco de armonía --bad / pista panel3 [3]', bad, panel3, 3],
  ['21c ídem .cvd', badC, panel3, 3],
  // ventana de charla
  ['22 título y regla de opción --text / --dim sobre panel', dim, panel, 4.5],
  ['23 anillo del radio sin marcar --dim / panel [3]', dim, panel, 3],
  ['24 opción deshabilitada: motivo --dim / panel (sin opacidad)', dim, panel, 4.5],
  ['25 candado del motivo --dim / panel [3]', dim, panel, 3],
  ['26 caja "Cómo está" y comparación vt-letgo --text / panel2', text, panel2, 4.5],
  ['27 ídem --dim / panel2', dim, panel2, 4.5],
  ['28 cita de la respuesta --text / panel2', text, panel2, 4.5],
  ['29 chip "tiene costo" --dim / panel2', dim, panel2, 4.5],
  ['30 kbd --text / panel2', text, panel2, 4.5],
  ['31 descripción de grupo / línea del modo Reserva --dim / fondo de página #0a0c1b', dim, page, 4.5],
  ['32 --faint / panel3 (prohibido)', faint, panel3, 4.5, false],
]
const v = process.argv.includes('-v')
let fails = 0
console.log('— Pares fijos (no dependen del club)')
for (const [k, f, b, need, used = true] of fixed) { const x = cr(f, b), no = x < need; if (no && used) fails++; console.log(`${k}: ${x.toFixed(2)} ${no ? (used ? 'FALLA' : 'no llega (no se usa así)') : 'ok'}`) }

// pares que dependen del acento del club
const A = clubs.map(c => { const ac = clubAccent(c.colors); return { name: c.short, a: rgb(inkedHex(ac.a)[0]), band: rgb(inkedHex(ac.band)[0]) } })
const chosen = a => over(a, .14, panel) // --accent-soft compuesto sobre --panel (fila elegida, opción marcada, reserva anotada)
const bandBg = b => over(b, .34, panel) // banda de la ficha, extremo izquierdo (el más cargado)
const bandTabs = b => over(page, .28, over(b, .14, H('#1d2140'))) // fila de pestañas de la banda (donde va "Hablar" / talkState)
const per = [
  ['41 --text / fila elegida, opción marcada, "✓ Anotado"', 4.5, c => cr(text, chosen(c.a))],
  ['42 --dim / fila elegida (consecuencia, rasgo "Normal", talkState)', 4.5, c => cr(dim, chosen(c.a))],
  ['43 ícono ! --warn / fila elegida [3]', 3, c => cr(warn, chosen(c.a))],
  ['43c ídem .cvd', 3, c => cr(warnC, chosen(c.a))],
  ['44 riel 6 px, contorno y foco --sel / fila elegida [3]', 3, c => cr(selOf(c.a), chosen(c.a))],
  ['45 foco --sel / panel [3]', 3, c => cr(selOf(c.a), panel)],
  ['46 foco --sel / panel2 [3]', 3, c => cr(selOf(c.a), panel2)],
  ['47 radio marcado (anillo y punto --sel) / opción marcada [3]', 3, c => cr(selOf(c.a), chosen(c.a))],
  ['48 borde de la opción marcada y del alternable --accent-hi / panel [3]', 3, c => cr(wmix(c.a, .70), panel)],
  ['49 título de sección de la tarjeta (acento 62 % + blanco) / panel', 4.5, c => cr(wmix(c.a, .62), panel)],
  ['50 talkState de la banda --text / fila de pestañas de la banda', 4.5, c => cr(text, bandTabs(c.band))],
  ['51 --text / banda (extremo izquierdo, 34 %)', 4.5, c => cr(text, bandBg(c.band))],
  ['52 --dim / banda (34 %): no se usa para texto chico en la banda', 4.5, c => cr(dim, bandBg(c.band)), false],
  ['53 ícono reloj de talkState --text / fila de pestañas [3]', 3, c => cr(text, bandTabs(c.band))],
]
console.log('\n— Pares por club (86 clubes con economía)')
for (const [k, need, fn, used = true] of per) {
  const xs = A.map(fn), n = xs.filter(x => x < need).length
  if (used) fails += n
  const minI = xs.indexOf(Math.min(...xs))
  console.log(`${k}: mín ${Math.min(...xs).toFixed(2)} (${A[minI].name}) · máx ${Math.max(...xs).toFixed(2)} · fallan ${n}/${xs.length}${n ? ' (' + A.filter((c, i) => xs[i] < need).map(c => c.name).join(', ') + ')' : ''}${!used && n ? ' — no se usa' : ''}`)
  if (v) console.log('   ' + A.map((c, i) => `${c.name} ${xs[i].toFixed(2)}`).join(' · '))
}
// el relleno "bajo la línea" (--bad) no puede confundirse con el acento del club: distancia de matiz con --accent-hi (rojo del club)
{ const rows = A.map(c => { const hi = wmix(c.a, .70).map(Math.round), [h, s] = hs(hi), [hb] = hs(bad); return { name: c.name, d: s >= .35 ? gap(h, hb) : 360 } })
  const near = rows.filter(r => r.d < 25)
  console.log(`\n--accent-hi / --bad: distancia de matiz mín ${Math.min(...rows.map(r => r.d)).toFixed(1)}° · a menos de 25°: ${near.length} (${near.map(r => r.name).join(', ')}) — por eso las escalas no usan el acento`) }
console.log('\nFALLAS', fails)
process.exit(fails ? 1 : 0)
