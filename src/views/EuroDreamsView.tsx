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
  anyPrizeProb,
  DEFAULT_EURODREAMS_PARAMS,
  EURODREAMS_TIERS,
  evNominal,
  evPresent,
  presentValue,
  TOTAL_COMBINACIONES,
  tierNominal,
  tierValue,
  type EurodreamsParams,
} from '../engine/eurodreams'
import { fmtEur, fmtEurCompact, fmtNum, fmtPct } from '../format'

const oneIn = (prob: number) => Math.round(1 / prob)
const jackpot = EURODREAMS_TIERS.find((t) => t.id === '6+S')!

export default function EuroDreamsView() {
  const [params, setParams] = useState<EurodreamsParams>(DEFAULT_EURODREAMS_PARAMS)
  const set = (patch: Partial<EurodreamsParams>) => setParams((p) => ({ ...p, ...patch }))

  const pAny = useMemo(anyPrizeProb, [])
  const evNom = useMemo(evNominal, [])
  const evPres = evPresent(params)
  const jackpotNominal = tierNominal(jackpot)
  const jackpotVP = tierValue(jackpot, params.tasaAnual)

  const chartData = useMemo(() => {
    const pts = 40
    return Array.from({ length: pts + 1 }, (_, i) => {
      const tasa = (0.1 / pts) * i
      return { tasa, vp: presentValue(jackpot.mensual, jackpot.meses, tasa) }
    })
  }, [])

  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">EuroDreams — 6/40 + 1 Sueño</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            De premio fijo (como la Lotería Nacional), pero con una vuelta de tuerca: los premios
            altos son <strong>rentas</strong>, no un pago único. El 1er premio son 20.000 €/mes
            durante 30 años = 7,2 M € "anunciados"… que valen bastante <strong>menos hoy</strong>. La
            herramienta nueva es el <strong>valor presente</strong>: descontar los pagos futuros.
            Demuestra que el titular engaña.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <Card>
            <SectionTitle sub="La tasa de descuento refleja cuánto vale para ti el dinero futuro frente al de hoy.">
              Parámetros
            </SectionTitle>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Tasa de descuento anual: <strong className="text-ink">{fmtPct(params.tasaAnual, 1)}</strong>
                </span>
                <input type="range" min={0} max={0.1} step={0.005} value={params.tasaAnual} onChange={(e) => set({ tasaAnual: Number(e.target.value) })} />
                <span className="text-xs text-muted">0 % = valorar el futuro igual que hoy (el "anunciado"). Más alta = el dinero lejano vale menos.</span>
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink2">
                Precio por apuesta
                <span className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="w-28 rounded-lg border border-bord bg-page px-2 py-1.5 text-ink tabular-nums"
                    value={params.precio}
                    min={0}
                    step={0.5}
                    onChange={(e) => set({ precio: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <span className="text-xs text-muted">€</span>
                </span>
              </label>
            </div>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Combinaciones" value={fmtNum(TOTAL_COMBINACIONES)} detail="C(40,6)·5" />
            <StatTile label="P(algún premio)" value={fmtPct(pAny, 2)} detail={`≈ 1 de cada ${oneIn(pAny)}`} />
            <StatTile
              label="1er premio anunciado"
              value={fmtEurCompact(jackpotNominal)}
              detail="20.000 €/mes × 30 años"
            />
            <StatTile
              label="1er premio, valor presente"
              value={fmtEurCompact(jackpotVP)}
              detail={`al ${fmtPct(params.tasaAnual, 1)}: ${fmtPct(jackpotVP / jackpotNominal, 0)} de lo anunciado`}
              tone="bad"
            />
          </div>

          <Card>
            <SectionTitle sub="Cuánto vale HOY el 1er premio (20.000 €/mes durante 30 años) según la tasa a la que descuentes el futuro.">
              El engaño del titular: valor presente del 1er premio
            </SectionTitle>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--gridline)" />
                  <XAxis
                    dataKey="tasa"
                    type="number"
                    tickFormatter={(v: number) => fmtPct(v, 0)}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--baseline)' }}
                  />
                  <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--bord)', borderRadius: 8, fontSize: 13 }}
                    labelFormatter={(v) => `Tasa: ${fmtPct(Number(v), 1)}`}
                    formatter={(v) => [fmtEurCompact(Number(v)), 'Valor presente']}
                  />
                  <ReferenceLine y={jackpotNominal} stroke="var(--baseline)" strokeDasharray="4 3" label={{ value: 'anunciado (7,2 M)', fill: 'var(--muted)', fontSize: 11, position: 'insideTopRight' }} />
                  <ReferenceLine x={params.tasaAnual} stroke="var(--series-4)" strokeDasharray="2 2" label={{ value: 'tu tasa', fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }} />
                  <Line type="monotone" dataKey="vp" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              A tasa 0 % el premio "vale" los 7,2 M € anunciados. Pero valorando el dinero futuro de
              forma realista (una tasa del 3-5 %), su valor presente cae a menos de la mitad: cobrar
              20.000 € dentro de 29 años no es como cobrarlos hoy. El importe grande del titular es,
              en parte, una ilusión contable del calendario de pagos.
            </p>
          </Card>

          <Card>
            <SectionTitle sub={`Premios y su valor presente a la tasa del ${fmtPct(params.tasaAnual, 1)}. El EV nominal es ${fmtEur(evNom)} pero el EV real (valor presente) es ${fmtEur(evPres)}.`}>
              Categorías de premio
            </SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-3 font-medium">Aciertos</th>
                    <th className="py-1.5 pr-3 text-right font-medium">1 en…</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Premio</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Anunciado</th>
                    <th className="py-1.5 text-right font-medium">Valor presente</th>
                  </tr>
                </thead>
                <tbody>
                  {EURODREAMS_TIERS.map((t) => (
                    <tr key={t.id} className="border-b border-bord/50">
                      <td className="py-1.5 pr-3 text-ink">{t.label}</td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">{fmtNum(oneIn(t.prob))}</td>
                      <td className="py-1.5 pr-3 text-right text-ink2">
                        {t.mensual > 0 ? `${fmtEur(t.mensual, 0)}/mes × ${t.meses / 12} años` : fmtEur(t.fijo, 0)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">{fmtEurCompact(tierNominal(t))}</td>
                      <td className="py-1.5 text-right text-ink tabular-nums">{fmtEurCompact(tierValue(t, params.tasaAnual))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo de EuroDreams (6/40 + 1 Sueño): probabilidades combinatorias exactas; premios fijos
          (cada acertante cobra su premio). Los dos primeros son rentas (20.000 €/mes × 30 años y
          2.000 €/mes × 5 años); el resto, metálico. El valor presente descuenta los pagos futuros a
          la tasa elegida (anualidad vencida, interés mensual = tasa/12). Importes editables en el
          código. Análisis con fines educativos.
        </p>
      </footer>
    </>
  )
}
