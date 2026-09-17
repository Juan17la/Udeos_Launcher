import { memo } from 'react'
import PixelIcon from './PixelIcon'
import { THEME_DECOR } from './pixels'
import { useApp } from '../state'

export type DecorSlot = { top: string; left: string; size: number; rot: number }

export const DASHBOARD_DECOR: DecorSlot[] = [
  { top: '4%', left: '2%', size: 80, rot: -14 }, { top: '28%', left: '52%', size: 64, rot: 12 },
  { top: '62%', left: '6%', size: 96, rot: 8 }, { top: '12%', left: '33%', size: 56, rot: -8 },
  { top: '78%', left: '44%', size: 72, rot: -20 }, { top: '46%', left: '24%', size: 60, rot: 16 },
  { top: '88%', left: '16%', size: 52, rot: -6 },
]
export const LOGIN_DECOR: DecorSlot[] = [
  { top: '6%', left: '6%', size: 86, rot: -12 }, { top: '64%', left: '9%', size: 64, rot: 14 },
  { top: '18%', left: '82%', size: 72, rot: 10 }, { top: '72%', left: '86%', size: 92, rot: -16 },
  { top: '40%', left: '3%', size: 52, rot: 6 }, { top: '8%', left: '62%', size: 48, rot: -8 },
]

/** Faint pixel items floating behind a page. Parent must be position:relative + overflow:hidden.
 *  Memoized: only the theme matters to it, but the parent screens re-render on
 *  every instances refresh / screen change through the shared context. */
export default memo(function Decor({ slots, opacity = 0.13, offset = 0 }: { slots: DecorSlot[]; opacity?: number; offset?: number }) {
  const { theme } = useApp()
  const items = THEME_DECOR[theme]
  return (
    <>
      {slots.map((s, i) => (
        <span key={i} className="absolute pointer-events-none z-0 [image-rendering:pixelated]" style={{ top: s.top, left: s.left, width: s.size, height: s.size, transform: `rotate(${s.rot}deg)`, opacity }}>
          <PixelIcon name={items[(i + offset) % items.length]} size={s.size} />
        </span>
      ))}
    </>
  )
})
