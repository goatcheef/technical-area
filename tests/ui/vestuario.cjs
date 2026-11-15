// Prueba de aceptación del Vestuario (design/ux/vestuario.md, sección 14, lo que se puede automatizar).
// Uso: con `npm run dev` corriendo en el puerto 5173, `node tests/ui/vestuario.cjs [ancho×alto …]`.
// Sin argumentos corre en 1440×900, 1024×768, 820×1000, 390×844 y 320×568, más una pasada con el texto al 120 % (1440 y 390), otra con
// Defensa y Justicia (club amarillo) y la del pedido de salida (una decisión, una vez, por cada camino que la resuelve). Saca un juego chico
// de capturas en production/ui/vestuario/shots/final/ (JPEG; SHOTS=0 no saca ninguna).
// El estado del plantel se arma con el motor en la página (pedido de salida, promesa en riesgo, molesto, en baja, referente que resta,
// reserva). Cada botón y cada foco se comprueban VISIBLES con elementFromPoint (helpers.cjs), no solo "clickeables".
// `--out` corre solo la pasada del pedido de salida. AXE=<ruta a axe.min.js> corre además axe-core (no está en el repositorio: instalalo aparte).
// Fase 5 (pulido): cada bloqueante de las revisiones de la fase 4 tiene su comprobación: la tabla al empezar la temporada (celda de Minutos
// y alto de fila), el contraste de "Quiere irse" en la banda, la ficha breve y la bandeja (muestreado en píxeles), Esc desde una charla
// abierta en la ficha, el foco después de "Armar la reserva" y de "A la reserva" (y en 320 × 256, nunca debajo de la barra masiva),
// nested-interactive con "Cambiarle el rol" marcada, los anuncios de la reserva, las columnas de las vistas del Plantel y los nombres a 320.
const fs = require('fs')
const path = require('path')
const H = require('./helpers.cjs')
const { sleep } = H

const ROOT = path.resolve(__dirname, '../..')
const SHOTS = path.join(ROOT, 'production/ui/vestuario/shots/final')
const takeShots = process.env.SHOTS !== '0'
const AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? fs.readFileSync(process.env.AXE, 'utf8') : null
const ARGS = process.argv.slice(2).filter(a => /\d[x×]\d/.test(a))
const SIZES = ARGS.length ? ARGS.map(s => s.split(/[x×]/).map(Number)) : [[1440, 900], [1024, 768], [820, 1000], [390, 844], [320, 568]]
const EXTRA = !ARGS.length || process.argv.includes('--extra')
let nShots = 0
async function shot(page, name, full = false) {
  if (!takeShots || nShots >= 20) return
  fs.mkdirSync(SHOTS, { recursive: true })
  if (full) {
    const vp = page.viewportSize(), hgt = await page.evaluate(() => document.getElementById('main').scrollHeight + 120)
    await page.setViewportSize({ width: vp.width, height: Math.min(hgt, 3200) }); await sleep(250)
    await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: 'jpeg', quality: 80 })
    await page.setViewportSize(vp); await sleep(200)
  } else await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: 'jpeg', quality: 80 })
  nShots++
}

/** Plantel de prueba armado con el motor: pedido de salida, promesa en riesgo, molesto con la charla usada, en baja, referente que resta, 8 en la reserva. */
async function setupLocker(page, { usedOut = false } = {}) {
  return page.evaluate(async ({ usedOut }) => {
    const c = window.__ctx(), g = c.g
    const add = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
    const mine = Object.values(g.players).filter(p => p.clubId === g.userClubId).sort((a, b) => b.value - a.value)
    for (const p of mine) { p.recent = [80, 90, 85]; p.happy = 70; p.morale = 62; p.wantsOut = false; p.listed = false; p.promise = undefined; p.lastTalk = undefined; p.reserve = false; p.talks = []; p.moodNote = undefined; p.injury = undefined; p.susp = 0 }
    const S = await import('/src/engine/squad.ts')
    const hm = S.harmony(g), lead = new Set(hm.leaders.map(p => p.id))
    const pool = mine.filter(p => !lead.has(p.id) && p.loanFrom == null)
    const [out, risk, upset, fall] = pool.slice(2, 6)
    out.status = 'reg'; out.wantsOut = true; out.happy = 14; out.morale = 41; out.recent = [0, 45, 0, 18, 45, 0]; out.outDate = add(g.date, -3)
    if (usedOut) { out.lastTalk = add(g.date, -2); out.talks = [{ date: out.lastTalk, kind: 'patience', reply: 'No le convenció' }] }
    g.news.unshift({ id: g.nextId++, date: g.date, me: true, tag: 'club', clubId: g.userClubId, pid: out.id, act: 'out', title: `${out.name} quiere irse`, body: `${out.name} pidió irse del club.` })
    risk.status = 'rot'; risk.happy = 55; risk.recent = [20, 30, 60]; risk.promise = { until: add(g.date, 24), share: 0.58, mins: [20, 36] }
    upset.status = 'sub'; upset.happy = 30; upset.recent = [0, 0, 0]; upset.lastTalk = add(g.date, -3)
    fall.status = 'reg'; fall.happy = 50; fall.recent = [10, 20, 15]
    hm.leaders[0].happy = 44
    mine.slice(10, 18).forEach(p => (p.reserve = true))
    c.save(); c.refresh()
    return { out: out.id, risk: risk.id, upset: upset.id, fall: fall.id, leader: hm.leaders[0].id, outName: out.name }
  }, { usedOut })
}

