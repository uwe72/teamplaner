import { ChevronLeft, ChevronRight } from 'lucide-react'
import { wochenbereichBis, wochenRelativLabel, type IsoWoche } from '../../utils/datum'
import BalkenDiagramm from './BalkenDiagramm'

export default function WeekBar({
  woche,
  onVorherige,
  onNaechste,
  onHeute,
  onStatistik,
  zeigeStatistikButton = true,
  kwZeigen = false,
  className = '',
}: {
  woche: IsoWoche
  onVorherige: () => void
  onNaechste: () => void
  onHeute?: () => void
  onStatistik?: () => void
  zeigeStatistikButton?: boolean
  kwZeigen?: boolean
  className?: string
}) {
  const relativ = wochenRelativLabel(woche)
  const istAktuell = relativ === 'Diese Woche'
  const zeigeHeute = !istAktuell && !!onHeute

  return (
    <div
      className={`flex items-center gap-2 p-1.5 rounded-[18px] shrink-0 ${className}`}
      style={{ backgroundColor: 'var(--tp-surface)', boxShadow: 'var(--tp-shadow)' }}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center shrink-0 tp-focus"
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--tp-soft)', color: 'var(--tp-ink)' }}
        aria-label="Vorherige Woche"
        onClick={onVorherige}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center leading-tight min-w-0">
        {kwZeigen && (
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--tp-ink)', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {`KW ${woche.isoWoche}`}
          </span>
        )}
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--tp-ink)' }}>
          {wochenbereichBis(woche)}
        </span>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--tp-muted)' }}>
          <span
            aria-hidden="true"
            className="inline-block shrink-0"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: istAktuell ? 'var(--tp-prog-done)' : 'var(--tp-soft)',
            }}
          />
          {relativ}
        </span>
      </div>

      {zeigeHeute && (
        <button
          type="button"
          className="inline-flex items-center justify-center shrink-0 tp-focus"
          style={{
            height: 40,
            padding: '0 16px',
            borderRadius: 12,
            backgroundColor: 'var(--tp-accent)',
            color: 'var(--tp-on-accent)',
            fontSize: 14,
            fontWeight: 700,
          }}
          title="Zur aktuellen Woche"
          onClick={onHeute}
        >
          Heute
        </button>
      )}

      {zeigeStatistikButton && onStatistik && (
        <button
          type="button"
          className="rounded-full inline-flex items-center justify-center shrink-0 p-0 tp-focus"
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'var(--tp-surface)',
            border: '2px solid var(--tp-soft)',
            color: 'var(--tp-ink)',
          }}
          aria-label="Statistik öffnen"
          onClick={onStatistik}
        >
          <BalkenDiagramm farbe="var(--tp-accent)" groesse={18} />
        </button>
      )}

      <button
        type="button"
        className="inline-flex items-center justify-center shrink-0 tp-focus"
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--tp-soft)', color: 'var(--tp-ink)' }}
        aria-label="Nächste Woche"
        onClick={onNaechste}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
