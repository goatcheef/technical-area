import { squadOf } from '../engine/game'
import { ageOn } from '../engine/positions'
import { useGame, useSticky } from '../store'
import { PlayerTable, ownBulk, scoutBulk } from './PlayerTable'
import { Badge, money } from './common'


export function Squad() {
  const { g } = useGame()
  const [clubId, setClubId] = useSticky(`sq.club.${g.userClubId}`, g.userClubId)
  const club = g.clubs[clubId], list = squadOf(g, clubId)
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
      <SquadTable clubId={clubId} />
    </div>
  )
}

/** Tabla de plantel de cualquier club (se usa en Plantel y en la ficha de club). */
export function SquadTable({ clubId }: { clubId: number }) {
  const { g } = useGame()
  const mine = clubId === g.userClubId
  return <PlayerTable id={mine ? 'squad' : 'clubsq'} players={squadOf(g, clubId)} views={mine ? ['general', 'fisico', 'contrato', 'stats'] : ['general', 'ojeo', 'stats', 'fisico']}
    def="general" bulk={mine ? ownBulk(g) : scoutBulk(g)} filters />
}
