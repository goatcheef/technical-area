// Prueba de aceptación del Mercado (design/ux/mercado.md, sección 14, lo que se puede automatizar).
// Uso: con `npm run dev` corriendo en el puerto 5173, `node tests/ui/mercado.cjs [ancho×alto …]`.
// Sin argumentos corre en 1440×900, 1024×768, 820×1000, 390×844 y 320×568 y saca capturas en production/ui/mercado/shots/.
// Los tratos se inyectan con las funciones del motor (placeBid, dailyDeals, acceptCounter…) importadas en la página desde el servidor de
// desarrollo; cada botón y cada foco se comprueban VISIBLES con elementFromPoint (helpers.cjs), no solo "clickeables".
const fs = require('fs')
const path = require('path')
const H = require('./helpers.cjs')
const { sleep } = H

const ROOT = path.resolve(__dirname, '../..')
const SHOTS = path.join(ROOT, 'production/ui/mercado/shots')
const takeShots = process.env.SHOTS !== '0'
const SIZES = process.argv.slice(2).length ? process.argv.slice(2).map(s => s.split(/[x×]/).map(Number)) : [[1440, 900], [1024, 768], [820, 1000], [390, 844], [320, 568]]

async function seen(page, sel) {
  await page.evaluate(s => document.querySelectorAll(s).forEach(e => e.scrollIntoView({ block: 'nearest' })), sel)
  await sleep(60)
  const out = []
  // uno por uno: llevar cada elemento a la vista antes de medirlo (en celular no entran todos juntos)
  const n = await page.evaluate(s => document.querySelectorAll(s).length, sel)
  for (let i = 0; i < n; i++) {
    await page.evaluate(([s, i]) => document.querySelectorAll(s)[i]?.scrollIntoView({ block: 'center' }), [sel, i])
    await sleep(30)
    const v = await page.evaluate(([s, i]) => {
      const el = document.querySelectorAll(s)[i], r = el.getBoundingClientRect(), name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
      if (!r.width || !r.height) return { name, ok: false, why: 'sin tamaño' }
      const inView = r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]]
      const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)) })
      const miss = pts.filter((_, k) => !hits[k]).map(([x, y]) => { const e = document.elementFromPoint(x, y); return `${Math.round(x)},${Math.round(y)}→${e ? (e.className?.baseVal ?? e.className) || e.tagName : 'nada'}` })
      return { name, ok: inView && hits.every(Boolean), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], why: !inView ? 'fuera de la ventana' : miss.join(', ') }
    }, [sel, i])
    out.push(v)
  }
  return out
}
const allOk = vs => vs.length > 0 && vs.every(v => v.ok)
const why = vs => vs.filter(v => !v.ok).map(v => `${v.name}: ${v.why} ${JSON.stringify(v.rect ?? '')}`).slice(0, 4).join(' | ')
const route = page => page.evaluate(() => { const r = window.__ctx().route; return { page: r.page, sel: r.sel ?? null, tab: r.tab ?? null } })
const go = async (page, r) => { await page.evaluate(r => window.__ctx().nav(r), r); await sleep(250) }
async function tabWalk(page, scope, max = 40) {
  const bad = [], names = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab'); await sleep(50)
    const inScope = await page.evaluate(s => !!document.activeElement?.closest(s), scope)
    if (!inScope) { if (names.length) break; else continue }
    const f = await H.focusVisible(page)
    names.push(f.name)
    if (!f.ok) bad.push(`${f.name} (${f.vis}/5) ${JSON.stringify(f.rect)}`)
  }
  return { bad, n: names.length }
}
/** Cuántas decisiones del mercado y cuánto marca la bandeja, leído del motor (lo que dibujan las insignias). */
const counts = page => page.evaluate(async () => {
  const I = await import('/src/engine/inbox.ts'), g = window.__ctx().g
  const ps = I.pendingAll(g)
  return { market: ps.filter(p => p.k === 'offer' || p.k === 'deal').length, inbox: I.inboxCount(g), badgeMk: document.querySelector('.sections [data-group="market"] .dot [aria-hidden]')?.textContent ?? null }
})

