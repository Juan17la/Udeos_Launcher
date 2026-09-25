import { useEffect, useState } from 'react'
import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { api } from '../api/bridge'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import InstanceIcon from './InstanceIcon'

/** While Play prepares the game: a loading modal (the instance's block
 *  hopping, a striped bar, the percentage), which Hide or Escape shrinks to a
 *  notification. Afterwards: why the game did not start, or why it closed. */
export default function LaunchDialog() {
  const { t } = useApp()
  const { launch, dismissLaunch } = useLaunch()
  if (launch.status === 'preparing') return launch.minimized ? null : <LoadingModal />
  if (launch.status !== 'error' && launch.status !== 'exited') return null
  const error = launch.status === 'error'
  return (
    <Dialog title={error ? t.errors.launchFailed : t.errors.gameCrashed} onClose={dismissLaunch} actions={<>
      {launch.status === 'exited' && <Button variant="idle" onClick={() => api.OpenInstanceFolder(launch.instanceId, 'logs')}>{t.launch.openLogs}</Button>}
      <Button variant="primary" onClick={dismissLaunch}>{t.common.gotIt}</Button>
    </>}>
      {error ? (
        <p className="m-0 text-xs text-muted break-words">{launch.message}</p>
      ) : (
        <div className="flex flex-col gap-2 text-xs text-muted">
          <span>{fmt(t.launch.exitBody, { code: launch.exitCode })}</span>
          <code className="break-all select-text">{launch.logPath}</code>
        </div>
      )}
    </Dialog>
  )
}

function LoadingModal() {
  const { t } = useApp()
  const { minimizeLaunch } = useLaunch()
  const { inst, pct, label, slowLoader } = useLaunchProgress()
  if (!inst) return null
  return (
    <Dialog title={inst.name} onClose={minimizeLaunch} actions={<Button variant="idle" onClick={minimizeLaunch}>{t.launch.hide}</Button>}>
      <div className="flex flex-col items-center gap-6 pt-2">
        <div className="flex flex-col items-center">
          <div className="motion-safe:animate-[block-hop_1.1s_ease-in-out_infinite]"><InstanceIcon inst={inst} size={72} /></div>
          <div className="w-14 h-2 mt-2 rounded-md bg-black/15 motion-safe:animate-[block-shadow_1.1s_ease-in-out_infinite]" />
        </div>
        <div className="flex gap-2">
          <span className="tag bg-green-soft">{inst.version}</span>
          <span className="tag bg-gold-soft">{inst.loaderLabel}</span>
        </div>
        <div className="w-full flex flex-col gap-2">
          <div className="h-4 rounded-md bg-idle/60 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-md bg-primary motion-safe:animate-[bar-stripes_0.8s_linear_infinite]"
              style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.25) 25%, transparent 25% 50%, rgba(255,255,255,.25) 50% 75%, transparent 75%)', backgroundSize: '24px 24px' }} />
          </div>
          <div className="flex justify-between gap-4 text-xs text-muted">
            <span className="truncate">{label}</span>
            <span className="tabular-nums font-bold text-text">{pct}%</span>
          </div>
        </div>
        {slowLoader && <p className="m-0 text-xs text-muted text-center">{fmt(t.launch.loaderTakesAWhile, { loader: inst.loader })}</p>}
      </div>
    </Dialog>
  )
}

/** The launch as the player needs it: which instance, one percentage and a
 *  short phase name. Phases with a file count report real numbers; the ones
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
  const slowLoader = phase === 'loader' && (inst?.loader === 'Forge' || inst?.loader === 'NeoForge')
  return { inst, pct, label, slowLoader }
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
