import { useMemo, type ReactNode } from 'react'
import type { PlanDto } from '../../types'
import { heutigesDatum } from '../../utils/datum'
import { eindeutigeInitialen } from '../../utils/kuerzel'
import DayPill from './DayPill'
import SlotCell, { type SlotCellAktionen } from './SlotCell'

const RASTER_TEMPLATE = '132px repeat(7, minmax(0, 1fr))'
const GAP = 10

export default function DesktopRaster({
  plan,
  aktionen,
}: {
  plan: PlanDto
  aktionen: SlotCellAktionen
}) {
  const heute = heutigesDatum()
  const kuerzel = useMemo(
    () => eindeutigeInitialen(plan.mitglieder.map(m => m.anzeigename)),
    [plan.mitglieder],
  )

  return (
    <div className="flex flex-col" style={{ gap: GAP, marginTop: 24 }}>
      <div className="grid items-center" style={{ gridTemplateColumns: RASTER_TEMPLATE, gap: GAP }}>
        <div />
        {plan.tage.map(datum => (
          <DayPill key={datum} datum={datum} istHeute={datum === heute} varianz="horizontal" />
        ))}
      </div>
      {plan.gruppen.map(gruppe => (
        <div
          key={gruppe.zeitfensterId}
          className="grid"
          style={{ gridTemplateColumns: RASTER_TEMPLATE, gap: GAP, minHeight: 104 }}
        >
          <ZeilenPille name={gruppe.zeitfensterName} />
          {plan.tage.map(datum => (
            <HeuteBand key={datum} aktiv={datum === heute}>
              <ZellenSlot
                datum={datum}
                gruppe={gruppe}
                plan={plan}
                kuerzel={kuerzel}
                aktionen={aktionen}
              />
            </HeuteBand>
          ))}
        </div>
      ))}
    </div>
  )
}

function HeuteBand({
  aktiv,
  children,
}: {
  aktiv: boolean
  children: ReactNode
}) {
  if (!aktiv) return <>{children}</>
  return <div className="tp-heute-band flex" style={{ margin: `-${GAP / 2}px` }}>{children}</div>
}

function ZeilenPille({ name }: { name: string }) {
  return (
    <div
      className="flex items-center select-none"
      style={{
        backgroundColor: 'var(--tp-surface)',
        borderRadius: 16,
        padding: '8px 14px',
        boxShadow: 'var(--tp-shadow)',
      }}
      title={name}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--tp-ink)',
          lineHeight: 1.25,
          overflowWrap: 'anywhere',
        }}
      >
        {name}
      </span>
    </div>
  )
}

function ZellenSlot({
  datum,
  gruppe,
  plan,
  kuerzel,
  aktionen,
}: {
  datum: string
  gruppe: PlanDto['gruppen'][number]
  plan: PlanDto
  kuerzel: Map<string, string>
  aktionen: SlotCellAktionen
}) {
  const zeilenZuteilungen = gruppe.zeilen.map(zeile =>
    zeile.zuteilungen.find(z => z.datum === datum) ?? {
      id: null,
      aufgabeId: zeile.aufgabe.id,
      mitgliedId: null,
      anzeigename: null,
      datum,
    },
  )
  const aufgabeId = gruppe.zeilen.length === 1 ? gruppe.zeilen[0].aufgabe.id : null

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <SlotCell
        datum={datum}
        zeitfensterId={gruppe.zeitfensterId}
        aufgabeId={aufgabeId}
        zeilenZuteilungen={zeilenZuteilungen}
        mitglieder={plan.mitglieder}
        kuerzelMap={kuerzel}
        cellKey={aufgabeId != null ? `box-${aufgabeId}-${datum}` : `slot-${gruppe.zeitfensterId}-${datum}`}
        aktionen={aktionen}
        varianz="desktop"
      />
    </div>
  )
}
