import { useState, type ReactNode } from 'react'
import crestsJson from '../data/crests.json'
import { PLAYER_PHOTO } from '../data/playerPhoto'
import { askingPrice, doTransfer, evaluateBid, wageDemand, windowOpen } from '../engine/career'
import { STATUS, fmtRange, knowOf, minutesShare, persLabels, scout, shown } from '../engine/squad'
import { NegotiationModal, TalkModal } from './Locker'
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
export const ink = (hex: string) => (lum(hex) > 150 ? '#0b0f14' : '#ffffff')
/** Variables de tema a partir de los colores del club. */
export function clubTheme(c: { colors: [string, string] }): Record<string, string> {
  let a = sat(c.colors[0]) > 50 ? c.colors[0] : sat(c.colors[1]) > 50 ? c.colors[1] : '#3ddc97'
  if (lum(a) < 95) a = mix(a, lum(a) < 60 ? 0.45 : 0.28)
  const [r, g, b] = rgb(a)
  const soft = (h: string, o: number) => { const [x, y, z] = rgb(h); return `rgba(${x}, ${y}, ${z}, ${o})` }
  return { '--accent': a, '--accent-ink': ink(a), '--accent-soft': `rgba(${r}, ${g}, ${b}, .14)`, '--c1a': soft(c.colors[0], lum(c.colors[0]) > 200 ? 0.1 : 0.34), '--c2a': soft(c.colors[1], lum(c.colors[1]) > 200 ? 0.08 : 0.26) }
}

