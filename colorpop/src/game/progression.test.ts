import { describe, expect, it } from 'vitest'
import { applyDifficulty, BRUTZEL, comboMultiplier, FROSTEL, levelById, LEVELS, MAX_ICE_TILES, patternFor, phaseFor } from './content'
import { bossAttackEvery, createGame, goalProgress, nextBossAttack, playWord, type TurnStep } from './engine'
import { bossAdvice, ITEMS, ITEM_ORDER, ROLE_LABELS, synergiesFor } from './items'
import { detectMoments, MOMENTS } from './moments'
import { applyProgress, LEVEL_UP_REWARDS, levelFromXp, runXp, xpToNext } from './progression'
import { applyRunResult, defaultSave, isChapterUnlocked, isLevelUnlocked, loadRun, MemoryStorage, parseSave, saveRun } from './save'
import { findPath, findWords } from './solver'
import { boardFrom, loadDict } from './testUtils'
import type { GameState, ItemId, Tile } from './types'

const dict = loadDict()
const ctx = { dict }
const FILL = ['HAUSXX', 'ROTXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']
const stepsOf = <T extends TurnStep['type']>(steps: TurnStep[], type: T) => steps.filter((s) => s.type === type) as Extract<TurnStep, { type: T }>[]

function withBoard(g: GameState, rows: string[], mods: Record<number, Partial<Tile>> = {}): GameState {
  return { ...g, board: boardFrom(rows, mods), nextTileId: 1000, targets: ['HAUS'], foundWords: [], combo: 0, nextBonusAt: 999, mission: null, nextMissionAt: 999 }
}
const play = (g: GameState, path: number[], levelId: string) => {
  const r = playWord(g, path, levelById(levelId), ctx)
  if (!r.ok) throw new Error(r.reason)
  return r
}

describe('Spielerlevel & XP', () => {
  it('XP-Kurve steigt gleichmäßig an', () => {
    expect(xpToNext(1)).toBe(80)
    expect(xpToNext(2)).toBe(120)
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 80 })
    expect(levelFromXp(80).level).toBe(2)
    expect(levelFromXp(199)).toEqual({ level: 2, into: 119, need: 120 })
    expect(levelFromXp(200).level).toBe(3)
  })

  it('Levelaufstiegs-Belohnungen werden genau einmal vergeben', () => {
    const s0 = defaultSave()
    const a = applyProgress(s0, 200, [])
    expect(a.levelBefore).toBe(1)
    expect(a.levelAfter).toBe(3)
    expect(a.save.coins).toBe(LEVEL_UP_REWARDS[2].coins)
    expect(a.save.skins).toContain('mint')
    expect(a.unlocks.map((u) => u.kind).sort()).toEqual(['coins', 'skin'])
    // More XP without crossing a level: nothing new.
    const b = applyProgress(a.save, 10, [])
    expect(b.unlocks).toEqual([])
    expect(b.save.coins).toBe(a.save.coins)
  })

  it('Spielerlevel 6 schaltet Zeitsand frei', () => {
    let xp = 0
    for (let l = 1; l < 6; l++) xp += xpToNext(l)
    const r = applyProgress(defaultSave(), xp, [])
    expect(r.levelAfter).toBe(6)
    expect(r.save.owned).toContain('hourglass')
  })

  it('Erfolge: Münzen nur beim ersten Mal, Combo-Rausch schaltet die Combo-Glocke frei', () => {
    const first = applyProgress(defaultSave(), 0, ['comboRush', 'giant'])
    expect(first.save.coins).toBe(MOMENTS.comboRush.coins + MOMENTS.giant.coins)
    expect(first.save.owned).toContain('comboBell')
    expect(first.save.achievements).toEqual({ comboRush: 1, giant: 1 })
    const again = applyProgress(first.save, 0, ['comboRush'])
    expect(again.save.coins).toBe(first.save.coins)
    expect(again.unlocks).toEqual([])
    expect(again.save.achievements.comboRush).toBe(2)
  })

  it('XP stammt nur aus echter Spielleistung; Wiederholungen bringen weniger', () => {
    const level = levelById('l1')
    const g = { ...createGame(level, [], ctx, 1), status: 'won' as const, secretsFound: 3, moments: ['giant' as const] }
    const first = runXp(g, level, true, 2, true).reduce((n, p) => n + p.xp, 0)
    const replay = runXp(g, level, true, 2, false).reduce((n, p) => n + p.xp, 0)
    expect(first).toBe(40 + 20 + 6 + MOMENTS.giant.xp)
    expect(replay).toBeLessThan(first)
    const idle = { ...createGame(level, [], ctx, 1), status: 'lost' as const }
    expect(runXp(idle, level, false, 0, false)).toEqual([])
  })

  it('applyRunResult kombiniert Level, XP, Freischaltungen – „Unberührt“ zählt nur bei Sieg', () => {
    const level = levelById('boss1')
    const g = { ...createGame(level, [], ctx, 1), moments: ['flawless' as const, 'giant' as const] }
    const lost = applyRunResult(defaultSave(), g, level, false, 0)
    expect(lost.reward.moments).toEqual(['giant'])
    const won = applyRunResult(defaultSave(), { ...g, status: 'won' }, level, true, 3)
    expect(won.reward.moments).toEqual(['flawless', 'giant'])
    expect(won.save.levels.boss1.completed).toBe(true)
    expect(won.save.xp).toBe(won.reward.xp)
  })

  it('beschädigte Progressionsdaten werden bereinigt', () => {
    const s = parseSave(JSON.stringify({ version: 1, xp: -5, achievements: { giant: 2, hack: 9, trio: -1 }, skins: ['mint', 'evil'], skin: 'evil', introsSeen: ['l1', 'x'] }))
    expect(s.xp).toBe(0)
    expect(s.achievements).toEqual({ giant: 2 })
    expect(s.skins).toEqual(['cream', 'mint'])
    expect(s.skin).toBe('cream')
    expect(s.introsSeen).toEqual(['l1'])
  })
})

