import { useState } from 'react'
import { askingPrice, doTransfer, evaluateBid, wageDemand, windowOpen } from '../engine/career'
import { fmtDate } from '../engine/game'
import { POS_LABEL, POS_NAME, ageOn, bestRating, posRating } from '../engine/positions'
import { STATUS, canTalk, fmtRange, knowOf, minutesShare, nextTalk, persLabels, scout, shown, toggleShortlist } from '../engine/squad'
import { ATTR_GROUPS, ATTR_LABEL, A, type SeasonStats } from '../engine/types'
import { sab } from '../engine/week'
import { useGame } from '../store'
import { Badge, Cond, Face, Radar, Status, attrClass, avgRat, clubTheme, money, radarOf, ratClass } from './common'
import { NegotiationModal, TalkModal } from './Locker'

function StatLine({ s, label }: { s: SeasonStats; label: string }) {
  return (
    <tr><td>{label}</td><td className="r num">{s.apps}{s.subs ? ` (${s.subs})` : ''}</td><td className="r num">{s.mins}</td><td className="r num">{s.goals}</td>
      <td className="r num">{s.ast}</td><td className="r num">{s.yc}</td><td className="r num">{s.rc}</td><td className="r num">{s.motm}</td><td className="r num">{avgRat(s)}</td></tr>
  )
}
export function FavButton({ k, id }: { k: 'p' | 'c'; id: number }) {
  const { g, save, refresh } = useGame()
  const on = (g.favs ?? []).some(f => f.k === k && f.id === id)
  return <button className={`btn sm ${on ? 'on' : ''}`} title="Los favoritos aparecen en la barra lateral" onClick={() => { g.favs = on ? (g.favs ?? []).filter(f => !(f.k === k && f.id === id)) : [...(g.favs ?? []), { k, id }].slice(-8); save(); refresh() }}>{on ? '★ Favorito' : '☆ Favorito'}</button>
}

