import { A, ATTRS, type Attr, type Line, type Player, type Pos } from './types'

export const POS_LABEL: Record<Pos, string> = {
  GK: 'ARQ', DR: 'LD', DC: 'DFC', DL: 'LI', DM: 'MCD', MC: 'MC', MR: 'MD', ML: 'MI',
  AMC: 'MP', AMR: 'ED', AML: 'EI', ST: 'DC',
}
export const POS_NAME: Record<Pos, string> = {
  GK: 'Arquero', DR: 'Lateral derecho', DC: 'Defensor central', DL: 'Lateral izquierdo',
  DM: 'Volante central', MC: 'Mediocampista', MR: 'Volante derecho', ML: 'Volante izquierdo',
  AMC: 'Enganche', AMR: 'Extremo derecho', AML: 'Extremo izquierdo', ST: 'Delantero centro',
}
export const POS_LINE: Record<Pos, Line> = {
  GK: 'GK', DR: 'DF', DC: 'DF', DL: 'DF', DM: 'MF', MC: 'MF', MR: 'MF', ML: 'MF',
  AMC: 'MF', AMR: 'FW', AML: 'FW', ST: 'FW',
}

type W = Partial<Record<Attr, number>>
/** Importancia de cada atributo por puesto (0-5). */
const PW: Record<Pos, W> = {
  GK: { han: 5, ref: 5, one: 4, aer: 4, kic: 2, pos: 4, com: 3, dec: 3, jmp: 2, lea: 1 },
  DC: { tck: 5, mar: 5, hea: 4, pos: 5, str: 4, jmp: 4, dec: 3, com: 2, pac: 2, agg: 2, pas: 1, lea: 1 },
  DR: { tck: 4, mar: 4, pos: 4, pac: 4, acc: 3, sta: 4, cro: 3, wor: 3, pas: 2, dec: 2, dri: 2 },
  DL: { tck: 4, mar: 4, pos: 4, pac: 4, acc: 3, sta: 4, cro: 3, wor: 3, pas: 2, dec: 2, dri: 2 },
  DM: { tck: 5, mar: 3, pos: 5, pas: 4, dec: 4, wor: 4, sta: 4, str: 3, com: 3, agg: 2, vis: 2, fto: 2 },
  MC: { pas: 5, vis: 4, dec: 4, fto: 4, wor: 3, sta: 4, tck: 2, pos: 2, otb: 2, com: 3, dri: 2, lsh: 2 },
  MR: { cro: 4, dri: 4, pac: 4, acc: 3, sta: 4, pas: 3, wor: 3, fto: 3, otb: 2, tck: 2, dec: 2 },
  ML: { cro: 4, dri: 4, pac: 4, acc: 3, sta: 4, pas: 3, wor: 3, fto: 3, otb: 2, tck: 2, dec: 2 },
  AMC: { vis: 5, pas: 5, dri: 4, fto: 5, dec: 4, com: 4, otb: 3, lsh: 3, fin: 3, set: 2, acc: 2 },
  AMR: { dri: 5, pac: 5, acc: 5, cro: 4, fto: 3, otb: 4, fin: 3, pas: 2, dec: 2, com: 2 },
  AML: { dri: 5, pac: 5, acc: 5, cro: 4, fto: 3, otb: 4, fin: 3, pas: 2, dec: 2, com: 2 },
  ST: { fin: 5, otb: 5, com: 4, hea: 3, fto: 4, acc: 3, pac: 3, str: 3, dri: 2, dec: 2, jmp: 2, lsh: 1 },
}
export const POS_WEIGHTS: Record<Pos, number[]> = Object.fromEntries(
  (Object.keys(PW) as Pos[]).map(p => [p, ATTRS.map(a => PW[p][a] ?? 0)]),
) as Record<Pos, number[]>
const WSUM: Record<Pos, number> = Object.fromEntries(
  (Object.keys(PW) as Pos[]).map(p => [p, POS_WEIGHTS[p].reduce((s, v) => s + v, 0)]),
) as Record<Pos, number>

/** Valoración 0-100 de un set de atributos para un puesto (sin penalización por puesto). */
export function rawRating(attrs: number[], pos: Pos): number {
  const w = POS_WEIGHTS[pos]
  let s = 0
  for (let i = 0; i < w.length; i++) if (w[i]) s += w[i] * attrs[i]
  return (s / WSUM[pos]) * 5
}

const SIDE_SWAP: Partial<Record<Pos, Pos>> = { DR: 'DL', DL: 'DR', MR: 'ML', ML: 'MR', AMR: 'AML', AML: 'AMR' }
const NEAR: Partial<Record<Pos, Pos[]>> = {
  DR: ['MR', 'DC'], DL: ['ML', 'DC'], DC: ['DM'], DM: ['MC', 'DC'], MC: ['DM', 'AMC'],
  MR: ['AMR', 'DR'], ML: ['AML', 'DL'], AMC: ['MC', 'ST'], AMR: ['MR', 'ST'], AML: ['ML', 'ST'], ST: ['AMC'],
}
/** Familiaridad (0-1) de un jugador con un puesto. */
export function familiarity(p: Player, pos: Pos): number {
  if (p.positions[0] === pos) return 1
  if (p.positions.includes(pos)) return 0.96
  if (pos === 'GK' || p.positions[0] === 'GK') return 0.3
  let best = 0.72
  for (const own of p.positions) {
    if (SIDE_SWAP[own] === pos) best = Math.max(best, 0.9)
    else if (NEAR[own]?.includes(pos)) best = Math.max(best, 0.86)
    else if (POS_LINE[own] === POS_LINE[pos]) best = Math.max(best, 0.8)
  }
  return best
}
/** Valoración efectiva 0-100 de un jugador en un puesto. */
export function posRating(p: Player, pos: Pos): number {
  return rawRating(p.attrs, pos) * familiarity(p, pos)
}
export function bestRating(p: Player): number { return rawRating(p.attrs, p.positions[0]) }

