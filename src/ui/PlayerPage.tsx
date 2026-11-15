import { useEffect, useState } from 'react'
import { askingPrice, canSell, divName } from '../engine/career'
import { fmtDate } from '../engine/game'
import { POS_LABEL, POS_NAME, ageOn, bestRating, posRating } from '../engine/positions'
import { STATUS, fmtRange, knowOf, minutesShare, moodOf, moraleShown, persTraits, potentialText, scout, setListed, shown, talkState, toggleShortlist, wageShown, type Trait } from '../engine/squad'
import { ATTR_GROUPS, ATTR_LABEL, A, type SeasonStats } from '../engine/types'
import { useGame } from '../store'
import { Badge, Cond, Face, Radar, Status, attrClass, avgRat, clubTheme, dec, money, radarOf, ratClass } from './common'
import { F7, LockerCard, NegotiationModal, TalkModal, focusLater, type LRes } from './Locker'
import { MoodBar, TalkSt, Traits } from './mood'
import { BidBox, wm, wr } from './deal'

function StatLine({ s, label }: { s: SeasonStats; label: string }) {
  return (
    <tr><td>{label}</td><td className="r num">{s.apps}{s.subs ? ` (${s.subs})` : ''}</td><td className="r num">{s.mins}</td><td className="r num">{s.goals}</td>
      <td className="r num">{s.ast}</td><td className="r num">{s.yc}</td><td className="r num">{s.rc}</td><td className="r num">{s.motm}</td><td className="r num">{avgRat(s)}</td></tr>
  )
}
export function FavButton({ k, id }: { k: 'p' | 'c'; id: number }) {
  const { g, save, refresh } = useGame()
  const on = (g.favs ?? []).some(f => f.k === k && f.id === id)
  return <button className={`btn sm ${on ? 'on' : ''}`} title="Los favoritos aparecen en la barra lateral" onClick={() => { g.favs = on ? (g.favs ?? []).filter(f => !(f.k === k && f.id === id)) : [...(g.favs ?? []), { k, id }].slice(-8); save(); refresh() }}>{on ? '★ Favorito' : '☆ Favorito'}</button>
}

