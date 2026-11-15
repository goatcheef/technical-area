// Vestuario: requisitos del motor R1 a R14 de `design/ux/vestuario.md` (sección 8), una prueba por fila de la tabla "Disponibilidad de las
// charlas" (5.3), el pedido de salida contado una vez por cada camino que lo resuelve o lo cierra, el refactor de `moodDelta` y la tabla de
// conocimiento de los ajenos (5.5).
// Uso: npx tsx tests/engine/vestuario.ts
import { addDays, advanceDay, continueGame, createMatch, finishUserMatch, fmtDay, injuryOutlook, squadOf, startNewSeason, userFixtureToday } from '../../src/engine/game'
import { acceptOffer, doTransfer, takeJob, windowState } from '../../src/engine/career'
import { inboxCount, newestOf, pendingAll, pendingKeyOf, unreadOf } from '../../src/engine/inbox'
import {
  FREE_FX, LOY_STAY, STATUS, TEMP_HOT, afterUserMatch, applyRenewal, attentionOf, dailySquad, harmony, harmonyWord, hash01, letGoInfo,
  minutesOf, moodCause, moodDelta, moodOf, moodOutlook, moraleShown, moraleWord, nextReserveDay, outActions, outDateOf, persOf, persTraits, promiseStatus,
  setListed, setReserve, talk, talkContext, talkOptions, talkResult, talkState, traitOf, weekNo,
} from '../../src/engine/squad'
import { ageOn } from '../../src/engine/positions'
import { Rng, clamp } from '../../src/engine/rng'
import { A, type Game, type News, type Player, type SquadStatus, type TalkKind } from '../../src/engine/types'
import { clone, done, eq, makeGame, offerFor, ok, sec } from './helpers'

const base = makeGame()
const ME = base.userClubId
const fresh = () => clone(base)
const mine = (g: Game) => squadOf(g, ME).sort((a, b) => a.id - b.id)
/** Un jugador del plantel sin lesión ni suspensión, con el rol, la conformidad y la personalidad dadas; el resto juega todo y está contento. */
function setup(g: Game, i = 0, o: { status?: SquadStatus; happy?: number; amb?: number; loy?: number; temp?: number; recent?: number[] } = {}): Player {
  const sq = mine(g)
  for (const x of sq) { x.happy = 90; x.recent = [90, 90, 90]; x.injury = null; x.susp = 0; x.wantsOut = false; x.listed = false; x.promise = null; x.lastTalk = undefined }
  const p = sq[i]
  p.status = o.status ?? 'reg'; p.happy = o.happy ?? 70; p.recent = o.recent ?? []
  p.pers = { ...persOf(p), amb: o.amb ?? 10, loy: o.loy ?? 10, temp: o.temp ?? 10 }
  return p
}
/** Lo que el pedido de salida de `pid` (pendiente y mensajes) suma a la insignia de la bandeja. */
function contrib(g: Game, pid: number): number {
  const h = clone(g)
  h.news = h.news.filter(n => !(n.act === 'out' && n.pid === pid))
  if (h.players[pid]) h.players[pid].wantsOut = false
  return inboxCount(g) - inboxCount(h)
}
const outMsgs = (g: Game, pid: number) => g.news.filter(n => n.act === 'out' && n.pid === pid)
/** Provoca un pedido de salida real (`afterUserMatch`): conformidad 17, sin minutos, en una semana en que sale el sorteo. */
function askOut(g: Game, p: Player): News {
  while (hash01(p.id, weekNo(g.date)) >= 0.5) g.date = addDays(g.date, 7)
  p.recent = [0, 0]; p.happy = 17; p.status = p.status === 'young' ? 'reg' : p.status ?? 'reg'; p.pers = { ...persOf(p), loy: Math.min(14, persOf(p).loy) }; p.injury = null; p.susp = 0
  const mins: Record<number, number> = {}
  for (const x of mine(g)) if (x.id !== p.id) mins[x.id] = 90
  afterUserMatch(g, mins)
  ok(p.wantsOut, `${p.name} pidió irse`)
  return outMsgs(g, p.id)[0]
}
/** Un día de enero con el libro abierto (para vender). */
const OPEN = '2026-02-01'

