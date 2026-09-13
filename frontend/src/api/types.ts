// Mirrors of the Go structs returned by the App bindings (see launcher/app_*.go).

export type Profile = {
  nickname: string
  uuid: string
  language: 'en' | 'es'
  theme: 'light' | 'dark'
  agreed: boolean
  maxMemoryMB: number
  javaPath?: string
}
export type ProfileState = { exists: boolean; profile: Profile }

export type Counts = { mods: number; resourcePacks: number; worlds: number; screenshots: number }

export type Instance = {
  id: string
  name: string
  version: string
  loader: string
  icon: string
  createdAt: string
  lastPlayed?: string
  playTimeSec: number
  counts: Counts
  installed: boolean
  running: boolean
}

export type VersionOption = { id: string; type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'; releaseTime: string }
export type VersionList = { latestRelease: string; latestSnapshot: string; versions: VersionOption[] }

export type Progress = { phase: string; done: number; total: number; bytes: number; totalBytes: number; current: string }
export type GameEvent = { instanceId: string; running: boolean; exitCode: number; logPath: string; error?: string }

export type AppInfo = { version: string; os: string; arch: string; dataDir: string }

export type World = { folder: string; name: string; lastPlayed: string; sizeBytes: number }
export type FileEntry = { name: string; sizeBytes: number; modTime: string; isDir: boolean }