// ---------- identidad ----------
export function Badge({ club, size = 28 }: { club: ClubLike; size?: number }) {
  const src = club.id != null ? CRESTS[club.id] : undefined
  if (src) return <img className="crest" src={src} alt={club.short} title={club.short} width={size} height={size} style={{ width: size, height: size }} />
  const [a, b] = club.colors
  return <span className="badge" title={club.short} style={{ width: size, height: size, background: a, borderColor: b, color: ink(a), fontSize: size * 0.3 }}>{(club.code ?? club.short).slice(0, 3).toUpperCase()}</span>
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
export const money = (v: number) => (Math.abs(v) >= 1e6 ? `US$ ${(v / 1e6).toFixed(Math.abs(v) >= 1e7 ? 1 : 2)} M` : `US$ ${Math.round(v / 1000)} mil`)
export const avgRat = (s: SeasonStats) => (s.apps + s.subs ? (s.ratSum / (s.apps + s.subs)).toFixed(2) : '–')
export const ratClass = (r: number) => (r >= 7.5 ? 'good' : r < 6 ? 'bad' : '')
export const attrClass = (v: number) => (v >= 16 ? 'a-top' : v >= 13 ? 'a-hi' : v >= 9 ? 'a-mid' : 'a-lo')
export const resultText = (f: Fixture) => `${f.hg}-${f.ag}${f.pens ? ` (${f.pens[0]}-${f.pens[1]} p)` : ''}`
export function Ovr({ v }: { v: number }) { const r = Math.round(v); return <span className={`ovr ${r >= 80 ? 't5' : r >= 72 ? 't4' : r >= 64 ? 't3' : r >= 56 ? 't2' : 't1'}`}>{r}</span> }
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
  return <div className="modal-bg" onClick={onClose}><div className="modal" style={wide ? { width: 'min(1120px, 100%)' } : undefined} onClick={e => e.stopPropagation()}>{children}</div></div>
}
export function Seg({ value, options, onChange }: { value: number; options: string[]; onChange: (v: number) => void }) {
  return <div className="seg">{options.map((o, i) => <button key={o} className={i === value ? 'on' : ''} onClick={() => onChange(i)}>{o}</button>)}</div>
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
        return <circle key={i} cx={x} cy={y} r={r} fill={goal ? colors[s.side] : 'transparent'} stroke={goal ? '#fff' : colors[s.side]} strokeWidth={goal ? 2 : 1.6} opacity={goal ? 1 : s.out === 'saved' ? 0.95 : 0.55}><title>{`${s.min}' · xG ${s.xg.toFixed(2)} · ${{ goal: 'Gol', saved: 'Atajado', off: 'Afuera', block: 'Bloqueado', post: 'Palo' }[s.out]}`}</title></circle>
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
function StatLine({ s, label }: { s: SeasonStats; label: string }) {
  return (
    <tr><td>{label}</td><td className="r num">{s.apps}{s.subs ? ` (${s.subs})` : ''}</td><td className="r num">{s.mins}</td><td className="r num">{s.goals}</td>
      <td className="r num">{s.ast}</td><td className="r num">{s.yc}</td><td className="r num">{s.rc}</td><td className="r num">{s.motm}</td><td className="r num">{avgRat(s)}</td></tr>
  )
}
export function PlayerModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { g, refresh, save } = useGame()
  const p = g.players[id]
  const [fee, setFee] = useState(() => (p ? askingPrice(g, p) : 0))
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [neg, setNeg] = useState<null | { mode: 'buy' | 'renew'; fee: number }>(null)
  const [talkOpen, setTalkOpen] = useState(false)
  if (!p) return null
  const c = g.clubs[p.clubId], mine = p.clubId === g.userClubId, me = g.clubs[g.userClubId]
  const k = knowOf(g, p), known = k >= 100
  const est = p.attrs.map((v, i) => shown(g, p, v, 5, i))
  const rd = radarOf(known ? p : { ...p, attrs: est.map(r => (r[0] + r[1]) / 2) }), age = ageOn(p.birth, g.date), open = windowOpen(g.date)
  const gap = p.pa - p.ca, potKnown = mine ? sab(g, 'youth') + sab(g, 'asst') >= 18 || age > 23 : k >= 70
  const potTxt = age > 26 ? 'Ya alcanzó su techo' : p.pa >= 85 ? 'Futura figura' : p.pa >= 78 ? 'Muy buen potencial' : gap >= 8 ? 'Buen potencial' : 'Potencial limitado'
  const starred = g.shortlist.includes(p.id)
  const done = () => { save(); refresh() }
  const bid = (loan: boolean) => {
    const r = evaluateBid(g, p, fee, loan)
    if (r.ok && !loan) { setMsg({ t: `${g.clubs[p.clubId].name} aceptó ${money(fee)}${p.clause && fee >= p.clause ? ' (pagaste la cláusula)' : ''}. Ahora hay que arreglar con el jugador.`, ok: true }); setNeg({ mode: 'buy', fee }); return }
    if (r.ok) { doTransfer(g, p, me.id, fee, loan); setMsg({ t: `${p.name} llega a préstamo hasta fin de temporada.`, ok: true }); done() }
    else { setMsg({ t: `${r.reason}${r.counter ? ` Aceptarían ${money(r.counter)}.` : ''}`, ok: false }); if (r.counter) setFee(r.counter) }
  }
  return (
    <Modal onClose={onClose} wide>
      <div className="hero" style={{ ...(clubTheme(c) as object), marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 16 }}>
          <Face p={p} club={c} size={84} />
          <div className="grow">
            <div className="row wrap" style={{ gap: 8 }}><PosPill p={p} /><Status p={p} />{p.gen && <span className="chip">Inferiores</span>}</div>
            <h1 style={{ fontSize: '2.3rem', marginTop: 6 }}>{p.name}</h1>
            <div className="row dim wrap" style={{ marginTop: 4 }}><Badge club={c} size={22} /><span>{c.name} · N.º {p.num} · {age} años · {p.nat} · pie {p.foot === 'D' ? 'derecho' : p.foot === 'I' ? 'izquierdo' : 'ambidiestro'}</span></div>
          </div>
          <div className="kpi center"><h3>Valoración</h3><span className="big" style={{ fontSize: known ? '3.2rem' : '2.4rem' }}>{fmtRange(shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99))}</span>{!known && <span className="dim sm">Conocimiento {Math.round(k)}%</span>}</div>
          <div className="col" style={{ gap: 6 }}>
            <button className="btn sm" onClick={onClose}>Cerrar ✕</button>
            {!mine && <button className={`btn sm ${starred ? 'on' : ''}`} onClick={() => { g.shortlist = starred ? g.shortlist.filter(x => x !== p.id) : [...g.shortlist, p.id]; done() }}>{starred ? '★ En seguimiento' : '☆ Seguir'}</button>}
            {!mine && !known && <button className={`btn sm ${g.scouting.includes(p.id) ? 'on' : ''}`} disabled={g.scouting.includes(p.id)} title="El scouting lo sigue unos días hasta conocerlo por completo" onClick={() => { scout(g, p); done() }}>{g.scouting.includes(p.id) ? 'Ojeándolo…' : 'Mandar a ojear'}</button>}
            {mine && <button className="btn sm" onClick={() => setTalkOpen(true)}>Hablar</button>}
          </div>
        </div>
      </div>
      <div className="dash">
        <div className="card s4 col center" style={{ alignItems: 'center' }}><h3>Perfil</h3><Radar values={rd.values} labels={rd.labels} />
          <div className="row wrap" style={{ justifyContent: 'center', gap: 5 }}>{p.positions.map(x => <span key={x} className="chip acc" title={POS_NAME[x]}>{POS_LABEL[x]} {fmtRange(shown(g, p, Math.round(posRating(p, x)), 9, 50, 1, 99))}</span>)}</div>
          <div className="sm">{potKnown ? <b>{potTxt}</b> : <span className="dim">Potencial desconocido</span>}</div></div>
        <div className="card s8">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {ATTR_GROUPS.filter(gr => (gr.name === 'Arquero') === (p.line === 'GK') || gr.name === 'Mentales' || gr.name === 'Físicos').map(gr => (
              <div key={gr.name}><h3 style={{ marginBottom: 6 }}>{gr.name}</h3>
                {gr.attrs.map(a => { const r = est[A[a]]; return <div key={a} className="attr"><span className="dim sm">{ATTR_LABEL[a]}</span><span className={`v ${attrClass((r[0] + r[1]) / 2)}`} style={r[0] !== r[1] ? { width: 'auto', minWidth: 46, padding: '1px 6px', whiteSpace: 'nowrap' } : undefined}>{fmtRange(r)}</span></div> })}</div>))}
          </div>
          {!known && <div className="dim sm" style={{ marginTop: 8 }}>Lo que sabés de él es aproximado. Mandalo a ojear o enfrentalo para conocerlo mejor.</div>}
        </div>
        <div className="card s4 col"><h3>Estado</h3>
          <div className="row between"><span className="dim">Físico</span><Cond v={p.cond} /></div><div className="row between"><span className="dim">Moral</span><Cond v={p.morale} /></div>
          <div className="row between"><span className="dim">Últimos puntajes</span><Spark values={p.form} /></div>
          {p.injury && <div className="bad sm">Lesión: {p.injury.desc} ({p.injury.days} días).</div>}
          <div className="row between"><span className="dim">Personalidad</span><span className="sm right">{mine || k >= 60 ? persLabels(p).join(' · ') : 'Desconocida'}</span></div>
          {mine && p.status && <><div className="row between"><span className="dim">Rol</span><b>{STATUS[p.status].name}</b></div>
            <div className="row between"><span className="dim">Minutos</span><span className="sm">{Math.round(minutesShare(p) * 100)} % (espera {Math.round(STATUS[p.status].share * 100)} %)</span></div>
            <div className="row between"><span className="dim">Conformidad</span><Cond v={p.happy ?? 70} /></div></>}</div>
        <div className="card s4 col"><h3>Contrato</h3>
          <div className="row between"><span className="dim">Valor de mercado</span><b>{money(p.value)}</b></div><div className="row between"><span className="dim">Sueldo mensual</span><b>{money(p.wage)}</b></div>
          <div className="row between"><span className="dim">Vence</span><b className={p.contractEnd <= g.season ? 'warn' : ''}>dic {p.contractEnd}</b></div>
          {p.clause ? <div className="row between"><span className="dim">Cláusula de rescisión</span><b>{money(p.clause)}</b></div> : null}
          {mine && <div className="row wrap">
            <button className="btn sm" disabled={!!p.negBlock && g.date < p.negBlock} title={p.negBlock && g.date < p.negBlock ? `No quiere negociar hasta el ${fmtDate(p.negBlock)}` : ''} onClick={() => setNeg({ mode: 'renew', fee: 0 })}>Negociar renovación</button>
            <button className={`btn sm ${p.listed ? 'on' : ''}`} onClick={() => { p.listed = !p.listed; done() }}>{p.listed ? 'Quitar de transferibles' : 'Declarar transferible'}</button></div>}</div>
        <div className="card s4 col"><h3>{mine ? 'Mercado' : 'Negociar'}</h3>
          {mine ? <div className="dim sm" style={{ lineHeight: 1.5 }}>Pedido estimado: <b style={{ color: 'var(--text)' }}>{money(askingPrice(g, p))}</b>. Si lo declarás transferible van a llegar más ofertas, por menos plata.</div> : (<>
            <div className="dim sm">Cobraría alrededor de {money(wageDemand(g, p, me))}/mes · Tu presupuesto: <b style={{ color: 'var(--text)' }}>{money(me.budget)}</b>{p.clause ? <> · Cláusula: <b style={{ color: 'var(--text)' }}>{money(p.clause)}</b></> : null}</div>
            <label className="f">Oferta (US$)<input type="number" step={10000} min={0} value={fee} onChange={e => setFee(Number(e.target.value))} /></label>
            <div className="row wrap"><button className="btn primary sm" disabled={!open} onClick={() => bid(false)}>Ofertar compra</button><button className="btn sm" disabled={!open} onClick={() => bid(true)}>Pedir préstamo</button></div>
            {!open && <div className="warn sm">El libro de pases está cerrado.</div>}</>)}
          {msg && <div className={`sm ${msg.ok ? 'good' : 'warn'}`} style={{ lineHeight: 1.45 }}>{msg.t}</div>}</div>
        <div className="card s12 scroll-x"><h3 style={{ marginBottom: 6 }}>Estadísticas</h3>
          <table><thead><tr><th>Temporada</th><th className="r">PJ</th><th className="r">Min</th><th className="r">Goles</th><th className="r">Asist</th><th className="r">Am</th><th className="r">Roj</th><th className="r">Fig</th><th className="r">Prom</th></tr></thead>
            <tbody><StatLine s={p.stats} label={`${g.season} · ${c.short}`} />{[...p.history].reverse().map(h => <StatLine key={h.season} s={h.stats} label={`${h.season} · ${g.clubs[h.clubId]?.short ?? ''}`} />)}</tbody></table></div>
      </div>
      {neg && <NegotiationModal p={p} mode={neg.mode} fee={neg.fee} onClose={m => { setNeg(null); if (m) setMsg({ t: m, ok: !/cay|termina/.test(m) }); done() }} />}
      {talkOpen && <TalkModal p={p} onClose={() => { setTalkOpen(false); done() }} />}
    </Modal>
  )
}

