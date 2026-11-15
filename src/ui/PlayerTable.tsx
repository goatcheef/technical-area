// Tabla de jugadores única para todo el juego: vistas, columnas a elección, orden por varias columnas,
// filtros, selección múltiple con acciones y comparador. Se adapta al ancho sin desplazamiento horizontal.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as RKeyEvent, type ReactNode } from 'react'
import { askingPrice, bidBlock, canSell, committed, dealImpact, openDealFor } from '../engine/career'
import { fmtDay } from '../engine/game'
import { POS_LABEL, ageOn, bestRating } from '../engine/positions'
import { STATUS, demandWage, fmtRange, knowOf, knownRating, minutesOf, moodOf, moraleOf, moraleShown, persTraits, reserveOf, scout, setListed, setReserve, shown, talkState, toggleShortlist, wageShown, TRAIT_KEYS } from '../engine/squad'
import { ATTRS, ATTR_LABEL, type Attr, type Game, type Player } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Badge, Cond, Face, Modal, PosPill, Status, Val, avgRat, money, ratClass } from './common'
import { MI, StateChip, wr } from './deal'
import { MinsBar, MoodBar, MoraleBar, sdy } from './mood'

// ---------- columnas ----------
interface Col { l: string; n?: string; t?: string; w: number; r?: boolean; v: (p: Player, g: Game) => number | string; c: (p: Player, g: Game) => ReactNode }
const LINE_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 }
/** Monto compacto para tablas (el encabezado ya dice que es en dólares). */
const m$ = (v: number) => money(v).replace('US$ ', '')
const pj = (p: Player) => p.stats.apps + p.stats.subs
const rat = (p: Player) => (pj(p) ? p.stats.ratSum / pj(p) : 0)
/** Valor visible (punto medio del rango que se conoce): ordenar no revela lo que el ojeo todavía no sabe. */
const seen = (g: Game, p: Player, v: number, w: number, salt: number, lo = 1, hi = 20) => { const r = shown(g, p, v, w, salt, lo, hi); return (r[0] + r[1]) / 2 }
const valSeen = knownRating
/** Sueldo que se ve: exacto el de tus jugadores; de un ajeno, el rango de `wageShown` (nunca el número real). */
const wageOf = (g: Game, p: Player): [number, number] => (p.clubId === g.userClubId ? [p.wage, p.wage] : wageShown(g, p, p.wage, 401))
const dealRank = (g: Game, p: Player) => { const d = openDealFor(g, p.id); return d ? (d.state === 'agreed' ? 3 : d.state === 'countered' ? 2 : 1) : bidBlock(g, p.id) ? 0.5 : 0 }
function dealCell(g: Game, p: Player): ReactNode {
  if (p.clubId === g.userClubId) return <span className="dim">–</span>
  const d = openDealFor(g, p.id)
  if (d) return <StateChip d={d} />
  const b = bidBlock(g, p.id)
  if (b) return <span className="mk-st lock">{MI.lock}Bloqueado hasta {fmtDay(b.until)}</span>
  const last = (g.deals ?? []).filter(x => x.pid === p.id && x.side !== 'sell' && x.userClubId === g.userClubId).sort((a, b2) => b2.id - a.id)[0]
  if (last?.state === 'refused' && last.updated >= g.date.slice(0, 4)) return <span className="mk-st x">{MI.x}Sin acuerdo</span>
  return <span className="dim">–</span>
}
const potGap = (g: Game, p: Player) => (p.clubId === g.userClubId || (ageOn(p.birth, g.date) <= 23 && knowOf(g, p) >= 70) ? p.pa - p.ca : -1)
const stars = (gap: number) => (gap < 0 ? <span className="dim">–</span> : <span className={gap >= 12 ? 'good' : gap >= 6 ? '' : 'dim'}>{gap >= 12 ? '★★★' : gap >= 6 ? '★★' : '★'}</span>)

// ---------- vestuario ----------
const MOR_BAND = { high: 90, good: 70, ok: 47, low: 20 }
/** Moral para ordenar: la tuya exacta; la de un ajeno con el informe completo, por banda (no revela el número); sin informe, al final. */
const morSort = (g: Game, p: Player) => { const m = moraleShown(g, p); if (!m) return -1; if (m.value != null) return m.value; const w = m.word; return w === 'Muy alto' ? MOR_BAND.high : w === 'Bueno' ? MOR_BAND.good : w === 'Normal' ? MOR_BAND.ok : MOR_BAND.low }
/** Personalidad para ordenar: por banda en el orden fijo del motor y, a igual banda, por nombre; lo no visto va después de todas las bandas. */
const persSort = (g: Game, p: Player) => { const t = persTraits(g, p); if (t.level === 'none') return `~|${p.name}`; return `${TRAIT_KEYS.map(k => t.traits.find(x => x.key === k)?.band ?? 9).join('')}|${p.name}` }
function persCell(g: Game, p: Player): ReactNode {
  const t = persTraits(g, p)
  if (t.level === 'none') return <span className="dim">–</span>
  const marked = t.traits.filter(x => x.word !== 'Normal' && x.word !== 'Tranquilo')
  if (!marked.length) return <span className="vt-pers dim">{t.level === 'full' ? 'Sin rasgos marcados' : 'Ninguno a la vista'}</span>
  return <span className="vt-pers">{marked.slice(0, 2).map(x => <span key={x.key}>{x.text}</span>)}{marked.length > 2 && <span className="mk-cnt">+{marked.length - 2}<span className="vh"> rasgos más</span></span>}</span>
}
function talkCell(g: Game, p: Player): ReactNode {
  if (p.clubId !== g.userClubId) return <span className="dim">–</span>
  const ts = talkState(g, p)
  return ts.can ? <span className="vt-talkst">Disponible</span> : <span className="vt-talkst">{MI.clock}<span>desde el <b>{ts.short.replace('desde el ', '')}</b></span></span>
}

