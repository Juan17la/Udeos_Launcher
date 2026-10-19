import { useApp, useLaunch } from '../state'
import { useLaunchProgress } from '../hooks/useLaunchProgress'
import { ProgressBar } from '../ui/Loader'
import Button from '../ui/Button'
import { Hourglass, Stop } from '../ui/icons'

/** The launch, in place: where Play was, the phase, one percentage, a bar and
 *  Cancel. When the run is slow on purpose (first install, loader patching) the
 *  bar turns gold and one line says so. Renders nothing unless this instance is
 *  the one being prepared. `compact` (cards, rows) leaves the slow-run line out;
 *  the gold bar still says it. */
export default function LaunchStrip({ id, className = '', compact }: { id: string; className?: string; compact?: boolean }) {
  const { t } = useApp()
  const { launch, cancelLaunch } = useLaunch()
  const { pct, label, note } = useLaunchProgress()
  if (launch.status !== 'preparing' || launch.instanceId !== id) return null
  // Compact (cards, rows): exactly one button high, so a card never grows while it launches.
  if (compact) {
    return (
      <div className={`relative flex items-center gap-3 min-w-0 h-10 pl-3 pr-1 overflow-hidden rounded-md bg-panel-2 shadow-neu ${className}`} role="status" aria-live="polite">
        <span className={`font-display text-lg leading-none tabular-nums ${note ? 'text-gold' : 'text-primary'}`}>{pct}<span className="text-xs ml-px">%</span></span>
        <span className="flex-1 min-w-0 truncate text-xs font-semibold text-muted" title={label}>{label}</span>
        <Button variant="ghost" size="sm" square onClick={cancelLaunch} aria-label={t.common.cancel} title={t.common.cancel}><Stop size={11} /></Button>
        <ProgressBar value={pct} tone={note ? 'gold' : undefined} label={label} className="absolute inset-x-0 bottom-0 h-0.5" />
      </div>
    )
  }
  return (
    <div className={`flex flex-col gap-2 min-w-0 rounded-md bg-panel-2 shadow-neu px-3.5 py-3 ${className}`} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`font-display text-xl leading-none tabular-nums min-w-[3.4ch] ${note ? 'text-gold' : 'text-primary'}`}>{pct}<span className="text-xs ml-px">%</span></span>
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium" title={label}>{label}</span>
        <Button variant="ghost" size="sm" square onClick={cancelLaunch} aria-label={t.common.cancel} title={t.common.cancel}><Stop size={11} /></Button>
      </div>
      <ProgressBar value={pct} tone={note ? 'gold' : undefined} label={label} />
      {note && !compact && (
        <p className="m-0 flex items-start gap-2 text-xs text-muted animate-[fade-in_0.3s_ease-out]">
          <span className="flex shrink-0 mt-px text-gold motion-safe:animate-[hourglass_2.4s_ease-in-out_infinite]"><Hourglass size={13} /></span>{note}
        </p>
      )}
    </div>
  )
}

/** Is this instance the one being prepared right now? */
export function useIsLaunching(id: string) {
  const { launch } = useLaunch()
  return launch.status === 'preparing' && launch.instanceId === id
}
