import type { ReactNode } from 'react'

/** One row of a list (a world, a mod, a pack, an instance in the compat
 *  list): title and a small meta line on the left, actions on the right.
 *  On the second surface tone so rows read apart from the panels around them. */
export default function ListRow({ title, meta, children }: { title: string; meta: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-md bg-panel-2 shadow-neu">
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="text-[15px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{title}</div>
        <div className="text-xs text-muted">{meta}</div>
      </div>
      {children}
    </div>
  )
}
