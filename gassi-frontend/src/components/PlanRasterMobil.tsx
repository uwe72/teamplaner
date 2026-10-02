import { useDroppable } from '@dnd-kit/core'
import type { MitgliedPlanInfo, PlanDto, Zuteilung, ZeitfensterGruppe } from '../types'
import { wochentagKurz, tagKurz } from '../utils/datum'
import type { ReactNode } from 'react'
import type { RasterAktionen } from './PlanRaster'
import Avatar from './Avatar'

export default function PlanRasterMobil({
  plan,
  aktionen,
}: {
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  return (
    <div className="px-2 pt-1 pb-2 h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <table className="w-full table-fixed border-collapse h-full">
          <thead className="bg-elevated table-header">
            <tr>
              <th className="w-[44px] min-w-[44px] border-b border-border" />
              {plan.gruppen.map(gruppe => (
                <th
                  key={gruppe.zeitfensterId}
                  colSpan={1}
                  className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted border-b border-l border-border truncate select-none"
                  title={gruppe.zeitfensterName}
                >
                  {gruppe.zeitfensterName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface">
            {plan.tage.map(datum => (
              <MobilTagZeile key={datum} datum={datum} plan={plan} aktionen={aktionen} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobilTagZeile({
  datum,
  plan,
  aktionen,
}: {
  datum: string
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  const istHeute = datum === aktionen.heute
  return (
    <tr className={istHeute ? 'bg-warning-bg' : 'hover:bg-card-hover'}>
      <th
        className={`w-[44px] min-w-[44px] text-left px-1 py-0.5 border-r border-b border-border select-none align-middle ${istHeute ? 'text-foreground' : 'text-muted'}`}
      >
        <span
          className={`inline-flex items-center justify-center rounded-badge border px-0.5 py-1 text-[11px] font-semibold leading-none w-full ${istHeute ? 'border-accent bg-warning-bg' : 'border-border'}`}
          title={tagKurz(datum)}
        >
          {wochentagKurz(datum)}
        </span>
      </th>
      {plan.gruppen.map(gruppe => (
        <MobilZellgruppe key={gruppe.zeitfensterId} gruppe={gruppe} datum={datum} plan={plan} aktionen={aktionen} />
      ))}
    </tr>
  )
}

function MobilZellgruppe({
  gruppe,
  datum,
  plan,
  aktionen,
}: {
  gruppe: PlanDto['gruppen'][number]
  datum: string
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  if (gruppe.zeilen.length > 1) {
    return (
      <td className="border-l border-b border-border p-1 align-top h-full">
        <MobilZeitfensterSlot
          gruppe={gruppe}
          datum={datum}
          mitglieder={plan.mitglieder}
          {...aktionen}
        />
      </td>
    )
  }
  return (
    <>
      {gruppe.zeilen.map(zeile => (
        <td
          key={zeile.aufgabe.id}
          className="border-l border-b border-border p-1 align-top h-full"
        >
          <MobilZellenBox
            aufgabeId={zeile.aufgabe.id}
            zeitfensterId={gruppe.zeitfensterId}
            datum={datum}
            zuteilung={zeile.zuteilungen.find(z => z.datum === datum) ?? null}
            mitglieder={plan.mitglieder}
            {...aktionen}
          />
        </td>
      ))}
    </>
  )
}

function MobilZeitfensterSlot({
  gruppe,
  datum,
  mitglieder,
  onSlotKlick,
}: {
  gruppe: ZeitfensterGruppe
  datum: string
  mitglieder: PlanDto['mitglieder']
} & Pick<RasterAktionen, 'onSlotKlick'>) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${gruppe.zeitfensterId}-${datum}` })
  const chips: { key: string; person: MitgliedPlanInfo | null; name: string }[] = []
  let offen = false
  for (const zeile of gruppe.zeilen) {
    const zuteilung = zeile.zuteilungen.find(z => z.datum === datum) ?? null
    if (zuteilung?.mitgliedId) {
      if (chips.some(c => c.key === `m-${zuteilung.mitgliedId}`)) continue
      const person = mitglieder.find(m => m.id === zuteilung.mitgliedId) ?? null
      chips.push({
        key: `m-${zuteilung.mitgliedId}`,
        person,
        name: person?.anzeigename ?? zuteilung.anzeigename ?? '',
      })
    } else {
      offen = true
    }
  }

  const inhalt: ReactNode = chips.length > 0 ? (
    <div className={`flex gap-1 h-full w-full ${chips.length > 1 ? 'flex-row' : 'flex-col'}`}>
      {chips.map(c => (
        <MobilSlotChip key={c.key} person={c.person} name={c.name} />
      ))}
      {offen && <MobilOffenChip dot={false} />}
    </div>
  ) : (
    <MobilOffenChip dot />
  )

  return (
    <div
      ref={setNodeRef}
      className={`cursor-pointer min-h-[38px] h-full flex items-stretch ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
      onClick={() => onSlotKlick(gruppe.zeitfensterId, datum)}
      style={{ touchAction: 'none' }}
    >
      {inhalt}
    </div>
  )
}

function MobilSlotChip({ person, name }: { person: MitgliedPlanInfo | null; name: string }) {
  return (
    <div
      className="flex items-center justify-center flex-1 min-h-[32px] rounded-badge border border-border-hover bg-accent-soft px-1 overflow-hidden text-foreground"
      title={name}
    >
      <Avatar
        mitgliedId={person?.id ?? null}
        anzeigename={name}
        avatarUrl={person?.avatarUrl ?? null}
        groesse="md"
        className="h-4/5 aspect-square w-auto text-[11px]"
      />
    </div>
  )
}

function MobilOffenChip({ dot: _dot }: { dot: boolean }) {
  return (
    <div className="flex-1 min-h-[32px] rounded-badge border border-border-hover bg-accent-soft flex items-center justify-center">
      <span
        className="inline-flex items-center justify-center h-4/5 aspect-square w-auto rounded-full text-[14px] font-bold shrink-0 text-danger"
        style={{ boxShadow: '0 0 0 1.5px var(--color-danger)' }}
        title="offen"
      >
        ?
      </span>
    </div>
  )
}

function MobilZellenBox({
  aufgabeId,
  zeitfensterId,
  datum,
  zuteilung,
  mitglieder,
  onSlotKlick,
}: {
  aufgabeId: number
  zeitfensterId: number
  datum: string
  zuteilung: Zuteilung | null
  mitglieder: PlanDto['mitglieder']
} & Omit<RasterAktionen, 'istAdmin' | 'heute'>) {
  const { setNodeRef, isOver } = useDroppable({ id: `box-${aufgabeId}-${datum}` })
  const person = zuteilung?.mitgliedId
    ? mitglieder.find(m => m.id === zuteilung.mitgliedId) ?? null
    : null

  const inhalt: ReactNode = person ? (
    <div
      className="flex items-center justify-center flex-1 min-h-[32px] rounded-badge border border-border-hover bg-accent-soft px-1 overflow-hidden text-foreground"
      title={person.anzeigename}
    >
      <Avatar
        mitgliedId={person.id}
        anzeigename={person.anzeigename}
        avatarUrl={person.avatarUrl}
        groesse="md"
        className="h-4/5 aspect-square w-auto text-[11px]"
      />
    </div>
  ) : (
    <div className="flex-1 min-h-[32px] rounded-badge flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--color-accent-ring)' }} aria-hidden="true" />
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      className={`cursor-pointer h-full flex items-stretch ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
      onClick={() => onSlotKlick(zeitfensterId, datum)}
      style={{ touchAction: 'none' }}
    >
      {inhalt}
    </div>
  )
}
