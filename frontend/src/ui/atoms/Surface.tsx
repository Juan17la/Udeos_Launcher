import type { HTMLAttributes } from 'react'
import { glass } from './Loader'

/** The two container styles of the design system.
 *  Panel — neumorphic: sits on the canvas with soft light-and-shadow, no
 *          outline. Structural: cards, forms, side panels.
 *  Glass — glassmorphic: translucent, blurred. Floating: dialogs, popovers,
 *          toasts, loaders, status messages. */
type PanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Recessed instead of raised. */
  pressed?: boolean
  /** Lift slightly on hover (clickable cards). */
  hover?: boolean
  /** `alt` is the second surface tone, for rows nested in or beside a base panel. */
  tone?: 'base' | 'alt'
}

export function Panel({ pressed, hover, tone = 'base', className = '', ...rest }: PanelProps) {
  return (
    <div
      className={`flex flex-col gap-4 p-4 rounded-md transition-all duration-150 ease-in-out ${tone === 'alt' ? 'bg-panel-2' : 'bg-panel'} ${pressed ? 'shadow-neu-inset' : 'shadow-neu'} ${hover ? 'hover:-translate-y-0.5 hover:shadow-glass' : ''} ${className}`}
      {...rest}
    />
  )
}

export function Glass({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${glass} flex flex-col gap-4 p-4 ${className}`} {...rest} />
}
