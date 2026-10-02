import { useDroppable } from '@dnd-kit/core'
import type { MitgliedPlanInfo, Zuteilung } from '../../types'
import { wochentagKurz } from '../../utils/datum'
import { useAvatar } from '../../hooks/useAvatar'
import RundAvatar from './RundAvatar'
import Plus from './Plus'

export interface SlotCellAktionen {
  eigeneId: number
  heute: string
  popCellKey: string | null
  onFreiKlick: (datum: string, zeitfensterId: number) => void
  onEigeneKlick: (datum: string, zuteilungId: number) => void
  onBelegtKlick: (datum: string, zeitfensterId: number) => void
}

interface SlotCellProps {
  datum: string
  zeitfensterId: number
  aufgabeId: number | null
  zeilenZuteilungen: Zuteilung[]
  mitglieder: MitgliedPlanInfo[]
  kuerzelMap: Map<string, string>
  cellKey: string
  aktionen: SlotCellAktionen
}

export default function SlotCell({
  datum,
  zeitfensterId,
  aufgabeId,
  zeilenZuteilungen,
  mitglieder,
  kuerzelMap,
  cellKey,
  aktionen,
}: SlotCellProps) {
  const droppableId = aufgabeId != null ? `box-${aufgabeId}-${datum}` : `slot-${zeitfensterId}-${datum}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const mehrere = zeilenZuteilungen.length > 1
  const person = zeilenZuteilungen[0]?.mitgliedId
    ? mitglieder.find(m => m.id === zeilenZuteilungen[0].mitgliedId) ?? null
    : null
  const istEigene = person != null && person.id === aktionen.eigeneId
  const istFrei = zeilenZuteilungen.every(z => !z.mitgliedId)
  const teilweise = mehrere && zeilenZuteilungen.some(z => !z.mitgliedId)
  const istHeute = datum === aktionen.heute
  const pop = cellKey === aktionen.popCellKey ? 'tp-pop' : undefined

  const bg = 'var(--tp-surface)'
  let border = '2px solid transparent'
  if (istFrei) border = '2px dashed var(--tp-free-border)'
  else if (istHeute) border = '2px solid var(--tp-accent)'

  const wochentag = wochentagKurz(datum)
  const name = person?.anzeigename ?? zeilenZuteilungen[0]?.anzeigename ?? ''
  const kuerzel = name ? kuerzelMap.get(name) : undefined
  const { data: bildUrl } = useAvatar(person?.id ?? null, person?.avatarUrl ?? null)
  const vorname = name.split(/\s+/)[0].slice(0, 8) + (name.split(/\s+/)[0].length > 8 ? '…' : '')
  const ariaLabel = istFrei
    ? `${wochentag}, Runde frei — antippen zum Übernehmen`
    : istEigene
      ? `${wochentag}: du, antippen zum Freigeben`
      : `${wochentag}: ${name}`

  function klick() {
    if (istFrei || (mehrere && teilweise)) {
      aktionen.onFreiKlick(datum, zeitfensterId)
    } else if (mehrere) {
      aktionen.onBelegtKlick(datum, zeitfensterId)
    } else if (istEigene && zeilenZuteilungen[0]?.id != null) {
      aktionen.onEigeneKlick(datum, zeilenZuteilungen[0].id)
    } else if (istEigene) {
      aktionen.onFreiKlick(datum, zeitfensterId)
    }
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="tp-cell flex items-center justify-center w-full h-full px-1 py-0.5"
      style={{
        borderRadius: 'var(--tp-radius-cell)',
        backgroundColor: bg,
        border,
        boxShadow: isOver ? '0 0 0 2px var(--tp-accent)' : 'var(--tp-shadow)',
        cursor: istFrei || istEigene || mehrere ? 'pointer' : 'default',
        touchAction: 'none',
      }}
      aria-label={ariaLabel}
      title={name || 'frei'}
      onClick={klick}
    >
      {istFrei || (mehrere && zeilenZuteilungen.length === 0) ? (
        <span className="flex items-center gap-1.5 select-none">
          <span
            className="inline-flex items-center justify-center rounded-full shrink-0 tp-pulse"
            style={{ width: 40, height: 40, backgroundColor: 'var(--tp-free-bg)' }}
          >
            <Plus farbe="var(--tp-free)" groesse={22} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tp-free)' }}>frei</span>
        </span>
      ) : (
        <span
          className={`flex items-center justify-center ${pop ?? ''}`}
          style={{ gap: 10, height: 'min(88px, calc(100% - 1px))' }}
        >
          <span
            className="relative inline-flex items-center justify-center"
            style={{
              height: '95%',
              width: 'auto',
              aspectRatio: '1 / 1',
            }}
          >
            <RundAvatar
              mitgliedId={person?.id ?? null}
              anzeigename={name}
              avatarUrl={person?.avatarUrl ?? null}
              groesse={60}
              kuerzel={kuerzel}
              style={{
                width: '100%',
                height: '100%',
                boxShadow: '0 0 0 3px #fff, var(--tp-shadow-avatar)',
              }}
            />
            {mehrere && teilweise && (
              <span
                className="absolute rounded-full tp-pulse"
                style={{
                  width: 20,
                  height: 20,
                  right: -4,
                  bottom: -2,
                  backgroundColor: 'var(--tp-free-bg)',
                  border: '2px dashed var(--tp-free-border)',
                  boxShadow: '0 0 0 2px #fff',
                }}
                aria-label="Runde teilweise frei"
              />
            )}
          </span>
          {name !== '' && (
            <span
              aria-hidden="true"
              className="tp-cell-text flex flex-col"
              style={{ lineHeight: 1.05, alignItems: 'flex-start' }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: 'var(--tp-ink)',
                  letterSpacing: '.02em',
                }}
              >
                {bildUrl ? kuerzel : vorname}
              </span>
            </span>
          )}
        </span>
      )}
    </button>
  )
}
