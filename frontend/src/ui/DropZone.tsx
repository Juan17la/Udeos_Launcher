import { ReactNode, useState } from 'react'

/** Drag-and-drop target. Native file drops arrive from Go with real paths
 *  (see the files:dropped event); the browser drop only ends the hover
 *  state. `--wails-drop-target` marks the element for Wails. */
export default function DropZone({ text, children, className = '' }: { text: string; children?: ReactNode; className?: string }) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`flex items-center justify-center flex-wrap gap-4 p-4 rounded-md border-2 border-dashed text-sm text-muted transition-all duration-150 ease-in-out ${over ? 'border-primary bg-primary/10' : 'border-idle'} ${className}`}
      style={{ ['--wails-drop-target' as string]: 'drop' }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false) }}
    >
      <span>{text}</span>
      {children}
    </div>
  )
}
