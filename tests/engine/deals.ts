// Ciclo de vida de los tratos del mercado (`g.deals`): cada transición y los casos borde de `design/ux/mercado.md` (secciones 6, 8 y 9).
// Uso: npx tsx tests/engine/deals.ts
import { addDays, advanceDay, createMatch, finishUserMatch, readDecisionNews, userFixtureToday } from '../../src/engine/game'
import {
  acceptCounter, acceptJob, acceptOffer, answerWindow, askingPrice, bidBlock, bidCheck, blockDate, cancelDeal, clubAnswer, clubCool, committed,
  dailyDeals, dealDeadline, dealImpact, dealsOf, doTransfer, haggle, improveBid, jobConsequences, loanFee, marketTick, openBids, openNegotiation,
  placeBid, rejectOffer, sendTerms, signDeal, takeJob, usd, walkAway, wageBill, windowState, withdrawBid,
} from '../../src/engine/career'
import { decisionKeys, expiringKeys, inboxCount, newestOf, pendingAll, pendingKeyOf, pendingText, unreadOf } from '../../src/engine/inbox'
import { demandWage, patienceWord, renewWalk, scoutEta, scoutRate, wageShown } from '../../src/engine/squad'
import { Rng } from '../../src/engine/rng'
import type { Deal, Game, Player } from '../../src/engine/types'
import { clone, done, eq, makeGame, nextDay, offerFor, ok, sec } from './helpers'

const base = makeGame()
const B = base.clubs[base.userClubId]
B.budget = 1e9; B.balance = 1e9; B.wageBudget = 1e9
const fresh = () => clone(base)
const ME = base.userClubId
const others = (g: Game) => Object.values(g.players).filter(p => p.clubId !== ME && g.clubs[p.clubId].division >= 1 && p.loanFrom == null)
const probe = (g: Game, p: Player, fee: number, loan = false) => clubAnswer(g, { pid: p.id, fee, side: loan ? 'loan' : 'buy', clubId: p.clubId } as Deal)
const big = (g: Game, p: Player) => Math.round((askingPrice(g, p) * 1.6) / 10000) * 10000
const used = new Set<number>()
/** Un jugador distinto en cada escenario, que cumpla la condición. */
function pick(g: Game, f: (p: Player) => boolean): Player {
  const p = others(g).find(x => !used.has(x.id) && !(x.clause && x.clause <= big(g, x) * 2) && f(x))
  if (!p) throw new Error('sin candidato')
  used.add(p.id)
  return g.players[p.id]
}
const accepts = (g: Game) => (p: Player) => probe(g, p, big(g, p)).ok
const counters = (g: Game) => (p: Player) => probe(g, p, 20000).counter != null && probe(g, p, big(g, p)).ok
/** Avanza hasta que el trato deja de esperar (a lo sumo 3 días). */
function untilAnswer(g: Game, d: Deal) { for (let i = 0; i < 3 && g.deals!.find(x => x.id === d.id)!.state === 'waiting'; i++) nextDay(g) }
const dealOf = (g: Game, id: number) => g.deals!.find(d => d.id === id)!
const lastNews = (g: Game, id: number) => g.news.find(n => n.act === 'deal' && n.ref === id)!

sec('Estado del libro')
eq(windowState('2026-01-10'), { open: true, closesOn: '2026-02-20', daysLeft: 41 }, 'enero')
eq(windowState('2026-02-20').daysLeft, 0, 'último día: 0')
eq(windowState('2026-02-21'), { open: false, opensOn: '2026-06-25', daysToOpen: 124 }, 'cerrado hasta junio')
eq(windowState('2026-07-01').closesOn, '2026-08-10', 'invierno')
eq(windowState('2026-08-11'), { open: false, opensOn: '2027-01-10', nextSeason: true }, 'después del 10 ago: sin contar días')
eq(blockDate('2026-01-10'), '2026-01-24', 'bloqueo con el libro abierto: hoy + 14')
eq(blockDate('2026-02-18'), '2026-07-06', 'bloqueo en la última semana: 14 días de libro abierto (2 de febrero y 12 de junio-julio)')
eq(dealDeadline(base, '2026-01-12'), '2026-01-19', 'plazo: 7 días')
eq(dealDeadline(base, '2026-02-16'), '2026-02-20', 'plazo: el cierre del libro si llega antes')
{ const w = answerWindow(base, '2026-02-19'); ok(w.afterClose && !w.allAfterClose, 'el 19 feb el rango de respuesta pasa del cierre') }

