import { useEffect, useReducer, useRef, useState } from 'react'
import { createMatch, finishUserMatch } from '../engine/game'
import type { MatchSim } from '../engine/match'
import { FORMATION_NAMES, POS_LABEL, posRating } from '../engine/positions'
import type { Fixture } from '../engine/types'
import { useGame } from '../store'
import { Badge, Cond, Momentum, PosPill, ShotMap, duoColors, ratClass } from './common'
import { TacticControls } from './Tactics'

export function MatchView({ fixture, onDone }: { fixture: Fixture; onDone: () => void }) {
  const { g } = useGame()
  const ref = useRef<MatchSim | null>(null)
  if (!ref.current) ref.current = createMatch(g, fixture, true)
  const sim = ref.current
  const [speed, setSpeed] = useState(0)
  const [out, setOut] = useState<number | null>(null)
  const [tab, setTab] = useState<'team' | 'tactic' | 'rival'>('team')
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const us: 0 | 1 = fixture.home === g.userClubId ? 0 : 1
  const home = g.clubs[fixture.home], away = g.clubs[fixture.away]

  useEffect(() => {
    if (!speed || sim.finished) return
    const t = setInterval(() => {
      const evs = sim.step()
      if (evs.some(e => e.text.startsWith('Entretiempo') || (e.type === 'rc' || e.type === 'yc2' || e.type === 'inj') && e.side === us) || sim.finished) setSpeed(0)
      bump()
    }, 700 / speed)
    return () => clearInterval(t)
  }, [speed, sim, us])

  const mine = sim.view(us), theirs = sim.view(us === 0 ? 1 : 0)
  const s = sim.stats
  const stats: [string, string | number, string | number, number][] = [
    ['Posesión', `${s.poss[0]}%`, `${s.poss[1]}%`, s.poss[0] / 100],
    ['Remates', s.shots[0], s.shots[1], share(s.shots)], ['Al arco', s.sot[0], s.sot[1], share(s.sot)],
    ['xG', s.xg[0].toFixed(2), s.xg[1].toFixed(2), share(s.xg)], ['Pases', s.passes[0], s.passes[1], share(s.passes)],
    ['Precisión', pct(s.passOk[0], s.passes[0]), pct(s.passOk[1], s.passes[1]), 0.5], ['Córners', s.corners[0], s.corners[1], share(s.corners)],
    ['Faltas', s.fouls[0], s.fouls[1], share(s.fouls)], ['Offsides', s.offs[0], s.offs[1], share(s.offs)],
    ['Amarillas', s.yc[0], s.yc[1], share(s.yc)], ['Rojas', s.rc[0], s.rc[1], share(s.rc)],
  ]
  const feed = sim.events.slice().reverse()
  const finish = () => { finishUserMatch(g, fixture, sim.result()); onDone() }
  const doSub = (inId: number) => { if (out != null && sim.substitute(us, out, inId)) { setOut(null); bump() } }
  const started = sim.tick > 0
  const cols = duoColors(home, away)

  return (
    <div className="main" style={{ height: '100%' }}>
      <div className="page">
        <div className="hero">
          <div className="dim center" style={{ fontSize: '.84rem' }}>{g.comps[fixture.comp].name} · {fixture.stage} · {fixture.neutral ? 'Cancha neutral' : home.stadium}</div>
          <div className="row" style={{ justifyContent: 'center', gap: 24, margin: '6px 0' }}>
            <div className="row grow" style={{ justifyContent: 'flex-end' }}><b style={{ fontSize: '1.15rem' }}>{home.name}</b><Badge club={home} size={72} /></div>
            <div className="center"><div className="score">{sim.sides[0].goals} – {sim.sides[1].goals}</div>
              <div className="acc num" style={{ fontWeight: 650 }}>{sim.finished ? (sim.pens ? `Penales ${sim.pens[0]}-${sim.pens[1]}` : 'Final') : started ? `${sim.minute}'` : 'Previa'}</div></div>
            <div className="row grow"><Badge club={away} size={72} /><b style={{ fontSize: '1.15rem' }}>{away.name}</b></div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            {sim.finished ? <button className="btn primary cta" onClick={finish}>Continuar ▸</button> : (<>
              <div className="seg">{[[0, '⏸ Pausa'], [1, '▶ Normal'], [3, '▶▶ Rápido'], [10, '▶▶▶ Muy rápido']].map(([v, l]) => <button key={v} className={speed === v ? 'on' : ''} onClick={() => setSpeed(v as number)}>{l}</button>)}</div>
              <button className="btn" onClick={() => { setSpeed(0); while (!sim.finished) sim.step(); bump() }}>Ir al final</button>
            </>)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .9fr 1.15fr', gap: 16, alignItems: 'start' }} className="mgrid">
          <div className="card"><h3 style={{ marginBottom: 8 }}>Relato</h3>
            <div className="feed">{feed.map((e, i) => <div key={feed.length - i} className={`ev ${e.type.includes('goal') ? 'goal' : e.type}`}><span className="num dim">{e.min}'</span><span>{e.text}</span></div>)}</div></div>
          <div className="card"><h3 style={{ marginBottom: 8 }}>Estadísticas</h3>
            {stats.map(([l, a, b, sh]) => (
              <div key={l} style={{ marginBottom: 7 }}>
                <div className="statrow"><b className="num">{a}</b><span className="lbl">{l}</span><b className="num right">{b}</b></div>
                <div className="duo"><i style={{ width: `${sh * 100}%`, background: cols[0] }} /><i style={{ flex: 1, background: cols[1] }} /></div>
              </div>))}
            <h3 style={{ margin: '12px 0 6px' }}>Mapa de remates</h3><ShotMap shots={sim.shots} colors={cols} />
            <h3 style={{ margin: '12px 0 6px' }}>Dominio del partido</h3><Momentum shots={sim.shots} colors={cols} upTo={sim.minute} />
          </div>
          <div className="card">
            <div className="row" style={{ marginBottom: 8 }}><div className="seg">
              <button className={tab === 'team' ? 'on' : ''} onClick={() => setTab('team')}>Mi equipo</button>
              <button className={tab === 'tactic' ? 'on' : ''} onClick={() => setTab('tactic')}>Táctica</button>
              <button className={tab === 'rival' ? 'on' : ''} onClick={() => setTab('rival')}>Rival</button></div>
              <span className="dim" style={{ marginLeft: 'auto', fontSize: '.84rem' }}>Cambios {mine.subs}/5</span></div>
            {tab === 'tactic' && <div className="col">
              <div><div className="dim" style={{ fontSize: '.78rem', marginBottom: 3 }}>Formación</div>
                <select value={mine.tactic.formation} onChange={e => { sim.setTactic(us, { formation: e.target.value }); bump() }}>{FORMATION_NAMES.map(f => <option key={f}>{f}</option>)}</select></div>
              <TacticControls tactic={mine.tactic} onChange={p => { sim.setTactic(us, p); bump() }} /></div>}
            {tab !== 'tactic' && (() => {
              const v = tab === 'team' ? mine : theirs
              return (<>
                <table><tbody>{v.on.map(o => { const p = g.players[o.pid]; return (
                  <tr key={o.pid} className={tab === 'team' ? 'click' : ''} style={out === o.pid ? { outline: '2px solid var(--accent)' } : undefined} onClick={() => tab === 'team' && !sim.finished && setOut(out === o.pid ? null : o.pid)}>
                    <td><span className="pill">{POS_LABEL[o.pos]}</span></td><td>{p.name}{o.yellow ? <span className="warn"> ▮</span> : ''}{o.goals ? ` ⚽${o.goals > 1 ? o.goals : ''}` : ''}</td>
                    <td><Cond v={o.cond} /></td><td className={`r num ${ratClass(o.rating)}`}><b>{o.rating.toFixed(1)}</b></td></tr>) })}</tbody></table>
                {tab === 'team' && <>
                  <h3 style={{ margin: '12px 0 6px' }}>{out != null ? `¿Quién entra por ${g.players[out].name}?` : 'Banco (tocá un titular para hacer un cambio)'}</h3>
                  <table><tbody>{v.bench.map(id => { const p = g.players[id], op = out != null ? v.on.find(o => o.pid === out)?.pos : null; return (
                    <tr key={id} className={out != null ? 'click' : ''} onClick={() => doSub(id)}>
                      <td><PosPill p={p} /></td><td>{p.name}</td><td><Cond v={p.cond} /></td><td className="r num dim">{Math.round(posRating(p, op ?? p.positions[0]))}</td></tr>) })}</tbody></table>
                </>}
              </>)
            })()}
          </div>
        </div>
        <style>{`@media (max-width: 1100px) { .mgrid { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </div>
  )
}
const share = (v: [number, number]) => (v[0] + v[1] ? v[0] / (v[0] + v[1]) : 0.5)
const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 100) : 0}%`