describe('Levelkarte & Freischaltung', () => {
  it('12 Level in 2 Kapiteln, jedes Kapitel endet mit einem Boss', () => {
    expect(LEVELS).toHaveLength(12)
    for (const c of [1, 2]) {
      const ch = LEVELS.filter((l) => l.chapter === c)
      expect(ch.at(-1)!.goal.kind).toBe('boss')
    }
  })
  it('alte Spielstände (4 Level) bleiben freigeschaltet, neue Level öffnen sich sinnvoll', () => {
    const old = parseSave(JSON.stringify({ version: 1, levels: { l1: { completed: true, stars: 2 }, l2: { completed: true, stars: 1 }, l3: { completed: true }, boss1: { completed: true } } }))
    expect(isLevelUnlocked(old, 'boss1')).toBe(true)
    expect(isLevelUnlocked(old, 'l4')).toBe(true) // Nachfolger von l1
    expect(isLevelUnlocked(old, 'l5')).toBe(true) // Nachfolger von l2
    expect(isChapterUnlocked(old, 2)).toBe(true)
    expect(isLevelUnlocked(defaultSave(), 'l6')).toBe(false)
    expect(isChapterUnlocked(defaultSave(), 2)).toBe(false)
  })
  it('jedes Level startet mit spielbarem Brett und gültigen Zielen (alle Modi)', () => {
    for (const d of ['relaxed', 'normal', 'expert'] as const)
      for (const l of LEVELS) {
        const g = createGame(applyDifficulty(l, d), [], ctx, l.seed, d)
        expect(findWords(g.board, dict).size, `${d}/${l.id}`).toBeGreaterThan(0)
        for (const t of g.targets) expect(findPath(g.board, t)).not.toBeNull()
      }
  })
  it('Setups: Ruß und vorgegebene Spezialsteine werden platziert', () => {
    const rus = createGame(levelById('l9'), [], ctx)
    expect(rus.board.filter((t) => t.blocker === 'soot').length).toBeGreaterThanOrEqual(6)
    const fun = createGame(levelById('l6'), [], ctx)
    expect(fun.board.filter((t) => t.special === 'bomb' || t.special === 'lightning').length).toBeGreaterThanOrEqual(3)
  })
})

