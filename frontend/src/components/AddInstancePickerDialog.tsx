import { ReactNode, useEffect, useState } from 'react'
import Dialog from '../ui/molecules/Dialog'
import Button from '../ui/atoms/Button'
import Tag from '../ui/atoms/Tag'
import StatusMessage from '../ui/atoms/Status'
import { AutoLoader } from '../ui/atoms/Loader'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { computeCompat } from '../lib/compat'
import type { Instance, ProjectDetail, SearchResult } from '../api/types'

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

  return (
    <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={onClose} actions={<Button variant="idle" onClick={onClose}>{t.common.close}</Button>}>
      <AutoLoader active={detected === null} label={t.content.planning} />
      {detected !== null && detected.choices.length === 0 && (
        <StatusMessage kind="error" headline={t.errors.noBuild}
          detail={fmt(t.content.noCompatible, { loaders: detected.detail?.loaders.join('/') || result.loaders.join('/') || 'Fabric/Forge', versions: detected.detail?.gameVersions.slice(-3).join(', ') ?? '' })} />
      )}
      {detected !== null && detected.choices.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-muted">{t.content.pickHint}</p>
          {detected.choices.map((instance) => (
            <button key={instance.id} type="button" onClick={() => pick(instance.id)}
              className="flex items-center gap-4 w-full text-left cursor-pointer rounded-md border-0 px-4 py-3 bg-idle text-ink shadow-neu hover:bg-green hover:text-white transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-green">
              <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold">{instance.name}</span>
              <Tag tone="green">{instance.version}</Tag>
              <Tag tone="gold">{instance.loaderLabel}</Tag>
            </button>
          ))}
        </div>
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
          <Button variant="idle" onClick={() => setNoInstances(null)}>{t.common.close}</Button>
          <Button variant="primary" onClick={() => { setNoInstances(null); go({ name: 'create' }) }}>{t.search.createInstance}</Button>
        </>}>
          <StatusMessage kind="error" headline={t.content.noInstancesTitle} detail={fmt(t.content.noInstancesBody, { title: noInstances.title })} />
        </Dialog>
      )}
    </>
  )

  return { add, dialog }
}
