import { useDraggable } from '@dnd-kit/core'
import type { MitgliedPlanInfo } from '../types'

export default function PersonenLeiste({
  mitglieder,
  eigeneId,
  label = true,
  kompakt = false,
}: {
  mitglieder: MitgliedPlanInfo[]
  eigeneId: number
  label?: boolean
  kompakt?: boolean
}) {
  const sortiert = [...mitglieder].sort((a, b) => {
    if (a.id === eigeneId) return -1
    if (b.id === eigeneId) return 1
    return a.anzeigename.localeCompare(b.anzeigename)
  })

  return (
    <div>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-subtle mb-2">
          Teammitglieder — auf eine Zelle ziehen oder antippen
        </p>
      )}
      <div className={kompakt ? 'flex gap-1.5 flex-nowrap overflow-x-auto' : 'flex gap-3 flex-wrap'}>
        {sortiert.map(m => <PersonChip key={m.id} m={m} kompakt={kompakt} />)}
      </div>
    </div>
  )
}

function PersonChip({ m, kompakt }: { m: MitgliedPlanInfo; kompakt: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `karte-${m.id}` })
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`inline-flex items-center text-xs font-medium whitespace-nowrap rounded-badge border transition-colors ${kompakt ? 'gap-1.5 h-7 px-2 shrink-0' : 'gap-2 h-6 px-2.5'}`}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        backgroundColor: `${m.farbe}1f`,
        borderColor: m.farbe,
        color: m.farbe,
        zIndex: isDragging ? 50 : undefined,
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.farbe }} />
      {m.anzeigename}
      <span
        className="inline-flex items-center px-1.5 h-4 rounded-badge text-[10px] font-semibold tabular-nums"
        style={{
          backgroundColor: m.sollUnterschritten ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          color: m.sollUnterschritten ? 'var(--color-danger)' : 'var(--color-success)',
        }}
        title={m.sollUnterschritten ? `Soll ${m.soll}, Ist ${m.ist} — es fehlen noch Zuteilungen` : `Soll ${m.soll}, Ist ${m.ist} — erfüllt`}
      >
        {m.ist}/{m.soll}
      </span>
    </button>
  )
}
