import type { ItemId } from '../../game/types'

/** Original icon set – sticker style, plum outline, drawn in code. */
const OUT = '#3B2160'

interface P {
  size?: number
  className?: string
}

export function CoinIcon({ size = 28, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <circle cx="20" cy="21" r="16" fill="#E39A12" stroke={OUT} strokeWidth="3.5" />
      <circle cx="20" cy="19" r="14" fill="#FFD34D" />
      <circle cx="20" cy="19" r="9.5" fill="none" stroke="#F0A920" strokeWidth="3" />
      <path d="M14 13 Q18 9 24 11" stroke="#FFF6C8" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function HeartIcon({ size = 28, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path
        d="M20 35 C8 26 3 19 4 13 C5 7 10 4 14.5 5 C17 5.5 19 7 20 9 C21 7 23 5.5 25.5 5 C30 4 35 7 36 13 C37 19 32 26 20 35 Z"
        fill="#FF4D73"
        stroke={OUT}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M10 12 Q11 8.5 15 8.5" stroke="#FFC2D0" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function StarIcon({ size = 28, filled = true, className }: P & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path
        d="M20 3.5 L25 14 L36.5 15.4 L28 23.3 L30.3 34.8 L20 29 L9.7 34.8 L12 23.3 L3.5 15.4 L15 14 Z"
        fill={filled ? '#FFD23F' : '#5B4880'}
        stroke={OUT}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {filled && <path d="M13 17 L17.5 16.4 L19.6 11.5" stroke="#FFF4B8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    </svg>
  )
}

export function GearIcon({ size = 26, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path
        d="M17 3h6l1 5 4 2 4.5-3 4 4-3 4.5 2 4 5 1v6l-5 1-2 4 3 4.5-4 4-4.5-3-4 2-1 5h-6l-1-5-4-2-4.5 3-4-4 3-4.5-2-4-5-1v-6l5-1 2-4-3-4.5 4-4 4.5 3 4-2z"
        fill="currentColor"
        stroke={OUT}
        strokeWidth="2.8"
        strokeLinejoin="round"
        transform="scale(0.92) translate(1.7 1.7)"
      />
      <circle cx="20" cy="20" r="6" fill={OUT} />
    </svg>
  )
}

export function BackIcon({ size = 26, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M24 8 L11 20 L24 32" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function LockIcon({ size = 26, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M12 18 V13 a8 8 0 0 1 16 0 V18" stroke={OUT} strokeWidth="4.5" fill="none" />
      <path d="M12 18 V13 a8 8 0 0 1 16 0 V18" stroke="#B9A9D6" strokeWidth="2" fill="none" />
      <rect x="7" y="17" width="26" height="19" rx="6" fill="#FFC93D" stroke={OUT} strokeWidth="3.5" />
      <circle cx="20" cy="25.5" r="3" fill={OUT} />
      <rect x="18.8" y="26" width="2.4" height="5" rx="1.2" fill={OUT} />
    </svg>
  )
}

export function SoundIcon({ size = 26, on = true, className }: P & { on?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M6 15 h7 l9-7 v24 l-9-7 h-7 z" fill="currentColor" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      {on ? (
        <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M27 14 q4 6 0 12" />
          <path d="M31 10 q7 10 0 20" />
        </g>
      ) : (
        <g stroke="#FF4D73" strokeWidth="4" strokeLinecap="round">
          <line x1="27" y1="14" x2="36" y2="26" />
          <line x1="36" y1="14" x2="27" y2="26" />
        </g>
      )}
    </svg>
  )
}

export function SwordIcon({ size = 22, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M30 4 L36 4 L36 10 L17 29 L11 23 Z" fill="#E8F1FF" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 20 L20 32" stroke={OUT} strokeWidth="6" strokeLinecap="round" />
      <path d="M8 20 L20 32" stroke="#FFC93D" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 28 L5 35" stroke={OUT} strokeWidth="6" strokeLinecap="round" />
      <path d="M12 28 L5 35" stroke="#9B6BFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function MovesIcon({ size = 22, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <rect x="6" y="6" width="28" height="28" rx="8" fill="#FFF8EA" stroke={OUT} strokeWidth="3.5" />
      <path d="M13 26 L18 16 L22 22 L27 13" stroke="#6C4BEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function CrystalIcon({ size = 22, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M20 3 L32 14 L26 36 L14 36 L8 14 Z" fill="#9AD8FF" stroke={OUT} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M8 14 L32 14 M20 3 L16 14 L20 36 M20 3 L24 14 L20 36" stroke="#4E9BD6" strokeWidth="1.8" fill="none" />
      <path d="M12 16 L15 28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function FlameIcon({ size = 22, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path
        d="M20 37 C10 37 6 30 7 23 C8 16 14 13 14 6 C19 9 22 14 21 19 C24 17 25 13 25 11 C31 16 34 22 33 27 C32 33 27 37 20 37 Z"
        fill="#FF7A2E"
        stroke={OUT}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path d="M20 34 C15 34 13 30 14 27 C15 24 18 23 19 19 C22 22 26 25 25 29 C24 32 22 34 20 34 Z" fill="#FFE36B" />
    </svg>
  )
}

export function TargetIcon({ size = 22, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <circle cx="20" cy="20" r="15" fill="#FF6B8B" stroke={OUT} strokeWidth="3.2" />
      <circle cx="20" cy="20" r="9.5" fill="#fff" />
      <circle cx="20" cy="20" r="5" fill="#FF6B8B" />
    </svg>
  )
}

export function BagIcon({ size = 26, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M14 12 C14 6 26 6 26 12" stroke={OUT} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M7 15 Q7 11 11 11 H29 Q33 11 33 15 L35 32 Q35 36 31 36 H9 Q5 36 5 32 Z" fill="#7C5CFF" stroke={OUT} strokeWidth="3.2" strokeLinejoin="round" />
      <rect x="15" y="18" width="10" height="7" rx="2.5" fill="#FFC93D" stroke={OUT} strokeWidth="2.5" />
    </svg>
  )
}

export function PlayIcon({ size = 26, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M13 8 L32 20 L13 32 Z" fill="currentColor" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  )
}

export function RetryIcon({ size = 24, className }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path d="M31 15 A12 12 0 1 0 32 24" stroke="currentColor" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M33 6 L33 16 L23 16" stroke="currentColor" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BoltBadge({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M14 1 L4 14 H11 L9 23 L20 9 H13 Z" fill="#FFE36B" stroke={OUT} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  )
}

export function BombBadge({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="11" cy="14" r="8" fill="#3B2160" stroke="#fff" strokeWidth="1.6" />
      <circle cx="8.5" cy="11.5" r="2.2" fill="#8E7AB8" />
      <path d="M15 7 Q17 3 21 4" stroke="#FFC93D" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="21" cy="3.5" r="2" fill="#FFE36B" className="fuse-spark" />
    </svg>
  )
}

export function CoinBadge({ size = 16 }: P) {
  return <CoinIcon size={size} />
}

// ---------- Item icons ----------

export function ItemIcon({ id, size = 56 }: { id: ItemId; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true }
  switch (id) {
    case 'goldenAlphabet':
      return (
        <svg {...common}>
          <rect x="10" y="12" width="44" height="44" rx="12" fill="#C98408" stroke={OUT} strokeWidth="4" />
          <rect x="10" y="8" width="44" height="42" rx="12" fill="#FFD34D" stroke={OUT} strokeWidth="4" />
          <path d="M22 41 L32 17 L42 41 M26 33 H38" stroke={OUT} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M16 15 Q20 12 26 13" stroke="#FFF6C8" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M51 6 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )
    case 'wordBlade':
      return (
        <svg {...common}>
          <path d="M48 6 L58 6 L58 16 L26 48 L16 38 Z" fill="#E6F0FF" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
          <path d="M50 10 L24 36" stroke="#9FC2FF" strokeWidth="3" strokeLinecap="round" />
          <text x="36" y="30" fontFamily="Fredoka" fontWeight="700" fontSize="10" fill="#5B8CFF" transform="rotate(-45 36 30)">
            ABC
          </text>
          <path d="M10 30 L34 54" stroke={OUT} strokeWidth="9" strokeLinecap="round" />
          <path d="M10 30 L34 54" stroke="#FFC93D" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 44 L8 56" stroke={OUT} strokeWidth="9" strokeLinecap="round" />
          <path d="M20 44 L8 56" stroke="#5B8CFF" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M32 5 L54 13 V30 C54 44 44 54 32 59 C20 54 10 44 10 30 V13 Z" fill="#38C6A8" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
          <path d="M32 11 L48 17 V30 C48 40 41 48 32 52 Z" fill="#7FE6CC" />
          <circle cx="32" cy="31" r="9" fill="#FFF8EA" stroke={OUT} strokeWidth="3.5" />
          <circle cx="32" cy="31" r="3.5" fill="#FF6B8B" />
        </svg>
      )
    case 'fireRing':
      return (
        <svg {...common}>
          <circle cx="32" cy="38" r="17" fill="none" stroke={OUT} strokeWidth="11" />
          <circle cx="32" cy="38" r="17" fill="none" stroke="#FFC93D" strokeWidth="5" />
          <path d="M22 27 Q26 24 31 23" stroke="#FFF6C8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M32 26 C24 26 21 20 22 15 C23 10 28 8 28 3 C32 6 34 9 33 13 C36 11 37 8 37 6 C41 10 43 15 42 19 C41 23 37 26 32 26 Z" fill="#FF7A2E" stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M32 23 C29 23 27 21 28 18 C29 16 31 15 31 12 C34 14 36 16 35 19 C35 21 34 23 32 23 Z" fill="#FFE36B" />
        </svg>
      )
    case 'lightningCore':
      return (
        <svg {...common}>
          <circle cx="32" cy="33" r="24" fill="#6C4BEF" stroke={OUT} strokeWidth="4" />
          <circle cx="32" cy="33" r="18" fill="#9B7BFF" />
          <path d="M18 22 Q24 14 34 13" stroke="#E2D8FF" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M36 12 L22 36 H31 L27 54 L44 28 H35 Z" fill="#FFE36B" stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
      )
    case 'thawWind':
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="25" fill="#5FC8F0" stroke={OUT} strokeWidth="4" />
          <path d="M14 26 C24 18 34 30 44 22 C48 19 52 20 54 23" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M12 38 C22 30 32 42 42 34 C46 31 50 32 52 35" stroke="#E6F7FF" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M44 46 l3 -7 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3z" fill="#FFE36B" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      )
    case 'comboBell':
      return (
        <svg {...common}>
          <path d="M32 8 C44 8 48 20 48 30 L48 40 L54 48 L10 48 L16 40 L16 30 C16 20 20 8 32 8 Z" fill="#F0A020" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
          <path d="M22 18 C24 14 28 12 32 12" stroke="#FFE39A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="53" r="6" fill="#FFD23F" stroke={OUT} strokeWidth="3.5" />
          <text x="32" y="38" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="15" fill={OUT}>×</text>
        </svg>
      )
    case 'hourglass':
      return (
        <svg {...common}>
          <rect x="14" y="6" width="36" height="7" rx="3" fill="#C7A15A" stroke={OUT} strokeWidth="3.5" />
          <rect x="14" y="51" width="36" height="7" rx="3" fill="#C7A15A" stroke={OUT} strokeWidth="3.5" />
          <path d="M19 13 C19 26 32 28 32 32 C32 36 19 38 19 51 L45 51 C45 38 32 36 32 32 C32 28 45 26 45 13 Z" fill="#E6F7FF" stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M24 46 C26 40 32 38 32 36 C32 38 38 40 40 46 Z" fill="#FFC93D" />
          <path d="M26 18 L38 18 C36 24 33 26 32 28 C31 26 28 24 26 18 Z" fill="#FFC93D" />
        </svg>
      )
    case 'lifeCrystal':
      return (
        <svg {...common}>
          <path d="M32 4 L50 22 L42 58 H22 L14 22 Z" fill="#FF5C8A" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
          <path d="M14 22 H50 M32 4 L26 22 L32 58 M32 4 L38 22 L32 58" stroke="#C92D63" strokeWidth="2.2" fill="none" />
          <path d="M20 25 L25 44" stroke="#FFD0DF" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="45" cy="47" r="10" fill="#2FCF8F" stroke={OUT} strokeWidth="3.5" />
          <path d="M45 41.5 V52.5 M39.5 47 H50.5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )
  }
}
