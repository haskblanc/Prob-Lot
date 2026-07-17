/**
 * Motor de análisis de El Quinigol.
 *
 * Misma familia que La Quiniela (parimutuel con habilidad + multitud), pero
 * con un objetivo de predicción mucho más difícil: en cada uno de los 6
 * partidos aciertas el **número exacto de goles** de cada equipo (0, 1, 2 o M
 * = "más de 2"), es decir 4 × 4 = 16 marcadores posibles por partido. Un
 * partido se acierta solo si aciertas los goles de AMBOS equipos.
 *
 * Consecuencias para el análisis:
 *  - La probabilidad de acertar un partido es mucho menor que el 1-X-2.
 *  - El efecto de la originalidad es aún más fuerte: la multitud se amontona
 *    en marcadores típicos (1-0, 1-1, 2-1…), así que acertar un marcador
 *    raro-pero-correcto reparte con muy poca gente y paga desproporcionado.
 *
 * Modelo agregado y exacto (sin Monte Carlo), idéntico en forma a La Quiniela:
 * aciertos ~ Binomial(6, pMine); co-acertantes ~ N · Binomial(6, pCrowd);
 * premio por acertante = bolsa de la categoría / acertantes. Se reutiliza la
 * maquinaria binomial de `quiniela.ts`.
 */
import { binomialPmf } from './quiniela'

export const N_PARTIDOS = 6

export type QuinigolCategoryHits = 6 | 5 | 4

export const QUINIGOL_CATEGORIES: { hits: QuinigolCategoryHits; label: string }[] = [
  { hits: 6, label: '1ª categoría (6)' },
  { hits: 5, label: '2ª categoría (5)' },
  { hits: 4, label: '3ª categoría (4)' },
]

export interface QuinigolParams {
  /** Precio por apuesta, € */
  precio: number
  /** Fracción de la recaudación destinada a premios */
  ratio: number
  /** Bote acumulado (€), asignado a la 1ª categoría (6 aciertos) */
  bote: number
  /** Nº de apuestas del sorteo (participación) */
  apuestas: number
  /** Tu probabilidad de acertar el marcador exacto de un partido (habilidad) */
  pMine: number
  /** Probabilidad media con que la multitud acierta el marcador de un partido */
  pCrowd: number
  /** Reparto del fondo por categoría (fracciones, suman 1): 6,5,4 */
  pct6: number
  pct5: number
  pct4: number
}

export const DEFAULT_QUINIGOL_PARAMS: QuinigolParams = {
  precio: 1,
  ratio: 0.55,
  bote: 0,
  apuestas: 3_000_000,
  // Acertar un marcador exacto es difícil: al azar entre 16 sería 6,25 %; un
  // buen pronosticador que elige el marcador más probable ronda el 15–22 %.
  pMine: 0.2,
  pCrowd: 0.16,
  pct6: 0.45,
  pct5: 0.25,
  pct4: 0.3,
}

const shareOf = (p: QuinigolParams, hits: QuinigolCategoryHits): number =>
  hits === 6 ? p.pct6 : hits === 5 ? p.pct5 : p.pct4

export interface QuinigolOutcome {
  hits: QuinigolCategoryHits
  label: string
  probMine: number
  acertantesEsperados: number
  premioPorAcertante: number
  evAportacion: number
}

export function categoryOutcomes(p: QuinigolParams): QuinigolOutcome[] {
  const mine = binomialPmf(N_PARTIDOS, p.pMine)
  const crowd = binomialPmf(N_PARTIDOS, p.pCrowd)
  const N = p.apuestas
  const V = p.ratio * N * p.precio
  return QUINIGOL_CATEGORIES.map(({ hits, label }) => {
    const probMine = mine[hits]
    const acertantesEsperados = N * crowd[hits]
    let pool = shareOf(p, hits) * V
    if (hits === 6) pool += p.bote
    const premioPorAcertante = acertantesEsperados > 0 ? pool / acertantesEsperados : 0
    return { hits, label, probMine, acertantesEsperados, premioPorAcertante, evAportacion: probMine * premioPorAcertante }
  })
}

export function singleBetEV(p: QuinigolParams): number {
  return categoryOutcomes(p).reduce((a, o) => a + o.evAportacion, 0)
}

export const expectedHits = (p: QuinigolParams): number => N_PARTIDOS * p.pMine

/** Probabilidad de algún premio (≥ 4 aciertos) */
export function anyPrizeProb(p: QuinigolParams): number {
  const mine = binomialPmf(N_PARTIDOS, p.pMine)
  return mine[4] + mine[5] + mine[6]
}

/**
 * Habilidad crítica: `pMine` a partir del cual el EV supera el coste. El EV es
 * creciente en `pMine`; se resuelve por bisección. `null` si ni con acierto
 * perfecto se alcanza.
 */
export function breakEvenSkill(p: QuinigolParams): number | null {
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
