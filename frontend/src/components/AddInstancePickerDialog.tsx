import { ReactNode, useEffect, useState } from 'react'
import Dialog from './Dialog'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { computeCompat } from '../lib/compat'
import type { Instance, ProjectDetail, SearchResult } from '../api/types'

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const tagBase = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap'
const tagAccent = `${tagBase} bg-accent-100 text-accent-800`
const tagAccent2 = `${tagBase} bg-accent-2-100 text-accent-2-800`
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'
const instanceBtn = 'flex items-center gap-2.5 w-full text-left cursor-pointer rounded-md border border-divider bg-bg px-3.5 py-2.5 hover:border-accent hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-accent'

type Props = { result: SearchResult; onClose: () => void }

/** Which instances can take the project: detection fetches ProjectDetail
 *  once (aggregate versions/loaders, see lib/compat.ts). When Modrinth
 *  cannot be reached every instance is offered instead — the backend still
 *  plans precisely and the toast reports a mismatch. */
type Detected = { detail: ProjectDetail | null; choices: Instance[] }

/** Picks the instance a search result goes into. One click on an instance
 *  starts the install (queued in useContent, shown as a toast) and closes
 *  the dialog — no confirmation step, no progress modal. */
export default function AddInstancePickerDialog({ result, onClose }: Props) {
  const { t, instances } = useApp()
  const { enqueue } = useContent()
  const [detected, setDetected] = useState<Detected | null>(null)

  useEffect(() => {
    let live = true
    api.GetProjectDetail(result.id)
      .then((detail) => { if (live) setDetected({ detail, choices: computeCompat(detail, instances, t.compat).filter((c) => c.ok).map((c) => c.instance) }) })
      .catch(() => { if (live) setDetected({ detail: null, choices: instances }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id])

  const pick = (instanceId: string) => { enqueue(instanceId, result); onClose() }
  const closeBtn = <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={onClose}>{t.common.close}</button>

  return (
    <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={onClose} actions={closeBtn}>
      {detected === null && <p className={`${textMuted} m-0`}>{t.content.planning}</p>}
      {detected !== null && detected.choices.length === 0 && (
        <p className="m-0 text-[13px] text-mc-danger">
          {fmt(t.content.noCompatible, { loaders: detected.detail?.loaders.join('/') || result.loaders.join('/') || 'Fabric/Forge', versions: detected.detail?.gameVersions.slice(-3).join(', ') ?? '' })}
        </p>
      )}
      {detected !== null && detected.choices.length > 0 && (
        <>
          <p className={`${textMuted} mt-0 mb-3`}>{t.content.pickHint}</p>
          <div className="flex flex-col gap-2">
            {detected.choices.map((instance) => (
              <button key={instance.id} type="button" className={instanceBtn} onClick={() => pick(instance.id)}>
                <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold text-text">{instance.name}</span>
                <span className={tagAccent}>{instance.version}</span>
                <span className={tagAccent2}>{instance.loaderLabel}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Dialog>
  )
}

/** The Add action every card and the Details page share. With an instance
 *  in context (the player came from that instance's page) Add installs
 *  straight away; otherwise it opens the picker, or — with no instances at
 *  all — a dialog pointing at Create instance. Render `dialog` once in the
 *  calling screen. */
export function useAddAction(instanceId?: string): { add: (result: SearchResult) => void; dialog: ReactNode } {
  const { t, instances, go } = useApp()
  const { enqueue } = useContent()
  const [picking, setPicking] = useState<SearchResult | null>(null)
  const [noInstances, setNoInstances] = useState<SearchResult | null>(null)
  const inst = instanceId ? instances.find((i) => i.id === instanceId) : undefined

  const add = (result: SearchResult) => {
    if (inst) enqueue(inst.id, result)
    else if (instances.length === 0) setNoInstances(result)
    else setPicking(result)
  }

  const dialog = (
    <>
      {picking && <AddInstancePickerDialog result={picking} onClose={() => setPicking(null)} />}
      {noInstances && (
        <Dialog title={t.content.noInstancesTitle} onClose={() => setNoInstances(null)} actions={<>
          <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={() => setNoInstances(null)}>{t.common.close}</button>
          <button type="button" className={`${btnBase} ${btnPrimary}`} onClick={() => { setNoInstances(null); go({ name: 'create' }) }}>{t.search.createInstance}</button>
        </>}>
          <p className="m-0">{fmt(t.content.noInstancesBody, { title: noInstances.title })}</p>
        </Dialog>
      )}
    </>
  )

  return { add, dialog }
}
