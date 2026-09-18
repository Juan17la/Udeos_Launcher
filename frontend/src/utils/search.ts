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
  return inst.loader === 'Vanilla' ? VANILLA_TYPES : INSTANCE_TYPES
}

// Fetched once per app run and shared by every mount of the Search screen:
// Go already memoizes the list, this skips the bridge round-trip too.
let versionsPromise: Promise<SearchGameVersion[]> | null = null
export function loadSearchVersions(): Promise<SearchGameVersion[]> {
  if (!versionsPromise) versionsPromise = api.ListSearchGameVersions().catch(() => { versionsPromise = null; return [] as SearchGameVersion[] })
  return versionsPromise
}
