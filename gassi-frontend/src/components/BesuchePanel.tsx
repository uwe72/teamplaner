import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useBesuchStatistik from '../hooks/useBesuchStatistik'
import useBesuchZeitverlauf from '../hooks/useBesuchZeitverlauf'
import useBesucheJeTeam from '../hooks/useBesucheJeTeam'
import { aktivesTeamId } from '../api/client'
import type { BesuchGranularitaet, BesuchMonat } from '../types'
import CardContainer from './CardContainer'
import SortIcon from './SortIcon'
import { TableContent, TableHead, Th, ThSortable, TableBody, Td } from './Table'

const ZEITRAUM_OPTIONEN = [3, 6, 12, 24]

const GRANULARITAETEN: { key: BesuchGranularitaet; label: string }[] = [
  { key: 'TAG', label: 'Tag' },
  { key: 'WOCHE', label: 'Woche' },
  { key: 'MONAT', label: 'Monat' },
  { key: 'QUARTAL', label: 'Quartal' },
  { key: 'JAHR', label: 'Jahr' },
]

interface DiagrammEintrag {
  active?: boolean
  payload?: Array<{ value?: number | string; name?: string; payload?: DiagrammPunkt }>
  label?: string | number
}

interface DiagrammPunkt {
  periodenStart: string
  bezeichnung: string
  achse: string
}

function isoWocheVon(datum: Date): { woche: number; jahr: number } {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const tag = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - tag)
  const jahresstart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const woche = Math.ceil(((d.getTime() - jahresstart.getTime()) / 86400000 + 1) / 7)
  return { woche, jahr: d.getUTCFullYear() }
}

function periodenStartLabel(periodenStart: string, granularitaet: BesuchGranularitaet): string {
  const d = new Date(periodenStart + 'T12:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  switch (granularitaet) {
    case 'TAG':
      return `${dd}.${mm}.${yyyy}`
    case 'WOCHE': {
      const w = isoWocheVon(d)
      return `KW ${w.woche}/${w.jahr}`
    }
    case 'MONAT':
      return `${mm}/${yyyy}`
    case 'QUARTAL':
      return `Q${Math.floor(d.getMonth() / 3) + 1}/${yyyy}`
    case 'JAHR':
      return yyyy
  }
}

function achsenLabel(periodenStart: string, granularitaet: BesuchGranularitaet): string {
  if (granularitaet === 'TAG') {
    const d = new Date(periodenStart + 'T12:00:00')
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
  }
  if (granularitaet === 'WOCHE') {
    return `KW ${isoWocheVon(new Date(periodenStart + 'T12:00:00')).woche}`
  }
  return periodenStartLabel(periodenStart, granularitaet)
}

export default function BesuchePanel({ teamuebergreifend = false }: { teamuebergreifend?: boolean }) {
  const [zeitraum, setZeitraum] = useState(12)
  return (
    <div className="space-y-6">
      {teamuebergreifend && <BesucheJeTeamPanel zeitraum={zeitraum} onZeitraum={setZeitraum} />}
      <BesuchMonatPanel teamuebergreifend={teamuebergreifend} zeitraum={zeitraum} onZeitraum={setZeitraum} />
      <BesuchZeitverlaufPanel teamuebergreifend={teamuebergreifend} />
    </div>
  )
}

function DiagrammTooltip({ active, payload, label }: DiagrammEintrag) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
      <p className="text-foreground font-semibold">{label}</p>
      {payload.map((eintrag, index) => (
        <p key={index} style={{ color: eintrag.name === 'Besuche' ? 'var(--color-accent)' : 'var(--color-success)' }}>
          {eintrag.name}: {eintrag.value}
        </p>
      ))}
    </div>
  )
}

