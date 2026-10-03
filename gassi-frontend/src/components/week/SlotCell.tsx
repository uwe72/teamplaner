import { useDroppable } from '@dnd-kit/core'
import type { MitgliedPlanInfo, Zuteilung } from '../../types'
import { wochentagKurz } from '../../utils/datum'
import { useAvatar } from '../../hooks/useAvatar'
import RundAvatar from './RundAvatar'
import Plus from './Plus'
import { personFarbe } from '../../utils/farben'

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
  varianz?: 'mobil' | 'desktop'
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
  varianz = 'mobil',
}: SlotCellProps) {
  const desktop = varianz === 'desktop'
  const droppableId = aufgabeId != null ? `box-${aufgabeId}-${datum}` : `slot-${zeitfensterId}-${datum}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const mehrere = zeilenZuteilungen.length > 1
  const personen: MitgliedPlanInfo[] = []
  for (const id of new Set(zeilenZuteilungen.filter(z => z.mitgliedId).map(z => z.mitgliedId))) {
    const p = mitglieder.find(m => m.id === id)
    if (p) personen.push(p)
  }
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
  const farbe = personFarbe(person, mitglieder)
  const { data: bildUrl } = useAvatar(person?.id ?? null, person?.avatarUrl ?? null)
  const vornameText = name.split(/\s+/)[0] ?? ''
  const vorname = vornameText.slice(0, 8) + (vornameText.length > 8 ? '…' : '')
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

  const hoverKlasse = desktop ? (istFrei ? 'tp-hover-frei' : 'tp-hover-lift') : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tp-cell flex items-center justify-center w-full h-full px-1 py-0.5 ${hoverKlasse ?? ''} tp-focus`}
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
            style={{ width: 40, height: 40, backgroundColor: 'var(--tp-free-bg)', transform: 'scale(1.02)' }}
          >
            <Plus farbe="var(--tp-free)" groesse={22} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tp-free)' }}>+ frei</span>
        </span>
      ) : desktop && personen.length > 1 ? (
        <span
          className={`flex flex-col justify-center ${pop ?? ''}`}
          style={{ gap: 8, width: '100%', padding: '8px 6px' }}
        >
          {personen.map(p => (
            <span
              key={p.id}
              className="flex items-center"
              style={{ gap: 10, paddingLeft: 8 }}
            >
              <RundAvatar
                mitgliedId={p.id}
                anzeigename={p.anzeigename}
                avatarUrl={p.avatarUrl}
                groesse={40}
                kuerzel={kuerzelMap.get(p.anzeigename)}
                farbe={personFarbe(p, mitglieder)}
                style={{ boxShadow: '0 0 0 2px #fff, var(--tp-shadow-avatar)' }}
              />
              <span
                aria-hidden="true"
                className="tp-cell-text"
                style={{ fontSize: 18, fontWeight: 900, color: personFarbe(p, mitglieder) ?? 'var(--tp-ink)', letterSpacing: '.02em', whiteSpace: 'nowrap' }}
              >
                {kuerzelMap.get(p.anzeigename)}
              </span>
              {p.id === aktionen.eigeneId && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tp-muted)' }}>du</span>
              )}
            </span>
          ))}
          {teilweise && (
            <span className="flex items-center" style={{ gap: 10, paddingLeft: 8 }}>
              <span
                className="rounded-full tp-pulse"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'var(--tp-free-bg)',
                  border: '2px dashed var(--tp-free-border)',
                  boxShadow: '0 0 0 2px #fff',
                }}
                aria-label="Runde teilweise frei"
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tp-free)' }}>+ frei</span>
            </span>
          )}
        </span>
      ) : personen.length > 1 ? (
        <span
          className={`flex items-center justify-center ${pop ?? ''}`}
          style={{ gap: 6, height: 'min(88px, calc(100% - 1px))' }}
        >
          {personen.slice(0, 3).map((p, idx) => {
            const kreis = (
              <PersonKreis
                key={p.id}
                person={p}
                kuerzel={kuerzelMap.get(p.anzeigename)}
                mitglieder={mitglieder}
                groesse={44}
                versatz={personen.length > 1 ? -12 : 0}
                vorderster={idx === 0}
              />
            )
            const verbleibende = personen.length - 3
            if (idx > 0 && verbleibende > 0 && idx === 2) {
              return (
                <span key={`mehr-${p.id}`} className="relative inline-flex" style={{ height: 44 }}>
                  {kreis}
                  <span
                    aria-label={`${verbleibende} weitere`}
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      right: -6,
                      bottom: -2,
                      backgroundColor: 'var(--tp-surface)',
                      border: '2px solid var(--tp-soft)',
                      fontSize: 9,
                      fontWeight: 900,
                      color: 'var(--tp-ink)',
                      boxSizing: 'border-box',
                      zIndex: 1,
                    }}
                  >
                    +{verbleibende}
                  </span>
                </span>
              )
            }
            if (idx < personen.length - 1 || !teilweise || personen.length > 3) return kreis
            return (
              <span key={`tw-${p.id}`} className="relative inline-flex" style={{ height: 44 }}>
                {kreis}
                <span
                  className="absolute rounded-full tp-pulse"
                  style={{
                    width: 18,
                    height: 18,
                    right: -3,
                    bottom: 0,
                    backgroundColor: 'var(--tp-free-bg)',
                    border: '2px dashed var(--tp-free-border)',
                    boxShadow: '0 0 0 2px #fff',
                  }}
                  aria-label="Runde teilweise frei"
                />
              </span>
            )
          })}
        </span>
      ) : (
        <span
          className={`flex items-center justify-center ${pop ?? ''}`}
          style={{ gap: desktop ? 10 : 10, height: 'min(88px, calc(100% - 1px))' }}
        >
          <span
            className="relative inline-flex items-center justify-center shrink-0"
            style={
              desktop
                ? { width: 52, height: 52 }
                : {
                    height: 'min(60px, calc(100% - 8px))',
                    width: 'auto',
                    aspectRatio: '1 / 1',
                  }
            }
          >
            <RundAvatar
              mitgliedId={person?.id ?? null}
              anzeigename={name}
              avatarUrl={person?.avatarUrl ?? null}
              groesse={desktop ? 52 : 60}
              kuerzel={kuerzel}
              farbe={farbe}
              style={
                desktop
                  ? { width: 52, height: 52, boxShadow: '0 0 0 3px #fff, var(--tp-shadow-avatar)' }
                  : {
                      width: '100%',
                      height: '100%',
                      boxShadow: '0 0 0 3px #fff, var(--tp-shadow-avatar)',
                    }
              }
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
              style={{ lineHeight: 1.05, alignItems: 'flex-start', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: farbe ?? 'var(--tp-ink)',
                  letterSpacing: '.02em',
                }}
              >
                {bildUrl ? kuerzel : vorname}
              </span>
              {desktop && istEigene && (
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tp-muted)' }}>du</span>
              )}
            </span>
          )}
          {desktop && istEigene && name === '' && (
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tp-muted)' }}>du</span>
          )}
        </span>
      )}
    </button>
  )
}

function PersonKreis({
  person,
  kuerzel,
  mitglieder,
  groesse,
  versatz = 0,
  vorderster = false,
}: {
  person: MitgliedPlanInfo
  kuerzel: string | undefined
  mitglieder: MitgliedPlanInfo[]
  groesse: number
  versatz?: number
  vorderster?: boolean
}) {
  return (
    <span
      className="relative inline-flex shrink-0"
      style={vorderster && versatz !== 0 ? { marginRight: versatz } : { marginLeft: versatz }}
    >
      <RundAvatar
        mitgliedId={person.id}
        anzeigename={person.anzeigename}
        avatarUrl={person.avatarUrl ?? null}
        groesse={groesse}
        kuerzel={kuerzel}
        farbe={personFarbe(person, mitglieder)}
        style={{
          width: groesse,
          height: groesse,
          boxShadow: '0 0 0 3px #fff, var(--tp-shadow-avatar)',
          zIndex: vorderster ? 1 : 0,
        }}
      />
    </span>
  )
}
