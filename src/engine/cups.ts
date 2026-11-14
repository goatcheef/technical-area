// Tercera categoría, Copa Argentina, Copa Libertadores y Copa Sudamericana.
import { SPOTS, addDays, addFx, annualTable, clubsIn, firstSaturday, news, roundRobin, tableOf, zoneTable } from './game'
import { prize } from './career'
import { Rng } from './rng'
import type { Competition, Fixture, Game } from './types'

export const CUP_IDS = ['T3', 'CA', 'LIB', 'SUD']
export const isCup = (id: string) => CUP_IDS.includes(id)
const onDow = (from: string, dow: number) => { let d = from; while (new Date(d + 'T12:00:00Z').getUTCDay() !== dow) d = addDays(d, 1); return d }

/** Ganador de un partido de eliminación (con serie de ida y vuelta si corresponde). */
export function koWinner(g: Game, f: Fixture): number {
  if (f.leg === 2) {
    const first = g.fixtures.find(x => x.id === f.pair)!
    const gh = f.hg + (first.home === f.home ? first.hg : first.ag), ga = f.ag + (first.home === f.away ? first.hg : first.ag)
    if (gh !== ga) return gh > ga ? f.home : f.away
  } else if (f.hg !== f.ag) return f.hg > f.ag ? f.home : f.away
  return f.pens && f.pens[0] > f.pens[1] ? f.home : f.away
}
const koLoser = (g: Game, f: Fixture) => (koWinner(g, f) === f.home ? f.away : f.home)
/** Goles de la ida que arrastra cada equipo en la vuelta. */
export function aggFor(g: Game, f: Fixture): [number, number] | undefined {
  if (f.leg !== 2) return undefined
  const first = g.fixtures.find(x => x.id === f.pair)
  if (!first) return undefined
  return first.home === f.home ? [first.hg, first.ag] : [first.ag, first.hg]
}
function tie(g: Game, comp: string, stage: string, round: number, h: number, a: number, d1: string, d2: string) {
  const id1 = g.nextId
  addFx(g, { comp, stage: `${stage} (ida)`, round, date: d1, home: a, away: h, leg: 1 })
  addFx(g, { comp, stage: `${stage} (vuelta)`, round, date: d2, home: h, away: a, knockout: true, leg: 2, pair: id1 })
  g.fixtures.find(x => x.id === id1)!.pair = id1 + 1
}

// ---------- clasificados ----------
/** Clasificados para la primera temporada: según la campaña 2025 (puntos de la temporada anterior). */
function initialQual(g: Game) {
  const d1 = clubsIn(g, 1).sort((a, b) => (g.clubs[b].avgHist[0]?.pts ?? 0) - (g.clubs[a].avgHist[0]?.pts ?? 0))
  return { lib: d1.slice(0, 5), sud: d1.slice(5, 10) }
}
/** Campeones y mejores de la tabla anual van a la Libertadores; los siguientes, a la Sudamericana. Durante la temporada es la
 *  proyección "si terminara hoy" (con los campeones ya definidos); las tablas la usan para marcar los puestos (`zoneRule`). */
export function qualOf(g: Game): { lib: number[]; sud: number[] } {
  const ann = annualTable(g).map(r => r.clubId)
  const lib: number[] = []
  for (const id of [g.comps.AP?.champion, g.comps.CL?.champion, ann[0], g.comps.CA?.champion]) if (id && !lib.includes(id)) lib.push(id)
  for (const id of ann) if (lib.length < 5 && !lib.includes(id)) lib.push(id)
  const sud = ann.filter(id => !lib.includes(id)).slice(0, 5)
  return { lib, sud }
}
/** Al cerrar la temporada fija los clasificados del año siguiente. */
export function computeQual(g: Game) { g.qual = qualOf(g) }

