import { useCallback, useEffect, useState } from 'react'
import { on } from '../api/bridge'
import { useApp } from '../state'
import { fmt } from '../i18n/format'
import { messageOf } from '../utils/errors'
import type { FileSource } from '../utils/instanceContent'

/** Everything a file-list tab does, once: load the items, add what is
 *  dropped on the window or picked with Browse, remove one, and keep the
 *  "Added …" note (`addedTemplate` with {name}) and the last error. `reloadOn` re-lists when it changes
 *  (worlds after the game closes). The backend validates every file (a
 *  Fabric mod cannot land in a Forge instance); its message becomes `error`. */
export function useFileList<T>(instanceId: string, source: FileSource<T>, addedTemplate: string, reloadOn?: unknown) {
  const { refreshInstances } = useApp()
  const [items, setItems] = useState<T[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => { source.list(instanceId).then(setItems) }, [instanceId, source])
  useEffect(load, [load, reloadOn])
  const reload = useCallback(() => { load(); refreshInstances() }, [load, refreshInstances])

  const add = useCallback(async (paths: string[]) => {
    setError(null); setNote(null)
    for (const p of paths) {
      try { setNote(fmt(addedTemplate, { name: source.name(await source.add(instanceId, p)) })) } catch (e) { setError(messageOf(e)) }
    }
    reload()
  }, [instanceId, source, addedTemplate, reload])

  // Native file drops arrive from Go with real paths (browsers only give names); only the mounted tab listens.
  useEffect(() => on('files:dropped', add), [add])

  const pick = async () => {
    setError(null); setNote(null)
    try {
      const item = await source.pick(instanceId)
      if (source.key(item)) { setNote(fmt(addedTemplate, { name: source.name(item) })); reload() } // an empty key means the picker was cancelled
    } catch (e) { setError(messageOf(e)) }
  }

  const remove = async (item: T) => {
    try { await source.remove(instanceId, source.key(item)) } catch (e) { setError(messageOf(e)) }
    reload()
  }

  const clearNote = useCallback(() => setNote(null), [])

  return { items, note, error, pick, remove, setNote, clearNote }
}
