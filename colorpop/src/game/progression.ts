import { LEVELS } from './content'
import { MOMENTS } from './moments'
import type { GameState, ItemId, LevelDef, MomentId } from './types'

// ---------------- Tile designs (cosmetics) ----------------

export type SkinId = 'cream' | 'mint' | 'peach' | 'midnight' | 'gold'

export interface SkinDef {
  id: SkinId
  name: string
  /** Gradient top/mid/bottom, bevel edge, letter colour. */
  colors: [string, string, string, string, string]
  unlock: string
}

export const SKINS: Record<SkinId, SkinDef> = {
  cream: { id: 'cream', name: 'Sahnebonbon', colors: ['#FFFEFA', '#FBF1DF', '#F2E1C4', '#E2C9A1', '#3B2160'], unlock: 'Start' },
  mint: { id: 'mint', name: 'Minzdrops', colors: ['#F4FFFA', '#D9F7EA', '#B9EBD6', '#86CDB0', '#1E4D44'], unlock: 'Spielerlevel 3' },
  peach: { id: 'peach', name: 'Pfirsichbrause', colors: ['#FFF8F2', '#FFE1CF', '#FFC8A8', '#E9997A', '#5A2433'], unlock: 'Spielerlevel 5' },
  midnight: { id: 'midnight', name: 'Mitternacht', colors: ['#6D5CB8', '#4E3F98', '#3A2D7A', '#241A55', '#FFF4D6'], unlock: 'Spielerlevel 7' },
  gold: { id: 'gold', name: 'Goldprägung', colors: ['#FFF8DA', '#FFE6A0', '#F5CB62', '#C8901E', '#4A2A00'], unlock: 'Spielerlevel 10' },
}
export const SKIN_ORDER: SkinId[] = ['cream', 'mint', 'peach', 'midnight', 'gold']

// ---------------- Player level ----------------

export function xpToNext(level: number): number {
  return 80 + 40 * (level - 1)
}

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1
  let rest = Math.max(0, Math.floor(xp))
  while (rest >= xpToNext(level) && level < 99) {
    rest -= xpToNext(level)
    level++
  }
  return { level, into: rest, need: xpToNext(level) }
}

export type LevelUpReward = { coins?: number; skin?: SkinId; item?: ItemId }

/** Rewards for reaching a player level. Earned purely by playing. */
export const LEVEL_UP_REWARDS: Record<number, LevelUpReward> = {
  2: { coins: 50 },
  3: { skin: 'mint' },
  4: { coins: 80 },
  5: { skin: 'peach' },
  6: { item: 'hourglass' },
  7: { skin: 'midnight' },
  8: { coins: 150 },
  9: { coins: 150 },
  10: { skin: 'gold' },
}

// ---------------- XP for one finished level ----------------

export interface XpPart {
  label: string
  xp: number
}

/**
 * XP for a finished run. Replays still pay, but less, and only real play
 * (wins, stars, discoveries, Wortmeister moments) generates XP.
 */
export function runXp(state: GameState, level: LevelDef, won: boolean, stars: number, firstClear: boolean): XpPart[] {
  const parts: XpPart[] = []
  const boss = level.goal.kind === 'boss'
  if (won) {
    parts.push({ label: boss ? 'Boss besiegt' : 'Level geschafft', xp: firstClear ? (boss ? 80 : 40) : boss ? 30 : 15 })
    if (stars > 0) parts.push({ label: `${stars} Stern${stars > 1 ? 'e' : ''}`, xp: stars * (firstClear ? 10 : 5) })
  } else if (state.wordsPlayed >= 5) {
    parts.push({ label: 'Tapfer gekämpft', xp: 10 })
  }
  const discoveries = Math.min(10, state.secretsFound)
  if (discoveries > 0) parts.push({ label: `${discoveries} Geheimwörter`, xp: discoveries * 2 })
  for (const m of state.moments) parts.push({ label: MOMENTS[m].title.replace('!', ''), xp: MOMENTS[m].xp })
  return parts
}

// ---------------- Applying progression to the save ----------------

export interface ProgressSave {
  xp: number
  coins: number
  owned: ItemId[]
  skins: SkinId[]
  achievements: Partial<Record<MomentId, number>>
}

export interface Unlock {
  kind: 'coins' | 'skin' | 'item' | 'achievement'
  label: string
  /** Player level that granted it (level-ups only). */
  level?: number
  item?: ItemId
  skin?: SkinId
  moment?: MomentId
  coins?: number
}

/**
 * Adds XP and moment achievements. Returns the updated values plus everything
 * newly unlocked. Pure; rewards for a level are only granted once because the
 * level threshold is crossed only once.
 */
export function applyProgress<T extends ProgressSave>(save: T, xpGain: number, moments: readonly MomentId[]): { save: T; unlocks: Unlock[]; levelBefore: number; levelAfter: number } {
  const levelBefore = levelFromXp(save.xp).level
  const xp = save.xp + Math.max(0, Math.floor(xpGain))
  const levelAfter = levelFromXp(xp).level
  let coins = save.coins
  let owned = [...save.owned]
  let skins = [...save.skins]
  const unlocks: Unlock[] = []
  for (let lv = levelBefore + 1; lv <= levelAfter; lv++) {
    const r = LEVEL_UP_REWARDS[lv]
    if (!r) continue
    if (r.coins) {
      coins += r.coins
      unlocks.push({ kind: 'coins', label: `${r.coins} Münzen`, level: lv, coins: r.coins })
    }
    if (r.skin && !skins.includes(r.skin)) {
      skins.push(r.skin)
      unlocks.push({ kind: 'skin', label: `Steindesign „${SKINS[r.skin].name}“`, level: lv, skin: r.skin })
    }
    if (r.item && !owned.includes(r.item)) {
      owned.push(r.item)
      unlocks.push({ kind: 'item', label: 'Neues Item', level: lv, item: r.item })
    }
  }
  const achievements = { ...save.achievements }
  for (const m of moments) {
    const first = !achievements[m]
    achievements[m] = (achievements[m] ?? 0) + 1
    if (first) {
      unlocks.push({ kind: 'achievement', label: MOMENTS[m].title.replace('!', ''), moment: m, coins: MOMENTS[m].coins })
      coins += MOMENTS[m].coins
      if (m === 'comboRush' && !owned.includes('comboBell')) {
        owned.push('comboBell')
        unlocks.push({ kind: 'item', label: 'Neues Item', item: 'comboBell' })
      }
    }
  }
  owned = [...new Set(owned)]
  skins = [...new Set(skins)]
  return { save: { ...save, xp, coins, owned, skins, achievements }, unlocks, levelBefore, levelAfter }
}

/** Stars collected over all levels (for the map header). */
export function totalStars(levels: Record<string, { stars: number }>): { have: number; max: number } {
  return { have: LEVELS.reduce((s, l) => s + (levels[l.id]?.stars ?? 0), 0), max: LEVELS.length * 3 }
}