const BASE: Record<string, Col> = {
  num: { l: 'N°', n: 'Número', w: 40, r: true, v: p => p.num, c: p => <span className="num dim">{p.num}</span> },
  name: { l: 'Jugador', w: 190, v: p => p.name, c: (p, g) => <span className="row" style={{ gap: 8, minWidth: 0 }}><Face p={p} club={g.clubs[p.clubId]} size={26} /><span className="ell" style={{ fontWeight: 600 }}>{p.name}</span></span> },
  pos: { l: 'Pos', w: 58, v: (p, g) => LINE_ORDER[p.line] * 100 - valSeen(g, p), c: p => <PosPill p={p} /> },
  age: { l: 'Edad', w: 50, r: true, v: (p, g) => ageOn(p.birth, g.date), c: (p, g) => <span className="num">{ageOn(p.birth, g.date)}</span> },
  nat: { l: 'Nacionalidad', w: 104, v: p => p.nat, c: p => <span className="dim ell">{p.nat}</span> },
  club: { l: 'Club', w: 118, v: (p, g) => g.clubs[p.clubId]?.short ?? '', c: (p, g) => <span className="row ell" style={{ gap: 6 }} data-cid={p.clubId}><Badge club={g.clubs[p.clubId]} size={18} />{g.clubs[p.clubId]?.short}</span> },
  val: { l: 'Val', n: 'Valoración', t: 'Valoración en su mejor puesto (rango si no lo conocés bien)', w: 62, r: true, v: (p, g) => valSeen(g, p), c: p => <Val p={p} /> },
  pot: { l: 'Pot.', n: 'Potencial', t: 'Margen de mejora: lo sabés de tus jugadores y de los juveniles bien ojeados', w: 52, r: true, v: (p, g) => potGap(g, p), c: (p, g) => stars(potGap(g, p)) },
  cond: { l: 'Físico', w: 80, v: p => p.cond, c: p => <Cond v={p.cond} /> },
  mor: { l: 'Moral', w: 80, v: (p, g) => morSort(g, p), c: (p, g) => { const m = moraleShown(g, p); return !m ? <span className="dim">–</span> : m.value != null ? <MoraleBar v={m.value} size="sm" /> : <span className="vt-scale-w">{m.word}</span> } },
  happy: { l: 'Conform.', n: 'Conformidad', t: 'Conformidad con sus minutos y su rol (solo tu plantel)', w: 92, v: (p, g) => (p.clubId === g.userClubId ? p.happy ?? 70 : -1), c: (p, g) => (p.clubId === g.userClubId ? <MoodBar v={p.happy ?? 70} size="sm" /> : <span className="dim">–</span>) },
  mins: { l: 'Minutos', n: 'Minutos jugados y esperados', t: 'Minutos jugados contra los que espera su rol (solo tu plantel)', w: 96, v: (p, g) => (p.clubId === g.userClubId ? minutesOf(g, p).got : -1), c: (p, g) => (p.clubId === g.userClubId ? <MinsBar m={minutesOf(g, p)} size="sm" /> : <span className="dim">–</span>) },
  pers: { l: 'Personalidad', w: 150, v: (p, g) => persSort(g, p), c: (p, g) => persCell(g, p) },
  res: { l: 'Reserva', n: 'Reserva', t: 'Anotado para el partido de reserva del miércoles', w: 100, v: (p, g) => `${p.clubId === g.userClubId && p.reserve ? 0 : 1}|${LINE_ORDER[p.line]}|${p.name}`, c: () => null },
  talk: { l: 'Charla', n: 'Charla', t: 'Cuándo se puede volver a hablar con él', w: 104, v: (p, g) => (p.clubId === g.userClubId ? (talkState(g, p).can ? '' : talkState(g, p).next ?? '') : '~'), c: (p, g) => talkCell(g, p) },
  role: { l: 'Rol', t: 'Rol acordado en el plantel', w: 92, v: p => (p.status ? Object.keys(STATUS).indexOf(p.status) : 9), c: p => <span className="dim ell vt-role">{p.status ? STATUS[p.status].name : '–'}</span> },
  pj: { l: 'PJ', n: 'Partidos', t: 'Partidos jugados (entre paréntesis, entrando)', w: 54, r: true, v: pj, c: p => <span className="num">{p.stats.apps}{p.stats.subs ? <span className="dim"> ({p.stats.subs})</span> : ''}</span> },
  min: { l: 'Min', n: 'Minutos', t: 'Minutos jugados', w: 54, r: true, v: p => p.stats.mins, c: p => <span className="num dim">{p.stats.mins}</span> },
  gol: { l: 'G', n: 'Goles', t: 'Goles', w: 38, r: true, v: p => p.stats.goals, c: p => <span className="num">{p.stats.goals}</span> },
  ast: { l: 'A', n: 'Asistencias', t: 'Asistencias', w: 38, r: true, v: p => p.stats.ast, c: p => <span className="num">{p.stats.ast}</span> },
  rat: { l: 'Prom', n: 'Promedio', t: 'Promedio de puntaje', w: 54, r: true, v: rat, c: p => <span className={`num ${ratClass(pj(p) ? rat(p) : 6.5)}`}>{avgRat(p.stats)}</span> },
  motm: { l: 'Fig', n: 'Figura del partido', t: 'Figura del partido', w: 40, r: true, v: p => p.stats.motm, c: p => <span className="num">{p.stats.motm}</span> },
  shots: { l: 'Rem', n: 'Remates', t: 'Remates (al arco)', w: 60, r: true, v: p => p.stats.shots, c: p => <span className="num">{p.stats.shots}<span className="dim"> ({p.stats.sot})</span></span> },
  yc: { l: 'TA', n: 'Amarillas', t: 'Tarjetas amarillas', w: 40, r: true, v: p => p.stats.yc, c: p => <span className="num">{p.stats.yc}{p.stats.rc ? <span className="bad"> {p.stats.rc}R</span> : ''}</span> },
  value: { l: 'Valor US$', n: 'Valor', w: 80, r: true, v: p => p.value, c: p => <span className="num">{m$(p.value)}</span> },
  ask: { l: 'Pedido US$', n: 'Pedido', t: 'Lo que pide su club para venderlo', w: 86, r: true, v: (p, g) => (p.clubId === g.userClubId ? 0 : askingPrice(g, p)), c: (p, g) => (p.clubId === g.userClubId ? <span className="dim">–</span> : <b className="num">{m$(askingPrice(g, p))}</b>) },
  wage: { l: 'Sueldo US$', n: 'Sueldo', t: 'Sueldo mensual (estimado si no lo conocés bien)', w: 92, r: true, v: (p, g) => { const r = wageOf(g, p); return (r[0] + r[1]) / 2 },
    c: (p, g) => { const r = wageOf(g, p); return r[0] === r[1] ? <span className="num dim">{m$(r[0])}</span> : <span className="num dim">{wr(r).replace('US$ ', '')}<span className="vh"> estimado</span></span> } },
  deal: { l: 'Trato', n: 'Trato', t: 'Tu oferta por él, si hay', w: 112, v: (p, g) => dealRank(g, p), c: (p, g) => dealCell(g, p) },
  con: { l: 'Contrato', w: 74, r: true, v: p => p.contractEnd, c: (p, g) => <span className={`num ${p.contractEnd <= g.season ? 'warn' : 'dim'}`}>{p.contractEnd}</span> },
  clause: { l: 'Cláusula US$', n: 'Cláusula', w: 92, r: true, v: p => p.clause ?? 0, c: p => (p.clause ? <span className="num dim">{m$(p.clause)}</span> : <span className="dim">–</span>) },
  know: { l: 'Conoc.', n: 'Conocimiento', t: 'Cuánto sabés del jugador', w: 64, r: true, v: (p, g) => knowOf(g, p), c: (p, g) => (g.scouting.includes(p.id) ? <span className="acc sm">Ojeando</span> : <span className="num dim">{Math.round(knowOf(g, p))}%</span>) },
  st: { l: 'Estado', w: 120, v: p => (p.injury ? 3 : 0) + (p.susp ? 2 : 0) + (p.listed ? 1 : 0), c: p => <span className="row vt-st" style={{ gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}><Status p={p} />{p.reserve && <span className="chip vt-st-res">Reserva</span>}</span> },
}
// cada atributo también es una columna (con el rango que se conoce si es ajeno)
const ATTR_COLS: Record<string, Col> = Object.fromEntries(ATTRS.map((a, i) => [`a_${a}`, {
  l: ATTR_LABEL[a].slice(0, 3), n: ATTR_LABEL[a], t: ATTR_LABEL[a], w: 46, r: true,
  v: (p: Player, g: Game) => seen(g, p, p.attrs[i], 5, i),
  c: (p: Player, g: Game) => { const r = shown(g, p, p.attrs[i], 5, i); return <span className={`num ${r[0] === r[1] ? attrTone(r[0]) : 'dim'}`}>{fmtRange(r)}</span> },
} as Col]))
const attrTone = (v: number) => (v >= 16 ? 'good' : v >= 13 ? '' : v >= 9 ? 'dim' : 'bad')
export const COLS: Record<string, Col> = { ...BASE, ...ATTR_COLS }

/** Prioridad al faltar ancho: se ocultan primero las de número más bajo. Los atributos elegidos a mano pesan como los datos clave. */
const PRIO: Record<string, number> = { mins: 5, res: 4, pers: 2, talk: 2, deal: 6, num: 1, nat: 1, st: 6, min: 3, mor: 5, motm: 3, yc: 3, shots: 4, wage: 4, happy: 5, role: 5, clause: 5, know: 6, club: 6, value: 6, ask: 7, con: 7, cond: 7, pj: 8, gol: 8, ast: 8, rat: 8, pot: 8, age: 9, val: 10, pos: 10 }
const prio = (k: string) => PRIO[k] ?? 9

// ---------- vistas ----------
/**
 * `prio` (opcional) pisa a `PRIO` solo en esa vista; `keep` (por defecto 3) es el mínimo de columnas visibles contando el nombre.
 * `w` pisa el ancho de `COLS` solo en esa vista (así las vistas del Vestuario ensanchan sus escalas sin cambiar qué ocultan las demás tablas);
 * `narrow`, los anchos cuando la tabla no llega a 270 px de presupuesto (celular angosto): la escala va compacta, sin cara y con el nombre corto.
 */
export const VIEWS: Record<string, { name: string; cols: string[]; prio?: Record<string, number>; keep?: number; w?: Record<string, number>; narrow?: Record<string, number> }> = {
  general: { name: 'General', cols: ['num', 'name', 'pos', 'age', 'val', 'cond', 'mor', 'pj', 'gol', 'ast', 'rat', 'value', 'wage', 'con', 'st'] },
  fisico: { name: 'Físico', cols: ['name', 'pos', 'age', 'cond', 'a_pac', 'a_acc', 'a_sta', 'a_str', 'a_jmp', 'min', 'st'] },
  contrato: { name: 'Contrato', cols: ['name', 'pos', 'age', 'val', 'role', 'happy', 'value', 'wage', 'con', 'clause', 'st'] },
  ojeo: { name: 'Ojeo', cols: ['name', 'pos', 'club', 'age', 'val', 'pot', 'know', 'value', 'ask', 'wage', 'con', 'deal'] },
  stats: { name: 'Estadísticas', cols: ['name', 'pos', 'club', 'pj', 'min', 'gol', 'ast', 'rat', 'motm', 'shots', 'yc'] },
  // Vestuario (design/ux/vestuario.md, 5.3): se ocultan primero la personalidad y la charla; la conformidad, la última
  vestuario: { name: 'Vestuario', cols: ['name', 'pos', 'role', 'mins', 'happy', 'mor', 'pers', 'st', 'res', 'talk'], prio: { pers: 2, talk: 3, st: 4, res: 5, mor: 6, pos: 7, role: 12, mins: 13, happy: 14 }, keep: 2,
    w: { pos: 64, mins: 96, happy: 124, mor: 96, res: 100 }, narrow: { happy: 92 } },
  // la del modo "Armar la reserva": el alternable nunca se oculta
  reserva: { name: 'Reserva', cols: ['name', 'res', 'pos', 'role', 'mins', 'st'], prio: { st: 3, mins: 4, role: 5, pos: 7, res: 14 }, keep: 2, w: { pos: 64, mins: 96, res: 100 }, narrow: { res: 90 } },
}
const LINES: [string, string][] = [['', 'Todos'], ['GK', 'Arq'], ['DF', 'Def'], ['MF', 'Med'], ['FW', 'Del']]
/** Nombre corto para la celda angosta ("S. Montiel"); el completo queda en el nombre de la fila y en el del botón. */
const shortName = (n: string) => { const w = n.split(' '); return w.length < 2 ? n : `${w[0][0]}. ${w.slice(1).join(' ')}` }

interface Prefs { view: string; mine: Record<string, string[]>; edit?: string[] }
function usePrefs(id: string, def: string): [Prefs, (p: Prefs) => void] {
  const key = `ta-table-${id}`
  const [p, setP] = useState<Prefs>(() => { try { return { view: def, mine: {}, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return { view: def, mine: {} } } })
  return [p, (x: Prefs) => { setP(x); try { localStorage.setItem(key, JSON.stringify(x)) } catch { /* sin almacenamiento */ } }]
}

export interface Bulk { label: string; run: (ps: Player[]) => string | void; show?: (ps: Player[]) => boolean; danger?: boolean }
type Sort = { k: string; d: number }[]

/**
 * `onPick`: la fila elige en vez de abrir la ficha (Mercado, ≥ 1180 px). Foco itinerante: una parada de Tab, ↑ ↓ Inicio Fin Re Pág Av Pág
 * mueven el foco, Enter elige, Espacio marca la casilla (no avanza el día), Mayús + ↑ ↓ extiende la selección. `picked`: la fila elegida.
 */
export function PlayerTable({ id, players, views = ['general', 'fisico', 'contrato', 'stats'], def = 'general', bulk = [], limit = 200, empty = 'No hay jugadores.', filters = true, defSort, onPick, picked, onSel, onOffer, openTab, gridLabel, bar, head, mode, busy = false, onView, countText }: {
  id: string; players: Player[]; views?: string[]; def?: string; bulk?: Bulk[]; limit?: number; empty?: ReactNode; filters?: boolean; defSort?: Sort
  onPick?: (p: Player, how: 'click' | 'key') => void; picked?: number | null
  /** los marcados con la casilla (el panel del Mercado los compara con el elegido) */ onSel?: (ids: number[]) => void
  /** "Ofertar" en cada columna del comparador */ onOffer?: (p: Player) => void
  /** la fila abre la ficha en esta pestaña (el Mercado angosto: "contrato") */ openTab?: string
  /** nombre de la tabla con foco itinerante (`role="grid"`) */ gridLabel?: string
  /** controles propios de la pantalla en la barra de la tabla (los chips de filtro del Vestuario) */ bar?: ReactNode
  /** línea arriba de la tabla, dentro de su tarjeta (el modo "Armar la reserva") */ head?: ReactNode
  /** la pantalla pone una vista y un orden (cada `n` nuevo los aplica una vez); `focus`: después, el foco va a la primera fila del orden nuevo */ mode?: { view: string; sort?: Sort; n: number; focus?: boolean }
  /** avance en curso: las acciones que escriben quedan deshabilitadas */ busy?: boolean
  /** la vista activa (`custom` si el jugador editó las columnas) */ onView?: (view: string) => void
  /** el anuncio de la cuenta (por defecto "36 jugadores.") */ countText?: (n: number) => string
}) {
  const { g, openPlayer, save, refresh, nav } = useGame()
  const open = (pid: number) => (openTab ? nav({ page: 'player', id: pid, tab: openTab }) : openPlayer(pid))
  const [prefs, setPrefs] = usePrefs(id, def)
  const [sort, setSort] = useSticky<Sort>(`tbl.sort.${id}`, [])
  const [q, setQ] = useSticky(`tbl.q.${id}`, '')
  const [line, setLine] = useSticky(`tbl.line.${id}`, '')
  const [sel, setSel] = useState<number[]>([])
  const [menu, setMenu] = useState(false)
  const [cmp, setCmp] = useState<number[] | null>(null)
  const [note, setNote] = useState('')
  const noteRef = useRef<HTMLSpanElement>(null)
  // los cambios de reserva del alternable se anuncian (4.1.3): región viva propia de la tabla
  const [resLive, setResLive] = useState('')
  const [more, setMore] = useState(1)
  const last = useRef<number | null>(null)
  const [cur, setCur] = useState<number | null>(null)
  const focusRow = useRef<number | null>(null), tbody = useRef<HTMLTableSectionElement>(null)
  useEffect(() => { const k = focusRow.current; if (k == null) return; focusRow.current = null; const el = tbody.current?.querySelector<HTMLElement>(`tr[data-pid="${k}"]`); el?.focus({ preventScroll: true }); el?.scrollIntoView({ block: 'nearest' }) })
  // ancho disponible: se ocultan columnas de menor prioridad (las del final de la vista) para no desplazar de costado
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // misma lista si no cambió: una lista nueva en cada pasada re-dibujaría sin fin a quien escucha `onSel` (y Seguimiento arma `players` en cada render)
  useEffect(() => setSel(s => { const f = s.filter(id => players.some(p => p.id === id)); return f.length === s.length ? s : f }), [players])
  useEffect(() => { onSel?.(sel) }, [sel])
  // la pantalla pide una vista y un orden ("Armar la reserva"): se aplican una vez por pedido
  const modeN = useRef(0)
  // `mode.focus`: el foco espera a que la tabla se dibuje con la vista y el orden nuevos (si no, la fila enfocada se mueve después)
  const modeFocus = useRef<{ view: string; sort: string } | null>(null)
  useEffect(() => {
    if (!mode || mode.n === modeN.current) return
    modeN.current = mode.n; setPrefs({ ...prefs, view: mode.view, edit: undefined }); if (mode.sort) setSort(mode.sort)
    if (mode.focus) modeFocus.current = { view: mode.view, sort: JSON.stringify(mode.sort ?? []) }
  }, [mode?.n])

  const allViews = [...views.filter(v => VIEWS[v]).map(v => [v, VIEWS[v].name] as const), ...Object.keys(prefs.mine).map(v => [`mine:${v}`, v] as const)]
  const view = allViews.some(v => v[0] === prefs.view) ? prefs.view : def
  const baseCols = prefs.edit ?? (view.startsWith('mine:') ? prefs.mine[view.slice(5)] : VIEWS[view].cols)
  const want = ['name', ...baseCols.filter(k => k !== 'name' && COLS[k])]
  // con el texto más grande (Ajustes › texto) las columnas piden más ancho: se ocultan las de menor prioridad antes que cortar rótulos (1.4.12)
  const scale = Math.max(1, parseFloat(getComputedStyle(document.documentElement).fontSize) / 14 || 1)
  const budget = width - 34 - 8
  const vis = [...want]
  // las prioridades propias de la vista valen solo en la vista tal cual (no en una editada ni en las del jugador)
  const vdef = !prefs.edit && !view.startsWith('mine:') ? VIEWS[view] : undefined
  const pr = (k: string) => vdef?.prio?.[k] ?? prio(k), keep = vdef?.keep ?? 3
  const narrow = !!vdef?.narrow && budget < 270 * scale
  const colW = (k: string) => (narrow ? vdef?.narrow?.[k] : undefined) ?? vdef?.w?.[k] ?? COLS[k].w
  const fit = () => vis.reduce((s, k) => s + colW(k) * scale + 12, 0)
  while (fit() > budget && vis.length > keep) {
    // se oculta la de menor prioridad; a igual prioridad, la que está más a la derecha
    let drop = -1
    vis.forEach((k, i) => { if (k !== 'name' && (drop < 0 || pr(k) <= pr(vis[drop]))) drop = i })
    vis.splice(drop, 1)
  }
  const hiddenN = want.length - vis.length
  // ya con la vista y el orden del modo: la primera fila del orden nuevo, en el centro de la ventana
  useEffect(() => {
    const f = modeFocus.current
    if (!f || view !== f.view || prefs.edit || (f.sort !== '[]' && JSON.stringify(sort) !== f.sort)) return
    modeFocus.current = null
    const el = tbody.current?.querySelector<HTMLElement>('tr[data-pid]')
    if (el) { setCur(Number(el.dataset.pid)); el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }) }
  })
  useEffect(() => { onView?.(prefs.edit ? 'custom' : view) }, [view, !!prefs.edit])

  const ql = q.trim().toLowerCase()
  let list = players.filter(p => (!line || p.line === line) && (!ql || p.name.toLowerCase().includes(ql)))
  const keys: Sort = sort.length ? sort : defSort ?? [{ k: 'pos', d: 1 }]
  if (keys.length) list = [...list].sort((a, b) => { for (const s of keys) { const c = COLS[s.k]; if (!c) continue; const x = c.v(a, g), y = c.v(b, g); if (x !== y) return (x < y ? -1 : 1) * s.d } return 0 })
  const total = list.length
  list = list.slice(0, limit * more)
  const chosen = sel.map(i => g.players[i]).filter(Boolean)

  const clickHead = (k: string, add: boolean) => {
    const asc = ['name', 'pos', 'num', 'age', 'nat', 'club', 'con', 'pers', 'res', 'talk'].includes(k) ? 1 : -1
    const i = keys.findIndex(s => s.k === k)
    if (add) setSort(i >= 0 ? keys.map(s => (s.k === k ? { k, d: -s.d } : s)) : [...keys, { k, d: asc }].slice(-3))
    else setSort(i === 0 && keys.length === 1 ? [{ k, d: -keys[0].d }] : [{ k, d: asc }])
  }
  const toggle = (pid: number, shift: boolean) => {
    if (shift && last.current != null) {
      const a = list.findIndex(p => p.id === last.current), b = list.findIndex(p => p.id === pid)
      if (a >= 0 && b >= 0) { const range = list.slice(Math.min(a, b), Math.max(a, b) + 1).map(p => p.id); setSel([...new Set([...sel, ...range])]); last.current = pid; return }
    }
    last.current = pid
    setSel(sel.includes(pid) ? sel.filter(x => x !== pid) : [...sel, pid])
  }
  // el botón puede dejar de dibujarse (su `show` ya no se cumple): el foco va a la nota, nunca a `body`
  const runBulk = (b: Bulk) => {
    const m = b.run(chosen); setNote(m || `${b.label}: ${chosen.length} jugador${chosen.length > 1 ? 'es' : ''}.`); save(); refresh()
    setTimeout(() => { const n = noteRef.current; if (n) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest' }) } }, 30)
  }
  const saidRes = (p: Player, on: boolean) => {
    const r = reserveOf(g), d = sdy(r.day, g.date)
    setResLive(`${on ? `Anotaste a ${p.name} en la reserva` : `Sacaste a ${p.name} de la reserva`}: ${r.fit} ${r.fit === 1 ? 'anotado y sano' : 'anotados y sanos'}${r.fit < r.min ? `, faltan ${r.min - r.fit} para el ${d}` : `, juega el ${d}`}.`)
  }
  const setCols = (cols: string[]) => setPrefs({ ...prefs, edit: cols })
  const saveView = (raw: string) => {
    const name = raw.trim()
    if (!name) return
    const mine = { ...prefs.mine, [name]: baseCols }
    setPrefs({ view: `mine:${name}`, mine })
  }
  const allSel = list.length > 0 && list.every(p => sel.includes(p.id))
  // nombre de la fila para el lector de pantalla: lo que se ve, con la valoración como la muestra el ojeo y el pedido
  // en el Vestuario suma lo que la vista muestra de los propios: conformidad, minutos, moral y si está anotado en la reserva
  const lockerName = (p: Player) => {
    if (id !== 'locker' || p.clubId !== g.userClubId) return []
    const h = p.happy ?? 70, m = minutesOf(g, p), pc = (v: number) => Math.round(v * 100)
    return [`conformidad ${Math.floor(h)} ${moodOf(h).word.toLowerCase()}`, m.recent.length < 2 ? 'sus minutos todavía no cuentan' : `juega ${pc(m.got)} % y espera ${pc(m.expected)} %`,
      `moral ${Math.floor(p.morale)} ${moraleOf(p.morale).word.toLowerCase()}`, p.reserve ? 'anotado en la reserva' : '']
  }
  const rowName = (p: Player) => { const c = g.clubs[p.clubId], r = shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99)
    return [p.name, POS_LABEL[p.positions[0]], c?.short, `${ageOn(p.birth, g.date)} años`, `valoración ${fmtRange(r)}`, ...lockerName(p), p.clubId !== g.userClubId ? `pedido ${money(askingPrice(g, p))}` : '', sel.includes(p.id) ? 'marcado' : ''].filter(Boolean).join(', ') }
  // foco itinerante (solo con `onPick`): la fila con foco, la elegida o la primera
  const stop = onPick ? (list.find(p => p.id === cur) ?? list.find(p => p.id === picked) ?? list[0])?.id : undefined
  const onRowKey = (e: RKeyEvent<HTMLTableSectionElement>) => {
    if (!onPick || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).tagName !== 'TR') return
    const i = Math.max(0, list.findIndex(p => p.id === stop))
    let j = -1
    switch (e.key) {
      case 'ArrowDown': j = i + 1; break
      case 'ArrowUp': j = i - 1; break
      case 'Home': j = 0; break
      case 'End': j = list.length - 1; break
      case 'PageDown': j = i + 10; break
      case 'PageUp': j = i - 10; break
      case 'Enter': e.preventDefault(); e.stopPropagation(); onPick(list[i], 'key'); return
      case ' ': e.preventDefault(); e.stopPropagation(); toggle(list[i].id, false); return
      default: return
    }
    e.preventDefault(); e.stopPropagation()
    const k = list[Math.max(0, Math.min(list.length - 1, j))]
    if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setSel(s => [...new Set([...s, list[i].id, k.id])])
    setCur(k.id); focusRow.current = k.id
  }
  return (
    <div className="ptable-wrap col" style={{ gap: 8 }}>
      <div className="row wrap ptable-bar" style={{ gap: 8 }}>
        {bar}
        <div className="seg" role="group" aria-label="Vista">{allViews.map(([k, l]) => <button key={k} className={view === k && !prefs.edit ? 'on' : ''} aria-pressed={view === k && !prefs.edit} onClick={() => setPrefs({ ...prefs, view: k, edit: undefined })}>{l}</button>)}{prefs.edit && <button className="on" aria-pressed>Personalizada</button>}</div>
        <div style={{ position: 'relative' }}>
          <button className={`btn sm ${menu ? 'on' : ''}`} aria-expanded={menu} onClick={() => setMenu(!menu)}>Columnas{hiddenN > 0 ? ` · ${hiddenN} ocultas por el ancho` : ''}</button>
          {menu && <ColMenu cols={baseCols} hidden={want.filter(k => !vis.includes(k))} onChange={setCols} onClose={() => setMenu(false)} onSave={n => { saveView(n); setMenu(false) }} current={view.startsWith('mine:') ? view.slice(5) : ''}
            onDelete={view.startsWith('mine:') ? () => { const mine = { ...prefs.mine }; delete mine[view.slice(5)]; setPrefs({ view: def, mine }); setMenu(false) } : undefined} />}
        </div>
        {filters && <><div className="seg" role="group" aria-label="Línea">{LINES.map(([k, l]) => <button key={k} className={line === k ? 'on' : ''} aria-pressed={line === k} onClick={() => setLine(k)}>{l}</button>)}</div>
          <input type="search" placeholder="Filtrar por nombre" aria-label="Filtrar por nombre" value={q} onChange={e => setQ(e.target.value)} style={{ width: 170, padding: '5px 10px' }} /></>}
        <span className="grow" />
        {keys.length > 1 && <span className="dim sm">Orden: {keys.map(s => COLS[s.k]?.l).join(' › ')} <button className="btn sm" onClick={() => setSort([])}>Quitar</button></span>}
        <span className="dim sm" aria-live="polite">{countText ? countText(total) : `${total} jugador${total === 1 ? '' : 'es'}.`}</span>
        <span className="vh" role="status">{resLive}</span>
      </div>
      {sel.length === 0 && bulk.length > 0 && <div className="bulkbar row wrap idle"><span className="dim">Marcá jugadores con la casilla para compararlos{bulk.length ? ' o aplicarles una acción' : ''}.</span></div>}
      {sel.length > 0 && <div className="bulkbar row wrap">
        <b>{sel.length} seleccionado{sel.length > 1 ? 's' : ''}</b>
        <button className="btn sm primary" disabled={sel.length < 2 || sel.length > 3} title="Elegí 2 o 3 jugadores" onClick={() => setCmp(sel)}>Comparar</button>
        {bulk.filter(b => !b.show || b.show(chosen)).map(b => <button key={b.label} className={`btn sm ${b.danger ? 'danger' : ''}`} disabled={busy} onClick={() => runBulk(b)}>{b.label}</button>)}
        <button className="btn sm" onClick={() => { setSel([]); setNote('') }}>Limpiar</button>
        {note && <span className="acc sm bulk-note" role="status" tabIndex={-1} ref={noteRef}>{note}</span>}
        {busy && <span className="ib-help">Frená el avance para cambiar el plantel.</span>}
      </div>}
      <div className="card ptable" ref={wrap} data-view={prefs.edit ? 'custom' : view} data-narrow={narrow || undefined}>
        {head}
        <table {...(onPick ? { role: 'grid', 'aria-label': gridLabel ?? 'Jugadores', 'aria-rowcount': total + 1 } : {})}>
          <colgroup><col style={{ width: 34 }} />{vis.map(k => <col key={k} style={k === 'name' ? undefined : { width: Math.round(colW(k) * scale) }} />)}</colgroup>
          <thead><tr>
            <th className="th-all"><label className="th-all-l"><input type="checkbox" aria-label="Seleccionar todos" checked={allSel} onChange={() => setSel(allSel ? [] : list.map(p => p.id))} /></label></th>
            {vis.map(k => { const c = COLS[k], i = keys.findIndex(s => s.k === k), on = i >= 0 && sort.length > 0; return (
              <th key={k} className={`sortable ${c.r ? 'r' : ''}`} aria-sort={i === 0 ? (keys[0].d > 0 ? 'ascending' : 'descending') : undefined}>
                <button className="th-sort" title={`${c.t ?? c.l}. Ordenar; Mayús + clic (o Mayús + Enter) suma un criterio.`} onClick={e => clickHead(k, e.shiftKey)}>
                  {c.l}{c.t && c.t !== c.l && <span className="vh"> ({c.t})</span>}{i >= 0 && <span className="acc" aria-hidden={!on || undefined}>{keys[i].d > 0 ? ' ▴' : ' ▾'}{keys.length > 1 ? i + 1 : ''}</span>}</button></th>) })}
          </tr></thead>
          <tbody ref={tbody} onKeyDown={onRowKey}>{list.map(p => (
            <tr key={p.id} data-pid={p.id} className={`click ${p.clubId === g.userClubId && id !== 'squad' && id !== 'locker' ? 'me' : ''} ${sel.includes(p.id) ? 'selrow' : ''}`}
              {...(onPick ? { tabIndex: p.id === stop ? 0 : -1, 'aria-selected': p.id === picked, 'aria-label': rowName(p), onFocus: () => setCur(p.id) } : {})}
              onClick={() => (onPick ? onPick(p, 'click') : open(p.id))}>
              <td onClick={e => { e.stopPropagation(); toggle(p.id, e.shiftKey) }}><input type="checkbox" aria-label={`Seleccionar a ${p.name}`} checked={sel.includes(p.id)} readOnly tabIndex={onPick ? -1 : undefined} /></td>
              {vis.map(k => <td key={k} className={COLS[k].r ? 'r' : ''}>{k === 'name' && onPick
                ? <span className="row" style={{ gap: 8, minWidth: 0 }}>{!narrow && <Face p={p} club={g.clubs[p.clubId]} size={26} />}<button className="linkish ell mk-name" tabIndex={-1} aria-label={narrow ? p.name : undefined} onClick={e => { e.stopPropagation(); openPlayer(p.id) }}>{narrow ? shortName(p.name) : p.name}</button></span>
                : k === 'res' ? <ResToggle p={p} grid={!!onPick} busy={busy} onDone={saidRes} />
                : COLS[k].c(p, g)}</td>)}
            </tr>))}</tbody>
        </table>
        {!total && (typeof empty === 'string' ? <div className="dim sm" style={{ padding: 12 }}>{empty}</div> : empty)}
        {total > list.length && <button className="btn sm mk-more" onClick={() => setMore(more + 1)}>Mostrar {Math.min(limit, total - list.length)} más</button>}
      </div>
      {cmp && <Compare ids={cmp} onClose={() => setCmp(null)} onOffer={onOffer} />}
    </div>
  )
}

