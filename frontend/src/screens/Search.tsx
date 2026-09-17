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
    <main className="page" style={{ padding: '36px 44px 48px' }}>
      <h2 style={{ marginBottom: 6, fontSize: 34 }}>{t.search.title}</h2>
      <p className="text-muted" style={{ margin: '0 0 24px', fontSize: 15 }}>{t.search.subtitle}</p>

      <div className="seg" style={{ marginBottom: 20 }}>
        {TYPES.map((k) => (
          <button key={k} type="button" className={`seg-opt ${type === k ? 'is-active' : ''}`} onClick={() => setType(k)}>{t.search.types[k]}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: '1 1 220px' }} type="text" placeholder={t.search.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
        <select className="input" style={{ flex: '0 1 180px' }} value={gameVersion} onChange={(e) => setGameVersion(e.target.value)}>
          <option value="">{t.search.anyVersion}</option>
          {versions?.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
        </select>
        {showLoaderFilter && (
          <select className="input" style={{ flex: '0 1 160px' }} value={loader} onChange={(e) => setLoader(e.target.value)}>
            <option value="">{t.search.anyLoader}</option>
            {LOADERS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
          </select>
        )}
      </div>

      {error && <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--mc-danger)' }}>{error}</p>}
      {page && page.results.length === 0 && <div className="empty-state"><p>{t.search.empty}</p></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" disabled={loading || pageIndex === 0}
            onClick={() => { const i = pageIndex - 1; setPageIndex(i); load(i * PAGE_SIZE) }}>{t.search.previous}</button>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {fmt(t.search.pageOf, { page: pageIndex + 1, total: Math.ceil(page.total / PAGE_SIZE) })}
          </span>
          <button type="button" className="btn btn-secondary" disabled={loading || (pageIndex + 1) * PAGE_SIZE >= page.total}
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
    <div className="card elev-sm sheen" style={{ padding: 20, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" loading="lazy" decoding="async" width={44} height={44}
            style={{ borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title" style={{ fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.title}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{result.author}</div>
        </div>
      </div>
      <p className="text-muted" style={{ margin: 0, fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{result.description}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {result.loaders.map((l) => <span key={l} className="tag tag-accent-2">{l}</span>)}
        <span className="tag tag-accent">{fmt(t.search.downloads, { n: result.downloads.toLocaleString() })}</span>
      </div>
      {/* Two big, equal-weight actions: Add opens the instance picker (which
         does the real compatibility check), Details is a full page. */}
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        {onAdd && <button type="button" className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 15 }} onClick={onAdd}>{t.search.add}</button>}
        <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 15 }} onClick={onDetails}>{t.search.details}</button>
      </div>
    </div>
  )
})
