import { useEffect, useState } from 'react'
import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'

/** The launch as the player needs it: which instance, one percentage, a
 *  short phase name and a note when it will be slow (a first install of the
 *  version, or Forge/NeoForge patching the game). Phases with a file count report real numbers; the ones
 *  that don't (version info, the loader installer) tick a simulated counter. */
export function useLaunchProgress() {
  const { t, instances } = useApp()
  const { launch } = useLaunch()
  const preparing = launch.status === 'preparing'
  const p = preparing ? launch.progress : null
  const measurable = !!p && p.total > 0 && p.phase !== 'done'
  const phase = (p?.phase ?? 'version') as keyof typeof t.launch.phases
  const simulated = useSimulatedProgress(preparing && !measurable ? `${launch.instanceId}:${phase}` : null)
  const inst = preparing ? instances.find((i) => i.id === launch.instanceId) : undefined
  const pct = Math.round(measurable ? (p!.done / p!.total) * 100 : phase === 'done' ? 100 : (simulated ?? 0))
  const label = phase === 'done' ? t.launch.starting : (t.launch.phases[phase] ?? phase)
  const firstInstall = !!inst && !inst.installed
  const note = phase === 'loader' && (inst?.loader === 'Forge' || inst?.loader === 'NeoForge') ? fmt(t.launch.loaderTakesAWhile, { loader: inst.loader })
    : firstInstall ? fmt(t.launch.firstInstall, { version: inst.version }) : ''
  return { inst, pct, label, note, firstInstall }
}

// Start of the current simulated run, outside React: minimizing swaps the
// modal for the toast, and the counter must carry on, not restart at 0.
let sim = { key: '', start: 0 }

/** A counter for phases with no measurable progress: while `key` is set it
 *  eases from 0 towards 90 (restarting when the key changes), otherwise null. */
function useSimulatedProgress(key: string | null): number | null {
  const [value, setValue] = useState<number | null>(null)
  useEffect(() => {
    if (!key) { setValue(null); return }
    if (sim.key !== key) sim = { key, start: performance.now() }
    let frame = requestAnimationFrame(function tick(now) {
      setValue(90 * (1 - Math.exp(-2.2 * (now - sim.start) / 1500)))
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [key])
  return value
}
