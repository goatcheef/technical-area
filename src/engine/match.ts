// Motor de partido: simulación minuto a minuto, controlable en vivo.
import { Rng, clamp } from './rng'
import { ASSIST_W, FORMATIONS, SHOOT_W, ZONE_W, at, posRating, POS_LINE } from './positions'
import type { Club, MatchEvent, MatchStats, Player, PlayerLine, Pos, Shot, Tactic } from './types'

interface OnPitch {
  p: Player; pos: Pos; cond: number; day: number; acc: number
  line: PlayerLine; yellow: boolean; enteredTick: number
}
interface Side {
  club: Club; tactic: Tactic; on: OnPitch[]; bench: number[]; off: OnPitch[]
  subs: number; goals: number; def: number; mid: number; att: number; gk: number; ai: boolean
}
export interface MatchOpts { knockout?: boolean; neutral?: boolean; seed: number; userSide?: 0 | 1 | null; importance?: number
  /** Multiplicadores del DT por lado: [ataque, defensa, medio] */
  boost?: [number, number, number][] }
export interface MatchResult {
  hg: number; ag: number; pens?: [number, number]; et: boolean
  stats: MatchStats; events: MatchEvent[]; lines: PlayerLine[]; shots: Shot[]
  injuries: { pid: number; days: number; desc: string }[]; motm: number; cond: Record<number, number>
}

const INJ = [
  ['un golpe en el tobillo', 3, 8], ['una contractura', 5, 12], ['un esguince de tobillo', 12, 28],
  ['un desgarro en el isquiotibial', 18, 40], ['una distensión en el aductor', 10, 24],
  ['una lesión en el hombro', 20, 45], ['un esguince de rodilla', 30, 70],
  ['una fractura en el pie', 60, 110], ['rotura de ligamentos cruzados', 180, 260],
] as const

export class MatchSim {
  rng: Rng
  sides: [Side, Side]
  stats: MatchStats
  events: MatchEvent[] = []
  shots: Shot[] = []
  /** Lo que pasó en el último minuto, para la cancha 2D. */
  frame: { poss: 0 | 1; shot: Shot | null } = { poss: 0, shot: null }
  injuries: MatchResult['injuries'] = []
  tick = 0
  ticks: number[] = []
  finished = false
  et = false
  pens?: [number, number]
  possTicks: [number, number] = [0, 0]
  private dirty = true
  private ht = 45

  constructor(home: Club, away: Club, public players: Record<number, Player>, public opts: MatchOpts) {
    this.rng = new Rng(opts.seed)
    const mk = (club: Club, i: number): Side => {
      const tactic: Tactic = JSON.parse(JSON.stringify(club.tactic))
      const slots = FORMATIONS[tactic.formation]
      const on = tactic.lineup.slice(0, 11).map((pid, k) => this.mkOn(players[pid], slots[k].pos, i as 0 | 1, true, 0))
      return { club, tactic, on, bench: [...tactic.bench], off: [], subs: 0, goals: 0, def: 1, mid: 1, att: 1, gk: 0.6, ai: opts.userSide !== i }
    }
    this.sides = [mk(home, 0), mk(away, 1)]
    const z = (): [number, number] => [0, 0]
    this.stats = { poss: [50, 50], shots: z(), sot: z(), xg: z(), passes: z(), passOk: z(), fouls: z(), corners: z(), offs: z(), yc: z(), rc: z() }
    const s1 = this.rng.int(1, 3), s2 = this.rng.int(2, 6)
    for (let m = 1; m <= 45; m++) this.ticks.push(m)
    for (let i = 0; i < s1; i++) this.ticks.push(45)
    this.ht = 45 + s1
    for (let m = 46; m <= 90; m++) this.ticks.push(m)
    for (let i = 0; i < s2; i++) this.ticks.push(90)
    this.ev(0, 'info', 0, `Comienza el partido en ${opts.neutral ? 'cancha neutral' : home.stadium}.`)
  }

  private mkOn(p: Player, pos: Pos, side: 0 | 1, started: boolean, tick: number): OnPitch {
    return {
      p, pos, cond: p.cond, day: 1 + this.rng.gauss() * 0.035, acc: 0, yellow: false, enteredTick: tick,
      line: { pid: p.id, side, started, mins: 0, rating: 6, goals: 0, ast: 0, shots: 0, sot: 0, saves: 0, yc: 0, rc: 0, pos },
    }
  }
  get minute(): number { return this.tick === 0 ? 0 : this.ticks[Math.min(this.tick, this.ticks.length) - 1] }
  private ev(min: number, type: MatchEvent['type'], side: 0 | 1, text: string, pid?: number, pid2?: number) {
    const e: MatchEvent = { min, type, side, text, pid, pid2 }
    this.events.push(e)
    return e
  }
  private nm(o: OnPitch) { return o.p.name }

