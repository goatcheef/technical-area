// Cancha 2D: representación animada de cada minuto del partido.
// El motor decide qué pasa (posesión, remate, resultado); acá se dibuja una jugada coherente con eso.
import { useEffect, useRef } from 'react'
import type { MatchSim } from '../engine/match'
import { FORMATIONS, POS_LINE } from '../engine/positions'
import type { Player, Pos, Shot } from '../engine/types'
import { ink } from './common'

interface Dot { pid: number; side: 0 | 1; num: number; name: string; pos: Pos; bx: number; by: number; x: number; y: number; tx: number; ty: number }
interface Play { t0: number; dur: number; pts: { x: number; y: number; pid?: number }[]; shot: Shot | null; shotAt: number; end: { x: number; y: number } | null; poss: 0 | 1 }

const GEN: Record<Pos, [number, number]> = { GK: [50, 4], DR: [85, 24], DC: [50, 20], DL: [15, 24], DM: [50, 38], MC: [50, 50], MR: [85, 54], ML: [15, 54], AMC: [50, 66], AMR: [82, 74], AML: [18, 74], ST: [50, 84] }
const W = 1050, H = 680, M = 28 // lienzo lógico
const px = (l: number) => M + (l / 100) * (W - 2 * M), py = (w: number) => M + (w / 100) * (H - 2 * M)

function layout(sim: MatchSim, players: Record<number, Player>, prev: Map<number, Dot>): Dot[] {
  const out: Dot[] = []
  for (const side of [0, 1] as const) {
    const v = sim.view(side), slots = FORMATIONS[v.tactic.formation].map(s => ({ ...s, used: false }))
    const cnt: Record<string, number> = {}
    for (const o of v.on) {
      let sl = slots.find(s => !s.used && s.pos === o.pos)
      let x: number, y: number
      if (sl) { sl.used = true; x = sl.x; y = sl.y } else { const k = (cnt[o.pos] = (cnt[o.pos] ?? 0) + 1); [x, y] = GEN[o.pos]; x += (k % 2 ? 1 : -1) * 12 * Math.ceil(k / 2) }
      const l = 5 + y * 0.6, bx = side === 0 ? l : 100 - l, by = side === 0 ? x : 100 - x
      const old = prev.get(o.pid), p = players[o.pid]
      out.push({ pid: o.pid, side, num: p.num, name: p.name.split(' ').slice(-1)[0], pos: o.pos, bx, by, x: old?.x ?? bx, y: old?.y ?? by, tx: bx, ty: by })
    }
  }
  return out
}

/** Arma la jugada del minuto: cadena de pases del equipo con la pelota y, si hubo, el remate. */
function buildPlay(sim: MatchSim, dots: Dot[], seed: number, dur: number): Play {
  let s = seed >>> 0
  const rnd = () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296)
  const f = sim.frame, dir = f.poss === 0 ? 1 : -1
  const mine = dots.filter(d => d.side === f.poss && d.pos !== 'GK').sort((a, b) => (a.bx - b.bx) * dir)
  const pts: Play['pts'] = []
  if (!mine.length) return { t0: performance.now(), dur, pts: [{ x: 50, y: 50 }], shot: null, shotAt: 1, end: null, poss: f.poss }
  const shot = f.shot
  const n = shot ? 3 : 2 + Math.floor(rnd() * 3)
  let i = Math.floor(rnd() * Math.max(1, mine.length * 0.45))
  const reach = shot ? mine.length - 1 : Math.floor(mine.length * (0.35 + rnd() * 0.6))
  for (let k = 0; k < n; k++) {
    const d = mine[Math.min(mine.length - 1, i)]
    pts.push({ x: d.bx + dir * (6 + rnd() * 10) + (k / n) * dir * 10, y: d.by + (rnd() - 0.5) * 14, pid: d.pid })
    i += 1 + Math.floor(rnd() * Math.max(1, (reach - i) / Math.max(1, n - k - 1)))
  }
  let end: Play['end'] = null
  if (shot) {
    const sx = f.poss === 0 ? 100 - (shot.y / 105) * 100 : (shot.y / 105) * 100, sy = f.poss === 0 ? shot.x : 100 - shot.x
    const as = dots.find(d => d.pid === shot.ast)
    if (as) pts[pts.length - 1] = { x: sx - dir * (8 + rnd() * 12), y: Math.min(94, Math.max(6, sy + (rnd() - 0.5) * 44)), pid: as.pid }
    pts.push({ x: sx, y: sy, pid: shot.pid })
    const gx = f.poss === 0 ? 100 : 0, sg = rnd() < 0.5 ? -1 : 1
    end = shot.out === 'goal' ? { x: gx + dir * 1.6, y: 50 + sg * rnd() * 4.5 } : shot.out === 'saved' ? { x: gx - dir * 2.5, y: 50 + sg * rnd() * 3 }
      : shot.out === 'post' ? { x: gx, y: 50 + sg * 5.6 } : shot.out === 'block' ? { x: sx + (gx - sx) * 0.45, y: sy + (50 - sy) * 0.4 } : { x: gx + dir * 3, y: 50 + sg * (9 + rnd() * 9) }
  }
  for (const p of pts) { p.x = Math.min(98, Math.max(2, p.x)); p.y = Math.min(96, Math.max(4, p.y)) }
  return { t0: performance.now(), dur, pts, shot, shotAt: shot ? 0.72 : 1, end, poss: f.poss }
}

