import { useState } from 'react'
import PixelIcon from '../ui/PixelIcon'
import Decor, { LOGIN_DECOR } from '../ui/Decor'
import Button from '../ui/Button'
import StatusMessage from '../ui/StatusMessage'
import { Checkbox, Input, Label, Select } from '../ui/Field'
import AutoLoader from '../ui/Loader'
import { errorHeadline, messageOf } from '../utils/errors'
import { NICKNAME } from '../utils/validation'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

/** First-run screen: language, then nickname + consent. No account involved. */
export default function Login() {
  const { t, theme, language, setLanguage, setPrivacyOpen, saveProfile } = useApp()
  const [step, setStep] = useState<'language' | 'nickname'>('language')
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const valid = NICKNAME.test(nickname)
  const submit = async () => {
    if (!valid || !agreed || busy) return
    setBusy(true); setError(null)
    try {
      await saveProfile({ nickname: NICKNAME.normalize(nickname), uuid: '', language, theme, agreed: true, maxMemoryMB: 2048 })
    } catch (e) {
      setError(messageOf(e))
    } finally { setBusy(false) }
  }
  const openPrivacy = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setPrivacyOpen(true) }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 relative overflow-hidden">
      <Decor slots={LOGIN_DECOR} opacity={0.12} />

      {/* Heading on the canvas, never inside the panel. */}
      <div className="relative z-1 flex flex-col items-center gap-4">
        <PixelIcon name={theme === 'dark' ? 'enderman' : 'grass'} size={64} />
        <h1 className="m-0 text-center">{t.app.name}</h1>
        <span className="tag bg-tag-gray">{__APP_VERSION__}</span>
      </div>

      <div className="panel relative z-1 w-[min(440px,100%)] flex flex-col gap-4 p-6">
        {step === 'language' ? (
          <>
            <div>
              <Label htmlFor="login-language">{t.language.choose}</Label>
              <Select id="login-language" value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </Select>
            </div>
            <Button variant="primary" size="lg" block onClick={() => setStep('nickname')}>{t.login.continue}</Button>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="nickname-input">{t.login.nickname}</Label>
              <Input id="nickname-input" type="text" placeholder={t.login.placeholder} value={nickname} maxLength={NICKNAME.maxLength} autoFocus
                onChange={(e) => setNickname(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            </div>
            {nickname.trim() !== '' && !valid && <StatusMessage kind="error" headline={t.errors.invalidNickname} />}
            <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} label={
              <span className="text-muted leading-[1.45]">
                {t.login.agree} <a href="#" onClick={openPrivacy}>{t.login.privacyPolicy}</a> {t.login.and} <a href="#" onClick={openPrivacy}>{t.login.terms}</a>.
              </span>
            } />
            {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} />}
            <AutoLoader active={busy} />
            <Button variant="primary" size="lg" block disabled={!valid || !agreed || busy} onClick={submit}>{t.login.start}</Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('language')}>{t.login.backToLanguage}</Button>
          </>
        )}
      </div>
    </div>
  )
}
