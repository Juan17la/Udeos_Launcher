// Browser-only stand-in for the Go backend (never loaded inside Wails).
import type { FileEntry, GameEvent, Instance, Loader, Profile, ProjectType, Progress, SearchGameVersion, SearchResult, World } from './types'

export function createMock() {
  const listeners: Record<string, Set<(d: unknown) => void>> = {}
  const emit = (name: string, data: unknown) => listeners[name]?.forEach((cb) => cb(data))
  const on = (name: string, cb: (d: never) => void) => {
    ;(listeners[name] ??= new Set()).add(cb as (d: unknown) => void)
    return () => listeners[name].delete(cb as (d: unknown) => void)
  }

  let profile: Profile | null = null
  const stored = localStorage.getItem('mock:profile')
  if (stored) profile = JSON.parse(stored)
  const instances: Instance[] = [
    { id: 'i1', name: 'Skyline Adventures', version: '1.21.1', loader: 'Vanilla', loaderLabel: 'Vanilla', icon: 'grass', createdAt: new Date().toISOString(), lastPlayed: new Date(Date.now() - 2 * 864e5).toISOString(), playTimeSec: 61200, counts: { mods: 0, resourcePacks: 1, worlds: 2, screenshots: 3 }, installed: true, running: false },
    { id: 'i2', name: 'New World', version: '1.21.1', loader: 'Vanilla', loaderLabel: 'Vanilla', icon: 'crafting_table', createdAt: new Date().toISOString(), playTimeSec: 0, counts: { mods: 0, resourcePacks: 0, worlds: 0, screenshots: 0 }, installed: false, running: false },
    { id: 'i3', name: 'Modded Fun', version: '1.20.1', loader: 'Forge', loaderVersion: '1.20.1-47.4.10', loaderLabel: 'Forge 47.4.10', icon: 'furnace', createdAt: new Date().toISOString(), playTimeSec: 0, counts: { mods: 2, resourcePacks: 0, worlds: 0, screenshots: 0 }, installed: false, running: false },
  ]
  const loaderOptions: Record<string, Array<[string, string]>> = {
    Fabric: [['24w33a', '0.16.9'], ['1.21.1', '0.16.9'], ['1.20.4', '0.16.9'], ['1.19.2', '0.16.9']],
    Forge: [['1.21.1', '1.21.1-52.1.0'], ['1.20.4', '1.20.4-49.2.0'], ['1.19.2', '1.19.2-43.5.0'], ['1.12.2', '1.12.2-14.23.5.2859']],
  }
  const mods: Record<string, FileEntry[]> = { i3: [
    { name: 'jei-1.20.1-forge-15.3.0.4.jar', sizeBytes: 1_200_000, modTime: new Date().toISOString(), isDir: false },
    { name: 'journeymap-1.20.1-5.9.18-forge.jar', sizeBytes: 4_800_000, modTime: new Date().toISOString(), isDir: false },
  ] }
  const shaders: Record<string, FileEntry[]> = {}
  const fileOf = (path: string): FileEntry => ({ name: path.split('/').pop()!, sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false })
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const worlds: Record<string, World[]> = {
    i1: [
      { folder: 'Skyline City', name: 'Skyline City', lastPlayed: new Date(Date.now() - 2 * 864e5).toISOString(), sizeBytes: 52_000_000 },
      { folder: 'Nether Base', name: 'Nether Base', lastPlayed: new Date(Date.now() - 7 * 864e5).toISOString(), sizeBytes: 8_400_000 },
    ],
  }
  const syncCounts = (id: string) => { const i = instances.find((x) => x.id === id); if (i) i.counts.worlds = (worlds[id] ?? []).length }

  const gameVersions: SearchGameVersion[] = [
    { version: '24w33a', type: 'snapshot' }, { version: '1.21.1', type: 'release' }, { version: '1.20.4', type: 'release' },
    { version: '1.19.2', type: 'release' }, { version: '1.12.2', type: 'release' },
  ]
  const searchResults: Record<ProjectType, SearchResult[]> = {
    mod: [
      { id: 'sodium', slug: 'sodium', title: 'Sodium', author: 'CaffeineMC', description: 'A modern rendering engine that boosts FPS.', iconUrl: '', downloads: 42_000_000, projectType: 'mod', loaders: ['fabric', 'quilt'], gameVersions: ['1.21.1', '1.20.4'] },
      { id: 'jei', slug: 'jei', title: 'Just Enough Items', author: 'mezz', description: 'View items and recipes.', iconUrl: '', downloads: 30_000_000, projectType: 'mod', loaders: ['forge', 'fabric'], gameVersions: ['1.20.4', '1.19.2'] },
      { id: 'create', slug: 'create', title: 'Create', author: 'simibubi', description: 'Building tools and aesthetic technology.', iconUrl: '', downloads: 18_000_000, projectType: 'mod', loaders: ['forge', 'neoforge'], gameVersions: ['1.20.4', '1.19.2', '1.12.2'] },
    ],
    resourcepack: [
      { id: 'faithful', slug: 'faithful-32x', title: 'Faithful 32x', author: 'Vattic', description: 'Higher-resolution vanilla-style textures.', iconUrl: '', downloads: 9_000_000, projectType: 'resourcepack', loaders: [], gameVersions: ['1.21.1', '1.20.4', '1.19.2'] },
      { id: 'dandelion', slug: 'dandelion', title: 'Dandelion X', author: 'AjTheKing', description: 'Clean modern texture pack.', iconUrl: '', downloads: 2_000_000, projectType: 'resourcepack', loaders: [], gameVersions: ['1.20.4'] },
    ],
    shader: [
      { id: 'bsl', slug: 'bsl-shaders', title: 'BSL Shaders', author: 'capttatsu', description: 'Balanced shaders with realistic lighting.', iconUrl: '', downloads: 6_000_000, projectType: 'shader', loaders: [], gameVersions: ['1.21.1', '1.20.4'] },
      { id: 'complementary', slug: 'complementary-reimagined', title: 'Complementary Reimagined', author: 'EminGT', description: 'Vanilla-friendly shader pack.', iconUrl: '', downloads: 5_500_000, projectType: 'shader', loaders: [], gameVersions: ['1.20.4', '1.19.2'] },
    ],
    modpack: [
      { id: 'allthemods', slug: 'all-the-mods-10', title: 'All the Mods 10', author: 'ATMTeam', description: 'A kitchen-sink modpack for 1.20.1.', iconUrl: '', downloads: 4_000_000, projectType: 'modpack', loaders: ['forge'], gameVersions: ['1.20.4'] },
      { id: 'vaultsurvival', slug: 'vault-survival', title: 'Vault Hunters', author: 'Team Vault Hunters', description: 'Roguelike vault dungeons.', iconUrl: '', downloads: 3_000_000, projectType: 'modpack', loaders: ['forge'], gameVersions: ['1.18.2'] },
    ],
  }

  const backend = {
    async GetAppInfo() { return { version: '0.1.0-dev', os: 'browser', arch: 'mock', dataDir: '/mock' } },
    async GetProfile() {
      return { exists: !!profile, profile: profile ?? { nickname: '', uuid: '', language: 'en' as const, theme: 'dark' as const, agreed: false, maxMemoryMB: 2048 } }
    },
    async SaveProfile(p: Profile) { profile = { ...p, uuid: 'mock-uuid' }; localStorage.setItem('mock:profile', JSON.stringify(profile)); return profile },
    async ListInstances() { return instances.map((i) => ({ ...i })) },
    async GetInstance(id: string) { const i = instances.find((x) => x.id === id); if (!i) throw new Error('instance not found'); return { ...i } },
    async CreateInstance(name: string, version: string, loader: Loader, loaderVersion: string, icon: string) {
      const label = loader === 'Vanilla' ? 'Vanilla' : `${loader} ${loaderVersion.replace(`${version}-`, '')}`
      const inst: Instance = { id: 'i' + Date.now(), name, version, loader, loaderVersion: loaderVersion || undefined, loaderLabel: label, icon, createdAt: new Date().toISOString(), playTimeSec: 0, counts: { mods: 0, resourcePacks: 0, worlds: 0, screenshots: 0 }, installed: false, running: false }
      instances.push(inst); return inst
    },
    async DeleteInstance(id: string) { const i = instances.findIndex((x) => x.id === id); if (i >= 0) instances.splice(i, 1) },
    async ListVersions() {
      return { latestRelease: '1.21.1', latestSnapshot: '24w33a', versions: [
        { id: '24w33a', type: 'snapshot' as const, releaseTime: '' }, { id: '1.21.1', type: 'release' as const, releaseTime: '' },
        { id: '1.20.4', type: 'release' as const, releaseTime: '' }, { id: '1.19.2', type: 'release' as const, releaseTime: '' }, { id: '1.12.2', type: 'release' as const, releaseTime: '' },
      ] }
    },
    async ListLoaderVersions(loader: Loader) {
      await sleep(400)
      return (loaderOptions[loader] ?? []).map(([minecraft, version]) => ({ minecraft, version, label: version.replace(`${minecraft}-`, '') }))
    },
    async InstallInstance(id: string) { await fakeInstall(instances.find((x) => x.id === id)?.loader) },
    async LaunchInstance(id: string) {
      const inst = instances.find((x) => x.id === id)!
      if (!inst.installed) { await fakeInstall(inst.loader); inst.installed = true }
      emit('install:progress', { phase: 'done', done: 0, total: 0, bytes: 0, totalBytes: 0, current: '' } satisfies Progress)
      inst.running = true
      emit('game:state', { instanceId: id, running: true, exitCode: 0, logPath: '/mock/log' } satisfies GameEvent)
      setTimeout(() => { inst.running = false; inst.lastPlayed = new Date().toISOString(); emit('game:state', { instanceId: id, running: false, exitCode: 0, logPath: '/mock/log' } satisfies GameEvent) }, 6000)
    },
    async IsRunning(id: string) { return !!instances.find((x) => x.id === id)?.running },
    async ListWorlds(id: string) { return (worlds[id] ?? []).map((w) => ({ ...w })) },
    async ExportWorld(_id: string, folder: string) { await sleep(600); return `/home/player/${folder}.zip` },
    async AddWorld(id: string, path: string) {
      if (!/\.zip$/i.test(path) && path.includes('.')) throw new Error('worlds must be .zip files or folders')
      const name = path.split('/').pop()!.replace(/\.zip$/i, '')
      const w: World = { folder: name, name, lastPlayed: new Date().toISOString(), sizeBytes: 12_000_000 }
      ;(worlds[id] ??= []).unshift(w); syncCounts(id); return w
    },
    async PickWorld(id: string) { await sleep(300); return backend.AddWorld(id, '/home/player/Picked World.zip') },
    async RemoveWorld(id: string, folder: string) { worlds[id] = (worlds[id] ?? []).filter((w) => w.folder !== folder); syncCounts(id) },
    async ListScreenshots(id: string) {
      return id === 'i1' ? [1, 2, 3].map((n) => ({ name: `2026-09-1${n}_12.00.0${n}.png`, sizeBytes: 900_000, modTime: new Date().toISOString(), isDir: false })) : []
    },
    async ExportScreenshot(_id: string, name: string) { await sleep(400); return `/home/player/${name}` },
    async ListResourcePacks(id: string) { return id === 'i1' ? [{ name: 'Faithful 32x.zip', sizeBytes: 45_000_000, modTime: new Date().toISOString(), isDir: false }] : [] },
    async ListMods(id: string) { return (mods[id] ?? []).map((m) => ({ ...m })) },
    async AddMod(id: string, path: string) {
      if (!/\.jar$/i.test(path)) throw new Error('mods must be .jar files')
      const e = fileOf(path); (mods[id] ??= []).unshift(e); return e
    },
    async PickMod(id: string) { await sleep(300); return backend.AddMod(id, '/home/player/sodium-fabric-0.5.8.jar') },
    async RemoveMod(id: string, name: string) { mods[id] = (mods[id] ?? []).filter((m) => m.name !== name) },
    async ListShaders(id: string) { return (shaders[id] ?? []).map((s) => ({ ...s })) },
    async AddShader(id: string, path: string) { const e = fileOf(path); (shaders[id] ??= []).unshift(e); return e },
    async PickShader(id: string) { await sleep(300); return backend.AddShader(id, '/home/player/BSL_v8.2.zip') },
    async RemoveShader(id: string, name: string) { shaders[id] = (shaders[id] ?? []).filter((s) => s.name !== name) },
    async AddResourcePack(_id: string, path: string) { return { name: path.split('/').pop()!, sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false } },
    async PickResourcePack() { return { name: 'Picked Pack.zip', sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false } },
    async RemoveResourcePack() {},
    async OpenInstanceFolder() {},
    async SearchContent(projectType: ProjectType, text: string, gameVersion: string, ldr: string, offset: number, limit: number) {
      await sleep(200)
      const all = searchResults[projectType].filter((r) =>
        (!text || r.title.toLowerCase().includes(text.toLowerCase())) &&
        (!gameVersion || r.gameVersions.includes(gameVersion)) &&
        (!ldr || r.loaders.includes(ldr.toLowerCase())))
      return { results: all.slice(offset, offset + limit), total: all.length, offset }
    },
    async ListSearchGameVersions() { return gameVersions.map((v) => ({ ...v })) },
  }

  async function fakeInstall(loader?: Loader) {
    for (const [phase, total] of [['version', 1], ['libraries', 40], ['assets', 120], ['client', 1], ['java', 60]] as const) {
      for (let d = 1; d <= total; d++) {
        emit('install:progress', { phase, done: d, total, bytes: d * 1e6, totalBytes: total * 1e6, current: `${phase}-${d}.jar` } satisfies Progress)
        await sleep(total > 10 ? 15 : 200)
      }
    }
    if (loader && loader !== 'Vanilla') {
      for (const line of ['Downloading installer', 'Processing: Patching client jar', 'Patching net/minecraft/client/Minecraft 1/1', 'Successfully installed client']) {
        emit('install:progress', { phase: 'loader', done: 0, total: 0, bytes: 0, totalBytes: 0, current: line } satisfies Progress)
        await sleep(500)
      }
    }
  }

  return { backend, on: on as never }
}
