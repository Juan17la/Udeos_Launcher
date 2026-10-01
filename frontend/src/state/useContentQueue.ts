import { useCallback, useEffect, useRef, useState } from 'react'
import { api, on } from '../api/bridge'
import type { Progress, SearchResult } from '../api/types'
import { isCanceled, messageOf } from '../utils/errors'

/** What a "new instance from this modpack" job creates; name '' = the pack's name. */
export type CreateFromModpack = { name: string; icon: string; gameVersion: string; loader: string; /** A .udeos join file to build the instance from instead of a modpack. */ file?: string; /** Build a dedicated server (with this icon, base64 PNG) instead of an instance. */ server?: { iconPNG: string } }

/** One "add this project to that instance" (or "new instance from this
 *  modpack") request, shown as a toast. */
export type ContentJob = {
  id: number
  /** '' for a create job until the instance exists. */
  instanceId: string
  result: SearchResult
  create?: CreateFromModpack
  /** The release the player picked on the Details page ('' = the best one for the instance). */
  versionId?: string
  /** A datapack's world (the saves/ folder name; '' on a server, which has one). */
  world?: string
  status: 'queued' | 'installing' | 'done' | 'error'
  progress: Progress | null
  /** Rejection reason (status 'error'). */
  message: string
  /** Files added (status 'done'); 0 means the project was already there. */
  count: number
}

export type ContentQueue = {
  jobs: ContentJob[]
  enqueue: (instanceId: string, result: SearchResult, versionId?: string, world?: string) => void
  enqueueCreate: (result: SearchResult, create: CreateFromModpack) => void
  /** New instance from a join file on disk; name is the server's (for the notification). */
  enqueueJoinFile: (path: string, name: string) => void
  dismiss: (id: number) => void
  /** Stops a job: a queued one just leaves the queue, the installing one stops downloading. */
  cancel: (id: number) => void
}

/** How long a finished toast stays before it clears itself. Errors stay until dismissed. */
const DONE_TOAST_MS = 5000

/** Install queue for content added from the Addons page. Jobs run one at a
 *  time: the backend's content:progress event carries no job id, so a single
 *  AddContent in flight is the only way to know which toast a tick belongs to. */
export function useContentQueue(refreshInstances: () => Promise<void>): ContentQueue {
  const [jobs, setJobs] = useState<ContentJob[]>([])
  const nextId = useRef(1)
  const running = useRef(false)
  const patch = (id: number, p: Partial<ContentJob>) => setJobs((cur) => cur.map((j) => (j.id === id ? { ...j, ...p } : j)))

  const push = (instanceId: string, result: SearchResult, create?: CreateFromModpack, versionId?: string, world?: string) => setJobs((cur) => {
    const dup = cur.some((j) => j.instanceId === instanceId && j.result.id === result.id && j.world === world && (j.status === 'queued' || j.status === 'installing'))
    if (dup) return cur
    return [...cur, { id: nextId.current++, instanceId, result, create, versionId, world, status: 'queued', progress: null, message: '', count: 0 }]
  })
  const enqueue = useCallback((instanceId: string, result: SearchResult, versionId?: string, world?: string) => push(instanceId, result, undefined, versionId, world), [])
  const enqueueCreate = useCallback((result: SearchResult, create: CreateFromModpack) => push('', result, create), [])
  const enqueueJoinFile = useCallback((path: string, name: string) => push('', { id: `file:${path}`, slug: '', title: name, author: '', description: '', iconUrl: '', downloads: 0, projectType: 'mod', loaders: [] }, { name, icon: 'grass_block_side', gameVersion: '', loader: '', file: path }), [])

  const dismiss = useCallback((id: number) => setJobs((cur) => cur.filter((j) => j.id !== id)), [])

  // Start the next queued job whenever nothing is installing.
  useEffect(() => {
    if (running.current) return
    const next = jobs.find((j) => j.status === 'queued')
    if (!next) return
    running.current = true
    patch(next.id, { status: 'installing' })
    const run = next.create?.server
      ? api.CreateServerFromModpack(next.result.id, next.create.name, next.create.icon, next.create.server.iconPNG, next.create.gameVersion, next.create.loader).then((srv) => { patch(next.id, { instanceId: srv.id }); return 1 })
      : next.create?.file
      ? api.CreateInstanceFromFile(next.create.file, next.create.name, next.create.icon).then((inst) => { patch(next.id, { instanceId: inst.id }); return 1 })
      : next.create
      ? api.CreateInstanceFromModpack(next.result.id, next.create.name, next.create.icon, next.create.gameVersion, next.create.loader).then((inst) => { patch(next.id, { instanceId: inst.id }); return 1 })
      : api.AddContent(next.instanceId, next.result.id, next.result.projectType, next.versionId ?? '', next.world ?? '').then((entries) => entries.length)
    run
      .then((count) => {
        patch(next.id, { status: 'done', count, progress: null })
        setTimeout(() => dismiss(next.id), DONE_TOAST_MS)
        refreshInstances()
      })
      .catch((e) => {
        const message = messageOf(e)
        if (isCanceled(message)) { dismiss(next.id); refreshInstances() } else patch(next.id, { status: 'error', message, progress: null })
      })
      .finally(() => { running.current = false; setJobs((cur) => [...cur]) }) // re-run this effect for the next job
  }, [jobs, dismiss, refreshInstances])

  useEffect(() => on('content:progress', (p) => {
    setJobs((cur) => cur.map((j) => (j.status === 'installing' ? { ...j, progress: p } : j)))
  }), [])

  const cancel = useCallback((id: number) => {
    setJobs((cur) => {
      const job = cur.find((j) => j.id === id)
      if (job?.status === 'installing') { api.CancelDownload('content'); return cur } // its catch removes it
      return cur.filter((j) => j.id !== id)
    })
  }, [])

  return { jobs, enqueue, enqueueCreate, enqueueJoinFile, dismiss, cancel }
}
