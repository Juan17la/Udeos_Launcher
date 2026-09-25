import { useEffect, useRef, useState } from 'react'
import Button from '../../ui/Button'
import { Input } from '../../ui/Field'
import { useApp } from '../../state'
import { api, on } from '../../api/bridge'
import { messageOf } from '../../utils/errors'
import { Feedback } from '../instance/TabParts'
import type { Server } from '../../api/types'

/** A line's colour: the launcher's own notes, typed commands, warnings, errors. */
function tone(line: string) {
  if (line.startsWith('[Udeos]')) return 'text-primary font-bold'
  if (line.startsWith('> ')) return 'font-bold'
  if (/\/(ERROR|FATAL)\]|Exception/.test(line)) return 'text-error-soft'
  if (/\/WARN\]/.test(line)) return 'text-muted'
  return ''
}

/** The server's console: its live output, a command line and a few
 *  one-click commands for the things players ask for most. */
export default function ConsoleTab({ server }: { server: Server }) {
  const { t } = useApp()
  const [lines, setLines] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const stick = useRef(true) // follow new lines unless the player scrolled up
  const live = server.state.running

  useEffect(() => {
    const off = on('server:log', (e) => { if (e.id === server.id) setLines((l) => [...l.slice(-499), e.line]) })
    api.ServerLog(server.id).then(setLines)
    return off
  }, [server.id])
  useEffect(() => { if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight }, [lines])

  const send = async (line: string) => {
    setError(null)
    try { await api.ServerCommand(server.id, line); setInput('') } catch (e) { setError(messageOf(e)) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={box} onScroll={(e) => { const b = e.currentTarget; stick.current = b.scrollHeight - b.scrollTop - b.clientHeight < 40 }}
        className="h-[calc(100vh-24rem)] min-h-64 overflow-y-auto rounded-md bg-panel-2 shadow-neu-inset px-4 py-3 text-xs leading-relaxed select-text">
        {lines.length === 0 && <p className="m-0 text-muted">{t.servers.console.empty}</p>}
        {lines.map((l, i) => <div key={i} className={`whitespace-pre-wrap break-words ${tone(l)}`}>{l}</div>)}
      </div>
      <form className="flex gap-4" onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(input) }}>
        <Input type="text" value={input} disabled={!live} spellCheck={false} onChange={(e) => setInput(e.target.value)}
          placeholder={live ? t.servers.console.placeholder : t.servers.console.off} />
        <Button type="submit" variant="primary" disabled={!live || !input.trim()}>{t.servers.console.send}</Button>
      </form>
      <div className="flex gap-4 flex-wrap">
        {([['time set day', t.servers.console.quick.day], ['weather clear', t.servers.console.quick.weather], ['save-all', t.servers.console.quick.save]] as const).map(([cmd, label]) => (
          <Button key={cmd} variant="idle" size="sm" disabled={!server.state.ready} title={cmd} onClick={() => send(cmd)}>{label}</Button>
        ))}
      </div>
      <Feedback error={error} note={null} onClearNote={() => {}} />
    </div>
  )
}
