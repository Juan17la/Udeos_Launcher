import type { ReactNode } from 'react'
import { Check, X } from '../icons'
import { glass } from './Loader'

/** Feedback panel. Success: glass with a green check and one soft green
 *  pulse. Error: glass with a pastel-red glow, a headline of at most three
 *  words (see lib/errors.ts) and the full reason as small detail. */
type Props = {
  kind: 'success' | 'error'
  headline: ReactNode
  detail?: ReactNode
  onDismiss?: () => void
  className?: string
}

export default function StatusMessage({ kind, headline, detail, onDismiss, className = '' }: Props) {
  const error = kind === 'error'
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`${glass} flex items-start gap-3 px-4 py-3 ${error ? 'border-error shadow-error-glow animate-[dialog-fade_0.15s_ease-in-out]' : 'animate-[dialog-fade_0.15s_ease-in-out,pulse-green_0.9s_ease-out]'} ${className}`}
    >
      <span className={`flex-none inline-flex items-center justify-center w-7 h-7 rounded-md ${error ? 'bg-error text-ink' : 'bg-green text-white'}`}>
        {error ? <X size={14} /> : <Check size={14} />}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-sm font-bold leading-[1.3]">{headline}</span>
        {detail && <span className="text-xs text-muted break-words">{detail}</span>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Close" className="flex-none inline-flex items-center justify-center px-2.5 py-2 rounded-md border-0 bg-transparent text-text cursor-pointer hover:bg-idle/40 transition-all duration-150 ease-in-out">
          <X size={12} />
        </button>
      )}
    </div>
  )
}
