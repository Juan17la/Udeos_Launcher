import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import Button from '../ui/Button'
import { Input, Label, Select } from '../ui/Field'
import StatusMessage from '../ui/StatusMessage'
import AutoLoader, { Spinner } from '../ui/Loader'
import { ChevronDown, Sparkles } from '../ui/icons'
import { errorHeadline, messageOf } from '../utils/errors'
import { loaderName } from '../utils/format'
import ProjectIcon from './ProjectIcon'
import type { AIAnswer, AIIntent, AIProvider, AIStatus, ProjectType, SearchResult } from '../api/types'

type Msg = { from: 'me' | 'ai'; text: string; error?: boolean; answer?: AIAnswer }

type Props = {
  types: ProjectType[]
  /** The search on screen: the starting point until the chat has run its own. */
  current: AIIntent
  /** An instance's version and loader; they win over whatever the AI reads. */
  lock?: { version: string; loader: string }
  /** The page's own Add, Details and per-card state, so a pick behaves like a result card. */
  onAdd: (r: SearchResult) => void
  onDetails: (r: SearchResult) => void
  stateOf: (r: SearchResult) => 'added' | 'busy' | undefined
  /** "See all": puts the chat's search on the page. */
  onShowAll: (i: AIIntent) => void
}

const PROVIDERS: AIProvider[] = ['groq', 'claude', 'openai', 'gemini', 'grok']

/** There is a key to ask with: the player's own, or the built-in Groq one. */
const usable = (s: AIStatus) => s.hasKey || (s.provider === 'groq' && s.builtIn)

/** The Addons page's AI panel. Each message becomes a Modrinth search, and
 *  the reply shows the model's few picks out of those real results, each
 *  with Add, Details and a one-line reason. Names, icons and versions come
 *  from Modrinth; the reason is the only text the model writes. Add runs
 *  the page's usual compatibility checks. */
