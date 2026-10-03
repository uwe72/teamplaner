import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../../api/client'
import { aktivesTeamId } from '../../api/client'
import type { Statistik, StatistikZeile } from '../../types'
import { aktuelleIsoWocheJetzt, heutigesDatum, isoNummer, verschiebeIsoWoche, type IsoWoche } from '../../utils/datum'
import { statistikFarbe } from '../../utils/farben'
import { initialen } from '../../utils/initialen'
import { prozentAusZuteilungen, prozentDeutsch, type StatistikVerteilung } from '../../utils/statistik'
import SegmentedTabs from '../SegmentedTabs'
import RundAvatar from './RundAvatar'

type Tab = 'woche' | 'monat' | 'komplett'

const MONATSNAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export default function StatistikInhalt({
  bereichId,
  nebeneinander = false,
  woche,
  monatZuruecksetzenSignal = 0,
}: {
  bereichId: number
  nebeneinander?: boolean
  woche?: IsoWoche
  monatZuruecksetzenSignal?: number
}) {
  const teamId = aktivesTeamId()
  const [tab, setTab] = useState<Tab>('komplett')
  const [fokusWoche, setFokusWoche] = useState<IsoWoche | null>(null)
  const [fokusMonat, setFokusMonat] = useState<{ jahr: number; monat: number } | null>(null)

  useEffect(() => {
    if (monatZuruecksetzenSignal > 0) setFokusMonat(null)
  }, [monatZuruecksetzenSignal])

  const aktuelleWoche = aktuelleIsoWocheJetzt()
  const zielWoche = fokusWoche ?? woche ?? aktuelleWoche
  const heute = heutigesDatum()
  const aktuellerMonat = { jahr: Number(heute.slice(0, 4)), monat: Number(heute.slice(5, 7)) }
  const zielMonat = fokusMonat ?? aktuellerMonat

  const statistikAbfrage = useQuery<Statistik>({
    queryKey: ['statistik', teamId, bereichId, zielWoche.isoJahr, zielWoche.isoWoche, zielMonat.jahr, zielMonat.monat],
    queryFn: () => api.get(`/teams/${teamId}/statistik`, {
      params: {
        bereichId,
        isoJahr: zielWoche.isoJahr,
        isoWoche: zielWoche.isoWoche,
        jahr: zielMonat.jahr,
        monat: zielMonat.monat,
      },
    }).then(r => r.data),
    enabled: teamId != null,
  })

  if (teamId == null) {
    return <div className="p-4 text-sm text-muted">Kein Team-Kontext.</div>
  }

  const daten = statistikAbfrage.data
  const farbenMap = new Map<number, string>(
    (daten?.kumuliert ?? []).map((z, index) => [z.mitgliedId, statistikFarbe(index)]),
  )

  const amEnde = tab === 'woche'
    ? isoNummer(zielWoche) >= isoNummer(aktuelleWoche)
    : zielMonat.jahr === aktuellerMonat.jahr && zielMonat.monat === aktuellerMonat.monat

  function wocheZurueck() {
    setFokusWoche(verschiebeIsoWoche(zielWoche, -1))
  }
  function wocheWeiter() {
    if (!amEnde) setFokusWoche(verschiebeIsoWoche(zielWoche, 1))
  }
  function monatZurueck() {
    const jahr = zielMonat.monat === 1 ? zielMonat.jahr - 1 : zielMonat.jahr
    const monat = zielMonat.monat === 1 ? 12 : zielMonat.monat - 1
    setFokusMonat({ jahr, monat })
  }
  function monatWeiter() {
    if (amEnde) return
    const jahr = zielMonat.monat === 12 ? zielMonat.jahr + 1 : zielMonat.jahr
    const monat = zielMonat.monat === 12 ? 1 : zielMonat.monat + 1
    setFokusMonat({ jahr, monat })
  }

  const label = tab === 'woche'
    ? `KW ${zielWoche.isoWoche}/${zielWoche.isoJahr}`
    : tab === 'monat'
      ? `${MONATSNAMEN[zielMonat.monat - 1]} ${zielMonat.jahr}`
      : 'Alle Wochen seit Teamstart'

  if (nebeneinander) {
    const monatsTitel = `${MONATSNAMEN[zielMonat.monat - 1]} ${zielMonat.jahr}`
    return (
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <BalkenSpalte
          titel="Seit Teamstart"
          verteilung={daten ? verteilungVon(daten.kumuliert) : undefined}
          isLoading={statistikAbfrage.isLoading || !daten}
        />
        <div>
          <div className="mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--pm-ink)' }}>{monatsTitel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="pm-pfeil pm-focus-visible"
                  style={{ width: 36, height: 36, borderRadius: 10 }}
                  aria-label="Vorheriger Monat"
                  onClick={monatZurueck}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="pm-pfeil pm-focus-visible"
                  style={{ width: 36, height: 36, borderRadius: 10 }}
                  aria-label="Nächster Monat"
                  disabled={zielMonat.jahr === aktuellerMonat.jahr && zielMonat.monat === aktuellerMonat.monat}
                  onClick={monatWeiter}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          {statistikAbfrage.isLoading || !daten ? (
            <div className="text-center py-8 text-muted">Laden...</div>
          ) : (
            <BalkenListe verteilung={verteilungVon(daten.monatlich)} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-center mb-3">
        <SegmentedTabs
          className="w-full"
          items={[
            { key: 'komplett', label: 'Komplett' },
            { key: 'monat', label: 'Monat' },
            { key: 'woche', label: 'Woche' },
          ]}
          active={tab}
          onChange={key => setTab(key as Tab)}
        />
      </div>

      {statistikAbfrage.isLoading || !daten ? (
        <div className="text-center py-8 text-muted">Laden...</div>
      ) : (
        <>
          {tab !== 'komplett' && (
            <ZeitraumNavigation
              zentriert
              label={tab === 'woche'
                ? `KW ${zielWoche.isoWoche}/${zielWoche.isoJahr}`
                : `${MONATSNAMEN[zielMonat.monat - 1]} ${zielMonat.jahr}`}
              aufZurueck={tab === 'woche' ? wocheZurueck : monatZurueck}
              aufWeiter={tab === 'woche' ? wocheWeiter : monatWeiter}
              amEnde={amEnde}
            />
          )}

          <TortenView
            zeilen={tab === 'woche' ? daten.wochenweise : tab === 'monat' ? daten.monatlich : daten.kumuliert}
            farbenMap={farbenMap}
            titel={tab === 'komplett' ? label : ''}
          />
        </>
      )}
    </div>
  )
}

function verteilungVon(zeilen: StatistikZeile[]): StatistikVerteilung {
  return prozentAusZuteilungen(zeilen)
}

function ZeitraumNavigation({
  label,
  aufZurueck,
  aufWeiter,
  amEnde,
  zentriert = false,
}: {
  label: string
  aufZurueck: () => void
  aufWeiter: () => void
  amEnde: boolean
  zentriert?: boolean
}) {
  return (
    <div className={`flex items-center ${zentriert ? 'justify-center' : 'justify-between'} gap-2 mb-2`}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-8 h-8 rounded-control bg-elevated text-foreground hover:bg-card-hover shrink-0"
        aria-label="Zurück"
        onClick={aufZurueck}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-semibold text-foreground min-w-[110px] text-center">
        {label}
      </span>
      <button
        type="button"
        className="inline-flex items-center justify-center w-8 h-8 rounded-control bg-elevated text-foreground hover:bg-card-hover shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Weiter"
        disabled={amEnde}
        onClick={aufWeiter}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function BalkenSpalte({
  titel,
  verteilung,
  isLoading,
}: {
  titel: string
  verteilung?: StatistikVerteilung
  isLoading: boolean
}) {
  return (
    <div>
      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--pm-ink)' }}>{titel}</p>
      <div style={{ marginTop: 16 }}>
        {isLoading || !verteilung ? (
          <div className="text-center py-8 text-muted">Laden...</div>
        ) : (
          <BalkenListe verteilung={verteilung} />
        )}
      </div>
    </div>
  )
}

function BalkenListe({ verteilung }: { verteilung: StatistikVerteilung }) {
  const { zeilen, gesamtRunden } = verteilung
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {zeilen.map(z => (
        <div key={z.mitgliedId} className="flex items-center" style={{ gap: 12 }}>
          <RundAvatar
            mitgliedId={z.mitgliedId}
            anzeigename={z.anzeigename}
            avatarUrl={null}
            groesse={30}
            kuerzel={initialen(z.anzeigename)}
            fallbackBg="var(--pm-heute)"
            fallbackTextFarbe="var(--pm-ink)"
            style={{ width: 30, height: 30 }}
          />
          <span
            className="min-w-0"
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--pm-ink)', width: 72, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
          >
            {z.anzeigename}
          </span>
          <span className="pm-balken-spur" style={{ flex: 1, minWidth: 0 }}>
            <span
              className="pm-balken-fuellung block"
              style={{ width: `${Math.max(0, Math.min(100, z.prozent))}%`, height: 10 }}
            />
          </span>
          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 13, color: 'var(--pm-muted)', width: 72 }}>
            {`${z.ist} von ${gesamtRunden}`}
          </span>
          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 13, fontWeight: 700, color: 'var(--pm-ink)', width: 60, textAlign: 'right' }}>
            {prozentDeutsch(z.prozent)}
          </span>
        </div>
      ))}
    </div>
  )
}

