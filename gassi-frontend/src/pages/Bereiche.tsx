import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../api/client'
import { aktivesTeamId } from '../api/client'
import type { Aufgabe, Bereich, SollListe, Zeitfenster } from '../types'
import Button from '../components/Button'
import Badge from '../components/Badge'
import CardContainer from '../components/CardContainer'
import { Dialog } from '../components/Dialog'
import { antwort } from '../utils/fehler'

export function BereichePanel() {
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()
  const [fehler, setFehler] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [neuOffen, setNeuOffen] = useState(false)
  const [offenId, setOffenId] = useState<number | null>(null)

  const bereicheAbfrage = useQuery<Bereich[]>({
    queryKey: ['bereiche', teamId, 'alle'],
    queryFn: () => api.get(`/teams/${teamId}/bereiche`, { params: { alle: true } }).then(r => r.data),
    enabled: teamId != null,
  })

  const sensoren = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  )

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['bereiche'] })
    queryClient.invalidateQueries({ queryKey: ['zeitfenster'] })
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] })
    queryClient.invalidateQueries({ queryKey: ['soll'] })
    queryClient.invalidateQueries({ queryKey: ['plan'] })
    queryClient.invalidateQueries({ queryKey: ['statistik'] })
  }

  async function bereichAnlegen(name: string) {
    setFehler(null)
    try {
      await api.post(`/teams/${teamId}/bereiche`, { name })
      setMeldung(`Bereich „${name}“ angelegt.`)
      setNeuOffen(false)
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  async function positionenSpeichern(id: number, position: number) {
    try {
      await api.put(`/teams/${teamId}/bereiche/${id}`, { position })
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  async function beimSortieren(ereignis: DragEndEvent) {
    const liste = bereicheAbfrage.data ?? []
    if (!ereignis.over || ereignis.active.id === ereignis.over.id) return
    const von = liste.findIndex(b => b.id === ereignis.active.id)
    const nach = liste.findIndex(b => b.id === ereignis.over!.id)
    if (von < 0 || nach < 0) return
    const neu = arrayMove(liste, von, nach)
    for (let i = 0; i < neu.length; i++) {
      if (neu[i].position !== i) {
        await positionenSpeichern(neu[i].id, i)
      }
    }
  }

  if (teamId == null) {
    return <div className="card p-4 text-sm text-muted">Kein Team-Kontext.</div>
  }

  return (
    <div className="max-w-4xl">
      {meldung && (
        <div className="card p-3 text-sm mb-4" style={{ backgroundColor: 'var(--color-success-bg)' }}>
          <p className="text-success">{meldung}</p>
        </div>
      )}
      {fehler && (
        <div className="card p-3 text-sm mb-4" style={{ backgroundColor: 'var(--color-danger-bg)' }}>
          <p className="text-danger">{fehler}</p>
        </div>
      )}

      <CardContainer
        title="Bereiche"
        subtitle="Ziehen, um die Reihenfolge der Tabs im Plan zu ändern."
        headerRight={
          <Button size="input" onClick={() => { setNeuOffen(true); setOffenId(null) }}>
            Bereich anlegen
          </Button>
        }
      >
        <div className="px-4 md:px-6 pt-4 pb-6 space-y-3">
          {bereicheAbfrage.isLoading ? (
            <p className="text-muted text-sm">Laden...</p>
          ) : (
            <DndContext sensors={sensoren} collisionDetection={closestCenter} onDragEnd={beimSortieren}>
              <SortableContext items={(bereicheAbfrage.data ?? []).map(b => b.id)} strategy={verticalListSortingStrategy}>
                {(bereicheAbfrage.data ?? []).map(bereich => (
                  <BereichKarte
                    key={bereich.id}
                    bereich={bereich}
                    offen={offenId === bereich.id}
                    onToggle={() => {
                      setOffenId(aktuell => aktuell === bereich.id ? null : bereich.id)
                      setNeuOffen(false)
                    }}
                    onGeaendert={invalidate}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </CardContainer>

      {neuOffen && (
        <Dialog onClose={() => setNeuOffen(false)}>
          <NeuFormular
            onAnlegen={bereichAnlegen}
            onAbbrechen={() => setNeuOffen(false)}
          />
        </Dialog>
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}

function BereichKarte({
  bereich,
  offen,
  onToggle,
  onGeaendert,
}: {
  bereich: Bereich
  offen: boolean
  onToggle: () => void
  onGeaendert: () => void
}) {
  const teamId = aktivesTeamId()

  const zeitfensterAbfrage = useQuery<Zeitfenster[]>({
    queryKey: ['zeitfenster', bereich.id],
    queryFn: () => api.get(`/teams/${teamId}/bereiche/${bereich.id}/zeitfenster`, { params: { alle: true } }).then(r => r.data),
  })

  const aufgabenAbfrage = useQuery<Aufgabe[]>({
    queryKey: ['aufgaben', bereich.id],
    queryFn: () => api.get(`/teams/${teamId}/bereiche/${bereich.id}/aufgaben`, { params: { aktive: false } }).then(r => r.data),
  })

  const zeitfenster = zeitfensterAbfrage.data ?? []
  const aufgaben = aufgabenAbfrage.data ?? []
  const ladedInhalt = zeitfensterAbfrage.isLoading || aufgabenAbfrage.isLoading

  return (
    <div className="card">
      <ZeilenKopf bereich={bereich} zeitfenster={zeitfenster} aufgaben={aufgaben} offen={offen} onToggle={onToggle} />
      {offen && (
        <div className="px-4 pb-4 pt-4 border-t border-border space-y-5">
          <BereichFormular bereich={bereich} onGeaendert={onGeaendert} />
          <ZeitfensterVerwaltung
            bereichId={bereich.id}
            zeitfenster={zeitfenster}
            aufgaben={aufgaben}
            laedt={ladedInhalt}
            onGeaendert={onGeaendert}
          />
          <SollTabelle bereichId={bereich.id} />
        </div>
      )}
    </div>
  )
}

function ZeilenKopf({
  bereich,
  zeitfenster,
  aufgaben,
  offen,
  onToggle,
}: {
  bereich: Bereich
  zeitfenster: Zeitfenster[]
  aufgaben: Aufgabe[]
  offen: boolean
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bereich.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 40 : undefined }}
      className="flex items-start gap-3 p-4"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1.5 mt-0.5 rounded-control text-subtle hover:text-muted hover:bg-card-hover cursor-grab touch-none shrink-0"
        title="Reihenfolge ändern"
      >
        <i className="sap-icon sap-icon-drag text-[16px]" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[15px]">{bereich.name}</span>
          {bereich.aktiv
            ? <Badge variant="success">aktiv</Badge>
            : <Badge variant="danger">inaktiv</Badge>}
        </div>
        {zeitfenster.length > 0 && (
          <div className="mt-2 space-y-2">
            {zeitfenster.map(zf => {
              const zfAufgaben = aufgaben.filter(a => a.zeitfensterId === zf.id)
              return (
                <div key={zf.id}>
                  <div className={`text-xs font-medium ${zf.aktiv ? 'text-muted' : 'text-subtle'}`}>
                    {zf.name} ({zfAufgaben.length}){!zf.aktiv && ' · inaktiv'}
                  </div>
                  {zfAufgaben.length > 0 && (
                    <div className="ml-1 border-l border-border pl-3 mt-1 space-y-0.5">
                      {zfAufgaben.map(a => (
                        <div key={a.id} className="text-xs text-subtle">
                          {a.name}{!a.aktiv && ' (inaktiv)'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={onToggle} className="shrink-0">
        {offen ? 'Schließen' : 'Bearbeiten'}
      </Button>
    </div>
  )
}

function BereichFormular({
  bereich,
  onGeaendert,
}: {
  bereich: Bereich
  onGeaendert: () => void
}) {
  const teamId = aktivesTeamId()
  const [name, setName] = useState(bereich.name)
  const [aktiv, setAktiv] = useState(bereich.aktiv)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function invalidate() {
    onGeaendert()
  }

  async function speichern() {
    setFehler(null)
    setLaedt(true)
    try {
      await api.put(`/teams/${teamId}/bereiche/${bereich.id}`, { name: name.trim(), aktiv })
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle mb-2">Bereich</p>
      {fehler && (
        <div className="mb-2 p-2.5 bg-danger-bg border border-danger/30 rounded-control text-[13px] text-danger">{fehler}</div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="block text-xs text-muted mb-0.5">Name</label>
          <input
            value={name}
            maxLength={50}
            onChange={e => setName(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={aktiv} onChange={e => setAktiv(e.target.checked)} className="w-4 h-4" />
          aktiv (Tab im Wochenplan)
        </label>
        <div className="pb-1.5">
          <Button size="compact" disabled={!name.trim() || laedt || (name.trim() === bereich.name && aktiv === bereich.aktiv)}
            onClick={speichern}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
}

function ZeitfensterVerwaltung({
  bereichId,
  zeitfenster,
  aufgaben,
  laedt,
  onGeaendert,
}: {
  bereichId: number
  zeitfenster: Zeitfenster[]
  aufgaben: Aufgabe[]
  laedt: boolean
  onGeaendert: () => void
}) {
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()
  const [fehler, setFehler] = useState<string | null>(null)
  const [neuerName, setNeuerName] = useState('')
  const [laedtNeu, setLaedtNeu] = useState(false)

  const sensoren = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  )

  async function zeitfensterAnlegen() {
    if (!neuerName.trim()) return
    setFehler(null)
    setLaedtNeu(true)
    try {
      await api.post(`/teams/${teamId}/bereiche/${bereichId}/zeitfenster`, { name: neuerName.trim() })
      setNeuerName('')
      onGeaendert()
    } catch (e) {
      setFehler(antwort(e))
    } finally {
      setLaedtNeu(false)
    }
  }

  async function positionenSpeichern(id: number, position: number) {
    try {
      await api.put(`/teams/${teamId}/bereiche/${bereichId}/zeitfenster/${id}`, { position })
      queryClient.invalidateQueries({ queryKey: ['zeitfenster', bereichId] })
      queryClient.invalidateQueries({ queryKey: ['plan'] })
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  async function beimSortieren(ereignis: DragEndEvent) {
    if (!ereignis.over || ereignis.active.id === ereignis.over.id) return
    const von = zeitfenster.findIndex(z => z.id === ereignis.active.id)
    const nach = zeitfenster.findIndex(z => z.id === ereignis.over!.id)
    if (von < 0 || nach < 0) return
    const neu = arrayMove(zeitfenster, von, nach)
    for (let i = 0; i < neu.length; i++) {
      if (neu[i].position !== i) {
        await positionenSpeichern(neu[i].id, i)
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Zeitfenster</p>
        <span className="text-xs text-subtle">Priorität = Reihenfolge (ziehen)</span>
      </div>
      {fehler && (
        <div className="mb-2 p-2.5 bg-danger-bg border border-danger/30 rounded-control text-[13px] text-danger">{fehler}</div>
      )}
      {laedt ? (
        <p className="text-sm text-subtle">Laden...</p>
      ) : zeitfenster.length === 0 ? (
        <p className="text-sm text-subtle">Noch keine Zeitfenster in diesem Bereich.</p>
      ) : (
        <DndContext sensors={sensoren} collisionDetection={closestCenter} onDragEnd={beimSortieren}>
          <SortableContext
            items={zeitfenster.map(z => z.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {zeitfenster.map(zf => (
                <ZeitfensterKarte
                  key={zf.id}
                  zeitfenster={zf}
                  bereichId={bereichId}
                  aufgaben={aufgaben.filter(a => a.zeitfensterId === zf.id)}
                  onGeaendert={onGeaendert}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <div className="border border-dashed border-border rounded-card p-3 space-y-2 mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Neues Zeitfenster</p>
        <div className="flex gap-2">
          <input
            value={neuerName}
            maxLength={100}
            placeholder="z. B. Morgens"
            onChange={e => setNeuerName(e.target.value)}
            className="input-field flex-1 px-3 py-2 text-sm"
          />
          <Button size="compact" disabled={!neuerName.trim() || laedtNeu} onClick={zeitfensterAnlegen}>
            Anlegen
          </Button>
        </div>
      </div>
    </div>
  )
}

function ZeitfensterKarte({
  zeitfenster,
  bereichId,
  aufgaben,
  onGeaendert,
}: {
  zeitfenster: Zeitfenster
  bereichId: number
  aufgaben: Aufgabe[]
  onGeaendert: () => void
}) {
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: zeitfenster.id })
  const [bearbeite, setBearbeite] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['zeitfenster', bereichId] })
    queryClient.invalidateQueries({ queryKey: ['aufgaben', bereichId] })
    queryClient.invalidateQueries({ queryKey: ['soll'] })
    queryClient.invalidateQueries({ queryKey: ['plan'] })
    queryClient.invalidateQueries({ queryKey: ['statistik'] })
    onGeaendert()
  }

  async function aufgabeAnlegen(name: string) {
    setFehler(null)
    try {
      await api.post(`/teams/${teamId}/bereiche/${bereichId}/zeitfenster/${zeitfenster.id}/aufgaben`, { name })
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  async function aufgabeSpeichern(id: number, name: string, aktiv: boolean) {
    setFehler(null)
    try {
      await api.put(`/teams/${teamId}/bereiche/${bereichId}/aufgaben/${id}`, { name, aktiv })
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  async function zeitfensterSpeichern(name: string, aktiv: boolean) {
    setFehler(null)
    try {
      await api.put(`/teams/${teamId}/bereiche/${bereichId}/zeitfenster/${zeitfenster.id}`, { name, aktiv })
      invalidate()
    } catch (e) {
      setFehler(antwort(e))
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 40 : undefined }}
      className={`border border-border rounded-card p-3 space-y-3 ${zeitfenster.aktiv ? '' : 'bg-elevated'}`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded-control text-subtle hover:text-muted hover:bg-card-hover cursor-grab touch-none shrink-0"
          title="Priorität ändern"
        >
          <i className="sap-icon sap-icon-drag text-[14px]" />
        </button>
        <span className="font-medium text-sm flex-1 min-w-0 truncate">{zeitfenster.name}</span>
        {zeitfenster.aktiv
          ? <Badge variant="success">aktiv</Badge>
          : <Badge variant="danger">inaktiv</Badge>}
        <Badge variant="muted">{aufgaben.length} Aufgaben</Badge>
        <Button size="sm" variant="secondary" onClick={() => setBearbeite(b => !b)} className="shrink-0">
          {bearbeite ? 'Abbrechen' : 'Bearbeiten'}
        </Button>
      </div>

      {bearbeite && (
        <ZeitfensterFormular
          anfangsName={zeitfenster.name}
          anfangsAktiv={zeitfenster.aktiv}
          onSpeichern={async (name, aktiv) => { await zeitfensterSpeichern(name, aktiv); setBearbeite(false) }}
          onAbbrechen={() => setBearbeite(false)}
        />
      )}

      {fehler && (
        <div className="p-2.5 bg-danger-bg border border-danger/30 rounded-control text-[13px] text-danger">{fehler}</div>
      )}

      {aufgaben.length === 0 ? (
        <p className="text-sm text-subtle pl-1">Noch keine Aufgaben in diesem Zeitfenster.</p>
      ) : (
        <div className="ml-1 border-l border-border pl-3 space-y-2">
          {aufgaben.map(a => (
            <AufgabeZeile key={a.id} aufgabe={a} onSpeichern={aufgabeSpeichern} />
          ))}
        </div>
      )}
      <AufgabeNeu onAnlegen={aufgabeAnlegen} />
    </div>
  )
}

function ZeitfensterFormular({
  anfangsName,
  anfangsAktiv,
  onSpeichern,
  onAbbrechen,
}: {
  anfangsName: string
  anfangsAktiv: boolean
  onSpeichern: (name: string, aktiv: boolean) => Promise<void>
  onAbbrechen: () => void
}) {
  const [name, setName] = useState(anfangsName)
  const [aktiv, setAktiv] = useState(anfangsAktiv)
  const [laedt, setLaedt] = useState(false)

  return (
    <div className="p-3 bg-elevated rounded-card space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <label className="block text-xs text-muted mb-0.5">Name</label>
          <input
            value={name}
            maxLength={100}
            onChange={e => setName(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={aktiv} onChange={e => setAktiv(e.target.checked)} className="w-4 h-4" />
          aktiv (Zeitfenster erscheint im Wochenplan)
        </label>
        <div className="pb-1.5 flex gap-2">
          <Button size="compact" disabled={!name.trim() || laedt}
            onClick={async () => { setLaedt(true); await onSpeichern(name.trim(), aktiv); setLaedt(false) }}>
            Speichern
          </Button>
          <Button size="compact" variant="ghost" onClick={onAbbrechen}>Abbrechen</Button>
        </div>
      </div>
    </div>
  )
}

function AufgabeZeile({
  aufgabe,
  onSpeichern,
}: {
  aufgabe: Aufgabe
  onSpeichern: (id: number, name: string, aktiv: boolean) => Promise<void>
}) {
  const [offen, setOpen] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`text-sm flex-1 min-w-0 truncate ${aufgabe.aktiv ? 'font-medium' : 'text-subtle'}`}>{aufgabe.name}</span>
        {aufgabe.aktiv
          ? null
          : <Badge variant="danger">inaktiv</Badge>}
        <Button size="sm" variant="secondary" onClick={() => setOpen(o => !o)}>
          {offen ? 'Abbrechen' : 'Bearbeiten'}
        </Button>
      </div>
      {offen && (
        <AufgabeFormular
          anfangsName={aufgabe.name}
          anfangsAktiv={aufgabe.aktiv}
          onSpeichern={async (name, aktiv) => { await onSpeichern(aufgabe.id, name, aktiv); setOpen(false) }}
        />
      )}
    </div>
  )
}

function AufgabeFormular({
  anfangsName,
  anfangsAktiv,
  onSpeichern,
}: {
  anfangsName: string
  anfangsAktiv: boolean
  onSpeichern: (name: string, aktiv: boolean) => Promise<void>
}) {
  const [name, setName] = useState(anfangsName)
  const [aktiv, setAktiv] = useState(anfangsAktiv)
  const [laedt, setLaedt] = useState(false)

  return (
    <div className="mt-2 p-3 bg-elevated rounded-card space-y-3">
      <div>
        <label className="block text-xs text-muted mb-0.5">Name</label>
        <input
          value={name}
          maxLength={100}
          onChange={e => setName(e.target.value)}
          className="input-field w-full px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={aktiv} onChange={e => setAktiv(e.target.checked)} className="w-4 h-4" />
        aktiv (gilt an allen 7 Tagen der Woche)
      </label>
      <div className="flex gap-2">
        <Button size="compact" disabled={!name.trim() || laedt}
          onClick={async () => { setLaedt(true); await onSpeichern(name.trim(), aktiv); setLaedt(false) }}>
          Speichern
        </Button>
      </div>
    </div>
  )
}

function AufgabeNeu({
  onAnlegen,
}: {
  onAnlegen: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex gap-2 pl-1">
      <input
        ref={nameRef}
        value={name}
        maxLength={100}
        placeholder="Neue Aufgabe, z. B. Gassi Bella"
        onChange={e => setName(e.target.value)}
        className="input-field flex-1 px-3 py-2 text-sm"
      />
      <Button size="compact" disabled={!name.trim()}
        onClick={async () => { await onAnlegen(name.trim()); setName('') }}>
        Anlegen
      </Button>
    </div>
  )
}

function SollTabelle({ bereichId }: { bereichId: number }) {
  const queryClient = useQueryClient()
  const teamId = aktivesTeamId()
  const sollAbfrage = useQuery<SollListe>({
    queryKey: ['soll', bereichId],
    queryFn: () => api.get(`/teams/${teamId}/bereiche/${bereichId}/soll`).then(r => r.data),
  })
  const [entwurf, setEntwurf] = useState<Record<number, number>>({})
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const daten = sollAbfrage.data

  async function speichern() {
    if (!daten) return
    setFehler(null)
    setLaedt(true)
    try {
      const anfragen = daten.eintraege
        .filter(e => entwurf[e.mitgliedId] !== undefined)
        .map(e => ({ mitgliedId: e.mitgliedId, wert: entwurf[e.mitgliedId] }))
      if (anfragen.length > 0) {
        await api.put(`/teams/${teamId}/bereiche/${bereichId}/soll`, anfragen)
      }
      queryClient.invalidateQueries({ queryKey: ['soll', bereichId] })
      queryClient.invalidateQueries({ queryKey: ['plan'] })
      setEntwurf({})
    } catch (e) {
      setFehler(antwort(e))
    } finally {
      setLaedt(false)
    }
  }

  if (sollAbfrage.isLoading) {
    return <p className="text-sm text-subtle">Soll wird geladen…</p>
  }
  if (!daten) {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Soll pro Teammitglied (Zuteilungen/Woche)</p>
        <span className="text-xs tabular-nums text-muted">
          Σ {daten.sollSumme} / Aufkommen {daten.aufkommenProWoche}
        </span>
      </div>
      {daten.summenwarnung && (
        <div className="p-2.5 mb-2 bg-warning-bg border border-warning/30 rounded-control text-[13px] text-warning">
          Warnung: Die Soll-Summe ({daten.sollSumme}) entspricht nicht dem Wochenaufkommen ({daten.aufkommenProWoche}) dieses Bereichs.
        </div>
      )}
      <div className="space-y-1.5">
        {daten.eintraege.map(e => (
          <div key={e.mitgliedId} className="flex items-center gap-2">
            <span className={`text-sm flex-1 min-w-0 truncate ${e.aktiv ? '' : 'text-subtle'}`}>
              {e.anzeigename}{!e.aktiv && ' (inaktiv)'}
            </span>
            <input
              type="number"
              min={0}
              value={entwurf[e.mitgliedId] ?? e.wert}
              onChange={ev => setEntwurf(v => ({ ...v, [e.mitgliedId]: Number(ev.target.value) }))}
              className="input-field w-20 px-2 py-1 text-sm text-right tabular-nums"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="compact" disabled={laedt} onClick={speichern}>Soll speichern</Button>
        {fehler && <p className="text-danger text-sm">{fehler}</p>}
      </div>
    </div>
  )
}

function NeuFormular({
  onAnlegen,
  onAbbrechen,
}: {
  onAnlegen: (name: string) => Promise<void>
  onAbbrechen: () => void
}) {
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const [laedt, setLaedt] = useState(false)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  return (
    <div>
      <h2 className="text-[16px] font-medium text-foreground mb-4">Neuer Bereich</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Name <span className="text-muted">*</span></label>
          <input
            ref={nameRef}
            value={name}
            maxLength={50}
            onChange={e => setName(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-4">
          <Button variant="emphasized" disabled={!name.trim() || laedt}
            onClick={async () => { setLaedt(true); await onAnlegen(name.trim()); setLaedt(false) }}>
            Anlegen
          </Button>
          <Button variant="ghost" onClick={onAbbrechen}>Abbrechen</Button>
        </div>
      </div>
    </div>
  )
}
