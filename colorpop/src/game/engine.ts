import { armorAmount, attackDamage, BOSSES, BONUS_DURATION_MS, BONUS_MULTIPLIER, DEFAULT_GOLD, DIFFICULTIES, FIRE_ATTACK_BONUS, FIRE_SPREAD_EVERY, GOLD_COINS, MAX_FIRE_TILES, MAX_ICE_TILES, patternFor, phaseFor, PLAYER_MAX_HP, WORD_REWARDS } from './content'
import { ITEM_VALUES } from './items'
import { detectMoments } from './moments'
import { BONUS_WORDS, COMMON_WORDS } from './data/commonWords'
import type { Dictionary } from './dictionary'
import { ensurePlayable, generateBoard, type RescueAction } from './generator'
import { collapseAndRefill, isUsable, orthoNeighbours, validatePath, wordFromPath, type PathError } from './grid'
import { Rng } from './rng'
import { previewWordPower, crystalHeal, mitigateDamage, nextCombo, POINTS_PER_POWER, specialsForLength, type PowerBreakdown } from './scoring'
import { resolveSpecials } from './specials'
import { commonWordsOnBoard, findPath } from './solver'
import { COLS, type Board, type BossDef, type Difficulty, type GameState, type ItemId, type LevelDef, type MomentId, type SpecialKind, type WordKind } from './types'
import { classifyWord, refreshTargets, shapeRefill } from './words'
import { advanceMission, ENERGY_LIMIT, MISSION_COINS, refreshMission } from './missions'

export interface EngineContext {
  dict: Dictionary
  common?: readonly string[]
  bonusWords?: readonly string[]
}

export type TurnStep =
  | { type: 'word'; word: string; path: number[]; ids: number[]; power: number; points: number; breakdown: PowerBreakdown; bonus: boolean; kind: WordKind; combo: number; coins: number }
  | { type: 'clear'; wordIds: number[]; specialIds: number[]; triggered: { id: number; kind: SpecialKind; cell: number }[]; unblockedIds: number[]; fusion: boolean }
  | { type: 'energy'; amount: number; charged: boolean }
  | { type: 'mission'; coins: number }
  | { type: 'board'; board: Board; spawned: { id: number; kind: SpecialKind }[] }
  | { type: 'bossDamage'; amount: number; hp: number }
  | { type: 'item'; item: ItemId; amount: number }
  | { type: 'heal'; amount: number; hp: number }
  | { type: 'coins'; amount: number }
  | { type: 'enrage'; phase: number }
  | { type: 'armor'; absorbed: number; left: number; broken: boolean; stunned: boolean }
  | { type: 'moment'; id: MomentId }
  | { type: 'bossAttack'; attackId: string; damage: number; blocked: number; hp: number; board: Board; affectedIds: number[] }
  | { type: 'fireSpread'; ids: number[]; board: Board }
  | { type: 'rescue'; action: RescueAction; board: Board; changedIds: number[] }
  | { type: 'bonusResult'; word: string; success: boolean }
  | { type: 'bonusStart'; word: string }
  | { type: 'stun'; countdown: number }
  | { type: 'targets'; targets: string[]; solved: string | null; added: string[]; dropped: string[]; board: Board; injectedIds: number[] }
  | { type: 'end'; status: 'won' | 'lost' }

export type PlayResult =
  | { ok: true; state: GameState; steps: TurnStep[]; word: string }
  | { ok: false; reason: PathError | 'not-a-word' | 'game-over'; word: string }

const commonOf = (ctx: EngineContext) => ctx.common ?? COMMON_WORDS
const bonusOf = (ctx: EngineContext) => ctx.bonusWords ?? BONUS_WORDS

/**
 * Starts a level. `level` is the mode-adjusted definition (see applyDifficulty);
 * the mode itself is stored in the state so resumed runs stay consistent.
 */
