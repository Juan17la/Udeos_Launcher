// Browser-only stand-in for the Go backend (never loaded inside Wails).
import type { GameEvent, Instance, Profile, Progress, World } from './types'

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
    { id: 'i1', name: 'Skyline Adventures', version: '1.21.1', loader: 'Vanilla', icon: 'grass', createdAt: new Date().toISOString(), lastPlayed: new Date(Date.now() - 2 * 864e5).toISOString(), playTimeSec: 61200, counts: { mods: 0, resourcePacks: 1, worlds: 2, screenshots: 3 }, installed: true, running: false },
    { id: 'i2', name: 'New World', version: '1.21.1', loader: 'Vanilla', icon: 'crafting_table', createdAt: new Date().toISOString(), playTimeSec: 0, counts: { mods: 0, resourcePacks: 0, worlds: 0, screenshots: 0 }, installed: false, running: false },
  ]
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const worlds: Record<string, World[]> = {
    i1: [
      { folder: 'Skyline City', name: 'Skyline City', lastPlayed: new Date(Date.now() - 2 * 864e5).toISOString(), sizeBytes: 52_000_000 },
      { folder: 'Nether Base', name: 'Nether Base', lastPlayed: new Date(Date.now() - 7 * 864e5).toISOString(), sizeBytes: 8_400_000 },
    ],
  }
  const syncCounts = (id: string) => { const i = instances.find((x) => x.id === id); if (i) i.counts.worlds = (worlds[id] ?? []).length }

  const backend = {
    async GetAppInfo() { return { version: '0.1.0-dev', os: 'browser', arch: 'mock', dataDir: '/mock' } },
    async GetProfile() {
      return { exists: !!profile, profile: profile ?? { nickname: '', uuid: '', language: 'en' as const, theme: 'dark' as const, agreed: false, maxMemoryMB: 2048 } }
    },
    async SaveProfile(p: Profile) { profile = { ...p, uuid: 'mock-uuid' }; localStorage.setItem('mock:profile', JSON.stringify(profile)); return profile },
    async ListInstances() { return instances.map((i) => ({ ...i })) },
    async GetInstance(id: string) { const i = instances.find((x) => x.id === id); if (!i) throw new Error('instance not found'); return { ...i } },
    async CreateInstance(name: string, version: string, icon: string) {
      const inst: Instance = { id: 'i' + Date.now(), name, version, loader: 'Vanilla', icon, createdAt: new Date().toISOString(), playTimeSec: 0, counts: { mods: 0, resourcePacks: 0, worlds: 0, screenshots: 0 }, installed: false, running: false }
      instances.push(inst); return inst
    },
    async DeleteInstance(id: string) { const i = instances.findIndex((x) => x.id === id); if (i >= 0) instances.splice(i, 1) },
    async ListVersions() {
      return { latestRelease: '1.21.1', latestSnapshot: '24w33a', versions: [
        { id: '24w33a', type: 'snapshot' as const, releaseTime: '' }, { id: '1.21.1', type: 'release' as const, releaseTime: '' },
        { id: '1.20.4', type: 'release' as const, releaseTime: '' }, { id: '1.19.2', type: 'release' as const, releaseTime: '' }, { id: '1.12.2', type: 'release' as const, releaseTime: '' },
      ] }
    },
    async InstallVersion() { await fakeInstall() },
    async LaunchInstance(id: string) {
      const inst = instances.find((x) => x.id === id)!
      if (!inst.installed) { await fakeInstall(); inst.installed = true }
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
    async ListMods() { return [] },
    async ListShaders() { return [] },
    async AddResourcePack(_id: string, path: string) { return { name: path.split('/').pop()!, sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false } },
    async PickResourcePack() { return { name: 'Picked Pack.zip', sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false } },
    async RemoveResourcePack() {},
    async OpenInstanceFolder() {},
  }

  async function fakeInstall() {
    for (const [phase, total] of [['version', 1], ['libraries', 40], ['assets', 120], ['client', 1], ['java', 60]] as const) {
      for (let d = 1; d <= total; d++) {
        emit('install:progress', { phase, done: d, total, bytes: d * 1e6, totalBytes: total * 1e6, current: `${phase}-${d}.jar` } satisfies Progress)
        await sleep(total > 10 ? 15 : 200)
      }
    }
  }

  return { backend, on: on as never }
}
