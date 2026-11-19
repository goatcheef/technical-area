// Guardado "peor caso": repite saveGame (misma lógica que src/store.ts: open + put(JSON.stringify(g))) sobre la partida tal como quedó (p. ej. fin de temporada, con todos los
// partidos y eventos). Uso: node tests/perf/save-direct.cjs <url> <perfil> <partida.json> [repeticiones=12]
const fs = require('fs')
const { installCtx, launch, sleep, med, p95, fx, PROFILES, throttle, blockFonts } = require('./pw.cjs')
const [url, profName = 'desktop', savePath, reps = '12'] = process.argv.slice(2)
const prof = PROFILES[profName], save = fs.readFileSync(savePath, 'utf8')
;(async () => {
  const browser = await launch(), ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await blockFonts(ctx)
  const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false })) } catch {} })
  await page.route('**/__seed', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }))
  await page.goto(new URL('__seed', url).href)
  await page.evaluate(s => new Promise((res, rej) => { const r = indexedDB.open('technical-area', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => { const tx = r.result.transaction('saves', 'readwrite'); tx.objectStore('saves').put(s, 'auto'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) } }), save)
  await page.goto(url); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continuar partida'))
  await page.click('text=Continuar partida'); await page.waitForSelector('.shell'); await installCtx(page); await throttle(page, { cpu: prof.cpu, net: null }); await sleep(400)
  const r = await page.evaluate(async n => {
    const g = window.__ctx().g, out = []
    for (let i = 0; i < n; i++) {
      const t0 = performance.now(); const s = JSON.stringify(g); const t1 = performance.now()
      const db = await new Promise((res, rej) => { const q = indexedDB.open('technical-area', 1); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) })
      await new Promise((res, rej) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(s, 'auto'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
      out.push({ str: t1 - t0, rest: performance.now() - t1, len: s.length }); db.close(); await new Promise(r => setTimeout(r, 50))
    }
    return out
  }, Number(reps))
  const tot = r.map(x => x.str + x.rest)
  console.log(JSON.stringify({ profile: profName, save: savePath.split('/').pop(), MB: r[0].len / 1e6, stringifyMed: med(r.map(x => x.str)), openPutCompleteMed: med(r.map(x => x.rest)), totalMed: med(tot), totalP95: p95(tot) }, (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)))
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
