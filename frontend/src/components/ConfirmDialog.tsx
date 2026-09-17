import Dialog from '../ui/molecules/Dialog'
import Button from '../ui/atoms/Button'
import { useApp } from '../state'

type Props = { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }

export default function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose, danger }: Props) {
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
