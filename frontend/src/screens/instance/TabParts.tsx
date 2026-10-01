import { ReactNode, useEffect, useState } from 'react'
import ErrorMessage from '../../components/ErrorMessage'
import { Folder, Plus, Sparkles } from '../../ui/icons'
import Button from '../../ui/Button'
import StatusMessage from '../../ui/StatusMessage'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import type { Dict } from '../../i18n/en'
import type { ProjectType } from '../../api/types'

/** The pieces every file tab is built from, so the tabs read as a list. */

/** Files dropped anywhere on a tab are added: Wails reads this CSS property (custom
 *  properties inherit, so the whole area counts) and hands over real paths. A dashed
 *  ring shows while a file hovers. */
export function DropArea({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [over, setOver] = useState(false)
  return (
    <div className={`flex-1 rounded-md outline-offset-8 ${over ? 'outline-2 outline-dashed outline-primary' : ''} ${className}`} style={{ ['--wails-drop-target' as string]: 'drop' }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }} onDrop={(e) => { e.preventDefault(); setOver(false) }}>
      {children}
    </div>
  )
}

/** One toolbar per file tab: the main button (Addons locked to this instance for
 *  what Modrinth carries, the file picker otherwise), Ask AI, a file picker, and
 *  whatever the tab puts on the right (view toggle, folder). */
export function Toolbar({ id, kind, onPick, modrinth, children }: { id: string; kind: keyof Dict['instance']['add']; onPick: () => void; modrinth?: ProjectType; children?: ReactNode }) {
  const { t, go } = useApp()
  return (
    <div className="flex items-center gap-2 min-w-0">
      {modrinth ? (
        <>
          <Button variant="primary" size="sm" onClick={() => go({ name: 'search', instanceId: id, type: modrinth })}><Plus size={13} /> {t.instance.add[kind]}</Button>
          <Button variant="idle" size="sm" onClick={() => go({ name: 'ai', instanceId: id })}><Sparkles size={13} /> {t.ai.ask}</Button>
          <Button variant="ghost" size="sm" onClick={onPick}>{t.instance.browse}</Button>
        </>
      ) : <Button variant="primary" size="sm" onClick={onPick}><Plus size={13} /> {t.instance.add[kind]}</Button>}
      <span className="flex-1" />
      {children}
    </div>
  )
}

/** Error under the toolbar (short headline, the backend's reason as detail)
 *  and the success note, which clears itself after three seconds. */
export function Feedback({ error, note, onClearNote }: { error: string | null; note: string | null; onClearNote: () => void }) {
  useEffect(() => {
    if (!note) return
    const id = setTimeout(onClearNote, 3000)
    return () => clearTimeout(id)
  }, [note, onClearNote])
  return (
    <>
      {error && <ErrorMessage message={error} />}
      {note && <StatusMessage kind="success" headline={note} onDismiss={onClearNote} />}
    </>
  )
}

/** "Open folder": a link on its own row, or (`compact`, in a toolbar) just the folder icon. */
export function FolderLink({ id, sub, compact }: { id: string; sub: string; compact?: boolean }) {
  const { t } = useApp()
  if (compact) return <Button variant="ghost" size="sm" square title={t.instance.openFolder} onClick={() => api.OpenInstanceFolder(id, sub)}><Folder size={14} /></Button>
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={() => api.OpenInstanceFolder(id, sub)}><Folder size={12} /> {t.instance.openFolder}</Button>
    </div>
  )
}
