import { AnimatePresence, motion } from 'motion/react'
import { comboMultiplier } from '../../game/content'

/**
 * Visible target words. While the player drags, the letters already matched
 * by the current selection light up, so targets guide without solving.
 */
export function TargetBar({ targets, current, solved }: { targets: string[]; current: string; solved: string | null }) {
  return (
    <div className="flex h-[40px] w-full items-center justify-center gap-2" aria-label="Zielwörter">
      <span className="mr-0.5 hidden font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 min-[380px]:inline">Ziele</span>
      <AnimatePresence mode="popLayout" initial={false}>
        {targets.map((w) => {
          const match = current.length > 0 && w.startsWith(current) ? current.length : 0
          const done = solved === w
          return (
            <motion.div
              key={w}
              data-target={w}
              layout
              className="flex h-[34px] items-center gap-[3px] rounded-xl px-1.5"
              style={{
                background: done ? 'linear-gradient(180deg,#8FFFC4,#2FCF8F)' : match ? 'linear-gradient(180deg,#FFF6CF,#FFE07A)' : 'linear-gradient(180deg,#FFFDF6,#EFE2C9)',
                boxShadow: '0 0 0 2.5px #3B2160, 0 3px 0 2.5px rgba(30,10,60,.35)',
              }}
              initial={{ scale: 0.3, opacity: 0, y: -12 }}
              animate={{ scale: match === w.length ? 1.08 : 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.35, opacity: 0, y: -26, transition: { duration: 0.35 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              {[...w].map((ch, i) => (
                <span
                  key={i}
                  className="grid h-[24px] w-[19px] place-items-center rounded-[6px] font-display text-[15px] font-bold leading-none"
                  style={{
                    background: i < match ? '#FFC02E' : 'rgba(59,33,96,.08)',
                    color: i < match ? '#5A2A00' : '#3B2160',
                    transition: 'background .12s',
                  }}
                >
                  {ch}
                </span>
              ))}
              {done && <span className="ml-0.5 font-display text-base font-bold text-[#064a2c]">✓</span>}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/** Combo meter: grows with consecutive target/secret words. */
export function ComboMeter({ combo }: { combo: number }) {
  const mult = comboMultiplier(combo)
  const active = mult > 1
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="combo"
          className="pointer-events-none absolute -top-3 left-0 z-30"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -6 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        >
          <motion.div
            key={combo}
            className="rounded-xl px-2 py-0.5 text-center"
            style={{
              background: combo >= 6 ? 'linear-gradient(180deg,#FFE36B,#FF7A2E)' : 'linear-gradient(180deg,#FF9EC0,#F2496B)',
              boxShadow: '0 0 0 2.5px #3B2160, 0 3px 0 2.5px rgba(30,10,60,.35)',
            }}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 14 }}
          >
            <div className="text-pop-sm text-[11px] uppercase leading-none tracking-wider">Combo {combo}</div>
            <div className="text-pop text-[19px] leading-none">×{mult.toFixed(1).replace('.', ',')}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
