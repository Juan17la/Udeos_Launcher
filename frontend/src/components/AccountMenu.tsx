import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Moon, Plus, Shield, Sun, User, X } from '../ui/icons'
import Button from '../ui/Button'
import { Input } from '../ui/Field'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'
import { NICKNAME } from '../utils/validation'

/** Nickname button in the nav that opens a glass popover with the saved
 *  profiles (switch, add, remove — removing the active one hands over to the next),
 *  theme, language and the privacy & terms dialog. */
export default function AccountMenu() {
  const { t, theme, setTheme, language, setLanguage, nickname, profile, setNickname, removeNickname, setPrivacyOpen } = useApp()
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const nicknames = profile?.nicknames ?? []
  const addProfile = () => {
    if (!NICKNAME.test(newName)) return
    setNickname(NICKNAME.normalize(newName)); setNewName(''); setAdding(false)
  }
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

  useEffect(() => { if (!open) { setLangOpen(false); setAdding(false) } }, [open])

  return (
    <div className="relative flex-none" ref={ref}>
      <Button variant="idle" title={nickname} onClick={() => setOpen((v) => !v)} className="max-w-50">
        <User size={16} />
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{nickname || '?'}</span>
      </Button>
      {open && (
        <div role="menu" className="glass absolute top-[calc(100%+8px)] right-0 z-9001 w-72 flex flex-col gap-2 p-4 animate-[dialog-fade_0.15s_ease-in-out]">
          <span className="px-5 text-xs text-muted">{t.nav.profiles}</span>
          {nicknames.map((n) => (
            <div key={n} className="flex items-center gap-2">
              <Button variant="ghost" size="sm" block className="justify-start min-w-0" onClick={() => { if (n !== nickname) setNickname(n) }}>
                <span className="w-3.5 flex-none inline-flex">{n === nickname && <Check size={12} />}</span>
                <span className="truncate">{n}</span>
              </Button>
              {nicknames.length > 1 && <Button variant="ghost" size="sm" square title={t.nav.removeProfile} onClick={() => removeNickname(n)}><X size={12} /></Button>}
            </div>
          ))}
          {adding ? (
            <div className="flex items-center gap-2">
              <Input type="text" placeholder={t.login.placeholder} value={newName} maxLength={NICKNAME.maxLength} autoFocus
                onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addProfile() }} />
              <Button variant="primary" size="sm" square disabled={!NICKNAME.test(newName)} title={t.nav.addProfile} onClick={addProfile}><Plus size={14} /></Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" block className="justify-start" onClick={() => setAdding(true)}><Plus size={14} /> {t.nav.addProfile}</Button>
          )}
          <div className="h-px bg-idle/40" />
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
        </div>
      )}
    </div>
  )
}
