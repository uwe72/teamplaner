import { useDroppable } from '@dnd-kit/core'
import type { PlanDto, Zuteilung } from '../types'
import { wochentagKurz, tagKurz } from '../utils/datum'
import type { ReactNode } from 'react'
import type { RasterAktionen } from './PlanRaster'

export default function PlanRasterMobil({
  plan,
  aktionen,
}: {
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  return (
    <div className="px-2 pt-1 pb-2">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-elevated table-header">
            <tr>
              <th className="w-[44px] min-w-[44px] border-b border-border" />
              {plan.gruppen.map(gruppe => (
                <th
                  key={gruppe.zeitfensterId}
                  colSpan={gruppe.zeilen.length}
                  className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted border-b border-l border-border truncate select-none"
                  title={gruppe.zeitfensterName}
                >
                  {gruppe.zeitfensterName}
                </th>
              ))}
            </tr>
            <tr>
              <th className="w-[44px] min-w-[44px] border-b border-border select-none" />
              {plan.gruppen.map(gruppe => (
                <MobilKopfzeile key={gruppe.zeitfensterId} gruppe={gruppe} />
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

function MobilKopfzeile({
  gruppe,
}: {
  gruppe: PlanDto['gruppen'][number]
}) {
  return (
    <>
      {gruppe.zeilen.map(zeile => (
        <th
          key={zeile.aufgabe.id}
          className="border-b border-l border-border px-0.5 py-0.5 select-none"
        >
          <div
            className="text-[11px] font-medium text-muted leading-none h-[24px] flex items-end justify-center overflow-hidden whitespace-nowrap"
            title={zeile.aufgabe.name}
          >
            {zeile.aufgabe.name}
          </div>
        </th>
      ))}
    </>
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
  return (
    <>
      {gruppe.zeilen.map(zeile => (
        <td
          key={zeile.aufgabe.id}
          className="border-l border-b border-border p-1 align-top"
        >
          <MobilZellenBox
            aufgabeId={zeile.aufgabe.id}
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

function MobilZellenBox({
  aufgabeId,
  datum,
  zuteilung,
  mitglieder,
  onBoxKlick,
}: {
  aufgabeId: number
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
      className="flex items-center justify-center h-[36px] rounded-badge border px-0.5 overflow-hidden"
      style={{ backgroundColor: `${person.farbe}1f`, borderColor: person.farbe, color: person.farbe }}
      title={person.anzeigename}
    >
      <span className="text-[11px] font-semibold leading-none truncate">{erstesWort(person.anzeigename)}</span>
    </div>
  ) : (
    <div className="h-[36px] rounded-badge flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--color-accent-ring)' }} aria-hidden="true" />
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      className={`cursor-pointer ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
      onClick={() => onBoxKlick(aufgabeId, datum, zuteilung?.anzeigename ?? null)}
      style={{ touchAction: 'none' }}
    >
      {inhalt}
    </div>
  )
}

function erstesWort(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