sec('Oferta, espera y acuerdo de compra; negociación y firma')
{
  const g = fresh(), p = pick(g, accepts(g)), fee = big(g, p), n0 = inboxCount(g)
  eq(bidCheck(g, p.id, fee, false), null, 'sin motivos para bloquear')
  eq(bidCheck(g, p.id, 0, false), 'Escribí un monto.', 'monto vacío')
  const g2 = clone(g)
  const r = placeBid(g, p.id, fee, false), d = r.deal!
  ok(r.ok && d.state === 'waiting' && d.round === 1 && d.userClubId === ME, 'trato nuevo esperando respuesta')
  eq([d.answerFrom, d.answerBy], [addDays(g.date, 1), addDays(g.date, 3)], 'rango visible de la respuesta')
  ok(d.answerOn! >= d.answerFrom! && d.answerOn! <= d.answerBy!, 'día real dentro del rango')
  eq(placeBid(g2, p.id, fee, false).deal!.answerOn, d.answerOn, 'misma partida, misma oferta: misma demora')
  eq([committed(g), openBids(g)], [fee, 1], 'comprometido y ofertas abiertas')
  ok(!decisionKeys(g).has(`deal${d.id}`) && inboxCount(g) === n0, 'esperar respuesta no suma ni frena')
  eq(bidCheck(g, p.id, fee, false), 'Ya tenés una oferta abierta por él.', 'una oferta abierta por jugador')
  eq(bidCheck(g, p.id, fee, true), 'Ya tenés una oferta abierta por él.', 'ni compra ni préstamo')
  untilAnswer(g, d); untilAnswer(g2, g2.deals![0])
  const a = dealOf(g, d.id)
  eq(a.state, 'agreed', 'el club acepta')
  eq(dealOf(g2, d.id).state, 'agreed', 'misma respuesta al repetir')
  eq(a.deadline, dealDeadline(g, g.date), 'plazo del acuerdo')
  const pend = pendingAll(g).find(x => x.key === `deal${d.id}`)
  ok(pend?.k === 'deal' && pend.kind === 'agreed', 'pendiente deal (acuerdo)')
  ok(decisionKeys(g).has(`deal${d.id}`), 'frena el avance al llegar')
  eq(pendingText(pendingAll(g)), 'un acuerdo para cerrar', 'texto del pendiente')
  const msg = lastNews(g, d.id)
  ok(msg.title.includes('aceptó tu oferta') && msg.body.includes('Falta el contrato'), 'mensaje del acuerdo')
  eq(pendingKeyOf(g, msg), `deal${d.id}`, 'el mensaje más nuevo se liga al pendiente')
  eq(inboxCount(g), n0 + 1, 'el acuerdo cuenta 1 en la bandeja, no 2')
  // el último día para cerrarlo frena una vez
  const gl = clone(g); gl.date = a.deadline!
  ok(expiringKeys(gl).includes(`deal${d.id}`), 'el último día del acuerdo está en expiringKeys')
  // negociación: sin `neg` no hay paciencia; al abrir la mesa se fija y se guarda
  ok(!a.neg, 'sin mesa todavía')
  const want = demandWage(g, p)
  const o = openNegotiation(g, d.id)!
  eq(o.demand.terms.wage, want, 'un número, una fuente: el sueldo que pediría es el primer pedido del representante')
  ok(msg.read === true, 'abrir la mesa marca leídos los mensajes del trato')
  eq(inboxCount(g), n0 + 1, 'sigue siendo una decisión')
  ok(['mucha', 'media'].includes(patienceWord(o.patience)), 'paciencia en palabra')
  eq(o.terms.wage, Math.round((o.demand.terms.wage * 0.9) / 100) * 100, 'primera propuesta al 90 %')
  const r1 = sendTerms(g, d.id, o.terms)!
  const n1 = dealOf(g, d.id).neg!
  ok(!r1.ok && n1.patience === o.patience - 1 && n1.log.length === 1, 'una ronda gasta paciencia y queda guardada')
  const o2 = openNegotiation(g, d.id)!
  eq([o2.patience, o2.log.length], [n1.patience, 1], 'reabrir no reinicia la paciencia ni el historial')
  if (r1.counter) eq(o2.terms, r1.counter, 'retoma con la contraoferta del representante')
  const r2 = sendTerms(g, d.id, o.demand.terms)!
  ok(r2.ok && dealOf(g, d.id).neg!.agreed, 'aceptar lo que pide: hay acuerdo (no ejecuta el pase)')
  eq(g.players[p.id].clubId, p.clubId, 'todavía no firmó')
  ok(!signDeal(g, d.id, { ...o.demand.terms, wage: o.demand.terms.wage + 100 }).ok, 'términos distintos de los acordados: no firma')
  const s = signDeal(g, d.id)
  ok(s.ok, `firma (${s.reason})`)
  ok(g.players[p.id].clubId === ME && dealOf(g, d.id).state === 'signed', 'fichado y trato firmado')
  ok(g.transfers[0].mine === true && g.transfers[0].pid === p.id, 'Transfer.mine')
  ok(g.news.find(n => n.pid === p.id && n.title.includes('es nuevo jugador'))?.read === true, 'la noticia del fichaje nace leída')
  eq(inboxCount(g), n0, 'resolver deja la bandeja como estaba')
  eq(committed(g), 0, 'nada comprometido')
}

