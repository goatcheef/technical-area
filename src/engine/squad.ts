// El plantel como grupo: personalidades, rol de cada jugador, minutos, promesas, charlas,
// armonía del vestuario, reserva, ojeo con incertidumbre y negociación de contratos.
import { addDays, news, squadOf, valuation } from './game'
import { bestRating, ageOn } from './positions'
import { Rng, clamp } from './rng'
import { A, type Game, type Personality, type Player, type SquadStatus, type Terms } from './types'
import { sab } from './week'

// ---------- personalidad ----------
const h = (a: number, b: number) => (((a * 2654435761) ^ (b * 40503)) >>> 0) % 1000 / 1000
const g4 = (pid: number, k: number) => (h(pid, k) + h(pid, k + 7) + h(pid, k + 13) + h(pid, k + 29) - 2) * 1.73 // aprox. normal
export function persOf(p: Player): Personality {
  if (p.pers) return p.pers
  const age = Number(p.birth.slice(0, 4))
  p.pers = {
    amb: clamp(Math.round(10 + g4(p.id, 1) * 3.6 + (p.ca - 62) / 7), 1, 20),
    temp: clamp(Math.round(10 + (p.attrs[A.agg] - 10) * 0.55 + g4(p.id, 2) * 3.2), 1, 20),
    loy: clamp(Math.round(10 + g4(p.id, 3) * 3.8), 1, 20),
    pres: clamp(Math.round(9 + (p.attrs[A.com] - 10) * 0.5 + (2026 - age - 24) * 0.2 + g4(p.id, 4) * 3), 1, 20),
  }
  return p.pers
}
/** Rasgos visibles de la personalidad. */
export function persLabels(p: Player): string[] {
  const q = persOf(p), out: string[] = []
  if (p.prof >= 16 && q.amb >= 13) out.push('Modelo de profesional')
  else if (p.prof >= 15) out.push('Profesional')
  else if (p.prof <= 7) out.push('Poco profesional')
  if (p.attrs[A.lea] >= 15) out.push('Líder natural')
  if (q.amb >= 16) out.push('Ambicioso')
  if (q.temp >= 16) out.push('Temperamental')
  if (q.loy >= 16) out.push('Leal al club')
  if (q.pres >= 15) out.push('Aparece en los partidos grandes')
  if (q.pres <= 5) out.push('Sufre la presión')
  return out.length ? out : ['Equilibrado']
}

// ---------- rol en el plantel ----------
export const STATUS: Record<SquadStatus, { name: string; share: number; lvl: number; wage: number; help: string }> = {
  key: { name: 'Jugador clave', share: 0.82, lvl: 4, wage: 1.25, help: 'Espera jugar casi todos los partidos.' },
  reg: { name: 'Titular', share: 0.62, lvl: 3, wage: 1.1, help: 'Espera ser titular la mayoría de los partidos.' },
  rot: { name: 'Rotación', share: 0.36, lvl: 2, wage: 1, help: 'Espera jugar seguido, aunque no siempre de entrada.' },
  sub: { name: 'Suplente', share: 0.14, lvl: 1, wage: 0.9, help: 'Acepta esperar su oportunidad.' },
  young: { name: 'Promesa', share: 0.08, lvl: 0, wage: 0.8, help: 'Se conforma con entrenar con el plantel y jugar en la reserva.' },
}
export const STATUS_KEYS: SquadStatus[] = ['key', 'reg', 'rot', 'sub', 'young']
/** El rol que su nivel le da dentro del plantel. */
export function naturalStatus(g: Game, p: Player): SquadStatus {
  const sq = squadOf(g, p.clubId).sort((a, b) => bestRating(b) - bestRating(a))
  const r = sq.findIndex(x => x.id === p.id), age = ageOn(p.birth, g.date)
  if (r < 3) return 'key'
  if (r < 11) return 'reg'
  if (r < 18) return age <= 20 ? 'young' : 'rot'
  return age <= 21 ? 'young' : 'sub'
}
export function initSquad(g: Game, clubId: number) {
  for (const p of squadOf(g, clubId)) { persOf(p); if (!p.status) p.status = naturalStatus(g, p); p.happy ??= 70; p.recent ??= [] }
}
const share = (p: Player) => (p.recent?.length ? p.recent.reduce((a, b) => a + b, 0) / (p.recent.length * 90) : 0)
export const minutesShare = share