/**
 * Tratos en todos los estados con las funciones del motor: uno esperando respuesta, una contraoferta, un acuerdo de compra, uno de préstamo,
 * un rechazo y una oferta por un jugador propio. Devuelve los ids.
 */
async function setupDeals(page, { offer = true } = {}) {
  const r = await page.evaluate(async offer => {
    const C = await import('/src/engine/career.ts'), G = await import('/src/engine/game.ts')
    const c = window.__ctx(), g = c.g
    g.deals = []; g.offers = []
    const me = g.clubs[g.userClubId]
    me.budget = Math.max(me.budget, 40e6); me.wageBudget += 2e6
    const sq = id => G.squadOf(g, id)
    // jugadores de suplentes de clubes de Primera con planteles largos: el club no los rechaza por quedarse sin recambio
    const pool = Object.values(g.players).filter(p => { const cl = g.clubs[p.clubId]; return cl && cl.division === 1 && cl.id !== me.id && cl.rep <= me.rep + 4 && p.loanFrom == null && p.line !== 'GK' && sq(cl.id).length >= 26 && C.squadRank(g, p) >= 15 })
      .sort((a, b) => a.id - b.id)
    const used = new Set(), pickP = () => { const p = pool.find(x => !used.has(x.clubId)); used.add(p.clubId); return p }
    const answerNow = d => { d.answerOn = g.date; C.dailyDeals(g) }
    const out = {}
    // contraoferta: oferta baja que el club contesta hoy
    let p = pickP(), b = C.placeBid(g, p.id, Math.round(C.askingPrice(g, p) * 0.3 / 1000) * 1000, false); answerNow(b.deal); out.counter = b.deal.id; out.counterState = b.deal.state
    // acuerdo de compra: más que el pedido
    p = pickP(); b = C.placeBid(g, p.id, Math.round(C.askingPrice(g, p) * 1.5 / 1000) * 1000, false); answerNow(b.deal); out.agreed = b.deal.id; out.agreedState = b.deal.state
    // préstamo acordado
    p = pickP(); b = C.placeBid(g, p.id, C.loanFee(p) * 2, true); answerNow(b.deal); out.loan = b.deal.id; out.loanState = b.deal.state
    // esperando respuesta (no se contesta)
    p = pickP(); b = C.placeBid(g, p.id, C.askingPrice(g, p), false); out.waiting = b.deal.id; out.waitingPid = p.id
    // retirada (historial)
    p = pickP(); b = C.placeBid(g, p.id, C.askingPrice(g, p), false); C.withdrawBid(g, b.deal.id); out.pulled = b.deal.id
    if (offer) {
      const mine = sq(me.id).sort((x, y) => y.value - x.value)[2], buyer = Object.values(g.clubs).filter(x => x.division === 1 && x.id !== me.id).sort((x, y) => y.rep - x.rep)[0]
      const id = 900001
      g.offers.push({ id, pid: mine.id, from: buyer.id, fromName: buyer.name, fee: Math.round(mine.value * 1.2), date: g.date })
      G.news(g, { tag: 'mercado', clubId: me.id, pid: mine.id, act: 'offer', ref: id, title: `Oferta de ${buyer.name} por ${mine.name}`, body: `${buyer.name} ofrece por el pase de ${mine.name}.` })
      out.offer = `offer${id}`
    }
    c.save(); c.refresh()
    return out
  }, offer)
  await sleep(200)
  return r
}

