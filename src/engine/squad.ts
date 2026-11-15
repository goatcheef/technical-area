// El plantel como grupo: personalidades, rol de cada jugador, minutos, promesas, charlas,
// armonía del vestuario, reserva, ojeo con incertidumbre y negociación de contratos.
import { LISTED_PRICE, OFFER_CHANCE, canSell, windowState, type WindowState } from './career'
import { addDays, fmtDay, injuryOutlook, news, readDecisionNews, squadOf, valuation } from './game'
import { bestRating, ageOn } from './positions'
import { Rng, clamp } from './rng'
import { A, type Game, type MoodNoteKind, type Personality, type Player, type PromiseLog, type SquadStatus, type TalkKind, type TalkReply, type Terms } from './types'
import { addProgress, sab } from './week'
export type { TalkKind } from './types'

// ---------- umbrales de las reglas que la interfaz nombra con palabras ----------
/** Lealtad desde la que "Decirle que no se va" se acepta de buena gana (pregunta 16, R9: antes 12): "Leal" decide paciencia y quedarse. */
export const LOY_STAY = 13
/** Temperamento desde el que un disconforme resta armonía (pregunta 23, R13: antes 15): el mismo corte que la palabra "Temperamental". */
export const TEMP_HOT = 14

// ---------- personalidad ----------
const h = (a: number, b: number) => (((a * 2654435761) ^ (b * 40503)) >>> 0) % 1000 / 1000
const g4 = (pid: number, k: number) => (h(pid, k) + h(pid, k + 7) + h(pid, k + 13) + h(pid, k + 29) - 2) * 1.73 // aprox. normal
/** Azar fijo de 0 a 1 para un par de números (mezcla mejor que `h`; para sorteos que se repiten por semana o por nivel). */
export const hash01 = (a: number, b: number) => {
  let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b + 0x632be59b) | 0, 0xc2b2ae35)
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16
  return (x >>> 0) / 4294967296
}
/**
 * Personalidad. Sale del id y de cómo era el jugador al aparecer en la partida, y se guarda en ese momento:
 * `ensurePersonalities` la fija para todos al empezar la partida y, cada día, para los que se sumaron.
 * Así sus efectos en los partidos (presión, temperamento) no dependen de qué fichas miró el DT.
 */
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
/** Fija la personalidad de todos los jugadores que todavía no la tienen (es barato: solo mira los que faltan). */
export function ensurePersonalities(g: Game) { for (const p of Object.values(g.players)) if (!p.pers) persOf(p) }
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

/** Rasgo de la personalidad en palabras. `band` es el índice de su banda, de la más alta a la más baja (para ordenar por banda, nunca por el valor). */
export type TraitKey = 'amb' | 'loy' | 'temp' | 'pres' | 'prof' | 'lea'
export interface Trait { key: TraitKey; name: string; word: string; text: string; band: number }
/** Orden fijo de los rasgos (también el de la clave de orden de la columna `pers`). */
export const TRAIT_KEYS: TraitKey[] = ['amb', 'loy', 'temp', 'pres', 'prof', 'lea']
const TRAIT_NAME: Record<TraitKey, string> = { amb: 'Ambición', loy: 'Lealtad', temp: 'Temperamento', pres: 'Presión', prof: 'Profesionalismo', lea: 'Liderazgo' }
/**
 * Banda de un rasgo (pregunta 1, opción B; R14): cortes en los umbrales de las charlas y del motor, así cada palabra dice de qué lado de cada
 * regla está el jugador. Ambición: Muy alta ≥ 15, Alta 12-14 (cláusula que paga un rival), Normal 9-11, Baja ≤ 8. Lealtad: Muy leal ≥ 15
 * (nunca pide irse), Leal 13-14, Normal 8-12, Poco apegado ≤ 7. Temperamento ≥ 14. Presión ≥ 15 / ≤ 5. Profesionalismo ≥ 14 / ≤ 7.
 * Liderazgo: "Líder natural" desde 15 y, si no, sin palabra (`null`).
 */
export function traitOf(key: TraitKey, v: number): Trait | null {
  const t = (band: number, word: string, text = word): Trait => ({ key, name: TRAIT_NAME[key], word, text, band })
  switch (key) {
    case 'amb': { const b = v >= 15 ? 0 : v >= 12 ? 1 : v >= 9 ? 2 : 3, w = ['Muy alta', 'Alta', 'Normal', 'Baja'][b]; return t(b, w, `Ambición ${w.toLowerCase()}`) }
    case 'loy': { const b = v >= 15 ? 0 : v >= 13 ? 1 : v >= 8 ? 2 : 3; return t(b, ['Muy leal', 'Leal', 'Normal', 'Poco apegado'][b], ['Muy leal', 'Leal', 'Lealtad normal', 'Poco apegado'][b]) }
    case 'temp': return v >= TEMP_HOT ? t(0, 'Temperamental') : t(1, 'Tranquilo')
    case 'pres': return v >= 15 ? t(0, 'Aparece en los partidos grandes') : v <= 5 ? t(2, 'Sufre la presión') : t(1, 'Normal', 'Presión normal')
    case 'prof': return v >= 14 ? t(0, 'Profesional') : v <= 7 ? t(2, 'Poco profesional') : t(1, 'Normal', 'Profesionalismo normal')
    case 'lea': return v >= 15 ? t(0, 'Líder natural') : null
  }
}
const traitValues = (p: Player): Record<TraitKey, number> => { const q = persOf(p); return { amb: q.amb, loy: q.loy, temp: q.temp, pres: q.pres, prof: p.prof, lea: p.attrs[A.lea] } }
/** Los extremos que se ven de un ajeno conocido del 60 al 99 % (los cortes de `persLabels`): cada uno cae dentro de su banda. */
const isExtreme = (k: TraitKey, v: number) => (k === 'amb' || k === 'loy' || k === 'temp' ? v >= 16 : k === 'pres' ? v >= 15 || v <= 5 : k === 'prof' ? v >= 15 || v <= 7 : v >= 15)
/**
 * Personalidad visible (reemplaza a `persLabels` en todas las pantallas). Propio o ajeno con el informe completo: `full`, una palabra por rasgo
 * (el liderazgo solo si es "Líder natural"). Ajeno conocido del 60 al 99 %: `extremes`, solo los rasgos extremos, con la palabra de su banda.
 * Menos: `none`, sin rasgos. Nunca números.
 */
export function persTraits(g: Game, p: Player): { level: 'full' | 'extremes' | 'none'; traits: Trait[] } {
  const k = knowOf(g, p)
  if (k < 60) return { level: 'none', traits: [] }
  const v = traitValues(p), all = TRAIT_KEYS.map(key => traitOf(key, v[key])).filter((x): x is Trait => !!x)
  return k >= 100 ? { level: 'full', traits: all } : { level: 'extremes', traits: all.filter(t => isExtreme(t.key, v[t.key])) }
}
const traitOfP = (p: Player, key: TraitKey) => traitOf(key, traitValues(p)[key])

// ---------- palabras del vestuario: una escala por dato ----------
export type MoodBand = 'great' | 'good' | 'ok' | 'upset' | 'angry'
/**
 * Conformidad en palabras: la única escala (Muy contento ≥ 80, Contento ≥ 60, Conforme ≥ 35, Molesto ≥ 18, Muy molesto < 18; 35 y 18 son
 * los cortes del motor). `n` es el número para mostrar (`Math.floor`, así el número y la palabra nunca se contradicen en un corte).
 */
export function moodOf(happy = 70): { word: string; band: MoodBand; n: number } {
  const n = Math.floor(happy)
  return happy >= 80 ? { word: 'Muy contento', band: 'great', n } : happy >= 60 ? { word: 'Contento', band: 'good', n }
    : happy >= 35 ? { word: 'Conforme', band: 'ok', n } : happy >= 18 ? { word: 'Molesto', band: 'upset', n } : { word: 'Muy molesto', band: 'angry', n }
}
export type MoraleBand = 'high' | 'good' | 'ok' | 'low'
/** Ánimo (moral) en palabras: Muy alto ≥ 80, Bueno ≥ 60, Normal ≥ 35, Bajo < 35 (con menos de 35 no quiere renovar). Otra escala que la conformidad. */
export function moraleOf(m: number): { word: string; band: MoraleBand; n: number } {
  const n = Math.floor(m)
  return m >= 80 ? { word: 'Muy alto', band: 'high', n } : m >= 60 ? { word: 'Bueno', band: 'good', n } : m >= 35 ? { word: 'Normal', band: 'ok', n } : { word: 'Bajo', band: 'low', n }
}
export const moraleWord = (m: number) => moraleOf(m).word
/** Armonía en palabras: Grupo unido ≥ 70, Clima normal ≥ 45, Hay ruido ≥ 25, Vestuario partido. */
export const harmonyWord = (v: number) => (v >= 70 ? 'Grupo unido' : v >= 45 ? 'Clima normal' : v >= 25 ? 'Hay ruido' : 'Vestuario partido')
/**
 * El ánimo que se ve (5.5): propio, número y palabra; ajeno con el informe completo, solo la palabra; ajeno con menos, nada (`null`:
 * "Su ánimo lo dice el informe completo.").
 */
