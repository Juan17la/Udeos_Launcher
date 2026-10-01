import { useEffect, useState } from 'react'
import InstanceIcon from '../../components/InstanceIcon'
import ServerButton, { ServerStatus, shareAddress } from '../../components/ServerButton'
import { InstanceTags } from '../../components/Tags'
import SidePanel, { ScrollBody, SPLIT_MAIN, SplitColumn } from '../../components/SidePanel'
import EditInstanceDialog from '../../components/EditInstanceDialog'
import { Folder, Pencil } from '../../ui/icons'
import Button from '../../ui/Button'
import { ConfirmDialog } from '../../ui/Dialog'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { hours } from '../../utils/format'
import { fmt } from '../../i18n/format'
import { messageOf } from '../../utils/errors'
import FilesTab from '../instance/FilesTab'
import DatapacksTab from '../instance/DatapacksTab'
import ConsoleTab from './ConsoleTab'
import PlayersTab from './PlayersTab'
import InternetTab from './InternetTab'
import CopyAddress from '../../components/CopyAddress'
import JoinFile from './JoinFile'
import BackupsTab from './BackupsTab'
import ServerSettingsTab from './ServerSettingsTab'

type Tab = 'console' | 'players' | 'internet' | 'backups' | 'mods' | 'datapacks' | 'settings'

/** Last tab open per server, so coming back reopens it. */
const lastTab = new Map<string, Tab>()

/** One server, laid out like an instance: identity, numbers and Start/Stop
 *  in the side panel, everything to manage in tabs. */
export default function ServerPage({ id }: { id: string }) {
  const { t, servers, refreshInstances, go } = useApp()
  const server = servers.find((s) => s.id === id)
  const tabs: Tab[] = !server || server.loader === 'Vanilla' ? ['console', 'players', 'internet', 'backups', 'datapacks', 'settings'] : ['console', 'players', 'internet', 'backups', 'mods', 'datapacks', 'settings']
  const [tab, setTabState] = useState<Tab>(() => lastTab.get(id) ?? (server?.running ? 'console' : 'players')) // the console is a wall of text: only while it is running
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
    [t.servers.runTime, `${hours(server.playTimeSec)} h`],
  ]
  const address = shareAddress(server)
  // Never finished a run and still coming up: the first start downloads the server and builds the world.
  const firstStart = server.running && !server.state.ready && !server.state.stopping && !server.lastPlayed

  return (
    <main className={SPLIT_MAIN}>
      <SidePanel actions={<>
        <ServerButton server={server} size="lg" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="idle" size="sm" className="px-2!" onClick={() => setEditing(true)}><Pencil /> {t.instance.editShort}</Button>
          <Button variant="idle" size="sm" className="px-2!" onClick={() => api.OpenInstanceFolder(server.id, '')}><Folder /> {t.instance.folder}</Button>
        </div>
      </>}>
        <div className="flex flex-col items-center gap-2 text-center w-full min-w-0">
          {/* Decorative: the first thing to give way when the window is very short, so the panel never needs a scrollbar. */}
          <div className="[@media(max-height:570px)]:hidden"><InstanceIcon inst={server} size={56} /></div>
          <h3 className="m-0 w-full truncate text-[22px]" title={server.name}>{server.name}</h3>
          <InstanceTags inst={server} className="justify-center" />
          <ServerStatus server={server} />
        </div>

        <dl className="m-0 grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col px-2.5 py-1 rounded-md bg-panel-2 shadow-neu min-w-0">
              <dt className="text-[11px] text-muted truncate">{label}</dt>
              <dd className="m-0 text-base font-bold tabular-nums truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </SidePanel>

      <SplitColumn>
        {/* The address friends type, big and first, and the tab bar: both stay put; players should never have to hunt for either. */}
        {address && <CopyAddress big label={t.servers.addressKinds[address.kind]} address={address.address} />}
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.servers.tabs[k] }))} value={tabs.includes(tab) ? tab : 'console'} onChange={setTab} />
        <ScrollBody>
          <div className="flex-1 flex flex-col gap-4">
            {server.public && address?.kind !== 'internet' && <p className="m-0 text-xs text-muted">{t.servers.addressPending}</p>}
            <JoinFile server={server} />
            {firstStart && <p className="m-0 px-4 py-3 rounded-md bg-gold-soft text-ink text-sm" role="status"><b>{fmt(t.servers.firstStart, { name: server.name })}.</b> {t.servers.firstStartBody}</p>}
            <div key={tab} className="flex-1 flex flex-col animate-[fade-in_0.15s_ease-out]">
              {tab === 'console' && <ConsoleTab server={server} />}
              {tab === 'players' && <PlayersTab server={server} />}
              {tab === 'internet' && <InternetTab server={server} />}
              {tab === 'backups' && <BackupsTab server={server} />}
              {tab === 'mods' && <FilesTab id={server.id} kind="mods" />}
              {tab === 'datapacks' && <DatapacksTab id={server.id} server />}
              {tab === 'settings' && <ServerSettingsTab key={server.id} server={server} />}
            </div>
          </div>
        </ScrollBody>
      </SplitColumn>

      {editing && <EditInstanceDialog inst={server} onClose={() => setEditing(false)} onDelete={() => { setEditing(false); setConfirmDelete(true) }} />}
      {confirmDelete && (
        <ConfirmDialog danger busy={deleting} title={t.servers.confirmDeleteTitle} confirmLabel={t.common.delete}
          body={deleteError ?? (server.running ? `${t.servers.confirmDelete} ${t.servers.confirmDeleteRunning}` : t.servers.confirmDelete)}
          onConfirm={remove} onClose={() => { setConfirmDelete(false); setDeleteError(null) }} />
      )}
    </main>
  )
}
