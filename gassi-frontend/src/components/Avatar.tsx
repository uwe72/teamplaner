import { useAvatar } from '../hooks/useAvatar'
import { initialen } from '../utils/initialen'

const GROESSEN: Record<string, string> = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-[11px]',
  xl: 'w-8 h-8 text-[12px]',
  xxl: 'w-12 h-12 text-[18px]',
  lg: 'w-16 h-16 text-xl',
}

export default function Avatar({
  mitgliedId,
  anzeigename,
  avatarUrl,
  farbe,
  groesse = 'md',
  className,
}: {
  mitgliedId: number | null | undefined
  anzeigename: string
  avatarUrl?: string | null
  farbe?: string | null
  groesse?: keyof typeof GROESSEN
  className?: string
}) {
  const { data: bildUrl } = useAvatar(mitgliedId ?? null, avatarUrl ?? null)
  const text = initialen(anzeigename)

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 font-semibold select-none ${bildUrl || !farbe ? 'bg-accent-muted text-accent' : 'text-white'} ${className ?? GROESSEN[groesse]}`}
      style={{
        boxShadow: bildUrl || !farbe
          ? '0 0 0 1.5px var(--color-border-hover)'
          : `0 0 0 1.5px ${farbe}`,
        backgroundColor: bildUrl ? undefined : farbe ?? undefined,
      }}
      title={anzeigename}
    >
      {bildUrl ? (
        <img src={bildUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">{text}</span>
      )}
    </span>
  )
}
