export const STATISTIK_FARBPALETTE = [
  '#b91c1c', '#c2410c', '#b7791f', '#4d7c0f', '#15803d', '#0f766e',
  '#0369a1', '#4338ca', '#7e22ce', '#a21caf', '#be123c', '#78716c',
]

export function statistikFarbe(index: number): string {
  return STATISTIK_FARBPALETTE[index % STATISTIK_FARBPALETTE.length]
}

export const MITGLIED_FARBPALETTE = [
  '#b45309', '#c2410c', '#0e7490', '#0f766e', '#0369a1', '#1d4ed8',
  '#4338ca', '#6d28d9', '#7e22ce', '#a21caf', '#db2777', '#78716c',
  '#292524', '#000000',
]

export function mitgliedFarbe(index: number): string {
  return MITGLIED_FARBPALETTE[index % MITGLIED_FARBPALETTE.length]
}

export const BADGE_FARBPALETTE = [
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1',
  '#3b82f6', '#06b6d4', '#10b981', '#22c55e',
]

export function badgeFarbe<T extends PersonFarbeQuelle>(
  person: T | null | undefined,
  alle: T[],
): string | null {
  if (!person) return null
  const index = alle.findIndex(m => m.id === person.id)
  return index >= 0 ? BADGE_FARBPALETTE[index % BADGE_FARBPALETTE.length] : null
}

export type PersonFarbeQuelle = { id: number; farbe?: string | null }

export function personFarbe<T extends PersonFarbeQuelle>(
  person: T | null | undefined,
  alle: T[],
): string | null {
  if (!person) return null
  if (person.farbe) return person.farbe
  const index = alle.findIndex(m => m.id === person.id)
  return index >= 0 ? mitgliedFarbe(index) : null
}

export function farbeHintergrund(farbe: string | null | undefined): string | undefined {
  return farbe ? `${farbe}1f` : undefined
}
