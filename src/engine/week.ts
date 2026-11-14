// La semana: cuerpo técnico, entrenamiento, informe del rival y conferencias de prensa.
import { APELLIDOS, NOMBRES, managerMarket } from './career'
import { weeklyAiTraining } from './ai'
import { addDays, autoPick, available, clubsIn, fmtDate, news, nextUserFixture, squadOf } from './game'
import { FORMATIONS, POS_LABEL, POS_LINE, POS_WEIGHTS, ageOn, posRating, rawRating } from './positions'
import { Rng, clamp } from './rng'
import { A, ATTR_LABEL, type Attr, type Club, type Fixture, type Game, type Player, type Press, type PressAnswer, type Staff, type StaffRole, type Tactic, type TrainFocus, type Training } from './types'

// ---------- cuerpo técnico ----------
export const staffWage = (ab: number) => Math.round((900 * 1.22 ** (ab - 8)) / 100) * 100
function makeStaff(g: Game, role: StaffRole, ability: number, clubId: number, rng: Rng): Staff {
  const ab = clamp(Math.round(ability), 3, 20)
  return { id: g.nextId++, name: `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)}`, role, ability: ab, wage: staffWage(ab), contractEnd: g.season + rng.int(1, 2), clubId, age: rng.int(31, 66) }
}
const ROLES: StaffRole[] = ['asst', 'fit', 'doc', 'scout', 'youth']
export function initStaff(g: Game, rng: Rng) {
  const c = g.clubs[g.userClubId]
  const base = 4 + c.rep * 0.12
  g.staff = ROLES.map(r => makeStaff(g, r, base + rng.gauss() * 2.2, c.id, rng))
  refreshPool(g, rng)
}
/** Mantiene una bolsa de profesionales libres para contratar. */
export function refreshPool(g: Game, rng: Rng) {
  g.staff = g.staff.filter(s => s.clubId !== 0 || rng.chance(0.6))
  for (const r of ROLES) {
    const free = g.staff.filter(s => s.clubId === 0 && s.role === r).length
    for (let i = free; i < 4; i++) g.staff.push(makeStaff(g, r, 6 + rng.next() * 12, 0, rng))
  }
}
export const staffOf = (g: Game, role: StaffRole) => g.staff.find(s => s.clubId === g.userClubId && s.role === role)
/** Habilidad del encargado de un área (un puesto vacante rinde como alguien muy flojo). */
export const sab = (g: Game, role: StaffRole) => staffOf(g, role)?.ability ?? 4
export function hireStaff(g: Game, id: number): string | null {
  const s = g.staff.find(x => x.id === id)
  if (!s || s.clubId !== 0) return 'Ese profesional ya no está disponible.'
  if (staffOf(g, s.role)) return 'Ese puesto ya está ocupado. Primero tenés que desvincular a quien lo ocupa.'
  const c = g.clubs[g.userClubId]
  if (c.balance < s.wage * 2) return 'El club no tiene caja para afrontar el contrato.'
  s.clubId = c.id; s.contractEnd = g.season + 2
  news(g, { tag: 'club', clubId: c.id, title: `${s.name} se suma al cuerpo técnico`, body: `${c.name} incorporó a ${s.name} para ocupar el puesto vacante. Firmó hasta diciembre de ${s.contractEnd}.` })
  return null
}
export function fireStaff(g: Game, id: number): string {
  const s = g.staff.find(x => x.id === id && x.clubId === g.userClubId)
  if (!s) return ''
  const c = g.clubs[g.userClubId], comp = s.wage * 3
  c.balance -= comp; c.ledger.wages += comp
  s.clubId = 0
  return `${s.name} dejó el club. La indemnización fue de US$ ${comp.toLocaleString('es-AR')}.`
}
export const staffBill = (g: Game) => g.staff.filter(s => s.clubId === g.userClubId).reduce((t, s) => t + s.wage, 0)

