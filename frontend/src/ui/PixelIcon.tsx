import { CSSProperties, useMemo } from 'react'
import { pixelIconDataURL } from './pixels'

type Props = { name: string; size: number; style?: CSSProperties; className?: string; title?: string }

/** A pixel-art block/item icon, rasterized once per (name, size) and cached. */
export default function PixelIcon({ name, size, style, className, title }: Props) {
  const src = useMemo(() => pixelIconDataURL(name, size), [name, size])
  return (
    <span className={`relative flex-none [image-rendering:pixelated] ${className ?? ''}`} title={title} style={{ width: size, height: size, ...style }}>
      <img src={src} width={size} height={size} alt="" style={{ display: 'block', imageRendering: 'pixelated' }} />
    </span>
  )
}
