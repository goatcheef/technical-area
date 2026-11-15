// Utilidades de las pruebas del motor (sin interfaz). Se corren con tsx: `npm run test:engine`.
import { newGame, addDays, news } from '../../src/engine/game'
import { BACKGROUNDS, PRESETS, distribute, dailyDeals } from '../../src/engine/career'
import type { Game, Offer, Player } from '../../src/engine/types'

export function makeGame(seed = 12345, club = 23): Game {
  return newGame(club, { name: 'Test', nat: 'Argentina', birthYear: 1980, avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, glasses: false, suit: 0 }, background: 'primera', attrs: distribute(BACKGROUNDS[1].points, PRESETS[0].attrs), rep: 60, career: [], cur: { pj: 0, g: 0, e: 0, p: 0 }, titles: [] }, seed)
}
/** Pasa un día sin jugar partidos: cambia la fecha y corre `dailyDeals` (lo mismo que hacen `advanceDay` y `finishUserMatch` al empezar el día). */
export function nextDay(g: Game, n = 1) { for (let i = 0; i < n; i++) { g.date = addDays(g.date, 1); dailyDeals(g) } }
export const clone = (g: Game): Game => JSON.parse(JSON.stringify(g))

let fails = 0, passes = 0, section = ''
export function sec(name: string) { section = name; console.log(`\n# ${name}`) }
export function ok(cond: unknown, what: string) {
  if (cond) { passes++; return }
  fails++; console.log(`  FALLA [${section}] ${what}`)
}
export function eq<T>(a: T, b: T, what: string) { ok(JSON.stringify(a) === JSON.stringify(b), `${what}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`) }
export function done(name: string) {
  console.log(`\n${name}: ${passes} comprobaciones, ${fails} fallas`)
  if (fails) process.exit(1)
}
/** Oferta de un club por un jugador del DT, como la arma `pushOffer` (con su mensaje). */
export function offerFor(g: Game, p: Player, from: number, fee: number): Offer {
  const c = g.clubs[from], o: Offer = { id: g.nextId++, pid: p.id, from, fromName: c?.name ?? 'Benfica', fee, date: g.date, fee0: fee }
  g.offers.push(o)
  news(g, { tag: 'mercado', clubId: g.userClubId, pid: p.id, act: 'offer', ref: o.id, title: `Oferta de ${o.fromName} por ${p.name}`, body: '' })
  return o
}
