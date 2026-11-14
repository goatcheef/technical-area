// Día de partido: resultados y tabla en vivo, paneles configurables y el flujo posterior (resultado, análisis, conferencia).
import { useState, type ReactNode } from 'react'
import { clubsIn, fmtDate, leagueFx, tableOf } from '../engine/game'
import type { MatchSim } from '../engine/match'
import type { Fixture, Game } from '../engine/types'
import { useGame, type Settings } from '../store'
import { Analysis, Badge, Momentum, ShotMap, duoColors, ratClass, resultText } from './common'
import { PressPanel } from './Week'

export interface Live { f: Fixture; sim: MatchSim }

/** Avanza los otros partidos hasta el minuto del partido del usuario (o hasta el final). */
export function syncLive(live: Live[], minute: number, toEnd = false) {
  for (const { sim } of live) {
    if (toEnd) { while (!sim.finished) sim.step(); continue }
    while (!sim.finished && sim.tick < sim.ticks.length && sim.ticks[sim.tick] <= minute) sim.step()
  }
}

// ---------- resultados en vivo ----------
export function LiveOthers({ live, minute }: { live: Live[]; minute: number }) {
  const { g } = useGame()
  if (!live.length) return <div className="dim sm">No hay otros partidos de este torneo hoy.</div>
  return <div className="col" style={{ gap: 2 }}>{live.map(({ f, sim }) => {
    const goals = sim.events.filter(e => e.type === 'goal' || e.type === 'pen-goal' || e.type === 'own')
    const lastG = goals[goals.length - 1], fresh = lastG && minute - lastG.min <= 3 && !sim.finished
    const h = g.clubs[f.home], a = g.clubs[f.away]
    return (
      <div key={f.id} className={`live-row ${fresh ? 'flash' : ''}`} title={goals.map(e => `${e.min}' ${e.text}`).join('\n')}>
        <span className="row" style={{ gap: 6, justifyContent: 'flex-end', minWidth: 0 }} data-cid={h.id}><span className="ell">{h.short}</span><Badge club={h} size={18} /></span>
        <b className="num live-score">{sim.sides[0].goals}-{sim.sides[1].goals}</b>
        <span className="row" style={{ gap: 6, minWidth: 0 }} data-cid={a.id}><Badge club={a} size={18} /><span className="ell">{a.short}</span></span>
        <span className="dim sm num">{sim.finished ? 'Final' : sim.tick ? `${sim.minute}'` : '–'}</span>
      </div>)
  })}</div>
}

// ---------- tabla en vivo ----------
export function LiveTable({ f, live, mine }: { f: Fixture; live: Live[]; mine: MatchSim }) {
  const { g } = useGame()
  const comp = g.comps[f.comp]
  if (!comp || f.knockout || !['AP', 'CL', 'PN', 'T3'].includes(f.comp)) return <div className="dim sm">La tabla en vivo es para los torneos de liga.</div>
  const me = g.clubs[g.userClubId]
  const teams = clubsIn(g, comp.division, me.zone)
  const base = leagueFx(g, f.comp)
  const now = new Map<number, [number, number]>([[f.id, [mine.sides[0].goals, mine.sides[1].goals]], ...live.map(l => [l.f.id, [l.sim.sides[0].goals, l.sim.sides[1].goals]] as [number, [number, number]])])
  const before = tableOf(base, teams)
  const after = tableOf(base.map(x => (now.has(x.id) && (x.id !== f.id || mine.tick > 0) ? { ...x, played: true, hg: now.get(x.id)![0], ag: now.get(x.id)![1] } : x)), teams)
  const playing = new Set([f.home, f.away, ...live.map(l => [l.f.home, l.f.away]).flat()])
  return (
    <table className="livetable"><tbody>{after.map((r, i) => {
      const was = before.findIndex(x => x.clubId === r.clubId), d = was - i
      return <tr key={r.clubId} className={r.clubId === me.id ? 'me' : ''}>
        <td className="num dim">{i + 1}</td><td className="sm" style={{ width: 16 }}>{d > 0 ? <span className="good">▲</span> : d < 0 ? <span className="bad">▼</span> : ''}</td>
        <td><span className="row ell" style={{ gap: 6 }} data-cid={r.clubId}><Badge club={g.clubs[r.clubId]} size={18} />{g.clubs[r.clubId].short}{playing.has(r.clubId) && <span className="livedot" title="Jugando ahora" />}</span></td>
        <td className="r num dim">{r.pj}</td><td className="r num dim">{r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}</td><td className="r num"><b>{r.pts}</b></td></tr>
    })}</tbody></table>)
}