export interface Slot { pos: Pos; x: number; y: number }
const s = (pos: Pos, x: number, y: number): Slot => ({ pos, x, y })
/** x: 0 izquierda .. 100 derecha; y: 0 arco propio .. 100 arco rival */
export const FORMATIONS: Record<string, Slot[]> = {
  '4-4-2': [s('GK', 50, 4), s('DR', 85, 24), s('DC', 62, 20), s('DC', 38, 20), s('DL', 15, 24), s('MR', 85, 52), s('MC', 60, 48), s('MC', 40, 48), s('ML', 15, 52), s('ST', 60, 82), s('ST', 40, 82)],
  '4-3-3': [s('GK', 50, 4), s('DR', 85, 24), s('DC', 62, 20), s('DC', 38, 20), s('DL', 15, 24), s('DM', 50, 40), s('MC', 66, 54), s('MC', 34, 54), s('AMR', 82, 76), s('AML', 18, 76), s('ST', 50, 84)],
  '4-2-3-1': [s('GK', 50, 4), s('DR', 85, 24), s('DC', 62, 20), s('DC', 38, 20), s('DL', 15, 24), s('DM', 60, 40), s('DM', 40, 40), s('AMR', 82, 66), s('AMC', 50, 64), s('AML', 18, 66), s('ST', 50, 84)],
  '4-3-1-2': [s('GK', 50, 4), s('DR', 85, 24), s('DC', 62, 20), s('DC', 38, 20), s('DL', 15, 24), s('DM', 50, 38), s('MC', 70, 50), s('MC', 30, 50), s('AMC', 50, 66), s('ST', 62, 84), s('ST', 38, 84)],
  '4-1-4-1': [s('GK', 50, 4), s('DR', 85, 24), s('DC', 62, 20), s('DC', 38, 20), s('DL', 15, 24), s('DM', 50, 38), s('MR', 85, 58), s('MC', 62, 54), s('MC', 38, 54), s('ML', 15, 58), s('ST', 50, 84)],
  '3-5-2': [s('GK', 50, 4), s('DC', 72, 20), s('DC', 50, 18), s('DC', 28, 20), s('MR', 88, 50), s('DM', 50, 38), s('MC', 66, 52), s('MC', 34, 52), s('ML', 12, 50), s('ST', 62, 84), s('ST', 38, 84)],
  '5-3-2': [s('GK', 50, 4), s('DR', 90, 30), s('DC', 70, 20), s('DC', 50, 18), s('DC', 30, 20), s('DL', 10, 30), s('MC', 70, 50), s('DM', 50, 42), s('MC', 30, 50), s('ST', 62, 82), s('ST', 38, 82)],
  '3-4-3': [s('GK', 50, 4), s('DC', 72, 20), s('DC', 50, 18), s('DC', 28, 20), s('MR', 86, 50), s('MC', 60, 46), s('MC', 40, 46), s('ML', 14, 50), s('AMR', 80, 76), s('AML', 20, 76), s('ST', 50, 84)],
  '4-4-1-1': [s('GK', 50, 4), s('DR', 85, 24), s('DC', 62, 20), s('DC', 38, 20), s('DL', 15, 24), s('MR', 85, 52), s('MC', 60, 46), s('MC', 40, 46), s('ML', 15, 52), s('AMC', 50, 68), s('ST', 50, 86)],
}
export const FORMATION_NAMES = Object.keys(FORMATIONS)

/** Aporte de cada puesto a defensa / mediocampo / ataque del equipo. */
export const ZONE_W: Record<Pos, [number, number, number]> = {
  GK: [0, 0, 0], DC: [1.0, 0.15, 0.04], DR: [0.8, 0.35, 0.28], DL: [0.8, 0.35, 0.28],
  DM: [0.62, 0.72, 0.14], MC: [0.34, 0.92, 0.4], MR: [0.3, 0.66, 0.55], ML: [0.3, 0.66, 0.55],
  AMC: [0.1, 0.62, 0.82], AMR: [0.1, 0.45, 0.86], AML: [0.1, 0.45, 0.86], ST: [0.03, 0.2, 1.0],
}
/** Probabilidad relativa de rematar / asistir según puesto. */
export const SHOOT_W: Record<Pos, number> = { GK: 0, DC: 0.06, DR: 0.09, DL: 0.09, DM: 0.13, MC: 0.3, MR: 0.36, ML: 0.36, AMC: 0.55, AMR: 0.58, AML: 0.58, ST: 0.8 }
export const ASSIST_W: Record<Pos, number> = { GK: 0.01, DC: 0.05, DR: 0.35, DL: 0.35, DM: 0.25, MC: 0.6, MR: 0.8, ML: 0.8, AMC: 1.0, AMR: 0.9, AML: 0.9, ST: 0.5 }

export const at = (p: Player, a: Attr) => p.attrs[A[a]]
export function ageOn(birth: string, date: string): number {
  const b = birth.split('-').map(Number), d = date.split('-').map(Number)
  let age = d[0] - b[0]
  if (d[1] < b[1] || (d[1] === b[1] && d[2] < b[2])) age--
  return age
}
