import type { MitgliedPlanInfo } from '../types'
import Button from './Button'

export default function AuswahlOverlay({
  mitglieder,
  eigeneId,
  onClose,
  onAuswaehlen,
  onFreigeben,
  belegterName,
  erlaubt,
  titel,
  untertitel,
}: {
  mitglieder: MitgliedPlanInfo[]
  eigeneId: number
  onClose: () => void
  onAuswaehlen: (mitgliedId: number) => void
  onFreigeben?: () => void
  belegterName: string | null
  erlaubt: boolean
  titel?: string
  untertitel?: string
}) {
  const sortiert = [...mitglieder].sort((a, b) => {
    if (a.id === eigeneId) return -1
    if (b.id === eigeneId) return 1
    return a.anzeigename.localeCompare(b.anzeigename)
  })

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="p-5 bg-card border border-border rounded-card shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-medium text-foreground mb-1">
          {titel ?? (belegterName ? `Belegt durch ${belegterName}` : 'Wer übernimmt?')}
        </h3>
        {(untertitel || belegterName) && (
          <p className="text-xs text-subtle mb-2">{untertitel ?? 'Auswahl überschreibt die bestehende Zuteilung.'}</p>
        )}
        {!erlaubt && (
          <div className="p-2.5 mb-3 bg-warning-bg border border-warning/30 rounded-control text-[13px] text-warning">
            Vergangene Tage dürfen nur von einem Admin geändert werden.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 my-3">
          {sortiert.map(m => (
            <button
              key={m.id}
              type="button"
              disabled={!erlaubt}
              onClick={() => onAuswaehlen(m.id)}
              className="card px-3 py-2.5 text-sm font-semibold flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: m.farbe }}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.farbe }} />
              {m.anzeigename}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            {onFreigeben && belegterName && erlaubt && (
              <Button variant="negative" size="compact" onClick={() => { onFreigeben(); onClose() }}>
                Freigeben (Zuteilung löschen)
              </Button>
            )}
          </div>
          <Button variant="ghost" size="compact" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  )
}
