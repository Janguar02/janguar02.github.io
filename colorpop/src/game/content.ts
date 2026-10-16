import type { BossAttackDef, BossDef, Difficulty, LevelDef } from './types'

export const BRUTZEL: BossDef = {
  id: 'brutzel',
  name: 'Brutzel',
  title: 'der Glutkobold',
  maxHp: 220,
  attackEvery: 3,
  pattern: ['spit', 'emberRain', 'spit', 'soot'],
  enragedPattern: ['blaze', 'firestorm', 'spit'],
  enrageAt: 0.5,
  attacks: {
    spit: { id: 'spit', name: 'Funkenspucke', description: '10 Schaden', damage: 10 },
    emberRain: { id: 'emberRain', name: 'Glutregen', description: '5 Schaden · setzt 3 Steine in Brand', damage: 5, fireTiles: 3 },
    soot: { id: 'soot', name: 'Rußwolke', description: '5 Schaden · verrußt 2 Steine', damage: 5, sootTiles: 2 },
    blaze: { id: 'blaze', name: 'Flammenwalze', description: '14 Schaden', damage: 14 },
    firestorm: { id: 'firestorm', name: 'Feuersturm', description: '6 Schaden · setzt 4 Steine in Brand', damage: 6, fireTiles: 4 },
  },
  tactics: [
    'Jeder brennende Stein macht Brutzels Angriffe um 1 stärker – lösche Feuer früh.',
    'Ab 50 % Lebenspunkten wird er wütend und greift härter an.',
    'Ein gelöstes Blitzwort betäubt ihn: sein Angriff kommt ein Wort später.',
  ],
  counters: ['fireRing', 'shield', 'lifeCrystal'],
}

export const FROSTEL: BossDef = {
  id: 'frostel',
  name: 'Frostel',
  title: 'der Schneewicht',
  maxHp: 300,
  attackEvery: 3,
  pattern: ['snowball', 'icePatch', 'armor', 'snowball'],
  enragedPattern: ['blizzard', 'armor', 'snowball'],
  enrageAt: 0.6,
  finalPattern: ['avalanche', 'icePatch', 'armor'],
  finalAt: 0.3,
  attacks: {
    snowball: { id: 'snowball', name: 'Schneeball', description: '15 Schaden', damage: 15 },
    icePatch: { id: 'icePatch', name: 'Eisfleck', description: '8 Schaden · friert 3 Steine ein', damage: 8, iceTiles: 3 },
    armor: { id: 'armor', name: 'Eispanzer', description: '6 Schaden · Panzer schluckt 25 Schaden', damage: 6, armor: 25 },
    blizzard: { id: 'blizzard', name: 'Schneesturm', description: '11 Schaden · friert 3 Steine ein', damage: 11, iceTiles: 3 },
    avalanche: { id: 'avalanche', name: 'Lawine', description: '22 Schaden', damage: 22 },
  },
  tactics: [
    'Der Eispanzer schluckt Schaden. Brichst du ihn mit EINEM starken Wort, ist Frostel betäubt.',
    'Eingefrorene Steine tauen auf, wenn du direkt daneben ein Wort bildest.',
    'Drei Phasen: unter 60 % Schneesturm, unter 30 % rollt die Lawine.',
  ],
  counters: ['thawWind', 'hourglass', 'shield'],
}

export const BOSSES: Record<string, BossDef> = { brutzel: BRUTZEL, frostel: FROSTEL }

export const PLAYER_MAX_HP = 60
/** Every burning tile adds this much to a boss attack (negated by Feuerring). */
export const FIRE_ATTACK_BONUS = 1
export const FIRE_SPREAD_EVERY = 3
export const MAX_FIRE_TILES = 8
export const MAX_ICE_TILES = 10
export const BONUS_DURATION_MS = 12000
export const BONUS_MULTIPLIER = 3
export const GOLD_COINS = 10
export const DEFAULT_GOLD = { rate: 0.06, max: 2 }

export const CHAPTERS = [
  { id: 1, name: 'Pop-Archipel', subtitle: 'Kapitel 1' },
  { id: 2, name: 'Frostfeder-Gipfel', subtitle: 'Kapitel 2' },
] as const

