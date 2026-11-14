// Contrastes de la bandeja para todos los clubes con economía (división > 0), con la regla actual de clubTheme.
import fs from 'node:fs'
const db = JSON.parse(fs.readFileSync('/home/user/technical-area/src/data/db.json', 'utf8'))
const clubs = (Array.isArray(db.clubs) ? db.clubs : Object.values(db.clubs)).filter(c => c && c.colors && c.division > 0)
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const lum = h => { const [r, g, b] = rgb(h); return r * .299 + g * .587 + b * .114 }
const sat = h => { const [r, g, b] = rgb(h); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (h, t) => '#' + rgb(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
const accentOf = c => { let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'; if (lum(a) < 95) a = mix(a, lum(a) < 60 ? .45 : .28); return a }
const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
const L = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2])
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a))
const T = { panel: rgb('#1b1e36'), panel2: rgb('#23274a'), panel3: rgb('#2b3056'), text: rgb('#f1f2fa'), dim: rgb('#a3a8c8'), faint: rgb('#8a90b4'), warn: rgb('#ffb547'), bad: rgb('#ff5d6c'), danger: rgb('#ff8a95'), white: [255, 255, 255] }
const rows = { 'text / fila elegida (accent-soft .14 sobre panel)': [], 'dim / fila elegida': [], 'warn / fila elegida': [], 'faint / fila elegida': [], 'acento (borde, anillo) / panel [3:1]': [], 'acento / fila elegida [3:1]': [], 'punto sin leer (acento 70% + blanco) / panel [3:1]': [] }
for (const c of clubs) {
  const a = rgb(accentOf(c)), sel = over(a, .14, T.panel), dot = a.map(v => v * .7 + 255 * .3)
  rows['text / fila elegida (accent-soft .14 sobre panel)'].push(cr(T.text, sel))
  rows['dim / fila elegida'].push(cr(T.dim, sel))
  rows['warn / fila elegida'].push(cr(T.warn, sel))
  rows['faint / fila elegida'].push(cr(T.faint, sel))
  rows['acento (borde, anillo) / panel [3:1]'].push(cr(a, T.panel))
  rows['acento / fila elegida [3:1]'].push(cr(a, sel))
  rows['punto sin leer (acento 70% + blanco) / panel [3:1]'].push(cr(dot, T.panel))
}
console.log('clubes:', clubs.length)
for (const [k, v] of Object.entries(rows)) { const need = k.includes('[3:1]') ? 3 : 4.5; console.log(`${k}: mín ${Math.min(...v).toFixed(2)} · máx ${Math.max(...v).toFixed(2)} · fallan ${v.filter(x => x < need).length}`) }
const fixed = { 'dim / panel2 (encabezado de día)': [T.dim, T.panel2], 'warn / panel': [T.warn, T.panel], 'danger #ff8a95 / panel': [T.danger, T.panel], 'bad / panel': [T.bad, T.panel], 'dim / panel3 (hover/contador)': [T.dim, T.panel3], 'text / panel2 (contador)': [T.text, T.panel2], 'dim / panel2 (contador)': [T.dim, T.panel2], 'faint / panel': [T.faint, T.panel], 'faint / panel2': [T.faint, T.panel2] }
for (const [k, [f, b]] of Object.entries(fixed)) console.log(`${k}: ${cr(f, b).toFixed(2)}`)
