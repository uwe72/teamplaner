export interface RundenZeitkontext {
  uhrzeit?: string | null
  zeitfensterName?: string | null
}

function stundeMinuteAusText(text: string): { h: number; m: number } | null {
  const match = text.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

function grenzeAmTag(zeitkontext: RundenZeitkontext): { h: number; m: number } | null {
  const uhrzeit = stundeMinuteAusText(zeitkontext.uhrzeit ?? '') ?? stundeMinuteAusText(zeitkontext.zeitfensterName ?? '')
  if (uhrzeit) return uhrzeit
  const name = (zeitkontext.zeitfensterName ?? '').toLowerCase()
  if (name.includes('abend') || name.includes('nacht')) return null
  return { h: 12, m: 0 }
}

export function rundeVergangen(
  datum: string,
  zeitkontext: RundenZeitkontext = {},
  jetzt: Date = new Date(),
): boolean {
  const heuteTag = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}-${String(jetzt.getDate()).padStart(2, '0')}`
  if (datum < heuteTag) return true
  if (datum > heuteTag) return false
  const grenze = grenzeAmTag(zeitkontext)
  if (!grenze) return false
  const jetztMinute = jetzt.getHours() * 60 + jetzt.getMinutes()
  return jetztMinute >= grenze.h * 60 + grenze.m
}
