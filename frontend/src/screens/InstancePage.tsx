import { useCallback, useEffect, useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { Camera, Folder, Play, X } from '../ui/icons'
import { useApp, useLaunch } from '../state'
import { api, on } from '../api/bridge'
import type { FileEntry, World } from '../api/types'
import { fmt } from '../i18n/format'
import { ago, bytes } from '../ui/time'
import ConfirmDialog from '../components/ConfirmDialog'
import Dialog from '../components/Dialog'

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

  useEffect(() => { if (!inst) go({ name: 'dashboard' }) }, [inst, go])
  if (!inst) return null

  const remove = async () => {
    await api.DeleteInstance(inst.id)
    await refreshInstances()
    go({ name: 'dashboard' })
  }

  return (
    <main className="page" style={{ display: 'grid', gridTemplateColumns: '290px minmax(0,1fr)', gap: 28, alignItems: 'start' }}>
      <div className="card elev-sm panel static" style={{ padding: 26, gap: 16, alignItems: 'center', textAlign: 'center', position: 'sticky', top: 24 }}>
        <PixelIcon name={inst.icon} size={96} />
        <div style={{ maxWidth: '100%' }}>
          <h3 style={{ marginBottom: 8, fontSize: 26, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{inst.name}</h3>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <span className="tag tag-accent">{inst.version}</span>
            <span className="tag tag-accent-2">{inst.loaderLabel}</span>
          </div>
        </div>
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{inst.installed ? t.instance.installed : t.instance.notInstalled}</p>
        <button type="button" className="btn btn-primary btn-block" style={{ height: 48, fontSize: 18 }} disabled={busy || inst.running} onClick={() => play(inst.id)}>
          <Play size={16} /> {inst.running ? t.common.running : t.common.play}
        </button>
        <button type="button" className="btn btn-secondary btn-block" style={{ fontSize: 13 }} onClick={() => api.OpenInstanceFolder(inst.id, '')}>
          <Folder /> {t.instance.openFolder}
        </button>
        <button type="button" className="btn btn-danger btn-block" style={{ fontSize: 13, whiteSpace: 'nowrap' }} disabled={inst.running} onClick={() => setConfirmDelete(true)}>{t.instance.deleteInstance}</button>
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="seg" style={{ marginBottom: 20 }}>
          {tabs.map((k) => (
            <button key={k} type="button" className={`seg-opt ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{t.instance.tabs[k]}</button>
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
  return <div className="empty-state"><p>{text}</p></div>
}

function Toast({ text }: { text: string | null }) {
  if (!text) return null
  return <p className="text-muted" style={{ fontSize: 12, margin: '0 0 12px', wordBreak: 'break-all' }}>{text}</p>
}

/** Small right-aligned "Open folder" link shown above a tab's content. */
function FolderLink({ id, sub }: { id: string; sub: string }) {
  const { t } = useApp()
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => api.OpenInstanceFolder(id, sub)}><Folder size={12} /> {t.instance.openFolder}</button>
    </div>
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
      <div className={`dropzone ${over ? 'is-over' : ''}`} style={{ ['--wails-drop-target' as string]: 'drop' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
        <span>{fmt(t.instance.dropHere, { kind: t.instance.kinds.worlds })}</span>
        <span className="text-muted" style={{ fontSize: 13 }}>{t.common.or}</span>
        <button type="button" className="btn btn-primary" style={{ fontSize: 13, whiteSpace: 'nowrap' }} onClick={pick}>{t.instance.browse}</button>
      </div>
      {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--mc-danger)' }}>{error}</p>}
      <Toast text={note} />
      <FolderLink id={id} sub="saves" />
      {worlds && worlds.length === 0 && <Empty text={t.instance.empty.worlds} />}
      {worlds && worlds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {worlds.map((w) => (
            <div key={w.folder} className="card row-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title">{w.name}</div>
                <div className="card-meta" style={{ marginTop: 2, fontSize: 12 }}>{fmt(t.instance.worldMeta, { when: ago(w.lastPlayed, t), size: bytes(w.sizeBytes) })}</div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => save(w)}><Folder /> {t.instance.saveToDevice}</button>
              <button type="button" className="btn btn-icon btn-danger" title={t.instance.removeWorld} onClick={() => setToDelete(w)}><X /></button>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        {shots.map((s) => (
          <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" className="shot" title={`${t.instance.view}: ${s.name}`} onClick={() => setOpen(s)}
              style={{ aspectRatio: '16/10', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', padding: 0, border: 0, cursor: 'zoom-in' }}>
              <img src={src(s)} alt={s.name} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { const el = e.currentTarget; el.style.display = 'none'; el.parentElement!.classList.add('no-img') }} />
              <span className="fallback-icon" style={{ position: 'absolute', color: 'var(--color-neutral-500)' }}><Camera /></span>
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => save(s)}>{t.instance.saveToDevice}</button>
          </div>
        ))}
      </div>
      {open && (
        <Dialog title={open.name} width={960} onClose={() => setOpen(null)} actions={<>
          <button type="button" className="btn btn-secondary" onClick={() => save(open)}><Folder /> {t.instance.saveToDevice}</button>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(null)}>{t.common.close}</button>
        </>}>
          <img src={src(open)} alt={open.name} style={{ display: 'block', width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }} />
          <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 12 }}>{bytes(open.sizeBytes)} · {ago(open.modTime, t)}</p>
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
      <div className={`dropzone ${over ? 'is-over' : ''}`} style={{ ['--wails-drop-target' as string]: 'drop' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
        <span>{fmt(t.instance.dropHere, { kind: t.instance.kinds.resourcepacks })}</span>
        <span className="text-muted" style={{ fontSize: 13 }}>{t.common.or}</span>
        <button type="button" className="btn btn-primary" style={{ fontSize: 13, whiteSpace: 'nowrap' }} onClick={pick}>{t.instance.browse}</button>
      </div>
      {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--mc-danger)' }}>{error}</p>}
      {packs && packs.length === 0 && <Empty text={t.instance.empty.resourcepacks} />}
      {packs && packs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {packs.map((p) => (
            <div key={p.name} className="card row-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title">{p.name}</div>
                <div className="card-meta" style={{ marginTop: 2, fontSize: 12 }}>{bytes(p.sizeBytes)}</div>
              </div>
              <button type="button" className="btn btn-icon btn-danger" title={t.instance.remove} onClick={() => remove(p.name)}><X /></button>
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
      <div className={`dropzone ${over ? 'is-over' : ''}`} style={{ ['--wails-drop-target' as string]: 'drop' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
        <span>{fmt(t.instance.dropHere, { kind: t.instance.kinds[kind] })}</span>
        <span className="text-muted" style={{ fontSize: 13 }}>{t.common.or}</span>
        <button type="button" className="btn btn-primary" style={{ fontSize: 13, whiteSpace: 'nowrap' }} onClick={pick}>{t.instance.browse}</button>
      </div>
      {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--mc-danger)' }}>{error}</p>}
      <Toast text={note} />
      <FolderLink id={id} sub={calls.sub} />
      {files && files.length === 0 && <Empty text={t.instance.empty[kind]} />}
      {files && files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f) => (
            <div key={f.name} className="card row-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title">{f.name}</div>
                <div className="card-meta" style={{ marginTop: 2, fontSize: 12 }}>{bytes(f.sizeBytes)}</div>
              </div>
              <button type="button" className="btn btn-icon btn-danger" title={t.instance.remove} onClick={() => remove(f.name)}><X /></button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
