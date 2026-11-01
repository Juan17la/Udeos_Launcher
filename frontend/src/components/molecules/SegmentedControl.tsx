import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Slider-style selector: a quiet track with a raised thumb that slides
 *  under the chosen option. The thumb is measured from the
 *  option buttons. The track is always one row of the same height: when the
 *  window is too narrow the options give up padding first, then their labels
 *  are cut with "…" (the full label is the tooltip), never wrapped. */
type Props<V extends string> = {
  options: { value: V; label: ReactNode; title?: string }[]
  value: V
  onChange: (v: V) => void
  'aria-labelledby'?: string
  'aria-label'?: string
  className?: string
}

type Box = { left: number; top: number; width: number; height: number }

export default function SegmentedControl<V extends string>({ options, value, onChange, className = '', ...aria }: Props<V>) {
  const refs = useRef(new Map<V, HTMLButtonElement>())
  const [thumb, setThumb] = useState<Box | null>(null)

  const measure = useCallback(() => {
    const el = refs.current.get(value)
    setThumb(el ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null)
  }, [value])

  useLayoutEffect(measure, [measure, options.length])
  const track = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // The track resizes with its column, not only with the window.
    const ro = new ResizeObserver(measure)
    if (track.current) ro.observe(track.current)
    document.fonts?.ready.then(measure) // widths settle once the font is in
    return () => ro.disconnect()
  }, [measure])

  return (
    <div ref={track} role="radiogroup" className={`relative inline-flex max-w-full min-w-0 gap-0.5 p-1 rounded-md bg-idle ${className}`} {...aria}>
      {thumb && (
        <span aria-hidden className="absolute rounded-sm bg-panel shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_55%,transparent)] transition-all duration-300 ease-out"
          style={{ left: thumb.left, top: thumb.top, width: thumb.width, height: thumb.height }} />
      )}
      {options.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={o.value === value}
          ref={(el) => { if (el) refs.current.set(o.value, el); else refs.current.delete(o.value) }}
          onClick={() => onChange(o.value)}
          title={o.title ?? (typeof o.label === 'string' ? o.label : undefined)} aria-label={o.title}
          className={`relative z-1 min-w-0 shrink ${typeof o.label === 'string' ? '' : 'inline-flex items-center justify-center'} px-[clamp(6px,0.9vw,16px)] py-1.5 text-[clamp(11.5px,1.25vw,13px)] font-semibold leading-[1.3] whitespace-nowrap overflow-hidden text-ellipsis rounded-sm border-0 bg-transparent cursor-pointer transition-colors duration-150 ${o.value === value ? 'text-text' : 'text-muted hover:text-text'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
