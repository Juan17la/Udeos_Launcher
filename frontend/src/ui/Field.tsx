import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Check } from './icons'

/** Form controls. A recessed neumorphic well with the universal radius;
 *  disabled keeps the same radius and padding and still shows its value —
 *  that is how a locked filter (Search with an instance in context) reads. */
const control = 'w-full px-4 py-2.5 text-sm text-text bg-panel rounded-md border-0 shadow-neu-inset caret-primary transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0 disabled:bg-idle disabled:text-text disabled:opacity-80 disabled:cursor-not-allowed disabled:shadow-none placeholder:text-muted'

export function Label({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-xs mb-2 text-muted ${className}`} {...rest} />
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...rest} />
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
