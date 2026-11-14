// Mide los pares "medir" del diseño visual de la bandeja (production/ui/bandeja/visual-design.md, sección 8.2).
import fs from 'node:fs'
const db = JSON.parse(fs.readFileSync('/home/user/technical-area/src/data/db.json', 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
// regla nueva de clubTheme (tinta por contraste WCAG; si ninguna llega a 4,5:1 el acento se corre lo mínimo), igual que tools/check-contrast.mjs
const hexOf = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const toward = (h, to, t) => hexOf(rgb(h).map(v => v + (to - v) * t))
const crH = (a, b) => cr(rgb(a), rgb(b))
const inked = h => { if (Math.max(crH(h, '#ffffff'), crH(h, '#0b0f14')) >= 4.5) return h; for (let i = 1; i <= 100; i++) { const d = toward(h, 0, i / 100), l = toward(h, 255, i / 100); if (crH(d, '#ffffff') >= 4.5) return d; if (crH(l, '#0b0f14') >= 4.5) return l } return h }
const accentOf = c => { let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'; if (lum(a) < 95) a = mix(a, lum(a) < 60 ? .45 : .28); return inked(a) }
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
  ['26 text / bad16%·panel2', text, over(bad, .16, panel2), 4.5], ['28 bad cvd / panel', badC, panel, 4.5], ['30 text / #0d0f22', text, H('#0d0f22'), 4.5], ['32 dim / #11132a', dim, H('#11132a'), 4.5], ['32 text / #11132a', text, H('#11132a'), 4.5],
  ['39 warn / warn12%·panel', warn, over(warn, .12, panel), 3], ['40 danger / bad16%·panel2', danger, over(bad, .16, panel2), 3], ['40 danger / panel2', danger, panel2, 3], ['41 good / panel', good, panel, 3],
]
let fails = 0
for (const [k, f, b, need] of fixed) { const v = cr(f, b); if (v < need) fails++; console.log(`${k}: ${v.toFixed(2)} ${v < need ? 'FALLA' : 'ok'}`) }
const per = { '18 acento62%+blanco / panel [4,5]': [4.5, a => cr(wmix(a, .62), panel)], '33-34 accent-hi / fila elegida [3]': [3, a => cr(wmix(a, .70), over(a, .14, panel))], '35 accent-hi / fila elegida [3]': [3, a => cr(wmix(a, .70), over(a, .14, panel))], '37 accent-hi / #0a0c1b [3]': [3, a => cr(wmix(a, .70), H('#0a0c1b'))] }
for (const [k, [need, fn]] of Object.entries(per)) { const v = clubs.map(c => fn(rgb(accentOf(c)))); const n = v.filter(x => x < need).length; fails += n; console.log(`${k}: mín ${Math.min(...v).toFixed(2)} · máx ${Math.max(...v).toFixed(2)} · fallan ${n}/${v.length}`) }
console.log('FALLAS', fails)
