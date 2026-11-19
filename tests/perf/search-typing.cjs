// Latencia de tecla → pintado al escribir en el buscador global (App re-renderiza entero y escanea todos los jugadores en cada tecla).
// Necesita el build con window.__eng no hace falta; sirve cualquier build. Uso: node tests/perf/search-typing.cjs <url> <perfil>
const { installCtx, launch, sleep, med, p95, fx, PROFILES, throttle, blockFonts } = require('./pw.cjs')
const [url, profName = 'desktop'] = process.argv.slice(2), prof = PROFILES[profName]
;(async () => {
  const browser = await launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await blockFonts(ctx)
  const page = await ctx.newPage(); await page.goto(url); await page.evaluate(() => localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false }))); await page.reload(); await page.waitForSelector('#mgr-name')
  await page.click('text=Siguiente ▸'); await page.click('text=Siguiente ▸'); await page.click('.clubcard:has(b:text-is("Independiente"))'); await page.click('text=Firmar contrato ▸'); await page.waitForSelector('.shell')
  await throttle(page, { cpu: prof.cpu, net: null }); await sleep(300)
  await page.evaluate(() => { window.__lat = []; const el = document.getElementById('global-search'); el.addEventListener('input', e => { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => window.__lat.push(performance.now() - t0))) }) })
  await page.focus('#global-search')
  for (const ch of 'martinez') { await page.keyboard.type(ch); await sleep(250) }
  const lat = await page.evaluate(() => window.__lat)
  console.log(JSON.stringify({ profile: profName, teclas: lat.length, medianaMs: Math.round(med(lat)), p95Ms: Math.round(p95(lat)), maxMs: Math.round(Math.max(...lat)), porTecla: lat.map(x => Math.round(x)) }))
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
