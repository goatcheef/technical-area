// Prueba de aceptación de la bandeja (design/ux/bandeja.md, sección 14, más las decisiones de la fase 5).
// Uso: con `npm run dev` corriendo en el puerto 5173, `node tests/ui/bandeja.cjs [ancho×alto …]`.
// Sin argumentos corre en 1440×900, 1024×768, 820×1000, 390×844 y 320×568, y saca las capturas finales.
// Cada botón y cada foco se comprueban VISIBLES (elementFromPoint en el centro y en cuatro puntos interiores, dentro de la
// ventana), no solo "clickeables": Playwright hace clic en elementos recortados por overflow y eso escondió la barra de acciones.
// Variables: AXE=ruta de axe.min.js (opcional, para axe-core), SHOTS=0 para no sacar capturas.
const fs = require('fs')
const path = require('path')
const H = require('./helpers.cjs')
const { sleep } = H

const ROOT = path.resolve(__dirname, '../..')
const SHOTS = path.join(ROOT, 'production/ui/bandeja/shots/final')
const takeShots = process.env.SHOTS !== '0'
const AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? fs.readFileSync(process.env.AXE, 'utf8') : null
const SIZES = process.argv.slice(2).length ? process.argv.slice(2).map(s => s.split(/[x×]/).map(Number)) : [[1440, 900], [1024, 768], [820, 1000], [390, 844], [320, 568]]

/** Lleva el elemento a la vista dentro de su contenedor (como lo haría el jugador) y comprueba que se vea entero. */
async function seen(page, sel) {
  await page.evaluate(s => document.querySelectorAll(s).forEach(e => e.scrollIntoView({ block: 'nearest' })), sel)
  await sleep(60)
  return H.visibility(page, sel)
}
/** Clic real del mouse en el centro, solo si el elemento se ve (si no, falla sin hacer clic). */
async function realClick(page, sel) {
  const [v] = await seen(page, sel)
  if (!v || !v.ok) return v ?? { ok: false, why: 'no existe', name: sel }
  await page.mouse.click(v.rect[0] + v.rect[2] / 2, v.rect[1] + v.rect[3] / 2)
  await sleep(150)
  return v
}
const allOk = vs => vs.length > 0 && vs.every(v => v.ok)
const why = vs => vs.filter(v => !v.ok).map(v => `${v.name}: ${v.why} ${JSON.stringify(v.rect ?? '')}`).join(' | ')
const route = page => page.evaluate(() => { const r = window.__ctx().route; return { page: r.page, sel: r.sel ?? null, tab: r.tab ?? null } })
const pending = page => page.evaluate(() => { const g = window.__ctx().g; return { offers: g.offers.map(o => `offer${o.id}`), jobs: (g.jobOffers ?? []).filter(j => j.until >= g.date).map(j => `job${j.clubId}`) } })
async function closePress(page) {
  const b = await page.$('.modal button:has-text("Que hable el ayudante")')
  if (b) { await b.click(); await sleep(150); return true }
  return false
}
async function setSingle(page, on) {
  await page.evaluate(on => { const c = window.__ctx(); c.setSettings({ ...c.settings, singleKeys: on }) }, on)
  await sleep(120)
}
/** Recorre con Tab desde el elemento enfocado y comprueba que cada parada dentro de `scope` se vea entera (2.4.11). */
async function tabWalk(page, scope, max = 24) {
  const bad = [], seenNames = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab'); await sleep(70)
    const inScope = await page.evaluate(s => !!document.activeElement?.closest(s), scope)
    if (!inScope) break
    const f = await H.focusVisible(page)
    seenNames.push(f.name)
    if (!f.ok) bad.push(`${f.name} (${f.vis}/5 puntos) ${JSON.stringify(f.rect)}`)
  }
  return { bad, n: seenNames.length }
}

