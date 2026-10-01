import { useEffect, useMemo, useRef, useState } from 'react'
import { scroller } from '../utils/scroll'
import { useApp, useContent } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import Button from '../ui/Button'
import { Input } from '../ui/Field'
import AutoLoader, { Spinner } from '../ui/Loader'
import { ChevronDown, Sparkles } from '../ui/icons'
import ErrorMessage from '../components/ErrorMessage'
import ProjectIcon from '../components/ProjectIcon'
import AISettings, { usable } from '../components/AISettings'
import { LoaderTags, VersionTag } from '../components/Tags'
import { useAddAction } from '../hooks/useAddAction'
import { allowedTypes } from '../utils/search'
import { messageOf } from '../utils/errors'
import type { AIAnswer, AIGroup, AIStatus, AITurn, SearchResult } from '../api/types'

type Msg = { from: 'me'; text: string } | { from: 'ai'; answer?: AIAnswer; error?: string; retry?: string }

/** The conversation survives a visit to a project's page (Back restores it); a new visit starts empty. */
let saved: { instanceId: string; log: Msg[] } | null = null

/** What the advisor is told about the conversation so far. */
function historyOf(log: Msg[]): AITurn[] {
  return log.flatMap((m): AITurn[] => {
    if (m.from === 'me') return [{ role: 'user', text: m.text }]
    if (!m.answer) return []
    const titles = m.answer.groups.flatMap((g) => g.picks.map((p) => p.result.title))
    const text = [m.answer.question || m.answer.summary, titles.length ? `Recommended: ${titles.join(', ')}.` : ''].filter(Boolean).join(' ')
    return text ? [{ role: 'assistant', text }] : []
  })
}

/** The AI page: a conversation with an advisor that works out what the player
 *  needs (not just what they typed), finds it on Modrinth for the instance they
 *  are adding to, and explains its picks. With an instance in context, Add
 *  installs straight into it; without one, Add asks which instance (only the
 *  ones the thing works on). Added things read "Added" from then on. */
