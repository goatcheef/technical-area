// Contraste de la tinta sobre el acento del club para los clubes con economía (división > 0) de src/data/db.json.
// Reproduce clubTheme de src/ui/common.tsx (aclarado en OKLab con lift): si cambia la regla allá, cambiarla acá. Uso: node tools/check-contrast.mjs [-v]
import fs from 'node:fs'
const db = JSON.parse(fs.readFileSync(new URL('../src/data/db.json', import.meta.url), 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
// aclarar en OKLab (como lift en common.tsx): la luminosidad de mezclar con blanco al t, con el matiz y el croma del color
const toLin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const toSrgb = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)
const oklab = h => { const [r, g, b] = rgb(h).map(toLin), l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s] }
const fromLab = (L, A, B) => { const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.291485548 * B) ** 3; return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s] }
const lift = (h, t) => { const [, A, B] = oklab(h), L = oklab(mix(h, t))[0]; let k = 1; for (let i = 0; i < 40 && fromLab(L, A * k, B * k).some(v => v < -1e-4 || v > 1 + 1e-4); i++) k *= .97; return '#' + fromLab(L, A * k, B * k).map(v => Math.round(Math.min(255, Math.max(0, toSrgb(Math.min(1, Math.max(0, v)))))).toString(16).padStart(2, '0')).join('') }
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
// --sel (selección y foco): el acento claro, o #f1f2fa si su matiz queda a menos de 25° del ámbar de --warn (o del amarillo de .cvd) con saturación ≥ 0,35
const hueSat = h => { const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; if (!d) return [0, 0]; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(x * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))] }
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
const WARN = ['#ffb547', '#f3d34a'], WARN_H = WARN.map(w => hueSat(w)[0])
const selOf = hi => { const [h, s] = hueSat(hi); return s >= .35 && WARN_H.some(w => gap(h, w) < 25) ? '#f1f2fa' : hi }
const base = c => { let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'; if (lum(a) < 95) a = lift(a, lum(a) < 60 ? .45 : .28); return a }
const theme = c => { const b = base(c), [a, k, shift] = inked(b), hi = blend(a, W, .7); return { name: c.short, base: b, a, k, shift, a2: fit(blend(a, '#ff6fb5', .55), k), hi, sel: selOf(hi) } }

const v = process.argv.includes('-v'), T = clubs.map(theme)
const panel = '#1b1e36', panel2 = '#23274a', text = '#f1f2fa'
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
  // --sel: barra de la fila elegida, anillo de foco y punto de sin leer (indicadores sin texto, 3:1)
  ['--sel / panel [3:1]', t => cr(t.sel, panel), 3],
  ['--sel / panel2 (botones, tarjetas) [3:1]', t => cr(t.sel, panel2), 3],
  ['--sel / fila elegida (accent-soft sobre panel) [3:1]', t => cr(t.sel, blend(t.a, panel, .14)), 3],
  ['--sel / barra superior y de acciones #11132a [3:1]', t => cr(t.sel, '#11132a'), 3],
]
console.log(`clubes: ${T.length} · con tinta clara ${T.filter(t => t.k === W).length} · con tinta oscura ${T.filter(t => t.k === D).length} · acento corrido ${T.filter(t => t.shift).length}`)
let fails = 0
for (const [k, f, need] of checks) { const xs = T.map(f), n = xs.filter(x => x < need).length; if ((need === 4.5 && k.startsWith('tinta')) || k.startsWith('--sel')) fails += n; console.log(`${k}: mín ${Math.min(...xs).toFixed(2)} · fallan ${n}${n ? ' (' + T.filter((t, i) => xs[i] < need).map(t => t.name).join(', ') + ')' : ''}`) }
for (const t of T.filter(t => t.shift || v)) console.log(`  ${t.name}: ${t.base} → ${t.a}${t.shift ? ` (corrido ${t.shift} %)` : ''} · tinta ${t.k} · ${cr(t.k, t.a).toFixed(2)}:1`)
// --sel distinto de --warn: con saturación ≥ 0,35, el matiz tiene que quedar a 25° o más del ámbar (#ffb547, 36°) y del amarillo de .cvd (#f3d34a, 49°).
// Los que no llegan usan el neutro #f1f2fa (saturación baja: no se confunde con ningún ámbar).
const hueRows = T.map(t => { const [h, s] = hueSat(t.sel); return { t, h, s, d: Math.min(...WARN_H.map(w => gap(h, w))) } })
const colored = hueRows.filter(x => x.s >= .35), hueFails = colored.filter(x => x.d < 25)
fails += hueFails.length
console.log(`--sel distinto de --warn (matiz a ≥ 25° de ${WARN.join(' y ')} con saturación ≥ 0,35): distancia mín ${Math.min(...colored.map(x => x.d)).toFixed(1)}° · fallan ${hueFails.length}${hueFails.length ? ' (' + hueFails.map(x => x.t.name).join(', ') + ')' : ''}`)
const neutral = T.filter(t => t.sel !== t.hi)
console.log(`--sel neutro (#f1f2fa) en lugar del acento claro: ${neutral.length} clubes${neutral.length ? ': ' + neutral.map(t => `${t.name} (${t.hi}, ${hueSat(t.hi)[0].toFixed(0)}°)`).join(', ') : ''}`)
const root = '#3ddc97'; console.log(`acento por defecto ${root} con tinta #04130c: ${cr(root, '#04130c').toFixed(2)}:1`)
console.log('FALLAS (tinta / acento bajo 4,5; --sel bajo 3:1 o pegado a --warn):', fails)
process.exit(fails ? 1 : 0)
