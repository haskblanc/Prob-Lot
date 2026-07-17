/**
 * Motor de análisis de La Primitiva (6/49).
 *
 * A diferencia de la Lotería Nacional (reparto fijo al 70 %, sin ventaja
 * posible), La Primitiva es un juego **parimutuel con bote acumulado**: los
 * premios de las categorías altas son un porcentaje de la recaudación
 * repartido entre los acertantes, más un bote que se arrastra de sorteos
 * anteriores. Ese bote es la única fuente de "dinero externo" que puede
 * hacer que el valor esperado supere el coste — el fenómeno que explotaron
 * Stefan Mandel y el grupo de Cash WinFall comprando todas las combinaciones.
 *
 * Todo aquí es combinatoria exacta: no hay Monte Carlo ni ruido estadístico.
 */

/** Combinaciones C(n, k) (exacto para los valores de este juego) */
export function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

/** Total de combinaciones posibles de 6 números entre 1 y 49 */
export const TOTAL_COMBINACIONES = comb(49, 6) // 13.983.816

export type PrimitivaCategoryId =
  | 'especial'
  | 'primera'
  | 'segunda'
  | 'tercera'
  | 'cuarta'
  | 'quinta'
  | 'reintegro'

export interface PrimitivaCategory {
  id: PrimitivaCategoryId
  label: string
  descripcion: string
  /** Nº de combinaciones (de las 13.983.816) que caen en esta categoría por aciertos de números */
  combinaciones: number
  /** Probabilidad exacta por apuesta */
  prob: number
  /** Tipo de premio */
  tipo: 'variable' | 'fijo'
}

const T = TOTAL_COMBINACIONES

/**
 * Combinaciones por categoría según los aciertos de los 6 números (sin contar
 * aún el reintegro ni el complementario para especial/1ª, que se separan por
 * probabilidad):
 *  - 6 aciertos: C(6,6)·C(43,0) = 1
 *  - 5 + complementario: C(6,5)·1 = 6 (el 6º número es justo el complementario)
 *  - 5 aciertos: C(6,5)·42 = 252 (el 6º es uno de los 42 no premiados ni compl.)
 *  - 4 aciertos: C(6,4)·C(43,2) = 13.545
 *  - 3 aciertos: C(6,3)·C(43,3) = 246.820
 */
export const SEIS = 1
export const CINCO_COMPL = comb(6, 5) * 1 // 6
export const CINCO = comb(6, 5) * 42 // 252
export const CUATRO = comb(6, 4) * comb(43, 2) // 13.545
export const TRES = comb(6, 3) * comb(43, 3) // 246.820

/**
 * Las 7 categorías con su probabilidad exacta por apuesta.
 * - `especial` (6 + reintegro): las 6 combinaciones exactas Y además acertar
 *   el reintegro (1/10) → prob = (1/T)·(1/10)
 * - `primera` (6 sin reintegro): (1/T)·(9/10)
 * - El reintegro se cobra de forma independiente (1/10) sobre cualquier apuesta.
 */
export const PRIMITIVA_CATEGORIES: readonly PrimitivaCategory[] = [
  {
    id: 'especial',
    label: 'Categoría especial',
    descripcion: '6 aciertos + reintegro',
    combinaciones: SEIS,
    prob: (SEIS / T) * (1 / 10),
    tipo: 'variable',
  },
  {
    id: 'primera',
    label: '1ª categoría',
    descripcion: '6 aciertos',
    combinaciones: SEIS,
    prob: (SEIS / T) * (9 / 10),
    tipo: 'variable',
  },
  {
    id: 'segunda',
    label: '2ª categoría',
    descripcion: '5 aciertos + complementario',
    combinaciones: CINCO_COMPL,
    prob: CINCO_COMPL / T,
    tipo: 'variable',
  },
  {
    id: 'tercera',
    label: '3ª categoría',
    descripcion: '5 aciertos',
    combinaciones: CINCO,
    prob: CINCO / T,
    tipo: 'variable',
  },
  {
    id: 'cuarta',
    label: '4ª categoría',
    descripcion: '4 aciertos',
    combinaciones: CUATRO,
    prob: CUATRO / T,
    tipo: 'variable',
  },
  {
    id: 'quinta',
    label: '5ª categoría',
    descripcion: '3 aciertos',
    combinaciones: TRES,
    prob: TRES / T,
    tipo: 'fijo',
  },
  {
    id: 'reintegro',
    label: 'Reintegro',
    descripcion: 'acertar solo el reintegro',
    combinaciones: T / 10,
    prob: 1 / 10,
    tipo: 'fijo',
  },
]

export interface PrimitivaParams {
  /** Precio por apuesta (€) */
  precio: number
  /** Fracción de la recaudación destinada a premios (fondo repartible) */
  ratio: number
  /** Bote acumulado de sorteos anteriores (€), se suma a la categoría especial */
  bote: number
  /** Nº de apuestas del resto de jugadores en el sorteo (participación) */
  otrasApuestas: number
  /** Reparto del fondo variable por categoría (fracciones, suman 1) */
  pctEspecial: number
  pctPrimera: number
  pctSegunda: number
  pctTercera: number
  pctCuarta: number
  /** Premio fijo de la 5ª categoría (€) */
  premioQuinta: number
  /** Premio fijo del reintegro (€) */
  premioReintegro: number
}

export const DEFAULT_PRIMITIVA_PARAMS: PrimitivaParams = {
  precio: 1,
  ratio: 0.55,
  bote: 0,
  otrasApuestas: 15_000_000,
  pctEspecial: 0.2,
  pctPrimera: 0.4,
  pctSegunda: 0.06,
  pctTercera: 0.13,
  pctCuarta: 0.21,
  premioQuinta: 8,
  premioReintegro: 0.5,
}

