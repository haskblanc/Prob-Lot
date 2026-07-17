/**
 * Motor de análisis de un Rasca (lotería instantánea).
 *
 * Introduce un mecanismo que ninguna otra pestaña tiene: el **pool que se
 * agota**. Un Rasca es una tirada finita de cartones con una estructura de
 * premios conocida de antemano. Su valor esperado NO es fijo: cambia según
 * cuántos premios queden sin repartir. Si los premios gordos ya han salido,
 * los cartones restantes valen menos; si siguen ahí cuando se han vendido
 * muchos cartones, los restantes valen MÁS — y puede aparecer una ventana de
 * EV positivo.
 *
 * Es el "edge de información" (caso Srivastava, mercados secundarios de
 * lotería en EE. UU.): no bates el azar, bates la falta de información de los
 * demás. En jurisdicciones que publican los premios pendientes, esos momentos
 * son identificables.
 */

export interface RascaPrize {
  /** Importe del premio (€) */
  amount: number
  /** Nº de cartones con este premio en la tirada completa */
  count: number
}

export interface RascaParams {
  /** Precio del cartón (€) */
  precio: number
  /** Nº total de cartones de la tirada */
  totalCartones: number
  /** Estructura de premios (ordenada de mayor a menor importe) */
  premios: RascaPrize[]
  /** Fracción de cartones ya vendidos (0..~0.99) */
  vendidos: number
  /**
   * Nº de premios "gordos" (los de mayor importe) que siguen SIN repartir.
   * Modela la información clave: si los gordos aún no han salido, los cartones
   * que quedan los contienen.
   */
  gordosSinRepartir: number
}

export const DEFAULT_RASCA_PARAMS: RascaParams = {
  precio: 5,
  totalCartones: 1_000_000,
  premios: [
    { amount: 100_000, count: 2 },
    { amount: 1_000, count: 200 },
    { amount: 100, count: 2_000 },
    { amount: 20, count: 30_000 },
    { amount: 10, count: 80_000 },
    { amount: 5, count: 250_000 },
  ],
  vendidos: 0,
  gordosSinRepartir: 2,
}

/** Suma total repartida por la tirada completa (€) */
export function poolTotal(p: RascaParams): number {
  return p.premios.reduce((a, pr) => a + pr.amount * pr.count, 0)
}

/** Valor esperado de un cartón al inicio de la tirada (€) */
export function evInicial(p: RascaParams): number {
  return poolTotal(p) / p.totalCartones
}

/**
 * Valor esperado de los cartones que QUEDAN, dado que se ha vendido la
 * fracción `vendidos` y que `gordosSinRepartir` premios gordos siguen sin
 * salir. Modelo: los premios NO gordos se han repartido en proporción a los
 * cartones vendidos; el premio de mayor importe conserva `gordosSinRepartir`
 * unidades. El resto de su cuenta (si `gordosSinRepartir` < count) se supone
 * repartido proporcionalmente.
 */
export function evRestante(p: RascaParams): number {
  const restantesCartones = p.totalCartones * (1 - p.vendidos)
  if (restantesCartones <= 0) return 0
  const [gordo, ...resto] = p.premios
  const gordosVivos = Math.min(p.gordosSinRepartir, gordo.count)
  // Del premio gordo: los "vivos" siguen enteros; los ya repartidos no cuentan.
  let poolRestante = gordo.amount * gordosVivos
  // Resto de premios: repartidos en proporción a lo vendido.
  for (const pr of resto) poolRestante += pr.amount * pr.count * (1 - p.vendidos)
  return poolRestante / restantesCartones
}

/**
 * Fracción de cartones vendidos a partir de la cual, si los premios gordos
 * siguen sin repartir, el EV de los cartones restantes supera el precio.
 * Resuelve evRestante = precio para `vendidos` (creciente cuando el gordo
 * sigue vivo). Devuelve un valor en [0,1) o null si no llega ni al final.
 */
export function breakEvenVendidos(p: RascaParams): number | null {
  const at = (v: number) => evRestante({ ...p, vendidos: v })
  if (at(0.999) < p.precio) return null
  if (at(0) >= p.precio) return 0
  let lo = 0
  let hi = 0.999
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (at(mid) < p.precio) lo = mid
    else hi = mid
  }
  return hi
}
