import { describe, expect, it } from 'vitest'
import { BRUTZEL, LEVELS, levelById, PLAYER_MAX_HP } from './content'
import { activateBonus, createGame, goalProgress, nextBossAttack, playWord, starsFor, tickBonus, type TurnStep } from './engine'
import { equipItem, ITEM_VALUES, sanitizeEquipped, unequipItem } from './items'
import { computePower, crystalHeal, lengthMultiplier, mitigateDamage, specialsForLength } from './scoring'
import { findWords } from './solver'
import { boardFrom, loadDict } from './testUtils'
import type { GameState, ItemId, Tile } from './types'

const dict = loadDict()
const ctx = { dict }
const L1 = levelById('l1')
const BOSS = levelById('boss1')

/** Replace the board of a fresh game with a hand-made one. */
function withBoard(state: GameState, rows: string[], mods: Record<number, Partial<Tile>> = {}): GameState {
  // HAUS is a visible target here → plain damage without secret-word bonus.
  return { ...state, board: boardFrom(rows, mods), nextTileId: 1000, targets: ['HAUS'], foundWords: [], combo: 0 }
}
const FILL = ['HAUSXX', 'ROTXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']
const stepsOf = (steps: TurnStep[], type: TurnStep['type']) => steps.filter((s) => s.type === type)

describe('Wortprüfung im Spielzug', () => {
  it('lehnt ungültige Wörter ohne Zustandsänderung ab', () => {
    const g = withBoard(createGame(L1, [], ctx), FILL)
    const r = playWord(g, [6, 7, 1], L1, ctx) // R O A
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-a-word')
    expect(playWord(g, [0, 1], L1, ctx).ok).toBe(false)
    const reused = playWord(g, [0, 1, 0], L1, ctx)
    expect(!reused.ok && reused.reason).toBe('reused')
  })
  it('akzeptiert gültige Wörter, entfernt Steine und füllt nach', () => {
    const g = withBoard(createGame(L1, [], ctx), FILL)
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.word).toBe('HAUS')
    const ids = new Set(r.state.board.map((t) => t.id))
    for (const id of [1, 2, 3, 4]) expect(ids.has(id)).toBe(false)
    expect(r.state.board).toHaveLength(36)
    expect(r.state.score).toBe(50) // 4 × 1 × 1.25 = 5 Kraft → 50 Punkte
    expect(r.state.movesLeft).toBe(L1.moves! - 1)
    expect(r.state.wordsPlayed).toBe(1)
    // Steine darunter (R O T in Zeile 1) bleiben, Zeile 0 wird neu befüllt.
    expect(r.state.board[6].letter).toBe('R')
    expect(stepsOf(r.steps, 'board')).toHaveLength(1)
  })
})

