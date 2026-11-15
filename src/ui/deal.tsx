// Piezas del mercado compartidas por el Mercado, la ficha y la bandeja (design/ux/mercado.md 5.3; production/ui/mercado/visual-design.md 4.8-4.10):
// la oferta (`BidBox`), la decisión de un trato (`dealModel` + `ImproveBlock`), el impacto antes → después y la fila de acciones con confirmación
// en el lugar. Mismo texto y mismas llamadas al motor en todos lados; la pantalla nunca escribe en `g`.
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  MAX_BIDS, acceptCounter, answerWindow, askingPrice, bidBlock, bidCheck, blockDate, cancelDeal, clubCool, committed, dealImpact, divName,
  acceptOffer, haggle, improveBid, loanFee, offerDeadline, openBids, openDealFor, placeBid, rejectOffer, signDeal, windowOpen, windowState, withdrawBid, type DealImpact,
} from '../engine/career'
import { daysBetween, fmtDay, squadOf } from '../engine/game'
import { STATUS, demandWage, knowOf, potentialText, scoutEta, scout, toggleShortlist, wageShown } from '../engine/squad'
import type { Deal, Game, Offer, Player } from '../engine/types'
import { useGame } from '../store'
import { Badge, Face, PosPill, Val, dec, money } from './common'
import { NegotiationModal } from './Locker'

