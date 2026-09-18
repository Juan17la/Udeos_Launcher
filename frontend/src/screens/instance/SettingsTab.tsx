import { useEffect, useState } from 'react'
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
  const defaultMB = profile?.maxMemoryMB ?? 2048
  // 0 = the profile default; the slider then sits on that value.
  const [memory, setMemory] = useState(inst.launch.maxMemoryMB ?? 0)
  const [totalMB, setTotalMB] = useState(0)
  useEffect(() => { api.GetAppInfo().then((i) => setTotalMB(i.totalMemoryMB)).catch(() => {}) }, [])
  // The slider stops at the machine's RAM (16 GB when unknown), in 256 MB steps.
  const maxMB = Math.max(2048, Math.floor((totalMB || 16384) / 256) * 256)
  const mb = memory || defaultMB
  // Danger zone: too little for the game, or too little left for everything else.
  const tooLow = mb < 1024
  const tooHigh = totalMB > 0 && mb > totalMB - 2048
  const danger = tooLow || tooHigh
  const [java, setJava] = useState(inst.launch.javaPath ?? '')
  const [jvmArgs, setJvmArgs] = useState(inst.launch.jvmArgs ?? '')
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickJava = async () => { const p = await api.PickJava(); if (p) setJava(p) }
  const save = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      await api.SetInstanceLaunch(inst.id, { maxMemoryMB: memory, javaPath: java.trim(), jvmArgs: jvmArgs.trim() })
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
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <Label htmlFor="launch-memory" className="mb-0">{t.instance.settings.memory}</Label>
            <span className={`text-sm font-bold tabular-nums ${danger ? 'text-error-soft' : ''}`}>{fmt(t.instance.settings.memoryValue, { mb, total: totalMB || '?' })}</span>
          </div>
          {/* Native range: the track/thumb take the accent colour, red inside the danger zone. */}
          <input id="launch-memory" type="range" min={512} max={maxMB} step={256} value={mb} onChange={(e) => setMemory(Number(e.target.value))}
            className={`w-full h-2 cursor-pointer ${danger ? 'accent-error' : 'accent-green'}`} />
          <div className="flex justify-between text-[11px] text-muted"><span>512 MB</span><span>{maxMB} MB</span></div>
          <p className={`m-0 mt-2 text-xs ${danger ? 'text-error-soft' : 'text-muted'}`}>
            {tooLow ? t.instance.settings.memoryTooLow : tooHigh ? t.instance.settings.memoryTooHigh : fmt(t.instance.settings.memoryHint, { mb: defaultMB })}
          </p>
          {memory !== 0 && <Button variant="ghost" size="sm" className="-ml-4 mt-1" onClick={() => setMemory(0)}>{fmt(t.instance.settings.memoryDefault, { mb: defaultMB })}</Button>}
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
