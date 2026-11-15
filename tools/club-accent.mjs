// Acento efectivo de un club: la misma regla que clubTheme (src/ui/common.tsx), en un solo lugar para los scripts de contraste
// (tools/check-contrast.mjs, production/ui/mercado/contraste.mjs, production/ui/bandeja/contraste-diseno.mjs). Si cambia allá, cambiarla acá.
//  1. El primer color del club con saturación (> 50); si no hay, el verde por defecto. Si es oscuro, se aclara en OKLab (`lift`).
//  2. Tinta por contraste WCAG (blanco o #0b0f14); si ninguna llega a 4,5:1, el acento se corre lo mínimo (`inked`).
//  3. Clubes amarillos y naranjas (decisión del usuario, fase 5 del Mercado): si el acento o su versión clara quedan a menos de 25° del ámbar
//     de --warn (#ffb547) o del amarillo de .cvd (#f3d34a) con saturación ≥ 0,35, el botón principal y la selección usan el SEGUNDO color
//     del club con la misma regla. Si el segundo también choca o es gris (saturación ≤ 50), un índigo propio (FALLBACK). La banda de la
//     ficha del jugador y el escudo conservan el color original (`band`).
export const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
export const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
const toLin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const toSrgb = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)
const oklab = h => { const [r, g, b] = rgb(h).map(toLin), l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s] }
const fromLab = (L, A, B) => { const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.291485548 * B) ** 3; return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s] }
const lift = (h, t) => { const [, A, B] = oklab(h), L = oklab(mix(h, t))[0]; let k = 1; for (let i = 0; i < 40 && fromLab(L, A * k, B * k).some(v => v < -1e-4 || v > 1 + 1e-4); i++) k *= .97; return '#' + fromLab(L, A * k, B * k).map(v => Math.round(Math.min(255, Math.max(0, toSrgb(Math.min(1, Math.max(0, v)))))).toString(16).padStart(2, '0')).join('') }
const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const Lh = h => { const [r, g, b] = rgb(h).map(lin); return .2126 * r + .7152 * g + .0722 * b }
export const crHex = (a, b) => { const x = Lh(a), y = Lh(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const toward = (h, to, t) => hex(rgb(h).map(v => v + (to - v) * t))
export const blendHex = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v * t + y[i] * (1 - t))) } // a al t, resto b
const W = '#ffffff', D = '#0b0f14'
const ink = h => (crHex(h, W) >= crHex(h, D) ? W : D)
/** [acento, tinta, corrimiento en %] */
export function inked(h) {
  if (Math.max(crHex(h, W), crHex(h, D)) >= 4.5) return [h, ink(h), 0]
  for (let i = 1; i <= 100; i++) { const d = toward(h, 0, i / 100), l = toward(h, 255, i / 100); if (crHex(d, W) >= 4.5) return [d, W, i]; if (crHex(l, D) >= 4.5) return [l, D, i] }
  return [h, ink(h), 0]
}
export const hueSat = h => { const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; if (!d) return [0, 0]; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(x * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))] }
export const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
export const WARN = ['#ffb547', '#f3d34a'], WARN_H = WARN.map(w => hueSat(w)[0])
/** Matiz a menos de 25° del ámbar de --warn o del amarillo de .cvd, con saturación ≥ 0,35. */
export const nearWarn = h => { const [x, s] = hueSat(h); return s >= .35 && WARN_H.some(w => hueGap(x, w) < 25) }
export const DEFAULT = '#3ddc97', FALLBACK = '#8b93ff'
const prep = h => { let a = h; if (lum(a) < 95) a = lift(a, lum(a) < 60 ? .45 : .28); return a }
const clashes = a => nearWarn(a) || nearWarn(blendHex(a, W, .7))
/** `a`: acento efectivo (antes de la tinta); `band`: el del color original del club; `from`: 'first' | 'second' | 'fallback'. */
export function accentOf(colors) {
  const [c0, c1] = colors
  const first = sat(c0) > 50 ? c0 : sat(c1) > 50 ? c1 : DEFAULT
  const a = prep(first)
  if (!clashes(inked(a)[0])) return { a, band: a, from: 'first' }
  const other = first === c0 ? c1 : c0
  if (sat(other) > 50 && !clashes(inked(prep(other))[0])) return { a: prep(other), band: a, from: 'second' }
  return { a: FALLBACK, band: a, from: 'fallback' }
}
