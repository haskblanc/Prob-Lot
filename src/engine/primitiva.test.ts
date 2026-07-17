import { describe, expect, it } from 'vitest'
import {
  breakEvenBote,
  buyAllAnalysis,
  categoryOutcomes,
  comb,
  DEFAULT_PRIMITIVA_PARAMS,
  PRIMITIVA_CATEGORIES,
  singleBetEV,
  TOTAL_COMBINACIONES,
  type PrimitivaParams,
} from './primitiva'

describe('combinatoria de La Primitiva', () => {
  it('C(49,6) = 13.983.816', () => {
    expect(TOTAL_COMBINACIONES).toBe(13_983_816)
  })

  it('los conteos por categoría son los combinatorios exactos', () => {
    const byId = Object.fromEntries(PRIMITIVA_CATEGORIES.map((c) => [c.id, c]))
    expect(byId.especial.combinaciones).toBe(1)
    expect(byId.primera.combinaciones).toBe(1)
    expect(byId.segunda.combinaciones).toBe(6) // 5 + complementario
    expect(byId.tercera.combinaciones).toBe(252) // 5 aciertos
    expect(byId.cuarta.combinaciones).toBe(13_545) // 4 aciertos
    expect(byId.quinta.combinaciones).toBe(246_820) // 3 aciertos
  })

  it('las combinaciones con 3+ aciertos + las de menos aciertos suman el total', () => {
    // Reparto exacto de las 13.983.816 combinaciones por nº de aciertos (0..6)
    const porAciertos = Array.from({ length: 7 }, (_, k) => comb(6, k) * comb(43, 6 - k))
    expect(porAciertos.reduce((a, b) => a + b, 0)).toBe(TOTAL_COMBINACIONES)
    // 6,5,4,3 aciertos coinciden con las categorías (5+compl. y 5 juntas = 258)
    expect(porAciertos[6]).toBe(1)
    expect(porAciertos[5]).toBe(258) // 6 (con compl.) + 252 (sin)
    expect(porAciertos[4]).toBe(13_545)
    expect(porAciertos[3]).toBe(246_820)
  })

  it('las probabilidades coinciden con las cuotas conocidas (1 en N)', () => {
    const byId = Object.fromEntries(PRIMITIVA_CATEGORIES.map((c) => [c.id, c]))
    expect(Math.round(1 / byId.primera.prob)).toBe(15_537_573) // 6 aciertos (sin reintegro)
    expect(Math.round(1 / byId.reintegro.prob)).toBe(10)
    expect(Math.round(1 / (byId.especial.prob + byId.primera.prob))).toBe(TOTAL_COMBINACIONES) // 6 aciertos
  })
})

describe('valor esperado de una apuesta', () => {
  it('sin bote, EV = ratio · precio (peor que el 70 % de la Lotería Nacional)', () => {
    const ev = singleBetEV({ ...DEFAULT_PRIMITIVA_PARAMS, bote: 0 })
    expect(ev).toBeCloseTo(0.55, 10)
  })

  it('el bote sube el EV, pero repartido entre todas las apuestas', () => {
    const p: PrimitivaParams = { ...DEFAULT_PRIMITIVA_PARAMS, bote: 30_000_000, otrasApuestas: 15_000_000 }
    // EV = 0.55·1 + 30M/15.000.001 ≈ 0.55 + 2.0
    expect(singleBetEV(p)).toBeCloseTo(0.55 + 30_000_000 / 15_000_001, 6)
  })
})

describe('desglose por categoría', () => {
  it('la suma de aportaciones al EV coincide con singleBetEV', () => {
    const p: PrimitivaParams = { ...DEFAULT_PRIMITIVA_PARAMS, bote: 40_000_000 }
    const suma = categoryOutcomes(p).reduce((a, o) => a + o.evAportacion, 0)
    expect(suma).toBeCloseTo(singleBetEV(p), 9)
  })

  it('el premio por acertante de 5ª es fijo (8 €) y el bote va a la especial', () => {
    const outcomes = categoryOutcomes({ ...DEFAULT_PRIMITIVA_PARAMS, bote: 50_000_000 })
    const byId = Object.fromEntries(outcomes.map((o) => [o.cat.id, o]))
    expect(byId.quinta.premioPorAcertante).toBe(8)
    // La especial concentra el bote: su premio por acertante es enorme frente a 1ª
    expect(byId.especial.premioPorAcertante).toBeGreaterThan(byId.primera.premioPorAcertante)
  })
})

describe('estrategia de comprar todas las combinaciones (Stefan Mandel)', () => {
  it('la 5ª categoría garantiza 246.820 × 8 € = 1.974.560 € seguros', () => {
    const r = buyAllAnalysis(DEFAULT_PRIMITIVA_PARAMS)
    expect(r.garantizadoQuinta).toBe(1_974_560)
    expect(r.coste).toBe(13_983_816)
  })

  it('sin bote pierde dinero; con un bote gigante gana', () => {
    const sinBote = buyAllAnalysis({ ...DEFAULT_PRIMITIVA_PARAMS, bote: 0 })
    expect(sinBote.neta).toBeLessThan(0)
    const conBote = buyAllAnalysis({ ...DEFAULT_PRIMITIVA_PARAMS, bote: 100_000_000 })
    expect(conBote.neta).toBeGreaterThan(0)
  })

  it('en el caso idealizado (sin otros jugadores) el bote crítico es (1−ratio)·coste', () => {
    const p: PrimitivaParams = { ...DEFAULT_PRIMITIVA_PARAMS, otrasApuestas: 0, ratio: 0.55 }
    const esperado = (1 - 0.55) * TOTAL_COMBINACIONES * p.precio
    expect(breakEvenBote(p)).toBeCloseTo(esperado, 2)
    // Comprando todo justo en el bote crítico, la ganancia neta es ~0
    const r = buyAllAnalysis({ ...p, bote: breakEvenBote(p) })
    expect(Math.abs(r.neta)).toBeLessThan(1)
  })

  it('cuantos más jugadores compartan, mayor bote crítico se necesita', () => {
    const pocos = breakEvenBote({ ...DEFAULT_PRIMITIVA_PARAMS, otrasApuestas: 1_000_000 })
    const muchos = breakEvenBote({ ...DEFAULT_PRIMITIVA_PARAMS, otrasApuestas: 30_000_000 })
    expect(muchos).toBeGreaterThan(pocos)
  })
})
