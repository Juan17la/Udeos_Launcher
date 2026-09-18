import { ChevronLeft } from '../ui/icons'
import Button from '../ui/Button'
import { useApp } from '../state'
import { fmt } from '../i18n/format'

/** "Back to …" above a page title: returns to the exact screen the player
 *  came from (see `previous`/`back` in state), the dashboard when there is none. */
export default function BackButton() {
  const { t, previous, back, instances } = useApp()
  const name = (() => {
    switch (previous?.name) {
      case 'search': return t.nav.search
      case 'create': return t.create.title
      case 'instance': return instances.find((i) => i.id === previous.id)?.name ?? t.nav.dashboard
      case 'detail': return previous.result.title
      default: return t.nav.dashboard
    }
  })()
  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-4" onClick={back}><ChevronLeft /> {fmt(t.common.back, { name })}</Button>
    </div>
  )
}
