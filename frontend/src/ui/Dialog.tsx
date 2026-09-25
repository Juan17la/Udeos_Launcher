import { ReactNode, useEffect, useRef } from 'react'
import Button from './Button'
import { useApp } from '../state'

type Props = { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; width?: number }

/** Modal dialog: a native <dialog> (top layer, focus trap, Escape) on a
 *  blurred backdrop, as a glass panel; clicking the backdrop closes it. */
export default function Dialog({ title, children, actions, onClose, width = 440 }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return (
    <dialog ref={ref} onCancel={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }}
      className="glass p-0 m-auto max-w-[calc(100%-2rem)] text-text animate-[dialog-fade_0.15s_ease-in-out] backdrop:bg-black/30 backdrop:backdrop-blur-xs"
      style={{ width }}>
      {/* The padding lives on an inner block so a click on it is not a click on the backdrop. */}
      <div className="flex flex-col gap-4 p-6">
        <div className="text-xl font-bold leading-[1.2]">{title}</div>
        <div className="text-sm">{children}</div>
        <div className="flex justify-end gap-4">{actions}</div>
      </div>
    </dialog>
  )
}

type ConfirmProps = { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean; busy?: boolean }

/** Yes/no question; `danger` paints the confirm button red (deletes), `busy`
 *  spins it while the answer is being carried out. */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose, danger, busy }: ConfirmProps) {
  const { t } = useApp()
  return (
    <Dialog title={title} onClose={onClose} actions={<>
      <Button variant="idle" disabled={busy} onClick={onClose}>{t.common.cancel}</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
    </>}>
      {body}
    </Dialog>
  )
}
