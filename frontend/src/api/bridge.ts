// Thin bridge to the Go backend. Wails injects `window.go.main.App.<Method>`
// (one promise-returning function per exported Go method) and
// `window.runtime` (events, dialogs). When the page runs outside Wails —
// `vite dev` in a browser — an in-memory mock stands in so the UI can be
// worked on without building the desktop app.
import type { AppInfo, ContentEntry, ContentPlan, FileEntry, GameEvent, Instance, LaunchSettings, Loader, LoaderOption, PlayerList, ProfileState, Profile, ProjectDetail, ProjectType, Progress, SearchGameVersion, SearchPage, Server, ServerPlayers, SortBy, VersionList, World } from './types'

type Backend = {
  GetAppInfo(): Promise<AppInfo>
  GetProfile(): Promise<ProfileState>
  SaveProfile(p: Profile): Promise<Profile>
  /** The active profile's instances only (each launcher profile has its own). */
  ListInstances(): Promise<Instance[]>
  /** How many instances each profile (nickname) has. */
  InstanceCounts(): Promise<Record<string, number>>
  GetInstance(id: string): Promise<Instance>
  /** loaderVersion comes from ListLoaderVersions (empty for Vanilla). Nothing is downloaded until Play. */
  CreateInstance(name: string, version: string, loader: Loader, loaderVersion: string, icon: string): Promise<Instance>
  DeleteInstance(id: string): Promise<void>
  /** Renames the instance and sets its icon ('' keeps it, 'modpack' = the pack's own). */
  SetInstanceInfo(id: string, name: string, icon: string): Promise<Instance>
  /** Stores the instance's JVM settings and returns the updated instance. */
  SetInstanceLaunch(id: string, launch: LaunchSettings): Promise<Instance>
  /** File dialog for a Java executable; '' when cancelled. */
  PickJava(): Promise<string>
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
  /** loader is '' for any, or fabric|forge|quilt|neoforge; sortBy 'relevance' is the default order.
   *  Cached, so it keeps working offline. */
  SearchContent(projectType: ProjectType, text: string, gameVersion: string, loader: string, sortBy: SortBy, offset: number, limit: number): Promise<SearchPage>
  ListSearchGameVersions(): Promise<SearchGameVersion[]>
  /** What adding the project would install (version that fits, required dependencies), or a rejection
   *  (no build for the instance's version/loader, incompatible with an installed mod) as the error message. */
  PlanContent(instanceId: string, projectId: string, projectType: ProjectType): Promise<ContentPlan>
  /** Plans again and downloads; progress arrives on 'content:progress'. A modpack pours its
   *  build for the instance's version/loader into it (files already there are kept). */
  AddContent(instanceId: string, projectId: string, projectType: ProjectType): Promise<ContentEntry[]>
  /** New instance from a modpack: its build for gameVersion/loader ('' = newest), the loader it
   *  declares, every file and its overrides. name '' = the pack's name. Progress on 'content:progress'. */
  CreateInstanceFromModpack(projectId: string, name: string, icon: string, gameVersion: string, loader: string): Promise<Instance>
  /** Modrinth project ids already installed in the instance. */
  ListInstalledProjects(instanceId: string): Promise<string[]>
  /** What was installed from Modrinth (title, version, icon, description per file); hand-added files are not listed. */
  ListContent(instanceId: string): Promise<ContentEntry[]>
  /** The whole project (full description, aggregated versions/loaders) for the Details page. */
  GetProjectDetail(projectId: string): Promise<ProjectDetail>
  /** The active profile's servers (servers are instances with `server` set, never in ListInstances). */
  ListServers(): Promise<Server[]>
  /** EULA accepted by the caller; iconPNG = 64×64 PNG, base64 (utils/serverIcon). Nothing downloads until Start. */
  CreateServer(name: string, version: string, loader: Loader, loaderVersion: string, icon: string, iconPNG: string): Promise<Server>
  SetServerIcon(id: string, iconPNG: string): Promise<void>
  /** Resolves once the process runs (after any download); state on 'server:state', console on 'server:log'. */
  StartServer(id: string): Promise<void>
  StopServer(id: string): Promise<void>
  ServerCommand(id: string, line: string): Promise<void>
  ServerLog(id: string): Promise<string[]>
  ServerProperties(id: string): Promise<Record<string, string>>
  SetServerProperties(id: string, props: Record<string, string>): Promise<void>
  GetServerPlayers(id: string): Promise<ServerPlayers>
  SetServerPlayer(id: string, list: PlayerList, name: string, add: boolean): Promise<ServerPlayers>
  SetServerPublic(id: string, on: boolean): Promise<void>
  ListBackups(id: string): Promise<FileEntry[]>
  BackupServer(id: string): Promise<FileEntry>
  /** The current world is backed up first. */
  RestoreBackup(id: string, name: string): Promise<void>
  RemoveBackup(id: string, name: string): Promise<void>
}

type Events = {
  'install:progress': Progress
  'content:progress': Progress
  'game:state': GameEvent
  'files:dropped': string[]
  'server:log': { id: string; line: string }
  'server:state': { id: string }
}

declare global {
  interface Window {
    go?: { main: { App: Backend } }
    runtime?: {
      EventsOn(name: string, cb: (data: unknown) => void): () => void
      EventsOff(name: string): void
      BrowserOpenURL(url: string): void
      ClipboardSetText(text: string): Promise<boolean>
    }
  }
}

export const inWails = typeof window !== 'undefined' && !!window.go

// The promise is cached, not the result: calls made while the import is
// still loading must share one mock, or its state splits in two.
let mock: Promise<{ backend: Backend; on: <K extends keyof Events>(n: K, cb: (d: Events[K]) => void) => () => void }> | null = null
function getMock() {
  if (!mock) mock = import('./mock').then((m) => m.createMock())
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

/** Open a link in the system browser (a plain <a> would navigate the webview itself away). */
export function openExternal(url: string) {
  if (inWails && window.runtime) window.runtime.BrowserOpenURL(url)
  else window.open(url, '_blank', 'noopener')
}

/** Copy to the system clipboard (the webview's navigator.clipboard is not always allowed). */
export function copyText(text: string) {
  if (inWails && window.runtime) window.runtime.ClipboardSetText(text)
  else navigator.clipboard?.writeText(text)
}

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
