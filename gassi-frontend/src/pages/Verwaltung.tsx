import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { aktivesTeamId } from '../api/client'
import type { Teammitglied, Rolle } from '../types'
import Button from '../components/Button'
import Badge from '../components/Badge'
import CardContainer from '../components/CardContainer'
import { TableContent, TableHead, TableBody, Th } from '../components/Table'
import { Dialog } from '../components/Dialog'
import Tabs from '../components/Tabs'
import { antwort } from '../utils/fehler'
import { BereichePanel } from './Bereiche'

const FARBPALETTE = [
  '#b91c1c', '#c2410c', '#b7791f', '#4d7c0f', '#15803d', '#0f766e',
  '#0369a1', '#4338ca', '#7e22ce', '#a21caf', '#be123c', '#78716c',
]

const rolleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Plattform-Admin',
  ADMIN: 'Team-Admin',
  MITGLIED: 'Mitglied',
}

const rolleChipClass: Record<string, string> = {
  ADMIN: 'chip-success',
  MITGLIED: 'chip-warning',
}

export default function Verwaltung({ tab }: { tab: 'mitglieder' | 'bereiche' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()
  const [fehler, setFehler] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [neuOffen, setNeuOffen] = useState(false)
  const [bearbeiteId, setBearbeiteId] = useState<number | null>(null)

  const mitgliederAbfrage = useQuery<Teammitglied[]>({
    queryKey: ['mitglieder', teamId, 'alle'],
    queryFn: () => api.get(`/teams/${teamId}/mitglieder`, { params: { alle: true } }).then(r => r.data),
    enabled: teamId != null,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['mitglieder'] })
    queryClient.invalidateQueries({ queryKey: ['soll'] })
    queryClient.invalidateQueries({ queryKey: ['plan'] })
  }

  async function mitgliedAnlegen(anfrage: {
    login: string
    email: string
    passwort: string
    anzeigename: string
    farbe: string
    rolle: Rolle
  }) {
    setFehler(null)
    try {
      await api.post(`/teams/${teamId}/mitglieder`, anfrage)
      setMeldung(`Mitglied ${anfrage.anzeigename} angelegt.`)
      setNeuOffen(false)
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  async function mitgliedSpeichern(id: number, anfrage: {
    anzeigename: string
    farbe: string
    email: string
    rolle: string
    aktiv: boolean
    passwort?: string
  }) {
    setFehler(null)
    try {
      await api.put(`/teams/${teamId}/mitglieder/${id}`, anfrage)
      setMeldung('Gespeichert.')
      setBearbeiteId(null)
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  if (teamId == null) {
    return <div className="card p-4 text-sm text-muted">Kein Team-Kontext.</div>
  }

  function tabWechseln(key: string) {
    setFehler(null)
    setMeldung(null)
    if (key === 'bereiche') {
      navigate('/verwaltung/bereiche')
    } else {
      navigate('/verwaltung/teammitglieder')
    }
  }

  const mitglieder = mitgliederAbfrage.data ?? []
  const bearbeite = mitglieder.find(m => m.id === bearbeiteId) ?? null
  return (
    <div className="min-h-0">
      <Tabs
        items={[
          { key: 'mitglieder', label: 'Teammitglieder' },
          { key: 'bereiche', label: 'Bereiche' },
        ]}
        active={tab}
        onChange={tabWechseln}
      />
      {tab === 'mitglieder' ? (
        <>
        <CardContainer
          className="min-h-0"
          title="Teammitglieder"
          subtitle="Logins, Rollen und Farben — deaktivierte Mitglieder bleiben in der Historie sichtbar."
          headerRight={
            <Button size="input" onClick={() => { setNeuOffen(o => !o); setBearbeiteId(null) }}>
              Mitglied anlegen
            </Button>
          }
        >
        {meldung && (
          <div className="mx-6 mt-4 bg-success-bg border border-success/30 rounded-card p-4">
            <p className="text-success text-sm font-medium">{meldung}</p>
          </div>
        )}
        <TableContent>
          <table className="w-full">
            <TableHead>
              <tr>
                <Th>Mitglied</Th>
                <Th>Loginname</Th>
                <Th>E-Mail</Th>
                <Th>Rolle</Th>
                <Th>Aktiv</Th>
                <Th align="right">Aktionen</Th>
              </tr>
            </TableHead>
            <TableBody>
              {mitglieder.length > 0 ? (
                mitglieder.map((m, index) => (
                  <tr key={m.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                    <td className="px-2 py-2 md:px-3">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.farbe }} />
                        {m.anzeigename}
                      </span>
                    </td>
                    <td className="px-2 py-2 md:px-3 font-mono text-xs">{m.login}</td>
                    <td className="px-2 py-2 md:px-3 text-muted">{m.email}</td>
                    <td className="px-2 py-2 md:px-3">
                      {m.rolle === 'MITGLIED'
                        ? <span className={`${rolleChipClass[m.rolle]} text-xs font-medium px-2 py-0.5 rounded-badge`}>{rolleLabels[m.rolle]}</span>
                        : <Badge variant="success">{rolleLabels[m.rolle] ?? m.rolle}</Badge>}
                    </td>
                    <td className="px-2 py-2 md:px-3">
                      {m.aktiv ? <Badge variant="success">aktiv</Badge> : <Badge variant="danger">inaktiv</Badge>}
                    </td>
                    <td className="px-2 py-2 md:px-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => { setBearbeiteId(m.id); setNeuOffen(false); setMeldung(null) }}>
                        Bearbeiten
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-subtle py-8">
                    Keine Teammitglieder gefunden
                  </td>
                </tr>
              )}
            </TableBody>
          </table>
        </TableContent>
      </CardContainer>

      {neuOffen && (
        <Dialog onClose={() => setNeuOffen(false)}>
          <MitgliedAnlegen
            onAnlegen={mitgliedAnlegen}
            onAbbrechen={() => setNeuOffen(false)}
            fehler={fehler}
          />
        </Dialog>
      )}

      {bearbeite && (
        <Dialog onClose={() => setBearbeiteId(null)}>
          <MitgliedBearbeiten
            mitglied={bearbeite}
            onSpeichern={(anfrage, passwort) => mitgliedSpeichern(bearbeite.id, { ...anfrage, passwort: passwort || undefined })}
            onAbbrechen={() => setBearbeiteId(null)}
            fehler={bearbeiteId !== null ? fehler : null}
          />
        </Dialog>
      )}
        </>
      ) : (
        <BereichePanel />
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}

function Farbpalette({ wert, onWaehlen }: { wert: string; onWaehlen: (farbe: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {FARBPALETTE.map(f => (
        <button
          key={f}
          type="button"
          onClick={() => onWaehlen(f)}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${wert === f ? 'ring-2 ring-offset-2 ring-accent-ring' : ''}`}
          style={{ backgroundColor: f, borderColor: 'var(--color-border)' }}
          aria-label={`Farbe ${f}`}
        />
      ))}
    </div>
  )
}

function MitgliedBearbeiten({
  mitglied,
  onSpeichern,
  onAbbrechen,
  fehler,
}: {
  mitglied: Teammitglied
  onSpeichern: (anfrage: { anzeigename: string; farbe: string; email: string; rolle: string; aktiv: boolean }, passwort: string) => Promise<void>
  onAbbrechen: () => void
  fehler: string | null
}) {
  const [entwurf, setEntwurf] = useState({
    anzeigename: mitglied.anzeigename,
    farbe: mitglied.farbe,
    email: mitglied.email,
    rolle: mitglied.rolle,
    aktiv: mitglied.aktiv,
  })
  const [passwort, setPasswort] = useState('')
  const [laedt, setLaedt] = useState(false)

  return (
    <div>
      <h2 className="text-[16px] font-medium text-foreground mb-4">Mitglied bearbeiten — {mitglied.anzeigename}</h2>
      {fehler && (
        <div className="mb-4 bg-danger/10 border border-danger rounded-card p-4">
          <p className="text-danger text-sm font-medium">{fehler}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm text-muted mb-1">Anzeigename <span className="text-muted">*</span></label>
          <input
            value={entwurf.anzeigename}
            maxLength={50}
            onChange={e => setEntwurf(v => ({ ...v, anzeigename: e.target.value }))}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Rolle</label>
          <select
            value={entwurf.rolle}
            onChange={e => setEntwurf(v => ({ ...v, rolle: e.target.value as Rolle }))}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          >
            <option value="MITGLIED">Mitglied</option>
            <option value="ADMIN">Team-Admin</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-muted mb-1">E-Mail <span className="text-muted">*</span></label>
          <input
            value={entwurf.email}
            type="email"
            onChange={e => setEntwurf(v => ({ ...v, email: e.target.value }))}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-muted mb-2">Farbe</label>
          <Farbpalette wert={entwurf.farbe} onWaehlen={farbe => setEntwurf(v => ({ ...v, farbe }))} />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Neues Passwort (optional)</label>
          <input
            type="password"
            autoComplete="new-password"
            value={passwort}
            onChange={e => setPasswort(e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-2">Aktiv</label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={entwurf.aktiv}
              onChange={e => setEntwurf(v => ({ ...v, aktiv: e.target.checked }))}
              className="w-4 h-4"
            />
            Mitglied kann sich anmelden und zugeteilt werden
          </label>
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <Button variant="emphasized" disabled={laedt}
          onClick={async () => { setLaedt(true); await onSpeichern(entwurf, passwort); setLaedt(false) }}>
          Speichern
        </Button>
        <Button variant="ghost" onClick={onAbbrechen}>Abbrechen</Button>
      </div>
    </div>
  )
}

function MitgliedAnlegen({
  onAnlegen,
  onAbbrechen,
  fehler,
}: {
  onAnlegen: (a: { login: string; email: string; passwort: string; anzeigename: string; farbe: string; rolle: Rolle }) => Promise<void>
  onAbbrechen: () => void
  fehler: string | null
}) {
  const loginRef = useRef<HTMLInputElement>(null)
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [anzeigename, setAnzeigename] = useState('')
  const [farbe, setFarbe] = useState(FARBPALETTE[0])
  const [rolle, setRolle] = useState<Rolle>('MITGLIED')
  const [laedt, setLaedt] = useState(false)

  useEffect(() => {
    loginRef.current?.focus()
  }, [])

  return (
    <div>
      <h2 className="text-[16px] font-medium text-foreground mb-4">Neues Teammitglied</h2>
      {fehler && (
        <div className="mb-4 bg-danger/10 border border-danger rounded-card p-4">
          <p className="text-danger text-sm font-medium">{fehler}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm text-muted mb-1">Loginname <span className="text-muted">*</span></label>
          <input
            ref={loginRef}
            value={login}
            maxLength={25}
            autoComplete="off"
            onChange={e => setLogin(e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
          <p className="text-xs text-subtle mt-1">Eindeutig über die ganze Software, kein @.</p>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">E-Mail <span className="text-muted">*</span></label>
          <input
            value={email}
            type="email"
            onChange={e => setEmail(e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Passwort <span className="text-muted">*</span></label>
          <input
            type="password"
            autoComplete="new-password"
            value={passwort}
            onChange={e => setPasswort(e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Anzeigename <span className="text-muted">*</span></label>
          <input
            value={anzeigename}
            maxLength={50}
            onChange={e => setAnzeigename(e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Rolle</label>
          <select
            value={rolle}
            onChange={e => setRolle(e.target.value as Rolle)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          >
            <option value="MITGLIED">Mitglied</option>
            <option value="ADMIN">Team-Admin</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-muted mb-2">Farbe</label>
          <Farbpalette wert={farbe} onWaehlen={setFarbe} />
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <Button variant="emphasized" disabled={!login.trim() || !email.trim() || !passwort || !anzeigename.trim() || laedt}
          onClick={async () => {
            setLaedt(true)
            await onAnlegen({ login: login.trim(), email: email.trim(), passwort, anzeigename: anzeigename.trim(), farbe, rolle })
            setLaedt(false)
          }}>
          Anlegen
        </Button>
        <Button variant="ghost" onClick={onAbbrechen}>Abbrechen</Button>
      </div>
    </div>
  )
}
