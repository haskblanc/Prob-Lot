import { CATEGORY_BY_ID, PRIORITY_ORDER } from '../engine/config'
import type { DrawConfig, SimulationResult } from '../engine/types'
import { fmtEur, fmtNum } from '../format'

/**
 * Desglose de cuántas veces la cartera acertó cada categoría (contando cada
 * número solo en la más específica) a lo largo de la simulación.
 */
export function CategoryTable({
  result,
  config,
}: {
  result: SimulationResult
  config: DrawConfig
}) {
  const rows = PRIORITY_ORDER.map((id) => ({
    cat: CATEGORY_BY_ID[id],
    wins: result.categoryWins[id],
  })).filter((r) => r.wins > 0)

  if (rows.length === 0) {
    return <p className="text-sm text-ink2">Ninguna categoría acertada en los sorteos simulados.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-1.5 pr-3 font-medium">Categoría</th>
            <th className="py-1.5 pr-3 text-right font-medium">Premio/décimo</th>
            <th className="py-1.5 pr-3 text-right font-medium">Veces acertada</th>
            <th className="py-1.5 text-right font-medium">Frecuencia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ cat, wins }) => (
            <tr key={cat.id} className="border-b border-bord/50">
              <td className="py-1.5 pr-3 text-ink">{cat.label}</td>
              <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                {fmtEur(cat.prize * config.prizeMultiplier, 0)}
              </td>
              <td className="py-1.5 pr-3 text-right text-ink tabular-nums">{fmtNum(wins)}</td>
              <td className="py-1.5 text-right text-ink2 tabular-nums">
                {wins / result.iterations >= 0.5
                  ? `${fmtNum(wins / result.iterations, 2)} por sorteo`
                  : `1 de cada ${fmtNum(Math.round(result.iterations / wins))} sorteos`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
