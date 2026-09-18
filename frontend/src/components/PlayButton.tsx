import { Play } from '../ui/icons'
import Button from '../ui/Button'
import { useApp, useLaunch } from '../state'
import type { Instance } from '../api/types'

/** Play for one instance: a loading ring while it is being prepared, locked
 *  while any instance is preparing or this one is running. */
export default function PlayButton({ inst, size = 'md', className = '' }: { inst: Instance; size?: 'md' | 'lg'; className?: string }) {
  const { t } = useApp()
  const { play, launch } = useLaunch()
  const busy = launch.status === 'preparing'
  return (
    <Button variant="primary" size={size} block className={className} loading={busy && launch.instanceId === inst.id} disabled={busy || inst.running} onClick={() => play(inst.id)}>
      <Play size={size === 'lg' ? 16 : 13} /> {inst.running ? t.common.running : t.common.play}
    </Button>
  )
}
