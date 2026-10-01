import { useEffect, useState } from 'react'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import AutoLoader from '../ui/Loader'
import { InstanceTags } from './Tags'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import type { Instance, SearchResult, World } from '../api/types'

const ROW = 'flex items-center gap-4 w-full text-left cursor-pointer rounded-md border-0 px-4 py-3 bg-idle text-on-idle shadow-neu hover:bg-primary hover:text-on-primary transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-primary'

/** A datapack goes into a world: pick the instance (unless the page already
 *  is one), then the world. A server has a single world, so choosing one
 *  installs at once. */
export default function DatapackDialog({ result, instanceId, onClose }: { result: SearchResult; instanceId?: string; onClose: () => void }) {
  const { t, instances, servers } = useApp()
  const { enqueue } = useContent()
  const [target, setTarget] = useState<Instance | null>(() => (instanceId ? instances.find((i) => i.id === instanceId) ?? null : null))
  const [worlds, setWorlds] = useState<World[] | null>(null)

  useEffect(() => {
    if (!target) return
    setWorlds(null)
    api.ListWorlds(target.id).then(setWorlds).catch(() => setWorlds([]))
  }, [target?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const install = (id: string, world = '') => { enqueue(id, result, undefined, world); onClose() }

  return (
    <Dialog title={fmt(t.content.pickTitle, { title: result.title })} onClose={onClose} actions={<Button variant="idle" onClick={onClose}>{t.common.close}</Button>}>
      <div className="flex flex-col gap-3">
        {!target ? (
          <>
            <p className="m-0 text-muted">{t.content.pickHint}</p>
            {[...instances, ...servers].map((i) => (
              <button key={i.id} type="button" className={ROW} onClick={() => (i.server ? install(i.id) : setTarget(i))}>
                <span className="flex-1 min-w-0 truncate text-base font-bold">{i.name}</span>
                <InstanceTags inst={i} className="shrink-0" />
              </button>
            ))}
          </>
        ) : (
          <>
            <p className="m-0 text-muted">{t.content.pickWorldHint}</p>
            <AutoLoader subtle active={worlds === null} label={t.common.loading} />
            {worlds?.length === 0 && <p className="m-0 font-bold">{t.content.noWorlds}</p>}
            {worlds?.map((w) => (
              <button key={w.folder} type="button" className={ROW} onClick={() => install(target.id, w.folder)}>
                <span className="flex-1 min-w-0 truncate text-base font-bold">{w.name}</span>
                <span className="shrink-0 text-xs opacity-75">{target.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </Dialog>
  )
}
