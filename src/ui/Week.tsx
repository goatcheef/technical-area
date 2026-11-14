import { useState } from 'react'
import { addDays, fmtDate, nextUserFixture, squadOf } from '../engine/game'
import { POS_LABEL, ageOn } from '../engine/positions'
import { STAFF_ROLES, type Fixture, type StaffRole, type Tactic } from '../engine/types'
import { FOCUS, IND_FOCUS, INTENSITY, answerPress, assistantPlan, daysTo, delegatePress, fireStaff, hireStaff, sab, scoutReport, staffBill, staffOf } from '../engine/week'
import { useGame } from '../store'
import { Badge, Cond, MatchReport, Modal, PosPill, Seg, Status, money, resultText } from './common'
import { PageTip } from './Guide'

const AbBar = ({ v }: { v: number }) => (
  <div className="row" style={{ gap: 6 }}><div className="bar" style={{ width: 60 }}><i style={{ width: `${v * 5}%`, background: v >= 15 ? 'var(--good)' : v >= 10 ? 'var(--warn)' : 'var(--bad)' }} /></div><b className="num">{v}</b><span className="dim sm">/20</span></div>)

// ---------- entrenamiento ----------
export function TrainingPage() {
  const { g, refresh, save, openPlayer } = useGame()
  const c = g.clubs[g.userClubId], t = g.training, next = nextUserFixture(g)
  const days = next ? daysTo(g, next.date) : null
  const squad = squadOf(g, c.id).sort((a, b) => ({ GK: 0, DF: 1, MF: 2, FW: 3 }[a.line] - { GK: 0, DF: 1, MF: 2, FW: 3 }[b.line]) || b.ca - a.ca)
  const done = () => { save(); refresh() }
  const fam = c.famKey === c.tactic.formation ? c.fam : Math.max(30, c.fam - 30)
  const cond = squad.reduce((s, p) => s + p.cond, 0) / Math.max(1, squad.length)
  const dg = g.delegate.training
  const plan = dg && days != null ? assistantPlan(g, days) : t
  const week = Array.from({ length: 7 }, (_, i) => addDays(g.date, i))
  const fxOn = (d: string) => g.fixtures.find(f => f.date === d && (f.home === c.id || f.away === c.id))
  return (
    <div className="page">
      <PageTip id="training" />
      <div className="hero row wrap" style={{ gap: 22 }}>
        <div className="grow"><h3>Entrenamiento</h3><h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>{INTENSITY[plan.intensity].name} · {FOCUS.find(f => f.k === plan.focus)!.name}</h1>
          <div className="dim sm">{next ? `Próximo partido en ${days} día${days === 1 ? '' : 's'}: ${next.home === c.id ? 'vs' : 'en'} ${g.clubs[next.home === c.id ? next.away : next.home].name}.` : 'No hay partidos programados.'} {dg ? `Lo maneja ${staffOf(g, 'asst')?.name ?? 'el ayudante'}.` : ''}</div></div>
        <div className="kpi"><h3>Físico medio</h3><b className={cond < 85 ? 'warn' : ''}>{Math.round(cond)}%</b></div>
        <div className="kpi"><h3>Familiaridad</h3><b>{Math.round(fam)}%</b></div>
        <div className="kpi"><h3>Preparador físico</h3><b>{sab(g, 'fit')}/20</b></div>
      </div>
      <div className="grid2">
        <div className="card col">
          <div className="row between"><h3>Plan de la semana</h3>
            <button className={`btn sm ${dg ? 'on' : ''}`} onClick={() => { g.delegate.training = !dg; done() }}>{dg ? '✓ Delegado en el ayudante' : 'Delegar en el ayudante'}</button></div>
          <div style={{ opacity: dg ? 0.5 : 1, pointerEvents: dg ? 'none' : 'auto' }} className="col">
            <div><div className="dim" style={{ fontSize: '.76rem', marginBottom: 3 }}>Intensidad</div><Seg value={t.intensity} options={INTENSITY.map(i => i.name)} onChange={v => { t.intensity = v; done() }} /><div className="dim sm" style={{ marginTop: 5 }}>{INTENSITY[t.intensity].help}</div></div>
            <div><div className="dim" style={{ fontSize: '.76rem', marginBottom: 3 }}>Foco colectivo</div><Seg value={FOCUS.findIndex(f => f.k === t.focus)} options={FOCUS.map(f => f.name)} onChange={v => { t.focus = FOCUS[v].k; done() }} /><div className="dim sm" style={{ marginTop: 5 }}>{FOCUS.find(f => f.k === t.focus)!.help}</div></div>
            <div className="row"><button className={`btn sm ${t.restAfter ? 'on' : ''}`} onClick={() => { t.restAfter = !t.restAfter; done() }}>{t.restAfter ? '✓ ' : ''}Descanso el día después del partido</button><span className="dim sm">Recuperan mucho más rápido; ese día no se entrena.</span></div>
          </div>
          {dg && <div className="dim sm">El ayudante baja la carga cerca de los partidos o con el plantel cansado, la sube con semanas largas y prioriza lo táctico si el equipo todavía no asimiló el sistema.</div>}
        </div>
        <div className="card col"><h3>Los próximos 7 días</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>{week.map(d => {
            const f = fxOn(d), rest = plan.restAfter && fxOn(addDays(d, -1)), o = f ? g.clubs[f.home === c.id ? f.away : f.home] : null
            return (
              <div key={d} className="col center" style={{ gap: 4, alignItems: 'center', padding: '8px 2px', borderRadius: 10, background: f ? 'var(--accent-soft)' : 'var(--panel2)', border: d === g.date ? '1px solid var(--accent)' : '1px solid transparent' }}>
                <span className="dim sm">{['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(d + 'T12:00:00Z').getUTCDay()]} {Number(d.slice(8))}</span>
                {o ? <><Badge club={o} size={26} /><b className="sm">{f!.home === c.id ? 'Local' : 'Visita'}</b></> : rest ? <span className="sm" style={{ padding: '6px 0' }}>Descanso</span> : <span className="sm" style={{ padding: '6px 0' }}>{INTENSITY[plan.intensity].name}</span>}
              </div>)
          })}</div>
          <div className="dim sm" style={{ lineHeight: 1.5 }}>Con práctica intensa el plantel llega al partido con menos físico (alrededor del 91 %). Conviene bajar la carga uno o dos días antes.</div>
        </div>
      </div>
      <div className="card scroll-x"><h3 style={{ marginBottom: 6 }}>Trabajo individual</h3>
        <table><thead><tr><th>Jugador</th><th>Pos</th><th className="r">Edad</th><th>Físico</th><th>Progreso</th><th className="r">Mejoras</th><th>Foco individual</th></tr></thead>
          <tbody>{squad.map(p => (
            <tr key={p.id}><td className="click" data-pid={p.id} onClick={() => openPlayer(p.id)}><b style={{ fontWeight: 600 }}>{p.name}</b> <Status p={p} /></td><td><PosPill p={p} /></td><td className="r num">{ageOn(p.birth, g.date)}</td><td><Cond v={p.cond} /></td>
              <td title="Cuando la barra se llena, el jugador mejora un atributo. Los jóvenes y los profesionales avanzan más rápido."><div className="bar" style={{ width: 80 }}><i style={{ width: `${Math.min(100, (p.tx ?? 0) * 100)}%`, background: 'var(--accent)' }} /></div></td>
              <td className="r num">{p.ups ? <b className="good">+{p.ups}</b> : <span className="dim">0</span>}</td>
              <td><select value={p.tfocus ?? ''} onChange={e => { p.tfocus = e.target.value || undefined; done() }}>{IND_FOCUS.filter(f => (f.k === 'gk') === (p.line === 'GK') || f.k === '' || f.k === 'men').map(f => <option key={f.k} value={f.k}>{f.name}</option>)}</select></td></tr>))}</tbody></table>
      </div>
    </div>
  )
}

// ---------- calendario ----------
export function CalendarPage() {
  const { g } = useGame()
  const c = g.clubs[g.userClubId]
  const [ym, setYm] = useState(g.date.slice(0, 7))
  const [rep, setRep] = useState<Fixture | null>(null)
  const [y, m] = ym.split('-').map(Number)
  const first = `${ym}-01`, dow = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7
  const len = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells = [...Array(dow).fill(null), ...Array.from({ length: len }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)]
  const mine = g.fixtures.filter(f => f.home === c.id || f.away === c.id)
  const shift = (k: number) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); setYm(d.toISOString().slice(0, 7)) }
  const win = (d: string) => { const md = d.slice(5); return (md >= '01-01' && md <= '02-20') || (md >= '06-25' && md <= '08-10') }
  const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return (
    <div className="page">
      <div className="row wrap"><h2 className="grow">Calendario</h2><button className="btn sm" onClick={() => shift(-1)}>◂</button><b style={{ minWidth: 130, textAlign: 'center' }}>{MES[m - 1]} {y}</b><button className="btn sm" onClick={() => shift(1)}>▸</button><button className="btn sm" onClick={() => setYm(g.date.slice(0, 7))}>Hoy</button></div>
      <div className="card scroll-x">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(92px, 1fr))', gap: 6, minWidth: 680 }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="dim sm center" style={{ padding: 4 }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const f = mine.find(x => x.date === d), o = f ? g.clubs[f.home === c.id ? f.away : f.home] : null
            const res = f?.played ? (() => { const dd = (f.home === c.id ? 1 : -1) * (f.hg - f.ag); return f.pens ? (f.pens[f.home === c.id ? 0 : 1] > f.pens[f.home === c.id ? 1 : 0] ? 'good' : 'bad') : dd > 0 ? 'good' : dd < 0 ? 'bad' : '' })() : ''
            return (
              <div key={d} className={f?.played ? 'click' : ''} onClick={() => f?.played && setRep(f)} style={{ minHeight: 86, borderRadius: 10, padding: 7, background: f ? 'var(--accent-soft)' : 'var(--panel2)', border: d === g.date ? '2px solid var(--accent)' : '1px solid var(--line2)', boxShadow: win(d) ? 'inset 0 -3px 0 var(--info)' : 'none', opacity: d < g.date && !f ? 0.55 : 1, display: 'flex', flexDirection: 'column', gap: 4, cursor: f?.played ? 'pointer' : 'default' }}>
                <div className="row between"><b className="num sm">{Number(d.slice(8))}</b>{win(d) && !win(addDays(d, -1)) && <span className="chip" style={{ fontSize: '.6rem', padding: '1px 6px' }}>Abre el libro</span>}{win(d) && !win(addDays(d, 1)) && <span className="chip" style={{ fontSize: '.6rem', padding: '1px 6px' }}>Cierra el libro</span>}</div>
                {o && f && <><div className="row" style={{ gap: 5 }}><Badge club={o} size={22} /><span className="sm ell">{f.home === c.id ? 'vs' : 'en'} {o.short}</span></div>
                  <span className={`sm num ${res}`} style={{ fontWeight: 650 }}>{f.played ? resultText(f) : f.stage}</span></>}
              </div>)
          })}
        </div>
      </div>
      <div className="dim sm">Tocá un partido jugado para ver el informe. La línea azul al pie de cada día marca que el libro de pases está abierto.</div>
      {rep && <MatchReport g={g} f={rep} onClose={() => setRep(null)} />}
    </div>
  )
}

