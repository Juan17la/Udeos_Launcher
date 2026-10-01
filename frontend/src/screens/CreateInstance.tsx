import { useCallback, useEffect, useMemo, useState } from 'react'
import IconPicker from '../components/IconPicker'
import ErrorMessage from '../components/ErrorMessage'
import Button from '../ui/Button'
import { Input, Label, Select } from '../ui/Field'
import AutoLoader from '../ui/Loader'
import StatusMessage from '../ui/StatusMessage'
import SegmentedControl from '../ui/SegmentedControl'
import { messageOf } from '../utils/errors'
import { INSTANCE_NAME } from '../utils/validation'
import { useApp, useContent, useLaunch } from '../state'
import { api, openExternal } from '../api/bridge'
import { serverIconPNG } from '../utils/serverIcon'
import { Download } from '../ui/icons'
import { fmt } from '../i18n/format'
import ProjectIcon from '../components/ProjectIcon'
import type { Loader, LoaderOption, SearchResult, VersionList } from '../api/types'

/** Fabric first: the lightest and most popular, so "With mods" works without choosing. */
const MOD_LOADERS: Loader[] = ['Fabric', 'Forge', 'NeoForge', 'Quilt']

/** Loader support tables are fetched once per loader and kept for the life of the screen. */
type LoaderTable = { status: 'loading' } | { status: 'error' } | { status: 'ready'; byVersion: Map<string, LoaderOption> }

type Kind = 'vanilla' | 'mods' | 'modpack'

/** "My World", "My World 2", … : the first name no instance or server has. */
function freeName(base: string, taken: string[]) {
  const used = new Set(taken.map((n) => n.toLowerCase()))
  for (let n = 1; ; n++) {
    const name = n === 1 ? base : `${base} ${n}`
    if (!used.has(name.toLowerCase())) return name
  }
}

/** One screen, nothing below the fold, everything pre-filled: a free name, the
 *  latest release, Vanilla, a block icon. "Create & play" is two clicks away.
 *  server: the same form makes a dedicated server (no Quilt, the EULA notice). */