export function moraleShown(g: Game, p: Player): { value?: number; word: string } | null {
  if (p.clubId === g.userClubId) return { value: p.morale, word: moraleWord(p.morale) }
  return knowOf(g, p) >= 100 ? { word: moraleWord(p.morale) } : null
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
  ensurePersonalities(g)
  for (const p of squadOf(g, clubId)) { if (!p.status) p.status = naturalStatus(g, p); p.happy ??= 70; p.recent ??= [] }
}
const share = (p: Player) => (p.recent?.length ? p.recent.reduce((a, b) => a + b, 0) / (p.recent.length * 90) : 0)
export const minutesShare = share
const pct = (v: number) => Math.round(v * 100)
const statusOf = (g: Game, p: Player) => p.status ?? naturalStatus(g, p)

/**
 * Cuánto le pesa jugar menos de lo que espera su rol (la tolerancia de `afterUserMatch`): las promesas jóvenes se conforman con la reserva
 * (0, salvo ambición 15 o más y 20 años o más a `g.date`: 0,6); los suplentes tienen más paciencia (0,5); el resto, 1.
 */
export function minutesTol(g: Game, p: Player): number {
  const st = statusOf(g, p)
  return st === 'young' ? (persOf(p).amb >= 15 && ageOn(p.birth, g.date) >= 20 ? 0.6 : 0) : st === 'sub' ? 0.5 : 1
}
/**
 * La conformidad que le deja un partido evaluado con participación `sh` (una sola regla: la usan `afterUserMatch` y `minutesOf`).
 * Hay tolerancia: se queja cuando juega claramente menos de lo que espera su rol (déficit sobre el 85 %); los ambiciosos se impacientan
 * antes y los leales tienen más paciencia. Si no le falta, sube 2 (4 por debajo de 60).
 */
function moodAfter(g: Game, p: Player, sh: number): number {
  const st = STATUS[statusOf(g, p)], q = persOf(p), h = p.happy ?? 70
  const deficit = st.share * 0.85 - sh, tol = minutesTol(g, p)
  if (deficit > 0) return clamp(h - deficit * 22 * tol * (1 + (q.amb - 10) * 0.05) * (1 - (q.loy - 10) * 0.04), 0, 100)
  return clamp(h + 2 + (h < 60 ? 2 : 0), 0, 100)
}
/** Cambio de conformidad (ya recortado a 0-100) que le deja un partido evaluado con participación `sh`. */
export const moodDelta = (g: Game, p: Player, sh: number) => moodAfter(g, p, sh) - (p.happy ?? 70)

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
    p.happy = moodAfter(g, p, share(p))
    if (p.happy < 35) p.morale = clamp(p.morale - 1.5 - (q.temp - 10) * 0.12, 5, 100)
    // el azar se sortea de nuevo cada semana (fijo dentro de la semana): no queda decidido para toda la temporada
    if (!p.wantsOut && p.happy < 18 && q.loy < 15 && st.lvl >= 1 && hash01(p.id, weekNo(g.date)) < 0.5) {
      p.wantsOut = true; p.outDate = g.date
      news(g, { tag: 'club', clubId: c.id, pid: p.id, act: 'out', title: `${p.name} quiere irse`, body: `${p.name} está disconforme con los minutos que tiene (juega el ${pct(share(p))} % y espera el ${pct(st.share)} %) y le pidió al cuerpo técnico salir del club. Podés responderle desde este mensaje.` })
    }
  }
}

/** No juega el próximo partido del club por lesión o suspensión: ese partido no lo cuenta `afterUserMatch`. */
export function idleOf(g: Game, p: Player): 'injury' | 'susp' | undefined {
  if (p.injury && (injuryOutlook(g, p.id)?.matches ?? 0) > 0) return 'injury'
  if (p.susp > 0) return 'susp'
  return undefined
}
export interface Minutes {
  /** Participación en los partidos que cuentan (`recent`, hasta 6), de 0 a 1. */
  got: number
  /** Lo que espera su rol (`STATUS[].share`). */
  expected: number
  /** Por debajo de esto se molesta (85 % de lo esperado). */
  threshold: number
  /** Tolerancia del rol (`minutesTol`): 0 no le pesa, 0,5 la mitad de rápido, 1 como un titular. */
  tol: number
  recent: number[]
  /** El próximo partido ya mueve la conformidad (2 partidos o más en `recent`: el próximo es el tercero). */
  counts: boolean
  idle?: 'injury' | 'susp'
  /** Cambio de conformidad que le dejaría el próximo partido al ritmo de hoy (0 sin `counts` o con `idle`). Uso interno: mostrar el signo. */
  nextDelta: number
}
/** Minutos jugados y esperados, con lo que le haría el próximo partido (la misma cuenta que `afterUserMatch`). */
export function minutesOf(g: Game, p: Player): Minutes {
  const recent = p.recent ?? [], got = share(p), expected = STATUS[statusOf(g, p)].share, idle = idleOf(g, p)
  const counts = recent.length >= 2
  return { got, expected, threshold: expected * 0.85, tol: minutesTol(g, p), recent, counts, ...(idle ? { idle } : {}), nextDelta: counts && !idle ? moodDelta(g, p, got) : 0 }
}
export type Trend = 'baja' | 'sube' | 'estable' | 'en pausa' | 'sin datos'
/**
 * Tendencia de la conformidad. `canAskOut`: lo que mira `afterUserMatch` después del próximo partido (cuenta, no está lesionado ni suspendido,
 * todavía no pidió irse, la conformidad que le quedaría es menor que 18, rol Suplente o más y lealtad menor que 15). Ese día lo pide si sale
 * el sorteo de la semana (una chance en dos): no se expone el resultado.
 */
export function moodOutlook(g: Game, p: Player, m = minutesOf(g, p)): { trend: Trend; idle?: 'injury' | 'susp'; canAskOut: boolean } {
  const trend: Trend = !m.counts ? 'sin datos' : m.idle ? 'en pausa' : m.nextDelta < 0 ? 'baja' : m.nextDelta > 0 ? 'sube' : 'estable'
  const canAskOut = m.counts && !m.idle && !p.wantsOut && (p.happy ?? 70) + m.nextDelta < 18 && STATUS[statusOf(g, p)].lvl >= 1 && persOf(p).loy < 15
  return { trend, ...(m.idle ? { idle: m.idle } : {}), canAskOut }
}
/** "En baja": conforme o mejor, pero al ritmo de hoy el próximo partido le baja la conformidad. */
const fallingOf = (p: Player, m: Minutes) => (p.happy ?? 70) >= 35 && m.counts && !m.idle && m.nextDelta < 0

/** Número de semana (lunes a domingo) de una fecha ISO: sirve de semilla para sorteos semanales. */
export const weekNo = (d: string) => Math.floor((Date.parse(d) / 86400000 + 3) / 7)

