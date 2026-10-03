export interface StatistikProzentZeile {
  mitgliedId: number
  anzeigename: string
  ist: number
}

export interface StatistikVerteilung {
  gesamtRunden: number
  belegtRunden: number
  zeilen: Array<StatistikProzentZeile & { prozent: number }>
}

export function prozentAusZuteilungen(
  zeilen: Array<{ mitgliedId: number; anzeigename: string; ist: number; moeglich: number }>,
): StatistikVerteilung {
  const gesamtRunden = zeilen.reduce((max, z) => Math.max(max, z.moeglich), 0)
  const belegtRunden = zeilen.reduce((summe, z) => summe + z.ist, 0)

  const personProzente = zeilen.map(z => ({
    mitgliedId: z.mitgliedId,
    anzeigename: z.anzeigename,
    ist: z.ist,
    prozent: gesamtRunden > 0 ? (100 * z.ist) / gesamtRunden : 0,
  }))

  personProzente.sort((a, b) =>
    b.prozent - a.prozent
    || b.ist - a.ist
    || a.anzeigename.localeCompare(b.anzeigename, 'de'),
  )

  return { gesamtRunden, belegtRunden, zeilen: personProzente }
}

export function prozentDeutsch(wert: number): string {
  return wert.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
}
