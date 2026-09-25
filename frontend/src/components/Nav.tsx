import Logo from '../ui/Logo'
import { Plus } from '../ui/icons'
import Button from '../ui/Button'
import SegmentedControl from '../ui/SegmentedControl'
import { useApp } from '../state'
import AccountMenu from './AccountMenu'

/** Top bar on the canvas, fixed while the page scrolls: brand, the page
 *  links as a slider selector (the green thumb sits under the current
 *  page), account menu and the New Instance action. */
export default function Nav() {
  const { t, screen, go } = useApp()
  // Which pill is lit: Addons also covers a project's Details page, Servers a server's page, Skins the editor; create/instance light none.
  const current = screen.name === 'detail' ? 'search' : screen.name === 'server' ? 'servers' : screen.name === 'skinEditor' ? 'skins'
    : screen.name === 'dashboard' || screen.name === 'search' || screen.name === 'servers' || screen.name === 'skins' ? screen.name : ''
  return (
    <nav className="sticky top-0 z-50 bg-bg flex items-center flex-wrap gap-4 py-4 px-6">
      <div className="flex items-center gap-3 font-bold text-xl whitespace-nowrap mr-auto">
        <Logo size={36} />
        {/* The wordmark gives way below 1100px so the four page links stay on one row. */}
        <span className="hidden min-[1100px]:inline">{t.app.name}</span>
      </div>

      <div className="flex items-center justify-center flex-1">
        <SegmentedControl aria-label={t.app.name}
          options={[{ value: 'dashboard', label: t.nav.dashboard }, { value: 'servers', label: t.nav.servers }, { value: 'skins', label: t.nav.skins }, { value: 'search', label: t.nav.search }]}
          value={current} onChange={(v) => go({ name: v as 'dashboard' | 'servers' | 'skins' | 'search' })} />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <AccountMenu />
        <Button variant="primary" onClick={() => go({ name: 'create' })}><Plus size={16} /> {t.nav.newInstance}</Button>
      </div>
    </nav>
  )
}
