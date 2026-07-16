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
