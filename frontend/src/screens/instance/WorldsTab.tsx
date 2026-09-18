import { useState } from 'react'
import { Folder, X } from '../../ui/icons'
import Button from '../../ui/Button'
import AutoLoader from '../../ui/Loader'
import { ConfirmDialog } from '../../ui/Dialog'
import { useApp, useLaunch } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { useFileList } from '../../hooks/useFileList'
import { WORLDS } from '../../utils/instanceContent'
import { ago, bytes } from '../../utils/format'
import { AddZone, Feedback, FolderLink } from './TabParts'
import type { World } from '../../api/types'

/** Like the file tabs, plus Save to Device and a confirmation before a
 *  world is deleted. Re-lists when the game closes (new worlds, play time). */
export default function WorldsTab({ id }: { id: string }) {
  const { t, language } = useApp()
  const { launch } = useLaunch()
  const { items, note, error, pick, remove, setNote, clearNote } = useFileList(id, WORLDS, t.instance.worldAdded, launch.status)
  const [toDelete, setToDelete] = useState<World | null>(null)

  const save = async (w: World) => {
    const path = await api.ExportWorld(id, w.folder)
    if (path) setNote(fmt(t.instance.savedTo, { path }))
  }
  const confirmRemove = () => {
    if (toDelete) remove(toDelete)
    setToDelete(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <AddZone id={id} kind={t.instance.kinds.worlds} onPick={pick} />
      <Feedback error={error} note={note} onClearNote={clearNote} />
      <FolderLink id={id} sub={WORLDS.folder} />
      <AutoLoader active={items === null} label={t.common.loading} />
      {items?.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.instance.empty.worlds}</p>}
      {items?.map((w) => (
        <div key={w.folder} className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="text-[15px] font-bold truncate">{w.name}</div>
            <div className="text-xs text-muted">{fmt(t.instance.worldMeta, { when: ago(w.lastPlayed, language), size: bytes(w.sizeBytes) })}</div>
          </div>
          <Button variant="idle" size="sm" onClick={() => save(w)}><Folder /> {t.instance.saveToDevice}</Button>
          <Button variant="danger" size="sm" square title={t.instance.removeWorld} onClick={() => setToDelete(w)}><X /></Button>
        </div>
      ))}
      {toDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteWorldTitle} body={fmt(t.instance.confirmDeleteWorld, { name: toDelete.name })} confirmLabel={t.common.delete}
          onConfirm={confirmRemove} onClose={() => setToDelete(null)} />
      )}
    </div>
  )
}