function prozent(wert: number): string {
  return `${Math.round(wert * 10) / 10}%`
}

function TortenView({ zeilen, farbenMap, titel, kompakt = false, neben = false }: { zeilen: Statistik['wochenweise']; farbenMap: Map<number, string>; titel: string; kompakt?: boolean; neben?: boolean }) {
  const daten = zeilen.filter(z => z.ist > 0).map(z => ({
    name: z.anzeigename,
    wert: z.ist,
    farbe: farbenMap.get(z.mitgliedId) ?? '#78716c',
  }))
  const gesamt = daten.reduce((summe, d) => summe + d.wert, 0)

  const label2 = ({ cx, cy, midAngle, outerRadius, payload }: {
    cx?: number
    cy?: number
    midAngle?: number
    outerRadius?: number
    payload?: { name: string; wert: number }
  }) => {
    if (!payload || payload.wert / gesamt < 0.05) return null
    const prozentzahl = Math.round((payload.wert / gesamt) * 100)
    const rad = -(midAngle ?? 0) * (Math.PI / 180)
    const x = (cx ?? 0) + ((outerRadius ?? 0) + 14) * Math.cos(rad)
    const y = (cy ?? 0) + ((outerRadius ?? 0) + 14) * Math.sin(rad)
    return (
      <text
        x={x}
        y={y}
        textAnchor={Math.cos(rad) >= 0 ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        fill="var(--color-foreground)"
      >
        {initialen(payload.name)} ({prozentzahl}%)
      </text>
    )
  }

  const sortierteZeilen = [...zeilen]
    .sort((a, b) => b.prozent - a.prozent || b.ist - a.ist)

  const kuchen = (
    <div>
      {titel !== '' && (
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle mb-2">{titel}</p>
      )}
      {daten.length === 0 ? (
        <p className="text-sm text-muted py-6">Noch keine Zuteilungen in diesem Zeitraum.</p>
      ) : (
        <div className={neben ? 'h-[200px] w-[260px]' : kompakt ? 'h-[200px]' : 'h-[240px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={daten}
                dataKey="wert"
                nameKey="name"
                innerRadius={kompakt ? '55%' : '45%'}
                outerRadius={kompakt ? '75%' : '65%'}
                paddingAngle={2}
                stroke="var(--color-border)"
                label={label2}
                labelLine={false}
              >
                {daten.map((eintrag, index) => (
                  <Cell key={index} fill={eintrag.farbe} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )

  const tabelle = (
    <div className="space-y-2">
      {sortierteZeilen.map(z => (
        <div key={z.mitgliedId} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: farbenMap.get(z.mitgliedId) }} />
          <span className="text-sm flex-1 min-w-0 truncate">{z.anzeigename}</span>
          <span className="text-sm tabular-nums text-muted">{z.ist} / {z.moeglich}</span>
          <span className="text-sm tabular-nums font-semibold w-16 text-right">{prozent(z.prozent)}</span>
        </div>
      ))}
    </div>
  )

  if (neben) {
    return (
      <div className="py-3 flex items-start gap-8">
        {kuchen}
        <div className="flex-1 min-w-0 pt-1">{tabelle}</div>
      </div>
    )
  }

  return (
    <div className="py-3 grid gap-6">
      {kuchen}
      {tabelle}
    </div>
  )
}
