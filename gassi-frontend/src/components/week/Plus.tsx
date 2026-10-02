export default function Plus({ farbe, groesse }: { farbe: string; groesse: number }) {
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke={farbe} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
