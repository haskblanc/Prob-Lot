export const fmtEur = (v: number, dec = 2) =>
  v.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })

export const fmtPct = (v: number, dec = 1) =>
  (v * 100).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
  ' %'

export const fmtNum = (v: number, dec = 0) =>
  v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Euros compacto: 13,98 M € / 1.974.560 € según magnitud */
export const fmtEurCompact = (v: number): string => {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} M €`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil €`
  return fmtEur(v, 2)
}
