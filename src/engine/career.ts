// Mercado de pases, finanzas, dirigencia, juveniles y carrera del DT.
import { makeStaff, sab } from './week'
import { demand, demandWage, evalOffer, initSquad, naturalStatusFor, wageShown, type Demand, type NegResult } from './squad'
import { addDays, autoPick, clubsIn, daysBetween, fmtDate, fmtDay, leagueFx, news, readDecisionNews, squadOf, tableOf, valuation } from './game'
import { FORMATIONS, POS_LINE, POS_WEIGHTS, ageOn, bestRating, posRating, rawRating } from './positions'
import { Rng, clamp } from './rng'
import { ATTRS, A, STAFF_ROLES, emptyLedger, emptyStats, type Club, type Deal, type DealState, type DealWhy, type Fixture, type Game, type JobOffer, type Line, type Manager, type MgrAttr, type Offer, type Player, type Pos, type StaffRole, type Terms } from './types'

// ---------- DT ----------
export const BACKGROUNDS: { id: string; name: string; desc: string; points: number; rep: number }[] = [
  { id: 'idolo', name: 'Ex figura internacional', desc: 'Jugaste mundiales y en Europa. El vestuario te respeta de entrada y la dirigencia te banca más, pero tenés menos formación como entrenador.', points: 62, rep: 78 },
  { id: 'primera', name: 'Ex jugador de Primera', desc: 'Una carrera larga en el fútbol argentino. Buen equilibrio entre nombre y oficio.', points: 68, rep: 60 },
  { id: 'ascenso', name: 'Hecho en el ascenso', desc: 'Años de canchas difíciles y presupuestos cortos. Más recursos como entrenador, menos cartel.', points: 74, rep: 42 },
  { id: 'academico', name: 'Entrenador de escuela', desc: 'Nunca jugaste profesionalmente. Te formaste estudiando: el mejor perfil técnico, pero tenés que ganarte al plantel y a la dirigencia.', points: 80, rep: 28 },
]
export const PRESETS: { name: string; attrs: Record<MgrAttr, number> }[] = [
  { name: 'Equilibrado', attrs: { att: 1, def: 1, tac: 1, mot: 1, you: 1, neg: 1 } },
  { name: 'Ofensivo', attrs: { att: 3, def: 0.5, tac: 1.5, mot: 1, you: 0.5, neg: 0.5 } },
  { name: 'Pragmático', attrs: { att: 0.5, def: 3, tac: 1.5, mot: 1, you: 0.3, neg: 0.7 } },
  { name: 'Formador', attrs: { att: 1, def: 0.7, tac: 1, mot: 1, you: 3, neg: 0.5 } },
  { name: 'Motivador', attrs: { att: 1, def: 1, tac: 0.5, mot: 3, you: 0.7, neg: 0.8 } },
  { name: 'Manager', attrs: { att: 0.7, def: 0.7, tac: 1, mot: 0.8, you: 1, neg: 3 } },
]
export function distribute(points: number, w: Record<MgrAttr, number>): Record<MgrAttr, number> {
  const keys = Object.keys(w) as MgrAttr[]
  const tot = keys.reduce((s, k) => s + w[k], 0)
  const out = Object.fromEntries(keys.map(k => [k, clamp(Math.round((points * w[k]) / tot), 1, 20)])) as Record<MgrAttr, number>
  let diff = points - keys.reduce((s, k) => s + out[k], 0)
  for (let i = 0; diff !== 0 && i < 200; i++) { const k = keys[i % 6]; if (diff > 0 && out[k] < 20) { out[k]++; diff-- } else if (diff < 0 && out[k] > 1) { out[k]--; diff++ } }
  return out
}
export const mgrBoost = (m: Manager): [number, number, number] => [1 + (m.attrs.att - 10) * 0.004, 1 + (m.attrs.def - 10) * 0.004, 1 + (m.attrs.tac - 10) * 0.004]

// ---------- finanzas ----------
export const baseBudget = (rep: number) => Math.round((60000 * 1.115 ** (rep - 45)) / 10000) * 10000
export const wageBill = (g: Game, clubId: number) => squadOf(g, clubId).reduce((s, p) => s + p.wage, 0)
export function initFinances(g: Game) {
  for (const c of Object.values(g.clubs)) {
    c.budget = baseBudget(c.rep); c.balance = Math.round(c.budget * 1.4); c.ledger = emptyLedger()
    c.wageBudget = Math.round((wageBill(g, c.id) * 1.12) / 1000) * 1000
  }
}
export function dailyFinances(g: Game, days: number) {
  // una sola pasada por todos los jugadores para sumar la masa salarial de cada club
  const bills: Record<number, number> = {}
  for (const p of Object.values(g.players)) bills[p.clubId] = (bills[p.clubId] ?? 0) + p.wage
  for (const c of Object.values(g.clubs)) {
    if (c.division === 0) continue // los clubes del exterior no llevan economía
    const w = ((bills[c.id] ?? 0) / 30) * days
    const tv = ((c.division === 1 ? 110000 + c.rep * 1500 : c.division === 2 ? 40000 : 15000) / 30) * days
    // gastos de funcionamiento: estadio, sedes, inferiores y estructura, según el tamaño del club
    const ops = ((c.rep * c.rep * 15) / 30) * days
    c.balance += tv - w - ops; c.ledger.tv += tv; c.ledger.wages += w + ops
  }
}
export function gateIncome(g: Game, clubId: number, att: number) {
  const c = g.clubs[clubId], inc = att * (c.division === 1 ? 5.5 : c.division === 2 ? 3.5 : 2.5)
  c.balance += inc; c.ledger.gate += inc
}
export function prize(g: Game, clubId: number, amount: number) { const c = g.clubs[clubId]; c.balance += amount; c.ledger.prizes += amount }

