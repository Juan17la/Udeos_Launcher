import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../ui/Dialog'
import { useApp } from '../state'
import { api, on } from '../api/bridge'
import { fmt } from '../i18n/format'

/** Closing the window while servers run asks first ('app:close'); yes saves
 *  and stops every server, then the launcher quits. */
export default function CloseDialog() {
  const { t } = useApp()
  const [running, setRunning] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => on('app:close', (d) => setRunning(d.running)), [])
  if (!running) return null
  const quit = async () => { setBusy(true); await api.QuitLauncher() }
  return (
    <ConfirmDialog danger busy={busy} title={t.servers.close.title} body={fmt(t.servers.close.body, { n: running })} confirmLabel={t.servers.close.confirm}
      onConfirm={quit} onClose={() => setRunning(0)} />
  )
}
