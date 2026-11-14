// Motor de partido por jugadas. Cada minuto un equipo tiene la pelota y la jugada pasa por fases:
// salida -> elaboración -> último tercio -> definición. Cada fase se resuelve con duelos entre jugadores
// concretos, según su puesto, su rol y las instrucciones de los dos equipos.
import { Rng, clamp } from './rng'
import { FORMATIONS, POS_LINE, ROLE, ZONE_W, at, fixRoles, posRating, roleFit, defaultRole, type Role } from './positions'
import type { Attr, Club, Frame, MatchEvent, MatchStats, PlayKind, Player, PlayerLine, Pos, Shot, Tactic } from './types'

interface OnPitch {
  p: Player; pos: Pos; role: Role; ch: 0 | 1 | 2; cond: number; day: number; acc: number; eff: number
  line: PlayerLine; yellow: boolean; enteredTick: number
}
interface Side {
  club: Club; tactic: Tactic; on: OnPitch[]; bench: number[]; off: OnPitch[]
  subs: number; goals: number; mid: number; fam: number; ai: boolean; talk: number
}
export interface MatchOpts { knockout?: boolean; neutral?: boolean; seed: number; userSide?: 0 | 1 | null; importance?: number
  /** Multiplicadores del DT por lado: [ataque, defensa, medio] */
  boost?: [number, number, number][]
  /** Multiplicador de pelota parada por lado (entrenamiento). */
  sp?: [number, number] }
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
const CH_NAME = ['la izquierda', 'el centro', 'la derecha']
const chOf = (x: number): 0 | 1 | 2 => (x < 38 ? 0 : x > 62 ? 2 : 1)
const POS_X: Record<Pos, number> = { GK: 50, DR: 85, DC: 50, DL: 15, DM: 50, MC: 50, MR: 85, ML: 15, AMC: 50, AMR: 82, AML: 18, ST: 50 }

export class MatchSim {
  rng: Rng
  sides: [Side, Side]
  stats: MatchStats
  events: MatchEvent[] = []
  shots: Shot[] = []
  frame: Frame = { poss: 0, route: [], shot: null, kind: 'open', channel: 1 }
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
      tactic.roles = fixRoles(tactic.formation, tactic.roles)
      const slots = FORMATIONS[tactic.formation]
      const on = tactic.lineup.slice(0, 11).map((pid, k) => this.mkOn(players[pid], slots[k].pos, ROLE[tactic.roles[k]], chOf(slots[k].x), i as 0 | 1, true, 0))
      return { club, tactic, on, bench: [...tactic.bench], off: [], subs: 0, goals: 0, mid: 1, fam: 0.94 + 0.06 * (club.fam ?? 70) / 100, ai: opts.userSide !== i, talk: 0 }
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

  private mkOn(p: Player, pos: Pos, role: Role, ch: 0 | 1 | 2, side: 0 | 1, started: boolean, tick: number): OnPitch {
    return {
      p, pos, role, ch, cond: p.cond, day: 1 + this.rng.gauss() * 0.035 + (this.opts.importance && p.pers ? (p.pers.pres - 10) * 0.004 : 0), acc: 0, eff: 1, yellow: false, enteredTick: tick,
      line: { pid: p.id, side, started, mins: 0, rating: 6, goals: 0, ast: 0, shots: 0, sot: 0, saves: 0, yc: 0, rc: 0, pos },
    }
  }
  get minute(): number { return this.tick === 0 ? 0 : this.ticks[Math.min(this.tick, this.ticks.length) - 1] }
  get halfTime(): boolean { return this.tick === this.ht }
  private ev(min: number, type: MatchEvent['type'], side: 0 | 1, text: string, pid?: number, pid2?: number) {
    this.events.push({ min, type, side, text, pid, pid2 })
  }
  private nm(o: OnPitch) { return o.p.name }
  /** Habilidad efectiva (escala 1-20) de un jugador en un grupo de atributos. */
  private sk(x: OnPitch, ...as: Attr[]): number {
    let s = 0
    for (const a of as) s += at(x.p, a)
    return (s / as.length) * x.eff
  }
  /** ¿El rival tiene una orden puntual sobre este jugador? */
  private oi(O: Side, x: OnPitch, k: 'tight' | 'hard' | 'press'): boolean { return !!O.tactic.oppo?.[x.p.id]?.[k] }
  private grp(xs: OnPitch[], ...as: Attr[]): number {
    if (!xs.length) return 8
    let s = 0
    for (const x of xs) s += this.sk(x, ...as)
    return s / xs.length
  }

