import type { ReactNode } from 'react'
import Button from './Button'
import { Check, X } from './icons'

/** Feedback panel, inline or as a toast. Success: glass with a green check
 *  and one soft green pulse. Error: glass with a pastel-red glow, a headline
 *  of at most three words (see utils/errors.ts) and the full reason as small
 *  detail. Neutral (progress): an `aside` (percentage, "Waiting…") and a
 *  `percent` bar. */
type Props = {
  kind?: 'neutral' | 'success' | 'error'
  headline: ReactNode
  detail?: ReactNode
  aside?: ReactNode
  percent?: number
  onDismiss?: () => void
  className?: string
}

export default function StatusMessage({ kind = 'neutral', headline, detail, aside, percent, onDismiss, className = 'animate-[dialog-fade_0.15s_ease-in-out]' }: Props) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'}
      className={`glass flex flex-col gap-3 px-4 py-3 ${className} ${kind === 'error' ? 'border-error shadow-error-glow' : ''} ${kind === 'success' ? 'animate-[pulse-green_0.9s_ease-out]' : ''}`}>
      <div className="flex items-start gap-3">
        {kind !== 'neutral' && (
          <span className={`flex-none inline-flex items-center justify-center w-7 h-7 rounded-md ${kind === 'error' ? 'bg-error text-ink' : 'bg-green text-white'}`}>
            {kind === 'error' ? <X size={14} /> : <Check size={14} />}
          </span>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-sm font-bold leading-[1.3]">{headline}</span>
          {detail && <span className="text-xs text-muted break-words">{detail}</span>}
        </div>
        {aside !== undefined && <span className="text-[13px] text-muted tabular-nums shrink-0">{aside}</span>}
        {onDismiss && <Button variant="ghost" size="sm" square onClick={onDismiss} aria-label="Close"><X size={12} /></Button>}
      </div>
      {percent !== undefined && (
        <progress value={Math.max(0, Math.min(100, percent))} max={100}
          className="w-full h-2 rounded-md overflow-hidden [&::-webkit-progress-bar]:bg-idle/60 [&::-webkit-progress-value]:bg-green [&::-webkit-progress-value]:transition-all" />
      )}
    </div>
  )
}
