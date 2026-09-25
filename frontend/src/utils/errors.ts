import type { Dict } from '../i18n/en'

/** Turns a backend error into the 1–3 word headline the design system
 *  allows; the original message is shown underneath as detail. Matching is
 *  on the wording the Go side uses in internal/modinstall, internal/modsearch
 *  and the launch path (English, not localised). */
export function errorHeadline(message: string, t: Dict['errors']): string {
  const m = message.toLowerCase()
  if (/incompatible/.test(m)) return t.incompatible
  if (/no build|no downloadable|not supported|unsupported|needs (fabric|forge|quilt|neoforge)/.test(m)) return t.noBuild
  if (/already/.test(m)) return t.alreadyAdded
  if (/must be a 64×64/.test(m)) return t.invalidSkin
  if (/cannot reach|no cached|connection|network|timeout|dial tcp|no such host|eof/.test(m)) return t.connectionLost
  return t.failed
}

/** The error a download stopped by CancelDownload ends with: not a failure, nothing to show. */
export const isCanceled = (message: string) => message.includes('context canceled')

export function messageOf(e: unknown): string {
  return String((e as Error)?.message ?? e)
}