// ---------- dirigencia ----------
/** Nombre de la categoría de un club (la tercera se juega en dos zonas: Primera B y Federal A). */
export const DIV_NAMES = ['Exterior', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A']
export const divName = (c: Pick<Club, 'division' | 'zone'>) => c.division === 3 ? (c.zone === 'B' ? 'Federal A' : 'Primera B') : DIV_NAMES[c.division] ?? ''
/** Objetivo de la dirigencia según el lugar del club entre los de su categoría por reputación. Puro: lo usa también la pantalla de nueva partida. */
export function boardObjective(clubs: Pick<Club, 'id' | 'rep' | 'division'>[], clubId: number): { objective: string; target: number } {
  const c = clubs.find(x => x.id === clubId)!
  const rank = clubs.filter(x => x.division === c.division).sort((a, b) => b.rep - a.rep || a.id - b.id).findIndex(x => x.id === c.id) + 1
  const [objective, target] = c.division === 3
    ? rank <= 6 ? ['Ascender a la Primera Nacional', 2] : ['Terminar en mitad de tabla', 5]
    : c.division === 1
    ? rank <= 3 ? ['Pelear el campeonato', 4] : rank <= 10 ? ['Clasificar a las copas', 9] : rank <= 22 ? ['Terminar en mitad de tabla', 18] : ['Mantener la categoría', 28]
    : rank <= 5 ? ['Ascender a Primera', 2] : rank <= 18 ? ['Clasificar al Reducido', 4] : ['Terminar en mitad de tabla', 12]
  return { objective: objective as string, target: target as number }
}
export function setObjective(g: Game) { Object.assign(g.board, boardObjective(Object.values(g.clubs), g.userClubId)) }
/** Cuánto exige la dirigencia: los clubes grandes tienen menos paciencia (más de 1), los chicos más (menos de 1). */
export const boardDemand = (c: Club) => clamp(1 + (c.rep - 60) / 40, 0.7, 1.6)
const ptsOf = (f: Fixture, clubId: number) => {
  const us = f.home === clubId ? 0 : 1, gf = us ? f.ag : f.hg, gc = us ? f.hg : f.ag
  return f.pens ? (f.pens[us] > f.pens[1 - us] ? 3 : 0) : gf > gc ? 3 : gf === gc ? 1 : 0
}
/** Derrotas seguidas del club (contando la de hoy), en todas las competencias. */
export function lossStreak(g: Game, clubId: number): number {
  const fx = g.fixtures.filter(f => f.played && (f.home === clubId || f.away === clubId)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  let n = 0
  for (const f of fx) { if (ptsOf(f, clubId) > 0) break; n++ }
  return n
}
/** Puesto en el torneo de liga y qué parte de la liga ya jugó (la Liga Profesional va por tabla anual). */
function leagueStanding(g: Game, c: Club): { pos: number; done: number } | null {
  const comps = c.division === 1 ? ['AP', 'CL'] : c.division === 2 ? ['PN'] : c.division === 3 ? ['T3'] : []
  const fx = g.fixtures.filter(f => comps.includes(f.comp) && !f.knockout)
  const mine = fx.filter(f => f.home === c.id || f.away === c.id)
  if (!mine.length) return null
  const table = tableOf(fx, clubsIn(g, c.division, c.division === 1 ? undefined : c.zone))
  return { pos: table.findIndex(r => r.clubId === c.id) + 1, done: mine.filter(f => f.played).length / mine.length }
}
export function boardAfterMatch(g: Game, pts: number, repDiff: number, home: boolean) {
  const exp = clamp(1.35 + repDiff / 40 + (home ? 0.2 : -0.2), 0.6, 2.15)
  const m = g.manager, c = g.clubs[g.userClubId]
  m.cur.pj++; if (pts === 3) m.cur.g++; else if (pts === 1) m.cur.e++; else m.cur.p++
  // la exigencia del club multiplica todo; el prestigio del DT lo amortigua
  const k = boardDemand(c) * (1 - m.rep / 400)
  let d = (pts - exp) * 2.2 * k
  // una racha de derrotas pesa más que la suma de los partidos: desde la tercera seguida, cada una cuesta más
  const streak = pts === 0 ? Math.min(lossStreak(g, c.id), m.cur.pj) : 0
  if (streak >= 3) d -= (streak - 2) * 4.5 * k
  // de mitad de temporada en adelante, estar muy lejos del objetivo desgasta partido a partido
  const st = leagueStanding(g, c)
  if (st && st.done >= 0.5) { const gap = st.pos - g.board.target - (c.division === 1 ? 4 : 3); if (gap > 0) d -= Math.min(4, gap * 0.5) * k }
  g.board.confidence = clamp(g.board.confidence + d, 0, 100)
  if (g.board.confidence <= 6 && m.cur.pj >= 5 && !g.board.fired) {
    g.board.fired = true
    g.board.offers = Object.values(g.clubs).filter(x => x.id !== c.id && x.division >= 1 && x.rep <= Math.max(52, c.rep - 4)).sort((a, b) => b.rep - a.rep).slice(0, 12).sort((a, b) => (a.id * 7919 + g.rngState) % 13 - (b.id * 7919 + g.rngState) % 13).slice(0, 3).map(x => x.id)
    news(g, { tag: 'directiva', clubId: c.id, title: `${c.name} despidió a ${m.name}`, body: `La comisión directiva decidió terminar el ciclo de ${m.name} por los malos resultados (${m.cur.g} ganados, ${m.cur.e} empatados y ${m.cur.p} perdidos). Ya hay clubes interesados en sus servicios.` })
  }
}
export function closeCareerSeason(g: Game, note: string) {
  const m = g.manager
  if (m.cur.pj) m.career.push({ season: g.season, clubId: g.userClubId, ...m.cur, note })
  m.cur = { pj: 0, g: 0, e: 0, p: 0 }
}
/** Despedido, toma un club nuevo: los tratos abiertos se caen con mensajes sin leer (nadie se los mostró antes). */
export function takeJob(g: Game, clubId: number) { switchClub(g, clubId, 'Despedido', -6, false) }
/** Acepta una oferta de trabajo de otro club. La confirmación nombró los tratos que se caen: sus mensajes nacen leídos. */
export function acceptJob(g: Game, clubId: number) { switchClub(g, clubId, `Se fue a ${g.clubs[clubId].short}`, 2, true) }
const coachName = (g: Game) => `${NOMBRES[(g.nextId * 7) % NOMBRES.length]} ${APELLIDOS[(g.nextId++ * 13) % APELLIDOS.length]}`
function switchClub(g: Game, clubId: number, note: string, repDelta: number, saw: boolean) {
  closeCareerSeason(g, note)
  const old = g.clubs[g.userClubId]
  // antes de cambiar de club: los tratos del club viejo se caen y las ofertas recibidas quedan registradas
  for (const d of myOpen(g)) {
    fall(g, d, 'club', `Se cayó: dejaste ${old.short}`)
    dealNews(g, d, `Se cayó tu ${d.state === 'agreed' ? 'acuerdo' : 'oferta'} por ${d.name}: dejaste ${old.short}`, `Con tu salida de ${old.name}, el trato con ${d.clubName} quedó sin efecto.`, saw)
  }
  for (const o of g.offers) { recordOffer(g, o, 'fell', 'club'); if (saw) readDecisionNews(g, `offer${o.id}`) }
  old.manager = coachName(g)
  g.userClubId = clubId
  const c = g.clubs[clubId]
  c.manager = g.manager.name
  g.manager.rep = clamp(g.manager.rep + repDelta, 15, 99)
  g.board = { confidence: 55, objective: '', target: 0, fired: false, offers: [] }
  initSquad(g, clubId)
  const came = moveStaff(g, old, c)
  for (const j of [...(g.jobOffers ?? [])]) if (j.clubId !== clubId) dropJob(g, j.clubId) // los otros clubes que esperaban respuesta nombran DT
  setObjective(g); g.offers = []; g.jobOffers = []; g.press = null
  news(g, { tag: 'club', clubId, title: `${g.manager.name}, nuevo DT de ${c.name}`, body: `Tras su salida de ${old.name}, ${g.manager.name} firmó con ${c.name}. Objetivo de la dirigencia: ${g.board.objective.toLowerCase()}.` })
  const clubSt = g.staff.filter(s => s.clubId === c.id && CLUB_STAFF.includes(s.role)).map(staffLabel)
  news(g, { tag: 'club', clubId, me: true, title: came.length ? `${came.map(s => s.name).join(' y ')} ${came.length > 1 ? 'llegan' : 'llega'} con vos a ${c.short}` : `Llegás solo a ${c.short}`,
    body: `${came.length ? `Con ${g.manager.name} ${came.length > 1 ? 'llegan' : 'llega'} ${came.map(staffLabel).join(' y ')}.` : 'Llegás sin ayudante de campo ni preparador físico: esos puestos quedan vacantes hasta que contrates a alguien.'}${came.length === 1 ? ` El puesto de ${roleName(COACH_STAFF.find(r => r !== came[0].role)!).toLowerCase()} queda vacante.` : ''} En el club ${clubSt.length > 1 ? 'te esperan' : 'te espera'} ${clubSt.join(', ')}.` })
}
// el ayudante y el preparador físico son gente del DT y lo siguen; el médico, el scouting y las inferiores son del club
const COACH_STAFF: StaffRole[] = ['asst', 'fit'], CLUB_STAFF: StaffRole[] = ['doc', 'scout', 'youth']
const roleName = (r: StaffRole) => STAFF_ROLES.find(x => x.k === r)!.name
const staffLabel = (s: { name: string; role: StaffRole }) => `${s.name} (${roleName(s.role).toLowerCase()})`
/** Cambio de club: la gente del DT se va con él y el club nuevo pone a los suyos en los puestos del club. Devuelve los que llegaron con el DT. */
function moveStaff(g: Game, from: Club, to: Club) {
  const came = g.staff.filter(s => s.clubId === from.id && COACH_STAFF.includes(s.role))
  for (const s of g.staff) if (s.clubId === to.id && COACH_STAFF.includes(s.role)) s.clubId = 0 // si el DT vuelve a un club donde quedó gente suya de antes, esa gente queda libre
  for (const s of came) s.clubId = to.id
  const rng = new Rng(g.rngState)
  for (const role of CLUB_STAFF) if (!g.staff.some(s => s.clubId === to.id && s.role === role)) {
    // misma calidad que el cuerpo técnico inicial: según la reputación del club
    g.staff.push(makeStaff(g, role, 4 + to.rep * 0.12 + rng.gauss() * 2.2, to.id, rng))
  }
  g.rngState = rng.s
  return came
}
/** Lo que pasa al aceptar un trabajo: se pierden las ofertas por jugadores, las otras ofertas de trabajo y la conferencia abierta; el ayudante y el preparador físico vienen con el DT (`follow`) y el resto del cuerpo técnico queda en el club (`staff`). */
export function jobConsequences(g: Game, clubId: number): { offers: number; jobs: number; press: boolean; staff: number; follow: number; staffRoles: StaffRole[]; followRoles: StaffRole[]; deals: { pid: number; name: string; clubName: string; state: DealState }[] } {
  const mine = g.staff.filter(s => s.clubId === g.userClubId)
  const followRoles = COACH_STAFF.filter(r => mine.some(s => s.role === r)), staffRoles = CLUB_STAFF.filter(r => mine.some(s => s.role === r))
  return {
    offers: g.offers.filter(o => g.players[o.pid]).length,
    jobs: (g.jobOffers ?? []).filter(j => j.clubId !== clubId && j.until >= g.date).length,
    press: !!g.press,
    staff: staffRoles.length, follow: followRoles.length, staffRoles, followRoles,
    deals: myOpen(g).map(d => ({ pid: d.pid, name: d.name, clubName: d.clubName, state: d.state })),
  }
}
/** De mitad de temporada (6 días) o de fin de temporada (hasta comenzar la próxima). Las partidas viejas no guardan el tipo. */
export const jobKind = (g: Game, j: JobOffer): 'mid' | 'season' => j.kind ?? (g.seasonOver ? 'season' : 'mid')
const INTERIM = 'Cuerpo técnico interino'
/** Saca una oferta de trabajo. Si el club había quedado con un interino, nombra DT. `why` avisa al DT que se le pasó el plazo. */
function dropJob(g: Game, clubId: number, why?: 'expired' | 'season') {
  const c = g.clubs[clubId]
  if (!c || !(g.jobOffers ?? []).some(j => j.clubId === clubId)) return
  g.jobOffers = g.jobOffers!.filter(j => j.clubId !== clubId)
  const interim = c.manager === INTERIM
  if (interim) {
    c.manager = coachName(g)
    news(g, { tag: 'club', clubId: c.id, title: `${c.manager} es el nuevo DT de ${c.short}`, body: `${c.name} cerró la llegada de ${c.manager} para reemplazar al entrenador despedido.` })
  }
  if (why) news(g, { tag: 'directiva', clubId: c.id, ref: c.id, me: true, title: `Venció la oferta de ${c.name} para dirigir`, body: `${why === 'season' ? 'Comenzó la temporada sin tu respuesta' : 'No respondiste a tiempo'} y la oferta de ${c.name} quedó sin efecto.${interim ? ` El club eligió a ${c.manager} como entrenador.` : ''}` })
}
/** Rechaza una oferta de trabajo: el club busca otro DT enseguida, igual que si la oferta venciera. */
export function rejectJob(g: Game, clubId: number) { dropJob(g, clubId) }
/** Al comenzar la temporada se pierden las ofertas de trabajo sin responder. */
export function expireSeasonJobs(g: Game) { for (const j of [...(g.jobOffers ?? [])]) dropJob(g, j.clubId, 'season') }

// ---------- el mercado de entrenadores ----------
/** Una vez por semana: los clubes que andan mal echan al DT; si tu prestigio alcanza, te llaman. */
export function managerMarket(g: Game, rng: Rng) {
  const me = g.clubs[g.userClubId], m = g.manager
  for (const o of [...(g.jobOffers ?? [])]) if (o.until < g.date) dropJob(g, o.clubId, 'expired')
  for (const comp of ['AP', 'CL', 'PN', 'T3']) {
    const cp = g.comps[comp]
    if (!cp || cp.phase !== 'league') continue
    const teams = clubsIn(g, cp.division), fx = leagueFx(g, comp)
    const avgRep = teams.reduce((s, t) => s + g.clubs[t].rep, 0) / teams.length
    for (const r of tableOf(fx, teams)) {
      const c = g.clubs[r.clubId]
      if (c.id === me.id || c.firedAt === g.season || r.pj < 5) continue
      // mismo criterio que con el DT del usuario: los grandes aguantan menos una mala campaña o una racha de derrotas
      const exp = 1.35 + (c.rep - avgRep) / 25, dem = boardDemand(c)
      const streak = lossStreak(g, c.id), limit = dem >= 1.3 ? 5 : dem >= 0.9 ? 6 : 7
      const bad = r.pts / r.pj <= exp - 0.55 / dem
      if (!(streak >= limit ? rng.chance(0.7) : bad && rng.chance(0.3))) continue
      c.firedAt = g.season
      const old = c.manager
      if (c.rep >= me.rep - 2 && m.rep >= c.rep - 14 && !g.board.fired) {
        c.manager = INTERIM
        const until = addDays(g.date, 6)
        g.jobOffers = [...(g.jobOffers ?? []), { clubId: c.id, until, kind: 'mid' }]
        news(g, { tag: 'directiva', clubId: c.id, act: 'job', ref: c.id, title: `${c.name} te quiere como DT`, body: `${c.name} despidió a ${old} y la dirigencia se comunicó con ${m.name} para ofrecerle el cargo. Respondé hasta el ${fmtDate(until)}.` })
      } else {
        c.manager = coachName(g)
        news(g, { tag: 'club', clubId: c.id, title: `${c.name} despidió a ${old}`, body: `Por los malos resultados, ${c.name} terminó el ciclo de ${old}. Lo reemplaza ${c.manager}.` })
      }
    }
  }
}
/** Al final de la temporada, si te fue bien, te llaman clubes más grandes. */
export function seasonOffers(g: Game, rng: Rng) {
  const me = g.clubs[g.userClubId], m = g.manager
  if (g.board.confidence < 60) return
  const cands = Object.values(g.clubs).filter(c => c.division >= 1 && c.id !== me.id && c.rep > me.rep + 1 && c.rep <= m.rep + 6)
  for (const c of rng.shuffle(cands).slice(0, 2)) {
    if (!rng.chance(0.55)) continue
    g.jobOffers = [...(g.jobOffers ?? []), { clubId: c.id, until: addDays(g.date, 20), kind: 'season' }]
    news(g, { tag: 'directiva', clubId: c.id, act: 'job', ref: c.id, title: `${c.name} te ofrece dirigir`, body: `Después de tu temporada, la dirigencia de ${c.name} te ofreció ser su entrenador. Si aceptás, empezás la próxima temporada en el club. Respondé antes de comenzar la próxima temporada.` })
  }
}

// ---------- mercado ----------
export function windowOpen(date: string): boolean {
  const md = date.slice(5)
  return (md >= '01-01' && md <= '02-20') || (md >= '06-25' && md <= '08-10')
}
/** Estado del libro: abierto con el día del cierre y los días que quedan ("hoy" es el último día: 0), o cerrado con la reapertura.
 *  Desde el 11 de agosto reabre al comenzar la temporada siguiente (10 ene), sin contar días: entre temporadas el tiempo no corre. */
export interface WindowState { open: boolean; closesOn?: string; daysLeft?: number; opensOn?: string; daysToOpen?: number; nextSeason?: boolean }
export function windowState(date: string): WindowState {
  const y = Number(date.slice(0, 4)), md = date.slice(5)
  if (windowOpen(date)) { const closesOn = `${y}-${md <= '02-20' ? '02-20' : '08-10'}`; return { open: true, closesOn, daysLeft: daysBetween(date, closesOn) } }
  if (md > '02-20' && md < '06-25') { const opensOn = `${y}-06-25`; return { open: false, opensOn, daysToOpen: daysBetween(date, opensOn) } }
  return { open: false, opensOn: `${y + 1}-01-10`, nextSeason: true }
}
/** "El libro de pases está cerrado. Reabre el 25 de junio." (o "al comenzar la temporada 2027 (10 ene)"). */
export function closedReason(date: string): string {
  const ws = windowState(date)
  return `El libro de pases está cerrado. ${ws.nextSeason ? `Reabre al comenzar la temporada ${ws.opensOn!.slice(0, 4)} (10 ene).` : 'Reabre el 25 de junio.'}`
}
const nf = (d: number) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: d })
/** Plata en los textos del motor, como la escribe la interfaz: "US$ 1,4 M", "US$ 850 mil", "US$ 500". */
export const usd = (v: number) => {
  const a = Math.abs(v)
  if (a < 1000) return `US$ ${nf(0).format(v)}`
  if (Math.round(a / 1000) < 1000) return `US$ ${nf(0).format(Math.round(v / 1000))} mil`
  return `US$ ${nf(a >= 1e7 ? 1 : 2).format(v / 1e6)} M`
}
const FOREIGN = ['Benfica', 'Porto', 'Ajax', 'Sevilla', 'Villarreal', 'Betis', 'Bologna', 'Fiorentina', 'Flamengo', 'Palmeiras', 'Botafogo', 'Inter Miami', 'Atlanta United', 'Brighton', 'Wolverhampton', 'Olympique de Marsella', 'Zenit', 'Cruz Azul', 'Monterrey', 'Sporting de Lisboa', 'Atlético Mineiro', 'Girona']
const hash = (a: number, b: number) => ((a * 2654435761 + b * 40503) >>> 0) % 1000 / 1000
/** Cargo mínimo que pide un club por prestar a un jugador (también el valor inicial del campo). */
export const loanFee = (p: Player) => Math.max(5000, Math.round((p.value * 0.08) / 5000) * 5000)
/** Monto desde el que el club acepta una compra: fijo por jugador y temporada; ×1,1 si el club está molesto con el DT. */
const bidThreshold = (g: Game, p: Player, cool = 1) => Math.round((askingPrice(g, p) * (0.9 + hash(p.id, g.season) * 0.2) * (1 - (g.manager.attrs.neg - 10) * 0.012) * cool) / 10000) * 10000

