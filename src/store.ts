// Estado global mínimo + guardado en IndexedDB.
import { createContext, useContext, useState } from 'react'
import type { Game } from './engine/types'

/** Una pantalla del juego. Las fichas llevan el id del jugador o del club; `sel` es lo elegido dentro de la pantalla (p. ej. el mensaje abierto). */
export interface Route { page: string; id?: number; tab?: string; sel?: string }
export interface Settings { density: 'comfy' | 'compact'; text: number; matchSpeed: number; matchMode: 'full' | 'key'; home?: { id: string; size: number; rows?: number }[]; homeV?: number; matchPanels?: { id: string; slot: 'side' | 'bottom' | 'off' }[]; bigPitch?: boolean
  /** Accesibilidad y ayudas */
  motion?: 'auto' | 'reduce'; cvd?: boolean; tips?: boolean; tourDone?: boolean; seenTips?: string[]
  /** Atajos de una sola tecla (Espacio, Mayús + Espacio, 0-9, / y ?); `false` los apaga (AM-03). Sin definir: encendidos. */
  singleKeys?: boolean }
export const DEFAULT_SETTINGS: Settings = { density: 'comfy', text: 100, matchSpeed: 1, matchMode: 'full' }
export function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('ta-settings') ?? '{}') } } catch { return DEFAULT_SETTINGS }
}
export function storeSettings(s: Settings) { try { localStorage.setItem('ta-settings', JSON.stringify(s)) } catch { /* sin almacenamiento: los ajustes duran la sesión */ } }

export interface Ctx {
  g: Game
  /** La entrada actual del historial: al volver atrás, la pantalla recupera su pestaña y su selección de acá. */
  route: Route
  refresh: () => void
  go: (page: string) => void
  nav: (r: Route) => void
  back: () => void
  openPlayer: (id: number) => void
  openClub: (id: number) => void
  /** Guarda la partida; `false` si falló (el aviso del armazón lo muestra). */
  save: () => Promise<boolean>
  /** El error del último guardado, hasta que uno salga bien. */
  lastSaveError: SaveError | null
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
/** Falla al guardar la partida en IndexedDB (sin espacio, almacenamiento bloqueado o navegación privada). */
export class SaveError extends Error {
  constructor(readonly cause?: unknown) { super('No se pudo guardar la partida'); this.name = 'SaveError' }
}
let lastSaveError: SaveError | null = null
/** El error del último guardado, o `null` si salió bien. */
export const getLastSaveError = () => lastSaveError
/** Guarda la partida. Devuelve `false` si falló (y deja el error en `getLastSaveError`): lo hecho sigue en memoria, pero no en el disco. */
export async function saveGame(g: Game): Promise<boolean> {
  try {
    const db = await open()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(JSON.stringify(g), 'auto')
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error ?? new Error('Guardado cancelado'))
    })
    lastSaveError = null
    return true
  } catch (e) {
    console.warn('No se pudo guardar', e)
    lastSaveError = new SaveError(e)
    return false
  }
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
