import { ReactNode, useEffect } from 'react'
import { Glass } from './Panel'
import Button from './Button'
import { useApp } from '../state'

type Props = { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; width?: number }

/** Modal dialog on a blurred backdrop: a glass panel, closed by clicking
 *  outside or pressing Escape. */
export default function Dialog({ title, children, actions, onClose, width = 440 }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 grid place-items-center z-9000 p-4 bg-black/30 backdrop-blur-[4px]" onClick={onClose}>
      <Glass
        role="dialog" aria-modal="true"
        className="relative z-9001 flex flex-col gap-4 p-6 animate-[dialog-fade_0.15s_ease-in-out]"
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${width}px, 100%)` }}
      >
        <div className="text-xl font-bold leading-[1.2]">{title}</div>
        <div className="text-sm">{children}</div>
        <div className="flex justify-end gap-4">{actions}</div>
      </Glass>
    </div>
  )
}

type ConfirmProps = { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }

/** Yes/no question; `danger` paints the confirm button red (deletes). */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose, danger }: ConfirmProps) {
  const { t } = useApp()
  return (
    <Dialog title={title} onClose={onClose} actions={<>
      <Button variant="idle" onClick={onClose}>{t.common.cancel}</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
    </>}>
      {body}
    </Dialog>
  )
}
