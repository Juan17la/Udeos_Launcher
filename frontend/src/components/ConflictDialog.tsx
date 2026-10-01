import { useEffect, useState } from 'react'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import AutoLoader from '../ui/Loader'
import ErrorMessage from './ErrorMessage'
import ProjectIcon from './ProjectIcon'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { messageOf } from '../utils/errors'
import { ago } from '../utils/format'
import type { Alternatives, SearchResult } from '../api/types'

/** What to do when a mod does not work with one the instance already has:
 *  another release of the same mod that does, or, when none does, a similar
 *  mod that can be added right now. Everything listed was checked against the
 *  instance (Minecraft version, loader and its installed mods) by the backend,
 *  so each button is an install that can work. */
export default function ConflictDialog({ instanceId, result, onClose }: { instanceId: string; result: SearchResult; onClose: () => void }) {
  const { t, language, instances, servers, go } = useApp()
  const { enqueue } = useContent()
  const [alt, setAlt] = useState<Alternatives | null>(null)
  const [error, setError] = useState<string | null>(null)
  const name = [...instances, ...servers].find((i) => i.id === instanceId)?.name ?? ''

  useEffect(() => {
    let live = true
    api.GetAlternatives(instanceId, result.id, result.projectType).then((a) => { if (live) setAlt(a) }).catch((e) => { if (live) setError(messageOf(e)) })
    return () => { live = false }
  }, [instanceId, result.id, result.projectType])

  const install = (r: SearchResult, versionId?: string) => { enqueue(instanceId, r, versionId); onClose() }
  const empty = alt && alt.versions.length === 0 && alt.similar.length === 0

  return (
    <Dialog title={fmt(t.conflict.title, { title: result.title })} width={560} onClose={onClose} actions={<Button variant="idle" onClick={onClose}>{t.common.close}</Button>}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-muted">{fmt(t.conflict.intro, { title: result.title, name })}</p>
        <AutoLoader subtle active={!alt && !error} label={t.conflict.looking} />
        {error && <ErrorMessage message={error} />}
        {empty && <p className="m-0 font-bold">{t.conflict.nothing}</p>}
        {alt && alt.versions.length > 0 && (
          <div className="flex flex-col gap-2">
            <h6 className="m-0">{t.conflict.otherVersions}</h6>
            {alt.versions.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm font-bold truncate">{v.number}</span>
                  <span className="text-xs text-muted">{t.detail.releaseTypes[v.type]} · {ago(v.datePublished, language)}</span>
                </div>
                <Button variant="primary" size="sm" onClick={() => install(result, v.id)}>{t.detail.installThis}</Button>
              </div>
            ))}
          </div>
        )}
        {alt && alt.similar.length > 0 && (
          <div className="flex flex-col gap-2">
            <h6 className="m-0">{t.conflict.similar}</h6>
            {alt.similar.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
                <ProjectIcon url={r.iconUrl} size={36} />
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm font-bold truncate">{r.title}</span>
                  <span className="text-xs text-muted line-clamp-1">{r.description}</span>
                </div>
                <Button variant="idle" size="sm" onClick={() => { onClose(); go({ name: 'detail', result: r, instanceId }) }}>{t.search.details}</Button>
                <Button variant="primary" size="sm" onClick={() => install(r)}>{t.search.add}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
