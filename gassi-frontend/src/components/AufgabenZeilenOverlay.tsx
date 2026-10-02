import { useState } from 'react'
import type { MitgliedPlanInfo, ZeitfensterGruppe } from '../types'
import tagLabel from '../utils/datum'
import Avatar from './Avatar'
import Button from './Button'

export default function AufgabenZeilenOverlay({
  gruppe,
  datum,
  mitglieder,
  eigeneId,
  erlaubt,
  onClose,
  onZuweisen,
  onZuweisenAlle,
  onFreigeben,
}: {
  gruppe: ZeitfensterGruppe
  datum: string
  mitglieder: MitgliedPlanInfo[]
  eigeneId: number
  erlaubt: boolean
  onClose: () => void
  onZuweisen: (aufgabeId: number, mitgliedId: number) => void
  onZuweisenAlle: (mitgliedId: number) => void
  onFreigeben: (zuteilungId: number) => void
}) {
  const eintraege = gruppe.zeilen.map(zeile => ({
    aufgabe: zeile.aufgabe,
    zuteilung: zeile.zuteilungen.find(z => z.datum === datum) ?? null,
  }))
  const [getrennt, setGetrennt] = useState(() => {
    const erste = eintraege[0]?.zuteilung?.mitgliedId ?? null
    return eintraege.some(e => (e.zuteilung?.mitgliedId ?? null) !== erste)
  })

  const sortiert = [...mitglieder].sort((a, b) => {
    if (a.id === eigeneId) return -1
    if (b.id === eigeneId) return 1
    return a.anzeigename.localeCompare(b.anzeigename)
  })

  const ersteZuteilung = eintraege[0]?.zuteilung ?? null
  const belegterName = ersteZuteilung?.anzeigename ?? null

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
            : belegterName
              ? `Belegt durch ${belegterName} — Auswahl überschreibt die bestehende Zuteilung.`
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
                      {(person || zuteilung?.anzeigename) && (
                        <span
                          className="inline-flex items-center px-2 h-6 rounded-badge border border-border-hover bg-accent-soft text-foreground text-xs font-medium max-w-[140px]"
                          title={zuteilung?.anzeigename ?? undefined}
                        >
                          <span className="truncate">{zuteilung?.anzeigename}</span>
                        </span>
                      )}
                      {zuteilung?.id && erlaubt && (
                        <button
                          type="button"
                          title="Zuteilung freigeben"
                          aria-label="Zuteilung freigeben"
                          className="inline-flex items-center justify-center w-6 h-6 rounded-badge border text-xs shrink-0 hover:bg-card-hover"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
                          onClick={() => onFreigeben(zuteilung.id as number)}
                        >
                          ✕
                        </button>
                      )}
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
        <div className="grid grid-cols-2 gap-2 my-3">
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
                    groesse="sm"
                  />
                  <span className="truncate">{m.anzeigename}</span>
                </button>
              )
            })}
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