export function createGame(level: LevelDef, equipped: readonly ItemId[], ctx: EngineContext, seedOverride?: number, difficulty: Difficulty = 'normal'): GameState {
  const rng = new Rng(seedOverride ?? level.seed)
  const nextId = { value: 1 }
  const generated = generateBoard(rng, ctx.dict, commonOf(ctx), nextId, level.setup)
  const initialTargets = refreshTargets(generated, [], difficulty, rng, { prefer: goalPreference(generated, level) })
  const board = initialTargets.board
  const bossDef = level.goal.kind === 'boss' ? BOSSES[level.goal.bossId] : null
  const bossHp = bossDef ? Math.round(bossDef.maxHp * DIFFICULTIES[difficulty].bossHpScale) : 0
  const hourglass = equipped.includes('hourglass')
  const state: GameState = {
    levelId: level.id,
    board,
    rng: rng.state,
    nextTileId: nextId.value,
    score: 0,
    movesLeft: level.moves === null ? null : level.moves + (hourglass ? ITEM_VALUES.hourglass.extraMoves : 0),
    wordsPlayed: 0,
    iceFreed: 0,
    fireExtinguished: 0,
    coinsEarned: 0,
    longestWord: '',
    bestWord: null,
    player: bossDef ? { hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP } : null,
    boss: bossDef
      ? { id: bossDef.id, hp: bossHp, maxHp: bossHp, countdown: bossAttackEvery(bossDef, equipped), patternIndex: 0, enraged: false, phase: 0, armor: 0 }
      : null,
    equipped: [...equipped],
    fireSpreadIn: FIRE_SPREAD_EVERY,
    bonus: null,
    nextBonusAt: 2,
    bonusesWon: 0,
    rescues: 0,
    status: 'playing',
    difficulty,
    targets: initialTargets.targets,
    targetsSolved: 0,
    foundWords: [],
    secretsFound: 0,
    combo: 0,
    bestCombo: 0,
    energy: 0,
    energySpecials: 0,
    mission: null,
    missionsCompleted: 0,
    nextMissionAt: 0,
    longWords: 0,
    goldCollected: 0,
    specialsTriggered: 0,
    longStreak: 0,
    moments: [],
    untouched: true,
  }
  state.mission = refreshMission(state, commonOf(ctx))
  return state
}

/** Targets lead casual players toward the level goal: through fire, next to ice. */
export function goalPreference(board: Board, level: LevelDef): ((path: number[]) => number) | undefined {
  if (level.goal.kind === 'extinguish') return (p) => p.filter((i) => board[i].fire).length
  if (level.goal.kind === 'longWords') return (p) => (p.length >= 5 ? 1 : 0)
  if (level.goal.kind === 'gold') return (p) => p.filter((i) => board[i].special === 'gold').length
  if (level.goal.kind === 'specials') return (p) => p.filter((i) => board[i].special === 'bomb' || board[i].special === 'lightning').length
  if (level.goal.kind === 'freeIce')
    return (p) => {
      const near = new Set<number>()
      for (const i of p) for (const n of orthoNeighbours(i)) if (board[n].blocker === 'ice') near.add(n)
      return near.size
    }
  return undefined
}

/**
 * Makes sure a (resumed) state shows valid targets; also used right after
 * loading, because the board may have been saved by an older version.
 */
export function withValidTargets(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const rng = new Rng(state.rng)
  const rescue = ensurePlayable(state.board, rng, COMMON_WORDS)
  const tr = refreshTargets(rescue.board, state.targets, state.difficulty, rng, { avoid: state.bonus ? [state.bonus.word] : [], exclude: state.foundWords })
  const next = { ...state, targets: tr.targets, board: tr.board, rng: rng.state, bonus: state.bonus && findPath(tr.board, state.bonus.word) ? state.bonus : null }
  return { ...next, mission: refreshMission(next) }
}

/** Words between boss attacks (Zeitsand stretches the rhythm). */
export function bossAttackEvery(def: BossDef, equipped: readonly ItemId[]): number {
  return equipped.includes('hourglass') ? Math.max(def.attackEvery, ITEM_VALUES.hourglass.attackEvery) : def.attackEvery
}

export function bossPhase(state: GameState): number {
  if (!state.boss) return 0
  return state.boss.phase ?? (state.boss.enraged ? 1 : 0)
}

export function nextBossAttack(state: GameState): string | null {
  if (!state.boss) return null
  if (state.boss.queuedAttack) return state.boss.queuedAttack
  const def = BOSSES[state.boss.id]
  const pattern = patternFor(def, bossPhase(state))
  return pattern[state.boss.patternIndex % pattern.length]
}

