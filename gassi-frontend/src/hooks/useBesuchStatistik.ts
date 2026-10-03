import { useQuery } from '@tanstack/react-query'
import { besuchStatistikLaden, besuchStatistikSuperLaden } from '../api/besuche'
import type { BesuchStatistik } from '../types'

export default function useBesuchStatistik(teamId: number | null, von: string, bis: string) {
  return useQuery<BesuchStatistik>({
    queryKey: ['besuchStatistik', teamId, von, bis],
    queryFn: () => teamId == null
      ? besuchStatistikSuperLaden(von, bis)
      : besuchStatistikLaden(teamId, von, bis),
    enabled: true,
  })
}
