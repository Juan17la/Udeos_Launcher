import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import AddInstancePickerDialog from '../components/AddInstancePickerDialog'
import type { ProjectType, SearchGameVersion, SearchPage, SearchResult } from '../api/types'

const TYPES: ProjectType[] = ['mod', 'resourcepack', 'shader', 'modpack']
const LOADERS = ['fabric', 'forge', 'quilt', 'neoforge']
const PAGE_SIZE = 30

// Fetched once per app run and shared by every mount of this screen: Go
// already memoizes the list, this skips the bridge round-trip too.
let versionsPromise: Promise<SearchGameVersion[]> | null = null
function loadVersions() {
  if (!versionsPromise) versionsPromise = api.ListSearchGameVersions().catch(() => { versionsPromise = null; return [] as SearchGameVersion[] })
  return versionsPromise
}

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const inputCls = 'min-h-9 px-3.5 py-1.5 font-inherit text-sm text-text caret-accent bg-surface border border-divider rounded-full hover:border-accent-400 focus-visible:border-accent focus-visible:outline-0 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]'
const segOpt = 'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-[7px] text-[13px] cursor-pointer border-0 bg-transparent text-inherit font-inherit [&:not(:first-child)]:border-l [&:not(:first-child)]:border-divider disabled:opacity-45 disabled:cursor-not-allowed'
const segOptActive = 'bg-accent text-bg'
const cardBase = 'flex flex-col gap-2 rounded-lg bg-surface'
const cardTitle = 'font-heading font-extrabold leading-[1.2]'
const tagAccent = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap bg-accent-100 text-accent-800'
const tagAccent2 = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap bg-accent-2-100 text-accent-2-800'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'

type Props = { instanceId?: string; type?: ProjectType }

/** Browsing is unrestricted: the version/loader filters narrow the catalog
 *  like any search, they never lock to one instance. Whether a result fits
 *  a given instance is worked out on demand — once, when Add or Details is
 *  actually clicked — rather than for every card in the grid, the same
 *  fetch-only-at-click-time rule the rest of this page already follows. */
