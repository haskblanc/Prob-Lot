# Simulador de loterías — probabilidad y valor esperado

Dashboard interactivo, 100 % client-side, para analizar **probabilidades, coste y ganancia potencial** de loterías españolas. Dos pestañas:

- **Lotería Nacional** (sorteo ordinario del jueves, con modo del sábado): construye "carteras" de números —suelto, billete, serie consecutiva, dispersos o personalizada— y compara coste, probabilidad de premio, valor esperado y distribución simulada (Monte Carlo en Web Worker).
- **La Primitiva** (6/49): análisis exacto por combinatoria (sin Monte Carlo) del juego parimutuel con bote acumulado, incluido el **punto crítico** donde comprar todas las combinaciones tiene valor esperado positivo (la estrategia de Stefan Mandel / Cash WinFall).

El contraste entre ambas es el hilo del análisis: la Lotería Nacional tiene reparto fijo (70 %, sin ventaja posible por ninguna estrategia), mientras que La Primitiva, por su bote, sí tiene un umbral matemático explotable.

Sitio publicado: https://haskblanc.github.io/Prob-Lot/

## Ejecutar

```bash
npm install
npm run dev       # desarrollo
npm run build     # producción (dist/)
npx vitest run    # tests unitarios
```

Sin backend: todo corre en el navegador. Las simulaciones Monte Carlo se ejecutan en un **Web Worker** para no bloquear la UI.

## Stack

- React 19 + Vite + TypeScript
- TailwindCSS 4
- Recharts (histograma)
- Vitest (tests del motor)
- Motor de simulación en módulos TS puros (`src/engine/`), separado de la UI

## Modelo del sorteo (jueves)

- Cada serie tiene 100.000 números (00000–99999); décimo = 3 €, billete = 10 décimos = 30 €.
- 15 categorías de premio (constante `PRIZE_CATEGORIES` en `src/engine/config.ts`), cuya suma de números premiados es exactamente **41.050** por serie (verificado por test).
- El sorteo del sábado usa décimo de 6 € y todos los premios ×2 (1er premio 60.000 €/décimo).

### La propiedad del 70 %

El 70 % de la recaudación se destina a premios: la suma de `count × prize` de la tabla es 210.000 € por serie, el 70 % de los 300.000 € recaudados. Para que esta propiedad se cumpla **exactamente en todos los sorteos** (y el EV de cualquier décimo sea 2,10 €), el motor paga de forma **acumulativa los conceptos compatibles**, igual que hace el sorteo real con conceptos distintos:

- una terminación de 4 cifras cobra también la de 3, la de 2 y el reintegro (75 + 15 + 6 + 3 €);
- los reintegros especiales se suman al ordinario y entre sí si coinciden las cifras;
- las extracciones de pedrea son independientes y **pueden repetirse** entre sí, igual que en el sorteo real (en el sorteo del 16/07/26 el 150 salió dos veces en la pedrea de 3 cifras y el 64 dos veces en la de 2). Una terminación extraída *k* veces paga *k* veces a quien la lleva. Sí se excluyen las terminaciones del 1er/2º premio, que ya se pagan en su propia categoría.

Con esto, el pago total por serie es **siempre exactamente 210.000 €** (cada tamaño de pedrea tiene un nº fijo de extracciones y cada una reparte su importe completo; una repetición concentra el dinero en menos números distintos, pero no cambia el total). Un test recorre la serie completa y verifica que cada categoría paga `count × prize` y el total 210.000 €. A efectos de **conteo e informe**, cada número aparece solo en su categoría más específica (`scoreTicket` devuelve esa categoría): una terminación de 4 cifras nunca se cuenta también como terminación de 3.

> Nota de diseño: si en lugar de acumular se pagara únicamente la categoría más específica, el retorno del sistema quedaría estructuralmente por debajo del 70 % (≈64–66 %), rompiendo la propiedad matemática que este dashboard quiere ilustrar. Por eso el motor acumula conceptos compatibles.

## Qué muestra el dashboard

Para la cartera activa:

