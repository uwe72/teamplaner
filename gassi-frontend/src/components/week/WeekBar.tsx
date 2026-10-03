import { ChevronLeft, ChevronRight } from 'lucide-react'
import { wochenbereichBis, wochenRelativLabel, type IsoWoche } from '../../utils/datum'
import BalkenDiagramm from './BalkenDiagramm'

export default function WeekBar({
  woche,
  onVorherige,
  onNaechste,
  onStatistik,
  zeigeStatistikButton = true,
  className = '',
}: {
  woche: IsoWoche
  onVorherige: () => void
  onNaechste: () => void
  onStatistik?: () => void
  zeigeStatistikButton?: boolean
  className?: string
}) {
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
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--tp-ink)' }}>
          {wochenbereichBis(woche)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tp-muted)' }}>
          {wochenRelativLabel(woche)}
        </span>
      </div>

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
