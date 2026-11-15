// Mide los pares de color del diseño visual del Mercado (production/ui/mercado/visual-design.md, sección 9.2).
// Adaptado de production/ui/bandeja/contraste-diseno.mjs. El acento de cada club sale de la misma regla que clubTheme
// (src/ui/common.tsx) y tools/check-contrast.mjs: aclarado en OKLab si es oscuro, tinta por contraste y corrimiento mínimo.
// Uso: node production/ui/mercado/contraste.mjs [-v]   (sale con código 1 si algún par no llega a su mínimo)
import fs from 'node:fs'
import { accentOf as clubAccent } from '../../../tools/club-accent.mjs'
const db = JSON.parse(fs.readFileSync(new URL('../../../src/data/db.json', import.meta.url), 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
const toLin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const toSrgb = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)
const oklab = h => { const [r, g, b] = rgb(h).map(toLin), l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s] }
const fromLab = (L, A, B) => { const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.291485548 * B) ** 3; return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s] }
const lift = (h, t) => { const [, A, B] = oklab(h), L = oklab(mix(h, t))[0]; let k = 1; for (let i = 0; i < 40 && fromLab(L, A * k, B * k).some(v => v < -1e-4 || v > 1 + 1e-4); i++) k *= .97; return '#' + fromLab(L, A * k, B * k).map(v => Math.round(Math.min(255, Math.max(0, toSrgb(Math.min(1, Math.max(0, v)))))).toString(16).padStart(2, '0')).join('') }
const hexOf = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const toward = (h, to, t) => hexOf(rgb(h).map(v => v + (to - v) * t))
const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const L = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2])
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const crH = (a, b) => cr(rgb(a), rgb(b))
const inked = h => { if (Math.max(crH(h, '#ffffff'), crH(h, '#0b0f14')) >= 4.5) return h; for (let i = 1; i <= 100; i++) { const d = toward(h, 0, i / 100), l = toward(h, 255, i / 100); if (crH(d, '#ffffff') >= 4.5) return d; if (crH(l, '#0b0f14') >= 4.5) return l } return h }
// acento efectivo: tools/club-accent.mjs (la regla de clubTheme, con el segundo color o el índigo en los clubes amarillos y naranjas)
const accentOf = c => inked(clubAccent(c.colors).a)
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a)) // fg al a sobre bg (también color-mix(fg a%, bg))
const wmix = (c, t) => c.map(v => v * t + 255 * (1 - t)) // c al t, resto blanco
const hs = c => { const [r, g, b] = c.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; if (!d) return [0, 0]; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(x * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))] }
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
const H = rgb
const panel = H('#1b1e36'), panel2 = H('#23274a'), panel3 = H('#2b3056'), text = H('#f1f2fa'), dim = H('#a3a8c8'), faint = H('#8a90b4'), field = H('#12152b'), modalBg = panel
const warn = H('#ffb547'), warnC = H('#f3d34a'), good = H('#3ddc97'), goodC = H('#4aa3ff'), bad = H('#ff5d6c'), badC = H('#f08c3a'), danger = H('#ff8a95'), ink = H('#1d1300')
const selOf = a => { const hi = wmix(a, .70).map(Math.round), [h, sa] = hs(hi); return sa >= .35 && [hs(warn)[0], hs(warnC)[0]].some(w => gap(h, w) < 25) ? text : hi }
const zebra = over(H('#ffffff'), .018, panel) // fila par de la tabla
const warnBox = (w, bg) => over(w, .10, bg) // encabezado de grupo con decisiones
const warnChip = (w, bg) => over(w, .13, bg) // chip "Contraoferta" / "Acordado"

