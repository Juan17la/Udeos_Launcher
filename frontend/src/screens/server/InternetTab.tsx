import { useCallback, useState } from 'react'
import Button from '../../ui/Button'
import Dialog from '../../ui/Dialog'
import { Input, Label } from '../../ui/Field'
import SegmentedControl from '../../ui/SegmentedControl'
import StatusMessage from '../../ui/StatusMessage'
import { useApp } from '../../state'
import { api, copyText } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { messageOf } from '../../utils/errors'
import { Feedback } from '../instance/TabParts'
import type { Server } from '../../api/types'

type Mode = 'relay' | 'router'

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

/** How friends join: the local address, and the internet address — through
 *  a free relay (works behind any router or CGNAT) or straight through the
 *  router (UPnP) — behind a warning about what hosting costs this computer.
 *  The address starts with a name the player picks. */
export default function InternetTab({ server }: { server: Server }) {
  const { t, profile, refreshInstances } = useApp()
  const ti = t.servers.internet
  const [warning, setWarning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publicAddress, publicRaw, publicError, running } = server.state
  const saved = server.internet ?? {}
  const savedMode: Mode = saved.mode === 'router' ? 'router' : 'relay'
  const relayName = saved.relay || 'bore.pub'
  const mb = server.launch.maxMemoryMB || profile?.maxMemoryMB || 2048

  const setPublic = async (on: boolean) => {
    setWarning(false); setBusy(true); setError(null)
    try { await api.SetServerPublic(server.id, on); await refreshInstances() } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }

  const status = !server.public ? ti.closed : !running ? ti.whenStarts : publicError ? ti.failed : ti.opening
  // Stopped (or reconnecting), the address saved from the last time it was open still shows.
  const address = publicAddress || saved.address
  const lanIP = server.lanAddress.split(':')[0]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-1">{ti.title}</h4>
        <p className="m-0 text-sm text-muted">{ti.subtitle}</p>
      </div>
      <div className="panel flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-muted">{ti.lanHint}</p>
          <CopyAddress label={ti.lan} address={server.lanAddress || `localhost:${server.port}`} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-muted">{ti.publicHint}</p>
          {server.public && address
            ? <CopyAddress label={ti.public} address={address} />
            : <div className="px-4 py-2 rounded-md bg-panel-2 shadow-neu flex flex-col"><span className="text-[11px] text-muted">{ti.public}</span><span className="text-sm font-bold">{status}</span></div>}
          {server.public && address && !publicAddress && <p className="m-0 text-xs text-muted">{status}</p>}
          {server.public && publicAddress && publicRaw && publicRaw !== publicAddress && (
            <p className="m-0 text-xs text-muted select-text">{fmt(ti.raw, { raw: publicRaw })}</p>
          )}
          {server.public && publicError && running && (
            <StatusMessage kind="error" headline={ti.failed} detail={<>{publicError}<br />
              {savedMode === 'router' ? fmt(ti.manual, { port: server.port, ip: lanIP || 'localhost' }) : ti.relayFailed}</>} />
          )}
          <div className="flex justify-end">
            {server.public
              ? <Button variant="idle" loading={busy} onClick={() => setPublic(false)}>{ti.close}</Button>
              : <Button variant="primary" loading={busy} onClick={() => setWarning(true)}>{ti.open}</Button>}
          </div>
        </div>
      </div>
      <p className="m-0 text-sm text-muted">
        {server.loader === 'Vanilla' ? fmt(ti.needs, { version: server.version }) : fmt(ti.needsMods, { version: server.version, loader: server.loader })}
        {server.udeosLogin && ` ${ti.needsUdeos}`}
      </p>
      {error && <StatusMessage kind="error" headline={t.errors.failed} detail={error} />}

      <AddressSettings key={server.id} server={server} />

      {warning && (
        <Dialog title={ti.warnTitle} width={500} onClose={() => setWarning(false)} actions={<>
          <Button variant="idle" onClick={() => setWarning(false)}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={() => setPublic(true)}>{ti.confirm}</Button>
        </>}>
          <ul className="m-0 pl-5 flex flex-col gap-2 list-disc">
            {ti.warn.map((w) => <li key={w}>{fmt(w, { mb })}</li>)}
            {savedMode === 'relay' && <li>{fmt(ti.relayWarn, { relay: relayName })}</li>}
          </ul>
        </Dialog>
      )}
    </div>
  )
}

/** Connection mode, the address name and (relay mode) the player's own
 *  relay. Saving an open server reconnects it with the new settings. */
function AddressSettings({ server }: { server: Server }) {
  const { t, refreshInstances } = useApp()
  const s = t.servers.internet.settings
  const saved = server.internet ?? {}
  const [mode, setMode] = useState<Mode>(saved.mode === 'router' ? 'router' : 'relay')
  const [name, setName] = useState(server.addressName)
  const [relay, setRelay] = useState(saved.relay ?? '')
  const [secret, setSecret] = useState(saved.secret ?? '')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clearNote = useCallback(() => setNote(null), [])

  const save = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      await api.SetServerInternet(server.id, mode, name.trim(), relay.trim(), secret.trim())
      await refreshInstances()
      setNote(s.saved)
    } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div>
        <h4 className="mb-1">{s.title}</h4>
        <p className="m-0 text-sm text-muted">{s.subtitle}</p>
      </div>
      <div className="panel flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <Label id="net-mode" className="mb-0">{s.mode}</Label>
          <SegmentedControl aria-labelledby="net-mode" options={(['relay', 'router'] as Mode[]).map((m) => ({ value: m, label: s.modes[m] }))} value={mode} onChange={setMode} />
          <p className="m-0 text-sm text-muted">{s.modeHints[mode]}</p>
        </div>
        <div>
          <Label htmlFor="net-name">{s.name}</Label>
          <Input id="net-name" type="text" value={name} maxLength={60} spellCheck={false}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
          <p className="m-0 mt-2 text-sm text-muted">{fmt(s.nameHint, { name: name || server.addressName })}</p>
        </div>
        {mode === 'relay' && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-bold select-none">{s.ownRelay}</summary>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="net-relay">{s.relay}</Label>
                <Input id="net-relay" type="text" value={relay} placeholder="bore.pub" spellCheck={false} onChange={(e) => setRelay(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="net-secret">{s.secret}</Label>
                <Input id="net-secret" type="password" value={secret} placeholder={s.secretPlaceholder} onChange={(e) => setSecret(e.target.value)} />
              </div>
            </div>
            <p className="m-0 mt-2 text-sm text-muted">{s.relayHint}</p>
          </details>
        )}
        <div className="flex justify-end">
          <Button variant="primary" loading={busy} onClick={save}>{s.save}</Button>
        </div>
      </div>
      <Feedback error={error} note={note} onClearNote={clearNote} />
    </div>
  )
}