// ---------------------------------------------------------------- R1
sec('R1. Pedido de salida: una decisión, contada una vez')
{
  const g = fresh(), p = setup(g, 3), n0 = inboxCount(g), msg = askOut(g, p)
  eq(inboxCount(g) - n0, 1, 'la insignia sube 1 (no 2)')
  eq(pendingKeyOf(g, msg), `out${p.id}`, 'pendingKeyOf liga el mensaje al pendiente abierto')
  eq(pendingKeyOf(msg), `out${p.id}`, 'pendingKeyOf(n) sin g: compatibilidad')
  ok(pendingAll(g).some(x => x.key === `out${p.id}`), 'pendiente out<pid>')
  eq(unreadOf(g), unreadOf(g, new Set()) - 1, 'unreadOf no cuenta el mensaje mientras el pendiente está abierto')
  ok(msg.body.includes('juega el 0 % y espera el 62 %'), 'la causa con números en el cuerpo')
  eq(p.outDate, g.date, 'p.outDate')
}
// cada camino que resuelve a propósito: el pendiente desaparece, el mensaje queda leído y la insignia baja 1
const paths: [string, (g: Game, p: Player) => void][] = [
  ['talk stay', (g, p) => talk(g, p, 'stay')],
  ['talk promise', (g, p) => talk(g, p, 'promise')],
  ['talk status (subida)', (g, p) => talk(g, p, 'status', 'key')],
  ['talk free', (g, p) => talk(g, p, 'free')],
  ['setListed(true)', (g, p) => setListed(g, p.id, true)],
  ['acción masiva Declarar transferibles (setListed por cada uno)', (g, p) => [p.id].forEach(id => setListed(g, id, true))],
  ['applyRenewal', (g, p) => applyRenewal(g, p, { wage: p.wage, years: 2, status: p.status!, clause: 0, bonus: 0 })],
  ['acceptOffer (club argentino)', (g, p) => { g.date = OPEN; ok(acceptOffer(g, offerFor(g, p, Object.values(g.clubs).find(c => c.id !== ME && c.division === 1)!.id, 500000)), 'vendido') }],
  ['acceptOffer (exterior, from 0)', (g, p) => { g.date = OPEN; ok(acceptOffer(g, offerFor(g, p, 0, 500000)), 'vendido al exterior'); ok(!g.players[p.id], 'ya no existe') }],
]
for (const [name, run] of paths) {
  const g = fresh(), p = setup(g, 4, { status: 'reg' }), n0 = inboxCount(g), msg = askOut(g, p)
  eq(contrib(g, p.id), 1, `${name}: antes, el pedido suma 1`)
  run(g, p)
  ok(!pendingAll(g).some(x => x.key === `out${p.id}`), `${name}: el pendiente desaparece`)
  ok(msg.read, `${name}: el mensaje "quiere irse" queda leído`)
  eq(contrib(g, p.id), 0, `${name}: el pedido ya no suma`)
  if (name.startsWith('talk')) eq(inboxCount(g), n0, `${name}: la insignia vuelve a la de antes`)
}
{
  sec('R1. Felicitar o exigir no resuelve el pedido')
  for (const k of ['praise', 'demand', 'patience'] as TalkKind[]) {
    const g = fresh(), p = setup(g, 4), msg = askOut(g, p)
    if (k === 'patience') p.happy = 40
    const r = talkResult(g, p, k)
    ok(!r.resolved && !msg.read && p.wantsOut, `${k}: sigue pendiente y sin leer`)
    eq(contrib(g, p.id), 1, `${k}: sigue sumando 1`)
  }
}
{
  sec('R1. Cierres sin decisión del DT: mensaje común sin leer (cuenta 1)')
  // cláusula pagada por un rival
  { const g = fresh(), p = setup(g, 4), msg = askOut(g, p); doTransfer(g, p, Object.values(g.clubs).find(c => c.id !== ME && c.division === 1)!.id, 1e6, false, false, undefined, 'clause')
    eq(pendingKeyOf(g, msg), null, 'cláusula: sin pendiente'); ok(!msg.read, 'cláusula: el mensaje sigue sin leer'); eq(contrib(g, p.id), 1, 'cláusula: cuenta 1 (no 2, no 0)') }
  // el DT cambia de club
  { const g = fresh(), p = setup(g, 4), msg = askOut(g, p); takeJob(g, Object.values(g.clubs).find(c => c.id !== ME && c.division === 1)!.id)
    eq(pendingKeyOf(g, msg), null, 'cambio de club: sin pendiente'); ok(!msg.read, 'cambio de club: sin leer'); eq(contrib(g, p.id), 1, 'cambio de club: cuenta 1') }
}
{
  sec('R1. Dos pedidos del mismo jugador: solo el más nuevo cuenta')
  const g = fresh(), p = setup(g, 4), m1 = askOut(g, p)
  talk(g, p, 'stay')
  ok(m1.read, 'el primero quedó leído al decirle que no se va')
  p.lastTalk = undefined; g.date = addDays(g.date, 7)
  const m2 = askOut(g, p)
  ok(m2.id !== m1.id, 'mensaje nuevo')
  eq(newestOf(g).get(`out${p.id}`), m2.id, 'newestOf: el más nuevo')
  eq(pendingKeyOf(g, m1), null, 'el viejo no se liga al pendiente')
  eq(pendingKeyOf(g, m2), `out${p.id}`, 'el nuevo, sí')
  m1.read = false
  eq(contrib(g, p.id), 1, 'aunque el viejo quede sin leer, el pedido cuenta 1')
}
{
  sec('R1. Quitar de transferibles reabre con el mensaje leído')
  const g = fresh(), p = setup(g, 4), msg = askOut(g, p)
  setListed(g, p.id, true); eq(contrib(g, p.id), 0, 'transferible: no suma')
  ok(setListed(g, p.id, false), 'quitado')
  ok(msg.read, 'el mensaje sigue leído')
  ok(pendingAll(g).some(x => x.key === `out${p.id}`), 'el pendiente reaparece')
  eq(contrib(g, p.id), 1, 'cuenta 1, como pendiente')
  p.loanFrom = Object.values(g.clubs).find(c => c.id !== ME)!.id
  ok(!setListed(g, p.id, true) && !p.listed, 'un préstamo no se declara transferible')
}
{
  sec('R1. Nueva temporada: "sigue queriendo irse" solo para quien sigue en el plantel')
  const g = fresh()
  while (!g.seasonOver) { g.board.fired = false; continueGame(g); const f = userFixtureToday(g); if (f) finishUserMatch(g, f, createMatch(g, f, false).runToEnd()) }
  const sq = mine(g).filter(p => !p.loanFrom && ageOn(p.birth, g.date) < 30 && p.contractEnd > g.season)
  const [a, b, c, d] = sq
  for (const p of [a, b, c, d]) { p.wantsOut = true; p.clause = undefined }
  for (const p of [a, b, c]) setListed(g, p.id, true)
  b.birth = '1985-01-01' // 41 años: se retira
  c.contractEnd = g.season // se va libre
  d.listed = true; d.loanFrom = Object.values(g.clubs).find(x => x.id !== ME && x.division === 1)!.id // vuelve de un préstamo
  const old = g.news.find(n => n.act === 'out' && n.pid === a.id)
  startNewSeason(g)
  const msgs = g.news.filter(n => n.act === 'out' && n.title.includes('sigue queriendo irse'))
  eq(msgs.map(n => n.pid), [a.id], 'solo el que sigue en el plantel recibe el mensaje')
  const m = msgs[0]
  ok(m && !m.read && m.body.includes('se vació la lista de transferibles'), 'nace sin leer y dice por qué')
  eq(pendingKeyOf(g, m), `out${a.id}`, 'es el más nuevo de la clave y se liga al pendiente')
  eq(contrib(g, a.id), 1, 'cuenta 1 (no 2)')
  ok(!old || pendingKeyOf(g, old) === null, 'el mensaje viejo no cuenta')
  ok(!g.players[b.id] || g.players[b.id].clubId !== ME, 'el retirado ya no está')
}

