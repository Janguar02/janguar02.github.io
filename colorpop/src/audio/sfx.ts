/**
 * Procedural sound effects via WebAudio – no external audio files, so no
 * licensing questions. Every sound is short, soft and pitched to a C-major
 * pentatonic so stacking selections always sounds pleasant.
 */
type Wave = OscillatorType

const PENTA = [0, 2, 4, 7, 9]

class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  enabled = true

  private ensure(): AudioContext | null {
    if (!this.enabled) return null
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.55
      const comp = this.ctx.createDynamicsCompressor()
      this.master.connect(comp).connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Call from a user gesture once so mobile browsers allow audio. */
  unlock() {
    this.ensure()
  }

  private tone(freq: number, dur: number, opts: { type?: Wave; gain?: number; delay?: number; slideTo?: number; attack?: number } = {}) {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur)
    const peak = opts.gain ?? 0.25
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.008))
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  private noise(dur: number, opts: { gain?: number; delay?: number; freq?: number; q?: number; type?: BiquadFilterType; sweepTo?: number } = {}) {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = opts.type ?? 'bandpass'
    filter.frequency.setValueAtTime(opts.freq ?? 1200, t0)
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur)
    filter.Q.value = opts.q ?? 0.8
    const g = ctx.createGain()
    g.gain.setValueAtTime(opts.gain ?? 0.3, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t0)
  }

  private note(step: number, base = 523.25) {
    const oct = Math.floor(step / PENTA.length)
    const semi = PENTA[step % PENTA.length] + oct * 12
    return base * Math.pow(2, semi / 12)
  }

  select(index: number) {
    const f = this.note(Math.min(index, 14))
    this.tone(f, 0.12, { type: 'triangle', gain: 0.22 })
    this.tone(f * 2, 0.06, { type: 'sine', gain: 0.06 })
  }
  deselect() {
    this.tone(330, 0.07, { type: 'triangle', gain: 0.12 })
  }
  validHint() {
    this.tone(1046, 0.08, { type: 'sine', gain: 0.08 })
  }
  invalid() {
    this.tone(220, 0.16, { type: 'square', gain: 0.06, slideTo: 160 })
    this.tone(208, 0.16, { type: 'triangle', gain: 0.12, slideTo: 150, delay: 0.02 })
  }
  word(len: number) {
    const steps = Math.min(len, 8)
    for (let i = 0; i < Math.min(steps, 5); i++) this.tone(this.note(i * 2 + Math.max(0, steps - 4)), 0.18, { type: 'triangle', gain: 0.18, delay: i * 0.045 })
    if (len >= 6) this.tone(this.note(14), 0.4, { type: 'sine', gain: 0.12, delay: 0.25 })
  }
  pop(n = 1) {
    for (let i = 0; i < Math.min(n, 6); i++) {
      this.tone(600 + i * 90, 0.07, { type: 'sine', gain: 0.16, slideTo: 1400 + i * 120, delay: i * 0.035 })
    }
  }
  fall() {
    this.tone(160, 0.12, { type: 'sine', gain: 0.18, slideTo: 90 })
  }
  bomb() {
    this.noise(0.45, { gain: 0.45, freq: 900, sweepTo: 80, type: 'lowpass' })
    this.tone(110, 0.35, { type: 'sine', gain: 0.35, slideTo: 40 })
  }
  zap() {
    this.noise(0.25, { gain: 0.25, freq: 3000, sweepTo: 600, q: 4 })
    this.tone(1400, 0.2, { type: 'sawtooth', gain: 0.05, slideTo: 300 })
  }
  coin() {
    this.tone(1318, 0.08, { type: 'square', gain: 0.06 })
    this.tone(1760, 0.22, { type: 'square', gain: 0.06, delay: 0.07 })
  }
  bossHit(big: boolean) {
    this.noise(0.18, { gain: 0.3, freq: 700, sweepTo: 200, type: 'lowpass' })
    this.tone(big ? 140 : 200, 0.2, { type: 'triangle', gain: 0.3, slideTo: 70 })
  }
  windup() {
    this.tone(180, 0.55, { type: 'sawtooth', gain: 0.05, slideTo: 420 })
    this.noise(0.55, { gain: 0.12, freq: 400, sweepTo: 2200 })
  }
  bossAttack() {
    this.noise(0.5, { gain: 0.4, freq: 1500, sweepTo: 150, type: 'lowpass' })
    this.tone(90, 0.4, { type: 'sine', gain: 0.4, slideTo: 45 })
  }
  heal() {
    ;[0, 2, 4, 7].forEach((s, i) => this.tone(this.note(s + 5), 0.3, { type: 'sine', gain: 0.12, delay: i * 0.06 }))
  }
  ignite() {
    this.noise(0.35, { gain: 0.18, freq: 1800, sweepTo: 500, q: 1.5 })
  }
  magic() {
    for (let i = 0; i < 6; i++) this.tone(this.note(i + 3), 0.18, { type: 'sine', gain: 0.1, delay: i * 0.05 })
  }
  bonus() {
    ;[0, 4, 7, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.16, { type: 'square', gain: 0.05, delay: i * 0.07 }))
  }
  /** Target solved: bright two-note "ding". */
  target() {
    this.tone(this.note(7), 0.12, { type: 'triangle', gain: 0.16 })
    this.tone(this.note(9), 0.28, { type: 'triangle', gain: 0.16, delay: 0.08 })
  }
  /** Secret word discovered: sparkling rising glissando. */
  secret() {
    for (let i = 0; i < 7; i++) this.tone(this.note(5 + i), 0.16, { type: 'sine', gain: 0.11, delay: i * 0.035 })
    this.tone(this.note(14), 0.5, { type: 'triangle', gain: 0.1, delay: 0.26 })
  }
  /** Rare find: small fanfare with a shimmer tail. */
  rare() {
    ;[0, 4, 7, 12].forEach((s, i) => this.tone(523.25 * Math.pow(2, s / 12), 0.22, { type: 'triangle', gain: 0.17, delay: i * 0.09 }))
    this.tone(523.25 * 4, 0.7, { type: 'sine', gain: 0.07, delay: 0.38 })
    this.noise(0.6, { gain: 0.05, freq: 6000, q: 2, delay: 0.3 })
  }
  comboUp(level: number) {
    this.tone(this.note(6 + Math.min(level, 8)), 0.1, { type: 'square', gain: 0.04 })
  }
  /** Soft thud when tiles settle. */
  land() {
    this.tone(120, 0.08, { type: 'sine', gain: 0.14, slideTo: 80 })
  }
  bigWin() {
    this.victory()
    ;[0, 7, 12, 16, 19].forEach((s, i) => this.tone(261.63 * Math.pow(2, s / 12), 0.5, { type: 'sine', gain: 0.08, delay: 0.9 + i * 0.05 }))
  }
  /** Ice armour breaks: bright crack with a glassy tail. */
  shatter() {
    this.noise(0.35, { gain: 0.3, freq: 5200, sweepTo: 1800, q: 3 })
    ;[0, 5, 9].forEach((s, i) => this.tone(1046.5 * Math.pow(2, s / 12), 0.18, { type: 'triangle', gain: 0.1, delay: 0.04 + i * 0.05 }))
  }
  /** Wortmeister moment: rising fanfare – reserved for rare achievements. */
  moment() {
    ;[0, 4, 7, 12, 16].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 0.26, { type: 'triangle', gain: 0.15, delay: i * 0.08 }))
    this.tone(392 * 4, 0.9, { type: 'sine', gain: 0.08, delay: 0.42 })
    this.noise(0.8, { gain: 0.05, freq: 7000, q: 2, delay: 0.4 })
  }
  tick() {
    this.tone(1800, 0.03, { type: 'square', gain: 0.03 })
  }
  star(i: number) {
    this.tone(this.note(5 + i * 2), 0.35, { type: 'triangle', gain: 0.2 })
    this.tone(this.note(10 + i * 2), 0.35, { type: 'sine', gain: 0.08, delay: 0.05 })
  }
  victory() {
    const seq = [0, 2, 4, 5, 7]
    seq.forEach((s, i) => this.tone(this.note(s + 2), 0.22, { type: 'triangle', gain: 0.2, delay: i * 0.11 }))
    this.tone(this.note(12), 0.8, { type: 'triangle', gain: 0.2, delay: 0.6 })
    this.tone(this.note(7), 0.8, { type: 'sine', gain: 0.12, delay: 0.6 })
  }
  defeat() {
    ;[7, 5, 3, 0].forEach((s, i) => this.tone(this.note(s, 330), 0.3, { type: 'triangle', gain: 0.16, delay: i * 0.18 }))
  }
  click() {
    this.tone(880, 0.05, { type: 'triangle', gain: 0.12 })
  }
  equip() {
    this.tone(660, 0.08, { type: 'triangle', gain: 0.16 })
    this.tone(990, 0.16, { type: 'triangle', gain: 0.14, delay: 0.06 })
  }
}

export const sfx = new Sfx()
