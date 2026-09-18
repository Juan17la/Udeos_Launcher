import { api } from '../api/bridge'
import type { FileEntry, ProjectType, World } from '../api/types'

/** What a file-list tab needs from the backend, so one hook (useFileList)
 *  and one tab component serve every kind. `key` identifies an item for
 *  removal, `name` is what the "Added …" note shows. */
export type FileSource<T> = {
  list(instanceId: string): Promise<T[]>
  add(instanceId: string, path: string): Promise<T>
  pick(instanceId: string): Promise<T>
  remove(instanceId: string, key: string): Promise<void>
  key(item: T): string
  name(item: T): string
  /** Sub-folder inside .minecraft, for the "Open folder" link. */
  folder: string
}

export type FileKind = 'mods' | 'shaders' | 'resourcepacks'

const entry = { key: (e: FileEntry) => e.name, name: (e: FileEntry) => e.name }

/** Mods, shader packs and resource packs: plain files, all with a Modrinth counterpart. */
export const FILE_KINDS: Record<FileKind, FileSource<FileEntry> & { modrinth: ProjectType }> = {
  mods: { ...entry, list: api.ListMods, add: api.AddMod, pick: api.PickMod, remove: api.RemoveMod, folder: 'mods', modrinth: 'mod' },
  shaders: { ...entry, list: api.ListShaders, add: api.AddShader, pick: api.PickShader, remove: api.RemoveShader, folder: 'shaderpacks', modrinth: 'shader' },
  resourcepacks: { ...entry, list: api.ListResourcePacks, add: api.AddResourcePack, pick: api.PickResourcePack, remove: api.RemoveResourcePack, folder: 'resourcepacks', modrinth: 'resourcepack' },
}

/** Worlds are folders keyed by their folder name. */
export const WORLDS: FileSource<World> = {
  list: api.ListWorlds, add: api.AddWorld, pick: api.PickWorld, remove: api.RemoveWorld,
  key: (w) => w.folder, name: (w) => w.name, folder: 'saves',
}
