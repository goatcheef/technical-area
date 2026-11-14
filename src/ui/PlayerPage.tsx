import { useState } from 'react'
import { askingPrice, doTransfer, evaluateBid, wageDemand, windowOpen } from '../engine/career'
import { fmtDate } from '../engine/game'
import { POS_LABEL, POS_NAME, ageOn, bestRating, posRating } from '../engine/positions'
import { STATUS, fmtRange, knowOf, minutesShare, persLabels, scout, shown } from '../engine/squad'
import { ATTR_GROUPS, ATTR_LABEL, A, type SeasonStats } from '../engine/types'
import { sab } from '../engine/week'
import { useGame } from '../store'
import { Badge, Cond, Face, PosPill, Radar, Spark, Status, attrClass, avgRat, clubTheme, money, radarOf, ratClass } from './common'
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
  const rd = radarOf(known ? p : { ...p, attrs: est.map(r => (r[0] + r[1]) / 2) }), age = ageOn(p.birth, g.date), open = windowOpen(g.date)
  const gap = p.pa - p.ca, potKnown = mine ? sab(g, 'youth') + sab(g, 'asst') >= 18 || age > 23 : k >= 70
  const potTxt = age > 26 ? 'Ya alcanzó su techo' : p.pa >= 85 ? 'Futura figura' : p.pa >= 78 ? 'Muy buen potencial' : gap >= 8 ? 'Buen potencial' : 'Potencial limitado'
  const starred = g.shortlist.includes(p.id)
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
      <div className="hero" style={{ ...(clubTheme(c) as object) }}>
        <div className="row wrap" style={{ gap: 16 }}>
          <Face p={p} club={c} size={84} />
          <div className="grow">
            <div className="row wrap" style={{ gap: 8 }}><PosPill p={p} /><Status p={p} />{p.gen && <span className="chip">Inferiores</span>}</div>
            <h1 style={{ fontSize: '2.3rem', marginTop: 6 }}>{p.name}</h1>
            <div className="row dim wrap" style={{ marginTop: 4 }}><button className="linkish row" style={{ gap: 6 }} onClick={() => openClub(c.id)}><Badge club={c} size={22} />{c.name}</button><span>· N.º {p.num} · {age} años · {p.nat} · pie {p.foot === 'D' ? 'derecho' : p.foot === 'I' ? 'izquierdo' : 'ambidiestro'}</span></div>
          </div>
          <div className="kpi center"><h3>Valoración</h3><span className="big" style={{ fontSize: known ? '3.2rem' : '2.4rem' }}>{fmtRange(shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99))}</span>{!known && <span className="dim sm">Conocimiento {Math.round(k)}%</span>}</div>
          <div className="col" style={{ gap: 6 }}>
            <button className="btn sm" onClick={back} title="Atrás (Alt + ←)">◂ Atrás</button>
            <FavButton k="p" id={p.id} />
            {!mine && <button className={`btn sm ${starred ? 'on' : ''}`} onClick={() => { g.shortlist = starred ? g.shortlist.filter(x => x !== p.id) : [...g.shortlist, p.id]; done() }}>{starred ? '✓ En seguimiento' : 'Seguir'}</button>}
            {!mine && !known && <button className={`btn sm ${g.scouting.includes(p.id) ? 'on' : ''}`} disabled={g.scouting.includes(p.id)} title="El scouting lo sigue unos días hasta conocerlo por completo" onClick={() => { scout(g, p); done() }}>{g.scouting.includes(p.id) ? 'Ojeándolo…' : 'Mandar a ojear'}</button>}
            {mine && <button className="btn sm" onClick={() => setTalkOpen(true)}>Hablar</button>}
          </div>
        </div>
      </div>
      <div className="tabs">{TABS.map(([k2, l]) => <button key={k2} className={tab === k2 ? 'on' : ''} onClick={() => setTab(k2)}>{l}</button>)}</div>

      {tab === 'resumen' && <div className="dash">
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
          {p.injury && <div className="bad sm">Lesión: {p.injury.desc} ({p.injury.days} días).</div>}</div>
        <div className="card s4 col"><h3>Temporada {g.season}</h3>
          <div className="row between"><span className="dim">Partidos</span><b className="num">{p.stats.apps}{p.stats.subs ? ` (+${p.stats.subs})` : ''}</b></div>
          <div className="row between"><span className="dim">Goles · asistencias</span><b className="num">{p.stats.goals} · {p.stats.ast}</b></div>
          <div className="row between"><span className="dim">Promedio</span><b className="num">{avgRat(p.stats)}</b></div></div>
        <div className="card s4 col"><h3>Contrato</h3>
          <div className="row between"><span className="dim">Valor</span><b>{money(p.value)}</b></div><div className="row between"><span className="dim">Sueldo</span><b>{money(p.wage)}/mes</b></div>
          <div className="row between"><span className="dim">Vence</span><b className={p.contractEnd <= g.season ? 'warn' : ''}>dic {p.contractEnd}</b></div>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setTab('contrato')}>{mine ? 'Renovar o vender' : 'Negociar'} ▸</button></div>
      </div>}

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
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setTalkOpen(true)}>Hablar con él</button></div>
          : <div className="card s6 col"><h3>Ojeo</h3>
            <div className="row between"><span className="dim">Conocimiento</span><div className="row" style={{ gap: 6 }}><div className="bar" style={{ width: 100 }}><i style={{ width: `${k}%`, background: 'var(--accent)' }} /></div><b className="num">{Math.round(k)}%</b></div></div>
            <div className="dim sm" style={{ lineHeight: 1.5 }}>{known ? 'Lo conocés por completo.' : g.scouting.includes(p.id) ? 'El scouting lo está siguiendo.' : 'Mandarlo a ojear revela sus atributos exactos, su potencial y su personalidad. Enfrentarlo también ayuda.'}</div>
            {!known && !g.scouting.includes(p.id) && <button className="btn sm primary" style={{ alignSelf: 'flex-start' }} onClick={() => { scout(g, p); done() }}>Mandar a ojear</button>}</div>}
      </div>}

      {neg && <NegotiationModal p={p} mode={neg.mode} fee={neg.fee} onClose={m => { setNeg(null); if (m) setMsg({ t: m, ok: !/cay|termina/.test(m) }); done() }} />}
      {talkOpen && <TalkModal p={p} onClose={() => { setTalkOpen(false); done() }} />}
    </div>
  )
}
