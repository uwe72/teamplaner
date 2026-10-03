import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { aktivesTeamId, sitzungLaden } from '../api/client'
import api from '../api/client'
import type { FehlerAntwort, PlanDto, Statistik, Zuteilung } from '../types'
import { aktuelleIsoWocheJetzt, heutigesDatum, verschiebeIsoWoche, type IsoWoche } from '../utils/datum'
import { holeEigeneId } from '../utils/eigeneId'
import useIsMobile from '../hooks/useIsMobile'
import useBereiche from '../hooks/useBereiche'
import AufgabenZeilenOverlay from '../components/AufgabenZeilenOverlay'
import WeekBar from '../components/week/WeekBar'
import PeopleProgress from '../components/week/PeopleProgress'
import DesktopRaster from '../components/week/DesktopRaster'
import PlanContentCard from '../components/week/PlanContentCard'
import WeekRaster, { type ZeitfensterZellInfo } from '../components/week/WeekRaster'
import StatistikPopup from '../components/week/StatistikPopup'
import StatistikInhalt from '../components/week/StatistikInhalt'
import type { SlotCellAktionen } from '../components/week/SlotCell'
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
  const [popCellKey, setPopCellKey] = useState<string | null>(null)
  const [statistikOffen, setStatistikOffen] = useState(false)
  const [statistikMonatReset, setStatistikMonatReset] = useState(0)
  const statistikRef = useRef<HTMLDivElement | null>(null)

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

  function zuteilungFinden(aufgabeId: number, datum: string): Zuteilung | null {
    return planAbfrage.data?.gruppen
      .flatMap(g => g.zeilen)
      .find(z => z.aufgabe.id === aufgabeId)
      ?.zuteilungen.find(z => z.datum === datum) ?? null
  }

  function optimistischZuweisen(aufgabeId: number, datum: string, mitgliedId: number) {
    queryClient.setQueryData<PlanDto>(
      ['plan', teamId, bereichId, zielWoche.isoJahr, zielWoche.isoWoche],
      alt => {
        if (!alt) return alt
        const person = alt.mitglieder.find(m => m.id === mitgliedId)
        return {
          ...alt,
          gruppen: alt.gruppen.map(g => ({
            ...g,
            zeilen: g.zeilen.map(z => {
              if (z.aufgabe.id !== aufgabeId) return z
              const rest = z.zuteilungen.filter(t => t.datum !== datum)
              return {
                ...z,
                zuteilungen: [...rest, { id: null, aufgabeId, mitgliedId, anzeigename: person?.anzeigename ?? null, datum }],
              }
            }),
          })),
          mitglieder: alt.mitglieder.map(m =>
            m.id === mitgliedId ? { ...m, ist: m.ist + 1 } : m,
          ),
        }
      },
    )
  }

  function optimistischFreigeben(aufgabeId: number, datum: string, mitgliedId: number) {
    queryClient.setQueryData<PlanDto>(
      ['plan', teamId, bereichId, zielWoche.isoJahr, zielWoche.isoWoche],
      alt => {
        if (!alt) return alt
        return {
          ...alt,
          gruppen: alt.gruppen.map(g => ({
            ...g,
            zeilen: g.zeilen.map(z => {
              if (z.aufgabe.id !== aufgabeId) return z
              return { ...z, zuteilungen: z.zuteilungen.filter(t => !(t.datum === datum && t.mitgliedId === mitgliedId)) }
            }),
          })),
          mitglieder: alt.mitglieder.map(m =>
            m.id === mitgliedId ? { ...m, ist: Math.max(0, m.ist - 1) } : m,
          ),
        }
      },
    )
  }

  async function zuweisen(aufgabeId: number, datum: string, mitgliedId: number) {
    const vorh = zuteilungFinden(aufgabeId, datum)
    if (vorh?.mitgliedId && datum < heute && !istAdmin) {
      setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
      return
    }
    optimistischZuweisen(aufgabeId, datum, mitgliedId)
    setPopCellKey(`box-${aufgabeId}-${datum}`)
    try {
      await api.post(`/teams/${teamId}/zuteilungen`, { aufgabeId, datum, mitgliedId })
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    } finally {
      window.setTimeout(() => setPopCellKey(k => (k === `box-${aufgabeId}-${datum}` ? null : k)), 450)
    }
  }

  async function zeitfensterZuweisen(zeitfensterId: number, datum: string, mitgliedId: number) {
    const gruppe = planAbfrage.data?.gruppen.find(g => g.zeitfensterId === zeitfensterId)
    if (!gruppe) return
    for (const zeile of gruppe.zeilen) {
      const vorh = zeile.zuteilungen.find(z => z.datum === datum)
      if (vorh?.mitgliedId && datum < heute && !istAdmin) {
        setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
        return
      }
    }
    if (datum < heute && !istAdmin) {
      setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
      return
    }
    for (const zeile of gruppe.zeilen) {
      optimistischZuweisen(zeile.aufgabe.id, datum, mitgliedId)
      setPopCellKey(`box-${zeile.aufgabe.id}-${datum}`)
    }
    try {
      await api.post(`/teams/${teamId}/zeitfenster/${zeitfensterId}/zuteilungen`, { datum, mitgliedId })
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    } finally {
      window.setTimeout(() => setPopCellKey(null), 450)
    }
  }

  async function freigeben(zuteilungId: number, aufgabeId?: number, mitgliedId?: number) {
    if (aufgabeId != null && mitgliedId != null) {
      const datum = zuteilungDatumFuer(aufgabeId, zuteilungId)
      if (datum) optimistischFreigeben(aufgabeId, datum, mitgliedId)
    }
    try {
      await api.delete(`/teams/${teamId}/zuteilungen/${zuteilungId}`)
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    }
  }

  async function freigebenMehrere(zuteilungen: Zuteilung[]) {
    const list = zuteilungen.filter(z => z.id != null)
    for (const zuteilung of list) {
      const datum = zuteilung.datum
      if (datum && zuteilung.mitgliedId != null) {
        optimistischFreigeben(zuteilung.aufgabeId, datum, zuteilung.mitgliedId)
      }
    }
    try {
      await Promise.all(
        list.map(zuteilung =>
          api.delete(`/teams/${teamId}/zuteilungen/${zuteilung.id}`),
        ),
      )
      nachErfolg()
    } catch (e) {
      nachFehler(e)
    }
  }

  function zuteilungDatumFuer(aufgabeId: number, zuteilungId: number): string | null {
    const alle = planAbfrage.data?.gruppen
      .flatMap(g => g.zeilen)
      .find(z => z.aufgabe.id === aufgabeId)?.zuteilungen ?? []
    return alle.find(t => t.id === zuteilungId)?.datum ?? null
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
      const zuteilung = zuteilungFinden(aufgabeId, datum)
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
    queryClient.invalidateQueries({ queryKey: ['statistik'] })
  }

  const swipeRef = useHorizontalSwipe(
    () => setFokus(verschiebeIsoWoche(zielWoche, 1)),
    () => setFokus(verschiebeIsoWoche(zielWoche, -1)),
    isMobile
  )

  if (teamId == null) {
    return <div className="card p-4 text-sm text-muted">Kein Team-Kontext — bitte neu anmelden.</div>
  }

  const mobilerRasterAktionen: SlotCellAktionen | null = planAbfrage.data
    ? {
        eigeneId,
        heute,
        popCellKey,
        istAdmin,
        onFreiKlick: (datum, zeitfensterId) => {
          if (datum < heute && !istAdmin) {
            setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
            return
          }
          const gruppe = planAbfrage.data?.gruppen.find(g => g.zeitfensterId === zeitfensterId)
          if (!gruppe) return
          if (gruppe.zeilen.length > 1) {
            setOverlay({ zeitfensterId, datum })
            return
          }
          const zeile = gruppe.zeilen[0]
          if (zeile) {
            zuweisen(zeile.aufgabe.id, datum, eigeneId)
          }
        },
        onEigeneKlick: (datum, zuteilungId) => {
          if (datum < heute && !istAdmin) {
            setHinweis('Vergangene Tage dürfen nur von einem Admin geändert werden.')
            return
          }
          freigeben(zuteilungId)
        },
        onBelegtKlick: (datum, zeitfensterId) => {
          setOverlay({ zeitfensterId, datum })
        },
      }
    : null

  return (
    <div ref={swipeRef} className="h-full flex flex-col min-h-0">
      {hinweis && (
        <div className="card p-3 text-sm mb-4 flex items-start justify-between shrink-0" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
          <span>{hinweis}</span>
          <button className="ml-2 underline shrink-0" onClick={() => setHinweis(null)}>ok</button>
        </div>
      )}

      <DndContext sensors={sensoren} onDragEnd={beimAblegen}>
      {isMobile ? (
        <div className="flex-1 min-h-0 flex flex-col tp-safe mx-auto w-full" style={{ touchAction: 'pan-y', maxWidth: 520 }}>
          {planAbfrage.data && mobilerRasterAktionen ? (
            <>
              <WeekBar
                woche={zielWoche}
                onVorherige={() => setFokus(verschiebeIsoWoche(zielWoche, -1))}
                onNaechste={() => setFokus(verschiebeIsoWoche(zielWoche, 1))}
                onStatistik={() => setStatistikOffen(true)}
                className="mx-4 mt-3"
              />
              <PeopleProgress
                mitglieder={planAbfrage.data.mitglieder}
                kumuliertProzent={Object.fromEntries(
                  (statistikAbfrage.data?.kumuliert ?? []).map(k => [k.mitgliedId, k.prozent]),
                )}
              />
              <WeekRaster
                plan={planAbfrage.data}
                spalten={mobilerSpalten(planAbfrage.data)}
                aktionen={mobilerRasterAktionen}
              />
            </>
          ) : (
            <div className="text-center py-8 text-muted">{planAbfrage.isLoading ? 'Laden...' : 'Kein Plan — lege zuerst einen Bereich und Aufgaben an.'}</div>
          )}
        </div>
      ) : (
        <div className="pm-page flex flex-col gap-5" style={{ minHeight: '100%' }}>
          {planAbfrage.data && mobilerRasterAktionen ? (
            <>
              <PlanContentCard
                woche={zielWoche}
                onVorherige={() => setFokus(verschiebeIsoWoche(zielWoche, -1))}
                onNaechste={() => setFokus(verschiebeIsoWoche(zielWoche, 1))}
                onHeute={() => {
                  setFokus(null)
                  setStatistikMonatReset(z => z + 1)
                }}
                style={{ flexShrink: 0 }}
              >
                <PeopleProgress
                  mitglieder={planAbfrage.data.mitglieder}
                  papier
                  ringGroesse={56}
                  gap={24}
                  verteilen
                  onPersonKlick={() => statistikRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                />
              </PlanContentCard>
              <div className="pm-card" style={{ padding: 24, flexShrink: 0 }}>
                <DesktopRaster
                  plan={planAbfrage.data}
                  aktionen={mobilerRasterAktionen}
                  kompakt
                />
              </div>
              <div ref={statistikRef} className="pm-card" style={{ padding: 24, flexShrink: 0 }}>
                {bereichId != null && (
                  <StatistikInhalt
                    bereichId={bereichId}
                    nebeneinander
                    woche={zielWoche}
                    monatZuruecksetzenSignal={statistikMonatReset}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted">{planAbfrage.isLoading ? 'Laden...' : 'Kein Plan — lege zuerst einen Bereich und Aufgaben an.'}</div>
          )}
        </div>
      )}
      </DndContext>

      {overlay && planAbfrage.data && (() => {
        const gruppe = planAbfrage.data.gruppen.find(g => g.zeitfensterId === overlay.zeitfensterId)
        if (!gruppe) return null
        return (
          <AufgabenZeilenOverlay
            gruppe={gruppe}
            datum={overlay.datum}
            mitglieder={planAbfrage.data.mitglieder}
            erlaubt={overlay.datum >= heute || !!istAdmin}
            onClose={() => setOverlay(null)}
            onZuweisen={(aufgabeId, mitgliedId) => zuweisen(aufgabeId, overlay.datum, mitgliedId)}
            onZuweisenAlle={(mitgliedId) => zeitfensterZuweisen(overlay.zeitfensterId, overlay.datum, mitgliedId)}
            onFreigeben={(zuteilungId) => freigeben(zuteilungId)}
            onFreigebenAlle={(zuteilungen) => freigebenMehrere(zuteilungen)}
          />
        )
      })()}

      {isMobile && statistikOffen && bereichId != null && planAbfrage.data && (
        <StatistikPopup
          bereichId={bereichId}
          onClose={() => setStatistikOffen(false)}
        />
      )}

      {isMobile ? null : <div className="h-10 md:hidden" />}
    </div>
  )
}
function mobilerSpalten(plan: PlanDto): ZeitfensterZellInfo[] {
  const spalten: ZeitfensterZellInfo[] = []
  for (const gruppe of plan.gruppen) {
    if (gruppe.zeilen.length <= 1) {
      spalten.push({ zeitfensterId: gruppe.zeitfensterId, zeitfensterName: gruppe.zeitfensterName, aufgabeId: gruppe.zeilen[0]?.aufgabe.id ?? null })
    } else {
      spalten.push({ zeitfensterId: gruppe.zeitfensterId, zeitfensterName: gruppe.zeitfensterName, aufgabeId: null })
    }
  }
  return spalten
}
