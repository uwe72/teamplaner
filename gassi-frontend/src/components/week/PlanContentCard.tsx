import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { wochenbereichLang, type IsoWoche } from '../../utils/datum'

export default function PlanContentCard({
  woche,
  onVorherige,
  onNaechste,
  onHeute,
  style,
  children,
}: {
  woche: IsoWoche
  onVorherige: () => void
  onNaechste: () => void
  onHeute: () => void
  style?: React.CSSProperties
  children: ReactNode
}) {
  return (
    <div className="pm-card flex flex-col min-h-0" style={{ padding: 24, ...style }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap min-w-0">
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--pm-ink)', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {`KW ${woche.isoWoche}`}
          </span>
          <span style={{ fontSize: 14, color: 'var(--pm-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {wochenbereichLang(woche)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVorherige}
            aria-label="Vorherige Woche"
            title="Vorherige Woche"
            className="pm-pfeil pm-focus-visible"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onHeute}
            className="pm-heute-knopf pm-focus-visible"
            title="Zur aktuellen Woche"
          >
            Heute
          </button>
          <button
            type="button"
            onClick={onNaechste}
            aria-label="Nächste Woche"
            title="Nächste Woche"
            className="pm-pfeil pm-focus-visible"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <hr className="pm-trennlinie" style={{ margin: '16px 0' }} />
      {children}
    </div>
  )
}
