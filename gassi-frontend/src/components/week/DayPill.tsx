import { heutigesDatum, wochentagKurz, tagKurz } from '../../utils/datum'

export default function DayPill({
  datum,
  istHeute,
  varianz = 'vertikal',
}: {
  datum: string
  istHeute: boolean
  varianz?: 'vertikal' | 'horizontal'
}) {
  const wochentag = wochentagKurz(datum)
  const tag = tagKurz(datum)

  if (varianz === 'horizontal') {
    const vergangen = datum < heutigesDatum()
    if (istHeute) {
      return (
        <div
          className="w-full flex items-center justify-center gap-1.5 select-none"
          style={{
            height: 40,
            borderRadius: 999,
            backgroundColor: 'var(--pm-ink)',
            color: '#fff',
            lineHeight: 1,
          }}
          title={datum}
          aria-current="date"
        >
          <span style={{ fontSize: 15, fontWeight: 700 }}>{wochentag}</span>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>{tag}</span>
        </div>
      )
    }
    return (
      <div
        className="w-full flex items-center justify-center gap-1.5 select-none"
        style={{
          height: 40,
          borderRadius: 999,
          lineHeight: 1,
        }}
        title={datum}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: vergangen ? 'var(--pm-muted)' : 'var(--pm-ink)' }}>{wochentag}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-muted)', fontVariantNumeric: 'tabular-nums' }}>{tag}</span>
      </div>
    )
  }

  let hintergrund = 'var(--tp-surface)'
  let textfarbe = 'var(--tp-ink)'
  let schatten: string | undefined
  if (istHeute) {
    hintergrund = 'var(--tp-accent)'
    textfarbe = 'var(--tp-on-accent)'
    schatten = '0 4px 12px rgba(0,0,0,.15)'
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center select-none"
      style={{
        borderRadius: 'var(--tp-radius-pill)',
        backgroundColor: hintergrund,
        color: textfarbe,
        boxShadow: schatten,
        lineHeight: 1.1,
        minWidth: 44,
        minHeight: 44,
      }}
      title={datum}
    >
      <span style={{ fontSize: 15, fontWeight: 900 }}>{wochentag}</span>
      <span style={{ fontSize: 11, fontWeight: 700, opacity: istHeute ? 0.85 : 0.6 }}>{tag}</span>
    </div>
  )
}