// ---------------------------------------------------------------- R2
sec('R2. talk devuelve antes, después y cambios')
{
  const g = fresh(), p = setup(g, 2, { happy: 40 }); askOut(g, p)
  const before = { happy: p.happy!, morale: p.morale }, r = talkResult(g, p, 'promise')
  eq(r.before, before, 'antes = el jugador antes')
  eq(r.after, { happy: p.happy, morale: p.morale }, 'después = el jugador después')
  eq(r.changes, ['Ya no pide irse', `Minutos prometidos hasta el ${fmtDay(p.promise!.until)}`], 'cambios')
  eq(r.resolved, 'out', 'resolvió el pedido')
  eq(p.talks!.map(t => t.reply), ['Le convenció'], 'registro de charlas')
  eq(p.promiseLog!.length, 1, 'la promesa queda en el registro')
  const again = talkResult(g, p, 'praise')
  ok(!again.after && again.text.startsWith('Ya hablaste'), 'ya hablaron: { text } sin after')
  eq(typeof talk(g, p, 'praise'), 'string', 'talk (compatibilidad) devuelve texto')
}
{
  sec('R2. talk free con pedido mira el libro (tres fechas)')
  const cases: [string, string][] = [
    ['2026-01-15', 'Quedó como transferible: los clubes interesados van a empezar a ofertar.'],
    ['2026-03-01', 'Quedó como transferible: las ofertas van a llegar cuando reabra el libro, el 25 jun.'],
    ['2026-11-14', 'Quedó como transferible, pero con el libro cerrado no van a llegar ofertas esta temporada.'],
  ]
  for (const [d, t] of cases) {
    const g = fresh(), p = setup(g, 2); p.wantsOut = true; g.date = d
    const r = talkResult(g, p, 'free')
    eq(r.text, `"Gracias por entenderme." ${t}`, `texto el ${d}`)
    eq([r.after!.happy - r.before!.happy, Math.round(r.after!.morale - r.before!.morale)], [FREE_FX.asked.happy, FREE_FX.asked.morale], `efectos el ${d}`)
  }
  const g = fresh(), p = setup(g, 2)
  const r = talkResult(g, p, 'free')
  eq(r.text, 'Se sorprende y se ofende: "Si no me quieren, me voy." Quedó como transferible.', 'sin pedido: el texto no cambia')
  ok(r.changes.includes('Pasa a querer irse') && r.changes.includes('Quedó transferible') && p.outDate === g.date, 'sin pedido: pasa a querer irse')
  eq(p.moodNote?.kind, 'freed', 'causa: "puede buscar club" sin pedirlo')
  eq(moodCause(g, p).kind, 'freed', 'moodCause lo dice')
}

// ---------------------------------------------------------------- R3
sec('R3. talkOptions: una prueba por fila de "Disponibilidad de las charlas"')
const optOf = (g: Game, p: Player, k: TalkKind) => talkOptions(g, p).find(o => o.kind === k)!
/** `talk` no hace nada con una opción oculta o deshabilitada. */
function noop(g: Game, p: Player, k: TalkKind, what: string) {
  const s = JSON.stringify(p), r = talkResult(g, p, k)
  ok(!r.after && JSON.stringify(p) === s, `${what}: talk no hace nada`)
}
const falling = (g: Game, i: number, happy = 70) => setup(g, i, { status: 'reg', happy, recent: [0, 0] }) // al ritmo de hoy, el próximo partido le baja la conformidad
{
  // stay
  { const g = fresh(), p = setup(g, 1); const o = optOf(g, p, 'stay'); ok(!o.shown, 'stay: oculta si no quiere irse'); noop(g, p, 'stay', 'stay oculta') }
  { const g = fresh(), p = setup(g, 1); p.wantsOut = true; const o = optOf(g, p, 'stay'); ok(o.shown && !o.disabled && !o.cost, 'stay: disponible si quiere irse, sin confirmación') }
  { const g = fresh(), p = setup(g, 1); p.wantsOut = true; p.listed = true; ok(optOf(g, p, 'stay').shown, 'stay: también si ya es transferible') }
  // promise
  { const g = fresh(), p = setup(g, 1, { happy: 70 }); ok(!optOf(g, p, 'promise').shown, 'promise: oculta con conformidad ≥ 60, sin pedido y sin "En baja"'); noop(g, p, 'promise', 'promise oculta') }
  { const g = fresh(), p = setup(g, 1, { happy: 50 }); p.promise = { until: '2026-02-20', share: 0.84, mins: [] }; const o = optOf(g, p, 'promise')
    eq(o.disabled, 'Ya tiene una promesa hasta el 20 feb.', 'promise: deshabilitada con promesa vigente'); noop(g, p, 'promise', 'promise deshabilitada (vigente)') }
  { const g = fresh(), p = falling(g, 1, 70); const o = optOf(g, p, 'promise')
    ok(o.shown, 'promise: "En baja" con 70 se muestra')
    eq(o.disabled, 'Todavía está contento (conformidad 70): podés prometerle cuando baje de 60.', 'promise: deshabilitada "En baja" con 70'); noop(g, p, 'promise', 'promise deshabilitada (contento)') }
  { const g = fresh(), p = setup(g, 1, { happy: 50 }); const o = optOf(g, p, 'promise'); ok(o.shown && !o.disabled && o.cost, 'promise: disponible con conformidad < 60, con confirmación')
    ok(o.extra!.target === Math.min(0.9, STATUS.reg.share + 0.22) && Math.abs(o.extra!.pass! - o.extra!.target! * 0.85) < 1e-12 && o.extra!.until === addDays(g.date, 35), 'promise: objetivo, umbral y plazo') }
  { const g = fresh(), p = setup(g, 1, { happy: 70 }); p.wantsOut = true; const o = optOf(g, p, 'promise'); ok(o.shown && !o.disabled, 'promise: disponible si quiere irse aunque esté en 70') }
  // patience
  { const g = fresh(), p = setup(g, 1, { happy: 70 }); ok(!optOf(g, p, 'patience').shown, 'patience: oculta con ≥ 60, sin pedido y sin "En baja"') }
  { const g = fresh(), p = setup(g, 1, { happy: 70 }); p.wantsOut = true; const o = optOf(g, p, 'patience')
    eq(o.disabled, 'Todavía está contento (conformidad 70): pedirle paciencia sirve cuando baje de 60.', 'patience: deshabilitada con pedido y ≥ 60'); noop(g, p, 'patience', 'patience deshabilitada (pedido)') }
  { const g = fresh(), p = falling(g, 1, 65); const o = optOf(g, p, 'patience'); ok(o.shown && !!o.disabled, 'patience: deshabilitada "En baja" con ≥ 60') }
  { const g = fresh(), p = setup(g, 1, { happy: 50 }); const o = optOf(g, p, 'patience'); ok(o.shown && !o.disabled && !o.cost, 'patience: disponible con < 60')
    eq(o.traits.map(t => t.key), ['loy', 'amb'], 'patience: los dos rasgos que deciden'); eq(o.trait!.text, 'Lealtad normal', 'patience: "Él: lealtad normal"') }
  // status
  { const g = fresh(), p = setup(g, 1); const o = optOf(g, p, 'status'); ok(o.shown && !o.disabled && o.cost, 'status: siempre, con confirmación')
    const r = talkResult(g, p, 'status', p.status); ok(!r.after && !p.lastTalk, 'status: rol igual no hace nada') }
  // free
  { const g = fresh(), p = setup(g, 1); p.loanFrom = Object.values(g.clubs).find(c => c.id !== ME)!.id; const o = optOf(g, p, 'free')
    eq(o.disabled, 'Está a préstamo: no se lo puede declarar transferible.', 'free: deshabilitada a préstamo'); noop(g, p, 'free', 'free a préstamo') }
  { const g = fresh(), p = setup(g, 1); p.listed = true; eq(optOf(g, p, 'free').disabled, 'Ya está declarado transferible.', 'free: deshabilitada si ya es transferible'); noop(g, p, 'free', 'free transferible') }
  { const g = fresh(), p = setup(g, 1); const o = optOf(g, p, 'free'); ok(o.shown && !o.disabled && o.cost && !!o.letGo, 'free: disponible, con confirmación y comparación') }
  // praise, demand
  for (const k of ['praise', 'demand'] as TalkKind[]) { const g = fresh(), p = setup(g, 1); const o = optOf(g, p, k); ok(o.shown && !o.disabled && !o.cost, `${k}: siempre, sin confirmación`) }
  { const g = fresh(), p = setup(g, 1); eq(optOf(g, p, 'praise').extra, talkContext(g, p), 'praise: el mismo contexto que usa talk') }
}
sec('R3. Orden de las opciones según el motivo principal')
{
  const ord = (g: Game, p: Player) => talkOptions(g, p).filter(o => o.shown).map(o => o.kind)
  { const g = fresh(), p = setup(g, 1, { happy: 30 }); p.wantsOut = true; eq(ord(g, p)[0], 'stay', 'quiere irse: empieza por "No se va"') }
  { const g = fresh(), p = falling(g, 1, 70); eq(ord(g, p), ['status', 'promise', 'patience', 'praise', 'demand', 'free'], 'En baja con 70: primero cambiar el rol') }
  { const g = fresh(), p = setup(g, 1, { happy: 30 }); eq(ord(g, p).slice(0, 3), ['promise', 'patience', 'status'], 'molesto') }
  { const g = fresh(), p = setup(g, 1, { happy: 70 }); eq(ord(g, p), ['praise', 'demand', 'status', 'free'], 'sin motivo') }
}

