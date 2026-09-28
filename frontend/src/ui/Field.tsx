import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Check } from './icons'

/** Form controls. A recessed neumorphic well with the universal radius and a
 *  border that is always there in a light tint of the primary colour, a
 *  deeper tint on hover, and the full colour on focus — where a soft ring
 *  pulses once (focus-pulse) so the eye lands on the field. Disabled keeps
 *  the same radius and padding and still shows its value — that is how a
 *  locked filter (Search with an instance in context) reads. py-2 + the 2px
 *  border keep the height of a md Button. */
const control = 'w-full px-4 py-2 text-sm text-text bg-panel rounded-md border-2 border-primary/40 shadow-neu-inset caret-primary transition-all duration-150 ease-in-out hover:border-primary/70 focus:border-primary focus:shadow-focus focus:outline-none motion-safe:focus:animate-[focus-pulse_0.45s_ease-out] disabled:bg-idle disabled:border-transparent disabled:text-text disabled:opacity-80 disabled:cursor-not-allowed disabled:shadow-none placeholder:text-muted'

export function Label({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-xs mb-2 text-muted ${className}`} {...rest} />
}

/** icon: a small leading glyph in the primary colour, for a screen's main
 *  field (the Addons search, the AI chat) — className then sizes the wrapper. */
export function Input({ className = '', icon, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (!icon) return <input className={`${control} ${className}`} {...rest} />
  return (
    <span className={`relative flex items-center ${className}`}>
      <span aria-hidden className="absolute left-4 flex text-primary pointer-events-none">{icon}</span>
      <input className={`${control} pl-11`} {...rest} />
    </span>
  )
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} appearance-auto ${className}`} {...rest} />
}

/** Checkbox: green when checked, the light Minecraft gray when not, raised
 *  either way like a button (the inset shadow's white light would fade the
 *  green into a gradient). The native input is kept (keyboard, forms) and
 *  visually replaced through Tailwind's peer variants. */
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: ReactNode }

export function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer text-sm select-none ${className}`}>
      <input type="checkbox" className="peer absolute w-0 h-0 opacity-0 pointer-events-none appearance-none rounded-md" {...rest} />
      <span className="w-7 h-7 flex-none inline-flex items-center justify-center rounded-md bg-idle text-text shadow-neu transition-all duration-150 ease-in-out peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <Check size={14} />
      </span>
      {label !== undefined && <span>{label}</span>}
    </label>
  )
}