describe('Punkte, Kombos & Spezialsteine', () => {
  it('Längenmultiplikator steigt überproportional', () => {
    expect(lengthMultiplier(3)).toBe(1)
    expect(lengthMultiplier(4)).toBe(1.25)
    expect(lengthMultiplier(5)).toBe(1.6)
    expect(lengthMultiplier(6)).toBe(2)
    expect(lengthMultiplier(7)).toBe(2.5)
    expect(lengthMultiplier(9)).toBe(3.5)
  })
  it('Spezialsteine nach Wortlänge', () => {
    expect(specialsForLength(5)).toEqual([])
    expect(specialsForLength(6)).toEqual(['bomb'])
    expect(specialsForLength(7)).toEqual(['lightning'])
    expect(specialsForLength(8)).toEqual(['lightning', 'bomb'])
  })
  it('ein 7-Buchstaben-Wort erzeugt einen Blitzstein', () => {
    const g = withBoard(createGame(L1, [], ctx), ['FENSTE', 'XXXXXR', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'])
    // FENSTER = 7 → Blitz
    const r = playWord(g, [0, 1, 2, 3, 4, 5, 11], L1, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const board = stepsOf(r.steps, 'board')[0] as Extract<TurnStep, { type: 'board' }>
    expect(board.spawned.map((s) => s.kind)).toContain('lightning')
    expect(r.state.board.some((t) => t.special === 'lightning')).toBe(true)
  })
  it('Blitzstein räumt seine Reihe, Bombe die Nachbarn – deterministisch und mit Kette', () => {
    const g = withBoard(createGame(L1, [], ctx), ['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'], {
      1: { special: 'lightning' },
      5: { special: 'bomb' },
    })
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const clear = stepsOf(r.steps, 'clear')[0] as Extract<TurnStep, { type: 'clear' }>
    expect(clear.triggered.map((t) => t.kind)).toEqual(['lightning', 'bomb'])
    // Reihe 0: 2 zusätzliche Steine (4,5) + Bombe an 5: Nachbarn 10, 11 (4 schon weg)
    expect(clear.specialIds.sort((a, b) => a - b)).toEqual([5, 6, 11, 12])
    const again = playWord(g, [0, 1, 2, 3], L1, ctx)
    expect(again).toEqual(r)
  })
  it('Spezialeffekte zerstören Blocker nicht unkontrolliert: Blocker werden nur befreit', () => {
    const g = withBoard(createGame(L1, [], ctx), FILL, { 0: { special: 'bomb' }, 7: { blocker: 'ice' } })
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    if (!r.ok) throw new Error('expected ok')
    expect(r.state.iceFreed).toBe(1)
    expect(r.state.board.some((t) => t.id === 8 && t.blocker === null)).toBe(true)
  })
  it('Goldstein bringt Münzen', () => {
    const g = withBoard(createGame(L1, [], ctx), FILL, { 2: { special: 'gold' } })
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    if (!r.ok) throw new Error('expected ok')
    expect(r.state.coinsEarned).toBe(10)
    expect(stepsOf(r.steps, 'coins')).toHaveLength(1)
  })
})

describe('Item-Effekte', () => {
  const tiles = (w: string, fire: number[] = []) => [...w].map((l, i) => ({ id: i, letter: l, special: null, blocker: null, fire: fire.includes(i) }))
  const base = { wordIndex: 1, extraCleared: 0, goldTiles: 0, bonusMultiplier: 1 }
  const power = (w: string, equipped: ItemId[], extra: Partial<typeof base> = {}, fire: number[] = []) =>
    computePower(tiles(w, fire), { ...base, equipped, ...extra }).total

  it('Basis ohne Items', () => {
    expect(power('HAUS', [])).toBe(5)
    expect(power('FEUER', [])).toBe(11) // 3+1+1+1+1 = 7 × 1.6
  })
  it('Goldenes Alphabet: +1 je Wert-2-Buchstabe, +2 je Wert-3/4-Buchstabe', () => {
    expect(power('HAUS', ['goldenAlphabet'])).toBe(5)
    expect(power('FEUER', ['goldenAlphabet'])).toBe(11 + 2) // F
    expect(power('KOMPOTT', ['goldenAlphabet']) - power('KOMPOTT', [])).toBe(1 + 1 + 1 + 2 + 1) // K O M P O
  })
  it('Wortklinge: +25 % ab 5, +60 % ab 7 Buchstaben', () => {
    expect(power('HAUS', ['wordBlade'])).toBe(5)
    expect(power('FEUER', ['wordBlade'])).toBe(11 + 3)
    const seven = power('FENSTER', [])
    expect(power('FENSTER', ['wordBlade'])).toBe(seven + Math.round(seven * 0.6))
  })
  it('Feuerring: +4 je brennendem Stein', () => {
    expect(power('HAUS', ['fireRing'], {}, [0, 2])).toBe(5 + 8)
    expect(power('HAUS', [], {}, [0, 2])).toBe(5)
  })
  it('Blitzkern: jedes 3. Wort +5', () => {
    expect(ITEM_VALUES.lightningCore.damage).toBe(5)
    expect(power('HAUS', ['lightningCore'], { wordIndex: 1 })).toBe(5)
    expect(power('HAUS', ['lightningCore'], { wordIndex: 3 })).toBe(10)
    expect(power('HAUS', ['lightningCore'], { wordIndex: 5 })).toBe(5)
    expect(power('HAUS', ['lightningCore'], { wordIndex: 6 })).toBe(10)
  })
  it('Schutzschild: −40 %, aufgerundet, mindestens 1', () => {
    expect(mitigateDamage(7, ['shield'])).toBe(5)
    expect(mitigateDamage(11, ['shield'])).toBe(7)
    expect(mitigateDamage(1, ['shield'])).toBe(1)
    expect(mitigateDamage(7, [])).toBe(7)
  })
  it('Lebenskristall: jedes 4. Wort +5 LP', () => {
    expect(crystalHeal(4, ['lifeCrystal'])).toBe(5)
    expect(crystalHeal(3, ['lifeCrystal'])).toBe(0)
    expect(crystalHeal(4, [])).toBe(0)
  })
  it('Bonusmultiplikator verdreifacht die Kraft', () => {
    expect(power('HAUS', [], { bonusMultiplier: 3 })).toBe(15)
  })
})

describe('Ausrüstung: genau drei Slots', () => {
  const owned: ItemId[] = ['wordBlade', 'shield', 'lifeCrystal', 'fireRing']
  it('maximal drei Items', () => {
    let eq: ItemId[] = []
    for (const i of ['wordBlade', 'shield', 'lifeCrystal'] as ItemId[]) {
      const r = equipItem(eq, owned, i)
      expect(r.ok).toBe(true)
      if (r.ok) eq = r.equipped
    }
    const r4 = equipItem(eq, owned, 'fireRing')
    expect(r4).toEqual({ ok: false, reason: 'full' })
    const un = unequipItem(eq, 'shield')
    expect(un.ok && un.equipped).toEqual(['wordBlade', 'lifeCrystal'])
  })
  it('nicht besessene Items und Wechsel im Kampf sind gesperrt', () => {
    expect(equipItem([], ['shield'], 'fireRing')).toEqual({ ok: false, reason: 'not-owned' })
    expect(equipItem([], owned, 'shield', true)).toEqual({ ok: false, reason: 'locked-in-fight' })
    expect(unequipItem(['shield'], 'shield', true)).toEqual({ ok: false, reason: 'locked-in-fight' })
  })
  it('bereinigt manipulierte Speicherstände', () => {
    expect(sanitizeEquipped(['shield', 'shield', 'fireRing', 'bogus', 'wordBlade', 'lifeCrystal'], owned)).toEqual([
      'shield',
      'fireRing',
      'wordBlade',
    ])
    expect(sanitizeEquipped('nope', owned)).toEqual([])
  })
  it('Kampfzustand übernimmt die Ausrüstung unveränderlich', () => {
    const eq: ItemId[] = ['shield']
    const g = createGame(BOSS, eq, ctx)
    eq.push('fireRing')
    expect(g.equipped).toEqual(['shield'])
  })
})

describe('Bosskampf & Boss-KI', () => {
  it('Startwerte', () => {
    const g = createGame(BOSS, [], ctx)
    expect(g.player!.hp).toBe(PLAYER_MAX_HP)
    expect(g.boss!.hp).toBe(BRUTZEL.maxHp)
    expect(g.boss!.countdown).toBe(BRUTZEL.attackEvery)
    expect(nextBossAttack(g)).toBe('spit')
    expect(g.movesLeft).toBeNull()
  })
  it('Wörter verursachen Schaden, Boss greift nach genau 3 Wörtern an und folgt dem Muster', () => {
    let g = withBoard(createGame(BOSS, [], ctx), FILL)
    const seen: string[] = []
    for (let n = 0; n < 6; n++) {
      g = { ...g, board: boardFrom(FILL), bonus: null, nextBonusAt: 999, targets: ['HAUS'], combo: 0 }
      const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
      if (!r.ok) throw new Error('expected ok')
      expect(r.state.boss!.hp).toBe(g.boss!.hp - 5)
      const atk = stepsOf(r.steps, 'bossAttack') as Extract<TurnStep, { type: 'bossAttack' }>[]
      if ((n + 1) % 3 === 0) {
        expect(atk).toHaveLength(1)
        seen.push(atk[0].attackId)
      } else expect(atk).toHaveLength(0)
      g = r.state
    }
    expect(seen).toEqual(['spit', 'emberRain'])
    expect(g.player!.hp).toBeLessThan(PLAYER_MAX_HP)
  })
  it('Angriff wird angekündigt: nextBossAttack entspricht dem ausgeführten Angriff', () => {
    let g = withBoard(createGame(BOSS, [], ctx), FILL)
    g = { ...g, boss: { ...g.boss!, countdown: 1, patternIndex: 1 }, nextBonusAt: 999 }
    const announced = nextBossAttack(g)
    const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
    if (!r.ok) throw new Error()
    const atk = stepsOf(r.steps, 'bossAttack')[0] as Extract<TurnStep, { type: 'bossAttack' }>
    expect(atk.attackId).toBe(announced)
    expect(announced).toBe('emberRain')
    expect(atk.affectedIds).toHaveLength(3)
    expect(r.state.board.filter((t) => t.fire).length).toBeGreaterThanOrEqual(3)
  })
  it('Rußwolke blockiert Steine, Feuer verstärkt Angriffe, Schild & Feuerring mildern', () => {
    const base = withBoard(createGame(BOSS, [], ctx), FILL, { 20: { fire: true }, 21: { fire: true } })
    const setup = (eq: ItemId[]): GameState => ({ ...base, equipped: eq, boss: { ...base.boss!, countdown: 1, patternIndex: 0 }, nextBonusAt: 999 })
    const dmg = (eq: ItemId[]) => {
      const r = playWord(setup(eq), [0, 1, 2, 3], BOSS, ctx)
      if (!r.ok) throw new Error()
      return (stepsOf(r.steps, 'bossAttack')[0] as Extract<TurnStep, { type: 'bossAttack' }>).damage
    }
    const spit = BRUTZEL.attacks.spit.damage
    expect(dmg([])).toBe(spit + 2)
    expect(dmg(['fireRing'])).toBe(spit)
    expect(dmg(['shield'])).toBe(Math.ceil((spit + 2) * 0.6))
    const soot = playWord({ ...setup([]), boss: { ...base.boss!, countdown: 1, patternIndex: 3 } }, [0, 1, 2, 3], BOSS, ctx)
    if (!soot.ok) throw new Error()
    expect(soot.state.board.filter((t) => t.blocker === 'soot').length).toBeGreaterThanOrEqual(1)
  })
  it('Wut-Phase unter 50 % wechselt das Angriffsmuster', () => {
    let g = withBoard(createGame(BOSS, [], ctx), FILL)
    g = { ...g, boss: { ...g.boss!, hp: 72 }, nextBonusAt: 999 }
    const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.boss!.enraged).toBe(true)
    expect(stepsOf(r.steps, 'enrage')).toHaveLength(1)
    // The announced attack stays locked; the NEW cycle uses the rage pattern.
    expect(nextBossAttack(r.state)).toBe('spit')
    const due = { ...r.state, boss: { ...r.state.boss!, countdown: 1 }, board: g.board }
    const next = playWord(due, [0, 1, 2, 3], BOSS, ctx)
    if (!next.ok) throw new Error()
    expect(next.steps.find(s => s.type === 'bossAttack')?.attackId).toBe('spit')
    expect(nextBossAttack(next.state)).toBe('blaze')
  })
  it('Lebenskristall heilt im Kampf', () => {
    let g = withBoard(createGame(BOSS, ['lifeCrystal'], ctx), FILL)
    g = { ...g, wordsPlayed: 3, player: { hp: 30, maxHp: 60 }, nextBonusAt: 999 }
    const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.player!.hp).toBe(35)
    expect(stepsOf(r.steps, 'heal')).toHaveLength(1)
  })
  it('Sieg: Boss besiegt → kein Gegenangriff mehr', () => {
    let g = withBoard(createGame(BOSS, [], ctx), FILL)
    g = { ...g, boss: { ...g.boss!, hp: 3, countdown: 1 } }
    const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.status).toBe('won')
    expect(stepsOf(r.steps, 'bossAttack')).toHaveLength(0)
    expect(starsFor(r.state, BOSS)).toBe(3)
    expect(playWord(r.state, [0, 1, 2], BOSS, ctx).ok).toBe(false)
  })
  it('Niederlage bei 0 LP', () => {
    let g = withBoard(createGame(BOSS, [], ctx), FILL)
    g = { ...g, player: { hp: 4, maxHp: 60 }, boss: { ...g.boss!, countdown: 1 } }
    const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.status).toBe('lost')
    expect(r.state.player!.hp).toBe(0)
  })
})

