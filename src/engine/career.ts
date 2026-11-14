// Mercado de pases, finanzas, dirigencia, juveniles y carrera del DT.
import { sab, staffWage } from './week'
import { initSquad } from './squad'
import { addDays, autoPick, clubsIn, fmtDate, leagueFx, news, squadOf, tableOf, valuation } from './game'
import { FORMATIONS, POS_LINE, POS_WEIGHTS, ageOn, bestRating, posRating, rawRating } from './positions'
import { Rng, clamp } from './rng'
import { ATTRS, A, STAFF_ROLES, emptyLedger, emptyStats, type Club, type Fixture, type Game, type JobOffer, type Line, type Manager, type MgrAttr, type Offer, type Player, type Pos, type StaffRole, type Terms } from './types'

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
export function takeJob(g: Game, clubId: number) { switchClub(g, clubId, 'Despedido', -6) }
/** Acepta una oferta de trabajo de otro club. */
export function acceptJob(g: Game, clubId: number) { switchClub(g, clubId, `Se fue a ${g.clubs[clubId].short}`, 2) }
const coachName = (g: Game) => `${NOMBRES[(g.nextId * 7) % NOMBRES.length]} ${APELLIDOS[(g.nextId++ * 13) % APELLIDOS.length]}`
function switchClub(g: Game, clubId: number, note: string, repDelta: number) {
  closeCareerSeason(g, note)
  const old = g.clubs[g.userClubId]
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
    const ab = clamp(Math.round(4 + to.rep * 0.12 + rng.gauss() * 2.2), 3, 20)
    g.staff.push({ id: g.nextId++, name: `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)}`, role, ability: ab, wage: staffWage(ab), contractEnd: g.season + rng.int(1, 2), clubId: to.id, age: rng.int(31, 66) })
  }
  g.rngState = rng.s
  return came
}
/** Lo que pasa al aceptar un trabajo: se pierden las ofertas por jugadores, las otras ofertas de trabajo y la conferencia abierta; el ayudante y el preparador físico vienen con el DT (`follow`) y el resto del cuerpo técnico queda en el club (`staff`). */
export function jobConsequences(g: Game, clubId: number): { offers: number; jobs: number; press: boolean; staff: number; follow: number } {
  const mine = g.staff.filter(s => s.clubId === g.userClubId)
  return {
    offers: g.offers.filter(o => g.players[o.pid]).length,
    jobs: (g.jobOffers ?? []).filter(j => j.clubId !== clubId && j.until >= g.date).length,
    press: !!g.press,
    staff: mine.filter(s => CLUB_STAFF.includes(s.role)).length,
    follow: mine.filter(s => COACH_STAFF.includes(s.role)).length,
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
const FOREIGN = ['Benfica', 'Porto', 'Ajax', 'Sevilla', 'Villarreal', 'Betis', 'Bologna', 'Fiorentina', 'Flamengo', 'Palmeiras', 'Botafogo', 'Inter Miami', 'Atlanta United', 'Brighton', 'Wolverhampton', 'Olympique de Marsella', 'Zenit', 'Cruz Azul', 'Monterrey', 'Sporting de Lisboa', 'Atlético Mineiro', 'Girona']
const hash = (a: number, b: number) => ((a * 2654435761 + b * 40503) >>> 0) % 1000 / 1000

export function squadRank(g: Game, p: Player): number {
  return squadOf(g, p.clubId).filter(x => x.line === p.line || true).sort((a, b) => b.ca - a.ca).findIndex(x => x.id === p.id)
}
export function askingPrice(g: Game, p: Player): number {
  const rank = squadRank(g, p)
  let v = p.value * (rank < 11 ? 1.4 : rank < 18 ? 1.15 : 0.95)
  if (p.listed) v *= 0.75
  if (p.contractEnd <= g.season) v *= 0.7
  return Math.max(20000, Math.round(v / 10000) * 10000)
}
export function wageDemand(g: Game, p: Player, dest: Club): number {
  const base = valuation(p, g.date).wage * (1 + (dest.rep - 60) / 180)
  return Math.round(Math.max(p.wage * 1.05, base) / 100) * 100
}
export interface BidResult { ok: boolean; reason?: string; counter?: number }
/** Evalúa una oferta del usuario. No ejecuta el pase. */
export function evaluateBid(g: Game, p: Player, fee: number, loan: boolean): BidResult {
  const dest = g.clubs[g.userClubId], src = g.clubs[p.clubId]
  if (!windowOpen(g.date)) return { ok: false, reason: 'El libro de pases está cerrado. Reabre el 1 de enero y el 25 de junio.' }
  if (p.loanFrom) return { ok: false, reason: 'El jugador está a préstamo en su club actual.' }
  if (!loan && p.clause && fee >= p.clause) return windowOpen(g.date) && fee <= dest.budget ? { ok: true } : { ok: false, reason: 'No te alcanza el presupuesto para pagar la cláusula.' }
  const sq = squadOf(g, src.id), rank = squadRank(g, p)
  if (sq.length <= 20 || (p.line === 'GK' && sq.filter(x => x.line === 'GK').length <= 2)) return { ok: false, reason: `${src.name} no puede desprenderse del jugador: se queda sin recambio.` }
  if (squadOf(g, dest.id).length >= 45) return { ok: false, reason: 'Tu plantel ya tiene 45 jugadores.' }
  if (dest.division > src.division && rank < 11) return { ok: false, reason: `${p.name} no quiere bajar de categoría.` }
  if (dest.rep < src.rep - (rank < 14 ? 6 : 16)) return { ok: false, reason: `${p.name} no ve con buenos ojos irse a un club de menor nivel.` }
  const wage = loan ? p.wage : wageDemand(g, p, dest)
  if (wageBill(g, dest.id) + wage > dest.wageBudget) return { ok: false, reason: `Pide US$ ${wage.toLocaleString('es-AR')} por mes y supera tu tope salarial.` }
  if (loan) {
    if (rank < 14) return { ok: false, reason: `${src.name} lo considera importante y no lo cede a préstamo.` }
    const need = Math.round((p.value * 0.08) / 5000) * 5000
    if (fee < need) return { ok: false, reason: 'El cargo por el préstamo es bajo.', counter: need }
  } else {
    const thr = Math.round((askingPrice(g, p) * (0.9 + hash(p.id, g.season) * 0.2) * (1 - (g.manager.attrs.neg - 10) * 0.012)) / 10000) * 10000
    if (fee < thr) return { ok: false, reason: `${src.name} rechazó la oferta.`, counter: thr }
  }
  if (fee > dest.budget) return { ok: false, reason: 'No te alcanza el presupuesto de pases.' }
  return { ok: true }
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
export function doTransfer(g: Game, p: Player, toId: number, fee: number, loan = false, quiet = false, terms?: Terms) {
  const from = g.clubs[p.clubId], to = g.clubs[toId]
  dropFromTactics(g, p)
  from.balance += fee; from.ledger.sales += fee
  to.balance -= fee; to.budget -= fee; to.ledger.buys += fee
  if (!loan) from.budget += Math.round(fee * 0.6)
  p.num = freeNumber(g, toId, p)
  if (loan) { p.loanFrom = from.id; p.loan = true } else { p.wage = terms?.wage ?? wageDemand(g, p, to); p.contractEnd = g.season + (terms?.years ?? 2); p.loan = false; p.loanFrom = undefined; p.clause = terms?.clause || undefined }
  if (terms) { to.balance -= terms.bonus; to.ledger.buys += terms.bonus }
  p.status = toId === g.userClubId ? (terms?.status ?? undefined) : undefined
  p.recent = []; p.promise = null; p.wantsOut = false; p.reserve = false; p.happy = 72; p.tfocus = undefined
  p.clubId = toId; p.listed = false; p.morale = clamp(p.morale + 8, 0, 100)
  g.transfers.unshift({ date: g.date, pid: p.id, name: p.name, from: from.name, to: to.name, fee, loan })
  if (g.transfers.length > 300) g.transfers.length = 300
  g.offers = g.offers.filter(o => o.pid !== p.id)
  if (toId === g.userClubId) g.shortlist = g.shortlist.filter(id => id !== p.id) // si se va a otro club, el DT lo sigue observando
  const mine = from.id === g.userClubId || to.id === g.userClubId
  if (!quiet && (mine || fee >= 1500000)) news(g, {
    tag: 'mercado', clubId: to.id, pid: p.id, ...(from.id === g.userClubId ? { me: true } : {}), title: `${p.name} ${loan ? 'llega a préstamo a' : 'es nuevo jugador de'} ${to.short}`,
    body: `${to.name} ${loan ? 'acordó el préstamo' : 'cerró la contratación'} de ${p.name}, proveniente de ${from.name}${fee ? `, a cambio de US$ ${fee.toLocaleString('es-AR')}` : ''}.`,
  })
}
function sellAbroad(g: Game, p: Player, buyer: string, fee: number) {
  const from = g.clubs[p.clubId]
  dropFromTactics(g, p)
  from.balance += fee; from.ledger.sales += fee; from.budget += Math.round(fee * 0.6)
  g.transfers.unshift({ date: g.date, pid: p.id, name: p.name, from: from.name, to: buyer, fee })
  news(g, { tag: 'mercado', clubId: from.id, pid: p.id, title: `${p.name} se va a ${buyer}`, body: `${from.name} vendió a ${p.name} a ${buyer} en US$ ${fee.toLocaleString('es-AR')}. El jugador, de ${ageOn(p.birth, g.date)} años, seguirá su carrera en el exterior.` })
  removePlayer(g, p)
}
export function removePlayer(g: Game, p: Player) {
  dropFromTactics(g, p)
  g.offers = g.offers.filter(o => o.pid !== p.id); g.shortlist = g.shortlist.filter(id => id !== p.id)
  delete g.players[p.id]
}

/** Un jugador que el club tiene a préstamo no es suyo: no se puede declarar transferible, ni recibir ofertas, ni vender. */
export const canSell = (p: Player) => p.loanFrom == null
/** Acepta una oferta por un jugador propio. Devuelve false (sin cambios) con el libro de pases cerrado o si el jugador no se puede vender. */
export function acceptOffer(g: Game, o: Offer): boolean {
  const p = g.players[o.pid]
  if (!p || !windowOpen(g.date) || !canSell(p)) return false
  if (o.from === 0) sellAbroad(g, p, o.fromName, o.fee); else doTransfer(g, p, o.from, o.fee)
  g.offers = g.offers.filter(x => x.id !== o.id)
  return true
}
export function rejectOffer(g: Game, o: Offer) { g.offers = g.offers.filter(x => x.id !== o.id) }
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
  if (asked <= top && hash(o.id * 31 + k, p.id) < 0.75) { o.fee = asked; return true }
  rejectOffer(g, o)
  return false
}

/** Actividad diaria del mercado (clubes de la IA, ofertas del exterior y por jugadores del usuario). */
export function marketTick(g: Game, days: number, rng: Rng) {
  for (const o of g.offers) if (offerDeadline(o) <= g.date && g.players[o.pid]?.clubId === g.userClubId)
    news(g, { tag: 'mercado', clubId: g.userClubId, pid: o.pid, ref: o.id, me: true, title: `Venció la oferta de ${o.fromName} por ${g.players[o.pid].name}`, body: `No respondiste a tiempo y ${o.fromName} retiró la oferta de US$ ${o.fee.toLocaleString('es-AR')} por ${g.players[o.pid].name}.` })
  g.offers = g.offers.filter(o => offerDeadline(o) > g.date && g.players[o.pid])
  if (!windowOpen(g.date)) return
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
          if (!g.players[p.id] || p.clubId === buyer.id || p.positions[0] !== pos || !canSell(p)) continue
          const r = bestRating(p), price = askingPrice(g, p), src = g.clubs[p.clubId]
          if (r < wr + 2.5 || price > buyer.budget || buyer.rep < src.rep - 5 || squadOf(g, src.id).length <= 22) continue
          if (wageBill(g, buyer.id) + wageDemand(g, p, buyer) > buyer.wageBudget * 1.08) continue
          const s = (r - wr) / Math.sqrt(price)
          if (s > bs) { bs = s; best = p }
        }
        if (best) {
          const price = askingPrice(g, best)
          if (best.clubId === g.userClubId && best.clause && buyer.budget >= best.clause && (best.pers?.amb ?? 10) >= 12 && rng.chance(0.3)) {
            news(g, { tag: 'mercado', clubId: g.userClubId, pid: best.id, title: `${buyer.name} pagó la cláusula de ${best.name}`, body: `${buyer.name} depositó los US$ ${best.clause.toLocaleString('es-AR')} de la cláusula de rescisión y ${best.name} deja el club.` })
            doTransfer(g, best, buyer.id, best.clause)
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
      const cands = all.filter(p => g.players[p.id] && g.clubs[p.clubId]?.division === 1 && p.ca >= 73 && ageOn(p.birth, g.date) <= 26 && canSell(p))
      if (cands.length) {
        const p = rng.weighted(cands, x => (x.pa - 65) ** 2)
        const fee = Math.round((p.value * (1.1 + rng.next() * 0.6)) / 50000) * 50000
        if (p.clubId === g.userClubId) pushOffer(g, p, 0, rng.pick(FOREIGN), fee)
        else if (rng.chance(0.55) && squadOf(g, p.clubId).length > 22) sellAbroad(g, p, rng.pick(FOREIGN), fee)
      }
    }
    // interés por jugadores transferibles del usuario
    for (const p of squadOf(g, g.userClubId)) if ((p.listed || p.wantsOut) && canSell(p) && rng.chance(p.listed ? 0.12 : 0.05) && !g.offers.some(o => o.pid === p.id)) {
      const buyers = clubs.filter(c => c.id !== g.userClubId && c.budget >= p.value * 0.7 && c.rep >= g.clubs[g.userClubId].rep - 14 && squadOf(g, c.id).length < 40)
      if (buyers.length) { const b = rng.pick(buyers); pushOffer(g, p, b.id, b.name, Math.round((Math.min(b.budget, p.value * (0.7 + rng.next() * 0.4))) / 10000) * 10000) }
    }
  }
}
function pushOffer(g: Game, p: Player, from: number, fromName: string, fee: number) {
  if (!canSell(p) || g.offers.some(o => o.pid === p.id && o.from === from) || g.offers.length >= 8) return
  const o: Offer = { id: g.nextId++, pid: p.id, from, fromName, fee, date: g.date }
  g.offers.push(o)
  news(g, { tag: 'mercado', clubId: g.userClubId, pid: p.id, act: 'offer', ref: o.id, title: `Oferta de ${fromName} por ${p.name}`, body: `${fromName} ofrece US$ ${fee.toLocaleString('es-AR')} por el pase de ${p.name}. Podés responder desde este mensaje. Vence el ${fmtDate(offerDeadline(o))}.` })
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