// ---------- entrenamiento ----------
export const FOCUS: { k: TrainFocus; name: string; help: string; attrs: Attr[] }[] = [
  { k: 'equil', name: 'Equilibrado', help: 'Cada jugador trabaja lo que más usa en su puesto.', attrs: [] },
  { k: 'tact', name: 'Táctico', help: 'El equipo asimila el sistema mucho más rápido. Mejora decisiones y ubicación.', attrs: ['dec', 'pos', 'vis', 'otb', 'wor'] },
  { k: 'fis', name: 'Físico', help: 'Recuperan mejor entre partidos y mejoran velocidad, resistencia y fuerza.', attrs: ['pac', 'acc', 'sta', 'str', 'jmp'] },
  { k: 'att', name: 'Ataque', help: 'Definición, regate y desmarque. Un plus ofensivo en el próximo partido.', attrs: ['fin', 'dri', 'fto', 'otb', 'lsh', 'cro'] },
  { k: 'def', name: 'Defensa', help: 'Marca, quite y juego aéreo. Un plus defensivo en el próximo partido.', attrs: ['tck', 'mar', 'pos', 'hea', 'agg'] },
  { k: 'sp', name: 'Pelota parada', help: 'Córners y tiros libres ensayados: más peligro con la pelota quieta.', attrs: ['set', 'hea', 'cro', 'jmp'] },
]
export const IND_FOCUS: { k: string; name: string; attrs: Attr[] }[] = [
  { k: '', name: 'Plan del equipo', attrs: [] },
  { k: 'fin', name: 'Definición', attrs: ['fin', 'com', 'otb', 'lsh'] },
  { k: 'cre', name: 'Creación', attrs: ['pas', 'vis', 'fto', 'dec'] },
  { k: 'dri', name: 'Desborde', attrs: ['dri', 'acc', 'cro', 'fto'] },
  { k: 'def', name: 'Marca', attrs: ['tck', 'mar', 'pos', 'hea'] },
  { k: 'fis', name: 'Físico', attrs: ['pac', 'acc', 'sta', 'str'] },
  { k: 'men', name: 'Mental', attrs: ['dec', 'com', 'wor', 'lea'] },
  { k: 'gk', name: 'Arquero', attrs: ['han', 'ref', 'one', 'aer', 'kic'] },
]
export const INTENSITY = [
  { name: 'Suave', help: 'Recuperan más rápido y casi no hay lesiones, pero mejoran poco.' },
  { name: 'Normal', help: 'Equilibrio entre carga y recuperación.' },
  { name: 'Intensa', help: 'Mejoran más rápido y el equipo asimila antes el sistema, pero llegan más cansados y hay más lesiones.' },
]
const TRAIN_INJ: [string, number, number][] = [['una sobrecarga muscular', 3, 7], ['una contractura', 5, 11], ['un esguince de tobillo', 10, 22], ['una distensión en el isquiotibial', 12, 26]]

/** Plan que arma el ayudante cuando el entrenamiento está delegado. */
export function assistantPlan(g: Game, daysToMatch: number): Training {
  const c = g.clubs[g.userClubId], t = g.training
  const xi = c.tactic.lineup.map(id => g.players[id]).filter(Boolean)
  const cond = xi.length ? xi.reduce((s, p) => s + p.cond, 0) / xi.length : 100
  const intensity = daysToMatch <= 1 || cond < 82 ? 0 : daysToMatch >= 5 && cond >= 92 ? 2 : 1
  const fam = c.famKey === c.tactic.formation ? c.fam : 40
  return { ...t, intensity, focus: fam < 72 ? 'tact' : daysToMatch <= 2 ? 'sp' : 'equil', restAfter: true }
}
export const docFactor = (g: Game) => clamp(1.15 - sab(g, 'doc') * 0.016, 0.82, 1.1)

