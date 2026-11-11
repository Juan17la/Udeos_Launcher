import { useEffect, useState } from 'react'
import { Play, Stop } from '../atoms/icons'
import Button from '../atoms/Button'
import StatusDot from '../atoms/StatusDot'
import { ProgressBar } from '../atoms/Loader'
import Dialog, { ConfirmDialog } from '../molecules/Dialog'
import ErrorMessage from '../molecules/ErrorMessage'
import { useApp } from '../../state'
import { api, on } from '../../api/bridge'
import { isCanceled, messageOf } from '../../utils/errors'
import { fmt } from '../../i18n/format'
import type { Server, StartProgress } from '../../api/types'

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
  const [tone, label] = s.stopping ? ['working' as const, t.servers.stopping]
    : s.ready ? ['on' as const, `${t.servers.status.online} · ${fmt(t.servers.playersOf, { n: s.players.length, max: server.maxPlayers })}`]
    : server.running ? ['working' as const, t.servers.status.starting] : ['off' as const, t.servers.status.stopped]
  return <span className={`flex items-center gap-2 min-w-0 text-xs ${className}`}><StatusDot tone={tone} /><span className="truncate" title={label}>{label}</span></span>
}

/** In place, while the server comes up or shuts down. Starting: a measured bar
 *  (the backend's 'server:progress': real download bytes, then the time this
 *  server took to load last time) with what is happening and about how long is
 *  left. Stopping takes seconds and is not measured: a sliding bar. Nothing
 *  when the server is stopped or online. */
export function ServerProgress({ server, className = '' }: { server: Server; className?: string }) {
  const { t } = useApp()
  const s = server.state
  const starting = server.running && !s.ready && !s.stopping
  const [p, setP] = useState<StartProgress | null>(null)
  useEffect(() => on('server:progress', (e) => { if (e.id === server.id) setP(e) }), [server.id])
  useEffect(() => { if (!starting) setP(null) }, [starting])
  if (!starting && !s.stopping) return null
  const tp = t.servers.progress
  const first = !server.lastPlayed
  const step = !p ? (first ? t.servers.firstStartShort : t.servers.status.starting)
    : p.step === 'install' ? fmt(tp.install, { loader: server.loader })
    : p.step === 'world' ? (first ? tp.newWorld : tp.world)
    : tp[p.step]
  const eta = p && (p.etaSec <= 5 ? tp.soon : p.etaSec < 60 ? fmt(tp.sec, { n: p.etaSec }) : fmt(tp.min, { n: Math.round(p.etaSec / 60) }))
  const label = s.stopping ? t.servers.stopping : step
  return (
    <div className={`flex flex-col gap-2 ${className}`} role="status" aria-live="polite">
      <ProgressBar value={starting && p ? p.percent : undefined} tone={starting && first ? 'gold' : undefined} label={label} />
      <span className="flex justify-between gap-3 text-xs text-muted">
        <span className="truncate">{label}</span>
        {starting && p && <span aria-hidden className="shrink-0 tabular-nums">{p.percent}% · {eta}</span>}
      </span>
    </div>
  )
}
