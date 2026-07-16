# Simulador de Lotería Nacional

Dashboard interactivo, 100 % client-side, para simular **probabilidades, coste y ganancia potencial** al jugar a la Lotería Nacional española (sorteo ordinario del jueves, con modo alternativo del sábado).

Construye distintas "carteras" de números —un número suelto, un billete entero, una serie consecutiva, números dispersos o una cartera personalizada— y compara en tiempo real su coste, probabilidad de premio, valor esperado y distribución simulada de resultados.

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
- la pedrea se genera **sin colisiones** dentro de cada tamaño ni con las terminaciones del 1er y 2º premio (las colisiones raras se resuelven regenerando la combinación).

Con esto, cada categoría reclama exactamente su `count` nominal en cualquier sorteo y el pago total por serie es siempre 210.000 € (hay un test que puntúa la serie completa y lo comprueba). A efectos de **conteo e informe**, cada número aparece solo en su categoría más específica (`scoreTicket` devuelve esa categoría): una terminación de 4 cifras nunca se cuenta también como terminación de 3.

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
- la coherencia de `generateDraw` (pedrea sin colisiones), los casos de `scoreTicket`, la probabilidad exacta frente a Monte Carlo y el cumplimiento del suelo garantizado.

## Estructura

```
src/
  engine/          # lógica pura, testeable, sin dependencias de UI
    config.ts      # PRIZE_CATEGORIES, configuración jueves/sábado
    lotteryEngine.ts  # generateDraw, matchCategories, scoreTicket
    probability.ts # probabilidad exacta e hipergeométrica
    portfolio.ts   # constructores de carteras, coste, suelo garantizado
    simulation.ts  # Monte Carlo
    rng.ts         # PRNG con semilla (mulberry32)
    csv.ts         # exportación
  worker/simWorker.ts   # simulación en Web Worker
  hooks/useSimulations.ts
  components/      # UI (React + Tailwind + Recharts)
```
