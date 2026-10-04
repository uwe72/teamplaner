import { useEffect, useState } from 'react'

export default function BildOverlay({
  bildUrl,
  titel,
  onClose,
}: {
  bildUrl: string
  titel?: string | null
  onClose: () => void
}) {
  const [groesse, setGroesse] = useState<{ breite: number; hoehe: number } | null>(null)

  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="flex flex-col max-w-full max-h-full overflow-auto" onClick={e => e.stopPropagation()}>
        <img
          src={bildUrl}
          alt={titel ?? ''}
          className="max-w-none rounded-card shadow-2xl"
          onLoad={e => setGroesse({ breite: e.currentTarget.naturalWidth, hoehe: e.currentTarget.naturalHeight })}
        />
        <div className="sticky bottom-0 mt-2 self-start bg-black/60 text-white text-xs px-3 py-1.5 rounded-badge">
          {titel}
          {groesse && <span> · {groesse.breite} × {groesse.hoehe} px</span>}
        </div>
      </div>
    </div>
  )
}
