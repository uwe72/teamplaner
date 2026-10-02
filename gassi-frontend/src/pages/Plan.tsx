import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { aktivesTeamId, aktivesTeamName, sitzungLaden } from '../api/client'
import api from '../api/client'
import type { FehlerAntwort, PlanDto, Statistik } from '../types'
import { aktuelleIsoWocheJetzt, heutigesDatum, isoNummer, verschiebeIsoWoche, wochenbereich, type IsoWoche } from '../utils/datum'
import { holeEigeneId } from '../utils/eigeneId'
import useIsMobile from '../hooks/useIsMobile'
import useBereiche from '../hooks/useBereiche'
import PlanRaster from '../components/PlanRaster'
import PlanRasterMobil from '../components/PlanRasterMobil'
import AufgabenZeilenOverlay from '../components/AufgabenZeilenOverlay'
import CardContainer from '../components/CardContainer'
import Button from '../components/Button'
import StatistikChips from '../components/StatistikChips'
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
    | { zeitfensterId: number; datum: string }
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

  const statistikAbfrage = useQuery<Statistik>({
    queryKey: ['statistik', teamId, bereichId, zielWoche.isoJahr, zielWoche.isoWoche],
    queryFn: () => api.get(`/teams/${teamId}/statistik`, {
      params: { bereichId, isoJahr: zielWoche.isoJahr, isoWoche: zielWoche.isoWoche },
    }).then(r => r.data),
    enabled: teamId != null && bereichId != null && !!planAbfrage.data,
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

  async function freigeben(zuteilungId: number) {
    try {
      await api.delete(`/teams/${teamId}/zuteilungen/${zuteilungId}`)
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
    if (ziel.startsWith('slot-')) {
      const rest = ziel.replace('slot-', '')
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
    ? 'aktuell'
    : isoNummer(zielWoche) < isoNummer(aktuelleIsoWocheJetzt()) ? 'vergangen' : 'zukünftig'

  return (
    <div ref={swipeRef} className="h-full flex flex-col min-h-0">
      {!isMobile && aktivesTeamName() && (
        <div className="card px-4 py-2.5 text-sm mb-4 flex flex-col gap-2" style={{ backgroundColor: 'var(--color-info-bg)' }}>
          <div className="flex items-center justify-between">
            <span>
              <span className="text-muted">Team: </span>
              <span className="font-semibold">{aktivesTeamName()}</span>
              <span className="text-muted ml-3">·</span>
              <span className="font-semibold ml-3">{wocheLabel}</span>
            </span>
            <span className="text-xs text-muted">{wocheTitel}</span>
          </div>
          {statistikAbfrage.data && wocheTitel !== 'zukünftig' && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0">Statistik</span>
              <div className="min-w-0">
                <StatistikChips
                  sollWerte={Object.fromEntries((planAbfrage.data?.mitglieder ?? []).map(m => [m.id, m.soll]))}
                  wochenweise={statistikAbfrage.data.wochenweise}
                  monatlich={statistikAbfrage.data.monatlich}
                  kumuliert={statistikAbfrage.data.kumuliert}
                />
              </div>
            </div>
          )}
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
        <div className="px-3 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
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
            {statistikAbfrage.data && wocheTitel !== 'zukünftig' && (
              <StatistikChips
                sollWerte={Object.fromEntries((planAbfrage.data?.mitglieder ?? []).map(m => [m.id, m.soll]))}
                wochenweise={statistikAbfrage.data.wochenweise}
                monatlich={statistikAbfrage.data.monatlich}
                kumuliert={statistikAbfrage.data.kumuliert}
                kompakt
              />
            )}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col" style={isMobile ? { touchAction: 'pan-y' } : undefined}>
        <CardContainer
          className={isMobile ? 'flex-1 min-h-0 max-md:bg-transparent max-md:border-0 max-md:shadow-none' : 'min-h-0'}
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
                onSlotKlick: (zeitfensterId, datum) => setOverlay({ zeitfensterId, datum }),
              }}
            />
          ) : (
            <PlanRaster
              plan={planAbfrage.data}
              aktionen={{
                eigeneId,
                istAdmin: !!istAdmin,
                heute,
                onSlotKlick: (zeitfensterId, datum) => setOverlay({ zeitfensterId, datum }),
              }}
            />
          )}
        </CardContainer>
      </div>
      </DndContext>

      {overlay && planAbfrage.data && (() => {
        const gruppe = planAbfrage.data.gruppen.find(g => g.zeitfensterId === overlay.zeitfensterId)
        if (!gruppe) return null
        return (
          <AufgabenZeilenOverlay
            gruppe={gruppe}
            datum={overlay.datum}
            mitglieder={planAbfrage.data.mitglieder}
            eigeneId={eigeneId}
            erlaubt={overlay.datum >= heute || !!istAdmin}
            onClose={() => setOverlay(null)}
            onZuweisen={(aufgabeId, mitgliedId) => zuweisen(aufgabeId, overlay.datum, mitgliedId)}
            onZuweisenAlle={(mitgliedId) => zeitfensterZuweisen(overlay.zeitfensterId, overlay.datum, mitgliedId)}
            onFreigeben={(zuteilungId) => freigeben(zuteilungId)}
          />
        )
      })()}

      <div className="h-10 md:hidden" />
    </div>
  )
}