  // ---------- fuerza de los equipos ----------
  private recompute() {
    for (let i = 0; i < 2; i++) {
      const s = this.sides[i], o = this.sides[1 - i], t = s.tactic
      let def = 0, mid = 0, att = 0, gk = 0.35, wide = 0
      for (const x of s.on) {
        const r = (posRating(x.p, x.pos) / 100) * (0.72 + 0.28 * x.cond / 100) * (0.95 + 0.1 * x.p.morale / 100) * x.day
        if (x.pos === 'GK') { gk = r; continue }
        const z = ZONE_W[x.pos]
        def += r * z[0]; mid += r * z[1]; att += r * z[2]
        if (['MR', 'ML', 'AMR', 'AML', 'DR', 'DL'].includes(x.pos)) wide++
      }
      const m = t.mentality - 2, pr = t.pressing - 1, ln = t.line - 1, wd = t.width - 1, ps = t.passing - 1
      att *= 1 + 0.07 * m; def *= 1 - 0.06 * m; mid *= 1 - 0.012 * Math.abs(m)
      mid *= 1 + 0.04 * pr; def *= 1 + 0.015 * pr
      if (pr > 0 && ln < 0) { def *= 0.96; mid *= 0.97 } // presión alta con línea baja: equipo partido
      const oppPace = avg(o.on.filter(x => POS_LINE[x.pos] === 'FW'), x => at(x.p, 'pac') + at(x.p, 'acc')) / 2
      const ownPace = avg(s.on.filter(x => POS_LINE[x.pos] === 'DF'), x => at(x.p, 'pac') + at(x.p, 'acc')) / 2
      mid *= 1 + 0.035 * ln; att *= 1 + 0.02 * ln
      def *= 1 - 0.03 * ln * (1 + clamp((oppPace - ownPace) / 5, -0.8, 1.5))
      att *= 1 + (wide >= 4 ? 0.025 : -0.03) * wd; def *= 1 - 0.02 * wd; mid *= 1 - 0.012 * wd
      mid *= 1 - 0.035 * ps; att *= 1 + 0.02 * ps
      // contraataque: equipo replegado y directo contra línea adelantada
      if (t.mentality <= 1 && t.passing === 2 && o.tactic.line === 2) att *= 1.1
      // tenencia: juego corto y ritmo lento desgasta menos y controla más
      if (t.passing === 0 && t.tempo === 0) mid *= 1.03
      if (i === 0 && !this.opts.neutral) { att *= 1.05; mid *= 1.045; def *= 1.03 }
      const b = this.opts.boost?.[i] ?? [1, 1, 1]
      s.def = (def / 4.9) * b[1]; s.mid = (mid / 4.5) * b[2]; s.att = (att / 4.5) * b[0]; s.gk = gk
    }
    this.dirty = false
  }

