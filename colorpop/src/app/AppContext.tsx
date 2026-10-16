import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { sfx } from '../audio/sfx'
import { Dictionary } from '../game/dictionary'
import { loadSave, writeSave, type SaveData, type StorageLike } from '../game/save'
import type { GameState } from '../game/types'
import { LEVELS } from '../game/content'

export type Screen =
  | { name: 'menu' }
  | { name: 'map'; focus?: string }
  | { name: 'inventory'; back: Screen }
  | { name: 'settings'; back: Screen }
  | { name: 'game'; levelId: string; resume?: GameState; key: number }

interface AppCtx {
  save: SaveData
  updateSave: (fn: (s: SaveData) => SaveData) => void
  dict: Dictionary | null
  dictError: string | null
  reduced: boolean
  screen: Screen
  go: (s: Screen) => void
  storage: StorageLike | null
}

const Ctx = createContext<AppCtx | null>(null)

export function getStorage(): StorageLike | null {
  try {
    const k = '__cpq_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return window.localStorage
  } catch {
    return null
  }
}

let dictPromise: Promise<Dictionary> | null = null
export function loadDictionary(): Promise<Dictionary> {
  if (!dictPromise) {
    dictPromise = fetch(`${import.meta.env.BASE_URL}dict/de-words.txt`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((t) => Dictionary.fromText(t))
    dictPromise.catch(() => (dictPromise = null))
  }
  return dictPromise
}

function useSystemReducedMotion(): boolean {
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setV(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return !!v
}

export function AppProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(getStorage, [])
  const [save, setSave] = useState<SaveData>(() => loadSave(storage))
  const [dict, setDict] = useState<Dictionary | null>(null)
  const [dictError, setDictError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>(() => {
    // Development-only entry point: exercise full rounds through the real UI.
    const levelId = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('playtest') : null
    return levelId && LEVELS.some(l => l.id === levelId) ? { name: 'game', levelId, key: Date.now() } : { name: 'menu' }
  })
  const systemReduced = useSystemReducedMotion()
  const reduced = save.settings.motion === 'reduced' || (save.settings.motion === 'system' && systemReduced)

  useEffect(() => {
    let alive = true
    const attempt = () =>
      loadDictionary()
        .then((d) => alive && setDict(d))
        .catch((e) => alive && setDictError(String(e?.message ?? e)))
    attempt()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    sfx.enabled = save.settings.sound
  }, [save.settings.sound])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced)
  }, [reduced])

  const updateSave = useCallback(
    (fn: (s: SaveData) => SaveData) => {
      setSave((prev) => {
        const next = fn(prev)
        writeSave(storage, next)
        return next
      })
    },
    [storage],
  )

  const go = useCallback((s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }, [])

  const value = useMemo<AppCtx>(
    () => ({ save, updateSave, dict, dictError, reduced, screen, go, storage }),
    [save, updateSave, dict, dictError, reduced, screen, go, storage],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp outside provider')
  return c
}
