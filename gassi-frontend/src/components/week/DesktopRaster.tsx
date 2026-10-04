import { useMemo } from 'react'
import type { PlanDto } from '../../types'
import { heutigesDatum } from '../../utils/datum'
import { eindeutigeInitialen } from '../../utils/kuerzel'
import DayPill from './DayPill'
import SlotCell, { type SlotCellAktionen } from './SlotCell'

const RASTER_TEMPLATE = '128px repeat(7, minmax(0, 1fr))'
const GAP = 8

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
    <div
      className="grid items-stretch"
      style={{ gridTemplateColumns: RASTER_TEMPLATE, columnGap: GAP, rowGap: GAP, minWidth: 0 }}
    >
      <div />
      {plan.tage.map(datum => (
        <DayPill key={datum} datum={datum} istHeute={datum === heute} varianz="horizontal" />
      ))}
      {plan.gruppen.map(gruppe => (
        <ZellenZeile
          key={gruppe.zeitfensterId}
          datumgruppe={gruppe}
          plan={plan}
          kuerzel={kuerzel}
          aktionen={aktionen}
        />
      ))}
    </div>
  )
}

function ZellenZeile({
  datumgruppe: gruppe,
  plan,
  kuerzel,
  aktionen,
}: {
  datumgruppe: PlanDto['gruppen'][number]
  plan: PlanDto
  kuerzel: Map<string, string>
  aktionen: SlotCellAktionen
}) {
  return (
    <>
      <ZeilenPille name={gruppe.zeitfensterName} />
      {plan.tage.map(datum => (
        <ZellenSlot
          key={datum}
          datum={datum}
          gruppe={gruppe}
          plan={plan}
          kuerzel={kuerzel}
          aktionen={aktionen}
        />
      ))}
    </>
  )
}

function ZeilenPille({ name }: { name: string }) {
  const bereinigt = name.replace(/^[^\p{L}\p{N}]+/u, '')
  return (
    <div
      className="flex items-center select-none"
      style={{ gap: 10, minHeight: 'var(--tp-cell-height)', paddingLeft: 8 }}
      title={bereinigt}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: 'var(--tp-ink)',
          lineHeight: 1.25,
          overflowWrap: 'anywhere',
        }}
      >
        {bereinigt}
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
    <div style={{ display: 'flex', width: '100%', minHeight: 'var(--tp-cell-height)' }}>
      <SlotCell
        datum={datum}
        zeitfensterId={gruppe.zeitfensterId}
        zeitfensterName={gruppe.zeitfensterName}
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
