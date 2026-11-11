import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Loader'

/** Button variants from the design system (docs/architecture/design-system.md):
 *  primary:   the accent, solid: Play, Create, the one main action of a view
 *  secondary: neutral with a hairline: the quiet card action (Play, Start, Add, with a blue glyph)
 *  idle:      quiet neutral fill, for anything unselected
 *  danger:    destructive actions
 *  ghost:     hairline outline, no fill
 *  inverse:   the main action on an accent surface (panel-feature): on-primary fill, accent text */
export type ButtonVariant = 'primary' | 'secondary' | 'idle' | 'danger' | 'ghost' | 'inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Full width. */
  block?: boolean
  /** Icon-only: equal sides, padding still wider than tall. */
  square?: boolean
  /** Working: disabled, a spinner replaces the leading icon, the label stays. */
  loading?: boolean
  children?: ReactNode
}

/* One control scale shared with fields, the launch strip and the Playing chip: 32/40/48.
   A small square (Stop, Close, Remove) keeps a 40px hit area through its ::after. */
const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 h-8 text-[13px]',
  md: 'px-4 h-10 text-sm',
  lg: 'px-5 h-12 text-[15px]',
}
const SQUARE: Record<ButtonSize, string> = { sm: "w-8 h-8 after:absolute after:-inset-1 after:content-['']", md: 'w-10 h-10', lg: 'w-12 h-12' }

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-primary disabled:bg-idle disabled:text-muted disabled:opacity-100',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-hover shadow-secondary',
  idle: 'bg-idle text-on-idle hover:bg-idle-hover shadow-edge',
  danger: 'bg-error/15 text-error-soft hover:bg-error/25 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-error)_45%,transparent)]',
  ghost: 'bg-transparent text-text shadow-neu hover:bg-idle',
  inverse: 'bg-on-primary text-primary hover:bg-on-primary/88 shadow-neu',
}

/* No transform on hover and no permanent layer: a page of cards has dozens of
   buttons, and each one on its own compositing layer made long lists scroll
   badly in WebKitGTK (see panel-hover in tokens.css). Hover is colour only. The
   filled variants stand on a darker bottom edge, like a block's lower face, and a
   press swaps it for an inset top edge: the button reads as pushed in. */
const base = 'relative inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer no-underline min-w-fit font-bold leading-none rounded-md border-0 transition-[background-color,box-shadow,color,opacity] active:shadow-press disabled:pointer-events-none disabled:shadow-none'
const idleDisabled = 'disabled:opacity-45 disabled:cursor-not-allowed'

export default function Button({ variant = 'idle', size = 'md', block, square, loading, className = '', type = 'button', children, disabled, ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`${base} ${loading ? 'cursor-progress opacity-90' : idleDisabled} ${VARIANT[variant]} ${square ? SQUARE[size] : SIZE[size]} ${block ? 'w-full' : ''} ${className}`} {...rest}>
      {loading && <Spinner />}
      <span className={`inline-flex items-center gap-2 ${loading ? 'opacity-90' : ''}`}>{children}</span>
    </button>
  )
}