// ---------- textos ----------
/** Miles con un decimal para sueldos ("US$ 8,7 mil"); desde un millón, `money`. */
const k1 = (v: number) => dec(v / 1000, v % 1000 === 0 || v >= 100000 ? 0 : 1)
export const wm = (v: number) => (Math.abs(v) >= 1e6 ? money(v) : `US$ ${k1(v)} mil`)
/** Rango de sueldo: "US$ 4,9–8,6 mil" (exacto si no es rango). */
export const wr = (r: [number, number]) => (r[0] === r[1] ? wm(r[0]) : r[1] >= 1e6 ? `${money(r[0])}–${money(r[1]).replace('US$ ', '')}` : `US$ ${k1(r[0])}–${k1(r[1])} mil`)
/** "entre US$ 5,7 y 9,9 mil" o "US$ 8,7 mil". */
export const between = (r: [number, number]) => (r[0] === r[1] ? wm(r[0]) : r[1] >= 1e6 ? `entre ${money(r[0])} y ${money(r[1]).replace('US$ ', '')}` : `entre US$ ${k1(r[0])} y ${k1(r[1])} mil`)
/** Plata con signo: "−US$ 1,64 M" (U+2212 antes de la moneda), "+US$ 20 mil" si `plus`. Mismo formato en el impacto, la franja y el balance. */
export const sm = (v: number, plus = false) => `${v < 0 ? '−' : v > 0 && plus ? '+' : ''}${money(Math.abs(v))}`
const pct = (a: number, b: number) => { const v = Math.round((a / Math.max(1, b) - 1) * 100); return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} %` }

/** Plazo en palabras con la fecha: "Vence hoy", "Vence mañana (el 19 ene)", "Vence el 19 ene (en 5 días)". */
export function dueText(deadline: string, today: string): { text: string; short: boolean } {
  const n = daysBetween(today, deadline)
  if (n <= 0) return { text: 'Vence hoy', short: true }
  if (n === 1) return { text: `Vence mañana (el ${fmtDay(deadline)})`, short: true }
  return { text: `Vence el ${fmtDay(deadline)} (en ${n} días)`, short: false }
}

/** Estado del libro para la franja: la línea principal y el detalle. */
export function bookOf(g: Game): { open: boolean; soon: boolean; urgent: boolean; v: string; d: string; say: string } {
  const ws = windowState(g.date)
  if (!ws.open) {
    const d = ws.nextSeason || !ws.opensOn ? `reabre al comenzar la temporada ${g.season + 1} (10 ene)` : `reabre el ${fmtDay(ws.opensOn)} · faltan ${ws.daysToOpen} días`
    return { open: false, soon: false, urgent: false, v: 'Cerrado', d, say: `Libro cerrado, ${d}` }
  }
  const n = ws.daysLeft ?? 0, close = fmtDay(ws.closesOn!)
  const d = n === 0 ? 'cierra hoy' : n === 1 ? 'cierra mañana' : n <= 7 ? `cierra en ${n} días (el ${close})` : `cierra el ${close} · quedan ${n} días`
  return { open: true, soon: n <= 7, urgent: n <= 1, v: 'Abierto', d, say: `Libro abierto, ${d}` }
}

/** Estado de un trato en texto (historial, tarjetas, mensajes que ya no son la decisión vigente). */
export function dealStateText(d: Deal): string {
  const last = d.steps[d.steps.length - 1]?.text ?? ''
  const bu = d.blockUntil ? ` · bloqueado hasta el ${fmtDay(d.blockUntil)}` : ''
  if (d.side === 'sell') return last
  switch (d.state) {
    case 'waiting': return `Esperando respuesta · responde entre el ${fmtDay(d.answerFrom!)} y el ${fmtDay(d.answerBy!)}`
    case 'countered': return `Contraoferta: ${d.clubName} pide ${money(d.counter ?? d.fee)} · vence el ${fmtDay(d.deadline!)}`
    case 'agreed': return d.side === 'loan' ? `Préstamo acordado · falta tu confirmación · vence el ${fmtDay(d.deadline!)}` : `Acordado con el club · falta el contrato · vence el ${fmtDay(d.deadline!)}`
    case 'refused': return `Sin acuerdo con el club: ${d.reason ?? ''}`.trim()
    case 'signed': return 'Firmado'
    case 'loaned': return 'Prestado hasta fin de temporada'
  }
  if (d.why === 'pulled') return 'Retiraste la oferta'
  if (d.why === 'cancel') return `Cancelaste el trato${bu}`
  if (d.why === 'window') return 'Caducó: se cerró el libro'
  if (d.why === 'deadline') return d.blockUntil ? `Venció el acuerdo${bu}` : 'Venció la contraoferta'
  if (d.why === 'walk') return `El representante se levantó de la mesa${bu}`
  return last
}
/** Rótulo corto del estado (chip del historial y de la columna Trato). */
export function dealLabel(d: Deal): { t: string; dec?: boolean; ico: 'wait' | 'bang' | 'ok' | 'x' | 'lock' | 'dot' | 'clock' } {
  if (d.state === 'waiting') return { t: 'Esperando', ico: 'wait' }
  if (d.state === 'countered') return { t: 'Contraoferta', dec: true, ico: 'bang' }
  if (d.state === 'agreed') return { t: 'Acordado', dec: true, ico: 'ok' }
  if (d.state === 'refused') return { t: 'Sin acuerdo', ico: 'x' }
  if (d.state === 'signed') return { t: 'Firmado', ico: 'ok' }
  if (d.state === 'loaned') return { t: 'Prestado', ico: 'ok' }
  if (d.state === 'sold') return { t: 'Vendido', ico: 'ok' }
  if (d.state === 'declined') return { t: 'Rechazada', ico: 'x' }
  if (d.state === 'withdrawn') return { t: 'Se retiró', ico: 'clock' }
  if (d.state === 'expired') return { t: 'Venció', ico: 'dot' }
  if (d.why === 'pulled') return { t: 'Retirada', ico: 'clock' }
  if (d.why === 'cancel') return { t: 'Cancelado', ico: 'lock' }
  if (d.why === 'window') return { t: 'Caducó', ico: 'dot' }
  if (d.why === 'deadline') return { t: 'Venció', ico: d.blockUntil ? 'lock' : 'dot' }
  if (d.why === 'walk') return { t: 'Se cayó', ico: 'lock' }
  return { t: d.side === 'sell' ? 'Se canceló' : 'Se cayó', ico: 'x' }
}

// ---------- íconos ----------
const S = (d: string) => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
export const MI = {
  wait: S('M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9'),
  bang: S('M12 3v11M12 19v.5'),
  ok: S('M5 12.5l4.5 4.5L19 7'),
  x: S('M6 6l12 12M18 6L6 18'),
  lock: S('M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3'),
  info: S('M12 11v6M12 7v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18'),
  dot: S('M12 12h.01'),
  clock: S('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18'),
  arrow: S('M5 12h14M14 7l5 5-5 5'),
  swap: S('M4 7h13l-3-3M20 17H7l3 3'),
  next: S('M9 6l6 6-6 6'),
}
export const StateChip = ({ d }: { d: Deal }) => { const l = dealLabel(d); return <span className={`mk-st ${l.dec ? 'dec' : ''} ${l.ico}`}>{MI[l.ico]}{l.t}</span> }

// ---------- avisos e impacto ----------
export const Note = ({ kind = 'info', children }: { kind?: 'info' | 'warn'; children: ReactNode }) => <div className={`mk-note ${kind}`}>{kind === 'warn' ? MI.bang : MI.info}<span>{children}</span></div>

/** Antes → después de lo libre para ofertar, la caja, los sueldos por mes (con el tope) y el plantel; "entra / no entra" en palabras. */
export function ImpactBox({ imp, title, kind }: { imp: DealImpact; title: string; kind: 'buy' | 'loan' | 'sell' }) {
  const V = ({ v }: { v: 'ok' | 'maybe' | 'no' }) => <span className={`mk-verdict ${v}`}>{v === 'ok' ? MI.ok : v === 'maybe' ? MI.bang : MI.x}{v === 'ok' ? 'entra' : v === 'maybe' ? 'puede no entrar' : 'no entra'}</span>
  const A = () => <span className="mk-arr">{MI.arrow}<span className="vh"> pasa a </span></span>
  // si el redondeo esconde el cambio ("US$ 37,9 M → US$ 37,9 M" por US$ 20 mil), se escribe la diferencia
  const M = ({ b, a }: { b: number; a: number }) => sm(b) === sm(a) && b !== a
    ? <><span className="b4">{sm(b)}</span> <b className="mk-delta"><span className="vh">cambia </span>{sm(a - b, true)}</b></>
    : <><span className="b4">{sm(b)}</span><A /><b>{sm(a)}</b></>
  const range = imp.wageAdd[0] !== imp.wageAdd[1]
  const after: [number, number] = [imp.wageBill[0] + imp.wageAdd[0], imp.wageBill[0] + imp.wageAdd[1]]
  return <div className="mk-impact-w">
    <div className="mk-impact-t">{title}</div>
    <table className="mk-impact"><tbody>
      <tr><th scope="row">Libre para ofertar</th><td><M b={imp.free[0]} a={imp.free[1]} /></td><td>{kind !== 'sell' && <V v={imp.free[1] >= 0 ? 'ok' : 'no'} />}</td></tr>
      <tr><th scope="row">Caja</th><td><M b={imp.balance[0]} a={imp.balance[1]} /></td><td /></tr>
      <tr><th scope="row">Sueldos por mes</th><td><span className="b4">{wm(imp.wageBill[0])}</span><A />{range ? <><span className="rng">{wr(after)}</span> <small className="mk-est">(estimado)</small></> : <b>{wm(after[0])}</b>}<small className="mk-cap">tope {wm(imp.cap)}</small></td>
        <td>{kind !== 'sell' && <V v={imp.fits === 'yes' ? 'ok' : imp.fits} />}</td></tr>
      <tr><th scope="row">Plantel</th><td><span className="b4">{imp.squad[0]}</span><A /><b>{imp.squad[1]}</b></td><td /></tr>
    </tbody></table>
  </div>
}

// ---------- acciones con confirmación en el lugar (F6) ----------
export type Res = { text: string; tone?: 'ok' | 'warn' | 'err'; resolved?: boolean }
/** Mismo formato que las acciones de la bandeja: `dec` decide sin confirmación; `nav` solo lleva a otra pantalla. */
export type DealAct = { label: ReactNode; kind?: 'primary' | 'danger'; run?: () => void; confirm?: { label: string; danger?: boolean; run: () => void }; disabled?: boolean; dec?: boolean; nav?: boolean; on?: boolean; why?: string }

export function ActRow({ acts, busy, active = true }: { acts: DealAct[]; busy: boolean; active?: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([]), conf = useRef<HTMLButtonElement>(null), back = useRef<number | null>(null)
  useEffect(() => { if (open != null) { conf.current?.focus(); conf.current?.parentElement?.scrollIntoView({ block: "nearest" }) } else if (back.current != null) { btns.current[back.current]?.focus(); back.current = null } }, [open])
  useEffect(() => { if (!active) setOpen(null) }, [active])
  const cancel = () => { back.current = open; setOpen(null) }
  const decision = acts.some(a => a.confirm || a.dec)
  // el motivo de un botón deshabilitado se dice una vez por bloque, aunque lo compartan dos botones
  const whys = [...new Set(acts.filter(a => a.disabled && a.why).map(a => a.why!))]
  return <>
    {busy && decision && <div className="ib-help">Frená el avance para decidir.</div>}
    <div className="ib-acts" onKeyDown={e => { if (e.key === 'Escape' && open != null) { e.preventDefault(); e.stopPropagation(); cancel() } }}>
      {acts.map((a, i) => open === i && a.confirm
        ? <div key={i} className={`ib-confirm ${a.confirm.danger ? 'danger' : ''}`}><button ref={conf} className={a.confirm.danger ? 'btn danger strong' : 'btn primary'} onClick={() => { setOpen(null); a.confirm!.run() }}>{a.confirm.label}</button><button className="btn" onClick={cancel}>No</button></div>
        : <button key={i} ref={el => { btns.current[i] = el }} className={`btn ${a.kind ?? ''} ${a.on ? 'on' : ''}`} aria-pressed={a.on ?? undefined} data-primary={a.kind === 'primary' || undefined}
          disabled={a.disabled || (busy && !a.nav && (!!a.confirm || !!a.dec))} onClick={() => (a.confirm ? setOpen(i) : a.run?.())}>{a.label}</button>)}
    </div>
    {whys.map((w, i) => <div key={i} className="ib-help">{w}</div>)}
  </>
}

/** Nota de resultado (F7) con el aviso de guardado fallido. */
export function ResultNote({ r, saveErr }: { r: Res | null; saveErr?: boolean }) {
  return <div role="status" className="ib-status mk-status">
    {r && <div className={`ib-result ${r.tone === 'ok' || !r.tone ? '' : r.tone}`} tabIndex={-1}><span className="ib-result-ico">{r.tone === 'err' ? MI.x : r.tone === 'warn' ? MI.bang : MI.ok}</span><span>{r.text}</span></div>}
    {saveErr && <div className="ib-result err"><span className="ib-result-ico">{MI.bang}</span><span>No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes.</span></div>}
  </div>
}

// ---------- la vista de un trato (una sola: bandeja, Tratos y caja de oferta) ----------
/** Cifra de la vista del trato; `rng`: es un rango (gris, con "estimado"). */
export type KpiT = { l: string; v: ReactNode; s?: string; key?: boolean; rng?: boolean }
export interface DealModel {
  ico: 'wait' | 'bang' | 'ok'; kind: string; due?: { text: string; short: boolean }; chip?: string; wait?: boolean
  kpis: KpiT[]; facts: ReactNode[]; notes: ReactNode[]; impact?: ReactNode; improve?: Deal; acts: DealAct[]; help: ReactNode[]
}
/**
 * Lo que muestra un trato abierto (esperando respuesta, contraoferta o acuerdo) y sus acciones: cabecera, cifras, hechos, impacto y botones.
 * Una sola fuente para la bandeja, Tratos y la caja de oferta. `run` ejecuta una llamada al motor y deja la nota; `openNeg` abre la negociación.
 */
export function dealModel(g: Game, d: Deal, run: (fn: () => Res) => void, openNeg: () => void): DealModel {
  const p = g.players[d.pid], loan = d.side === 'loan', me = g.clubs[g.userClubId], open = windowOpen(g.date), ws = windowState(g.date)
  const club = d.clubName, name = d.name
  const facts: ReactNode[] = [], notes: ReactNode[] = [], help: ReactNode[] = [], kpis: KpiT[] = []
  let acts: DealAct[] = [], impact: ReactNode = null, due: DealModel['due'], ico: DealModel['ico'] = 'bang', kind = ''
  const withdraw: DealAct = { label: 'Retirar la oferta', dec: true, run: () => run(() => (withdrawBid(g, d.id) ? { text: `Retiraste la oferta por ${name}.` } : { text: 'Esta oferta ya no está abierta.', tone: 'warn' })) }
  const cost = `${club} va a pedir un 10 % más por sus jugadores`
  const cancel: DealAct = { label: 'Cancelar el trato', confirm: { danger: true, label: `Confirmar: cancelar el trato por ${name}. No vas a poder ofertar por él hasta el ${fmtDay(blockDate(g.date))} y ${cost} hasta esa fecha.`,
    run: () => run(() => (cancelDeal(g, d.id) ? { text: `Cancelaste el trato por ${name}. No podés volver a ofertar por él hasta el ${fmtDay(blockDate(g.date))}.` } : { text: 'Este acuerdo ya no está abierto.', tone: 'warn' })) } }
  const closed = 'El libro de pases está cerrado.'
  if (d.state === 'waiting') {
    ico = 'wait'; kind = `Esperando respuesta de ${club}`
    facts.push(<>{loan ? `Pediste el préstamo con un cargo de ${money(d.fee)}` : `Ofertaste ${money(d.fee)}`} el {fmtDay(d.updated)}{d.round > 1 ? ' (mejorada)' : ''}; responde entre el {fmtDay(d.answerFrom!)} y el {fmtDay(d.answerBy!)}. {money(d.fee)} comprometidos de tu presupuesto.</>)
    if (ws.closesOn && d.answerBy! > ws.closesOn) notes.push(<Note kind="warn">El libro cierra el {fmtDay(ws.closesOn)}: si {club} contesta después, la oferta caduca.</Note>)
    acts = [withdraw]
    help.push('Para cambiar el monto, retirala y ofertá de nuevo: la espera vuelve a empezar.')
    return { ico, kind, wait: true, kpis, facts, notes: keyed(notes), acts, help }
  }
  if (d.state === 'countered') {
    const ask = d.counter ?? d.fee, free = me.budget - committed(g) + d.fee
    due = dueText(d.deadline!, g.date); kind = `Contraoferta de ${club}`
    kpis.push({ l: loan ? 'Tu cargo' : 'Tu oferta', v: money(d.fee) }, { l: 'Pide', v: money(ask), s: `${pct(ask, d.fee)} sobre tu oferta`, key: true })
    if (p) kpis.push({ l: 'Pedido público', v: money(askingPrice(g, p)) })
    kpis.push({ l: 'Libre para ofertar', v: sm(free) })
    facts.push(<>{club} no aceptó {loan ? `un cargo de ${money(d.fee)}` : money(d.fee)}.</>)
    if (p) impact = <ImpactBox imp={dealImpact(g, loan ? 'loan' : 'buy', d.pid, ask)!} kind={loan ? 'loan' : 'buy'} title={`Si aceptás ${money(ask)} y ${loan ? 'confirmás' : 'firma'}`} />
    const why = !open ? closed : ask > free ? `Te quedan libres ${money(Math.max(0, free))}: no alcanza para su pedido.` : undefined
    acts = [{ label: `Aceptar ${money(ask)}`, kind: 'primary', dec: true, disabled: !!why, why,
      run: () => run(() => (acceptCounter(g, d.id) ? { text: `Aceptaste el pedido de ${club}: ${money(ask)}. ${loan ? 'Falta tu confirmación del préstamo.' : `Falta el contrato con ${name}.`}`, resolved: false } : { text: 'No se pudo aceptar su pedido.', tone: 'warn' })) }, withdraw]
    help.push(`Si aceptás, salirte del acuerdo (cancelarlo o dejarlo vencer) cuesta 14 días sin ofertar por él y ${cost}.`)
  } else if (d.state === 'agreed') {
    due = dueText(d.deadline!, g.date); ico = 'ok'; kind = loan ? `Préstamo acordado con ${club}` : `Acordado con ${club}`
    if (!loan) {
      kpis.push({ l: 'Acordado', v: money(d.fee), key: true })
      if (p) kpis.push({ l: 'Pedido público', v: money(askingPrice(g, p)) })
      if (d.neg) kpis.push({ l: 'Pide el representante', v: wm(d.neg.terms.wage), s: d.neg.terms.bonus ? `por mes · prima ${money(d.neg.terms.bonus)}` : 'por mes' })
      else if (p) { const w = wageShown(g, p, demandWage(g, p), 402), est = w[0] !== w[1]; kpis.push({ l: 'Pediría', v: wr(w), s: est ? 'por mes (estimado)' : 'por mes', rng: est }) }
      facts.push(<>Falta el contrato con el jugador.</>)
      if (d.neg) facts.push(<>Paciencia del representante: <b>{patience(d.neg.patience)}</b>.</>)
      if (p) impact = <ImpactBox imp={dealImpact(g, 'buy', d.pid, d.fee, d.neg?.offer)!} kind="buy" title={d.neg?.offer ? 'Con los últimos términos ofrecidos' : 'Si firma'} />
      acts = [{ label: d.neg ? 'Seguir negociando' : 'Negociar contrato', kind: 'primary', dec: true, disabled: !open, why: !open ? closed : undefined, run: openNeg }, cancel]
    } else {
      kpis.push({ l: 'Cargo', v: money(d.fee), key: true })
      const w = p ? wageShown(g, p, p.wage, 401) : null, est = !!w && w[0] !== w[1]
      if (w) kpis.push({ l: 'Cobra', v: wr(w), s: est ? 'por mes (estimado)' : 'por mes', rng: est })
      facts.push(<>Hasta fin de temporada.</>)
      if (p && w) {
        impact = <ImpactBox imp={dealImpact(g, 'loan', d.pid, d.fee)!} kind="loan" title="Si confirmás el préstamo" />
        acts = [{ label: 'Confirmar el préstamo', kind: 'primary', disabled: !open, why: !open ? closed : undefined,
          confirm: { label: `Confirmar: ${name} llega a préstamo hasta fin de temporada, cargo ${money(d.fee)}, cobra ${between(w)} por mes`,
            run: () => run(() => { const r = signDeal(g, d.id); return r.ok ? { text: `${name} llega a préstamo hasta fin de temporada.` } : { text: r.reason ?? 'No se pudo confirmar.', tone: 'warn', resolved: false } }) } }, cancel]
      }
    }
    notes.push(<Note kind="warn">Si lo cancelás o lo dejás vencer, no podés volver a ofertar por él durante 14 días y {cost} hasta esa fecha.</Note>)
  }
  if (ws.closesOn && d.deadline === ws.closesOn) facts.push(<>Vence con el cierre del libro.</>)
  if (!p) { facts.push(<>Ya no está disponible.</>); acts = []; impact = null }
  return { ico, kind, due, kpis, facts, notes: keyed(notes), impact, improve: d.state === 'countered' && p ? d : undefined, acts, help }
}
const keyed = (xs: ReactNode[]) => xs.map((x, i) => <Fragment key={i}>{x}</Fragment>)

/** La oferta de otro club por un jugador tuyo, con la misma anatomía que un trato (bandeja y Tratos). */
export function offerModel(g: Game, o: Offer, run: (fn: () => Res) => void): DealModel | null {
  const p = g.players[o.pid]
  if (!p) return null
  const open = windowOpen(g.date), others = g.offers.filter(x => x.pid === o.pid && x.id !== o.id), from = o.from ? g.clubs[o.from] : undefined
  const diff = p.value ? Math.round((o.fee / p.value - 1) * 100) : 0
  const left = squadOf(g, g.userClubId).filter(x => x.id !== p.id && x.positions[0] === p.positions[0]).length
  const imp = dealImpact(g, 'sell', p.id, o.fee)
  const conf = `Confirmar: vender a ${p.name} a ${o.fromName} por ${money(o.fee)}${others.length ? `; se cancela la de ${others.map(x => x.fromName).join(' y la de ')}` : ''}${!from ? '. Se va al exterior' : ''}`
  const why = !open ? 'El libro de pases está cerrado. No podés aceptar ni pedir más, solo rechazar.' : undefined
  const facts: ReactNode[] = [
    ...others.map(x => <>También ofertó {x.fromName} por {p.name}: {money(x.fee)}. Si aceptás una, la otra se cancela.</>),
    ...(!from ? [<>Se va al exterior y no vuelve al fútbol argentino.</>] : []),
    <>Si lo vendés, te quedan {left} en su puesto.</>,
  ]
  return {
    ico: 'bang', kind: `Oferta de ${o.fromName} por tu jugador`, due: dueText(offerDeadline(o), g.date), chip: (o.asks ?? 0) > 0 ? `Mejorada ${o.asks} ${o.asks === 1 ? 'vez' : 'veces'}` : undefined,
    kpis: [{ l: 'Oferta', v: money(o.fee), key: true }, { l: 'Valor', v: money(p.value) }, { l: 'Diferencia', v: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} %`, s: diff > 0 ? 'sobre su valor' : diff < 0 ? 'bajo su valor' : 'igual a su valor' },
      { l: 'Sueldo que liberás', v: wm(p.wage), s: 'por mes' }, { l: 'Contrato', v: `dic ${p.contractEnd}` }],
    facts, notes: [], impact: imp ? <ImpactBox imp={imp} kind="sell" title="Si lo vendés" /> : null,
    acts: [
      { label: 'Aceptar', kind: 'primary', disabled: !!why, why, confirm: { label: conf, run: () => run(() => (acceptOffer(g, o) ? { text: `Vendiste a ${p.name} a ${o.fromName} por ${money(o.fee)}.` } : { text: 'No se pudo aceptar.', tone: 'warn', resolved: false })) } },
      { label: 'Pedir más', dec: true, disabled: !!why, why, run: () => run(() => (haggle(g, o) ? { text: `${o.fromName} mejoró su oferta: ahora ${money(g.offers.find(x => x.id === o.id)?.fee ?? o.fee)}.`, resolved: false } : { text: `${o.fromName} se retiró de la negociación.`, tone: 'warn' })) },
      { label: 'Rechazar', kind: 'danger', confirm: { label: 'Confirmar rechazo', danger: true, run: () => run(() => { rejectOffer(g, o); return { text: `Rechazaste la oferta de ${o.fromName}.` } }) } },
    ],
    help: ['Pedir más: el club puede mejorar 15 % o retirarse.'],
  }
}

