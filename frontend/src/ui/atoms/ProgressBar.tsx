/** Thin green bar. `percent` 0–100; the fill scales rather than resizes so
 *  it animates on the compositor. */
export default function ProgressBar({ percent, className = '' }: { percent: number; className?: string }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className={`h-2 w-full rounded-md bg-idle/60 overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div className="w-full h-full bg-green rounded-md origin-left transition-transform duration-150 ease-in-out" style={{ transform: `scaleX(${p / 100})` }} />
    </div>
  )
}
