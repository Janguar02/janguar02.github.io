// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { boardFrom } from '../../game/testUtils'
import { BoardView, emptyFx } from './Board'

const CELL = 50
const at = (i: number) => ({ clientX: (i % 6 + 0.5) * CELL, clientY: (Math.floor(i / 6) + 0.5) * CELL, pointerId: 1 })

function Harness({ onSubmit, blocked }: { onSubmit: (p: number[]) => void; blocked?: number }) {
  const [sel, setSel] = useState<number[]>([])
  const board = boardFrom(['HAUSXX', 'ROTXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'], blocked !== undefined ? { [blocked]: { blocker: 'ice' } } : {})
  return (
    <>
      <BoardView
        board={board}
        cell={CELL}
        selection={sel}
        selectionValid={false}
        fx={emptyFx()}
        disabled={false}
        reduced
        onSelection={setSel}
        onSubmit={(p) => {
          onSubmit(p)
          setSel([])
        }}
      />
      <output data-testid="sel">{sel.join(',')}</output>
    </>
  )
}

function setup(blocked?: number) {
  const onSubmit = vi.fn()
  const utils = render(<Harness onSubmit={onSubmit} blocked={blocked} />)
  const grid = utils.getByRole('grid')
  // jsdom has no layout: the grid sits at (0,0)
  grid.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 300, width: 300, height: 300, x: 0, y: 0, toJSON: () => ({}) })
  grid.setPointerCapture = () => {}
  const sel = () => utils.getByTestId('sel').textContent
  return { grid, onSubmit, sel }
}

afterEach(cleanup)

describe('Spielfeld-Eingabe (Touch & Maus)', () => {
  it('Ziehen verbindet benachbarte Steine und sendet beim Loslassen', () => {
    const { grid, onSubmit } = setup()
    act(() => {
      fireEvent.pointerDown(grid, at(0))
      fireEvent.pointerMove(grid, at(1))
      fireEvent.pointerMove(grid, at(2))
      fireEvent.pointerMove(grid, at(3))
      fireEvent.pointerUp(grid, at(3))
    })
    expect(onSubmit).toHaveBeenCalledWith([0, 1, 2, 3])
  })

  it('diagonal ziehen funktioniert, Nicht-Nachbarn werden ignoriert', () => {
    const { grid, onSubmit } = setup()
    act(() => {
      fireEvent.pointerDown(grid, at(6)) // R
      fireEvent.pointerMove(grid, at(1)) // A diagonal
      fireEvent.pointerMove(grid, at(3)) // not adjacent → ignored
      fireEvent.pointerMove(grid, at(2)) // U adjacent to A
      fireEvent.pointerUp(grid, at(2))
    })
    expect(onSubmit).toHaveBeenCalledWith([6, 1, 2])
  })

  it('Zurückziehen auf den vorletzten Stein entfernt den letzten (keine Doppelnutzung)', () => {
    const { grid, sel } = setup()
    act(() => {
      fireEvent.pointerDown(grid, at(0))
      fireEvent.pointerMove(grid, at(1))
      fireEvent.pointerMove(grid, at(2))
      fireEvent.pointerMove(grid, at(1))
    })
    expect(sel()).toBe('0,1')
    act(() => {
      fireEvent.pointerMove(grid, at(0)) // back again
      fireEvent.pointerMove(grid, at(1))
      fireEvent.pointerMove(grid, at(0))
    })
    expect(sel()).toBe('0')
  })

  it('zu kurze Wege werden nicht gesendet', () => {
    const { grid, onSubmit, sel } = setup()
    act(() => {
      fireEvent.pointerDown(grid, at(0))
      fireEvent.pointerMove(grid, at(1))
      fireEvent.pointerUp(grid, at(1))
    })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(sel()).toBe('')
  })

  it('Tipp-Modus: Steine einzeln antippen, letzten erneut tippen sendet', () => {
    const { grid, onSubmit, sel } = setup()
    for (const i of [0, 1, 2]) {
      act(() => {
        fireEvent.pointerDown(grid, at(i))
        fireEvent.pointerUp(grid, at(i))
      })
    }
    expect(sel()).toBe('0,1,2')
    act(() => {
      fireEvent.pointerDown(grid, at(2))
      fireEvent.pointerUp(grid, at(2))
    })
    expect(onSubmit).toHaveBeenCalledWith([0, 1, 2])
  })

  it('blockierte Steine sind nicht wählbar', () => {
    const { grid, sel } = setup(1)
    act(() => {
      fireEvent.pointerDown(grid, at(0))
      fireEvent.pointerMove(grid, at(1))
    })
    expect(sel()).toBe('0')
  })
})
