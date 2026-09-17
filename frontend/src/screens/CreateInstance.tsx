import { useEffect, useMemo, useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { ICON_CHOICES } from '../ui/pixels'
import { Check } from '../ui/icons'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import type { Loader, LoaderOption, VersionList } from '../api/types'

const LOADERS: Loader[] = ['Vanilla', 'Forge', 'Fabric']

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const inputCls = 'w-full min-h-9 px-3.5 py-1.5 font-inherit text-sm text-text caret-accent bg-surface border border-divider rounded-full hover:border-accent-400 focus-visible:border-accent focus-visible:outline-0 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]'
const fieldLabel = 'block text-xs mb-1 text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]'
const segOpt = 'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-[7px] text-[13px] cursor-pointer border-0 bg-transparent text-inherit font-inherit [&:not(:first-child)]:border-l [&:not(:first-child)]:border-divider disabled:opacity-45 disabled:cursor-not-allowed'
const segOptActive = 'bg-accent text-bg'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'

/** Loader support tables are fetched once per loader and kept for the life of the screen. */
type LoaderTable = { status: 'loading' } | { status: 'error' } | { status: 'ready'; byVersion: Map<string, LoaderOption> }

export default function CreateInstance() {
  const { t, go, refreshInstances } = useApp()
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [loader, setLoader] = useState<Loader>('Vanilla')
  const [icon, setIcon] = useState('grass')
  const [showAll, setShowAll] = useState(false)
  const [versions, setVersions] = useState<VersionList | null>(null)
  const [versionsError, setVersionsError] = useState(false)
  const [tables, setTables] = useState<Partial<Record<Loader, LoaderTable>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.ListVersions().then(setVersions).catch(() => setVersionsError(true))
  }, [])

  // Fetch which Minecraft versions the chosen loader supports (once per loader).
  useEffect(() => {
    if (loader === 'Vanilla' || tables[loader]) return
    setTables((cur) => ({ ...cur, [loader]: { status: 'loading' } }))
    api.ListLoaderVersions(loader)
      .then((opts) => setTables((cur) => ({ ...cur, [loader]: { status: 'ready', byVersion: new Map(opts.map((o) => [o.minecraft, o])) } })))
      .catch(() => setTables((cur) => ({ ...cur, [loader]: { status: 'error' } })))
  }, [loader, tables])

  const table = loader === 'Vanilla' ? null : tables[loader]
  const options = useMemo(() => {
    if (!versions) return []
    return versions.versions.filter((v) => {
      if (!showAll && v.type !== 'release') return false
      // With a loader picked, only offer versions it has a build for.
      return !table || table.status !== 'ready' || table.byVersion.has(v.id)
    })
  }, [versions, showAll, table])

  // A version chosen before switching loader may not be supported by the new one.
  useEffect(() => {
    if (version && table?.status === 'ready' && !table.byVersion.has(version)) setVersion('')
  }, [version, table])

  const loaderOption = table?.status === 'ready' && version ? table.byVersion.get(version) : undefined
  const loaderReady = loader === 'Vanilla' || table?.status === 'ready'
  const canSubmit = name.trim().length > 0 && version !== '' && loaderReady && !busy
  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const inst = await api.CreateInstance(name.trim(), version, loader, loaderOption?.version ?? '', icon)
      await refreshInstances()
      go({ name: 'instance', id: inst.id })
    } catch (e) {
      setError(String((e as Error)?.message ?? e)); setBusy(false)
    }
  }

  const loaderNote = (() => {
    if (loader === 'Vanilla') return t.create.loaderVanilla
    if (!table || table.status === 'loading') return fmt(t.create.loadingLoaders, { loader })
    if (table.status === 'error') return fmt(t.create.loadersError, { loader })
    if (version && !loaderOption) return fmt(t.create.loaderUnsupported, { loader, version })
    return fmt(t.create.loaderHint, { loader, version: loaderOption?.label ?? table.byVersion.values().next().value?.label ?? '' })
  })()

  return (
    <main className="flex-1 flex justify-center pt-9 px-11 pb-15">
      <div className="flex flex-col gap-4.5 self-start rounded-lg bg-surface shadow-sheen w-[min(520px,100%)] p-7.5">
        <h2 className="mb-0.5 text-[32px]">{t.create.title}</h2>
        <p className={`${textMuted} mb-1.5 text-sm`}>{t.create.subtitle}</p>

        <div className="mb-3">
          <label htmlFor="create-name" className={fieldLabel}>{t.create.name}</label>
          <input id="create-name" className={inputCls} type="text" placeholder={t.create.namePlaceholder} value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mb-3">
          <label id="create-loader-label" className={fieldLabel}>{t.create.loader}</label>
          <div className="inline-flex overflow-hidden border border-divider rounded-full" role="radiogroup" aria-labelledby="create-loader-label">
            {LOADERS.map((l) => (
              <button key={l} type="button" role="radio" className={`${segOpt} ${l === loader ? segOptActive : ''}`} aria-checked={l === loader} onClick={() => setLoader(l)}>{l}</button>
            ))}
          </div>
          <p className={`mt-2 text-xs ${table?.status === 'error' ? 'text-mc-danger' : textMuted}`}>{loaderNote}</p>
        </div>

        <div className="mb-3">
          <label htmlFor="create-version" className={fieldLabel}>{t.create.version}</label>
          <select id="create-version" className={`${inputCls} appearance-auto`} value={version} onChange={(e) => setVersion(e.target.value)} disabled={!versions || (table?.status === 'loading')}>
            <option value="">{versions ? t.create.chooseVersion : versionsError ? t.create.versionsError : t.create.loadingVersions}</option>
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}{v.id === versions?.latestRelease ? ` (${t.create.latest})` : ''}{v.type !== 'release' ? ` — ${v.type}` : ''}
              </option>
            ))}
          </select>
          <label className="mt-2 text-xs inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="peer absolute w-0 h-0 opacity-0 pointer-events-none" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            <span className="w-4 h-4 flex-none rounded-[5px] border-[1.5px] border-divider inline-flex items-center justify-center text-bg peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-2 [&>svg]:hidden peer-checked:[&>svg]:block">
              <Check size={10} />
            </span>
            {t.create.showSnapshots}
          </label>
        </div>

        <div className="mb-3">
          <label className={fieldLabel}>{t.create.icon}</label>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
            {ICON_CHOICES.map(([key, label]) => {
              const active = icon === key
              return (
                <button
                  key={key} type="button" title={label} onClick={() => setIcon(key)}
                  className={`flex items-center justify-center p-2 cursor-pointer rounded-md border-[1.5px] ${active ? 'bg-choice-bg text-choice-text border-accent' : 'bg-bg text-text border-divider'}`}
                >
                  <PixelIcon name={key} size={32} />
                </button>
              )
            })}
          </div>
        </div>

        <p className={`${textMuted} m-0 text-[13px]`}>{error ?? t.create.required}</p>
        <div className="flex gap-2.5 justify-end mt-1">
          <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={() => go({ name: 'dashboard' })}>{t.common.cancel}</button>
          <button type="button" className={`${btnBase} ${btnPrimary}`} disabled={!canSubmit} onClick={submit}>{t.create.submit}</button>
        </div>
      </div>
    </main>
  )
}
