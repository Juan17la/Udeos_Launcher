import { useEffect, useRef } from 'react'
import Logo from '../ui/Logo'
import { Plus } from '../ui/icons'
import Button from '../ui/Button'
import SegmentedControl from '../ui/SegmentedControl'
import { useApp } from '../state'
import AccountMenu from './AccountMenu'
import Activity from './Activity'

/** Top bar on the canvas, fixed while the page scrolls: brand, the page
 *  links as a slider selector (the green thumb sits under the current
 *  page), background activity, account menu and the page's "new" action
 *  (New server on the servers pages, New skin on the skins pages, else
 *  New instance; hidden on the form that already does it). */
export default function Nav() {
  const { t, screen, go } = useApp()
  // Which pill is lit: Addons also covers a project's Details page, Servers a server's page, Skins the editor; create/instance light none.
  const current = screen.name === 'detail' || screen.name === 'ai' ? 'search' : screen.name === 'server' ? 'servers' : screen.name === 'skinEditor' ? 'skins'
    : screen.name === 'dashboard' || screen.name === 'search' || screen.name === 'servers' || screen.name === 'skins' ? screen.name : ''
  // Publish the bar's real height: fonts and wrapping differ per engine, and pages sized for "72px" would otherwise overflow by the difference.
  const bar = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = bar.current
    if (!el) return
    // Whole pixels: a fractional height puts the sticky Back band on a half pixel, which shimmers while scrolling.
    const set = () => document.documentElement.style.setProperty('--nav-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const creating = screen.name === 'create' || screen.name === 'skinEditor'
  const make = current === 'servers' ? { label: t.servers.new, go: () => go({ name: 'create', server: true }) }
    : current === 'skins' ? { label: t.skins.new, go: () => go({ name: 'skinEditor' }) }
    : { label: t.nav.newInstance, go: () => go({ name: 'create' }) }
  return (
    <nav ref={bar} className="relative shrink-0 z-50 bg-bg flex items-center flex-wrap gap-4 py-4 px-6 after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-linear-to-b after:from-bg after:to-transparent after:pointer-events-none">
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
        <Activity />
        <AccountMenu />
        {!creating && <Button variant="primary" onClick={make.go}><Plus size={16} /> {make.label}</Button>}
      </div>
    </nav>
  )
}