describe('Neue Levelziele', () => {
  it('lange Wörter, Gold, Spezialsteine und Geheimwörter werden gezählt', () => {
    const g0 = withBoard(createGame(levelById('l4'), [], ctx), ['FENSTE', 'XXXXXR', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'], { 1: { special: 'gold' }, 3: { special: 'bomb' } })
    const r = play(g0, [0, 1, 2, 3, 4, 5, 11], 'l4')
    expect(r.state.longWords).toBe(1)
    expect(r.state.goldCollected).toBe(1)
    expect(r.state.specialsTriggered).toBe(1)
    expect(goalProgress(r.state, levelById('l4'))).toEqual({ current: 1, target: 3 })
    expect(goalProgress(r.state, levelById('l5')).current).toBe(1)
    expect(goalProgress(r.state, levelById('l6')).current).toBe(1)
    // Wiederholung zählt nicht als langes Wort
    const r2 = play({ ...r.state, board: boardFrom(['FENSTE', 'XXXXXR', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']) }, [0, 1, 2, 3, 4, 5, 11], 'l4')
    expect(r2.state.longWords).toBe(1)
  })
})

describe('Frostel: Eispanzer, Phasen, Einfrieren', () => {
  const lvl = levelById('boss2')
  const fresh = (patch: Partial<GameState> = {}) => {
    const g = withBoard(createGame(lvl, [], ctx, 3), FILL)
    return { ...g, ...patch }
  }
  it('Panzer schluckt Schaden zuerst', () => {
    const g = fresh()
    const r = play({ ...g, boss: { ...g.boss!, armor: 20 } }, [0, 1, 2, 3], 'boss2')
    const a = stepsOf(r.steps, 'armor')[0]
    expect(a.absorbed).toBe(5)
    expect(a.left).toBe(15)
    expect(a.stunned).toBe(false)
    expect(r.state.boss!.hp).toBe(g.boss!.hp)
  })
  it('Panzer mit EINEM Wort gebrochen → Überschuss trifft, Frostel betäubt, Moment „Panzerbrecher“', () => {
    const g = fresh()
    const r = play({ ...g, boss: { ...g.boss!, armor: 3, countdown: 1 } }, [0, 1, 2, 3], 'boss2')
    const a = stepsOf(r.steps, 'armor')[0]
    expect(a.broken && a.stunned).toBe(true)
    expect(r.state.boss!.hp).toBe(g.boss!.hp - 2)
    expect(stepsOf(r.steps, 'bossAttack')).toHaveLength(0)
    expect(r.state.moments).toContain('armorBreak')
  })
  it('drei Phasen mit gesperrter Ankündigung beim Phasenwechsel', () => {
    expect(phaseFor(FROSTEL, 300, 300)).toBe(0)
    expect(phaseFor(FROSTEL, 170, 300)).toBe(1)
    expect(phaseFor(FROSTEL, 80, 300)).toBe(2)
    expect(phaseFor(BRUTZEL, 10, 220)).toBe(1) // Brutzel hat zwei Phasen
    const g = fresh()
    const announced = nextBossAttack(g)
    const r = play({ ...g, boss: { ...g.boss!, hp: 85 } }, [0, 1, 2, 3], 'boss2')
    const e = stepsOf(r.steps, 'enrage')[0]
    expect(e.phase).toBe(2)
    expect(nextBossAttack(r.state)).toBe(announced)
    expect(patternFor(FROSTEL, 2)).toContain('avalanche')
  })
  it('Einfrieren ist begrenzt und das Brett bleibt danach spielbar (kostenlose Rettung)', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const g = fresh({ rng: seed })
      const mods: Record<number, Partial<Tile>> = {}
      for (let i = 6; i < 15; i++) mods[i] = { blocker: 'ice' }
      const start = { ...g, board: boardFrom(FILL, mods), boss: { ...g.boss!, countdown: 1, patternIndex: 1 } }
      const r = play(start, [0, 1, 2, 3], 'boss2')
      expect(r.state.board.filter((t) => t.blocker).length).toBeLessThanOrEqual(MAX_ICE_TILES)
      expect(findWords(r.state.board, dict).size).toBeGreaterThan(0)
    }
  })
})

describe('Item-Rollen & Synergien', () => {
  it('jedes Item hat Rolle, Freischaltweg und genaue Regeln', () => {
    expect(ITEM_ORDER).toHaveLength(9)
    for (const id of ITEM_ORDER) {
      expect(ROLE_LABELS[ITEMS[id].role]).toBeTruthy()
      expect(ITEMS[id].unlock.length).toBeGreaterThan(3)
      expect(ITEMS[id].rules.length).toBeGreaterThan(0)
    }
    const roles = new Set(ITEM_ORDER.map((i) => ITEMS[i].role))
    expect([...roles].sort()).toEqual(['attack', 'combo', 'control', 'defense', 'heal'])
  })
  it('Tauwind taut diagonal auf und gibt +2 Kraft je befreitem Stein', () => {
    // Zelle 10 (Reihe 2, Spalte 5) berührt das S von HAUS nur diagonal.
    const base = withBoard(createGame(levelById('l2'), [], ctx), ['HAUSXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'], { 10: { blocker: 'ice' } })
    const without = play(base, [0, 1, 2, 3], 'l2')
    const withThaw = play({ ...base, equipped: ['thawWind'] }, [0, 1, 2, 3], 'l2')
    expect(without.state.iceFreed).toBe(0) // ohne Tauwind kein Effekt
    expect(withThaw.state.iceFreed).toBe(1)
    expect(stepsOf(withThaw.steps, 'word')[0].power - stepsOf(without.steps, 'word')[0].power).toBe(2)
    expect(stepsOf(withThaw.steps, 'item').some((s) => s.item === 'thawWind')).toBe(true)
  })
  it('Combo-Glocke: Wiederholung hält die Combo, Maximum ×1,8', () => {
    expect(comboMultiplier(20)).toBe(1.5)
    expect(comboMultiplier(20, true)).toBe(1.8)
    expect(comboMultiplier(7, true)).toBe(1.6)
    const g = { ...withBoard(createGame(levelById('l1'), ['comboBell'], ctx), FILL), targets: [], foundWords: ['HAUS'], combo: 4 }
    const r = play(g, [0, 1, 2, 3], 'l1')
    expect(r.state.combo).toBe(4)
    expect(stepsOf(r.steps, 'item').some((s) => s.item === 'comboBell')).toBe(true)
    const noBell = play({ ...g, equipped: [] }, [0, 1, 2, 3], 'l1')
    expect(noBell.state.combo).toBe(0)
  })
  it('Zeitsand: Bosse greifen nur alle 4 Wörter an, Level erhalten +2 Züge', () => {
    expect(bossAttackEvery(BRUTZEL, ['hourglass'])).toBe(4)
    expect(createGame(levelById('boss1'), ['hourglass'], ctx).boss!.countdown).toBe(4)
    expect(createGame(levelById('l1'), ['hourglass'], ctx).movesLeft).toBe(levelById('l1').moves! + 2)
  })
  it('Schutzschild meldet seine Aktivierung', () => {
    const g = withBoard(createGame(levelById('boss1'), ['shield'], ctx), FILL)
    const r = play({ ...g, boss: { ...g.boss!, countdown: 1, patternIndex: 0 } }, [0, 1, 2, 3], 'boss1')
    expect(stepsOf(r.steps, 'item').some((s) => s.item === 'shield' && s.amount > 0)).toBe(true)
  })
  it('Synergien und Boss-Ratschläge sind nachvollziehbar', () => {
    expect(synergiesFor(['shield', 'lifeCrystal', 'wordBlade']).map((s) => s.name)).toEqual(['Bollwerk'])
    expect(synergiesFor(['wordBlade', 'thawWind', 'comboBell']).map((s) => s.name).sort()).toEqual(['Freie Bahn', 'Langer Atem'])
    const adv = bossAdvice(FROSTEL, ['shield'], ['shield', 'thawWind'] as ItemId[])
    expect(adv.good).toEqual(['shield'])
    expect(adv.suggested).toEqual(['thawWind'])
    expect(adv.missing).toEqual(['hourglass'])
  })
})

describe('Wortmeister-Momente', () => {
  const facts = { word: 'HAUS', fresh: true, cleared: 4, combo: 1, longStreak: 0, armorBroken: false, bossDefeated: false, finisherCause: false }
  it('erkennt seltene Leistungen', () => {
    expect(detectMoments({ ...facts, word: 'SCHNECKEN' }, [])).toContain('giant')
    expect(detectMoments({ ...facts, word: 'SCHNECKEN', fresh: false }, [])).toEqual([])
    expect(detectMoments({ ...facts, longStreak: 3 }, [])).toEqual(['trio'])
    expect(detectMoments({ ...facts, cleared: 12 }, [])).toEqual(['chain'])
    expect(detectMoments({ ...facts, combo: 8 }, [])).toEqual(['comboRush'])
    expect(detectMoments({ ...facts, bossDefeated: true, finisherCause: true }, [])).toEqual(['finisher'])
    expect(detectMoments({ ...facts, bossDefeated: true, finisherCause: false }, [])).toEqual([])
  })
  it('jeder Moment höchstens einmal pro Partie', () => {
    expect(detectMoments({ ...facts, cleared: 20 }, ['chain'])).toEqual([])
  })
  it('„Dreiklang“: drei verschiedene lange Wörter in Folge (Engine)', () => {
    let g = withBoard(createGame(levelById('l1'), [], ctx), ['RASENX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'])
    g = { ...g, movesLeft: 99, targets: [] }
    const words = ['RASEN', 'ESSEN', 'NASEN']
    for (const w of words) {
      const r = play({ ...g, board: boardFrom([w + 'X', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']), score: 0 }, [0, 1, 2, 3, 4], 'l1')
      g = r.state
    }
    expect(g.moments).toContain('trio')
    expect(g.longStreak).toBe(0)
  })
  it('„Unberührt“ beim Bosssieg ohne LP-Verlust', () => {
    const g = withBoard(createGame(levelById('boss1'), [], ctx), FILL)
    const r = play({ ...g, boss: { ...g.boss!, hp: 2 } }, [0, 1, 2, 3], 'boss1')
    expect(r.state.status).toBe('won')
    expect(r.state.moments).toContain('flawless')
    const hurt = play({ ...g, untouched: false, boss: { ...g.boss!, hp: 2 } }, [0, 1, 2, 3], 'boss1')
    expect(hurt.state.moments).not.toContain('flawless')
  })
})

describe('Speichern & Fortsetzen mit neuen Feldern', () => {
  it('laufende Partie behält Fortschrittszähler und Boss-Panzer/Phase', () => {
    const st = new MemoryStorage()
    const g = createGame(levelById('boss2'), ['thawWind'], ctx)
    const mid = { ...g, longWords: 2, goldCollected: 1, specialsTriggered: 3, moments: ['giant' as const], untouched: false, boss: { ...g.boss!, armor: 12, phase: 1, enraged: true } }
    saveRun(st, mid)
    const back = loadRun(st)!
    expect(back.longWords).toBe(2)
    expect(back.moments).toEqual(['giant'])
    expect(back.untouched).toBe(false)
    expect(back.boss!.armor).toBe(12)
    expect(back.boss!.phase).toBe(1)
  })
  it('ältere Läufe ohne neue Felder erhalten sichere Standardwerte', () => {
    const st = new MemoryStorage()
    const g = createGame(levelById('l1'), [], ctx) as Partial<GameState>
    delete g.moments
    delete g.longWords
    st.setItem('colorpopquest.run.v1', JSON.stringify({ version: 1, state: g }))
    const back = loadRun(st)!
    expect(back.moments).toEqual([])
    expect(back.longWords).toBe(0)
    expect(back.untouched).toBe(true)
  })
})
