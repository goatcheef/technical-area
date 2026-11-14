// Ayudas para las pruebas de interfaz con Playwright contra el servidor de desarrollo (npm run dev, puerto 5173).
// Playwright no viene en package.json: se busca el instalado en el sistema (PLAYWRIGHT o /opt/node-tools).
const path = require('path')
function loadPlaywright() {
  for (const m of [process.env.PLAYWRIGHT, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) {
    try { return require(m) } catch { /* probar el siguiente */ }
  }
  throw new Error('No se encontró Playwright. Instalalo (npm i -g playwright) o indicá la ruta en PLAYWRIGHT.')
}
const { chromium } = loadPlaywright()
const URL = process.env.TA_URL || 'http://localhost:5173/'
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Partida nueva con el club pedido; deja `window.__ctx()` para leer el contexto del juego (g, nav, refresh, save). */
async function newGame(browser, { club = 'Independiente', w = 1440, h = 900, touch = false, settings } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch })
  const errs = []
  page.on('pageerror', e => errs.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) })
  await page.goto(URL)
  await page.evaluate(s => { try { localStorage.setItem('ta-settings', JSON.stringify({ density: 'comfy', text: 100, matchSpeed: 1, matchMode: 'full', tourDone: true, tips: false, ...(s || {}) })) } catch {} }, settings)
  await page.reload()
  await page.waitForSelector('#mgr-name')
  await page.click('text=Siguiente ▸'); await page.click('text=Siguiente ▸')
  await page.click(`.clubcard:has(b:text-is("${club}"))`); await page.click('text=Firmar contrato ▸')
  await page.waitForSelector('.shell')
  if (await page.$('.guide')) await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Saltear la guía')?.click())
  await installCtx(page)
  await sleep(150)
  return { page, errs }
}

/** El valor de GameCtx leído de las fibras de React. */
async function installCtx(page) {
  await page.evaluate(() => {
    window.__ctx = () => {
      const el = document.querySelector('.shell') || document.querySelector('#root > *')
      const fk = el && Object.keys(el).find(k => k.startsWith('__reactFiber'))
      for (let f = fk ? el[fk] : null; f; f = f.return) { const v = f.memoizedProps?.value; if (v && v.g && v.nav && v.refresh) return v }
      return null
    }
  })
}

/** Cambia el estado del juego en la página: `fn(g, helpers)` corre en el navegador; después guarda y refresca. */
async function mutate(page, fn, arg) {
  const r = await page.evaluate(([src, arg]) => {
    const c = window.__ctx(), g = c.g
    const add = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
    const out = new Function('g', 'h', 'arg', `return (${src})(g, h, arg)`)(g, { add }, arg)
    c.save(); c.refresh()
    return out
  }, [fn.toString(), arg])
  await sleep(120)
  return r
}

/**
 * Decisiones inyectadas como las crea el motor (mismos campos que pushOffer y managerMarket):
 * una oferta por un jugador, una oferta de trabajo de mitad de temporada y un jugador que quiere irse.
 * `offerDays` y `jobDays`: días que le quedan a cada una (0 = vence hoy, es el último día para responder).
 */
async function injectDecisions(page, { offer = true, job = true, out = true, offerDays = 8, jobDays = 6 } = {}) {
  return mutate(page, (g, h, a) => {
    const mine = Object.values(g.players).filter(p => p.clubId === g.userClubId).sort((x, y) => y.value - x.value)
    const other = Object.values(g.clubs).filter(c => c.division === 1 && c.id !== g.userClubId).sort((x, y) => y.rep - x.rep)
    const keys = {}
    const nid = () => g.nextId++ // como `news()` del motor: los ids no se repiten con los mensajes que lleguen después
    if (a.offer) {
      const pl = mine[2], buyer = other[0], id = 900000 + Math.floor(Math.random() * 9999)
      // offerDeadline(o) = o.date + 9: para que queden `offerDays` días, la oferta se fecha 9 - offerDays días atrás
      g.offers.push({ id, pid: pl.id, from: buyer.id, fromName: buyer.name, fee: Math.round(pl.value * 1.2), date: h.add(g.date, a.offerDays - 9) })
      g.news.unshift({ id: nid(), date: g.date, me: true, tag: 'mercado', clubId: g.userClubId, pid: pl.id, act: 'offer', ref: id, title: `Oferta de ${buyer.name} por ${pl.name}`, body: `${buyer.name} ofrece por el pase de ${pl.name}. Podés responder desde este mensaje.` })
      keys.offer = `offer${id}`
    }
    if (a.job) {
      const c = other[5]
      g.jobOffers = [...(g.jobOffers ?? []).filter(j => j.clubId !== c.id), { clubId: c.id, until: h.add(g.date, a.jobDays), kind: 'mid' }]
      g.news.unshift({ id: nid(), date: g.date, me: true, tag: 'directiva', clubId: c.id, act: 'job', ref: c.id, title: `${c.name} te quiere como DT`, body: `${c.name} despidió a su DT y te ofrece el cargo.` })
      keys.job = `job${c.id}`
    }
    if (a.out) {
      const p = mine[8]
      p.wantsOut = true; p.listed = false
      g.news.unshift({ id: nid(), date: g.date, me: true, tag: 'club', clubId: g.userClubId, pid: p.id, act: 'out', title: `${p.name} quiere irse`, body: `${p.name} pidió irse del club.` })
      keys.out = `out${p.id}`
    }
    return keys
  }, { offer, job, out, offerDays, jobDays })
}