async function seen(page, sel) {
  // lo que está dentro de un <details> cerrado no se ve ni se alcanza con Tab: no se mide
  const n = await page.evaluate(s => { document.querySelectorAll(s).forEach(e => { const d = e.tagName === 'SUMMARY' ? e.parentElement?.parentElement : e; if (d?.closest('details:not([open])')) e.dataset.vtSkip = '1' }); return document.querySelectorAll(s).length }, sel)
  sel = sel.split(',').map(x => `${x.trim()}:not([data-vt-skip])`).join(', ')
  const out = []
  const m = await page.evaluate(s => document.querySelectorAll(s).length, sel)
  for (let i = 0; i < m && i < n; i++) {
    await page.evaluate(([s, i]) => document.querySelectorAll(s)[i]?.scrollIntoView({ block: 'center', inline: 'nearest' }), [sel, i])
    await sleep(30)
    out.push(await page.evaluate(([s, i]) => {
      const el = document.querySelectorAll(s)[i], r = el.getBoundingClientRect(), name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)
      if (!r.width || !r.height) return { name, ok: false, why: 'sin tamaño' }
      const inView = r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]]
      const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)) })
      const miss = pts.filter((_, k) => !hits[k]).map(([x, y]) => { const e = document.elementFromPoint(x, y); return `${Math.round(x)},${Math.round(y)}→${e ? (e.className?.baseVal ?? e.className) || e.tagName : 'nada'}` })
      return { name, ok: inView && hits.every(Boolean), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], why: !inView ? 'fuera de la ventana' : miss.join(', ') }
    }, [sel, i]))
  }
  return out
}
const allOk = vs => vs.length > 0 && vs.every(v => v.ok)
const why = vs => vs.filter(v => !v.ok).map(v => `${v.name}: ${v.why} ${JSON.stringify(v.rect ?? '')}`).slice(0, 3).join(' | ')
const go = async (page, r) => { await page.evaluate(r => window.__ctx().nav(r), r); await sleep(350) }
const route = page => page.evaluate(() => { const r = window.__ctx().route; return { page: r.page, tab: r.tab ?? null, sel: r.sel ?? null } })
const rootOk = page => page.evaluate(() => { const r = document.scrollingElement; return r.scrollHeight <= innerHeight + 1 && r.scrollTop === 0 })
const active = page => page.evaluate(() => { const a = document.activeElement; return { cls: (a?.className?.baseVal ?? a?.className) || a?.tagName, id: a?.id ?? '', text: (a?.textContent || '').trim().slice(0, 40), current: a?.getAttribute('aria-current'), tag: a?.tagName } })
const count = page => page.evaluate(async () => (await import('/src/engine/inbox.ts')).inboxCount(window.__ctx().g))
const pendOut = (page, pid) => page.evaluate(async pid => (await import('/src/engine/inbox.ts')).pendingAll(window.__ctx().g).some(p => p.key === `out${pid}`), pid)
const outRead = (page, pid) => page.evaluate(pid => window.__ctx().g.news.filter(n => n.act === 'out' && n.pid === pid).every(n => n.read), pid)
async function tabWalk(page, scope, max = 60) {
  const bad = []
  let n = 0
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab'); await sleep(40)
    const inScope = await page.evaluate(s => !!document.activeElement?.closest(s), scope)
    if (!inScope) { if (n) break; else continue }
    n++
    const f = await H.focusVisible(page)
    if (!f.ok) bad.push(`${f.name} (${f.vis}/5) ${JSON.stringify(f.rect)}`)
  }
  return { bad, n }
}
/** Controles de menos de 44 px de alto (celular). Los enlaces también (los referentes); no los que no son una parada (`tabindex=-1`: el nombre dentro de la fila, cuyo objetivo es la fila). */
const under44 = (page, scope) => page.evaluate(s => [...document.querySelectorAll(`${s} button, ${s} summary, ${s} [role=radio]:not([aria-disabled=true]), ${s} .ptable td:first-child, ${s} .ptable th .th-all-l`)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.vh') && e.getAttribute('tabindex') !== '-1' && (e.tagName === 'TD' ? r.width < 43.5 : e.tagName === 'LABEL' ? r.width < 43.5 || r.height < 43.5 : r.height < 43.5) })
  .map(e => `${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24)}:${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`).slice(0, 6), scope)

/**
 * Contraste de un texto sobre su fondo real: el texto se pone transparente, se captura su caja y el color más frecuente es el fondo
 * (sirve para tintes sobre degradés, que el cálculo del CSS no ve). Devuelve también el tamaño de letra.
 */
async function textContrast(page, sel) {
  const info = await page.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null
    e.scrollIntoView({ block: 'center' })
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e), out = { r: [r.x, r.y, r.width, r.height], color: cs.color, fs: parseFloat(cs.fontSize) }
    e.dataset.vtCol = e.style.color; e.style.color = 'transparent'
    return out
  }, sel)
  if (!info) return null
  await sleep(60)
  const buf = await page.screenshot({ clip: { x: info.r[0], y: info.r[1], width: Math.max(1, info.r[2]), height: Math.max(1, info.r[3]) } })
  await page.evaluate(s => { const e = document.querySelector(s); if (e) e.style.color = e.dataset.vtCol }, sel)
  const r = await page.evaluate(async ([b64, color]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data, cnt = new Map()
    for (let i = 0; i < d.length; i += 4) { const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; cnt.set(k, (cnt.get(k) || 0) + 1) }
    const bg = [...cnt].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number), fg = color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => (/^color\(srgb/.test(color) ? v * 255 : v))
    const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const a = L(fg), b = L(bg)
    return { ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, bg: `rgb(${bg})` }
  }, [buf.toString('base64'), info.color])
  return { ...r, fs: Math.round(info.fs * 10) / 10 }
}
const contrastOk = c => !!c && c.ratio >= 4.5 && c.fs >= 11.95
/** Alto de las filas de la tabla del Vestuario (máximo y mínimo). */
const rowHeights = page => page.evaluate(() => {
  const rs = [...document.querySelectorAll('.vt .ptable tbody tr')], hs = rs.map(r => r.getBoundingClientRect().height), i = hs.indexOf(Math.max(...hs))
  return { max: Math.round(hs[i]), min: Math.round(Math.min(...hs)), n: hs.length, tallest: [...(rs[i]?.children ?? [])].map(td => td.textContent.trim().slice(0, 24)).join(' | ') }
})
/** Nombres de la tabla cortados con "…" (más ancho que su caja). */
const cutNames = page => page.evaluate(() => [...document.querySelectorAll('.vt .ptable .mk-name')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent))
const headCols = page => page.evaluate(() => [...document.querySelectorAll('.ptable thead th .th-sort')].map(b => b.firstChild?.textContent))