export function goalProgress(state: GameState, level: LevelDef): { current: number; target: number } {
  const g = level.goal
  switch (g.kind) {
    case 'score':
      return { current: Math.min(state.score, g.target), target: g.target }
    case 'freeIce':
      return { current: Math.min(state.iceFreed, g.count), target: g.count }
    case 'extinguish':
      return { current: Math.min(state.fireExtinguished, g.count), target: g.count }
    case 'boss':
      return { current: state.boss ? state.boss.maxHp - state.boss.hp : 0, target: state.boss?.maxHp ?? 1 }
    case 'longWords':
      return { current: Math.min(state.longWords ?? 0, g.count), target: g.count }
    case 'gold':
      return { current: Math.min(state.goldCollected ?? 0, g.count), target: g.count }
    case 'specials':
      return { current: Math.min(state.specialsTriggered ?? 0, g.count), target: g.count }
    case 'secrets':
      return { current: Math.min(state.secretsFound, g.count), target: g.count }
  }
}

export function isGoalReached(state: GameState, level: LevelDef): boolean {
  const { current, target } = goalProgress(state, level)
  return current >= target
}

export function starsFor(state: GameState, level: LevelDef): number {
  if (state.status !== 'won') return 0
  const value = level.goal.kind === 'boss' && state.player ? Math.round((state.player.hp / state.player.maxHp) * 100) : state.score
  return level.stars.filter((t) => value >= t).length || 1
}

/** Ignites `count` random plain tiles; returns affected ids. */
function igniteRandom(board: Board, rng: Rng, count: number, avoid: Set<number> = new Set()): number[] {
  const candidates = rng.shuffle(
    board.map((_, i) => i).filter((i) => isUsable(board[i]) && !board[i].fire && !board[i].special && !avoid.has(i)),
  )
  const fireNow = board.filter((t) => t.fire).length
  const n = Math.max(0, Math.min(count, MAX_FIRE_TILES - fireNow, candidates.length))
  const ids: number[] = []
  for (const i of candidates.slice(0, n)) {
    board[i] = { ...board[i], fire: true }
    ids.push(board[i].id)
  }
  return ids
}

function freezeRandom(board: Board, rng: Rng, count: number): number[] {
  const iceNow = board.filter((t) => t.blocker).length
  const candidates = rng.shuffle(board.map((_, i) => i).filter((i) => isUsable(board[i]) && !board[i].special))
  const ids: number[] = []
  for (const i of candidates.slice(0, Math.max(0, Math.min(count, MAX_ICE_TILES - iceNow)))) {
    board[i] = { ...board[i], blocker: 'ice', fire: false }
    ids.push(board[i].id)
  }
  return ids
}

function sootRandom(board: Board, rng: Rng, count: number): number[] {
  const candidates = rng.shuffle(board.map((_, i) => i).filter((i) => isUsable(board[i]) && !board[i].special))
  const ids: number[] = []
  for (const i of candidates.slice(0, count)) {
    board[i] = { ...board[i], blocker: 'soot', fire: false }
    ids.push(board[i].id)
  }
  return ids
}

/**
 * Resolves one complete player turn. Pure: returns the new state plus an
 * ordered list of presentation steps. The UI only replays these steps.
 */
