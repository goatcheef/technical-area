import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { takeJob, windowOpen } from '../engine/career'
import { advanceDay, advanceToMatch, fmtDate, nextUserFixture, refreshDb, userFixtureToday } from '../engine/game'
import type { Fixture, Game } from '../engine/types'
import { GameCtx, loadGame, saveGame } from '../store'
import { Club } from './Club'
import { Badge, Face, ManagerFace, PlayerModal, PosPill, Val, clubTheme } from './common'
import { Home } from './Home'
import { Market } from './Market'
import { MatchView } from './MatchView'
import { Squad } from './Squad'
import { Start } from './Start'
import { Fixtures, Stats, Tables } from './Tables'
import { Tactics } from './Tactics'
import { LockerPage } from './Locker'
import { CalendarPage, PressModal, StaffPage, TrainingPage } from './Week'

const I = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
const PAGES: [string, string, ReactNode][] = [
  ['home', 'Inicio', I('M3 11l9-8 9 8M5 10v10h14V10')], ['squad', 'Plantel', I('M16 20v-1a4 4 0 0 0-8 0v1M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1a3 3 0 0 0-2-2.8M4 20v-1a3 3 0 0 1 2-2.8')],
  ['tactics', 'Tácticas', I('M4 4h16v16H4zM4 12h16M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5')], ['locker', 'Vestuario', I('M6 3h12v18H6zM12 3v18M9 12h1M14 12h1')], ['training', 'Entrenamiento', I('M4 12h3M17 12h3M7 8v8M17 8v8M7 12h10')], ['calendar', 'Calendario', I('M5 5h14v15H5zM5 10h14M9 3v4M15 3v4M9 14h2M13 14h2')],
  ['market', 'Mercado', I('M4 7h13l-3-3M20 17H7l3 3')], ['staff', 'Cuerpo técnico', I('M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20v-1a6 6 0 0 1 12 0v1M16 11l2 2 4-4')],
  ['fixtures', 'Fixture', I('M5 5h14v15H5zM5 10h14M9 3v4M15 3v4')], ['tables', 'Posiciones', I('M4 6h16M4 12h16M4 18h10')],
  ['stats', 'Estadísticas', I('M5 20V10M12 20V4M19 20v-7')], ['club', 'Club y DT', I('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z')],
]

