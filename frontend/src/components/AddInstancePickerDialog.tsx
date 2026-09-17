import { useCallback, useEffect, useState } from 'react'
import Dialog from './Dialog'
import { useApp } from '../state'
import { api, on } from '../api/bridge'
import { fmt } from '../i18n/format'
import { bytes } from '../ui/time'
import { computeCompat } from '../lib/compat'
import type { ContentPlan, ProjectDetail, Progress, SearchResult } from '../api/types'

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const cardBase = 'flex flex-col gap-2 rounded-lg bg-surface'
const tagBase = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap'
const tagAccent = `${tagBase} bg-accent-100 text-accent-800`
const tagAccent2 = `${tagBase} bg-accent-2-100 text-accent-2-800`
const cardMeta = 'flex items-center gap-1.5 text-[11px] text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'
const textDim = 'text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'

type Props = {
  result: SearchResult
  /** Preselected instance (e.g. from an instance's Browse Modrinth button);
   *  the full list with compatibility tags still shows, it is just the
   *  default radio. */
  instanceId?: string
  onClose: () => void
}

type Step =
  | { kind: 'detecting' } // fetching ProjectDetail to compute per-instance compatibility
  | { kind: 'pick'; picked: string; detail: ProjectDetail }
  | { kind: 'planning'; instanceId: string }
  | { kind: 'review'; instanceId: string; plan: ContentPlan }
  | { kind: 'rejected'; instanceId: string; message: string }
  | { kind: 'installing'; instanceId: string; plan: ContentPlan; progress: Progress | null }
  | { kind: 'done'; instanceId: string; count: number }

/** Adds a search result to an instance. First detects which of the player's
 *  instances the project's published versions actually cover (aggregate,
 *  approximate — a quick way to sort/label the picker), then asks the
 *  backend for the precise plan (dependencies, incompatibilities) before
 *  anything downloads. */
