import { useEffect, useState } from 'react'
import { useApp, useContent } from '../state'
import { api, openExternal } from '../api/bridge'
import { fmt } from '../i18n/format'
import Button from '../ui/Button'
import AutoLoader from '../ui/Loader'
import BackButton from '../components/BackButton'
import ProjectIcon from '../components/ProjectIcon'
import Markdown from '../utils/markdown'
import { computeCompat } from '../utils/compat'
import { useAddAction } from '../hooks/useAddAction'
import type { ProjectDetail as ProjectDetailData, SearchResult } from '../api/types'

/** instanceId is the instance Search was locked to; it stays in the screen
 *  so Back returns to the locked Addons page. */
type Props = { result: SearchResult; instanceId?: string }

/** How many version tags show before "+N more". */
const VERSIONS_SHOWN = 12

/** Full-page view of one project. Left: what it runs on (every Minecraft
 *  version and loader it ever published for) and which of the player's
 *  instances can take it, each with its own Add; a modpack can also become
 *  a new instance. Right: everything the project page offers — icon,
 *  categories, client/server side, license, links, gallery and the full
 *  description. */
export default function ProjectDetail({ result, instanceId }: Props) {
  const { t, instances } = useApp()
  const { enqueue } = useContent()
  const { add, dialog } = useAddAction(instanceId)
  const [detail, setDetail] = useState<ProjectDetailData | null>(null)
  const [allVersions, setAllVersions] = useState(false)

  useEffect(() => {
    let live = true
    setDetail(null); setAllVersions(false)
    api.GetProjectDetail(result.id).then((d) => { if (live) setDetail(d) }).catch(() => {})
    return () => { live = false }
  }, [result.id])

  const modpack = result.projectType === 'modpack'
  const compatible = detail ? computeCompat(detail, instances, t.compat).filter((c) => c.ok) : []
  const versions = detail?.gameVersions ?? []
  const shownVersions = allVersions ? versions : versions.slice(0, VERSIONS_SHOWN)
  const links = detail ? [[t.detail.source, detail.sourceUrl], [t.detail.issues, detail.issuesUrl], [t.detail.wiki, detail.wikiUrl]].filter(([, u]) => u) : []

  return (
    <main className="flex-1 flex flex-col gap-6 pt-8 px-10 pb-12">
      <BackButton />
      <AutoLoader active={!detail} label={t.common.loading} />
      {detail && (
        <div className="grid gap-8 items-start" style={{ gridTemplateColumns: '320px minmax(0,1fr)' }}>
          <aside className="flex flex-col gap-6 sticky top-24">
            <section className="panel flex flex-col gap-4 p-5">
              <h6 className="m-0">{t.detail.versionsHeading}</h6>
              <div className="flex gap-2 flex-wrap">
                {shownVersions.map((v) => <span key={v} className="tag bg-tag-gray">{v}</span>)}
              </div>
              {versions.length > VERSIONS_SHOWN && (
                <Button variant="ghost" size="sm" className="-ml-4 w-fit" onClick={() => setAllVersions((v) => !v)}>
                  {allVersions ? t.detail.showLess : fmt(t.detail.showMore, { n: versions.length - VERSIONS_SHOWN })}
                </Button>
              )}
              <h6 className="m-0">{t.detail.loadersHeading}</h6>
              <div className="flex gap-2 flex-wrap">
                {detail.loaders.map((l) => <span key={l} className="tag bg-gold-soft">{l}</span>)}
              </div>
            </section>

            <section className="panel flex flex-col gap-4 p-5">
              <h6 className="m-0">{t.detail.instancesHeading}</h6>
              {modpack && <Button variant="primary" onClick={() => add(result)}>{t.detail.createFromModpack}</Button>}
              {instances.length === 0 && !modpack && <p className="m-0 text-xs text-muted">{t.detail.noInstances}</p>}
              {instances.length > 0 && compatible.length === 0 && (
                <p className="m-0 text-xs text-muted">{fmt(t.detail.noCompatible, { loaders: detail.loaders.join('/') || 'Fabric/Forge', versions: detail.gameVersions.slice(-3).join(', ') })}</p>
              )}
              {compatible.map(({ instance }) => (
                <div key={instance.id} className="flex items-center gap-3 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="text-sm font-bold truncate">{instance.name}</div>
                    <div className="text-[11px] text-muted truncate">{instance.version} · {instance.loaderLabel}</div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => enqueue(instance.id, result)}>{t.detail.add}</Button>
                </div>
              ))}
            </section>
          </aside>

          <article className="min-w-0 flex flex-col gap-6">
            <div className="flex gap-6 items-start">
              <ProjectIcon url={detail.iconUrl} size={72} />
              <div className="min-w-0 flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap">
                  <span className="tag bg-tag-gray">{t.search.types[result.projectType]}</span>
                  {detail.categories.map((c) => <span key={c} className="tag bg-green-soft">{c}</span>)}
                </div>
                <h1 className="m-0">{detail.title}</h1>
                <p className="m-0 text-muted">{detail.description}</p>
                <div className="text-[13px] text-muted">{fmt(t.search.downloads, { n: detail.downloads.toLocaleString() })}{result.author && ` · ${result.author}`}</div>
              </div>
            </div>

            {/* What the project page states about itself: where it runs, its license, its links. */}
            <div className="flex items-center gap-4 flex-wrap text-[13px]">
              {detail.clientSide && <span><span className="text-muted">{t.detail.client}:</span> {t.detail.side[detail.clientSide] ?? detail.clientSide}</span>}
              {detail.serverSide && <span><span className="text-muted">{t.detail.server}:</span> {t.detail.side[detail.serverSide] ?? detail.serverSide}</span>}
              {detail.license && <span><span className="text-muted">{t.detail.license}:</span> {detail.license}</span>}
              {links.map(([label, url]) => <Button key={label} variant="ghost" size="sm" onClick={() => openExternal(url)}>{label}</Button>)}
            </div>

            {detail.gallery.length > 0 && (
              <section className="flex flex-col gap-4">
                <h6 className="m-0">{t.detail.gallery}</h6>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {detail.gallery.map((g) => (
                    <figure key={g.url} className="m-0 flex flex-col gap-2">
                      <img src={g.url} alt={g.title} loading="lazy" decoding="async" className="w-full aspect-video object-cover rounded-md bg-panel" />
                      {(g.title || g.description) && <figcaption className="text-xs text-muted"><b>{g.title}</b>{g.title && g.description ? ' — ' : ''}{g.description}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-2">
              <h6 className="m-0">{t.detail.about}</h6>
              <Markdown text={detail.body || detail.description} />
            </section>
          </article>
        </div>
      )}
      {dialog}
    </main>
  )
}
