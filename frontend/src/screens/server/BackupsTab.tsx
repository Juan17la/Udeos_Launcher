import { useCallback, useEffect, useState } from 'react'
import { X } from '../../ui/icons'
import Button from '../../ui/Button'
import { ConfirmDialog } from '../../ui/Dialog'
import AutoLoader from '../../ui/Loader'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { bytes } from '../../utils/format'
import { messageOf } from '../../utils/errors'
import { Feedback, FolderLink } from '../instance/TabParts'
import type { FileEntry, Server } from '../../api/types'

/** World backups: make one now (a running server pauses saving while it is
 *  copied), restore one (stopped servers only; the current world is backed
 *  up first) or delete one. */
export default function BackupsTab({ server }: { server: Server }) {
  const { t, language } = useApp()
  const [items, setItems] = useState<FileEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<FileEntry | null>(null)
  const [deleting, setDeleting] = useState<FileEntry | null>(null)
  const date = (f: FileEntry) => new Date(f.modTime).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })

  const load = useCallback(() => { api.ListBackups(server.id).then(setItems).catch((e) => setError(messageOf(e))) }, [server.id])
  useEffect(load, [load])

  const run = async (job: () => Promise<unknown>, done: string) => {
    setBusy(true); setError(null); setNote(null)
    try { await job(); setNote(done) } catch (e) { setError(messageOf(e)) } finally { setBusy(false); load() }
  }
  const clearNote = useCallback(() => setNote(null), [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-1">{t.servers.backups.title}</h4>
        <p className="m-0 text-sm text-muted">{t.servers.backups.subtitle}</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Button variant="primary" loading={busy} disabled={server.running && !server.state.ready} onClick={() => run(() => api.BackupServer(server.id), t.servers.backups.done)}>{t.servers.backups.now}</Button>
        <FolderLink id={server.id} sub="backups" />
      </div>
      <Feedback error={error} note={note} onClearNote={clearNote} />
      <AutoLoader active={items === null} label={t.common.loading} />
      {items?.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.servers.backups.empty}</p>}
      <div className="flex flex-col gap-3">
        {items?.map((f) => (
          <div key={f.name} className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="text-[15px] font-bold truncate">{date(f)}</div>
              <div className="text-xs text-muted truncate">{bytes(f.sizeBytes)} · {f.name}</div>
            </div>
            <Button variant="idle" size="sm" disabled={busy || server.running} title={server.running ? t.servers.backups.stopFirst : undefined} onClick={() => setRestoring(f)}>{t.servers.backups.restore}</Button>
            <Button variant="danger" size="sm" square title={t.instance.remove} disabled={busy} onClick={() => setDeleting(f)}><X /></Button>
          </div>
        ))}
      </div>

      {restoring && (
        <ConfirmDialog title={t.servers.backups.confirmRestoreTitle} body={fmt(t.servers.backups.confirmRestore, { date: date(restoring) })} confirmLabel={t.servers.backups.restore}
          onClose={() => setRestoring(null)} onConfirm={() => { const f = restoring; setRestoring(null); run(() => api.RestoreBackup(server.id, f.name), t.servers.backups.restored) }} />
      )}
      {deleting && (
        <ConfirmDialog danger title={t.servers.backups.confirmDeleteTitle} body={fmt(t.servers.backups.confirmDelete, { date: date(deleting) })} confirmLabel={t.common.delete}
          onClose={() => setDeleting(null)} onConfirm={() => { const f = deleting; setDeleting(null); api.RemoveBackup(server.id, f.name).catch((e) => setError(messageOf(e))).finally(load) }} />
      )}
    </div>
  )
}
