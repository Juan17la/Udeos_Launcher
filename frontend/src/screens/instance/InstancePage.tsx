import { useEffect, useState } from 'react'
import InstanceIcon from '../../components/InstanceIcon'
import { Folder, Pencil } from '../../ui/icons'
import Button from '../../ui/Button'
import { ConfirmDialog } from '../../ui/Dialog'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp } from '../../state'
import PlayButton from '../../components/PlayButton'
import BackButton from '../../components/BackButton'
import EditInstanceDialog from '../../components/EditInstanceDialog'
import { api } from '../../api/bridge'
import FilesTab from './FilesTab'
import WorldsTab from './WorldsTab'
import ScreenshotsTab from './ScreenshotsTab'
import SettingsTab from './SettingsTab'

type Tab = 'mods' | 'resourcepacks' | 'shaders' | 'worlds' | 'screenshots' | 'settings'

/** Last tab open per instance, so coming back (from Addons, say) reopens it. */
const lastTab = new Map<string, Tab>()

export default function InstancePage({ id }: { id: string }) {
  const { t, instances, refreshInstances, go } = useApp()
  const inst = instances.find((i) => i.id === id)
  const vanilla = !inst || inst.loader === 'Vanilla'
  const tabs: Tab[] = vanilla ? ['resourcepacks', 'worlds', 'screenshots', 'settings'] : ['mods', 'resourcepacks', 'shaders', 'worlds', 'screenshots', 'settings']
  const [tab, setTabState] = useState<Tab>(() => { const last = lastTab.get(id); return last && tabs.includes(last) ? last : tabs[0] })
  const setTab = (k: Tab) => { lastTab.set(id, k); setTabState(k) }
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => { if (!inst) go({ name: 'dashboard' }) }, [inst, go])
  if (!inst) return null

  const remove = async () => {
    await api.DeleteInstance(inst.id)
    await refreshInstances()
    go({ name: 'dashboard' })
  }

  return (
    <main className="flex-1 grid items-start gap-x-8 gap-y-4 pt-8 px-10 pb-12" style={{ gridTemplateColumns: 'minmax(0,0.4fr) minmax(0,0.6fr)' }}>
      <div className="col-span-2"><BackButton /></div>
      {/* The side panel is the viewport's height, not the list's: a long
         mods list scrolls past it while it stays put. */}
      <div className="panel flex flex-col items-center justify-between gap-4 text-center sticky top-24 p-6 h-[calc(100vh-9.5rem)] min-h-fit">
        {/* w-full on both wrappers: a shrink-to-fit column has no width for the name's max-width to resolve against. */}
        <div className="flex flex-col items-center justify-center gap-4 flex-1 w-full min-w-0">
          <InstanceIcon inst={inst} size={96} />
          <div className="w-full min-w-0 flex flex-col gap-3">
            <h1 className="m-0 truncate" title={inst.name}>{inst.name}</h1>
            <div className="flex gap-2 justify-center">
              <span className="tag bg-green-soft">{inst.version}</span>
              <span className="tag bg-gold-soft">{inst.loaderLabel}</span>
            </div>
          </div>
          <h6 className="m-0 text-xs text-muted">{inst.installed ? t.instance.installed : t.instance.notInstalled}</h6>
        </div>

        <div className="flex flex-col w-full gap-4 min-h-0">
          <PlayButton inst={inst} />
          <Button variant="idle" block onClick={() => setEditing(true)}><Pencil /> {t.instance.edit}</Button>
          <Button variant="idle" block onClick={() => api.OpenInstanceFolder(inst.id, '')}>
            <Folder /> {t.instance.openFolder}
          </Button>

          <Button variant="danger" block disabled={inst.running} onClick={() => setConfirmDelete(true)}>{t.instance.deleteInstance}</Button>
        </div>
      </div>

      <div className="min-w-0 flex flex-col gap-6">
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.instance.tabs[k] }))} value={tab} onChange={setTab} />
        {tab === 'worlds' && <WorldsTab id={inst.id} />}
        {tab === 'screenshots' && <ScreenshotsTab id={inst.id} />}
        {tab === 'settings' && <SettingsTab key={inst.id} inst={inst} />}
        {(tab === 'mods' || tab === 'shaders' || tab === 'resourcepacks') && <FilesTab id={inst.id} kind={tab} />}
      </div>

      {editing && <EditInstanceDialog inst={inst} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteTitle} body={t.instance.confirmDelete} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setConfirmDelete(false)} />
      )}
    </main>
  )
}
