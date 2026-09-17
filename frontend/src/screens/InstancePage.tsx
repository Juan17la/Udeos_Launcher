import { useCallback, useEffect, useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { Camera, Folder, Play, Search as SearchIcon, X } from '../ui/icons'
import { useApp, useLaunch } from '../state'
import { api, on } from '../api/bridge'
import type { FileEntry, ProjectType, World } from '../api/types'
import { fmt } from '../i18n/format'
import { ago, bytes } from '../ui/time'
import ConfirmDialog from '../components/ConfirmDialog'
import Dialog from '../components/Dialog'

type Tab = 'mods' | 'resourcepacks' | 'shaders' | 'worlds' | 'screenshots'

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const btnDanger = 'bg-mc-danger border-mc-danger-border text-mc-danger-text shadow-[inset_0_-2px_0_var(--mc-danger-bottom)] hover:bg-mc-danger-hover active:bg-mc-danger-active active:shadow-none'
const btnGhost = 'text-accent border-transparent px-1.5 bg-transparent hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]'
const btnIcon = 'w-9 h-9 p-0'
const btnBlock = 'w-full mt-2'
const cardBase = 'flex flex-col gap-2 rounded-lg bg-surface'
const tagBase = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap'
const tagAccent = `${tagBase} bg-accent-100 text-accent-800`
const tagAccent2 = `${tagBase} bg-accent-2-100 text-accent-2-800`
const cardMeta = 'flex items-center gap-1.5 text-[11px] text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'
const segOpt = 'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-[7px] text-[13px] cursor-pointer border-0 bg-transparent text-inherit font-inherit [&:not(:first-child)]:border-l [&:not(:first-child)]:border-divider disabled:opacity-45 disabled:cursor-not-allowed'
const segOptActive = 'bg-accent text-bg'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'
const dropzone = (over: boolean) => `border-[1.5px] border-dashed rounded-lg p-4.5 text-center mb-4 text-sm ${textMuted} flex items-center justify-center gap-3.5 flex-wrap ${over ? 'border-accent bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]' : 'border-divider'}`

export default function InstancePage({ id }: { id: string }) {
  const { t, instances, refreshInstances, go } = useApp()
  const { play, launch } = useLaunch()
  const inst = instances.find((i) => i.id === id)
  const vanilla = !inst || inst.loader === 'Vanilla'
  const tabs: Tab[] = vanilla ? ['resourcepacks', 'worlds', 'screenshots'] : ['mods', 'resourcepacks', 'shaders', 'worlds', 'screenshots']
  const [tab, setTab] = useState<Tab>(tabs[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const busy = launch.status === 'preparing'

  useEffect(() => { if (!inst) go({ name: 'dashboard' }) }, [inst, go])
  if (!inst) return null

  const remove = async () => {
    await api.DeleteInstance(inst.id)
    await refreshInstances()
    go({ name: 'dashboard' })
  }

  return (
    <main className="flex-1 grid items-start gap-7 pt-9 px-11 pb-15" style={{ gridTemplateColumns: '290px minmax(0,1fr)' }}>
      <div className={`${cardBase} items-center text-center gap-4 bg-panel-tint shadow-sheen sticky top-6 py-6.5 px-5.5`}>
        <PixelIcon name={inst.icon} size={96} />
        <div className="max-w-full">
          <h3 className="mb-2 text-[26px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{inst.name}</h3>
          <div className="flex gap-1.5 justify-center">
            <span className={tagAccent}>{inst.version}</span>
            <span className={tagAccent2}>{inst.loaderLabel}</span>
          </div>
        </div>
        <p className={`${textMuted} m-0 text-xs`}>{inst.installed ? t.instance.installed : t.instance.notInstalled}</p>
        <button type="button" className={`${btnBase} ${btnPrimary} ${btnBlock} h-12 text-lg`} disabled={busy || inst.running} onClick={() => play(inst.id)}>
          <Play size={16} /> {inst.running ? t.common.running : t.common.play}
        </button>
        <button type="button" className={`${btnBase} ${btnSecondary} ${btnBlock} text-[13px]`} onClick={() => api.OpenInstanceFolder(inst.id, '')}>
          <Folder /> {t.instance.openFolder}
        </button>
        <button type="button" className={`${btnBase} ${btnDanger} ${btnBlock} text-[13px] whitespace-nowrap`} disabled={inst.running} onClick={() => setConfirmDelete(true)}>{t.instance.deleteInstance}</button>
      </div>

      <div className="min-w-0">
        <div className="inline-flex overflow-hidden border border-divider rounded-full mb-5">
          {tabs.map((k) => (
            <button key={k} type="button" className={`${segOpt} ${tab === k ? segOptActive : ''}`} onClick={() => setTab(k)}>{t.instance.tabs[k]}</button>
          ))}
        </div>
        {tab === 'worlds' && <WorldsTab id={inst.id} />}
        {tab === 'screenshots' && <ScreenshotsTab id={inst.id} />}
        {tab === 'resourcepacks' && <ResourcePacksTab id={inst.id} />}
        {(tab === 'mods' || tab === 'shaders') && <FilesTab id={inst.id} kind={tab} />}
      </div>

      {confirmDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteTitle} body={t.instance.confirmDelete} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setConfirmDelete(false)} />
      )}
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return <div className={`${textMuted} text-center px-5 py-10`}><p className="m-0 text-sm">{text}</p></div>
}

function Toast({ text }: { text: string | null }) {
  if (!text) return null
  return <p className={`${textMuted} text-xs mb-3 break-all`}>{text}</p>
}

/** Small right-aligned "Open folder" link shown above a tab's content. */
function FolderLink({ id, sub }: { id: string; sub: string }) {
  const { t } = useApp()
  return (
    <div className="flex justify-end mb-2.5">
      <button type="button" className={`${btnBase} ${btnGhost} text-xs`} onClick={() => api.OpenInstanceFolder(id, sub)}><Folder size={12} /> {t.instance.openFolder}</button>
    </div>
  )
}

/** Opens the Search page with this instance preselected on the matching content tab. */
function BrowseModrinth({ id, type }: { id: string; type: ProjectType }) {
  const { t, go } = useApp()
  return (
    <button type="button" className={`${btnBase} ${btnSecondary} text-[13px] whitespace-nowrap`} onClick={() => go({ name: 'search', instanceId: id, type })}>
      <SearchIcon size={13} /> {t.instance.browseModrinth}
    </button>
  )
}

function WorldsTab({ id }: { id: string }) {
  const { t, refreshInstances } = useApp()
  const { launch } = useLaunch()
  const [worlds, setWorlds] = useState<World[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [toDelete, setToDelete] = useState<World | null>(null)
  const load = useCallback(() => { api.ListWorlds(id).then(setWorlds) }, [id])
  useEffect(load, [load, launch.status])

  const add = useCallback(async (paths: string[]) => {
    setError(null); setNote(null)
    for (const p of paths) {
      try { const w = await api.AddWorld(id, p); setNote(fmt(t.instance.worldAdded, { name: w.name })) } catch (e) { setError(String((e as Error)?.message ?? e)) }
    }
    load(); refreshInstances()
  }, [id, load, refreshInstances, t])

  // Native file drops arrive from Go with real paths; only the mounted tab listens.
  useEffect(() => on('files:dropped', (paths) => { setOver(false); add(paths) }), [add])

  const pick = async () => {
    setError(null); setNote(null)
    try { const w = await api.PickWorld(id); if (w.folder) { setNote(fmt(t.instance.worldAdded, { name: w.name })); load(); refreshInstances() } } catch (e) { setError(String((e as Error)?.message ?? e)) }
  }
  const save = async (w: World) => {
    const path = await api.ExportWorld(id, w.folder)
    if (path) setNote(fmt(t.instance.savedTo, { path }))
  }
  const remove = async () => {
    if (!toDelete) return
    try { await api.RemoveWorld(id, toDelete.folder) } catch (e) { setError(String((e as Error)?.message ?? e)) }
    setToDelete(null); load(); refreshInstances()
  }

  return (
    <>
      <div className={dropzone(over)} style={{ ['--wails-drop-target' as string]: 'drop' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
        <span>{fmt(t.instance.dropHere, { kind: t.instance.kinds.worlds })}</span>
        <span className="text-[13px]">{t.common.or}</span>
        <button type="button" className={`${btnBase} ${btnPrimary} text-[13px] whitespace-nowrap`} onClick={pick}>{t.instance.browse}</button>
      </div>
      {error && <p className="mb-3 text-[13px] text-mc-danger">{error}</p>}
      <Toast text={note} />
      <FolderLink id={id} sub="saves" />
      {worlds && worlds.length === 0 && <Empty text={t.instance.empty.worlds} />}
      {worlds && worlds.length > 0 && (
        <div className="flex flex-col gap-2">
          {worlds.map((w) => (
            <div key={w.folder} className={`${cardBase} flex-row items-center py-3 px-4`}>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{w.name}</div>
                <div className={`${cardMeta} mt-0.5 text-xs`}>{fmt(t.instance.worldMeta, { when: ago(w.lastPlayed, t), size: bytes(w.sizeBytes) })}</div>
              </div>
              <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={() => save(w)}><Folder /> {t.instance.saveToDevice}</button>
              <button type="button" className={`${btnBase} ${btnDanger} ${btnIcon}`} title={t.instance.removeWorld} onClick={() => setToDelete(w)}><X /></button>
            </div>
          ))}
        </div>
      )}
      {toDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteWorldTitle} body={fmt(t.instance.confirmDeleteWorld, { name: toDelete.name })} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setToDelete(null)} />
      )}
    </>
  )
}

function ScreenshotsTab({ id }: { id: string }) {
  const { t } = useApp()
  const { launch } = useLaunch()
  const [shots, setShots] = useState<FileEntry[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [open, setOpen] = useState<FileEntry | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const load = useCallback(() => { api.ListScreenshots(id).then(setShots) }, [id])
  useEffect(load, [load, launch.status])

  const src = (s: FileEntry) => `/media/${encodeURIComponent(id)}/screenshots/${encodeURIComponent(s.name)}`
  const save = async (s: FileEntry) => {
    const path = await api.ExportScreenshot(id, s.name)
    if (path) setNote(fmt(t.instance.savedTo, { path }))
  }
  if (!shots) return null
  return (
    <>
      <Toast text={note} />
      <FolderLink id={id} sub="screenshots" />
      {shots.length === 0 && <Empty text={t.instance.empty.screenshots} />}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {shots.map((s) => (
          <div key={s.name} className="flex flex-col gap-1.5">
            <button
              type="button" title={`${t.instance.view}: ${s.name}`} onClick={() => setOpen(s)}
              className="relative aspect-[16/10] rounded-md bg-surface flex items-center justify-center overflow-hidden p-0 border-0 cursor-zoom-in"
            >
              {failed.has(s.name) ? (
                <span className="text-neutral-500"><Camera /></span>
              ) : (
                <img src={src(s)} alt={s.name} loading="lazy" className="w-full h-full object-cover"
                  onError={() => setFailed((f) => new Set(f).add(s.name))} />
              )}
            </button>
            <button type="button" className={`${btnBase} ${btnSecondary} text-[13px]`} onClick={() => save(s)}>{t.instance.saveToDevice}</button>
          </div>
        ))}
      </div>
      {open && (
        <Dialog title={open.name} width={960} onClose={() => setOpen(null)} actions={<>
          <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={() => save(open)}><Folder /> {t.instance.saveToDevice}</button>
          <button type="button" className={`${btnBase} ${btnPrimary}`} onClick={() => setOpen(null)}>{t.common.close}</button>
        </>}>
          <img src={src(open)} alt={open.name} className="block w-full max-h-[70vh] object-contain rounded-md bg-surface" />
          <p className={`${textMuted} mt-2 text-xs`}>{bytes(open.sizeBytes)} · {ago(open.modTime, t)}</p>
        </Dialog>
      )}
    </>
  )
}

function ResourcePacksTab({ id }: { id: string }) {
  const { t, refreshInstances } = useApp()
  const [packs, setPacks] = useState<FileEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const load = useCallback(() => { api.ListResourcePacks(id).then(setPacks) }, [id])
  useEffect(load, [load])

  const add = useCallback(async (paths: string[]) => {
    setError(null)
    for (const p of paths) {
      try { await api.AddResourcePack(id, p) } catch (e) { setError(String((e as Error)?.message ?? e)) }
    }
    load(); refreshInstances()
  }, [id, load, refreshInstances])

  // Native file drops arrive from Go with real paths (browsers only give names).
  useEffect(() => on('files:dropped', (paths) => { setOver(false); add(paths) }), [add])

  const pick = async () => {
    setError(null)
    try { const e = await api.PickResourcePack(id); if (e.name) { load(); refreshInstances() } } catch (e) { setError(String((e as Error)?.message ?? e)) }
  }
  const remove = async (name: string) => { await api.RemoveResourcePack(id, name); load(); refreshInstances() }

  return (
    <>
      <div className={dropzone(over)} style={{ ['--wails-drop-target' as string]: 'drop' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
        <span>{fmt(t.instance.dropHere, { kind: t.instance.kinds.resourcepacks })}</span>
        <span className="text-[13px]">{t.common.or}</span>
        <button type="button" className={`${btnBase} ${btnPrimary} text-[13px] whitespace-nowrap`} onClick={pick}>{t.instance.browse}</button>
        <BrowseModrinth id={id} type="resourcepack" />
      </div>
      {error && <p className="mb-3 text-[13px] text-mc-danger">{error}</p>}
      {packs && packs.length === 0 && <Empty text={t.instance.empty.resourcepacks} />}
      {packs && packs.length > 0 && (
        <div className="flex flex-col gap-2">
          {packs.map((p) => (
            <div key={p.name} className={`${cardBase} flex-row items-center py-3 px-4`}>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</div>
                <div className={`${cardMeta} mt-0.5 text-xs`}>{bytes(p.sizeBytes)}</div>
              </div>
              <button type="button" className={`${btnBase} ${btnDanger} ${btnIcon}`} title={t.instance.remove} onClick={() => remove(p.name)}><X /></button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/** Mods and shader packs: a drop zone plus Browse, a list, Remove. The backend
 *  validates each file (a Fabric mod cannot land in a Forge instance). */
function FilesTab({ id, kind }: { id: string; kind: 'mods' | 'shaders' }) {
  const { t, refreshInstances } = useApp()
  const [files, setFiles] = useState<FileEntry[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const calls = kind === 'mods'
    ? { list: api.ListMods, add: api.AddMod, pick: api.PickMod, remove: api.RemoveMod, sub: 'mods' }
    : { list: api.ListShaders, add: api.AddShader, pick: api.PickShader, remove: api.RemoveShader, sub: 'shaderpacks' }
  const load = useCallback(() => { calls.list(id).then(setFiles) }, [id, kind]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load])

  const add = useCallback(async (paths: string[]) => {
    setError(null); setNote(null)
    for (const p of paths) {
      try { const e = await calls.add(id, p); setNote(fmt(t.instance.fileAdded, { name: e.name })) } catch (e) { setError(String((e as Error)?.message ?? e)) }
    }
    load(); refreshInstances()
  }, [id, kind, load, refreshInstances, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // Native file drops arrive from Go with real paths; only the mounted tab listens.
  useEffect(() => on('files:dropped', (paths) => { setOver(false); add(paths) }), [add])

  const pick = async () => {
    setError(null); setNote(null)
    try { const e = await calls.pick(id); if (e.name) { setNote(fmt(t.instance.fileAdded, { name: e.name })); load(); refreshInstances() } } catch (e) { setError(String((e as Error)?.message ?? e)) }
  }
  const remove = async (name: string) => {
    try { await calls.remove(id, name) } catch (e) { setError(String((e as Error)?.message ?? e)) }
    load(); refreshInstances()
  }

  return (
    <>
      <div className={dropzone(over)} style={{ ['--wails-drop-target' as string]: 'drop' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
        <span>{fmt(t.instance.dropHere, { kind: t.instance.kinds[kind] })}</span>
        <span className="text-[13px]">{t.common.or}</span>
        <button type="button" className={`${btnBase} ${btnPrimary} text-[13px] whitespace-nowrap`} onClick={pick}>{t.instance.browse}</button>
        <BrowseModrinth id={id} type={kind === 'mods' ? 'mod' : 'shader'} />
      </div>
      {error && <p className="mb-3 text-[13px] text-mc-danger">{error}</p>}
      <Toast text={note} />
      <FolderLink id={id} sub={calls.sub} />
      {files && files.length === 0 && <Empty text={t.instance.empty[kind]} />}
      {files && files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div key={f.name} className={`${cardBase} flex-row items-center py-3 px-4`}>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{f.name}</div>
                <div className={`${cardMeta} mt-0.5 text-xs`}>{bytes(f.sizeBytes)}</div>
              </div>
              <button type="button" className={`${btnBase} ${btnDanger} ${btnIcon}`} title={t.instance.remove} onClick={() => remove(f.name)}><X /></button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
