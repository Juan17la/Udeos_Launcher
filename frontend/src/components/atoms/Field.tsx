import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Check, ChevronDown } from './icons'

/** Form controls: a flat well with a hairline; focus is the same 2px accent outline
 *  as every other control (tokens.css :focus-visible), not a glow ring.
 *  Disabled keeps the same size and still shows its value; that is how a
 *  locked filter (Search with an instance in context) reads. 40px, the height of
 *  a md Button, so a field and its button align. */
const control = 'w-full h-10 px-3.5 text-sm text-text bg-panel-2 rounded-md border-0 shadow-neu caret-primary transition-[box-shadow,background-color] hover:bg-idle focus:bg-panel-2 disabled:bg-idle disabled:text-text disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none placeholder:text-muted'

export function Label({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-xs font-medium mb-1.5 text-muted ${className}`} {...rest} />
}

/** icon: a small leading glyph in the primary colour, for a screen's main
 *  field (the Addons search, the AI chat); className then sizes the wrapper. */
export function Input({ className = '', icon, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (!icon) return <input className={`${control} ${className}`} {...rest} />
  return (
    <span className={`relative flex items-center ${className}`}>
      <span aria-hidden className="absolute left-3.5 flex text-muted pointer-events-none">{icon}</span>
      <input className={`${control} pl-10`} {...rest} />
    </span>
  )
}

/** Custom chevron instead of the native arrow, so the value never touches it (pr-11). */
export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative flex items-center ${className}`}>
      <select className={`${control} appearance-none pr-10 cursor-pointer`} {...rest} />
      <span aria-hidden className="absolute right-3.5 flex text-muted pointer-events-none"><ChevronDown /></span>
    </span>
  )
}

/** Checkbox: the accent when checked, a hairline box when not. The native
 *  input is kept (keyboard, forms) and visually replaced through Tailwind's
 *  peer variants. */
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: ReactNode }

export function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer text-sm select-none ${className}`}>
      <input type="checkbox" className="peer absolute w-0 h-0 opacity-0 pointer-events-none appearance-none rounded-md" {...rest} />
      <span className="w-5.5 h-5.5 flex-none inline-flex items-center justify-center rounded-sm bg-panel-2 text-on-idle shadow-neu transition-[background-color,box-shadow] peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <Check size={13} />
      </span>
      {label !== undefined && <span>{label}</span>}
    </label>
  )
}
