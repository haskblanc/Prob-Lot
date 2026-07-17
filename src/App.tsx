import { useMemo, useState } from 'react'
import { CategoryTable } from './components/CategoryTable'
import { Comparator } from './components/Comparator'
import { Histogram } from './components/Histogram'
import { PortfolioBuilder } from './components/PortfolioBuilder'
import { Card, ColorChip, SectionTitle, StatTile, colorForSlot, type UiPortfolio } from './components/ui'
import { DRAW_CONFIGS, PAYOUT_RATIO } from './engine/config'
import { downloadCsv, simulationToCsv } from './engine/csv'
import { guaranteedFloor, portfolioCost, theoreticalEV } from './engine/portfolio'
import { dispersedWinProb, singleNumberWinProb } from './engine/probability'
import type { Portfolio } from './engine/types'
import { fmtEur, fmtNum, fmtPct } from './format'
import { useSimulations } from './hooks/useSimulations'

const ITERATION_CHOICES = [10, 1_000, 10_000, 100_000]

const MODE_LABELS: Record<Portfolio['mode'], string> = {
  suelto: 'Número suelto',
  billete: 'Billete entero',
  serie: 'Serie consecutiva',
  dispersos: 'Números dispersos',
  personalizada: 'Personalizada',
}

/** Semilla numérica a partir del texto introducido ('' = aleatoria) */
function parseSeed(input: string): number | undefined {
  const t = input.trim()
  if (t === '') return undefined
  const n = Number(t)
  if (Number.isFinite(n)) return Math.floor(n)
  let h = 0
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0
  return h >>> 0
}