const KpiBox = ({ k }: { k: KpiT }) => <div className={`ib-kpi ${k.key ? 'key' : ''}`}><span className="ib-kpi-l">{k.l}</span><span className={`ib-kpi-v ${k.rng ? 'rng' : ''}`}>{k.v}</span>{k.s && <span className="ib-kpi-s">{k.s}</span>}</div>
/**
 * La vista de un trato: cabecera (estado, tipo y plazo) de borde a borde, entidades, cifras, hechos, impacto, Mejorar, acciones (primario →
 * comunes → peligro) y ayuda. La usan la bandeja (con `actions={false}`: sus botones van en la barra de la bandeja), Tratos y la caja de oferta.
 */
export function DealView({ m, ents, busy, run, actions = true, active = true, note }: { m: DealModel; ents?: ReactNode; busy: boolean; run: (fn: () => Res) => void; actions?: boolean; active?: boolean; note?: ReactNode }) {
  return <div className={`mk-dv ${m.wait ? 'wait' : 'dec'}`}>
    <div className="mk-dv-h"><span className={`mk-deal-i ${m.ico === 'bang' ? 'dec' : m.ico}`}>{MI[m.ico]}</span><b className="mk-dv-k mk-card-t" tabIndex={-1}>{m.kind}</b>
      {m.due && <span className={`ib-due ${m.due.short ? 'short' : ''}`}>{m.due.short ? MI.bang : MI.wait}{m.due.text}</span>}{m.chip && <span className="chip">{m.chip}</span>}</div>
    {ents && <div className="ib-ents compact mk-dv-ents">{ents}</div>}
    <div className="mk-dv-b">
      <div className="mk-dv-l">
        {m.kpis.length > 0 && <div className="ib-kpis compact mk-dv-kpis">{m.kpis.map(k => <KpiBox key={k.l} k={k} />)}</div>}
        {m.facts.length > 0 && <div className="ib-facts mk-facts mk-dv-facts">{m.facts.map((f, i) => <div key={i} className="ib-fact">{f}</div>)}</div>}
        {m.notes}
      </div>
      {(m.impact || m.improve || actions || note) && <div className="mk-dv-r">
        {m.impact}
        {m.improve && <ImproveBlock key={`${m.improve.id}.${m.improve.round}`} d={m.improve} busy={busy} run={run} />}
        {actions && m.acts.length > 0 && <ActRow acts={m.acts} busy={busy} active={active} />}
        {actions && m.help.map((h, i) => <div key={i} className="ib-help">{h}</div>)}
        {note}
      </div>}
    </div>
  </div>
}
const PAT: Record<string, string> = { mucha: 'Ninguna oferta sola hace que se levante de la mesa.', media: 'Una oferta lejos de lo que pide puede hacer que se levante de la mesa.', poca: 'Si la próxima oferta no alcanza, se levanta de la mesa.' }
const patience = (n: number) => (n >= 3 ? 'mucha' : n === 2 ? 'media' : 'poca')
export const patiencePhrase = (w: string) => PAT[w]