// ---------- cuerpo técnico ----------
export function StaffPage() {
  const { g, refresh, save } = useGame()
  const [role, setRole] = useState<StaffRole>(() => STAFF_ROLES.find(r => !staffOf(g, r.k))?.k ?? 'asst')
  const [msg, setMsg] = useState('')
  const [sure, setSure] = useState<number | null>(null)
  const c = g.clubs[g.userClubId]
  const done = () => { save(); refresh() }
  const pool = g.staff.filter(s => s.clubId === 0 && s.role === role).sort((a, b) => b.ability - a.ability)
  return (
    <div className="page">
      <div className="hero row wrap" style={{ gap: 22 }}>
        <div className="grow"><h3>Cuerpo técnico</h3><h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>{c.name}</h1><div className="dim sm">Los sueldos del cuerpo técnico salen de la caja del club, aparte del tope salarial del plantel.</div></div>
        <div className="kpi"><h3>Sueldos</h3><b>{money(staffBill(g))}/mes</b></div><div className="kpi"><h3>Caja</h3><b className={c.balance < 0 ? 'bad' : ''}>{money(c.balance)}</b></div>
      </div>
      {msg && <div className="card acc">{msg}</div>}
      <div className="card scroll-x"><table>
        <thead><tr><th>Puesto</th><th>Nombre</th><th>Capacidad</th><th className="r">Edad</th><th className="r">Sueldo</th><th className="r">Contrato</th><th /></tr></thead>
        <tbody>{STAFF_ROLES.map(r => { const s = staffOf(g, r.k); return (
          <tr key={r.k}><td title={r.help}><b style={{ fontWeight: 600 }}>{r.name}</b><div className="dim sm" style={{ whiteSpace: 'normal', maxWidth: 380 }}>{r.help}</div></td>
            {s ? <><td>{s.name}</td><td><AbBar v={s.ability} /></td><td className="r num">{s.age}</td><td className="r num">{money(s.wage)}</td><td className="r num dim">{s.contractEnd}</td>
              <td>{sure === s.id ? <span className="row"><button className="btn sm danger" onClick={() => { setMsg(fireStaff(g, s.id)); setSure(null); setRole(r.k); done() }}>Confirmar (US$ {(s.wage * 3).toLocaleString('es-AR')})</button><button className="btn sm" onClick={() => setSure(null)}>No</button></span>
                : <button className="btn sm" onClick={() => setSure(s.id)}>Desvincular</button>}</td></>
              : <><td className="bad">Vacante</td><td colSpan={4} className="dim sm">Rinde como si lo ocupara alguien muy flojo.</td><td><button className="btn sm primary" onClick={() => setRole(r.k)}>Buscar</button></td></>}
          </tr>) })}</tbody></table></div>
      <div className="card col">
        <div className="row wrap between"><h3>Profesionales libres</h3><Seg value={STAFF_ROLES.findIndex(r => r.k === role)} options={STAFF_ROLES.map(r => r.name)} onChange={v => setRole(STAFF_ROLES[v].k)} /></div>
        {staffOf(g, role) && <div className="dim sm">El puesto de {STAFF_ROLES.find(r => r.k === role)!.name.toLowerCase()} está ocupado. Para contratar a otro, primero desvinculá a {staffOf(g, role)!.name}.</div>}
        <table><thead><tr><th>Nombre</th><th>Capacidad</th><th className="r">Edad</th><th className="r">Sueldo</th><th /></tr></thead>
          <tbody>{pool.map(s => (
            <tr key={s.id}><td>{s.name}</td><td><AbBar v={s.ability} /></td><td className="r num">{s.age}</td><td className="r num">{money(s.wage)}/mes</td>
              <td className="r"><button className="btn sm" disabled={!!staffOf(g, role)} onClick={() => { const e = hireStaff(g, s.id); setMsg(e ?? `${s.name} es el nuevo ${STAFF_ROLES.find(r => r.k === s.role)!.name.toLowerCase()}.`); done() }}>Contratar</button></td></tr>))}</tbody></table>
        <div className="dim sm">La lista de profesionales disponibles se renueva de a poco con el correr de las semanas.</div>
      </div>
    </div>
  )
}