export const LEVELS: LevelDef[] = [
  {
    id: 'l1',
    index: 1,
    chapter: 1,
    name: 'Bonbon-Bucht',
    subtitle: 'Sammle 550 Punkte',
    goal: { kind: 'score', target: 550 },
    moves: 12,
    stars: [550, 900, 1300],
    seed: 1101,
    rewardCoins: 60,
    rewardItem: 'goldenAlphabet',
    bonusEvents: true,
    intro: { title: 'Wörter verbinden', text: 'Ziehe über benachbarte Buchstaben – auch diagonal. Die Zielwörter oben zeigen dir einen leichten Einstieg.' },
  },
  {
    id: 'l4',
    index: 2,
    chapter: 1,
    name: 'Zuckerwatte-Steg',
    subtitle: 'Bilde 3 Wörter mit 5+ Buchstaben',
    goal: { kind: 'longWords', count: 3 },
    moves: 12,
    stars: [400, 750, 1100],
    seed: 1402,
    rewardCoins: 60,
    bonusEvents: true,
    intro: { title: 'Lange Wörter', text: 'Hier zählen Wörter ab 5 Buchstaben. Ab 6 Buchstaben entsteht eine Bombe, ab 7 ein Blitz.' },
  },
  {
    id: 'l2',
    index: 3,
    chapter: 1,
    name: 'Kristallklippen',
    subtitle: 'Befreie 12 Kristallsteine',
    goal: { kind: 'freeIce', count: 12 },
    moves: 14,
    stars: [500, 900, 1300],
    seed: 2202,
    setup: { ice: [0, 5, 30, 35, 2, 3, 32, 33, 12, 17, 18, 23] },
    rewardCoins: 80,
    rewardItem: 'lightningCore',
    bonusEvents: true,
    intro: { title: 'Kristallsteine', text: 'Kristalle blockieren Buchstaben. Bilde ein Wort direkt daneben (oben, unten, links, rechts), um sie zu befreien.' },
  },
  {
    id: 'l5',
    index: 4,
    chapter: 1,
    name: 'Goldgrotte',
    subtitle: 'Sammle 4 Goldsteine',
    goal: { kind: 'gold', count: 4 },
    moves: 14,
    stars: [500, 850, 1200],
    seed: 1505,
    gold: { rate: 0.25, max: 3 },
    rewardCoins: 80,
    bonusEvents: true,
    intro: { title: 'Goldsteine', text: 'Goldene Steine bringen Münzen und Extrakraft. Verwende sie in Wörtern – auch Bomben und Blitze sammeln sie ein.' },
  },
  {
    id: 'l3',
    index: 5,
    chapter: 1,
    name: 'Glutpfad',
    subtitle: 'Lösche 10 Feuersteine',
    goal: { kind: 'extinguish', count: 10 },
    moves: 19,
    stars: [600, 1000, 1400],
    seed: 3303,
    setup: { fire: [8, 15, 20, 27, 33] },
    rewardCoins: 100,
    rewardItem: 'fireRing',
    bonusEvents: true,
    intro: { title: 'Feuer', text: 'Brennende Steine breiten sich alle 3 Züge aus. Lösche sie, indem du sie in Wörtern verwendest.' },
  },
  {
    id: 'boss1',
    index: 6,
    chapter: 1,
    name: 'Brutzels Vulkan',
    subtitle: 'Besiege Brutzel, den Glutkobold',
    goal: { kind: 'boss', bossId: 'brutzel' },
    moves: null,
    // Stars by remaining player HP in percent.
    stars: [1, 40, 70],
    seed: 4404,
    rewardCoins: 200,
    bonusEvents: true,
    intro: { title: 'Bosskampf', text: 'Jedes Wort ist ein Angriff. Brutzel kündigt an, was er als Nächstes tut – plane deine Wörter danach.' },
  },
  {
    id: 'l6',
    index: 7,
    chapter: 2,
    name: 'Funkenfeld',
    subtitle: 'Löse 3 Spezialsteine aus',
    goal: { kind: 'specials', count: 3 },
    moves: 15,
    stars: [700, 1100, 1500],
    seed: 6606,
    // Three separated specials: each needs its own word (no accidental chain).
    setup: { specials: [{ cell: 7, kind: 'bomb' }, { cell: 16, kind: 'lightning' }, { cell: 33, kind: 'bomb' }] },
    rewardCoins: 100,
    bonusEvents: true,
    intro: { title: 'Spezialsteine einsetzen', text: 'Bomben und Blitze zünden, wenn sie Teil deines Wortes sind. Bombe und Blitz im selben Wort lösen einen Kreuzschlag aus.' },
  },
  {
    id: 'l7',
    index: 8,
    chapter: 2,
    name: 'Eisfeuer-Pass',
    subtitle: 'Befreie 10 Kristallsteine',
    goal: { kind: 'freeIce', count: 10 },
    moves: 16,
    stars: [700, 1100, 1500],
    seed: 7707,
    setup: { ice: [1, 4, 7, 10, 19, 22, 25, 28, 31, 34], fire: [14, 21] },
    rewardCoins: 110,
    bonusEvents: true,
    intro: { title: 'Eis trifft Feuer', text: 'Kristalle UND Feuer: Befreie die Kristalle, bevor sich das Feuer ausbreitet.' },
  },
  {
    id: 'l8',
    index: 9,
    chapter: 2,
    name: 'Geheimbibliothek',
    subtitle: 'Finde 6 Geheimwörter',
    goal: { kind: 'secrets', count: 6 },
    moves: 14,
    stars: [800, 1200, 1600],
    seed: 8808,
    rewardCoins: 110,
    bonusEvents: true,
    intro: { title: 'Geheimwörter', text: 'Jedes neue Wort ab 4 Buchstaben, das NICHT als Ziel angezeigt wird, ist ein Geheimwort. Hier zählen nur sie.' },
  },
  {
    id: 'l9',
    index: 10,
    chapter: 2,
    name: 'Rußwald',
    subtitle: 'Sammle 1200 Punkte',
    goal: { kind: 'score', target: 1200 },
    moves: 14,
    stars: [1200, 1700, 2300],
    seed: 9909,
    setup: { soot: [0, 5, 13, 16, 19, 22, 30, 35] },
    rewardCoins: 120,
    bonusEvents: true,
    intro: { title: 'Rußsteine', text: 'Ruß blockiert wie Kristall. Befreite Steine schaffen Platz für lange, punktestarke Wörter.' },
  },
  {
    id: 'l10',
    index: 11,
    chapter: 2,
    name: 'Lange Leitung',
    subtitle: 'Bilde 5 Wörter mit 5+ Buchstaben',
    goal: { kind: 'longWords', count: 5 },
    moves: 15,
    stars: [900, 1400, 1900],
    seed: 1011,
    setup: { ice: [12, 17, 18, 23] },
    rewardCoins: 140,
    rewardItem: 'thawWind',
    bonusEvents: true,
  },
  {
    id: 'boss2',
    index: 12,
    chapter: 2,
    name: 'Frostels Eisthron',
    subtitle: 'Besiege Frostel, den Schneewicht',
    goal: { kind: 'boss', bossId: 'frostel' },
    moves: null,
    stars: [1, 40, 70],
    seed: 1212,
    rewardCoins: 300,
    bonusEvents: true,
    intro: { title: 'Frostels Eispanzer', text: 'Frostel schützt sich mit Eis. Ein einziges starkes Wort zerbricht den Panzer und betäubt ihn.' },
  },
]

