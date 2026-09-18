import type { HTMLAttributes } from 'react'

/** The two surfaces of the design system. Both are look only — background,
 *  shadow, radius — so the caller writes its own layout (flex, gap, padding)
 *  and nothing has to be overridden.
 *  Panel — neumorphic: sits on the canvas with soft light-and-shadow. Forms,
 *          side panels, cards (`hover` lifts a clickable card).
 *  Glass — glassmorphic: translucent and blurred. Dialogs, popovers, toasts,
 *          loaders, status messages. */
export function Panel({ hover, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={`rounded-md bg-panel shadow-neu transition-all duration-150 ease-in-out ${hover ? 'hover:-translate-y-0.5 hover:shadow-glass' : ''} ${className}`} {...rest} />
}

export function Glass({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-md bg-glass border border-glass-border backdrop-blur-[16px] shadow-glass ${className}`} {...rest} />
}