export function squadRank(g: Game, p: Player): number {
  return squadOf(g, p.clubId).filter(x => x.line === p.line || true).sort((a, b) => b.ca - a.ca).findIndex(x => x.id === p.id)
}
/** Precio de un transferible para los clubes que lo buscan para reforzar un puesto (`askingPrice`; el interés por los transferibles no lo usa). */
export const LISTED_PRICE = 0.75
/** Chance diaria de una oferta por un jugador propio, con el libro abierto: transferible o que quiere irse (`marketTick`). */
export const OFFER_CHANCE = { listed: 0.12, out: 0.05 }
export function askingPrice(g: Game, p: Player): number {
  const rank = squadRank(g, p)
  let v = p.value * (rank < 11 ? 1.4 : rank < 18 ? 1.15 : 0.95)
  if (p.listed) v *= LISTED_PRICE
  if (p.contractEnd <= g.season) v *= 0.7
  return Math.max(20000, Math.round(v / 10000) * 10000)
}
export function wageDemand(g: Game, p: Player, dest: Club): number {
  const base = valuation(p, g.date).wage * (1 + (dest.rep - 60) / 180)
  return Math.round(Math.max(p.wage * 1.05, base) / 100) * 100
}

function freeNumber(g: Game, clubId: number, p: Player): number {
  const used = new Set(squadOf(g, clubId).map(x => x.num))
  if (!used.has(p.num)) return p.num
  for (let n = p.line === 'GK' ? 1 : 2; n < 100; n++) if (!used.has(n)) return n
  return 99
}
function dropFromTactics(g: Game, p: Player) {
  const t = g.clubs[p.clubId]?.tactic
  if (!t) return
  t.lineup = t.lineup.map(id => (id === p.id ? 0 : id)); t.bench = t.bench.filter(id => id !== p.id)
}
/**
 * Ejecuta un pase. `why` dice por qué se cancelan las otras ofertas por el jugador (`sold`: el DT aceptó una; `clause`: otro club pagó la
 * cláusula; `gone`: cualquier otra vía) y `read`, si el DT ya vio esa consecuencia (la venta que confirmó, el fichaje que firmó): entonces
 * la noticia del pase y los mensajes de las ofertas canceladas nacen leídos.
 */
export function doTransfer(g: Game, p: Player, toId: number, fee: number, loan = false, quiet = false, terms?: Terms, why: DropWhy = 'gone', read = false) {
  const from = g.clubs[p.clubId], to = g.clubs[toId]
  dropFromTactics(g, p)
  from.balance += fee; from.ledger.sales += fee
  to.balance -= fee; to.budget -= fee; to.ledger.buys += fee
  if (!loan) from.budget += Math.round(fee * 0.6)
  p.num = freeNumber(g, toId, p)
  if (loan) { p.loanFrom = from.id; p.loan = true } else { p.wage = terms?.wage ?? wageDemand(g, p, to); p.contractEnd = g.season + (terms?.years ?? 2); p.loan = false; p.loanFrom = undefined; p.clause = terms?.clause || undefined; p.youth = false }
  if (terms) { to.balance -= terms.bonus; to.ledger.buys += terms.bonus }
  p.status = toId === g.userClubId ? (terms?.status ?? undefined) : undefined
  p.recent = []; p.promise = null; p.wantsOut = false; p.reserve = false; p.happy = 72; p.tfocus = undefined
  if (p.outDate) p.outDate = undefined
  if (p.moodNote) p.moodNote = undefined
  if (p.promiseLog) p.promiseLog = undefined
  p.clubId = toId; p.listed = false; p.morale = clamp(p.morale + 8, 0, 100)
  const mine = from.id === g.userClubId || to.id === g.userClubId
  g.transfers.unshift({ date: g.date, pid: p.id, name: p.name, from: from.name, to: to.name, fee, loan, ...(mine ? { mine } : {}) })
  if (g.transfers.length > 300) g.transfers.length = 300
  dropOffersFor(g, p.id, why, read, to.short)
  if (toId === g.userClubId) g.shortlist = g.shortlist.filter(id => id !== p.id) // si se va a otro club, el DT lo sigue observando
  if (!quiet && (mine || fee >= 1500000)) news(g, {
    tag: 'mercado', clubId: to.id, pid: p.id, ...(from.id === g.userClubId ? { me: true } : {}), ...(read && mine ? { read: true } : {}), title: `${p.name} ${loan ? 'llega a préstamo a' : 'es nuevo jugador de'} ${to.short}`,
    body: `${to.name} ${loan ? 'acordó el préstamo' : 'cerró la contratación'} de ${p.name}, proveniente de ${from.name}${fee ? `, a cambio de US$ ${fee.toLocaleString('es-AR')}` : ''}.`,
  })
}
function sellAbroad(g: Game, p: Player, buyer: string, fee: number, why: DropWhy = 'gone', read = false) {
  const from = g.clubs[p.clubId], mine = from.id === g.userClubId
  dropFromTactics(g, p)
  from.balance += fee; from.ledger.sales += fee; from.budget += Math.round(fee * 0.6)
  g.transfers.unshift({ date: g.date, pid: p.id, name: p.name, from: from.name, to: buyer, fee, ...(mine ? { mine } : {}) })
  news(g, { tag: 'mercado', clubId: from.id, pid: p.id, ...(read && mine ? { read: true } : {}), title: `${p.name} se va a ${buyer}`, body: `${from.name} vendió a ${p.name} a ${buyer} en US$ ${fee.toLocaleString('es-AR')}. El jugador, de ${ageOn(p.birth, g.date)} años, seguirá su carrera en el exterior.` })
  removePlayer(g, p, why, read, buyer)
}
/** Saca a un jugador del juego (venta al exterior, retiro, recorte del plantel). Las ofertas por él quedan registradas con `why`. */
export function removePlayer(g: Game, p: Player, why: DropWhy = 'gone', read = false, by?: string) {
  dropFromTactics(g, p)
  dropOffersFor(g, p.id, why, read, by); g.shortlist = g.shortlist.filter(id => id !== p.id)
  delete g.players[p.id]
}
export type DropWhy = 'sold' | 'clause' | 'gone'
/** Borra las ofertas recibidas por un jugador que se va y registra cada una en `g.deals` (`fell` con `why`). Con `read`, el DT ya las vio nombradas: sus mensajes se marcan leídos. */
export function dropOffersFor(g: Game, pid: number, why: DropWhy | 'club', read = false, by?: string) {
  for (const o of g.offers) if (o.pid === pid) { recordOffer(g, o, 'fell', why, by); if (read) readDecisionNews(g, `offer${o.id}`) }
  g.offers = g.offers.filter(o => o.pid !== pid)
}

