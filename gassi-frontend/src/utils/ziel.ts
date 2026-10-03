export function zielNachLogin(fromState: unknown, rolle: string): string {
  const from = typeof fromState === 'object' && fromState !== null && 'from' in fromState
    ? String((fromState as { from: unknown }).from)
    : null
  return from && erlaubt(from, rolle) ? from : standardZiel(rolle)
}

function erlaubt(from: string, rolle: string): boolean {
  if (from.startsWith('/super')) {
    return rolle === 'SUPER_ADMIN'
  }
  if (from.startsWith('/verwaltung')) {
    return rolle === 'ADMIN' || rolle === 'SUPER_ADMIN'
  }
  return from.startsWith('/plan') || from.startsWith('/statistik') || from.startsWith('/profil')
}

function standardZiel(rolle: string): string {
  if (rolle === 'SUPER_ADMIN') return '/super'
  return '/plan'
}
