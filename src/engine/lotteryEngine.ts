import { CATEGORY_BY_ID, DEFAULT_CONFIG, PRIORITY_ORDER } from './config'
import { createRng, randInt, type Rng } from './rng'
import { SERIES_SIZE, type CategoryId, type Draw, type DrawConfig, type ScoreResult } from './types'

/** Últimas k cifras de n como número (0 ≤ resultado < 10^k) */
const lastK = (n: number, k: number) => n % 10 ** k

/** Últimas k cifras de n como cadena con ceros a la izquierda */
export const lastKStr = (n: number, k: number) => String(lastK(n, k)).padStart(k, '0')

/** Formatea un número de billete a 5 cifras */
export const toNumero = (n: number) => String(n).padStart(5, '0')

/**
 * Genera `howMany` extracciones de `digits` cifras finales. Como en el
 * sorteo real, las extracciones son independientes y **pueden repetirse**
 * entre sí (una terminación que sale dos veces paga doble a quien la lleva).
 * Sí se excluyen las terminaciones de los números premiados (`banned`),
 * porque esas ya se pagan en su propia categoría (terminación del 1er/2º
 * premio) y no deben acumular además el importe de pedrea: así el pago
 * total por serie sigue siendo exactamente 210.000 €.
 */
function drawEndings(rng: Rng, howMany: number, digits: number, banned: Iterable<number>): string[] {
  const bannedSet = new Set<number>(banned)
  const result: string[] = []
  const space = 10 ** digits
  while (result.length < howMany) {
    const candidate = randInt(rng, space)
    if (bannedSet.has(candidate)) continue
    result.push(String(candidate).padStart(digits, '0'))
  }
  return result
}

/**
 * Genera un sorteo completo y coherente.
 *
 * Las extracciones de pedrea de cada tamaño son independientes y pueden
 * repetirse entre sí (como en el sorteo real: en el ejemplo del 16/07/26 el
 * 150 salió dos veces en la pedrea de 3 cifras y el 64 dos veces en la de 2).
 * No coinciden con la terminación del 1er/2º premio (esas van en su propia
 * categoría). Los reintegros especiales son cifras independientes.
 */
export function generateDraw(rng: Rng = createRng()): Draw {
  const primer = randInt(rng, SERIES_SIZE)
  let segundo = randInt(rng, SERIES_SIZE)
  while (segundo === primer) segundo = randInt(rng, SERIES_SIZE)

  return {
    primer,
    segundo,
    pedrea4: drawEndings(rng, 4, 4, [lastK(primer, 4), lastK(segundo, 4)]),
    pedrea3: drawEndings(rng, 7, 3, [lastK(primer, 3), lastK(segundo, 3)]),
    pedrea2: drawEndings(rng, 9, 2, [lastK(primer, 2), lastK(segundo, 2)]),
    reintegroE1: String(randInt(rng, 10)),
    reintegroE2: String(randInt(rng, 10)),
  }
}

const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Devuelve las categorías (una vez cada una) que corresponden al número `n`.
 * Para las categorías de pedrea sólo informa de la pertenencia; la
 * multiplicidad (una terminación repetida paga varias veces) la aplica quien
 * calcula el premio, contando cuántas veces aparece la terminación en el
 * sorteo.
 */
export function matchCategories(n: number, draw: Draw): CategoryId[] {
  const { primer, segundo } = draw
  const matches: CategoryId[] = []

  if (n === primer) matches.push('primer')
  if (n === segundo) matches.push('segundo')
  if (n === mod(primer - 1, SERIES_SIZE) || n === mod(primer + 1, SERIES_SIZE)) matches.push('aprox1')
  if (n === mod(segundo - 1, SERIES_SIZE) || n === mod(segundo + 1, SERIES_SIZE)) matches.push('aprox2')
  if (Math.floor(n / 100) === Math.floor(primer / 100) && n !== primer) matches.push('centena1')
  if (Math.floor(n / 100) === Math.floor(segundo / 100) && n !== segundo) matches.push('centena2')
  if (n !== primer) {
    if (lastK(n, 4) === lastK(primer, 4)) matches.push('term4_1')
    if (lastK(n, 3) === lastK(primer, 3)) matches.push('term3_1')
    if (lastK(n, 2) === lastK(primer, 2)) matches.push('term2_1')
    if (lastK(n, 1) === lastK(primer, 1)) matches.push('reintegro1')
  }
  if (draw.pedrea4.includes(lastKStr(n, 4))) matches.push('pedrea4')
  if (draw.pedrea3.includes(lastKStr(n, 3))) matches.push('pedrea3')
  if (draw.pedrea2.includes(lastKStr(n, 2))) matches.push('pedrea2')
  const lastDigit = lastKStr(n, 1)
  if (lastDigit === draw.reintegroE1) matches.push('reintegroE1')
  if (lastDigit === draw.reintegroE2) matches.push('reintegroE2')

  return matches
}

