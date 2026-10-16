import { describe, expect, it } from 'vitest'
import { applyDifficulty, comboMultiplier, LEVELS, levelById } from './content'
import { createGame, nextBossAttack, playWord, withValidTargets } from './engine'
import { advanceMission, ENERGY_LIMIT, matchesMission, MISSION_COINS, refreshMission, validMissionKinds } from './missions'
import { commonWordsOnBoard, findPath } from './solver'
import { COMMON_WORDS } from './data/commonWords'
import { boardFrom, loadDict } from './testUtils'
import { loadRun, MemoryStorage, RUN_KEY, saveRun } from './save'
import type { Difficulty, GameState, Tile } from './types'
import { previewWordPower } from './scoring'

const ctx = { dict: loadDict() }
const boss = levelById('boss1')
const rows = ['HAUSEN', 'ROTENS', 'BLUMEN', 'GARTEN', 'SEILEN', 'REISEN']
function fixture(mods: Record<number, Partial<Tile>> = {}): GameState {
  return { ...createGame(boss, ['shield', 'wordBlade', 'lifeCrystal'], ctx), board: boardFrom(rows, mods), targets: ['HAUS'], nextTileId: 1000, nextBonusAt: 999, mission: null, nextMissionAt: 999 }
}
function turn(g: GameState, p = [0, 1, 2, 3]) {
  const r = playWord(g, p, boss, ctx)
  if (!r.ok) throw new Error(r.reason)
  return r
}

describe('Gezielte Spezialketten & Energie', () => {
  it('previews the exact cross-strike power including gold outside the word', () => {
    const g = fixture({ 0: { special: 'bomb' }, 1: { special: 'lightning' }, 31: { special: 'gold' } })
    // HAUS: 5 base + 8 extra cells + 2 gold power; gold is in the cleared column.
    expect(previewWordPower(g, [0, 1, 2, 3]).total).toBe(15)
    const r = turn(g)
    expect(r.steps.find(s => s.type === 'word')!.power).toBe(15)
    expect(r.state.coinsEarned).toBe(10)
  })
  it('free short words keep the current combo; a repeated blitz word receives no bonus', () => {
    const g = { ...fixture(), combo: 2 }
    expect(previewWordPower(g, [6, 7, 8]).total).toBe(4)
    expect(turn(g, [6, 7, 8]).state.combo).toBe(2)
    const repeat = { ...g, foundWords: ['ROT'], bonus: { word: 'ROT', phase: 'active' as const, multiplier: 3, durationMs: 12000, msLeft: 9000 } }
    const r = turn(repeat, [6, 7, 8])
    expect(r.steps.find(s => s.type === 'word')!.power).toBe(4)
    expect(r.state.bonusesWon).toBe(0)
    expect(r.state.coinsEarned).toBe(0)
  })
  it('kombiniert Bombe und Blitz nur bei bewusster Verwendung im Wort', () => {
    const g = fixture({ 0: { special: 'bomb' }, 1: { special: 'lightning' }, 31: { blocker: 'ice' } })
    const before = JSON.stringify(g)
    const r = turn(g)
    const clear = r.steps.find(s => s.type === 'clear')!
    expect(clear.fusion).toBe(true)
    expect(clear.triggered.map(t => t.id)).toEqual([1, 2])
    expect(clear.specialIds).toContain(26) // Column of lightning.
    expect(clear.unblockedIds).toContain(32)
    expect(clear.specialIds).not.toContain(32) // Ice is freed, not removed.
    expect(new Set([...clear.wordIds, ...clear.specialIds]).size).toBe(clear.wordIds.length + clear.specialIds.length)
    expect(JSON.stringify(g)).toBe(before)
    expect(turn(g)).toEqual(r)
  })
  it('an incidental chain does not trigger fusion or resolve a special twice', () => {
    const r = turn(fixture({ 0: { special: 'lightning' }, 4: { special: 'bomb' }, 5: { special: 'lightning' } }))
    const clear = r.steps.find(s => s.type === 'clear')!
    expect(clear.fusion).toBe(false)
    expect(clear.triggered).toHaveLength(3)
    expect(new Set(clear.triggered.map(t => t.id)).size).toBe(3)
    expect(r.steps.findIndex(s => s.type === 'clear')).toBeLessThan(r.steps.findIndex(s => s.type === 'board'))
  })
  it('stabilises a full-board chain before validating targets and missions', () => {
    const mods = Object.fromEntries(Array.from({ length: 36 }, (_, i) => [i, { special: i % 2 ? 'bomb' : 'lightning' }])) as Record<number, Partial<Tile>>
    const r = turn(fixture(mods))
    const clear = r.steps.find(s => s.type === 'clear')!
    expect(clear.triggered).toHaveLength(36)
    expect(r.state.board).toHaveLength(36)
    expect(new Set(r.state.board.map(t => t.id)).size).toBe(36)
    expect(commonWordsOnBoard(r.state.board, COMMON_WORDS).length).toBeGreaterThanOrEqual(2)
    for (const w of r.state.targets) expect(findPath(r.state.board, w)).not.toBeNull()
    expect(r.state.wordsPlayed).toBe(1)
    expect(r.state.boss!.countdown).toBe(2)
  })
  it('earns one extra lightning at full energy; newly created specials do not auto-fire', () => {
    const g = { ...fixture(), energy: ENERGY_LIMIT - 1, targets: ['BLUMEN'] }
    const r = turn(g, [12, 13, 14, 15, 16, 17])
    expect(r.state.energy).toBe(1)
    expect(r.state.energySpecials).toBe(1)
    expect(r.steps.find(s => s.type === 'energy')?.charged).toBe(true)
    const board = r.steps.find(s => s.type === 'board')!
    expect(board.spawned.map(s => s.kind)).toEqual(expect.arrayContaining(['bomb', 'lightning']))
    expect(r.steps.find(s => s.type === 'clear')!.triggered).toHaveLength(0)
  })
  it('repeated long words cannot farm energy or earned specials', () => {
    const g = { ...fixture(), energy: 5, foundWords: ['BLUMEN'] }
    const r = turn(g, [12, 13, 14, 15, 16, 17])
    expect(r.state.energy).toBe(5)
    expect(r.state.combo).toBe(0)
    expect(r.steps.find(s => s.type === 'board')!.spawned.filter(s => s.kind !== 'gold')).toHaveLength(0)
  })
  it('caps combo power and grants milestone energy exactly once per new word', () => {
    expect(comboMultiplier(100)).toBe(1.5)
    const r = turn({ ...fixture(), combo: 5 })
    expect(r.state.combo).toBe(6)
    expect(r.state.energy).toBe(1)
    expect(r.steps.filter(s => s.type === 'energy')).toHaveLength(1)
  })
})

