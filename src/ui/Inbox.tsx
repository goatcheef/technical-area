// Bandeja de entrada: todo lo que le llega al DT en un solo lugar, con las acciones en el mismo mensaje.
import { useEffect, useState, type ReactNode } from 'react'
import { acceptJob, acceptOffer, haggle, rejectOffer, windowOpen } from '../engine/career'
import { fmtDate, nextUserFixture } from '../engine/game'
import { delegatePress } from '../engine/week'
import type { Fixture, Game, News, Offer } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Badge, Face, MatchReport, PosPill, Val, money } from './common'
import { ReportModal } from './Week'

// ---------- pendientes: decisiones que esperan respuesta ----------
export type Pending =
  | { k: 'press'; key: string }
  | { k: 'offer'; key: string; o: Offer }
  | { k: 'job'; key: string; clubId: number; until: string }
  | { k: 'out'; key: string; pid: number }
  | { k: 'season'; key: string }

/** Lo que el DT tiene que decidir. Se calcula del estado, así nunca queda un pendiente viejo. */
export function pendingOf(g: Game): Pending[] {
  const out: Pending[] = []
  if (g.seasonOver) out.push({ k: 'season', key: 'season' })
  if (g.press) out.push({ k: 'press', key: `press${g.press.fixtureId}${g.press.kind}` })
  for (const o of g.jobOffers ?? []) if (o.until >= g.date) out.push({ k: 'job', key: `job${o.clubId}`, clubId: o.clubId, until: o.until })
  for (const o of g.offers) if (g.players[o.pid]) out.push({ k: 'offer', key: `offer${o.id}`, o })
  for (const p of Object.values(g.players)) if (p.clubId === g.userClubId && p.wantsOut && !p.listed) out.push({ k: 'out', key: `out${p.id}`, pid: p.id })
  return out
}
/** "Tenés una conferencia y 2 ofertas pendientes". */
export function pendingText(ps: Pending[]): string {
  const n = (k: Pending['k']) => ps.filter(p => p.k === k).length
  const parts: string[] = []
  if (n('season')) parts.push('la nueva temporada')
  if (n('press')) parts.push('una conferencia')
  if (n('job')) parts.push(n('job') > 1 ? `${n('job')} ofertas de trabajo` : 'una oferta de trabajo')
  if (n('offer')) parts.push(n('offer') > 1 ? `${n('offer')} ofertas por jugadores` : 'una oferta por un jugador')
  if (n('out')) parts.push(n('out') > 1 ? `${n('out')} jugadores que quieren irse` : 'un jugador que quiere irse')
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0] ?? ''
}
/** Las decisiones que frenan el avance hasta el partido cuando aparecen. */
export const decisionKeys = (g: Game) => new Set(pendingOf(g).filter(p => p.k !== 'season').map(p => p.key))

// ---------- categorías ----------
const isMine = (g: Game, n: News) => n.me ?? n.clubId === g.userClubId
const CATS: [string, string, (g: Game, n: News) => boolean][] = [
  ['me', 'Para vos', isMine],
  ['pend', 'Pendientes', () => false],
  ['plantel', 'Plantel', (g, n) => isMine(g, n) && (n.tag === 'lesion' || (n.tag === 'club' && n.pid != null) || n.act === 'out' || n.act === 'train')],
  ['mercado', 'Mercado', (_, n) => n.tag === 'mercado'],
  ['partido', 'Partidos', (g, n) => n.tag === 'partido' || n.act === 'rival'],
  ['torneo', 'Torneos', (_, n) => n.tag === 'torneo' || n.tag === 'premio'],
  ['all', 'Todo el fútbol', () => true],
]
const TAG: Record<string, string> = { partido: 'Partido', torneo: 'Torneo', lesion: 'Parte médico', club: 'Club', mercado: 'Mercado', premio: 'Premio', directiva: 'Dirigencia' }
export const unreadOf = (g: Game) => g.news.reduce((s, n) => s + (!n.read && isMine(g, n) ? 1 : 0), 0)

type Sel = { k: 'n'; id: number } | { k: 'p'; key: string }