export function PlayerPage({ id, tab = 'resumen', busy = false }: { id: number; tab?: string; busy?: boolean }) {
  const { g, refresh, save, back, nav, openClub } = useGame()
  const p = g.players[id]
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [neg, setNeg] = useState(false)
  const [talkOpen, setTalkOpen] = useState<null | 'band' | 'card'>(null)
  const [bandNote, setBandNote] = useState<LRes | null>(null)
  const [cardNote, setCardNote] = useState<LRes | null>(null)
  // al llegar a la ficha › Vestuario (desde la bandeja o el Vestuario angosto): con la charla disponible, "Hablar con él" (abre la ventana,
  // no decide); con la charla usada, el título de la sección Charla. Nunca un botón que decide sin confirmación.
  useEffect(() => { if (tab === 'personal' && p && p.clubId === g.userClubId) focusLater('.vt-scope .vt-card-talk', '.vt-scope #vt-card-h-talk') }, [])
  if (!p) return <div className="page"><div className="card">Este jugador ya no está en el juego (se retiró o se fue al exterior).</div><div><button className="btn" onClick={back}>◂ Atrás</button></div></div>
  const c = g.clubs[p.clubId], mine = p.clubId === g.userClubId, me = g.clubs[g.userClubId]
  const k = knowOf(g, p), known = k >= 100
  const est = p.attrs.map((v, i) => shown(g, p, v, 5, i))
  const est0 = shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99)
  const rd = radarOf(known ? p : { ...p, attrs: est.map(r => (r[0] + r[1]) / 2) }), age = ageOn(p.birth, g.date)
  // el potencial en palabras y el sueldo de un ajeno salen del ojeo (los mismos textos que el panel del Mercado)
  const potTxt = potentialText(g, p), potKnown = potTxt != null
  const ws = mine ? null : wageShown(g, p, p.wage, 401), wageTxt = !ws ? wm(p.wage) : wr(ws), wageEst = !!ws && ws[0] !== ws[1]
  const starred = g.shortlist.includes(p.id)
  const ts = mine ? talkState(g, p) : null
  const pt = persTraits(g, p)
  // salió de las inferiores del club (cantera real o camada del juego) y sigue ahí: no a préstamo ni transferido desde entonces
  const homegrown = p.youth && p.loanFrom == null && !g.transfers.some(t => t.pid === p.id && !t.loan)
  const done = () => { save(); refresh() }
  const setTab = (t: string) => nav({ page: 'player', id, tab: t })
  const TABS: [string, string][] = [['resumen', 'Resumen'], ['contrato', 'Contrato y mercado'], ['estadisticas', 'Estadísticas'], ['personal', mine ? 'Vestuario' : 'Ojeo']]
  const games = mine ? g.fixtures.filter(f => f.lines?.some(l => l.pid === p.id)).slice(-12).reverse() : []
  return (
    <div className="page">
      <div className="crumbs"><button className="linkish" onClick={back}>◂ Atrás</button><span>›</span><button className="linkish" onClick={() => openClub(c.id)}>{c.name}</button><span>›</span><b>{p.name}</b></div>
      <div className="pband" style={{ ...(clubTheme(c) as object) }}>
        <div className="pband-top">
          <div className="pband-face"><Face p={p} club={c} size={104} /></div>
          <div className="pband-id">
            <div className="row" style={{ gap: 10 }}><h1 className="pband-name">{p.name}</h1><span className="numbox">{p.num}</span></div>
            <div className="row wrap" style={{ gap: 6 }}><span className="boxed">{p.positions.map(x => POS_NAME[x] ?? POS_LABEL[x]).slice(0, 2).join(' / ')}</span><Status p={p} />{homegrown && <span className="chip" title={`Surgió de las inferiores de ${c.name}`}>Inferiores</span>}</div>
            <div className="row wrap" style={{ gap: 8 }}><span className="boxed">{p.nat}</span><b>{age} años</b><span className="dim">({fmtDate(p.birth)})</span><span className="dim">· pie {p.foot === 'D' ? 'derecho' : p.foot === 'I' ? 'izquierdo' : 'ambidiestro'}</span></div>
          </div>
          <div className="pband-sep" />
          <button className="pband-block linkish" onClick={() => openClub(c.id)}><Badge club={c} size={40} /><span className="col" style={{ gap: 4 }}><span className="boxed"><b>{c.name}</b></span>{mine && p.status ? <span className="boxed dim">{STATUS[p.status].name}</span> : <span className="boxed dim">{divName(c)}</span>}</span></button>
          <div className="pband-sep" />
          <div className="pband-block col" style={{ gap: 4, alignItems: 'flex-start' }}><span className="boxed"><b>{money(p.value)}</b></span><span className="boxed">{wageTxt}/mes{wageEst ? ' (estimado)' : ''} · dic {p.contractEnd}</span></div>
          <div className="pband-sep" />
          <div className="pband-block" style={{ gap: 18 }}>
            <div className="col" style={{ gap: 4 }}><span className="dim sm">Valoración</span><Stars v={(est0[0] + est0[1]) / 2} />{!known && <span className="dim sm">{fmtRange(est0)} · conocés el {Math.round(k)} %</span>}{known && <span className="dim sm">{Math.round(bestRating(p))}</span>}</div>
            <div className="col" style={{ gap: 4 }}><span className="dim sm">Potencial</span>{potKnown ? <Stars v={Math.max(p.pa, bestRating(p))} /> : <span className="dim">Desconocido</span>}<span className="dim sm">{potKnown ? potTxt : 'Mandalo a ojear'}</span></div>
          </div>
        </div>
        <div className="pband-tabs tabs">
          {TABS.map(([k2, l]) => <button key={k2} className={tab === k2 ? 'on' : ''} aria-pressed={tab === k2} onClick={() => setTab(k2)}>{l}</button>)}
          <span className="grow" />
          <FavButton k="p" id={p.id} />
          {!mine && <button className={`btn sm ${starred ? 'on' : ''}`} aria-pressed={starred} onClick={() => { toggleShortlist(g, p.id); done() }}>{starred ? '✓ En seguimiento' : 'Seguir'}</button>}
          {!mine && !known && <button className={`btn sm ${g.scouting.includes(p.id) ? 'on' : ''}`} disabled={g.scouting.includes(p.id)} title="El scouting lo sigue unos días hasta conocerlo por completo" onClick={() => { scout(g, p); done() }}>{g.scouting.includes(p.id) ? 'Ojeándolo…' : 'Mandar a ojear'}</button>}
          {ts && (ts.can ? <button className="btn sm vt-band-hablar" disabled={busy} aria-describedby={busy ? 'vt-band-busy' : undefined} onClick={() => setTalkOpen('band')}>Hablar</button> : <span className="vt-band-talk"><TalkSt text={ts.long} /></span>)}
          {ts?.can && busy && <span className="ib-help vt-band-busy" id="vt-band-busy">Frená el avance para hablar con él.</span>}
          <button className="btn sm" onClick={() => setTab('contrato')}>{mine ? 'Contrato' : 'Ofertar'} ▸</button>
        </div>
        {mine && <F7 r={bandNote} cls="vt-band-note" />}
      </div>

      {tab === 'resumen' && <>
        <div className="pgrid">
          <div className="card col pcol-pos">
            <h3>Puestos</h3>
            <div className="row wrap" style={{ gap: 5 }}>{p.positions.map(x => <span key={x} className="boxed" title={POS_NAME[x]}>{POS_LABEL[x]} <b>{fmtRange(shown(g, p, Math.round(posRating(p, x)), 9, 50, 1, 99))}</b></span>)}</div>
            <MiniPitch on={p.positions} />
            <div className="dim sm center">En verde, sus puestos; el más claro es el natural.</div>
            <Radar values={rd.values} labels={rd.labels} size={210} />
          </div>
          <div className="card pcol-attrs">
            <div className="attr-cols">
              {ATTR_GROUPS.filter(gr => (gr.name === 'Arquero') === (p.line === 'GK') || gr.name === 'Mentales' || gr.name === 'Físicos').map(gr => (
                <div key={gr.name}><h3 style={{ marginBottom: 8 }}>{gr.name}</h3>
                  {gr.attrs.map(a => { const r = est[A[a]]; return <div key={a} className="attr"><span className="attr-l">{ATTR_LABEL[a]}</span><span className={`v ${attrClass((r[0] + r[1]) / 2)}`} style={r[0] !== r[1] ? { width: 'auto', minWidth: 46, padding: '1px 6px', whiteSpace: 'nowrap' } : undefined}>{fmtRange(r)}</span></div> })}</div>))}
            </div>
            {!known && <div className="dim sm" style={{ marginTop: 10 }}>Lo que sabés de él es aproximado. Mandalo a ojear o enfrentalo para conocerlo mejor.</div>}
          </div>
          <div className="card col pcol-info">
            <h3>Información</h3>
            <div className="vt-scope"><div className="dim sm">Personalidad</div><PersView level={pt.level} traits={pt.traits} /></div>
            <div><div className="dim sm">Pie hábil</div><b>{p.foot === 'D' ? 'Derecho' : p.foot === 'I' ? 'Izquierdo' : 'Ambos'}</b></div>
            {mine && p.status && <div><div className="dim sm">Rol en el plantel</div><b>{STATUS[p.status].name}</b> <span className="dim sm">· juega el {Math.round(minutesShare(p) * 100)} % (espera {Math.round(STATUS[p.status].share * 100)} %)</span></div>}
            {!mine && <div><div className="dim sm">Conocimiento</div><b>{Math.round(k)} %</b>{g.scouting.includes(p.id) && <span className="acc sm"> · lo están ojeando</span>}</div>}
            {p.clause ? <div><div className="dim sm">Cláusula de rescisión</div><b>{money(p.clause)}</b></div> : null}
            {p.injury && <div className="bad sm">Lesión: {p.injury.desc} ({p.injury.days} días).</div>}
          </div>
        </div>
        <div className="pcards">
          {mine ? <div className="card pc vt-scope"><h3>Conformidad</h3><b className="pc-v">{moodOf(p.happy).word}</b><MoodBar v={p.happy ?? 70} /></div>
            : <div className="card pc vt-scope"><h3>Ánimo</h3>{(() => { const ms = moraleShown(g, p); return ms ? <b className="pc-v">{ms.word}</b> : <span className="dim sm">Su ánimo lo dice el informe completo.</span> })()}</div>}
          <div className="card pc"><h3>Físico</h3>{p.injury ? <><b className="pc-v bad">Lesionado</b><span className="dim sm">{p.injury.days} días</span></> : <><b className="pc-v">{condTxt(p.cond)}</b><Cond v={p.cond} /></>}</div>
          <div className="card pc"><h3>Forma</h3><div className="formbars" aria-label="Últimos puntajes">{p.form.slice(-5).map((r, i) => <i key={i} className={ratClass(r)} style={{ height: `${Math.max(12, (r - 4) * 16)}%` }} title={dec(r, 1)} />)}</div><span className="dim sm">{p.form.length ? `Promedio de los últimos ${Math.min(5, p.form.length)}: ${dec(p.form.slice(-5).reduce((a2, b2) => a2 + b2, 0) / Math.min(5, p.form.length), 2)}` : 'Sin partidos todavía'}</span></div>
          <div className="card pc"><h3>Disciplina</h3><b className="pc-v">{p.susp ? `Suspendido (${p.susp})` : p.stats.rc ? 'Expulsado esta temporada' : p.stats.yc >= 4 ? 'Al límite de amarillas' : 'Sin problemas'}</b><span className="dim sm">{p.stats.yc} amarillas · {p.stats.rc} rojas</span></div>
          <div className="card pc"><h3>Entrenamiento</h3>{mine ? <><b className="pc-v">{(p.ups ?? 0) >= 3 ? 'Progresa bien' : (p.ups ?? 0) >= 1 ? 'Progresa' : 'Sin mejoras todavía'}</b><span className="dim sm">{p.ups ?? 0} atributos ganados esta temporada</span></> : <span className="dim sm">Solo se conoce el de tus jugadores.</span>}</div>
          <div className="card pc pc-wide"><h3>Temporada {g.season}</h3>
            <table className="mini-table"><thead><tr><th>PJ</th><th>Min</th><th>G</th><th>A</th><th>Rem</th><th>Fig</th><th>TA</th><th>Prom</th></tr></thead>
              <tbody><tr><td className="num">{p.stats.apps}{p.stats.subs ? ` (${p.stats.subs})` : ''}</td><td className="num">{p.stats.mins}</td><td className="num">{p.stats.goals}</td><td className="num">{p.stats.ast}</td><td className="num">{p.stats.shots}</td><td className="num">{p.stats.motm}</td><td className="num">{p.stats.yc}</td><td><span className={`ratbox ${ratClass(p.stats.apps + p.stats.subs ? p.stats.ratSum / (p.stats.apps + p.stats.subs) : 6.5)}`}>{avgRat(p.stats)}</span></td></tr></tbody></table></div>
          <div className="card pc"><h3>Carrera</h3><b className="pc-v">{new Set(p.history.map(h => h.clubId).concat(p.clubId)).size} {new Set(p.history.map(h => h.clubId).concat(p.clubId)).size === 1 ? 'club' : 'clubes'}</b><span className="dim sm">{p.history.reduce((a2, h) => a2 + h.stats.apps + h.stats.subs, 0) + p.stats.apps + p.stats.subs} partidos · {p.history.reduce((a2, h) => a2 + h.stats.goals, 0) + p.stats.goals} goles</span></div>
        </div>
      </>}

      {tab === 'contrato' && <div className="dash">
        <div className="card s6 col"><h3>Contrato</h3>
          <div className="row between"><span className="dim">Valor de mercado</span><b>{money(p.value)}</b></div><div className="row between"><span className="dim">Sueldo mensual</span>{wageEst ? <span className="rng">{wageTxt} <small>(estimado)</small></span> : <b>{wageTxt}</b>}</div>
          <div className="row between"><span className="dim">Vence</span><b className={p.contractEnd <= g.season ? 'warn' : ''}>dic {p.contractEnd}</b></div>
          {p.clause ? <div className="row between"><span className="dim">Cláusula de rescisión</span><b>{money(p.clause)}</b></div> : null}
          {p.loanFrom != null && <div className="row between"><span className="dim">A préstamo de</span><b>{g.clubs[p.loanFrom]?.name}</b></div>}
          {mine && <div className="row wrap">
            <button className="btn sm" disabled={!!p.negBlock && g.date < p.negBlock} onClick={() => setNeg(true)}>Negociar renovación</button>
            {(canSell(p) || p.listed) && <button className={`btn sm ${p.listed ? 'on' : ''}`} aria-pressed={!!p.listed} onClick={() => { setListed(g, p.id, !p.listed); done() }}>{p.listed ? 'Quitar de transferibles' : 'Declarar transferible'}</button>}</div>}
          {mine && p.negBlock && g.date < p.negBlock && <div className="ib-help">No quiere negociar hasta el {fmtDate(p.negBlock)}.</div>}</div>
        <div className={`card s6 col ${mine ? '' : 'mk-scope'}`}>{mine && <h3>Mercado</h3>}
          {mine && !canSell(p) ? <div className="dim sm" style={{ lineHeight: 1.5 }}>Está a préstamo de {g.clubs[p.loanFrom!]?.name ?? 'otro club'}: no se puede vender ni declarar transferible.</div> : mine ? <div className="dim sm" style={{ lineHeight: 1.5 }}>Pedido estimado: <b style={{ color: 'var(--text)' }}>{money(askingPrice(g, p))}</b>. Si lo declarás transferible van a llegar más ofertas, por menos plata.</div> : <BidBox key={p.id} p={p} busy={busy} where="page" />}
          {msg && <div className={`sm ${msg.ok ? 'good' : 'warn'}`} style={{ lineHeight: 1.45 }}>{msg.t}</div>}</div>
        <div className="card s12"><h3 style={{ marginBottom: 6 }}>Movimientos</h3>
          {g.transfers.filter(t => t.pid === p.id).length ? <table><tbody>{g.transfers.filter(t => t.pid === p.id).map((t, i) => <tr key={i}><td className="dim">{fmtDate(t.date)}</td><td>{t.from} → {t.to}</td><td className="r num">{t.loan ? 'Préstamo' : t.fee ? money(t.fee) : 'Libre'}</td></tr>)}</tbody></table>
            : <div className="dim sm">Sin movimientos desde que empezó tu carrera.</div>}</div>
      </div>}

      {tab === 'estadisticas' && <div className="col">
        <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Por temporada</h3>
          <table><thead><tr><th>Temporada</th><th className="r">PJ</th><th className="r">Min</th><th className="r">Goles</th><th className="r">Asist</th><th className="r">Am</th><th className="r">Roj</th><th className="r">Fig</th><th className="r">Prom</th></tr></thead>
            <tbody><StatLine s={p.stats} label={`${g.season} · ${c.short}`} />{[...p.history].reverse().map(h => <StatLine key={h.season} s={h.stats} label={`${h.season} · ${g.clubs[h.clubId]?.short ?? ''}`} />)}</tbody></table></div>
        {mine && <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Últimos partidos</h3>
          {games.length ? <table><thead><tr><th>Fecha</th><th>Rival</th><th>Torneo</th><th className="r">Min</th><th className="r">G</th><th className="r">A</th><th className="r">Puntaje</th></tr></thead>
            <tbody>{games.map(f => { const l = f.lines!.find(x => x.pid === p.id)!, o = g.clubs[f.home === me.id ? f.away : f.home]; return (
              <tr key={f.id}><td className="dim">{fmtDate(f.date)}</td><td><span className="row"><Badge club={o} size={20} />{o.short}</span></td><td className="dim sm">{g.comps[f.comp]?.name}</td>
                <td className="r num">{l.mins}</td><td className="r num">{l.goals || ''}</td><td className="r num">{l.ast || ''}</td><td className={`r num ${ratClass(l.rating)}`}><b>{dec(l.rating, 1)}</b></td></tr>) })}</tbody></table>
            : <div className="dim sm">Todavía no jugó con tu equipo.</div>}</div>}
      </div>}

      {tab === 'personal' && mine && <div className="card vt-scope"><LockerCard p={p} where="page" busy={busy} onTalk={() => setTalkOpen('card')} note={cardNote} setNote={setCardNote} /></div>}
      {tab === 'personal' && !mine && <div className="dash">
        <div className="card s6 col vt-scope"><h3>Personalidad</h3>
          <PersView level={pt.level} traits={pt.traits} />
          <div className="row between"><span className="dim">Potencial</span><b>{potKnown ? potTxt : 'Desconocido'}</b></div></div>
        <div className="card s6 col"><h3>Ojeo</h3>
            <div className="row between"><span className="dim">Conocimiento</span><div className="row" style={{ gap: 6 }}><div className="bar" style={{ width: 100 }}><i style={{ width: `${k}%`, background: 'var(--accent)' }} /></div><b className="num">{Math.round(k)}%</b></div></div>
            <div className="dim sm" style={{ lineHeight: 1.5 }}>{known ? 'Lo conocés por completo.' : g.scouting.includes(p.id) ? 'El scouting lo está siguiendo.' : 'Mandarlo a ojear revela sus atributos exactos, su potencial y su personalidad. Enfrentarlo también ayuda.'}</div>
            {!known && !g.scouting.includes(p.id) && <button className="btn sm primary" style={{ alignSelf: 'flex-start' }} onClick={() => { scout(g, p); done() }}>Mandar a ojear</button>}</div>
      </div>}

      {neg && mine && <NegotiationModal p={p} mode="renew" onClose={m => { setNeg(false); if (m) setMsg({ t: m.text, ok: m.tone === 'ok' }); done() }} />}
      {talkOpen && mine && <TalkModal p={p} onClose={r => {
        // el foco vuelve a un control habilitado y a la vista, en la misma pestaña (sección 12, "Devolución del foco")
        const from = talkOpen
        setTalkOpen(null); refresh()
        if (from === 'band') {
          if (!r) focusLater('.vt-band-hablar', '.pband-tabs button.on')
          else if (r.kind === 'talked') focusLater('.vt-band-talk .vt-talkst', '.pband-tabs button.on')
          else { setBandNote(r.note!); focusLater('.vt-band-note .ib-result', '.vt-band-talk .vt-talkst'); r.saved?.then(ok => { if (!ok) setBandNote(n => (n ? { ...n, saveErr: true } : n)) }) }
        } else {
          if (!r) focusLater('.vt-scope .vt-card-talk', '.vt-scope #vt-card-h-talk')
          else if (r.kind === 'talked') focusLater('.vt-scope #vt-card-h-talk')
          else { setCardNote(r.note!); focusLater('.vt-scope .vt-card-note .ib-result', '.vt-scope #vt-card-h-talk'); r.saved?.then(ok => { if (!ok) setCardNote(n => (n ? { ...n, saveErr: true } : n)) }) }
        }
      }} />}
    </div>
  )
}

