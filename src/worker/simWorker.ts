import { simulatePortfolio } from '../engine/simulation'
import type { DrawConfig, TicketLine } from '../engine/types'

export interface SimJob {
  id: string
  lines: TicketLine[]
  config: DrawConfig
  iterations: number
  seed?: number
}

self.onmessage = (e: MessageEvent<SimJob>) => {
  const { id, lines, config, iterations, seed } = e.data
  const result = simulatePortfolio(lines, config, { iterations, seed }, (done, total) => {
    self.postMessage({ id, type: 'progress', done, total })
  })
  self.postMessage({ id, type: 'done', result }, { transfer: [result.sortedNets.buffer] })
}
