// Vestuario (design/ux/vestuario.md; production/ui/vestuario/visual-design.md): cómo está el grupo, a quién atender esta semana y por qué,
// el plantel con su humor, sus minutos y la reserva, y el detalle de un jugador (`LockerCard`, el mismo en el panel y en la ficha › Vestuario).
// La charla individual (`TalkModal`) sale de `talkOptions` y `talkResult`; las acciones del pedido de salida, de `outActions` y `letGoInfo`.
// La pantalla no escribe en `g`: llama al motor (talkResult, setListed, setReserve) y después guarda y refresca.
import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type KeyboardEvent as RKey, type ReactNode, type SetStateAction } from 'react'
import { canSell, dealImpact, openNegotiation, sendTerms, signDeal } from '../engine/career'
import { fmtDate, fmtDay, squadOf } from '../engine/game'
import { POS_LABEL, ageOn } from '../engine/positions'
import {
  STATUS, STATUS_KEYS, applyRenewal, attentionOf, demand, evalOffer, harmony, harmonyBoost, harmonyWord, letGoInfo, minutesOf, moodCause, moodOf, moodOutlook, moraleOf,
  naturalStatusFor, outActions, outDateOf, patienceWord, persTraits, promiseStatus, renewWalk, reserveOf, setListed, setReserve, talkContext, talkOptions,
  talkResult, talkState, wageShown, type NegMode, type Reason, type TalkOption, type TalkResult,
} from '../engine/squad'
import type { Player, SquadStatus, TalkKind, Terms } from '../engine/types'
import { useGame, useSticky, type Route } from '../store'
import { Badge, Face, Gauge, Modal, PosPill, Seg, Val, dec, money } from './common'
import { Amount, ImpactBox, MI, Note, between, patiencePhrase, wm } from './deal'
import { PageTip } from './Guide'
import { TAG_ICON, shortDay } from './msg'
import { LetGo, MinsBar, MoodBar, MoraleBar, TalkSt, Traits, Trend, VI, harmonyTone, listedNote } from './mood'
import { PlayerTable, ownBulk } from './PlayerTable'

/** Nota de resultado (F7) de una fila, de la `LockerCard` o de la banda de la ficha. */
export type LRes = { text: string; tone?: 'ok' | 'warn' | 'err'; saveErr?: boolean }
export function F7({ r, cls }: { r: LRes | null; cls: string }) {
  return <div className={cls} role="status">
    {r && <div className={`ib-result ${r.tone && r.tone !== 'ok' ? r.tone : ''}`} tabIndex={-1}><span className="ib-result-ico">{r.tone === 'err' ? MI.x : r.tone === 'warn' ? MI.bang : MI.ok}</span><span>{r.text}</span></div>}
    {r?.saveErr && <div className="ib-result err"><span className="ib-result-ico">{MI.bang}</span><span>No se pudo guardar la partida. Lo que hiciste quedó hecho en esta sesión; probá exportar la partida desde Ajustes.</span></div>}
  </div>
}
/** Lleva el foco al primer destino que exista (después de que la ventana devuelva el suyo): nunca a `body` ni a un control deshabilitado. */
export function focusLater(...sels: string[]) {
  setTimeout(() => {
    for (const s of sels) {
      const el = document.querySelector<HTMLElement>(s)
      if (el && !(el as HTMLButtonElement).disabled && el.getClientRects().length) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); return }
    }
  }, 30)
}
/** Guarda y, si falla, suma el aviso a la nota. */
export function saveNote(save: () => Promise<boolean>, set: Dispatch<SetStateAction<LRes | null>>) { save().then(ok => { if (!ok) set(r => (r ? { ...r, saveErr: true } : r)) }) }

function useMedia(q: string) {
  const [v, setV] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q), f = () => setV(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [q])
  return v
}
const pc = (v: number) => dec(Math.round(v * 100))
const sgn = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0')
/** Las cifras de un texto del motor en 700 ("juega 20 % y espera 62 %"). */
const bnum = (t: string) => t.replace(/ %/g, '\u00a0%').split(/(\d+(?:,\d+)?[ \u00a0]?%|\d+ minutos|\d{1,2} [a-z]{3}\b)/).map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s))
const roleOf = (p: Player) => STATUS[p.status ?? 'sub'].name
const KIND_NAME: Record<TalkKind, string> = { stay: 'Decirle que no se va', promise: 'Prometerle más minutos', patience: 'Pedirle paciencia', status: 'Cambiarle el rol', free: 'Decirle que puede buscar club', praise: 'Felicitarlo', demand: 'Exigirle más' }
const FILTERS: [string, string][] = [['todo', 'Todo el plantel'], ['reserva', 'En la reserva'], ['juveniles', 'Juveniles']]
const isFilter = (t?: string) => FILTERS.some(f => f[0] === t)
/** Al volver de una ficha (Atrás), el foco va a la fila de la que se salió: la entrada del historial es la misma (el mismo objeto). */
const FROM = new WeakMap<Route, string>()

/** Ícono de un motivo de "Para atender" (forma distinta por motivo: la lista se recorre sin color). */
const reasonIcon = (k: Reason['k']) => (k === 'outListed' ? MI.swap : k === 'promiseRisk' || k === 'upset' ? MI.bang : k === 'falling' ? VI.trendDown : k === 'leader' ? VI.minus : k === 'promiseOk' ? MI.ok : null)
const reasonCls = (k: Reason['k']) => (k === 'promiseRisk' || k === 'upset' ? 'bang' : k === 'promiseOk' ? 'ok' : '')
function ReasonChip({ r }: { r: Reason }) {
  if (r.decide) return <span className="ib-tag dec"><span className="ib-tag-i" aria-hidden="true">!</span><span className="ib-tag-t">Para decidir</span></span>
  return <span className={`mk-st vt-why ${reasonCls(r.k)}`}>{reasonIcon(r.k)}{r.chip}</span>
}