/** Después de cada partido del usuario: minutos, conformidad, moral y pedidos para irse. */
export function afterUserMatch(g: Game, mins: Record<number, number>) {
  const c = g.clubs[g.userClubId]
  for (const p of squadOf(g, c.id)) {
    persOf(p); p.status ??= naturalStatus(g, p); p.happy ??= 70
    const m = Math.min(90, mins[p.id] ?? 0)
    if ((p.injury || p.susp) && !m) continue // lesionados y suspendidos no cuentan ese partido
    p.recent = [...(p.recent ?? []), m].slice(-6)
    if (p.promise) p.promise.mins.push(m)
    if (p.recent.length < 3) continue
    const st = STATUS[p.status], q = p.pers!
    // hay tolerancia: se queja cuando juega claramente menos de lo que espera su rol.
    // Los ambiciosos se impacientan antes; los leales tienen más paciencia.
    const deficit = st.share * 0.85 - share(p)
    // las promesas jóvenes se conforman con la reserva; los suplentes tienen más paciencia
    const tol = p.status === 'young' ? (q.amb >= 15 && ageOn(p.birth, g.date) >= 20 ? 0.6 : 0) : p.status === 'sub' ? 0.5 : 1
    if (deficit > 0) p.happy = clamp(p.happy - deficit * 22 * tol * (1 + (q.amb - 10) * 0.05) * (1 - (q.loy - 10) * 0.04), 0, 100)
    else p.happy = clamp(p.happy + 2 + (p.happy < 60 ? 2 : 0), 0, 100)
    if (p.happy < 35) p.morale = clamp(p.morale - 1.5 - (q.temp - 10) * 0.12, 5, 100)
    if (!p.wantsOut && p.happy < 18 && q.loy < 15 && st.lvl >= 1 && h(p.id, p.recent.length + g.season) < 0.5) {
      p.wantsOut = true
      news(g, { tag: 'club', clubId: c.id, pid: p.id, act: 'out', title: `${p.name} quiere irse`, body: `${p.name} está disconforme con los minutos que tiene y le pidió al cuerpo técnico salir del club. Podés responderle desde este mensaje.` })
    }
  }
}

/** Promesas vencidas, ojeo y reserva. Se llama una vez por día. */
export function dailySquad(g: Game, rng: Rng) {
  const c = g.clubs[g.userClubId], sq = squadOf(g, c.id)
  for (const p of sq) {
    const pr = p.promise
    if (!pr || g.date < pr.until) continue
    if (pr.mins.length < 2) { pr.until = addDays(g.date, 14); continue } // sin partidos todavía: se extiende el plazo
    const got = pr.mins.reduce((a, b) => a + b, 0) / (pr.mins.length * 90)
    p.promise = null
    if (got >= pr.share * 0.85) {
      p.happy = clamp((p.happy ?? 50) + 25, 0, 100); p.morale = clamp(p.morale + 8, 5, 100)
      news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `${p.name}, conforme`, body: `${g.manager.name} cumplió con lo que le prometió a ${p.name}: tuvo los minutos que esperaba.` })
    } else {
      p.happy = clamp((p.happy ?? 50) - 30, 0, 100); p.morale = clamp(p.morale - 14, 5, 100)
      g.manager.rep = clamp(g.manager.rep - 1, 5, 99)
      for (const o of sq) if (o !== p) o.morale = clamp(o.morale - 1, 5, 100)
      news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `${p.name} se siente engañado`, body: `${g.manager.name} le había prometido más minutos a ${p.name} y no cumplió. El malestar se nota en el vestuario.` })
    }
  }
  // ojeo
  const rate = 3 + sab(g, 'scout') * 0.35
  for (const pid of [...g.scouting]) {
    const p = g.players[pid]
    if (!p || p.clubId === c.id) { g.scouting = g.scouting.filter(x => x !== pid); continue }
    const k = Math.min(100, knowOf(g, p) + rate * (0.8 + rng.next() * 0.4))
    g.know[pid] = k
    if (k >= 100) {
      g.scouting = g.scouting.filter(x => x !== pid)
      news(g, { tag: 'mercado', clubId: p.clubId, pid: p.id, act: 'scout', title: `Informe completo: ${p.name}`, body: `El scouting terminó de seguir a ${p.name} (${g.clubs[p.clubId].name}). Ya conocés sus atributos, su potencial y su personalidad.` })
    }
  }
}
export function weeklyReserve(g: Game, rng: Rng) {
  const c = g.clubs[g.userClubId]
  const res = squadOf(g, c.id).filter(p => p.reserve && !p.injury)
  if (res.length < 7) return
  for (const p of res) {
    p.tx = (p.tx ?? 0) + 0.18 * (ageOn(p.birth, g.date) <= 21 ? 1 : 0.4)
    if (p.status === 'young' || p.status === 'sub') p.happy = clamp((p.happy ?? 60) + 3, 0, 100)
    p.cond = Math.max(70, p.cond - 6)
  }
  const opp = rng.pick(Object.values(g.clubs).filter(x => x.division === c.division && x.id !== c.id))
  const gf = rng.int(0, 3), ga = rng.int(0, 3), star = rng.pick(res)
  news(g, { tag: 'partido', clubId: c.id, title: `Reserva: ${c.short} ${gf}-${ga} ${opp.short}`, body: `La reserva ${gf > ga ? 'le ganó' : gf < ga ? 'perdió' : 'empató'} ${gf}-${ga} ${gf < ga ? 'con' : 'a'} ${opp.name}. Se destacó ${star.name}. Jugaron ${res.length} futbolistas del plantel profesional.` })
}

