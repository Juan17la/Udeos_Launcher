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
import { allowedTypes, loadSearchVersions } from '../utils/search'
import { useAddAction } from '../hooks/useAddAction'
import BackButton from '../components/BackButton'
import ProjectIcon from '../components/ProjectIcon'
import type { ProjectType, SearchGameVersion, SearchPage, SearchResult, SortBy } from '../api/types'

const LOADERS = ['fabric', 'forge', 'quilt', 'neoforge']
const SORTS: SortBy[] = ['relevance', 'downloads', 'newest', 'updated']
const PAGE_SIZE = 30

type Props = { instanceId?: string; type?: ProjectType }

/** Two ways in. From the nav, browsing is unrestricted: version/loader
 *  narrow the catalog like any search, and Add asks which instance (only
 *  the compatible ones, one click). From an instance's "Add from Modrinth"
 *  button the results are locked to that instance's version (and loader,
 *  for mods), Add installs straight away and what is already in the
 *  instance shows as Added. Either way nothing is fetched per card: the
 *  compatibility check happens once, when Add is actually clicked. */
export default function Search({ instanceId, type: initialType }: Props) {
  const { t, go, instances } = useApp()
  const { jobs } = useContent()
  // A deleted instance (id no longer listed) falls back to unrestricted browsing.
  const inst = instanceId ? instances.find((i) => i.id === instanceId) : undefined
  const types = allowedTypes(inst)
  const [rawType, setType] = useState<ProjectType>(initialType ?? 'mod')
  const type = types.includes(rawType) ? rawType : types[0]
  const [text, setText] = useState('')
  const [debouncedText, setDebouncedText] = useState('')
  const [gameVersion, setGameVersion] = useState('')
  const [loader, setLoader] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('relevance')
  const [installed, setInstalled] = useState<Set<string>>(() => new Set())
  const { add, dialog } = useAddAction(inst?.id, { gameVersion, loader })
  const [versions, setVersions] = useState<SearchGameVersion[] | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [page, setPage] = useState<SearchPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Requests can resolve out of order (a slow query answered after a fast
  // one); only the latest one issued is allowed to update the page.
  const seq = useRef(0)

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
  const load = useCallback((offset: number) => {
    const mine = ++seq.current
    setError(null); setLoading(true)
    api.SearchContent(type, debouncedText, effectiveVersion, effectiveLoader, sortBy, offset, PAGE_SIZE)
      .then((p) => { if (mine === seq.current) setPage(p) })
      .catch((e) => { if (mine === seq.current) setError(messageOf(e)) })
      .finally(() => { if (mine === seq.current) setLoading(false) })
  }, [type, debouncedText, effectiveVersion, effectiveLoader, sortBy])

  useEffect(() => { setPageIndex(0); setPage(null); load(0) }, [load])
  useEffect(() => () => { seq.current++ }, []) // unmount: drop whatever is still in flight

  // Paging replaces the grid, so land the player at the top of the new page.
  const goToPage = (i: number) => { setPageIndex(i); load(i * PAGE_SIZE); window.scrollTo({ top: 0 }) }

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
        <h2 className="mb-2">{t.search.title}</h2>
        <p className="m-0 text-muted">{t.search.subtitle}</p>
      </div>

      {inst && (
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-lg">{fmt(t.search.forInstance, { name: inst.name })}</span>
          <span className="tag bg-green-soft">{inst.version}</span>
          <span className="tag bg-gold-soft">{inst.loaderLabel}</span>
        </div>
      )}

      <SegmentedControl options={types.map((k) => ({ value: k, label: t.search.types[k] }))} value={type} onChange={setType} />

      <div className="flex gap-4 flex-wrap">
        <Input className="flex-[1_1_220px]" type="text" placeholder={t.search.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
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
      {page?.results.length === 0 && <p className="text-muted text-center text-sm px-5 py-10">{t.search.empty}</p>}

      <div className={`grid gap-6 transition-opacity duration-150 ease-in-out ${loading ? 'opacity-50' : ''}`} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
        {page?.results.map((r) => (
          <ResultCard key={r.id} result={r} state={stateOf(r)} onAdd={() => add(r)}
            onDetails={() => go({ name: 'detail', result: r, instanceId: inst?.id })} />
        ))}
      </div>

      {dialog}

      {page && page.total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="idle" disabled={loading || pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>{t.search.previous}</Button>
          <span className="text-[13px] text-muted">
            {fmt(t.search.pageOf, { page: pageIndex + 1, total: Math.ceil(page.total / PAGE_SIZE) })}
          </span>
          <Button variant="idle" disabled={loading || (pageIndex + 1) * PAGE_SIZE >= page.total} onClick={() => goToPage(pageIndex + 1)}>{t.search.next}</Button>
        </div>
      )}
    </main>
  )
}

/** state is only set with an instance in context: 'added' = already in it, 'busy' = installing now. */
type CardProps = { result: SearchResult; state?: 'added' | 'busy'; onAdd: () => void; onDetails: () => void }

const ResultCard = memo(function ResultCard({ result, state, onAdd, onDetails }: CardProps) {
  const { t } = useApp()
  return (
    <div className="panel panel-hover flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <ProjectIcon url={result.iconUrl} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="font-bold text-base leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis">{result.title}</div>
          <div className="text-xs text-muted">{result.author}</div>
        </div>
      </div>
      <p className="m-0 text-[13px] text-muted line-clamp-2">{result.description}</p>
      <div className="flex gap-2 flex-wrap">
        {result.loaders.map((l) => <span key={l} className="tag bg-gold-soft">{l}</span>)}
        <span className="tag bg-tag-gray">{fmt(t.search.downloads, { n: result.downloads.toLocaleString() })}</span>
      </div>
      {/* Two big, equal-weight actions: Add installs (directly, or after a
         one-click instance pick), Details is a full page. */}
      <div className="flex gap-4 mt-auto">
        <Button variant={state === undefined ? 'primary' : 'idle'} className="flex-1" disabled={state !== undefined} onClick={onAdd}>
          {state === 'added' ? t.search.added : state === 'busy' ? t.search.adding : t.search.add}
        </Button>
        <Button variant="idle" className="flex-1" onClick={onDetails}>{t.search.details}</Button>
      </div>
    </div>
  )
})
