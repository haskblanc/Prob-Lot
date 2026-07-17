import { PRIZE_CATEGORIES } from './config'
import { generateDraw, prepareDrawIndex, scoreNumericFast } from './lotteryEngine'
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

  // Los números y décimos se parsean una sola vez aquí, no en cada sorteo:
  // con carteras de miles de números esto es el grueso del ahorro frente a
  // volver a parsear/asignar en el bucle caliente de la simulación.
  const numeros = lines.map((l) => parseInt(l.numero, 10))
  const decimos = lines.map((l) => l.decimos)

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
    const idx = prepareDrawIndex(draw)
    let prize = 0
    for (let j = 0; j < numeros.length; j++) {
      const { categoria, premio } = scoreNumericFast(numeros[j], decimos[j], idx, config)
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
