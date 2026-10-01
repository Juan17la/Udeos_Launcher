import { useEffect, useRef, useState } from 'react'
import { useApp, useContent, useLaunch } from '../state'
import type { ContentJob } from '../state'
import { fmt } from '../i18n/format'
import { useLaunchProgress } from './LaunchDialog'
import ErrorMessage from './ErrorMessage'
import ConflictDialog from './ConflictDialog'
import Button from '../ui/Button'
import StatusMessage from '../ui/StatusMessage'
import { Spinner } from '../ui/Loader'
import { Check, Download, X } from '../ui/icons'

/** How long a "done" note stays in the strip. Errors stay until closed. */
const STRIP_MS = 4000

/** Everything that runs in the background lives here, in the nav, so it never
 *  covers the page: a button that appears while something runs (its ring is
 *  the progress), a popover with every job and Cancel, and a one-line strip
 *  under the nav announcing a finished or failed job. */
export default function Activity() {
  const { t } = useApp()
  const { jobs, dismiss, cancel } = useContent()
  const { launch, cancelLaunch } = useLaunch()
  const { inst, pct: launchPct } = useLaunchProgress()
  const launching = launch.status === 'preparing' && launch.minimized
  const [open, setOpen] = useState(false)
  const [strip, setStrip] = useState<ContentJob | null>(null)
  const [options, setOptions] = useState<ContentJob | null>(null) // the failed job whose alternatives are open
  const announced = useRef(new Set<number>())
  const root = useRef<HTMLDivElement>(null)

  // Announce each job once when it finishes; a success clears itself.
  useEffect(() => {
    const fresh = jobs.find((j) => (j.status === 'done' || j.status === 'error') && !announced.current.has(j.id))
    if (!fresh) return
    announced.current.add(fresh.id)
    if (!open) setStrip(fresh)
    if (fresh.status === 'done') {
      const id = setTimeout(() => setStrip((s) => (s?.id === fresh.id ? null : s)), STRIP_MS)
      return () => clearTimeout(id)
    }
  }, [jobs, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey); window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [open])

  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'installing')
  const failed = jobs.filter((j) => j.status === 'error')
  const items = jobs.length + (launching ? 1 : 0)
  // Nothing to show, nothing drawn; an open popover closes by itself when the last job goes.
  if (items === 0 && !strip) return null

  const installing = jobs.find((j) => j.status === 'installing')
  const ring = launching ? launchPct : installing ? jobPct(installing) : 0
  const busy = active.length > 0 || launching

  return (
    <div className="relative flex-none" ref={root}>
      {items > 0 && (
        <Button variant={failed.length ? 'danger' : 'idle'} aria-expanded={open} title={t.activity.title}
          onClick={() => { setOpen((v) => !v); setStrip(null) }}>
          {busy ? <Spinner size={16} /> : failed.length ? <X size={14} /> : <Check size={14} />}
          <span className="tabular-nums">{busy ? (ring > 0 ? `${ring}%` : active.length + (launching ? 1 : 0)) : failed.length ? failed.length : t.activity.done}</span>
          <Download size={14} />
        </Button>
      )}

      {open && items > 0 && (
        <div role="region" aria-label={t.activity.title} className="glass absolute top-[calc(100%+8px)] right-0 z-9001 w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-3 p-4 animate-[dialog-fade_0.15s_ease-in-out]">
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-sm">{t.activity.title}</span>
            <Button variant="ghost" size="sm" square aria-label={t.activity.hide} title={t.activity.hide} onClick={() => setOpen(false)}><X size={12} /></Button>
          </div>
          {launching && inst && <StatusMessage headline={inst.name} aside={`${launchPct}%`} percent={launchPct} onDismiss={cancelLaunch} dismissLabel={t.common.cancel} />}
          {jobs.map((j) => <JobRow key={j.id} job={j} onDismiss={() => dismiss(j.id)} onCancel={() => cancel(j.id)} onOptions={() => { setOpen(false); setOptions(j) }} />)}
        </div>
      )}

      {strip && !open && (
        <div className="fixed top-[calc(var(--nav-h)+4px)] left-1/2 -translate-x-1/2 z-9100 w-[min(440px,calc(100vw-2rem))]">
          <JobRow job={strip} onDismiss={() => setStrip(null)} onCancel={() => setStrip(null)} onOptions={() => { setOptions(strip); setStrip(null) }} compact />
        </div>
      )}
      {options && <ConflictDialog instanceId={options.instanceId} result={options.result} onClose={() => { dismiss(options.id); setOptions(null) }} />}
    </div>
  )
}

const jobPct = (job: ContentJob) => { const p = job.progress; return p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0 }

/** One job: progress with Cancel, a short success line, or the failure headline. */
function JobRow({ job, onDismiss, onCancel, onOptions, compact }: { job: ContentJob; onDismiss: () => void; onCancel: () => void; onOptions: () => void; compact?: boolean }) {
  const { t, instances, servers } = useApp()
  const name = job.create ? job.create.name || job.result.title : [...instances, ...servers].find((i) => i.id === job.instanceId)?.name ?? ''
  const title = job.result.title
  if (job.status === 'error') {
    // A mod that clashes with an installed one: offer the way out, not just the refusal.
    const clash = /incompatible/i.test(job.message) && !job.create && job.instanceId !== ''
    return <ErrorMessage message={job.message} compact={compact} onDismiss={onDismiss}
      action={clash && <Button variant="primary" size="sm" onClick={onOptions}>{t.conflict.see}</Button>} />
  }
  if (job.status === 'done') {
    const text = job.create ? fmt(job.create.server ? t.content.createdServer : t.content.created, { name }) : job.count === 0 ? fmt(t.content.alreadyInstalled, { title, name }) : job.count === 1 ? fmt(t.content.doneOne, { title, name }) : fmt(t.content.done, { n: job.count, name })
    return <StatusMessage kind="success" headline={text} onDismiss={onDismiss} />
  }
  const pct = jobPct(job)
  return (
    <StatusMessage headline={job.create ? fmt(t.content.creating, { name }) : title} aside={job.status === 'installing' ? `${pct}%` : t.content.queued}
      percent={job.status === 'installing' ? pct : 0} onDismiss={onCancel} dismissLabel={t.common.cancel} />
  )
}
