import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../api/client'
import { aktivesTeamId } from '../api/client'
import type { Bereich, Statistik } from '../types'
import { aktuelleIsoWocheJetzt, verschiebeIsoWoche, type IsoWoche } from '../utils/datum'
import CardContainer from '../components/CardContainer'
import Button from '../components/Button'
import { TableContent, TableHead, TableBody, Th } from '../components/Table'
import Badge from '../components/Badge'

export default function StatistikSeite() {
  const teamId = aktivesTeamId()
  const [bereichId, setBereichId] = useState<number | null>(null)
  const [fokus, setFokus] = useState<IsoWoche | null>(null)

  const bereicheAbfrage = useQuery<Bereich[]>({
    queryKey: ['bereiche', teamId],
    queryFn: () => api.get(`/teams/${teamId}/bereiche`).then(r => r.data),
    enabled: teamId != null,
  })

  useEffect(() => {
    if (!bereichId && bereicheAbfrage.data && bereicheAbfrage.data.length > 0) {
      setBereichId(bereicheAbfrage.data[0].id)
    }
  }, [bereicheAbfrage.data, bereichId])

  const zielWoche = fokus ?? aktuelleIsoWocheJetzt()

  const statistikAbfrage = useQuery<Statistik>({
    queryKey: ['statistik', teamId, bereichId, zielWoche.isoJahr, zielWoche.isoWoche],
    queryFn: () => api.get(`/teams/${teamId}/statistik`, {
      params: { bereichId, isoJahr: zielWoche.isoJahr, isoWoche: zielWoche.isoWoche },
    }).then(r => r.data),
    enabled: teamId != null && bereichId != null,
  })

  if (teamId == null) {
    return <div className="card p-4 text-sm text-muted">Kein Team-Kontext.</div>
  }

  const daten = statistikAbfrage.data
  const istAktuelleWoche = fokus == null
    || (zielWoche.isoJahr === aktuelleIsoWocheJetzt().isoJahr && zielWoche.isoWoche === aktuelleIsoWocheJetzt().isoWoche)

  return (
    <div className="max-w-5xl space-y-6">
      {(bereicheAbfrage.data ?? []).filter(b => b.aktiv).length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(bereicheAbfrage.data ?? []).filter(b => b.aktiv).map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBereichId(b.id)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-control border transition-colors ${bereichId === b.id ? 'bg-primary text-primary-foreground border-transparent' : 'bg-surface text-muted border-border hover:bg-card-hover'}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <CardContainer
        title={`Statistik — ${daten?.bereichName ?? ''}`}
        subtitle="Prozente pro Woche und kumuliert über alle Wochen seit Teamstart."
        headerRight={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="compact" onClick={() => setFokus(verschiebeIsoWoche(zielWoche, -1))} title="Vorherige Woche">
              ‹ zurück
            </Button>
            <button
              className="text-xs text-muted hover:text-foreground underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
              disabled={istAktuelleWoche}
              onClick={() => setFokus(null)}
            >
              aktuelle Woche
            </button>
            <Button variant="secondary" size="compact" onClick={() => setFokus(verschiebeIsoWoche(zielWoche, 1))} title="Nächste Woche">
              weiter ›
            </Button>
          </div>
        }
      >
        {statistikAbfrage.isLoading || !daten ? (
          <div className="text-center py-8 text-muted">Laden...</div>
        ) : (
          <TortenView zeilen={daten.wochenweise} titel={`Woche ${zielWoche.isoWoche}/${zielWoche.isoJahr}`} />
        )}
      </CardContainer>

      {daten && (
        <CardContainer title={`Kumuliert — ${daten.bereichName}`}>
          <TortenView zeilen={daten.kumuliert} titel="Alle Wochen seit Teamstart" />
        </CardContainer>
      )}

      {daten && (
        <CardContainer title="Zahlen im Detail">
          <TableContent>
            <table className="w-full">
              <TableHead>
                <tr>
                  <Th>Mitglied</Th>
                  <Th numeric>Ist (Woche)</Th>
                  <Th numeric>Möglich (Woche)</Th>
                  <Th numeric>Woche %</Th>
                  <Th numeric>Kumuliert %</Th>
                </tr>
              </TableHead>
              <TableBody>
                {daten.wochenweise.map(w => {
                  const kumuliertZeile = daten.kumuliert.find(k => k.mitgliedId === w.mitgliedId)
                  return (
                    <tr key={w.mitgliedId} className="hover:bg-card-hover border-b border-border">
                      <td className="px-2 py-2 md:px-3">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.farbe }} />
                          {w.anzeigename}
                          {!w.aktiv && <Badge variant="muted">inaktiv</Badge>}
                        </span>
                      </td>
                      <td className="px-2 py-2 md:px-3 text-right tabular-nums">{w.ist} / {w.moeglich}</td>
                      <td className="px-2 py-2 md:px-3 text-right tabular-nums text-muted">{w.moeglich}</td>
                      <td className="px-2 py-2 md:px-3 text-right tabular-nums">{prozent(w.prozent)}</td>
                      <td className="px-2 py-2 md:px-3 text-right tabular-nums">{prozent(kumuliertZeile?.prozent ?? 0)}</td>
                    </tr>
                  )
                })}
              </TableBody>
            </table>
          </TableContent>
        </CardContainer>
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}

function prozent(wert: number): string {
  return `${Math.round(wert * 10) / 10}%`
}

function TortenView({ zeilen, titel }: { zeilen: Statistik['wochenweise']; titel: string }) {
  const daten = zeilen.filter(z => z.ist > 0).map(z => ({
    name: z.anzeigename,
    wert: z.ist,
    farbe: z.farbe,
  }))

  return (
    <div className="px-4 md:px-6 py-5 grid gap-6 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle mb-2">{titel}</p>
        {daten.length === 0 ? (
          <p className="text-sm text-muted py-6">Noch keine Zuteilungen in diesem Zeitraum.</p>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={daten}
                  dataKey="wert"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke="var(--color-border)"
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
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.farbe }} />
            <span className="text-sm flex-1 min-w-0 truncate">{z.anzeigename}</span>
            <span className="text-sm tabular-nums text-muted">{z.ist} / {z.moeglich}</span>
            <span className="text-sm tabular-nums font-semibold w-16 text-right">{prozent(z.prozent)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
