import { memo } from 'react'

export type Theme = 'menu' | 'bonbon' | 'crystal' | 'ember' | 'volcano' | 'frost'

const PALETTES: Record<Theme, { sky: [string, string, string]; blob: string[]; hill: [string, string] }> = {
  menu: { sky: ['#2B2475', '#5A43C9', '#F28DB5'], blob: ['#FFC93D', '#FF7A9C', '#7FE0FF', '#B59BFF'], hill: ['#3E2B93', '#2C1F6E'] },
  bonbon: { sky: ['#2E3C8F', '#4C7EDB', '#FFB3CF'], blob: ['#FFD95E', '#FF8DB0', '#8FF0D2'], hill: ['#3355A8', '#263F86'] },
  crystal: { sky: ['#1F2B78', '#3F6BD6', '#A8E7FF'], blob: ['#C9F1FF', '#9AD8FF', '#D7C9FF'], hill: ['#2C4AA0', '#1F3680'] },
  ember: { sky: ['#3A1E6E', '#B0436F', '#FFB067'], blob: ['#FFC93D', '#FF7A59', '#FF9EC0'], hill: ['#5A2470', '#3F1857'] },
  volcano: { sky: ['#2A0F44', '#7A1F5C', '#FF7A45'], blob: ['#FFB13D', '#FF5C6B', '#FFD07A'], hill: ['#3D1240', '#260A2E'] },
  frost: { sky: ['#15205E', '#2F5DB8', '#B9E8FF'], blob: ['#E6F7FF', '#9AD8FF', '#C9B8FF'], hill: ['#24479A', '#18306E'] },
}

/** Layered, softly animated game background (pure SVG/CSS, no images). */
export const Backdrop = memo(function Backdrop({ theme }: { theme: Theme }) {
  const p = PALETTES[theme]
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 55%, ${p.sky[2]} 100%)` }}
      />
      {/* soft light rays */}
      <div
        className="anim-spin-slow absolute left-1/2 top-[18%] h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
        style={{
          background: 'repeating-conic-gradient(from 0deg, #fff 0deg 10deg, transparent 10deg 30deg)',
          transformOrigin: 'center',
        }}
      />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
        <defs>
          <radialGradient id={`glow-${theme}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="140" r="170" fill={`url(#glow-${theme})`} opacity="0.35" />
        {/* floating pops */}
        {p.blob.map((c, i) => (
          <g key={i} className="anim-float" style={{ animationDelay: `${i * 0.8}s`, animationDuration: `${4 + i}s` }}>
            <circle cx={[52, 340, 300, 80][i % 4]} cy={[120, 210, 70, 330][i % 4]} r={[22, 30, 14, 18][i % 4]} fill={c} opacity="0.32" />
            <circle cx={[46, 330, 296, 74][i % 4]} cy={[112, 198, 65, 323][i % 4]} r={[7, 9, 4, 6][i % 4]} fill="#fff" opacity="0.4" />
          </g>
        ))}
        {/* sparkles */}
        {[
          [30, 60],
          [370, 120],
          [210, 40],
          [120, 260],
          [360, 380],
        ].map(([x, y], i) => (
          <path
            key={i}
            d={`M${x} ${y - 8} L${x + 2.2} ${y - 2.2} L${x + 8} ${y} L${x + 2.2} ${y + 2.2} L${x} ${y + 8} L${x - 2.2} ${y + 2.2} L${x - 8} ${y} L${x - 2.2} ${y - 2.2} Z`}
            fill="#fff"
            opacity="0.55"
            className="anim-pulse"
            style={{ animationDelay: `${i * 0.37}s`, transformOrigin: `${x}px ${y}px` }}
          />
        ))}
        {/* rolling hills at the bottom for depth */}
        <path d="M0 690 C80 650 150 670 210 700 C270 728 340 690 400 670 L400 800 L0 800 Z" fill={p.hill[0]} opacity="0.55" />
        <path d="M0 740 C90 710 170 730 240 750 C300 768 360 745 400 735 L400 800 L0 800 Z" fill={p.hill[1]} opacity="0.7" />
        {theme === 'volcano' && (
          <g opacity="0.55">
            <path d="M120 700 L180 600 L200 612 L220 598 L280 700 Z" fill="#260A2E" />
            <path d="M180 600 L200 612 L220 598 L214 590 Q200 580 186 590 Z" fill="#FF7A45" />
          </g>
        )}
        {(theme === 'crystal' || theme === 'frost') && (
          <g opacity="0.45" fill="#CFF2FF">
            <path d="M40 720 L55 660 L70 720 Z" />
            <path d="M330 730 L350 650 L370 730 Z" />
            <path d="M355 735 L365 690 L378 735 Z" />
          </g>
        )}
      </svg>
    </div>
  )
})
