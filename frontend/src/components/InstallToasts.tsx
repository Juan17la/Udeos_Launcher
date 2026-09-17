import { useApp, useContent } from '../state'
import { fmt } from '../i18n/format'
import { X } from '../ui/icons'
import type { ContentJob } from '../state'

const textDim = 'text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'
const dismissBtn = 'inline-flex items-center justify-center w-7 h-7 p-0 shrink-0 rounded-full border-0 bg-transparent text-inherit cursor-pointer hover:bg-[color-mix(in_srgb,var(--color-text)_10%,transparent)]'

/** Bottom-right notifications for content installs (useContent's queue):
 *  a percentage while downloading, a short "Added" note that clears itself,
 *  or a rejection reason that stays until dismissed. Lives outside every
 *  screen so an install keeps reporting after the player navigates away. */
export default function InstallToasts() {
  const { jobs } = useContent()
  if (jobs.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-9100 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]" aria-live="polite">
      {jobs.map((j) => <Toast key={j.id} job={j} />)}
    </div>
  )
}

function Toast({ job }: { job: ContentJob }) {
  const { t, instances } = useApp()
  const { dismiss } = useContent()
  const name = instances.find((i) => i.id === job.instanceId)?.name ?? ''
  const title = job.result.title
  const p = job.progress
  const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
  const error = job.status === 'error'
  const done = job.status === 'done'

  const heading = error ? fmt(t.content.failed, { title, name })
    : done ? (job.count === 0 ? fmt(t.content.alreadyInstalled, { title, name }) : job.count === 1 ? fmt(t.content.doneOne, { title, name }) : fmt(t.content.done, { n: job.count, name }))
    : fmt(t.content.installingTo, { title, name })

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-lg bg-surface shadow-lg animate-[dialog-fade_0.12s_ease-out] border ${error ? 'border-mc-danger' : 'border-divider'}`} role="status">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 text-[13px] font-semibold leading-[1.3]">{heading}</div>
        {job.status === 'installing' && <span className={`${textDim} text-[13px] tabular-nums shrink-0`}>{pct}%</span>}
        {job.status === 'queued' && <span className={`${textDim} text-xs shrink-0`}>{t.content.queued}</span>}
        {(done || error) && (
          <button type="button" className={dismissBtn} title={t.common.close} onClick={() => dismiss(job.id)}><X size={14} /></button>
        )}
      </div>
      {job.status === 'installing' && (
        <div className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-text)_12%,transparent)] overflow-hidden">
          <div className="w-full h-full bg-accent rounded-full origin-left transition-transform duration-200 ease" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      )}
      {error && <p className="m-0 text-xs text-mc-danger break-words">{job.message}</p>}
    </div>
  )
}
