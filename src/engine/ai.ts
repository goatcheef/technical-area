// El cerebro de los entrenadores rivales: plan para cada partido, rotación y entrenamiento semanal.
import { autoPick, available, squadOf } from './game'
import { FORMATIONS, FORMATION_NAMES, POS_LINE, POS_WEIGHTS, ageOn, bestRole, fixRoles, posRating, rawRating } from './positions'
import { Rng, clamp } from './rng'
import { A, type Club, type Fixture, type Game, type Player, type Tactic } from './types'

type Style = Pick<Tactic, 'pressing' | 'tempo' | 'width' | 'line' | 'passing' | 'tackling' | 'finalThird' | 'onLoss' | 'onWin'>
const STYLE_KEYS: (keyof Style)[] = ['pressing', 'tempo', 'width', 'line', 'passing', 'tackling', 'finalThird', 'onLoss', 'onWin']
/** La identidad del club: sus instrucciones de base, que se conservan entre partidos. */
export function styleOf(c: Club): Style {
  c.style ??= Object.fromEntries(STYLE_KEYS.map(k => [k, c.tactic[k]])) as Style
  return c.style as Style
}

/** Fuerza del once que pondría un club (0-100), teniendo en cuenta el físico de hoy. */
function xiStrength(g: Game, clubId: number, formation: string, lineup?: number[]): { str: number; lineup: number[] } {
  const lu = lineup ?? autoPick(g, clubId, formation).lineup
  const slots = FORMATIONS[formation]
  let s = 0
  lu.forEach((id, i) => { const p = g.players[id]; if (p) s += posRating(p, slots[i].pos) * (0.8 + 0.2 * p.cond / 100) })
  return { str: s / 11, lineup: lu }
}

/** ¿El club tiene otro partido a menos de cuatro días, antes o después de este? */
function congested(g: Game, clubId: number, f: Fixture): Fixture | undefined {
  const t = Date.parse(f.date)
  return g.fixtures.find(x => x.id !== f.id && (x.home === clubId || x.away === clubId) && Math.abs(Date.parse(x.date) - t) <= 3.5 * 86400000)
}
/** Qué tan importante es el partido para el club (0 = trámite, 2 = decisivo). */
function importance(g: Game, f: Fixture): number {
  if (f.knockout || f.leg) return 2
  if (f.comp === 'LIB' || f.comp === 'SUD') return 1.5
  if (f.comp === 'CA') return 1
  return 1.2
}

/** Elige once y banco: con calendario cargado, guarda a los cansados para el partido que más le importa. */
function pickWithRotation(g: Game, c: Club, formation: string, rotate: boolean) {
  if (!rotate) return autoPick(g, c.id, formation)
  const saved: [Player, number][] = []
  for (const p of squadOf(g, c.id)) if (available(p) && p.cond < 88) { saved.push([p, p.cond]); p.cond = Math.max(20, p.cond - 25) }
  const pick = autoPick(g, c.id, formation)
  for (const [p, v] of saved) p.cond = v
  return pick
}

