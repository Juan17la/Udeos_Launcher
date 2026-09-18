import PixelIcon from '../ui/PixelIcon'
import { Plus } from '../ui/icons'
import Button from '../ui/Button'
import SegmentedControl from '../ui/SegmentedControl'
import { useApp } from '../state'
import AccountMenu from './AccountMenu'

/** Top bar on the canvas, fixed while the page scrolls: brand, the page
 *  links as a slider selector (the green thumb sits under the current
 *  page), account menu and the New Instance action. */
export default function Nav() {
  const { t, theme, screen, go } = useApp()
  const dark = theme === 'dark'
  // Which pill is lit: Addons also covers a project's Details page; create/instance light none.
  const current = screen.name === 'detail' ? 'search' : screen.name === 'dashboard' || screen.name === 'search' ? screen.name : ''
  return (
    <nav className="sticky top-0 z-50 bg-bg flex items-center flex-wrap gap-4 py-4 px-6">
      <div className="flex items-center gap-3 font-bold text-xl whitespace-nowrap mr-auto">
        <PixelIcon name={dark ? 'enderman' : 'grass'} size={26} />
        {t.app.name}
      </div>

      <div className="flex items-center justify-center flex-1">
        <SegmentedControl aria-label={t.app.name}
          options={[{ value: 'dashboard', label: t.nav.dashboard }, { value: 'search', label: t.nav.search }]}
          value={current} onChange={(v) => go(v === 'search' ? { name: 'search' } : { name: 'dashboard' })} />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <AccountMenu />
        <Button variant="primary" onClick={() => go({ name: 'create' })}><Plus size={16} /> {t.nav.newInstance}</Button>
      </div>
    </nav>
  )
}
