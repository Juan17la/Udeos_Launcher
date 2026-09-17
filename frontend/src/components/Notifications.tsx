import { useApp, useContent, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { bytes } from '../ui/time'
import { errorHeadline } from '../lib/errors'
import Toast from '../ui/molecules/Toast'
import { useSimulatedProgress } from '../ui/atoms/Loader'
import type { ContentJob } from '../state'

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
    <Toast title={fmt(t.launch.preparing, { name: inst?.name ?? '' })} aside={`${pct}%`} percent={pct} detail={<>
      <div>{label}{counts}</div>
      {p?.current && <div className="overflow-hidden text-ellipsis whitespace-nowrap">{p.current}</div>}
      <div>{phase === 'loader' && inst?.loader === 'Forge' ? t.launch.loaderTakesAWhile : t.launch.firstTime}</div>
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
    return <Toast tone="error" title={errorHeadline(job.message, t.errors)} detail={job.message} onDismiss={() => dismiss(job.id)} />
  }
  if (job.status === 'done') {
    const text = job.count === 0 ? fmt(t.content.alreadyInstalled, { title, name }) : job.count === 1 ? fmt(t.content.doneOne, { title, name }) : fmt(t.content.done, { n: job.count, name })
    return <Toast tone="success" title={text} onDismiss={() => dismiss(job.id)} />
  }
  return (
    <Toast title={fmt(t.content.installingTo, { title, name })}
      aside={job.status === 'installing' ? `${pct}%` : t.content.queued}
      percent={job.status === 'installing' ? pct : 0} />
  )
}
