import { useState } from 'react'
import { autoPick, available, squadOf } from '../engine/game'
import { FORMATIONS, FORMATION_NAMES, POS_LABEL, ROLE, bestRating, bestRole, fixRoles, posRating, roleFit, rolesFor } from '../engine/positions'
import type { Club, Player, Tactic } from '../engine/types'
import { useGame } from '../store'
import { Cond, PosPill, Seg, Status } from './common'

type Opt = [keyof Tactic, string, string[], string]
export const TACTIC_GROUPS: { name: string; opts: Opt[] }[] = [
  { name: 'Con la pelota', opts: [
    ['mentality', 'Mentalidad', ['Ultra def.', 'Def.', 'Equil.', 'Of.', 'Ultra of.'], 'Cuánta gente sumás al ataque. Más ofensiva genera más y te deja más expuesto a la contra.'],
    ['passing', 'Salida', ['Corta', 'Mixta', 'Larga'], 'Corta: salís jugando y arriesgás ante la presión. Larga: pelotazo al 9, que tiene que ganar de arriba.'],
    ['tempo', 'Ritmo', ['Lento', 'Normal', 'Rápido'], 'Lento cuida la pelota. Rápido sorprende a la defensa pero pierde más pelotas y cansa.'],
    ['width', 'Amplitud', ['Cerrado', 'Normal', 'Abierto'], 'Abierto ataca por las bandas; cerrado, por adentro.'],
    ['focus', 'Atacar por', ['Izquierda', 'Centro', 'Derecha', 'Libre'], 'Cargá el juego sobre el sector donde tu jugador le gana al marcador rival.'],
    ['finalThird', 'En el último tercio', ['Elaborar', 'Mixto', 'Centros', 'De lejos'], 'Centros rinde con un pivote y buenos cabeceadores. De lejos sirve contra equipos metidos atrás.'],
  ] },
  { name: 'Sin la pelota', opts: [
    ['line', 'Línea defensiva', ['Baja', 'Media', 'Adelantada'], 'Adelantada achica y provoca offsides, pero sufre los pases filtrados a delanteros rápidos. Baja regala el medio y tapa el área.'],
    ['pressing', 'Presión', ['Baja', 'Media', 'Alta'], 'Alta roba en la salida rival; si te la superan quedan espacios, y desgasta.'],
    ['tackling', 'Entradas', ['Limpias', 'Normales', 'Fuertes'], 'Fuertes cortan más juego y suman faltas y tarjetas.'],
  ] },
  { name: 'Transiciones', opts: [
    ['onLoss', 'Al perderla', ['Replegar', 'Presionar ya'], 'Presionar enseguida recupera arriba con el rival desarmado; si falla, la contra es más peligrosa.'],
    ['onWin', 'Al recuperarla', ['Asegurar', 'Contraatacar'], 'Contraatacar castiga a los equipos adelantados y ofensivos.'],
  ] },
]

export function TacticControls({ tactic, onChange }: { tactic: Tactic; onChange: (p: Partial<Tactic>) => void }) {
  return (
    <div className="col" style={{ gap: 14 }}>
      {TACTIC_GROUPS.map(gr => (
        <div key={gr.name} className="col" style={{ gap: 8 }}><h3>{gr.name}</h3>
          {gr.opts.map(([k, label, opts, help]) => (
            <div key={k} title={help}><div className="dim" style={{ fontSize: '.76rem', marginBottom: 3 }}>{label}</div>
              <Seg value={tactic[k] as number} options={opts} onChange={v => onChange({ [k]: v })} /></div>))}
        </div>))}
    </div>
  )
}

