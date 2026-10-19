import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import PixelIcon from './PixelIcon'

/** Icons that already dropped this session: switching back to a tab must not replay it. */
const dropped = new Set<string>()

/** "Nothing here yet": the first time an icon shows, the item drops in once and settles
 *  on its shadow, so an empty list reads as an answer rather than a page that failed to
 *  load. After that (tab switches, coming back) it is simply there: replaying the drop
 *  on every visit read as the page flickering. The text never waits. */
export default function Empty({ icon, children, action }: { icon: string; children: ReactNode; /** The way out of the empty state, right under the message. */ action?: ReactNode }) {
  const [drop] = useState(() => !dropped.has(icon))
  useEffect(() => { dropped.add(icon) }, [icon])
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <span aria-hidden className="relative flex flex-col items-center">
        <PixelIcon name={icon} size={40} className={drop ? 'motion-safe:animate-[item-drop_0.6s_var(--ease-out)_both]' : ''} />
        <span className={`mt-1.5 h-1.5 w-8 rounded-full bg-text/15 ${drop ? 'motion-safe:animate-[shadow-drop_0.6s_var(--ease-out)_both]' : ''}`} />
      </span>
      <p className="m-0 max-w-[46ch] text-sm text-muted">{children}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
