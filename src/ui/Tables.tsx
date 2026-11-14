import { useState } from 'react'
import { groupTable } from '../engine/cups'
import { annualTable, clubsIn, fmtDate, leagueFx, promedios, relegationZone, tableOf, type Row } from '../engine/game'
import type { Fixture, Game, Player } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Badge, MatchReport, PosPill, avgRat, resultText } from './common'
import { PlayerTable, scoutBulk } from './PlayerTable'

function Table({ g, rows, marks }: { g: Game; rows: Row[]; marks?: (i: number, id: number) => string }) {
  return (
    <table>
      <thead><tr><th>#</th><th>Equipo</th><th className="r">PJ</th><th className="r">G</th><th className="r">E</th><th className="r">P</th><th className="r">GF</th><th className="r">GC</th><th className="r">DG</th><th className="r">Pts</th></tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.clubId} className={`${r.clubId === g.userClubId ? 'me' : ''} ${marks?.(i, r.clubId) ?? ''}`}>
          <td className="num dim">{i + 1}</td><td><span className="row" data-cid={r.clubId}><Badge club={g.clubs[r.clubId]} size={20} />{g.clubs[r.clubId].name}</span></td>
          <td className="r num">{r.pj}</td><td className="r num">{r.g}</td><td className="r num">{r.e}</td><td className="r num">{r.p}</td><td className="r num">{r.gf}</td><td className="r num">{r.gc}</td>
          <td className="r num">{r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}</td><td className="r num"><b>{r.pts}</b></td>
        </tr>))}</tbody>
    </table>
  )
}

function Knockout({ g, comp, onOpen }: { g: Game; comp: string; onOpen: (f: Fixture) => void }) {
  const ko = g.fixtures.filter(f => f.comp === comp && (f.knockout || f.leg))
  if (!ko.length) return null
  const stages = [...new Set(ko.map(f => f.stage))]
  return (
    <div className="card"><h3 style={{ marginBottom: 8 }}>Fase final</h3>
      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>{stages.map(s => (
        <div key={s} style={{ minWidth: 220 }}><div className="dim" style={{ marginBottom: 4 }}>{s}</div>
          {ko.filter(f => f.stage === s).map(f => <div key={f.id} className="row" style={{ padding: '3px 0', cursor: 'pointer' }} onClick={() => f.played && onOpen(f)}>
            <span className="grow">{g.clubs[f.home].short} – {g.clubs[f.away].short}</span><b className="num">{f.played ? resultText(f) : fmtDate(f.date)}</b></div>)}
        </div>))}</div>
    </div>
  )
}