export default function CreateInstance({ server = false, modpack }: { server?: boolean; modpack?: SearchResult }) {
  const { t, go, refreshInstances, instances, servers } = useApp()
  const { play } = useLaunch()
  const { enqueueJoinFile, enqueueCreate } = useContent()
  const s = server ? { ...t.create, ...t.servers.create } : t.create
  const loaders = server ? MOD_LOADERS.filter((l) => l !== 'Quilt') : MOD_LOADERS
  const [kind, setKind] = useState<Kind>(modpack ? 'modpack' : 'vanilla')
  // A server can be built from a modpack: the pack picked, and which of its Minecraft versions (newest = last).
  const [pack, setPack] = useState<SearchResult | null>(modpack ?? null)
  const [packVersion, setPackVersion] = useState(modpack?.gameVersions?.slice(-1)[0] ?? '')
  const [modLoader, setModLoader] = useState<Loader>('Fabric')
  const loader: Loader = kind === 'mods' ? modLoader : 'Vanilla'
  const taken = useMemo(() => [...instances, ...servers].map((i) => i.name), [instances, servers])
  const [name, setName] = useState(() => freeName(modpack ? modpack.title.slice(0, INSTANCE_NAME.maxLength) : server ? t.servers.create.defaultName : t.create.defaultName, taken))
  const [named, setNamed] = useState(false) // the player typed a name: picking a pack no longer renames
  const [version, setVersion] = useState('')
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

  // Always a valid version selected: the latest release, or the newest the loader supports.
  useEffect(() => {
    if (!versions || options.length === 0 || (table && table.status !== 'ready')) return
    if (!options.some((v) => v.id === version)) setVersion(options.find((v) => v.id === versions.latestRelease)?.id ?? options[0].id)
  }, [versions, options, version, table])

  const loaderOption = table?.status === 'ready' && version ? table.byVersion.get(version) : undefined
  const loaderReady = loader === 'Vanilla' || table?.status === 'ready'
  const ready = kind === 'modpack' ? !!pack : version !== '' && loaderReady
  const canSubmit = INSTANCE_NAME.test(name) && ready && !busy
  const pickPack = (r: SearchResult) => {
    setPack(r); setPackVersion(r.gameVersions?.slice(-1)[0] ?? '')
    if (!named) setName(freeName(r.title.slice(0, INSTANCE_NAME.maxLength), taken))
  }
  const submit = async (playNow: boolean) => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const clean = INSTANCE_NAME.normalize(name)
      if (kind === 'modpack' && pack) {
        // Built in the background (see the Activity button); the server shows up in the list when it is ready.
        enqueueCreate(pack, { name: clean, icon, gameVersion: packVersion, loader: '', server: { iconPNG: await serverIconPNG(icon) } })
        go({ name: 'servers' })
        return
      }
      const inst = server
        ? await api.CreateServer(clean, version, loader, loaderOption?.version ?? '', icon, await serverIconPNG(icon))
        : await api.CreateInstance(clean, version, loader, loaderOption?.version ?? '', icon)
      await refreshInstances()
      go(server ? { name: 'server', id: inst.id } : { name: 'instance', id: inst.id })
      // Play installs what is missing first; its dialog shows the download, then the game starts.
      if (!server && playNow) play(inst.id)
    } catch (e) {
      setError(messageOf(e)); setBusy(false)
    }
  }

  // A join file from a friend's server: the instance is built from it in the background (see the Activity button).
  const [joinError, setJoinError] = useState<string | null>(null)
  const importFile = useCallback(async (path: string) => {
    setJoinError(null)
    try {
      const info = await api.ReadJoinFile(path)
      enqueueJoinFile(path, info.name)
      go({ name: 'dashboard' })
    } catch (e) { setJoinError(messageOf(e)) }
  }, [enqueueJoinFile, go])
  const browseJoin = async () => { const p = await api.PickJoinFile(); if (p) importFile(p) }

  const loadersLoading = kind === 'mods' && (!table || table.status === 'loading')
  const unsupported = table?.status === 'ready' && options.length === 0

  return (
    <main className="flex-1 flex flex-col items-center gap-4 pt-8 px-10 pb-8">
      <div className="w-[min(560px,100%)] flex items-center justify-between gap-4 flex-wrap">
        <h2 className="m-0">{s.title}</h2>
        {!server && <Button variant="idle" size="sm" onClick={browseJoin} title={t.create.join.hint}><Download size={14} /> {t.create.join.browse}</Button>}
      </div>
      {joinError && <div className="w-[min(560px,100%)]"><ErrorMessage message={joinError} /></div>}

      <form className="panel w-[min(560px,100%)] flex flex-col gap-5 p-6" onSubmit={(e) => { e.preventDefault(); submit(!server) }}>
        <div>
          <Label htmlFor="create-name">{s.name}</Label>
          <div className="flex gap-3">
            <IconPicker value={icon} onChange={setIcon} />
            <Input id="create-name" type="text" placeholder={s.namePlaceholder} value={name} maxLength={INSTANCE_NAME.maxLength} autoFocus
              onFocus={(e) => e.currentTarget.select()} onChange={(e) => { setName(e.target.value); setNamed(true) }} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SegmentedControl aria-label={t.create.loader}
            options={[{ value: 'vanilla' as Kind, label: t.create.kinds.vanilla }, { value: 'mods' as Kind, label: t.create.kinds.mods }, ...(server ? [{ value: 'modpack' as Kind, label: t.create.kinds.modpack }] : [])]} value={kind} onChange={setKind} />
          <p className="m-0 text-xs text-muted">
            {t.create.kindHints[kind]}
            {!server && <> <button type="button" className="underline cursor-pointer bg-transparent border-0 p-0 text-inherit font-[inherit]" onClick={() => go({ name: 'search', type: 'modpack' })}>{t.create.modpackLink}</button></>}
          </p>
          {kind === 'mods' && (
            <SegmentedControl aria-label={t.create.loader} options={loaders.map((l) => ({ value: l, label: l }))} value={modLoader} onChange={setModLoader} />
          )}
          {kind === 'modpack' && <PackPicker value={pack} onPick={pickPack} />}
          <AutoLoader subtle active={loadersLoading && table?.status !== 'error'} label={fmt(t.create.loadingLoaders, { loader })} />
          {table?.status === 'error' && <StatusMessage kind="error" headline={t.errors.loadFailed} detail={fmt(t.create.loadersError, { loader })} />}
        </div>

        {kind === 'modpack' ? (
          pack?.gameVersions && pack.gameVersions.length > 1 && (
            <div>
              <Label htmlFor="create-pack-version">{t.create.packVersion}</Label>
              <Select id="create-pack-version" value={packVersion} onChange={(e) => setPackVersion(e.target.value)}>
                {[...pack.gameVersions].reverse().map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
          )
        ) : (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="create-version">{t.create.version}</Label>
            {!server && (
              <button type="button" className="text-xs underline cursor-pointer bg-transparent border-0 p-0 mb-2 text-muted hover:text-text font-[inherit]" onClick={() => setShowAll(!showAll)}>
                {showAll ? t.create.fewerVersions : t.create.olderVersions}
              </button>
            )}
          </div>
          <AutoLoader subtle active={!versions && !versionsError} label={t.create.loadingVersions} />
          {versionsError && <StatusMessage kind="error" headline={t.errors.connectionLost} detail={t.create.versionsError} />}
          {versions && (
            <Select id="create-version" value={version} onChange={(e) => setVersion(e.target.value)} disabled={loadersLoading}>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}{v.id === versions.latestRelease ? ` (${t.create.latest})` : ''}{v.type !== 'release' ? ` — ${v.type}` : ''}
                </option>
              ))}
            </Select>
          )}
          {unsupported && <p className="m-0 mt-2 text-xs text-muted">{fmt(t.create.loaderUnsupported, { loader, version: '' })}</p>}
          {kind === 'mods' && loaderOption && <p className="m-0 mt-2 text-xs text-muted">{fmt(s.loaderHint, { loader, version: loaderOption.label })}</p>}
        </div>
        )}

        {server && (
          <p className="m-0 text-xs text-muted">
            {t.servers.create.publicNote} {t.servers.create.eulaNotice}{' '}
            <a href="https://aka.ms/MinecraftEULA" className="text-primary underline" onClick={(e) => { e.preventDefault(); openExternal('https://aka.ms/MinecraftEULA') }}>{t.servers.create.eulaLink}</a>.
          </p>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="flex gap-4 justify-end items-center flex-wrap">
          {server
            ? <Button variant="primary" type="submit" loading={busy} disabled={!canSubmit}>{s.submit}</Button>
            : <>
                <Button variant="idle" loading={busy} disabled={!canSubmit} onClick={() => submit(false)}>{s.submit}</Button>
                <Button variant="primary" type="submit" loading={busy} disabled={!canSubmit}>{t.create.createPlay}</Button>
              </>}
        </div>
      </form>
    </main>
  )
}

