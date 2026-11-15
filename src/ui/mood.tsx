// Piezas del vestuario que se ven en varias pantallas (production/ui/vestuario/visual-design.md, secciones 4 y 5.7): una escala para la
// conformidad, otra para la moral, la barra de minutos, la tendencia, la personalidad en palabras, el texto de la charla usada y la comparación
// de los dos caminos para dejarlo ir. Un concepto, un componente: la tabla, la LockerCard, la charla, la ficha y la bandeja usan estas.
// Los datos salen del motor (moodOf, moraleOf, minutesOf, moodOutlook, persTraits, talkState, letGoInfo); acá solo se dibujan.
import type { ReactNode } from 'react'
import { fmtDay } from '../engine/game'
import { moodOf, moraleOf, type LetGoInfo, type Minutes, type Trait, type Trend } from '../engine/squad'
import { dec } from './common'
import { MI } from './deal'
import { ic } from './msg'

/** Íconos nuevos del vestuario (manifiesto de assets, sección 11). */
export const VI = {
  trendDown: ic('M12 5v14M6 13l6 6 6-6'),
  trendUp: ic('M12 19V5M6 11l6-6 6 6'),
  flat: ic('M6 12h12', 2.8),
  pause: ic('M9 6v12M15 6v12', 2.6),
  minus: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12h8'),
  down: ic('M6 9l6 6 6-6', 2.6),
}
const pc = (v: number) => dec(Math.round(v * 100))

type Tone = 'lo' | 'mid' | 'hi'
/** Una escala ordinal cortada en tramos: el relleno tiene el largo del valor y un solo tono por banda (rojo, gris, blanco; nunca semáforo). */
function Scale({ v, cuts, tone, word, size = 'md', num = true }: { v: number; cuts: number[]; tone: Tone; word: string; size?: 'sm' | 'md' | 'kpi'; num?: boolean }) {
  const edges = [0, ...cuts, 100]
  return <span className={`vt-scale ${size} ${tone}`}>
    <span className="vt-track" aria-hidden="true">{edges.slice(1).map((hi, i) => { const lo = edges[i]; return <i key={i} style={{ flexGrow: hi - lo, ['--f' as string]: Math.max(0, Math.min(1, (v - lo) / (hi - lo))) }} /> })}</span>
    {num && size !== 'kpi' && <span className="vt-scale-n">{Math.floor(v)}</span>}
    <span className="vt-scale-w">{word}</span>
  </span>
}
const moodTone = (v: number): Tone => (v < 35 ? 'lo' : v < 60 ? 'mid' : 'hi')
/** Conformidad (`moodOf`): número y palabra siempre a la vista. */
export function MoodBar({ v, size = 'md' }: { v: number; size?: 'sm' | 'md' | 'kpi' }) {
  const m = moodOf(v)
  return <Scale v={v} cuts={[18, 35, 60, 80]} tone={moodTone(v)} word={m.word} size={size} />
}
/** Moral (`moraleOf`): número y palabra; `word` solo: un ajeno con el informe completo (la palabra, sin número ni pista). */
export function MoraleBar({ v, size = 'md' }: { v: number; size?: 'sm' | 'md' | 'kpi' }) {
  const m = moraleOf(v)
  return <Scale v={v} cuts={[35, 60, 80]} tone={moodTone(v)} word={m.word} size={size} />
}
/** Armonía: el tono del medidor (por debajo de 45 el equipo rinde menos). */
export const harmonyTone = (v: number): Tone => (v < 45 ? 'lo' : v < 70 ? 'mid' : 'hi')

/** Minutos jugados contra esperados, con la marca donde empieza a molestarse (`minutesOf`). `sm`: celda de tabla, apilada. */
export function MinsBar({ m, size = 'md', promise }: { m: Minutes; size?: 'sm' | 'md'; promise?: { got: number; pass: number; bad: boolean } }) {
  const got = promise ? promise.got : m.got, mark = promise ? promise.pass : m.tol > 0 ? m.threshold : null
  const low = promise ? promise.bad : m.nextDelta < 0
  const n = m.recent.length
  if (!promise && n < 2) {
    return size === 'sm' ? <span className="vt-mins sm none"><span className="vt-mins-t dim">—</span><span className="vt-mins-s">Todavía no cuenta (jugó {n})</span></span>
      : <span className="vt-mins md none"><span className="vt-mins-t dim">—</span><span className="vt-mins-s">Todavía no cuenta: sus minutos empiezan a mover la conformidad en su tercer partido (jugó {n}).</span></span>
  }
  const track = <span className="vt-mins-track" aria-hidden="true"><i style={{ width: `${Math.min(100, got * 100)}%` }} />{mark != null && <b className="vt-mins-mark" style={{ left: `${Math.min(100, mark * 100)}%` }} />}</span>
  if (size === 'sm') return <span className={`vt-mins sm ${low ? 'low' : ''}`}>
    <span className="vt-mins-t">{m.tol === 0 ? <><b>{pc(got)}</b>{' %'}</> : <><b>{pc(got)}</b>/{pc(m.expected)}{' %'}</>}</span>{track}{m.tol === 0 && <span className="vt-mins-s">no le pesa</span>}
    {!m.counts ? null : n === 2 && <span className="vt-mins-s">cuenta desde el próximo partido</span>}
  </span>
  return <span className={`vt-mins md ${low ? 'low' : ''}`}>
    <span className="vt-mins-row">{track}<span className="vt-mins-t">{promise ? <><b>{pc(got)}{' %'}</b> desde que prometiste</> : <><b>{pc(got)}{' %'}</b> de {pc(m.expected)}{' %'}</>}</span></span>
    {!promise && <span className="vt-mins-s">{m.tol === 0 ? 'Con su rol no se molesta por los minutos.' : `se molesta por debajo de ${pc(m.threshold)} %${m.tol === 0.5 ? ', pero la mitad de rápido que un titular' : ''}`}</span>}
    {!promise && n === 2 && <span className="vt-mins-s">Desde el próximo partido, sus minutos cuentan.</span>}
  </span>
}

