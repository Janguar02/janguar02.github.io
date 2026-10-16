import { BOSSES, LEVELS } from './content'
import { ITEMS, sanitizeEquipped, STARTER_ITEMS } from './items'
import type { Difficulty, GameState, ItemId, LevelDef, MomentId } from './types'
import { MOMENTS } from './moments'
import { applyProgress, levelFromXp, runXp, SKINS, type SkinId, type Unlock, type XpPart } from './progression'
import { CELLS } from './types'
import { ENERGY_LIMIT, MISSION_LABELS } from './missions'

export const SAVE_KEY = 'colorpopquest.save.v1'
export const RUN_KEY = 'colorpopquest.run.v1'
export const SAVE_VERSION = 1

export interface LevelProgress {
  completed: boolean
  stars: number
  bestScore: number
}

export interface Settings {
  sound: boolean
  /** 'system' follows prefers-reduced-motion. */
  motion: 'full' | 'reduced' | 'system'
  difficulty: Difficulty
}

export interface SaveData {
  version: number
  coins: number
  owned: ItemId[]
  equipped: ItemId[]
  levels: Record<string, LevelProgress>
  settings: Settings
  tutorialSeen: boolean
  /** Player experience – the player level is derived from it. */
  xp: number
  /** Wortmeister moments ever earned (count per moment). */
  achievements: Partial<Record<MomentId, number>>
  skins: SkinId[]
  skin: SkinId
  /** Level intro cards already shown. */
  introsSeen: string[]
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    owned: [...STARTER_ITEMS],
    equipped: [...STARTER_ITEMS],
    levels: {},
    settings: { sound: true, motion: 'system', difficulty: 'normal' },
    tutorialSeen: false,
    xp: 0,
    achievements: {},
    skins: ['cream'],
    skin: 'cream',
    introsSeen: [],
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Parses and sanitises stored data; corrupt or foreign data falls back to defaults. */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave()
  if (!raw) return base
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return base
  }
  if (!isObj(data) || data.version !== SAVE_VERSION) return base
  const owned = Array.isArray(data.owned)
    ? [...new Set([...STARTER_ITEMS, ...data.owned.filter((i): i is ItemId => typeof i === 'string' && i in ITEMS)])]
    : base.owned
  const levels: Record<string, LevelProgress> = {}
  if (isObj(data.levels)) {
    for (const l of LEVELS) {
      const p = data.levels[l.id]
      if (isObj(p)) {
        levels[l.id] = {
          completed: p.completed === true,
          stars: typeof p.stars === 'number' ? Math.max(0, Math.min(3, Math.floor(p.stars))) : 0,
          bestScore: typeof p.bestScore === 'number' && p.bestScore >= 0 ? Math.floor(p.bestScore) : 0,
        }
      }
    }
  }
  const s = isObj(data.settings) ? data.settings : {}
  const achievements: Partial<Record<MomentId, number>> = {}
  if (isObj(data.achievements))
    for (const [k, v] of Object.entries(data.achievements))
      if (Object.hasOwn(MOMENTS, k) && typeof v === 'number' && Number.isSafeInteger(v) && v > 0) achievements[k as MomentId] = v
  const skins = Array.isArray(data.skins) ? [...new Set(['cream', ...data.skins.filter((k): k is SkinId => typeof k === 'string' && Object.hasOwn(SKINS, k))])] as SkinId[] : (['cream'] as SkinId[])
  const skin = typeof data.skin === 'string' && skins.includes(data.skin as SkinId) ? (data.skin as SkinId) : 'cream'
  return {
    version: SAVE_VERSION,
    coins: typeof data.coins === 'number' && data.coins >= 0 ? Math.floor(data.coins) : 0,
    owned,
    equipped: sanitizeEquipped(data.equipped, owned),
    levels,
    settings: {
      sound: typeof s.sound === 'boolean' ? s.sound : true,
      motion: s.motion === 'full' || s.motion === 'reduced' ? s.motion : 'system',
      difficulty: s.difficulty === 'relaxed' || s.difficulty === 'expert' ? s.difficulty : 'normal',
    },
    tutorialSeen: data.tutorialSeen === true,
    xp: typeof data.xp === 'number' && Number.isSafeInteger(data.xp) && data.xp >= 0 ? data.xp : 0,
    achievements,
    skins,
    skin,
    introsSeen: Array.isArray(data.introsSeen) ? data.introsSeen.filter((x): x is string => typeof x === 'string' && LEVELS.some((l) => l.id === x)) : [],
  }
}

export function loadSave(storage: StorageLike | null): SaveData {
  try {
    return parseSave(storage?.getItem(SAVE_KEY) ?? null)
  } catch {
    return defaultSave()
  }
}

export function writeSave(storage: StorageLike | null, data: SaveData): boolean {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(data))
    return !!storage
  } catch {
    return false
  }
}

/** A level is open once it was completed before or its predecessor is completed. */
export function isLevelUnlocked(save: SaveData, levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId)
  if (i < 0) return false
  if (i === 0 || save.levels[levelId]?.completed) return true
  return !!save.levels[LEVELS[i - 1].id]?.completed
}

export function isChapterUnlocked(save: SaveData, chapter: number): boolean {
  const first = LEVELS.find((l) => l.chapter === chapter)
  return !!first && isLevelUnlocked(save, first.id)
}

export interface RunReward extends LevelReward {
  xp: number
  xpParts: XpPart[]
  levelBefore: number
  levelAfter: number
  unlocks: Unlock[]
  moments: MomentId[]
}

/**
 * Applies a finished run: level result, XP, player-level rewards and moment
 * achievements. Called exactly once per finished run by the game screen.
 */