// [nombre, texto/indicador, fondo, mínimo]
const fixed = [
  // franja de estado (sobre --panel)
  ['1 valor y estado del libro --text / panel', text, panel, 4.5],
  ['2 rótulos y leyendas --dim / panel', dim, panel, 4.5],
  ['3 "cierra hoy / mañana" --warn / panel', warn, panel, 4.5],
  ['3c ídem .cvd', warnC, panel, 4.5],
  ['4 caja negativa --bad / panel', bad, panel, 4.5],
  ['4c ídem .cvd', badC, panel, 4.5],
  ['5 ícono ✓ del libro --good / círculo panel2 [3]', good, panel2, 3],
  ['5c ídem .cvd', goodC, panel2, 3],
  ['6 ícono ! del libro --warn / círculo warn12%·panel [3]', warn, over(warn, .12, panel), 3],
  ['6c ídem .cvd', warnC, over(warnC, .12, panel), 3],
  ['7 candado del libro cerrado --dim / panel2 [3]', dim, panel2, 3],
  // pestañas
  ['8 contador de Tratos #1d1300 / --warn', ink, warn, 4.5],
  ['8c ídem .cvd', ink, warnC, 4.5],
  ['9 contador neutro --text / panel3', text, panel3, 4.5],
  // tabla
  ['10 encabezado de columna --dim / panel (antes --faint 10,6 px)', dim, panel, 4.5],
  ['11 rango y dato secundario --dim / fila par', dim, zebra, 4.5],
  ['12 --dim / hover de fila panel2', dim, panel2, 4.5],
  ['13 contrato por vencer --warn / panel2 (hover)', warn, panel2, 4.5],
  ['14 chip de trato neutro --dim / panel2', dim, panel2, 4.5],
  ['15 chip de trato con decisión --text / warn13%·panel2', text, warnChip(warn, panel2), 4.5],
  ['15c ídem .cvd', text, warnChip(warnC, panel2), 4.5],
  ['16 rango de valoración (Val) --text / panel3', text, panel3, 4.5],
  // panel del jugador, BidBox e impacto
  ['17 monto del campo --text / #12152b', text, field, 4.5],
  ['18 rótulo del impacto --dim / panel2', dim, panel2, 4.5],
  ['19 valor del impacto --text / panel2', text, panel2, 4.5],
  ['20 ícono ✓ "entra" --good / panel2 [3]', good, panel2, 3],
  ['20c ídem .cvd', goodC, panel2, 3],
  ['21 ícono ! "puede no entrar" --warn / panel2 [3]', warn, panel2, 3],
  ['21c ídem .cvd', warnC, panel2, 3],
  ['22 ícono ✗ "no entra" --danger / panel2 [3]', danger, panel2, 3],
  ['23 ícono ! de aviso --warn / panel [3]', warn, panel, 3],
  ['24 ícono i de información --dim / panel [3]', dim, panel, 3],
  ['25 ícono ✗ del bloqueo --danger / panel2 [3]', danger, panel2, 3],
  ['26 ícono de reloj de arena --dim / panel2 [3]', dim, panel2, 3],
  // Tratos
  ['27 encabezado de grupo con decisiones --text / warn10%·panel', text, warnBox(warn, panel), 4.5],
  ['27c ídem .cvd', text, warnBox(warnC, panel), 4.5],
  ['28 descripción del grupo --dim / fondo de página #0a0c1b', dim, H('#0a0c1b'), 4.5],
  ['29 encabezado de grupo neutro --text / panel2', text, panel2, 4.5],
  ['30 riel de aviso --warn / panel [3]', warn, panel, 3],
  ['30c ídem .cvd', warnC, panel, 3],
  ['31 historial: fecha y texto --dim / panel', dim, panel, 4.5],
  ['32 ícono ⇄ o ✓ de cierre --good / panel2 [3]', good, panel2, 3],
  ['33 estado vacío --dim / panel (borde discontinuo --line no es indicador)', dim, panel, 4.5],
  // Presupuesto y balance
  ['34 resultado negativo --bad / panel', bad, panel, 4.5],
  ['34b --bad / panel2 (pasa justo: los negativos van sobre --panel, ver 9.2)', bad, panel2, 4.5],
  ['34bc ídem .cvd', badC, panel2, 4.5],
  ['35 masa sobre el tope: ! --warn / panel [3]', warn, panel, 3],
  // negociación
  ['36 lo que pide el representante --text / panel2', text, panel2, 4.5],
  ['37 riel de "Hay acuerdo" --good / panel2 [3]', good, panel2, 3],
  ['37c ídem .cvd', goodC, panel2, 3],
  ['38 "Confirmar: cancelar el trato" --danger / panel2', danger, panel2, 4.5],
  ['39 --danger / panel (Rechazar sin relleno)', danger, panel, 4.5],
  ['40 --faint / panel3 (prohibido: control)', faint, panel3, 4.5],
]
const v = process.argv.includes('-v')
let fails = 0
const ignore = new Set(['40 --faint / panel3 (prohibido: control)'])
console.log('— Pares fijos (no dependen del club)')
for (const [k, f, b, need] of fixed) { const x = cr(f, b), bad_ = x < need; if (bad_ && !ignore.has(k)) fails++; console.log(`${k}: ${x.toFixed(2)} ${bad_ ? (ignore.has(k) ? 'no llega (no se usa)' : 'FALLA') : 'ok'}`) }

