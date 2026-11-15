// Mercado de pases (design/ux/mercado.md; production/ui/mercado/visual-design.md): franja con el libro y la plata, cinco pestañas
// (Buscar, Tratos, Seguimiento, Movimientos, Presupuesto), tabla con panel del jugador elegido y tratos agrupados por lo que piden.
// La pantalla no escribe en `g`: llama al motor (placeBid, withdrawBid, acceptCounter, cancelDeal, signDeal, acceptOffer, haggle…).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DIV_NAMES, askingPrice, committed, dealsOf, wageBill, type DealRow } from '../engine/career'
import { fmtDate, fmtDay } from '../engine/game'
import { pendingAll } from '../engine/inbox'
import { POS_LABEL, ageOn } from '../engine/positions'
import { STATUS, knownRating } from '../engine/squad'
import type { Deal, Player, Pos } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Face, PosPill, Seg, Val, money } from './common'
import { DealView, MI, ResultNote, SidePanel, StateChip, bookOf, dealModel, dealStateText, offerModel, sm, wm, type Res } from './deal'
import { ClubCard, PlayerCard } from './Inbox'
import { NegotiationModal } from './Locker'
import { Compare, PlayerTable, scoutBulk } from './PlayerTable'
import { PageTip } from './Guide'

const POSS: Pos[] = ['GK', 'DR', 'DC', 'DL', 'DM', 'MC', 'MR', 'ML', 'AMC', 'AMR', 'AML', 'ST']
const TABS: [string, string][] = [['buscar', 'Buscar'], ['tratos', 'Tratos'], ['seguimiento', 'Seguimiento'], ['movimientos', 'Movimientos'], ['presupuesto', 'Presupuesto']]
/** Valores viejos de `tab`. */
const OLD: Record<string, string> = { search: 'buscar', offers: 'tratos', short: 'seguimiento', moves: 'movimientos', fin: 'presupuesto' }
const normTab = (t?: string) => (t ? OLD[t] ?? t : '')
const isTab = (t: string) => TABS.some(x => x[0] === t)
const DEF = { pos: '', age: 40, val: 0, ovr: 60, div: 0, only: false }

function useMedia(q: string) {
  const [v, setV] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q), f = () => setV(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [q])
  return v
}

/** Alto de las barras fijas de arriba en `--mk-top` (para `scroll-padding-top` y el panel sticky): ningún foco queda tapado. */
function TopHeight() {
  useEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    const set = () => { const r = main.getBoundingClientRect(); main.style.setProperty('--mk-top', `${Math.max(0, Math.round(r.top))}px`) }
    set(); window.addEventListener('resize', set)
    return () => { window.removeEventListener('resize', set); main.style.removeProperty('--mk-top') }
  }, [])
  return null
}

export function Market({ busy = false }: { busy?: boolean }) {
  const { g, route, nav } = useGame()
  const [stTab, setStTab] = useSticky('mk.tab', '')
  const mkDec = pendingAll(g).filter(p => p.k === 'offer' || p.k === 'deal')
  const rt = normTab(route.tab)
  const tab = isTab(rt) ? rt : isTab(stTab) ? stTab : mkDec.length ? 'tratos' : 'buscar'
  const setTab = (t: string) => { setStTab(t); nav({ page: 'market', tab: t }) }
  const wide = useMedia('(min-width: 1181px)')
  return (
    <div className="page mk">
      <TopHeight />
      <PageTip id="market" />
      <h2 className="mk-title">Mercado de pases</h2>
      <Strip />
      <Seg className="seg mk-tabs" roving label="Secciones del mercado" value={TABS.findIndex(t => t[0] === tab)} options={TABS.map(t => t[1])}
        cnt={TABS.map(([k]) => (k === 'tratos' ? { n: mkDec.length, dec: true, vh: mkDec.length === 1 ? 'decisión del mercado' : 'decisiones del mercado' } : k === 'seguimiento' ? { n: g.shortlist.length, vh: 'jugadores seguidos' } : null))}
        onChange={i => setTab(TABS[i][0])} />
      {tab === 'buscar' && <Search wide={wide} busy={busy} />}
      {tab === 'seguimiento' && <Shortlist wide={wide} busy={busy} />}
      {tab === 'tratos' && <Deals busy={busy} />}
      {tab === 'movimientos' && <Moves />}
      {tab === 'presupuesto' && <Budget />}
    </div>
  )
}

