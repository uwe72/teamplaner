import { useState } from 'react'
import type { MitgliedPlanInfo, ZeitfensterGruppe, Zuteilung } from '../types'
import tagLabel from '../utils/datum'
import { sortiereMitglieder } from '../utils/mitgliederSortierung'
import Avatar from './Avatar'
import Button from './Button'
import { personFarbe } from '../utils/farben'

function ZuteilungsChip({
  name,
  titel,
  onFreigeben,
}: {
  name: string
  titel: string
  onFreigeben: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 h-6 rounded-badge border border-border bg-accent-soft text-foreground text-xs font-medium max-w-[180px]">
      <span className="truncate" title={name}>{name}</span>
      <button
        type="button"
        title={titel}
        aria-label={titel}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 hover:bg-card-hover"
        style={{ color: 'var(--color-danger)' }}
        onClick={onFreigeben}
      >
        ✕
      </button>
    </span>
  )
}

const aufgabenFreigebenTitel = (anzahl: number) =>
  anzahl > 1 ? `Alle ${anzahl} Aufgaben freigeben` : 'Zuteilung freigeben'

export default function AufgabenZeilenOverlay({
  gruppe,
  datum,
  mitglieder,
  erlaubt,
  onClose,
  onZuweisen,
  onZuweisenAlle,
  onFreigeben,
  onFreigebenAlle,
}: {
  gruppe: ZeitfensterGruppe
  datum: string
  mitglieder: MitgliedPlanInfo[]
  erlaubt: boolean
  onClose: () => void
  onZuweisen: (aufgabeId: number, mitgliedId: number) => void
  onZuweisenAlle: (mitgliedId: number) => void
  onFreigeben: (zuteilungId: number) => void
  onFreigebenAlle: (zuteilungen: Zuteilung[]) => void
}) {
  const eintraege = gruppe.zeilen.map(zeile => ({
    aufgabe: zeile.aufgabe,
    zuteilung: zeile.zuteilungen.find(z => z.datum === datum) ?? null,
  }))
  const [getrennt, setGetrennt] = useState(() => {
    const erste = eintraege[0]?.zuteilung?.mitgliedId ?? null
    return eintraege.some(e => (e.zuteilung?.mitgliedId ?? null) !== erste)
  })

  const sortiert = sortiereMitglieder(mitglieder)

  const ersteZuteilung = eintraege[0]?.zuteilung ?? null
  const zuteilungenDesTages = eintraege
    .map(e => e.zuteilung)
    .filter((z): z is Zuteilung => !!z?.id)
  const alleGleich = eintraege.every(
    e => (e.zuteilung?.mitgliedId ?? null) === (zuteilungenDesTages[0]?.mitgliedId ?? null),
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="p-5 bg-card border border-border rounded-card shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-medium text-foreground mb-1">
          {gruppe.zeitfensterName} — {tagLabel(datum)}
        </h3>
        <p className="text-xs text-subtle mb-2">
          {getrennt
            ? 'Pro Aufgabe eine Person zuweisen — bestehende Zuteilungen werden überschrieben.'
            : `${eintraege.length} Aufgaben — Auswahl gilt für alle.`}
        </p>
        {!erlaubt && (
          <div className="p-2.5 mb-3 bg-warning-bg border border-warning/30 rounded-control text-[13px] text-warning">
            Vergangene Tage dürfen nur von einem Admin geändert werden.
          </div>
        )}

        {getrennt ? (
          <div className="flex flex-col gap-2 my-3">
            {eintraege.map(({ aufgabe, zuteilung }) => {
              const person = zuteilung?.mitgliedId
                ? mitglieder.find(m => m.id === zuteilung.mitgliedId) ?? null
                : null
              return (
                <div key={aufgabe.id} className="rounded-control border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {aufgabe.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(person || zuteilung?.anzeigename) && zuteilung?.id && erlaubt ? (
                        <ZuteilungsChip
                          name={zuteilung?.anzeigename ?? ''}
                          titel="Zuteilung freigeben"
                          onFreigeben={() => onFreigeben(zuteilung.id as number)}
                        />
                      ) : (person || zuteilung?.anzeigename) ? (
                        <span
                          className="inline-flex items-center px-2 h-6 rounded-badge border border-border-hover bg-accent-soft text-foreground text-xs font-medium max-w-[140px]"
                          title={zuteilung?.anzeigename ?? undefined}
                        >
                          <span className="truncate">{zuteilung?.anzeigename}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {sortiert.map(m => {
                      const istBelegt = zuteilung?.mitgliedId === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!erlaubt}
                          onClick={() => onZuweisen(aufgabe.id, m.id)}
                          className={`card px-3 py-2.5 text-sm font-semibold flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${istBelegt ? 'outline-2 outline-accent bg-accent-soft outline-offset-[-2px]' : ''}`}
                        >
                          <Avatar
                            mitgliedId={m.id}
                            anzeigename={m.anzeigename}
                            avatarUrl={m.avatarUrl}
                            farbe={personFarbe(m, mitglieder)}
                            groesse="sm"
                          />
                          <span className="truncate">{m.anzeigename}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2 my-3">
            {erlaubt && zuteilungenDesTages.length > 0 && alleGleich && (
              <div className="flex items-center justify-end">
                <ZuteilungsChip
                  name={`${zuteilungenDesTages.length} Aufgaben — ${zuteilungenDesTages[0]?.anzeigename ?? ''}`}
                  titel={aufgabenFreigebenTitel(zuteilungenDesTages.length)}
                  onFreigeben={() => {
                    onFreigebenAlle(zuteilungenDesTages)
                    onClose()
                  }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
            {sortiert.map(m => {
              const istBelegt = ersteZuteilung?.mitgliedId === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!erlaubt}
                  onClick={() => {
                    onZuweisenAlle(m.id)
                    onClose()
                  }}
                  className={`card px-3 py-2.5 text-sm font-semibold flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${istBelegt ? 'outline-2 outline-accent bg-accent-soft outline-offset-[-2px]' : ''}`}
                >
                  <Avatar
                    mitgliedId={m.id}
                    anzeigename={m.anzeigename}
                    avatarUrl={m.avatarUrl}
                    farbe={personFarbe(m, mitglieder)}
                    groesse="sm"
                  />
                  <span className="truncate">{m.anzeigename}</span>
                </button>
              )
            })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div>
            {!getrennt && erlaubt && gruppe.zeilen.length > 1 && (
              <Button variant="secondary" size="compact" onClick={() => setGetrennt(true)}>
                Aufgabe trennen
              </Button>
            )}
          </div>
          <Button variant="ghost" size="compact" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>
    </div>
  )
}
