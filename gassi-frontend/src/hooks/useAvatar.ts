import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  avatarHochladenFuer,
  avatarLaden,
  avatarLoeschenFuer,
  eigenesAvatarHochladen,
  eigenesAvatarLaden,
  eigenesAvatarLoeschen,
} from '../api/auth'
import { aktivesTeamId } from '../api/client'

interface Eintrag {
  url: string
  nutzer: number
  timeout?: number
}

const eintraege = new Map<Blob, Eintrag>()

function urlFuer(blob: Blob | null | undefined): string | null {
  if (!(blob instanceof Blob)) return null
  let eintrag = eintraege.get(blob)
  if (!eintrag) {
    eintrag = { url: URL.createObjectURL(blob), nutzer: 0 }
    eintraege.set(blob, eintrag)
  }
  return eintrag.url
}

function aufnehmen(blob: Blob | null | undefined) {
  if (!(blob instanceof Blob)) return
  const eintrag = eintraege.get(blob)
  if (!eintrag) return
  eintrag.nutzer += 1
  if (eintrag.timeout !== undefined) {
    clearTimeout(eintrag.timeout)
    eintrag.timeout = undefined
  }
}

function freigeben(blob: Blob | null | undefined) {
  if (!(blob instanceof Blob)) return
  const eintrag = eintraege.get(blob)
  if (!eintrag) return
  eintrag.nutzer -= 1
  if (eintrag.nutzer > 0) return
  eintrag.timeout = setTimeout(() => {
    URL.revokeObjectURL(eintrag.url)
    eintraege.delete(blob)
  }, 30000)
}

export function useAvatar(mitgliedId: number | null | undefined, avatarUrl: string | null | undefined) {
  const teamId = aktivesTeamId()
  const eigenes = !!avatarUrl && avatarUrl.startsWith('/api/auth/me')
  const query = useQuery({
    queryKey: ['avatar', teamId, mitgliedId, eigenes],
    queryFn: async () => {
      try {
        if (eigenes) return await eigenesAvatarLaden()
        if (!teamId || !mitgliedId) return null
        return await avatarLaden(teamId, mitgliedId)
      } catch (err) {
        console.error('Avatar konnte nicht geladen werden:', err)
        return null
      }
    },
    enabled: !!mitgliedId && !!avatarUrl && (eigenes || !!teamId),
    staleTime: 1000 * 60 * 5,
  })

  const url = urlFuer(query.data)

  useEffect(() => {
    aufnehmen(query.data)
    return () => freigeben(query.data)
  }, [query.data])

  return { ...query, data: url }
}

export function useEigenesAvatar() {
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()

  const hochladen = useMutation({
    mutationFn: (file: File) => eigenesAvatarHochladen(file),
    onSuccess: () => {
      if (teamId != null) queryClient.invalidateQueries({ queryKey: ['avatar', teamId] })
      queryClient.invalidateQueries({ queryKey: ['plan'] })
      queryClient.invalidateQueries({ queryKey: ['mitglieder'] })
    },
  })

  const loeschen = useMutation({
    mutationFn: () => eigenesAvatarLoeschen(),
    onSuccess: () => {
      if (teamId != null) queryClient.invalidateQueries({ queryKey: ['avatar', teamId] })
      queryClient.invalidateQueries({ queryKey: ['plan'] })
      queryClient.invalidateQueries({ queryKey: ['mitglieder'] })
    },
  })

  return { hochladen, loeschen }
}

export function useAvatarFuerMitglied() {
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()

  const hochladen = useMutation({
    mutationFn: ({ mitgliedId, file }: { mitgliedId: number; file: File }) =>
      avatarHochladenFuer(teamId!, mitgliedId, file),
    onSuccess: (_e, variablen) => {
      if (teamId != null) queryClient.invalidateQueries({ queryKey: ['avatar', teamId, variablen.mitgliedId] })
      queryClient.invalidateQueries({ queryKey: ['mitglieder'] })
      queryClient.invalidateQueries({ queryKey: ['plan'] })
    },
  })

  const loeschen = useMutation({
    mutationFn: (mitgliedId: number) => avatarLoeschenFuer(teamId!, mitgliedId),
    onSuccess: (_e, mitgliedId) => {
      if (teamId != null) queryClient.invalidateQueries({ queryKey: ['avatar', teamId, mitgliedId] })
      queryClient.invalidateQueries({ queryKey: ['mitglieder'] })
      queryClient.invalidateQueries({ queryKey: ['plan'] })
    },
  })

  return { hochladen, loeschen }
}