// ---------- fixture de la temporada ----------
export function scheduleCups(g: Game, rng: Rng) {
  const y = g.season
  // Tercera categoría: dos zonas de 10 (Metropolitana y Federal), ida y vuelta cada 14 días
  for (const z of ['A', 'B']) {
    const teams = rng.shuffle(clubsIn(g, 3, z))
    const half = roundRobin(teams)
    const all = [...half, ...half.map(r => r.map(([h, a]) => [a, h] as [number, number]))]
    let d = firstSaturday(`${y}-02-12`)
    all.forEach((pairs, r) => { for (const [h, a] of pairs) addFx(g, { comp: 'T3', stage: `Fecha ${r + 1}`, round: r + 1, date: d, home: h, away: a }); d = addDays(d, 14) })
  }
  g.comps.T3 = { id: 'T3', name: `Primera B y Federal A ${y}`, division: 3, phase: 'league', koRound: 0, extra: {} }

  // Copa Argentina: 64 equipos, partido único en cancha neutral, los miércoles
  const strong = [...clubsIn(g, 1), ...clubsIn(g, 2).sort((a, b) => g.clubs[b].rep - g.clubs[a].rep).slice(0, 2)]
  const weak = [...clubsIn(g, 2).sort((a, b) => g.clubs[b].rep - g.clubs[a].rep).slice(2, 30), ...clubsIn(g, 3).sort((a, b) => g.clubs[b].rep - g.clubs[a].rep).slice(0, 4)]
  rng.shuffle(strong); rng.shuffle(weak)
  const bracket: number[] = []
  strong.forEach((s, i) => bracket.push(s, weak[i]))
  const caDates = ['02-18', '04-08', '06-24', '08-26', '10-14', '12-02'].map(md => onDow(`${y}-${md}`, 3))
  g.comps.CA = { id: 'CA', name: `Copa Argentina ${y}`, division: 9, phase: 'ko', koRound: 0, extra: { bracket, dates: caDates } }
  caRound(g, g.comps.CA)

  // Libertadores (martes) y Sudamericana (jueves): 16 equipos, 4 grupos, cuartos y semis de ida y vuelta, final única
  const q = g.qual ?? initialQual(g)
  const foreign = Object.values(g.clubs).filter(c => c.division === 0).sort((a, b) => b.rep + rng.next() * 4 - a.rep - rng.next() * 4).map(c => c.id)
  for (const [id, name, dow, local, ext] of [['LIB', 'Copa Libertadores', 2, q.lib, foreign.slice(0, 11)], ['SUD', 'Copa Sudamericana', 4, q.sud, foreign.slice(11, 22)]] as const) {
    const pots = [...local.slice(0, 4), ...ext.slice(0, 4), ...[local[4], ...ext.slice(4)].filter(Boolean)]
    const groups: number[][] = [[], [], [], []]
    // un argentino por grupo como cabeza de serie; el quinto va al grupo que corresponda
    pots.slice(0, 16).forEach((c, i) => groups[i % 4].push(c))
    const gd = Array.from({ length: 6 }, (_, k) => onDow(addDays(`${y}-03-02`, k * 14), dow))
    groups.forEach((gr, gi) => {
      const rr = roundRobin(gr), all = [...rr, ...rr.map(r => r.map(([h, a]) => [a, h] as [number, number]))]
      all.forEach((pairs, r) => { for (const [h, a] of pairs) addFx(g, { comp: id, stage: `Grupo ${'ABCD'[gi]} · Fecha ${r + 1}`, round: r + 1, date: gd[r], home: h, away: a }) })
    })
    g.comps[id] = { id, name: `${name} ${y}`, division: 9, phase: 'league', koRound: 0, extra: { groups, dow } }
    for (const c of groups.flat()) prize(g, c, id === 'LIB' ? 1500000 : 500000)
  }
}

