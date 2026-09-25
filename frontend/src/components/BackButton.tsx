import { ChevronLeft } from '../ui/icons'
import Button from '../ui/Button'
import { useApp } from '../state'
import { fmt } from '../i18n/format'

/** "Back to …" above a page title: returns to the exact screen the player
 *  came from (see `previous`/`back` in state), the dashboard when there is none.
 *  It sticks under the nav on a strip of canvas, tucked 2px under it (the nav is 72px plus a fraction, which left a hairline), so it is in reach
 *  however far the page scrolls: place it straight inside the page's <main>,
 *  since a sticky element only sticks within its parent. The strip's padding
 *  is taken back by negative margins, so it adds no height to the page;
 *  panels that stick below it use top-30 (72 + 48). */
export default function BackButton({ className = '' }: { className?: string }) {
  const { t, previous, back, instances, servers } = useApp()
  const name = (() => {
    switch (previous?.name) {
      case 'search': return t.nav.search
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
    <div className={`sticky top-[70px] z-40 -my-2 py-2 bg-bg ${className}`}>
      <Button variant="ghost" size="sm" className="-ml-4" onClick={back}><ChevronLeft /> {fmt(t.common.back, { name })}</Button>
    </div>
  )
}
