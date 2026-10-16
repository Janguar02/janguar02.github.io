import { COMMON_WORDS } from './data/commonWords'
import type { Dictionary } from './dictionary'
import { createGame, playWord } from './engine'
import { Rng } from './rng'
import { computePower } from './scoring'
import { orthoNeighbours } from './grid'
import { findWords } from './solver'
import type { Difficulty, GameState, ItemId, LevelDef } from './types'
import { applyDifficulty } from './content'

export type BotStyle = 'casual' | 'strong'

const COMMON = new Set(COMMON_WORDS)

/**
 * Headless bot used for balancing tests.
 * casual: plays a random everyday word of 3–5 letters (like a relaxed player).
 * strong: plays the highest-power word on the board.
 */
/** How much a path helps the level goal (fire extinguished / ice broken). */
function goalValue(state: GameState, path: number[], level: LevelDef): number {
  const word = path.map((i) => state.board[i].letter).join('')
  const fresh = !state.foundWords.includes(word)
  if (level.goal.kind === 'extinguish') return path.filter((i) => state.board[i].fire).length
  if (level.goal.kind === 'longWords') return fresh && word.length >= 5 ? 1 : 0
  if (level.goal.kind === 'gold') return path.filter((i) => state.board[i].special === 'gold').length
  if (level.goal.kind === 'specials') return path.filter((i) => state.board[i].special === 'bomb' || state.board[i].special === 'lightning').length
  if (level.goal.kind === 'secrets') return fresh && word.length >= 4 && !state.targets.includes(word) ? 1 : 0
  if (level.goal.kind === 'freeIce') {
    const near = new Set<number>()
    for (const i of path) for (const n of orthoNeighbours(i)) if (state.board[n].blocker === 'ice') near.add(n)
    return near.size
  }
  return 0
}

export function pickMove(state: GameState, dict: Dictionary, style: BotStyle, rng: Rng, level?: LevelDef): number[] | null {
  const words = [...findWords(state.board, dict, { maxLength: style === 'strong' ? 8 : 10 }).entries()]
  if (words.length === 0) return null
  if (style === 'casual') {
    // Visible targets are what a relaxed player plays most of the time.
    const targets = words.filter(([w]) => state.targets.includes(w))
    const everyday = words.filter(([w]) => COMMON.has(w) && w.length <= 5)
    let pool = targets.length && rng.next() < 0.75 ? targets : everyday.length ? everyday : words.filter(([w]) => w.length <= 4)
    if (!pool.length) pool = words
    if (level) {
      // A relaxed player still reads the goal: most of the time they look for
      // an everyday word (or target) that helps it.
      const readable = [...targets, ...everyday]
      const helpful = readable.filter(([, p]) => goalValue(state, p, level) > 0)
      if (helpful.length && rng.next() < 0.8) {
        const best = Math.max(...helpful.map(([, p]) => goalValue(state, p, level)))
        pool = helpful.filter(([, p]) => goalValue(state, p, level) === best)
      } else {
        const best = Math.max(...pool.map(([, p]) => goalValue(state, p, level)))
        if (best > 0) pool = pool.filter(([, p]) => goalValue(state, p, level) === best)
      }
    }
    return rng.pick(pool)[1]
  }
  if (state.bonus && state.bonus.phase === 'active') {
    const hit = words.find(([w]) => w === state.bonus!.word)
    if (hit) return hit[1]
  }
  let best = words[0][1]
  let bestPower = -1
  for (const [, path] of words) {
    const goal = level ? goalValue(state, path, level) * 6 : 0
    const p = goal + computePower(path.map((i) => state.board[i]), {
      equipped: state.equipped,
      wordIndex: state.wordsPlayed + 1,
      extraCleared: 0,
      goldTiles: 0,
      bonusMultiplier: 1,
    }).total
    if (p > bestPower) {
      bestPower = p
      best = path
    }
  }
  return best
}

export interface SimResult {
  status: GameState['status']
  turns: number
  hpLeft: number
  rescues: number
  targets: number
  secrets: number
}

export function simulate(
  baseLevel: LevelDef,
  equipped: ItemId[],
  dict: Dictionary,
  style: BotStyle,
  seed: number,
  maxTurns = 120,
  difficulty: Difficulty = 'normal',
): SimResult {
  const level = applyDifficulty(baseLevel, difficulty)
  let state = createGame(level, equipped, { dict }, seed, difficulty)
  const rng = new Rng(seed * 7919)
  let turns = 0
  while (state.status === 'playing' && turns < maxTurns) {
    if (state.bonus?.phase === 'intro') state = { ...state, bonus: { ...state.bonus, phase: 'active' } }
    const path = pickMove(state, dict, style, rng, level)
    if (!path) throw new Error(`Dead board at turn ${turns} (seed ${seed})`)
    const r = playWord(state, path, level, { dict })
    if (!r.ok) throw new Error(`Bot move rejected: ${r.reason}`)
    state = r.state
    turns++
  }
  return { status: state.status, turns, hpLeft: state.player?.hp ?? 0, rescues: state.rescues, targets: state.targetsSolved, secrets: state.secretsFound }
}
