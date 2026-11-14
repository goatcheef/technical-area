// Navegación de la etapa 1: ficha de club, ficha breve al pasar el mouse, barra de comandos, atajos y ajustes.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clubsIn, fmtDate, leagueFx, squadOf, tableOf } from '../engine/game'
import { ageOn, bestRating } from '../engine/positions'
import { knowOf } from '../engine/squad'
import type { Club, Game } from '../engine/types'
import { useGame, type Settings } from '../store'
import { Badge, Cond, Face, Modal, PosPill, Seg, Status, Val, avgRat, money, resultText } from './common'
import { FavButton } from './PlayerPage'
import { SquadTable } from './Squad'

export const DIV_NAME = ['Exterior', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A']
const leagueComp = (g: Game, c: Club) => (c.division === 1 ? (g.comps.AP?.phase === 'done' ? 'CL' : 'AP') : c.division === 2 ? 'PN' : c.division === 3 ? 'T3' : '')
function standing(g: Game, c: Club): string {
  const comp = leagueComp(g, c)
  if (!comp || !g.comps[comp]) return ''
  const t = tableOf(leagueFx(g, comp), clubsIn(g, c.division, c.zone))
  const i = t.findIndex(r => r.clubId === c.id)
  return i >= 0 ? `${i + 1}.º en la zona ${c.zone} (${t[i].pts} pts)` : ''
}
const formOf = (g: Game, id: number) => g.fixtures.filter(f => f.played && (f.home === id || f.away === id)).slice(-5).map(f => { const d = (f.home === id ? 1 : -1) * (f.hg - f.ag); return d > 0 ? 'G' : d < 0 ? 'P' : 'E' })
const FormChips = ({ f }: { f: string[] }) => <span className="row" style={{ gap: 3 }}>{!f.length && <span className="dim">Sin partidos</span>}{f.map((r, i) => <span key={i} className="chip" style={{ padding: '1px 7px', color: r === 'G' ? 'var(--good)' : r === 'P' ? 'var(--bad)' : 'var(--dim)' }}>{r}</span>)}</span>

// ---------- ficha de club ----------
export function ClubPage({ id, tab = 'plantel' }: { id: number; tab?: string }) {
  const { g, nav, back, openPlayer } = useGame()
  const c = g.clubs[id]
  if (!c) return null
  const sq = squadOf(g, id), mine = id === g.userClubId
  const fx = g.fixtures.filter(f => f.home === id || f.away === id)
  const TABS: [string, string][] = [['plantel', 'Plantel'], ['partidos', 'Partidos'], ['club', 'El club']]
  const best = [...sq].sort((a, b) => b.ca - a.ca).slice(0, 3)
  return (
    <div className="page">
      <div className="hero row wrap" style={{ gap: 22 }}>
        <Badge club={c} size={96} />
        <div className="grow"><h3>{DIV_NAME[c.division]}{c.division ? ` · Zona ${c.zone}` : ` · ${c.country ?? ''}`}</h3><h1 style={{ marginTop: 4 }}>{c.name}</h1>
          <div className="dim">{c.city}{c.stadium ? ` · ${c.stadium}` : ''}{c.capacity ? ` · ${c.capacity.toLocaleString('es-AR')} espectadores` : ''}</div>
          <div className="dim sm" style={{ marginTop: 4 }}>DT: {c.manager} · {standing(g, c) || 'sin torneo de liga en curso'}</div></div>
        <div className="kpi"><h3>Reputación</h3><b>{c.rep}</b></div>
        <div className="kpi"><h3>Forma</h3><FormChips f={formOf(g, id)} /></div>
        <div className="col" style={{ gap: 6 }}><button className="btn sm" onClick={back}>◂ Atrás</button>{!mine && <FavButton k="c" id={id} />}</div>
      </div>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => nav({ page: 'clubv', id, tab: k })}>{l}</button>)}</div>
      {tab === 'plantel' && <SquadTable clubId={id} />}
      {tab === 'partidos' && <div className="card scroll-x"><table>
        <thead><tr><th>Fecha</th><th>Torneo</th><th>Instancia</th><th>Rival</th><th className="c">Resultado</th></tr></thead>
        <tbody>{fx.map(f => { const home = f.home === id, o = g.clubs[home ? f.away : f.home]; return (
          <tr key={f.id}><td className="dim">{fmtDate(f.date)}</td><td className="dim sm">{g.comps[f.comp]?.name}</td><td className="dim sm">{f.stage}</td>
            <td><button className="linkish row" onClick={() => nav({ page: 'clubv', id: o.id })}><Badge club={o} size={20} />{home ? 'vs' : 'en'} {o.name}</button></td>
            <td className="c num"><b>{f.played ? resultText(f) : '–'}</b></td></tr>) })}</tbody></table></div>}
      {tab === 'club' && <div className="dash">
        <div className="card s4 col"><h3>Plantel</h3>
          <div className="row between"><span className="dim">Jugadores</span><b>{sq.length}</b></div>
          <div className="row between"><span className="dim">Edad media</span><b>{(sq.reduce((s, p) => s + ageOn(p.birth, g.date), 0) / Math.max(1, sq.length)).toFixed(1)}</b></div>
          <div className="row between"><span className="dim">Valor</span><b>{money(sq.reduce((s, p) => s + p.value, 0))}</b></div></div>
        <div className="card s4 col"><h3>Figuras</h3>{best.map(p => <button key={p.id} className="linkish row" data-pid={p.id} onClick={() => openPlayer(p.id)}><Face p={p} size={28} /><span className="grow ell">{p.name}</span><Val p={p} /></button>)}</div>
        <div className="card s4 col"><h3>Palmarés en tu carrera</h3>{g.honours.filter(h => h.clubId === id).length ? g.honours.filter(h => h.clubId === id).map((h, i) => <div key={i} className="chip acc">🏆 {h.comp}</div>) : <div className="dim sm">Sin títulos desde que empezó tu carrera.</div>}</div>
      </div>}
    </div>
  )
}

