import { useState } from 'react'
import { doTransfer } from '../engine/career'
import { addDays, fmtDate, news, squadOf } from '../engine/game'
import { ageOn, bestRating } from '../engine/positions'
import { STATUS, STATUS_KEYS, applyRenewal, canTalk, demand, evalOffer, harmony, minutesShare, naturalStatusFor, nextTalk, persLabels, talk, type NegMode, type TalkKind } from '../engine/squad'
import type { Player, SquadStatus, Terms } from '../engine/types'
import { useGame } from '../store'
import { Badge, Face, Gauge, Modal, Ovr, PosPill, Seg, Status, money } from './common'
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
  const opts: [TalkKind, string, string, boolean][] = [
    ['praise', 'Felicitarlo por su momento', 'Funciona si viene jugando bien; si no, suena falso.', true],
    ['demand', 'Exigirle más', 'Los profesionales lo toman bien. Los temperamentales, no.', true],
    ['promise', 'Prometerle más minutos', 'Lo deja conforme ya, pero si en cinco semanas no cumplís se siente engañado.', (happy < 60 || !!p.wantsOut) && !p.promise],
    ['patience', 'Pedirle paciencia', 'Convence a los leales y a los poco ambiciosos.', happy < 60],
    ['stay', 'Decirle que no se va', 'Rechazás su pedido de salir.', !!p.wantsOut],
    ['free', 'Decirle que puede buscar club', 'Queda transferible.', !p.listed],
  ]
  const act = (k: TalkKind) => { setReply(talk(g, p, k, ns)); save() }
  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 12 }}><Face p={p} size={52} /><div className="grow"><h3>Charla individual</h3><h2>{p.name}</h2><div className="dim sm">{STATUS[p.status ?? 'sub'].name} · {persLabels(p).join(' · ')} · conformidad {Math.round(happy)}%</div></div><button className="btn sm" onClick={onClose}>Cerrar</button></div>
      {reply ? <div className="card col"><div style={{ lineHeight: 1.55 }}>{reply}</div><div><button className="btn primary" onClick={onClose}>Listo</button></div></div> : !allowed ? (
        <div className="card col"><div style={{ lineHeight: 1.55 }}>Ya hablaste con él esta semana. Podés volver a hablarle desde el {fmtDate(nextTalk(p))}.</div><div><button className="btn primary" onClick={onClose}>Listo</button></div></div>) : (
        <div className="col" style={{ gap: 8 }}>
          {opts.filter(o => o[3]).map(([k, t, d]) => <button key={k} className="opt" onClick={() => act(k)}><b>{t}</b><span className="dim sm">{d}</span></button>)}
          <div className="opt" style={{ cursor: 'default' }}><b>Cambiarle el rol en el plantel</b>
            <div className="row wrap"><Seg value={STATUS_KEYS.indexOf(ns)} options={STATUS_KEYS.map(k => STATUS[k].name)} onChange={v => setNs(STATUS_KEYS[v])} />
              <button className="btn sm primary" disabled={ns === p.status} onClick={() => act('status')}>Confirmar</button></div>
            <span className="dim sm">{STATUS[ns].help} Subirle el rol lo pone contento pero aumenta lo que espera jugar; bajárselo lo molesta.</span></div>
          <div className="dim sm">Solo podés tener una charla por semana con cada jugador.</div>
        </div>)}
    </Modal>
  )
}