/** Promesas vencidas, ojeo y reserva. Se llama una vez por día. */
export function dailySquad(g: Game, rng: Rng) {
  ensurePersonalities(g) // los que se sumaron ayer (juveniles, refuerzos del exterior)
  const c = g.clubs[g.userClubId], sq = squadOf(g, c.id)
  for (const p of sq) {
    const pr = p.promise
    if (!pr || g.date < pr.until) continue
    const cur = p.promiseLog?.find(x => !x.result)
    if (pr.mins.length < 2) { // sin partidos todavía: se extiende el plazo, queda en el registro y se avisa
      pr.until = addDays(g.date, 14); pr.ext = g.date
      if (cur) cur.until = pr.until
      logPromise(p, { made: cur?.made ?? g.date, until: pr.until, target: pr.share, result: 'extended' })
      news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `Se corrió el plazo de la promesa a ${p.name}`, body: `El plazo de la promesa a ${p.name} se corrió al ${fmtDay(pr.until)}: jugó menos de 2 partidos.` })
      continue
    }
    const got = pr.mins.reduce((a, b) => a + b, 0) / (pr.mins.length * 90), kept = got >= pr.share * 0.85
    const fig = ` Jugó el ${pct(got)} % de los minutos; le habías prometido el ${pct(pr.share)} % (cumplías con ${pct(pr.share * 0.85)} %).`
    p.promise = null
    if (cur) Object.assign(cur, { got, result: kept ? 'kept' : 'broken' })
    else logPromise(p, { made: g.date, until: pr.until, target: pr.share, got, result: kept ? 'kept' : 'broken' })
    if (kept) {
      p.happy = clamp((p.happy ?? 50) + 25, 0, 100); p.morale = clamp(p.morale + 8, 5, 100)
      if (p.moodNote) p.moodNote = undefined
      news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `${p.name}, conforme`, body: `${g.manager.name} cumplió con lo que le prometió a ${p.name}: tuvo los minutos que esperaba.${fig}` })
    } else {
      p.happy = clamp((p.happy ?? 50) - 30, 0, 100); p.morale = clamp(p.morale - 14, 5, 100)
      p.moodNote = { date: g.date, kind: 'broken' }
      g.manager.rep = clamp(g.manager.rep - 1, 5, 99)
      for (const o of sq) if (o !== p) o.morale = clamp(o.morale - 1, 5, 100)
      news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `${p.name} se siente engañado`, body: `${g.manager.name} le había prometido más minutos a ${p.name} y no cumplió. El malestar se nota en el vestuario.${fig}` })
    }
  }
  // ojeo
  const rate = scoutRate(g)
  for (const pid of [...g.scouting]) {
    const p = g.players[pid]
    if (!p || p.clubId === c.id) { g.scouting = g.scouting.filter(x => x !== pid); continue }
    const k = Math.min(100, knowOf(g, p) + rate * (0.8 + rng.next() * 0.4))
    g.know[pid] = k
    if (k >= 100) {
      g.scouting = g.scouting.filter(x => x !== pid)
      news(g, { tag: 'mercado', clubId: p.clubId, pid: p.id, act: 'scout', title: `Informe completo: ${p.name}`, body: `El scouting terminó de seguir a ${p.name} (${g.clubs[p.clubId].name}). Ya conocés sus atributos, su potencial, cómo es en cada rasgo de su personalidad y su ánimo.` })
    }
  }
}
const logPromise = (p: Player, e: PromiseLog) => { p.promiseLog = [...(p.promiseLog ?? []), e] }

/** Anota o saca de la reserva a jugadores del plantel del DT (los ajenos se ignoran). Devuelve cuántos cambiaron. */
export function setReserve(g: Game, ids: number[], on: boolean): number {
  let n = 0
  for (const id of ids) { const p = g.players[id]; if (p?.clubId === g.userClubId && !!p.reserve !== on) { p.reserve = on; n++ } }
  return n
}
/** Próximo partido de reserva: el próximo miércoles después de hoy (`weeklyReserve` corre al empezar el miércoles, así que el de hoy ya se jugó). */
export function nextReserveDay(g: Game): string {
  let d = addDays(g.date, 1)
  while (new Date(d + 'T12:00:00Z').getUTCDay() !== 3) d = addDays(d, 1)
  return d
}
/** Anotados en la reserva, sanos entre ellos y cuántos hacen falta para que se juegue (7). */
export function reserveOf(g: Game): { marked: number; fit: number; min: number; day: string } {
  const m = squadOf(g, g.userClubId).filter(p => p.reserve)
  return { marked: m.length, fit: m.filter(p => !p.injury).length, min: 7, day: nextReserveDay(g) }
}
export function weeklyReserve(g: Game, rng: Rng) {
  const c = g.clubs[g.userClubId]
  const marked = squadOf(g, c.id).filter(p => p.reserve), res = marked.filter(p => !p.injury)
  if (res.length < 7) {
    // si el DT armó la reserva y no alcanza, se le avisa (si no marcó a nadie, no usa la reserva y no hace falta)
    if (marked.length) {
      const hurt = marked.length - res.length
      news(g, { tag: 'partido', clubId: c.id, me: true, act: 'reserve', title: 'Reserva: no hubo partido', body: `La reserva de ${c.short} no jugó esta semana: hacen falta al menos siete futbolistas del plantel marcados para la reserva y sanos, y había ${res.length}${hurt ? ` (${hurt} ${hurt === 1 ? 'está lesionado' : 'están lesionados'})` : ''}. Podés anotar más desde este mensaje.` })
    }
    return
  }
  for (const p of res) {
    addProgress(p, 0.18 * (ageOn(p.birth, g.date) <= 21 ? 1 : 0.4)) // hasta su potencial
    if (p.status === 'young' || p.status === 'sub') p.happy = clamp((p.happy ?? 60) + 3, 0, 100)
    p.cond = Math.max(70, p.cond - 6)
  }
  const opp = rng.pick(Object.values(g.clubs).filter(x => x.division === c.division && x.id !== c.id))
  const gf = rng.int(0, 3), ga = rng.int(0, 3), star = rng.pick(res)
  news(g, { tag: 'partido', clubId: c.id, title: `Reserva: ${c.short} ${gf}-${ga} ${opp.short}`, body: `La reserva ${gf > ga ? 'le ganó' : gf < ga ? 'perdió' : 'empató'} ${gf}-${ga} ${gf < ga ? 'con' : 'a'} ${opp.name}. Se destacó ${star.name}. Jugaron ${res.length} futbolistas del plantel profesional.` })
}

// ---------- armonía del vestuario ----------
/**
 * Términos de la armonía en enteros, para "Qué la mueve": `base` (conformidad promedio × 0,7 + 18, con el resto del redondeo), `lead`
 * (referentes, redondeado), `unhappy` (−3 por disconforme), `temper` (−3 por disconforme con temperamento 14 o más) y `clip` (lo que recorta
 * la escala 0-100; casi siempre 0). Siempre `base + lead + unhappy + temper + clip === value`.
 */
export interface HarmonyParts { base: number; lead: number; unhappy: number; temper: number; clip: number }
export function harmony(g: Game) {
  const sq = squadOf(g, g.userClubId)
  const leaders = [...sq].filter(p => !p.injury).sort((a, b) => (b.attrs[A.lea] * 2 + ageOn(b.birth, g.date) * 0.4 + STATUS[b.status ?? 'sub'].lvl * 2) - (a.attrs[A.lea] * 2 + ageOn(a.birth, g.date) * 0.4 + STATUS[a.status ?? 'sub'].lvl * 2)).slice(0, 3)
  const unhappy = sq.filter(p => (p.happy ?? 70) < 35 || p.wantsOut)
  const avgH = sq.reduce((s, p) => s + (p.happy ?? 70), 0) / Math.max(1, sq.length)
  const lead = leaders.reduce((s, p) => s + ((p.happy ?? 70) >= 50 ? (p.attrs[A.lea] - 10) * 1.2 : -(p.attrs[A.lea] - 8) * 1.5), 0)
  const hot = unhappy.filter(p => persOf(p).temp >= TEMP_HOT).length
  const raw = Math.round(avgH * 0.7 + 18 + lead - unhappy.length * 3 - hot * 3)
  const value = clamp(raw, 0, 100)
  const parts: HarmonyParts = { base: 0, lead: Math.round(lead), unhappy: -3 * unhappy.length || 0, temper: -3 * hot || 0, clip: value - raw }
  parts.base = raw - parts.lead - parts.unhappy - parts.temper
  return { value, leaders, unhappy, parts }
}
/** Efecto de la armonía sobre el rendimiento colectivo (alrededor de 1). */
export const harmonyBoost = (g: Game) => 1 + (harmony(g).value - 60) * 0.0006

// ---------- charlas individuales ----------
/**
 * Declara (o quita) transferible a un jugador del plantel. Un préstamo no se declara transferible. Declararlo con un pedido de salida abierto
 * lo resuelve (sus mensajes quedan leídos); quitarlo lo reabre con el mensaje ya leído. Devuelve si cambió algo.
 */
