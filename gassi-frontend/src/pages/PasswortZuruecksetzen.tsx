import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { passwortZuruecksetzen } from '../api/auth'
import Button from '../components/Button'

export default function PasswortZuruecksetzen() {
  const [suchParameter] = useSearchParams()
  const token = suchParameter.get('token') ?? ''
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [passwort2, setPasswort2] = useState('')
  const [meldung, setMeldung] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    setMeldung('')
    if (!token) {
      setFehler('Kein gültiger Link — bitte den Reset-Link aus der Mail verwenden.')
      return
    }
    if (!neuesPasswort || neuesPasswort !== passwort2) {
      setFehler('Die Passwörter stimmen nicht überein.')
      return
    }
    setLaedt(true)
    try {
      await passwortZuruecksetzen(token, neuesPasswort)
      setMeldung('Passwort wurde gesetzt — du kannst dich jetzt anmelden.')
    } catch (err: unknown) {
      setFehler((err as { response?: { data?: { message?: string } } }).response?.data?.message
        || 'Reset fehlgeschlagen — der Link könnte abgelaufen sein.')
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
          <h2 className="text-2xl font-bold text-foreground leading-tight">Neues Passwort</h2>
          <p className="text-muted text-sm">Setze dein Passwort neu</p>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          {meldung && (
            <div className="p-3 bg-success-bg border border-success/30 rounded-control text-[13px] text-success">
              {meldung}
            </div>
          )}
          {fehler && (
            <div className="p-3 bg-danger-bg border border-danger/30 rounded-control text-[13px] text-danger">{fehler}</div>
          )}

          <form className="space-y-4" onSubmit={absenden} noValidate>
            <div>
              <label htmlFor="np-pw" className="block text-xs text-muted mb-0.5">Neues Passwort</label>
              <input
                id="np-pw"
                className="input-field w-full px-3 py-2 text-sm"
                type="password"
                autoComplete="new-password"
                value={neuesPasswort}
                onChange={e => setNeuesPasswort(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="np-pw2" className="block text-xs text-muted mb-0.5">Passwort wiederholen</label>
              <input
                id="np-pw2"
                className="input-field w-full px-3 py-2 text-sm"
                type="password"
                autoComplete="new-password"
                value={passwort2}
                onChange={e => setPasswort2(e.target.value)}
              />
            </div>
            <Button type="submit" size="default" className="w-full" disabled={laedt}>
              {laedt ? 'Speichern…' : 'Passwort setzen'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-1 text-xs">
            <Link to="/login" className="link">Zum Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
