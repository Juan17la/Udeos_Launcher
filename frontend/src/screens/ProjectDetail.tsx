import { useEffect, useMemo, useState } from 'react'
import { useApp, useContent } from '../state'
import { api, openExternal } from '../api/bridge'
import { fmt } from '../i18n/format'
import Button from '../ui/Button'
import { Select } from '../ui/Field'
import AutoLoader, { Spinner } from '../ui/Loader'
import SegmentedControl from '../ui/SegmentedControl'
import ErrorMessage from '../components/ErrorMessage'
import ProjectIcon from '../components/ProjectIcon'
import { Downloads, LoaderTags, VersionTag } from '../components/Tags'
import Markdown from '../utils/markdown'
import { computeCompat } from '../utils/compat'
import { messageOf } from '../utils/errors'
import { useAddAction } from '../hooks/useAddAction'
import { ago } from '../utils/format'
import type { ContentPlan, Instance, ProjectDetail as ProjectDetailData, SearchResult, VersionChoice } from '../api/types'

/** instanceId is the instance Search was locked to; it stays in the screen
 *  so Back returns to the locked Addons page. */
type Props = { result: SearchResult; instanceId?: string }

type Tab = 'about' | 'versions'
type Preview = { status: 'loading' } | { status: 'ready'; plan: ContentPlan } | { status: 'error'; message: string }

/** Full-page view of one project, laid out to be read top to bottom with no
 *  scroll boxes of its own (nothing sticky, nothing that scrolls inside the
 *  page, so the wheel always moves the page). The header holds what a player
 *  came to do: Install, into an instance that can take it, with a preview of
 *  what else comes along. Under it: About (description, what it runs on,
 *  links, gallery) and Versions (every release that runs on that instance,
 *  newest first, to install or switch to one). A modpack can also become a
 *  new instance. */
