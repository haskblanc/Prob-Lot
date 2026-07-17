import { describe, expect, it } from 'vitest'
import {
  anyPrizeProb,
  binomialPmf,
  breakEvenSkill,
  categoryOutcomes,
  DEFAULT_QUINIELA_PARAMS,
  expectedHits,
  N_PARTIDOS,
  singleBetEV,
  type QuinielaParams,
} from './quiniela'

describe('binomial', () => {
  it('la distribución suma 1 y tiene n+1 términos', () => {
    const pmf = binomialPmf(14, 0.45)
    expect(pmf).toHaveLength(15)
    expect(pmf.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('coincide con valores conocidos', () => {
    // P(14 aciertos con p=0.45) = 0.45^14
    expect(binomialPmf(14, 0.45)[14]).toBeCloseTo(0.45 ** 14, 15)
    // P(0 aciertos) = 0.55^14
    expect(binomialPmf(14, 0.45)[0]).toBeCloseTo(0.55 ** 14, 15)
    // Simétrico con p=0.5
    const half = binomialPmf(14, 0.5)
    expect(half[3]).toBeCloseTo(half[11], 15)
  })
})

describe('estadísticos de aciertos', () => {
  it('los aciertos esperados son 14 · pMine', () => {
    expect(expectedHits({ ...DEFAULT_QUINIELA_PARAMS, pMine: 0.5 })).toBe(7)
  })

  it('más habilidad ⇒ más probabilidad de algún premio (≥10)', () => {
    const flojo = anyPrizeProb({ ...DEFAULT_QUINIELA_PARAMS, pMine: 0.35 })
    const experto = anyPrizeProb({ ...DEFAULT_QUINIELA_PARAMS, pMine: 0.55 })
    expect(experto).toBeGreaterThan(flojo)
  })
})

describe('EV y las dos palancas (habilidad y multitud)', () => {
  it('la suma de aportaciones por categoría es el EV', () => {
    const p: QuinielaParams = { ...DEFAULT_QUINIELA_PARAMS, bote: 2_000_000 }
    const suma = categoryOutcomes(p).reduce((a, o) => a + o.evAportacion, 0)
    expect(suma).toBeCloseTo(singleBetEV(p), 12)
  })

  it('acertar mejor que la multitud sube el EV (habilidad)', () => {
    const igual = singleBetEV({ ...DEFAULT_QUINIELA_PARAMS, pMine: 0.4, pCrowd: 0.4 })
    const mejor = singleBetEV({ ...DEFAULT_QUINIELA_PARAMS, pMine: 0.5, pCrowd: 0.4 })
    expect(mejor).toBeGreaterThan(igual)
  })

  it('si la multitud acierta menos (resultados sorpresa), tu premio por acertante sube (originalidad)', () => {
    const multitudLista = categoryOutcomes({ ...DEFAULT_QUINIELA_PARAMS, pCrowd: 0.5 })
    const multitudFalla = categoryOutcomes({ ...DEFAULT_QUINIELA_PARAMS, pCrowd: 0.33 })
    const p14Lista = multitudLista.find((o) => o.hits === 14)!.premioPorAcertante
    const p14Falla = multitudFalla.find((o) => o.hits === 14)!.premioPorAcertante
    expect(p14Falla).toBeGreaterThan(p14Lista)
  })
})

describe('habilidad crítica (umbral de EV positivo)', () => {
  it('con habilidad = crítica el EV iguala el coste', () => {
    const p = { ...DEFAULT_QUINIELA_PARAMS, bote: 5_000_000 }
    const skill = breakEvenSkill(p)
    expect(skill).not.toBeNull()
    expect(singleBetEV({ ...p, pMine: skill! })).toBeCloseTo(p.precio, 4)
  })

  it('si la multitud acierta casi todo (jornada previsible), ni el acierto perfecto basta', () => {
    // Con pCrowd altísimo, todos comparten el premio gordo → premio unitario
    // ridículo; ni pMine=1 supera el coste. Es el reverso de la ventaja: la
    // originalidad desaparece cuando no hay sorpresas.
    const p = { ...DEFAULT_QUINIELA_PARAMS, pCrowd: 0.9, bote: 0 }
    expect(breakEvenSkill(p)).toBeNull()
  })

  it('la habilidad crítica está por encima de la de la multitud (hay que batirla)', () => {
    const p = { ...DEFAULT_QUINIELA_PARAMS, pCrowd: 0.4, bote: 3_000_000 }
    const skill = breakEvenSkill(p)
    if (skill !== null) expect(skill).toBeGreaterThan(p.pCrowd)
  })

  it('el nº de partidos es 14', () => {
    expect(N_PARTIDOS).toBe(14)
  })
})
