import { useCallback, useEffect, useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { Camera, Folder, Play, Search as SearchIcon, X } from '../ui/icons'
import Button from '../ui/atoms/Button'
import Tag from '../ui/atoms/Tag'
import { Panel } from '../ui/atoms/Surface'
import StatusMessage from '../ui/atoms/Status'
import { AutoLoader } from '../ui/atoms/Loader'
import Card from '../ui/molecules/Card'
import Dialog from '../ui/molecules/Dialog'
import DropZone from '../ui/molecules/DropZone'
import SegmentedControl from '../ui/molecules/SegmentedControl'
import { errorHeadline, messageOf } from '../lib/errors'
import { useApp, useLaunch } from '../state'
import { api, on } from '../api/bridge'
import type { FileEntry, ProjectType, World } from '../api/types'
import { fmt } from '../i18n/format'
import { ago, bytes } from '../ui/time'
import ConfirmDialog from '../components/ConfirmDialog'

type Tab = 'mods' | 'resourcepacks' | 'shaders' | 'worlds' | 'screenshots'

export default function InstancePage({ id }: { id: string }) {
  const { t, instances, refreshInstances, go } = useApp()
  const { play, launch } = useLaunch()
  const inst = instances.find((i) => i.id === id)
  const vanilla = !inst || inst.loader === 'Vanilla'
  const tabs: Tab[] = vanilla ? ['resourcepacks', 'worlds', 'screenshots'] : ['mods', 'resourcepacks', 'shaders', 'worlds', 'screenshots']
  const [tab, setTab] = useState<Tab>(tabs[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const busy = launch.status === 'preparing'
  const preparing = launch.status === 'preparing' && launch.instanceId === id

  useEffect(() => { if (!inst) go({ name: 'dashboard' }) }, [inst, go])
  if (!inst) return null

  const remove = async () => {
    await api.DeleteInstance(inst.id)
    await refreshInstances()
    go({ name: 'dashboard' })
  }

  return (
    <main className="flex-1 grid items-start gap-8 pt-8 px-10 pb-12" style={{ gridTemplateColumns: '290px minmax(0,1fr)' }}>
      <Panel className="items-center text-center sticky top-6 p-6">
        <PixelIcon name={inst.icon} size={96} />
        <div className="max-w-full flex flex-col gap-3">
          <h3 className="m-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{inst.name}</h3>
          <div className="flex gap-2 justify-center">
            <Tag tone="green">{inst.version}</Tag>
            <Tag tone="gold">{inst.loaderLabel}</Tag>
          </div>
        </div>
        <p className="m-0 text-xs text-muted">{inst.installed ? t.instance.installed : t.instance.notInstalled}</p>
        <Button variant="primary" size="lg" block loading={preparing} disabled={busy || inst.running} onClick={() => play(inst.id)}>
          <Play size={16} /> {inst.running ? t.common.running : t.common.play}
        </Button>
        <Button variant="idle" block onClick={() => api.OpenInstanceFolder(inst.id, '')}>
          <Folder /> {t.instance.openFolder}
        </Button>
        <Button variant="danger" block disabled={inst.running} onClick={() => setConfirmDelete(true)}>{t.instance.deleteInstance}</Button>
      </Panel>

      <div className="min-w-0 flex flex-col gap-6">
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.instance.tabs[k] }))} value={tab} onChange={setTab} />
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
  return <div className="text-muted text-center px-5 py-10"><p className="m-0 text-sm">{text}</p></div>
}

/** Success note under a tab's drop zone; clears itself. */
function Note({ text, onClear }: { text: string | null; onClear: () => void }) {
  useEffect(() => {
    if (!text) return
    const id = setTimeout(onClear, 3000)
    return () => clearTimeout(id)
  }, [text, onClear])
  if (!text) return null
  return <StatusMessage kind="success" headline={text} onDismiss={onClear} />
}

function Failure({ message }: { message: string | null }) {
  const { t } = useApp()
  if (!message) return null
  return <StatusMessage kind="error" headline={errorHeadline(message, t.errors)} detail={message} />
}

/** Small right-aligned "Open folder" link shown above a tab's content. */
function FolderLink({ id, sub }: { id: string; sub: string }) {
  const { t } = useApp()
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={() => api.OpenInstanceFolder(id, sub)}><Folder size={12} /> {t.instance.openFolder}</Button>
    </div>
  )
}

/** Opens the Search page locked to this instance on the matching content tab. */
function BrowseModrinth({ id, type }: { id: string; type: ProjectType }) {
  const { t, go } = useApp()
  return (
    <Button variant="secondary" size="sm" onClick={() => go({ name: 'search', instanceId: id, type })}>
      <SearchIcon size={13} /> {t.instance.browseModrinth}
    </Button>
  )
}

