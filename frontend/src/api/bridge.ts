// Thin bridge to the Go backend. Wails injects `window.go.main.App.<Method>`
// (one promise-returning function per exported Go method) and
// `window.runtime` (events, dialogs). When the page runs outside Wails —
// `vite dev` in a browser — an in-memory mock stands in so the UI can be
// worked on without building the desktop app.
import type { AppInfo, FileEntry, GameEvent, Instance, Loader, LoaderOption, ProfileState, Profile, ProjectType, Progress, SearchGameVersion, SearchPage, VersionList, World } from './types'

type Backend = {
  GetAppInfo(): Promise<AppInfo>
  GetProfile(): Promise<ProfileState>
  SaveProfile(p: Profile): Promise<Profile>
  ListInstances(): Promise<Instance[]>
  GetInstance(id: string): Promise<Instance>
  /** loaderVersion comes from ListLoaderVersions (empty for Vanilla). Nothing is downloaded until Play. */
  CreateInstance(name: string, version: string, loader: Loader, loaderVersion: string, icon: string): Promise<Instance>
  DeleteInstance(id: string): Promise<void>
  ListVersions(): Promise<VersionList>
  ListLoaderVersions(loader: Loader): Promise<LoaderOption[]>
  InstallInstance(id: string): Promise<void>
  LaunchInstance(id: string): Promise<void>
  IsRunning(id: string): Promise<boolean>
  ListWorlds(id: string): Promise<World[]>
  ExportWorld(id: string, folder: string): Promise<string>
  AddWorld(id: string, path: string): Promise<World>
  PickWorld(id: string): Promise<World>
  RemoveWorld(id: string, folder: string): Promise<void>
  ListScreenshots(id: string): Promise<FileEntry[]>
  ExportScreenshot(id: string, name: string): Promise<string>
  ListResourcePacks(id: string): Promise<FileEntry[]>
  ListMods(id: string): Promise<FileEntry[]>
  AddMod(id: string, path: string): Promise<FileEntry>
  PickMod(id: string): Promise<FileEntry>
  RemoveMod(id: string, name: string): Promise<void>
  ListShaders(id: string): Promise<FileEntry[]>
  AddShader(id: string, path: string): Promise<FileEntry>
  PickShader(id: string): Promise<FileEntry>
  RemoveShader(id: string, name: string): Promise<void>
  AddResourcePack(id: string, path: string): Promise<FileEntry>
  PickResourcePack(id: string): Promise<FileEntry>
  RemoveResourcePack(id: string, name: string): Promise<void>
  /** sub: '' for .minecraft itself, or saves | screenshots | resourcepacks | mods | shaderpacks | logs */
  OpenInstanceFolder(id: string, sub: string): Promise<void>
  /** loader is '' for any, or fabric|forge|quilt|neoforge. Cached, so it keeps working offline. */
  SearchContent(projectType: ProjectType, text: string, gameVersion: string, loader: string, offset: number, limit: number): Promise<SearchPage>
  ListSearchGameVersions(): Promise<SearchGameVersion[]>
}

type Events = {
  'install:progress': Progress
  'game:state': GameEvent
  'files:dropped': string[]
}

declare global {
  interface Window {
    go?: { main: { App: Backend } }
    runtime?: {
      EventsOn(name: string, cb: (data: unknown) => void): () => void
      EventsOff(name: string): void
    }
  }
}

export const inWails = typeof window !== 'undefined' && !!window.go

let mock: { backend: Backend; on: <K extends keyof Events>(n: K, cb: (d: Events[K]) => void) => () => void } | null = null
async function getMock() {
  if (!mock) mock = (await import('./mock')).createMock()
  return mock
}

export const api: Backend = new Proxy({} as Backend, {
  get(_t, method: string) {
    return async (...args: unknown[]) => {
      if (inWails) {
        const fn = (window.go!.main.App as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method]
        return fn(...args)
      }
      const m = await getMock()
      return (m.backend as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method](...args)
    }
  },
})

/** Subscribe to a backend event; returns the unsubscribe function. */
export function on<K extends keyof Events>(name: K, cb: (data: Events[K]) => void): () => void {
  if (inWails && window.runtime) {
    const off = window.runtime.EventsOn(name, (d) => cb(d as Events[K]))
    return typeof off === 'function' ? off : () => window.runtime?.EventsOff(name)
  }
  let off = () => {}
  let cancelled = false
  getMock().then((m) => { if (!cancelled) off = m.on(name, cb) })
  return () => { cancelled = true; off() }
}