sec('Contraoferta: aceptar el pedido')
{
  const g = fresh(), p = pick(g, counters(g)), d = placeBid(g, p.id, 20000, false).deal!
  untilAnswer(g, d)
  const c = dealOf(g, d.id)
  ok(c.state === 'countered' && c.counter! > 20000, 'contraoferta con su pedido')
  ok(lastNews(g, d.id).title.includes(`pide`), 'mensaje "pide"')
  eq(pendingAll(g).find(x => x.key === `deal${d.id}`)?.k, 'deal', 'pendiente deal (contraoferta)')
  eq(committed(g), 20000, 'en contraoferta cuenta lo que ofertó el DT')
  const n = inboxCount(g), dl = c.deadline
  const gb = clone(g); gb.clubs[ME].budget = c.counter! - 1
  ok(!acceptCounter(gb, d.id), 'sin plata libre no se acepta')
  ok(acceptCounter(g, d.id), 'aceptar el pedido')
  const a = dealOf(g, d.id)
  ok(a.state === 'agreed' && a.fee === c.counter && a.deadline === dl, 'pasa a acuerdo con el mismo plazo')
  eq(inboxCount(g), n, 'sigue siendo la misma decisión: N')
  eq(pendingAll(g).filter(x => x.key === `deal${d.id}`).length, 1, 'una sola clave deal<id>')
}

sec('Contraoferta: mejorar, nueva respuesta y vencimiento sin costo')
{
  const g = fresh(), p = pick(g, p => probe(g, p, 20000).counter != null && probe(g, p, 30000).counter != null), d = placeBid(g, p.id, 20000, false).deal!
  untilAnswer(g, d)
  const first = lastNews(g, d.id), n = inboxCount(g)
  ok(!first.read, 'mensaje de la contraoferta sin abrir')
  const r = improveBid(g, d.id, 30000)
  ok(r.ok && dealOf(g, d.id).state === 'waiting' && dealOf(g, d.id).round === 2, 'Mejorar vuelve a esperar con round 2')
  ok(first.read === true, 'mejorar marca leídos los mensajes del trato')
  eq(inboxCount(g), n - 1, 'mejorar: N − 1')
  eq(committed(g), 30000, 'lo comprometido pasa al monto nuevo')
  untilAnswer(g, d)
  const c2 = dealOf(g, d.id)
  eq(c2.state, 'countered', 'nueva contraoferta')
  ok(decisionKeys(g).has(`deal${d.id}`), 'la respuesta a una mejora vuelve a aparecer como decisión')
  const second = lastNews(g, d.id)
  ok(second.id !== first.id && newestOf(g).get(`deal${d.id}`) === second.id, 'el más nuevo es el segundo')
  eq(pendingKeyOf(g, first), null, 'el mensaje viejo no se liga al pendiente')
  const n2 = inboxCount(g)
  g.date = c2.deadline!; ok(expiringKeys(g).includes(`deal${d.id}`), 'último día de la contraoferta')
  nextDay(g)
  const f = dealOf(g, d.id)
  ok(f.state === 'fell' && f.why === 'deadline' && !f.blockUntil, 'venció la contraoferta, sin bloqueo')
  ok(lastNews(g, d.id).title.includes('dio por terminada'), 'mensaje del vencimiento')
  eq(inboxCount(g), n2, 'el vencimiento reemplaza al mensaje de la contraoferta: suma 1, no 2')
  eq(bidBlock(g, p.id), undefined, 'se puede volver a ofertar')
}

