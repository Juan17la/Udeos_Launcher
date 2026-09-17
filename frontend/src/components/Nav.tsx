import { Plus } from 'lucide-react'
import PixelIcon from '../ui/PixelIcon'
import { useApp } from '../state'
import AccountMenu from './AccountMenu'

export default function Nav() {
  const { t, theme, screen, go } = useApp()
  const dark = theme === 'dark'
  const current = (name: string) => (screen.name === name ? 'page' : undefined)
  const navLink = '[font:inherit] cursor-pointer whitespace-nowrap bg-transparent border-0 p-0 text-[15px] text-inherit hover:text-accent aria-[current="page"]:text-accent disabled:opacity-45 disabled:cursor-not-allowed'
  return (
    <nav className="flex items-center flex-wrap py-[13.2px] px-[17.6px] bg-bg border-b border-divider">
      <div className="flex items-center gap-2.5 mx-4 font-heading font-extrabold text-xl mr-auto whitespace-nowrap">
        <PixelIcon name={dark ? 'enderman' : 'grass'} size={26} />
        {t.app.name}
      </div>

      <div className="flex items-center justify-center mx-16 flex-1 gap-8 bg-surface rounded-full py-[8.8px] px-7">
        <button type="button" className={navLink} aria-current={current('dashboard')} onClick={() => go({ name: 'dashboard' })}>{t.nav.dashboard}</button>
        
        <button type="button" className={navLink} aria-current={current('search')} onClick={() => go({ name: 'search' })}>{t.nav.search}</button>

        <button type="button" className={navLink} disabled title={t.nav.comingSoon}>{t.nav.skin}</button>
      </div>

      <div className="flex items-center gap-2.5 mx-4 font-heading font-extrabold text-xl mr-auto whitespace-nowrap">
        <AccountMenu />
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-[15px] leading-[1.2] rounded-full border border-transparent px-4 py-2 bg-accent-2 text-bg disabled:opacity-45 disabled:cursor-not-allowed"
          onClick={() => go({ name: 'create' })}
        >
          <Plus size={16} /> {t.nav.newInstance}
        </button>
      </div>
    </nav>
  )
}