export function Tables() {
  const { g } = useGame()
  const [tab, setTab] = useSticky(`tb.tab.${g.userClubId}`, ['', 'AP', 'PN', 'T3'][g.clubs[g.userClubId].division] || 'AP')
  const [rep, setRep] = useState<Fixture | null>(null)
  const tabs: [string, string][] = [['AP', 'Apertura'], ['CL', 'Clausura'], ['AN', 'Anual'], ['PR', 'Promedios'], ['PN', 'Primera Nacional'], ['T3', 'Tercera'], ['CA', 'Copa Argentina'], ['LIB', 'Libertadores'], ['SUD', 'Sudamericana']]
  const rel = relegationZone(g)
  return (
    <div className="page">
      <div className="row wrap"><h2 className="grow">Posiciones</h2><div className="seg">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div></div>
      {tab === 'T3' && g.comps.T3 && (<>
        <div className="grid2">{['A', 'B'].map(z => (
          <div key={z} className="card scroll-x"><h3 style={{ marginBottom: 6 }}>{z === 'A' ? 'Primera B' : 'Federal A'}</h3>
            <Table g={g} rows={tableOf(leagueFx(g, 'T3'), clubsIn(g, 3, z))} marks={i => (i < 2 ? 'zone-q' : '')} /></div>))}</div>
        <div className="dim" style={{ fontSize: '.84rem' }}>Los dos primeros de cada zona ascienden a la Primera Nacional, y bajan los dos últimos de cada zona de la Primera Nacional.</div>
      </>)}
      {tab === 'CA' && g.comps.CA && <><div className="dim" style={{ fontSize: '.84rem' }}>64 equipos de las tres categorías, a partido único en cancha neutral. El campeón juega la próxima Libertadores.</div><Knockout g={g} comp="CA" onOpen={setRep} /></>}
      {(tab === 'LIB' || tab === 'SUD') && g.comps[tab] && (<>
        <div className="grid2">{[0, 1, 2, 3].map(i => (
          <div key={i} className="card scroll-x"><h3 style={{ marginBottom: 6 }}>{g.comps[tab].name} · Grupo {'ABCD'[i]}</h3>
            <Table g={g} rows={groupTable(g, tab, i)} marks={j => (j < 2 ? 'zone-q' : '')} /></div>))}</div>
        <div className="dim" style={{ fontSize: '.84rem' }}>Los dos primeros de cada grupo pasan a cuartos. Cuartos y semifinales se juegan ida y vuelta (sin alargue: si el global queda igual, penales). La final es a partido único.</div>
        <Knockout g={g} comp={tab} onOpen={setRep} />
      </>)}
      {(tab === 'AP' || tab === 'CL' || tab === 'PN') && (<>
        <div className="grid2">{['A', 'B'].map(z => (
          <div key={z} className="card scroll-x"><h3 style={{ marginBottom: 6 }}>{g.comps[tab].name} · Zona {z}</h3>
            <Table g={g} rows={tableOf(leagueFx(g, tab), clubsIn(g, tab === 'PN' ? 2 : 1, z))} marks={i => (tab === 'PN' ? (i === 0 ? 'zone-q' : i < 4 ? 'zone-p' : '') : i < 8 ? 'zone-q' : '')} /></div>))}</div>
        <div className="dim" style={{ fontSize: '.84rem' }}>{tab === 'PN' ? 'Verde: juega la final por el ascenso. Azul: clasifica al Reducido por el segundo ascenso.' : 'Verde: clasifica a octavos de final. Cada equipo juega 14 partidos de zona y 2 interzonales.'}</div>
        <Knockout g={g} comp={tab} onOpen={setRep} />
      </>)}
      {tab === 'AN' && <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Tabla anual {g.season}</h3><Table g={g} rows={annualTable(g)} marks={(i, id) => (id === rel[0] ? 'zone-r' : i < 3 ? 'zone-q' : i < 9 ? 'zone-p' : '')} />
        <div className="dim" style={{ fontSize: '.84rem', marginTop: 8 }}>Suma las fases de zonas del Apertura y el Clausura. El último desciende; los primeros puestos dan plazas en copas internacionales.</div></div>}
      {tab === 'PR' && <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Promedios</h3>
        <table><thead><tr><th>#</th><th>Equipo</th><th className="r">Pts</th><th className="r">PJ</th><th className="r">Promedio</th></tr></thead>
          <tbody>{promedios(g).map((r, i) => <tr key={r.clubId} className={`${r.clubId === g.userClubId ? 'me' : ''} ${r.clubId === rel[1] ? 'zone-r' : ''}`}><td className="num dim">{i + 1}</td><td><span className="row" data-cid={r.clubId}><Badge club={g.clubs[r.clubId]} size={20} />{g.clubs[r.clubId].name}</span></td><td className="r num">{r.pts}</td><td className="r num">{r.pj}</td><td className="r num"><b>{r.avg.toFixed(3)}</b></td></tr>)}</tbody></table>
        <div className="dim" style={{ fontSize: '.84rem', marginTop: 8 }}>Puntos por partido de las últimas tres temporadas en Primera. El peor promedio desciende (además del último de la tabla anual).</div></div>}
      {rep && <MatchReport g={g} f={rep} onClose={() => setRep(null)} />}
    </div>
  )
}