describe('Levelabschluss & Niederlage', () => {
  it('Punkteziel erreicht → Sieg mit Sternen', () => {
    let g = withBoard(createGame(L1, [], ctx), FILL)
    g = { ...g, score: 680 }
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.status).toBe('won')
    expect(starsFor(r.state, L1)).toBe(1)
  })
  it('keine Züge mehr → Niederlage', () => {
    let g = withBoard(createGame(L1, [], ctx), FILL)
    g = { ...g, movesLeft: 1 }
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.status).toBe('lost')
  })
  it('Eislevel zählt befreite Kristalle', () => {
    const L2 = levelById('l2')
    const g = withBoard(createGame(L2, [], ctx), FILL, { 6: { blocker: 'ice' }, 9: { blocker: 'ice' } })
    const r = playWord(g, [0, 1, 2, 3], L2, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.iceFreed).toBe(2)
    expect(goalProgress(r.state, L2).current).toBe(2)
  })
  it('Feuerlevel zählt gelöschte Feuer und hält Feuer nach', () => {
    const L3 = levelById('l3')
    const g = withBoard(createGame(L3, [], ctx), FILL, { 0: { fire: true }, 1: { fire: true } })
    const r = playWord(g, [0, 1, 2, 3], L3, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.fireExtinguished).toBe(2)
    expect(r.state.board.filter((t) => t.fire).length).toBeGreaterThanOrEqual(2)
  })
  it('alle Level sind definiert und eindeutig', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length)
    expect(LEVELS.filter((l) => l.goal.kind === 'boss')).toHaveLength(2)
    LEVELS.forEach((l, i) => expect(l.index).toBe(i + 1))
  })
})

