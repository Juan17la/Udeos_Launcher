import { useCallback, useEffect, useState } from 'react'
import { api, on } from '../api/bridge'
import type { GameEvent, Progress } from '../api/types'
import { isCanceled, messageOf } from '../utils/errors'

/** What the Play button is doing right now. */
export type LaunchState =
  | { status: 'idle' }
  | { status: 'preparing'; instanceId: string; progress: Progress | null; minimized: boolean }
  | { status: 'error'; instanceId: string; message: string }
  | { status: 'exited'; instanceId: string; exitCode: number; logPath: string }

/** minimizeLaunch hides the loading modal; the progress carries on as a notification. */
export type LaunchController = { launch: LaunchState; play: (id: string) => Promise<void>; stop: (id: string) => Promise<void>; dismissLaunch: () => void; minimizeLaunch: () => void; cancelLaunch: () => void }

/** When each running game started, as this window saw it (a reload restarts the clock). */
const since = new Map<string, number>()
export const playingSince = (id: string) => { if (!since.has(id)) since.set(id, Date.now()); return since.get(id)! }

/** Owns the launch state: Play, the install progress ticks while preparing,
 *  and the game process events (running clears it, a bad exit opens the
 *  crash dialog). `refreshInstances` keeps the running flags in sync. */
export function useLaunchController(refreshInstances: () => Promise<void>): LaunchController {
  const [launch, setLaunch] = useState<LaunchState>({ status: 'idle' })

  useEffect(() => {
    const offProgress = on('install:progress', (p) => {
      setLaunch((cur) => (cur.status === 'preparing' ? { ...cur, progress: p } : cur))
    })
    const offGame = on('game:state', (ev: GameEvent) => {
      if (ev.running) since.set(ev.instanceId, Date.now())
      else since.delete(ev.instanceId)
      if (ev.running) {
        setLaunch({ status: 'idle' })
      } else if (ev.exitCode !== 0 || ev.error) {
        setLaunch({ status: 'exited', instanceId: ev.instanceId, exitCode: ev.exitCode, logPath: ev.logPath })
      }
      refreshInstances()
    })
    return () => { offProgress(); offGame() }
  }, [refreshInstances])

  const play = useCallback(async (id: string) => {
    setLaunch({ status: 'preparing', instanceId: id, progress: null, minimized: false })
    try {
      await api.LaunchInstance(id)
      await refreshInstances()
    } catch (e) {
      const message = messageOf(e)
      setLaunch(isCanceled(message) ? { status: 'idle' } : { status: 'error', instanceId: id, message })
    }
  }, [refreshInstances])

  const dismissLaunch = useCallback(() => setLaunch({ status: 'idle' }), [])

  const minimizeLaunch = useCallback(() => setLaunch((cur) => (cur.status === 'preparing' ? { ...cur, minimized: true } : cur)), [])

  // Stops the game download; play() then ends quietly (a cancel is not an error).
  const cancelLaunch = useCallback(() => { if (launch.status === 'preparing') api.CancelDownload('launch:' + launch.instanceId) }, [launch])

  // Force-closes the game; its exit then arrives on game:state like any other.
  const stop = useCallback(async (id: string) => { await api.StopGame(id); await refreshInstances() }, [refreshInstances])

  return { launch, play, stop, dismissLaunch, minimizeLaunch, cancelLaunch }
}
