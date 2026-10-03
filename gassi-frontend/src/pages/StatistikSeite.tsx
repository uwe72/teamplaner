import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { aktivesTeamId } from '../api/client'
import type { Bereich } from '../types'
import CardContainer from '../components/CardContainer'
import StatistikInhalt from '../components/week/StatistikInhalt'

export default function StatistikSeite() {
  const teamId = aktivesTeamId()
  const [bereichId, setBereichId] = useState<number | null>(null)

  const bereicheAbfrage = useQuery<Bereich[]>({
    queryKey: ['bereiche', teamId],
    queryFn: () => api.get(`/teams/${teamId}/bereiche`).then(r => r.data),
    enabled: teamId != null,
  })

  useEffect(() => {
    if (!bereichId && bereicheAbfrage.data) {
      const aktiver = bereicheAbfrage.data.find(b => b.aktiv)
      if (aktiver) setBereichId(aktiver.id)
    }
  }, [bereicheAbfrage.data, bereichId])

  if (teamId == null) {
    return <div className="card p-4 text-sm text-muted">Kein Team-Kontext.</div>
  }

  const aktiveBereiche = (bereicheAbfrage.data ?? []).filter(b => b.aktiv)
  const bereichName = aktiveBereiche.find(b => b.id === bereichId)?.name ?? ''

  return (
    <div className="max-w-5xl">
      <CardContainer title={`Statistik${bereichName ? ` — ${bereichName}` : ''}`}>
        {bereichId == null ? (
          <div className="text-center py-8 text-muted">
            {bereicheAbfrage.isLoading ? 'Laden...' : 'Kein Bereich vorhanden.'}
          </div>
        ) : (
          <StatistikInhalt bereichId={bereichId} />
        )}
      </CardContainer>

      <div className="h-10 md:hidden" />
    </div>
  )
}
