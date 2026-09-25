import { useEffect, useState } from 'react'
import InstanceIcon from '../../components/InstanceIcon'
import { Folder, Pencil, X } from '../../ui/icons'
import Button from '../../ui/Button'
import { ConfirmDialog } from '../../ui/Dialog'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp } from '../../state'
import { InstanceTags } from '../../components/Tags'
import { ago, hours } from '../../utils/format'
import PlayButton from '../../components/PlayButton'
import BackButton from '../../components/BackButton'
import SidePanel from '../../components/SidePanel'
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
  const { t, language, instances, refreshInstances, go } = useApp()
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

  // Numbers worth a glance, in a 2×2 grid; Vanilla has no mods, so screenshots take that cell.
  const stats: [string, string | number][] = [
    vanilla ? [t.instance.tabs.screenshots, inst.counts.screenshots] : [t.instance.tabs.mods, inst.counts.mods],
    [t.instance.tabs.resourcepacks, inst.counts.resourcePacks],
    [t.instance.tabs.worlds, inst.counts.worlds],
    [t.instance.playTime, `${hours(inst.playTimeSec)} h`],
  ]

  return (
    <main className="flex-1 grid grid-cols-[minmax(300px,340px)_minmax(0,1fr)] items-start gap-x-8 gap-y-4 pt-8 px-10 pb-12">
      <BackButton className="col-span-2" />
      {/* Identity on top, numbers under it, actions at the bottom (Play
         biggest, the irreversible Delete last and quietest). */}
      <SidePanel actions={<>
        <PlayButton inst={inst} size="lg" />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="idle" onClick={() => setEditing(true)}><Pencil /> {t.instance.editShort}</Button>
          <Button variant="idle" onClick={() => api.OpenInstanceFolder(inst.id, '')}><Folder /> {t.instance.folder}</Button>
        </div>
        <Button variant="danger" size="sm" disabled={inst.running} onClick={() => setConfirmDelete(true)}>
          <X size={12} /> {t.instance.deleteInstance}
        </Button>
      </>}>
        <div className="flex flex-col items-center gap-2 text-center w-full min-w-0">
          <InstanceIcon inst={inst} size={64} />
          {/* w-full: a shrink-to-fit column has no width for the name's truncation to resolve against. */}
          <h3 className="m-0 w-full truncate" title={inst.name}>{inst.name}</h3>
          <InstanceTags inst={inst} className="justify-center" />
          <span className={`text-xs ${inst.installed ? 'text-muted' : 'text-text'}`}>{inst.installed ? t.instance.installed : t.instance.notInstalled}</span>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col px-4 py-2 rounded-md bg-panel-2 shadow-neu min-w-0">
              <dt className="text-[11px] text-muted truncate">{label}</dt>
              <dd className="m-0 text-base font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 text-xs text-muted text-center">
          {inst.lastPlayed ? `${t.dashboard.lastPlayed}: ${ago(inst.lastPlayed, language)}` : t.dashboard.neverPlayed}
        </p>
      </SidePanel>

      <div className="min-w-0 flex flex-col gap-6">
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.instance.tabs[k] }))} value={tab} onChange={setTab} />
        {/* Keyed by tab, so switching tabs replays a short fade (no movement). */}
        <div key={tab} className="animate-[fade-in_0.15s_ease-out]">
          {tab === 'worlds' && <WorldsTab id={inst.id} />}
          {tab === 'screenshots' && <ScreenshotsTab id={inst.id} />}
          {tab === 'settings' && <SettingsTab key={inst.id} inst={inst} />}
          {(tab === 'mods' || tab === 'shaders' || tab === 'resourcepacks') && <FilesTab id={inst.id} kind={tab} />}
        </div>
      </div>

      {editing && <EditInstanceDialog inst={inst} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteTitle} body={t.instance.confirmDelete} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setConfirmDelete(false)} />
      )}
    </main>
  )
}
