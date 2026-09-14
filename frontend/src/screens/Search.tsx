import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import type { ProjectType, SearchGameVersion, SearchPage, SearchResult } from '../api/types'

const TYPES: ProjectType[] = ['mod', 'resourcepack', 'shader', 'modpack']
const LOADERS = ['fabric', 'forge', 'quilt', 'neoforge']
const PAGE_SIZE = 30

export default function Search() {
  const { t } = useApp()
  const [type, setType] = useState<ProjectType>('mod')
  const [text, setText] = useState('')
  const [debouncedText, setDebouncedText] = useState('')
  const [gameVersion, setGameVersion] = useState('')
  const [loader, setLoader] = useState('')
  const [versions, setVersions] = useState<SearchGameVersion[] | null>(null)
  const [page, setPage] = useState<SearchPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.ListSearchGameVersions().then(setVersions).catch(() => setVersions([])) }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedText(text), 350)
    return () => clearTimeout(id)
  }, [text])

  const load = useCallback((offset: number) => {
    setError(null)
    api.SearchContent(type, debouncedText, gameVersion, loader, offset, PAGE_SIZE)
      .then((p) => setPage((cur) => (offset === 0 || !cur ? p : { ...p, results: [...cur.results, ...p.results] })))
      .catch((e) => setError(String((e as Error)?.message ?? e)))
  }, [type, debouncedText, gameVersion, loader])

  useEffect(() => { setPage(null); load(0) }, [load])

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
        {page?.results.map((r) => <ResultCard key={r.id} result={r} />)}
      </div>

      {page && page.results.length < page.total && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={() => load(page.results.length)}>{t.search.loadMore}</button>
        </div>
      )}
    </main>
  )
}

function ResultCard({ result }: { result: SearchResult }) {
  const { t } = useApp()
  return (
    <div className="card elev-sm sheen" style={{ padding: 20, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" loading="lazy" width={44} height={44}
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
    </div>
  )
}
