import type { Dict } from '../i18n/en'

type Kind = keyof Dict['errors']['hints']

/** What a backend message means for the player. Matching is on the wording the
 *  Go side uses (English, not localised); the first rule that fits wins, so
 *  the specific ones (a port, a running server) come before "already". */
const RULES: [RegExp, Kind][] = [
  [/incompatible/, 'incompatible'],
  [/join file/, 'joinFile'],
  [/port .*(in use|already)|already uses port/, 'port'],
  [/already running|still getting its files/, 'running'],
  [/no build|no downloadable|not supported|unsupported|needs (fabric|forge|quilt|neoforge)|publishes no server|has no .* version/, 'noBuild'],
  [/already/, 'alreadyAdded'],
  [/must be a 64×64/, 'invalidSkin'],
  [/rejected the api key/, 'badKey'],
  [/rate limit/, 'rateLimited'],
  [/no space left|disk|permission denied|access is denied|read-only/, 'disk'],
  [/cannot reach|no cached|connection|network|timeout|dial tcp|no such host|eof|relay|offline/, 'connectionLost'],
  [/java/, 'java'],
]

/** Some backend messages already say what happened in plain words ("Sodium is
 *  incompatible with Iris, which is installed…"); those are worth showing as
 *  they are. Anything with a URL, a path, a code or a Go error chain is not. */
const readable = (m: string) => m.length <= 160 && !/https?:|\/\w+\/|\\\w+\\|[a-z]:\\|\bdial\b|\bGET\b|\bPOST\b|[{}[\]]|0x[0-9a-f]+|: [a-z ]+: /i.test(m)
const SPECIFIC: Kind[] = ['incompatible', 'noBuild', 'alreadyAdded', 'port', 'running']

/** A failure told the way a player needs it: a short headline, one sentence
 *  saying what to do, and the original text for whoever wants it (shown only
 *  behind "Show details"). */
export function friendlyError(message: string, t: Dict['errors']): { headline: string; text: string; raw: string } {
  const m = message.toLowerCase()
  const kind: Kind = RULES.find(([re]) => re.test(m))?.[1] ?? 'failed'
  const text = SPECIFIC.includes(kind) && readable(message) ? message : t.hints[kind]
  return { headline: t[kind], text, raw: message }
}

/** Kept for callers that only need the headline. */
export const errorHeadline = (message: string, t: Dict['errors']) => friendlyError(message, t).headline

/** The error a download stopped by CancelDownload (or a server start stopped by Stop) ends with: not a failure, nothing to show. */
export const isCanceled = (message: string) => message.includes('context canceled') || message.includes('start canceled')

export function messageOf(e: unknown): string {
  return String((e as Error)?.message ?? e)
}
