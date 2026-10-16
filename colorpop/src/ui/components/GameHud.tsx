import { AnimatePresence, motion } from 'motion/react'
import { forwardRef, useState } from 'react'
import { BOSSES, describeAttack } from '../../game/content'
import { ITEM_VALUES, ITEMS } from '../../game/items'
import type { BossState, Difficulty, ItemId, LevelDef, PlayerState, WordKind } from '../../game/types'
import type { BrutzelMood } from '../art/Brutzel'
import { BossArt } from '../art/BossArt'
import { BoltBadge, CoinIcon, CrystalIcon, FlameIcon, HeartIcon, ItemIcon, MovesIcon, StarIcon, SwordIcon, TargetIcon } from '../art/Icons'
import { Bar, CountUp } from './Common'

// ---------------- Boss stage ----------------

export const BossStage = forwardRef<HTMLDivElement, { boss: BossState; hp: number; mood: BrutzelMood; nextAttack: string | null; size: number; telegraph: string | null; difficulty: Difficulty; attackStyle?: 'strike' | 'rain' | 'smoke'; every?: number }>(
  function BossStage({ boss, hp, mood, nextAttack, size, telegraph, difficulty, attackStyle = 'strike', every }, ref) {
    const def = BOSSES[boss.id]
    const rhythm = Math.max(every ?? def.attackEvery, boss.countdown)
    const atk = nextAttack ? def.attacks[nextAttack] : null
    const urgent = boss.countdown === 1
    return (
      <div className="relative flex w-full items-end gap-2 px-1" style={{ height: size + 34 }}>
        {/* boss */}
        <div className="flex flex-1 justify-center">
        <div ref={ref} className="relative" style={{ width: size, height: size + 10 }}>
          <motion.div
            key={mood === 'hit' || mood === 'stagger' ? `hit-${hp}` : mood}
            className={mood === 'idle' || mood === 'enraged' ? 'anim-bob' : ''}
            initial={mood === 'hit' ? { scaleX: 1.15, scaleY: 0.85, x: 0 } : mood === 'attack' ? { scale: 1.25, y: 20 } : mood === 'windup' ? { scale: 1 } : false}
            animate={
              mood === 'stagger' ? { x: [0, -22, -16, 0], y: [0, -8, 0], rotate: [0, -14, -5, 0], scale: [1, 0.9, 1] }
              : mood === 'rain' ? { y: [0, -15, 0], scaleY: [1, 1.12, 1] }
              : mood === 'smoke' ? { scaleX: [1, 1.18, 1], rotate: [0, 8, -8, 0] }
              : mood === 'hit'
                ? { scaleX: 1, scaleY: 1, x: [0, -10, 8, -5, 0] }
                : mood === 'attack'
                  ? { scale: 1, y: 0 }
                  : mood === 'windup'
                    ? { scale: [1, 1.12, 1.08], rotate: [0, -4, 4, -3, 0] }
                    : mood === 'defeated'
                      ? { scale: 0.88, y: 10, rotate: -8 }
                      : { scale: 1 }
            }
            transition={{ duration: mood === 'windup' ? 0.6 : 0.4 }}
            style={{ transformOrigin: '50% 100%' }}
          >
            <BossArt id={boss.id} mood={mood} size={size} className={mood === 'hit' ? 'brightness-[1.6]' : ''} />
          </motion.div>
          {(boss.armor ?? 0) > 0 && hp > 0 && (
            <div className="boss-armor pointer-events-none absolute inset-[-8%] rounded-full" aria-hidden />
          )}
          {['rain', 'smoke', 'attack'].includes(mood) && <div className={`boss-effect boss-effect-${attackStyle}`} aria-hidden="true">
            {Array.from({ length: attackStyle === 'strike' ? 1 : 5 }, (_, i) => <span key={i} style={{ left: `${10 + i * 18}%`, animationDelay: `${i * 0.035}s` }} />)}
          </div>}
        </div>
        </div>

        {/* intent bubble */}
        {atk && hp > 0 && (
          <motion.div
            className={`relative mb-auto mt-1 w-[48%] max-w-[200px] shrink-0 ${urgent ? 'anim-pulse' : ''}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={atk.id + boss.patternIndex}
          >
            <div
              className="rounded-2xl px-3 pb-2 pt-1.5 text-left"
              style={{
                background: urgent ? 'linear-gradient(180deg,#FF8CA0,#F2496B)' : 'linear-gradient(180deg,#FFFDF6,#F3E4C8)',
                boxShadow: '0 0 0 3px #3B2160, 0 5px 0 3px rgba(30,10,60,.35)',
              }}
            >
              <div className={`font-display text-[11px] font-bold uppercase tracking-wider ${urgent ? 'text-white/90' : 'text-[#8a6bb8]'}`}>
                {urgent ? 'Achtung – gleich!' : 'Nächster Angriff'}
              </div>
              <div className={`font-display text-[15px] font-bold leading-tight ${urgent ? 'text-white' : 'text-[#3B2160]'}`}>{atk.name}</div>
              <div className={`text-[11.5px] font-bold leading-tight ${urgent ? 'text-white/90' : 'text-[#6a5a8c]'}`}>{describeAttack(atk, difficulty)}</div>
              {boss.queuedAttack && <div className={`text-[10px] font-bold ${urgent ? 'text-white/90' : 'text-[#6a5a8c]'}`}>Danach: neue Phase</div>}
              <div className="mt-1 flex items-center gap-1" aria-label={`Angriff in ${boss.countdown} Wörtern`}>
                {Array.from({ length: rhythm }, (_, i) => (
                  <span
                    key={i}
                    className="h-2.5 flex-1 rounded-full"
                    style={{
                      background: i < rhythm - boss.countdown ? (urgent ? '#fff' : '#FF6B4A') : urgent ? 'rgba(255,255,255,.35)' : '#E6D6BE',
                      boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
                    }}
                  />
                ))}
              </div>
              <div className={`mt-0.5 text-[11px] font-bold ${urgent ? 'text-white' : 'text-[#6a5a8c]'}`}>
                {boss.countdown === 1 ? 'nach deinem nächsten Wort' : `in ${boss.countdown} Wörtern`}
              </div>
            </div>
            {/* tail */}
            <div
              className="absolute -left-2 bottom-5 h-4 w-4 rotate-45"
              style={{ background: urgent ? '#F2496B' : '#F6EAD6', boxShadow: '-3px 3px 0 0 #3B2160' }}
            />
          </motion.div>
        )}

        {/* telegraph shout */}
        <AnimatePresence>
          {telegraph && (
            <motion.div
              className="absolute left-1/2 top-1 z-10 -translate-x-1/2"
              initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <div className="ribbon whitespace-nowrap" style={{ background: 'linear-gradient(180deg,#FFB13D,#FF5C3B)', boxShadow: 'inset 0 -5px 0 #B8321A, 0 0 0 4px #3B2160' }}>
                <span className="text-pop-sm text-xl">{telegraph}!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  },
)

const PHASE_LABELS: Record<string, string[]> = {
  brutzel: ['', 'WÜTEND'],
  frostel: ['', 'SCHNEESTURM', 'LAWINE'],
}

export function BossHpBar({ boss, hp, armor }: { boss: BossState; hp: number; armor?: number }) {
  const def = BOSSES[boss.id]
  const phase = boss.phase ?? (boss.enraged ? 1 : 0)
  const label = PHASE_LABELS[boss.id]?.[phase] ?? (phase > 0 ? 'WÜTEND' : '')
  const frost = boss.id === 'frostel'
  const a = armor ?? boss.armor ?? 0
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
        <span className="text-pop-sm truncate text-lg leading-none">
          {def.name} <span className="text-sm" style={{ color: frost ? '#CDEBFF' : '#FFD9A8' }}>{def.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {a > 0 && (
            <span className="rounded-full bg-[#BFE6FF] px-2 py-0.5 text-[11px] font-extrabold leading-none text-[#1E4A7A] shadow-[0_0_0_2px_#3B2160]" title="Eispanzer">
              Panzer {a}
            </span>
          )}
          {label && <span className="text-pop-sm text-xs leading-none text-[#FFB0B0]" style={{ ['--stroke' as string]: '#7A0F2A' }}>{label}</span>}
        </span>
      </div>
      <Bar
        value={hp}
        max={boss.maxHp}
        colors={frost ? (phase > 0 ? ['#8FC8FF', '#3D6FD6'] : ['#B9E4FF', '#5FA8F0']) : phase > 0 ? ['#FF7A8A', '#D3123F'] : ['#FFB067', '#FF5C3B']}
        height={24}
      >
        <span className="text-pop-sm text-sm leading-none">
          <CountUp value={hp} duration={400} /> / {boss.maxHp}
        </span>
      </Bar>
    </div>
  )
}

// ---------------- Level goal ----------------

export function GoalCard({ level, current, target, score, movesLeft }: { level: LevelDef; current: number; target: number; score: number; movesLeft: number | null }) {
  const icon = <GoalIcon kind={level.goal.kind} size={30} />
  const label = GOAL_LABELS[level.goal.kind]
  const lowMoves = movesLeft !== null && movesLeft <= 3
  return (
    <div className="flex w-full items-stretch gap-2">
      <div className="panel-dark flex flex-1 items-center gap-2 px-3 py-2">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-extrabold uppercase tracking-wide text-white/70">{label}</span>
            <span className="text-pop-sm text-base leading-none">
              <CountUp value={current} duration={400} />/{target}
            </span>
          </div>
          <div className="mt-1.5">
            <Bar value={current} max={target} colors={['#7DF2B7', '#22C27C']} height={14} trail={false} />
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11.5px] font-extrabold text-white/75">
            <StarIcon size={13} /> Punkte: <CountUp value={score} duration={400} />
          </div>
        </div>
      </div>
      {movesLeft !== null && (
        <div className={`panel-dark flex w-[76px] shrink-0 flex-col items-center justify-center ${lowMoves ? 'anim-pulse' : ''}`}>
          <MovesIcon size={20} />
          <span className="text-pop text-3xl leading-none" style={lowMoves ? { ['--stroke' as string]: '#A8173F' } : undefined}>
            {movesLeft}
          </span>
          <span className="text-[10.5px] font-extrabold uppercase text-white/70">Züge</span>
        </div>
      )}
    </div>
  )
}

// ---------------- Word pill ----------------

export function WordPill({ word, valid, preview, mode, shakeKey, message, kind }: { word: string; valid: boolean; preview: number | null; mode: 'boss' | 'level'; shakeKey: number; message: string | null; kind?: WordKind | null }) {
  const has = word.length > 0
  return (
    <div className="flex h-[52px] items-center justify-center">
      <div
        key={shakeKey}
        className={`flex h-[46px] min-w-[150px] items-center justify-center gap-2 rounded-full px-5 ${shakeKey ? 'anim-nope' : ''}`}
        style={{
          background: valid ? 'linear-gradient(180deg,#8FFFC4,#2FCF8F)' : has ? 'linear-gradient(180deg,#FFFDF6,#F3E4C8)' : 'rgba(30,12,70,.45)',
          boxShadow: has ? '0 0 0 3px #3B2160, 0 5px 0 3px rgba(30,10,60,.35)' : 'inset 0 2px 6px rgba(0,0,0,.25)',
          transition: 'background .15s',
        }}
        aria-live="polite"
      >
        {message ? (
          <span className="font-display text-lg font-bold text-[#B3213F]">{message}</span>
        ) : has ? (
          <>
            <span className="font-display text-[26px] font-bold tracking-[0.12em] text-[#3B2160]">{word}</span>
            {valid && preview !== null && (
              <span className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-display text-base font-bold text-[#0c5a35]">
                {mode === 'boss' ? <SwordIcon size={16} /> : '+'}
                {mode === 'boss' ? preview : preview * 10}
              </span>
            )}
            {/* Secret status stays a surprise until the word is played. */}
            {valid && kind === 'target' && <span className="rounded-full bg-[#0E6B43] px-2 py-0.5 text-[11px] font-extrabold uppercase text-white">Ziel</span>}
            {valid && kind === 'repeat' && <span className="rounded-full bg-[#3B2160]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#3B2160]">schon gefunden</span>}
          </>
        ) : (
          <span className="font-display text-[15px] font-semibold text-white/70">Verbinde Buchstaben zu Wörtern</span>
        )}
      </div>
    </div>
  )
}

// ---------------- Player bar & items ----------------

export function itemCounter(item: ItemId, wordsPlayed: number): { now: number; of: number } | null {
  if (item === 'lightningCore') return { now: wordsPlayed % ITEM_VALUES.lightningCore.every, of: ITEM_VALUES.lightningCore.every }
  if (item === 'lifeCrystal') return { now: wordsPlayed % ITEM_VALUES.lifeCrystal.every, of: ITEM_VALUES.lifeCrystal.every }
  return null
}

export const PlayerBar = forwardRef<HTMLDivElement, { player: PlayerState | null; hp: number; items: ItemId[]; wordsPlayed: number; flash: ItemId | null; inCombat: boolean }>(
  function PlayerBar({ player, hp, items, wordsPlayed, flash, inCombat }, ref) {
    const [open, setOpen] = useState<ItemId | null>(null)
    return (
      <div ref={ref} className="relative w-full">
        <div className="panel-dark flex items-center gap-2 px-2.5 py-2">
          {player && (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <HeartIcon size={30} />
              <div className="min-w-0 flex-1">
                <Bar value={hp} max={player.maxHp} colors={hp / player.maxHp < 0.3 ? ['#FF8CA0', '#E0244F'] : ['#7DF2B7', '#22C27C']} height={20}>
                  <span className="text-pop-sm text-[13px] leading-none">
                    <CountUp value={hp} duration={400} /> / {player.maxHp}
                  </span>
                </Bar>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-1.5 ${player ? '' : 'w-full justify-center'}`}>
            {!player && <span className="mr-1 text-[12px] font-extrabold uppercase tracking-wide text-white/70">Ausrüstung</span>}
            {[0, 1, 2].map((slot) => {
              const id = items[slot]
              const ctr = id ? itemCounter(id, wordsPlayed) : null
              const passive = id ? ITEMS[id].combatOnly && !inCombat : false
              return (
                <button
                  key={slot}
                  type="button"
                  className="relative grid h-[50px] w-[50px] place-items-center rounded-[14px]"
                  style={{
                    background: id ? 'linear-gradient(180deg,#FFFDF6,#EBDDC4)' : 'rgba(255,255,255,.08)',
                    boxShadow: id ? `0 0 0 3px #3B2160, inset 0 -4px 0 #D5BF99${flash === id ? ', 0 0 18px 6px #FFE36B' : ''}` : 'inset 0 2px 6px rgba(0,0,0,.3)',
                    opacity: passive ? 0.55 : 1,
                    transform: flash === id ? 'scale(1.15)' : undefined,
                    transition: 'transform .2s var(--ease-pop), box-shadow .2s',
                  }}
                  onClick={() => id && setOpen(open === id ? null : id)}
                  data-item-slot={id}
                  aria-label={id ? `${ITEMS[id].name}: Details` : 'Leerer Slot'}
                  disabled={!id}
                >
                  {id && <ItemIcon id={id} size={38} />}
                  {ctr && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#3B2160] px-1.5 text-[10.5px] font-extrabold leading-[16px] text-white">
                      {ctr.now}/{ctr.of}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute bottom-[calc(100%+10px)] right-0 z-30 w-[260px] rounded-2xl bg-[#FFFDF6] p-3 text-left"
              style={{ boxShadow: '0 0 0 3px #3B2160, 0 6px 0 3px rgba(30,10,60,.35)' }}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              onClick={() => setOpen(null)}
            >
              <div className="font-display text-lg font-bold text-[#3B2160]">{ITEMS[open].name}</div>
              <ul className="mt-1 list-disc pl-4 text-[13px] font-bold leading-snug text-[#5b4a7c]">
                {ITEMS[open].rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="mt-2 text-[11.5px] font-bold text-[#8a7aa8]">Im Level nicht austauschbar.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  },
)

export const GOAL_LABELS: Record<LevelDef['goal']['kind'], string> = {
  score: 'Punkte',
  freeIce: 'Kristalle befreit',
  extinguish: 'Feuer gelöscht',
  boss: 'Boss',
  longWords: 'Lange Wörter (5+)',
  gold: 'Goldsteine',
  specials: 'Spezialsteine',
  secrets: 'Geheimwörter',
}

export function GoalIcon({ kind, size = 26 }: { kind: LevelDef['goal']['kind']; size?: number }) {
  switch (kind) {
    case 'freeIce':
      return <CrystalIcon size={size} />
    case 'extinguish':
      return <FlameIcon size={size} />
    case 'gold':
      return <CoinIcon size={size} />
    case 'specials':
      return (
        <span className="grid place-items-center rounded-full bg-[#6C4BEF] shadow-[0_0_0_2.5px_#3B2160]" style={{ width: size, height: size }}>
          <BoltBadge size={size * 0.7} />
        </span>
      )
    case 'longWords':
      return <SwordIcon size={size} />
    case 'secrets':
      return (
        <span className="grid place-items-center rounded-full bg-[#4A2FC0] font-display font-bold text-[#FFE39A] shadow-[0_0_0_2.5px_#3B2160]" style={{ width: size, height: size, fontSize: size * 0.55 }}>
          ?
        </span>
      )
    default:
      return <TargetIcon size={size} />
  }
}
