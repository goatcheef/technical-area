// Prueba del aviso de guardado fallido: con `npm run dev` corriendo, `node tests/ui/guardado.cjs`.
// Guardado fallido: con indexedDB.open roto, el armazón muestra el aviso (role=alert) hasta el próximo guardado bueno.
const H = require('./helpers.cjs')
const { sleep } = H
const SHOTS = process.argv[2]
;(async () => {
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  let fails = 0
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) fails++ }
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { page, errs } = await H.newGame(browser, { club: 'Gimnasia (LP)', w, h })
    ok(!(await page.$('.save-alert')), `${w}: sin aviso con IndexedDB sano`)
    // el contexto del árbol vigente (las fibras de un nodo del DOM pueden ser las del render anterior)
    await page.evaluate(() => { window.__live = () => { const el = document.getElementById('root'), k = Object.keys(el).find(k => k.startsWith('__reactContainer')); const st = [el[k].stateNode.current]; while (st.length) { const f = st.pop(); const v = f.memoizedProps?.value; if (v && v.g && v.nav && 'lastSaveError' in v) return v; if (f.sibling) st.push(f.sibling); if (f.child) st.push(f.child) } return null } })
    // romper IndexedDB: open() falla como en navegación privada o sin espacio
    await page.evaluate(() => {
      window.__realOpen = indexedDB.open.bind(indexedDB)
      indexedDB.open = () => { const r = {}; setTimeout(() => { r.error = new DOMException('Sin espacio', 'QuotaExceededError'); r.onerror && r.onerror() }, 0); return r }
    })
    const okSave = await page.evaluate(() => window.__ctx().save())
    ok(okSave === false, `${w}: save() devuelve false`)
    await sleep(200)
    const txt = await page.textContent('.save-alert[role=alert]').catch(() => null)
    ok(txt && txt.includes('No se pudo guardar la partida. Lo que hiciste sigue en esta sesión; probá exportar la partida desde Ajustes.'), `${w}: aviso con role=alert y el texto pedido`)
    { const e = await page.evaluate(() => { const x = window.__live().lastSaveError; return x && { name: x.name, msg: x.message, inst: x instanceof Error } }); ok(e && e.name === 'SaveError', `${w}: lastSaveError en el contexto ${JSON.stringify(e)}`) }
    // sigue visible al navegar y al avanzar un día (otro guardado fallido)
    await page.click('.cta'); await sleep(300)
    if (await page.$('.modal button:has-text("Que hable el ayudante")')) { await page.click('.modal button:has-text("Que hable el ayudante")'); await sleep(150) }
    ok(!!(await page.$('.save-alert')), `${w}: el aviso sigue después de avanzar un día`)
    const vis = await H.visibility(page, '.save-alert')
    ok(vis[0]?.ok, `${w}: el aviso se ve entero ${JSON.stringify(vis[0]?.rect)} ${vis[0]?.why ?? ''}`)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/save-alert-${w}.png` })
    // cerrar
    await page.click('.save-alert button[aria-label="Cerrar aviso"]'); await sleep(150)
    ok(!(await page.$('.save-alert')), `${w}: se cierra con ✕`)
    // nueva falla después de cerrarlo: no reaparece hasta que un guardado salga bien
    await page.evaluate(() => window.__ctx().save()); await sleep(150)
    ok(!(await page.$('.save-alert')), `${w}: cerrado, no reaparece con otra falla seguida`)
    // reparar: el guardado bueno limpia el error
    await page.evaluate(() => { indexedDB.open = window.__realOpen })
    const good = await page.evaluate(() => window.__ctx().save()); await sleep(150)
    ok(good === true && await page.evaluate(() => window.__live().lastSaveError === null), `${w}: guardado bueno devuelve true y limpia lastSaveError`)
    // falla otra vez: el aviso vuelve
    await page.evaluate(() => { indexedDB.open = () => { const r = {}; setTimeout(() => { r.error = new Error('x'); r.onerror && r.onerror() }, 0); return r } })
    await page.evaluate(() => window.__ctx().save()); await sleep(150)
    ok(!!(await page.$('.save-alert')), `${w}: después de un guardado bueno, una falla nueva vuelve a mostrar el aviso`)
    ok(!errs.filter(e => !/No se pudo guardar/.test(e)).length, `${w}: sin errores de página ${errs.join(' | ')}`)
    await page.close()
  }
  await browser.close()
  console.log('FALLAS', fails); process.exit(fails ? 1 : 0)
})()
