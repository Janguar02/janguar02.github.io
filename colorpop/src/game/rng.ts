/**
 * Deterministic, serialisable PRNG (mulberry32). The state is a plain number
 * stored in GameState so every turn is reproducible in tests and after reload.
 */
export class Rng {
  state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive)
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    let total = 0
    for (const [, w] of entries) total += w
    let r = this.next() * total
    for (const [v, w] of entries) {
      r -= w
      if (r < 0) return v
    }
    return entries[entries.length - 1][0]
  }
}