// ---------- armonía del vestuario ----------
export function harmony(g: Game) {
  const sq = squadOf(g, g.userClubId)
  const leaders = [...sq].filter(p => !p.injury).sort((a, b) => (b.attrs[A.lea] * 2 + ageOn(b.birth, g.date) * 0.4 + STATUS[b.status ?? 'sub'].lvl * 2) - (a.attrs[A.lea] * 2 + ageOn(a.birth, g.date) * 0.4 + STATUS[a.status ?? 'sub'].lvl * 2)).slice(0, 3)
  const unhappy = sq.filter(p => (p.happy ?? 70) < 35 || p.wantsOut)
  const avgH = sq.reduce((s, p) => s + (p.happy ?? 70), 0) / Math.max(1, sq.length)
  const lead = leaders.reduce((s, p) => s + ((p.happy ?? 70) >= 50 ? (p.attrs[A.lea] - 10) * 1.2 : -(p.attrs[A.lea] - 8) * 1.5), 0)
  const value = clamp(Math.round(avgH * 0.7 + 18 + lead - unhappy.length * 3 - unhappy.filter(p => persOf(p).temp >= 15).length * 3), 0, 100)
  return { value, leaders, unhappy }
}
/** Efecto de la armonía sobre el rendimiento colectivo (alrededor de 1). */
export const harmonyBoost = (g: Game) => 1 + (harmony(g).value - 60) * 0.0006

// ---------- charlas individuales ----------
export type TalkKind = 'praise' | 'demand' | 'promise' | 'patience' | 'status' | 'free' | 'stay'
/** Declara (o quita) transferible a un jugador del plantel. */
export function setListed(g: Game, pid: number, listed: boolean) { const p = g.players[pid]; if (p?.clubId === g.userClubId) p.listed = listed }
export function canTalk(g: Game, p: Player) { return !p.lastTalk || g.date >= addDays(p.lastTalk, 7) }
export function talk(g: Game, p: Player, kind: TalkKind, newStatus?: SquadStatus): string {
  const q = persOf(p), form = p.form.length ? p.form.reduce((a, b) => a + b, 0) / p.form.length : 6.5
  p.lastTalk = g.date
  const mh = (d: number) => { p.happy = clamp((p.happy ?? 60) + d, 0, 100) }, mm = (d: number) => { p.morale = clamp(p.morale + d, 5, 100) }
  switch (kind) {
    case 'praise':
      if (form >= 6.9 || p.stats.goals >= 3) { mm(7); return 'Se lo nota agradecido: "Gracias, profe. Voy a seguir así."' }
      mm(-2); return 'Te mira raro: "¿En serio? Sé que no estoy jugando bien."'
    case 'demand':
      if (p.prof >= 14) { mm(2); p.tx = (p.tx ?? 0) + 0.25; return '"Tiene razón. Voy a meterle más en las prácticas."' }
      if (q.temp >= 14) { mm(-8); mh(-6); return 'Se va enojado: "No me parece justo, dejo todo en cada práctica."' }
      mm(-2); return 'Lo escucha sin mucho entusiasmo: "Está bien."'
    case 'promise':
      p.promise = { until: addDays(g.date, 35), share: Math.min(0.9, STATUS[p.status ?? 'sub'].share + 0.22), mins: [] }
      mh(18); mm(5); p.wantsOut = false
      return `"Le tomo la palabra." Le prometiste más minutos durante las próximas cinco semanas: si no cumplís, se va a sentir engañado.`
    case 'patience':
      if (q.loy >= 13 || q.amb <= 8) { mh(10); return '"Lo entiendo. Voy a esperar mi oportunidad."' }
      mh(-6); mm(-3); return 'No le convence: "Ya esperé bastante."'
    case 'status': {
      if (!newStatus || newStatus === p.status) return ''
      const up = STATUS[newStatus].lvl - STATUS[p.status ?? 'sub'].lvl
      p.status = newStatus
      if (up > 0) { mh(16); mm(6); p.wantsOut = false; return `Está contento con su nuevo rol: ${STATUS[newStatus].name.toLowerCase()}. Ahora espera jugar en consecuencia.` }
      mh(-12 - (q.amb - 10)); mm(-6 - (q.temp - 10) * 0.4)
      return `No le gustó nada pasar a ser ${STATUS[newStatus].name.toLowerCase()}.`
    }
    case 'free':
      p.listed = true
      if (p.wantsOut) { mh(15); mm(6); return '"Gracias por entenderme." Quedó como transferible: los clubes interesados van a empezar a ofertar.' }
      mh(-20); mm(-12); p.wantsOut = true
      return 'Se sorprende y se ofende: "Si no me quieren, me voy." Quedó como transferible.'
    case 'stay':
      p.wantsOut = false
      if (q.loy >= 12) { mh(8); return '"Está bien, me quedo y peleo el puesto."' }
      mh(-10); mm(-8); return 'Acepta quedarse, pero de mala gana. Puede volver a pedirlo.'
  }
}