/** Search Modrinth modpacks (the most downloaded until the player types) and pick one. */
function PackPicker({ value, onPick }: { value: SearchResult | null; onPick: (r: SearchResult) => void }) {
  const { t } = useApp()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    const wait = setTimeout(() => {
      setFailed(false)
      api.SearchContent('modpack', q.trim(), '', '', q.trim() ? 'relevance' : 'downloads', [], 0, 6)
        .then((p) => { if (live) setResults(p.results) }).catch(() => { if (live) setFailed(true) })
    }, q ? 300 : 0) // typing waits a beat; the first, empty search does not
    return () => { live = false; clearTimeout(wait) }
  }, [q])
  return (
    <div className="flex flex-col gap-2">
      <Input type="search" value={q} placeholder={t.create.packSearch} aria-label={t.create.packSearch} onChange={(e) => setQ(e.target.value)} />
      <AutoLoader subtle active={results === null && !failed} label={t.common.loading} />
      {failed && <StatusMessage kind="error" headline={t.errors.connectionLost} />}
      {results?.length === 0 && <p className="m-0 text-xs text-muted">{t.create.packNone}</p>}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {results?.map((r) => (
          <button key={r.id} type="button" onClick={() => onPick(r)} aria-pressed={value?.id === r.id}
            className={`flex items-center gap-3 px-3 py-2 text-left rounded-md border-0 cursor-pointer transition-colors ${value?.id === r.id ? 'bg-primary text-on-primary' : 'bg-panel-2 text-text hover:bg-idle'}`}>
            <ProjectIcon url={r.iconUrl} size={32} />
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-sm font-bold truncate">{r.title}</span>
              <span className="text-xs opacity-75 truncate">{r.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
