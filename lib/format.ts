// Fixed time zone so server and client render identical strings (no hydration mismatch).
const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeZone: 'UTC' })
const numberFormat = new Intl.NumberFormat('es-ES', { notation: 'compact' })
const relativeFormat = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

export function formatViewers(viewers: number): string {
  return numberFormat.format(viewers)
}

export function formatRelative(iso: string, now: number): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000)
  for (const [unit, unitSeconds] of UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeFormat.format(Math.round(seconds / unitSeconds), unit)
    }
  }
  return 'hace un momento'
}

const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷',
  Chile: '🇨🇱',
  Colombia: '🇨🇴',
  'Costa Rica': '🇨🇷',
  España: '🇪🇸',
  Mexico: '🇲🇽',
  México: '🇲🇽',
  Perú: '🇵🇪',
  Venezuela: '🇻🇪',
}

export function countryFlag(country: string): string {
  return FLAGS[country] ?? '🌎'
}
