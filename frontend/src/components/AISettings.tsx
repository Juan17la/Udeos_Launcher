import { useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import Button from '../ui/Button'
import { Input, Label, Select } from '../ui/Field'
import ErrorMessage from './ErrorMessage'
import { messageOf } from '../utils/errors'
import type { AIProvider, AIStatus } from '../api/types'

export const PROVIDERS: AIProvider[] = ['groq', 'claude', 'openai', 'gemini', 'grok']

/** There is a key to ask with: the player's own, or the built-in Groq one. */
export const usable = (s: AIStatus) => s.hasKey || (s.provider === 'groq' && s.builtIn)

/** Provider, the player's own API key and model. The key goes to the Go side
 *  and never comes back; the field only says whether one is saved. */
export default function AISettings({ status, onSaved }: { status: AIStatus; onSaved: (s: AIStatus) => void }) {
  const { t } = useApp()
  const [provider, setProvider] = useState(status.provider)
  const [key, setKey] = useState('')
  const models = (p: AIProvider) => status.models[p] ?? []
  // '' (the default) shows as the provider's first model.
  const [model, setModel] = useState(status.model || models(status.provider)[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (call: Promise<AIStatus>) => {
    setBusy(true); setError(null)
    call.then((s) => { setKey(''); setProvider(s.provider); setModel(s.model || s.models[s.provider]?.[0]?.id || ''); onSaved(s) })
      .catch((e) => setError(messageOf(e)))
      .finally(() => setBusy(false))
  }
  const keyPlaceholder = provider === status.provider && status.hasKey ? t.ai.keySaved
    : provider === 'groq' && status.builtIn ? t.ai.keyOptional : t.ai.keyPlaceholder
  const custom = status.provider !== 'groq' || status.hasKey || status.model !== ''
  const picked = models(provider).find((m) => m.id === model)
  const plan = (free: boolean) => (free ? t.ai.free : t.ai.paid)

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); run(api.SetAI(provider, key, model)) }}>
      <p className="m-0 text-sm text-muted">{t.ai.settingsIntro}</p>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-[1_1_140px]">
          <Label htmlFor="ai-provider">{t.ai.provider}</Label>
          <Select id="ai-provider" value={provider} onChange={(e) => { const p = e.target.value as AIProvider; setProvider(p); setModel(models(p)[0]?.id ?? '') }}>
            {PROVIDERS.map((p) => <option key={p} value={p}>{t.ai.providers[p]} · {plan(models(p).some((m) => m.free))}</option>)}
          </Select>
        </div>
        <div className="flex-[2_1_220px]">
          <Label htmlFor="ai-key">{t.ai.key}</Label>
          <Input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)} placeholder={keyPlaceholder} />
        </div>
        <div className="flex-[1_1_180px]">
          <Label htmlFor="ai-model">{t.ai.model}</Label>
          <Select id="ai-model" value={model} onChange={(e) => setModel(e.target.value)}>
            {models(provider).map((m, n) => (
              <option key={m.id} value={m.id}>{m.name} · {plan(m.free)}{n === 0 ? ` · ${t.ai.recommended}` : ''}</option>
            ))}
          </Select>
        </div>
      </div>
      {picked && <p className="m-0 text-sm text-muted">{fmt(picked.free ? t.ai.freeHint : t.ai.paidHint, { provider: t.ai.providers[provider] })}</p>}
      <div className="flex gap-4 flex-wrap justify-end">
        {custom && status.builtIn && <Button variant="idle" disabled={busy} onClick={() => run(api.ResetAI())}>{t.ai.useBuiltIn}</Button>}
        <Button type="submit" variant="primary" loading={busy}>{t.ai.save}</Button>
      </div>
    </form>
  )
}