export function Pitch({ club, formation, ids, players, sel, onSlot, roles }: {
  club: Club; formation: string; ids: (number | undefined)[]; players: Record<number, Player>; sel?: number | null
  onSlot?: (i: number) => void; roles?: string[]
}) {
  const slots = FORMATIONS[formation]
  return (
    <div className="pitch">
      {slots.map((s, i) => {
        const p = ids[i] ? players[ids[i]!] : undefined
        return (
          <div key={i} className={`slot ${sel === i ? 'sel' : ''}`} style={{ left: `${s.x}%`, top: `${100 - s.y * 0.94 - 3}%` }} onClick={() => onSlot?.(i)}>
            <div className="dot" style={{ background: s.pos === 'GK' ? '#2a2a2a' : club.colors[0], borderColor: club.colors[1], color: s.pos === 'GK' ? '#fff' : parseInt(club.colors[0].slice(1, 3), 16) > 150 ? '#111' : '#fff', opacity: p ? 1 : 0.35 }}>{p ? p.num : '–'}</div>
            <div className="nm">{p ? p.name.split(' ').slice(-1)[0] : POS_LABEL[s.pos]}{p ? ` · ${Math.round(posRating(p, s.pos))}` : ''}</div>
            <div className="nm dim" style={{ fontSize: '.66rem', marginTop: 1 }}>{roles?.[i] ? ROLE[roles[i]]?.name : POS_LABEL[s.pos]}</div>
          </div>)
      })}
    </div>
  )
}

