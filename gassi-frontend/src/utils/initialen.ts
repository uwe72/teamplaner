export function initialen(name: string): string {
  const woerter = name.trim().split(/\s+/).filter(Boolean)
  if (woerter.length === 0) return '?'
  if (woerter.length === 1) return woerter[0].slice(0, 2).toUpperCase()
  return (woerter[0][0] + woerter[1][0]).toUpperCase()
}
