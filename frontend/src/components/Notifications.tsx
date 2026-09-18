import { useEffect, useState } from 'react'
import { useApp, useContent, useLaunch } from '../state'
import type { ContentJob } from '../state'
import { fmt } from '../i18n/format'
import { bytes } from '../utils/format'
import { errorHeadline } from '../utils/errors'
import StatusMessage from '../ui/StatusMessage'

/** Notifications slide in from the right edge. */
const slide = 'animate-[toast-in_0.15s_ease-in-out]'

/** Bottom-right notification stack: the game install that Play kicked off
 *  (a live percentage, non-blocking — the Play button itself shows the
 *  loading ring) and content installs from the Addons page (percentage
 *  while downloading, a short "Added" note that clears itself, or a
 *  rejection headline with the reason underneath that stays until
 *  dismissed). Lives outside every screen so nothing is lost on navigation. */
export default function Notifications() {
  const { jobs } = useContent()
  const { launch } = useLaunch()
  const launching = launch.status === 'preparing'
  if (jobs.length === 0 && !launching) return null
  return (
    <div className="fixed bottom-4 right-4 z-9100 flex flex-col gap-4 w-80 max-w-[calc(100vw-2rem)]" aria-live="polite">
      {launching && <LaunchToast />}
      {jobs.map((j) => <JobToast key={j.id} job={j} />)}
    </div>
  )
}

function LaunchToast() {
  const { t, instances } = useApp()
  const { launch } = useLaunch()
  const p = launch.status === 'preparing' ? launch.progress : null
  // Phases with a file count report real numbers; the ones that don't
  // (reading version info, the loader installer) tick a simulated counter
  // so the percentage is never missing.
  const measurable = !!p && p.total > 0 && p.phase !== 'done'
  const simulated = useSimulatedProgress(launch.status === 'preparing' && !measurable)
  if (launch.status !== 'preparing') return null
  const inst = instances.find((i) => i.id === launch.instanceId)
  const phase = (p?.phase ?? 'version') as keyof typeof t.launch.phases
  const label = phase === 'done' ? t.launch.starting : (t.launch.phases[phase] ?? phase)
  const pct = Math.round(measurable ? (p!.done / p!.total) * 100 : phase === 'done' ? 100 : (simulated ?? 0))
  const counts = measurable ? ` · ${p!.done}/${p!.total}${p!.totalBytes > 0 ? ` · ${bytes(p!.bytes)}` : ''}` : ''
  return (
    <StatusMessage className={slide} headline={fmt(t.launch.preparing, { name: inst?.name ?? '' })} aside={`${pct}%`} percent={pct} detail={<>
      <div>{label}{counts}</div>
      {p?.current && <div className="overflow-hidden text-ellipsis whitespace-nowrap">{p.current}</div>}
      <div>{phase === 'loader' && (inst?.loader === 'Forge' || inst?.loader === 'NeoForge') ? fmt(t.launch.loaderTakesAWhile, { loader: inst.loader }) : t.launch.firstTime}</div>
    </>} />
  )
}

function JobToast({ job }: { job: ContentJob }) {
  const { t, instances } = useApp()
  const { dismiss } = useContent()
  const name = instances.find((i) => i.id === job.instanceId)?.name ?? ''
  const title = job.result.title
  const p = job.progress
  const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0

  if (job.status === 'error') {
    return <StatusMessage className={slide} kind="error" headline={errorHeadline(job.message, t.errors)} detail={job.message} onDismiss={() => dismiss(job.id)} />
  }
  if (job.status === 'done') {
    const text = job.count === 0 ? fmt(t.content.alreadyInstalled, { title, name }) : job.count === 1 ? fmt(t.content.doneOne, { title, name }) : fmt(t.content.done, { n: job.count, name })
    return <StatusMessage className={slide} kind="success" headline={text} onDismiss={() => dismiss(job.id)} />
  }
  return (
    <StatusMessage className={slide} headline={fmt(t.content.installingTo, { title, name })}
      aside={job.status === 'installing' ? `${pct}%` : t.content.queued}
      percent={job.status === 'installing' ? pct : 0} />
  )
}

/** A counter for phases with no measurable progress: while `active` it
 *  eases from 0 towards 90, otherwise it is null. */
function useSimulatedProgress(active: boolean): number | null {
  const [value, setValue] = useState<number | null>(null)
  useEffect(() => {
    if (!active) { setValue(null); return }
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      setValue(90 * (1 - Math.exp(-2.2 * (now - start) / 1500)))
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [active])
  return value
}