// ---------- prensa ----------
export function PressModal({ onClose }: { onClose: () => void }) {
  return <Modal onClose={onClose}><PressPanel onDone={onClose} onLater={onClose} /></Modal>
}
/** Las preguntas de la conferencia con sus respuestas (sin la ventana). */
export function PressPanel({ onDone, onLater }: { onDone: () => void; onLater?: () => void }) {
  const { g, refresh, save } = useGame()
  const pr = g.press
  const [picks, setPicks] = useState<number[]>(() => pr?.questions.map(() => -1) ?? [])
  if (!pr) return null
  const f = g.fixtures.find(x => x.id === pr.fixtureId), me = g.clubs[g.userClubId]
  const opp = f ? g.clubs[f.home === me.id ? f.away : f.home] : null
  const finish = () => { save(); refresh(); onDone() }
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>{opp && <Badge club={opp} size={40} />}<div className="grow"><h3>Conferencia de prensa</h3><h2>{pr.kind === 'pre' ? `Antes de jugar con ${opp?.short}` : `Después del partido con ${opp?.short}`}</h2></div>{onLater && <button className="btn sm" onClick={onLater}>Más tarde</button>}</div>
      <div className="dim sm" style={{ marginBottom: 12, lineHeight: 1.5 }}>Lo que digas llega al vestuario y a la dirigencia. Si no respondés antes de seguir, habla el ayudante con respuestas prudentes.</div>
      <div className="col" style={{ gap: 16 }}>{pr.questions.map((q, i) => (
        <div key={i} className="col" style={{ gap: 6 }}><b>{q.q}</b>
          {q.opts.map((o, j) => <button key={j} className={`opt ${picks[i] === j ? 'on' : ''}`} onClick={() => setPicks(picks.map((x, k) => (k === i ? j : x)))}><span>{o.t}</span></button>)}
        </div>))}</div>
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button className={`btn sm ${g.delegate.press ? 'on' : ''}`} onClick={() => { g.delegate.press = !g.delegate.press; save(); refresh() }}>{g.delegate.press ? '✓ ' : ''}Que hable siempre el ayudante</button>
        <span className="grow" />
        <button className="btn" onClick={() => { delegatePress(g); finish() }}>Que hable el ayudante</button>
        <button className="btn primary" disabled={picks.some(p => p < 0)} onClick={() => { answerPress(g, picks); finish() }}>Responder</button>
      </div>
    </div>
  )
}

