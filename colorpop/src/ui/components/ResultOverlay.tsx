import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { BOSSES, LEVELS } from '../../game/content'
import { ITEMS } from '../../game/items'
import { MOMENTS } from '../../game/moments'
import { levelFromXp, SKINS } from '../../game/progression'
import type { LevelReward, RunReward } from '../../game/save'
import type { GameState, LevelDef } from '../../game/types'
import { BossArt } from '../art/BossArt'
import { CoinIcon, ItemIcon, RetryIcon, StarIcon } from '../art/Icons'
import { Bar, Btn, CountUp } from './Common'

interface Props {
  state: GameState
  level: LevelDef
  stars: number
  reward: LevelReward | RunReward
  onRetry: () => void
  onContinue: () => void
  onMap: () => void
  reduced?: boolean
  /** Player XP after this run (for the level bar). */
  totalXp?: number
}

const TIPS = [
  'Lange Wörter verursachen überproportional viel Schaden – ab 6 Buchstaben gibt es Spezialsteine.',
  'Achte auf die Angriffsankündigung und plane dein nächstes Wort danach.',
  'Probiere eine andere Ausrüstung: Die Vorschau vor dem Kampf zeigt passende Konter.',
  'Seltene Buchstaben (Zahl unten rechts) zählen mehr – kombiniere sie in einem Wort.',
]

const isRun = (r: LevelReward | RunReward): r is RunReward => 'xp' in r