describe('Dynamische Missionen & einmalige Belohnungen', () => {
  it('only offers missions with playable paths in all levels and modes', () => {
    for (const mode of ['relaxed', 'normal', 'expert'] as Difficulty[]) for (const base of LEVELS) for (let seed = 1; seed <= 8; seed++) {
      const g = createGame(applyDifficulty(base, mode), [], ctx, seed, mode)
      if (!g.mission) continue
      const kinds = validMissionKinds(g)
      expect(kinds).toContain(g.mission.kind)
      if (g.mission.kind !== 'streak') expect(commonWordsOnBoard(g.board, COMMON_WORDS).some(w => {
        const p = findPath(g.board, w)!
        return matchesMission(g.mission!.kind, w, p.map(i => g.board[i]))
      })).toBe(true)
    }
  })
  it('rewards gold only once alongside mission coins and word power', () => {
    const g = { ...fixture({ 1: { special: 'gold' } }), mission: { kind: 'gold' as const, progress: 0 } }
    const r = turn(g)
    const word = r.steps.find(s => s.type === 'word')!
    expect(r.state.coinsEarned).toBe(10 + MISSION_COINS)
    expect(r.state.score).toBe(word.power * 10)
    expect(r.state.missionsCompleted).toBe(1)
    expect(r.steps.filter(s => s.type === 'mission')).toHaveLength(1)
    expect(r.state.mission).toBeNull()
    const again = turn({ ...r.state, board: boardFrom(rows), targets: ['HAUS'] })
    expect(again.state.coinsEarned).toBe(r.state.coinsEarned)
    expect(again.state.missionsCompleted).toBe(1)
  })
  it('keeps streak progress, resets on repeats and completes on the third fresh word', () => {
    let mission = { kind: 'streak' as const, progress: 0 }
    mission = advanceMission(mission, 'HAUS', [], true).mission as typeof mission
    expect(mission.progress).toBe(1)
    expect(advanceMission(mission, 'HAUS', [], false).mission!.progress).toBe(0)
    const r = advanceMission({ ...mission, progress: 2 }, 'ROT', [], true)
    expect(r.completed).toBe(true)
    expect(r.mission).toBeNull()
    expect(advanceMission(null, 'ROT', [], true).completed).toBe(false)
  })
  it('replaces unreachable fire/gold goals without consuming turns, HP or coins', () => {
    const g = { ...fixture(), mission: { kind: 'fire' as const, progress: 0 }, nextMissionAt: 0 }
    const r = withValidTargets(g)
    expect(r.mission?.kind).not.toBe('fire')
    expect(r.wordsPlayed).toBe(g.wordsPlayed)
    expect(r.player).toEqual(g.player)
    expect(r.boss).toEqual(g.boss)
    expect(r.coinsEarned).toBe(g.coinsEarned)
  })
  it('does not offer a three-word mission with only two moves remaining', () => {
    expect(validMissionKinds({ ...fixture(), movesLeft: 2 })).not.toContain('streak')
    expect(refreshMission({ ...fixture(), status: 'won' })).toBeNull()
  })
  it('a stale target in a resumed run cannot reward a previously found word again', () => {
    const g = { ...fixture(), foundWords: ['HAUS'], combo: 5 }
    const r = turn(g)
    expect(r.steps.find(s => s.type === 'word')!.kind).toBe('repeat')
    expect(r.state.targetsSolved).toBe(0)
    expect(r.state.combo).toBe(0)
    expect(r.state.coinsEarned).toBe(0)
    expect(r.state.targets).not.toContain('HAUS')
  })
  it('rechecks missions after a complete cascade and free dead-board rescue', () => {
    const g = { ...fixture(), board: boardFrom(['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']), mission: { kind: 'gold' as const, progress: 0 }, nextMissionAt: 0 }
    const r = turn(g)
    if (r.state.mission) expect(validMissionKinds(r.state)).toContain(r.state.mission.kind)
    expect(commonWordsOnBoard(r.state.board, COMMON_WORDS).length).toBeGreaterThanOrEqual(2)
  })
})

