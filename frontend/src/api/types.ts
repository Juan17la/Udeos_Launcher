// Mirrors of the Go structs returned by the App bindings (see launcher/app_*.go).

export type Profile = {
  /** The active player. */
  nickname: string
  uuid: string
  /** Every saved nickname, the active one first; preferences are shared by all. */
  nicknames: string[]
  language: 'en' | 'es'
  theme: 'light' | 'dark'
  agreed: boolean
  maxMemoryMB: number
  javaPath?: string
}
export type ProfileState = { exists: boolean; profile: Profile }

export type Counts = { mods: number; resourcePacks: number; worlds: number; screenshots: number }

export type Loader = 'Vanilla' | 'Fabric' | 'Quilt' | 'Forge' | 'NeoForge'

/** The instance's own JVM settings; 0 / '' mean the profile default (memory), the managed runtime (java), nothing extra (args). */
export type LaunchSettings = { maxMemoryMB?: number; javaPath?: string; jvmArgs?: string }

export type Instance = {
  id: string
  name: string
  version: string
  loader: Loader
  /** Loader build to install, e.g. "0.16.9" (Fabric), "1.20.1-47.4.10" (Forge) or "21.1.172" (NeoForge). Absent for Vanilla. */
  loaderVersion?: string
  /** What the tag shows: "Vanilla", "Fabric 0.16.9", "Forge 47.4.10", "NeoForge 21.1.172". */
  loaderLabel: string
  /** A pixel icon key (ui/pixels.ts), or 'modpack' for the pack's own icon at /media/<id>/icon. */
  icon: string
  createdAt: string
  lastPlayed?: string
  playTimeSec: number
  launch: LaunchSettings
  /** The launcher profile (nickname) it belongs to. */
  owner?: string
  /** A dedicated server (Servers page), not a game instance. */
  server?: boolean
  /** Server only: reachable from the internet whenever it runs, the way `internet` says. */
  public?: boolean
  internet?: InternetSettings
  /** Server only: players join through Udeos Launcher, so skins show (other launchers cannot join). */
  udeosLogin?: boolean
  counts: Counts
  installed: boolean
  running: boolean
}

/** How the internet reaches a server: through a bore relay (default; relay '' = bore.pub) or the router (UPnP).
 *  name '' = derived from the server's name; relayPort is the port the relay gave last time. */
export type InternetSettings = { mode?: 'relay' | 'router'; name?: string; relay?: string; secret?: string; relayPort?: number }
/** A server's live state. publicAddress is the named address friends type ("udeoslauncher.x.1-2-3-4.nip.io:41234"),
 *  publicRaw the same place without the name ("bore.pub:41234"); publicError says why it is unreachable. */
export type ServerState = { starting: boolean; running: boolean; ready: boolean; stopping: boolean; players: string[]; publicAddress?: string; publicRaw?: string; publicError?: string }
/** A server instance; `running` is true from Start (files being prepared) until it stops.
 *  addressName starts its internet address (the saved name or the default). */
export type Server = Instance & { state: ServerState; port: number; maxPlayers: number; lanAddress: string; addressName: string }
export type PlayerList = 'whitelist' | 'ops' | 'banned'
export type ServerPlayers = { online: string[] } & Record<PlayerList, string[]>
/** Who can join a server (the "login" key of ServerProperties): through Udeos Launcher with skins, any launcher, or Microsoft accounts only. */
export type ServerLogin = 'udeos' | 'offline' | 'microsoft'

/** Arm width: 4 pixels (classic, Steve) or 3 (slim, Alex). */
export type SkinModel = 'classic' | 'slim'
/** A library skin; png is the 64×64 picture as base64. */
export type Skin = { id: string; name: string; model: SkinModel; createdAt: string; png: string }
/** Every saved skin, newest first, and what each profile wears (nickname → skin id; missing = Minecraft's default). */
export type SkinLibrary = { skins: Skin[]; equipped: Record<string, string> }
/** A skin file read from disk, not saved yet: its file name and the model its pixels suggest. */
export type SkinFile = { name: string; model: SkinModel; png: string }