// ---------- la página ----------
export function LockerPage({ busy = false }: { busy?: boolean }) {
  const { g, route, nav, refresh, save, openPlayer } = useGame()
  const wide = useMedia('(min-width: 1181px)')
  const phone = useMedia('(max-width: 760px)')
  const [stTab, setStTab] = useSticky('lk.tab', 'todo')
  const armar = route.tab === 'armar'
  const tab = isFilter(route.tab) ? route.tab! : isFilter(stTab) ? stTab : 'todo'
  const sq = squadOf(g, g.userClubId)
  const hm = harmony(g), att = attentionOf(g), res = reserveOf(g)
  const [mode, setMode] = useState<{ view: string; sort?: { k: string; d: number }[]; n: number } | undefined>(undefined)
  const [view, setView] = useState('vestuario')
  const [talk, setTalk] = useState<{ pid: number; origin: 'att' | 'card' } | null>(null)
  const [attNote, setAttNote] = useState<{ pid: number; r: LRes } | null>(null)
  const [pageNote, setPageNote] = useState<LRes | null>(null)
  const [cardNote, setCardNote] = useState<LRes | null>(null)
  const seen = useRef(new Set<number>())
  const root = useRef<HTMLDivElement>(null)

  // elegido: el de la ruta si sigue en el plantel; si no, el primero de "Para atender"; si no, nadie (solo con panel)
  const want = route.sel?.[0] === 'p' ? Number(route.sel.slice(1)) : null
  const inSquad = (id: number | null) => id != null && sq.some(p => p.id === id)
  const gone = want != null && !inSquad(want) && seen.current.has(want) ? g.players[want] ?? null : null
  const picked = !wide ? null : inSquad(want) ? want : gone ? null : att[0]?.pid ?? null
  if (picked != null) seen.current.add(picked)
  useEffect(() => { setCardNote(null) }, [picked])

  const setTab = (t: string) => { setStTab(t); nav({ page: 'locker', tab: t, sel: route.sel }) }
  const pick = (pid: number, from: string) => {
    if (wide) { if (route.sel !== `p${pid}`) nav({ page: 'locker', tab, sel: `p${pid}` }) } else { FROM.set(route, from); nav({ page: 'player', id: pid, tab: 'personal' }) }
  }
  // "Armar la reserva": todo el plantel, vista Reserva, orden por la columna Reserva y el foco en la tabla
  const enterArmar = () => { setStTab('todo'); setMode(m => ({ view: 'reserva', sort: [{ k: 'res', d: 1 }], n: (m?.n ?? 0) + 1 })); nav({ page: 'locker', tab: 'todo', sel: route.sel }); focusLater('.vt .ptable tbody tr[tabindex="0"]') }
  useEffect(() => { if (armar) enterArmar() }, [armar])

  // foco al entrar (sección 4, "Selección al entrar") y al volver de una ficha
  useEffect(() => {
    if (armar) return
    const from = FROM.get(route)
    if (from) { FROM.delete(route); focusLater(from); return }
    if (wide && picked != null && att.some(a => a.pid === picked)) focusLater(`.vt-att-row[data-pid="${picked}"] .vt-att-pick`)
    else if (wide && picked != null) focusLater(`.vt .ptable tr[data-pid="${picked}"]`)
    else if (att.length) focusLater('.vt-att-row .vt-att-pick')
    else focusLater('.vt-filters button[aria-pressed=true]')
  }, [])
  // alto de la barra masiva (sticky): las filas con foco no quedan debajo de ella
  useLayoutEffect(() => {
    const el = root.current, bb = el?.querySelector<HTMLElement>('.bulkbar:not(.idle)')
    el?.style.setProperty('--bulkbar-h', `${bb ? Math.round(bb.getBoundingClientRect().height) + 8 : 0}px`)
  })
  // alto de lo fijo de arriba: el panel no pasa del alto visible
  useEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    const set = () => main.style.setProperty('--vt-top', `${Math.max(0, Math.round(main.getBoundingClientRect().top))}px`)
    set(); window.addEventListener('resize', set)
    return () => { window.removeEventListener('resize', set); main.style.removeProperty('--vt-top') }
  }, [])

  const openTalk = (pid: number, origin: 'att' | 'card') => setTalk({ pid, origin })
  const closeTalk = (r?: { kind: 'talked' | 'listed'; note?: LRes }) => {
    const t = talk
    setTalk(null)
    refresh()
    if (!t) return
    const row = `.vt-att-row[data-pid="${t.pid}"]`
    if (t.origin === 'att') {
      if (!r) focusLater(`${row} .vt-att-talk`, `${row} .vt-att-pick`, '#vt-att-t')
      else if (r.kind === 'talked') focusLater(`${row} .vt-att-pick`, '#vt-att-t')
      else { setAttNote({ pid: t.pid, r: r.note! }); setPageNote(r.note!); focusLater(`${row} .vt-att-note .ib-result`, '#vt-att-t') }
    } else {
      if (!r) focusLater('.vt-card .vt-card-talk', '.vt-card #vt-card-h-talk')
      else if (r.kind === 'talked') focusLater('.vt-card #vt-card-h-talk')
      else { setCardNote(r.note!); focusLater('.vt-card .vt-card-note .ib-result', '.vt-card #vt-card-h-talk') }
    }
  }
  // "Declararlo transferible" en una fila de "Para atender" (charla usada): nota en la fila; si la fila se fue, en la pantalla
  const listFromRow = (p: Player) => {
    const note = { text: listedNote(p.name, letGoInfo(g, p), !!p.wantsOut) }
    setListed(g, p.id, true)
    setAttNote({ pid: p.id, r: note }); setPageNote(note)
    save().then(ok => { if (!ok) { setAttNote(a => (a ? { ...a, r: { ...a.r, saveErr: true } } : a)); setPageNote(n => (n ? { ...n, saveErr: true } : n)) } })
    refresh()
    focusLater(`.vt-att-row[data-pid="${p.id}"] .vt-att-note .ib-result`, '#vt-att-t')
  }

  const list = tab === 'reserva' ? sq.filter(p => p.reserve) : tab === 'juveniles' ? sq.filter(p => p.status === 'young') : sq
  const counts = [sq.length, sq.filter(p => p.reserve).length, sq.filter(p => p.status === 'young').length]
  // el chip con foco entra entero en su fila desplazable (en el celular)
  const chips = <div style={{ display: 'contents' }} onFocus={e => (e.target as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' })}><Seg className="seg vt-filters" roving label="Filtro del plantel" value={FILTERS.findIndex(f => f[0] === tab)} options={FILTERS.map(f => f[1])}
    cnt={counts.map((n, i) => ({ n, vh: i === 0 ? 'jugadores' : i === 1 ? 'anotados' : 'con rol Promesa' }))} onChange={i => setTab(FILTERS[i][0])} /></div>
  const empty = tab === 'reserva' ? <div className="mk-empty vt-empty">Nadie anotado en la reserva: juega los miércoles con al menos siete sanos. <button className="btn sm" onClick={enterArmar}>Armar la reserva</button></div>
    : tab === 'juveniles' ? <div className="mk-empty vt-empty">No tenés jugadores con rol Promesa. Los juveniles de inferiores suben al empezar cada temporada.</div> : 'No hay jugadores.'
  const day = shortDay(res.day, g.date)
  const resmode = view === 'reserva' && <div className="vt-resmode">
    <span className="vt-resmode-t">{phone ? <>Tocá «Anotar» en cada jugador. Hacen falta al menos 7 sanos: juega el <b>{day}</b>.</>
      : <>Anotá al menos 7 sanos: juega el <b>{day}</b>. Con el teclado, <kbd>Espacio</kbd> marca la fila y «A la reserva» anota a los marcados.</>}</span>
    <span className={`vt-resmode-n ${res.fit < res.min ? 'short' : ''}`}>{res.fit < res.min && MI.bang}<span><b>{res.marked}</b> {res.marked === 1 ? 'anotado' : 'anotados'} · <b>{res.min}</b> sanos como mínimo</span></span>
  </div>
  const onPick = (p: Player) => pick(p.id, `.vt .ptable tr[data-pid="${p.id}"]`)
  const tp = talk ? g.players[talk.pid] : undefined
  return (
    <div className="page vt" ref={root}>
      <PageTip id="locker" />
      <h1 className="vt-title">Vestuario</h1>
      <Head g={g} hm={hm} res={res} day={day} busy={busy} onArmar={enterArmar} openPlayer={openPlayer} />
      <div className={`vt-main ${wide ? 'wide' : ''}`}>
        <div className="vt-col">
          <section className="card vt-att" aria-labelledby="vt-att-t">
            <h2 className="vt-att-t" id="vt-att-t" tabIndex={-1}>Para atender <span className="mk-cnt">{att.length}<span className="vh"> {att.length === 1 ? 'jugador' : 'jugadores'}</span></span></h2>
            {pageNote && !att.some(a => a.pid === attNote?.pid) && <F7 r={pageNote} cls="vt-att-note vt-page-note" />}
            {att.length ? <ul className="vt-att-list" aria-labelledby="vt-att-t">
              {att.map(a => <AttRow key={a.pid} a={a} p={g.players[a.pid]} picked={picked === a.pid} wide={wide} busy={busy} note={attNote?.pid === a.pid ? attNote.r : null}
                onPick={() => pick(a.pid, `.vt-att-row[data-pid="${a.pid}"] .vt-att-pick`)} onTalk={() => openTalk(a.pid, 'att')} onList={() => listFromRow(g.players[a.pid])}
                onSeeListed={() => { FROM.set(route, `.vt-att-row[data-pid="${a.pid}"] .vt-att-pick`); nav({ page: 'squad', tab: 'transferibles' }) }} />)}
            </ul> : <div className="ib-block-h none">{MI.ok}<span><b>Nadie para atender:</b> todos juegan lo que esperan y no hay promesas en curso.</span></div>}
          </section>
          <section className="card vt-table" aria-label="Plantel">
            <PlayerTable id="locker" players={list} views={['vestuario', 'reserva', 'general', 'contrato']} def="vestuario" bulk={ownBulk(g)} filters={false} limit={60}
              onPick={onPick} picked={picked} gridLabel="Plantel" bar={chips} head={resmode} mode={mode} busy={busy} empty={empty} onView={setView} openTab="personal" />
          </section>
        </div>
        {wide && <aside className={`card vt-panel ${picked == null && !gone ? 'none' : ''}`} aria-label="Detalle del jugador">
          {gone ? <div className="ib-who gone"><span className="grow">{gone.name} ya no está en el plantel.</span><button className="btn sm" onClick={() => openPlayer(gone.id)}>Ver la ficha</button></div>
            : picked != null ? <LockerCard key={picked} p={g.players[picked]} where="panel" busy={busy} onTalk={() => openTalk(picked, 'card')} note={cardNote} setNote={setCardNote} />
            : <Summary />}
        </aside>}
      </div>
      {tp && <TalkModal p={tp} onClose={closeTalk} />}
    </div>
  )
}

/** Encabezado: armonía, qué la mueve, referentes y la reserva (`@container vt-head`; por debajo de 560 px, disclosures). */
function Head({ g, hm, res, day, busy, onArmar, openPlayer }: { g: ReturnType<typeof useGame>['g']; hm: ReturnType<typeof harmony>; res: ReturnType<typeof reserveOf>; day: string; busy: boolean; onArmar: () => void; openPlayer: (id: number) => void }) {
  const ref = useRef<HTMLElement>(null)
  const [w, setW] = useState(1200)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const scale = Math.max(1, parseFloat(getComputedStyle(document.documentElement).fontSize) / 14 || 1)
  const compact = w < 560 * scale
  const v = hm.value, word = harmonyWord(v), fx = (harmonyBoost(g) - 1) * 100
  const fxWord = fx >= 0.5 ? 'rinde un poco más' : fx <= -0.5 ? 'rinde un poco menos' : 'sin efecto notable'
  const pt = hm.parts, nU = -pt.unhappy / 3, nT = -pt.temper / 3
  const start = squadOf(g, g.userClubId).every(p => (p.recent?.length ?? 0) < 2)
  const parts = <dl className="vt-parts">
    <div><dt>Conformidad promedio</dt><dd>{sgn(pt.base)}</dd></div>
    {pt.lead !== 0 && <div><dt>Referentes</dt><dd>{sgn(pt.lead)}</dd></div>}
    {nU > 0 && <div><dt><b>{nU}</b> {nU === 1 ? 'disconforme' : 'disconformes'}</dt><dd>{sgn(pt.unhappy)}</dd></div>}
    {nT > 0 && <div><dt><b>{nT}</b> {nT === 1 ? 'temperamental disconforme' : 'temperamentales disconformes'}</dt><dd>{sgn(pt.temper)}</dd></div>}
    {pt.clip !== 0 && <div className="vt-parts-clip"><dt>Tope de la escala</dt><dd>{sgn(pt.clip)}</dd></div>}
    <div className="vt-parts-total"><dt>Armonía</dt><dd>{v}</dd></div>
  </dl>
  const leads = <div className="vt-leads">
    {hm.leaders.map(p => { const ok = (p.happy ?? 70) >= 50; return <div key={p.id} className="vt-lead"><Face p={p} size={24} /><button className="linkish vt-lead-n" data-pid={p.id} onClick={() => openPlayer(p.id)}>{p.name}</button>
      <span className={`vt-lead-st ${ok ? '' : 'minus'}`}>{!ok && MI.bang}{ok ? 'Acompaña' : 'Resta'}</span></div> })}
    <details className="vt-disc"><summary>Cómo se eligen{MI.next}</summary><p>Son los tres sanos con más liderazgo, edad y rol en el plantel. Con conformidad 50 o más suman armonía; por debajo, restan.</p></details>
  </div>
  return <section className={`card vt-head ${compact ? 'compact' : ''}`} ref={ref} aria-label="Cómo está el grupo">
    <div className="vt-head-g">
      <div className="vt-gauge"><Gauge v={v} cuts={[25, 45, 70]} tone={harmonyTone(v)} aria={`Armonía ${v} de 100: ${word.toLowerCase()}`} size={compact ? [96, 58] : [120, 72]} /></div>
      <div className="vt-head-s">
        <div className="vt-hstate">{word}</div>
        <div className="vt-hsub">Armonía <b>{v}</b> de 100</div>
        <div className="vt-hsub">En la cancha: {fxWord} (<b>{fx > 0 ? '+' : fx < 0 ? '−' : ''}{dec(Math.abs(fx), 1)} %</b>)</div>
        {start && <div className="mk-note">{MI.info}<span>La conformidad empieza a moverse en el tercer partido de cada jugador.</span></div>}
      </div>
    </div>
    {compact ? <div className="vt-head-d">
      <details className="vt-disc big"><summary>Qué la mueve{VI.down}</summary>{parts}</details>
      <details className="vt-disc big"><summary>Referentes{VI.down}</summary>{leads}</details>
    </div> : <>
      <div className="vt-cell"><div className="vt-head-l">Qué la mueve</div>{parts}</div>
      <div className="vt-cell"><div className="vt-head-l">Referentes</div>{leads}</div>
    </>}
    <div className={`vt-res-line ${res.marked && res.fit < res.min ? 'short' : ''}`}>
      <span className="vt-res-txt">{!res.marked ? <span className="dim">Reserva: sin anotados (no se juega).</span>
        : res.fit < res.min ? <>{MI.bang}<span>Reserva: <b>{res.fit} {res.fit === 1 ? 'anotado y sano' : 'anotados y sanos'}</b>, faltan {res.min - res.fit} para el <b>{day}</b></span></>
        : <span>Reserva: <b>{res.marked} anotados</b> (mínimo {res.min}) · juega el <b>{day}</b></span>}</span>
      <button className="btn sm vt-res-go" onClick={onArmar}>Armar la reserva</button>
      {busy && <span className="ib-help">Frená el avance para hablar con el plantel.</span>}
    </div>
  </section>
}

/** Una fila de "Para atender": el botón de fila elige (o abre la ficha › Vestuario) y la acción hermana va al lado, nunca adentro. */
function AttRow({ a, p, picked, wide, busy, note, onPick, onTalk, onList, onSeeListed }: { a: ReturnType<typeof attentionOf>[number]; p: Player; picked: boolean; wide: boolean; busy: boolean; note: LRes | null
  onPick: () => void; onTalk: () => void; onList: () => void; onSeeListed: () => void }) {
  const { g } = useGame()
  const [r0, ...more] = a.reasons
  const ts = talkState(g, p), oa = outActions(g, p)
  const out = r0.k === 'out', outL = r0.k === 'outListed'
  const usedOut = out && !ts.can
  const lgId = `vt-lg-${p.id}`
  let act: ReactNode = null
  if (out && !ts.can) act = oa.list.ok ? <button className="btn sm vt-att-lst" disabled={busy} aria-describedby={lgId} onClick={onList}>Declararlo transferible</button> : null
  else if (ts.can) act = <button className="btn sm vt-att-talk" disabled={busy} onClick={onTalk}>Hablar</button>
  else act = <TalkSt text={ts.long} />
  return <li className={`vt-att-row ${r0.decide ? 'dec' : ''}`} data-pid={p.id}>
    <button className="vt-att-pick" aria-current={picked || undefined} onClick={onPick}>
      <Face p={p} size={32} />
      <span className="vt-att-txt">
        <span className="vt-att-l1"><span className="vt-att-who"><span className="vt-att-n">{p.name}</span><span className="vt-att-r"> · {roleOf(p)}</span></span><ReasonChip r={r0} />{!wide && <span className="vt-att-chev" aria-hidden="true">{MI.next}</span>}</span>
        <span className="vt-att-c">{bnum(r0.cause)}</span>
        <span className="vt-att-k">{r0.then}{r0.due && <span className="ib-due">No vence</span>}</span>
        {more.length > 0 && <span className="vt-att-more">{more.map(r => <ReasonChip key={r.k} r={r} />)}</span>}
      </span>
    </button>
    <div className="vt-att-act">{act}{outL && <button className="btn sm vt-att-see" onClick={onSeeListed}>Ver transferibles en Plantel{MI.next}</button>}
      {busy && (ts.can || usedOut) && <span className="ib-help">Frená el avance para hablar con el plantel.</span>}</div>
    {usedOut && <div className="vt-att-x">
      <p className="vt-att-on">{bnum(oa.note)}</p>
      {oa.list.ok && <LetGo info={letGoInfo(g, p)} id={lgId} />}
    </div>}
    <F7 r={note} cls="vt-att-note" />
  </li>
}

/** Panel sin elegido: el resumen del grupo y las promesas vigentes. */
function Summary() {
  const { g, openPlayer } = useGame()
  const prom = squadOf(g, g.userClubId).filter(p => p.promise).map(p => ({ p, s: promiseStatus(g, p)! }))
  return <div className="vt-none">
    <span className="msg-ico">{TAG_ICON.club}</span>
    <p>Elegí un jugador de la lista o de la tabla para ver por qué está así y hablar con él.</p>
    <h3 className="vt-card-h">Promesas vigentes</h3>
    {prom.length ? <div className="vt-proms">{prom.map(({ p, s }) => <div key={p.id} className="vt-prom"><button className="linkish" data-pid={p.id} onClick={() => openPlayer(p.id)}>{p.name}</button><span className="vt-prom-d">hasta el {fmtDay(s.until)}</span><Verdict s={s} /></div>)}</div>
      : <p className="vt-prom-d">No hay promesas en curso.</p>}
  </div>
}
function Verdict({ s, long }: { s: NonNullable<ReturnType<typeof promiseStatus>>; long?: boolean }) {
  if (s.played < 2) return <span className="mk-verdict vt-wait">{MI.clock}Todavía no jugó lo suficiente para medirla</span>
  if (s.onTrack) return <span className="mk-verdict ok">{MI.ok}Va bien</span>
  if (!s.reachable) return <span className="mk-verdict no">{MI.x}Ya no llega</span>
  return <span className="mk-verdict maybe">{MI.bang}{long ? `En riesgo: le faltan ${s.minutesNeeded} minutos en ${s.matchesLeft} ${s.matchesLeft === 1 ? 'partido' : 'partidos'}` : 'En riesgo'}</span>
}

// ---------- detalle de vestuario de un jugador (panel y ficha › Vestuario) ----------
export function LockerCard({ p, where, busy, onTalk, note, setNote }: { p: Player; where: 'panel' | 'page'; busy: boolean; onTalk: () => void; note: LRes | null; setNote: Dispatch<SetStateAction<LRes | null>> }) {
  const { g, save, refresh, nav, openPlayer } = useGame()
  if (p.clubId !== g.userClubId) return <div className="vt-card"><div className="ib-who gone"><span className="grow">{p.name} ya no está en el plantel.</span><button className="btn sm" onClick={() => openPlayer(p.id)}>Ver la ficha</button></div></div>
  const m = minutesOf(g, p), mo = moodOutlook(g, p, m), md = moodOf(p.happy), cause = moodCause(g, p), ps = promiseStatus(g, p)
  const ts = talkState(g, p), oa = outActions(g, p), lg = letGoInfo(g, p), res = reserveOf(g), tr = persTraits(g, p)
  const out = !!p.wantsOut, canList = out && oa.list.ok
  const lgId = `vt-lg-card-${p.id}`
  const list = () => {
    setListed(g, p.id, true)
    setNote({ text: listedNote(p.name, lg, out) }); saveNote(save, setNote); refresh()
    focusLater('.vt-card .vt-card-note .ib-result')
  }
  const toggleRes = () => { setReserve(g, [p.id], !p.reserve); save(); refresh() }
  const since = outDateOf(g, p)
  const wait = busy && <span className="ib-help">Frená el avance para hablar con el plantel.</span>
  const why = <section className="vt-card-sec">
    <h3 className="vt-card-h">Por qué está así</h3>
    <dl className="vt-dl">
      <div><dt>Minutos</dt><dd><MinsBar m={m} /></dd></div>
      {m.recent.length > 0 && <div><dt>Últimos {m.recent.length}</dt><dd className="vt-last">{m.recent.join(' · ')}</dd></div>}
      <div><dt>Conformidad</dt><dd className="col"><MoodBar v={p.happy ?? 70} /><Trend t={mo.trend} idle={mo.idle} /></dd></div>
      {mo.canAskOut && <div className="vt-dl-wide"><dd><span className="mk-note warn">{MI.bang}<span>Puede pedir irse después del próximo partido (cada semana, una chance en dos).</span></span></dd></div>}
      <div><dt>Moral</dt><dd><MoraleBar v={p.morale} /></dd></div>
      {cause.kind !== 'minutes' && <div><dt>Causa</dt><dd>{cause.text}</dd></div>}
    </dl>
    <details className="vt-disc"><summary>¿Moral o conformidad?{MI.next}</summary><p>La moral sube y baja con los resultados, la prensa y las charlas; la conformidad, con sus minutos y su rol.</p></details>
  </section>
  const pers = <section className="vt-card-sec"><h3 className="vt-card-h">Personalidad</h3><Traits traits={tr.traits} /></section>
  const prom = ps && <section className="vt-card-sec">
    <h3 className="vt-card-h">Promesa</h3>
    <p className="vt-p">Le prometiste jugar alrededor del <b>{pc(ps.target)} %</b> hasta el <b>{fmtDay(ps.until)}</b>. Cumplís si juega al menos el <b>{pc(ps.pass)} %</b>.{' '}
      {ps.played ? <>Lleva <b>{pc(ps.got)} %</b> en {ps.played} {ps.played === 1 ? 'partido' : 'partidos'}; {ps.reachable ? <>le faltan <b>{ps.minutesNeeded} minutos</b> en {ps.matchesLeft === 1 ? 'el partido que queda' : `los ${ps.matchesLeft} partidos que quedan`}.</> : 'aunque juegue todo, ya no llega.'}</> : 'Todavía no jugó desde que se lo prometiste.'}</p>
    {ps.played > 0 && <MinsBar m={m} promise={{ got: ps.got, pass: ps.pass, bad: ps.played >= 2 && !ps.onTrack }} />}
    <Verdict s={ps} long />
    {ps.extended ? <div className="mk-note">{MI.info}<span>El plazo se corrió al <b>{fmtDay(ps.until)}</b>: jugó menos de 2 partidos.</span></div>
      : <div className="mk-note">{MI.info}<span>Si para el {fmtDay(ps.until)} jugó menos de 2 partidos, el plazo se corre 14 días.</span></div>}
  </section>
  const outSec = out && <section className="vt-card-sec">
    <h3 className="vt-card-h">Pedido de salida</h3>
    <p className="vt-p">Quiere irse{since ? <> desde el <b>{fmtDay(since)}</b></> : ''} ({cause.kind === 'freed' ? 'desde que le dijiste que podía buscar club' : `juega ${pc(m.got)} % y espera ${pc(m.expected)} %`}). No vence.</p>
    {p.listed && <p className="vt-p vt-listed">{MI.swap}Está declarado transferible.</p>}
  </section>
  const talkSec = <section className="vt-card-sec">
    <h3 className="vt-card-h" id="vt-card-h-talk" tabIndex={-1} aria-describedby={ts.can ? undefined : 'vt-card-ts'}>Charla</h3>
    {ts.can ? <>
      <div className="ib-acts"><button className="btn primary vt-card-talk" disabled={busy} onClick={onTalk}>Hablar con él</button>
        {canList && <button className="btn vt-card-list" disabled={busy} aria-describedby={lgId} onClick={list}>Declararlo transferible</button>}</div>
      {wait}
      {canList && <LetGo info={lg} id={lgId} />}
    </> : <>
      <TalkSt text={ts.withReply} big id="vt-card-ts" />
      {canList && <><div className="ib-acts"><button className="btn primary vt-card-list" disabled={busy} aria-describedby={lgId} onClick={list}>Declararlo transferible</button></div>{wait}<LetGo info={lg} id={lgId} /></>}
      {out && !canSell(p) && <p className="vt-p dim">{oa.note}</p>}
    </>}
    {out && ts.can && !canSell(p) && <p className="vt-p dim">{oa.note}</p>}
    <F7 r={note} cls="vt-card-note" />
    <div><button className="btn sm" onClick={() => nav({ page: 'player', id: p.id, tab: 'contrato' })}>Contrato y renovación{MI.next}</button></div>
  </section>
  const resSec = <section className="vt-card-sec">
    <h3 className="vt-card-h">Reserva</h3>
    <div className="vt-res-row"><button className={`btn sm vt-res ${p.reserve ? 'on' : ''}`} aria-pressed={!!p.reserve} disabled={busy} onClick={toggleRes}>{p.reserve ? '✓ Anotado en la reserva' : 'Anotar en la reserva'}</button>
      <span className="vt-res-side">{res.fit < res.min ? <>{MI.bang}La reserva no se juega con menos de {res.min} anotados y sanos (hoy {res.fit})</> : <>Juega el {shortDay(res.day, g.date)}</>}</span></div>
  </section>
  const log = where === 'page' && <section className="vt-card-sec vt-card-log">
    <h3 className="vt-card-h">Charlas y promesas</h3>
    {(p.talks?.length ?? 0) === 0 && <p className="vt-p dim">Todavía no hablaste con él.</p>}
    {((p.talks?.length ?? 0) > 0 || (p.promiseLog?.length ?? 0) > 0) && <div className="mk-hist vt-hist">
      {[...(p.talks ?? [])].reverse().map((t, i) => <div key={`t${i}`} className="mk-hist-row"><span className="mk-hist-d">{fmtDay(t.date)}</span><span className="mk-hist-t">{KIND_NAME[t.kind]} · <span className={`vt-reply-w ${t.reply === 'Le convenció' ? 'ok' : t.reply === 'Lo tomó mal' ? 'x' : ''}`}>{t.reply === 'Le convenció' ? MI.ok : t.reply === 'Lo tomó mal' ? MI.x : VI.flat}{t.reply}</span></span></div>)}
      {[...(p.promiseLog ?? [])].reverse().map((e, i) => <div key={`p${i}`} className="mk-hist-row"><span className="mk-hist-d">{fmtDay(e.made)}</span><span className="mk-hist-t">{e.result === 'extended' ? <span className="vt-reply-w">{MI.clock}El plazo se corrió al {fmtDay(e.until)}</span>
        : <>Prometiste {pc(e.target)} % hasta el {fmtDay(e.until)}{e.result ? <>: jugó {pc(e.got ?? 0)} %, <span className={`vt-reply-w ${e.result === 'kept' ? 'ok' : 'x'}`}>{e.result === 'kept' ? MI.ok : MI.x}{e.result === 'kept' ? 'cumpliste' : 'no cumpliste'}</span></> : ' (vigente)'}</>}</span></div>)}
    </div>}
  </section>
  return <div className={`vt-card ${where}`}>
    {where === 'panel' && <div className="vt-card-top"><Face p={p} size={52} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="vt-card-id"><button className="linkish vt-card-name" data-pid={p.id} onClick={() => openPlayer(p.id)}>{p.name}</button><PosPill p={p} /><span className="vt-card-role">{roleOf(p)}</span></div>
        <div className="vt-card-st">{out && <><b>Quiere irse</b> · </>}<b>{md.word}</b> <span className="dim">({md.n})</span></div>
      </div></div>}
    <div className="vt-card-cols">
      <div className="vt-card-c">{why}{pers}</div>
      <div className="vt-card-c">{prom}{outSec}{talkSec}{resSec}</div>
    </div>
    {log}
    {where === 'panel' && <div><button className="btn sm" onClick={() => openPlayer(p.id)}>Ver la ficha{MI.next}</button></div>}
  </div>
}

// ---------- charla individual (F5) ----------
type Stage = 'pick' | 'confirm' | 'reply'
/**
 * La charla: opciones, reglas y rasgos de `talkOptions` (sin veredicto), confirmación en el lugar para lo que deja una obligación (F6),
 * y la respuesta con antes → después de `talkResult`. Esc o "Cancelar" cierran sin gastar la charla mientras no se haya elegido.
 * `onClose()`: sin hablar; `{ kind: 'talked' }`: después de hablar; `{ kind: 'listed', note }`: lo declaró transferible desde "Ya hablaron".
 */
export function TalkModal({ p, onClose }: { p: Player; onClose: (r?: { kind: 'talked' | 'listed'; note?: LRes }) => void }) {
  const { g, save, refresh } = useGame()
  const [can] = useState(() => talkState(g, p).can)
  const [opts] = useState<TalkOption[]>(() => talkOptions(g, p).filter(o => o.shown))
  const first = opts.find(o => !o.disabled)?.kind ?? null
  const [sel, setSel] = useState<TalkKind | null>(null)
  const [focusK, setFocusK] = useState<TalkKind | null>(first)
  const [ns, setNs] = useState<SquadStatus>(p.status ?? 'sub')
  const [stage, setStage] = useState<Stage>('pick')
  const [res, setRes] = useState<TalkResult | null>(null)
  const [saveErr, setSaveErr] = useState(false)
  const replyRef = useRef<HTMLDivElement>(null), confRef = useRef<HTMLButtonElement>(null), optsRef = useRef<HTMLDivElement>(null)
  const mine = p.clubId === g.userClubId
  const h = p.happy ?? 70, md = moodOf(h), m = minutesOf(g, p), tr = persTraits(g, p), ctx = talkContext(g, p), ps = promiseStatus(g, p)
  const opt = opts.find(o => o.kind === sel)
  const sameRole = sel === 'status' && ns === (p.status ?? 'sub')
  const ready = !!opt && !opt.disabled && !sameRole
  const talked = !!res?.after
  const done = (r?: { kind: 'talked' | 'listed'; note?: LRes }) => onClose(r ?? (talked ? { kind: 'talked' } : undefined))
  useEffect(() => { if (stage === 'reply') replyRef.current?.focus(); else if (stage === 'confirm') confRef.current?.focus() }, [stage])
  const speak = () => {
    if (!opt) return
    const r = talkResult(g, p, opt.kind, opt.kind === 'status' ? ns : undefined)
    setRes(r); setStage('reply')
    save().then(ok => { if (!ok) setSaveErr(true) }); refresh()
  }
  const go = () => { if (!ready) return; if (opt!.cost) setStage('confirm'); else speak() }
  const back = () => { setStage('pick'); setTimeout(() => optsRef.current?.querySelector<HTMLElement>('[role=radio][aria-checked=true]')?.focus()) }
  const choose = (k: TalkKind) => { setSel(k); setFocusK(k); if (stage === 'confirm') setStage('pick') }
  const enabled = opts.filter(o => !o.disabled)
  const onOptsKey = (e: RKey) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) return
    if ((e.target as HTMLElement).getAttribute('role') !== 'radio') return
    const i = enabled.findIndex(o => o.kind === focusK)
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (focusK) choose(focusK); return }
    e.preventDefault()
    const j = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length
    const k = enabled[j].kind
    choose(k)
    setTimeout(() => optsRef.current?.querySelector<HTMLElement>(`[data-k="${k}"]`)?.focus())
  }
  const who = (o: TalkOption) => o.kind === 'praise' ? <>Viene con promedio <b>{dec(ctx.form, 1)}</b>{ctx.goals ? <> y <b>{ctx.goals}</b> {ctx.goals === 1 ? 'gol' : 'goles'}</> : null}.</>
    : o.traits.length ? <>Él: {o.traits.map((t, i) => <span key={t.key}>{i > 0 && ', '}<b>{t.text.toLowerCase()}</b></span>)}.</> : null
  const rule = (o: TalkOption) => {
    if (o.kind === 'promise' && o.extra) return <>Hasta el <b>{fmtDay(o.extra.until!)}</b>, jugar alrededor del <b>{pc(o.extra.target!)} %</b>: cumplís si juega al menos el <b>{pc(o.extra.pass!)} %</b>. {o.extra.matches === 1 ? 'Queda 1 partido' : `Quedan ${o.extra.matches} partidos`} en ese plazo. {o.rule}</>
    return o.rule
  }
  const stName = (k: SquadStatus) => STATUS[k].name
  const off = opts.filter(o => o.disabled)
  const confirmText = !opt ? null : opt.kind === 'promise' ? <>Le vas a prometer jugar el <b>{pc(opt.extra!.target!)} %</b> hasta el <b>{fmtDay(opt.extra!.until!)}</b>. Si no cumplís, se va a sentir engañado y el plantel lo nota.</>
    : opt.kind === 'status' ? <>Pasa a ser <b>{stName(ns).toLowerCase()}</b>: va a esperar jugar el <b>{pc(STATUS[ns].share)} %</b> (hoy juega el {pc(m.got)} %). {STATUS[ns].lvl > STATUS[p.status ?? 'sub'].lvl ? 'Si no le das esos minutos, se va a molestar más rápido.' : 'Bajarle el rol lo molesta: más si es ambicioso o temperamental.'}</>
    : opt.kind === 'free' && opt.letGo ? <>Queda declarado transferible. {opt.letGo.talk.becomesOut ? <>Como no lo pidió, conformidad <b>{sgn(opt.letGo.talk.happy)}</b> y moral <b>{sgn(opt.letGo.talk.morale)}</b>, y pasa a querer irse.</> : <>Como lo pidió, conformidad <b>{sgn(opt.letGo.talk.happy)}</b> y moral <b>{sgn(opt.letGo.talk.morale)}</b>.</>}</> : null
  const confirmLabel = !opt ? '' : opt.kind === 'promise' ? 'Confirmar: prometerle minutos' : opt.kind === 'status' ? `Confirmar: cambiarle el rol a ${stName(ns).toLowerCase()}` : 'Confirmar: decirle que puede buscar club'
  const lg = letGoInfo(g, p), oa = outActions(g, p)
  const listNow = () => { setListed(g, p.id, true); const note: LRes = { text: listedNote(p.name, lg, !!p.wantsOut) }; save().then(ok => { if (!ok) note.saveErr = true }); refresh(); onClose({ kind: 'listed', note }) }
  return (
    <Modal onClose={() => { if (stage === 'confirm') back(); else done() }}>
      <div className="vt-talk">
        <div className="vt-talk-h"><Face p={p} size={52} /><div className="grow" style={{ minWidth: 0 }}><h2>Charla con {p.name}</h2>
          <div className="vt-talk-m">{POS_LABEL[p.positions[0]]} · {roleOf(p)} · <b>{md.word}</b> ({md.n}) · moral {Math.floor(p.morale)}{p.wantsOut && <> · <b>Quiere irse</b></>}</div></div>
          <button className="btn sm icon" aria-label="Cerrar la charla" title="Cerrar (Esc)" onClick={() => done()}>{MI.x}</button></div>
        {!mine ? <><p className="vt-p dim">Ya no está en el plantel.</p><div className="vt-talk-foot"><span className="grow" /><button className="btn primary" data-autofocus onClick={() => done()}>Listo</button></div></>
        : stage === 'reply' && res ? <div className="vt-reply" role="status" tabIndex={-1} ref={replyRef}>
            <blockquote className="mk-ask">{res.text}</blockquote>
            {res.before && res.after && <table className="mk-impact"><tbody>
              <tr><th scope="row">Conformidad</th><td><span className="b4">{Math.floor(res.before.happy)}</span><span className="mk-arr">{MI.arrow}<span className="vh"> pasa a </span></span><b>{Math.floor(res.after.happy)}</b></td><td><span className="vt-impw">{moodOf(res.after.happy).word}</span></td></tr>
              <tr><th scope="row">Moral</th><td><span className="b4">{Math.floor(res.before.morale)}</span><span className="mk-arr">{MI.arrow}<span className="vh"> pasa a </span></span><b>{Math.floor(res.after.morale)}</b></td><td><span className="vt-impw">{moraleOf(res.after.morale).word}</span></td></tr>
            </tbody></table>}
            {res.changes.length > 0 && <div className="ib-facts">{res.changes.map(c => <div key={c} className="ib-fact ok">{MI.ok}{c}</div>)}</div>}
            {saveErr && <div className="ib-result err"><span className="ib-result-ico">{MI.bang}</span><span>No se pudo guardar la partida. La charla quedó hecha en esta sesión; probá exportar la partida desde Ajustes.</span></div>}
            <div className="vt-talk-foot"><span className="grow" /><button className="btn primary" onClick={() => done()}>Listo</button></div>
          </div>
        : !can ? <>
            <TalkSt text={talkState(g, p).withReply} big />
            {p.wantsOut && oa.list.ok && <LetGo info={lg} id="vt-lg-talk" />}
            <div className="vt-talk-foot"><span className="grow" />{p.wantsOut && oa.list.ok && <button className="btn" aria-describedby="vt-lg-talk" onClick={listNow}>Declararlo transferible</button>}<button className="btn primary" data-autofocus onClick={() => done()}>Listo</button></div>
          </>
        : <>
          <div className="vt-how">
            <div className="vt-how-l"><span className="vt-how-k">Minutos</span><MinsBar m={m} size="sm" /><span>{m.recent.length >= 2 ? <>Juega el <b>{pc(m.got)} %</b> de los minutos; su rol espera el <b>{pc(m.expected)} %</b>.</> : 'Sus minutos todavía no cuentan.'}</span></div>
            <div><Traits traits={tr.traits} inline />.{' '}{p.form.length ? <>Viene con promedio <b>{dec(ctx.form, 1)}</b> (últimos {p.form.length}).</> : 'Todavía no jugó.'}</div>
            {ps && <div className="vt-how-l">Promesa: {pc(ps.target)} % hasta el {fmtDay(ps.until)} · <Verdict s={ps} /></div>}
          </div>
          <div className="vt-opts-l" id="vt-opts-l">Qué le decís</div>
          <div className="vt-opts" role="radiogroup" aria-labelledby="vt-opts-l" ref={optsRef} onKeyDown={onOptsKey}>
            {opts.map(o => { const on = sel === o.kind, dis = !!o.disabled, ruleId = `vt-or-${o.kind}`, whoId = `vt-ow-${o.kind}`, w = who(o)
              return <div key={o.kind} data-k={o.kind} className="vt-opt" role="radio" aria-checked={on} aria-disabled={dis || undefined} tabIndex={dis ? -1 : o.kind === (sel ?? focusK) ? 0 : -1}
                data-autofocus={o.kind === first || undefined} aria-describedby={[ruleId, w ? whoId : '', o.kind === 'free' && on ? 'vt-lg-opt' : ''].filter(Boolean).join(' ')} onClick={() => !dis && choose(o.kind)}>
                <span className="vt-radio" aria-hidden="true" />
                <span className="vt-opt-b">
                  <span className="vt-opt-th"><span className="vt-opt-t">{o.title}</span>{o.cost && <span className="mk-st vt-cost">tiene costo</span>}</span>
                  {dis ? <span className="vt-opt-why" id={ruleId}>{MI.lock}{o.disabled}</span> : <span className="vt-opt-r" id={ruleId}>{rule(o)}</span>}
                  {w && !dis && <span className="vt-opt-who" id={whoId}>{w}</span>}
                  {on && o.kind === 'status' && <span className="vt-opt-extra" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                    <Seg label="Nuevo rol" value={STATUS_KEYS.indexOf(ns)} options={STATUS_KEYS.map(stName)} onChange={v => setNs(STATUS_KEYS[v])} />
                    <span>Va a esperar jugar el <b>{pc(STATUS[ns].share)} %</b> (hoy juega el {pc(m.got)} %).</span>
                  </span>}
                  {on && o.kind === 'free' && o.letGo && <span className="vt-opt-extra"><LetGo info={o.letGo} id="vt-lg-opt" /></span>}
                </span>
              </div> })}
          </div>
          {off.length > 0 && <div className="vt-opts-off">{MI.lock}<span>No disponibles ahora: {off.map(o => `${o.title} (${o.disabled!.replace(/\.$/, '').replace(/^./, c => c.toLowerCase())})`).join('; ')}.</span></div>}
          {stage === 'confirm' && opt ? <div className="ib-confirm vt-confirm">
              <p id="vt-conf-t">{confirmText}</p>
              <div className="vt-confirm-b"><button className="btn" onClick={back}>No</button><button className="btn primary" ref={confRef} aria-describedby="vt-conf-t" onClick={speak}>{confirmLabel}</button></div>
            </div>
            : <div className="vt-talk-foot"><span className="vt-talk-f">Una charla por semana con cada jugador.</span><span className="grow" />
              {!ready && <span className="ib-help" id="vt-talk-why">{sameRole ? 'Elegí un rol distinto del que tiene.' : 'Elegí qué decirle.'}</span>}
              <button className="btn" onClick={() => done()}>Cancelar</button><button className="btn primary vt-talk-go" aria-disabled={!ready || undefined} aria-describedby={!ready ? 'vt-talk-why' : undefined} onClick={go}>Hablar</button></div>}
        </>}
      </div>
    </Modal>
  )
}

