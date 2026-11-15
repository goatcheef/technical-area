// La mesa no despeja la personalidad (mercado.md, pregunta 37, criterio de la sección 14; verificación m2): en modo `buy`, con
// ambición 1, 10 y 20 y todo lo demás igual, `demand` da los mismos términos y cada una de cinco ofertas, evaluada contra un `demand`
// recién calculado, da la misma respuesta visible. Solo cambia la paciencia (y por ella, en qué ronda se levanta).
// Uso: npx tsx tests/engine/negotiation.ts
import { readFileSync } from 'node:fs'
import { STATUS, STATUS_KEYS, demand, demandWage, evalOffer, naturalStatusFor, persOf, type Demand } from '../../src/engine/squad'
import type { Player, Terms } from '../../src/engine/types'
import { clone, done, eq, makeGame, ok, sec } from './helpers'

const base = makeGame()
const ME = base.userClubId
Object.assign(base.clubs[ME], { wageBudget: 1e9, balance: 1e9 }) // sin controles duros: se comparan las respuestas del representante
const AMBS = [1, 10, 20]
const visible = (r: ReturnType<typeof evalOffer>) => ({ ok: r.ok, msg: r.msg, wage: r.counter?.wage, bonus: r.counter?.bonus, status: r.counter?.status })

sec('Cinco ofertas contra un demand fresco, con ambición 1, 10 y 20')
const cands = Object.values(base.players).filter(p => p.clubId !== ME && base.clubs[p.clubId].division >= 1).filter((_, i) => i % 37 === 0).slice(0, 40)
let walksDiffer = 0
for (const p0 of cands) {
  const runs = AMBS.map(amb => {
    const g = clone(base), p = g.players[p0.id]
    p.pers = { ...persOf(p), amb }
    const nat = naturalStatusFor(g, p), fresh = (): Demand => demand(g, p, 'buy', nat)
    const d0 = fresh(), t = d0.terms
    const first: Terms = { ...t, wage: Math.round((t.wage * 0.9) / 100) * 100, bonus: Math.round((t.bonus * 0.6) / 1000) * 1000, clause: 0 }
    const lower = STATUS_KEYS[Math.min(STATUS_KEYS.length - 1, STATUS_KEYS.indexOf(t.status) + 1)]
    const offers: Terms[] = [first, { ...first, status: lower }, { ...first, clause: Math.round(p.value * 1.5) }, { ...first, clause: Math.round(p.value * 5) }]
    // la contraoferta devuelta, reenviada tal cual (si la primera propuesta ya cierra, como con los de 30 años o más, la del rol menor)
    const back = evalOffer(g, p, 'buy', first, { ...fresh(), patience: 99 }).counter ?? evalOffer(g, p, 'buy', offers[1], { ...fresh(), patience: 99 }).counter
    offers.push(back ?? first)
    // cifras visibles, cada oferta contra un demand recién calculado y sin que la paciencia corte la mesa
    const figs = offers.map(o => visible(evalOffer(g, p, 'buy', o, { ...fresh(), patience: 99 })))
    // aparte: con la paciencia real, en qué ronda se levanta repitiendo la oferta del rol menor
    const dem = fresh(); let walk = 0
    for (let i = 1; i <= 5 && !walk; i++) if (evalOffer(g, p, 'buy', offers[1], dem).walk) walk = i
    return { terms: d0.terms, patience: d0.patience, figs, walk, ask: demandWage(g, p) }
  })
  eq(runs[0].terms, runs[1].terms, `${p0.name}: demand igual con ambición 1 y 10`)
  eq(runs[1].terms, runs[2].terms, `${p0.name}: demand igual con ambición 10 y 20`)
  eq(runs[0].figs, runs[1].figs, `${p0.name}: respuestas iguales con ambición 1 y 10`)
  eq(runs[1].figs, runs[2].figs, `${p0.name}: respuestas iguales con ambición 10 y 20`)
  ok(runs[0].figs.length === 5, `${p0.name}: cinco ofertas evaluadas`)
  eq(runs.map(r => r.patience), [3, 3, 2], `${p0.name}: solo la paciencia depende de la ambición`)
  eq(runs[0].ask, runs[2].ask, `${p0.name}: el sueldo que pediría no depende de la ambición`)
  if (runs[2].walk !== runs[0].walk) walksDiffer++
  ok(runs[2].walk <= runs[0].walk || !runs[0].walk, `${p0.name}: el impaciente se levanta antes o igual`)
}
console.log(`  (${cands.length} jugadores; en ${walksDiffer} la ronda de la ruptura cambia por la paciencia)`)

sec('El margen del representante sale del id')
{
  const g = clone(base), p = g.players[cands[0].id], twin: Player = { ...clone(base).players[p.id], id: 987654 }
  g.players[twin.id] = twin
  const nat = naturalStatusFor(g, p)
  const a = demand(g, p, 'buy', nat).terms, b = demand(g, twin, 'buy', nat).terms
  ok(a.wage !== b.wage || a.bonus !== b.bonus, 'dos ajenos iguales salvo el id piden distinto')
  eq(demand(g, p, 'buy', nat).terms, a, 'repetir con el mismo id da lo mismo')
  const ratio = a.bonus / a.wage
  ok(ratio >= 1.8 && ratio <= 4.2, `prima entre 2 y 4 sueldos (${ratio.toFixed(2)})`)
}

sec('Revisión de código: la ambición solo en la paciencia y en las ramas de renovación')
{
  const src = readFileSync(new URL('../../src/engine/squad.ts', import.meta.url), 'utf8')
  const body = (name: string) => { const i = src.indexOf(`export function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)) }
  const dem = body('demand'), ev = body('evalOffer')
  const buyPart = dem.slice(0, dem.indexOf("const base = Math.max(p.wage * 1.08"))
  ok(buyPart.split('\n').filter(l => /amb/.test(l)).every(l => /patience = q\.amb/.test(l)), 'demand (compra): amb solo en patience')
  ok(ev.split('\n').filter(l => /persOf\(p\)\.amb|q\.amb/.test(l)).every(l => /renew \?/.test(l)), 'evalOffer: la ambición solo con renew')
  ok(!/q\.amb/.test(ev), 'evalOffer no usa q.amb')
  ok(STATUS.reg.wage === 1.1, 'factores de rol intactos')
}

done('La mesa no despeja la personalidad')
