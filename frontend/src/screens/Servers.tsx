import PixelIcon from '../ui/PixelIcon'
import CardLink from '../ui/CardLink'
import InstanceIcon from '../components/InstanceIcon'
import ServerButton, { ServerProgress, ServerStatus, shareAddress } from '../components/ServerButton'
import { InstanceTags } from '../components/Tags'
import NewTile from '../components/NewTile'
import CopyAddress from '../components/CopyAddress'
import { useApp } from '../state'
import type { Server } from '../api/types'

/** The Servers page: every server of the active profile as a card with its
 *  status, Start/Stop and Manage. */
export default function Servers() {
  const { t, servers, go } = useApp()
  const create = () => go({ name: 'create', server: true })
  return (
    <main className="flex flex-col gap-4 pt-8 px-8 pb-10">
      <h2 className="m-0 flex items-center gap-3"><PixelIcon name="end_crystal" size={26} />{t.servers.title}</h2>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        <NewTile label={t.servers.new} onClick={create} />
        {servers.map((s) => <ServerCard key={s.id} server={s} />)}
      </div>
    </main>
  )
}

/** One server: icon, name, version/loader, status, the address to share and a quiet
 *  Start. The whole card opens the server (CardLink). */
function ServerCard({ server }: { server: Server }) {
  const { t, go } = useApp()
  const open = () => go({ name: 'server', id: server.id })
  const address = shareAddress(server)
  return (
    <div className="panel panel-hover relative flex flex-col gap-4 p-5">
      <CardLink label={`${server.name}, ${server.version} ${server.loaderLabel}`} title={t.servers.manage} onClick={open} />
      <div className="relative flex items-center gap-4 pointer-events-none">
        <InstanceIcon inst={server} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="font-bold text-base leading-[1.2] truncate">{server.name}</div>
          <InstanceTags inst={server} short />
        </div>
      </div>
      <div className="relative flex flex-col gap-4 pointer-events-none">
        <ServerStatus server={server} className="text-muted" />
        <ServerProgress server={server} />
      </div>
      <div className="relative pointer-events-none [&_button]:pointer-events-auto">{address ? <CopyAddress compact label={t.servers.addressKinds[address.kind]} address={address.address} /> : <div className="h-9 pointer-events-none" />}</div>
      <div className="relative flex mt-auto">
        <ServerButton server={server} quiet />
      </div>
    </div>
  )
}