/** Campo de monto en dólares: entero, con los miles con punto al salir del campo; Enter envía. `invalid`: hay un motivo que impide enviarlo. */
export function Amount({ id, label, value, onChange, onEnter, disabled, big, describedBy, invalid, auto }: { id: string; label: string; value: number; onChange: (v: number) => void; onEnter?: () => void; disabled?: boolean; big?: boolean; describedBy?: string; invalid?: boolean; auto?: boolean }) {
  // el texto del campo es local: enfocar no lo cambia (no se pierde la selección); al salir, los miles con punto
  const fmt = (v: number) => dec(v)
  const [txt, setTxt] = useState(() => fmt(value)), focus = useRef(false)
  useEffect(() => { if (!focus.current) setTxt(fmt(value)) }, [value])
  return <label className={`f mk-amt ${big ? 'big' : ''}`} htmlFor={id}>{label}
    <input id={id} inputMode="numeric" autoComplete="off" disabled={disabled} aria-describedby={describedBy} aria-invalid={invalid || undefined} data-autofocus={auto || undefined} value={txt}
      onFocus={() => (focus.current = true)} onBlur={() => { focus.current = false; setTxt(fmt(value)) }}
      onChange={e => { setTxt(e.target.value); onChange(Number(e.target.value.replace(/\D/g, '')) || 0) }}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }} />
  </label>
}

