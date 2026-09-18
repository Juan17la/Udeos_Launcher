import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Slider-style selector: a recessed light-gray track with a green thumb
 *  that slides under the chosen option. The thumb is measured from the
 *  option buttons, so any label length works and wrapping keeps it aligned. */
type Props<V extends string> = {
  options: { value: V; label: string }[]
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
  useEffect(() => {
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure) // widths settle once the font is in
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return (
    <div role="radiogroup" className={`relative inline-flex flex-wrap w-fit gap-1 p-1 rounded-md bg-idle shadow-neu-inset ${className}`} {...aria}>
      {thumb && (
        <span aria-hidden className="absolute rounded-md bg-green shadow-neu transition-all duration-150 ease-in-out"
          style={{ left: thumb.left, top: thumb.top, width: thumb.width, height: thumb.height }} />
      )}
      {options.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={o.value === value}
          ref={(el) => { if (el) refs.current.set(o.value, el); else refs.current.delete(o.value) }}
          onClick={() => onChange(o.value)}
          className={`relative z-1 px-4 py-2 text-[13px] font-bold leading-[1.2] whitespace-nowrap rounded-md border-0 bg-transparent cursor-pointer transition-all duration-150 ease-in-out ${o.value === value ? 'text-white' : 'text-ink hover:text-green-hover active:scale-97'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
