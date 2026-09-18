import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { ChevronLeft } from '../ui/icons'
import Button from '../ui/Button'
import AutoLoader from '../ui/Loader'
import { useAddAction } from '../hooks/useAddAction'
import { computeCompat } from '../utils/compat'
import type { ProjectDetail as ProjectDetailData, SearchResult } from '../api/types'

/** instanceId is the instance Search was locked to, so Back returns there
 *  and Add installs into it without a picker. */
type Props = { result: SearchResult; instanceId?: string }

/** Full-page view of one search result: its description, every Minecraft
 *  version/loader it has ever published a build for, and which of the
 *  player's instances can take it. */
export default function ProjectDetail({ result, instanceId }: Props) {
  const { t, instances, go } = useApp()
  const [detail, setDetail] = useState<ProjectDetailData | null>(null)
  const { add, dialog } = useAddAction(instanceId)

  useEffect(() => {
    let live = true
    setDetail(null)
    api.GetProjectDetail(result.id).then((d) => { if (live) setDetail(d) }).catch(() => {})
    return () => { live = false }
  }, [result.id])

  const modpack = result.projectType === 'modpack'
  const compat = detail ? computeCompat(detail, instances, t.compat) : []

  return (
    <main className="flex-1 flex flex-col gap-6 pt-8 px-10 pb-12 max-w-[820px]">
      <div>
        <Button variant="ghost" size="sm" onClick={() => go({ name: 'search', instanceId, type: result.projectType })}>
          <ChevronLeft /> {t.detail.back}
        </Button>
      </div>

      <div className="flex gap-6 items-start">
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" width={72} height={72}
            className="rounded-md object-cover shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
        <div className="flex flex-col gap-2">
          <div><span className="tag bg-tag-gray">{t.search.types[result.projectType]}</span></div>
          <h1 className="m-0">{result.title}</h1>
          <div className="text-[13px] text-muted">{fmt(t.search.downloads, { n: result.downloads.toLocaleString() })} · {result.author}</div>
        </div>
      </div>

      <AutoLoader active={!detail} label={t.common.loading} />
      {detail && <p className="m-0 max-w-[65ch] whitespace-pre-wrap">{detail.description || result.description}</p>}

      {detail && (
        <div className="flex gap-8 flex-wrap">
          <div className="flex flex-col gap-4">
            <h6 className="m-0">{t.detail.versionsHeading}</h6>
            <div className="flex gap-2 flex-wrap max-w-[360px]">
              {detail.gameVersions.map((v) => <span key={v} className="tag bg-tag-gray">{v}</span>)}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h6 className="m-0">{t.detail.loadersHeading}</h6>
            <div className="flex gap-2 flex-wrap">
              {detail.loaders.map((l) => <span key={l} className="tag bg-gold-soft">{l}</span>)}
            </div>
          </div>
        </div>
      )}

      {!modpack && (
        <div className="flex flex-col gap-4">
          <h4 className="m-0">{t.detail.instancesHeading}</h4>
          {instances.length === 0 && <p className="m-0 text-sm text-muted">{t.detail.noInstances}</p>}
          {compat.map(({ instance, ok, reason }) => (
            <div key={instance.id} className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[15px] font-bold truncate">{instance.name}</div>
                <div className="text-xs text-muted">{instance.version} · {instance.loaderLabel}</div>
              </div>
              <span className={`tag ${ok ? 'bg-green-soft' : 'bg-tag-gray'}`}>{ok ? t.compat.ok : reason}</span>
            </div>
          ))}
          <div>
            <Button variant="primary" size="lg" disabled={!detail} onClick={() => add(result)}>{t.detail.add}</Button>
          </div>
        </div>
      )}

      {dialog}
    </main>
  )
}
