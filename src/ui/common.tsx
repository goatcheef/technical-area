import { useId, useRef, useEffect, useState, type ReactNode } from 'react'
import crestsJson from '../data/crests.json'
import { PLAYER_PHOTO } from '../data/playerPhoto'
import { askingPrice, doTransfer, evaluateBid, wageDemand, windowOpen } from '../engine/career'
import { STATUS, fmtRange, knowOf, minutesShare, persLabels, scout, shown } from '../engine/squad'
import { fmtDate } from '../engine/game'
import { sab } from '../engine/week'
import { POS_LABEL, POS_NAME, ageOn, bestRating, posRating } from '../engine/positions'
import { ATTR_GROUPS, ATTR_LABEL, A, type Attr, type Avatar, type Club, type Fixture, type Game, type Player, type SeasonStats, type Shot } from '../engine/types'
import { useGame } from '../store'

const CRESTS = crestsJson as Record<string, string>
type ClubLike = { id?: number; colors: [string, string]; code?: string; short: string }

// ---------- color ----------
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const lum = (hex: string) => { const [r, g, b] = rgb(hex); return r * 0.299 + g * 0.587 + b * 0.114 }
const sat = (hex: string) => { const [r, g, b] = rgb(hex); return Math.max(r, g, b) - Math.min(r, g, b) }
const mix = (hex: string, t: number) => '#' + rgb(hex).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('')
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const L = (hex: string) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
/** Contraste WCAG entre dos colores (1 a 21). */
export const contrast = (a: string, b: string) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const toward = (hex: string, to: number, t: number) => '#' + rgb(hex).map(v => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('')
const blend = (a: string, b: string, t: number) => { const y = rgb(b); return '#' + rgb(a).map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('') }
const INK_L = '#ffffff', INK_D = '#0b0f14'
/** Tinta clara u oscura, la de más contraste sobre el color. */
export const ink = (hex: string) => (contrast(hex, INK_L) >= contrast(hex, INK_D) ? INK_L : INK_D)
/** El color corrido lo justo (más oscuro con tinta clara, más claro con tinta oscura) para que la tinta llegue a 4,5:1. */
const fit = (hex: string, k: string) => { for (let i = 0; i < 50 && contrast(hex, k) < 4.5; i++) hex = toward(hex, k === INK_L ? 0 : 255, 0.02); return hex }
/** Acento y su tinta: se respeta el color del club; si ninguna tinta llega a 4,5:1, se corre lo mínimo hacia la que necesite menos cambio. */
export function inked(hex: string): [string, string] {
  if (Math.max(contrast(hex, INK_L), contrast(hex, INK_D)) >= 4.5) return [hex, ink(hex)]
  for (let i = 1; i <= 100; i++) { const d = toward(hex, 0, i / 100), l = toward(hex, 255, i / 100); if (contrast(d, INK_L) >= 4.5) return [d, INK_L]; if (contrast(l, INK_D) >= 4.5) return [l, INK_D] }
  return [hex, ink(hex)]
}
/** Matiz (0-360) y saturación (0-1) HSL. */
export const hueSat = (hex: string): [number, number] => {
  const [r, g, b] = rgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
  if (!d) return [0, 0]
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1))]
}
const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
/** Matices de `--warn` (ámbar #ffb547) y de `--warn` en el modo para daltonismo (amarillo #f3d34a): el color de "decisión". */
const WARN_HUES = [hueSat('#ffb547')[0], hueSat('#f3d34a')[0]]
/**
 * Color de selección y foco (`--sel`): el acento claro, salvo que su matiz quede a menos de 25° del ámbar de las decisiones
 * (o del amarillo del modo para daltonismo) con saturación alta (≥ 0,35). En ese caso, el texto (#f1f2fa): así "elegido" nunca
 * se confunde con "para decidir" en los clubes amarillos y naranjas.
 */
