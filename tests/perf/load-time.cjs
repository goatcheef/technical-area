// Tiempo de carga en frío con red y CPU emuladas.
// Uso: node tests/perf/load-time.cjs <url> <perfil: desktop|mobile4g|cpu4> <corridas> [archivo-de-partida.json]
// Mide: FCP, LCP, fin de descarga del JS, "pantalla de inicio interactiva" (#mgr-name, o el botón "Continuar partida" si hay partida guardada),
// tareas largas, y con partida guardada el tiempo de clic en "Continuar partida" hasta que se dibuja el Inicio (.shell + dos cuadros).
const fs = require('fs')
const { launch, sleep, med, p95, fx, stats, PROFILES, throttle, blockFonts } = require('./pw.cjs')
const [url, profName = 'desktop', runs = '7', savePath] = process.argv.slice(2)
const prof = PROFILES[profName], save = savePath ? fs.readFileSync(savePath, 'utf8') : null
const INIT = () => {
  window.__t = { long: [] }
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__t.long.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true })
  const mo = new MutationObserver(() => {
    const T = window.__t, now = performance.now()
    if (!T.start && document.querySelector('#mgr-name')) T.start = now
    if (!T.cont) { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Continuar partida'); if (b) T.cont = now }
    if (!T.shell && document.querySelector('.shell')) T.shell = now
  })
  mo.observe(document, { childList: true, subtree: true })
}
;(async () => {
  const browser = await launch(), rows = []
  for (let i = 0; i < Number(runs); i++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: profName !== 'desktop', hasTouch: profName !== 'desktop' })
    await blockFonts(ctx)
    const page = await ctx.newPage()
    await page.addInitScript(INIT)
    await page.addInitScript(() => { try { localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false })) } catch {} })
    if (save) {
      await page.route('**/__seed', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }))
      await page.goto(new URL('__seed', url).href)
      await page.evaluate(s => new Promise((res, rej) => { const r = indexedDB.open('technical-area', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => { const tx = r.result.transaction('saves', 'readwrite'); tx.objectStore('saves').put(s, 'auto'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) }; r.onerror = () => rej(r.error) }), save)
    }
    const cdp = await throttle(page, prof)
    await page.goto(url, { waitUntil: 'commit' })
    await page.waitForFunction(() => window.__t && (window.__t.start || window.__t.cont), null, { timeout: 120000 })
    await sleep(save ? 300 : 150)
    const m = await page.evaluate(() => {
      const T = window.__t, paint = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, p.startTime]))
      const nav = performance.getEntriesByType('navigation')[0], js = performance.getEntriesByType('resource').filter(r => /\.js(\?|$)/.test(r.name))
      return { fcp: paint['first-contentful-paint'], ready: T.cont || T.start, start: T.start, cont: T.cont, nav: { ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd }, jsEnd: Math.max(...js.map(r => r.responseEnd)), jsWire: js.reduce((t, r) => t + r.encodedBodySize, 0), jsRaw: js.reduce((t, r) => t + r.decodedBodySize, 0), long: T.long }
    })
    const row = { fcp: m.fcp, jsEnd: m.jsEnd, ready: m.ready, wire: m.jsWire, raw: m.jsRaw, ttfb: m.nav.ttfb, load: m.nav.load, longN: m.long.length, longSum: m.long.reduce((t, x) => t + x[1], 0), longMax: Math.max(0, ...m.long.map(x => x[1])), parse: m.ready - m.jsEnd }
    if (save) {
      const t = await page.evaluate(() => new Promise(res => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Continuar partida'), t0 = performance.now(), n0 = window.__t.long.length
        const poll = () => { if (window.__t.shell) requestAnimationFrame(() => requestAnimationFrame(() => res({ ms: performance.now() - t0, long: window.__t.long.slice(n0).reduce((s, x) => s + x[1], 0), nodes: document.getElementsByTagName('*').length }))); else setTimeout(poll, 4) }
        b.click(); poll()
      }))
      row.cont = t.ms; row.contLong = t.long; row.nodes = t.nodes
      // el botón apareció tras leer y parsear la partida de IndexedDB: tiempo entre el primer dibujo de la pantalla de inicio y el botón
      row.loadSave = m.cont - (m.start ?? m.cont)
    }
    rows.push(row); console.log(profName, i + 1, Object.entries(row).map(([k, v]) => `${k}=${fx(v, k === 'nodes' ? 0 : 0)}`).join(' '))
    await ctx.close()
  }
  const keys = Object.keys(rows[0]), agg = {}
  for (const k of keys) agg[k] = { mediana: med(rows.map(r => r[k])), p95: p95(rows.map(r => r[k])), min: Math.min(...rows.map(r => r[k])), max: Math.max(...rows.map(r => r[k])) }
  console.log('\nRESUMEN', JSON.stringify({ url, profName, runs: rows.length, save: !!savePath, agg }, (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)))
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
