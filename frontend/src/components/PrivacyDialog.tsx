import Dialog from './Dialog'
import { useApp } from '../state'

export default function PrivacyDialog() {
  const { t, privacyOpen, setPrivacyOpen } = useApp()
  if (!privacyOpen) return null
  const close = () => setPrivacyOpen(false)
  return (
    <Dialog title={t.privacy.title} onClose={close}
      actions={<button type="button" className="btn btn-primary" onClick={close}>{t.common.gotIt}</button>}>
      {t.privacy.body}
    </Dialog>
  )
}
