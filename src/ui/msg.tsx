// Anatomía de los mensajes, compartida por la bandeja y el mosaico "Mensajes" del Inicio: íconos por tema, nombres y encabezado de día.
import type { ReactNode } from 'react'

export const TAG_NAME: Record<string, string> = { partido: 'Partido', torneo: 'Torneo', lesion: 'Parte médico', club: 'Club', mercado: 'Mercado', premio: 'Premio', directiva: 'Dirigencia' }
/** Ícono de trazo (24 × 24); el significado va siempre en el texto o en el aria-label del botón. */
export const ic = (d: string, w = 2.4) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
export const TAG_ICON: Record<string, ReactNode> = {
  partido: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7l3 2-1 4h-4l-1-4z'), torneo: ic('M8 4h8v5a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M12 13v4M9 20h6'),
  lesion: ic('M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z'), club: ic('M16 20v-1a4 4 0 0 0-8 0v1M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1a3 3 0 0 0-2-2.8M4 20v-1a3 3 0 0 1 2-2.8'),
  mercado: ic('M4 7h13l-3-3M20 17H7l3 3'), premio: ic('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'), directiva: ic('M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6'),
}
/** Íconos de la bandeja (manifiesto del diseño visual, sección 10). */
export const IC = {
  dec: ic('M12 7v6.5M12 17h.01', 2.6),
  bang: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5.5M12 16.5h.01'),
  clock: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2'),
  check: ic('M5 12.5l4.5 4.5L19 7.5', 2.8),
  x: ic('M6 6l12 12M18 6L6 18'),
  next: ic('M9 6l6 6-6 6', 2.8),
  prev: ic('M15 6l-6 6 6 6', 2.8),
  back: ic('M19 12H5M11 6l-6 6 6 6'),
  inbox: ic('M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5'),
  search: ic('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5'),
}

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const day = (d: string) => Math.round(Date.parse(d + 'T12:00:00Z') / 86400000)
/** "sáb 14 nov" (con el año si no es el de hoy). */
export function shortDay(d: string, today: string): string {
  const t = new Date(d + 'T12:00:00Z')
  return `${WD[t.getUTCDay()]} ${t.getUTCDate()} ${MS[t.getUTCMonth()]}${d.slice(0, 4) !== today.slice(0, 4) ? ` ${d.slice(0, 4)}` : ''}`
}
/** Encabezado de día: "Hoy · sáb 14 nov", "Ayer · vie 13 nov" o la fecha. */
export function DayHead({ d, today, id }: { d: string; today: string; id?: string }) {
  const diff = day(today) - day(d), rel = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : ''
  return <div className="msg-day" id={id}>{rel ? <><b>{rel}</b> · {shortDay(d, today)}</> : shortDay(d, today)}</div>
}
export const daysUntil = (d: string, today: string) => day(d) - day(today)

/** Interior de una fila de mensaje: ícono del tema, remitente (tipo en negrita · entidad) y título; a la derecha, chip y punto de sin leer. */
export function MsgBody({ ico, kind, who, title, extra, tag, unread, chev }: { ico: ReactNode; kind: string; who?: string; title: ReactNode; extra?: ReactNode; tag?: ReactNode; unread?: boolean; chev?: boolean }) {
  return <>
    {ico}
    <span className="grow" style={{ minWidth: 0 }}>
      <span className="msg-from"><b>{kind}</b>{who && <span className="ell">{'\u00a0· '}{who}</span>}</span>
      <span className="msg-t">{title}</span>
      {extra}
    </span>
    {tag}
    <span className="msg-dotcol">{unread && <span className="msg-dot" role="img" aria-label="Sin leer" />}</span>
    {chev && <span className="msg-chev">{IC.next}</span>}
  </>
}
