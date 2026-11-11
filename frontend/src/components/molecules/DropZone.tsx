import { ReactNode, useState } from 'react'
import PixelIcon from '../atoms/PixelIcon'

/** Drag-and-drop target. Native file drops on it arrive with real paths
 *  (see onFileDrop); the browser drop only ends the hover state. `--wails-drop-target` marks the element for Wails. `prominent`
 *  makes it the page's main way in: larger, with an item, a bold `text` and a `hint`
 *  under it. It stays neutral until a file hovers it; then the edge turns blue. */
export default function DropZone({ text, hint, children, className = '', prominent }: { text: string; hint?: string; children?: ReactNode; className?: string; prominent?: boolean }) {
  const [over, setOver] = useState(false)
  const look = prominent
    ? `flex-wrap gap-5 px-6 py-5 border-[1.5px] ${over ? 'border-primary bg-primary/10' : 'border-text/20'}`
    : `flex-wrap gap-4 p-4 border-[1.5px] text-sm text-muted ${over ? 'border-primary bg-primary/10' : 'border-text/20'}`
  return (
    <div
      className={`flex items-center justify-center rounded-md border-dashed transition-colors ${look} ${className}`}
      style={{ ['--wails-drop-target' as string]: 'drop' }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }} onDrop={(e) => { e.preventDefault(); setOver(false) }}
    >
      {prominent ? (
        <>
          <PixelIcon name="diamond_chestplate" size={48} />
          <span className="flex-1 min-w-40 flex flex-col gap-1">
            <span className="text-base font-bold">{text}</span>
            {hint && <span className="text-xs text-muted">{hint}</span>}
          </span>
        </>
      ) : <span>{text}</span>}
      {children}
    </div>
  )
}
