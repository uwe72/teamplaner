export function holeEigeneId(): number {
  const roh = localStorage.getItem('session')
  if (!roh) return 0
  try {
    return (JSON.parse(roh).person.id as number) ?? 0
  } catch {
    return 0
  }
}
