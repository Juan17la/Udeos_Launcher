import { ReactNode, useState } from 'react'
import { Download } from './icons'

/** Drag-and-drop target. Native file drops arrive from Go with real paths
 *  (see the files:dropped event); the browser drop only ends the hover
 *  state. `--wails-drop-target` marks the element for Wails. `prominent`
 *  makes it the page's main action: tinted, with an icon, a bold `text`
 *  and a `hint` under it. */
export default function DropZone({ text, hint, children, className = '', prominent }: { text: string; hint?: string; children?: ReactNode; className?: string; prominent?: boolean }) {
  const [over, setOver] = useState(false)
  const look = prominent
    ? `flex-wrap gap-5 px-6 py-5 border-3 ${over ? 'border-primary bg-primary/25 scale-101' : 'border-primary/70 bg-primary/10'}`
    : `flex-wrap gap-4 p-4 border-2 text-sm text-muted ${over ? 'border-primary bg-primary/10' : 'border-idle'}`
  return (
    <div
      className={`flex items-center justify-center rounded-md border-dashed transition-all duration-150 ease-in-out ${look} ${className}`}
      style={{ ['--wails-drop-target' as string]: 'drop' }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}
    >
      {prominent ? (
        <>
          <span aria-hidden className="flex-none grid place-items-center w-12 h-12 rounded-md bg-primary text-white shadow-primary"><Download size={22} /></span>
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
