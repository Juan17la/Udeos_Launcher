import { useState } from 'react'
import type { ReactNode } from 'react'
import StatusMessage from '../ui/StatusMessage'
import { useApp } from '../state'
import { friendlyError } from '../utils/errors'

/** A failure in plain words: a short headline and one sentence on what to do.
 *  The original technical text is one click away ("Show details"), never the
 *  default. `compact` leaves the details out (status strip). */
export default function ErrorMessage({ message, onDismiss, compact, className, action }: { message: string; onDismiss?: () => void; compact?: boolean; className?: string; action?: ReactNode }) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const f = friendlyError(message, t.errors)
  const hasRaw = !compact && f.raw.trim() !== '' && f.raw !== f.text
  return (
    <StatusMessage kind="error" headline={f.headline} className={className} onDismiss={onDismiss} detail={<>
      {f.text}
      {action && <span className="block mt-2">{action}</span>}
      {hasRaw && (
        <>
          {' '}<button type="button" className="underline cursor-pointer bg-transparent border-0 p-0 text-inherit font-[inherit]" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? t.errors.hideDetails : t.errors.showDetails}
          </button>
          {open && <span className="block mt-2 break-all select-text">{f.raw}</span>}
        </>
      )}
    </>} />
  )
}
