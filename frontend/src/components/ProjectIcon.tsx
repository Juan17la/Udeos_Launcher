import { useState } from 'react'
import PixelIcon from '../ui/PixelIcon'

/** A Modrinth project's icon; the stone block stands in when the project
 *  has none or the image cannot be loaded. Until the image arrives its square
 *  is a flat panel tone, so the slot is never empty and then suddenly filled. */
export default function ProjectIcon({ url, size }: { url?: string; size: number }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (!url || failed) return <PixelIcon name="stone" size={size} className="rounded-md" />
  return <img src={url} alt="" loading="lazy" decoding="async" width={size} height={size} className={`rounded-md object-cover shrink-0 ${loaded ? '' : 'bg-panel-2'}`} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
}
