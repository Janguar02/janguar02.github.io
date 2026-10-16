import { useId } from 'react'

export type BrutzelMood = 'idle' | 'hit' | 'stagger' | 'rain' | 'smoke' | 'attack' | 'enraged' | 'defeated' | 'taunt' | 'windup'

interface Props {
  mood?: BrutzelMood
  size?: number
  className?: string
}

const OUT = '#3B2160'

/**
 * Brutzel, der Glutkobold – original character, drawn in code (SVG).
 * Sticker style with thick plum outlines to match the Color Pop UI.
 */
export function Brutzel({ mood = 'idle', size = 180, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const g = (n: string) => `${n}-${uid}`
  const enraged = ['enraged', 'attack', 'windup', 'rain', 'smoke'].includes(mood)
  const defeated = mood === 'defeated'
  const body = defeated
    ? ['#E9DED3', '#C9B8AE', '#9C8A92', '#6F5E73']
    : enraged
      ? ['#FFD07A', '#FF7A4A', '#F03A4F', '#A8173F']
      : ['#FFE59A', '#FFAD4A', '#FF6B2E', '#D93A1E']
  const flame = defeated ? ['#B8A9B4', '#8E7E8C'] : enraged ? ['#FFE36B', '#FF4D5E'] : ['#FFF08A', '#FF8A2E']

  return (
    <svg
      viewBox="0 0 240 250"
      width={size}
      height={(size * 250) / 240}
      className={className}
      role="img"
      aria-label="Brutzel, der Glutkobold"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={g('body')} cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor={body[0]} />
          <stop offset="38%" stopColor={body[1]} />
          <stop offset="74%" stopColor={body[2]} />
          <stop offset="100%" stopColor={body[3]} />
        </radialGradient>
        <linearGradient id={g('flame')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={flame[1]} />
          <stop offset="100%" stopColor={flame[0]} />
        </linearGradient>
        <radialGradient id={g('belly')} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF6D2" stopOpacity={defeated ? 0.4 : 0.95} />
          <stop offset="100%" stopColor="#FFE3A0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="120" cy="238" rx={defeated ? 70 : 58} ry="9" fill="#1A0B33" opacity="0.28" />

      {/* back flames */}
      {!defeated && (
        <g className="brutzel-flames" style={{ transformOrigin: '120px 110px' }}>
          <path
            d="M62 104 C40 72 52 44 70 30 C70 52 84 60 92 70 Z"
            fill={`url(#${g('flame')})`}
            stroke={OUT}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M178 104 C200 72 188 44 170 30 C170 52 156 60 148 70 Z"
            fill={`url(#${g('flame')})`}
            stroke={OUT}
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* arms */}
      <g>
        <ellipse
          cx={mood === 'attack' ? 34 : 44}
          cy={mood === 'attack' ? 128 : 158}
          rx="17"
          ry="13"
          transform={`rotate(${mood === 'attack' ? -40 : -25} 44 158)`}
          fill={`url(#${g('body')})`}
          stroke={OUT}
          strokeWidth="5"
        />
        <ellipse
          cx={mood === 'taunt' ? 204 : 196}
          cy={mood === 'taunt' ? 132 : 158}
          rx="17"
          ry="13"
          transform={`rotate(${mood === 'taunt' ? 35 : 25} 196 158)`}
          fill={`url(#${g('body')})`}
          stroke={OUT}
          strokeWidth="5"
        />
      </g>

      {/* feet */}
      <ellipse cx="92" cy="224" rx="20" ry="11" fill={body[3]} stroke={OUT} strokeWidth="5" />
      <ellipse cx="148" cy="224" rx="20" ry="11" fill={body[3]} stroke={OUT} strokeWidth="5" />

      {/* body with flame crest */}
      <path
        d="M120 22
           C132 40 150 44 152 64
           C186 78 204 112 202 150
           C200 196 166 226 120 226
           C74 226 40 196 38 150
           C36 112 58 80 92 66
           C96 48 112 44 120 22 Z"
        fill={`url(#${g('body')})`}
        stroke={OUT}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* inner crest flame */}
      {!defeated && (
        <path
          className="brutzel-crest"
          d="M120 40 C128 54 138 58 136 74 C132 84 108 84 104 74 C102 60 114 56 120 40 Z"
          fill={`url(#${g('flame')})`}
          opacity="0.95"
          style={{ transformOrigin: '120px 80px' }}
        />
      )}
      {/* belly glow */}
      <ellipse cx="120" cy="176" rx="56" ry="40" fill={`url(#${g('belly')})`} />
      {/* rim light */}
      <path d="M64 108 C72 92 86 84 100 80" stroke="#FFF7D6" strokeWidth="7" strokeLinecap="round" fill="none" opacity={defeated ? 0.3 : 0.75} />

      {/* cheeks */}
      {!defeated && (
        <>
          <ellipse cx="72" cy="158" rx="14" ry="9" fill="#FF5E8A" opacity="0.5" />
          <ellipse cx="168" cy="158" rx="14" ry="9" fill="#FF5E8A" opacity="0.5" />
        </>
      )}

      <Face mood={mood} />

      {/* sparks */}
      {!defeated && (
        <g className="brutzel-sparks" fill="#FFE36B" stroke={OUT} strokeWidth="2.5">
          <circle cx="40" cy="70" r="5" />
          <circle cx="206" cy="58" r="4" />
          <circle cx="214" cy="104" r="3.5" />
          {enraged && <circle cx="26" cy="112" r="4" />}
        </g>
      )}
      {defeated && (
        <g fill="#D9D2E3" stroke={OUT} strokeWidth="3" opacity="0.9">
          <circle cx="104" cy="22" r="12" />
          <circle cx="124" cy="10" r="15" />
          <circle cx="146" cy="24" r="10" />
        </g>
      )}
    </svg>
  )
}

function Face({ mood }: { mood: BrutzelMood }) {
  const eyeY = 128
  const L = 92
  const R = 148
  if (mood === 'defeated') {
    const x = (cx: number) => (
      <g stroke={OUT} strokeWidth="7" strokeLinecap="round">
        <line x1={cx - 11} y1={eyeY - 11} x2={cx + 11} y2={eyeY + 11} />
        <line x1={cx + 11} y1={eyeY - 11} x2={cx - 11} y2={eyeY + 11} />
      </g>
    )
    return (
      <g>
        {x(L)}
        {x(R)}
        <path d="M96 182 Q108 172 120 182 Q132 192 144 182" stroke={OUT} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  if (mood === 'hit') {
    return (
      <g stroke={OUT} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M${L - 14} ${eyeY - 10} L${L + 10} ${eyeY} L${L - 14} ${eyeY + 10}`} />
        <path d={`M${R + 14} ${eyeY - 10} L${R - 10} ${eyeY} L${R + 14} ${eyeY + 10}`} />
        <ellipse cx="120" cy="178" rx="14" ry="17" fill="#5A1408" strokeWidth="6" />
      </g>
    )
  }
  if (mood === 'stagger') return <g>
    {[L, R].map(cx => <g key={cx}><ellipse cx={cx} cy={eyeY} rx="23" ry="28" fill="#fff" stroke={OUT} strokeWidth="5" /><circle cx={cx} cy={eyeY} r="6" fill={OUT} /></g>)}
    <ellipse cx="120" cy="180" rx="12" ry="19" fill="#5A1408" stroke={OUT} strokeWidth="5" />
    <path d="M70 91 L96 87 M144 87 L170 91" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
  </g>
  if (mood === 'taunt') {
    return (
      <g>
        <g stroke={OUT} strokeWidth="7" strokeLinecap="round" fill="none">
          <path d={`M${L - 15} ${eyeY + 4} Q${L} ${eyeY - 14} ${L + 15} ${eyeY + 4}`} />
          <path d={`M${R - 15} ${eyeY + 4} Q${R} ${eyeY - 14} ${R + 15} ${eyeY + 4}`} />
        </g>
        <path d="M82 162 Q120 214 158 162 Z" fill="#5A1408" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
        <ellipse cx="128" cy="186" rx="13" ry="9" fill="#FF6B8B" />
        <rect x="100" y="161" width="14" height="12" rx="3" fill="#fff" stroke={OUT} strokeWidth="3" />
      </g>
    )
  }
  const angry = ['attack', 'enraged', 'windup', 'rain', 'smoke'].includes(mood)
  const pupilDX = mood === 'windup' ? 0 : 3
  return (
    <g>
      {/* eyes */}
      {[L, R].map((cx, k) => (
        <g key={cx}>
          <ellipse cx={cx} cy={eyeY} rx="21" ry={angry ? 20 : 25} fill="#fff" stroke={OUT} strokeWidth="5.5" />
          <circle cx={cx + (k === 0 ? pupilDX : -pupilDX)} cy={eyeY + 4} r={angry ? 9 : 11} fill={OUT} />
          <circle cx={cx + (k === 0 ? pupilDX : -pupilDX) - 4} cy={eyeY - 1} r="4" fill="#fff" />
        </g>
      ))}
      {/* brows: cheeky asymmetry when idle, V-shape when angry */}
      <g stroke="#6B1A0C" strokeWidth="8" strokeLinecap="round">
        {angry ? (
          <>
            <line x1={L - 22} y1={eyeY - 32} x2={L + 14} y2={eyeY - 20} />
            <line x1={R + 22} y1={eyeY - 32} x2={R - 14} y2={eyeY - 20} />
          </>
        ) : (
          <>
            <line x1={L - 18} y1={eyeY - 30} x2={L + 14} y2={eyeY - 36} />
            <line x1={R - 16} y1={eyeY - 40} x2={R + 18} y2={eyeY - 32} />
          </>
        )}
      </g>
      {/* mouth */}
      {angry ? (
        <g>
          <path d="M84 170 Q120 156 156 170 Q150 206 120 206 Q90 206 84 170 Z" fill="#5A1408" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
          <path d="M96 168 L102 180 L108 166 Z M132 166 L138 180 L144 168 Z" fill="#fff" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="120" cy="194" rx="14" ry="7" fill="#FF6B8B" />
        </g>
      ) : (
        <g>
          <path d="M86 166 Q122 204 158 160 Q150 196 120 194 Q94 192 86 166 Z" fill="#5A1408" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
          <rect x="128" y="168" width="13" height="11" rx="3" fill="#fff" stroke={OUT} strokeWidth="3" transform="rotate(-12 134 172)" />
          <ellipse cx="114" cy="186" rx="10" ry="5" fill="#FF6B8B" />
        </g>
      )}
    </g>
  )
}
