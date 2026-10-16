import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/AppContext'
import { sfx } from '../../audio/sfx'
import { applyDifficulty, BOSSES, CHAPTERS, describeAttack, LEVELS, patternFor } from '../../game/content'
import { bossAdvice, ITEMS, ROLE_LABELS, synergiesFor } from '../../game/items'
import { levelFromXp, totalStars } from '../../game/progression'
import { isChapterUnlocked, isLevelUnlocked, loadRun } from '../../game/save'
import type { LevelDef } from '../../game/types'
import { Backdrop } from '../art/Backdrop'
import { BossArt } from '../art/BossArt'
import { BagIcon, CoinIcon, ItemIcon, LockIcon, MovesIcon, PlayIcon, StarIcon } from '../art/Icons'
import { BackButton, Bar, Btn, CoinPill, Modal, Stars } from '../components/Common'
import { DifficultyPicker } from '../components/DifficultyPicker'
import { GoalIcon } from '../components/GameHud'

// ---------------- Map geometry ----------------

const STEP = 205
const CHAPTER_GAP = 230
const PAD_BOTTOM = 150
/** Zig-zag x positions (percent) for the six stations of a chapter. */
const XS = [30, 68, 34, 70, 32, 60]

type IslandStyle = { ground: string; rim: string; deco: 'candy' | 'cloud' | 'crystal' | 'gold' | 'flame' | 'volcano' | 'snow' | 'spark' | 'book' | 'soot' | 'throne' }
const ISLANDS: Record<string, IslandStyle> = {
  l1: { ground: '#FFC2D6', rim: '#FFE2EC', deco: 'candy' },
  l4: { ground: '#F6C9FF', rim: '#FBE6FF', deco: 'cloud' },
  l2: { ground: '#7FB8F0', rim: '#B8E2FF', deco: 'crystal' },
  l5: { ground: '#E9B44C', rim: '#FFE09A', deco: 'gold' },
  l3: { ground: '#C2507A', rim: '#FF9F45', deco: 'flame' },
  boss1: { ground: '#5A2470', rim: '#FF7A45', deco: 'volcano' },
  l6: { ground: '#9C7BF0', rim: '#D7C9FF', deco: 'spark' },
  l7: { ground: '#8FC9E8', rim: '#FFB067', deco: 'crystal' },
  l8: { ground: '#B58A5A', rim: '#F3D9A8', deco: 'book' },
  l9: { ground: '#6E6290', rim: '#A99CC4', deco: 'soot' },
  l10: { ground: '#A8DCF5', rim: '#E6F7FF', deco: 'snow' },
  boss2: { ground: '#4E7FD0', rim: '#E6F7FF', deco: 'throne' },
}

function layout() {
  const chapters = CHAPTERS.map((c) => LEVELS.filter((l) => l.chapter === c.id))
  const perChapter = chapters.map((ls) => ls.length)
  const height = PAD_BOTTOM + perChapter.reduce((s, n) => s + n * STEP, 0) + CHAPTER_GAP * (chapters.length - 1) + 120
  const nodes: Record<string, { x: number; y: number }> = {}
  const chapterTop: Record<number, number> = {}
  let y = height - PAD_BOTTOM
  chapters.forEach((ls, ci) => {
    ls.forEach((l, i) => {
      nodes[l.id] = { x: XS[i % XS.length], y }
      y -= STEP
    })
    chapterTop[CHAPTERS[ci].id] = y + STEP - 70
    y -= CHAPTER_GAP - STEP
  })
  return { height, nodes, chapterTop }
}
const MAP = layout()