function WorldsTab({ id }: { id: string }) {
  const { t, refreshInstances } = useApp()
  const { launch } = useLaunch()
  const [worlds, setWorlds] = useState<World[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<World | null>(null)
  const load = useCallback(() => { api.ListWorlds(id).then(setWorlds) }, [id])
  useEffect(load, [load, launch.status])
  const clearNote = useCallback(() => setNote(null), [])

  const add = useCallback(async (paths: string[]) => {
    setError(null); setNote(null)
    for (const p of paths) {
      try { const w = await api.AddWorld(id, p); setNote(fmt(t.instance.worldAdded, { name: w.name })) } catch (e) { setError(messageOf(e)) }
    }
    load(); refreshInstances()
  }, [id, load, refreshInstances, t])

  // Native file drops arrive from Go with real paths; only the mounted tab listens.
  useEffect(() => on('files:dropped', add), [add])

  const pick = async () => {
    setError(null); setNote(null)
    try { const w = await api.PickWorld(id); if (w.folder) { setNote(fmt(t.instance.worldAdded, { name: w.name })); load(); refreshInstances() } } catch (e) { setError(messageOf(e)) }
  }
  const save = async (w: World) => {
    const path = await api.ExportWorld(id, w.folder)
    if (path) setNote(fmt(t.instance.savedTo, { path }))
  }
  const remove = async () => {
    if (!toDelete) return
    try { await api.RemoveWorld(id, toDelete.folder) } catch (e) { setError(messageOf(e)) }
    setToDelete(null); load(); refreshInstances()
  }

  return (
    <div className="flex flex-col gap-4">
      <DropZone text={fmt(t.instance.dropHere, { kind: t.instance.kinds.worlds })}>
        <span className="text-[13px]">{t.common.or}</span>
        <Button variant="primary" size="sm" onClick={pick}>{t.instance.browse}</Button>
      </DropZone>
      <Failure message={error} />
      <Note text={note} onClear={clearNote} />
      <FolderLink id={id} sub="saves" />
      <AutoLoader active={worlds === null} label={t.common.loading} />
      {worlds && worlds.length === 0 && <Empty text={t.instance.empty.worlds} />}
      {worlds && worlds.length > 0 && (
        <div className="flex flex-col gap-4">
          {worlds.map((w) => (
            <Card key={w.folder} row className="gap-4">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[15px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{w.name}</div>
                <div className="text-xs text-muted">{fmt(t.instance.worldMeta, { when: ago(w.lastPlayed, t), size: bytes(w.sizeBytes) })}</div>
              </div>
              <Button variant="idle" size="sm" onClick={() => save(w)}><Folder /> {t.instance.saveToDevice}</Button>
              <Button variant="danger" size="sm" square title={t.instance.removeWorld} onClick={() => setToDelete(w)}><X /></Button>
            </Card>
          ))}
        </div>
      )}
      {toDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteWorldTitle} body={fmt(t.instance.confirmDeleteWorld, { name: toDelete.name })} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setToDelete(null)} />
      )}
    </div>
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
  const clearNote = useCallback(() => setNote(null), [])

  const src = (s: FileEntry) => `/media/${encodeURIComponent(id)}/screenshots/${encodeURIComponent(s.name)}`
  const save = async (s: FileEntry) => {
    const path = await api.ExportScreenshot(id, s.name)
    if (path) setNote(fmt(t.instance.savedTo, { path }))
  }
  return (
    <div className="flex flex-col gap-4">
      <Note text={note} onClear={clearNote} />
      <FolderLink id={id} sub="screenshots" />
      <AutoLoader active={shots === null} label={t.common.loading} />
      {shots && shots.length === 0 && <Empty text={t.instance.empty.screenshots} />}
      {shots && shots.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
          {shots.map((s) => (
            <div key={s.name} className="flex flex-col gap-4">
              <button
                type="button" title={`${t.instance.view}: ${s.name}`} onClick={() => setOpen(s)}
                className="relative aspect-[16/10] rounded-md bg-panel shadow-neu flex items-center justify-center overflow-hidden p-0 border-0 cursor-zoom-in transition-all duration-150 ease-in-out hover:-translate-y-0.5"
              >
                {failed.has(s.name) ? (
                  <span className="text-muted"><Camera /></span>
                ) : (
                  <img src={src(s)} alt={s.name} loading="lazy" className="w-full h-full object-cover"
                    onError={() => setFailed((f) => new Set(f).add(s.name))} />
                )}
              </button>
              <Button variant="idle" size="sm" onClick={() => save(s)}>{t.instance.saveToDevice}</Button>
            </div>
          ))}
        </div>
      )}
      {open && (
        <Dialog title={open.name} width={960} onClose={() => setOpen(null)} actions={<>
          <Button variant="idle" onClick={() => save(open)}><Folder /> {t.instance.saveToDevice}</Button>
          <Button variant="primary" onClick={() => setOpen(null)}>{t.common.close}</Button>
        </>}>
          <img src={src(open)} alt={open.name} className="block w-full max-h-[70vh] object-contain rounded-md bg-panel" />
          <p className="mt-4 mb-0 text-xs text-muted">{bytes(open.sizeBytes)} · {ago(open.modTime, t)}</p>
        </Dialog>
      )}
    </div>
  )
}

