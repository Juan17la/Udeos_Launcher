import { useState } from 'react'
import { Play, X } from '../ui/icons'
import Button from '../ui/Button'
import Dialog, { ConfirmDialog } from '../ui/Dialog'
import ErrorMessage from './ErrorMessage'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { isCanceled, messageOf } from '../utils/errors'
import { fmt } from '../i18n/format'
import type { Server } from '../api/types'

/** The address to share: the internet one for a public server (live, or
 *  saved from the last time it was open, so it shows while stopped), else
 *  the local one. `kind` says which, so the UI can label it. */
export const shareAddress = (s: Server): { kind: 'internet' | 'lan'; address: string } | null => {
  const net = s.public && (s.state.publicAddress || s.internet?.address)
  if (net) return { kind: 'internet', address: net }
  return s.lanAddress ? { kind: 'lan', address: s.lanAddress } : null
}

/** Start / Stop for one server. While it prepares its files or loads the
 *  world the button reads Cancel (Stop works at any point); while it saves
 *  and stops it is a loading ring. Starting a third server at once asks
 *  first. A failed start opens a dialog (the console keeps the full story);
 *  a cancelled one does not. */
export default function ServerButton({ server, size = 'md', className = '' }: { server: Server; size?: 'md' | 'lg'; className?: string }) {
  const { t, servers, refreshInstances } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [others, setOthers] = useState(0)
  const { ready, stopping } = server.state

  const start = async () => {
    setOthers(0)
    try { await api.StartServer(server.id) } catch (e) { const m = messageOf(e); if (!isCanceled(m)) setError(m) }
    refreshInstances()
  }
  const askStart = () => {
    const n = servers.filter((s) => s.id !== server.id && s.running).length
    if (n >= 2) setOthers(n)
    else start()
  }
  const stop = async () => { try { await api.StopServer(server.id) } catch (e) { setError(messageOf(e)) } }

  const x = size === 'lg' ? 14 : 12
  return (
    <>
      {server.running && !stopping
        ? <Button variant="idle" size={size} block className={className} onClick={stop}><X size={x} /> {ready ? t.servers.stop : t.servers.cancelStart}</Button>
        : <Button variant="primary" size={size} block className={className} loading={stopping} onClick={askStart}>
            <Play size={size === 'lg' ? 16 : 13} /> {stopping ? t.servers.stopping : t.servers.start}
          </Button>}
      {others > 0 && (
        <ConfirmDialog title={t.servers.manyTitle} body={fmt(t.servers.many, { n: others })} confirmLabel={t.servers.startAnyway}
          onConfirm={start} onClose={() => setOthers(0)} />
      )}
      {error && (
        <Dialog title={t.servers.startFailed} onClose={() => setError(null)} actions={<Button variant="primary" onClick={() => setError(null)}>{t.common.gotIt}</Button>}>
          <ErrorMessage message={error} />
        </Dialog>
      )}
    </>
  )
}

/** "● Online · 2/10 players", "● Starting…", "● Stopping…" or "● Stopped". */
export function ServerStatus({ server, className = '' }: { server: Server; className?: string }) {
  const { t } = useApp()
  const s = server.state
  const [dot, label] = s.stopping ? ['bg-gold animate-pulse', t.servers.stopping]
    : s.ready ? ['bg-primary', `${t.servers.status.online} · ${fmt(t.servers.playersOf, { n: s.players.length, max: server.maxPlayers })}`]
    : server.running ? ['bg-gold animate-pulse', t.servers.status.starting] : ['bg-muted', t.servers.status.stopped]
  return <span className={`inline-flex items-center gap-2 text-xs ${className}`}><span className={`w-2.5 h-2.5 rounded-md ${dot}`} />{label}</span>
}
