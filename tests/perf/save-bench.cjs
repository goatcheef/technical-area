// Guardado y carga de la partida en el navegador, por el camino real de la app (store.ts): instrumenta JSON.stringify / JSON.parse de más de 1 MB
// y las llamadas a IndexedDB. Uso: node tests/perf/save-bench.cjs <url> <perfil> <partida.json> [días=12]
// Mide: carga (get + parse), y por cada clic en "Continuar" (un día): stringify, put síncrono, transacción completa y latencia del clic hasta 2 cuadros.
const fs = require('fs')
const { installCtx, launch, sleep, med, p95, fx, PROFILES, throttle, blockFonts } = require('./pw.cjs')
const [url, profName = 'desktop', savePath, days = '12'] = process.argv.slice(2)
const prof = PROFILES[profName], save = fs.readFileSync(savePath, 'utf8')
const INIT = () => {
  window.__m = { str: [], parse: [], put: [], get: [] }
  const S = JSON.stringify; JSON.stringify = function (...a) { const t = performance.now(), r = S.apply(this, a); if (r && r.length > 1e6) window.__m.str.push({ ms: performance.now() - t, len: r.length }); return r }
  const P = JSON.parse; JSON.parse = function (...a) { const t = performance.now(), r = P.apply(this, a); if (typeof a[0] === 'string' && a[0].length > 1e6) window.__m.parse.push({ ms: performance.now() - t, len: a[0].length }); return r }
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (v, k) { const t = performance.now(), r = put.call(this, v, k), sync = performance.now() - t, tx = this.transaction; if (typeof v === 'string' && v.length > 1e6) tx.addEventListener('complete', () => window.__m.put.push({ sync, total: performance.now() - t })); return r }
  const get = IDBObjectStore.prototype.get
  IDBObjectStore.prototype.get = function (k) { const t = performance.now(), r = get.call(this, k); r.addEventListener('success', () => window.__m.get.push({ ms: performance.now() - t })); return r }
}
;(async () => {
  const browser = await launch(), ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await blockFonts(ctx)
  const page = await ctx.newPage(); await page.addInitScript(INIT)
  await page.addInitScript(() => { try { localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false })) } catch {} })
  await page.route('**/__seed', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }))
  await page.goto(new URL('__seed', url).href)
  await page.evaluate(s => new Promise((res, rej) => { const r = indexedDB.open('technical-area', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => { const tx = r.result.transaction('saves', 'readwrite'); tx.objectStore('saves').put(s, 'auto'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) } }), save)
  await page.evaluate(() => { window.__m = { str: [], parse: [], put: [], get: [] } })
  await page.goto(url); const cdp = await throttle(page, prof)
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continuar partida'))
  const load = await page.evaluate(() => ({ get: window.__m.get.map(x => x.ms), parse: window.__m.parse.map(x => x.ms) }))
  await page.click('text=Continuar partida'); await page.waitForSelector('.shell'); await installCtx(page); await sleep(500)
  // las partidas de fin de temporada se pasan a la temporada siguiente con el motor (el botón diría "Nueva temporada", que no es un día)
  await page.evaluate(async () => { const E = window.__eng, c = window.__ctx(); if (c.g.seasonOver) { E.startNewSeason(c.g); c.refresh(); await new Promise(r => setTimeout(r, 500)) } })
  await page.evaluate(() => { window.__m.str.length = 0; window.__m.put.length = 0 })
  const lat = []
  for (let i = 0; i < Number(days); i++) {
    // un día: clic en el botón primario (Continuar); si hoy hay partido el botón dice "Jugar": se lo salta con el motor
    const r = await page.evaluate(async () => {
      const E = window.__eng, c = window.__ctx(), g = c.g
      const f = E?.userFixtureToday?.(g); if (f && E) { E.finishUserMatch(g, f, E.createMatch(g, f, false).runToEnd()); c.refresh(); await new Promise(r => setTimeout(r, 30)) }
      const b = [...document.querySelectorAll('button.cta')].find(x => /Continuar/.test(x.textContent)); if (!b) return null
      const t0 = performance.now(); b.click(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); return performance.now() - t0
    })
    if (r != null) lat.push(r); await sleep(700)
  }
  const m = await page.evaluate(() => window.__m)
  const o = { profile: profName, save: savePath.split('/').pop(), loadGetMs: med(load.get), loadParseMs: med(load.parse), saves: m.put.length, stringifyMed: med(m.str.map(x => x.ms)), stringifyP95: p95(m.str.map(x => x.ms)), putSyncMed: med(m.put.map(x => x.sync)), putTotalMed: med(m.put.map(x => x.total)), putTotalP95: p95(m.put.map(x => x.total)), clickToPaintMed: med(lat), clickToPaintP95: p95(lat), clickToPaintMax: Math.max(...lat), len: m.str[0]?.len }
  console.log(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v))); await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
