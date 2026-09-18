import type { ReactNode } from 'react'
import { Glass } from './Panel'
import Button from './Button'
import { Check, X } from './icons'

/** One bottom-right notification: title, a right-hand slot (percentage,
 *  "Waiting…"), an optional progress bar and an optional dismiss. Error
 *  toasts get the pastel-red glow; done toasts a green check. */
type Props = {
  title: ReactNode
  aside?: ReactNode
  percent?: number
  detail?: ReactNode
  tone?: 'neutral' | 'success' | 'error'
  onDismiss?: () => void
}

export default function Toast({ title, aside, percent, detail, tone = 'neutral', onDismiss }: Props) {
  return (
    <Glass role="status" className={`flex flex-col gap-3 p-4 animate-[toast-in_0.15s_ease-in-out] ${tone === 'error' ? 'border-error shadow-error-glow' : ''} ${tone === 'success' ? 'animate-[pulse-green_0.9s_ease-out]' : ''}`}>
      <div className="flex items-start gap-3">
        {tone === 'success' && <span className="flex-none inline-flex items-center justify-center w-7 h-7 rounded-md bg-green text-white"><Check size={14} /></span>}
        {tone === 'error' && <span className="flex-none inline-flex items-center justify-center w-7 h-7 rounded-md bg-error text-ink"><X size={14} /></span>}
        <div className="flex-1 min-w-0 text-[13px] font-bold leading-[1.3]">{title}</div>
        {aside !== undefined && <span className="text-[13px] text-muted tabular-nums shrink-0">{aside}</span>}
        {onDismiss && <Button variant="ghost" size="sm" square onClick={onDismiss} aria-label="Close"><X size={12} /></Button>}
      </div>
      {percent !== undefined && <ProgressBar percent={percent} />}
      {detail && <div className="text-xs text-muted break-words">{detail}</div>}
    </Glass>
  )
}

/** Thin green bar; the fill scales rather than resizes so it animates on the compositor. */
function ProgressBar({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 w-full rounded-md bg-idle/60 overflow-hidden" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div className="w-full h-full bg-green rounded-md origin-left transition-transform duration-150 ease-in-out" style={{ transform: `scaleX(${p / 100})` }} />
    </div>
  )
}
