// Microbenchmarks de las funciones que la interfaz llama en cada render / cada día, sobre una partida guardada (JSON).
// Uso: npx tsx tests/perf/engine-micro.ts <partida.json>   (la saca engine-bench.ts con --save)
import { readFileSync } from 'fs'
import type { Game } from '../../src/engine/types'
import { squadOf, autoPick, userFixtureToday, nextUserFixture, sameRound } from '../../src/engine/game'
import { pendingAll, inboxCount, decisionKeys, expiringKeys } from '../../src/engine/inbox'
import { FORMATION_NAMES } from '../../src/engine/positions'
const g = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Game
function bench(name: string, fn: () => unknown, n = 2000) {
  for (let i = 0; i < 200; i++) fn() // calentar
  const xs: number[] = []
  for (let i = 0; i < n; i++) { const t = performance.now(); fn(); xs.push(performance.now() - t) }
  xs.sort((a, b) => a - b)
  console.log(`${name.padEnd(44)} mediana ${(xs[n >> 1] * 1000).toFixed(1).padStart(8)} µs   p95 ${(xs[Math.floor(n * .95)] * 1000).toFixed(1).padStart(8)} µs`)
}
const id = g.userClubId
console.log(`partida: ${g.date}, jugadores ${Object.keys(g.players).length}, fixtures ${g.fixtures.length}`)
bench('squadOf(g, club)', () => squadOf(g, id))
bench('autoPick(g, club, 4-4-2)', () => autoPick(g, id, '4-4-2'), 500)
bench(`bestFormation equivalente (${FORMATION_NAMES.length} × autoPick)`, () => FORMATION_NAMES.forEach(f => autoPick(g, id, f)), 100)
bench('userFixtureToday(g)', () => userFixtureToday(g))
bench('nextUserFixture(g)', () => nextUserFixture(g))
bench('pendingAll(g)', () => pendingAll(g))
bench('inboxCount(g)', () => inboxCount(g))
bench('decisionKeys(g)', () => decisionKeys(g))
bench('expiringKeys(g)', () => expiringKeys(g))
bench('render de App: pendingAll + inboxCount + nextUserFixture + userFixtureToday', () => { pendingAll(g); inboxCount(g); nextUserFixture(g); userFixtureToday(g) })
const f0 = g.fixtures.find(f => !f.played) ; if (f0) bench('sameRound(g, f)', () => sameRound(g, f0))
