// Navegación en dos niveles (sin barra lateral): arriba las secciones, abajo las pantallas de la sección activa.
// Cada sección abre además un menú al pasar el mouse o con flecha abajo. En el celular se usa la barra inferior.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Game } from '../engine/types'
import { Badge, Face, ManagerFace } from './common'

export interface Group { id: string; label: string; icon: ReactNode; pages: [string, string, ReactNode][] }

/** Menús desplegables con cierre al hacer clic afuera y navegación con flechas. */
function useMenus() {
  const [open, setOpen] = useState<string | null>(null)
  const root = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(null) }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [])
  const hover = (id: string | null) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(id), id ? 110 : 180) }
  const focusFirst = (id: string) => setTimeout(() => root.current?.querySelector<HTMLElement>(`[data-menu="${id}"] button`)?.focus(), 0)
  const keys = (e: React.KeyboardEvent, id: string) => {
    const items = [...(root.current?.querySelectorAll<HTMLElement>(`[data-menu="${id}"] button`) ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(null); root.current?.querySelector<HTMLElement>(`[data-opens="${id}"]`)?.focus() }
  }
  const Menu = ({ id, children, right }: { id: string; children: ReactNode; right?: boolean }) =>
    open === id ? <div className={`tn-menu ${right ? 'right' : ''}`} data-menu={id} role="menu" onKeyDown={e => keys(e, id)} onMouseEnter={() => hover(id)} onMouseLeave={() => hover(null)}>{children}</div> : null
  const opener = (id: string) => ({
    'data-opens': id, 'aria-haspopup': 'menu' as const, 'aria-expanded': open === id,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(id); focusFirst(id) } },
  })
  return { open, setOpen, root, hover, Menu, opener }
}

/** Fila de arriba: secciones grandes. Clic en la sección lleva a su primera pantalla; el menú muestra todas. */
export function Sections({ groups, active, go, badge }: { groups: Group[]; active: string; go: (p: string) => void; badge: (id: string) => ReactNode }) {
  const m = useMenus()
  return (
    <nav ref={m.root} className="sections" aria-label="Secciones">
      {groups.map(gr => {
        const on = gr.id === active, b = gr.pages.map(p => badge(p[0])).find(Boolean)
        return (
          <div key={gr.id} className="tn-item" onMouseEnter={() => gr.pages.length > 1 && m.hover(gr.id)} onMouseLeave={() => m.hover(null)}>
            <button className={`nav sec ${on ? 'on' : ''}`} data-group={gr.id} data-page={gr.pages[0][0]} title={gr.label} aria-current={on ? 'true' : undefined}
              {...(gr.pages.length > 1 ? m.opener(gr.id) : {})} onClick={() => { m.setOpen(null); go(gr.pages[0][0]) }}>
              <span className="sec-ico">{gr.icon}</span><span className="sec-l">{gr.label}</span>{b}{gr.pages.length > 1 && <svg className="chev" viewBox="0 0 24 24" aria-hidden><path d="M6 9l6 6 6-6" /></svg>}
            </button>
            {gr.pages.length > 1 && <m.Menu id={gr.id}>{gr.pages.map(([id, label, icon]) => <button key={id} role="menuitem" className="tn-opt" onClick={() => { m.setOpen(null); go(id) }}>{icon}<span className="grow">{label}</span>{badge(id)}</button>)}</m.Menu>}
          </div>)
      })}
    </nav>
  )
}