// ---------- ojeo: lo que se sabe de un jugador ajeno ----------
export function knowOf(g: Game, p: Player): number {
  if (p.clubId === g.userClubId) return 100
  if (g.know[p.id] != null) return g.know[p.id]
  const same = g.clubs[p.clubId]?.division === g.clubs[g.userClubId].division
  return (same ? 35 : 20) + (p.ca >= 78 ? 25 : p.ca >= 72 ? 10 : 0)
}
/** Rango que se muestra para un valor, según cuánto se conoce al jugador. Siempre contiene el valor real. */
export function shown(g: Game, p: Player, v: number, maxW: number, salt: number, lo = 1, hi = 20): [number, number] {
  const w = Math.round(((100 - knowOf(g, p)) / 100) * maxW)
  if (!w) return [v, v]
  const s = Math.round((h(p.id, salt) - 0.5) * w)
  return [clamp(v - w + s, lo, hi), clamp(v + w + s, lo, hi)]
}
export const fmtRange = (r: [number, number]) => (r[0] === r[1] ? String(r[0]) : `${r[0]}-${r[1]}`)
export function scout(g: Game, p: Player) {
  if (p.clubId === g.userClubId || g.scouting.includes(p.id)) return
  g.scouting = [...g.scouting, p.id].slice(-10)
  if (!g.shortlist.includes(p.id)) g.shortlist = [...g.shortlist, p.id]
}
/** Ver jugar a un rival enseña algo de cada uno de sus titulares. */
export function learnFromMatch(g: Game, playerIds: number[]) {
  for (const id of playerIds) { const p = g.players[id]; if (p && p.clubId !== g.userClubId) g.know[id] = Math.min(100, knowOf(g, p) + 12) }
}

