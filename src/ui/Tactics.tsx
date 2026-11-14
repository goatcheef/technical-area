import { useState } from 'react'
import { autoPick, available, squadOf } from '../engine/game'
import { FORMATIONS, FORMATION_NAMES, POS_LABEL, bestRating, posRating } from '../engine/positions'
import type { Club, Player, Tactic } from '../engine/types'
import { useGame } from '../store'
import { Cond, PosPill, Seg, Status } from './common'

export const TACTIC_OPTS: [keyof Tactic, string, string[], string][] = [
  ['mentality', 'Mentalidad', ['Ultra def.', 'Def.', 'Equil.', 'Of.', 'Ultra of.'], 'Más ofensiva suma ataque y resta solidez defensiva.'],
  ['pressing', 'Presión', ['Baja', 'Media', 'Alta'], 'La presión alta gana el medio pero cansa más. Con línea baja parte al equipo.'],
  ['line', 'Línea defensiva', ['Baja', 'Media', 'Adelantada'], 'Adelantada domina el medio; sufre ante delanteros veloces y provoca offsides.'],
  ['tempo', 'Ritmo', ['Lento', 'Normal', 'Rápido'], 'El ritmo rápido genera más remates, con menos precisión y más desgaste.'],
  ['passing', 'Pases', ['Cortos', 'Mixtos', 'Directos'], 'Directo salta el mediocampo y favorece el contraataque y los mano a mano.'],
  ['width', 'Amplitud', ['Cerrado', 'Normal', 'Abierto'], 'Abierto rinde con laterales y extremos: más centros y cabezazos.'],
  ['tackling', 'Entradas', ['Limpias', 'Normales', 'Fuertes'], 'Las entradas fuertes suman tarjetas.'],
]

export function TacticControls({ tactic, onChange }: { tactic: Tactic; onChange: (p: Partial<Tactic>) => void }) {
  return (
    <div className="col" style={{ gap: 9 }}>
      {TACTIC_OPTS.map(([k, label, opts, help]) => (
        <div key={k} title={help}><div className="dim" style={{ fontSize: '.78rem', marginBottom: 3 }}>{label}</div>
          <Seg value={tactic[k] as number} options={opts} onChange={v => onChange({ [k]: v })} /></div>))}
    </div>
  )
}

export function Pitch({ club, formation, ids, players, sel, onSlot, sub }: {
  club: Club; formation: string; ids: (number | undefined)[]; players: Record<number, Player>; sel?: number | null
  onSlot?: (i: number) => void; sub?: (id: number, i: number) => string
}) {
  const slots = FORMATIONS[formation]
  return (
    <div className="pitch">
      {slots.map((s, i) => {
        const p = ids[i] ? players[ids[i]!] : undefined
        return (
          <div key={i} className={`slot ${sel === i ? 'sel' : ''}`} style={{ left: `${s.x}%`, top: `${100 - s.y * 0.94 - 3}%` }} onClick={() => onSlot?.(i)}>
            <div className="dot" style={{ background: s.pos === 'GK' ? '#2a2a2a' : club.colors[0], borderColor: club.colors[1], color: s.pos === 'GK' ? '#fff' : parseInt(club.colors[0].slice(1, 3), 16) > 150 ? '#111' : '#fff', opacity: p ? 1 : 0.35 }}>{p ? p.num : '–'}</div>
            <div className="nm">{p ? p.name.split(' ').slice(-1)[0] : POS_LABEL[s.pos]}</div>
            <div className="nm dim" style={{ fontSize: '.68rem', marginTop: 1 }}>{POS_LABEL[s.pos]}{p ? ` · ${sub ? sub(p.id, i) : Math.round(posRating(p, s.pos))}` : ''}</div>
          </div>)
      })}
    </div>
  )
}

