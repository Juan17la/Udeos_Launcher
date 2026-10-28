import { useEffect, useRef, useState } from 'react'
import { useApp, useContent, useLaunch } from '../state'
import type { ContentJob } from '../state'
import { fmt } from '../i18n/format'
import { useLaunchProgress } from '../hooks/useLaunchProgress'
import ErrorMessage from './ErrorMessage'
import ConflictDialog from './ConflictDialog'
import PlayButton from './PlayButton'
import { playingSince } from '../state/useLaunchController'
import Button from '../ui/Button'
import StatusMessage from '../ui/StatusMessage'
import { ProgressBar, Spinner } from '../ui/Loader'
import { ChevronRight, Pulse, X } from '../ui/icons'

/** How long a "done" note stays in the strip. Errors stay until closed. */
const STRIP_MS = 4000

/** Everything that runs in the background lives here, in the sidebar, so it
 *  never covers the page: an always-there item (a ring and a count while
 *  something runs), a popover with every job and Cancel plus the open games and
 *  servers, and a short notice beside the sidebar announcing a finished or failed
 *  job, or a game that just opened. */
export default function Activity() {
  const { t, instances, servers, nickname, go } = useApp()
  const { jobs, dismiss, cancel } = useContent()
  const { launch, cancelLaunch } = useLaunch()
  const { inst, pct: launchPct } = useLaunchProgress()
  const launching = launch.status === 'preparing'
  const [open, setOpen] = useState(false)
  const [strip, setStrip] = useState<ContentJob | null>(null)
  const [options, setOptions] = useState<ContentJob | null>(null) // the failed job whose alternatives are open
  const [hello, setHello] = useState<{ headline: string; detail: string } | null>(null) // a game that just opened or closed
  const announced = useRef(new Set<number>())
  const wasRunning = useRef<Set<string> | null>(null)
  const root = useRef<HTMLDivElement>(null)

  // A game that starts gets one short "have fun" note (not the ones already open at load); one that
  // closes normally gets "GG" with the minutes played (a crash opens its own dialog instead).
  const started = useRef(new Map<string, number>())
  useEffect(() => {
    const before = wasRunning.current
    const now = new Set(instances.filter((i) => i.running).map((i) => i.id))
    now.forEach((id) => started.current.set(id, playingSince(id)))
    wasRunning.current = now
    if (!before) return
    const opened = instances.find((i) => i.running && !before.has(i.id))
    const closed = instances.find((i) => !i.running && before.has(i.id))
    if (opened) setHello({ headline: fmt(t.game.welcome, { nick: nickname }), detail: fmt(t.game.welcomeDetail, { name: opened.name }) })
    else if (closed && !(launch.status === 'exited' && launch.instanceId === closed.id)) {
      const mins = Math.floor((Date.now() - (started.current.get(closed.id) ?? Date.now())) / 60000)
      setHello({ headline: fmt(t.game.ended, { nick: nickname }), detail: mins < 1 ? fmt(t.game.endedShort, { name: closed.name }) : fmt(t.game.endedDetail, { n: mins, name: closed.name }) })
    }
    if (closed) started.current.delete(closed.id)
  }, [instances]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hello) return
    const id = setTimeout(() => setHello(null), STRIP_MS + 1000)
    return () => clearTimeout(id)
  }, [hello])

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

  const installing = jobs.find((j) => j.status === 'installing')
  const ring = launching ? launchPct : installing ? jobPct(installing) : 0
  const busy = active.length > 0 || launching
  const count = active.length + (launching ? 1 : 0)
  const games = instances.filter((i) => i.running)
  const live = [...games, ...servers.filter((s) => s.running)]
  const label = busy || live.length ? fmt(t.activity.running, { n: count + live.length }) : failed.length ? fmt(t.activity.failed, { n: failed.length }) : items > 0 ? t.activity.done : t.activity.empty

  return (
    <div className="relative" ref={root}>
      <button type="button" aria-expanded={open} title={t.activity.title} onClick={() => { setOpen((v) => !v); setStrip(null) }}
        className={`flex items-center gap-3 w-full h-10 px-3 rounded-md border-0 cursor-pointer text-sm font-medium text-left transition-colors duration-150 rail:justify-center rail:px-0 ${open ? 'bg-idle text-text' : 'bg-transparent text-muted hover:bg-panel-2 hover:text-text'}`}>
        <span className={`relative flex ${busy ? 'text-primary motion-safe:animate-[live-pulse_1.4s_ease-in-out_infinite]' : failed.length ? 'text-error-soft' : ''}`}>
          {busy ? <Spinner size={18} /> : failed.length ? <X size={16} /> : <Pulse />}
          {!busy && live.length > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gold ring-2 ring-bg motion-safe:animate-[live-pulse_1.4s_ease-in-out_infinite]" />}
        </span>
        <span className="flex-1 min-w-0 truncate rail:hidden">{t.activity.title}</span>
        <span className={`font-mono text-xs tabular-nums rail:hidden ${busy ? 'text-primary-hover' : ''}`}>{busy ? (ring > 0 ? `${ring}%` : count) : live.length || (items > 0 ? (failed.length || '') : '')}</span>
      </button>
      {busy && <div className="px-3 pt-1.5 pb-1 rail:hidden"><ProgressBar value={ring > 0 ? ring : undefined} /></div>}

      {open && (
        <div role="region" aria-label={t.activity.title} className="glass absolute bottom-0 left-[calc(100%+12px)] z-9001 w-85 max-w-[calc(100vw-var(--side-w)-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sm">{t.activity.title} <span className="text-muted font-normal">{items > 0 ? `· ${label}` : ''}</span></span>
            <Button variant="ghost" size="sm" square aria-label={t.activity.hide} title={t.activity.hide} onClick={() => setOpen(false)}><X size={12} /></Button>
          </div>
          {live.map((i) => i.server ? (
            <button key={i.id} type="button" onClick={() => { setOpen(false); go({ name: 'server', id: i.id }) }}
              className="flex items-center gap-3 h-11 px-3 rounded-lg border-0 bg-green-soft text-ink text-sm text-left cursor-pointer hover:brightness-105">
              <span aria-hidden className="w-2 h-2 rounded-full bg-current motion-safe:animate-[live-pulse_1.4s_ease-in-out_infinite]" />
              <span className="flex-1 min-w-0 truncate"><b className="font-extrabold">{i.name}</b> · {t.game.serverOn}</span><ChevronRight size={13} />
            </button>
          ) : (
            <div key={i.id} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted truncate">{i.name}</span>
              <PlayButton inst={i} />
            </div>
          ))}
          {items === 0 && live.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-6 text-center">
              <span className="text-muted"><Pulse size={22} /></span>
              <span className="text-sm font-medium">{t.activity.empty}</span>
              <span className="text-xs text-muted">{t.activity.emptyHint}</span>
            </div>
          )}
          {launching && inst && <StatusMessage still headline={inst.name} aside={`${launchPct}%`} percent={launchPct} onDismiss={cancelLaunch} dismissLabel={t.common.cancel} />}
          {jobs.map((j) => <JobRow key={j.id} job={j} onDismiss={() => dismiss(j.id)} onCancel={() => cancel(j.id)} onOptions={() => { setOpen(false); setOptions(j) }} />)}
        </div>
      )}

      {hello && !open && !strip && (
        <div className="fixed bottom-4 left-[calc(var(--side-w)+12px)] z-9100 w-[min(400px,calc(100vw-var(--side-w)-2rem))]">
          <StatusMessage kind="success" headline={hello.headline} detail={hello.detail} onDismiss={() => setHello(null)} />
        </div>
      )}
      {strip && !open && (
        <div className="fixed bottom-4 left-[calc(var(--side-w)+12px)] z-9100 w-[min(400px,calc(100vw-var(--side-w)-2rem))]">
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
    return <ErrorMessage message={job.message} compact={compact} still={!compact} onDismiss={onDismiss}
      action={clash && <Button variant="primary" size="sm" onClick={onOptions}>{t.conflict.see}</Button>} />
  }
  if (job.status === 'done') {
    const text = job.create ? fmt(job.create.server ? t.content.createdServer : t.content.created, { name }) : job.count === 0 ? fmt(t.content.alreadyInstalled, { title, name }) : job.count === 1 ? fmt(t.content.doneOne, { title, name }) : fmt(t.content.done, { n: job.count, name })
    return <StatusMessage kind="success" still={!compact} headline={text} onDismiss={onDismiss} />
  }
  const pct = jobPct(job)
  return (
    <StatusMessage still={!compact} headline={job.create ? fmt(t.content.creating, { name }) : title} aside={job.status === 'installing' ? `${pct}%` : t.content.queued}
      percent={job.status === 'installing' ? pct : 0} onDismiss={onCancel} dismissLabel={t.common.cancel} />
  )
}