// ---------------------------------------------------------------- R4
sec('R4. Reserva por el motor')
{
  const g = fresh(), [a, b] = mine(g), other = Object.values(g.players).find(p => p.clubId !== ME)!
  eq(setReserve(g, [a.id, b.id, other.id], true), 2, 'anota solo a los propios')
  ok(a.reserve && b.reserve && !other.reserve, 'anotados')
  eq(setReserve(g, [a.id], true), 0, 'sin cambios si ya estaba')
  eq(setReserve(g, [a.id], false), 1, 'saca')
  const d = nextReserveDay(g)
  ok(d > g.date && new Date(d + 'T12:00:00Z').getUTCDay() === 3 && d <= addDays(g.date, 7), `próximo miércoles: ${d}`)
  g.date = '2026-01-14'; eq(nextReserveDay(g), '2026-01-21', 'un miércoles: el de hoy ya se jugó')
}

// ---------------------------------------------------------------- R5
sec('R5. harmony().parts suma exactamente')
{
  const sum = (x: ReturnType<typeof harmony>['parts']) => x.base + x.lead + x.unhappy + x.temper + x.clip
  const lea = (g: Game, top: number[]) => { const sq = mine(g); sq.forEach((p, i) => { p.attrs[A.lea] = 1; p.injury = null; p.wantsOut = false; p.status = 'sub'; p.birth = '2000-01-01'; if (i < top.length) p.attrs[A.lea] = top[i] }) }
  // borde de redondeo: base exacta 65,6 y referentes 3,6 (68 × 0,7 + 18 = 65,6; 3 × 1,2) → 69,2: base 65 y lead 4 (por término daría 66 + 4)
  { const g = fresh(); lea(g, [11, 11, 11]); mine(g).forEach(p => (p.happy = 68)); const h = harmony(g)
    eq(h.value, 69, 'valor 69'); eq(h.parts, { base: 65, lead: 4, unhappy: 0, temper: 0, clip: 0 }, 'el resto del redondeo queda en la base'); eq(sum(h.parts), h.value, 'suma') }
  // recortado: 100 × 0,7 + 18 + 13 × 1,2 = 103,6 → 104 sin recortar
  { const g = fresh(); lea(g, [15, 14, 14]); mine(g).forEach(p => (p.happy = 100)); const h = harmony(g)
    eq(h.value, 100, 'recortado a 100'); eq(h.parts.clip, -4, 'clip −4 ("Tope de la escala")'); eq(sum(h.parts), 100, 'suma con el recorte') }
  // dos disconformes: "2 disconformes −6"
  { const g = fresh(); mine(g).forEach(p => (p.happy = 70)); const [a, b] = mine(g); a.happy = 20; b.happy = 30; a.pers = { ...persOf(a), temp: 10 }; b.pers = { ...persOf(b), temp: 10 }
    const h = harmony(g); eq(h.parts.unhappy, -6, '2 disconformes −6'); eq(sum(h.parts), h.value, 'suma') }
  // al azar: siempre enteros y suma exacta
  const r = new Rng(9), g = fresh()
  let bad = 0
  for (let i = 0; i < 300; i++) {
    for (const p of mine(g)) { p.happy = r.next() * 100; p.attrs[A.lea] = r.int(1, 20); p.wantsOut = r.chance(0.05); p.pers = { ...persOf(p), temp: r.int(1, 20) } }
    const h = harmony(g)
    if (sum(h.parts) !== h.value || Object.values(h.parts).some(v => !Number.isInteger(v))) bad++
  }
  eq(bad, 0, '300 planteles al azar: enteros que suman el valor')
}

