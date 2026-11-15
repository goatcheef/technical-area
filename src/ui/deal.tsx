// Piezas del mercado compartidas por el Mercado, la ficha y la bandeja (design/ux/mercado.md 5.3; production/ui/mercado/visual-design.md 4.8-4.10):
// la oferta (`BidBox`), la decisión de un trato (`dealModel` + `ImproveBlock`), el impacto antes → después y la fila de acciones con confirmación
// en el lugar. Mismo texto y mismas llamadas al motor en todos lados; la pantalla nunca escribe en `g`.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  MAX_BIDS, acceptCounter, answerWindow, askingPrice, bidBlock, bidCheck, blockDate, cancelDeal, clubCool, committed, dealImpact, divName,
  improveBid, loanFee, openBids, openDealFor, placeBid, signDeal, windowOpen, windowState, withdrawBid, type DealImpact,
} from '../engine/career'
import { daysBetween, fmtDay } from '../engine/game'
import { demandWage, knowOf, scoutEta, scout, toggleShortlist, wageShown } from '../engine/squad'
import type { Deal, Game, Player } from '../engine/types'
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
export function dealLabel(d: Deal): { t: string; dec?: boolean; ico: 'wait' | 'bang' | 'ok' | 'x' | 'lock' | 'dot' } {
  if (d.state === 'waiting') return { t: 'Esperando', ico: 'wait' }
  if (d.state === 'countered') return { t: 'Contraoferta', dec: true, ico: 'bang' }
  if (d.state === 'agreed') return { t: 'Acordado', dec: true, ico: 'ok' }
  if (d.state === 'refused') return { t: 'Sin acuerdo', ico: 'x' }
  if (d.state === 'signed') return { t: 'Firmado', ico: 'ok' }
  if (d.state === 'loaned') return { t: 'Prestado', ico: 'ok' }
  if (d.state === 'sold') return { t: 'Vendido', ico: 'ok' }
  if (d.state === 'declined') return { t: 'Rechazada', ico: 'x' }
  if (d.state === 'withdrawn') return { t: 'Se retiró', ico: 'x' }
  if (d.state === 'expired') return { t: 'Venció', ico: 'dot' }
  if (d.why === 'pulled') return { t: 'Retirada', ico: 'dot' }
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
  const range = imp.wageAdd[0] !== imp.wageAdd[1]
  const after: [number, number] = [imp.wageBill[0] + imp.wageAdd[0], imp.wageBill[0] + imp.wageAdd[1]]
  return <div className="mk-impact-w">
    <div className="mk-impact-t">{title}</div>
    <table className="mk-impact"><tbody>
      <tr><th scope="row">Libre para ofertar</th><td><span className="b4">{money(imp.free[0])}</span><A /><b>{money(imp.free[1])}</b></td><td>{kind !== 'sell' && <V v={imp.free[1] >= 0 ? 'ok' : 'no'} />}</td></tr>
      <tr><th scope="row">Caja</th><td><span className="b4">{money(imp.balance[0])}</span><A /><b>{money(imp.balance[1])}</b></td><td /></tr>
      <tr><th scope="row">Sueldos por mes</th><td><span className="b4">{wm(imp.wageBill[0])}</span><A />{range ? <span className="rng">{wr(after)} <small>(estimado)</small></span> : <b>{wm(after[0])}</b>}<small className="mk-cap">tope {wm(imp.cap)}</small></td>
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
  return <>
    {busy && decision && <div className="ib-help">Frená el avance para decidir.</div>}
    <div className="ib-acts" onKeyDown={e => { if (e.key === 'Escape' && open != null) { e.preventDefault(); e.stopPropagation(); cancel() } }}>
      {acts.map((a, i) => open === i && a.confirm
        ? <div key={i} className={`ib-confirm ${a.confirm.danger ? 'danger' : ''}`}><button ref={conf} className={a.confirm.danger ? 'btn danger strong' : 'btn primary'} onClick={() => { setOpen(null); a.confirm!.run() }}>{a.confirm.label}</button><button className="btn" onClick={cancel}>No</button></div>
        : <button key={i} ref={el => { btns.current[i] = el }} className={`btn ${a.kind ?? ''} ${a.on ? 'on' : ''}`} aria-pressed={a.on ?? undefined} data-primary={a.kind === 'primary' || undefined}
          disabled={a.disabled || (busy && !a.nav && (!!a.confirm || !!a.dec))} onClick={() => (a.confirm ? setOpen(i) : a.run?.())}>{a.label}</button>)}
    </div>
    {acts.filter(a => a.disabled && a.why).map((a, i) => <div key={i} className="ib-help">{a.why}</div>)}
  </>
}

