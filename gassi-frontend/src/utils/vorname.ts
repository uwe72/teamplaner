export function vorname(anzeigename: string): string {
  const erstesWort = anzeigename.trim().split(/\s+/)[0] ?? ''
  return erstesWort.length > 0 ? erstesWort : anzeigename
}
