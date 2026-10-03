import axios from 'axios'
import { useSyncExternalStore } from 'react'
import type { AuthAntwort } from '../types'

const AUTH_STORAGE_KEY = 'session'

interface Sitzung {
  token: string
  refreshToken: string
  person: AuthAntwort
}

const listeners = new Set<() => void>()
let store: Sitzung | null

function laden(): Sitzung | null {
  const roh = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!roh) return null
  try {
    return JSON.parse(roh) as Sitzung
  } catch {
    return null
  }
}
store = laden()

export function sitzungLaden(): Sitzung | null {
  return laden()
}

function Benachrichtigen() {
  store = laden()
  listeners.forEach(cb => cb())
}

export function useSitzung(): Sitzung | null {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => { listeners.delete(cb) }
    },
    () => store
  )
}

export function sitzungSpeichern(antwort: AuthAntwort) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    token: antwort.token,
    refreshToken: antwort.refreshToken,
    person: antwort,
  }))
  Benachrichtigen()
}

export function sitzungLoeschen() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem('alsTeam')
  Benachrichtigen()
}

export function sitzungAktualisierenToken(token: string, refreshToken: string) {
  const sitzung = sitzungLaden()
  if (!sitzung) return
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    ...sitzung,
    token,
    refreshToken,
  }))
  Benachrichtigen()
}

export function aktivesTeamId(): number | null {
  const sitzung = sitzungLaden()
  if (!sitzung) return null
  if (sitzung.person.rolle === 'SUPER_ADMIN') {
    const alsTeam = localStorage.getItem('alsTeam')
    if (!alsTeam) return null
    try {
      return Number(JSON.parse(alsTeam).teamId) || null
    } catch {
      return null
    }
  }
  return sitzung.person.teamId
}

export function aktivesTeamName(): string | null {
  const sitzung = sitzungLaden()
  if (!sitzung) return null
  if (sitzung.person.rolle === 'SUPER_ADMIN') {
    const alsTeam = localStorage.getItem('alsTeam')
    if (!alsTeam) return null
    try {
      return (JSON.parse(alsTeam).teamName as string) || null
    } catch {
      return null
    }
  }
  return sitzung.person.teamName
}

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const sitzung = sitzungLaden()
  if (sitzung?.token) {
    config.headers.Authorization = `Bearer ${sitzung.token}`
  }
  return config
})

let refreshLaufend: Promise<boolean> | null = null

async function refreshToken(): Promise<boolean> {
  if (refreshLaufend) return refreshLaufend
  refreshLaufend = (async () => {
    const sitzung = sitzungLaden()
    if (!sitzung?.refreshToken) return false
    try {
      const antwort = await axios.post('/api/auth/refresh', { refreshToken: sitzung.refreshToken })
      sitzungAktualisierenToken(antwort.data.token, antwort.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshLaufend = null
    }
  })()
  return refreshLaufend
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const ursprung = error.config
    if (error.response?.status === 401 && ursprung && !ursprung._retry) {
      ursprung._retry = true
      const frisch = await refreshToken()
      if (frisch) {
        const sitzung = sitzungLaden()
        ursprung.headers.Authorization = `Bearer ${sitzung?.token}`
        return api.request(ursprung)
      }
      sitzungLoeschen()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`
      }
    }
    return Promise.reject(error)
  }
)

let besuchGepingt = false

export function besuchPingen(): void {
  const teamId = aktivesTeamId()
  if (teamId == null || besuchGepingt) return
  besuchGepingt = true
  api.post(`/teams/${teamId}/besuche`).catch(() => {
    besuchGepingt = false
  })
}

export default api
