import { useEffect, useState } from 'react'
import Button from '../../ui/Button'
import { Checkbox, Input, Label, Select } from '../../ui/Field'
import AutoLoader from '../../ui/Loader'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { fmt } from '../../i18n/format'
import { messageOf } from '../../utils/errors'
import { Feedback } from '../instance/TabParts'
import type { Server } from '../../api/types'

/** Vanilla's defaults for the keys this form shows, used when server.properties
 *  does not have them yet (it is written in full on the first start). */
const DEFAULTS: Record<string, string> = {
  motd: '', 'max-players': '20', 'server-port': '25565', gamemode: 'survival', difficulty: 'easy', 'view-distance': '10',
  pvp: 'true', 'allow-flight': 'false', hardcore: 'false', 'enable-command-block': 'false', 'online-mode': 'false', 'level-seed': '',
}
const MODES = ['survival', 'creative', 'adventure', 'spectator'] as const
const DIFFICULTIES = ['peaceful', 'easy', 'normal', 'hard'] as const
const TOGGLES = [['pvp', 'pvp'], ['allow-flight', 'flight'], ['hardcore', 'hardcore'], ['enable-command-block', 'commandBlocks']] as const

/** The server.properties a player usually cares about, in plain words. */
export default function ServerSettingsTab({ server }: { server: Server }) {
  const { t } = useApp()
  const s = t.servers.settings
  const [props, setProps] = useState<Record<string, string> | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.ServerProperties(server.id).then((p) => setProps(Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, p[k] ?? DEFAULTS[k]]))))
      .catch((e) => setError(messageOf(e)))
  }, [server.id])
  if (!props) return <AutoLoader active={!error} label={t.common.loading} />

  const set = (k: string, v: string) => setProps({ ...props, [k]: v })
  const save = async () => {
    setBusy(true); setError(null); setNote(null)
    try { await api.SetServerProperties(server.id, props); setNote(s.saved) } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="mb-1">{s.title}</h4>
        <p className="m-0 text-sm text-muted">{s.subtitle}</p>
      </div>
      <div className="panel flex flex-col gap-6 p-6">
        <div>
          <Label htmlFor="srv-motd">{s.motd}</Label>
          <Input id="srv-motd" type="text" maxLength={59} value={props.motd} onChange={(e) => set('motd', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="srv-mode">{s.gamemode}</Label>
            <Select id="srv-mode" value={props.gamemode} onChange={(e) => set('gamemode', e.target.value)}>
              {MODES.map((m) => <option key={m} value={m}>{s.modes[m]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="srv-diff">{s.difficulty}</Label>
            <Select id="srv-diff" value={props.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{s.difficulties[d]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="srv-max">{s.maxPlayers}</Label>
            <Input id="srv-max" type="number" min={1} max={500} value={props['max-players']} onChange={(e) => set('max-players', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="srv-port">{s.port}</Label>
            <Input id="srv-port" type="number" min={1024} max={65535} value={props['server-port']} onChange={(e) => set('server-port', e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="srv-view">{fmt(s.viewDistance, { n: props['view-distance'] })}</Label>
          <input id="srv-view" type="range" min={2} max={32} value={props['view-distance']} onChange={(e) => set('view-distance', e.target.value)} className="w-full h-2 cursor-pointer accent-primary" />
          <p className="m-0 mt-2 text-sm text-muted">{s.viewHint}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {TOGGLES.map(([key, label]) => (
            <Checkbox key={key} checked={props[key] === 'true'} onChange={(e) => set(key, String(e.target.checked))} label={s[label]} />
          ))}
        </div>
        <div>
          <Checkbox checked={props['online-mode'] === 'true'} onChange={(e) => set('online-mode', String(e.target.checked))} label={s.onlineMode} />
          <p className="m-0 mt-2 text-sm text-muted">{s.onlineModeHint}</p>
        </div>
        <div>
          <Label htmlFor="srv-seed">{s.seed}</Label>
          <Input id="srv-seed" type="text" value={props['level-seed']} spellCheck={false} onChange={(e) => set('level-seed', e.target.value)} />
          <p className="m-0 mt-2 text-sm text-muted">{s.seedHint}</p>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" loading={busy} onClick={save}>{s.save}</Button>
        </div>
      </div>
      <Feedback error={error} note={note} onClearNote={() => setNote(null)} />
    </div>
  )
}
