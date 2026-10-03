import { useQuery } from '@tanstack/react-query'
import { besucheJeTeamLaden } from '../api/besuche'
import type { BesuchTeam } from '../types'

export default function useBesucheJeTeam(von: string, bis: string) {
  return useQuery<BesuchTeam[]>({
    queryKey: ['besucheJeTeam', von, bis],
    queryFn: () => besucheJeTeamLaden(von, bis),
  })
}
