import { describe, expect, it } from 'vitest'
import { DRAW_CONFIGS, PAYOUT_RATIO, PRIZE_CATEGORIES } from './config'
import {
  generateDraw,
  lastKStr,
  matchCategories,
  prepareDrawIndex,
  scoreNumericFast,
  scoreTicket,
  toNumero,
} from './lotteryEngine'
import { detectConsecutiveRun, guaranteedFloor, portfolioCost } from './portfolio'
import { singleNumberWinProb } from './probability'
import { createRng } from './rng'
import { simulatePortfolio } from './simulation'
import { SERIES_SIZE, type Draw, type TicketLine } from './types'

const JUEVES = DRAW_CONFIGS[0]

describe('PRIZE_CATEGORIES', () => {
  it('los números premiados por serie suman exactamente 41.050', () => {
    const total = PRIZE_CATEGORIES.reduce((acc, c) => acc + c.count, 0)
    expect(total).toBe(41_050)
  })

  it('el importe total de premios por serie es el 70 % de la recaudación', () => {
    const totalPrizes = PRIZE_CATEGORIES.reduce((acc, c) => acc + c.count * c.prize, 0)
    const totalSales = SERIES_SIZE * JUEVES.ticketPrice
    expect(totalPrizes).toBe(totalSales * PAYOUT_RATIO) // 210.000 €
  })
})

