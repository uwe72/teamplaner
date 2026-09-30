import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { konfigurationLaden, konfigurationSpeichern, teamAendern, teamsLaden } from '../api/auth'
import { sitzungLaden } from '../api/client'
import type { SystemKonfiguration, Team } from '../types'
import Button from '../components/Button'
import Badge from '../components/Badge'
import CardContainer from '../components/CardContainer'
import { TableContent, TableHead, TableBody, Th } from '../components/Table'
import { Dialog } from '../components/Dialog'
import { antwort } from '../utils/fehler'

export default function Super() {
  const queryClient = useQueryClient()
  const [fehler, setFehler] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [bearbeiteId, setBearbeiteId] = useState<number | null>(null)

  const teamsAbfrage = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: teamsLaden,
  })

  const sitzung = sitzungLaden()
  const istSuper = sitzung?.person.rolle === 'SUPER_ADMIN'

  useEffect(() => {
    if (!istSuper) {
      window.location.href = '/plan'
    }
  }, [istSuper])

  if (!istSuper) return null

  function alsTeam(team: Team) {
    localStorage.setItem('alsTeam', JSON.stringify({ teamId: team.id, teamName: team.name }))
    window.location.href = '/plan'
  }

  async function speichern(team: Team, name: string, aktiv: boolean) {
    setFehler(null)
    try {
      await teamAendern(team.id, name, aktiv)
      setMeldung(`Team „${name}“ gespeichert.`)
      setBearbeiteId(null)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="card p-3 text-sm" style={{ backgroundColor: 'var(--color-info-bg)' }}>
        Du bist Plattform-Admin (SUPER_ADMIN). Wähle „Als Team arbeiten“, um im Wochenplan dieses
        Teams vollzugreifen — ein Banner zeigt den aktiven Kontext.
      </div>

      {meldung && (
        <div className="card p-3 text-sm" style={{ backgroundColor: 'var(--color-success-bg)' }}>
          <p className="text-success">{meldung}</p>
        </div>
      )}
      {fehler && (
        <div className="card p-3 text-sm" style={{ backgroundColor: 'var(--color-danger-bg)' }}>
          <p className="text-danger">{fehler}</p>
        </div>
      )}

      <CardContainer title="Teams" subtitle="Teams werden durch die Registrierung angelegt — hier umbenennen oder deaktivieren.">
        <TableContent>
          <table className="w-full">
            <TableHead>
              <tr>
                <Th>Team</Th>
                <Th>Mitglieder</Th>
                <Th>Erstellt</Th>
                <Th>Status</Th>
                <Th align="right">Aktionen</Th>
              </tr>
            </TableHead>
            <TableBody>
              {(teamsAbfrage.data ?? []).map(t => (
                <tr key={t.id} className="hover:bg-card-hover border-b border-border">
                  <td className="px-2 py-2 md:px-3 font-medium">{t.name}</td>
                  <td className="px-2 py-2 md:px-3 tabular-nums">{t.mitgliederAnzahl}</td>
                  <td className="px-2 py-2 md:px-3 text-muted text-xs">{new Date(t.erstelltAm).toLocaleDateString('de-DE')}</td>
                  <td className="px-2 py-2 md:px-3">
                    {t.aktiv ? <Badge variant="success">aktiv</Badge> : <Badge variant="danger">deaktiviert</Badge>}
                  </td>
                  <td className="px-2 py-2 md:px-3 text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" onClick={() => alsTeam(t)} title="Im Kontext dieses Teams arbeiten">
                      Als Team
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setBearbeiteId(t.id)}>
                      Bearbeiten
                    </Button>
                  </td>
                </tr>
              ))}
            </TableBody>
          </table>
        </TableContent>
      </CardContainer>

      <SystemKonfigurationKarte />

      {bearbeiteId != null && (
        <Dialog onClose={() => setBearbeiteId(null)}>
          <TeamBearbeiten
            team={(teamsAbfrage.data ?? []).find(t => t.id === bearbeiteId)!}
            onSpeichern={speichern}
            onAbbrechen={() => setBearbeiteId(null)}
          />
        </Dialog>
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}

function TeamBearbeiten({
  team,
  onSpeichern,
  onAbbrechen,
}: {
  team: Team
  onSpeichern: (team: Team, name: string, aktiv: boolean) => Promise<void>
  onAbbrechen: () => void
}) {
  const [name, setName] = useState(team.name)
  const [aktiv, setAktiv] = useState(team.aktiv)
  const [laedt, setLaedt] = useState(false)

  return (
    <div>
      <h2 className="text-[16px] font-medium text-foreground mb-4">Team bearbeiten — {team.name}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Name</label>
          <input
            value={name}
            maxLength={50}
            onChange={e => setName(e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={aktiv} onChange={e => setAktiv(e.target.checked)} className="w-4 h-4" />
          aktiv (Mitglieder können sich anmelden)
        </label>
        <div className="flex gap-4">
          <Button variant="emphasized" disabled={!name.trim() || laedt}
            onClick={async () => { setLaedt(true); await onSpeichern(team, name.trim(), aktiv); setLaedt(false) }}>
            Speichern
          </Button>
          <Button variant="ghost" onClick={onAbbrechen}>Abbrechen</Button>
        </div>
      </div>
    </div>
  )
}

function SystemKonfigurationKarte() {
  const [fehler, setFehler] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [werte, setWerte] = useState<Record<string, string>>({})

  const abfrage = useQuery<SystemKonfiguration>({
    queryKey: ['konfig'],
    queryFn: konfigurationLaden,
  })

  useEffect(() => {
    if (abfrage.data) setWerte(abfrage.data.werte)
  }, [abfrage.data])

  const felder: Array<{ key: string; label: string; typ?: string }> = [
    { key: 'SMTP_HOST', label: 'SMTP-Host' },
    { key: 'SMTP_PORT', label: 'SMTP-Port' },
    { key: 'SMTP_BENUTZER', label: 'SMTP-Benutzer' },
    { key: 'SMTP_PASSWORT', label: 'SMTP-Passwort', typ: 'password' },
    { key: 'SMTP_ABSENDER', label: 'Absender (From)' },
    { key: 'WEB_URL', label: 'Web-URL (für Mail-Links)' },
  ]

  async function speichern() {
    setFehler(null)
    try {
      await konfigurationSpeichern(werte)
      setMeldung('Konfiguration gespeichert.')
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  return (
    <CardContainer title="Systemkonfiguration" subtitle="SMTP für Passwort-Reset und Login-Reminder; ohne Konfiguration werden keine Mails gesendet.">
      <div className="px-4 md:px-6 py-5 space-y-3 max-w-xl">
        {meldung && <div className="p-2.5 bg-success-bg border border-success/30 rounded-control text-[13px] text-success">{meldung}</div>}
        {fehler && <div className="p-2.5 bg-danger-bg border border-danger/30 rounded-control text-[13px] text-danger">{fehler}</div>}
        {felder.map(f => (
          <div key={f.key}>
            <label className="block text-sm text-muted mb-1">{f.label}</label>
            <input
              type={f.typ ?? 'text'}
              value={werte[f.key] ?? ''}
              onChange={e => setWerte(v => ({ ...v, [f.key]: e.target.value }))}
              className="input-field w-full px-3 py-2 rounded-badge text-sm focus:outline-none"
            />
          </div>
        ))}
        <Button variant="emphasized" onClick={speichern}>Konfiguration speichern</Button>
      </div>
    </CardContainer>
  )
}