export default function AIChat({ types, current, lock, onAdd, onDetails, stateOf, onShowAll }: Props) {
  const { t } = useApp()
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<AIIntent | null>(null) // the chat's last search, so follow-ups refine it
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.AIStatus().then((s) => { setStatus(s); setSettingsOpen(!usable(s)) }).catch((e) => setError(messageOf(e)))
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [log])

  const describe = (i: AIIntent) => [
    t.search.types[i.type],
    i.query && `“${i.query}”`,
    ...i.categories,
    i.gameVersion,
    i.loader && loaderName(i.loader),
    i.sort !== 'relevance' && t.search.sort[i.sort],
  ].filter(Boolean).join(' · ')

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const message = text.trim()
    if (!message || busy) return
    setText(''); setBusy(true)
    setLog((l) => [...l, { from: 'me', text: message }])
    api.AskAI(message, types, last ?? current, lock?.version ?? '', lock?.loader ?? '')
      .then((a) => {
        setLast(a.intent)
        const reply = fmt(a.picks.length ? t.ai.found : t.ai.nothing, { filters: describe(a.intent) })
        setLog((l) => [...l, { from: 'ai', text: reply, answer: a }])
      })
      .catch((err) => setLog((l) => [...l, { from: 'ai', text: `${errorHeadline(messageOf(err), t.errors)} — ${messageOf(err)}`, error: true }]))
      .finally(() => setBusy(false))
  }

  const providerName = status ? t.ai.providers[status.provider] : ''

  return (
    <section className="panel flex flex-col gap-4 p-5" aria-label={t.ai.title}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-bold"><Sparkles size={16} /> {t.ai.title}</div>
        {status && (
          <Button size="sm" variant={settingsOpen ? 'primary' : 'idle'} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
            {fmt(status.hasKey ? t.ai.ownKey : t.ai.builtIn, { provider: providerName })}
            <span className={`inline-flex transition-transform duration-150 ${settingsOpen ? 'rotate-180' : ''}`}><ChevronDown size={12} /></span>
          </Button>
        )}
      </div>
      {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} onDismiss={() => setError(null)} />}
      <AutoLoader active={!status && !error} label={t.common.loading} />

      {status && settingsOpen && (
        <AISettings status={status} onSaved={(s) => { setStatus(s); if (usable(s)) setSettingsOpen(false) }} />
      )}

      {status && !usable(status) && !settingsOpen && <p className="m-0 text-sm text-muted">{t.ai.needKey}</p>}

      {status && usable(status) && (
        <>
          <p className="m-0 text-sm text-muted">{fmt(t.ai.intro, { provider: providerName })}</p>
          {log.length > 0 && (
            <div className="flex flex-col gap-2 max-h-[28rem] overflow-y-auto" aria-live="polite">
              {log.map((m, n) => (
                <div key={n} className={`max-w-[85%] flex flex-col gap-2 ${m.from === 'me' ? 'self-end' : 'self-start'}`}>
                  <div className={`px-4 py-2 rounded-md text-sm ${m.from === 'me' ? 'self-end bg-primary text-white' : m.error ? 'bg-error-soft text-ink' : 'self-start bg-idle text-text'}`}>
                    {m.text}
                  </div>
                  {m.answer?.picks.map(({ result, reason }, i) => (
                    <PickRow key={result.id} delay={i * 90} result={result} reason={reason} state={stateOf(result)}
                      onAdd={() => onAdd(result)} onDetails={() => onDetails(result)} />
                  ))}
                  {m.answer && m.answer.total > m.answer.picks.length && (
                    <Button size="sm" variant="idle" className="self-start" onClick={() => onShowAll(m.answer!.intent)}>
                      {fmt(t.ai.seeAll, { total: m.answer.total.toLocaleString() })}
                    </Button>
                  )}
                </div>
              ))}
              <div ref={end} />
            </div>
          )}
          <form className="flex gap-4" onSubmit={send}>
            <Input className="flex-1" icon={<Sparkles />} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.ai.placeholder} maxLength={300} aria-label={t.ai.placeholder} />
            <Button type="submit" variant="primary" loading={busy} disabled={busy || !text.trim()}>{busy ? t.ai.thinking : t.ai.send}</Button>
          </form>
        </>
      )}
    </section>
  )
}

/** One recommended project inside the chat: icon, name, the model's reason
 *  (Modrinth's own description when there is none), Add and Details. */
function PickRow({ result, reason, state, delay, onAdd, onDetails }: { result: SearchResult; reason: string; state?: 'added' | 'busy'; delay: number; onAdd: () => void; onDetails: () => void }) {
  const { t } = useApp()
  return (
    <div className="flex items-center gap-4 p-3 rounded-md bg-panel-2 shadow-neu flex-wrap [will-change:opacity,transform] motion-safe:animate-[rise-in_0.35s_ease-out_both]" style={{ animationDelay: `${delay}ms` }}>
      <ProjectIcon url={result.iconUrl} size={40} />
      <div className="flex-[1_1_200px] min-w-0 flex flex-col gap-1">
        <div className="font-bold text-sm truncate">{result.title}</div>
        <p className="m-0 text-[13px] text-muted line-clamp-2">{reason || result.description}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={state === undefined ? 'primary' : 'idle'} disabled={state !== undefined} onClick={onAdd}>
          {state === 'busy' && <Spinner size={12} />}
          {state === 'added' ? t.search.added : state === 'busy' ? t.search.adding : t.search.add}
        </Button>
        <Button size="sm" variant="idle" onClick={onDetails}>{t.search.details}</Button>
      </div>
    </div>
  )
}

/** Provider, the player's own API key and model. The key goes to the Go side
 *  and never comes back; the field only says whether one is saved. */
function AISettings({ status, onSaved }: { status: AIStatus; onSaved: (s: AIStatus) => void }) {
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
      {error && <StatusMessage kind="error" headline={errorHeadline(error, t.errors)} detail={error} onDismiss={() => setError(null)} />}
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
