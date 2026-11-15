// Prueba de aceptación del Vestuario (design/ux/vestuario.md, sección 14, lo que se puede automatizar).
// Uso: con `npm run dev` corriendo en el puerto 5173, `node tests/ui/vestuario.cjs [ancho×alto …]`.
// Sin argumentos corre en 1440×900, 1024×768, 820×1000, 390×844 y 320×568, más una pasada con el texto al 120 % (1440 y 390), otra con
// Defensa y Justicia (club amarillo) y la del pedido de salida (una decisión, una vez, por cada camino que la resuelve). Saca un juego chico
// de capturas en production/ui/vestuario/shots/final/ (JPEG; SHOTS=0 no saca ninguna).
// El estado del plantel se arma con el motor en la página (pedido de salida, promesa en riesgo, molesto, en baja, referente que resta,
// reserva). Cada botón y cada foco se comprueban VISIBLES con elementFromPoint (helpers.cjs), no solo "clickeables".
// `--out` corre solo la pasada del pedido de salida. AXE=<ruta a axe.min.js> corre además axe-core (no está en el repositorio: instalalo aparte).
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
/** Controles de menos de 44 px de alto (celular). */
const under44 = (page, scope) => page.evaluate(s => [...document.querySelectorAll(`${s} button, ${s} summary, ${s} [role=radio]:not([aria-disabled=true]), ${s} .ptable td:first-child`)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.vh') && !e.classList.contains('linkish') && (e.tagName === 'TD' ? r.width < 43.5 : r.height < 43.5) })
  .map(e => `${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24)}:${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`).slice(0, 6), scope)

async function run(browser, [w, h], opt = {}) {
  const tag = `${w}×${h}${opt.text ? ` texto ${opt.text} %` : ''}${opt.club ? ` ${opt.club}` : ''}`
  const { ok, res } = H.reporter(`${tag} · `)
  const { page, errs } = await H.newGame(browser, { w, h, touch: w < 760, club: opt.club ?? 'Independiente', settings: opt.text ? { text: opt.text } : undefined })
  const ids = await setupLocker(page)
  const wide = w > 1180, phone = w <= 760
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
  if (w === 320) await shot(page, 'vestuario-320')

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
  await page.click('.vt-opt[data-k="status"] .vt-opt-extra .seg button:first-child'); await sleep(120)
  await page.click('.vt-talk-go'); await sleep(200)
  const c0 = await active(page)
  ok('Confirmación: el foco en "Confirmar: …"', /^Confirmar: cambiarle el rol/.test(c0.text), JSON.stringify(c0))
  { const v = await seen(page, '.modal .vt-confirm button'); ok('Confirmación: "No" y "Confirmar" se alcanzan', allOk(v), why(v)) }
  if (w === 320) await shot(page, 'charla-confirmar-320')
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
  await page.click('.vt-opt[data-k="praise"]'); await page.click('.vt-talk-go'); await sleep(300)
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
  const view = await page.evaluate(() => document.querySelector('.vt .ptable-bar .seg[aria-label="Vista"] button[aria-pressed=true]')?.textContent)
  ok('"Armar la reserva": vista Reserva y la línea de ayuda', view === 'Reserva' && !!(await page.$('.vt-resmode')), view)
  const toggles = await seen(page, '.vt .ptable tbody tr:first-child .vt-res, .vt .ptable tbody tr:last-child .vt-res')
  ok('Vista Reserva: el alternable de la primera y la última fila se ve', allOk(toggles), why(toggles))
  const nameW = await page.evaluate(() => Math.round(document.querySelector('.vt .ptable thead th:nth-child(2)')?.getBoundingClientRect().width ?? 0))
  if (w <= 390) ok('Vista Reserva: el nombre mide al menos 120 px', nameW >= 120, `${nameW} px`)
  const m0 = await page.evaluate(() => window.__ctx().g && Object.values(window.__ctx().g.players).filter(p => p.clubId === window.__ctx().g.userClubId && p.reserve).length)
  const off = await page.$('.vt .ptable tbody .vt-res:not(.on)')
  if (off) { await off.click(); await sleep(250) }
  const m1 = await page.evaluate(() => Object.values(window.__ctx().g.players).filter(p => p.clubId === window.__ctx().g.userClubId && p.reserve).length)
  const line = await page.evaluate(() => document.querySelector('.vt-res-txt')?.textContent ?? '')
  ok('Tocar "Anotar" anota y la línea del encabezado suma 1', m1 === m0 + 1 && line.includes(`${m1} anotados`), `${m0}→${m1} · ${line}`)
  if (w === 390 && !opt.text) await shot(page, 'reserva-390')
  if (!wide && !phone && w === 1024) {
    // solo con el teclado: Espacio en dos filas y "A la reserva"
    await page.evaluate(() => { Object.values(window.__ctx().g.players).forEach(p => { if (p.clubId === window.__ctx().g.userClubId) p.reserve = false }); window.__ctx().refresh() }); await sleep(200)
    await page.focus('.vt .ptable tbody tr[tabindex="0"]'); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown'); await sleep(60); await page.keyboard.press('Space'); await sleep(150)
    const bb = await page.$('.bulkbar button:text-is("A la reserva")')
    if (bb) { await bb.click(); await sleep(250) }
    const m2 = await page.evaluate(() => Object.values(window.__ctx().g.players).filter(p => p.clubId === window.__ctx().g.userClubId && p.reserve).length)
    ok('Con el teclado: Espacio en dos filas y "A la reserva" anota a los dos', m2 === 2, `${m2}`)
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
  // 4. Bandeja con la charla usada: Enter lleva al título; otro Enter no decide; Tab llega a "Declararlo transferible"
  ;({ ids } = await fresh(true))
  await H.openInbox(page, null, 'club.todo')
  await page.focus(`[data-k="out${ids.out}"]`); await sleep(80)
  await page.keyboard.press('Enter'); await sleep(300)
  const ib = await active(page)
  ok('Bandeja (charla usada): Enter deja el foco en el título', /ib-h/.test(ib.cls), JSON.stringify(ib))
  await page.keyboard.press('Enter'); await sleep(200)
  ok('…un segundo Enter no lo declara transferible', !(await page.evaluate(pid => window.__ctx().g.players[pid].listed, ids.out)))
  await page.keyboard.press('Tab'); await sleep(100)
  ok('…y el siguiente Tab llega a "Declararlo transferible"', /Declararlo transferible/.test((await active(page)).text))
  ok('Bandeja: la comparación de los dos caminos a la vista', await page.evaluate(() => !!document.querySelector('.ib-panel .vt-letgo')))
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
  }
  await page.close()
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
  ok('Sin Cond para conformidad ni moral', !/<Cond v=\{p\.(happy|morale)/.test(src))
  return res
}

;(async () => {
  const browser = await H.chromium.launch()
  const all = [...codeChecks()]
  if (process.argv.includes('--out')) { all.push(...await runOut(browser)); await browser.close(); const bad = all.filter(r => r.status === 'FALLA'); console.log(`\n${all.length - bad.length} de ${all.length} comprobaciones pasan.`); process.exit(bad.length ? 1 : 0) }
  for (const s of SIZES) all.push(...await run(browser, s))
  if (EXTRA) {
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
