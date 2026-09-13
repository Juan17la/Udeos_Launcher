import Dialog from './Dialog'
import { useApp } from '../state'

type Props = { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }

export default function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose, danger }: Props) {
  const { t } = useApp()
  return (
    <Dialog title={title} onClose={onClose} actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose}>{t.common.cancel}</button>
      <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
    </>}>
      {body}
    </Dialog>
  )
}
