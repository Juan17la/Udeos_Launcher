import type { Dict } from '../i18n/en'
import { fmt } from '../i18n/format'

/** "2 days ago" style label for an ISO timestamp. */
export function ago(iso: string | undefined, t: Dict): string {
  if (!iso) return t.dashboard.neverPlayed
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return t.dashboard.justNow
  if (min < 60) return fmt(t.dashboard.minutesAgo, { n: min })
  const h = Math.floor(min / 60)
  if (h < 24) return fmt(t.dashboard.hoursAgo, { n: h })
  const d = Math.floor(h / 24)
  if (d === 1) return t.dashboard.yesterday
  return fmt(t.dashboard.daysAgo, { n: d })
}

export function hours(sec: number): string {
  return (sec / 3600).toFixed(sec < 3600 ? 1 : 0)
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}
