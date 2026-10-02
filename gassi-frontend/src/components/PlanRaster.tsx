import { useDroppable } from '@dnd-kit/core'
import type { MitgliedPlanInfo, PlanDto, ZeitfensterGruppe } from '../types'
import tagLabel from '../utils/datum'
import type { ReactNode } from 'react'
import Avatar from './Avatar'

export interface RasterAktionen {
  eigeneId: number
  istAdmin: boolean
  heute: string
  onSlotKlick: (zeitfensterId: number, datum: string) => void
}

export default function PlanRaster({
  plan,
  aktionen,
}: {
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  return (
    <div className="px-4 md:px-6 pt-4 pb-6 h-full flex flex-col min-h-0">
      <div className="rounded-card border border-border overflow-x-auto flex-1 min-h-0">
        <table className="w-full table-fixed h-full">
          <thead className="bg-elevated table-header">
            <tr>
              <th className="w-[64px] md:w-[88px] text-left text-[12px] font-semibold uppercase tracking-wide text-muted border-b border-border px-2 md:px-3 py-2 h-[40px] select-none">
                Aufgabe
              </th>
              {plan.tage.map(d => {
                const istHeute = d === aktionen.heute
                return (
                  <th
                    key={d}
                    className={`text-left text-[12px] font-semibold uppercase tracking-wide border-b border-border px-2 py-2 h-[40px] select-none ${istHeute ? 'text-foreground border-t-2 border-t-accent bg-warning-bg' : 'text-muted'}`}
                  >
                    {istHeute ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                        {tagLabel(d)}
                      </span>
                    ) : (
                      tagLabel(d)
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-surface text-[13px]">
            {plan.gruppen.map(gruppe => (
              <ZeitfensterGruppeZeilen key={gruppe.zeitfensterId} gruppe={gruppe} plan={plan} aktionen={aktionen} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ZeitfensterGruppeZeilen({
  gruppe,
  plan,
  aktionen,
}: {
  gruppe: PlanDto['gruppen'][number]
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  const mehrfach = gruppe.zeilen.length > 1
  if (mehrfach) {
    return (
      <tr className="hover:bg-card-hover border-b border-border last:border-b-0 align-top">
        <td className="px-2 md:px-3 py-2 text-muted font-medium leading-tight" title={gruppe.zeitfensterName}>
          <span className="block truncate">{gruppe.zeitfensterName}</span>
        </td>
        {plan.tage.map(datum => (
          <ZeitfensterSlot
            key={datum}
            gruppe={gruppe}
            datum={datum}
            mitglieder={plan.mitglieder}
            {...aktionen}
          />
        ))}
      </tr>
    )
  }
  return (
    <>
      <tr className="bg-elevated">
        <td className="px-2 md:px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none" title={gruppe.zeitfensterName}>
          <span className="block truncate">{gruppe.zeitfensterName}</span>
        </td>
        {plan.tage.map(datum => (
          <td key={datum} className="border-b border-border" />
        ))}
      </tr>
      {gruppe.zeilen.map(zeile => (
        <tr key={zeile.aufgabe.id} className="hover:bg-card-hover border-b border-border last:border-b-0 align-top">
          <td className="px-2 md:px-3 py-2 text-muted font-medium leading-tight" title={zeile.aufgabe.name}>
            <span className="block truncate">{zeile.aufgabe.name}</span>
          </td>
          {plan.tage.map(datum => (
            <ZellenBox
              key={datum}
              aufgabeId={zeile.aufgabe.id}
              zeitfensterId={gruppe.zeitfensterId}
              zuteilung={zeile.zuteilungen.find(z => z.datum === datum) ?? null}
              datum={datum}
              mitglieder={plan.mitglieder}
              {...aktionen}
            />
          ))}
        </tr>
      ))}
    </>
  )
}

function ZeitfensterSlot({
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

  const inhalt: ReactNode = chips.length > 0 || offen ? (
    <div className="flex flex-col gap-1 h-full">
      {chips.map(c => (
        <SlotChip key={c.key} person={c.person} name={c.name} />
      ))}
      {offen && <OffenChip />}
    </div>
  ) : null

  return (
    <td className="p-1 align-top h-full">
      <div
        ref={setNodeRef}
        className={`cursor-pointer h-full ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
        onClick={() => onSlotKlick(gruppe.zeitfensterId, datum)}
        style={{ touchAction: 'none' }}
      >
        {inhalt}
      </div>
    </td>
  )
}

function SlotChip({ person, name }: { person: MitgliedPlanInfo | null; name: string }) {
  return (
    <div
      className="flex items-center gap-2 w-full min-h-[40px] px-2.5 py-0 rounded-badge border border-border-hover bg-accent-soft text-[13px] leading-none"
    >
      <Avatar
        mitgliedId={person?.id ?? null}
        anzeigename={name}
        avatarUrl={person?.avatarUrl ?? null}
        groesse="xxl"
      />
      <span className="font-medium truncate text-foreground" title={name}>
        {name}
      </span>
    </div>
  )
}

function OffenChip() {
  return (
    <div className="flex items-center justify-center w-full min-h-[40px] px-2.5 py-0 rounded-badge border border-border-hover bg-accent-soft">
      <span
        className="inline-flex items-center justify-center w-12 h-12 rounded-full text-[22px] font-bold shrink-0 text-danger"
        style={{ boxShadow: '0 0 0 1.5px var(--color-danger)' }}
        title="offen"
      >
        ?
      </span>
    </div>
  )
}

function ZellenBox({
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
  zuteilung: PlanDto['gruppen'][number]['zeilen'][number]['zuteilungen'][number] | null
  mitglieder: PlanDto['mitglieder']
} & Omit<RasterAktionen, 'istAdmin' | 'heute'>) {
  const { setNodeRef, isOver } = useDroppable({ id: `box-${aufgabeId}-${datum}` })
  const person = zuteilung?.mitgliedId
    ? mitglieder.find(m => m.id === zuteilung.mitgliedId) ?? null
    : null

  const inhalt: ReactNode = person ? (
    <SlotChip person={person} name={person.anzeigename} />
  ) : (
    <OffenChip />
  )

  return (
    <td className="p-1 align-top h-full">
      <div
        ref={setNodeRef}
        className={`cursor-pointer h-full flex ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
        onClick={() => onSlotKlick(zeitfensterId, datum)}
        style={{ touchAction: 'none' }}
      >
        {inhalt}
      </div>
    </td>
  )
}