export function setListed(g: Game, pid: number, listed: boolean): boolean {
  const p = g.players[pid]
  if (p?.clubId !== g.userClubId || (listed && !canSell(p)) || !!p.listed === listed) return false
  p.listed = listed
  if (listed && p.wantsOut) readDecisionNews(g, `out${pid}`)
  return true
}
export function canTalk(g: Game, p: Player) { return !p.lastTalk || g.date >= addDays(p.lastTalk, 7) }
/** Desde qué día se puede volver a hablar con él. */
export const nextTalk = (p: Player) => (p.lastTalk ? addDays(p.lastTalk, 7) : '')
/** La forma reciente con la que lo juzga "Felicitarlo" (promedio de `p.form`, 6,5 sin partidos) y sus goles de la temporada. */
export function talkContext(_g: Game, p: Player): { form: number; goals: number } {
  return { form: p.form.length ? p.form.reduce((a, b) => a + b, 0) / p.form.length : 6.5, goals: p.stats.goals }
}
/** Efectos de "Decirle que puede buscar club": si lo pidió, lo agradece; si no, se ofende y pasa a querer irse. */
export const FREE_FX = { asked: { happy: 15, morale: 6 }, unasked: { happy: -20, morale: -12 } }

/** Una charla que no aplica a su situación no se muestra; una que aplica pero una regla bloquea, se muestra deshabilitada con el motivo. */
interface TalkCheck { shown: boolean; disabled?: string }
/** Condiciones de cada charla (tabla "Disponibilidad de las charlas" de `design/ux/vestuario.md`): las usan `talkOptions` y `talk`. */
function talkCheck(g: Game, p: Player, kind: TalkKind, falling: boolean): TalkCheck {
  const h = p.happy ?? 70, out = !!p.wantsOut, n = Math.floor(h)
  switch (kind) {
    case 'stay': return { shown: out }
    case 'promise':
      if (h >= 60 && !out && !falling) return { shown: false }
      if (p.promise) return { shown: true, disabled: `Ya tiene una promesa hasta el ${fmtDay(p.promise.until)}.` }
      if (h >= 60 && !out) return { shown: true, disabled: `Todavía está contento (conformidad ${n}): podés prometerle cuando baje de 60.` }
      return { shown: true }
    case 'patience':
      if (h >= 60 && !out && !falling) return { shown: false }
      if (h >= 60) return { shown: true, disabled: `Todavía está contento (conformidad ${n}): pedirle paciencia sirve cuando baje de 60.` }
      return { shown: true }
    case 'free':
      if (!canSell(p)) return { shown: true, disabled: 'Está a préstamo: no se lo puede declarar transferible.' }
      if (p.listed) return { shown: true, disabled: 'Ya está declarado transferible.' }
      return { shown: true }
    default: return { shown: true }
  }
}

const TALK_TITLE: Record<TalkKind, string> = {
  stay: 'Decirle que no se va', promise: 'Prometerle más minutos', patience: 'Pedirle paciencia', status: 'Cambiarle el rol',
  free: 'Decirle que puede buscar club', praise: 'Felicitarlo', demand: 'Exigirle más',
}
/** La regla de cada charla en palabras, con la banda que decide y sin veredicto (pregunta 3). */
const TALK_RULE: Record<TalkKind, string> = {
  stay: 'Acepta de buena gana si es leal o muy leal; si no, se queda de mala gana y puede volver a pedirlo.',
  promise: 'Lo deja conforme ya y deja de pedir irse; si al vencer el plazo no jugó lo prometido, se siente engañado.',
  patience: 'Convence a los leales y muy leales, y a los de ambición baja; a los demás no les convence.',
  status: 'Subirle el rol lo pone contento, pero si no le das esos minutos se va a molestar más rápido. Bajarle el rol lo molesta: más si es ambicioso o temperamental.',
  free: 'Queda transferible y, con el libro abierto, los clubes van a ofertar. Si no lo pidió, se ofende y pasa a querer irse.',
  praise: 'Lo agradece si viene jugando bien (promedio 6,9 o más, o 3 goles); si no, lo toma mal.',
  demand: 'Lo toman bien los profesionales; si no es profesional, se enojan los temperamentales; los demás lo escuchan sin entusiasmo.',
}
/** Rasgos que deciden la respuesta, en el orden en que la regla los nombra. */
const TALK_TRAITS: Partial<Record<TalkKind, TraitKey[]>> = { stay: ['loy'], patience: ['loy', 'amb'], status: ['amb', 'temp'], demand: ['prof', 'temp'] }
/** Orden de las opciones según el motivo principal de "Para atender" (las deshabilitadas mantienen su lugar). */
const TALK_ORDER: Record<ReasonKind | 'none', TalkKind[]> = {
  out: ['stay', 'promise', 'status', 'free', 'patience', 'praise', 'demand'],
  outListed: ['stay', 'promise', 'status', 'free', 'patience', 'praise', 'demand'],
  promiseRisk: ['patience', 'status', 'promise', 'praise', 'demand', 'free', 'stay'],
  upset: ['promise', 'patience', 'status', 'praise', 'demand', 'free', 'stay'],
  falling: ['status', 'promise', 'patience', 'praise', 'demand', 'free', 'stay'],
  leader: ['promise', 'patience', 'status', 'praise', 'demand', 'free', 'stay'],
  promiseOk: ['praise', 'demand', 'status', 'promise', 'patience', 'free', 'stay'],
  none: ['praise', 'demand', 'status', 'promise', 'patience', 'free', 'stay'],
}
export interface TalkOption {
  kind: TalkKind
  title: string
  /** La regla en palabras (sin veredicto). */
  rule: string
  /** El rasgo que decide (el primero de `traits`), con su palabra de `persTraits`. */
  trait?: { key: TraitKey; word: string; text: string }
  /** Todos los rasgos que nombra la regla ("Pedirle paciencia": lealtad y ambición; "Exigirle más": profesionalismo y temperamento). */
  traits: { key: TraitKey; word: string; text: string }[]
  shown: boolean
  disabled?: string
  /** Pide confirmación (F6): prometer, cambiar el rol, dejarlo buscar club. */
  cost: boolean
  /**
   * Datos de la opción: prometer, el objetivo, el umbral, el plazo y los partidos del club en ese plazo; cambiar el rol, lo que espera cada rol
   * y lo que juega hoy; felicitar, la forma y los goles (`talkContext`).
   */
  extra?: { target?: number; pass?: number; until?: string; matches?: number; expected?: Record<SquadStatus, number>; got?: number; form?: number; goals?: number }
  /** En `free`: la comparación con "Declararlo transferible". */
  letGo?: LetGoInfo
}
/** Partidos del club del DT sin jugar desde hoy hasta el día anterior a `until` (el del día `until` se juega después de evaluar la promesa). */
const userMatchesBefore = (g: Game, until: string) => g.fixtures.filter(f => !f.played && f.date >= g.date && f.date < until && (f.home === g.userClubId || f.away === g.userClubId)).length
/** Las opciones de la charla, ya ordenadas, con qué se muestra, qué se deshabilita y por qué (la misma regla que valida `talk`). */
export function talkOptions(g: Game, p: Player): TalkOption[] {
  const rs = reasonsOf(g, p), falling = rs.some(r => r.k === 'falling'), order = TALK_ORDER[rs[0]?.k ?? 'none']
  const status = statusOf(g, p), target = Math.min(0.9, STATUS[status].share + 0.22), until = addDays(g.date, 35)
  return order.map(kind => {
    const c = talkCheck(g, p, kind, falling)
    const traits = (TALK_TRAITS[kind] ?? []).map(k => traitOfP(p, k)).filter((t): t is Trait => !!t).map(t => ({ key: t.key, word: t.word, text: t.text }))
    const o: TalkOption = { kind, title: TALK_TITLE[kind], rule: TALK_RULE[kind], traits, shown: c.shown, cost: kind === 'promise' || kind === 'status' || kind === 'free' }
    if (traits[0]) o.trait = traits[0]
    if (c.disabled) o.disabled = c.disabled
    if (kind === 'promise') o.extra = { target, pass: target * 0.85, until, matches: userMatchesBefore(g, until) }
    if (kind === 'status') o.extra = { expected: Object.fromEntries(STATUS_KEYS.map(k => [k, STATUS[k].share])) as Record<SquadStatus, number>, got: share(p) }
    if (kind === 'praise') o.extra = talkContext(g, p)
    if (kind === 'free') o.letGo = letGoInfo(g, p)
    return o
  })
}

