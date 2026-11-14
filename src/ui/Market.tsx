import { useMemo, useState } from 'react'
import { acceptOffer, askingPrice, haggle, rejectOffer, wageBill, windowOpen } from '../engine/career'
import { fmtDate } from '../engine/game'
import { POS_LABEL, ageOn } from '../engine/positions'
import type { Player, Pos } from '../engine/types'
import { useGame } from '../store'
import { knowOf } from '../engine/squad'
import { Badge, Face, Ovr, PosPill, Status, Val, money } from './common'

const POSS: Pos[] = ['GK', 'DR', 'DC', 'DL', 'DM', 'MC', 'MR', 'ML', 'AMC', 'AMR', 'AML', 'ST']

export function Market() {
  const { g, refresh, save, openPlayer } = useGame()
  const [tab, setTab] = useState(g.offers.length ? 'offers' : 'search')
  const [pos, setPos] = useState('')
  const [maxAge, setMaxAge] = useState(40)
  const [maxVal, setMaxVal] = useState(0)
  const [minOvr, setMinOvr] = useState(60)
  const [div, setDiv] = useState(0)
  const [only, setOnly] = useState(false)
  const [note, setNote] = useState('')
  const club = g.clubs[g.userClubId], open = windowOpen(g.date)
  const done = () => { save(); refresh() }
  const results = useMemo(() => Object.values(g.players).filter(p => p.clubId !== club.id && (!pos || p.positions.includes(pos as Pos)) && p.ca >= minOvr
    && ageOn(p.birth, g.date) <= maxAge && (!maxVal || askingPrice(g, p) <= maxVal) && (!div || g.clubs[p.clubId].division === div) && (!only || p.listed || p.contractEnd <= g.season))
    .sort((a, b) => b.ca - a.ca).slice(0, 60), [g, g.date, g.transfers.length, pos, maxAge, maxVal, minOvr, div, only, club.id])
  const rows = (list: Player[]) => (
    <div className="card scroll-x"><table>
      <thead><tr><th>Jugador</th><th>Pos</th><th>Club</th><th className="r">Edad</th><th className="r">Val</th><th className="r">Pot.</th><th className="r">Valor</th><th className="r">Pedido</th><th className="r">Sueldo</th><th className="r">Contrato</th><th className="r">Conoc.</th></tr></thead>
      <tbody>{list.map(p => { const c = g.clubs[p.clubId], age = ageOn(p.birth, g.date), gap = p.pa - p.ca; return (
        <tr key={p.id} className="click" onClick={() => openPlayer(p.id)}>
          <td><span className="row"><Face p={p} club={c} size={30} /><b style={{ fontWeight: 600 }}>{p.name}</b><Status p={p} /></span></td><td><PosPill p={p} /></td>
          <td><span className="row"><Badge club={c} size={20} />{c.short}</span></td><td className="r num">{age}</td><td className="r"><Val p={p} /></td>
          <td className="r">{age <= 23 && knowOf(g, p) >= 70 ? <span className={gap >= 12 ? 'good' : gap >= 6 ? '' : 'dim'}>{gap >= 12 ? '★★★' : gap >= 6 ? '★★' : '★'}</span> : <span className="dim">–</span>}</td>
          <td className="r num">{money(p.value)}</td><td className="r num"><b>{money(askingPrice(g, p))}</b></td><td className="r num dim">{money(p.wage)}</td><td className="r num dim">{p.contractEnd}</td><td className="r num dim">{g.scouting.includes(p.id) ? 'Ojeando' : `${Math.round(knowOf(g, p))}%`}</td></tr>) })}</tbody>
    </table>{!list.length && <div className="dim sm" style={{ padding: 12 }}>No hay jugadores que cumplan esos filtros.</div>}</div>)
  const L = club.ledger
  return (
    <div className="page">
      <div className="hero row wrap" style={{ gap: 22 }}>
        <div className="grow"><h3>Mercado de pases</h3><h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>{open ? 'Libro abierto' : 'Libro cerrado'}</h1><div className="dim sm">{open ? 'Podés comprar, vender y pedir préstamos.' : 'Reabre el 1 de enero y el 25 de junio. Mientras tanto podés seguir jugadores.'}</div></div>
        <div className="kpi"><h3>Presupuesto</h3><b>{money(club.budget)}</b></div><div className="kpi"><h3>Caja</h3><b className={club.balance < 0 ? 'bad' : ''}>{money(club.balance)}</b></div>
        <div className="kpi"><h3>Sueldos / tope</h3><b>{money(wageBill(g, club.id))} / {money(club.wageBudget)}</b></div>
      </div>
      <div className="seg" style={{ alignSelf: 'flex-start' }}>{[['search', 'Buscar jugadores'], ['offers', `Ofertas recibidas (${g.offers.length})`], ['short', `Seguimiento (${g.shortlist.length})`], ['moves', 'Movimientos'], ['fin', 'Finanzas']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'search' && (<>
        <div className="card row wrap" style={{ alignItems: 'flex-end', gap: 14 }}>
          <label className="f">Puesto<select id="mk-pos" value={pos} onChange={e => setPos(e.target.value)}><option value="">Todos</option>{POSS.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}</select></label>
          <label className="f">Categoría<select id="mk-div" value={div} onChange={e => setDiv(Number(e.target.value))}><option value={0}>Todas</option><option value={1}>Liga Profesional</option><option value={2}>Primera Nacional</option></select></label>
          <label className="f" style={{ minWidth: 150 }}>Valoración mínima: {minOvr}<input id="mk-ovr" type="range" min={40} max={90} value={minOvr} onChange={e => setMinOvr(Number(e.target.value))} /></label>
          <label className="f" style={{ minWidth: 150 }}>Edad máxima: {maxAge}<input id="mk-age" type="range" min={16} max={40} value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} /></label>
          <label className="f">Precio máximo<select id="mk-val" value={maxVal} onChange={e => setMaxVal(Number(e.target.value))}><option value={0}>Sin límite</option><option value={club.budget}>Mi presupuesto</option>{[250000, 500000, 1000000, 2500000, 5000000, 10000000].map(v => <option key={v} value={v}>{money(v)}</option>)}</select></label>
          <button className={`btn ${only ? 'on' : ''}`} onClick={() => setOnly(!only)}>Solo transferibles o con contrato por vencer</button>
        </div>
        {rows(results)}</>)}

      {tab === 'offers' && <div className="col">
        {note && <div className="card acc">{note}</div>}
        {g.offers.map(o => { const p = g.players[o.pid]; if (!p) return null; return (
          <div key={o.id} className="card row wrap" style={{ gap: 14 }}>
            <Face p={p} club={club} size={46} /><div className="grow" style={{ cursor: 'pointer' }} onClick={() => openPlayer(p.id)}><b>{p.name}</b> <PosPill p={p} /> <Ovr v={p.ca} /><div className="dim sm">Valor {money(p.value)} · llegó el {fmtDate(o.date)}</div></div>
            <div className="row">{o.from ? <Badge club={g.clubs[o.from]} size={30} /> : <span className="chip">Exterior</span>}<div><b>{o.fromName}</b><div className="big" style={{ fontSize: '1.4rem' }}>{money(o.fee)}</div></div></div>
            <div className="row"><button className="btn primary" disabled={!open} onClick={() => { acceptOffer(g, o); setNote(`Vendiste a ${p.name} a ${o.fromName} por ${money(o.fee)}.`); done() }}>Aceptar</button>
              <button className="btn" onClick={() => { const ok = haggle(g, o); setNote(ok ? `${o.fromName} mejoró su oferta por ${p.name}.` : `${o.fromName} se retiró de la negociación por ${p.name}.`); done() }}>Pedir más</button>
              <button className="btn danger" onClick={() => { rejectOffer(g, o); done() }}>Rechazar</button></div>
          </div>) })}
        {!g.offers.length && <div className="card dim">No hay ofertas pendientes. Durante el libro de pases los clubes del país y del exterior pueden ofertar por tus jugadores; si declarás transferible a alguno, llegan más.</div>}
      </div>}

      {tab === 'short' && rows(g.shortlist.map(id => g.players[id]).filter(Boolean))}

      {tab === 'moves' && <div className="card scroll-x"><table><thead><tr><th>Fecha</th><th>Jugador</th><th>Desde</th><th>Hacia</th><th className="r">Monto</th></tr></thead>
        <tbody>{g.transfers.slice(0, 80).map((t, i) => <tr key={i} className={g.players[t.pid] ? 'click' : ''} onClick={() => g.players[t.pid] && openPlayer(t.pid)}><td className="dim sm">{fmtDate(t.date)}</td><td><b style={{ fontWeight: 600 }}>{t.name}</b></td><td>{t.from}</td><td>{t.to}</td><td className="r num">{t.loan ? 'Préstamo' : t.fee ? money(t.fee) : 'Libre'}</td></tr>)}</tbody></table>
        {!g.transfers.length && <div className="dim sm" style={{ padding: 12 }}>Todavía no hubo movimientos en este mercado.</div>}</div>}

      {tab === 'fin' && <div className="grid2">
        <div className="card col"><h3>Ingresos de la temporada</h3>
          {[['Recaudación', L.gate], ['Televisión', L.tv], ['Premios', L.prizes], ['Ventas de jugadores', L.sales]].map(([l, v]) => <div key={l as string} className="row between"><span className="dim">{l}</span><b className="num good">{money(v as number)}</b></div>)}</div>
        <div className="card col"><h3>Egresos de la temporada</h3>
          {[['Sueldos', L.wages], ['Compras de jugadores', L.buys]].map(([l, v]) => <div key={l as string} className="row between"><span className="dim">{l}</span><b className="num bad">{money(v as number)}</b></div>)}
          <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>Resultado</span><b className="big" style={{ fontSize: '1.5rem' }}>{money(L.gate + L.tv + L.prizes + L.sales - L.wages - L.buys)}</b></div></div>
      </div>}
    </div>
  )
}
