import { useEffect, useState } from 'react'
import InstanceIcon from '../../components/InstanceIcon'
import { Folder, Pencil } from '../../ui/icons'
import Button from '../../ui/Button'
import { ConfirmDialog } from '../../ui/Dialog'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp } from '../../state'
import { InstanceTags } from '../../components/Tags'
import { ago, hours } from '../../utils/format'
import PlayButton from '../../components/PlayButton'
import SidePanel, { ScrollBody, SPLIT_MAIN, SplitColumn } from '../../components/SidePanel'
import EditInstanceDialog from '../../components/EditInstanceDialog'
import { api } from '../../api/bridge'
import FilesTab from './FilesTab'
import WorldsTab from './WorldsTab'
import DatapacksTab from './DatapacksTab'
import ScreenshotsTab from './ScreenshotsTab'
import SettingsTab from './SettingsTab'

type Tab = 'mods' | 'datapacks' | 'resourcepacks' | 'shaders' | 'worlds' | 'screenshots' | 'settings'

/** Last tab open per instance, so coming back (from Addons, say) reopens it. */
const lastTab = new Map<string, Tab>()

export default function InstancePage({ id }: { id: string }) {
  const { t, language, instances, refreshInstances, go } = useApp()
  const inst = instances.find((i) => i.id === id)
  const vanilla = !inst || inst.loader === 'Vanilla'
  const tabs: Tab[] = vanilla ? ['datapacks', 'resourcepacks', 'worlds', 'screenshots', 'settings'] : ['mods', 'datapacks', 'resourcepacks', 'shaders', 'worlds', 'screenshots', 'settings']
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
    <main className={SPLIT_MAIN}>
      {/* Identity on top, numbers under it, actions at the bottom (Play biggest; Delete is in Edit). */}
      <SidePanel actions={<>
        <PlayButton inst={inst} size="lg" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="idle" size="sm" className="px-2!" onClick={() => setEditing(true)}><Pencil /> {t.instance.editShort}</Button>
          <Button variant="idle" size="sm" className="px-2!" onClick={() => api.OpenInstanceFolder(inst.id, '')}><Folder /> {t.instance.folder}</Button>
        </div>
      </>}>
        <div className="flex flex-col items-center gap-2 text-center w-full min-w-0">
          {/* Decorative: the first thing to give way when the window is very short, so the panel never needs a scrollbar. */}
          <div className="[@media(max-height:570px)]:hidden"><InstanceIcon inst={inst} size={56} /></div>
          {/* w-full: a shrink-to-fit column has no width for the name's truncation to resolve against. */}
          <h3 className="m-0 w-full truncate text-[22px]" title={inst.name}>{inst.name}</h3>
          <InstanceTags inst={inst} className="justify-center" />
          <span className={`text-xs ${inst.installed ? 'text-muted' : 'text-text'}`}>{inst.installed ? t.instance.installed : t.instance.notInstalled}</span>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col px-2.5 py-1 rounded-md bg-panel-2 shadow-neu min-w-0">
              <dt className="text-[11px] text-muted truncate">{label}</dt>
              <dd className="m-0 text-base font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 text-xs text-muted text-center">
          {inst.lastPlayed ? `${t.dashboard.lastPlayed}: ${ago(inst.lastPlayed, language)}` : t.dashboard.neverPlayed}
        </p>
      </SidePanel>

      <SplitColumn>
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.instance.tabs[k] }))} value={tab} onChange={setTab} />
        {/* Keyed by tab, so switching tabs replays a short fade (no movement). */}
        <ScrollBody>
          <div key={tab} className="flex-1 flex flex-col animate-[fade-in_0.15s_ease-out]">
            {tab === 'worlds' && <WorldsTab id={inst.id} />}
            {tab === 'datapacks' && <DatapacksTab id={inst.id} />}
            {tab === 'screenshots' && <ScreenshotsTab id={inst.id} />}
            {tab === 'settings' && <SettingsTab key={inst.id} inst={inst} />}
            {(tab === 'mods' || tab === 'shaders' || tab === 'resourcepacks') && <FilesTab id={inst.id} kind={tab} />}
          </div>
        </ScrollBody>
      </SplitColumn>

      {editing && <EditInstanceDialog inst={inst} onClose={() => setEditing(false)} onDelete={() => { setEditing(false); setConfirmDelete(true) }} />}
      {confirmDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteTitle} body={t.instance.confirmDelete} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setConfirmDelete(false)} />
      )}
    </main>
  )
}
