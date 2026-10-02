import api from './client'
import type { AuthAntwort, Profil, SystemKonfiguration, Team } from '../types'

export async function login(login: string, passwort: string): Promise<AuthAntwort> {
  const antwort = await api.post<AuthAntwort>('/auth/login', { login, passwort })
  return antwort.data
}

export async function registrieren(login: string, email: string, passwort: string): Promise<AuthAntwort> {
  const antwort = await api.post<AuthAntwort>('/auth/registrieren', { login, email, passwort })
  return antwort.data
}

export async function teamAnlegen(teamName: string): Promise<AuthAntwort> {
  const antwort = await api.post<AuthAntwort>('/auth/team', { teamName })
  return antwort.data
}

export async function loginVerfuegbar(login: string): Promise<boolean> {
  const antwort = await api.get<{ verfuegbar: boolean }>('/auth/check-login', { params: { login } })
  return antwort.data.verfuegbar
}

export async function passwortVergessen(email: string, login?: string) {
  const antwort = await api.post<{ mehrereKonten: boolean; logins: string[] }>(
    '/auth/passwort-vergessen', { email, login })
  return antwort.data
}

export async function loginnameVergessen(email: string) {
  const antwort = await api.post('/auth/loginname-vergessen', { email })
  return antwort.data
}

export async function passwortZuruecksetzen(token: string, neuesPasswort: string) {
  await api.post('/auth/passwort-zuruecksetzen', { token, neuesPasswort })
}

export async function profilLaden(): Promise<Profil> {
  const antwort = await api.get<Profil>('/auth/profil')
  return antwort.data
}

export async function profilAendern(anzeigename: string): Promise<Profil> {
  const antwort = await api.put<Profil>('/auth/profil', { anzeigename })
  return antwort.data
}

export async function passwortAendern(altesPasswort: string, neuesPasswort: string): Promise<Profil> {
  const antwort = await api.put<Profil>('/auth/passwort', { altesPasswort, neuesPasswort })
  return antwort.data
}

export async function eigenesAvatarHochladen(file: File): Promise<Profil> {
  const formData = new FormData()
  formData.append('file', file)
  const antwort = await api.put<Profil>('/auth/me/avatar', formData)
  return antwort.data
}

export async function eigenesAvatarLoeschen(): Promise<void> {
  await api.delete('/auth/me/avatar')
}

export async function avatarHochladenFuer(teamId: number, mitgliedId: number, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  await api.put(`/teams/${teamId}/mitglieder/${mitgliedId}/avatar`, formData)
}

export async function avatarLoeschenFuer(teamId: number, mitgliedId: number): Promise<void> {
  await api.delete(`/teams/${teamId}/mitglieder/${mitgliedId}/avatar`)
}

export async function avatarLaden(teamId: number, mitgliedId: number): Promise<Blob> {
  const antwort = await api.get(`/teams/${teamId}/mitglieder/${mitgliedId}/avatar`, {
    responseType: 'blob',
  })
  return antwort.data as Blob
}

export async function eigenesAvatarLaden(): Promise<Blob> {
  const antwort = await api.get('/auth/me/avatar', { responseType: 'blob' })
  return antwort.data as Blob
}

export async function teamsLaden(): Promise<Team[]> {
  const antwort = await api.get<Team[]>('/super/teams')
  return antwort.data
}

export async function teamAendern(id: number, name: string, aktiv: boolean): Promise<Team> {
  const antwort = await api.put<Team>(`/super/teams/${id}`, { name, aktiv })
  return antwort.data
}

export async function konfigurationLaden(): Promise<SystemKonfiguration> {
  const antwort = await api.get<SystemKonfiguration>('/super/config')
  return antwort.data
}

export async function konfigurationSpeichern(werte: Record<string, string>): Promise<SystemKonfiguration> {
  const antwort = await api.put<SystemKonfiguration>('/super/config', { werte })
  return antwort.data
}
