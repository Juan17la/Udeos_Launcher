import PixelIcon from './PixelIcon'
import { useDelayed } from '../hooks/useDelayed'

/** The spinning ring every loader uses: a thin accent arc on a faint track.
 *  Small enough to sit inside a button or a notification. */
export function Spinner({ size = 14 }: { size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full border-[1.5px] border-current/25 border-t-current motion-safe:animate-spin" style={{ width: size, height: size }} />
}

/** Progress bar. `value` 0-100 is measured work (game files, downloads); omit it
 *  for an unmeasurable wait and a segment slides along the track instead.
 *  The fill is scaled, not resized, and never has a CSS transition: it is
 *  updated every frame, and a transition would restart each time and make the
 *  bar lag behind the number next to it. `tone="gold"` is the slow expected run
 *  (first install, loader patching): it reads as "normal, wait", not stuck. */
export function ProgressBar({ value, tone, className = '', label }: { value?: number; tone?: 'gold'; className?: string; label?: string }) {
  const fill = tone === 'gold' ? 'bg-gold' : 'bg-primary'
  const known = value !== undefined
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={known ? Math.round(value) : undefined}
      className={`relative h-1.5 w-full overflow-hidden bg-text/10 ${className}`}>
      {known
        ? <div className={`absolute inset-0 origin-left ${fill}`} style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} />
        : <div className={`absolute inset-y-0 left-0 w-2/5 ${fill} motion-safe:animate-[bar-slide_1.3s_var(--ease-out)_infinite]`} />}
    </div>
  )
}

/** A grass block hopping over its shadow: the launcher's own "loading", for waits that
 *  fill a region (a listing, the app boot). Buttons and notices keep the small Spinner. */
export function BlockHop({ size = 24, icon = 'grass_block_side' }: { size?: number; icon?: string }) {
  return (
    <span aria-hidden className="inline-flex flex-col items-center shrink-0" style={{ width: size }}>
      <PixelIcon name={icon} size={size} className="motion-safe:animate-[block-hop_0.9s_var(--ease-out)_infinite]" />
      <span className="mt-1 h-1 rounded-full bg-text/20 motion-safe:animate-[hop-shadow_0.9s_var(--ease-out)_infinite]" style={{ width: size * 0.8 }} />
    </span>
  )
}

/** Loader for plain fetches (search results, version lists, listings): a hopping
 *  block with an optional label that appears once `active` has lasted a moment
 *  (useDelayed: a fast load shows nothing, so nothing blinks) and leaves the moment it is false. `overlay` centres it over the whole window
 *  (app boot); otherwise it is an inline block. `subtle` is the quiet form for
 *  a check the player waits on inside something else (Add's compatibility
 *  check): a small ring and muted text. Where the shape of the result is known
 *  (cards, rows) prefer a skeleton of that shape over this. */
export default function AutoLoader({ active: wanted, label, overlay, subtle }: { active: boolean; label?: string; overlay?: boolean; subtle?: boolean }) {
  const active = useDelayed(wanted, subtle ? 400 : 250) // a quick check (subtle) is not worth a blink at all
  if (!active) return null
  if (subtle) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted" role="status" aria-live="polite" aria-busy="true">
        <Spinner size={14} />
        {label && <span>{label}</span>}
      </div>
    )
  }
  // The boot overlay: the logo's ender pearl, larger, with no pill around it.
  if (overlay) {
    return (
      <div className="fixed inset-0 z-9000 grid place-items-center p-4 bg-bg/80" role="status" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <BlockHop size={48} icon="ender_pearl" />
          {label && <span className="text-sm font-medium text-muted">{label}</span>}
        </div>
      </div>
    )
  }
  const pill = (
    <div className="glass inline-flex items-center gap-3 px-5 py-3" role="status" aria-live="polite" aria-busy="true">
      <BlockHop size={22} />
      {label && <span className="text-sm font-medium text-text whitespace-nowrap">{label}</span>}
    </div>
  )
  return <div className="flex items-center justify-center py-6">{pill}</div>
}

/** Placeholder rows for a list that is on its way (files, worlds, players,
 *  backups): the shape of the result, so the page does not jump when it lands.
 *  `grid` is the tile form (screenshots). Announced once as busy. */
export function SkeletonRows({ active: wanted, n = 4, grid }: { active: boolean; n?: number; grid?: boolean }) {
  const active = useDelayed(wanted)
  if (!active) return null
  return (
    <div className={` ${grid ? 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]' : 'flex flex-col gap-2'}`} role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => <div key={i} className={`skeleton ${grid ? 'aspect-16/10' : 'h-14'}`} style={{ animationDelay: `${i * 90}ms` }} />)}
    </div>
  )
}
