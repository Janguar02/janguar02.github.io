import { describe, expect, it } from 'vitest'
import { COMMON_WORDS } from './data/commonWords'
import { ensurePlayable, generateBoard, isHealthy, MIN_COMMON_WORDS, randomPath, shuffleBoard } from './generator'
import { isAdjacent, validatePath } from './grid'
import { Rng } from './rng'
import { commonWordsOnBoard, findWords } from './solver'
import { boardFrom, loadDict } from './testUtils'
import type { Board } from './types'

const dict = loadDict()

function assertPlayable(board: Board) {
  const common = commonWordsOnBoard(board, COMMON_WORDS)
  expect(common.length).toBeGreaterThanOrEqual(MIN_COMMON_WORDS)
  expect(findWords(board, dict).size).toBeGreaterThan(0)
  expect(board).toHaveLength(36)
  expect(new Set(board.map((t) => t.id)).size).toBe(36)
}

describe('Brettgenerator', () => {
  it('erzeugt für 150 Seeds nur gesunde, lösbare Bretter', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const board = generateBoard(new Rng(seed), dict, COMMON_WORDS, { value: 1 })
      assertPlayable(board)
      expect(commonWordsOnBoard(board, COMMON_WORDS).length).toBeGreaterThanOrEqual(MIN_COMMON_WORDS)
    }
  })
  it('respektiert Eis- und Feuer-Setup', () => {
    const board = generateBoard(new Rng(7), dict, COMMON_WORDS, { value: 1 }, { ice: [0, 1, 2], fire: [10] })
    expect(board[0].blocker).toBe('ice')
    expect(board[10].fire).toBe(true)
    assertPlayable(board)
  })
  it('ist deterministisch', () => {
    const a = generateBoard(new Rng(42), dict, COMMON_WORDS, { value: 1 })
    const b = generateBoard(new Rng(42), dict, COMMON_WORDS, { value: 1 })
    expect(a).toEqual(b)
  })
  it('randomPath liefert zusammenhängende Pfade ohne Wiederholung', () => {
    const rng = new Rng(3)
    for (let n = 0; n < 50; n++) {
      const p = randomPath(rng, 6, () => true)!
      expect(new Set(p).size).toBe(6)
      for (let k = 1; k < p.length; k++) expect(isAdjacent(p[k - 1], p[k])).toBe(true)
    }
    expect(randomPath(rng, 3, (i) => i === 0)).toBeNull()
  })
})

describe('Anti-Sackgassen-System', () => {
  const dead = (letter: string) => boardFrom(Array(6).fill(letter.repeat(6)))

  it('erkennt absichtlich unlösbare Bretter', () => {
    expect(isHealthy(dead('X'), COMMON_WORDS)).toBe(false)
    expect(findWords(dead('X'), dict).size).toBe(0)
  })

  it('rettet ein reines X-Brett (Mischen reicht nicht → Injektion)', () => {
    const res = ensurePlayable(dead('X'), new Rng(1), COMMON_WORDS)
    expect(res.action).toBe('inject')
    assertPlayable(res.board)
    expect(res.changedIds.length).toBeGreaterThan(0)
  })

  it('rettet per kostenlosem Mischen, wenn die Buchstaben reichen', () => {
    // Letters for HAUS, ROT, TAG are present but scattered so nothing connects.
    const board = boardFrom(['HXAXUX', 'XXXXXX', 'SXRXOX', 'XXXXXX', 'TXTXAX', 'XXGXXX'])
    expect(isHealthy(board, COMMON_WORDS)).toBe(false)
    const res = ensurePlayable(board, new Rng(4), COMMON_WORDS)
    expect(['shuffle', 'inject']).toContain(res.action)
    assertPlayable(res.board)
    // Shuffle keeps exactly the same tiles.
    if (res.action === 'shuffle') expect(res.board.map((t) => t.id).sort()).toEqual(board.map((t) => t.id).sort())
  })

  it('bricht als letzte Stufe Blockaden, wenn fast alles blockiert ist', () => {
    const mods: Record<number, { blocker: 'soot' }> = {}
    for (let i = 0; i < 36; i++) if (i % 2 === 0 || i > 6) mods[i] = { blocker: 'soot' }
    const board = boardFrom(Array(6).fill('XXXXXX'), mods)
    const res = ensurePlayable(board, new Rng(9), COMMON_WORDS)
    assertPlayable(res.board)
  })

  it('komplett blockiertes Brett wird ebenfalls spielbar', () => {
    const mods: Record<number, { blocker: 'ice' }> = {}
    for (let i = 0; i < 36; i++) mods[i] = { blocker: 'ice' }
    const res = ensurePlayable(boardFrom(Array(6).fill('QQQQQQ'), mods), new Rng(2), COMMON_WORDS)
    expect(res.action).toBe('unblock')
    assertPlayable(res.board)
  })

  it('gesunde Bretter bleiben unverändert', () => {
    const board = generateBoard(new Rng(11), dict, COMMON_WORDS, { value: 1 })
    const res = ensurePlayable(board, new Rng(1), COMMON_WORDS)
    expect(res.action).toBe('none')
    expect(res.board).toBe(board)
  })

  it('terminiert schnell für 200 zufällige Müll-Bretter', () => {
    const rng = new Rng(77)
    const junk = 'XQYJVCPÖÄÜ'
    const t0 = Date.now()
    for (let n = 0; n < 200; n++) {
      const rows = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => junk[rng.int(junk.length)]).join(''))
      const mods: Record<number, { blocker: 'soot' }> = {}
      for (let i = 0; i < 36; i++) if (rng.next() < 0.3) mods[i] = { blocker: 'soot' }
      const res = ensurePlayable(boardFrom(rows, mods), rng, COMMON_WORDS)
      assertPlayable(res.board)
      for (const w of commonWordsOnBoard(res.board, COMMON_WORDS).slice(0, 1)) {
        expect(w.length).toBeGreaterThanOrEqual(3)
      }
    }
    expect(Date.now() - t0).toBeLessThan(20000)
  })

  it('shuffleBoard lässt blockierte Steine an ihrem Platz', () => {
    const board = boardFrom(['ABCDEF', 'GHIJKL', 'MNOPQR', 'STUVWX', 'YZABCD', 'EFGHIJ'], { 5: { blocker: 'ice' } })
    const s = shuffleBoard(board, new Rng(1))
    expect(s[5]).toBe(board[5])
    expect(validatePath(s, [0, 1, 2])).not.toBe('blocked')
  })
})