export const selColor = (hi: string) => { const [h, s] = hueSat(hi); return s >= 0.35 && WARN_HUES.some(w => hueGap(h, w) < 25) ? '#f1f2fa' : hi }
// OKLab / OKLCH (Björn Ottosson): aclarar ahí conserva el matiz y la intensidad que se pierden al mezclar con blanco
const toLin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const toSrgb = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const oklab = (hex: string) => {
  const [r, g, b] = rgb(hex).map(toLin)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
/** sRGB lineal (0-1) de un color OKLab; puede salir del rango si el color no existe en sRGB. */
const fromLab = (L: number, A: number, B: number) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}
/**
 * Aclara un color oscuro hasta la luminosidad (OKLab) que tendría mezclado con blanco al `t`, pero con su matiz y su croma:
 * el azul marino queda azul (Gimnasia #1a2b57 → #738abd) en vez de gris (#818aa3). Si ese croma no entra en sRGB, se baja lo justo.
 */
const lift = (hex: string, t: number) => {
  const [, A, B] = oklab(hex), L = oklab(mix(hex, t))[0]
  let k = 1
  for (let i = 0; i < 40 && fromLab(L, A * k, B * k).some(v => v < -1e-4 || v > 1 + 1e-4); i++) k *= 0.97
  return '#' + fromLab(L, A * k, B * k).map(v => Math.round(Math.min(255, Math.max(0, toSrgb(Math.min(1, Math.max(0, v)))))).toString(16).padStart(2, '0')).join('')
}
/** Variables de tema a partir de los colores del club (regla repetida en tools/check-contrast.mjs). */
export function clubTheme(c: { colors: [string, string] }): Record<string, string> {
  let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'
  if (lum(a) < 95) a = lift(a, lum(a) < 60 ? 0.45 : 0.28)
  const [acc, k] = inked(a), [r, g, b] = rgb(acc), hi = blend(acc, '#ffffff', 0.7)
  const soft = (h: string, o: number) => { const [x, y, z] = rgb(h); return `rgba(${x}, ${y}, ${z}, ${o})` }
  return { '--accent': acc, '--accent-ink': k, '--accent-soft': `rgba(${r}, ${g}, ${b}, .14)`, '--accent-hi': hi, '--sel': selColor(hi), '--accent-2': fit(blend(acc, '#ff6fb5', 0.55), k),
    '--c1a': soft(c.colors[0], lum(c.colors[0]) > 200 ? 0.1 : 0.34), '--c2a': soft(c.colors[1], lum(c.colors[1]) > 200 ? 0.08 : 0.26) }
}

// ---------- identidad ----------
export function Badge({ club, size = 28 }: { club: ClubLike; size?: number }) {
  const src = club.id != null ? CRESTS[club.id] : undefined
  if (src) return <img className="crest" data-cid={club.id} src={src} alt={club.short} width={size} height={size} style={{ width: size, height: size }} />
  const [a, b] = club.colors
  return <span className="badge" data-cid={club.id ?? undefined} title={club.short} style={{ width: size, height: size, background: a, borderColor: b, color: ink(a), fontSize: size * 0.3 }}>{(club.code ?? club.short).slice(0, 3).toUpperCase()}</span>
}
const SKIN = ['#f3d2b3', '#e2b48c', '#c98f62', '#a06a43', '#6e4428']
const HAIR = ['#1c1410', '#3b2a1d', '#6b4a2b', '#b98a4a', '#9aa0a6', '#d9d9d9']
export const SUITS = ['#1b2433', '#2b2b2b', '#3a2f55', '#2d4a3e', '#5a2a2a', '#c7ccd4']
export const SKINS = SKIN, HAIRS = HAIR
function FaceSvg({ a, shirt, trim, size }: { a: Avatar; shirt: string; trim: string; size: number }) {
  const skin = SKIN[a.skin % 5], hair = HAIR[a.hairColor % 6]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flex: 'none', borderRadius: '50%', background: 'var(--panel3)' }} aria-hidden="true">
      <path d="M8 64c0-13 10-19 24-19s24 6 24 19z" fill={shirt} /><path d="M25 46l7 8 7-8" fill="none" stroke={trim} strokeWidth="3" />
      <rect x="27" y="36" width="10" height="10" rx="3" fill={skin} /><ellipse cx="32" cy="27" rx="12" ry="14" fill={skin} />
      {a.hair === 1 && <path d="M20 25c0-10 6-14 12-14s12 4 12 14c-2-6-5-8-12-8s-10 2-12 8z" fill={hair} />}
      {a.hair === 2 && <path d="M19 27c-1-12 6-17 14-17 7 0 13 5 12 15-3-7-7-9-15-8-5 1-9 4-11 10z" fill={hair} />}
      {a.hair === 3 && <path d="M18 28c-3-12 5-19 14-19s17 7 14 19c-1-8-5-11-14-11s-13 3-14 11z" fill={hair} stroke={hair} strokeWidth="3" strokeDasharray="1 3" strokeLinecap="round" />}
      {a.hair === 4 && <path d="M18 40c-3-18 4-30 14-30s17 12 14 30c-1-14-4-22-14-22s-13 8-14 22z" fill={hair} />}
      {a.beard === 1 && <path d="M21 31c1 9 5 11 11 11s10-2 11-11c-2 4-5 5-11 5s-9-1-11-5z" fill={hair} opacity=".85" />}
      {a.beard === 2 && <path d="M27 34h10v2H27z" fill={hair} />}
      <circle cx="27" cy="27" r="1.4" fill="#1a1a1a" /><circle cx="37" cy="27" r="1.4" fill="#1a1a1a" /><path d="M28 33q4 2.5 8 0" stroke="#7a4b3a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {a.glasses && <g fill="none" stroke="#111" strokeWidth="1.4"><rect x="22" y="23.5" width="8.5" height="6.5" rx="2" /><rect x="33.5" y="23.5" width="8.5" height="6.5" rx="2" /><path d="M30.5 26h3" /></g>}
    </svg>
  )
}
export function Face({ p, size = 40 }: { p: Player; club?: Club; size?: number }) {
  return <img src={PLAYER_PHOTO} alt={p.name} width={size} height={size} style={{ width: size, height: size, flex: 'none', borderRadius: size > 60 ? 14 : '50%', objectFit: 'cover', objectPosition: 'center 18%' }} />
}
export function ManagerFace({ a, size = 48 }: { a: Avatar; size?: number }) { return <FaceSvg a={a} shirt={SUITS[a.suit % 6]} trim="#e8ecf2" size={size} /> }

