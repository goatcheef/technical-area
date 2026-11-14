// Navegación superior: secciones con menús desplegables (sin barra lateral) y, a la derecha,
// favoritos, ajustes, ayuda y el menú del DT. En el celular se usa la barra inferior.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Game } from '../engine/types'
import { Badge, Face, ManagerFace } from './common'

export interface Group { id: string; label: string; icon: ReactNode; pages: [string, string, ReactNode][] }

export function TopNav({ g, groups, page, go, badge, onOpenPlayer, onOpenClub, onSettings, onHelp, onMainMenu, favActive }: {
  g: Game; groups: Group[]; page: string; go: (p: string) => void; badge: (id: string) => ReactNode
  onOpenPlayer: (id: number) => void; onOpenClub: (id: number) => void; onSettings: () => void; onHelp: () => void; onMainMenu: () => void; favActive: (k: 'p' | 'c', id: number) => boolean
}) {
  const [open, setOpen] = useState<string | null>(null)
  const bar = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!bar.current?.contains(e.target as Node)) setOpen(null) }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [])
  useEffect(() => setOpen(null), [page])
  const hover = (id: string | null) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(id), id ? 90 : 160) }
  const pick = (p: string) => { setOpen(null); go(p) }
  const focusFirst = (id: string) => setTimeout(() => bar.current?.querySelector<HTMLElement>(`[data-menu="${id}"] button`)?.focus(), 0)
  const menuKeys = (e: React.KeyboardEvent, id: string) => {
    const items = [...(bar.current?.querySelectorAll<HTMLElement>(`[data-menu="${id}"] button`) ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(null); bar.current?.querySelector<HTMLElement>(`[data-group="${id}"]`)?.focus() }
  }
  const favs = (g.favs ?? []).filter(f => (f.k === 'p' ? g.players[f.id] : g.clubs[f.id]))
  const Menu = ({ id, children, right }: { id: string; children: ReactNode; right?: boolean }) =>
    open === id ? <div className={`tn-menu ${right ? 'right' : ''}`} data-menu={id} role="menu" onKeyDown={e => menuKeys(e, id)} onMouseEnter={() => hover(id)} onMouseLeave={() => hover(null)}>{children}</div> : null
  return (
    <nav ref={bar} className="topnav" aria-label="Secciones">
      {groups.map(gr => {
        const on = gr.pages.some(p => p[0] === page), multi = gr.pages.length > 1
        return (
          <div key={gr.id} className="tn-item" onMouseEnter={() => multi && open && hover(gr.id)} onMouseLeave={() => multi && hover(null)}>
            <button className={`nav tn ${on ? 'on' : ''}`} title={gr.label} data-group={gr.id} data-page={gr.pages[0][0]} aria-current={on ? 'page' : undefined}
              aria-haspopup={multi ? 'menu' : undefined} aria-expanded={multi ? open === gr.id : undefined}
              onClick={() => (multi ? setOpen(open === gr.id ? null : gr.id) : pick(gr.pages[0][0]))}
              onKeyDown={e => { if (multi && e.key === 'ArrowDown') { e.preventDefault(); setOpen(gr.id); focusFirst(gr.id) } }}>
              {gr.icon}<span>{gr.label}</span>{gr.pages.map(p => <span key={p[0]} className="tn-badge">{badge(p[0])}</span>)}{multi && <svg className="chev" viewBox="0 0 24 24" aria-hidden><path d="M6 9l6 6 6-6" /></svg>}
            </button>
            {multi && <Menu id={gr.id}>{gr.pages.map(([id, label, icon]) => <button key={id} role="menuitem" className={`tn-opt ${page === id ? 'on' : ''}`} onClick={() => pick(id)}>{icon}<span className="grow">{label}</span>{badge(id)}</button>)}</Menu>}
          </div>)
      })}
      <span className="grow" />
      <div className="tn-item">
        <button className="tn-icon" aria-label="Favoritos" title="Favoritos" aria-haspopup="menu" aria-expanded={open === 'favs'} onClick={() => setOpen(open === 'favs' ? null : 'favs')} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen('favs'); focusFirst('favs') } }}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>{favs.length > 0 && <span className="tn-count">{favs.length}</span>}
        </button>
        <Menu id="favs" right>{favs.length ? favs.map(f => { const p = f.k === 'p' ? g.players[f.id] : undefined, c = f.k === 'c' ? g.clubs[f.id] : undefined
          return <button key={`${f.k}${f.id}`} role="menuitem" className={`tn-opt ${favActive(f.k, f.id) ? 'on' : ''}`} data-pid={p?.id} data-cid={c?.id} onClick={() => { setOpen(null); p ? onOpenPlayer(p.id) : onOpenClub(c!.id) }}>{p ? <Face p={p} size={22} /> : <Badge club={c!} size={22} />}<span className="grow ell">{p ? p.name : c!.name}</span></button> })
          : <div className="dim sm" style={{ padding: '8px 10px', maxWidth: 240 }}>Marcá jugadores o clubes con "☆ Favorito" en su ficha y aparecen acá.</div>}</Menu>
      </div>
      <button className="tn-icon" aria-label="Atajos de teclado" title="Atajos de teclado (?)" onClick={onHelp}><svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" /></svg></button>
      <button className="tn-icon" aria-label="Ajustes" title="Ajustes" onClick={onSettings}><svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg></button>
      <div className="tn-item">
        <button className="tn-me" aria-label="Menú del DT" aria-haspopup="menu" aria-expanded={open === 'me'} onClick={() => setOpen(open === 'me' ? null : 'me')} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen('me'); focusFirst('me') } }}>
          <ManagerFace a={g.manager.avatar} size={30} /><span className="tn-me-t"><b className="ell">{g.manager.name}</b><span className="dim">Prestigio {Math.round(g.manager.rep)}</span></span>
        </button>
        <Menu id="me" right>
          <button role="menuitem" className="tn-opt" onClick={() => { setOpen(null); go('club') }}>Club y carrera del DT</button>
          <button role="menuitem" className="tn-opt" onClick={() => { setOpen(null); onSettings() }}>Ajustes</button>
          <button role="menuitem" className="tn-opt" onClick={() => { setOpen(null); onHelp() }}>Atajos de teclado</button>
          <button role="menuitem" className="tn-opt" onClick={() => { setOpen(null); onMainMenu() }}>Guardar y volver al menú principal</button>
        </Menu>
      </div>
    </nav>
  )
}