sec('Retirar la oferta')
{
  const g = fresh(), p = pick(g, counters(g)), d = placeBid(g, p.id, 20000, false).deal!
  ok(withdrawBid(g, d.id) && dealOf(g, d.id).state === 'fell' && dealOf(g, d.id).why === 'pulled', 'retirar mientras espera')
  eq(committed(g), 0, 'libera lo comprometido')
  const d2 = placeBid(g, p.id, 20000, false).deal!
  ok(d2.id !== d.id, 'ofertar de nuevo crea un trato nuevo')
  untilAnswer(g, d2)
  const n = inboxCount(g)
  ok(withdrawBid(g, d2.id) && !pendingAll(g).some(x => x.key === `deal${d2.id}`), 'retirar una contraoferta la saca de los pendientes')
  eq(inboxCount(g), n - 1, 'retirar: N − 1')
  eq(bidBlock(g, p.id), undefined, 'retirar no bloquea')
  eq(clubCool(g, p.clubId), undefined, 'ni molesta al club')
}

sec('Rechazo del club')
{
  const g = fresh(), p = pick(g, x => { const r = probe(g, x, big(g, x)); return !r.ok && r.counter == null })
  const n = inboxCount(g), d = placeBid(g, p.id, big(g, p), false).deal!
  untilAnswer(g, d)
  const r = dealOf(g, d.id)
  ok(r.state === 'refused' && !!r.reason, 'refused con el motivo del club')
  ok(!/US\$|\d{3}/.test(r.reason!), 'el motivo no dice cifras')
  ok(!pendingAll(g).some(x => x.key === `deal${d.id}`) && !decisionKeys(g).has(`deal${d.id}`), 'no es pendiente ni frena')
  eq(inboxCount(g), n + 1, 'suma solo como mensaje sin leer')
  const old = lastNews(g, d.id), d2 = placeBid(g, p.id, big(g, p), false).deal!
  ok(d2.id !== d.id && pendingKeyOf(g, old) === null, 'oferta nueva: trato nuevo; el mensaje viejo no hereda sus acciones')
  eq(committed(g), d2.fee, 'el rechazo liberó lo comprometido')
}

sec('El club no mira el tope ni el presupuesto')
{
  const g = fresh(), p = pick(g, accepts(g)), fee = big(g, p)
  const loose = probe(g, p, fee)
  g.clubs[ME].wageBudget = wageBill(g, ME); g.clubs[ME].budget = fee
  eq(probe(g, p, fee), loose, 'con el tope lleno responde lo mismo')
}

sec('Acuerdo vencido: bloqueo de 14 días y club molesto')
{
  const g = fresh(), p = pick(g, accepts(g)), d = placeBid(g, p.id, big(g, p), false).deal!
  untilAnswer(g, d)
  const dl = dealOf(g, d.id).deadline!
  const mate = pick(g, x => x.clubId === p.clubId && probe(g, x, 20000).counter != null)
  const before = probe(g, mate, 20000).counter!
  g.date = dl; nextDay(g)
  const f = dealOf(g, d.id)
  ok(f.state === 'fell' && f.why === 'deadline', 'venció el acuerdo')
  eq(f.blockUntil, blockDate(g.date), 'bloqueo de 14 días')
  ok(lastNews(g, d.id).body.includes('No podés volver a ofertar por él hasta el'), 'el mensaje dice el bloqueo')
  ok(bidBlock(g, p.id)?.text.startsWith('Dejaste vencer el acuerdo por él'), 'bidBlock con su motivo')
  eq(bidCheck(g, p.id, 100000, false), bidBlock(g, p.id)!.text, 'bidCheck devuelve el bloqueo')
  ok(!!clubCool(g, p.clubId)?.text.includes('10 %'), 'clubCool')
  const after = probe(g, mate, 20000).counter!
  eq(after, Math.round((before * 1.1) / 10000) * 10000, 'el club molesto pide un 10 % más')
  const gx = clone(g); gx.date = addDays(f.blockUntil!, 1)
  ok(!bidBlock(gx, p.id) && !clubCool(gx, p.clubId), 'después del bloqueo, nada')
}

sec('Cancelar el trato, también en la última semana del libro')
{
  const g = fresh(), p = pick(g, accepts(g)); g.date = '2026-02-15'
  const d = placeBid(g, p.id, big(g, p), false).deal!
  untilAnswer(g, d)
  eq(dealOf(g, d.id).deadline, '2026-02-20', 'el plazo es el cierre')
  const gw = clone(g)
  g.date = '2026-02-18'
  const n = inboxCount(g)
  ok(cancelDeal(g, d.id), 'cancelar')
  const f = dealOf(g, d.id)
  ok(f.why === 'cancel' && f.blockUntil === '2026-07-06', `bloqueo en días de libro abierto (${f.blockUntil})`)
  eq(inboxCount(g), n - 1, 'cancelar: N − 1 (la noticia nace leída)')
  g.date = '2026-06-30'
  ok(!!bidBlock(g, p.id) && !!clubCool(g, p.clubId), 'cuando reabre el libro sigue el costo')
  // dejarlo caer con el cierre del libro tampoco es gratis
  gw.date = '2026-02-20'; nextDay(gw)
  const w = dealOf(gw, d.id)
  ok(w.state === 'fell' && w.why === 'deadline' && w.blockUntil === blockDate('2026-02-21'), `el cierre del libro vence el acuerdo con costo (${w.why}, ${w.blockUntil})`)
  ok(lastNews(gw, d.id).body.includes('último día del libro'), 'el mensaje lo explica')
}

