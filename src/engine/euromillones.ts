/**
 * Motor de análisis de Euromillones (5/50 + 2 estrellas/12).
 *
 * Es de la familia parimutuel + bote (como La Primitiva), pero añade el
 * mecanismo que lo hace único para la pregunta "¿se puede batir al sistema?":
 * el **tope de bote y el rolldown**. El bote (5+2) crece hasta un tope
 * (~250 M €); si al tocarlo nadie lo gana, ese dinero **baja a las categorías
 * inferiores** en lugar de quedarse en la casilla casi imposible del 5+2.
 *
 * Consecuencia decisiva: en un sorteo normal, más de la mitad del valor
 * esperado está "atrapado" en el 5+2 (1 entre 139.838.160), inalcanzable para
 * una apuesta. En un rolldown, ese mismo dinero se reparte entre categorías
 * con muchos acertantes y probabilidad razonable, así que **una sola apuesta
 * corriente puede tener EV positivo** — el fenómeno Cash WinFall (Selbee/MIT),
 * y a diferencia de Stefan Mandel no exige comprar todas las combinaciones.
 *
 * Todo es combinatoria exacta, sin Monte Carlo.
 */
import { comb } from './primitiva'

/** C(50,5) · C(12,2) = 139.838.160 combinaciones */
export const TOTAL_COMBINACIONES = comb(50, 5) * comb(12, 2)

/** Combinaciones que aciertan exactamente `m` números (de 5) */
const mainCombos = (m: number) => comb(5, m) * comb(45, 5 - m)
/** Combinaciones que aciertan exactamente `s` estrellas (de 2) */
const starCombos = (s: number) => comb(2, s) * comb(10, 2 - s)

interface RawTier {
  m: number
  s: number
  /** Porcentaje aproximado del fondo de premios (se normaliza a suma 1) */
  pct: number
}

// Las 13 categorías oficiales (aciertos números + estrellas) con su reparto
// aproximado del fondo de premios. Valores aproximados de las reglas reales;
// se normalizan para sumar 1 en el modelo.
const RAW_TIERS: RawTier[] = [
  { m: 5, s: 2, pct: 0.5 },
  { m: 5, s: 1, pct: 0.026 },
  { m: 5, s: 0, pct: 0.006 },
  { m: 4, s: 2, pct: 0.002 },
  { m: 4, s: 1, pct: 0.0035 },
  { m: 3, s: 2, pct: 0.0037 },
  { m: 4, s: 0, pct: 0.0026 },
  { m: 2, s: 2, pct: 0.013 },
  { m: 3, s: 1, pct: 0.0145 },
  { m: 3, s: 0, pct: 0.027 },
  { m: 1, s: 2, pct: 0.0327 },
  { m: 2, s: 1, pct: 0.103 },
  { m: 2, s: 0, pct: 0.166 },
]

export interface EuromillonesTier {
  id: string
  label: string
  m: number
  s: number
  combinaciones: number
  prob: number
  /** Fracción normalizada del fondo (suman 1) */
  pct: number
  /** true para el 5+2 (bote) */
  esBote: boolean
}

const pctSum = RAW_TIERS.reduce((a, t) => a + t.pct, 0)

export const EUROMILLONES_TIERS: readonly EuromillonesTier[] = RAW_TIERS.map((t) => {
  const combinaciones = mainCombos(t.m) * starCombos(t.s)
  return {
    id: `${t.m}+${t.s}`,
    label: `${t.m}+${t.s}`,
    m: t.m,
    s: t.s,
    combinaciones,
    prob: combinaciones / TOTAL_COMBINACIONES,
    pct: t.pct / pctSum,
    esBote: t.m === 5 && t.s === 2,
  }
})

const JACKPOT_PCT = EUROMILLONES_TIERS.find((t) => t.esBote)!.pct

export interface EuromillonesParams {
  /** Precio por apuesta, € */
  precio: number
  /** Fracción de la recaudación destinada a premios */
  ratio: number
  /** Bote actual del 5+2 (€) */
  bote: number
  /** Tope de bote (€); informativo para el máximo del rolldown */
  tope: number
  /** Nº de apuestas del sorteo (participación) */
  apuestas: number
  /** Si true, el bote NO se paga en el 5+2 sino que baja a las demás categorías */
  rolldown: boolean
}

export const DEFAULT_EUROMILLONES_PARAMS: EuromillonesParams = {
  precio: 2.5,
  ratio: 0.5,
  bote: 0,
  tope: 250_000_000,
  apuestas: 90_000_000,
  rolldown: false,
}

export interface EuromillonesOutcome {
  tier: EuromillonesTier
  acertantesEsperados: number
  premioPorAcertante: number
  evAportacion: number
}

/**
 * Desglose por categoría. En modo normal el bote se suma a la bolsa del 5+2;
 * en rolldown se reparte entre las demás categorías en proporción a su bolsa.
 */
export function categoryOutcomes(p: EuromillonesParams): EuromillonesOutcome[] {
  const N = p.apuestas
  const fund = p.ratio * N * p.precio
  return EUROMILLONES_TIERS.map((tier) => {
    let pool = tier.pct * fund
    if (tier.esBote && !p.rolldown) pool += p.bote
    if (!tier.esBote && p.rolldown) pool += p.bote * (tier.pct / (1 - JACKPOT_PCT))
    const acertantesEsperados = N * tier.prob
    const premioPorAcertante = acertantesEsperados > 0 ? pool / acertantesEsperados : 0
    return { tier, acertantesEsperados, premioPorAcertante, evAportacion: tier.prob * premioPorAcertante }
  })
}

/** Valor esperado total de una apuesta (€). Es (fondo + bote) / N */
export function singleBetEV(p: EuromillonesParams): number {
  return categoryOutcomes(p).reduce((a, o) => a + o.evAportacion, 0)
}

/**
 * Valor esperado ACCESIBLE: el que una apuesta puede realmente materializar,
 * excluyendo la casilla del 5+2 (1 entre 139.838.160, inalcanzable de hecho).
 * En modo normal casi todo el bote queda fuera de aquí; en rolldown entra.
 */
export function accessibleEV(p: EuromillonesParams): number {
  return categoryOutcomes(p)
    .filter((o) => !o.tier.esBote)
    .reduce((a, o) => a + o.evAportacion, 0)
}

/** Probabilidad de obtener algún premio (acertar al menos 2+0) */
export function anyPrizeProb(): number {
  return EUROMILLONES_TIERS.reduce((a, t) => a + t.prob, 0)
}

/**
 * En un rolldown, el bote a partir del cual el EV accesible de una sola
 * apuesta corriente supera el coste. Resuelve accessibleEV(rolldown) = precio.
 * accessibleEV_rolldown = [fondo·(1−pctBote) + bote] / N.
 */
export function breakEvenBoteRolldown(p: EuromillonesParams): number {
  const N = p.apuestas
  const fund = p.ratio * N * p.precio
  return p.precio * N - fund * (1 - JACKPOT_PCT)
}
