export function progressColor(ist: number, soll: number): string | null {
  if (soll <= 0) return null
  const r = ist / soll
  if (r >= 1) return 'var(--tp-prog-done)'
  if (r >= 0.67) return 'var(--tp-prog-high)'
  if (r >= 0.34) return 'var(--tp-prog-mid)'
  return 'var(--tp-prog-low)'
}
