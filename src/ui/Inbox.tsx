// Bandeja de entrada (design/ux/bandeja.md): arriba lo que hay que decidir, abajo la correspondencia por día; cada mensaje trae sus botones.
// La pantalla no escribe en `g`: llama al motor (markRead, acceptOffer, haggle, rejectJob, setListed…), guarda y refresca.
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as RKey, type ReactNode } from 'react'
import { acceptJob, acceptOffer, divName, haggle, jobConsequences, offerDeadline, rejectJob, rejectOffer, windowOpen } from '../engine/career'
import { clubsIn, fmtDate, injuryOutlook, isMine, leagueFx, markRead, nextUserFixture, squadOf, tableOf } from '../engine/game'
import { pendingKeyOf, pendingOf, type Pending } from '../engine/inbox'
import { POS_NAME, ageOn } from '../engine/positions'
import { STATUS, demand, minutesShare, naturalStatusFor, persLabels, setListed, toggleShortlist } from '../engine/squad'
import { ATTRS, ATTR_LABEL, type Club, type Fixture, type Game, type News, type Offer, type StaffRole } from '../engine/types'
import { delegatePress, scoutReport } from '../engine/week'
import { useGame, useSticky, type Route } from '../store'
import { Badge, Face, MatchReport, PosPill, Status, Val, attrClass, money } from './common'
import { PageTip } from './Guide'
import { DayHead, IC, MsgBody, TAG_ICON, TAG_NAME, daysUntil, shortDay } from './msg'
import { ReportModal } from './Week'

// ---------- vistas: alcance y tema ----------
const TOPICS: [string, string][] = [['todo', 'Todo'], ['plantel', 'Plantel'], ['mercado', 'Mercado'], ['partidos', 'Partidos'], ['torneos', 'Torneos'], ['dirigencia', 'Dirigencia']]
/** Valores viejos de `tab` (botón de pendientes, freno del avance, enlaces del Inicio). */
const OLD: Record<string, string> = { pend: 'club.todo', me: 'club.todo', all: 'futbol.todo', plantel: 'club.plantel', mercado: 'club.mercado', partido: 'club.partidos', torneo: 'club.torneos' }
function parseTab(t?: string): ['club' | 'futbol', string] | null {
  if (!t) return null
  const [s, k] = (OLD[t] ?? t).split('.')
  return (s === 'club' || s === 'futbol') && TOPICS.some(x => x[0] === k) ? [s, k] : null
}
function inTopic(t: string, n: News): boolean {
  if (t === 'plantel') return n.tag === 'lesion' || (n.tag === 'club' && n.pid != null) || n.act === 'out' || n.act === 'train'
  if (t === 'mercado') return n.tag === 'mercado'
  if (t === 'partidos') return n.tag === 'partido' || n.act === 'rival'
  if (t === 'torneos') return n.tag === 'torneo' || n.tag === 'premio'
  if (t === 'dirigencia') return n.tag === 'directiva'
  return true
}
const EMPTY: Record<string, string> = {
  todo: 'Todavía no llegó nada. Los mensajes del cuerpo técnico, la dirigencia y el mercado van a aparecer acá a medida que pasen los días.',
  plantel: 'Sin novedades del plantel. Acá llegan las lesiones, los pedidos de los jugadores y los informes de entrenamiento.',
  mercado: 'Todavía no hay mensajes de mercado de tu club. Acá llegan las ofertas por tus jugadores y los informes del scouting.',
  partidos: 'Los resultados y el informe del próximo rival llegan acá; el informe, unos días antes del partido.',
  torneos: 'Las noticias de tus torneos y los premios aparecen acá.',
  dirigencia: 'Acá llegan los mensajes de la dirigencia y las ofertas de otros clubes.',
}
const STAFF_PHRASE: Record<StaffRole, string> = { asst: 'el ayudante de campo', fit: 'el preparador físico', doc: 'el médico', scout: 'el scouting', youth: 'las inferiores' }
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Resalta el término buscado en negrita (no solo color). */
function hl(text: string, q: string): ReactNode {
  if (!q) return text
  const chars = [...text], low = chars.map(c => norm(c)).join('')
  if (low.length !== chars.length) return text
  const i = low.indexOf(q)
  return i < 0 ? text : <>{chars.slice(0, i).join('')}<mark>{chars.slice(i, i + q.length).join('')}</mark>{chars.slice(i + q.length).join('')}</>
}
function leaguePos(g: Game, c: Club): number | null {
  if (!c.division) return null
  const comp = c.division === 1 ? (g.comps.AP?.phase === 'done' ? 'CL' : 'AP') : c.division === 3 ? 'T3' : 'PN'
  const i = tableOf(leagueFx(g, comp), clubsIn(g, c.division, c.zone)).findIndex(r => r.clubId === c.id)
  return i < 0 ? null : i + 1
}

// ---------- filas ----------
type DueT = { text: string; short?: boolean; none?: boolean }
type RowDesc = { kind: string; who?: string; title: string; due: DueT }
type Item = { key: string; p?: Pending; n?: News; ghost?: boolean }
type Tone = 'ok' | 'warn' | 'err'
type Flash = { key: string; text: string; tone: Tone; resolved: boolean; saveErr?: boolean }

function dueOf(deadline: string, today: string, row: boolean): DueT {
  const n = daysUntil(deadline, today), d = shortDay(deadline, today).replace(/^\S+ /, '')
  if (n <= 0) return { text: 'Vence hoy', short: true }
  if (n === 1) return { text: row ? `Vence mañana · el ${d}` : `Vence mañana (el ${d})`, short: true }
  return { text: row ? `Vence en ${n} días · el ${d}` : `Vence en ${n} días (el ${d})` }
}
const Due = ({ d }: { d: DueT }) => <span className={`ib-due ${d.short ? 'short' : ''}`}>{d.none ? null : d.short ? IC.bang : IC.clock}{d.text}</span>

function pendDesc(g: Game, p: Pending): RowDesc {
  if (p.k === 'offer') { const pl = g.players[p.o.pid]; return { kind: 'Oferta', who: p.o.fromName, title: `${p.o.fromName} ofrece ${money(p.o.fee)} por ${pl?.name ?? 'un jugador'}`, due: dueOf(p.deadline, g.date, true) } }
  if (p.k === 'job') { const c = g.clubs[p.clubId]; return { kind: 'Oferta de trabajo', who: c?.name, title: p.kind === 'season' ? `${c?.name} te ofrece dirigir` : `${c?.name} te quiere como DT`, due: p.kind === 'season' ? { text: 'Antes de comenzar la próxima temporada' } : dueOf(p.deadline, g.date, true) } }
  if (p.k === 'out') { const pl = g.players[p.pid]; return { kind: 'Vestuario', who: pl?.name, title: `${pl?.name ?? 'Un jugador'} quiere irse`, due: { text: 'No vence', none: true } } }
  if (p.k === 'press') { const pre = g.press?.kind === 'pre'; return { kind: 'Prensa', title: pre ? 'Conferencia previa al partido' : 'Conferencia después del partido', due: { text: pre ? 'Antes del partido' : 'Si no respondés, habla el ayudante', none: true } } }
  return { kind: 'Temporada', title: `Terminó la temporada ${g.season}`, due: { text: 'Comenzá la próxima desde el inicio', none: true } }
}
const PEND_TOPIC: Record<Pending['k'], string> = { offer: 'Mercado', job: 'Dirigencia', out: 'Vestuario', press: 'Prensa', season: 'Temporada' }

