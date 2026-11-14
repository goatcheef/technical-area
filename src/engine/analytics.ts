// Centro de datos: rendimiento de equipos, jugadores y liga a partir de los partidos jugados. Solo lectura.
import { squadOf } from './game'
import { ageOn } from './positions'
import type { Fixture, Game, Player, Pos } from './types'

const GOAL = new Set(['goal', 'pen-goal', 'own'])
export const sideOf = (f: Fixture, clubId: number): 0 | 1 => (f.home === clubId ? 0 : 1)
export const playedBy = (g: Game, clubId: number) => g.fixtures.filter(f => f.played && (f.home === clubId || f.away === clubId)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const resOf = (f: Fixture, s: 0 | 1) => {
  const gf = s === 0 ? f.hg : f.ag, gc = s === 0 ? f.ag : f.hg
  if (f.pens) return f.pens[s] > f.pens[1 - s] ? 'G' : 'P'
  return gf > gc ? 'G' : gf < gc ? 'P' : 'E'
}
const LEAGUE = new Set(['AP', 'CL', 'PN', 'T3'])

export interface MatchRow { f: Fixture; opp: number; home: boolean; gf: number; gc: number; xg: number; xga: number; res: 'G' | 'E' | 'P'; pts: number; poss: number; shots: number; shotsA: number }
/** Los partidos de un club con sus números, en orden. */
export function matchRows(g: Game, clubId: number): MatchRow[] {
  return playedBy(g, clubId).map(f => {
    const s = sideOf(f, clubId), o = (1 - s) as 0 | 1, st = f.stats
    const res = resOf(f, s) as 'G' | 'E' | 'P'
    return {
      f, opp: s === 0 ? f.away : f.home, home: s === 0 && !f.neutral, gf: s === 0 ? f.hg : f.ag, gc: s === 0 ? f.ag : f.hg,
      xg: st?.xg[s] ?? 0, xga: st?.xg[o] ?? 0, res, pts: LEAGUE.has(f.comp) && !f.knockout ? (res === 'G' ? 3 : res === 'E' ? 1 : 0) : 0,
      poss: st?.poss[s] ?? 50, shots: st?.shots[s] ?? 0, shotsA: st?.shots[o] ?? 0,
    }
  })
}

export interface TeamSummary { pj: number; ppg: number; xg: number; xga: number; gf: number; gc: number; poss: number; shots: number; finishing: number }
export function summary(rows: MatchRow[]): TeamSummary {
  const n = Math.max(1, rows.length), lg = rows.filter(r => LEAGUE.has(r.f.comp) && !r.f.knockout)
  const sum = (k: (r: MatchRow) => number) => rows.reduce((s, r) => s + k(r), 0)
  return {
    pj: rows.length, ppg: lg.length ? lg.reduce((s, r) => s + r.pts, 0) / lg.length : 0,
    xg: sum(r => r.xg) / n, xga: sum(r => r.xga) / n, gf: sum(r => r.gf) / n, gc: sum(r => r.gc) / n,
    poss: sum(r => r.poss) / n, shots: sum(r => r.shots) / n, finishing: sum(r => r.gf - r.xg),
  }
}

/** Goles a favor y en contra por tramo de 15 minutos (el último incluye el descuento). */
export function goalsByBin(g: Game, clubId: number): { gf: number[]; gc: number[] } {
  const gf = [0, 0, 0, 0, 0, 0], gc = [0, 0, 0, 0, 0, 0]
  for (const f of playedBy(g, clubId)) {
    const s = sideOf(f, clubId)
    for (const e of f.events ?? []) {
      if (!GOAL.has(e.type) || (e.min > 90 && f.et)) continue
      const b = Math.min(5, Math.floor((Math.max(1, e.min) - 1) / 15))
      ;(e.side === s ? gf : gc)[b]++
    }
  }
  return { gf, gc }
}

/** Peligro por sector y pérdidas por fase, sumados en la temporada (solo partidos del usuario: tienen análisis). */
export function sectors(g: Game, clubId: number) {
  const att = [0, 0, 0], xg = [0, 0, 0], xgA = [0, 0, 0], lost = [0, 0, 0], lostOpp = [0, 0, 0]
  let n = 0
  for (const f of playedBy(g, clubId)) {
    if (!f.analysis) continue
    n++
    const s = sideOf(f, clubId), me = f.analysis[s], op = f.analysis[1 - s]
    for (let i = 0; i < 3; i++) {
      att[i] += me.att[i]; xg[i] += me.xg[i]; lost[i] += me.lost[i]; lostOpp[i] += op.lost[i]
      xgA[2 - i] += op.xg[i] // la izquierda del ataque rival es la derecha de tu defensa
    }
  }
  return { n, att, xg, xgA, lost, lostOpp }
}

/** Puntos acumulados por fecha de liga, del club y del líder de su tabla. */
export function pointsRace(g: Game, clubId: number, leaderId: number) {
  const run = (id: number) => { let p = 0; return matchRows(g, id).filter(r => r.f.comp === compOf(g, clubId) && !r.f.knockout).map(r => (p += r.pts)) }
  return { me: run(clubId), leader: run(leaderId) }
}
export const compOf = (g: Game, clubId: number) => {
  const c = g.clubs[clubId]
  return c.division === 1 ? (g.comps.AP?.phase === 'done' && g.comps.CL ? 'CL' : 'AP') : c.division === 3 ? 'T3' : 'PN'
}

// ---------- liga ----------
export interface LeagueRow extends TeamSummary { clubId: number; pts: number; xgd: number }
export function leagueRows(g: Game, division: number): LeagueRow[] {
  return Object.values(g.clubs).filter(c => c.division === division).map(c => {
    const rows = matchRows(g, c.id).filter(r => LEAGUE.has(r.f.comp) && !r.f.knockout)
    const s = summary(rows)
    return { ...s, clubId: c.id, pts: rows.reduce((t, r) => t + r.pts, 0), xgd: s.xg - s.xga }
  }).filter(r => r.pj > 0)
}
/** Goles de toda la categoría por tramo de 15 minutos. */
export function leagueBins(g: Game, division: number): number[] {
  const b = [0, 0, 0, 0, 0, 0]
  for (const f of g.fixtures) {
    if (!f.played || !LEAGUE.has(f.comp) || g.clubs[f.home]?.division !== division) continue
    for (const e of f.events ?? []) if (GOAL.has(e.type) && !(e.min > 90 && f.et)) b[Math.min(5, Math.floor((Math.max(1, e.min) - 1) / 15))]++
  }
  return b
}

// ---------- jugadores ----------
export interface PlayerUse {
  p: Player; apps: number; mins: number; rat: number; ratings: number[]; ga90: number
  byPos: { pos: Pos; n: number; rat: number }[]; last5: number[]; mins30: number; risk: boolean
}
/** Uso y rendimiento de cada jugador del plantel según los partidos jugados con el usuario. */
export function playerUse(g: Game, clubId: number): PlayerUse[] {
  const fx = playedBy(g, clubId).filter(f => f.lines)
  const last5 = fx.slice(-5), since = new Date(Date.parse(g.date) - 30 * 86400000).toISOString().slice(0, 10)
  return squadOf(g, clubId).map(p => {
    const ls = fx.map(f => f.lines!.find(l => l.pid === p.id)).filter(Boolean) as NonNullable<Fixture['lines']>
    const mins = ls.reduce((s, l) => s + l.mins, 0)
    const pos = new Map<Pos, { n: number; r: number }>()
    for (const l of ls) { const x = pos.get(l.pos) ?? { n: 0, r: 0 }; x.n++; x.r += l.rating; pos.set(l.pos, x) }
    const mins30 = fx.filter(f => f.date >= since).reduce((s, f) => s + (f.lines!.find(l => l.pid === p.id)?.mins ?? 0), 0)
    const age = ageOn(p.birth, g.date)
    return {
      p, apps: ls.length, mins, rat: ls.length ? ls.reduce((s, l) => s + l.rating, 0) / ls.length : 0,
      ratings: ls.slice(-8).map(l => l.rating),
      ga90: mins ? ((ls.reduce((s, l) => s + l.goals + l.ast, 0)) * 90) / mins : 0,
      byPos: [...pos].map(([k, v]) => ({ pos: k, n: v.n, rat: v.r / v.n })).sort((a, b) => b.n - a.n),
      last5: last5.map(f => f.lines!.find(l => l.pid === p.id)?.mins ?? 0),
      // una semana normal es un partido: el riesgo aparece con partidos entre semana y el físico sin recuperar
      mins30, risk: (p.cond < 75 && mins30 >= 420) || (age >= 32 && p.cond < 85 && mins30 >= 450),
    }
  })
}
