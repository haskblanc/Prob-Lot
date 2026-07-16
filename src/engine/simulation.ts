import { PRIZE_CATEGORIES } from './config'
import { generateDraw, scoreTicket } from './lotteryEngine'
import { portfolioCost } from './portfolio'
import { createRng } from './rng'
import type {
  CategoryId,
  DrawConfig,
  SimulationOptions,
  SimulationResult,
  TicketLine,
} from './types'

function percentile(sorted: Float64Array, p: number): number {
  if (sorted.length === 0) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  const frac = idx - lo
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

/**
 * Simulación Monte Carlo de una cartera: genera `iterations` sorteos
 * completos y puntúa todas las líneas en cada uno.
 */
export function simulatePortfolio(
  lines: TicketLine[],
  config: DrawConfig,
  options: SimulationOptions,
  onProgress?: (done: number, total: number) => void,
): SimulationResult {
  const { iterations, seed } = options
  const rng = createRng(seed)
  const cost = portfolioCost(lines, config)

  const nets = new Float64Array(iterations)
  const categoryWins = Object.fromEntries(PRIZE_CATEGORIES.map((c) => [c.id, 0])) as Record<
    CategoryId,
    number
  >
  let winDraws = 0
  let totalPrize = 0

  const progressEvery = Math.max(1, Math.floor(iterations / 50))
  for (let i = 0; i < iterations; i++) {
    const draw = generateDraw(rng)
    let prize = 0
    for (const line of lines) {
      const { categoria, premio } = scoreTicket(line.numero, line.decimos, draw, config)
      if (categoria !== null) {
        prize += premio
        categoryWins[categoria]++
      }
    }
    if (prize > 0) winDraws++
    totalPrize += prize
    nets[i] = prize - cost
    if (onProgress && (i + 1) % progressEvery === 0) onProgress(i + 1, iterations)
  }

  const sortedNets = nets.slice().sort()
  return {
    iterations,
    cost,
    winRate: winDraws / iterations,
    meanPrize: totalPrize / iterations,
    meanNet: totalPrize / iterations - cost,
    medianNet: percentile(sortedNets, 0.5),
    percentiles: {
      p10: percentile(sortedNets, 0.1),
      p50: percentile(sortedNets, 0.5),
      p90: percentile(sortedNets, 0.9),
      p99: percentile(sortedNets, 0.99),
    },
    categoryWins,
    sortedNets,
  }
}
