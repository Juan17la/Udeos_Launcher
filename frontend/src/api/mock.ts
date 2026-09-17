// Browser-only stand-in for the Go backend (never loaded inside Wails).
import type { ContentEntry, ContentPlan, ContentPlanItem, ContentType, FileEntry, GameEvent, Instance, Loader, Profile, ProjectDetail, ProjectType, ProjectVersion, Progress, SearchGameVersion, SearchResult, SortBy, World } from './types'

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
    { id: 'i4', name: 'Fabric Fun', version: '1.20.1', loader: 'Fabric', loaderVersion: '0.16.9', loaderLabel: 'Fabric 0.16.9', icon: 'diamond', createdAt: new Date().toISOString(), playTimeSec: 0, counts: { mods: 0, resourcePacks: 0, worlds: 0, screenshots: 0 }, installed: false, running: false },
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
      { id: 'sodium', slug: 'sodium', title: 'Sodium', author: 'CaffeineMC', description: 'A modern rendering engine that boosts FPS.', iconUrl: '', downloads: 42_000_000, projectType: 'mod', loaders: ['fabric', 'quilt'] },
      { id: 'iris', slug: 'iris', title: 'Iris Shaders', author: 'IrisShaders', description: 'Shader support for Fabric; needs Sodium and Fabric API.', iconUrl: '', downloads: 20_000_000, projectType: 'mod', loaders: ['fabric', 'quilt'] },
      { id: 'jei', slug: 'jei', title: 'Just Enough Items', author: 'mezz', description: 'View items and recipes.', iconUrl: '', downloads: 30_000_000, projectType: 'mod', loaders: ['forge', 'fabric'] },
      { id: 'create', slug: 'create', title: 'Create', author: 'simibubi', description: 'Building tools and aesthetic technology.', iconUrl: '', downloads: 18_000_000, projectType: 'mod', loaders: ['forge', 'neoforge'] },
      { id: 'optifine', slug: 'optifine', title: 'OptiFine (mock)', author: 'sp614x', description: 'Incompatible with Sodium, for testing the refusal.', iconUrl: '', downloads: 1_000, projectType: 'mod', loaders: ['fabric', 'forge'] },
    ],
    resourcepack: [
      { id: 'faithful', slug: 'faithful-32x', title: 'Faithful 32x', author: 'Vattic', description: 'Higher-resolution vanilla-style textures.', iconUrl: '', downloads: 9_000_000, projectType: 'resourcepack', loaders: [] },
      { id: 'dandelion', slug: 'dandelion', title: 'Dandelion X', author: 'AjTheKing', description: 'Clean modern texture pack.', iconUrl: '', downloads: 2_000_000, projectType: 'resourcepack', loaders: [] },
    ],
    shader: [
      { id: 'bsl', slug: 'bsl-shaders', title: 'BSL Shaders', author: 'capttatsu', description: 'Balanced shaders with realistic lighting.', iconUrl: '', downloads: 6_000_000, projectType: 'shader', loaders: [] },
      { id: 'complementary', slug: 'complementary-reimagined', title: 'Complementary Reimagined', author: 'EminGT', description: 'Vanilla-friendly shader pack.', iconUrl: '', downloads: 5_500_000, projectType: 'shader', loaders: [] },
    ],
    modpack: [
      { id: 'allthemods', slug: 'all-the-mods-10', title: 'All the Mods 10', author: 'ATMTeam', description: 'A kitchen-sink modpack for 1.20.1.', iconUrl: '', downloads: 4_000_000, projectType: 'modpack', loaders: ['forge'] },
      { id: 'vaultsurvival', slug: 'vault-survival', title: 'Vault Hunters', author: 'Team Vault Hunters', description: 'Roguelike vault dungeons.', iconUrl: '', downloads: 3_000_000, projectType: 'modpack', loaders: ['forge'] },
    ],
  }
  // Dev-fixture-only: which Minecraft versions each mock result "supports",
  // kept off SearchResult itself since the real API filters by version
  // server-side and the UI never displays this.
  const mockVersionsById: Record<string, string[]> = {
    sodium: ['1.21.1', '1.20.4', '1.20.1'], iris: ['1.21.1', '1.20.4', '1.20.1'], jei: ['1.20.4', '1.20.1', '1.19.2'], create: ['1.20.4', '1.20.1', '1.19.2', '1.12.2'], optifine: ['1.20.1'],
    faithful: ['1.21.1', '1.20.4', '1.19.2'], dandelion: ['1.20.4'],
    bsl: ['1.21.1', '1.20.4'], complementary: ['1.20.4', '1.19.2'],
    allthemods: ['1.20.4'], vaultsurvival: ['1.18.2'],
  }

  // Dev fixture for the add-to-instance flow: what each project "publishes" and
  // what it depends on. fabric-api is not searchable, only pulled in as a dependency.
  const titles: Record<string, string> = { sodium: 'Sodium', iris: 'Iris Shaders', jei: 'Just Enough Items', create: 'Create', optifine: 'OptiFine (mock)', 'fabric-api': 'Fabric API', faithful: 'Faithful 32x', dandelion: 'Dandelion X', bsl: 'BSL Shaders', complementary: 'Complementary Reimagined' }
  const descriptions: Record<string, string> = {
    sodium: 'Sodium is a free and open-source rendering engine for Minecraft that dramatically improves frame rates while fixing many graphical issues. It has no downsides and is compatible with most existing mods.',
    iris: 'Iris brings modern shader support to the Fabric mod loader. Built to be compatible with existing OptiFine shader packs, Iris is blazingly fast and packed with features. Requires Sodium and Fabric API.',
    jei: 'Just Enough Items (JEI) is an item and recipe viewer built from the ground up for stability and performance. See what items can be crafted, and what recipes use an item, right from your inventory.',
    create: 'Create is a mod offering a variety of tools and blocks for building Create-ive contraptions, from small builds to entire factories all completely functional.',
    optifine: 'A mock entry used to exercise the incompatible-dependency path in the dev fixtures; not a real download.',
  }
  const deps: Record<string, ProjectVersion['dependencies']> = {
    iris: [{ projectId: 'sodium', versionId: '', type: 'required' }, { projectId: 'fabric-api', versionId: '', type: 'required' }],
    sodium: [{ projectId: 'optifine', versionId: '', type: 'incompatible' }],
    optifine: [{ projectId: 'sodium', versionId: '', type: 'incompatible' }],
    jei: [{ projectId: 'fabric-api', versionId: '', type: 'optional' }],
  }
  const loadersOf = (id: string) => {
    const all = [...searchResults.mod, ...searchResults.resourcepack, ...searchResults.shader, ...searchResults.modpack]
    return all.find((r) => r.id === id)?.loaders ?? (id === 'fabric-api' ? ['fabric', 'quilt'] : [])
  }
  const versionsOf = (id: string): ProjectVersion[] => (mockVersionsById[id] ?? ['1.21.1', '1.20.4', '1.20.1', '1.19.2']).map((mc) => ({
    id: `${id}@${mc}`, projectId: id, name: `${titles[id] ?? id} for ${mc}`, versionNumber: `1.0+${mc}`, gameVersions: [mc], loaders: loadersOf(id), type: 'release' as const,
    datePublished: new Date().toISOString(), files: [{ url: `https://cdn.mock/${id}-${mc}.jar`, filename: `${id}-${mc}${id === 'faithful' || id === 'dandelion' || id === 'bsl' || id === 'complementary' ? '.zip' : '.jar'}`, sha1: '', sha512: '', size: 1_000_000, primary: true }], dependencies: deps[id] ?? [],
  }))
  const contentTypeOf = (id: string): ContentType => searchResults.resourcepack.some((r) => r.id === id) ? 'resourcepack' : searchResults.shader.some((r) => r.id === id) ? 'shader' : 'mod'
  const projectDetail = (id: string): ProjectDetail => {
    const all = [...searchResults.mod, ...searchResults.resourcepack, ...searchResults.shader, ...searchResults.modpack]
    const hit = all.find((r) => r.id === id)
    const type = hit?.projectType ?? contentTypeOf(id)
    const versions = versionsOf(id)
    const gameVersions = [...new Set(versions.flatMap((v) => v.gameVersions))]
    const loaders = [...new Set(versions.flatMap((v) => v.loaders))]
    return {
      id, slug: hit?.slug ?? id, title: titles[id] ?? hit?.title ?? id,
      description: descriptions[id] ?? hit?.description ?? '', iconUrl: hit?.iconUrl ?? '',
      downloads: hit?.downloads ?? 0, projectType: type, gameVersions, loaders,
    }
  }
  const installed: Record<string, ContentEntry[]> = {}
  const planContent = (instanceId: string, projectId: string, projectType: ProjectType): ContentPlan => {
    const inst = instances.find((x) => x.id === instanceId)
    if (!inst) throw new Error('instance not found')
    if (projectType === 'modpack') throw new Error('cannot add a modpack to an instance')
    const title = titles[projectId] ?? projectId
    const have = installed[instanceId] ?? []
    const plan: ContentPlan = { instance: instanceId, projectId, title, type: projectType, items: [], alreadyInstalled: have.some((e) => e.projectId === projectId), warnings: [] }
    if (plan.alreadyInstalled) return plan
    if (projectType === 'mod' && inst.loader === 'Vanilla') throw new Error('this instance has no mod loader: create a Fabric or Forge instance to use mods')
    const ldr = projectType === 'mod' ? inst.loader.toLowerCase() : ''
    const suffix = ldr ? ` with ${inst.loader}` : ''
    const pick = (id: string) => versionsOf(id).find((v) => v.gameVersions.includes(inst.version) && (!ldr || v.loaders.includes(ldr)))
    const root = pick(projectId)
    if (!root) throw new Error(`${title} has no build for Minecraft ${inst.version}${suffix}`)
    plan.items.push({ version: root, title, type: projectType, reason: '', requiredBy: '' })
    const queue = [...root.dependencies.map((d) => ({ d, by: projectId }))]
    while (queue.length) {
      const { d, by } = queue.shift()!
      if (d.type === 'incompatible' && have.some((e) => e.projectId === d.projectId)) throw new Error(`${titles[by] ?? by} is incompatible with ${titles[d.projectId] ?? d.projectId}, which is installed in this instance`)
      if (d.type === 'optional' && !have.some((e) => e.projectId === d.projectId)) plan.warnings.push(`${title} works with ${titles[d.projectId] ?? d.projectId} (optional, not installed)`)
      if (d.type !== 'required' || plan.items.some((i) => i.version.projectId === d.projectId) || have.some((e) => e.projectId === d.projectId)) continue
      const v = pick(d.projectId)
      if (!v) throw new Error(`${title} needs ${titles[d.projectId] ?? d.projectId}, which has no build for Minecraft ${inst.version}${suffix}`)
      plan.items.push({ version: v, title: titles[d.projectId] ?? d.projectId, type: contentTypeOf(d.projectId), reason: titles[by] ?? by, requiredBy: by })
      queue.push(...v.dependencies.map((x) => ({ d: x, by: d.projectId })))
    }
    for (const e of have) for (const x of e.incompatible ?? []) if (plan.items.some((i) => i.version.projectId === x)) throw new Error(`${titles[x] ?? x} is incompatible with ${e.title}, which is installed in this instance`)
    return plan
  }
  const applyContent = async (instanceId: string, plan: ContentPlan): Promise<ContentEntry[]> => {
    const out: ContentEntry[] = []
    for (let i = 0; i < plan.items.length; i++) {
      const it: ContentPlanItem = plan.items[i]
      const f = it.version.files[0]
      emit('content:progress', { phase: 'content', done: i, total: plan.items.length, bytes: i * f.size, totalBytes: plan.items.length * f.size, current: f.filename } satisfies Progress)
      await sleep(500)
      const entry: FileEntry = { name: f.filename, sizeBytes: f.size, modTime: new Date().toISOString(), isDir: false }
      if (it.type === 'mod') (mods[instanceId] ??= []).unshift(entry)
      else if (it.type === 'shader') (shaders[instanceId] ??= []).unshift(entry)
      out.push({ projectId: it.version.projectId, versionId: it.version.id, title: it.title, versionNumber: it.version.versionNumber, type: it.type, file: f.filename, sha1: '', incompatible: it.version.dependencies.filter((d) => d.type === 'incompatible').map((d) => d.projectId), requiredBy: it.requiredBy })
    }
    emit('content:progress', { phase: 'content', done: plan.items.length, total: plan.items.length, bytes: 0, totalBytes: 0, current: '' } satisfies Progress)
    ;(installed[instanceId] ??= []).push(...out)
    const inst = instances.find((x) => x.id === instanceId)
    if (inst) inst.counts.mods = (mods[instanceId] ?? []).length
    return out
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
    async RemoveMod(id: string, name: string) { mods[id] = (mods[id] ?? []).filter((m) => m.name !== name); installed[id] = (installed[id] ?? []).filter((e) => e.file !== name) },
    async ListShaders(id: string) { return (shaders[id] ?? []).map((s) => ({ ...s })) },
    async AddShader(id: string, path: string) { const e = fileOf(path); (shaders[id] ??= []).unshift(e); return e },
    async PickShader(id: string) { await sleep(300); return backend.AddShader(id, '/home/player/BSL_v8.2.zip') },
    async RemoveShader(id: string, name: string) { shaders[id] = (shaders[id] ?? []).filter((s) => s.name !== name) },
    async AddResourcePack(_id: string, path: string) { return { name: path.split('/').pop()!, sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false } },
    async PickResourcePack() { return { name: 'Picked Pack.zip', sizeBytes: 1000, modTime: new Date().toISOString(), isDir: false } },
    async RemoveResourcePack() {},
    async OpenInstanceFolder() {},
    async SearchContent(projectType: ProjectType, text: string, gameVersion: string, ldr: string, sortBy: SortBy, offset: number, limit: number) {
      await sleep(200)
      const all = searchResults[projectType].filter((r) =>
        (!text || r.title.toLowerCase().includes(text.toLowerCase())) &&
        (!gameVersion || (mockVersionsById[r.id] ?? []).includes(gameVersion)) &&
        (!ldr || r.loaders.includes(ldr.toLowerCase())))
      if (sortBy === 'downloads') all.sort((a, b) => b.downloads - a.downloads)
      return { results: all.slice(offset, offset + limit), total: all.length, offset }
    },
    async ListSearchGameVersions() { return gameVersions.map((v) => ({ ...v })) },
    async PlanContent(instanceId: string, projectId: string, projectType: ProjectType) { await sleep(400); return planContent(instanceId, projectId, projectType) },
    async AddContent(instanceId: string, projectId: string, projectType: ProjectType) { const plan = planContent(instanceId, projectId, projectType); return plan.alreadyInstalled ? [] : applyContent(instanceId, plan) },
    async ListInstalledProjects(instanceId: string) { return (installed[instanceId] ?? []).map((e) => e.projectId) },
    async GetProjectDetail(projectId: string) { await sleep(300); return projectDetail(projectId) },
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
