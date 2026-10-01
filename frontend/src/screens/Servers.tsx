import InstanceIcon from '../components/InstanceIcon'
import ServerButton, { ServerStatus, shareAddress } from '../components/ServerButton'
import { InstanceTags } from '../components/Tags'
import Button from '../ui/Button'
import NewTile from '../components/NewTile'
import CopyAddress from '../components/CopyAddress'
import { ScrollBody } from '../components/SidePanel'
import { useApp } from '../state'
import type { Server } from '../api/types'

/** The Servers page: every server of the active profile as a card with its
 *  status, Start/Stop and Manage. */
export default function Servers() {
  const { t, servers, go } = useApp()
  const create = () => go({ name: 'create', server: true })
  return (
    <main className="flex-1 min-h-0 flex flex-col gap-4 pt-4 px-[clamp(16px,3vw,40px)] pb-6 overflow-y-hidden!">
      <h2 className="m-0">{t.servers.title}</h2>
      {/* The title stays; only the cards scroll. */}
      <ScrollBody>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          <NewTile label={t.servers.new} onClick={create} />
          {servers.map((s) => <ServerCard key={s.id} server={s} />)}
        </div>
      </ScrollBody>
    </main>
  )
}

/** One server: icon, name, version/loader, status and the address to share.
 *  The whole card opens the server, like Manage. */
function ServerCard({ server }: { server: Server }) {
  const { t, go } = useApp()
  const open = () => go({ name: 'server', id: server.id })
  const address = shareAddress(server)
  return (
    <div role="link" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open() }}
      className="panel panel-hover flex flex-col gap-4 p-5 cursor-pointer">
      <div className="flex items-center gap-4">
        <InstanceIcon inst={server} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="font-bold text-lg leading-[1.2] truncate">{server.name}</div>
          <InstanceTags inst={server} />
        </div>
      </div>
      <ServerStatus server={server} className="text-muted" />
      {address ? <CopyAddress compact label={t.servers.addressKinds[address.kind]} address={address.address} /> : <div className="h-9" />}
      <div className="flex gap-4 mt-auto" onClick={(e) => e.stopPropagation()}>
        <ServerButton server={server} className="flex-1" />
        <Button variant="idle" className="flex-1" onClick={open}>{t.servers.manage}</Button>
      </div>
    </div>
  )
}
