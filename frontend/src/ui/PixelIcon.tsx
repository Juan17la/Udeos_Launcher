import type { CSSProperties } from 'react'
import { pixelIconDataURL } from './pixels'

type Props = { name: string; size: number; style?: CSSProperties; className?: string; title?: string }

/** A pixel-art block/item icon; pixelIconDataURL rasterizes once per (name, size). */
export default function PixelIcon({ name, size, style, className, title }: Props) {
  return <img src={pixelIconDataURL(name, size)} width={size} height={size} alt="" title={title} className={`flex-none [image-rendering:pixelated] ${className ?? ''}`} style={style} />
}