async function run(browser, w, h) {
  const tag = `${w}×${h} · `
  const { ok, res } = H.reporter(tag)
  const wide = w > 1180, phone = w <= 760
  const { page, errs } = await H.newGame(browser, { w, h, touch: phone })
  const shot = async name => { if (takeShots) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`) }) } }

  // ---------- revisión de código (una vez) ----------
  if (w === SIZES[0][0]) {
    for (const f of ['Market.tsx', 'deal.tsx', 'PlayerPage.tsx', 'Locker.tsx']) {
      const actFile = f === 'Market.tsx' || f === 'deal.tsx'
      const src = fs.readFileSync(path.join(ROOT, 'src/ui', f), 'utf8')
      ok(`${f}: sin doTransfer(, news(, evaluateBid(, p.negBlock =, .listed =, g.deals =`, !/doTransfer\(|[^.\w]news\(|evaluateBid\(|negBlock\s*=[^=]|\.listed\s*=[^=]|g\.deals\s*=[^=]/.test(src))
      ok(`${f}: sin atajos de una tecla nuevos`, !/window\.addEventListener\('key/.test(src) && !/e\.key === '[a-z0-9/?]'/.test(src))
      if (actFile) ok(`${f}: ningún contenedor de acciones usa la clase global .bar`, !/className="bar"|className=\{`bar /.test(src))
    }
    const inbox = fs.readFileSync(path.join(ROOT, 'src/ui/Inbox.tsx'), 'utf8')
    ok('Inbox.tsx usa pendingAll y wageShown(demandWage) para el sueldo pedido', /pendingAll\(g\)/.test(inbox) && /wageShown\(g, p, demandWage\(g, p\), 402\)/.test(inbox) && !/demand\(g, p, 'buy'/.test(inbox))
  }

  const ids = await setupDeals(page)
  ok('Inyección: contraoferta, acuerdo, préstamo y espera en sus estados', ids.counterState === 'countered' && ids.agreedState === 'agreed' && ids.loanState === 'agreed', JSON.stringify(ids))

  // ---------- franja y pestañas ----------
  // Atrás después de tres cambios de pestaña sale del Mercado
  await go(page, { page: 'home' }); await go(page, { page: 'market', tab: 'buscar' })
  for (const t of ['Tratos', 'Seguimiento', 'Buscar']) { await page.click(`.mk-tabs button:has-text("${t}")`); await sleep(150) }
  await page.evaluate(() => window.__ctx().back()); await sleep(200)
  ok('Tres cambios de pestaña y Atrás vuelve a la pantalla anterior', (await route(page)).page === 'home', JSON.stringify(await route(page)))


  await go(page, { page: 'market', tab: 'buscar' })
  for (const t of ['buscar', 'tratos', 'seguimiento', 'movimientos', 'presupuesto']) {
    await go(page, { page: 'market', tab: t })
    const st = await page.evaluate(() => { const s = document.querySelector('.mk-strip'); const r = s?.getBoundingClientRect(); return { txt: s?.textContent ?? '', top: r?.top ?? -1, bottom: r?.bottom ?? 9999 } })
    ok(`Franja con el libro en palabras en ${t}`, /Abierto/.test(st.txt) && /cierra/.test(st.txt) && st.bottom <= h, `${st.txt.slice(0, 80)}`)
  }
  const old = await page.evaluate(async () => { window.__ctx().nav({ page: 'market', tab: 'offers' }); await new Promise(r => setTimeout(r, 200)); return document.querySelector('.mk-tabs button[aria-pressed=true]')?.textContent })
  ok('tab: "offers" abre Tratos', /Tratos/.test(old ?? ''), old)
  // ---------- insignias: cada decisión cuenta una vez ----------
  const c0 = await counts(page)
  ok('Insignia de Mercado = ofertas por tus jugadores + contraofertas + acuerdos (no las que esperan)', c0.market === 4 && (phone || c0.badgeMk === `!${c0.market}`), JSON.stringify(c0))

  // ---------- Tratos: cada botón y cada foco visibles ----------
  await go(page, { page: 'market', tab: 'tratos' })
  const groups = await page.evaluate(() => [...document.querySelectorAll('.mk-gh h3')].map(x => x.textContent))
  ok('Tratos en orden: Para responder, Esperando respuesta, Para cerrar, Para renovar, Historial', groups.map(x => x.split(' ·')[0]).join('|') === 'Para responder|Esperando respuesta|Para cerrar|Para renovar|Historial', groups.join(' | '))
  const btns = await seen(page, '.mk-deals .mk-card .btn, .mk-deals .mk-improve input')
  ok('Tratos: cada botón y campo se ve (elementFromPoint)', allOk(btns), why(btns))
  await page.evaluate(() => { document.getElementById('main').scrollTop = 0 }); await sleep(100); await shot('tratos')
  await page.evaluate(() => { const m = document.getElementById('main'); m.scrollTop = m.clientHeight * 0.9 }); await sleep(100); await shot('tratos-2')
  await page.evaluate(() => document.querySelector('.mk-tabs button[aria-pressed=true]')?.focus())
  const tw = await tabWalk(page, '.mk-deals', 60)
  ok('Tratos: bajando con Tab, ningún foco queda tapado', tw.n > 6 && !tw.bad.length, `${tw.n} paradas; ${tw.bad.slice(0, 3).join(' | ')}`)
  ok('Seleccionar una tarjeta con el foco cambia sel en la ruta', /^(deal|offer|renew)/.test((await route(page)).sel ?? ''), JSON.stringify(await route(page)))

  // responder una oferta con teclado: foco en Aceptar, Enter abre la confirmación, Enter confirma
  const inb0 = (await counts(page)).inbox
  await page.focus(`[data-k="${ids.offer}"] [data-primary]`); await page.keyboard.press('Enter'); await sleep(120)
  const conf = await page.evaluate(() => document.activeElement?.textContent ?? '')
  ok('Responder una oferta: Enter en Aceptar abre "Confirmar: vender a…" con el foco', /^Confirmar: vender a/.test(conf), conf.slice(0, 70))
  if (/^Confirmar/.test(conf)) { const cv = await seen(page, '.mk-deals .ib-confirm .btn'); ok('La confirmación en el lugar se ve', allOk(cv), why(cv)) }
  await page.keyboard.press('Enter'); await sleep(250)
  const c1 = await counts(page)
  ok('Vender en Tratos baja la insignia de la Bandeja en 1 (nunca sube)', c1.inbox === inb0 - 1, `${inb0} → ${c1.inbox}`)
  ok('Resuelto en su lugar con "Siguiente para responder"', await page.$('.mk-card.done [data-next]') != null)

  // contraoferta: Aceptar US$ X deja la misma decisión (N) y pasa a Para cerrar
  const n1 = (await counts(page)).inbox
  await page.click(`[data-k="deal${ids.counter}"] [data-primary]`); await sleep(250)
  const st1 = await page.evaluate(id => window.__ctx().g.deals.find(d => d.id === id)?.state, ids.counter)
  ok('Aceptar la contraoferta: pasa a acuerdo y la Bandeja queda en N', st1 === 'agreed' && (await counts(page)).inbox === n1, `${st1}; ${n1} → ${(await counts(page)).inbox}`)

  // negociación: ventana con Ofrecer, acuerdo y Confirmar visibles
  await go(page, { page: 'market', tab: 'tratos', sel: `deal${ids.agreed}` })
  await page.click(`[data-k="deal${ids.agreed}"] [data-primary]`); await sleep(300)
  ok('Negociar contrato abre la ventana con la paciencia en palabra', /Paciencia del representante: (mucha|media|poca)/.test(await page.evaluate(() => document.querySelector('.modal')?.textContent ?? '')))
  const nb = await seen(page, '.modal .btn, .modal input')
  ok('Negociación: cada botón y campo se ve', allOk(nb), why(nb))
  await shot('negociacion')
  // ofrecer lo que pide: hay acuerdo y falta la confirmación
  await page.evaluate(() => { const t = document.querySelector('.mk-ask b')?.textContent ?? ''; return t })
  await page.evaluate(async id => { const g = window.__ctx().g; const d = g.deals.find(x => x.id === id); window.__ask = d.neg.terms }, ids.agreed)
  await page.fill('#neg-wage', String(await page.evaluate(() => window.__ask.wage)))
  await page.fill('#neg-bonus', String(await page.evaluate(() => window.__ask.bonus)))
  await page.click('.mk-neg-foot [data-primary]'); await sleep(250)
  const agreeTxt = await page.evaluate(() => document.querySelector('.mk-agree')?.textContent ?? '')
  const signedBefore = await page.evaluate(id => window.__ctx().g.deals.find(d => d.id === id)?.state, ids.agreed)
  ok('Con lo que pide hay acuerdo y el pase no se ejecuta hasta Confirmar', /Hay acuerdo/.test(agreeTxt) && signedBefore === 'agreed', `${agreeTxt.slice(0, 60)} · ${signedBefore}`)
  if (agreeTxt) { const cb = await seen(page, '.mk-agree .btn'); ok('Confirmar y Seguir negociando se ven', allOk(cb), why(cb)); await shot('negociacion-acuerdo') }
  await page.keyboard.press('Escape'); await sleep(200)
  ok('Esc cierra la negociación y el acuerdo sigue en Para cerrar', await page.$('.modal') == null && await page.evaluate(id => window.__ctx().g.deals.find(d => d.id === id)?.state, ids.agreed) === 'agreed')

  // retirar la espera: libera lo comprometido, sin confirmación
  const w0 = await page.evaluate(async () => (await import('/src/engine/career.ts')).committed(window.__ctx().g))
  await page.click(`[data-k="deal${ids.waiting}"] .btn:has-text("Retirar la oferta")`); await sleep(200)
  const w1 = await page.evaluate(async () => (await import('/src/engine/career.ts')).committed(window.__ctx().g))
  ok('Retirar la oferta libera lo comprometido sin confirmación', w1 < w0, `${w0} → ${w1}`)

  // ---------- Buscar: panel (≥ 1180) o ficha › Contrato y mercado ----------
  await go(page, { page: 'market', tab: 'buscar' })
  await page.evaluate(() => { const c = window.__ctx(); try { localStorage.removeItem('ta-sticky') } catch {} ; c.refresh() })
  if (wide) {
    ok('Al entrar no hay fila elegida', await page.$('.mk .ptable tr[aria-selected=true]') == null && await page.$('.mk-side.none') != null)
    await shot('buscar')
    // ↓ hasta la fila, Enter (foco al monto), Enter (ofertar)
    await page.focus('.mk .ptable tbody tr[tabindex="0"]'); await page.keyboard.press('ArrowDown'); await sleep(80)
    const date0 = await H.dateOf(page)
    await page.keyboard.press('Space'); await sleep(80)
    ok('Espacio en una fila marca la casilla y no avanza el día', await page.$('.mk .ptable tr.selrow') != null && await H.dateOf(page) === date0)
    await page.keyboard.press('Space'); await sleep(60)
    await page.keyboard.press('Enter'); await sleep(250)
    const fid = await page.evaluate(() => document.activeElement?.id)
    ok('Enter en una fila elige al jugador y lleva el foco al campo Oferta', fid === 'mk-bid-fee' && /^p\d+$/.test((await route(page)).sel ?? ''), `${fid} · ${(await route(page)).sel}`)
    await shot('buscar-panel')
    const pb = await seen(page, '.mk-side .btn, .mk-side input')
    ok('Panel: cada botón y campo se ve', allOk(pb), why(pb))
    const before = await counts(page)
    await page.keyboard.press('Enter'); await sleep(300)
    const waitTxt = await page.evaluate(() => document.querySelector('.mk-side .mk-deal')?.textContent ?? '')
    const after = await counts(page)
    ok('Enter, Enter: queda "Esperando respuesta" y no suma insignias', /Esperando respuesta/.test(waitTxt) && after.market === before.market && after.inbox === before.inbox, `${waitTxt.slice(0, 50)} · ${JSON.stringify(before)} → ${JSON.stringify(after)}`)
    await shot('bidbox-esperando')
    await page.keyboard.press('Escape'); await sleep(100)
    ok('Esc desde el panel vuelve el foco a la fila elegida', await page.evaluate(() => document.activeElement?.matches('tr[aria-selected=true]')))
  } else {
    await page.click('.mk .ptable tbody tr td:nth-child(2)'); await sleep(400)
    ok('≤ 1180 px: tocar una fila abre la ficha', await page.$('.pband') != null)
    await page.click('.pband-tabs button:has-text("Contrato y mercado")'); await sleep(300)
    const fb = await seen(page, '.mk-scope .btn, .mk-scope input')
    ok('Ficha › Contrato y mercado: el BidBox y sus botones se ven', allOk(fb), why(fb))
    await shot('ficha-bidbox')
  }

  // BidBox en cada estado, en la ficha (todas las resoluciones)
  const ids2 = await setupDeals(page, { offer: false })
  for (const [k, sel] of [['contraoferta', ids2.counter], ['acordado', ids2.agreed], ['prestamo', ids2.loan], ['esperando', ids2.waiting]]) {
    const pid = await page.evaluate(id => window.__ctx().g.deals.find(d => d.id === id).pid, sel)
    await go(page, { page: 'player', id: pid, tab: 'contrato' })
    const v = await seen(page, '.mk-scope .btn, .mk-scope input')
    ok(`BidBox ${k}: cada botón se ve`, allOk(v), why(v))
    await shot(`bidbox-${k}`)
  }

  // ---------- el avance frena cuando llega una respuesta ----------
  await page.evaluate(async () => { const C = await import('/src/engine/career.ts'), c = window.__ctx(), g = c.g
    for (const d of g.deals) if (C.isOpenDeal(d)) C.withdrawBid(g, d.id) || C.cancelDeal(g, d.id)
    g.deals = g.deals.filter(d => !C.isOpenDeal(d)).map(d => ({ ...d, blockUntil: undefined })); g.offers = []; c.save(); c.refresh() })
  const wid = await page.evaluate(async () => {
    const C = await import('/src/engine/career.ts'), G = await import('/src/engine/game.ts'), c = window.__ctx(), g = c.g
    const me = g.clubs[g.userClubId]
    const p = Object.values(g.players).find(p => { const cl = g.clubs[p.clubId]; return cl && cl.division === 1 && cl.id !== me.id && cl.rep <= me.rep && G.squadOf(g, cl.id).length >= 26 && C.squadRank(g, p) >= 15 && p.loanFrom == null && !C.bidBlock(g, p.id) })
    const b = C.placeBid(g, p.id, Math.round(C.askingPrice(g, p) * 1.5), false); c.save(); c.refresh(); return b.deal?.id
  })
  await go(page, { page: 'home' })
  await page.click('button[aria-label="Ir al partido"]'); await H.waitIdle(page); await sleep(200)
  if (await page.$('.modal button:has-text("Que hable el ayudante")')) { await page.click('.modal button:has-text("Que hable el ayudante")'); await sleep(150) }
  const ra = await route(page), sa = await page.evaluate(id => window.__ctx().g.deals.find(d => d.id === id)?.state, wid)
  ok('"Ir al partido" frena cuando llega la respuesta y abre la bandeja con el trato', sa === 'waiting' ? null : ra.page === 'inbox' && ra.sel === `deal${wid}`, `${sa} · ${JSON.stringify(ra)}`)
  if (ra.page === 'inbox' && ra.sel === `deal${wid}`) {
    const ib = await seen(page, '.ib-read .btn, .ib-read input, .ib-detail .btn, .ib-detail input')
    ok('Bandeja: el acuerdo y sus botones se ven', allOk(ib), why(ib))
    await shot('bandeja-acuerdo')
    // el último día del acuerdo frena una vez
    await page.evaluate(id => { const c = window.__ctx(), d = c.g.deals.find(x => x.id === id); d.deadline = c.g.date; c.save(); c.refresh() }, wid)
    await go(page, { page: 'home' })
    await page.click('button[aria-label="Ir al partido"]'); await H.waitIdle(page); await sleep(200)
    const rb = await route(page)
    ok('El último día de un acuerdo, "Ir al partido" no avanza y abre la bandeja con él', rb.page === 'inbox' && rb.sel === `deal${wid}`, JSON.stringify(rb))
  }

  // ---------- libro cerrado ----------
  await setupDeals(page)
  await page.evaluate(() => { const c = window.__ctx(); c.g.deals = c.g.deals.filter(d => d.side === 'sell' || !['waiting', 'countered', 'agreed'].includes(d.state)); c.g.date = '2026-03-02'; c.save(); c.refresh() })
  await go(page, { page: 'market', tab: 'tratos' })
  const closed = await page.evaluate(() => { const card = document.querySelector('.mk-card.dec'); const b = [...(card?.querySelectorAll('.ib-acts .btn') ?? [])]; return { strip: document.querySelector('.mk-strip')?.textContent ?? '', acc: b.find(x => x.textContent === 'Aceptar')?.disabled, more: b.find(x => x.textContent === 'Pedir más')?.disabled, rej: b.find(x => x.textContent === 'Rechazar')?.disabled, why: card?.textContent.includes('El libro de pases está cerrado') } })
  ok('Libro cerrado: la franja dice "reabre el 25 jun" con los días', /Cerrado/.test(closed.strip) && /reabre el 25 jun · faltan \d+ días/.test(closed.strip), closed.strip.slice(0, 80))
  ok('Libro cerrado: Aceptar y Pedir más deshabilitados con el motivo escrito; Rechazar habilitado', closed.acc === true && closed.more === true && closed.rej === false && closed.why === true, JSON.stringify(closed))
  const pid = await page.evaluate(() => { const g = window.__ctx().g; return Object.values(g.players).find(p => g.clubs[p.clubId]?.division === 1 && p.clubId !== g.userClubId).id })
  await go(page, { page: 'player', id: pid, tab: 'contrato' })
  const cb = await page.evaluate(() => { const s = document.querySelector('.mk-scope'); const b = [...(s?.querySelectorAll('.btn') ?? [])]; return { buy: b.find(x => x.textContent === 'Ofertar compra')?.disabled, loan: b.find(x => x.textContent === 'Pedir préstamo')?.disabled, why: (s?.textContent ?? '').includes('El libro de pases está cerrado') } })
  ok('Libro cerrado: Ofertar compra y Pedir préstamo deshabilitados con el motivo visible', cb.buy === true && cb.loan === true && cb.why, JSON.stringify(cb))
  await shot('bidbox-cerrado')

  // ---------- Presupuesto, Movimientos, celular ----------
  await go(page, { page: 'market', tab: 'presupuesto' }); await shot('presupuesto')
  const ov = await H.hOverflow(page)
  ok('Sin desplazamiento horizontal de la página', !ov.over, ov.wide.join(', '))
  const small = await H.smallText(page, '.mk')
  ok('Ningún texto del Mercado por debajo de 12 px', !small.length, small.join(', '))
  if (phone) { await go(page, { page: 'market', tab: 'buscar' }); await shot('celular-buscar'); await go(page, { page: 'market', tab: 'tratos' }); await shot('celular-tratos') }
  ok('Sin errores en la consola', !errs.length, errs.slice(0, 3).join(' | '))
  await page.close()
  return res
}

;(async () => {
  const browser = await H.chromium.launch()
  const all = []
  for (const [w, h] of SIZES) all.push(...await run(browser, w, h))
  await browser.close()
  const bad = all.filter(r => r.status === 'FALLA')
  console.log(`\n${all.length} comprobaciones, ${bad.length} fallas, ${all.filter(r => r.status === 'N/A').length} sin aplicar`)
  process.exit(bad.length ? 1 : 0)
})()
