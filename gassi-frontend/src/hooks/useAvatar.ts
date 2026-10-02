import { useEffect, useState } from 'react'
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

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (query.data instanceof Blob) {
      const objectUrl = URL.createObjectURL(query.data)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setUrl(null)
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