  // ---------- un minuto de juego ----------
  step(): MatchEvent[] {
    if (this.finished) return []
    const before = this.events.length
    if (this.dirty || this.tick % 5 === 0) this.recompute()
    this.tick++
    const min = this.minute
    if (this.tick === this.ht + 1) this.ev(45, 'info', 0, `Entretiempo: ${this.scoreText()}.`)
    const [h, a] = this.sides
    const k = 2.4
    const pH = clamp(h.mid ** k / (h.mid ** k + a.mid ** k), 0.24, 0.76)
    const ps = this.rng.chance(pH) ? 0 : 1
    this.frame = { poss: ps as 0 | 1, shot: null }
    const S = this.sides[ps], O = this.sides[1 - ps]
    this.possTicks[ps]++
    // pases
    const pasSkill = avg(S.on, x => at(x.p, 'pas') + at(x.p, 'fto')) / 2
    const tries = this.rng.int(6, 10) + S.tactic.tempo - (S.tactic.passing === 2 ? 2 : 0)
    const accP = clamp(0.7 + (pasSkill - 11) * 0.014 + (1 - S.tactic.passing) * 0.045 - (O.tactic.pressing - 1) * 0.03 - (S.tactic.tempo - 1) * 0.015, 0.5, 0.94)
    let ok = 0
    for (let i = 0; i < tries; i++) if (this.rng.chance(accP)) ok++
    this.stats.passes[ps] += tries; this.stats.passOk[ps] += ok

    const ratio = S.att / Math.max(0.2, O.def)
    const pShot = 0.272 * ratio ** 1.5 * (1 + 0.07 * (S.tactic.tempo - 1))
    if (this.rng.chance(clamp(pShot, 0.03, 0.6))) this.shot(ps as 0 | 1, min)
    else {
      if (this.rng.chance(0.045 * (1 + 0.35 * (O.tactic.line - 1)))) this.stats.offs[ps]++
      if (this.rng.chance(0.035)) this.stats.corners[ps]++
    }
    if (this.rng.chance(0.275)) this.foul(this.rng.chance(0.62) ? ((1 - ps) as 0 | 1) : (ps as 0 | 1), min)
    if (this.rng.chance(0.0034)) this.injury(this.rng.chance(0.5) ? 0 : 1, min)
    // cansancio
    for (const s of this.sides) for (const x of s.on) {
      const drop = (0.25 + 0.05 * s.tactic.pressing + 0.035 * s.tactic.tempo - (at(x.p, 'sta') - 10) * 0.011 + (at(x.p, 'wor') - 10) * 0.004) * (x.pos === 'GK' ? 0.25 : 1)
      x.cond = Math.max(15, x.cond - Math.max(0.08, drop))
      x.line.mins++
    }
    for (let i = 0; i < 2; i++) if (this.sides[i].ai) this.aiManage(i as 0 | 1, min)
    this.stats.poss = possPct(this.possTicks)
    if (this.tick >= this.ticks.length) this.periodEnd()
    return this.events.slice(before)
  }

  private scoreText() { return `${this.sides[0].club.short} ${this.sides[0].goals} - ${this.sides[1].goals} ${this.sides[1].club.short}` }

  private periodEnd() {
    const [h, a] = this.sides
    if (this.opts.knockout && h.goals === a.goals && !this.et) {
      this.et = true
      this.ev(90, 'info', 0, `Final de los 90 minutos: ${this.scoreText()}. Habrá tiempo suplementario.`)
      for (let m = 91; m <= 120; m++) this.ticks.push(m)
      return
    }
    if (this.opts.knockout && h.goals === a.goals) this.shootout()
    this.finished = true
    const last = this.et ? 120 : 90
    this.ev(last, 'info', 0, `Final del partido: ${this.scoreText()}${this.pens ? ` (${this.pens[0]}-${this.pens[1]} en los penales)` : ''}.`)
  }

  private shootout() {
    const sc: [number, number] = [0, 0]
    const takers = this.sides.map(s => [...s.on].filter(x => x.pos !== 'GK').sort((x, y) => (at(y.p, 'fin') + at(y.p, 'com')) - (at(x.p, 'fin') + at(x.p, 'com'))))
    const kick = (i: number, n: number) => {
      const t = takers[i][n % Math.max(1, takers[i].length)], gk = this.sides[1 - i].on.find(x => x.pos === 'GK')
      const p = 0.74 + ((t ? at(t.p, 'fin') + at(t.p, 'com') : 20) - 24) * 0.008 - ((gk ? at(gk.p, 'one') + at(gk.p, 'ref') : 16) - 24) * 0.006
      if (this.rng.chance(clamp(p, 0.45, 0.93))) sc[i]++
    }
    for (let n = 0; n < 5; n++) {
      kick(0, n); kick(1, n)
      const left = 4 - n
      if (sc[0] > sc[1] + left || sc[1] > sc[0] + left) break
    }
    let n = 5
    while (sc[0] === sc[1]) { kick(0, n); kick(1, n); n++ }
    this.pens = sc
    this.ev(120, 'info', sc[0] > sc[1] ? 0 : 1, `Definición por penales: ${this.sides[sc[0] > sc[1] ? 0 : 1].club.name} gana ${Math.max(...sc)}-${Math.min(...sc)}.`)
  }