describe('Rettung im Spielzug', () => {
  it('Sackgasse nach dem Zug wird kostenlos korrigiert (kein Schaden, kein Zug, keine Münzen)', () => {
    // After HAUS is removed only X remain + refill; force by making all other tiles X.
    const rows = ['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']
    for (let seed = 1; seed <= 25; seed++) {
      let g = withBoard(createGame(BOSS, [], ctx), rows)
      g = { ...g, rng: seed, boss: { ...g.boss!, countdown: 5 }, nextBonusAt: 999 }
      const r = playWord(g, [0, 1, 2, 3], BOSS, ctx)
      if (!r.ok) throw new Error()
      expect(findWords(r.state.board, dict).size).toBeGreaterThan(0)
      expect(r.state.player!.hp).toBe(PLAYER_MAX_HP)
      expect(r.state.coinsEarned).toBe(0)
      const rescue = stepsOf(r.steps, 'rescue')
      if (rescue.length) expect(r.state.rescues).toBe(1)
    }
  })
})

describe('Bonuswort-Events', () => {
  it('Timer läuft nur im aktiven Zustand und läuft ohne Strafe ab', () => {
    const g0 = createGame(L1, [], ctx)
    const g: GameState = { ...g0, bonus: { word: 'HAUS', multiplier: 3, durationMs: 10000, msLeft: 10000, phase: 'intro' } }
    expect(tickBonus(g, 5000).bonus!.msLeft).toBe(10000) // intro → pausiert
    const active = activateBonus(g)
    expect(active.bonus!.phase).toBe('active')
    expect(tickBonus(active, 4000).bonus!.msLeft).toBe(6000)
    const expired = tickBonus(active, 10000)
    expect(expired.bonus).toBeNull()
    expect(expired.score).toBe(g.score)
    expect(expired.movesLeft).toBe(g.movesLeft)
  })
  it('gelöstes Bonuswort verdreifacht die Kraft', () => {
    let g = withBoard(createGame(L1, [], ctx), FILL)
    g = { ...g, bonus: { word: 'HAUS', multiplier: 3, durationMs: 10000, msLeft: 5000, phase: 'active' } }
    const r = playWord(g, [0, 1, 2, 3], L1, ctx)
    if (!r.ok) throw new Error()
    expect(r.state.score).toBe(150)
    expect(r.state.bonusesWon).toBe(1)
    expect(r.state.bonus?.word === 'HAUS').toBe(false)
  })
  it('neue Events nennen nur Wörter, die auf dem Brett bildbar sind', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let g = createGame(L1, [], ctx, seed)
      g = { ...g, nextBonusAt: 1, movesLeft: 99 }
      const words = findWords(g.board, dict)
      const [word, path] = [...words.entries()].find(([w]) => w.length >= 3)!
      const r = playWord(g, path, L1, ctx)
      if (!r.ok) throw new Error(word)
      if (r.state.bonus) {
        const found = findWords(r.state.board, dict)
        expect(found.has(r.state.bonus.word)).toBe(true)
        expect(r.state.bonus.phase).toBe('intro')
      }
    }
  })
})