export function Tactics() {
  const { g, refresh, openPlayer, save } = useGame()
  const [sel, setSel] = useState<number | null>(null)
  const club = g.clubs[g.userClubId], t = club.tactic
  t.roles = fixRoles(t.formation, t.roles)
  t.takers ??= { pen: 0, fk: 0, corner: 0 }
  const slots = FORMATIONS[t.formation]
  const squad = squadOf(g, club.id)
  const done = () => { save(); refresh() }
  const slotClick = (i: number) => {
    if (sel == null) setSel(i)
    else if (sel !== i) { [t.lineup[sel], t.lineup[i]] = [t.lineup[i], t.lineup[sel]]; done(); setSel(i) } else setSel(null)
  }
  const place = (p: Player) => {
    if (sel == null) { openPlayer(p.id); return }
    if (!available(p)) return
    const j = t.lineup.indexOf(p.id), old = t.lineup[sel]
    if (j >= 0) [t.lineup[sel], t.lineup[j]] = [t.lineup[j], t.lineup[sel]]
    else { t.lineup[sel] = p.id; const b = t.bench.indexOf(p.id); if (b >= 0) { if (old) t.bench[b] = old; else t.bench.splice(b, 1) } }
    done()
  }
  const toggleBench = (p: Player) => {
    const b = t.bench.indexOf(p.id)
    if (b >= 0) t.bench.splice(b, 1); else if (t.bench.length < 9 && available(p)) t.bench.push(p.id)
    done()
  }
  const selPos = sel != null ? slots[sel].pos : null, selP = sel != null ? g.players[t.lineup[sel]] : undefined
  const list = [...squad].sort((a, b) => {
    const ra = (id: number) => (t.lineup.includes(id) ? 0 : t.bench.includes(id) ? 1 : 2)
    if (selPos) return posRating(b, selPos) - posRating(a, selPos)
    return ra(a.id) - ra(b.id) || t.lineup.indexOf(a.id) - t.lineup.indexOf(b.id) || bestRating(b) - bestRating(a)
  })
  const xi = slots.map((sl, i) => (g.players[t.lineup[i]] ? posRating(g.players[t.lineup[i]], sl.pos) : 0))
  const problems = t.lineup.filter(id => !g.players[id] || !available(g.players[id])).length
  const fam = club.famKey === t.formation ? club.fam : Math.max(30, club.fam - 30)
  const xiPlayers = t.lineup.map(id => g.players[id]).filter(Boolean)
  const taker = (k: 'pen' | 'fk' | 'corner', label: string) => (
    <label className="f">{label}<select value={t.takers[k]} onChange={e => { t.takers[k] = Number(e.target.value); done() }}>
      <option value={0}>Automático</option>{xiPlayers.filter(p => p.line !== 'GK').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)
  return (
    <div className="page">
      <div className="row wrap">
        <h2 className="grow">Tácticas</h2>
        <span className="dim">Once: <b className="acc num">{(xi.reduce((a, b) => a + b, 0) / 11).toFixed(1)}</b></span>
        <span className="row dim" title="Sube jugando con el mismo dibujo y cae al cambiarlo. Con poca familiaridad el equipo rinde hasta un 6 % menos.">Familiaridad <span className="bar" style={{ width: 70 }}><i style={{ width: `${fam}%`, background: fam >= 75 ? 'var(--good)' : fam >= 50 ? 'var(--warn)' : 'var(--bad)' }} /></span><b className="num">{Math.round(fam)}%</b></span>
        <select value={t.formation} onChange={e => { t.formation = e.target.value; t.roles = fixRoles(t.formation, undefined); setSel(null); done() }}>{FORMATION_NAMES.map(f => <option key={f}>{f}</option>)}</select>
        <button className="btn" onClick={() => { Object.assign(t, autoPick(g, club.id, t.formation)); t.roles = slots.map((sl, i) => (g.players[t.lineup[i]] ? bestRole(g.players[t.lineup[i]], sl.pos) : t.roles[i])); setSel(null); done() }}>Mejor once y roles</button>
      </div>
      {problems > 0 && <div className="card bad">Hay {problems} titular(es) lesionado(s) o suspendido(s). Si no los cambiás, el cuerpo técnico los reemplaza antes del partido.</div>}
      {club.famKey !== t.formation && <div className="card warn">Cambiaste el dibujo: el equipo va a tardar unos partidos en adaptarse al {t.formation}.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 310px 1fr', gap: 16, alignItems: 'start' }} className="tgrid">
        <div className="col">
          <Pitch club={club} formation={t.formation} ids={t.lineup} players={g.players} sel={sel} onSlot={slotClick} roles={t.roles} />
          {sel != null && selPos ? (
            <div className="card col"><div className="row between"><h3>Rol del {POS_LABEL[selPos]}{selP ? ` · ${selP.name}` : ''}</h3><button className="btn sm" onClick={() => setSel(null)}>Listo</button></div>
              {rolesFor(selPos).map(r => { const fit = selP ? roleFit(selP, r) : 1; return (
                <button key={r.id} className={`opt ${t.roles[sel] === r.id ? 'on' : ''}`} onClick={() => { t.roles[sel] = r.id; done() }}>
                  <span className="row between"><b>{r.name}</b>{selP && <span className={`chip ${fit >= 1.03 ? 'acc' : fit < 0.98 ? 'warn' : ''}`}>{fit >= 1.03 ? 'Le queda muy bien' : fit < 0.98 ? 'No es lo suyo' : 'Le queda bien'}</span>}</span>
                  <span className="dim sm" style={{ lineHeight: 1.4 }}>{r.desc}</span></button>) })}
              <div className="dim sm">Para cambiar al jugador, tocá uno de la lista. Para intercambiar dos puestos, tocá otro puesto.</div></div>
          ) : <div className="dim sm">Tocá un puesto para elegir su rol y quién lo ocupa.</div>}
          <div className="card col"><h3>Pelota parada</h3><div className="grid3" style={{ gap: 10 }}>{taker('pen', 'Penales')}{taker('fk', 'Tiros libres')}{taker('corner', 'Córners')}</div>
            <div title="Primer palo: más cabezazos ganados pero menos peligrosos; rinde con jugadores rápidos y que anticipan. Segundo palo: menos ganados pero más claros; rinde con los altos y fuertes. Jugada corta: evita el duelo aéreo y busca un desborde."><div className="dim" style={{ fontSize: '.76rem', marginBottom: 3 }}>Córners a favor</div>
              <Seg value={t.cornerPlan ?? 0} options={['Mixto', 'Primer palo', 'Segundo palo', 'Jugada corta']} onChange={v => { t.cornerPlan = v; done() }} /></div>
            <label className="f">Buscar en los córners a<select value={t.cornerTarget ?? 0} onChange={e => { t.cornerTarget = Number(e.target.value); done() }}>
              <option value={0}>El mejor ubicado</option>{xiPlayers.filter(p => p.line !== 'GK').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
        </div>
        <div className="card"><TacticControls tactic={t} onChange={p => { Object.assign(t, p); done() }} /></div>
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