// ---------------------------------------------------------------- R6
sec('R6. promiseStatus y prórroga')
{
  const g = fresh(), p = setup(g, 2, { status: 'rot' })
  const fx = g.fixtures.filter(f => !f.played && f.date >= g.date && (f.home === ME || f.away === ME)).map(f => f.date).sort()
  const until = fx[3] // el cuarto partido cae el mismo día del plazo: no cuenta
  p.promise = { until, share: Math.min(0.9, STATUS.rot.share + 0.22), mins: [56, 0] }
  const s = promiseStatus(g, p)!
  eq(s.matchesLeft, 3, 'quedan 3 partidos (el del día until no cuenta)')
  eq(Math.round(s.got * 100), 31, 'lleva 31 %')
  eq(Math.round(s.target * 100), 58, 'objetivo 58 %')
  eq(s.minutesNeeded, 166, 'le faltan 166 minutos')
  ok(!s.onTrack && s.reachable, 'en riesgo pero alcanzable')
  const r = attentionOf(g).find(x => x.pid === p.id)!
  eq(r.reasons[0].k, 'promiseRisk', 'fila "Promesa en riesgo"')
  ok(r.reasons[0].cause.includes('Le faltan 166 minutos en 3 partidos.'), r.reasons[0].cause)
  p.promise.mins = [0, 0, 0, 0, 0]
  const s2 = promiseStatus(g, p)!
  ok(!s2.reachable, 'ya no llega'); ok(attentionOf(g).find(x => x.pid === p.id)!.reasons[0].cause.includes('Ya no llega'), '"Ya no llega" en la fila')
  p.promise.mins = [90]; ok(promiseStatus(g, p)!.onTrack, 'con menos de 2 partidos todavía no se mide')
}
{
  const g = fresh(), p = setup(g, 2, { happy: 40 })
  talk(g, p, 'promise')
  g.date = p.promise!.until; p.promise!.mins = [90]
  dailySquad(g, new Rng(1))
  const ext = p.promise!
  eq(ext.until, addDays(g.date, 14), 'el plazo se corre 14 días')
  eq(ext.ext, g.date, 'p.promise.ext')
  ok(promiseStatus(g, p)!.extended, 'promiseStatus.extended')
  const m = g.news[0]
  ok(m.pid === p.id && m.tag === 'club' && !m.read && m.body.includes(`se corrió al`) && m.body.includes('jugó menos de 2 partidos'), 'mensaje de la prórroga, sin leer')
  eq(p.promiseLog!.map(x => x.result ?? 'vigente'), ['vigente', 'extended'], 'registro con la prórroga')
  g.date = ext.until; ext.mins = [90, 90]
  dailySquad(g, new Rng(1))
  eq(p.promiseLog![0].result, 'kept', 'cumplida en el registro')
  ok(g.news[0].body.includes('Jugó el 100 % de los minutos; le habías prometido el 84 % (cumplías con 71 %).'), 'la cifra en "conforme"')
}
{
  const g = fresh(), p = setup(g, 2, { happy: 40 })
  talk(g, p, 'promise'); g.date = p.promise!.until; p.promise!.mins = [0, 30]
  dailySquad(g, new Rng(1))
  eq(p.promiseLog![0].result, 'broken', 'rota en el registro'); eq(p.moodNote?.kind, 'broken', 'causa: promesa rota')
  ok(g.news[0].body.includes('Jugó el 17 %'), 'la cifra en "se siente engañado"')
  ok(moodCause(g, p).text.startsWith('Desde la promesa rota del'), 'moodCause')
}

// ---------------------------------------------------------------- R7
sec('R7. Escalas en palabras')
{
  const w = (h: number) => moodOf(h).word
  eq([w(80), w(79.9), w(60), w(59.9), w(35), w(34.9), w(18), w(17.9)], ['Muy contento', 'Contento', 'Contento', 'Conforme', 'Conforme', 'Molesto', 'Molesto', 'Muy molesto'], 'moodOf: 80 / 60 / 35 / 18')
  eq([moodOf(34.9).n, moodOf(14).word, moodOf(30).word, moodOf(70).word], [34, 'Muy molesto', 'Molesto', 'Contento'], 'moodOf: número para mostrar y casos de la sección 14')
  eq([80, 79, 60, 59, 35, 34].map(moraleWord), ['Muy alto', 'Bueno', 'Bueno', 'Normal', 'Normal', 'Bajo'], 'moraleWord')
  eq([70, 69, 45, 44, 25, 24].map(harmonyWord), ['Grupo unido', 'Clima normal', 'Clima normal', 'Hay ruido', 'Hay ruido', 'Vestuario partido'], 'harmonyWord')
}

// ---------------------------------------------------------------- R8, R14 y tabla de conocimiento
sec('R8 y R14. Bandas de la personalidad')
{
  const word = (k: Parameters<typeof traitOf>[0], v: number) => traitOf(k, v)?.word
  eq([word('amb', 8), word('amb', 9), word('amb', 11), word('amb', 12), word('amb', 14), word('amb', 15)], ['Baja', 'Normal', 'Normal', 'Alta', 'Alta', 'Muy alta'], 'ambición: 11/12 y 14/15 (R14)')
  eq([word('loy', 7), word('loy', 8), word('loy', 12), word('loy', 13), word('loy', 14), word('loy', 15)], ['Poco apegado', 'Normal', 'Normal', 'Leal', 'Leal', 'Muy leal'], 'lealtad')
  eq([word('temp', 13), word('temp', 14)], ['Tranquilo', 'Temperamental'], 'temperamento 13/14')
  eq([word('prof', 7), word('prof', 8), word('prof', 13), word('prof', 14)], ['Poco profesional', 'Normal', 'Normal', 'Profesional'], 'profesionalismo')
  eq([word('pres', 5), word('pres', 6), word('pres', 14), word('pres', 15)], ['Sufre la presión', 'Normal', 'Normal', 'Aparece en los partidos grandes'], 'presión')
  eq([word('lea', 14), word('lea', 15)], [undefined, 'Líder natural'], 'liderazgo: sin palabra debajo de 15')
  const g = fresh(), p = mine(g)[0]; p.pers = { amb: 12, loy: 13, temp: 14, pres: 10 }; p.prof = 14
  const t = persTraits(g, p)
  eq(t.level, 'full', 'propio: completa')
  ok(t.traits.every(x => !/\d/.test(x.word + x.text)), 'nunca números')
  eq(t.traits.slice(0, 3).map(x => x.text), ['Ambición alta', 'Leal', 'Temperamental'], 'palabras')
}
sec('5.5. Ajenos según el conocimiento')
{
  const g = fresh(), p = Object.values(g.players).find(x => x.clubId !== ME && g.clubs[x.clubId].division === 1)!
  p.pers = { amb: 17, loy: 11, temp: 16, pres: 10 }; p.prof = 10; p.attrs[A.lea] = 8
  g.know[p.id] = 59
  eq(persTraits(g, p), { level: 'none', traits: [] }, '59 %: nada'); eq(moraleShown(g, p), null, '59 %: sin ánimo')
  g.know[p.id] = 60
  const e = persTraits(g, p)
  eq([e.level, e.traits.map(x => x.text)], ['extremes', ['Ambición muy alta', 'Temperamental']], '60 %: solo los extremos con la palabra de su banda')
  eq(moraleShown(g, p), null, '60-99 %: sin ánimo')
  g.know[p.id] = 100
  const f = persTraits(g, p)
  eq(f.level, 'full', '100 %: completa')
  ok(e.traits.every(x => f.traits.find(y => y.key === x.key)!.word === x.word), 'ningún extremo cambia de palabra al 100 %')
  eq(moraleShown(g, p), { word: moraleWord(p.morale) }, '100 %: solo la palabra del ánimo')
  p.pers = { amb: 10, loy: 10, temp: 10, pres: 10 }; g.know[p.id] = 80
  eq(persTraits(g, p).traits, [], 'sin extremos: lista vacía (la pantalla dice "Ningún rasgo marcado a la vista")')
  const own = mine(g)[0]
  eq(moraleShown(g, own), { value: own.morale, word: moraleWord(own.morale) }, 'propio: número y palabra')
}