/** Nota de resultado (F7) con el aviso de guardado fallido. */
export function ResultNote({ r, saveErr }: { r: Res | null; saveErr?: boolean }) {
  return <div role="status" className="ib-status mk-status">
    {r && <div className={`ib-result ${r.tone === 'ok' || !r.tone ? '' : r.tone}`} tabIndex={-1}><span className="ib-result-ico">{r.tone === 'err' ? MI.x : r.tone === 'warn' ? MI.bang : MI.ok}</span><span>{r.text}</span></div>}
    {saveErr && <div className="ib-result err"><span className="ib-result-ico">{MI.bang}</span><span>No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes.</span></div>}
  </div>
}

// ---------- la decisión de un trato ----------
export interface DealModel { head: ReactNode; due?: { text: string; short: boolean }; facts: ReactNode[]; notes: ReactNode[]; impact?: ReactNode; improve: boolean; acts: DealAct[]; help: ReactNode[] }
/**
 * Lo que muestra un trato abierto (esperando respuesta, contraoferta o acuerdo) y sus acciones. `run` ejecuta una llamada al motor
 * y deja la nota de resultado; `openNeg` abre la negociación con el representante.
 */
export function dealModel(g: Game, d: Deal, run: (fn: () => Res) => void, openNeg: () => void): DealModel {
  const p = g.players[d.pid], loan = d.side === 'loan', me = g.clubs[g.userClubId], open = windowOpen(g.date), ws = windowState(g.date)
  const club = d.clubName, name = d.name
  const facts: ReactNode[] = [], notes: ReactNode[] = [], help: ReactNode[] = []
  let acts: DealAct[] = [], impact: ReactNode = null, head: ReactNode = null, due: DealModel['due']
  const withdraw: DealAct = { label: 'Retirar la oferta', dec: true, run: () => run(() => (withdrawBid(g, d.id) ? { text: `Retiraste la oferta por ${name}.` } : { text: 'Esta oferta ya no está abierta.', tone: 'warn' })) }
  const cost = `${club} va a pedir un 10 % más por sus jugadores`
  const cancel: DealAct = { label: 'Cancelar el trato', confirm: { danger: true, label: `Confirmar: cancelar el trato por ${name}. No vas a poder ofertar por él hasta el ${fmtDay(blockDate(g.date))} y ${cost} hasta esa fecha.`,
    run: () => run(() => (cancelDeal(g, d.id) ? { text: `Cancelaste el trato por ${name}. No podés volver a ofertar por él hasta el ${fmtDay(blockDate(g.date))}.` } : { text: 'Este acuerdo ya no está abierto.', tone: 'warn' })) } }
  if (d.state === 'waiting') {
    head = <><span className="mk-deal-i wait">{MI.wait}</span><b>Esperando respuesta de {club}</b></>
    facts.push(<>{loan ? `Pediste el préstamo con un cargo de ${money(d.fee)}` : `Ofertaste ${money(d.fee)}`} el {fmtDay(d.updated)}{d.round > 1 ? ' (mejorada)' : ''}.</>)
    facts.push(<>Responde entre el {fmtDay(d.answerFrom!)} y el {fmtDay(d.answerBy!)}.</>)
    facts.push(<>{money(d.fee)} comprometidos de tu presupuesto.</>)
    if (ws.closesOn && d.answerBy! > ws.closesOn) notes.push(<Note kind="warn">El libro cierra el {fmtDay(ws.closesOn)}: si {club} contesta después, la oferta caduca.</Note>)
    acts = [withdraw]
    help.push('Para cambiar el monto, retirala y ofertá de nuevo: la espera vuelve a empezar.')
  } else if (d.state === 'countered') {
    const ask = d.counter ?? d.fee, free = me.budget - committed(g) + d.fee
    due = dueText(d.deadline!, g.date)
    head = <><span className="mk-deal-i dec">{MI.bang}</span><b>Contraoferta</b></>
    facts.push(<>{club} no aceptó {loan ? `un cargo de ${money(d.fee)}` : money(d.fee)}.</>)
    facts.push(<>{loan ? 'Pide un cargo de ' : 'Pide '}<b className="mk-fig">{money(ask)}</b> ({pct(ask, d.fee)}).</>)
    if (p) impact = <ImpactBox imp={dealImpact(g, loan ? 'loan' : 'buy', d.pid, ask)!} kind={loan ? 'loan' : 'buy'} title={`Si aceptás ${money(ask)} y ${loan ? 'confirmás' : 'firma'}`} />
    const why = !open ? 'El libro de pases está cerrado.' : ask > free ? `Te quedan libres ${money(Math.max(0, free))}: no alcanza para su pedido.` : undefined
    acts = [{ label: `Aceptar ${money(ask)}`, kind: 'primary', dec: true, disabled: !!why, why,
      run: () => run(() => (acceptCounter(g, d.id) ? { text: `Aceptaste el pedido de ${club}: ${money(ask)}. ${loan ? 'Falta tu confirmación del préstamo.' : `Falta el contrato con ${name}.`}`, resolved: false } : { text: 'No se pudo aceptar su pedido.', tone: 'warn' })) }, withdraw]
    help.push(`Si aceptás, salirte del acuerdo (cancelarlo o dejarlo vencer) cuesta 14 días sin ofertar por él y ${cost}.`)
  } else if (d.state === 'agreed') {
    due = dueText(d.deadline!, g.date)
    head = <><span className="mk-deal-i ok">{MI.ok}</span><b>{loan ? `Préstamo acordado con ${club}` : `Acordado con ${club}`}</b></>
    if (!loan) {
      facts.push(<>{money(d.fee)}. Falta el contrato con el jugador.</>)
      if (d.neg) {
        facts.push(<>El representante pide {wm(d.neg.terms.wage)} por mes{d.neg.terms.bonus ? `, prima ${money(d.neg.terms.bonus)}` : ''}.</>)
        facts.push(<>Paciencia del representante: <b>{patience(d.neg.patience)}</b>.</>)
      } else if (p) facts.push(<>Pediría {between(wageShown(g, p, demandWage(g, p), 402))} por mes.</>)
      if (p) impact = <ImpactBox imp={dealImpact(g, 'buy', d.pid, d.fee, d.neg?.offer)!} kind="buy" title={d.neg?.offer ? 'Con los últimos términos ofrecidos' : 'Si firma'} />
      acts = [{ label: d.neg ? 'Seguir negociando' : 'Negociar contrato', kind: 'primary', dec: true, disabled: !open, why: !open ? 'El libro de pases está cerrado.' : undefined, run: openNeg }, cancel]
    } else if (p) {
      const w = wageShown(g, p, p.wage, 401), est = w[0] !== w[1]
      facts.push(<>Cargo {money(d.fee)}, hasta fin de temporada.</>)
      facts.push(<>Cobra {between(w)} por mes{est ? ' (estimado)' : ''}.</>)
      impact = <ImpactBox imp={dealImpact(g, 'loan', d.pid, d.fee)!} kind="loan" title="Si confirmás el préstamo" />
      acts = [{ label: 'Confirmar el préstamo', kind: 'primary', disabled: !open, why: !open ? 'El libro de pases está cerrado.' : undefined,
        confirm: { label: `Confirmar: ${name} llega a préstamo hasta fin de temporada, cargo ${money(d.fee)}, cobra ${between(w)} por mes`,
          run: () => run(() => { const r = signDeal(g, d.id); return r.ok ? { text: `${name} llega a préstamo hasta fin de temporada.` } : { text: r.reason ?? 'No se pudo confirmar.', tone: 'warn', resolved: false } }) } }, cancel]
    }
    notes.push(<Note kind="warn">Si lo cancelás o lo dejás vencer, no podés volver a ofertar por él durante 14 días y {cost} hasta esa fecha.</Note>)
  }
  return { head, due, facts, notes: notes.map((x, i) => <Fragment key={i}>{x}</Fragment>), impact, improve: d.state === 'countered', acts, help }
}
const PAT: Record<string, string> = { mucha: 'Ninguna oferta sola hace que se levante de la mesa.', media: 'Una oferta lejos de lo que pide puede hacer que se levante de la mesa.', poca: 'Si la próxima oferta no alcanza, se levanta de la mesa.' }
const patience = (n: number) => (n >= 3 ? 'mucha' : n === 2 ? 'media' : 'poca')
export const patiencePhrase = (w: string) => PAT[w]

