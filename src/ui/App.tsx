import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { takeJob, windowOpen } from '../engine/career'
import { advanceDay, advanceToMatch, fmtDate, nextUserFixture, refreshDb, userFixtureToday } from '../engine/game'
import type { Fixture, Game } from '../engine/types'
import { GameCtx, loadGame, loadSettings, saveGame, storeSettings, type Route, type Settings } from '../store'
import { Club } from './Club'
import { Badge, Face, ManagerFace, PosPill, Val, clubTheme } from './common'
import { ClubPage, CommandPalette, HoverCard, SettingsModal, ShortcutsHelp } from './Nav'
import { PlayerPage } from './PlayerPage'
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
  const [hist, setHist] = useState<{ stack: Route[]; i: number }>({ stack: [{ page: 'home' }], i: 0 })
  const [overlay, setOverlay] = useState<null | 'palette' | 'help' | 'settings'>(null)
  const [settings, setSettingsState] = useState<Settings>(loadSettings)
  const setSettings = (s: Settings) => { setSettingsState(s); storeSettings(s) }
  const route = hist.stack[hist.i], page = route.page
  // posición de scroll por entrada del historial: volver deja la pantalla donde estaba
  const mainRef = useRef<HTMLElement>(null), scrolls = useRef<Record<number, number>>({}), lastI = useRef(0)
  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    el.scrollTop = scrolls.current[hist.i] ?? 0
    lastI.current = hist.i
  }, [hist])
  const remember = () => { if (mainRef.current) scrolls.current[lastI.current] = mainRef.current.scrollTop }
  const nav = (r: Route) => { remember(); setHist(h => {
    const cur = h.stack[h.i]
    if (cur.page === r.page && cur.id === r.id && cur.tab === r.tab) return h
    // cambiar de pestaña dentro de la misma ficha reemplaza la entrada en lugar de apilarla
    const same = cur.page === r.page && cur.id === r.id && r.id != null
    const stack = [...h.stack.slice(0, same ? h.i : h.i + 1), r].slice(-60)
    if (!same) delete scrolls.current[stack.length - 1]
    return { stack, i: stack.length - 1 }
  }) }
  const back = () => { remember(); setHist(h => ({ ...h, i: Math.max(0, h.i - 1) })) }
  const fwd = () => { remember(); setHist(h => ({ ...h, i: Math.min(h.stack.length - 1, h.i + 1) })) }
  const setPage = (p: string) => nav({ page: p })
  const api = useRef<{ key: (e: KeyboardEvent) => void }>({ key: () => {} })
  useEffect(() => { document.documentElement.style.fontSize = `${(14 * settings.text) / 100}px` }, [settings.text])
  useEffect(() => {
    const key = (e: KeyboardEvent) => api.current.key(e)
    const mouse = (e: MouseEvent) => { if (e.button === 3) { e.preventDefault(); back() } else if (e.button === 4) { e.preventDefault(); fwd() } }
    window.addEventListener('keydown', key); window.addEventListener('mouseup', mouse)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('mouseup', mouse) }
  }, [])
  const [match, setMatch] = useState<Fixture | null>(null)
  const [q, setQ] = useState('')
  const [press, setPress] = useState(false)
  const [, refresh] = useReducer((x: number) => x + 1, 0)
  useEffect(() => { loadGame().then(s => setSaved(s && s.version === 6 ? s : null)) }, [])

  if (!g) return <Start saved={saved ?? null} onStart={game => { refreshDb(game); setG(game); setHist({ stack: [{ page: 'home' }], i: 0 }); saveGame(game) }} />
  const club = g.clubs[g.userClubId]
  const today = userFixtureToday(g), next = nextUserFixture(g)
  const opp = next ? g.clubs[next.home === club.id ? next.away : next.home] : null
  const ctx = { g, refresh, go: setPage, nav, back, openPlayer: (id: number) => nav({ page: 'player', id, tab: 'resumen' }), openClub: (id: number) => nav({ page: 'clubv', id, tab: 'plantel' }), save: () => saveGame(g), openPress: () => setPress(true), settings }
  // atajos de teclado (ver SHORTCUTS en Nav.tsx)
  api.current.key = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOverlay('palette'); return }
    if (e.key === 'Escape') { if (overlay) setOverlay(null); else if (!typing && (page === 'player' || page === 'clubv') && !document.querySelector('.modal')) back(); return }
    if (typing || match || overlay || document.querySelector('.modal')) return
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); return }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); fwd(); return }
    if (e.key === '/') { e.preventDefault(); setOverlay('palette'); return }
    if (e.key === '?') { setOverlay('help'); return }
    if (e.key === ' ') { e.preventDefault(); if (!g.seasonOver) advance(e.shiftKey); return }
    if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { const i = (Number(e.key) + 9) % 10; if (PAGES[i]) setPage(PAGES[i][0]) }
  }
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
      <div className={settings.density === 'compact' ? 'dense' : ''} style={{ height: '100%', ...theme }}>
        {match ? <MatchView fixture={match} onDone={() => { setMatch(null); setPage('home'); saveGame(g); if (g.press) setPress(true); refresh() }} /> : (
          <div className="shell">
            <aside className="side">
              <div className="brand">TECHNICAL <i>AREA</i></div>
              {PAGES.map(([id, label, icon], i) => <button key={id} className={`nav ${page === id ? 'on' : ''}`} title={i < 10 ? `Tecla ${(i + 1) % 10}` : ''} onClick={() => setPage(id)}>{icon}{label}{id === 'market' && g.offers.length > 0 && <span className="dot">{g.offers.length}</span>}</button>)}
              {(g.favs ?? []).length > 0 && <div className="favs"><div className="favs-h">Favoritos</div>{(g.favs ?? []).map(f => {
                const p = f.k === 'p' ? g.players[f.id] : undefined, c = f.k === 'c' ? g.clubs[f.id] : undefined
                if (!p && !c) return null
                return <button key={`${f.k}${f.id}`} data-pid={p?.id} data-cid={c?.id} className={`nav ${route.id === f.id && (page === 'player') === !!p ? 'on' : ''}`} onClick={() => (p ? ctx.openPlayer(p.id) : ctx.openClub(c!.id))}>{p ? <Face p={p} size={20} /> : <Badge club={c!} size={20} />}<span className="ell">{p ? p.name : c!.short}</span></button>
              })}</div>}
              <div className="sidefoot card" style={{ marginTop: 'auto', padding: 12 }}>
                <div className="row"><ManagerFace a={g.manager.avatar} size={38} /><div className="grow"><div className="ell"><b>{g.manager.name}</b></div><div className="dim sm">Prestigio {Math.round(g.manager.rep)}</div></div></div>
                <div className="row" style={{ marginTop: 10, gap: 6 }}><button className="btn sm grow" onClick={() => setOverlay('settings')}>Ajustes</button><button className="btn sm" title="Atajos de teclado (?)" onClick={() => setOverlay('help')}>?</button></div>
                <button className="btn sm" style={{ marginTop: 6, width: '100%' }} onClick={() => { saveGame(g); setSaved(g); setG(null) }}>Menú principal</button>
              </div>
            </aside>
            <header className="top">
              <div className="row" style={{ gap: 4 }}>
                <button className="btn sm icon" disabled={hist.i === 0} title="Atrás (Alt + ←)" aria-label="Atrás" onClick={back}>◂</button>
                <button className="btn sm icon" disabled={hist.i >= hist.stack.length - 1} title="Adelante (Alt + →)" aria-label="Adelante" onClick={fwd}>▸</button>
              </div>
              <button className="linkish" onClick={() => ctx.openClub(club.id)} title="Ficha del club"><Badge club={club} size={38} /></button>
              <div style={{ minWidth: 0 }}><div className="ell"><b>{club.name}</b></div><div className="dim ell sm">{fmtDate(g.date)} · {windowOpen(g.date) ? 'Libro de pases abierto' : `Temporada ${g.season}`}</div></div>
              <div className="searchbox" style={{ marginLeft: 12 }}>
                <input id="global-search" type="search" placeholder="Buscar jugador…" title="Para buscar también clubes, pantallas y acciones: Ctrl + K" value={q} onChange={e => setQ(e.target.value)} />
                {found.length > 0 && <div className="results">{found.map(p => (
                  <button key={p.id} data-pid={p.id} onClick={() => { ctx.openPlayer(p.id); setQ('') }}><Face p={p} club={g.clubs[p.clubId]} size={30} /><span className="grow ell"><b>{p.name}</b><br /><span className="dim sm">{g.clubs[p.clubId].short}</span></span><PosPill p={p} /><Val p={p} /></button>))}</div>}
              </div>
              <span className="grow" />
              {opp && next && !g.seasonOver && <div className="row topnext" style={{ gap: 8 }}><div className="dim right sm">{next.home === club.id ? 'Local vs' : 'Visitante en'} <b style={{ color: 'var(--text)' }}>{opp.short}</b><br />{fmtDate(next.date)} · {next.stage}</div><Badge club={opp} size={30} /></div>}
              {g.press && <button className="btn on" onClick={() => setPress(true)} title="Conferencia de prensa pendiente">Prensa</button>}
              {!today && !g.seasonOver && <button className="btn" title="Avanza día por día hasta el próximo partido. Se frena si hay una conferencia para responder." onClick={() => advance(true)}>Ir al partido ▸▸</button>}
              <button className="btn primary cta" disabled={g.seasonOver} title={today ? '' : 'Avanza un día'} onClick={() => advance()}>{g.seasonOver ? 'Fin de temporada' : today ? 'Jugar ▸' : 'Continuar ▸'}</button>
            </header>
            <main className="main" ref={mainRef}>
              {page === 'home' && <Home />}{page === 'squad' && <Squad />}{page === 'tactics' && <Tactics />}{page === 'market' && <Market />}
              {page === 'fixtures' && <Fixtures />}{page === 'tables' && <Tables />}{page === 'stats' && <Stats />}{page === 'club' && <Club />}{page === 'training' && <TrainingPage />}{page === 'calendar' && <CalendarPage />}{page === 'staff' && <StaffPage />}{page === 'locker' && <LockerPage />}
              {page === 'player' && route.id != null && <PlayerPage key={route.id} id={route.id} tab={route.tab} />}{page === 'clubv' && route.id != null && <ClubPage key={route.id} id={route.id} tab={route.tab} />}
            </main>
          </div>
        )}
        <HoverCard />
        {overlay === 'palette' && <CommandPalette pages={PAGES.map(([id, l]) => [id, l])} onClose={() => setOverlay(null)} actions={[
          ...(g.seasonOver ? [] : [{ label: today ? 'Jugar el partido' : 'Continuar un día', hint: 'Espacio', run: () => advance() }]),
          ...(today || g.seasonOver ? [] : [{ label: 'Ir al partido', hint: 'Mayús + Espacio', run: () => advance(true) }]),
          ...(g.press ? [{ label: 'Responder la conferencia de prensa', hint: 'Prensa', run: () => setPress(true) }] : []),
          { label: 'Ajustes', hint: 'Densidad, texto, partido', run: () => setOverlay('settings') }, { label: 'Atajos de teclado', hint: '?', run: () => setOverlay('help') },
        ]} />}
        {overlay === 'help' && <ShortcutsHelp onClose={() => setOverlay(null)} />}
        {overlay === 'settings' && <SettingsModal s={settings} onChange={setSettings} onClose={() => setOverlay(null)} />}
        {press && g.press && <PressModal onClose={() => setPress(false)} />}
      </div>
    </GameCtx.Provider>
  )
}