// ---------------------------------------------------------------- R9
sec('R9. "Decirle que no se va": lealtad 12 de mala gana, 13 de buena gana')
{
  eq(LOY_STAY, 13, 'umbral 13')
  for (const [loy, d, word] of [[12, -10, 'Normal'], [13, 8, 'Leal']] as [number, number, string][]) {
    const g = fresh(), p = setup(g, 1, { happy: 30, loy }); p.wantsOut = true
    eq(optOf(g, p, 'stay').trait!.word, word, `lealtad ${loy}: "${word}"`)
    const r = talkResult(g, p, 'stay')
    eq(r.after!.happy - r.before!.happy, d, `lealtad ${loy}: conformidad ${d > 0 ? '+' : ''}${d}`)
    eq(r.reply, loy >= 13 ? 'Le convenció' : 'No le convenció', `lealtad ${loy}: respuesta corta`)
  }
  for (const [loy, out] of [[14, true], [15, false]] as [number, boolean][]) {
    const g = fresh(), p = setup(g, 1, { happy: 20, loy, recent: [0, 0] })
    eq(moodOutlook(g, p).canAskOut, out, `lealtad ${loy}: ${out ? 'puede' : 'no puede'} pedir irse`)
  }
  for (const [prof, temp, reply] of [[13, 13, 'No le convenció'], [14, 14, 'Le convenció'], [13, 14, 'Lo tomó mal']] as [number, number, string][]) {
    const g = fresh(), p = setup(g, 1, { temp }); p.prof = prof
    eq(talkResult(g, p, 'demand').reply, reply, `exigir con profesionalismo ${prof} y temperamento ${temp}`)
  }
}

// ---------------------------------------------------------------- R13
sec('R13. Temperamento 14 resta en la armonía')
{
  eq(TEMP_HOT, 14, 'umbral 14')
  const h = (temp: number) => { const g = fresh(); mine(g).forEach(p => (p.happy = 70)); const p = mine(g)[5]; p.happy = 20; p.pers = { ...persOf(p), temp }; return harmony(g) }
  eq(h(13).parts.temper, 0, 'temperamento 13: no resta')
  eq(h(14).parts.temper, -3, 'temperamento 14: resta 3')
  eq(h(13).value - h(14).value, 3, 'la armonía baja 3')
  eq(traitOf('temp', 14)!.word, 'Temperamental', 'y su ficha dice "Temperamental"')
}

// ---------------------------------------------------------------- R10
sec('R10. Partida vieja sin registro')
{
  const g = fresh(), p = mine(g)[0]
  for (const k of ['talks', 'promiseLog', 'moodNote', 'outDate'] as const) delete (p as any)[k]
  const back: Game = JSON.parse(JSON.stringify(g)), q = back.players[p.id]
  eq(back.version, 6, 'Game.version sigue en 6')
  eq(talkState(back, q).long, 'Disponible', 'talkState sin registro'); eq(moodCause(back, q).kind, 'minutes', 'causa: los minutos')
  { const h = fresh(), r = setup(h, 4), m = askOut(h, r); delete r.outDate; eq(outDateOf(h, r), m.date, 'sin p.outDate: la fecha del mensaje más nuevo') }
  ok(Array.isArray(attentionOf(back)) && talkOptions(back, q).length === 7, 'attentionOf y talkOptions sin registro')
}

