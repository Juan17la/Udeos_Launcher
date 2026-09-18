import { useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import type { Instance } from '../api/types'

/** An instance's icon: the pixel block the player picked, or — for an
 *  instance made from a modpack — the pack's own icon, served from
 *  /media/<id>/icon (the grass block stands in if the file is missing). */
export default function InstanceIcon({ inst, size }: { inst: Instance; size: number }) {
  const [failed, setFailed] = useState(false)
  if (inst.icon !== 'modpack' || failed) return <PixelIcon name={inst.icon === 'modpack' ? 'grass' : inst.icon} size={size} />
  return <img src={`/media/${encodeURIComponent(inst.id)}/icon`} alt="" width={size} height={size} className="flex-none rounded-md object-cover" onError={() => setFailed(true)} />
}