function isoLabel(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function zeitraumBereich(zeitraum: number): { von: Date; bis: Date } {
  const jetzt = new Date()
  return {
    von: new Date(jetzt.getFullYear(), jetzt.getMonth() - (zeitraum - 1), 1),
    bis: new Date(jetzt.getFullYear(), jetzt.getMonth() + 1, 1),
  }
}

function BesucheJeTeamPanel({ zeitraum, onZeitraum }: { zeitraum: number; onZeitraum: (neu: number) => void }) {
  const { von, bis } = zeitraumBereich(zeitraum)
  const abfrage = useBesucheJeTeam(isoLabel(von), isoLabel(bis))
  const teams = abfrage.data ?? []
  return (
    <CardContainer
      title="Besuche je Team"
      subtitle="Besuchtage im gewählten Zeitraum, über alle Teams"
      headerRight={
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Zeitraum:
          <select
            value={zeitraum}
            onChange={e => onZeitraum(Number(e.target.value))}
            className="input-field py-1.5 pl-2 pr-6 text-xs"
          >
            {ZEITRAUM_OPTIONEN.map(option => (
              <option key={option} value={option}>{option} Monate</option>
            ))}
          </select>
        </label>
      }
    >
      {abfrage.isLoading ? (
        <div className="text-center py-8 text-muted">Laden...</div>
      ) : (
        <TableContent>
          <table className="w-full">
            <TableHead>
              <tr>
                <Th>Team</Th>
                <Th numeric>Besuche</Th>
                <Th numeric>Verschiedene Mitglieder</Th>
              </tr>
            </TableHead>
            <TableBody>
              {teams.length > 0 ? teams.map(t => (
                <tr key={t.teamId} className="border-b border-border hover:bg-card-hover">
                  <Td>{t.teamName}</Td>
                  <Td numeric>{t.besuche}</Td>
                  <Td numeric>{t.verschiedeneMitglieder}</Td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="text-center text-subtle py-8">Keine Besuche in diesem Zeitraum</td>
                </tr>
              )}
            </TableBody>
          </table>
        </TableContent>
      )}
    </CardContainer>
  )
}

function BesuchMonatPanel({ teamuebergreifend, zeitraum, onZeitraum }: {
  teamuebergreifend: boolean
  zeitraum: number
  onZeitraum: (neu: number) => void
}) {
  const [sortKey, setSortKey] = useState<'monat' | 'besuche'>('monat')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [aufgeklappt, setAufgeklappt] = useState<Set<string>>(new Set())
  const [mitgliedSortierung, setMitgliedSortierung] = useState<Record<string, { key: 'name' | 'besuche'; order: 'asc' | 'desc' }>>({})

  const teamId = teamuebergreifend ? null : aktivesTeamId()
  const { von, bis } = zeitraumBereich(zeitraum)

  const abfrage = useBesuchStatistik(teamId, isoLabel(von), isoLabel(bis))
  const monate = useMemo(() => abfrage.data?.monate ?? [], [abfrage.data])

  const chartDaten = useMemo(
    () => monate.map(m => ({ bezeichnung: `${String(m.monat).padStart(2, '0')}/${m.jahr}`, besuche: m.besucheGesamt })),
    [monate],
  )

  const sortierteMonate = useMemo(() => {
    const arr = [...monate]
    arr.sort((a, b) => {
      const cmp = sortKey === 'monat'
        ? a.jahr * 100 + a.monat - (b.jahr * 100 + b.monat)
        : a.besucheGesamt - b.besucheGesamt
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return arr
  }, [monate, sortKey, sortOrder])

  const umschalten = (key: 'monat' | 'besuche') => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const aufklappen = (key: string) => {
    setAufgeklappt(vorher => {
      const next = new Set(vorher)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <CardContainer
      title="Besuchs-Statistik"
      subtitle="Anzahl der Besuchtage pro Monat (jedes Mitglied zählt maximal einmal pro Kalendertag)"
      headerRight={
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Zeitraum:
          <select
            value={zeitraum}
            onChange={e => onZeitraum(Number(e.target.value))}
            className="input-field py-1.5 pl-2 pr-6 text-xs"
          >
            {ZEITRAUM_OPTIONEN.map(option => (
              <option key={option} value={option}>{option} Monate</option>
            ))}
          </select>
        </label>
      }
    >
      {abfrage.isLoading ? (
        <div className="text-center py-8 text-muted">Laden...</div>
      ) : (
        <>
          {chartDaten.length > 0 && (
            <div className="px-6 pt-6">
              <div className="bg-card p-4 rounded-card border border-border">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartDaten}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="bezeichnung" stroke="var(--color-muted)" />
                    <YAxis stroke="var(--color-muted)" domain={[0, 'auto']} tickCount={10} allowDecimals={false} />
                    <Tooltip content={<DiagrammTooltip />} cursor={false} />
                    <Line type="monotone" dataKey="besuche" name="Besuche" stroke="var(--color-accent)" strokeWidth={2} dot={{ fill: 'var(--color-accent)', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <TableContent>
            <table className="w-full">
              <TableHead>
                <tr>
                  <ThSortable onClick={() => umschalten('monat')}>
                    Monat<SortIcon column="monat" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable numeric onClick={() => umschalten('besuche')}>
                    Besuche<SortIcon column="besuche" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                </tr>
              </TableHead>
              <TableBody>
                {sortierteMonate.length > 0 ? sortierteMonate.map(monat => (
                  <MonatZeile
                    key={`${monat.jahr}-${monat.monat}`}
                    monat={monat}
                    teamuebergreifend={teamuebergreifend}
                    offen={aufgeklappt.has(`${monat.jahr}-${monat.monat}`)}
                    onUmschalten={() => aufklappen(`${monat.jahr}-${monat.monat}`)}
                    sortierung={mitgliedSortierung[`${monat.jahr}-${monat.monat}`]}
                    onSortierung={schluessel =>
                      setMitgliedSortierung(vorher => {
                        const aktuell = vorher[`${monat.jahr}-${monat.monat}`] ?? { key: 'besuche' as const, order: 'desc' as const }
                        return {
                          ...vorher,
                          [`${monat.jahr}-${monat.monat}`]: aktuell.key === schluessel
                            ? { key: schluessel, order: aktuell.order === 'asc' ? 'desc' as const : 'asc' as const }
                            : { key: schluessel, order: 'asc' as const },
                        }
                      })
                    }
                  />
                )) : (
                  <tr>
                    <td colSpan={2} className="text-center text-subtle py-8">Keine Daten vorhanden</td>
                  </tr>
                )}
              </TableBody>
            </table>
          </TableContent>
        </>
      )}
    </CardContainer>
  )
}

interface MonatZeileProps {
  monat: BesuchMonat
  teamuebergreifend: boolean
  offen: boolean
  onUmschalten: () => void
  sortierung?: { key: 'name' | 'besuche'; order: 'asc' | 'desc' }
  onSortierung: (schluessel: 'name' | 'besuche') => void
}

function MonatZeile({ monat, teamuebergreifend, offen, onUmschalten, sortierung, onSortierung }: MonatZeileProps) {
  const aktiveSortierung = useMemo(
    () => sortierung ?? { key: 'besuche' as const, order: 'desc' as const },
    [sortierung],
  )
  const mitglieder = useMemo(() => {
    const arr = [...monat.mitglieder]
    arr.sort((a, b) => {
      if (aktiveSortierung.key === 'name') {
        return aktiveSortierung.order === 'asc'
          ? a.anzeigename.localeCompare(b.anzeigename, 'de')
          : b.anzeigename.localeCompare(a.anzeigename, 'de')
      }
      const cmp = a.besuche - b.besuche
      return aktiveSortierung.order === 'asc' ? cmp : -cmp
    })
    return arr
  }, [monat.mitglieder, aktiveSortierung])

  return (
    <>
      <tr className="border-b border-border hover:bg-card-hover cursor-pointer" onClick={onUmschalten}>
        <Td>
          <span className="inline-flex items-center gap-2">
            <i className={`sap-icon ${offen ? 'sap-icon-navigation-down-arrow' : 'sap-icon-navigation-right-arrow'} text-[14px] text-subtle`} />
            {`${String(monat.monat).padStart(2, '0')}/${monat.jahr}`}
          </span>
        </Td>
        <Td numeric>{monat.besucheGesamt}</Td>
      </tr>
      {offen && (
        <tr className="bg-elevated/50">
          <td colSpan={2} className="px-2 py-2 pl-10 md:px-3">
            {mitglieder.length > 0 ? (
              <table className="w-full max-w-md">
                <thead>
                  <tr className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                    <th
                      className="px-2 py-2 h-[40px] text-left cursor-pointer hover:text-accent select-none md:px-3"
                      onClick={() => onSortierung('name')}
                    >
                      Mitglied<SortIcon column="name" activeKey={aktiveSortierung.key} order={aktiveSortierung.order} />
                    </th>
                    <th
                      className="px-2 py-2 h-[40px] text-right cursor-pointer hover:text-accent select-none tabular-nums md:px-3"
                      onClick={() => onSortierung('besuche')}
                    >
                      Besuche<SortIcon column="besuche" activeKey={aktiveSortierung.key} order={aktiveSortierung.order} />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {mitglieder.map(m => (
                    <tr key={m.mitgliedId} className="border-t border-border">
                      <Td className="pl-3">
                        <span>{m.anzeigename}</span>
                        <span className="text-subtle text-xs ml-1.5">({m.login})</span>
                        {teamuebergreifend && m.teamName && (
                          <span className="text-subtle text-xs ml-1.5">· {m.teamName}</span>
                        )}
                      </Td>
                      <Td numeric>{m.besuche}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-subtle py-2">Keine Besuche in diesem Monat</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function BesuchZeitverlaufPanel({ teamuebergreifend }: { teamuebergreifend: boolean }) {
  const [granularitaet, setGranularitaet] = useState<BesuchGranularitaet>('MONAT')
  const teamId = teamuebergreifend ? null : aktivesTeamId()
  const abfrage = useBesuchZeitverlauf(teamId, granularitaet)
  const verlauf = abfrage.data

  const zeilen = useMemo(
    () => (verlauf?.bucketListe ?? []).map(b => ({
      periodenStart: b.periodenStart,
      bezeichnung: periodenStartLabel(b.periodenStart, granularitaet),
      achse: achsenLabel(b.periodenStart, granularitaet),
      besuche: b.besuche,
      verschiedeneMitglieder: b.verschiedeneMitglieder,
      durchschnitt: b.verschiedeneMitglieder > 0 ? b.besuche / b.verschiedeneMitglieder : 0,
    })),
    [verlauf, granularitaet],
  )

  if (abfrage.isLoading) return <div className="text-center py-8 text-muted">Laden...</div>

  const gesamtMitglieder = verlauf?.gesamtMitglieder ?? 0

  return (
    <CardContainer
      title="Besuche im Zeitverlauf"
      subtitle="Balken: alle Besuche im Zeitraum — Linie: verschiedene Mitglieder im Zeitraum (jedes Mitglied zählt pro Zeitraum einmal)"
      headerRight={
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Granularität:
          <select
            value={granularitaet}
            onChange={e => setGranularitaet(e.target.value as BesuchGranularitaet)}
            className="input-field py-1.5 pl-2 pr-6 text-xs"
          >
            {GRANULARITAETEN.map(option => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </label>
      }
    >
      <div className="px-6 pt-6">
        <div className="bg-card p-4 rounded-card border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={zeilen}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="achse" stroke="var(--color-muted)" />
              <YAxis stroke="var(--color-muted)" domain={[0, 'auto']} tickCount={10} allowDecimals={false} />
              <Tooltip content={<DiagrammTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-muted)' }} iconType="circle" />
              <Bar dataKey="besuche" name="Besuche" fill="var(--color-accent)" radius={[2, 2, 0, 0]} />
              <Line
                type="monotone"
                dataKey="verschiedeneMitglieder"
                name="Verschiedene Mitglieder"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-success)', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <TableContent>
        <table className="w-full">
          <TableHead>
            <tr>
              <Th>Zeitraum</Th>
              <Th numeric>Besuche</Th>
              <Th numeric>Verschiedene Mitglieder</Th>
              <Th numeric>Ø Besuche je Mitglied</Th>
            </tr>
          </TableHead>
          <TableBody>
            {zeilen.map(zeile => (
              <tr key={zeile.periodenStart} className="border-b border-border hover:bg-card-hover">
                <Td>{zeile.bezeichnung}</Td>
                <Td numeric>{zeile.besuche}</Td>
                <Td numeric>{mitgliederText(zeile.verschiedeneMitglieder, gesamtMitglieder)}</Td>
                <Td numeric>{zeile.durchschnitt.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</Td>
              </tr>
            ))}
          </TableBody>
        </table>
      </TableContent>
    </CardContainer>
  )
}

function mitgliederText(verschiedene: number, gesamt: number): string {
  const prozent = gesamt > 0 ? Math.round((verschiedene / gesamt) * 100) : 0
  return `${verschiedene} von ${gesamt} (${prozent} %)`
}
