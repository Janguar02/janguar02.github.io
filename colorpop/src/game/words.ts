import { DIFFICULTIES } from './content'
import { COMMON_WORDS } from './data/commonWords'
import { randomPath } from './generator'
import { isUsable } from './grid'
import type { Rng } from './rng'
import { commonWordsOnBoard, findPath } from './solver'
import type { Board, Difficulty, WordKind } from './types'

const COMMON = new Set(COMMON_WORDS)

/** Words that are easy to spot and spell: no J/Q/X/Y and at most one umlaut. */
function friendly(w: string): boolean {
  return !/[JQXY]/.test(w) && (w.match(/[ÄÖÜ]/g)?.length ?? 0) <= 1
}

const POOLS = new Map<Difficulty, string[]>()

/** Candidate target words for a mode – everyday words only, never exotic terms. */
export function targetPool(d: Difficulty): string[] {
  let p = POOLS.get(d)
  if (!p) {
    const [min, max] = DIFFICULTIES[d].targetLen
    p = COMMON_WORDS.filter((w) => w.length >= min && w.length <= max && friendly(w))
    POOLS.set(d, p)
  }
  return p
}

/** Short everyday words used to make refills "word-shaped". */
export const REFILL_WORDS: readonly string[] = COMMON_WORDS.filter((w) => w.length >= 3 && w.length <= 5 && friendly(w))

export function isRareWord(w: string): boolean {
  return w.length >= 6 || (w.length >= 5 && !COMMON.has(w))
}

/**
 * Reward class of a valid word. Rewards are granted once per word and level:
 * a word already in `found` is a repeat (no extras, combo resets).
 */
export function classifyWord(word: string, targets: readonly string[], found: readonly string[]): WordKind {
  if (found.includes(word)) return 'repeat'
  if (targets.includes(word)) return 'target'
  if (word.length < 4) return 'free'
  return isRareWord(word) ? 'rare' : 'secret'
}

export interface TargetRefresh {
  targets: string[]
  board: Board
  /** Targets that disappeared because the board no longer allows them. */
  dropped: string[]
  added: string[]
  /** Tile ids whose letters were rewritten to make a new target reachable. */
  injectedIds: number[]
}

/**
 * Keeps the visible target list valid after ANY board change:
 * 1. drop targets that are no longer formable (or were just solved),
 * 2. fill up with pool words that are already on the board,
 * 3. if still short, weave a pool word into tiles that no other target needs.
 * Bounded and deterministic for a given rng state.
 */
export function refreshTargets(
  board: Board,
  current: readonly string[],
  difficulty: Difficulty,
  rng: Rng,
  /** solved: just played; avoid: words that must not become targets and whose tiles stay untouched (e.g. the blitz word). */
  opts: { solved?: string; avoid?: readonly string[]; prefer?: (path: number[]) => number; exclude?: readonly string[] } = {},
): TargetRefresh {
  const want = DIFFICULTIES[difficulty].targets
  const dropped: string[] = []
  const keep: string[] = []
  for (const w of current) {
    if (w === opts.solved) continue
    if (opts.exclude?.includes(w)) { dropped.push(w); continue }
    if (findPath(board, w)) keep.push(w)
    else dropped.push(w)
  }
  if (want === 0) return { targets: [], board, dropped: [...current], added: [], injectedIds: [] }

  const pool = targetPool(difficulty)
  const avoid = new Set([...keep, ...(opts.avoid ?? []), ...(opts.solved ? [opts.solved] : [])])
  const added: string[] = []
  // 2. words already formable – prefer variety in length and first letter
  // Used words never return as rewarded targets; inject a fresh one if needed.
  const used = new Set(opts.exclude ?? [])
  const formable = commonWordsOnBoard(board, pool).filter((w) => !avoid.has(w))
  const fresh = formable.filter((w) => !used.has(w))
  let onBoard = rng.shuffle(fresh)
  if (opts.prefer) {
    // Goal-aware targets (e.g. through burning tiles): stable sort keeps the shuffle as tie-break.
    const score = new Map(onBoard.map((w) => [w, opts.prefer!(findPath(board, w) ?? [])]))
    onBoard = [...onBoard].sort((a, b) => score.get(b)! - score.get(a)!)
  }
  for (const w of onBoard) {
    if (keep.length + added.length >= want) break
    if ([...keep, ...added].some((t) => t[0] === w[0] && t.length === w.length)) continue
    added.push(w)
    avoid.add(w)
  }
  for (const w of onBoard) {
    if (keep.length + added.length >= want) break
    if (!avoid.has(w)) {
      added.push(w)
      avoid.add(w)
    }
  }

  // 3. inject when the board offers too few targets
  let out = board
  const injectedIds: number[] = []
  if (keep.length + added.length < want) {
    out = [...board]
    const reserved = new Set<number>()
    for (const w of [...keep, ...added, ...(opts.avoid ?? [])]) for (const c of findPath(out, w) ?? []) reserved.add(c)
    const candidates = rng.shuffle(pool.filter((w) => !avoid.has(w) && !used.has(w)))
    for (let k = 0; k < candidates.length && k < 40 && keep.length + added.length < want; k++) {
      const w = candidates[k]
      const path =
        randomPath(rng, w.length, (i) => isUsable(out[i]) && !out[i].special && !out[i].fire && !reserved.has(i)) ??
        randomPath(rng, w.length, (i) => isUsable(out[i]) && !reserved.has(i))
      if (!path) continue
      path.forEach((cell, j) => {
        out[cell] = { ...out[cell], letter: w[j] }
        reserved.add(cell)
        injectedIds.push(out[cell].id)
      })
      added.push(w)
      avoid.add(w)
    }
  }
  // Safety net: only ever list targets that are formable right now.
  const targets = [...keep, ...added].filter((w) => findPath(out, w))
  return { targets, board: out, dropped, added: added.filter((w) => targets.includes(w)), injectedIds }
}

/**
 * Weaves one short everyday word into freshly refilled tiles so refills feel
 * like "real German" instead of letter soup. Only touches the given cells.
 */
export function shapeRefill(board: Board, newCells: readonly number[], rng: Rng, chance = 0.65): Board {
  if (newCells.length < 3 || rng.next() >= chance) return board
  const allowed = new Set(newCells.filter((i) => !board[i].special))
  const maxLen = Math.min(5, allowed.size)
  const words = REFILL_WORDS.filter((w) => w.length <= maxLen)
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = rng.pick(words)
    const path = randomPath(rng, w.length, (i) => allowed.has(i))
    if (!path) continue
    const out = [...board]
    path.forEach((cell, j) => (out[cell] = { ...out[cell], letter: w[j] }))
    return out
  }
  return board
}
