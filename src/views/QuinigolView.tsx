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
import {
  anyPrizeProb,
  breakEvenSkill,
  categoryOutcomes,
  DEFAULT_QUINIGOL_PARAMS,
  expectedHits,
  N_PARTIDOS,
  singleBetEV,
  type QuinigolParams,
} from '../engine/quinigol'
import { binomialPmf } from '../engine/quiniela'
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

export default function QuinigolView() {
  const [params, setParams] = useState<QuinigolParams>(DEFAULT_QUINIGOL_PARAMS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const set = (patch: Partial<QuinigolParams>) => setParams((p) => ({ ...p, ...patch }))

  const outcomes = useMemo(() => categoryOutcomes(params), [params])
  const evSingle = singleBetEV(params)
  const pAny = useMemo(() => anyPrizeProb(params), [params])
  const skillCritica = useMemo(() => breakEvenSkill(params), [params])

  const hitDist = useMemo(() => {
    const mine = binomialPmf(N_PARTIDOS, params.pMine)
    return mine.map((prob, hits) => ({ hits, prob, premiada: hits >= 4 }))
  }, [params.pMine])

  const evCurve = useMemo(() => {
    const pts = 50
    return Array.from({ length: pts + 1 }, (_, i) => {
      const pMine = 0.06 + ((0.45 - 0.06) / pts) * i
      return { pMine, ev: singleBetEV({ ...params, pMine }) }
    })
  }, [params])

  const pctSum = params.pct6 + params.pct5 + params.pct4

  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">El Quinigol — 6 partidos, marcador exacto</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            Misma familia que La Quiniela (parimutuel con habilidad + multitud), pero con un objetivo
            mucho más difícil: aciertas los <strong>goles exactos</strong> de cada equipo (0/1/2/M →
            16 marcadores por partido) en 6 partidos. Un partido cuenta solo si aciertas a{' '}
            <strong>ambos</strong> equipos. Al ser tan difícil y amontonarse la multitud en
            marcadores típicos, la <strong>originalidad</strong> paga aún más. Exacto por convolución
            binomial.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <Card>
            <SectionTitle sub="Acertar un marcador exacto es raro: al azar entre 16 sería 6 %; un buen pronosticador ronda el 15-22 %.">
              Parámetros
            </SectionTitle>
            <div className="flex flex-col gap-4">
              <Slider
                label="Tu acierto de marcador por partido"
                value={params.pMine}
                min={0.06}
                max={0.45}
                step={0.01}
                onChange={(v) => set({ pMine: v })}
                format={(v) => fmtPct(v, 0)}
                hint={`≈ ${expectedHits(params).toFixed(1)} marcadores de 6`}
              />
              <Slider
                label="Acierto medio de la multitud"
                value={params.pCrowd}
                min={0.06}
                max={0.35}
                step={0.01}
                onChange={(v) => set({ pCrowd: v })}
                format={(v) => fmtPct(v, 0)}
                hint="Alto = todos van a los marcadores típicos, comparten el premio."
              />
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Bote (1ª categoría): <strong className="text-ink">{fmtEurCompact(params.bote)}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10_000_000}
                  step={250_000}
                  value={Math.min(params.bote, 10_000_000)}
                  onChange={(e) => set({ bote: Number(e.target.value) })}
                />
              </label>
              <NumberField label="Precio por apuesta" value={params.precio} step={0.25} onChange={(v) => set({ precio: v })} suffix="€" />
              <NumberField label="Nº de apuestas del sorteo" value={params.apuestas} step={500_000} onChange={(v) => set({ apuestas: v })} />
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
                    <strong className={Math.abs(pctSum - 1) < 1e-6 ? 'text-good' : 'text-bad'}>{fmtPct(pctSum, 0)}</strong>
                  </p>
                  <NumberField label="1ª (6)" value={params.pct6} step={0.01} onChange={(v) => set({ pct6: v })} suffix="frac." />
                  <NumberField label="2ª (5)" value={params.pct5} step={0.01} onChange={(v) => set({ pct5: v })} suffix="frac." />
                  <NumberField label="3ª (4)" value={params.pct4} step={0.01} onChange={(v) => set({ pct4: v })} suffix="frac." />
                  <button
                    type="button"
                    className="self-start text-xs text-muted hover:text-ink hover:underline"
                    onClick={() => setParams(DEFAULT_QUINIGOL_PARAMS)}
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
            <StatTile label="Marcadores esperados" value={expectedHits(params).toFixed(1)} detail="de 6 partidos" />
            <StatTile label="P(algún premio)" value={fmtPct(pAny, 3)} detail="probabilidad de ≥ 4 aciertos" />
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
                  : `acierto de marcador necesario (multitud: ${fmtPct(params.pCrowd, 0)})`
              }
              tone={skillCritica !== null && params.pMine >= skillCritica ? 'good' : undefined}
            />
          </div>

          <Card>
            <SectionTitle sub="Probabilidad exacta de cada nº de marcadores acertados. La zona de premio empieza en 4.">
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
                    labelFormatter={(v) => `${v} marcadores`}
                    formatter={(v) => [fmtPct(Number(v), 4), 'Probabilidad']}
                  />
                  <Bar dataKey="prob" radius={[3, 3, 0, 0]}>
                    {hitDist.map((d) => (
                      <Cell key={d.hits} fill={d.premiada ? 'var(--series-2)' : 'var(--gridline)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionTitle sub="Solo 3 categorías (6, 5 y 4 aciertos). El premio por acertante depende de cuánta gente comparta tu resultado: aquí la originalidad manda porque casi nadie acierta marcadores exactos.">
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
                        {o.acertantesEsperados < 1 ? o.acertantesEsperados.toFixed(3) : fmtNum(Math.round(o.acertantesEsperados))}
                      </td>
                      <td className="py-1.5 text-right text-ink tabular-nums">{fmtEurCompact(o.premioPorAcertante)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle sub="Valor esperado según tu acierto de marcador, con el resto fijo. Donde la curva cruza el coste está el umbral de ventaja.">
              La ventaja: valor esperado según habilidad
            </SectionTitle>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={evCurve} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--gridline)" />
                  <XAxis
                    dataKey="pMine"
                    type="number"
                    domain={[0.06, 0.45]}
                    tickFormatter={(v: number) => fmtPct(v, 0)}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--baseline)' }}
                  />
                  <YAxis tickFormatter={(v: number) => fmtEur(v, 1)} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--bord)', borderRadius: 8, fontSize: 13 }}
                    labelFormatter={(v) => `Acierto de marcador: ${fmtPct(Number(v), 0)}`}
                    formatter={(v) => [fmtEur(Number(v)), 'EV por apuesta']}
                  />
                  <ReferenceLine y={params.precio} stroke="var(--baseline)" strokeDasharray="4 3" label={{ value: 'coste', fill: 'var(--muted)', fontSize: 11, position: 'insideBottomRight' }} />
                  {skillCritica !== null && skillCritica >= 0.06 && skillCritica <= 0.45 && (
                    <ReferenceLine x={skillCritica} stroke="var(--good)" strokeDasharray="4 3" label={{ value: 'habilidad crítica', fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }} />
                  )}
                  <ReferenceLine x={params.pCrowd} stroke="var(--series-4)" strokeDasharray="2 2" label={{ value: 'multitud', fill: 'var(--muted)', fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="ev" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Frente a La Quiniela, el marcador exacto hace la predicción mucho más difícil (la
              probabilidad base por partido es baja), pero como casi nadie acierta, quien lo hace
              apenas comparte el premio. Es la misma ventaja parimutuel —habilidad + originalidad—
              llevada al extremo: aún más improbable, aún más sensible a acertar lo que otros no ven.
            </p>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo agregado de El Quinigol: nº de marcadores exactos ~ Binomial(6, habilidad);
          co-acertantes ~ N · Binomial(6, acierto de la multitud); premio por acertante = bolsa de la
          categoría / acertantes (parimutuel). Reparto e importes editables; el bote se asigna a la 1ª
          categoría. Misma familia que La Quiniela. Análisis con fines educativos.
        </p>
      </footer>
    </>
  )
}
