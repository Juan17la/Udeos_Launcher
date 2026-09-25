import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import Button from '../ui/Button'
import { Input, Select } from '../ui/Field'
import StatusMessage from '../ui/StatusMessage'
import AutoLoader from '../ui/Loader'
import SegmentedControl from '../ui/SegmentedControl'
import { errorHeadline, messageOf } from '../utils/errors'
import { allowedTypes, loadSearchVersions, pageList } from '../utils/search'
import { useAddAction } from '../hooks/useAddAction'
import BackButton from '../components/BackButton'
import ProjectIcon from '../components/ProjectIcon'
import { DownloadsTag, InstanceTags, LoaderTags, VersionTag } from '../components/Tags'
import type { ProjectType, SearchGameVersion, SearchPage, SearchResult, SortBy } from '../api/types'

const LOADERS = ['fabric', 'forge', 'quilt', 'neoforge']
const SORTS: SortBy[] = ['relevance', 'downloads', 'newest', 'updated']
const PAGE_SIZE = 30

type Props = { instanceId?: string; type?: ProjectType }

/** What the page looked like when the player last left it. Coming back with
 *  Back (from a project's Details) puts it all back — search text, filters,
 *  page and the results themselves, so the scroll lands on the same card. */
type Saved = {
  instanceId?: string; type: ProjectType; text: string; gameVersion: string; loader: string; sortBy: SortBy
  pageIndex: number; page: SearchPage | null; loadedKey: string | null
}
let saved: Saved | null = null

/** Two ways in. From the nav, browsing is unrestricted: version/loader
 *  narrow the catalog like any search, and Add asks which instance (only
 *  the compatible ones, one click). From an instance's "Add from Modrinth"
 *  button the results are locked to that instance's version (and loader,
 *  for mods), Add installs straight away and what is already in the
 *  instance shows as Added. Either way nothing is fetched per card: the
 *  compatibility check happens once, when Add is actually clicked. */