/** Abre la bandeja (con `sel` si se pide) sin depender de la barra de navegación. */
async function openInbox(page, sel, tab = 'club.todo') {
  await page.evaluate(([sel, tab]) => window.__ctx().nav({ page: 'inbox', tab, sel }), [sel, tab])
  await page.waitForSelector('.ib-page, .ib-detail')
  await sleep(200)
}

/**
 * ¿Se ve de verdad? Para cada elemento: la caja entra en la ventana, y `elementFromPoint` en el centro y en cuatro
 * puntos interiores devuelve el mismo elemento (o un descendiente). Detecta recortes por `overflow`, barras fijas encima
 * y desbordes laterales, que Playwright no detecta al hacer clic.
 */
async function visibility(page, selector) {
  return page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => {
    const r = el.getBoundingClientRect(), name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!r.width || !r.height) return { name, ok: false, why: 'sin tamaño' }
    const inView = r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]]
    const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)) })
    const ok = inView && hits.every(Boolean)
    const miss = pts.map(([x, y], i) => [x, y, hits[i]]).filter(p => !p[2]).map(([x, y]) => { const e = document.elementFromPoint(x, y); return `${Math.round(x)},${Math.round(y)}→${e ? (e.className?.baseVal ?? e.className) || e.tagName : 'nada'}` })
    return { name, ok, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], why: ok ? '' : !inView ? 'fuera de la ventana' : `tapado en ${miss.join(', ')}` }
  }), selector)
}

/** El elemento con foco se ve entero (2.4.11): misma comprobación que `visibility` sobre `document.activeElement`. */
async function focusVisible(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { ok: false, name: 'BODY', why: 'foco en body' }
    const r = el.getBoundingClientRect(), name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]]
    const vis = pts.filter(([x, y]) => { if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false; const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)) }).length
    return { ok: vis === pts.length, name, vis, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }
  })
}

/** La página no se desplaza de costado; devuelve los elementos que se salen por la derecha. */
async function hOverflow(page) {
  return page.evaluate(() => ({
    over: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
    wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.ibchips, .vh, .tabs, .scroll-x') }).slice(0, 6).map(e => `${(e.className?.baseVal ?? e.className) || e.tagName}@${Math.round(e.getBoundingClientRect().right)}`),
  }))
}

/** Textos por debajo de `min` px dentro del selector. */
async function smallText(page, sel, min = 12) {
  return page.evaluate(([sel, min]) => {
    const bad = []
    for (const el of document.querySelectorAll(`${sel}, ${sel} *`)) {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
      const r = el.getBoundingClientRect(); if (!r.width || el.closest('.vh')) continue
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < min - 0.05) bad.push(`${(el.className?.baseVal ?? el.className) || el.tagName}:${fs.toFixed(1)}`)
    }
    return [...new Set(bad)].slice(0, 8)
  }, [sel, min])
}

const selKey = page => page.evaluate(() => document.querySelector('[role=option][aria-selected=true]')?.getAttribute('data-k') ?? null)
const dateOf = page => page.evaluate(() => window.__ctx().g.date)
const waitIdle = async page => { for (let k = 0; k < 500 && await page.$('.advancing'); k++) await sleep(40) }

/** Registro de resultados: `ok(nombre, condición, detalle)`. `null` es "no aplica". */
function reporter(prefix = '') {
  const res = []
  const ok = (name, pass, info = '') => {
    const s = pass === null ? 'N/A  ' : pass ? 'OK   ' : 'FALLA'
    res.push({ name: prefix + name, status: s.trim(), info })
    console.log(`${s} ${prefix}${name}${info ? ' · ' + info : ''}`)
    return !!pass
  }
  return { ok, res }
}

module.exports = { chromium, URL, sleep, newGame, installCtx, mutate, injectDecisions, openInbox, visibility, focusVisible, hOverflow, smallText, selKey, dateOf, waitIdle, reporter, path }
