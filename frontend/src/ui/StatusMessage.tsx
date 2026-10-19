import type { ReactNode } from 'react'
import Button from './Button'
import { ProgressBar } from './Loader'
import { Check, X } from './icons'

/** Feedback panel, inline or as a toast. Success: a check chip and one soft
 *  pulse of the accent. Error: a red edge and one sideways nudge as it arrives, a headline of at most three words
 *  (see utils/errors.ts) and the full reason as small detail. Neutral
 *  (progress): an `aside` (percentage, "Waiting…") and a `percent` bar. */
type Props = {
  kind?: 'neutral' | 'success' | 'error'
  headline: ReactNode
  detail?: ReactNode
  aside?: ReactNode
  percent?: number
  onDismiss?: () => void
  /** 'gold': a slow run that is expected (first install): gold border and bar. */
  accent?: 'gold'
  /** Tooltip and screen-reader name of the × (default "Close"; "Cancel" on a download). */
  dismissLabel?: string
  className?: string
  /** No entrance, pulse or nudge: for messages that are re-shown, not new (the Activity list on every open). */
  still?: boolean
}

export default function StatusMessage({ kind = 'neutral', headline, detail, aside, percent, accent, onDismiss, dismissLabel = 'Close', className: cls, still }: Props) {
  const className = cls ?? (still ? '' : 'animate-[dialog-fade_0.2s_var(--ease-out)]')
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} style={kind === 'error' && !still ? { animation: 'dialog-fade 0.2s var(--ease-out), nudge 0.45s ease-out 0.15s' } : undefined}
      className={`glass flex flex-col gap-3 px-4 py-3 ${className} ${kind === 'error' ? 'shadow-[0_0_0_1px_var(--color-error),var(--shadow-pop)]' : ''} ${kind === 'success' && !still ? 'animate-[pulse-primary_0.9s_ease-out]' : ''}`}>
      <div className="flex items-start gap-3">
        {kind !== 'neutral' && (
          <span className={`flex-none inline-flex items-center justify-center w-6 h-6 rounded-md ${kind === 'error' ? 'bg-error text-white' : 'bg-primary text-on-primary'}`}>
            {kind === 'error' ? <X size={12} /> : <Check size={12} />}
          </span>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-sm font-semibold leading-[1.3]">{headline}</span>
          {detail && <span className="text-xs text-muted break-words">{detail}</span>}
        </div>
        {aside !== undefined && <span className="text-[13px] text-muted font-mono tabular-nums shrink-0">{aside}</span>}
        {onDismiss && <Button variant="ghost" size="sm" square onClick={onDismiss} aria-label={dismissLabel} title={dismissLabel}><X size={12} /></Button>}
      </div>
      {percent !== undefined && <ProgressBar value={percent} tone={accent} />}
    </div>
  )
}
