import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Dictionary } from './dictionary'
import { makeTile } from './grid'
import type { Board, Tile } from './types'

let cached: Dictionary | null = null

/** Loads the real shipped dictionary (public/dict/de-words.txt). */
export function loadDict(): Dictionary {
  if (!cached) cached = Dictionary.fromText(readFileSync(resolve(__dirname, '../../public/dict/de-words.txt'), 'utf8'))
  return cached
}

/**
 * Builds a board from 6 strings of 6 letters. Markers after a letter:
 * `#` ice, `%` soot, `*` fire, `B` bomb, `L` lightning, `G` gold – written as
 * e.g. "HAUS*EN" is not possible, so use the `mods` map instead.
 */
export function boardFrom(rows: string[], mods: Record<number, Partial<Tile>> = {}): Board {
  const letters = rows.join('')
  if (letters.length !== 36) throw new Error('need 36 letters')
  return [...letters].map((l, i) => makeTile(i + 1, l, mods[i] ?? {}))
}