const P_TRES = TRES / T
const P_REINTEGRO = 1 / 10

/** Valor esperado por apuesta de los premios fijos (5ª + reintegro) */
export function fixedEV(p: PrimitivaParams): number {
  return P_TRES * p.premioQuinta + P_REINTEGRO * p.premioReintegro
}

/**
 * Valor esperado de UNA apuesta al azar.
 *
 * Por la naturaleza parimutuel, el EV se simplifica a una fórmula limpia:
 *   EV = ratio · precio + bote / N
 * donde N es el nº total de apuestas del sorteo. Es decir: recuperas en media
 * la fracción `ratio` de lo que juegas (≈55 %, peor que el 70 % de la Lotería
 * Nacional), más una porción minúscula del bote repartida entre todos los
 * jugadores. Para una sola apuesta el bote apenas mueve el EV, y además es
 * pura varianza (depende de acertar 6, algo casi imposible).
 */
export function singleBetEV(p: PrimitivaParams): number {
  const N = p.otrasApuestas + 1
  return p.ratio * p.precio + p.bote / N
}

export interface CategoryOutcome {
  cat: PrimitivaCategory
  /** Acertantes esperados en el sorteo (nº de apuestas × probabilidad) */
  acertantesEsperados: number
  /** Premio medio esperado por acertante (€) */
  premioPorAcertante: number
  /** Aportación de esta categoría al valor esperado de una apuesta (€) */
  evAportacion: number
}

/**
 * Desglose por categoría para el sorteo descrito por `p`. Los premios
 * variables se calculan como bolsa / acertantes esperados (naturaleza
 * parimutuel); los fijos son el importe por acertante. La suma de
 * `evAportacion` es exactamente `singleBetEV(p)`.
 */
export function categoryOutcomes(p: PrimitivaParams): CategoryOutcome[] {
  const N = p.otrasApuestas + 1
  const S = N * p.precio
  const V = Math.max(0, p.ratio * S - N * fixedEV(p))
  const variablePct: Record<string, number> = {
    especial: p.pctEspecial,
    primera: p.pctPrimera,
    segunda: p.pctSegunda,
    tercera: p.pctTercera,
    cuarta: p.pctCuarta,
  }
  return PRIMITIVA_CATEGORIES.map((cat) => {
    const acertantesEsperados = N * cat.prob
    let premioPorAcertante: number
    if (cat.tipo === 'fijo') {
      premioPorAcertante = cat.id === 'quinta' ? p.premioQuinta : p.premioReintegro
    } else {
      let pool = variablePct[cat.id] * V
      if (cat.id === 'especial') pool += p.bote
      premioPorAcertante = acertantesEsperados > 0 ? pool / acertantesEsperados : 0
    }
    return { cat, acertantesEsperados, premioPorAcertante, evAportacion: cat.prob * premioPorAcertante }
  })
}

export interface BuyAllResult {
  /** Nº de combinaciones a comprar */
  combinaciones: number
  /** Coste de comprarlas todas (€) */
  coste: number
  /** Premio garantizado de 5ª categoría (3 aciertos), es fijo y seguro (€) */
  garantizadoQuinta: number
  /** Retorno total esperado comprándolas todas (€) */
  retorno: number
  /** Ganancia neta esperada = retorno − coste (€) */
  neta: number
  /** Fracción del bote/fondo que te llevas (según cuánta gente más juega) */
  fraccion: number
}

/**
 * Estrategia "comprar TODAS las combinaciones" (la de Stefan Mandel / Cash
 * WinFall). Al tener todas las combinaciones ganas con seguridad el premio
 * gordo, toda la 5ª categoría fija, y una fracción M/N de cada bolsa variable
 * y del bote (compartida con el resto de jugadores que hayan acertado lo mismo).
 */
export function buyAllAnalysis(p: PrimitivaParams): BuyAllResult {
  const M = TOTAL_COMBINACIONES
  const N = M + p.otrasApuestas
  const S = N * p.precio
  const fixedTotal = N * fixedEV(p)
  // Fondo variable disponible tras pagar los premios fijos
  const V = Math.max(0, p.ratio * S - fixedTotal)
  // Tu fracción de cada bolsa variable y del bote (compartes con otros acertantes)
  const fraccion = M / N

  // Premios fijos que cobras: 3 aciertos es exacto (tienes todas las
  // combinaciones), reintegro en ~1/10 de tus apuestas
  const garantizadoQuinta = TRES * p.premioQuinta
  const fixedWin = garantizadoQuinta + M * P_REINTEGRO * p.premioReintegro

  const retorno = fixedWin + fraccion * (V + p.bote)
  const coste = M * p.precio
  return {
    combinaciones: M,
    coste,
    garantizadoQuinta,
    retorno,
    neta: retorno - coste,
    fraccion,
  }
}

/**
 * Bote crítico: el valor del bote a partir del cual comprar todas las
 * combinaciones deja de perder dinero (ganancia neta ≥ 0). Resuelve
 * `buyAllAnalysis(...).neta = 0` para el bote.
 */
export function breakEvenBote(p: PrimitivaParams): number {
  const M = TOTAL_COMBINACIONES
  const N = M + p.otrasApuestas
  const S = N * p.precio
  const fixedTotal = N * fixedEV(p)
  const V = Math.max(0, p.ratio * S - fixedTotal)
  const fraccion = M / N
  const fixedWin = TRES * p.premioQuinta + M * P_REINTEGRO * p.premioReintegro
  const coste = M * p.precio
  // fixedWin + fraccion·(V + B) = coste  →  B = (coste − fixedWin)/fraccion − V
  return (coste - fixedWin) / fraccion - V
}

/** "1 en N": inverso de la probabilidad, redondeado */
export const oneIn = (prob: number) => Math.round(1 / prob)
