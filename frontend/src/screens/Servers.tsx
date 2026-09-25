import InstanceIcon from '../components/InstanceIcon'
import ServerButton, { ServerStatus, shareAddress } from '../components/ServerButton'
import { InstanceTags } from '../components/Tags'
import Button from '../ui/Button'
import { Plus } from '../ui/icons'
import { useApp } from '../state'
import type { Server } from '../api/types'

/** The Servers page: every server of the active profile as a card with its
 *  status, Start/Stop and Manage. */
export default function Servers() {
  const { t, servers, go } = useApp()
  const create = () => go({ name: 'create', server: true })
  return (
    <main className="flex-1 flex flex-col gap-6 pt-8 px-10 pb-12">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h2 className="mb-2">{t.servers.title}</h2>
          <p className="m-0 text-muted">{t.servers.subtitle}</p>
        </div>
        <Button variant="primary" onClick={create}><Plus size={16} /> {t.servers.new}</Button>
      </div>
      {servers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 text-muted text-center px-5 pt-12 pb-10">
          <p className="m-0">{t.servers.empty}</p>
          <Button variant="primary" onClick={create}>{t.servers.createFirst}</Button>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {servers.map((s) => <ServerCard key={s.id} server={s} />)}
        </div>
      )}
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
      <div className="flex items-center justify-between gap-4 text-xs text-muted">
        <ServerStatus server={server} />
        {address && <span className="truncate" title={t.servers.address}>{address}</span>}
      </div>
      <div className="flex gap-4 mt-auto" onClick={(e) => e.stopPropagation()}>
        <ServerButton server={server} className="flex-1" />
        <Button variant="idle" className="flex-1" onClick={open}>{t.servers.manage}</Button>
      </div>
    </div>
  )
}
