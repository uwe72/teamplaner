import { describe, expect, it } from 'vitest'
import { prozentAusZuteilungen, prozentDeutsch } from './statistik'

describe('prozentAusZuteilungen', () => {
  it('Prozent beziehen sich auf die Gesamtzahl der Runden', () => {
    const v = prozentAusZuteilungen([
      { mitgliedId: 1, anzeigename: 'A', ist: 6, moeglich: 28 },
      { mitgliedId: 2, anzeigename: 'B', ist: 0, moeglich: 28 },
    ])
    expect(v.gesamtRunden).toBe(28)
    expect(v.zeilen[0].prozent).toBeCloseTo(100 * 6 / 28, 6)
    expect(v.zeilen[1].prozent).toBe(0)
  })

  it('Summe der Personen kann unter 100 % liegen', () => {
    const v = prozentAusZuteilungen([
      { mitgliedId: 1, anzeigename: 'A', ist: 6, moeglich: 28 },
      { mitgliedId: 2, anzeigename: 'B', ist: 4, moeglich: 28 },
    ])
    const summe = v.zeilen.reduce((s, z) => s + z.prozent, 0)
    expect(summe).toBeGreaterThan(0)
    expect(summe).toBeLessThan(100)
  })

  it('Voll belegt: Summe genau 100 %', () => {
    const v = prozentAusZuteilungen([
      { mitgliedId: 1, anzeigename: 'A', ist: 4, moeglich: 10 },
      { mitgliedId: 2, anzeigename: 'B', ist: 6, moeglich: 10 },
    ])
    const summe = v.zeilen.reduce((s, z) => s + z.prozent, 0)
    expect(summe).toBeCloseTo(100, 6)
  })

  it('leerer Zeitraum: keine Zeilen, keine Division durch null', () => {
    const v = prozentAusZuteilungen([])
    expect(v.gesamtRunden).toBe(0)
    expect(v.zeilen).toHaveLength(0)
  })

  it('Zeilen absteigend nach Prozent, Gleichstand nach Anzahl, dann alphabetisch', () => {
    const v = prozentAusZuteilungen([
      { mitgliedId: 1, anzeigename: 'Anna', ist: 4, moeglich: 28 },
      { mitgliedId: 2, anzeigename: 'Bruno', ist: 4, moeglich: 28 },
      { mitgliedId: 3, anzeigename: 'Zoe', ist: 6, moeglich: 28 },
      { mitgliedId: 4, anzeigename: 'Charlie', ist: 4, moeglich: 28 },
      { mitgliedId: 5, anzeigename: 'Dora', ist: 2, moeglich: 28 },
    ])
    expect(v.zeilen.map(z => z.anzeigename)).toEqual(['Zoe', 'Anna', 'Bruno', 'Charlie', 'Dora'])
  })
})

describe('prozentDeutsch', () => {
  it('deutsches Format mit einer Nachkommastelle', () => {
    expect(prozentDeutsch(21.428571)).toBe('21,4 %')
    expect(prozentDeutsch(0)).toBe('0,0 %')
    expect(prozentDeutsch(100)).toBe('100,0 %')
  })
})
