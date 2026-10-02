import { initialen } from './initialen'

export function eindeutigeInitialen(namen: string[]): Map<string, string> {
  const gruppen = new Map<string, string[]>()
  for (const name of namen) {
    const kuerzel = initialen(name)
    const gruppe = gruppen.get(kuerzel)
    if (gruppe) gruppe.push(name)
    else gruppen.set(kuerzel, [name])
  }

  const ergebnis = new Map<string, string>()
  for (const [kuerzel, gruppe] of gruppen) {
    if (gruppe.length === 1) {
      ergebnis.set(gruppe[0], kuerzel)
      continue
    }
    for (const name of gruppe) {
      ergebnis.set(name, verlaengertesKuerzel(name, gruppe, kuerzel))
    }
  }
  return ergebnis
}

function verlaengertesKuerzel(name: string, gruppe: string[], fallback: string): string {
  const buchstaben = name.toUpperCase().replace(/[^A-ZÄÖÜ]/g, '')
  for (let laenge = 3; laenge <= buchstaben.length; laenge++) {
    const kandidat = buchstaben.slice(0, laenge)
    const gleiche = gruppe.filter(n =>
      n.toUpperCase().replace(/[^A-ZÄÖÜ]/g, '').slice(0, laenge) === kandidat,
    )
    if (gleiche.length === 1) return kandidat
  }
  return fallback
}
