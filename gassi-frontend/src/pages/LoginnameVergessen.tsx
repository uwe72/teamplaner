import { useState } from 'react'
import { Link } from 'react-router-dom'
import { loginnameVergessen } from '../api/auth'
import Button from '../components/Button'

export default function LoginnameVergessen() {
  const [email, setEmail] = useState('')
  const [meldung, setMeldung] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    setMeldung('')
    if (!email.trim()) {
      setFehler('Bitte eine E-Mail eingeben.')
      return
    }
    setLaedt(true)
    try {
      await loginnameVergessen(email.trim())
      setMeldung('Wenn zur E-Mail Logins existieren, haben wir sie per Mail geschickt.')
    } catch {
      setFehler('Anfrage fehlgeschlagen.')
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
          <h2 className="text-2xl font-bold text-foreground leading-tight">Loginname vergessen</h2>
          <p className="text-muted text-sm">Wir schicken deine Logins per Mail</p>
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
              <label htmlFor="li-email" className="block text-xs text-muted mb-0.5">E-Mail</label>
              <input
                id="li-email"
                className="input-field w-full px-3 py-2 text-sm"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" size="default" className="w-full" disabled={laedt}>
              {laedt ? 'Senden…' : 'Logins anfordern'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-1 text-xs">
            <Link to="/login" className="link">Zurück zum Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
