import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Moon, Shield, Sun, User } from '../ui/icons'
import Button from '../ui/atoms/Button'
import { Glass } from '../ui/atoms/Surface'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

/** Nickname button in the nav that opens a glass popover with theme,
 *  language and the privacy & terms dialog. */
export default function AccountMenu() {
  const { t, theme, setTheme, language, setLanguage, nickname, setPrivacyOpen } = useApp()
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dark = theme === 'dark'
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
      <Button variant="idle" title={nickname} onClick={() => setOpen((v) => !v)} className="max-w-50">
        <User size={16} />
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{nickname || '?'}</span>
      </Button>
      {open && (
        <Glass role="menu" className="absolute top-[calc(100%+8px)] right-0 z-9001 w-64 gap-2 p-4 animate-[dialog-fade_0.15s_ease-in-out]">
          <Button variant="ghost" block className="justify-start" onClick={() => setTheme(dark ? 'light' : 'dark')}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? t.nav.themeToLight : t.nav.themeToDark}
          </Button>
          <div className="h-px bg-idle/40" />
          <Button variant="ghost" block className="justify-start" onClick={() => setLangOpen((v) => !v)}>
            <Globe size={16} />
            {currentLanguage?.name ?? language}
            <span className={`ml-auto inline-flex transition-transform duration-150 ease-in-out ${langOpen ? 'rotate-180' : ''}`}><ChevronDown size={14} /></span>
          </Button>
          {langOpen && (
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pl-4">
              {LANGUAGES.map((l) => (
                <Button variant="ghost" size="sm" block className="justify-start" key={l.code} onClick={() => { setLanguage(l.code); setLangOpen(false) }}>
                  <span className="w-3.5 flex-none inline-flex">{language === l.code && <Check size={12} />}</span>
                  {l.name}
                </Button>
              ))}
            </div>
          )}
          <div className="h-px bg-idle/40" />
          <Button variant="ghost" block className="justify-start" onClick={() => { setPrivacyOpen(true); setOpen(false) }}>
            <Shield size={16} /> {t.nav.privacy}
          </Button>
        </Glass>
      )}
    </div>
  )
}
