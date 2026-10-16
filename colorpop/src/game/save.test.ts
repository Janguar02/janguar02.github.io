import { describe, expect, it } from 'vitest'
import { createGame, playWord } from './engine'
import { levelById, LEVELS } from './content'
import { applyLevelResult, buyItem, defaultSave, isLevelUnlocked, loadRun, loadSave, MemoryStorage, parseSave, RUN_KEY, SAVE_KEY, saveRun, writeSave } from './save'
import { findWords } from './solver'
import { loadDict } from './testUtils'

const dict = loadDict()

describe('Speicherung & Wiederherstellung', () => {
  it('Roundtrip des Spielstands', () => {
    const st = new MemoryStorage()
    const s = { ...defaultSave(), coins: 123, tutorialSeen: true }
    expect(writeSave(st, s)).toBe(true)
    expect(loadSave(st)).toEqual(s)
  })
  it('kaputte oder fremde Daten fallen auf Standardwerte zurück', () => {
    expect(parseSave('{kaputt')).toEqual(defaultSave())
    expect(parseSave(JSON.stringify({ version: 99 }))).toEqual(defaultSave())
    expect(parseSave(null)).toEqual(defaultSave())
    const weird = parseSave(JSON.stringify({ version: 1, coins: -5, owned: ['fireRing', 'hack'], equipped: ['fireRing', 'x', 'shield', 'wordBlade', 'lifeCrystal'], levels: { l1: { completed: true, stars: 9 } }, settings: { sound: 'ja', motion: 'warp' } }))
    expect(weird.coins).toBe(0)
    expect(weird.owned).toContain('fireRing')
    expect(weird.owned).not.toContain('hack')
    expect(weird.equipped).toHaveLength(3)
    expect(weird.levels.l1.stars).toBe(3)
    expect(weird.settings).toEqual({ sound: true, motion: 'system', difficulty: 'normal' })
  })
  it('Storage-Ausfall wirft keine Fehler', () => {
    const broken = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(loadSave(broken)).toEqual(defaultSave())
    expect(writeSave(broken, defaultSave())).toBe(false)
    expect(loadRun(broken)).toBeNull()
  })
  it('Freischaltung & Belohnungen', () => {
    let s = defaultSave()
    expect(isLevelUnlocked(s, 'l1')).toBe(true)
    expect(isLevelUnlocked(s, LEVELS[1].id)).toBe(false)
    const r = applyLevelResult(s, 'l1', true, 2, 900, 20)
    s = r.save
    expect(r.reward.firstClear).toBe(true)
    expect(r.reward.item).toBe('goldenAlphabet')
    expect(s.owned).toContain('goldenAlphabet')
    expect(s.coins).toBe(60 + 20 + 20)
    expect(isLevelUnlocked(s, LEVELS[1].id)).toBe(true)
    const again = applyLevelResult(s, 'l1', true, 3, 1500, 0)
    expect(again.reward.firstClear).toBe(false)
    expect(again.save.levels.l1).toEqual({ completed: true, stars: 3, bestScore: 1500 })
    const lost = applyLevelResult(s, 'l2', false, 0, 100, 10)
    expect(lost.save.levels.l2).toBeUndefined()
    expect(lost.save.coins).toBe(s.coins + 10)
  })
  it('Item-Kauf prüft Preis und Besitz', () => {
    const s = { ...defaultSave(), coins: 145 }
    expect(buyItem(s, 'fireRing')).toBeNull() // kostet 150
    const b = buyItem(s, 'lightningCore')! // kostet 140
    expect(b.coins).toBe(5)
    expect(b.owned).toContain('lightningCore')
    expect(buyItem(b, 'lightningCore')).toBeNull() // schon im Besitz
    expect(buyItem({ ...s, coins: 999 }, 'shield')).toBeNull() // Startitem, nicht käuflich
  })
  it('laufende Partie wird gespeichert und exakt wiederhergestellt', () => {
    const st = new MemoryStorage()
    const level = levelById('boss1')
    let g = createGame(level, ['shield'], { dict })
    const [, path] = [...findWords(g.board, dict).entries()][0]
    const r = playWord(g, path, level, { dict })
    if (!r.ok) throw new Error()
    g = r.state
    saveRun(st, g)
    const restored = loadRun(st)
    expect(restored).toEqual(g)
    // Weiterspielen liefert dasselbe Ergebnis wie ohne Neuladen (deterministisch).
    const [, p2] = [...findWords(g.board, dict).entries()][0]
    expect(playWord(restored!, p2, level, { dict })).toEqual(playWord(g, p2, level, { dict }))
  })
  it('beendete oder manipulierte Partien werden nicht fortgesetzt', () => {
    const st = new MemoryStorage()
    const g = createGame(levelById('l1'), [], { dict })
    saveRun(st, { ...g, status: 'won' })
    expect(st.getItem(RUN_KEY)).toBeNull()
    st.setItem(RUN_KEY, JSON.stringify({ version: 1, state: { ...g, board: g.board.slice(3) } }))
    expect(loadRun(st)).toBeNull()
    st.setItem(RUN_KEY, JSON.stringify({ version: 1, state: { ...g, levelId: 'nope' } }))
    expect(loadRun(st)).toBeNull()
    st.setItem(SAVE_KEY, 'garbage')
    expect(loadSave(st)).toEqual(defaultSave())
  })
})
