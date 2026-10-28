import { ReactNode, useEffect, useRef, useState } from 'react'
import ErrorMessage from '../../components/ErrorMessage'
import { ChevronDown, Folder, Plus, Search, Sparkles, Trash } from '../../ui/icons'
import Button from '../../ui/Button'
import StatusMessage from '../../ui/StatusMessage'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import type { Dict } from '../../i18n/en'
import type { ProjectType } from '../../api/types'

/** The pieces every file tab is built from, so the tabs read as a list. */

/** The bottom of a Settings tab: the one destructive action, kept away from Play. */
export function DangerZone({ title, body, onDelete, disabled }: { title: string; body: string; onDelete: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4 rounded-lg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-error)_35%,transparent)]">
      <div className="flex-1 min-w-60">
        <div className="font-bold text-sm">{title}</div>
        <p className="m-0 mt-1 text-[13px] text-muted">{body}</p>
      </div>
      <Button variant="danger" disabled={disabled} onClick={onDelete}><Trash />{title}</Button>
    </div>
  )
}

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

/** One toolbar per file tab: the Add button (a menu with Addons and this device
 *  when Modrinth carries the kind, the file picker otherwise), Ask AI, and
 *  whatever the tab puts on the right (view toggle, folder). */
export function Toolbar({ id, kind, onPick, modrinth, children }: { id: string; kind: keyof Dict['instance']['add']; onPick: () => void; modrinth?: ProjectType; children?: ReactNode }) {
  const { t, go } = useApp()
  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {modrinth ? (
        <>
          <AddMenu id={id} kind={kind} onPick={onPick} modrinth={modrinth} />
          <Button variant="idle" size="sm" onClick={() => go({ name: 'ai', instanceId: id })}><Sparkles size={13} /> {t.ai.ask}</Button>
        </>
      ) : <Button variant="primary" size="sm" onClick={onPick}><Plus size={13} /> {t.instance.add[kind]}</Button>}
      <span className="flex-1" />
      {children}
    </div>
  )
}

/** "Add mods" opens two plain choices: search Addons (locked to this instance)
 *  or pick a file already on this device. Closes on Escape or a click outside. */
export function AddMenu({ id, kind, onPick, modrinth }: { id: string; kind: keyof Dict['instance']['add']; onPick: () => void; modrinth: ProjectType }) {
  const { t, go } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [open])
  const item = (icon: ReactNode, label: string, hint: string, run: () => void, first?: boolean) => (
    <button type="button" role="menuitem" autoFocus={first} onClick={() => { setOpen(false); run() }}
      className="flex items-start gap-3 w-full px-3 py-2.5 rounded-md border-0 bg-transparent text-text text-left cursor-pointer transition-colors duration-150 hover:bg-idle focus-visible:bg-idle">
      <span className="flex-none grid place-items-center w-8 h-8 rounded-md bg-idle text-primary">{icon}</span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </span>
    </button>
  )
  return (
    <div className="relative" ref={ref}>
      <Button variant="primary" size="sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Plus size={13} /> {t.instance.add[kind]}
        <span className={`inline-flex transition-transform duration-150 ${open ? 'rotate-180' : ''}`}><ChevronDown size={12} /></span>
      </Button>
      {open && (
        <div role="menu" className="glass absolute top-[calc(100%+6px)] left-0 z-9001 w-72 max-w-[calc(100vw-32px)] flex flex-col gap-1 p-1.5">
          {item(<Search size={15} />, t.instance.addFrom.addons, t.instance.addFrom.addonsHint, () => go({ name: 'search', instanceId: id, type: modrinth }), true)}
          {item(<Folder size={15} />, t.instance.addFrom.device, t.instance.addFrom.deviceHint, onPick)}
        </div>
      )}
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
