import type { ReactNode } from 'react'

/** `<main>` of the instance and server pages. As high as the window and never
 *  scrolling itself: the side panel and the tab bar stay where they are, and only
 *  `ScrollBody` (the cards) moves. Side column and margins shrink with the window
 *  (`!` beats the global `#root > main` scroller). */
export const SPLIT_MAIN = 'flex-1 min-h-0 grid grid-cols-[clamp(240px,26vw,340px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-x-[clamp(16px,3vw,32px)] pt-4 px-[clamp(16px,3vw,40px)] pb-6 overflow-y-hidden!'

/** The right column of a split page: fixed things (address, tab bar) on top, then `ScrollBody`. */
export function SplitColumn({ children }: { children: ReactNode }) {
  return <div className="min-w-0 min-h-0 flex flex-col gap-4">{children}</div>
}

/** The one scroller of a split page: it takes the height left and scrolls its cards. The negative
 *  margin and matching padding keep the cards' shadows and drop outline from being clipped. */
export function ScrollBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden -m-3 p-3">{children}</div>
}

/** The side panel of the instance and server pages: as tall as its grid cell, so it never moves
 *  or grows with the content. Everything in it is sized to fit the smallest window; if a very
 *  short one still cannot, the details scroll and the actions stay put. */
export default function SidePanel({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <div className="panel h-full min-h-0 flex flex-col gap-2 p-4">
      {/* Padded so the stat cards' shadows are not clipped by the scroll box. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 -m-2 p-2">{children}</div>
      <div className="flex flex-col gap-2">{actions}</div>
    </div>
  )
}