/** Negociación de contrato con el representante (compra o renovación). */
export function NegotiationModal({ p, mode, fee = 0, onClose }: { p: Player; mode: NegMode; fee?: number; onClose: (msg?: string) => void }) {
  const { g, save, refresh } = useGame()
  const me = g.clubs[g.userClubId]
  const [dem] = useState(() => demand(g, p, mode, naturalStatusFor(g, p)))
  const [offer, setOffer] = useState<Terms>(() => ({ ...dem.terms, wage: Math.round(dem.terms.wage * 0.9 / 100) * 100, bonus: Math.round(dem.terms.bonus * 0.6 / 1000) * 1000 }))
  const [log, setLog] = useState<{ t: string; ok?: boolean }[]>([])
  const [over, setOver] = useState(false)
  const set = (k: keyof Terms, v: number | string) => setOffer({ ...offer, [k]: v })
  const usd = (n: number) => `US$ ${n.toLocaleString('es-AR')}`
  const send = () => {
    const r = evalOffer(g, p, mode, offer, dem)
    if (r.ok) {
      if (mode === 'buy') { doTransfer(g, p, me.id, fee, false, false, offer) } else applyRenewal(g, p, offer)
      setLog([...log, { t: mode === 'buy' ? `¡Firmó! ${p.name} es nuevo jugador de ${me.name}.` : `¡Renovó! Contrato hasta diciembre de ${g.season + offer.years}.`, ok: true }]); setOver(true)
    } else if (r.walk) {
      if (mode === 'renew') p.negBlock = addDays(g.date, 30)
      else news(g, { tag: 'mercado', clubId: me.id, title: `Se cayó el pase de ${p.name}`, body: `${me.name} había acordado con ${g.clubs[p.clubId].name}, pero no llegó a un acuerdo con ${p.name} y la operación se cayó.` })
      setLog([...log, { t: `${r.msg}${mode === 'renew' ? ' No va a volver a sentarse a negociar por un mes.' : ' La operación se cayó.'}`, ok: false }]); setOver(true)
    } else { setLog([...log, { t: r.msg }]); if (r.counter) setOffer(r.counter) }
    save(); refresh()
  }
  const num = (k: 'wage' | 'clause' | 'bonus', step: number) => <input type="number" min={0} step={step} value={offer[k]} disabled={over} onChange={e => set(k, Math.max(0, Number(e.target.value)))} />
  return (
    <Modal onClose={() => onClose()}>
      <div className="row" style={{ marginBottom: 12 }}><Face p={p} size={52} /><div className="grow"><h3>{mode === 'buy' ? `Contrato con ${me.name}` : 'Renovación'}</h3><h2>{p.name}</h2>
        <div className="dim sm">{ageOn(p.birth, g.date)} años · {persLabels(p).join(' · ')} · hoy cobra {usd(p.wage)} por mes{mode === 'buy' ? ` · transferencia acordada en ${money(fee)}` : ''}</div></div><Ovr v={bestRating(p)} /></div>
      <div className="card col" style={{ marginBottom: 12 }}>
        <div className="dim sm">El representante pide alrededor de <b style={{ color: 'var(--text)' }}>{usd(dem.terms.wage)} por mes</b>, {dem.terms.years} años, una prima de {usd(dem.terms.bonus)} y el rol de <b style={{ color: 'var(--text)' }}>{STATUS[dem.terms.status].name.toLowerCase()}</b>. Su paciencia es limitada: cada oferta baja la suma.</div>
        <div className="grid2" style={{ gap: 12 }}>
          <label className="f">Sueldo mensual (US$){num('wage', 100)}</label>
          <label className="f">Prima por firmar (US$){num('bonus', 1000)}</label>
          <label className="f" title="Si un club paga este monto, se lo lleva sin negociar. 0 = sin cláusula. Una cláusula baja le gusta al jugador ambicioso; una alta lo molesta.">Cláusula de rescisión (US$, 0 = sin cláusula){num('clause', 50000)}</label>
          <div className="f">Años de contrato<Seg value={offer.years - 1} options={['1', '2', '3', '4', '5']} onChange={v => !over && set('years', v + 1)} /></div>
        </div>
        <div className="f">Rol prometido<Seg value={STATUS_KEYS.indexOf(offer.status)} options={STATUS_KEYS.map(k => STATUS[k].name)} onChange={v => !over && set('status', STATUS_KEYS[v])} /><span className="dim sm">Prometer un rol mayor ayuda a cerrar, pero después espera esos minutos.</span></div>
      </div>
      {log.map((l, i) => <div key={i} className={`sm ${l.ok === true ? 'good' : l.ok === false ? 'bad' : 'warn'}`} style={{ lineHeight: 1.5, marginBottom: 6 }}>{l.t}</div>)}
      <div className="row"><span className="grow" />{over ? <button className="btn primary" onClick={() => onClose(log[log.length - 1]?.t)}>Listo</button> : <><button className="btn" onClick={() => onClose()}>Cancelar</button><button className="btn primary" onClick={send}>Ofrecer</button></>}</div>
    </Modal>
  )
}
export { Badge, fmtDate }
