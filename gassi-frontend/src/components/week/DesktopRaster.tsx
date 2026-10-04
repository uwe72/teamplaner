import { useMemo } from 'react'
import { Sun, Moon } from 'lucide-react'
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
  kompakt = false,
}: {
  plan: PlanDto
  aktionen: SlotCellAktionen
  kompakt?: boolean
}) {
  const heute = heutigesDatum()
  const kuerzel = useMemo(
    () => eindeutigeInitialen(plan.mitglieder.map(m => m.anzeigename)),
    [plan.mitglieder],
  )

  return (
    <div className="tp-scroll-x" style={{ overflowX: 'auto' }}>
      <div
        className="flex flex-col"
        style={{ minWidth: 860, padding: 8, marginTop: kompakt ? 0 : 24 }}
      >
        <div
          className="grid items-stretch"
          style={{ gridTemplateColumns: RASTER_TEMPLATE, columnGap: GAP, rowGap: GAP }}
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
      </div>
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
  const abends = /abend|nacht/i.test(bereinigt)
  const Icon = abends ? Moon : Sun
  return (
    <div
      className="flex items-center select-none"
      style={{ gap: 10, minHeight: 'var(--pm-cell-height)', paddingLeft: 8 }}
      title={bereinigt}
    >
      <Icon size={18} strokeWidth={1.5} color="var(--pm-muted)" aria-hidden="true" />
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--pm-ink)',
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
      datum: datum,
    },
  )
  const aufgabeId = gruppe.zeilen.length === 1 ? gruppe.zeilen[0].aufgabe.id : null

  return (
    <div style={{ display: 'flex', width: '100%' }}>
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