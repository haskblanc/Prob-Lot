import { useEffect, useMemo, useState } from 'react'
import type { DrawConfig, Portfolio, SimulationResult } from '../engine/types'

interface WorkerMsg {
  id: string
  type: 'progress' | 'done'
  done?: number
  total?: number
  result?: SimulationResult
}

/**
 * Ejecuta la simulación Monte Carlo de todas las carteras en un Web Worker
 * (secuencialmente, con la misma semilla para que todas vean los mismos
 * sorteos y sean comparables). Se relanza al cambiar carteras, sorteo,
 * iteraciones o semilla.
 */
export function useSimulations(
  portfolios: Portfolio[],
  config: DrawConfig,
  iterations: number,
  seed: number | undefined,
) {
  const [results, setResults] = useState<Record<string, SimulationResult>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [running, setRunning] = useState(false)

  // Clave estable: relanzar solo si cambia el contenido de las carteras
  const portfolioKey = useMemo(
    () =>
      JSON.stringify(
        portfolios.map((p) => [p.id, p.lines.map((l) => l.numero + ':' + l.decimos)]),
      ),
    [portfolios],
  )

  useEffect(() => {
    setResults({})
    setProgress({})
    if (portfolios.length === 0) {
      setRunning(false)
      return
    }
    setRunning(true)
    const worker = new Worker(new URL('../worker/simWorker.ts', import.meta.url), {
      type: 'module',
    })
    let pending = portfolios.length
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress((prev) => ({ ...prev, [msg.id]: msg.done! / msg.total! }))
      } else if (msg.type === 'done') {
        setResults((prev) => ({ ...prev, [msg.id]: msg.result! }))
        setProgress((prev) => ({ ...prev, [msg.id]: 1 }))
        pending--
        if (pending === 0) setRunning(false)
      }
    }
    // El worker procesa los mensajes en orden: encolamos todas las carteras
    for (const p of portfolios) {
      worker.postMessage({ id: p.id, lines: p.lines, config, iterations, seed })
    }
    return () => worker.terminate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioKey, config.id, iterations, seed])

  return { results, progress, running }
}
