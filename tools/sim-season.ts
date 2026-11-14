// Simula temporadas completas y muestra métricas para calibrar el motor.
import { newGame, continueGame, userFixtureToday, finishUserMatch, createMatch, startNewSeason, annualTable, zoneTable, promedios, relegationZone } from '../src/engine/game'

const seasons = Number(process.argv[2] ?? 1)
import { BACKGROUNDS, PRESETS, distribute, wageBill } from '../src/engine/career'
const g = newGame(23, { name: 'Test', nat: 'Argentina', birthYear: 1980, avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, glasses: false, suit: 0 }, background: 'primera', attrs: distribute(BACKGROUNDS[1].points, PRESETS[0].attrs), rep: 60, career: [], cur: { pj: 0, g: 0, e: 0, p: 0 }, titles: [] }, 12345)
const t0 = Date.now()
for (let s = 0; s < seasons; s++) {
  while (!g.seasonOver) {
    g.board.fired = false
    continueGame(g)
    const f = userFixtureToday(g)
    if (f) finishUserMatch(g, f, createMatch(g, f, false).runToEnd())
  }
  const fx = g.fixtures.filter(f => f.played)
  const n = fx.length, sum = (f: (x: any) => number) => fx.reduce((t, x) => t + f(x), 0)
  const pct = (v: number) => ((v / n) * 100).toFixed(1) + '%'
  console.log(`\n=== Temporada ${g.season}: ${n} partidos en ${((Date.now() - t0) / 1000).toFixed(1)}s ===`)
  console.log('goles/partido', (sum(f => f.hg + f.ag) / n).toFixed(2), '| local', pct(fx.filter(f => f.hg > f.ag).length), 'empate', pct(fx.filter(f => f.hg === f.ag).length), 'visita', pct(fx.filter(f => f.hg < f.ag).length))
  const st = (k: string) => (sum(f => f.stats[k][0] + f.stats[k][1]) / n).toFixed(2)
  console.log('remates', st('shots'), 'al arco', st('sot'), 'xG', st('xg'), 'faltas', st('fouls'), 'corners', st('corners'), 'offsides', st('offs'), 'amarillas', st('yc'), 'rojas', st('rc'), 'pases', st('passes'))
  console.log('0-0:', pct(fx.filter(f => f.hg + f.ag === 0).length), '| 4+ goles:', pct(fx.filter(f => f.hg + f.ag >= 4).length), '| posesión local media', (sum(f => f.stats.poss[0]) / n).toFixed(1))
  const name = (id: number) => g.clubs[id].short
  for (const c of ['AP', 'CL', 'PN']) console.log(g.comps[c].name, '-> campeón:', name(g.comps[c].champion!), '| final vs', name(g.comps[c].runnerUp!))
  console.log('Anual:', annualTable(g).map(r => `${name(r.clubId)} ${r.pts}`).join(', '))
  console.log('PN A:', zoneTable(g, 'PN', 2, 'A').slice(0, 6).map(r => `${name(r.clubId)} ${r.pts}`).join(', '), '... último', zoneTable(g, 'PN', 2, 'A').slice(-1).map(r => `${name(r.clubId)} ${r.pts}`)[0])
  console.log('Descensos:', relegationZone(g).map(name).join(', '), '| Ascensos:', ((g.comps.PN.extra as any).promoted as number[]).map(name).join(', '), '| peor promedio', promedios(g).slice(-2).map(r => `${name(r.clubId)} ${r.avg.toFixed(3)}`).join(', '))
  const ps = Object.values(g.players)
  const top = (f: (p: any) => number, k = 6) => [...ps].sort((a, b) => f(b) - f(a)).slice(0, k)
  const d1 = (p: any) => g.clubs[p.clubId]?.division === 1
  console.log('Goleadores 1ra:', top(p => (d1(p) ? p.stats.goals : -1)).map(p => `${p.name} (${name(p.clubId)}) ${p.stats.goals}`).join(', '))
  console.log('Asistencias 1ra:', top(p => (d1(p) ? p.stats.ast : -1), 4).map(p => `${p.name} ${p.stats.ast}`).join(', '))
  console.log('Mejor promedio:', top(p => (p.stats.apps >= 15 ? p.stats.ratSum / (p.stats.apps + p.stats.subs) : 0), 5).map(p => `${p.name} ${p.positions[0]} ${(p.stats.ratSum / (p.stats.apps + p.stats.subs)).toFixed(2)}`).join(', '))
  const all = ps.filter(p => p.stats.apps >= 10).map(p => p.stats.ratSum / (p.stats.apps + p.stats.subs))
  console.log('puntaje medio', (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2), '| lesionados hoy', ps.filter(p => p.injury).length, '| JSON', (JSON.stringify(g).length / 1e6).toFixed(2), 'MB')
  const fin = (c: any) => `${c.short}: caja ${(c.balance / 1e6).toFixed(1)}M, presup ${(c.budget / 1e6).toFixed(2)}M, sueldos ${(wageBill(g, c.id) / 1e3).toFixed(0)}k/${(c.wageBudget / 1e3).toFixed(0)}k, plantel ${ps.filter(p => p.clubId === c.id).length}`
  console.log('Finanzas:', [23, 7, 10, 30, 43, 31].map(id => fin(g.clubs[id])).join(' | '))
  console.log('Pases:', g.transfers.length, '| top:', [...g.transfers].sort((a, b) => b.fee - a.fee).slice(0, 5).map(t => `${t.name} ${t.from}→${t.to} ${(t.fee / 1e6).toFixed(1)}M`).join(', '))
  console.log('Directiva:', g.board.objective, 'confianza', g.board.confidence.toFixed(0), 'despedido', g.board.fired, '| DT rep', g.manager.rep, '| jugadores', ps.length, '| ofertas', g.offers.length)
  if (g.board.fired) g.board.fired = false
  if (s < seasons - 1) startNewSeason(g)
}
