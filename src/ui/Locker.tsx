import { useEffect, useRef, useState } from 'react'
import { canSell, dealImpact, openNegotiation, sendTerms, signDeal } from '../engine/career'
import { fmtDate, fmtDay, squadOf } from '../engine/game'
import { ageOn, bestRating } from '../engine/positions'
import { STATUS, STATUS_KEYS, applyRenewal, canTalk, demand, evalOffer, harmony, minutesShare, naturalStatusFor, nextTalk, patienceWord, persLabels, renewWalk, talk, wageShown, type NegMode, type TalkKind } from '../engine/squad'
import type { Player, SquadStatus, Terms } from '../engine/types'
import { useGame } from '../store'
import { Badge, Face, Gauge, Modal, PosPill, Seg, Status, Val, money } from './common'
import { Amount, ImpactBox, MI, Note, between, patiencePhrase, wm } from './deal'
import { PageTip } from './Guide'

const Bar = ({ v, c }: { v: number; c?: string }) => <div className="bar" style={{ width: 70 }}><i style={{ width: `${Math.max(2, Math.min(100, v))}%`, background: c ?? (v >= 60 ? 'var(--good)' : v >= 35 ? 'var(--warn)' : 'var(--bad)') }} /></div>
/** Barra con su número siempre a la vista (regla D6: el color nunca es el único dato). */
const BarN = ({ v, label }: { v: number; label: string }) => <div className="row" style={{ gap: 6 }} title={`${label}: ${Math.round(v)} de 100`}><Bar v={v} /><span className="num sm dim">{Math.round(v)}</span></div>

export function LockerPage() {
  const { g, refresh, save, openPlayer } = useGame()
  const [who, setWho] = useState<number | null>(null)
  const c = g.clubs[g.userClubId]
  const hm = harmony(g)
  const sq = squadOf(g, c.id).sort((a, b) => STATUS[b.status ?? 'sub'].lvl - STATUS[a.status ?? 'sub'].lvl || bestRating(b) - bestRating(a))
  const done = () => { save(); refresh() }
  return (
    <div className="page">
      <PageTip id="locker" />
      <div className="hero row wrap" style={{ gap: 24 }}>
        <div className="grow"><h3>Vestuario</h3><h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>{hm.value >= 70 ? 'Grupo unido' : hm.value >= 45 ? 'Clima normal' : hm.value >= 25 ? 'Hay ruido' : 'Vestuario partido'}</h1>
          <div className="dim sm" style={{ maxWidth: 560, lineHeight: 1.5 }}>Cada jugador espera minutos según su rol. Si juega mucho menos, se molesta; los ambiciosos se impacientan antes y los leales aguantan más. Un vestuario unido rinde un poco más en la cancha.</div></div>
        <Gauge v={hm.value} label="ARMONÍA" />
        <div className="col" style={{ gap: 6 }}><h3>Referentes</h3>{hm.leaders.map(p => <div key={p.id} data-pid={p.id} className="row" style={{ cursor: 'pointer' }} onClick={() => openPlayer(p.id)}><Face p={p} size={26} /><span>{p.name}</span>{(p.happy ?? 70) < 50 && <span className="chip bad">Molesto</span>}</div>)}</div>
      </div>
      {hm.unhappy.length > 0 && <div className="card warn">{hm.unhappy.length} jugador(es) disconformes: {hm.unhappy.map(p => p.name).join(', ')}. Hablá con ellos, dales minutos o cambiales el rol.</div>}
      <div className="card scroll-x">
        <table><thead><tr><th>Jugador</th><th>Pos</th><th>Personalidad</th><th>Rol</th><th>Minutos</th><th>Conformidad</th><th>Moral</th><th>Reserva</th><th /></tr></thead>
          <tbody>{sq.map(p => {
            const st = STATUS[p.status ?? 'sub'], sh = minutesShare(p)
            return (
              <tr key={p.id}>
                <td className="click" data-pid={p.id} onClick={() => openPlayer(p.id)}><span className="row"><Face p={p} size={28} /><b style={{ fontWeight: 600 }}>{p.name}</b><Status p={p} /></span></td>
                <td><PosPill p={p} /></td>
                <td className="dim sm" style={{ whiteSpace: 'normal', maxWidth: 220 }}>{persLabels(p).join(' · ')}</td>
                <td title={st.help}>{st.name}</td>
                <td title={`Juega el ${Math.round(sh * 100)} % de los minutos; su rol espera alrededor del ${Math.round(st.share * 100)} %.`}><div className="row" style={{ gap: 6 }}><Bar v={sh * 100} c={sh >= st.share * 0.85 ? 'var(--good)' : 'var(--warn)'} /><span className="num sm dim">{Math.round(sh * 100)}/{Math.round(st.share * 100)}%</span></div></td>
                <td><BarN v={p.happy ?? 70} label="Conformidad" /></td>
                <td><BarN v={p.morale} label="Moral" /></td>
                <td><button className={`btn sm ${p.reserve ? 'on' : ''}`} onClick={() => { p.reserve = !p.reserve; done() }}>{p.reserve ? '✓ Juega' : 'No'}</button></td>
                <td>{canTalk(g, p) ? <button className="btn sm" onClick={() => setWho(p.id)}>Hablar</button> : <span className="dim sm" title={`Podés volver a hablarle desde el ${fmtDate(nextTalk(p))}.`}>Hablaron hace poco</span>}</td>
              </tr>)
          })}</tbody></table>
        <div className="dim sm" style={{ marginTop: 8 }}>La reserva juega los miércoles: suma rodaje y progreso a los que no tienen minutos y deja conformes a las promesas y suplentes. Necesita al menos siete jugadores.</div>
      </div>
      {who != null && g.players[who] && <TalkModal p={g.players[who]} onClose={() => { setWho(null); refresh() }} />}
    </div>
  )
}