sec('El libro cierra mientras espera; el último día')
{
  const g = fresh(); g.date = '2026-02-17'
  const ctr = pick(g, counters(g)), cd = placeBid(g, ctr.id, 20000, false).deal!
  const ps = others(g).filter(x => !used.has(x.id)).slice(0, 40)
  untilAnswer(g, cd)
  eq(dealOf(g, cd.id).state, 'countered', 'una contraoferta abierta')
  g.date = '2026-02-19'
  let late: Deal | undefined
  for (const p of ps) { if (openBids(g) >= 5) break; const r = placeBid(g, p.id, big(g, p), false); if (r.ok && r.deal!.answerOn! > '2026-02-20') { late = r.deal; break } if (r.ok) withdrawBid(g, r.deal!.id) }
  ok(!!late, 'una oferta que contestaría con el libro cerrado')
  nextDay(g) // 20 feb: último día
  eq(bidCheck(g, ps[39].id, 100000, false), 'Hoy cierra el libro: una oferta nueva ya no llegaría a tener respuesta.', 'último día: no se oferta')
  ok(bidCheck(g, ctr.id, 50000, false)!.includes('una mejora ya no llegaría'), 'último día: no se mejora')
  ok(expiringKeys(g).includes(`deal${cd.id}`), 'el último día del libro, la contraoferta con plazo hoy frena')
  ok(g.news.some(n => n.title === 'Hoy cierra el libro de pases' && !n.act), 'aviso del último día, sin act')
  nextDay(g) // 21 feb: cerrado
  const L = dealOf(g, late!.id), C = dealOf(g, cd.id)
  ok(L.state === 'fell' && L.why === 'window' && C.why === 'window', 'caducan con el cierre del libro')
  ok(lastNews(g, late!.id).title.includes('caducó'), 'mensaje "caducó"')
  eq(committed(g), 0, 'con el libro cerrado no queda nada abierto')
  ok(bidCheck(g, ps[39].id, 100000, false)!.startsWith('El libro de pases está cerrado. Reabre el 25 de junio.'), 'libro cerrado')
}

sec('Avisos de cierre del libro')
{
  const g = fresh(); g.date = '2026-02-12'
  const p = pick(g, accepts(g)); placeBid(g, p.id, big(g, p), false)
  const mine = Object.values(g.players).find(x => x.clubId === ME)!, o = offerFor(g, mine, pick(g, () => true).clubId, 500000)
  const keys = decisionKeys(g)
  nextDay(g)
  const w7 = g.news.find(n => n.title.startsWith('Faltan 7 días'))
  ok(!!w7 && !w7.act && w7.me === true, 'aviso a los 7 días, sin act')
  ok(/esperando respuesta|acuerdo sin firmar/.test(w7!.body) && w7!.body.includes(`${o.fromName} ofertó por ${mine.name}: hasta el`), 'nombra lo abierto de los dos lados')
  ok([...decisionKeys(g)].every(k => keys.has(k) || k.startsWith('deal')), 'el aviso no es una decisión')
}

sec('El jugador se fue a otro club mientras tanto')
{
  const g = fresh(), p = pick(g, counters(g)), d = placeBid(g, p.id, 20000, false).deal!
  const buyer = Object.values(g.clubs).find(c => c.division === 1 && c.id !== ME && c.id !== p.clubId)!
  doTransfer(g, g.players[p.id], buyer.id, 1000000)
  nextDay(g)
  const f = dealOf(g, d.id)
  ok(f.state === 'fell' && f.why === 'gone', 'se cae')
  ok(lastNews(g, d.id).title.includes(`a ${buyer.short}: tu oferta quedó sin efecto`), 'mensaje con el comprador')
  eq(committed(g), 0, 'libera lo comprometido')
}

