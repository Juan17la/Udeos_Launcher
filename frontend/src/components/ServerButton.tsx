import { useState } from 'react'
import { Play, Stop } from '../ui/icons'
import Button from '../ui/Button'
import { ProgressBar } from '../ui/Loader'
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
 *  a cancelled one does not. `quiet`: a neutral Start with a blue triangle, for cards
 *  (the solid blue stays for the one main action of a page, like PlayButton). */
export default function ServerButton({ server, size = 'md', className = '', quiet }: { server: Server; size?: 'md' | 'lg'; className?: string; quiet?: boolean }) {
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
        ? <Button variant="idle" size={size} block className={className} onClick={stop}><Stop size={x} /> {ready ? t.servers.stop : t.servers.cancelStart}</Button>
        : <Button variant={quiet ? 'secondary' : 'primary'} size={size} block className={className} loading={stopping} onClick={askStart}>
            {!stopping && <span className={`flex ${quiet ? 'text-primary-hover' : ''}`}><Play size={size === 'lg' ? 16 : 13} /></span>} {stopping ? t.servers.stopping : t.servers.start}
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
  return <span className={`flex items-center gap-2 min-w-0 text-xs ${className}`}><span className={`flex-none w-2 h-2 rounded-sm ${dot}`} /><span className="truncate" title={label}>{label}</span></span>
}

/** In place, while the server comes up or shuts down: a sliding bar and one line
 *  on what is happening (the first start also downloads the server and builds
 *  the world, which the line says). Nothing when the server is stopped or online. */
export function ServerProgress({ server, className = '' }: { server: Server; className?: string }) {
  const { t } = useApp()
  const s = server.state
  const starting = server.running && !s.ready && !s.stopping
  if (!starting && !s.stopping) return null
  const label = s.stopping ? t.servers.stopping : !server.lastPlayed ? t.servers.firstStartShort : t.servers.status.starting
  return (
    <div className={`flex flex-col gap-2 ${className}`} role="status" aria-live="polite">
      <ProgressBar tone={starting && !server.lastPlayed ? 'gold' : undefined} label={label} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}
