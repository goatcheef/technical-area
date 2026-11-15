// Tabla de jugadores única para todo el juego: vistas, columnas a elección, orden por varias columnas,
// filtros, selección múltiple con acciones y comparador. Se adapta al ancho sin desplazamiento horizontal.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as RKeyEvent, type ReactNode } from 'react'
import { askingPrice, bidBlock, canSell, openDealFor } from '../engine/career'
import { fmtDay } from '../engine/game'
import { ageOn } from '../engine/positions'
import { STATUS, fmtRange, knowOf, knownRating, scout, shown, toggleShortlist, wageShown } from '../engine/squad'
import { ATTRS, ATTR_LABEL, type Attr, type Game, type Player } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Badge, Cond, Face, Modal, PosPill, Status, Val, avgRat, money, ratClass } from './common'
import { MI, StateChip, wr } from './deal'

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
  mor: { l: 'Moral', w: 80, v: p => p.morale, c: p => <Cond v={p.morale} /> },
  happy: { l: 'Conform.', n: 'Conformidad', t: 'Conformidad con sus minutos (solo tu plantel)', w: 86, v: (p, g) => (p.clubId === g.userClubId ? p.happy ?? 60 : -1), c: (p, g) => (p.clubId === g.userClubId ? <Cond v={p.happy ?? 60} /> : <span className="dim">–</span>) },
  role: { l: 'Rol', t: 'Rol acordado en el plantel', w: 92, v: p => (p.status ? Object.keys(STATUS).indexOf(p.status) : 9), c: p => <span className="dim ell">{p.status ? STATUS[p.status].name : '–'}</span> },
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
  st: { l: 'Estado', w: 120, v: p => (p.injury ? 3 : 0) + (p.susp ? 2 : 0) + (p.listed ? 1 : 0), c: p => <span className="row" style={{ gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}><Status p={p} />{p.reserve && <span className="chip">Reserva</span>}</span> },
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
const PRIO: Record<string, number> = { deal: 6, num: 1, nat: 1, st: 6, min: 3, mor: 5, motm: 3, yc: 3, shots: 4, wage: 4, happy: 5, role: 5, clause: 5, know: 6, club: 6, value: 6, ask: 7, con: 7, cond: 7, pj: 8, gol: 8, ast: 8, rat: 8, pot: 8, age: 9, val: 10, pos: 10 }
const prio = (k: string) => PRIO[k] ?? 9

// ---------- vistas ----------
export const VIEWS: Record<string, { name: string; cols: string[] }> = {
  general: { name: 'General', cols: ['num', 'name', 'pos', 'age', 'val', 'cond', 'mor', 'pj', 'gol', 'ast', 'rat', 'value', 'wage', 'con', 'st'] },
  fisico: { name: 'Físico', cols: ['name', 'pos', 'age', 'cond', 'a_pac', 'a_acc', 'a_sta', 'a_str', 'a_jmp', 'min', 'st'] },
  contrato: { name: 'Contrato', cols: ['name', 'pos', 'age', 'val', 'role', 'happy', 'value', 'wage', 'con', 'clause', 'st'] },
  ojeo: { name: 'Ojeo', cols: ['name', 'pos', 'club', 'age', 'val', 'pot', 'know', 'value', 'ask', 'wage', 'con', 'deal'] },
  stats: { name: 'Estadísticas', cols: ['name', 'pos', 'club', 'pj', 'min', 'gol', 'ast', 'rat', 'motm', 'shots', 'yc'] },
}
const LINES: [string, string][] = [['', 'Todos'], ['GK', 'Arq'], ['DF', 'Def'], ['MF', 'Med'], ['FW', 'Del']]

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
export function PlayerTable({ id, players, views = ['general', 'fisico', 'contrato', 'stats'], def = 'general', bulk = [], limit = 200, empty = 'No hay jugadores.', filters = true, defSort, onPick, picked }: {
  id: string; players: Player[]; views?: string[]; def?: string; bulk?: Bulk[]; limit?: number; empty?: string; filters?: boolean; defSort?: Sort
  onPick?: (p: Player, how: 'click' | 'key') => void; picked?: number | null
}) {
  const { g, openPlayer, save, refresh } = useGame()
  const [prefs, setPrefs] = usePrefs(id, def)
  const [sort, setSort] = useSticky<Sort>(`tbl.sort.${id}`, [])
  const [q, setQ] = useSticky(`tbl.q.${id}`, '')
  const [line, setLine] = useSticky(`tbl.line.${id}`, '')
  const [sel, setSel] = useState<number[]>([])
  const [menu, setMenu] = useState(false)
  const [cmp, setCmp] = useState<number[] | null>(null)
  const [note, setNote] = useState('')
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
  useEffect(() => setSel(s => s.filter(id => players.some(p => p.id === id))), [players])

  const allViews = [...views.filter(v => VIEWS[v]).map(v => [v, VIEWS[v].name] as const), ...Object.keys(prefs.mine).map(v => [`mine:${v}`, v] as const)]
  const view = allViews.some(v => v[0] === prefs.view) ? prefs.view : def
  const baseCols = prefs.edit ?? (view.startsWith('mine:') ? prefs.mine[view.slice(5)] : VIEWS[view].cols)
  const want = ['name', ...baseCols.filter(k => k !== 'name' && COLS[k])]
  const budget = width - 34 - 8
  const vis = [...want]
  const fit = () => vis.reduce((s, k) => s + COLS[k].w + 12, 0)
  while (fit() > budget && vis.length > 3) {
    // se oculta la de menor prioridad; a igual prioridad, la que está más a la derecha
    let drop = -1
    vis.forEach((k, i) => { if (k !== 'name' && (drop < 0 || prio(k) <= prio(vis[drop]))) drop = i })
    vis.splice(drop, 1)
  }
  const hiddenN = want.length - vis.length

  const ql = q.trim().toLowerCase()
  let list = players.filter(p => (!line || p.line === line) && (!ql || p.name.toLowerCase().includes(ql)))
  const keys: Sort = sort.length ? sort : defSort ?? [{ k: 'pos', d: 1 }]
  if (keys.length) list = [...list].sort((a, b) => { for (const s of keys) { const c = COLS[s.k]; if (!c) continue; const x = c.v(a, g), y = c.v(b, g); if (x !== y) return (x < y ? -1 : 1) * s.d } return 0 })
  const total = list.length
  list = list.slice(0, limit * more)
  const chosen = sel.map(i => g.players[i]).filter(Boolean)

  const clickHead = (k: string, add: boolean) => {
    const asc = ['name', 'pos', 'num', 'age', 'nat', 'club', 'con'].includes(k) ? 1 : -1
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
  const runBulk = (b: Bulk) => { const m = b.run(chosen); setNote(m || `${b.label}: ${chosen.length} jugador${chosen.length > 1 ? 'es' : ''}.`); save(); refresh() }
  const setCols = (cols: string[]) => setPrefs({ ...prefs, edit: cols })
  const saveView = (raw: string) => {
    const name = raw.trim()
    if (!name) return
    const mine = { ...prefs.mine, [name]: baseCols }
    setPrefs({ view: `mine:${name}`, mine })
  }
  const allSel = list.length > 0 && list.every(p => sel.includes(p.id))
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
        <div className="seg" role="group" aria-label="Vista">{allViews.map(([k, l]) => <button key={k} className={view === k && !prefs.edit ? 'on' : ''} aria-pressed={view === k && !prefs.edit} onClick={() => setPrefs({ ...prefs, view: k, edit: undefined })}>{l}</button>)}{prefs.edit && <button className="on" aria-pressed>Personalizada</button>}</div>
        <div style={{ position: 'relative' }}>
          <button className={`btn sm ${menu ? 'on' : ''}`} aria-expanded={menu} onClick={() => setMenu(!menu)}>Columnas{hiddenN > 0 ? ` · ${hiddenN} ocultas por el ancho` : ''}</button>
          {menu && <ColMenu cols={baseCols} hidden={want.filter(k => !vis.includes(k))} onChange={setCols} onClose={() => setMenu(false)} onSave={n => { saveView(n); setMenu(false) }} current={view.startsWith('mine:') ? view.slice(5) : ''}
            onDelete={view.startsWith('mine:') ? () => { const mine = { ...prefs.mine }; delete mine[view.slice(5)]; setPrefs({ view: def, mine }); setMenu(false) } : undefined} />}
        </div>
        {filters && <><div className="seg" role="group" aria-label="Línea">{LINES.map(([k, l]) => <button key={k} className={line === k ? 'on' : ''} aria-pressed={line === k} onClick={() => setLine(k)}>{l}</button>)}</div>
          <input type="search" placeholder="Filtrar por nombre" value={q} onChange={e => setQ(e.target.value)} style={{ width: 170, padding: '5px 10px' }} /></>}
        <span className="grow" />
        {keys.length > 1 && <span className="dim sm">Orden: {keys.map(s => COLS[s.k]?.l).join(' › ')} <button className="btn sm" onClick={() => setSort([])}>Quitar</button></span>}
        <span className="dim sm" aria-live="polite">{total} jugador{total === 1 ? '' : 'es'}.</span>
      </div>
      {sel.length > 0 && <div className="bulkbar row wrap">
        <b>{sel.length} seleccionado{sel.length > 1 ? 's' : ''}</b>
        <button className="btn sm primary" disabled={sel.length < 2 || sel.length > 3} title="Elegí 2 o 3 jugadores" onClick={() => setCmp(sel)}>Comparar</button>
        {bulk.filter(b => !b.show || b.show(chosen)).map(b => <button key={b.label} className={`btn sm ${b.danger ? 'danger' : ''}`} onClick={() => runBulk(b)}>{b.label}</button>)}
        <button className="btn sm" onClick={() => { setSel([]); setNote('') }}>Limpiar</button>
        {note && <span className="acc sm">{note}</span>}
      </div>}
      <div className="card ptable" ref={wrap}>
        <table>
          <colgroup><col style={{ width: 34 }} />{vis.map(k => <col key={k} style={k === 'name' ? undefined : { width: COLS[k].w }} />)}</colgroup>
          <thead><tr>
            <th><input type="checkbox" aria-label="Seleccionar todos" checked={allSel} onChange={() => setSel(allSel ? [] : list.map(p => p.id))} /></th>
            {vis.map(k => { const c = COLS[k], i = keys.findIndex(s => s.k === k); return (
              <th key={k} className={`sortable ${c.r ? 'r' : ''}`} title={`${c.t ?? c.l}. Clic para ordenar; Mayús + clic suma un criterio.`} onClick={e => clickHead(k, e.shiftKey)}>
                {c.l}{i >= 0 && <span className="acc">{keys[i].d > 0 ? ' ▴' : ' ▾'}{keys.length > 1 ? i + 1 : ''}</span>}</th>) })}
          </tr></thead>
          <tbody ref={tbody} onKeyDown={onRowKey}>{list.map(p => (
            <tr key={p.id} data-pid={p.id} className={`click ${p.clubId === g.userClubId && id !== 'squad' ? 'me' : ''} ${sel.includes(p.id) ? 'selrow' : ''}`}
              {...(onPick ? { tabIndex: p.id === stop ? 0 : -1, 'aria-selected': p.id === picked, onFocus: () => setCur(p.id) } : {})}
              onClick={() => (onPick ? onPick(p, 'click') : openPlayer(p.id))}>
              <td onClick={e => { e.stopPropagation(); toggle(p.id, e.shiftKey) }}><input type="checkbox" aria-label={`Seleccionar a ${p.name}`} checked={sel.includes(p.id)} readOnly tabIndex={onPick ? -1 : undefined} /></td>
              {vis.map(k => <td key={k} className={COLS[k].r ? 'r' : ''}>{k === 'name' && onPick
                ? <span className="row" style={{ gap: 8, minWidth: 0 }}><Face p={p} club={g.clubs[p.clubId]} size={26} /><button className="linkish ell mk-name" tabIndex={-1} onClick={e => { e.stopPropagation(); openPlayer(p.id) }}>{p.name}</button></span>
                : COLS[k].c(p, g)}</td>)}
            </tr>))}</tbody>
        </table>
        {!total && <div className="dim sm" style={{ padding: 12 }}>{empty}</div>}
        {total > list.length && <button className="btn sm mk-more" onClick={() => setMore(more + 1)}>Mostrar {Math.min(limit, total - list.length)} más</button>}
      </div>
      {cmp && <Compare ids={cmp} onClose={() => setCmp(null)} />}
    </div>
  )
}

function ColMenu({ cols, hidden, onChange, onClose, onSave, onDelete, current }: { cols: string[]; hidden: string[]; onChange: (c: string[]) => void; onClose: () => void; onSave: (name: string) => void; onDelete?: () => void; current: string }) {
  const [name, setName] = useState(current || 'Mi vista')
  const groups: [string, string[]][] = [
    ['Datos', ['num', 'pos', 'age', 'nat', 'club', 'val', 'pot', 'role', 'st']],
    ['Estado', ['cond', 'mor', 'happy', 'know']],
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
export function Compare({ ids, onClose }: { ids: number[]; onClose: () => void }) {
  const { g, openPlayer } = useGame()
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
  return (
    <Modal onClose={onClose} wide>
      <div className="row between" style={{ marginBottom: 12 }}><h2>Comparar jugadores</h2><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      <div className="cmp" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${ps.length}, minmax(0, 1.2fr))` }}>
        <div className="cmp-radar"><CompareRadar labels={axes.map(a => a[0])} series={ps.map((_, i) => axes.map(a => av(i, a[1])))} /></div>
        {ps.map((p, i) => <button key={p.id} className="linkish cmp-head" data-pid={p.id} onClick={() => { onClose(); openPlayer(p.id) }} style={{ borderTopColor: SERIES[i] }}>
          <Face p={p} club={g.clubs[p.clubId]} size={52} /><b>{p.name}</b><span className="row dim sm" style={{ gap: 5 }}><Badge club={g.clubs[p.clubId]} size={16} />{g.clubs[p.clubId]?.short}</span><span className="row" style={{ gap: 5 }}><PosPill p={p} />{knowOf(g, p) < 100 && <span className="dim sm">Conoc. {Math.round(knowOf(g, p))}%</span>}</span></button>)}
        {rowsInfo.map(([l, show, num, hi]) => { const b = best(ps.map(num), hi !== false); return <Row key={l} l={l} cells={ps.map((p, i) => <span className={b[i] ? 'good' : ''}>{show(p)}</span>)} /> })}
        {groups.map(([n, as]) => [<div key={n} className="cmp-sec">{n}</div>, ...as.map(a => { const i = ATTRS.indexOf(a), b = best(E.map(e => mid(e[i]))); return <Row key={a} l={ATTR_LABEL[a]} cells={ps.map((_, pi) => <span className={`num ${b[pi] ? 'good' : ''}`} style={b[pi] ? { fontWeight: 700 } : undefined}>{fmtRange(E[pi][i])}</span>)} /> })])}
      </div>
      <div className="dim sm" style={{ marginTop: 10 }}>En verde, el mejor de cada fila. De los jugadores que no conocés bien se ven rangos: mandalos a ojear para afinarlos.</div>
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
    { label: 'A la reserva', show: ps => ps.some(p => !p.reserve), run: ps => { ps.forEach(p => (p.reserve = true)) } },
    { label: 'Sacar de la reserva', show: ps => ps.some(p => p.reserve), run: ps => { ps.forEach(p => (p.reserve = false)) } },
    { label: 'Declarar transferibles', show: ps => ps.some(p => !p.listed && canSell(p)), run: ps => { ps.forEach(p => { if (canSell(p)) p.listed = true }) } },
    { label: 'Quitar de transferibles', show: ps => ps.some(p => p.listed), run: ps => { ps.forEach(p => (p.listed = false)) } },
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