export function App() {
  const [g, setG] = useState<Game | null>(null)
  const [saved, setSaved] = useState<Game | null | undefined>(undefined)
  const [page, setPage] = useState('home')
  const [player, setPlayer] = useState<number | null>(null)
  const [match, setMatch] = useState<Fixture | null>(null)
  const [q, setQ] = useState('')
  const [press, setPress] = useState(false)
  const [, refresh] = useReducer((x: number) => x + 1, 0)
  useEffect(() => { loadGame().then(s => setSaved(s && s.version === 5 ? s : null)) }, [])

  if (!g) return <Start saved={saved ?? null} onStart={game => { refreshDb(game); setG(game); setPage('home'); saveGame(game) }} />
  const club = g.clubs[g.userClubId]
  const today = userFixtureToday(g), next = nextUserFixture(g)
  const opp = next ? g.clubs[next.home === club.id ? next.away : next.home] : null
  const ctx = { g, refresh, go: setPage, openPlayer: setPlayer, save: () => saveGame(g), openPress: () => setPress(true) }
  const advance = (toMatch = false) => {
    if (today) { setMatch(today); return }
    const r = toMatch ? advanceToMatch(g) : advanceDay(g)
    saveGame(g)
    if (r === 'press' && g.press) setPress(true)
    refresh()
  }
  const ql = q.trim().toLowerCase()
  const found = ql.length >= 2 ? Object.values(g.players).filter(p => p.name.toLowerCase().includes(ql)).sort((a, b) => b.ca - a.ca).slice(0, 8) : []
  const theme = clubTheme(club) as object

  if (g.board.fired) return (
    <div className="main" style={{ height: '100%', ...theme }}><div className="page" style={{ maxWidth: 820, paddingTop: 40 }}>
      <div className="hero col"><h3>Fin de ciclo</h3><h1>{club.name} te despidió</h1>
        <p className="dim" style={{ lineHeight: 1.55 }}>La dirigencia perdió la confianza después de {g.manager.cur.g} triunfos, {g.manager.cur.e} empates y {g.manager.cur.p} derrotas. Tu carrera sigue: estos clubes quieren contratarte.</p></div>
      <div className="clubgrid">{g.board.offers.map(id => { const c = g.clubs[id]; return (
        <button key={id} className="clubcard" onClick={() => { takeJob(g, id); saveGame(g); setPage('home'); refresh() }}><Badge club={c} size={44} /><span className="grow"><b>{c.name}</b><br /><span className="dim sm">{c.division === 1 ? 'Liga Profesional' : 'Primera Nacional'} · Rep. {c.rep}</span></span></button>) })}</div>
    </div></div>)

  return (
    <GameCtx.Provider value={ctx}>
      <div style={{ height: '100%', ...theme }}>
        {match ? <MatchView fixture={match} onDone={() => { setMatch(null); setPage('home'); saveGame(g); if (g.press) setPress(true); refresh() }} /> : (
          <div className="shell">
            <aside className="side">
              <div className="brand">TECHNICAL <i>AREA</i></div>
              {PAGES.map(([id, label, icon]) => <button key={id} className={`nav ${page === id ? 'on' : ''}`} onClick={() => setPage(id)}>{icon}{label}{id === 'market' && g.offers.length > 0 && <span className="dot">{g.offers.length}</span>}</button>)}
              <div className="sidefoot card" style={{ marginTop: 'auto', padding: 12 }}>
                <div className="row"><ManagerFace a={g.manager.avatar} size={38} /><div className="grow"><div className="ell"><b>{g.manager.name}</b></div><div className="dim sm">Prestigio {Math.round(g.manager.rep)}</div></div></div>
                <button className="btn sm" style={{ marginTop: 10, width: '100%' }} onClick={() => { saveGame(g); setSaved(g); setG(null) }}>Menú principal</button>
              </div>
            </aside>
            <header className="top">
              <Badge club={club} size={38} />
              <div style={{ minWidth: 0 }}><div className="ell"><b>{club.name}</b></div><div className="dim ell sm">{fmtDate(g.date)} · {windowOpen(g.date) ? 'Libro de pases abierto' : `Temporada ${g.season}`}</div></div>
              <div className="searchbox" style={{ marginLeft: 12 }}>
                <input id="global-search" type="search" placeholder="Buscar jugador…" value={q} onChange={e => setQ(e.target.value)} />
                {found.length > 0 && <div className="results">{found.map(p => (
                  <button key={p.id} onClick={() => { setPlayer(p.id); setQ('') }}><Face p={p} club={g.clubs[p.clubId]} size={30} /><span className="grow ell"><b>{p.name}</b><br /><span className="dim sm">{g.clubs[p.clubId].short}</span></span><PosPill p={p} /><Val p={p} /></button>))}</div>}
              </div>
              <span className="grow" />
              {opp && next && !g.seasonOver && <div className="row topnext" style={{ gap: 8 }}><div className="dim right sm">{next.home === club.id ? 'Local vs' : 'Visitante en'} <b style={{ color: 'var(--text)' }}>{opp.short}</b><br />{fmtDate(next.date)} · {next.stage}</div><Badge club={opp} size={30} /></div>}
              {g.press && <button className="btn on" onClick={() => setPress(true)} title="Conferencia de prensa pendiente">Prensa</button>}
              {!today && !g.seasonOver && <button className="btn" title="Avanza día por día hasta el próximo partido. Se frena si hay una conferencia para responder." onClick={() => advance(true)}>Ir al partido ▸▸</button>}
              <button className="btn primary cta" disabled={g.seasonOver} title={today ? '' : 'Avanza un día'} onClick={() => advance()}>{g.seasonOver ? 'Fin de temporada' : today ? 'Jugar ▸' : 'Continuar ▸'}</button>
            </header>
            <main className="main">
              {page === 'home' && <Home />}{page === 'squad' && <Squad />}{page === 'tactics' && <Tactics />}{page === 'market' && <Market />}
              {page === 'fixtures' && <Fixtures />}{page === 'tables' && <Tables />}{page === 'stats' && <Stats />}{page === 'club' && <Club />}{page === 'training' && <TrainingPage />}{page === 'calendar' && <CalendarPage />}{page === 'staff' && <StaffPage />}{page === 'locker' && <LockerPage />}
            </main>
          </div>
        )}
        {player != null && <PlayerModal id={player} onClose={() => setPlayer(null)} />}
        {press && g.press && <PressModal onClose={() => setPress(false)} />}
      </div>
    </GameCtx.Provider>
  )
}
