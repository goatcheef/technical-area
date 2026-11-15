// Estado del mundo: nueva partida, selección de equipos, calendario, torneos y temporadas.
import dbJson from '../data/db.json'
import { MatchSim, type MatchResult } from './match'
import { FORMATIONS, FORMATION_NAMES, POS_WEIGHTS, ageOn, bestRole, fixRoles, posRating, rawRating } from './positions'
import { Rng, clamp } from './rng'
import { emptyLedger, emptyStats, type Club, type Competition, type Fixture, type Game, type Manager, type News, type Player, type Tactic } from './types'
import { planMatch } from './ai'
import { aggFor, computeQual, isCup, progressCup, qualOf, scheduleCups } from './cups'
import { afterUserMatch, dailySquad, harmonyBoost, initSquad, learnFromMatch, weeklyReserve } from './squad'
import { isDerby } from './week'
import { answerPress, dailyTraining, dayEvents, delegatePress, docFactor, initStaff, makePostPress, refreshPool, trainEdge } from './week'
import { expireSeasonJobs, seasonOffers } from './career'
import { boardAfterMatch, closeCareerSeason, dailyDeals, dailyFinances, gateIncome, initFinances, marketTick, mgrBoost, prize, seasonTurnover, setObjective } from './career'

const db = dbJson as unknown as { start: string; dbVersion?: number; clubs: any[]; players: any[] }
export const DB_CLUBS = db.clubs as { id: number; name: string; short: string; division: number; zone: string; rep: number; colors: [string, string]; city: string; stadium: string; manager: string }[]

/** Clásicos (por código de club). Definen el interzonal de cada fecha. */
const RIVALS: [string, string][] = [
  ['BOC', 'RIV'], ['IND', 'RAC'], ['EDL', 'GLP'], ['SLO', 'HUR'], ['TAL', 'BEL'], ['NOB', 'CEN'], ['LAN', 'BAN'],
  ['VEL', 'ARG'], ['PLA', 'TIG'], ['GEM', 'IRV'], ['RIE', 'BAR'], ['UNI', 'ATU'], ['DYJ', 'SAR'], ['CCO', 'ERC'], ['INS', 'ALD'],
  ['COL', 'PAT'], ['SMT', 'GYT'], ['FER', 'ALL'], ['CHA', 'ATL'], ['QUI', 'TEM'], ['MOR', 'ALM'], ['CHI', 'AMG'],
]

