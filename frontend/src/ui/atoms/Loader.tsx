import { ReactNode, useEffect, useRef, useState } from 'react'
import ProgressBar from './ProgressBar'

export const glass = 'bg-glass border border-glass-border backdrop-blur-[16px] rounded-md shadow-glass'

/** Every asynchronous state shows one of these: a glassmorphic panel with a
 *  live percentage. `overlay` centres it over the whole window (game
 *  install); otherwise it is an inline block centred in its container. */
type LoaderProps = { percent: number; label?: string; detail?: ReactNode; overlay?: boolean; className?: string }

export function GlassLoader({ percent, label, detail, overlay, className = '' }: LoaderProps) {
  const pct = Math.round(Math.max(0, Math.min(100, percent)))
  const panel = (
    <div className={`${glass} flex flex-col gap-4 p-6 w-[min(360px,100%)] animate-[dialog-fade_0.15s_ease-in-out] ${className}`} role="status" aria-live="polite" aria-busy={pct < 100}>
      <div className="flex items-end justify-between gap-4">
        <span className="text-sm font-bold min-w-0 break-words">{label ?? ''}</span>
        <span className="text-3xl font-bold tabular-nums leading-none">{pct}%</span>
      </div>
      <ProgressBar percent={pct} />
      {detail && <div className="flex flex-col gap-1 text-xs text-muted min-w-0">{detail}</div>}
    </div>
  )
  if (overlay) {
    return <div className="fixed inset-0 z-9000 grid place-items-center p-4 bg-black/30 backdrop-blur-[4px]">{panel}</div>
  }
  return <div className="flex items-center justify-center min-h-40 p-4">{panel}</div>
}

/** A counter for phases with no measurable progress inside a real job
 *  (reading version info, the loader installer): while `active` it eases
 *  from 0 towards 90, and when `active` drops it snaps to 100 and, 250ms
 *  later, returns null. Plain fetches use the spinner below instead. */
export function useSimulatedProgress(active: boolean): number | null {
  const [value, setValue] = useState<number | null>(active ? 0 : null)
  const start = useRef(0)
  useEffect(() => {
    if (active) {
      start.current = performance.now()
      setValue(0)
      let frame = 0
      const tick = (now: number) => {
        const t = (now - start.current) / 1500
        setValue(90 * (1 - Math.exp(-2.2 * t)))
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    }
    // Finished: show 100 briefly, then go away.
    setValue((v) => (v === null ? null : 100))
    const id = setTimeout(() => setValue(null), 250)
    return () => clearTimeout(id)
  }, [active])
  return value
}

/** Spinner ring in the brand green (pure CSS, no keyframe of its own). */
export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span aria-hidden className="inline-block shrink-0 rounded-md border-[3px] border-idle/60 border-t-green animate-spin"
      style={{ width: size, height: size }} />
  )
}

/** Loader for plain fetches (search results, version lists, listings): a
 *  compact glass pill with a spinner that appears the moment `active` is
 *  true and leaves the moment it is false. `overlay` centres it over the
 *  whole window (app boot); otherwise it is an inline block. */
export function AutoLoader({ active, label, overlay, className = '' }: { active: boolean; label?: string; overlay?: boolean; className?: string }) {
  if (!active) return null
  const pill = (
    <div className={`${glass} inline-flex items-center gap-4 px-5 py-3 animate-[dialog-fade_0.15s_ease-in-out] ${className}`} role="status" aria-live="polite" aria-busy="true">
      <Spinner />
      {label && <span className="text-sm font-bold whitespace-nowrap">{label}</span>}
    </div>
  )
  if (overlay) return <div className="fixed inset-0 z-9000 grid place-items-center p-4 bg-black/30 backdrop-blur-[4px]">{pill}</div>
  return <div className="flex items-center justify-center py-4">{pill}</div>
}
