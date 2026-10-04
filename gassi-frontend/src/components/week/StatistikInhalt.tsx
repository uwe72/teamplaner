import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import { aktivesTeamId } from '../../api/client'
import type { Statistik, StatistikZeile } from '../../types'
import { LABELS } from '../../utils/texte'
import { initialen } from '../../utils/initialen'
import { prozentAusZuteilungen, prozentDeutsch, type StatistikVerteilung } from '../../utils/statistik'
import { progressColor } from '../../utils/progress'
import RundAvatar from './RundAvatar'

export default function StatistikInhalt({
  bereichId,
  nebeneinander = false,
  gestapelt = false,
}: {
  bereichId: number
  nebeneinander?: boolean
  gestapelt?: boolean
}) {
  const teamId = aktivesTeamId()

  const statistikAbfrage = useQuery<Statistik>({
    queryKey: ['statistik', teamId, bereichId],
    queryFn: () => api.get(`/teams/${teamId}/statistik`, {
      params: { bereichId },
    }).then(r => r.data),
    enabled: teamId != null,
  })

  if (teamId == null) {
    return <div className="p-4 text-sm text-muted">Kein Team-Kontext.</div>
  }

  if (!nebeneinander && !gestapelt) {
    return null
  }

  const daten = statistikAbfrage.data
  const sollZeilen = (daten?.zielerreichung ?? []).filter(z => z.moeglich > 0)
  const laedt = statistikAbfrage.isLoading || !daten
  const zeigeSollAbschnitt = laedt || sollZeilen.length > 0

  return (
    <div className={gestapelt ? 'grid items-start gap-8' : 'grid items-start gap-8 lg:grid-cols-2'}>
      <div>
        <div className="flex flex-wrap items-baseline" style={{ columnGap: 10, rowGap: 2 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--tp-ink)' }}>
            Gesamtanteil
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-muted)' }}>
            Anteil an allen {LABELS.unitVonPlural} seit Beginn
          </p>
        </div>
        <div style={{ marginTop: 12 }}>
          {laedt ? (
            <div className="text-center py-8 text-muted">Laden...</div>
          ) : (
            <BalkenListe verteilung={verteilungVon(daten.kumuliert)} />
          )}
        </div>
      </div>
      {zeigeSollAbschnitt && (
        <div>
          <div className="flex flex-wrap items-baseline" style={{ columnGap: 10, rowGap: 2 }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--tp-ink)' }}>
              Sollerfüllung
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-muted)' }}>
              {LABELS.unitPlural} im Verhältnis zum eigenen Soll
            </p>
          </div>
          <div style={{ marginTop: 12 }}>
            {laedt ? (
              <div className="text-center py-8 text-muted">Laden...</div>
            ) : (
              <BalkenListe zeilen={sollZeilen} mitSollFarben />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function verteilungVon(zeilen: StatistikZeile[]): StatistikVerteilung {
  return prozentAusZuteilungen(zeilen)
}

function BalkenListe({
  verteilung,
  zeilen,
  mitSollFarben = false,
}: {
  verteilung?: StatistikVerteilung
  zeilen?: StatistikZeile[]
  mitSollFarben?: boolean
}) {
  if (verteilung) {
    const { zeilen: vZeilen, gesamtRunden } = verteilung
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        {vZeilen.map(z => (
          <Zeile
            key={z.mitgliedId}
            zeile={z}
            basis={gesamtRunden}
            farbe="var(--tp-accent)"
          />
        ))}
      </div>
    )
  }
  if (zeilen) {
    const sortiert = [...zeilen].sort((a, b) =>
      b.prozent - a.prozent
      || a.anzeigename.localeCompare(b.anzeigename, 'de'),
    )
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        {sortiert.map(z => (
          <Zeile
            key={z.mitgliedId}
            zeile={z}
            basis={z.moeglich}
            farbe={mitSollFarben ? progressColor(z.ist, z.moeglich) : null}
          />
        ))}
      </div>
    )
  }
  return null
}

function Zeile({
  zeile,
  basis,
  farbe,
}: {
  zeile: { mitgliedId: number; anzeigename: string; ist: number; prozent: number }
  basis: number
  farbe: string | null
}) {
  const zaehler = `${zeile.ist} von ${basis}`
  const zaehlerKompakt = `${zeile.ist}/${basis}`

  return (
    <>
      <div className="flex sm:hidden flex-nowrap items-center" style={{ gap: 12 }}>
        <RundAvatar
          mitgliedId={zeile.mitgliedId}
          anzeigename={zeile.anzeigename}
          avatarUrl={null}
          groesse={30}
          kuerzel={initialen(zeile.anzeigename)}
          fallbackBg="var(--tp-soft)"
          fallbackTextFarbe="var(--tp-ink)"
          style={{ width: 30, height: 30, flexShrink: 0 }}
        />
        <span
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-ink)', width: 64, flexShrink: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          {zeile.anzeigename}
        </span>
        <span className="stat-balken-spur min-w-0 flex-1">
          <span
            className="stat-balken-fuellung block"
            style={{ width: `${Math.max(0, Math.min(100, zeile.prozent))}%`, height: 10, backgroundColor: farbe ?? 'var(--tp-accent)' }}
          />
        </span>
        <span className="flex items-center whitespace-nowrap shrink-0" style={{ gap: 6 }}>
          <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: 'var(--tp-muted)', width: 36 }}>
            {zaehlerKompakt}
          </span>
          <span className="tabular-nums text-right" style={{ fontSize: 13, fontWeight: 700, color: 'var(--tp-ink)', width: 48 }}>
            {`${Math.round(zeile.prozent)} %`}
          </span>
        </span>
      </div>
      <div className="hidden sm:flex flex-nowrap items-center" style={{ gap: 12, rowGap: 6 }}>
        <RundAvatar
          mitgliedId={zeile.mitgliedId}
          anzeigename={zeile.anzeigename}
          avatarUrl={null}
          groesse={30}
          kuerzel={initialen(zeile.anzeigename)}
          fallbackBg="var(--tp-soft)"
          fallbackTextFarbe="var(--tp-ink)"
          style={{ width: 30, height: 30, flexShrink: 0 }}
        />
        <span
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-ink)', width: 72, flexShrink: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          {zeile.anzeigename}
        </span>
        <span className="stat-balken-spur" style={{ flex: '1 1 120px', minWidth: 0 }}>
          <span
            className="stat-balken-fuellung block"
            style={{ width: `${Math.max(0, Math.min(100, zeile.prozent))}%`, height: 10, backgroundColor: farbe ?? 'var(--tp-accent)' }}
          />
        </span>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 6, flexShrink: 0 }}>
          <span className="tabular-nums text-right" style={{ fontSize: 13, fontWeight: 600, color: 'var(--tp-muted)', width: 64, flexShrink: 0 }}>
            {zaehler}
          </span>
        </span>
        <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 13, fontWeight: 700, color: 'var(--tp-ink)', width: 60, textAlign: 'right' }}>
          {prozentDeutsch(zeile.prozent)}
        </span>
      </div>
    </>
  )
}
