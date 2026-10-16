import { describe, expect, it } from 'vitest'
import { applyDifficulty, attackDamage, BRUTZEL, comboMultiplier, DIFFICULTIES, levelById, LEVELS, WORD_REWARDS } from './content'
import { createGame, playWord, withValidTargets, type TurnStep } from './engine'
import { Rng } from './rng'
import { findPath, findWords } from './solver'
import { boardFrom, loadDict } from './testUtils'
import type { Difficulty, GameState } from './types'
import { classifyWord, refreshTargets, shapeRefill, targetPool } from './words'

const dict = loadDict()
const ctx = { dict }
const MODES: Difficulty[] = ['relaxed', 'normal', 'expert']
const FILL = ['HAUSXX', 'ROTXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']
const stepsOf = <T extends TurnStep['type']>(steps: TurnStep[], type: T) => steps.filter((s) => s.type === type) as Extract<TurnStep, { type: T }>[]

function game(levelId: string, d: Difficulty, seed = 7): { g: GameState; level: ReturnType<typeof applyDifficulty> } {
  const level = applyDifficulty(levelById(levelId), d)
  return { g: createGame(level, [], ctx, seed, d), level }
}

describe('Worttypen', () => {
  it('klassifiziert Ziel-, Geheim-, Selten-, Frei- und Wiederholungswörter', () => {
    expect(classifyWord('HAUS', ['HAUS'], [])).toBe('target')
    expect(classifyWord('HAUS', [], [])).toBe('secret')
    expect(classifyWord('FENSTER', [], [])).toBe('rare') // ≥ 6 Buchstaben
    expect(classifyWord('ROT', [], [])).toBe('free') // 3 Buchstaben: kein Geheimwort
    expect(classifyWord('HAUS', [], ['HAUS'])).toBe('repeat')
    expect(classifyWord('HAUS', ['HAUS'], ['HAUS'])).toBe('repeat') // auch ein veraltetes Ziel belohnt nie doppelt
  })
  it('Zielwort-Pools enthalten nur Alltagswörter in Modus-Länge, keine Exoten', () => {
    for (const d of ['relaxed', 'normal'] as Difficulty[]) {
      const [min, max] = DIFFICULTIES[d].targetLen
      const pool = targetPool(d)
      expect(pool.length).toBeGreaterThan(150)
      for (const w of pool) {
        expect(dict.has(w), w).toBe(true)
        expect(w.length).toBeGreaterThanOrEqual(min)
        expect(w.length).toBeLessThanOrEqual(max)
        expect(w).not.toMatch(/[JQXY]/)
      }
    }
  })
})

describe('Zielwörter sind immer erreichbar', () => {
  it('Startbretter zeigen die richtige Anzahl bildbarer Ziele (alle Modi, alle Level)', () => {
    for (const d of MODES)
      for (const l of LEVELS)
        for (let seed = 1; seed <= 15; seed++) {
          const { g } = game(l.id, d, seed)
          expect(g.targets).toHaveLength(DIFFICULTIES[d].targets)
          expect(new Set(g.targets).size).toBe(g.targets.length)
          for (const w of g.targets) expect(findPath(g.board, w), `${d}/${l.id}/${seed}: ${w}`).not.toBeNull()
        }
  })

  it('nach jedem Zug (inkl. Schwerkraft, Bossangriff, Feuer, Rettung) sind alle Ziele bildbar', () => {
    for (const d of MODES)
      for (const l of LEVELS) {
        let { g } = game(l.id, d, 11)
        const level = applyDifficulty(l, d)
        g = { ...g, movesLeft: g.movesLeft === null ? null : 999, player: g.player ? { ...g.player, hp: 999, maxHp: 999 } : null }
        if (g.boss) g = { ...g, boss: { ...g.boss, hp: 9999, maxHp: 9999 } }
        const rng = new Rng(5)
        for (let t = 0; t < 30; t++) {
          const words = [...findWords(g.board, dict).entries()]
          // mix of target plays and free plays
          const pick = g.targets.length && t % 2 === 0 ? [g.targets[0], findPath(g.board, g.targets[0])!] : rng.pick(words)
          const r = playWord(g, pick[1] as number[], level, ctx)
          if (!r.ok) throw new Error(`${d}/${l.id}: ${r.reason}`)
          g = r.state
          if (g.status !== 'playing') break
          expect(g.targets).toHaveLength(DIFFICULTIES[d].targets)
          for (const w of g.targets) expect(findPath(g.board, w), `${d}/${l.id} turn ${t}: ${w}`).not.toBeNull()
          expect(findWords(g.board, dict).size).toBeGreaterThan(0)
        }
      }
  })

  it('gelöstes Ziel wird ersetzt, unerreichbares Ziel wird ausgetauscht', () => {
    const board = boardFrom(['HAUSXX', 'ROTXXX', 'TEEXXX', 'EISXXX', 'XXXXXX', 'XXXXXX'])
    const r = refreshTargets(board, ['HAUS', 'FEUER'], 'normal', new Rng(3), { solved: 'HAUS' })
    expect(r.targets).not.toContain('HAUS')
    expect(r.dropped).toEqual(['FEUER']) // nicht bildbar → entfernt
    expect(r.targets).toHaveLength(2)
    for (const w of r.targets) expect(findPath(r.board, w)).not.toBeNull()
  })

  it('Injektion verändert keine Steine anderer Ziele oder des Blitzworts', () => {
    const board = boardFrom(['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'])
    const r = refreshTargets(board, ['HAUS'], 'relaxed', new Rng(9), { avoid: [] })
    expect(r.targets[0]).toBe('HAUS')
    expect(r.targets).toHaveLength(3)
    for (let i = 0; i < 4; i++) expect(r.board[i].letter).toBe(board[i].letter)
    expect(r.injectedIds.length).toBeGreaterThan(0)
  })

  it('bereits gefundene Wörter werden nicht erneut als Ziel angeboten (solange Alternativen existieren)', () => {
    const board = boardFrom(['HAUSXX', 'ROTXXX', 'TEEXXX', 'EISXXX', 'XXXXXX', 'XXXXXX'])
    for (let seed = 1; seed < 20; seed++) {
      const r = refreshTargets(board, [], 'relaxed', new Rng(seed), { exclude: ['ROT', 'TEE'] })
      expect(r.targets).not.toContain('ROT')
      expect(r.targets).not.toContain('TEE')
      expect(r.targets).toHaveLength(3)
    }
  })

  it('Experte zeigt keine Ziele', () => {
    const { g } = game('l1', 'expert')
    expect(g.targets).toEqual([])
  })

  it('ältere gespeicherte Partien erhalten gültige Ziele', () => {
    const { g } = game('l1', 'normal')
    const fixed = withValidTargets({ ...g, targets: [] })
    expect(fixed.targets).toHaveLength(2)
    for (const w of fixed.targets) expect(findPath(fixed.board, w)).not.toBeNull()
  })
})

