import { useState, type ReactNode } from 'react'
import { wageBill, windowOpen } from '../engine/career'
import { FOCUS, INTENSITY } from '../engine/week'
import { harmony } from '../engine/squad'
import { ReportModal } from './Week'
import { annualTable, clubsIn, fmtDate, leagueFx, nextUserFixture, promedios, relegationZone, squadOf, startNewSeason, tableOf } from '../engine/game'
import type { Fixture } from '../engine/types'
import { exportGame, useGame } from '../store'
import { Badge, Face, Gauge, MatchReport, Val, avgRat, money, resultText } from './common'
import { pendingOf, pendingText, unreadOf } from './Inbox'


export function Home() {
  const { g, refresh, go, nav, save, openPlayer, settings, setSettings } = useGame()
  const [scout, setScout] = useState(false)
  const [report, setReport] = useState<Fixture | null>(null)
  const club = g.clubs[g.userClubId], squad = squadOf(g, club.id)
  const next = nextUserFixture(g)
  const comp = club.division === 1 ? (g.comps.AP?.phase === 'done' ? 'CL' : 'AP') : club.division === 3 ? 'T3' : 'PN'
  const table = tableOf(leagueFx(g, comp), clubsIn(g, club.division, club.zone))
  const pos = table.findIndex(r => r.clubId === club.id)
  const mine = g.fixtures.filter(f => f.played && (f.home === club.id || f.away === club.id))
  const res = (f: Fixture, id: number) => { const h = f.home === id, d = (h ? 1 : -1) * (f.hg - f.ag); return f.pens ? (f.pens[h ? 0 : 1] > f.pens[h ? 1 : 0] ? 'G' : 'P') : d > 0 ? 'G' : d < 0 ? 'P' : 'E' }
  const chip = (r: string, i: number) => <span key={i} className="chip" style={{ color: r === 'G' ? 'var(--good)' : r === 'P' ? 'var(--bad)' : 'var(--dim)', padding: '3px 8px' }}>{r}</span>
  const opp = next ? g.clubs[next.home === club.id ? next.away : next.home] : null
  const oppFx = opp ? g.fixtures.filter(f => f.played && (f.home === opp.id || f.away === opp.id)).slice(-5) : []
  const oppStar = opp ? squadOf(g, opp.id).sort((a, b) => b.ca - a.ca)[0] : null
  const best = squad.filter(p => p.stats.apps + p.stats.subs >= Math.max(1, mine.length / 3)).sort((a, b) => b.stats.ratSum / (b.stats.apps + b.stats.subs) - a.stats.ratSum / (a.stats.apps + a.stats.subs)).slice(0, 4)
  const inj = squad.filter(p => p.injury), sus = squad.filter(p => p.susp), exp = squad.filter(p => p.contractEnd <= g.season && !p.loanFrom)
  const m = g.manager, bill = wageBill(g, club.id)
  const lay = settings.home ?? DEFAULT_HOME
  const [edit, setEdit] = useState(false)
  const setLay = (l: Tile[]) => setSettings({ ...settings, home: l })
  const move = (i: number, d: number) => { const l = [...lay], j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setLay(l) }
  const pend = pendingOf(g)
  const inbox = g.news.filter(n => n.me ?? n.clubId === club.id).slice(0, 7)
  const upcoming = g.fixtures.filter(f => !f.played && (f.home === club.id || f.away === club.id)).slice(0, 6)
  const tiles: Record<string, { name: string; hero?: boolean; render: () => ReactNode }> = {
    next: { name: 'Próximo partido', hero: true, render: () => <>
      <div className="row between"><h3>Próximo partido</h3>{next && <span className="chip acc">{g.comps[next.comp].name} · {next.stage}</span>}</div>
      {next && opp ? (<>
        <div className="row" style={{ justifyContent: 'center', gap: 28 }}>
          <div className="col center grow" style={{ alignItems: 'center', gap: 6 }}><Badge club={g.clubs[next.home]} size={92} /><b style={{ fontSize: '1.1rem' }}>{g.clubs[next.home].name}</b></div>
          <div className="center"><div className="big" style={{ fontSize: '2.6rem', color: 'var(--dim)' }}>VS</div><div className="sm" style={{ marginTop: 6 }}>{fmtDate(next.date)}</div><div className="dim sm">{next.neutral ? 'Cancha neutral' : g.clubs[next.home].stadium}</div></div>
          <div className="col center grow" style={{ alignItems: 'center', gap: 6 }}><Badge club={g.clubs[next.away]} size={92} /><b style={{ fontSize: '1.1rem' }}>{g.clubs[next.away].name}</b></div>
        </div>
        <div className="row wrap">
          <span className="dim sm">Rival: DT {opp.manager} · {opp.tactic.formation}</span><span className="row" style={{ gap: 3 }}>{oppFx.map((f, i) => chip(res(f, opp.id), i))}</span>
          {oppStar && <button className="btn sm" data-pid={oppStar.id} onClick={() => openPlayer(oppStar.id)}>Figura: {oppStar.name} <Val p={oppStar} /></button>}
          <span className="grow" />{g.training.reportFor === next.id ? <button className="btn primary" onClick={() => setScout(true)}>Informe del rival</button> : <span className="dim sm">El informe del rival llega 3 días antes</span>}<button className="btn" onClick={() => go('tactics')}>Preparar el equipo</button>
        </div></>) : <div className="dim">No hay partidos programados.</div>}
    </> },
    board: { name: 'Dirigencia', render: () => <div className="col" style={{ alignItems: 'center', textAlign: 'center' }}>
      <h3 style={{ alignSelf: 'flex-start' }}>Dirigencia</h3><Gauge v={g.board.confidence} label="CONFIANZA" />
      <div><b>{g.board.objective}</b><div className="dim sm">Objetivo de la temporada</div></div>
      <div className="row" style={{ gap: 14 }}><span className="kpi"><b className="good">{m.cur.g}</b><span className="dim sm">Ganados</span></span><span className="kpi"><b>{m.cur.e}</b><span className="dim sm">Empatados</span></span><span className="kpi"><b className="bad">{m.cur.p}</b><span className="dim sm">Perdidos</span></span></div>
    </div> },
    table: { name: 'Posiciones', render: () => <>
      <div className="row between"><h3>{g.comps[comp]?.name} · Zona {club.zone}</h3><span className="big" style={{ fontSize: '1.6rem' }}>{pos + 1}.º</span></div>
      <table><tbody>{table.slice(Math.max(0, Math.min(pos - 2, table.length - 5)), Math.max(5, Math.min(pos + 3, table.length))).map(r => (
        <tr key={r.clubId} className={r.clubId === club.id ? 'me' : ''}><td className="num dim">{table.indexOf(r) + 1}</td><td><span className="row" data-cid={r.clubId}><Badge club={g.clubs[r.clubId]} size={22} />{g.clubs[r.clubId].short}</span></td>
          <td className="r num dim">{r.pj}</td><td className="r num dim">{r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}</td><td className="r num"><b>{r.pts}</b></td></tr>))}</tbody></table>
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('tables')}>Ver tablas</button>
    </> },
    form: { name: 'Rendimiento', render: () => <>
      <div className="row between"><h3>Rendimiento</h3><span className="row" style={{ gap: 3 }}>{mine.slice(-5).map((f, i) => chip(res(f, club.id), i))}</span></div>
      {best.length ? best.map(p => (
        <div key={p.id} data-pid={p.id} className="row" style={{ cursor: 'pointer' }} onClick={() => openPlayer(p.id)}><Face p={p} club={club} size={34} /><div className="grow ell"><b>{p.name}</b><div className="dim sm">{p.stats.goals} goles · {p.stats.ast} asist.</div></div><b className="num good">{avgRat(p.stats)}</b></div>))
        : <div className="dim sm">Los mejores puntajes del plantel van a aparecer acá cuando empiece el torneo.</div>}
    </> },
    todo: { name: 'Para atender', render: () => <>
      <h3>Para atender</h3>
      {pend.length > 0 && <div className="row between"><span className="warn">Pendiente: {pendingText(pend)}</span><button className="btn sm primary" onClick={() => nav({ page: 'inbox', tab: 'pend' })}>Ver</button></div>}
      {(() => { const hm = harmony(g), out = squadOf(g, club.id).filter(p => p.wantsOut).length; return <div className="row between"><span className={hm.unhappy.length ? 'warn' : 'dim'}>Vestuario: armonía {hm.value}{hm.unhappy.length ? ` · ${hm.unhappy.length} disconforme(s)` : ''}{out ? ` · ${out} quiere(n) irse` : ''}</span><button className="btn sm" onClick={() => go('locker')}>Vestuario</button></div> })()}
      <div className="row between"><span className="dim">Entrenamiento: {INTENSITY[g.training.intensity].name.toLowerCase()}, foco {FOCUS.find(f => f.k === g.training.focus)!.name.toLowerCase()}{g.delegate.training ? ' (ayudante)' : ''}</span><button className="btn sm" onClick={() => go('training')}>Ajustar</button></div>
      {windowOpen(g.date) && <div className="row between"><span>Libro de pases abierto</span><button className="btn sm" onClick={() => go('market')}>Ir al mercado</button></div>}
      <div className="row between"><span className={inj.length ? 'bad' : 'dim'}>{inj.length} lesionado(s)</span><span className="dim sm ell" style={{ maxWidth: '60%' }}>{inj.map(p => p.name.split(' ').slice(-1)[0]).join(', ')}</span></div>
      <div className="row between"><span className={sus.length ? 'warn' : 'dim'}>{sus.length} suspendido(s)</span><span className="dim sm ell" style={{ maxWidth: '60%' }}>{sus.map(p => p.name.split(' ').slice(-1)[0]).join(', ')}</span></div>
      <div className="row between"><span className={exp.length ? 'warn' : 'dim'}>{exp.length} contrato(s) vencen en diciembre</span><button className="btn sm" onClick={() => go('squad')}>Plantel</button></div>
      <div className="row between"><span className="dim">Presupuesto de pases</span><b>{money(club.budget)}</b></div>
      <div className="row between"><span className="dim">Sueldos</span><b className={bill > club.wageBudget ? 'bad' : ''}>{money(bill)} / {money(club.wageBudget)}</b></div>
    </> },
    inbox: { name: 'Bandeja', render: () => <>
      <div className="row between"><h3>Bandeja{unreadOf(g) ? ` · ${unreadOf(g)} sin leer` : ''}</h3><button className="btn sm" onClick={() => go('inbox')}>Abrir</button></div>
      <div>{inbox.map(n => (
        <button key={n.id} className={`ib-row ${n.read ? '' : 'unread'}`} onClick={() => go('inbox')}>
          <span className="ib-ico">{n.pid != null && g.players[n.pid] ? <Face p={g.players[n.pid]} size={26} /> : n.clubId != null && g.clubs[n.clubId] ? <Badge club={g.clubs[n.clubId]} size={24} /> : null}</span>
          <span className="grow ib-title">{n.title}</span><span className="dim sm">{fmtDate(n.date).replace(/ \d{4}$/, '')}</span></button>))}
        {!inbox.length && <div className="dim sm">Todavía no hay mensajes.</div>}</div>
    </> },
    upcoming: { name: 'Próximos partidos', render: () => <>
      <h3>Próximos partidos</h3>
      {upcoming.length ? <table><tbody>{upcoming.map(f => { const home = f.home === club.id, o = g.clubs[home ? f.away : f.home]; return <tr key={f.id}><td className="dim sm">{fmtDate(f.date).replace(/ \d{4}$/, '')}</td><td><span className="row" data-cid={o.id}><Badge club={o} size={22} />{home ? 'vs' : 'en'} {o.short}</span></td><td className="dim sm ell">{g.comps[f.comp]?.name.replace(/ \d{4}$/, '')}</td></tr> })}</tbody></table> : <div className="dim sm">No hay partidos programados.</div>}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('calendar')}>Calendario</button>
    </> },
    results: { name: 'Últimos resultados', render: () => <>
      <h3>Últimos resultados</h3>
      {mine.length ? <table><tbody>{mine.slice(-6).reverse().map(f => { const home = f.home === club.id, o = g.clubs[home ? f.away : f.home], r = res(f, club.id)
        return <tr key={f.id} className="click" onClick={() => setReport(f)}><td className="dim sm">{f.stage}</td><td><span className="row"><Badge club={o} size={22} />{home ? 'vs' : 'en'} {o.short}</span></td><td className="r num"><b className={r === 'G' ? 'good' : r === 'P' ? 'bad' : ''}>{resultText(f)}</b></td></tr> })}</tbody></table>
        : <div className="dim sm">Todavía no jugaste ningún partido oficial.</div>}
    </> },
    champions: { name: 'Últimos campeones', render: () => <>
      <h3>Últimos campeones</h3>
      {g.honours.length ? [...g.honours].reverse().slice(0, 6).map((h, i) => <div key={i} className="row" style={{ padding: '3px 0' }}><Badge club={g.clubs[h.clubId]} size={22} /><span className="grow">{g.clubs[h.clubId].name}</span><span className="dim sm">{h.comp}</span></div>) : <div className="dim sm">Todavía no se definió ningún torneo.</div>}
    </> },
  }
  const hidden = Object.keys(tiles).filter(id => !lay.some(t => t.id === id))
  return (
    <div className="page">
      {g.seasonOver && (
        <div className="card glow col">
          <h2>Terminó la temporada {g.season}</h2>
          <div className="dim" style={{ lineHeight: 1.6 }}>Campeones: {Object.values(g.comps).map(c => `${c.name}: ${g.clubs[c.champion!]?.name}`).join(' · ')}.<br />
            Tabla anual: 1.º {g.clubs[annualTable(g)[0].clubId].name}. Descienden {relegationZone(g).map(id => g.clubs[id].name).join(' y ')}. Peor promedio: {promedios(g).slice(-1).map(r => `${g.clubs[r.clubId].short} (${r.avg.toFixed(3)})`)}.</div>
          <div><button className="btn primary cta" onClick={() => { startNewSeason(g); save(); refresh() }}>Comenzar temporada {g.season + 1} ▸</button></div>
        </div>)}
      <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-end', marginBottom: -6 }}>
        {edit && <span className="dim sm grow">Ordená los mosaicos con ◂ ▸, cambiá su ancho o sacalos. Se guarda en este navegador.</span>}
        {edit && hidden.map(id => <button key={id} className="btn sm" onClick={() => setLay([...lay, { id, size: DEFAULT_SIZE[id] ?? 4 }])}>+ {tiles[id].name}</button>)}
        {edit && <button className="btn sm" onClick={() => setLay(DEFAULT_HOME)}>Restablecer</button>}
        <button className={`btn sm ${edit ? 'primary' : ''}`} onClick={() => setEdit(!edit)}>{edit ? 'Listo' : 'Personalizar inicio'}</button>
      </div>
      <div className="dash">
        {lay.filter(t => tiles[t.id]).map((t, i) => { const T = tiles[t.id]; return (
          <div key={t.id} className={`${T.hero ? 'hero' : 'card'} col tile s${t.size} ${edit ? 'editing' : ''}`} style={T.hero ? { gap: 16 } : undefined}>
            {edit && <div className="tile-tools">
              <button className="btn sm icon" title="Antes" disabled={i === 0} onClick={() => move(i, -1)}>◂</button>
              <button className="btn sm icon" title="Después" disabled={i === lay.length - 1} onClick={() => move(i, 1)}>▸</button>
              <button className="btn sm" title="Ancho" onClick={() => setLay(lay.map(x => x.id === t.id ? { ...x, size: SIZES[(SIZES.indexOf(x.size) + 1) % SIZES.length] } : x))}>{({ 4: 'Angosto', 5: 'Medio', 6: 'Mitad', 7: 'Ancho', 8: 'Más ancho', 12: 'Completo' } as Record<number, string>)[t.size] ?? t.size}</button>
              <button className="btn sm icon danger" title="Sacar" onClick={() => setLay(lay.filter(x => x.id !== t.id))}>✕</button>
            </div>}
            {T.render()}
          </div>) })}
      </div>
      {window.self === window.top && <div className="row between dim sm" style={{ padding: '0 4px' }}><span>La partida se guarda sola en este navegador.</span><button className="btn sm" onClick={() => exportGame(g)}>Exportar partida</button></div>}
      {report && <MatchReport g={g} f={report} onClose={() => setReport(null)} />}
      {scout && next && <ReportModal f={next} onClose={() => setScout(false)} onApply={p => { Object.assign(club.tactic, p); save(); refresh() }} />}
    </div>
  )
}

type Tile = { id: string; size: number }
const SIZES = [4, 5, 6, 7, 8, 12]
const DEFAULT_HOME: Tile[] = [{ id: 'next', size: 8 }, { id: 'board', size: 4 }, { id: 'table', size: 4 }, { id: 'form', size: 4 }, { id: 'todo', size: 4 }, { id: 'inbox', size: 7 }, { id: 'results', size: 5 }, { id: 'upcoming', size: 6 }, { id: 'champions', size: 6 }]
const DEFAULT_SIZE: Record<string, number> = Object.fromEntries(DEFAULT_HOME.map(t => [t.id, t.size]))
