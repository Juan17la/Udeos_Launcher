import { useCallback, useEffect, useState } from 'react'
import Dialog from './Dialog'
import { useApp } from '../state'
import { api, on } from '../api/bridge'
import { fmt } from '../i18n/format'
import { bytes } from '../ui/time'
import { computeCompat } from '../lib/compat'
import type { ContentPlan, ProjectDetail, Progress, SearchResult } from '../api/types'

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
  const closeBtn = <button type="button" className="btn btn-secondary" onClick={onClose}>{t.common.close}</button>

  if (step.kind === 'detecting') {
    return <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={close} actions={closeBtn}>
      <p className="text-muted" style={{ margin: 0 }}>{t.content.planning}</p>
    </Dialog>
  }

  if (step.kind === 'pick') {
    const compat = computeCompat(step.detail, instances, t.compat)
    const anyCompatible = compat.some((c) => c.ok)
    const canAdd = step.picked !== '' && compat.some((c) => c.instance.id === step.picked && c.ok)
    return (
      <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={close} actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t.common.cancel}</button>
        <button type="button" className="btn btn-primary" disabled={!canAdd} onClick={() => plan(step.picked)}>{t.content.add}</button>
      </>}>
        {instances.length === 0 && <p style={{ margin: 0 }}>{t.content.pickEmpty}</p>}
        {instances.length > 0 && !anyCompatible && (
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--mc-danger)' }}>
            {fmt(t.content.noCompatible, { loaders: step.detail.loaders.join('/') || 'Fabric/Forge', versions: step.detail.gameVersions.slice(-3).join(', ') })}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {compat.map(({ instance, ok, reason }) => (
            <label key={instance.id} className="radio" style={{ opacity: ok ? 1 : 0.55, cursor: ok ? 'pointer' : 'not-allowed' }}>
              <input type="radio" name="add-instance" disabled={!ok} checked={step.picked === instance.id}
                onChange={() => setStep({ kind: 'pick', picked: instance.id, detail: step.detail })} />
              <span className="dot" />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{instance.name}</span>
              <span className="tag tag-accent">{instance.version}</span>
              <span className="tag tag-accent-2">{instance.loaderLabel}</span>
              <span className="tag" style={{ color: ok ? 'var(--color-accent-2-700)' : 'var(--mc-danger)', background: 'transparent', border: 'none', padding: 0 }}>
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
    return <Dialog title={title} onClose={close} actions={closeBtn}><p className="text-muted" style={{ margin: 0 }}>{t.content.planning}</p></Dialog>
  }
  if (step.kind === 'rejected') {
    return <Dialog title={title} onClose={close} actions={closeBtn}><p style={{ margin: 0, color: 'var(--mc-danger)', wordBreak: 'break-word' }}>{step.message}</p></Dialog>
  }
  if (step.kind === 'done') {
    const text = step.count <= 1 ? fmt(t.content.doneOne, { title: result.title, name: nameOf(step.instanceId) }) : fmt(t.content.done, { n: step.count, name: nameOf(step.instanceId) })
    return <Dialog title={title} onClose={close} actions={<button type="button" className="btn btn-primary" onClick={onClose}>{t.common.gotIt}</button>}><p style={{ margin: 0 }}>{text}</p></Dialog>
  }

  const { plan: p } = step
  if (step.kind === 'review' && p.alreadyInstalled) {
    return <Dialog title={title} onClose={close} actions={closeBtn}><p style={{ margin: 0 }}>{fmt(t.content.alreadyInstalled, { title: result.title, name: nameOf(step.instanceId) })}</p></Dialog>
  }
  const progress = step.kind === 'installing' ? step.progress : null
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <Dialog title={title} onClose={close} actions={step.kind === 'review' ? <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>{t.common.cancel}</button>
      <button type="button" className="btn btn-primary" onClick={add}>{t.content.add}</button>
    </> : <button type="button" className="btn btn-secondary" disabled>{t.content.installing}</button>}>
      <p className="text-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>{t.content.willInstall}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {p.items.map((it) => (
          <div key={it.version.id} className="card row-card" style={{ padding: '10px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row-title" style={{ fontSize: 14 }}>{it.title} <span className="text-muted" style={{ fontWeight: 400 }}>{it.version.versionNumber}</span></div>
              {it.reason && <div className="card-meta" style={{ marginTop: 2, fontSize: 12 }}>{fmt(t.content.requiredBy, { name: it.reason })}</div>}
            </div>
            <span className="text-dim" style={{ fontSize: 12 }}>{bytes(it.version.files.find((f) => f.primary)?.size ?? it.version.files[0]?.size ?? 0)}</span>
          </div>
        ))}
      </div>
      {p.warnings.map((w) => <p key={w} className="text-muted" style={{ margin: '10px 0 0', fontSize: 12 }}>{w}</p>)}
      {step.kind === 'installing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>{t.content.phases.content}</span>
            {progress && progress.total > 0 && <span className="text-dim">{progress.done}/{progress.total}{progress.totalBytes > 0 ? ` · ${bytes(progress.bytes)}` : ''}</span>}
          </div>
          <div className="progress"><div style={{ transform: `scaleX(${pct / 100})` }} /></div>
          {progress?.current && <div className="text-dim" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{progress.current}</div>}
        </div>
      )}
    </Dialog>
  )
}
