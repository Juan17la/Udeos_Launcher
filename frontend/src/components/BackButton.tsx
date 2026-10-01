import { ChevronLeft } from '../ui/icons'
import Button from '../ui/Button'
import { useApp } from '../state'
import { fmt } from '../i18n/format'

/** "Back to …" under the nav: returns to the exact screen the player came from (see
 *  `previous`/`back` in state), the dashboard when there is none. A fixed 3rem row
 *  rendered by the Shell outside the page's scroller, so it never moves, flickers or
 *  scrolls with the content; the page's own padding starts under it. `inner` aligns the
 *  button (the create form lines it up with its centred column). */
export default function BackButton({ inner = '' }: { inner?: string }) {
  const { t, previous, back, instances, servers } = useApp()
  const name = (() => {
    switch (previous?.name) {
      case 'search': return t.nav.search
      case 'ai': return t.ai.ask
      case 'create': return previous.server ? t.servers.create.title : t.create.title
      case 'servers': return t.nav.servers
      case 'skins': return t.nav.skins
      case 'server': return servers.find((s) => s.id === previous.id)?.name ?? t.nav.servers
      case 'instance': return instances.find((i) => i.id === previous.id)?.name ?? t.nav.dashboard
      case 'detail': return previous.result.title
      default: return t.nav.dashboard
    }
  })()
  return (
    <div className={`relative shrink-0 z-49 h-12 px-10 flex items-center bg-bg after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-linear-to-b after:from-bg after:to-transparent after:pointer-events-none ${inner}`}>
      <Button variant="ghost" size="sm" className="-ml-4" onClick={back}><ChevronLeft /> {fmt(t.common.back, { name })}</Button>
    </div>
  )
}
