/**
 * German dictionary backed by a sorted array. Lookups and prefix checks are
 * binary searches; the solver narrows a [lo, hi) range per DFS step so prefix
 * pruning stays cheap without building a memory-heavy trie.
 *
 * Normalisation: uppercase, ß → SS. Umlauts Ä Ö Ü are distinct letters.
 */
export function normalizeWord(raw: string): string {
  return raw.trim().toUpperCase().replace(/ß/g, 'SS').replace(/ẞ/g, 'SS')
}

export class Dictionary {
  readonly words: string[]
  private readonly set: Set<string>

  constructor(words: Iterable<string>) {
    const uniq = new Set<string>()
    for (const w of words) {
      const n = normalizeWord(w)
      if (n.length >= 3 && /^[A-ZÄÖÜ]+$/.test(n)) uniq.add(n)
    }
    this.words = [...uniq].sort()
    this.set = uniq
  }

  static fromText(text: string): Dictionary {
    return new Dictionary(text.split(/\r?\n/))
  }

  get size(): number {
    return this.words.length
  }

  has(word: string): boolean {
    return this.set.has(word)
  }

  /** First index in [lo, hi) whose word is >= prefix. */
  lowerBound(prefix: string, lo = 0, hi = this.words.length): number {
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (this.words[mid] < prefix) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  /**
   * Narrow a range to the words starting with prefix. Returns [lo, hi) or
   * null when nothing starts with the prefix.
   */
  narrow(prefix: string, lo = 0, hi = this.words.length): [number, number] | null {
    const start = this.lowerBound(prefix, lo, hi)
    if (start >= hi || !this.words[start].startsWith(prefix)) return null
    // Upper bound: first word that does not start with prefix.
    let a = start
    let b = hi
    while (a < b) {
      const mid = (a + b) >>> 1
      if (this.words[mid].startsWith(prefix)) a = mid + 1
      else b = mid
    }
    return [start, a]
  }

  hasPrefix(prefix: string): boolean {
    return this.narrow(prefix) !== null
  }
}