// ---------------------------------------------------------------- R11
sec('R11. outActions, letGoInfo y talkState')
{
  const g = fresh(), p = setup(g, 1, { happy: 30 }); p.wantsOut = true
  let a = outActions(g, p)
  eq([a.primary, a.talk.ok, a.list.ok, a.note], ['talk', true, true, ''], 'charla disponible: hablar')
  talk(g, p, 'praise')
  a = outActions(g, p)
  const next = addDays(g.date, 7)
  eq(a.primary, 'list', 'charla usada: declararlo transferible es el primario')
  eq(talkState(g, p).long, `Hablaron hoy · de nuevo desde el ${next.slice(8).replace(/^0/, '')} ene`, 'talkState el mismo día')
  ok(a.note.startsWith(talkState(g, p).long) && a.note.includes('Mientras tanto, podés declararlo transferible'), 'la nota sigue a talkState')
  eq(letGoInfo(g, p).talk.from, next, 'letGoInfo.talk.from: la próxima charla')
  g.date = addDays(g.date, 2)
  ok(talkState(g, p).long.startsWith('Hablaron el 10 ene · de nuevo desde el 17 ene') && talkState(g, p).short === 'desde el 17 ene', 'talkState otro día')
  eq(talkState(g, p).withReply, 'Hablaron el 10 ene (no le convenció) · de nuevo desde el 17 ene', 'con la respuesta corta')
  p.loanFrom = Object.values(g.clubs).find(c => c.id !== ME)!.id
  a = outActions(g, p)
  eq([a.primary, a.list.ok], [null, false], 'a préstamo con la charla usada: sin acción')
  eq(a.note, 'Está a préstamo: no se lo puede declarar transferible. Podés volver a hablarle desde el 17 ene. El pedido no vence.', 'y dice por qué')
}
{
  const g = fresh(), p = setup(g, 1); p.wantsOut = true
  const li = letGoInfo(g, p)
  eq([li.list.happy, li.list.morale, li.list.spendsTalk, li.talk.happy, li.talk.morale, li.talk.becomesOut, li.offerChance.now, li.offerChance.listed, li.price.factor, li.price.scope],
    [0, 0, false, 15, 6, false, 0.05, 0.12, 0.75, 'refuerzo'], 'números del motor con pedido')
  p.wantsOut = false
  eq([letGoInfo(g, p).talk.happy, letGoInfo(g, p).talk.morale, letGoInfo(g, p).talk.becomesOut, letGoInfo(g, p).offerChance.now], [-20, -12, true, 0], 'sin pedido')
  g.date = '2026-03-01'; eq(letGoInfo(g, p).window, windowState(g.date), 'window es windowState')
  ok(!letGoInfo(g, p).window.open && letGoInfo(g, p).window.opensOn === '2026-06-25', '1 mar: abre el 25 jun')
  g.date = '2026-11-14'; const w = letGoInfo(g, p).window
  ok(!w.open && w.opensOn === '2027-01-10' && w.nextSeason === true, '14 nov: abre el 10 ene del año siguiente, nextSeason')
  // "Declararlo transferible" no toca el humor ni la charla; "puede buscar club" suma 15 y 6 y gasta la charla
  const g2 = fresh(), q = setup(g2, 1, { happy: 30 }); q.wantsOut = true
  const g3 = clone(g2), q3 = g3.players[q.id], before = [q.happy, q.morale, q.lastTalk]
  setListed(g2, q.id, true); eq([q.happy, q.morale, q.lastTalk], before, 'transferible: humor y charla iguales')
  const r = talkResult(g3, q3, 'free'); eq([r.after!.happy - r.before!.happy, q3.lastTalk], [15, g3.date], 'buscar club: +15 y gasta la charla')
}

// ---------------------------------------------------------------- R12
sec('R12. minutesOf, moodOutlook y attentionOf')
{
  // una Promesa sin minutos y ambición 10: no le pesa
  { const g = fresh(), p = setup(g, 6, { status: 'young', amb: 10, recent: [0, 0, 0] }); const m = minutesOf(g, p)
    eq([m.tol, m.nextDelta, moodOutlook(g, p).trend], [0, 0, 'estable'], 'Promesa con ambición 10: tol 0, nextDelta 0, estable')
    ok(!attentionOf(g).some(x => x.pid === p.id), 'no está en Para atender') }
  { const g = fresh(), p = setup(g, 6, { status: 'young', amb: 15, recent: [0, 0, 0] }); p.birth = '2005-06-01'
    eq(minutesOf(g, p).tol, 0.6, 'Promesa con ambición 15 y 20 años: tol 0,6')
    eq(attentionOf(g).find(x => x.pid === p.id)?.reasons[0].k, 'falling', 'aparece "En baja"') }
  { const g = fresh(), p = setup(g, 6, { status: 'sub', recent: [0, 0, 0] })
    eq(minutesOf(g, p).tol, 0.5, 'Suplente: tol 0,5'); eq(attentionOf(g).find(x => x.pid === p.id)?.reasons[0].k, 'falling', 'un Suplente con déficit está "En baja"') }
  // lesionado o suspendido para el próximo partido
  for (const kind of ['injury', 'susp'] as const) {
    const g = fresh(), p = setup(g, 6, { happy: 20, recent: [0, 0] })
    if (kind === 'injury') p.injury = { days: 30, desc: 'un desgarro' }; else p.susp = 1
    if (kind === 'injury') ok(injuryOutlook(g, p.id)!.matches > 0, 'se pierde el próximo partido')
    const m = minutesOf(g, p), o = moodOutlook(g, p)
    eq([m.idle, m.nextDelta, o.trend, o.canAskOut], [kind, 0, 'en pausa', false], `${kind}: idle, nextDelta 0, en pausa, sin canAskOut`)
    const r = attentionOf(g).find(x => x.pid === p.id)!
    ok(!r.reasons.some(x => x.k === 'falling') && r.reasons[0].then.startsWith('Resta armonía. Mientras no juegue'), `${kind}: sin "En baja" ni "Pierde moral"`)
    // y coincide con el motor: ese partido no lo cuenta
    const h0 = p.happy; afterUserMatch(g, {}); eq(p.happy, h0, `${kind}: afterUserMatch no lo cuenta`)
  }
  // con 2 partidos el próximo ya cuenta y nextDelta es la caída que deja; con 1, no
  { const g = fresh(), p = setup(g, 6, { happy: 50, recent: [0, 0] }), m = minutesOf(g, p)
    ok(m.counts && m.nextDelta < 0, 'con 2 partidos: counts y caída')
    const h0 = p.happy!; afterUserMatch(g, Object.fromEntries(mine(g).filter(x => x.id !== p.id).map(x => [x.id, 90])))
    eq(p.happy! - h0, m.nextDelta, 'nextDelta es la caída que deja el tercer partido') }
  { const g = fresh(), p = setup(g, 6, { happy: 50, recent: [0] }), m = minutesOf(g, p); eq([m.counts, m.nextDelta, moodOutlook(g, p).trend], [false, 0, 'sin datos'], 'con 1 partido: no cuenta') }
  // canAskOut con el signo de nextDelta
  { const g = fresh(), p = setup(g, 6, { happy: 16, recent: [90, 90] }); eq([minutesOf(g, p).nextDelta, moodOutlook(g, p).canAskOut], [4, false], 'conformidad 16 y +4: no pide irse (16 + 4 = 20)') }
  { const g = fresh(), p = setup(g, 6, { status: 'rot', happy: 20, loy: 14, recent: [0, 0] }); const d = minutesOf(g, p).nextDelta
    ok(d <= -3 && moodOutlook(g, p).canAskOut, `conformidad 20 y caída ${d.toFixed(2)} (Rotación, lealtad 14, sin pedido): puede pedir irse`)
    p.status = 'sub'; p.happy = 19; ok(minutesOf(g, p).nextDelta < 0 && moodOutlook(g, p).canAskOut, 'un Suplente también (19 y una caída chica)')
    p.status = 'young'; p.happy = 10; ok(!moodOutlook(g, p).canAskOut, 'una Promesa no (rol de nivel 0)') }
  // orden de "Para atender": quiere irse, promesa en riesgo, molesto, en baja; una fila por jugador
  { const g = fresh(), sq = mine(g)
    for (const x of sq) { x.happy = 90; x.recent = [90, 90, 90]; x.injury = null; x.susp = 0; x.wantsOut = false; x.listed = false; x.promise = null; x.status = 'reg' }
    const [a, b, c, d] = sq.slice(4, 8)
    a.wantsOut = true; a.happy = 15; a.recent = [0, 0]
    b.status = 'rot'; b.promise = { until: addDays(g.date, 20), share: 0.58, mins: [0, 0, 0] }
    c.happy = 25; c.recent = [0, 0, 0]
    d.happy = 60; d.recent = [0, 0]
    const att = attentionOf(g).filter(x => [a, b, c, d].some(p => p.id === x.pid))
    eq(att.map(x => x.pid), [a.id, b.id, c.id, d.id], 'orden: quiere irse, promesa en riesgo, molesto, en baja')
    eq(att.map(x => x.reasons[0].chip), ['Quiere irse', 'Promesa en riesgo', 'Molesto', 'En baja'], 'chips')
    ok(att[0].reasons[0].decide && att[0].reasons.some(r => r.k === 'upset' && r.chip === 'Muy molesto'), 'el que quiere irse lleva además "Muy molesto" como chip secundario')
    eq(new Set(attentionOf(g).map(x => x.pid)).size, attentionOf(g).length, 'una fila por jugador') }
}

