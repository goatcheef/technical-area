// Estado global mínimo + guardado en IndexedDB.
import { createContext, useContext } from 'react'
import type { Game } from './engine/types'

export interface Ctx {
  g: Game
  refresh: () => void
  go: (page: string) => void
  openPlayer: (id: number) => void
  save: () => void
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
