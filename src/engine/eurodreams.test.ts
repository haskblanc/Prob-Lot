import { describe, expect, it } from 'vitest'
import {
  anyPrizeProb,
  DEFAULT_EURODREAMS_PARAMS,
  EURODREAMS_TIERS,
  evNominal,
  evPresent,
  presentValue,
  TOTAL_COMBINACIONES,
  tierNominal,
  tierValue,
} from './eurodreams'

describe('combinatoria de EuroDreams', () => {
  it('hay 19.191.900 combinaciones (C(40,6)·5)', () => {
    expect(TOTAL_COMBINACIONES).toBe(19_191_900)
  })

  it('la probabilidad del 1er premio es 1 entre 19.191.900', () => {
    const jackpot = EURODREAMS_TIERS.find((t) => t.id === '6+S')!
    expect(Math.round(1 / jackpot.prob)).toBe(19_191_900)
  })
})

describe('valor presente de las rentas', () => {
  it('con tasa 0, el valor presente es el nominal (mensual × meses)', () => {
    expect(presentValue(20_000, 360, 0)).toBe(7_200_000)
  })

  it('con tasa positiva, el valor presente es menor que el nominal', () => {
    const vp = presentValue(20_000, 360, 0.04)
    expect(vp).toBeLessThan(7_200_000)
    expect(vp).toBeGreaterThan(0)
    // A mayor tasa, menor valor presente
    expect(presentValue(20_000, 360, 0.08)).toBeLessThan(vp)
  })

  it('el 1er premio anunciado (7,2 M) vale bastante menos en valor presente', () => {
    const jackpot = EURODREAMS_TIERS.find((t) => t.id === '6+S')!
    expect(tierNominal(jackpot)).toBe(7_200_000)
    const vp = tierValue(jackpot, 0.04)
    expect(vp).toBeLessThan(7_200_000 * 0.65) // el descuento se come >35%
  })
})

describe('valor esperado', () => {
  it('el EV con valor presente es menor que con el nominal', () => {
    const nominal = evNominal()
    const presente = evPresent(DEFAULT_EURODREAMS_PARAMS)
    expect(presente).toBeLessThan(nominal)
  })

  it('la probabilidad de algún premio es la suma de las categorías', () => {
    const suma = EURODREAMS_TIERS.reduce((a, t) => a + t.prob, 0)
    expect(anyPrizeProb()).toBeCloseTo(suma, 12)
  })
})
