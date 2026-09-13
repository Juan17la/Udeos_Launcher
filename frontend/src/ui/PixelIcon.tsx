import { CSSProperties, useMemo } from 'react'
import { pixelShadow } from './pixels'

type Props = { name: string; size: number; style?: CSSProperties; className?: string; title?: string }

/** A pixel-art block/item icon rendered with one box-shadow (no images). */
export default function PixelIcon({ name, size, style, className, title }: Props) {
  const { unit, shadow } = useMemo(() => pixelShadow(name, size), [name, size])
  return (
    <span className={`pixel ${className ?? ''}`} title={title} style={{ width: size, height: size, ...style }}>
      <i style={{ width: unit, height: unit, boxShadow: shadow }} />
    </span>
  )
}
