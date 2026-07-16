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
 * Genera `howMany` combinaciones de `digits` cifras finales, todas distintas
 * entre sí y sin colisionar con las terminaciones de los números premiados
 * (`banned`). Las colisiones raras se resuelven volviendo a generar.
 */
function drawEndings(rng: Rng, howMany: number, digits: number, banned: Iterable<number>): string[] {
  const used = new Set<number>(banned)
  const result: string[] = []
  const space = 10 ** digits
  while (result.length < howMany) {
    const candidate = randInt(rng, space)
    if (used.has(candidate)) continue
    used.add(candidate)
    result.push(String(candidate).padStart(digits, '0'))
  }
  return result
}

/**
 * Genera un sorteo completo y coherente.
 *
 * Las combinaciones de pedrea de cada tamaño se generan sin colisiones entre
 * sí ni con la terminación correspondiente del 1er y 2º premio (si una
 * combinación coincide con la de un número premiado se vuelve a generar).
 * Los reintegros especiales son cifras independientes, sin restricción.
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
 * Devuelve todas las categorías que corresponden al número `n` en el sorteo
 * `draw`, según la definición nominal de cada una (las de la tabla
 * PRIZE_CATEGORIES). Cada categoría reclama exactamente su `count` nominal
 * de números por serie, para cualquier sorteo.
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

/**
 * Puntúa un número con `decimos` décimos en un sorteo.
 *
 * `categoria` es la más específica acertada según PRIORITY_ORDER (una
 * terminación de 4 cifras nunca se informa también como terminación de 3).
 * `premio` acumula los importes de todos los conceptos compatibles (p. ej.
 * una terminación de 4 cifras cobra también la de 3, la de 2 y el
 * reintegro; un reintegro especial se suma al ordinario si coinciden).
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

  let premio = 0
  for (const id of matches) premio += CATEGORY_BY_ID[id].prize
  premio *= config.prizeMultiplier * decimos

  const categoria = PRIORITY_ORDER.find((id) => matches.includes(id)) ?? null
  return { categoria, premio }
}
