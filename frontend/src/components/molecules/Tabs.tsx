import type { ReactNode } from 'react'

/** Page tabs: a row with a hairline under it and an accent underline on the
 *  open one. `group` on an option starts a new group (extra space before it),
 *  so a long row reads as a few chunks. Labels are never cut: when the window is
 *  too narrow the row scrolls sideways instead. */
export default function Tabs<V extends string>({ options, value, onChange, className = '' }: { options: { value: V; label: ReactNode; group?: boolean }[]; value: V; onChange: (v: V) => void; className?: string }) {
  return (
    <div role="tablist" className={`flex shrink-0 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-line)] [scrollbar-width:none] ${className}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <span key={o.value} className="flex items-center">
          {o.group && <span aria-hidden className="w-5 shrink-0" />}
          <button type="button" role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={`relative h-10 px-2.5 border-0 bg-transparent cursor-pointer whitespace-nowrap text-[13px] font-bold transition-colors duration-150 after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:transition-colors after:duration-150 ${on ? 'text-text after:bg-primary' : 'text-muted hover:text-text after:bg-transparent'}`}>
            {o.label}
          </button>
          </span>
        )
      })}
    </div>
  )
}
