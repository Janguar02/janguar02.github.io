import type { Dictionary } from './dictionary'
import { cloneBoard, idx, isUsable, makeTile, neighbours } from './grid'
import { drawLetter } from './letters'
import type { Rng } from './rng'
import { commonWordsOnBoard, findWords } from './solver'
import { CELLS, COLS, type Board, type SpecialKind } from './types'

/** A board is "healthy" when at least this many everyday words are playable. */
export const MIN_COMMON_WORDS = 2
const INITIAL_MIN_COMMON = 4
const INITIAL_MIN_TOTAL = 12
const GEN_ATTEMPTS = 40
const SHUFFLE_ATTEMPTS = 8
const INJECT_ATTEMPTS = 24

export interface IdCounter {
  value: number
}

export function isHealthy(board: Board, common: readonly string[]): boolean {
  return commonWordsOnBoard(board, common).length >= MIN_COMMON_WORDS
}

/** Random self-avoiding path of `len` cells inside `allowed` (bounded DFS). */
export function randomPath(rng: Rng, len: number, allowed: (i: number) => boolean): number[] | null {
  const starts = rng.shuffle([...Array(CELLS).keys()].filter(allowed))
  let budget = 4000
  const path: number[] = []
  const used = new Set<number>()
  const dfs = (i: number): boolean => {
    if (--budget < 0) return false
    path.push(i)
    used.add(i)
    if (path.length === len) return true
    for (const n of rng.shuffle([...neighbours(i)])) {
      if (!used.has(n) && allowed(n) && dfs(n)) return true
    }
    path.pop()
    used.delete(i)
    return false
  }
  for (const s of starts) {
    if (dfs(s)) return path
    if (budget < 0) break
  }
  return null
}

function seedCandidates(common: readonly string[], min: number, max: number): string[] {
  return common.filter((w) => w.length >= min && w.length <= max && !/[JQXY]/.test(w))
}

export interface BoardSetup {
  ice?: number[]
  fire?: number[]
  soot?: number[]
  specials?: { cell: number; kind: SpecialKind }[]
}

/**
 * Builds a fresh, verified board: weighted letters plus a few hand-picked
 * everyday words woven in along real paths. Retries a bounded number of times
 * and finally falls back to the rescue system, so it can never hang.
 */
export function generateBoard(
  rng: Rng,
  dict: Dictionary,
  common: readonly string[],
  nextId: IdCounter,
  setup: BoardSetup = {},
): Board {
  const ice = new Set([...(setup.ice ?? []), ...(setup.soot ?? [])])
  const soot = new Set(setup.soot ?? [])
  const fire = new Set(setup.fire ?? [])
  const preset = new Map((setup.specials ?? []).map((sp) => [sp.cell, sp.kind]))
  const seeds = seedCandidates(common, 4, 6)
  let board: Board = []
  for (let attempt = 0; attempt < GEN_ATTEMPTS; attempt++) {
    const letters: string[] = []
    for (let i = 0; i < CELLS; i++) letters.push(drawLetter(rng, letters))
    const reserved = new Set<number>()
    for (let s = 0; s < 3; s++) {
      const word = rng.pick(seeds)
      const path = randomPath(rng, word.length, (i) => !ice.has(i) && !reserved.has(i))
      if (!path) continue
      path.forEach((cell, k) => {
        letters[cell] = word[k]
        reserved.add(cell)
      })
    }
    const startId = nextId.value
    board = letters.map((l, i) =>
      makeTile(startId + i, l, { blocker: soot.has(i) ? 'soot' : ice.has(i) ? 'ice' : null, fire: fire.has(i), special: preset.get(i) ?? null }),
    )
    const common_ = commonWordsOnBoard(board, common).length
    if (common_ >= INITIAL_MIN_COMMON && findWords(board, dict, { limit: INITIAL_MIN_TOTAL }).size >= INITIAL_MIN_TOTAL) {
      nextId.value += CELLS
      return board
    }
  }
  nextId.value += CELLS
  return ensurePlayable(board, rng, common).board
}

export type RescueAction = 'none' | 'shuffle' | 'inject' | 'unblock'

export interface RescueResult {
  board: Board
  action: RescueAction
  /** Tile ids whose letter or blocker was rewritten (for the "magic" animation). */
  changedIds: number[]
}

/** Permutes tiles between usable cells; blocked tiles stay where they are. */
export function shuffleBoard(board: Board, rng: Rng): Board {
  const cells = board.map((t, i) => (isUsable(t) ? i : -1)).filter((i) => i >= 0)
  const tiles = rng.shuffle(cells.map((i) => board[i]))
  const out = [...board]
  cells.forEach((cell, k) => (out[cell] = tiles[k]))
  return out
}

/** Writes a common word along a fresh path of plain usable tiles. */
function injectWord(board: Board, rng: Rng, common: readonly string[], avoid: Set<number>): number[] | null {
  const words = rng.shuffle(seedCandidates(common, 3, 5))
  for (let attempt = 0; attempt < INJECT_ATTEMPTS && attempt < words.length; attempt++) {
    const word = words[attempt]
    const allowed = (i: number) => isUsable(board[i]) && !board[i].special && !avoid.has(i)
    const path = randomPath(rng, word.length, allowed) ?? randomPath(rng, word.length, (i) => isUsable(board[i]) && !avoid.has(i))
    if (!path) continue
    path.forEach((cell, k) => {
      board[cell] = { ...board[cell], letter: word[k] }
      avoid.add(cell)
    })
    return path
  }
  return null
}

/**
 * Anti dead-end guarantee. Called after every fully resolved turn.
 * 1) free reshuffle, 2) targeted injection of solvable letters,
 * 3) as a last resort break blockers and write two known words.
 * Every stage is bounded – no endless loops – and costs the player nothing.
 */
export function ensurePlayable(board: Board, rng: Rng, common: readonly string[]): RescueResult {
  if (isHealthy(board, common)) return { board, action: 'none', changedIds: [] }

  for (let a = 0; a < SHUFFLE_ATTEMPTS; a++) {
    const shuffled = shuffleBoard(board, rng)
    if (isHealthy(shuffled, common)) return { board: shuffled, action: 'shuffle', changedIds: [] }
  }

  const injected = cloneBoard(board)
  const avoid = new Set<number>()
  const changed: number[] = []
  for (let n = 0; n < 3; n++) {
    const path = injectWord(injected, rng, common, avoid)
    if (path) changed.push(...path.map((i) => injected[i].id))
    if (isHealthy(injected, common)) return { board: injected, action: 'inject', changedIds: changed }
  }

  // Last resort: the board is choked by blockers. Clear two rows and write words.
  const fixed = cloneBoard(board)
  const plan: [number, string][] = [
    [2, 'HAUS'],
    [3, 'ROT'],
  ]
  const ids: number[] = []
  for (const [row, word] of plan) {
    for (let k = 0; k < word.length; k++) {
      const cell = idx(row, k)
      fixed[cell] = { ...fixed[cell], letter: word[k], blocker: null, special: null, fire: false }
      ids.push(fixed[cell].id)
    }
  }
  for (let c = 4; c < COLS; c++) fixed[idx(2, c)] = { ...fixed[idx(2, c)], blocker: null }
  return { board: fixed, action: 'unblock', changedIds: ids }
}

