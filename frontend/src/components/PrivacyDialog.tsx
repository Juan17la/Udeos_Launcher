import Dialog from './Dialog'
import { useApp } from '../state'

export default function PrivacyDialog() {
  const { t, privacyOpen, setPrivacyOpen } = useApp()
  if (!privacyOpen) return null
  const close = () => setPrivacyOpen(false)
  return (
    <Dialog title={t.privacy.title} onClose={close}
      actions={<button
        type="button"
        className="inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none"
        onClick={close}
      >{t.common.gotIt}</button>}>
      {t.privacy.body}
    </Dialog>
  )
}
