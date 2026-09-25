import { useCallback, useEffect, useState } from 'react'
import { api, on } from '../api/bridge'
import type { GameEvent, Progress } from '../api/types'
import { messageOf } from '../utils/errors'

/** What the Play button is doing right now. */
export type LaunchState =
  | { status: 'idle' }
  | { status: 'preparing'; instanceId: string; progress: Progress | null; minimized: boolean }
  | { status: 'error'; instanceId: string; message: string }
  | { status: 'exited'; instanceId: string; exitCode: number; logPath: string }

/** minimizeLaunch hides the loading modal; the progress carries on as a notification. */
export type LaunchController = { launch: LaunchState; play: (id: string) => Promise<void>; dismissLaunch: () => void; minimizeLaunch: () => void }

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
      setLaunch({ status: 'error', instanceId: id, message: messageOf(e) })
    }
  }, [refreshInstances])

  const dismissLaunch = useCallback(() => setLaunch({ status: 'idle' }), [])

  const minimizeLaunch = useCallback(() => setLaunch((cur) => (cur.status === 'preparing' ? { ...cur, minimized: true } : cur)), [])

  return { launch, play, dismissLaunch, minimizeLaunch }
}
