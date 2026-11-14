// Contraste de la tinta sobre el acento del club para los clubes con economía (división > 0) de src/data/db.json.
// Reproduce clubTheme de src/ui/common.tsx: si cambia la regla allá, cambiarla acá. Uso: node tools/check-contrast.mjs [-v]
import fs from 'node:fs'
const db = JSON.parse(fs.readFileSync(new URL('../src/data/db.json', import.meta.url), 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const L = h => { const [r, g, b] = rgb(h).map(lin); return .2126 * r + .7152 * g + .0722 * b }
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const toward = (h, to, t) => hex(rgb(h).map(v => v + (to - v) * t))
const blend = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v * t + y[i] * (1 - t))) } // a al t, resto b
const W = '#ffffff', D = '#0b0f14'
const ink = h => (cr(h, W) >= cr(h, D) ? W : D)
const fit = (h, k) => { for (let i = 0; i < 50 && cr(h, k) < 4.5; i++) h = toward(h, k === W ? 0 : 255, .02); return h }
function inked(h) {
  if (Math.max(cr(h, W), cr(h, D)) >= 4.5) return [h, ink(h), 0]
  for (let i = 1; i <= 100; i++) { const d = toward(h, 0, i / 100), l = toward(h, 255, i / 100); if (cr(d, W) >= 4.5) return [d, W, i]; if (cr(l, D) >= 4.5) return [l, D, i] }
  return [h, ink(h), 0]
}
const base = c => { let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'; if (lum(a) < 95) a = mix(a, lum(a) < 60 ? .45 : .28); return a }
const theme = c => { const b = base(c), [a, k, shift] = inked(b); return { name: c.short, base: b, a, k, shift, a2: fit(blend(a, '#ff6fb5', .55), k) } }

const v = process.argv.includes('-v'), T = clubs.map(theme)
const panel = '#1b1e36', text = '#f1f2fa'
const checks = [
  ['tinta / acento (botón principal, reloj en vivo, contadores, dorsal)', t => cr(t.k, t.a), 4.5],
  ['tinta / fin del degradé de Continuar (--accent-2)', t => cr(t.k, t.a2), 4.5],
  ['tinta / mitad del degradé de Continuar', t => cr(t.k, blend(t.a, t.a2, .5)), 4.5],
  ['acento / panel (bordes, anillos) [3:1]', t => cr(t.a, panel), 3],
  ['accent-hi (acento 70 % + blanco) / panel [3:1]', t => cr(blend(t.a, W, .7), panel), 3],
  ['accent-hi / opción elegida (accent-soft sobre panel) [3:1]', t => cr(blend(t.a, W, .7), blend(t.a, panel, .14)), 3],
  ['text / opción elegida (accent-soft sobre panel)', t => cr(text, blend(t.a, panel, .14)), 4.5],
  ['text / .btn.on (acento 22 % sobre panel2)', t => cr(text, blend(t.a, '#23274a', .22)), 4.5],
  ['blanco / banda de la ficha (acento 34 % sobre panel)', t => cr(W, blend(t.a, panel, .34)), 4.5],
]
console.log(`clubes: ${T.length} · con tinta clara ${T.filter(t => t.k === W).length} · con tinta oscura ${T.filter(t => t.k === D).length} · acento corrido ${T.filter(t => t.shift).length}`)
let fails = 0
for (const [k, f, need] of checks) { const xs = T.map(f), n = xs.filter(x => x < need).length; if (need === 4.5 && k.startsWith('tinta')) fails += n; console.log(`${k}: mín ${Math.min(...xs).toFixed(2)} · fallan ${n}${n ? ' (' + T.filter((t, i) => xs[i] < need).map(t => t.name).join(', ') + ')' : ''}`) }
for (const t of T.filter(t => t.shift || v)) console.log(`  ${t.name}: ${t.base} → ${t.a}${t.shift ? ` (corrido ${t.shift} %)` : ''} · tinta ${t.k} · ${cr(t.k, t.a).toFixed(2)}:1`)
const root = '#3ddc97'; console.log(`acento por defecto ${root} con tinta #04130c: ${cr(root, '#04130c').toFixed(2)}:1`)
console.log('BAJO 4,5 (tinta / acento):', fails)
process.exit(fails ? 1 : 0)
