import { createRng, randInt, type Rng } from './rng'
import { toNumero } from './lotteryEngine'
import {
  DECIMOS_PER_BILLETE,
  SERIES_SIZE,
  type DrawConfig,
  type Portfolio,
  type TicketLine,
} from './types'

export function portfolioCost(lines: TicketLine[], config: DrawConfig): number {
  return lines.reduce((acc, l) => acc + l.decimos * config.ticketPrice, 0)
}

/** Valor esperado teórico exacto: el 70 % del coste, propiedad del sistema */
export function theoreticalEV(lines: TicketLine[], config: DrawConfig): number {
  return portfolioCost(lines, config) * 0.7
}

let nextId = 1
const newId = () => `cartera-${nextId++}`

export function buildSuelto(numero: string, decimos: number): Portfolio {
  return { id: newId(), name: `Nº ${numero} (${decimos} déc.)`, mode: 'suelto', lines: [{ numero, decimos }] }
}

export function buildBillete(numero: string): Portfolio {
  return {
    id: newId(),
    name: `Billete ${numero}`,
    mode: 'billete',
    lines: [{ numero, decimos: DECIMOS_PER_BILLETE }],
  }
}

/** N números consecutivos a partir de `base` (mod 100.000), 1 décimo cada uno */
export function buildSerie(base: string, length: number): Portfolio {
  const start = parseInt(base, 10)
  const lines: TicketLine[] = Array.from({ length }, (_, i) => ({
    numero: toNumero((start + i) % SERIES_SIZE),
    decimos: 1,
  }))
  return { id: newId(), name: `Serie ${base} +${length}`, mode: 'serie', lines }
}

/** N números aleatorios distintos, 1 décimo cada uno */
export function buildDispersos(count: number, rng: Rng = createRng()): Portfolio {
  const chosen = new Set<number>()
  while (chosen.size < count) chosen.add(randInt(rng, SERIES_SIZE))
  const lines: TicketLine[] = [...chosen].map((n) => ({ numero: toNumero(n), decimos: 1 }))
  return { id: newId(), name: `${count} dispersos`, mode: 'dispersos', lines }
}

export function buildPersonalizada(lines: TicketLine[], name = 'Personalizada'): Portfolio {
  return { id: newId(), name, mode: 'personalizada', lines }
}

/**
 * Si las líneas forman una serie de números consecutivos (mod 100.000) con
 * el mismo nº de décimos en todas, devuelve { length, decimos }; si no, null.
 */
export function detectConsecutiveRun(lines: TicketLine[]): { length: number; decimos: number } | null {
  if (lines.length === 0) return null
  const decimos = lines[0].decimos
  if (!lines.every((l) => l.decimos === decimos)) return null
  const nums = lines.map((l) => parseInt(l.numero, 10)).sort((a, b) => a - b)
  if (new Set(nums).size !== nums.length) return null

  const consecutive = (arr: number[]) => arr.every((n, i) => i === 0 || n === arr[i - 1] + 1)
  if (consecutive(nums)) return { length: nums.length, decimos }
  // Serie que envuelve por 99999→00000: un único hueco y los extremos se tocan mod 100.000
  const gaps = nums.filter((n, i) => i > 0 && n !== nums[i - 1] + 1).length
  if (gaps === 1 && nums[0] === 0 && nums[nums.length - 1] === SERIES_SIZE - 1) {
    return { length: nums.length, decimos }
  }
  return null
}

export interface Guarantee {
  /** Décimos premiados como mínimo, en el peor sorteo posible */
  minWinners: number
  /** Importe mínimo garantizado en € */
  minPrize: number
  detail: string[]
}

/**
 * Suelo garantizado de una serie consecutiva de N números.
 *
 * En cualquier ventana de N números consecutivos, cada cifra final aparece
 * al menos ⌊N/10⌋ veces, cada terminación de 2 cifras ⌊N/100⌋ veces, etc.
 * Como los premios de conceptos compatibles se acumulan, cada bloque suma
 * de forma independiente:
 *  - reintegros (3 cifras premiadas: la del 1er premio y 2 especiales,
 *    puedan o no coincidir): 3 × ⌊N/10⌋ × 3 €
 *  - terminaciones de 2 cifras (la del 1er premio + 9 de pedrea, todas
 *    distintas entre sí): 10 × ⌊N/100⌋ × 6 €
 *  - terminaciones de 3 cifras (1 + 7 de pedrea): 8 × ⌊N/1000⌋ × 15 €
 *  - terminaciones de 4 cifras (1 + 4 de pedrea): 5 × ⌊N/10000⌋ × 75 €
 * El mínimo de décimos premiados es ⌊N/10⌋ (peor caso: las tres cifras de
 * reintegro coinciden).
 */
export function guaranteedFloor(lines: TicketLine[], config: DrawConfig): Guarantee | null {
  const run = detectConsecutiveRun(lines)
  if (!run || run.length < 10) return null
  const { length: n, decimos } = run
  const m = config.prizeMultiplier * decimos

  const blocks = [
    { count: 3 * Math.floor(n / 10), each: 3, label: 'reintegros' },
    { count: 10 * Math.floor(n / 100), each: 6, label: 'terminaciones de 2 cifras' },
    { count: 8 * Math.floor(n / 1000), each: 15, label: 'terminaciones de 3 cifras' },
    { count: 5 * Math.floor(n / 10_000), each: 75, label: 'terminaciones de 4 cifras' },
  ].filter((b) => b.count > 0)

  const minPrize = blocks.reduce((acc, b) => acc + b.count * b.each * m, 0)
  const detail = blocks.map((b) => `${b.count} × ${b.each * m} € (${b.label})`)
  return { minWinners: Math.floor(n / 10) * decimos, minPrize, detail }
}
