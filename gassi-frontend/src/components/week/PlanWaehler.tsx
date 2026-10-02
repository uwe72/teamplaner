import { useNavigate } from 'react-router-dom'
import useBereiche from '../../hooks/useBereiche'

export default function PlanWaehlerSheet({ offen, schliessen }: { offen: boolean; schliessen: () => void }) {
  const navigate = useNavigate()
  const bereicheAbfrage = useBereiche()

  if (!offen) return null

  const aktive = (bereicheAbfrage.data ?? [])
    .filter(b => b.aktiv)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-label="Plan wählen">
      <div className="absolute inset-0 bg-black/40" onClick={schliessen} />
      <div
        className="absolute left-0 right-0 bottom-0 rounded-t-[20px] p-4 flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--tp-surface)',
          boxShadow: '0 -4px 24px rgba(0,0,0,.15)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ backgroundColor: 'var(--tp-soft)' }} aria-hidden="true" />
        <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--tp-ink)' }}>Plan wählen</p>
        {aktive.map(b => (
          <button
            key={b.id}
            type="button"
            className="flex items-center justify-between px-4 h-12 text-left"
            style={{
              borderRadius: 'var(--tp-radius-pill)',
              backgroundColor: 'var(--tp-surface)',
              boxShadow: 'var(--tp-shadow)',
              border: '1px solid var(--tp-soft)',
            }}
            onClick={() => {
              schliessen()
              navigate(`/plan/${b.id}`)
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tp-ink)' }}>{b.name}</span>
            <span aria-hidden="true" style={{ color: 'var(--tp-muted)' }}>›</span>
          </button>
        ))}
        <button
          type="button"
          className="mt-1 h-10"
          style={{ color: 'var(--tp-muted)', fontWeight: 700, fontSize: 14 }}
          onClick={schliessen}
        >
          Schließen
        </button>
      </div>
    </div>
  )
}
