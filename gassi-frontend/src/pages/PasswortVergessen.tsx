import { useState } from 'react'
import { Link } from 'react-router-dom'
import { passwortVergessen } from '../api/auth'
import Button from '../components/Button'

export default function PasswortVergessen() {
  const [email, setEmail] = useState('')
  const [mehrereKonten, setMehrereKonten] = useState(false)
  const [logins, setLogins] = useState<string[]>([])
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const [meldung, setMeldung] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    setMeldung('')
    setMehrereKonten(false)
    setLogins([])
    if (!email.trim()) {
      setFehler('Bitte eine E-Mail eingeben.')
      return
    }
    setLaedt(true)
    try {
      const antwort = await passwortVergessen(email.trim(), gewaehlt ?? undefined)
      setMehrereKonten(antwort.mehrereKonten)
      setLogins(antwort.logins)
      setMeldung('Wenn zur E-Mail ein Konto existiert, ist der Reset-Link unterwegs.')
    } catch {
      setFehler('Anfrage fehlgeschlagen.')
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 overflow-hidden bg-background">
      <img src="/background.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
      <div className="img-overlay" />

      <div className="relative bg-surface/70 backdrop-blur-md border border-border rounded-card w-full max-w-[440px] flex flex-col shadow-2xl gassi-login-enter">
        <div className="flex flex-col items-center text-center gap-1 px-6 pt-8 pb-2">
          <h2 className="text-2xl font-bold text-foreground leading-tight">Passwort vergessen</h2>
          <p className="text-muted text-sm">Wir schicken einen Reset-Link per Mail</p>
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

          {mehrereKonten && logins.length > 0 && (
            <div className="p-3 bg-warning-bg border border-warning/30 rounded-control">
              <p className="text-[13px] text-warning mb-2">Es existieren mehrere Logins zu dieser E-Mail — bitte wählen:</p>
              <div className="flex flex-wrap gap-2">
                {logins.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setGewaehlt(l)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-badge border ${gewaehlt === l ? 'ring-2' : ''}`}
                    style={{
                      backgroundColor: 'var(--color-elevated)',
                      borderColor: 'var(--color-border-strong)',
                      boxShadow: gewaehlt === l ? '0 0 0 2px var(--color-accent)' : undefined,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={absenden} noValidate>
            <div>
              <label htmlFor="pw-email" className="block text-xs text-muted mb-0.5">E-Mail</label>
              <input
                id="pw-email"
                className="input-field w-full px-3 py-2 text-sm"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" size="default" className="w-full" disabled={laedt}>
              {laedt ? 'Senden…' : 'Reset-Link anfordern'}
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
