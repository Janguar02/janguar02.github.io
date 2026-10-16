import { MAX_EQUIPPED, type BossDef, type ItemId, type ItemRole } from './types'

export interface ItemDef {
  id: ItemId
  name: string
  short: string
  /** Exact rules shown in the tooltip. */
  rules: string[]
  combatOnly: boolean
  price: number
  accent: string
  role: ItemRole
  /** How the item is earned (shown while locked). */
  unlock: string
}

export const ROLE_LABELS: Record<ItemRole, { label: string; color: string }> = {
  attack: { label: 'Angriff', color: '#F2496B' },
  defense: { label: 'Verteidigung', color: '#2FA88E' },
  heal: { label: 'Heilung', color: '#E0457E' },
  control: { label: 'Kontrolle', color: '#4F7BEF' },
  combo: { label: 'Combo', color: '#C27A00' },
}

export const ITEM_VALUES = {
  goldenAlphabet: { perValue2: 1, perValue3: 2 },
  wordBlade: { len5Pct: 25, len7Pct: 60 },
  shield: { reducePct: 40 },
  fireRing: { perFireTile: 4 },
  lightningCore: { every: 3, damage: 5 },
  lifeCrystal: { every: 4, heal: 5 },
  thawWind: { perFreed: 2, armorPct: 60 },
  comboBell: { maxMultiplier: 1.8, energyEvery: 4 },
  hourglass: { attackEvery: 4, extraMoves: 2 },
} as const

export const ITEMS: Record<ItemId, ItemDef> = {
  goldenAlphabet: {
    id: 'goldenAlphabet',
    name: 'Goldenes Alphabet',
    short: 'Seltene Buchstaben treffen härter.',
    rules: [
      `+${ITEM_VALUES.goldenAlphabet.perValue2} Kraft je Buchstabe mit Wert 2 (G O M B C K W).`,
      `+${ITEM_VALUES.goldenAlphabet.perValue3} Kraft je Buchstabe mit Wert 3 oder 4 (F Z P V Ä Ö Ü J X Y Q).`,
    ],
    combatOnly: false,
    price: 120,
    accent: '#F5B82E',
    role: 'attack',
    unlock: 'Belohnung für „Bonbon-Bucht“ oder für 120 Münzen',
  },
  wordBlade: {
    id: 'wordBlade',
    name: 'Wortklinge',
    short: 'Lange Wörter verursachen Bonusschaden.',
    rules: [
      `Wörter mit 5–6 Buchstaben: +${ITEM_VALUES.wordBlade.len5Pct} % Kraft.`,
      `Wörter ab 7 Buchstaben: +${ITEM_VALUES.wordBlade.len7Pct} % Kraft.`,
    ],
    combatOnly: false,
    price: 0,
    accent: '#5B8CFF',
    role: 'attack',
    unlock: 'Startausrüstung',
  },
  shield: {
    id: 'shield',
    name: 'Schutzschild',
    short: 'Verringert eingehenden Schaden.',
    rules: [`Erlittener Schaden −${ITEM_VALUES.shield.reducePct} % (aufgerundet, mindestens 1).`, 'Wirkt nur im Kampf.'],
    combatOnly: true,
    price: 0,
    accent: '#38C6A8',
    role: 'defense',
    unlock: 'Startausrüstung',
  },
  fireRing: {
    id: 'fireRing',
    name: 'Feuerring',
    short: 'Brennende Buchstaben werden zur Waffe.',
    rules: [
      `+${ITEM_VALUES.fireRing.perFireTile} Kraft für jeden brennenden Stein im Wort.`,
      'Brennende Steine verstärken gegnerische Angriffe nicht mehr.',
    ],
    combatOnly: false,
    price: 150,
    accent: '#FF7A3D',
    role: 'control',
    unlock: 'Belohnung für „Glutpfad“ oder für 150 Münzen',
  },
  lightningCore: {
    id: 'lightningCore',
    name: 'Blitzkern',
    short: 'Jedes dritte Wort entlädt einen Blitz.',
    rules: [`Jedes ${ITEM_VALUES.lightningCore.every}. gültige Wort: +${ITEM_VALUES.lightningCore.damage} Blitz-Kraft.`],
    combatOnly: false,
    price: 140,
    accent: '#9B6BFF',
    role: 'attack',
    unlock: 'Belohnung für „Kristallklippen“ oder für 140 Münzen',
  },
  lifeCrystal: {
    id: 'lifeCrystal',
    name: 'Lebenskristall',
    short: 'Heilt nach mehreren erfolgreichen Wörtern.',
    rules: [`Nach jedem ${ITEM_VALUES.lifeCrystal.every}. gültigen Wort: +${ITEM_VALUES.lifeCrystal.heal} Lebenspunkte.`, 'Wirkt nur im Kampf.'],
    combatOnly: true,
    price: 0,
    accent: '#FF5C8A',
    role: 'heal',
    unlock: 'Startausrüstung',
  },
  thawWind: {
    id: 'thawWind',
    name: 'Tauwind',
    short: 'Taut Blockaden großzügig auf und belohnt das.',
    rules: [
      'Wörter befreien Kristalle, Ruß und Eis auch diagonal neben dem Wort.',
      `+${ITEM_VALUES.thawWind.perFreed} Kraft je Stein, den das Wort befreit.`,
      `Gegnerische Eispanzer sind ${100 - ITEM_VALUES.thawWind.armorPct} % schwächer.`,
    ],
    combatOnly: false,
    price: 0,
    accent: '#5FC8F0',
    role: 'control',
    unlock: 'Belohnung für „Lange Leitung“ (Kapitel 2)',
  },
  comboBell: {
    id: 'comboBell',
    name: 'Combo-Glocke',
    short: 'Hält deine Combo am Leben.',
    rules: [
      'Ein wiederholtes Wort bricht die Combo nicht.',
      'Combo-Maximum ×1,8 statt ×1,5.',
      `Jede ${ITEM_VALUES.comboBell.energyEvery}. Combo-Stufe: +1 Energie.`,
    ],
    combatOnly: false,
    price: 0,
    accent: '#F0A020',
    role: 'combo',
    unlock: 'Wortmeister-Moment „Combo-Rausch“ (8er-Combo) erreichen',
  },
  hourglass: {
    id: 'hourglass',
    name: 'Zeitsand',
    short: 'Verschafft dir Luft.',
    rules: [
      `Bosse greifen erst nach ${ITEM_VALUES.hourglass.attackEvery} statt 3 Wörtern an.`,
      `In normalen Leveln: +${ITEM_VALUES.hourglass.extraMoves} Züge.`,
    ],
    combatOnly: false,
    price: 0,
    accent: '#C7A15A',
    role: 'control',
    unlock: 'Spielerlevel 6 erreichen',
  },
}

