import { useEffect, useState } from 'react'
import { Play, Stop } from '../ui/icons'
import Button from '../ui/Button'
import { ConfirmDialog } from '../ui/Dialog'
import LaunchStrip from './LaunchStrip'
import { useApp, useLaunch } from '../state'
import { playingSince } from '../state/useLaunchController'
import { fmt } from '../i18n/format'
import type { Instance } from '../api/types'

/** Play for one instance. While this instance is being prepared it becomes the
 *  launch strip (phase, percentage, bar, Cancel); while it runs, a "Playing"
 *  chip with the time and Close game. Locked while another instance is preparing.
 *  `quiet`: a neutral button with a blue triangle, for the many cards under the one main Play. */
export default function PlayButton({ inst, size = 'md', className = '', compact, quiet }: { inst: Instance; size?: 'md' | 'lg'; className?: string; compact?: boolean; quiet?: boolean }) {
  const { t } = useApp()
  const { play, launch } = useLaunch()
  const busy = launch.status === 'preparing'
  if (busy && launch.instanceId === inst.id) return <LaunchStrip id={inst.id} compact={compact} className={`flex-1 ${className}`} />
  if (inst.running) return <Playing inst={inst} size={size} className={className} />
  return (
    <Button variant={quiet ? 'secondary' : 'primary'} size={size} block className={className} disabled={busy} onClick={() => play(inst.id)}>
      <span className={`flex ${quiet ? 'text-primary' : ''}`}><Play size={size === 'lg' ? 15 : 12} /></span>{t.common.play}
    </Button>
  )
}

/** The game is open: a green chip that counts the minutes, and a way to close a frozen game. */
function Playing({ inst, size, className }: { inst: Instance; size: 'md' | 'lg'; className: string }) {
  const { t } = useApp()
  const { stop } = useLaunch()
  const mins = useMinutes(playingSince(inst.id))
  const [ask, setAsk] = useState(false)
  const [closing, setClosing] = useState(false)
  return (
    <div role="status" className={`flex items-center gap-2.5 w-full min-w-0 ${size === 'lg' ? 'h-13 pl-4' : 'h-11 pl-3.5'} pr-1.5 rounded-lg bg-green-soft shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-green)_55%,transparent)] ${className}`}>
      <span aria-hidden className="relative flex-none flex w-2.5 h-2.5">
        <span className="absolute inset-0 rounded-full bg-green opacity-60 motion-safe:animate-[live-ring_1.6s_ease-out_infinite]" />
        <span className="relative w-2.5 h-2.5 rounded-full bg-green" />
      </span>
      <span className="flex-1 min-w-0 truncate text-sm font-extrabold text-text">{mins < 1 ? t.game.justStarted : fmt(t.game.playingFor, { n: mins })}</span>
      {/* Big chips (hero, instance page) spell it out: a frozen game is a panic moment. */}
      {size === 'lg'
        ? <Button variant="ghost" size="sm" onClick={() => setAsk(true)}><Stop size={11} />{t.game.stop}</Button>
        : <Button variant="ghost" size="sm" square title={t.game.stop} aria-label={t.game.stop} onClick={() => setAsk(true)}><Stop size={11} /></Button>}
      {ask && (
        <ConfirmDialog danger title={t.game.stopTitle} body={fmt(t.game.stopBody, { name: inst.name })} confirmLabel={t.game.stop} busy={closing}
          onClose={() => setAsk(false)} onConfirm={async () => { setClosing(true); try { await stop(inst.id) } finally { setClosing(false); setAsk(false) } }} />
      )}
    </div>
  )
}

/** Whole minutes since `start`, ticking twice a minute while mounted. */
function useMinutes(start: number) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  return Math.floor((now - start) / 60000)
}
