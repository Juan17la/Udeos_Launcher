import { useState } from 'react'
import Button from '../../ui/Button'
import Dialog from '../../ui/Dialog'
import StatusMessage from '../../ui/StatusMessage'
import { useApp } from '../../state'
import { api, copyText } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { messageOf } from '../../utils/errors'
import type { Server } from '../../api/types'

/** An address with a Copy button (the button says "Copied" for a moment). */
export function CopyAddress({ label, address }: { label: string; address: string }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)
  const copy = () => { copyText(address); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-panel-2 shadow-neu min-w-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-sm font-bold truncate select-text" title={address}>{address}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={copy}>{copied ? t.servers.copied : t.servers.copy}</Button>
    </div>
  )
}

/** How friends join: the local address, and opening the server to the
 *  internet through the router (UPnP), behind a warning about what hosting
 *  costs this computer. */
export default function InternetTab({ server }: { server: Server }) {
  const { t, profile, refreshInstances } = useApp()
  const [warning, setWarning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publicAddress, publicError, running } = server.state
  const mb = server.launch.maxMemoryMB || profile?.maxMemoryMB || 2048

  const setPublic = async (on: boolean) => {
    setWarning(false); setBusy(true); setError(null)
    try { await api.SetServerPublic(server.id, on); await refreshInstances() } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }

  const status = !server.public ? t.servers.internet.closed
    : !running ? t.servers.internet.whenStarts
    : publicAddress ? null
    : publicError ? t.servers.internet.failed : t.servers.internet.opening
  const lanIP = server.lanAddress.split(':')[0]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-1">{t.servers.internet.title}</h4>
        <p className="m-0 text-sm text-muted">{t.servers.internet.subtitle}</p>
      </div>
      <div className="panel flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-muted">{t.servers.internet.lanHint}</p>
          <CopyAddress label={t.servers.internet.lan} address={server.lanAddress || `localhost:${server.port}`} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-muted">{t.servers.internet.publicHint}</p>
          {publicAddress && server.public
            ? <CopyAddress label={t.servers.internet.public} address={publicAddress} />
            : <div className="px-4 py-2 rounded-md bg-panel-2 shadow-neu flex flex-col"><span className="text-[11px] text-muted">{t.servers.internet.public}</span><span className="text-sm font-bold">{status}</span></div>}
          {server.public && publicError && running && (
            <StatusMessage kind="error" headline={t.servers.internet.failed} detail={<>{publicError}<br />{fmt(t.servers.internet.manual, { port: server.port, ip: lanIP || 'localhost' })}</>} />
          )}
          <div className="flex justify-end">
            {server.public
              ? <Button variant="idle" loading={busy} onClick={() => setPublic(false)}>{t.servers.internet.close}</Button>
              : <Button variant="primary" loading={busy} onClick={() => setWarning(true)}>{t.servers.internet.open}</Button>}
          </div>
        </div>
      </div>
      <p className="m-0 text-sm text-muted">
        {server.loader === 'Vanilla' ? fmt(t.servers.internet.needs, { version: server.version }) : fmt(t.servers.internet.needsMods, { version: server.version, loader: server.loader })}
      </p>
      {error && <StatusMessage kind="error" headline={t.errors.failed} detail={error} />}

      {warning && (
        <Dialog title={t.servers.internet.warnTitle} width={500} onClose={() => setWarning(false)} actions={<>
          <Button variant="idle" onClick={() => setWarning(false)}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={() => setPublic(true)}>{t.servers.internet.confirm}</Button>
        </>}>
          <ul className="m-0 pl-5 flex flex-col gap-2 list-disc">
            {t.servers.internet.warn.map((w) => <li key={w}>{fmt(w, { mb })}</li>)}
          </ul>
        </Dialog>
      )}
    </div>
  )
}
