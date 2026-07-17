import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, SectionTitle, StatTile } from '../components/ui'
import {
  breakEvenBote,
  buyAllAnalysis,
  categoryOutcomes,
  DEFAULT_PRIMITIVA_PARAMS,
  oneIn,
  singleBetEV,
  TOTAL_COMBINACIONES,
  type PrimitivaParams,
} from '../engine/primitiva'
import { fmtEur, fmtEurCompact, fmtNum, fmtPct } from '../format'

/** Probabilidad de obtener algún premio (alguna categoría o el reintegro) en una apuesta */
function anyPrizeProb(): number {
  // 1 − P(ni 3+ aciertos ni reintegro). Reintegro (1/10) es independiente.
  const outcomes = categoryOutcomes(DEFAULT_PRIMITIVA_PARAMS)
  const pNumeros = outcomes
    .filter((o) => o.cat.id !== 'reintegro')
    .reduce((a, o) => a + o.cat.prob, 0)
  return 1 - (1 - pNumeros) * (1 - 0.1)
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink2">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          className="w-32 rounded-lg border border-bord bg-page px-2 py-1.5 text-ink tabular-nums"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

const BOTE_MAX = 200_000_000

export default function PrimitivaView() {
  const [params, setParams] = useState<PrimitivaParams>(DEFAULT_PRIMITIVA_PARAMS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const set = (patch: Partial<PrimitivaParams>) => setParams((p) => ({ ...p, ...patch }))

  const outcomes = useMemo(() => categoryOutcomes(params), [params])
  const evSingle = singleBetEV(params)
  const buyAll = useMemo(() => buyAllAnalysis(params), [params])
  const boteCritico = useMemo(() => breakEvenBote(params), [params])
  const pAny = useMemo(anyPrizeProb, [])

  // Curva de ganancia neta de "comprar todo" según el bote
  const chartData = useMemo(() => {
    const pts = 60
    return Array.from({ length: pts + 1 }, (_, i) => {
      const bote = (BOTE_MAX / pts) * i
      return { bote, neta: buyAllAnalysis({ ...params, bote }).neta }
    })
  }, [params])

  const pctSum =
    params.pctEspecial + params.pctPrimera + params.pctSegunda + params.pctTercera + params.pctCuarta

  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">La Primitiva — 6/49</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            Análisis exacto (combinatoria, sin Monte Carlo). A diferencia de la Lotería Nacional
            —reparto fijo, sin ventaja posible— La Primitiva es un juego <strong>parimutuel con
            bote acumulado</strong>: ahí sí existe un <strong>punto crítico</strong> donde el valor
            esperado puede superar el coste. Las probabilidades son fijas; los importes de premio y
            el bote son parámetros editables.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <Card>
            <SectionTitle sub="Ajusta el sorteo. Las probabilidades no cambian; los importes sí.">
              Parámetros del sorteo
            </SectionTitle>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Bote acumulado: <strong className="text-ink">{fmtEurCompact(params.bote)}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={BOTE_MAX}
                  step={1_000_000}
                  value={Math.min(params.bote, BOTE_MAX)}
                  onChange={(e) => set({ bote: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className="mt-1 w-40 rounded-lg border border-bord bg-page px-2 py-1.5 text-ink tabular-nums"
                  value={params.bote}
                  min={0}
                  step={1_000_000}
                  onChange={(e) => set({ bote: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <NumberField
                label="Precio por apuesta"
                value={params.precio}
                onChange={(v) => set({ precio: v })}
                step={0.5}
                suffix="€"
              />
              <NumberField
                label="Nº de apuestas del resto de jugadores"
                value={params.otrasApuestas}
                onChange={(v) => set({ otrasApuestas: v })}
                step={1_000_000}
                hint="Participación del sorteo. Más jugadores = más gente con quien compartir bote y bolsas."
              />
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Premios al fondo: <strong className="text-ink">{fmtPct(params.ratio, 0)}</strong>{' '}
                  de la recaudación
                </span>
                <input
                  type="range"
                  min={0.3}
                  max={0.7}
                  step={0.01}
                  value={params.ratio}
                  onChange={(e) => set({ ratio: Number(e.target.value) })}
                />
              </label>

              <button
                type="button"
                className="self-start text-xs font-medium text-s1 hover:underline"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? '− Ocultar' : '+ Editar'} reparto e importes de premio
              </button>
              {showAdvanced && (
                <div className="flex flex-col gap-3 rounded-lg border border-bord p-3">
                  <p className="text-xs text-muted">
                    Reparto del fondo variable (deben sumar 100 %). Actual:{' '}
                    <strong className={pctSum === 1 ? 'text-good' : 'text-bad'}>
                      {fmtPct(pctSum, 0)}
                    </strong>
                  </p>
                  <NumberField label="Especial (6+R)" value={params.pctEspecial} step={0.01} onChange={(v) => set({ pctEspecial: v })} suffix="frac." />
                  <NumberField label="1ª (6)" value={params.pctPrimera} step={0.01} onChange={(v) => set({ pctPrimera: v })} suffix="frac." />
                  <NumberField label="2ª (5+C)" value={params.pctSegunda} step={0.01} onChange={(v) => set({ pctSegunda: v })} suffix="frac." />
                  <NumberField label="3ª (5)" value={params.pctTercera} step={0.01} onChange={(v) => set({ pctTercera: v })} suffix="frac." />
                  <NumberField label="4ª (4)" value={params.pctCuarta} step={0.01} onChange={(v) => set({ pctCuarta: v })} suffix="frac." />
                  <NumberField label="5ª (3 aciertos), fijo" value={params.premioQuinta} step={1} onChange={(v) => set({ premioQuinta: v })} suffix="€" />
                  <NumberField label="Reintegro, fijo" value={params.premioReintegro} step={0.5} onChange={(v) => set({ premioReintegro: v })} suffix="€" />
                  <button
                    type="button"
                    className="self-start text-xs text-muted hover:text-ink hover:underline"
                    onClick={() => setParams(DEFAULT_PRIMITIVA_PARAMS)}
                  >
                    Restaurar valores por defecto
                  </button>
                </div>
              )}
            </div>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          {/* Panel descriptivo */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Combinaciones posibles"
              value={fmtNum(TOTAL_COMBINACIONES)}
              detail="C(49,6) — todas equiprobables"
            />
            <StatTile
              label="P(algún premio)"
              value={fmtPct(pAny, 1)}
              detail={`≈ 1 de cada ${fmtNum(oneIn(pAny))} apuestas`}
            />
            <StatTile
              label="Valor esperado por apuesta"
              value={fmtEur(evSingle)}
              detail={`${fmtPct(evSingle / params.precio)} del coste (${fmtEur(params.precio, 0)})`}
              tone={evSingle >= params.precio ? 'good' : 'bad'}
            />
            <StatTile
              label="EV sin bote"
              value={fmtPct(params.ratio)}
              detail={`peor que el 70 % de la Lotería Nacional. EV = ratio + bote/N`}
            />
          </div>

          <Card>
            <SectionTitle sub="Probabilidad exacta por categoría y premio medio esperado por acertante (los variables dependen del bote y de la participación).">
              Categorías de premio
            </SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-3 font-medium">Categoría</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Probabilidad</th>
                    <th className="py-1.5 pr-3 text-right font-medium">1 en…</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Premio medio</th>
                    <th className="py-1.5 text-right font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((o) => (
                    <tr key={o.cat.id} className="border-b border-bord/50">
                      <td className="py-1.5 pr-3 text-ink">
                        {o.cat.label}
                        <span className="ml-1 text-xs text-muted">{o.cat.descripcion}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                        {fmtPct(o.cat.prob, o.cat.prob < 0.001 ? 6 : 3)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                        {fmtNum(oneIn(o.cat.prob))}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink tabular-nums">
                        {fmtEurCompact(o.premioPorAcertante)}
                      </td>
                      <td className="py-1.5 text-right text-xs text-muted">
                        {o.cat.tipo === 'fijo' ? 'fijo' : 'variable'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Nota: por la naturaleza parimutuel, el EV de una apuesta se reduce a{' '}
              <code className="rounded bg-page px-1">ratio · precio + bote / N</code>. Sin bote
              recuperas en media el {fmtPct(params.ratio, 0)} — <strong>ninguna combinación tiene
              ventaja</strong>. El bote es la única palanca, y para una sola apuesta es pura
              varianza (hay que acertar 6).
            </p>
          </Card>

          {/* Punto crítico */}
          <Card>
            <SectionTitle sub="La estrategia de Stefan Mandel / Cash WinFall: comprar TODAS las combinaciones. Con todas ganas seguro el gordo, toda la 5ª categoría fija y una fracción del bote.">
              Punto crítico: comprar todas las combinaciones
            </SectionTitle>
            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Coste de comprarlas todas"
                value={fmtEurCompact(buyAll.coste)}
                detail={`${fmtNum(TOTAL_COMBINACIONES)} × ${fmtEur(params.precio, 0)}`}
              />
              <StatTile
                label="Garantizado (5ª cat.)"
                value={fmtEurCompact(buyAll.garantizadoQuinta)}
                detail="246.820 × 8 € seguros, pase lo que pase"
                tone="good"
              />
              <StatTile
                label="Bote crítico (rentable a partir de)"
                value={fmtEurCompact(boteCritico)}
                detail={`si el bote supera esto, comprar todo tiene EV positivo`}
              />
              <StatTile
                label="Ganancia neta con el bote actual"
                value={fmtEurCompact(buyAll.neta)}
                detail={`compartes ${fmtPct(buyAll.fraccion, 1)} del bote con el resto`}
                tone={buyAll.neta >= 0 ? 'good' : 'bad'}
              />
            </div>

            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              Ganancia neta de "comprar todo" según el bote
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--gridline)" />
                  <XAxis
                    dataKey="bote"
                    type="number"
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--baseline)' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--bord)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    labelFormatter={(v) => `Bote: ${fmtEurCompact(Number(v))}`}
                    formatter={(v) => [fmtEurCompact(Number(v)), 'Ganancia neta']}
                  />
                  <ReferenceLine y={0} stroke="var(--baseline)" strokeWidth={1.5} />
                  {boteCritico > 0 && boteCritico < BOTE_MAX && (
                    <ReferenceLine
                      x={boteCritico}
                      stroke="var(--good)"
                      strokeDasharray="4 3"
                      label={{ value: 'bote crítico', fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }}
                    />
                  )}
                  <Line type="monotone" dataKey="neta" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              El caso idealizado (sin más jugadores) da un bote crítico de{' '}
              <strong className="text-ink">
                {fmtEurCompact((1 - params.ratio) * TOTAL_COMBINACIONES * params.precio)}
              </strong>{' '}
              = (1 − ratio) × coste: recuperas el {fmtPct(params.ratio, 0)} de lo que juegas más el
              bote, así que basta con que el bote cubra el {fmtPct(1 - params.ratio, 0)} restante.
              Pero cuantos más jugadores compran en un sorteo con bote grande, más compartes el
              premio y más sube el umbral — por eso, en la práctica, esta estrategia es marginal y
              logísticamente casi imposible (comprar 14 millones de apuestas a tiempo). Es la
              diferencia esencial con la Lotería Nacional, donde comprar todo garantiza perder el
              30 % <em>siempre</em>.
            </p>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo de La Primitiva (6/49): probabilidades combinatorias exactas; importes de premio
          según reparto parimutuel (porcentajes editables del fondo variable + bote a la categoría
          especial; 5ª categoría y reintegro fijos). El valor esperado sin bote es el ratio de
          premios (≈55 %), inferior al 70 % de la Lotería Nacional. Análisis con fines educativos:
          el juego real tiene esperanza negativa salvo en botes extraordinarios inalcanzables en la
          práctica.
        </p>
      </footer>
    </>
  )
}
