import { ReactNode, useEffect } from 'react'

type Props = { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; width?: number }

/** Modal dialog: click on the backdrop or press Escape to close. */
export default function Dialog({ title, children, actions, onClose, width }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 grid place-items-center z-9000 p-4 bg-[color-mix(in_srgb,var(--color-neutral-900)_50%,transparent)]"
      onClick={onClose}
    >
      <div
        className="relative z-9001 flex flex-col gap-3 p-4 rounded-lg bg-surface shadow-lg animate-[dialog-fade_0.12s_ease-out]"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${width ?? 440}px, 100%)` }}
      >
        <div className="font-heading font-extrabold text-xl">{title}</div>
        <div className="text-sm opacity-85">{children}</div>
        <div className="flex justify-end gap-2 mt-2">{actions}</div>
      </div>
    </div>
  )
}