sec('La IA no compra ni vende al exterior un jugador con acuerdo')
{
  const g = fresh()
  let id = 1000
  g.deals = others(g).map(p => ({ id: id++, side: 'buy', pid: p.id, name: p.name, clubId: p.clubId, clubName: '', state: 'agreed', fee: 1, round: 1, userClubId: ME, opened: g.date, updated: g.date, deadline: '2026-02-20', steps: [] }) as Deal)
  const where = new Map(others(g).map(p => [p.id, p.clubId]))
  const rng = new Rng(99)
  const t0 = g.transfers.length
  for (let i = 0; i < 30; i++) { marketTick(g, 1, rng); g.date = addDays(g.date, 1) }
  ok([...where].every(([pid, c]) => g.players[pid]?.clubId === c), 'nadie con acuerdo cambió de club')
  ok(g.transfers.length - t0 >= 0, `pases de la IA en el período: ${g.transfers.length - t0} (solo refuerzos del exterior)`)
}

sec('Tope de 5 ofertas abiertas')
{
  const g = fresh(), ctr = pick(g, counters(g)), cd = placeBid(g, ctr.id, 20000, false).deal!
  untilAnswer(g, cd)
  for (let i = 0; i < 4; i++) { const p = pick(g, () => true); ok(placeBid(g, p.id, 50000, false).ok, `oferta ${i + 2}`) }
  eq(openBids(g), 5, 'cinco abiertas')
  const sixth = pick(g, () => true)
  ok(bidCheck(g, sixth.id, 50000, false)!.startsWith('Ya tenés 5 ofertas abiertas'), 'la sexta no sale')
  eq(bidCheck(g, ctr.id, 30000, false), null, 'Mejorar no cuenta para el tope')
  ok(acceptCounter(g, cd.id) && bidCheck(g, sixth.id, 50000, false) === null, 'los acuerdos no cuentan')
  g.clubs[ME].budget = committed(g) + 10000
  ok(bidCheck(g, sixth.id, 50000, false)!.startsWith('Te quedan libres'), 'lo comprometido se descuenta de lo libre')
}

sec('Ruptura con el representante; renovación cortada')
{
  const g = fresh(), p = pick(g, accepts(g)), d = placeBid(g, p.id, big(g, p), false).deal!
  untilAnswer(g, d)
  const o = openNegotiation(g, d.id)!
  const gt = clone(g); gt.clubs[ME].wageBudget = wageBill(gt, ME)
  const rt = sendTerms(gt, d.id, o.demand.terms)!
  ok(!rt.ok && rt.msg.includes('no gasta paciencia') && dealOf(gt, d.id).neg!.patience === o.patience, 'el tope no gasta paciencia')
  let r
  for (let i = 0; i < 4 && dealOf(g, d.id).state === 'agreed'; i++) r = sendTerms(g, d.id, { ...o.terms, wage: 100, bonus: 0 })
  const f = dealOf(g, d.id)
  ok(r?.walk && f.state === 'fell' && f.why === 'walk', 'se levanta de la mesa')
  eq(f.blockUntil, addDays(g.date, 14), 'bloqueo de 14 días')
  ok(bidBlock(g, p.id)!.text.startsWith('Su representante cortó la negociación'), 'texto del bloqueo')
  ok(g.news.find(n => n.act === 'deal' && n.ref === d.id && n.title.startsWith('Se cayó el pase'))?.read === true, 'la noticia de la ruptura nace leída')
  ok(!walkAway(g, d.id), 'walkAway sobre un trato cerrado no hace nada')
  const own = Object.values(g.players).find(x => x.clubId === ME)!
  renewWalk(g, own.id)
  eq(g.players[own.id].negBlock, addDays(g.date, 30), 'renewWalk: 30 días')
  ok(g.news[0].pid === own.id && g.news[0].read === true, 'la noticia de la renovación cortada nace leída')
}

sec('Préstamo: acuerdo y confirmación con el tope controlado con el rango')
{
  const g = fresh(), p = pick(g, x => probe(g, x, loanFee(x), true).ok && wageShown(g, x, x.wage, 401)[1] > x.wage)
  const src = p.clubId, d = placeBid(g, p.id, loanFee(p), true).deal!
  eq(d.side, 'loan', 'trato de préstamo')
  untilAnswer(g, d)
  eq(dealOf(g, d.id).state, 'agreed', 'préstamo acordado (no se ejecuta solo)')
  ok(lastNews(g, d.id).title.includes('te presta'), 'mensaje del préstamo')
  eq(g.players[p.id].clubId, p.clubId, 'todavía en su club')
  const bill = wageBill(g, ME), hi = wageShown(g, p, p.wage, 401)[1]
  g.clubs[ME].wageBudget = bill + p.wage // el real entra, el máximo del rango no
  const imp = dealImpact(g, 'loan', p.id, d.fee)!
  ok(imp.fits === 'no' && imp.wageAdd[1] === hi, 'dealImpact: rango y veredicto del préstamo')
  const s = signDeal(g, d.id)
  ok(!s.ok && s.reason === 'Con lo que cobra, superás tu tope salarial.', 'tope sin cifra')
  g.clubs[ME].wageBudget = bill + hi
  ok(signDeal(g, d.id).ok, 'con margen, se confirma')
  const q = g.players[p.id]
  ok(q.clubId === ME && q.loanFrom === src && dealOf(g, d.id).state === 'loaned', 'llegó a préstamo')
}