export function TalkModal({ p, onClose }: { p: Player; onClose: () => void }) {
  const { g, save } = useGame()
  const [reply, setReply] = useState<string | null>(null)
  const [ns, setNs] = useState<SquadStatus>(p.status ?? 'sub')
  // una charla por semana: el límite lo pone el motor (`talk`); acá solo se explica
  const [allowed] = useState(() => canTalk(g, p))
  const happy = p.happy ?? 70
  const loan = !canSell(p)
  const opts: [TalkKind, string, string, boolean, string?][] = [
    ['praise', 'Felicitarlo por su momento', 'Funciona si viene jugando bien; si no, suena falso.', true],
    ['demand', 'Exigirle más', 'Los profesionales lo toman bien. Los temperamentales, no.', true],
    ['promise', 'Prometerle más minutos', 'Lo deja conforme ya, pero si en cinco semanas no cumplís se siente engañado.', (happy < 60 || !!p.wantsOut) && !p.promise],
    ['patience', 'Pedirle paciencia', 'Convence a los leales y a los poco ambiciosos.', happy < 60],
    ['stay', 'Decirle que no se va', 'Rechazás su pedido de salir.', !!p.wantsOut],
    ['free', 'Decirle que puede buscar club', 'Queda transferible.', !p.listed, loan ? 'Está a préstamo: no se lo puede declarar transferible.' : undefined],
  ]
  const act = (k: TalkKind) => { setReply(talk(g, p, k, ns)); save() }
  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 12 }}><Face p={p} size={52} /><div className="grow"><h3>Charla individual</h3><h2>{p.name}</h2><div className="dim sm">{STATUS[p.status ?? 'sub'].name} · {persLabels(p).join(' · ')} · conformidad {Math.round(happy)}%</div></div><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      {reply ? <div className="card col"><div style={{ lineHeight: 1.55 }}>{reply}</div><div><button className="btn primary" onClick={onClose}>Listo</button></div></div> : !allowed ? (
        <div className="card col"><div style={{ lineHeight: 1.55 }}>Ya hablaste con él esta semana. Podés volver a hablarle desde el {fmtDate(nextTalk(p))}.</div><div><button className="btn primary" onClick={onClose}>Listo</button></div></div>) : (
        <div className="col" style={{ gap: 8 }}>
          {opts.filter(o => o[3]).map(([k, t, d, no]) => <button key={k} className="opt" disabled={!!no} onClick={() => act(k)}><b>{t}</b><span className="dim sm">{no ?? d}</span></button>)}
          <div className="opt" style={{ cursor: 'default' }}><b>Cambiarle el rol en el plantel</b>
            <div className="row wrap"><Seg value={STATUS_KEYS.indexOf(ns)} options={STATUS_KEYS.map(k => STATUS[k].name)} onChange={v => setNs(STATUS_KEYS[v])} />
              <button className="btn sm primary" disabled={ns === p.status} onClick={() => act('status')}>Confirmar</button></div>
            <span className="dim sm">{STATUS[ns].help} Subirle el rol lo pone contento pero aumenta lo que espera jugar; bajárselo lo molesta.</span></div>
          <div className="dim sm">Solo podés tener una charla por semana con cada jugador.</div>
        </div>)}
    </Modal>
  )
}

