// Memoria con una partida guardada cargada en un navegador recién abierto (sin la basura de haber simulado temporadas en la página): heap de JS tras GC, nodos y RSS del renderer.
// Uso: node tests/perf/memory-loaded.cjs <url> <partida.json>...
const fs = require('fs'), { execSync } = require('child_process')
const { installCtx, launch, sleep, blockFonts } = require('./pw.cjs')
const rss = () => Math.max(...execSync("ps -eo rss,args | grep -- '--type=renderer' | grep -v grep | awk '{print $1}'").toString().trim().split('\n').map(Number)) / 1024
;(async () => {
  for (const f of process.argv.slice(3)) {
    const browser = await launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await blockFonts(ctx)
    const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page); await cdp.send('HeapProfiler.enable')
    await page.addInitScript(() => { try { localStorage.setItem('ta-settings', JSON.stringify({ tourDone: true, tips: false })) } catch {} })
    await page.route('**/__seed', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }))
    await page.goto(new URL('__seed', process.argv[2]).href)
    await page.evaluate(s => new Promise((res, rej) => { const r = indexedDB.open('technical-area', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => { const tx = r.result.transaction('saves', 'readwrite'); tx.objectStore('saves').put(s, 'auto'); tx.oncomplete = () => res() } }), fs.readFileSync(f, 'utf8'))
    await page.goto(process.argv[2]); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continuar partida'))
    await page.click('text=Continuar partida'); await page.waitForSelector('.shell'); await installCtx(page); await sleep(800)
    const sample = async () => { await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('HeapProfiler.collectGarbage'); await sleep(300); const h = await cdp.send('Runtime.getHeapUsage'); return { heapMB: +(h.usedSize / 1048576).toFixed(1), rssMB: Math.round(rss()) } }
    const home = await sample()
    for (const p of ['squad', 'locker', 'market', 'data', 'stats', 'inbox']) { await page.evaluate(p => window.__ctx().nav({ page: p, tab: p === 'market' ? 'buscar' : p === 'data' ? 'jugadores' : undefined }), p); await sleep(400) }
    const after = await sample()
    console.log(JSON.stringify({ partida: f.split('/').pop(), MB: +(fs.statSync(f).size / 1e6).toFixed(2), inicio: home, trasRecorrerPantallas: after }))
    await browser.close()
  }
})().catch(e => { console.error(e); process.exit(1) })
