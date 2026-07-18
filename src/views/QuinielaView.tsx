import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
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
import { CriticalInfo } from '../components/CriticalInfo'
import {
  anyPrizeProb,
  binomialPmf,
  breakEvenSkill,
  categoryOutcomes,
  DEFAULT_QUINIELA_PARAMS,
  expectedHits,
  N_PARTIDOS,
  singleBetEV,
  type QuinielaParams,
} from '../engine/quiniela'
import { fmtEur, fmtEurCompact, fmtNum, fmtPct } from '../format'

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink2">
      <span>
        {label}: <strong className="text-ink">{format(value)}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

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

export default function QuinielaView() {
  const [params, setParams] = useState<QuinielaParams>(DEFAULT_QUINIELA_PARAMS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const set = (patch: Partial<QuinielaParams>) => setParams((p) => ({ ...p, ...patch }))

  const outcomes = useMemo(() => categoryOutcomes(params), [params])
  const evSingle = singleBetEV(params)
  const pAny = useMemo(() => anyPrizeProb(params), [params])
  const skillCritica = useMemo(() => breakEvenSkill(params), [params])

  // Distribución de aciertos (0..14)
  const hitDist = useMemo(() => {
    const mine = binomialPmf(N_PARTIDOS, params.pMine)
    return mine.map((prob, hits) => ({ hits, prob, premiada: hits >= 10 }))
  }, [params.pMine])

  // Curva EV vs habilidad
  const evCurve = useMemo(() => {
    const pts = 50
    return Array.from({ length: pts + 1 }, (_, i) => {
      const pMine = 0.33 + ((0.75 - 0.33) / pts) * i
      return { pMine, ev: singleBetEV({ ...params, pMine }) }
    })
  }, [params])

  const pctSum = params.pct14 + params.pct13 + params.pct12 + params.pct11 + params.pct10

  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">La Quiniela — 14 partidos (1-X-2)</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            La tercera familia, y la única donde una ventaja legal es teóricamente posible. Los
            resultados <strong>no son equiprobables</strong> (dependen de los partidos) y el premio
            se reparte entre los acertantes. Entran dos palancas que controlas:{' '}
            <strong>habilidad</strong> (aciertas mejor que la media) y <strong>originalidad</strong>{' '}
            (eliges resultados correctos poco populares). Todo exacto por convolución binomial, sin
            Monte Carlo.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <Card>
            <SectionTitle sub="Tu habilidad y la de la multitud son las dos palancas del juego.">
              Parámetros
            </SectionTitle>
            <div className="flex flex-col gap-4">
              <Slider
                label="Tu acierto por partido (habilidad)"
                value={params.pMine}
                min={0.33}
                max={0.75}
                step={0.01}
                onChange={(v) => set({ pMine: v })}
                format={(v) => fmtPct(v, 0)}
                hint={`≈ ${expectedHits(params).toFixed(1)} aciertos esperados de 14`}
              />
              <Slider
                label="Acierto medio de la multitud"
                value={params.pCrowd}
                min={0.33}
                max={0.7}
                step={0.01}
                onChange={(v) => set({ pCrowd: v })}
                format={(v) => fmtPct(v, 0)}
                hint="Alto = jornada previsible, todos comparten el premio (menos originalidad posible)."
              />
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Bote (1ª categoría): <strong className="text-ink">{fmtEurCompact(params.bote)}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={20_000_000}
                  step={500_000}
                  value={Math.min(params.bote, 20_000_000)}
                  onChange={(e) => set({ bote: Number(e.target.value) })}
                />
              </label>
              <NumberField label="Precio por apuesta" value={params.precio} step={0.25} onChange={(v) => set({ precio: v })} suffix="€" />
              <NumberField label="Nº de apuestas del sorteo" value={params.apuestas} step={1_000_000} onChange={(v) => set({ apuestas: v })} />
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Premios al fondo: <strong className="text-ink">{fmtPct(params.ratio, 0)}</strong>
                </span>
                <input type="range" min={0.3} max={0.7} step={0.01} value={params.ratio} onChange={(e) => set({ ratio: Number(e.target.value) })} />
              </label>

              <button
                type="button"
                className="self-start text-xs font-medium text-s1 hover:underline"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? '− Ocultar' : '+ Editar'} reparto del fondo por categoría
              </button>
              {showAdvanced && (
                <div className="flex flex-col gap-3 rounded-lg border border-bord p-3">
                  <p className="text-xs text-muted">
                    Fracciones del fondo (suman 100 %). Actual:{' '}
                    <strong className={Math.abs(pctSum - 1) < 1e-6 ? 'text-good' : 'text-bad'}>
                      {fmtPct(pctSum, 0)}
                    </strong>
                  </p>
                  <NumberField label="1ª (14)" value={params.pct14} step={0.01} onChange={(v) => set({ pct14: v })} suffix="frac." />
                  <NumberField label="2ª (13)" value={params.pct13} step={0.01} onChange={(v) => set({ pct13: v })} suffix="frac." />
                  <NumberField label="3ª (12)" value={params.pct12} step={0.01} onChange={(v) => set({ pct12: v })} suffix="frac." />
                  <NumberField label="4ª (11)" value={params.pct11} step={0.01} onChange={(v) => set({ pct11: v })} suffix="frac." />
                  <NumberField label="5ª (10)" value={params.pct10} step={0.01} onChange={(v) => set({ pct10: v })} suffix="frac." />
                  <button
                    type="button"
                    className="self-start text-xs text-muted hover:text-ink hover:underline"
                    onClick={() => setParams(DEFAULT_QUINIELA_PARAMS)}
                  >
                    Restaurar valores por defecto
                  </button>
                </div>
              )}
            </div>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Aciertos esperados" value={expectedHits(params).toFixed(1)} detail="de 14 partidos" />
            <StatTile
              label="P(algún premio)"
              value={fmtPct(pAny, 2)}
              detail="probabilidad de ≥ 10 aciertos"
            />
            <StatTile
              label="Valor esperado por apuesta"
              value={fmtEur(evSingle)}
              detail={`${fmtPct(evSingle / params.precio)} del coste (${fmtEur(params.precio, 2)})`}
              tone={evSingle >= params.precio ? 'good' : 'bad'}
            />
            <StatTile
              label="Habilidad crítica (EV positivo)"
              value={skillCritica === null ? '—' : fmtPct(skillCritica, 1)}
              detail={
                skillCritica === null
                  ? 'ni acertando siempre se supera el coste'
                  : `necesitas acertar ${fmtPct(skillCritica, 0)}/partido (multitud: ${fmtPct(params.pCrowd, 0)})`
              }
              tone={skillCritica !== null && params.pMine >= skillCritica ? 'good' : undefined}
            />
          </div>

          <Card>
            <SectionTitle sub="Probabilidad exacta de cada nº de aciertos según tu habilidad. La zona de premio empieza en 10.">
              Distribución de aciertos
            </SectionTitle>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={hitDist} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--gridline)" />
                  <XAxis dataKey="hits" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} />
                  <YAxis tickFormatter={(v: number) => fmtPct(v, 0)} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--bord)', borderRadius: 8, fontSize: 13 }}
                    labelFormatter={(v) => `${v} aciertos`}
                    formatter={(v) => [fmtPct(Number(v), 3), 'Probabilidad']}
                  />
                  <Bar dataKey="prob" radius={[3, 3, 0, 0]}>
                    {hitDist.map((d) => (
                      <Cell key={d.hits} fill={d.premiada ? 'var(--series-2)' : 'var(--gridline)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">
              En verde, los aciertos que cobran (10–14). Subir tu habilidad desplaza toda la
              distribución a la derecha y engorda la cola premiada.
            </p>
          </Card>

          <Card>
            <SectionTitle sub="El premio por acertante depende de cuánta gente comparta tu resultado (naturaleza parimutuel). Ahí vive la originalidad: acertar lo que pocos aciertan paga mucho más.">
              Categorías: probabilidad y premio por acertante
            </SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-3 font-medium">Categoría</th>
                    <th className="py-1.5 pr-3 text-right font-medium">P(tu apuesta)</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Acertantes esperados</th>
                    <th className="py-1.5 text-right font-medium">Premio/acertante</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((o) => (
                    <tr key={o.hits} className="border-b border-bord/50">
                      <td className="py-1.5 pr-3 text-ink">{o.label}</td>
                      <td className="py-1.5 pr-3 text-right text-ink2 tabular-nums">
                        {fmtPct(o.probMine, o.probMine < 0.001 ? 5 : 3)}
                      </td>
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

          <Card>
            <SectionTitle sub="El valor esperado según tu habilidad, con el resto de parámetros fijos. Donde la curva cruza el coste está el umbral de ventaja.">
              La ventaja: valor esperado según habilidad
            </SectionTitle>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={evCurve} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--gridline)" />
                  <XAxis
                    dataKey="pMine"
                    type="number"
                    domain={[0.33, 0.75]}
                    tickFormatter={(v: number) => fmtPct(v, 0)}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--baseline)' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => fmtEur(v, 1)}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--bord)', borderRadius: 8, fontSize: 13 }}
                    labelFormatter={(v) => `Acierto/partido: ${fmtPct(Number(v), 0)}`}
                    formatter={(v) => [fmtEur(Number(v)), 'EV por apuesta']}
                  />
                  <ReferenceLine
                    y={params.precio}
                    stroke="var(--baseline)"
                    strokeDasharray="4 3"
                    label={{ value: 'coste', fill: 'var(--muted)', fontSize: 11, position: 'insideBottomRight' }}
                  />
                  {skillCritica !== null && skillCritica >= 0.33 && skillCritica <= 0.75 && (
                    <ReferenceLine
                      x={skillCritica}
                      stroke="var(--good)"
                      strokeDasharray="4 3"
                      label={{ value: 'habilidad crítica', fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }}
                    />
                  )}
                  <ReferenceLine x={params.pCrowd} stroke="var(--series-4)" strokeDasharray="2 2" label={{ value: 'multitud', fill: 'var(--muted)', fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="ev" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              La diferencia con los otros sorteos: aquí el eje horizontal es algo que{' '}
              <strong className="text-ink">tú controlas</strong> (tu habilidad). En la Lotería
              Nacional no existe tal eje (EV fijo al 70 %); en La Primitiva solo se movía con el bote
              (azar puro). Aquí, si aciertas mejor que la multitud, ganas las categorías altas donde
              casi nadie llega y el premio se concentra en ti. Pero el peaje (~45 %) exige una
              ventaja grande y sostenida en <em>ambas</em> palancas — por eso es posible en teoría y
              rarísimo en la práctica.
            </p>
          </Card>
          <CriticalInfo
            items={[
              {
                tipo: 'si',
                titulo: 'Usar el mercado de apuestas como estimador',
                texto:
                  'Las cuotas de las casas de apuestas son la mejor estimación pública de las probabilidades reales de cada partido: agregan la información de miles de apostantes profesionales. Convertir cuotas en probabilidades (1/cuota, normalizado) da un pronóstico sistemáticamente mejor que la intuición — es la vía más realista de subir tu "habilidad" por encima de la multitud.',
              },
              {
                tipo: 'si',
                titulo: 'Ser contrarian: buscar el valor donde la multitud no está',
                texto:
                  'El premio se reparte: acertar lo que todos aciertan paga poco. La multitud sobre-apuesta a los favoritos y a los equipos grandes, e infra-apuesta empates y victorias visitantes. Marcar el resultado correcto e impopular (cuando las cuotas lo justifican) es la segunda palanca — y las jornadas "locas", con sorpresas, son las que dejan premios grandes a pocos acertantes.',
              },
              {
                tipo: 'ojo',
                titulo: 'El peaje del ~45 % exige una ventaja enorme',
                texto:
                  'Con la mitad de la recaudación fuera del reparto, no basta con ser algo mejor que la media: la habilidad crítica calculada arriba muestra cuánto hay que superar a la multitud, jornada tras jornada. Los sindicatos profesionales de quinielas existieron y algunos ganaron dinero — pero son casos excepcionales, con modelos, volumen y disciplina de años.',
              },
              {
                tipo: 'no',
                titulo: 'Rellenar al azar o "por corazonadas"',
                texto:
                  'Sin ventaja predictiva, tu esperanza es el retorno base (~55 %): peor que la Lotería Nacional. La Quiniela sin habilidad es de los peores juegos del catálogo; con habilidad, el único con techo abierto.',
              },
            ]}
          />
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo agregado de La Quiniela: nº de aciertos ~ Binomial(14, habilidad); co-acertantes ~
          N · Binomial(14, acierto de la multitud); premio por acertante = bolsa de la categoría /
          acertantes (parimutuel). Reparto del fondo e importes editables. No se modela el Pleno al
          15 (categoría especial de goles); el bote se asigna a la 1ª categoría. Análisis con fines
          educativos: una ventaja real exigiría predecir partidos mejor que el mercado de forma
          sostenida, algo excepcional.
        </p>
      </footer>
    </>
  )
}