/** Campo de monto en dólares: entero, con los miles con punto al salir del campo; Enter envía. */
export function Amount({ id, label, value, onChange, onEnter, disabled, big, describedBy }: { id: string; label: string; value: number; onChange: (v: number) => void; onEnter?: () => void; disabled?: boolean; big?: boolean; describedBy?: string }) {
  // el texto del campo es local: enfocar no lo cambia (no se pierde la selección); al salir, los miles con punto
  const fmt = (v: number) => dec(v)
  const [txt, setTxt] = useState(() => fmt(value)), focus = useRef(false)
  useEffect(() => { if (!focus.current) setTxt(fmt(value)) }, [value])
  return <label className={`f mk-amt ${big ? 'big' : ''}`} htmlFor={id}>{label}
    <input id={id} inputMode="numeric" autoComplete="off" disabled={disabled} aria-describedby={describedBy} value={txt}
      onFocus={() => (focus.current = true)} onBlur={() => { focus.current = false; setTxt(fmt(value)) }}
      onChange={e => { setTxt(e.target.value); onChange(Number(e.target.value.replace(/\D/g, '')) || 0) }}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }} />
  </label>
}

/** Bloque Mejorar de una contraoferta (Tratos, `BidBox` y bandeja): campo con el monto + "Ofertar". */
export function ImproveBlock({ d, busy, run }: { d: Deal; busy: boolean; run: (fn: () => Res) => void }) {
  const { g } = useGame()
  const [fee, setFee] = useState(d.fee)
  const loan = d.side === 'loan', ask = d.counter ?? d.fee, aw = answerWindow(g), ws = windowState(g.date)
  const check = bidCheck(g, d.pid, fee, loan)
  const why = check ?? (fee >= ask ? `Con ${money(fee)} ya es aceptar su pedido: usá Aceptar.` : null)
  const send = () => { if (why || busy) return; run(() => { const r = improveBid(g, d.id, fee); return r.ok ? { text: `Oferta mejorada enviada a ${d.clubName}. Responde entre el ${fmtDay(aw.from)} y el ${fmtDay(aw.by)}.` } : { text: r.reason ?? 'No se pudo mejorar.', tone: 'warn', resolved: false } }) }
  const hid = `imp-h-${d.id}`
  return <div className="mk-improve">
    <div className="mk-improve-row">
      <Amount id={`imp-${d.id}`} label={loan ? 'Mejorar el cargo (US$)' : 'Mejorar la oferta (US$)'} value={fee} onChange={setFee} onEnter={send} disabled={busy} describedBy={hid} />
      <button className="btn" disabled={!!why || busy} onClick={send}>Ofertar</button>
    </div>
    <div className="mk-hint sm" id={hid}>{why && fee > 0 ? why : `Si mejorás, ${d.clubName} vuelve a responder en 1 a 3 días.`}</div>
    {!check && ws.closesOn && aw.afterClose && <Note kind="warn">El libro cierra el {fmtDay(ws.closesOn)}: si {d.clubName} contesta después, la mejora caduca.</Note>}
  </div>
}