// ---------- formato ----------
// números como se escriben en la Argentina: coma decimal y punto de miles ("US$ 2,4 M", "1.250 mil", "xG 0,85")
const NF = new Map<string, Intl.NumberFormat>()
const nf = (min: number, max: number) => { const k = `${min}:${max}`; let f = NF.get(k); if (!f) NF.set(k, (f = new Intl.NumberFormat('es-AR', { minimumFractionDigits: min, maximumFractionDigits: max }))); return f }
/** Número con `d` decimales fijos (por defecto ninguno), coma decimal y punto de miles: `dec(0.853, 2)` → "0,85". */
export const dec = (v: number, d = 0) => nf(d, d).format(v)
/** Plata: millones con hasta dos decimales (uno desde los diez millones), sin ceros de más: "US$ 3 M", "US$ 2,45 M", "US$ 850 mil". */
export const money = (v: number) => {
  const a = Math.abs(v)
  if (a < 1e6 && Math.round(a / 1000) < 1000) return `US$ ${nf(0, 0).format(Math.round(v / 1000))} mil`
  return `US$ ${nf(0, a >= 1e7 ? 1 : 2).format(v / 1e6)} M`
}
export const avgRat = (s: SeasonStats) => (s.apps + s.subs ? dec(s.ratSum / (s.apps + s.subs), 2) : '–')
export const ratClass = (r: number) => (r >= 7.5 ? 'good' : r < 6 ? 'bad' : '')
export const attrClass = (v: number) => (v >= 16 ? 'a-top' : v >= 13 ? 'a-hi' : v >= 9 ? 'a-mid' : 'a-lo')
export const resultText = (f: Fixture) => `${f.hg}-${f.ag}${f.pens ? ` (${f.pens[0]}-${f.pens[1]} p)` : ''}`
export function Ovr({ v }: { v: number }) { const r = Math.round(v); return <span className={`ovr ${r >= 80 ? 't5' : r >= 72 ? 't4' : r >= 64 ? 't3' : r >= 56 ? 't2' : 't1'}`}>{r}</span> }
/** La valoración que conoce el DT, para ordenar: la exacta si la sabe, si no el punto medio del rango que muestra `Val` (como `PlayerTable`). */
export const seenRating = (g: Game, p: Player) => { const r = shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99); return (r[0] + r[1]) / 2 }
/** Valoración que se ve de un jugador: exacta si es tuyo o lo conocés bien, un rango si no. */
export function Val({ p }: { p: Player }) {
  const { g } = useGame()
  const v = Math.round(bestRating(p)), r = shown(g, p, v, 9, 99, 1, 99)
  if (r[0] === r[1]) return <Ovr v={v} />
  return <span className={`ovr t1`} style={{ fontSize: '.9rem', background: 'var(--panel3)', color: 'var(--text)' }} title="Rango estimado: mandalo a ojear para conocerlo mejor">{fmtRange(r)}</span>
}
export function PosPill({ p }: { p: Player }) { return <span className={`pill ${p.line}`}>{POS_LABEL[p.positions[0]]}</span> }
export function Cond({ v }: { v: number }) {
  const c = v >= 85 ? 'var(--good)' : v >= 65 ? 'var(--warn)' : 'var(--bad)'
  return <div className="row" style={{ gap: 6 }}><div className="bar" style={{ width: 40 }}><i style={{ width: `${v}%`, background: c }} /></div><span className="num dim sm">{Math.round(v)}</span></div>
}
export function Status({ p }: { p: Player }) {
  return (<>
    {p.injury && <span className="chip bad" title={`${p.injury.desc} · ${p.injury.days} días`}>✚ {p.injury.days} d</span>}
    {p.susp > 0 && <span className="chip warn" title="Suspendido">Susp. {p.susp}</span>}
    {p.listed && <span className="chip">Transferible</span>}{p.loanFrom != null && <span className="chip">Préstamo</span>}
    {p.wantsOut ? <span className="chip bad">Quiere irse</span> : p.status && (p.happy ?? 70) < 35 ? <span className="chip warn">Molesto</span> : null}
    {p.promise && <span className="chip acc" title={`Promesa de minutos hasta el ${fmtDate(p.promise.until)}`}>Promesa</span>}
  </>)
}
export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const uid = useId()
  // el nombre de la ventana es su primer título: aria-labelledby apunta a él
  useEffect(() => {
    const el = box.current, h = el?.querySelector<HTMLElement>('h1, h2, h3, h4')
    if (!el) return
    if (h) { h.id ||= `${uid}t`; el.setAttribute('aria-labelledby', h.id) } else el.removeAttribute('aria-labelledby')
  })
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = box.current
    const items = () => [...(el?.querySelectorAll<HTMLElement>('button:not(:disabled), select, input, textarea, [tabindex]:not([tabindex="-1"])') ?? [])]
    ;(items()[0] ?? el)?.focus()
    const key = (e: KeyboardEvent) => {
      if (!el || !el.isConnected || el !== [...document.querySelectorAll('.modal')].pop()) return // solo la ventana de más arriba
      if (e.key === 'Escape') { e.preventDefault(); close.current() }
      else if (e.key === 'Tab') {
        const it = items(); if (!it.length) return
        const first = it[0], last = it[it.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); prev?.focus?.() }
  }, [])
  return <div className="modal-bg" onClick={onClose}><div ref={box} className="modal" role="dialog" aria-modal="true" tabIndex={-1} style={wide ? { width: 'min(1120px, 100%)' } : undefined} onClick={e => e.stopPropagation()}>{children}</div></div>
}
/** Control segmentado: la opción elegida lleva ✓ (por CSS) y aria-pressed. */
export function Seg({ value, options, onChange, label }: { value: number; options: string[]; onChange: (v: number) => void; label?: string }) {
  return <div className="seg" role="group" aria-label={label}>{options.map((o, i) => <button key={o} className={i === value ? 'on' : ''} aria-pressed={i === value} onClick={() => onChange(i)}>{o}</button>)}</div>
}