export function Fixtures() {
  const { g } = useGame()
  const club = g.clubs[g.userClubId]
  const [mode, setMode] = useSticky<'mine' | 'all'>('fx.mode', 'mine')
  const [rep, setRep] = useState<Fixture | null>(null)
  const dates = [...new Set(g.fixtures.map(f => f.date))]
  const [date, setDate] = useState(() => dates.find(d => d >= g.date) ?? dates[dates.length - 1])
  const list = mode === 'mine' ? g.fixtures.filter(f => f.home === club.id || f.away === club.id) : g.fixtures.filter(f => f.date === date)
  const di = dates.indexOf(date)
  return (
    <div className="page">
      <div className="row wrap"><h2 className="grow">Fixture</h2>
        {mode === 'all' && <div className="row"><button className="btn sm" disabled={di <= 0} onClick={() => setDate(dates[di - 1])}>◂</button><b>{fmtDate(date)}</b><button className="btn sm" disabled={di >= dates.length - 1} onClick={() => setDate(dates[di + 1])}>▸</button></div>}
        <div className="seg"><button className={mode === 'mine' ? 'on' : ''} onClick={() => setMode('mine')}>{club.short}</button><button className={mode === 'all' ? 'on' : ''} onClick={() => setMode('all')}>Toda la fecha</button></div></div>
      <div className="card scroll-x">
        <table><thead><tr><th>Fecha</th><th>Torneo</th><th>Instancia</th><th className="r">Local</th><th className="c">Resultado</th><th>Visitante</th></tr></thead>
          <tbody>{list.map(f => (
            <tr key={f.id} className={f.played ? 'click' : ''} onClick={() => f.played && setRep(f)}>
              <td className="dim">{fmtDate(f.date)}</td><td className="dim">{g.comps[f.comp].name}</td><td className="dim">{f.stage}</td>
              <td className="r"><span className="row" style={{ justifyContent: 'flex-end' }}><span style={{ fontWeight: f.home === club.id ? 700 : 400 }}>{g.clubs[f.home].name}</span><Badge club={g.clubs[f.home]} size={20} /></span></td>
              <td className="c num"><b>{f.played ? resultText(f) : '–'}</b></td>
              <td><span className="row"><Badge club={g.clubs[f.away]} size={20} /><span style={{ fontWeight: f.away === club.id ? 700 : 400 }}>{g.clubs[f.away].name}</span></span></td>
            </tr>))}</tbody></table>
      </div>
      {rep && <MatchReport g={g} f={rep} onClose={() => setRep(null)} />}
    </div>
  )
}

export function Stats() {
  const { g, openPlayer } = useGame()
  const [div, setDiv] = useSticky(`st.div.${g.userClubId}`, g.clubs[g.userClubId].division)
  const ps = Object.values(g.players).filter(p => g.clubs[p.clubId]?.division === div)
  const pj = (p: Player) => p.stats.apps + p.stats.subs
  const minPj = Math.max(1, Math.floor(Math.max(...ps.map(pj)) * 0.5))
  const boards: [string, (p: Player) => number, (p: Player) => string, ((p: Player) => boolean)?][] = [
    ['Goleadores', p => p.stats.goals, p => String(p.stats.goals)],
    ['Asistencias', p => p.stats.ast, p => String(p.stats.ast)],
    ['Promedio de puntaje', p => p.stats.ratSum / Math.max(1, pj(p)), p => avgRat(p.stats), p => pj(p) >= minPj],
    ['Figura del partido', p => p.stats.motm, p => String(p.stats.motm)],
    ['Vallas invictas', p => p.stats.cs, p => `${p.stats.cs} (${p.stats.conc} GC)`, p => p.line === 'GK'],
    ['Remates al arco', p => p.stats.sot, p => `${p.stats.sot} de ${p.stats.shots}`],
    ['Atajadas', p => p.stats.saves, p => String(p.stats.saves), p => p.line === 'GK'],
    ['Amarillas', p => p.stats.yc, p => `${p.stats.yc}${p.stats.rc ? ` · ${p.stats.rc} R` : ''}`],
  ]
  return (
    <div className="page">
      <div className="row wrap"><h2 className="grow">Estadísticas {g.season}</h2><div className="seg">{[1, 2, 3].map(d => <button key={d} className={div === d ? 'on' : ''} onClick={() => setDiv(d)}>{['', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][d]}</button>)}</div></div>
      <div className="grid2">{boards.map(([title, val, show, filter]) => (
        <div key={title} className="card"><h3 style={{ marginBottom: 6 }}>{title}</h3>
          <table><tbody>{ps.filter(p => pj(p) > 0 && (!filter || filter(p))).sort((a, b) => val(b) - val(a)).slice(0, 10).map((p, i) => (
            <tr key={p.id} data-pid={p.id} className={`click ${p.clubId === g.userClubId ? 'me' : ''}`} onClick={() => openPlayer(p.id)}>
              <td className="num dim">{i + 1}</td><td><b style={{ fontWeight: 600 }}>{p.name}</b></td><td><PosPill p={p} /></td>
              <td><span className="row dim"><Badge club={g.clubs[p.clubId]} size={18} />{g.clubs[p.clubId].short}</span></td><td className="r num dim">{pj(p)} PJ</td><td className="r num"><b>{show(p)}</b></td></tr>))}</tbody></table>
        </div>))}</div>
      <h2 style={{ marginTop: 8 }}>Todos los jugadores</h2>
      <PlayerTable id="stats" players={ps.filter(p => pj(p) > 0)} views={['stats', 'general', 'ojeo']} def="stats" defSort={[{ k: 'gol', d: -1 }, { k: 'rat', d: -1 }]} bulk={scoutBulk(g)} limit={100} empty="Todavía no se jugaron partidos en esta categoría." />
    </div>
  )
}
