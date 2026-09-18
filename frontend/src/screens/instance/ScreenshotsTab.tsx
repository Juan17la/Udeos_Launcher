import { useCallback, useEffect, useState } from 'react'
import { Camera, Folder } from '../../ui/icons'
import Button from '../../ui/Button'
import AutoLoader from '../../ui/Loader'
import Dialog from '../../ui/Dialog'
import { useApp, useLaunch } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { ago, bytes } from '../../utils/format'
import { Feedback, FolderLink } from './TabParts'
import type { FileEntry } from '../../api/types'

/** Thumbnails served by the Go side under /media; click for a preview,
 *  Save to Device copies the file out. Re-lists when the game closes. */
export default function ScreenshotsTab({ id }: { id: string }) {
  const { t, language } = useApp()
  const { launch } = useLaunch()
  const [shots, setShots] = useState<FileEntry[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [open, setOpen] = useState<FileEntry | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())
  useEffect(() => { api.ListScreenshots(id).then(setShots) }, [id, launch.status])
  const clearNote = useCallback(() => setNote(null), [])

  const src = (s: FileEntry) => `/media/${encodeURIComponent(id)}/screenshots/${encodeURIComponent(s.name)}`
  const save = async (s: FileEntry) => {
    const path = await api.ExportScreenshot(id, s.name)
    if (path) setNote(fmt(t.instance.savedTo, { path }))
  }

  return (
    <div className="flex flex-col gap-4">
      <Feedback error={null} note={note} onClearNote={clearNote} />
      <FolderLink id={id} sub="screenshots" />
      <AutoLoader active={shots === null} label={t.common.loading} />
      {shots?.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.instance.empty.screenshots}</p>}
      {shots && shots.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
          {shots.map((s) => (
            <div key={s.name} className="flex flex-col gap-4">
              <button
                type="button" title={`${t.instance.view}: ${s.name}`} onClick={() => setOpen(s)}
                className="relative aspect-16/10 rounded-md bg-panel shadow-neu flex items-center justify-center overflow-hidden p-0 border-0 cursor-zoom-in transition-all duration-150 ease-in-out hover:-translate-y-0.5"
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
          <p className="mt-4 mb-0 text-xs text-muted">{bytes(open.sizeBytes)} · {ago(open.modTime, language)}</p>
        </Dialog>
      )}
    </div>
  )
}