// ---------- gráficos ----------
export function Radar({ values, labels, size = 220 }: { values: number[]; labels: string[]; size?: number }) {
  const n = values.length, c = size / 2, R = size / 2 - 48
  const pt = (i: number, r: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * r, c + Math.sin(a) * r] }
  const poly = (f: (i: number) => number) => values.map((_, i) => pt(i, f(i)).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%' }}>
      {[0.25, 0.5, 0.75, 1].map(k => <polygon key={k} points={poly(() => R * k)} fill="none" stroke="var(--line)" />)}
      {values.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" /> })}
      <polygon points={poly(i => (R * Math.min(20, values[i])) / 20)} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
      {labels.map((l, i) => { const [x, y] = pt(i, R + 18); return <text key={l} x={x} y={y} fill="var(--dim)" fontSize="10.5" textAnchor="middle" dominantBaseline="middle">{l} <tspan fill="var(--text)" fontWeight="700">{values[i].toFixed(0)}</tspan></text> })}
    </svg>
  )
}
const av = (p: Player, ks: Attr[]) => ks.reduce((s, k) => s + p.attrs[A[k]], 0) / ks.length
export function radarOf(p: Player): { values: number[]; labels: string[] } {
  return p.line === 'GK'
    ? { labels: ['Atajadas', 'Mano a mano', 'Aéreo', 'Saque', 'Colocación', 'Mental'], values: [av(p, ['han', 'ref']), av(p, ['one']), av(p, ['aer', 'jmp']), av(p, ['kic', 'pas']), av(p, ['pos', 'dec']), av(p, ['com', 'lea'])] }
    : { labels: ['Definición', 'Técnica', 'Creación', 'Defensa', 'Físico', 'Mental'], values: [av(p, ['fin', 'otb', 'lsh']), av(p, ['dri', 'fto', 'cro']), av(p, ['pas', 'vis', 'dec']), av(p, ['tck', 'mar', 'pos', 'hea']), av(p, ['pac', 'acc', 'sta', 'str']), av(p, ['com', 'wor', 'lea'])] }
}
export function Spark({ values, w = 120, h = 34, min = 4, max = 10 }: { values: number[]; w?: number; h?: number; min?: number; max?: number }) {
  if (values.length < 2) return <span className="dim sm">Sin datos</span>
  const x = (i: number) => 4 + (i * (w - 8)) / (values.length - 1), y = (v: number) => h - 4 - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (h - 8)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 3.5 : 2} fill={i === values.length - 1 ? 'var(--accent)' : 'var(--panel)'} stroke="var(--accent)" />)}
    </svg>
  )
}
export function Gauge({ v, label }: { v: number; label: string }) {
  const col = v >= 60 ? 'var(--good)' : v >= 30 ? 'var(--warn)' : 'var(--bad)', L = Math.PI * 44
  return (
    <svg width="130" height="80" viewBox="0 0 110 66">
      <path d="M11 58a44 44 0 0 1 88 0" fill="none" stroke="var(--panel3)" strokeWidth="9" strokeLinecap="round" />
      <path d="M11 58a44 44 0 0 1 88 0" fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(L * v) / 100} ${L}`} />
      <text x="55" y="50" textAnchor="middle" fill="var(--text)" fontFamily="var(--display)" fontWeight="700" fontSize="24">{Math.round(v)}</text>
      <text x="55" y="64" textAnchor="middle" fill="var(--dim)" fontSize="8">{label}</text>
    </svg>
  )
}
export function ShotMap({ shots, colors }: { shots: Shot[]; colors: [string, string] }) {
  const W = 340, H = 210
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', borderRadius: 10, background: '#124a34' }}>
      <g fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1.5">
        <rect x="6" y="6" width={W - 12} height={H - 12} /><line x1={W / 2} y1="6" x2={W / 2} y2={H - 6} /><circle cx={W / 2} cy={H / 2} r="26" />
        <rect x="6" y={H / 2 - 52} width="50" height="104" /><rect x={W - 56} y={H / 2 - 52} width="50" height="104" /><rect x="6" y={H / 2 - 24} width="18" height="48" /><rect x={W - 24} y={H / 2 - 24} width="18" height="48" />
      </g>
      {shots.map((s, i) => {
        const d = 6 + (s.y / 52.5) * (W / 2 - 6), x = s.side === 0 ? W - d : d, y = 6 + (s.x / 100) * (H - 12), r = 3 + Math.sqrt(s.xg) * 13
        const goal = s.out === 'goal'
        return <circle key={i} cx={x} cy={y} r={r} fill={goal ? colors[s.side] : 'transparent'} stroke={goal ? '#fff' : colors[s.side]} strokeWidth={goal ? 2 : 1.6} opacity={goal ? 1 : s.out === 'saved' ? 0.95 : 0.55}><title>{`${s.min}' · xG ${dec(s.xg, 2)} · ${{ goal: 'Gol', saved: 'Atajado', off: 'Afuera', block: 'Bloqueado', post: 'Palo' }[s.out]}`}</title></circle>
      })}
    </svg>
  )
}
export function Momentum({ shots, colors, upTo = 90 }: { shots: Shot[]; colors: [string, string]; upTo?: number }) {
  const n = Math.ceil(Math.max(90, upTo) / 5), b = Array.from({ length: n }, () => [0, 0])
  for (const s of shots) b[Math.min(n - 1, Math.floor((s.min - 1) / 5))][s.side] += s.xg + (s.out === 'goal' ? 0.25 : 0)
  const W = 340, H = 76, bw = W / n, k = 62
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line)" /><line x1={W / 2} y1="4" x2={W / 2} y2={H - 4} stroke="var(--line)" strokeDasharray="3 3" />
      {b.map((v, i) => <g key={i}>
        <rect x={i * bw + 2} y={H / 2 - Math.min(H / 2 - 2, v[0] * k)} width={bw - 4} height={Math.min(H / 2 - 2, v[0] * k)} rx="2" fill={colors[0]} />
        <rect x={i * bw + 2} y={H / 2} width={bw - 4} height={Math.min(H / 2 - 2, v[1] * k)} rx="2" fill={colors[1]} /></g>)}
      {shots.filter(s => s.out === 'goal').map((s, i) => <circle key={i} cx={Math.min(W - 5, ((s.min - 0.5) / (n * 5)) * W)} cy={s.side === 0 ? 6 : H - 6} r="4" fill="#fff" stroke={colors[s.side]} strokeWidth="2" />)}
    </svg>
  )
}
/** Colores distinguibles para local y visitante sobre fondo oscuro. */
export function duoColors(h: Club, a: Club): [string, string] {
  const pick = (c: Club) => { const x = sat(c.colors[0]) > 50 || lum(c.colors[0]) > 200 ? c.colors[0] : c.colors[1]; return lum(x) < 70 ? mix(x, 0.45) : x }
  const x = pick(h); let y = pick(a)
  const d = rgb(x).reduce((s, v, i) => s + Math.abs(v - rgb(y)[i]), 0)
  if (d < 120) y = lum(a.colors[1]) > 60 && a.colors[1] !== x ? a.colors[1] : '#f2f4f7'
  return [x, y]
}

