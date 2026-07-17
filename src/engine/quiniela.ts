/**
 * Motor de análisis de La Quiniela (14 partidos 1-X-2 + Pleno al 15).
 *
 * La Quiniela es la tercera familia de sorteo, y la más interesante para la
 * pregunta "¿se puede batir al sistema?":
 *
 *  - Lotería Nacional: reparto fijo → sin ventaja posible jamás.
 *  - La Primitiva: parimutuel de azar puro + bote → ventaja solo en botes
 *    extraordinarios (impracticable).
 *  - La Quiniela: parimutuel donde los resultados NO son equiprobables
 *    (dependen de los partidos) y el premio se reparte entre los acertantes.
 *    Aquí entran DOS palancas que el jugador controla:
 *      1. Habilidad — acertar los partidos mejor que la media.
 *      2. Originalidad — elegir resultados correctos poco populares, porque
 *         cuantos menos compartan tu acierto, mayor es tu premio.
 *    Es el único tipo donde una ventaja legal y sostenible es teóricamente
 *    posible, aunque el "peaje" (~45 %) la hace durísima en la práctica.
 *
 * Modelo (agregado y exacto, sin Monte Carlo): cada uno de los 14 partidos se
 * acierta con probabilidad `pMine` (tu habilidad). El nº de aciertos sigue una
 * Binomial(14, pMine), calculable exactamente. La multitud acierta cada
 * partido con probabilidad `pCrowd`; el nº de co-acertantes en cada categoría
 * es N · Binomial(14, pCrowd). El premio por acertante de una categoría es la
 * bolsa de esa categoría dividida entre sus acertantes (naturaleza parimutuel).
 *
 * Simplificación: se modelan las 5 categorías de premio por nº de aciertos
 * (14→1ª … 10→5ª). El "Pleno al 15" / categoría especial (predecir los goles
 * del 15º partido) no se modela; el bote se asigna a la 1ª categoría (14).
 */

export const N_PARTIDOS = 14

/** Distribución binomial: [P(0 aciertos) … P(n aciertos)] */
export function binomialPmf(n: number, p: number): number[] {
  const out = new Array<number>(n + 1)
  let c = 1 // C(n,0)
  const q = 1 - p
  for (let k = 0; k <= n; k++) {
    out[k] = c * p ** k * q ** (n - k)
    c = (c * (n - k)) / (k + 1)
  }
  return out
}

export type QuinielaCategoryHits = 14 | 13 | 12 | 11 | 10

export const QUINIELA_CATEGORIES: { hits: QuinielaCategoryHits; label: string }[] = [
  { hits: 14, label: '1ª categoría (14)' },
  { hits: 13, label: '2ª categoría (13)' },
  { hits: 12, label: '3ª categoría (12)' },
  { hits: 11, label: '4ª categoría (11)' },
  { hits: 10, label: '5ª categoría (10)' },
]

export interface QuinielaParams {
  /** Precio por apuesta (columna), € */
  precio: number
  /** Fracción de la recaudación destinada a premios */
  ratio: number
  /** Bote acumulado (€), asignado a la 1ª categoría (14 aciertos) */
  bote: number
  /** Nº de apuestas del sorteo (participación) */
  apuestas: number
  /** Tu probabilidad de acertar cada partido (habilidad) */
  pMine: number
  /** Probabilidad media con que la multitud acierta cada partido */
  pCrowd: number
  /** Reparto del fondo por categoría (fracciones, suman 1): 14,13,12,11,10 */
  pct14: number
  pct13: number
  pct12: number
  pct11: number
  pct10: number
}

export const DEFAULT_QUINIELA_PARAMS: QuinielaParams = {
  precio: 0.75,
  ratio: 0.55,
  bote: 0,
  apuestas: 10_000_000,
  pMine: 0.45,
  pCrowd: 0.4,
  // Reparto aproximado del fondo variable (editable). Las categorías bajas
  // tienen muchísimos más acertantes, así que su premio unitario es pequeño
  // aunque su bolsa sea grande.
  pct14: 0.16,
  pct13: 0.08,
  pct12: 0.08,
  pct11: 0.2,
  pct10: 0.48,
}

const shareOf = (p: QuinielaParams, hits: QuinielaCategoryHits): number =>
  hits === 14 ? p.pct14 : hits === 13 ? p.pct13 : hits === 12 ? p.pct12 : hits === 11 ? p.pct11 : p.pct10

export interface QuinielaOutcome {
  hits: QuinielaCategoryHits
  label: string
  /** Probabilidad de que TU apuesta caiga en esta categoría (exactamente `hits` aciertos) */
  probMine: number
  /** Co-acertantes esperados en el sorteo (según la habilidad de la multitud) */
  acertantesEsperados: number
  /** Premio medio por acertante (€) */
  premioPorAcertante: number
  /** Aportación de esta categoría al valor esperado de tu apuesta (€) */
  evAportacion: number
}

/**
 * Desglose por categoría. La bolsa de cada categoría es su porcentaje del
 * fondo variable (más el bote en la 1ª); los acertantes esperados salen de la
 * habilidad de la multitud. El premio por acertante = bolsa / acertantes.
 */
export function categoryOutcomes(p: QuinielaParams): QuinielaOutcome[] {
  const mine = binomialPmf(N_PARTIDOS, p.pMine)
  const crowd = binomialPmf(N_PARTIDOS, p.pCrowd)
  const N = p.apuestas
  const V = p.ratio * N * p.precio
  return QUINIELA_CATEGORIES.map(({ hits, label }) => {
    const probMine = mine[hits]
    const acertantesEsperados = N * crowd[hits]
    let pool = shareOf(p, hits) * V
    if (hits === 14) pool += p.bote
    const premioPorAcertante = acertantesEsperados > 0 ? pool / acertantesEsperados : 0
    return {
      hits,
      label,
      probMine,
      acertantesEsperados,
      premioPorAcertante,
      evAportacion: probMine * premioPorAcertante,
    }
  })
}

/** Valor esperado de una apuesta (€) */
export function singleBetEV(p: QuinielaParams): number {
  return categoryOutcomes(p).reduce((a, o) => a + o.evAportacion, 0)
}

/** Nº esperado de aciertos (de 14) */
export const expectedHits = (p: QuinielaParams): number => N_PARTIDOS * p.pMine

/** Probabilidad de obtener algún premio (≥ 10 aciertos) */
export function anyPrizeProb(p: QuinielaParams): number {
  const mine = binomialPmf(N_PARTIDOS, p.pMine)
  return mine[10] + mine[11] + mine[12] + mine[13] + mine[14]
}

/**
 * Habilidad crítica: el valor de `pMine` (aciertos por partido) a partir del
 * cual el valor esperado supera el coste, manteniendo fijo el resto. El EV es
 * creciente en `pMine`, así que se resuelve por bisección. Devuelve un valor
 * en (0,1], o `null` si ni con acierto perfecto se alcanza (peaje demasiado
 * alto para la participación/bote dados).
 */
export function breakEvenSkill(p: QuinielaParams): number | null {
  const target = p.precio
  const evAt = (pMine: number) => singleBetEV({ ...p, pMine })
  if (evAt(1) < target) return null
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (evAt(mid) < target) lo = mid
    else hi = mid
  }
  return hi
}
