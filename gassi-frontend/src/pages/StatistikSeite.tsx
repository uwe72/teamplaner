import { useState } from 'react'
import BesuchePanel from '../components/BesuchePanel'
import Tabs from '../components/Tabs'

type Ansicht = 'besuche'

export default function StatistikSeite() {
  const [ansicht, setAnsicht] = useState<Ansicht>('besuche')

  return (
    <div className="max-w-5xl">
      <Tabs
        items={[{ key: 'besuche', label: 'Besuche' }]}
        active={ansicht}
        onChange={key => setAnsicht(key as Ansicht)}
      />

      {ansicht === 'besuche' && <BesuchePanel />}

      <div className="h-10 md:hidden" />
    </div>
  )
}
