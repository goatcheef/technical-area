/** Generador determinista (mulberry32). El estado es un entero serializable. */
export class Rng {
  s: number
  constructor(seed: number) { this.s = seed >>> 0 }
  next(): number {
    let t = (this.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(a: number, b: number): number { return a + Math.floor(this.next() * (b - a + 1)) }
  chance(p: number): boolean { return this.next() < p }
  gauss(): number {
    let u = 0
    while (u === 0) u = this.next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.next())
  }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)] }
  weighted<T>(items: readonly T[], w: (t: T) => number): T {
    let tot = 0
    for (const it of items) tot += Math.max(0, w(it))
    let r = this.next() * tot
    for (const it of items) { r -= Math.max(0, w(it)); if (r <= 0) return it }
    return items[items.length - 1]
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = this.int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]] }
    return arr
  }
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