/** Plan de partido de un DT de la IA. Modifica la táctica del club. */
export function planMatch(g: Game, clubId: number, f: Fixture, rng: Rng) {
  const c = g.clubs[clubId], oppId = f.home === clubId ? f.away : f.home, o = g.clubs[oppId]
  const st = styleOf(c), t = c.tactic
  const home = f.home === clubId && !f.neutral
  // rotación: si hay otro partido cerca y este importa menos que el otro
  const other = congested(g, clubId, f)
  const rotate = !!other && importance(g, f) < importance(g, other) && rng.chance(0.75)
  // fuerza propia y del rival
  const mine = xiStrength(g, clubId, t.formation, pickWithRotation(g, c, t.formation, rotate).lineup)
  const theirs = xiStrength(g, oppId, o.tactic.formation, oppId === g.userClubId ? o.tactic.lineup.filter(id => g.players[id] && available(g.players[id])).slice(0, 11) : undefined)
  const diff = mine.str - theirs.str + (home ? 2 : f.neutral ? 0 : -2)
  // dibujo: el que mejor le queda al plantel; contra un rival superior prefiere uno más defensivo si no pierde mucho
  let formation = t.formation
  if (diff <= -4) {
    const cands = ['5-3-2', '4-1-4-1', '4-4-1-1', '4-2-3-1'].map(fm => ({ fm, s: xiStrength(g, clubId, fm).str }))
    const best = cands.sort((a, b) => b.s - a.s)[0]
    if (best.s >= mine.str - 1.5) formation = best.fm
  }
  const pick = pickWithRotation(g, c, formation, rotate)
  t.formation = formation
  t.lineup = pick.lineup; t.bench = pick.bench
  t.roles = FORMATIONS[formation].map((sl, i) => (g.players[pick.lineup[i]] ? bestRole(g.players[pick.lineup[i]], sl.pos) : fixRoles(formation, undefined)[i]))
  Object.assign(t, st)
  // mentalidad y planteo según la diferencia
  if (diff >= 6) { t.mentality = 3; t.pressing = Math.max(st.pressing, 1) + (rng.chance(0.5) ? 1 : 0); t.line = Math.max(st.line, 1) }
  else if (diff >= 2) t.mentality = home ? 3 : 2
  else if (diff > -3) t.mentality = 2
  else if (diff > -7) { t.mentality = 1; t.line = Math.min(st.line, 1); t.onWin = 1 }
  else { t.mentality = home ? 1 : 0; t.line = 0; t.pressing = Math.min(st.pressing, 1); t.onWin = 1 }
  t.pressing = clamp(t.pressing, 0, 2)
  // si los delanteros rivales son mucho más rápidos que sus centrales, no adelanta la línea
  const oFw = theirs.lineup.map(id => g.players[id]).filter(p => p && POS_LINE[p.positions[0]] === 'FW')
  const myDc = pick.lineup.map(id => g.players[id]).filter(p => p && p.positions[0] === 'DC')
  const pace = (ps: Player[]) => (ps.length ? ps.reduce((s, p) => s + p.attrs[A.pac] + p.attrs[A.acc], 0) / ps.length : 24)
  if (pace(oFw) - pace(myDc) >= 4) t.line = Math.min(t.line, 0)
  // atacar el lateral más flojo del rival
  const oSlots = FORMATIONS[o.tactic.formation]
  const fbs = theirs.lineup.map((id, i) => ({ p: g.players[id], pos: oSlots[i]?.pos })).filter(x => x.p && (x.pos === 'DR' || x.pos === 'DL'))
  if (fbs.length === 2 && rng.chance(0.7)) {
    const [a, b] = fbs.map(x => posRating(x.p, x.pos!))
    if (Math.abs(a - b) >= 4) { const weak = a < b ? fbs[0] : fbs[1]; t.focus = weak.pos === 'DR' ? 0 : 2 } else t.focus = 3
  } else t.focus = 3
  // contra un rival muy superior, marca personal a su figura
  t.oppo = {}
  t.manMark = null
  if (diff <= -5 && rng.chance(0.6)) {
    const star = theirs.lineup.map(id => g.players[id]).filter(p => p && (POS_LINE[p.positions[0]] === 'FW' || p.positions[0] === 'AMC')).sort((a, b) => b.ca - a.ca)[0]
    const marker = pick.lineup.map(id => g.players[id]).filter(p => p && (p.positions[0] === 'DM' || p.positions[0] === 'DC')).sort((a, b) => (b.attrs[A.mar] + b.attrs[A.tck]) - (a.attrs[A.mar] + a.attrs[A.tck]))[0]
    if (star && marker) t.manMark = { by: marker.id, target: star.id }
  }
  // al rival de presión alta se le sale largo si hay un nueve que la aguante
  if (o.tactic.pressing === 2 && pick.lineup.some(id => g.players[id] && g.players[id].attrs[A.hea] + g.players[id].attrs[A.str] >= 28)) t.passing = 2
}

/** Una vez por semana: los planteles de la IA también entrenan (intensidad normal). */
export function weeklyAiTraining(g: Game, rng: Rng) {
  for (const p of Object.values(g.players)) {
    if (p.clubId === g.userClubId || p.injury) continue
    const age = ageOn(p.birth, g.date)
    if (age > 30) continue
    const ageF = age <= 19 ? 1.8 : age <= 21 ? 1.5 : age <= 23 ? 1.15 : age <= 26 ? 0.6 : 0.3
    p.tx = (p.tx ?? 0) + 6 * 0.007 * ageF * (0.55 + p.prof / 20) * (p.ca < p.pa ? 1 : 0.15)
    if (p.tx < 1) continue
    p.tx -= 1
    const pos = p.positions[0], w = POS_WEIGHTS[pos]
    const idx = w.map((_, i) => i).filter(i => w[i] > 0 && p.attrs[i] < 20)
    if (!idx.length) continue
    const i = rng.weighted(idx, j => (21 - p.attrs[j]) * (1 + w[j]))
    p.attrs[i]++
    p.ca = Math.round(rawRating(p.attrs, pos)); p.pa = Math.max(p.pa, p.ca)
  }
}
export { FORMATION_NAMES }
