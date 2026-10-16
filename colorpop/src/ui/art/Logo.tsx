const ROW1 = [
  ['C', '#FF6B8B'],
  ['O', '#FFC93D'],
  ['L', '#2FCF8F'],
  ['O', '#4FB3FF'],
  ['R', '#9B7BFF'],
] as const
const ROW2 = [
  ['P', '#FF7A59'],
  ['O', '#FFC93D'],
  ['P', '#FF6B8B'],
] as const

function LetterTile({ ch, color, rot, size }: { ch: string; color: string; rot: number; size: number }) {
  return (
    <div
      className="relative grid place-items-center"
      style={{
        width: size,
        height: size,
        transform: `rotate(${rot}deg)`,
        borderRadius: size * 0.26,
        background: `linear-gradient(180deg, #fff 0%, ${color} 55%)`,
        boxShadow: `inset 0 -${size * 0.1}px 0 rgba(0,0,0,0.18), inset 0 2px 0 #fff, 0 0 0 4px #3B2160, 0 ${size * 0.1}px 0 4px rgba(30,10,60,0.45)`,
      }}
    >
      <span className="text-pop" style={{ fontSize: size * 0.62, lineHeight: 1, marginTop: -size * 0.06 }}>
        {ch}
      </span>
    </div>
  )
}

/** Game logo built from the same tile language as the board. */
export function Logo({ size = 52 }: { size?: number }) {
  const rots = [-6, 4, -3, 5, -4]
  return (
    <div className="flex flex-col items-center" aria-label="Color Pop Quest" role="img">
      <div className="flex gap-1.5">
        {ROW1.map(([ch, c], i) => (
          <div key={i} className="anim-bob" style={{ animationDelay: `${i * 0.18}s` }}>
            <LetterTile ch={ch} color={c} rot={rots[i]} size={size} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {ROW2.map(([ch, c], i) => (
          <div key={i} className="anim-bob" style={{ animationDelay: `${0.9 + i * 0.18}s` }}>
            <LetterTile ch={ch} color={c} rot={-rots[i]} size={size * 1.12} />
          </div>
        ))}
      </div>
      <div className="ribbon -mt-2" style={{ transform: 'rotate(-2deg)' }}>
        <span className="text-pop-sm text-2xl tracking-[0.18em]">QUEST</span>
      </div>
    </div>
  )
}
