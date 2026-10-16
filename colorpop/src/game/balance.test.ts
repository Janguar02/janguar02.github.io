import { describe, expect, it } from 'vitest'
import { levelById, LEVELS } from './content'
import { ITEM_ORDER, STARTER_ITEMS } from './items'
import { simulate, type BotStyle } from './simulate'
import { loadDict } from './testUtils'
import type { Difficulty, ItemId, LevelDef } from './types'

const dict = loadDict()
const N = 16

function run(level: LevelDef, items: ItemId[], style: BotStyle, d: Difficulty = 'normal', seeds = N) {
  let wins = 0
  let turns = 0
  for (let s = 1; s <= seeds; s++) {
    const r = simulate(level, items, dict, style, s, 120, d) // throws on any dead board
    if (r.status === 'won') wins++
    turns += r.turns
  }
  return { winRate: wins / seeds, turns: turns / seeds }
}

describe('Balancing (Bot-Simulation)', () => {
  const boss = levelById('boss1')
  const combos: ItemId[][] = []
  const n = ITEM_ORDER.length
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) combos.push([ITEM_ORDER[a], ITEM_ORDER[b], ITEM_ORDER[c]])

  it('Boss ist mit der Startausrüstung für Gelegenheitsspieler schaffbar', () => {
    expect(run(boss, STARTER_ITEMS, 'casual').winRate).toBeGreaterThanOrEqual(0.85)
  })
  it('starke Spieler gewinnen immer', () => {
    expect(run(boss, [], 'strong').winRate).toBe(1)
  })
  it('jede der 84 Item-Kombinationen schlägt Brutzel und keine dominiert', () => {
    const results = combos.map((c) => run(boss, c, 'casual', 'normal', 6))
    for (const r of results) expect(r.winRate).toBeGreaterThanOrEqual(0.6)
    const turns = results.map((r) => r.turns)
    expect(Math.max(...turns) / Math.min(...turns)).toBeLessThan(1.6)
  })
  it('Frostel ist härter als Brutzel, aber mit passender Ausrüstung fair', () => {
    const frostel = levelById('boss2')
    expect(run(frostel, STARTER_ITEMS, 'casual').winRate).toBeGreaterThanOrEqual(0.85)
    expect(run(frostel, ['thawWind', 'hourglass', 'shield'], 'casual', 'normal', 8).winRate).toBeGreaterThanOrEqual(0.85)
    const b1 = run(boss, STARTER_ITEMS, 'casual')
    const b2 = run(frostel, STARTER_ITEMS, 'casual')
    expect(b2.turns).toBeGreaterThan(b1.turns)
  })
  it('normale Level sind fair schaffbar (Entspannt & Normal)', () => {
    for (const d of ['relaxed', 'normal'] as Difficulty[])
      for (const l of LEVELS.filter((x) => x.goal.kind !== 'boss')) expect(run(l, STARTER_ITEMS, 'casual', d).winRate, `${d}/${l.id}`).toBeGreaterThanOrEqual(0.7)
  })
  it('Modi sind gestaffelt: Entspannt ≥ Normal ≥ Experte', () => {
    const none = (d: Difficulty) => run(boss, [], 'casual', d).winRate
    const r = none('relaxed')
    const n = none('normal')
    const e = none('expert')
    expect(r).toBeGreaterThanOrEqual(n)
    expect(n).toBeGreaterThanOrEqual(e)
    expect(run(boss, STARTER_ITEMS, 'casual', 'expert').winRate).toBeGreaterThanOrEqual(0.7)
  })
})