// ---------------------------------------------------------------- refactor de moodDelta
sec('R12. moodDelta: afterUserMatch da lo mismo que la regla de antes')
{
  /** `afterUserMatch` tal como estaba antes del refactor (sin el pedido de salida, que no cambió). */
  function legacy(g: Game, mins: Record<number, number>) {
    for (const p of squadOf(g, g.userClubId)) {
      persOf(p); p.happy ??= 70
      const m = Math.min(90, mins[p.id] ?? 0)
      if ((p.injury || p.susp) && !m) continue
      p.recent = [...(p.recent ?? []), m].slice(-6)
      if (p.recent.length < 3) continue
      const st = STATUS[p.status!], q = p.pers!, sh = p.recent.reduce((a, b) => a + b, 0) / (p.recent.length * 90)
      const deficit = st.share * 0.85 - sh
      const tol = p.status === 'young' ? (q.amb >= 15 && ageOn(p.birth, g.date) >= 20 ? 0.6 : 0) : p.status === 'sub' ? 0.5 : 1
      if (deficit > 0) p.happy = clamp(p.happy - deficit * 22 * tol * (1 + (q.amb - 10) * 0.05) * (1 - (q.loy - 10) * 0.04), 0, 100)
      else p.happy = clamp(p.happy + 2 + (p.happy < 60 ? 2 : 0), 0, 100)
      if (p.happy < 35) p.morale = clamp(p.morale - 1.5 - (q.temp - 10) * 0.12, 5, 100)
    }
  }
  const r = new Rng(77), keys: SquadStatus[] = ['key', 'reg', 'rot', 'sub', 'young']
  let diff = 0, predicted = 0
  for (let i = 0; i < 60; i++) {
    const g = fresh()
    for (const p of mine(g)) {
      p.status = keys[r.int(0, 4)]; p.happy = r.next() * 100; p.recent = Array.from({ length: r.int(0, 6) }, () => r.pick([0, 0, 15, 45, 70, 90]))
      p.pers = { ...persOf(p), amb: r.int(1, 20), loy: r.int(1, 14) }; p.birth = `${r.int(2003, 2008)}-0${r.int(1, 9)}-15`; p.injury = null; p.susp = r.chance(0.1) ? 1 : 0; p.wantsOut = true // sin sorteo de pedido
    }
    const mins = Object.fromEntries(mine(g).map(p => [p.id, r.pick([0, 0, 20, 45, 90])]))
    // lo que predice minutesOf para un partido al mismo ritmo (solo si ese partido deja la misma participación: minutos enteros, menos de 6)
    const want = new Map<number, number>(), same: Record<number, number> = {}
    for (const p of mine(g)) {
      const m = minutesOf(g, p), x = Math.round(m.got * 90)
      if (!m.counts || m.idle || m.recent.length >= 6 || Math.abs(x - m.got * 90) > 1e-9) continue
      want.set(p.id, p.happy! + m.nextDelta); same[p.id] = x
    }
    const h = clone(g)
    afterUserMatch(h, same)
    for (const [id, v] of want) { if (Math.abs(h.players[id].happy! - v) > 1e-9) diff++; predicted++ }
    const a = clone(g), b = clone(g)
    afterUserMatch(a, mins); legacy(b, mins)
    for (const p of mine(a)) if (p.happy !== b.players[p.id].happy || p.morale !== b.players[p.id].morale) diff++
  }
  eq(diff, 0, '60 partidos al azar: conformidad y moral idénticas, y nextDelta coincide con el partido siguiente')
  ok(predicted > 50, `predicciones comprobadas: ${predicted}`)
  const g = fresh(), p = setup(g, 1, { recent: [0, 0] }); eq(moodDelta(g, p, 0), minutesOf(g, p).nextDelta, 'moodDelta es lo que usa minutesOf')
}

// ---------------------------------------------------------------- "Informe completo" y reserva
sec('Mensajes nuevos')
{
  const g = fresh(), p = Object.values(g.players).find(x => x.clubId !== ME && g.clubs[x.clubId].division === 1)!
  g.scouting = [p.id]; g.know[p.id] = 99.9
  dailySquad(g, new Rng(3))
  ok(g.news[0].body.endsWith('Ya conocés sus atributos, su potencial, cómo es en cada rasgo de su personalidad y su ánimo.'), 'texto de "Informe completo"')
  const h = fresh(); setReserve(h, mine(h).slice(0, 3).map(x => x.id), true)
  while (new Date(h.date + 'T12:00:00Z').getUTCDay() !== 3) advanceDay(h)
  const n = h.news.find(x => x.title === 'Reserva: no hubo partido')!
  ok(n && n.act === 'reserve' && n.body.endsWith('Podés anotar más desde este mensaje.'), 'reserva: act "reserve" y texto nuevo')
}

done('vestuario')