/** Un jugador que el club tiene a préstamo no es suyo: no se puede declarar transferible, ni recibir ofertas, ni vender. */
export const canSell = (p: Player) => p.loanFrom == null
/** Acepta una oferta por un jugador propio. Devuelve false (sin cambios) con el libro de pases cerrado o si el jugador no se puede vender. */
export function acceptOffer(g: Game, o: Offer): boolean {
  const p = g.players[o.pid]
  if (!p || !windowOpen(g.date) || !canSell(p)) return false
  g.offers = g.offers.filter(x => x.id !== o.id)
  recordOffer(g, o, 'sold'); readDecisionNews(g, `offer${o.id}`)
  // venderlo es la decisión del DT sobre su pedido de salida: acá y no en `doTransfer`, así vale también para la venta al exterior
  readDecisionNews(g, `out${o.pid}`)
  // la confirmación nombró las otras ofertas por él: se registran como canceladas y sus mensajes quedan leídos; la noticia de la venta, también
  if (o.from === 0) sellAbroad(g, p, o.fromName, o.fee, 'sold', true); else doTransfer(g, p, o.from, o.fee, false, false, undefined, 'sold', true)
  return true
}
export function rejectOffer(g: Game, o: Offer) { closeOffer(g, o, 'declined') }
function closeOffer(g: Game, o: Offer, state: DealState) {
  if (!g.offers.some(x => x.id === o.id)) return
  g.offers = g.offers.filter(x => x.id !== o.id)
  recordOffer(g, o, state); readDecisionNews(g, `offer${o.id}`)
}
/** Último día para responder una oferta: `marketTick` la borra al cerrar ese día (corre antes de pasar la fecha). */
export const offerDeadline = (o: Offer) => addDays(o.date, 9)
/** Pide más plata. Devuelve true si el comprador mejora la oferta; si no, se retira. Con el libro de pases cerrado no se negocia: devuelve false y la oferta queda como estaba. */
export function haggle(g: Game, o: Offer): boolean {
  const p = g.players[o.pid]
  if (!p || !windowOpen(g.date)) return false
  const top = p.value * (1.25 + (g.manager.attrs.neg - 10) * 0.02)
  const asked = Math.round((o.fee * 1.15) / 10000) * 10000
  const k = o.asks ?? 0
  o.asks = k + 1 // cada pedido es una tirada nueva; el id no cambia (lo usan la noticia y la bandeja)
  if (asked <= top && hash(o.id * 31 + k, p.id) < 0.75) { o.fee = asked; readDecisionNews(g, `offer${o.id}`); return true }
  closeOffer(g, o, 'withdrawn')
  return false
}

/** Actividad diaria del mercado (clubes de la IA, ofertas del exterior y por jugadores del usuario). */
export function marketTick(g: Game, days: number, rng: Rng) {
  for (const o of g.offers) if (offerDeadline(o) <= g.date && g.players[o.pid]?.clubId === g.userClubId) {
    // con `act` y `ref`: es el mensaje más nuevo de esa oferta y reemplaza en el conteo al de la oferta
    news(g, { tag: 'mercado', clubId: g.userClubId, pid: o.pid, act: 'offer', ref: o.id, me: true, title: `Venció la oferta de ${o.fromName} por ${g.players[o.pid].name}`, body: `No respondiste a tiempo y ${o.fromName} retiró la oferta de US$ ${o.fee.toLocaleString('es-AR')} por ${g.players[o.pid].name}.` })
    recordOffer(g, o, 'expired')
  }
  g.offers = g.offers.filter(o => offerDeadline(o) > g.date && g.players[o.pid])
  if (!windowOpen(g.date)) return
  // un jugador con el que el DT tiene un acuerdo no se lo vende la IA a otro club: el club dio su palabra
  const held = new Set(myOpen(g).filter(d => d.state === 'agreed').map(d => d.pid))
  const clubs = Object.values(g.clubs).filter(c => c.division > 0)
  const all = Object.values(g.players).filter(p => g.clubs[p.clubId]?.division > 0)
  for (let d = 0; d < days; d++) {
    // pase entre clubes argentinos
    if (rng.chance(0.85)) {
      const buyer = rng.weighted(clubs.filter(c => c.id !== g.userClubId && c.budget > 80000), c => c.budget)
      if (buyer && squadOf(g, buyer.id).length < 40) {
        const { lineup } = autoPick(g, buyer.id, buyer.tactic.formation)
        const slots = FORMATIONS[buyer.tactic.formation]
        let wi = 0, wr = 999
        lineup.forEach((id, i) => { const r = posRating(g.players[id], slots[i].pos); if (r < wr) { wr = r; wi = i } })
        const pos = slots[wi].pos
        let best: Player | null = null, bs = 0
        for (let k = 0; k < 70; k++) {
          const p = rng.pick(all)
          if (!g.players[p.id] || p.clubId === buyer.id || p.positions[0] !== pos || !canSell(p) || held.has(p.id)) continue
          const r = bestRating(p), price = askingPrice(g, p), src = g.clubs[p.clubId]
          if (r < wr + 2.5 || price > buyer.budget || buyer.rep < src.rep - 5 || squadOf(g, src.id).length <= 22) continue
          if (wageBill(g, buyer.id) + wageDemand(g, p, buyer) > buyer.wageBudget * 1.08) continue
          const s = (r - wr) / Math.sqrt(price)
          if (s > bs) { bs = s; best = p }
        }
        if (best) {
          const price = askingPrice(g, best)
          if (best.clubId === g.userClubId && best.clause && buyer.budget >= best.clause && (best.pers?.amb ?? 10) >= 12 && rng.chance(0.3)) {
            const others = g.offers.filter(o => o.pid === best!.id).map(o => o.fromName)
            news(g, { tag: 'mercado', clubId: g.userClubId, pid: best.id, title: `${buyer.name} pagó la cláusula de ${best.name}`, body: `${buyer.name} depositó los US$ ${best.clause.toLocaleString('es-AR')} de la cláusula de rescisión y ${best.name} deja el club.${others.length ? ` Se cancela${others.length > 1 ? 'n' : ''} también la${others.length > 1 ? 's' : ''} oferta${others.length > 1 ? 's' : ''} de ${others.join(' y ')} por él.` : ''}` })
            doTransfer(g, best, buyer.id, best.clause, false, false, undefined, 'clause')
          } else if (best.clubId === g.userClubId) { if (best.listed || best.wantsOut || rng.chance(0.5)) pushOffer(g, best, buyer.id, buyer.name, Math.round((price * (0.8 + rng.next() * 0.3)) / 10000) * 10000) }
          else doTransfer(g, best, buyer.id, price)
        }
      }
    }
    // refuerzos del exterior: los clubes con mucha caja compran afuera lo que no encuentran en el país
    if (rng.chance(0.12)) {
      const rich = clubs.filter(c => c.id !== g.userClubId && c.division === 1 && c.budget > baseBudget(c.rep) * 1.3 && squadOf(g, c.id).length < 34)
      if (rich.length) {
        const c = rng.weighted(rich, x => x.budget)
        const { lineup } = autoPick(g, c.id, c.tactic.formation), slots = FORMATIONS[c.tactic.formation]
        let wi = 0, wr = 999
        lineup.forEach((id, i) => { const r = posRating(g.players[id], slots[i].pos); if (r < wr) { wr = r; wi = i } })
        const avg = lineup.reduce((s, id, i) => s + posRating(g.players[id], slots[i].pos), 0) / Math.max(1, lineup.length)
        const nat = rng.pick(['Uruguay', 'Paraguay', 'Colombia', 'Chile', 'Ecuador', 'Brasil', 'Venezuela', 'Perú'])
        const p = makeYouth(g, c, rng, 0, slots[wi].pos, { age: rng.int(22, 29), target: Math.round(Math.max(wr, avg) + rng.int(1, 5)), nat })
        const fee = Math.max(100000, Math.min(c.budget, Math.round((p.value * 1.15) / 50000) * 50000))
        c.budget -= fee; c.balance -= fee; c.ledger.buys += fee
        const from = rng.pick(FOREIGN)
        g.transfers.unshift({ date: g.date, pid: p.id, name: p.name, from, to: c.name, fee })
        if (fee >= 1500000) news(g, { tag: 'mercado', clubId: c.id, pid: p.id, title: `${c.short} se refuerza con ${p.name}`, body: `${c.name} pagó US$ ${fee.toLocaleString('es-AR')} por ${p.name}, ${nat === 'Brasil' ? 'brasileño' : `jugador de ${nat}`} que llega desde ${from}.` })
      }
    }
    // ventas al exterior
    if (rng.chance(0.14)) {
      const cands = all.filter(p => g.players[p.id] && g.clubs[p.clubId]?.division === 1 && p.ca >= 73 && ageOn(p.birth, g.date) <= 26 && canSell(p) && !held.has(p.id))
      if (cands.length) {
        const p = rng.weighted(cands, x => (x.pa - 65) ** 2)
        const fee = Math.round((p.value * (1.1 + rng.next() * 0.6)) / 50000) * 50000
        if (p.clubId === g.userClubId) pushOffer(g, p, 0, rng.pick(FOREIGN), fee)
        else if (rng.chance(0.55) && squadOf(g, p.clubId).length > 22) sellAbroad(g, p, rng.pick(FOREIGN), fee)
      }
    }
    // interés por jugadores transferibles del usuario
    for (const p of squadOf(g, g.userClubId)) if ((p.listed || p.wantsOut) && canSell(p) && rng.chance(p.listed ? OFFER_CHANCE.listed : OFFER_CHANCE.out) && !g.offers.some(o => o.pid === p.id)) {
      const buyers = clubs.filter(c => c.id !== g.userClubId && c.budget >= p.value * 0.7 && c.rep >= g.clubs[g.userClubId].rep - 14 && squadOf(g, c.id).length < 40)
      if (buyers.length) { const b = rng.pick(buyers); pushOffer(g, p, b.id, b.name, Math.round((Math.min(b.budget, p.value * (0.7 + rng.next() * 0.4))) / 10000) * 10000) }
    }
  }
}
function pushOffer(g: Game, p: Player, from: number, fromName: string, fee: number) {
  if (!canSell(p) || g.offers.some(o => o.pid === p.id && o.from === from) || g.offers.length >= 8) return
  const o: Offer = { id: g.nextId++, pid: p.id, from, fromName, fee, date: g.date, fee0: fee }
  g.offers.push(o)
  news(g, { tag: 'mercado', clubId: g.userClubId, pid: p.id, act: 'offer', ref: o.id, title: `Oferta de ${fromName} por ${p.name}`, body: `${fromName} ofrece US$ ${fee.toLocaleString('es-AR')} por el pase de ${p.name}. Podés responder desde este mensaje. Vence el ${fmtDate(offerDeadline(o))}.` })
}