export interface TalkResult {
  /** La respuesta del jugador (o por qué no hubo charla). */
  text: string
  before?: { happy: number; morale: number }
  /** Sin `after`: no hubo charla (ya hablaron, opción oculta o deshabilitada, rol igual). */
  after?: { happy: number; morale: number }
  /** Cambios de estado: "Ya no pide irse", "Minutos prometidos hasta el 20 dic", "Quedó transferible", "Nuevo rol: Titular", "Pasa a querer irse". */
  changes: string[]
  reply?: TalkReply
  /** La charla resolvió el pedido de salida `out<pid>` (sus mensajes quedaron leídos). */
  resolved?: 'out'
}
/**
 * Aplica una charla. Una por semana con cada jugador: si ya hablaron, no hace nada y lo dice. Valida con las mismas condiciones que
 * `talkOptions`: una opción oculta o deshabilitada no hace nada. Escribe `p.talks`, `p.moodNote` (si lo dejó peor), `p.promiseLog` (al
 * prometer) y `p.outDate`; si resuelve el pedido de salida, marca leídos sus mensajes.
 */
export function talkResult(g: Game, p: Player, kind: TalkKind, newStatus?: SquadStatus): TalkResult {
  const none = (text: string): TalkResult => ({ text, changes: [] })
  if (p.clubId !== g.userClubId) return none('')
  if (!canTalk(g, p)) return none('Ya hablaste con él esta semana. Dale unos días antes de volver a sentarte a charlar.')
  if (kind === 'status' && (!newStatus || newStatus === p.status)) return none('Elegí un rol distinto del que tiene.')
  const chk = talkCheck(g, p, kind, fallingOf(p, minutesOf(g, p)))
  if (!chk.shown) return none('Esa charla no tiene sentido ahora.')
  if (chk.disabled) return none(chk.disabled)
  const q = persOf(p), { form, goals } = talkContext(g, p)
  const was = { out: !!p.wantsOut, listed: !!p.listed, status: p.status, promise: p.promise }
  const before = { happy: p.happy ?? 60, morale: p.morale }
  p.lastTalk = g.date
  const mh = (d: number) => { p.happy = clamp((p.happy ?? 60) + d, 0, 100) }, mm = (d: number) => { p.morale = clamp(p.morale + d, 5, 100) }
  let text = '', reply: TalkReply = 'Le convenció'
  switch (kind) {
    case 'praise':
      if (form >= 6.9 || goals >= 3) { mm(7); text = 'Se lo nota agradecido: "Gracias, profe. Voy a seguir así."' }
      else { mm(-2); reply = 'No le convenció'; text = 'Te mira raro: "¿En serio? Sé que no estoy jugando bien."' }
      break
    case 'demand':
      if (p.prof >= 14) { mm(2); addProgress(p, 0.25); text = '"Tiene razón. Voy a meterle más en las prácticas."' }
      else if (q.temp >= 14) { mm(-8); mh(-6); reply = 'Lo tomó mal'; text = 'Se va enojado: "No me parece justo, dejo todo en cada práctica."' }
      else { mm(-2); reply = 'No le convenció'; text = 'Lo escucha sin mucho entusiasmo: "Está bien."' }
      break
    case 'promise':
      p.promise = { until: addDays(g.date, 35), share: Math.min(0.9, STATUS[p.status ?? 'sub'].share + 0.22), mins: [] }
      mh(18); mm(5); p.wantsOut = false
      logPromise(p, { made: g.date, until: p.promise.until, target: p.promise.share })
      text = `"Le tomo la palabra." Le prometiste más minutos durante las próximas cinco semanas: si no cumplís, se va a sentir engañado.`
      break
    case 'patience':
      if (q.loy >= 13 || q.amb <= 8) { mh(10); text = '"Lo entiendo. Voy a esperar mi oportunidad."' }
      else { mh(-6); mm(-3); reply = 'No le convenció'; text = 'No le convence: "Ya esperé bastante."' }
      break
    case 'status': {
      const up = STATUS[newStatus!].lvl - STATUS[p.status ?? 'sub'].lvl
      p.status = newStatus
      if (up > 0) { mh(16); mm(6); p.wantsOut = false; text = `Está contento con su nuevo rol: ${STATUS[newStatus!].name.toLowerCase()}. Ahora espera jugar en consecuencia.` }
      else { mh(-12 - (q.amb - 10)); mm(-6 - (q.temp - 10) * 0.4); reply = 'Lo tomó mal'; text = `No le gustó nada pasar a ser ${STATUS[newStatus!].name.toLowerCase()}.` }
      break
    }
    case 'free':
      p.listed = true
      if (p.wantsOut) { mh(FREE_FX.asked.happy); mm(FREE_FX.asked.morale); text = `"Gracias por entenderme." ${freeOfferText(g)}` }
      else { mh(FREE_FX.unasked.happy); mm(FREE_FX.unasked.morale); p.wantsOut = true; p.outDate = g.date; reply = 'Lo tomó mal'; text = 'Se sorprende y se ofende: "Si no me quieren, me voy." Quedó como transferible.' }
      break
    case 'stay':
      p.wantsOut = false
      if (q.loy >= LOY_STAY) { mh(8); text = '"Está bien, me quedo y peleo el puesto."' }
      else { mh(-10); mm(-8); reply = 'No le convenció'; text = 'Acepta quedarse, pero de mala gana. Puede volver a pedirlo.' }
      break
  }
  const after = { happy: p.happy ?? 60, morale: p.morale }
  // registro, causa del humor y pedido de salida
  p.talks = [...(p.talks ?? []), { date: g.date, kind, reply }].slice(-5)
  if (after.happy < before.happy) p.moodNote = { date: g.date, kind: kind === 'status' ? 'demoted' : kind === 'free' ? 'freed' : 'talk' }
  else if (after.happy > before.happy && p.moodNote) p.moodNote = undefined
  const changes: string[] = []
  if (was.out && !p.wantsOut) { changes.push('Ya no pide irse'); p.outDate = undefined }
  if (!was.out && p.wantsOut) changes.push('Pasa a querer irse')
  if (p.promise && p.promise !== was.promise) changes.push(`Minutos prometidos hasta el ${fmtDay(p.promise.until)}`)
  if (!was.listed && p.listed) changes.push('Quedó transferible')
  if (p.status !== was.status) changes.push(`Nuevo rol: ${STATUS[p.status!].name}`)
  const res: TalkResult = { text, before, after, changes, reply }
  // resolver el pedido de salida a propósito marca leídos sus mensajes (no decir nada sobre él, como felicitarlo, no lo resuelve)
  if (was.out && (!p.wantsOut || p.listed)) { readDecisionNews(g, `out${p.id}`); if (!was.listed) res.resolved = 'out' }
  return res
}
/** Compatibilidad: la charla como texto (la interfaz de antes). La nueva usa `talkResult`. */
export function talk(g: Game, p: Player, kind: TalkKind, newStatus?: SquadStatus): string { return talkResult(g, p, kind, newStatus).text }
/** Lo que dice "Decirle que puede buscar club" a quien lo pidió, según el libro de pases (pregunta 50). */
function freeOfferText(g: Game): string {
  const ws = windowState(g.date)
  if (ws.open) return 'Quedó como transferible: los clubes interesados van a empezar a ofertar.'
  if (!ws.nextSeason) return `Quedó como transferible: las ofertas van a llegar cuando reabra el libro, el ${fmtDay(ws.opensOn!)}.`
  return 'Quedó como transferible, pero con el libro cerrado no van a llegar ofertas esta temporada.'
}

/**
 * Estado de la charla, un texto para todas las vistas (pregunta 42): `long` "Hablaron el 12 nov · de nuevo desde el 19 nov" ("Hablaron hoy · …"),
 * `withReply` el mismo con la respuesta corta ("Hablaron el 12 nov (no le convenció) · …", para la `LockerCard`), `short` "desde el 19 nov".
 * Con la charla disponible, "Disponible".
 */
export function talkState(g: Game, p: Player): { can: boolean; last?: string; next?: string; reply?: TalkReply; long: string; withReply: string; short: string } {
  const can = canTalk(g, p)
  if (!p.lastTalk) return { can, long: 'Disponible', withReply: 'Disponible', short: 'Disponible' }
  const last = p.lastTalk, next = nextTalk(p), t = p.talks?.[p.talks.length - 1], reply = t?.date === last ? t.reply : undefined
  if (can) return { can, last, next, ...(reply ? { reply } : {}), long: 'Disponible', withReply: 'Disponible', short: 'Disponible' }
  const when = last === g.date ? 'Hablaron hoy' : `Hablaron el ${fmtDay(last)}`, tail = ` · de nuevo desde el ${fmtDay(next)}`
  return { can, last, next, ...(reply ? { reply } : {}), long: when + tail, withReply: `${when}${reply ? ` (${reply.toLowerCase()})` : ''}${tail}`, short: `desde el ${fmtDay(next)}` }
}