export function PlayerPage({ id, tab = 'resumen' }: { id: number; tab?: string }) {
  const { g, refresh, save, back, nav, openClub } = useGame()
  const p = g.players[id]
  const [fee, setFee] = useState(() => (p ? askingPrice(g, p) : 0))
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [neg, setNeg] = useState<null | { mode: 'buy' | 'renew'; fee: number }>(null)
  const [talkOpen, setTalkOpen] = useState(false)
  if (!p) return <div className="page"><div className="card">Este jugador ya no está en el juego (se retiró o se fue al exterior).</div><div><button className="btn" onClick={back}>◂ Atrás</button></div></div>
  const c = g.clubs[p.clubId], mine = p.clubId === g.userClubId, me = g.clubs[g.userClubId]
  const k = knowOf(g, p), known = k >= 100
  const est = p.attrs.map((v, i) => shown(g, p, v, 5, i))
  const est0 = shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99)
  const rd = radarOf(known ? p : { ...p, attrs: est.map(r => (r[0] + r[1]) / 2) }), age = ageOn(p.birth, g.date), open = windowOpen(g.date)
  const gap = p.pa - p.ca, potKnown = mine ? sab(g, 'youth') + sab(g, 'asst') >= 18 || age > 23 : k >= 70
  const potTxt = age > 26 ? 'Ya alcanzó su techo' : p.pa >= 85 ? 'Futura figura' : p.pa >= 78 ? 'Muy buen potencial' : gap >= 8 ? 'Buen potencial' : 'Potencial limitado'
  const starred = g.shortlist.includes(p.id)
  const talkOk = mine && canTalk(g, p), talkWhy = talkOk ? undefined : `Ya hablaron esta semana: podés volver a hablarle desde el ${fmtDate(nextTalk(p))}.`
  // salió de las inferiores del club (cantera real o camada del juego) y sigue ahí: no a préstamo ni transferido desde entonces
  const homegrown = p.youth && p.loanFrom == null && !g.transfers.some(t => t.pid === p.id && !t.loan)
  const done = () => { save(); refresh() }
  const setTab = (t: string) => nav({ page: 'player', id, tab: t })
  const bid = (loan: boolean) => {
    const r = evaluateBid(g, p, fee, loan)
    if (r.ok && !loan) { setMsg({ t: `${g.clubs[p.clubId].name} aceptó ${money(fee)}${p.clause && fee >= p.clause ? ' (pagaste la cláusula)' : ''}. Ahora hay que arreglar con el jugador.`, ok: true }); setNeg({ mode: 'buy', fee }); return }
    if (r.ok) { doTransfer(g, p, me.id, fee, loan); setMsg({ t: `${p.name} llega a préstamo hasta fin de temporada.`, ok: true }); done() }
    else { setMsg({ t: `${r.reason}${r.counter ? ` Aceptarían ${money(r.counter)}.` : ''}`, ok: false }); if (r.counter) setFee(r.counter) }
  }
  const TABS: [string, string][] = [['resumen', 'Resumen'], ['contrato', 'Contrato y mercado'], ['estadisticas', 'Estadísticas'], ['personal', mine ? 'Vestuario' : 'Ojeo']]
  const games = mine ? g.fixtures.filter(f => f.lines?.some(l => l.pid === p.id)).slice(-12).reverse() : []
  return (
    <div className="page">
      <div className="crumbs"><button className="linkish" onClick={back}>◂ Atrás</button><span>›</span><button className="linkish" onClick={() => openClub(c.id)}>{c.name}</button><span>›</span><b>{p.name}</b></div>
      <div className="pband" style={{ ...(clubTheme(c) as object) }}>
        <div className="pband-top">
          <div className="pband-face"><Face p={p} club={c} size={104} /></div>
          <div className="pband-id">
            <div className="row" style={{ gap: 10 }}><h1 className="pband-name">{p.name}</h1><span className="numbox">{p.num}</span></div>
            <div className="row wrap" style={{ gap: 6 }}><span className="boxed">{p.positions.map(x => POS_NAME[x] ?? POS_LABEL[x]).slice(0, 2).join(' / ')}</span><Status p={p} />{homegrown && <span className="chip" title={`Surgió de las inferiores de ${c.name}`}>Inferiores</span>}</div>
            <div className="row wrap" style={{ gap: 8 }}><span className="boxed">{p.nat}</span><b>{age} años</b><span className="dim">({fmtDate(p.birth)})</span><span className="dim">· pie {p.foot === 'D' ? 'derecho' : p.foot === 'I' ? 'izquierdo' : 'ambidiestro'}</span></div>
          </div>
          <div className="pband-sep" />
          <button className="pband-block linkish" onClick={() => openClub(c.id)}><Badge club={c} size={40} /><span className="col" style={{ gap: 4 }}><span className="boxed"><b>{c.name}</b></span>{mine && p.status ? <span className="boxed dim">{STATUS[p.status].name}</span> : <span className="boxed dim">{['Exterior', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][c.division]}</span>}</span></button>
          <div className="pband-sep" />
          <div className="pband-block col" style={{ gap: 4, alignItems: 'flex-start' }}><span className="boxed"><b>{money(p.value)}</b></span><span className="boxed">{money(p.wage)}/mes · dic {p.contractEnd}</span></div>
          <div className="pband-sep" />
          <div className="pband-block" style={{ gap: 18 }}>
            <div className="col" style={{ gap: 4 }}><span className="dim sm">Valoración</span><Stars v={(est0[0] + est0[1]) / 2} />{!known && <span className="dim sm">{fmtRange(est0)} · conocés el {Math.round(k)} %</span>}{known && <span className="dim sm">{Math.round(bestRating(p))}</span>}</div>
            <div className="col" style={{ gap: 4 }}><span className="dim sm">Potencial</span>{potKnown ? <Stars v={Math.max(p.pa, bestRating(p))} /> : <span className="dim">Desconocido</span>}<span className="dim sm">{potKnown ? potTxt : 'Mandalo a ojear'}</span></div>
          </div>
        </div>
        <div className="pband-tabs tabs">
          {TABS.map(([k2, l]) => <button key={k2} className={tab === k2 ? 'on' : ''} onClick={() => setTab(k2)}>{l}</button>)}
          <span className="grow" />
          <FavButton k="p" id={p.id} />
          {!mine && <button className={`btn sm ${starred ? 'on' : ''}`} aria-pressed={starred} onClick={() => { toggleShortlist(g, p.id); done() }}>{starred ? '✓ En seguimiento' : 'Seguir'}</button>}
          {!mine && !known && <button className={`btn sm ${g.scouting.includes(p.id) ? 'on' : ''}`} disabled={g.scouting.includes(p.id)} title="El scouting lo sigue unos días hasta conocerlo por completo" onClick={() => { scout(g, p); done() }}>{g.scouting.includes(p.id) ? 'Ojeándolo…' : 'Mandar a ojear'}</button>}
          {mine && <button className="btn sm" disabled={!talkOk} title={talkWhy} onClick={() => setTalkOpen(true)}>Hablar</button>}
          <button className="btn sm primary" onClick={() => setTab('contrato')}>{mine ? 'Contrato' : 'Ofertar'} ▸</button>
        </div>
      </div>

      {tab === 'resumen' && <>
        <div className="pgrid">
          <div className="card col pcol-pos">
            <h3>Puestos</h3>
            <div className="row wrap" style={{ gap: 5 }}>{p.positions.map(x => <span key={x} className="boxed" title={POS_NAME[x]}>{POS_LABEL[x]} <b>{fmtRange(shown(g, p, Math.round(posRating(p, x)), 9, 50, 1, 99))}</b></span>)}</div>
            <MiniPitch on={p.positions} />
            <div className="dim sm center">En verde, sus puestos; el más claro es el natural.</div>
            <Radar values={rd.values} labels={rd.labels} size={210} />
          </div>
          <div className="card pcol-attrs">
            <div className="attr-cols">
              {ATTR_GROUPS.filter(gr => (gr.name === 'Arquero') === (p.line === 'GK') || gr.name === 'Mentales' || gr.name === 'Físicos').map(gr => (
                <div key={gr.name}><h3 style={{ marginBottom: 8 }}>{gr.name}</h3>
                  {gr.attrs.map(a => { const r = est[A[a]]; return <div key={a} className="attr"><span className="attr-l">{ATTR_LABEL[a]}</span><span className={`v ${attrClass((r[0] + r[1]) / 2)}`} style={r[0] !== r[1] ? { width: 'auto', minWidth: 46, padding: '1px 6px', whiteSpace: 'nowrap' } : undefined}>{fmtRange(r)}</span></div> })}</div>))}
            </div>
            {!known && <div className="dim sm" style={{ marginTop: 10 }}>Lo que sabés de él es aproximado. Mandalo a ojear o enfrentalo para conocerlo mejor.</div>}
          </div>
          <div className="card col pcol-info">
            <h3>Información</h3>
            <div><div className="dim sm">Personalidad</div>{mine || k >= 60 ? <div className="row wrap" style={{ gap: 5, marginTop: 4 }}>{persLabels(p).map(l => <span key={l} className="boxed">{l}</span>)}</div> : <b>Desconocida</b>}</div>
            <div><div className="dim sm">Pie hábil</div><b>{p.foot === 'D' ? 'Derecho' : p.foot === 'I' ? 'Izquierdo' : 'Ambos'}</b></div>
            {mine && p.status && <div><div className="dim sm">Rol en el plantel</div><b>{STATUS[p.status].name}</b> <span className="dim sm">· juega el {Math.round(minutesShare(p) * 100)} % (espera {Math.round(STATUS[p.status].share * 100)} %)</span></div>}
            {!mine && <div><div className="dim sm">Conocimiento</div><b>{Math.round(k)} %</b>{g.scouting.includes(p.id) && <span className="acc sm"> · lo están ojeando</span>}</div>}
            {p.clause ? <div><div className="dim sm">Cláusula de rescisión</div><b>{money(p.clause)}</b></div> : null}
            {p.injury && <div className="bad sm">Lesión: {p.injury.desc} ({p.injury.days} días).</div>}
          </div>
        </div>
        <div className="pcards">
          <div className="card pc"><h3>Felicidad</h3>{mine ? <><b className="pc-v">{moodTxt(p.happy ?? 70)}</b><Cond v={p.happy ?? 70} /></> : <><b className="pc-v">{moodTxt(p.morale)}</b><span className="dim sm">Moral {Math.round(p.morale)}</span></>}</div>
          <div className="card pc"><h3>Físico</h3>{p.injury ? <><b className="pc-v bad">Lesionado</b><span className="dim sm">{p.injury.days} días</span></> : <><b className="pc-v">{condTxt(p.cond)}</b><Cond v={p.cond} /></>}</div>
          <div className="card pc"><h3>Forma</h3><div className="formbars" aria-label="Últimos puntajes">{p.form.slice(-5).map((r, i) => <i key={i} className={ratClass(r)} style={{ height: `${Math.max(12, (r - 4) * 16)}%` }} title={r.toFixed(1)} />)}</div><span className="dim sm">{p.form.length ? `Promedio de los últimos ${Math.min(5, p.form.length)}: ${(p.form.slice(-5).reduce((a2, b2) => a2 + b2, 0) / Math.min(5, p.form.length)).toFixed(2)}` : 'Sin partidos todavía'}</span></div>
          <div className="card pc"><h3>Disciplina</h3><b className="pc-v">{p.susp ? `Suspendido (${p.susp})` : p.stats.rc ? 'Expulsado esta temporada' : p.stats.yc >= 4 ? 'Al límite de amarillas' : 'Sin problemas'}</b><span className="dim sm">{p.stats.yc} amarillas · {p.stats.rc} rojas</span></div>
          <div className="card pc"><h3>Entrenamiento</h3>{mine ? <><b className="pc-v">{(p.ups ?? 0) >= 3 ? 'Progresa bien' : (p.ups ?? 0) >= 1 ? 'Progresa' : 'Sin mejoras todavía'}</b><span className="dim sm">{p.ups ?? 0} atributos ganados esta temporada</span></> : <span className="dim sm">Solo se conoce el de tus jugadores.</span>}</div>
          <div className="card pc pc-wide"><h3>Temporada {g.season}</h3>
            <table className="mini-table"><thead><tr><th>PJ</th><th>Min</th><th>G</th><th>A</th><th>Rem</th><th>Fig</th><th>TA</th><th>Prom</th></tr></thead>
              <tbody><tr><td className="num">{p.stats.apps}{p.stats.subs ? ` (${p.stats.subs})` : ''}</td><td className="num">{p.stats.mins}</td><td className="num">{p.stats.goals}</td><td className="num">{p.stats.ast}</td><td className="num">{p.stats.shots}</td><td className="num">{p.stats.motm}</td><td className="num">{p.stats.yc}</td><td><span className={`ratbox ${ratClass(p.stats.apps + p.stats.subs ? p.stats.ratSum / (p.stats.apps + p.stats.subs) : 6.5)}`}>{avgRat(p.stats)}</span></td></tr></tbody></table></div>
          <div className="card pc"><h3>Carrera</h3><b className="pc-v">{new Set(p.history.map(h => h.clubId).concat(p.clubId)).size} {new Set(p.history.map(h => h.clubId).concat(p.clubId)).size === 1 ? 'club' : 'clubes'}</b><span className="dim sm">{p.history.reduce((a2, h) => a2 + h.stats.apps + h.stats.subs, 0) + p.stats.apps + p.stats.subs} partidos · {p.history.reduce((a2, h) => a2 + h.stats.goals, 0) + p.stats.goals} goles</span></div>
        </div>
      </>}

      {tab === 'contrato' && <div className="dash">
        <div className="card s6 col"><h3>Contrato</h3>
          <div className="row between"><span className="dim">Valor de mercado</span><b>{money(p.value)}</b></div><div className="row between"><span className="dim">Sueldo mensual</span><b>{money(p.wage)}</b></div>
          <div className="row between"><span className="dim">Vence</span><b className={p.contractEnd <= g.season ? 'warn' : ''}>dic {p.contractEnd}</b></div>
          {p.clause ? <div className="row between"><span className="dim">Cláusula de rescisión</span><b>{money(p.clause)}</b></div> : null}
          {p.loanFrom != null && <div className="row between"><span className="dim">A préstamo de</span><b>{g.clubs[p.loanFrom]?.name}</b></div>}
          {mine && <div className="row wrap">
            <button className="btn sm" disabled={!!p.negBlock && g.date < p.negBlock} title={p.negBlock && g.date < p.negBlock ? `No quiere negociar hasta el ${fmtDate(p.negBlock)}` : ''} onClick={() => setNeg({ mode: 'renew', fee: 0 })}>Negociar renovación</button>
            <button className={`btn sm ${p.listed ? 'on' : ''}`} onClick={() => { p.listed = !p.listed; done() }}>{p.listed ? 'Quitar de transferibles' : 'Declarar transferible'}</button></div>}</div>
        <div className="card s6 col"><h3>{mine ? 'Mercado' : 'Negociar'}</h3>
          {mine ? <div className="dim sm" style={{ lineHeight: 1.5 }}>Pedido estimado: <b style={{ color: 'var(--text)' }}>{money(askingPrice(g, p))}</b>. Si lo declarás transferible van a llegar más ofertas, por menos plata.</div> : (<>
            <div className="dim sm">Cobraría alrededor de {money(wageDemand(g, p, me))}/mes · Tu presupuesto: <b style={{ color: 'var(--text)' }}>{money(me.budget)}</b>{p.clause ? <> · Cláusula: <b style={{ color: 'var(--text)' }}>{money(p.clause)}</b></> : null}</div>
            <label className="f">Oferta (US$)<input id="bid-fee" type="number" step={10000} min={0} value={fee} onChange={e => setFee(Number(e.target.value))} /></label>
            <div className="row wrap"><button className="btn primary sm" disabled={!open} onClick={() => bid(false)}>Ofertar compra</button><button className="btn sm" disabled={!open} onClick={() => bid(true)}>Pedir préstamo</button></div>
            {!open && <div className="warn sm">El libro de pases está cerrado.</div>}</>)}
          {msg && <div className={`sm ${msg.ok ? 'good' : 'warn'}`} style={{ lineHeight: 1.45 }}>{msg.t}</div>}</div>
        <div className="card s12"><h3 style={{ marginBottom: 6 }}>Movimientos</h3>
          {g.transfers.filter(t => t.pid === p.id).length ? <table><tbody>{g.transfers.filter(t => t.pid === p.id).map((t, i) => <tr key={i}><td className="dim">{fmtDate(t.date)}</td><td>{t.from} → {t.to}</td><td className="r num">{t.loan ? 'Préstamo' : t.fee ? money(t.fee) : 'Libre'}</td></tr>)}</tbody></table>
            : <div className="dim sm">Sin movimientos desde que empezó tu carrera.</div>}</div>
      </div>}

      {tab === 'estadisticas' && <div className="col">
        <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Por temporada</h3>
          <table><thead><tr><th>Temporada</th><th className="r">PJ</th><th className="r">Min</th><th className="r">Goles</th><th className="r">Asist</th><th className="r">Am</th><th className="r">Roj</th><th className="r">Fig</th><th className="r">Prom</th></tr></thead>
            <tbody><StatLine s={p.stats} label={`${g.season} · ${c.short}`} />{[...p.history].reverse().map(h => <StatLine key={h.season} s={h.stats} label={`${h.season} · ${g.clubs[h.clubId]?.short ?? ''}`} />)}</tbody></table></div>
        {mine && <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Últimos partidos</h3>
          {games.length ? <table><thead><tr><th>Fecha</th><th>Rival</th><th>Torneo</th><th className="r">Min</th><th className="r">G</th><th className="r">A</th><th className="r">Puntaje</th></tr></thead>
            <tbody>{games.map(f => { const l = f.lines!.find(x => x.pid === p.id)!, o = g.clubs[f.home === me.id ? f.away : f.home]; return (
              <tr key={f.id}><td className="dim">{fmtDate(f.date)}</td><td><span className="row"><Badge club={o} size={20} />{o.short}</span></td><td className="dim sm">{g.comps[f.comp]?.name}</td>
                <td className="r num">{l.mins}</td><td className="r num">{l.goals || ''}</td><td className="r num">{l.ast || ''}</td><td className={`r num ${ratClass(l.rating)}`}><b>{l.rating.toFixed(1)}</b></td></tr>) })}</tbody></table>
            : <div className="dim sm">Todavía no jugó con tu equipo.</div>}</div>}
      </div>}

      {tab === 'personal' && <div className="dash">
        <div className="card s6 col"><h3>Personalidad</h3>
          {mine || k >= 60 ? <div className="row wrap">{persLabels(p).map(l => <span key={l} className="chip">{l}</span>)}</div> : <div className="dim">Todavía no la conocés. Mandalo a ojear para saber cómo es.</div>}
          <div className="row between"><span className="dim">Potencial</span><b>{potKnown ? potTxt : 'Desconocido'}</b></div></div>
        {mine ? <div className="card s6 col"><h3>En el plantel</h3>
          {p.status && <><div className="row between"><span className="dim">Rol</span><b>{STATUS[p.status].name}</b></div>
            <div className="row between"><span className="dim">Minutos</span><span>{Math.round(minutesShare(p) * 100)} % (espera {Math.round(STATUS[p.status].share * 100)} %)</span></div>
            <div className="row between"><span className="dim">Conformidad</span><Cond v={p.happy ?? 70} /></div></>}
          {p.promise && <div className="acc sm">Le prometiste más minutos hasta el {fmtDate(p.promise.until)}.</div>}
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} disabled={!talkOk} onClick={() => setTalkOpen(true)}>Hablar con él</button>
          {!talkOk && <div className="dim sm">{talkWhy}</div>}</div>
          : <div className="card s6 col"><h3>Ojeo</h3>
            <div className="row between"><span className="dim">Conocimiento</span><div className="row" style={{ gap: 6 }}><div className="bar" style={{ width: 100 }}><i style={{ width: `${k}%`, background: 'var(--accent)' }} /></div><b className="num">{Math.round(k)}%</b></div></div>
            <div className="dim sm" style={{ lineHeight: 1.5 }}>{known ? 'Lo conocés por completo.' : g.scouting.includes(p.id) ? 'El scouting lo está siguiendo.' : 'Mandarlo a ojear revela sus atributos exactos, su potencial y su personalidad. Enfrentarlo también ayuda.'}</div>
            {!known && !g.scouting.includes(p.id) && <button className="btn sm primary" style={{ alignSelf: 'flex-start' }} onClick={() => { scout(g, p); done() }}>Mandar a ojear</button>}</div>}
      </div>}

      {neg && <NegotiationModal p={p} mode={neg.mode} fee={neg.fee} onClose={m => { setNeg(null); if (m) setMsg({ t: m, ok: !/cay|termina/.test(m) }); done() }} />}
      {talkOpen && mine && <TalkModal p={p} onClose={() => { setTalkOpen(false); done() }} />}
    </div>
  )
}

