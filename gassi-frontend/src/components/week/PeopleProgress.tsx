import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MitgliedPlanInfo } from '../../types'
import { eindeutigeInitialen } from '../../utils/kuerzel'
import { progressColor } from '../../utils/progress'
import RundAvatar from './RundAvatar'

export default function PeopleProgress({
  mitglieder,
  eigeneId,
  bereichId,
}: {
  mitglieder: MitgliedPlanInfo[]
  eigeneId: number
  bereichId: number | null
}) {
  const navigate = useNavigate()
  const sortiert = useMemo(() => [...mitglieder].sort((a, b) => {
    if (a.id === eigeneId) return -1
    if (b.id === eigeneId) return 1
    return a.anzeigename.localeCompare(b.anzeigename)
  }), [mitglieder, eigeneId])

  const kuerzel = useMemo(
    () => eindeutigeInitialen(sortiert.map(m => m.anzeigename)),
    [sortiert],
  )

  function statistikOeffnen(personId?: number) {
    const ziel = new URLSearchParams()
    if (bereichId != null) ziel.set('bereich', String(bereichId))
    if (personId != null) ziel.set('person', String(personId))
    navigate(`/statistik${ziel.size > 0 ? `?${ziel.toString()}` : ''}`)
  }

  return (
    <div className="flex shrink-0" style={{ padding: '12px 18px 4px' }}>
      <div className="tp-scroll-x" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <div className="flex gap-3.5">
          {sortiert.map(m => {
            const farbe = progressColor(m.ist, m.soll)
            const grad = farbe ? Math.min(m.ist / m.soll, 1) * 360 : 0
            const fertig = m.soll > 0 && m.ist >= m.soll
            const nichts = m.ist === 0 && m.soll > 0
            return (
              <button
                key={m.id}
                type="button"
                className="flex flex-col items-center gap-[3px] shrink-0 p-0 bg-transparent border-0"
                style={{ minWidth: 50 }}
                aria-label={`${m.anzeigename}: ${m.ist} von ${m.soll} erledigt`}
                onClick={() => statistikOeffnen(m.id)}
              >
                <span className="relative" style={{ width: 50, height: 50 }}>
                  <span
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 50,
                      height: 50,
                      background: farbe
                        ? `conic-gradient(${farbe} ${grad}deg, var(--tp-soft) 0)`
                        : 'var(--tp-soft)',
                    }}
                  >
                    <RundAvatar
                      mitgliedId={m.id}
                      anzeigename={m.anzeigename}
                      avatarUrl={m.avatarUrl}
                      groesse={40}
                      kuerzel={kuerzel.get(m.anzeigename)}
                      style={{ boxShadow: '0 0 0 2px #fff' }}
                    />
                  </span>
                  {fertig && (
                    <span
                      aria-hidden="true"
                      className="tp-pop absolute rounded-full flex items-center justify-center"
                      style={{
                        width: 18,
                        height: 18,
                        right: -2,
                        bottom: -2,
                        backgroundColor: 'var(--tp-prog-done)',
                        border: '2px solid #fff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.2L4.2 7.4L8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: nichts ? 900 : 800,
                    color: nichts ? 'var(--tp-prog-low)' : 'var(--tp-muted)',
                  }}
                  className="tabular-nums whitespace-nowrap"
                >
                  {m.ist}/{m.soll}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