/**
 * Negociación con el representante (F5). Compra: sobre un acuerdo con el club (`dealId`); la paciencia, los términos y las respuestas
 * se guardan en el trato (`openNegotiation`, `sendTerms`) y el pase se ejecuta recién con "Confirmar: fichar…" (`signDeal`).
 * Renovación: `demand` y `evalOffer` del motor; si se levanta, `renewWalk`. La ventana no escribe en `g`.
 */
export function NegotiationModal({ p, mode, dealId, onClose }: { p: Player; mode: NegMode; dealId?: number; onClose: (m?: { text: string; tone: 'ok' | 'warn' | 'err' }) => void }) {
  const { g, save, refresh } = useGame()
  const me = g.clubs[g.userClubId]
  const buy = mode === 'buy' && dealId != null
  const deal = buy ? (g.deals ?? []).find(d => d.id === dealId) : undefined
  // abrir la mesa fija lo que pide el representante y su paciencia (la primera vez); después la retoma como quedó
  const [start] = useState(() => (buy ? openNegotiation(g, dealId!) : null))
  const [renewDem] = useState(() => (buy ? null : demand(g, p, 'renew', naturalStatusFor(g, p))))
  useEffect(() => { if (start) { save(); refresh() } }, [])
  const ask = (start?.demand ?? renewDem!).terms
  const [offer, setOffer] = useState<Terms>(() => start?.terms ?? { ...ask, wage: Math.round((ask.wage * 0.9) / 100) * 100, bonus: Math.round((ask.bonus * 0.6) / 1000) * 1000 })
  const [log, setLog] = useState<string[]>(() => start?.log ?? [])
  const [agreed, setAgreed] = useState<Terms | null>(() => (deal?.neg?.agreed && start && sameT(deal.neg.agreed, start.terms) ? deal.neg.agreed : null))
  const [over, setOver] = useState<null | { text: string; tone: 'ok' | 'warn' | 'err' }>(null)
  const [warn, setWarn] = useState<string | null>(null)
  const pat = buy ? deal?.neg?.patience ?? start?.patience ?? 0 : renewDem!.patience
  const word = patienceWord(pat)
  const set = (k: keyof Terms, v: number | string) => { if (over) return; setOffer({ ...offer, [k]: v }); setAgreed(null); setWarn(null) }
  const logRef = useRef<HTMLDivElement | null>(null), endRef = useRef<HTMLDivElement | null>(null)
  // al terminar (firmó, renovó o se levantó de la mesa) el botón que tenía el foco desaparece: el foco va al resultado, dentro de la ventana
  useEffect(() => { if (over) endRef.current?.querySelector<HTMLElement>('.ib-result')?.focus() }, [over])
  const send = () => {
    const r = buy ? sendTerms(g, dealId!, offer) : evalOffer(g, p, 'renew', offer, renewDem!)
    if (!r) { setOver({ text: 'Este acuerdo ya no está abierto.', tone: 'warn' }); return }
    if (r.ok) setAgreed({ ...offer })
    else if (r.walk) {
      if (!buy) renewWalk(g, p.id)
      const until = buy ? (g.deals ?? []).find(d => d.id === dealId)?.blockUntil : undefined
      setOver({ text: `${r.msg} ${buy ? `La operación se cayó. No podés volver a ofertar por él hasta el ${until ? fmtDay(until) : ''}.` : `No va a volver a sentarse a negociar hasta el ${p.negBlock ? fmtDay(p.negBlock) : ''}.`}`, tone: 'err' })
    } else if (/no gasta paciencia/.test(r.msg)) setWarn(r.msg)
    else { if (!buy) setLog(l => [...l, r.msg].slice(-6)); if (r.counter) setOffer(r.counter) }
    if (buy) setLog([...((g.deals ?? []).find(d => d.id === dealId)?.neg?.log ?? [])])
    save(); refresh()
    setTimeout(() => logRef.current?.querySelector<HTMLElement>('[data-primary]')?.focus())
  }
  const confirm = () => {
    if (!agreed) return
    if (buy) {
      const r = signDeal(g, dealId!, agreed)
      if (!r.ok) { setWarn(r.reason ?? 'No se pudo firmar.'); setAgreed(null); return }
      setOver({ text: `Firmó. ${p.name} es nuevo jugador de ${me.name}.`, tone: 'ok' })
    } else { applyRenewal(g, p, agreed); setOver({ text: `Renovó. Contrato hasta diciembre de ${g.season + agreed.years}.`, tone: 'ok' }) }
    setAgreed(null)
    save(); refresh()
  }
  const imp = buy && deal ? dealImpact(g, 'buy', p.id, deal.fee, offer) : null
  const bill = squadOf(g, me.id).reduce((s, x) => s + (x.id === p.id ? 0 : x.wage), 0), capOver = bill + offer.wage - me.wageBudget
  const mine = p.clubId === me.id
  const num = (k: 'wage' | 'clause' | 'bonus', label: string) => <Amount id={`neg-${k}`} label={label} value={offer[k]} onChange={v => set(k, v)} disabled={!!over} auto={k === 'wage'} />
  // los montos del representante vienen del motor con los miles con punto ("US$ 3.100"): se escriben como el resto ("US$ 3,1 mil")
  const fmtLog = (t: string) => t.replace(/US\$ (\d{1,3}(?:\.\d{3})+)(?![\d,]| mil| M)/g, (_, n: string) => wm(Number(n.replace(/\./g, ''))))
  const cw = wageShown(g, p, p.wage, 401)
  return (
    <Modal onClose={() => onClose(over ?? undefined)}>
      <div className="mk-neg">
        <div className="row" style={{ marginBottom: 4 }}><Face p={p} size={52} /><div className="grow" style={{ minWidth: 0 }}><h2>{buy ? `Contrato con ${me.name}` : `Renovación de ${p.name}`}</h2>
          <div className="dim sm">{p.name} · {ageOn(p.birth, g.date)} años · <PosPill p={p} /> <Val p={p} /> · hoy cobra {mine ? wm(p.wage) : between(cw)} por mes</div></div>
          <button className="btn sm icon" aria-label="Cerrar la negociación" title="Cerrar (Esc)" onClick={() => onClose(over ?? undefined)}>✕</button></div>
        {buy && deal && <div className="sm">Transferencia acordada: <b>{money(deal.fee)}</b> (club: {deal.clubName})</div>}
        <blockquote className="mk-ask">El representante pide <b>{wm(ask.wage)} por mes</b>, {ask.years} {ask.years === 1 ? 'año' : 'años'}, prima {money(ask.bonus)}, rol {STATUS[ask.status].name.toLowerCase()}.</blockquote>
        {!over && <div className="mk-pat">Paciencia del representante: <b>{word}</b>. {patiencePhrase(word)}</div>}
        {buy && deal?.deadline && !over && <div className="ib-conseq">Si cerrás la ventana, la negociación queda como está hasta el {fmtDay(deal.deadline)} (vence el acuerdo con {deal.clubName}). Si se levanta de la mesa, o si dejás vencer el acuerdo o lo cancelás, no podés volver a ofertar por él durante 14 días de libro abierto; si lo dejás vencer o lo cancelás, {deal.clubName} además pide un 10 % más por sus jugadores.</div>}
        {!buy && !over && <div className="ib-conseq">Si se levanta de la mesa, no va a volver a negociar por un mes.</div>}
        <fieldset className="mk-terms" disabled={!!over}>
          <div className="grid2" style={{ gap: 12 }}>
            {num('wage', 'Sueldo mensual (US$)')}
            {num('bonus', 'Prima por firmar (US$)')}
            {num('clause', 'Cláusula (US$, 0 = sin cláusula)')}
            <div className="f">Años de contrato<Seg label="Años de contrato" value={offer.years - 1} options={['1', '2', '3', '4', '5']} onChange={v => set('years', v + 1)} /></div>
          </div>
          <div className="f">Rol prometido<Seg label="Rol prometido" value={STATUS_KEYS.indexOf(offer.status)} options={STATUS_KEYS.map(k => STATUS[k].name)} onChange={v => set('status', STATUS_KEYS[v])} /><span className="dim sm">Prometer un rol mayor ayuda a cerrar, pero después espera esos minutos.</span></div>
        </fieldset>
        {imp && !over && <ImpactBox imp={imp} kind="buy" title="Con estos términos" />}
        <div aria-live="polite">{!over && capOver > 0 && <Note kind="warn">Con este sueldo superás el tope por {wm(capOver)}. Esto no gasta paciencia.</Note>}</div>
        <div className="mk-log" role="status" ref={el => { logRef.current = el; endRef.current = el }}>
          {log.filter(l => !(agreed && /^¡Hay acuerdo/.test(l))).map((l, i) => <div key={i} className="mk-log-r"><span className="mk-log-i">{MI.info}</span><span>{fmtLog(l)}</span></div>)}
          {warn && <div className="mk-log-r warn"><span className="mk-log-i">{MI.bang}</span><span>{warn}</span></div>}
          {over && <div className={`ib-result ${over.tone === 'ok' ? '' : over.tone}`} tabIndex={-1}><span className="ib-result-ico">{over.tone === 'ok' ? MI.ok : MI.x}</span><span>{over.text}</span></div>}
          {agreed && !over && <div className="mk-agree"><b><span className="mk-agree-i">{MI.ok}</span>Hay acuerdo con el representante. Falta tu confirmación.</b>
            <div className="ib-acts"><button className="btn primary" data-primary onClick={confirm}>{buy ? `Confirmar: fichar a ${p.name}, ${money(deal?.fee ?? 0)}${agreed.bonus ? ` + prima ${money(agreed.bonus)}` : ''}` : `Confirmar: renovar a ${p.name} hasta diciembre de ${g.season + agreed.years}`}</button>
              <button className="btn" onClick={() => setAgreed(null)}>Seguir negociando</button></div></div>}
        </div>
        {!agreed && <div className="row mk-neg-foot"><span className="grow" />{over ? <button className="btn primary" data-primary onClick={() => onClose(over)}>Listo</button> : <><button className="btn" onClick={() => onClose()}>Cancelar</button><button className="btn primary" data-primary onClick={send}>Ofrecer</button></>}</div>}
      </div>
    </Modal>
  )
}
const sameT = (a: Terms, b: Terms) => a.wage === b.wage && a.years === b.years && a.status === b.status && a.clause === b.clause && a.bonus === b.bonus
export { Badge, fmtDate }