const P_PRIMER = CATEGORY_BY_ID.primer.prize
const P_SEGUNDO = CATEGORY_BY_ID.segundo.prize
const P_APROX1 = CATEGORY_BY_ID.aprox1.prize
const P_APROX2 = CATEGORY_BY_ID.aprox2.prize
const P_CENTENA1 = CATEGORY_BY_ID.centena1.prize
const P_CENTENA2 = CATEGORY_BY_ID.centena2.prize
const P_TERM4 = CATEGORY_BY_ID.term4_1.prize
const P_TERM3 = CATEGORY_BY_ID.term3_1.prize
const P_TERM2 = CATEGORY_BY_ID.term2_1.prize
const P_REINTEGRO1 = CATEGORY_BY_ID.reintegro1.prize
const P_PEDREA4 = CATEGORY_BY_ID.pedrea4.prize
const P_PEDREA3 = CATEGORY_BY_ID.pedrea3.prize
const P_PEDREA2 = CATEGORY_BY_ID.pedrea2.prize
const P_REINTEGROE1 = CATEGORY_BY_ID.reintegroE1.prize
const P_REINTEGROE2 = CATEGORY_BY_ID.reintegroE2.prize

export interface DrawIndex {
  primer: number
  segundo: number
  /** Terminación de pedrea → nº de veces que fue extraída (multiplicidad) */
  pedrea4: Map<number, number>
  pedrea3: Map<number, number>
  pedrea2: Map<number, number>
  reintegroE1: number
  reintegroE2: number
}

/** Cuenta cuántas veces aparece cada terminación (multiplicidad de pedrea) */
function countMap(endings: string[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const s of endings) {
    const n = parseInt(s, 10)
    m.set(n, (m.get(n) ?? 0) + 1)
  }
  return m
}

/**
 * Índice numérico de un sorteo para puntuar carteras grandes sin las
 * asignaciones de string/array de `matchCategories` (relevante cuando se
 * simulan miles de números × decenas de miles de sorteos). Se construye una
 * vez por sorteo y se reutiliza para todas las líneas de la cartera. Las
 * pedreas se guardan como Map terminación→multiplicidad para que una
 * terminación repetida pague varias veces.
 */
export function prepareDrawIndex(draw: Draw): DrawIndex {
  return {
    primer: draw.primer,
    segundo: draw.segundo,
    pedrea4: countMap(draw.pedrea4),
    pedrea3: countMap(draw.pedrea3),
    pedrea2: countMap(draw.pedrea2),
    reintegroE1: parseInt(draw.reintegroE1, 10),
    reintegroE2: parseInt(draw.reintegroE2, 10),
  }
}

/**
 * Equivalente numérico y sin asignaciones de `scoreTicket`, usado en el
 * bucle caliente de la simulación Monte Carlo. Debe producir exactamente el
 * mismo resultado que `scoreTicket(toNumero(n), decimos, draw, config)` para
 * cualquier `n` y sorteo (verificado por test): misma categoría más
 * específica y mismo premio acumulado.
 */
