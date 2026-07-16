import type { CategoryId, DrawConfig, PrizeCategory } from './types'

/**
 * Tabla de categorías de premio del sorteo ordinario del jueves.
 *
 * `count` es el número de billetes premiados por serie de 100.000 según la
 * definición nominal de cada categoría (compartir las k últimas cifras,
 * excluyendo al propio número premiado; la centena completa; etc.).
 * La suma de `count` es exactamente 41.050 (verificado por test unitario).
 *
 * `prize` es el premio por décimo en € del sorteo del jueves. La suma de
 * count × prize es 210.000 € por serie: exactamente el 70 % de la
 * recaudación (100.000 números × 3 €), de donde sale que el valor esperado
 * de cualquier décimo es 2,10 €.
 */
export const PRIZE_CATEGORIES: readonly PrizeCategory[] = [
  { id: 'primer', label: '1er Premio', count: 1, prize: 30_000 },
  { id: 'segundo', label: '2º Premio', count: 1, prize: 6_000 },
  { id: 'aprox1', label: 'Aproximación 1er premio', count: 2, prize: 1_200 },
  { id: 'aprox2', label: 'Aproximación 2º premio', count: 2, prize: 747 },
  { id: 'centena1', label: 'Centena 1er premio', count: 99, prize: 30 },
  { id: 'centena2', label: 'Centena 2º premio', count: 99, prize: 15 },
  { id: 'term4_1', label: 'Terminación 4 cifras (1er premio)', count: 9, prize: 75 },
  { id: 'term3_1', label: 'Terminación 3 cifras (1er premio)', count: 99, prize: 15 },
  { id: 'term2_1', label: 'Terminación 2 cifras (1er premio)', count: 999, prize: 6 },
  { id: 'reintegro1', label: 'Reintegro (última cifra 1er premio)', count: 9_999, prize: 3 },
  { id: 'pedrea4', label: 'Pedrea, terminación 4 cifras', count: 40, prize: 75 },
  { id: 'pedrea3', label: 'Pedrea, terminación 3 cifras', count: 700, prize: 15 },
  { id: 'pedrea2', label: 'Pedrea, terminación 2 cifras', count: 9_000, prize: 6 },
  { id: 'reintegroE1', label: 'Reintegro especial 1', count: 10_000, prize: 3 },
  { id: 'reintegroE2', label: 'Reintegro especial 2', count: 10_000, prize: 3 },
]

export const CATEGORY_BY_ID: Record<CategoryId, PrizeCategory> = Object.fromEntries(
  PRIZE_CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, PrizeCategory>

/**
 * Orden de prioridad para informar la categoría "más específica" acertada:
 * de mayor a menor premio, y a igualdad, la derivada del número premiado
 * antes que la pedrea. Un número solo se CUENTA en la primera categoría de
 * esta lista que le corresponda (una terminación de 4 cifras nunca se
 * cuenta también como terminación de 3, etc.).
 */
export const PRIORITY_ORDER: readonly CategoryId[] = [
  'primer',
  'segundo',
  'aprox1',
  'aprox2',
  'term4_1',
  'pedrea4',
  'centena1',
  'centena2',
  'term3_1',
  'pedrea3',
  'term2_1',
  'pedrea2',
  'reintegro1',
  'reintegroE1',
  'reintegroE2',
]

export const DRAW_CONFIGS: readonly DrawConfig[] = [
  { id: 'jueves', label: 'Sorteo del jueves', ticketPrice: 3, prizeMultiplier: 1 },
  { id: 'sabado', label: 'Sorteo del sábado', ticketPrice: 6, prizeMultiplier: 2 },
]

export const DEFAULT_CONFIG = DRAW_CONFIGS[0]

/** Fracción de la recaudación destinada a premios */
export const PAYOUT_RATIO = 0.7
