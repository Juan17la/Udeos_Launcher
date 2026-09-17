import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { Check } from '../icons'

/** Toggle button: Minecraft green when selected, the light Minecraft gray when
 *  not. Used for tabs, radio-like choices, nav links and icon pickers. */
type SelectableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean
  /** Icon-only cell (icon pickers): equal sides. */
  square?: boolean
  children?: ReactNode
}

export function Selectable({ selected, square, className = '', type = 'button', children, ...rest }: SelectableProps) {
  return (
    <button
      type={type}
      aria-pressed={rest.role === 'radio' ? undefined : selected}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer font-bold leading-[1.2] text-[13px] rounded-md border-0 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed ${square ? 'px-2.5 py-2' : 'px-4 py-2'} ${selected ? 'bg-green text-white shadow-neu-inset' : 'bg-idle text-ink hover:bg-idle-hover shadow-neu'} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Checkbox with the same selected/unselected colours. The native input is
 *  kept (keyboard, forms) and visually replaced through Tailwind's peer
 *  variants. The box is 28px so the universal 15px radius still reads as a
 *  rounded square rather than a circle. */
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: ReactNode }

export function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer text-sm select-none ${className}`}>
      <input type="checkbox" className="peer absolute w-0 h-0 opacity-0 pointer-events-none appearance-none rounded-md" {...rest} />
      <span className="w-7 h-7 flex-none inline-flex items-center justify-center rounded-md bg-idle text-ink shadow-neu transition-all duration-150 ease-in-out peer-checked:bg-green peer-checked:text-white peer-checked:shadow-neu-inset peer-focus-visible:outline-2 peer-focus-visible:outline-green peer-focus-visible:outline-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <Check size={14} />
      </span>
      {label !== undefined && <span>{label}</span>}
    </label>
  )
}