/** Bloque de un trato abierto con su decisión (Tratos y `BidBox`). */
export function DealBlock({ d, busy, run, onNeg, compact }: { d: Deal; busy: boolean; run: (fn: () => Res) => void; onNeg: () => void; compact?: boolean }) {
  const { g } = useGame()
  const m = dealModel(g, d, run, onNeg)
  return <div className={`mk-deal ${d.state === 'waiting' ? 'wait' : 'dec'}`}>
    <div className="mk-deal-h">{m.head}{m.due && <span className={`ib-due ${m.due.short ? 'short' : ''}`}>{m.due.short ? MI.bang : null}{m.due.text}</span>}</div>
    <div className="ib-facts mk-facts">{m.facts.map((f, i) => <div key={i} className="ib-fact">{f}</div>)}</div>
    {!compact && m.impact}
    {m.notes}
    {m.improve && <ImproveBlock key={`${d.id}.${d.round}`} d={d} busy={busy} run={run} />}
    <ActRow acts={m.acts} busy={busy} />
    {m.help.map((h, i) => <div key={i} className="ib-help">{h}</div>)}
  </div>
}

// ---------- la oferta por un jugador ajeno ----------
/** `BidBox`: el panel del Mercado y la ficha › Contrato y mercado. Sin trato abierto, el formulario; con trato, su estado y sus acciones. */
export function BidBox({ p, busy, where = 'panel' }: { p: Player; busy: boolean; where?: 'panel' | 'page' }) {
  const { g, save, refresh, nav, openPlayer } = useGame()
  const [fee, setFee] = useState(() => askingPrice(g, p))
  const [lf, setLf] = useState(() => loanFee(p))
  const [res, setRes] = useState<Res | null>(null)
  const [saveErr, setSaveErr] = useState(false)
  const [neg, setNeg] = useState<number | null>(null)
  const noteRef = useRef<HTMLDivElement>(null), focusNote = useRef(false)
  useEffect(() => { if (focusNote.current) { focusNote.current = false; noteRef.current?.querySelector<HTMLElement>('.ib-result')?.focus() } })
  const run = (fn: () => Res) => { const r = fn(); setRes(r); setSaveErr(false); save().then(ok => { if (!ok) setSaveErr(true) }); focusNote.current = true; refresh() }
  const me = g.clubs[g.userClubId], club = g.clubs[p.clubId]
  const note = <div ref={noteRef}><ResultNote r={res} saveErr={saveErr} /></div>
  if (p.clubId === me.id) return <div className="mk-bid">{note}<div className="mk-mine"><b>Ya es tuyo.</b>{where === 'panel' && <button className="btn primary" onClick={() => openPlayer(p.id)}>Ver la ficha</button>}</div></div>
  if (!club || club.division === 0) return <div className="mk-bid">{note}<div className="ib-who gone">Ya no está disponible.</div></div>
  const d = openDealFor(g, p.id)
  const negModal = neg != null && <NegotiationModal p={p} mode="buy" dealId={neg} onClose={m => { setNeg(null); if (m) { setRes({ text: m.text, tone: m.tone }); focusNote.current = true }; refresh() }} />
  if (d) return <div className="mk-bid">
    <h3>Oferta por {p.name}</h3>
    <DealBlock d={d} busy={busy} run={run} onNeg={() => setNeg(d.id)} />
    {where === 'page' && <div><button className="btn sm" onClick={() => nav({ page: 'market', tab: 'tratos', sel: `deal${d.id}` })}>Ver en Tratos</button></div>}
    {note}{negModal}
  </div>
  const blk = bidBlock(g, p.id), cool = clubCool(g, p.clubId), k = knowOf(g, p), aw = answerWindow(g), ws = windowState(g.date)
  const check = bidCheck(g, p.id, fee, false), checkL = bidCheck(g, p.id, lf, true)
  const ask = wageShown(g, p, demandWage(g, p), 402), cur = wageShown(g, p, p.wage, 401)
  const imp = dealImpact(g, 'buy', p.id, fee)
  const margin = imp ? imp.cap - imp.wageBill[0] : 0
  const bid = (loan: boolean) => {
    if (busy || (loan ? checkL : check)) return
    run(() => { const r = placeBid(g, p.id, loan ? lf : fee, loan); return r.ok ? { text: `${loan ? 'Pedido enviado' : 'Oferta enviada'} a ${club.short}. Responde entre el ${fmtDay(aw.from)} y el ${fmtDay(aw.by)}.` } : { text: r.reason ?? 'No se pudo ofertar.', tone: 'warn', resolved: false } })
  }
  const n = openBids(g)
  // el bloqueo y "ya tenés una oferta" se dicen una vez arriba; el resto de los motivos, debajo de cada botón
  const shared = blk ? blk.text : null
  const whyBuy = check && check !== shared ? check : null, whyLoan = checkL && checkL !== shared && checkL !== check ? checkL : null
  return <div className="mk-bid">
    <h3>Ofertar por {p.name}</h3>
    {blk && <div className="mk-deal block"><div className="mk-deal-h"><span className="mk-deal-i x">{MI.x}</span><b>{blk.text.split('. ')[0]}.</b></div><div className="ib-facts mk-facts"><div className="ib-fact">No podés volver a ofertar por él hasta el <b>{fmtDay(blk.until)}</b>.</div></div></div>}
    {cool && !blk && <Note kind="warn">{cool.text}</Note>}
    <div className={blk ? 'mk-off' : ''}>
      <Amount id={where === 'panel' ? 'mk-bid-fee' : 'bid-fee'} big label="Oferta (US$)" value={fee} onChange={setFee} onEnter={() => bid(false)} disabled={busy} describedBy="bid-why" />
      <div className="mk-hint">Pediría {between(ask)} por mes.</div>
      {k < 60 && <Note>Lo conocés al {Math.round(k)} %: su valoración real puede estar en cualquier punto del rango.</Note>}
      {imp && <ImpactBox imp={imp} kind="buy" title={`Si ${club.short} acepta y firma`} />}
      {imp && imp.fits !== 'yes' && <Note kind="warn">{imp.fits === 'maybe' ? `Si pide lo que estimás (${wr(ask)}), puede que no entre en tu tope (margen ${wm(margin)}). El tope se controla al firmar el contrato.` : `Aun lo mínimo que estimás pasa tu margen (${wm(margin)}). El tope se controla al firmar el contrato.`}</Note>}
      {ws.open && ws.daysLeft !== 0 && <span className="ib-due">{MI.wait}{club.short} responde entre el {fmtDay(aw.from)} y el {fmtDay(aw.by)}.</span>}
      {ws.closesOn && aw.afterClose && ws.daysLeft !== 0 && <Note kind="warn">Si {club.short} contesta después del {fmtDay(ws.closesOn)}, la oferta caduca.</Note>}
      <Note>Si {club.short} acepta, salirte del acuerdo (cancelarlo o dejarlo vencer) cuesta 14 días sin ofertar por él y un club molesto.</Note>
      {busy && <div className="ib-help">Frená el avance para decidir.</div>}
      <button className={`btn primary mk-go ${where}`} data-primary disabled={!!check || busy} aria-describedby="bid-why" onClick={() => bid(false)}>Ofertar compra</button>
      <div className="ib-help" id="bid-why">{whyBuy}</div>
      <div className="mk-loan">
        <b>Préstamo hasta fin de temporada</b>
        <Amount id={where === 'panel' ? 'mk-loan-fee' : 'loan-fee'} label="Cargo (US$)" value={lf} onChange={setLf} onEnter={() => bid(true)} disabled={busy} />
        <div className="mk-hint">Seguiría cobrando {between(cur)} por mes.</div>
        <div><button className="btn" disabled={!!checkL || busy} onClick={() => bid(true)}>Pedir préstamo</button></div>
        {whyLoan && <div className="ib-help">{whyLoan}</div>}
      </div>
    </div>
    <div className="mk-count">Ofertas abiertas: {n} de {MAX_BIDS}.</div>
    {note}
  </div>
}

