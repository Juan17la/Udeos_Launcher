import { useState } from 'react'
import Button from '../ui/Button'
import { ConfirmDialog } from '../ui/Dialog'
import { useApp } from '../state'
import { api } from '../api/bridge'
import type { Instance } from '../api/types'

/** Save for settings read when a server starts. With unsaved changes on a
 *  running server it asks first, and stops the server once saved, so the
 *  next start uses them. onSave reports whether the save worked. */
export default function SaveSettingsButton({ inst, dirty, busy, label, onSave }: {
  inst: Instance; dirty: boolean; busy: boolean; label: string; onSave: () => Promise<boolean>
}) {
  const { t } = useApp()
  const [asking, setAsking] = useState(false)
  const stops = !!inst.server && inst.running && dirty
  const save = async () => {
    setAsking(false)
    if (await onSave() && stops) await api.StopServer(inst.id).catch(() => {}) // refused only while it still prepares its files
  }
  return (
    <>
      <Button variant="primary" loading={busy} onClick={stops ? () => setAsking(true) : save}>{label}</Button>
      {asking && (
        <ConfirmDialog title={t.servers.saveStop.title} body={t.servers.saveStop.body} confirmLabel={t.servers.saveStop.confirm}
          onConfirm={save} onClose={() => setAsking(false)} />
      )}
    </>
  )
}