  // ---------- estado de los equipos ----------
  private recompute() {
    for (let i = 0; i < 2; i++) {
      const s = this.sides[i], t = s.tactic
      let mid = 0
      for (const x of s.on) {
        const famPos = posRating(x.p, x.pos) / Math.max(1, posRating(x.p, x.p.positions[0]))
        x.eff = clamp(famPos, 0.6, 1.02) * (0.72 + 0.28 * x.cond / 100) * (0.95 + 0.1 * x.p.morale / 100) * x.day * s.fam * roleFit(x.p, x.role) * (1 + s.talk)
        if (x.pos === 'GK') continue
        mid += (posRating(x.p, x.pos) / 100) * (x.eff / clamp(famPos, 0.6, 1.02)) * ZONE_W[x.pos][1] * x.role.z[1]
      }
      mid *= 1 - 0.012 * Math.abs(t.mentality - 2)
      mid *= 1 + 0.04 * (t.pressing - 1) + 0.035 * (t.line - 1) - 0.012 * (t.width - 1) - 0.035 * (t.passing - 1)
      if (t.pressing === 2 && t.line === 0) mid *= 0.96 // presión alta con línea baja: equipo partido
      if (t.passing === 0 && t.tempo === 0) mid *= 1.03
      if (i === 0 && !this.opts.neutral) mid *= 1.045
      s.mid = (mid / 4.5) * (this.opts.boost?.[i]?.[2] ?? 1)
    }
    this.dirty = false
  }
  private home(i: number) { return i === 0 && !this.opts.neutral ? 0.02 : 0 }

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
    const ps: 0 | 1 = this.rng.chance(pH) ? 0 : 1
    const S = this.sides[ps], O = this.sides[1 - ps]
    this.possTicks[ps]++
    this.frame = { poss: ps, route: [], shot: null, kind: 'open', channel: 1 }
    const tries = this.rng.int(6, 10) + S.tactic.tempo - (S.tactic.passing === 2 ? 2 : 0)
    const accP = clamp(0.7 + (this.grp(S.on, 'pas', 'fto') - 11) * 0.014 + (1 - S.tactic.passing) * 0.045 - (O.tactic.pressing - 1) * 0.03 - (S.tactic.tempo - 1) * 0.015, 0.5, 0.94)
    let ok = 0
    for (let i = 0; i < tries; i++) if (this.rng.chance(accP)) ok++
    this.stats.passes[ps] += tries; this.stats.passOk[ps] += ok