export default function ProjectDetail({ result, instanceId }: Props) {
  const { t, instances, servers, go } = useApp()
  const { enqueue, jobs } = useContent()
  const { add, dialog } = useAddAction(instanceId)
  const [detail, setDetail] = useState<ProjectDetailData | null>(null)
  const [tab, setTab] = useState<Tab>('about')
  const [target, setTarget] = useState('')

  useEffect(() => {
    let live = true
    setDetail(null); setTab('about')
    api.GetProjectDetail(result.id).then((d) => { if (live) setDetail(d) }).catch(() => {})
    return () => { live = false }
  }, [result.id])

  const modpack = result.projectType === 'modpack'
  const datapack = result.projectType === 'datapack' // goes into a world: its own picker, no per-instance preview
  // Only what can really take it: the aggregate check sorts the candidates, the plan below is the precise answer.
  const candidates = useMemo(
    () => (detail ? computeCompat(detail, [...instances, ...servers], t.compat).filter((c) => c.ok).map((c) => c.instance) : []),
    [detail, instances, servers, t.compat],
  )
  const key = candidates.map((c) => c.id).join()
  useEffect(() => {
    if (detail && !candidates.some((c) => c.id === target)) setTarget(candidates.find((c) => c.id === instanceId)?.id ?? candidates[0]?.id ?? '')
  }, [detail, key]) // eslint-disable-line react-hooks/exhaustive-deps
  const inst = candidates.find((c) => c.id === target)

  // An install of this project finishing re-reads the preview and the version list.
  const finished = jobs.filter((j) => j.instanceId === target && j.result.id === result.id && j.status === 'done').length
  const busy = jobs.some((j) => j.instanceId === target && j.result.id === result.id && (j.status === 'queued' || j.status === 'installing'))

  const [preview, setPreview] = useState<Preview | null>(null)
  useEffect(() => {
    if (!inst || modpack || datapack) { setPreview(null); return }
    let live = true
    setPreview({ status: 'loading' })
    api.PlanContent(inst.id, result.id, result.projectType)
      .then((plan) => { if (live) setPreview({ status: 'ready', plan }) })
      .catch((e) => { if (live) setPreview({ status: 'error', message: messageOf(e) }) })
    return () => { live = false }
  }, [inst?.id, result.id, result.projectType, modpack, finished]) // eslint-disable-line react-hooks/exhaustive-deps

  const installed = preview?.status === 'ready' && preview.plan.alreadyInstalled
  const extras = preview?.status === 'ready' ? preview.plan.items.filter((i) => i.requiredBy).map((i) => i.title) : []
  const links = detail ? [[t.detail.source, detail.sourceUrl], [t.detail.issues, detail.issuesUrl], [t.detail.wiki, detail.wikiUrl]].filter(([, u]) => u) : []
  const tabs: Tab[] = modpack || datapack ? ['about'] : ['about', 'versions']

  return (
    <main className="flex-1 flex flex-col gap-6 pt-8 px-10 pb-12">
      <AutoLoader active={!detail} label={t.common.loading} />
      {detail && (
        <>
          <header className="flex gap-6 items-start flex-wrap">
            <ProjectIcon url={detail.iconUrl} size={72} />
            <div className="flex-[1_1_320px] min-w-0 flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <span className="tag bg-tag-gray">{t.search.types[result.projectType]}</span>
                {detail.categories.slice(0, 4).map((c) => <span key={c} className="tag bg-green-soft">{c}</span>)}
              </div>
              <h1 className="m-0">{detail.title}</h1>
              <p className="m-0 text-muted">{detail.description}</p>
              <div className="flex items-center gap-4 flex-wrap text-[13px] text-muted">
                {result.author && <span>{result.author}</span>}
                <Downloads n={detail.downloads} />
                {!modpack && <Sides client={detail.clientSide} server={detail.serverSide} />}
              </div>
            </div>

            <section className="panel flex-[0_1_320px] min-w-64 flex flex-col gap-3 p-5" aria-label={t.detail.install}>
              {modpack ? (
                <>
                  <Button variant="primary" onClick={() => add(result)}>{t.detail.createFromModpack}</Button>
                  <Button variant="idle" onClick={() => go({ name: 'create', server: true, modpack: result })}>{t.detail.createServerFromModpack}</Button>
                </>
              ) : datapack ? (
                <Button variant="primary" onClick={() => add(result)}>{t.detail.install}</Button>
              ) : inst ? (
                <>
                  {candidates.length > 1 && (
                    <Select aria-label={t.detail.installInto} value={target} onChange={(e) => setTarget(e.target.value)}>
                      {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}{c.server ? ` · ${t.nav.servers}` : ''}</option>)}
                    </Select>
                  )}
                  <Button variant={installed ? 'idle' : 'primary'} disabled={installed || busy || preview?.status === 'error'} onClick={() => enqueue(inst.id, result)}>
                    {busy && <Spinner size={12} />}
                    {installed ? t.detail.installed : busy ? t.search.adding : candidates.length > 1 ? t.detail.install : fmt(t.detail.installTo, { name: inst.name })}
                  </Button>
                  {preview?.status === 'loading' && <AutoLoader subtle active label={t.content.planning} />}
                  {preview?.status === 'error' && <ErrorMessage message={preview.message} />}
                  {extras.length > 0 && <p className="m-0 text-xs text-muted">{fmt(t.detail.alsoInstalls, { list: extras.join(', ') })}</p>}
                  {preview?.status === 'ready' && preview.plan.warnings.length > 0 && <p className="m-0 text-xs text-muted">{preview.plan.warnings[0]}</p>}
                </>
              ) : (
                <>
                  <p className="m-0 text-sm text-muted">
                    {instances.length === 0 ? t.detail.noInstances : fmt(t.detail.noCompatible, { loaders: detail.loaders.join('/') || 'Fabric/Forge', versions: detail.gameVersions.slice(-3).join(', ') })}
                  </p>
                  <div className="flex gap-2 flex-wrap"><VersionTag versions={detail.gameVersions} /><LoaderTags loaders={detail.loaders} max={4} /></div>
                </>
              )}
            </section>
          </header>

          {tabs.length > 1 && <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.detail.tabs[k] }))} value={tab} onChange={setTab} />}

          {tab === 'about' && (
            <article className="min-w-0 flex flex-col gap-6">
              <div className="flex items-center gap-4 flex-wrap text-[13px]">
                {detail.license && <span><span className="text-muted">{t.detail.license}:</span> {detail.license}</span>}
                {links.map(([label, url]) => <Button key={label} variant="ghost" size="sm" onClick={() => openExternal(url)}>{label}</Button>)}
              </div>
              <Markdown text={detail.body || detail.description} />
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
            </article>
          )}

          {tab === 'versions' && (
            inst
              ? <Versions key={inst.id} inst={inst} result={result} reload={finished} onInstall={(v) => enqueue(inst.id, result, v)} busy={busy} />
              : <div className="flex flex-col gap-4">
                  <p className="m-0 text-muted">{t.detail.versionsNeedInstance}</p>
                  <div className="flex gap-2 flex-wrap"><VersionTag versions={detail.gameVersions} /><LoaderTags loaders={detail.loaders} max={6} /></div>
                </div>
          )}
        </>
      )}
      {dialog}
    </main>
  )
}