sec('Cambio de club con tratos abiertos')
{
  const g = fresh(), pw = pick(g, counters(g)), pc = pick(g, counters(g)), pa = pick(g, accepts(g))
  const dc = placeBid(g, pc.id, 20000, false).deal!, da = placeBid(g, pa.id, big(g, pa), false).deal!
  untilAnswer(g, dc); untilAnswer(g, da)
  const dw = placeBid(g, pw.id, 20000, false).deal!
  const mine = Object.values(g.players).find(x => x.clubId === ME)!, o = offerFor(g, mine, pc.clubId, 400000)
  eq([dealOf(g, dc.id).state, dealOf(g, da.id).state, dw.state], ['countered', 'agreed', 'waiting'], 'tres tratos abiertos')
  const to = Object.values(g.clubs).find(c => c.division === 1 && c.id !== ME && ![pw.clubId, pc.clubId, pa.clubId].includes(c.id))!
  eq(jobConsequences(g, to.id).deals.map(x => x.pid).sort(), [pw.id, pc.id, pa.id].sort(), 'jobConsequences.deals los nombra')
  const gt = clone(g)
  acceptJob(g, to.id)
  ok([dc, da, dw].every(d => dealOf(g, d.id).state === 'fell' && dealOf(g, d.id).why === 'club'), 'se caen con why club')
  ok([dc, da, dw].every(d => lastNews(g, d.id).read === true && lastNews(g, d.id).title.includes('dejaste')), 'mensajes leídos (la F6 los nombró)')
  eq(committed(g), 0, 'lo comprometido vuelve a 0')
  ok(!pendingAll(g).some(x => x.k === 'deal'), 'sin pendientes de tratos')
  ok(g.deals!.some(d => d.side === 'sell' && d.offerId === o.id && d.why === 'club'), 'la oferta recibida queda registrada')
  nextDay(g, 4)
  ok([dc, da, dw].every(d => dealOf(g, d.id).state === 'fell'), 'nadie contesta ni firma con el club nuevo')
  takeJob(gt, to.id)
  ok([dc, da, dw].every(d => !lastNews(gt, d.id).read), 'con takeJob los mensajes llegan sin leer')
}

sec('Ofertas por tus jugadores: venta, cláusula, rechazo, pedir más, vencimiento')
{
  const g = fresh(), sq = Object.values(g.players).filter(x => x.clubId === ME)
  const [p1, p2, p3, p4] = sq, cA = others(g)[0].clubId, cB = Object.values(g.clubs).find(c => c.division === 1 && c.id !== ME && c.id !== cA)!.id
  const a = offerFor(g, p1, cA, 900000), b = offerFor(g, p1, cB, 800000), n = inboxCount(g)
  ok(acceptOffer(g, a), 'aceptar una oferta')
  eq(inboxCount(g), n - 2, 'aceptar con dos ofertas por el mismo jugador: N − 2')
  const sb = g.deals!.find(d => d.offerId === b.id)!
  ok(sb.state === 'fell' && sb.why === 'sold' && sb.steps[0].text.includes(`vendiste a ${p1.name}`), 'la otra queda "Se canceló: vendiste…"')
  ok(g.news.find(x => x.act === 'offer' && x.ref === b.id)!.read === true, 'y su mensaje leído')
  eq(g.deals!.find(d => d.offerId === a.id)!.state, 'sold', 'la aceptada queda vendida')
  const c1 = offerFor(g, p2, cA, 700000), c2 = offerFor(g, p2, cB, 600000)
  doTransfer(g, g.players[p2.id], cA, 5000000, false, false, undefined, 'clause')
  ok([c1, c2].every(o => g.deals!.find(d => d.offerId === o.id)!.why === 'clause'), 'cláusula: why clause')
  ok([c1, c2].every(o => !g.news.find(x => x.act === 'offer' && x.ref === o.id)!.read), 'y sus mensajes sin leer')
  const r = offerFor(g, p3, cA, 300000); rejectOffer(g, r)
  ok(g.deals!.find(d => d.offerId === r.id)!.state === 'declined' && g.news.find(x => x.ref === r.id && x.act === 'offer')!.read === true, 'rechazar: declined y leído')
  const h = offerFor(g, p3, cB, 300000), up = haggle(g, h)
  ok(up ? g.offers.includes(h) && h.fee > 300000 : g.deals!.find(d => d.offerId === h.id)!.state === 'withdrawn', `pedir más (${up ? 'mejoró' : 'se retiró'})`)
  const e = offerFor(g, p4, cA, 300000), ge = clone(g)
  ge.date = addDays(e.date, 9)
  marketTick(ge, 1, new Rng(1))
  ok(ge.deals!.some(d => d.offerId === e.id && d.state === 'expired'), 'vence: expired')
  const vm = ge.news.find(x => x.ref === e.id && x.act === 'offer')!
  ok(vm.title.startsWith('Venció la oferta') && newestOf(ge).get(`offer${e.id}`) === vm.id, 'el mensaje de vencimiento lleva act offer y es el más nuevo')
  const cnt = unreadOf(ge)
  readDecisionNews(ge, `offer${e.id}`)
  eq(unreadOf(ge), cnt - 1, 'la oferta vencida cuenta una vez (su vencimiento)')
}