export const ITEM_ORDER: ItemId[] = ['wordBlade', 'shield', 'lifeCrystal', 'goldenAlphabet', 'lightningCore', 'fireRing', 'thawWind', 'comboBell', 'hourglass']

/**
 * Pairs whose rules genuinely interact. Shown in the loadout preview so the
 * player understands WHY a combination works – no hidden set bonuses.
 */
export const SYNERGIES: { items: [ItemId, ItemId]; name: string; text: string }[] = [
  { items: ['shield', 'lifeCrystal'], name: 'Bollwerk', text: 'Gedämpfte Treffer und regelmäßige Heilung – ideal, um einen Boss kennenzulernen.' },
  { items: ['hourglass', 'lifeCrystal'], name: 'Atempause', text: 'Seltenere Angriffe, gleiche Heilung: Deine Lebenspunkte erholen sich zwischen den Treffern.' },
  { items: ['thawWind', 'wordBlade'], name: 'Freie Bahn', text: 'Aufgetaute Steine schaffen Platz für lange Wörter – genau die belohnt die Wortklinge.' },
  { items: ['comboBell', 'lightningCore'], name: 'Taktgeber', text: 'Der Combo-Multiplikator verstärkt auch den Blitzkern-Bonus – und die Glocke hält die Combo.' },
  { items: ['goldenAlphabet', 'wordBlade'], name: 'Schwere Worte', text: 'Lange Wörter mit seltenen Buchstaben profitieren von beiden Boni gleichzeitig.' },
  { items: ['fireRing', 'shield'], name: 'Hitzeschild', text: 'Feuer verstärkt keine Angriffe mehr, der Rest wird gedämpft – Brutzel verliert seinen Biss.' },
  { items: ['comboBell', 'wordBlade'], name: 'Langer Atem', text: 'Lange Wörter halten die Combo, Wiederholungen brechen sie nicht – der Multiplikator bleibt hoch.' },
]

export function synergiesFor(equipped: readonly ItemId[]) {
  return SYNERGIES.filter((s) => s.items.every((i) => equipped.includes(i)))
}

/** Pre-fight advice: which equipped items counter the boss, which counters are missing. */
export function bossAdvice(boss: BossDef, equipped: readonly ItemId[], owned: readonly ItemId[]) {
  return {
    good: boss.counters.filter((i) => equipped.includes(i)),
    suggested: boss.counters.filter((i) => !equipped.includes(i) && owned.includes(i)),
    missing: boss.counters.filter((i) => !owned.includes(i)),
  }
}
export const STARTER_ITEMS: ItemId[] = ['wordBlade', 'shield', 'lifeCrystal']

export type EquipResult = { ok: true; equipped: ItemId[] } | { ok: false; reason: 'full' | 'not-owned' | 'locked-in-fight' }

/** Equip with the hard 3-slot rule. Items cannot change during a fight. */
export function equipItem(equipped: readonly ItemId[], owned: readonly ItemId[], item: ItemId, inFight = false): EquipResult {
  if (inFight) return { ok: false, reason: 'locked-in-fight' }
  if (!owned.includes(item)) return { ok: false, reason: 'not-owned' }
  if (equipped.includes(item)) return { ok: true, equipped: [...equipped] }
  if (equipped.length >= MAX_EQUIPPED) return { ok: false, reason: 'full' }
  return { ok: true, equipped: [...equipped, item] }
}

export function unequipItem(equipped: readonly ItemId[], item: ItemId, inFight = false): EquipResult {
  if (inFight) return { ok: false, reason: 'locked-in-fight' }
  return { ok: true, equipped: equipped.filter((i) => i !== item) }
}

/** Sanitises an equipped list loaded from storage. */
export function sanitizeEquipped(equipped: unknown, owned: readonly ItemId[]): ItemId[] {
  if (!Array.isArray(equipped)) return []
  const out: ItemId[] = []
  for (const i of equipped) {
    if (typeof i === 'string' && i in ITEMS && owned.includes(i as ItemId) && !out.includes(i as ItemId)) out.push(i as ItemId)
    if (out.length === MAX_EQUIPPED) break
  }
  return out
}