// ---------- franja de estado ----------
function Strip() {
  const { g } = useGame()
  const c = g.clubs[g.userClubId], b = bookOf(g), com = committed(g), open = (g.deals ?? []).filter(d => d.side !== 'sell' && d.userClubId === g.userClubId && ['waiting', 'countered', 'agreed'].includes(d.state))
  const bill = wageBill(g, c.id), margin = c.wageBudget - bill
  // el cambio de estado del libro y las respuestas que llegan con la pantalla abierta se anuncian una vez
  const [live, setLive] = useState('')
  const prev = useRef<{ open: boolean; st: Record<number, string> } | null>(null)
  useEffect(() => {
    const st: Record<number, string> = {}
    for (const d of g.deals ?? []) if (d.side !== 'sell') st[d.id] = d.state
    const p = prev.current, says: string[] = []
    if (p) {
      if (p.open !== b.open) says.push(b.open ? 'Abrió el libro de pases.' : 'El libro de pases cerró.')
      for (const d of g.deals ?? []) if (p.st[d.id] === 'waiting' && d.state !== 'waiting') says.push(`Llegó la respuesta de ${d.clubName} por ${d.name}: ${d.state === 'agreed' ? 'aceptó' : d.state === 'countered' ? 'pidió más' : 'no aceptó'}.`)
    }
    prev.current = { open: b.open, st }
    if (says.length) setLive(says.join(' '))
  }, [g.date, b.open])
  return <div className="card mk-strip">
    <div className="mk-kpi mk-book">
      <span className={`mk-book-ico ${b.open ? (b.soon ? 'soon' : 'open') : 'closed'}`}>{b.open ? (b.soon ? MI.bang : MI.ok) : MI.lock}</span>
      <div className="col" style={{ gap: 2, minWidth: 0 }}><span className="mk-kpi-l">Libro de pases</span><span className="mk-kpi-v">{b.v}</span><span className={`mk-book-d ${b.urgent ? 'short' : ''}`}>{b.soon && <span className="vh">Atención: </span>}{b.d}</span></div>
    </div>
    <div className="mk-kpi"><span className="mk-kpi-l">{com > 0 ? 'Libre para ofertar' : 'Presupuesto'}</span><span className="mk-kpi-v">{money(c.budget - com)}</span>
      <span className="mk-kpi-s">{com > 0 ? <><span className="hide-sm">de {money(c.budget)} · </span>{money(com)} comprometidos<span className="hide-sm"> en {open.length} {open.length === 1 ? 'oferta' : 'ofertas'}</span></> : 'para pases'}</span></div>
    <div className="mk-kpi"><span className="mk-kpi-l">Caja</span><span className={`mk-kpi-v ${c.balance < 0 ? 'bad' : ''}`}>{sm(c.balance)}</span><span className="mk-kpi-s">{c.balance < 0 ? 'en rojo: no podés pagar primas' : 'para primas'}</span></div>
    <div className="mk-kpi"><span className="mk-kpi-l">Sueldos / tope</span><span className="mk-kpi-v">{wm(bill)} <span className="mk-cap">/ {wm(c.wageBudget).replace('US$ ', '')}</span></span>
      <span className="mk-kpi-s">{margin >= 0 ? `margen ${wm(margin)} por mes` : <><b className="warn">!</b> <b>pasaste el tope por {wm(-margin)}</b></>}</span></div>
    <div className="vh" aria-live="polite">{live}</div>
  </div>
}

