import { useState } from 'react'
import ErrorMessage from '../components/ErrorMessage'
import ThemePicker from '../components/ThemePicker'
import Logo from '../ui/Logo'
import Decor, { LOGIN_DECOR } from '../ui/Decor'
import Button from '../ui/Button'
import StatusMessage from '../ui/StatusMessage'
import { Checkbox, Input, Label, Select } from '../ui/Field'
import AutoLoader from '../ui/Loader'
import { messageOf } from '../utils/errors'
import { NICKNAME } from '../utils/validation'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

/** Setup, in one step: nickname, language and theme (and, the first time, the
 *  consent). Shown on first run and whenever a profile is added (`adding`), so
 *  each profile starts the way its player wants. Choices show at once but are
 *  saved only on Start; Cancel puts the old ones back. No account involved. */
export default function Login({ adding = false }: { adding?: boolean }) {
  const { t, theme, colors, language, preview, profile, go, setPrivacyOpen, saveProfile, setNickname: addProfile } = useApp()
  const [start] = useState({ theme, colors, language })
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState(adding)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const name = NICKNAME.normalize(nickname)
  const valid = NICKNAME.test(nickname)
  const taken = adding && !!profile?.nicknames.includes(name)
  const submit = async () => {
    if (!valid || taken || !agreed || busy) return
    setBusy(true); setError(null)
    try {
      if (adding) await addProfile(name, { language, theme, colors })
      else await saveProfile({ nickname: name, uuid: '', nicknames: [], language, theme, colors, agreed: true, maxMemoryMB: 2048 })
    } catch (e) {
      setError(messageOf(e))
    } finally { setBusy(false) }
  }
  const cancel = () => { preview(start); go({ name: 'dashboard' }) }
  const openPrivacy = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setPrivacyOpen(true) }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 relative overflow-hidden animate-[page-in_0.2s_ease-out]">
      <Decor slots={LOGIN_DECOR} opacity={0.12} />

      {/* Heading on the canvas, never inside the panel. */}
      <div className="relative z-1 flex flex-col items-center gap-4">
        <Logo size={64} />
        <h1 className="m-0 text-center">{adding ? t.login.newProfile : t.app.name}</h1>
        {!adding && <span className="tag bg-tag-gray">{__APP_VERSION__}</span>}
      </div>

      <div className="panel relative z-1 w-[min(440px,100%)] flex flex-col gap-5 p-6">
        <div>
          <Label htmlFor="nickname-input">{t.login.nickname}</Label>
          <Input id="nickname-input" type="text" placeholder={t.login.placeholder} value={nickname} maxLength={NICKNAME.maxLength} autoFocus
            onChange={(e) => setNickname(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
        </div>
        {nickname.trim() !== '' && !valid && <StatusMessage kind="error" headline={t.errors.invalidNickname} />}
        {taken && <StatusMessage kind="error" headline={t.login.nameTaken} />}

        <div>
          <Label htmlFor="login-language">{t.language.choose}</Label>
          <Select id="login-language" value={language} onChange={(e) => preview({ language: e.target.value as 'en' | 'es' })}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </Select>
        </div>

        <div>
          <Label>{t.theme.title}</Label>
          <ThemePicker theme={theme} colors={colors} onTheme={(v) => preview({ theme: v })} onColors={(c) => preview({ colors: c })} />
        </div>

        {!adding && (
          <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} label={
            <span className="text-muted leading-[1.45]">
              {t.login.agree} <a href="#" onClick={openPrivacy}>{t.login.privacyPolicy}</a> {t.login.and} <a href="#" onClick={openPrivacy}>{t.login.terms}</a>.
            </span>
          } />
        )}
        {error && <ErrorMessage message={error} />}
        <AutoLoader active={busy} />
        <Button variant="primary" size="lg" block disabled={!valid || taken || !agreed || busy} onClick={submit}>{adding ? t.login.create : t.login.start}</Button>
        {adding && <Button variant="ghost" size="sm" onClick={cancel}>{t.common.cancel}</Button>}
      </div>
    </div>
  )
}