async function run(browser, [w, h], opt = {}) {
  const tag = `${w}×${h}${opt.text ? ` texto ${opt.text} %` : ''}${opt.club ? ` ${opt.club}` : ''}`
  const { ok, res } = H.reporter(`${tag} · `)
  const { page, errs } = await H.newGame(browser, { w, h, touch: w < 760, club: opt.club ?? 'Independiente', settings: opt.text ? { text: opt.text } : undefined })
  const wide = w > 1180, phone = w <= 760, scale = (opt.text ?? 100) / 100
  // comienzo de temporada (partida nueva, nadie jugó): la celda de Minutos dice solo "—" (con su .vh) y las filas miden de 40 a 48 px
  await go(page, { page: 'locker' }); await sleep(250)
  const mc = await page.evaluate(() => [...document.querySelectorAll('.vt .ptable .vt-mins.sm')].map(m => ({ seen: [...m.querySelectorAll(':scope > :not(.vh)')].map(e => e.textContent).join(''), vh: m.querySelector('.vh')?.textContent ?? '' })))
  if (mc.length) ok('Comienzo de temporada: la celda de Minutos dice "—" y el resto va en .vh', mc.every(c => c.seen === '—' && /Todavía no cuenta/.test(c.vh)), JSON.stringify(mc[0]))
  else ok('Comienzo de temporada: la celda de Minutos dice "—" (columna oculta por el ancho)', null)
  const rh0 = await rowHeights(page), top0 = Math.round((phone ? 49 : 48) * scale + 1)
  ok(`Comienzo de temporada: filas de la tabla de ${top0} px como mucho`, rh0.n > 20 && rh0.max <= top0, JSON.stringify(rh0))
  if (w === 1440 && !opt.text && !opt.club) await shot(page, 'vestuario-inicio-1440')
  if (w === 320 && !opt.text) await shot(page, 'vestuario-inicio-320')
  if (w <= 390) { const cut = await cutNames(page); ok('Comienzo de temporada: ningún nombre de la tabla se corta', !cut.length, cut.slice(0, 4).join(', ')) }
  await go(page, { page: 'home' })
  const ids = await setupLocker(page)
  await go(page, { page: 'locker' }); await sleep(250)

  // foco al entrar: con panel, la fila elegida; sin panel, la primera fila sin elegirla
  const a0 = await active(page)
  if (wide) ok('Foco al entrar: la fila elegida de "Para atender"', /vt-att-pick/.test(a0.cls) && a0.current === 'true', JSON.stringify(a0))
  else ok('Foco al entrar: la primera fila de "Para atender", sin elegir', /vt-att-pick/.test(a0.cls) && a0.current == null && (await route(page)).page === 'locker', JSON.stringify(a0))
  const f0 = await H.focusVisible(page)
  ok('El foco al entrar se ve', f0.ok, JSON.stringify(f0))
  ok('La raíz del documento no se desplaza', await rootOk(page))
  const ov = await H.hOverflow(page)
  ok('Sin desplazamiento horizontal', !ov.over, ov.wide.join(' '))
  // orden de "Para atender": quiere irse, promesa en riesgo, molesto, en baja (y el referente que resta)
  const order = await page.evaluate(() => [...document.querySelectorAll('.vt-att-row')].map(r => Number(r.dataset.pid)))
  ok('"Para atender" en orden de urgencia', JSON.stringify(order.slice(0, 4)) === JSON.stringify([ids.out, ids.risk, ids.upset, ids.fall]) && order.includes(ids.leader), JSON.stringify(order))
  const n = await page.evaluate(() => document.querySelector('.vt-att-t .mk-cnt')?.firstChild?.textContent)
  ok('"Para atender · N" cuenta jugadores', Number(n) === order.length, `${n} / ${order.length}`)
  // primera fila a la vista sin desplazar
  await page.evaluate(() => { document.getElementById('main').scrollTop = 0 }); await sleep(80)
  const r1 = await H.visibility(page, '.vt-att-row:first-child .vt-att-pick')
  ok('La primera fila de "Para atender" se ve sin desplazar', r1.length && r1[0].rect[1] + 40 < h, JSON.stringify(r1[0]?.rect))
  // un "Hablar" deshabilitado nunca: la charla usada es texto
  ok('Sin "Hablar" deshabilitado en las filas', await page.evaluate(() => ![...document.querySelectorAll('.vt-att button')].some(b => b.disabled)))
  ok('Charla usada como texto en la fila', await page.evaluate(pid => /Hablaron el .* · de nuevo desde el/.test(document.querySelector(`.vt-att-row[data-pid="${pid}"] .vt-talkst`)?.textContent ?? ''), ids.upset))

  // visibilidad de cada control
  for (const [name, sel] of [['Encabezado', '.vt-head button, .vt-head summary'], ['Para atender (filas y acciones)', '.vt-att button'], ['Chips de filtro', '.vt-filters button']]) {
    const v = await seen(page, sel); ok(`Se ven: ${name}`, allOk(v), why(v))
  }
  if (wide) { const v = await seen(page, '.vt-panel button:not(:disabled)'); ok('Se ven: panel (LockerCard)', allOk(v), why(v)) }
  const small = await H.smallText(page, '.vt')
  ok('Nada por debajo de 12 px', !small.length, small.join(' '))
  if (phone) { const u = await under44(page, '.vt'); ok('44 px en el celular', !u.length, u.join(' ')) }
  // Tab por toda la pantalla: cada foco se ve
  await page.evaluate(() => { document.getElementById('main').scrollTop = 0; document.querySelector('.vt-title')?.setAttribute('tabindex', '-1'); document.querySelector('.vt-title')?.focus() })
  const tw = await tabWalk(page, '.vt', 90)
  ok('Bajando con Tab, cada foco se ve', !tw.bad.length && tw.n > 8, `${tw.n} paradas · ${tw.bad.slice(0, 3).join(' | ')}`)
  await page.evaluate(() => { document.getElementById('main').scrollTop = 0; document.querySelector('.vt-filters')?.scrollTo(0, 0) }); await sleep(100)
  if (w === 1440 && !opt.text && !opt.club) await shot(page, 'vestuario-1440', true)
  if (w === 1024 && !opt.text) await shot(page, 'vestuario-1024')
  if (opt.club) await shot(page, 'vestuario-defensa-1440')
  if (opt.text && w === 390) await shot(page, 'vestuario-390-texto-120')
  if (w === 390 && !opt.text) await shot(page, 'vestuario-390', true)
  if (w === 320 && !opt.text) await shot(page, 'vestuario-320')

  const rh1 = await rowHeights(page), top1 = Math.round((phone ? 49 : 48) * scale + 1)
  ok(`Plantel con motivos: filas de ${top1} px como mucho`, rh1.max <= top1, JSON.stringify(rh1))
  if (w <= 390) { const cut = await cutNames(page); ok('Los nombres de la tabla se leen enteros (nombre corto o en dos renglones)', !cut.length, cut.slice(0, 4).join(', ')) }
  // columnas por prioridad: a 320-390 px, nombre y conformidad; en la vista Reserva, nombre y alternable
  const cols = await page.evaluate(() => [...document.querySelectorAll('.vt .ptable thead th .th-sort')].map(b => b.firstChild?.textContent))
  if (w <= 390) ok('Vista Vestuario angosta: nombre y conformidad', JSON.stringify(cols) === JSON.stringify(['Jugador', 'Conform.']), JSON.stringify(cols))
  if (w === 1440 && !opt.text) ok('Vista Vestuario a 1440: nombre, puesto, rol, minutos, conformidad y moral', ['Jugador', 'Pos', 'Rol', 'Minutos', 'Conform.', 'Moral'].every(c => cols.includes(c)) && !cols.includes('Personalidad'), JSON.stringify(cols))

  // la charla: desde el "Hablar" de una fila (el de "en baja")
  const fallRow = `.vt-att-row[data-pid="${ids.fall}"]`
  await page.click(`${fallRow} .vt-att-talk`); await sleep(300)
  const t0 = await active(page)
  ok('Charla: el foco en la primera opción habilitada', t0.cls.includes('vt-opt') && (await page.evaluate(() => document.activeElement.getAttribute('aria-disabled'))) !== 'true', JSON.stringify(t0))
  const first = await page.evaluate(() => [...document.querySelectorAll('.vt-opt')].map(o => o.dataset.k))
  ok('"En baja": primero "Cambiarle el rol"', first[0] === 'status', first.join(','))
  const labelled = await page.evaluate(() => { const m = document.querySelector('.modal'), id = m?.getAttribute('aria-labelledby'); return !!id && document.getElementById(id)?.textContent.startsWith('Charla con') && !!document.querySelector('.vt-opts[role=radiogroup][aria-labelledby]') })
  ok('Ventana con aria-labelledby y radiogroup con nombre', labelled)
  { const v = await seen(page, '.modal .vt-opt:not([aria-disabled=true]), .modal .vt-talk-foot button, .modal .btn.icon'); ok('Charla: opciones, Cancelar, Hablar y ✕ se ven', allOk(v), why(v)) }
  const smallM = await H.smallText(page, '.modal'); ok('Charla: nada por debajo de 12 px', !smallM.length, smallM.join(' '))
  if (w === 1440 && !opt.text && !opt.club) { await page.evaluate(() => { document.querySelector('.modal').scrollTop = 0 }); await shot(page, 'charla-elegir-1440') }
  // cambiarle el rol: confirmación en el lugar; "No" y Esc vuelven sin gastar la charla
  await page.keyboard.press('Space'); await sleep(150)
  await page.click('.vt-opt-wrap[data-kw="status"] .vt-opt-extra .seg button:first-child'); await sleep(120)
  await page.click('.vt-talk-go'); await sleep(200)
  const c0 = await active(page)
  ok('Confirmación: el foco en "Confirmar: …"', /^Confirmar: cambiarle el rol/.test(c0.text), JSON.stringify(c0))
  { const v = await seen(page, '.modal .vt-confirm button'); ok('Confirmación: "No" y "Confirmar" se alcanzan', allOk(v), why(v)) }
  if (w === 320 && !opt.text) await shot(page, 'charla-confirmar-320')
  if (w === 390 && !opt.text) { await page.evaluate(() => { const m = document.querySelector('.modal'); m?.querySelector('.vt-opt-wrap[data-kw="status"]')?.scrollIntoView({ block: 'start' }) }); await sleep(100); await shot(page, 'charla-rol-390') }
  await page.keyboard.press('Escape'); await sleep(200)
  const stillOpen = await page.evaluate(() => !!document.querySelector('.vt-talk') && !document.querySelector('.vt-confirm'))
  ok('Esc en la confirmación vuelve a elegir (no cierra)', stillOpen)
  ok('Volver a elegir no gastó la charla', await page.evaluate(pid => !window.__ctx().g.players[pid].lastTalk, ids.fall))
  // cerrar sin hablar: el foco vuelve al "Hablar" de la fila
  await page.keyboard.press('Escape'); await sleep(250)
  const c1 = await active(page)
  ok('Cerrar sin hablar: el foco vuelve a "Hablar" de la fila', /vt-att-talk/.test(c1.cls), JSON.stringify(c1))
  // hablar (felicitarlo, sin confirmación): respuesta con antes → después y el foco en ella
  await page.click(`${fallRow} .vt-att-talk`); await sleep(300)
  const before = await page.evaluate(pid => { const p = window.__ctx().g.players[pid]; return [Math.floor(p.happy), Math.floor(p.morale)] }, ids.fall)
  await page.click('.vt-opt[data-k="praise"]'); await sleep(150)
  if (w === 1440) {
    const under = await page.evaluate(() => getComputedStyle(document.querySelector('.vt-opt-wrap[data-kw="praise"]')).borderColor)
    await page.mouse.move(2, 2); await sleep(200)
    const away = await page.evaluate(() => getComputedStyle(document.querySelector('.vt-opt-wrap[data-kw="praise"]')).borderColor)
    ok('Charla: la opción marcada se ve marcada también con el puntero encima', under === away, `${under} / ${away}`)
  }
  await page.click('.vt-talk-go'); await sleep(300)
  const rep = await page.evaluate(() => ({ focus: document.activeElement?.classList.contains('vt-reply'), role: document.querySelector('.vt-reply')?.getAttribute('role'), rows: [...document.querySelectorAll('.vt-reply .mk-impact tr')].map(tr => tr.textContent) }))
  const after = await page.evaluate(pid => { const p = window.__ctx().g.players[pid]; return [Math.floor(p.happy), Math.floor(p.morale)] }, ids.fall)
  ok('Respuesta: role="status" con el foco', rep.focus && rep.role === 'status', JSON.stringify(rep))
  ok('Respuesta: conformidad y moral antes → después iguales al motor', rep.rows[0]?.includes(`${before[0]}`) && rep.rows[0]?.includes(`${after[0]}`) && rep.rows[1]?.includes(`${before[1]}`) && rep.rows[1]?.includes(`${after[1]}`), `${JSON.stringify(rep.rows)} ${before}→${after}`)
  { const v = await seen(page, '.modal .vt-reply button'); ok('Respuesta: "Listo" se ve', allOk(v), why(v)) }
  if (w === 1440 && !opt.text && !opt.club) await shot(page, 'charla-respuesta-1440')
  await page.click('.vt-reply .btn.primary'); await sleep(300)
  const c2 = await active(page)
  ok('Cerrar después de hablar: el foco a la fila (o al título si se fue)', /vt-att-pick/.test(c2.cls) || c2.id === 'vt-att-t', JSON.stringify(c2))
  ok('Después de hablar: la fila dice cuándo se puede volver a hablar', await page.evaluate(pid => { const r = document.querySelector(`.vt-att-row[data-pid="${pid}"]`); return !r || /Hablaron hoy · de nuevo desde el/.test(r.textContent) }, ids.fall))

  // "Armar la reserva": vista Reserva, la entrada queda con tab todo, alternable visible y tocarlo anota
  await page.click('.vt-res-go'); await sleep(450)
  const rt = await route(page)
  ok('"Armar la reserva": la entrada queda con tab: todo', rt.tab === 'todo', JSON.stringify(rt))
  const fa0 = await page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, first: a === document.querySelector('.vt .ptable tbody tr[data-pid]') } })
  const fa1 = await H.focusVisible(page)
  ok('"Armar la reserva": el foco en la primera fila del orden nuevo, entera a la vista', fa0.tag === 'TR' && fa0.first && fa1.ok, `${JSON.stringify(fa0)} ${JSON.stringify(fa1)}`)
  const view = await page.evaluate(() => document.querySelector('.vt .ptable-bar .seg[aria-label="Vista"] button[aria-pressed=true]')?.textContent)
  ok('"Armar la reserva": vista Reserva y la línea de ayuda', view === 'Reserva' && !!(await page.$('.vt-resmode')), view)
  const toggles = await seen(page, '.vt .ptable tbody tr:first-child .vt-res, .vt .ptable tbody tr:last-child .vt-res')
  ok('Vista Reserva: el alternable de la primera y la última fila se ve', allOk(toggles), why(toggles))
  const nameW = await page.evaluate(() => Math.round(document.querySelector('.vt .ptable thead th:nth-child(2)')?.getBoundingClientRect().width ?? 0))
  if (w <= 390 && !opt.text) ok('Vista Reserva: el nombre mide al menos 120 px', nameW >= 120, `${nameW} px`)
  if (w <= 390) { const cut = await cutNames(page); ok('Vista Reserva: ningún nombre se corta', !cut.length, cut.slice(0, 4).join(', ')) }
  const m0 = await page.evaluate(() => window.__ctx().g && Object.values(window.__ctx().g.players).filter(p => p.clubId === window.__ctx().g.userClubId && p.reserve).length)
  const off = await page.$('.vt .ptable tbody .vt-res:not(.on)')
  if (off) { await off.click(); await sleep(250) }
  const m1 = await page.evaluate(() => Object.values(window.__ctx().g.players).filter(p => p.clubId === window.__ctx().g.userClubId && p.reserve).length)
  const line = await page.evaluate(() => document.querySelector('.vt-res-txt')?.textContent ?? '')
  ok('Tocar "Anotar" anota y la línea del encabezado suma 1', m1 === m0 + 1 && line.includes(`${m1} anotados`), `${m0}→${m1} · ${line}`)
  const said = await page.evaluate(() => document.querySelector('.vt .ptable-wrap [role=status].vh')?.textContent ?? '')
  ok('El alternable de la tabla anuncia el cambio (role="status")', /^Anotaste a .* en la reserva: \d+ anotados? y sanos?/.test(said), said)
  const modeN = await page.evaluate(() => document.querySelector('.vt-resmode-n')?.textContent ?? '')
  ok('La línea del modo cuenta anotados y sanos como el encabezado', /\d+ anotados?(, \d+ sanos?)? · (faltan \d+|mínimo \d+ sanos)/.test(modeN), modeN)
  if (w === 390 && !opt.text) await shot(page, 'reserva-390')
  {
    // solo con el teclado: Espacio en dos filas y "A la reserva" (que deja de dibujarse): el foco va a la nota, a la vista, nunca a body
    await page.evaluate(() => { Object.values(window.__ctx().g.players).forEach(p => { if (p.clubId === window.__ctx().g.userClubId) p.reserve = false }); window.__ctx().refresh() }); await sleep(200)
    await page.focus('.vt .ptable tbody tr[tabindex="0"]'); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown'); await sleep(60); await page.keyboard.press('Space'); await sleep(150)
    const fr = await H.focusVisible(page)
    ok('Con dos filas marcadas, la fila con foco se ve (no queda debajo de la barra masiva)', fr.ok, JSON.stringify(fr))
    await page.evaluate(() => [...document.querySelectorAll('.bulkbar button')].find(b => b.textContent === 'A la reserva')?.focus())
    await page.keyboard.press('Enter'); await sleep(300)
    const m2 = await page.evaluate(() => Object.values(window.__ctx().g.players).filter(p => p.clubId === window.__ctx().g.userClubId && p.reserve).length)
    ok('Con el teclado: Espacio en dos filas y "A la reserva" anota a los dos', m2 === 2, `${m2}`)
    const fn = await active(page), fv = await H.focusVisible(page)
    ok('Después de "A la reserva": el foco en la nota (role="status"), a la vista', /bulk-note/.test(fn.cls) && fv.ok, `${JSON.stringify(fn)} ${JSON.stringify(fv)}`)
    await page.evaluate(() => [...document.querySelectorAll('.bulkbar button')].find(b => b.textContent === 'Limpiar')?.click()); await sleep(150)
  }
  // volver a la vista Vestuario
  await page.click('.vt .ptable-bar .seg[aria-label="Vista"] button:text-is("Vestuario")'); await sleep(200)

  // historial: tres filtros y Atrás sale del Vestuario
  await go(page, { page: 'home' }); await go(page, { page: 'locker' })
  for (const i of [1, 2, 0]) { await page.click(`.vt-filters button:nth-child(${i + 1})`); await sleep(150) }
  await page.evaluate(() => window.__ctx().back()); await sleep(300)
  ok('Tres filtros y Atrás sale del Vestuario', (await route(page)).page === 'home')
  await go(page, { page: 'locker' })
  // elegir: con panel reemplaza la entrada; sin panel abre la ficha › Vestuario y Atrás vuelve con el foco en la fila
  if (wide) {
    await page.click(`.vt-att-row[data-pid="${ids.risk}"] .vt-att-pick`); await sleep(250)
    const r = await route(page)
    await page.evaluate(() => window.__ctx().back()); await sleep(300)
    ok('Con panel, elegir no apila', r.sel === `p${ids.risk}` && (await route(page)).page !== 'locker', JSON.stringify(r))
    await go(page, { page: 'locker' })
  } else {
    await page.click(`.vt-att-row[data-pid="${ids.risk}"] .vt-att-pick`); await sleep(400)
    const r = await route(page)
    ok('Sin panel, elegir abre la ficha › Vestuario', r.page === 'player' && r.tab === 'personal', JSON.stringify(r))
    const fa = await active(page)
    ok('Ficha › Vestuario: el foco en "Hablar con él"', /vt-card-talk/.test(fa.cls), JSON.stringify(fa))
    await page.evaluate(() => window.__ctx().back()); await sleep(400)
    const fb = await active(page)
    ok('Atrás: el foco en la fila de la que salió', /vt-att-pick/.test(fb.cls) && (await page.evaluate(pid => document.activeElement.closest('.vt-att-row')?.dataset.pid == pid, ids.risk)), JSON.stringify(fb))
  }

  // ficha › Vestuario y la banda: hablar desde la banda deja el foco en el texto de la charla, en Resumen
  await go(page, { page: 'player', id: ids.risk, tab: 'resumen' })
  await page.click('.vt-band-hablar'); await sleep(300)
  await page.click('.vt-opt[data-k="praise"]'); await page.click('.vt-talk-go'); await sleep(250)
  await page.click('.vt-reply .btn.primary'); await sleep(300)
  const fbd = await active(page)
  ok('Desde la banda: el foco vuelve al texto de la charla en la banda, en Resumen', /vt-talkst/.test(fbd.cls) && !!(await page.evaluate(() => document.activeElement.closest('.vt-band-talk'))) && (await route(page)).tab === 'resumen', JSON.stringify(fbd))
  await go(page, { page: 'player', id: ids.risk, tab: 'personal' })
  { const v = await seen(page, '.vt-scope button:not(:disabled)'); ok('Ficha › Vestuario: los controles se ven', allOk(v), why(v)) }
  const smallF = await H.smallText(page, '.vt-scope'); ok('Ficha › Vestuario: nada por debajo de 12 px', !smallF.length, smallF.join(' '))
  if ((w === 1440 || w === 390) && !opt.text && !opt.club) await shot(page, `ficha-vestuario-${w}`, w === 1440)
  // Esc en una charla abierta en la ficha cierra la ventana y nada más: la ficha queda, el foco vuelve a "Hablar"
  await go(page, { page: 'player', id: ids.leader, tab: 'resumen' })
  await page.click('.vt-band-hablar'); await sleep(300); await page.keyboard.press('Escape'); await sleep(300)
  const e1 = await route(page), e1a = await active(page)
  ok('Esc en la charla abierta desde la banda: la ficha queda y el foco vuelve a "Hablar"', e1.page === 'player' && e1.tab === 'resumen' && /vt-band-hablar/.test(e1a.cls) && !(await page.$('.modal')), `${JSON.stringify(e1)} ${JSON.stringify(e1a)}`)
  await go(page, { page: 'player', id: ids.leader, tab: 'personal' })
  await page.click('.vt-scope .vt-card-talk'); await sleep(300); await page.keyboard.press('Escape'); await sleep(300)
  const e2 = await route(page), e2a = await active(page)
  ok('Esc en la charla abierta desde ficha › Vestuario: la ficha queda y el foco vuelve a "Hablar con él"', e2.page === 'player' && e2.tab === 'personal' && /vt-card-talk/.test(e2a.cls), `${JSON.stringify(e2)} ${JSON.stringify(e2a)}`)
  // el alternable de la reserva de la tarjeta anuncia el cambio con la nota F7
  await page.click('.vt-scope .vt-res'); await sleep(250)
  const rn = await page.evaluate(() => document.querySelector('.vt-scope .vt-res-note')?.textContent ?? '')
  ok('LockerCard › reserva: la nota F7 anuncia el cambio con la cuenta', /^(Anotaste|Sacaste) a .* reserva: \d+ anotados? y sanos?/.test(rn), rn)
  // "Quiere irse" en la banda de la ficha: 4,5:1 y 12 px como mínimo (pixeles reales sobre el degradé del club)
  await go(page, { page: 'player', id: ids.out, tab: 'resumen' })
  if (w === 1440 && !opt.text && !opt.club) { await page.evaluate(() => { document.getElementById('main').scrollTop = 0 }); await sleep(100); await shot(page, 'ficha-quiere-irse-1440') }
  const cb = await textContrast(page, '.pband .chip.bad')
  ok('"Quiere irse" en la banda de la ficha: ≥ 4,5:1 y ≥ 12 px', contrastOk(cb), JSON.stringify(cb))
  const dimB = await textContrast(page, '.pband-id .dim')
  ok('--dim en la banda de la ficha: ≥ 4,5:1', !!dimB && dimB.ratio >= 4.5, JSON.stringify(dimB))
  if (phone) { const u = await under44(page, '.pband-tabs'); ok('Ficha en el celular: pestañas y botones de la banda de 44 px', !u.length, u.join(' ')) }
  if (!phone) {
    // la ficha breve (pasar el mouse por una fila de la tabla): la moral con la escala nueva y "Quiere irse" legible
    await go(page, { page: 'locker' })
    await page.evaluate(pid => document.querySelector(`.vt .ptable tr[data-pid="${pid}"]`)?.scrollIntoView({ block: 'center' }), ids.out); await sleep(400)
    await page.hover(`.vt .ptable tr[data-pid="${ids.out}"] td:nth-child(2)`); await sleep(900)
    const hc = await page.evaluate(() => ({ on: !!document.querySelector('.hovercard'), sc: document.querySelectorAll('.hovercard .vt-scale').length, words: [...document.querySelectorAll('.hovercard .vt-scale-w')].map(e => e.textContent) }))
    ok('Ficha breve: la moral y la conformidad con la escala del vestuario (número y palabra)', hc.on && hc.sc === 2, JSON.stringify(hc))
    const ch = await textContrast(page, '.hovercard .chip.bad')
    ok('Ficha breve: "Quiere irse" ≥ 4,5:1 y ≥ 12 px', contrastOk(ch), JSON.stringify(ch))
    await page.mouse.move(2, 2)
  }
  ok('Sin errores en la consola', !errs.length, errs.slice(0, 3).join(' | '))
  await page.close()
  return res
}