// ---------- fechas ----------
export function addDays(d: string, n: number): string {
  const t = new Date(d + 'T12:00:00Z')
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
export function firstSaturday(from: string): string {
  let d = from
  while (new Date(d + 'T12:00:00Z').getUTCDay() !== 6) d = addDays(d, 1)
  return d
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-').map(Number)
  return `${dd} ${MESES[m - 1]} ${y}`
}
/** Fecha corta sin año ("19 ene"), para los plazos de la temporada en curso. */
export function fmtDay(d: string): string {
  const [, m, dd] = d.split('-').map(Number)
  return `${dd} ${MESES[m - 1]}`
}
/** Días de `a` a `b` (negativo si `b` es anterior). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)

// ---------- economía básica ----------
export function valuation(p: Player, date: string): { value: number; wage: number } {
  const age = ageOn(p.birth, date)
  const base = 150000 * 1.6 ** ((p.ca - 50) / 5)
  const ageM = age <= 19 ? 1.9 : age <= 21 ? 2.0 : age <= 24 ? 1.6 : age <= 28 ? 1.15 : age <= 30 ? 0.75 : age <= 32 ? 0.42 : age <= 34 ? 0.2 : 0.08
  const pot = 1 + Math.max(0, p.pa - p.ca) / 14
  const value = Math.round((base * ageM * pot) / 25000) * 25000
  const wage = Math.round((1400 * 1.5 ** ((p.ca - 50) / 5) * (age >= 30 ? 1.15 : age <= 20 ? 0.6 : 1)) / 100) * 100
  return { value: Math.max(25000, value), wage }
}

// ---------- disponibilidad y armado de equipo ----------
export const available = (p: Player) => !p.injury && p.susp === 0
export const squadOf = (g: Game, clubId: number) => Object.values(g.players).filter(p => p.clubId === clubId)

export function autoPick(g: Game, clubId: number, formation: string): { lineup: number[]; bench: number[] } {
  const pool = squadOf(g, clubId).filter(available)
  const slots = FORMATIONS[formation]
  const score = (p: Player, i: number) => posRating(p, slots[i].pos) * (0.55 + 0.45 * p.cond / 100)
  const lineup: number[] = new Array(11).fill(0)
  const used = new Set<number>()
  const open = new Set(slots.map((_, i) => i))
  while (open.size) {
    let bi = -1, bp: Player | null = null, bs = -1
    for (const i of open) for (const p of pool) {
      if (used.has(p.id)) continue
      const s = score(p, i) + (slots[i].pos === 'GK' ? 1000 : 0) // el arco se cubre primero
      if (s > bs) { bs = s; bi = i; bp = p }
    }
    if (!bp) break
    lineup[bi] = bp.id; used.add(bp.id); open.delete(bi)
  }
  const rest = pool.filter(p => !used.has(p.id)).sort((a, b) => b.ca * (0.6 + 0.4 * b.cond / 100) - a.ca * (0.6 + 0.4 * a.cond / 100))
  const bench: Player[] = []
  const take = (f: (p: Player) => boolean, n: number) => { for (const p of rest) if (n > 0 && f(p) && !bench.includes(p)) { bench.push(p); n-- } }
  take(p => p.line === 'GK', 1); take(p => p.line === 'DF', 2); take(p => p.line === 'MF', 2); take(p => p.line === 'FW', 2)
  take(p => p.line !== 'GK', 9 - bench.length)
  return { lineup: lineup.filter(Boolean), bench: bench.map(p => p.id) }
}

/** Formación que mejor le queda al plantel (para clubes de la IA). */
function bestFormation(g: Game, clubId: number, rng: Rng): string {
  let bf = '4-4-2', bs = -1
  for (const f of FORMATION_NAMES) {
    const { lineup } = autoPick(g, clubId, f)
    const s = lineup.reduce((t, id, i) => t + posRating(g.players[id], FORMATIONS[f][i].pos), 0) * (0.95 + rng.next() * 0.1)
    if (s > bs) { bs = s; bf = f }
  }
  return bf
}

/** Corrige la alineación del usuario si tiene jugadores no disponibles. Devuelve true si cambió algo. */
export function fixLineup(g: Game, clubId: number): boolean {
  const c = g.clubs[clubId], t = c.tactic
  t.roles = fixRoles(t.formation, t.roles)
  const ok = (id: number) => { const p = g.players[id]; return !!p && p.clubId === clubId && available(p) }
  const valid = t.lineup.length === 11 && new Set(t.lineup).size === 11 && t.lineup.every(ok)
  const benchOk = t.bench.every(ok) && t.bench.every(id => !t.lineup.includes(id)) && t.bench.length >= Math.min(7, squadOf(g, clubId).filter(available).length - 11)
  if (valid && benchOk) return false
  const slots = FORMATIONS[t.formation]
  const pool = squadOf(g, clubId).filter(available)
  const lineup = slots.map((_, i) => (ok(t.lineup[i]) && t.lineup.indexOf(t.lineup[i]) === i ? t.lineup[i] : 0))
  const used = new Set(lineup.filter(Boolean))
  lineup.forEach((id, i) => {
    if (id) return
    const cand = pool.filter(p => !used.has(p.id)).sort((a, b) => posRating(b, slots[i].pos) - posRating(a, slots[i].pos))[0]
    if (cand) { lineup[i] = cand.id; used.add(cand.id) }
  })
  t.lineup = lineup
  const keep = t.bench.filter(id => ok(id) && !used.has(id))
  keep.forEach(id => used.add(id))
  const extra = pool.filter(p => !used.has(p.id)).sort((a, b) => b.ca - a.ca)
  if (!keep.some(id => g.players[id].line === 'GK')) { const gk = extra.find(p => p.line === 'GK'); if (gk) keep.push(gk.id) }
  for (const p of extra) if (keep.length < 9 && !keep.includes(p.id)) keep.push(p.id)
  t.bench = keep.slice(0, 9)
  return true
}


// Árbitros (nombres ficticios)
const REF_N = ['Martín', 'Gustavo', 'Fernando', 'Pablo', 'Diego', 'Sergio', 'Andrés', 'Hernán', 'Leandro', 'Mauro', 'Ariel', 'Nicolás', 'Javier', 'Silvio', 'Rodolfo']
const REF_A = ['Iriarte', 'Landaburu', 'Echeverri', 'Ocampo', 'Sarmiento', 'Bertolotti', 'Galarza', 'Quinteros', 'Villafañe', 'Arregui', 'Montesano', 'Lucero', 'Cabrera', 'Ledesma', 'Pizarro']

// ---------- tablas ----------
/** `fp`: puntos de fair play (amarilla 1, expulsión 3; menos es mejor). */
export interface Row { clubId: number; pj: number; g: number; e: number; p: number; gf: number; gc: number; pts: number; fp: number }
/** Criterios de desempate con igualdad de puntos (reglamentos 2026):
 *  - `lpf`: zonas del Apertura y el Clausura. Reglamento de Torneos LPF Primera 2026, art. 23: diferencia de gol, goles a favor,
 *    partidos entre los empatados (puntos, diferencia de gol y goles a favor entre ellos, repetido las veces que haga falta),
 *    Tabla General de Fair Play y sorteo del Comité Ejecutivo.
 *  - `lpf-anual`: tabla anual (art. 24.3): diferencia de gol, goles a favor, fair play y sorteo; sin partidos entre sí.
 *  - `afa`: Primera Nacional 2026 (Boletín Especial AFA 6823) y, por extensión, la tercera categoría y los grupos de copa:
 *    diferencia de gol, goles a favor y sorteo.
 *  El partido de desempate que el reglamento manda para los puestos de descenso (art. 111 del Reglamento General) no se juega:
 *  se usan estos mismos criterios. El fair play es una aproximación con las tarjetas del torneo (amarilla 1, expulsión 3). */
export type TieRule = 'lpf' | 'lpf-anual' | 'afa'
function ruleFor(fixtures: Fixture[]): TieRule {
  let ap = false, cl = false
  for (const f of fixtures) { if (f.comp === 'AP') ap = true; else if (f.comp === 'CL') cl = true; else return 'afa' }
  return ap && cl ? 'lpf-anual' : ap || cl ? 'lpf' : 'afa'
}
/** Sorteo: un orden fijo por club y torneo que sale del fixture (la localía de la primera fecha depende de la semilla de la partida). */
function drawKey(clubId: number, salt: number) {
  let h = Math.imul(clubId ^ salt, 0x9e3779b1) ^ 0x85ebca6b
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return (h ^ (h >>> 15)) >>> 0
}
function tally(fixtures: Fixture[], teams: Iterable<number>, fp = false): Map<number, Row> {
  const rows = new Map<number, Row>([...teams].map(id => [id, { clubId: id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, fp: 0 }]))
  for (const f of fixtures) {
    if (!f.played) continue
    const upd = (r: Row | undefined, gf: number, gc: number, side: 0 | 1) => {
      if (!r) return
      r.pj++; r.gf += gf; r.gc += gc
      if (gf > gc) { r.g++; r.pts += 3 } else if (gf === gc) { r.e++; r.pts++ } else r.p++
      if (fp && f.stats) r.fp += (f.stats.yc?.[side] ?? 0) + 3 * (f.stats.rc?.[side] ?? 0)
    }
    upd(rows.get(f.home), f.hg, f.ag, 0); upd(rows.get(f.away), f.ag, f.hg, 1)
  }
  return rows
}
/** Puntos, diferencia de gol y goles a favor (el orden común a todos los torneos). */
export const cmpRows = (x: Row, y: Row) => y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf
/** Parte una lista ya ordenada en grupos que siguen empatados según `cmp`. */
function ties<T>(list: T[], cmp: (a: T, b: T) => number): T[][] {
  const out: T[][] = []
  for (const r of list) { const last = out[out.length - 1]; if (last && cmp(last[0], r) === 0) last.push(r); else out.push([r]) }
  return out
}
/** Tabla de posiciones. Sin `rule`, el criterio sale de los partidos: Apertura o Clausura → `lpf`; los dos → `lpf-anual`; el resto → `afa`. */
export function tableOf(fixtures: Fixture[], teams: number[], rule: TieRule = ruleFor(fixtures)): Row[] {
  const rows = tally(fixtures, teams, rule !== 'afa')
  const f0 = fixtures[0], salt = f0 ? f0.id * 131 + f0.home * 7 + Number(f0.date.slice(0, 4)) : 0
  const last = (group: Row[]) => group.sort((x, y) => (rule === 'afa' ? 0 : x.fp - y.fp) || drawKey(x.clubId, salt) - drawKey(y.clubId, salt))
  const resolve = (group: Row[]): Row[] => {
    if (group.length < 2) return group
    if (rule !== 'lpf') return last(group)
    const ids = new Set(group.map(r => r.clubId))
    const mini = tally(fixtures.filter(f => ids.has(f.home) && ids.has(f.away)), ids)
    const h2h = (x: Row, y: Row) => cmpRows(mini.get(x.clubId)!, mini.get(y.clubId)!)
    const sub = ties([...group].sort(h2h), h2h)
    // si los partidos entre sí no separan a nadie, siguen el fair play y el sorteo; si separan a algunos, se repite con los que quedan
    return sub.length === 1 ? last(group) : sub.flatMap(resolve)
  }
  return ties([...rows.values()].sort(cmpRows), cmpRows).flatMap(resolve)
}
/** Cupos por zona que usan las fases del motor (y las marcas de las tablas, con `zoneRule`). */
export const SPOTS = { ko: 8, pnFinal: 1, pnReducido: 4, pnDown: 2, t3Up: 2, groupUp: 2 }
export type Mark = 'q' | 'p' | 'r' | ''
/** Qué significa cada puesto de una tabla, con la misma regla que aplica el motor al cerrar la fase o la temporada.
 *  `comp`: AP, CL, PN, T3, LIB, SUD (grupos) o AN (tabla anual: copas según `qualOf` y descenso según `relegationZone`). */
export function zoneRule(g: Game, comp: string): { mark: (i: number, n: number, clubId: number) => Mark; legend: [Mark, string][] } {
  if (comp === 'PN') return {
    mark: (i, n) => (i < SPOTS.pnFinal ? 'q' : i < SPOTS.pnReducido ? 'p' : i >= n - SPOTS.pnDown ? 'r' : ''),
    legend: [['q', 'Final por el ascenso'], ['p', 'Reducido por el segundo ascenso'], ['r', 'Descienden a la tercera categoría']],
  }
  if (comp === 'T3') return { mark: i => (i < SPOTS.t3Up ? 'q' : ''), legend: [['q', 'Ascienden a la Primera Nacional']] }
  if (comp === 'LIB' || comp === 'SUD') return { mark: i => (i < SPOTS.groupUp ? 'q' : ''), legend: [['q', 'Pasan a cuartos de final']] }
  if (comp === 'AN') {
    const q = g.seasonOver && g.qual ? g.qual : qualOf(g), lib = new Set(q.lib), sud = new Set(q.sud), last = relegationZone(g)[0]
    return {
      mark: (_i, _n, id) => (id === last ? 'r' : lib.has(id) ? 'q' : sud.has(id) ? 'p' : ''),
      legend: [['q', 'Copa Libertadores'], ['p', 'Copa Sudamericana'], ['r', 'Desciende (último de la anual)']],
    }
  }
  return { mark: i => (i < SPOTS.ko ? 'q' : ''), legend: [['q', 'Clasifican a los octavos de final']] }
}
export const clubsIn = (g: Game, division: number, zone?: string) =>
  Object.values(g.clubs).filter(c => c.division === division && (!zone || c.zone === zone)).map(c => c.id)
export const leagueFx = (g: Game, comp: string) => g.fixtures.filter(f => f.comp === comp && !f.knockout)
export const zoneTable = (g: Game, comp: string, division: number, zone: string) => tableOf(leagueFx(g, comp), clubsIn(g, division, zone))
export const annualTable = (g: Game) => tableOf(g.fixtures.filter(f => (f.comp === 'AP' || f.comp === 'CL') && !f.knockout), clubsIn(g, 1))
export interface AvgRow { clubId: number; pts: number; pj: number; avg: number }
export function promedios(g: Game): AvgRow[] {
  const ann = annualTable(g), cur = new Map(ann.map(r => [r.clubId, r])), at = new Map(ann.map((r, i) => [r.clubId, i]))
  // con el mismo promedio queda más arriba el mejor de la tabla anual (el reglamento manda un partido de desempate)
  return clubsIn(g, 1).map(id => {
    const c = g.clubs[id], r = cur.get(id)!
    const hist = c.avgHist.filter(h => h.season >= g.season - 2)
    const pts = hist.reduce((s, h) => s + h.pts, 0) + r.pts, pj = hist.reduce((s, h) => s + h.pj, 0) + r.pj
    return { clubId: id, pts, pj, avg: pj ? pts / pj : 0 }
  }).sort((a, b) => b.avg - a.avg || at.get(a.clubId)! - at.get(b.clubId)!)
}

// ---------- fixture ----------
export function roundRobin(teams: number[]): [number, number][][] {
  const t = [...teams]
  if (t.length % 2) t.push(-1)
  const n = t.length, rounds: [number, number][][] = []
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i]
      pairs.push((i === 0 ? r % 2 === 0 : (r + i) % 2 === 0) ? [a, b] : [b, a])
    }
    rounds.push(pairs)
    t.splice(1, 0, t.pop()!)
  }
  return rounds
}
export function addFx(g: Game, f: Omit<Fixture, 'id' | 'played' | 'hg' | 'ag'>) {
  g.fixtures.push({ ...f, id: g.nextId++, played: false, hg: 0, ag: 0 })
}
export function news(g: Game, n: Omit<News, 'id' | 'date'>) {
  const me = n.clubId === g.userClubId || !!n.act || (n.pid != null && g.players[n.pid]?.clubId === g.userClubId)
  g.news.unshift({ ...n, id: g.nextId++, date: g.date, ...(me ? { me } : {}) })
  // se descartan primero las noticias viejas del resto del fútbol: los mensajes del DT duran más
  if (g.news.length > 320) {
    let drop = g.news.length - 300
    for (let i = g.news.length - 1; i >= 0 && drop > 0; i--) if (!g.news[i].me) { g.news.splice(i, 1); drop-- }
    if (g.news.length > 400) g.news.length = 400
  }
}