export function scoreNumericFast(
  n: number,
  decimos: number,
  idx: DrawIndex,
  config: DrawConfig,
): ScoreResult {
  const { primer, segundo } = idx
  let premio = 0
  let categoria: CategoryId | null = null
  let rank = 99

  if (n === primer) {
    premio += P_PRIMER
    categoria = 'primer'
    rank = 0
  }
  if (n === segundo) {
    premio += P_SEGUNDO
    if (rank > 1) {
      categoria = 'segundo'
      rank = 1
    }
  }
  if (n === mod(primer - 1, SERIES_SIZE) || n === mod(primer + 1, SERIES_SIZE)) {
    premio += P_APROX1
    if (rank > 2) {
      categoria = 'aprox1'
      rank = 2
    }
  }
  if (n === mod(segundo - 1, SERIES_SIZE) || n === mod(segundo + 1, SERIES_SIZE)) {
    premio += P_APROX2
    if (rank > 3) {
      categoria = 'aprox2'
      rank = 3
    }
  }
  if (Math.floor(n / 100) === Math.floor(primer / 100) && n !== primer) {
    premio += P_CENTENA1
    if (rank > 6) {
      categoria = 'centena1'
      rank = 6
    }
  }
  if (Math.floor(n / 100) === Math.floor(segundo / 100) && n !== segundo) {
    premio += P_CENTENA2
    if (rank > 7) {
      categoria = 'centena2'
      rank = 7
    }
  }
  const lastDigit = n % 10
  if (n !== primer) {
    if (n % 10000 === primer % 10000) {
      premio += P_TERM4
      if (rank > 4) {
        categoria = 'term4_1'
        rank = 4
      }
    }
    if (n % 1000 === primer % 1000) {
      premio += P_TERM3
      if (rank > 8) {
        categoria = 'term3_1'
        rank = 8
      }
    }
    if (n % 100 === primer % 100) {
      premio += P_TERM2
      if (rank > 10) {
        categoria = 'term2_1'
        rank = 10
      }
    }
    if (lastDigit === primer % 10) {
      premio += P_REINTEGRO1
      if (rank > 12) {
        categoria = 'reintegro1'
        rank = 12
      }
    }
  }
  const c4 = idx.pedrea4.get(n % 10000)
  if (c4 !== undefined) {
    premio += P_PEDREA4 * c4
    if (rank > 5) {
      categoria = 'pedrea4'
      rank = 5
    }
  }
  const c3 = idx.pedrea3.get(n % 1000)
  if (c3 !== undefined) {
    premio += P_PEDREA3 * c3
    if (rank > 9) {
      categoria = 'pedrea3'
      rank = 9
    }
  }
  const c2 = idx.pedrea2.get(n % 100)
  if (c2 !== undefined) {
    premio += P_PEDREA2 * c2
    if (rank > 11) {
      categoria = 'pedrea2'
      rank = 11
    }
  }
  if (lastDigit === idx.reintegroE1) {
    premio += P_REINTEGROE1
    if (rank > 13) {
      categoria = 'reintegroE1'
      rank = 13
    }
  }
  if (lastDigit === idx.reintegroE2) {
    premio += P_REINTEGROE2
    if (rank > 14) {
      categoria = 'reintegroE2'
      rank = 14
    }
  }

  if (categoria === null) return { categoria: null, premio: 0 }
  return { categoria, premio: premio * config.prizeMultiplier * decimos }
}

/**
 * Puntúa un número con `decimos` décimos en un sorteo.
 *
 * `categoria` es la más específica acertada según PRIORITY_ORDER (una
 * terminación de 4 cifras nunca se informa también como terminación de 3).
 * `premio` acumula los importes de todos los conceptos compatibles (p. ej.
 * una terminación de 4 cifras cobra también la de 3, la de 2 y el
 * reintegro; un reintegro especial se suma al ordinario si coinciden). Una
 * terminación de pedrea extraída varias veces paga tantas veces como salió.
 * Esta acumulación es la que hace que el retorno del sistema sea
 * exactamente el 70 % de la recaudación en todos los sorteos.
 */
export function scoreTicket(
  numero: string,
  decimos: number,
  draw: Draw,
  config: DrawConfig = DEFAULT_CONFIG,
): ScoreResult {
  const n = parseInt(numero, 10)
  const matches = matchCategories(n, draw)
  if (matches.length === 0) return { categoria: null, premio: 0 }

  const pedreaMult = (endings: string[], k: number) => {
    const t = lastKStr(n, k)
    let c = 0
    for (const e of endings) if (e === t) c++
    return c
  }

  let premio = 0
  for (const id of matches) {
    let mult = 1
    if (id === 'pedrea4') mult = pedreaMult(draw.pedrea4, 4)
    else if (id === 'pedrea3') mult = pedreaMult(draw.pedrea3, 3)
    else if (id === 'pedrea2') mult = pedreaMult(draw.pedrea2, 2)
    premio += CATEGORY_BY_ID[id].prize * mult
  }
  premio *= config.prizeMultiplier * decimos

  const categoria = PRIORITY_ORDER.find((id) => matches.includes(id)) ?? null
  return { categoria, premio }
}
