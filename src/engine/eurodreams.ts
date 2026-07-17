/**
 * Motor de análisis de EuroDreams (6/40 + 1 Sueño/5).
 *
 * EuroDreams es de premio FIJO (como la Lotería Nacional, no parimutuel), pero
 * introduce una dimensión que ninguna otra pestaña tiene: los premios altos
 * son **rentas** (anualidades), no un pago único. El 1er premio son 20.000 €
 * al mes durante 30 años = 7,2 M € "anunciados"… pero 7,2 M € repartidos en 30
 * años valen bastante menos HOY. La herramienta nueva es el **valor presente
 * neto (VPN)**: descontar los pagos futuros a una tasa.
 *
 * Conclusión para el informe: el titular engaña. El valor real del premio
 * (y por tanto el EV) es menor que el nominal, y cuanto mayor la tasa de
 * descuento, más se aleja. Todo combinatoria exacta, sin Monte Carlo.
 */
import { comb } from './primitiva'

/** C(40,6) · 5 = 19.191.900 combinaciones */
export const TOTAL_COMBINACIONES = comb(40, 6) * 5

const mainCombos = (m: number) => comb(6, m) * comb(34, 6 - m)

export interface EurodreamsTier {
  id: string
  label: string
  /** Nº de números principales acertados */
  m: number
  /** Requiere además el número del Sueño */
  needsDream: boolean
  combinaciones: number
  prob: number
  /** Renta: pago mensual (€). 0 si es premio en metálico único */
  mensual: number
  /** Renta: nº de meses. 0 si es premio en metálico único */
  meses: number
  /** Premio único en metálico (€), si no es renta */
  fijo: number
}

interface TierDef {
  id: string
  label: string
  m: number
  needsDream: boolean
  mensual: number
  meses: number
  fijo: number
}

const TIER_DEFS: TierDef[] = [
  { id: '6+S', label: '6 + Sueño', m: 6, needsDream: true, mensual: 20_000, meses: 360, fijo: 0 },
  { id: '6', label: '6', m: 6, needsDream: false, mensual: 2_000, meses: 60, fijo: 0 },
  { id: '5', label: '5', m: 5, needsDream: false, mensual: 0, meses: 0, fijo: 500 },
  { id: '4', label: '4', m: 4, needsDream: false, mensual: 0, meses: 0, fijo: 20 },
  { id: '3', label: '3', m: 3, needsDream: false, mensual: 0, meses: 0, fijo: 6 },
  { id: '2', label: '2', m: 2, needsDream: false, mensual: 0, meses: 0, fijo: 4 },
]

/** Probabilidad de acertar exactamente `m` números principales (sin Sueño) */
const mainProb = (m: number) => mainCombos(m) / comb(40, 6)

export const EURODREAMS_TIERS: readonly EurodreamsTier[] = TIER_DEFS.map((d) => {
  const base = mainProb(d.m)
  // El Sueño (1 de 5) solo cuenta para el 1er premio; el 6 "a secas" es 6 sin Sueño.
  const prob = d.needsDream ? base * (1 / 5) : d.m === 6 ? base * (4 / 5) : base
  const combinaciones = Math.round(prob * TOTAL_COMBINACIONES)
  return { ...d, combinaciones, prob }
})

export interface EurodreamsParams {
  /** Precio por apuesta, € */
  precio: number
  /** Tasa de descuento anual (para el valor presente de las rentas) */
  tasaAnual: number
}

export const DEFAULT_EURODREAMS_PARAMS: EurodreamsParams = {
  precio: 2.5,
  tasaAnual: 0.04,
}

/**
 * Valor presente de una renta de `mensual` € durante `meses` meses, con tasa
 * anual `tasaAnual` (interés mensual = tasaAnual/12). VPN de anualidad
 * vencida: pago · (1 − (1+i)^−n) / i. Con tasa 0, es pago · n (el nominal).
 */
export function presentValue(mensual: number, meses: number, tasaAnual: number): number {
  if (meses <= 0) return 0
  const i = tasaAnual / 12
  if (i === 0) return mensual * meses
  return mensual * ((1 - (1 + i) ** -meses) / i)
}

/** Valor de un premio: metálico fijo, o valor presente de la renta */
export function tierValue(tier: EurodreamsTier, tasaAnual: number): number {
  if (tier.mensual > 0) return presentValue(tier.mensual, tier.meses, tasaAnual)
  return tier.fijo
}

/** Valor NOMINAL de un premio (lo "anunciado": mensual × meses, o el fijo) */
export function tierNominal(tier: EurodreamsTier): number {
  return tier.mensual > 0 ? tier.mensual * tier.meses : tier.fijo
}

/** Valor esperado por apuesta usando el valor PRESENTE de los premios (€) */
export function evPresent(p: EurodreamsParams): number {
  return EURODREAMS_TIERS.reduce((a, t) => a + t.prob * tierValue(t, p.tasaAnual), 0)
}

/** Valor esperado por apuesta usando el valor NOMINAL (lo anunciado) (€) */
export function evNominal(): number {
  return EURODREAMS_TIERS.reduce((a, t) => a + t.prob * tierNominal(t), 0)
}

/** Probabilidad de obtener algún premio (≥ 2 aciertos) */
export function anyPrizeProb(): number {
  return EURODREAMS_TIERS.reduce((a, t) => a + t.prob, 0)
}
