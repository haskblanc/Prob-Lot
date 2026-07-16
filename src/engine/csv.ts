import { CATEGORY_BY_ID } from './config'
import type { CategoryId, SimulationResult } from './types'

/** Exporta el resumen y la distribución de una simulación a CSV (es-ES: `;`) */
export function simulationToCsv(result: SimulationResult, portfolioName: string): string {
  const rows: string[][] = [
    ['Cartera', portfolioName],
    ['Sorteos simulados', String(result.iterations)],
    ['Coste (€)', result.cost.toFixed(2)],
    ['% sorteos con premio', (result.winRate * 100).toFixed(2)],
    ['Premio medio (€)', result.meanPrize.toFixed(4)],
    ['Ganancia neta media (€)', result.meanNet.toFixed(4)],
    ['Ganancia neta mediana (€)', result.medianNet.toFixed(2)],
    ['p10 (€)', result.percentiles.p10.toFixed(2)],
    ['p50 (€)', result.percentiles.p50.toFixed(2)],
    ['p90 (€)', result.percentiles.p90.toFixed(2)],
    ['p99 (€)', result.percentiles.p99.toFixed(2)],
    [],
    ['Categoría', 'Veces acertada'],
    ...(Object.entries(result.categoryWins) as [CategoryId, number][]).map(([id, wins]) => [
      CATEGORY_BY_ID[id].label,
      String(wins),
    ]),
    [],
    ['Ganancia neta por sorteo (€)'],
    ...Array.from(result.sortedNets, (n) => [n.toFixed(2)]),
  ]
  return rows.map((r) => r.join(';')).join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
