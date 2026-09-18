import { useEffect } from 'react'
import { Folder, Search as SearchIcon } from '../../ui/icons'
import Button from '../../ui/Button'
import DropZone from '../../ui/DropZone'
import StatusMessage from '../../ui/StatusMessage'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { errorHeadline } from '../../utils/errors'
import type { ProjectType } from '../../api/types'

/** The pieces every file tab is built from, so the tabs read as a list. */

/** Drop target plus Browse and, for kinds Modrinth carries, "Search in Addons"
 *  (opens Search locked to this instance on the matching content tab).
 *  Worlds have no Modrinth counterpart, so their tab gets no such button. */
export function AddZone({ id, kind, onPick, modrinth }: { id: string; kind: string; onPick: () => void; modrinth?: ProjectType }) {
  const { t, go } = useApp()
  return (
    <>
      {modrinth && (
        <Button variant="primary" size="lg" onClick={() => go({ name: 'search', instanceId: id, type: modrinth })}>
          <SearchIcon size={13} /> {t.instance.browseModrinth}
        </Button>
      )}
      <DropZone text={fmt(t.instance.dropHere, { kind })}>
        <span className="text-[13px]">{t.common.or}</span>
        <Button variant="ghost" className='w-fit' onClick={onPick}>{t.instance.browse}</Button>
      </DropZone>
    </>
  )
}

/** Error under the drop zone (short headline, the backend's reason as detail)
 *  and the success note, which clears itself after three seconds. */
export function Feedback({ error, note, onClearNote }: { error: string | null; note: string | null; onClearNote: () => void }) {
  const { t } = useApp()
  useEffect(() => {
    if (!note) return
    const id = setTimeout(onClearNote, 3000)
    return () => clearTimeout(id)
  }, [note, onClearNote])
  return (
    <>
      {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} />}
      {note && <StatusMessage kind="success" headline={note} onDismiss={onClearNote} />}
    </>
  )
}

/** Small right-aligned "Open folder" link above a tab's content. */
export function FolderLink({ id, sub }: { id: string; sub: string }) {
  const { t } = useApp()
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={() => api.OpenInstanceFolder(id, sub)}><Folder size={12} /> {t.instance.openFolder}</Button>
    </div>
  )
}