describe('Boss-Absicht & fortgesetzte Partien', () => {
  it('executes the announced attack even when the last word crosses the rage threshold', () => {
    const g = fixture()
    g.boss = { ...g.boss!, hp: 112, countdown: 1, patternIndex: 1 }
    const announced = nextBossAttack(g)
    const r = turn(g)
    expect(r.state.boss!.enraged).toBe(true)
    expect(r.steps.find(s => s.type === 'bossAttack')!.attackId).toBe(announced)
    expect(nextBossAttack(r.state)).toBe('blaze')
  })
  it('saves energy, mission progress and locked attacks without replaying rewards', () => {
    const storage = new MemoryStorage()
    const g = { ...fixture(), energy: 4, energySpecials: 2, missionsCompleted: 3, mission: { kind: 'streak' as const, progress: 2 } }
    g.boss!.enraged = true
    g.boss!.queuedAttack = 'emberRain'
    saveRun(storage, g)
    const restored = loadRun(storage)!
    expect(restored).toEqual(g)
    expect(turn(restored)).toEqual(turn(g))
  })
  it('migrates older saves and sanitises invalid new progress fields', () => {
    const storage = new MemoryStorage()
    storage.setItem(RUN_KEY, JSON.stringify({ version: 1, state: { ...fixture(), energy: -5, energySpecials: 1.1, missionsCompleted: 'x', mission: { kind: 'impossible', progress: 99 }, nextMissionAt: undefined } }))
    const g = loadRun(storage)!
    expect(g.energy).toBe(0)
    expect(g.energySpecials).toBe(0)
    expect(g.missionsCompleted).toBe(0)
    expect(g.mission).toBeNull()
    expect(g.nextMissionAt).toBe(0)
  })
  it('drops an invalid queued attack from a tampered save', () => {
    const storage = new MemoryStorage()
    const g = fixture()
    g.boss!.queuedAttack = '__proto__'
    saveRun(storage, g)
    expect(loadRun(storage)!.boss!.queuedAttack).toBeNull()
  })
})
