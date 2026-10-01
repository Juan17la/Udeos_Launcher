import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Button variants from the design system (docs/11-design-system.md):
 *  primary   — pastel mint (Overworld) / ender lavender (End): Play, New Instance
 *  secondary — pastel sky blue (Overworld) / charcoal-purple (End): Open instance
 *  idle      — warm pebble gray / charcoal-purple, for neutral actions and anything unselected
 *  danger    — pastel end purple-red
 *  ghost     — outlined, no fill */
export type ButtonVariant = 'primary' | 'secondary' | 'idle' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Full width. */
  block?: boolean
  /** Icon-only: equal sides, padding still wider than tall. */
  square?: boolean
  /** Working: disabled, full opacity, a gold loader ring runs round the edge. */
  loading?: boolean
  children?: ReactNode
}

/* Horizontal padding is always larger than vertical (12px 24px / 10px 20px / 8px 16px). */
const SIZE: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}
const SQUARE: Record<ButtonSize, string> = { sm: 'px-2.5 py-2 min-w-9 h-9', md: 'px-3 py-2.5 min-w-10 h-10', lg: 'px-3.5 py-3 min-w-12 h-12' }

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-primary active:shadow-neu-inset',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-hover shadow-secondary active:shadow-neu-inset',
  idle: 'bg-idle text-on-idle hover:bg-idle-hover shadow-neu active:shadow-neu-inset',
  danger: 'bg-error/80 text-white hover:bg-error/90 shadow-neu active:shadow-neu-inset',
  // Border only, no fill: the outline takes the primary colour on hover.
  ghost: 'bg-transparent text-text shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-text)_28%,transparent)] hover:shadow-[inset_0_0_0_2px_var(--color-primary)] active:shadow-[inset_0_0_0_2px_var(--color-primary-hover)]',
}

/* No transform on hover or press and no permanent layer: a page of cards has
   dozens of buttons, and each one on its own compositing layer made long
   lists scroll badly in WebKitGTK (see panel-hover in tokens.css). Hover and
   press are colour and shadow (the VARIANT classes). */
const base = 'relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer no-underline min-w-fit font-bold leading-[1.2] rounded-md border-0 transition-[background-color,box-shadow,color,opacity] duration-150 ease-in-out disabled:pointer-events-none disabled:shadow-none'
const idleDisabled = 'disabled:opacity-60 disabled:cursor-not-allowed'

export default function Button({ variant = 'idle', size = 'md', block, square, loading, className = '', type = 'button', children, disabled, ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`${base} ${loading ? 'cursor-progress' : idleDisabled} ${VARIANT[variant]} ${square ? SQUARE[size] : SIZE[size]} ${block ? 'w-full' : ''} ${className}`} {...rest}>
      {loading && (
        <>
          {/* A conic sweep spinning behind the face; the face covers all but a 3px rim. */}
          <span aria-hidden className="absolute left-1/2 top-1/2 w-[200%] aspect-square -translate-x-1/2 -translate-y-1/2">
            <span className="block w-full h-full animate-spin" style={{ background: 'conic-gradient(from 0deg, transparent 0 55%, var(--color-gold) 100%)' }} />
          </span>
          <span aria-hidden className="absolute inset-0.75 rounded-md bg-inherit" />
        </>
      )}
      <span className="relative z-1 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}
