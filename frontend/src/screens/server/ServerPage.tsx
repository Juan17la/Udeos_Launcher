import { useEffect, useState } from 'react'
import InstanceIcon from '../../components/InstanceIcon'
import ServerButton, { ServerStatus, shareAddress } from '../../components/ServerButton'
import { InstanceTags } from '../../components/Tags'
import BackButton from '../../components/BackButton'
import EditInstanceDialog from '../../components/EditInstanceDialog'
import { Folder, Pencil, X } from '../../ui/icons'
import Button from '../../ui/Button'
import { ConfirmDialog } from '../../ui/Dialog'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { hours } from '../../utils/format'
import { messageOf } from '../../utils/errors'
import FilesTab from '../instance/FilesTab'
import SettingsTab from '../instance/SettingsTab'
import ConsoleTab from './ConsoleTab'
import PlayersTab from './PlayersTab'
import InternetTab, { CopyAddress } from './InternetTab'
import BackupsTab from './BackupsTab'
import ServerSettingsTab from './ServerSettingsTab'

type Tab = 'console' | 'players' | 'internet' | 'backups' | 'mods' | 'settings'

/** Last tab open per server, so coming back reopens it. */
const lastTab = new Map<string, Tab>()

/** One server, laid out like an instance: identity, numbers and Start/Stop
 *  in the side panel, everything to manage in tabs. */
export default function ServerPage({ id }: { id: string }) {
  const { t, servers, profile, refreshInstances, go } = useApp()
  const server = servers.find((s) => s.id === id)
  const tabs: Tab[] = !server || server.loader === 'Vanilla' ? ['console', 'players', 'internet', 'backups', 'settings'] : ['console', 'players', 'internet', 'backups', 'mods', 'settings']
  const [tab, setTabState] = useState<Tab>(() => lastTab.get(id) ?? 'console')
  const setTab = (k: Tab) => { lastTab.set(id, k); setTabState(k) }
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => { if (!server) go({ name: 'servers' }) }, [server, go])
  if (!server) return null

  // A running server is saved and stopped first (the backend waits for it).
  const remove = async () => {
    setDeleting(true); setDeleteError(null)
    try {
      await api.DeleteInstance(server.id)
      await refreshInstances()
      go({ name: 'servers' })
    } catch (e) { setDeleteError(messageOf(e)); setDeleting(false) }
  }

  const stats: [string, string | number][] = [
    [t.servers.playersStat, `${server.state.players.length}/${server.maxPlayers}`],
    [t.servers.port, server.port],
    [t.servers.memory, `${server.launch.maxMemoryMB || profile?.maxMemoryMB || 2048} MB`],
    [t.servers.runTime, `${hours(server.playTimeSec)} h`],
  ]
  const address = shareAddress(server)

  return (
    <main className="flex-1 grid grid-cols-[minmax(300px,340px)_minmax(0,1fr)] items-start gap-x-8 gap-y-4 pt-8 px-10 pb-12">
      <div className="col-span-2"><BackButton /></div>
      <div className="panel flex flex-col gap-4 sticky top-24 p-6 h-[calc(100vh-9.5rem)] overflow-y-auto">
        <div className="flex flex-col items-center gap-3 text-center w-full min-w-0">
          <InstanceIcon inst={server} size={80} />
          <h3 className="m-0 w-full truncate" title={server.name}>{server.name}</h3>
          <InstanceTags inst={server} className="justify-center" />
          <ServerStatus server={server} />
        </div>

        <dl className="m-0 grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col px-4 py-2 rounded-md bg-panel-2 shadow-neu min-w-0">
              <dt className="text-[11px] text-muted truncate">{label}</dt>
              <dd className="m-0 text-base font-bold tabular-nums truncate">{value}</dd>
            </div>
          ))}
        </dl>
        {address && <CopyAddress label={t.servers.address} address={address} />}

        <div className="flex-1 min-h-2" />

        <div className="flex flex-col gap-3">
          <ServerButton server={server} size="lg" />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="idle" onClick={() => setEditing(true)}><Pencil /> {t.instance.editShort}</Button>
            <Button variant="idle" onClick={() => api.OpenInstanceFolder(server.id, '')}><Folder /> {t.instance.folder}</Button>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <X size={12} /> {t.servers.deleteServer}
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex flex-col gap-6">
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.servers.tabs[k] }))} value={tabs.includes(tab) ? tab : 'console'} onChange={setTab} />
        <div key={tab} className="animate-[fade-in_0.15s_ease-out]">
          {tab === 'console' && <ConsoleTab server={server} />}
          {tab === 'players' && <PlayersTab server={server} />}
          {tab === 'internet' && <InternetTab server={server} />}
          {tab === 'backups' && <BackupsTab server={server} />}
          {tab === 'mods' && <FilesTab id={server.id} kind="mods" />}
          {tab === 'settings' && (
            <div className="flex flex-col gap-8">
              <ServerSettingsTab key={server.id} server={server} />
              <SettingsTab key={`launch-${server.id}`} inst={server} />
            </div>
          )}
        </div>
      </div>

      {editing && <EditInstanceDialog inst={server} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <ConfirmDialog danger busy={deleting} title={t.servers.confirmDeleteTitle} confirmLabel={t.common.delete}
          body={deleteError ?? (server.running ? `${t.servers.confirmDelete} ${t.servers.confirmDeleteRunning}` : t.servers.confirmDelete)}
          onConfirm={remove} onClose={() => { setConfirmDelete(false); setDeleteError(null) }} />
      )}
    </main>
  )
}
