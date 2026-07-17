import { describe, expect, it } from 'vitest'
import {
  anyPrizeProb,
  breakEvenSkill,
  categoryOutcomes,
  DEFAULT_QUINIGOL_PARAMS,
  expectedHits,
  N_PARTIDOS,
  singleBetEV,
  type QuinigolParams,
} from './quinigol'

describe('El Quinigol', () => {
  it('son 6 partidos', () => {
    expect(N_PARTIDOS).toBe(6)
  })

  it('aciertos esperados = 6 · pMine', () => {
    expect(expectedHits({ ...DEFAULT_QUINIGOL_PARAMS, pMine: 0.2 })).toBeCloseTo(1.2, 12)
  })

  it('la suma de aportaciones por categoría es el EV', () => {
    const p: QuinigolParams = { ...DEFAULT_QUINIGOL_PARAMS, bote: 1_000_000 }
    const suma = categoryOutcomes(p).reduce((a, o) => a + o.evAportacion, 0)
    expect(suma).toBeCloseTo(singleBetEV(p), 12)
  })

  it('acertar marcadores exactos es más raro que el 1-X-2: P(algún premio ≥4) es baja', () => {
    // Con pMine típico (20 %), acertar 4 de 6 marcadores exactos es muy improbable
    const p = anyPrizeProb({ ...DEFAULT_QUINIGOL_PARAMS, pMine: 0.2 })
    expect(p).toBeLessThan(0.02)
    expect(p).toBeGreaterThan(0)
  })

  it('la originalidad paga: si la multitud falla más, tu premio por acertante sube', () => {
    const listos = categoryOutcomes({ ...DEFAULT_QUINIGOL_PARAMS, pCrowd: 0.22 })
    const fallan = categoryOutcomes({ ...DEFAULT_QUINIGOL_PARAMS, pCrowd: 0.1 })
    const gordo = (os: ReturnType<typeof categoryOutcomes>) => os.find((o) => o.hits === 6)!.premioPorAcertante
    expect(gordo(fallan)).toBeGreaterThan(gordo(listos))
  })

  it('la habilidad crítica, si existe, iguala el EV al coste', () => {
    const p = { ...DEFAULT_QUINIGOL_PARAMS, bote: 2_000_000 }
    const skill = breakEvenSkill(p)
    if (skill !== null) expect(singleBetEV({ ...p, pMine: skill })).toBeCloseTo(p.precio, 4)
  })
})