async function run(browser, w, h) {
  const tag = `${w}×${h} · `
  const { ok, res } = H.reporter(tag)
  const narrow = w <= 900, phone = w <= 760
  const { page, errs } = await H.newGame(browser, { w, h, touch: phone })

  // ---------- revisión de código ----------
  if (w === SIZES[0][0]) {
    const src = fs.readFileSync(path.join(ROOT, 'src/ui/Inbox.tsx'), 'utf8')
    ok('Inbox.tsx no asigna n.read =, g.jobOffers =, .listed =', !/\.read\s*=[^=]|g\.jobOffers\s*=[^=]|\.listed\s*=[^=]/.test(src))
    ok('Inbox.tsx no agrega oyentes en window ni atajos de una tecla', !/window\.addEventListener\('key/.test(src) && !/e\.key === '[a-z0-9/?]'/.test(src))
    ok('La envoltura de acciones no usa la clase global .bar', !/ib-actwrap \$\{[^}]*'bar'/.test(src) && /'ib-actbar'/.test(src))
  }

  // ---------- AC-02: el avance frena el día anterior a que venza algo pendiente ----------
  const d0 = await H.dateOf(page)
  await H.mutate(page, g => { g.offers = []; g.jobOffers = [] })
  const kA = (await H.injectDecisions(page, { job: false, out: false, offerDays: 1 })).offer
  await page.evaluate(() => window.__ctx().nav({ page: 'home' })); await sleep(150)
  await page.click('button[aria-label="Ir al partido"]'); await H.waitIdle(page); await closePress(page); await sleep(200)
  let d1 = await H.dateOf(page), r1 = await route(page), p1 = await pending(page)
  ok('AC-02: "Ir al partido" frena el día anterior al vencimiento de una oferta pendiente (no nueva) y la abre elegida', r1.page === 'inbox' && r1.sel === kA && p1.offers.includes(kA), `fecha ${d0} → ${d1}; ruta ${JSON.stringify(r1)}`)
  const vA = narrow ? await page.evaluate(() => document.querySelector('.ib-detail .ib-h')?.textContent ?? '') : await H.selKey(page)
  ok('AC-02: la bandeja muestra esa oferta ("Vence hoy")', narrow ? /ofrece/.test(vA) && /Vence hoy/.test(await page.textContent('.ib-read')) : vA === kA && /Vence hoy/.test(await page.textContent('.ib-read')), narrow ? vA : `elegida ${vA}`)
  await page.click('button[aria-label="Ir al partido"]'); await H.waitIdle(page); await closePress(page); await sleep(200)
  const d2 = await H.dateOf(page)
  ok('AC-02: el freno es una sola vez: el siguiente "Ir al partido" avanza', d2 > d1, `${d1} → ${d2}`)
  // vence hoy y no se avisó (se llegó con Continuar): no avanza, abre la bandeja
  await H.mutate(page, g => { g.offers = []; g.jobOffers = [] })
  const kB = (await H.injectDecisions(page, { offer: false, out: false, jobDays: 0 })).job
  await page.evaluate(() => window.__ctx().nav({ page: 'home' })); await sleep(150)
  const d3 = await H.dateOf(page)
  if (await page.$('button[aria-label="Ir al partido"]')) {
    await page.click('button[aria-label="Ir al partido"]'); await H.waitIdle(page); await sleep(200)
    const r3 = await route(page), d4 = await H.dateOf(page)
    ok('AC-02: con una oferta de trabajo que vence hoy, "Ir al partido" no avanza y la abre elegida', d4 === d3 && r3.page === 'inbox' && r3.sel === kB, `fecha ${d3} → ${d4}; ${JSON.stringify(r3)}`)
  } else ok('AC-02: oferta de trabajo que vence hoy', null, 'hoy hay partido: no aparece "Ir al partido"')
  await H.mutate(page, g => { g.offers = []; g.jobOffers = []; for (const p of Object.values(g.players)) p.wantsOut = false })

  // ---------- decisiones para el resto de la prueba ----------
  const keys = await H.injectDecisions(page)
  // 320 mensajes viejos (ya leídos) para "Mostrar más", la selección después de 150 y el scroll
  await H.mutate(page, (g, h) => {
    const p = Object.values(g.players).find(x => x.clubId === g.userClubId)
    // más viejos que todo lo que hay: la lista llega ordenada del más nuevo al más viejo, como la arma el motor
    let id = g.nextId; g.nextId += 320
    const oldest = g.news.reduce((m, n) => (n.date < m ? n.date : m), g.date)
    for (let i = 0; i < 320; i++) g.news.push({ id: id++, date: h.add(oldest, -1 - Math.floor(i / 8)), me: true, read: true, tag: 'club', clubId: g.userClubId, pid: p.id, title: `Informe del cuerpo técnico n.º ${i + 1}`, body: 'Mensaje de relleno para la prueba.' })
  })

  // ---------- propósito: bloque, orden, insignia ----------
  await H.openInbox(page, undefined, 'club.torneos')
  const blk = await page.evaluate(() => { const r = document.querySelector('.ib-block-h')?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null })
  ok('Con "Torneos" elegido, "Para decidir · 3" se ve arriba sin desplazar', !!blk && blk.bottom <= h && blk.top >= 0 && /Para decidir\s*3/.test(await page.textContent('.ib-block-h')), JSON.stringify(blk))
  const order = await page.evaluate(() => [...document.querySelectorAll('.ib-dec')].map(r => r.getAttribute('data-k')))
  ok('Bloque ordenado por plazo (trabajo a 6 días, oferta a 8, quiere irse sin plazo)', order.join() === [keys.job, keys.offer, keys.out].join(), order.join(', '))
  const badge = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[data-page="inbox"] .dot')].find(x => x.getBoundingClientRect().width)
    if (!d) return null
    const cs = getComputedStyle(d)
    return { text: d.querySelector('[aria-hidden]')?.textContent, size: parseFloat(cs.fontSize), vh: d.querySelector('.vh')?.textContent }
  })
  ok('Insignia: 12 px o más, "!" cuando hay decisiones y nombre "N sin leer y M para decidir"', !!badge && badge.size >= 12 && badge.text.startsWith('!') && /para decidir/.test(badge.vh), JSON.stringify(badge))
  const bd = await page.evaluate(() => { const g = window.__ctx().g; return g.news.filter(n => n.act === 'offer' && !n.read).length })
  ok('Oferta nueva sin abrir: cuenta una sola vez en la insignia', /!\d+/.test(badge?.text ?? '') && bd >= 1, `insignia ${badge?.text}`)

  // ---------- la oferta: botones visibles, confirmación, rechazo ----------
  await H.openInbox(page, keys.offer, 'club.todo')
  if (narrow) await page.waitForSelector('.ib-detail')
  const acts = await seen(page, '.ib-read .ib-acts > .btn')
  ok('Oferta: cada botón de acción se ve entero (elementFromPoint, dentro de la ventana, sin barras encima)', allOk(acts), acts.length ? why(acts) || acts.map(a => a.name).join(', ') : 'sin botones')
  ok(`Oferta: ${narrow ? 'Aceptar sola en la fila 1; Pedir más y Rechazar en la fila 2; Ver la ficha en el contenido' : 'Aceptar, Pedir más, Ver la ficha y Rechazar (peligro al final)'}`,
    narrow ? acts.length === 3 && acts[0].name === 'Aceptar' && acts[1].rect[1] > acts[0].rect[1] + 20 && acts[1].rect[1] === acts[2].rect[1] && !!(await page.$('.ib-links button:has-text("Ver la ficha")'))
      : acts.map(a => a.name).join() === 'Aceptar,Pedir más,Ver la ficha,Rechazar' && acts[3].rect[0] > acts[2].rect[0] + 100, acts.map(a => `${a.name}@${a.rect}`).join(' '))
  const actH = await page.evaluate(() => Math.round(document.querySelector('.ib-acts')?.getBoundingClientRect().height ?? 0))
  ok('La fila de acciones mide 38 px o más (no queda recortada)', actH >= 38, `${actH} px`)
  const help = await seen(page, '.ib-read .ib-help')
  ok('La ayuda de "Pedir más" se ve', allOk(help), why(help))
  if (phone) {
    const small = await page.evaluate(() => [...document.querySelectorAll('.ib-detail button, .ib-detail .ib-who')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 16), Math.round(r.width), Math.round(r.height)] }).filter(([, w, h]) => w && (w < 44 || h < 44)))
    ok('Celular: objetivos táctiles de 44 × 44 o más en el detalle', small.length === 0, JSON.stringify(small))
  }
  if (takeShots && (w === 1440 || w === 390)) await page.screenshot({ path: path.join(SHOTS, w === 1440 ? 'escritorio-decision.png' : 'celular-detalle-oferta.png') })
  // Tab por el panel: cada parada se ve (2.4.11)
  await page.focus('.ib-read .ib-h'); const tw = await tabWalk(page, narrow ? '.ib-detail' : '.ib-read')
  ok('Tab por el panel: cada parada con foco se ve entera, ninguna tapada por las barras fijas', tw.n > 2 && tw.bad.length === 0, `${tw.n} paradas${tw.bad.length ? ' · ' + tw.bad.join(' | ') : ''}`)
  // Aceptar abre la confirmación; Esc vuelve
  const acc = await realClick(page, '.ib-read .ib-acts > [data-primary]')
  const conf = await H.visibility(page, '.ib-read .ib-confirm .btn')
  const focusC = await page.evaluate(() => document.activeElement?.textContent ?? '')
  ok('Aceptar (clic real) abre "Confirmar: vender a …" con el foco; la confirmación y "No" se ven', acc.ok && allOk(conf) && focusC.startsWith('Confirmar: vender a'), `${focusC} · ${why(conf)}`)
  ok('La confirmación no se sale de costado', conf.every(v => v.rect && v.rect[0] >= 0 && v.rect[0] + v.rect[2] <= w), conf.map(v => v.rect).join(' '))
  if (takeShots && w === 1440) await page.screenshot({ path: path.join(SHOTS, 'escritorio-confirmacion.png') })
  if (takeShots && w === 390) await page.screenshot({ path: path.join(SHOTS, 'celular-confirmacion.png') })
  await page.keyboard.press('Escape'); await sleep(150)
  const back1 = await page.evaluate(() => document.activeElement?.textContent ?? '')
  ok('Esc cancela la confirmación y devuelve el foco a Aceptar', back1 === 'Aceptar' && !(await page.$('.ib-confirm')), back1)
  // Rechazar: dos clics, nota, Resuelto, Siguiente pendiente con foco
  const title0 = await page.textContent('.ib-read .ib-h')
  const rej = await realClick(page, '.ib-read .ib-acts > .btn.danger')
  const still = (await pending(page)).offers.includes(keys.offer)
  const conf2 = await realClick(page, '.ib-read .ib-confirm .btn.danger')
  const st = await page.evaluate(() => ({ status: document.querySelector('.ib-read [role=status]')?.textContent ?? '', focus: document.activeElement?.textContent ?? '', title: document.querySelector('.ib-read .ib-h')?.textContent }))
  ok('Rechazar toma 2 clics reales (Rechazar, Confirmar rechazo) y uno solo no decide', rej.ok && conf2.ok && still && !(await pending(page)).offers.includes(keys.offer), `${rej.why || ''} ${conf2.why || ''}`)
  const note = await seen(page, '.ib-read .ib-result'), next = await H.visibility(page, '.ib-read [data-next]')
  ok('Tras confirmar: la nota y "Siguiente pendiente" se ven, el foco está en "Siguiente pendiente" y el panel no salta', /Rechazaste/.test(st.status) && allOk(note) && allOk(next) && /Siguiente pendiente/.test(st.focus) && st.title === title0, `${st.status} · foco ${st.focus} · ${why([...note, ...next])}`)
  if (!narrow) ok('La fila pasa a "✓ Resuelto"', /Resuelto/.test(await page.textContent(`[data-k="${keys.offer}"]`)))
  if (takeShots && w === 1440) await page.screenshot({ path: path.join(SHOTS, 'escritorio-resuelto.png') })
  if (takeShots && w === 390) await page.screenshot({ path: path.join(SHOTS, 'celular-resuelto.png') })

  // ---------- oferta de trabajo: textos ----------
  await H.mutate(page, g => { const mine = Object.values(g.players).filter(p => p.clubId === g.userClubId); const o = Object.values(g.clubs).find(c => c.division === 1 && c.id !== g.userClubId); g.offers.push({ id: 990001, pid: mine[4].id, from: o.id, fromName: o.name, fee: 1000000, date: g.date }) })
  await H.openInbox(page, keys.job)
  const jt = await page.textContent('.ib-read')
  const conseq = await page.textContent('.ib-conseq').catch(() => '')
  ok('Trabajo: "Respondé hasta el …" y "dirigís … desde mañana"', /Respondé hasta el/.test(jt) && /desde mañana/.test(jt) && !/Respondé antes del/.test(jt))
  ok('Trabajo: consecuencias con concordancia ("se cancela la oferta por tu jugador")', /Si aceptás, se cancela la oferta por tu jugador/.test(conseq) && !/se cancelan 1 /.test(conseq), conseq)
  const jacts = await seen(page, '.ib-read .ib-acts > .btn')
  ok('Trabajo: Aceptar, Ver el club y Rechazar se ven', allOk(jacts) && jacts.length === 3, why(jacts))
  const cv = await seen(page, '.ib-conseq')
  ok('Trabajo: la línea de consecuencias se ve', allOk(cv), why(cv))
  if (!narrow) {
    // durante el avance: los de decisión se deshabilitan, los de lectura no
    const dis = await page.evaluate(() => [...document.querySelectorAll('.ib-read .ib-acts > .btn')].map(b => [b.textContent, b.disabled]))
    ok('Sin avance en curso, ningún botón de la decisión está deshabilitado', dis.every(([, d]) => !d), JSON.stringify(dis))
  }

  // ---------- selección más allá de 150, scroll y "Mostrar más" ----------
  if (!narrow) {
    await H.openInbox(page, undefined, 'club.todo')
    for (let i = 0; i < 2; i++) { const m = await page.$('.ib-more'); if (m) { await m.click(); await sleep(200) } }
    const lastFocus = await page.evaluate(() => ({ k: document.activeElement?.getAttribute('data-k'), tag: document.activeElement?.tagName, more: !!document.querySelector('.ib-more'), last: [...document.querySelectorAll('.msg.ib-opt')].pop()?.getAttribute('data-k') }))
    ok('"Mostrar más" con lo último: el foco pasa a la última fila, no a body', !lastFocus.more && lastFocus.k === lastFocus.last, JSON.stringify(lastFocus))
    const k200 = await page.evaluate(() => [...document.querySelectorAll('.msg.ib-opt:not(.ib-dec)')][200]?.getAttribute('data-k'))
    await page.click(`[data-k="${k200}"]`); await sleep(200)
    await page.evaluate(k => document.querySelector(`[data-k="${k}"]`).scrollIntoView({ block: 'center' }), k200); await sleep(100)
    const top0 = await page.evaluate(() => document.querySelector('.ib-list').scrollTop)
    await page.click('.ib-read .ib-who'); await sleep(250)
    await page.keyboard.press('Alt+ArrowLeft'); await sleep(350)
    const back = await page.evaluate(() => ({ sel: document.querySelector('[role=option][aria-selected=true]')?.getAttribute('data-k'), top: document.querySelector('.ib-list')?.scrollTop, focus: document.activeElement?.getAttribute('data-k') }))
    ok('Volver de una ficha: la misma selección (fila 200, después de las primeras 150) y el mismo scroll de la lista', back.sel === k200 && Math.abs(back.top - top0) <= 2, `elegida ${back.sel} (antes ${k200}) · scroll ${top0} → ${back.top} · foco ${back.focus}`)
    // rendimiento (servidor de desarrollo, React en modo desarrollo: los umbrales de la especificación son para producción, acá se usan el doble)
    const perf = await page.evaluate(async () => {
      const c = window.__ctx(), frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      c.nav({ page: 'home' }); await new Promise(r => setTimeout(r, 150))
      const t0 = performance.now(); c.nav({ page: 'inbox', tab: 'club.todo' }); await frame(); const first = performance.now() - t0
      await new Promise(r => setTimeout(r, 300))
      const ts = []
      for (let i = 0; i < 30; i++) { const el = document.querySelector('[role=option][tabindex="0"]'); const t = performance.now(); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await frame(); ts.push(performance.now() - t) }
      ts.sort((a, b) => a - b)
      return { n: window.__ctx().g.news.length, first: Math.round(first), med: Math.round(ts[15]), p95: Math.round(ts[28]) }
    })
    ok('Rendimiento (desarrollo): primer cuadro < 200 ms y ↓ < 100 ms (p95) con ~320 mensajes', perf.first < 200 && perf.p95 < 100, JSON.stringify(perf))
  } else {
    // la fila que se leía puede estar después de las primeras 150: al volver del detalle se carga hasta ella y recibe el foco
    await H.openInbox(page, undefined, 'club.todo')
    const m = await page.$('.ib-more'); if (m) { await m.click(); await sleep(200) }
    const k200 = await page.evaluate(() => [...document.querySelectorAll('.msg.ib-opt:not(.ib-dec)')][200]?.getAttribute('data-k'))
    const t200 = await realClick(page, `[data-k="${k200}"]`); await sleep(150)
    if (!t200.ok) console.log('   (fila 200 no visible para tocar)', JSON.stringify(t200))
    if (await page.$('.ib-detail')) { await page.click('.ib-dhead button:has-text("Bandeja")'); await sleep(350) }
    const f = await H.focusVisible(page), fk = await page.evaluate(() => document.activeElement?.getAttribute('data-k'))
    ok('Angosta: volver del detalle de la fila 200 (después de las primeras 150) deja el foco en esa fila, a la vista', fk === k200 && f.ok, `${k200} → ${fk} · ${f.vis}/5`)
  }

  // ---------- Esc con la ficha breve, encabezados, tabla ----------
  const heads = await page.evaluate(() => ({ h3: document.querySelectorAll('.ib-rhead h3').length, th: [...document.querySelectorAll('.ib-cmp thead th')].filter(t => !t.textContent.trim()).length }))
  ok('Panel sin h3 antes del h2 y sin encabezado de tabla vacío', heads.h3 === 0 && heads.th === 0, JSON.stringify(heads))

  // ---------- atajos de una tecla: interruptor (AM-03) ----------
  await H.openInbox(page, undefined, 'club.todo')
  if (narrow) await page.waitForSelector('.ib-page')
  const today = await page.evaluate(() => !!document.querySelector('.top .cta')?.textContent.includes('Jugar'))
  await setSingle(page, false)
  const dS = await H.dateOf(page)
  await page.focus('[role=option][tabindex="0"]'); await page.keyboard.press('Space'); await sleep(250)
  await page.keyboard.press('Shift+Space'); await sleep(250)
  await page.keyboard.press('2'); await sleep(150)
  await page.keyboard.press('?'); await sleep(150)
  const off = await page.evaluate(() => ({ date: window.__ctx().g.date, page: window.__ctx().route.page, modal: !!document.querySelector('.modal, .palette'), adv: !!document.querySelector('.advancing') }))
  ok('Atajos de una tecla apagados: Espacio, Mayús + Espacio, 2 y ? sobre una fila no hacen nada', off.date === dS && off.page === 'inbox' && !off.modal && !off.adv, JSON.stringify(off))
  await page.keyboard.press('Control+k'); await sleep(150)
  ok('Atajos apagados: Ctrl + K sigue abriendo la barra de comandos', !!(await page.$('.palette')))
  await page.keyboard.press('Escape'); await sleep(120)
  await page.evaluate(() => document.querySelector('.tn-help')?.click()); await sleep(150)
  const helpTxt = await page.evaluate(() => document.querySelector('.modal')?.textContent ?? '')
  ok('La ayuda de atajos dice que los de una tecla están apagados', /una tecla: apagados/.test(helpTxt), helpTxt ? '' : 'no se abrió la ayuda')
  if (helpTxt) { await page.keyboard.press('Escape'); await sleep(120) }
  await setSingle(page, true)
  if (!today) {
    await page.focus('[role=option][tabindex="0"]'); await page.keyboard.press('Space'); await sleep(300); await H.waitIdle(page); await closePress(page)
    ok('Atajos encendidos: con el foco en una fila, Espacio avanza el día', (await H.dateOf(page)) > dS)
  } else ok('Atajos encendidos: Espacio avanza el día', null, 'hoy hay partido')

  // ---------- celular y ventana angosta: lista → detalle → volver ----------
  if (narrow) {
    await H.openInbox(page, undefined, 'club.todo')
    ok('Angosta: al entrar se ve la lista, sin selección', !(await page.$('[aria-selected=true]')) && !(await page.$('.ib-detail')))
    const tapKey = await page.evaluate(() => document.querySelectorAll('.msg.ib-opt:not(.ib-dec)')[1]?.getAttribute('data-k'))
    const t = await realClick(page, `[data-k="${tapKey}"]`)
    const det = !!(await page.$('.ib-detail'))
    if (!t.ok || !det) console.log('   (fila no visible para tocar)', JSON.stringify(t))
    if (det) await page.click('.ib-dhead button:has-text("Bandeja")'); await sleep(300)
    const f = await page.evaluate(() => document.activeElement?.getAttribute('data-k'))
    ok('Angosta: tocar abre el detalle y "◂ Bandeja" vuelve con el foco en esa fila', t.ok && det && f === tapKey, `${tapKey} → ${f}`)
    if (phone) {
      const chip = await page.evaluate(() => { const r = document.querySelector('.msg.ib-opt .ib-tag.dec'); if (!r) return null; const b = r.getBoundingClientRect(), t = r.closest('.msg').querySelector('.msg-t').getBoundingClientRect(); return { chip: Math.round(b.width), title: Math.round(t.width) } })
      ok('Celular: el chip "Para decidir" de la fila queda como "!" y no se come el título', !chip || (chip.chip <= 24 && chip.title >= 0.42 * w), JSON.stringify(chip))
    }
  }

  // ---------- generales ----------
  await H.openInbox(page, keys.job)
  const ov = await H.hOverflow(page)
  ok('La página no se desplaza de costado (barra superior incluida)', !ov.over && ov.wide.length === 0, ov.wide.join(', '))
  const top = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.top > *')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).position !== 'absolute')
    const rs = els.map(e => ({ c: (e.className?.baseVal ?? e.className) || e.tagName, l: e.getBoundingClientRect().left, r: e.getBoundingClientRect().right }))
    return rs.filter((a, i) => i && a.l < rs[i - 1].r - 1).map(a => a.c)
  })
  ok('Barra superior sin elementos encimados', top.length === 0, top.join(', '))
  const small = await H.smallText(page, '.ib-page, .ib-detail')
  ok('Ningún texto de la bandeja por debajo de 12 px', small.length === 0, small.join(', '))
  const selRow = narrow ? null : await page.evaluate(() => {
    const s = document.querySelector('.msg.ib-dec[aria-selected=true]'), o = document.querySelector('.msg.ib-dec:not([aria-selected=true]):not(.done)')
    if (!s || !o) return null
    const bw = e => parseFloat(getComputedStyle(e, '::before').width), fw = e => getComputedStyle(e.querySelector('.msg-t')).fontWeight
    return { sel: [bw(s), getComputedStyle(s).boxShadow !== 'none', fw(s)], other: [bw(o), getComputedStyle(o).boxShadow !== 'none', fw(o)] }
  })
  if (!narrow) ok('La decisión elegida se distingue sin color: barra de 6 px, contorno y título en 700', !!selRow && selRow.sel[0] >= 6 && selRow.other[0] <= 3 && selRow.sel[1] && selRow.sel[2] === '700', JSON.stringify(selRow))
  if (AXE) {
    if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE })
    const v = await page.evaluate(async () => (await window.axe.run(document.querySelector('.ib-page, .ib-detail'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(x => `${x.id} (${x.nodes.length})`))
    ok('axe-core: sin infracciones A/AA en la bandeja', v.length === 0, v.join(', '))
  }

  // ---------- Enter sobre el elegido automáticamente lo marca leído (sin pendientes) ----------
  if (!narrow) {
    await H.mutate(page, g => { g.offers = []; g.jobOffers = []; for (const p of Object.values(g.players)) p.wantsOut = false; g.press = null; g.news.unshift({ id: g.nextId++, date: g.date, me: true, tag: 'club', clubId: g.userClubId, title: 'Mensaje sin leer para la prueba', body: '.' }) })
    await page.evaluate(() => window.__ctx().nav({ page: 'home' })); await sleep(150)
    await H.openInbox(page, undefined, 'club.todo')
    const k = await H.selKey(page), unread0 = await page.evaluate(k => !!document.querySelector(`[data-k="${k}"].unread`), k)
    await page.focus(`[data-k="${k}"]`); await page.keyboard.press('Enter'); await sleep(200)
    const unread1 = await page.evaluate(k => !!document.querySelector(`[data-k="${k}"].unread`), k)
    ok('Entrar no marca leído; Enter sobre el elegido automáticamente sí', unread0 && !unread1, `${k}: ${unread0} → ${unread1}`)
    const first = await page.evaluate(() => document.querySelector('.ib-list')?.firstElementChild?.textContent)
    ok('Con 0 pendientes, la lista empieza con "Nada para decidir. Podés seguir con Continuar."', /Nada para decidir\. Podés seguir con Continuar\./.test(first ?? ''))
  }

  // ---------- 320 × 256 (1280 al 400 %): la barra deja de ser fija y el foco se ve ----------
  if (w === 320) {
    await H.mutate(page, g => { g.offers = [] })
    const k = (await H.injectDecisions(page, { job: false, out: false })).offer
    await page.setViewportSize({ width: 320, height: 256 }); await sleep(200)
    await H.openInbox(page, k)
    const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.ib-actbar')).position)
    await page.focus('.ib-read .ib-h'); const tw2 = await tabWalk(page, '.ib-detail', 30)
    ok('320 × 256: la barra de acciones se desplaza con el contenido y cada parada con foco se ve', pos === 'static' && tw2.bad.length === 0 && tw2.n > 3, `${pos} · ${tw2.n} paradas ${tw2.bad.join(' | ')}`)
    await page.setViewportSize({ width: w, height: h }); await sleep(150)
  }

  ok('Sin errores en la consola', errs.length === 0, errs.slice(0, 3).join(' | '))
  await page.close()
  return res
}

/** Capturas de identidad: un club amarillo (selección neutra) y uno rojo (peligro bordeado). */
async function clubShots(browser) {
  const { ok, res } = H.reporter('clubes · ')
  for (const [club, file] of [['Defensa y Justicia', 'defensa'], ['Independiente', 'independiente']]) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { page } = await H.newGame(browser, { club, w, h, touch: w < 761 })
      const keys = await H.injectDecisions(page)
      await H.openInbox(page, keys.offer)
      const sel = await page.evaluate(() => getComputedStyle(document.querySelector('.ib-page, .ib-detail')).getPropertyValue('--sel').trim())
      if (w === 1440) {
        const c = await page.evaluate(() => ({ bar: getComputedStyle(document.querySelector('.msg.ib-dec[aria-selected=true]'), '::before').backgroundColor, warn: getComputedStyle(document.querySelector('.msg.ib-dec:not([aria-selected=true])'), '::before').backgroundColor, rej: getComputedStyle(document.querySelector('.ib-acts > .btn.danger')).backgroundColor, acc: getComputedStyle(document.querySelector('.ib-acts > [data-primary]')).backgroundColor }))
        ok(`${club}: la barra de la decisión elegida (${c.bar}) no es el ámbar de "para decidir" (${c.warn})`, c.bar !== c.warn, `--sel ${sel}`)
        ok(`${club}: "Rechazar" sin relleno (${c.rej}) frente al primario lleno (${c.acc})`, c.rej === 'rgba(0, 0, 0, 0)')
      }
      if (takeShots) await page.screenshot({ path: path.join(SHOTS, `${file}-${w}-decision.png`) })
      if (w === 1440 && takeShots) {
        await page.click('.ib-read .ib-acts > .btn.danger'); await sleep(150)
        await page.screenshot({ path: path.join(SHOTS, `${file}-${w}-confirmar-rechazo.png`) })
      }
      await page.close()
    }
  }
  return res
}

;(async () => {
  if (takeShots) fs.mkdirSync(SHOTS, { recursive: true })
  const browser = await H.chromium.launch()
  const all = []
  for (const [w, h] of SIZES) all.push(...(await run(browser, w, h)))
  if (!process.argv.slice(2).length) all.push(...(await clubShots(browser)))
  await browser.close()
  const fails = all.filter(r => r.status === 'FALLA')
  const by = {}
  for (const r of all) { const k = r.name.split(' · ')[0]; by[k] ??= { OK: 0, FALLA: 0, 'N/A': 0 }; by[k][r.status]++ }
  console.log('\nResumen:'); for (const [k, v] of Object.entries(by)) console.log(`  ${k}: ${v.OK} OK, ${v.FALLA} fallas, ${v['N/A']} no aplica`)
  process.exit(fails.length ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(2) })