/** Tendencia de la conformidad (`moodOutlook`), con ícono de forma y la palabra clave. */
export function Trend({ t, idle }: { t: Trend; idle?: 'injury' | 'susp' }) {
  if (t === 'sin datos') return null
  const [i, w, rest]: [ReactNode, string, string] = t === 'baja' ? [VI.trendDown, 'baja', ' tras cada partido si sigue jugando así'] : t === 'sube' ? [VI.trendUp, 'sube', ' tras cada partido si sigue jugando así']
    : t === 'estable' ? [VI.flat, 'estable', ''] : [VI.pause, 'en pausa', idle === 'susp' ? ': suspendido para el próximo partido' : ': lesionado, mientras no juegue no cambia']
  return <span className="vt-trend">{i}<span><b>{w[0].toUpperCase() + w.slice(1)}</b>{rest}</span></span>
}

/** Personalidad en palabras (`persTraits`): lista de dos columnas o en línea. "Normal" y "Tranquilo" en tenue; lo que distingue, en 700. */
export function Traits({ traits, inline }: { traits: Trait[]; inline?: boolean }) {
  const quiet = (t: Trait) => t.word === 'Normal' || t.word === 'Tranquilo'
  if (inline) return <span className="vt-traits inline">{traits.map((t, i) => <span key={t.key}>{i > 0 && ' · '}<span className={quiet(t) ? 'vt-q' : ''}>{t.text}</span></span>)}</span>
  return <dl className="vt-traits">{traits.map(t => <div key={t.key}><dt>{t.name}</dt><dd className={quiet(t) ? 'vt-q' : ''}>{t.word}</dd></div>)}</dl>
}

/** El texto de la charla usada (`talkState`), con su reloj. Recibe el foco por programa, no es una parada de Tab. */
export function TalkSt({ text, big, id }: { text: string; big?: boolean; id?: string }) {
  // las fechas en 700: "Hablaron el 12 nov · de nuevo desde el 19 nov"
  const parts = text.split(/(\d{1,2} [a-z]{3})/)
  return <span className={`vt-talkst ${big ? 'big' : ''}`} tabIndex={-1} id={id}>{MI.clock}<span>{parts.map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s))}</span></span>
}

/** "Declararlo transferible" contra "Decirle que puede buscar club", con los números de `letGoInfo` (pregunta 5). */
export function LetGo({ info, id }: { info: LetGoInfo; id?: string }) {
  const t = info.talk, sg = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`), w = info.window
  const offers = w.open
    ? <>Con los dos, mientras el libro de pases está abierto, llegan más ofertas por él (la chance de cada día pasa del <b>{dec(info.offerChance.now * 100)} %</b> al <b>{dec(info.offerChance.listed * 100)} %</b>), y los clubes que lo buscan para reforzar un puesto ofrecen sobre un precio un <b>{dec((1 - info.price.factor) * 100)} %</b> más bajo; las demás ofertas no cambian.</>
    : !w.nextSeason ? <>Con el libro cerrado no llegan ofertas: vuelven a llegar cuando reabra, el <b>{fmtDay(w.opensOn!)}</b>.</>
    : <>Con el libro cerrado no llegan ofertas hasta la temporada <b>{w.opensOn!.slice(0, 4)}</b> (reabre el <b>{fmtDay(w.opensOn!)}</b>), y al comenzarla se vacía la lista de transferibles: si sigue queriendo irse, el pedido vuelve a Para decidir.</>
  return <div className="ib-conseq vt-letgo" id={id}>
    <p><b>Declararlo transferible</b>: queda en la lista ya, sin gastar la charla; su conformidad y su moral no cambian{info.list.staysOut ? ' y sigue queriendo irse' : ''}.</p>
    <p><b>"Decirle que puede buscar club"</b> (charla{t.from ? <>, desde el <b>{fmtDay(t.from)}</b></> : null}): {t.becomesOut
      ? <>queda transferible, pero como no lo pidió, conformidad <b>{sg(t.happy)}</b> y moral <b>{sg(t.morale)}</b>, y pasa a querer irse{t.from ? '' : '; gasta la charla de esta semana'}.</>
      : <>lo mismo y, como lo pidió, conformidad <b>{sg(t.happy)}</b> y moral <b>{sg(t.morale)}</b>{t.from ? '' : '; gasta la charla de esta semana'}.</>}</p>
    <p className="vt-letgo-o">{MI.swap}<span>{offers}</span></p>
  </div>
}

/** Frase del libro para la nota de "Declararlo transferible" (7.2; pregunta 50: nunca promete ofertas con el libro cerrado). */
export function listedNote(name: string, info: LetGoInfo, wantsOut: boolean): string {
  const w = info.window
  const book = w.open ? 'Las ofertas van a llegar a la bandeja.' : !w.nextSeason ? `Las ofertas van a llegar cuando reabra el libro, el ${fmtDay(w.opensOn!)}.`
    : `Con el libro cerrado no van a llegar ofertas esta temporada, y la nueva (${fmtDay(w.opensOn!)}) vacía la lista de transferibles.`
  return `Declaraste transferible a ${name}. ${book}${wantsOut ? ' Sigue queriendo irse: su humor no cambió.' : ''}`
}
