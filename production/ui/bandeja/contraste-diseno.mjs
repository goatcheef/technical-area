// Mide los pares "medir" del diseño visual de la bandeja (production/ui/bandeja/visual-design.md, sección 8.2).
import fs from 'node:fs'
const db = JSON.parse(fs.readFileSync('/home/user/technical-area/src/data/db.json', 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
// aclarar en OKLab (como lift en common.tsx): la luminosidad de mezclar con blanco al t, con el matiz y el croma del color
const toLin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const toSrgb = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)
const oklab = h => { const [r, g, b] = rgb(h).map(toLin), l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s] }
const fromLab = (L, A, B) => { const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.291485548 * B) ** 3; return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s] }
const lift = (h, t) => { const [, A, B] = oklab(h), L = oklab(mix(h, t))[0]; let k = 1; for (let i = 0; i < 40 && fromLab(L, A * k, B * k).some(v => v < -1e-4 || v > 1 + 1e-4); i++) k *= .97; return '#' + fromLab(L, A * k, B * k).map(v => Math.round(Math.min(255, Math.max(0, toSrgb(Math.min(1, Math.max(0, v)))))).toString(16).padStart(2, '0')).join('') }
// regla nueva de clubTheme (tinta por contraste WCAG; si ninguna llega a 4,5:1 el acento se corre lo mínimo), igual que tools/check-contrast.mjs
const hexOf = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const toward = (h, to, t) => hexOf(rgb(h).map(v => v + (to - v) * t))
const crH = (a, b) => cr(rgb(a), rgb(b))
const inked = h => { if (Math.max(crH(h, '#ffffff'), crH(h, '#0b0f14')) >= 4.5) return h; for (let i = 1; i <= 100; i++) { const d = toward(h, 0, i / 100), l = toward(h, 255, i / 100); if (crH(d, '#ffffff') >= 4.5) return d; if (crH(l, '#0b0f14') >= 4.5) return l } return h }
const accentOf = c => { let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'; if (lum(a) < 95) a = lift(a, lum(a) < 60 ? .45 : .28); return inked(a) }
const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const L = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2])
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a))
const wmix = (c, t) => c.map(v => v * t + 255 * (1 - t)) // c al t, resto blanco
const H = h => rgb(h)
const panel = H('#1b1e36'), panel2 = H('#23274a'), panel3 = H('#2b3056'), text = H('#f1f2fa'), dim = H('#a3a8c8'), warn = H('#ffb547'), warnC = H('#f3d34a'), bad = H('#ff5d6c'), badC = H('#f08c3a'), danger = H('#ff8a95'), good = H('#3ddc97')
const fixed = [
  ['9 warn / panel2', warn, panel2, 4.5], ['10 text / warn10%·panel', text, over(warn, .10, panel), 4.5], ['11 #1d1300 / warn', H('#1d1300'), warn, 4.5], ['11 #1d1300 / warn cvd', H('#1d1300'), warnC, 4.5],
  ['12 text / warn13%·panel2', text, over(warn, .13, panel2), 4.5], ['16 text / panel3', text, panel3, 4.5], ['17 text / #12152b', text, H('#12152b'), 4.5], ['17 dim / #12152b', dim, H('#12152b'), 4.5],
  ['21 text / panel3', text, panel3, 4.5], ['24 text / panel3', text, panel3, 4.5], ['25 danger / panel2', danger, panel2, 4.5], ['25 danger / panel3', danger, panel3, 4.5],
  ['26 danger / panel2 (Confirmar rechazo sin relleno, sobre la caja de confirmación)', danger, panel2, 4.5], ['26 danger / panel (Rechazar sin relleno, sobre el panel)', danger, panel, 4.5], ['26 danger / #11132a (barra de acciones del celular)', danger, H('#11132a'), 4.5], ['28 bad cvd / panel', badC, panel, 4.5], ['30 text / #0d0f22', text, H('#0d0f22'), 4.5], ['32 dim / #11132a', dim, H('#11132a'), 4.5], ['32 text / #11132a', text, H('#11132a'), 4.5],
  ['39 warn / warn12%·panel', warn, over(warn, .12, panel), 3], ['40 borde danger / panel2', danger, panel2, 3], ['40 borde danger / #11132a', danger, H('#11132a'), 3], ['41 good / panel', good, panel, 3],
]
let fails = 0
for (const [k, f, b, need] of fixed) { const v = cr(f, b); if (v < need) fails++; console.log(`${k}: ${v.toFixed(2)} ${v < need ? 'FALLA' : 'ok'}`) }
// --sel (selección y foco, fase 5): acento claro, o #f1f2fa si su matiz queda a menos de 25° del ámbar de --warn o del amarillo de .cvd (como clubTheme)
const hs = c => { const [r, g, b] = c.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; if (!d) return [0, 0]; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(x * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))] }
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
const selOf = a => { const hi = wmix(a, .70).map(Math.round), [h, sa] = hs(hi); return sa >= .35 && [hs(warn)[0], hs(warnC)[0]].some(w => gap(h, w) < 25) ? text : hi }
const per = {
  '42 --sel / panel [3]': [3, a => cr(selOf(a), panel)], '42 --sel / fila elegida [3]': [3, a => cr(selOf(a), over(a, .14, panel))], '42 --sel / panel2 [3]': [3, a => cr(selOf(a), panel2)], '42 --sel / #11132a [3]': [3, a => cr(selOf(a), H('#11132a'))], '18 acento62%+blanco / panel [4,5]': [4.5, a => cr(wmix(a, .62), panel)], '33-34 accent-hi / fila elegida [3]': [3, a => cr(wmix(a, .70), over(a, .14, panel))], '35 accent-hi / fila elegida [3]': [3, a => cr(wmix(a, .70), over(a, .14, panel))], '37 accent-hi / #0a0c1b [3]': [3, a => cr(wmix(a, .70), H('#0a0c1b'))] }
for (const [k, [need, fn]] of Object.entries(per)) { const v = clubs.map(c => fn(rgb(accentOf(c)))); const n = v.filter(x => x < need).length; fails += n; console.log(`${k}: mín ${Math.min(...v).toFixed(2)} · máx ${Math.max(...v).toFixed(2)} · fallan ${n}/${v.length}`) }
console.log('FALLAS', fails)