function useNarrow() {
  const q = '(max-width: 900px)'
  const [v, setV] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q), f = () => setV(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return v
}
/** Entradas del historial que abrieron el detalle desde la lista (≤ 900 px): "◂ Bandeja" vuelve atrás en lugar de reemplazar. */
const pushed = new WeakSet<Route>()
/** El último mensaje abierto: al volver del detalle, el foco va a su fila. */
let lastOpened: string | null = null
/** Desplazamiento de la lista por vista (`club.todo`…): al volver de una ficha la lista queda donde estaba. */
const listScroll: Record<string, number> = {}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// ---------- pantalla ----------
export function Inbox({ busy = false }: { tab?: string; busy?: boolean }) {
  const { g, route, refresh, save, nav, back } = useGame()
  const narrow = useNarrow()
  const [stTab, setStTab] = useSticky('ib.tab', 'club.todo')
  const [scope, topic] = parseTab(route.tab) ?? parseTab(stTab) ?? ['club', 'todo']
  const tab = `${scope}.${topic}`
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [shown, setShown] = useState(150)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [marked, setMarked] = useState<number[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  /** Fila con el foco sin estar elegida (escritorio): la última después de "Mostrar más". La próxima elección la borra. */
  const [peek, setPeek] = useState<string | null>(null)
  const [live, setLive] = useState('')
  const focusReq = useRef<null | { to: 'row' | 'primary' | 'next' | 'title' | 'scope'; key?: string }>(null)
  const snap = useRef<Record<string, { p: Pending; d: RowDesc; i: number }>>({})
  const pressWatch = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null), boxRef = useRef<HTMLDivElement>(null), readRef = useRef<HTMLDivElement>(null), searchRef = useRef<HTMLInputElement>(null)
  const uid = useId().replace(/:/g, '')

  // lo pendiente, más la decisión elegida que acaba de desaparecer (resuelta acá o en otro lado), en su lugar
  const pend = pendingOf(g), pendKeys = new Set(pend.map(p => p.key))
  pend.forEach((p, i) => (snap.current[p.key] = { p, d: pendDesc(g, p), i }))
  const routeSel = route.sel
  const block: Item[] = pend.map(p => ({ key: p.key, p }))
  for (const k of [routeSel, flash?.key]) if (k && !pendKeys.has(k) && snap.current[k] && !block.some(b => b.key === k)) block.splice(Math.min(snap.current[k].i, block.length), 0, { key: k, p: snap.current[k].p, ghost: true })

  const qn = q.trim().length >= 2 ? norm(q.trim()) : ''
  const own = (n: News) => isMine(g, n)
  const openDec = (n: News) => { const k = pendingKeyOf(n); return !!k && pendKeys.has(k) }
  const countable = (n: News) => !n.read && own(n) && !openDec(n)
  const base = scope === 'club' ? g.news.filter(own) : g.news
  const matches = (n: News) => !qn || [n.title, n.body, n.pid != null ? g.players[n.pid]?.name : '', n.clubId != null ? g.clubs[n.clubId]?.name : ''].some(s => !!s && norm(s).includes(qn))
  const view = base.filter(n => inTopic(topic, n) && matches(n))
  // la selección (o la fila que se leía en el celular) puede estar más abajo de lo cargado, por ejemplo al volver de una ficha: se carga hasta ella
  const want = routeSel ?? (narrow ? lastOpened : null), wantAt = want?.[0] === 'n' ? view.findIndex(n => `n${n.id}` === want) : -1
  const upto = Math.max(shown, Math.ceil((wantAt + 1) / 150) * 150)
  const page = view.slice(0, upto)
  const cnt = (t: string) => (scope === 'club' ? base.reduce((s, n) => s + (inTopic(t, n) && countable(n) ? 1 : 0), 0) : 0)
  const keys = [...block.map(b => b.key), ...page.map(n => `n${n.id}`)]
  const has = (k?: string | null): k is string => !!k && keys.includes(k)

  // selección: la de la ruta; si no (escritorio), la primera decisión, el primer sin leer o el primero. La automática no marca leído.
  const firstUnread = page.find(n => !n.read && own(n))
  const active: string | null = has(routeSel) ? routeSel : narrow ? null : pend[0]?.key ?? (firstUnread ? `n${firstUnread.id}` : keys[0] ?? null)
  const itemOf = (k: string): Item | null => {
    if (k[0] === 'n') { const n = g.news.find(x => x.id === +k.slice(1)); return n ? { key: k, n } : null }
    return block.find(b => b.key === k) ?? null
  }
  const cur = narrow ? (has(cursor) ? cursor : lastOpened && has(lastOpened) ? lastOpened : keys[0]) : has(peek) ? peek : active ?? keys[0]

  const pick = (k: string, focus?: 'row' | 'primary' | 'title') => {
    setFlash(null); setMarked(null); setPeek(null)
    if (k[0] === 'n') { const n = g.news.find(x => x.id === +k.slice(1)); if (n && !n.read && own(n)) { markRead(g, [n.id], true); save() } }
    lastOpened = k; setCursor(k)
    const r: Route = { page: 'inbox', tab, sel: k }
    if (narrow && (!routeSel || pushed.has(route))) pushed.add(r)
    focusReq.current = focus ? { to: focus, key: k } : narrow ? { to: 'title' } : null
    nav(r); refresh()
  }
  const setTab = (t: string) => { setStTab(t); setShown(150); setPeek(null); nav({ page: 'inbox', tab: t, sel: routeSel }) }
  const pin = () => { if (active && routeSel !== active) nav({ page: 'inbox', tab, sel: active }) }
  /** Una acción del motor sobre una decisión: guarda, deja la nota de resultado y, si quedó resuelta, el estado "Resuelto". */
  const run = (key: string, fn: () => { text: string; tone?: Tone; resolved?: boolean }) => {
    const r = fn()
    // si el guardado falla, la nota de la decisión suma el aviso (la decisión ya quedó hecha en memoria)
    save().then(ok => { if (!ok) setFlash(f => (f && f.key === key ? { ...f, saveErr: true } : f)) })
    const resolved = r.resolved !== false, left = pendingOf(g).filter(p => p.key !== key).length
    setFlash({ key, text: r.text + (resolved && !left ? ' Nada para decidir. Podés seguir con Continuar.' : ''), tone: r.tone ?? 'ok', resolved })
    pin()
    if (resolved) focusReq.current = { to: 'next' }
    refresh()
  }
  const nextPend = pend.find(p => p.key !== flash?.key)
  const backToList = () => { if (pushed.has(route)) back(); else nav({ page: 'inbox', tab }) }

  // la conferencia se responde en su ventana: al cerrarla respondida, la decisión pasa a "Resuelto"
  useEffect(() => {
    const k = pressWatch.current
    if (k && !pendKeys.has(k) && !g.press) { pressWatch.current = null; setFlash({ key: k, text: `Respondiste la conferencia.${pend.length ? '' : ' Nada para decidir. Podés seguir con Continuar.'}`, tone: 'ok', resolved: true }); focusReq.current = { to: 'next' } }
  })
  // foco pedido por la última acción (fila, botón primario, siguiente pendiente, título del detalle)
  useEffect(() => {
    const r = focusReq.current
    if (!r) return
    focusReq.current = null
    const read = readRef.current
    let el: HTMLElement | null | undefined = null
    if (r.to === 'row') el = listRef.current?.querySelector<HTMLElement>(`[data-k="${r.key}"]`)
    else if (r.to === 'scope') el = document.querySelector<HTMLElement>('.ib-filters button[aria-pressed=true]')
    else if (r.to === 'next') el = read?.querySelector<HTMLElement>('[data-next]') ?? read?.querySelector<HTMLElement>('.ib-result')
    else if (r.to === 'title') el = read?.querySelector<HTMLElement>('.ib-h')
    else el = read?.querySelector<HTMLElement>('[data-primary]:not(:disabled)') ?? read?.querySelector<HTMLElement>('.ib-acts button:not(:disabled)') ?? read?.querySelector<HTMLElement>('.ib-h')
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }) }
  })
  // al entrar: foco en la fila elegida (o en el alcance si no hay nada); al volver del detalle, en la fila que se leía
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current && !narrow) return
    mounted.current = true
    focusReq.current ??= narrow && routeSel ? { to: 'title' } : cur ? { to: 'row', key: cur } : { to: 'scope' }
    if (boxRef.current && listScroll[tab] != null) boxRef.current.scrollTop = listScroll[tab]
    refresh()
  }, [narrow, !!routeSel])
  // región de estado: cambio de vista y búsqueda
  const topicName = TOPICS.find(t => t[0] === topic)![1]
  const unreadView = view.filter(n => !n.read && own(n))
  useEffect(() => {
    const t = setTimeout(() => setLive(qn ? (view.length ? `${plural(view.length, 'mensaje', 'mensajes')} con «${q.trim()}».` : `Ningún mensaje contiene «${q.trim()}» en esta vista.`) : `${scope === 'club' ? 'Mi club' : 'Todo el fútbol'}, ${topicName}. ${plural(view.length, 'mensaje', 'mensajes')}, ${unreadView.length} sin leer.`), qn ? 500 : 0)
    return () => clearTimeout(t)
  }, [tab, qn])

  const onListKey = (e: RKey<HTMLDivElement>) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !keys.length) return
    const i = Math.max(0, keys.indexOf(cur ?? keys[0]))
    let j: number
    switch (e.key) {
      case 'ArrowDown': j = i + 1; break
      case 'ArrowUp': j = i - 1; break
      case 'Home': j = 0; break
      case 'End': j = keys.length - 1; break
      case 'PageDown': j = i + 10; break
      case 'PageUp': j = i - 10; break
      case 'Enter': {
        e.preventDefault()
        if (narrow || cur !== active) { pick(cur!, narrow ? 'title' : 'primary'); return }
        // Enter sobre el elegido automáticamente lo abre a propósito: cuenta como leído (regla de leído, sección 6)
        const it = itemOf(cur!)
        if (it?.n && !it.n.read && own(it.n)) { markRead(g, [it.n.id], true); save(); pin() }
        focusReq.current = { to: 'primary' }; refresh(); return
      }
      default: return
    }
    e.preventDefault()
    const k = keys[Math.max(0, Math.min(keys.length - 1, j))]
    if (narrow) { setCursor(k); focusReq.current = { to: 'row', key: k } } else if (k !== active) { pick(k, 'row'); return } else focusReq.current = { to: 'row', key: k }
    refresh()
  }
  const markAll = () => { const ids = unreadView.map(n => n.id); markRead(g, ids, true); save(); setMarked(ids); refresh() }
  const undoMark = () => { if (marked) markRead(g, marked, false); save(); setMarked(null); refresh() }

  // ---------- filas ----------
  const optProps = (k: string, label: string) => ({
    role: 'option', 'aria-selected': !narrow && k === active, tabIndex: k === cur ? 0 : -1, 'data-k': k, id: `${uid}-${k}`, 'aria-label': label,
    onClick: () => pick(k), onFocus: () => narrow && setCursor(k),
  })
  const decRow = (b: Item) => {
    const s = snap.current[b.key], d = b.ghost ? s.d : pendDesc(g, b.p!)
    const done = !!b.ghost, resolved = done && flash?.key === b.key && flash.resolved
    const due: DueT = done ? { text: resolved ? '✓ Resuelto' : 'Ya no está vigente', none: true } : d.due
    return <div key={b.key} {...optProps(b.key, `${done ? (resolved ? 'Resuelto' : 'Ya no está vigente') : 'Para decidir'}. ${d.kind}${d.who ? `, ${d.who}` : ''}. ${d.title}. ${done ? '' : d.due.text}`)} className={`msg ib-opt ib-dec ${done ? 'done' : ''}`}>
      <MsgBody ico={<span className={`msg-ico ${done ? 'done' : 'dec'}`}>{done ? IC.check : IC.dec}</span>} kind={d.kind} who={d.who} title={d.title} extra={<Due d={due} />} chev={narrow} />
    </div>
  }
  const msgRow = (n: News) => {
    const k = `n${n.id}`, pl = n.pid != null ? g.players[n.pid] : undefined, c = n.clubId != null && n.clubId !== g.userClubId ? g.clubs[n.clubId] : undefined
    const who = pl?.name ?? c?.name, unread = !n.read && own(n), dec = openDec(n)
    const chip = dec ? 'Para decidir' : n.act === 'result' && g.fixtures.some(f => f.id === n.ref) ? 'Ver informe' : n.act === 'scout' || n.act === 'rival' ? 'Informe' : ''
    // en el celular el chip "Para decidir" queda como "!" (CSS); el texto completo sigue en el nombre de la fila
    return <div key={k} {...optProps(k, `${unread ? 'Sin leer. ' : ''}${TAG_NAME[n.tag]}${who ? `, ${who}` : ''}. ${n.title}.${chip ? ` ${chip}.` : ''} ${shortDay(n.date, g.date)}.`)} className={`msg ib-opt ${unread ? 'unread' : ''}`}>
      <MsgBody ico={<span className="msg-ico">{TAG_ICON[n.tag] ?? TAG_ICON.club}</span>} kind={TAG_NAME[n.tag]} who={who} title={hl(n.title, qn)} tag={chip ? <span className={`ib-tag ${dec ? 'dec' : ''}`}>{dec && <span className="ib-tag-i" aria-hidden="true">!</span>}<span className="ib-tag-t">{chip}</span></span> : undefined} unread={unread} chev={narrow} />
    </div>
  }
  const days: { d: string; ns: News[] }[] = []
  for (const n of page) { const last = days[days.length - 1]; if (last?.d === n.date) last.ns.push(n); else days.push({ d: n.date, ns: [n] }) }
  const ownAny = g.news.some(own)

  const empty = qn
    ? <div className="ib-empty"><p>Ningún mensaje contiene «<b>{q.trim()}</b>» en esta vista.</p><div className="row wrap" style={{ gap: 8 }}>{scope === 'club' && <button className="btn sm" onClick={() => setTab(`futbol.${topic}`)}>Buscar en todo el fútbol</button>}<button className="btn sm" onClick={() => { setQ(''); searchRef.current?.focus() }}>Borrar búsqueda</button></div></div>
    : <div className="ib-empty"><span className="msg-ico">{topic === 'todo' && !ownAny ? IC.inbox : TAG_ICON[{ plantel: 'club', mercado: 'mercado', partidos: 'partido', torneos: 'torneo', dirigencia: 'directiva' }[topic] ?? 'club']}</span><p>{scope === 'club' ? EMPTY[topic] : 'Todavía no hay noticias de este tema en el resto del fútbol.'}</p></div>

  const list = <div className="ib-list card" ref={boxRef} onScroll={e => { if (!narrow) listScroll[tab] = e.currentTarget.scrollTop }}>
    {!block.length && <div className="ib-block-h none">{IC.check}<span><b>Nada para decidir.</b> Podés seguir con Continuar.</span></div>}
    {keys.length > 0 && <div role="listbox" aria-label="Mensajes" className="ib-lb" ref={listRef} onKeyDown={onListKey}>
      {block.length > 0 && <div role="group" aria-labelledby={`${uid}-blk`}>
        <div className={`ib-block-h ${pend.length ? '' : 'none'}`} id={`${uid}-blk`}>{pend.length ? <>{IC.bang}<b>Para decidir</b><span className="pdot">{pend.length}</span></> : <>{IC.check}<span><b>Nada para decidir.</b> Podés seguir con Continuar.</span></>}</div>
        {block.map(decRow)}
      </div>}
      {days.map(({ d, ns }) => <div key={d} role="group" aria-labelledby={`${uid}-d${d}`}><DayHead d={d} today={g.date} id={`${uid}-d${d}`} />{ns.map(msgRow)}</div>)}
    </div>}
    {!page.length && empty}
    {view.length > upto && <button className="btn sm ib-more" onClick={() => {
      const add = Math.min(150, view.length - upto)
      setShown(upto + 150); setLive(`${plural(add, 'mensaje', 'mensajes')} más.`)
      // con lo último cargado el botón desaparece: el foco pasa a la última fila (sin elegirla)
      if (view.length <= upto + 150) { const k = `n${view[view.length - 1].id}`; if (narrow) setCursor(k); else setPeek(k); focusReq.current = { to: 'row', key: k } }
    }}>Mostrar {Math.min(150, view.length - upto)} más</button>}
  </div>

  const item = active ? itemOf(active) : null
  const panelProps = { flash, run, busy, narrow, nextPend: flash?.resolved ? nextPend : undefined, goNext: () => nextPend && pick(nextPend.key, 'primary'), pin, pressWatch, own, pendKeys, pend }
  /** Esc con la ficha breve abierta solo la cierra (Nav.tsx); no mueve el foco. */
  const escOk = (e: RKey) => e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.modal') && !document.querySelector('.hovercard')

  // celular y ventana angosta: el detalle es una vista aparte
  if (narrow && item) {
    const i = keys.indexOf(item.key)
    return <div className="page ib-detail page-in" onKeyDown={e => { if (escOk(e)) { e.preventDefault(); backToList() } }}>
      <div className="ib-dhead">
        <button className="btn" onClick={backToList}>{IC.back}Bandeja</button>
        <span className="grow" />
        <span className="ib-pos">{i + 1} de {keys.length}</span>
        <button className="btn icon" aria-label="Mensaje anterior" disabled={i <= 0} onClick={() => pick(keys[i - 1], 'title')}>{IC.prev}</button>
        <button className="btn icon" aria-label="Mensaje siguiente" disabled={i >= keys.length - 1} onClick={() => pick(keys[i + 1], 'title')}>{IC.next}</button>
      </div>
      <div className="card ib-read" ref={readRef}><Panel key={item.key} it={item} {...panelProps} /></div>
      <div className="vh" aria-live="polite">{live}</div>
      <BarHeight />
    </div>
  }

  return <div className="page ib-page">
    <PageTip id="inbox" />
    <div className="ib-head">
      <h2 className={`grow ${searchOpen ? 'ib-h2-s' : ''}`}>Bandeja<span className="hide-sm"> de entrada</span></h2>
      <div className={`ib-search ${searchOpen || q ? 'open' : ''}`}>
        {IC.search}
        <input ref={searchRef} type="search" aria-label="Buscar en los mensajes" placeholder="Buscar en los mensajes" value={q} onChange={e => { setQ(e.target.value); setShown(150) }}
          onKeyDown={e => {
            if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') }
            else if (e.key === 'ArrowDown' && keys.length) { e.preventDefault(); const k = page[0] ? `n${page[0].id}` : keys[0]; if (narrow) { setCursor(k); focusReq.current = { to: 'row', key: k }; refresh() } else pick(k, 'row') }
          }} />
        {(q || searchOpen) && <button className="ib-search-x" aria-label="Borrar búsqueda" onClick={() => { if (q) { setQ(''); searchRef.current?.focus() } else setSearchOpen(false) }}>{IC.x}</button>}
      </div>
      {!(searchOpen || q) && <button className="btn icon ib-search-btn" aria-label="Buscar en los mensajes" onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus()) }}>{IC.search}</button>}
      {unreadView.length > 0 && <button className="btn sm" onClick={markAll}>Marcar {unreadView.length} como {unreadView.length === 1 ? 'leído' : 'leídos'}</button>}
    </div>
    <div role="status" className="ib-markst">{marked && <div className="ib-result"><span className="ib-result-ico">{IC.check}</span><span className="grow">Marcaste {marked.length} como {marked.length === 1 ? 'leído' : 'leídos'}.</span><button className="btn sm" onClick={undoMark}>Deshacer</button></div>}</div>
    <div className="ib-filters">
      <Toggles label="Alcance" className="seg" items={[['club', 'Mi club', 0], ['futbol', 'Todo el fútbol', 0]]} value={scope} onPick={s => setTab(`${s}.${topic}`)} />
      <span className="ib-filters-sep" aria-hidden="true" />
      <Toggles label="Tema" className="ibchips" btnClass="ibchip" items={TOPICS.map(([k, l]) => [k, l, cnt(k)])} value={topic} onPick={t => setTab(`${scope}.${t}`)} />
    </div>
    <div className="vh" aria-live="polite">{live}</div>
    <div className="inbox">
      {list}
      {!narrow && <div className="ib-read card" ref={readRef} onKeyDown={e => { if (escOk(e) && active) { e.preventDefault(); focusReq.current = { to: 'row', key: active }; refresh() } }}>
        {item ? <Panel key={item.key} it={item} {...panelProps} />
          : !ownAny && scope === 'club' ? <div className="pagetip ib-tipin"><span>Lo que tenés que decidir está siempre arriba, con su plazo: las ofertas y los trabajos vencen. Cada mensaje trae los botones para resolverlo.</span></div>
          : <div className="ib-none">Elegí un mensaje de la lista.</div>}
      </div>}
    </div>
  </div>
}

