import type { MitgliedPlanInfo } from '../types'

export function sortiereMitglieder(
  mitglieder: MitgliedPlanInfo[],
): MitgliedPlanInfo[] {
  return [...mitglieder].sort((a, b) => {
    const pa = a.soll > 0 ? a.ist / a.soll : -1
    const pb = b.soll > 0 ? b.ist / b.soll : -1
    if (pb !== pa) return pb - pa
    return a.anzeigename.localeCompare(b.anzeigename)
  })
}
