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
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={width ? { width: `min(${width}px, 100%)` } : undefined}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  )
}