- **Coste total** y **valor esperado teórico** (= coste × 0,70, siempre).
- **P(al menos un premio)**: exacta para un número suelto o billete (conteo directo sobre los 100.000 valores del 1er/2º premio + factores analíticos de pedrea y reintegros), hipergeométrica para números dispersos, garantizada (=1) para series consecutivas ≥ 10, y Monte Carlo en el resto.
- **Simulación Monte Carlo** configurable (1.000 / 10.000 / 100.000 sorteos) con semilla opcional reproducible: % de sorteos con premio, ganancia neta media y mediana, percentiles p10/p50/p90/p99, histograma de resultados y desglose por categoría.
- **Suelo garantizado** de las series consecutivas: en cualquier ventana de N consecutivos cada cifra final aparece ≥ ⌊N/10⌋ veces, cada terminación de 2 cifras ≥ ⌊N/100⌋, etc. Una serie de 100 números (300 €) garantiza como mínimo 150 € (30 reintegros + 10 terminaciones de 2 cifras).
- **Comparador de estrategias** (2–4 carteras, mismos sorteos simulados para todas): el retorno esperado es siempre ≈70 % del coste; lo que cambia radicalmente entre estrategias es la varianza y las garantías.
- **Exportación a CSV** de los resultados de la simulación.

## Tests

`src/engine/lotteryEngine.test.ts` verifica, entre otros:

- (a) que las categorías suman 41.050 números premiados por serie —tanto en la tabla como contando los 100.000 números de una serie en sorteos generados—;
- (b) que el valor esperado simulado converge a ~70 % del coste al aumentar las iteraciones, y que el pago a una serie completa es **exactamente** 210.000 € en todos los sorteos;
- la coherencia de `generateDraw` (nº fijo de extracciones de pedrea, repeticiones permitidas, pago doble de una terminación repetida), los casos de `scoreTicket`, la probabilidad exacta frente a Monte Carlo y el cumplimiento del suelo garantizado.

`src/engine/primitiva.test.ts` verifica La Primitiva: C(49,6) = 13.983.816, los conteos combinatorios por categoría, que la suma de aportaciones al EV coincide con `singleBetEV`, y que el **bote crítico** idealizado es (1 − ratio) × coste (comprando todo, ganancia neta ~0 justo en ese bote).

## La Primitiva: el "punto crítico"

Mientras la Lotería Nacional reparte un porcentaje fijo (comprar toda la serie garantiza perder el 30 %), La Primitiva es **parimutuel con bote**: el EV de una apuesta se reduce a `ratio · precio + bote / N`. Sin bote recuperas en media el ratio de premios (~55 %) y **ninguna combinación tiene ventaja**. El bote es la única palanca.

La estrategia de Stefan Mandel / Cash WinFall (comprar las 13.983.816 combinaciones) captura el bote de forma **determinista**: ganas seguro el gordo, toda la 5ª categoría fija (246.820 × 8 € = 1.974.560 €) y una fracción `M/N` de cada bolsa y del bote. En el caso idealizado el umbral de rentabilidad es (1 − ratio) × coste ≈ 6,3 M €; con más jugadores compartiendo, sube. Las probabilidades son combinatoria exacta (sin ruido estadístico) y los importes de premio y el bote son parámetros editables.

## Estructura

```
src/
  engine/          # lógica pura, testeable, sin dependencias de UI
    config.ts      # PRIZE_CATEGORIES, configuración jueves/sábado
    lotteryEngine.ts  # generateDraw, matchCategories, scoreTicket
    probability.ts # probabilidad exacta e hipergeométrica
    portfolio.ts   # constructores de carteras, coste, suelo garantizado
    simulation.ts  # Monte Carlo (Lotería Nacional)
    primitiva.ts   # La Primitiva: combinatoria exacta, EV, bote crítico
    rng.ts         # PRNG con semilla (mulberry32)
    csv.ts         # exportación
  worker/simWorker.ts   # simulación en Web Worker
  hooks/useSimulations.ts
  views/           # NacionalView, PrimitivaView (una por pestaña)
  components/      # UI compartida (React + Tailwind + Recharts)
```