/** El mensaje es para el DT (su club, sus jugadores, sus decisiones). Las noticias viejas no traen `me`. */
export const isMine = (g: Game, n: News) => n.me ?? n.clubId === g.userClubId
export function markRead(g: Game, ids: number[], read: boolean) {
  const s = new Set(ids)
  for (const n of g.news) if (s.has(n.id)) n.read = read
}
/**
 * Clave de la decisión de la que habla un mensaje, haya o no un pendiente abierto: `offer<id>` y `deal<id>` con `ref`, y `out<pid>` para el
 * pedido de salida (`act: 'out'` con `pid`, sin mirar `ref`). `newestOf` la usa para ligar al pendiente solo el mensaje más nuevo.
 */
export const decisionKeyOf = (n: News): string | null =>
  n.act === 'out' ? (n.pid != null ? `out${n.pid}` : null) : n.ref == null ? null : n.act === 'offer' ? `offer${n.ref}` : n.act === 'deal' ? `deal${n.ref}` : null
/** Resolver una decisión a propósito marca leídos todos sus mensajes (regla de leído 2). La llaman las funciones del motor que la resuelven. */
export function readDecisionNews(g: Game, key: string) { markRead(g, g.news.filter(n => !n.read && decisionKeyOf(n) === key).map(n => n.id), true) }
/** Cuándo vuelve un lesionado y cuántos partidos de tu club se pierde (de hoy a la fecha de vuelta). */
export function injuryOutlook(g: Game, pid: number): { days: number; back: string; matches: number } | null {
  const p = g.players[pid]
  if (!p?.injury) return null
  // passDays descuenta un día al cerrar cada fecha: con `days` restantes, el día `back` ya está disponible
  const days = p.injury.days, back = addDays(g.date, days), c = g.userClubId
  return { days, back, matches: g.fixtures.filter(f => !f.played && f.date >= g.date && f.date < back && (f.home === c || f.away === c)).length }
}

function scheduleSeason(g: Game, rng: Rng) {
  const y = g.season
  const byCode = new Map(Object.values(g.clubs).map(c => [c.code, c.id]))
  const rival = new Map<number, number>()
  for (const [a, b] of RIVALS) { const x = byCode.get(a), z = byCode.get(b); if (x && z) { rival.set(x, z); rival.set(z, x) } }
  // Primera: zonas alineadas para que el interzonal de cada fecha sea el clásico
  const A = rng.shuffle(clubsIn(g, 1, 'A')), Bset = new Set(clubsIn(g, 1, 'B'))
  const B: number[] = []
  for (const a of A) { const r = rival.get(a); if (r && Bset.has(r)) { B.push(r); Bset.delete(r) } else B.push(0) }
  const restB = rng.shuffle([...Bset])
  for (let i = 0; i < B.length; i++) if (!B[i]) B[i] = restB.pop()!
  const shift = rng.int(1, A.length - 1)
  for (const [comp, start, flip] of [['AP', `${y}-01-22`, false], ['CL', `${y}-07-16`, true]] as const) {
    const rounds: [number, number][][] = []
    const ra = roundRobin(A), rb = roundRobin(B)
    for (let r = 0; r < ra.length; r++) {
      const pairs = [...ra[r], ...rb[r]].filter(p => p[0] !== -1 && p[1] !== -1)
      const byeA = ra[r].find(p => p[0] === -1 || p[1] === -1)!, byeB = rb[r].find(p => p[0] === -1 || p[1] === -1)!
      const ta = byeA[0] === -1 ? byeA[1] : byeA[0], tb = byeB[0] === -1 ? byeB[1] : byeB[0]
      pairs.push(r % 2 === 0 ? [ta, tb] : [tb, ta])
      rounds.push(pairs)
    }
    rounds.splice(7, 0, A.map((a, i) => (i % 2 === 0 ? [a, B[(i + shift) % B.length]] : [B[(i + shift) % B.length], a]) as [number, number]))
    let d = firstSaturday(start)
    rounds.forEach((pairs, r) => {
      for (const [h, a] of pairs) addFx(g, { comp, stage: `Fecha ${r + 1}`, round: r + 1, date: d, home: flip ? a : h, away: flip ? h : a })
      d = addDays(d, 7)
    })
    g.comps[comp] = { id: comp, name: comp === 'AP' ? `Torneo Apertura ${y}` : `Torneo Clausura ${y}`, division: 1, phase: 'league', koRound: 0, extra: { koDate: d } }
  }
  // Primera Nacional: dos zonas, ida y vuelta
  let last = ''
  for (const z of ['A', 'B']) {
    const teams = rng.shuffle(clubsIn(g, 2, z))
    const half = roundRobin(teams)
    const all = [...half, ...half.map(r => r.map(([h, a]) => [a, h] as [number, number]))]
    let d = firstSaturday(`${y}-02-05`)
    all.forEach((pairs, r) => {
      for (const [h, a] of pairs) addFx(g, { comp: 'PN', stage: `Fecha ${r + 1}`, round: r + 1, date: d, home: h, away: a })
      d = addDays(d, 7)
    })
    last = d
  }
  g.comps.PN = { id: 'PN', name: `Primera Nacional ${y}`, division: 2, phase: 'league', koRound: 0, extra: { koDate: last } }
  scheduleCups(g, rng)
  g.fixtures.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
}

