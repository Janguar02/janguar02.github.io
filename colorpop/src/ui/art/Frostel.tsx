import { useId } from 'react'
import type { BrutzelMood } from './Brutzel'

const OUT = '#3B2160'

/**
 * Frostel, der Schneewicht – original character (SVG, drawn in code).
 * A grumpy little snow cloud with an icicle crown and a knitted scarf.
 */
export function Frostel({ mood = 'idle', size = 180, className }: { mood?: BrutzelMood; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const g = (n: string) => `${n}-${uid}`
  const angry = ['attack', 'enraged', 'windup', 'rain', 'smoke'].includes(mood)
  const defeated = mood === 'defeated'
  const body = defeated ? ['#F4F8FF', '#D6E4F5', '#AFC4DE'] : angry ? ['#F2FBFF', '#A9D8FF', '#5C9BE6'] : ['#FFFFFF', '#DDF1FF', '#9CCBF2']
  return (
    <svg viewBox="0 0 240 250" width={size} height={(size * 250) / 240} className={className} role="img" aria-label="Frostel, der Schneewicht" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={g('body')} cx="40%" cy="32%" r="72%">
          <stop offset="0%" stopColor={body[0]} />
          <stop offset="60%" stopColor={body[1]} />
          <stop offset="100%" stopColor={body[2]} />
        </radialGradient>
        <linearGradient id={g('ice')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#7CC4FF" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="238" rx={defeated ? 80 : 60} ry="9" fill="#1A0B33" opacity="0.25" />
      {defeated && <ellipse cx="120" cy="230" rx="78" ry="12" fill="#BFE3FF" stroke={OUT} strokeWidth="4" opacity="0.9" />}

      {/* icicle crown */}
      {!defeated && (
        <g className="frostel-crown" stroke={OUT} strokeWidth="4" strokeLinejoin="round" fill={`url(#${g('ice')})`}>
          <path d="M92 64 L100 26 L110 62 Z" />
          <path d="M110 58 L120 12 L132 58 Z" />
          <path d="M130 62 L142 28 L150 66 Z" />
        </g>
      )}

      {/* arms */}
      <ellipse cx={mood === 'attack' ? 36 : 46} cy={mood === 'attack' ? 130 : 160} rx="18" ry="13" transform="rotate(-25 46 160)" fill={`url(#${g('body')})`} stroke={OUT} strokeWidth="5" />
      <ellipse cx={mood === 'taunt' ? 204 : 194} cy={mood === 'taunt' ? 130 : 160} rx="18" ry="13" transform="rotate(25 194 160)" fill={`url(#${g('body')})`} stroke={OUT} strokeWidth="5" />

      {/* cloud body: overlapping puffs */}
      <path
        d={
          defeated
            ? 'M44 212 C30 196 40 176 58 176 C62 156 88 150 104 160 C116 146 146 148 154 164 C176 156 200 172 192 196 C208 204 200 222 184 222 L60 222 C48 222 40 218 44 212 Z'
            : 'M40 168 C22 150 34 116 62 116 C62 84 96 66 122 76 C142 58 182 70 184 102 C212 106 222 140 202 160 C214 184 196 214 168 212 C150 230 96 232 78 214 C50 220 30 194 40 168 Z'
        }
        fill={`url(#${g('body')})`}
        stroke={OUT}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {!defeated && <path d="M66 120 C70 104 86 94 100 92" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />}

      {/* knitted scarf */}
      {!defeated && (
        <g stroke={OUT} strokeWidth="4" strokeLinejoin="round">
          <path d="M70 186 C96 198 146 198 172 184 L176 200 C148 214 94 214 66 202 Z" fill="#F2496B" />
          <path d="M150 196 L162 236 L146 238 L138 200 Z" fill="#F2496B" />
          <path d="M84 196 L84 206 M100 199 L100 210 M116 200 L116 211 M132 199 L132 210 M150 196 L150 206" stroke="#FFC2CF" strokeWidth="3" />
        </g>
      )}

      {/* cheeks */}
      {!defeated && (
        <>
          <ellipse cx="74" cy="156" rx="13" ry="8" fill="#8EC5FF" opacity="0.55" />
          <ellipse cx="166" cy="156" rx="13" ry="8" fill="#8EC5FF" opacity="0.55" />
        </>
      )}

      <FrostFace mood={mood} />

      {/* frost sparkles */}
      {!defeated && (
        <g className="brutzel-sparks" fill="#FFFFFF" stroke={OUT} strokeWidth="2.5">
          <path d="M36 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path d="M206 60 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" />
          {angry && <path d="M214 120 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" />}
        </g>
      )}
    </svg>
  )
}

function FrostFace({ mood }: { mood: BrutzelMood }) {
  const y = mood === 'defeated' ? 196 : 136
  const L = 96
  const R = 146
  if (mood === 'defeated') {
    return (
      <g stroke={OUT} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d={`M${L - 9} ${y - 9} L${L + 9} ${y + 9} M${L + 9} ${y - 9} L${L - 9} ${y + 9}`} />
        <path d={`M${R - 9} ${y - 9} L${R + 9} ${y + 9} M${R + 9} ${y - 9} L${R - 9} ${y + 9}`} />
        <path d={`M108 ${y + 18} Q121 ${y + 10} 134 ${y + 18}`} />
      </g>
    )
  }
  if (mood === 'hit' || mood === 'stagger') {
    return (
      <g stroke={OUT} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M${L - 13} ${y - 9} L${L + 9} ${y} L${L - 13} ${y + 9}`} />
        <path d={`M${R + 13} ${y - 9} L${R - 9} ${y} L${R + 13} ${y + 9}`} />
        <ellipse cx="121" cy={y + 34} rx="11" ry="13" fill="#2D3F7A" strokeWidth="5" />
      </g>
    )
  }
  if (mood === 'taunt') {
    return (
      <g>
        <g stroke={OUT} strokeWidth="7" strokeLinecap="round" fill="none">
          <path d={`M${L - 13} ${y + 3} Q${L} ${y - 12} ${L + 13} ${y + 3}`} />
          <path d={`M${R - 13} ${y + 3} Q${R} ${y - 12} ${R + 13} ${y + 3}`} />
        </g>
        <path d={`M96 ${y + 26} Q121 ${y + 52} 146 ${y + 26}`} stroke={OUT} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  const angry = ['attack', 'enraged', 'windup', 'rain', 'smoke'].includes(mood)
  return (
    <g>
      {[L, R].map((cx, k) => (
        <g key={cx}>
          <ellipse cx={cx} cy={y} rx="17" ry={angry ? 16 : 20} fill="#fff" stroke={OUT} strokeWidth="5" />
          <circle cx={cx + (k === 0 ? 3 : -3)} cy={y + 3} r={angry ? 8 : 9} fill={OUT} />
          <circle cx={cx + (k === 0 ? 3 : -3) - 3} cy={y - 1} r="3.2" fill="#fff" />
        </g>
      ))}
      {/* grumpy brows */}
      <g stroke="#2D3F7A" strokeWidth="7" strokeLinecap="round">
        {angry ? (
          <>
            <line x1={L - 18} y1={y - 28} x2={L + 12} y2={y - 16} />
            <line x1={R + 18} y1={y - 28} x2={R - 12} y2={y - 16} />
          </>
        ) : (
          <>
            <line x1={L - 16} y1={y - 26} x2={L + 12} y2={y - 22} />
            <line x1={R - 12} y1={y - 22} x2={R + 16} y2={y - 26} />
          </>
        )}
      </g>
      {/* mouth: pouty when calm, open when attacking */}
      {angry ? (
        <path d={`M100 ${y + 26} Q121 ${y + 16} 142 ${y + 26} Q136 ${y + 46} 121 ${y + 46} Q106 ${y + 46} 100 ${y + 26} Z`} fill="#2D3F7A" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />
      ) : (
        <path d={`M106 ${y + 32} Q121 ${y + 24} 136 ${y + 32}`} stroke={OUT} strokeWidth="6" fill="none" strokeLinecap="round" />
      )}
    </g>
  )
}