describe('Geheimwörter', () => {
  it('werden nicht vorab gelistet – der Zustand kennt nur Ziele, Blitzwort und schon gespielte Wörter', () => {
    const { g } = game('l1', 'normal')
    expect(g.foundWords).toEqual([])
    const json = JSON.stringify(g)
    const listed = new Set([...g.targets, ...(g.bonus ? [g.bonus.word] : [])])
    // Every word-like array in the state is either targets or foundWords.
    const arrays = Object.entries(g).filter(([, v]) => Array.isArray(v) && v.every((x) => typeof x === 'string'))
    // moments = earned Wortmeister achievements, never words
    expect(arrays.map(([k]) => k).sort()).toEqual(['equipped', 'foundWords', 'moments', 'targets'])
    expect(listed.size).toBeLessThanOrEqual(3)
    expect(json).not.toMatch(/secretList|solutions|allWords/)
  })

  it('Belohnung nur einmal: zweites Spielen desselben Wortes gibt keine Extras und setzt die Combo zurück', () => {
    const base = game('l1', 'normal').g
    const level = applyDifficulty(levelById('l1'), 'normal')
    let g: GameState = { ...base, board: boardFrom(FILL), targets: [], nextBonusAt: 999 }
    const r1 = playWord(g, [0, 1, 2, 3], level, ctx)
    if (!r1.ok) throw new Error()
    const w1 = stepsOf(r1.steps, 'word')[0]
    expect(w1.kind).toBe('secret')
    expect(w1.coins).toBe(WORD_REWARDS.secret.coins)
    expect(r1.state.secretsFound).toBe(1)
    g = { ...r1.state, board: boardFrom(FILL), targets: [] }
    const r2 = playWord(g, [0, 1, 2, 3], level, ctx)
    if (!r2.ok) throw new Error()
    const w2 = stepsOf(r2.steps, 'word')[0]
    expect(w2.kind).toBe('repeat')
    expect(w2.coins).toBe(0)
    expect(r2.state.combo).toBe(0)
    expect(r2.state.secretsFound).toBe(1)
    expect(r2.state.coinsEarned).toBe(r1.state.coinsEarned)
  })
})