export function MatchReport({ g, f, onClose }: { g: Game; f: Fixture; onClose: () => void }) {
  const h = g.clubs[f.home], a = g.clubs[f.away], s = f.stats, cols = duoColors(h, a)
  const rows: [string, (i: 0 | 1) => string | number][] = s ? [
    ['Posesión', i => `${s.poss[i]}%`], ['Remates', i => s.shots[i]], ['Al arco', i => s.sot[i]], ['xG', i => s.xg[i].toFixed(2)],
    ['Pases', i => `${s.passes[i]} (${Math.round((s.passOk[i] / Math.max(1, s.passes[i])) * 100)}%)`], ['Córners', i => s.corners[i]],
    ['Faltas', i => s.fouls[i]], ['Offsides', i => s.offs[i]], ['Amarillas', i => s.yc[i]], ['Rojas', i => s.rc[i]],
  ] : []
  return (
    <Modal onClose={onClose}>
      <div className="dim center sm">{g.comps[f.comp]?.name} · {f.stage} · {fmtDate(f.date)}{f.att ? ` · ${f.att.toLocaleString('es-AR')} espectadores` : ''}</div>
      <div className="row" style={{ justifyContent: 'center', gap: 22, margin: '10px 0 16px' }}>
        <div className="row grow" style={{ justifyContent: 'flex-end' }}><b>{h.name}</b><Badge club={h} size={48} /></div><div className="score" style={{ fontSize: '3rem' }}>{resultText(f)}</div><div className="row grow"><Badge club={a} size={48} /><b>{a.name}</b></div>
      </div>
      <div className="grid2">
        <div className="col"><h3>Incidencias</h3>
          <div className="col" style={{ gap: 5 }}>{(f.events ?? []).filter(e => !['save', 'chance', 'post'].includes(e.type)).map((e, i) => <div key={i} className={`ev ${e.type.includes('goal') ? 'goal' : e.type}`}><span className="num dim">{e.min}'</span><span>{e.text}</span></div>)}</div>
          {f.shots && <><h3>Mapa de remates</h3><ShotMap shots={f.shots} colors={cols} /><h3>Dominio del partido</h3><Momentum shots={f.shots} colors={cols} /></>}</div>
        <div className="col"><h3>Estadísticas</h3>
          <div>{rows.map(([l, fn]) => <div key={l} className="statrow"><b className="num">{fn(0)}</b><span className="lbl">{l}</span><b className="num right">{fn(1)}</b></div>)}</div>
          {f.lines && <><h3>Puntajes</h3>
            <div className="grid2" style={{ gap: 12 }}>{([0, 1] as const).map(si => <div key={si}>{f.lines!.filter(l => l.side === si).map(l => (
              <div key={l.pid} className="row between sm" style={{ padding: '2px 0' }}>
                <span className={`ell ${l.started ? '' : 'dim'}`}>{g.players[l.pid]?.name ?? 'Jugador'}{l.goals ? ` ⚽${l.goals > 1 ? l.goals : ''}` : ''}</span><b className={`num ${ratClass(l.rating)}`}>{l.rating.toFixed(1)}</b></div>))}</div>)}</div></>}
        </div>
      </div>
      <div className="right" style={{ marginTop: 14 }}><button className="btn" onClick={onClose}>Cerrar</button></div>
    </Modal>
  )
}
