// Propiedades de `wageShown` (mercado.md, sección 8, "Rango de los sueldos"; verificación m3): siempre contiene el valor real, el cociente
// hi/lo no depende del sueldo (con la tolerancia del redondeo), es determinista, no está centrado, cruzar los rangos de días sucesivos no
// achica la franja por debajo de la que se muestra (rangos anidados) y es exacto desde 95 % de conocimiento o para un jugador propio.
// Uso: npx tsx tests/engine/wage-shown.ts
import { demandWage, wageShown, wageStep } from '../../src/engine/squad'
import { Rng } from '../../src/engine/rng'
import { clone, done, eq, makeGame, ok, sec } from './helpers'

const g = makeGame()
const ME = g.userClubId
const ajenos = Object.values(g.players).filter(p => p.clubId !== ME && g.clubs[p.clubId].division >= 1)
const rng = new Rng(7)
const unit = (x: number) => (x < 10000 ? 100 : 1000)

sec('Escalones')
eq([wageStep(20), wageStep(35), wageStep(50), wageStep(60), wageStep(70), wageStep(80), wageStep(90), wageStep(94), wageStep(95), wageStep(100)], [16, 13, 10, 8, 6, 4, 2, 1, 0, 0], 'medio ancho 2 % por escalón (tabla de la spec)')

sec('Contiene el valor real y el cociente no depende del sueldo')
{
  let n = 0, bad = 0, badRatio = 0
  for (let i = 0; i < 6000; i++) {
    const p = ajenos[i % ajenos.length], k = 20 + rng.next() * 79, salt = i % 2 ? 401 : 402
    const v = i % 3 === 0 ? p.wage : i % 3 === 1 ? Math.round(500 + rng.next() * 150000) : demandWage(g, p)
    g.know[p.id] = k
    const [lo, hi] = wageShown(g, p, v, salt), j = wageStep(k)
    n++
    if (!(lo <= v && v <= hi)) bad++
    if (j) {
      const raw = (1 + j * 0.02) / (1 - j * 0.02), r = hi / lo, tol = (hi / (hi - unit(hi))) * ((lo + unit(lo)) / lo)
      if (!(r >= raw * 0.9999 && r <= raw * tol * 1.0001)) badRatio++
    } else if (lo !== v || hi !== v) bad++
  }
  eq(bad, 0, `${n} casos: el rango siempre contiene el real`)
  eq(badRatio, 0, 'el cociente hi/lo es (1 + w)/(1 − w), agrandado a lo sumo por el redondeo hacia afuera')
}

sec('50 ajenos al 35 %: no centrado, determinista')
{
  let off = 0
  for (const p of ajenos.slice(0, 50)) {
    g.know[p.id] = 35
    for (const [v, salt] of [[p.wage, 401], [demandWage(g, p), 402]] as const) {
      const r = wageShown(g, p, v, salt)
      eq(wageShown(g, p, v, salt), r, 'mirar dos veces da lo mismo')
      if ((r[0] + r[1]) / 2 !== v) off++
    }
  }
  ok(off >= 80, `en ${off} de 100 rangos el punto medio no coincide con el real (pide al menos 40 de 50 por cada sueldo)`)
}

sec('Cruzar los rangos de días sucesivos no achica la franja')
{
  let worse = 0, trips = 0
  for (const p of ajenos.slice(0, 1500)) {
    const r = new Rng(p.id), rate = 3 + r.next() * 7
    for (const salt of [401, 402]) {
      const v = salt === 401 ? p.wage : demandWage(g, p)
      let k = 20 + r.next() * 20, lo = -Infinity, hi = Infinity
      while (k < 100) {
        g.know[p.id] = k
        const s = wageShown(g, p, v, salt)
        lo = Math.max(lo, s[0]); hi = Math.min(hi, s[1])
        if (lo !== s[0] || hi !== s[1]) worse++ // lo que se sabe cruzando todo lo visto es más que lo que muestra hoy
        k += r.chance(0.15) ? 12 : rate * (0.8 + r.next() * 0.4)
        trips++
      }
    }
  }
  eq(worse, 0, `${trips} días de ojeo: la intersección de lo visto es siempre el rango de hoy`)
}

sec('Exacto desde 95 % y para los propios')
{
  const p = ajenos[0], v = p.wage
  g.know[p.id] = 94.9; ok(wageShown(g, p, v, 401)[0] < v || wageShown(g, p, v, 401)[1] > v, 'al 94,9 % todavía es rango')
  g.know[p.id] = 95; eq(wageShown(g, p, v, 401), [v, v], 'al 95 %, exacto')
  const own = Object.values(g.players).find(x => x.clubId === ME)!
  eq(wageShown(g, own, own.wage, 401), [own.wage, own.wage], 'propio: exacto')
  const g2 = clone(g); delete g2.know[p.id]
  ok(wageShown(g2, g2.players[p.id], v, 402)[1] > v, 'sin ojear: rango ancho')
}

done('wageShown')
