import { useEffect, useState } from 'react'
import ErrorMessage from './ErrorMessage'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import { useApp } from '../state'
import { api, openExternal } from '../api/bridge'
import type { Update } from '../api/types'
import { fmt } from '../i18n/format'
import { messageOf } from '../utils/errors'

/** Asks once per start when GitHub has a newer release: Update downloads and
 *  installs it (the launcher closes), Later hides it until the next start. */
export default function UpdateDialog() {
  const { t } = useApp()
  const [update, setUpdate] = useState<Update | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Offline or rate-limited: no prompt, nothing to report.
  useEffect(() => { api.CheckUpdate().then(setUpdate).catch(() => {}) }, [])
  if (!update) return null
  const install = async () => {
    setBusy(true); setError('')
    try { await api.InstallUpdate() } catch (e) { setError(messageOf(e)); setBusy(false) }
  }
  return (
    <Dialog title={t.update.title} onClose={() => { if (!busy) setUpdate(null) }} actions={<>
      <Button variant="ghost" disabled={busy} onClick={() => openExternal(update.url)}>{t.update.notes}</Button>
      <Button variant="idle" disabled={busy} onClick={() => setUpdate(null)}>{t.update.later}</Button>
      <Button variant="primary" loading={busy} onClick={install}>{t.update.confirm}</Button>
    </>}>
      <div className="flex flex-col gap-4">
        {fmt(t.update.body, { version: update.version })}
        {error && <ErrorMessage message={error} />}
      </div>
    </Dialog>
  )
}
