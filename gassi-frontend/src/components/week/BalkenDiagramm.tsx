export default function BalkenDiagramm({ farbe, groesse }: { farbe: string; groesse: number }) {
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20v-5M12 20V9M19 20V4" stroke={farbe} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
