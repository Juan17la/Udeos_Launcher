import { useEffect, useMemo, useState } from 'react'
import Empty from '../../ui/Empty'
import { List, Search as SearchIcon, Tiles, X } from '../../ui/icons'
import CardLink from '../../ui/CardLink'
import { Input } from '../../ui/Field'
import Button from '../../ui/Button'
import { SkeletonRows } from '../../ui/Loader'
import SegmentedControl from '../../ui/SegmentedControl'
import ProjectIcon from '../../components/ProjectIcon'
import { useApp, useContent } from '../../state'
import { api } from '../../api/bridge'
import { useFileList } from '../../hooks/useFileList'
import { FILE_KINDS, FileKind, datapackSource } from '../../utils/instanceContent'
import { bytes } from '../../utils/format'
import { fmt } from '../../i18n/format'
import StatusMessage from '../../ui/StatusMessage'
import { AddMenu, DropArea, Feedback, FolderLink, Toolbar } from './TabParts'
import type { ContentEntry, FileEntry } from '../../api/types'

type View = 'card' | 'compact'
const VIEW_KEY = 'files:view'

/** Mods, shader packs and resource packs: one toolbar (Add, a menu of Addons or
 *  this device, and Ask AI; dropping a file anywhere on the tab works), the file list, Remove per row. Two views of the list: cards
 *  (default: icon, title, description and version from Modrinth) and
 *  compact rows (file name and size). Files added by hand have no Modrinth
 *  record, so their card is the file name alone. */
/** The item an empty tab shows, one per kind of content. */
const EMPTY_ICON: Record<FileKind, string> = { mods: 'enchanted_book', resourcepacks: 'amethyst_shard', shaders: 'glowstone', datapacks: 'book' }

