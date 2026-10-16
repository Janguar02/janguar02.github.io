import { ITEM_VALUES } from './items'
import { letterValue } from './letters'
import { comboMultiplier, WORD_REWARDS } from './content'
import type { GameState, ItemId, SpecialKind, Tile, WordKind } from './types'
import { resolveSpecials } from './specials'
import { wordFromPath } from './grid'
import { classifyWord } from './words'

export const POINTS_PER_POWER = 10

export function lengthMultiplier(len: number): number {
  if (len <= 3) return 1
  if (len === 4) return 1.25
  if (len === 5) return 1.6
  if (len === 6) return 2
  if (len === 7) return 2.5
  return 3 + (len - 8) * 0.5
}

/** Special tile earned by word length (deterministic). */
export function specialsForLength(len: number): SpecialKind[] {
  if (len >= 8) return ['lightning', 'bomb']
  if (len === 7) return ['lightning']
  if (len === 6) return ['bomb']
  return []
}

export interface PowerPart {
  source: 'letters' | 'specials' | 'gold' | ItemId | 'bonus' | 'secret' | 'rare'
  label: string
  amount: number
}

export interface PowerBreakdown {
  letterSum: number
  lengthMult: number
  base: number
  parts: PowerPart[]
  /** Combo multiplier (≥ 1). */
  combo: number
  /** Blitz-word multiplier (≥ 1). */
  multiplier: number
  total: number
}

export interface PowerContext {
  equipped: readonly ItemId[]
  /** 1-based count of valid words including this one. */
  wordIndex: number
  /** Tiles cleared by bombs/lightning on top of the word itself. */
  extraCleared: number
  goldTiles: number
  bonusMultiplier: number
  /** Reward class of the word; secret/rare add a percentage bonus. */
  kind?: WordKind
  comboMultiplier?: number
  /** Blocked tiles this word frees (Tauwind bonus). */
  freed?: number
}

/**
 * Power = round(letter sum × length multiplier) + extras + item bonuses,
 * then × bonus-event multiplier. Damage to bosses equals power; normal
 * levels award power × 10 points. Pure and deterministic.
 */
export function computePower(tiles: readonly Tile[], ctx: PowerContext): PowerBreakdown {
  const len = tiles.length
  const letterSum = tiles.reduce((s, t) => s + letterValue(t.letter), 0)
  const lengthMult = lengthMultiplier(len)
  const base = Math.round(letterSum * lengthMult)
  const parts: PowerPart[] = [{ source: 'letters', label: `${len} Buchstaben`, amount: base }]
  const has = (i: ItemId) => ctx.equipped.includes(i)

  if (ctx.extraCleared > 0) parts.push({ source: 'specials', label: 'Spezialstein', amount: ctx.extraCleared })
  if (ctx.goldTiles > 0) parts.push({ source: 'gold', label: 'Goldstein', amount: ctx.goldTiles * 2 })

  if (has('goldenAlphabet')) {
    const v = ITEM_VALUES.goldenAlphabet
    const amount = tiles.reduce((s, t) => {
      const lv = letterValue(t.letter)
      return s + (lv >= 3 ? v.perValue3 : lv === 2 ? v.perValue2 : 0)
    }, 0)
    if (amount > 0) parts.push({ source: 'goldenAlphabet', label: 'Goldenes Alphabet', amount })
  }
  if (has('wordBlade') && len >= 5) {
    const pct = len >= 7 ? ITEM_VALUES.wordBlade.len7Pct : ITEM_VALUES.wordBlade.len5Pct
    parts.push({ source: 'wordBlade', label: 'Wortklinge', amount: Math.round((base * pct) / 100) })
  }
  if (has('fireRing')) {
    const burning = tiles.filter((t) => t.fire).length
    if (burning > 0) parts.push({ source: 'fireRing', label: 'Feuerring', amount: burning * ITEM_VALUES.fireRing.perFireTile })
  }
  if (has('thawWind') && (ctx.freed ?? 0) > 0) {
    parts.push({ source: 'thawWind', label: 'Tauwind', amount: (ctx.freed ?? 0) * ITEM_VALUES.thawWind.perFreed })
  }
  if (has('lightningCore') && ctx.wordIndex % ITEM_VALUES.lightningCore.every === 0) {
    parts.push({ source: 'lightningCore', label: 'Blitzkern', amount: ITEM_VALUES.lightningCore.damage })
  }
  if (ctx.kind === 'secret' || ctx.kind === 'rare') {
    const r = WORD_REWARDS[ctx.kind]
    const sub = parts.reduce((s, p) => s + p.amount, 0)
    parts.push({ source: ctx.kind, label: ctx.kind === 'rare' ? 'Seltener Fund' : 'Geheimwort', amount: Math.max(r.min, Math.round((sub * r.pct) / 100)) })
  }
  const sum = parts.reduce((s, p) => s + p.amount, 0)
  const combo = Math.max(1, ctx.comboMultiplier ?? 1)
  const multiplier = Math.max(1, ctx.bonusMultiplier)
  return { letterSum, lengthMult, base, parts, combo, multiplier, total: Math.round(sum * combo) * multiplier }
}

/** Exact pre-submit power, including chain-cleared gold and bonus/combo rules. */
export function previewWordPower(state: GameState, path: readonly number[]): PowerBreakdown {
  const word = wordFromPath(state.board, path)
  const kind = classifyWord(word, state.targets, state.foundWords)
  const bell = state.equipped.includes('comboBell')
  const combo = nextCombo(state.combo, kind, bell)
  const { cleared, unblocked } = resolveSpecials(state.board, path, { diagonalThaw: state.equipped.includes('thawWind') })
  return computePower(path.map(i => state.board[i]), {
    equipped: state.equipped, wordIndex: state.wordsPlayed + 1,
    extraCleared: cleared.size - path.length,
    goldTiles: [...cleared].filter(i => state.board[i].special === 'gold').length,
    bonusMultiplier: kind !== 'repeat' && state.bonus?.phase === 'active' && state.bonus.word === word ? state.bonus.multiplier : 1,
    kind, comboMultiplier: comboMultiplier(combo, bell),
    freed: unblocked.size,
  })
}

/** Combo after a word: repeats reset it unless the Combo-Glocke is equipped. */
export function nextCombo(combo: number, kind: WordKind, bell: boolean): number {
  if (kind === 'repeat') return bell ? combo : 0
  return kind === 'free' ? combo : combo + 1
}

/** Incoming damage after defensive items. */
export function mitigateDamage(raw: number, equipped: readonly ItemId[]): number {
  if (raw <= 0) return 0
  if (!equipped.includes('shield')) return raw
  return Math.max(1, Math.ceil((raw * (100 - ITEM_VALUES.shield.reducePct)) / 100))
}

export function crystalHeal(wordIndex: number, equipped: readonly ItemId[]): number {
  if (!equipped.includes('lifeCrystal')) return 0
  return wordIndex % ITEM_VALUES.lifeCrystal.every === 0 ? ITEM_VALUES.lifeCrystal.heal : 0
}
