import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Moon, Shield, Sun, User } from '../ui/icons'
import { ThemeDialog } from './ThemePicker'
import Button from '../ui/Button'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'
import ProfileDialog from './ProfileDialog'
import { SkinFace } from './SkinView'

/** Nickname button at the foot of the sidebar that opens a popover above it: Switch profile
 *  (opens the profiles modal), theme, language and the privacy & terms dialog. */
export default function AccountMenu() {
  const { t, scheme, language, setLanguage, nickname, setPrivacyOpen, skins } = useApp()
  const face = skins?.skins.find((k) => k.id === skins.equipped[nickname])?.png
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentLanguage = LANGUAGES.find((l) => l.code === language)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [open])

  useEffect(() => { if (!open) setLangOpen(false) }, [open])

  return (
    <div className="relative flex-none" ref={ref}>
      <button type="button" title={nickname} aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full h-12 px-2 rounded-md border-0 bg-transparent text-text cursor-pointer text-left transition-colors duration-150 hover:bg-panel-2 rail:justify-center">
        <span className="flex-none grid place-items-center w-8 h-8 rounded-md bg-idle"><SkinFace png={face} size={22} /></span>
        <span className="flex-1 min-w-0 flex flex-col leading-tight rail:hidden">
          <span className="truncate text-sm font-semibold">{nickname || '?'}</span>
          <span className="text-[11px] text-muted">{t.profiles.switch}</span>
        </span>
        <span className="text-muted rail:hidden"><ChevronDown size={14} /></span>
      </button>
      {open && (
        <div role="menu" className="glass absolute bottom-[calc(100%+8px)] left-0 z-9001 w-72 flex flex-col gap-1 p-2 animate-[dialog-fade_0.2s_var(--ease-out)]">
          <Button variant="idle" block className="justify-start bg-transparent" onClick={() => { setProfilesOpen(true); setOpen(false) }}>
            <User size={16} /> {t.profiles.switch}
          </Button>
          <div className="h-px bg-line my-1" />
          <Button variant="idle" block className="justify-start bg-transparent" onClick={() => { setThemeOpen(true); setOpen(false) }}>
            {scheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {t.nav.theme}
          </Button>
          <div className="h-px bg-line my-1" />
          <Button variant="idle" block className="justify-start bg-transparent" onClick={() => setLangOpen((v) => !v)}>
            <Globe size={16} />
            {currentLanguage?.name ?? language}
            <span className={`ml-auto inline-flex transition-transform duration-150 ease-in-out ${langOpen ? 'rotate-180' : ''}`}><ChevronDown size={14} /></span>
          </Button>
          {langOpen && (
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pl-4">
              {LANGUAGES.map((l) => (
                <Button variant="idle" size="sm" block className="justify-start bg-transparent" key={l.code} onClick={() => { setLanguage(l.code); setLangOpen(false) }}>
                  <span className="w-3.5 flex-none inline-flex">{language === l.code && <Check size={12} />}</span>
                  {l.name}
                </Button>
              ))}
            </div>
          )}
          <div className="h-px bg-line my-1" />
          <Button variant="idle" block className="justify-start bg-transparent" onClick={() => { setPrivacyOpen(true); setOpen(false) }}>
            <Shield size={16} /> {t.nav.privacy}
          </Button>
        </div>
      )}
      {profilesOpen && <ProfileDialog onClose={() => setProfilesOpen(false)} />}
      {themeOpen && <ThemeDialog onClose={() => setThemeOpen(false)} />}
    </div>
  )
}
