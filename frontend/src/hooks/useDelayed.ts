import { useEffect, useState } from 'react'

/** True once `active` has stayed true for `ms`; false the moment it turns false.
 *  Loaders go through it so a wait that ends fast (most local reads) shows
 *  nothing at all, instead of a skeleton or spinner that blinks in and out. */
export function useDelayed(active: boolean, ms = 180) {
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (!active) { setLate(false); return }
    const id = setTimeout(() => setLate(true), ms)
    return () => clearTimeout(id)
  }, [active, ms])
  return active && late
}