function ballAt(pl: Play, u: number): { x: number; y: number; z: number; holder?: number } {
  const { pts } = pl
  if (pl.end && u >= pl.shotAt) {
    const k = Math.min(1, (u - pl.shotAt) / (1 - pl.shotAt) / 0.55), a = pts[pts.length - 1]
    return { x: a.x + (pl.end.x - a.x) * k, y: a.y + (pl.end.y - a.y) * k, z: Math.sin(Math.PI * k) * 0.6 }
  }
  const v = Math.min(0.9999, u / pl.shotAt) * (pts.length - 1), i = Math.floor(v), a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)]
  const k = Math.min(1, (v - i) / 0.6) // 60 % del tramo viajando, 40 % controlada
  const e = k * k * (3 - 2 * k)
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: Math.sin(Math.PI * e) * 0.25, holder: k >= 1 ? b.pid : k <= 0 ? a.pid : undefined }
}

export function Pitch2D({ sim, players, colors, tickMs }: { sim: MatchSim; players: Record<number, Player>; colors: [string, string]; tickMs: number }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const st = useRef<{ dots: Dot[]; play: Play | null; tick: number; ball: { x: number; y: number }; flash: number; flashSide: 0 | 1 }>({ dots: [], play: null, tick: -1, ball: { x: 50, y: 50 }, flash: 0, flashSide: 0 })
  const tick = sim.tick

  // nuevo minuto: reubicar jugadores y armar la jugada
  useEffect(() => {
    const S = st.current
    S.dots = layout(sim, players, new Map(S.dots.map(d => [d.pid, d])))
    if (tick > 0 && tick !== S.tick) {
      S.play = buildPlay(sim, S.dots, sim.opts.seed + tick * 7919, Math.max(120, tickMs * 0.96))
      if (S.play.shot?.out === 'goal') { S.flash = performance.now() + S.play.dur * S.play.shotAt + 150; S.flashSide = S.play.poss }
    }
    S.tick = tick
  }, [tick, sim, players, tickMs])

  useEffect(() => {
    const c = cv.current!, ctx = c.getContext('2d')!
    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const S = st.current, dt = Math.min(0.05, (now - last) / 1000); last = now
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = c.clientWidth
      if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(((cw * H) / W) * dpr) }
      const k = c.width / W
      ctx.setTransform(k, 0, 0, k, 0, 0)
      // césped
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#135238' : '#155a3d'; ctx.fillRect((i * W) / 12, 0, W / 12 + 1, H) }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5
      ctx.strokeRect(px(0), py(0), px(100) - px(0), py(100) - py(0))
      ctx.beginPath(); ctx.moveTo(px(50), py(0)); ctx.lineTo(px(50), py(100)); ctx.stroke()
      ctx.beginPath(); ctx.arc(px(50), py(50), 62, 0, Math.PI * 2); ctx.stroke()
      for (const g of [0, 1]) {
        const x0 = g ? px(100) : px(0), d = g ? -1 : 1
        ctx.strokeRect(g ? x0 - 150 : x0, py(50) - 132, 150, 264); ctx.strokeRect(g ? x0 - 52 : x0, py(50) - 60, 52, 120)
        ctx.beginPath(); ctx.arc(x0 + d * 104, py(50), 3, 0, 7); ctx.fillStyle = '#fff'; ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(g ? x0 : x0 - 16, py(50) - 24, 16, 48); ctx.strokeRect(g ? x0 : x0 - 16, py(50) - 24, 16, 48)
      }
      // pelota y objetivo de cada jugador
      const pl = S.play
      let ball = S.ball, holder: number | undefined, z = 0
      if (pl) { const u = Math.max(0, Math.min(1, (now - pl.t0) / pl.dur)); const b = ballAt(pl, u); ball = S.ball = { x: b.x, y: b.y }; holder = b.holder; z = b.z }
      const poss = pl?.poss ?? 0
      for (const d of S.dots) {
        const att = d.side === poss, dir = d.side === 0 ? 1 : -1
        const gk = d.pos === 'GK', line = POS_LINE[d.pos]
        const push = (ball.x - 50) * (gk ? 0.06 : 0.5) + (gk ? 0 : att ? dir * (line === 'FW' ? 9 : 5) : -dir * 3)
        d.tx = Math.min(99, Math.max(1, d.bx + push)); d.ty = d.by + (ball.y - 50) * (gk ? 0.12 : att ? 0.16 : 0.3)
        if (pl) {
          const idx = pl.pts.findIndex(p => p.pid === d.pid)
          if (idx >= 0) { d.tx = pl.pts[idx].x; d.ty = pl.pts[idx].y }
          else if (!att && !gk) { const dx = ball.x - d.tx, dy = ball.y - d.ty, dist = Math.hypot(dx, dy); if (dist < 26) { d.tx += dx * 0.45; d.ty += dy * 0.45 } }
        }
        const sp = Math.min(1, dt * (holder === d.pid ? 9 : 4.2))
        d.x += (d.tx - d.x) * sp; d.y += (d.ty - d.y) * sp
      }
      // jugadores
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (const d of S.dots) {
        const X = px(d.x), Y = py(d.y), col = d.pos === 'GK' ? (d.side === 0 ? '#f5c518' : '#ff7ad9') : colors[d.side]
        ctx.beginPath(); ctx.ellipse(X, Y + 13, 12, 4.5, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill()
        ctx.beginPath(); ctx.arc(X, Y, 13.5, 0, 7); ctx.fillStyle = col; ctx.fill()
        ctx.lineWidth = holder === d.pid ? 3.5 : 2; ctx.strokeStyle = holder === d.pid ? '#fff' : 'rgba(0,0,0,.55)'; ctx.stroke()
        ctx.fillStyle = ink(col); ctx.font = '700 13px Inter, sans-serif'; ctx.fillText(String(d.num), X, Y + 0.5)
        if (holder === d.pid || pl?.shot?.pid === d.pid) { ctx.font = '650 13px Inter, sans-serif'; const w = ctx.measureText(d.name).width + 10; ctx.fillStyle = 'rgba(6,10,14,.8)'; ctx.fillRect(X - w / 2, Y - 34, w, 17); ctx.fillStyle = '#fff'; ctx.fillText(d.name, X, Y - 25) }
      }
      // pelota
      const BX = px(ball.x), BY = py(ball.y)
      ctx.beginPath(); ctx.ellipse(BX, BY + 5, 6, 2.5, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill()
      ctx.beginPath(); ctx.arc(BX, BY - z * 34, 6 + z * 3, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111'; ctx.stroke()
      // festejo de gol
      const fl = now - S.flash
      if (S.flash && fl > 0 && fl < 1800) {
        const a = fl < 200 ? fl / 200 : fl > 1400 ? (1800 - fl) / 400 : 1
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = colors[S.flashSide]; ctx.fillRect(0, H / 2 - 62, W, 124)
        ctx.globalAlpha = a; ctx.fillStyle = ink(colors[S.flashSide]); ctx.font = '700 96px "Barlow Condensed", sans-serif'; ctx.fillText('¡GOOOL!', W / 2, H / 2 + 6); ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [colors])

  return <canvas ref={cv} style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', borderRadius: 12 }} aria-label="Cancha con la jugada en curso" />
}
