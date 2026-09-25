import { useEffect, useMemo, useState } from 'react'
import IconPicker from '../components/IconPicker'
import Button from '../ui/Button'
import { Checkbox, Input, Label, Select } from '../ui/Field'
import AutoLoader from '../ui/Loader'
import StatusMessage from '../ui/StatusMessage'
import SegmentedControl from '../ui/SegmentedControl'
import { errorHeadline, messageOf } from '../utils/errors'
import { INSTANCE_NAME } from '../utils/validation'
import { useApp } from '../state'
import BackButton from '../components/BackButton'
import { api, openExternal } from '../api/bridge'
import { serverIconPNG } from '../utils/serverIcon'
import { fmt } from '../i18n/format'
import type { Loader, LoaderOption, VersionList } from '../api/types'

const LOADERS: Loader[] = ['Vanilla', 'Forge', 'NeoForge', 'Fabric', 'Quilt']

/** Loader support tables are fetched once per loader and kept for the life of the screen. */
type LoaderTable = { status: 'loading' } | { status: 'error' } | { status: 'ready'; byVersion: Map<string, LoaderOption> }

/** server: the same form makes a dedicated server (no Quilt, EULA required). */
export default function CreateInstance({ server = false }: { server?: boolean }) {
  const { t, go, back, refreshInstances } = useApp()
  const s = server ? { ...t.create, ...t.servers.create } : t.create
  const loaders = server ? LOADERS.filter((l) => l !== 'Quilt') : LOADERS
  const [eula, setEula] = useState(false)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [loader, setLoader] = useState<Loader>('Vanilla')
  const [icon, setIcon] = useState('grass_block_side')
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
  const canSubmit = INSTANCE_NAME.test(name) && version !== '' && loaderReady && !busy && (!server || eula)
  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const clean = INSTANCE_NAME.normalize(name)
      const inst = server
        ? await api.CreateServer(clean, version, loader, loaderOption?.version ?? '', icon, await serverIconPNG(icon))
        : await api.CreateInstance(clean, version, loader, loaderOption?.version ?? '', icon)
      await refreshInstances()
      go(server ? { name: 'server', id: inst.id } : { name: 'instance', id: inst.id })
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
    return fmt(s.loaderHint, { loader, version: loaderOption?.label ?? table.byVersion.values().next().value?.label ?? '' })
  })()

  return (
    <main className="flex-1 flex flex-col items-center gap-6 pt-8 px-10 pb-12">
      {/* Heading on the canvas, the form in the panel. */}
      <div className="w-[min(560px,100%)] flex flex-col gap-4">
        <BackButton />
        <h2 className="mb-2">{s.title}</h2>
        <p className="m-0 text-muted">{s.subtitle}</p>
      </div>

      <div className="panel w-[min(560px,100%)] flex flex-col gap-6 p-6">
        <div>
          <Label htmlFor="create-name">{s.name}</Label>
          <Input id="create-name" type="text" placeholder={s.namePlaceholder} value={name} maxLength={INSTANCE_NAME.maxLength} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-4">
          <Label id="create-loader-label" className="mb-0">{t.create.loader}</Label>
          <SegmentedControl aria-labelledby="create-loader-label" options={loaders.map((l) => ({ value: l, label: l }))} value={loader} onChange={setLoader} />
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
          <Label className="mb-0">{s.icon}</Label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        {server && <p className="m-0 text-sm text-muted">{t.servers.create.publicNote}</p>}
        {server && (
          <Checkbox checked={eula} onChange={(e) => setEula(e.target.checked)} label={<>
            {t.servers.create.eula}{' '}
            <a href="https://aka.ms/MinecraftEULA" className="text-primary underline" onClick={(e) => { e.preventDefault(); openExternal('https://aka.ms/MinecraftEULA') }}>{t.servers.create.eulaLink}</a>
          </>} />
        )}
        {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} />}
        <AutoLoader active={busy} />
        <div className="flex gap-4 justify-end">
          <Button variant="idle" onClick={back}>{t.common.cancel}</Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>{s.submit}</Button>
        </div>
      </div>
    </main>
  )
}