// ---------- nueva partida ----------
export function newGame(userClubId: number, manager: Manager, seed = Date.now() % 2147483647): Game {
  const managerName = manager.name
  const rng = new Rng(seed)
  const g: Game = {
    version: 6, dbVersion: dbHash(), seed, rngState: 0, date: db.start, season: Number(db.start.slice(0, 4)), userClubId, managerName,
    clubs: {}, players: {}, fixtures: [], comps: {}, news: [], nextId: 100000, honours: [], seasonOver: false,
    manager, board: { confidence: clamp(48 + manager.rep / 5, 40, 70), objective: '', target: 0, fired: false, offers: [] }, offers: [], transfers: [], shortlist: [],
    staff: [], training: { intensity: 1, focus: 'equil', restAfter: true }, delegate: { training: false, press: false }, press: null, know: {}, scouting: [],
  }
  for (const p of db.players) {
    const pl: Player = {
      ...p, value: 0, wage: 0, morale: 70, cond: 100, form: [], injury: null, susp: 0, ycAcc: 0,
      stats: emptyStats(), history: [],
    }
    Object.assign(pl, valuation(pl, g.date))
    g.players[pl.id] = pl
  }
  for (const c of db.clubs) {
    const tactic: Tactic = {
      formation: '4-4-2', mentality: 2, pressing: rng.int(0, 2), tempo: rng.int(0, 2), width: rng.int(0, 2),
      line: rng.int(0, 2), passing: rng.int(0, 2), tackling: rng.int(0, 2), lineup: [], bench: [],
      focus: 3, finalThird: rng.pick([0, 1, 1, 1, 2, 2, 3]), onLoss: rng.int(0, 1), onWin: rng.int(0, 1), roles: [], takers: { pen: 0, fk: 0, corner: 0 },
    }
    g.clubs[c.id] = {
      id: c.id, name: c.name, short: c.short, code: c.code, city: c.city, stadium: c.stadium, capacity: c.capacity,
      division: c.division, zone: c.zone, rep: c.rep, colors: c.colors, manager: c.manager, tactic,
      fam: c.id === userClubId ? 55 : 78, famKey: '', balance: 0, budget: 0, wageBudget: 0, ledger: emptyLedger(),
      avgHist: c.division === 1 ? [{ season: g.season - 1, pts: Math.round(c.ppg * 32), pj: 32 }] : [],
    }
  }
  for (const c of Object.values(g.clubs)) {
    c.tactic.formation = bestFormation(g, c.id, rng)
    Object.assign(c.tactic, autoPick(g, c.id, c.tactic.formation))
    c.tactic.roles = fixRoles(c.tactic.formation, undefined); c.famKey = c.tactic.formation
  }
  const u = g.clubs[userClubId]
  u.manager = managerName
  Object.assign(u.tactic, { mentality: 2, pressing: 1, tempo: 1, width: 1, line: 1, passing: 1, tackling: 1, focus: 3, finalThird: 1, onLoss: 0, onWin: 0 })
  scheduleSeason(g, rng)
  g.rngState = rng.s
  initFinances(g); setObjective(g)
  { const r = new Rng(g.rngState); initStaff(g, r); g.rngState = r.s }
  initSquad(g, userClubId)
  news(g, {
    tag: 'club', clubId: userClubId, title: `${managerName} asume en ${u.name}`,
    body: `La dirigencia de ${u.name} presentó a ${managerName} como nuevo director técnico. Objetivo de la temporada: ${g.board.objective.toLowerCase()}. Hay US$ ${u.budget.toLocaleString('es-AR')} para refuerzos y el libro de pases está abierto hasta el 20 de febrero.`,
  })
  return g
}

/** Versión de la base: un hash del contenido (clubes y jugadores), no la fecha de construcción. Volver a correr `npm run db`
 *  sin cambios da la misma versión y no dispara `refreshDb`. Se calcula una vez, la primera vez que se pide. */
let dbHashMemo: number | undefined
export function dbHash(): number {
  if (dbHashMemo != null) return dbHashMemo
  const txt = db.start + JSON.stringify(db.clubs) + JSON.stringify(db.players)
  let h = 0x811c9dc5 // FNV-1a de 32 bits
  for (let i = 0; i < txt.length; i++) h = Math.imul(h ^ txt.charCodeAt(i), 0x01000193)
  return (dbHashMemo = h >>> 0)
}

/** Si la base de jugadores se actualizó después de crear la partida, trae puestos y atributos nuevos.
 *  Solo en la primera temporada, para no pisar la evolución de una carrera avanzada. Solo cuenta (y avisa) a los jugadores que
 *  de verdad cambiaron. En tu club respeta los contratos que negociaste: el sueldo se recalcula solo si sigue siendo el de la base. */
export function refreshDb(g: Game): number {
  const ver = dbHash()
  if (g.dbVersion === ver) return 0
  let n = 0
  const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i])
  // códigos y colores: las partidas viejas tienen códigos repetidos (los clásicos) y colores anteriores; valen en cualquier temporada
  const byName = new Map(Object.values(g.clubs).map(c => [c.name, c]))
  for (const d of db.clubs) {
    const c = byName.get(d.name)
    if (c) { c.code = d.code; c.colors = [...d.colors] as [string, string] }
  }
  if (g.season === Number(db.start.slice(0, 4))) for (const d of db.players) {
    const p = g.players[d.id]
    if (!p || p.name !== d.name) continue
    if (p.ca === d.ca && p.pa === d.pa && p.line === d.line && same(p.attrs, d.attrs) && same(p.positions, d.positions)) continue
    // sueldo de origen: el que le dio `newGame` con los datos viejos; si es otro, lo firmaste vos (renovación o pase)
    const negotiated = p.clubId === g.userClubId && p.wage !== valuation(p, db.start).wage
    const w = p.wage
    p.attrs = [...d.attrs]; p.ca = d.ca; p.pa = d.pa; p.positions = [...d.positions]; p.line = d.line
    Object.assign(p, valuation(p, g.date)); n++
    if (negotiated) p.wage = w
  }
  g.dbVersion = ver
  if (n) {
    for (const c of Object.values(g.clubs)) if (c.id !== g.userClubId) Object.assign(c.tactic, autoPick(g, c.id, c.tactic.formation))
    news(g, { tag: 'club', me: true, title: 'Base de jugadores actualizada', body: `Se actualizaron las valoraciones y los puestos de ${n} jugadores con los datos más recientes. Revisá tu once titular en Tácticas. Los contratos que firmaste se mantienen.` })
  }
  return n
}

// ---------- jugar partidos ----------
export const userFixtureToday = (g: Game) =>
  g.fixtures.find(f => f.date === g.date && !f.played && (f.home === g.userClubId || f.away === g.userClubId))
export const nextUserFixture = (g: Game) =>
  g.fixtures.find(f => !f.played && f.date >= g.date && (f.home === g.userClubId || f.away === g.userClubId))

function withRng<T>(g: Game, fn: (r: Rng) => T): T {
  const r = new Rng(g.rngState)
  const out = fn(r)
  g.rngState = r.s
  return out
}