export function Tactics() {
  const { g, refresh, openPlayer, save } = useGame()
  const [sel, setSel] = useState<number | null>(null)
  const club = g.clubs[g.userClubId], t = club.tactic
  const slots = FORMATIONS[t.formation]
  const squad = squadOf(g, club.id)
  const done = () => { save(); refresh() }
  const slotClick = (i: number) => {
    if (sel == null) setSel(i)
    else { if (sel !== i) { [t.lineup[sel], t.lineup[i]] = [t.lineup[i], t.lineup[sel]]; done() } setSel(null) }
  }
  const place = (p: Player) => {
    if (sel == null) { openPlayer(p.id); return }
    if (!available(p)) return
    const j = t.lineup.indexOf(p.id), old = t.lineup[sel]
    if (j >= 0) [t.lineup[sel], t.lineup[j]] = [t.lineup[j], t.lineup[sel]]
    else { t.lineup[sel] = p.id; const b = t.bench.indexOf(p.id); if (b >= 0) { if (old) t.bench[b] = old; else t.bench.splice(b, 1) } }
    setSel(null); done()
  }
  const toggleBench = (p: Player) => {
    const b = t.bench.indexOf(p.id)
    if (b >= 0) t.bench.splice(b, 1); else if (t.bench.length < 9 && available(p)) t.bench.push(p.id)
    done()
  }
  const selPos = sel != null ? slots[sel].pos : null
  const list = [...squad].sort((a, b) => {
    const ra = (id: number) => (t.lineup.includes(id) ? 0 : t.bench.includes(id) ? 1 : 2)
    if (selPos) return posRating(b, selPos) - posRating(a, selPos)
    return ra(a.id) - ra(b.id) || t.lineup.indexOf(a.id) - t.lineup.indexOf(b.id) || bestRating(b) - bestRating(a)
  })
  const xi = slots.map((sl, i) => (g.players[t.lineup[i]] ? posRating(g.players[t.lineup[i]], sl.pos) : 0))
  const problems = t.lineup.filter(id => !g.players[id] || !available(g.players[id])).length
  return (
    <div className="page">
      <div className="row wrap">
        <h2 className="grow">Tácticas</h2>
        <span className="dim">Valoración del once: <b className="acc num">{(xi.reduce((a, b) => a + b, 0) / 11).toFixed(1)}</b></span>
        <select value={t.formation} onChange={e => { t.formation = e.target.value; setSel(null); done() }}>{FORMATION_NAMES.map(f => <option key={f}>{f}</option>)}</select>
        <button className="btn" onClick={() => { Object.assign(t, autoPick(g, club.id, t.formation)); setSel(null); done() }}>Mejor once disponible</button>
      </div>
      {problems > 0 && <div className="card bad">Hay {problems} titular(es) lesionado(s) o suspendido(s). Si no los cambiás, el cuerpo técnico los reemplaza automáticamente antes del partido.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 300px 1fr', gap: 16, alignItems: 'start' }} className="tgrid">
        <div className="col">
          <Pitch club={club} formation={t.formation} ids={t.lineup} players={g.players} sel={sel} onSlot={slotClick} />
          <div className="dim" style={{ fontSize: '.82rem' }}>{sel == null ? 'Tocá un puesto y después un jugador de la lista para asignarlo. Dos puestos seguidos los intercambia.' : `Elegí quién juega de ${POS_LABEL[slots[sel].pos]} (lista ordenada por rendimiento en ese puesto).`}</div>
        </div>
        <div className="card"><h3 style={{ marginBottom: 10 }}>Instrucciones</h3><TacticControls tactic={t} onChange={p => { Object.assign(t, p); done() }} /></div>
        <div className="card scroll-x">
          <table>
            <thead><tr><th>Jugador</th><th>Pos</th><th className="r">{selPos ? POS_LABEL[selPos] : 'Val'}</th><th>Físico</th><th>Rol</th><th /></tr></thead>
            <tbody>{list.map(p => {
              const inXi = t.lineup.includes(p.id), inB = t.bench.includes(p.id)
              return (
                <tr key={p.id} className={`click ${inXi ? 'me' : ''}`} style={{ opacity: available(p) ? 1 : 0.5 }} onClick={() => place(p)}>
                  <td><b style={{ fontWeight: 600 }}>{p.name}</b> <Status p={p} /></td><td><PosPill p={p} /></td>
                  <td className="r num"><b>{Math.round(selPos ? posRating(p, selPos) : bestRating(p))}</b></td><td><Cond v={p.cond} /></td>
                  <td>{inXi ? <span className="acc">Titular</span> : inB ? 'Banco' : <span className="dim">–</span>}</td>
                  <td>{!inXi && <button className={`btn sm ${inB ? 'on' : ''}`} onClick={e => { e.stopPropagation(); toggleBench(p) }}>{inB ? 'Quitar' : 'Al banco'}</button>}</td>
                </tr>)
            })}</tbody>
          </table>
        </div>
      </div>
      <style>{`@media (max-width: 1100px) { .tgrid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
