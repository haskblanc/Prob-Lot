import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, SectionTitle, StatTile } from '../components/ui'
import { CriticalInfo } from '../components/CriticalInfo'
import {
  accessibleEV,
  anyPrizeProb,
  breakEvenBoteRolldown,
  categoryOutcomes,
  DEFAULT_EUROMILLONES_PARAMS,
  singleBetEV,
  TOTAL_COMBINACIONES,
  type EuromillonesParams,
} from '../engine/euromillones'
import { fmtEur, fmtEurCompact, fmtNum, fmtPct } from '../format'

const oneIn = (prob: number) => Math.round(1 / prob)

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  suffix?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink2">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          className="w-32 rounded-lg border border-bord bg-page px-2 py-1.5 text-ink tabular-nums"
          value={value}
          min={0}
          step={step}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  )
}

export default function EuromillonesView() {
  const [params, setParams] = useState<EuromillonesParams>(DEFAULT_EUROMILLONES_PARAMS)
  const set = (patch: Partial<EuromillonesParams>) => setParams((p) => ({ ...p, ...patch }))

  const outcomes = useMemo(() => categoryOutcomes(params), [params])
  const evTotal = singleBetEV(params)
  const evAcc = accessibleEV(params)
  const pAny = useMemo(anyPrizeProb, [])
  const boteCritico = useMemo(() => breakEvenBoteRolldown(params), [params])

  // EV accesible según el bote: normal (plano) vs rolldown (creciente)
  const chartData = useMemo(() => {
    const pts = 50
    return Array.from({ length: pts + 1 }, (_, i) => {
      const bote = (params.tope / pts) * i
      return {
        bote,
        normal: accessibleEV({ ...params, bote, rolldown: false }),
        rolldown: accessibleEV({ ...params, bote, rolldown: true }),
      }
    })
  }, [params])

  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">Euromillones — 5/50 + 2 estrellas</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            Familia parimutuel + bote (como La Primitiva), pero con el mecanismo que la hace única:
            el <strong>tope de bote y el rolldown</strong>. Cuando el bote toca el tope y nadie lo
            gana, ese dinero <strong>baja a las categorías inferiores</strong>. Ahí una apuesta
            corriente puede tener <strong>EV positivo</strong> — el edge real de Cash WinFall, y sin
            comprar todas las combinaciones. Combinatoria exacta, sin Monte Carlo.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <Card>
            <SectionTitle sub="Activa el rolldown y sube el bote hacia el tope para ver la ventaja.">
              Parámetros del sorteo
            </SectionTitle>
            <div className="flex flex-col gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={params.rolldown} onChange={(e) => set({ rolldown: e.target.checked })} />
                <span className="font-medium">Modo rolldown (el bote baja a categorías inferiores)</span>
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Bote (5+2): <strong className="text-ink">{fmtEurCompact(params.bote)}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={params.tope}
                  step={5_000_000}
                  value={Math.min(params.bote, params.tope)}
                  onChange={(e) => set({ bote: Number(e.target.value) })}
                />
              </label>
              <NumberField label="Tope de bote" value={params.tope} step={10_000_000} onChange={(v) => set({ tope: v })} suffix="€" />
              <NumberField label="Precio por apuesta" value={params.precio} step={0.5} onChange={(v) => set({ precio: v })} suffix="€" />
              <NumberField label="Nº de apuestas del sorteo" value={params.apuestas} step={10_000_000} onChange={(v) => set({ apuestas: v })} />
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Premios al fondo: <strong className="text-ink">{fmtPct(params.ratio, 0)}</strong>
                </span>
                <input type="range" min={0.3} max={0.7} step={0.01} value={params.ratio} onChange={(e) => set({ ratio: Number(e.target.value) })} />
              </label>
              <button
                type="button"
                className="self-start text-xs text-muted hover:text-ink hover:underline"
                onClick={() => setParams(DEFAULT_EUROMILLONES_PARAMS)}
              >
                Restaurar valores por defecto
              </button>
            </div>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Combinaciones" value={fmtNum(TOTAL_COMBINACIONES)} detail="C(50,5)·C(12,2)" />
            <StatTile label="P(algún premio)" value={fmtPct(pAny, 1)} detail={`≈ 1 de cada ${oneIn(pAny)}`} />
            <StatTile
              label="EV total por apuesta"
              value={fmtEur(evTotal)}
              detail={`${fmtPct(evTotal / params.precio)} del coste`}
              tone={evTotal >= params.precio ? 'good' : 'bad'}
            />
            <StatTile
              label="EV accesible (sin el 5+2)"
              value={fmtEur(evAcc)}
              detail={
                params.rolldown
                  ? 'con rolldown el bote entra aquí'
                  : 'casi todo el bote queda atrapado en el 5+2'
              }
              tone={evAcc >= params.precio ? 'good' : 'bad'}
            />
          </div>

          <Card>
            <SectionTitle sub="La clave del análisis: cuánto de tu apuesta puedes materializar de verdad (excluyendo el 5+2, 1 entre 139 millones), según el bote. En normal es plano; el rolldown lo dispara.">
              El rolldown: valor esperado accesible según el bote
            </SectionTitle>
            <div className="h-72 w-full">
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
                  <YAxis tickFormatter={(v: number) => fmtEur(v, 1)} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--bord)', borderRadius: 8, fontSize: 13 }}
                    labelFormatter={(v) => `Bote: ${fmtEurCompact(Number(v))}`}
                    formatter={(v, name) => [fmtEur(Number(v)), name === 'rolldown' ? 'Rolldown' : 'Normal']}
                  />
                  <Legend
                    formatter={(v) => (v === 'rolldown' ? 'EV accesible (rolldown)' : 'EV accesible (normal)')}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine y={params.precio} stroke="var(--baseline)" strokeDasharray="4 3" label={{ value: 'coste', fill: 'var(--muted)', fontSize: 11, position: 'insideBottomRight' }} />
                  {boteCritico > 0 && boteCritico < params.tope && (
                    <ReferenceLine x={boteCritico} stroke="var(--good)" strokeDasharray="4 3" label={{ value: 'bote de rentabilidad', fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }} />
                  )}
                  <Line type="monotone" dataKey="normal" stroke="var(--series-4)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="rolldown" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              La línea <strong className="text-ink">normal</strong> es plana: por mucho que crezca el
              bote, se queda en la casilla del 5+2 que casi nadie toca, así que el EV que puedes
              materializar no se mueve. La línea <strong className="text-ink">rolldown</strong> sube:
              ese mismo dinero se reparte entre categorías con miles de acertantes, y al cruzar el
              coste (bote de rentabilidad ≈ {fmtEurCompact(Math.max(0, boteCritico))}) una apuesta
              corriente pasa a tener EV positivo. Es la diferencia con La Primitiva: aquí el edge no
              exige comprar 140 millones de apuestas, basta con jugar en el sorteo adecuado — el caso
              Cash WinFall.
            </p>
          </Card>

          <Card>
            <SectionTitle sub={`Probabilidad exacta y premio medio por acertante en el modo ${params.rolldown ? 'rolldown' : 'normal'}. Fíjate cómo el rolldown infla las categorías intermedias.`}>
              Las 13 categorías
            </SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-3 font-medium">Aciertos</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Probabilidad</th>
                    <th className="py-1.5 pr-3 text-right font-medium">1 en…</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Acertantes esperados</th>
                    <th className="py-1.5 text-right font-medium">Premio/acertante</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((o) => (
                    <tr key={o.tier.id} className={`border-b border-bord/50 ${o.tier.esBote ? 'font-medium' : ''}`}>
                      <td className="py-1.5 pr-3 text-ink">
                        {o.tier.label}
                        {o.tier.esBote && <span className="ml-1 text-xs text-muted">(bote)</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                        {fmtPct(o.tier.prob, o.tier.prob < 0.0001 ? 7 : 4)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">{fmtNum(oneIn(o.tier.prob))}</td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                        {o.acertantesEsperados < 1 ? o.acertantesEsperados.toFixed(2) : fmtNum(Math.round(o.acertantesEsperados))}
                      </td>
                      <td className="py-1.5 text-right text-ink tabular-nums">{fmtEurCompact(o.premioPorAcertante)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <CriticalInfo
            items={[
              {
                tipo: 'si',
                titulo: 'Elegir CUÁNDO jugar: la única palanca real',
                texto:
                  'Los números no importan (equiprobables), pero el momento sí. Con bote cerca del tope y, sobre todo, en un sorteo con rolldown anunciado, el EV accesible de una apuesta corriente puede superar el coste — el gráfico de arriba lo muestra. Es el edge de Cash WinFall: grupos como el de Jerry Selbee compraban miles de boletos solo en las semanas de rolldown, con beneficio sostenido y 100 % legal.',
              },
              {
                tipo: 'si',
                titulo: 'Combinaciones impopulares (parimutuel)',
                texto:
                  'Igual que en la Primitiva: evitar fechas, patrones y secuencias no cambia tu probabilidad, pero reduce cuánta gente compartiría tu premio. En los gordos multimillonarios de Euromillones, ganar en solitario o entre dos es la diferencia más grande de todas.',
              },
              {
                tipo: 'no',
                titulo: 'Comprar todas las combinaciones',
                texto:
                  'C(50,5)·C(12,2) = 139.838.160 apuestas × 2,50 € = ~350 M €. Ni el capital, ni la logística de validación, ni el riesgo de compartir lo hacen viable: aquí el método Mandel es imposible. El edge accesible es el del momento (rolldown), no el del volumen.',
              },
              {
                tipo: 'ojo',
                titulo: 'El bote grande atrae multitudes',
                texto:
                  'Cada récord de bote dispara la participación: N sube, tu fracción del rolldown baja y crece la probabilidad de compartir el 5+2. La ventana buena es el rolldown con participación moderada — no el circo mediático del bote máximo.',
              },
            ]}
          />
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo de Euromillones (5/50 + 2/12): probabilidades combinatorias exactas de las 13
          categorías; premios parimutuel (porcentaje del fondo por categoría, reparto aproximado de
          las reglas reales y normalizado). El bote se paga en el 5+2 (modo normal) o se reparte
          entre las demás categorías (rolldown). No se modela el sorteo "El Millón" (rifa de código
          con ganador garantizado). Análisis con fines educativos: el rolldown es una ventana real
          pero poco frecuente, y la participación masiva que atrae tiende a diluirla.
        </p>
      </footer>
    </>
  )
}
