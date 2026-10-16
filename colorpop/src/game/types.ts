export const ROWS = 6
export const COLS = 6
export const CELLS = ROWS * COLS
export const MIN_WORD = 3

/** Power tiles the player earns. */
export type SpecialKind = 'bomb' | 'lightning' | 'gold'
/** Blockers make a tile unusable until they are broken. */
export type BlockerKind = 'ice' | 'soot'

export interface Tile {
  id: number
  letter: string
  special: SpecialKind | null
  blocker: BlockerKind | null
  /** Burning tile: usable in words, spreads over time, fuels boss attacks. */
  fire: boolean
}

/** Row-major, always CELLS long; index = row * COLS + col. */
export type Board = Tile[]

export type ItemId =
  | 'goldenAlphabet'
  | 'wordBlade'
  | 'shield'
  | 'fireRing'
  | 'lightningCore'
  | 'lifeCrystal'
  | 'thawWind'
  | 'comboBell'
  | 'hourglass'

/** Tactical role of an item – shown as a badge and used for loadout advice. */
export type ItemRole = 'attack' | 'defense' | 'heal' | 'control' | 'combo'

export const MAX_EQUIPPED = 3

export type LevelGoal =
  | { kind: 'score'; target: number }
  | { kind: 'freeIce'; count: number }
  | { kind: 'extinguish'; count: number }
  | { kind: 'boss'; bossId: string }
  /** Fresh words with at least 5 letters. */
  | { kind: 'longWords'; count: number }
  | { kind: 'gold'; count: number }
  /** Bomb/lightning activations. */
  | { kind: 'specials'; count: number }
  | { kind: 'secrets'; count: number }

export interface LevelDef {
  id: string
  index: number
  name: string
  subtitle: string
  goal: LevelGoal
  /** Move limit for normal levels; boss fights have no move limit. */
  moves: number | null
  /** Score thresholds for 1/2/3 stars (boss: stars by remaining HP%). */
  stars: [number, number, number]
  seed: number
  /** World-map chapter (1-based). */
  chapter: number
  /** Short teaching card shown before the level when it introduces something new. */
  intro?: { title: string; text: string }
  setup?: {
    ice?: number[]
    fire?: number[]
    soot?: number[]
    specials?: { cell: number; kind: SpecialKind }[]
  }
  /** Chance that a refilled tile becomes gold (default 0.06) and max gold on board. */
  gold?: { rate: number; max: number }
  rewardCoins: number
  rewardItem?: ItemId
  bonusEvents: boolean
}

export interface BossAttackDef {
  id: string
  name: string
  description: string
  damage: number
  fireTiles?: number
  sootTiles?: number
  iceTiles?: number
  /** Ice armour that absorbs the next N damage. */
  armor?: number
}

export interface BossDef {
  id: string
  name: string
  title: string
  maxHp: number
  attackEvery: number
  pattern: string[]
  enragedPattern: string[]
  enrageAt: number
  /** Optional third phase. */
  finalPattern?: string[]
  finalAt?: number
  attacks: Record<string, BossAttackDef>
  /** Short tactical note shown in the pre-fight preview. */
  tactics: string[]
  /** Items that counter this boss (pre-fight advice). */
  counters: ItemId[]
}

export interface BossState {
  id: string
  hp: number
  maxHp: number
  /** Valid words left until the next attack fires. */
  countdown: number
  patternIndex: number
  enraged: boolean
  /** 0 = calm, 1 = enraged, 2 = final phase. */
  phase?: number
  /** Remaining ice armour (absorbs damage first). */
  armor?: number
  /** Keep the announced attack through a phase transition. */
  queuedAttack?: string | null
}

export type MissionKind = 'long' | 'gold' | 'fire' | 'vowels' | 'streak'
export interface WordMission {
  kind: MissionKind
  progress: number
}

export interface PlayerState {
  hp: number
  maxHp: number
}

export interface BonusEvent {
  word: string
  multiplier: number
  durationMs: number
  msLeft: number
  /** 'intro' = banner animating in, timer frozen; 'active' = countdown running. */
  phase: 'intro' | 'active'
}

export type GameStatus = 'playing' | 'won' | 'lost'

export type Difficulty = 'relaxed' | 'normal' | 'expert'

/** Rare, earned "Wortmeister" achievements – the strongest celebration tier. */
export type MomentId = 'giant' | 'trio' | 'rarity' | 'chain' | 'comboRush' | 'finisher' | 'flawless' | 'armorBreak'

/** How a played word is classified for rewards. */
export type WordKind = 'target' | 'secret' | 'rare' | 'free' | 'repeat'

export interface GameState {
  levelId: string
  board: Board
  rng: number
  nextTileId: number
  score: number
  movesLeft: number | null
  wordsPlayed: number
  iceFreed: number
  fireExtinguished: number
  coinsEarned: number
  longestWord: string
  bestWord: { word: string; power: number } | null
  player: PlayerState | null
  boss: BossState | null
  equipped: ItemId[]
  /** Turns until the oldest fire spreads (only meaningful while fire exists). */
  fireSpreadIn: number
  bonus: BonusEvent | null
  nextBonusAt: number
  bonusesWon: number
  rescues: number
  status: GameStatus
  difficulty: Difficulty
  /** Visible target words – always formable on the current board. */
  targets: string[]
  targetsSolved: number
  /** Every distinct word played in this level (rewards are granted once). */
  foundWords: string[]
  secretsFound: number
  /** Consecutive target/secret words; drives the combo multiplier. */
  combo: number
  bestCombo: number
  energy: number
  energySpecials: number
  mission: WordMission | null
  missionsCompleted: number
  nextMissionAt: number
  /** Fresh words with ≥ 5 letters (longWords goal). */
  longWords: number
  goldCollected: number
  specialsTriggered: number
  /** Consecutive distinct fresh words with ≥ 5 letters (for the "trio" moment). */
  longStreak: number
  /** Wortmeister moments earned in this run (each at most once). */
  moments: MomentId[]
  /** Player HP was never reduced (boss fights). */
  untouched: boolean
}
