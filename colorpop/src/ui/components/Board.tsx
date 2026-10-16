import { motion } from 'motion/react'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { colOf, isAdjacent, isUsable, rowOf } from '../../game/grid'
import { letterValue } from '../../game/letters'
import { COLS, ROWS, type Board as BoardT, type Tile } from '../../game/types'
import { BoltBadge, BombBadge, CoinBadge } from '../art/Icons'

export interface TileFx {
  popping: Set<number>
  zapped: Set<number>
  magic: Set<number>
  ignite: Set<number>
  hint: Set<number>
  /** Path order of popping tiles → staggered burst. */
  popOrder: Map<number, number>
}

export const emptyFx = (): TileFx => ({ popping: new Set(), zapped: new Set(), magic: new Set(), ignite: new Set(), hint: new Set(), popOrder: new Map() })

interface Props {
  board: BoardT
  cell: number
  selection: number[]
  selectionValid: boolean
  fx: TileFx
  disabled: boolean
  reduced: boolean
  onSelection: (sel: number[]) => void
  onSubmit: (sel: number[]) => void
  onInvalidTouch?: () => void
}

const Flame = () => (
  <svg className="flame" viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden>
    <path d="M0 40 C4 28 10 30 12 20 C16 28 20 26 22 14 C27 24 30 22 31 8 C35 22 40 24 42 14 C45 26 50 26 50 18 C54 28 58 30 60 40 Z" fill="#FF7A2E" opacity="0.9" />
    <path d="M6 40 C10 32 14 33 16 27 C19 33 23 32 25 23 C28 31 32 31 34 22 C37 31 41 32 44 26 C47 33 51 33 54 40 Z" fill="#FFD23F" />
  </svg>
)

const SootOverlay = () => (
  <svg className="overlay-soot" viewBox="0 0 60 60" aria-hidden>
    <g fill="#2E2340" opacity="0.55">
      <circle cx="18" cy="22" r="13" />
      <circle cx="36" cy="18" r="15" />
      <circle cx="44" cy="36" r="13" />
      <circle cx="22" cy="40" r="12" />
    </g>
    <g fill="#fff" opacity="0.18">
      <circle cx="30" cy="14" r="5" />
      <circle cx="14" cy="20" r="3" />
    </g>
  </svg>
)

const IceOverlay = () => (
  <svg className="overlay-ice" viewBox="0 0 60 60" aria-hidden>
    <path d="M4 18 L18 4 L42 4 L56 18 L56 42 L42 56 L18 56 L4 42 Z" fill="#DDF4FF" opacity="0.38" stroke="#fff" strokeWidth="2" />
    <path d="M10 14 L24 8 M8 24 L20 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    <path d="M40 50 L52 38" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
  </svg>
)

const TileView = memo(function TileView({
  tile,
  cell,
  x,
  y,
  fromY,
  delay,
  reduced,
  cls,
  popDelay,
  landKey,
  landDelay,
}: {
  tile: Tile
  cell: number
  x: number
  y: number
  fromY: number | null
  delay: number
  reduced: boolean
  cls: string
  popDelay: number
  landKey: number
  landDelay: number | null
}) {
  const v = letterValue(tile.letter)
  return (
    <motion.div
      className={`tile ${cls}`}
      initial={fromY === null ? false : { x, y: fromY, opacity: 0.2 }}
      animate={{ x, y, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0.08 }
          : { x: { type: 'spring', stiffness: 380, damping: 30 }, y: { type: 'spring', stiffness: 430, damping: 27, mass: 0.9, delay }, opacity: { duration: 0.15, delay } }
      }
      data-tile-id={tile.id}
      data-letter={tile.letter}
      data-blocker={tile.blocker ?? ''}
      data-special={tile.special ?? ''}
    >
      <div
        key={landKey}
        className={`tile-body${landDelay !== null && !reduced ? ' is-land' : ''}`}
        style={{ ['--pop-delay' as string]: `${popDelay}ms`, ['--land-delay' as string]: `${landDelay ?? 0}s` }}
      >
        {tile.fire && <Flame />}
        <span className="tile-letter">{tile.letter}</span>
        {v > 1 && !tile.blocker && (
          <span className="tile-value" data-v={v}>
            {v}
          </span>
        )}
        {tile.blocker === 'soot' && <SootOverlay />}
        {tile.blocker === 'ice' && <IceOverlay />}
        {tile.special && (
          <span className="absolute grid place-items-center" style={{ left: '6%', top: '6%' }}>
            {tile.special === 'lightning' && <BoltBadge size={cell * 0.3} />}
            {tile.special === 'bomb' && <BombBadge size={cell * 0.3} />}
            {tile.special === 'gold' && <CoinBadge size={cell * 0.28} />}
          </span>
        )}
      </div>
    </motion.div>
  )
})