export default function FilesTab({ id, kind, world = '' }: { id: string; kind: FileKind; /** datapacks: the world (saves/ folder; '' on a server) */ world?: string }) {
  const { t, go } = useApp()
  const { jobs } = useContent()
  // A Modrinth card opens its Details page (Add there stays locked to this instance).
  const details = (e: ContentEntry) => go({ name: 'detail', instanceId: id, result: { id: e.projectId, slug: '', title: e.title, author: '', description: e.description ?? '', iconUrl: e.iconUrl ?? '', downloads: 0, projectType: e.type, loaders: [] } })
  const source = useMemo(() => (kind === 'datapacks' ? datapackSource(world) : FILE_KINDS[kind]), [kind, world])
  // A finished Addons install re-lists the tab (useFileList reloads when this changes).
  const finished = jobs.filter((j) => j.instanceId === id && j.status === 'done').length
  const { items, note, error, pick, removeSoon, pending, undo, clearNote } = useFileList(id, source, t.instance.fileAdded, finished)
  // The player's choice wins; until they pick, a long list (a modpack's worth) starts as rows.
  const [chosen, setChosen] = useState<View | null>(() => { try { const v = localStorage.getItem(VIEW_KEY); return v === 'compact' || v === 'card' ? v : null } catch { return null } })
  const view: View = chosen ?? ((items?.length ?? 0) > 10 ? 'compact' : 'card')
  const [query, setQuery] = useState('')
  const [meta, setMeta] = useState<Map<string, ContentEntry>>(() => new Map())

  useEffect(() => {
    let live = true
    api.ListContent(id).then((entries) => { if (live) setMeta(new Map(entries.filter((e) => kind !== 'datapacks' || (e.type === 'datapack' && (!world || e.world === `saves/${world}`))).map((e) => [e.file, e]))) }).catch(() => {})
    return () => { live = false }
  }, [id, items, kind, world])

  const pickView = (v: View) => { setChosen(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* private mode */ } }
  const q = query.trim().toLowerCase()
  const shown = q ? items?.filter((f) => `${meta.get(f.name)?.title ?? ''} ${f.name}`.toLowerCase().includes(q)) : items

  return (
    <DropArea className="flex flex-col gap-4">
      <Toolbar id={id} kind={kind} onPick={pick} modrinth={source.modrinth}>
        {(items?.length ?? 0) > 6 && (
          <Input className="w-44!" icon={<SearchIcon />} type="search" placeholder={t.instance.filter} aria-label={t.instance.filter} value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        <SegmentedControl options={[{ value: 'card', label: <Tiles size={15} />, title: t.instance.views.card }, { value: 'compact', label: <List size={15} />, title: t.instance.views.compact }]} value={view} onChange={pickView} />
        <FolderLink id={id} sub={source.folder} compact />
      </Toolbar>
      <Feedback error={error} note={note} onClearNote={clearNote} />
      {pending && (
        <StatusMessage headline={<span className="flex items-center justify-between gap-3">{fmt(t.instance.removed, { name: meta.get(pending.name)?.title ?? pending.name })}
          <Button variant="secondary" size="sm" onClick={undo}>{t.instance.undo}</Button></span>} />
      )}
      <SkeletonRows active={items === null} />
      {items?.length === 0 && (
        <Empty icon={EMPTY_ICON[kind]} action={<AddMenu id={id} kind={kind} onPick={pick} modrinth={source.modrinth} />}>
          {t.instance.empty[kind]}
        </Empty>
      )}
      {q && shown?.length === 0 && <p className="m-0 text-sm text-muted">{t.instance.noMatch}</p>}
      {view === 'card' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
          {shown?.map((f) => { const e = meta.get(f.name); return <FileCard key={f.name} file={f} entry={e} onRemove={() => removeSoon(f)} onOpen={e && (() => details(e))} /> })}
        </div>
      ) : shown?.map((f) => <FileRow key={f.name} file={f} entry={meta.get(f.name)} onRemove={() => removeSoon(f)} />)}
    </DropArea>
  )
}

/** Remove shows on hover or keyboard focus, so a long list is not a column of red (undo backs up a slip). */
const REVEAL = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity duration-150'

type ItemProps = { file: FileEntry; entry?: ContentEntry; onRemove: () => void; onOpen?: () => void }

/** Compact: one line per file. */
function FileRow({ file, entry, onRemove }: ItemProps) {
  const { t } = useApp()
  return (
    <div className="group flex items-center gap-4 px-4 py-2.5 rounded-md bg-panel-2 shadow-neu">
      <ProjectIcon url={entry?.iconUrl} size={28} />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="text-[15px] font-bold truncate">{entry?.title ?? file.name}</div>
        <div className="text-xs text-muted truncate">{entry ? `${entry.versionNumber} · ${file.name}` : bytes(file.sizeBytes)}</div>
      </div>
      <Button variant="danger" size="sm" square className={REVEAL} title={t.instance.remove} aria-label={`${t.instance.remove} ${entry?.title ?? file.name}`} onClick={onRemove}><X /></Button>
    </div>
  )
}

/** Card: the Modrinth icon, title, description and version (the same face
 *  the Addons result had), or the bare file for hand-added ones. */
function FileCard({ file, entry, onRemove, onOpen }: ItemProps) {
  const { t } = useApp()
  return (
    <div className={`group panel relative flex flex-col gap-4 p-5 ${onOpen ? 'panel-hover' : ''}`}>
      {onOpen && <CardLink label={`${entry?.title ?? file.name}, ${t.search.details}`} onClick={onOpen} />}
      <div className="relative flex items-center gap-4 pointer-events-none">
        <ProjectIcon url={entry?.iconUrl} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="font-bold text-base leading-[1.2] truncate" title={file.name}>{entry?.title ?? file.name}</div>
          <div className="text-xs text-muted truncate">{entry ? entry.versionNumber : t.instance.addedByHand}</div>
        </div>
      </div>
      {entry?.description && <p className="relative m-0 text-[13px] text-muted line-clamp-2 pointer-events-none">{entry.description}</p>}
      <div className="relative flex items-center gap-2 mt-auto">
        <span className="tag bg-tag-gray">{bytes(file.sizeBytes)}</span>
        <Button variant="danger" size="sm" square className={`ml-auto ${REVEAL}`} title={t.instance.remove} aria-label={`${t.instance.remove} ${entry?.title ?? file.name}`} onClick={onRemove}><X /></Button>
      </div>
    </div>
  )
}
