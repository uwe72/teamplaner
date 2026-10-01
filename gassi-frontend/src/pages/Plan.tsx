import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { aktivesTeamId, aktivesTeamName, sitzungLaden } from '../api/client'
import api from '../api/client'
import type { FehlerAntwort, PlanDto } from '../types'
import { aktuelleIsoWocheJetzt, heutigesDatum, isoNummer, verschiebeIsoWoche, wochenbereich, type IsoWoche } from '../utils/datum'
import { holeEigeneId } from '../utils/eigeneId'
import useIsMobile from '../hooks/useIsMobile'
import useBereiche from '../hooks/useBereiche'
import PersonenLeiste from '../components/PersonenLeiste'
import PlanRaster from '../components/PlanRaster'
import PlanRasterMobil from '../components/PlanRasterMobil'
import AuswahlOverlay from '../components/AuswahlOverlay'
import CardContainer from '../components/CardContainer'
import Button from '../components/Button'
import useHorizontalSwipe from '../hooks/useHorizontalSwipe'

export default function Plan() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const params = useParams()
  const teamId = aktivesTeamId()
  const person = sitzungLaden()?.person
  const eigeneId = holeEigeneId()
  const istAdmin = person?.rolle === 'ADMIN' || person?.rolle === 'SUPER_ADMIN'
  const isMobile = useIsMobile()

  const [fokus, setFokus] = useState<IsoWoche | null>(null)
  const urlBereichId = params.bereichId ? Number(params.bereichId) : null
  const bereichId = urlBereichId != null && Number.isFinite(urlBereichId) ? urlBereichId : null
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<
    | { typ: 'aufgabe'; aufgabeId: number; datum: string; belegterName: string | null }
    | { typ: 'zeitfenster'; zeitfensterId: number; zeitfensterName: string; datum: string }
    | null
  >(null)

  const bereicheAbfrage = useBereiche()

  useEffect(() => {
    if (bereichId == null || !bereicheAbfrage.data) return
    const aktive = bereicheAbfrage.data.filter(b => b.aktiv)
    if (aktive.length === 0) return
    if (!aktive.some(b => b.id === bereichId)) {
      navigate(`/plan/${aktive[0].id}`, { replace: true })
    }
  }, [bereicheAbfrage.data, bereichId, navigate])

  const zielWoche = fokus ?? aktuelleIsoWocheJetzt()
  const heute = heutigesDatum()

  const planAbfrage = useQuery<PlanDto>({
    queryKey: ['plan', teamId, bereichId, zielWoche.isoJahr, zielWoche.isoWoche],
    queryFn: () => api.get(`/teams/${teamId}/plan`, {
      params: { bereichId, isoJahr: zielWoche.isoJahr, isoWoche: zielWoche.isoWoche },
    }).then(r => r.data),
    enabled: teamId != null && bereichId != null,
    retry: false,
  })

  const sensoren = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  )

  async function zuweisen(aufgabeId: number, datum: string, mitgliedId: number) {
    try {
      await api.post(`/teams/${teamId}/zuteilungen`, { aufgabeId, datum, mitgliedId })
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    }
  }

  async function zeitfensterZuweisen(zeitfensterId: number, datum: string, mitgliedId: number) {
    try {
      await api.post(`/teams/${teamId}/zeitfenster/${zeitfensterId}/zuteilungen`, { datum, mitgliedId })
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    }
  }

  async function freigeben(aufgabeId: number, datum: string) {
    const zeile = planAbfrage.data?.gruppen.flatMap(g => g.zeilen).find(z => z.aufgabe.id === aufgabeId)
    const zuteilung = zeile?.zuteilungen.find(z => z.datum === datum)
    if (!zuteilung?.id) return
    try {
      await api.delete(`/teams/${teamId}/zuteilungen/${zuteilung.id}`)
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    }
  }

  function beimAblegen(ereignis: DragEndEvent) {
    const aktiv = String(ereignis.active.id)
    if (!aktiv.startsWith('karte-') || !ereignis.over) return
    const mitgliedId = Number(aktiv.replace('karte-', ''))
    const ziel = String(ereignis.over.id)
    if (ziel.startsWith('box-')) {
      const rest = ziel.replace('box-', '')
      const trenner = rest.indexOf('-')
      const aufgabeId = Number(rest.slice(0, trenner))
      const datum = rest.slice(trenner + 1)
      if (!Number.isFinite(aufgabeId) || !datum) return
      const zuteilung = planAbfrage.data?.gruppen.flatMap(g => g.zeilen).find(z => z.aufgabe.id === aufgabeId)
        ?.zuteilungen.find(z => z.datum === datum)
      if (zuteilung && datum < heute && !istAdmin) {
        setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
        return
      }
      zuweisen(aufgabeId, datum, mitgliedId)
      return
    }
    if (ziel.startsWith('zf-')) {
      const rest = ziel.replace('zf-', '')
      const trenner = rest.indexOf('-')
      const zeitfensterId = Number(rest.slice(0, trenner))
      const datum = rest.slice(trenner + 1)
      if (!Number.isFinite(zeitfensterId) || !datum) return
      if (datum < heute && !istAdmin) {
        setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
        return
      }
      zeitfensterZuweisen(zeitfensterId, datum, mitgliedId)
    }
  }

  function nachErfolg() {
    setHinweis(null)
    queryClient.invalidateQueries({ queryKey: ['plan'] })
    queryClient.invalidateQueries({ queryKey: ['statistik'] })
  }

  function nachFehler(e: unknown) {
    const antwort = (e as { response?: { data?: FehlerAntwort } }).response?.data
    setHinweis(antwort ? `${antwort.message}` : 'Aktion fehlgeschlagen — bitte erneut versuchen.')
    queryClient.invalidateQueries({ queryKey: ['plan'] })
  }

  const wocheLabel = useMemo(() => `KW ${zielWoche.isoWoche}/${zielWoche.isoJahr} (${wochenbereich(zielWoche)})`, [zielWoche])
  const swipeRef = useHorizontalSwipe(
    () => setFokus(verschiebeIsoWoche(zielWoche, 1)),
    () => setFokus(verschiebeIsoWoche(zielWoche, -1)),
    isMobile
  )

  if (teamId == null) {
    return <div className="card p-4 text-sm text-muted">Kein Team-Kontext — bitte neu anmelden.</div>
  }

  const aktiveBereiche = (bereicheAbfrage.data ?? []).filter(b => b.aktiv)
  const bereichName = bereichId ? aktiveBereiche.find(b => b.id === bereichId)?.name ?? '' : ''
  const istSumme = planAbfrage.data?.mitglieder.reduce((s, m) => s + m.ist, 0) ?? 0
  const sollSumme = planAbfrage.data?.mitglieder.reduce((s, m) => s + m.soll, 0) ?? 0
  const istSollUnterschritten = planAbfrage.data?.mitglieder.some(m => m.sollUnterschritten) ?? false
  const istAktuelleWoche = isoNummer(zielWoche) === isoNummer(aktuelleIsoWocheJetzt())
  const wocheTitel = istAktuelleWoche
    ? 'aktuelle Woche'
    : isoNummer(zielWoche) < isoNummer(aktuelleIsoWocheJetzt()) ? 'vergangene Woche' : 'zukünftige Woche'

  return (
    <div ref={swipeRef} className="md:h-full md:flex md:flex-col md:min-h-0">
      {!isMobile && aktivesTeamName() && (
        <div className="card px-4 py-2.5 text-sm mb-4 flex items-center justify-between" style={{ backgroundColor: 'var(--color-info-bg)' }}>
          <span>
            <span className="text-muted">Team: </span>
            <span className="font-semibold">{aktivesTeamName()}</span>
            <span className="text-muted ml-3">·</span>
            <span className="font-semibold ml-3">{wocheLabel}</span>
          </span>
          <span className="text-xs text-muted">{wocheTitel}</span>
        </div>
      )}

      {hinweis && (
        <div className="card p-3 text-sm mb-4 flex items-start justify-between" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
          <span>{hinweis}</span>
          <button className="ml-2 underline shrink-0" onClick={() => setHinweis(null)}>ok</button>
        </div>
      )}

      <DndContext sensors={sensoren} onDragEnd={beimAblegen}>
      {isMobile ? (
        <div className="px-3 pt-2 pb-1 flex flex-col gap-1.5">
          <div className="bg-card border border-border rounded-card px-3 py-2 mb-1 flex flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {wocheLabel}
              </span>
              <span className="truncate" />
              <button
                className="inline-flex items-center shrink-0 ml-auto px-2 h-6 rounded-badge text-[11px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: istAktuelleWoche ? 'var(--color-accent)' : 'var(--color-accent-soft)',
                  color: istAktuelleWoche ? '#fff' : 'var(--color-accent)',
                  border: istAktuelleWoche ? 'none' : '1px solid var(--color-accent-ring)',
                }}
                disabled={istAktuelleWoche}
                onClick={() => setFokus(null)}
              >
                {wocheTitel}
              </button>
              {planAbfrage.data && (
                <span
                  className="inline-flex items-center justify-center px-2 h-6 rounded-badge text-[11px] font-bold tabular-nums shrink-0"
                  style={{
                    backgroundColor: istSollUnterschritten ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                    color: istSollUnterschritten ? 'var(--color-danger)' : 'var(--color-success)',
                  }}
                  title={`Ist ${istSumme}, Soll ${sollSumme} im Bereich ${bereichName}`}
                >
                  {istSumme}/{sollSumme}
                </span>
              )}
            </div>
          </div>
          {planAbfrage.data && (
            <PersonenLeiste mitglieder={planAbfrage.data.mitglieder} eigeneId={eigeneId} label={false} kompakt />
          )}
        </div>
      ) : null}

      <div style={isMobile ? { touchAction: 'pan-y' } : undefined}>
        <CardContainer
          className={isMobile ? 'max-md:bg-transparent max-md:border-0 max-md:shadow-none' : ''}
          title={isMobile ? null : `Wochenplan ${bereichName ? `— ${bereichName}` : ''}`}
          headerRight={isMobile ? null : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="compact" onClick={() => setFokus(verschiebeIsoWoche(zielWoche, -1))} aria-label="Vorherige Woche">
                <ChevronLeft size={16} />
              </Button>
              <button
                className="text-xs text-muted hover:text-foreground underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
                disabled={istAktuelleWoche}
                onClick={() => setFokus(null)}
              >
                aktuelle Woche
              </button>
              <Button variant="secondary" size="compact" onClick={() => setFokus(verschiebeIsoWoche(zielWoche, 1))} aria-label="Nächste Woche">
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        >
          {planAbfrage.isLoading || !planAbfrage.data ? (
            <div className="text-center py-8 text-muted">{planAbfrage.isLoading ? 'Laden...' : 'Kein Plan — lege zuerst einen Bereich und Aufgaben an.'}</div>
          ) : isMobile ? (
            <PlanRasterMobil
              plan={planAbfrage.data}
              aktionen={{
                eigeneId,
                istAdmin: !!istAdmin,
                heute,
                onBoxKlick: (aufgabeId, datum, belegterName) => setOverlay({ typ: 'aufgabe', aufgabeId, datum, belegterName }),
                onZeitfensterKlick: (zeitfensterId, datum) => {
                  const gruppe = planAbfrage.data?.gruppen.find(g => g.zeitfensterId === zeitfensterId)
                  if (!gruppe) return
                  setOverlay({ typ: 'zeitfenster', zeitfensterId, zeitfensterName: gruppe.zeitfensterName, datum })
                },
              }}
            />
          ) : (
            <PlanRaster
              plan={planAbfrage.data}
              aktionen={{
                eigeneId,
                istAdmin: !!istAdmin,
                heute,
                onBoxKlick: (aufgabeId, datum, belegterName) => setOverlay({ typ: 'aufgabe', aufgabeId, datum, belegterName }),
                onZeitfensterKlick: (zeitfensterId, datum) => {
                  const gruppe = planAbfrage.data?.gruppen.find(g => g.zeitfensterId === zeitfensterId)
                  if (!gruppe) return
                  setOverlay({ typ: 'zeitfenster', zeitfensterId, zeitfensterName: gruppe.zeitfensterName, datum })
                },
              }}
            />
          )}
        </CardContainer>
      </div>
      </DndContext>

      {overlay && planAbfrage.data && (
        overlay.typ === 'aufgabe' ? (
          <AuswahlOverlay
            mitglieder={planAbfrage.data.mitglieder}
            eigeneId={eigeneId}
            onClose={() => setOverlay(null)}
            belegterName={overlay.belegterName}
            erlaubt={overlay.datum >= heute || !!istAdmin}
            onAuswaehlen={(mitgliedId) => {
              zuweisen(overlay.aufgabeId, overlay.datum, mitgliedId)
              setOverlay(null)
            }}
            onFreigeben={() => freigeben(overlay.aufgabeId, overlay.datum)}
          />
        ) : (
          <AuswahlOverlay
            mitglieder={planAbfrage.data.mitglieder}
            eigeneId={eigeneId}
            onClose={() => setOverlay(null)}
            belegterName={null}
            erlaubt={overlay.datum >= heute || !!istAdmin}
            titel={`Alle Aufgaben von „${overlay.zeitfensterName}" übernehmen?`}
            untertitel="Es wird eine Zuteilung pro Aufgabe erstellt — bestehende werden überschrieben."
            onAuswaehlen={(mitgliedId) => {
              zeitfensterZuweisen(overlay.zeitfensterId, overlay.datum, mitgliedId)
              setOverlay(null)
            }}
          />
        )
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}