// ---------- ficha breve al pasar el mouse ----------
/** Cualquier elemento con data-pid o data-cid muestra una ficha breve al dejar el mouse encima. */
export function HoverCard() {
  const { g, openClub } = useGame()
  const open = useRef(openClub)
  open.current = openClub
  const [hc, setHc] = useState<{ k: 'p' | 'c'; id: number; x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const over = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-pid],[data-cid]') as HTMLElement | null
      clearTimeout(timer.current)
      if (!el) { setHc(null); return }
      const pid = el.dataset.pid, cid = el.dataset.cid
      timer.current = setTimeout(() => {
        const r = el.getBoundingClientRect()
        const x = Math.min(window.innerWidth - 330, Math.max(8, r.left)), below = r.bottom + 220 < window.innerHeight
        setHc({ k: pid ? 'p' : 'c', id: Number(pid ?? cid), x, y: below ? r.bottom + 6 : Math.max(8, r.top - 226) })
      }, 380)
    }
    const hide = () => { clearTimeout(timer.current); setHc(null) }
    // escudos y nombres de club sueltos llevan a la ficha del club; si están dentro de algo clickeable, manda ese clic
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement, el = t?.closest?.('[data-cid]') as HTMLElement | null
      if (!el || e.button !== 0 || t.closest('button, a, input, select, .click, [data-pid], .hovercard, .modal-bg')) return
      open.current(Number(el.dataset.cid))
    }
    document.addEventListener('click', click)
    document.addEventListener('mouseover', over); document.addEventListener('scroll', hide, true); document.addEventListener('mousedown', hide)
    return () => { document.removeEventListener('mouseover', over); document.removeEventListener('scroll', hide, true); document.removeEventListener('mousedown', hide); document.removeEventListener('click', click) }
  }, [])
  if (!hc) return null
  let body: ReactNode = null
  if (hc.k === 'p') {
    const p = g.players[hc.id]
    if (!p) return null
    const c = g.clubs[p.clubId], mine = p.clubId === g.userClubId, k = knowOf(g, p)
    body = (<>
      <div className="row"><Face p={p} size={40} /><div className="grow" style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block' }}>{p.name}</b><span className="dim sm row" style={{ gap: 5 }}><Badge club={c} size={16} />{c.short} · {ageOn(p.birth, g.date)} años · {p.nat}</span></div><Val p={p} /></div>
      <div className="row wrap" style={{ gap: 5 }}><PosPill p={p} /><Status p={p} /></div>
      <div className="hc-grid">
        <span className="dim">Temporada</span><span>{p.stats.apps + p.stats.subs} PJ · {p.stats.goals} G · {p.stats.ast} A · {avgRat(p.stats)}</span>
        <span className="dim">Contrato</span><span>{money(p.wage)}/mes · dic {p.contractEnd}</span>
        <span className="dim">Valor</span><span>{money(p.value)}</span>
        {mine ? <><span className="dim">Físico</span><Cond v={p.cond} /><span className="dim">Moral</span><Cond v={p.morale} /></> : <><span className="dim">Conocimiento</span><span>{Math.round(k)} %</span></>}
      </div>
      <span className="dim" style={{ fontSize: '.72rem' }}>Clic para ver la ficha completa</span>
    </>)
  } else {
    const c = g.clubs[hc.id]
    if (!c) return null
    body = (<>
      <div className="row"><Badge club={c} size={40} /><div className="grow" style={{ minWidth: 0 }}><b className="ell" style={{ display: 'block' }}>{c.name}</b><span className="dim sm">{DIV_NAME[c.division]}{c.division ? ` · Zona ${c.zone}` : ''}</span></div></div>
      <div className="hc-grid">
        <span className="dim">Posición</span><span>{standing(g, c) || '–'}</span>
        <span className="dim">Forma</span><FormChips f={formOf(g, c.id)} />
        <span className="dim">DT</span><span className="ell">{c.manager}</span>
        <span className="dim">Estadio</span><span className="ell">{c.stadium || '–'}</span>
        <span className="dim">Reputación</span><span>{c.rep}</span>
      </div>
    </>)
  }
  return <div className="hovercard" style={{ left: hc.x, top: hc.y }}>{body}</div>
}

