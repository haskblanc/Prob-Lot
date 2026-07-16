import type { ReactNode } from 'react'
import type { Portfolio } from '../engine/types'

export type UiPortfolio = Portfolio & { colorSlot: number }

export const SERIES_VARS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
]

export const colorForSlot = (slot: number) => SERIES_VARS[slot % SERIES_VARS.length]

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-bord bg-surface p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-ink2">{sub}</p>}
    </div>
  )
}

export function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'good' | 'bad'
}) {
  const toneClass = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink'
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className={`text-2xl font-semibold ${toneClass}`}>{value}</span>
      {detail && <span className="text-xs text-ink2">{detail}</span>}
    </Card>
  )
}

export function ColorChip({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}