// ---------- Buscar y Seguimiento ----------
function Search({ wide, busy }: { wide: boolean; busy: boolean }) {
  const { g } = useGame()
  const [pos, setPos] = useSticky('mk.pos', DEF.pos)
  const [maxAge, setMaxAge] = useSticky('mk.age', DEF.age)
  const [maxVal, setMaxVal] = useSticky('mk.val', DEF.val)
  const [minOvr, setMinOvr] = useSticky('mk.ovr', DEF.ovr)
  const [div, setDiv] = useSticky('mk.div', DEF.div)
  const [only, setOnly] = useSticky('mk.only', DEF.only)
  const [fOpen, setFOpen] = useState(false)
  const phone = useMedia('(max-width: 760px)')
  const club = g.clubs[g.userClubId]
  // filtro y recorte por lo que sabe el DT (punto medio del rango), no por la valoración real: no revelan lo que el ojeo no sabe
  const results = useMemo(() => Object.values(g.players).filter(p => p.clubId !== club.id && g.clubs[p.clubId]?.division > 0 && (!pos || p.positions.includes(pos as Pos))
    && ageOn(p.birth, g.date) <= maxAge && (!div || g.clubs[p.clubId].division === div) && (!only || p.listed || p.contractEnd <= g.season))
    .map(p => [p, knownRating(g, p)] as const).filter(([p, v]) => v >= minOvr && (!maxVal || askingPrice(g, p) <= maxVal))
    .sort((a, b) => b[1] - a[1]).slice(0, 400).map(([p]) => p), [g, g.date, g.transfers.length, pos, maxAge, maxVal, minOvr, div, only, club.id])
  const dirty = pos !== DEF.pos || maxAge !== DEF.age || maxVal !== DEF.val || minOvr !== DEF.ovr || div !== DEF.div || only !== DEF.only
  const clear = () => { setPos(DEF.pos); setMaxAge(DEF.age); setMaxVal(DEF.val); setMinOvr(DEF.ovr); setDiv(DEF.div); setOnly(DEF.only) }
  const summary = [pos ? POS_LABEL[pos as Pos] : 'Todos', maxAge < 40 ? `≤ ${maxAge}` : '', `≥ ${minOvr}`, div ? DIV_NAMES[div] : '', maxVal ? `≤ ${money(maxVal)}` : '', only ? 'transferibles' : ''].filter(Boolean).join(' · ')
  return <>
    {phone && <button className="btn mk-filt" aria-expanded={fOpen} aria-controls="mk-filters" onClick={() => setFOpen(!fOpen)}>Filtros: {summary} {fOpen ? '▴' : '▾'}</button>}
    {(!phone || fOpen) && <div className="card mk-filters" id="mk-filters" onKeyDown={e => { if (e.key === 'Escape' && phone) { e.preventDefault(); setFOpen(false); (document.querySelector('.mk-filt') as HTMLElement | null)?.focus() } }}>
      <label className="f">Puesto<select id="mk-pos" value={pos} onChange={e => setPos(e.target.value)}><option value="">Todos</option>{POSS.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}</select></label>
      <label className="f">Categoría<select id="mk-div" value={div} onChange={e => setDiv(Number(e.target.value))}><option value={0}>Todas</option>{[1, 2, 3].map(d => <option key={d} value={d}>{DIV_NAMES[d]}</option>)}</select></label>
      <label className="f mk-range">Valoración mínima: <b>{minOvr}</b><input id="mk-ovr" type="range" min={40} max={90} value={minOvr} onChange={e => setMinOvr(Number(e.target.value))} /></label>
      <label className="f mk-range">Edad máxima: <b>{maxAge}</b><input id="mk-age" type="range" min={16} max={40} value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} /></label>
      <label className="f">Precio máximo<select id="mk-val" value={maxVal} onChange={e => setMaxVal(Number(e.target.value))}><option value={0}>Sin límite</option><option value={club.budget}>Mi presupuesto</option>{[250000, 500000, 1000000, 2500000, 5000000, 10000000].map(v => <option key={v} value={v}>{money(v)}</option>)}</select></label>
      <div className="seg mk-only"><button className={only ? 'on' : ''} aria-pressed={only} onClick={() => setOnly(!only)}>Solo transferibles o con contrato por vencer</button></div>
      {dirty && <button className="btn sm mk-clear" onClick={clear}>Limpiar filtros</button>}
    </div>}
    <PickTable id="market" list={results} wide={wide} busy={busy} empty={<>No hay jugadores que cumplan esos filtros. Probá con otro puesto, más edad o sin límite de precio. No hay jugadores libres para fichar: solo se compra o se pide a préstamo a jugadores de otros clubes.{dirty && <> <button className="btn sm" onClick={clear}>Limpiar filtros</button></>}</>} />
  </>
}
function Shortlist({ wide, busy }: { wide: boolean; busy: boolean }) {
  const { g } = useGame()
  return <PickTable id="shortlist" list={g.shortlist.map(id => g.players[id]).filter(Boolean)} wide={wide} busy={busy} empty="No seguís a ningún jugador. Marcalos en Buscar y tocá Seguir; los que mandes a ojear entran solos." />
}
/** Tabla con el panel del jugador elegido (≥ 1180 px): la fila elige, el nombre abre la ficha. Por debajo, la fila abre la ficha en Contrato y mercado. */
function PickTable({ id, list, wide, busy, empty }: { id: string; list: Player[]; wide: boolean; busy: boolean; empty: ReactNode }) {
  const { g, route, nav } = useGame()
  const [cmp, setCmp] = useState<number[] | null>(null)
  const [marked, setMarked] = useState<number[]>([])
  const want = route.sel?.[0] === 'p' ? Number(route.sel.slice(1)) : null
  const picked = want != null && list.some(p => p.id === want) ? want : null
  const focusBid = useRef(false)
  useEffect(() => { if (focusBid.current) { focusBid.current = false; document.getElementById('mk-bid-fee')?.focus() } })
  // al volver de la ficha con un jugador elegido, el foco va a su fila (no queda en el body)
  useEffect(() => { if (picked != null && (document.activeElement === document.body || !document.activeElement)) { const tr = document.querySelector<HTMLElement>(`.mk .ptable tr[data-pid="${picked}"]`); tr?.focus({ preventScroll: true }) } }, [])
  const tabOf = id === 'market' ? 'buscar' : 'seguimiento'
  const onPick = (p: Player, how: 'click' | 'key') => { if (how === 'key') focusBid.current = true; nav({ page: 'market', tab: route.tab && normTab(route.tab) === tabOf ? route.tab : tabOf, sel: `p${p.id}` }) }
  // "Ofertar" del comparador: con panel, elige al jugador y lleva el foco al campo; sin panel, su ficha en Contrato y mercado
  const offer = (p: Player) => { setCmp(null); if (wide) onPick(p, 'key'); else nav({ page: 'player', id: p.id, tab: 'contrato' }) }
  const others = marked.filter(x => x !== picked)
  const table = <PlayerTable id={id} players={list} views={['ojeo', 'general', 'contrato', 'stats', 'fisico']} def="ojeo" defSort={[{ k: 'val', d: -1 }]} bulk={scoutBulk(g)} limit={50}
    empty={typeof empty === 'string' ? empty : ''} onPick={wide ? onPick : undefined} picked={picked} onSel={setMarked} onOffer={offer} openTab={wide ? undefined : 'contrato'} gridLabel={id === 'market' ? 'Jugadores del mercado' : 'Jugadores en seguimiento'} />
  // sin jugadores no hay panel: no tiene sentido explicar cómo elegir en una tabla vacía
  const side = wide && list.length > 0
  return <div className={`mk-search ${side ? 'wide' : ''}`}>
    <div className="mk-tablecol">
      {table}
      {!list.length && typeof empty !== 'string' && <div className="mk-empty">{empty}</div>}
    </div>
    {side && <div className="mk-sidecol" onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.modal') && picked != null) { e.preventDefault(); (document.querySelector(`.mk .ptable tr[data-pid="${picked}"]`) as HTMLElement | null)?.focus() } }}>
      <SidePanel p={picked != null ? g.players[picked] : undefined} busy={busy} onCompare={() => picked != null && setCmp([picked, ...others].slice(0, 3))}
        cmpWhy={others.length ? undefined : 'Marcá 1 o 2 jugadores en la tabla para compararlos con él.'} />
    </div>}
    {cmp && cmp.length >= 2 && <Compare ids={cmp} onClose={() => setCmp(null)} onOffer={offer} />}
  </div>
}

