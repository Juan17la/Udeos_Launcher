import { useState } from 'react'
import Button from '../../ui/Button'
import StatusMessage from '../../ui/StatusMessage'
import { Download } from '../../ui/icons'
import ErrorMessage from '../../components/ErrorMessage'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { bytes } from '../../utils/format'
import { messageOf } from '../../utils/errors'
import type { JoinExport, Server } from '../../api/types'

/** "Save file for friends": writes the server's join file. A friend drops it in
 *  New instance and gets the same Minecraft version, loader, mods, packs and
 *  shaders, plus the server in their multiplayer list, without searching for
 *  any of it. Nothing to share on a Vanilla server (plain Minecraft joins it). */
export default function JoinFile({ server }: { server: Server }) {
  const { t } = useApp()
  const j = t.servers.join
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<JoinExport | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (server.loader === 'Vanilla') return null

  const save = async () => {
    setBusy(true); setError(null); setDone(null)
    try {
      const r = await api.ExportServerJoinFile(server.id)
      if (r.path) setDone(r)
    } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="idle" size="sm" loading={busy} onClick={save}><Download size={13} /> {j.save}</Button>
        <span className="text-xs text-muted flex-1 min-w-48">{j.hint}</span>
      </div>
      {error && <ErrorMessage message={error} />}
      {done && (
        <StatusMessage kind="success" onDismiss={() => setDone(null)} headline={fmt(j.saved, { size: bytes(done.info.sizeBytes) })}
          detail={<>
            {fmt(j.contents, { n: done.info.references })}{done.info.embedded > 0 && ` ${fmt(j.embedded, { n: done.info.embedded })}`}
            {!done.info.hasAddress && <><br /><b>{j.noAddress}</b></>}
            <br /><span className="select-text break-all">{done.path}</span>
          </>} />
      )}
    </div>
  )
}