function Deco({ kind }: { kind: IslandStyle['deco'] }) {
  const O = '#3B2160'
  switch (kind) {
    case 'candy':
      return (
        <g>
          {[
            [-62, '#FF6B8B'],
            [62, '#2FCF8F'],
          ].map(([x, c]) => (
            <g key={x} transform={`translate(${x} -10)`}>
              <rect x="-3" y="-30" width="6" height="34" rx="3" fill="#FFF8EA" stroke={O} strokeWidth="3" />
              <circle cx="0" cy="-38" r="15" fill={c as string} stroke={O} strokeWidth="4" />
            </g>
          ))}
        </g>
      )
    case 'cloud':
      return (
        <g fill="#FFFFFF" stroke={O} strokeWidth="3.5">
          <path d="M-80 -14 C-92 -24 -78 -40 -64 -32 C-60 -46 -38 -44 -38 -30 C-26 -32 -24 -14 -36 -12 Z" />
          <path d="M44 -18 C38 -30 54 -38 62 -30 C68 -40 86 -36 84 -24 C94 -22 92 -10 82 -10 L48 -10 Z" />
        </g>
      )
    case 'crystal':
    case 'snow':
      return (
        <g stroke={O} strokeWidth="3.5" strokeLinejoin="round" fill={kind === 'snow' ? '#FFFFFF' : '#CFF2FF'}>
          <path d="M-74 -6 L-64 -46 L-54 -6 Z" />
          <path d="M56 -6 L68 -54 L80 -6 Z" />
          <path d="M44 -4 L50 -26 L58 -4 Z" />
        </g>
      )
    case 'gold':
      return (
        <g stroke={O} strokeWidth="3">
          {[-70, -52, 58, 74].map((x, i) => (
            <circle key={x} cx={x} cy={-14 - (i % 2) * 10} r="9" fill="#FFD34D" />
          ))}
        </g>
      )
    case 'flame':
      return (
        <g stroke={O} strokeWidth="3" fill="#FFB13D">
          <path d="M-66 -6 C-74 -16 -70 -26 -66 -36 C-64 -26 -56 -24 -58 -14 C-59 -9 -62 -6 -66 -6 Z" />
          <path d="M68 -6 C60 -16 64 -26 68 -36 C70 -26 78 -24 76 -14 C75 -9 72 -6 68 -6 Z" />
        </g>
      )
    case 'spark':
      return (
        <g fill="#FFE36B" stroke={O} strokeWidth="2.5">
          <path d="M-68 -30 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" />
          <path d="M66 -34 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
        </g>
      )
    case 'book':
      return (
        <g stroke={O} strokeWidth="3" strokeLinejoin="round">
          <rect x="-82" y="-30" width="26" height="22" rx="3" fill="#FF6B8B" />
          <rect x="-58" y="-36" width="14" height="28" rx="3" fill="#4FB3FF" />
          <rect x="56" y="-30" width="24" height="22" rx="3" fill="#FFC93D" />
        </g>
      )
    case 'soot':
      return (
        <g fill="#4E4370" opacity="0.9">
          <circle cx="-68" cy="-20" r="14" />
          <circle cx="-52" cy="-28" r="12" />
          <circle cx="62" cy="-22" r="13" />
        </g>
      )
    case 'volcano':
      return (
        <g stroke={O} strokeWidth="4" strokeLinejoin="round">
          <path d="M-90 -4 L-50 -60 L-34 -52 L-18 -62 L18 -4 Z" fill="#3D1240" />
          <path d="M-50 -60 L-34 -52 L-18 -62 L-24 -70 Q-34 -78 -44 -70 Z" fill="#FF7A45" />
        </g>
      )
    case 'throne':
      return (
        <g stroke={O} strokeWidth="4" strokeLinejoin="round" fill="#E6F7FF">
          <path d="M50 -4 L50 -50 L60 -64 L70 -50 L80 -64 L90 -50 L90 -4 Z" />
          <path d="M-86 -4 L-76 -40 L-66 -4 Z" />
        </g>
      )
  }
}

function MapArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 400 ${MAP.height}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="map-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9AD8FF" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#3A2A8F" stopOpacity="0" />
          <stop offset="1" stopColor="#2B6FD6" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="400" height={MAP.height} fill="url(#map-sea)" />
      {/* path */}
      <PathD />
      {/* islands */}
      {LEVELS.map((l) => {
        const n = MAP.nodes[l.id]
        const st = ISLANDS[l.id] ?? ISLANDS.l1
        const x = n.x * 4
        const boss = l.goal.kind === 'boss'
        const w = boss ? 120 : 98
        return (
          <g key={l.id} transform={`translate(${x} ${n.y + 46})`}>
            <ellipse cx="0" cy="28" rx={w + 12} ry="18" fill="#1A0B33" opacity="0.28" />
            <path d={`M${-w} 8 C${-w + 20} -26 ${w - 20} -26 ${w} 8 C${w - 30} 34 ${-w + 30} 34 ${-w} 8 Z`} fill={st.ground} stroke="#3B2160" strokeWidth="4" />
            <path d={`M${-w + 14} 6 C${-w / 2} -8 ${w / 2} -8 ${w - 14} 6`} stroke={st.rim} strokeWidth="7" fill="none" strokeLinecap="round" />
            <Deco kind={st.deco} />
          </g>
        )
      })}
    </svg>
  )
}

function PathD() {
  const pts = LEVELS.map((l) => MAP.nodes[l.id])
  let d = ''
  pts.forEach((p, i) => {
    const x = p.x * 4
    if (i === 0) d = `M${x} ${p.y}`
    else {
      const prev = pts[i - 1]
      const my = (prev.y + p.y) / 2
      d += ` C${prev.x * 4} ${my} ${x} ${my} ${x} ${p.y}`
    }
  })
  return (
    <g>
      <path d={d} stroke="#3B2160" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d={d} stroke="#FFF6DD" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="2 16" />
    </g>
  )
}

// ---------------- Screen ----------------

