import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Loader'

/** Button variants from the design system (docs/architecture/design-system.md):
 *  primary:   the accent, solid: Play, Create, the one main action of a view
 *  secondary: raised neutral with a hairline: Manage, Open
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

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 h-8 text-[13px]',
  md: 'px-5 h-11 text-sm',
  lg: 'px-6 h-13 text-[15px]',
}
const SQUARE: Record<ButtonSize, string> = { sm: 'w-8 h-8', md: 'w-11 h-11', lg: 'w-13 h-13' }

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-primary disabled:bg-idle disabled:text-muted disabled:opacity-100',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-hover shadow-secondary',
  idle: 'bg-idle text-on-idle hover:bg-idle-hover',
  danger: 'bg-error/15 text-error-soft hover:bg-error hover:text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-error)_45%,transparent)]',
  ghost: 'bg-transparent text-text shadow-neu hover:bg-idle',
  inverse: 'bg-on-primary text-primary hover:bg-on-primary/88 shadow-neu',
}

/* No transform on hover and no permanent layer: a page of cards has dozens of
   buttons, and each one on its own compositing layer made long lists scroll
   badly in WebKitGTK (see panel-hover in tokens.css). Hover is colour only;
   press dims a touch. */
const base = 'relative inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer no-underline min-w-fit font-extrabold leading-none rounded-lg border-0 transition-[background-color,box-shadow,color,opacity] duration-150 active:opacity-85 disabled:pointer-events-none disabled:shadow-none'
const idleDisabled = 'disabled:opacity-45 disabled:cursor-not-allowed'

export default function Button({ variant = 'idle', size = 'md', block, square, loading, className = '', type = 'button', children, disabled, ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`${base} ${loading ? 'cursor-progress opacity-90' : idleDisabled} ${VARIANT[variant]} ${square ? SQUARE[size] : SIZE[size]} ${block ? 'w-full' : ''} ${className}`} {...rest}>
      {loading && <Spinner size={size === 'sm' ? 13 : 15} />}
      <span className={`inline-flex items-center gap-2 ${loading ? 'opacity-90' : ''}`}>{children}</span>
    </button>
  )
}
