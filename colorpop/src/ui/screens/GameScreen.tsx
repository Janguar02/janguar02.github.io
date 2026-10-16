import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/AppContext'
import { sfx } from '../../audio/sfx'
import { applyDifficulty, BOSSES, comboMultiplier, DIFFICULTIES, levelById, LEVELS } from '../../game/content'
import { COMMON_WORDS } from '../../game/data/commonWords'
import { activateBonus, bossAttackEvery, createGame, goalProgress, nextBossAttack, playWord, starsFor, tickBonus, withValidTargets, type TurnStep } from '../../game/engine'
import { ITEMS } from '../../game/items'
import { MOMENTS } from '../../game/moments'
import { SKINS } from '../../game/progression'
import type { MomentId } from '../../game/types'
import { wordFromPath } from '../../game/grid'
import { applyRunResult, clearRun, saveRun, type RunReward } from '../../game/save'
import { previewWordPower } from '../../game/scoring'
import { commonWordsOnBoard, findPath, findWords } from '../../game/solver'
import type { Board, GameState, ItemId, LevelDef } from '../../game/types'
import { Backdrop, type Theme } from '../art/Backdrop'
import type { BrutzelMood } from '../art/Brutzel'
import { GearIcon, SoundIcon } from '../art/Icons'
import { BoardView, emptyFx, type TileFx } from '../components/Board'
import { BonusBanner } from '../components/BonusBanner'
import { Btn, Modal, Toast } from '../components/Common'
import { BossHpBar, BossStage, GoalCard, PlayerBar, WordPill } from '../components/GameHud'
import { ComboMeter, TargetBar } from '../components/WordHud'
import { classifyWord } from '../../game/words'
import { Particles, type ParticlesHandle } from '../components/Particles'
import { ResultOverlay } from '../components/ResultOverlay'
import { QuestStrip } from '../components/QuestStrip'
import { applyPlaytestScenario } from '../../game/playtest'

interface Float {
  id: number
  text: string
  x: number
  y: number
  color: string
  size: number
  to?: { x: number; y: number }
}

interface Display {
  board: Board
  bossHp: number
  playerHp: number
  score: number
  targets: string[]
  combo: number
  solved: string | null
  armor: number
}

type BannerTone = 'praise' | 'secret' | 'rare' | 'blitz' | 'target' | 'muted'
const BANNER_STYLE: Record<BannerTone, { color: string; stroke: string; size: number }> = {
  praise: { color: '#FFE36B', stroke: '#B3213F', size: 40 },
  target: { color: '#8FFFC4', stroke: '#0E6B43', size: 34 },
  secret: { color: '#E5D9FF', stroke: '#4A2FC0', size: 38 },
  rare: { color: '#FFE36B', stroke: '#9A5A00', size: 44 },
  blitz: { color: '#FFF6A8', stroke: '#4123B0', size: 44 },
  muted: { color: '#E8E1F2', stroke: '#5B4880', size: 26 },
}

const THEMES: Record<string, Theme> = {
  l1: 'bonbon', l4: 'bonbon', l2: 'crystal', l5: 'menu', l3: 'ember', boss1: 'volcano',
  l6: 'ember', l7: 'crystal', l8: 'menu', l9: 'ember', l10: 'crystal', boss2: 'frost',
}

/** Phase-change announcement per boss. */
const PHASE_TEXT: Record<string, string[]> = {
  brutzel: ['', 'Brutzel wird wütend!'],
  frostel: ['', 'Schneesturm zieht auf!', 'Frostel ruft die Lawine!'],
}
const PRAISE: [number, string][] = [
  [8, 'WORTMEISTER!'],
  [7, 'WORTMEISTER!'],
  [6, 'Super!'],
  [5, 'Stark!'],
]

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let floatId = 1

function centerOf(el: Element | null | undefined): { x: number; y: number } | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
const tileEl = (id: number) => document.querySelector(`[data-tile-id="${id}"]`)

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

