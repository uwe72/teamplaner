import { useState } from 'react'
import { passwortAendern, profilAendern } from '../api/auth'
import { sitzungLaden, sitzungSpeichern } from '../api/client'
import type { AuthAntwort, Profil } from '../types'
import Button from '../components/Button'
import FormCard from '../components/FormCard'

const FARBPALETTE = [
  '#b91c1c', '#c2410c', '#b7791f', '#4d7c0f', '#15803d', '#0f766e',
  '#0369a1', '#4338ca', '#7e22ce', '#a21caf', '#be123c', '#78716c',
]

const rolleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Plattform-Admin',
  ADMIN: 'Team-Admin',
  MITGLIED: 'Mitglied',
}

export default function ProfilSeite() {
  const sitzung = sitzungLaden()
  const person = sitzung?.person
  const [anzeigename, setAnzeigename] = useState(person?.anzeigename ?? '')
  const [farbe, setFarbe] = useState(person?.farbe ?? '#3f3a34')
  const [altesPasswort, setAltesPasswort] = useState('')
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [meldung, setMeldung] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  if (!person) {
    return <div className="card p-4 text-sm text-muted">Bitte neu anmelden.</div>
  }

  async function speichern() {
    setFehler(null)
    setMeldung(null)
    try {
      const profil: Profil = await profilAendern(anzeigename.trim(), farbe)
      sitzungSpeichern({ ...(sitzung!.person as AuthAntwort), anzeigename: profil.anzeigename, farbe: profil.farbe })
      setMeldung('Profil gespeichert.')
    } catch (e: unknown) {
      setFehler(fehlerText(e))
    }
  }

  async function passwortNeu() {
    setFehler(null)
    setMeldung(null)
    try {
      await passwortAendern(altesPasswort, neuesPasswort)
      setMeldung('Passwort geändert.')
      setAltesPasswort('')
      setNeuesPasswort('')
    } catch (e: unknown) {
      setFehler(fehlerText(e))
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="grid gap-6 md:grid-cols-2">
        <FormCard>
          <label className="block text-sm text-muted mb-1">Loginname</label>
          <input value={person.login} readOnly disabled className="input-field w-full px-3 py-2 rounded-badge text-sm" />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-2">Rolle</label>
          <span className="chip-accent text-xs font-medium px-2 py-0.5 rounded-badge">
            {rolleLabels[person.rolle] ?? person.rolle}
          </span>
          {person.teamName && (
            <p className="text-sm text-muted mt-2">Team: <span className="font-medium">{person.teamName}</span></p>
          )}
        </FormCard>
      </div>

      <FormCard className="mt-6">
        <h2 className="text-[16px] font-medium text-foreground mb-4">Profil</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-muted mb-1">Anzeigename</label>
            <input
              value={anzeigename}
              maxLength={50}
              onChange={e => setAnzeigename(e.target.value)}
              className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Farbe</label>
            <div className="flex gap-1.5 flex-wrap">
              {FARBPALETTE.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFarbe(f)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${farbe === f ? 'ring-2 ring-offset-2 ring-accent-ring' : ''}`}
                  style={{ backgroundColor: f, borderColor: 'var(--color-border)' }}
                  aria-label={`Farbe ${f}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button variant="emphasized" onClick={speichern}>Speichern</Button>
        </div>
      </FormCard>

      <FormCard className="mt-6">
        <h2 className="text-[16px] font-medium text-foreground mb-4">Passwort ändern</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm text-muted mb-1">Bisheriges Passwort <span className="text-muted">*</span></label>
            <input
              type="password"
              autoComplete="current-password"
              value={altesPasswort}
              onChange={e => setAltesPasswort(e.target.value)}
              className="input-field w-full px-3 py-2 rounded-badge text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Neues Passwort <span className="text-muted">*</span></label>
            <input
              type="password"
              autoComplete="new-password"
              value={neuesPasswort}
              onChange={e => setNeuesPasswort(e.target.value)}
              className="input-field w-full px-3 py-2 rounded-badge text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <Button variant="emphasized" disabled={!altesPasswort || !neuesPasswort} onClick={passwortNeu}>
            Passwort ändern
          </Button>
        </div>
      </FormCard>

      {meldung && (
        <div className="mt-6 bg-success-bg border border-success/30 rounded-card p-4">
          <p className="text-success text-sm font-medium">{meldung}</p>
        </div>
      )}
      {fehler && (
        <div className="mt-6 bg-danger/10 border border-danger rounded-card p-4">
          <p className="text-danger text-sm font-medium">{fehler}</p>
        </div>
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}

function fehlerText(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Aktion fehlgeschlagen'
}
