import { motion } from 'motion/react'
import { WORD_REWARDS } from '../../game/content'
import type { BonusEvent } from '../../game/types'

/**
 * Blitzleiste – optional timed challenge. The energy bar only drains while
 * phase === 'active' and the board is idle (the engine/timer guarantee that).
 */
export function BonusBanner({ bonus, paused, boss }: { bonus: BonusEvent; paused: boolean; boss: boolean }) {
  const pct = Math.max(0, Math.min(1, bonus.msLeft / bonus.durationMs))
  const secs = Math.ceil(bonus.msLeft / 1000)
  const low = bonus.phase === 'active' && secs <= 3
  return (
    <motion.div
      className="pointer-events-none w-full"
      initial={{ y: -24, opacity: 0, scaleX: 0.6 }}
      animate={{ y: 0, opacity: 1, scaleX: 1 }}
      exit={{ y: -16, opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      role="status"
      aria-label={`Blitzwort: ${bonus.word}, ${secs} Sekunden`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl ${low ? 'anim-pulse' : ''}`}
        style={{
          background: 'linear-gradient(100deg,#2A1670 0%,#4B2BD0 48%,#7A4BFF 100%)',
          boxShadow: '0 0 0 3px #3B2160, 0 5px 0 3px rgba(30,10,60,.35), 0 0 26px rgba(150,110,255,.55)',
        }}
      >
        {/* electric shimmer */}
        <div className="blitz-shimmer absolute inset-0" />
        <div className="relative flex items-center gap-2.5 px-2.5 pb-2 pt-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFE36B] shadow-[0_0_0_2.5px_#3B2160,0_0_14px_#FFE36B]">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M14 1 L4 14 H11 L9 23 L20 9 H13 Z" fill="#3B2160" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFE36B]">Blitzwort</span>
              {paused && bonus.phase === 'active' && <span className="text-[10.5px] font-extrabold uppercase text-white/60">pausiert</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white px-1.5 font-display text-[18px] font-bold tracking-[0.12em] text-[#3B2160]">{bonus.word}</span>
              <span className="truncate text-[11.5px] font-extrabold text-white/85">
                {bonus.multiplier}× Kraft · +{WORD_REWARDS.blitzCoins} Münzen{boss ? ' · betäubt' : ''}
              </span>
            </div>
          </div>
          <div className="w-9 shrink-0 text-center">
            <span className="text-pop text-[24px] leading-none" style={low ? { ['--stroke' as string]: '#A8173F' } : undefined}>
              {bonus.phase === 'intro' ? '!' : secs}
            </span>
          </div>
        </div>
        {/* energy bar */}
        <div className="absolute inset-x-0 bottom-0 h-[5px] bg-black/30">
          <div
            className="h-full"
            style={{
              width: `${pct * 100}%`,
              background: low ? 'linear-gradient(90deg,#FF8CA0,#FFE36B)' : 'linear-gradient(90deg,#FFE36B,#FFFFFF)',
              boxShadow: '0 0 10px #FFE36B',
              transition: 'width .12s linear',
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}
