import { Card, SectionTitle } from '../components/ui'
import { PAYOUT_RATIO } from '../engine/config'
import { singleBetEV as primEV, DEFAULT_PRIMITIVA_PARAMS } from '../engine/primitiva'
import { singleBetEV as euroEV, DEFAULT_EUROMILLONES_PARAMS } from '../engine/euromillones'
import { evPresent, DEFAULT_EURODREAMS_PARAMS } from '../engine/eurodreams'
import { singleBetEV as quinielaEV, DEFAULT_QUINIELA_PARAMS } from '../engine/quiniela'
import { singleBetEV as quinigolEV, DEFAULT_QUINIGOL_PARAMS } from '../engine/quinigol'
import { evInicial, DEFAULT_RASCA_PARAMS } from '../engine/rascas'
import { fmtPct } from '../format'

// Retorno base (EV / coste) de cada sorteo en su escenario neutro (sin bote,
// sin ventaja de habilidad). Para Quiniela/Quinigol se usa habilidad = la de
// la multitud (sin edge), que da el retorno "de la casa".
const euroBase = euroEV({ ...DEFAULT_EUROMILLONES_PARAMS, bote: 0 })
const quinielaBase = quinielaEV({ ...DEFAULT_QUINIELA_PARAMS, pMine: DEFAULT_QUINIELA_PARAMS.pCrowd })
const quinigolBase = quinigolEV({ ...DEFAULT_QUINIGOL_PARAMS, pMine: DEFAULT_QUINIGOL_PARAMS.pCrowd })

interface GameRow {
  tab: string
  name: string
  mecanismo: string
  retorno: number
  ventaja: string
  palanca: string
  color: string
}

const GAMES: GameRow[] = [
  {
    tab: 'nacional',
    name: 'Lotería Nacional',
    mecanismo: 'Reparto fijo',
    retorno: PAYOUT_RATIO,
    ventaja: 'Ninguna, jamás',
    palanca: 'Solo se gestiona la varianza (suelo garantizado)',
    color: 'var(--series-1)',
  },
  {
    tab: 'primitiva',
    name: 'La Primitiva',
    mecanismo: 'Parimutuel + bote',
    retorno: primEV({ ...DEFAULT_PRIMITIVA_PARAMS, bote: 0 }) / DEFAULT_PRIMITIVA_PARAMS.precio,
    ventaja: 'Solo comprando todo, en botes extremos',
    palanca: 'El bote (impracticable: 14 M de apuestas)',
    color: 'var(--series-2)',
  },
  {
    tab: 'euromillones',
    name: 'Euromillones',
    mecanismo: 'Parimutuel + bote + rolldown',
    retorno: euroBase / DEFAULT_EUROMILLONES_PARAMS.precio,
    ventaja: 'Real y accesible en el rolldown',
    palanca: 'El rolldown (una apuesta corriente puede ser +EV)',
    color: 'var(--series-3)',
  },
  {
    tab: 'eurodreams',
    name: 'EuroDreams',
    mecanismo: 'Premio fijo en rentas',
    retorno: evPresent(DEFAULT_EURODREAMS_PARAMS) / DEFAULT_EURODREAMS_PARAMS.precio,
    ventaja: 'Ninguna; además el titular engaña',
    palanca: 'El valor presente descuenta el premio anunciado',
    color: 'var(--series-4)',
  },
  {
    tab: 'quiniela',
    name: 'La Quiniela',
    mecanismo: 'Parimutuel + habilidad',
    retorno: quinielaBase / DEFAULT_QUINIELA_PARAMS.precio,
    ventaja: 'Posible con habilidad + originalidad',
    palanca: 'Predecir mejor que el mercado (rarísimo)',
    color: 'var(--series-1)',
  },
  {
    tab: 'quinigol',
    name: 'El Quinigol',
    mecanismo: 'Parimutuel + habilidad (marcador exacto)',
    retorno: quinigolBase / DEFAULT_QUINIGOL_PARAMS.precio,
    ventaja: 'Igual que Quiniela, llevado al extremo',
    palanca: 'Habilidad + originalidad (aún más difícil)',
    color: 'var(--series-2)',
  },
  {
    tab: 'rascas',
    name: 'Rascas',
    mecanismo: 'Pool finito que se agota',
    retorno: evInicial(DEFAULT_RASCA_PARAMS) / DEFAULT_RASCA_PARAMS.precio,
    ventaja: 'Edge de información, si tienes los datos',
    palanca: 'Comprar cuando los gordos siguen vivos',
    color: 'var(--series-3)',
  },
]

const BAR_MAX = 1.2 // el eje llega al 120 % para que se vea el 100 %