export function ResultOverlay({ state, level, stars, reward, onRetry, onContinue, onMap, reduced = false, totalXp = 0 }: Props) {
  const won = state.status === 'won'
  const boss = level.goal.kind === 'boss' ? BOSSES[level.goal.bossId] : null
  const [skipped, setSkipped] = useState(reduced)
  const delay = (seconds: number) => (skipped ? 0 : seconds)
  const run = isRun(reward) ? reward : null
  const levelUp = run && run.levelAfter > run.levelBefore
  useEffect(() => {
    if (won && !skipped) {
      const ts = [0, 1, 2].filter((i) => i < stars).map((i) => setTimeout(() => sfx.star(i), 180 + i * 180))
      if (levelUp) ts.push(setTimeout(() => sfx.moment(), 1100))
      return () => ts.forEach(clearTimeout)
    }
    if (!won) sfx.defeat()
  }, [won, skipped, stars, levelUp])

  const title = won ? (boss ? 'Sieg!' : 'Geschafft!') : boss ? 'Besiegt…' : 'Knapp vorbei!'
  const next = LEVELS.find((l) => l.index === level.index + 1)
  const prog = levelFromXp(totalXp)

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[#1a0c3a]/75 px-4 pb-6 pt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {won && !skipped && (
        <button type="button" aria-label="Überspringen" title="Sterne und Belohnungen sofort anzeigen" onClick={() => setSkipped(true)} className="fixed right-2 top-1 z-10 h-11 w-11 rounded-full bg-[#FFFDF6] text-xl font-bold text-[#6a5a8c]">
          »
        </button>
      )}
      <motion.div
        className="panel my-auto h-fit w-full max-w-[380px] px-5 pb-6 pt-10 text-center"
        initial={{ scale: 0.6, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="absolute -top-7 left-1/2 -translate-x-1/2">
          <div className="ribbon" style={won ? undefined : { background: 'linear-gradient(180deg,#A58BFF,#6C4BEF)', boxShadow: 'inset 0 -5px 0 #4123b0, 0 0 0 4px #3B2160' }}>
            <span className="text-pop whitespace-nowrap text-[30px]">{title}</span>
          </div>
        </div>

        {won ? (
          <div className="mb-1 mt-1 flex items-end justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={skipped ? false : { scale: 0, rotate: -60 }}
                animate={{ scale: i < stars ? 1 : 0.85, rotate: 0 }}
                transition={{ delay: delay(0.18 + i * 0.18), type: 'spring', stiffness: 400, damping: 12 }}
                style={{ marginBottom: i === 1 ? 14 : 0 }}
              >
                <StarIcon size={i === 1 ? 66 : 54} filled={i < stars} />
              </motion.div>
            ))}
          </div>
        ) : boss ? (
          <div className="flex justify-center">
            <BossArt id={boss.id} mood="taunt" size={110} />
          </div>
        ) : (
          <div className="mb-2 mt-1 flex items-end justify-center gap-2 opacity-80">
            {[0, 1, 2].map((i) => (
              <StarIcon key={i} size={i === 1 ? 60 : 50} filled={false} />
            ))}
          </div>
        )}

        {boss && won && (
          <div className="-mt-1 mb-1 flex justify-center">
            <BossArt id={boss.id} mood="defeated" size={86} />
          </div>
        )}

        <p className="font-display text-[15px] font-semibold text-[#5b4a7c]">
          {won
            ? boss
              ? `${boss.name} ist besiegt – ${level.name} gehört wieder dir!`
              : `${level.name} abgeschlossen!`
            : boss
              ? `${boss.name} grinst frech. Versuch es mit einer neuen Taktik!`
              : 'Dir sind die Züge ausgegangen – gleich nochmal?'}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-left">
          <Stat label="Punkte" value={state.score} />
          <Stat label="Stärkstes Wort" text={state.bestWord ? `${state.bestWord.word} (${state.bestWord.power})` : '–'} />
          <Stat label="Wörter" value={state.wordsPlayed} />
          <Stat label="Beste Combo" text={state.bestCombo > 1 ? `${state.bestCombo} in Folge` : '–'} />
        </div>
        <p className="mt-1.5 text-[12px] font-bold text-[#8a7aa8]">
          {state.targetsSolved} {state.targetsSolved === 1 ? 'Ziel' : 'Ziele'} · {state.secretsFound} {state.secretsFound === 1 ? 'Geheimwort' : 'Geheimwörter'} · {state.missionsCompleted}{' '}
          {state.missionsCompleted === 1 ? 'Mission' : 'Missionen'}
        </p>

        {/* Wortmeister moments */}
        {run && run.moments.length > 0 && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'linear-gradient(180deg,#3B2A9A,#2A1B6E)' }}>
            <div className="font-display text-xs font-bold uppercase tracking-widest text-[#FFE39A]">Wortmeister-Momente</div>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {run.moments.map((m, i) => (
                <motion.span
                  key={m}
                  className="rounded-full bg-[#FFD23F] px-2.5 py-1 font-display text-[13px] font-bold text-[#3B2160] shadow-[0_0_0_2px_#3B2160]"
                  initial={skipped ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: delay(0.6 + i * 0.12), type: 'spring', stiffness: 420, damping: 14 }}
                >
                  {MOMENTS[m].title.replace('!', '')} · +{MOMENTS[m].xp} XP
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* XP and player level */}
        {run && run.xp > 0 && (
          <div className="mt-3 rounded-2xl bg-[#3B2160]/[0.07] p-3 text-left">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[15px] font-bold text-[#3B2160]">Spielerlevel {prog.level}</span>
              <span className="font-display text-sm font-bold text-[#6C4BEF]">
                +<CountUp value={run.xp} duration={skipped ? 1 : 900} /> XP
              </span>
            </div>
            <div className="mt-1.5">
              <Bar value={prog.into} max={prog.need} colors={['#C4B2FF', '#6C4BEF']} height={14} trail={false} />
            </div>
            <div className="mt-1 text-[11.5px] font-bold text-[#8a7aa8]">{run.xpParts.map((p) => `${p.label} +${p.xp}`).join(' · ')}</div>
            {levelUp && (
              <motion.div
                className="mt-2 rounded-xl px-3 py-1.5 text-center"
                style={{ background: 'linear-gradient(180deg,#FFE36B,#FFB21E)', boxShadow: '0 0 0 2.5px #3B2160' }}
                initial={skipped ? false : { scale: 0, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: delay(1.0), type: 'spring', stiffness: 380, damping: 12 }}
              >
                <span className="font-display text-base font-bold text-[#5A2A00]">Levelaufstieg! Spielerlevel {run.levelAfter}</span>
              </motion.div>
            )}
          </div>
        )}

        {/* Rewards and unlocks (wrapping row – never overlaps) */}
        {(reward.coins > 0 || reward.item || (run && run.unlocks.length > 0)) && (
          <div className="mt-3 rounded-2xl bg-[#3B2160]/[0.07] p-3">
            <div className="font-display text-xs font-bold uppercase tracking-widest text-[#8a6bb8]">Belohnung</div>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              {reward.coins > 0 && (
                <motion.div className="flex items-center gap-1.5" initial={skipped ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: delay(0.72), type: 'spring' }}>
                  <CoinIcon size={30} />
                  <span className="font-display text-xl font-bold text-[#3B2160]">
                    +<CountUp value={reward.coins} duration={skipped ? 1 : 900} />
                  </span>
                </motion.div>
              )}
              {reward.item && <UnlockCard delay={delay(0.9)} skipped={skipped} icon={<ItemIcon id={reward.item} size={34} />} kicker="Neues Item!" name={ITEMS[reward.item].name} />}
              {run?.unlocks.map((u, i) =>
                u.kind === 'item' && u.item ? (
                  <UnlockCard key={i} delay={delay(1.1 + i * 0.1)} skipped={skipped} icon={<ItemIcon id={u.item} size={34} />} kicker={u.level ? `Level ${u.level}` : 'Erfolg'} name={ITEMS[u.item].name} />
                ) : u.kind === 'skin' && u.skin ? (
                  <UnlockCard key={i} delay={delay(1.1 + i * 0.1)} skipped={skipped} icon={<SkinSwatch id={u.skin} />} kicker="Steindesign" name={SKINS[u.skin].name} />
                ) : u.kind === 'achievement' ? (
                  <UnlockCard key={i} delay={delay(1.1 + i * 0.1)} skipped={skipped} icon={<StarIcon size={30} />} kicker="Erster Erfolg" name={`${u.label} +${u.coins}`} />
                ) : (
                  <UnlockCard key={i} delay={delay(1.1 + i * 0.1)} skipped={skipped} icon={<CoinIcon size={30} />} kicker={`Level ${u.level}`} name={u.label} />
                ),
              )}
            </div>
          </div>
        )}

        {!won && <p className="mt-3 text-[13px] font-bold leading-snug text-[#6a5a8c]">Tipp: {TIPS[state.wordsPlayed % TIPS.length]}</p>}

        <div className="mt-5 flex flex-col gap-2.5">
          {won ? (
            <>
              <Btn variant="green" onClick={onContinue}>
                {next ? 'Nächstes Level' : 'Zur Abenteuerkarte'}
              </Btn>
              <button type="button" className="min-h-11 font-bold text-[#6a5a8c]" onClick={onMap}>
                Zur Karte & Ausrüstung
              </button>
              <Btn variant="cream" size="sm" onClick={onRetry}>
                <RetryIcon size={20} /> Nochmal spielen
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="green" onClick={onRetry}>
                <RetryIcon size={22} /> Erneut versuchen
              </Btn>
              <Btn variant="cream" size="sm" onClick={onMap}>
                Zur Karte & Ausrüstung
              </Btn>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function UnlockCard({ icon, kicker, name, delay, skipped }: { icon: React.ReactNode; kicker: string; name: string; delay: number; skipped: boolean }) {
  return (
    <motion.div
      className="flex min-w-0 max-w-full items-center gap-2 rounded-xl bg-white px-2 py-1 shadow-[0_0_0_2.5px_#3B2160]"
      initial={skipped ? false : { scale: 0, rotate: 12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 12 }}
    >
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 text-left leading-tight">
        <div className="text-[10px] font-extrabold uppercase text-[#22A06B]">{kicker}</div>
        <div className="truncate font-display text-[13px] font-bold text-[#3B2160]">{name}</div>
      </div>
    </motion.div>
  )
}

export function SkinSwatch({ id, size = 30 }: { id: keyof typeof SKINS; size?: number }) {
  const c = SKINS[id].colors
  return (
    <span
      className="grid place-items-center rounded-[28%] font-display font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        color: c[4],
        background: `linear-gradient(180deg, ${c[0]}, ${c[1]} 55%, ${c[2]})`,
        boxShadow: `inset 0 -${size * 0.09}px 0 ${c[3]}, 0 0 0 2px #3B2160`,
      }}
    >
      A
    </span>
  )
}

function Stat({ label, value, text }: { label: string; value?: number; text?: string }) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-1.5 shadow-[inset_0_-3px_0_#E7D3B3]">
      <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#8a7aa8]">{label}</div>
      <div className="truncate font-display text-lg font-bold text-[#3B2160]">{text ?? <CountUp value={value ?? 0} duration={900} />}</div>
    </div>
  )
}
