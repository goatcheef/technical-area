import { squadOf } from '../engine/game'
import type { Player } from '../engine/types'
import { DIV_NAMES } from '../engine/career'
import { ageOn } from '../engine/positions'
import { useGame, useSticky } from '../store'
import { PlayerTable, ownBulk, scoutBulk } from './PlayerTable'
import { Badge, dec, money } from './common'
import { PageTip } from './Guide'


export function Squad() {
  const { g, route, nav } = useGame()
  const [stClub, setClubId] = useSticky(`sq.club.${g.userClubId}`, g.userClubId)
  // "Ver tus transferibles y quienes quieren irse" (Mercado › Tratos): tu plantel con ese filtro
  const tf = route.tab === 'transferibles'
  const clubId = tf ? g.userClubId : stClub
  const club = g.clubs[clubId], list = squadOf(g, clubId)
  const avgAge = list.reduce((s, p) => s + ageOn(p.birth, g.date), 0) / Math.max(1, list.length)
  return (
    <div className="page">
      <PageTip id="squad" />
      <div className="row wrap">
        <Badge club={club} size={40} />
        <div className="grow"><h2>{club.name}</h2><div className="dim">{list.length} jugadores · edad promedio {dec(avgAge, 1)} · valor del plantel {money(list.reduce((s, p) => s + p.value, 0))} · masa salarial {money(list.reduce((s, p) => s + p.wage, 0))}/mes</div></div>
        <select value={clubId} aria-label="Plantel de" onChange={e => { setClubId(Number(e.target.value)); if (tf) nav({ page: 'squad' }) }}>
          {[1, 2, 3, 0].map(d => <optgroup key={d} label={DIV_NAMES[d]}>{Object.values(g.clubs).filter(c => c.division === d).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
        </select>
      </div>
      {tf && <div className="card row wrap" style={{ gap: 10 }}><b>Solo transferibles y quienes quieren irse</b><span className="dim">{list.filter(p => p.listed || p.wantsOut).length} jugadores</span><span className="grow" /><button className="btn sm" onClick={() => nav({ page: 'squad' })}>Ver todo el plantel</button></div>}
      <SquadTable clubId={clubId} only={tf ? p => !!(p.listed || p.wantsOut) : undefined} />
    </div>
  )
}

/** Tabla de plantel de cualquier club (se usa en Plantel y en la ficha de club). */
export function SquadTable({ clubId, only }: { clubId: number; only?: (p: Player) => boolean }) {
  const { g } = useGame()
  const mine = clubId === g.userClubId
  return <PlayerTable id={mine ? 'squad' : 'clubsq'} players={only ? squadOf(g, clubId).filter(only) : squadOf(g, clubId)} views={mine ? ['general', 'fisico', 'contrato', 'stats'] : ['general', 'ojeo', 'stats', 'fisico']}
    def="general" bulk={mine ? ownBulk(g) : scoutBulk(g)} filters />
}