export default function Advisor({ instanceId }: { instanceId?: string }) {
  const { t, instances, servers, cameBack, go } = useApp()
  const { jobs } = useContent()
  const a = t.ai.page
  const inst = instanceId ? instances.find((i) => i.id === instanceId) ?? servers.find((s) => s.id === instanceId) : undefined
  const types = allowedTypes(inst)
  const { add, dialog } = useAddAction(inst?.id)

  const [log, setLog] = useState<Msg[]>(() => (cameBack && saved?.instanceId === (instanceId ?? '') ? saved.log : []))
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const last = useRef<HTMLDivElement>(null)

  useEffect(() => { saved = { instanceId: instanceId ?? '', log } }, [instanceId, log])
  useEffect(() => {
    api.AIStatus().then((s) => { setStatus(s); setSettingsOpen(!usable(s)) }).catch(() => {})
  }, [])
  // The "thinking" line moves on every few seconds, so a long answer does not look stuck.
  useEffect(() => {
    if (!busy) { setStep(0); return }
    const id = setInterval(() => setStep((n) => Math.min(n + 1, a.thinking.length - 1)), 3500)
    return () => clearInterval(id)
  }, [busy, a.thinking.length])
  // A new answer is read from its start; the player's own message scrolls to the bottom.
  useEffect(() => {
    const m = log[log.length - 1]
    if (!m) return
    if (m.from === 'ai') last.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else scroller()?.scrollTo({ top: scroller()!.scrollHeight, behavior: 'smooth' })
  }, [log.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Which projects are in (or going into) an instance: what the instance already has, what finished in this
  // visit, and what is installing now. Without an instance the card says where it went.
  const nameOf = (id: string) => [...instances, ...servers].find((i) => i.id === id)?.name ?? ''
  const [installed, setInstalled] = useState<Set<string>>(() => new Set())
  const [addedTo, setAddedTo] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!inst) return
    let live = true
    api.ListInstalledProjects(inst.id).then((ids) => { if (live) setInstalled(new Set(ids)) }).catch(() => {})
    return () => { live = false }
  }, [inst?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    for (const j of jobs) {
      if (j.status === 'done' && !j.create && !addedTo[j.result.id]) setAddedTo((cur) => ({ ...cur, [j.result.id]: nameOf(j.instanceId) }))
    }
  }, [jobs]) // eslint-disable-line react-hooks/exhaustive-deps
  const stateOf = (r: SearchResult): 'added' | 'busy' | undefined => {
    if (installed.has(r.id) || addedTo[r.id]) return 'added'
    return jobs.some((j) => j.result.id === r.id && (j.status === 'queued' || j.status === 'installing')) ? 'busy' : undefined
  }

  const send = async (raw: string) => {
    const message = raw.trim()
    if (!message || busy) return
    const history = historyOf(log)
    setText(''); setBusy(true)
    setLog((l) => [...l, { from: 'me', text: message }])
    try {
      const answer = await api.AskAI(message, types, history, inst?.id ?? '')
      setLog((l) => [...l, { from: 'ai', answer }])
    } catch (e) {
      setLog((l) => [...l, { from: 'ai', error: messageOf(e), retry: message }])
    } finally { setBusy(false) }
  }

  const suggestions = useMemo(() => (types.includes('mod') ? a.suggestionsMods : a.suggestionsPacks), [types, a])
  const provider = status ? t.ai.providers[status.provider] : ''

  return (
    <main className="flex-1 flex flex-col gap-6 pt-8 px-10 pb-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="m-0 inline-flex items-center gap-3"><Sparkles size={24} /> {t.ai.ask}</h2>
          <span className="tag bg-tag-gray">{inst ? fmt(a.adding, { name: inst.name }) : a.noInstance}</span>
        </div>
        {status && (
          <Button size="sm" variant={settingsOpen ? 'primary' : 'idle'} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
            {fmt(status.hasKey ? t.ai.ownKey : t.ai.builtIn, { provider })}
            <span className={`inline-flex transition-transform duration-150 ${settingsOpen ? 'rotate-180' : ''}`}><ChevronDown size={12} /></span>
          </Button>
        )}
      </div>

      {status && settingsOpen && (
        <section className="panel p-5 max-w-3xl w-full mx-auto">
          <AISettings status={status} onSaved={(s) => { setStatus(s); if (usable(s)) setSettingsOpen(false) }} />
        </section>
      )}
      {status && !usable(status) && !settingsOpen && <p className="m-0 text-sm text-muted text-center">{t.ai.needKey}</p>}

      <div className="flex-1 flex flex-col gap-8 w-full max-w-3xl mx-auto">
        {log.length === 0 && (
          <div className="flex flex-col items-center gap-5 text-center pt-10">
            <span aria-hidden className="grid place-items-center w-16 h-16 rounded-md bg-primary text-on-primary shadow-primary"><Sparkles size={30} /></span>
            <h3 className="m-0">{a.heading}</h3>
            <p className="m-0 text-muted max-w-xl">{a.sub}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {suggestions.map((s) => <Button key={s} variant="idle" size="sm" disabled={busy || !!status && !usable(status)} onClick={() => send(s)}>{s}</Button>)}
            </div>
          </div>
        )}

        {log.map((m, n) => {
          const isLast = n === log.length - 1
          if (m.from === 'me') return <div key={n} className="self-end max-w-[85%] px-4 py-3 rounded-md bg-primary text-on-primary text-sm">{m.text}</div>
          return (
            <div key={n} ref={isLast ? last : undefined} className="flex flex-col gap-4 scroll-mt-4">
              {m.error && <ErrorMessage message={m.error} action={m.retry && <Button size="sm" variant="primary" disabled={busy} onClick={() => send(m.retry!)}>{a.retry}</Button>} />}
              {m.answer && <AnswerView answer={m.answer} stateOf={stateOf} addedTo={addedTo} hasInstance={!!inst} onAdd={add}
                onDetails={(r) => go({ name: 'detail', result: r, instanceId: inst?.id })}
                onSeeAll={(g) => go({ name: 'search', instanceId: inst?.id, prefill: g.intent })}
                onFollowUp={(f) => send(f)} busy={busy} />}
            </div>
          )
        })}

        {busy && (
          <div className="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
            <Spinner size={16} /> {a.thinking[step]}
          </div>
        )}
        <AutoLoader subtle active={!status} label={t.common.loading} />
      </div>

      {/* The box stays at the bottom of the window while the answers scroll by. */}
      <form onSubmit={(e) => { e.preventDefault(); send(text) }}
        className="sticky bottom-0 z-40 -mx-10 px-10 pt-3 pb-5 mt-auto bg-bg before:content-[''] before:absolute before:inset-x-0 before:bottom-full before:h-4 before:bg-linear-to-t before:from-bg before:to-transparent before:pointer-events-none">
        <div className="flex gap-3 w-full max-w-3xl mx-auto">
          <Input className="flex-1" icon={<Sparkles />} value={text} onChange={(e) => setText(e.target.value)} placeholder={a.placeholder} maxLength={400} aria-label={a.placeholder}
            disabled={!!status && !usable(status)} autoFocus />
          <Button type="submit" variant="primary" loading={busy} disabled={busy || !text.trim() || (!!status && !usable(status))}>{t.ai.send}</Button>
        </div>
      </form>
      {dialog}
    </main>
  )
}

