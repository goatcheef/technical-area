// Bandeja de entrada: decisiones pendientes y contadores. Se calcula del estado, sin guardar nada.
import { isOpenDeal, jobKind, offerDeadline } from './career'
import { decisionKeyOf, isMine } from './game'
import type { Deal, Game, News, Offer } from './types'

/** `deadline`: último día para responder (ISO). Sin plazo: la conferencia (habla el ayudante), el que quiere irse y la temporada. */
export type Pending =
  | { k: 'press'; key: string; deadline?: string }
  | { k: 'offer'; key: string; o: Offer; deadline: string }
  | { k: 'job'; key: string; clubId: number; until: string; kind: 'mid' | 'season'; deadline: string }
  | { k: 'out'; key: string; pid: number; deadline?: string }
  | { k: 'season'; key: string; deadline?: string }
/** Contraoferta de un club o acuerdo para cerrar (`deal<id>`, plazo `deal.deadline`). */
export type DealPending = { k: 'deal'; key: string; d: Deal; kind: 'countered' | 'agreed'; deadline: string }
/** Todos los pendientes, con los tratos. `Pending` queda sin `deal` para la interfaz de antes (que no tiene plantilla de trato). */
export type AnyPending = Pending | DealPending

const rank = (p: AnyPending) => (p.k === 'press' ? 0 : p.k === 'season' ? 3 : p.deadline ? 1 : 2)

/** Lo que el DT tiene que decidir, por urgencia: la conferencia, lo que vence antes, lo que no vence y la nueva temporada al final. Incluye los tratos (`deal`). */
export function pendingAll(g: Game): AnyPending[] {
  const out: AnyPending[] = []
  if (g.seasonOver) out.push({ k: 'season', key: 'season' })
  if (g.press) out.push({ k: 'press', key: `press${g.press.fixtureId}${g.press.kind}` })
  for (const j of g.jobOffers ?? []) if (j.until >= g.date) out.push({ k: 'job', key: `job${j.clubId}`, clubId: j.clubId, until: j.until, kind: jobKind(g, j), deadline: j.until })
  for (const o of g.offers) if (g.players[o.pid]) out.push({ k: 'offer', key: `offer${o.id}`, o, deadline: offerDeadline(o) })
  // contraofertas y acuerdos para cerrar del club actual (una contraoferta aceptada sigue siendo la misma decisión: `deal<id>`)
  for (const d of g.deals ?? []) if (isOpenDeal(d) && d.state !== 'waiting' && d.userClubId === g.userClubId && d.deadline)
    out.push({ k: 'deal', key: `deal${d.id}`, d, kind: d.state as 'countered' | 'agreed', deadline: d.deadline })
  for (const p of Object.values(g.players)) if (outOpen(g, p.id)) out.push({ k: 'out', key: `out${p.id}`, pid: p.id })
  return out.sort((a, b) => rank(a) - rank(b) || (a.deadline && b.deadline ? a.deadline.localeCompare(b.deadline) : 0))
}
/** Compatibilidad: los pendientes sin los tratos, con el tipo de antes. La interfaz nueva usa `pendingAll`; los contadores ya cuentan los tratos. */
export const pendingOf = (g: Game): Pending[] => pendingAll(g).filter((p): p is Pending => p.k !== 'deal')
/** "Tenés una conferencia y 2 ofertas pendientes". */
export function pendingText(ps: AnyPending[]): string {
  const n = (k: AnyPending['k']) => ps.filter(p => p.k === k).length
  const nd = (kind: 'countered' | 'agreed') => ps.filter(p => p.k === 'deal' && p.kind === kind).length
  const parts: string[] = []
  if (n('season')) parts.push('la nueva temporada')
  if (n('press')) parts.push('una conferencia')
  if (n('job')) parts.push(n('job') > 1 ? `${n('job')} ofertas de trabajo` : 'una oferta de trabajo')
  if (n('offer')) parts.push(n('offer') > 1 ? `${n('offer')} ofertas por jugadores` : 'una oferta por un jugador')
  if (nd('countered')) parts.push(nd('countered') > 1 ? `${nd('countered')} contraofertas` : 'una contraoferta')
  if (nd('agreed')) parts.push(nd('agreed') > 1 ? `${nd('agreed')} acuerdos para cerrar` : 'un acuerdo para cerrar')
  if (n('out')) parts.push(n('out') > 1 ? `${n('out')} jugadores que quieren irse` : 'un jugador que quiere irse')
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0] ?? ''
}
/** Las decisiones que frenan el avance hasta el partido cuando aparecen (también la respuesta a una mejora: la clave vuelve a aparecer). */
export const decisionKeys = (g: Game) => new Set(pendingAll(g).filter(p => p.k !== 'season').map(p => p.key))
/**
 * Pendientes con plazo para los que hoy es el último día para responder (mañana ya no están): ofertas por jugadores
 * (`marketTick` las borra al cerrar el día de `offerDeadline`), ofertas de trabajo (`pendingOf` las deja hasta `until`), contraofertas y
 * acuerdos (`dailyDeals` los vence al día siguiente de `deadline`; también cuando ese día es el último del libro).
 * El avance hasta el partido frena acá (AC-02) aunque la decisión no sea nueva.
 */
