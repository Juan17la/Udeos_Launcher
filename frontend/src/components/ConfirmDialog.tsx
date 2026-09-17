import Dialog from './Dialog'
import { useApp } from '../state'

type Props = { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnDanger = 'bg-mc-danger border-mc-danger-border text-mc-danger-text shadow-[inset_0_-2px_0_var(--mc-danger-bottom)] hover:bg-mc-danger-hover active:bg-mc-danger-active active:shadow-none'

export default function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose, danger }: Props) {
  const { t } = useApp()
  return (
    <Dialog title={title} onClose={onClose} actions={<>
      <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={onClose}>{t.common.cancel}</button>
      <button type="button" className={`${btnBase} ${danger ? btnDanger : btnPrimary}`} onClick={onConfirm}>{confirmLabel}</button>
    </>}>
      {body}
    </Dialog>
  )
}