/** Un día de práctica del club del usuario. */
export function dailyTraining(g: Game, rng: Rng, matchYesterday: boolean) {
  const t = g.training, c = g.clubs[g.userClubId], fit = sab(g, 'fit'), asst = sab(g, 'asst')
  t.week ??= { ups: [], inj: [] }
  const squad = squadOf(g, c.id)
  if (t.restAfter && matchYesterday) {
    for (const p of squad) if (!p.injury) p.cond = Math.min(100, p.cond + 6 + (fit - 10) * 0.3)
    return
  }
  const k = t.intensity
  // el sistema se asimila entrenándolo
  if (c.famKey !== c.tactic.formation) { c.famKey = c.tactic.formation; c.fam = Math.max(30, c.fam - 30) }
  c.fam = Math.min(100, c.fam + (0.35 + (t.focus === 'tact' ? 0.75 : 0)) * [0.7, 1, 1.25][k] * (0.75 + asst * 0.025))
  const focusAttrs = FOCUS.find(f => f.k === t.focus)!.attrs
  for (const p of squad) {
    if (p.injury) continue
    // la carga del día se nota al día siguiente: con práctica intensa nadie llega al 100 %
    const cap = [100, 97, 91][k] + (fit - 10) * 0.3 + (t.focus === 'fis' ? 1.5 : 0)
    p.cond = clamp(p.cond + [3, 0, -3.5][k] * (k === 2 ? 1.25 - fit * 0.025 : 1) + (fit - 10) * 0.25 + (t.focus === 'fis' ? 1.2 : 0), 20, Math.min(100, cap))
    const risk = 0.0007 * [0.4, 1, 2.3][k] * (1.3 - fit * 0.03) * (p.cond < 75 ? 1.7 : 1)
    if (rng.chance(risk)) {
      const [desc, a, b] = rng.pick(TRAIN_INJ)
      p.injury = { days: Math.max(1, Math.round(rng.int(a, b) * docFactor(g))), desc }
      t.week.inj.push(p.id)
      news(g, { tag: 'lesion', clubId: c.id, title: `${p.name} se lesionó en la práctica`, body: `${p.name} sufrió ${desc} durante el entrenamiento y estará afuera unos ${p.injury.days} días.` })
      continue
    }
    const age = ageOn(p.birth, g.date)
    const ageF = age <= 19 ? 1.8 : age <= 21 ? 1.5 : age <= 23 ? 1.15 : age <= 26 ? 0.6 : age <= 29 ? 0.3 : 0.1
    p.tx = (p.tx ?? 0) + 0.007 * [0.55, 1, 1.4][k] * ageF * (0.55 + p.prof / 20) * (0.85 + asst * 0.015) * (p.ca < p.pa ? 1 : 0.15)
    if (p.tx < 1) continue
    p.tx -= 1
    const pos = p.positions[0], w = POS_WEIGHTS[pos]
    const ind = IND_FOCUS.find(f => f.k === p.tfocus)?.attrs ?? []
    let pool = (ind.length ? ind : focusAttrs).map(a => A[a])
    if (!ind.length) pool = pool.filter(i => w[i] > 0)
    if (!pool.length) pool = w.map((_, i) => i).filter(i => w[i] > 0)
    const i = rng.weighted(pool, j => (21 - p.attrs[j]) * (1 + w[j]))
    if (p.attrs[i] >= 20) continue
    p.attrs[i]++
    p.ca = Math.round(rawRating(p.attrs, pos)); p.pa = Math.max(p.pa, p.ca)
    p.ups = (p.ups ?? 0) + 1
    t.week.ups.push({ pid: p.id, a: ATTR_LABEL[Object.keys(A)[i] as Attr] })
  }
}
/** Ventaja que da el foco de la semana en el próximo partido. */
export function trainEdge(g: Game): { att: number; def: number; sp: number } {
  const f = g.training.focus
  return { att: f === 'att' ? 1.02 : 1, def: f === 'def' ? 1.02 : 1, sp: f === 'sp' ? 1.18 : 1 }
}

