// Utilitários de aleatoriedade e probabilidade

export const rand = () => Math.random()

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Amostra de uma distribuição de Poisson (algoritmo de Knuth). */
export function poisson(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

/** Probabilidade logística de vitória do mandante dado a diferença de força. */
export function winProbability(strengthHome: number, strengthAway: number, scale = 40): number {
  return 1 / (1 + Math.pow(10, -(strengthHome - strengthAway) / scale))
}

// ----- PRNG determinístico (para elencos estáveis por time) -----

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^= h >>> 16) >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let _id = 0
export function uid(prefix = 'id'): string {
  _id += 1
  return `${prefix}_${Date.now().toString(36)}_${(_id).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
}
