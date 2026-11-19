// Perfil del motor sin interfaz: costo por día, por partido, por minuto de partido; tamaño y tiempo de (de)serialización
// del estado a 0, 1 y 3 temporadas; crecimiento de listas. Uso: npx tsx tests/perf/engine-bench.ts [temporadas=3] [semilla=12345] [--save <dir>]
// (con --save deja g-s0.json, g-s1.json, g-s3.json para inyectarlos como partida guardada en el navegador)
import { writeFileSync, mkdirSync } from 'fs'
import { newGame, advanceDay, userFixtureToday, finishUserMatch, createMatch, startNewSeason } from '../../src/engine/game'
import { BACKGROUNDS, PRESETS, distribute } from '../../src/engine/career'

const seasons = Number(process.argv[2] ?? 3), seed = Number(process.argv[3] ?? 12345)
const si = process.argv.indexOf('--save'), saveDir = si > 0 ? process.argv[si + 1] : null
if (saveDir) mkdirSync(saveDir, { recursive: true })
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN }
const f = (v: number, d = 2) => v.toFixed(d)
const line = (name: string, a: number[], unit = 'ms') => console.log(`${name.padEnd(34)} n=${String(a.length).padStart(5)}  mediana ${f(q(a, .5), 3)}${unit}  p95 ${f(q(a, .95), 3)}${unit}  máx ${f(Math.max(...a), 2)}${unit}  total ${f(a.reduce((x, y) => x + y, 0), 0)}${unit}`)
const mgr = { name: 'Test', nat: 'Argentina', birthYear: 1980, avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, glasses: false, suit: 0 }, background: 'primera' as const, attrs: distribute(BACKGROUNDS[1].points, PRESETS[0].attrs), rep: 60, career: [], cur: { pj: 0, g: 0, e: 0, p: 0 }, titles: [] }
const tn = performance.now()
const g = newGame(23, mgr as never, seed)
console.log(`newGame: ${f(performance.now() - tn, 0)} ms`)
const gc = () => { (globalThis as { gc?: () => void }).gc?.() }
function snapshot(label: string, tag: string) {
  const t0 = performance.now(); const s = JSON.stringify(g); const ts = performance.now() - t0
  const strs: number[] = [], pars: number[] = []
  for (let i = 0; i < 5; i++) { const a = performance.now(); JSON.stringify(g); strs.push(performance.now() - a); const b = performance.now(); JSON.parse(s); pars.push(performance.now() - b) }
  gc(); const heap = process.memoryUsage().heapUsed / 1e6
  const sizes = (k: keyof typeof g) => (JSON.stringify(g[k])?.length ?? 0) / 1e3
  console.log(`\n--- ${label}: ${g.date} ---`)
  console.log(`JSON ${f(s.length / 1e6, 3)} MB | stringify mediana ${f(q(strs, .5), 1)} ms | parse mediana ${f(q(pars, .5), 1)} ms | heap Node tras GC ${f(heap, 0)} MB`)
  console.log(`por campo (KB): players ${f(sizes('players'), 0)}, clubs ${f(sizes('clubs'), 0)}, fixtures ${f(sizes('fixtures'), 0)}, news ${f(sizes('news'), 0)}, transfers ${f(sizes('transfers'), 0)}, deals ${f(sizes('deals'), 0)}, comps ${f(sizes('comps'), 0)}, know ${f(sizes('know'), 0)}, offers ${f(sizes('offers'), 0)}, honours ${f(sizes('honours'), 0)}`)
  console.log(`conteos: jugadores ${Object.keys(g.players).length}, fixtures ${g.fixtures.length} (jugados ${g.fixtures.filter(x => x.played).length}), news ${g.news.length}, deals ${g.deals?.length ?? 0}, transfers ${g.transfers.length}, offers ${g.offers.length}, honours ${g.honours.length}`)
  if (saveDir) writeFileSync(`${saveDir}/g-${tag}.json`, s)
}
snapshot('Partida nueva', 's0')
const dayMs: number[] = [], matchRun: number[] = [], matchFin: number[] = [], matchCreate: number[] = [], matchMin: number[] = [], saveEq: number[] = []
let minutes = 0
for (let s = 0; s < seasons; s++) {
  const ts = performance.now()
  while (!g.seasonOver) {
    g.board.fired = false
    const f0 = userFixtureToday(g)
    if (f0) {
      const a = performance.now(); const m = createMatch(g, f0, false); matchCreate.push(performance.now() - a)
      const b = performance.now(); const res = m.runToEnd(); const d = performance.now() - b; matchRun.push(d)
      const mins = (m as unknown as { minute?: number }).minute ?? 95; matchMin.push(d / Math.max(1, mins)); minutes += mins
      const c = performance.now(); finishUserMatch(g, f0, res); matchFin.push(performance.now() - c)
      continue
    }
    const a = performance.now(); const r = advanceDay(g); dayMs.push(performance.now() - a)
    if (g.press) { /* la IA contesta la prensa como en continueGame */ }
    if (r === 'press') { advanceDay(g) }
  }
  console.log(`\nTemporada ${g.season} simulada en ${f((performance.now() - ts) / 1000, 1)} s`)
  snapshot(`Fin de la temporada ${s + 1}`, `s${s + 1}`)
  if (s < seasons - 1) { const a = performance.now(); startNewSeason(g); console.log(`startNewSeason: ${f(performance.now() - a, 0)} ms`) }
}
console.log('\n=== Tiempos del motor (todas las temporadas) ===')
line('advanceDay (día sin partido del DT)', dayMs)
line('createMatch (partido del DT)', matchCreate)
line('MatchSim.runToEnd (partido del DT)', matchRun)
line('finishUserMatch', matchFin)
line('runToEnd por minuto', matchMin)
