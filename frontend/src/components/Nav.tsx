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
    <nav className="flex items-center gap-2 flex-wrap py-[13.2px] px-[17.6px] bg-bg border-b border-divider">
      <div className="flex items-center gap-[10px] font-heading font-extrabold text-xl mr-auto whitespace-nowrap">
        <PixelIcon name={dark ? 'enderman' : 'grass'} size={26} />
        {t.app.name}
      </div>
      <div className="flex items-center gap-8 bg-surface rounded-full py-[8.8px] px-[26.4px]">
        <button type="button" className={navLink} aria-current={current('dashboard')} onClick={() => go({ name: 'dashboard' })}>{t.nav.dashboard}</button>
        <button type="button" className={navLink} aria-current={current('search')} onClick={() => go({ name: 'search' })}>{t.nav.search}</button>
        <button type="button" className={navLink} disabled title={t.nav.comingSoon}>{t.nav.skin}</button>
      </div>
      <AccountMenu />
      <button type="button" className="btn btn-accent2" style={{ fontSize: 15 }} onClick={() => go({ name: 'create' })}>
        <Plus size={16} /> {t.nav.newInstance}
      </button>
    </nav>
  )
}
