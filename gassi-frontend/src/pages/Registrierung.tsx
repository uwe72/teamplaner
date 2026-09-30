import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginVerfuegbar, registrieren } from '../api/auth'
import { sitzungSpeichern } from '../api/client'
import Button from '../components/Button'

export default function Registrierung() {
  const navigate = useNavigate()
  const [loginname, setLoginname] = useState('')
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [passwort2, setPasswort2] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    if (!loginname.trim() || !email.trim() || !passwort) {
      setFehler('Bitte alle Felder ausfüllen.')
      return
    }
    setLaedt(true)
    try {
      const verfuegbar = await loginVerfuegbar(loginname.trim())
      if (!verfuegbar) {
        setFehler('Dieser Loginname ist bereits vergeben.')
        return
      }
      const antwort = await registrieren(loginname.trim(), email.trim(), passwort)
      sitzungSpeichern(antwort)
      if (antwort.rolle === 'SUPER_ADMIN') {
        navigate('/super', { replace: true })
      } else {
        navigate('/registrierung/team', { replace: true })
      }
    } catch (err: unknown) {
      setFehler((err as { response?: { data?: { message?: string } } }).response?.data?.message
        || 'Registrierung fehlgeschlagen.')
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
          <h2 className="text-2xl font-bold text-foreground leading-tight">Registrierung</h2>
          <p className="text-muted text-sm">1. Account · 2. Team benennen</p>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="p-3 bg-info-bg border border-info/30 rounded-control text-[13px] text-info-strong">
            Die allererste Registrierung wird Plattform-Admin (SUPER_ADMIN). Jede weitere Registrierung
            erstellt einen Team-Admin samt neuem Team. Die Registrierung ist öffentlich.
          </div>

          {fehler && (
            <div className="flex items-start gap-3 p-3 bg-danger-bg border border-danger/30 rounded-control">
              <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0 mt-0.5" />
              <p className="text-danger text-sm">{fehler}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={absenden} noValidate>
            <div>
              <label htmlFor="r-login" className="block text-xs text-muted mb-0.5">Loginname</label>
              <input
                id="r-login"
                className="input-field w-full px-3 py-2 text-sm"
                maxLength={25}
                autoComplete="username"
                placeholder="z. B. uwe72 (ohne @)"
                value={loginname}
                onChange={e => setLoginname(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-subtle mt-1">Eindeutig, max. 25 Zeichen, kein @ — der Loginname identifiziert dein Team.</p>
            </div>
            <div>
              <label htmlFor="r-email" className="block text-xs text-muted mb-0.5">E-Mail</label>
              <input
                id="r-email"
                className="input-field w-full px-3 py-2 text-sm"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <p className="text-xs text-subtle mt-1">Für „Passwort vergessen“ — dieselbe E-Mail darf in mehreren Teams mit eigenen Logins existieren.</p>
            </div>
            <div>
              <label htmlFor="r-pw" className="block text-xs text-muted mb-0.5">Passwort</label>
              <input
                id="r-pw"
                className="input-field w-full px-3 py-2 text-sm"
                type="password"
                autoComplete="new-password"
                value={passwort}
                onChange={e => setPasswort(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="r-pw2" className="block text-xs text-muted mb-0.5">Passwort wiederholen</label>
              <input
                id="r-pw2"
                className="input-field w-full px-3 py-2 text-sm"
                type="password"
                autoComplete="new-password"
                value={passwort2}
                onChange={e => setPasswort2(e.target.value)}
              />
            </div>
            <Button type="submit" size="default" className="w-full" disabled={laedt}>
              {laedt ? 'Registrieren…' : 'Weiter zu Schritt 2'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-1 text-xs">
            <Link to="/login" className="link">Schon registriert? Zum Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
