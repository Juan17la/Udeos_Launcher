import { useState } from 'react'
import Button from '../ui/Button'
import { useApp } from '../state'
import { copyText } from '../api/bridge'

/** An address with a Copy button (the button says "Copied" for a moment).
 *  `big` is the server page's banner: larger (the type size follows the window). A long
 *  host is cut with "…" but the port always shows and Copy copies it whole; it never breaks mid-word.
 *  `compact` is the server cards': one small line that is cut with "…" when long
 *  (the full address is the tooltip), so a long address never makes a card taller. */
export default function CopyAddress({ label, address, big, compact }: { label: string; address: string; big?: boolean; compact?: boolean }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)
  const copy = () => { copyText(address); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0 h-9" title={`${label}: ${address}`}>
        <span className="flex-1 min-w-0 flex font-mono text-xs text-muted select-text"><span className="truncate">{address.replace(/:\d+$/, '')}</span><span className="flex-none">{address.match(/:\d+$/)?.[0]}</span></span>
        <Button variant="ghost" size="sm" className="flex-none" onClick={(e) => { e.stopPropagation(); copy() }}>{copied ? t.servers.copied : t.servers.copy}</Button>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-md bg-panel-2 shadow-neu min-w-0 ${big ? 'py-3' : ''}`}>
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-[11px] text-muted">{label}</span>
        <span className={`flex min-w-0 font-mono font-medium select-text ${big ? 'text-[clamp(12px,1.25vw,16px)]' : 'text-sm'}`} title={address}>
          <span className="truncate">{address.replace(/:\d+$/, '')}</span><span className="flex-none">{address.match(/:\d+$/)?.[0]}</span>
        </span>
      </div>
      <Button variant={big ? 'primary' : 'ghost'} size="sm" onClick={(e) => { e.stopPropagation(); copy() }}>{copied ? t.servers.copied : t.servers.copy}</Button>
    </div>
  )
}
