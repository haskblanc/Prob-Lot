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
import { CriticalInfo } from '../components/CriticalInfo'
import {
  breakEvenVendidos,
  DEFAULT_RASCA_PARAMS,
  evInicial,
  evRestante,
  poolTotal,
  type RascaParams,
} from '../engine/rascas'
import { fmtEur, fmtEurCompact, fmtNum, fmtPct } from '../format'

export default function RascasView() {
  const [params, setParams] = useState<RascaParams>(DEFAULT_RASCA_PARAMS)
  const set = (patch: Partial<RascaParams>) => setParams((p) => ({ ...p, ...patch }))

  const evIni = evInicial(params)
  const evRest = evRestante(params)
  const breakEven = useMemo(() => breakEvenVendidos(params), [params])
  const gordo = params.premios[0]

  const chartData = useMemo(() => {
    const pts = 60
    return Array.from({ length: pts + 1 }, (_, i) => {
      const vendidos = (0.99 / pts) * i
      return { vendidos, ev: evRestante({ ...params, vendidos }) }
    })
  }, [params])

  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">Rasca — lotería instantánea</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            El mecanismo nuevo: el <strong>pool que se agota</strong>. Un Rasca es una tirada finita
            con premios conocidos. Su valor esperado <strong>no es fijo</strong>: cambia según los
            premios que queden. Si los gordos ya salieron, los cartones que quedan valen menos; si
            siguen ahí cuando se han vendido muchos, valen <strong>más</strong> — y aparece una
            ventana de EV positivo. Es el <strong>edge de información</strong> (caso Srivastava): no
            bates el azar, bates la falta de información de los demás.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <Card>
            <SectionTitle sub="Simula el estado de la tirada: cuánto se ha vendido y si los gordos siguen sin salir.">
              Estado de la tirada
            </SectionTitle>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Cartones vendidos: <strong className="text-ink">{fmtPct(params.vendidos, 0)}</strong>
                </span>
                <input type="range" min={0} max={0.99} step={0.01} value={params.vendidos} onChange={(e) => set({ vendidos: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink2">
                <span>
                  Premios gordos sin repartir: <strong className="text-ink">{params.gordosSinRepartir}</strong> de {gordo.count}
                </span>
                <input type="range" min={0} max={gordo.count} step={1} value={params.gordosSinRepartir} onChange={(e) => set({ gordosSinRepartir: Number(e.target.value) })} />
                <span className="text-xs text-muted">El dato que da la ventaja: cuántos premios de {fmtEur(gordo.amount, 0)} siguen vivos.</span>
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink2">
                Precio del cartón
                <span className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="w-24 rounded-lg border border-bord bg-page px-2 py-1.5 text-ink tabular-nums"
                    value={params.precio}
                    min={0}
                    step={0.5}
                    onChange={(e) => set({ precio: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <span className="text-xs text-muted">€</span>
                </span>
              </label>
              <button
                type="button"
                className="self-start text-xs text-muted hover:text-ink hover:underline"
                onClick={() => setParams(DEFAULT_RASCA_PARAMS)}
              >
                Restaurar valores por defecto
              </button>
            </div>
          </Card>

          <Card>
            <SectionTitle>Estructura de premios</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-1 pr-2 font-medium">Premio</th>
                    <th className="py-1 text-right font-medium">Nº en la tirada</th>
                  </tr>
                </thead>
                <tbody>
                  {params.premios.map((pr, i) => (
                    <tr key={i} className="border-b border-bord/50">
                      <td className="py-1 pr-2 text-ink tabular-nums">{fmtEur(pr.amount, 0)}</td>
                      <td className="py-1 text-right text-ink2 tabular-nums">{fmtNum(pr.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">
              {fmtNum(params.totalCartones)} cartones · reparte {fmtEurCompact(poolTotal(params))} en total
            </p>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="EV inicial del cartón"
              value={fmtEur(evIni)}
              detail={`${fmtPct(evIni / params.precio)} del precio (${fmtEur(params.precio, 0)})`}
              tone="bad"
            />
            <StatTile
              label="EV de los cartones que quedan"
              value={fmtEur(evRest)}
              detail={params.vendidos > 0 ? `con ${fmtPct(params.vendidos, 0)} vendido` : 'aún sin vender nada'}
              tone={evRest >= params.precio ? 'good' : 'bad'}
            />
            <StatTile
              label="Ventana de EV positivo"
              value={breakEven === null ? 'nunca' : `${fmtPct(breakEven, 0)} vendido`}
              detail={breakEven === null ? 'sin gordos vivos no hay ventaja' : 'a partir de aquí, si los gordos siguen vivos'}
              tone={breakEven !== null && params.vendidos >= breakEven ? 'good' : undefined}
            />
            <StatTile
              label="Gordos vivos"
              value={`${params.gordosSinRepartir} × ${fmtEurCompact(gordo.amount)}`}
              detail={`${fmtEurCompact(params.gordosSinRepartir * gordo.amount)} aún por repartir`}
            />
          </div>

          <Card>
            <SectionTitle sub="Valor esperado de los cartones que quedan según cuántos se han vendido, suponiendo que los gordos siguen vivos. Al agotarse los cartones de premio pequeño, el gordo se concentra.">
              El pool que se agota: EV restante según lo vendido
            </SectionTitle>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--gridline)" />
                  <XAxis
                    dataKey="vendidos"
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={(v: number) => fmtPct(v, 0)}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--baseline)' }}
                  />
                  <YAxis tickFormatter={(v: number) => fmtEur(v, 0)} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--bord)', borderRadius: 8, fontSize: 13 }}
                    labelFormatter={(v) => `Vendido: ${fmtPct(Number(v), 0)}`}
                    formatter={(v) => [fmtEur(Number(v)), 'EV restante']}
                  />
                  <ReferenceLine y={params.precio} stroke="var(--baseline)" strokeDasharray="4 3" label={{ value: 'precio', fill: 'var(--muted)', fontSize: 11, position: 'insideBottomRight' }} />
                  {breakEven !== null && (
                    <ReferenceLine x={breakEven} stroke="var(--good)" strokeDasharray="4 3" label={{ value: 'ventana +EV', fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }} />
                  )}
                  <Line type="monotone" dataKey="ev" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              De inicio el cartón vale {fmtEur(evIni)} (pierdes). Pero si los gordos siguen sin salir,
              cada cartón vendido de premio pequeño concentra el valor en los que quedan: al superar
              el {breakEven === null ? '—' : fmtPct(breakEven, 0)} vendido, los cartones restantes
              tienen EV positivo. Ese es el edge: no cambia el azar, cambia lo que sabes que queda en
              la caja. En la práctica hace falta el dato público de premios pendientes y comprar
              justo esos cartones — raro, pero real.
            </p>
          </Card>
          <CriticalInfo
            items={[
              {
                tipo: 'si',
                titulo: 'El dato que vale dinero: premios pendientes',
                texto:
                  'Donde el operador publica los premios sin repartir por juego (varias loterías de EE. UU. y otros países lo hacen), calcular EV restante = premios pendientes ÷ cartones restantes identifica juegos +EV. Ha habido compradores sistemáticos que vivieron de esto, legalmente: es puro edge de información pública que casi nadie consulta.',
              },
              {
                tipo: 'ojo',
                titulo: 'En España el dato no es público en tiempo real',
                texto:
                  'SELAE/ONCE no publican los premios pendientes por serie de forma continua, así que la ventana +EV existe (la matemática de arriba es real) pero no es observable: no puedes saber cuándo estás en ella. El edge queda teórico salvo que el operador cambie su transparencia.',
              },
              {
                tipo: 'ojo',
                titulo: 'Series viejas frente a series recién lanzadas',
                texto:
                  'Un juego recién salido tiene EV = inicial (aquí, 65 %). Uno veterano es una lotería de dos capas: mejor si los gordos siguen vivos, peor si ya salieron. Sin el dato de premios pendientes, comprar cartones de series viejas es una apuesta a ciegas sobre cuál de los dos escenarios te toca.',
              },
              {
                tipo: 'no',
                titulo: 'Buscar defectos físicos o patrones en el cartón',
                texto:
                  'El caso Srivastava (descubrió cómo predecir rascas ganadores por los números visibles del cartón) fue un fallo de diseño que reportó al operador y se corrigió. Los rascas modernos se generan criptográficamente; y explotar un defecto de ese tipo sin reportarlo entra en terreno de fraude, no de estrategia.',
              },
            ]}
          />
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted">
        <p>
          Modelo de Rasca: tirada finita con estructura de premios conocida. EV = premios pendientes
          / cartones restantes. Se supone que los premios no gordos se reparten en proporción a lo
          vendido y que el premio mayor conserva los "vivos" indicados. Estructura de premios y
          tamaño de tirada editables en el código. Análisis con fines educativos: ilustra el edge de
          información (caso Srivastava, mercados secundarios), no una garantía.
        </p>
      </footer>
    </>
  )
}
