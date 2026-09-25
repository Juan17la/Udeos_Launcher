import { api } from '../api/bridge'
import type { Instance, ProjectType, SearchGameVersion } from '../api/types'

const ALL_TYPES: ProjectType[] = ['mod', 'resourcepack', 'shader', 'modpack']
const INSTANCE_TYPES: ProjectType[] = ['mod', 'resourcepack', 'shader', 'modpack']
const VANILLA_TYPES: ProjectType[] = ['resourcepack']

/** Which project types the Search page offers. With an instance in context
 *  only what can go into it: a Vanilla instance takes resource packs only
 *  (its page has no Mods/Shaders tab either); a modded one also takes
 *  modpacks, whose mods are poured into it. */
export function allowedTypes(inst: Instance | undefined): ProjectType[] {
  if (!inst) return ALL_TYPES
  if (inst.server) return ['mod'] // a server has no use for packs or shaders
  return inst.loader === 'Vanilla' ? VANILLA_TYPES : INSTANCE_TYPES
}

// Fetched once per app run and shared by every mount of the Search screen:
// Go already memoizes the list, this skips the bridge round-trip too.
let versionsPromise: Promise<SearchGameVersion[]> | null = null
export function loadSearchVersions(): Promise<SearchGameVersion[]> {
  if (!versionsPromise) versionsPromise = api.ListSearchGameVersions().catch(() => { versionsPromise = null; return [] as SearchGameVersion[] })
  return versionsPromise
}

/** Page buttons for a pager: 0-based indexes with null for a "…" gap. Always
 *  the first, the last and the current page ±1; a gap of one page shows
 *  that page instead of "…". */
export function pageList(current: number, total: number): (number | null)[] {
  const keep = [...new Set([0, current - 1, current, current + 1, total - 1])].filter((i) => i >= 0 && i < total).sort((a, b) => a - b)
  const out: (number | null)[] = []
  let prev = -1
  for (const i of keep) {
    if (i - prev === 2) out.push(i - 1)
    else if (i - prev > 2) out.push(null)
    out.push(i)
    prev = i
  }
  return out
}
