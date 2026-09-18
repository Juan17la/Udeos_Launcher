import { useEffect, useState } from 'react'
import { X } from '../../ui/icons'
import Button from '../../ui/Button'
import AutoLoader from '../../ui/Loader'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp, useContent } from '../../state'
import { api } from '../../api/bridge'
import { useFileList } from '../../hooks/useFileList'
import { FILE_KINDS, FileKind } from '../../utils/instanceContent'
import { bytes } from '../../utils/format'
import { AddZone, Feedback, FolderLink } from './TabParts'
import type { ContentEntry, FileEntry } from '../../api/types'

type View = 'card' | 'compact'
const VIEW_KEY = 'files:view'

/** Mods, shader packs and resource packs: a drop zone plus Browse / Add from
 *  Modrinth, the file list, Remove per row. Two views of the list: cards
 *  (default: icon, title, description and version from Modrinth) and
 *  compact rows (file name and size). Files added by hand have no Modrinth
 *  record, so their card is the file name alone. */
export default function FilesTab({ id, kind }: { id: string; kind: FileKind }) {
  const { t } = useApp()
  const { jobs } = useContent()
  const source = FILE_KINDS[kind]
  // A finished Addons install re-lists the tab (useFileList reloads when this changes).
  const finished = jobs.filter((j) => j.instanceId === id && j.status === 'done').length
  const { items, note, error, pick, remove, clearNote } = useFileList(id, source, t.instance.fileAdded, finished)
  const [view, setView] = useState<View>(() => { try { return localStorage.getItem(VIEW_KEY) === 'compact' ? 'compact' : 'card' } catch { return 'card' } })
  const [meta, setMeta] = useState<Map<string, ContentEntry>>(() => new Map())

  useEffect(() => {
    let live = true
    api.ListContent(id).then((entries) => { if (live) setMeta(new Map(entries.map((e) => [e.file, e]))) }).catch(() => {})
    return () => { live = false }
  }, [id, items])

  const pickView = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* private mode */ } }

  return (
    <div className="flex flex-col gap-4">
      <AddZone id={id} kind={t.instance.kinds[kind]} onPick={pick} modrinth={source.modrinth} />
      <Feedback error={error} note={note} onClearNote={clearNote} />
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl options={[{ value: 'card', label: t.instance.views.card }, { value: 'compact', label: t.instance.views.compact }]} value={view} onChange={pickView} />
        <FolderLink id={id} sub={source.folder} />
      </div>
      <AutoLoader active={items === null} label={t.common.loading} />
      {items?.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.instance.empty[kind]}</p>}
      {view === 'card' ? (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
          {items?.map((f) => <FileCard key={f.name} file={f} entry={meta.get(f.name)} onRemove={() => remove(f)} />)}
        </div>
      ) : items?.map((f) => <FileRow key={f.name} file={f} entry={meta.get(f.name)} onRemove={() => remove(f)} />)}
    </div>
  )
}

type ItemProps = { file: FileEntry; entry?: ContentEntry; onRemove: () => void }

/** Compact: one line per file. */
function FileRow({ file, entry, onRemove }: ItemProps) {
  const { t } = useApp()
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="text-[15px] font-bold truncate">{entry?.title ?? file.name}</div>
        <div className="text-xs text-muted truncate">{entry ? `${entry.versionNumber} · ${file.name}` : bytes(file.sizeBytes)}</div>
      </div>
      <Button variant="danger" size="sm" square title={t.instance.remove} onClick={onRemove}><X /></Button>
    </div>
  )
}

/** Card: the Modrinth icon, title, description and version — the same face
 *  the Addons result had — or the bare file for hand-added ones. */
function FileCard({ file, entry, onRemove }: ItemProps) {
  const { t } = useApp()
  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        {entry?.iconUrl
          ? <img src={entry.iconUrl} alt="" loading="lazy" decoding="async" width={44} height={44} className="rounded-md object-cover shrink-0" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
          : <div className="w-11 h-11 rounded-md bg-idle shrink-0" aria-hidden />}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="font-bold text-base leading-[1.2] truncate" title={file.name}>{entry?.title ?? file.name}</div>
          <div className="text-xs text-muted truncate">{entry ? entry.versionNumber : t.instance.addedByHand}</div>
        </div>
      </div>
      {entry?.description && <p className="m-0 text-[13px] text-muted line-clamp-2">{entry.description}</p>}
      <div className="flex items-center gap-2 mt-auto">
        <span className="tag bg-tag-gray">{bytes(file.sizeBytes)}</span>
        <Button variant="danger" size="sm" square className="ml-auto" title={t.instance.remove} onClick={onRemove}><X /></Button>
      </div>
    </div>
  )
}
