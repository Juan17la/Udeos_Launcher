import type { ReactNode } from 'react'
import Button from '../atoms/Button'
import { ProgressBar } from '../atoms/Loader'
import PixelIcon from '../atoms/PixelIcon'
import { X } from '../atoms/icons'
import { useApp } from '../../state'

/** Feedback panel, inline or as a toast. Success: an emerald (on the subject's icon, or
 *  alone) and one soft
 *  pulse of the accent. Error: a red edge and one sideways nudge as it arrives, a headline of at most three words
 *  (see utils/errors.ts) and the full reason as small detail; its mark is redstone. Neutral
 *  (progress): an `aside` (percentage, "Waiting…") and a `percent` bar. */
type Props = {
  kind?: 'neutral' | 'success' | 'error'
  headline: ReactNode
  detail?: ReactNode
  /** What the message is about (a mod's or instance's icon), shown before the headline; on success it carries a small check. */
  icon?: ReactNode
  aside?: ReactNode
  percent?: number
  onDismiss?: () => void
  /** 'gold': a slow run that is expected (first install): gold border and bar. */
  accent?: 'gold'
  /** Tooltip and screen-reader name of the × (default t.common.close; "Cancel" on a download). */
  dismissLabel?: string
  className?: string
  /** No pulse or nudge: for messages that are re-shown, not new (the Activity list on every open). */
  still?: boolean
}

export default function StatusMessage({ kind = 'neutral', headline, detail, icon, aside, percent, accent, onDismiss, dismissLabel, className: cls, still }: Props) {
  const { t } = useApp()
  const close = dismissLabel ?? t.common.close
  const className = cls ?? ''
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} style={kind === 'error' && !still ? { animation: 'nudge 0.45s ease-out' } : undefined}
      className={`glass flex flex-col gap-3 px-4 py-3 ${className} ${kind === 'error' ? 'shadow-[0_0_0_1px_var(--color-error),var(--shadow-pop)]' : ''} ${kind === 'success' && !still ? 'animate-[pulse-primary_0.9s_ease-out]' : ''}`}>
      <div className="flex items-start gap-3">
        {icon && kind !== 'error' ? (
          <span className="relative flex-none flex">
            {icon}
            {kind === 'success' && <PixelIcon name="emerald" size={16} className="absolute -bottom-1.5 -right-1.5" />}
          </span>
        ) : kind !== 'neutral' && (
          <PixelIcon name={kind === 'error' ? 'redstone' : 'emerald'} size={16} className="mt-px" />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-sm font-semibold leading-[1.3]">{headline}</span>
          {detail && <span className="text-xs text-muted break-words">{detail}</span>}
        </div>
        {aside !== undefined && <span className="text-[13px] text-muted font-mono tabular-nums shrink-0">{aside}</span>}
        {onDismiss && <Button variant="ghost" size="sm" square onClick={onDismiss} aria-label={close} title={close}><X size={12} /></Button>}
      </div>
      {percent !== undefined && <ProgressBar value={percent} tone={accent} />}
    </div>
  )
}
