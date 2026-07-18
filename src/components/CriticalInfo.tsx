import { Card, SectionTitle } from './ui'

export interface CriticalItem {
  titulo: string
  texto: string
  /** 'si' = estrategia con efecto real · 'no' = no funciona / imposible · 'ojo' = matiz o aviso */
  tipo: 'si' | 'no' | 'ojo'
}

const BADGE: Record<CriticalItem['tipo'], { label: string; cls: string }> = {
  si: { label: 'FUNCIONA', cls: 'text-good border-good/40' },
  no: { label: 'NO FUNCIONA', cls: 'text-bad border-bad/40' },
  ojo: { label: 'MATIZ', cls: 'text-ink2 border-bord' },
}

/**
 * Sección "cómo intentar ganar" de cada sorteo: las estrategias reales y
 * legales, con su veredicto honesto. Común a todas las pestañas.
 */
export function CriticalInfo({ items }: { items: CriticalItem[] }) {
  return (
    <Card>
      <SectionTitle sub="Las estrategias reales (y legales) que alguien puede intentar en este juego, con su veredicto honesto.">
        Información crítica: cómo intentar ganar
      </SectionTitle>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.titulo} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <span
              className={`inline-block w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:mt-0.5 sm:w-28 sm:text-center ${BADGE[item.tipo].cls}`}
            >
              {BADGE[item.tipo].label}
            </span>
            <p className="text-sm leading-relaxed text-ink2">
              <strong className="text-ink">{item.titulo}.</strong> {item.texto}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
