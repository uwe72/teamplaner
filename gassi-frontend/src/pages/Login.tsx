import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { sitzungSpeichern } from '../api/client'
import { zielNachLogin } from '../utils/ziel'
import type { AuthAntwort } from '../types'
import Button from '../components/Button'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryFrom = new URLSearchParams(window.location.search).get('from')
  const locationState = queryFrom
    ? { from: decodeURIComponent(queryFrom) }
    : location.state
  const [loginname, setLoginname] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    if (!loginname.trim() || !passwort) {
      setFehler('Bitte Loginname und Passwort eingeben.')
      return
    }
    setLaedt(true)
    try {
      const antwort: AuthAntwort = await login(loginname.trim(), passwort)
      sitzungSpeichern(antwort)
      if (antwort.teamOeffen) {
        navigate('/registrierung/team', { replace: true })
      } else {
        navigate(zielNachLogin(locationState, antwort.rolle), { replace: true })
      }
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code
      setFehler(code === 'LOGIN_FEHLGESCHLAGEN'
        ? 'Loginname oder Passwort ist falsch.'
        : 'Anmeldung fehlgeschlagen — läuft der Server auf Port 8080?')
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 overflow-hidden bg-background">
      <img
        src="/background.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="img-overlay" />

      <div className="relative bg-surface/70 backdrop-blur-md border border-border rounded-card w-full max-w-[440px] flex flex-col shadow-2xl gassi-login-enter">
        <div className="flex flex-col items-center text-center gap-1 px-6 pt-8 pb-2">
          <h2 className="text-2xl font-bold text-foreground leading-tight">Willkommen</h2>
          <p className="text-muted text-sm">Teamplaner — wer macht was?</p>
        </div>

        <div className="px-6 pb-6 pt-2">
          <form className="space-y-4" onSubmit={absenden} noValidate>
            {fehler && (
              <div className="flex items-start gap-3 p-3 bg-danger-bg border border-danger/30 rounded-control">
                <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0 mt-0.5" />
                <p className="text-danger text-sm">{fehler}</p>
              </div>
            )}

            <div>
              <label htmlFor="loginname" className="block text-xs text-muted mb-0.5">Loginname</label>
              <input
                id="loginname"
                className="input-field w-full px-3 py-2 text-sm"
                type="text"
                autoComplete="username"
                maxLength={25}
                placeholder="z. B. uwe72"
                value={loginname}
                onChange={e => setLoginname(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="passwort" className="block text-xs text-muted mb-0.5">Passwort</label>
              <input
                id="passwort"
                className="input-field w-full px-3 py-2 text-sm"
                type="password"
                autoComplete="current-password"
                value={passwort}
                onChange={e => setPasswort(e.target.value)}
              />
            </div>

            <Button type="submit" size="default" className="w-full" disabled={laedt}>
              {laedt ? 'Anmelden…' : 'Anmelden'}
            </Button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-1 text-xs">
            <Link to="/passwort-vergessen" className="link">Passwort vergessen?</Link>
            <Link to="/loginname-vergessen" className="link">Loginname vergessen?</Link>
            <Link to="/registrierung" className="link font-medium">Neues Team registrieren</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