// ---------- informe del rival ----------
export interface Report {
  opp: Club; formation: string; xi: { pid: number; pos: string; est: string }[]; style: string[]; form: string[]; gf: number; gc: number
  stars: { pid: number; est: string }[]; weak: string; threat: { pid: number; txt: string } | null; tips: { txt: string; patch: Partial<Tactic> }[]; accuracy: number
}
export function scoutReport(g: Game, f: Fixture): Report {
  const me = g.clubs[g.userClubId], opp = g.clubs[f.home === me.id ? f.away : f.home], t = opp.tactic
  const acc = Math.round((sab(g, 'scout') * 0.6 + sab(g, 'asst') * 0.4))
  const spread = acc >= 16 ? 0 : Math.round((20 - acc) / 2.5)
  const est = (v: number) => (spread ? `${Math.max(1, Math.round(v) - spread)}-${Math.min(99, Math.round(v) + spread)}` : String(Math.round(v)))
  const { lineup } = autoPick(g, opp.id, t.formation)
  const slots = FORMATIONS[t.formation]
  const xi = lineup.map((id, i) => ({ p: g.players[id], pos: slots[i].pos })).filter(x => x.p)
  const style: string[] = []
  style.push(t.mentality <= 1 ? 'Juega replegado y espera tu error.' : t.mentality >= 3 ? 'Sale a buscar el partido con mucha gente en ataque.' : 'Es un equipo equilibrado.')
  if (t.pressing === 2) style.push('Presiona alto la salida.'); else if (t.pressing === 0) style.push('No presiona: espera en su campo.')
  if (t.line === 2) style.push('Defiende con la línea adelantada.'); else if (t.line === 0) style.push('Defiende cerca de su arco.')
  style.push(t.passing === 2 ? 'Busca a sus delanteros con pelotazos.' : t.passing === 0 ? 'Sale jugando por abajo desde el arquero.' : 'Combina la salida corta y la larga.')
  if (t.finalThird === 2) style.push('Llega mucho por las bandas con centros.')
  if (t.finalThird === 3) style.push('Remata seguido de media distancia.')
  if (t.onWin === 1) style.push('Es peligroso de contragolpe.')
  const played = g.fixtures.filter(x => x.played && (x.home === opp.id || x.away === opp.id)).slice(-5)
  const form = played.map(x => { const d = (x.home === opp.id ? 1 : -1) * (x.hg - x.ag); return d > 0 ? 'G' : d < 0 ? 'P' : 'E' })
  const gf = played.reduce((s, x) => s + (x.home === opp.id ? x.hg : x.ag), 0) / Math.max(1, played.length)
  const gc = played.reduce((s, x) => s + (x.home === opp.id ? x.ag : x.hg), 0) / Math.max(1, played.length)
  const rated = xi.map(x => ({ ...x, r: posRating(x.p, x.pos) })).sort((a, b) => b.r - a.r)
  const stars = rated.slice(0, 3).map(x => ({ pid: x.p.id, est: est(x.r) }))
  const tips: Report['tips'] = []
  // punto débil: el defensor más flojo y su sector
  const defs = rated.filter(x => POS_LINE[x.pos] === 'DF')
  let weak = 'No se le ve un punto débil claro en la defensa.'
  if (defs.length) {
    const w = defs[defs.length - 1]
    const focus = w.pos === 'DR' ? 0 : w.pos === 'DL' ? 2 : 1
    const where = ['por tu izquierda', 'por el medio', 'por tu derecha'][focus]
    weak = `${w.p.name} (${POS_LABEL[w.pos]}) es el más flojo de su defensa${acc >= 10 ? `, con una valoración de ${est(w.r)}` : ''}. Conviene atacar ${where}.`
    tips.push({ txt: `Cargar el juego ${where}, sobre ${w.p.name}.`, patch: { focus } })
    const slow = defs.filter(x => x.pos === 'DC').sort((a, b) => (a.p.attrs[A.pac] + a.p.attrs[A.acc]) - (b.p.attrs[A.pac] + b.p.attrs[A.acc]))[0]
    const myFw = me.tactic.lineup.map(id => g.players[id]).filter(p => p && POS_LINE[p.positions[0]] === 'FW')
    const fast = myFw.sort((a, b) => (b.attrs[A.pac] + b.attrs[A.acc]) - (a.attrs[A.pac] + a.attrs[A.acc]))[0]
    if (slow && fast && fast.attrs[A.pac] + fast.attrs[A.acc] - slow.p.attrs[A.pac] - slow.p.attrs[A.acc] >= 5)
      tips.push({ txt: `${slow.p.name} es lento y ${fast.name} le gana en velocidad: pases filtrados a la espalda${t.line === 2 ? ', aprovechando su línea adelantada' : ''}.`, patch: { finalThird: 0, tempo: 2 } })
  }
  if (t.pressing === 2) tips.push({ txt: 'Como presiona alto, salir largo evita perder la pelota cerca de tu arco.', patch: { passing: 2 } })
  if (t.onWin === 1 && t.mentality >= 3) tips.push({ txt: 'Ataca con mucha gente y deja espacios: no te desarmes y salí rápido de contra.', patch: { onWin: 1, onLoss: 0 } })
  const mine = me.tactic.lineup.map((id, i) => (g.players[id] ? posRating(g.players[id], FORMATIONS[me.tactic.formation][i].pos) : 0))
  const myAvg = mine.reduce((a, b) => a + b, 0) / 11, opAvg = rated.reduce((a, x) => a + x.r, 0) / Math.max(1, rated.length)
  if (opAvg - myAvg > 4) tips.push({ txt: 'Son superiores en el papel: bloque bajo y salida rápida de contra.', patch: { mentality: 1, line: 0, onWin: 1 } })
  else if (myAvg - opAvg > 4) tips.push({ txt: 'Sos claramente superior: adelantá el equipo y presioná para jugar en su campo.', patch: { mentality: 3, pressing: 2 } })
  const thr = rated.filter(x => POS_LINE[x.pos] === 'FW' || x.pos === 'AMC')[0]
  const threat = thr ? { pid: thr.p.id, txt: `${thr.p.name} es su jugador más peligroso. Durante el partido podés ponerle marca personal desde la pestaña Rival.` } : null
  return { opp, formation: t.formation, xi: rated.map(x => ({ pid: x.p.id, pos: POS_LABEL[x.pos], est: est(x.r) })), style, form, gf, gc, stars, weak, threat, tips, accuracy: acc }
}

