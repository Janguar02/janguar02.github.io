import type { Dictionary } from './dictionary'
import { isUsable, neighbours } from './grid'
import type { Board } from './types'

export interface FoundWord {
  word: string
  path: number[]
}

export interface SolveOptions {
  maxLength?: number
  /** Stop after this many distinct words (keeps checks cheap). */
  limit?: number
}

/**
 * Finds all dictionary words that can actually be played on the board:
 * adjacent (8-way) chain, every tile at most once, blocked tiles excluded.
 */
export function findWords(board: Board, dict: Dictionary, opts: SolveOptions = {}): Map<string, number[]> {
  const maxLength = opts.maxLength ?? 10
  const limit = opts.limit ?? Infinity
  const found = new Map<string, number[]>()
  const used = new Uint8Array(board.length)
  const path: number[] = []

  const dfs = (i: number, prefix: string, lo: number, hi: number): boolean => {
    const word = prefix + board[i].letter
    const range = dict.narrow(word, lo, hi)
    if (!range) return false
    used[i] = 1
    path.push(i)
    if (word.length >= 3 && !found.has(word) && dict.words[range[0]] === word) {
      found.set(word, [...path])
      if (found.size >= limit) return true
    }
    if (word.length < maxLength) {
      for (const n of neighbours(i)) {
        if (used[n] || !isUsable(board[n])) continue
        if (dfs(n, word, range[0], range[1])) return true
      }
    }
    used[i] = 0
    path.pop()
    return false
  }

  for (let i = 0; i < board.length; i++) {
    if (!isUsable(board[i])) continue
    if (dfs(i, '', 0, dict.size)) break
  }
  return found
}

/** Finds a playable path for one specific word, or null. */
export function findPath(board: Board, word: string): number[] | null {
  const used = new Uint8Array(board.length)
  const path: number[] = []
  const dfs = (i: number, k: number): boolean => {
    if (board[i].letter !== word[k] || !isUsable(board[i])) return false
    used[i] = 1
    path.push(i)
    if (k === word.length - 1) return true
    for (const n of neighbours(i)) {
      if (!used[n] && dfs(n, k + 1)) return true
    }
    used[i] = 0
    path.pop()
    return false
  }
  for (let i = 0; i < board.length; i++) if (dfs(i, 0)) return path
  return null
}

export interface BoardHealth {
  totalWords: number
  commonWords: string[]
}

/** Which curated common words are playable right now. */
export function commonWordsOnBoard(board: Board, common: readonly string[]): string[] {
  const letters = new Map<string, number>()
  for (const t of board) if (isUsable(t)) letters.set(t.letter, (letters.get(t.letter) ?? 0) + 1)
  const out: string[] = []
  outer: for (const w of common) {
    // Cheap letter-count prefilter before the path search.
    const need = new Map<string, number>()
    for (const ch of w) {
      const n = (need.get(ch) ?? 0) + 1
      if (n > (letters.get(ch) ?? 0)) continue outer
      need.set(ch, n)
    }
    if (findPath(board, w)) out.push(w)
  }
  return out
}

export function boardHealth(board: Board, dict: Dictionary, common: readonly string[]): BoardHealth {
  return {
    totalWords: findWords(board, dict, { limit: 200 }).size,
    commonWords: commonWordsOnBoard(board, common),
  }
}
