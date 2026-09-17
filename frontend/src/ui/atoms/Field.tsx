import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from 'react'

/** Form controls. A recessed neumorphic well with the universal radius;
 *  disabled keeps the same radius and padding and still shows its value —
 *  that is how a locked filter (Search with an instance in context) reads. */
const control = 'w-full px-4 py-2.5 text-sm text-text bg-panel rounded-md border-0 shadow-neu-inset caret-green transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-0 disabled:bg-idle disabled:text-ink disabled:opacity-80 disabled:cursor-not-allowed disabled:shadow-none placeholder:text-muted'

export function Label({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-xs mb-2 text-muted ${className}`} {...rest} />
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...rest} />
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} appearance-auto ${className}`} {...rest} />
}
