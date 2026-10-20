import { memo } from 'react'
import type { CSSProperties } from 'react'
import { iconURL } from '../assets'
import type { Scheme } from '../assets'
import { useApp } from '../state'

/** Faint items in the sidebar's empty middle and the page's open space, per theme.
 *  Item sprites only: a full block texture reads as a missing image at this opacity. */
const ITEMS: Record<Scheme, string[]> = {
  light: ['diamond_pickaxe', 'golden_apple', 'emerald', 'sweet_berries', 'gold_ingot', 'fishing_rod', 'glow_berries', 'diamond'],
  dark: ['ender_pearl', 'amethyst_shard', 'echo_shard', 'nether_star', 'heart_of_the_sea', 'ender_eye', 'end_crystal', 'diamond'],
}

/** x across the page (0 = its left edge, 1 = the window's right edge), so items keep
 *  clear of the sidebar whether it is wide or a rail. */
const page = (f: number) => `calc(var(--side-w) + (100vw - var(--side-w)) * ${f})`

/* x, size (px), y, tilt (deg). The first two sit in the sidebar's middle; the rest are
   scattered through the page, where cards cover them and the gaps between show them, so
   they never compete with content. Sizes are multiples of 16 so the pixels stay crisp. */
const SLOTS: [string, number, string, number][] = [
  ['20px', 48, '44vh', -14], ['calc(var(--side-w) - 64px)', 32, '58vh', 16],
  [page(0.9), 48, '7vh', 12], [page(0.46), 32, '22vh', -10], [page(0.08), 32, '70vh', 8],
  [page(0.72), 48, '50vh', -16], [page(0.3), 48, '86vh', 14], [page(0.94), 32, '80vh', -8],
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
