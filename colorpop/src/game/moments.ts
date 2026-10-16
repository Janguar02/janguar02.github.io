import { COMMON_WORDS } from './data/commonWords'
import type { MomentId } from './types'

const COMMON = new Set(COMMON_WORDS)

export interface MomentDef {
  id: MomentId
  title: string
  text: string
  xp: number
  coins: number
}

/**
 * Wortmeister-Momente: the top celebration tier. Each can be earned at most
 * once per level run, so the strongest effects stay rare.
 */
export const MOMENTS: Record<MomentId, MomentDef> = {
  giant: { id: 'giant', title: 'Wortriese!', text: 'Ein Wort mit 8 oder mehr Buchstaben', xp: 40, coins: 10 },
  trio: { id: 'trio', title: 'Dreiklang!', text: 'Drei verschiedene Wörter mit 5+ Buchstaben hintereinander', xp: 30, coins: 8 },
  rarity: { id: 'rarity', title: 'Rarität!', text: 'Ein seltenes Wort mit 7+ Buchstaben, das kein Alltagswort ist', xp: 35, coins: 8 },
  chain: { id: 'chain', title: 'Kettenreaktion!', text: '12 oder mehr Steine mit einem einzigen Wort abgeräumt', xp: 30, coins: 8 },
  comboRush: { id: 'comboRush', title: 'Combo-Rausch!', text: 'Eine Combo von 8 Wörtern in Folge', xp: 25, coins: 6 },
  armorBreak: { id: 'armorBreak', title: 'Panzerbrecher!', text: 'Einen Eispanzer mit einem einzigen Wort zerschlagen', xp: 25, coins: 6 },
  finisher: { id: 'finisher', title: 'Finale Wucht!', text: 'Einen Boss mit Blitzwort, Spezialstein oder 40+ Kraft besiegt', xp: 50, coins: 15 },
  flawless: { id: 'flawless', title: 'Unberührt!', text: 'Einen Bosskampf ohne verlorene Lebenspunkte gewonnen', xp: 60, coins: 20 },
}

export const MOMENT_ORDER: MomentId[] = ['giant', 'trio', 'rarity', 'chain', 'comboRush', 'armorBreak', 'finisher', 'flawless']

export interface TurnFacts {
  word: string
  fresh: boolean
  cleared: number
  combo: number
  longStreak: number
  armorBroken: boolean
  bossDefeated: boolean
  finisherCause: boolean
}

/** Moments earned by one turn, excluding those already earned in this run. */
export function detectMoments(f: TurnFacts, already: readonly MomentId[]): MomentId[] {
  const out: MomentId[] = []
  const add = (m: MomentId, cond: boolean) => cond && !already.includes(m) && !out.includes(m) && out.push(m)
  add('giant', f.fresh && f.word.length >= 8)
  add('rarity', f.fresh && f.word.length >= 7 && !COMMON.has(f.word))
  add('trio', f.longStreak >= 3)
  add('chain', f.cleared >= 12)
  add('comboRush', f.combo >= 8)
  add('armorBreak', f.armorBroken)
  add('finisher', f.bossDefeated && f.finisherCause)
  return out
}