export function levelById(id: string): LevelDef {
  const l = LEVELS.find((x) => x.id === id)
  if (!l) throw new Error(`Unknown level ${id}`)
  return l
}

// ---------------- Difficulty modes (one shared core, data-driven) ----------------

export interface DifficultyDef {
  id: Difficulty
  label: string
  description: string
  /** Visible target words. */
  targets: number
  targetLen: [number, number]
  moveBonus: number
  goalScale: number
  bossHpScale: number
  bossDamageScale: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  relaxed: {
    id: 'relaxed',
    label: 'Entspannt',
    description: '3 sichtbare Zielwörter, leichte Wörter, mehr Züge',
    targets: 3,
    targetLen: [3, 5],
    moveBonus: 4,
    goalScale: 0.85,
    bossHpScale: 0.75,
    bossDamageScale: 0.75,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    description: '2 sichtbare Zielwörter, versteckte Geheimwörter',
    targets: 2,
    targetLen: [4, 6],
    moveBonus: 0,
    goalScale: 1,
    bossHpScale: 1,
    bossDamageScale: 1,
  },
  expert: {
    id: 'expert',
    label: 'Experte',
    description: 'Keine Zielwörter, freie Suche, härtere Ziele',
    targets: 0,
    targetLen: [5, 7],
    moveBonus: -2,
    goalScale: 1.25,
    bossHpScale: 1.2,
    bossDamageScale: 1.15,
  },
}

