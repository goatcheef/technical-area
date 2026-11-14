// Primera partida guiada: un recorrido corto que señala las partes del juego, y ayudas que aparecen
// la primera vez que se entra a cada pantalla (se pueden apagar en Ajustes).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useGame } from '../store'

interface Step { sel?: string; title: string; text: ReactNode }
function steps(club: string, objective: string): Step[] {
  return [
    { title: `Bienvenido a ${club}`, text: <>Sos el nuevo DT. La dirigencia te pide: <b>{objective.toLowerCase()}</b>. En un minuto te mostramos dónde está cada cosa; podés saltear la guía cuando quieras.</> },
    { sel: '.top .cta', title: 'El tiempo avanza día por día', text: <>"Continuar" pasa un día (o juega el partido si es hoy). "Ir al partido" avanza hasta la fecha y frena solo si llega algo para decidir. Con el teclado: <span className="kbd">Espacio</span>.</> },
    { sel: '.subnav [data-page="inbox"]', title: 'La bandeja de entrada', text: 'Ofertas, prensa, informes y pedidos de jugadores llegan acá, con los botones para responder en el mismo mensaje. Lo pendiente también aparece en esta fila, a la derecha.' },
    { sel: '.subnav [data-page="tables"]', title: 'Inicio: la competición', text: 'Cada sección muestra sus pantallas en esta segunda fila. En Inicio están el resumen, la bandeja, el calendario, el fixture, las posiciones y las estadísticas.' },
    { sel: '.sections [data-group="squad"]', title: 'Plantel', text: 'El plantel (una tabla con vistas, columnas a elección y selección múltiple), el vestuario y el cuerpo técnico. Pasá el mouse sobre cualquier nombre para ver su ficha breve.' },
    { sel: '.sections [data-group="match"]', title: 'Partido', text: 'Tácticas (dibujo, once, roles e instrucciones), el entrenamiento de la semana y el centro de datos con tu xG, el desgaste del plantel y cómo juegan los rivales.' },
    { sel: '.sections [data-group="market"]', title: 'Mercado', text: 'Buscá jugadores, mandalos a ojear, ofertá y respondé las ofertas por los tuyos. El libro de pases abre en enero y en julio.' },
    { sel: '.subnav .tn-me', title: 'Atajos y ajustes', text: <>Con <span className="kbd">Ctrl + K</span> buscás jugadores, clubes y pantallas; con <span className="kbd">?</span> ves todos los atajos. Arriba están tus favoritos, la ayuda y los ajustes: densidad, texto, movimiento y colores para daltonismo.</> },
  ]
}

export function Guide({ onDone }: { onDone: () => void }) {
  const { g } = useGame()
  const list = steps(g.clubs[g.userClubId].name, g.board.objective)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const s = list[i]
  useLayoutEffect(() => {
    const find = () => {
      const el = s.sel ? (document.querySelector(s.sel) as HTMLElement | null) : null
      const r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null
      setRect(r && r.width > 0 ? r : null)
    }
    find()
    window.addEventListener('resize', find)
    return () => window.removeEventListener('resize', find)
  }, [i, s.sel])
  useEffect(() => { card.current?.querySelector<HTMLButtonElement>('.btn.primary')?.focus() }, [i])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onDone() }
      else if (e.key === 'ArrowRight') setI(x => Math.min(list.length - 1, x + 1))
      else if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [list.length, onDone])
  // la tarjeta va al lado del elemento señalado, sin salirse de la pantalla
  const W = 340, vw = window.innerWidth, vh = window.innerHeight
  let pos: React.CSSProperties = { left: Math.max(12, (vw - W) / 2), top: Math.max(12, vh / 2 - 120) }
  if (rect) {
    const right = rect.right + 16 + W < vw, below = rect.bottom + 220 < vh
    pos = right && rect.width < 300 ? { left: rect.right + 16, top: Math.min(vh - 240, Math.max(12, rect.top - 10)) }
      : below ? { left: Math.min(vw - W - 12, Math.max(12, rect.left + rect.width / 2 - W / 2)), top: rect.bottom + 14 }
        : { left: Math.min(vw - W - 12, Math.max(12, rect.left + rect.width / 2 - W / 2)), top: Math.max(12, rect.top - 230) }
  }
  return (
    <div className="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      {rect ? <div className="guide-spot" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} /> : <div className="guide-dim" />}
      <div ref={card} className="guide-card" style={{ ...pos, width: Math.min(W, vw - 24) }}>
        <div className="row between"><span className="dim sm">Paso {i + 1} de {list.length}</span><button className="linkish dim sm" onClick={onDone}>Saltear la guía</button></div>
        <h2 id="guide-title" style={{ textTransform: 'none', fontSize: '1.35rem' }}>{s.title}</h2>
        <div className="sm" style={{ lineHeight: 1.55, color: 'var(--dim)' }}>{s.text}</div>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          {i > 0 && <button className="btn sm" onClick={() => setI(i - 1)}>Anterior</button>}
          <button className="btn primary sm" onClick={() => (i < list.length - 1 ? setI(i + 1) : onDone())}>{i < list.length - 1 ? 'Siguiente' : 'A jugar'}</button>
        </div>
        <div className="guide-dots" aria-hidden>{list.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
      </div>
    </div>
  )
}

// ---------- ayudas por pantalla ----------
const TIPS: Record<string, { title: string; text: string }> = {
  squad: { title: 'El plantel', text: 'Cambiá de vista (General, Físico, Contrato), elegí columnas y ordená por varias a la vez con Mayús + clic. Marcá jugadores con la casilla para mandarlos a la reserva, al banco o compararlos.' },
  tactics: { title: 'Tácticas', text: 'Tocá un jugador del once y después a otro para cambiarlos. Cada rol cambia lo que hace en el puesto. La familiaridad sube si repetís el dibujo: cambiarlo seguido cuesta rendimiento.' },
  training: { title: 'Entrenamiento', text: 'Más intensidad mejora más rápido pero cansa y lesiona más. El día después del partido conviene descansar. Si no querés ocuparte, delegalo en el ayudante.' },
  locker: { title: 'Vestuario', text: 'Cada jugador espera minutos según su rol. Si no los tiene, baja su conformidad y puede pedir irse. Hablale, prometele minutos o acordá otro rol.' },
  market: { title: 'Mercado', text: 'De los jugadores ajenos ves rangos: mandalos a ojear para conocerlos mejor antes de ofertar. El libro de pases abre en enero y en julio.' },
  inbox: { title: 'Bandeja', text: 'Lo que tenés que decidir está siempre arriba, con su plazo: las ofertas y los trabajos vencen. Cada mensaje trae los botones para resolverlo.' },
  data: { title: 'Centro de datos', text: 'El xG mide la calidad de las ocasiones. Si convertís mucho más de lo que generás, probablemente no dure: mirá el xG para saber si el equipo juega bien.' },
}
export function PageTip({ id }: { id: string }) {
  const { settings, setSettings } = useGame()
  const t = TIPS[id]
  if (!t || settings.tips === false || (settings.seenTips ?? []).includes(id)) return null
  return (
    <div className="pagetip" role="note">
      <span className="pagetip-i" aria-hidden>i</span>
      <div className="grow"><b>{t.title}.</b> <span className="dim">{t.text}</span></div>
      <button className="btn sm" onClick={() => setSettings({ ...settings, seenTips: [...(settings.seenTips ?? []), id] })}>Entendido</button>
    </div>
  )
}
