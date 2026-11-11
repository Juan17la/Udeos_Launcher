import { useState } from 'react'
import Button from '../atoms/Button'
import { useApp } from '../../state'
import { copyText } from '../../api/bridge'

/** An address with a Copy button (the button says "Copied" for a moment).
 *  The address always shows in full: a long one wraps (at any character, it has no spaces)
 *  instead of being cut, so players can read it out to a friend. `big` is the server page's
 *  banner; `compact` is the server cards' (no box, smaller type). */
export default function CopyAddress({ label, address, big, compact }: { label: string; address: string; big?: boolean; compact?: boolean }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)
  const copy = () => { copyText(address); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0" title={label}>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-xs text-muted">{label}</span>
          <span className="font-mono text-sm font-medium break-all select-text">{address}</span>
        </span>
        <Button variant="secondary" size="sm" className="flex-none" onClick={(e) => { e.stopPropagation(); copy() }}>{copied ? t.servers.copied : t.servers.copy}</Button>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-md bg-panel-2 shadow-neu min-w-0 ${big ? 'py-3' : ''}`}>
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className={`font-mono font-medium break-all select-text ${big ? 'text-base' : 'text-sm'}`}>{address}</span>
      </div>
      <Button variant={big ? 'secondary' : 'ghost'} size="sm" onClick={(e) => { e.stopPropagation(); copy() }}>{copied ? t.servers.copied : t.servers.copy}</Button>
    </div>
  )
}
