export default function tagLabel(datum: string): string {
  const d = new Date(datum + 'T12:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function wochentagKurz(datum: string): string {
  const d = new Date(datum + 'T12:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')
}

export function tagKurz(datum: string): string {
  const d = new Date(datum + 'T12:00:00')
  return `${d.getDate()}.`
}

export function wochenbereich(woche: IsoWoche): string {
  const format = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const montag = isoMontag(woche.isoJahr, woche.isoWoche)
  const sonntag = new Date(montag)
  sonntag.setUTCDate(montag.getUTCDate() + 6)
  return `${format(montag)} - ${format(sonntag)}`
}

export function wochenbereichBis(woche: IsoWoche): string {
  const format = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const montag = isoMontag(woche.isoJahr, woche.isoWoche)
  const sonntag = new Date(montag)
  sonntag.setUTCDate(montag.getUTCDate() + 6)
  return `${format(montag)} bis ${format(sonntag)}`
}

export interface IsoWoche {
  isoJahr: number
  isoWoche: number
}

const MS_PRO_WOCHE = 7 * 24 * 60 * 60 * 1000

function donnerstagVon(jan4: Date): Date {
  const d = new Date(jan4)
  d.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + 3)
  return d
}

function isoMontag(jahr: number, woche: number): Date {
  const jan4 = new Date(Date.UTC(jahr, 0, 4))
  const montagW1 = new Date(donnerstagVon(jan4))
  montagW1.setUTCDate(montagW1.getUTCDate() - 3)
  const montag = new Date(montagW1)
  montag.setUTCDate(montagW1.getUTCDate() + (woche - 1) * 7)
  return montag
}

export function isoWocheVonDatum(datum: Date): IsoWoche {
  const donnerstag = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  donnerstag.setUTCDate(donnerstag.getUTCDate() + 3 - ((donnerstag.getUTCDay() + 6) % 7))
  const jan4 = new Date(Date.UTC(donnerstag.getUTCFullYear(), 0, 4))
  const woche = 1 + Math.round((donnerstag.getTime() - donnerstagVon(jan4).getTime()) / MS_PRO_WOCHE)
  return { isoJahr: donnerstag.getUTCFullYear(), isoWoche: woche }
}

export function aktuelleIsoWocheJetzt(): IsoWoche {
  return isoWocheVonDatum(new Date())
}

export function verschiebeIsoWoche(woche: IsoWoche, delta: number): IsoWoche {
  const montag = isoMontag(woche.isoJahr, woche.isoWoche)
  montag.setUTCDate(montag.getUTCDate() + delta * 7)
  return isoWocheVonDatum(new Date(montag.getTime() + 3 * 24 * 60 * 60 * 1000))
}

export function isoNummer(woche: IsoWoche): number {
  return woche.isoJahr * 100 + woche.isoWoche
}

export function wochenRelativLabel(woche: IsoWoche): string {
  const diff = isoNummer(woche) - isoNummer(aktuelleIsoWocheJetzt())
  if (diff === 0) return 'Diese Woche'
  if (diff === 1) return 'Nächste Woche'
  if (diff === -1) return 'Letzte Woche'
  if (diff > 1) return `In ${diff} Wochen`
  return `Vor ${Math.abs(diff)} Wochen`
}

export function heutigesDatum(): string {
  const jetzt = new Date()
  const y = jetzt.getFullYear()
  const m = String(jetzt.getMonth() + 1).padStart(2, '0')
  const d = String(jetzt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
