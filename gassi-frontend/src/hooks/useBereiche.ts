import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { aktivesTeamId } from '../api/client'
import type { Bereich } from '../types'

export default function useBereiche() {
  const teamId = aktivesTeamId()
  return useQuery<Bereich[]>({
    queryKey: ['bereiche', teamId],
    queryFn: () => api.get(`/teams/${teamId}/bereiche`).then(r => r.data),
    enabled: teamId != null,
  })
}
