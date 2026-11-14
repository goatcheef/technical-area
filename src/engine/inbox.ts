// Bandeja de entrada: decisiones pendientes y contadores. Se calcula del estado, sin guardar nada.
import { jobKind, offerDeadline } from './career'
import { isMine } from './game'
import type { Game, News, Offer } from './types'

/** `deadline`: último día para responder (ISO). Sin plazo: la conferencia (habla el ayudante), el que quiere irse y la temporada. */
export type Pending =
  | { k: 'press'; key: string; deadline?: string }
  | { k: 'offer'; key: string; o: Offer; deadline: string }
  | { k: 'job'; key: string; clubId: number; until: string; kind: 'mid' | 'season'; deadline: string }
  | { k: 'out'; key: string; pid: number; deadline?: string }
  | { k: 'season'; key: string; deadline?: string }

const rank = (p: Pending) => (p.k === 'press' ? 0 : p.k === 'season' ? 3 : p.deadline ? 1 : 2)

/** Lo que el DT tiene que decidir, por urgencia: la conferencia, lo que vence antes, lo que no vence y la nueva temporada al final. */
export function pendingOf(g: Game): Pending[] {
  const out: Pending[] = []
  if (g.seasonOver) out.push({ k: 'season', key: 'season' })
  if (g.press) out.push({ k: 'press', key: `press${g.press.fixtureId}${g.press.kind}` })
  for (const j of g.jobOffers ?? []) if (j.until >= g.date) out.push({ k: 'job', key: `job${j.clubId}`, clubId: j.clubId, until: j.until, kind: jobKind(g, j), deadline: j.until })
  for (const o of g.offers) if (g.players[o.pid]) out.push({ k: 'offer', key: `offer${o.id}`, o, deadline: offerDeadline(o) })
  for (const p of Object.values(g.players)) if (p.clubId === g.userClubId && p.wantsOut && !p.listed) out.push({ k: 'out', key: `out${p.id}`, pid: p.id })
  return out.sort((a, b) => rank(a) - rank(b) || (a.deadline && b.deadline ? a.deadline.localeCompare(b.deadline) : 0))
}
/** "Tenés una conferencia y 2 ofertas pendientes". */
export function pendingText(ps: Pending[]): string {
  const n = (k: Pending['k']) => ps.filter(p => p.k === k).length
  const parts: string[] = []
  if (n('season')) parts.push('la nueva temporada')
  if (n('press')) parts.push('una conferencia')
  if (n('job')) parts.push(n('job') > 1 ? `${n('job')} ofertas de trabajo` : 'una oferta de trabajo')
  if (n('offer')) parts.push(n('offer') > 1 ? `${n('offer')} ofertas por jugadores` : 'una oferta por un jugador')
  if (n('out')) parts.push(n('out') > 1 ? `${n('out')} jugadores que quieren irse` : 'un jugador que quiere irse')
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0] ?? ''
}
/** Las decisiones que frenan el avance hasta el partido cuando aparecen. */
export const decisionKeys = (g: Game) => new Set(pendingOf(g).filter(p => p.k !== 'season').map(p => p.key))
/**
 * Pendientes con plazo para los que hoy es el último día para responder (mañana ya no están): ofertas por jugadores
 * (`marketTick` las borra al cerrar el día de `offerDeadline`) y ofertas de trabajo (`pendingOf` las deja hasta `until`).
 * El avance hasta el partido frena acá (AC-02) aunque la decisión no sea nueva.
 */
export const expiringKeys = (g: Game): string[] => pendingOf(g).filter(p => (p.k === 'offer' || p.k === 'job') && p.deadline <= g.date).map(p => p.key)

/** Clave del pendiente que resuelve este mensaje, si lo tiene (oferta, trabajo, jugador que quiere irse). */
export function pendingKeyOf(n: News): string | null {
  if (n.act === 'offer' && n.ref != null) return `offer${n.ref}`
  if (n.act === 'job' && n.ref != null) return `job${n.ref}`
  if (n.act === 'out' && n.pid != null) return `out${n.pid}`
  return null
}
/** Mensajes del DT sin leer, sin contar los que tienen la decisión abierta (esos cuentan como pendiente). */
export function unreadOf(g: Game, pend: Set<string> = new Set(pendingOf(g).map(p => p.key))): number {
  let s = 0
  for (const n of g.news) if (!n.read && isMine(g, n)) { const k = pendingKeyOf(n); if (!k || !pend.has(k)) s++ }
  return s
}
/** El número de la bandeja: pendientes más mensajes del DT sin leer. */
export function inboxCount(g: Game): number {
  const ps = pendingOf(g)
  return ps.length + unreadOf(g, new Set(ps.map(p => p.key)))
}