// ---------- tratos: ofertas del DT con respuesta demorada (`g.deals`) ----------
const OPEN_STATES: DealState[] = ['waiting', 'countered', 'agreed']
/** Trato de compra o préstamo todavía abierto (esperando respuesta, con contraoferta o acordado). */
export const isOpenDeal = (d: Deal) => d.side !== 'sell' && OPEN_STATES.includes(d.state)
/** Tratos abiertos del club actual del DT. */
const myOpen = (g: Game) => (g.deals ?? []).filter(d => isOpenDeal(d) && d.userClubId === g.userClubId)
const myDeal = (g: Game, id: number) => (g.deals ?? []).find(d => d.id === id && d.side !== 'sell' && d.userClubId === g.userClubId)
/** El trato abierto por un jugador (a lo sumo uno, compra o préstamo). */
export const openDealFor = (g: Game, pid: number) => myOpen(g).find(d => d.pid === pid)
/** Lo comprometido: lo que ofertó el DT en los tratos abiertos (en una contraoferta, su oferta, no el pedido del club). */
export const committed = (g: Game) => myOpen(g).reduce((s, d) => s + d.fee, 0)
/** Ofertas abiertas que cuentan para el tope de 5 (esperando respuesta o con contraoferta; los acuerdos no). */
export const openBids = (g: Game) => myOpen(g).filter(d => d.state !== 'agreed').length
export const MAX_BIDS = 5
const MAX_DEALS = 60

function addDeal(g: Game, d: Omit<Deal, 'id' | 'steps' | 'updated'>, text: string): Deal {
  const deal: Deal = { ...d, id: g.nextDeal ?? 1, updated: g.date, steps: [{ date: g.date, text }] }
  g.nextDeal = deal.id + 1
  const ds = (g.deals ??= [])
  ds.push(deal)
  // tope de 60: nunca se poda uno abierto ni uno con bloqueo vigente (hacen falta para el bloqueo y el club molesto). Primero se van las
  // ofertas recibidas ya cerradas más viejas (son la mayoría: vencen solas); recién después los tratos del DT (sus ofertas y acuerdos)
  const extra = ds.length - MAX_DEALS
  if (extra > 0) {
    const keep = (x: Deal) => isOpenDeal(x) || !!(x.blockUntil && x.blockUntil >= g.date), drop = new Set<Deal>()
    for (const sell of [true, false]) for (const x of ds) if (drop.size < extra && !keep(x) && (x.side === 'sell') === sell) drop.add(x)
    g.deals = ds.filter(x => !drop.has(x))
  }
  return deal
}
function step(g: Game, d: Deal, text: string) { d.steps = [...d.steps, { date: g.date, text }].slice(-8); d.updated = g.date }
function fall(g: Game, d: Deal, why: DealWhy, text: string, block = false) {
  d.state = 'fell'; d.why = why; d.answerOn = undefined
  if (block) d.blockUntil = blockDate(g.date)
  step(g, d, text)
}
/** Cierre de una oferta recibida (lado venta). */
function recordOffer(g: Game, o: Offer, state: DealState, why?: DealWhy, by?: string) {
  const p = g.players[o.pid], name = p?.name ?? ''
  const text = state === 'sold' ? `Vendido a ${o.fromName} por ${usd(o.fee)}` : state === 'declined' ? `Rechazaste la oferta de ${o.fromName}` : state === 'withdrawn' ? `${o.fromName} se retiró de la negociación`
    : state === 'expired' ? `Venció la oferta de ${o.fromName}` : why === 'club' ? `Se canceló: dejaste ${g.clubs[g.userClubId].short}` : why === 'sold' ? `Se canceló: vendiste a ${name} a ${by ?? ''}`
    : why === 'clause' ? `Se canceló: ${by ?? ''} pagó la cláusula de ${name}` : `Se canceló: ${name} ya no está en el club`
  addDeal(g, { side: 'sell', pid: o.pid, name, clubId: o.from, clubName: o.fromName, state, fee: o.fee, round: (o.asks ?? 0) + 1, userClubId: g.userClubId, opened: o.date, offerId: o.id, ...(why ? { why } : {}), ...(by ? { by } : {}) }, text)
}
function dealNews(g: Game, d: Deal, title: string, body: string, read = false) {
  news(g, { tag: 'mercado', clubId: d.clubId || g.userClubId, pid: d.pid, act: 'deal', ref: d.id, me: true, title, body, ...(read ? { read: true } : {}) })
}
const dealKey = (d: Deal) => `deal${d.id}`

/** Un día de libro jugable: el libro de enero se juega desde el 10 (antes no corre el tiempo). */
const playable = (d: string) => windowOpen(d) && d.slice(5) >= '01-10'
/** Último día de un bloqueo de `n` días de libro abierto desde `from` (con el libro abierto, `from + n`). Así salirse de un acuerdo
 *  en la última semana del libro también cuesta: el bloqueo y el club molesto siguen cuando reabre. */
export function blockDate(from: string, n = 14): string {
  let d = from
  for (let k = 0, i = 0; k < n && i < 800; i++) { d = addDays(d, 1); if (playable(d)) k++ }
  return d
}
/** Último día para responder una contraoferta o cerrar un acuerdo: 7 días desde `from` o el último día del libro, lo que llegue antes. */
export function dealDeadline(g: Game, from = g.date): string {
  const ws = windowState(from), d = addDays(from, 7)
  return ws.closesOn && ws.closesOn < d ? ws.closesOn : d
}
/** Rango visible de la respuesta de una oferta hecha hoy (o `date`). `afterClose`: puede contestar con el libro cerrado; `allAfterClose`: seguro. */
export function answerWindow(g: Game, date = g.date): { from: string; by: string; afterClose: boolean; allAfterClose: boolean } {
  const from = addDays(date, 1), by = addDays(date, 3), close = windowState(date).closesOn
  return { from, by, afterClose: !close || by > close, allAfterClose: !close || from > close }
}
function schedule(g: Game, d: Deal) {
  // demora determinista (1 a 3 días), sin consumir el azar de la partida: recargar y repetir la oferta da la misma demora y la misma respuesta
  const w = answerWindow(g)
  d.answerFrom = w.from; d.answerBy = w.by; d.answerOn = addDays(g.date, 1 + Math.floor(hash(d.id * 31 + d.round, g.seed) * 3))
}

/** Bloqueo vigente para ofertar por un jugador (tras una ruptura, una cancelación o un acuerdo vencido): `until` es el último día bloqueado. */
export function bidBlock(g: Game, pid: number): { until: string; why: DealWhy; on: string; dealId: number; text: string } | undefined {
  const d = (g.deals ?? []).filter(x => x.pid === pid && x.side !== 'sell' && x.blockUntil && x.blockUntil >= g.date).sort((a, b) => b.id - a.id)[0]
  if (!d) return undefined
  const on = d.why === 'deadline' ? d.deadline ?? d.updated : d.updated, until = d.blockUntil!
  const what = d.why === 'walk' ? `Su representante cortó la negociación el ${fmtDay(on)}` : d.why === 'cancel' ? `Cancelaste el trato por él el ${fmtDay(on)}` : `Dejaste vencer el acuerdo por él el ${fmtDay(on)}`
  return { until, why: d.why!, on, dealId: d.id, text: `${what}. No podés volver a ofertar por él hasta el ${fmtDay(until)}.` }
}
/** El club está molesto con el DT (canceló un acuerdo o lo dejó vencer, con el bloqueo vigente): pide un 10 % más por sus jugadores. */
export function clubCool(g: Game, clubId: number): { until: string; pid: number; name: string; dealId: number; text: string } | undefined {
  const d = (g.deals ?? []).filter(x => x.clubId === clubId && x.side !== 'sell' && (x.why === 'cancel' || x.why === 'deadline') && x.blockUntil && x.blockUntil >= g.date).sort((a, b) => b.id - a.id)[0]
  if (!d) return undefined
  return { until: d.blockUntil!, pid: d.pid, name: d.name, dealId: d.id, text: `${d.clubName} está molesto: ${d.why === 'cancel' ? 'cancelaste el trato' : 'dejaste vencer el acuerdo'} por ${d.name}. Hasta el ${fmtDay(d.blockUntil!)} va a pedir un 10 % más por sus jugadores.` }
}

/**
 * Controles inmediatos de una oferta (lo que el DT puede saber sin preguntarle al club). Devuelve el motivo para dejar el botón
 * deshabilitado o `null`. Si ya hay una contraoferta abierta por el jugador (del mismo tipo), es Mejorar: no cuenta como oferta abierta
 * ni para el tope, y lo comprometido pasa del monto viejo al nuevo. El sueldo no es un control inmediato (se controla al firmar).
 */
export function bidCheck(g: Game, pid: number, fee: number, loan: boolean): string | null {
  const p = g.players[pid], me = g.clubs[g.userClubId], ws = windowState(g.date)
  const cur = p ? openDealFor(g, pid) : undefined, improve = cur?.state === 'countered' && (cur.side === 'loan') === loan
  if (!ws.open) return closedReason(g.date)
  if (ws.daysLeft === 0) return improve ? 'Hoy cierra el libro: una mejora ya no llegaría a tener respuesta. Podés aceptar su pedido o retirar la oferta.' : 'Hoy cierra el libro: una oferta nueva ya no llegaría a tener respuesta.'
  const src = p && g.clubs[p.clubId]
  if (!p || !src || p.clubId === me.id || src.division === 0) return 'Ya no está disponible.'
  if (!improve) {
    if (cur) return 'Ya tenés una oferta abierta por él.'
    if (p.loanFrom != null) return `Está a préstamo de ${g.clubs[p.loanFrom]?.name ?? 'otro club'}: no se puede comprar ni pedir a préstamo.`
    if (squadOf(g, me.id).length >= 45) return 'Tu plantel ya tiene 45 jugadores: vendé o liberá a alguien antes de ofertar.'
    const b = bidBlock(g, pid)
    if (b) return b.text
    if (openBids(g) >= MAX_BIDS) return `Ya tenés ${MAX_BIDS} ofertas abiertas (esperando respuesta o con contraoferta): retirá una o esperá que contesten.`
  }
  if (!(fee > 0)) return 'Escribí un monto.'
  const others = myOpen(g).filter(d => d !== (improve ? cur : undefined)), com = others.reduce((s, d) => s + d.fee, 0), free = me.budget - com
  if (fee > free) return com > 0 ? `Te quedan libres ${usd(Math.max(0, free))}: tenés ${usd(com)} comprometidos en ${others.length} ${others.length === 1 ? 'oferta' : 'ofertas'}.` : `Te quedan libres ${usd(Math.max(0, free))} para pases.`
  return null
}
/**
 * Oferta del DT por un jugador ajeno (compra o, con `loan`, préstamo con su cargo). No consulta al club: crea un trato `waiting` que el club
 * contesta entre 1 y 3 días después (`dailyDeals`). Con una contraoferta abierta por él, es Mejorar: el mismo trato vuelve a esperar con `round + 1`.
 */