// ---------- Tratos ----------
type Flash = { key: string; group: string; title: string; r: Res; saveErr?: boolean }
function Deals({ busy }: { busy: boolean }) {
  const { g, route, nav, save, refresh } = useGame()
  const G = dealsOf(g)
  const decisions = pendingAll(g).filter(p => p.k === 'offer' || p.k === 'deal')
  const [flash, setFlash] = useState<Flash | null>(null)
  const [hist, setHist] = useState(20)
  const [neg, setNeg] = useState<{ pid: number; dealId?: number; mode: 'buy' | 'renew' } | null>(null)
  const keys = new Set([...G.respond.map(r => r.key), ...G.waiting.map(d => `deal${d.id}`), ...G.close.map(d => `deal${d.id}`), ...G.renew.map(p => `renew${p.id}`), ...G.history.map(d => `deal${d.id}`)])
  const sel = route.sel && (keys.has(route.sel) || route.sel === flash?.key) ? route.sel : decisions[0]?.key ?? (G.waiting[0] ? `deal${G.waiting[0].id}` : null)
  const pick = (k: string) => { if (k !== route.sel) nav({ page: 'market', tab: 'tratos', sel: k }) }
  // un trato terminal pedido por la ruta puede estar más abajo de los 20 más recientes del historial: se cargan hasta él
  const hi = route.sel ? G.history.findIndex(d => `deal${d.id}` === route.sel) : -1
  const upto = Math.max(hist, Math.ceil((hi + 1) / 20) * 20)
  const focusReq = useRef<string | null>(null)
  const mounted = useRef(false), downAt = useRef(0)
  useEffect(() => {
    // al llegar con una selección explícita (insignia, "Ver todos los tratos", Atrás), el foco va al título de esa tarjeta; un cambio de pestaña
    // no trae `sel` y deja el foco en la pestaña (nunca en un botón que decide)
    if (!mounted.current) { mounted.current = true; if (route.sel && keys.has(route.sel)) focusReq.current = `card:${route.sel}` }
    const r = focusReq.current
    if (!r) return
    focusReq.current = null
    let el: HTMLElement | null = null
    if (r === 'next') el = document.querySelector<HTMLElement>('.mk-card [data-next]') ?? document.querySelector<HTMLElement>('.mk-card.done .ib-result')
    else if (r.startsWith('card:')) { const c = document.querySelector<HTMLElement>(`[data-k="${r.slice(5)}"]`); el = c?.querySelector<HTMLElement>('.mk-card-t[tabindex]') ?? c }
    else if (r.startsWith('prim:')) { const c = document.querySelector<HTMLElement>(`[data-k="${r.slice(5)}"]`); el = c?.querySelector<HTMLElement>('[data-primary]:not(:disabled)') ?? c?.querySelector<HTMLElement>('.ib-result') ?? null }
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: r.startsWith('card:') ? 'center' : 'nearest' }) }
  })
  /** Una acción del motor sobre un trato: guarda, deja la nota y, si quedó resuelto, el estado "Resuelto" en su lugar. */
  const runOn = (key: string, group: string, title: string) => (fn: () => Res) => {
    const r = fn()
    setFlash({ key, group, title, r })
    save().then(ok => { if (!ok) setFlash(f => (f && f.key === key ? { ...f, saveErr: true } : f)) })
    focusReq.current = r.resolved === false ? `prim:${key}` : 'next'
    if (route.sel !== key) nav({ page: 'market', tab: 'tratos', sel: key })
    refresh()
  }
  const nextDec = decisions.find(p => p.key !== flash?.key)
  const goNext = () => { if (!nextDec) return; setFlash(null); focusReq.current = `card:${nextDec.key}`; nav({ page: 'market', tab: 'tratos', sel: nextDec.key }) }
  // el "Resuelto" se va al elegir otra tarjeta: con el clic (ya cayó, la lista puede moverse) o con el foco de Tab (no del mousedown)
  const leave = (k: string) => { if (flash && flash.key !== k) setFlash(null) }
  const cardProps = (k: string, label: string, extra = '') => ({
    'data-k': k, role: 'group', 'aria-label': label, 'aria-current': k === sel ? true : undefined, className: `mk-card ${extra}`,
    onMouseDown: () => { downAt.current = Date.now() },
    onClick: () => { leave(k); pick(k) }, onFocus: () => { if (Date.now() - downAt.current > 400) leave(k); pick(k) },
  })
  const openKeys = new Set([...G.respond.map(r => r.key), ...G.waiting.map(d => `deal${d.id}`), ...G.close.map(d => `deal${d.id}`)])
  const ghost = (group: string) => flash && flash.group === group && flash.r.resolved !== false && !openKeys.has(flash.key)
    ? <div {...cardProps(flash.key, `Resuelto. ${flash.title}`, 'done')}>
      <div className="mk-dv-h"><span className="mk-st ok">{MI.ok}Resuelto</span><b className="mk-card-t" tabIndex={-1}>{flash.title}</b></div>
      <ResultNote r={flash.r} saveErr={flash.saveErr} />
      {nextDec && <button className="btn primary ib-next" data-next onClick={goNext}>Siguiente para responder{MI.next}</button>}
    </div> : null
  const flashFor = (k: string) => (flash?.key === k && openKeys.has(k) ? <ResultNote r={flash.r} saveErr={flash.saveErr} /> : null)
  const ghostKey = flash && !keys.has(flash.key) ? flash.key : null
  return <div className="mk-deals">
    <GH id="resp" title="Para responder" n={G.respond.length} dec sub="Ofertas por tus jugadores y contraofertas a las tuyas. Las que vencen antes, arriba."
      more={<button className="btn sm" onClick={() => nav({ page: 'squad', tab: 'transferibles' })}>Ver tus transferibles y quienes quieren irse</button>}>
      {ghost('resp')}
      {G.respond.map(r => r.k === 'offer'
        ? <OfferCard key={r.key} row={r} cp={cardProps(r.key, `Para responder. Oferta de ${r.o.fromName} por ${g.players[r.o.pid]?.name}`, 'dec')} active={r.key === sel} busy={busy} run={runOn(r.key, 'resp', `Oferta de ${r.o.fromName} por ${g.players[r.o.pid]?.name ?? ''}`)} note={flashFor(r.key)} />
        : <DealCard key={r.key} d={r.d} cp={cardProps(r.key, `Para responder. Contraoferta de ${r.d.clubName} por ${r.d.name}`, 'dec')} active={r.key === sel} busy={busy} run={runOn(r.key, 'resp', `Contraoferta de ${r.d.clubName} por ${r.d.name}`)} onNeg={() => {}} note={flashFor(r.key)} />)}
      {!G.respond.length && ghostKey == null && <div className="mk-empty">No hay ofertas por tus jugadores ni contraofertas. Con el libro abierto los clubes del país y del exterior ofertan; si declarás transferible a alguno, llegan más.</div>}
    </GH>
    <GH id="wait" title="Esperando respuesta" n={G.waiting.length} sub="Ofertas tuyas que el club todavía no contestó (no son decisiones).">
      {ghost('wait')}
      {G.waiting.map(d => <DealCard key={d.id} d={d} cp={cardProps(`deal${d.id}`, `Esperando respuesta de ${d.clubName} por ${d.name}`, 'wait')} active={`deal${d.id}` === sel} busy={busy} run={runOn(`deal${d.id}`, 'wait', `Oferta por ${d.name} (${d.clubName})`)} onNeg={() => {}} note={flashFor(`deal${d.id}`)} />)}
      {!G.waiting.length && <div className="mk-empty">No tenés ofertas esperando respuesta. Cuando ofertes por un jugador, el club contesta en 1 a 3 días y la oferta espera acá.</div>}
    </GH>
    <GH id="close" title="Para cerrar" n={G.close.length} dec sub="Acuerdos con el club: falta el contrato con el jugador o tu confirmación.">
      {ghost('close')}
      {G.close.map(d => <DealCard key={d.id} d={d} cp={cardProps(`deal${d.id}`, `Para cerrar. ${d.side === 'loan' ? 'Préstamo acordado' : 'Acuerdo'} con ${d.clubName} por ${d.name}`, 'dec')} active={`deal${d.id}` === sel} busy={busy} run={runOn(`deal${d.id}`, 'close', `Acuerdo con ${d.clubName} por ${d.name}`)} onNeg={() => setNeg({ pid: d.pid, dealId: d.id, mode: 'buy' })} note={flashFor(`deal${d.id}`)} />)}
      {!G.close.length && <div className="mk-empty">No hay acuerdos abiertos. Cuando un club acepte tu oferta, te llega un mensaje y el acuerdo aparece acá.</div>}
    </GH>
    <GH id="renew" title="Para renovar" n={G.renew.length} sub={`Contratos que vencen en diciembre de ${g.season}: si no renueva, se va libre al empezar la temporada.`}>
      {G.renew.map(p => { const blocked = !!p.negBlock && g.date < p.negBlock; return (
        <div key={p.id} {...cardProps(`renew${p.id}`, `Para renovar. ${p.name}`, 'mk-renew')}>
          <Face p={p} size={32} /><div className="grow" style={{ minWidth: 0 }}><div className="row wrap" style={{ gap: 8 }}><button className="linkish mk-card-t" data-pid={p.id} onClick={() => openPlayerC(p.id)}>{p.name}</button><PosPill p={p} /><Val p={p} />
            <span className="mk-card-m">dic {p.contractEnd} · {wm(p.wage)} por mes · {p.status ? STATUS[p.status].name : ''} · conformidad {Math.round(p.happy ?? 60)}</span></div>
            {blocked && <div className="ib-help">No quiere negociar hasta el {fmtDay(p.negBlock!)}.</div>}</div>
          <button className="btn" data-primary disabled={blocked} onClick={() => setNeg({ pid: p.id, mode: 'renew' })}>Negociar renovación</button>
        </div>) })}
      {!G.renew.length && <div className="mk-empty">Ningún contrato vence este año.</div>}
    </GH>
    <GH id="hist" title="Historial" n={0} sub={G.history.length > upto ? `${upto} más recientes` : ''}>
      {G.history.length > 0 && <div className="mk-hist">{G.history.slice(0, upto).map(d => (
        <div key={d.id} {...cardProps(`deal${d.id}`, `${fmtDay(d.updated)}. ${dealStateText(d)}. ${d.name}, ${d.clubName}`, 'mk-hist-row')} tabIndex={-1}>
          <span className="mk-hist-d">{fmtDay(d.updated)}</span><StateChip d={d} />
          <span className="grow mk-hist-t">{d.side === 'sell' ? `${d.name} · ${d.clubName} · ${money(d.fee)}` : `${d.name} · ${d.clubName} · ${money(d.fee)}${d.side === 'loan' ? ' (préstamo)' : ''}`}<span className="dim"> · {dealStateText(d)}</span></span>
          {g.players[d.pid] && <button className="btn sm" data-pid={d.pid} onClick={() => openPlayerC(d.pid)}>Ver la ficha</button>}
        </div>))}</div>}
      {G.history.length > upto && <button className="btn sm mk-more" onClick={() => setHist(upto + 20)}>Mostrar 20 más</button>}
      {!G.history.length && <div className="mk-empty">Todavía no cerraste ningún trato.</div>}
    </GH>
    {neg && g.players[neg.pid] && <NegotiationModal p={g.players[neg.pid]} mode={neg.mode} dealId={neg.dealId} onClose={m => {
      const key = neg.mode === 'renew' ? `renew${neg.pid}` : `deal${neg.dealId}`, pl = g.players[neg.pid]
      setNeg(null)
      if (m) { setFlash({ key, group: neg.mode === 'renew' ? 'renew' : 'close', title: neg.mode === 'renew' ? `Renovación de ${pl?.name}` : `Acuerdo por ${pl?.name}`, r: { text: m.text, tone: m.tone } }); focusReq.current = 'next' }
      refresh()
    }} />}
  </div>
  function openPlayerC(id: number) { nav({ page: 'player', id, tab: 'contrato' }) }
}