export function applyRunResult(save: SaveData, state: GameState, level: LevelDef, won: boolean, stars: number): { save: SaveData; reward: RunReward } {
  const base = applyLevelResult(save, level.id, won, stars, state.score, state.coinsEarned)
  const xpParts = runXp(state, level, won, stars, base.reward.firstClear)
  const xp = xpParts.reduce((n, p) => n + p.xp, 0)
  const moments = won ? state.moments : state.moments.filter((m) => m !== 'flawless' && m !== 'finisher')
  const prog = applyProgress(base.save, xp, moments)
  return {
    save: prog.save,
    reward: { ...base.reward, xp, xpParts, levelBefore: prog.levelBefore, levelAfter: prog.levelAfter, unlocks: prog.unlocks, moments },
  }
}

export function playerLevel(save: SaveData) {
  return levelFromXp(save.xp)
}

export interface LevelReward {
  coins: number
  item?: ItemId
  firstClear: boolean
}

/** Applies a finished level to the save (pure). Rewards only on first clear, coins always. */
export function applyLevelResult(save: SaveData, levelId: string, won: boolean, stars: number, score: number, goldCoins: number): { save: SaveData; reward: LevelReward } {
  const level = LEVELS.find((l) => l.id === levelId)
  if (!level) return { save, reward: { coins: 0, firstClear: false } }
  const prev = save.levels[levelId] ?? { completed: false, stars: 0, bestScore: 0 }
  if (!won) {
    // Gold found during a lost attempt is still kept – no punishment loops.
    return { save: { ...save, coins: save.coins + goldCoins }, reward: { coins: goldCoins, firstClear: false } }
  }
  const firstClear = !prev.completed
  const coins = (firstClear ? level.rewardCoins : Math.round(level.rewardCoins / 4)) + stars * 10 + goldCoins
  const item = firstClear && level.rewardItem && !save.owned.includes(level.rewardItem) ? level.rewardItem : undefined
  return {
    save: {
      ...save,
      coins: save.coins + coins,
      owned: item ? [...save.owned, item] : save.owned,
      levels: {
        ...save.levels,
        [levelId]: { completed: true, stars: Math.max(prev.stars, stars), bestScore: Math.max(prev.bestScore, score) },
      },
    },
    reward: { coins, item, firstClear },
  }
}

export function buyItem(save: SaveData, item: ItemId): SaveData | null {
  const price = ITEMS[item].price
  if (save.owned.includes(item) || price <= 0 || save.coins < price) return null
  return { ...save, coins: save.coins - price, owned: [...save.owned, item] }
}

// ---- In-progress run (resume after reload) ----

export function saveRun(storage: StorageLike | null, state: GameState): void {
  try {
    if (state.status !== 'playing') storage?.removeItem(RUN_KEY)
    else storage?.setItem(RUN_KEY, JSON.stringify({ version: SAVE_VERSION, state }))
  } catch {
    /* storage full or unavailable – the run simply is not resumable */
  }
}

export function loadRun(storage: StorageLike | null): GameState | null {
  try {
    const raw = storage?.getItem(RUN_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const st = data?.state
    if (data?.version !== SAVE_VERSION || !isObj(st)) return null
    if (!LEVELS.some((l) => l.id === st.levelId)) return null
    if (!Array.isArray(st.board) || st.board.length !== CELLS || st.status !== 'playing') return null
    const okTile = (t: unknown) => isObj(t) && typeof t.id === 'number' && typeof t.letter === 'string' && /^[A-ZÄÖÜ]$/.test(t.letter)
    if (!st.board.every(okTile)) return null
    if (typeof st.rng !== 'number' || typeof st.nextTileId !== 'number') return null
    // Runs saved before the word system existed get safe defaults.
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    const count = (v: unknown, fallback = 0) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : fallback
    const mission = isObj(st.mission) && typeof st.mission.kind === 'string' && Object.hasOwn(MISSION_LABELS, st.mission.kind)
      ? { kind: st.mission.kind as NonNullable<GameState['mission']>['kind'], progress: Math.min(2, count(st.mission.progress)) } : null
    const runBoss = st.boss as GameState['boss']
    if (runBoss?.queuedAttack && (!BOSSES[runBoss.id] || !Object.hasOwn(BOSSES[runBoss.id].attacks, runBoss.queuedAttack))) runBoss.queuedAttack = null
    return {
      ...(st as unknown as GameState),
      difficulty: st.difficulty === 'relaxed' || st.difficulty === 'expert' ? st.difficulty : 'normal',
      targets: strings(st.targets),
      foundWords: strings(st.foundWords),
      targetsSolved: typeof st.targetsSolved === 'number' ? st.targetsSolved : 0,
      secretsFound: typeof st.secretsFound === 'number' ? st.secretsFound : 0,
      combo: typeof st.combo === 'number' ? st.combo : 0,
      bestCombo: typeof st.bestCombo === 'number' ? st.bestCombo : 0,
      energy: Math.min(ENERGY_LIMIT - 1, count(st.energy)),
      energySpecials: count(st.energySpecials),
      mission,
      missionsCompleted: count(st.missionsCompleted),
      nextMissionAt: count(st.nextMissionAt),
      longWords: count(st.longWords),
      goldCollected: count(st.goldCollected),
      specialsTriggered: count(st.specialsTriggered),
      longStreak: Math.min(2, count(st.longStreak)),
      moments: strings(st.moments).filter((m): m is MomentId => Object.hasOwn(MOMENTS, m)),
      untouched: st.untouched !== false,
    }
  } catch {
    return null
  }
}

export function clearRun(storage: StorageLike | null): void {
  try {
    storage?.removeItem(RUN_KEY)
  } catch {
    /* ignore */
  }
}

export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
}