export default function App() {
  const [configId, setConfigId] = useState<'jueves' | 'sabado'>('jueves')
  const [iterations, setIterations] = useState(10_000)
  const [seedInput, setSeedInput] = useState('')
  const [portfolios, setPortfolios] = useState<UiPortfolio[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const config = DRAW_CONFIGS.find((c) => c.id === configId)!
  const seed = parseSeed(seedInput)
  const { results, progress, running } = useSimulations(portfolios, config, iterations, seed)

  const active = portfolios.find((p) => p.id === activeId) ?? portfolios[0] ?? null
  const activeResult = active ? results[active.id] : undefined

  const addPortfolio = (p: Portfolio) => {
    setPortfolios((prev) => {
      const usedSlots = new Set(prev.map((x) => x.colorSlot))
      const colorSlot = [0, 1, 2, 3].find((s) => !usedSlots.has(s)) ?? prev.length % 4
      return [...prev, { ...p, colorSlot }]
    })
    setActiveId(p.id)
  }

  const removePortfolio = (id: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const exactProb = useMemo(() => {
    if (!active) return null
    if (active.lines.length === 1) {
      return { value: singleNumberWinProb(active.lines[0].numero), method: 'cálculo exacto' }
    }
    if (guaranteedFloor(active.lines, config)) {
      return { value: 1, method: 'garantizado: serie consecutiva ≥ 10' }
    }
    if (active.mode === 'dispersos') {
      return { value: dispersedWinProb(active.lines), method: 'hipergeométrica' }
    }
    return null
  }, [active, config])

  const cost = active ? portfolioCost(active.lines, config) : 0
  const floor = active ? guaranteedFloor(active.lines, config) : null

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Simulador de Lotería Nacional</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink2">
              Construye carteras de números y comprueba su coste, probabilidad de premio, valor
              esperado y distribución simulada de resultados. El {fmtPct(PAYOUT_RATIO, 0)} de la
              recaudación se destina a premios: el valor esperado de un décimo de{' '}
              {fmtEur(config.ticketPrice, 0)} es {fmtEur(config.ticketPrice * PAYOUT_RATIO)}.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1 text-ink2">
              Sorteo
              <select
                className="rounded-lg border border-bord bg-page px-2 py-1.5 text-ink"
                value={configId}
                onChange={(e) => setConfigId(e.target.value as 'jueves' | 'sabado')}
              >
                {DRAW_CONFIGS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({fmtEur(c.ticketPrice, 0)}/décimo)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-ink2">
              Sorteos simulados
              <select
                className="rounded-lg border border-bord bg-page px-2 py-1.5 text-ink"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value, 10))}
              >
                {ITERATION_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {fmtNum(n)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-ink2">
              Semilla (opcional)
              <input
                className="w-32 rounded-lg border border-bord bg-page px-2 py-1.5 text-ink"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="aleatoria"
                title="Fija una semilla para reproducir exactamente la misma simulación"
              />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <PortfolioBuilder onAdd={addPortfolio} disabled={portfolios.length >= 4} />

          {portfolios.length > 0 && (
            <Card>
              <SectionTitle sub="Haz clic en una cartera para ver su detalle.">
                Carteras ({portfolios.length}/4)
              </SectionTitle>
              <ul className="flex flex-col gap-2">
                {portfolios.map((p) => (
                  <li key={p.id}>
                    <div
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                        active?.id === p.id ? 'border-s1 bg-page' : 'border-bord'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex grow items-center gap-3 text-left"
                        onClick={() => setActiveId(p.id)}
                      >
                        <ColorChip color={colorForSlot(p.colorSlot)} />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium text-ink">{p.name}</span>
                          <span className="text-xs text-muted">
                            {MODE_LABELS[p.mode]} · {p.lines.length} número
                            {p.lines.length === 1 ? '' : 's'} ·{' '}
                            {fmtEur(portfolioCost(p.lines, config), 0)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Eliminar cartera"
                        className="rounded px-2 py-1 text-muted hover:bg-page hover:text-bad"
                        onClick={() => removePortfolio(p.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          {!active && (
            <Card className="py-16 text-center">
              <p className="text-lg font-medium">Añade tu primera cartera</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
                Prueba, por ejemplo, un billete entero frente a 10 números dispersos: mismo coste,
                mismo valor esperado… y resultados muy distintos.
              </p>
            </Card>
          )}

          {active && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="Coste total"
                  value={fmtEur(cost, 0)}
                  detail={`${active.lines.reduce((a, l) => a + l.decimos, 0)} décimos`}
                />
                <StatTile
                  label="Valor esperado teórico"
                  value={fmtEur(theoreticalEV(active.lines, config))}
                  detail="siempre el 70 % del coste"
                />
                <StatTile
                  label="P(al menos un premio)"
                  value={
                    exactProb
                      ? fmtPct(exactProb.value)
                      : activeResult
                        ? fmtPct(activeResult.winRate)
                        : '…'
                  }
                  detail={exactProb ? exactProb.method : 'estimada por Monte Carlo'}
                />
                <StatTile
                  label="Mínimo garantizado"
                  value={floor ? fmtEur(floor.minPrize, 0) : '0 €'}
                  detail={
                    floor
                      ? `≥ ${floor.minWinners} décimos premiados (${fmtPct(floor.minPrize / cost)} del coste)`
                      : 'esta cartera puede no ganar nada'
                  }
                  tone={floor ? 'good' : undefined}
                />
              </div>

              {floor && (
                <Card>
                  <SectionTitle>Suelo garantizado de la serie</SectionTitle>
                  <p className="text-sm text-ink2">
                    Pase lo que pase, esta serie consecutiva cobra como mínimo{' '}
                    <strong className="text-ink">{fmtEur(floor.minPrize, 0)}</strong>:{' '}
                    {floor.detail.join(' + ')}. El peor caso asume que las tres cifras de
                    reintegro coinciden.
                  </p>
                </Card>
              )}

              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <SectionTitle
                    sub={`${fmtNum(iterations)} sorteos simulados · ${config.label.toLowerCase()}${seed !== undefined ? ` · semilla ${seed}` : ''}`}
                  >
                    Simulación Monte Carlo — {active.name}
                  </SectionTitle>
                  {activeResult && (
                    <button
                      type="button"
                      className="rounded-lg border border-bord px-3 py-1.5 text-sm text-ink2 hover:bg-page"
                      onClick={() =>
                        downloadCsv(
                          simulationToCsv(activeResult, active.name),
                          `simulacion-${active.name.replace(/\s+/g, '-').toLowerCase()}.csv`,
                        )
                      }
                    >
                      Exportar CSV
                    </button>
                  )}
                </div>

                {!activeResult && (
                  <div className="py-8">
                    <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gridline">
                      <div
                        className="h-full rounded-full bg-s1 transition-[width]"
                        style={{ width: `${((progress[active.id] ?? 0) * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-center text-sm text-muted">
                      Simulando {fmtNum(iterations)} sorteos…
                    </p>
                  </div>
                )}

                {activeResult && (
                  <>
                    <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatTile
                        label="Sorteos con premio"
                        value={fmtPct(activeResult.winRate)}
                        detail={`${fmtNum(Math.round(activeResult.winRate * activeResult.iterations))} de ${fmtNum(activeResult.iterations)}`}
                      />
                      <StatTile
                        label="Retorno medio"
                        value={fmtEur(activeResult.meanPrize)}
                        detail={`${fmtPct(activeResult.meanPrize / cost)} del coste (teórico: 70 %)`}
                      />
                      <StatTile
                        label="Ganancia neta media"
                        value={fmtEur(activeResult.meanNet)}
                        tone={activeResult.meanNet >= 0 ? 'good' : 'bad'}
                        detail="premio − coste"
                      />
                      <StatTile
                        label="Ganancia neta mediana"
                        value={fmtEur(activeResult.medianNet)}
                        tone={activeResult.medianNet >= 0 ? 'good' : 'bad'}
                        detail={`p10 ${fmtEur(activeResult.percentiles.p10, 0)} · p90 ${fmtEur(activeResult.percentiles.p90, 0)} · p99 ${fmtEur(activeResult.percentiles.p99, 0)}`}
                      />
                    </div>

                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                      Distribución de la ganancia neta por sorteo
                    </p>
                    <Histogram
                      sortedNets={activeResult.sortedNets}
                      color={colorForSlot(active.colorSlot)}
                    />

                    <div className="mt-5">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        Desglose por categoría de premio
                      </p>
                      <CategoryTable result={activeResult} config={config} />
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {portfolios.length >= 2 && (
            <Comparator portfolios={portfolios} results={results} config={config} />
          )}

          {running && active && activeResult && (
            <p className="text-center text-xs text-muted">Actualizando el resto de carteras…</p>
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo: sorteo ordinario de la Lotería Nacional (jueves: décimo {fmtEur(3, 0)}, 1er
          premio {fmtEur(30_000, 0)}/décimo; sábado: importes ×2). Los premios de conceptos
          compatibles se acumulan (una terminación de 4 cifras cobra también la de 3, la de 2 y el
          reintegro; los reintegros especiales se suman al ordinario), de modo que el retorno del
          sistema es exactamente el 70 % de la recaudación en cada serie y en todos los sorteos.
          Cada número se cuenta solo en su categoría más específica. Simulador con fines
          educativos: el juego real tiene esperanza negativa (−30 % del coste).
        </p>
      </footer>
    </div>
  )
}