export type VersionOption = { id: string; type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'; releaseTime: string }
export type VersionList = { latestRelease: string; latestSnapshot: string; versions: VersionOption[] }
/** One Minecraft version a loader supports and the loader build the launcher will install for it. */
export type LoaderOption = { minecraft: string; version: string; label: string }

export type Progress = { phase: string; done: number; total: number; bytes: number; totalBytes: number; current: string }
export type GameEvent = { instanceId: string; running: boolean; exitCode: number; logPath: string; error?: string }

/** totalMemoryMB is 0 when the machine's RAM could not be read. */
export type AppInfo = { version: string; os: string; arch: string; dataDir: string; totalMemoryMB: number }

export type World = { folder: string; name: string; lastPlayed: string; sizeBytes: number }
export type FileEntry = { name: string; sizeBytes: number; modTime: string; isDir: boolean }

export type ProjectType = 'mod' | 'resourcepack' | 'shader' | 'modpack'
/** Search sort order; 'relevance' is Modrinth's default. There is no ascending order. */
export type SortBy = 'relevance' | 'downloads' | 'newest' | 'updated'
/** Metadata shown while browsing. The full project (description, gallery,
 *  version and file list) is only fetched once the player adds it. */
export type SearchResult = {
  id: string
  slug: string
  title: string
  author: string
  description: string
  iconUrl: string
  downloads: number
  projectType: ProjectType
  loaders: string[]
  /** Minecraft releases it has builds for, oldest first (absent on pages cached by older builds). */
  gameVersions?: string[]
}
export type SearchPage = { results: SearchResult[]; total: number; offset: number }
export type SearchGameVersion = { version: string; type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha' }

/** One downloadable release of a project, fetched only when it is added to an instance. */
export type ProjectVersion = {
  id: string
  projectId: string
  name: string
  versionNumber: string
  gameVersions: string[]
  loaders: string[]
  type: 'release' | 'beta' | 'alpha'
  datePublished: string
  files: { url: string; filename: string; sha1: string; sha512: string; size: number; primary: boolean }[]
  dependencies: { projectId: string; versionId: string; type: 'required' | 'optional' | 'incompatible' | 'embedded' }[]
}
export type ContentType = 'mod' | 'resourcepack' | 'shader'
/** One version the plan will download; `reason` names the item that requires it (empty for the one the player asked for). */
export type ContentPlanItem = { version: ProjectVersion; title: string; type: ContentType; reason: string; requiredBy: string }
export type ContentPlan = {
  instance: string
  projectId: string
  title: string
  type: ContentType
  items: ContentPlanItem[]
  alreadyInstalled: boolean
  warnings: string[]
}
/** A file installed from Modrinth, as recorded in the instance's content.json. */
export type ContentEntry = { projectId: string; versionId: string; title: string; versionNumber: string; type: ContentType; file: string; sha1: string; incompatible?: string[]; requiredBy?: string; description?: string; iconUrl?: string }
/** Whole-project view for the Details page: full description and the Minecraft
 *  versions/loaders aggregated across every version (one call, no per-version fetch). */
export type ProjectDetail = {
  id: string
  slug: string
  title: string
  /** The one-liner. */
  description: string
  /** The project's full page: Markdown, often with HTML mixed in (see utils/markdown). */
  body: string
  iconUrl: string
  downloads: number
  projectType: ProjectType
  gameVersions: string[]
  loaders: string[]
  categories: string[]
  clientSide: 'required' | 'optional' | 'unsupported' | 'unknown' | ''
  serverSide: 'required' | 'optional' | 'unsupported' | 'unknown' | ''
  license: string
  sourceUrl: string
  issuesUrl: string
  wikiUrl: string
  gallery: { url: string; title: string; description: string }[]
}
