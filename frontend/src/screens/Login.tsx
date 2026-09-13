import { useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import Decor, { LOGIN_DECOR } from '../ui/Decor'
import { Check } from '../ui/icons'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

const NICK_RE = /^[A-Za-z0-9_]{3,16}$/

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <Decor slots={LOGIN_DECOR} opacity={0.12} />
      <div className="card elev-lg sheen static" style={{ position: 'relative', zIndex: 1, width: 'min(440px, 100%)', padding: '38px 34px', alignItems: 'stretch', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 2 }}>
          <PixelIcon name={theme === 'dark' ? 'enderman' : 'grass'} size={64} style={{ marginBottom: 4 }} />
          <h1 style={{ fontSize: 34, margin: 0, textAlign: 'center' }}>{t.app.name}</h1>
          <span className="tag tag-accent">{__APP_VERSION__}</span>
          <p className="text-muted" style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 14 }}>
            {step === 'language' ? t.login.introLanguage : t.login.introNickname}
          </p>
        </div>

        {step === 'language' ? (
          <>
            <div className="field">
              <label htmlFor="login-language">{t.language.choose}</label>
              <select id="login-language" className="input" value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 13 }}>{t.language.more}</p>
            </div>
            <button type="button" className="btn btn-primary btn-block" style={{ height: 48, fontSize: 17 }} onClick={() => setStep('nickname')}>{t.login.continue}</button>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="nickname-input">{t.login.nickname}</label>
              <input id="nickname-input" className="input" type="text" placeholder={t.login.placeholder} value={nickname} maxLength={16} autoFocus
                onChange={(e) => setNickname(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
              <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 12 }}>{t.login.hint}</p>
            </div>
            <div onClick={() => setAgreed((a) => !a)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, lineHeight: 1.45 }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, border: `1.5px solid ${agreed ? 'var(--color-accent)' : 'var(--color-divider)'}`, background: agreed ? 'var(--color-accent)' : 'var(--color-bg)', color: 'var(--color-bg)' }}>
                {agreed && <Check />}
              </span>
              <span className="text-muted">
                {t.login.agree} <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrivacyOpen(true) }}>{t.login.privacyPolicy}</a> {t.login.and} <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrivacyOpen(true) }}>{t.login.terms}</a>.
              </span>
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--mc-danger)' }}>{error}</p>}
            <button type="button" className="btn btn-primary btn-block" style={{ height: 48, fontSize: 17 }} disabled={!valid || !agreed || busy} onClick={submit}>{t.login.start}</button>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setStep('language')}>{t.login.backToLanguage}</button>
          </>
        )}
      </div>
    </div>
  )
}