/** Level as played in a given mode: moves, goals and star thresholds scaled. */
export function applyDifficulty(level: LevelDef, d: Difficulty): LevelDef {
  const m = DIFFICULTIES[d]
  if (d === 'normal') return level
  const scale = (n: number) => Math.max(1, Math.round(n * m.goalScale))
  const g = level.goal
  const goal: LevelDef['goal'] =
    g.kind === 'score'
      ? { kind: 'score', target: Math.round((g.target * m.goalScale) / 10) * 10 }
      : g.kind === 'freeIce' || g.kind === 'specials'
        ? { ...g, count: Math.min(g.count, scale(g.count)) }
        : g.kind === 'extinguish' || g.kind === 'longWords' || g.kind === 'gold' || g.kind === 'secrets'
          ? { ...g, count: scale(g.count) }
          : g
  const subtitle = goalText(goal) ?? level.subtitle
  return {
    ...level,
    goal,
    subtitle,
    moves: level.moves === null ? null : Math.max(6, level.moves + m.moveBonus),
    stars: g.kind === 'boss' ? level.stars : (level.stars.map((t) => Math.round((t * m.goalScale) / 10) * 10) as [number, number, number]),
  }
}

export function goalText(goal: LevelDef['goal']): string | null {
  switch (goal.kind) {
    case 'score':
      return `Sammle ${goal.target} Punkte`
    case 'freeIce':
      return `Befreie ${goal.count} Kristallsteine`
    case 'extinguish':
      return `Lösche ${goal.count} Feuersteine`
    case 'longWords':
      return `Bilde ${goal.count} Wörter mit 5+ Buchstaben`
    case 'gold':
      return `Sammle ${goal.count} Goldsteine`
    case 'specials':
      return `Löse ${goal.count} Spezialsteine aus`
    case 'secrets':
      return `Finde ${goal.count} Geheimwörter`
    case 'boss':
      return null
  }
}

/** Boss attack damage in the given mode (before items). */
export function attackDamage(base: number, d: Difficulty): number {
  if (base <= 0) return 0
  return Math.max(1, Math.round(base * DIFFICULTIES[d].bossDamageScale))
}

export function describeAttack(atk: BossAttackDef, d: Difficulty): string {
  const parts = atk.damage > 0 ? [`${attackDamage(atk.damage, d)} Schaden`] : []
  if (atk.fireTiles) parts.push(`setzt ${atk.fireTiles} Steine in Brand`)
  if (atk.sootTiles) parts.push(`verrußt ${atk.sootTiles} Steine`)
  if (atk.iceTiles) parts.push(`friert ${atk.iceTiles} Steine ein`)
  if (atk.armor) parts.push(`Panzer schluckt ${armorAmount(atk.armor, d)} Schaden`)
  return parts.join(' · ')
}

export function armorAmount(base: number, d: Difficulty): number {
  return Math.round(base * DIFFICULTIES[d].bossHpScale)
}

/** Boss phase from remaining HP ratio (0 calm, 1 enraged, 2 final). */
export function phaseFor(def: BossDef, hp: number, maxHp: number): number {
  const r = hp / maxHp
  if (def.finalAt !== undefined && r <= def.finalAt) return 2
  return r <= def.enrageAt ? 1 : 0
}

export function patternFor(def: BossDef, phase: number): string[] {
  if (phase >= 2 && def.finalPattern) return def.finalPattern
  return phase >= 1 ? def.enragedPattern : def.pattern
}

// ---------------- Word rewards ----------------

export const WORD_REWARDS = {
  secret: { pct: 30, min: 2, coins: 2 },
  rare: { pct: 60, min: 4, coins: 5 },
  blitzCoins: 8,
  /** Combo multiplier by streak length (index = streak, capped at the end). */
  combo: [1, 1, 1.1, 1.2, 1.3, 1.4, 1.5],
} as const

/** Combo-Glocke raises the cap from ×1.5 to ×1.8 (steps of 0.1). */
export function comboMultiplier(streak: number, bell = false): number {
  const c = WORD_REWARDS.combo
  const n = Math.max(0, streak)
  if (bell && n >= c.length) return Math.min(1.8, Math.round((1.5 + (n - c.length + 1) * 0.1) * 10) / 10)
  return c[Math.min(n, c.length - 1)]
}
