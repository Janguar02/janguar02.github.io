import { useApp } from '../../app/AppContext'
import { sfx } from '../../audio/sfx'
import { DIFFICULTIES } from '../../game/content'
import type { Difficulty } from '../../game/types'

const ORDER: Difficulty[] = ['relaxed', 'normal', 'expert']
const ACCENT: Record<Difficulty, [string, string, string]> = {
  relaxed: ['#7DF2B7', '#22C27C', '#128556'],
  normal: ['#A58BFF', '#6C4BEF', '#4123B0'],
  expert: ['#FF9EB0', '#F2496B', '#B3213F'],
}

/** Mode selector – stored in settings, applied when a level starts. */
export function DifficultyPicker({ compact = false }: { compact?: boolean }) {
  const { save, updateSave } = useApp()
  const value = save.settings.difficulty
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#3B2160]/10 p-1.5" role="radiogroup" aria-label="Schwierigkeit">
        {ORDER.map((d) => {
          const on = d === value
          const [top, bot, edge] = ACCENT[d]
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                sfx.click()
                updateSave((s) => ({ ...s, settings: { ...s.settings, difficulty: d } }))
              }}
              className="min-h-[44px] rounded-xl font-display text-[15px] font-semibold transition"
              style={on ? { background: `linear-gradient(180deg,${top},${bot})`, color: '#fff', boxShadow: `inset 0 -4px 0 ${edge}, 0 0 0 2.5px #3B2160`, textShadow: '0 1px 0 rgba(0,0,0,.2)' } : { color: '#5b4a7c' }}
            >
              {DIFFICULTIES[d].label}
            </button>
          )
        })}
      </div>
      {!compact && <p className="mt-1.5 text-center text-[12.5px] font-bold text-[#6a5a8c]">{DIFFICULTIES[value].description}</p>}
    </div>
  )
}
