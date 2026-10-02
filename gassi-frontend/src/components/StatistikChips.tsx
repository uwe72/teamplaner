import type { StatistikZeile } from '../types'

export default function StatistikChips({
  wochenweise,
  monatlich,
  kumuliert,
  sollWerte,
  kompakt = false,
}: {
  wochenweise: StatistikZeile[]
  monatlich: StatistikZeile[]
  kumuliert: StatistikZeile[]
  sollWerte?: Record<number, number>
  kompakt?: boolean
}) {
  const sortiert = [...wochenweise].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename))

  if (sortiert.length === 0) return null

  return (
    <div className={kompakt ? 'flex gap-1.5 flex-nowrap overflow-x-auto' : 'flex gap-1.5 flex-wrap'}>
      {sortiert.map(w => {
        const monat = monatlich.find(m => m.mitgliedId === w.mitgliedId)
        const gesamt = kumuliert.find(k => k.mitgliedId === w.mitgliedId)
        const soll = sollWerte?.[w.mitgliedId]
        const unterschritten = soll != null ? w.ist < soll : w.ist < w.moeglich
        return (
          <span
            key={w.mitgliedId}
            className={`inline-flex items-center whitespace-nowrap rounded-badge border tabular-nums ${kompakt ? 'gap-1.5 h-6 px-1.5 text-[11px]' : 'gap-2 h-6 px-2 text-xs'} ${unterschritten ? 'bg-danger-bg border-danger-hover text-danger badge-blink' : w.aktiv ? 'bg-accent-soft border-border-hover text-foreground' : 'bg-subtle-bg border-border text-subtle'}`}
            title={
              `Woche ${w.ist}/${soll ?? w.moeglich} (${prozent(w.prozent)})`
              + ` · Monat ${monat?.ist ?? 0}/${monat?.moeglich ?? 0} (${prozent(monat?.prozent ?? 0)})`
              + ` · Gesamt ${gesamt?.ist ?? 0}/${gesamt?.moeglich ?? 0} (${prozent(gesamt?.prozent ?? 0)})`
            }
          >
            <span className="font-semibold">{initialen(w.anzeigename)}</span>
            <span className="font-bold">{w.ist}/{soll ?? w.moeglich}</span>
          </span>
        )
      })}
    </div>
  )
}

function prozent(wert: number): string {
  return `${Math.round(wert * 10) / 10}%`
}

function initialen(name: string): string {
  const teile = name.trim().split(/\s+/)
  return teile.map(t => t.charAt(0).toUpperCase()).join('').slice(0, 2)
}
