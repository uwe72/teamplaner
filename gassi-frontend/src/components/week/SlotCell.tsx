import { useDroppable } from '@dnd-kit/core'
import type { MitgliedPlanInfo, Zuteilung } from '../../types'
import { wochentagKurz } from '../../utils/datum'
import { useAvatar } from '../../hooks/useAvatar'
import RundAvatar from './RundAvatar'
import Plus from './Plus'
import { personFarbe } from '../../utils/farben'
import { rundeVergangen } from '../../utils/runde'
import { vorname } from '../../utils/vorname'
import { LABELS } from '../../utils/texte'

const DESKTOP_AVATAR_GROESSE = 50

export interface SlotCellAktionen {
  eigeneId: number
  heute: string
  popCellKey: string | null
  istAdmin: boolean
  onFreiKlick: (datum: string, zeitfensterId: number) => void
  onEigeneKlick: (datum: string, zuteilungId: number) => void
  onBelegtKlick: (datum: string, zeitfensterId: number) => void
}

interface SlotCellProps {
  datum: string
  zeitfensterId: number
  zeitfensterName?: string | null
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
  zeitfensterName,
  aufgabeId,
  zeilenZuteilungen,
  mitglieder,
  kuerzelMap,
  cellKey,
  aktionen,
  varianz = 'mobil',
}: SlotCellProps) {
  const desktop = varianz === 'desktop'
  const avatarGroesse = desktop ? 50 : 60
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

  const wochentag = wochentagKurz(datum)
  const name = person?.anzeigename ?? zeilenZuteilungen[0]?.anzeigename ?? ''
  const { data: bildUrl } = useAvatar(person?.id ?? null, person?.avatarUrl ?? null)

  const vergangen = rundeVergangen(datum, { zeitfensterName: zeitfensterName ?? null })

  if (desktop) {
    if (istFrei && vergangen && !aktionen.istAdmin) {
      return (
        <div
          className="pm-nicht-besetzt flex items-center justify-center w-full"
          style={{ minHeight: 'var(--pm-cell-height)' }}
          aria-label={`${wochentag}: nicht besetzt`}
          title={`${wochentag}: nicht besetzt`}
        >
          <span style={{ fontSize: 13, color: 'var(--pm-muted)' }}>nicht besetzt</span>
        </div>
      )
    }

    const bestezeilen = zeilenZuteilungen.filter(z => z.mitgliedId)

    const klickDesktop = () => {
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

    if (istFrei || (mehrere && bestezeilen.length === 0)) {
      return (
        <button
          ref={setNodeRef}
          type="button"
          className="pm-zelle tp-focus flex items-center justify-center w-full px-2"
          style={{
            border: 'none',
            backgroundColor: 'var(--pm-free-bg)',
            outline: isOver ? '2px solid var(--pm-ink)' : undefined,
            cursor: 'pointer',
            touchAction: 'none',
          }}
          aria-label={`${wochentag}, ${LABELS.unitSingular} frei — antippen zum Übernehmen`}
          title="frei"
          onClick={klickDesktop}
        >
          <span className={`flex items-center gap-2 select-none ${pop ?? ''}`}>
            <span
              className="inline-flex items-center justify-center rounded-full shrink-0"
              style={{ width: 30, height: 30, backgroundColor: 'var(--pm-free-plus)' }}
            >
              <Plus farbe="#fff" groesse={14} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pm-free-text)' }}>frei</span>
          </span>
        </button>
      )
    }

    const zeigeFreigabeChipDesktop = (!vergangen || aktionen.istAdmin) && istEigene
    const personenEindeutig: MitgliedPlanInfo[] = []
    for (const id of new Set(bestezeilen.map(z => z.mitgliedId))) {
      const p = mitglieder.find(m => m.id === id)
      if (p) personenEindeutig.push(p)
    }
    const namenText = personenEindeutig.map(p => p.anzeigename).join(', ')

    return (
      <button
        ref={setNodeRef}
        type="button"
        className={`pm-zelle tp-focus relative flex items-center justify-center w-full px-3 ${zeigeFreigabeChipDesktop ? 'pm-zelle-eigene' : ''}`}
        style={{
          outline: isOver ? '2px solid var(--pm-ink)' : undefined,
          cursor: 'pointer',
          touchAction: 'none',
        }}
        title={`${wochentag}: ${namenText}`}
        onClick={klickDesktop}
      >
        <span className={`flex items-center justify-center w-full min-w-0 ${pop ?? ''}`}>
          <DesktopPersonen personen={personenEindeutig} kuerzel={kuerzelMap} />
          {personenEindeutig.length === 1 && (
            <span
              className="min-w-0"
              style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--pm-ink)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              title={namenText}
            >
              {namenText}
            </span>
          )}
        </span>
        {zeigeFreigabeChipDesktop && <span className="pm-freigeben-chip" aria-hidden="true">Freigeben</span>}
      </button>
    )
  }

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

  const ariaLabel = istFrei
    ? `${wochentag}: ${LABELS.unitSingular} frei, antippen zum Übernehmen`
    : istEigene
      ? `${wochentag}: du, antippen zum Freigeben`
      : `${wochentag}: ${name}`

  const bg = 'var(--tp-surface)'
  let border = '2px solid transparent'
  if (istFrei) border = '2px dashed var(--tp-free-border)'
  else if (istHeute) border = '2px solid var(--tp-accent)'

  const kuerzel = name ? kuerzelMap.get(name) : undefined
  const farbe = personFarbe(person, mitglieder)
  const vornameText = vorname(name)
  const vornameKurz = vornameText.slice(0, 8) + (vornameText.length > 8 ? '…' : '')

  const zeigeFreigabeChip = (!vergangen || aktionen.istAdmin) && istEigene

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tp-cell tp-hover-frei relative flex items-center justify-center w-full h-full px-1 py-0.5 ${istEigene ? 'tp-zelle-eigene' : ''} tp-focus`}
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
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tp-free)' }}>+ frei</span>
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
                    boxShadow: '0 0 0 2px var(--tp-surface)',
                  }}
                  aria-label={`${LABELS.unitSingular} teilweise frei`}
                />
              </span>
            )
          })}
        </span>
      ) : (
        <span
          className={`flex items-center justify-center ${pop ?? ''}`}
          style={{ gap: 10, height: 'min(88px, calc(100% - 1px))' }}
        >
          <span
            className="relative inline-flex items-center justify-center shrink-0"
            style={{
              height: `min(${avatarGroesse}px, calc(100% - 8px))`,
              width: 'auto',
              aspectRatio: '1 / 1',
            }}
          >
            <RundAvatar
              mitgliedId={person?.id ?? null}
              anzeigename={name}
              avatarUrl={person?.avatarUrl ?? null}
              groesse={avatarGroesse}
              kuerzel={kuerzel}
              farbe={farbe}
              style={{
                width: '100%',
                height: '100%',
                boxShadow: '0 0 0 3px var(--tp-surface), var(--tp-shadow-avatar)',
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
                  boxShadow: '0 0 0 2px var(--tp-surface)',
                }}
                aria-label={`${LABELS.unitSingular} teilweise frei`}
              />
            )}
          </span>
          {name !== '' && (
            <span
              aria-hidden="true"
              className="tp-cell-text"
              style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 20, fontWeight: 900, color: farbe ?? 'var(--tp-ink)', letterSpacing: '.02em' }}
            >
              {bildUrl ? kuerzel : vornameKurz}
            </span>
          )}
        </span>
      )}
      {zeigeFreigabeChip && <span className="tp-freigeben-chip" aria-hidden="true">Freigeben</span>}
    </button>
  )
}

function DesktopPersonen({
  personen,
  kuerzel,
}: {
  personen: MitgliedPlanInfo[]
  kuerzel: Map<string, string>
}) {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      {personen.map((p, index) => (
        <RundAvatar
          key={p.id}
          mitgliedId={p.id}
          anzeigename={p.anzeigename}
          avatarUrl={p.avatarUrl}
          groesse={DESKTOP_AVATAR_GROESSE}
          kuerzel={kuerzel.get(p.anzeigename)}
          fallbackBg="var(--pm-heute)"
          fallbackTextFarbe="var(--pm-ink)"
          style={{
            width: DESKTOP_AVATAR_GROESSE,
            height: DESKTOP_AVATAR_GROESSE,
            marginLeft: index > 0 ? -12 : 0,
            boxShadow: '0 0 0 2px #fff',
            zIndex: personen.length - index,
          }}
        />
      ))}
    </span>
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
          boxShadow: '0 0 0 3px var(--tp-surface), var(--tp-shadow-avatar)',
          zIndex: vorderster ? 1 : 0,
        }}
      />
    </span>
  )
}