/** Valoración en estrellas (media estrella de paso). */
function Stars({ v }: { v: number }) {
  const n = Math.max(0.5, Math.min(5, Math.round(((v - 42) / 9) * 2) / 2))
  return <span className="stars" aria-label={`${n} estrellas de 5`} title={`${n} de 5`}>{[0, 1, 2, 3, 4].map(i => <i key={i} className={n >= i + 1 ? 'on' : n >= i + 0.5 ? 'half' : ''} />)}</span>
}
/** Cancha chica con los puestos del jugador (ataca hacia la derecha). */
const XY: Record<string, [number, number]> = { GK: [7, 50], DC: [24, 50], DR: [27, 84], DL: [27, 16], DM: [40, 50], MC: [53, 50], MR: [56, 86], ML: [56, 14], AMC: [68, 50], AMR: [72, 82], AML: [72, 18], ST: [86, 50] }
function MiniPitch({ on }: { on: string[] }) {
  return (
    <svg className="minipitch" viewBox="0 0 100 64" role="img" aria-label={`Puestos: ${on.join(', ')}`}>
      <rect x="1" y="1" width="98" height="62" rx="2" className="mp-f" />
      <line x1="50" y1="1" x2="50" y2="63" className="mp-l" /><circle cx="50" cy="32" r="8" className="mp-l" />
      <rect x="1" y="17" width="14" height="30" className="mp-l" /><rect x="85" y="17" width="14" height="30" className="mp-l" />
      {Object.entries(XY).map(([k, [x, y]]) => { const i = on.indexOf(k); return <circle key={k} cx={x} cy={(y * 64) / 100} r={i === 0 ? 3.6 : 2.8} className={i === 0 ? 'mp-nat' : i > 0 ? 'mp-alt' : 'mp-off'}><title>{k}</title></circle> })}
    </svg>
  )
}
const moodTxt = (v: number) => (v >= 80 ? 'Muy contento' : v >= 60 ? 'Contento' : v >= 40 ? 'Conforme' : v >= 25 ? 'Molesto' : 'Muy molesto')
const condTxt = (v: number) => (v >= 95 ? 'Óptimo' : v >= 85 ? 'Bien' : v >= 70 ? 'Cansado' : 'Agotado')