/** Bloque Mejorar de una contraoferta (Tratos, `BidBox` y bandeja): campo con el monto + "Ofertar". */
export function ImproveBlock({ d, busy, run }: { d: Deal; busy: boolean; run: (fn: () => Res) => void }) {
  const { g } = useGame()
  const [fee, setFee] = useState(d.fee)
  const [said, setSaid] = useState('')
  const loan = d.side === 'loan', ask = d.counter ?? d.fee, aw = answerWindow(g), ws = windowState(g.date)
  const check = bidCheck(g, d.pid, fee, loan)
  const why = check ?? (fee >= ask ? `Con ${money(fee)} ya es aceptar su pedido: usá Aceptar.` : null)
  const send = () => { if (busy) return; if (why) { setSaid(why); return } run(() => { const r = improveBid(g, d.id, fee); return r.ok ? { text: `Oferta mejorada enviada a ${d.clubName}. Responde entre el ${fmtDay(aw.from)} y el ${fmtDay(aw.by)}.` } : { text: r.reason ?? 'No se pudo mejorar.', tone: 'warn', resolved: false } }) }
  const hid = `imp-h-${d.id}`
  return <div className="mk-improve">
    <div className="mk-improve-row">
      <Amount id={`imp-${d.id}`} label={loan ? 'Mejorar el cargo (US$)' : 'Mejorar la oferta (US$)'} value={fee} onChange={v => { setFee(v); setSaid('') }} onEnter={send} disabled={busy} describedBy={hid} invalid={!!why && fee > 0} />
      <button className="btn" disabled={!!why || busy} onClick={send}>Ofertar</button>
    </div>
    <div className="mk-hint sm" id={hid}>{why && fee > 0 ? why : `Si mejorás, ${d.clubName} vuelve a responder en 1 a 3 días.`}</div>
    <div className="vh" role="status">{said}</div>
    {!check && ws.closesOn && aw.afterClose && <Note kind="warn">El libro cierra el {fmtDay(ws.closesOn)}: si {d.clubName} contesta después, la mejora caduca.</Note>}
  </div>
}

