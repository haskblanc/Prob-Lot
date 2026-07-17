import { describe, expect, it } from 'vitest'
import {
  accessibleEV,
  anyPrizeProb,
  breakEvenBoteRolldown,
  DEFAULT_EUROMILLONES_PARAMS,
  EUROMILLONES_TIERS,
  singleBetEV,
  TOTAL_COMBINACIONES,
  type EuromillonesParams,
} from './euromillones'

describe('combinatoria de Euromillones', () => {
  it('hay 139.838.160 combinaciones', () => {
    expect(TOTAL_COMBINACIONES).toBe(139_838_160)
  })

  it('son 13 categorías y los conteos son los combinatorios exactos', () => {
    expect(EUROMILLONES_TIERS).toHaveLength(13)
    const byId = Object.fromEntries(EUROMILLONES_TIERS.map((t) => [t.id, t]))
    expect(byId['5+2'].combinaciones).toBe(1)
    expect(byId['5+1'].combinaciones).toBe(20)
    expect(byId['2+0'].combinaciones).toBe(6_385_500)
  })

  it('la probabilidad de algún premio es ~1 en 13', () => {
    expect(Math.round(1 / anyPrizeProb())).toBe(13)
  })

  it('los porcentajes de reparto están normalizados (suman 1)', () => {
    expect(EUROMILLONES_TIERS.reduce((a, t) => a + t.pct, 0)).toBeCloseTo(1, 12)
  })
})

describe('el rolldown mueve el bote a las categorías accesibles', () => {
  const bote = 200_000_000
  const base: EuromillonesParams = { ...DEFAULT_EUROMILLONES_PARAMS, bote }

  it('el EV total es el mismo con y sin rolldown (solo cambia dónde está el dinero)', () => {
    const normal = singleBetEV({ ...base, rolldown: false })
    const roll = singleBetEV({ ...base, rolldown: true })
    expect(roll).toBeCloseTo(normal, 6)
  })

  it('sin rolldown, gran parte del EV está atrapado en el 5+2 (EV accesible << EV total)', () => {
    const total = singleBetEV({ ...base, rolldown: false })
    const acc = accessibleEV({ ...base, rolldown: false })
    expect(acc).toBeLessThan(total * 0.5)
  })

  it('con rolldown, el EV accesible sube por encima del total normal', () => {
    const accNormal = accessibleEV({ ...base, rolldown: false })
    const accRoll = accessibleEV({ ...base, rolldown: true })
    expect(accRoll).toBeGreaterThan(accNormal)
  })

  it('con rolldown y bote grande, una apuesta corriente puede ser EV positivo', () => {
    // Bote al tope con participación moderada
    const p: EuromillonesParams = { ...DEFAULT_EUROMILLONES_PARAMS, bote: 250_000_000, apuestas: 90_000_000, rolldown: true }
    expect(accessibleEV(p)).toBeGreaterThan(p.precio)
  })
})

describe('bote crítico del rolldown', () => {
  it('en el bote crítico, el EV accesible con rolldown iguala el coste', () => {
    const p = { ...DEFAULT_EUROMILLONES_PARAMS, rolldown: true }
    const bote = breakEvenBoteRolldown(p)
    expect(accessibleEV({ ...p, bote })).toBeCloseTo(p.precio, 4)
  })

  it('más participación exige un bote crítico mayor', () => {
    const pocos = breakEvenBoteRolldown({ ...DEFAULT_EUROMILLONES_PARAMS, apuestas: 50_000_000 })
    const muchos = breakEvenBoteRolldown({ ...DEFAULT_EUROMILLONES_PARAMS, apuestas: 150_000_000 })
    expect(muchos).toBeGreaterThan(pocos)
  })
})
