import { useEffect, useMemo, useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { ICON_CHOICES } from '../ui/pixels'
import Button from '../ui/Button'
import { Checkbox, Input, Label, Select } from '../ui/Field'
import AutoLoader from '../ui/Loader'
import StatusMessage from '../ui/StatusMessage'
import SegmentedControl from '../ui/SegmentedControl'
import { errorHeadline, messageOf } from '../utils/errors'
import { INSTANCE_NAME } from '../utils/validation'
import { useApp } from '../state'
import BackButton from '../components/BackButton'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import type { Loader, LoaderOption, VersionList } from '../api/types'

const LOADERS: Loader[] = ['Vanilla', 'Forge', 'NeoForge', 'Fabric']

/** Loader support tables are fetched once per loader and kept for the life of the screen. */
type LoaderTable = { status: 'loading' } | { status: 'error' } | { status: 'ready'; byVersion: Map<string, LoaderOption> }

export default function CreateInstance() {
  const { t, go, back, refreshInstances } = useApp()
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
  const canSubmit = INSTANCE_NAME.test(name) && version !== '' && loaderReady && !busy
  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const inst = await api.CreateInstance(INSTANCE_NAME.normalize(name), version, loader, loaderOption?.version ?? '', icon)
      await refreshInstances()
      go({ name: 'instance', id: inst.id })
    } catch (e) {
      setError(messageOf(e)); setBusy(false)
    }
  }

  // Loading states get a loader; the note only ever explains a ready table.
  const loadersLoading = loader !== 'Vanilla' && (!table || table.status === 'loading')
  const loaderNote = (() => {
    if (loader === 'Vanilla') return t.create.loaderVanilla
    if (!table || table.status !== 'ready') return ''
    if (version && !loaderOption) return fmt(t.create.loaderUnsupported, { loader, version })
    return fmt(t.create.loaderHint, { loader, version: loaderOption?.label ?? table.byVersion.values().next().value?.label ?? '' })
  })()

  return (
    <main className="flex-1 flex flex-col items-center gap-6 pt-8 px-10 pb-12">
      {/* Heading on the canvas, the form in the panel. */}
      <div className="w-[min(560px,100%)] flex flex-col gap-4">
        <BackButton />
        <h2 className="mb-2">{t.create.title}</h2>
        <p className="m-0 text-muted">{t.create.subtitle}</p>
      </div>

      <div className="panel w-[min(560px,100%)] flex flex-col gap-6 p-6">
        <div>
          <Label htmlFor="create-name">{t.create.name}</Label>
          <Input id="create-name" type="text" placeholder={t.create.namePlaceholder} value={name} maxLength={INSTANCE_NAME.maxLength} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-4">
          <Label id="create-loader-label" className="mb-0">{t.create.loader}</Label>
          <SegmentedControl aria-labelledby="create-loader-label" options={LOADERS.map((l) => ({ value: l, label: l }))} value={loader} onChange={setLoader} />
          <AutoLoader active={loadersLoading} label={fmt(t.create.loadingLoaders, { loader })} />
          {table?.status === 'error' && <StatusMessage kind="error" headline={t.errors.loadFailed} detail={fmt(t.create.loadersError, { loader })} />}
          {loaderNote && <p className="m-0 text-xs text-muted">{loaderNote}</p>}
        </div>

        <div className="flex flex-col gap-4">
          <Label htmlFor="create-version" className="mb-0">{t.create.version}</Label>
          <AutoLoader active={!versions && !versionsError} label={t.create.loadingVersions} />
          {versionsError && <StatusMessage kind="error" headline={t.errors.connectionLost} detail={t.create.versionsError} />}
          {versions && (
            <Select id="create-version" value={version} onChange={(e) => setVersion(e.target.value)} disabled={loadersLoading}>
              <option value="">{t.create.chooseVersion}</option>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}{v.id === versions.latestRelease ? ` (${t.create.latest})` : ''}{v.type !== 'release' ? ` — ${v.type}` : ''}
                </option>
              ))}
            </Select>
          )}
          <Checkbox checked={showAll} onChange={(e) => setShowAll(e.target.checked)} label={<span className="text-xs">{t.create.showSnapshots}</span>} />
        </div>

        <div className="flex flex-col gap-4">
          <Label className="mb-0">{t.create.icon}</Label>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
            {ICON_CHOICES.map(([key, label]) => (
              <IconChoice key={key} selected={icon === key} title={label} onClick={() => setIcon(key)}>
                <PixelIcon name={key} size={32} />
              </IconChoice>
            ))}
          </div>
        </div>

        {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} />}
        <AutoLoader active={busy} />
        <div className="flex gap-4 justify-end">
          <Button variant="idle" onClick={back}>{t.common.cancel}</Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>{t.create.submit}</Button>
        </div>
      </div>
    </main>
  )
}

/** One cell of the icon picker: Minecraft green when selected, the light gray button when not. */
function IconChoice({ selected, title, onClick, children }: { selected: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" aria-pressed={selected} title={title} onClick={onClick}
      className={`inline-flex items-center justify-center px-2.5 py-2 rounded-md border-0 cursor-pointer transition-all duration-150 ease-in-out ${selected ? 'bg-green text-white' : 'bg-idle text-ink hover:bg-idle-hover'} shadow-neu`}
    >
      {children}
    </button>
  )
}
