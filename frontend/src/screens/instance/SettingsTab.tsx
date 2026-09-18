import { useState } from 'react'
import Button from '../../ui/Button'
import { Input, Label } from '../../ui/Field'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { messageOf } from '../../utils/errors'
import { Feedback } from './TabParts'
import type { Instance } from '../../api/types'

/** The instance's own JVM settings: heap size, Java executable and extra
 *  flags. Empty fields mean the launcher's defaults (the profile's memory,
 *  the managed runtime, no extra flags). */
export default function SettingsTab({ inst }: { inst: Instance }) {
  const { t, profile, refreshInstances } = useApp()
  const [memory, setMemory] = useState(inst.launch.maxMemoryMB ? String(inst.launch.maxMemoryMB) : '')
  const [java, setJava] = useState(inst.launch.javaPath ?? '')
  const [jvmArgs, setJvmArgs] = useState(inst.launch.jvmArgs ?? '')
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickJava = async () => { const p = await api.PickJava(); if (p) setJava(p) }
  const save = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      await api.SetInstanceLaunch(inst.id, { maxMemoryMB: Number(memory) || 0, javaPath: java.trim(), jvmArgs: jvmArgs.trim() })
      await refreshInstances()
      setNote(t.instance.settings.saved)
    } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-1">{t.instance.settings.title}</h4>
        <p className="m-0 text-sm text-muted">{t.instance.settings.subtitle}</p>
      </div>
      <div className="panel flex flex-col gap-6 p-6">
        <div>
          <Label htmlFor="launch-memory">{t.instance.settings.memory}</Label>
          <Input id="launch-memory" type="number" min={512} step={256} placeholder={String(profile?.maxMemoryMB ?? 2048)} value={memory} onChange={(e) => setMemory(e.target.value)} />
          <p className="m-0 mt-2 text-xs text-muted">{fmt(t.instance.settings.memoryHint, { mb: profile?.maxMemoryMB ?? 2048 })}</p>
        </div>
        <div>
          <Label htmlFor="launch-java">{t.instance.settings.java}</Label>
          <div className="flex gap-4">
            <Input id="launch-java" type="text" placeholder={t.instance.settings.javaPlaceholder} value={java} onChange={(e) => setJava(e.target.value)} />
            <Button variant="idle" onClick={pickJava}>{t.instance.settings.pickJava}</Button>
          </div>
          <p className="m-0 mt-2 text-xs text-muted">{t.instance.settings.javaHint}</p>
        </div>
        <div>
          <Label htmlFor="launch-args">{t.instance.settings.jvmArgs}</Label>
          <Input id="launch-args" type="text" placeholder={t.instance.settings.jvmArgsPlaceholder} value={jvmArgs} onChange={(e) => setJvmArgs(e.target.value)} spellCheck={false} />
          <p className="m-0 mt-2 text-xs text-muted">{t.instance.settings.jvmArgsHint}</p>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" loading={busy} onClick={save}>{t.instance.settings.save}</Button>
        </div>
      </div>
      <Feedback error={error} note={note} onClearNote={() => setNote(null)} />
    </div>
  )
}
