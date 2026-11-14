// Estado global mínimo + guardado en IndexedDB.
import { createContext, useContext, useState } from 'react'
import type { Game } from './engine/types'

/** Una pantalla del juego. Las fichas llevan el id del jugador o del club. */
export interface Route { page: string; id?: number; tab?: string }
export interface Settings { density: 'comfy' | 'compact'; text: number; matchSpeed: number; matchMode: 'full' | 'key'; home?: { id: string; size: number }[]; matchPanels?: { id: string; slot: 'side' | 'bottom' | 'off' }[]; bigPitch?: boolean }
export const DEFAULT_SETTINGS: Settings = { density: 'comfy', text: 100, matchSpeed: 1, matchMode: 'full' }
export function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('ta-settings') ?? '{}') } } catch { return DEFAULT_SETTINGS }
}
export function storeSettings(s: Settings) { try { localStorage.setItem('ta-settings', JSON.stringify(s)) } catch { /* sin almacenamiento: los ajustes duran la sesión */ } }

export interface Ctx {
  g: Game
  refresh: () => void
  go: (page: string) => void
  nav: (r: Route) => void
  back: () => void
  openPlayer: (id: number) => void
  openClub: (id: number) => void
  save: () => void
  openPress: () => void
  settings: Settings
  setSettings: (s: Settings) => void
}
export const GameCtx = createContext<Ctx>(null as unknown as Ctx)
export const useGame = () => useContext(GameCtx)

const DB = 'technical-area', STORE = 'saves'
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
export async function saveGame(g: Game): Promise<void> {
  try {
    const db = await open()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(JSON.stringify(g), 'auto')
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error)
    })
  } catch (e) { console.warn('No se pudo guardar', e) }
}
export async function loadGame(): Promise<Game | null> {
  try {
    const db = await open()
    const raw = await new Promise<string | undefined>((res, rej) => {
      const r = db.transaction(STORE).objectStore(STORE).get('auto')
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
    })
    return raw ? (JSON.parse(raw) as Game) : null
  } catch { return null }
}
export async function deleteSave(): Promise<void> {
  try { const db = await open(); db.transaction(STORE, 'readwrite').objectStore(STORE).delete('auto') } catch { /* sin guardado */ }
}
export function exportGame(g: Game) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(g)], { type: 'application/json' }))
  a.download = `technical-area-${g.clubs[g.userClubId].code}-${g.date}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Estado de pantalla que sobrevive a la navegación (filtros, orden, pestañas): volver atrás deja todo como estaba. */
const sticky = new Map<string, unknown>()
export function useSticky<T>(key: string, init: T | (() => T)): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (sticky.has(key) ? (sticky.get(key) as T) : typeof init === 'function' ? (init as () => T)() : init))
  return [v, (x: T) => { sticky.set(key, x); setV(x) }]
}