function caRound(g: Game, comp: Competition) {
  const ex = comp.extra as any, br = ex.bracket as number[], k = comp.koRound
  const names = ['32avos de final', '16avos de final', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Final']
  for (let i = 0; i < br.length; i += 2) addFx(g, { comp: 'CA', stage: names[k], round: 100 + k, date: ex.dates[k], home: br[i], away: br[i + 1], knockout: true, neutral: true })
}
const CA_PRIZE = [50000, 100000, 150000, 250000, 400000, 1000000]
const KO_PRIZE: Record<string, number[]> = { LIB: [1000000, 1500000, 4000000, 10000000], SUD: [400000, 600000, 1500000, 4000000] }
export const groupTable = (g: Game, comp: string, gi: number) => {
  const gr = ((g.comps[comp].extra as any).groups as number[][])[gi]
  return tableOf(g.fixtures.filter(f => f.comp === comp && !f.knockout && !f.leg && gr.includes(f.home)), gr)
}

/** Avanza las fases de una copa cuando terminó la ronda en curso. */
export function progressCup(g: Game, comp: Competition, fx: Fixture[]) {
  const ex = comp.extra as any, y = g.season
  if (comp.id === 'T3') {
    const up = ['A', 'B'].flatMap(z => zoneTable(g, 'T3', 3, z).slice(0, SPOTS.t3Up).map(r => r.clubId))
    ex.promoted = up; comp.phase = 'done'; comp.champion = up[0]
    news(g, { tag: 'torneo', title: 'Ascensos a la Primera Nacional', body: `Terminó la tercera categoría. Ascienden ${up.map(id => g.clubs[id].name).join(', ')}.` })
    return
  }
  if (comp.id === 'CA') {
    const round = fx.filter(f => f.round === 100 + comp.koRound)
    const winners = round.map(f => koWinner(g, f))
    for (const w of winners) prize(g, w, CA_PRIZE[comp.koRound])
    if (winners.length === 1) {
      comp.champion = winners[0]; comp.runnerUp = koLoser(g, round[0]); comp.phase = 'done'
      g.honours.push({ season: y, comp: comp.name, clubId: winners[0] })
      if (winners[0] === g.userClubId) g.manager.titles.push(comp.name)
      news(g, { tag: 'torneo', clubId: winners[0], title: `¡${g.clubs[winners[0]].name} ganó la ${comp.name}!`, body: `${g.clubs[winners[0]].name} le ganó la final a ${g.clubs[comp.runnerUp].name} y se aseguró un lugar en la próxima Copa Libertadores.` })
      return
    }
    ex.bracket = winners; comp.koRound++
    caRound(g, comp)
    const mine = round.find(f => f.home === g.userClubId || f.away === g.userClubId)
    if (mine) news(g, { tag: 'torneo', clubId: g.userClubId, title: koWinner(g, mine) === g.userClubId ? `${g.clubs[g.userClubId].short} avanzó en la Copa Argentina` : `${g.clubs[g.userClubId].short} quedó afuera de la Copa Argentina`, body: `${mine.stage}: ${g.clubs[mine.home].name} ${mine.hg}-${mine.ag} ${g.clubs[mine.away].name}${mine.pens ? ` (${mine.pens[0]}-${mine.pens[1]} en los penales)` : ''}.` })
    return
  }
  // Libertadores y Sudamericana
  const dow = ex.dow as number, P = KO_PRIZE[comp.id]
  if (comp.phase === 'league') {
    const tabs = [0, 1, 2, 3].map(i => groupTable(g, comp.id, i))
    const f = (gi: number, pos: number) => tabs[gi][pos].clubId
    const ties: [number, number][] = [[f(0, 0), f(1, 1)], [f(1, 0), f(0, 1)], [f(2, 0), f(3, 1)], [f(3, 0), f(2, 1)]]
    ex.ko = ties.map(t => t[0]).concat(ties.map(t => t[1]))
    const d1 = onDow(`${y}-08-10`, dow), d2 = onDow(`${y}-08-17`, dow)
    ties.forEach(([h, a]) => { tie(g, comp.id, 'Cuartos de final', 101, h, a, d1, d2); prize(g, h, P[0]); prize(g, a, P[0]) })
    comp.phase = 'ko'; comp.koRound = 1
    const mineIn = tabs.flat().some(r => r.clubId === g.userClubId)
    if (mineIn) news(g, { tag: 'torneo', clubId: g.userClubId, title: ex.ko.includes(g.userClubId) ? `${g.clubs[g.userClubId].short} pasó a cuartos de la ${comp.name.replace(/ \d+$/, '')}` : `${g.clubs[g.userClubId].short} quedó eliminado en la fase de grupos`, body: `Terminó la fase de grupos de la ${comp.name}. Clasificaron ${ex.ko.map((id: number) => g.clubs[id].short).join(', ')}.` })
    return
  }
  const legs = fx.filter(x => x.leg === 2 && x.round === 100 + comp.koRound)
  if (comp.koRound === 1 || comp.koRound === 2) {
    const w = legs.sort((a, b) => a.id - b.id).map(x => koWinner(g, x))
    if (comp.koRound === 1) {
      const d1 = onDow(`${y}-09-21`, dow), d2 = onDow(`${y}-09-28`, dow)
      tie(g, comp.id, 'Semifinales', 102, w[0], w[1], d1, d2); tie(g, comp.id, 'Semifinales', 102, w[2], w[3], d1, d2)
      for (const id of w) prize(g, id, P[1])
      comp.koRound = 2
    } else {
      addFx(g, { comp: comp.id, stage: 'Final', round: 103, date: onDow(`${y}-11-16`, dow), home: w[0], away: w[1], knockout: true, neutral: true })
      comp.koRound = 3
    }
    return
  }
  const fin = fx.find(x => x.round === 103)!
  const w = koWinner(g, fin), l = koLoser(g, fin)
  comp.champion = w; comp.runnerUp = l; comp.phase = 'done'
  prize(g, w, P[3]); prize(g, l, P[2])
  g.honours.push({ season: y, comp: comp.name, clubId: w })
  if (w === g.userClubId) g.manager.titles.push(comp.name)
  // la reputación del campeón sube al empezar la temporada siguiente (`bumpRep` en game.ts), con la misma regla que el resto de los logros
  news(g, { tag: 'torneo', clubId: w, title: `¡${g.clubs[w].name}, campeón de la ${comp.name}!`, body: `${g.clubs[w].name} le ganó la final a ${g.clubs[l].name} ${fin.hg}-${fin.ag}${fin.pens ? ` (${fin.pens[0]}-${fin.pens[1]} en los penales)` : ''}.` })
}