sec('Poda de g.deals (tope 60)')
{
  const g = fresh()
  const mk = (id: number, extra: Partial<Deal> = {}): Deal => ({ id, side: 'buy', pid: 900000 + id, name: `X${id}`, clubId: 1, clubName: 'X', state: 'refused', fee: 1, round: 1, userClubId: ME, opened: g.date, updated: g.date, steps: [], ...extra })
  g.deals = [mk(1, { state: 'fell', why: 'walk', blockUntil: addDays(g.date, 5) }), mk(2, { state: 'waiting', answerOn: addDays(g.date, 400) }), ...Array.from({ length: 58 }, (_, i) => mk(i + 3))]
  g.nextDeal = 61
  const p = pick(g, () => true)
  placeBid(g, p.id, 50000, false)
  eq(g.deals.length, 60, 'quedan 60')
  ok(g.deals.some(d => d.id === 1) && g.deals.some(d => d.id === 2), 'no poda ni el bloqueado ni el abierto')
  ok(!g.deals.some(d => d.id === 3) && g.deals.some(d => d.id === 61), 'poda el terminal más viejo')
}

sec('Impacto y grupos')
{
  const g = fresh(), p = pick(g, accepts(g))
  const i = dealImpact(g, 'buy', p.id, 1000000)!
  eq(i.wageAdd, wageShown(g, p, demandWage(g, p), 402), 'sin términos: el rango del sueldo que pediría')
  eq([i.budget[1], i.squad], [g.clubs[ME].budget - 1000000, [i.squad[0], i.squad[0] + 1]], 'presupuesto y plantel')
  const t = { wage: 5000, years: 3, status: 'reg' as const, clause: 0, bonus: 10000 }
  eq(dealImpact(g, 'buy', p.id, 1000000, t)!.wageAdd, [5000, 5000], 'con términos: exacto')
  g.clubs[ME].budget = 500000
  ok(dealImpact(g, 'buy', p.id, 1000000)!.blocked[0].startsWith('Te quedan libres'), 'no entra')
  g.clubs[ME].budget = 1e9
  const d = placeBid(g, p.id, big(g, p), false).deal!
  const gr = dealsOf(g)
  ok(gr.waiting.some(x => x.id === d.id) && gr.renew.every(x => x.clubId === ME && x.loanFrom == null), 'dealsOf agrupa')
  g.know[p.id] = 40
  eq(scoutEta(g, p), Math.ceil(60 / scoutRate(g)), 'scoutEta: días hasta conocerlo del todo')
  eq([usd(1400000), usd(840000), usd(500), usd(12500000)], ['US$ 1,4 M', 'US$ 840 mil', 'US$ 500', 'US$ 12,5 M'], 'formato de plata de los textos')
}

sec('Integración: la respuesta llega con el avance real de los días')
{
  const g = fresh(), p = pick(g, accepts(g)), d = placeBid(g, p.id, big(g, p), false).deal!, on = d.answerOn!
  for (let i = 0; i < 6 && dealOf(g, d.id).state === 'waiting'; i++) {
    const f = userFixtureToday(g)
    if (f) finishUserMatch(g, f, createMatch(g, f, false).runToEnd()); else advanceDay(g)
  }
  eq(dealOf(g, d.id).state, 'agreed', 'contestó al avanzar')
  eq(lastNews(g, d.id).date, on, 'el mensaje llega al empezar el día de la respuesta')
}

done('Tratos del mercado')
