/** "2 days ago" style label for an ISO timestamp, in the UI language. */
export function ago(iso: string, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  if (Math.abs(min) < 1440) return rtf.format(Math.round(min / 60), 'hour')
  return rtf.format(Math.round(min / 1440), 'day')
}

/** Play time in hours: one decimal under an hour, whole hours after. */
export function hours(sec: number): string {
  return (sec / 3600).toFixed(sec < 3600 ? 1 : 0)
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}

/** 42100000 → "42.1M" (in the UI language); the exact figure goes in a title. */
export function compact(n: number, lang: string): string {
  return new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/** A project's Minecraft releases (oldest first) as one label: "1.21.1" or "1.16.5–1.21.1". */
export function versionRange(versions: string[]): string {
  if (versions.length <= 1) return versions[0] ?? ''
  return `${versions[0]}–${versions[versions.length - 1]}`
}

const LOADER_NAMES: Record<string, string> = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }
/** Modrinth's lowercase loader ids as the launcher writes them ("neoforge" → "NeoForge"). */
export const loaderName = (l: string) => LOADER_NAMES[l.toLowerCase()] ?? l[0].toUpperCase() + l.slice(1)
