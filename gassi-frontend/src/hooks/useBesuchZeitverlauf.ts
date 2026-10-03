import { useQuery } from '@tanstack/react-query'
import { besuchZeitverlaufLaden, besuchZeitverlaufSuperLaden } from '../api/besuche'
import type { BesuchZeitverlauf, BesuchGranularitaet } from '../types'

export default function useBesuchZeitverlauf(teamId: number | null, granularitaet: BesuchGranularitaet) {
  return useQuery<BesuchZeitverlauf>({
    queryKey: ['besuchZeitverlauf', teamId, granularitaet],
    queryFn: () => teamId == null
      ? besuchZeitverlaufSuperLaden(granularitaet)
      : besuchZeitverlaufLaden(teamId, granularitaet),
    enabled: true,
  })
}
