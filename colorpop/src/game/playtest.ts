import { makeTile } from './grid'
import { withValidTargets } from './engine'
import type { GameState } from './types'

/** Reproducible UI fixtures, reachable only from the DEV branch in GameScreen. */
export function applyPlaytestScenario(state: GameState, scenario: string | null): GameState {
  if (scenario !== 'master' && scenario !== 'chain') return state
  const letters = scenario === 'master'
    ? ['SCHNEC', 'ROTEKA', 'HAUSEN', 'GARTEN', 'BLUMEN', 'REISEN']
    : ['HAUSEN', 'ROTENS', 'BLUMEN', 'GARTEN', 'SEILEN', 'REISEN']
  const board = [...letters.join('')].map((letter, i) => makeTile(i + 1, letter,
    scenario === 'chain' && i < 2 ? { special: i === 0 ? 'bomb' : 'lightning' } : {}))
  return withValidTargets({ ...state, board, targets: [], nextTileId: 1000 })
}
