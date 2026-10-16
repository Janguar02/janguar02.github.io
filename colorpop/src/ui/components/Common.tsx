import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sfx } from '../../audio/sfx'
import { BackIcon, CoinIcon, StarIcon } from '../art/Icons'

type BtnVariant = 'yellow' | 'green' | 'blue' | 'grape' | 'berry' | 'cream'

export function Btn({
  variant = 'yellow',
  size,
  className = '',
  onClick,
  children,
  disabled,
  label,
  silent,
}: {
  variant?: BtnVariant
  size?: 'sm' | 'round'
  className?: string
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
  label?: string
  silent?: boolean
}) {
  const v = variant === 'yellow' ? '' : `btn-${variant}`
  const s = size ? `btn-${size}` : ''
  return (
    <button
      type="button"
      className={`btn ${v} ${s} ${className}`}
      disabled={disabled}
      aria-label={label}
      onPointerDown={() => sfx.unlock()}
      onClick={() => {
        if (!silent) sfx.click()
        onClick?.()
      }}
    >
      {children}
    </button>
  )
}

export function BackButton({ onClick, label = 'Zurück' }: { onClick: () => void; label?: string }) {
  return (
    <Btn variant="cream" size="round" onClick={onClick} label={label}>
      <BackIcon size={24} />
    </Btn>
  )
}

/** Animated counter so coin/score changes feel rewarding. */
export function CountUp({ value, duration = 600 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(a + (value - a) * e))
      if (k < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value, duration])
  return <>{shown.toLocaleString('de-DE')}</>
}

export function CoinPill({ coins }: { coins: number }) {
  return (
    <div className="panel-dark flex h-11 items-center gap-1.5 pl-1.5 pr-4">
      <CoinIcon size={30} />
      <span className="text-pop-sm text-lg">
        <CountUp value={coins} />
      </span>
    </div>
  )
}

export function Stars({ count, size = 22, gap = 2 }: { count: number; size?: number; gap?: number }) {
  return (
    <div className="flex items-end" style={{ gap }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ transform: i === 1 ? `translateY(-${size * 0.18}px)` : undefined }}>
          <StarIcon size={size} filled={i < count} />
        </span>
      ))}
    </div>
  )
}

export function Bar({ value, max, colors, trail = true, height = 22, children }: { value: number; max: number; colors: [string, string]; trail?: boolean; height?: number; children?: ReactNode }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className="bar" style={{ height }}>
      {trail && <div className="bar-trail" style={{ width: `${pct}%` }} />}
      <div className="bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})` }} />
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  )
}

export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[#1a0c3a]/70 px-4 pb-6 pt-10 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="my-auto w-full max-w-[400px]"
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toast({ text, tone = 'info' }: { text: string | null; tone?: 'info' | 'warn' | 'good' }) {
  const bg = tone === 'warn' ? 'linear-gradient(180deg,#FF8CA0,#F2496B)' : tone === 'good' ? 'linear-gradient(180deg,#6EF0A8,#22C27C)' : 'linear-gradient(180deg,#A58BFF,#6C4BEF)'
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          className="pointer-events-none fixed inset-x-0 top-[22%] z-[60] flex justify-center px-4"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <div className="max-w-[360px] rounded-2xl px-5 py-2.5 text-center shadow-[0_0_0_3px_#3B2160,0_6px_0_3px_rgba(30,10,60,.35)]" style={{ background: bg }}>
            <span className="text-pop-sm text-lg leading-snug">{text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