/** Herramientas de la fila de arriba: buscar, favoritos, ayuda y ajustes en un mismo bloque. */
export function Tools({ g, search, onFind, onOpenPlayer, onOpenClub, onSettings, onHelp }: {
  g: Game; search: ReactNode; onFind: () => void; onOpenPlayer: (id: number) => void; onOpenClub: (id: number) => void; onSettings: () => void; onHelp: () => void
}) {
  const m = useMenus()
  const favs = (g.favs ?? []).filter(f => (f.k === 'p' ? g.players[f.id] : g.clubs[f.id]))
  return (
    <div ref={m.root as React.RefObject<HTMLDivElement>} className="tools">
      {search}
      <button className="tn-icon" aria-label="Barra de comandos" title="Buscar todo y saltar a cualquier pantalla (Ctrl + K)" onClick={onFind}><svg viewBox="0 0 24 24" aria-hidden><path d="M4 6h16M4 12h10M4 18h16" /><path d="M18 10l3 2-3 2" /></svg></button>
      <div className="tn-item">
        <button className="tn-icon" aria-label="Favoritos" title="Favoritos" {...m.opener('favs')} onClick={() => m.setOpen(m.open === 'favs' ? null : 'favs')}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>{favs.length > 0 && <span className="tn-count">{favs.length}</span>}
        </button>
        <m.Menu id="favs" right>{favs.length ? favs.map(f => { const p = f.k === 'p' ? g.players[f.id] : undefined, c = f.k === 'c' ? g.clubs[f.id] : undefined
          return <button key={`${f.k}${f.id}`} role="menuitem" className="tn-opt" data-pid={p?.id} data-cid={c?.id} onClick={() => { m.setOpen(null); p ? onOpenPlayer(p.id) : onOpenClub(c!.id) }}>{p ? <Face p={p} size={22} /> : <Badge club={c!} size={22} />}<span className="grow ell">{p ? p.name : c!.name}</span></button> })
          : <div className="dim sm" style={{ padding: '8px 10px', maxWidth: 240 }}>Marcá jugadores o clubes con "☆ Favorito" en su ficha y aparecen acá.</div>}</m.Menu>
      </div>
      <button className="tn-icon" aria-label="Atajos de teclado" title="Atajos de teclado (?)" onClick={onHelp}><svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" /></svg></button>
      <button className="tn-icon" aria-label="Ajustes" title="Ajustes" onClick={onSettings}><svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg></button>
    </div>
  )
}

/** Fila de abajo: las pantallas de la sección activa y, a la derecha, lo pendiente y el menú del DT. */
export function SubNav({ g, group, page, go, badge, right, onSettings, onHelp, onMainMenu }: {
  g: Game; group: Group; page: string; go: (p: string) => void; badge: (id: string) => ReactNode; right: ReactNode
  onSettings: () => void; onHelp: () => void; onMainMenu: () => void
}) {
  const m = useMenus()
  return (
    <nav ref={m.root} className="subnav" aria-label={`Pantallas de ${group.label}`}>
      {group.pages.map(([id, label]) => <button key={id} data-page={id} className={`nav sub ${page === id ? 'on' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>{id === 'home' ? 'Resumen' : label}{badge(id)}</button>)}
      <span className="grow" />
      {right}
      <div className="tn-item">
        <button className="tn-me" aria-label="Menú del DT" {...m.opener('me')} onClick={() => m.setOpen(m.open === 'me' ? null : 'me')}>
          <ManagerFace a={g.manager.avatar} size={26} /><span className="tn-me-t"><b className="ell">{g.manager.name}</b><span className="dim">Prestigio {Math.round(g.manager.rep)}</span></span>
          <svg className="chev" viewBox="0 0 24 24" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <m.Menu id="me" right>
          <button role="menuitem" className="tn-opt" onClick={() => { m.setOpen(null); go('club') }}>Club y carrera del DT</button>
          <button role="menuitem" className="tn-opt" onClick={() => { m.setOpen(null); onSettings() }}>Ajustes</button>
          <button role="menuitem" className="tn-opt" onClick={() => { m.setOpen(null); onHelp() }}>Atajos de teclado</button>
          <button role="menuitem" className="tn-opt" onClick={() => { m.setOpen(null); onMainMenu() }}>Guardar y volver al menú principal</button>
        </m.Menu>
      </div>
    </nav>
  )
}