export function Inbox({ tab }: { tab?: string }) {
  const { g, refresh, save, nav } = useGame()
  const [cat, setCat] = useSticky('ib.cat', 'me')
  const [sel, setSel] = useState<Sel | null>(null)
  const pend = pendingOf(g)
  const cur = tab ?? cat
  const def = CATS.find(c => c[0] === cur) ?? CATS[0]
  const showPend = cur === 'me' || cur === 'pend'
  const list = cur === 'pend' ? [] : g.news.filter(n => def[2](g, n)).slice(0, 120)
  const rows: Sel[] = [...(showPend ? pend.map(p => ({ k: 'p' as const, key: p.key })) : []), ...list.map(n => ({ k: 'n' as const, id: n.id }))]
  // la selección por defecto es lo primero de la lista; si lo elegido desapareció (oferta respondida), también
  const valid = sel && rows.some(r => (r.k === 'n' && sel.k === 'n' && r.id === sel.id) || (r.k === 'p' && sel.k === 'p' && r.key === sel.key))
  const active = valid ? sel : rows[0] ?? null
  const done = () => { save(); refresh() }
  const pick = (s: Sel) => setSel(s) // al quedar activo se marca como leído (efecto de abajo)
  useEffect(() => { if (active?.k === 'n') { const n = g.news.find(x => x.id === active.id); if (n && !n.read) { n.read = true; done() } } }, [active?.k === 'n' ? active.id : -1])
  // ↑ ↓ recorren la lista
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') || document.querySelector('.modal')) return
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const i = rows.findIndex(r => active && r.k === active.k && (r.k === 'n' ? r.id === (active as { id: number }).id : r.key === (active as { key: string }).key))
      const nx = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
      if (nx) { pick(nx); document.querySelector(`[data-row="${nx.k === 'n' ? nx.id : nx.key}"]`)?.scrollIntoView({ block: 'nearest' }) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  const count = (c: string) => (c === 'pend' ? pend.length : c === 'me' ? unreadOf(g) + pend.length : 0)
  const setTab = (c: string) => { setCat(c); setSel(null); nav({ page: 'inbox', tab: c }) }
  const unreadHere = list.filter(n => !n.read).length
  return (
    <div className="page">
      <div className="row wrap" style={{ gap: 12 }}>
        <h2 className="grow">Bandeja de entrada</h2>
        {pend.length > 0 && <span className="chip warn">Pendiente: {pendingText(pend)}</span>}
        {unreadHere > 0 && <button className="btn sm" onClick={() => { list.forEach(n => (n.read = true)); done() }}>Marcar {unreadHere} como leídas</button>}
      </div>
      <div className="tabs">{CATS.map(([k, l]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{count(k) > 0 && <span className="cnt">{count(k)}</span>}</button>)}</div>
      <div className="inbox">
        <div className="ib-list card">
          {showPend && pend.map(p => <PendRow key={p.key} p={p} on={active?.k === 'p' && active.key === p.key} onClick={() => pick({ k: 'p', key: p.key })} />)}
          {showPend && pend.length > 0 && list.length > 0 && <div className="ib-sep">Mensajes</div>}
          {list.map(n => (
            <button key={n.id} data-row={n.id} className={`ib-row ${active?.k === 'n' && active.id === n.id ? 'on' : ''} ${n.read ? '' : 'unread'}`} onClick={() => pick({ k: 'n', id: n.id })}>
              <span className="ib-ico">{n.pid != null && g.players[n.pid] ? <Face p={g.players[n.pid]} size={30} /> : n.clubId != null && g.clubs[n.clubId] ? <Badge club={g.clubs[n.clubId]} size={28} /> : <span className="chip">{TAG[n.tag]?.[0]}</span>}</span>
              <span className="grow" style={{ minWidth: 0 }}><span className="ib-title">{n.title}</span><span className="dim sm ib-meta">{TAG[n.tag]}{n.act && ACT_LABEL[n.act] ? ` · ${ACT_LABEL[n.act]}` : ''}</span></span>
              <span className="dim sm num">{fmtDate(n.date).replace(/ \d{4}$/, '')}</span>
            </button>))}
          {!rows.length && <div className="dim sm" style={{ padding: 16 }}>{cur === 'pend' ? 'No tenés nada pendiente.' : 'No hay mensajes en esta categoría.'}</div>}
        </div>
        <div className="ib-read card">
          {active?.k === 'n' ? <Message n={g.news.find(x => x.id === active.id)!} /> : active?.k === 'p' ? <PendDetail p={pend.find(x => x.key === active.key)!} /> : <div className="dim">Elegí un mensaje.</div>}
        </div>
      </div>
    </div>
  )
}

const ACT_LABEL: Record<string, string> = { offer: 'para responder', job: 'oferta de trabajo', out: 'quiere irse', scout: 'informe', rival: 'informe', train: 'informe', result: 'ver informe', injury: '' }

function PendRow({ p, on, onClick }: { p: Pending; on: boolean; onClick: () => void }) {
  const { g } = useGame()
  let ico: ReactNode = null, title = '', meta = ''
  if (p.k === 'press') { title = `Conferencia de prensa ${g.press?.kind === 'pre' ? 'previa' : 'después del partido'}`; meta = 'Si no respondés, habla el ayudante' }
  else if (p.k === 'offer') { const pl = g.players[p.o.pid]; ico = <Face p={pl} size={30} />; title = `${p.o.fromName} ofrece ${money(p.o.fee)} por ${pl.name}`; meta = `Vence el ${fmtDate(addDaysS(p.o.date, 8))}` }
  else if (p.k === 'job') { const c = g.clubs[p.clubId]; ico = <Badge club={c} size={28} />; title = `${c.name} te quiere como DT`; meta = `Respondé antes del ${fmtDate(p.until)}` }
  else if (p.k === 'out') { const pl = g.players[p.pid]; ico = <Face p={pl} size={30} />; title = `${pl.name} quiere irse`; meta = 'Hablale o declaralo transferible' }
  else { title = `Terminó la temporada ${g.season}`; meta = 'Comenzá la próxima desde acá' }
  return <button data-row={p.key} className={`ib-row pend ${on ? 'on' : ''}`} onClick={onClick}><span className="ib-ico">{ico ?? <span className="chip warn">!</span>}</span><span className="grow" style={{ minWidth: 0 }}><span className="ib-title">{title}</span><span className="warn sm ib-meta">{meta}</span></span></button>
}
const addDaysS = (d: string, n: number) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }

// ---------- lectura y acciones ----------
function Who({ pid, clubId }: { pid?: number; clubId?: number }) {
  const { g, openPlayer, openClub } = useGame()
  const p = pid != null ? g.players[pid] : undefined, c = clubId != null ? g.clubs[clubId] : undefined
  if (!p && !c) return null
  return <div className="row wrap" style={{ gap: 8 }}>
    {p && <button className="linkish row ib-who" data-pid={p.id} onClick={() => openPlayer(p.id)}><Face p={p} size={34} /><span><b>{p.name}</b><span className="dim sm" style={{ display: 'block' }}>{g.clubs[p.clubId]?.short}</span></span><PosPill p={p} /><Val p={p} /></button>}
    {c && (!p || p.clubId !== c.id) && <button className="linkish row ib-who" data-cid={c.id} onClick={() => openClub(c.id)}><Badge club={c} size={30} /><b>{c.name}</b></button>}
  </div>
}

function OfferActions({ o }: { o: Offer }) {
  const { g, save, refresh } = useGame()
  const [note, setNote] = useState('')
  const p = g.players[o.pid], open = windowOpen(g.date)
  const done = (m: string) => { setNote(m); save(); refresh() }
  return <>
    <div className="row wrap" style={{ gap: 18 }}>
      <div className="kpi"><h3>Oferta</h3><b>{money(o.fee)}</b></div><div className="kpi"><h3>Valor</h3><b>{money(p.value)}</b></div>
      <div className="kpi"><h3>Sueldo</h3><b>{money(p.wage)}</b></div><div className="kpi"><h3>Contrato</h3><b>dic {p.contractEnd}</b></div>
    </div>
    <div className="row wrap">
      <button className="btn primary" disabled={!open} title={open ? '' : 'El libro de pases está cerrado'} onClick={() => { acceptOffer(g, o); done(`Vendiste a ${p.name} a ${o.fromName} por ${money(o.fee)}.`) }}>Aceptar</button>
      <button className="btn" onClick={() => { const ok = haggle(g, o); done(ok ? `${o.fromName} mejoró su oferta.` : `${o.fromName} se retiró de la negociación.`) }}>Pedir más</button>
      <button className="btn danger" onClick={() => { rejectOffer(g, o); done('Rechazaste la oferta.') }}>Rechazar</button>
    </div>
    {note && <div className="acc sm">{note}</div>}
  </>
}

function PendDetail({ p }: { p: Pending }) {
  const { g, save, refresh, openPress, nav, openClub } = useGame()
  const done = () => { save(); refresh() }
  if (!p) return null
  if (p.k === 'press') return <div className="col">
    <h3>Conferencia de prensa</h3><h2>{g.press!.kind === 'pre' ? 'Antes del partido' : 'Después del partido'}</h2>
    <div className="col" style={{ gap: 6 }}>{g.press!.questions.map((q, i) => <div key={i} className="dim">«{q.q}»</div>)}</div>
    <div className="row wrap"><button className="btn primary" onClick={openPress}>Responder</button><button className="btn" onClick={() => { delegatePress(g); done() }}>Que hable el ayudante</button></div>
  </div>
  if (p.k === 'offer') return <div className="col"><h3>Oferta por un jugador</h3><h2>{p.o.fromName} ofrece {money(p.o.fee)}</h2><Who pid={p.o.pid} clubId={p.o.from || undefined} /><OfferActions o={p.o} /></div>
  if (p.k === 'job') { const c = g.clubs[p.clubId]; return <div className="col">
    <h3>Oferta de trabajo</h3><h2>{c.name} te quiere como DT</h2><Who clubId={c.id} />
    <div className="dim">{['Exterior', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][c.division]} · reputación {c.rep} · presupuesto {money(c.budget)}. Tenés tiempo hasta el {fmtDate(p.until)}.</div>
    <div className="row wrap"><button className="btn primary" onClick={() => { acceptJob(g, c.id); done() }}>Aceptar</button><button className="btn" onClick={() => { g.jobOffers = (g.jobOffers ?? []).filter(x => x.clubId !== c.id); done() }}>Rechazar</button><button className="btn" onClick={() => openClub(c.id)}>Ver el club</button></div>
  </div> }
  if (p.k === 'out') { const pl = g.players[p.pid]; return <div className="col">
    <h3>Vestuario</h3><h2>{pl.name} quiere irse</h2><Who pid={pl.id} />
    <div className="dim">Está disconforme con su lugar en el plantel (conformidad {Math.round(pl.happy ?? 50)}). Podés hablarle para prometerle minutos o declararlo transferible para que lleguen ofertas.</div>
    <div className="row wrap"><button className="btn primary" onClick={() => nav({ page: 'player', id: pl.id, tab: 'personal' })}>Hablar con él</button><button className="btn" onClick={() => { pl.listed = true; done() }}>Declararlo transferible</button></div>
  </div> }
  return <div className="col"><h3>Temporada</h3><h2>Terminó la temporada {g.season}</h2><div className="dim">El resumen está en el inicio.</div><div><button className="btn primary" onClick={() => nav({ page: 'home' })}>Ir al inicio</button></div></div>
}

function Message({ n }: { n: News }) {
  const { g, save, refresh, go, nav, openPlayer, openClub } = useGame()
  const [rep, setRep] = useState<Fixture | null>(null)
  const [scout, setScout] = useState<Fixture | null>(null)
  if (!n) return null
  const club = g.clubs[g.userClubId]
  let acts: ReactNode = null
  if (n.act === 'offer') { const o = g.offers.find(x => x.id === n.ref); acts = o && g.players[o.pid] ? <OfferActions o={o} /> : <div className="dim sm">Esta oferta ya fue respondida o venció.</div> }
  else if (n.act === 'job') { const o = (g.jobOffers ?? []).find(x => x.clubId === n.ref && x.until >= g.date); acts = o ? <div className="row wrap"><button className="btn primary" onClick={() => { acceptJob(g, o.clubId); save(); refresh() }}>Aceptar</button><button className="btn" onClick={() => { g.jobOffers = (g.jobOffers ?? []).filter(x => x.clubId !== o.clubId); save(); refresh() }}>Rechazar</button><button className="btn" onClick={() => openClub(o.clubId)}>Ver el club</button></div> : <div className="dim sm">La oferta ya no está vigente.</div> }
  else if (n.act === 'out' && n.pid != null && g.players[n.pid]) { const p = g.players[n.pid]; acts = p.wantsOut ? <div className="row wrap"><button className="btn primary" onClick={() => nav({ page: 'player', id: p.id, tab: 'personal' })}>Hablar con él</button>{!p.listed && <button className="btn" onClick={() => { p.listed = true; save(); refresh() }}>Declararlo transferible</button>}</div> : <div className="dim sm">Ya no pide irse.</div> }
  else if (n.act === 'scout' && n.pid != null && g.players[n.pid]) acts = <div className="row wrap"><button className="btn primary" onClick={() => openPlayer(n.pid!)}>Ver la ficha</button>{g.players[n.pid].clubId !== g.userClubId && <button className="btn" onClick={() => nav({ page: 'player', id: n.pid!, tab: 'contrato' })}>Ofertar</button>}</div>
  else if (n.act === 'rival') { const nx = nextUserFixture(g); acts = nx && nx.id === n.ref ? <button className="btn primary" onClick={() => setScout(nx)}>Ver el informe del rival</button> : <div className="dim sm">Ese partido ya se jugó.</div> }
  else if (n.act === 'train') acts = <button className="btn" onClick={() => go('training')}>Ir a Entrenamiento</button>
  else if (n.act === 'result') { const f = g.fixtures.find(x => x.id === n.ref); if (f) acts = <button className="btn primary" onClick={() => setRep(f)}>Ver el informe del partido</button> }
  else if (n.tag === 'torneo') acts = <button className="btn" onClick={() => go('tables')}>Ver posiciones</button>
  return <div className="col">
    <div className="row between"><h3>{TAG[n.tag]}</h3><span className="dim sm">{fmtDate(n.date)}</span></div>
    <h2 style={{ textTransform: 'none', fontSize: '1.5rem' }}>{n.title}</h2>
    <Who pid={n.pid} clubId={n.clubId} />
    <p className="ib-body">{n.body}</p>
    {acts}
    {rep && <MatchReport g={g} f={rep} onClose={() => setRep(null)} />}
    {scout && <ReportModal f={scout} onClose={() => setScout(null)} onApply={pp => { Object.assign(club.tactic, pp); save(); refresh() }} />}
  </div>
}
