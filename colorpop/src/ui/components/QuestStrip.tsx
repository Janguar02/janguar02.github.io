import { ENERGY_LIMIT, MISSION_COINS, MISSION_LABELS } from '../../game/missions'
import type { GameState } from '../../game/types'

/** One optional challenge; fixed height keeps the board still on replacement. */
export function QuestStrip({ state, notice }: { state: GameState; notice?: string | null }) {
  return <div className="quest-strip" aria-label="Zusatzmission und Spezialenergie">
    <div className="min-w-0 flex-1 truncate" aria-live="polite" title={notice ?? (state.mission ? `${MISSION_LABELS[state.mission.kind]} · +${MISSION_COINS} Münzen, ohne Zeitlimit` : 'Die nächste Mission erscheint in wenigen Wörtern.')}>
      <span className="quest-caption">EXTRA </span>
      {notice ? <span className="text-[#FFE39A]">{notice}</span> : state.mission ? <>{MISSION_LABELS[state.mission.kind]}{state.mission.kind === 'streak' && ` ${state.mission.progress}/3`} <span className="text-[#FFE39A]">+{MISSION_COINS}</span></> : 'Missionen geschafft: ' + state.missionsCompleted}
    </div>
    <div className="shrink-0" title="Lange/seltene Wörter: +2 Energie. Jede dritte Combo-Stufe: +1. Bei 6 entsteht ein Blitzstein." aria-label={`Spezialenergie ${state.energy} von ${ENERGY_LIMIT}`}>
      <span className="quest-caption">BLITZ </span>{state.energy}/{ENERGY_LIMIT}
      <span className="energy-track"><span style={{ width: `${state.energy / ENERGY_LIMIT * 100}%` }} /></span>
    </div>
  </div>
}
