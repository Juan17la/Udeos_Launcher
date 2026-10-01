import { useEffect, useState } from 'react'
import { Label, Select } from '../../ui/Field'
import { useApp } from '../../state'
import { api } from '../../api/bridge'
import FilesTab from './FilesTab'
import type { World } from '../../api/types'

/** Last world chosen per instance, so coming back reopens it. */
const lastWorld = new Map<string, string>()

/** The datapacks of one world. A game instance picks the world; a server has
 *  just one, so there is nothing to pick. */
export default function DatapacksTab({ id, server }: { id: string; server?: boolean }) {
  const { t } = useApp()
  const [worlds, setWorlds] = useState<World[] | null>(null)
  const [world, setWorld] = useState(lastWorld.get(id) ?? '')

  useEffect(() => {
    if (server) return
    api.ListWorlds(id).then((list) => { setWorlds(list); setWorld((cur) => (list.some((w) => w.folder === cur) ? cur : list[0]?.folder ?? '')) }).catch(() => setWorlds([]))
  }, [id, server])

  if (server) return <FilesTab id={id} kind="datapacks" world="" />
  if (worlds?.length === 0) return <p className="text-muted text-center text-sm px-5 py-10">{t.content.noWorlds}</p>
  return (
    <div className="flex flex-col gap-4">
      {worlds && (
        <div className="max-w-xs">
          <Label htmlFor="dp-world">{t.content.worldTab}</Label>
          <Select id="dp-world" value={world} onChange={(e) => { setWorld(e.target.value); lastWorld.set(id, e.target.value) }}>
            {worlds.map((w) => <option key={w.folder} value={w.folder}>{w.name}</option>)}
          </Select>
        </div>
      )}
      {world && <FilesTab key={world} id={id} kind="datapacks" world={world} />}
    </div>
  )
}