// ---------- la oferta por un jugador ajeno ----------
/** `BidBox`: el panel del Mercado y la ficha › Contrato y mercado. Sin trato abierto, el formulario; con trato, su vista y sus acciones. */
export function BidBox({ p, busy, where = 'panel' }: { p: Player; busy: boolean; where?: 'panel' | 'page' }) {
  const { g, save, refresh, nav, openPlayer } = useGame()
  const uid = useId()
  const [fee, setFee] = useState(() => askingPrice(g, p))
  const [lf, setLf] = useState(() => loanFee(p))
  const [res, setRes] = useState<Res | null>(null)
  const [saveErr, setSaveErr] = useState(false)
  const [neg, setNeg] = useState<number | null>(null)
  const noteRef = useRef<HTMLDivElement>(null), focusNote = useRef(false)
  useEffect(() => { if (focusNote.current) { focusNote.current = false; noteRef.current?.querySelector<HTMLElement>('.ib-result')?.focus() } })
  const run = (fn: () => Res) => { const r = fn(); setRes(r); setSaveErr(false); save().then(ok => { if (!ok) setSaveErr(true) }); focusNote.current = true; refresh() }
  const me = g.clubs[g.userClubId], club = g.clubs[p.clubId]
  // la nota va en el mismo lugar del árbol en las dos ramas (formulario y trato): la región viva no se vuelve a montar
  const note = <div ref={noteRef}><ResultNote r={res} saveErr={saveErr} /></div>
  if (p.clubId === me.id) return <div className="mk-bid">{note}<div className="mk-mine"><b>Ya es tuyo.</b>{where === 'panel' && <button className="btn primary" onClick={() => openPlayer(p.id)}>Ver la ficha</button>}</div></div>
  if (!club || club.division === 0) return <div className="mk-bid">{note}<div className="ib-who gone">Ya no está disponible.</div></div>
  const d = openDealFor(g, p.id)
  const negModal = neg != null && <NegotiationModal p={p} mode="buy" dealId={neg} onClose={m => { setNeg(null); if (m) { setRes({ text: m.text, tone: m.tone }); focusNote.current = true }; refresh() }} />
  if (d) return <div className="mk-bid">
    <h3>Oferta por {p.name}</h3>
    {note}
    <DealView m={dealModel(g, d, run, () => setNeg(d.id))} busy={busy} run={run} />
    {where === 'page' && <div><button className="btn sm" onClick={() => nav({ page: 'market', tab: 'tratos', sel: `deal${d.id}` })}>Ver en Tratos</button></div>}
    {negModal}
  </div>
  const blk = bidBlock(g, p.id), cool = clubCool(g, p.clubId), k = knowOf(g, p), aw = answerWindow(g), ws = windowState(g.date)
  const check = bidCheck(g, p.id, fee, false), checkL = bidCheck(g, p.id, lf, true)
  const ask = wageShown(g, p, demandWage(g, p), 402), cur = wageShown(g, p, p.wage, 401)
  const imp = dealImpact(g, 'buy', p.id, fee)
  const margin = imp ? imp.cap - imp.wageBill[0] : 0
  const bid = (loan: boolean) => {
    if (busy) return
    const why = loan ? checkL : check
    // Enter con un monto que no se puede enviar: el motivo se anuncia como nota (no avanza, no mueve el foco)
    if (why) { setRes({ text: why, tone: 'warn', resolved: false }); return }
    run(() => { const r = placeBid(g, p.id, loan ? lf : fee, loan); return r.ok ? { text: `${loan ? 'Pedido enviado' : 'Oferta enviada'} a ${club.short}. Responde entre el ${fmtDay(aw.from)} y el ${fmtDay(aw.by)}.` } : { text: r.reason ?? 'No se pudo ofertar.', tone: 'warn', resolved: false } })
  }
  const n = openBids(g)
  // el impacto se anuncia medio segundo después de dejar de escribir (no en cada tecla)
  const says = imp ? `Si ${club.short} acepta ${money(fee)} y firma: libre para ofertar ${sm(imp.free[1])}, ${imp.free[1] >= 0 ? 'entra' : 'no entra'}; sueldos ${imp.fits === 'yes' ? 'entra' : imp.fits === 'maybe' ? 'puede no entrar' : 'no entra'} en el tope.` : ''
  // el bloqueo se dice una vez arriba (y los campos lo nombran); el resto de los motivos, debajo de cada botón, también si es el mismo en los dos
  const shared = blk ? blk.text : null
  const whyBuy = check && check !== shared ? check : null, whyLoan = checkL && checkL !== shared ? checkL : null
  const bw = `${uid}-why`, lw = `${uid}-lwhy`, bk = `${uid}-blk`
  return <div className="mk-bid">
    <h3>Ofertar por {p.name}</h3>
    {note}
    {blk && <div className="mk-dv x" id={bk}><div className="mk-dv-h"><span className="mk-deal-i x">{MI.x}</span><b>{blk.text.split('. ')[0]}.</b></div><div className="ib-facts mk-facts"><div className="ib-fact">No podés volver a ofertar por él hasta el <b>{fmtDay(blk.until)}</b>.</div></div></div>}
    {cool && !blk && <Note kind="warn">{cool.text}</Note>}
    <div className="mk-form">
      <Amount id={where === 'panel' ? 'mk-bid-fee' : 'bid-fee'} big label="Oferta (US$)" value={fee} onChange={v => { setFee(v); if (res?.tone === 'warn') setRes(null) }} onEnter={() => bid(false)} disabled={busy || !!blk} describedBy={[blk ? bk : '', bw].filter(Boolean).join(' ')} invalid={!!check} />
      <div className="mk-hint">Pediría {between(ask)} por mes.</div>
      {k < 60 && <Note>Lo conocés al {Math.round(k)} %: su valoración real puede estar en cualquier punto del rango.</Note>}
      {imp && <ImpactBox imp={imp} kind="buy" title={`Si ${club.short} acepta y firma`} />}
      {imp && imp.fits !== 'yes' && <Note kind="warn">{imp.fits === 'maybe' ? `Si pide lo que estimás (${wr(ask)}), puede que no entre en tu tope (margen ${wm(margin)}). El tope se controla al firmar el contrato.` : `Aun lo mínimo que estimás pasa tu margen (${wm(margin)}). El tope se controla al firmar el contrato.`}</Note>}
      {ws.open && ws.daysLeft !== 0 && <span className="ib-due">{MI.wait}{club.short} responde entre el {fmtDay(aw.from)} y el {fmtDay(aw.by)}.</span>}
      {ws.closesOn && aw.afterClose && ws.daysLeft !== 0 && <Note kind="warn">Si {club.short} contesta después del {fmtDay(ws.closesOn)}, la oferta caduca.</Note>}
      <Note>Si {club.short} acepta, salirte del acuerdo (cancelarlo o dejarlo vencer) cuesta 14 días sin ofertar por él y un club molesto.</Note>
      {busy && <div className="ib-help">Frená el avance para decidir.</div>}
      <div><button className={`btn primary mk-go ${where}`} data-primary disabled={!!check || busy} aria-describedby={bw} onClick={() => bid(false)}>Ofertar compra</button></div>
      <div className="ib-help" id={bw}>{whyBuy}</div>
      <div className="mk-loan">
        <b>Préstamo hasta fin de temporada</b>
        <Amount id={where === 'panel' ? 'mk-loan-fee' : 'loan-fee'} label="Cargo (US$)" value={lf} onChange={v => { setLf(v); if (res?.tone === 'warn') setRes(null) }} onEnter={() => bid(true)} disabled={busy || !!blk} describedBy={[blk ? bk : '', lw].filter(Boolean).join(' ')} invalid={!!checkL} />
        <div className="mk-hint">Seguiría cobrando {between(cur)} por mes.</div>
        <div><button className="btn" disabled={!!checkL || busy} aria-describedby={lw} onClick={() => bid(true)}>Pedir préstamo</button></div>
        <div className="ib-help" id={lw}>{whyLoan}</div>
      </div>
    </div>
    <div className="mk-count">Ofertas abiertas: {n} de {MAX_BIDS}.</div>
    <Later text={says} />
  </div>
}
/** Región viva que repite `text` medio segundo después de que deja de cambiar. */
function Later({ text }: { text: string }) {
  const [said, setSaid] = useState('')
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } const t = setTimeout(() => setSaid(text), 500); return () => clearTimeout(t) }, [text])
  return <div className="vh" aria-live="polite">{said}</div>
}

