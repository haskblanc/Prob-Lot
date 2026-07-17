import { useState } from 'react'
import NacionalView from './views/NacionalView'
import PrimitivaView from './views/PrimitivaView'
import QuinielaView from './views/QuinielaView'
import QuinigolView from './views/QuinigolView'
import EuromillonesView from './views/EuromillonesView'
import EuroDreamsView from './views/EuroDreamsView'
import RascasView from './views/RascasView'

type Tab = 'nacional' | 'primitiva' | 'euromillones' | 'eurodreams' | 'quiniela' | 'quinigol' | 'rascas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'nacional', label: 'Lotería Nacional' },
  { id: 'primitiva', label: 'La Primitiva' },
  { id: 'euromillones', label: 'Euromillones' },
  { id: 'eurodreams', label: 'EuroDreams' },
  { id: 'quiniela', label: 'La Quiniela' },
  { id: 'quinigol', label: 'El Quinigol' },
  { id: 'rascas', label: 'Rascas' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('nacional')

  return (
    <div className="min-h-screen bg-page text-ink">
      <div className="border-b border-bord bg-surface">
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <h1 className="text-xl font-semibold">Simulador de loterías — probabilidad y valor esperado</h1>
          <nav className="mt-3 flex flex-wrap gap-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === t.id
                    ? 'border-s1 text-ink'
                    : 'border-transparent text-ink2 hover:text-ink'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {tab === 'nacional' && <NacionalView />}
      {tab === 'primitiva' && <PrimitivaView />}
      {tab === 'euromillones' && <EuromillonesView />}
      {tab === 'eurodreams' && <EuroDreamsView />}
      {tab === 'quiniela' && <QuinielaView />}
      {tab === 'quinigol' && <QuinigolView />}
      {tab === 'rascas' && <RascasView />}
    </div>
  )
}
