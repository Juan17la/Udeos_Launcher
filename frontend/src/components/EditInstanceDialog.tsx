import { useState } from 'react'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Field'
import StatusMessage from '../ui/StatusMessage'
import IconPicker from './IconPicker'
import InstanceIcon from './InstanceIcon'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { INSTANCE_NAME } from '../utils/validation'
import { errorHeadline, messageOf } from '../utils/errors'
import { serverIconPNG } from '../utils/serverIcon'
import type { Instance } from '../api/types'

/** Rename an instance and pick its icon. An instance made from a modpack
 *  can keep the pack's own icon (the first cell). */
export default function EditInstanceDialog({ inst, onClose }: { inst: Instance; onClose: () => void }) {
  const { t, refreshInstances } = useApp()
  const [name, setName] = useState(inst.name)
  const [icon, setIcon] = useState(inst.icon)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const valid = INSTANCE_NAME.test(name)

  const save = async () => {
    if (!valid) return
    setBusy(true); setError(null)
    try {
      await api.SetInstanceInfo(inst.id, INSTANCE_NAME.normalize(name), icon)
      if (inst.server) await api.SetServerIcon(inst.id, await serverIconPNG(icon))
      await refreshInstances()
      onClose()
    } catch (e) { setError(messageOf(e)); setBusy(false) }
  }

  return (
    <Dialog title={t.instance.edit} width={560} onClose={onClose} actions={<>
      <Button variant="idle" onClick={onClose}>{t.common.cancel}</Button>
      <Button variant="primary" disabled={!valid} loading={busy} onClick={save}>{t.common.save}</Button>
    </>}>
      <div className="flex flex-col gap-6">
        <div>
          <Label htmlFor="edit-name">{t.create.name}</Label>
          <Input id="edit-name" type="text" value={name} maxLength={INSTANCE_NAME.maxLength} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} />
        </div>
        <div className="flex flex-col gap-4">
          <Label className="mb-0">{t.create.icon}</Label>
          <IconPicker value={icon} onChange={setIcon} extra={inst.icon === 'modpack' ? <InstanceIcon inst={inst} size={32} /> : undefined} />
        </div>
        {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} />}
      </div>
    </Dialog>
  )
}