// ---------- paneles ----------
export type Slot = 'side' | 'bottom' | 'off'
export const PANELS: Record<string, string> = { team: 'Mi equipo y táctica', assistant: 'Ayudante', others: 'Otros partidos', table: 'Tabla en vivo', feed: 'Relato', stats: 'Estadísticas', shots: 'Remates y dominio' }
export const DEFAULT_PANELS: { id: string; slot: Slot }[] = [
  { id: 'team', slot: 'side' }, { id: 'assistant', slot: 'side' }, { id: 'others', slot: 'bottom' }, { id: 'table', slot: 'bottom' },
  { id: 'feed', slot: 'bottom' }, { id: 'stats', slot: 'bottom' }, { id: 'shots', slot: 'bottom' },
]
export function panelsOf(s: Settings) {
  const saved = s.matchPanels ?? []
  return [...saved.filter(p => PANELS[p.id]), ...DEFAULT_PANELS.filter(d => !saved.some(p => p.id === d.id))]
}
export function PanelMenu({ onClose }: { onClose: () => void }) {
  const { settings, setSettings } = useGame()
  const list = panelsOf(settings)
  const set = (l: { id: string; slot: Slot }[], big = settings.bigPitch) => setSettings({ ...settings, matchPanels: l, bigPitch: big })
  const move = (i: number, d: number) => { const l = [...list], j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; set(l) }
  return (
    <div className="colmenu" style={{ position: 'fixed', top: 72, right: 24, left: 'auto', width: 'min(520px, 92vw)', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
      <div className="row between"><h3>Paneles del partido</h3><button className="btn sm" onClick={onClose}>Listo</button></div>
      <label className="row sm" style={{ gap: 8 }}><input type="checkbox" checked={!!settings.bigPitch} onChange={e => set(list, e.target.checked)} />Cancha grande: la cancha ocupa todo el ancho y los paneles van abajo</label>
      <div className="col" style={{ gap: 4 }}>{list.map((p, i) => (
        <div key={p.id} className="row" style={{ gap: 6 }}>
          <button className="btn sm icon" disabled={i === 0} onClick={() => move(i, -1)}>▴</button><button className="btn sm icon" disabled={i === list.length - 1} onClick={() => move(i, 1)}>▾</button>
          <span className="grow">{PANELS[p.id]}</span>
          <div className="seg" role="group" aria-label={`Lugar de ${PANELS[p.id]}`}>{([['side', 'Al costado'], ['bottom', 'Abajo'], ['off', 'Oculto']] as const).map(([k, l]) => <button key={k} className={p.slot === k ? 'on' : ''} aria-pressed={p.slot === k} onClick={() => set(list.map(x => (x.id === p.id ? { ...x, slot: k } : x)))}>{l}</button>)}</div>
        </div>))}</div>
      <div className="row"><button className="btn sm" onClick={() => setSettings({ ...settings, matchPanels: undefined, bigPitch: false })}>Restablecer</button><span className="dim sm">Se guarda en este navegador.</span></div>
    </div>
  )
}

// ---------- después del partido ----------
/** Flujo ordenado al terminar: resultado, análisis y conferencia, en ese orden. */
export function PostMatch({ fixtureId, onDone }: { fixtureId: number; onDone: () => void }) {
  const { g } = useGame()
  const f = g.fixtures.find(x => x.id === fixtureId)
  const [step, setStep] = useState(0)
  if (!f) { onDone(); return null }
  const hasPress = !!g.press && g.press.kind === 'post' && g.press.fixtureId === f.id
  const steps = ['Resultado', 'Análisis', ...(hasPress || step === 2 ? ['Conferencia'] : [])]
  const next = () => (step < steps.length - 1 ? setStep(step + 1) : onDone())
  const h = g.clubs[f.home], a = g.clubs[f.away], cols = duoColors(h, a)
  const us = f.home === g.userClubId ? 0 : 1
  const gf = us === 0 ? f.hg : f.ag, gc = us === 0 ? f.ag : f.hg
  const won = f.pens ? f.pens[us] > f.pens[1 - us] : gf > gc
  const others = g.fixtures.filter(x => x.id !== f.id && x.date === f.date && x.comp === f.comp && x.played)
  const lines = (f.lines ?? []).filter(l => l.side === us).sort((x, y) => y.rating - x.rating)
  const motm = (f.lines ?? []).slice().sort((x, y) => y.rating - x.rating)[0]
  return (
    <div className="main" style={{ height: '100%' }}>
      <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <div className="steps">{steps.map((s, i) => <button key={s} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)}><span>{i + 1}</span>{s}</button>)}</div>
          <span className="grow" />
          {step < steps.length - 1 && <button className="btn" onClick={onDone}>Saltear todo</button>}
          <button className="btn primary cta" onClick={next}>{step < steps.length - 1 ? `${steps[step + 1]} ▸` : 'Volver al inicio ▸'}</button>
        </div>
        {step === 0 && <>
          <div className="hero center">
            <div className="dim sm">{g.comps[f.comp]?.name} · {f.stage} · {fmtDate(f.date)}</div>
            <div className="row" style={{ justifyContent: 'center', gap: 24, margin: '8px 0' }}>
              <div className="row grow" style={{ justifyContent: 'flex-end' }}><b style={{ fontSize: '1.15rem' }}>{h.name}</b><Badge club={h} size={72} /></div>
              <div className="score">{resultText(f)}</div>
              <div className="row grow"><Badge club={a} size={72} /><b style={{ fontSize: '1.15rem' }}>{a.name}</b></div>
            </div>
            <div className={won ? 'good' : gf === gc && !f.pens ? 'dim' : 'bad'} style={{ fontWeight: 650 }}>{won ? 'Victoria' : gf === gc && !f.pens ? 'Empate' : 'Derrota'}{motm && g.players[motm.pid] ? <span className="dim"> · Figura: {g.players[motm.pid].name} ({motm.rating.toFixed(1)})</span> : null}</div>
          </div>
          <div className="dash">
            <div className="card s4 col"><h3>Goles e incidencias</h3>
              <div className="col" style={{ gap: 5 }}>{(f.events ?? []).filter(e => ['goal', 'pen-goal', 'own', 'rc', 'yc2', 'inj', 'pen-miss'].includes(e.type)).map((e, i) => <div key={i} className={`ev ${e.type.includes('goal') ? 'goal' : e.type}`}><span className="num dim">{e.min}'</span><span>{e.text}</span></div>)}
                {!(f.events ?? []).some(e => e.type.includes('goal')) && <span className="dim sm">Sin goles.</span>}</div></div>
            <div className="card s4 col"><h3>Puntajes de tu equipo</h3>
              <div>{lines.map(l => <div key={l.pid} className="row between sm" style={{ padding: '2px 0' }}><span data-pid={l.pid} className={`ell ${l.started ? '' : 'dim'}`}>{g.players[l.pid]?.name}{l.goals ? ` ⚽${l.goals > 1 ? l.goals : ''}` : ''}</span><b className={`num ${ratClass(l.rating)}`}>{l.rating.toFixed(1)}</b></div>)}</div></div>
            <div className="card s4 col"><h3>Resto de la fecha</h3>
              {others.length ? others.map(x => <div key={x.id} className="live-row"><span className="row ell" style={{ gap: 6, justifyContent: 'flex-end' }}>{g.clubs[x.home].short}<Badge club={g.clubs[x.home]} size={18} /></span><b className="num live-score">{resultText(x)}</b><span className="row ell" style={{ gap: 6 }}><Badge club={g.clubs[x.away]} size={18} />{g.clubs[x.away].short}</span><span /></div>) : <span className="dim sm">No hubo otros partidos de este torneo.</span>}</div>
          </div>
        </>}
        {step === 1 && <div className="dash">
          <div className="card s7 col">{f.analysis ? <Analysis g={g} f={f} cols={cols} /> : <div className="dim">Sin análisis para este partido.</div>}</div>
          <div className="card s5 col"><h3>Mapa de remates</h3>{f.shots && <ShotMap shots={f.shots} colors={cols} />}<h3>Dominio del partido</h3>{f.shots && <Momentum shots={f.shots} colors={cols} />}
            <h3>Estadísticas</h3><div className="statrow"><b>{h.short}</b><span /><b className="right">{a.short}</b></div>{f.stats && <Stats f={f} />}</div>
        </div>}
        {step === 2 && <div className="card" style={{ maxWidth: 820 }}>{hasPress ? <PressPanel onDone={next} /> : <div className="col"><div className="good">Conferencia respondida.</div><div><button className="btn primary" onClick={onDone}>Volver al inicio ▸</button></div></div>}</div>}
      </div>
    </div>
  )
}
function Stats({ f }: { f: Fixture }): ReactNode {
  const s = f.stats!
  const rows: [string, (i: 0 | 1) => string | number][] = [['Posesión', i => `${s.poss[i]}%`], ['Remates', i => s.shots[i]], ['Al arco', i => s.sot[i]], ['xG', i => s.xg[i].toFixed(2)], ['Córners', i => s.corners[i]], ['Faltas', i => s.fouls[i]], ['Amarillas', i => s.yc[i]], ['Rojas', i => s.rc[i]]]
  return <div>{rows.map(([l, fn]) => <div key={l} className="statrow"><b className="num">{fn(0)}</b><span className="lbl">{l}</span><b className="num right">{fn(1)}</b></div>)}</div>
}
export type { Game }