export default function AddInstancePickerDialog({ result, instanceId, onClose }: Props) {
  const { t, instances, refreshInstances } = useApp()
  const [step, setStep] = useState<Step>({ kind: 'detecting' })
  const nameOf = (id: string) => instances.find((i) => i.id === id)?.name ?? ''

  useEffect(() => {
    let live = true
    api.GetProjectDetail(result.id).then((detail) => {
      if (!live) return
      const compat = computeCompat(detail, instances, t.compat)
      const preselected = instanceId ?? compat.find((c) => c.ok)?.instance.id ?? compat[0]?.instance.id ?? ''
      setStep({ kind: 'pick', picked: preselected, detail })
    }).catch(() => {
      // Detection is only a UI hint; fall back to plain planning against the
      // caller's instance, or the first one, so the flow still works offline.
      const fallback = instanceId ?? instances[0]?.id ?? ''
      if (fallback) plan(fallback)
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id])

  const plan = useCallback(async (target: string) => {
    setStep({ kind: 'planning', instanceId: target })
    try {
      const p = await api.PlanContent(target, result.id, result.projectType)
      setStep({ kind: 'review', instanceId: target, plan: p })
    } catch (e) {
      setStep({ kind: 'rejected', instanceId: target, message: String((e as Error)?.message ?? e) })
    }
  }, [result.id, result.projectType])

  // Only the installing step listens to download progress.
  useEffect(() => {
    if (step.kind !== 'installing') return
    return on('content:progress', (p) => setStep((cur) => (cur.kind === 'installing' ? { ...cur, progress: p } : cur)))
  }, [step.kind])

  const add = async () => {
    if (step.kind !== 'review') return
    const { instanceId: target, plan: p } = step
    setStep({ kind: 'installing', instanceId: target, plan: p, progress: null })
    try {
      const entries = await api.AddContent(target, result.id, result.projectType)
      setStep({ kind: 'done', instanceId: target, count: entries.length })
      refreshInstances()
    } catch (e) {
      setStep({ kind: 'rejected', instanceId: target, message: String((e as Error)?.message ?? e) })
    }
  }

  const close = step.kind === 'installing' ? () => {} : onClose
  const closeBtn = <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={onClose}>{t.common.close}</button>

  if (step.kind === 'detecting') {
    return <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={close} actions={closeBtn}>
      <p className={`${textMuted} m-0`}>{t.content.planning}</p>
    </Dialog>
  }

  if (step.kind === 'pick') {
    const compat = computeCompat(step.detail, instances, t.compat)
    const anyCompatible = compat.some((c) => c.ok)
    const canAdd = step.picked !== '' && compat.some((c) => c.instance.id === step.picked && c.ok)
    return (
      <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={close} actions={<>
        <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={onClose}>{t.common.cancel}</button>
        <button type="button" className={`${btnBase} ${btnPrimary}`} disabled={!canAdd} onClick={() => plan(step.picked)}>{t.content.add}</button>
      </>}>
        {instances.length === 0 && <p className="m-0">{t.content.pickEmpty}</p>}
        {instances.length > 0 && !anyCompatible && (
          <p className="mb-3 text-[13px] text-mc-danger">
            {fmt(t.content.noCompatible, { loaders: step.detail.loaders.join('/') || 'Fabric/Forge', versions: step.detail.gameVersions.slice(-3).join(', ') })}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {compat.map(({ instance, ok, reason }) => (
            <label key={instance.id} className={`group inline-flex items-center gap-2 text-sm ${ok ? 'opacity-100 cursor-pointer' : 'opacity-55 cursor-not-allowed'}`}>
              <input type="radio" name="add-instance" className="peer absolute w-0 h-0 opacity-0 pointer-events-none" disabled={!ok} checked={step.picked === instance.id}
                onChange={() => setStep({ kind: 'pick', picked: instance.id, detail: step.detail })} />
              <span className="w-4 h-4 flex-none rounded-full border-[1.5px] border-divider group-hover:border-accent peer-checked:border-accent peer-checked:bg-accent peer-checked:shadow-[inset_0_0_0_4px_var(--color-bg)] peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-2" />
              <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{instance.name}</span>
              <span className={tagAccent}>{instance.version}</span>
              <span className={tagAccent2}>{instance.loaderLabel}</span>
              <span className={`text-[11px] p-0 ${ok ? 'text-accent-2-700' : 'text-mc-danger'}`}>
                {ok ? t.compat.ok : reason}
              </span>
            </label>
          ))}
        </div>
      </Dialog>
    )
  }

  const title = fmt(t.content.planTitle, { title: result.title, name: nameOf(step.instanceId) })

  if (step.kind === 'planning') {
    return <Dialog title={title} onClose={close} actions={closeBtn}><p className={`${textMuted} m-0`}>{t.content.planning}</p></Dialog>
  }
  if (step.kind === 'rejected') {
    return <Dialog title={title} onClose={close} actions={closeBtn}><p className="m-0 text-mc-danger break-words">{step.message}</p></Dialog>
  }
  if (step.kind === 'done') {
    const text = step.count <= 1 ? fmt(t.content.doneOne, { title: result.title, name: nameOf(step.instanceId) }) : fmt(t.content.done, { n: step.count, name: nameOf(step.instanceId) })
    return <Dialog title={title} onClose={close} actions={<button type="button" className={`${btnBase} ${btnPrimary}`} onClick={onClose}>{t.common.gotIt}</button>}><p className="m-0">{text}</p></Dialog>
  }

  const { plan: p } = step
  if (step.kind === 'review' && p.alreadyInstalled) {
    return <Dialog title={title} onClose={close} actions={closeBtn}><p className="m-0">{fmt(t.content.alreadyInstalled, { title: result.title, name: nameOf(step.instanceId) })}</p></Dialog>
  }
  const progress = step.kind === 'installing' ? step.progress : null
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <Dialog title={title} onClose={close} actions={step.kind === 'review' ? <>
      <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={onClose}>{t.common.cancel}</button>
      <button type="button" className={`${btnBase} ${btnPrimary}`} onClick={add}>{t.content.add}</button>
    </> : <button type="button" className={`${btnBase} ${btnSecondary}`} disabled>{t.content.installing}</button>}>
      <p className={`${textMuted} mb-2.5 text-[13px]`}>{t.content.willInstall}</p>
      <div className="flex flex-col gap-1.5">
        {p.items.map((it) => (
          <div key={it.version.id} className={`${cardBase} flex-row items-center py-2.5 px-3.5`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{it.title} <span className={`${textMuted} font-normal`}>{it.version.versionNumber}</span></div>
              {it.reason && <div className={`${cardMeta} mt-0.5 text-xs`}>{fmt(t.content.requiredBy, { name: it.reason })}</div>}
            </div>
            <span className={`${textDim} text-xs`}>{bytes(it.version.files.find((f) => f.primary)?.size ?? it.version.files[0]?.size ?? 0)}</span>
          </div>
        ))}
      </div>
      {p.warnings.map((w) => <p key={w} className={`${textMuted} mt-2.5 text-xs`}>{w}</p>)}
      {step.kind === 'installing' && (
        <div className="flex flex-col gap-2 mt-3.5">
          <div className="flex justify-between text-[13px]">
            <span>{t.content.phases.content}</span>
            {progress && progress.total > 0 && <span className={textDim}>{progress.done}/{progress.total}{progress.totalBytes > 0 ? ` · ${bytes(progress.bytes)}` : ''}</span>}
          </div>
          <div className="h-2.5 rounded-full bg-[color-mix(in_srgb,var(--color-text)_12%,transparent)] overflow-hidden">
            <div className="w-full h-full bg-accent rounded-full origin-left transition-transform duration-200 ease" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          {progress?.current && <div className={`${textDim} text-[11px] whitespace-nowrap overflow-hidden text-ellipsis`}>{progress.current}</div>}
        </div>
      )}
    </Dialog>
  )
}