describe('Schaden & Belohnungen im Bosskampf', () => {
  const boss = applyDifficulty(levelById('boss1'), 'normal')
  const fresh = (patch: Partial<GameState> = {}): GameState => ({
    ...createGame(boss, [], ctx, 3, 'normal'),
    board: boardFrom(FILL),
    nextTileId: 1000,
    nextBonusAt: 999,
    ...patch,
  })
  const dmg = (g: GameState) => {
    const r = playWord(g, [0, 1, 2, 3], boss, ctx)
    if (!r.ok) throw new Error(r.reason)
    return { r, d: stepsOf(r.steps, 'bossDamage')[0].amount }
  }
  it('Zielwort = normaler Schaden (HAUS = 5)', () => {
    expect(dmg(fresh({ targets: ['HAUS'] })).d).toBe(5)
  })
  it('Geheimwort = +30 % (mindestens +2) → 7', () => {
    expect(dmg(fresh({ targets: [] })).d).toBe(7)
  })
  it('Combo-Multiplikator wirkt auf den Schaden', () => {
    expect(comboMultiplier(1)).toBe(1)
    expect(comboMultiplier(2)).toBe(1.1)
    expect(comboMultiplier(99)).toBe(1.5)
    // Combo 4 → 5. Wort ×1.4: round(5 × 1.4) = 7
    expect(dmg(fresh({ targets: ['HAUS'], combo: 4 })).d).toBe(7)
  })
  it('Blitzwort: 3× Kraft, +8 Münzen und betäubt den Boss (Angriff 1 Wort später)', () => {
    const g = fresh({ targets: ['HAUS'], bonus: { word: 'HAUS', multiplier: 3, durationMs: 1, msLeft: 1, phase: 'active' } })
    const { r, d } = dmg({ ...g, boss: { ...g.boss!, countdown: 1 } })
    expect(d).toBe(15)
    expect(stepsOf(r.steps, 'stun')).toHaveLength(1)
    expect(stepsOf(r.steps, 'bossAttack')).toHaveLength(0) // betäubt: kein Angriff in diesem Zug
    expect(r.state.boss!.countdown).toBe(1)
    expect(stepsOf(r.steps, 'word')[0].coins).toBe(WORD_REWARDS.blitzCoins)
  })
  it('Items wirken weiterhin (Wortklinge auf Geheimwort-Basis)', () => {
    const g = fresh({ targets: [], equipped: ['goldenAlphabet'] })
    // HAUS hat keine seltenen Buchstaben → Goldenes Alphabet +0
    expect(dmg(g).d).toBe(7)
  })
  it('Modi skalieren Boss-LP und Angriffsschaden', () => {
    for (const d of MODES) {
      const g = createGame(applyDifficulty(levelById('boss1'), d), [], ctx, 1, d)
      expect(g.boss!.maxHp).toBe(Math.round(BRUTZEL.maxHp * DIFFICULTIES[d].bossHpScale))
    }
    expect(attackDamage(10, 'relaxed')).toBeLessThan(attackDamage(10, 'normal'))
    expect(attackDamage(10, 'expert')).toBeGreaterThan(attackDamage(10, 'normal'))
  })
})

describe('Schwierigkeitsmodi', () => {
  it('Züge und Ziele werden skaliert, Bosslevel ohne Zuglimit', () => {
    const l1 = levelById('l1')
    expect(applyDifficulty(l1, 'relaxed').moves).toBe(l1.moves! + 4)
    expect(applyDifficulty(l1, 'normal')).toBe(l1)
    expect(applyDifficulty(l1, 'expert').moves).toBe(l1.moves! - 2)
    const g = applyDifficulty(l1, 'expert').goal
    expect(g.kind === 'score' && g.target).toBeGreaterThan(550)
    expect(applyDifficulty(levelById('boss1'), 'expert').moves).toBeNull()
  })
})

describe('Automatische Korrekturen kosten nichts', () => {
  it('Rettung und Zielwort-Injektion verbrauchen keinen zusätzlichen Zug und lösen keinen Angriff aus', () => {
    const level = applyDifficulty(levelById('l1'), 'relaxed')
    for (let seed = 1; seed <= 20; seed++) {
      const g: GameState = { ...createGame(level, [], ctx, seed, 'relaxed'), board: boardFrom(FILL), rng: seed, nextTileId: 1000, targets: ['HAUS'], nextBonusAt: 999 }
      const r = playWord(g, [0, 1, 2, 3], level, ctx)
      if (!r.ok) throw new Error()
      expect(r.state.movesLeft).toBe(g.movesLeft! - 1)
      expect(r.state.targets).toHaveLength(3)
    }
    const boss = applyDifficulty(levelById('boss1'), 'normal')
    for (let seed = 1; seed <= 20; seed++) {
      const base = createGame(boss, [], ctx, seed, 'normal')
      const g: GameState = { ...base, board: boardFrom(FILL), rng: seed, nextTileId: 1000, targets: ['HAUS'], nextBonusAt: 999, boss: { ...base.boss!, countdown: 3 } }
      const r = playWord(g, [0, 1, 2, 3], boss, ctx)
      if (!r.ok) throw new Error()
      expect(stepsOf(r.steps, 'bossAttack')).toHaveLength(0)
      expect(r.state.player!.hp).toBe(base.player!.hp)
      expect(r.state.boss!.countdown).toBe(2)
    }
  })
})

describe('Nachfüllen mit echten Wörtern', () => {
  it('verändert nur neue Steine', () => {
    const board = boardFrom(['XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'])
    const cells = [0, 1, 2, 6, 7, 8]
    for (let seed = 1; seed < 30; seed++) {
      const out = shapeRefill(board, cells, new Rng(seed), 1)
      out.forEach((t, i) => {
        if (!cells.includes(i)) expect(t).toBe(board[i])
      })
    }
  })
})