  // ---------- remates ----------
  private shot(si: 0 | 1, min: number) {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng
    const outfield = S.on.filter(x => x.pos !== 'GK')
    if (!outfield.length) return
    const wd = S.tactic.width - 1
    const kinds: [string, number][] = [
      ['open', 0.6 - 0.04 * wd], ['long', 0.16 + (S.tactic.tempo === 2 ? 0.02 : 0)], ['head', 0.13 + 0.05 * wd],
      ['one', 0.045 * (1 + 0.5 * (O.tactic.line - 1)) * (S.tactic.passing === 2 ? 1.25 : 1)], ['fk', 0.04], ['pen', 0.012],
    ]
    const kind = r.weighted(kinds, k => k[1])[0]
    let sh: OnPitch, base: number, sk: number
    const byFin = (x: OnPitch) => SHOOT_W[x.pos] * (at(x.p, 'otb') + at(x.p, 'fin') + 6)
    if (kind === 'pen') {
      sh = best(outfield, x => at(x.p, 'fin') + at(x.p, 'com') + at(x.p, 'set') * 0.5); base = 0.77; sk = (at(sh.p, 'fin') + at(sh.p, 'com')) / 40
    } else if (kind === 'fk') {
      sh = best(outfield, x => at(x.p, 'set') * 2 + at(x.p, 'lsh')); base = 0.065; sk = (at(sh.p, 'set') * 2 + at(sh.p, 'lsh')) / 60
    } else if (kind === 'head') {
      sh = r.weighted(outfield, x => (SHOOT_W[x.pos] + (x.pos === 'DC' ? 0.45 : 0)) * (at(x.p, 'hea') + at(x.p, 'jmp'))); base = 0.085; sk = (at(sh.p, 'hea') * 2 + at(sh.p, 'jmp')) / 60
      if (r.chance(0.5)) this.stats.corners[si]++
    } else if (kind === 'long') {
      sh = r.weighted(outfield, x => (SHOOT_W[x.pos] + 0.25) * at(x.p, 'lsh')); base = 0.034; sk = at(sh.p, 'lsh') / 20
    } else if (kind === 'one') {
      sh = r.weighted(outfield, x => SHOOT_W[x.pos] * (at(x.p, 'pac') + at(x.p, 'otb'))); base = 0.27; sk = (at(sh.p, 'fin') + at(sh.p, 'com')) / 40
    } else {
      sh = r.weighted(outfield, byFin); base = 0.082; sk = (at(sh.p, 'fin') * 2 + at(sh.p, 'com') + at(sh.p, 'fto')) / 80
    }
    const xg = kind === 'pen' ? base : base * (0.55 + 0.9 * r.next())
    const pGoal = clamp(xg * (0.5 + 0.95 * sk) * (1.62 - 0.9 * O.gk) * sh.day, 0.008, 0.95)
    this.stats.shots[si]++; this.stats.xg[si] += xg
    sh.line.shots++
    const gk = O.on.find(x => x.pos === 'GK')
    const n = this.nm(sh), club = S.club.short
    const far = kind === 'long' ? 24 + r.next() * 10 : kind === 'fk' ? 20 + r.next() * 8 : kind === 'pen' ? 11 : 4 + r.next() * 12
    const log: Shot = { min, side: si, pid: sh.p.id, xg, out: 'off', x: kind === 'pen' ? 50 : clamp(50 + r.gauss() * 14, 12, 88), y: far }
    this.shots.push(log)
    this.frame.shot = log
    if (r.chance(pGoal)) {
      log.out = 'goal'
      this.stats.sot[si]++; sh.line.sot++; sh.line.goals++; sh.acc += 1.1; S.goals++
      let as: OnPitch | undefined
      if (kind !== 'pen' && kind !== 'fk' && r.chance(0.78)) {
        const cands = S.on.filter(x => x !== sh)
        if (cands.length) {
          as = r.weighted(cands, x => ASSIST_W[x.pos] * (at(x.p, 'pas') + at(x.p, 'vis') + (kind === 'head' ? at(x.p, 'cro') * 2 : 0)))
          as.line.ast++; as.acc += 0.8; log.ast = as.p.id
        }
      }
      for (const x of O.on) x.acc -= x.pos === 'GK' ? 0.35 : POS_LINE[x.pos] === 'DF' || x.pos === 'DM' ? 0.16 : 0.05
      for (const x of S.on) x.acc += 0.04
      const how: Record<string, string[]> = {
        open: [`define cruzado dentro del área`, `la empuja tras una gran jugada colectiva`, `saca un remate seco al primer palo`, `define con clase ante la salida del arquero`],
        long: [`clava un bombazo desde afuera del área`, `la cuelga del ángulo desde lejos`],
        head: [`gana de cabeza en el área y la manda a guardar`, `conecta un cabezazo imparable`],
        one: [`queda mano a mano y no perdona`, `pica al vacío, encara al arquero y define`],
        fk: [`mete un tiro libre perfecto por encima de la barrera`], pen: [`convierte el penal con un remate fuerte`],
      }
      this.ev(min, kind === 'pen' ? 'pen-goal' : 'goal', si, `¡GOL de ${club}! ${n} ${r.pick(how[kind])}${as ? `. Asistencia de ${this.nm(as)}` : ''}. ${this.scoreText()}.`, sh.p.id, as?.p.id)
      this.dirty = true
      return
    }
    const u = r.next()
    if (kind === 'pen') {
      log.out = u < 0.7 && gk ? 'saved' : 'off'
      if (u < 0.7 && gk) { gk.line.saves++; gk.acc += 0.6; this.stats.sot[si]++; sh.line.sot++ }
      sh.acc -= 0.5
      this.ev(min, 'pen-miss', si, u < 0.7 && gk ? `¡${this.nm(gk)} le ataja el penal a ${n}!` : `${n} desvía el penal.`, sh.p.id)
      return
    }
    if (u < 0.3) {
      log.out = 'saved'
      this.stats.sot[si]++; sh.line.sot++; sh.acc += 0.12
      if (gk) { gk.line.saves++; gk.acc += 0.2 + xg * 0.8 }
      if (r.chance(0.45)) this.stats.corners[si]++
      if (xg > 0.11 || r.chance(0.3)) this.ev(min, 'save', si, r.pick([
        `${n} remata y ${gk ? this.nm(gk) : 'el arquero'} responde con una gran atajada.`,
        `Tapadón de ${gk ? this.nm(gk) : 'el arquero'} ante el remate de ${n}.`,
        `${n} prueba al arco, controla ${gk ? this.nm(gk) : 'el arquero'}.`]), sh.p.id)
    } else if (u < 0.54) {
      log.out = 'block'
      if (r.chance(0.45)) this.stats.corners[si]++
      const d = O.on.filter(x => POS_LINE[x.pos] === 'DF')
      if (d.length) r.pick(d).acc += 0.1
    } else if (u < 0.575) {
      log.out = 'post'
      this.ev(min, 'post', si, `¡El palo! ${n} estuvo a centímetros del gol para ${club}.`, sh.p.id)
    } else {
      sh.acc -= 0.03
      if (xg > 0.16) this.ev(min, 'chance', si, `${n} desperdicia una ocasión clarísima para ${club}.`, sh.p.id)
    }
  }