    this.attack(ps, min, false, 0)
    if (this.rng.chance(0.215)) this.foul(this.rng.chance(0.6) ? ((1 - ps) as 0 | 1) : ps, min)
    if (this.rng.chance(0.0034)) this.injury(this.rng.chance(0.5) ? 0 : 1, min)
    for (const s of this.sides) for (const x of s.on) {
      const t = s.tactic
      const drop = (0.25 + 0.05 * t.pressing + 0.035 * t.tempo + 0.03 * t.onLoss - (at(x.p, 'sta') - 10) * 0.011 + (at(x.p, 'wor') - 10) * 0.004 + (x.role.id === 'wb' || x.role.id === 'b2b' ? 0.03 : 0)) * (x.pos === 'GK' ? 0.25 : 1)
      x.cond = Math.max(15, x.cond - Math.max(0.08, drop))
      x.line.mins++
    }
    for (let i = 0; i < 2; i++) if (this.sides[i].ai) this.aiManage(i as 0 | 1, min)
    this.stats.poss = possPct(this.possTicks)
    if (this.tick >= this.ticks.length) this.periodEnd()
    return this.events.slice(before)
  }

  private scoreText() { return `${this.sides[0].club.short} ${this.sides[0].goals} - ${this.sides[1].goals} ${this.sides[1].club.short}` }

  // ---------- la jugada ----------
  private pickChannel(S: Side): 0 | 1 | 2 {
    const t = S.tactic, w = [0.28 + 0.07 * (t.width - 1), 0.44 - 0.14 * (t.width - 1), 0.28 + 0.07 * (t.width - 1)]
    if (t.focus < 3) for (let i = 0; i < 3; i++) w[i] = i === t.focus ? 0.66 : 0.17
    // sin gente en una banda, la jugada va por otro lado
    for (const c of [0, 2] as const) if (!S.on.some(x => x.ch === c && x.pos !== 'GK')) w[c] *= 0.15
    return this.rng.weighted([0, 1, 2] as const, c => w[c])
  }
  private inCh(S: Side, ch: number, f: (x: OnPitch) => boolean): OnPitch[] {
    const own = S.on.filter(x => x.pos !== 'GK' && x.ch === ch && f(x))
    if (own.length) return own
    const any = S.on.filter(x => x.pos !== 'GK' && f(x))
    if (any.length) return any
    const out = S.on.filter(x => x.pos !== 'GK')
    return out.length ? out : S.on
  }

  private attack(si: 0 | 1, min: number, counter: boolean, depth: number): void {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng, t = S.tactic, ot = O.tactic
    const b = this.opts.boost, bAtt = (b?.[si]?.[0] ?? 1) - 1, bDef = (b?.[1 - si]?.[1] ?? 1) - 1, bTac = (b?.[si]?.[2] ?? 1) - 1
    if (S.on.filter(x => x.pos !== 'GK').length < 2 || !O.on.length) return
    const ch = this.pickChannel(S), och = (2 - ch) as 0 | 1 | 2
    const fr = this.frame
    fr.poss = si; fr.channel = ch; fr.route = []; fr.kind = counter ? 'counter' : 'open'
    let bonus3 = 0

    if (!counter) {
      // 1. salida
      const backs = S.on.filter(x => POS_LINE[x.pos] === 'DF' || x.pos === 'DM' || x.role.id === 'sk')
      const builder = backs.length ? r.weighted(backs, x => at(x.p, 'pas') * (x.role.id === 'bpd' || x.role.id === 'reg' || x.role.id === 'sk' ? 1.8 : 1)) : S.on[0]
      fr.route.push(builder.p.id)
      if (t.passing === 2) {
        // salida larga: pelotazo al 9 y duelo aéreo con el central
        const fw = S.on.filter(x => POS_LINE[x.pos] === 'FW' || x.pos === 'AMC')
        const tgt = fw.length ? best(fw, x => this.sk(x, 'hea', 'jmp', 'str') + (x.role.id === 'tgt' ? 3 : 0)) : builder
        const dcs = O.on.filter(x => x.pos === 'DC' || x.pos === 'DM')
        const mk = dcs.length ? r.pick(dcs) : O.on[0]
        fr.route.push(tgt.p.id); fr.kind = 'aerial'
        const p = 0.47 + (this.sk(tgt, 'hea', 'jmp', 'str') - this.sk(mk, 'hea', 'jmp', 'str')) * 0.035 + (tgt.role.id === 'tgt' ? 0.07 : 0) + this.home(si)
        if (!r.chance(clamp(p, 0.15, 0.8))) { mk.acc += 0.05; return this.lose(si, min, mk, 0.3, depth) }
        tgt.acc += 0.05; bonus3 = -0.03
      } else {
        const press = O.on.filter(x => POS_LINE[x.pos] === 'FW' || x.pos === 'AMC')
        const pSkill = this.grp(press, 'wor', 'sta', 'agg', 'acc')
        const p1 = 0.93 - (this.oi(O, builder, 'press') ? 0.06 : 0) + (this.sk(builder, 'pas', 'com', 'dec') - 11) * 0.012 - ot.pressing * (0.035 + (pSkill - 11) * 0.006) + (t.passing === 0 ? 0.02 : 0.035) - (t.tempo - 1) * 0.015
        if (!r.chance(clamp(p1, 0.5, 0.99))) {
          const w = press.length ? r.pick(press) : O.on[0]
          w.acc += 0.1; builder.acc -= 0.12
          return this.lose(si, min, w, 1.5, depth) // pérdida en la salida: muy peligrosa
        }
        if (ot.pressing === 2) bonus3 += 0.05 // superada la presión alta, hay espacios
        // 2. elaboración
        const mids = this.inCh(S, ch, x => POS_LINE[x.pos] !== 'DF' || x.role.id === 'wb' || x.role.id === 'fb')
        const stop = this.inCh(O, och, x => POS_LINE[x.pos] === 'MF' || POS_LINE[x.pos] === 'DF')
        const link = r.weighted(mids, x => (at(x.p, 'pas') + at(x.p, 'vis')) * x.role.create * (POS_LINE[x.pos] === 'MF' ? 1.6 : 1))
        fr.route.push(link.p.id)
        const p2 = 0.6 + (this.grp(mids, 'pas', 'fto', 'dec', 'vis') - this.grp(stop, 'tck', 'pos', 'wor', 'mar')) * 0.035 + 0.025 * (t.mentality - 2)
          - 0.04 * (ot.line - 1) - 0.03 * (t.tempo - 1) + (t.passing === 0 ? 0.02 : 0) + bTac * 2 + this.home(si)
          + (S.on.length - O.on.length) * 0.05 - (this.oi(O, link, 'press') ? 0.05 : 0)
        if (!r.chance(clamp(p2, 0.2, 0.9))) {
          const w = r.weighted(stop, x => at(x.p, 'tck') + at(x.p, 'pos'))
          w.acc += 0.06; link.acc -= 0.03
          return this.lose(si, min, w, 0.7, depth)
        }
        link.acc += 0.03
      }
    } else bonus3 = 0.17

    // 3. último tercio: el creador contra su marcador
    const atts = this.inCh(S, ch, x => POS_LINE[x.pos] !== 'DF' || x.role.id === 'wb' || x.role.id === 'fb')
    const cre = r.weighted(atts, x => (ZONE_W[x.pos][2] * x.role.z[2] + 0.15) * x.role.create * (at(x.p, 'dri') + at(x.p, 'vis')) * (x.pos === 'ST' ? 0.4 : 1))
    const defs = this.inCh(O, och, x => POS_LINE[x.pos] === 'DF' || x.pos === 'DM')
    let mk = r.weighted(defs, x => ZONE_W[x.pos][0] * x.role.z[0] * (ch !== 1 && (x.pos === 'DR' || x.pos === 'DL') ? 3 : 1))
    // marca personal: el encargado lo sigue adonde vaya
    const mm = ot.manMark, shadow = mm && mm.target === cre.p.id ? O.on.find(x => x.p.id === mm.by && x.pos !== 'GK') : undefined
    if (shadow) { mk = shadow; shadow.cond = Math.max(15, shadow.cond - 0.35) }
    if (fr.route[fr.route.length - 1] !== cre.p.id) fr.route.push(cre.p.id)
    const wide = ch !== 1
    let a3 = wide ? this.sk(cre, 'dri', 'pac', 'acc', 'cro') : this.sk(cre, 'vis', 'pas', 'fto', 'dri')
    let d3 = wide ? this.sk(mk, 'tck', 'pac', 'pos', 'mar') : this.sk(mk, 'mar', 'pos', 'dec', 'tck')
    if (shadow) d3 *= 1.06
    const tight = this.oi(O, cre, 'tight'), hard = this.oi(O, cre, 'hard')
    if (tight) {
      // marcar encima anula al que no tiene cambio de ritmo, pero un rápido se saca la marca y queda solo
      const quick = this.sk(cre, 'pac', 'acc') - this.sk(mk, 'pac', 'acc')
      a3 *= quick > 2 ? 1.04 : 0.93
      mk.cond = Math.max(15, mk.cond - 0.25)
    }
    if (hard) a3 *= 0.96
    const p3 = 0.352 + (a3 - d3) * 0.035 + bonus3 + 0.02 * (t.mentality - 2) + 0.025 * (t.tempo - 1) + (ot.line === 0 ? -0.05 : ot.line === 2 ? 0.02 : 0)
      + (mk.role.id === 'stp' ? -0.02 : 0) + bAtt * 2.5 - bDef * 2.5 + this.home(si) + (S.on.length - O.on.length) * 0.04
    if (!r.chance(clamp(p3, 0.12, 0.85))) {
      mk.acc += 0.07; cre.acc -= 0.02
      const u = r.next(), foulP = (hard ? 1.6 : 1) * 0.15 * [0.75, 1, 1.35][ot.tackling] * (0.6 + at(mk.p, 'agg') / 25) * (mk.role.id === 'stp' ? 1.25 : 1)
      if (u < foulP) return this.attackFoul(si, min, cre, mk)
      if (u < foulP + 0.1) return this.corner(si, min)
      if (!wide && u < foulP + 0.1 + 0.11 * (1 + 0.8 * (ot.line - 1))) { this.stats.offs[si]++; return }
      return this.lose(si, min, mk, 0.55, depth)
    }
    cre.acc += 0.06
    this.chance(si, min, cre, mk, wide, counter)
  }

  /** La jugada superó al marcador: define qué ocasión se genera. */
  private chance(si: 0 | 1, min: number, cre: OnPitch, mk: OnPitch, wide: boolean, counter: boolean) {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng, t = S.tactic, fr = this.frame
    const box = S.on.filter(x => x !== cre && x.pos !== 'GK' && POS_LINE[x.pos] !== 'DF' && x.role.id !== 'anc')
    const bw = (x: OnPitch) => (x.pos === 'ST' ? 0.72 : x.pos === 'AMC' || x.pos === 'AMR' || x.pos === 'AML' ? 0.62 : x.pos === 'DM' ? 0.14 : 0.42) * x.role.shoot
    const dcs = O.on.filter(x => x.pos === 'DC')
    const dc = dcs.length ? r.pick(dcs) : mk
    const side = CH_NAME[fr.channel]
    const longW = (t.finalThird === 3 ? 0.34 : 0.1) + (O.tactic.line === 0 ? 0.05 : 0) + (O.on.find(x => x.pos === 'GK')?.role.id === 'sk' ? 0.03 : 0)
    if (!counter && r.chance(longW)) {
      const sh = cre.role.shoot >= 1 || !box.length ? cre : r.weighted(box, x => at(x.p, 'lsh'))
      if (sh !== cre) fr.route.push(sh.p.id)
      fr.kind = 'long'
      return this.shot(si, min, 'long', sh, 0.036, at(sh.p, 'lsh') / 20, sh === cre ? undefined : cre, `${this.nm(sh)} se anima desde lejos`)
    }
    const crossW = wide ? (t.finalThird === 2 ? 0.8 : t.finalThird === 0 ? 0.35 : 0.55) * (cre.role.id === 'inv' ? 0.35 : 1) : 0
    if (wide && box.length && r.chance(crossW)) {
      // centro y duelo aéreo en el área
      const tg = r.weighted(box, x => (at(x.p, 'hea') + at(x.p, 'jmp')) * (x.role.id === 'tgt' ? 1.6 : 1) * bw(x))
      fr.route.push(tg.p.id); fr.kind = 'cross'
      const q = this.sk(cre, 'cro') - 11
      const p = 0.5 + q * 0.02 + (this.sk(tg, 'hea', 'jmp', 'str') - this.sk(dc, 'hea', 'jmp', 'mar')) * 0.035
      if (!r.chance(clamp(p, 0.15, 0.85))) { dc.acc += 0.08; if (r.chance(0.3)) return this.corner(si, min); return this.lose(si, min, dc, 0.4, 1) }
      return this.shot(si, min, 'head', tg, 0.082, (at(tg.p, 'hea') * 2 + at(tg.p, 'jmp')) / 60, cre, `${this.nm(cre)} desborda a ${this.nm(mk)} por ${side} y manda el centro`)
    }
    if (wide) {
      // encara hacia adentro: remata o busca al que llega
      if (cre.role.shoot >= 1.3 || !box.length || r.chance(0.5)) { fr.kind = 'open'; return this.shot(si, min, 'open', cre, 0.085, (at(cre.p, 'fin') * 2 + at(cre.p, 'com') + at(cre.p, 'dri')) / 80, undefined, `${this.nm(cre)} deja atrás a ${this.nm(mk)} y encara hacia el área`) }
      const tg = r.weighted(box, x => (at(x.p, 'otb') + at(x.p, 'fin')) * bw(x))
      fr.route.push(tg.p.id)
      return this.shot(si, min, 'open', tg, 0.1, (at(tg.p, 'fin') * 2 + at(tg.p, 'com') + at(tg.p, 'fto')) / 80, cre, `${this.nm(cre)} gana por ${side} y la tira atrás`)
    }
    // por el centro: pase filtrado al que pica
    if (box.length && cre.role.create >= 0.9 && r.chance(0.5)) {
      const run = r.weighted(box, x => (at(x.p, 'otb') + at(x.p, 'pac')) * bw(x) * (x.role.id === 'mov' ? 1.4 : 1))
      fr.route.push(run.p.id); fr.kind = 'through'
      const line = O.tactic.line
      if (r.chance(0.1 + 0.07 * line)) { this.stats.offs[si]++; return }
      const p = 0.24 + (this.sk(run, 'otb', 'pac', 'acc') - this.sk(dc, 'pos', 'pac', 'dec')) * 0.04 + 0.08 * (line - 1) + (counter ? 0.12 : 0)
      const clean = r.chance(clamp(p, 0.08, 0.8))
      if (!clean) dc.acc += 0.04
      return this.shot(si, min, clean ? 'one' : 'open', run, clean ? 0.25 : 0.085, (at(run.p, 'fin') * 2 + at(run.p, 'com') * (clean ? 2 : 1)) / (clean ? 80 : 60), cre,
        clean ? `${this.nm(cre)} mete un pase filtrado y ${this.nm(run)} queda mano a mano` : `${this.nm(cre)} habilita a ${this.nm(run)} en el área`)
    }
    fr.kind = 'open'
    return this.shot(si, min, 'open', cre, 0.09, (at(cre.p, 'fin') * 2 + at(cre.p, 'com') + at(cre.p, 'fto')) / 80, undefined, `${this.nm(cre)} se saca de encima a ${this.nm(mk)} en la medialuna`)
  }

  /** Pérdida de pelota: el que la pierde puede presionar enseguida y el rival puede salir de contra. */
  private lose(si: 0 | 1, min: number, winner: OnPitch, risk: number, depth: number): void {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng
    this.frame.lostTo = winner.p.id
    if (depth >= 1) return
    if (S.tactic.onLoss === 1 && r.chance(clamp(0.2 + (this.grp(S.on.filter(x => POS_LINE[x.pos] !== 'DF' && x.pos !== 'GK'), 'wor', 'sta', 'agg') - 11) * 0.02, 0.05, 0.4))) {
      this.frame.lostTo = undefined
      return this.attack(si, min, true, depth + 1) // recuperación alta: ataca con el rival desacomodado
    }
    const pc = (O.tactic.onWin === 1 ? 0.2 : 0.07) * risk * (1 + 0.22 * (S.tactic.mentality - 2)) * (1 + 0.3 * (S.tactic.line - 1)) * (S.tactic.onLoss === 1 ? 1.25 : 1)
    if (r.chance(clamp(pc, 0, 0.75))) {
      this.frame.lostTo = undefined
      this.attack((1 - si) as 0 | 1, min, true, depth + 1)
    }
  }

  // ---------- pelota parada ----------
  private taker(S: Side, kind: 'pen' | 'fk' | 'corner'): OnPitch {
    const out = S.on.filter(x => x.pos !== 'GK')
    const chosen = out.find(x => x.p.id === S.tactic.takers?.[kind])
    if (chosen) return chosen
    return best(out.length ? out : S.on, x => (kind === 'pen' ? at(x.p, 'fin') + at(x.p, 'com') + at(x.p, 'set') * 0.5 : kind === 'fk' ? at(x.p, 'set') * 2 + at(x.p, 'lsh') : at(x.p, 'set') + at(x.p, 'cro')))
  }
  private aerial(si: 0 | 1, min: number, tk: OnPitch, base: number, intro: string, plan = 0) {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng
    const tall = S.on.filter(x => x !== tk && x.pos !== 'GK')
    if (!tall.length) return
    // primer palo premia al que anticipa; segundo palo, al que salta y aguanta
    const fav = S.tactic.cornerTarget ? tall.find(x => x.p.id === S.tactic.cornerTarget) : undefined
    const tg = fav && r.chance(0.6) ? fav : r.weighted(tall, x => (plan === 1 ? at(x.p, 'acc') + at(x.p, 'otb') + at(x.p, 'hea') : plan === 2 ? at(x.p, 'jmp') + at(x.p, 'str') + at(x.p, 'hea') : (at(x.p, 'hea') + at(x.p, 'jmp')) * 1.5) * (x.pos === 'DC' ? 1.4 : x.pos === 'ST' ? 1.15 : 1))
    const dd = O.on.filter(x => x.pos !== 'GK')
    const mk = dd.length ? best(dd, x => this.sk(x, 'hea', 'jmp', 'mar') + r.next() * 4) : O.on[0]
    this.frame.route = [tk.p.id, tg.p.id]
    const p = base * (this.opts.sp?.[si] ?? 1) + (this.sk(tk, 'cro', 'set') - 11) * 0.012 + (this.sk(tg, 'hea', 'jmp', 'str') - this.sk(mk, 'hea', 'jmp', 'mar')) * 0.03
    if (!r.chance(clamp(p, 0.06, 0.6))) { mk.acc += 0.05; return }
    this.shot(si, min, 'head', tg, plan === 1 ? 0.08 : plan === 2 ? 0.105 : 0.095, (at(tg.p, 'hea') * 2 + at(tg.p, 'jmp')) / 60, tk, intro)
  }
  private corner(si: 0 | 1, min: number) {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng
    this.stats.corners[si]++
    this.frame.kind = 'corner'; this.frame.poss = si
    const tk = this.taker(S, 'corner'), plan = S.tactic.cornerPlan ?? 0
    if (plan === 3) {
      // jugada corta: se juega con un compañero y se busca el desborde
      const dd = O.on.filter(x => x.pos !== 'GK')
      this.frame.route = [tk.p.id]
      if (dd.length && r.chance(0.42)) this.chance(si, min, tk, r.pick(dd), true, false)
      return
    }
    const how = plan === 1 ? 'al primer palo' : plan === 2 ? 'al segundo palo' : 'al corazón del área'
    this.aerial(si, min, tk, plan === 1 ? 0.175 : plan === 2 ? 0.14 : 0.15, `Córner de ${this.nm(tk)} ${how}`, plan)
  }
  private attackFoul(si: 0 | 1, min: number, victim: OnPitch, f: OnPitch) {
    const S = this.sides[si], r = this.rng
    this.stats.fouls[(1 - si) as 0 | 1]++
    this.card((1 - si) as 0 | 1, f, min, 1.05)
    this.frame.poss = si
    if (r.chance(0.034)) {
      const tk = this.taker(S, 'pen')
      this.frame.kind = 'pen'; this.frame.route = [tk.p.id]
      this.ev(min, 'info', si, `¡Penal para ${S.club.short}! Falta de ${this.nm(f)} sobre ${this.nm(victim)}.`)
      return this.shot(si, min, 'pen', tk, 0.77, (at(tk.p, 'fin') + at(tk.p, 'com')) / 40)
    }
    const tk = this.taker(S, 'fk')
    this.frame.kind = 'fk'
    if (r.chance(0.16)) { this.frame.route = [tk.p.id]; return this.shot(si, min, 'fk', tk, 0.068 * (this.opts.sp?.[si] ?? 1), (at(tk.p, 'set') * 2 + at(tk.p, 'lsh')) / 60, undefined, `Tiro libre peligroso por la falta de ${this.nm(f)}`) }
    this.aerial(si, min, tk, 0.13, `Tiro libre de ${this.nm(tk)} al área`)
  }

  // ---------- definición ----------
  private shot(si: 0 | 1, min: number, kind: 'open' | 'long' | 'head' | 'one' | 'fk' | 'pen', sh: OnPitch, base: number, sk: number, as?: OnPitch, intro?: string): void {
    const S = this.sides[si], O = this.sides[1 - si], r = this.rng
    const gk = O.on.find(x => x.pos === 'GK')
    const gkQ = gk ? (posRating(gk.p, 'GK') / 100) * (gk.eff / Math.max(0.5, roleFit(gk.p, gk.role))) : 0.3
    const xg = kind === 'pen' ? base : base * (0.54 + 0.72 * r.next())
    if (this.oi(O, sh, 'tight') && kind !== 'pen' && kind !== 'fk') sk *= 0.94
    const pGoal = clamp(xg * (0.49 + 0.92 * sk) * sh.role.shoot ** 0.25 * (1.62 - 0.9 * gkQ) * (kind === 'long' && gk?.role.id === 'sk' ? 1.2 : 1), 0.008, 0.95)
    this.stats.shots[si]++; this.stats.xg[si] += xg
    sh.line.shots++
    const n = this.nm(sh), club = S.club.short
    const far = kind === 'long' ? 24 + r.next() * 10 : kind === 'fk' ? 20 + r.next() * 8 : kind === 'pen' ? 11 : 4 + r.next() * 12
    const lat = this.frame.channel === 1 || kind === 'head' || kind === 'one' ? 50 + r.gauss() * 9 : this.frame.channel === 0 ? 30 + r.gauss() * 8 : 70 + r.gauss() * 8
    const log: Shot = { kind, min, side: si, pid: sh.p.id, xg, out: 'off', x: kind === 'pen' ? 50 : clamp(si === 0 ? lat : 100 - lat, 12, 88), y: far, ast: as?.p.id }
    this.shots.push(log); this.frame.shot = log
    const pre = intro ? `${intro}. ` : ''
    if (r.chance(pGoal)) {
      log.out = 'goal'
      this.stats.sot[si]++; sh.line.sot++; sh.line.goals++; sh.acc += 1.1; S.goals++
      if (as) { as.line.ast++; as.acc += 0.8 }
      for (const x of O.on) x.acc -= x.pos === 'GK' ? 0.35 : POS_LINE[x.pos] === 'DF' || x.pos === 'DM' ? 0.16 : 0.05
      for (const x of S.on) x.acc += 0.04
      const how: Record<string, string[]> = {
        open: ['define cruzado', 'la empuja al fondo de la red', 'saca un remate seco al primer palo', 'define con clase'],
        long: ['la clava en el ángulo', 'saca un bombazo imparable'], head: ['gana de cabeza y la manda a guardar', 'conecta un cabezazo imparable'],
        one: ['no perdona ante la salida del arquero', 'define por abajo con frialdad'], fk: ['la cuelga por encima de la barrera'], pen: ['convierte el penal con un remate fuerte'],
      }
      this.ev(min, kind === 'pen' ? 'pen-goal' : 'goal', si, `¡GOL de ${club}! ${pre}${n} ${r.pick(how[kind])}. ${this.scoreText()}.`, sh.p.id, as?.p.id)
      this.dirty = true
      return
    }
    const u = r.next(), g = gk ? this.nm(gk) : 'el arquero'
    if (kind === 'pen') {
      const saved = u < 0.7 && !!gk
      log.out = saved ? 'saved' : 'off'
      if (saved) { gk!.line.saves++; gk!.acc += 0.6; this.stats.sot[si]++; sh.line.sot++ }
      sh.acc -= 0.5
      return this.ev(min, 'pen-miss', si, saved ? `¡${g} le ataja el penal a ${n}!` : `${n} desvía el penal.`, sh.p.id)
    }
    const big = xg > 0.11
    if (u < 0.3) {
      log.out = 'saved'
      this.stats.sot[si]++; sh.line.sot++; sh.acc += 0.12
      if (gk) { gk.line.saves++; gk.acc += 0.2 + xg * 0.8 }
      if (r.chance(0.36)) this.stats.corners[si]++
      if (big || r.chance(0.3)) this.ev(min, 'save', si, `${pre}${r.pick([`${n} remata y ${g} responde con una gran atajada.`, `Tapadón de ${g} ante ${n}.`, `${n} prueba al arco y controla ${g}.`])}`, sh.p.id)
    } else if (u < 0.54) {
      log.out = 'block'
      if (r.chance(0.36)) this.stats.corners[si]++
      const d = O.on.filter(x => POS_LINE[x.pos] === 'DF')
      if (d.length) r.pick(d).acc += 0.1
    } else if (u < 0.575) {
      log.out = 'post'
      this.ev(min, 'post', si, `${pre}¡El palo! ${n} estuvo a centímetros del gol para ${club}.`, sh.p.id)
    } else {
      sh.acc -= 0.03
      if (xg > 0.16) this.ev(min, 'chance', si, `${pre}${n} desperdicia una ocasión clarísima.`, sh.p.id)
    }
  }

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
    this.ev(this.et ? 120 : 90, 'info', 0, `Final del partido: ${this.scoreText()}${this.pens ? ` (${this.pens[0]}-${this.pens[1]} en los penales)` : ''}.`)
  }
  private shootout() {
    const sc: [number, number] = [0, 0]
    const takers = this.sides.map(s => [...s.on].filter(x => x.pos !== 'GK').sort((x, y) => (at(y.p, 'fin') + at(y.p, 'com')) - (at(x.p, 'fin') + at(x.p, 'com'))))
    const kick = (i: number, n: number) => {
      const t = takers[i][n % Math.max(1, takers[i].length)], gk = this.sides[1 - i].on.find(x => x.pos === 'GK')
      const p = 0.74 + ((t ? at(t.p, 'fin') + at(t.p, 'com') : 20) - 24) * 0.008 - ((gk ? at(gk.p, 'one') + at(gk.p, 'ref') : 16) - 24) * 0.006
      if (this.rng.chance(clamp(p, 0.45, 0.93))) sc[i]++
    }
    for (let n = 0; n < 5; n++) { kick(0, n); kick(1, n); const left = 4 - n; if (sc[0] > sc[1] + left || sc[1] > sc[0] + left) break }
    let n = 5
    while (sc[0] === sc[1]) { kick(0, n); kick(1, n); n++ }
    this.pens = sc
    this.ev(120, 'info', sc[0] > sc[1] ? 0 : 1, `Definición por penales: ${this.sides[sc[0] > sc[1] ? 0 : 1].club.name} gana ${Math.max(...sc)}-${Math.min(...sc)}.`)
  }

  // ---------- faltas y tarjetas ----------
  private foul(si: 0 | 1, min: number) {
    const S = this.sides[si]
    const c = S.on.filter(x => x.pos !== 'GK')
    if (!c.length) return
    this.stats.fouls[si]++
    this.card(si, this.rng.weighted(c, x => at(x.p, 'agg') + (20 - at(x.p, 'tck')) * 0.4 + ZONE_W[x.pos][0] * 8), min, 1)
  }
  private card(si: 0 | 1, f: OnPitch, min: number, k: number) {
    const S = this.sides[si]
    const mod = [0.75, 1, 1.35][S.tactic.tackling] * (0.6 + at(f.p, 'agg') / 25) * k * (1 + ((f.p.pers?.temp ?? 10) - 10) * 0.03)
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
    if (gkId && S.subs < 5) { this.doSub(si, out, gkId, min); this.setPos(S.on.find(x => x.p.id === gkId)!, 'GK') }
    else { this.setPos(out, 'GK'); this.ev(min, 'info', si, `${this.nm(out)} se pone los guantes en ${S.club.short}.`) }
  }
  private setPos(x: OnPitch, pos: Pos, role?: string, chx?: number) {
    x.pos = pos; x.line.pos = pos; x.role = ROLE[role && ROLE[role]?.pos.includes(pos) ? role : defaultRole(pos)]; x.ch = chOf(chx ?? POS_X[pos])
  }

  private injury(si: 0 | 1, min: number) {
    const S = this.sides[si]
    if (!S.on.length) return
    const x = this.rng.weighted(S.on, o => 130 - o.cond)
    if (this.rng.chance(0.45)) return
    const [desc, a, b] = this.rng.weighted(INJ, i => 1 / Math.sqrt(i[1]))
    this.injuries.push({ pid: x.p.id, days: this.rng.int(a, b), desc })
    this.ev(min, 'inj', si, `${this.nm(x)} (${S.club.short}) queda tendido y no puede seguir.`, x.p.id)
    const inId = this.pickSub(S, x)
    if (inId != null && S.subs < 5) this.doSub(si, x, inId, min)
    else { this.remove(S, x); if (x.pos === 'GK') this.coverGk(si, min) }
    this.dirty = true
  }

  // ---------- cambios y órdenes ----------
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
    const n = this.mkOn(this.players[inId], out.pos, out.role, out.ch, si, false, this.tick)
    S.on.splice(idx, 1, n); S.off.push(out)
    S.bench = S.bench.filter(i => i !== inId)
    S.subs++
    this.ev(min, 'sub', si, `Cambio en ${S.club.short}: entra ${n.p.name} por ${out.p.name}.`, out.p.id, inId)
    this.dirty = true
  }
  substitute(si: 0 | 1, outPid: number, inPid: number): boolean {
    const S = this.sides[si]
    const out = S.on.find(x => x.p.id === outPid)
    if (!out || !S.bench.includes(inPid) || S.subs >= 5 || this.finished) return false
    this.doSub(si, out, inPid, this.minute)
    return true
  }
  swap(si: 0 | 1, a: number, b: number) {
    const S = this.sides[si], x = S.on.find(o => o.p.id === a), y = S.on.find(o => o.p.id === b)
    if (!x || !y) return
    const [px, rx, cx] = [x.pos, x.role.id, x.ch]
    this.setPos(x, y.pos, y.role.id); x.ch = y.ch
    this.setPos(y, px, rx); y.ch = cx
    this.dirty = true
  }
  setRole(si: 0 | 1, pid: number, role: string) {
    const x = this.sides[si].on.find(o => o.p.id === pid)
    if (x && ROLE[role]?.pos.includes(x.pos)) { x.role = ROLE[role]; this.dirty = true }
  }
  setTactic(si: 0 | 1, patch: Partial<Tactic>) {
    const S = this.sides[si]
    const oldF = S.tactic.formation
    Object.assign(S.tactic, patch)
    if (patch.formation && patch.formation !== oldF) { this.reshape(S); S.fam = Math.max(0.9, S.fam - 0.02) } // cambiar el dibujo en pleno partido cuesta
    this.dirty = true
  }
  /** Orden sobre un rival puntual. */
  toggleOppo(si: 0 | 1, pid: number, k: 'tight' | 'hard' | 'press') {
    const t = this.sides[si].tactic
    t.oppo ??= {}
    const o = (t.oppo[pid] ??= {})
    o[k] = !o[k]
  }
  setManMark(si: 0 | 1, by: number, target: number) { this.sides[si].tactic.manMark = by && target ? { by, target } : null }
  /** Charla del entretiempo: 0 calma, 1 exigir, 2 felicitar. */
  /** Charla antes del partido: 0 tranquilidad, 1 exigencia, 2 orgullo. Depende de si el equipo es favorito. */
  preTalk(si: 0 | 1, kind: 0 | 1 | 2): string {
    const S = this.sides[si], O = this.sides[1 - si]
    const fav = S.club.rep - O.club.rep + (si === 0 && !this.opts.neutral ? 4 : -4)
    const eff = kind === 0 ? 0.012 : kind === 1 ? (fav > 3 ? 0.025 : fav < -3 ? -0.01 : 0.012) : fav < -3 ? 0.03 : fav > 3 ? -0.005 : 0.01
    S.talk = eff; this.dirty = true
    return eff >= 0.02 ? 'El plantel salió a la cancha enchufado.' : eff > 0 ? 'El equipo escuchó con atención.' : 'La charla no cayó bien: se los vio tensos.'
  }
  teamTalk(si: 0 | 1, kind: 0 | 1 | 2): string {
    const S = this.sides[si], d = S.goals - this.sides[1 - si].goals
    const eff = kind === 0 ? (d < 0 ? 0.005 : 0.01) : kind === 1 ? (d < 0 ? 0.03 : d === 0 ? 0.015 : -0.02) : d > 0 ? 0.02 : -0.025
    S.talk = eff; this.dirty = true
    return eff >= 0.02 ? 'El plantel salió enchufado.' : eff > 0 ? 'El equipo escuchó con atención.' : 'La charla cayó mal en el vestuario.'
  }
  private reshape(S: Side) {
    const all = FORMATIONS[S.tactic.formation].filter(s => s.pos !== 'GK')
    const pl = S.on.filter(x => x.pos !== 'GK')
    const use = [...all].sort((a, b) => ZONE_W[a.pos][2] - ZONE_W[b.pos][2]).slice(0, pl.length)
    const free = new Set(pl)
    for (const sl of use) {
      const b = best([...free], x => posRating(x.p, sl.pos))
      this.setPos(b, sl.pos, undefined, sl.x); free.delete(b)
    }
    S.tactic.roles = fixRoles(S.tactic.formation, undefined)
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
    if (want !== S.tactic.mentality) { S.tactic.mentality = want; S.tactic.onWin = diff > 0 ? 1 : S.club.tactic.onWin; this.dirty = true }
  }

  view(si: 0 | 1) {
    const S = this.sides[si]
    return { on: S.on.map(x => ({ pid: x.p.id, pos: x.pos, role: x.role.id, cond: x.cond, rating: this.liveRating(x, S), yellow: x.yellow, goals: x.line.goals })), bench: S.bench, subs: S.subs, tactic: S.tactic, goals: S.goals }
  }
  private liveRating(x: OnPitch, S: Side): number {
    const si = S === this.sides[0] ? 0 : 1, O = this.sides[1 - si]
    const share = Math.min(1, Math.max(1, x.line.mins) / 60)
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
    return { hg: h.goals, ag: a.goals, pens: this.pens, et: this.et, stats: this.stats, events: this.events, lines, injuries: this.injuries, motm, cond, shots: this.shots }
  }
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
export type { PlayKind }
