import { useDroppable } from '@dnd-kit/core'
import type { PlanDto, Zuteilung } from '../types'
import tagLabel from '../utils/datum'
import type { ReactNode } from 'react'

export interface RasterAktionen {
  eigeneId: number
  istAdmin: boolean
  heute: string
  onBoxKlick: (aufgabeId: number, datum: string, belegterName: string | null) => void
  onZeitfensterKlick: (zeitfensterId: number, datum: string) => void
}

export default function PlanRaster({
  plan,
  aktionen,
}: {
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  return (
    <div className="px-4 md:px-6 pt-4 pb-6">
      <div className="rounded-card border border-border overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-elevated table-header">
            <tr>
              <th className="w-[92px] md:w-[120px] text-left text-[12px] font-semibold uppercase tracking-wide text-muted border-b border-border px-2 md:px-3 py-2 h-[40px] select-none">
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
  return (
    <>
      <tr className="bg-elevated">
        <ZeitfensterKopf gruppe={gruppe} plan={plan} aktionen={aktionen} />
      </tr>
      {gruppe.zeilen.map(zeile => (
        <tr key={zeile.aufgabe.id} className="hover:bg-card-hover border-b border-border last:border-b-0 align-top">
          <td className="px-2 md:px-3 py-2 text-muted font-medium leading-tight">
            {zeile.aufgabe.name}
          </td>
          {plan.tage.map(datum => (
            <ZellenBox
              key={datum}
              aufgabeId={zeile.aufgabe.id}
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

function ZeitfensterKopf({
  gruppe,
  plan,
  aktionen,
}: {
  gruppe: PlanDto['gruppen'][number]
  plan: PlanDto
  aktionen: RasterAktionen
}) {
  return (
    <>
      <td className="px-2 md:px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none">
        {gruppe.zeitfensterName}
      </td>
      {plan.tage.map(datum => (
        <ZeitfensterDropzelle
          key={datum}
          zeitfensterId={gruppe.zeitfensterId}
          datum={datum}
          anzahl={gruppe.zeilen.length}
          {...aktionen}
        />
      ))}
    </>
  )
}

function ZeitfensterDropzelle({
  zeitfensterId,
  datum,
  anzahl,
  onZeitfensterKlick,
}: {
  zeitfensterId: number
  datum: string
  anzahl: number
} & Omit<RasterAktionen, 'onBoxKlick'>) {
  const { setNodeRef, isOver } = useDroppable({ id: `zf-${zeitfensterId}-${datum}` })
  return (
    <td
      ref={setNodeRef}
      onClick={() => onZeitfensterKlick(zeitfensterId, datum)}
      title={anzahl > 1 ? `Alle ${anzahl} Aufgaben dieses Zeitfensters zuweisen` : undefined}
      className="cursor-pointer px-1 md:px-1.5 border-b border-border hover:bg-card-hover align-middle"
      style={{ touchAction: 'none' }}
    >
      <div
        className={`text-[10px] leading-none text-muted text-center py-1 px-1.5 rounded-badge border border-dashed border-border-strong select-none ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
      >
        alle
      </div>
    </td>
  )
}

function ZellenBox({
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
      className="flex items-center gap-1.5 px-1.5 py-1 rounded-badge border text-[12px] md:text-[13px] leading-none min-h-[26px]"
      style={{ backgroundColor: `${person.farbe}1f`, borderColor: person.farbe }}
    >
      <span className="font-medium truncate" style={{ color: person.farbe }}>
        {person.anzeigename}
      </span>
    </div>
  ) : (
    <div className="flex items-center px-1.5 py-1 rounded-badge border border-dashed text-[12px] md:text-[13px] text-accent hover:bg-card-hover min-h-[26px]"
      style={{ borderColor: 'var(--color-accent-ring)', backgroundColor: 'var(--color-accent-soft)' }}>
      offen
    </div>
  )

  return (
    <td className="px-1 md:px-1.5 py-1 align-top">
      <div
        ref={setNodeRef}
        className={`cursor-pointer ${isOver ? 'outline-2 outline-dashed rounded-badge outline-accent' : ''}`}
        onClick={() => onBoxKlick(aufgabeId, datum, zuteilung?.anzeigename ?? null)}
        style={{ touchAction: 'none' }}
      >
        {inhalt}
      </div>
    </td>
  )
}