/** Encabezado de grupo: los que piden decisión con tinte ámbar e ícono; el número en una píldora; el enlace como botón debajo. */
const GH = ({ id, title, n, sub, dec, more, children }: { id: string; title: string; n: number; sub: ReactNode; dec?: boolean; more?: ReactNode; children: ReactNode }) =>
  <section className="mk-group" aria-labelledby={`mk-g-${id}`}>
    <div className={`mk-gh ${dec && n > 0 ? 'dec' : ''}`}>
      <h3 id={`mk-g-${id}`}>{dec && n > 0 && <span className="mk-gh-i">{MI.bang}</span>}{title}{n > 0 && <span className={`mk-cnt ${dec ? 'dec' : ''}`}><span className="vh">: </span>{n}</span>}</h3>
      {sub && <span className="mk-gh-s">{sub}</span>}
      {more && <div className="mk-gh-more">{more}</div>}
    </div>
    {children}
  </section>

/** Entidades de la tarjeta: las mismas tarjetas de jugador y club que la bandeja. */
const Ents = ({ pid, cid, name }: { pid?: number; cid?: number; name?: string }) => <><PlayerCard pid={pid} /><ClubCard cid={cid} name={name} /></>

function OfferCard({ row, cp, active, busy, run, note }: { row: Extract<DealRow, { k: 'offer' }>; cp: object; active: boolean; busy: boolean; run: (fn: () => Res) => void; note: ReactNode }) {
  const { g } = useGame()
  const m = offerModel(g, row.o, run)
  if (!m) return null
  return <div {...cp}><DealView m={m} ents={<Ents pid={row.o.pid} cid={row.o.from || undefined} name={row.o.fromName} />} busy={busy} run={run} active={active} note={note} /></div>
}

