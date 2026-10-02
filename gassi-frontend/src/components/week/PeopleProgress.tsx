import type { MitgliedPlanInfo } from '../../types'
import RundAvatar from './RundAvatar'

export default function PeopleProgress({
  mitglieder,
  eigeneId,
}: {
  mitglieder: MitgliedPlanInfo[]
  eigeneId: number
}) {
  const sortiert = [...mitglieder].sort((a, b) => {
    if (a.id === eigeneId) return -1
    if (b.id === eigeneId) return 1
    return a.anzeigename.localeCompare(b.anzeigename)
  })

  return (
    <div
      className="flex gap-3.5 tp-scroll-x shrink-0"
      style={{ padding: '12px 18px 4px' }}
    >
      {sortiert.map(m => {
        const grad = m.soll > 0 ? Math.min(100, (m.ist / m.soll) * 100) * 3.6 : 360
        return (
          <div key={m.id} className="flex flex-col items-center gap-[3px] shrink-0" style={{ minWidth: 48 }}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 48,
                height: 48,
                background: `conic-gradient(var(--tp-accent) ${grad}deg, var(--tp-soft) 0)`,
              }}
              aria-label={`${m.anzeigename}: ${m.ist} von ${m.soll} Runden`}
            >
              <RundAvatar
                mitgliedId={m.id}
                anzeigename={m.anzeigename}
                avatarUrl={m.avatarUrl}
                groesse={40}
                style={{ boxShadow: '0 0 0 2px #fff' }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--tp-muted)' }} className="tabular-nums whitespace-nowrap">
              {m.ist}/{m.soll}
            </span>
          </div>
        )
      })}
    </div>
  )
}
