import PixelIcon from '../components/atoms/PixelIcon'
import CardLink from '../components/atoms/CardLink'
import InstanceIcon from '../components/atoms/InstanceIcon'
import ServerButton, { ServerProgress, ServerStatus, shareAddress } from '../components/organisms/ServerButton'
import { InstanceTags } from '../components/molecules/Tags'
import NewTile from '../components/molecules/NewTile'
import CopyAddress from '../components/molecules/CopyAddress'
import { useApp } from '../state'
import type { Server } from '../api/types'

/** The Servers page: every server of the active profile as a card with its
 *  status, Start/Stop and Manage. */
export default function Servers() {
  const { t, servers, go } = useApp()
  const create = () => go({ name: 'create', server: true })
  return (
    <main className="flex flex-col gap-4 pt-8 px-8 pb-10">
      <h2 className="m-0 flex items-center gap-3"><PixelIcon name="end_crystal" size={32} />{t.servers.title}</h2>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}>
        <NewTile label={t.servers.new} icon="end_crystal" onClick={create} />
        {servers.map((s) => <ServerCard key={s.id} server={s} />)}
      </div>
    </main>
  )
}

/** One server: who it is, whether it is up, the full address friends type and one Start.
 *  The whole card opens the server (CardLink); everything else to set up lives there.
 *  A server that is up, coming up or shutting down stands on the feature tone (tokens.css
 *  panel-feature), like the instance played last, so the live ones are found at a glance. */
function ServerCard({ server }: { server: Server }) {
  const { t, go } = useApp()
  const open = () => go({ name: 'server', id: server.id })
  const address = shareAddress(server)
  const active = server.running || server.state.stopping
  const on = active ? 'on-feature' : ''
  return (
    <div className={`${active ? 'panel-feature' : 'panel panel-hover'} relative flex flex-col gap-4 p-5`}>
      <CardLink label={`${server.name}, ${server.version} ${server.loaderLabel}`} title={t.servers.manage} onClick={open} />
      <div className={`relative flex items-center gap-4 pointer-events-none ${on}`}>
        <InstanceIcon inst={server} size={48} />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="font-bold text-base leading-[1.2] truncate">{server.name}</div>
          <InstanceTags inst={server} short />
        </div>
      </div>
      <ServerStatus server={server} className={`relative pointer-events-none ${active ? on : 'text-muted'}`} />
      {/* The address is the one thing a casual host needs: in full, never cut, with Copy and where friends paste it. */}
      <div className={`relative flex flex-col gap-2 px-4 py-3 rounded-md bg-panel-2 [&_button]:pointer-events-auto ${on}`}>
        {address
          ? <CopyAddress compact label={t.servers.addressKinds[address.kind]} address={address.address} />
          : <span className="text-sm text-muted">{t.servers.addressPending}</span>}
        <span className="text-xs text-muted">{t.servers.cardHint}</span>
      </div>
      <ServerProgress server={server} className={`relative pointer-events-none ${on}`} />
      <div className="relative flex mt-auto">
        <ServerButton server={server} />
      </div>
    </div>
  )
}
