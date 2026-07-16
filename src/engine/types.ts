/** Total de números por serie: 00000–99999 */
export const SERIES_SIZE = 100_000

/** Décimos por billete */
export const DECIMOS_PER_BILLETE = 10

export type CategoryId =
  | 'primer'
  | 'segundo'
  | 'aprox1'
  | 'aprox2'
  | 'centena1'
  | 'centena2'
  | 'term4_1'
  | 'term3_1'
  | 'term2_1'
  | 'reintegro1'
  | 'pedrea4'
  | 'pedrea3'
  | 'pedrea2'
  | 'reintegroE1'
  | 'reintegroE2'

export interface PrizeCategory {
  id: CategoryId
  label: string
  /** Números premiados por serie de 100.000 (nominal) */
  count: number
  /** Premio por décimo en €, sorteo del jueves (base) */
  prize: number
}

export interface DrawConfig {
  id: 'jueves' | 'sabado'
  label: string
  /** Precio del décimo en € */
  ticketPrice: number
  /** Multiplicador sobre los premios base del jueves */
  prizeMultiplier: number
}

/**
 * Un sorteo completo. Las categorías derivadas (aproximaciones, centenas,
 * terminaciones) se calculan a partir de `primer` y `segundo`; la pedrea y
 * los reintegros especiales se almacenan como cadenas de cifras finales.
 */
export interface Draw {
  /** 1er premio, 0–99999 */
  primer: number
  /** 2º premio, 0–99999, distinto del primero */
  segundo: number
  /** 4 combinaciones de 4 cifras finales, sin colisiones */
  pedrea4: string[]
  /** 7 combinaciones de 3 cifras finales, sin colisiones */
  pedrea3: string[]
  /** 9 combinaciones de 2 cifras finales, sin colisiones */
  pedrea2: string[]
  /** 1 cifra final aleatoria, independiente */
  reintegroE1: string
  /** 1 cifra final aleatoria, independiente */
  reintegroE2: string
}

/** Una línea de cartera: un número y cuántos décimos se poseen de él */
export interface TicketLine {
  /** Número de 5 cifras, '00000'–'99999' */
  numero: string
  /** Décimos poseídos, 1–10 */
  decimos: number
}

export type PortfolioMode = 'suelto' | 'billete' | 'serie' | 'dispersos' | 'personalizada'

export interface Portfolio {
  id: string
  name: string
  mode: PortfolioMode
  lines: TicketLine[]
}

export interface ScoreResult {
  /** Categoría más específica acertada, o null si no hay premio */
  categoria: CategoryId | null
  /** Premio total en € (todas las categorías compatibles acumuladas × décimos) */
  premio: number
}

export interface SimulationOptions {
  iterations: number
  seed?: number
}

export interface SimulationResult {
  iterations: number
  cost: number
  /** Fracción de sorteos con al menos un premio */
  winRate: number
  meanPrize: number
  meanNet: number
  medianNet: number
  percentiles: { p10: number; p50: number; p90: number; p99: number }
  /** Veces que alguna línea de la cartera acertó cada categoría (la más específica) */
  categoryWins: Record<CategoryId, number>
  /** Ganancia neta (premio − coste) de cada sorteo simulado, ordenada ascendente */
  sortedNets: Float64Array
}
