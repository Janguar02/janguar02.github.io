import { describe, expect, it } from 'vitest'
import { COMMON_WORDS, BONUS_WORDS } from './data/commonWords'
import { Dictionary, normalizeWord } from './dictionary'
import { collapseAndRefill, isAdjacent, validatePath, wordFromPath } from './grid'
import { Rng } from './rng'
import { findPath, findWords } from './solver'
import { boardFrom, loadDict } from './testUtils'

const dict = loadDict()

describe('Wörterbuch', () => {
  it('lädt eine große deutsche Wortliste', () => {
    expect(dict.size).toBeGreaterThan(100000)
  })
  it('erkennt Grundformen und Flexionen', () => {
    for (const w of ['HAUS', 'HÄUSER', 'FEUER', 'GEHT', 'GINGEN', 'LIEF', 'SCHÖN', 'KÄSE', 'ROTEN', 'BÄUME', 'MÜDE']) {
      expect(dict.has(w), w).toBe(true)
    }
  })
  it('lehnt Unsinn und Abkürzungen ab', () => {
    for (const w of ['XQZ', 'HAUSX', 'AAAA', 'LKW', 'KFZ', 'PKW', 'QWERTZ']) expect(dict.has(w), w).toBe(false)
  })
  it('filtert reine Eigennamen, behält Wörter mit Doppelbedeutung', () => {
    for (const w of ['ACHIM', 'ACHIMS', 'INES', 'PETER', 'BERLIN', 'DAHLEM', 'EVA']) expect(dict.has(w), w).toBe(false)
    for (const w of ['ROSE', 'KOCH', 'WOLF', 'BACH', 'MARK', 'ADLER', 'ALLES', 'DIR', 'IHM', 'HEISS']) expect(dict.has(w), w).toBe(true)
  })
  it('normalisiert ß zu SS und Kleinbuchstaben zu Großbuchstaben', () => {
    expect(normalizeWord('Straße')).toBe('STRASSE')
    expect(normalizeWord(' süß ')).toBe('SÜSS')
    expect(dict.has(normalizeWord('Straße'))).toBe(true)
    expect(dict.has(normalizeWord('heiß'))).toBe(true)
  })
  it('Präfixsuche funktioniert inkl. Umlauten', () => {
    expect(dict.hasPrefix('FEU')).toBe(true)
    expect(dict.hasPrefix('HÄU')).toBe(true)
    expect(dict.hasPrefix('QXZ')).toBe(false)
    const d = new Dictionary(['abc', 'abd', 'Äpfel'])
    expect(d.narrow('AB')).toEqual([0, 2])
    expect(d.has('ÄPFEL')).toBe(true)
  })
  it('alle kuratierten Alltagswörter sind im Wörterbuch', () => {
    const missing = COMMON_WORDS.filter((w) => !dict.has(w))
    expect(missing).toEqual([])
    expect(COMMON_WORDS.length).toBeGreaterThan(600)
    expect(BONUS_WORDS.every((w) => w.length >= 4 && w.length <= 6)).toBe(true)
  })
})

describe('Nachbarschaft & Pfade', () => {
  const board = boardFrom(['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'])
  it('erlaubt horizontal, vertikal, diagonal', () => {
    expect(isAdjacent(0, 1)).toBe(true)
    expect(isAdjacent(0, 6)).toBe(true)
    expect(isAdjacent(0, 7)).toBe(true)
    expect(isAdjacent(0, 2)).toBe(false)
    expect(isAdjacent(5, 6)).toBe(false) // kein Zeilenumbruch
    expect(isAdjacent(7, 7)).toBe(false)
  })
  it('validiert Pfade', () => {
    expect(validatePath(board, [0, 1, 2, 3])).toBeNull()
    expect(wordFromPath(board, [0, 1, 2, 3])).toBe('HAUS')
    expect(validatePath(board, [0, 1])).toBe('too-short')
    expect(validatePath(board, [0, 2, 3])).toBe('not-adjacent')
    expect(validatePath(board, [0, 1, 0])).toBe('reused')
    expect(validatePath(board, [0, 1, 99])).toBe('out-of-bounds')
  })
  it('verhindert mehrfache Steinbenutzung auch über Umwege', () => {
    expect(validatePath(board, [0, 1, 7, 6, 0])).toBe('reused')
  })
  it('blockierte Steine sind nicht wählbar', () => {
    const b = boardFrom(['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'], { 1: { blocker: 'ice' } })
    expect(validatePath(b, [0, 1, 2, 3])).toBe('blocked')
  })
})

describe('Entfernen, Schwerkraft, Nachfüllen', () => {
  it('lässt Steine fallen und füllt von oben auf', () => {
    const board = boardFrom(['ABCDEF', 'GHIJKL', 'MNOPQR', 'STUVWX', 'YZABCD', 'EFGHIJ'])
    const removed = new Set([30, 24, 31]) // E,Y,F
    const next = collapseAndRefill(board, removed, new Rng(5), { value: 100 })
    expect(next).toHaveLength(36)
    // Spalte 0: von unten S, M, G, A dann 2 neue
    expect(next[30].letter).toBe('S')
    expect(next[24].letter).toBe('M')
    expect(next[18].letter).toBe('G')
    expect(next[12].letter).toBe('A')
    expect(next[0].id).toBeGreaterThanOrEqual(100)
    expect(next[6].id).toBeGreaterThanOrEqual(100)
    // Ids bleiben erhalten (für Fallanimation)
    expect(next[30].id).toBe(board[18].id)
    // Spalte 1: F entfernt
    expect(next[31].letter).toBe('Z')
    expect(next[1].id).toBeGreaterThanOrEqual(100)
    // Unberührte Spalte unverändert
    for (const r of [0, 1, 2, 3, 4, 5]) expect(next[r * 6 + 3]).toBe(board[r * 6 + 3])
    const ids = new Set(next.map((t) => t.id))
    expect(ids.size).toBe(36)
  })
  it('Nachfüllen ist deterministisch bei gleichem Seed', () => {
    const board = boardFrom(['ABCDEF', 'GHIJKL', 'MNOPQR', 'STUVWX', 'YZABCD', 'EFGHIJ'])
    const a = collapseAndRefill(board, new Set([0, 1, 2]), new Rng(9), { value: 50 })
    const b = collapseAndRefill(board, new Set([0, 1, 2]), new Rng(9), { value: 50 })
    expect(a.map((t) => t.letter).join('')).toBe(b.map((t) => t.letter).join(''))
  })
})

describe('Solver', () => {
  it('findet spielbare Wörter und ihre Pfade', () => {
    const board = boardFrom(['FEUERX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXHAUS'])
    const words = findWords(board, dict)
    expect(words.has('FEUER')).toBe(true)
    expect(words.has('HAUS')).toBe(true)
    expect(validatePath(board, words.get('FEUER')!)).toBeNull()
  })
  it('ignoriert blockierte Felder', () => {
    const board = boardFrom(['FEUERX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'], { 2: { blocker: 'soot' } })
    expect(findWords(board, dict).has('FEUER')).toBe(false)
    expect(findPath(board, 'FEUER')).toBeNull()
  })
  it('findet Wörter mit Umlauten', () => {
    const board = boardFrom(['KÄSEXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'])
    expect(findWords(board, dict).has('KÄSE')).toBe(true)
  })
  it('leeres X-Brett hat keine Wörter', () => {
    const board = boardFrom(Array(6).fill('XXXXXX'))
    expect(findWords(board, dict).size).toBe(0)
  })
})