export function createMatch(g: Game, f: Fixture, live: boolean): MatchSim {
  const userSide = f.home === g.userClubId ? 0 : f.away === g.userClubId ? 1 : null
  if (f.home !== g.userClubId) withRng(g, r => planMatch(g, f.home, f, r))
  else fixLineup(g, f.home)
  if (f.away !== g.userClubId) withRng(g, r => planMatch(g, f.away, f, r))
  else fixLineup(g, f.away)
  const seed = withRng(g, r => r.int(1, 2147483646))
  const boost: [number, number, number][] = [[1, 1, 1], [1, 1, 1]]
  const sp: [number, number] = [1, 1]
  if (userSide != null) { const m = mgrBoost(g.manager), e = trainEdge(g); boost[userSide] = [m[0] * e.att, m[1] * e.def, m[2] * harmonyBoost(g)]; sp[userSide] = e.sp }
  const importance = f.knockout || f.leg || isDerby(g.clubs[f.home], g.clubs[f.away]) ? 1 : 0
  const hc = g.clubs[f.home], derby = isDerby(hc, g.clubs[f.away])
  const crowd = f.neutral ? 0 : clamp(0.35 + hc.rep / 160, 0.2, 1) * (derby ? 1.15 : 1)
  const ref = withRng(g, r => ({ name: `${REF_N[r.int(0, REF_N.length - 1)]} ${REF_A[r.int(0, REF_A.length - 1)]}`, strict: 0.75 + r.next() * 0.55 }))
  return new MatchSim(g.clubs[f.home], g.clubs[f.away], g.players, { crowd, ref, seed, knockout: f.knockout, neutral: f.neutral, userSide: live ? userSide : null, boost, sp, importance, agg: aggFor(g, f) })
}

export function applyResult(g: Game, f: Fixture, res: MatchResult) {
  const isUser = f.home === g.userClubId || f.away === g.userClubId
  f.played = true; f.hg = res.hg; f.ag = res.ag; f.pens = res.pens; f.et = res.et; f.stats = res.stats
  f.events = isUser ? res.events : res.events.filter(e => ['goal', 'pen-goal', 'own', 'rc', 'yc2'].includes(e.type))
  if (isUser) { f.lines = res.lines; f.shots = res.shots; f.analysis = res.analysis }
  const hc = g.clubs[f.home]
  f.att = Math.round(hc.capacity * clamp(0.35 + hc.rep / 160 + (g.rngState % 100) / 500, 0.2, 1))
  if (!f.neutral) gateIncome(g, f.home, f.att)
  // familiaridad táctica: crece jugando con el mismo dibujo y cae al cambiarlo
  for (const cid of [f.home, f.away]) { const c = g.clubs[cid]; if (c.famKey === c.tactic.formation) c.fam = Math.min(100, c.fam + 4); else { c.famKey = c.tactic.formation; c.fam = Math.max(30, c.fam - 30) } }
  const played = new Set(res.lines.map(l => l.pid))
  // se cumplen las suspensiones pendientes
  for (const cid of [f.home, f.away]) for (const p of squadOf(g, cid)) if (p.susp > 0 && !played.has(p.id)) p.susp--
  const diff = [res.hg - res.ag, res.ag - res.hg]
  const win = res.pens ? [res.pens[0] > res.pens[1] ? 1 : -1, res.pens[1] > res.pens[0] ? 1 : -1] : diff.map(Math.sign)
  for (const l of res.lines) {
    const p = g.players[l.pid], s = p.stats
    if (l.started) s.apps++; else s.subs++
    s.mins += l.mins; s.goals += l.goals; s.ast += l.ast; s.yc += l.yc; s.rc += l.rc
    s.ratSum += l.rating; s.shots += l.shots; s.sot += l.sot; s.saves += l.saves
    if (l.pid === res.motm) s.motm++
    if (l.pos === 'GK' && l.mins >= 45) { const conc = l.side === 0 ? res.ag : res.hg; s.conc += conc; if (!conc) s.cs++ }
    p.cond = clamp(res.cond[l.pid] ?? p.cond, 20, 100)
    p.form = [...p.form, l.rating].slice(-5)
    const mot = p.clubId === g.userClubId ? (g.manager.attrs.mot - 10) * 0.15 : 0
    p.morale = clamp(p.morale + win[l.side] * 4 + (l.rating >= 7.5 ? 2 : l.rating < 6 ? -2 : 0) + 1 + mot, 5, 100)
    if (l.rc) { p.susp += l.yc >= 2 ? 1 : 2 }
    else if (l.yc) { p.ycAcc++; if (p.ycAcc >= 5) { p.ycAcc = 0; p.susp += 1 } }
  }
  for (const cid of [f.home, f.away]) {
    const side = cid === f.home ? 0 : 1
    for (const p of squadOf(g, cid)) if (!played.has(p.id)) p.morale = clamp(p.morale + win[side] * 1.5 - 0.4, 5, 100)
  }
  for (const inj of res.injuries) {
    const p = g.players[inj.pid]
    p.injury = { days: p.clubId === g.userClubId ? Math.max(1, Math.round(inj.days * docFactor(g))) : inj.days, desc: inj.desc }
    if (p.clubId === g.userClubId) news(g, { tag: 'lesion', clubId: p.clubId, pid: p.id, act: 'injury', title: `${p.name}, lesionado`, body: `${p.name} sufrió ${inj.desc} y estará fuera de las canchas unos ${inj.days} días.` })
  }
  if (isUser) {
    matchNews(g, f, res)
    const mins: Record<number, number> = {}
    for (const l of res.lines) mins[l.pid] = l.mins
    afterUserMatch(g, mins)
    learnFromMatch(g, res.lines.filter(l => g.players[l.pid]?.clubId !== g.userClubId).map(l => l.pid))
    const us = f.home === g.userClubId ? 0 : 1
    const pts = res.pens ? (res.pens[us] > res.pens[1 - us] ? 3 : 0) : diff[us] > 0 ? 3 : diff[us] === 0 ? 1 : 0
    if (!g.board.fired) boardAfterMatch(g, pts, g.clubs[g.userClubId].rep - g.clubs[us === 0 ? f.away : f.home].rep, us === 0 && !f.neutral)
  }
}

function matchNews(g: Game, f: Fixture, res: MatchResult) {
  const us = f.home === g.userClubId ? 0 : 1
  const me = g.clubs[g.userClubId], opp = g.clubs[us === 0 ? f.away : f.home]
  const gf = us === 0 ? res.hg : res.ag, gc = us === 0 ? res.ag : res.hg
  const won = res.pens ? res.pens[us] > res.pens[1 - us] : gf > gc
  const drew = !res.pens && gf === gc
  const scorers = res.lines.filter(l => l.side === us && l.goals).map(l => `${g.players[l.pid].name}${l.goals > 1 ? ` (${l.goals})` : ''}`)
  const star = g.players[res.motm]
  const title = won ? (gf - gc >= 3 ? `Goleada de ${me.short}: ${gf}-${gc} a ${opp.short}` : `${me.short} le ganó ${gf}-${gc} a ${opp.short}`)
    : drew ? `${me.short} y ${opp.short} repartieron puntos (${gf}-${gc})` : `${me.short} cayó ${gc}-${gf} ante ${opp.short}`
  const body = `${f.stage} · ${g.comps[f.comp].name}. ${us === 0 ? 'De local' : 'De visitante'}, el equipo de ${me.manager} ${won ? 'se quedó con la victoria' : drew ? 'no pudo pasar del empate' : 'sufrió una derrota'}`
    + `${res.pens ? ` en la definición por penales (${res.pens[us]}-${res.pens[1 - us]})` : ''}. `
    + (scorers.length ? `Goles: ${scorers.join(', ')}. ` : '')
    + `Remates ${res.stats.shots[us]}-${res.stats.shots[1 - us]}, posesión ${res.stats.poss[us]}%, xG ${res.stats.xg[us].toFixed(2).replace('.', ',')}-${res.stats.xg[1 - us].toFixed(2).replace('.', ',')}. `
    + `La figura fue ${star.name} (${g.clubs[star.clubId].short}).`
  news(g, { tag: 'partido', clubId: me.id, act: 'result', ref: f.id, pid: star?.id, title, body })
}

