import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { ChevronLeft } from '../ui/icons'
import { useAddAction } from '../components/AddInstancePickerDialog'
import { computeCompat } from '../lib/compat'
import type { ProjectDetail as ProjectDetailData, SearchResult } from '../api/types'

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnGhost = 'text-accent border-transparent px-1.5 bg-transparent hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]'
const cardBase = 'flex flex-col gap-2 rounded-lg bg-surface'
const tagBase = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap'
const tagOutline = `${tagBase} border border-accent text-accent`
const tagNeutral = `${tagBase} bg-neutral-100 text-neutral-800`
const cardMeta = 'flex items-center gap-1.5 text-[11px] text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'

/** instanceId is the instance Search was locked to, so Back returns there
 *  and Add installs into it without a picker. */
type Props = { result: SearchResult; instanceId?: string }

/** Full-page view of one search result: its description, every Minecraft
 *  version/loader it has ever published a build for, and which of the
 *  player's instances can take it — the "detect versions, show compatible
 *  instances" view the Search cards no longer try to cram in. */
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
    <main className="flex-1 pt-9 px-11 pb-15 max-w-[800px]">
      <button type="button" className={`${btnBase} ${btnGhost} mb-4.5 whitespace-nowrap`} onClick={() => go({ name: 'search', instanceId, type: result.projectType })}>
        <ChevronLeft /> {t.detail.back}
      </button>

      <div className="flex gap-5.5 items-start mb-4.5">
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" width={72} height={72}
            className="rounded-md object-cover shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
        <div>
          <span className={`${tagOutline} mb-2`}>{t.search.types[result.projectType]}</span>
          <h1 className="mt-2 mb-1 text-[34px]">{result.title}</h1>
          <div className={`${cardMeta} ${textMuted} text-[13px]`}>{fmt(t.search.downloads, { n: result.downloads.toLocaleString() })} · {result.author}</div>
        </div>
      </div>

      <p className="text-[15px] max-w-[65ch] whitespace-pre-wrap">{detail ? (detail.description || result.description) : t.detail.loading}</p>

      <div className="flex gap-6.5 my-5.5 flex-wrap">
        <div>
          <h6 className="mb-2">{t.detail.versionsHeading}</h6>
          <div className="flex gap-1.5 flex-wrap max-w-[360px]">
            {(detail?.gameVersions ?? []).map((v) => <span key={v} className={tagNeutral}>{v}</span>)}
            {!detail && <span className={`${textMuted} text-[13px]`}>{t.detail.loading}</span>}
          </div>
        </div>
        <div>
          <h6 className="mb-2">{t.detail.loadersHeading}</h6>
          <div className="flex gap-1.5 flex-wrap">
            {(detail ? detail.loaders : result.loaders).map((l) => <span key={l} className={tagNeutral}>{l}</span>)}
          </div>
        </div>
      </div>

      {!modpack && (
        <>
          <h4 className="mt-5 mb-3 text-[22px]">{t.detail.instancesHeading}</h4>
          {instances.length === 0 && <p className={`${textMuted} m-0 text-sm`}>{t.detail.noInstances}</p>}
          {detail && instances.length > 0 && (
            <div className="flex flex-col gap-2 mb-2.5">
              {compat.map(({ instance, ok, reason }) => (
                <div key={instance.id} className={`${cardBase} flex-row items-center py-3 px-4`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{instance.name}</div>
                    <div className={`${cardMeta} mt-0.5 text-xs`}>{instance.version} · {instance.loaderLabel}</div>
                  </div>
                  <span className={`text-[13px] ${ok ? 'text-accent-2-700' : 'text-mc-danger'}`}>{ok ? t.compat.ok : reason}</span>
                </div>
              ))}
            </div>
          )}
          <button type="button" className={`${btnBase} ${btnPrimary} h-12 text-base mt-2`} disabled={!detail} onClick={() => add(result)}>
            {t.detail.add}
          </button>
        </>
      )}

      {dialog}
    </main>
  )
}
