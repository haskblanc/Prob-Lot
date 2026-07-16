export type Rng = () => number

/**
 * PRNG mulberry32: rápido, determinista y suficiente para Monte Carlo.
 * Devuelve números uniformes en [0, 1).
 */
export function createRng(seed?: number): Rng {
  let a = (seed ?? (Math.random() * 0xffffffff)) >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entero uniforme en [0, max) */
export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max)
}