function DealCard({ d, cp, active, busy, run, onNeg, note }: { d: Deal; cp: object; active: boolean; busy: boolean; run: (fn: () => Res) => void; onNeg: () => void; note: ReactNode }) {
  const { g } = useGame()
  const m = dealModel(g, d, run, onNeg)
  // la espera es compacta: una línea, sin entidades (no es una decisión)
  return <div {...cp}><DealView m={m} ents={d.state === 'waiting' ? undefined : <Ents pid={g.players[d.pid] ? d.pid : undefined} cid={d.clubId || undefined} name={d.clubName} />} busy={busy} run={run} active={active} note={note} /></div>
}

// ---------- Movimientos ----------
function Moves() {
  const { g, openPlayer } = useGame()
  const [mine, setMine] = useSticky('mk.moves', 0)
  const [n, setN] = useState(80)
  const list = mine === 0 ? g.transfers.filter(t => t.mine) : g.transfers
  return <div className="col" style={{ gap: 10 }}>
    <div><Seg label="Movimientos" value={mine} options={['Mis pases', 'Todos']} onChange={setMine} /></div>
    <div className="card mk-moves"><table><thead><tr><th>Fecha</th><th>Jugador</th><th className="hide-sm">Desde</th><th>Hacia</th><th className="r">Monto</th></tr></thead>
      <tbody>{list.slice(0, n).map((t, i) => <tr key={i} data-pid={g.players[t.pid] ? t.pid : undefined} className={`${g.players[t.pid] ? 'click' : ''} ${t.mine ? 'me' : ''}`} onClick={() => g.players[t.pid] && openPlayer(t.pid)}><td className="dim">{fmtDate(t.date)}</td><td><b style={{ fontWeight: 600 }}>{t.name}</b>{t.mine && <> <span className="mk-st">Tuyo</span></>}</td><td className="hide-sm">{t.from}</td><td>{t.to}</td><td className="r num">{t.loan ? 'Préstamo' : t.fee ? money(t.fee) : 'Libre'}</td></tr>)}</tbody></table>
      {!list.length && <div className="mk-empty">{mine === 0 ? 'Todavía no hiciste ningún pase en tu carrera.' : 'Todavía no hubo movimientos en este mercado.'}</div>}
      {list.length > n && <button className="btn sm mk-more" onClick={() => setN(n + 80)}>Mostrar 80 más</button>}</div>
  </div>
}

