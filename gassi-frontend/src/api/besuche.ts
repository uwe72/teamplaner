import api from './client'
import type { BesuchStatistik, BesuchZeitverlauf, BesuchGranularitaet, BesuchTeam } from '../types'

export async function besuchStatistikLaden(teamId: number, von: string, bis: string): Promise<BesuchStatistik> {
  const antwort = await api.get<BesuchStatistik>(`/teams/${teamId}/statistik/besuche`, { params: { von, bis } })
  return antwort.data
}

export async function besuchZeitverlaufLaden(teamId: number, granularitaet: BesuchGranularitaet): Promise<BesuchZeitverlauf> {
  const antwort = await api.get<BesuchZeitverlauf>(`/teams/${teamId}/statistik/besuche/zeitverlauf`, {
    params: { granularitaet },
  })
  return antwort.data
}

export async function besuchStatistikSuperLaden(von: string, bis: string): Promise<BesuchStatistik> {
  const antwort = await api.get<BesuchStatistik>('/super/besuche', { params: { von, bis } })
  return antwort.data
}

export async function besuchZeitverlaufSuperLaden(granularitaet: BesuchGranularitaet): Promise<BesuchZeitverlauf> {
  const antwort = await api.get<BesuchZeitverlauf>('/super/besuche/zeitverlauf', { params: { granularitaet } })
  return antwort.data
}

export async function besucheJeTeamLaden(von: string, bis: string): Promise<BesuchTeam[]> {
  const antwort = await api.get<BesuchTeam[]>('/super/besuche/teams', { params: { von, bis } })
  return antwort.data
}

export async function besuchPingen(teamId: number): Promise<void> {
  await api.post(`/teams/${teamId}/besuche`)
}
