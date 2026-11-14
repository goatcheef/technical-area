import { useState } from 'react'
import { autoPick, available, squadOf } from '../engine/game'
import { FORMATIONS, FORMATION_NAMES, POS_LABEL, ROLE, bestRating, bestRole, fixRoles, posRating, roleFit, rolesFor } from '../engine/positions'
import type { Club, Player, Tactic } from '../engine/types'
import { useGame } from '../store'
import { PosPill, Seg, Status } from './common'
import { PageTip } from './Guide'

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

export function TacticControls({ tactic, onChange, tabs }: { tactic: Tactic; onChange: (p: Partial<Tactic>) => void; tabs?: boolean }) {
  const [gi, setGi] = useState(0)
  const groups = tabs ? [TACTIC_GROUPS[gi]] : TACTIC_GROUPS
  return (
    <div className="col" style={{ gap: 12 }}>
      {tabs && <div className="seg">{TACTIC_GROUPS.map((gr, i) => <button key={gr.name} className={gi === i ? 'on' : ''} onClick={() => setGi(i)}>{gr.name}</button>)}</div>}
      {groups.map(gr => (
        <div key={gr.name} className="col" style={{ gap: 10 }}>{!tabs && <h3>{gr.name}</h3>}
          {gr.opts.map(([k, label, opts, help]) => (
            <div key={k} className="topt" title={help}><div className="topt-l"><span>{label}</span><b>{opts[tactic[k] as number]}</b></div>
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
        const rt = p ? Math.round(posRating(p, s.pos)) : 0, off = p ? rt < Math.round(bestRating(p)) - 4 : false
        return (
          <button key={i} className={`slot ${sel === i ? 'sel' : ''} ${p ? '' : 'empty'}`} style={{ left: `clamp(48px, ${s.x}%, calc(100% - 48px))`, top: `${100 - s.y * 0.94 - 3}%` }} onClick={() => onSlot?.(i)}
            aria-label={`${POS_LABEL[s.pos]}: ${p ? `${p.name}, ${rt}` : 'vacío'}`} data-pid={p?.id}>
            <span className="pc-num" style={{ background: s.pos === 'GK' ? '#2a2f45' : club.colors[0], color: s.pos === 'GK' ? '#fff' : parseInt(club.colors[0].slice(1, 3), 16) > 150 ? '#111' : '#fff', borderColor: club.colors[1], ['--cond' as string]: `${p ? p.cond : 100}%` }}>{p ? p.num : POS_LABEL[s.pos]}</span>
            <span className="pcard"><span className="pc-name">{p ? p.name.split(' ').slice(-1)[0] : 'Vacío'}</span>{p && <span className={`pc-rt ${off ? 'off' : ''}`} title={off ? 'Fuera de su mejor puesto' : ''}>{rt}</span>}</span>
            <span className="pc-role">{roles?.[i] ? ROLE[roles[i]]?.name : POS_LABEL[s.pos]}</span>
            {p && <span className="pc-cond" title={`Físico ${Math.round(p.cond)}`} aria-hidden><i style={{ width: `${p.cond}%`, background: p.cond >= 85 ? 'var(--good)' : p.cond >= 70 ? 'var(--warn)' : 'var(--bad)' }} /></span>}
          </button>)
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
  const lineAvg = (ln: string) => { const xs = slots.map((sl, i) => [sl, xi[i]] as const).filter(([sl]) => (ln === 'GK' ? sl.pos === 'GK' : ln === 'DF' ? ['DR', 'DC', 'DL'].includes(sl.pos) : ln === 'MF' ? ['DM', 'MC', 'MR', 'ML', 'AMC'].includes(sl.pos) : ['AMR', 'AML', 'ST'].includes(sl.pos))).map(x => x[1]); return xs.length ? xs.reduce((a2, b2) => a2 + b2, 0) / xs.length : 0 }
  const warns = [
    ...slots.map((sl, i) => { const pl = g.players[t.lineup[i]]; return pl && xi[i] < Math.round(bestRating(pl)) - 4 ? `${pl.name} juega fuera de su mejor puesto (${POS_LABEL[sl.pos]} ${Math.round(xi[i])}, rinde ${Math.round(bestRating(pl))} en su puesto).` : null }),
    ...xiPlayers.filter(pl => pl.cond < 80).map(pl => `${pl.name} llega cansado (${Math.round(pl.cond)} de físico).`),
    ...(t.bench.length < 7 ? [`El banco tiene ${t.bench.length} suplentes: conviene llevar 7 o más.`] : []),
    ...(!t.bench.some(id => g.players[id]?.line === 'GK') ? ['No hay arquero suplente en el banco.'] : []),
  ].filter(Boolean) as string[]
  const bench = t.bench.map(id => g.players[id]).filter(Boolean)
  const others = list.filter(pl => !t.lineup.includes(pl.id) && !t.bench.includes(pl.id))
  return (
    <div className="page">
      <PageTip id="tactics" />
      <div className="row wrap" style={{ gap: 12 }}>
        <h2 className="grow">Tácticas</h2>
        {problems > 0 && <span className="chip bad">{problems} titular(es) no disponible(s): el cuerpo técnico los reemplaza si no los cambiás</span>}
        {club.famKey !== t.formation && <span className="chip warn">Dibujo nuevo: el equipo tarda unos partidos en adaptarse</span>}
        <button className="btn primary" onClick={() => { Object.assign(t, autoPick(g, club.id, t.formation)); t.roles = slots.map((sl, i) => (g.players[t.lineup[i]] ? bestRole(g.players[t.lineup[i]], sl.pos) : t.roles[i])); setSel(null); done() }}>Mejor once y roles</button>
      </div>
      <div className="tgrid">
        <div className="col" style={{ gap: 16 }}>
          <div className="card col">
            <h3>Plan de juego</h3>
            <label className="f">Dibujo<select value={t.formation} onChange={e => { t.formation = e.target.value; t.roles = fixRoles(t.formation, undefined); setSel(null); done() }}>{FORMATION_NAMES.map(f => <option key={f}>{f}</option>)}</select></label>
            <div className="tkpis">
              <div><span className="dim sm">Valoración del once</span><b className="num">{(xi.reduce((a2, b2) => a2 + b2, 0) / 11).toFixed(1)}</b></div>
              <div title="Sube jugando con el mismo dibujo y cae al cambiarlo. Con poca familiaridad el equipo rinde hasta un 6 % menos."><span className="dim sm">Familiaridad</span><b className="num">{Math.round(fam)} %</b><span className="bar" style={{ width: '100%' }}><i style={{ width: `${fam}%`, background: fam >= 75 ? 'var(--good)' : fam >= 50 ? 'var(--warn)' : 'var(--bad)' }} /></span></div>
            </div>
          </div>
          <div className="card col"><h3>Instrucciones</h3><TacticControls tactic={t} onChange={pp => { Object.assign(t, pp); done() }} tabs /></div>
        </div>
        <div className="col" style={{ gap: 12 }}>
          <Pitch club={club} formation={t.formation} ids={t.lineup} players={g.players} sel={sel} onSlot={slotClick} roles={t.roles} />
          <div className="card col" style={{ gap: 8 }}>
            <div className="row between"><h3>Banco ({bench.length}/9)</h3><span className="dim sm">{sel != null ? 'Tocá un suplente para meterlo en el puesto elegido' : 'Elegí un puesto en la cancha para cambiar'}</span></div>
            <div className="benchrow">{bench.map(pl => <button key={pl.id} className="benchcard" data-pid={pl.id} onClick={() => place(pl)}><span className="pc-num sm">{pl.num}</span><span className="ell">{pl.name.split(' ').slice(-1)[0]}</span><PosPill p={pl} /><b className="num">{Math.round(selPos ? posRating(pl, selPos) : bestRating(pl))}</b></button>)}
              {!bench.length && <span className="dim sm">Sin suplentes: sumalos desde la lista.</span>}</div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          {sel != null && selPos ? (
            <div className="card col"><div className="row between"><h3>Rol del {POS_LABEL[selPos]}{selP ? ` · ${selP.name.split(' ').slice(-1)[0]}` : ''}</h3><button className="btn sm" onClick={() => setSel(null)}>Listo</button></div>
              {rolesFor(selPos).map(r => { const fit = selP ? roleFit(selP, r) : 1; return (
                <button key={r.id} className={`opt ${t.roles[sel] === r.id ? 'on' : ''}`} onClick={() => { t.roles[sel] = r.id; done() }}>
                  <span className="row between"><b>{r.name}</b>{selP && <span className={`chip ${fit >= 1.03 ? 'acc' : fit < 0.98 ? 'warn' : ''}`}>{fit >= 1.03 ? 'Le queda muy bien' : fit < 0.98 ? 'No es lo suyo' : 'Le queda bien'}</span>}</span>
                  <span className="dim sm" style={{ lineHeight: 1.4 }}>{r.desc}</span></button>) })}
              <div className="dim sm">Para cambiar al jugador, tocá uno de la lista o del banco. Para intercambiar dos puestos, tocá otro puesto.</div></div>
          ) : <div className="card dim sm">Tocá un puesto de la cancha para elegir su rol y quién lo ocupa.</div>}
          <div className="card col tlist">
            <div className="row between"><h3>{selPos ? `Candidatos para ${POS_LABEL[selPos]}` : 'Plantel'}</h3><span className="dim sm">{others.length} afuera</span></div>
            <table><thead><tr><th>Jugador</th><th>Pos</th><th className="r">{selPos ? POS_LABEL[selPos] : 'Val'}</th><th className="r">Fís.</th><th /></tr></thead>
              <tbody>{list.map(pl => {
                const inXi = t.lineup.includes(pl.id), inB = t.bench.includes(pl.id)
                return (
                  <tr key={pl.id} data-pid={pl.id} className={`click ${inXi ? 'me' : ''}`} style={{ opacity: available(pl) ? 1 : 0.5 }} onClick={() => place(pl)}>
                    <td><span className="row" style={{ gap: 6 }}><b className="ell" style={{ fontWeight: 600, maxWidth: 150 }}>{pl.name}</b><Status p={pl} /></span><span className="dim" style={{ fontSize: '.72rem' }}>{inXi ? 'Titular' : inB ? 'Suplente' : ''}</span></td><td><PosPill p={pl} /></td>
                    <td className="r num"><b>{Math.round(selPos ? posRating(pl, selPos) : bestRating(pl))}</b></td><td className="r num dim" title="Físico">{Math.round(pl.cond)}</td>
                    <td>{!inXi && <button className={`btn sm icon ${inB ? 'on' : ''}`} title={inB ? 'Quitar del banco' : 'Al banco'} aria-label={inB ? `Quitar a ${pl.name} del banco` : `Llevar a ${pl.name} al banco`} onClick={e => { e.stopPropagation(); toggleBench(pl) }}>{inB ? '✓' : '+'}</button>}</td>
                  </tr>)
              })}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="dash">
        <div className="card s5 col"><h3>Análisis del once</h3>
          {([['Arquero', 'GK'], ['Defensa', 'DF'], ['Mediocampo', 'MF'], ['Ataque', 'FW']] as const).map(([l, k]) => { const v = lineAvg(k); return <div key={k} className="row" style={{ gap: 10 }}><span style={{ width: 96 }} className="dim">{l}</span><span className="bar grow" style={{ height: 8 }}><i style={{ width: `${Math.max(0, Math.min(100, (v - 40) * 2))}%`, background: 'var(--s1)' }} /></span><b className="num" style={{ width: 34, textAlign: 'right' }}>{v ? v.toFixed(0) : '–'}</b></div> })}
          {warns.length ? <div className="col" style={{ gap: 4 }}>{warns.slice(0, 5).map(w => <div key={w} className="sm warn">⚠ {w}</div>)}</div> : <div className="sm good">Todo en orden: el once está en sus puestos y descansado.</div>}
        </div>
        <div className="card s7 col"><h3>Pelota parada</h3><div className="grid3" style={{ gap: 10 }}>{taker('pen', 'Penales')}{taker('fk', 'Tiros libres')}{taker('corner', 'Córners')}</div>
          <div className="row wrap" style={{ gap: 14, alignItems: 'flex-end' }}>
            <div title="Primer palo: más cabezazos ganados pero menos peligrosos; rinde con jugadores rápidos y que anticipan. Segundo palo: menos ganados pero más claros; rinde con los altos y fuertes. Jugada corta: evita el duelo aéreo y busca un desborde."><div className="dim" style={{ fontSize: '.76rem', marginBottom: 3 }}>Rutina de córner</div>
              <Seg value={t.cornerPlan ?? 0} options={['Mixto', 'Primer palo', 'Segundo palo', 'Jugada corta']} onChange={v => { t.cornerPlan = v; done() }} /></div>
            <label className="f">Buscar en los córners a<select value={t.cornerTarget ?? 0} onChange={e => { t.cornerTarget = Number(e.target.value); done() }}>
              <option value={0}>El mejor ubicado</option>{xiPlayers.filter(pl => pl.line !== 'GK').map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}</select></label></div></div>
      </div>
    </div>
  )
}