// ---------- conferencias de prensa ----------
const RIVAL_PAIRS = new Set(['BOC-RIV', 'IND-RAC', 'EDL-GLP', 'SLO-HUR', 'TAL-BEL', 'NOB-CEN', 'LAN-BAN', 'VEL-ARG', 'PLA-TIG', 'GEM-IRV', 'RIE-BAR', 'UNI-ATU', 'COL-PAT', 'FER-ALL', 'CHA-ATL', 'QUI-TEM', 'MOR-ALM', 'CHI-AMG'])
export const isDerby = (a: Club, b: Club) => RIVAL_PAIRS.has(`${a.code}-${b.code}`) || RIVAL_PAIRS.has(`${b.code}-${a.code}`)
function streak(g: Game, clubId: number): { win: number; winless: number } {
  const fx = g.fixtures.filter(f => f.played && (f.home === clubId || f.away === clubId)).reverse()
  let win = 0, winless = 0
  for (const f of fx) { const d = (f.home === clubId ? 1 : -1) * (f.hg - f.ag); if (d > 0) win++; else break }
  for (const f of fx) { const d = (f.home === clubId ? 1 : -1) * (f.hg - f.ag); if (d <= 0) winless++; else break }
  return { win, winless }
}
const A3 = (t: string, quote: string, e: Partial<PressAnswer> = {}): PressAnswer => ({ t, quote, ...e })
export function makePrePress(g: Game, f: Fixture): Press {
  const me = g.clubs[g.userClubId], opp = g.clubs[f.home === me.id ? f.away : f.home]
  const qs: Press['questions'] = []
  const st = streak(g, me.id)
  if (isDerby(me, opp)) qs.push({ q: `Se viene el clásico ante ${opp.short}. ¿Qué significa este partido para vos?`, opts: [
    A3('Es un partido más: son tres puntos.', 'Es un partido más, son tres puntos', {}),
    A3('Es el partido del año para nuestra gente.', 'Es el partido del año para nuestra gente', { morale: 3, board: 1, rep: 1 }),
    A3(`La presión la tiene ${opp.short}, no nosotros.`, `La presión la tiene ${opp.short}`, { morale: 2, rep: -1 })] })
  if (st.winless >= 3) qs.push({ q: `Llevan ${st.winless} partidos sin ganar. ¿Sentís que tu puesto corre riesgo?`, opts: [
    A3('La presión es parte de este trabajo.', 'La presión es parte de este trabajo', { board: 1 }),
    A3('Confío en el plantel: esto se da vuelta.', 'Confío en el plantel, esto se da vuelta', { morale: 3 }),
    A3('Los jugadores tienen que dar más.', 'Los jugadores tienen que dar más', { morale: -4, board: 2 })] })
  if (st.win >= 3) qs.push({ q: `Llevan ${st.win} victorias seguidas. ¿Hay que cuidarse del exceso de confianza?`, opts: [
    A3('Los pies sobre la tierra, esto recién empieza.', 'Los pies sobre la tierra', { morale: 1, board: 1 }),
    A3('Este equipo está para cosas grandes.', 'Este equipo está para cosas grandes', { morale: 3, rep: 1 }),
    A3('Todavía no ganamos nada.', 'Todavía no ganamos nada', { board: 1 })] })
  const gap = opp.rep - me.rep
  if (gap >= 8) qs.push({ q: `${opp.short} llega como favorito. ¿Firmás el empate?`, opts: [
    A3('No firmo nada: vamos a competir.', 'No firmo nada, vamos a competir', { morale: 3 }),
    A3('Sí, sería un buen resultado.', 'Un empate sería un buen resultado', { morale: -2, board: -1 }),
    A3('El favoritismo no juega.', 'El favoritismo no juega', { morale: 1 })] })
  else if (gap <= -8) qs.push({ q: `¿Es una obligación ganarle a ${opp.short}?`, opts: [
    A3('Todos los partidos son difíciles.', 'Todos los partidos son difíciles', { morale: 1 }),
    A3('Sí, tenemos que ganar.', 'Tenemos que ganar', { morale: 1, board: 1 }),
    A3('Si nos relajamos, perdemos con cualquiera.', 'Si nos relajamos perdemos con cualquiera', { morale: -1, board: 1 })] })
  const star = squadOf(g, me.id).filter(available).sort((a, b) => b.ca - a.ca)[f.id % 4]
  if (star && qs.length < 3 && f.id % 3 !== 0) qs.push({ q: `¿Cómo ves el momento de ${star.name}?`, pid: star.id, opts: [
    A3('Es fundamental para nosotros.', `${star.name.split(' ').slice(-1)[0]} es fundamental para nosotros`, { star: 6 }),
    A3('Es uno más dentro del plantel.', 'Acá nadie es más que nadie', { star: -3, morale: 1 }),
    A3('Le pido más: puede dar mucho más.', `A ${star.name.split(' ').slice(-1)[0]} le pido más`, { star: -5, board: 1 })] })
  if (qs.length < 3 && f.id % 2 === 0) qs.push({ q: `¿Qué te preocupa de ${opp.short}?`, opts: [
    A3('Nada en particular: depende de nosotros.', 'Depende de nosotros', { morale: 2 }),
    A3('Es un equipo muy bien trabajado.', `${opp.short} es un equipo muy bien trabajado`, { rep: 1 }),
    A3('Sus delanteros, hay que estar muy atentos.', 'Hay que estar muy atentos atrás', { morale: -1, board: 1 })] })
  if (qs.length < 3) qs.push({ q: `¿Cómo llega el equipo al partido con ${opp.short}?`, opts: [
    A3('Bien: trabajamos toda la semana para esto.', 'Trabajamos toda la semana para esto', { morale: 1 }),
    A3('Vamos a salir a ganar, no hay otra.', 'Vamos a salir a ganar, no hay otra', { morale: 2, board: 1 }),
    A3('Hay cosas para corregir, no estoy conforme.', 'Hay cosas para corregir', { morale: -2 })] })
  return { kind: 'pre', fixtureId: f.id, questions: qs.slice(0, 3) }
}
export function makePostPress(g: Game, f: Fixture): Press {
  const me = g.clubs[g.userClubId], us = f.home === me.id ? 0 : 1, opp = g.clubs[us === 0 ? f.away : f.home]
  const d = (us === 0 ? 1 : -1) * (f.hg - f.ag), won = f.pens ? f.pens[us] > f.pens[1 - us] : d > 0
  const qs: Press['questions'] = []
  if (won) qs.push({ q: `¿Cuál fue la clave de la victoria ante ${opp.short}?`, opts: [
    A3('El trabajo de todo el plantel.', 'Ganó el trabajo de todo el plantel', { morale: 2 }),
    A3('El planteo táctico funcionó.', 'El planteo funcionó', { morale: 1, rep: 1 }),
    A3('Ganamos, pero jugamos mal.', 'Ganamos, pero jugamos mal', { morale: -2, board: 1 })] })
  else if (d === 0 && !f.pens) qs.push({ q: `¿Cómo analizás el empate con ${opp.short}?`, opts: [
    A3('Merecimos ganarlo.', 'Merecimos ganarlo', { morale: 1 }),
    A3('Es un resultado justo.', 'Es un resultado justo', {}),
    A3('No me gustó lo que hizo el equipo.', 'No me gustó lo que hizo el equipo', { morale: -2, board: 1 })] })
  else qs.push({ q: `¿Qué le faltó al equipo ante ${opp.short}?`, opts: [
    A3('La responsabilidad es mía.', 'La responsabilidad es mía', { morale: 2, board: -1 }),
    A3('Los jugadores no estuvieron a la altura.', 'Los jugadores no estuvieron a la altura', { morale: -4, board: 1 }),
    A3('El arbitraje nos perjudicó.', 'El arbitraje nos perjudicó', { morale: 1, rep: -2, board: -1 })] })
  const best = f.lines?.filter(l => l.side === us).sort((a, b) => b.rating - a.rating)[0]
  if (best && best.rating >= 7.3 && g.players[best.pid]) {
    const n = g.players[best.pid].name
    qs.push({ q: `¿Qué te pareció el partido de ${n}?`, pid: best.pid, opts: [
      A3('Fue la figura, se lo merece.', `${n.split(' ').slice(-1)[0]} fue la figura`, { star: 6 }),
      A3('Hizo lo que tenía que hacer.', `${n.split(' ').slice(-1)[0]} hizo lo que tenía que hacer`, { star: 1, morale: 1 })] })
  }
  return { kind: 'post', fixtureId: f.id, questions: qs }
}
/** Aplica las respuestas elegidas (una por pregunta). */
export function answerPress(g: Game, picks: number[], delegated = false) {
  const pr = g.press
  if (!pr) return
  const me = g.clubs[g.userClubId], squad = squadOf(g, me.id)
  const quotes: string[] = []
  pr.questions.forEach((q, i) => {
    const a = q.opts[picks[i] ?? 0] ?? q.opts[0]
    quotes.push(a.quote)
    if (a.morale) for (const p of squad) p.morale = clamp(p.morale + a.morale, 5, 100)
    if (a.star && q.pid && g.players[q.pid]) g.players[q.pid].morale = clamp(g.players[q.pid].morale + a.star, 5, 100)
    if (a.board) g.board.confidence = clamp(g.board.confidence + a.board, 0, 100)
    if (a.rep) g.manager.rep = clamp(g.manager.rep + a.rep, 5, 99)
  })
  const who = delegated ? staffOf(g, 'asst')?.name ?? 'El ayudante de campo' : g.manager.name
  news(g, { tag: 'club', clubId: me.id, title: `${who}: "${quotes[0]}"`, body: `${delegated ? `${who} habló con la prensa en lugar de ${g.manager.name}` : `${g.manager.name} habló en conferencia de prensa`} ${pr.kind === 'pre' ? 'antes del partido' : 'después del partido'}. ${quotes.map(q => `"${q}."`).join(' ')}` })
  g.press = null
}
/** El ayudante responde con lo más prudente. */
export function delegatePress(g: Game) { if (g.press) answerPress(g, g.press.questions.map(() => 0), true) }

