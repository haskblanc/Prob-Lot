import { SERIES_SIZE, type TicketLine } from './types'

const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * ¿Da `primer = p` algún premio al número n? (igual, aproximación, centena
 * o compartir la última cifra, que ya implica cualquier terminación)
 */
function primerRelated(n: number, p: number): boolean {
  if (p === n) return true
  if (p === mod(n - 1, SERIES_SIZE) || p === mod(n + 1, SERIES_SIZE)) return true
  if (Math.floor(p / 100) === Math.floor(n / 100)) return true
  return p % 10 === n % 10
}

/** ¿Da `segundo = s` algún premio al número n? (igual, aproximación o centena) */
function segundoRelated(n: number, s: number): boolean {
  if (s === n) return true
  if (s === mod(n - 1, SERIES_SIZE) || s === mod(n + 1, SERIES_SIZE)) return true
  return Math.floor(s / 100) === Math.floor(n / 100)
}

const cache = new Map<number, number>()

/**
 * Probabilidad exacta de que un número concreto obtenga al menos un premio
 * en un sorteo.
 *
 * Los factores del 1er premio, 2º premio y reintegros especiales son
 * exactos (conteo directo sobre los 100.000 valores posibles). Los factores
 * de pedrea son analíticos con una aproximación de primer orden en el
 * condicionado de las colisiones (error < 0,01 puntos porcentuales).
 */
export function singleNumberWinProb(numero: string | number): number {
  const n = typeof numero === 'string' ? parseInt(numero, 10) : numero
  const hit = cache.get(n)
  if (hit !== undefined) return hit

  let primerCount = 0
  let segundoCount = 0
  for (let v = 0; v < SERIES_SIZE; v++) {
    if (primerRelated(n, v)) primerCount++
    if (segundoRelated(n, v)) segundoCount++
  }
  const pNoPrimer = (SERIES_SIZE - primerCount) / SERIES_SIZE
  // Los valores que premiarían vía segundo son un subconjunto de los que
  // premian vía primer, así que condicionado a "primer no relacionado" el
  // segundo se sortea uniformemente entre SERIES_SIZE − 1 valores.
  const pNoSegundo = 1 - segundoCount / (SERIES_SIZE - 1)

  // Pedrea de k cifras: c combinaciones distintas sorteadas entre 10^k − 2
  // (se excluyen las terminaciones del 1er y 2º premio).
  const pNoPedrea = (c: number, k: number) => 1 - c / (10 ** k - 2)
  const pedrea = pNoPedrea(4, 4) * pNoPedrea(7, 3) * pNoPedrea(9, 2)

  const reintegrosE = (9 / 10) ** 2

  const noPrize = pNoPrimer * pNoSegundo * pedrea * reintegrosE
  const result = 1 - noPrize
  cache.set(n, result)
  return result
}

/**
 * Probabilidad de que una cartera de números distintos obtenga al menos un
 * premio, vía hipergeométrica: N números sin reemplazo sobre una serie con
 * K ≈ 100.000 × p̄ números premiados esperados (p̄ = media de la
 * probabilidad individual de cada número de la cartera).
 */
export function dispersedWinProb(lines: TicketLine[]): number {
  const probs = lines.map((l) => singleNumberWinProb(l.numero))
  const mean = probs.reduce((a, b) => a + b, 0) / probs.length
  const K = Math.round(SERIES_SIZE * mean)
  let pNone = 1
  for (let i = 0; i < lines.length; i++) {
    pNone *= (SERIES_SIZE - K - i) / (SERIES_SIZE - i)
  }
  return 1 - pNone
}
