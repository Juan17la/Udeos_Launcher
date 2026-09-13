import { useEffect, useMemo, useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { ICON_CHOICES } from '../ui/pixels'
import { Check } from '../ui/icons'
import { useApp } from '../state'
import { api } from '../api/bridge'
import type { VersionList } from '../api/types'

const LOADERS = ['Vanilla', 'Forge', 'Fabric'] as const

export default function CreateInstance() {
  const { t, go, refreshInstances } = useApp()
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [icon, setIcon] = useState('grass')
  const [showAll, setShowAll] = useState(false)
  const [versions, setVersions] = useState<VersionList | null>(null)
  const [versionsError, setVersionsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.ListVersions().then(setVersions).catch(() => setVersionsError(true))
  }, [])

  const options = useMemo(() => {
    if (!versions) return []
    return versions.versions.filter((v) => showAll || v.type === 'release')
  }, [versions, showAll])

  const canSubmit = name.trim().length > 0 && version !== '' && !busy
  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const inst = await api.CreateInstance(name.trim(), version, icon)
      await refreshInstances()
      go({ name: 'instance', id: inst.id })
    } catch (e) {
      setError(String((e as Error)?.message ?? e)); setBusy(false)
    }
  }

  return (
    <main className="page" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="card elev-sm sheen static" style={{ width: 'min(520px, 100%)', padding: 30, gap: 18, alignSelf: 'flex-start' }}>
        <h2 style={{ marginBottom: 2, fontSize: 32 }}>{t.create.title}</h2>
        <p className="text-muted" style={{ margin: '0 0 6px', fontSize: 14 }}>{t.create.subtitle}</p>

        <div className="field">
          <label htmlFor="create-name">{t.create.name}</label>
          <input id="create-name" className="input" type="text" placeholder={t.create.namePlaceholder} value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="create-version">{t.create.version}</label>
          <select id="create-version" className="input" value={version} onChange={(e) => setVersion(e.target.value)} disabled={!versions}>
            <option value="">{versions ? t.create.chooseVersion : versionsError ? t.create.versionsError : t.create.loadingVersions}</option>
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}{v.id === versions?.latestRelease ? ` (${t.create.latest})` : ''}{v.type !== 'release' ? ` — ${v.type}` : ''}
              </option>
            ))}
          </select>
          <label className="checkbox" style={{ marginTop: 8, fontSize: 12 }}>
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            <span className="box"><Check size={10} /></span>
            {t.create.showSnapshots}
          </label>
        </div>

        <div className="field">
          <label id="create-loader-label">{t.create.loader}</label>
          <div className="seg" role="radiogroup" aria-labelledby="create-loader-label">
            {LOADERS.map((l) => (
              <button key={l} type="button" role="radio" className="seg-opt" aria-checked={l === 'Vanilla'} disabled={l !== 'Vanilla'} title={l !== 'Vanilla' ? t.nav.comingSoon : undefined}>{l}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t.create.icon}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 8 }}>
            {ICON_CHOICES.map(([key, label]) => {
              const active = icon === key
              return (
                <button key={key} type="button" title={label} onClick={() => setIcon(key)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, cursor: 'pointer',
                  background: active ? 'var(--choice-bg)' : 'var(--color-bg)', color: active ? 'var(--choice-text)' : 'var(--color-text)',
                  border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, borderRadius: 'var(--radius-md)',
                }}>
                  <PixelIcon name={key} size={32} />
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{error ?? t.create.required}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'dashboard' })}>{t.common.cancel}</button>
          <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submit}>{t.create.submit}</button>
        </div>
      </div>
    </main>
  )
}
