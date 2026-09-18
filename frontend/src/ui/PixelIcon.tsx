import type { CSSProperties } from 'react'
import { iconURL } from '../assets'

type Props = { name: string; size: number; style?: CSSProperties; className?: string; title?: string }

/** A Minecraft block/item texture (assets/icons) drawn crisp at any size. */
export default function PixelIcon({ name, size, style, className, title }: Props) {
  return <img src={iconURL(name)} width={size} height={size} alt="" title={title} className={`flex-none [image-rendering:pixelated] ${className ?? ''}`} style={style} />
}