function ResourcePacksTab({ id }: { id: string }) {
  const { t, refreshInstances } = useApp()
  const [packs, setPacks] = useState<FileEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => { api.ListResourcePacks(id).then(setPacks) }, [id])
  useEffect(load, [load])

  const add = useCallback(async (paths: string[]) => {
    setError(null)
    for (const p of paths) {
      try { await api.AddResourcePack(id, p) } catch (e) { setError(messageOf(e)) }
    }
    load(); refreshInstances()
  }, [id, load, refreshInstances])

  // Native file drops arrive from Go with real paths (browsers only give names).
  useEffect(() => on('files:dropped', add), [add])

  const pick = async () => {
    setError(null)
    try { const e = await api.PickResourcePack(id); if (e.name) { load(); refreshInstances() } } catch (e) { setError(messageOf(e)) }
  }
  const remove = async (name: string) => { await api.RemoveResourcePack(id, name); load(); refreshInstances() }

  return (
    <div className="flex flex-col gap-4">
      <DropZone text={fmt(t.instance.dropHere, { kind: t.instance.kinds.resourcepacks })}>
        <span className="text-[13px]">{t.common.or}</span>
        <Button variant="primary" size="sm" onClick={pick}>{t.instance.browse}</Button>
        <BrowseModrinth id={id} type="resourcepack" />
      </DropZone>
      <Failure message={error} />
      <AutoLoader active={packs === null} label={t.common.loading} />
      {packs && packs.length === 0 && <Empty text={t.instance.empty.resourcepacks} />}
      {packs && packs.length > 0 && (
        <div className="flex flex-col gap-4">
          {packs.map((p) => (
            <Card key={p.name} row className="gap-4">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[15px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</div>
                <div className="text-xs text-muted">{bytes(p.sizeBytes)}</div>
              </div>
              <Button variant="danger" size="sm" square title={t.instance.remove} onClick={() => remove(p.name)}><X /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/** Mods and shader packs: a drop zone plus Browse, a list, Remove. The backend
 *  validates each file (a Fabric mod cannot land in a Forge instance). */
function FilesTab({ id, kind }: { id: string; kind: 'mods' | 'shaders' }) {
  const { t, refreshInstances } = useApp()
  const [files, setFiles] = useState<FileEntry[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const calls = kind === 'mods'
    ? { list: api.ListMods, add: api.AddMod, pick: api.PickMod, remove: api.RemoveMod, sub: 'mods' }
    : { list: api.ListShaders, add: api.AddShader, pick: api.PickShader, remove: api.RemoveShader, sub: 'shaderpacks' }
  const load = useCallback(() => { calls.list(id).then(setFiles) }, [id, kind]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load])
  const clearNote = useCallback(() => setNote(null), [])

  const add = useCallback(async (paths: string[]) => {
    setError(null); setNote(null)
    for (const p of paths) {
      try { const e = await calls.add(id, p); setNote(fmt(t.instance.fileAdded, { name: e.name })) } catch (e) { setError(messageOf(e)) }
    }
    load(); refreshInstances()
  }, [id, kind, load, refreshInstances, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // Native file drops arrive from Go with real paths; only the mounted tab listens.
  useEffect(() => on('files:dropped', add), [add])

  const pick = async () => {
    setError(null); setNote(null)
    try { const e = await calls.pick(id); if (e.name) { setNote(fmt(t.instance.fileAdded, { name: e.name })); load(); refreshInstances() } } catch (e) { setError(messageOf(e)) }
  }
  const remove = async (name: string) => {
    try { await calls.remove(id, name) } catch (e) { setError(messageOf(e)) }
    load(); refreshInstances()
  }

  return (
    <div className="flex flex-col gap-4">
      <DropZone text={fmt(t.instance.dropHere, { kind: t.instance.kinds[kind] })}>
        <span className="text-[13px]">{t.common.or}</span>
        <Button variant="primary" size="sm" onClick={pick}>{t.instance.browse}</Button>
        <BrowseModrinth id={id} type={kind === 'mods' ? 'mod' : 'shader'} />
      </DropZone>
      <Failure message={error} />
      <Note text={note} onClear={clearNote} />
      <FolderLink id={id} sub={calls.sub} />
      <AutoLoader active={files === null} label={t.common.loading} />
      {files && files.length === 0 && <Empty text={t.instance.empty[kind]} />}
      {files && files.length > 0 && (
        <div className="flex flex-col gap-4">
          {files.map((f) => (
            <Card key={f.name} row className="gap-4">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[15px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{f.name}</div>
                <div className="text-xs text-muted">{bytes(f.sizeBytes)}</div>
              </div>
              <Button variant="danger" size="sm" square title={t.instance.remove} onClick={() => remove(f.name)}><X /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