/** Panel del jugador elegido (≥ 1180 px): datos, ojeo y `BidBox`. */
export function SidePanel({ p, busy, onCompare }: { p?: Player; busy: boolean; onCompare?: (p: Player) => void }) {
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
  return <aside className="card mk-side" aria-label="Jugador elegido">
    <div className="mk-side-h">
      <Face p={p} size={52} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="mk-side-n"><button className="linkish" data-pid={p.id} onClick={() => openPlayer(p.id)}>{p.name}</button><span className="grow" /><PosPill p={p} /><Val p={p} /></div>
        <div className="mk-side-m">{c && <span data-cid={c.id} className="row" style={{ gap: 6, display: 'inline-flex' }}><Badge club={c} size={16} />{c.short}</span>} · {c ? divName(c) : ''} · {age} años</div>
      </div>
    </div>
    {k < 100 && <div className="mk-know">
      <div className="row" style={{ gap: 10 }}><span>Conocés el {k} %</span><span className="mk-kbar" aria-hidden="true"><i style={{ width: `${k}%` }} /></span><span className="grow" />
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
      <dt>Potencial</dt><dd>{k >= 70 ? (p.pa - p.ca >= 12 ? 'Mucho margen' : p.pa - p.ca >= 6 ? 'Buen margen' : 'Poco margen') : <span className="rng">Desconocido</span>}</dd>
      {k < 60 && <><dt>Personalidad</dt><dd><span className="rng">desconocida</span></dd></>}
    </dl>
    <div className="mk-side-acts">
      <button className="btn sm" onClick={() => openPlayer(p.id)}>Ver la ficha</button>
      <button className={`btn sm ${follow ? 'on' : ''}`} aria-pressed={follow} onClick={() => act(() => toggleShortlist(g, p.id))}>{follow ? '✓ En seguimiento' : 'Seguir'}</button>
      {onCompare && <button className="btn sm" onClick={() => onCompare(p)}>Comparar</button>}
    </div>
    <div className="mk-side-sep" />
    <BidBox key={p.id} p={p} busy={busy} />
  </aside>
}