/** Una decisión, una vez: el pedido de salida cuenta 1 y cada camino que lo resuelve baja 1 y deja el mensaje leído. */
async function runOut(browser) {
  const { ok, res } = H.reporter('Pedido de salida · ')
  const { page, errs } = await H.newGame(browser, { w: 1440, h: 900 })
  const fresh = async (usedOut = false) => { const before = await count(page); const ids = await setupLocker(page, { usedOut }); await sleep(150); return { ids, before } }
  // la insignia sube 1, no 2
  let { ids } = await fresh()
  await page.evaluate(() => { const g = window.__ctx().g; g.news.forEach(n => { if (n.act !== 'out') n.read = true }); window.__ctx().refresh() })
  const c0 = await count(page)
  ok('Un pedido nuevo suma 1 a la insignia (no 2)', c0 === 1, `${c0}`)
  await go(page, { page: 'locker' })
  ok('El Vestuario no tiene insignia propia', !(await page.$('.subnav [href*=locker] .pdot, .subnav button:has-text("Vestuario") .pdot')))
  // 1. "Decirle que no se va" desde el Vestuario
  await page.click(`.vt-att-row[data-pid="${ids.out}"] .vt-att-talk`); await sleep(300)
  const opts = await page.evaluate(() => [...document.querySelectorAll('.vt-opt')].map(o => o.dataset.k))
  ok('Con un pedido, la charla empieza por "Decirle que no se va"', opts[0] === 'stay', opts.join(','))
  await page.click('.vt-opt[data-k="stay"]'); await page.click('.vt-talk-go'); await sleep(300)
  ok('"Decirle que no se va": el pendiente sale, el mensaje queda leído y la insignia baja 1', !(await pendOut(page, ids.out)) && (await outRead(page, ids.out)) && (await count(page)) === 0, `${await count(page)}`)
  await page.click('.vt-reply .btn.primary'); await sleep(200)
  // 2. "Declararlo transferible" desde la LockerCard (charla disponible)
  ;({ ids } = await fresh())
  await go(page, { page: 'locker', sel: `p${ids.out}` })
  await page.click('.vt-panel .vt-card-list'); await sleep(300)
  const note = await page.evaluate(() => ({ f: document.activeElement?.closest('.vt-card-note') != null, t: document.querySelector('.vt-card-note')?.textContent }))
  ok('LockerCard › "Declararlo transferible": nota con el foco', note.f && /Declaraste transferible/.test(note.t), JSON.stringify(note))
  ok('LockerCard › "Declararlo transferible": resuelve y marca leído', !(await pendOut(page, ids.out)) && (await outRead(page, ids.out)))
  ok('…sin gastar la charla ni cambiar el humor', await page.evaluate(pid => { const p = window.__ctx().g.players[pid]; return !p.lastTalk && Math.floor(p.happy) === 14 && Math.floor(p.morale) === 41 }, ids.out))
  // 3. Con la charla usada: la fila ofrece "Declararlo transferible" con la comparación y la fecha
  ;({ ids } = await fresh(true))
  await go(page, { page: 'locker', sel: `p${ids.out}` })
  const row = await page.evaluate(pid => { const r = document.querySelector(`.vt-att-row[data-pid="${pid}"]`); return { list: !!r.querySelector('.vt-att-lst'), talk: !!r.querySelector('.vt-att-talk'), letgo: !!r.querySelector('.vt-letgo'), note: r.querySelector('.vt-att-on')?.textContent } }, ids.out)
  ok('Charla usada: la fila ofrece "Declararlo transferible" y la comparación, sin "Hablar"', row.list && !row.talk && row.letgo && /de nuevo desde el/.test(row.note ?? ''), JSON.stringify(row))
  const card = await page.evaluate(() => ({ prim: document.querySelector('.vt-panel .vt-card-list')?.classList.contains('primary'), lg: /\(charla, desde el/.test(document.querySelector('.vt-panel .vt-letgo')?.textContent ?? '') }))
  ok('Charla usada: en la LockerCard el primario es "Declararlo transferible" y la comparación dice "(charla, desde el …)"', card.prim && card.lg, JSON.stringify(card))
  await shot(page, 'pedido-charla-usada-1440')
  await page.click(`.vt-att-row[data-pid="${ids.out}"] .vt-att-lst`); await sleep(300)
  const rn = await page.evaluate(() => ({ f: !!document.activeElement?.closest('.vt-att-note, .vt-page-note'), t: document.activeElement?.textContent }))
  ok('Fila › "Declararlo transferible": la nota del origen recibe el foco', rn.f, JSON.stringify(rn))
  ok('Fila › "Declararlo transferible": resuelve y marca leído', !(await pendOut(page, ids.out)) && (await outRead(page, ids.out)))
  // 4. Bandeja con la charla usada: Enter lleva al título; otro Enter no decide; Tab sigue el orden visual (la tarjeta, después "Declararlo transferible")
  ;({ ids } = await fresh(true))
  await H.openInbox(page, null, 'club.todo')
  await page.focus(`[data-k="out${ids.out}"]`); await sleep(80)
  await page.keyboard.press('Enter'); await sleep(300)
  const ib = await active(page)
  ok('Bandeja (charla usada): Enter deja el foco en el título', /ib-h/.test(ib.cls), JSON.stringify(ib))
  await page.keyboard.press('Enter'); await sleep(200)
  ok('…un segundo Enter no lo declara transferible', !(await page.evaluate(pid => window.__ctx().g.players[pid].listed, ids.out)))
  await page.keyboard.press('Tab'); await sleep(100)
  ok('…Tab no salta: la siguiente parada es la tarjeta del jugador', /ib-who/.test((await active(page)).cls), JSON.stringify(await active(page)))
  await page.keyboard.press('Tab'); await sleep(100)
  ok('…y la siguiente, "Declararlo transferible"', /Declararlo transferible/.test((await active(page)).text), JSON.stringify(await active(page)))
  ok('Bandeja: la comparación de los dos caminos a la vista', await page.evaluate(() => !!document.querySelector('.ib-panel .vt-letgo')))
  const once = await page.evaluate(() => (document.querySelector('.ib-panel')?.textContent.match(/Hablaron el/g) ?? []).length)
  ok('Bandeja: la charla usada se dice una sola vez', once === 1, `${once}`)
  const cib = await textContrast(page, '.ib-panel .ib-who .chip.bad')
  ok('Bandeja: "Quiere irse" en la tarjeta ≥ 4,5:1 y ≥ 12 px', contrastOk(cib), JSON.stringify(cib))
  const gap = await page.evaluate(() => { const a = document.querySelector('.ib-panel .ib-actwrap'), l = document.querySelector('.ib-panel .vt-letgo'); return a && l ? Math.round(l.getBoundingClientRect().top - a.getBoundingClientRect().bottom) : null })
  ok('Bandeja: la comparación separada de los botones (12 px)', gap != null && gap >= 11, `${gap}`)
  await shot(page, 'bandeja-pedido-1440')
  await page.keyboard.press('Enter'); await sleep(300)
  ok('Bandeja › "Declararlo transferible": resuelve y marca leído', !(await pendOut(page, ids.out)) && (await outRead(page, ids.out)))
  // 5. Acción masiva de la tabla (setListed) y "Quitar de transferibles" lo reabre con el mensaje leído
  ;({ ids } = await fresh())
  await go(page, { page: 'locker' })
  await page.click(`.vt .ptable tbody tr[data-pid="${ids.out}"] td:first-child`); await sleep(150)
  await page.click('.bulkbar button:text-is("Declarar transferibles")'); await sleep(250)
  ok('Acción masiva "Declarar transferibles": resuelve y marca leído', !(await pendOut(page, ids.out)) && (await outRead(page, ids.out)))
  await page.click('.bulkbar button:text-is("Quitar de transferibles")'); await sleep(250)
  ok('"Quitar de transferibles": vuelve a "Para decidir" (cuenta 1) con el mensaje leído', (await pendOut(page, ids.out)) && (await outRead(page, ids.out)) && (await count(page)) === 1, `${await count(page)}`)
  // 6. Vender aceptando una oferta del exterior (acceptOffer) y renovarlo (applyRenewal)
  for (const how of ['abroad', 'renew']) {
    ;({ ids } = await fresh())
    const r = await page.evaluate(async ([pid, how]) => {
      const C = await import('/src/engine/career.ts'), S = await import('/src/engine/squad.ts'), g = window.__ctx().g, p = g.players[pid]
      if (how === 'abroad') { const id = 990000 + pid; g.offers.push({ id, pid, from: 0, fromName: 'Club del exterior', fee: p.value, date: g.date }); C.acceptOffer(g, g.offers.find(o => o.id === id)) }
      else S.applyRenewal(g, p, { wage: p.wage, years: 2, status: p.status, clause: 0, bonus: 0 })
      window.__ctx().refresh(); return true
    }, [ids.out, how])
    await sleep(150)
    ok(`${how === 'abroad' ? 'Venta al exterior (acceptOffer)' : 'Renovación (applyRenewal)'}: resuelve y marca leído`, r && !(await pendOut(page, ids.out)) && (await outRead(page, ids.out)))
  }
  // 7. "Hablar con él" de la bandeja con la charla usada: el foco en el título de Charla y no en "Declararlo transferible"
  ;({ ids } = await fresh(true))
  await go(page, { page: 'player', id: ids.out, tab: 'personal' }); await sleep(200)
  const fc = await active(page)
  ok('Ficha › Vestuario con la charla usada: el foco en el título "Charla"', fc.id === 'vt-card-h-talk', JSON.stringify(fc))
  await page.keyboard.press('Enter'); await sleep(150)
  ok('…un Enter ahí no cambia p.listed', !(await page.evaluate(pid => window.__ctx().g.players[pid].listed, ids.out)))
  await page.keyboard.press('Tab'); await sleep(100)
  ok('…y el siguiente Tab llega a "Declararlo transferible"', /Declararlo transferible/.test((await active(page)).text))
  // Inicio: la línea "Vestuario" con N de attentionOf, sin nombrar los pedidos
  await go(page, { page: 'home' })
  const homeLine = await page.evaluate(() => [...document.querySelectorAll('.main .row.between')].map(r => r.textContent).find(t => t.startsWith('Vestuario:')) ?? '')
  const N = await page.evaluate(async () => (await import('/src/engine/squad.ts')).attentionOf(window.__ctx().g).length)
  ok('Inicio: "Vestuario: … · N casos" con el N de "Para atender" y sin "quiere irse"', homeLine.includes(`${N} casos`) && !/quiere/.test(homeLine), homeLine)
  // mensaje de reserva: "Armar la reserva" abre el modo y la entrada queda con tab todo
  await page.evaluate(() => { const g = window.__ctx().g; g.news.unshift({ id: g.nextId++, date: g.date, me: true, tag: 'partido', clubId: g.userClubId, act: 'reserve', title: 'Reserva: no hubo partido', body: 'Faltaron anotados.' }); window.__ctx().refresh() })
  const rid = await page.evaluate(() => window.__ctx().g.news[0].id)
  await H.openInbox(page, `n${rid}`)
  await page.click('.ib-panel button:text-is("Armar la reserva")'); await sleep(500)
  const rr = await route(page), vw = await page.evaluate(() => document.querySelector('.vt .ptable-bar .seg[aria-label="Vista"] button[aria-pressed=true]')?.textContent)
  ok('Mensaje de reserva › "Armar la reserva": modo Reserva y tab: todo', rr.page === 'locker' && rr.tab === 'todo' && vw === 'Reserva', `${JSON.stringify(rr)} ${vw}`)
  // con el guardado roto (IndexedDB que falla), hablar muestra la nota de error y la charla queda hecha en la sesión
  ;({ ids } = await fresh())
  await go(page, { page: 'locker', sel: `p${ids.upset}` })
  await page.evaluate(() => { window.__idbOpen = indexedDB.open.bind(indexedDB); indexedDB.open = () => { throw new Error('IndexedDB roto (prueba)') } })
  await page.click(`.vt-att-row[data-pid="${ids.fall}"] .vt-att-talk`); await sleep(300)
  await page.click('.vt-opt[data-k="praise"]'); await page.click('.vt-talk-go'); await sleep(400)
  const err = await page.evaluate(pid => ({ note: !!document.querySelector('.vt-reply .ib-result.err'), done: !!window.__ctx().g.players[pid].lastTalk }), ids.fall)
  ok('Guardado fallido: la respuesta muestra la nota de error y la charla queda hecha', err.note && err.done, JSON.stringify(err))
  await page.click('.vt-reply .btn.primary'); await sleep(200)
  await page.evaluate(() => { indexedDB.open = window.__idbOpen })
  errs.splice(0, errs.length, ...errs.filter(e => !/IndexedDB roto|No se pudo guardar/.test(e)))
  ok('Sin errores en la consola', !errs.length, errs.slice(0, 3).join(' | '))
  // el jugador se va del plantel con la charla abierta: la ventana lo dice y el foco va a "Listo", nunca a body
  ;({ ids } = await fresh())
  await go(page, { page: 'locker', sel: `p${ids.fall}` })
  await page.click(`.vt-att-row[data-pid="${ids.fall}"] .vt-att-talk`); await sleep(300)
  await page.evaluate(pid => { const c = window.__ctx(), g = c.g, other = Object.values(g.clubs).find(x => x.division === 1 && x.id !== g.userClubId); g.players[pid].clubId = other.id; c.refresh() }, ids.fall); await sleep(300)
  const lf = await active(page)
  ok('Se va con la charla abierta: "Ya no está en el plantel." y el foco en "Listo"', /Listo/.test(lf.text) && (await page.evaluate(() => /Ya no está en el plantel/.test(document.querySelector('.vt-talk')?.textContent ?? ''))), JSON.stringify(lf))
  await page.keyboard.press('Enter'); await sleep(250)
  // axe-core en la pantalla con un elegido, la ficha › Vestuario y la ventana en sus tres estados
  if (AXE) {
    const axe = async (name, inc) => {
      await page.evaluate(AXE)
      const r = await page.evaluate(async inc => { const res = await window.axe.run(document.querySelector(inc) ?? document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return res.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => `${n.target.join(' ')} ${n.html.slice(0, 90)}`).join(' | ')}`) }, inc)
      ok(`axe: ${name}`, !r.length, r.join(' ; '))
    }
    ;({ ids } = await fresh())
    await go(page, { page: 'locker', sel: `p${ids.out}` }); await axe('Vestuario con un elegido', 'body')
    await go(page, { page: 'player', id: ids.out, tab: 'personal' }); await axe('Ficha › Vestuario', 'body')
    await page.click('.vt-scope .vt-card-talk'); await sleep(300); await axe('Charla: elegir', '.modal')
    await page.click('.vt-opt[data-k="promise"]'); await page.click('.vt-talk-go'); await sleep(200); await axe('Charla: confirmación', '.modal')
    await page.click('.vt-confirm .btn.primary'); await sleep(250); await axe('Charla: respuesta', '.modal')
    await page.click('.vt-reply .btn.primary'); await sleep(200)
    // "Cambiarle el rol" marcada (el selector de rol ya no está dentro del radio) y su confirmación
    await go(page, { page: 'locker', sel: `p${ids.fall}` })
    await page.click(`.vt-att-row[data-pid="${ids.fall}"] .vt-att-talk`); await sleep(300)
    await page.click('.vt-opt[data-k="status"]'); await sleep(150); await axe('Charla: "Cambiarle el rol" marcada', '.modal')
    await page.click('.vt-opt-wrap[data-kw="status"] .vt-opt-extra .seg button:first-child'); await page.click('.vt-talk-go'); await sleep(200); await axe('Charla: confirmación de cambiar el rol', '.modal')
    await page.keyboard.press('Escape'); await sleep(150); await page.keyboard.press('Escape'); await sleep(200)
    // la bandeja con el pedido de salida (con la charla disponible y usada)
    ;({ ids } = await fresh())
    await H.openInbox(page, `out${ids.out}`, 'club.todo'); await axe('Bandeja: pedido de salida', '.ib-panel')
    ;({ ids } = await fresh(true))
    await H.openInbox(page, `out${ids.out}`, 'club.todo'); await axe('Bandeja: pedido de salida con la charla usada', '.ib-panel')
  }
  await page.close()
  return res
}

/** 320 × 256 (zoom o celular apaisado): con filas marcadas, la barra masiva no tapa la fila con foco ni "Seleccionar todos". */
async function runShort(browser) {
  const { ok, res } = H.reporter('320×256 · ')
  const { page, errs } = await H.newGame(browser, { w: 320, h: 256, touch: true })
  await setupLocker(page)
  await go(page, { page: 'locker' }); await sleep(250)
  await page.focus('.vt .ptable tbody tr[tabindex="0"]'); await page.keyboard.press('Space'); await sleep(150)
  const bad = []
  for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowDown'); await sleep(80); const f = await H.focusVisible(page); if (!f.ok) bad.push(`${f.name} ${f.vis}/5`) }
  ok('Con una fila marcada, ↓ deja cada fila con foco a la vista (la barra masiva no la tapa)', !bad.length, bad.slice(0, 3).join(' | '))
  const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.bulkbar')).position)
  ok('Con poca altura la barra masiva no es fija', pos === 'static', pos)
  const all = await seen(page, '.vt .ptable th .th-all-l')
  ok('"Seleccionar todos" se ve', allOk(all), why(all))
  await page.evaluate(() => [...document.querySelectorAll('.bulkbar button')].find(b => b.textContent === 'A la reserva')?.focus())
  await page.keyboard.press('Enter'); await sleep(300)
  const fn = await active(page), fv = await H.focusVisible(page)
  ok('Después de "A la reserva": el foco en la nota, a la vista', /bulk-note/.test(fn.cls) && fv.ok, `${JSON.stringify(fn)} ${JSON.stringify(fv)}`)
  await page.click('.vt-res-go'); await sleep(450)
  const fa = await H.focusVisible(page)
  ok('Después de "Armar la reserva": el foco en una fila a la vista', fa.ok && (await active(page)).tag === 'TR', JSON.stringify(fa))
  ok('Sin errores en la consola', !errs.length, errs.slice(0, 3).join(' | '))
  await page.close()
  return res
}

/** Las vistas del Plantel conservan sus columnas: los anchos más grandes de las escalas valen solo en las vistas del Vestuario. */
async function runSquadCols(browser) {
  const { ok, res } = H.reporter('Plantel › columnas · ')
  // 1330 px: presupuesto de 1246 px, donde la moral de 96 px de la fase 3 escondía Sueldo (con 80 px, como antes del Vestuario, entra)
  for (const [w, h, v, col] of [[1024, 768, 'Contrato', 'Conform.'], [1330, 800, 'General', 'Sueldo US$'], [1440, 900, 'General', 'Sueldo US$'], [1440, 900, 'General', 'Moral']]) {
    const { page } = await H.newGame(browser, { w, h })
    await go(page, { page: 'squad' }); await sleep(250)
    await page.click(`.ptable-bar .seg[aria-label="Vista"] button:text-is("${v}")`); await sleep(200)
    const cols = await headCols(page)
    ok(`${w} px, vista ${v}: muestra ${col}`, cols.includes(col), JSON.stringify(cols))
    if (w === 1440 && col === 'Moral') await shot(page, 'plantel-general-1440')
    const rh = await page.evaluate(() => Math.round(Math.max(...[...document.querySelectorAll('.ptable tbody tr')].map(r => r.getBoundingClientRect().height))))
    ok(`${w} px, vista ${v}: filas de 48 px como mucho (la escala compacta entra en 86 y 80 px)`, rh <= 48, `${rh}`)
    const ov = await page.evaluate(() => [...document.querySelectorAll('.ptable .vt-scale')].filter(s => s.scrollWidth > s.parentElement.clientWidth + 1).length)
    ok(`${w} px, vista ${v}: las escalas entran en su celda`, ov === 0, `${ov}`)
    await page.close()
  }
  return res
}

/** Revisión de código: ninguna clase nueva coincide con una de antes del Vestuario y todas llevan `vt-`; la pantalla no escribe en `g`. */
function codeChecks() {
  const { ok, res } = H.reporter('Código · ')
  const css = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8')
  const start = css.indexOf('/* portal: vestuario')
  const before = new Set([...css.slice(0, start).matchAll(/\.([a-z][a-z0-9-]*)/g)].map(m => m[1]))
  const mine = new Set([...css.slice(start).matchAll(/\.(vt[a-z0-9-]*)/g)].map(m => m[1]))
  const clash = [...mine].filter(c => before.has(c) && !/^vt$|^vt-scope$|^vt-talk$|^vt-opt$|^vt-disc$|^vt-res$/.test(c))
  ok('Las clases nuevas llevan vt- y no repiten una existente', !clash.length, clash.join(' '))
  const src = ['src/ui/Locker.tsx', 'src/ui/PlayerPage.tsx', 'src/ui/PlayerTable.tsx', 'src/ui/mood.tsx'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
  const writes = src.match(/\bp\.(reserve|listed|happy|morale|status|promise|wantsOut)\s*=[^=]/g) ?? []
  ok('La pantalla no escribe en g (p.reserve =, p.listed =, …)', !writes.length, writes.join(' '))
  ok('Sin persLabels ni moodTxt en la interfaz', !/persLabels|moodTxt/.test(src + fs.readFileSync(path.join(ROOT, 'src/ui/Inbox.tsx'), 'utf8')))
  const nav = ['src/ui/Nav.tsx', 'src/ui/Inbox.tsx', 'src/ui/common.tsx'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
  ok('Sin Cond para conformidad ni moral (también en la ficha breve y la bandeja)', !/<Cond v=\{p\.(happy|morale)/.test(src + nav))
  const app = fs.readFileSync(path.join(ROOT, 'src/ui/App.tsx'), 'utf8')
  ok('App ignora el Esc que ya usó una ventana (e.defaultPrevented)', /e\.key === 'Escape' && e\.defaultPrevented\) return/.test(app))
  return res
}

;(async () => {
  const browser = await H.chromium.launch()
  const all = [...codeChecks()]
  if (process.argv.includes('--out')) { all.push(...await runOut(browser)); await browser.close(); const bad = all.filter(r => r.status === 'FALLA'); console.log(`\n${all.length - bad.length} de ${all.length} comprobaciones pasan.`); process.exit(bad.length ? 1 : 0) }
  for (const s of SIZES) all.push(...await run(browser, s))
  if (EXTRA) {
    all.push(...await runShort(browser))
    all.push(...await runSquadCols(browser))
    all.push(...await run(browser, [320, 568], { text: 120 }))
    all.push(...await run(browser, [1440, 900], { text: 120 }))
    all.push(...await run(browser, [390, 844], { text: 120 }))
    all.push(...await run(browser, [1440, 900], { club: 'Defensa y Justicia' }))
    all.push(...await runOut(browser))
  }
  await browser.close()
  const bad = all.filter(r => r.status === 'FALLA')
  console.log(`\n${all.length - bad.length} de ${all.length} comprobaciones pasan${bad.length ? `; fallan ${bad.length}` : ''}. Capturas: ${nShots}.`)
  process.exit(bad.length ? 1 : 0)
})()
