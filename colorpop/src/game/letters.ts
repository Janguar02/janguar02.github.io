import type { Rng } from './rng'

/** Damage/score value per letter – rarer letters hit harder. */
export const LETTER_VALUE: Record<string, number> = {
  E: 1, N: 1, I: 1, S: 1, R: 1, A: 1, T: 1, D: 1, H: 1, U: 1, L: 1,
  G: 2, O: 2, M: 2, B: 2, C: 2, K: 2, W: 2,
  F: 3, Z: 3, P: 3, V: 3, Ä: 3, Ö: 3, Ü: 3,
  J: 4, Y: 4, X: 4, Q: 4,
}

export function letterValue(letter: string): number {
  return LETTER_VALUE[letter] ?? 1
}

export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'])

/**
 * Refill weights, tuned from German letter frequencies but flattened so the
 * board stays playable (no Q, very rare J/X/Y, C kept low because it needs H/K).
 */
export const LETTER_WEIGHTS: readonly (readonly [string, number])[] = [
  ['E', 14], ['N', 8], ['I', 7], ['S', 7], ['R', 7], ['A', 7.5], ['T', 6.5],
  ['D', 4.2], ['H', 4.5], ['U', 4.5], ['L', 4.5], ['C', 1.6], ['G', 3],
  ['M', 3], ['O', 3.8], ['B', 2.2], ['W', 1.8], ['F', 1.6], ['K', 1.8],
  ['Z', 1.1], ['P', 1], ['V', 0.6], ['Ü', 0.6], ['Ä', 0.5], ['Ö', 0.35],
  ['J', 0.2], ['Y', 0.03], ['X', 0.03],
]

const VOWEL_WEIGHTS = LETTER_WEIGHTS.filter(([l]) => VOWELS.has(l))
const CONSONANT_WEIGHTS = LETTER_WEIGHTS.filter(([l]) => !VOWELS.has(l))

/** Per-letter caps so a board never floods with one consonant. */
export function letterCap(letter: string): number {
  if (letter === 'E') return 6
  if (letter === 'C') return 2
  if (VOWELS.has(letter)) return 4
  if (['N', 'S', 'R', 'T'].includes(letter)) return 4
  if (letterValue(letter) >= 3) return 2
  return 3
}

export const MAX_HARD = 4
export function isHardLetter(l: string): boolean {
  return l === 'C' || letterValue(l) >= 3
}

/**
 * Draws a refill letter while keeping the vowel ratio in a healthy band
 * (32–50 %) and respecting per-letter caps. Bounded: never loops forever.
 */
export function drawLetter(rng: Rng, existing: readonly string[]): string {
  const total = existing.length || 1
  const vowels = existing.filter((l) => VOWELS.has(l)).length
  const ratio = vowels / total
  const pool = ratio < 0.32 ? VOWEL_WEIGHTS : ratio > 0.5 ? CONSONANT_WEIGHTS : LETTER_WEIGHTS
  const counts = new Map<string, number>()
  for (const l of existing) counts.set(l, (counts.get(l) ?? 0) + 1)
  // At most 4 "hard" letters (value ≥ 3, plus C) so boards never clog with F/Z/P/V/Ö…
  const hard = existing.filter(isHardLetter).length
  const allowed = pool.filter(([l]) => (counts.get(l) ?? 0) < letterCap(l) && !(hard >= MAX_HARD && isHardLetter(l)))
  return rng.weighted(allowed.length > 0 ? allowed : pool)
}