export function placeBid(g: Game, pid: number, fee: number, loan: boolean): { ok: boolean; reason?: string; deal?: Deal } {
  const why = bidCheck(g, pid, fee, loan)
  if (why) return { ok: false, reason: why }
  const p = g.players[pid], cur = openDealFor(g, pid)
  if (cur?.state === 'countered') {
    cur.fee = fee; cur.round++; cur.state = 'waiting'; cur.deadline = undefined
    schedule(g, cur); step(g, cur, `Mejoraste tu oferta a ${usd(fee)}`)
    readDecisionNews(g, dealKey(cur))
    return { ok: true, deal: cur }
  }
  const src = g.clubs[p.clubId]
  const d = addDeal(g, { side: loan ? 'loan' : 'buy', pid, name: p.name, clubId: src.id, clubName: src.short, state: 'waiting', fee, round: 1, userClubId: g.userClubId, opened: g.date },
    loan ? `Pediste el préstamo con un cargo de ${usd(fee)}` : `Ofertaste ${usd(fee)}`)
  schedule(g, d)
  return { ok: true, deal: d }
}
/** Mejorar una contraoferta: `placeBid` sobre el mismo trato. */
export function improveBid(g: Game, dealId: number, fee: number): { ok: boolean; reason?: string; deal?: Deal } {
  const d = myDeal(g, dealId)
  if (!d || d.state !== 'countered') return { ok: false, reason: 'Ya respondiste esta contraoferta.' }
  return placeBid(g, d.pid, fee, d.side === 'loan')
}
/** Retirar una oferta que espera respuesta o tiene contraoferta. Sin costo. */
export function withdrawBid(g: Game, dealId: number): boolean {
  const d = myDeal(g, dealId)
  if (!d || (d.state !== 'waiting' && d.state !== 'countered')) return false
  fall(g, d, 'pulled', 'Retiraste la oferta')
  readDecisionNews(g, dealKey(d))
  return true
}
/** Aceptar el pedido del club: la contraoferta pasa a acuerdo con el mismo plazo. No emite mensaje (lo hizo el DT). */
export function acceptCounter(g: Game, dealId: number): boolean {
  const d = myDeal(g, dealId)
  if (!d || d.state !== 'countered' || d.counter == null || !windowOpen(g.date)) return false
  if (d.counter > g.clubs[g.userClubId].budget - committed(g) + d.fee) return false
  d.fee = d.counter; d.state = 'agreed'
  step(g, d, `Aceptaste el pedido de ${d.clubName}: ${usd(d.fee)}`)
  readDecisionNews(g, dealKey(d))
  return true
}

/**
 * Respuesta del club el día `answerOn`: la lógica de la antigua `evaluateBid` con el estado de ese día, sin los controles inmediatos y sin mirar el
 * tope salarial ni el presupuesto (los controla `signDeal`): ningún motivo dice un sueldo. Con el club molesto, el umbral sube un 10 %.
 */
export function clubAnswer(g: Game, d: Deal): { ok: boolean; reason?: string; counter?: number } {
  const p = g.players[d.pid], dest = g.clubs[g.userClubId], src = g.clubs[p.clubId], loan = d.side === 'loan'
  const cool = clubCool(g, src.id) ? 1.1 : 1
  if (!loan && p.clause && d.fee >= p.clause) return { ok: true }
  const sq = squadOf(g, src.id), rank = squadRank(g, p)
  if (sq.length <= 20 || (p.line === 'GK' && sq.filter(x => x.line === 'GK').length <= 2)) return { ok: false, reason: `${src.name} no puede desprenderse del jugador: se queda sin recambio.` }
  if (dest.division > src.division && rank < 11) return { ok: false, reason: `${p.name} no quiere bajar de categoría.` }
  if (dest.rep < src.rep - (rank < 14 ? 6 : 16)) return { ok: false, reason: `${p.name} no ve con buenos ojos irse a un club de menor nivel.` }
  if (loan) {
    if (rank < 14) return { ok: false, reason: `${src.name} lo considera importante y no lo cede a préstamo.` }
    const need = Math.round((loanFee(p) * cool) / 5000) * 5000
    return d.fee < need ? { ok: false, counter: need } : { ok: true }
  }
  const thr = bidThreshold(g, p, cool)
  return d.fee < thr ? { ok: false, counter: thr } : { ok: true }
}
function answer(g: Game, d: Deal) {
  const r = clubAnswer(g, d), loan = d.side === 'loan'
  d.answerOn = undefined
  if (r.ok || r.counter != null) {
    d.deadline = dealDeadline(g); const until = fmtDay(d.deadline)
    if (r.ok) {
      d.state = 'agreed'; step(g, d, loan ? `${d.clubName} aceptó prestarlo` : `${d.clubName} aceptó ${usd(d.fee)}`)
      if (loan) dealNews(g, d, `${d.clubName} te presta a ${d.name}`, `Cargo ${usd(d.fee)}, hasta fin de temporada. Confirmá el préstamo hasta el ${until}.`)
      else dealNews(g, d, `${d.clubName} aceptó tu oferta por ${d.name}`, `${usd(d.fee)}. Falta el contrato con el jugador: tenés hasta el ${until}.`)
    } else {
      d.state = 'countered'; d.counter = r.counter; step(g, d, `${d.clubName} pidió ${usd(r.counter!)}`)
      dealNews(g, d, loan ? `${d.clubName} pide un cargo de ${usd(r.counter!)} por ${d.name}` : `${d.clubName} pide ${usd(r.counter!)} por ${d.name}`,
        `No aceptó tu oferta de ${usd(d.fee)}. Respondé hasta el ${until}: aceptar su pedido, mejorar tu oferta o retirarla.`)
    }
    return
  }
  d.state = 'refused'; d.reason = r.reason; step(g, d, `Sin acuerdo: ${r.reason}`)
  dealNews(g, d, `${d.clubName} no acepta tu oferta por ${d.name}`, `${r.reason} Podés volver a ofertar más adelante: sería una oferta nueva.`)
}
/** Un acuerdo vencido cuesta lo mismo que cancelarlo: bloqueo de 14 días de libro abierto y el club molesto. También si vence con el cierre del libro. */
function lapseAgreed(g: Game, d: Deal, byWindow: boolean) {
  fall(g, d, 'deadline', 'Venció el acuerdo', true)
  dealNews(g, d, `Venció el acuerdo con ${d.clubName} por ${d.name}`, `Tenías hasta el ${fmtDay(d.deadline!)}${byWindow ? ', el último día del libro de pases' : ''}. No podés volver a ofertar por él hasta el ${fmtDay(d.blockUntil!)}, y hasta esa fecha ${d.clubName} va a pedir un 10 % más por sus jugadores.`)
}
/**
 * Al empezar el día (desde `advanceDay` y `finishUserMatch`, después de cambiar la fecha). En este orden: caducan los tratos abiertos con el
 * libro cerrado (un acuerdo, como vencido: el DT pudo cerrarlo), los de jugadores que ya no están en el club del trato y los plazos vencidos;
 * después contesta las ofertas del día y, por último, los avisos de cierre del libro (7 días antes y el último día). Un mensaje por cambio,
 * sin leer. No usa el azar de la partida y no frena nada: el freno lo decide la interfaz con `decisionKeys` y `expiringKeys`.
 */
export function dailyDeals(g: Game) {
  const ws = windowState(g.date)
  for (const d of (g.deals ?? []).filter(isOpenDeal)) {
    if (d.userClubId !== g.userClubId) { fall(g, d, 'club', 'Se cayó: el DT dejó el club'); continue } // no debería pasar: `switchClub` ya los cierra
    const p = g.players[d.pid]
    if (!ws.open) {
      if (d.state === 'agreed') { lapseAgreed(g, d, true); continue }
      const was = d.state
      fall(g, d, 'window', 'Caducó: se cerró el libro')
      dealNews(g, d, `Tu oferta por ${d.name} caducó: se cerró el libro de pases`, was === 'countered'
        ? `No respondiste el pedido de ${d.clubName} (${usd(d.counter ?? d.fee)}) antes del cierre.` : `${d.clubName} no llegó a contestar antes del cierre. Lo comprometido (${usd(d.fee)}) vuelve a estar libre.`)
      continue
    }
    if (!p || p.clubId !== d.clubId) {
      const t = p ? g.clubs[p.clubId]?.short : g.transfers.find(x => x.pid === d.pid && x.date >= d.opened)?.to
      fall(g, d, 'gone', t ? `Se cayó: otro club lo compró` : 'Se cayó: ya no está disponible')
      dealNews(g, d, t ? `${d.clubName} vendió a ${d.name} a ${t}: tu oferta quedó sin efecto` : `${d.name} ya no está disponible: tu oferta quedó sin efecto`, `Lo comprometido (${usd(d.fee)}) vuelve a estar libre para ofertar.`)
      continue
    }
    if (d.state !== 'waiting' && d.deadline && d.deadline < g.date) {
      if (d.state === 'agreed') { lapseAgreed(g, d, false); continue }
      fall(g, d, 'deadline', 'Venció la contraoferta')
      dealNews(g, d, `${d.clubName} dio por terminada la negociación por ${d.name}: no respondiste su pedido`, `Tenías hasta el ${fmtDay(d.deadline)} para responder su pedido de ${usd(d.counter ?? d.fee)}.`)
      continue
    }
    if (d.state === 'waiting' && d.answerOn && d.answerOn <= g.date) answer(g, d)
  }
  windowNotice(g, ws)
}
const plural = (n: number, one: string, many: string) => `${n === 1 ? 'una' : n} ${n === 1 ? one : many}`
/** Aviso de cierre del libro: 7 días antes y el último día. Nombra lo abierto de los dos lados. Sin `act`: no es una decisión ni frena el avance. */
function windowNotice(g: Game, ws: WindowState) {
  if (!ws.open || (ws.daysLeft !== 7 && ws.daysLeft !== 0)) return
  const last = ws.daysLeft === 0, close = fmtDay(ws.closesOn!), open = myOpen(g)
  const wait = open.filter(d => d.state === 'waiting').length, ctr = open.filter(d => d.state === 'countered').length, agr = open.filter(d => d.state === 'agreed')
  const parts: string[] = []
  if (wait) parts.push(`${plural(wait, 'oferta', 'ofertas')} esperando respuesta`)
  if (ctr) parts.push(`${plural(ctr, 'contraoferta', 'contraofertas')} sin responder`)
  if (agr.length) parts.push(`${agr.length === 1 ? 'un' : agr.length} ${agr.length === 1 ? 'acuerdo' : 'acuerdos'} sin firmar (${agr.map(d => `${d.name}, vence ${d.deadline === g.date ? 'hoy' : `el ${fmtDay(d.deadline!)}`}`).join('; ')})`)
  const mine = parts.length ? `Tenés ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0]}.${wait ? ' Una oferta que el club conteste después del cierre caduca.' : ''}` : 'No tenés tratos abiertos.'
  const offs = g.offers.filter(o => g.players[o.pid]?.clubId === g.userClubId).map(o => {
    const n = g.players[o.pid].name, until = offerDeadline(o) < ws.closesOn! ? offerDeadline(o) : ws.closesOn!
    return last ? ` ${o.fromName} ofertó por ${n}: hoy es el último día para aceptarla o pedir más; desde mañana solo vas a poder rechazarla hasta que venza (${fmtDay(offerDeadline(o))}).` : ` ${o.fromName} ofertó por ${n}: hasta el ${fmtDay(until)} podés aceptarla o pedir más.`
  })
  news(g, { tag: 'mercado', clubId: g.userClubId, me: true, title: last ? 'Hoy cierra el libro de pases' : `Faltan 7 días para que cierre el libro de pases (${close})`, body: mine + offs.join('') })
}

