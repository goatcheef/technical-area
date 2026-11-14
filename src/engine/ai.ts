// El cerebro de los entrenadores rivales: plan para cada partido, rotación y entrenamiento semanal.
import { autoPick, available, squadOf } from './game'
import { FORMATIONS, FORMATION_NAMES, POS_LINE, POS_WEIGHTS, ageOn, bestRole, fixRoles, posRating, rawRating } from './positions'
import { Rng, clamp } from './rng'
import { addProgress } from './week'
import { A, type Club, type Fixture, type Game, type Player, type Tactic } from './types'

type Style = Pick<Tactic, 'pressing' | 'tempo' | 'width' | 'line' | 'passing' | 'tackling' | 'finalThird' | 'onLoss' | 'onWin'>
const STYLE_KEYS: (keyof Style)[] = ['pressing', 'tempo', 'width', 'line', 'passing', 'tackling', 'finalThird', 'onLoss', 'onWin']
/** Instrucciones de base del club, sin guardarlas. */
function baseStyle(c: Club): Style {
  return Object.fromEntries(STYLE_KEYS.map(k => [k, c.style?.[k] ?? c.tactic[k]])) as Style
}
/** La identidad del club: sus instrucciones de base, que se conservan entre partidos. */
export function styleOf(c: Club): Style {
  c.style ??= baseStyle(c)
  return baseStyle(c)
}
/** Dibujo de identidad del club. Si la táctica cambió fuera de un partido (el dibujo de la temporada nueva), ese pasa a ser el de base. */
function identityFormation(c: Club): string {
  const t = c.tactic.formation, id = c.style?.formation
  if (id && FORMATIONS[id] && !(c.famKey && t !== c.famKey && FORMATIONS[t])) return id
  return FORMATIONS[t] ? t : '4-4-2'
}
/** Dibujos para meterse atrás contra un rival superior. */
const DEF_FORMS = ['5-3-2', '4-1-4-1', '4-4-1-1', '4-2-3-1']

/** Fuerza del once que pondría un club (0-100), teniendo en cuenta el físico de hoy. */
function xiStrength(g: Game, clubId: number, formation: string, lineup?: number[]): { str: number; lineup: number[] } {
  const lu = lineup ?? autoPick(g, clubId, formation).lineup
  const slots = FORMATIONS[formation]
  let s = 0
  lu.forEach((id, i) => { const p = g.players[id]; if (p) s += posRating(p, slots[i].pos) * (0.8 + 0.2 * p.cond / 100) })
  return { str: s / 11, lineup: lu }
}