// ---------- ficha del jugador ----------
/** Análisis del partido: por dónde atacó cada uno, dónde perdió la pelota y quién ganó los duelos. */
export function Analysis({ g, f, cols }: { g: Game; f: Fixture; cols: [string, string] }) {
  const an = f.analysis!, max = Math.max(0.3, ...an[0].xg, ...an[1].xg)
  const Bar = ({ v, c }: { v: number; c: string }) => <div className="bar" style={{ flex: 1 }}><i style={{ width: `${(v / max) * 100}%`, background: c }} /></div>
  const duels = ([0, 1] as const).flatMap(si => Object.entries(an[si].duels).map(([pid, d]) => ({ si, pid: Number(pid), w: d[0], l: d[1] }))).filter(d => g.players[d.pid] && d.w + d.l >= 3)
  const top = [...duels].sort((a, b) => (b.w - b.l) - (a.w - a.l)).slice(0, 3), bottom = [...duels].sort((a, b) => (b.l - b.w) - (a.l - a.w)).slice(0, 3)
  const D = (d: typeof duels[0]) => <div key={`${d.si}-${d.pid}`} className="row between sm"><span className="ell"><span style={{ color: cols[d.si] }}>●</span> {g.players[d.pid].name}</span><b className="num">{d.w} ganados · {d.l} perdidos</b></div>
  return (<>
    <h3>Peligro por sector (xG)</h3>
    {(['Izquierda', 'Centro', 'Derecha'] as const).map((n, k) => (
      <div key={n} className="row sm" style={{ gap: 8 }}><span className="dim" style={{ width: 70 }}>{n}</span>
        <Bar v={an[0].xg[k]} c={cols[0]} /><b className="num" style={{ width: 34 }}>{dec(an[0].xg[k], 2)}</b>
        <Bar v={an[1].xg[k]} c={cols[1]} /><b className="num" style={{ width: 34 }}>{dec(an[1].xg[k], 2)}</b></div>))}
    <div className="dim sm">Cada sector visto desde el ataque de cada equipo: la izquierda de uno es la derecha del otro.</div>
    <h3>Dónde se perdió la pelota</h3>
    {([0, 1] as const).map(si => <div key={si} className="row between sm"><span style={{ color: cols[si] }}>● {g.clubs[si === 0 ? f.home : f.away].short}</span><span className="num">salida {an[si].lost[0]} · elaboración {an[si].lost[1]} · último tercio {an[si].lost[2]}</span></div>)}
    {duels.length > 0 && <><h3>Duelos</h3><div className="dim sm">Los que más ganaron</div>{top.map(D)}<div className="dim sm" style={{ marginTop: 4 }}>Los que más perdieron</div>{bottom.map(D)}</>}
  </>)
}