// ---------- eventos del día ----------
export function dayEvents(g: Game, rng: Rng) {
  const t = g.training
  const next = nextUserFixture(g)
  if (next) {
    const days = Math.round((Date.parse(next.date) - Date.parse(g.date)) / 86400000)
    if (g.delegate.training) g.training = { ...assistantPlan(g, days), week: t.week, reportFor: t.reportFor, pressFor: t.pressFor }
    const tt = g.training
    if (days <= 3 && tt.reportFor !== next.id) {
      tt.reportFor = next.id
      const r = scoutReport(g, next)
      news(g, { tag: 'club', clubId: r.opp.id, title: `Informe del rival: ${r.opp.name}`, body: `${staffOf(g, 'scout')?.name ?? 'El cuerpo técnico'} entregó el informe del próximo rival. ${r.style.slice(0, 2).join(' ')} ${r.weak} El informe completo está en la tarjeta del próximo partido.` })
    }
    if (days === 1 && tt.pressFor !== next.id && !g.press) {
      tt.pressFor = next.id
      g.press = makePrePress(g, next)
      if (g.delegate.press) delegatePress(g)
    }
  }
  if (new Date(g.date + 'T12:00:00Z').getUTCDay() === 1) {
    const w = g.training.week
    if (w && (w.ups.length || w.inj.length)) {
      const byP = new Map<number, string[]>()
      for (const u of w.ups) byP.set(u.pid, [...(byP.get(u.pid) ?? []), u.a])
      const ups = [...byP].filter(([pid]) => g.players[pid]).map(([pid, a]) => `${g.players[pid].name} (${a.join(', ')})`)
      news(g, { tag: 'club', clubId: g.userClubId, title: 'Informe semanal del entrenamiento', body: `${ups.length ? `Mejoraron en la semana: ${ups.join('; ')}.` : 'Nadie mostró mejoras puntuales esta semana.'} ${w.inj.length ? `Lesionados en la práctica: ${w.inj.filter(id => g.players[id]).map(id => g.players[id].name).join(', ')}.` : 'No hubo lesiones en los entrenamientos.'} Intensidad: ${INTENSITY[g.training.intensity].name.toLowerCase()}, foco ${FOCUS.find(f => f.k === g.training.focus)!.name.toLowerCase()}.` })
    }
    g.training.week = { ups: [], inj: [] }
    if (rng.chance(0.25)) refreshPool(g, rng)
    managerMarket(g, rng)
    weeklyAiTraining(g, rng)
  }
  // sueldos del cuerpo técnico
  const c = g.clubs[g.userClubId], bill = staffBill(g) / 30
  c.balance -= bill; c.ledger.wages += bill
}
export const daysTo = (g: Game, d: string) => Math.round((Date.parse(d) - Date.parse(g.date)) / 86400000)
export { addDays, fmtDate, clubsIn }
export type { Player }
