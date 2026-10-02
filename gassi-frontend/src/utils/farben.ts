export const STATISTIK_FARBPALETTE = [
  '#b91c1c', '#c2410c', '#b7791f', '#4d7c0f', '#15803d', '#0f766e',
  '#0369a1', '#4338ca', '#7e22ce', '#a21caf', '#be123c', '#78716c',
]

export function statistikFarbe(index: number): string {
  return STATISTIK_FARBPALETTE[index % STATISTIK_FARBPALETTE.length]
}