export interface LetGoInfo {
  /** "Declararlo transferible": no cambia el humor, no gasta la charla; si quería irse, sigue queriendo. */
  list: { happy: number; morale: number; spendsTalk: false; staysOut: boolean }
  /** "Decirle que puede buscar club" (charla): +15/+6 si lo pidió; si no, −20/−12 y pasa a querer irse. `from`: la próxima charla, si ya se usó. */
  talk: { happy: number; morale: number; spendsTalk: true; becomesOut: boolean; from?: string }
  /** Chance diaria de una oferta por él, con el libro abierto: hoy (5 % si quiere irse, 0 si no) y transferible (12 %). */
  offerChance: { now: number; listed: number }
  /** El libro de pases (`windowState`): con `nextSeason`, la lista se vacía antes de que reabra. Con el libro cerrado no llegan ofertas. */
  window: WindowState
  /** El precio de transferible (×0,75) vale solo para los clubes que lo buscan para reforzar un puesto (`askingPrice`). */
  price: { factor: number; scope: 'refuerzo' }
}
/** Los dos caminos para dejarlo ir, con los números del motor (pregunta 5): la pantalla no promete nada que no esté acá. */
export function letGoInfo(g: Game, p: Player): LetGoInfo {
  const out = !!p.wantsOut, fx = out ? FREE_FX.asked : FREE_FX.unasked
  return {
    list: { happy: 0, morale: 0, spendsTalk: false, staysOut: out },
    talk: { ...fx, spendsTalk: true, becomesOut: !out, ...(canTalk(g, p) ? {} : { from: nextTalk(p) }) },
    offerChance: { now: out ? OFFER_CHANCE.out : 0, listed: OFFER_CHANCE.listed },
    window: windowState(g.date),
    price: { factor: LISTED_PRICE, scope: 'refuerzo' },
  }
}
/**
 * Acciones del pedido de salida (pregunta 8, sin charla extra): `primary` es la charla si se puede hablar; si no, declararlo transferible si se
 * puede; si no, nada. `note` es el texto visible (vacío con la charla disponible y sin préstamo).
 */
export function outActions(g: Game, p: Player): { talk: { ok: boolean; last?: string; next?: string }; list: { ok: boolean; why?: string }; primary: 'talk' | 'list' | null; note: string } {
  const ts = talkState(g, p), sell = canSell(p), loan = 'Está a préstamo: no se lo puede declarar transferible.'
  const list = { ok: sell && !p.listed, ...(!sell ? { why: loan } : p.listed ? { why: 'Ya está declarado transferible.' } : {}) }
  const note = ts.can ? (sell ? '' : loan)
    : !sell ? `${loan} Podés volver a hablarle desde el ${fmtDay(ts.next!)}. El pedido no vence.`
    : p.listed ? `${ts.long}.`
    : `${ts.long}. Mientras tanto, podés declararlo transferible: no gasta la charla, pero tampoco lo pone más contento.`
  return { talk: { ok: ts.can, ...(ts.last ? { last: ts.last, next: ts.next } : {}) }, list, primary: ts.can ? 'talk' : list.ok ? 'list' : null, note }
}

/** Desde cuándo quiere irse: `p.outDate` o, en partidas viejas, la fecha del mensaje `act: 'out'` más nuevo (sin ninguno, `undefined`). */
export function outDateOf(g: Game, p: Player): string | undefined {
  if (!p.wantsOut) return undefined
  return p.outDate ?? g.news.find(n => n.act === 'out' && n.pid === p.id)?.date
}

// ---------- lectura del humor y "Para atender" ----------
export interface PromiseStatus {
  target: number
  /** Cumple si juega al menos esto (85 % del objetivo). */
  pass: number
  /** Lo que lleva jugado desde la promesa (0 sin partidos). */
  got: number
  played: number
  until: string
  /** Partidos del club sin jugar desde hoy hasta el día anterior a `until`. */
  matchesLeft: number
  /** Minutos que le faltan para cumplir si se juegan todos esos partidos. */
  minutesNeeded: number
  /** Al ritmo de hoy, cumple (con menos de 2 partidos, todavía no se mide: verdadero). */
  onTrack: boolean
  /** Aunque juegue todo lo que queda, ¿llega? */
  reachable: boolean
  extended: boolean
  extendedOn?: string
}
/** Estado de la promesa vigente con sus números exactos (`null` sin promesa). */
export function promiseStatus(g: Game, p: Player): PromiseStatus | null {
  const pr = p.promise
  if (!pr) return null
  const played = pr.mins.length, sum = pr.mins.reduce((a, b) => a + b, 0), got = played ? sum / (played * 90) : 0, pass = pr.share * 0.85
  const matchesLeft = userMatchesBefore(g, pr.until)
  const minutesNeeded = Math.max(0, Math.ceil(pass * 90 * (played + matchesLeft) - sum - 1e-9))
  return {
    target: pr.share, pass, got, played, until: pr.until, matchesLeft, minutesNeeded,
    onTrack: played < 2 || got >= pass, reachable: minutesNeeded <= 90 * matchesLeft, extended: !!pr.ext, ...(pr.ext ? { extendedOn: pr.ext } : {}),
  }
}
/** Causa del humor: la última que no son los minutos (`p.moodNote`), o la de los minutos. Texto con mayúscula y punto final. */
export function moodCause(g: Game, p: Player): { kind: MoodNoteKind | 'minutes'; date?: string; text: string } {
  const n = p.moodNote
  if (n) {
    const d = fmtDay(n.date)
    const text = n.kind === 'broken' ? `Desde la promesa rota del ${d}.` : n.kind === 'demoted' ? `Desde que le bajaste el rol el ${d}.`
      : n.kind === 'freed' ? `Desde que le dijiste que podía buscar club, el ${d}.` : `Desde la charla del ${d}, que tomó mal.`
    return { kind: n.kind, date: n.date, text }
  }
  return { kind: 'minutes', text: `Juega ${pct(share(p))} % y espera ${pct(STATUS[statusOf(g, p)].share)} %.` }
}
export type ReasonKind = 'out' | 'outListed' | 'promiseRisk' | 'upset' | 'falling' | 'leader' | 'promiseOk'
/** Un motivo de "Para atender" (tabla "Motivos" de `design/ux/vestuario.md`). `decide`: es el pendiente `out<pid>` de la bandeja. */
export interface Reason { k: ReasonKind; rank: number; chip: string; cause: string; then: string; due?: string; decide?: boolean }
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
/** Motivos de un jugador propio, del de mayor rango (1) al de menor (6). */
export function reasonsOf(g: Game, p: Player, leaders?: Set<number>, ws: WindowState = windowState(g.date)): Reason[] {
  if (p.clubId !== g.userClubId) return []
  const h = p.happy ?? 70, m = minutesOf(g, p), ps = promiseStatus(g, p), out: Reason[] = []
  const lead = leaders ?? new Set(harmony(g).leaders.map(x => x.id))
  const mins = `juega ${pct(m.got)} % y espera ${pct(m.expected)} %`
  if (p.wantsOut && !p.listed) {
    const c = moodCause(g, p), cause = c.kind === 'freed' ? `Quiere irse ${lowerFirst(c.text)}` : `Quiere irse: ${mins}.`
    const then = ws.open ? 'Si no le respondés, resta armonía y, con el libro abierto, siguen llegando ofertas por él.'
      : `Si no le respondés, resta armonía; con el libro cerrado no llegan ofertas por él (${ws.nextSeason ? `reabre al comenzar la temporada ${ws.opensOn!.slice(0, 4)}, el ${fmtDay(ws.opensOn!)}` : `reabre el ${fmtDay(ws.opensOn!)}`}).`
    out.push({ k: 'out', rank: 1, chip: 'Quiere irse', cause, then, due: 'No vence.', decide: true })
  } else if (p.wantsOut) out.push({ k: 'outListed', rank: 1, chip: 'Quiere irse · transferible', cause: 'Está declarado transferible y quiere irse.', then: 'Sigue disconforme hasta que se vaya o lo convenzas: resta armonía.' })
  if (ps) {
    const head = `Le prometiste ${pct(ps.target)} % hasta el ${fmtDay(ps.until)}`
    if (!ps.onTrack) {
      const rest = !ps.reachable ? 'Ya no llega: aunque juegue todo, no cumplís.' : `Le faltan ${ps.minutesNeeded} minutos en ${ps.matchesLeft} ${ps.matchesLeft === 1 ? 'partido' : 'partidos'}.`
      out.push({ k: 'promiseRisk', rank: 2, chip: 'Promesa en riesgo', cause: `${head}: lleva ${pct(ps.got)} %. ${rest}`, then: `Si no juega más, el ${fmtDay(ps.until)} se siente engañado: pierde mucha conformidad y moral, el plantel lo nota y baja tu prestigio.` })
    }
  }
  if (h < 35) {
    const o = moodOutlook(g, p, m), c = moodCause(g, p)
    const then = m.idle ? `Resta armonía. Mientras no juegue por la ${m.idle === 'injury' ? 'lesión' : 'suspensión'}, su conformidad no cambia.`
      : `Pierde moral después de cada partido y resta armonía.${o.canAskOut ? ' Puede pedir irse después del próximo partido (cada semana, una chance en dos).' : ''}`
    out.push({ k: 'upset', rank: 3, chip: moodOf(h).word, cause: c.kind === 'minutes' ? `Juega ${pct(m.got)} % y espera ${pct(m.expected)} %.` : c.text, then })
  } else if (fallingOf(p, m)) {
    out.push({ k: 'falling', rank: 4, chip: 'En baja', cause: `Juega ${pct(m.got)} % y espera ${pct(m.expected)} %: se molesta por debajo de ${pct(m.threshold)} %.`, then: 'Si sigue jugando así, su conformidad baja después de cada partido.' })
  }
  if (lead.has(p.id) && h < 50) out.push({ k: 'leader', rank: 5, chip: 'Referente que resta', cause: `Es referente y no está contento (conformidad ${Math.floor(h)}).`, then: 'Mientras siga así, resta armonía en lugar de sumar.' })
  if (ps && ps.onTrack) {
    const cause = ps.played < 2 ? `Le prometiste ${pct(ps.target)} % hasta el ${fmtDay(ps.until)}. Todavía no jugó lo suficiente para medirla.` : `Le prometiste ${pct(ps.target)} % hasta el ${fmtDay(ps.until)}: lleva ${pct(ps.got)} %. Va bien.`
    out.push({ k: 'promiseOk', rank: 6, chip: 'Minutos prometidos', cause, then: 'Si sigue así, cumplís.' })
  }
  return out
}
/**
 * "Para atender": una fila por jugador con al menos un motivo (el principal es el de mayor rango; los demás van como chips secundarios), por
 * rango y, dentro de un rango, por conformidad de menor a mayor. Única fuente de la lista, de su número y de la línea del Inicio.
 */