// pares que dependen del acento del club
const A = clubs.map(c => ({ name: c.short, a: rgb(accentOf(c)) }))
const chosen = a => over(a, .14, panel) // --accent-soft compuesto sobre --panel (fila, tarjeta y pestaña elegidas)
const per = [
  ['41 --text / fila o tarjeta elegida', 4.5, a => cr(text, chosen(a))],
  ['42 --dim / fila o tarjeta elegida', 4.5, a => cr(dim, chosen(a))],
  ['43 --warn / fila o tarjeta elegida (plazo corto, contrato)', 4.5, a => cr(warn, chosen(a))],
  ['43c --warn .cvd / fila o tarjeta elegida', 4.5, a => cr(warnC, chosen(a))],
  ['44 --sel (riel 6 px, contorno y foco) / fila o tarjeta elegida [3]', 3, a => cr(selOf(a), chosen(a))],
  ['45 --sel (foco) / panel [3]', 3, a => cr(selOf(a), panel)],
  ['46 --sel (foco) / panel2 [3]', 3, a => cr(selOf(a), panel2)],
  ['47 --sel (foco del campo) / #12152b [3]', 3, a => cr(selOf(a), field)],
  ['48 --sel (foco de pestaña) / fondo de página #0a0c1b [3]', 3, a => cr(selOf(a), H('#0a0c1b'))],
  ['49 --accent-hi borde de pestaña activa / #0a0c1b [3]', 3, a => cr(wmix(a, .70), H('#0a0c1b'))],
  ['50 --accent-hi relleno de medidor y de conocimiento / pista panel3 [3]', 3, a => cr(wmix(a, .70), panel3)],
  ['51 --accent-hi rayado de lo comprometido / pista panel3 [3]', 3, a => cr(wmix(a, .70), panel3)],
  ['52 título de tarjeta (acento 62 % + blanco) / panel', 4.5, a => cr(wmix(a, .62), panel)],
  ['53 --text / fila propia de Movimientos (acento 14 % sobre panel)', 4.5, a => cr(text, chosen(a))],
  ['54 --text / pestaña activa (accent-soft compuesto sobre panel)', 4.5, a => cr(text, chosen(a))],
]
console.log('\n— Pares por club (86 clubes con economía)')
for (const [k, need, fn] of per) {
  const xs = A.map(c => fn(c.a)), n = xs.filter(x => x < need).length
  fails += n
  const minI = xs.indexOf(Math.min(...xs))
  console.log(`${k}: mín ${Math.min(...xs).toFixed(2)} (${A[minI].name}) · máx ${Math.max(...xs).toFixed(2)} · fallan ${n}/${xs.length}${n ? ' (' + A.filter((c, i) => xs[i] < need).map(c => c.name).join(', ') + ')' : ''}`)
  if (v) console.log('   ' + A.map((c, i) => `${c.name} ${xs[i].toFixed(2)}`).join(' · '))
}
// el acento efectivo (botón principal, selección) y su versión clara, a ≥ 25° del ámbar de --warn y del amarillo de .cvd en cada club
{ const wh = [hs(warn)[0], hs(warnC)[0]], rows = clubs.map(c => { const a = rgb(accentOf(c)), ds = [a, wmix(a, .70).map(Math.round)].map(x => { const [h, sa] = hs(x); return sa >= .35 ? Math.min(...wh.map(w => gap(h, w))) : 360 }); return { name: c.short, d: Math.min(...ds) } })
  const bad = rows.filter(r => r.d < 25); fails += bad.length
  console.log(`acento efectivo / --warn: distancia de matiz mín ${Math.min(...rows.map(r => r.d)).toFixed(1)}° · fallan ${bad.length}${bad.length ? ' (' + bad.map(r => r.name).join(', ') + ')' : ''}`) }
console.log('\nFALLAS', fails)
process.exit(fails ? 1 : 0)