// ---------- negociación de contratos ----------
export type NegMode = 'buy' | 'renew'
export interface Demand { terms: Terms; patience: number }
export function demand(g: Game, p: Player, mode: NegMode, status: SquadStatus): Demand {
  const q = persOf(p), dest = g.clubs[g.userClubId], age = ageOn(p.birth, g.date)
  const base = mode === 'buy' ? Math.max(p.wage * 1.05, valuation(p, g.date).wage * (1 + (dest.rep - 60) / 180)) : Math.max(p.wage * 1.08, valuation(p, g.date).wage)
  const wage = Math.round((base * (1 + (q.amb - 10) * 0.022) * STATUS[status].wage * (mode === 'renew' ? 1 - (q.loy - 10) * 0.012 : 1) * (1 - (g.manager.attrs.neg - 10) * 0.008)) / 100) * 100
  const years = age <= 23 ? 4 : age <= 29 ? 3 : 2
  return { terms: { wage, years, status, clause: 0, bonus: Math.round((wage * (1 + q.amb / 5)) / 1000) * 1000 }, patience: q.amb >= 15 ? 2 : 3 }
}
export interface NegResult { ok: boolean; walk?: boolean; msg: string; counter?: Terms }
export function evalOffer(g: Game, p: Player, mode: NegMode, offer: Terms, dem: Demand): NegResult {
  const q = persOf(p), age = ageOn(p.birth, g.date), nat = naturalStatusFor(g, p)
  const want = dem.terms
  let score = offer.wage / want.wage
  score += (STATUS[offer.status].lvl - STATUS[nat].lvl) * (offer.status === nat ? 0 : STATUS[offer.status].lvl > STATUS[nat].lvl ? 0.04 : 0.1 + (q.amb - 10) * 0.01)
  score += age <= 23 ? (offer.years >= 3 ? 0.02 : -0.03) : age >= 30 ? (offer.years >= 2 ? 0.05 : -0.08) : 0
  score += Math.min(0.08, (offer.bonus / Math.max(1, want.bonus)) * 0.04)
  if (offer.clause > 0) score += offer.clause < p.value * 1.6 ? (q.amb - 8) * 0.006 : offer.clause > p.value * 4 ? -0.05 - (q.amb - 10) * 0.005 : 0
  else score += 0.02 + (q.amb - 10) * 0.004
  if (mode === 'renew') score += (q.loy - 10) * 0.008 + ((p.happy ?? 60) - 50) * 0.002
  const club = g.clubs[g.userClubId], bill = squadOf(g, club.id).reduce((s, x) => s + (x.id === p.id ? 0 : x.wage), 0)
  if (bill + offer.wage > club.wageBudget) return { ok: false, msg: `Ese sueldo supera el tope salarial del club (te quedan ${Math.max(0, club.wageBudget - bill).toLocaleString('es-AR')} por mes).` }
  if (mode === 'buy' && offer.bonus > club.balance) return { ok: false, msg: 'El club no tiene caja para pagar esa prima.' }
  if (score >= 0.985) return { ok: true, msg: '¡Hay acuerdo!' }
  dem.patience -= score < 0.85 ? 2 : 1
  if (dem.patience <= 0) return { ok: false, walk: true, msg: `El representante de ${p.name} da por terminada la negociación.` }
  const need = Math.round((offer.wage * (1 + (0.985 - score) * 1.15)) / 100) * 100
  const counter: Terms = { ...offer, wage: Math.max(need, Math.round(want.wage * 0.92 / 100) * 100), bonus: Math.max(offer.bonus, Math.round(want.bonus * 0.7 / 1000) * 1000) }
  const why = STATUS[offer.status].lvl < STATUS[nat].lvl ? ' Además, pretende un rol más importante en el plantel.' : ''
  return { ok: false, msg: `${score < 0.85 ? 'La oferta le parece muy baja.' : 'Está cerca.'} Pide US$ ${counter.wage.toLocaleString('es-AR')} por mes y una prima de US$ ${counter.bonus.toLocaleString('es-AR')}.${why}`, counter }
}
/** Rol que el jugador cree merecer en tu plantel (para la negociación). */
export function naturalStatusFor(g: Game, p: Player): SquadStatus {
  if (p.clubId === g.userClubId) return naturalStatus(g, p)
  const sq = squadOf(g, g.userClubId).sort((a, b) => bestRating(b) - bestRating(a))
  const r = sq.filter(x => bestRating(x) > bestRating(p)).length, age = ageOn(p.birth, g.date)
  return r < 3 ? 'key' : r < 11 ? 'reg' : r < 18 ? (age <= 20 ? 'young' : 'rot') : age <= 21 ? 'young' : 'sub'
}
/** Aplica un contrato acordado (renovación). */
export function applyRenewal(g: Game, p: Player, t: Terms) {
  const c = g.clubs[g.userClubId]
  p.wage = t.wage; p.contractEnd = g.season + t.years; p.status = t.status; p.clause = t.clause || undefined
  c.balance -= t.bonus; c.ledger.wages += t.bonus
  p.happy = clamp((p.happy ?? 60) + 15, 0, 100); p.morale = clamp(p.morale + 6, 5, 100); p.wantsOut = false
  news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `${p.name} renovó con ${c.short}`, body: `${p.name} firmó su nuevo contrato hasta diciembre de ${p.contractEnd}${t.clause ? `, con una cláusula de rescisión de US$ ${t.clause.toLocaleString('es-AR')}` : ''}.` })
}