  // ---------- faltas y tarjetas ----------
  private foul(si: 0 | 1, min: number) {
    const S = this.sides[si]
    const c = S.on.filter(x => x.pos !== 'GK')
    if (!c.length) return
    this.stats.fouls[si]++
    const f = this.rng.weighted(c, x => at(x.p, 'agg') + (20 - at(x.p, 'tck')) * 0.4 + ZONE_W[x.pos][0] * 8)
    const mod = [0.75, 1, 1.35][S.tactic.tackling] * (0.6 + at(f.p, 'agg') / 25)
    const u = this.rng.next()
    if (u < 0.0028 * mod) this.sendOff(si, f, min, false)
    else if (u < 0.178 * mod * (f.yellow ? 0.3 : 1)) {
      this.stats.yc[si]++; f.line.yc++; f.acc -= 0.25
      if (f.yellow) this.sendOff(si, f, min, true)
      else { f.yellow = true; this.ev(min, 'yc', si, `Amarilla para ${this.nm(f)} (${S.club.short}).`, f.p.id) }
    }
  }
  private sendOff(si: 0 | 1, f: OnPitch, min: number, second: boolean) {
    const S = this.sides[si]
    this.stats.rc[si]++; f.line.rc++; f.acc -= 1.6
    this.ev(min, second ? 'yc2' : 'rc', si, second ? `Segunda amarilla y expulsión para ${this.nm(f)}. ${S.club.short} se queda con ${S.on.length - 1}.` : `¡Roja directa para ${this.nm(f)}! ${S.club.short} se queda con ${S.on.length - 1}.`, f.p.id)
    this.remove(S, f)
    if (f.pos === 'GK') this.coverGk(si, min)
    this.dirty = true
  }
  private remove(S: Side, x: OnPitch) { S.on = S.on.filter(o => o !== x); S.off.push(x) }
  private coverGk(si: 0 | 1, min: number) {
    const S = this.sides[si]
    const gkId = S.bench.find(id => this.players[id].positions[0] === 'GK')
    const out = [...S.on].sort((a, b) => ZONE_W[b.pos][2] - ZONE_W[a.pos][2])[0]
    if (!out) return
    if (gkId && S.subs < 5) { this.doSub(si, out, gkId, min); S.on[S.on.length - 1].pos = 'GK'; S.on[S.on.length - 1].line.pos = 'GK' }
    else { out.pos = 'GK'; this.ev(min, 'info', si, `${this.nm(out)} se pone los guantes en ${S.club.short}.`) }
  }

