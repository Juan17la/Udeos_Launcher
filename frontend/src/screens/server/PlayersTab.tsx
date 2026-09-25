import { useCallback, useEffect, useState } from 'react'
import { User, X } from '../../ui/icons'
import Button from '../../ui/Button'
import { Checkbox, Input } from '../../ui/Field'
import SegmentedControl from '../../ui/SegmentedControl'
import AutoLoader from '../../ui/Loader'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import { messageOf } from '../../utils/errors'
import { Feedback } from '../instance/TabParts'
import type { PlayerList, Server, ServerPlayers } from '../../api/types'

type View = 'online' | PlayerList

/** Who is online (kick, make admin, ban) and the three lists a server
 *  keeps: whitelist, admins (ops) and banned. Changes apply right away on a
 *  running server, and are saved for the next start either way. */
export default function PlayersTab({ server }: { server: Server }) {
  const { t } = useApp()
  const [view, setView] = useState<View>(server.state.ready ? 'online' : 'whitelist')
  const [players, setPlayers] = useState<ServerPlayers | null>(null)
  const [whitelistOn, setWhitelistOn] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const online = server.state.players.join(',')

  const load = useCallback(() => { api.GetServerPlayers(server.id).then(setPlayers).catch((e) => setError(messageOf(e))) }, [server.id])
  useEffect(load, [load, online])
  useEffect(() => { api.ServerProperties(server.id).then((p) => setWhitelistOn(p['white-list'] === 'true')) }, [server.id])

  const set = async (list: PlayerList, player: string, add: boolean) => {
    setError(null)
    try { setPlayers(await api.SetServerPlayer(server.id, list, player, add)); if (add) setName('') } catch (e) { setError(messageOf(e)) }
  }
  const toggleWhitelist = async (on: boolean) => {
    setWhitelistOn(on)
    try { await api.SetServerProperties(server.id, { 'white-list': String(on), 'enforce-whitelist': String(on) }) } catch (e) { setWhitelistOn(!on); setError(messageOf(e)) }
  }
  const kick = (player: string) => api.ServerCommand(server.id, `kick ${player}`).catch((e) => setError(messageOf(e)))

  const names = view === 'online' ? server.state.players : players?.[view] ?? []
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl options={(['online', 'whitelist', 'ops', 'banned'] as View[]).map((v) => ({ value: v, label: t.servers.players.lists[v] }))} value={view} onChange={setView} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="m-0 text-sm text-muted">{t.servers.players.hints[view]}</p>
        {view === 'whitelist' && <Checkbox checked={whitelistOn} onChange={(e) => toggleWhitelist(e.target.checked)} label={t.servers.players.whitelistOn} />}
      </div>
      {view !== 'online' && (
        <form className="flex gap-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) set(view, name.trim(), true) }}>
          <Input type="text" value={name} maxLength={16} spellCheck={false} placeholder={t.servers.players.namePlaceholder} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!name.trim()}>{t.servers.players.add}</Button>
        </form>
      )}
      <Feedback error={error} note={null} onClearNote={() => {}} />
      <AutoLoader active={players === null} label={t.common.loading} />
      {players && names.length === 0 && (
        <p className="text-muted text-center text-sm px-5 py-10">{view === 'online' && !server.state.ready ? t.servers.players.offline : t.servers.players.none}</p>
      )}
      <div className="flex flex-col gap-3">
        {names.map((n) => (
          <div key={n} className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
            <span className="text-muted"><User /></span>
            <span className="flex-1 min-w-0 truncate text-[15px] font-bold">{n}</span>
            {view === 'online' ? (
              <>
                <Button variant="idle" size="sm" onClick={() => kick(n)}>{t.servers.players.kick}</Button>
                <Button variant="idle" size="sm" disabled={players?.ops.includes(n)} onClick={() => set('ops', n, true)}>{t.servers.players.op}</Button>
                <Button variant="danger" size="sm" onClick={() => set('banned', n, true)}>{t.servers.players.ban}</Button>
              </>
            ) : (
              <Button variant="danger" size="sm" square title={t.servers.players.remove} onClick={() => set(view, n, false)}><X /></Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
