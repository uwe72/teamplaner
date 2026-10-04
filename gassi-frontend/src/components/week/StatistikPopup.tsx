import StatistikInhalt from './StatistikInhalt'

export default function StatistikPopup({
  bereichId,
  onClose,
}: {
  bereichId: number
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4" onClick={onClose}>
      <div
        className="p-4 sm:p-5 bg-card border border-border rounded-card shadow-2xl w-full max-w-[640px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-end mb-3">
          <button
            type="button"
            title="Schließen"
            aria-label="Schließen"
            className="inline-flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6 rounded-badge border text-xs shrink-0 hover:bg-card-hover"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <StatistikInhalt bereichId={bereichId} nebeneinander gestapelt />
      </div>
    </div>
  )
}
