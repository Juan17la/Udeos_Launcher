import Dialog from './Dialog'
import { useApp } from '../state'
import { LANGUAGES } from '../i18n'

export default function LanguageDialog() {
  const { t, language, setLanguage, languageOpen, setLanguageOpen } = useApp()
  if (!languageOpen) return null
  const close = () => setLanguageOpen(false)
  return (
    <Dialog title={t.language.title} onClose={close}
      actions={<button type="button" className="btn btn-primary" onClick={close}>{t.common.done}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LANGUAGES.map((l) => (
          <label key={l.code} className="radio">
            <input type="radio" name="app-language" checked={language === l.code} onChange={() => setLanguage(l.code)} />
            <span className="dot" />
            {l.name}
          </label>
        ))}
        <p style={{ margin: '6px 0 0', fontSize: 13 }} className="text-dim">{t.language.more}</p>
      </div>
    </Dialog>
  )
}
