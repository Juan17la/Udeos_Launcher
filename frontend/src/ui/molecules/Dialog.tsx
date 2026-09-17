import { ReactNode, useEffect } from 'react'
import { Glass } from '../atoms/Surface'

type Props = { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; width?: number }

/** Modal dialog on a blurred backdrop: a glass panel, closed by clicking
 *  outside or pressing Escape. */
export default function Dialog({ title, children, actions, onClose, width }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 grid place-items-center z-9000 p-4 bg-black/30 backdrop-blur-[4px]" onClick={onClose}>
      <Glass
        role="dialog" aria-modal="true"
        className="relative z-9001 p-6 animate-[dialog-fade_0.15s_ease-in-out]"
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${width ?? 440}px, 100%)` }}
      >
        <div className="text-xl font-bold leading-[1.2]">{title}</div>
        <div className="text-sm">{children}</div>
        <div className="flex justify-end gap-4">{actions}</div>
      </Glass>
    </div>
  )
}