/** "Works in game · Works on servers" in plain words, from Modrinth's client/server side. */
function Sides({ client, server }: { client: string; server: string }) {
  const { t } = useApp()
  const works = (side: string) => side === 'required' || side === 'optional'
  return (
    <>
      {works(client) && <span>{t.detail.worksInGame}</span>}
      {works(server) && <span>{t.detail.worksOnServers}</span>}
    </>
  )
}

/** Every release that runs on the instance. Releases that do not work with
 *  something already installed are kept apart, with the reason, so the list a
 *  player picks from holds only what can be installed. */
function Versions({ inst, result, reload, busy, onInstall }: { inst: Instance; result: SearchResult; reload: number; busy: boolean; onInstall: (versionId: string) => void }) {
  const { t, language } = useApp()
  const [list, setList] = useState<VersionChoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showBlocked, setShowBlocked] = useState(false)

  useEffect(() => {
    let live = true
    api.ListProjectVersions(inst.id, result.id, result.projectType).then((v) => { if (live) setList(v) }).catch((e) => { if (live) setError(messageOf(e)) })
    return () => { live = false }
  }, [inst.id, result.id, result.projectType, reload])

  if (error) return <ErrorMessage message={error} />
  if (!list) return <AutoLoader active label={t.common.loading} />
  const fits = list.filter((v) => !v.conflictWith)
  const blocked = list.filter((v) => v.conflictWith)
  const current = list.some((v) => v.installed)

  const row = (v: VersionChoice) => (
    <div key={v.id} className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu flex-wrap">
      <div className="flex-[1_1_200px] min-w-0 flex flex-col gap-1">
        <div className="text-sm font-bold truncate">{v.number}</div>
        <div className="text-xs text-muted truncate">{v.conflictWith ? fmt(t.detail.conflictWith, { name: v.conflictWith }) : v.name}</div>
      </div>
      <span className={`tag ${v.type === 'release' ? 'bg-green-soft' : 'bg-gold-soft'}`}>{t.detail.releaseTypes[v.type]}</span>
      <span className="text-xs text-muted">{ago(v.datePublished, language)}</span>
      <Button variant={v.installed ? 'idle' : 'primary'} size="sm" disabled={v.installed || busy || !!v.conflictWith} onClick={() => onInstall(v.id)}>
        {v.installed ? t.detail.installed : current ? t.detail.switchTo : t.detail.installThis}
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-muted">{fmt(t.detail.versionsFor, { name: inst.name })}</p>
      {fits.length === 0 && <p className="m-0 text-sm">{t.detail.noVersions}</p>}
      {fits.map(row)}
      {blocked.length > 0 && (
        <>
          <Button variant="ghost" size="sm" className="self-start -ml-4" aria-expanded={showBlocked} onClick={() => setShowBlocked(!showBlocked)}>
            {fmt(t.detail.blockedTitle, { n: blocked.length })}
          </Button>
          {showBlocked && blocked.map(row)}
        </>
      )}
    </div>
  )
}
