import { useEffect, useRef, useState } from 'react'

/** True once `active` has stayed true for `ms`; false the moment it turns false.
 *  Loaders go through it so a wait that ends fast (most local reads) shows
 *  nothing at all, instead of a skeleton or spinner that blinks in and out.
 *  `min`: once shown, stay true at least that long, for a loader that stands in
 *  for the whole page (the caller holds its content back while this is true),
 *  so an answer landing just after `ms` does not flash it for a frame. */
export function useDelayed(active: boolean, ms = 180, min = 0) {
  const [late, setLate] = useState(false)
  const shownAt = useRef(0)
  useEffect(() => {
    if (active) {
      if (late) return
      const id = setTimeout(() => { shownAt.current = Date.now(); setLate(true) }, ms)
      return () => clearTimeout(id)
    }
    if (!late) return
    const id = setTimeout(() => setLate(false), min - (Date.now() - shownAt.current))
    return () => clearTimeout(id)
  }, [active, late, ms, min])
  return late && (active || min > 0)
}