/** Alternable de la reserva (columna `res`): escribe con `setReserve`; en la grilla no es una parada de Tab (con teclado, Espacio + "A la reserva"). */
function ResToggle({ p, grid, busy, onDone }: { p: Player; grid: boolean; busy: boolean; onDone: (p: Player, on: boolean) => void }) {
  const { g, save, refresh } = useGame()
  if (p.clubId !== g.userClubId) return <span className="dim">–</span>
  const on = !!p.reserve
  return <span className="vt-res-cell">
    <button className={`btn sm vt-res ${on ? 'on' : ''}`} aria-pressed={on} tabIndex={grid ? -1 : undefined} disabled={busy}
      onClick={e => { e.stopPropagation(); setReserve(g, [p.id], !on); onDone(p, !on); save(); refresh() }}>{on ? <>✓ Anotado<span className="vh">: {p.name} en la reserva</span></> : <>Anotar<span className="vh"> a {p.name} en la reserva</span></>}</button>
    {(p.injury || p.susp > 0) && <span className="vt-res-sub">{p.injury ? 'Lesionado' : 'Suspendido'}</span>}
  </span>
}

function ColMenu({ cols, hidden, onChange, onClose, onSave, onDelete, current }: { cols: string[]; hidden: string[]; onChange: (c: string[]) => void; onClose: () => void; onSave: (name: string) => void; onDelete?: () => void; current: string }) {
  const [name, setName] = useState(current || 'Mi vista')
  const groups: [string, string[]][] = [
    ['Datos', ['num', 'pos', 'age', 'nat', 'club', 'val', 'pot', 'role', 'st']],
    ['Estado', ['cond', 'mor', 'happy', 'know']],
    ['Vestuario', ['mins', 'pers', 'res', 'talk']],
    ['Temporada', ['pj', 'min', 'gol', 'ast', 'rat', 'motm', 'shots', 'yc']],
    ['Contrato y mercado', ['value', 'ask', 'wage', 'con', 'clause', 'deal']],
    ...(['Técnicos', 'Mentales', 'Físicos', 'Arquero'] as const).map((n, gi) => [n, ATTRS.filter((_, i) => (gi === 0 ? i < 10 : gi === 1 ? i >= 10 && i < 18 : gi === 2 ? i >= 18 && i < 23 : i >= 23)).map(a => `a_${a as Attr}`)] as [string, string[]]),
  ]
  const on = (k: string) => cols.includes(k)
  const flip = (k: string) => onChange(on(k) ? cols.filter(x => x !== k) : [...cols, k])
  const move = (k: string, d: number) => { const i = cols.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= cols.length) return; const c = [...cols]; [c[i], c[j]] = [c[j], c[i]]; onChange(c) }
  return (
    <div className="colmenu" onClick={e => e.stopPropagation()}>
      <div className="row between"><h3>Columnas</h3><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      <div className="colmenu-order">{cols.filter(k => k !== 'name' && COLS[k]).map(k => <span key={k} className={`chip ${hidden.includes(k) ? '' : 'acc'}`} title={hidden.includes(k) ? 'Oculta por el ancho de la pantalla' : COLS[k].t ?? ''}>
        <button className="linkish" onClick={() => move(k, -1)}>◂</button>{COLS[k].n ?? COLS[k].l}<button className="linkish" onClick={() => move(k, 1)}>▸</button><button className="linkish" onClick={() => flip(k)}>✕</button></span>)}</div>
      <div className="colmenu-grid">{groups.map(([n, ks]) => <div key={n}><div className="favs-h" style={{ padding: '6px 0 4px' }}>{n}</div>
        {ks.map(k => <label key={k} className="row sm" style={{ gap: 6, padding: '2px 0' }}><input type="checkbox" checked={on(k)} onChange={() => flip(k)} />{COLS[k].n ?? COLS[k].l}</label>)}</div>)}</div>
      <div className="row wrap" style={{ gap: 6 }}><input type="text" aria-label="Nombre de la vista" value={name} onChange={e => setName(e.target.value)} style={{ width: 150, padding: '4px 9px' }} /><button className="btn sm primary" disabled={!name.trim()} onClick={() => onSave(name)}>Guardar como vista</button>{onDelete && <button className="btn sm danger" onClick={onDelete}>Borrar esta vista</button>}<span className="dim sm">Las columnas del final se ocultan primero si no entran.</span></div>
    </div>
  )
}