/** Los otros partidos del mismo torneo y del mismo día que el del usuario: se juegan en vivo a la par. */
export function sameRound(g: Game, f: Fixture): Fixture[] {
  return g.fixtures.filter(x => x.id !== f.id && !x.played && x.date === f.date && x.comp === f.comp)
}
function simFixture(g: Game, f: Fixture) { applyResult(g, f, createMatch(g, f, false).runToEnd()) }

// ---------- avance de fases ----------
const KO_NAMES = ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final']
const winnerOf = (f: Fixture) => (f.pens ? (f.pens[0] > f.pens[1] ? f.home : f.away) : f.hg > f.ag ? f.home : f.away)
const loserOf = (f: Fixture) => (winnerOf(f) === f.home ? f.away : f.home)

function progress(g: Game) {
  for (const comp of Object.values(g.comps)) {
    if (comp.phase === 'done') continue
    const fx = g.fixtures.filter(f => f.comp === comp.id)
    if (fx.some(f => !f.played)) continue
    if (isCup(comp.id)) progressCup(g, comp, fx)
    else if (comp.division === 1) progressLiga(g, comp, fx)
    else progressNacional(g, comp, fx)
  }
  g.fixtures.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
  if (!g.seasonOver && Object.values(g.comps).every(c => c.phase === 'done')) closeSeason(g)
}

function progressLiga(g: Game, comp: Competition, fx: Fixture[]) {
  const ex = comp.extra as any
  if (comp.phase === 'league') {
    const ta = zoneTable(g, comp.id, 1, 'A'), tb = zoneTable(g, comp.id, 1, 'B')
    const a = (n: number) => ta[n - 1].clubId, b = (n: number) => tb[n - 1].clubId
    const seeds: number[] = []
    for (let i = 0; i < SPOTS.ko; i++) { const x = ta[i], y = tb[i]; seeds.push(...(cmpRows(x, y) <= 0 ? [x.clubId, y.clubId] : [y.clubId, x.clubId])) }
    ex.seeds = seeds
    ex.bracket = [a(1), b(8), b(4), a(5), b(2), a(7), a(3), b(6), b(1), a(8), a(4), b(5), a(2), b(7), b(3), a(6)]
    comp.phase = 'ko'; comp.koRound = 0
    news(g, { tag: 'torneo', title: `${comp.name}: definidos los octavos de final`, body: `Terminó la fase de zonas. ${g.clubs[a(1)].name} ganó la Zona A y ${g.clubs[b(1)].name} la Zona B. Los ocho mejores de cada zona siguen en carrera por el título.` })
  } else {
    const round = fx.filter(f => f.knockout && f.round === 100 + comp.koRound)
    const winners = (ex.bracket as number[]).filter(id => round.some(f => winnerOf(f) === id))
    if (winners.length === 1) {
      const fin = round[0]
      comp.champion = winners[0]; comp.runnerUp = loserOf(fin); comp.phase = 'done'
      g.honours.push({ season: g.season, comp: comp.name, clubId: winners[0] })
      prize(g, winners[0], 1500000); prize(g, comp.runnerUp, 600000)
      if (winners[0] === g.userClubId) g.manager.titles.push(comp.name)
      news(g, { tag: 'torneo', clubId: winners[0], title: `¡${g.clubs[winners[0]].name}, campeón del ${comp.name}!`, body: `${g.clubs[winners[0]].name} venció a ${g.clubs[comp.runnerUp].name} ${fin.hg}-${fin.ag}${fin.pens ? ` (${fin.pens[0]}-${fin.pens[1]} en los penales)` : ''} en la final y se consagró campeón.` })
      return
    }
    ex.bracket = winners; comp.koRound++
  }
  const br = ex.bracket as number[], seeds = ex.seeds as number[]
  const isFinal = br.length === 2
  for (let i = 0; i < br.length; i += 2) {
    const [x, y] = seeds.indexOf(br[i]) < seeds.indexOf(br[i + 1]) ? [br[i], br[i + 1]] : [br[i + 1], br[i]]
    addFx(g, { comp: comp.id, stage: KO_NAMES[4 - Math.log2(br.length)], round: 100 + comp.koRound, date: ex.koDate, home: x, away: y, knockout: true, neutral: isFinal })
  }
  ex.koDate = addDays(ex.koDate, 7)
}

function progressNacional(g: Game, comp: Competition, fx: Fixture[]) {
  const ex = comp.extra as any
  const ta = zoneTable(g, 'PN', 2, 'A'), tb = zoneTable(g, 'PN', 2, 'B')
  // "Tabla General de Posiciones" del reglamento para cruces y localía: puesto en la zona, puntos, diferencia de gol, goles a favor
  const general = [...ta.map((r, i) => ({ r, i })), ...tb.map((r, i) => ({ r, i }))].sort((x, y) => x.i - y.i || cmpRows(x.r, y.r)).map(x => x.r.clubId)
  const rank = (id: number) => general.indexOf(id)
  const mk = (x: number, y: number, stage: string, neutral = false) => {
    const [h, a] = rank(x) <= rank(y) ? [x, y] : [y, x]
    addFx(g, { comp: 'PN', stage, round: 100 + comp.koRound, date: ex.koDate, home: h, away: a, knockout: true, neutral })
  }
  const round = fx.filter(f => f.knockout && f.round === 100 + comp.koRound)
  if (comp.phase === 'league') {
    comp.phase = 'ko'; comp.koRound = 0
    mk(ta[0].clubId, tb[0].clubId, 'Final por el ascenso', true)
    ex.down = [...ta.slice(-SPOTS.pnDown), ...tb.slice(-SPOTS.pnDown)].map(r => r.clubId)
    news(g, { tag: 'torneo', title: 'Descensos en la Primera Nacional', body: `Bajan a la tercera categoría ${ex.down.map((id: number) => g.clubs[id].name).join(', ')}.` })
    news(g, { tag: 'torneo', title: 'Primera Nacional: se viene la final por el ascenso', body: `${g.clubs[ta[0].clubId].name} y ${g.clubs[tb[0].clubId].name} ganaron sus zonas y definirán al campeón en cancha neutral.` })
  } else if (comp.koRound === 0) {
    const f = round[0]
    comp.champion = winnerOf(f); comp.runnerUp = loserOf(f)
    ex.promoted = [comp.champion]
    g.honours.push({ season: g.season, comp: comp.name, clubId: comp.champion })
    prize(g, comp.champion, 400000)
    if (comp.champion === g.userClubId) g.manager.titles.push(comp.name)
    news(g, { tag: 'torneo', clubId: comp.champion, title: `¡${g.clubs[comp.champion].name} es de Primera!`, body: `${g.clubs[comp.champion].name} le ganó la final a ${g.clubs[comp.runnerUp].name} y jugará en la Liga Profesional la próxima temporada. El segundo ascenso saldrá del Reducido.` })
    comp.koRound = 1
    mk(ta[1].clubId, tb[3].clubId, 'Reducido · Primera ronda'); mk(tb[1].clubId, ta[3].clubId, 'Reducido · Primera ronda'); mk(ta[2].clubId, tb[2].clubId, 'Reducido · Primera ronda')
  } else if (comp.koRound === 1) {
    const w = round.map(winnerOf).sort((x, y) => rank(x) - rank(y))
    comp.koRound = 2
    mk(comp.runnerUp!, w[2], 'Reducido · Semifinales'); mk(w[0], w[1], 'Reducido · Semifinales')
  } else if (comp.koRound === 2) {
    const w = round.map(winnerOf)
    comp.koRound = 3
    mk(w[0], w[1], 'Reducido · Final')
  } else {
    const w = winnerOf(round[0])
    ex.promoted = [...ex.promoted, w]
    comp.phase = 'done'
    news(g, { tag: 'torneo', clubId: w, title: `${g.clubs[w].name} ganó el Reducido y asciende`, body: `${g.clubs[w].name} se quedó con el segundo ascenso a la Liga Profesional.` })
    return
  }
  ex.koDate = addDays(ex.koDate, 7)
}

