import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtEur, fmtNum, fmtPct } from '../format'

interface Bin {
  label: string
  pct: number
  count: number
  detail: string
}

function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * mag) return m * mag
  }
  return 10 * mag
}

function percentileOf(sorted: Float64Array, p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

/** Agrupa las ganancias netas en barras: valores discretos si hay pocos, si no ~22 intervalos recortados en el p99,5 */
export function buildBins(sorted: Float64Array): Bin[] {
  const n = sorted.length
  if (n === 0) return []

  const distinct = new Map<number, number>()
  for (let i = 0; i < n && distinct.size <= 24; i++) {
    distinct.set(sorted[i], (distinct.get(sorted[i]) ?? 0) + 1)
  }
  if (distinct.size <= 24) {
    return [...distinct.entries()].map(([value, count]) => ({
      label: fmtEur(value, 0),
      pct: count / n,
      count,
      detail: `Ganancia neta ${fmtEur(value)}`,
    }))
  }

  const min = sorted[0]
  const clip = percentileOf(sorted, 0.995)
  const width = niceStep(Math.max((clip - min) / 22, 1e-9))
  const start = Math.floor(min / width) * width
  const binCount = Math.max(1, Math.ceil((clip - start) / width))
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
    label: fmtEur(start + i * width, 0),
    pct: 0,
    count: 0,
    detail: `De ${fmtEur(start + i * width)} a ${fmtEur(start + (i + 1) * width)}`,
  }))
  let overflow = 0
  for (let i = 0; i < n; i++) {
    const idx = Math.floor((sorted[i] - start) / width)
    if (idx >= binCount) overflow++
    else bins[idx].count++
  }
  for (const b of bins) b.pct = b.count / n
  if (overflow > 0) {
    bins.push({
      label: `≥ ${fmtEur(start + binCount * width, 0)}`,
      pct: overflow / n,
      count: overflow,
      detail: `Ganancia neta ≥ ${fmtEur(start + binCount * width)}`,
    })
  }
  return bins
}

function HistTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bin }[] }) {
  if (!active || !payload?.length) return null
  const bin = payload[0].payload
  return (
    <div className="rounded-lg border border-bord bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-ink">{bin.detail}</p>
      <p className="text-ink2">
        {fmtPct(bin.pct, 2)} de los sorteos ({fmtNum(bin.count)})
      </p>
    </div>
  )
}

export function Histogram({ sortedNets, color }: { sortedNets: Float64Array; color: string }) {
  const bins = buildBins(sortedNets)
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top: 8, right: 8, bottom: 4, left: 8 }} barCategoryGap="12%">
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--baseline)' }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => fmtPct(v, 0)}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<HistTooltip />} cursor={{ fill: 'var(--bord)' }} />
          <Bar dataKey="pct" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