// ---------- informe del rival ----------
export function ReportModal({ f, onClose, onApply }: { f: Fixture; onClose: () => void; onApply: (p: Partial<Tactic>) => void }) {
  const { g, openPlayer } = useGame()
  const r = scoutReport(g, f)
  const [applied, setApplied] = useState<number[]>([])
  const prec = r.accuracy >= 16 ? 'alta' : r.accuracy >= 10 ? 'media' : 'baja'
  return (
    <Modal onClose={onClose} wide>
      <div className="hero row wrap" style={{ gap: 18, marginBottom: 16 }}>
        <Badge club={r.opp} size={72} />
        <div className="grow"><h3>Informe del rival · {fmtDate(f.date)}</h3><h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>{r.opp.name}</h1><div className="dim">DT {r.opp.manager} · {r.formation} · precisión {prec} ({staffOf(g, 'scout')?.name ?? 'sin jefe de scouting'})</div></div>
        {r.form.length ? <><div className="kpi"><h3>Forma</h3><span className="row" style={{ gap: 3 }}>{r.form.map((x, i) => <span key={i} className="chip" style={{ color: x === 'G' ? 'var(--good)' : x === 'P' ? 'var(--bad)' : 'var(--dim)' }}>{x}</span>)}</span></div>
        <div className="kpi"><h3>Goles por partido</h3><b>{r.gf.toFixed(1)} / {r.gc.toFixed(1)}</b><span className="dim sm">a favor / en contra</span></div></>
          : <div className="kpi"><h3>Forma</h3><span className="dim">Todavía no jugó esta temporada</span></div>}
        <button className="btn sm" onClick={onClose}>Cerrar ✕</button>
      </div>
      <div className="dash">
        <div className="card s5 col"><h3>Cómo juega</h3>{r.style.map((s, i) => <div key={i} className="row" style={{ alignItems: 'flex-start' }}><span className="acc">●</span><span>{s}</span></div>)}
          <h3 style={{ marginTop: 6 }}>Punto débil</h3><div>{r.weak}</div>
          {r.threat && <><h3 style={{ marginTop: 6 }}>Cuidado con</h3><div>{r.threat.txt}</div></>}</div>
        <div className="card s7 col"><div className="row between"><h3>Lo que sugiere el cuerpo técnico</h3>{r.tips.length > 1 && <button className="btn sm primary" onClick={() => { r.tips.forEach(t => onApply(t.patch)); setApplied(r.tips.map((_, i) => i)) }}>Aplicar todo</button>}</div>
          {r.tips.length ? r.tips.map((t, i) => (
            <div key={i} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line2)' }}><span className="grow">{t.txt}</span>
              <button className={`btn sm ${applied.includes(i) ? 'on' : ''}`} onClick={() => { onApply(t.patch); setApplied([...applied, i]) }}>{applied.includes(i) ? '✓ Aplicado' : 'Aplicar'}</button></div>))
            : <div className="dim">No hay ajustes que recomendar: con tu planteo alcanza.</div>}
          <div className="dim sm">Aplicar cambia tus instrucciones tácticas; las podés revisar en Tácticas.</div></div>
        <div className="card s12 scroll-x"><h3 style={{ marginBottom: 6 }}>Once probable</h3>
          <table><thead><tr><th>Jugador</th><th>Pos</th><th className="r">Valoración</th></tr></thead>
            <tbody>{r.xi.map(x => <tr key={x.pid} data-pid={x.pid} className="click" onClick={() => openPlayer(x.pid)}><td>{g.players[x.pid]?.name}</td><td><span className="pill">{x.pos}</span></td><td className="r num"><b>{x.est}</b></td></tr>)}</tbody></table>
          {r.accuracy < 16 && <div className="dim sm" style={{ marginTop: 6 }}>Con un mejor jefe de scouting los rangos se vuelven valores exactos.</div>}</div>
      </div>
    </Modal>
  )
}
export { POS_LABEL }
