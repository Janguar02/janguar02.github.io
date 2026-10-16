import { COLS, ROWS, MIN_WORD, type Board, type Tile } from './types'
import { drawLetter } from './letters'
import type { Rng } from './rng'

export const rowOf = (i: number) => Math.floor(i / COLS)
export const colOf = (i: number) => i % COLS
export const idx = (r: number, c: number) => r * COLS + c
export const inBounds = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS

/** 8-neighbourhood (horizontal, vertical, diagonal). */
export function isAdjacent(a: number, b: number): boolean {
  if (a === b) return false
  return Math.abs(rowOf(a) - rowOf(b)) <= 1 && Math.abs(colOf(a) - colOf(b)) <= 1
}

const NEIGHBOURS: number[][] = Array.from({ length: ROWS * COLS }, (_, i) => {
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const r = rowOf(i) + dr
      const c = colOf(i) + dc
      if (inBounds(r, c)) out.push(idx(r, c))
    }
  return out
})

const ORTHO: number[][] = Array.from({ length: ROWS * COLS }, (_, i) => {
  const out: number[] = []
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = rowOf(i) + dr
    const c = colOf(i) + dc
    if (inBounds(r, c)) out.push(idx(r, c))
  }
  return out
})

export const neighbours = (i: number) => NEIGHBOURS[i]
export const orthoNeighbours = (i: number) => ORTHO[i]

export function isUsable(tile: Tile): boolean {
  return tile.blocker === null
}

export type PathError = 'too-short' | 'not-adjacent' | 'reused' | 'blocked' | 'out-of-bounds'

/** Validates a selection path of cell indices (no dictionary check). */
export function validatePath(board: Board, path: readonly number[], minLen = MIN_WORD): PathError | null {
  const seen = new Set<number>()
  for (let k = 0; k < path.length; k++) {
    const i = path[k]
    if (!Number.isInteger(i) || i < 0 || i >= board.length) return 'out-of-bounds'
    if (seen.has(i)) return 'reused'
    seen.add(i)
    if (!isUsable(board[i])) return 'blocked'
    if (k > 0 && !isAdjacent(path[k - 1], i)) return 'not-adjacent'
  }
  if (path.length < minLen) return 'too-short'
  return null
}

export function wordFromPath(board: Board, path: readonly number[]): string {
  return path.map((i) => board[i].letter).join('')
}

export function makeTile(id: number, letter: string, extra: Partial<Tile> = {}): Tile {
  return { id, letter, special: null, blocker: null, fire: false, ...extra }
}

/**
 * Removes tiles at the given cells, lets everything above fall down and
 * refills the gaps from the top. Returns a new board; tiles keep their ids so
 * the renderer can animate the fall. New tiles get fresh ids.
 */
export function collapseAndRefill(
  board: Board,
  removed: ReadonlySet<number>,
  rng: Rng,
  nextId: { value: number },
  spawn?: (col: number, nthNew: number) => Partial<Tile> | null,
): Board {
  const out: (Tile | null)[] = new Array(board.length).fill(null)
  const survivorsLetters: string[] = []
  for (let i = 0; i < board.length; i++) if (!removed.has(i)) survivorsLetters.push(board[i].letter)

  const pending: { col: number; rowsToFill: number[] }[] = []
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1
    for (let r = ROWS - 1; r >= 0; r--) {
      const i = idx(r, c)
      if (removed.has(i)) continue
      out[idx(write, c)] = board[i]
      write--
    }
    const rowsToFill: number[] = []
    for (let r = write; r >= 0; r--) rowsToFill.push(r)
    pending.push({ col: c, rowsToFill })
  }
  // Draw letters with knowledge of what is already on the board.
  const letters = [...survivorsLetters]
  for (const { col, rowsToFill } of pending) {
    rowsToFill.forEach((r, n) => {
      const letter = drawLetter(rng, letters)
      letters.push(letter)
      const extra = spawn?.(col, n) ?? {}
      out[idx(r, col)] = makeTile(nextId.value++, extra.letter ?? letter, extra)
    })
  }
  return out as Board
}

export function cloneBoard(board: Board): Board {
  return board.map((t) => ({ ...t }))
}