export function attentionOf(g: Game): { pid: number; reasons: Reason[]; rank: number }[] {
  const hm = harmony(g), lead = new Set(hm.leaders.map(p => p.id)), ws = windowState(g.date)
  const rows = squadOf(g, g.userClubId).map(p => ({ pid: p.id, reasons: reasonsOf(g, p, lead, ws), h: p.happy ?? 70 })).filter(r => r.reasons.length)
  return rows.sort((a, b) => a.reasons[0].rank - b.reasons[0].rank || a.h - b.h).map(r => ({ pid: r.pid, reasons: r.reasons, rank: r.reasons[0].rank }))
}

// ---------- ojeo: lo que se sabe de un jugador ajeno ----------
export function knowOf(g: Game, p: Player): number {
  if (p.clubId === g.userClubId) return 100
  if (g.know[p.id] != null) return g.know[p.id]
  const c = g.clubs[p.clubId], same = c?.division === g.clubs[g.userClubId].division
  // lo que se sabe sin ojear: a los de tu categoría los ves seguido; a los de los clubes grandes y a los más caros
  // (su valor de mercado es público) los muestra la tele. Nunca mira su nivel real: el ancho del rango lo delataría.
  const fame = (p.value >= 4e6 ? 15 : p.value >= 1.5e6 ? 8 : 0) + Math.max(0, Math.round(((c?.rep ?? 0) - 72) * 0.6))
  return (same ? 35 : 20) + Math.min(25, fame)
}
/**
 * Rango de ancho ±w para un valor real v. No está centrado en v: se corre al azar hasta 0,8·w (fijo por jugador,
 * dato y ancho, así no cambia al volver a mirarlo y se vuelve a sortear cuando se lo conoce mejor). Siempre contiene v.
 */
export function rangeAround(pid: number, v: number, w: number, salt: number, lo = 1, hi = 20): [number, number] {
  if (w <= 0) return [v, v]
  const s = Math.round((hash01(pid * 131 + salt, w) * 2 - 1) * w * 0.8)
  return [clamp(v - w + s, lo, hi), clamp(v + w + s, lo, hi)]
}
/** Ancho del rango para lo que se conoce de un jugador (0 si se lo conoce del todo). */
export const knowWidth = (g: Game, p: Player, maxW: number) => Math.round(((100 - knowOf(g, p)) / 100) * maxW)
/** Rango que se muestra para un valor, según cuánto se conoce al jugador. Siempre contiene el valor real. */
export function shown(g: Game, p: Player, v: number, maxW: number, salt: number, lo = 1, hi = 20): [number, number] {
  return rangeAround(p.id, v, knowWidth(g, p, maxW), salt, lo, hi)
}
/** La valoración que conoce el DT (exacta si lo conoce, si no el punto medio del rango): para ordenar y filtrar sin revelar. */
export function knownRating(g: Game, p: Player): number {
  const r = shown(g, p, Math.round(bestRating(p)), 9, 99, 1, 99)
  return (r[0] + r[1]) / 2
}
export const fmtRange = (r: [number, number]) => (r[0] === r[1] ? String(r[0]) : `${r[0]}–${r[1]}`)

/**
 * Potencial en palabras, como lo sabe el DT (ficha y panel del Mercado: el mismo texto en los dos lados). `null` si no lo sabe:
 * de un ajeno, hasta conocerlo al 70 %; de uno propio, con buen cuerpo técnico de inferiores y ayudante, o si ya pasó los 23.
 */
export function potentialText(g: Game, p: Player): string | null {
  const age = ageOn(p.birth, g.date), mine = p.clubId === g.userClubId
  const known = mine ? sab(g, 'youth') + sab(g, 'asst') >= 18 || age > 23 : knowOf(g, p) >= 70
  if (!known) return null
  return age > 26 ? 'Ya alcanzó su techo' : p.pa >= 85 ? 'Futura figura' : p.pa >= 78 ? 'Muy buen potencial' : p.pa - p.ca >= 8 ? 'Buen potencial' : 'Potencial limitado'
}

// ---------- sueldos de los ajenos como rango ----------
/** Escalones del medio ancho del rango de sueldo: 2 % cada 5 puntos de conocimiento (20 % → ±32 %, 35 % → ±26 %, 94 % → ±2 %), exacto desde 95 %. */
const WAGE_STEPS = 20
export const wageStep = (k: number) => (k >= 95 ? 0 : clamp(Math.round((100 - k) / 5), 1, WAGE_STEPS))
const wL = (i: number) => Math.log(1 - i * 0.02), wU = (i: number) => Math.log(1 + i * 0.02)
/** Corrimiento sorteado para el escalón i, en logaritmos: deja el valor real entre el 20 % y el 80 % del rango (no centrado). */
const wTarget = (pid: number, salt: number, i: number) => -(wU(i) + wL(i)) / 2 + (hash01(pid * 131 + salt, i) * 2 - 1) * 0.3 * (wU(i) - wL(i))
const roundOut = (x: number, up: boolean) => { const u = x < 10000 ? 100 : 1000; return (up ? Math.ceil(x / u) : Math.floor(x / u)) * u }
/**
 * Rango en US$ que se muestra para un sueldo de un jugador ajeno (el que cobra, `salt` 401, o el que pediría, 402). Exacto desde 95 % de
 * conocimiento o si es propio. Si no, `[v·(1−w)·e^a, v·(1+w)·e^a]` con `w` en escalones (`wageStep`): el cociente hi/lo es el mismo para todos
 * los jugadores con el mismo escalón y no dice nada de `v`. El corrimiento `a` es determinista y **anidado**: se arma del escalón más ancho al de
 * hoy y cada rango queda dentro del anterior, así cruzar los rangos de días distintos no achica la franja por debajo de la de hoy. Siempre
 * contiene `v`; los extremos se redondean hacia afuera (US$ 100 por debajo de 10 mil, US$ 1 mil desde ahí), lo que agranda el cociente a lo
 * sumo en `(hi + u) / (lo − u)`.
 */