export function relegationZone(g: Game): number[] {
  const ann = annualTable(g)
  const last = ann[ann.length - 1].clubId
  const prom = promedios(g).filter(r => r.clubId !== last)
  return [last, prom[prom.length - 1].clubId]
}

function closeSeason(g: Game) {
  g.seasonOver = true
  const rel = relegationZone(g), pro = (g.comps.PN.extra as any).promoted as number[]
  ;(g.comps.PN.extra as any).relegated = rel
  const ann = annualTable(g)
  news(g, {
    tag: 'torneo', title: `Fin de la temporada ${g.season}`,
    body: `${g.clubs[ann[0].clubId].name} terminó primero en la tabla anual con ${ann[0].pts} puntos. Descienden ${g.clubs[rel[0]].name} (tabla anual) y ${g.clubs[rel[1]].name} (promedios). Ascienden ${pro.map(id => g.clubs[id].name).join(' y ')}.`,
  })
  computeQual(g)
  news(g, { tag: 'torneo', title: `Clasificados a las copas ${g.season + 1}`, body: `Copa Libertadores: ${g.qual!.lib.map(id => g.clubs[id].name).join(', ')}. Copa Sudamericana: ${g.qual!.sud.map(id => g.clubs[id].name).join(', ')}.` })
  // el balance va primero: las ofertas de fin de temporada miran la confianza y el prestigio que dejó la temporada
  const up3 = ((g.comps.T3?.extra as any)?.promoted ?? []) as number[], down3 = ((g.comps.PN.extra as any).down ?? []) as number[]
  seasonReview(g, [...rel, ...down3], [...pro, ...up3])
  withRng(g, r => seasonOffers(g, r))
  const top = Object.values(g.players).filter(p => g.clubs[p.clubId]?.division === 1).sort((a, b) => b.stats.goals - a.stats.goals)[0]
  if (top) news(g, { tag: 'premio', clubId: top.clubId, pid: top.id, title: `${top.name}, goleador de la temporada`, body: `El jugador de ${g.clubs[top.clubId].name} fue el máximo artillero de Primera con ${top.stats.goals} goles.` })
}

function seasonReview(g: Game, rel: number[], pro: number[]) {
  const c = g.clubs[g.userClubId], m = g.manager, b = g.board
  const pos = c.division === 1 ? annualTable(g).findIndex(r => r.clubId === c.id) + 1 : zoneTable(g, c.division === 3 ? 'T3' : 'PN', c.division, c.zone).findIndex(r => r.clubId === c.id) + 1
  const champ = Object.values(g.comps).filter(x => x.champion === c.id).length
  const ok = pos <= b.target || champ > 0 || pro.includes(c.id)
  b.confidence = clamp(b.confidence + (ok ? 15 : -Math.min(25, (pos - b.target) * 1.5)) + champ * 20 - (rel.includes(c.id) ? 30 : 0), 0, 100)
  m.rep = clamp(m.rep + (ok ? 4 : -2) + champ * 8 + (pro.includes(c.id) ? 6 : 0) - (rel.includes(c.id) ? 8 : 0), 5, 99)
  const note = champ ? 'Campeón' : pro.includes(c.id) ? 'Ascenso' : rel.includes(c.id) ? 'Descenso' : `${pos}.º ${c.division === 1 ? 'en la anual' : 'en la zona'}`
  closeCareerSeason(g, note)
  news(g, { tag: 'directiva', clubId: c.id, title: ok ? 'La dirigencia, conforme con la temporada' : 'La dirigencia esperaba más', body: `El objetivo era "${b.objective.toLowerCase()}" y ${c.name} terminó ${note.toLowerCase()}. ${ok ? 'La comisión directiva ratificó su confianza en el cuerpo técnico.' : 'El margen de error para la próxima temporada es menor.'}` })
}

// ---------- paso del tiempo ----------
function passDays(g: Game, n: number) {
  for (const p of Object.values(g.players)) {
    if (p.injury) { p.injury.days -= n; if (p.injury.days <= 0) p.injury = null }
    const cap = p.injury ? 85 : 100
    if (p.cond < cap) p.cond = Math.min(cap, p.cond + n * (3.8 + p.attrs[20] * 0.2))
    const mid = p.clubId === g.userClubId ? 67 + (g.manager.attrs.mot - 10) * 0.8 : 67
    if (p.morale > mid + 5) p.morale -= 0.3 * n; else if (p.morale < mid - 5) p.morale += 0.3 * n
  }
  dailyFinances(g, n)
  withRng(g, r => marketTick(g, n, r))
}

/** Al empezar cada día: el plantel y, los miércoles, la reserva (también si el día anterior jugaste vos). */
function nightSquad(g: Game, r: Rng) {
  dailySquad(g, r)
  if (new Date(g.date + 'T12:00:00Z').getUTCDay() === 3) weeklyReserve(g, r)
}

export type DayResult = 'day' | 'match' | 'press' | 'season'
const userPlayedOn = (g: Game, d: string) => g.fixtures.some(f => f.date === d && f.played && (f.home === g.userClubId || f.away === g.userClubId))

/** Avanza un día: se juegan los partidos de hoy, se entrena y pasa la noche. */
export function advanceDay(g: Game): DayResult {
  if (g.seasonOver || g.board.fired) return 'season'
  if (userFixtureToday(g)) return 'match'
  if (g.press) delegatePress(g) // si no contestaste, habla el ayudante
  for (const f of g.fixtures.filter(x => x.date === g.date && !x.played)) simFixture(g, f)
  progress(g)
  if (g.seasonOver || g.board.fired) return 'season'
  passDays(g, 1)
  if (!userPlayedOn(g, g.date)) withRng(g, r => dailyTraining(g, r, userPlayedOn(g, addDays(g.date, -1))))
  g.date = addDays(g.date, 1)
  dailyDeals(g) // al empezar el día: respuestas de los clubes, plazos y avisos del libro (no usa el azar de la partida)
  withRng(g, r => dayEvents(g, r))
  withRng(g, r => nightSquad(g, r))
  if (userFixtureToday(g)) return 'match'
  return g.press ? 'press' : 'day'
}
/** Avanza hasta el próximo partido. Se frena si hay una conferencia de prensa para responder. */
export function advanceToMatch(g: Game, stopOnPress = true): DayResult {
  for (let i = 0; i < 400; i++) {
    const r = advanceDay(g)
    if (r === 'match' || r === 'season' || (r === 'press' && stopOnPress)) return r
  }
  return 'day'
}
/** Para simulaciones sin interfaz: avanza hasta el partido y deja que el ayudante hable con la prensa. */
export function continueGame(g: Game) { advanceToMatch(g, false); if (g.press) delegatePress(g) }

/** Registra el partido del usuario, completa la jornada y pasa al día siguiente. */
export function finishUserMatch(g: Game, f: Fixture, res: MatchResult, others: { f: Fixture; res: MatchResult }[] = []) {
  if (g.press) delegatePress(g)
  applyResult(g, f, res)
  // los partidos del día que se siguieron en vivo se registran con el resultado que se vio
  for (const o of others) if (!o.f.played) applyResult(g, o.f, o.res)
  for (const x of g.fixtures.filter(x => x.date === g.date && !x.played)) simFixture(g, x)
  progress(g)
  if (g.seasonOver || g.board.fired) return
  g.press = makePostPress(g, f)
  if (g.delegate.press) delegatePress(g)
  passDays(g, 1)
  g.date = addDays(g.date, 1)
  dailyDeals(g)
  withRng(g, r => dayEvents(g, r))
  withRng(g, r => nightSquad(g, r))
}

