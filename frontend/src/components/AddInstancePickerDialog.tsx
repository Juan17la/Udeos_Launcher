import { useEffect, useState } from 'react'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Field'
import StatusMessage from '../ui/StatusMessage'
import AutoLoader from '../ui/Loader'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { computeCompat } from '../utils/compat'
import { INSTANCE_NAME } from '../utils/validation'
import type { Instance, ProjectDetail, SearchResult } from '../api/types'

/** The Addons page's version/loader filters: a modpack's new instance is
 *  built from its build for them ('' = the newest). */
export type SearchFilters = { gameVersion: string; loader: string }

type Props = { result: SearchResult; filters?: SearchFilters; onClose: () => void }

/** Which instances can take the project: detection fetches ProjectDetail
 *  once (aggregate versions/loaders, see utils/compat.ts). When Modrinth
 *  cannot be reached every instance is offered instead — the backend still
 *  plans precisely and the toast reports a mismatch. */
type Detected = { detail: ProjectDetail | null; choices: Instance[] }

/** Picks the instance a search result goes into. One click on an instance
 *  starts the install (queued in useContent, shown as a toast) and closes
 *  the dialog — no confirmation step, no progress modal. A modpack offers,
 *  first, a new instance made from it (name prefilled with its title), then
 *  the compatible instances its mods can be poured into. */
export default function AddInstancePickerDialog({ result, filters, onClose }: Props) {
  const { t, instances } = useApp()
  const { enqueue, enqueueCreate } = useContent()
  const [detected, setDetected] = useState<Detected | null>(null)
  const modpack = result.projectType === 'modpack'
  const [name, setName] = useState(result.title)

  useEffect(() => {
    let live = true
    api.GetProjectDetail(result.id)
      .then((detail) => { if (live) setDetected({ detail, choices: computeCompat(detail, instances, t.compat).filter((c) => c.ok).map((c) => c.instance) }) })
      .catch(() => { if (live) setDetected({ detail: null, choices: instances }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id])

  const pick = (instanceId: string) => { enqueue(instanceId, result); onClose() }
  const create = () => {
    if (!INSTANCE_NAME.test(name)) return
    enqueueCreate(result, { name: INSTANCE_NAME.normalize(name), icon: 'grass_block_side', gameVersion: filters?.gameVersion ?? '', loader: filters?.loader ?? '' })
    onClose()
  }
  const none = detected !== null && detected.choices.length === 0

  return (
    <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={onClose} actions={<Button variant="idle" onClick={onClose}>{t.common.close}</Button>}>
      <div className="flex flex-col gap-4">
        {modpack && (
          <>
            <div>
              <Label htmlFor="modpack-name">{t.content.newInstance}</Label>
              <div className="flex gap-4">
                <Input id="modpack-name" type="text" value={name} maxLength={INSTANCE_NAME.maxLength} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create() }} />
                <Button variant="primary" className="shrink-0" disabled={!INSTANCE_NAME.test(name)} onClick={create}>{t.search.createInstance}</Button>
              </div>
            </div>
            {!none && <p className="m-0 font-bold text-base">{t.content.orAddTo}</p>}
          </>
        )}
        <AutoLoader active={detected === null} label={t.content.planning} />
        {none && !modpack && (
          <StatusMessage kind="error" headline={t.errors.noBuild}
            detail={fmt(t.content.noCompatible, { loaders: detected.detail?.loaders.join('/') || result.loaders.join('/') || 'Fabric/Forge', versions: detected.detail?.gameVersions.slice(-3).join(', ') ?? '' })} />
        )}
        {detected !== null && detected.choices.length > 0 && (
          <>
            {!modpack && <p className="m-0 text-muted">{t.content.pickHint}</p>}
            {detected.choices.map((instance) => (
              <button key={instance.id} type="button" onClick={() => pick(instance.id)}
                className="flex items-center gap-4 w-full text-left cursor-pointer rounded-md border-0 px-4 py-3 bg-idle text-ink shadow-neu hover:bg-green hover:text-white transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-green">
                <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold">{instance.name}</span>
                <span className="tag bg-green-soft">{instance.version}</span>
                <span className="tag bg-gold-soft">{instance.loaderLabel}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </Dialog>
  )
}