/**
 * The 6×6 board. Supports drag-to-connect (touch & mouse) and tap-to-build:
 * tap tiles one by one, tap the last tile again to submit.
 */
export function BoardView({ board, cell, selection, selectionValid, fx, disabled, reduced, onSelection, onSubmit, onInvalidTouch }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const prevIds = useRef<Set<number> | null>(null)
  const prevRow = useRef<Map<number, number>>(new Map())
  // Landing animations stay "sticky" for a moment so unrelated re-renders don't cut them.
  const landing = useRef<Map<number, { row: number; delay: number; until: number }>>(new Map())
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ active: boolean; extended: boolean; pointerId: number; startCell: number; startedNew: boolean }>({
    active: false,
    extended: false,
    pointerId: -1,
    startCell: -1,
    startedNew: false,
  })
  // Authoritative within a gesture: updated synchronously so rapid pointer
  // events between renders never act on a stale selection.
  const selRef = useRef(selection)
  const lastProp = useRef(selection)
  if (lastProp.current !== selection) {
    lastProp.current = selection
    selRef.current = selection
  }
  const select = (next: number[]) => {
    selRef.current = next
    onSelection(next)
  }

  // Entry offsets for freshly spawned tiles (they fall in from above).
  const entering = new Map<number, { fromY: number; delay: number }>()
  const firstMount = prevIds.current === null
  const perColNew = new Map<number, number>()
  board.forEach((t, i) => {
    if (firstMount || !prevIds.current!.has(t.id)) perColNew.set(colOf(i), (perColNew.get(colOf(i)) ?? 0) + 1)
  })
  board.forEach((t, i) => {
    if (firstMount || !prevIds.current!.has(t.id)) {
      const n = perColNew.get(colOf(i)) ?? 1
      entering.set(t.id, {
        fromY: (rowOf(i) - n) * cell - cell * 0.6,
        delay: firstMount ? colOf(i) * 0.04 + (ROWS - rowOf(i)) * 0.03 : 0.05 + (ROWS - rowOf(i)) * 0.015,
      })
    }
  })
  useLayoutEffect(() => {
    prevIds.current = new Set(board.map((t) => t.id))
    prevRow.current = new Map(board.map((t, i) => [t.id, rowOf(i)]))
  }, [board])

  const cellAt = useCallback(
    (clientX: number, clientY: number, strict: boolean): number => {
      const el = rootRef.current
      if (!el) return -1
      const r = el.getBoundingClientRect()
      const x = clientX - r.left
      const y = clientY - r.top
      const c = Math.floor(x / cell)
      const rr = Math.floor(y / cell)
      if (c < 0 || c >= COLS || rr < 0 || rr >= ROWS) return -1
      if (strict) {
        // Use a circular hit area so diagonal swipes don't clip neighbours.
        const cx = (c + 0.5) * cell
        const cy = (rr + 0.5) * cell
        if (Math.hypot(x - cx, y - cy) > cell * 0.43) return -1
      }
      return rr * COLS + c
    },
    [cell],
  )

  const localPoint = (clientX: number, clientY: number) => {
    const r = rootRef.current!.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return
    const i = cellAt(e.clientX, e.clientY, false)
    if (i < 0) return
    e.preventDefault()
    try {
      rootRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone – the gesture still works without capture */
    }
    const sel = selRef.current
    const tile = board[i]
    if (!isUsable(tile)) {
      onInvalidTouch?.()
      return
    }
    let next: number[]
    const last = sel[sel.length - 1]
    if (sel.length && i === last) {
      // Tap on the last tile again → submit (tap mode).
      drag.current = { active: true, extended: false, pointerId: e.pointerId, startCell: i, startedNew: false }
      setPointer(localPoint(e.clientX, e.clientY))
      return
    } else if (sel.length >= 2 && i === sel[sel.length - 2]) {
      next = sel.slice(0, -1)
    } else if (sel.length && isAdjacent(last, i) && !sel.includes(i)) {
      next = [...sel, i]
    } else {
      next = [i]
    }
    // startedNew = this press changed the selection, so releasing must not submit.
    drag.current = { active: true, extended: false, pointerId: e.pointerId, startCell: i, startedNew: true }
    setPointer(localPoint(e.clientX, e.clientY))
    select(next)
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active || e.pointerId !== d.pointerId || disabled) return
    setPointer(localPoint(e.clientX, e.clientY))
    const i = cellAt(e.clientX, e.clientY, true)
    if (i < 0) return
    const sel = selRef.current
    const last = sel[sel.length - 1]
    if (i === last) return
    if (sel.length >= 2 && i === sel[sel.length - 2]) {
      d.extended = true
      select(sel.slice(0, -1))
      return
    }
    if (!sel.includes(i) && isAdjacent(last, i) && isUsable(board[i])) {
      d.extended = true
      select([...sel, i])
    }
  }

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active || e.pointerId !== d.pointerId) return
    d.active = false
    setPointer(null)
    const sel = selRef.current
    if (disabled) return
    const tappedLastAgain = !d.extended && !d.startedNew && sel.length && sel[sel.length - 1] === d.startCell && cellAt(e.clientX, e.clientY, false) === d.startCell
    if (d.extended || tappedLastAgain) {
      if (sel.length >= 3) onSubmit(sel)
      else if (d.extended) select([])
    }
    // pure taps keep the selection so players can build words tile by tile
  }

  const onCancel = () => {
    drag.current.active = false
    setPointer(null)
  }

  // Clear selection if the board becomes disabled mid-gesture.
  useEffect(() => {
    if (disabled) {
      drag.current.active = false
      setPointer(null)
    }
  }, [disabled])

  const sel = new Set(selection)
  const pts = selection.map((i) => [(colOf(i) + 0.5) * cell, (rowOf(i) + 0.5) * cell - cell * 0.04])
  const tail = pointer && pts.length && drag.current.active ? [pointer.x, pointer.y] : null
  const lineColor = selectionValid ? '#2FCF8F' : '#FFB21E'

  return (
    <div
      ref={rootRef}
      className="relative touch-none"
      style={{ width: cell * COLS, height: cell * ROWS, ['--cell' as string]: `${cell}px` }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      onContextMenu={(e) => e.preventDefault()}
      role="grid"
      aria-label="Buchstabenfeld"
      aria-busy={disabled}
    >
      {/* sockets */}
      <div className="absolute inset-0" aria-hidden>
        {board.map((_, i) => (
          <div
            key={i}
            className="absolute rounded-[26%]"
            style={{
              left: colOf(i) * cell + cell * 0.06,
              top: rowOf(i) * cell + cell * 0.1,
              width: cell * 0.88,
              height: cell * 0.86,
              background: 'rgba(20,8,50,0.28)',
            }}
          />
        ))}
      </div>
      {board.map((t, i) => {
        const cls = [
          sel.has(i) ? (selectionValid ? 'is-selected is-valid' : 'is-selected') : '',
          t.special ? `sp-${t.special}` : '',
          t.fire ? 'is-fire' : '',
          t.blocker ? `is-${t.blocker} is-blocked` : '',
          fx.popping.has(t.id) ? 'is-popping' : '',
          fx.zapped.has(t.id) ? 'is-zapped' : '',
          fx.magic.has(t.id) ? 'is-magic' : '',
          fx.ignite.has(t.id) ? 'is-ignite' : '',
          fx.hint.has(t.id) && !sel.has(i) ? 'is-hint' : '',
        ].join(' ')
        const ent = entering.get(t.id)
        const was = prevRow.current.get(t.id)
        const busyFx = fx.popping.has(t.id) || fx.zapped.has(t.id) || fx.magic.has(t.id) || fx.ignite.has(t.id)
        // Tiles that just fell (or spawned) settle with a squash once they land.
        const now = performance.now()
        if (ent || (was !== undefined && was < rowOf(i))) {
          const prevLand = landing.current.get(t.id)
          if (!prevLand || prevLand.row !== rowOf(i)) landing.current.set(t.id, { row: rowOf(i), delay: ent ? ent.delay + 0.26 : 0.2, until: now + 1200 })
        }
        const land = landing.current.get(t.id)
        const landDelay = !busyFx && land && land.row === rowOf(i) && land.until > now ? land.delay : null
        return (
          <TileView
            key={t.id}
            tile={t}
            cell={cell}
            x={colOf(i) * cell}
            y={rowOf(i) * cell}
            fromY={ent ? ent.fromY : null}
            delay={ent ? ent.delay : 0}
            reduced={reduced}
            cls={cls}
            popDelay={(fx.popOrder.get(t.id) ?? 0) * 45}
            landKey={rowOf(i)}
            landDelay={landDelay}
          />
        )
      })}
      {/* connection line */}
      {pts.length > 0 && (
        <svg className="pointer-events-none absolute inset-0" width={cell * COLS} height={cell * ROWS} style={{ overflow: 'visible' }} aria-hidden>
          <polyline
            points={[...pts, ...(tail ? [tail] : [])].map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke="#3B2160"
            strokeOpacity="0.22"
            strokeWidth={cell * 0.16}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={[...pts, ...(tail ? [tail] : [])].map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke={lineColor}
            strokeOpacity="0.55"
            strokeWidth={cell * 0.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
