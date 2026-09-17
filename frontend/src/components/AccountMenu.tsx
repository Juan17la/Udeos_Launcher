import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Moon, ShieldCheck, Sun, User } from 'lucide-react'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

/** Nickname button in the nav that opens a popover with theme, language and terms & conditions. */
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

  const option = '[font:inherit] flex items-center gap-2.5 w-full text-left bg-transparent border-0 py-[9px] px-2.5 rounded-md text-sm text-inherit cursor-pointer hover:bg-accent-100'

  const divider = 'h-px bg-divider my-1.5'

  return (
    <div className="relative flex-none" ref={ref}>
      <button
        type="button"
        title={nickname}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 cursor-pointer font-heading font-extrabold text-[15px] text-text bg-neutral-200 border border-divider rounded-full py-[8.8px] px-[15.84px] min-w-30 max-w-50 hover:bg-neutral-300"
      >
        <User size={16} />
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{nickname || '?'}</span>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 z-9001 w-60 flex flex-col gap-1 p-[13.2px] rounded-lg bg-surface shadow-lg" role="menu">
          <button type="button" className={option} onClick={() => setTheme(dark ? 'light' : 'dark')}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? t.nav.themeToLight : t.nav.themeToDark}
          </button>
          <div className={divider} />
          <button type="button" className={option} onClick={() => setLangOpen((v) => !v)}>
            <Globe size={16} />
            {currentLanguage?.name ?? language}
            <ChevronDown size={14} className={`ml-auto transition-transform duration-150 ease-out${langOpen ? ' rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pl-[8.8px]">
              {LANGUAGES.map((l) => (
                <button type="button" key={l.code} className={`${option} text-[13px]`} onClick={() => { setLanguage(l.code); setLangOpen(false) }}>
                  <span className="w-3.5 flex-none inline-flex text-accent">{language === l.code && <Check size={12} />}</span>
                  {l.name}
                </button>
              ))}
            </div>
          )}
          <div className={divider} />
          <button type="button" className={option} onClick={() => { setPrivacyOpen(true); setOpen(false) }}>
            <ShieldCheck size={16} /> {t.nav.privacy}
          </button>
        </div>
      )}
    </div>
  )
}
