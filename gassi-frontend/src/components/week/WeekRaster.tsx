import type { PlanDto } from '../../types'
import { heutigesDatum } from '../../utils/datum'
import DayPill from './DayPill'
import SlotCell, { type SlotCellAktionen } from './SlotCell'

export interface ZeitfensterZellInfo {
  zeitfensterId: number
  zeitfensterName: string
  aufgabeId: number | null
}

export default function WeekRaster({
  plan,
  spalten,
  aktionen,
  extraScroll = false,
}: {
  plan: PlanDto
  spalten: ZeitfensterZellInfo[]
  aktionen: SlotCellAktionen
  extraScroll?: boolean
}) {
  const heute = heutigesDatum()
  const template = `46px repeat(${spalten.length}, 1fr)`

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ padding: '8px 12px 14px', gap: 6 }}>
      <div className="grid" style={{ gridTemplateColumns: template, gap: 8 }}>
        <div />
        {spalten.map((s, i) => (
          <div
            key={`${s.zeitfensterId}-${i}`}
            className="flex items-center justify-center select-none whitespace-nowrap px-1"
            style={{ fontSize: 13, fontWeight: 800, color: 'var(--tp-muted)', minHeight: 28 }}
            title={s.zeitfensterName}
          >
            <span className="truncate">{s.zeitfensterName}</span>
          </div>
        ))}
      </div>
      <div className={`flex-1 min-h-0 flex flex-col ${extraScroll ? 'tp-scroll-x' : ''}`} style={{ gap: 6 }}>
        {plan.tage.map(datum => (
          <div
            key={datum}
            className="grid flex-1"
            style={{ gridTemplateColumns: template, gap: 8, minHeight: 0 }}
          >
            <DayPill datum={datum} istHeute={datum === heute} />
            {spalten.map((spalte, i) => (
              <ZellenSlot
                key={`${spalte.zeitfensterId}-${i}-${datum}`}
                datum={datum}
                plan={plan}
                spalte={spalte}
                aktionen={aktionen}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ZellenSlot({
  datum,
  plan,
  spalte,
  aktionen,
}: {
  datum: string
  plan: PlanDto
  spalte: ZeitfensterZellInfo
  aktionen: SlotCellAktionen
}) {
  const gruppe = plan.gruppen.find(g => g.zeitfensterId === spalte.zeitfensterId)
  if (!gruppe || gruppe.zeilen.length === 0) return <div />

  if (gruppe.zeilen.length === 1 && spalte.aufgabeId != null) {
    const zeile = gruppe.zeilen[0]
    return (
      <SlotCell
        datum={datum}
        zeitfensterId={spalte.zeitfensterId}
        aufgabeId={spalte.aufgabeId}
        zeilenZuteilungen={[zeile.zuteilungen.find(z => z.datum === datum) ?? { id: null, aufgabeId: spalte.aufgabeId, mitgliedId: null, anzeigename: null, datum }]}
        mitglieder={plan.mitglieder}
        cellKey={`box-${spalte.aufgabeId}-${datum}`}
        aktionen={aktionen}
      />
    )
  }

  return (
    <SlotCell
      datum={datum}
      zeitfensterId={spalte.zeitfensterId}
      aufgabeId={null}
      zeilenZuteilungen={gruppe.zeilen.map(zeile =>
        zeile.zuteilungen.find(z => z.datum === datum) ?? { id: null, aufgabeId: zeile.aufgabe.id, mitgliedId: null, anzeigename: null, datum },
      )}
      mitglieder={plan.mitglieder}
      cellKey={`slot-${spalte.zeitfensterId}-${datum}`}
      aktionen={aktionen}
    />
  )
}
