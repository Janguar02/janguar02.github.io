// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sfx } from '../../audio/sfx'
import { createGame } from '../../game/engine'
import { levelById } from '../../game/content'
import { loadDict } from '../../game/testUtils'
import { ResultOverlay } from './ResultOverlay'
import { QuestStrip } from './QuestStrip'
import { BoardView, emptyFx } from './Board'

const level = levelById('l1')
const state = createGame(level, [], { dict: loadDict() })
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Belohnungs-UI und Eingabesicherheit', () => {
  it('skipping reveals rewards without triggering navigation or payout; star sounds are cancelled', () => {
    const star = vi.spyOn(sfx, 'star').mockImplementation(() => {})
    const onContinue = vi.fn()
    const onRetry = vi.fn()
    const onMap = vi.fn()
    const ui = render(<ResultOverlay state={{ ...state, status: 'won' }} level={level} stars={3} reward={{ coins: 85, firstClear: true, item: 'goldenAlphabet' }} onContinue={onContinue} onRetry={onRetry} onMap={onMap} />)
    fireEvent.click(ui.getByRole('button', { name: 'Überspringen' }))
    act(() => vi.advanceTimersByTime(2000))
    expect(star).not.toHaveBeenCalled()
    expect(ui.getByText('Goldenes Alphabet')).toBeTruthy()
    expect(onContinue).not.toHaveBeenCalled()
    expect(onRetry).not.toHaveBeenCalled()
    expect(onMap).not.toHaveBeenCalled()
    fireEvent.click(ui.getByRole('button', { name: 'Nächstes Level' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
  it('reduced motion starts with all rewards revealed and no delayed star sounds', () => {
    const star = vi.spyOn(sfx, 'star').mockImplementation(() => {})
    const ui = render(<ResultOverlay state={{ ...state, status: 'won' }} level={level} stars={3} reward={{ coins: 70, firstClear: false }} onContinue={() => {}} onRetry={() => {}} onMap={() => {}} reduced />)
    expect(ui.queryByRole('button', { name: 'Überspringen' })).toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(star).not.toHaveBeenCalled()
  })
  it('exposes exactly one untimed mission and an accessible energy value', () => {
    const ui = render(<QuestStrip state={{ ...state, mission: { kind: 'streak', progress: 2 }, energy: 4 }} />)
    expect(ui.getByText(/3 neue Wörter in Folge/).textContent).toContain('2/3')
    expect(ui.getByLabelText('Spezialenergie 4 von 6')).toBeTruthy()
    expect(ui.container.querySelectorAll('[title*="ohne Zeitlimit"]')).toHaveLength(1)
  })
  it('blocks rapid touch input while a chain is being resolved', () => {
    const submit = vi.fn()
    const select = vi.fn()
    const ui = render(<BoardView board={state.board} cell={40} selection={[]} selectionValid={false} fx={emptyFx()} disabled reduced onSelection={select} onSubmit={submit} />)
    const grid = ui.getByRole('grid')
    expect(grid.getAttribute('aria-busy')).toBe('true')
    for (let i = 0; i < 4; i++) {
      fireEvent.pointerDown(grid, { clientX: i * 40 + 20, clientY: 20, pointerId: 1, pointerType: 'touch' })
      fireEvent.pointerUp(grid, { clientX: i * 40 + 20, clientY: 20, pointerId: 1, pointerType: 'touch' })
    }
    expect(select).not.toHaveBeenCalled()
    expect(submit).not.toHaveBeenCalled()
  })
})