export function GameScreen({ levelId, resume }: { levelId: string; resume?: GameState }) {
  const { dict, save, updateSave, reduced, go, storage } = useApp()
  // The mode is fixed for the whole level (resumed runs keep their own mode).
  const [difficulty] = useState(() => resume?.difficulty ?? save.settings.difficulty)
  const level: LevelDef = useMemo(() => applyDifficulty(levelById(levelId), difficulty), [levelId, difficulty])
  const isBoss = level.goal.kind === 'boss'
  const hasTargets = DIFFICULTIES[difficulty].targets > 0
  const ctx = useMemo(() => ({ dict: dict! }), [dict])

  const [game, setGame] = useState<GameState>(() => {
    if (resume) return withValidTargets(resume)
    const initial = createGame(level, save.equipped, ctx, level.seed + Math.floor(Math.random() * 100000), difficulty)
    return import.meta.env.DEV ? applyPlaytestScenario(initial, new URLSearchParams(window.location.search).get('scenario')) : initial
  })
  const [disp, setDisp] = useState<Display | null>(null)
  const [busy, setBusy] = useState(false)
  const [selection, setSelection] = useState<number[]>([])
  const [fx, setFx] = useState<TileFx>(emptyFx)
  const [floats, setFloats] = useState<Float[]>([])
  const [mood, setMood] = useState<BrutzelMood>(game.boss?.enraged ? 'enraged' : 'idle')
  const [telegraph, setTelegraph] = useState<string | null>(null)
  const [attackStyle, setAttackStyle] = useState<'strike' | 'rain' | 'smoke'>('strike')
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'warn' | 'good' } | null>(null)
  const [questNotice, setQuestNotice] = useState<string | null>(null)
  const [nopeKey, setNopeKey] = useState(0)
  const [pillMsg, setPillMsg] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const boardImpact = useAnimationControls()
  const [hurt, setHurt] = useState(0)
  const [flashItem, setFlashItem] = useState<ItemId | null>(null)
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<{ stars: number; reward: RunReward } | null>(null)
  const [moment, setMoment] = useState<MomentId[] | null>(null)
  const [intro, setIntro] = useState(() => !resume && !!levelById(levelId).intro && !save.introsSeen.includes(levelId))
  const [praise, setPraise] = useState<{ text: string; tone: BannerTone; key: number } | null>(null)
  const [flash, setFlash] = useState(0)
  const [splash, setSplash] = useState<string | null>(null)
  const pendingResult = useRef<{ stars: number; reward: RunReward } | null>(null)
  const resultTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const finishCommitted = useRef(false)
  const [idleTick, setIdleTick] = useState(0)
  // First-run coach: shows a real, playable word with an animated hand.
  const [coach, setCoach] = useState(() => level.index === 1 && !save.tutorialSeen && !resume)
  const bossName = game.boss ? BOSSES[game.boss.id].name : ''
  const skin = SKINS[save.skin] ?? SKINS.cream

  const particles = useRef<ParticlesHandle>(null)
  const bossRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const alive = useRef(true)
  const busyRef = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimeout(resultTimer.current)
      clearTimeout(toastTimer.current)
    }
  }, [])

  const view: Display = disp ?? {
    board: game.board,
    bossHp: game.boss?.hp ?? 0,
    playerHp: game.player?.hp ?? 0,
    score: game.score,
    targets: game.targets,
    combo: game.combo,
    solved: null,
    armor: game.boss?.armor ?? 0,
  }

  // ----- layout -----
  const vp = useViewport()
  const compact = vp.h < 720
  const bossSize = vp.h < 680 ? (hasTargets ? 72 : 92) : compact ? (hasTargets ? 84 : 104) : hasTargets ? 120 : 136
  const hudH = isBoss ? bossSize + 34 + (compact ? 52 : 56) : 98
  const reserved = hudH + 58 + 76 + 92 + (hasTargets ? 42 : 0)
  const cell = Math.max(40, Math.floor(Math.min(Math.min(vp.w - 20, 480) / 6, (vp.h - reserved) / 6)))
  useEffect(() => {
    if (shake && !reduced) void boardImpact.start({ x: [0, -4, 4, -2, 0], transition: { duration: 0.25 } })
  }, [shake, reduced, boardImpact])

  // ----- helpers -----
  const showToast = useCallback((text: string, tone: 'info' | 'warn' | 'good' = 'info', ms = 1600) => {
    clearTimeout(toastTimer.current)
    setToast({ text, tone })
    toastTimer.current = setTimeout(() => alive.current && setToast(null), ms)
  }, [])
  const addFloat = useCallback((text: string, at: { x: number; y: number } | null, color: string, size = 30, to?: { x: number; y: number }) => {
    if (!at) return
    const f = { id: floatId++, text, x: at.x, y: at.y, color, size, to }
    setFloats((fs) => [...fs, f])
    setTimeout(() => alive.current && setFloats((fs) => fs.filter((x) => x.id !== f.id)), 1100)
  }, [])
  const T = useCallback((ms: number) => wait(reduced ? Math.round(ms * 0.35) : ms), [reduced])

  // ----- selection feedback -----
  const word = wordFromPath(view.board, selection.filter((i) => view.board[i]))
  const valid = selection.length >= 3 && !!dict?.has(word)
  const preview = useMemo(() => {
    if (!valid) return null
    return previewWordPower({ ...game, board: view.board }, selection).total
  }, [valid, selection, view.board, game])
  const selKind = valid ? classifyWord(word, game.targets, game.foundWords) : null

  const onSelection = useCallback(
    (next: number[]) => {
      setPillMsg(null)
      setIdleTick((t) => t + 1)
      setSelection((prev) => {
        if (next.length > prev.length) {
          sfx.select(next.length - 1)
          if (navigator.vibrate) navigator.vibrate(6)
        } else if (next.length < prev.length && next.length > 0) sfx.deselect()
        return next
      })
    },
    [],
  )

  const coachPath = useMemo(() => {
    if (!coach) return null
    const words = [...game.targets, ...commonWordsOnBoard(game.board, COMMON_WORDS).sort((a, b) => Math.abs(a.length - 4) - Math.abs(b.length - 4))]
    for (const w of words) {
      const p = findPath(game.board, w)
      if (p) return { word: w, path: p }
    }
    return null
  }, [coach, game.board, game.targets])
  const endCoach = useCallback(() => {
    setCoach(false)
    updateSave((s) => (s.tutorialSeen ? s : { ...s, tutorialSeen: true }))
  }, [updateSave])

  // ----- turn playback -----
  const playSteps = useCallback(
    async (prev: GameState, next: GameState, steps: TurnStep[]) => {
      let d: Display = {
        board: prev.board,
        bossHp: prev.boss?.hp ?? 0,
        playerHp: prev.player?.hp ?? 0,
        score: prev.score,
        targets: prev.targets,
        combo: prev.combo,
        solved: null,
        armor: prev.boss?.armor ?? 0,
      }
      const set = (patch: Partial<Display>) => {
        d = { ...d, ...patch }
        if (alive.current) setDisp(d)
      }
      set({})
      setQuestNotice(null)
      const rewardNotes: string[] = []
      let isEnraged = !!prev.boss?.enraged
      let shownMoments = false

      for (const step of steps) {
        if (!alive.current) return
        switch (step.type) {
          case 'word': {
            const pts = step.ids.map((id) => centerOf(tileEl(id))).filter(Boolean) as { x: number; y: number }[]
            const mid = pts.length ? { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length } : null
            const big = step.word.length >= 7
            const special = step.bonus || step.kind === 'rare' || step.kind === 'secret'
            const numColor = step.bonus || step.kind === 'rare' || step.kind === 'secret' ? '#FFE39A' : '#FFFFFF'
            const destination = step.kind === 'target' && !reduced ? centerOf(document.querySelector('[data-reward-goal]')) ?? undefined : undefined
            addFloat(isBoss ? `${step.power}` : `+${step.points}`, mid, numColor, big ? 42 : special ? 32 : 25, destination)
            if (step.kind === 'target') set({ solved: step.word })
            // Reward choreography by word class – the strongest message wins.
            const p = PRAISE.find(([n]) => step.word.length >= n)
            const banner: [string, BannerTone] | null = step.bonus
              ? ['BLITZWORT 3×!', 'blitz']
              : big
                ? ['WORTMEISTER!', 'rare']
              : step.combo >= 6 && step.combo % 3 === 0
                ? ['COMBO-KRAFT!', 'praise']
              : step.kind === 'rare'
                ? ['Seltener Fund!', 'rare']
                : step.kind === 'secret'
                  ? ['Geheimwort!', 'secret']
                  : p && step.word.length >= 6
                    ? [p[1], 'praise']
                    : step.kind === 'target'
                      ? ['Ziel!', 'target']
                      : step.kind === 'repeat'
                        ? ['Schon gefunden', 'muted']
                        : null
            if (banner) setPraise({ text: banner[0], tone: banner[1], key: Date.now() })
            if (step.bonus) sfx.bonus()
            else if (step.kind === 'rare') sfx.rare()
            else if (step.kind === 'secret') sfx.secret()
            else if (step.kind === 'target') sfx.target()
            else sfx.word(step.word.length)
            if (mid && special) {
              particles.current?.burst(mid.x, mid.y, ['#FFE39A', '#FFC46B', '#fff'], big || step.bonus ? 18 : 10, 4)
              if (big || step.bonus) particles.current?.ring(mid.x, mid.y, '#FFE36B', cell * 1.2)
            }
            if ((big || step.bonus) && !reduced) setFlash((f) => f + 1)
            if (step.coins > 0) setTimeout(() => alive.current && addFloat(`+${step.coins} Münzen`, mid ? { x: mid.x, y: mid.y + 34 } : null, '#FFD34D', 22), 160)
            if (step.combo > d.combo && comboMultiplier(step.combo) > 1) {
              sfx.comboUp(Math.min(6, step.combo))
              if (step.combo >= 6 && step.combo % 3 === 0) setShake(s => s + 1)
            }
            set({ score: d.score + step.points, combo: step.combo })
            await T(big || special ? 250 : 150)
            break
          }
          case 'energy':
            if (step.charged) {
              rewardNotes.push('Blitzstein verdient')
              setQuestNotice(rewardNotes.join(' · '))
            }
            else addFloat(`+${step.amount} Energie`, centerOf(document.querySelector('[data-board]')), '#CFC1FF', 19)
            break
          case 'mission':
            sfx.coin()
            rewardNotes.push(`Mission +${step.coins} Münzen`)
            setQuestNotice(rewardNotes.join(' · '))
            break
          case 'clear': {
            setFx((f) => ({ ...f, popping: new Set(step.wordIds), zapped: new Set(step.specialIds), popOrder: new Map(step.wordIds.map((id, k) => [id, k])) }))
            sfx.pop(step.wordIds.length)
            for (const id of step.wordIds) {
              const c = centerOf(tileEl(id))
              if (c) particles.current?.burst(c.x, c.y, ['#FFE36B', '#8FF0D2', '#fff'], 4, 3)
            }
            if (step.fusion) setPraise({ text: 'KREUZSCHLAG!', tone: 'blitz', key: Date.now() })
            for (const t of step.triggered) {
              const c = centerOf(tileEl(t.id))
              if (!c) continue
              if (t.kind === 'bomb') {
                sfx.bomb()
                particles.current?.ring(c.x, c.y, '#FF6F86', cell * 0.9)
                particles.current?.burst(c.x, c.y, ['#FF6F86', '#FFC93D', '#fff'], 22, 8)
              } else {
                sfx.zap()
                particles.current?.ring(c.x, c.y, '#B9A2FF', cell * 0.7)
                for (let k = -3; k <= 3; k++) particles.current?.burst(c.x + k * cell, c.y, ['#D9CCFF', '#fff', '#FFE36B'], 4, 3)
                if (step.fusion) for (let k = -3; k <= 3; k++) particles.current?.burst(c.x, c.y + k * cell, ['#FFE36B', '#fff'], 3, 3)
              }
            }
            for (const id of step.unblockedIds) {
              const c = centerOf(tileEl(id))
              if (c) particles.current?.burst(c.x, c.y, ['#C9F1FF', '#fff', '#9AD8FF'], 12, 5)
            }
            if (step.triggered.length) setShake((s) => s + 1)
            await T((step.triggered.length ? 330 : 200) + (reduced ? 0 : Math.min(8, step.wordIds.length) * 25))
            break
          }
          case 'board': {
            set({ board: step.board })
            setFx((f) => ({ ...f, popping: new Set(), zapped: new Set(), magic: new Set(step.spawned.map((s) => s.id)) }))
            await T(60)
            sfx.fall()
            setTimeout(() => alive.current && sfx.land(), reduced ? 80 : 330)
            if (step.spawned.some((s) => s.kind !== 'gold')) setTimeout(() => sfx.magic(), 200)
            await T(420)
            break
          }
          case 'coins': {
            sfx.coin()
            addFloat(`+${step.amount} Münzen`, centerOf(document.querySelector('[data-board]')), '#FFD34D', 24)
            await T(120)
            break
          }
          case 'item': {
            // Every item that actually helped this turn lights up its slot.
            setFlashItem(step.item)
            const at = centerOf(document.querySelector(`[data-item-slot="${step.item}"]`)) ?? centerOf(playerRef.current)
            const name = ITEMS[step.item].name
            if (step.item === 'lightningCore') {
              sfx.zap()
              addFloat(`${name} +${step.amount}`, at, '#D9CCFF', 20)
            } else if (step.item === 'lifeCrystal') {
              addFloat(name, at, '#FFB3CF', 20)
            } else if (step.item === 'shield') {
              addFloat(`Schild −${step.amount}`, at, '#7FE6CC', 20)
            } else if (step.item === 'comboBell') {
              sfx.comboUp(4)
              addFloat('Combo gehalten', at, '#FFD27A', 20)
            } else {
              sfx.equip()
              addFloat(`${name} +${step.amount}`, at, ITEMS[step.item].accent, 19)
            }
            await T(step.item === 'lightningCore' || step.item === 'lifeCrystal' ? 380 : 220)
            setFlashItem(null)
            break
          }
          case 'armor': {
            const c = centerOf(bossRef.current)
            set({ armor: step.left })
            if (step.broken) {
              sfx.shatter()
              if (c) {
                particles.current?.burst(c.x, c.y, ['#DDF4FF', '#9AD8FF', '#fff'], 28, 8)
                particles.current?.ring(c.x, c.y, '#BFE6FF', cell * 1.6)
              }
              setMood('stagger')
              if (step.stunned) showToast(`Panzer zerbrochen – ${bossName} ist betäubt!`, 'good', 1600)
              await T(420)
            } else {
              sfx.tick()
              if (c) addFloat(`Panzer −${step.absorbed}`, { x: c.x - 30, y: c.y - 40 }, '#BFE6FF', 24)
              await T(200)
            }
            break
          }
          case 'moment': {
            // Top celebration tier – rare by design (each at most once per run).
            // All moments of one turn share a single card, strongest first.
            if (shownMoments) break
            shownMoments = true
            const all = steps.filter((x): x is Extract<TurnStep, { type: 'moment' }> => x.type === 'moment').map((x) => x.id)
            all.sort((a, b) => MOMENTS[b].xp - MOMENTS[a].xp)
            setPraise(null)
            setMoment(all)
            sfx.moment()
            if (!reduced) {
              particles.current?.confetti(60)
              setFlash((f) => f + 1)
            }
            await T(1500)
            setMoment(null)
            break
          }
          case 'bossDamage': {
            setMood(step.amount >= 25 ? 'stagger' : 'hit')
            sfx.bossHit(step.amount >= 15)
            const c = centerOf(bossRef.current)
            if (c) {
              addFloat(`−${step.amount}`, { x: c.x + 30, y: c.y - 30 }, '#FFE36B', 34 + Math.min(24, step.amount))
              particles.current?.burst(c.x, c.y, ['#FFB067', '#FFE36B', '#fff'], 14 + Math.min(20, step.amount), 6)
            }
            set({ bossHp: step.hp })
            await T(step.amount >= 25 ? 480 : 300)
            setMood(step.hp <= 0 ? 'defeated' : isEnraged ? 'enraged' : 'idle')
            break
          }
          case 'heal': {
            sfx.heal()
            const c = centerOf(playerRef.current)
            addFloat(`+${step.amount} LP`, c, '#7DF2B7', 28)
            if (c) particles.current?.sparkle(c.x - 60, c.y, 12)
            set({ playerHp: step.hp })
            await T(420)
            break
          }
          case 'enrage': {
            isEnraged = true
            setMood('enraged')
            sfx.windup()
            showToast(PHASE_TEXT[next.boss!.id]?.[step.phase] ?? `${bossName} wird wütend!`, 'warn', 1400)
            setShake((s) => s + 1)
            await T(900)
            break
          }
          case 'bossAttack': {
            const atk = BOSSES[next.boss!.id].attacks[step.attackId]
            setAttackStyle(atk.sootTiles ? 'smoke' : atk.fireTiles || atk.iceTiles ? 'rain' : 'strike')
            setMood('windup')
            setTelegraph(atk.name)
            sfx.windup()
            await T(380)
            setMood(atk.sootTiles ? 'smoke' : atk.fireTiles || atk.iceTiles ? 'rain' : 'attack')
            if (atk.armor) {
              sfx.magic()
              set({ armor: next.boss?.armor ?? 0 })
            }
            setTelegraph(null)
            sfx.bossAttack()
            setShake((s) => s + 1)
            setHurt((h) => h + 1)
            const c = centerOf(playerRef.current)
            if (step.damage > 0) addFloat(`−${step.damage}`, c ? { x: c.x - 40, y: c.y - 20 } : null, '#FF7A8A', 40)
            set({ playerHp: step.hp, board: step.board })
            if (step.affectedIds.length) {
              sfx.ignite()
              setFx((f) => ({ ...f, ignite: new Set(step.affectedIds) }))
            }
            await T(450)
            setMood(step.hp <= 0 ? 'taunt' : isEnraged ? 'enraged' : 'idle')
            break
          }
          case 'fireSpread': {
            sfx.ignite()
            set({ board: step.board })
            setFx((f) => ({ ...f, ignite: new Set(step.ids) }))
            for (const id of step.ids) {
              const c = centerOf(tileEl(id))
              if (c) particles.current?.burst(c.x, c.y, ['#FF7A2E', '#FFD23F'], 8, 3)
            }
            await T(420)
            break
          }
          case 'rescue': {
            sfx.magic()
            showToast(step.action === 'shuffle' ? 'Neu gemischt – gratis!' : 'Frische Buchstaben – gratis!', 'good', 1500)
            set({ board: step.board })
            setFx((f) => ({ ...f, magic: new Set(step.action === 'shuffle' ? step.board.map((t) => t.id) : step.changedIds) }))
            await T(850)
            break
          }
          case 'bonusResult': {
            if (!step.success) showToast('Blitzwort nicht mehr möglich', 'info', 1300)
            await T(120)
            break
          }
          case 'stun': {
            setMood('hit')
            showToast(`${bossName} ist betäubt – Angriff verzögert!`, 'good', 1500)
            const c = centerOf(bossRef.current)
            if (c) particles.current?.sparkle(c.x, c.y - 40, 14)
            await T(520)
            setMood(isEnraged ? 'enraged' : 'idle')
            break
          }
          case 'targets': {
            set({ targets: step.targets, solved: null, board: step.board })
            if (step.injectedIds.length) setFx((f) => ({ ...f, magic: new Set(step.injectedIds) }))
            if (step.added.length) sfx.select(6)
            await T(step.injectedIds.length ? 420 : 200)
            break
          }
          case 'bonusStart':
            break
          case 'end':
            await T(450)
            break
        }
      }
      if (!alive.current) return
      setFx((f) => ({ ...f, ignite: new Set(), magic: new Set() }))
      setDisp(null)
      setGame(next)
    },
    [T, addFloat, cell, isBoss, showToast, reduced, bossName],
  )

  const finishLevel = useCallback(
    (final: GameState) => {
      if (finishCommitted.current) return
      finishCommitted.current = true
      clearRun(storage)
      const won = final.status === 'won'
      const stars = starsFor(final, level)
      // One application per finished run: level result, XP, level-ups, achievements.
      const r = applyRunResult(save, final, level, won, stars)
      updateSave(() => r.save)
      pendingResult.current = { stars, reward: r.reward }
      if (won) {
        // Big victory moment before the result panel.
        setSplash(isBoss ? `${bossName} besiegt!` : 'Level geschafft!')
        sfx.bigWin()
        particles.current?.confetti(70)
      }
      resultTimer.current = setTimeout(
        () => {
          if (!alive.current) return
          setSplash(null)
          setResult({ stars, reward: r.reward })
        },
        won ? (reduced ? 150 : 950) : reduced ? 150 : 450,
      )
    },
    [level, reduced, save, storage, updateSave, isBoss, bossName],
  )

  const submit = useCallback(
    async (path: number[]) => {
      if (busyRef.current || !dict) return
      const prev = game
      const res = playWord(prev, path, level, ctx)
      if (!res.ok) {
        sfx.invalid()
        setNopeKey((k) => k + 1)
        setPillMsg(res.reason === 'not-a-word' ? 'Kein Wort im Wörterbuch' : 'Ungültige Verbindung')
        setTimeout(() => {
          if (!alive.current) return
          setSelection([])
          setPillMsg(null)
        }, 650)
        return
      }
      busyRef.current = true
      setBusy(true)
      setSelection([])
      if (coach) endCoach()
      await playSteps(prev, res.state, res.steps)
      if (!alive.current) return
      busyRef.current = false
      setBusy(false)
      setIdleTick((t) => t + 1)
      if (res.state.status !== 'playing') {
        finishLevel(res.state)
        return
      }
      saveRun(storage, res.state)
      if (res.state.bonus?.phase === 'intro') {
        sfx.bonus()
        // Countdown starts once the banner has landed and the board is playable.
        await T(900)
        if (alive.current) setGame((g) => activateBonus(g))
      }
    },
    [ctx, dict, finishLevel, game, level, playSteps, storage, T, coach, endCoach],
  )

  // Resumed run whose bonus was mid-intro: activate it.
  useEffect(() => {
    if (game.bonus?.phase === 'intro' && !busy) {
      const t = setTimeout(() => alive.current && setGame((g) => activateBonus(g)), 900)
      return () => clearTimeout(t)
    }
  }, [game.bonus?.phase, busy])

  // ----- bonus countdown: only while idle, visible and not paused -----
  useEffect(() => {
    if (!game.bonus || game.bonus.phase !== 'active' || busy || paused || result) return
    let last = performance.now()
    let lastSec = -1
    const id = setInterval(() => {
      const now = performance.now()
      const dt = now - last
      last = now
      if (document.visibilityState !== 'visible') return
      setGame((g) => {
        const n = tickBonus(g, dt)
        if (g.bonus && !n.bonus) setTimeout(() => alive.current && showToast('Blitzwort verpasst – kein Problem!', 'info', 1400), 0)
        if (n.bonus) {
          const s = Math.ceil(n.bonus.msLeft / 1000)
          if (s !== lastSec && s <= 3) sfx.tick()
          lastSec = s
        }
        return n
      })
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- msLeft is read via setGame, not a trigger
  }, [game.bonus?.phase, game.bonus?.word, busy, paused, result, showToast])

  // ----- gentle hint after inactivity (levels and boss) -----
  useEffect(() => {
    setFx((f) => (f.hint.size ? { ...f, hint: new Set() } : f))
    if (busy || paused || result || game.status !== 'playing' || coach) return
    const t = setTimeout(() => {
      if (!alive.current) return
      const words = commonWordsOnBoard(game.board, COMMON_WORDS).sort((a, b) => a.length - b.length)
      const target = game.bonus?.word ?? game.targets[0] ?? words[0]
      const path = target ? findPath(game.board, target) : null
      const n = hasTargets ? 2 : 1
      if (path) setFx((f) => ({ ...f, hint: new Set(path.slice(0, n).map((i) => game.board[i].id)) }))
    }, hasTargets ? 14000 : 25000)
    return () => clearTimeout(t)
  }, [idleTick, busy, paused, result, game.board, game.status, game.bonus?.word, coach, game.targets, hasTargets])

  // praise banner auto-hide
  useEffect(() => {
    if (!questNotice) return
    const t = setTimeout(() => setQuestNotice(null), 1800)
    return () => clearTimeout(t)
  }, [questNotice])

  useEffect(() => {
    if (!praise) return
    const t = setTimeout(() => setPraise(null), praise.tone === 'muted' ? 800 : 1150)
    return () => clearTimeout(t)
  }, [praise])

  // persist the run immediately (also covers resumed runs)
  useEffect(() => {
    if (game.status === 'playing') saveRun(storage, game)
  }, [game, storage])

  // Dev-only hook for automated play-testing (stripped from production builds).
  useEffect(() => {
    if (!import.meta.env.DEV || !dict) return
    const w = window as unknown as Record<string, unknown>
    w.__cpq = {
      state: () => game,
      busy: () => busyRef.current,
      words: () => [...findWords(game.board, dict).entries()].map(([word, path]) => ({ word, path })),
      play: (path: number[]) => submit(path),
      set: (fn: (g: GameState) => GameState) => setGame(fn),
    }
  }, [game, dict, submit])

  const restart = () => {
    clearRun(storage)
    go({ name: 'game', levelId: level.id, key: Date.now() })
  }

  const prog = goalProgress(game, level)
  const dispProg = disp ? goalProgress({ ...game, score: view.score }, level) : prog
  const nextAtk = nextBossAttack(game)

  return (
    <div data-game-status={game.status} className="relative mx-auto flex h-full min-h-[100dvh] max-w-[520px] flex-col items-center overflow-hidden px-2.5 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
      <Backdrop theme={THEMES[level.id] ?? 'menu'} />
      {/* hurt vignette */}
      <AnimatePresence>
        {hurt > 0 && (
          <motion.div
            key={hurt}
            className="pointer-events-none fixed inset-0 z-30"
            style={{ boxShadow: 'inset 0 0 120px 30px rgba(255,40,70,.55)' }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      {/* white flash for big moments */}
      {flash > 0 && <div key={flash} className="flash-white pointer-events-none fixed inset-0 z-30 bg-white" />}

      {/* top bar */}
      <div data-reward-goal={isBoss ? true : undefined} className="relative z-10 flex w-full items-center gap-2">
        <Btn variant="cream" size="round" onClick={() => setPaused(true)} label="Pause">
          <GearIcon size={24} className="text-[#A58BFF]" />
        </Btn>
        {isBoss && game.boss ? (
          <div className="min-w-0 flex-1">
            <BossHpBar boss={game.boss} hp={view.bossHp} armor={view.armor} />
          </div>
        ) : (
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/70">
              Level {level.index} · {DIFFICULTIES[difficulty].label}
            </div>
            <div className="text-pop-sm truncate text-xl leading-tight">{level.name}</div>
          </div>
        )}
        {!isBoss && <div className="w-12" />}
      </div>

      {/* HUD */}
      <div data-reward-goal={!isBoss ? true : undefined} className="relative z-10 mt-2 w-full">
        {isBoss && game.boss ? (
          <BossStage ref={bossRef} boss={{ ...game.boss, armor: view.armor }} hp={view.bossHp} mood={mood} nextAttack={nextAtk} size={bossSize} telegraph={telegraph} difficulty={difficulty} attackStyle={attackStyle} every={bossAttackEvery(BOSSES[game.boss.id], game.equipped)} />
        ) : (
          <GoalCard level={level} current={dispProg.current} target={dispProg.target} score={view.score} movesLeft={game.movesLeft} />
        )}
      </div>

      {/* visible target words */}
      {hasTargets && (
        <div className="relative z-20 mt-1 w-full">
          <TargetBar targets={view.targets} current={selection.length ? word : ''} solved={view.solved} />
        </div>
      )}

      {/* word pill and blitz bar share one row → no layout jumps */}
      <div className="relative z-20 mt-1.5 flex w-full shrink-0 items-center" style={{ height: compact ? 44 : 56 }}>
        <AnimatePresence mode="wait" initial={false}>
          {game.bonus && selection.length === 0 && !pillMsg ? (
            <BonusBanner key={'b' + game.bonus.word} bonus={game.bonus} paused={busy || paused} boss={isBoss} />
          ) : (
            <motion.div key="pill" className="w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <WordPill word={word} valid={valid} preview={preview} mode={isBoss ? 'boss' : 'level'} shakeKey={nopeKey} message={pillMsg} kind={selKind} />
            </motion.div>
          )}
        </AnimatePresence>
        {game.bonus && selection.length > 0 && (
          <div className="pointer-events-none absolute -top-1 right-0 rounded-full bg-[#FFC93D] px-2 py-0.5 font-display text-[12px] font-bold text-[#3B2160] shadow-[0_0_0_2.5px_#3B2160]">
            Blitz {game.bonus.word} · {Math.ceil(game.bonus.msLeft / 1000)}s
          </div>
        )}
        <ComboMeter combo={view.combo} />
        <AnimatePresence>
          {praise && (
            <motion.div
              key="reward-banner"
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 16 }}
            >
              <motion.span
                key={praise.key}
                className="text-pop inline-block whitespace-nowrap"
                initial={reduced ? false : { scale: 0.92 }}
                animate={{ scale: 1 }}
                style={{ ['--stroke' as string]: BANNER_STYLE[praise.tone].stroke, color: BANNER_STYLE[praise.tone].color, fontSize: Math.min(BANNER_STYLE[praise.tone].size, (Math.min(vp.w, 520) - 36) / Math.max(8, praise.text.length * 0.69)) }}
              >
                {praise.text}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-1 w-full"><QuestStrip state={game} notice={questNotice} /></div>

      {/* board */}
      <div className="relative z-10 mt-1 flex flex-1 items-start justify-center">
        <motion.div animate={boardImpact} data-impact={shake}>
          <div
            data-board
            className="relative rounded-[26px] p-2"
            style={{
              ['--tile-top' as string]: skin.colors[0],
              ['--tile-mid' as string]: skin.colors[1],
              ['--tile-bot' as string]: skin.colors[2],
              ['--tile-edge' as string]: skin.colors[3],
              ['--tile-ink' as string]: skin.colors[4],
              background: 'linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.08))',
              boxShadow: '0 0 0 4px #3B2160, inset 0 2px 0 rgba(255,255,255,.35), 0 10px 0 4px rgba(30,10,60,.35), 0 20px 40px rgba(20,5,40,.35)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <BoardView
              board={view.board}
              cell={cell}
              selection={selection}
              selectionValid={valid}
              fx={fx}
              disabled={busy || paused || !!result || intro || game.status !== 'playing'}
              reduced={reduced}
              onSelection={onSelection}
              onSubmit={submit}
              onInvalidTouch={() => showToast('Blockiert – befreie den Stein mit einem Wort daneben', 'info', 1700)}
            />
            {coach && !intro && coachPath && selection.length === 0 && !busy && <CoachHand path={coachPath.path} cell={cell} reduced={reduced} />}
          </div>
        </motion.div>
      </div>

      {/* player / items */}
      <div className="relative z-10 mt-2 w-full">
        <AnimatePresence>
          {coach && !intro && coachPath && (
            <motion.div
              className="absolute inset-x-0 bottom-[calc(100%+8px)] z-30 flex items-center gap-3 rounded-2xl bg-[#FFFDF6] px-3 py-2.5"
              style={{ boxShadow: '0 0 0 3px #3B2160, 0 6px 0 3px rgba(30,10,60,.35)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="min-w-0 flex-1 text-[13.5px] font-bold leading-snug text-[#3B2160]">
                Ziehe über benachbarte Buchstaben – auch diagonal. Probier's: <span className="rounded bg-[#FFE36B] px-1 font-display tracking-wider">{coachPath.word}</span>
                <div className="mt-0.5 text-[12px] text-[#6a5a8c]">Tipp: Du kannst Steine auch einzeln antippen.</div>
              </div>
              <Btn variant="cream" size="sm" onClick={endCoach}>
                OK
              </Btn>
            </motion.div>
          )}
        </AnimatePresence>
        <PlayerBar ref={playerRef} player={game.player} hp={view.playerHp} items={game.equipped} wordsPlayed={game.wordsPlayed} flash={flashItem} inCombat={isBoss} />
      </div>

      {/* floating numbers */}
      <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
        <AnimatePresence>
          {floats.map((f) => (
            <motion.div
              key={f.id}
              className="text-pop absolute whitespace-nowrap"
              style={{ left: f.x, top: f.y, fontSize: f.size, color: f.color }}
              initial={{ x: '-50%', y: '-50%', scale: 0.4, opacity: 0 }}
              animate={f.to ? { x: f.to.x - f.x, y: f.to.y - f.y, scale: 0.55, opacity: [0, 1, 1, 0] } : { y: '-170%', scale: 1, opacity: [0, 1, 1, 0] }}
              transition={{ duration: reduced ? 0.6 : 1.05, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Particles ref={particles} disabled={reduced} />
      <Toast text={toast?.text ?? null} tone={toast?.tone} />

      {/* pause */}
      <Modal open={paused} onClose={() => setPaused(false)}>
        <div className="panel px-5 pb-5 pt-9 text-center">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <div className="ribbon" style={{ background: 'linear-gradient(180deg,#A58BFF,#6C4BEF)', boxShadow: 'inset 0 -5px 0 #4123b0, 0 0 0 4px #3B2160' }}>
              <span className="text-pop-sm text-2xl">Pause</span>
            </div>
          </div>
          <p className="font-display text-[15px] font-semibold text-[#5b4a7c]">
            {level.name} – {isBoss ? 'Timer und Angriffe ruhen.' : 'Der Bonus-Timer ist angehalten.'}
          </p>
          <details className="mt-3 rounded-xl bg-[#3B2160]/5 p-2 text-left text-xs font-bold text-[#5b4a7c]">
            <summary className="min-h-8 cursor-pointer">Spezialsteine & Energie</summary>
            <p>Neue Wörter: 6 Buchstaben → Bombe (Nachbarn), 7 → Blitz (Reihe), ab 8 → beide. Erst in einem späteren Wort lösen sie aus.</p>
            <p className="mt-1">Bombe + Blitz im selben Wort: zusätzlich die Blitz-Spalte. Gold: +2 Kraft und +10 Münzen.</p>
            <p className="mt-1">Lange oder seltene Wörter: +2 Energie. Jede dritte Combo-Stufe: +1. Bei 6 Energie entsteht ein weiterer Blitzstein. Wiederholungen laden keine Energie.</p>
          </details>
          <div className="mt-4 flex justify-center gap-3">
            <Btn
              variant="cream"
              size="sm"
              onClick={() => updateSave((s) => ({ ...s, settings: { ...s.settings, sound: !s.settings.sound } }))}
              label="Sound umschalten"
            >
              <SoundIcon size={22} on={save.settings.sound} className="text-[#6C4BEF]" /> {save.settings.sound ? 'Ton an' : 'Ton aus'}
            </Btn>
            <Btn
              variant="cream"
              size="sm"
              onClick={() => updateSave((s) => ({ ...s, settings: { ...s.settings, motion: reduced ? 'full' : 'reduced' } }))}
            >
              {reduced ? 'Animation: reduziert' : 'Animation: voll'}
            </Btn>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <Btn variant="green" onClick={() => setPaused(false)}>
              Weiterspielen
            </Btn>
            <Btn variant="cream" size="sm" onClick={restart}>
              Level neu starten
            </Btn>
            <Btn variant="berry" size="sm" onClick={() => go({ name: 'map', focus: level.id })}>
              Zur Karte (Fortschritt bleibt gespeichert)
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Wortmeister moment – rare top-tier celebration */}
      <AnimatePresence>
        {moment && (
          <motion.button
            type="button"
            key={moment.join()}
            className="fixed inset-x-0 top-[30%] z-[46] mx-auto flex w-[min(92vw,380px)] flex-col items-center rounded-[26px] px-4 pb-4 pt-6 text-center"
            style={{ background: 'linear-gradient(180deg,#3B2A9A,#2A1B6E)', boxShadow: '0 0 0 4px #FFD23F, 0 0 0 8px #3B2160, 0 14px 40px rgba(10,0,30,.6)' }}
            initial={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            onClick={() => setMoment(null)}
            aria-live="assertive"
          >
            <span className="absolute -top-4 rounded-full bg-[#FFD23F] px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-[#3B2160] shadow-[0_0_0_3px_#3B2160]">
              Wortmeister-Moment
            </span>
            <span className="text-pop text-[38px] leading-tight" style={{ color: '#FFE36B', ['--stroke' as string]: '#7A3B00' }}>
              {MOMENTS[moment[0]].title}
            </span>
            <span className="mt-1 text-[14px] font-bold leading-snug text-white/90">{MOMENTS[moment[0]].text}</span>
            {moment.length > 1 && (
              <span className="mt-2 flex flex-wrap justify-center gap-1">
                {moment.slice(1).map((m) => (
                  <span key={m} className="rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-extrabold text-white">
                    + {MOMENTS[m].title.replace('!', '')}
                  </span>
                ))}
              </span>
            )}
            <span className="mt-2 font-display text-sm font-bold text-[#FFE39A]">+{moment.reduce((n, m) => n + MOMENTS[m].xp, 0)} XP</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* new mechanic intro card (once per level) */}
      <Modal open={intro && !result} onClose={() => undefined}>
        {level.intro && (
          <div className="panel px-5 pb-5 pt-9 text-center">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="ribbon" style={{ background: 'linear-gradient(180deg,#7DF2B7,#22C27C)', boxShadow: 'inset 0 -5px 0 #128556, 0 0 0 4px #3B2160' }}>
                <span className="text-pop-sm whitespace-nowrap text-xl">Neu</span>
              </div>
            </div>
            <h2 className="font-display text-[22px] font-bold text-[#3B2160]">{level.intro.title}</h2>
            <p className="mt-2 text-[15px] font-bold leading-snug text-[#5b4a7c]">{level.intro.text}</p>
            <p className="mt-3 rounded-xl bg-[#3B2160]/[0.06] px-3 py-2 text-[13px] font-extrabold text-[#3B2160]">Ziel: {level.subtitle}</p>
            <Btn
              variant="green"
              className="mt-4 w-full"
              onClick={() => {
                setIntro(false)
                updateSave((s) => (s.introsSeen.includes(level.id) ? s : { ...s, introsSeen: [...s.introsSeen, level.id] }))
              }}
            >
              Los geht's
            </Btn>
          </div>
        )}
      </Modal>

      {/* big victory moment */}
      <AnimatePresence>
        {splash && (
          <motion.div
            className="fixed inset-0 z-[45] grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 bg-[#1a0c3a]/45" />
            <div
              className="anim-spin-slow absolute left-1/2 top-1/2 h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2 opacity-25"
              style={{ background: 'repeating-conic-gradient(from 0deg, #FFE36B 0deg 8deg, transparent 8deg 24deg)' }}
            />
            <motion.div
              className="relative text-center"
              initial={{ scale: 3, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            >
              <div className="text-pop text-[52px] leading-none" style={{ color: '#FFE36B', ['--stroke' as string]: '#B3213F' }}>
                {splash}
              </div>
              <button type="button" className="mt-6 min-h-11 rounded-full bg-[#FFFDF6] px-5 font-bold text-[#3B2160]" onClick={() => {
                clearTimeout(resultTimer.current)
                setSplash(null)
                setResult(pendingResult.current)
              }}>Zur Auswertung</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <ResultOverlay
          state={game}
          level={level}
          stars={result.stars}
          reward={result.reward}
          onRetry={restart}
          onContinue={() => {
            const next = LEVELS.find(l => l.index === level.index + 1)
            go(next ? { name: 'game', levelId: next.id, key: Date.now() } : { name: 'map', focus: level.id })
          }}
          onMap={() => go({ name: 'map', focus: level.id })}
          reduced={reduced}
          totalXp={save.xp}
        />
      )}
    </div>
  )
}

/** Animated pointer that traces a real word path on the board (first-run coach). */
function CoachHand({ path, cell, reduced }: { path: number[]; cell: number; reduced: boolean }) {
  const pad = 8
  const xs = path.map((i) => pad + ((i % 6) + 0.5) * cell)
  const ys = path.map((i) => pad + (Math.floor(i / 6) + 0.5) * cell)
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <polyline points={xs.map((x, k) => `${x},${ys[k]}`).join(' ')} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth={cell * 0.12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 12" />
      </svg>
      <motion.div
        className="absolute left-0 top-0"
        animate={reduced ? { x: xs[0], y: ys[0] } : { x: [...xs, xs[xs.length - 1]], y: [...ys, ys[ys.length - 1]], opacity: [1, ...xs.map(() => 1)] }}
        transition={reduced ? { duration: 0 } : { duration: 0.55 * path.length + 0.6, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' }}
      >
        <svg width={cell * 0.75} height={cell * 0.75} viewBox="0 0 40 40" style={{ transform: 'translate(-20%, -10%)' }}>
          <path
            d="M14 4 C16 4 17 6 17 8 V18 L19 17 C21 16 23 17 23 19 L25 18 C27 17 29 19 29 21 L30 21 C32 21 34 23 33 26 L31 34 C30 37 27 38 24 38 H19 C16 38 14 37 12 34 L6 25 C5 23 6 21 8 21 C10 21 11 23 11 23 V8 C11 6 12 4 14 4 Z"
            fill="#FFFDF6"
            stroke="#3B2160"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  )
}
