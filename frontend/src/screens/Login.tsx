import { useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import Decor, { LOGIN_DECOR } from '../ui/Decor'
import { Check } from '../ui/icons'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

const NICK_RE = /^[A-Za-z0-9_]{3,16}$/

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnGhost = 'text-accent border-transparent px-1.5 bg-transparent hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]'
const btnBlock = 'w-full mt-2'
const inputCls = 'w-full min-h-9 px-3.5 py-1.5 font-inherit text-sm text-text caret-accent bg-surface border border-divider rounded-full hover:border-accent-400 focus-visible:border-accent focus-visible:outline-0 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]'
const fieldLabel = 'block text-xs mb-1 text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'

/** First-run screen: language, then nickname + consent. No account involved. */
export default function Login() {
  const { t, theme, language, setLanguage, setPrivacyOpen, saveProfile } = useApp()
  const [step, setStep] = useState<'language' | 'nickname'>('language')
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const valid = NICK_RE.test(nickname.trim())
  const submit = async () => {
    if (!valid || !agreed || busy) return
    setBusy(true); setError(null)
    try {
      await saveProfile({ nickname: nickname.trim(), uuid: '', language, theme, agreed: true, maxMemoryMB: 2048 })
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <Decor slots={LOGIN_DECOR} opacity={0.12} />
      <div className="relative z-1 flex flex-col gap-5 w-[min(440px,100%)] py-9.5 px-8.5 rounded-lg bg-surface shadow-sheen">
        <div className="flex flex-col items-center gap-3 mb-0.5">
          <PixelIcon name={theme === 'dark' ? 'enderman' : 'grass'} size={64} style={{ marginBottom: 4 }} />
          <h1 className="text-[34px] m-0 text-center">{t.app.name}</h1>
          <span className="inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap bg-accent-100 text-accent-800">{__APP_VERSION__}</span>
          <p className={`${textMuted} mt-1 text-center text-sm`}>
            {step === 'language' ? t.login.introLanguage : t.login.introNickname}
          </p>
        </div>

        {step === 'language' ? (
          <>
            <div className="mb-3">
              <label htmlFor="login-language" className={fieldLabel}>{t.language.choose}</label>
              <select id="login-language" className={`${inputCls} appearance-auto`} value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <p className={`${textMuted} mt-2 text-[13px]`}>{t.language.more}</p>
            </div>
            <button type="button" className={`${btnBase} ${btnPrimary} ${btnBlock} h-12 text-[17px]`} onClick={() => setStep('nickname')}>{t.login.continue}</button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label htmlFor="nickname-input" className={fieldLabel}>{t.login.nickname}</label>
              <input id="nickname-input" className={inputCls} type="text" placeholder={t.login.placeholder} value={nickname} maxLength={16} autoFocus
                onChange={(e) => setNickname(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
              <p className={`${textMuted} mt-2 text-xs`}>{t.login.hint}</p>
            </div>
            <div onClick={() => setAgreed((a) => !a)} className="flex items-start gap-2.5 cursor-pointer text-sm leading-[1.45]">
              <span className={`w-5 h-5 rounded-md flex-none flex items-center justify-center mt-0.5 border-[1.5px] text-bg ${agreed ? 'border-accent bg-accent' : 'border-divider bg-bg'}`}>
                {agreed && <Check />}
              </span>
              <span className={textMuted}>
                {t.login.agree} <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrivacyOpen(true) }}>{t.login.privacyPolicy}</a> {t.login.and} <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrivacyOpen(true) }}>{t.login.terms}</a>.
              </span>
            </div>
            {error && <p className="m-0 text-[13px] text-mc-danger">{error}</p>}
            <button type="button" className={`${btnBase} ${btnPrimary} ${btnBlock} h-12 text-[17px]`} disabled={!valid || !agreed || busy} onClick={submit}>{t.login.start}</button>
            <button type="button" className={`${btnBase} ${btnGhost} text-[13px]`} onClick={() => setStep('language')}>{t.login.backToLanguage}</button>
          </>
        )}
      </div>
    </div>
  )
}
