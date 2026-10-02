import { ChevronLeft, ChevronRight } from 'lucide-react'
import { wochenbereichBis, type IsoWoche } from '../../utils/datum'

export default function WeekBar({
  woche,
  istAktuelleWoche,
  freieRunden,
  onVorherige,
  onNaechste,
  onHeute,
}: {
  woche: IsoWoche
  istAktuelleWoche: boolean
  freieRunden: number
  onVorherige: () => void
  onNaechste: () => void
  onHeute: () => void
}) {
  return (
    <div
      className="flex items-center gap-2 mx-4 mt-3 p-1.5 rounded-[18px] shrink-0"
      style={{ backgroundColor: 'var(--tp-surface)', boxShadow: 'var(--tp-shadow)' }}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center shrink-0"
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--tp-soft)', color: 'var(--tp-ink)' }}
        aria-label="Vorherige Woche"
        onClick={onVorherige}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center leading-tight min-w-0">
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--tp-ink)' }}>KW {woche.isoWoche}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tp-muted)' }}>
          {wochenbereichBis(woche)}
        </span>
      </div>

      {freieRunden > 0 ? (
        <span
          className="inline-flex items-center px-3 h-7 rounded-full shrink-0 whitespace-nowrap"
          style={{ backgroundColor: 'var(--tp-free-bg)', color: 'var(--tp-free)', fontSize: 13, fontWeight: 800 }}
        >
          {freieRunden} frei
        </span>
      ) : (
        <span
          className="inline-flex items-center px-3 h-7 rounded-full shrink-0 whitespace-nowrap"
          style={{ backgroundColor: 'var(--tp-soft)', color: 'var(--tp-muted)', fontSize: 13, fontWeight: 800 }}
        >
          alles verteilt
        </span>
      )}

      {!istAktuelleWoche && (
        <button
          type="button"
          className="inline-flex items-center justify-center shrink-0 px-3 h-10 rounded-[12px] whitespace-nowrap"
          style={{ backgroundColor: 'var(--tp-accent)', color: 'var(--tp-on-accent)', fontSize: 13, fontWeight: 800 }}
          onClick={onHeute}
        >
          Heute
        </button>
      )}

      <button
        type="button"
        className="inline-flex items-center justify-center shrink-0"
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--tp-soft)', color: 'var(--tp-ink)' }}
        aria-label="Nächste Woche"
        onClick={onNaechste}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
