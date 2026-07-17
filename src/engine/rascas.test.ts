import { describe, expect, it } from 'vitest'
import {
  breakEvenVendidos,
  DEFAULT_RASCA_PARAMS,
  evInicial,
  evRestante,
  poolTotal,
  type RascaParams,
} from './rascas'

describe('Rasca: valor esperado inicial', () => {
  it('el pool total y el EV inicial son coherentes con la estructura', () => {
    const p = DEFAULT_RASCA_PARAMS
    expect(poolTotal(p)).toBe(3_250_000)
    expect(evInicial(p)).toBeCloseTo(3.25, 10) // 65 % de 5 €
    expect(evInicial(p)).toBeLessThan(p.precio) // de inicio, pierdes
  })
})

describe('Rasca: el pool que se agota (edge de información)', () => {
  it('sin vender nada, el EV restante es el inicial', () => {
    expect(evRestante(DEFAULT_RASCA_PARAMS)).toBeCloseTo(evInicial(DEFAULT_RASCA_PARAMS), 6)
  })

  it('si los gordos ya se repartieron, el EV restante baja', () => {
    const conGordos = evRestante({ ...DEFAULT_RASCA_PARAMS, vendidos: 0.5, gordosSinRepartir: 2 })
    const sinGordos = evRestante({ ...DEFAULT_RASCA_PARAMS, vendidos: 0.5, gordosSinRepartir: 0 })
    expect(sinGordos).toBeLessThan(conGordos)
  })

  it('con los gordos aún vivos y muchos cartones vendidos, el EV restante supera el precio', () => {
    const p: RascaParams = { ...DEFAULT_RASCA_PARAMS, vendidos: 0.95, gordosSinRepartir: 2 }
    expect(evRestante(p)).toBeGreaterThan(p.precio)
  })

  it('breakEvenVendidos marca dónde el EV restante cruza el precio', () => {
    const f = breakEvenVendidos(DEFAULT_RASCA_PARAMS)
    expect(f).not.toBeNull()
    expect(evRestante({ ...DEFAULT_RASCA_PARAMS, vendidos: f! })).toBeCloseTo(DEFAULT_RASCA_PARAMS.precio, 3)
    expect(f!).toBeGreaterThan(0.8) // hace falta vender mucho para que aparezca la ventana
  })

  it('si no quedan gordos, nunca hay ventana de EV positivo', () => {
    expect(breakEvenVendidos({ ...DEFAULT_RASCA_PARAMS, gordosSinRepartir: 0 })).toBeNull()
  })
})
