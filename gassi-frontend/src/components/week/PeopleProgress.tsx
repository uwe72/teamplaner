import { useMemo } from 'react'
import type { MitgliedPlanInfo } from '../../types'
import { eindeutigeInitialen } from '../../utils/kuerzel'
import { progressColor } from '../../utils/progress'
import { sortiereMitglieder } from '../../utils/mitgliederSortierung'
import { LABELS } from '../../utils/texte'
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
  verteilen?: boolean
  nameImKreis?: boolean
  horizontal?: boolean
  kachel?: boolean
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
  verteilen = false,
  nameImKreis = false,
  horizontal = false,
  kachel = false,
  onPersonKlick,
}: PeopleProgressProps) {
  const sortiert = useMemo(() => sortiereMitglieder(mitglieder), [mitglieder])

  const kuerzel = useMemo(
    () => eindeutigeInitialen(sortiert.map(m => m.anzeigename)),
    [sortiert],
  )

  if (kachel) {
    return (
      <div className="flex w-full" style={{ padding, paddingBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="flex"
            style={{ gap, paddingTop: 2, paddingBottom: 8, justifyContent: verteilen ? 'space-around' : undefined, flexWrap: 'wrap' }}
          >
            {sortiert.map(m => (
              <PersonKachel
                key={m.id}
                mitglied={m}
                mitglieder={mitglieder}
                kuerzel={kuerzel.get(m.anzeigename)}
                kumuliert={kumuliertProzent?.[m.id]}
                ringGroesse={ringGroesse}
                onKlick={onPersonKlick ? () => onPersonKlick(m) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full" style={{ padding }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="flex"
          style={{ gap, justifyContent: verteilen ? 'space-around' : undefined, flexWrap: 'wrap' }}
        >
          {sortiert.map(m => {
            const farbe = progressColor(m.ist, m.soll)
            const grad = farbe ? Math.min(m.ist / m.soll, 1) * 360 : 0
            const fertig = m.soll > 0 && m.ist >= m.soll
            const kumuliert = kumuliertProzent?.[m.id]
            const nichts = m.ist === 0 && m.soll > 0
            const klickbar = !!onPersonKlick
            const badged = fertig ? Math.max(18, Math.round(ringGroesse * 0.36)) : 0
            if (horizontal) {
              return (
                <div
                  key={m.id}
                  className="flex items-center shrink-0"
                  style={{ gap: 10, cursor: klickbar ? 'pointer' : undefined }}
                  title={kumuliert != null
                    ? `${m.anzeigename}: ${m.ist} von ${m.soll} ${LABELS.unitVonPlural} erledigt, kumuliert ${kumuliert}%`
                    : `${m.anzeigename}: ${m.ist} von ${m.soll} ${LABELS.unitVonPlural} erledigt`}
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
                  <span
                    className="truncate"
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: 'var(--tp-ink)',
                      maxWidth: 96,
                    }}
                  >
                    {m.anzeigename}
                  </span>
                  <span className="relative shrink-0" style={{ width: ringGroesse, height: ringGroesse }}>
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
                        fallbackTextGroesse={avatarGroesse * 0.36}
                        style={{ boxShadow: '0 0 0 2px var(--tp-surface)' }}
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
                          border: '2px solid var(--tp-surface)',
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
                    className="tabular-nums whitespace-nowrap"
                    style={{
                      fontSize: 12,
                      fontWeight: nichts ? 900 : 800,
                      color: nichts ? 'var(--tp-prog-low)' : 'var(--tp-muted)',
                    }}
                  >
                    {m.ist}/{m.soll}
                  </span>
                </div>
              )
            }
            return (
              <div
                key={m.id}
                className="flex flex-col items-center gap-[3px] shrink-0"
                style={{ minWidth: ringGroesse, cursor: klickbar ? 'pointer' : undefined }}
                title={kumuliert != null
                  ? `${m.anzeigename}: ${m.ist} von ${m.soll} ${LABELS.unitVonPlural} erledigt, kumuliert ${kumuliert}%`
                  : `${m.anzeigename}: ${m.ist} von ${m.soll} ${LABELS.unitVonPlural} erledigt`}
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
                      kuerzel={nameImKreis ? m.anzeigename : kuerzel.get(m.anzeigename)}
                      farbe={personFarbe(m, mitglieder)}
                      fallbackTextGroesse={avatarGroesse * 0.36}
                      style={{ boxShadow: '0 0 0 2px var(--tp-surface)' }}
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
                        border: '2px solid var(--tp-surface)',
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
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: 'var(--tp-muted)',
                      textAlign: 'center',
                    }}
                    className="whitespace-nowrap"
                  >
                    {m.anzeigename}
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

function PersonKachel({
  mitglied,
  mitglieder,
  kuerzel,
  kumuliert,
  ringGroesse,
  onKlick,
}: {
  mitglied: MitgliedPlanInfo
  mitglieder: MitgliedPlanInfo[]
  kuerzel?: string
  kumuliert?: number
  ringGroesse: number
  onKlick?: () => void
}) {
  const nichts = mitglied.ist === 0 && mitglied.soll > 0
  const fortschritt = mitglied.soll > 0 ? Math.min(mitglied.ist / mitglied.soll, 1) : 0
  const grad = fortschritt * 360
  const farbe = progressColor(mitglied.ist, mitglied.soll)
  const fertig = mitglied.soll > 0 && mitglied.ist >= mitglied.soll
  const ueberschritten = mitglied.ist > mitglied.soll
  const differenz = mitglied.ist - mitglied.soll

  const ring = (
    <span
      className="relative shrink-0 rounded-full flex items-center justify-center"
      style={{
        width: ringGroesse + 10,
        height: ringGroesse + 10,
        padding: 5,
        background: farbe
          ? `conic-gradient(${farbe} ${grad}deg, var(--tp-soft) 0)`
          : 'var(--tp-soft)',
      }}
    >
      <RundAvatar
        mitgliedId={mitglied.id}
        anzeigename={mitglied.anzeigename}
        avatarUrl={mitglied.avatarUrl}
        groesse={ringGroesse}
        kuerzel={kuerzel}
        farbe={personFarbe(mitglied, mitglieder)}
        style={{ width: ringGroesse, height: ringGroesse, boxShadow: '0 0 0 2px var(--tp-surface)' }}
      />
      {fertig && (
        <span
          aria-hidden="true"
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: 18,
            height: 18,
            right: -2,
            bottom: -2,
            backgroundColor: 'var(--tp-prog-done)',
            border: '2px solid var(--tp-surface)',
            boxSizing: 'border-box',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.2L4.2 7.4L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </span>
  )

  const inhalt = (
    <span className="flex items-center" style={{ gap: 10 }}>
      {ring}
      <span className="flex flex-col min-w-0" style={{ gap: 2 }}>
        <span
          className="min-w-0"
          style={{ fontSize: 16, fontWeight: 700, color: 'var(--tp-ink)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 132 }}
        >
          {mitglied.anzeigename}
        </span>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 6 }}>
          <span
            className="tabular-nums"
            style={{ fontSize: 14, fontWeight: nichts ? 900 : 700, color: nichts ? 'var(--tp-prog-low)' : 'var(--tp-muted)' }}
          >
            {`${mitglied.ist} von ${mitglied.soll}`}
          </span>
          {ueberschritten && (
            <span
              className="rounded-full tabular-nums"
              style={{
                padding: '1px 6px',
                backgroundColor: 'var(--tp-soft)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--tp-ink)',
              }}
            >
              {`+${differenz}`}
            </span>
          )}
        </span>
      </span>
    </span>
  )

  const titel = kumuliert != null
    ? `${mitglied.anzeigename}: ${mitglied.ist} von ${mitglied.soll} ${LABELS.unitVonPlural} erledigt, kumuliert ${kumuliert}%`
    : `${mitglied.anzeigename}: ${mitglied.ist} von ${mitglied.soll} ${LABELS.unitVonPlural} erledigt`

  if (onKlick) {
    return (
      <button
        type="button"
        className="flex flex-col items-center shrink-0"
        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        title={titel}
        onClick={onKlick}
      >
        {inhalt}
      </button>
    )
  }
  return (
    <div
      className="flex flex-col items-center shrink-0"
      title={titel}
    >
      {inhalt}
    </div>
  )
}