export const expiringKeys = (g: Game): string[] => pendingAll(g).filter(p => (p.k === 'offer' || p.k === 'job' || p.k === 'deal') && p.deadline <= g.date).map(p => p.key)

/** Clave de decisión → id del mensaje más nuevo de esa oferta, ese trato o ese pedido de salida (`g.news` va del más nuevo al más viejo). */
export function newestOf(g: Game): Map<string, number> {
  const m = new Map<string, number>()
  for (const n of g.news) { const k = decisionKeyOf(n); if (k && !m.has(k)) m.set(k, n.id) }
  return m
}
/** El pedido de salida `out<pid>` está abierto: jugador del club del DT que quiere irse y no es transferible (la condición de `pendingAll`). */
export function outOpen(g: Game, pid: number): boolean {
  const p = g.players[pid]
  return !!p && p.clubId === g.userClubId && !!p.wantsOut && !p.listed
}
/**
 * Clave del pendiente que resuelve este mensaje, si lo tiene (oferta, trato, trabajo, jugador que quiere irse). Con `g`, una oferta, un
 * trato o un pedido de salida se liga solo a su mensaje más nuevo y solo mientras la decisión sigue abierta (los mensajes viejos y los de una
 * decisión cerrada no son la decisión vigente: un pedido que se cerró sin el DT queda como mensaje común). `pendingKeyOf(n)` sin `g` es la
 * forma anterior (compatibilidad): liga todos los mensajes de la oferta, el trato o el pedido.
 */
export function pendingKeyOf(g: Game | News, n?: News, newest?: Map<string, number>): string | null {
  const msg = n ?? (g as News), game = n ? (g as Game) : null
  const dk = decisionKeyOf(msg)
  if (dk && !game) return dk
  if (dk && game) {
    if ((newest ?? newestOf(game)).get(dk) !== msg.id) return null
    const open = msg.act === 'out' ? outOpen(game, msg.pid!)
      : msg.act === 'offer' ? game.offers.some(o => o.id === msg.ref && game.players[o.pid])
      : (game.deals ?? []).some(d => d.id === msg.ref && isOpenDeal(d) && d.state !== 'waiting' && d.userClubId === game.userClubId)
    return open ? dk : null
  }
  if (msg.act === 'job' && msg.ref != null) return `job${msg.ref}`
  return null
}
/**
 * Mensajes del DT sin leer que cuentan en la bandeja. Una decisión cuenta una vez: el mensaje con su decisión abierta cuenta como
 * pendiente, y de cada oferta, trato o pedido de salida solo cuenta su mensaje más nuevo (el de un vencimiento reemplaza al de la decisión).
 */
export function unreadOf(g: Game, pend: Set<string> = new Set(pendingAll(g).map(p => p.key))): number {
  const newest = newestOf(g)
  let s = 0
  for (const n of g.news) if (!n.read && isMine(g, n)) {
    const dk = decisionKeyOf(n)
    if (dk && newest.get(dk) !== n.id) continue
    const k = pendingKeyOf(g, n, newest)
    if (!k || !pend.has(k)) s++
  }
  return s
}
/** El número de la bandeja: pendientes más mensajes del DT sin leer. */
export function inboxCount(g: Game): number {
  const ps = pendingAll(g)
  return ps.length + unreadOf(g, new Set(ps.map(p => p.key)))
}
