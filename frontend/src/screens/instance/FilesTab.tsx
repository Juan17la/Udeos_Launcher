import { X } from '../../ui/icons'
import Button from '../../ui/Button'
import AutoLoader from '../../ui/Loader'
import { useApp } from '../../state'
import { useFileList } from '../../hooks/useFileList'
import { FILE_KINDS, FileKind } from '../../utils/instanceContent'
import { bytes } from '../../utils/format'
import { AddZone, Feedback, FolderLink } from './TabParts'

/** Mods, shader packs and resource packs: a drop zone plus Browse / Add from
 *  Modrinth, the file list, Remove per row. */
export default function FilesTab({ id, kind }: { id: string; kind: FileKind }) {
  const { t } = useApp()
  const source = FILE_KINDS[kind]
  const { items, note, error, pick, remove, clearNote } = useFileList(id, source, t.instance.fileAdded)

  return (
    <div className="flex flex-col gap-4">
      <AddZone id={id} kind={t.instance.kinds[kind]} onPick={pick} modrinth={source.modrinth} />
      <Feedback error={error} note={note} onClearNote={clearNote} />
      <FolderLink id={id} sub={source.folder} />
      <AutoLoader active={items === null} label={t.common.loading} />
      {items?.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.instance.empty[kind]}</p>}
      {items?.map((f) => (
        <div key={f.name} className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="text-[15px] font-bold truncate">{f.name}</div>
            <div className="text-xs text-muted">{bytes(f.sizeBytes)}</div>
          </div>
          <Button variant="danger" size="sm" square title={t.instance.remove} onClick={() => remove(f)}><X /></Button>
        </div>
      ))}
    </div>
  )
}