export default function Search({ instanceId, type: initialType }: Props) {
  const { t, go } = useApp()
  const [type, setType] = useState<ProjectType>(initialType ?? 'mod')
  const [text, setText] = useState('')
  const [debouncedText, setDebouncedText] = useState('')
  const [gameVersion, setGameVersion] = useState('')
  const [loader, setLoader] = useState('')
  const [adding, setAdding] = useState<SearchResult | null>(null)
  const [versions, setVersions] = useState<SearchGameVersion[] | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [page, setPage] = useState<SearchPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Requests can resolve out of order (a slow query answered after a fast
  // one); only the latest one issued is allowed to update the page.
  const seq = useRef(0)

  useEffect(() => { let live = true; loadVersions().then((v) => { if (live) setVersions(v) }); return () => { live = false } }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedText(text), 350)
    return () => clearTimeout(id)
  }, [text])

  // One page's worth of cards is ever mounted at a time: a new page REPLACES
  // the results instead of piling on top of the last one, so the DOM stays a
  // fixed size no matter how far the player pages through. Going back to a
  // page seen in the last few minutes is answered from Go's memory cache,
  // without a request.
  const load = useCallback((offset: number) => {
    const mine = ++seq.current
    setError(null); setLoading(true)
    api.SearchContent(type, debouncedText, gameVersion, loader, offset, PAGE_SIZE)
      .then((p) => { if (mine === seq.current) setPage(p) })
      .catch((e) => { if (mine === seq.current) setError(String((e as Error)?.message ?? e)) })
      .finally(() => { if (mine === seq.current) setLoading(false) })
  }, [type, debouncedText, gameVersion, loader])

  useEffect(() => { setPageIndex(0); setPage(null); load(0) }, [load])
  useEffect(() => () => { seq.current++ }, []) // unmount: drop whatever is still in flight

  const showLoaderFilter = type === 'mod' || type === 'modpack'

  return (
    <main className="flex-1 pt-9 px-11 pb-12">
      <h2 className="mb-1.5 text-[34px]">{t.search.title}</h2>
      <p className={`${textMuted} mb-6 text-[15px]`}>{t.search.subtitle}</p>

      <div className="inline-flex overflow-hidden border border-divider rounded-full mb-5">
        {TYPES.map((k) => (
          <button key={k} type="button" className={`${segOpt} ${type === k ? segOptActive : ''}`} onClick={() => setType(k)}>{t.search.types[k]}</button>
        ))}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input className={`${inputCls} flex-[1_1_220px]`} type="text" placeholder={t.search.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
        <select className={`${inputCls} appearance-auto flex-[0_1_180px]`} value={gameVersion} onChange={(e) => setGameVersion(e.target.value)}>
          <option value="">{t.search.anyVersion}</option>
          {versions?.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
        </select>
        {showLoaderFilter && (
          <select className={`${inputCls} appearance-auto flex-[0_1_160px]`} value={loader} onChange={(e) => setLoader(e.target.value)}>
            <option value="">{t.search.anyLoader}</option>
            {LOADERS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
          </select>
        )}
      </div>

      {error && <p className="mb-4 text-[13px] text-mc-danger">{error}</p>}
      {page && page.results.length === 0 && <div className={`${textMuted} text-center px-5 py-10`}><p className="m-0 text-sm">{t.search.empty}</p></div>}

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
        {page?.results.map((r) => (
          <ResultCard key={r.id} result={r}
            onAdd={r.projectType === 'modpack' ? undefined : () => setAdding(r)}
            onDetails={() => go({ name: 'detail', result: r })} />
        ))}
      </div>

      {adding && (
        <AddInstancePickerDialog result={adding} instanceId={instanceId} onClose={() => setAdding(null)} />
      )}

      {page && page.total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button type="button" className={`${btnBase} ${btnSecondary}`} disabled={loading || pageIndex === 0}
            onClick={() => { const i = pageIndex - 1; setPageIndex(i); load(i * PAGE_SIZE) }}>{t.search.previous}</button>
          <span className={`${textMuted} text-[13px]`}>
            {fmt(t.search.pageOf, { page: pageIndex + 1, total: Math.ceil(page.total / PAGE_SIZE) })}
          </span>
          <button type="button" className={`${btnBase} ${btnSecondary}`} disabled={loading || (pageIndex + 1) * PAGE_SIZE >= page.total}
            onClick={() => { const i = pageIndex + 1; setPageIndex(i); load(i * PAGE_SIZE) }}>{t.search.next}</button>
        </div>
      )}
    </main>
  )
}

type CardProps = { result: SearchResult; onAdd?: () => void; onDetails: () => void }

const ResultCard = memo(function ResultCard({ result, onAdd, onDetails }: CardProps) {
  const { t } = useApp()
  return (
    <div className={`${cardBase} p-5 gap-2.5 shadow-sheen transition-transform duration-150 ease hover:-translate-y-0.5`}>
      <div className="flex items-center gap-3">
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" loading="lazy" decoding="async" width={44} height={44}
            className="rounded-sm object-cover shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className={`${cardTitle} text-[17px] whitespace-nowrap overflow-hidden text-ellipsis`}>{result.title}</div>
          <div className={`${textMuted} text-xs`}>{result.author}</div>
        </div>
      </div>
      <p className={`${textMuted} m-0 text-[13px] line-clamp-2`}>{result.description}</p>
      <div className="flex gap-1.5 flex-wrap">
        {result.loaders.map((l) => <span key={l} className={tagAccent2}>{l}</span>)}
        <span className={tagAccent}>{fmt(t.search.downloads, { n: result.downloads.toLocaleString() })}</span>
      </div>
      {/* Two big, equal-weight actions: Add opens the instance picker (which
         does the real compatibility check), Details is a full page. */}
      <div className="flex gap-2.5 mt-auto">
        {onAdd && <button type="button" className={`${btnBase} ${btnPrimary} flex-1 h-11 text-[15px]`} onClick={onAdd}>{t.search.add}</button>}
        <button type="button" className={`${btnBase} ${btnSecondary} flex-1 h-11 text-[15px]`} onClick={onDetails}>{t.search.details}</button>
      </div>
    </div>
  )
})
