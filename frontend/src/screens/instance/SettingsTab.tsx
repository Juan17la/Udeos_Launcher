import { useEffect, useState } from 'react'
import Button from '../../ui/Button'
import SaveSettingsButton from '../../components/SaveSettingsButton'
import { Input, Label } from '../../ui/Field'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { messageOf } from '../../utils/errors'
import { Feedback } from './TabParts'
import type { Instance } from '../../api/types'

/** The instance's own JVM settings: heap size, Java executable and extra
 *  flags. Empty fields mean the launcher's defaults (the profile's memory,
 *  the managed runtime, no extra flags). A hook, so a server's settings page
 *  can fold these into its own single Save. */
export function useLaunchForm(inst: Instance) {
  const { profile, refreshInstances } = useApp()
  const defaultMB = profile?.maxMemoryMB ?? 2048
  // 0 = the profile default; the slider then sits on that value.
  const [memory, setMemory] = useState(inst.launch.maxMemoryMB ?? 0)
  const [totalMB, setTotalMB] = useState(0)
  useEffect(() => { api.GetAppInfo().then((i) => setTotalMB(i.totalMemoryMB)).catch(() => {}) }, [])
  const [java, setJava] = useState(inst.launch.javaPath ?? '')
  const [jvmArgs, setJvmArgs] = useState(inst.launch.jvmArgs ?? '')
  const dirty = memory !== (inst.launch.maxMemoryMB ?? 0) || java.trim() !== (inst.launch.javaPath ?? '') || jvmArgs.trim() !== (inst.launch.jvmArgs ?? '')
  const save = async () => {
    await api.SetInstanceLaunch(inst.id, { maxMemoryMB: memory, javaPath: java.trim(), jvmArgs: jvmArgs.trim() })
    await refreshInstances()
  }
  return { memory, setMemory, totalMB, defaultMB, java, setJava, jvmArgs, setJvmArgs, dirty, save }
}
export type LaunchForm = ReturnType<typeof useLaunchForm>

/** Memory as three presets plus the slider; Java and extra flags hide under Advanced. */
export function LaunchFields({ form }: { form: LaunchForm }) {
  const { t } = useApp()
  const s = t.instance.settings
  const { memory, setMemory, totalMB, defaultMB, java, setJava, jvmArgs, setJvmArgs } = form
  // The slider stops at the machine's RAM (16 GB when unknown), in 256 MB steps.
  const maxMB = Math.max(2048, Math.floor((totalMB || 16384) / 256) * 256)
  const mb = memory || defaultMB
  // Danger zone: too little for the game, or too little left for everything else.
  const tooLow = mb < 1024
  const tooHigh = totalMB > 0 && mb > totalMB - 2048
  const danger = tooLow || tooHigh
  const pickJava = async () => { const p = await api.PickJava(); if (p) setJava(p) }
  return (
    <>
      <div>
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <Label htmlFor="launch-memory" className="mb-0">{s.memory}</Label>
          <span className={`text-sm font-bold tabular-nums ${danger ? 'text-error-soft' : ''}`}>{fmt(s.memoryValue, { mb, total: totalMB || '?' })}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {([['small', 2048], ['medium', 4096], ['large', 8192]] as const).map(([k, size]) => (
            <Button key={k} size="sm" variant={mb === size ? 'primary' : 'idle'} disabled={size > maxMB} onClick={() => setMemory(size)}>{s.presets[k]} · {size / 1024} GB</Button>
          ))}
        </div>
        {/* Native range: the track/thumb take the accent colour, red inside the danger zone. */}
        <input id="launch-memory" type="range" min={512} max={maxMB} step={256} value={mb} onChange={(e) => setMemory(Number(e.target.value))}
          className={`w-full h-2 cursor-pointer ${danger ? 'accent-error' : 'accent-primary'}`} />
        <div className="flex justify-between text-[11px] text-muted"><span>512 MB</span><span>{maxMB} MB</span></div>
        <div className="flex items-center justify-between gap-4 mt-4">
          <p className={`m-0 text-sm ${danger ? 'text-error-soft' : 'text-muted'}`}>
            {tooLow ? s.memoryTooLow : tooHigh ? s.memoryTooHigh : fmt(s.memoryHint, { mb: defaultMB })}
          </p>
          {memory !== 0 && <Button variant="primary" size="sm" onClick={() => setMemory(0)}>{fmt(s.memoryDefault, { mb: defaultMB })}</Button>}
        </div>
      </div>
      <details className="group">
        <summary className="cursor-pointer text-sm font-bold select-none">{s.advanced}</summary>
        <div className="flex flex-col gap-6 mt-4">
          <div>
            <Label htmlFor="launch-java">{s.java}</Label>
            <div className="flex gap-4">
              <Input id="launch-java" type="text" placeholder={s.javaPlaceholder} value={java} onChange={(e) => setJava(e.target.value)} />
              <Button variant="idle" onClick={pickJava}>{s.pickJava}</Button>
            </div>
            <p className="m-0 mt-4 text-sm text-muted">{s.javaHint}</p>
          </div>
          <div>
            <Label htmlFor="launch-args">{s.jvmArgs}</Label>
            <Input id="launch-args" type="text" placeholder={s.jvmArgsPlaceholder} value={jvmArgs} onChange={(e) => setJvmArgs(e.target.value)} spellCheck={false} />
            <p className="m-0 mt-4 text-sm text-muted">{s.jvmArgsHint}</p>
          </div>
        </div>
      </details>
    </>
  )
}

export default function SettingsTab({ inst }: { inst: Instance }) {
  const { t } = useApp()
  const form = useLaunchForm(inst)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true); setError(null); setNote(null)
    try { await form.save(); setNote(t.instance.settings.saved); return true } catch (e) { setError(messageOf(e)); return false } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-1">{t.instance.settings.title}</h4>
        <p className="m-0 text-sm text-muted">{t.instance.settings.subtitle}</p>
      </div>
      <div className="panel flex flex-col gap-6 p-6">
        <LaunchFields form={form} />
        <div className="flex justify-end">
          <SaveSettingsButton inst={inst} dirty={form.dirty} busy={busy} label={t.instance.settings.save} onSave={save} />
        </div>
      </div>
      <Feedback error={error} note={note} onClearNote={() => setNote(null)} />
    </div>
  )
}