// ---------- negociación con el representante y firma ----------
/** Abre (o retoma) la mesa de un acuerdo de compra. La primera vez fija lo que pide el representante y su paciencia; después no se reinicia. */
export function openNegotiation(g: Game, dealId: number): { demand: Demand; patience: number; max: number; terms: Terms; log: string[] } | null {
  const d = myDeal(g, dealId), p = d && g.players[d.pid]
  if (!d || !p || d.state !== 'agreed' || d.side !== 'buy') return null
  if (!d.neg) {
    const dem = demand(g, p, 'buy', naturalStatusFor(g, p))
    d.neg = { terms: dem.terms, patience: dem.patience, max: dem.patience, log: [] }
    step(g, d, 'Te sentaste a negociar con el representante')
  }
  readDecisionNews(g, dealKey(d)) // abrir la mesa ya es actuar sobre el acuerdo
  const n = d.neg, t = n.terms
  return { demand: { terms: { ...t }, patience: n.patience }, patience: n.patience, max: n.max, log: [...n.log],
    terms: { ...(n.counter ?? n.offer ?? { ...t, wage: Math.round((t.wage * 0.9) / 100) * 100, bonus: Math.round((t.bonus * 0.6) / 1000) * 1000 }) } }
}
/** Una ronda con el representante: guarda términos, paciencia y respuesta. No ejecuta el pase (eso es `signDeal`); si se levanta, `walkAway`. */
export function sendTerms(g: Game, dealId: number, terms: Terms): NegResult | null {
  const d = myDeal(g, dealId), p = d && g.players[d.pid]
  if (!d || !p || d.state !== 'agreed' || d.side !== 'buy') return null
  if (!d.neg) openNegotiation(g, dealId)
  const n = d.neg!, dem = { terms: n.terms, patience: n.patience }
  const r = evalOffer(g, p, 'buy', terms, dem)
  n.patience = dem.patience; n.offer = { ...terms }; n.counter = r.counter; n.agreed = r.ok ? { ...terms } : undefined
  n.log = [...n.log, r.msg].slice(-6)
  if (r.walk) walkAway(g, d.id)
  return r
}
const sameTerms = (a: Terms, b: Terms) => a.wage === b.wage && a.years === b.years && a.status === b.status && a.clause === b.clause && a.bonus === b.bonus
/**
 * Confirma el fichaje (compra, con los términos que aceptó el representante) o el préstamo. Vuelve a controlar libro, presupuesto, plantel,
 * tope y caja. En el préstamo el tope se controla con el máximo del rango de sueldo que ve el DT (`wageShown`): si no entra, lo dice sin cifra
 * y sin revelar el sueldo real. Irreversible. La noticia del fichaje nace leída.
 */
export function signDeal(g: Game, dealId: number, terms?: Terms): { ok: boolean; reason?: string } {
  const d = myDeal(g, dealId), p = d && g.players[d.pid], me = g.clubs[g.userClubId]
  if (!d || d.state !== 'agreed') return { ok: false, reason: 'Este acuerdo ya no está abierto.' }
  if (!windowOpen(g.date)) return { ok: false, reason: closedReason(g.date) }
  if (!p || p.clubId !== d.clubId) return { ok: false, reason: 'Ya no está disponible.' }
  if (squadOf(g, me.id).length >= 45) return { ok: false, reason: 'Tu plantel ya tiene 45 jugadores: vendé o liberá a alguien antes de fichar.' }
  if (d.fee > me.budget) return { ok: false, reason: `No te alcanza el presupuesto de pases: te quedan ${usd(Math.max(0, me.budget))}.` }
  const bill = wageBill(g, me.id)
  let t: Terms | undefined
  if (d.side === 'buy') {
    t = terms ?? d.neg?.agreed
    if (!t || !d.neg?.agreed || !sameTerms(t, d.neg.agreed)) return { ok: false, reason: 'Falta el acuerdo con el jugador: negociá el contrato con su representante.' }
    if (bill + t.wage > me.wageBudget) return { ok: false, reason: `Con este sueldo superás el tope salarial por ${usd(bill + t.wage - me.wageBudget)}.` }
    if (t.bonus > me.balance) return { ok: false, reason: 'El club no tiene caja para pagar esa prima.' }
  } else if (bill + wageShown(g, p, p.wage, 401)[1] > me.wageBudget) return { ok: false, reason: 'Con lo que cobra, superás tu tope salarial.' }
  doTransfer(g, p, me.id, d.fee, d.side === 'loan', false, t, 'gone', true)
  d.state = d.side === 'loan' ? 'loaned' : 'signed'
  step(g, d, d.side === 'loan' ? 'Llegó a préstamo hasta fin de temporada' : `Firmó con ${me.short}`)
  readDecisionNews(g, dealKey(d))
  return { ok: true }
}
/** El representante se levantó de la mesa: el trato se cae y no se puede volver a ofertar por él durante 14 días de libro abierto. */
export function walkAway(g: Game, dealId: number): boolean {
  const d = myDeal(g, dealId)
  if (!d || d.state !== 'agreed') return false
  fall(g, d, 'walk', 'El representante se levantó de la mesa', true)
  readDecisionNews(g, dealKey(d))
  dealNews(g, d, `Se cayó el pase de ${d.name}`, `${g.clubs[g.userClubId].name} había acordado con ${d.clubName}, pero no llegó a un acuerdo con ${d.name} y la operación se cayó. No podés volver a ofertar por él hasta el ${fmtDay(d.blockUntil!)}.`, true)
  return true
}
/** Cancelar un acuerdo (tras la confirmación): bloqueo de 14 días de libro abierto y el club molesto hasta esa fecha. */
export function cancelDeal(g: Game, dealId: number): boolean {
  const d = myDeal(g, dealId)
  if (!d || d.state !== 'agreed') return false
  fall(g, d, 'cancel', 'Cancelaste el trato', true)
  readDecisionNews(g, dealKey(d))
  dealNews(g, d, `Cancelaste el trato por ${d.name}`, `Se cayó el acuerdo con ${d.clubName}. No podés volver a ofertar por él hasta el ${fmtDay(d.blockUntil!)}, y hasta esa fecha ${d.clubName} va a pedir un 10 % más por sus jugadores.`, true)
  return true
}

// ---------- lectura para la interfaz ----------
export type DealRow = { k: 'offer'; key: string; o: Offer; deadline: string } | { k: 'deal'; key: string; d: Deal; deadline: string }
/** Tratos agrupados para la pestaña Tratos: para responder (ofertas por tus jugadores y contraofertas), esperando respuesta, para cerrar, para renovar e historial. */
export function dealsOf(g: Game): { respond: DealRow[]; waiting: Deal[]; close: Deal[]; renew: Player[]; history: Deal[] } {
  const open = myOpen(g), byDl = (a: { deadline?: string }, b: { deadline?: string }) => (a.deadline ?? '').localeCompare(b.deadline ?? '')
  const respond: DealRow[] = [
    ...g.offers.filter(o => g.players[o.pid]).map(o => ({ k: 'offer' as const, key: `offer${o.id}`, o, deadline: offerDeadline(o) })),
    ...open.filter(d => d.state === 'countered').map(d => ({ k: 'deal' as const, key: dealKey(d), d, deadline: d.deadline! })),
  ].sort(byDl)
  return {
    respond,
    waiting: open.filter(d => d.state === 'waiting').sort((a, b) => (a.answerFrom ?? '').localeCompare(b.answerFrom ?? '') || a.id - b.id),
    close: open.filter(d => d.state === 'agreed').sort(byDl),
    renew: squadOf(g, g.userClubId).filter(p => p.contractEnd <= g.season && p.loanFrom == null).sort((a, b) => a.contractEnd - b.contractEnd || a.name.localeCompare(b.name)),
    history: (g.deals ?? []).filter(d => !isOpenDeal(d)).sort((a, b) => b.updated.localeCompare(a.updated) || b.id - a.id),
  }
}
export interface DealImpact {
  /** Presupuesto de pases y lo libre (presupuesto menos lo comprometido en otros tratos), antes → después. */
  budget: [number, number]; free: [number, number]
  balance: [number, number]
  /** Masa salarial antes → después (con el máximo del rango del sueldo que se suma) y el rango que se suma. */
  wageBill: [number, number]; wageAdd: [number, number]; cap: number
  /** ¿Entra en el tope? Con el rango del sueldo: "yes" entra entero, "maybe" lo cruza, "no" ni lo mínimo entra. */
  fits: 'yes' | 'maybe' | 'no'
  squad: [number, number]; line: [number, number]
  /** Controles duros que impiden la operación ("supera el tope por US$ 3 mil"). */
  blocked: string[]
}
/**
 * Lo que cambia una operación antes de confirmarla (pura). `kind`: compra, préstamo o venta. Sin `terms`, el sueldo de una compra es el rango
 * del sueldo que pediría (`demandWage`) y el de un préstamo, el del que cobra: nunca el número real de un ajeno que no se conoce.
 */
