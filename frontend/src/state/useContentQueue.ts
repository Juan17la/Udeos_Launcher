import { useCallback, useEffect, useRef, useState } from 'react'
import { api, on } from '../api/bridge'
import type { Progress, SearchResult } from '../api/types'
import { messageOf } from '../utils/errors'

/** What a "new instance from this modpack" job creates; name '' = the pack's name. */
export type CreateFromModpack = { name: string; icon: string; gameVersion: string; loader: string }

/** One "add this project to that instance" (or "new instance from this
 *  modpack") request, shown as a toast. */
export type ContentJob = {
  id: number
  /** '' for a create job until the instance exists. */
  instanceId: string
  result: SearchResult
  create?: CreateFromModpack
  status: 'queued' | 'installing' | 'done' | 'error'
  progress: Progress | null
  /** Rejection reason (status 'error'). */
  message: string
  /** Files added (status 'done'); 0 means the project was already there. */
  count: number
}

export type ContentQueue = {
  jobs: ContentJob[]
  enqueue: (instanceId: string, result: SearchResult) => void
  enqueueCreate: (result: SearchResult, create: CreateFromModpack) => void
  dismiss: (id: number) => void
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

  const push = (instanceId: string, result: SearchResult, create?: CreateFromModpack) => setJobs((cur) => {
    const dup = cur.some((j) => j.instanceId === instanceId && j.result.id === result.id && (j.status === 'queued' || j.status === 'installing'))
    if (dup) return cur
    return [...cur, { id: nextId.current++, instanceId, result, create, status: 'queued', progress: null, message: '', count: 0 }]
  })
  const enqueue = useCallback((instanceId: string, result: SearchResult) => push(instanceId, result), [])
  const enqueueCreate = useCallback((result: SearchResult, create: CreateFromModpack) => push('', result, create), [])

  const dismiss = useCallback((id: number) => setJobs((cur) => cur.filter((j) => j.id !== id)), [])

  // Start the next queued job whenever nothing is installing.
  useEffect(() => {
    if (running.current) return
    const next = jobs.find((j) => j.status === 'queued')
    if (!next) return
    running.current = true
    patch(next.id, { status: 'installing' })
    const run = next.create
      ? api.CreateInstanceFromModpack(next.result.id, next.create.name, next.create.icon, next.create.gameVersion, next.create.loader).then((inst) => { patch(next.id, { instanceId: inst.id }); return 1 })
      : api.AddContent(next.instanceId, next.result.id, next.result.projectType).then((entries) => entries.length)
    run
      .then((count) => {
        patch(next.id, { status: 'done', count, progress: null })
        setTimeout(() => dismiss(next.id), DONE_TOAST_MS)
        refreshInstances()
      })
      .catch((e) => patch(next.id, { status: 'error', message: messageOf(e), progress: null }))
      .finally(() => { running.current = false; setJobs((cur) => [...cur]) }) // re-run this effect for the next job
  }, [jobs, dismiss, refreshInstances])

  useEffect(() => on('content:progress', (p) => {
    setJobs((cur) => cur.map((j) => (j.status === 'installing' ? { ...j, progress: p } : j)))
  }), [])

  return { jobs, enqueue, enqueueCreate, dismiss }
}