// ---------- barra de comandos ----------
export interface Command { label: string; hint?: string; run: () => void; icon?: ReactNode }
export function CommandPalette({ pages, actions, onClose }: { pages: [string, string][]; actions: Command[]; onClose: () => void }) {
  const { g, go, openPlayer, openClub } = useGame()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const ql = q.trim().toLowerCase()
  const items: Command[] = []
  const match = (s: string) => !ql || s.toLowerCase().includes(ql)
  for (const a of actions) if (match(a.label)) items.push(a)
  pages.forEach(([id, l], i) => { if (match(l)) items.push({ label: l, hint: i < 10 ? `Pantalla · tecla ${(i + 1) % 10}` : 'Pantalla', run: () => go(id) }) })
  if (ql.length >= 2) {
    Object.values(g.clubs).filter(c => c.name.toLowerCase().includes(ql) || c.short.toLowerCase().includes(ql)).slice(0, 5).forEach(c => items.push({ label: c.name, hint: `Club · ${DIV_NAME[c.division]}`, run: () => openClub(c.id), icon: <Badge club={c} size={20} /> }))
    Object.values(g.players).filter(p => p.name.toLowerCase().includes(ql)).sort((a, b) => b.ca - a.ca).slice(0, 8).forEach(p => items.push({ label: p.name, hint: `Jugador · ${g.clubs[p.clubId]?.short}`, run: () => openPlayer(p.id), icon: <Face p={p} size={22} /> }))
  }
  const run = (c?: Command) => { if (!c) return; onClose(); c.run() }
  return (
    <div className="modal-bg" style={{ alignItems: 'flex-start', paddingTop: '12vh' }} onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <input id="palette-input" autoFocus placeholder="Buscá un jugador, un club, una pantalla o una acción…" value={q}
          onChange={e => { setQ(e.target.value); setSel(0) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(Math.min(items.length - 1, sel + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(Math.max(0, sel - 1)) }
            else if (e.key === 'Enter') { e.preventDefault(); run(items[sel]) }
            else if (e.key === 'Escape') onClose()
          }} />
        <div className="palette-list">{items.slice(0, 14).map((c, i) => (
          <button key={`${c.label}-${i}`} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
            <span className="row" style={{ gap: 10, minWidth: 0 }}>{c.icon}<span className="ell">{c.label}</span></span><span className="dim sm">{c.hint}</span></button>))}
          {!items.length && <div className="dim sm" style={{ padding: 12 }}>No hay coincidencias.</div>}</div>
        <div className="dim sm palette-foot">↑ ↓ para moverte · Enter para abrir · Esc para cerrar</div>
      </div>
    </div>
  )
}

// ---------- atajos y ajustes ----------
export const SHORTCUTS: [string, string][] = [
  ['Espacio', 'Continuar un día (o jugar, si hay partido)'], ['Mayús + Espacio', 'Ir al partido'], ['Ctrl + K  o  /', 'Barra de comandos: buscar y saltar a cualquier lado'],
  ['1 a 9, 0', 'Pantallas de la barra lateral, en orden'], ['Alt + ←  /  Alt + →', 'Atrás y adelante (también los botones laterales del mouse)'], ['Esc', 'Cerrar o volver de una ficha'], ['?', 'Esta ayuda'],
  ['En el partido: Espacio', 'Pausar o reanudar'], ['En el partido: 1 a 4', 'Velocidad (pausa, normal, rápido, muy rápido)'], ['En el partido: M', 'Partido completo o jugadas clave'],
  ['En el partido: C, T, R', 'Mi equipo (cambios), táctica, rival'], ['En el partido: P', 'Elegir los paneles'], ['En el partido: Esc', 'Cancelar el cambio o la orden en curso'],
]
export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return <Modal onClose={onClose}><div className="row between" style={{ marginBottom: 12 }}><h2>Atajos de teclado</h2><button className="btn sm" onClick={onClose}>Cerrar</button></div>
    <table><tbody>{SHORTCUTS.map(([k, d]) => <tr key={k}><td><span className="kbd">{k}</span></td><td>{d}</td></tr>)}</tbody></table></Modal>
}
export function SettingsModal({ s, onChange, onClose }: { s: Settings; onChange: (s: Settings) => void; onClose: () => void }) {
  return <Modal onClose={onClose}>
    <div className="row between" style={{ marginBottom: 14 }}><h2>Ajustes</h2><button className="btn sm" onClick={onClose}>Listo</button></div>
    <div className="col" style={{ gap: 16 }}>
      <div><h3 style={{ marginBottom: 6 }}>Densidad</h3><Seg value={s.density === 'compact' ? 1 : 0} options={['Cómoda', 'Compacta']} onChange={v => onChange({ ...s, density: v ? 'compact' : 'comfy' })} /><div className="dim sm" style={{ marginTop: 4 }}>Compacta muestra más filas por pantalla.</div></div>
      <div><h3 style={{ marginBottom: 6 }}>Tamaño de texto</h3><Seg value={[90, 100, 110, 120].indexOf(s.text)} options={['Chico', 'Normal', 'Grande', 'Muy grande']} onChange={v => onChange({ ...s, text: [90, 100, 110, 120][v] })} /></div>
      <div><h3 style={{ marginBottom: 6 }}>Velocidad del partido</h3><Seg value={Math.max(0, [1, 2, 5].indexOf(s.matchSpeed))} options={['Normal', 'Rápido', 'Muy rápido']} onChange={v => onChange({ ...s, matchSpeed: [1, 2, 5][v] })} /><div className="dim sm" style={{ marginTop: 4 }}>La que se usa al darle play con Espacio. El partido siempre arranca en pausa para la charla previa.</div></div>
      <div><h3 style={{ marginBottom: 6 }}>Modo de partido</h3><Seg value={s.matchMode === 'key' ? 1 : 0} options={['Partido completo', 'Jugadas clave']} onChange={v => onChange({ ...s, matchMode: v ? 'key' : 'full' })} /></div>
      <div className="dim sm">Los ajustes se guardan en este navegador.</div>
    </div>
  </Modal>
}
export { bestRating }
