import { guaranteedFloor, portfolioCost, theoreticalEV } from '../engine/portfolio'
import type { DrawConfig, SimulationResult } from '../engine/types'
import { fmtEur, fmtPct } from '../format'
import { Card, ColorChip, SectionTitle, colorForSlot, type UiPortfolio } from './ui'

/**
 * Comparador lado a lado: tabla de métricas + gráfico de rangos simulados
 * (barra p10–p90, marca en la mediana, punto en la media) sobre un eje común.
 */
export function Comparator({
  portfolios,
  results,
  config,
}: {
  portfolios: UiPortfolio[]
  results: Record<string, SimulationResult>
  config: DrawConfig
}) {
  const rows = portfolios.map((p) => {
    const r: SimulationResult | undefined = results[p.id]
    return {
      p,
      r,
      cost: portfolioCost(p.lines, config),
      ev: theoreticalEV(p.lines, config),
      floor: guaranteedFloor(p.lines, config),
    }
  })

  const withResults = rows.filter((row) => row.r)
  const lo = Math.min(0, ...withResults.map((row) => row.r!.percentiles.p10))
  const hi = Math.max(1, ...withResults.map((row) => row.r!.percentiles.p90))
  const span = hi - lo
  const x = (v: number) => ((v - lo) / span) * 100

  const ticks = [lo, lo + span / 4, lo + span / 2, lo + (3 * span) / 4, hi]

  return (
    <Card>
      <SectionTitle sub="Mismos sorteos simulados para todas las carteras (misma secuencia aleatoria): el retorno esperado es siempre ≈70 % del coste, lo que cambia es la varianza y las garantías.">
        Comparador de estrategias
      </SectionTitle>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-1.5 pr-3 font-medium">Cartera</th>
              <th className="py-1.5 pr-3 text-right font-medium">Coste</th>
              <th className="py-1.5 pr-3 text-right font-medium">EV teórico (70 %)</th>
              <th className="py-1.5 pr-3 text-right font-medium">Retorno simulado</th>
              <th className="py-1.5 pr-3 text-right font-medium">P(algún premio)</th>
              <th className="py-1.5 pr-3 text-right font-medium">Neto mediano</th>
              <th className="py-1.5 pr-3 text-right font-medium">p99</th>
              <th className="py-1.5 text-right font-medium">Mínimo garantizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, r, cost, ev, floor }) => (
              <tr key={p.id} className="border-b border-bord/50">
                <td className="py-1.5 pr-3">
                  <span className="flex items-center gap-2 text-ink">
                    <ColorChip color={colorForSlot(p.colorSlot)} />
                    {p.name}
                  </span>
                </td>
                <td className="py-1.5 pr-3 text-right text-ink tabular-nums">{fmtEur(cost, 0)}</td>
                <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">{fmtEur(ev)}</td>
                <td className="py-1.5 pr-3 text-right text-ink tabular-nums">
                  {r ? `${fmtEur(r.meanPrize)} (${fmtPct(r.meanPrize / cost)})` : '…'}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink tabular-nums">
                  {r ? fmtPct(r.winRate) : '…'}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                  {r ? fmtEur(r.medianNet) : '…'}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                  {r ? fmtEur(r.percentiles.p99) : '…'}
                </td>
                <td className="py-1.5 text-right text-ink2 tabular-nums">
                  {floor ? fmtEur(floor.minPrize, 0) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withResults.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Ganancia neta simulada: barra p10–p90 · marca = mediana · punto = media
          </p>
          <div className="relative flex flex-col gap-3 py-1">
            {/* Línea del cero */}
            <div
              aria-hidden
              className="absolute inset-y-0 w-px bg-baseline"
              style={{ left: `${x(0)}%` }}
            />
            {withResults.map(({ p, r }) => {
              const color = colorForSlot(p.colorSlot)
              const from = x(r!.percentiles.p10)
              const to = x(r!.percentiles.p90)
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-right text-xs text-ink2">
                    {p.name}
                  </span>
                  <div
                    className="relative h-5 grow"
                    title={`${p.name}: p10 ${fmtEur(r!.percentiles.p10)} · mediana ${fmtEur(
                      r!.medianNet,
                    )} · p90 ${fmtEur(r!.percentiles.p90)} · media ${fmtEur(r!.meanNet)}`}
                  >
                    <div
                      className="absolute top-1 h-3 rounded-[4px]"
                      style={{
                        left: `${Math.min(from, to)}%`,
                        width: `${Math.max(Math.abs(to - from), 0.4)}%`,
                        backgroundColor: color,
                        opacity: 0.85,
                      }}
                    />
                    <div
                      className="absolute top-0 h-5 w-0.5"
                      style={{ left: `${x(r!.medianNet)}%`, backgroundColor: 'var(--ink)' }}
                    />
                    <div
                      className="absolute top-1.5 h-2 w-2 rounded-full border-2"
                      style={{
                        left: `calc(${x(r!.meanNet)}% - 4px)`,
                        backgroundColor: 'var(--surface-1)',
                        borderColor: color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0" />
              <div className="relative h-4 grow text-[10px] text-muted">
                {ticks.map((t, i) => (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 tabular-nums"
                    style={{ left: `${x(t)}%` }}
                  >
                    {fmtEur(t, 0)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