  private injury(si: 0 | 1, min: number) {
    const S = this.sides[si]
    if (!S.on.length) return
    const x = this.rng.weighted(S.on, o => 130 - o.cond)
    if (this.rng.chance(0.45)) return // solo un golpe
    const [desc, a, b] = this.rng.weighted(INJ, i => 1 / Math.sqrt(i[1]))
    this.injuries.push({ pid: x.p.id, days: this.rng.int(a, b), desc })
    this.ev(min, 'inj', si, `${this.nm(x)} (${S.club.short}) queda tendido y no puede seguir.`, x.p.id)
    const inId = this.pickSub(S, x)
    if (inId != null && S.subs < 5) this.doSub(si, x, inId, min)
    else { this.remove(S, x); if (x.pos === 'GK') this.coverGk(si, min) }
    this.dirty = true
  }

  // ---------- cambios ----------
  private pickSub(S: Side, out: OnPitch): number | null {
    let bestId: number | null = null, bs = -1
    for (const id of S.bench) {
      const p = this.players[id]
      if ((out.pos === 'GK') !== (p.positions[0] === 'GK')) continue
      const sc = posRating(p, out.pos) * (0.7 + 0.3 * p.cond / 100)
      if (sc > bs) { bs = sc; bestId = id }
    }
    return bestId
  }
  private doSub(si: 0 | 1, out: OnPitch, inId: number, min: number) {
    const S = this.sides[si]
    const idx = S.on.indexOf(out)
    const n = this.mkOn(this.players[inId], out.pos, si, false, this.tick)
    S.on.splice(idx, 1, n); S.off.push(out)
    S.bench = S.bench.filter(i => i !== inId)
    S.subs++
    this.ev(min, 'sub', si, `Cambio en ${S.club.short}: entra ${n.p.name} por ${out.p.name}.`, out.p.id, inId)
    this.dirty = true
  }
  /** Cambio pedido por el usuario. Devuelve false si no es posible. */
  substitute(si: 0 | 1, outPid: number, inPid: number): boolean {
    const S = this.sides[si]
    const out = S.on.find(x => x.p.id === outPid)
    if (!out || !S.bench.includes(inPid) || S.subs >= 5 || this.finished) return false
    this.doSub(si, out, inPid, this.minute)
    return true
  }
  /** Intercambia los puestos de dos jugadores en cancha. */
  swap(si: 0 | 1, a: number, b: number) {
    const S = this.sides[si], x = S.on.find(o => o.p.id === a), y = S.on.find(o => o.p.id === b)
    if (!x || !y) return
    const ix = S.on.indexOf(x), iy = S.on.indexOf(y);
    [x.pos, y.pos] = [y.pos, x.pos]; x.line.pos = x.pos; y.line.pos = y.pos;
    [S.on[ix], S.on[iy]] = [S.on[iy], S.on[ix]]
    this.dirty = true
  }
  setTactic(si: 0 | 1, patch: Partial<Tactic>) {
    const S = this.sides[si]
    const oldF = S.tactic.formation
    Object.assign(S.tactic, patch)
    if (patch.formation && patch.formation !== oldF) this.reshape(S)
    this.dirty = true
  }
  private reshape(S: Side) {
    const slots = FORMATIONS[S.tactic.formation].map(s => s.pos).filter(p => p !== 'GK')
    const pl = S.on.filter(x => x.pos !== 'GK')
    // si faltan jugadores, se sacrifican primero los puestos más ofensivos
    const use = [...slots].sort((a, b) => ZONE_W[a][2] - ZONE_W[b][2]).slice(0, pl.length)
    const free = new Set(pl)
    for (const pos of use) {
      const b = best([...free], x => posRating(x.p, pos))
      b.pos = pos; b.line.pos = pos; free.delete(b)
    }
  }

