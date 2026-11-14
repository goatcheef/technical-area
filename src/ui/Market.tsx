import { useMemo, useState } from 'react'
import { acceptOffer, askingPrice, haggle, rejectOffer, wageBill, windowOpen } from '../engine/career'
import { fmtDate } from '../engine/game'
import { POS_LABEL, ageOn } from '../engine/positions'
import { knownRating } from '../engine/squad'
import type { Player, Pos } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Badge, Face, Ovr, PosPill, money } from './common'
import { PlayerTable, scoutBulk } from './PlayerTable'
import { PageTip } from './Guide'

const POSS: Pos[] = ['GK', 'DR', 'DC', 'DL', 'DM', 'MC', 'MR', 'ML', 'AMC', 'AMR', 'AML', 'ST']

export function Market() {
  const { g, refresh, save, openPlayer } = useGame()
  const [tab, setTab] = useSticky('mk.tab', g.offers.length ? 'offers' : 'search')
  const [pos, setPos] = useSticky('mk.pos', '')
  const [maxAge, setMaxAge] = useSticky('mk.age', 40)
  const [maxVal, setMaxVal] = useSticky('mk.val', 0)
  const [minOvr, setMinOvr] = useSticky('mk.ovr', 60)
  const [div, setDiv] = useSticky('mk.div', 0)
  const [only, setOnly] = useSticky('mk.only', false)
  const [note, setNote] = useState('')
  const club = g.clubs[g.userClubId], open = windowOpen(g.date)
  const done = () => { save(); refresh() }
  // filtro y recorte por lo que sabe el DT (punto medio del rango), no por la valoración real: no revelan lo que el ojeo no sabe
  const results = useMemo(() => Object.values(g.players).filter(p => p.clubId !== club.id && g.clubs[p.clubId]?.division > 0 && (!pos || p.positions.includes(pos as Pos))
    && ageOn(p.birth, g.date) <= maxAge && (!div || g.clubs[p.clubId].division === div) && (!only || p.listed || p.contractEnd <= g.season))
    .map(p => [p, knownRating(g, p)] as const).filter(([p, v]) => v >= minOvr && (!maxVal || askingPrice(g, p) <= maxVal))
    .sort((a, b) => b[1] - a[1]).slice(0, 400).map(([p]) => p), [g, g.date, g.transfers.length, pos, maxAge, maxVal, minOvr, div, only, club.id])
  const rows = (id: string, list: Player[], empty: string) => <PlayerTable id={id} players={list} views={['ojeo', 'general', 'contrato', 'stats', 'fisico']} def="ojeo" defSort={[{ k: 'val', d: -1 }]} bulk={scoutBulk(g)} limit={100} empty={empty} />
  const L = club.ledger
  return (
    <div className="page">
      <PageTip id="market" />
      <div className="hero row wrap" style={{ gap: 22 }}>
        <div className="grow"><h3>Mercado de pases</h3><h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>{open ? 'Libro abierto' : 'Libro cerrado'}</h1><div className="dim sm">{open ? 'Podés comprar, vender y pedir préstamos.' : 'Reabre el 1 de enero y el 25 de junio. Mientras tanto podés seguir jugadores.'}</div></div>
        <div className="kpi"><h3>Presupuesto</h3><b>{money(club.budget)}</b></div><div className="kpi"><h3>Caja</h3><b className={club.balance < 0 ? 'bad' : ''}>{money(club.balance)}</b></div>
        <div className="kpi"><h3>Sueldos / tope</h3><b>{money(wageBill(g, club.id))} / {money(club.wageBudget)}</b></div>
      </div>
      <div className="seg" role="group" aria-label="Mercado" style={{ alignSelf: 'flex-start' }}>{[['search', 'Buscar jugadores'], ['offers', `Ofertas recibidas (${g.offers.length})`], ['short', `Seguimiento (${g.shortlist.length})`], ['moves', 'Movimientos'], ['fin', 'Finanzas']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'search' && (<>
        <div className="card row wrap" style={{ alignItems: 'flex-end', gap: 14 }}>
          <label className="f">Puesto<select id="mk-pos" value={pos} onChange={e => setPos(e.target.value)}><option value="">Todos</option>{POSS.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}</select></label>
          <label className="f">Categoría<select id="mk-div" value={div} onChange={e => setDiv(Number(e.target.value))}><option value={0}>Todas</option><option value={1}>Liga Profesional</option><option value={2}>Primera Nacional</option></select></label>
          <label className="f" style={{ minWidth: 150 }}>Valoración mínima: {minOvr}<input id="mk-ovr" type="range" min={40} max={90} value={minOvr} onChange={e => setMinOvr(Number(e.target.value))} /></label>
          <label className="f" style={{ minWidth: 150 }}>Edad máxima: {maxAge}<input id="mk-age" type="range" min={16} max={40} value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} /></label>
          <label className="f">Precio máximo<select id="mk-val" value={maxVal} onChange={e => setMaxVal(Number(e.target.value))}><option value={0}>Sin límite</option><option value={club.budget}>Mi presupuesto</option>{[250000, 500000, 1000000, 2500000, 5000000, 10000000].map(v => <option key={v} value={v}>{money(v)}</option>)}</select></label>
          <button className={`btn ${only ? 'on' : ''}`} aria-pressed={only} onClick={() => setOnly(!only)}>Solo transferibles o con contrato por vencer</button>
        </div>
        {rows('market', results, 'No hay jugadores que cumplan esos filtros.')}</>)}

      {tab === 'offers' && <div className="col">
        {note && <div className="card acc">{note}</div>}
        {!open && g.offers.some(o => g.players[o.pid]) && <div className="dim sm">El libro de pases está cerrado: no podés aceptar ni pedir más, solo rechazar.</div>}
        {g.offers.map(o => { const p = g.players[o.pid]; if (!p) return null; return (
          <div key={o.id} className="card row wrap" style={{ gap: 14 }}>
            <Face p={p} club={club} size={46} /><div className="grow" data-pid={p.id} style={{ cursor: 'pointer' }} onClick={() => openPlayer(p.id)}><b>{p.name}</b> <PosPill p={p} /> <Ovr v={p.ca} /><div className="dim sm">Valor {money(p.value)} · llegó el {fmtDate(o.date)}</div></div>
            <div className="row">{o.from ? <Badge club={g.clubs[o.from]} size={30} /> : <span className="chip">Exterior</span>}<div><b>{o.fromName}</b><div className="big" style={{ fontSize: '1.4rem' }}>{money(o.fee)}</div></div></div>
            <div className="row"><button className="btn primary" disabled={!open} onClick={() => { acceptOffer(g, o); setNote(`Vendiste a ${p.name} a ${o.fromName} por ${money(o.fee)}.`); done() }}>Aceptar</button>
              <button className="btn" disabled={!open} onClick={() => { const ok = haggle(g, o); setNote(ok ? `${o.fromName} mejoró su oferta por ${p.name}.` : `${o.fromName} se retiró de la negociación por ${p.name}.`); done() }}>Pedir más</button>
              <button className="btn danger" onClick={() => { rejectOffer(g, o); done() }}>Rechazar</button></div>
          </div>) })}
        {!g.offers.length && <div className="card dim">No hay ofertas pendientes. Durante el libro de pases los clubes del país y del exterior pueden ofertar por tus jugadores; si declarás transferible a alguno, llegan más.</div>}
      </div>}

      {tab === 'short' && rows('shortlist', g.shortlist.map(id => g.players[id]).filter(Boolean), 'No seguís a ningún jugador. Seleccioná jugadores en la búsqueda y tocá Seguir.')}

      {tab === 'moves' && <div className="card scroll-x"><table><thead><tr><th>Fecha</th><th>Jugador</th><th>Desde</th><th>Hacia</th><th className="r">Monto</th></tr></thead>
        <tbody>{g.transfers.slice(0, 80).map((t, i) => <tr key={i} data-pid={g.players[t.pid] ? t.pid : undefined} className={g.players[t.pid] ? 'click' : ''} onClick={() => g.players[t.pid] && openPlayer(t.pid)}><td className="dim sm">{fmtDate(t.date)}</td><td><b style={{ fontWeight: 600 }}>{t.name}</b></td><td>{t.from}</td><td>{t.to}</td><td className="r num">{t.loan ? 'Préstamo' : t.fee ? money(t.fee) : 'Libre'}</td></tr>)}</tbody></table>
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