export function playWord(state: GameState, path: readonly number[], level: LevelDef, ctx: EngineContext): PlayResult {
  const board0 = state.board
  const word = path.every((i) => board0[i]) ? wordFromPath(board0, path) : ''
  if (state.status !== 'playing') return { ok: false, reason: 'game-over', word }
  const pathErr = validatePath(board0, path)
  if (pathErr) return { ok: false, reason: pathErr, word }
  if (!ctx.dict.has(word)) return { ok: false, reason: 'not-a-word', word }

  const s: GameState = {
    ...state,
    player: state.player ? { ...state.player } : null,
    boss: state.boss ? { ...state.boss } : null,
    bonus: state.bonus ? { ...state.bonus } : null,
    targets: [...state.targets],
    foundWords: [...state.foundWords],
    moments: [...(state.moments ?? [])],
  }
  const steps: TurnStep[] = []
  const rng = new Rng(state.rng)
  const nextId = { value: state.nextTileId }
  const bossDef: BossDef | null = s.boss ? BOSSES[s.boss.id] : null
  const wordIndex = s.wordsPlayed + 1
  s.wordsPlayed = wordIndex

  // --- 1. Collect cleared cells: the word plus chained special activations.
  const board: Board = [...board0]
  const thaw = s.equipped.includes('thawWind')
  const bell = s.equipped.includes('comboBell')
  const { fusion, cleared, triggered, unblocked } = resolveSpecials(board0, path, { diagonalThaw: thaw })

  const clearedTiles = [...cleared].map((i) => board[i])
  const goldTiles = clearedTiles.filter((t) => t.special === 'gold').length
  const extinguished = clearedTiles.filter((t) => t.fire).length
  let iceFreed = 0
  for (const u of unblocked) {
    if (board[u].blocker === 'ice') iceFreed++
    board[u] = { ...board[u], blocker: null }
  }
  s.iceFreed += iceFreed
  s.fireExtinguished += extinguished
  s.goldCollected = (s.goldCollected ?? 0) + goldTiles
  s.specialsTriggered = (s.specialsTriggered ?? 0) + triggered.length

  // --- 2. Word class, combo, power, score, blitz word.
  const kind = classifyWord(word, s.targets, s.foundWords)
  const fresh = kind !== 'repeat'
  const missionResult = advanceMission(s.mission, word, path.map(i => board0[i]), fresh)
  s.mission = missionResult.mission
  if (missionResult.completed) {
    s.missionsCompleted++
    s.coinsEarned += MISSION_COINS
    s.nextMissionAt = wordIndex + 3
  }
  const comboBefore = s.combo
  s.combo = nextCombo(s.combo, kind, bell)
  s.bestCombo = Math.max(s.bestCombo, s.combo)
  if (fresh && word.length >= 5) {
    s.longWords = (s.longWords ?? 0) + 1
    s.longStreak = (s.longStreak ?? 0) + 1
  } else s.longStreak = 0
  if (!s.foundWords.includes(word)) s.foundWords.push(word)
  if (kind === 'target') s.targetsSolved++
  if (kind === 'secret' || kind === 'rare') s.secretsFound++
  const bonusHit = fresh && !!s.bonus && s.bonus.phase === 'active' && s.bonus.word === word
  const breakdown = previewWordPower(state, path)
  const power = breakdown.total
  const points = power * POINTS_PER_POWER
  s.score += points
  if (word.length > s.longestWord.length) s.longestWord = word
  if (!s.bestWord || power > s.bestWord.power) s.bestWord = { word, power }
  const wordCoins = (kind === 'secret' || kind === 'rare' ? WORD_REWARDS[kind].coins : 0) + (bonusHit ? WORD_REWARDS.blitzCoins : 0)
  s.coinsEarned += wordCoins
  steps.push({ type: 'word', word, path: [...path], ids: path.map((i) => board0[i].id), power, points, breakdown, bonus: bonusHit, kind, combo: s.combo, coins: wordCoins })
  const bellEnergy = bell && s.combo > comboBefore && s.combo % ITEM_VALUES.comboBell.energyEvery === 0 ? 1 : 0
  const energyGain = fresh ? (word.length >= 6 || kind === 'rare' ? 2 : 0) + (s.combo > 0 && s.combo % 3 === 0 ? 1 : 0) + bellEnergy : 0
  s.energy += energyGain
  const charged = s.energy >= ENERGY_LIMIT
  if (charged) { s.energy -= ENERGY_LIMIT; s.energySpecials++ }
  if (energyGain) steps.push({ type: 'energy', amount: energyGain, charged })
  if (missionResult.completed) steps.push({ type: 'mission', coins: MISSION_COINS })
  // Visible item activations (only items that actually contributed this turn).
  for (const part of breakdown.parts) {
    if (part.source === 'goldenAlphabet' || part.source === 'wordBlade' || part.source === 'fireRing' || part.source === 'thawWind') {
      steps.push({ type: 'item', item: part.source, amount: part.amount })
    }
  }
  if (bell && kind === 'repeat' && comboBefore > 0) steps.push({ type: 'item', item: 'comboBell', amount: s.combo })
  if (bonusHit) {
    steps.push({ type: 'bonusResult', word, success: true })
    s.bonus = null
    s.bonusesWon++
    s.nextBonusAt = wordIndex + 4
  }
  steps.push({
    type: 'clear',
    wordIds: path.map((i) => board0[i].id),
    specialIds: [...cleared].filter((i) => !path.includes(i)).map((i) => board0[i].id),
    triggered,
    unblockedIds: [...unblocked].map((i) => board[i].id),
    fusion,
  })

  // --- 3. Gravity, refill, earned specials.
  const firstNewId = nextId.value
  let next = collapseAndRefill(board, cleared, rng, nextId)
  const spawned: { id: number; kind: SpecialKind }[] = []
  const newCells = next.map((t, i) => (t.id >= firstNewId ? i : -1)).filter((i) => i >= 0)
  next = shapeRefill(next, newCells, rng)
  const preferCols = [path[path.length - 1] % COLS, path[0] % COLS]
  const earned = fresh ? [...specialsForLength(word.length), ...(charged ? ['lightning' as const] : [])] : []
  earned.forEach((kind, k) => {
    const free = newCells.filter((i) => !next[i].special)
    const preferred = free.filter((i) => i % COLS === preferCols[k])
    // Lowest new tile in the preferred column; otherwise any new tile.
    const pick = (preferred.length ? preferred : free).sort((a, b) => b - a)[0]
    if (pick === undefined) return
    next[pick] = { ...next[pick], special: kind }
    spawned.push({ id: next[pick].id, kind })
  })
  const gold = level.gold ?? DEFAULT_GOLD
  let goldOnBoard = next.filter((t) => t.special === 'gold').length
  for (const i of newCells) {
    if (goldOnBoard >= gold.max) break
    if (!next[i].special && rng.next() < gold.rate) {
      next[i] = { ...next[i], special: 'gold' }
      spawned.push({ id: next[i].id, kind: 'gold' })
      goldOnBoard++
      if (gold.rate < 0.1) break
    }
  }
  steps.push({ type: 'board', board: next, spawned })

  if (goldTiles > 0) {
    s.coinsEarned += goldTiles * GOLD_COINS
    steps.push({ type: 'coins', amount: goldTiles * GOLD_COINS })
  }
  if (breakdown.parts.some((p) => p.source === 'lightningCore')) {
    steps.push({ type: 'item', item: 'lightningCore', amount: breakdown.parts.find((p) => p.source === 'lightningCore')!.amount })
  }

  // --- 4. Combat resolution.
  let armorBroken = false
  if (s.boss && bossDef && s.player) {
    let dmg = power
    const armor = s.boss.armor ?? 0
    if (armor > 0) {
      // Ice armour absorbs damage first; breaking it with ONE word stuns the boss.
      const absorbed = Math.min(armor, dmg)
      dmg -= absorbed
      s.boss.armor = armor - absorbed
      armorBroken = power >= armor
      const stunned = armorBroken && s.boss.hp - dmg > 0
      if (stunned) s.boss.countdown = Math.min(bossAttackEvery(bossDef, s.equipped) + 1, s.boss.countdown + 1)
      steps.push({ type: 'armor', absorbed, left: s.boss.armor, broken: s.boss.armor === 0, stunned })
    }
    s.boss.hp = Math.max(0, s.boss.hp - dmg)
    steps.push({ type: 'bossDamage', amount: dmg, hp: s.boss.hp })
    const heal = crystalHeal(wordIndex, s.equipped)
    if (heal > 0 && s.boss.hp > 0) {
      const before = s.player.hp
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal)
      steps.push({ type: 'item', item: 'lifeCrystal', amount: s.player.hp - before })
      steps.push({ type: 'heal', amount: s.player.hp - before, hp: s.player.hp })
    }
    if (bonusHit && s.boss.hp > 0) {
      // Blitz word stuns the boss: its next attack comes one word later.
      s.boss.countdown = Math.min(bossAttackEvery(bossDef, s.equipped) + 1, s.boss.countdown + 1)
      steps.push({ type: 'stun', countdown: s.boss.countdown })
    }
    const phase = phaseFor(bossDef, s.boss.hp, s.boss.maxHp)
    if (s.boss.hp > 0 && phase > bossPhase(s)) {
      // The announced attack stays locked through the phase change.
      s.boss.queuedAttack = nextBossAttack(s)
      s.boss.phase = phase
      s.boss.enraged = true
      s.boss.patternIndex = 0
      steps.push({ type: 'enrage', phase })
    }
  }

  // --- 4b. Wortmeister moments (each at most once per run).
  const bossDefeated = !!s.boss && s.boss.hp <= 0
  const finisherCause = bonusHit || triggered.length > 0 || power >= 40
  const earnedMoments = detectMoments(
    { word, fresh, cleared: cleared.size, combo: s.combo, longStreak: s.longStreak, armorBroken, bossDefeated, finisherCause },
    s.moments,
  )
  if (earnedMoments.includes('trio')) s.longStreak = 0
  for (const m of earnedMoments) {
    s.moments.push(m)
    steps.push({ type: 'moment', id: m })
  }

  if (isGoalReached(s, level)) {
    s.board = next
    if (s.boss && s.untouched && !s.moments.includes('flawless')) {
      s.moments.push('flawless')
      steps.push({ type: 'moment', id: 'flawless' })
    }
    return finish(s, steps, rng, nextId, 'won', word)
  }

  if (s.boss && bossDef && s.player) {
    s.boss.countdown--
    if (s.boss.countdown <= 0) {
      const attackId = nextBossAttack(s)!
      const atk = bossDef.attacks[attackId]
      const burning = next.filter((t) => t.fire).length
      const base = attackDamage(atk.damage, s.difficulty)
      const raw = base > 0 ? base + (s.equipped.includes('fireRing') ? 0 : burning * FIRE_ATTACK_BONUS) : 0
      const dealt = mitigateDamage(raw, s.equipped)
      s.player.hp = Math.max(0, s.player.hp - dealt)
      if (dealt > 0) s.untouched = false
      next = [...next]
      const affected = [
        ...(atk.fireTiles ? igniteRandom(next, rng, atk.fireTiles) : []),
        ...(atk.sootTiles ? sootRandom(next, rng, atk.sootTiles) : []),
        ...(atk.iceTiles ? freezeRandom(next, rng, atk.iceTiles) : []),
      ]
      if (atk.armor) {
        const full = armorAmount(atk.armor, s.difficulty)
        s.boss.armor = thaw ? Math.round((full * ITEM_VALUES.thawWind.armorPct) / 100) : full
      }
      if (s.boss.queuedAttack) { s.boss.queuedAttack = null; s.boss.patternIndex = 0 }
      else s.boss.patternIndex++
      s.boss.countdown = bossAttackEvery(bossDef, s.equipped)
      steps.push({ type: 'bossAttack', attackId, damage: dealt, blocked: raw - dealt, hp: s.player.hp, board: next, affectedIds: affected })
      if (raw - dealt > 0) steps.push({ type: 'item', item: 'shield', amount: raw - dealt })
      if (s.player.hp <= 0) {
        s.board = next
        return finish(s, steps, rng, nextId, 'lost', word)
      }
    }
  }

  // --- 5. Fire spreads (oldest fire first, one tile per cycle).
  const fireCells = next.map((t, i) => (t.fire ? i : -1)).filter((i) => i >= 0)
  if (fireCells.length > 0) {
    s.fireSpreadIn--
    if (s.fireSpreadIn <= 0) {
      s.fireSpreadIn = FIRE_SPREAD_EVERY
      const oldest = fireCells.sort((a, b) => next[a].id - next[b].id)[0]
      const targets = orthoNeighbours(oldest).filter((n) => isUsable(next[n]) && !next[n].fire && !next[n].special)
      if (targets.length > 0 && fireCells.length < MAX_FIRE_TILES) {
        next = [...next]
        const t = rng.pick(targets)
        next[t] = { ...next[t], fire: true }
        steps.push({ type: 'fireSpread', ids: [next[t].id], board: next })
      }
    }
  } else {
    s.fireSpreadIn = FIRE_SPREAD_EVERY
  }
  // Extinguish levels keep a minimum of burning tiles so the goal stays reachable.
  if (level.goal.kind === 'extinguish') {
    const remaining = level.goal.count - s.fireExtinguished
    const burning = next.filter((t) => t.fire).length
    const want = Math.min(2, remaining) - burning
    if (want > 0) {
      next = [...next]
      const ids = igniteRandom(next, rng, want)
      if (ids.length) steps.push({ type: 'fireSpread', ids, board: next })
    }
  }

  // --- 6. Moves.
  if (s.movesLeft !== null) {
    s.movesLeft--
    if (s.movesLeft <= 0) {
      s.board = next
      return finish(s, steps, rng, nextId, 'lost', word)
    }
  }

  // --- 7. Anti dead-end check: free, no damage, no move cost.
  const rescue = ensurePlayable(next, rng, commonOf(ctx))
  if (rescue.action !== 'none') {
    next = rescue.board
    s.rescues++
    steps.push({ type: 'rescue', action: rescue.action, board: next, changedIds: rescue.changedIds })
  }
  // --- 8. Targets: re-validated after every board change, replaced if unreachable.
  const tr = refreshTargets(next, s.targets, s.difficulty, rng, {
    solved: kind === 'target' ? word : undefined,
    avoid: s.bonus ? [s.bonus.word] : [],
    prefer: goalPreference(next, level),
    exclude: s.foundWords,
  })
  if (kind === 'target' || tr.added.length || tr.dropped.length || tr.injectedIds.length) {
    next = tr.board
    steps.push({ type: 'targets', targets: tr.targets, solved: kind === 'target' ? word : null, added: tr.added, dropped: tr.dropped, board: next, injectedIds: tr.injectedIds })
  }
  s.targets = tr.targets
  s.board = next
  s.mission = refreshMission(s, commonOf(ctx))

  // --- 9. Blitz words: keep only if still formable, maybe schedule a new one.
  if (s.bonus && !findPath(next, s.bonus.word)) {
    steps.push({ type: 'bonusResult', word: s.bonus.word, success: false })
    s.bonus = null
    s.nextBonusAt = wordIndex + 2
  }
  maybeStartBonus(s, level, rng, ctx, steps)

  s.rng = rng.state
  s.nextTileId = nextId.value
  return { ok: true, state: s, steps, word }
}

