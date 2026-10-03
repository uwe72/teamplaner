import { describe, expect, it } from 'vitest'
import { rundeVergangen } from './runde'

const ZEHN = new Date(2026, 9, 5, 10, 0, 0)
const NACHMITTAGS = new Date(2026, 9, 5, 14, 30, 0)

describe('rundeVergangen', () => {
  it('Tage vor heute sind immer vergangen', () => {
    expect(rundeVergangen('2026-10-04', { zeitfensterName: 'Morgens' }, NACHMITTAGS)).toBe(true)
    expect(rundeVergangen('2026-10-04', { zeitfensterName: 'Abends' }, ZEHN)).toBe(true)
  })

  it('Tage nach heute sind nie vergangen', () => {
    expect(rundeVergangen('2026-10-06', { zeitfensterName: 'Morgens' }, ZEHN)).toBe(false)
    expect(rundeVergangen('2026-10-06', { zeitfensterName: 'Abends' }, NACHMITTAGS)).toBe(false)
  })

  it('heute, Morgens: ab 12:00 Uhr vergangen', () => {
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Morgens' }, ZEHN)).toBe(false)
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Morgens' }, new Date(2026, 9, 5, 12, 0, 0))).toBe(true)
  })

  it('heute, Abends: erst ab Tagesende vergangen, nicht innerhalb des Tages', () => {
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Abends' }, ZEHN)).toBe(false)
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Abends' }, new Date(2026, 9, 5, 23, 59, 0))).toBe(false)
  })

  it('explizite Uhrzeit am heutigen Tag schlägt das Zeitfenster', () => {
    expect(rundeVergangen('2026-10-05', { uhrzeit: '11:30' }, NACHMITTAGS)).toBe(true)
    expect(rundeVergangen('2026-10-05', { uhrzeit: '11:30' }, ZEHN)).toBe(false)
    expect(rundeVergangen('2026-10-05', { uhrzeit: '19:00' }, ZEHN)).toBe(false)
  })

  it('Uhrzeit im Zeitfensternamen wird genutzt', () => {
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Frühstück (10:00)' }, NACHMITTAGS)).toBe(true)
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Frühstück (10:00)' }, ZEHN)).toBe(true)
    expect(rundeVergangen('2026-10-05', { zeitfensterName: 'Frühstück (10:00)' }, new Date(2026, 9, 5, 9, 45, 0))).toBe(false)
  })

  it('ohne Zeitfenster gilt am heutigen Tag die Morgens-Regel (12:00)', () => {
    expect(rundeVergangen('2026-10-05', {}, ZEHN)).toBe(false)
    expect(rundeVergangen('2026-10-05', {}, NACHMITTAGS)).toBe(true)
  })
})
