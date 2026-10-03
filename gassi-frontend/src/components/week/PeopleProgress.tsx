import { useMemo } from 'react'
import type { MitgliedPlanInfo } from '../../types'
import { eindeutigeInitialen } from '../../utils/kuerzel'
import { progressColor } from '../../utils/progress'
import { sortiereMitglieder } from '../../utils/mitgliederSortierung'
import RundAvatar from './RundAvatar'
import { personFarbe } from '../../utils/farben'

interface PeopleProgressProps {
  mitglieder: MitgliedPlanInfo[]
  kumuliertProzent?: Record<number, number>
  ringGroesse?: number
  avatarGroesse?: number
  gap?: number
  padding?: string
  zeigeVorname?: boolean
  onPersonKlick?: (mitglied: MitgliedPlanInfo) => void
}

export default function PeopleProgress({
  mitglieder,
  kumuliertProzent,
  ringGroesse = 50,
  avatarGroesse = 40,
  gap = 10,
  padding = '12px 18px 4px',
  zeigeVorname = false,
  onPersonKlick,
}: PeopleProgressProps) {
  const sortiert = useMemo(() => sortiereMitglieder(mitglieder), [mitglieder])

  const kuerzel = useMemo(
    () => eindeutigeInitialen(sortiert.map(m => m.anzeigename)),
    [sortiert],
  )

  return (
    <div className="flex shrink-0" style={{ padding }}>
      <div className="tp-scroll-x" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <div className="flex" style={{ gap }}>
          {sortiert.map(m => {
            const farbe = progressColor(m.ist, m.soll)
            const grad = farbe ? Math.min(m.ist / m.soll, 1) * 360 : 0
            const fertig = m.soll > 0 && m.ist >= m.soll
            const kumuliert = kumuliertProzent?.[m.id]
            const nichts = m.ist === 0 && m.soll > 0
            const klickbar = !!onPersonKlick
            const badged = fertig ? Math.max(18, Math.round(ringGroesse * 0.36)) : 0
            return (
              <div
                key={m.id}
                className="flex flex-col items-center gap-[3px] shrink-0"
                style={{ minWidth: ringGroesse, cursor: klickbar ? 'pointer' : undefined }}
                title={kumuliert != null
                  ? `${m.anzeigename}: ${m.ist} von ${m.soll} erledigt, kumuliert ${kumuliert}%`
                  : `${m.anzeigename}: ${m.ist} von ${m.soll} erledigt`}
                onClick={klickbar ? () => onPersonKlick?.(m) : undefined}
                role={klickbar ? 'button' : undefined}
                tabIndex={klickbar ? 0 : undefined}
                onKeyDown={klickbar
                  ? (e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onPersonKlick?.(m)
                      }
                    })
                  : undefined}
              >
                <span className="relative" style={{ width: ringGroesse, height: ringGroesse }}>
                  <span
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: ringGroesse,
                      height: ringGroesse,
                      background: farbe
                        ? `conic-gradient(${farbe} ${grad}deg, var(--tp-soft) 0)`
                        : 'var(--tp-soft)',
                    }}
                  >
                    <RundAvatar
                      mitgliedId={m.id}
                      anzeigename={m.anzeigename}
                      avatarUrl={m.avatarUrl}
                      groesse={avatarGroesse}
                      kuerzel={kuerzel.get(m.anzeigename)}
                      farbe={personFarbe(m, mitglieder)}
                      style={{ boxShadow: '0 0 0 2px #fff' }}
                    />
                  </span>
                  {fertig && (
                    <span
                      aria-hidden="true"
                      className="tp-pop absolute rounded-full flex items-center justify-center"
                      style={{
                        width: badged,
                        height: badged,
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
                {zeigeVorname && (
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--tp-muted)' }}
                    className="whitespace-nowrap"
                  >
                    {m.anzeigename.split(/\s+/)[0]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