/** Panel del jugador elegido (≥ 1180 px): datos, ojeo y `BidBox`. `onCompare`: abre el comparador con él y los marcados (`cmpWhy` si no hay). */
export function SidePanel({ p, busy, onCompare, cmpWhy }: { p?: Player; busy: boolean; onCompare?: () => void; cmpWhy?: string }) {
  const { g, save, refresh, openPlayer } = useGame()
  if (!p) return <aside className="card mk-side none" aria-label="Jugador elegido">
    <span className="msg-ico">{MI.swap}</span>
    <p>Elegí un jugador de la tabla para ver su oferta y su impacto. Con el foco en la tabla: <kbd>↑</kbd> <kbd>↓</kbd> para recorrer, <kbd>Enter</kbd> para elegir, <kbd>Espacio</kbd> para marcar la casilla (acá Espacio no avanza el día).</p>
  </aside>
  const c = g.clubs[p.clubId], k = Math.round(knowOf(g, p)), eta = scoutEta(g, p), scouting = g.scouting.includes(p.id), follow = g.shortlist.includes(p.id)
  const ws = windowState(g.date), w = wageShown(g, p, p.wage, 401), est = w[0] !== w[1]
  const age = Math.floor((Date.parse(g.date) - Date.parse(p.birth)) / 31557600000)
  const closesFirst = ws.closesOn && eta > daysBetween(g.date, ws.closesOn)
  const full = !scouting && g.scouting.length >= 10 ? g.players[g.scouting[0]] : undefined
  const act = (fn: () => void) => { fn(); save(); refresh() }
  const pot = potentialText(g, p)
  return <aside className="card mk-side" aria-label="Jugador elegido">
    <div className="mk-side-h">
      <Face p={p} size={52} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="mk-side-n"><button className="linkish" data-pid={p.id} onClick={() => openPlayer(p.id)}>{p.name}</button><span className="grow" /><PosPill p={p} /><Val p={p} /></div>
        <div className="mk-side-m">{c && <span data-cid={c.id} className="row" style={{ gap: 6, display: 'inline-flex' }}><Badge club={c} size={16} />{c.short}</span>} · {c ? divName(c) : ''} · {age} años</div>
      </div>
    </div>
    {k < 100 && <div className="mk-know">
      <div className="row" style={{ gap: 10 }}><span className="nw">Conocés el {k}{' '}%</span><span className="mk-kbar" aria-hidden="true"><i style={{ width: `${k}%` }} /></span><span className="grow" />
        <button className="btn sm" disabled={scouting} onClick={() => act(() => scout(g, p))}>{scouting ? 'Ojeándolo…' : 'Mandar a ojear'}</button></div>
      <div className="mk-hint sm">{scouting ? `Lo van a conocer del todo en unos ${eta} días.` : `Lo conocerías del todo en unos ${eta} días.`}</div>
      {closesFirst && <Note>El libro cierra antes: lo vas a conocer a medias.</Note>}
      {full && <Note>Ya ojeás a 10: al sumarlo se deja de ojear a {full.name}.</Note>}
    </div>}
    <dl className="mk-dl">
      <dt>Pedido</dt><dd><b>{money(askingPrice(g, p))}</b></dd>
      <dt>Valor</dt><dd>{money(p.value)}</dd>
      <dt>Sueldo</dt><dd>{est ? <span className="rng">{wr(w)} por mes <small>(estimado)</small></span> : <b>{wm(w[0])} por mes</b>}</dd>
      <dt>Contrato</dt><dd>dic {p.contractEnd}</dd>
      {p.clause ? <><dt>Cláusula</dt><dd>{money(p.clause)}</dd></> : null}
      <dt>Potencial</dt><dd>{pot ?? <span className="rng">Desconocido</span>}</dd>
      {k < 60 && <><dt>Personalidad</dt><dd><span className="rng">desconocida</span></dd></>}
      {p.clubId === g.userClubId && p.status && <><dt>Rol</dt><dd>{STATUS[p.status].name}</dd></>}
    </dl>
    <div className="mk-side-acts">
      <button className="btn sm" onClick={() => openPlayer(p.id)}>Ver la ficha</button>
      <button className={`btn sm ${follow ? 'on' : ''}`} aria-pressed={follow} onClick={() => act(() => toggleShortlist(g, p.id))}>{follow ? '✓ En seguimiento' : 'Seguir'}</button>
      {onCompare && <button className="btn sm" disabled={!!cmpWhy} aria-describedby={cmpWhy ? 'mk-cmp-why' : undefined} onClick={onCompare}>Comparar</button>}
    </div>
    {onCompare && cmpWhy && <div className="ib-help" id="mk-cmp-why">{cmpWhy}</div>}
    <div className="mk-side-sep" />
    <BidBox key={p.id} p={p} busy={busy} />
  </aside>
}