type AnswerProps = {
  answer: AIAnswer; busy: boolean; hasInstance: boolean; addedTo: Record<string, string>
  stateOf: (r: SearchResult) => 'added' | 'busy' | undefined
  onAdd: (r: SearchResult) => void; onDetails: (r: SearchResult) => void; onSeeAll: (g: AIGroup) => void; onFollowUp: (text: string) => void
}

/** One answer: what was understood, the advisor's explanation, then the picks by need. */
function AnswerView({ answer, busy, hasInstance, addedTo, stateOf, onAdd, onDetails, onSeeAll, onFollowUp }: AnswerProps) {
  const { t } = useApp()
  const a = t.ai.page
  const empty = !answer.question && answer.groups.length === 0
  return (
    <>
      {answer.understood && <p className="m-0 text-xs text-muted italic">{fmt(a.understood, { text: answer.understood })}</p>}
      {answer.question && <p className="m-0 text-base font-bold">{answer.question}</p>}
      {answer.summary && answer.summary.split(/\n{2,}|\n/).map((p, i) => <p key={i} className="m-0 text-[15px] leading-relaxed">{p}</p>)}
      {empty && <p className="m-0 text-muted">{answer.summary || a.nothing}</p>}

      {answer.groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h5 className="m-0">{g.label}</h5>
              {g.intro && <p className="m-0 text-sm text-muted">{g.intro}</p>}
            </div>
            {g.total > g.picks.length && <Button variant="ghost" size="sm" onClick={() => onSeeAll(g)}>{fmt(a.seeAll, { n: g.total.toLocaleString() })}</Button>}
          </div>
          {g.picks.map(({ result, reason }) => (
            <PickCard key={result.id} result={result} reason={reason} state={stateOf(result)} where={hasInstance ? '' : addedTo[result.id]}
              onAdd={() => onAdd(result)} onDetails={() => onDetails(result)} />
          ))}
        </section>
      ))}

      {answer.followUps.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {answer.followUps.map((f) => <Button key={f} variant="idle" size="sm" disabled={busy} onClick={() => onFollowUp(f)}>{f}</Button>)}
        </div>
      )}
    </>
  )
}

/** One recommended project: icon, name, why it fits this player, what it runs on, Add and Details. */
function PickCard({ result, reason, state, where, onAdd, onDetails }: { result: SearchResult; reason: string; state?: 'added' | 'busy'; where?: string; onAdd: () => void; onDetails: () => void }) {
  const { t } = useApp()
  return (
    <div className="panel flex items-start gap-4 p-4 flex-wrap">
      <ProjectIcon url={result.iconUrl} size={48} />
      <div className="flex-[1_1_260px] min-w-0 flex flex-col gap-2">
        <button type="button" onClick={onDetails} className="self-start max-w-full text-left text-base font-bold truncate bg-transparent border-0 p-0 cursor-pointer text-text hover:underline font-[inherit]">{result.title}</button>
        <p className="m-0 text-sm text-muted">{reason || result.description}</p>
        <div className="flex gap-2 flex-wrap">
          <VersionTag versions={result.gameVersions ?? []} />
          <LoaderTags loaders={result.loaders} max={2} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 self-center">
        <div className="flex gap-2">
          <Button size="sm" variant={state === undefined ? 'primary' : 'idle'} disabled={state !== undefined} onClick={onAdd}>
            {state === 'busy' && <Spinner size={12} />}
            {state === 'added' ? t.search.added : state === 'busy' ? t.search.adding : t.search.add}
          </Button>
          <Button size="sm" variant="idle" onClick={onDetails}>{t.search.details}</Button>
        </div>
        {state === 'added' && where && <span className="text-[11px] text-muted">{fmt(t.ai.page.addedTo, { name: where })}</span>}
      </div>
    </div>
  )
}