export function WorldMap({ focus }: { focus?: string }) {
  const { save, go, storage } = useApp()
  const scroller = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<LevelDef | null>(null)
  const run = useMemo(() => loadRun(storage), [storage])
  const current = LEVELS.find((l) => isLevelUnlocked(save, l.id) && !save.levels[l.id]?.completed) ?? LEVELS[LEVELS.length - 1]
  const player = levelFromXp(save.xp)
  const stars = totalStars(save.levels)
  const focusLevel = LEVELS.find((l) => l.id === (focus ?? current.id)) ?? current
  const chapter = CHAPTERS.find((c) => c.id === focusLevel.chapter) ?? CHAPTERS[0]

  useEffect(() => {
    const target = MAP.nodes[focusLevel.id]
    const el = scroller.current
    if (el && target) el.scrollTop = Math.max(0, target.y - el.clientHeight * 0.55)
  }, [focusLevel.id])

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[520px] flex-col">
      <Backdrop theme={focusLevel.chapter === 2 ? 'frost' : 'menu'} />
      <div className="relative z-20 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <BackButton onClick={() => go({ name: 'menu' })} />
          <div className="min-w-0 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/70">{chapter.subtitle}</div>
            <div className="text-pop-sm truncate text-xl leading-tight">{chapter.name}</div>
          </div>
          <CoinPill coins={save.coins} />
        </div>
        {/* player progress strip */}
        <div className="panel-dark mt-2 flex items-center gap-3 px-3 py-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFD23F] font-display text-lg font-bold text-[#3B2160] shadow-[0_0_0_2.5px_#3B2160]" aria-label={`Spielerlevel ${player.level}`}>
            {player.level}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-[11px] font-extrabold uppercase tracking-wide text-white/75">
              <span>Spielerlevel</span>
              <span>
                {player.into}/{player.need} XP
              </span>
            </div>
            <div className="mt-1">
              <Bar value={player.into} max={player.need} colors={['#C4B2FF', '#6C4BEF']} height={10} trail={false} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 font-display text-sm font-bold text-white">
            <StarIcon size={20} /> {stars.have}/{stars.max}
          </div>
        </div>
      </div>

      <div ref={scroller} className="no-scrollbar relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative mx-auto w-full max-w-[420px]" style={{ height: MAP.height }}>
          <MapArt />

          {/* chapter signs */}
          {CHAPTERS.map((c) => {
            const unlocked = isChapterUnlocked(save, c.id)
            return (
              <div key={c.id} className="absolute inset-x-0 z-10 flex justify-center" style={{ top: MAP.chapterTop[c.id] - 40 }}>
                <div className="ribbon" style={c.id === 2 ? { background: 'linear-gradient(180deg,#8FC8FF,#3D6FD6)', boxShadow: 'inset 0 -5px 0 #24479A, 0 0 0 4px #3B2160' } : undefined}>
                  <span className="text-pop-sm whitespace-nowrap text-lg">
                    {c.subtitle} · {c.name}
                  </span>
                </div>
                {!unlocked && (
                  <div className="absolute top-12 rounded-2xl bg-[#1E2460]/85 px-3 py-1.5 text-center text-[12.5px] font-extrabold text-white shadow-[0_0_0_2.5px_#3B2160]">
                    <LockIcon size={18} className="mr-1 inline-block align-[-3px]" />
                    Besiege den Boss von {CHAPTERS[c.id - 2]?.subtitle ?? 'zuvor'}, um weiterzureisen
                  </div>
                )}
              </div>
            )
          })}

          {LEVELS.map((l) => {
            const pos = MAP.nodes[l.id]
            const unlocked = isLevelUnlocked(save, l.id)
            const prog = save.levels[l.id]
            const isCurrent = l.id === current.id && unlocked && !prog?.completed
            const boss = l.goal.kind === 'boss'
            const bossId = l.goal.kind === 'boss' ? l.goal.bossId : ''
            return (
              <div key={l.id} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos.x}%`, top: pos.y }}>
                {isCurrent && (
                  <motion.div className="absolute -top-14 left-1/2 -translate-x-1/2" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                    <div className="rounded-xl bg-white px-2.5 py-1 font-display text-sm font-bold text-[#3B2160] shadow-[0_0_0_3px_#3B2160]">Hier!</div>
                    <div className="mx-auto h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-[#3B2160]" />
                  </motion.div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    sfx.click()
                    if (unlocked) setOpen(l)
                  }}
                  className={`relative grid place-items-center rounded-full ${isCurrent ? 'anim-pulse' : ''}`}
                  style={{
                    width: boss ? 92 : 72,
                    height: boss ? 92 : 72,
                    background: !unlocked
                      ? 'radial-gradient(circle at 50% 30%, #A99CC4, #6E6290)'
                      : boss
                        ? bossId === 'frostel'
                          ? 'radial-gradient(circle at 50% 30%, #CDEBFF, #4E7FD0)'
                          : 'radial-gradient(circle at 50% 30%, #FFB067, #E8462B)'
                        : prog?.completed
                          ? 'radial-gradient(circle at 50% 30%, #8FFFC4, #22C27C)'
                          : 'radial-gradient(circle at 50% 30%, #FFE98A, #FFB21E)',
                    boxShadow: '0 0 0 5px #3B2160, inset 0 -7px 0 rgba(0,0,0,.18), inset 0 4px 0 rgba(255,255,255,.55), 0 9px 0 5px rgba(30,10,60,.4)',
                  }}
                  aria-label={`${l.name}${unlocked ? '' : ' (gesperrt)'}`}
                >
                  {!unlocked ? (
                    <LockIcon size={32} />
                  ) : boss ? (
                    <div className="-mt-2">
                      <BossArt id={bossId} mood={prog?.completed ? 'defeated' : 'idle'} size={66} />
                    </div>
                  ) : (
                    <span className="text-pop text-[32px] leading-none">{l.index}</span>
                  )}
                </button>
                <div className="absolute left-1/2 top-[calc(100%+6px)] flex -translate-x-1/2 flex-col items-center">
                  {unlocked && <Stars count={prog?.stars ?? 0} size={18} />}
                  <div className="mt-0.5 whitespace-nowrap rounded-lg bg-[#3B2160]/80 px-2 py-0.5 font-display text-[13px] font-semibold text-white">{l.name}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <LevelSheet
            level={open}
            hasRun={run?.levelId === open.id}
            onClose={() => setOpen(null)}
            onPlay={() => go({ name: 'game', levelId: open.id, key: Date.now() })}
            onResume={() => run && go({ name: 'game', levelId: open.id, resume: run, key: Date.now() })}
            onItems={() => go({ name: 'inventory', back: { name: 'map', focus: open.id } })}
          />
        )}
      </Modal>
    </div>
  )
}

// ---------------- Level sheet with loadout preview ----------------

function LevelSheet({ level: baseLevel, hasRun, onPlay, onResume, onItems, onClose }: { level: LevelDef; hasRun: boolean; onPlay: () => void; onResume: () => void; onItems: () => void; onClose: () => void }) {
  const { save } = useApp()
  const level = applyDifficulty(baseLevel, save.settings.difficulty)
  const prog = save.levels[level.id]
  const bossDef = level.goal.kind === 'boss' ? BOSSES[level.goal.bossId] : null
  const small = typeof window !== 'undefined' && window.innerHeight < 700
  const synergies = synergiesFor(save.equipped)
  const advice = bossDef ? bossAdvice(bossDef, save.equipped, save.owned) : null
  const frost = bossDef?.id === 'frostel'
  return (
    <div className="panel px-5 pb-5 pt-9 text-center">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <div
          className="ribbon"
          style={bossDef ? (frost ? { background: 'linear-gradient(180deg,#8FC8FF,#3D6FD6)', boxShadow: 'inset 0 -5px 0 #24479A, 0 0 0 4px #3B2160' } : { background: 'linear-gradient(180deg,#FFB067,#E8462B)', boxShadow: 'inset 0 -5px 0 #A3301A, 0 0 0 4px #3B2160' }) : undefined}
        >
          <span className="text-pop-sm whitespace-nowrap text-2xl">{bossDef ? 'Bosskampf' : `Level ${level.index}`}</span>
        </div>
      </div>
      <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#3B2160]/10 font-display text-xl font-bold text-[#3B2160]" aria-label="Schließen">
        ×
      </button>
      <h2 className="font-display text-[24px] font-bold leading-tight text-[#3B2160]">{level.name}</h2>
      {prog?.completed && (
        <div className="mt-1 flex justify-center">
          <Stars count={prog.stars} size={24} />
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/80 p-3 text-left shadow-[inset_0_-3px_0_#E7D3B3]">
        <GoalIcon kind={level.goal.kind} size={34} />
        <div className="flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#8a7aa8]">Ziel</div>
          <div className="font-display text-[16px] font-bold leading-tight text-[#3B2160]">{level.subtitle}</div>
        </div>
        {level.moves !== null && (
          <div className="flex flex-col items-center">
            <MovesIcon size={22} />
            <span className="font-display text-lg font-bold text-[#3B2160]">{level.moves}</span>
          </div>
        )}
      </div>
      {level.intro && !bossDef && (
        <p className="mt-2 rounded-xl bg-[#2FCF8F]/10 px-3 py-2 text-left text-[13px] font-bold leading-snug text-[#0E6B43]">
          <span className="font-extrabold">{level.intro.title}: </span>
          {level.intro.text}
        </p>
      )}

      {/* boss preview: character, phases, attacks, tactics */}
      {bossDef && (
        <div className="mt-2 rounded-2xl p-3 text-left" style={{ background: frost ? 'linear-gradient(180deg,#EAF6FF,#D3ECFF)' : 'linear-gradient(180deg,#FFF1E6,#FFE0CC)' }}>
          <div className="flex items-center gap-3">
            <BossArt id={bossDef.id} mood="idle" size={small ? 62 : 82} />
            <div className="min-w-0">
              <div className="font-display text-lg font-bold leading-tight text-[#3B2160]">
                {bossDef.name} <span className="text-sm text-[#6a5a8c]">{bossDef.title}</span>
              </div>
              <div className="text-[12px] font-bold text-[#6a5a8c]">
                {bossDef.finalPattern ? '3 Phasen' : '2 Phasen'} · greift nach jedem {bossDef.attackEvery}. Wort an
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[...new Set([...bossDef.pattern, ...bossDef.enragedPattern, ...(bossDef.finalPattern ?? [])])].map((id) => {
              const atk = bossDef.attacks[id]
              const phase = patternFor(bossDef, 0).includes(id) ? 0 : patternFor(bossDef, 1).includes(id) ? 1 : 2
              return (
                <span key={id} className="rounded-lg bg-white/85 px-2 py-0.5 text-[11.5px] font-bold text-[#3B2160] shadow-[0_0_0_1.5px_rgba(59,33,96,.25)]" title={describeAttack(atk, save.settings.difficulty)}>
                  {atk.name}
                  {phase > 0 && <span className="ml-1 text-[#B3213F]">P{phase + 1}</span>}
                </span>
              )
            })}
          </div>
          <ul className="mt-2 space-y-1">
            {bossDef.tactics.map((t) => (
              <li key={t} className="flex gap-1.5 text-[12.5px] font-bold leading-snug text-[#3B2160]">
                <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-[#F2496B]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <DifficultyPicker />
      </div>

      {/* loadout preview */}
      <div className="mt-3 rounded-2xl bg-white/80 p-3 text-left shadow-[inset_0_-3px_0_#E7D3B3]">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#8a7aa8]">Ausrüstung</div>
          <Btn variant="grape" size="sm" onClick={onItems}>
            <BagIcon size={20} /> Ändern
          </Btn>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[0, 1, 2].map((i) => {
            const id = save.equipped[i]
            const good = advice?.good.includes(id as never)
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className="relative grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: id ? '#FFF8EA' : '#EADCC6', boxShadow: id ? `0 0 0 2.5px ${good ? '#22C27C' : '#3B2160'}` : 'inset 0 2px 4px rgba(0,0,0,.12)' }}
                >
                  {id && <ItemIcon id={id} size={32} />}
                  {good && <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#22C27C] text-[11px] font-bold text-white shadow-[0_0_0_2px_#3B2160]">✓</span>}
                </div>
                {id && (
                  <span className="text-[10px] font-extrabold uppercase" style={{ color: ROLE_LABELS[ITEMS[id].role].color }}>
                    {ROLE_LABELS[ITEMS[id].role].label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {synergies.length > 0 && (
          <div className="mt-2 space-y-1">
            {synergies.map((s) => (
              <p key={s.name} className="rounded-lg bg-[#FFD23F]/25 px-2 py-1 text-[12px] font-bold leading-snug text-[#5A3A00]">
                <span className="font-extrabold">Synergie „{s.name}“:</span> {s.text}
              </p>
            ))}
          </div>
        )}
        {advice && (advice.suggested.length > 0 || advice.missing.length > 0) && (
          <p className="mt-2 text-[12px] font-bold leading-snug text-[#6a5a8c]">
            {advice.suggested.length > 0 && <>Gegen {bossDef?.name} hilft: {advice.suggested.map((i) => ITEMS[i].name).join(', ')}. </>}
            {advice.missing.length > 0 && <>Noch nicht freigeschaltet: {advice.missing.map((i) => ITEMS[i].name).join(', ')}.</>}
          </p>
        )}
        {save.equipped.length < 3 && <p className="mt-1.5 text-[12.5px] font-bold text-[#B3213F]">Du hast noch freie Slots – rüste Items aus!</p>}
      </div>

      {!prog?.completed && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] font-extrabold text-[#6a5a8c]">
          <span>Belohnung:</span>
          <span className="flex items-center gap-1">
            <CoinIcon size={22} /> {level.rewardCoins}
          </span>
          <span>+{bossDef ? 80 : 40} XP</span>
          {level.rewardItem && !save.owned.includes(level.rewardItem) && (
            <span className="flex items-center gap-1">
              <ItemIcon id={level.rewardItem} size={24} /> {ITEMS[level.rewardItem].name}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {hasRun && (
          <Btn variant="blue" onClick={onResume}>
            <PlayIcon size={22} /> Fortsetzen
          </Btn>
        )}
        <Btn variant="green" onClick={onPlay}>
          <PlayIcon size={22} /> {hasRun ? 'Neu starten' : "Los geht's"}
        </Btn>
      </div>
    </div>
  )
}
