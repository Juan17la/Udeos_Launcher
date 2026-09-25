import { useEffect, useState } from 'react'
import { Play, X } from '../ui/icons'
import Button from '../ui/Button'
import Dialog from '../ui/Dialog'
import StatusMessage from '../ui/StatusMessage'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { messageOf } from '../utils/errors'
import { fmt } from '../i18n/format'
import type { Server } from '../api/types'

/** Start / Stop for one server: a loading ring while it prepares its files
 *  and loads the world, and while it saves and stops. A failed start opens
 *  a dialog (the console keeps the full story). */
export default function ServerButton({ server, size = 'md', className = '' }: { server: Server; size?: 'md' | 'lg'; className?: string }) {
  const { t, refreshInstances } = useApp()
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { running, ready } = server.state
  useEffect(() => { if (!running) setStopping(false) }, [running])

  const start = async () => {
    try { await api.StartServer(server.id) } catch (e) { setError(messageOf(e)) }
    refreshInstances()
  }
  const stop = async () => { setStopping(true); try { await api.StopServer(server.id) } catch (e) { setStopping(false); setError(messageOf(e)) } }

  const busy = server.running && (!ready || stopping)
  return (
    <>
      {ready && !stopping
        ? <Button variant="idle" size={size} block className={className} onClick={stop}><X size={size === 'lg' ? 14 : 12} /> {t.servers.stop}</Button>
        : <Button variant="primary" size={size} block className={className} loading={busy} onClick={start}>
            <Play size={size === 'lg' ? 16 : 13} /> {stopping ? t.servers.stopping : busy ? t.servers.starting : t.servers.start}
          </Button>}
      {error && (
        <Dialog title={t.servers.startFailed} onClose={() => setError(null)} actions={<Button variant="primary" onClick={() => setError(null)}>{t.common.gotIt}</Button>}>
          <StatusMessage kind="error" headline={t.servers.startFailed} detail={error} />
        </Dialog>
      )}
    </>
  )
}

/** "● Online · 2/10 players", "● Starting…" or "● Stopped". */
export function ServerStatus({ server, className = '' }: { server: Server; className?: string }) {
  const { t } = useApp()
  const s = server.state
  const [dot, label] = s.ready ? ['bg-primary', `${t.servers.status.online} · ${fmt(t.servers.playersOf, { n: s.players.length, max: server.maxPlayers })}`]
    : server.running ? ['bg-gold animate-pulse', t.servers.status.starting] : ['bg-muted', t.servers.status.stopped]
  return <span className={`inline-flex items-center gap-2 text-xs ${className}`}><span className={`w-2.5 h-2.5 rounded-md ${dot}`} />{label}</span>
}