/**
 * Negociación con el representante (F5). Compra: sobre un acuerdo con el club (`dealId`); la paciencia, los términos y las respuestas
 * se guardan en el trato (`openNegotiation`, `sendTerms`) y el pase se ejecuta recién con "Confirmar: fichar…" (`signDeal`).
 * Renovación: `demand` y `evalOffer` del motor; si se levanta, `renewWalk`. La ventana no escribe en `g`.
 */
export function NegotiationModal({ p, mode, dealId, onClose }: { p: Player; mode: NegMode; dealId?: number; onClose: (m?: { text: string; tone: 'ok' | 'warn' | 'err' }) => void }) {
  const { g, save, refresh } = useGame()
  const me = g.clubs[g.userClubId]
  const buy = mode === 'buy' && dealId != null
  const deal = buy ? (g.deals ?? []).find(d => d.id === dealId) : undefined
  // abrir la mesa fija lo que pide el representante y su paciencia (la primera vez); después la retoma como quedó
  const [start] = useState(() => (buy ? openNegotiation(g, dealId!) : null))
  const [renewDem] = useState(() => (buy ? null : demand(g, p, 'renew', naturalStatusFor(g, p))))
  useEffect(() => { if (start) { save(); refresh() } }, [])
  const ask = (start?.demand ?? renewDem!).terms
  const [offer, setOffer] = useState<Terms>(() => start?.terms ?? { ...ask, wage: Math.round((ask.wage * 0.9) / 100) * 100, bonus: Math.round((ask.bonus * 0.6) / 1000) * 1000 })
  const [log, setLog] = useState<string[]>(() => start?.log ?? [])
  const [agreed, setAgreed] = useState<Terms | null>(() => (deal?.neg?.agreed && start && sameT(deal.neg.agreed, start.terms) ? deal.neg.agreed : null))
  const [over, setOver] = useState<null | { text: string; tone: 'ok' | 'warn' | 'err' }>(null)
  const [warn, setWarn] = useState<string | null>(null)
  const pat = buy ? deal?.neg?.patience ?? start?.patience ?? 0 : renewDem!.patience
  const word = patienceWord(pat)
  const set = (k: keyof Terms, v: number | string) => { if (over) return; setOffer({ ...offer, [k]: v }); setAgreed(null); setWarn(null) }
  const logRef = useRef<HTMLDivElement | null>(null), endRef = useRef<HTMLDivElement | null>(null)
  // al terminar (firmó, renovó o se levantó de la mesa) el botón que tenía el foco desaparece: el foco va al resultado, dentro de la ventana
  useEffect(() => { if (over) endRef.current?.querySelector<HTMLElement>('.ib-result')?.focus() }, [over])
  const send = () => {
    const r = buy ? sendTerms(g, dealId!, offer) : evalOffer(g, p, 'renew', offer, renewDem!)
    if (!r) { setOver({ text: 'Este acuerdo ya no está abierto.', tone: 'warn' }); return }
    if (r.ok) setAgreed({ ...offer })
    else if (r.walk) {
      if (!buy) renewWalk(g, p.id)
      const until = buy ? (g.deals ?? []).find(d => d.id === dealId)?.blockUntil : undefined
      setOver({ text: `${r.msg} ${buy ? `La operación se cayó. No podés volver a ofertar por él hasta el ${until ? fmtDay(until) : ''}.` : `No va a volver a sentarse a negociar hasta el ${p.negBlock ? fmtDay(p.negBlock) : ''}.`}`, tone: 'err' })
    } else if (/no gasta paciencia/.test(r.msg)) setWarn(r.msg)
    else { if (!buy) setLog(l => [...l, r.msg].slice(-6)); if (r.counter) setOffer(r.counter) }
    if (buy) setLog([...((g.deals ?? []).find(d => d.id === dealId)?.neg?.log ?? [])])
    save(); refresh()
    setTimeout(() => logRef.current?.querySelector<HTMLElement>('[data-primary]')?.focus())
  }
  const confirm = () => {
    if (!agreed) return
    if (buy) {
      const r = signDeal(g, dealId!, agreed)
      if (!r.ok) { setWarn(r.reason ?? 'No se pudo firmar.'); setAgreed(null); return }
      setOver({ text: `Firmó. ${p.name} es nuevo jugador de ${me.name}.`, tone: 'ok' })
    } else { applyRenewal(g, p, agreed); setOver({ text: `Renovó. Contrato hasta diciembre de ${g.season + agreed.years}.`, tone: 'ok' }) }
    setAgreed(null)
    save(); refresh()
  }
  const imp = buy && deal ? dealImpact(g, 'buy', p.id, deal.fee, offer) : null
  const bill = squadOf(g, me.id).reduce((s, x) => s + (x.id === p.id ? 0 : x.wage), 0), capOver = bill + offer.wage - me.wageBudget
  const mine = p.clubId === me.id
  const num = (k: 'wage' | 'clause' | 'bonus', label: string) => <Amount id={`neg-${k}`} label={label} value={offer[k]} onChange={v => set(k, v)} disabled={!!over} auto={k === 'wage'} />
  // los montos del representante vienen del motor con los miles con punto ("US$ 3.100"): se escriben como el resto ("US$ 3,1 mil")
  const fmtLog = (t: string) => t.replace(/US\$ (\d{1,3}(?:\.\d{3})+)(?![\d,]| mil| M)/g, (_, n: string) => wm(Number(n.replace(/\./g, ''))))
  const cw = wageShown(g, p, p.wage, 401)
  return (
    <Modal onClose={() => onClose(over ?? undefined)}>
      <div className="mk-neg">
        <div className="row" style={{ marginBottom: 4 }}><Face p={p} size={52} /><div className="grow" style={{ minWidth: 0 }}><h2>{buy ? `Contrato con ${me.name}` : `Renovación de ${p.name}`}</h2>
          <div className="dim sm">{p.name} · {ageOn(p.birth, g.date)} años · <PosPill p={p} /> <Val p={p} /> · hoy cobra {mine ? wm(p.wage) : between(cw)} por mes</div></div>
          <button className="btn sm icon" aria-label="Cerrar la negociación" title="Cerrar (Esc)" onClick={() => onClose(over ?? undefined)}>✕</button></div>
        {buy && deal && <div className="sm">Transferencia acordada: <b>{money(deal.fee)}</b> (club: {deal.clubName})</div>}
        <blockquote className="mk-ask">El representante pide <b>{wm(ask.wage)} por mes</b>, {ask.years} {ask.years === 1 ? 'año' : 'años'}, prima {money(ask.bonus)}, rol {STATUS[ask.status].name.toLowerCase()}.</blockquote>
        {!over && <div className="mk-pat">Paciencia del representante: <b>{word}</b>. {patiencePhrase(word)}</div>}
        {buy && deal?.deadline && !over && <div className="ib-conseq">Si cerrás la ventana, la negociación queda como está hasta el {fmtDay(deal.deadline)} (vence el acuerdo con {deal.clubName}). Si se levanta de la mesa, o si dejás vencer el acuerdo o lo cancelás, no podés volver a ofertar por él durante 14 días de libro abierto; si lo dejás vencer o lo cancelás, {deal.clubName} además pide un 10 % más por sus jugadores.</div>}
        {!buy && !over && <div className="ib-conseq">Si se levanta de la mesa, no va a volver a negociar por un mes.</div>}
        <fieldset className="mk-terms" disabled={!!over}>
          <div className="grid2" style={{ gap: 12 }}>
            {num('wage', 'Sueldo mensual (US$)')}
            {num('bonus', 'Prima por firmar (US$)')}
            {num('clause', 'Cláusula (US$, 0 = sin cláusula)')}
            <div className="f">Años de contrato<Seg label="Años de contrato" value={offer.years - 1} options={['1', '2', '3', '4', '5']} onChange={v => set('years', v + 1)} /></div>
          </div>
          <div className="f">Rol prometido<Seg label="Rol prometido" value={STATUS_KEYS.indexOf(offer.status)} options={STATUS_KEYS.map(k => STATUS[k].name)} onChange={v => set('status', STATUS_KEYS[v])} /><span className="dim sm">Prometer un rol mayor ayuda a cerrar, pero después espera esos minutos.</span></div>
        </fieldset>
        {imp && !over && <ImpactBox imp={imp} kind="buy" title="Con estos términos" />}
        <div aria-live="polite">{!over && capOver > 0 && <Note kind="warn">Con este sueldo superás el tope por {wm(capOver)}. Esto no gasta paciencia.</Note>}</div>
        <div className="mk-log" role="status" ref={el => { logRef.current = el; endRef.current = el }}>
          {log.filter(l => !(agreed && /^¡Hay acuerdo/.test(l))).map((l, i) => <div key={i} className="mk-log-r"><span className="mk-log-i">{MI.info}</span><span>{fmtLog(l)}</span></div>)}
          {warn && <div className="mk-log-r warn"><span className="mk-log-i">{MI.bang}</span><span>{warn}</span></div>}
          {over && <div className={`ib-result ${over.tone === 'ok' ? '' : over.tone}`} tabIndex={-1}><span className="ib-result-ico">{over.tone === 'ok' ? MI.ok : MI.x}</span><span>{over.text}</span></div>}
          {agreed && !over && <div className="mk-agree"><b><span className="mk-agree-i">{MI.ok}</span>Hay acuerdo con el representante. Falta tu confirmación.</b>
            <div className="ib-acts"><button className="btn primary" data-primary onClick={confirm}>{buy ? `Confirmar: fichar a ${p.name}, ${money(deal?.fee ?? 0)}${agreed.bonus ? ` + prima ${money(agreed.bonus)}` : ''}` : `Confirmar: renovar a ${p.name} hasta diciembre de ${g.season + agreed.years}`}</button>
              <button className="btn" onClick={() => setAgreed(null)}>Seguir negociando</button></div></div>}
        </div>
        {!agreed && <div className="row mk-neg-foot"><span className="grow" />{over ? <button className="btn primary" data-primary onClick={() => onClose(over)}>Listo</button> : <><button className="btn" onClick={() => onClose()}>Cancelar</button><button className="btn primary" data-primary onClick={send}>Ofrecer</button></>}</div>}
      </div>
    </Modal>
  )
}
const sameT = (a: Terms, b: Terms) => a.wage === b.wage && a.years === b.years && a.status === b.status && a.clause === b.clause && a.bonus === b.bonus
export { Badge, fmtDate }
