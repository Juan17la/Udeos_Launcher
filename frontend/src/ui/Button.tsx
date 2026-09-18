import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Button variants from the design system (docs/11-design-system.md):
 *  primary   — the minecraft.net button green (darker on hover in light, lighter in dark)
 *  idle      — the light Minecraft button: pastel light gray, for neutral
 *              actions and anything unselected
 *  danger    — pastel red
 *  ghost     — no fill, for inline links-as-buttons */
export type ButtonVariant = 'primary' | 'idle' | 'danger' | 'ghost'
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
  primary: 'bg-green text-white hover:bg-primary-hover shadow-neu active:shadow-neu-inset',
  idle: 'bg-idle text-ink hover:bg-idle-hover shadow-neu active:shadow-neu-inset',
  danger: 'bg-error/80 text-white hover:bg-error/90 shadow-neu active:shadow-neu-inset',
  ghost: 'bg-transparent text-text hover:bg-idle/40 active:bg-idle/60',
}

const base = 'relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer no-underline font-bold leading-[1.2] rounded-md border-0 transition-all duration-150 ease-in-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:shadow-none'
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
          <span aria-hidden className="absolute inset-[3px] rounded-md bg-inherit" />
        </>
      )}
      <span className="relative z-1 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}