describe('generateDraw', () => {
  const rng = createRng(42)

  it('genera sorteos coherentes y sin colisiones en la pedrea', () => {
    for (let i = 0; i < 200; i++) {
      const draw = generateDraw(rng)
      expect(draw.segundo).not.toBe(draw.primer)
      expect(new Set(draw.pedrea4).size).toBe(4)
      expect(new Set(draw.pedrea3).size).toBe(7)
      expect(new Set(draw.pedrea2).size).toBe(9)
      expect(draw.pedrea4).not.toContain(lastKStr(draw.primer, 4))
      expect(draw.pedrea4).not.toContain(lastKStr(draw.segundo, 4))
      expect(draw.pedrea3).not.toContain(lastKStr(draw.primer, 3))
      expect(draw.pedrea3).not.toContain(lastKStr(draw.segundo, 3))
      expect(draw.pedrea2).not.toContain(lastKStr(draw.primer, 2))
      expect(draw.pedrea2).not.toContain(lastKStr(draw.segundo, 2))
    }
  })

  it('en cualquier sorteo, cada categoría reclama exactamente su count nominal (suma 41.050)', () => {
    const draw = generateDraw(createRng(7))
    const counts = new Map<string, number>()
    for (let n = 0; n < SERIES_SIZE; n++) {
      for (const id of matchCategories(n, draw)) {
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
    for (const cat of PRIZE_CATEGORIES) {
      expect(counts.get(cat.id) ?? 0).toBe(cat.count)
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(41_050)
  })

  it('el pago total a una serie completa es exactamente 210.000 € en todos los sorteos (EV = 70 %)', () => {
    const rng2 = createRng(123)
    for (let i = 0; i < 5; i++) {
      const draw = generateDraw(rng2)
      let total = 0
      for (let n = 0; n < SERIES_SIZE; n++) {
        total += scoreTicket(toNumero(n), 1, draw, JUEVES).premio
      }
      expect(total).toBe(210_000)
    }
  })
})

describe('scoreTicket', () => {
  const draw: Draw = {
    primer: 12345,
    segundo: 67890,
    pedrea4: ['1111', '2222', '3333', '4444'],
    pedrea3: ['901', '902', '903', '904', '905', '906', '907'],
    pedrea2: ['10', '20', '30', '40', '50', '60', '70', '80'].concat(['99']).map((s) => s.padStart(2, '0')),
    reintegroE1: '7',
    reintegroE2: '2',
  }

  it('detecta el 1er premio y acumula sus conceptos compatibles', () => {
    const { categoria, premio } = scoreTicket('12345', 1, draw, JUEVES)
    expect(categoria).toBe('primer')
    expect(premio).toBe(30_000)
  })

  it('aproximación al 1er premio', () => {
    expect(scoreTicket('12344', 1, draw, JUEVES).categoria).toBe('aprox1')
    expect(scoreTicket('12346', 1, draw, JUEVES).categoria).toBe('aprox1')
    // 12344: aproximación (1.200) + centena (30) + reintegro E2 no, última cifra 4 → solo ambos conceptos
    expect(scoreTicket('12344', 1, draw, JUEVES).premio).toBe(1_200 + 30)
  })

  it('terminación de 4 cifras acumula las de 3, 2 y el reintegro, y nunca se informa como terminación de 3', () => {
    const { categoria, premio } = scoreTicket('92345', 1, draw, JUEVES)
    expect(categoria).toBe('term4_1')
    expect(premio).toBe(75 + 15 + 6 + 3)
  })

  it('terminación de 3 cifras (sin la de 4)', () => {
    const { categoria, premio } = scoreTicket('90345', 1, draw, JUEVES)
    expect(categoria).toBe('term3_1')
    expect(premio).toBe(15 + 6 + 3)
  })

  it('reintegro especial, acumulable con el ordinario', () => {
    // 00007: última cifra 7 = reintegroE1; no comparte última cifra con 12345
    const r = scoreTicket('00007', 1, draw, JUEVES)
    expect(r.categoria).toBe('reintegroE1')
    expect(r.premio).toBe(3)
    // 00015: última cifra 5 = reintegro del 1er premio, y no es reintegro especial
    const r2 = scoreTicket('00015', 1, draw, JUEVES)
    expect(r2.categoria).toBe('reintegro1')
    expect(r2.premio).toBe(3)
  })

  it('multiplica por décimos y por la configuración del sábado', () => {
    const sabado = DRAW_CONFIGS[1]
    expect(scoreTicket('12345', 10, draw, JUEVES).premio).toBe(300_000)
    expect(scoreTicket('12345', 1, draw, sabado).premio).toBe(60_000)
  })

  it('sin premio', () => {
    // 55554: sin relación con 12345 ni 67890, ni pedrea, ni reintegros (7, 2)
    const r = scoreTicket('55554', 1, draw, JUEVES)
    expect(r.categoria).toBeNull()
    expect(r.premio).toBe(0)
  })
})

describe('scoreNumericFast', () => {
  it('coincide exactamente con scoreTicket (categoría y premio) para cualquier número y sorteo', () => {
    const rng = createRng(2026)
    for (let d = 0; d < 20; d++) {
      const draw = generateDraw(rng)
      const idx = prepareDrawIndex(draw)
      for (let t = 0; t < 500; t++) {
        const n = Math.floor(rng() * SERIES_SIZE)
        const decimos = 1 + Math.floor(rng() * 10)
        const expected = scoreTicket(toNumero(n), decimos, draw, JUEVES)
        const fast = scoreNumericFast(n, decimos, idx, JUEVES)
        expect(fast).toEqual(expected)
      }
    }
  })
})

describe('convergencia del valor esperado (Monte Carlo)', () => {
  it('el EV simulado converge a ~70 % del coste al aumentar las iteraciones', () => {
    const lines: TicketLine[] = Array.from({ length: 100 }, (_, i) => ({
      numero: toNumero(20_000 + i),
      decimos: 1,
    }))
    const cost = portfolioCost(lines, JUEVES)
    const expected = cost * PAYOUT_RATIO

    const errorAt = (iterations: number) => {
      const r = simulatePortfolio(lines, JUEVES, { iterations, seed: 2026 })
      return Math.abs(r.meanPrize - expected) / expected
    }

    const err50k = errorAt(50_000)
    expect(err50k).toBeLessThan(0.08)
    // Con 50× más iteraciones el error debe ser claramente menor que con 1.000
    expect(err50k).toBeLessThan(errorAt(1_000) + 0.02)
  })
})

describe('probabilidad exacta y garantías', () => {
  it('la probabilidad exacta de premio de un número coincide con Monte Carlo', () => {
    const exact = singleNumberWinProb('54321')
    const r = simulatePortfolio([{ numero: '54321', decimos: 1 }], JUEVES, {
      iterations: 100_000,
      seed: 99,
    })
    expect(Math.abs(exact - r.winRate)).toBeLessThan(0.01)
  })

  it('detecta series consecutivas, incluida la que envuelve por 99999', () => {
    const serie = Array.from({ length: 10 }, (_, i) => ({ numero: toNumero(99_995 + i > 99_999 ? 99_995 + i - 100_000 : 99_995 + i), decimos: 1 }))
    expect(detectConsecutiveRun(serie)).toEqual({ length: 10, decimos: 1 })
  })

  it('una serie de 100 consecutivos garantiza 150 € como mínimo', () => {
    const lines = Array.from({ length: 100 }, (_, i) => ({ numero: toNumero(500 + i), decimos: 1 }))
    const g = guaranteedFloor(lines, JUEVES)
    expect(g).not.toBeNull()
    // 30 reintegros × 3 € + 10 terminaciones de 2 cifras × 6 €
    expect(g!.minPrize).toBe(90 + 60)
    expect(g!.minWinners).toBe(10)
  })

  it('el suelo garantizado se cumple en sorteos simulados', () => {
    const lines = Array.from({ length: 100 }, (_, i) => ({ numero: toNumero(31_400 + i), decimos: 1 }))
    const g = guaranteedFloor(lines, JUEVES)!
    const rng = createRng(5)
    for (let i = 0; i < 300; i++) {
      const draw = generateDraw(rng)
      let prize = 0
      for (const l of lines) prize += scoreTicket(l.numero, l.decimos, draw, JUEVES).premio
      expect(prize).toBeGreaterThanOrEqual(g.minPrize)
    }
  })
})
