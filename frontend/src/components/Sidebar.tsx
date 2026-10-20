import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Logo from '../ui/Logo'
import { iconURL } from '../assets'
import { Cube, Package, Plus, ServerIcon, Shirt, SidebarIcon } from '../ui/icons'
import Button from '../ui/Button'
import { useApp } from '../state'
import AccountMenu from './AccountMenu'
import Activity from './Activity'

type Page = 'dashboard' | 'servers' | 'skins' | 'search'
const readRail = () => { try { return localStorage.getItem('udeos.sideRail') === '1' } catch { return false } }

/** The shell's left column: brand, the page's "new" action, the four pages, then
 *  the Activity tray and the profile pinned to the bottom. It folds to an icon rail
 *  (labels hidden, every item keeps its tooltip) below 1000px, or when the player
 *  squeezes it with the toggle by the logo; that choice is remembered. */
export default function Sidebar() {
  const { t, screen, go } = useApp()
  const [rail, setRail] = useState(readRail)
  // On <html>, so the --side-w token and the `rail:` variant (tokens.css) follow it.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-rail', rail)
    try { localStorage.setItem('udeos.sideRail', rail ? '1' : '0') } catch { /* the choice just is not remembered */ }
  }, [rail])
  // Which item is lit: Addons also covers a project's Details page and the advisor, Servers a server's page, Skins the editor; create lights the list it adds to, an instance page lights none.
  const current = screen.name === 'detail' || screen.name === 'ai' ? 'search' : screen.name === 'server' ? 'servers' : screen.name === 'skinEditor' ? 'skins'
    : screen.name === 'create' ? (screen.server ? 'servers' : 'dashboard')
    : screen.name === 'dashboard' || screen.name === 'search' || screen.name === 'servers' || screen.name === 'skins' ? screen.name : ''
  const creating = screen.name === 'create' || screen.name === 'skinEditor'
  const make = current === 'servers' ? { label: t.servers.new, go: () => go({ name: 'create', server: true }) }
    : current === 'skins' ? { label: t.skins.new, go: () => go({ name: 'skinEditor' }) }
    : { label: t.nav.newInstance, go: () => go({ name: 'create' }) }
  const items: { page: Page; label: string; icon: ReactNode }[] = [
    { page: 'dashboard', label: t.nav.dashboard, icon: <Cube /> },
    { page: 'servers', label: t.nav.servers, icon: <ServerIcon /> },
    { page: 'skins', label: t.nav.skins, icon: <Shirt /> },
    { page: 'search', label: t.nav.search, icon: <Package /> },
  ]
  return (
    <aside className="sidebar relative flex flex-col gap-5 min-h-0 pt-5 pb-9 px-3 bg-bg/55 shadow-[inset_-1px_0_0_var(--color-line)]">
      <div className="flex items-center gap-2.5 px-2 min-h-9 rail:justify-center rail:px-0">
        <Logo size={32} />
        <span className="font-display text-[19px] leading-none whitespace-nowrap rail:hidden">{t.app.name}</span>
      </div>

      {/* On a create page the button would only point at the page you are on: it steps aside (keeping its room, so nothing jumps). */}
      <Button variant="primary" block disabled={creating} aria-hidden={creating} tabIndex={creating ? -1 : undefined} onClick={make.go} title={make.label} className={`rail:px-0 ${creating ? 'invisible' : ''}`}>
        <Plus size={15} /><span className="rail:hidden">{make.label}</span>
      </Button>

      <nav aria-label={t.app.name} className="flex flex-col gap-1">
        {items.map((it) => {
          const on = current === it.page
          return (
            <button key={it.page} type="button" aria-current={on ? 'page' : undefined} title={it.label} onClick={() => go({ name: it.page })}
              className={`flex items-center gap-3 h-10 px-3 rounded-lg border-0 cursor-pointer text-sm font-semibold text-left transition-colors duration-150 rail:justify-center rail:px-0 ${on ? 'bg-primary/15 text-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]' : 'bg-transparent text-muted hover:bg-panel-2 hover:text-text'}`}>
              <span className={`flex ${on ? 'text-primary' : ''}`}>{it.icon}</span>
              <span className="truncate rail:hidden">{it.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {/* Below 1000px the rail is forced, so the toggle would do nothing: it hides. */}
        <button type="button" onClick={() => setRail(!rail)} aria-expanded={!rail} title={rail ? t.nav.expand : t.nav.collapse}
          className="flex items-center gap-3 w-full h-10 px-3 rounded-md border-0 bg-transparent text-muted cursor-pointer text-sm font-medium text-left transition-colors duration-150 hover:bg-panel-2 hover:text-text rail:justify-center rail:px-0 max-[1000px]:hidden">
          <SidebarIcon size={18} /><span className="truncate rail:hidden">{rail ? t.nav.expand : t.nav.collapse}</span>
        </button>
        <Activity />
        <AccountMenu />
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-6 opacity-80 [image-rendering:pixelated]"
        style={{ backgroundImage: `url(${iconURL('grass_block_side')})`, backgroundSize: '32px 32px', backgroundRepeat: 'repeat-x' }} />
    </aside>
  )
}
