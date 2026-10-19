import { memo } from 'react'
import type { CSSProperties } from 'react'
import { iconURL } from '../assets'
import type { Scheme } from '../assets'
import { useApp } from '../state'

/** Items in the sidebar's empty middle, per theme. Item sprites only: a full block
 *  texture reads as a missing image at this opacity. */
const ITEMS: Record<Scheme, string[]> = {
  light: ['diamond_pickaxe', 'golden_apple'],
  dark: ['ender_pearl', 'amethyst_shard'],
}

/* x, size (px), y, tilt (deg). Only the sidebar's empty middle, whole and uncropped: the
   page itself stays clean, and the Minecraft flavour lives in moments instead (empty
   states, the loader, Playing, GG). Sizes are multiples of 16 so the pixels stay crisp. */
const SLOTS: [string, number, string, number][] = [
  ['20px', 48, '44vh', -14], ['calc(var(--side-w) - 64px)', 32, '58vh', 16],
]

/** Fixed, still layer under the shell (tokens.css .backdrop). Memoized: only the theme matters to it. */
export default memo(function Backdrop() {
  const { scheme } = useApp()
  const items = ITEMS[scheme]
  return (
    <div aria-hidden className="backdrop">
      {SLOTS.map(([x, size, y, rot], i) => (
        <img key={i} src={iconURL(items[i % items.length])} alt="" width={size} height={size}
          style={{ '--x': x, '--y': y, '--r': `${rot}deg` } as CSSProperties} />
      ))}
    </div>
  )
})