export function MatchReport({ g, f, onClose }: { g: Game; f: Fixture; onClose: () => void }) {
  return <Modal onClose={onClose}><ReportBody g={g} f={f} /><div className="right" style={{ marginTop: 14 }}><button className="btn" onClick={onClose}>Cerrar</button></div></Modal>
}
/** Contenido del informe de un partido jugado (sin la ventana). */
export function ReportBody({ g, f }: { g: Game; f: Fixture }) {
  const h = g.clubs[f.home], a = g.clubs[f.away], s = f.stats, cols = duoColors(h, a)
  const rows: [string, (i: 0 | 1) => string | number][] = s ? [
    ['Posesión', i => `${s.poss[i]}%`], ['Remates', i => s.shots[i]], ['Al arco', i => s.sot[i]], ['xG', i => dec(s.xg[i], 2)],
    ['Pases', i => `${s.passes[i]} (${Math.round((s.passOk[i] / Math.max(1, s.passes[i])) * 100)}%)`], ['Córners', i => s.corners[i]],
    ['Faltas', i => s.fouls[i]], ['Offsides', i => s.offs[i]], ['Amarillas', i => s.yc[i]], ['Rojas', i => s.rc[i]],
  ] : []
  return (
    <div>
      <div className="dim center sm">{g.comps[f.comp]?.name} · {f.stage} · {fmtDate(f.date)}{f.att ? ` · ${dec(f.att)} espectadores` : ''}</div>
      <div className="row" style={{ justifyContent: 'center', gap: 22, margin: '10px 0 16px' }}>
        <div className="row grow" style={{ justifyContent: 'flex-end' }}><b>{h.name}</b><Badge club={h} size={48} /></div><div className="score" style={{ fontSize: '3rem' }}>{resultText(f)}</div><div className="row grow"><Badge club={a} size={48} /><b>{a.name}</b></div>
      </div>
      <div className="grid2">
        <div className="col"><h3>Incidencias</h3>
          <div className="col" style={{ gap: 5 }}>{(f.events ?? []).filter(e => !['save', 'chance', 'post'].includes(e.type)).map((e, i) => <div key={i} className={`ev ${e.type.includes('goal') ? 'goal' : e.type}`}><span className="num dim">{e.min}'</span><span>{e.text}</span></div>)}</div>
          {f.shots && <><h3>Mapa de remates</h3><ShotMap shots={f.shots} colors={cols} /><h3>Dominio del partido</h3><Momentum shots={f.shots} colors={cols} /></>}
          {f.analysis && <Analysis g={g} f={f} cols={cols} />}</div>
        <div className="col"><h3>Estadísticas</h3>
          <div>{rows.map(([l, fn]) => <div key={l} className="statrow"><b className="num">{fn(0)}</b><span className="lbl">{l}</span><b className="num right">{fn(1)}</b></div>)}</div>
          {f.lines && <><h3>Puntajes</h3>
            <div className="grid2" style={{ gap: 12 }}>{([0, 1] as const).map(si => <div key={si}>{f.lines!.filter(l => l.side === si).map(l => (
              <div key={l.pid} className="row between sm" style={{ padding: '2px 0' }}>
                <span data-pid={g.players[l.pid] ? l.pid : undefined} className={`ell ${l.started ? '' : 'dim'}`}>{g.players[l.pid]?.name ?? 'Jugador'}{l.goals ? ` ⚽${l.goals > 1 ? l.goals : ''}` : ''}</span><b className={`num ${ratClass(l.rating)}`}>{dec(l.rating, 1)}</b></div>))}</div>)}</div></>}
        </div>
      </div>
    </div>
  )
}
