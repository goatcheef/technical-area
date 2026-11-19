// Día de partido con la cancha 2D: tiempos de cuadro (rAF) y tareas largas a cada velocidad, con la cancha en pausa, y el avance "Ir al partido" / "Continuar".
// Necesita el build con window.__eng. Uso: node tests/perf/match-frames.cjs <url> <perfil: desktop|cpu4> [segundos por velocidad=20]
const { launch, sleep, med, p95, q, fx, PROFILES, throttle, blockFonts } = require('./pw.cjs')
const [url, profName = 'desktop', secs = '20'] = process.argv.slice(2)
const prof = PROFILES[profName], mobile = prof.cpu > 1
const INIT = () => {
  window.__f = { long: [], frames: [], on: false }
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__f.long.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true })
  let last = 0; const loop = t => { if (window.__f.on && last) window.__f.frames.push(t - last); last = t; requestAnimationFrame(loop) }; requestAnimationFrame(loop)
}
const m = async cdp => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]))
async function window_(page, cdp, ms, label) {
  await page.evaluate(() => { window.__f.frames = []; window.__f.long = []; window.__f.on = true })
  const a = await m(cdp); await sleep(ms); const b = await m(cdp)
  const r = await page.evaluate(() => { window.__f.on = false; return { frames: window.__f.frames, long: window.__f.long } })
  const fr = r.frames, s = ms / 1000
  const o = { label, fps: fr.length / s, p50: q(fr, .5), p95: q(fr, .95), p99: q(fr, .99), max: Math.max(...fr), over20: fr.filter(x => x > 20).length, over33: fr.filter(x => x > 33.4).length, over50: fr.filter(x => x > 50).length, frames: fr.length, longN: r.long.length, longSum: r.long.reduce((t, x) => t + x[1], 0), longMax: Math.max(0, ...r.long.map(x => x[1])), cpuPct: ((b.TaskDuration - a.TaskDuration) / s) * 100, scriptPct: ((b.ScriptDuration - a.ScriptDuration) / s) * 100 }
  console.log(`${label.padEnd(26)} fps ${fx(o.fps, 1)}  cuadro p50 ${fx(o.p50, 1)} p95 ${fx(o.p95, 1)} p99 ${fx(o.p99, 1)} máx ${fx(o.max, 0)} ms | >20ms ${o.over20} >33ms ${o.over33} >50ms ${o.over50} de ${o.frames} | tareas largas ${o.longN} (${fx(o.longSum, 0)} ms, máx ${fx(o.longMax, 0)}) | CPU del hilo ${fx(o.cpuPct, 0)}% (script ${fx(o.scriptPct, 0)}%)`)
  return o
}
;(async () => {
  const browser = await launch(), ctx = await browser.newContext({ viewport: mobile ? { width: 412, height: 915 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  await blockFonts(ctx)
  const page = await ctx.newPage(); await page.addInitScript(INIT); const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable')
  await page.addInitScript(() => { try { localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false, matchMode: 'full', matchSpeed: 1 })) } catch {} })
  await page.goto(url); await page.waitForSelector('#mgr-name')
  await page.click('text=Siguiente ▸'); await page.click('text=Siguiente ▸'); await page.click('.clubcard:has(b:text-is("Independiente"))'); await page.click('text=Firmar contrato ▸'); await page.waitForSelector('.shell')
  await page.evaluate(() => { window.__ctx = () => { const root = document.getElementById('root'), ck = Object.keys(root).find(k => k.startsWith('__reactContainer')); const st = [root[ck].stateNode.current]; for (let n = 0; st.length && n < 8000; n++) { const f = st.pop(), v = f.memoizedProps?.value; if (v && v.g && v.nav && v.refresh) return v; if (f.sibling) st.push(f.sibling); if (f.child) st.push(f.child) } return null } })
  await page.evaluate(() => { window.__ctx().g.delegate.press = true }) // que la prensa no frene el avance (el modal de conferencia no se mide acá)
  await throttle(page, { cpu: prof.cpu, net: null }); const res = { profile: profName }
  // --- avance: "Continuar" (un día) y "Ir al partido" ---
  const cont = []
  for (let i = 0; i < 6; i++) { cont.push(await page.evaluate(async () => { const b = [...document.querySelectorAll('button.cta')].find(x => /Continuar/.test(x.textContent)); const t0 = performance.now(); b.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0 })); await sleep(400) }
  console.log(`Continuar (un día): clic → 2 cuadros, mediana ${fx(med(cont), 0)} ms, p95 ${fx(p95(cont), 0)} ms (n=${cont.length})`); res.continuar = { med: med(cont), p95: p95(cont) }
  const trips = []
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { window.__f.frames = []; window.__f.long = []; window.__f.on = true })
    const r = await page.evaluate(async () => {
      const g = window.__ctx().g, d0 = g.date, t0 = performance.now(); const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Ir al partido'); if (!b) return null
      b.click(); await new Promise(r => setTimeout(r, 60))
      while (document.querySelector('.advancing') && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 15))
      return { ms: performance.now() - t0, d0, d1: g.date, atMatch: !!window.__eng.userFixtureToday(g) }
    })
    const fr = await page.evaluate(() => { window.__f.on = false; return { f: window.__f.frames, l: window.__f.long } })
    if (!r) break
    const days = Math.round((Date.parse(r.d1) - Date.parse(r.d0)) / 864e5), wait = days * 45
    trips.push({ ms: r.ms, days, perDay: (r.ms - wait) / Math.max(1, days), longMax: Math.max(0, ...fr.l.map(x => x[1])), longN: fr.l.length, p95f: q(fr.f, .95), maxf: Math.max(...fr.f), atMatch: r.atMatch })
    console.log(`Ir al partido #${i + 1}: ${days} días en ${fx(r.ms, 0)} ms (pausa fija 45 ms/día = ${wait} ms; resto ${fx(r.ms - wait, 0)} ms = ${fx(trips[i].perDay, 1)} ms/día) | tareas largas ${trips[i].longN} (máx ${fx(trips[i].longMax, 0)} ms) | cuadro p95 ${fx(trips[i].p95f, 0)} máx ${fx(trips[i].maxf, 0)} ms | en día de partido: ${r.atMatch}`)
    // jugar el partido de hoy por el motor para llegar al próximo tramo
    if (i < 2) { await page.evaluate(() => { const E = window.__eng, c = window.__ctx(), g = c.g, f = E.userFixtureToday(g); if (f) E.finishUserMatch(g, f, E.createMatch(g, f, false).runToEnd()); c.refresh() }); await sleep(300) }
  }
  // llegar al día de partido si el último tramo no terminó ahí (decisión o fin de fecha en el medio)
  for (let k = 0; k < 8; k++) { const at = await page.evaluate(() => !!window.__eng.userFixtureToday(window.__ctx().g)); if (at) break; await page.evaluate(async () => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Ir al partido'); if (b) { b.click(); await new Promise(r => setTimeout(r, 60)); while (document.querySelector('.advancing')) await new Promise(r => setTimeout(r, 15)) } }); await sleep(200) }
  res.irAlPartido = trips
  // --- día de partido ---
  await page.evaluate(() => window.__ctx().nav({ page: 'home' }))
  const mount = await page.evaluate(async () => { const b = [...document.querySelectorAll('button.cta')].find(x => /Jugar/.test(x.textContent)); const c = window.__ctx(), n = window.__eng.sameRound(c.g, window.__eng.userFixtureToday(c.g)).length, t0 = performance.now(); b.click(); while (!document.querySelector('.mboard')) await new Promise(r => setTimeout(r, 4)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return { ms: performance.now() - t0, others: n, nodes: document.getElementsByTagName('*').length } })
  console.log(`\nAbrir el día de partido (createMatch propio + ${mount.others} partidos de la fecha): ${fx(mount.ms, 0)} ms, ${mount.nodes} nodos DOM`); res.mount = mount
  await sleep(500); res.paused = await window_(page, cdp, 5000, 'En pausa (antes del 1er min)')
  const speeds = [['▶ Normal', 'Normal (1×)'], ['▶▶ Rápido', 'Rápido (2×)'], ['▶▶▶ Muy rápido', 'Muy rápido (5×)']]
  res.speeds = {}
  for (const [btn, name] of speeds) {
    const press = () => page.evaluate(b => { const x = [...document.querySelectorAll('.seg button')].find(y => y.textContent.trim() === b); if (x) x.click() }, btn)
    await press(); await sleep(600)
    // si el partido se pausó (entretiempo, final, lesión), se reanuda
    const t = setInterval(async () => { try { const live = await page.evaluate(() => !!document.querySelector('.mb-clock.live')); if (!live) await press() } catch {} }, 1500)
    res.speeds[name] = await window_(page, cdp, Number(secs) * 1000, name); clearInterval(t)
  }
  // pausa en medio del partido: ¿la cancha sigue redibujando sin cambios?
  await page.evaluate(() => { const x = [...document.querySelectorAll('.seg button')].find(y => y.textContent.trim() === '⏸ Pausa'); if (x) x.click() }); await sleep(600)
  res.pausedMid = await window_(page, cdp, 5000, 'Pausa a mitad de partido')
  const fin = await page.evaluate(async () => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Ir al final'); if (!b) return null; const t0 = performance.now(); b.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0 })
  console.log(`"Ir al final" (resto del partido + otros): ${fx(fin, 0)} ms`); res.irAlFinal = fin
  const done = await page.evaluate(async () => { const b = [...document.querySelectorAll('button.cta')].find(x => /Continuar/.test(x.textContent)); if (!b) return null; const t0 = performance.now(); b.click(); while (document.querySelector('.mboard') && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 4)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0 })
  console.log(`Continuar tras el partido (finishUserMatch + guardado + flujo posterior): ${fx(done, 0)} ms`); res.finish = done
  console.log('\nRESUMEN_JSON ' + JSON.stringify(res)); await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
