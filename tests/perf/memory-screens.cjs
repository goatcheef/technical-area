// Memoria (heap de JS, nodos DOM, RSS del renderer) y costo de cambiar de pantalla, con la partida nueva y tras 1 y 3 temporadas.
// Necesita un build de producción que exponga el motor en window.__eng (ver "Cómo repetir" del informe): `node tests/perf/memory-screens.cjs <url> <perfil> [repeticiones]`.
const { launch, sleep, med, p95, fx, PROFILES, throttle, blockFonts } = require('./pw.cjs')
const { execSync } = require('child_process')
const [url, profName = 'desktop', reps = '5'] = process.argv.slice(2)
const prof = PROFILES[profName]
const rss = () => { try { return Math.max(...execSync("ps -eo rss,args | grep -- '--type=renderer' | grep -v grep | awk '{print $1}'").toString().trim().split('\n').map(Number)) / 1024 } catch { return NaN } }
async function heap(page, cdp) {
  await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('HeapProfiler.collectGarbage'); await sleep(200)
  const h = await cdp.send('Runtime.getHeapUsage'), d = await cdp.send('Memory.getDOMCounters')
  return { heapMB: h.usedSize / 1048576, totalMB: h.totalSize / 1048576, nodes: d.nodes, listeners: d.jsEventListeners, rssMB: rss() }
}
const SCREENS = [
  ['home', { page: 'home' }], ['inbox', { page: 'inbox' }], ['squad', { page: 'squad' }], ['tactics', { page: 'tactics' }], ['locker', { page: 'locker' }],
  ['training', { page: 'training' }], ['calendar', { page: 'calendar' }], ['market:buscar', { page: 'market', tab: 'buscar' }], ['market:tratos', { page: 'market', tab: 'tratos' }],
  ['data:equipo', { page: 'data', tab: 'equipo' }], ['data:jugadores', { page: 'data', tab: 'jugadores' }], ['data:rivales', { page: 'data', tab: 'rivales' }], ['data:liga', { page: 'data', tab: 'liga' }],
  ['fixtures', { page: 'fixtures' }], ['tables', { page: 'tables' }], ['stats', { page: 'stats' }], ['staff', { page: 'staff' }], ['club', { page: 'club' }], ['player', 'PLAYER'], ['clubv', 'CLUBV'],
]
/** Cambia de pantalla desde Inicio y mide hasta que se pintaron dos cuadros; devuelve ms y desglose de CDP (script / estilo / layout). */
async function switchTo(page, cdp, route) {
  await page.evaluate(() => window.__ctx().nav({ page: 'home' })); await sleep(120)
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
  const ms = await page.evaluate(async r => {
    const c = window.__ctx(); const rt = r === 'PLAYER' ? { page: 'player', id: Object.values(c.g.players).filter(p => p.clubId === c.g.userClubId).sort((a, b) => b.value - a.value)[0].id, tab: 'resumen' } : r === 'CLUBV' ? { page: 'clubv', id: Object.values(c.g.clubs).find(x => x.id !== c.g.userClubId && x.division === 1).id, tab: 'plantel' } : r
    const t0 = performance.now(); c.nav(rt)
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
    return performance.now() - t0
  }, route)
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
  await sleep(80)
  const nodes = await page.evaluate(() => document.getElementsByTagName('*').length)
  return { ms, script: (m1.ScriptDuration - m0.ScriptDuration) * 1000, layout: (m1.LayoutDuration - m0.LayoutDuration) * 1000, style: (m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000, nodes }
}
async function screens(page, cdp, label) {
  console.log(`\n### Pantallas (${label}, ${profName}) — ms hasta 2 cuadros pintados; mediana de ${reps} · p95 · desglose CDP script/layout/estilo (mediana) · nodos DOM`)
  const out = {}
  for (const [name, route] of SCREENS) {
    const rs = []; for (let i = 0; i < Number(reps); i++) rs.push(await switchTo(page, cdp, route))
    const k = f => med(rs.map(f)); out[name] = { ms: k(r => r.ms), p95: p95(rs.map(r => r.ms)), nodes: rs[0].nodes }
    console.log(`${name.padEnd(16)} ${fx(k(r => r.ms), 0).padStart(5)} ms  p95 ${fx(p95(rs.map(r => r.ms)), 0).padStart(5)}  script ${fx(k(r => r.script), 0).padStart(4)} layout ${fx(k(r => r.layout), 0).padStart(4)} estilo ${fx(k(r => r.style), 0).padStart(4)}  nodos ${rs[0].nodes}`)
  }
  return out
}
;(async () => {
  const browser = await launch(), ctx = await browser.newContext({ viewport: { width: prof.cpu > 1 ? 412 : 1440, height: prof.cpu > 1 ? 915 : 900 }, deviceScaleFactor: 1 })
  await blockFonts(ctx)
  const page = await ctx.newPage(), cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable'); await cdp.send('HeapProfiler.enable'); await cdp.send('Memory.getDOMCounters')
  const errs = []; page.on('pageerror', e => errs.push(e.message))
  await page.goto(url); await page.evaluate(() => localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false }))); await page.reload()
  await page.waitForSelector('#mgr-name'); const res = { profile: profName }
  res.start = await heap(page, cdp); console.log('Pantalla de inicio', JSON.stringify(res.start))
  await page.click('text=Siguiente ▸'); await page.click('text=Siguiente ▸'); await page.click('.clubcard:has(b:text-is("Independiente"))')
  const t0 = Date.now(); await page.click('text=Firmar contrato ▸'); await page.waitForSelector('.shell'); const newGameMs = Date.now() - t0
  await page.evaluate(() => { window.__ctx = () => { const root = document.getElementById('root'), ck = Object.keys(root).find(k => k.startsWith('__reactContainer')); const st = [root[ck].stateNode.current]; for (let n = 0; st.length && n < 8000; n++) { const f = st.pop(), v = f.memoizedProps?.value; if (v && v.g && v.nav && v.refresh) return v; if (f.sibling) st.push(f.sibling); if (f.child) st.push(f.child) } return null } })
  await sleep(300); console.log('Firmar contrato → Inicio (ms, incluye newGame y primer guardado):', newGameMs)
  if (prof.cpu > 1) await throttle(page, { cpu: prof.cpu, net: null })
  res.game0 = await heap(page, cdp); console.log('Partida nueva (Inicio)', JSON.stringify(res.game0))
  res.screens0 = await screens(page, cdp, 'partida nueva')
  const adv = async (n) => page.evaluate(async n => {
    const E = window.__eng, c = window.__ctx(), g = c.g, t0 = performance.now(), per = []
    for (let s = 0; s < n; s++) {
      if (s > 0) E.startNewSeason(g)
      while (!g.seasonOver) { g.board.fired = false; const a = performance.now(); const f = E.userFixtureToday(g); if (f) E.finishUserMatch(g, f, E.createMatch(g, f, false).runToEnd()); else E.advanceDay(g); per.push(performance.now() - a); if (g.press) E.advanceDay(g) }
    }
    c.refresh(); await new Promise(r => setTimeout(r, 200))
    const sorted = per.sort((a, b) => a - b)
    return { sec: (performance.now() - t0) / 1000, date: g.date, steps: per.length, medStep: sorted[Math.floor(sorted.length / 2)], p95Step: sorted[Math.floor(sorted.length * .95)], maxStep: sorted[sorted.length - 1], json: JSON.stringify(g).length / 1e6 }
  }, n)
  const a1 = await adv(1); console.log('\nTemporada 1 simulada en la página:', JSON.stringify(a1)); res.season1 = await heap(page, cdp); console.log('Tras 1 temporada', JSON.stringify(res.season1))
  res.screens1 = await screens(page, cdp, 'tras 1 temporada')
  const a3 = await adv(3).catch(e => ({ err: String(e) })) // arranca con la 1 terminada: startNewSeason + temporada 2, startNewSeason + temporada 3
  console.log('\nSegundas y siguientes:', JSON.stringify(a3)); res.season3 = await heap(page, cdp); console.log('Tras 3 temporadas', JSON.stringify(res.season3))
  res.screens3 = await screens(page, cdp, 'tras 3 temporadas')
  if (errs.length) console.log('ERRORES DE PÁGINA', errs.slice(0, 5))
  console.log('\nRESUMEN_JSON ' + JSON.stringify(res)); await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
