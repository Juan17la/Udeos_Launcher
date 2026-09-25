import type { ReactNode } from 'react'

/** The side panel of the instance and server pages: as tall as the window
 *  under the back button (nav 72 + top padding 32 + back 32 + gap 16 +
 *  bottom padding 48 = 12.5rem), so the page never scrolls because of it,
 *  and stuck below the back button while a long list scrolls past. When the
 *  window is short the details scroll inside it; the actions never do. */
export default function SidePanel({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <div className="panel sticky top-30 h-[calc(100vh-12.5rem)] flex flex-col gap-4 p-5">
      {/* Padded so the stat cards' shadows are not clipped by the scroll box. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 -m-2 p-2">{children}</div>
      <div className="flex flex-col gap-3">{actions}</div>
    </div>
  )
}
