import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../../api/client'
import { aktivesTeamId } from '../../api/client'
import type { Statistik } from '../../types'
import { aktuelleIsoWocheJetzt, heutigesDatum, isoNummer, verschiebeIsoWoche, type IsoWoche } from '../../utils/datum'
import { statistikFarbe } from '../../utils/farben'
import { initialen } from '../../utils/initialen'
import SegmentedTabs from '../SegmentedTabs'

type Tab = 'woche' | 'monat' | 'komplett'

const MONATSNAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export default function StatistikInhalt({ bereichId }: { bereichId: number }) {
  const teamId = aktivesTeamId()
  const [tab, setTab] = useState<Tab>('komplett')
  const [fokusWoche, setFokusWoche] = useState<IsoWoche | null>(null)
  const [fokusMonat, setFokusMonat] = useState<{ jahr: number; monat: number } | null>(null)

  const aktuelleWoche = aktuelleIsoWocheJetzt()
  const zielWoche = fokusWoche ?? aktuelleWoche
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
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 rounded-control bg-elevated text-foreground hover:bg-card-hover shrink-0"
                aria-label="Zurück"
                onClick={tab === 'woche' ? wocheZurueck : monatZurueck}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-foreground min-w-[110px] text-center">
                {tab === 'woche' ? `KW ${zielWoche.isoWoche}/${zielWoche.isoJahr}` : `${MONATSNAMEN[zielMonat.monat - 1]} ${zielMonat.jahr}`}
              </span>
              <button
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 rounded-control bg-elevated text-foreground hover:bg-card-hover shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Weiter"
                disabled={amEnde}
                onClick={tab === 'woche' ? wocheWeiter : monatWeiter}
              >
                <ChevronRight size={16} />
              </button>
            </div>
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

function prozent(wert: number): string {
  return `${Math.round(wert * 10) / 10}%`
}

function TortenView({ zeilen, farbenMap, titel }: { zeilen: Statistik['wochenweise']; farbenMap: Map<number, string>; titel: string }) {
  const daten = zeilen.filter(z => z.ist > 0).map(z => ({
    name: z.anzeigename,
    wert: z.ist,
    farbe: farbenMap.get(z.mitgliedId) ?? '#78716c',
  }))
  const gesamt = daten.reduce((summe, d) => summe + d.wert, 0)

  const label = ({ cx, cy, midAngle, outerRadius, payload }: {
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

  return (
    <div className="py-3 grid gap-6">
      <div>
        {titel !== '' && (
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle mb-2">{titel}</p>
        )}
        {daten.length === 0 ? (
          <p className="text-sm text-muted py-6">Noch keine Zuteilungen in diesem Zeitraum.</p>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={daten}
                  dataKey="wert"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="65%"
                  paddingAngle={2}
                  stroke="var(--color-border)"
                  label={label}
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
      <div className="space-y-2">
        {zeilen.map(z => (
          <div key={z.mitgliedId} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: farbenMap.get(z.mitgliedId) }} />
            <span className="text-sm flex-1 min-w-0 truncate">{z.anzeigename}</span>
            <span className="text-sm tabular-nums text-muted">{z.ist} / {z.moeglich}</span>
            <span className="text-sm tabular-nums font-semibold w-16 text-right">{prozent(z.prozent)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