function finish(s: GameState, steps: TurnStep[], rng: Rng, nextId: { value: number }, status: 'won' | 'lost', word: string): PlayResult {
  s.status = status
  s.bonus = null
  s.rng = rng.state
  s.nextTileId = nextId.value
  steps.push({ type: 'end', status })
  return { ok: true, state: s, steps, word }
}

function maybeStartBonus(s: GameState, level: LevelDef, rng: Rng, ctx: EngineContext, steps: TurnStep[]) {
  if (!level.bonusEvents || s.bonus || s.wordsPlayed < s.nextBonusAt) return
  const candidates = commonWordsOnBoard(s.board, bonusOf(ctx)).filter((w) => !s.targets.includes(w) && !s.foundWords.includes(w))
  if (candidates.length === 0) {
    s.nextBonusAt = s.wordsPlayed + 1
    return
  }
  const word = rng.pick(candidates)
  s.bonus = { word, multiplier: BONUS_MULTIPLIER, durationMs: BONUS_DURATION_MS, msLeft: BONUS_DURATION_MS, phase: 'intro' }
  steps.push({ type: 'bonusStart', word })
}

/** Banner finished animating in: the countdown may start now. */
export function activateBonus(state: GameState): GameState {
  if (!state.bonus || state.bonus.phase !== 'intro') return state
  return { ...state, bonus: { ...state.bonus, phase: 'active' } }
}

/**
 * Advances the bonus countdown. The UI only calls this while the board is
 * idle and visible, so falls, rescues and boss attacks pause the timer.
 */
export function tickBonus(state: GameState, ms: number): GameState {
  const b = state.bonus
  if (!b || b.phase !== 'active' || state.status !== 'playing' || ms <= 0) return state
  const msLeft = b.msLeft - ms
  if (msLeft > 0) return { ...state, bonus: { ...b, msLeft } }
  // Expired: disappears without any penalty.
  return { ...state, bonus: null, nextBonusAt: state.wordsPlayed + 3 }
}
