import { useState } from 'react'
import {
  buildBillete,
  buildDispersos,
  buildPersonalizada,
  buildSerie,
  buildSuelto,
} from '../engine/portfolio'
import { toNumero } from '../engine/lotteryEngine'
import { DECIMOS_PER_BILLETE, SERIES_SIZE, type Portfolio, type PortfolioMode, type TicketLine } from '../engine/types'
import { Card, SectionTitle } from './ui'

const MODES: { id: PortfolioMode; label: string }[] = [
  { id: 'suelto', label: 'Número suelto' },
  { id: 'billete', label: 'Billete entero' },
  { id: 'serie', label: 'Serie consecutiva' },
  { id: 'dispersos', label: 'Dispersos' },
  { id: 'personalizada', label: 'Personalizada' },
]

const randomNumero = () => toNumero(Math.floor(Math.random() * SERIES_SIZE))

const cleanNumero = (raw: string) => raw.replace(/\D/g, '').slice(0, 5)

function NumeroInput({
  value,
  onChange,
  label = 'Número (5 cifras)',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink2">
      {label}
      <span className="flex gap-2">
        <input
          className="w-28 rounded-lg border border-bord bg-page px-3 py-1.5 font-mono text-base text-ink tabular-nums"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(cleanNumero(e.target.value))}
          onBlur={(e) => e.target.value !== '' && onChange(toNumero(parseInt(e.target.value, 10)))}
          placeholder="00000"
        />
        <button
          type="button"
          title="Número al azar"
          className="rounded-lg border border-bord px-2.5 py-1.5 text-sm text-ink2 hover:bg-page"
          onClick={() => onChange(randomNumero())}
        >
          🎲
        </button>
      </span>
    </label>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink2">
      <span>
        {label}: <strong className="text-ink">{value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
    </label>
  )
}

export function PortfolioBuilder({
  onAdd,
  disabled,
}: {
  onAdd: (p: Portfolio) => void
  disabled: boolean
}) {
  const [mode, setMode] = useState<PortfolioMode>('suelto')
  const [numero, setNumero] = useState(randomNumero)
  const [decimos, setDecimos] = useState(1)
  const [serieLen, setSerieLen] = useState(10)
  const [dispersosCount, setDispersosCount] = useState(10)
  const [customLines, setCustomLines] = useState<TicketLine[]>([{ numero: randomNumero(), decimos: 1 }])

  const numeroValid = numero.length === 5

  const add = () => {
    switch (mode) {
      case 'suelto':
        return onAdd(buildSuelto(numero, decimos))
      case 'billete':
        return onAdd(buildBillete(numero))
      case 'serie':
        return onAdd(buildSerie(numero, serieLen))
      case 'dispersos':
        return onAdd(buildDispersos(dispersosCount))
      case 'personalizada':
        return onAdd(buildPersonalizada(customLines.filter((l) => l.numero.length === 5)))
    }
  }

  const canAdd =
    !disabled &&
    (mode === 'dispersos' ||
      (mode === 'personalizada'
        ? customLines.some((l) => l.numero.length === 5)
        : numeroValid))

  return (
    <Card>
      <SectionTitle sub="Elige cómo construir una cartera de números y añádela al panel.">
        Nueva cartera
      </SectionTitle>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={`rounded-full border px-3 py-1 text-sm ${
              mode === m.id
                ? 'border-transparent bg-ink text-page'
                : 'border-bord text-ink2 hover:bg-page'
            }`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {mode === 'suelto' && (
          <>
            <NumeroInput value={numero} onChange={setNumero} />
            <Slider label="Décimos" value={decimos} min={1} max={10} onChange={setDecimos} />
          </>
        )}
        {mode === 'billete' && (
          <>
            <NumeroInput value={numero} onChange={setNumero} />
            <p className="text-sm text-ink2">
              Billete entero: {DECIMOS_PER_BILLETE} décimos del mismo número.
            </p>
          </>
        )}
        {mode === 'serie' && (
          <>
            <NumeroInput value={numero} onChange={setNumero} label="Número base (5 cifras)" />
            <Slider
              label="Números consecutivos"
              value={serieLen}
              min={2}
              max={100}
              onChange={setSerieLen}
            />
            <p className="text-xs text-muted">
              Genera {serieLen} números consecutivos (1 décimo cada uno) variando las últimas
              cifras.
            </p>
          </>
        )}
        {mode === 'dispersos' && (
          <>
            <Slider
              label="Números aleatorios distintos"
              value={dispersosCount}
              min={2}
              max={100}
              onChange={setDispersosCount}
            />
            <p className="text-xs text-muted">1 décimo de cada número, elegidos al azar.</p>
          </>
        )}
        {mode === 'personalizada' && (
          <div className="flex flex-col gap-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-1 font-medium">Número</th>
                  <th className="pb-1 font-medium">Décimos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customLines.map((line, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <input
                        className="w-24 rounded-lg border border-bord bg-page px-2 py-1 font-mono text-ink tabular-nums"
                        inputMode="numeric"
                        value={line.numero}
                        onChange={(e) =>
                          setCustomLines((ls) =>
                            ls.map((l, j) => (j === i ? { ...l, numero: cleanNumero(e.target.value) } : l)),
                          )
                        }
                        onBlur={(e) =>
                          e.target.value !== '' &&
                          setCustomLines((ls) =>
                            ls.map((l, j) =>
                              j === i ? { ...l, numero: toNumero(parseInt(e.target.value, 10)) } : l,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-16 rounded-lg border border-bord bg-page px-2 py-1 text-ink tabular-nums"
                        value={line.decimos}
                        onChange={(e) =>
                          setCustomLines((ls) =>
                            ls.map((l, j) =>
                              j === i
                                ? { ...l, decimos: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)) }
                                : l,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        title="Quitar fila"
                        className="rounded px-2 py-0.5 text-muted hover:bg-page hover:text-bad"
                        onClick={() => setCustomLines((ls) => ls.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="self-start rounded-lg border border-bord px-3 py-1 text-sm text-ink2 hover:bg-page"
              onClick={() => setCustomLines((ls) => [...ls, { numero: randomNumero(), decimos: 1 }])}
            >
              + Añadir fila
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={!canAdd}
          className="mt-1 rounded-lg bg-s1 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={add}
        >
          Añadir cartera
        </button>
        {disabled && (
          <p className="text-xs text-muted">Máximo 4 carteras: elimina alguna para añadir otra.</p>
        )}
      </div>
    </Card>
  )
}
