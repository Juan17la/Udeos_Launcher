import Dialog from '../ui/molecules/Dialog'
import Button from '../ui/atoms/Button'
import { useApp } from '../state'

export default function PrivacyDialog() {
  const { t, privacyOpen, setPrivacyOpen } = useApp()
  if (!privacyOpen) return null
  const close = () => setPrivacyOpen(false)
  return (
    <Dialog title={t.privacy.title} onClose={close} actions={<Button variant="primary" onClick={close}>{t.common.gotIt}</Button>}>
      {t.privacy.body}
    </Dialog>
  )
}
