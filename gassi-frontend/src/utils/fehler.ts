import type { FehlerAntwort } from '../types'

export function antwort(e: unknown): string {
  return (e as { response?: { data?: FehlerAntwort } }).response?.data?.message || 'Aktion fehlgeschlagen'
}
