import { useApp, useContent, useLaunch } from '../state'
import type { ContentJob } from '../state'
import { fmt } from '../i18n/format'
import { useLaunchProgress } from './LaunchDialog'
import { errorHeadline } from '../utils/errors'
import StatusMessage from '../ui/StatusMessage'

/** Notifications slide in from the right edge. */
const slide = 'animate-[toast-in_0.15s_ease-in-out]'

/** Bottom-right notification stack: the game install that Play kicked off,
 *  once its loading modal is hidden (name and percentage), and content
 *  installs from the Addons page (the project and its percentage while
 *  downloading, a short "Added" note that clears itself, or a
 *  rejection headline with the reason underneath that stays until
 *  dismissed). Lives outside every screen so nothing is lost on navigation. */
export default function Notifications() {
  const { jobs } = useContent()
  const { launch } = useLaunch()
  const launching = launch.status === 'preparing' && launch.minimized
  if (jobs.length === 0 && !launching) return null
  return (
    <div className="fixed bottom-4 right-4 z-9100 flex flex-col gap-4 w-80 max-w-[calc(100vw-2rem)]" aria-live="polite">
      {launching && <LaunchToast />}
      {jobs.map((j) => <JobToast key={j.id} job={j} />)}
    </div>
  )
}

/** The minimized launch modal: instance name, percentage and bar. */
function LaunchToast() {
  const { inst, pct } = useLaunchProgress()
  return <StatusMessage className={slide} headline={inst?.name ?? ''} aside={`${pct}%`} percent={pct} />
}

function JobToast({ job }: { job: ContentJob }) {
  const { t, instances, servers } = useApp()
  const { dismiss } = useContent()
  const name = job.create ? job.create.name || job.result.title : [...instances, ...servers].find((i) => i.id === job.instanceId)?.name ?? ''
  const title = job.result.title
  const p = job.progress
  const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0

  if (job.status === 'error') {
    return <StatusMessage className={slide} kind="error" headline={errorHeadline(job.message, t.errors)} detail={job.message} onDismiss={() => dismiss(job.id)} />
  }
  if (job.status === 'done') {
    const text = job.create ? fmt(t.content.created, { name }) : job.count === 0 ? fmt(t.content.alreadyInstalled, { title, name }) : job.count === 1 ? fmt(t.content.doneOne, { title, name }) : fmt(t.content.done, { n: job.count, name })
    return <StatusMessage className={slide} kind="success" headline={text} onDismiss={() => dismiss(job.id)} />
  }
  return (
    <StatusMessage className={slide} headline={job.create ? fmt(t.content.creating, { name }) : title}
      aside={job.status === 'installing' ? `${pct}%` : t.content.queued}
      percent={job.status === 'installing' ? pct : 0} />
  )
}
