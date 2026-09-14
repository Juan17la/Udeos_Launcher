import PixelIcon from '../ui/PixelIcon'
import { Globe, Moon, Plus, Shield, Sun } from '../ui/icons'
import { useApp } from '../state'

export default function Nav() {
  const { t, theme, setTheme, language, screen, go, nickname, setPrivacyOpen, setLanguageOpen } = useApp()
  const dark = theme === 'dark'
  const current = (name: string) => (screen.name === name ? 'page' : undefined)
  return (
    <nav className="nav">
      <div className="nav-brand">
        <PixelIcon name={dark ? 'enderman' : 'grass'} size={26} />
        {t.app.name}
      </div>
      <button type="button" className="nav-link" aria-current={current('dashboard')} onClick={() => go({ name: 'dashboard' })}>{t.nav.dashboard}</button>
      <button type="button" className="nav-link" aria-current={current('search')} onClick={() => go({ name: 'search' })}>{t.nav.search}</button>
      <button type="button" className="nav-link" disabled title={t.nav.comingSoon}>{t.nav.skin}</button>
      <button type="button" className="btn btn-icon btn-primary" title={dark ? t.nav.themeToLight : t.nav.themeToDark} onClick={() => setTheme(dark ? 'light' : 'dark')}>
        {dark ? <Sun /> : <Moon />}
      </button>
      <button type="button" className="btn btn-primary" style={{ fontSize: 15 }} onClick={() => setLanguageOpen(true)}>
        <Globe /> {language.toUpperCase()}
      </button>
      <button type="button" className="btn btn-icon btn-primary" title={t.nav.privacy} onClick={() => setPrivacyOpen(true)}>
        <Shield />
      </button>
      <div className="avatar" title={nickname}>{(nickname[0] || '?').toUpperCase()}</div>
      <button type="button" className="btn btn-primary" style={{ fontSize: 15 }} onClick={() => go({ name: 'create' })}>
        <Plus /> {t.nav.newInstance}
      </button>
    </nav>
  )
}
