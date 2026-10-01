import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { ChevronDown } from '../ui/icons'
import { useApp } from '../state'
import { ICON_CHOICES, iconLabel } from '../assets'

type Props = {
  value: string; onChange: (key: string) => void
  /** An extra first cell (a modpack's own icon), keyed 'modpack'. */
  extra?: ReactNode
  /** Open the grid in the flow under the button instead of floating: for dialogs, which clip anything that floats out. */
  inline?: boolean
}

/** The chosen icon as one button; clicking it opens the grid of icons
 *  (assets/ICON_CHOICES) below it, and choosing one closes it again. Closed, it
 *  takes the room of a single button instead of five rows of blocks. */
export default function IconPicker({ value, onChange, extra, inline }: Props) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Capture phase: Escape closes only the grid, not the dialog the picker may sit in.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false) } }
    const onClick = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey, true); window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('mousedown', onClick) }
  }, [open])

  const pick = (key: string) => { onChange(key); setOpen(false) }
  return (
    <div className={inline ? 'flex flex-col items-start gap-2' : 'relative flex-none'} ref={root}>
      <button type="button" aria-expanded={open} title={t.create.changeIcon} aria-label={t.create.changeIcon} onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 h-10 pl-2.5 pr-2 rounded-md border-0 cursor-pointer bg-idle text-on-idle shadow-neu transition-all duration-150 ease-in-out hover:bg-idle-hover">
        {value === 'modpack' && extra ? extra : <PixelIcon name={value} size={24} />}
        <span className={`inline-flex transition-transform duration-150 ${open ? 'rotate-180' : ''}`}><ChevronDown size={12} /></span>
      </button>
      {open && (
        <div className={`max-h-56 overflow-y-auto p-3 animate-[dialog-fade_0.15s_ease-in-out] ${inline ? 'w-full rounded-md bg-panel-2 shadow-neu-inset' : 'glass absolute left-0 top-[calc(100%+8px)] z-30 w-[22rem] max-w-[calc(100vw-3rem)]'}`}>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' }}>
            {extra && <Cell selected={value === 'modpack'} title="Modpack" onClick={() => pick('modpack')}>{extra}</Cell>}
            {ICON_CHOICES.map((key) => (
              <Cell key={key} selected={value === key} title={iconLabel(key)} onClick={() => pick(key)}><PixelIcon name={key} size={28} /></Cell>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({ selected, title, onClick, children }: { selected: boolean; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} title={title} onClick={onClick}
      className={`inline-flex items-center justify-center p-2 rounded-md border-0 cursor-pointer transition-all duration-150 ease-in-out ${selected ? 'bg-primary text-on-primary' : 'bg-idle text-on-idle hover:bg-idle-hover'} shadow-neu`}>
      {children}
    </button>
  )
}