/**
 * Alto de la barra de acciones fija del detalle (≤ 900 px) en `--ib-bar` sobre el contenedor que se desplaza:
 * el pie del detalle deja ese lugar y el foco no queda tapado por la barra (`scroll-padding-bottom`, 2.4.11).
 */
function BarHeight() {
  useLayoutEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    let bar: Element | null = null
    const set = () => { const fixed = !!bar && getComputedStyle(bar).position === 'fixed'; main.style.setProperty('--ib-bar', `${fixed ? Math.ceil(bar!.getBoundingClientRect().height) : 0}px`) }
    const ro = new ResizeObserver(set)
    const watch = () => { const b = main.querySelector('.ib-actbar'); if (b !== bar) { if (bar) ro.unobserve(bar); bar = b; if (b) ro.observe(b) } set() }
    const mo = new MutationObserver(watch)
    mo.observe(main, { childList: true, subtree: true })
    window.addEventListener('resize', set)
    watch()
    return () => { ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', set); main.style.removeProperty('--ib-bar') }
  }, [])
  return null
}

/** Grupo de botones alternables con foco itinerante: una parada de Tab, ← → entre opciones, Enter o Espacio eligen. */
function Toggles({ label, items, value, onPick, className, btnClass = '' }: { label: string; items: [string, string, number][]; value: string; onPick: (k: string) => void; className: string; btnClass?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const key = (e: RKey) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const bs = [...(ref.current?.querySelectorAll('button') ?? [])], j = bs.indexOf(document.activeElement as HTMLButtonElement) + (e.key === 'ArrowRight' ? 1 : -1)
    if (bs[j]) { e.preventDefault(); bs[j].focus(); bs[j].scrollIntoView({ block: 'nearest', inline: 'nearest' }) }
  }
  return <div ref={ref} role="group" aria-label={label} className={className} onKeyDown={key}>
    {items.map(([k, l, c]) => <button key={k} className={`${btnClass} ${k === value ? 'on' : ''}`} aria-pressed={k === value} tabIndex={k === value ? 0 : -1} onClick={() => onPick(k)}>{l}{c > 0 && <span className="cnt"><span className="vh">, </span>{c}<span className="vh"> sin leer</span></span>}</button>)}
  </div>
}

