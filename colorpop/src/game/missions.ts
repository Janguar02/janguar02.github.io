import { COMMON_WORDS } from './data/commonWords'
import { commonWordsOnBoard, findPath } from './solver'
import type { Board, GameState, MissionKind, Tile, WordMission } from './types'

export const MISSION_COINS = 6
export const ENERGY_LIMIT = 6
export const MISSION_LABELS: Record<MissionKind, string> = {
  long: 'Wort ab 5 Buchstaben', gold: 'Ein Wort mit Gold',
  fire: 'Ein Wort mit Feuer', vowels: '2 verschiedene Vokale', streak: '3 neue Wörter in Folge',
}
export function matchesMission(kind: MissionKind, word: string, tiles: readonly Tile[]): boolean {
  switch (kind) {
    case 'long': return word.length >= 5
    case 'gold': return tiles.some(t => t.special === 'gold')
    case 'fire': return tiles.some(t => t.fire)
    case 'vowels': return new Set([...word].filter(c => 'AEIOUÄÖÜ'.includes(c))).size >= 2
    case 'streak': return true
  }
}

/** Only offer goals with a concrete, usable path. Never writes letters or spends RNG. */
export function validMissionKinds(state: GameState, common: readonly string[] = COMMON_WORDS): MissionKind[] {
  const candidates = commonWordsOnBoard(state.board, common).filter(w => !state.foundWords.includes(w))
  const kinds: MissionKind[] = ['long', 'gold', 'fire', 'vowels', 'streak']
  return kinds.filter(kind => kind === 'streak'
    ? candidates.length >= 3 && (state.movesLeft === null || state.movesLeft >= 3)
    : candidates.some(w => {
      const p = findPath(state.board, w)
      return p && matchesMission(kind, w, p.map(i => state.board[i]))
    }))
}

/** Called after rescue AND target correction. Unreachable missions disappear without penalty. */
export function refreshMission(state: GameState, common?: readonly string[]): WordMission | null {
  if (state.status !== 'playing') return null
  if (!state.mission && state.wordsPlayed < state.nextMissionAt) return null
  const kinds = validMissionKinds(state, common)
  if (state.mission && (state.mission.kind === 'streak'
    ? (state.movesLeft === null || state.movesLeft >= 3 - state.mission.progress) && commonWordsOnBoard(state.board, common ?? COMMON_WORDS).some(w => !state.foundWords.includes(w))
    : kinds.includes(state.mission.kind))) return state.mission
  if (state.wordsPlayed < state.nextMissionAt || !kinds.length) return null
  // Rotate by completed mission count, with board-specific fire/gold challenges first.
  const order: MissionKind[] = ['fire', 'gold', ...kinds.filter(k => k !== 'fire' && k !== 'gold')]
  const available = order.filter(k => kinds.includes(k))
  return { kind: available[state.missionsCompleted % available.length], progress: 0 }
}

export function advanceMission(mission: WordMission | null, word: string, tiles: Board, fresh: boolean): { mission: WordMission | null; completed: boolean } {
  if (!mission) return { mission, completed: false }
  const progress = fresh && matchesMission(mission.kind, word, tiles) ? mission.progress + 1 : mission.kind === 'streak' ? 0 : mission.progress
  const completed = progress >= (mission.kind === 'streak' ? 3 : 1)
  return { mission: completed ? null : { ...mission, progress }, completed }
}
