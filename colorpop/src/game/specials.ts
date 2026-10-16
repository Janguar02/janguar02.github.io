import { neighbours, orthoNeighbours, rowOf } from './grid'
import { COLS, ROWS, type Board, type SpecialKind } from './types'

/** Shared by the turn resolver and live preview. Each special fires at most once. */
export function resolveSpecials(board: Board, path: readonly number[], opts: { diagonalThaw?: boolean } = {}) {
  const fusion = path.some(i => board[i].special === 'bomb') && path.some(i => board[i].special === 'lightning')
  const cleared = new Set<number>(path)
  const triggered: { id: number; kind: SpecialKind; cell: number }[] = []
  const unblocked = new Set<number>()
  const queue = path.filter(i => board[i].special === 'bomb' || board[i].special === 'lightning')
  const activated = new Set<number>()
  while (queue.length) {
    const cell = queue.shift()!
    if (activated.has(cell)) continue
    activated.add(cell)
    const kind = board[cell].special as SpecialKind
    triggered.push({ id: board[cell].id, kind, cell })
    const targets = kind === 'bomb' ? neighbours(cell) : Array.from({ length: COLS }, (_, c) => rowOf(cell) * COLS + c).filter(i => i !== cell)
    // Fusion requires both specials in the submitted word, never an incidental chain.
    if (fusion && kind === 'lightning') for (let r = 0; r < ROWS; r++) targets.push(r * COLS + cell % COLS)
    for (const t of targets) {
      if (board[t].blocker) { unblocked.add(t); continue }
      if (cleared.has(t)) continue
      cleared.add(t)
      if (board[t].special === 'bomb' || board[t].special === 'lightning') queue.push(t)
    }
  }
  for (const c of cleared) for (const n of orthoNeighbours(c)) if (!cleared.has(n) && board[n].blocker) unblocked.add(n)
  // Tauwind: the word itself also thaws diagonal neighbours.
  if (opts.diagonalThaw) for (const c of path) for (const n of neighbours(c)) if (!cleared.has(n) && board[n].blocker) unblocked.add(n)
  return { fusion, cleared, triggered, unblocked }
}