export function dealImpact(g: Game, kind: 'buy' | 'loan' | 'sell', pid: number, fee: number, terms?: Terms): DealImpact | null {
  const me = g.clubs[g.userClubId], p = g.players[pid]
  if (!p) return null
  const sq = squadOf(g, me.id), bill = wageBill(g, me.id), lineN = sq.filter(x => x.line === p.line).length, own = kind === 'sell' ? undefined : openDealFor(g, pid)
  const com = committed(g) - (own?.fee ?? 0), free = me.budget - com, cap = me.wageBudget
  if (kind === 'sell') {
    const plus = Math.round(fee * 0.6)
    return { budget: [me.budget, me.budget + plus], free: [free, free + plus], balance: [me.balance, me.balance + fee], wageBill: [bill, bill - p.wage], wageAdd: [-p.wage, -p.wage], cap, fits: 'yes', squad: [sq.length, sq.length - 1], line: [lineN, lineN - 1], blocked: [] }
  }
  const wr: [number, number] = terms ? [terms.wage, terms.wage] : kind === 'loan' ? wageShown(g, p, p.wage, 401) : wageShown(g, p, demandWage(g, p), 402)
  const bonus = kind === 'buy' ? terms?.bonus ?? 0 : 0, margin = cap - bill
  // en el préstamo el tope se controla con el máximo del rango (lo mismo que `signDeal`): no hay "puede no entrar"
  const fits = wr[1] <= margin ? 'yes' : kind === 'loan' || wr[0] > margin ? 'no' : 'maybe'
  const blocked: string[] = []
  if (fee > free) blocked.push(`Te quedan libres ${usd(Math.max(0, free))}.`)
  if (terms && bill + terms.wage > cap) blocked.push(`Con este sueldo superás el tope por ${usd(bill + terms.wage - cap)}.`)
  if (kind === 'loan' && fits === 'no') blocked.push('Con lo que cobra, superás tu tope salarial.')
  if (bonus > me.balance) blocked.push('El club no tiene caja para pagar esa prima.')
  return { budget: [me.budget, me.budget - fee], free: [free, free - fee], balance: [me.balance, me.balance - fee - bonus], wageBill: [bill, bill + wr[1]], wageAdd: wr, cap, fits, squad: [sq.length, sq.length + 1], line: [lineN, lineN + 1], blocked }
}

// ---------- contratos ----------
export function renewCost(g: Game, p: Player): number {
  return Math.round((Math.max(p.wage, valuation(p, g.date).wage) * (1.15 - (g.manager.attrs.neg - 10) * 0.01)) / 100) * 100
}
export function renew(g: Game, p: Player, years: number): string | null {
  const c = g.clubs[p.clubId], w = renewCost(g, p)
  if (p.morale < 35) return `${p.name} no está conforme en el club y no quiere renovar por ahora.`
  if (wageBill(g, c.id) - p.wage + w > c.wageBudget) return 'La renovación supera el tope salarial.'
  p.wage = w; p.contractEnd = g.season + years; p.morale = clamp(p.morale + 6, 0, 100)
  return null
}

// ---------- juveniles ----------
export const NOMBRES = 'Mateo,Thiago,Bautista,Santino,Benjamín,Joaquín,Valentín,Lautaro,Franco,Tomás,Agustín,Nicolás,Facundo,Ignacio,Santiago,Juan Cruz,Lucas,Matías,Ramiro,Gonzalo,Federico,Lisandro,Julián,Emiliano,Ezequiel,Máximo,Alan,Kevin,Brian,Axel,Dylan,Ian,Gael,Bruno,Luciano,Maximiliano,Rodrigo,Leandro,Cristian,Iván,Nahuel,Elías,Simón,Felipe,Tobías,Renzo,Enzo,Exequiel,Alexis,Germán'.split(',')
export const APELLIDOS = 'González,Rodríguez,Gómez,Fernández,López,Díaz,Martínez,Pérez,García,Sánchez,Romero,Sosa,Torres,Álvarez,Ruiz,Ramírez,Flores,Benítez,Acosta,Medina,Herrera,Suárez,Aguirre,Giménez,Gutiérrez,Pereyra,Rojas,Molina,Castro,Ortiz,Silva,Núñez,Luna,Juárez,Cabrera,Ríos,Morales,Godoy,Moreno,Ferreyra,Domínguez,Carrizo,Peralta,Castillo,Ledesma,Quiroga,Vega,Vera,Muñoz,Ojeda,Ponce,Villalba,Cardozo,Navarro,Coronel,Vázquez,Ramos,Vargas,Cáceres,Arias,Figueroa,Córdoba,Correa,Maldonado,Paz,Rivero,Miranda,Mansilla,Farías,Roldán,Méndez,Guzmán,Agüero,Páez,Escobar,Barrios,Bustos,Ávila,Soria,Leiva,Lucero,Maidana,Velázquez,Bravo,Blanco,Toledo,Ibáñez,Montenegro,Zárate,Barrionuevo'.split(',')
const YOUTH_POS: [Pos, number][] = [['GK', 1], ['DC', 2], ['DR', 1], ['DL', 1], ['DM', 1.2], ['MC', 2], ['AMC', 1], ['MR', 0.5], ['ML', 0.5], ['AMR', 1], ['AML', 1], ['ST', 2]]
/** Id consecutivo para un jugador nuevo. */
export function newPid(g: Game): number {
  g.nextPid ??= Math.max(0, ...Object.keys(g.players).map(Number).filter(n => n < 100000)) + 1
  return g.nextPid++
}
/** Genera un juvenil de inferiores, o (con opt) un jugador formado que llega del exterior. */
export function makeYouth(g: Game, club: Club, rng: Rng, boost = 0, force?: Pos, opt?: { age: number; target: number; nat: string }): Player {
  const pos = force ?? rng.weighted(YOUTH_POS, x => x[1])[0]
  const age = opt?.age ?? rng.int(16, 18)
  const target = clamp(Math.round(opt?.target ?? 15 + club.rep * 0.5 + rng.gauss() * 5 + boost), 25, opt ? 90 : 80)
  const w = POS_WEIGHTS[pos], base = 3 + target * 0.15
  const attrs = ATTRS.map((_, i) => {
    const gkA = i >= A.han
    if (pos === 'GK') return clamp(Math.round(gkA || w[i] > 0 ? base + (w[i] - 2.5) * 0.5 + rng.gauss() * 1.6 : 2 + rng.next() * 6), 1, 20)
    return clamp(Math.round(gkA ? 1 + rng.next() * 3 : base + (w[i] - 1.7) * 0.75 + rng.gauss() * 2.1), 1, 20)
  })
  const ca = Math.round(rawRating(attrs, pos))
  const p: Player = {
    id: newPid(g), name: `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)}`, clubId: club.id, line: POS_LINE[pos] as Line, positions: [pos],
    foot: rng.chance(0.24) ? 'I' : 'D', birth: `${g.season - age}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
    nat: opt?.nat ?? 'Argentina', num: 0, attrs, ca, pa: opt ? clamp(ca + (age <= 24 ? rng.int(2, 8) : rng.int(0, 2)), ca, 94) : clamp(ca + rng.int(6, 22) + Math.round(boost) + (rng.chance(0.05) ? 8 : 0), ca, 92),
    value: 0, wage: 0, contractEnd: g.season + 3, loan: false, youth: !opt, morale: 70, cond: 100, form: [], injury: null, susp: 0, ycAcc: 0,
    prof: clamp(Math.round(11 + rng.gauss() * 3.5), 1, 20), stats: emptyStats(), history: [], gen: true,
  }
  Object.assign(p, valuation(p, g.date))
  g.players[p.id] = p
  p.num = freeNumber(g, club.id, { ...p, num: rng.int(30, 60) } as Player)
  return p
}

/** Recambio de planteles al cambiar de temporada: préstamos, retiros, contratos y camada juvenil. */
export function seasonTurnover(g: Game, rng: Rng) {
  const you = g.manager.attrs.you
  for (const p of Object.values(g.players)) {
    const age = ageOn(p.birth, g.date)
    if (p.loanFrom) { const back = g.clubs[p.loanFrom]; if (back) { dropFromTactics(g, p); p.clubId = back.id; p.num = freeNumber(g, back.id, p) } p.loanFrom = undefined }
    p.loan = false
    if (age >= 39 || (age >= 36 && rng.chance(0.5)) || (age >= 34 && p.ca < 55 && rng.chance(0.5))) {
      if (p.clubId === g.userClubId) news(g, { tag: 'club', clubId: p.clubId, pid: p.id, title: `${p.name} se retira del fútbol`, body: `A los ${age} años, ${p.name} anunció su retiro como jugador profesional.` })
      removePlayer(g, p); continue
    }
    if (p.contractEnd < g.season) {
      if (p.clubId === g.userClubId) {
        const dest = rng.pick(Object.values(g.clubs).filter(c => c.id !== p.clubId && Math.abs(c.rep - g.clubs[p.clubId].rep) <= 10))
        news(g, { tag: 'mercado', clubId: p.clubId, pid: p.id, title: `${p.name} se fue libre`, body: `Venció el contrato de ${p.name} y el jugador firmó con ${dest.name} con el pase en su poder.` })
        dropFromTactics(g, p); p.clubId = dest.id; p.num = freeNumber(g, dest.id, p); p.wage = valuation(p, g.date).wage
      }
      p.contractEnd = g.season + rng.int(0, 2)
    }
  }
  for (const c of Object.values(g.clubs)) {
    const mine = c.id === g.userClubId
    let sq = squadOf(g, c.id)
    // los planteles de la IA no crecen sin control: se van los de menor nivel (los pibes con proyección se quedan)
    const cap = c.division === 0 ? 24 : c.division === 3 ? 28 : 32
    if (!mine) for (const p of [...sq].sort((a, b) => (a.ca * 0.6 + a.pa * 0.4) - (b.ca * 0.6 + b.pa * 0.4))) { if (sq.length <= cap) break; if (ageOn(p.birth, g.date) >= 22 || p.pa < 62) { removePlayer(g, p); sq = sq.filter(x => x !== p) } }
    const n = Math.max(mine ? 3 + (you >= 15 ? 1 : 0) : 3, 24 - sq.length)
    const made: Player[] = []
    for (let i = 0; i < n; i++) made.push(makeYouth(g, c, rng, mine ? (you - 10) * 0.5 + (sab(g, 'youth') - 10) * 0.4 : 0))
    if (sq.filter(p => p.line === 'GK').length < 2) makeYouth(g, c, rng, 0, 'GK')
    if (mine) {
      const top = made.sort((a, b) => b.pa - a.pa)[0]
      news(g, { tag: 'club', clubId: c.id, pid: top.id, title: `Suben ${made.length} juveniles al plantel`, body: `Las inferiores de ${c.name} promovieron a ${made.map(p => p.name).join(', ')}. En el club destacan el potencial de ${top.name}.` })
    }
    // los clubes reinvierten lo que tienen en caja: más presupuesto de pases y más masa salarial
    c.budget = Math.max(mine ? 50000 : 80000, Math.round((baseBudget(c.rep) * 0.6 + Math.max(0, c.balance) * (mine ? 0.3 : 0.45)) / 10000) * 10000)
    c.wageBudget = Math.round((wageBill(g, c.id) * 1.1 + Math.max(0, c.balance) * 0.004) / 1000) * 1000
    c.ledger = emptyLedger()
  }
}