export default function Search({ instanceId, type: initialType }: Props) {
  const { t, go, instances, cameBack } = useApp()
  const [init] = useState(() => (cameBack && saved?.instanceId === instanceId ? saved : null))
  const { jobs } = useContent()
  // A deleted instance (id no longer listed) falls back to unrestricted browsing.
  const inst = instanceId ? instances.find((i) => i.id === instanceId) : undefined
  const types = allowedTypes(inst)
  const [rawType, setType] = useState<ProjectType>(init?.type ?? initialType ?? 'mod')
  const type = types.includes(rawType) ? rawType : types[0]
  const [text, setText] = useState(init?.text ?? '')
  const [debouncedText, setDebouncedText] = useState(init?.text ?? '')
  const [gameVersion, setGameVersion] = useState(init?.gameVersion ?? '')
  const [loader, setLoader] = useState(init?.loader ?? '')
  const [sortBy, setSortBy] = useState<SortBy>(init?.sortBy ?? 'relevance')
  const [installed, setInstalled] = useState<Set<string>>(() => new Set())
  const { add, dialog } = useAddAction(inst?.id, { gameVersion, loader })
  const [versions, setVersions] = useState<SearchGameVersion[] | null>(null)
  const [pageIndex, setPageIndex] = useState(init?.pageIndex ?? 0)
  const [page, setPage] = useState<SearchPage | null>(init?.page ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Requests can resolve out of order (a slow query answered after a fast
  // one); only the latest one issued is allowed to update the page.
  const seq = useRef(0)
  // The query (minus paging) the shown results answer; a restored page skips its reload.
  const loadedKey = useRef<string | null>(init?.loadedKey ?? null)

  useEffect(() => { let live = true; loadSearchVersions().then((v) => { if (live) setVersions(v) }); return () => { live = false } }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedText(text), 350)
    return () => clearTimeout(id)
  }, [text])

  // Projects already in the instance, so their cards read "Added". Jobs
  // finishing in this session are folded in below without a refetch.
  useEffect(() => {
    if (!inst) { setInstalled(new Set()); return }
    let live = true
    api.ListInstalledProjects(inst.id).then((ids) => { if (live) setInstalled(new Set(ids)) }).catch(() => {})
    return () => { live = false }
  }, [inst?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const showLoaderFilter = type === 'mod' || type === 'modpack'
  // The loader filter only ever applies to mods (and modpacks): a Fabric
  // choice made on the Mods tab must not narrow resource packs or shaders.
  // With an instance in context both filters are locked to it.
  const effectiveVersion = inst ? inst.version : gameVersion
  const effectiveLoader = showLoaderFilter ? (inst ? inst.loader.toLowerCase() : loader) : ''

  // One page's worth of cards is ever mounted at a time: a new page REPLACES
  // the results instead of piling on top of the last one, so the DOM stays a
  // fixed size no matter how far the player pages through. Going back to a
  // page seen in the last few minutes is answered from Go's memory cache,
  // without a request.
  const key = JSON.stringify([type, debouncedText, effectiveVersion, effectiveLoader, sortBy])
  const load = useCallback((offset: number) => {
    const mine = ++seq.current
    setError(null); setLoading(true)
    api.SearchContent(type, debouncedText, effectiveVersion, effectiveLoader, sortBy, offset, PAGE_SIZE)
      .then((p) => { if (mine === seq.current) { setPage(p); loadedKey.current = key } })
      .catch((e) => { if (mine === seq.current) setError(messageOf(e)) })
      .finally(() => { if (mine === seq.current) setLoading(false) })
  }, [type, debouncedText, effectiveVersion, effectiveLoader, sortBy, key])

  useEffect(() => {
    if (loadedKey.current === key) return
    setPageIndex(0); setPage(null); load(0)
  }, [load, key])
  useEffect(() => { saved = { instanceId, type, text, gameVersion, loader, sortBy, pageIndex, page, loadedKey: loadedKey.current } })
  useEffect(() => () => { seq.current++ }, []) // unmount: drop whatever is still in flight

  // Paging replaces the grid, so land the player at the top of the new page.
  const pages = page ? Math.ceil(page.total / PAGE_SIZE) : 0
  const goToPage = (i: number) => {
    if (i < 0 || i >= pages || i === pageIndex) return
    setPageIndex(i); load(i * PAGE_SIZE); window.scrollTo({ top: 0 })
  }

  // Per-card state in instance mode: already there, or on its way.
  const stateOf = (r: SearchResult): 'added' | 'busy' | undefined => {
    if (!inst) return undefined
    if (installed.has(r.id)) return 'added'
    const job = jobs.find((j) => j.instanceId === inst.id && j.result.id === r.id)
    if (job?.status === 'done') return 'added'
    if (job?.status === 'queued' || job?.status === 'installing') return 'busy'
    return undefined
  }

  return (
    <main className="flex-1 flex flex-col gap-6 pt-8 px-10 pb-12">
      <div className="flex flex-col gap-4">
        <BackButton />
        <h2 className="mb-2">{t.nav.search}</h2>
        <p className="m-0 text-muted">{t.search.subtitle}</p>
      </div>

      {inst && (
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-lg">{fmt(t.search.forInstance, { name: inst.name })}</span>
          <InstanceTags inst={inst} />
        </div>
      )}

      <SegmentedControl options={types.map((k) => ({ value: k, label: t.search.types[k] }))} value={type} onChange={setType} />

      <div className="flex gap-4 flex-wrap">
        <Input className="flex-[1_1_220px]" type="search" placeholder={t.search.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
        <Select className="flex-[0_1_180px]" value={effectiveVersion} disabled={!!inst} onChange={(e) => setGameVersion(e.target.value)}>
          <option value="">{t.search.anyVersion}</option>
          {versions?.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
          {/* A locked version that Modrinth's release list lacks (a snapshot instance) still needs an <option> to display. */}
          {inst && !versions?.some((v) => v.version === inst.version) && <option value={inst.version}>{inst.version}</option>}
        </Select>
        {showLoaderFilter && (
          <Select className="flex-[0_1_160px]" value={effectiveLoader} disabled={!!inst} onChange={(e) => setLoader(e.target.value)}>
            <option value="">{t.search.anyLoader}</option>
            {LOADERS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
          </Select>
        )}
        <Select className="flex-[0_1_200px]" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
          {SORTS.map((k) => <option key={k} value={k}>{t.search.sort[k]}</option>)}
        </Select>
      </div>

      {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} />}
      <AutoLoader active={loading} label={t.common.loading} />
      {page && page.total > 0 && (
        <p className="m-0 text-[13px] text-muted">
          {fmt(t.search.showing, { from: (pageIndex * PAGE_SIZE + 1).toLocaleString(), to: Math.min((pageIndex + 1) * PAGE_SIZE, page.total).toLocaleString(), total: page.total.toLocaleString() })}
        </p>
      )}
      {page?.results.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.search.empty}</p>}

      <div className={`grid gap-6 transition-opacity duration-150 ease-in-out ${loading ? 'opacity-50' : ''}`} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
        {page?.results.map((r) => (
          <ResultCard key={r.id} result={r} state={stateOf(r)} onAdd={() => add(r)}
            onDetails={() => go({ name: 'detail', result: r, instanceId: inst?.id })} />
        ))}
      </div>

      {dialog}

      {pages > 1 && <Pager index={pageIndex} pages={pages} disabled={loading} onGo={goToPage} />}
    </main>
  )
}

/** state is only set with an instance in context: 'added' = already in it, 'busy' = installing now. */
type CardProps = { result: SearchResult; state?: 'added' | 'busy'; onAdd: () => void; onDetails: () => void }

/** Previous / numbered pages with "…" gaps / Next, plus a box to jump to any page. */
function Pager({ index, pages, disabled, onGo }: { index: number; pages: number; disabled: boolean; onGo: (i: number) => void }) {
  const { t } = useApp()
  return (
    <nav className="flex items-center justify-center gap-2 flex-wrap" aria-label={t.search.pages}>
      <Button variant="idle" size="sm" disabled={disabled || index === 0} onClick={() => onGo(index - 1)}>{t.search.previous}</Button>
      {pageList(index, pages).map((i, n) => i === null
        ? <span key={`gap${n}`} className="px-1 text-muted">…</span>
        : <Button key={i} variant={i === index ? 'primary' : 'idle'} size="sm" square disabled={disabled}
            aria-current={i === index ? 'page' : undefined} onClick={() => onGo(i)}>{i + 1}</Button>)}
      <Button variant="idle" size="sm" disabled={disabled || index + 1 >= pages} onClick={() => onGo(index + 1)}>{t.search.next}</Button>
      <Input className="w-24! ml-2" type="number" min={1} max={pages} placeholder={t.search.goTo} aria-label={t.search.goTo} disabled={disabled}
        onKeyDown={(e) => { if (e.key === 'Enter') { onGo(Number(e.currentTarget.value) - 1); e.currentTarget.value = '' } }} />
    </nav>
  )
}

const ResultCard = memo(function ResultCard({ result, state, onAdd, onDetails }: CardProps) {
  const { t } = useApp()
  return (
    // The whole card opens Details; the buttons inside stop the click from bubbling.
    <div role="link" tabIndex={0} onClick={onDetails} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onDetails() }}
      className="panel panel-hover flex flex-col gap-4 p-5 cursor-pointer">
      <div className="flex items-center gap-4">
        <ProjectIcon url={result.iconUrl} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="font-bold text-base leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis">{result.title}</div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted truncate">{result.author}</span>
            <DownloadsTag n={result.downloads} />
          </div>
        </div>
      </div>
      <p className="m-0 text-[13px] text-muted line-clamp-2">{result.description}</p>
      <div className="flex gap-2 flex-wrap">
        <VersionTag versions={result.gameVersions ?? []} />
        <LoaderTags loaders={result.loaders} max={2} />
      </div>
      {/* Two big, equal-weight actions: Add installs (directly, or after a
         one-click instance pick), Details is a full page. */}
      <div className="flex gap-4 mt-auto">
        <Button variant={state === undefined ? 'primary' : 'idle'} className="flex-1" disabled={state !== undefined} onClick={(e) => { e.stopPropagation(); onAdd() }}>
          {state === 'added' ? t.search.added : state === 'busy' ? t.search.adding : t.search.add}
        </Button>
        <Button variant="idle" className="flex-1" onClick={(e) => { e.stopPropagation(); onDetails() }}>{t.search.details}</Button>
      </div>
    </div>
  )
})