// ---------- lectura ----------
/** `nav`: solo lleva a otra pantalla (lectura); sigue habilitada durante el avance y en pantallas angostas puede salir de la barra. `dec`: decide sin confirmación. */
type Act = { label: ReactNode; kind?: 'primary' | 'danger'; run?: () => void; confirm?: { label: string; danger?: boolean; run: () => void }; disabled?: boolean; nav?: boolean; dec?: boolean; on?: boolean }

/** Fila de acciones con confirmación en el lugar (F6): el botón se reemplaza por "Confirmar…" y "No"; Esc o "No" vuelven. */
function Actions({ acts, help, busy }: { acts: Act[]; help: ReactNode[]; busy: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([]), conf = useRef<HTMLButtonElement>(null), back = useRef<number | null>(null)
  useEffect(() => { if (open != null) conf.current?.focus(); else if (back.current != null) { btns.current[back.current]?.focus(); back.current = null } }, [open])
  const cancel = () => { back.current = open; setOpen(null) }
  const decision = acts.some(a => a.confirm || a.dec)
  return <>
    <div className="ib-acts" onKeyDown={e => { if (e.key === 'Escape' && open != null) { e.preventDefault(); cancel() } }}>
      {acts.map((a, i) => open === i && a.confirm
        ? <div key={i} className={`ib-confirm ${a.confirm.danger ? 'danger' : ''}`}><button ref={conf} className={a.confirm.danger ? 'btn danger strong' : 'btn primary'} onClick={a.confirm.run}>{a.confirm.label}</button><button className="btn" onClick={cancel}>No</button></div>
        : <button key={i} ref={el => { btns.current[i] = el }} className={`btn ${a.kind ?? ''} ${a.on ? 'on' : ''}`} aria-pressed={a.on ?? undefined} data-primary={a.kind === 'primary' || undefined} disabled={a.disabled || (busy && !a.nav && (!!a.confirm || !!a.dec))} onClick={() => (a.confirm ? setOpen(i) : a.run?.())}>{a.label}</button>)}
    </div>
    {busy && decision && <div className="ib-help">Frená el avance para decidir.</div>}
    {help.filter(Boolean).map((h, i) => <div key={i} className="ib-help">{h}</div>)}
  </>
}

/** Cifra clave; `t`: el valor es una frase (estilo, personalidad, objetivo) y puede ocupar varias líneas. */
const Kpi = ({ l, v, s, k, t }: { l: string; v: ReactNode; s?: string; k?: boolean; t?: boolean }) => <div className={`ib-kpi ${k ? 'key' : ''}`}><span className="ib-kpi-l">{l}</span><span className={`ib-kpi-v ${t ? 'txt' : ''}`}>{v}</span>{s && <span className="ib-kpi-s">{s}</span>}</div>
const Fact = ({ children }: { children: ReactNode }) => <div className="ib-fact">{children}</div>

function PlayerCard({ pid }: { pid?: number }) {
  const { g, openPlayer } = useGame()
  if (pid == null) return null
  const p = g.players[pid]
  if (!p) return <div className="ib-who gone"><span className="msg-ico">{TAG_ICON.club}</span><span>Ya no está en el fútbol argentino.</span></div>
  const c = g.clubs[p.clubId], mine = p.clubId === g.userClubId
  const meta = [`${ageOn(p.birth, g.date)} años`, mine ? (p.status ? STATUS[p.status].name : '') : c?.short, `${p.stats.apps + p.stats.subs} PJ`, `contrato dic ${p.contractEnd}`].filter(Boolean).join(' · ')
  return <button className="ib-who" data-pid={p.id} onClick={() => openPlayer(p.id)}>
    <Face p={p} size={44} />
    <span className="grow" style={{ minWidth: 0 }}><span className="ib-who-n"><b>{p.name}</b><PosPill p={p} /><Val p={p} /></span><span className="ib-who-m">{meta}</span><span className="ib-who-s"><Status p={p} /></span></span>
    <span className="ib-chev">{IC.next}</span>
  </button>
}
function ClubCard({ cid, name }: { cid?: number; name?: string }) {
  const { g, openClub } = useGame()
  const c = cid != null ? g.clubs[cid] : undefined
  if (!c) return name ? <div className="ib-who static"><span className="msg-ico">{TAG_ICON.club}</span><span className="grow"><b>{name}</b><span className="ib-who-m">Club del exterior</span></span></div> : null
  const pos = leaguePos(g, c)
  return <button className="ib-who" data-cid={c.id} onClick={() => openClub(c.id)}>
    <Badge club={c} size={40} />
    <span className="grow" style={{ minWidth: 0 }}><span className="ib-who-n"><b>{c.name}</b></span><span className="ib-who-m">{[divName(c), pos ? `${pos}.º` : '', `reputación ${c.rep}`].filter(Boolean).join(' · ')}</span></span>
    <span className="ib-chev">{IC.next}</span>
  </button>
}

type PanelCtx = { flash: Flash | null; run: (key: string, fn: () => { text: string; tone?: Tone; resolved?: boolean }) => void; busy: boolean; narrow: boolean; nextPend?: Pending; goNext: () => void; pin: () => void; pressWatch: { current: string | null }; own: (n: News) => boolean; pendKeys: Set<string>; pend: Pending[] }

/** Plantilla de lectura según el tipo (especificación 5.3): tarjetas, cifras, plazo y hechos, cuerpo y acciones. */
function Panel({ it, flash, run, busy, narrow, nextPend, goNext, pin, pressWatch, own, pendKeys, pend }: { it: Item } & PanelCtx) {
  const { g, save, refresh, go, nav, openPlayer, openClub, openPress } = useGame()
  const [rep, setRep] = useState<Fixture | null>(null)
  const [scout, setScout] = useState<Fixture | null>(null)
  const n = it.n, dk = it.p ? it.key : n ? pendingKeyOf(n) : null
  const livePend = dk ? pend.find(p => p.key === dk) : undefined
  const fl = flash && dk && flash.key === dk ? flash : null
  const src = n ?? (dk ? g.news.find(x => pendingKeyOf(x) === dk) : undefined)
  const desc = it.p ? pendDesc(g, it.p) : null
  const kind = it.p?.k ?? (n?.act === 'offer' || n?.act === 'job' || n?.act === 'out' ? n.act : null)

  let cards: ReactNode = null, kpis: ReactNode = null, extra: ReactNode = null, facts: ReactNode = null, conseq: ReactNode = null, gone: ReactNode = null
  let acts: Act[] = [], help: ReactNode[] = []
  const goneMsg = (t: string) => (gone = <div className="ib-gone">{t}</div>)
  const expired = (ref: number, tag: string) => g.news.find(x => x.ref === ref && x.tag === tag && x.title.startsWith('Venció'))

  if (kind === 'offer') {
    const oid = it.p?.k === 'offer' ? it.p.o.id : n!.ref!
    const o: Offer | undefined = g.offers.find(x => x.id === oid)
    const pid = o?.pid ?? (it.p?.k === 'offer' ? it.p.o.pid : n?.pid), p = pid != null ? g.players[pid] : undefined
    const fromName = o?.fromName ?? (it.p?.k === 'offer' ? it.p.o.fromName : undefined)
    cards = <><PlayerCard pid={pid} /><ClubCard cid={(o?.from ?? (it.p?.k === 'offer' ? it.p.o.from : 0)) || undefined} name={fromName} /></>
    if (o && p && livePend) {
      const diff = p.value ? Math.round((o.fee / p.value - 1) * 100) : 0, open = windowOpen(g.date)
      const left = squadOf(g, g.userClubId).filter(x => x.id !== p.id && x.positions[0] === p.positions[0]).length
      kpis = <><Kpi k l="Oferta" v={money(o.fee)} /><Kpi l="Valor" v={money(p.value)} /><Kpi l="Diferencia" v={`${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} %`} s={diff > 0 ? 'sobre su valor' : diff < 0 ? 'bajo su valor' : 'igual a su valor'} /><Kpi l="Sueldo" v={money(p.wage)} s="por mes" /><Kpi l="Contrato" v={`dic ${p.contractEnd}`} /></>
      facts = <><Due d={dueOf(offerDeadline(o), g.date, false)} /><Fact>Libro de pases {open ? 'abierto' : 'cerrado'}.</Fact><Fact>Si lo vendés, te quedan {left} en su puesto ({POS_NAME[p.positions[0]].toLowerCase()}).</Fact></>
      acts = [
        { label: 'Aceptar', kind: 'primary', disabled: !open, confirm: { label: `Confirmar: vender a ${p.name} por ${money(o.fee)}`, run: () => run(dk!, () => { acceptOffer(g, o); return { text: `Vendiste a ${p.name} a ${o.fromName} por ${money(o.fee)}.` } }) } },
        { label: 'Pedir más', dec: true, disabled: !open, run: () => run(dk!, () => (haggle(g, o) ? { text: `${o.fromName} mejoró su oferta: ahora ${money(o.fee)}.`, resolved: false } : { text: `${o.fromName} se retiró de la negociación.`, tone: 'warn' })) },
        { label: 'Ver la ficha', nav: true, run: () => openPlayer(p.id) },
        { label: 'Rechazar', kind: 'danger', confirm: { label: 'Confirmar rechazo', danger: true, run: () => run(dk!, () => { rejectOffer(g, o); return { text: `Rechazaste la oferta de ${o.fromName}.` } }) } },
      ]
      help = [!open && 'El libro de pases está cerrado: no podés aceptar ni pedir más, solo rechazar.', <><b>Pedir más:</b> {o.fromName} puede mejorar la oferta o retirarse.</>]
    } else { const ex = expired(oid, 'mercado'); goneMsg(ex ? `Esta oferta venció el ${fmtDate(ex.date)}.` : 'Esta oferta ya fue respondida o venció.') }
  } else if (kind === 'job') {
    const cid = it.p?.k === 'job' ? it.p.clubId : n!.ref!, c = g.clubs[cid], mine = g.clubs[g.userClubId]
    const lp = livePend?.k === 'job' ? livePend : undefined
    cards = <ClubCard cid={cid} />
    if (lp && c) {
      const pc = leaguePos(g, c), pm = leaguePos(g, mine)
      extra = <table className="ib-cmp"><thead><tr><td /><th><Badge club={c} size={20} /> Ese club</th><th><Badge club={mine} size={20} /> El tuyo</th></tr></thead><tbody>
        {([['Categoría', divName(c), divName(mine)], ['Posición', pc ? `${pc}.º` : '—', pm ? `${pm}.º` : '—'], ['Reputación', c.rep, mine.rep], ['Presupuesto', money(c.budget), money(mine.budget)]] as [string, ReactNode, ReactNode][]).map(([l, a, b]) => <tr key={l}><th scope="row">{l}</th><td>{a}</td><td>{b}</td></tr>)}
      </tbody></table>
      const d = dueOf(lp.until, g.date, false)
      facts = lp.kind === 'season'
        ? <><Due d={{ text: 'Respondé antes de comenzar la próxima temporada: si la comenzás sin responder, la oferta se pierde.' }} /><Fact>Empezás la próxima temporada en {c.name}.</Fact></>
        : <><Due d={{ ...d, text: `Respondé hasta el ${fmtDate(lp.until)}.${d.short ? ` ${d.text}.` : ''}` }} /><Fact>Si aceptás, dirigís {c.name} desde mañana.</Fact></>
      const jc = jobConsequences(g, cid), parts: string[] = []
      // "se cancela la oferta por tu jugador", "se cancelan las 2 ofertas por tus jugadores y la de otro club"
      const cancel: string[] = []
      if (jc.offers) cancel.push(jc.offers === 1 ? 'la oferta por tu jugador' : `las ${jc.offers} ofertas por tus jugadores`)
      if (jc.jobs) cancel.push(jc.jobs === 1 ? (jc.offers ? 'la de otro club' : 'la oferta de otro club') : jc.offers ? `las ${jc.jobs} de otros clubes` : `las ${jc.jobs} ofertas de otros clubes`)
      if (cancel.length) parts.push(`${jc.offers + jc.jobs === 1 ? 'se cancela' : 'se cancelan'} ${cancel.join(' y ')}`)
      if (jc.press) parts.push('se descarta la conferencia pendiente')
      // "el ayudante de campo y el preparador físico se van con vos", "el médico, el scouting y las inferiores quedan en {club}"
      const list = (rs: StaffRole[]) => { const w = rs.map(r => STAFF_PHRASE[r]); return w.length > 1 ? `${w.slice(0, -1).join(', ')} y ${w[w.length - 1]}` : w[0] }
      if (jc.follow) parts.push(`${list(jc.followRoles)} ${jc.follow > 1 ? 'se van' : 'se va'} con vos`)
      if (jc.staff) parts.push(`${list(jc.staffRoles)} ${jc.staff > 1 || jc.staffRoles[0] === 'youth' ? 'quedan' : 'queda'} en ${mine.name}`)
      if (parts.length) conseq = <div className={`ib-conseq ${narrow ? 'out' : ''}`}>Si aceptás, {parts.length > 1 ? `${parts.slice(0, -1).join('; ')} y ${parts[parts.length - 1]}` : parts[0]}.</div>
      const nm = (x: Club) => (x.name.length > 26 ? x.short : x.name)
      acts = [
        { label: 'Aceptar', kind: 'primary', confirm: { label: `Confirmar: dejar ${nm(mine)} y dirigir ${nm(c)}`, run: () => run(dk!, () => { const old = mine.name; acceptJob(g, cid); return { text: `Dejaste ${old}: ahora dirigís ${c.name}.` } }) } },
        { label: 'Ver el club', nav: true, run: () => openClub(cid) },
        { label: 'Rechazar', kind: 'danger', confirm: { label: 'Confirmar rechazo', danger: true, run: () => run(dk!, () => { rejectJob(g, cid); return { text: `Rechazaste la oferta de ${c.name}.` } }) } },
      ]
    } else { const ex = expired(cid, 'directiva'); goneMsg(ex ? `Esta oferta venció el ${fmtDate(ex.date)}.` : 'La oferta ya no está vigente.') }
  } else if (kind === 'out') {
    const pid = it.p?.k === 'out' ? it.p.pid : n!.pid!, p = g.players[pid]
    cards = <PlayerCard pid={pid} />
    if (p && livePend) {
      const exp = Math.round(STATUS[p.status ?? 'sub'].share * 100), got = Math.round(minutesShare(p) * 100), h = Math.round(p.happy ?? 50)
      kpis = <><Kpi k l="Conformidad" v={<span className="row" style={{ gap: 8 }}>{h}<span className="bar" style={{ width: 60 }}><i style={{ width: `${h}%`, background: h >= 65 ? 'var(--good)' : h >= 35 ? 'var(--warn)' : 'var(--bad)' }} /></span></span>} /><Kpi l="Rol" v={p.status ? STATUS[p.status].name : '—'} /><Kpi l="Minutos" v={`${got} %`} s={`esperados ${exp} % · jugados ${got} %`} /></>
      facts = <><Due d={{ text: 'No vence: sigue pendiente hasta que lo declares transferible o deje de pedir irse.', none: true }} />{p.promise && <Fact><span className="chip">Promesa hasta el {fmtDate(p.promise.until)}</span></Fact>}</>
      acts = [
        { label: 'Hablar con él', kind: 'primary', nav: true, run: () => nav({ page: 'player', id: pid, tab: 'personal' }) },
        { label: 'Declararlo transferible', dec: true, run: () => run(dk!, () => { setListed(g, pid, true); return { text: `Declaraste transferible a ${p.name}. Las ofertas van a llegar a la bandeja.` } }) },
      ]
    } else goneMsg(!p ? 'Ya no está en el plantel.' : p.listed ? 'Ya está declarado transferible.' : 'Ya no pide irse.')
  } else if (kind === 'press') {
    if (livePend && g.press) {
      const f = g.fixtures.find(x => x.id === g.press!.fixtureId), opp = f ? g.clubs[f.home === g.userClubId ? f.away : f.home] : undefined
      kpis = <>{opp && f && <Kpi l="Partido" v={<span className="row" style={{ gap: 8 }}><Badge club={opp} size={20} />{opp.short}</span>} s={shortDay(f.date, g.date)} />}<Kpi l="Tipo" v={g.press.kind === 'pre' ? 'Previa' : 'Posterior'} /></>
      extra = <div className="ib-quotes">{g.press.questions.map((x, i) => <q key={i}>{x.q}</q>)}</div>
      facts = <Fact>Si seguís sin responder, habla el ayudante.</Fact>
      acts = [
        { label: 'Responder', kind: 'primary', dec: true, run: () => { pin(); pressWatch.current = dk; openPress() } },
        { label: 'Que hable el ayudante', dec: true, run: () => run(dk!, () => { delegatePress(g); return { text: 'Habló el ayudante.' } }) },
      ]
    } else goneMsg('La conferencia ya terminó.')
  } else if (kind === 'season') {
    const mine = g.clubs[g.userClubId], pos = leaguePos(g, mine)
    kpis = <><Kpi k l="Posición final" v={pos ? `${pos}.º` : '—'} />{g.board.objective && <Kpi t l="Objetivo de la dirigencia" v={g.board.objective} />}</>
    acts = [{ label: 'Ir al inicio', kind: 'primary', run: () => nav({ page: 'home' }) }]
  } else if (n) {
    const p = n.pid != null ? g.players[n.pid] : undefined
    if ((n.act === 'injury' || n.tag === 'lesion') && n.pid != null) {
      cards = <PlayerCard pid={n.pid} />
      const out = p ? injuryOutlook(g, p.id) : null
      if (p) {
        if (out) kpis = <><Kpi k l="Días afuera" v={out.days} /><Kpi l="Vuelve" v={shortDay(out.back, g.date)} /><Kpi l="Partidos que se pierde" v={out.matches} /></>
        else facts = <div className="ib-fact ok">{IC.check}Ya está recuperado.</div>
        const starter = p.clubId === g.userClubId && (p.status === 'key' || p.status === 'reg')
        acts = [...(p.clubId === g.userClubId ? [{ label: 'Ir a Tácticas', kind: starter ? 'primary' as const : undefined, nav: true, run: () => go('tactics') }] : []), { label: 'Ver la ficha', nav: true, run: () => openPlayer(p.id) }]
      }
    } else if (n.act === 'result') {
      const f = g.fixtures.find(x => x.id === n.ref)
      if (f) {
        const h = g.clubs[f.home], a = g.clubs[f.away], me = g.userClubId, side = f.home === me ? 0 : f.away === me ? 1 : -1
        const d = side < 0 ? 0 : (side === 0 ? 1 : -1) * (f.hg - f.ag), pw = f.pens ? (f.pens[side === 0 ? 0 : 1] > f.pens[side === 0 ? 1 : 0]) : null
        const r = side < 0 ? null : f.pens ? (pw ? 'G' : 'P') : d > 0 ? 'G' : d < 0 ? 'P' : 'E'
        extra = <div className="ib-scorebox">
          <div className="ib-score"><span className="ib-sc-t"><Badge club={h} size={48} /><b>{h.short}</b></span><span className="ib-sc-n"><b>{f.hg}</b><i>-</i><b>{f.ag}</b></span><span className="ib-sc-t"><Badge club={a} size={48} /><b>{a.short}</b></span></div>
          <div className="ib-sc-m">{g.comps[f.comp]?.name ?? f.comp} · {f.stage} · {shortDay(f.date, g.date)}{f.pens ? ` · penales ${f.pens[0]}-${f.pens[1]}` : ''}</div>
          {r && <span className="ib-res"><span className={`rdot ${r}`} />{r === 'G' ? 'Victoria' : r === 'E' ? 'Empate' : 'Derrota'}</span>}
        </div>
        if (n.pid != null) cards = <PlayerCard pid={n.pid} />
        acts = [{ label: 'Ver el informe del partido', kind: 'primary', run: () => setRep(f) }, ...(['AP', 'CL', 'PN', 'T3'].includes(f.comp) ? [{ label: 'Ver posiciones', run: () => go('tables') }] : [])]
      }
    } else if (n.act === 'scout' && n.pid != null) {
      cards = <PlayerCard pid={n.pid} />
      if (p) {
        const idx = ATTRS.map((_, i) => i).sort((x, y) => p.attrs[y] - p.attrs[x]), top = idx.slice(0, 4), low = idx[idx.length - 1]
        const mine = p.clubId === g.userClubId, ask = mine ? null : demand(g, p, 'buy', naturalStatusFor(g, p)).terms.wage
        extra = <div className="attr-cols ib-attrs">{[...top, low].map((i, j) => <div key={i} className="attr"><span className="attr-l">{j === 4 ? 'Más flojo: ' : ''}{ATTR_LABEL[ATTRS[i]]}</span><span className={`v ${attrClass(p.attrs[i])}`}>{p.attrs[i]}</span></div>)}</div>
        kpis = <><Kpi t l="Personalidad" v={persLabels(p).join(', ') || '—'} /><Kpi l="Valor" v={money(p.value)} />{ask != null && <Kpi l="Pedido de sueldo" v={money(ask)} s="por mes" />}</>
        const followed = g.shortlist.includes(p.id)
        acts = [{ label: 'Ver la ficha', kind: 'primary', run: () => openPlayer(p.id) }, ...(!mine ? [
          { label: followed ? '✓ En seguimiento' : 'Seguir', on: followed, run: () => { toggleShortlist(g, p.id); save(); refresh() } },
          { label: 'Ofertar', run: () => nav({ page: 'player', id: p.id, tab: 'contrato' }) }] : [])]
      }
    } else if (n.act === 'rival') {
      const nx = nextUserFixture(g)
      if (nx && nx.id === n.ref) {
        const r = scoutReport(g, nx)
        cards = <ClubCard cid={r.opp.id} />
        const home = nx.home === g.userClubId
        kpis = <><Kpi l="Partido" v={shortDay(nx.date, g.date)} s={`${home ? 'Local' : 'Visitante'} · ${g.comps[nx.comp]?.name ?? nx.comp}`} /><Kpi t l="Estilo" v={r.style.join(' ') || '—'} /><Kpi t l="Punto débil" v={r.weak || '—'} /></>
        acts = [{ label: 'Ver el informe del rival', kind: 'primary', run: () => setScout(nx) }]
      } else { cards = <ClubCard cid={n.clubId !== g.userClubId ? n.clubId : undefined} />; goneMsg('Ese partido ya se jugó.') }
    } else if (n.act === 'train') acts = [{ label: 'Ir a Entrenamiento', run: () => go('training') }]
    else {
      cards = p ? <PlayerCard pid={n.pid} /> : n.pid != null ? <PlayerCard pid={n.pid} /> : <ClubCard cid={n.clubId} />
      if (n.tag === 'torneo' || n.tag === 'premio') acts = [{ label: 'Ver posiciones', run: () => go('tables') }]
    }
  }

  const unread = !!n && !n.read && own(n)
  const resolved = !!fl?.resolved
  const topic = n ? TAG_NAME[n.tag] : PEND_TOPIC[it.p!.k]
  const date = n ? fmtDate(n.date) : it.p?.k === 'offer' ? `ofrecida el ${fmtDate(it.p.o.date)}` : src ? fmtDate(src.date) : ''
  const stateChip = resolved ? <span className="chip ib-state">{IC.check}Resuelto</span> : unread ? <span className="chip ib-state"><span className="msg-dot" />Sin leer</span> : n && dk && pendKeys.has(dk) ? <span className="chip ib-state dec">Para decidir</span> : null
  const toggleRead = () => { markRead(g, [n!.id], !n!.read); save(); refresh() }
  // pantallas angostas: con más de tres botones, los de solo lectura (Ver la ficha…) pasan al contenido (especificación 5.2)
  const links = narrow && acts.length > 3 ? acts.filter(a => a.nav && !a.kind) : []
  if (links.length) acts = acts.filter(a => !links.includes(a))
  const showActs = !resolved && !gone && acts.length > 0
  return <div className="ib-panel">
    <div className="ib-rhead"><p className="ib-topic">{topic}</p>{stateChip}<span className="grow" /><span className="ib-date">{date}</span>{n && own(n) && <button className="btn sm" onClick={toggleRead}>{n.read ? 'Marcar como no leído' : 'Marcar como leído'}</button>}</div>
    <h2 className="ib-h" tabIndex={-1}>{n?.title ?? desc?.title}</h2>
    {cards && <div className="ib-ents">{cards}</div>}
    {!resolved && kpis && <div className="ib-kpis">{kpis}</div>}
    {!resolved && extra}
    {!resolved && facts && <div className="ib-facts">{facts}</div>}
    {!resolved && links.length > 0 && showActs && <div className="ib-links">{links.map((a, i) => <button key={i} className="btn" onClick={a.run}>{a.label}</button>)}</div>}
    {src?.body && <p className="ib-body">{src.body}</p>}
    {!resolved && narrow && conseq}
    {(showActs || gone || fl) && <div className={`ib-actwrap ${showActs || fl ? 'ib-actbar' : ''}`}>
      {!resolved && !narrow && conseq}
      {showActs && <Actions acts={acts} help={help} busy={busy} />}
      {!fl && gone}
      <div role="status" className="ib-status">{fl && <div className={`ib-result ${fl.tone === 'ok' ? '' : fl.tone}`} tabIndex={-1}><span className="ib-result-ico">{fl.tone === 'ok' ? IC.check : IC.bang}</span><span>{fl.text}</span></div>}
        {fl?.saveErr && <div className="ib-result err ib-saveerr"><span className="ib-result-ico">{IC.bang}</span><span>No se pudo guardar la partida. Tu decisión quedó hecha en esta sesión; probá exportar la partida desde Ajustes.</span></div>}</div>
      {resolved && nextPend && <button className="btn primary ib-next" data-next onClick={goNext}>Siguiente pendiente{IC.next}</button>}
    </div>}
    {rep && <MatchReport g={g} f={rep} onClose={() => setRep(null)} />}
    {scout && <ReportModal f={scout} onClose={() => setScout(null)} onApply={pp => { Object.assign(g.clubs[g.userClubId].tactic, pp); save(); refresh() }} />}
  </div>
}
