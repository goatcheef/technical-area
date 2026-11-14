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
  const [newsI, setNewsI] = useState(0)
  const [ibf, setIbf] = useState<'all' | 'unread' | 'me'>('all')
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
  const lay = settings.homeV === 2 && settings.home ? settings.home : DEFAULT_HOME
  const [edit, setEdit] = useState(false)
  const setLay = (l: Tile[]) => setSettings({ ...settings, home: l, homeV: 2 })
  const move = (i: number, d: number) => { const l = [...lay], j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setLay(l) }
  const pend = pendingOf(g)
  const inbox = g.news.filter(n => n.me ?? n.clubId === club.id).slice(0, 7)
  const upcoming = g.fixtures.filter(f => !f.played && (f.home === club.id || f.away === club.id)).slice(0, 6)
  // datos para los mosaicos del portal
  const world = g.news.filter(n => !(n.me ?? n.clubId === club.id)).slice(0, 6)
  const news = world[newsI % Math.max(1, world.length)]
  const mineAll = g.fixtures.filter(f => f.home === club.id || f.away === club.id)
  const sched = [...mineAll.filter(f => f.played).slice(-3), ...mineAll.filter(f => !f.played).slice(0, 5)]
  const lastLeague = mine.filter(f => f.comp === comp).slice(-1)[0]
  const round = lastLeague ? g.fixtures.filter(f => f.comp === comp && f.date === lastLeague.date && f.played && f.id !== lastLeague.id) : []
  const ibList = g.news.filter(n => (n.me ?? n.clubId === club.id) && (ibf === 'all' || (ibf === 'unread' ? !n.read : !!n.act))).slice(0, 14)
  const tiles: Record<string, { name: string; hero?: boolean; render: () => ReactNode }> = {
    inbox: { name: 'Mensajes', render: () => <>
      <div className="row between"><h3>Mensajes</h3><button className="btn sm" onClick={() => go('inbox')}>Abrir bandeja</button></div>
      <div className="seg">{([['all', 'Todos'], ['unread', `Sin leer (${unreadOf(g)})`], ['me', 'Con acción']] as const).map(([k, l]) => <button key={k} className={ibf === k ? 'on' : ''} onClick={() => setIbf(k)}>{l}</button>)}</div>
      {pend.length > 0 && <button className="ib-pend" onClick={() => nav({ page: 'inbox', tab: 'pend' })}><span className="pdot">{pend.length}</span>Pendiente: {pendingText(pend)}</button>}
      <div className="msglist">{ibList.map((n, i) => (<div key={n.id}>
        {(i === 0 || ibList[i - 1].date !== n.date) && <div className="msg-day">{fmtDate(n.date)}</div>}
        <button className={`msg ${n.read ? '' : 'unread'}`} onClick={() => go('inbox')}>
          <span className="msg-ico" aria-hidden>{TAG_ICON[n.tag] ?? TAG_ICON.club}</span>
          <span className="grow" style={{ minWidth: 0 }}><span className="msg-from">{TAG_NAME[n.tag]}</span><span className="msg-t">{n.title}</span></span>
          {!n.read && <span className="msg-dot" aria-label="Sin leer" />}
        </button></div>))}
        {!ibList.length && <div className="dim sm" style={{ padding: 8 }}>No hay mensajes en esta vista.</div>}</div>
    </> },
    news: { name: 'Noticias', render: () => <>
      <div className="row between"><button className="linkish h3link" onClick={() => nav({ page: 'inbox', tab: 'all' })}>Noticias del fútbol <span aria-hidden>›</span></button>
        {world.length > 1 && <div className="row" style={{ gap: 4 }}><button className="btn sm icon" aria-label="Noticia anterior" onClick={() => setNewsI((newsI + world.length - 1) % world.length)}>‹</button><button className="btn sm icon" aria-label="Noticia siguiente" onClick={() => setNewsI((newsI + 1) % world.length)}>›</button></div>}</div>
      {news ? <div className="newsbody">
        <div className="grow col" style={{ gap: 8, minWidth: 0 }}><b className="news-t">{news.title}</b><p className="news-p">{news.body}</p><span className="dim sm">{fmtDate(news.date)}{news.clubId != null && g.clubs[news.clubId] ? ` · ${g.clubs[news.clubId].name}` : ''}</span></div>
        {news.clubId != null && g.clubs[news.clubId] && <div className="news-art"><Badge club={g.clubs[news.clubId]} size={84} /></div>}
      </div> : <div className="dim sm">Todavía no hay noticias del resto del fútbol.</div>}
      {world.length > 1 && <div className="news-dots" role="tablist" aria-label="Noticias">{world.map((_, i) => <button key={i} role="tab" aria-selected={i === newsI % world.length} aria-label={`Noticia ${i + 1}`} className={i === newsI % world.length ? 'on' : ''} onClick={() => setNewsI(i)} />)}</div>}
    </> },
    schedule: { name: 'Agenda de partidos', render: () => <>
      <div className="row between"><h3>Agenda de partidos</h3><button className="btn sm" onClick={() => go('calendar')}>Calendario</button></div>
      <div className="sched">{sched.map(f => { const home = f.home === club.id, o = g.clubs[home ? f.away : f.home]; const r = f.played ? res(f, club.id) : null
        return <button key={f.id} className={`sched-row ${f.played ? 'played' : ''}`} onClick={() => (f.played ? setReport(f) : go('calendar'))}>
          <span className="dim sched-d">{new Date(f.date + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' })}</span>
          <span className="sched-c">{COMP_CODE[f.comp] ?? f.comp}</span>
          <span className="row ell" style={{ gap: 6 }} data-cid={o.id}><Badge club={o} size={18} /><b>{(o.code ?? o.short).slice(0, 3).toUpperCase()}</b></span>
          <span className="dim">{f.neutral ? 'N' : home ? 'L' : 'V'}</span>
          {r ? <span className="row sched-r" style={{ gap: 6 }}><i className={`rdot ${r}`} aria-label={r === 'G' ? 'Ganado' : r === 'P' ? 'Perdido' : 'Empatado'} />{resultText(f)}</span> : <span className="dim sm ell">{f.stage.replace('Fecha ', 'F').replace(' de final', '')}</span>}
        </button> })}</div>
    </> },
    standings: { name: 'Tabla de la zona', render: () => <>
      <div className="row between"><h3>{g.comps[comp]?.name.replace(/ \d{4}$/, '')} · Zona {club.zone}</h3><button className="btn sm" onClick={() => go('tables')}>Posiciones</button></div>
      <table className="mini-table"><thead><tr><th>Pos</th><th>Equipo</th><th className="r">PJ</th><th className="r">Pts</th></tr></thead>
        <tbody>{table.map((r, i) => <tr key={r.clubId} className={r.clubId === club.id ? 'me' : ''}><td className={`num qual ${i < 8 ? 'q' : ''}`}>{i + 1}</td>
          <td><span className="clubpill" data-cid={r.clubId}><Badge club={g.clubs[r.clubId]} size={16} />{g.clubs[r.clubId].short}</span></td><td className="r num">{r.pj}</td><td className="r num"><b>{r.pts}</b></td></tr>)}</tbody></table>
      <div className="dim sm row" style={{ gap: 6 }}><i className="qbar" />Clasifican a los octavos</div>
    </> },
    round: { name: 'Última fecha', render: () => <>
      <div className="row between"><h3>Última fecha</h3>{lastLeague && <span className="dim sm">{lastLeague.stage} · {fmtDate(lastLeague.date)}</span>}</div>
      {round.length ? <div className="roundgrid">{round.slice(0, 14).map(f => <button key={f.id} className="roundrow" onClick={() => setReport(f)}>
        <span className="clubpill"><Badge club={g.clubs[f.home]} size={16} />{(g.clubs[f.home].code ?? g.clubs[f.home].short).slice(0, 3).toUpperCase()}</span><b className="num">{f.hg} - {f.ag}</b><span className="clubpill"><Badge club={g.clubs[f.away]} size={16} />{(g.clubs[f.away].code ?? g.clubs[f.away].short).slice(0, 3).toUpperCase()}</span></button>)}</div>
        : <div className="dim sm">Los resultados del resto de la fecha aparecen después de tu primer partido.</div>}
    </> },
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
        {edit && hidden.map(id => <button key={id} className="btn sm" onClick={() => setLay([...lay, { id, size: DEFAULT_SIZE[id] ?? 4, rows: DEFAULT_HOME.find(d => d.id === id)?.rows }])}>+ {tiles[id].name}</button>)}
        {edit && <button className="btn sm" onClick={() => setLay(DEFAULT_HOME)}>Restablecer</button>}
        <button className={`btn sm ${edit ? 'primary' : ''}`} onClick={() => setEdit(!edit)}>{edit ? 'Listo' : 'Personalizar inicio'}</button>
      </div>
      <div className="dash">
        {lay.filter(t => tiles[t.id]).map((t, i) => { const T = tiles[t.id]; return (
          <div key={t.id} className={`${T.hero ? 'hero' : 'card'} col tile s${t.size} ${edit ? 'editing' : ''}`} style={{ ...(T.hero ? { gap: 16 } : {}), ...(t.rows ? { gridRow: `span ${t.rows}` } : {}) }}>
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

type Tile = { id: string; size: number; rows?: number }
const SIZES = [4, 5, 6, 7, 8, 12]
const DEFAULT_HOME: Tile[] = [{ id: 'inbox', size: 4, rows: 3 }, { id: 'news', size: 5 }, { id: 'schedule', size: 3, rows: 2 }, { id: 'next', size: 5 }, { id: 'round', size: 5 }, { id: 'standings', size: 3, rows: 2 }, { id: 'form', size: 4 }, { id: 'todo', size: 5 }, { id: 'board', size: 4 }, { id: 'results', size: 4 }, { id: 'upcoming', size: 4 }, { id: 'table', size: 4 }, { id: 'champions', size: 4 }]
const DEFAULT_SIZE: Record<string, number> = Object.fromEntries(DEFAULT_HOME.map(t => [t.id, t.size]))

const COMP_CODE: Record<string, string> = { AP: 'APE', CL: 'CLA', PN: 'PN', T3: 'B', CA: 'CA', LIB: 'LIB', SUD: 'SUD' }
const TAG_NAME: Record<string, string> = { partido: 'Partido', torneo: 'Torneo', lesion: 'Parte médico', club: 'Club', mercado: 'Mercado', premio: 'Premio', directiva: 'Dirigencia' }
const ic = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
const TAG_ICON: Record<string, ReactNode> = {
  partido: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7l3 2-1 4h-4l-1-4z'), torneo: ic('M8 4h8v5a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M12 13v4M9 20h6'),
  lesion: ic('M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z'), club: ic('M16 20v-1a4 4 0 0 0-8 0v1M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1a3 3 0 0 0-2-2.8M4 20v-1a3 3 0 0 1 2-2.8'),
  mercado: ic('M4 7h13l-3-3M20 17H7l3 3'), premio: ic('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'), directiva: ic('M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6'),
}
