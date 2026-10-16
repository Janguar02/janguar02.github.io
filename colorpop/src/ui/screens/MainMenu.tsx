import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useApp } from '../../app/AppContext'
import { levelById } from '../../game/content'
import { levelFromXp, totalStars } from '../../game/progression'
import { loadRun } from '../../game/save'
import { Backdrop } from '../art/Backdrop'
import { Brutzel } from '../art/Brutzel'
import { BagIcon, GearIcon, PlayIcon, StarIcon } from '../art/Icons'
import { Logo } from '../art/Logo'
import { Bar, Btn, CoinPill } from '../components/Common'

export function MainMenu() {
  const { save, go, storage, screen } = useApp()
  const run = useMemo(() => loadRun(storage), [storage, screen])
  const runLevel = run ? levelById(run.levelId) : null
  const player = levelFromXp(save.xp)
  const stars = totalStars(save.levels)

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col items-center px-5 pb-8 pt-[max(12px,env(safe-area-inset-top))]">
      <Backdrop theme="menu" />
      <div className="relative z-10 flex w-full items-center justify-between gap-2">
        <Btn variant="cream" size="round" onClick={() => go({ name: 'settings', back: { name: 'menu' } })} label="Einstellungen">
          <GearIcon size={24} className="text-[#A58BFF]" />
        </Btn>
        <div className="panel-dark flex h-11 min-w-0 flex-1 items-center gap-2 px-2" aria-label={`Spielerlevel ${player.level}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFD23F] font-display text-base font-bold text-[#3B2160] shadow-[0_0_0_2px_#3B2160]">{player.level}</span>
          <div className="min-w-0 flex-1">
            <Bar value={player.into} max={player.need} colors={['#C4B2FF', '#6C4BEF']} height={9} trail={false} />
          </div>
          <span className="flex shrink-0 items-center gap-0.5 font-display text-sm font-bold text-white">
            <StarIcon size={17} />
            {stars.have}
          </span>
        </div>
        <CoinPill coins={save.coins} />
      </div>

      <motion.div className="relative z-10 mt-[6vh]" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <Logo size={56} />
      </motion.div>

      <motion.p
        className="relative z-10 mt-5 max-w-[300px] text-center font-display text-[17px] font-semibold leading-snug text-white/90"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        Verbinde Buchstaben, lass Wörter platzen und besiege den frechen Glutkobold!
      </motion.p>

      <motion.div
        className="relative z-10 mt-auto flex w-full max-w-[320px] flex-col gap-3 pt-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 22 }}
      >
        {run && runLevel && (
          <Btn variant="blue" onClick={() => go({ name: 'game', levelId: run.levelId, resume: run, key: Date.now() })}>
            <PlayIcon size={22} />
            <span className="flex flex-col items-start leading-none">
              <span>Fortsetzen</span>
              <span className="mt-0.5 text-[12px] font-semibold opacity-85">{runLevel.name}</span>
            </span>
          </Btn>
        )}
        <Btn variant="green" className="!min-h-[68px] !text-[1.6rem]" onClick={() => go({ name: 'map' })}>
          <PlayIcon size={26} /> Spielen
        </Btn>
        <Btn variant="grape" onClick={() => go({ name: 'inventory', back: { name: 'menu' } })}>
          <BagIcon size={26} /> Ausrüstung
        </Btn>
      </motion.div>

      {/* Brutzel peeking from the corner */}
      <motion.div
        className="pointer-events-none fixed -right-6 bottom-[22vh] z-0 hidden min-[360px]:block"
        initial={{ x: 120, rotate: 20 }}
        animate={{ x: 0, rotate: -12 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 120, damping: 12 }}
      >
        <div className="anim-bob">
          <Brutzel mood="idle" size={110} />
        </div>
      </motion.div>

      <div className="relative z-10 mt-6 text-center text-[11px] font-bold text-white/50">Color Pop Quest · Vertical Slice v0.1</div>
    </div>
  )
}