export default function ResumenView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <>
      <header className="border-b border-bord bg-surface px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold">Resumen — ¿se puede batir al sistema?</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            Las siete loterías, ordenadas por lo que responden a la pregunta del millón. La regla
            general no tiene excepción: <strong>en el escenario base, todas devuelven menos de lo que
            cuestan</strong> (la casa siempre gana de media). Lo que cambia es <em>dónde</em> —y con
            qué dificultad— puede aparecer una grieta. Haz clic en cualquiera para ir a su análisis.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <Card>
          <SectionTitle sub="Valor esperado ÷ coste, en el escenario neutro (sin bote, sin ventaja de habilidad). Ninguna llega al 100 %: el punto de equilibrio. Ahí vive el margen de la casa.">
            Retorno base de cada sorteo
          </SectionTitle>
          <div className="flex flex-col gap-2.5">
            {GAMES.map((g) => (
              <div key={g.tab} className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-40 shrink-0 text-right text-sm text-ink hover:underline"
                  onClick={() => onNavigate(g.tab)}
                >
                  {g.name}
                </button>
                <div className="relative h-6 grow overflow-hidden rounded-md bg-page">
                  {/* Línea del 100 % (punto de equilibrio) */}
                  <div
                    aria-hidden
                    className="absolute inset-y-0 z-10 w-0.5 bg-bad"
                    style={{ left: `${(1 / BAR_MAX) * 100}%` }}
                  />
                  <div
                    className="flex h-full items-center rounded-md pl-2 text-xs font-medium text-white"
                    style={{ width: `${(g.retorno / BAR_MAX) * 100}%`, backgroundColor: g.color }}
                  >
                    {fmtPct(g.retorno, 0)}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-40 shrink-0" />
              <div className="relative h-4 grow text-[10px] text-muted">
                <span className="absolute -translate-x-1/2" style={{ left: `${(0.5 / BAR_MAX) * 100}%` }}>50 %</span>
                <span className="absolute -translate-x-1/2 font-medium text-bad" style={{ left: `${(1 / BAR_MAX) * 100}%` }}>
                  100 % (equilibrio)
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle sub="La familia estructural determina si —y dónde— puede existir ventaja. Del 'imposible' al 'edge de información'.">
            La taxonomía: mecanismo y dónde está la grieta
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bord text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-1.5 pr-3 font-medium">Sorteo</th>
                  <th className="py-1.5 pr-3 font-medium">Mecanismo</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Retorno base</th>
                  <th className="py-1.5 pr-3 font-medium">¿Puede haber ventaja?</th>
                  <th className="py-1.5 font-medium">La palanca</th>
                </tr>
              </thead>
              <tbody>
                {GAMES.map((g) => (
                  <tr key={g.tab} className="border-b border-bord/50">
                    <td className="py-2 pr-3">
                      <button type="button" className="flex items-center gap-2 text-ink hover:underline" onClick={() => onNavigate(g.tab)}>
                        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-ink2">{g.mecanismo}</td>
                    <td className="py-2 pr-3 text-right text-ink tabular-nums">{fmtPct(g.retorno, 0)}</td>
                    <td className="py-2 pr-3 text-ink2">{g.ventaja}</td>
                    <td className="py-2 text-ink2">{g.palanca}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Reparto fijo</span>
            <span className="text-base font-semibold text-ink">Imposible batir</span>
            <span className="text-sm text-ink2">
              El retorno es una constante del sistema. Comprar toda la serie garantiza perder el 30 %.
              Solo eliges tu perfil de varianza, nunca tu esperanza.
            </span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Parimutuel + bote</span>
            <span className="text-base font-semibold text-ink">Ventaja rara y cara</span>
            <span className="text-sm text-ink2">
              El dinero externo del bote puede volcar el EV, pero suele estar atrapado en la casilla
              imposible. El rolldown de Euromillones es la excepción que sí es accesible.
            </span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Habilidad e información</span>
            <span className="text-base font-semibold text-ink">Ventaja posible, difícil</span>
            <span className="text-sm text-ink2">
              Quiniela/Quinigol premian predecir mejor que la multitud; los Rascas, saber qué queda en
              la caja. Ventaja real en teoría, erosionada por el peaje y la falta de datos.
            </span>
          </Card>
        </div>

        <Card>
          <SectionTitle>La conclusión</SectionTitle>
          <p className="text-sm leading-relaxed text-ink2">
            No existe una estrategia general para ganarle a la lotería: en todos los juegos, de media,
            se pierde. Las únicas grietas aparecen cuando entra <strong className="text-ink">dinero
            externo</strong> (un bote que se vuelca por rolldown), cuando el jugador aporta{' '}
            <strong className="text-ink">habilidad</strong> superior a la multitud (Quiniela/Quinigol)
            o cuando dispone de <strong className="text-ink">información</strong> que otros no tienen
            (Rascas con premios pendientes). Las tres son legales, todas raras, y ninguna convierte la
            lotería en una inversión: son anomalías puntuales, no un método. Y ojo con el titular:
            EuroDreams recuerda que hasta el importe anunciado del premio puede valer la mitad de lo
            que parece.
          </p>
        </Card>
      </main>
    </>
  )
}