// ---------- comparador ----------
const SERIES = ['var(--accent)', 'var(--info)', 'var(--warn)']
export function Compare({ ids, onClose, onOffer }: { ids: number[]; onClose: () => void; onOffer?: (p: Player) => void }) {
  const { g, openPlayer, nav, save, refresh } = useGame()
  const me = g.clubs[g.userClubId], free = me.budget - committed(g)
  const ajeno = (p: Player) => p.clubId !== g.userClubId && (g.clubs[p.clubId]?.division ?? 0) > 0
  const V = ({ v }: { v: 'ok' | 'maybe' | 'no' }) => <span className={`mk-verdict ${v}`}>{v === 'ok' ? MI.ok : v === 'maybe' ? MI.bang : MI.x}{v === 'ok' ? 'entra' : v === 'maybe' ? 'puede no entrar' : 'no entra'}</span>
  // "entra / puede no entrar / no entra" con el pedido y el sueldo que pediría (rango del ojeo, nunca exacto si no lo conocés)
  const fitsCap = (p: Player) => { const imp = dealImpact(g, 'buy', p.id, askingPrice(g, p)); return imp ? (imp.fits === 'yes' ? 'ok' : imp.fits) : 'no' }
  const ps = ids.map(i => g.players[i]).filter(Boolean)
  const gk = ps.every(p => p.line === 'GK')
  const est = (p: Player) => p.attrs.map((v, i) => shown(g, p, v, 5, i))
  const mid = (r: [number, number]) => (r[0] + r[1]) / 2
  const E = ps.map(est)
  const av = (pi: number, ks: Attr[]) => ks.reduce((s, k) => s + mid(E[pi][ATTRS.indexOf(k)]), 0) / ks.length
  const axes: [string, Attr[]][] = gk
    ? [['Atajadas', ['han', 'ref']], ['Mano a mano', ['one']], ['Aéreo', ['aer', 'jmp']], ['Saque', ['kic', 'pas']], ['Colocación', ['pos', 'dec']], ['Mental', ['com', 'lea']]]
    : [['Definición', ['fin', 'otb', 'lsh']], ['Técnica', ['dri', 'fto', 'cro']], ['Creación', ['pas', 'vis', 'dec']], ['Defensa', ['tck', 'mar', 'pos', 'hea']], ['Físico', ['pac', 'acc', 'sta', 'str']], ['Mental', ['com', 'wor', 'lea']]]
  const groups = gk ? [['Arquero', ATTRS.slice(23)], ['Mentales', ATTRS.slice(10, 18)], ['Físicos', ATTRS.slice(18, 23)]] as const : [['Técnicos', ATTRS.slice(0, 10)], ['Mentales', ATTRS.slice(10, 18)], ['Físicos', ATTRS.slice(18, 23)]] as const
  const best = (vals: number[], hi = true) => { const m = hi ? Math.max(...vals) : Math.min(...vals); return vals.map(v => v === m && vals.filter(x => x === m).length < vals.length) }
  const rowsInfo: [string, (p: Player) => ReactNode, (p: Player) => number, boolean?][] = [
    ['Valoración', p => <Val p={p} />, p => valSeen(g, p)],
    ['Edad', p => ageOn(p.birth, g.date), p => ageOn(p.birth, g.date), false],
    ['Partidos', p => `${p.stats.apps}${p.stats.subs ? ` (${p.stats.subs})` : ''}`, pj],
    ['Goles · asistencias', p => `${p.stats.goals} · ${p.stats.ast}`, p => p.stats.goals + p.stats.ast],
    ['Promedio', p => avgRat(p.stats), rat],
    ['Valor', p => money(p.value), p => p.value],
    ['Sueldo', p => wr(wageOf(g, p)), p => { const r = wageOf(g, p); return (r[0] + r[1]) / 2 }, false],
    ['Contrato', p => `dic ${p.contractEnd}`, p => p.contractEnd],
    ['Pedido', p => (p.clubId === g.userClubId ? '–' : money(askingPrice(g, p))), p => (p.clubId === g.userClubId ? 0 : -askingPrice(g, p))],
  ]
  const offerRows: [string, (p: Player) => ReactNode][] = [
    ['Cabe en tu presupuesto', p => (!ajeno(p) ? '–' : <V v={askingPrice(g, p) <= free ? 'ok' : 'no'} />)],
    ['Sueldo que pediría', p => (!ajeno(p) ? '–' : (() => { const w = wageShown(g, p, demandWage(g, p), 402); return w[0] === w[1] ? wr(w) : <span className="rng">{wr(w)} <small>(estimado)</small></span> })())],
    ['Tope de sueldos', p => (!ajeno(p) ? '–' : <V v={fitsCap(p)} />)],
  ]
  const follow = (p: Player) => { toggleShortlist(g, p.id); save(); refresh() }
  const offer = (p: Player) => { if (onOffer) onOffer(p); else { onClose(); nav({ page: 'player', id: p.id, tab: 'contrato' }) } }
  return (
    <Modal onClose={onClose} wide>
      <div className="row between" style={{ marginBottom: 12 }}><h2>Comparar jugadores</h2><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      <div className="cmp" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${ps.length}, minmax(0, 1.2fr))` }}>
        <div className="cmp-radar"><CompareRadar labels={axes.map(a => a[0])} series={ps.map((_, i) => axes.map(a => av(i, a[1])))} /></div>
        {ps.map((p, i) => <button key={p.id} className="linkish cmp-head" data-pid={p.id} onClick={() => { onClose(); openPlayer(p.id) }} style={{ borderTopColor: SERIES[i] }}>
          <Face p={p} club={g.clubs[p.clubId]} size={52} /><b>{p.name}</b><span className="row dim sm" style={{ gap: 5 }}><Badge club={g.clubs[p.clubId]} size={16} />{g.clubs[p.clubId]?.short}</span><span className="row" style={{ gap: 5 }}><PosPill p={p} />{knowOf(g, p) < 100 && <span className="dim sm">Conoc. {Math.round(knowOf(g, p))}%</span>}</span></button>)}
        {rowsInfo.map(([l, show, num, hi]) => { const b = best(ps.map(num), hi !== false); return <Row key={l} l={l} cells={ps.map((p, i) => <span className={b[i] ? 'good' : ''}>{show(p)}</span>)} /> })}
        {ps.some(ajeno) && <><div className="cmp-sec">Si lo comprás</div>{offerRows.map(([l, show]) => <Row key={l} l={l} cells={ps.map(p => show(p))} />)}
          <Row l="" cells={ps.map(p => ajeno(p) ? <span className="row wrap" style={{ gap: 6 }}><button className="btn sm primary" onClick={() => offer(p)}>Ofertar</button>
            <button className={`btn sm ${g.shortlist.includes(p.id) ? 'on' : ''}`} aria-pressed={g.shortlist.includes(p.id)} onClick={() => follow(p)}>{g.shortlist.includes(p.id) ? '✓ En seguimiento' : 'Seguir'}</button></span> : <span className="dim">Es tuyo</span>)} /></>}
        {groups.map(([n, as]) => [<div key={n} className="cmp-sec">{n}</div>, ...as.map(a => { const i = ATTRS.indexOf(a), b = best(E.map(e => mid(e[i]))); return <Row key={a} l={ATTR_LABEL[a]} cells={ps.map((_, pi) => <span className={`num ${b[pi] ? 'good' : ''}`} style={b[pi] ? { fontWeight: 700 } : undefined}>{fmtRange(E[pi][i])}</span>)} /> })])}
      </div>
      <div className="dim sm" style={{ marginTop: 10 }}>En verde, el mejor de cada fila. De los jugadores que no conocés bien se ven rangos: mandalos a ojear para afinarlos. "Cabe en tu presupuesto" compara el pedido con lo libre para ofertar ({money(free)}); el tope de sueldos usa el sueldo que pediría.</div>
    </Modal>
  )
}
function Row({ l, cells }: { l: string; cells: ReactNode[] }) {
  return <><div className="cmp-l">{l}</div>{cells.map((c, i) => <div key={i} className="cmp-c">{c}</div>)}</>
}
function CompareRadar({ labels, series, size = 230 }: { labels: string[]; series: number[][]; size?: number }) {
  const n = labels.length, c = size / 2, R = size / 2 - 44
  const pt = (i: number, r: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * r, c + Math.sin(a) * r] }
  const poly = (f: (i: number) => number) => labels.map((_, i) => pt(i, f(i)).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%' }} role="img" aria-label="Perfil comparado">
      {[0.25, 0.5, 0.75, 1].map(k => <polygon key={k} points={poly(() => R * k)} fill="none" stroke="var(--line)" />)}
      {labels.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" /> })}
      {series.map((s, si) => <polygon key={si} points={poly(i => (R * Math.min(20, s[i])) / 20)} fill={SERIES[si]} fillOpacity={0.12} stroke={SERIES[si]} strokeWidth="2" />)}
      {labels.map((l, i) => { const [x, y] = pt(i, R + 16); return <text key={l} x={x} y={y} fill="var(--dim)" fontSize="10.5" textAnchor="middle" dominantBaseline="middle">{l}</text> })}
    </svg>
  )
}

// ---------- acciones masivas de uso común ----------
/** Para tu plantel: transferibles, reserva y banco de suplentes. */
export function ownBulk(g: Game): Bulk[] {
  const t = () => g.clubs[g.userClubId].tactic
  return [
    { label: 'Al banco', show: ps => ps.some(p => !t().bench.includes(p.id) && !t().lineup.includes(p.id)), run: ps => {
      const add = ps.filter(p => !t().bench.includes(p.id) && !t().lineup.includes(p.id) && !p.injury && !p.susp).map(p => p.id)
      t().bench = [...t().bench.filter(id => !add.includes(id)), ...add].slice(-9)
      return add.length ? `${add.length} al banco de suplentes (máximo 9).` : 'No hay disponibles para el banco: están en el once, lesionados o suspendidos.'
    } },
    { label: 'Sacar del banco', show: ps => ps.some(p => t().bench.includes(p.id)), run: ps => { t().bench = t().bench.filter(id => !ps.some(p => p.id === id)) } },
    // la pantalla no escribe en `g`: la reserva y los transferibles pasan por el motor (así resolver o reabrir un pedido de salida sigue la regla de leído)
    { label: 'A la reserva', show: ps => ps.some(p => !p.reserve), run: ps => { const n = setReserve(g, ps.map(p => p.id), true); return n ? `Anotaste a ${n} en la reserva.` : 'Ya estaban anotados.' } },
    { label: 'Sacar de la reserva', show: ps => ps.some(p => p.reserve), run: ps => { const n = setReserve(g, ps.map(p => p.id), false); return `Sacaste a ${n} de la reserva.` } },
    { label: 'Declarar transferibles', show: ps => ps.some(p => !p.listed && canSell(p)), run: ps => { const n = ps.filter(p => setListed(g, p.id, true)).length; return n === 1 ? 'Declaraste transferible a 1.' : `Declaraste transferibles a ${n}.` } },
    { label: 'Quitar de transferibles', show: ps => ps.some(p => p.listed), run: ps => {
      const done = ps.filter(p => setListed(g, p.id, false)), out = done.filter(p => p.wantsOut)
      return `Quitaste de transferibles a ${done.length}.${out.length ? ` ${out.map(p => p.name).join(', ')} ${out.length === 1 ? 'sigue queriendo irse: el pedido vuelve' : 'siguen queriendo irse: los pedidos vuelven'} a Para decidir.` : ''}`
    } },
  ]
}
/** Para jugadores ajenos: seguimiento y ojeo. */
export function scoutBulk(g: Game): Bulk[] {
  return [
    { label: 'Seguir', show: ps => ps.some(p => p.clubId !== g.userClubId && !g.shortlist.includes(p.id)), run: ps => { for (const p of ps) if (p.clubId !== g.userClubId && !g.shortlist.includes(p.id)) toggleShortlist(g, p.id) } },
    { label: 'Dejar de seguir', show: ps => ps.some(p => g.shortlist.includes(p.id)), run: ps => { for (const p of ps) if (g.shortlist.includes(p.id)) toggleShortlist(g, p.id) } },
    { label: 'Mandar a ojear', show: ps => ps.some(p => p.clubId !== g.userClubId && !g.scouting.includes(p.id) && knowOf(g, p) < 100), run: ps => {
      const before = g.scouting.length
      ps.filter(p => knowOf(g, p) < 100).forEach(p => scout(g, p))
      return `El scouting sigue a ${g.scouting.length} jugadores${g.scouting.length - before < ps.length ? ' (tope de 10: se dejan de seguir los más viejos)' : ''}.`
    } },
  ]
}