// ---------- nueva temporada ----------
function develop(p: Player, age: number, rng: Rng, k = 1) {
  const pos = p.positions[0], w = POS_WEIGHTS[pos]
  const idx = w.map((_, i) => i).filter(i => w[i] > 0)
  if (age <= 24 && p.ca < p.pa) {
    const play = 0.6 + Math.min(1, p.stats.mins / 1500) * 0.7
    const gain = Math.min(p.pa - p.ca, (age <= 20 ? 4.5 : age <= 22 ? 3 : 1.5) * play * k * (0.6 + p.prof / 20) * (0.5 + rng.next()))
    // punto por punto: el que lo pasaría de su potencial no se suma y ahí termina el crecimiento del año
    for (let n = Math.round(gain * 2.6); n > 0; n--) {
      const i = rng.weighted(idx, k => w[k])
      if (p.attrs[i] >= 20) continue
      p.attrs[i]++
      if (Math.round(rawRating(p.attrs, pos)) > p.pa) { p.attrs[i]--; break }
    }
    p.ca = Math.round(rawRating(p.attrs, pos))
  } else if (age >= 31) {
    for (const i of [18, 19, 20, 22]) if (rng.chance(0.3 + (age - 31) * 0.1)) p.attrs[i] = Math.max(1, p.attrs[i] - 1)
    if (age >= 34) for (let n = 2; n > 0; n--) { const i = rng.pick(idx); p.attrs[i] = Math.max(1, p.attrs[i] - 1) }
    p.ca = Math.round(rawRating(p.attrs, pos))
    p.pa = Math.max(p.pa, p.ca)
  } else p.ca = Math.round(rawRating(p.attrs, pos))
}

// ---------- reputación de los clubes ----------
/** Regla única de la reputación por resultados (al empezar la temporada siguiente): cada logro suma `REP_STEP` y el resultado
 *  queda dentro del rango de la categoría en la que el club va a jugar (`REP_RANGE`, piso y techo). Los logros más grandes empujan
 *  más (la Libertadores suma 4 con el título, un torneo local 1), pero nadie pasa el techo de su categoría. Un logro nunca baja la
 *  reputación ni un descenso la sube: si ya estaba fuera del rango (un grande que desciende), solo se mueve hacia adentro. */
export const REP_RANGE: Record<number, [number, number]> = { 0: [40, 97], 1: [40, 97], 2: [40, 80], 3: [38, 62] }
export const REP_STEP = { up: 3, down: -3, title: 1, SUD: 2, LIB: 4 }
export function bumpRep(c: Club, delta: number) {
  const [lo, hi] = REP_RANGE[c.division] ?? REP_RANGE[1]
  c.rep = delta >= 0 ? Math.max(c.rep, Math.min(hi, c.rep + delta)) : Math.min(c.rep, Math.max(lo, c.rep + delta))
}

export function startNewSeason(g: Game) {
  if (!g.seasonOver) return
  const rng = new Rng(g.rngState)
  const ann = new Map(annualTable(g).map(r => [r.clubId, r]))
  for (const c of Object.values(g.clubs)) {
    const r = ann.get(c.id)
    if (r) c.avgHist = [...c.avgHist, { season: g.season, pts: r.pts, pj: r.pj }].slice(-2)
  }
  const ex = g.comps.PN.extra as any
  const rel = ex.relegated as number[], pro = ex.promoted as number[]
  // Primera Nacional ↔ tercera categoría
  const down3 = (ex.down ?? []) as number[], up3 = ((g.comps.T3?.extra as any)?.promoted ?? []) as number[]
  down3.forEach((id, i) => {
    const d = g.clubs[id], u = g.clubs[up3[i]]
    if (!u) return
    const z = d.zone
    d.division = 3; d.zone = u.zone; u.division = 2; u.zone = z
    bumpRep(d, REP_STEP.down); bumpRep(u, REP_STEP.up)
  })
  rel.forEach((id, i) => {
    const down = g.clubs[id], up = g.clubs[pro[i]]
    const z = down.zone
    down.division = 2; down.zone = up.zone; down.avgHist = []
    up.division = 1; up.zone = z; up.avgHist = []
    bumpRep(down, REP_STEP.down); bumpRep(up, REP_STEP.up)
  })
  // los títulos se cuentan después de los ascensos y descensos: el techo es el de la categoría en la que el club juega el año que viene
  for (const comp of Object.values(g.comps)) if (comp.champion) bumpRep(g.clubs[comp.champion], REP_STEP[comp.id as 'LIB' | 'SUD'] ?? REP_STEP.title)
  g.season++
  g.date = `${g.season}-01-10`
  expireSeasonJobs(g)
  // los del DT que estaban en la lista y quieren irse: al vaciarla, su pedido vuelve (el aviso sale después de `seasonTurnover`)
  const relist = squadOf(g, g.userClubId).filter(p => p.listed && p.wantsOut).map(p => p.id)
  for (const p of Object.values(g.players)) {
    p.history.push({ season: g.season - 1, clubId: p.clubId, stats: p.stats })
    develop(p, ageOn(p.birth, g.date), rng, p.clubId === g.userClubId ? 1 + (g.manager.attrs.you - 10) * 0.04 : 1)
    p.stats = emptyStats()
    p.cond = 100; p.injury = null; p.susp = 0; p.ycAcc = 0; p.form = []; p.morale = 70
    p.listed = false; p.ups = 0
    if (p.promiseLog) p.promiseLog = p.promiseLog.filter(x => !x.result) // el registro es de la temporada: queda solo la promesa vigente
  }
  seasonTurnover(g, rng)
  // la lista vaciada reabre el pedido de los que querían irse: si siguen en el plantel (no se retiraron, no se fueron libres ni volvieron
  // de un préstamo en `seasonTurnover`), un mensaje nuevo dice por qué volvió a "Para decidir" (nace sin leer; es el más nuevo de `out<pid>`)
  for (const pid of relist) {
    const p = g.players[pid]
    if (p?.clubId === g.userClubId && p.wantsOut && !p.listed) news(g, { tag: 'club', clubId: g.userClubId, pid, act: 'out', title: `${p.name} sigue queriendo irse`, body: `Con la nueva temporada se vació la lista de transferibles y ${p.name} sigue queriendo irse. Podés responderle desde este mensaje.` })
  }
  // el valor se actualiza para todos; el sueldo solo en los clubes de la IA: en el tuyo manda el contrato firmado (también el de los juveniles)
  for (const p of Object.values(g.players)) { const w = p.wage; Object.assign(p, valuation(p, g.date)); if (p.clubId === g.userClubId) p.wage = w }
  g.offers = []
  for (const st of g.staff) if (st.clubId === g.userClubId && st.contractEnd < g.season) st.contractEnd = g.season + 1
  { const r = new Rng(g.rngState); refreshPool(g, r); g.rngState = r.s }
  initSquad(g, g.userClubId)
  g.press = null; g.training.reportFor = undefined; g.training.pressFor = undefined
  g.fixtures = []; g.comps = {}; g.seasonOver = false
  for (const c of Object.values(g.clubs)) if (c.id !== g.userClubId) c.tactic.formation = bestFormation(g, c.id, rng)
  scheduleSeason(g, rng)
  g.rngState = rng.s
  fixLineup(g, g.userClubId)
  setObjective(g)
  g.board.confidence = clamp(g.board.confidence * 0.6 + 24, 0, 100)
  news(g, { tag: 'torneo', title: `Arranca la temporada ${g.season}`, body: `Ya está el fixture del ${g.comps.AP.name} y de la ${g.comps.PN.name}.` })
}