/** El partido por jugar más importante que el club tiene a menos de cuatro días después de este. */
function congested(g: Game, clubId: number, f: Fixture): Fixture | undefined {
  const t = Date.parse(f.date)
  let out: Fixture | undefined
  for (const x of g.fixtures) {
    if (x.played || x.id === f.id || (x.home !== clubId && x.away !== clubId)) continue
    const d = Date.parse(x.date) - t
    if (d > 0 && d <= 3.5 * 86400000 && (!out || importance(g, x) > importance(g, out))) out = x
  }
  return out
}
/** El próximo partido del club después de este. */
function nextFixture(g: Game, clubId: number, f: Fixture): Fixture | undefined {
  let out: Fixture | undefined
  for (const x of g.fixtures) if (!x.played && x.id !== f.id && (x.home === clubId || x.away === clubId) && x.date > f.date && (!out || x.date < out.date)) out = x
  return out
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

/** Azar propio de cada club en cada partido: el plan previsto días antes y el del día salen de las mismas decisiones. */
function planRng(g: Game, clubId: number, f: Fixture): Rng {
  const r = new Rng((g.seed ^ Math.imul(f.id + 1, 0x9e3779b1) ^ Math.imul(clubId + 1, 0x85ebca6b) ^ Math.imul(g.season, 0xc2b2ae35)) >>> 0)
  r.next(); r.next()
  return r
}

/** Arma el plan de partido de un club de la IA sin modificar nada. `ot` es lo que sabe de la táctica del rival. */
function makePlan(g: Game, clubId: number, f: Fixture, ot: Tactic): { tactic: Tactic; identity: string } {
  const rng = planRng(g, clubId, f)
  const c = g.clubs[clubId], oppId = f.home === clubId ? f.away : f.home
  const st = baseStyle(c), t: Tactic = { ...c.tactic }
  const home = f.home === clubId && !f.neutral
  // rotación: si hay otro partido cerca y este importa menos que el otro
  const other = congested(g, clubId, f)
  const rotate = !!other && importance(g, f) < importance(g, other) && rng.chance(0.75)
  // fuerza propia (con el mismo criterio de rotación para cada dibujo) y del rival
  const picks: Record<string, { pick: ReturnType<typeof autoPick>; str: number }> = {}
  const tryF = (fm: string) => {
    if (!picks[fm]) { const pick = pickWithRotation(g, c, fm, rotate); picks[fm] = { pick, str: xiStrength(g, clubId, fm, pick.lineup).str } }
    return picks[fm]
  }
  const cur = FORMATIONS[t.formation] ? t.formation : '4-4-2', identity = identityFormation(c)
  const mine = tryF(cur)
  const theirs = xiStrength(g, oppId, ot.formation, oppId === g.userClubId ? ot.lineup.filter(id => g.players[id] && available(g.players[id])).slice(0, 11) : undefined)
  const diff = mine.str - theirs.str + (home ? 2 : f.neutral ? 0 : -2)
  // dibujo: el de identidad del club; contra un rival superior, uno más defensivo si no pierde mucho.
  // Cambiar de dibujo cuesta familiaridad (30 puntos que tardan varias fechas en volver), y cambiar para un solo
  // partido es pagarla dos veces: se mete atrás contra un rival muy superior o si el siguiente también lo es, y
  // vuelve a su dibujo cuando el rival ya no es mejor (o es apenas mejor) y el siguiente no lo pide.
  let nd: number | undefined
  const nextDiff = () => nd ??= (() => {
    const nx = nextFixture(g, clubId, f)
    if (!nx) return 0
    const nid = nx.home === clubId ? nx.away : nx.home
    return mine.str - xiStrength(g, nid, g.clubs[nid].tactic.formation).str + (nx.neutral ? 0 : nx.home === clubId ? 2 : -2)
  })()
  const defNow = cur !== identity && DEF_FORMS.includes(cur)
  let formation = identity
  if (diff <= -4 && (defNow || diff <= -7 || nextDiff() <= -4)) {
    const famF = c.famKey || cur
    const famCost = (fm: string) => (fm === famF ? 0 : 1 + mine.str * 0.0009 * clamp(c.fam - 30, 0, 30)) // aun con la familiaridad en el piso, un dibujo nuevo cuesta
    const defBonus = Math.min(3, (-diff - 2) * 0.75)
    let bs = -Infinity
    for (const fm of new Set([identity, cur, ...DEF_FORMS])) {
      const s = tryF(fm).str - famCost(fm) + (fm === identity ? 0.25 : DEF_FORMS.includes(fm) ? defBonus : 0)
      if (s > bs) { bs = s; formation = fm }
    }
  } else if (defNow && (diff <= 0 || (diff <= 3 && nextDiff() <= -4))) formation = cur
  const pick = tryF(formation).pick
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
  const oSlots = FORMATIONS[ot.formation]
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
  if (ot.pressing === 2 && pick.lineup.some(id => g.players[id] && g.players[id].attrs[A.hea] + g.players[id].attrs[A.str] >= 28)) t.passing = 2
  return { tactic: t, identity }
}

/** Táctica de cada club antes de que se planificara el partido en curso: los dos lados planifican con la misma información. */
let lastPlan: { fid: number; clubId: number; before: Tactic } | null = null

/** Plan de partido de un DT de la IA. Modifica la táctica del club. El azar sale del partido y del club (ver `planRng`). */
export function planMatch(g: Game, clubId: number, f: Fixture, _rng?: Rng) {
  const c = g.clubs[clubId], oppId = f.home === clubId ? f.away : f.home
  // si el rival ya planificó este partido, se mira la táctica que tenía antes, como la vio él
  const ot = lastPlan && lastPlan.fid === f.id && lastPlan.clubId === oppId ? lastPlan.before : g.clubs[oppId].tactic
  lastPlan = { fid: f.id, clubId, before: { ...c.tactic } }
  const { tactic, identity } = makePlan(g, clubId, f, ot)
  styleOf(c)
  c.style!.formation = identity
  Object.assign(c.tactic, tactic)
}

/** El plan que haría la IA de `clubId` para ese partido contra `vsClubId`, sin modificar nada (para el informe del rival). */
export function predictPlan(g: Game, clubId: number, vsClubId: number, f: Fixture): Tactic {
  return makePlan(g, clubId, f, g.clubs[vsClubId].tactic).tactic
}

/** Una vez por semana: los planteles de la IA también entrenan (intensidad normal). */
export function weeklyAiTraining(g: Game, rng: Rng) {
  for (const p of Object.values(g.players)) {
    if (p.clubId === g.userClubId || p.injury) continue
    const age = ageOn(p.birth, g.date)
    if (age > 30) continue
    const ageF = age <= 19 ? 1.8 : age <= 21 ? 1.5 : age <= 23 ? 1.15 : age <= 26 ? 0.6 : 0.3
    // la misma regla que la práctica del usuario: nadie crece más allá de su potencial
    if (!addProgress(p, 6 * 0.007 * ageF * (0.55 + p.prof / 20)) || (p.tx ?? 0) < 1) continue
    p.tx = (p.tx ?? 0) - 1
    const pos = p.positions[0], w = POS_WEIGHTS[pos]
    const idx = w.map((_, i) => i).filter(i => w[i] > 0 && p.attrs[i] < 20)
    if (!idx.length) continue
    const i = rng.weighted(idx, j => (21 - p.attrs[j]) * (1 + w[j]))
    p.attrs[i]++
    const ca = Math.round(rawRating(p.attrs, pos))
    if (ca > p.pa) { p.attrs[i]--; p.tx = 0; continue } // ese punto lo pasaría de su techo
    p.ca = ca
  }
}
export { FORMATION_NAMES }