  private aiManage(si: 0 | 1, min: number) {
    const S = this.sides[si], O = this.sides[1 - si], diff = S.goals - O.goals
    if (min >= 56 && S.subs < 5 && this.rng.chance(min >= 75 ? 0.16 : 0.09)) {
      const cands = S.on.filter(x => x.pos !== 'GK')
      const out = best(cands, x => (100 - x.cond) + (x.yellow ? 12 : 0) - x.acc * 12 + (this.tick - x.enteredTick < 25 ? -100 : 0))
      const inId = out ? this.pickSub(S, out) : null
      if (out && inId != null && (out.cond < 78 || min > 70)) this.doSub(si, out, inId, min)
    }
    const base = S.club.tactic.mentality
    let want = base
    if (min >= 60 && diff < 0) want = Math.min(4, base + 1)
    if (min >= 78 && diff < 0) want = Math.min(4, base + 2)
    if (min >= 75 && diff > 0) want = Math.max(0, base - 1)
    if (min >= 85 && diff > 0) want = Math.max(0, base - 2)
    if (want !== S.tactic.mentality) { S.tactic.mentality = want; this.dirty = true }
  }

  /** Jugadores en cancha y banco (para la interfaz). */
  view(si: 0 | 1) {
    const S = this.sides[si]
    return { on: S.on.map(x => ({ pid: x.p.id, pos: x.pos, cond: x.cond, rating: this.liveRating(x, S), yellow: x.yellow, goals: x.line.goals })), bench: S.bench, subs: S.subs, tactic: S.tactic, goals: S.goals }
  }
  private liveRating(x: OnPitch, S: Side): number {
    const O = this.sides[S === this.sides[0] ? 1 : 0]
    const si = S === this.sides[0] ? 0 : 1
    const mins = Math.max(1, x.line.mins)
    const share = Math.min(1, mins / 60)
    const quality = (posRating(x.p, x.pos) - 62) / 100 * 2.2
    const team = (this.stats.xg[si] - this.stats.xg[1 - si]) * 0.22 + (S.goals - O.goals) * 0.12
    const noise = ((x.p.id * 7919 + this.opts.seed) % 1000 / 1000 - 0.5) * 0.9
    return clamp(6.2 + x.acc + (quality + clamp(team, -0.7, 0.7) + noise) * share, 3, 10)
  }

  runToEnd(): MatchResult {
    while (!this.finished) this.step()
    return this.result()
  }

  result(): MatchResult {
    const [h, a] = this.sides
    const lines: PlayerLine[] = []
    const cond: Record<number, number> = {}
    this.sides.forEach((S, si) => {
      const O = this.sides[1 - si]
      for (const x of [...S.on, ...S.off]) {
        let rt = this.liveRating(x, S)
        if (O.goals === 0 && x.line.mins >= 60) rt += x.pos === 'GK' || POS_LINE[x.pos] === 'DF' ? 0.5 : x.pos === 'DM' ? 0.25 : 0
        if (S.goals > O.goals) rt += 0.25
        if (S.goals < O.goals) rt -= 0.15
        x.line.rating = Math.round(clamp(rt, 3, 10) * 10) / 10
        x.line.mins = Math.min(x.line.mins, this.et ? 120 : 90)
        lines.push(x.line); cond[x.p.id] = x.cond
      }
    })
    const motm = lines.reduce((b, l) => (l.rating > b.rating ? l : b), lines[0]).pid
    return {
      hg: h.goals, ag: a.goals, pens: this.pens, et: this.et, stats: this.stats, events: this.events,
      lines, injuries: this.injuries, motm, cond, shots: this.shots,
    }
  }
}

function avg<T>(arr: T[], f: (t: T) => number): number {
  if (!arr.length) return 10
  let s = 0
  for (const x of arr) s += f(x)
  return s / arr.length
}
function best<T>(arr: T[], f: (t: T) => number): T {
  let b = arr[0], bs = -Infinity
  for (const x of arr) { const v = f(x); if (v > bs) { bs = v; b = x } }
  return b
}
function possPct(t: [number, number]): [number, number] {
  const tot = t[0] + t[1]
  if (!tot) return [50, 50]
  const h = Math.round((t[0] / tot) * 100)
  return [h, 100 - h]
}