/** Valoración en estrellas (media estrella de paso). */
function Stars({ v }: { v: number }) {
  const n = Math.max(0.5, Math.min(5, Math.round(((v - 42) / 9) * 2) / 2))
  return <span className="stars" role="img" aria-label={`${n} estrellas de 5`} title={`${n} de 5`}>{[0, 1, 2, 3, 4].map(i => <i key={i} className={n >= i + 1 ? 'on' : n >= i + 0.5 ? 'half' : ''} />)}</span>
}
/** Cancha chica con los puestos del jugador (ataca hacia la derecha). */
const XY: Record<string, [number, number]> = { GK: [7, 50], DC: [24, 50], DR: [27, 84], DL: [27, 16], DM: [40, 50], MC: [53, 50], MR: [56, 86], ML: [56, 14], AMC: [68, 50], AMR: [72, 82], AML: [72, 18], ST: [86, 50] }
function MiniPitch({ on }: { on: string[] }) {
  return (
    <svg className="minipitch" viewBox="0 0 100 64" role="img" aria-label={`Puestos: ${on.join(', ')}`}>
      <rect x="1" y="1" width="98" height="62" rx="2" className="mp-f" />
      <line x1="50" y1="1" x2="50" y2="63" className="mp-l" /><circle cx="50" cy="32" r="8" className="mp-l" />
      <rect x="1" y="17" width="14" height="30" className="mp-l" /><rect x="85" y="17" width="14" height="30" className="mp-l" />
      {Object.entries(XY).map(([k, [x, y]]) => { const i = on.indexOf(k); return <circle key={k} cx={x} cy={(y * 64) / 100} r={i === 0 ? 3.6 : 2.8} className={i === 0 ? 'mp-nat' : i > 0 ? 'mp-alt' : 'mp-off'}><title>{k}</title></circle> })}
    </svg>
  )
}
/** Personalidad según lo que se conoce (`persTraits`, 5.5): una palabra por rasgo; de un ajeno al 60-99 %, solo los extremos. */
function PersView({ level, traits }: { level: 'full' | 'extremes' | 'none'; traits: Trait[] }) {
  if (level === 'none') return <div className="dim">Todavía no la conocés. Mandalo a ojear para saber cómo es.</div>
  return <div className="col" style={{ gap: 6 }}>
    {traits.length ? <Traits traits={traits} /> : <div className="dim">Ningún rasgo marcado a la vista.</div>}
    {level === 'extremes' && <div className="mk-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 11v6M12 7v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /></svg><span>Lo que se ve hasta ahora: el informe completo dice cómo es en cada rasgo.</span></div>}
  </div>
}
const condTxt = (v: number) => (v >= 95 ? 'Óptimo' : v >= 85 ? 'Bien' : v >= 70 ? 'Cansado' : 'Agotado')
