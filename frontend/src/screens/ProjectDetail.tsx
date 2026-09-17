import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { ChevronLeft } from '../ui/icons'
import AddInstancePickerDialog from '../components/AddInstancePickerDialog'
import { computeCompat } from '../lib/compat'
import type { ProjectDetail as ProjectDetailData, SearchResult } from '../api/types'

type Props = { result: SearchResult }

/** Full-page view of one search result: its description, every Minecraft
 *  version/loader it has ever published a build for, and which of the
 *  player's instances can take it — the "detect versions, show compatible
 *  instances" view the Search cards no longer try to cram in. */
export default function ProjectDetail({ result }: Props) {
  const { t, instances, go } = useApp()
  const [detail, setDetail] = useState<ProjectDetailData | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let live = true
    setDetail(null)
    api.GetProjectDetail(result.id).then((d) => { if (live) setDetail(d) }).catch(() => {})
    return () => { live = false }
  }, [result.id])

  const modpack = result.projectType === 'modpack'
  const compat = detail ? computeCompat(detail, instances, t.compat) : []

  return (
    <main className="page" style={{ padding: '36px 44px 60px', maxWidth: 800 }}>
      <button type="button" className="btn btn-ghost" style={{ marginBottom: 18, whiteSpace: 'nowrap' }} onClick={() => go({ name: 'search' })}>
        <ChevronLeft /> {t.detail.back}
      </button>

      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', marginBottom: 18 }}>
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" width={72} height={72}
            style={{ borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
        <div>
          <span className="tag tag-outline" style={{ marginBottom: 8 }}>{t.search.types[result.projectType]}</span>
          <h1 style={{ margin: '8px 0 4px', fontSize: 34 }}>{result.title}</h1>
          <div className="card-meta text-muted" style={{ fontSize: 13 }}>{fmt(t.search.downloads, { n: result.downloads.toLocaleString() })} · {result.author}</div>
        </div>
      </div>

      <p style={{ fontSize: 15, maxWidth: '65ch', whiteSpace: 'pre-wrap' }}>{detail ? (detail.description || result.description) : t.detail.loading}</p>

      <div style={{ display: 'flex', gap: 26, margin: '22px 0', flexWrap: 'wrap' }}>
        <div>
          <h6 style={{ marginBottom: 8 }}>{t.detail.versionsHeading}</h6>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 360 }}>
            {(detail?.gameVersions ?? []).map((v) => <span key={v} className="tag tag-neutral">{v}</span>)}
            {!detail && <span className="text-muted" style={{ fontSize: 13 }}>{t.detail.loading}</span>}
          </div>
        </div>
        <div>
          <h6 style={{ marginBottom: 8 }}>{t.detail.loadersHeading}</h6>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(detail ? detail.loaders : result.loaders).map((l) => <span key={l} className="tag tag-neutral">{l}</span>)}
          </div>
        </div>
      </div>

      {!modpack && (
        <>
          <h4 style={{ margin: '20px 0 12px', fontSize: 22 }}>{t.detail.instancesHeading}</h4>
          {instances.length === 0 && <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>{t.detail.noInstances}</p>}
          {detail && instances.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {compat.map(({ instance, ok, reason }) => (
                <div key={instance.id} className="card row-card">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-title">{instance.name}</div>
                    <div className="card-meta" style={{ marginTop: 2, fontSize: 12 }}>{instance.version} · {instance.loaderLabel}</div>
                  </div>
                  <span style={{ fontSize: 13, color: ok ? 'var(--color-accent-2-700)' : 'var(--mc-danger)' }}>{ok ? t.compat.ok : reason}</span>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-primary" style={{ height: 48, fontSize: 16, marginTop: 8 }} disabled={!detail} onClick={() => setAdding(true)}>
            {t.detail.add}
          </button>
        </>
      )}

      {adding && <AddInstancePickerDialog result={result} onClose={() => setAdding(false)} />}
    </main>
  )
}
