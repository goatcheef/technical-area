import { useState } from 'react'
import { squadOf } from '../engine/game'
import { ageOn, bestRating } from '../engine/positions'
import type { Player } from '../engine/types'
import { useGame } from '../store'
import { Badge, Cond, Face, PosPill, Status, Val, avgRat, money, ratClass } from './common'

type Col = { k: string; l: string; v: (p: Player) => number | string; r?: boolean }
const LINE_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 }

export function Squad() {
  const { g, openPlayer } = useGame()
  const [clubId, setClubId] = useState(g.userClubId)
  const [sort, setSort] = useState<{ k: string; d: number }>({ k: 'pos', d: 1 })
  const cols: Col[] = [
    { k: 'num', l: 'N°', v: p => p.num, r: true }, { k: 'name', l: 'Jugador', v: p => p.name }, { k: 'pos', l: 'Pos', v: p => LINE_ORDER[p.line] * 100 - bestRating(p) },
    { k: 'age', l: 'Edad', v: p => ageOn(p.birth, g.date), r: true }, { k: 'val', l: 'Val', v: p => Math.round(bestRating(p)), r: true },
    { k: 'cond', l: 'Físico', v: p => p.cond }, { k: 'mor', l: 'Moral', v: p => p.morale },
    { k: 'pj', l: 'PJ', v: p => p.stats.apps + p.stats.subs, r: true }, { k: 'gol', l: 'G', v: p => p.stats.goals, r: true }, { k: 'ast', l: 'A', v: p => p.stats.ast, r: true },
    { k: 'rat', l: 'Prom', v: p => (p.stats.apps + p.stats.subs ? p.stats.ratSum / (p.stats.apps + p.stats.subs) : 0), r: true },
    { k: 'value', l: 'Valor', v: p => p.value, r: true }, { k: 'wage', l: 'Sueldo/mes', v: p => p.wage, r: true }, { k: 'con', l: 'Contrato', v: p => p.contractEnd, r: true },
  ]
  const col = cols.find(c => c.k === sort.k)!
  const list = squadOf(g, clubId).sort((a, b) => { const x = col.v(a), y = col.v(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.d })
  const club = g.clubs[clubId]
  const avgAge = list.reduce((s, p) => s + ageOn(p.birth, g.date), 0) / Math.max(1, list.length)
  return (
    <div className="page">
      <div className="row wrap">
        <Badge club={club} size={40} />
        <div className="grow"><h2>{club.name}</h2><div className="dim">{list.length} jugadores · edad promedio {avgAge.toFixed(1)} · valor del plantel {money(list.reduce((s, p) => s + p.value, 0))} · masa salarial {money(list.reduce((s, p) => s + p.wage, 0))}/mes</div></div>
        <select value={clubId} onChange={e => setClubId(Number(e.target.value))}>
          {[1, 2, 3, 0].map(d => <optgroup key={d} label={['Exterior', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][d]}>{Object.values(g.clubs).filter(c => c.division === d).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
        </select>
      </div>
      <div className="card scroll-x">
        <table>
          <thead><tr>{cols.map(c => <th key={c.k} className={`sortable ${c.r ? 'r' : ''}`} onClick={() => setSort({ k: c.k, d: sort.k === c.k ? -sort.d : ['name', 'pos', 'num', 'age'].includes(c.k) ? 1 : -1 })}>{c.l}{sort.k === c.k ? (sort.d > 0 ? ' ▴' : ' ▾') : ''}</th>)}<th /></tr></thead>
          <tbody>{list.map(p => (
            <tr key={p.id} className="click" onClick={() => openPlayer(p.id)}>
              <td className="r num dim">{p.num}</td><td><span className="row"><Face p={p} club={club} size={28} /><b style={{ fontWeight: 600 }}>{p.name}</b></span> {p.nat !== 'Argentina' && <span className="dim" style={{ fontSize: '.8rem' }}>{p.nat}</span>}</td><td><PosPill p={p} /></td>
              <td className="r num">{ageOn(p.birth, g.date)}</td><td className="r"><Val p={p} /></td><td><Cond v={p.cond} /></td><td><Cond v={p.morale} /></td>
              <td className="r num">{p.stats.apps}{p.stats.subs ? <span className="dim"> ({p.stats.subs})</span> : ''}</td><td className="r num">{p.stats.goals}</td><td className="r num">{p.stats.ast}</td>
              <td className={`r num ${ratClass(p.stats.apps + p.stats.subs ? p.stats.ratSum / (p.stats.apps + p.stats.subs) : 6.5)}`}>{avgRat(p.stats)}</td>
              <td className="r num">{money(p.value)}</td><td className="r num dim">{money(p.wage)}</td><td className={`r num ${p.contractEnd <= g.season ? 'warn' : 'dim'}`}>{p.contractEnd}</td><td><Status p={p} /></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
