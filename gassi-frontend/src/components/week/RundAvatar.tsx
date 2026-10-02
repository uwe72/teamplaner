import { useAvatar } from '../../hooks/useAvatar'
import { initialen } from '../../utils/initialen'
import type { CSSProperties } from 'react'

export default function RundAvatar({
  mitgliedId,
  anzeigename,
  avatarUrl,
  groesse,
  kuerzel,
  fallbackBg = 'var(--tp-photo)',
  fallbackTextFarbe = '#fff',
  fallbackTextGroesse = 24,
  ring,
  schatten,
  className,
  style,
}: {
  mitgliedId: number | null | undefined
  anzeigename: string
  avatarUrl?: string | null
  groesse: number
  kuerzel?: string
  fallbackBg?: string
  fallbackTextFarbe?: string
  fallbackTextGroesse?: number
  ring?: string
  schatten?: string
  className?: string
  style?: CSSProperties
}) {
  const { data: bildUrl } = useAvatar(mitgliedId ?? null, avatarUrl ?? null)
  const text = kuerzel ?? initialen(anzeigename)
  const faktor = text.length <= 2 ? 1 : text.length === 3 ? 0.62 : text.length === 4 ? 0.5 : 0.42

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none ${className ?? ''}`}
      style={{
        width: groesse,
        height: groesse,
        backgroundColor: fallbackBg,
        boxShadow: schatten ?? (ring ? `0 0 0 ${ring}` : undefined),
        ...style,
      }}
      title={anzeigename}
    >
      {bildUrl ? (
        <img src={bildUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            color: fallbackTextFarbe,
            fontSize: Math.round(fallbackTextGroesse * faktor),
            fontWeight: 900,
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