// ---------- Presupuesto ----------
function Budget() {
  const { g, go } = useGame()
  const c = g.clubs[g.userClubId], L = c.ledger, com = committed(g), bill = wageBill(g, c.id)
  const inc = L.gate + L.tv + L.prizes + L.sales, out = L.wages + L.buys, res = inc - out
  const Meter = ({ l, used, com: cm = 0, total, v, s, limit, over }: { l: string; used: number; com?: number; total: number; v: string; s: ReactNode; limit: string; over?: boolean }) => {
    const u = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 100, k = total > 0 ? Math.max(0, Math.min(100 - u, (cm / total) * 100)) : 0
    return <div className="mk-meter"><div className="row between"><span className="mk-kpi-l">{l}</span><b className={`num ${over ? 'bad' : ''}`}>{v}</b></div>
      <div className={`mk-bar ${over ? 'over' : ''}`} aria-hidden="true"><i className="used" style={{ width: `${u}%` }} />{k > 0 && <i className="com" style={{ width: `${k}%` }} />}</div>
      <span className={`mk-kpi-s ${over ? 'over' : ''}`}>{s}</span><span className="ib-help">{limit}</span></div>
  }
  const Row = ({ l, v, sign }: { l: string; v: number; sign: 1 | -1 }) => <div className="mk-bal-row"><span>{l}</span><b className="num">{v ? sm(sign * v, true) : 'US$ 0'}</b></div>
  const over = bill > c.wageBudget
  return <div className="mk-budget">
    <div className="card mk-meters"><h3>Límites</h3>
      <Meter l="Presupuesto de pases" used={0} com={com} total={c.budget} v={money(c.budget - com)} s={com > 0 ? `libre para ofertar de ${money(c.budget)}; ${money(com)} comprometidos` : `libre para ofertar de ${money(c.budget)}`} limit="Limita lo que podés ofertar: una oferta mayor que lo libre no se puede enviar." />
      <div className="mk-meter"><div className="row between"><span className="mk-kpi-l">Caja</span><b className={`num ${c.balance < 0 ? 'bad' : ''}`}>{sm(c.balance)}</b></div>
        <span className="mk-kpi-s">{c.balance < 0 ? <><b className="warn">!</b> en rojo</> : 'disponible'}</span><span className="ib-help">{c.balance < 0 ? 'Con la caja en rojo no podés pagar primas de fichaje.' : 'Paga las primas de fichaje y de renovación. No tiene tope.'}</span></div>
      <Meter l="Sueldos / tope" used={bill} total={c.wageBudget} over={over} v={`${wm(bill)} / ${wm(c.wageBudget).replace('US$ ', '')}`} s={!over ? `margen ${wm(c.wageBudget - bill)} por mes` : <><b className="warn">!</b> pasaste el tope por {wm(bill - c.wageBudget)}</>} limit="Limita los sueldos que podés firmar; se controla al firmar el contrato." />
    </div>
    <div className="card mk-bal"><h3>Balance de la temporada {g.season}</h3>
      {inc === 0 && out === 0 ? <div className="mk-empty">Todavía no hubo ingresos ni gastos esta temporada. La recaudación llega con el primer partido de local y los sueldos se pagan cada mes.</div> : <>
        <div className="mk-bal-h">Ingresos</div>
        <Row l="Recaudación" v={L.gate} sign={1} /><Row l="Televisión" v={L.tv} sign={1} /><Row l="Premios" v={L.prizes} sign={1} /><Row l="Ventas de jugadores" v={L.sales} sign={1} />
        <div className="mk-bal-h">Egresos</div>
        <Row l="Sueldos, cuerpo técnico, gastos de funcionamiento y primas de renovación" v={L.wages} sign={-1} /><Row l="Compras y primas de fichaje" v={L.buys} sign={-1} />
        <div className="mk-bal-res"><span>Resultado de la temporada</span><b className={`num ${res < 0 ? 'bad' : ''}`}>{sm(res, true)}</b><span className={`mk-st ${res < 0 ? 'x' : 'ok'}`}>{res < 0 ? MI.x : MI.ok}{res >= 0 ? 'ganancia' : 'pérdida'}</span></div>
      </>}
      <div><button className="btn sm" onClick={() => go('club')}>Ver las finanzas del club</button></div>
    </div>
  </div>
}