export function wageShown(g: Game, p: Player, v: number, salt: number): [number, number] {
  const j = p.clubId === g.userClubId ? 0 : wageStep(knowOf(g, p))
  if (!j || v <= 0) return [v, v]
  let a = wTarget(p.id, salt, WAGE_STEPS)
  for (let i = WAGE_STEPS - 1; i >= j; i--) a = Math.min(a + wU(i + 1) - wU(i), -wL(i), Math.max(a + wL(i + 1) - wL(i), -wU(i), wTarget(p.id, salt, i)))
  const c = v * Math.exp(a)
  return [Math.min(v, roundOut(c * (1 - j * 0.02), false)), Math.max(v, roundOut(c * (1 + j * 0.02), true))]
}
/** Ritmo diario del ojeo (lo mismo que suma `dailySquad`, en promedio). */
export const scoutRate = (g: Game) => 3 + sab(g, 'scout') * 0.35
/** Días que faltan para conocer del todo a un jugador si se lo manda a ojear (0 si ya se lo conoce). */
export const scoutEta = (g: Game, p: Player) => (p.clubId === g.userClubId ? 0 : Math.ceil(Math.max(0, 100 - knowOf(g, p)) / scoutRate(g)))
export function scout(g: Game, p: Player) {
  if (p.clubId === g.userClubId || g.scouting.includes(p.id)) return
  g.scouting = [...g.scouting, p.id].slice(-10)
  if (!g.shortlist.includes(p.id)) g.shortlist = [...g.shortlist, p.id]
}
/** Agrega o saca a un jugador ajeno de la lista de seguimiento. Devuelve si quedó en seguimiento. */
export function toggleShortlist(g: Game, pid: number): boolean {
  const p = g.players[pid]
  if (g.shortlist.includes(pid)) { g.shortlist = g.shortlist.filter(x => x !== pid); return false }
  if (!p || p.clubId === g.userClubId) return false
  g.shortlist = [...g.shortlist, pid]
  return true
}
/** Ver jugar a un rival enseña algo de cada uno de sus titulares. */
export function learnFromMatch(g: Game, playerIds: number[]) {
  for (const id of playerIds) { const p = g.players[id]; if (p && p.clubId !== g.userClubId) g.know[id] = Math.min(100, knowOf(g, p) + 12) }
}

// ---------- negociación de contratos ----------
export type NegMode = 'buy' | 'renew'
export interface Demand { terms: Terms; patience: number }
/**
 * Lo que pide el representante. En una compra (`buy`, jugador ajeno) ningún término sale de la personalidad: el "estilo" del
 * representante es un margen fijo por jugador (`hash01(p.id, …)`), y la ambición solo decide la paciencia inicial (que se ve en
 * palabra y recién en la mesa). En una renovación (jugador propio, cuya personalidad se ve en la ficha) siguen la ambición y la lealtad.
 */
export function demand(g: Game, p: Player, mode: NegMode, status: SquadStatus): Demand {
  const q = persOf(p), dest = g.clubs[g.userClubId], age = ageOn(p.birth, g.date), neg = 1 - (g.manager.attrs.neg - 10) * 0.008
  const years = age <= 23 ? 4 : age <= 29 ? 3 : 2, patience = q.amb >= 15 ? 2 : 3
  if (mode === 'buy') {
    const base = Math.max(p.wage * 1.05, valuation(p, g.date).wage * (1 + (dest.rep - 60) / 180))
    const wage = Math.round((base * (0.8 + 0.4 * hash01(p.id, 23)) * STATUS[status].wage * neg) / 100) * 100
    return { terms: { wage, years, status, clause: 0, bonus: Math.round((wage * (2 + 2 * hash01(p.id, 17))) / 1000) * 1000 }, patience }
  }
  const base = Math.max(p.wage * 1.08, valuation(p, g.date).wage)
  const wage = Math.round((base * (1 + (q.amb - 10) * 0.022) * STATUS[status].wage * (1 - (q.loy - 10) * 0.012) * neg) / 100) * 100
  return { terms: { wage, years, status, clause: 0, bonus: Math.round((wage * (1 + q.amb / 5)) / 1000) * 1000 }, patience }
}
/** El sueldo que pediría un jugador ajeno: el mismo que pide el representante al sentarse (rol que pediría, negociación del DT). Una sola fuente. */
export const demandWage = (g: Game, p: Player) => demand(g, p, 'buy', naturalStatusFor(g, p)).terms.wage
/** Paciencia del representante en palabra (nunca el número). */
export const patienceWord = (n: number) => (n >= 3 ? 'mucha' : n === 2 ? 'media' : 'poca')
export interface NegResult { ok: boolean; walk?: boolean; msg: string; counter?: Terms }
/** Respuesta del representante a una oferta. En `buy` los términos de rol y de cláusula valen lo de ambición 10 y la pendiente de la contraoferta es un margen fijo por jugador. */
export function evalOffer(g: Game, p: Player, mode: NegMode, offer: Terms, dem: Demand): NegResult {
  const age = ageOn(p.birth, g.date), nat = naturalStatusFor(g, p), renew = mode === 'renew'
  const amb = renew ? persOf(p).amb : 10, want = dem.terms
  let score = offer.wage / want.wage
  score += (STATUS[offer.status].lvl - STATUS[nat].lvl) * (offer.status === nat ? 0 : STATUS[offer.status].lvl > STATUS[nat].lvl ? 0.04 : 0.1 + (amb - 10) * 0.01)
  score += age <= 23 ? (offer.years >= 3 ? 0.02 : -0.03) : age >= 30 ? (offer.years >= 2 ? 0.05 : -0.08) : 0
  score += Math.min(0.08, (offer.bonus / Math.max(1, want.bonus)) * 0.04)
  if (offer.clause > 0) score += offer.clause < p.value * 1.6 ? (amb - 8) * 0.006 : offer.clause > p.value * 4 ? -0.05 - (amb - 10) * 0.005 : 0
  else score += 0.02 + (amb - 10) * 0.004
  if (renew) score += (persOf(p).loy - 10) * 0.008 + ((p.happy ?? 60) - 50) * 0.002
  const club = g.clubs[g.userClubId], bill = squadOf(g, club.id).reduce((s, x) => s + (x.id === p.id ? 0 : x.wage), 0)
  if (bill + offer.wage > club.wageBudget) return { ok: false, msg: `Con este sueldo superás el tope salarial por US$ ${(bill + offer.wage - club.wageBudget).toLocaleString('es-AR')} (te quedan ${Math.max(0, club.wageBudget - bill).toLocaleString('es-AR')} por mes). Esto no gasta paciencia.` }
  if (mode === 'buy' && offer.bonus > club.balance) return { ok: false, msg: 'El club no tiene caja para pagar esa prima. Esto no gasta paciencia.' }
  if (score >= 0.985) return { ok: true, msg: '¡Hay acuerdo!' }
  dem.patience -= score < 0.85 ? 2 : 1
  if (dem.patience <= 0) return { ok: false, walk: true, msg: `El representante de ${p.name} da por terminada la negociación.` }
  const slope = renew ? 1.15 : 1 + 0.3 * hash01(p.id, 29)
  const need = Math.round((offer.wage * (1 + (0.985 - score) * slope)) / 100) * 100
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
  // renovar es una respuesta del DT a su pedido de salida: lo resuelve y marca leídos sus mensajes
  if (p.wantsOut) { readDecisionNews(g, `out${p.id}`); p.outDate = undefined }
  p.happy = clamp((p.happy ?? 60) + 15, 0, 100); p.morale = clamp(p.morale + 6, 5, 100); p.wantsOut = false
  news(g, { tag: 'club', clubId: c.id, pid: p.id, title: `${p.name} renovó con ${c.short}`, body: `${p.name} firmó su nuevo contrato hasta diciembre de ${p.contractEnd}${t.clause ? `, con una cláusula de rescisión de US$ ${t.clause.toLocaleString('es-AR')}` : ''}.` })
}
/** El representante se levanta de una renovación: no vuelve a sentarse por 30 días. La ventana ya lo mostró: la noticia nace leída. */
export function renewWalk(g: Game, pid: number) {
  const p = g.players[pid]
  if (!p || p.clubId !== g.userClubId) return
  p.negBlock = addDays(g.date, 30)
  news(g, { tag: 'club', clubId: p.clubId, pid, me: true, read: true, title: `Se cortó la renovación de ${p.name}`, body: `El representante de ${p.name} dio por terminada la negociación. No va a volver a sentarse a negociar hasta el ${fmtDay(p.negBlock)}.` })
}
