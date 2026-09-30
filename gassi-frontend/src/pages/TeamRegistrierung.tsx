import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { teamAnlegen } from '../api/auth'
import { sitzungLaden, sitzungSpeichern } from '../api/client'
import Button from '../components/Button'

export default function TeamRegistrierung() {
  const navigate = useNavigate()
  const sitzung = sitzungLaden()
  const [teamName, setTeamName] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  if (!sitzung) {
    return <Navigate to="/login" replace />
  }
  if (sitzung.person.rolle === 'SUPER_ADMIN' || sitzung.person.teamId != null) {
    return <Navigate to={sitzung.person.rolle === 'SUPER_ADMIN' ? '/super' : '/plan'} replace />
  }

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    if (!teamName.trim()) {
      setFehler('Bitte einen Teamnamen eingeben.')
      return
    }
    setLaedt(true)
    try {
      const antwort = await teamAnlegen(teamName.trim())
      sitzungSpeichern(antwort)
      navigate('/plan', { replace: true })
    } catch (err: unknown) {
      setFehler((err as { response?: { data?: { message?: string } } }).response?.data?.message
        || 'Team anlegen fehlgeschlagen.')
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 overflow-hidden bg-background">
      <img src="/background2627.png" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
      <div className="img-overlay" />

      <div className="relative bg-surface/70 backdrop-blur-md border border-border rounded-card w-full max-w-[440px] flex flex-col shadow-2xl gassi-login-enter">
        <div className="flex flex-col items-center text-center gap-1 px-6 pt-8 pb-2">
          <h2 className="text-2xl font-bold text-foreground leading-tight">Schritt 2: Team</h2>
          <p className="text-muted text-sm">Gib deinem Team einen Namen</p>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          {fehler && (
            <div className="flex items-start gap-3 p-3 bg-danger-bg border border-danger/30 rounded-control">
              <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0 mt-0.5" />
              <p className="text-danger text-sm">{fehler}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={absenden} noValidate>
            <div>
              <label htmlFor="t-name" className="block text-xs text-muted mb-0.5">Teamname</label>
              <input
                id="t-name"
                className="input-field w-full px-3 py-2 text-sm"
                maxLength={50}
                placeholder="z. B. Familie Clement"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-subtle mt-1">
                Eindeutig über alle Teams. Es wird automatisch ein Startbereich angelegt — danach
                kannst du Bereiche, Aufgaben und weitere Mitglieder anlegen.
              </p>
            </div>
            <Button type="submit" size="default" className="w-full" disabled={laedt}>
              {laedt ? 'Team anlegen…' : 'Team anlegen und starten'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
