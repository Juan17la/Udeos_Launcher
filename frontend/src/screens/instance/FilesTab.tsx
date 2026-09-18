import { X } from '../../ui/icons'
import Button from '../../ui/Button'
import ListRow from '../../ui/ListRow'
import Empty from '../../ui/Empty'
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
      {items?.length === 0 && <Empty text={t.instance.empty[kind]} />}
      {items?.map((f) => (
        <ListRow key={f.name} title={f.name} meta={bytes(f.sizeBytes)}>
          <Button variant="danger" size="sm" square title={t.instance.remove} onClick={() => remove(f)}><X /></Button>
        </ListRow>
      ))}
    </div>
  )
}
