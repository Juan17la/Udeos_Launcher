import type { ReactNode } from 'react'
import Logo from '../ui/Logo'
import { iconURL } from '../assets'
import { Cube, Package, Plus, ServerIcon, Shirt } from '../ui/icons'
import Button from '../ui/Button'
import { useApp } from '../state'
import AccountMenu from './AccountMenu'
import Activity from './Activity'

type Page = 'dashboard' | 'servers' | 'skins' | 'search'

/** The shell's left column: brand, the page's "new" action, the four pages, then
 *  the Activity tray and the profile pinned to the bottom. Below 1000px it folds
 *  to an icon rail (labels hidden, every item keeps its tooltip). */
export default function Sidebar() {
  const { t, screen, go } = useApp()
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
      <div className="flex items-center gap-2.5 px-2 min-h-9 max-[1000px]:justify-center max-[1000px]:px-0">
        <Logo size={32} />
        <span className="font-display text-[19px] leading-none whitespace-nowrap max-[1000px]:hidden">{t.app.name}</span>
      </div>

      {/* On a create page the button would only point at the page you are on: it steps aside (keeping its room, so nothing jumps). */}
      <Button variant="primary" block disabled={creating} aria-hidden={creating} tabIndex={creating ? -1 : undefined} onClick={make.go} title={make.label} className={`max-[1000px]:px-0 ${creating ? 'invisible' : ''}`}>
        <Plus size={15} /><span className="max-[1000px]:hidden">{make.label}</span>
      </Button>

      <nav aria-label={t.app.name} className="flex flex-col gap-1">
        {items.map((it) => {
          const on = current === it.page
          return (
            <button key={it.page} type="button" aria-current={on ? 'page' : undefined} title={it.label} onClick={() => go({ name: it.page })}
              className={`flex items-center gap-3 h-10 px-3 rounded-lg border-0 cursor-pointer text-sm font-semibold text-left transition-colors duration-150 max-[1000px]:justify-center max-[1000px]:px-0 ${on ? 'bg-primary/15 text-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]' : 'bg-transparent text-muted hover:bg-panel-2 hover:text-text'}`}>
              <span className={`flex ${on ? 'text-primary' : ''}`}>{it.icon}</span>
              <span className="truncate max-[1000px]:hidden">{it.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <Activity />
        <AccountMenu />
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-6 opacity-80 [image-rendering:pixelated]"
        style={{ backgroundImage: `url(${iconURL('grass_block_side')})`, backgroundSize: '32px 32px', backgroundRepeat: 'repeat-x' }} />
    </aside>
  )
}
