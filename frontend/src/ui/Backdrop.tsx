import { memo } from 'react'
import type { CSSProperties } from 'react'
import { iconURL } from '../assets'
import type { Scheme } from '../assets'
import { useApp } from '../state'

/** Faint items in the sidebar's empty middle and the page's open space, per theme.
 *  Item sprites only: a full block texture reads as a missing image at this opacity. */
const ITEMS: Record<Scheme, string[]> = {
  light: ['diamond_pickaxe', 'golden_apple', 'emerald', 'sweet_berries', 'gold_ingot', 'fishing_rod', 'glow_berries', 'diamond', 'apple', 'carrot', 'bread', 'iron_sword', 'cake', 'honey_bottle'],
  dark: ['ender_pearl', 'amethyst_shard', 'echo_shard', 'nether_star', 'heart_of_the_sea', 'ender_eye', 'end_crystal', 'diamond', 'dragon_breath', 'ghast_tear', 'experience_bottle', 'blaze_rod', 'shulker_shell', 'totem_of_undying'],
}

/** x across the page (0 = its left edge, 1 = the window's right edge), so items keep
 *  clear of the sidebar whether it is wide or a rail. */
const page = (f: number) => `calc(var(--side-w) + (100vw - var(--side-w)) * ${f})`

/* x, size (px), y, tilt (deg). The first two sit in the sidebar's middle; the rest are
   scattered through the page on a loose 4x4 grid (jittered so it never reads as a grid;
   the top-left cell is left empty for the page heading),
   where cards cover them and the gaps between show them, so they never compete with
   content. Sizes are multiples of 16 so the pixels stay crisp. */
const SLOTS: [string, number, string, number][] = [
  ['16px', 64, '42vh', -14], ['calc(var(--side-w) - 72px)', 48, '60vh', 16],
  [page(0.3), 48, '10vh', -12], [page(0.55), 80, '2vh', 14], [page(0.84), 64, '9vh', -8],
  [page(0.14), 80, '28vh', -16], [page(0.42), 64, '34vh', 8], [page(0.66), 48, '27vh', -10], [page(0.9), 80, '33vh', 12],
  [page(0.02), 48, '55vh', 6], [page(0.28), 80, '58vh', -6], [page(0.56), 64, '52vh', 16], [page(0.8), 48, '60vh', -14],
  [page(0.12), 64, '80vh', 12], [page(0.4), 48, '84vh', -10], [page(0.64), 80, '78vh', 8], [page(0.9), 64, '85vh', -12],
  [page(0.24), 64, '94vh', 10],
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
