import { useState } from 'react'
import { useApp, useLaunch } from '../../state'
import { fmt } from '../../i18n/format'
import { api } from '../../api/bridge'
import Dialog from '../molecules/Dialog'
import Button from '../atoms/Button'
import InstanceIcon from '../atoms/InstanceIcon'
import ErrorMessage from '../molecules/ErrorMessage'

/** Why the game did not start, or why it closed. A crash says which kind (out of memory, Java, a mod,
 *  graphics, closed before its window), what to do about it, and the lines the game left that show it,
 *  with the crash report and logs one click away and Try again. While Play prepares the game there is
 *  no modal: the progress lives on the instance's Play and in the Activity tray. */
export default function LaunchDialog() {
  const { t, instances, go } = useApp()
  const { launch, dismissLaunch, play } = useLaunch()
  const [copied, setCopied] = useState(false)
  if (launch.status !== 'error' && launch.status !== 'exited') return null
  const inst = instances.find((i) => i.id === launch.instanceId)
  const retry = () => { dismissLaunch(); play(launch.instanceId) }
  const who = inst && (
    <div className="flex items-center gap-3">
      <InstanceIcon inst={inst} size={32} />
      <div className="min-w-0 flex flex-col">
        <span className="font-semibold truncate">{inst.name}</span>
        <span className="text-xs text-muted">{inst.version} · {inst.loaderLabel}{launch.status === 'exited' && launch.exitCode !== 0 ? ` · ${fmt(t.launch.exitCode, { code: launch.exitCode })}` : ''}</span>
      </div>
    </div>
  )

  if (launch.status === 'error') return (
    <Dialog title={t.errors.launchFailed} onClose={dismissLaunch} actions={<>
      <Button variant="idle" onClick={dismissLaunch}>{t.common.close}</Button>
      <Button variant="primary" onClick={retry}>{t.launch.retry}</Button>
    </>}>
      <div className="flex flex-col gap-4">{who}<ErrorMessage message={launch.message} still /></div>
    </Dialog>
  )

  const [title, hint] = t.launch.crash[launch.reason] ?? t.launch.crash.crash
  const copy = () => navigator.clipboard?.writeText(`${title}\n${launch.detail}\n${launch.crashReport || launch.logPath}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => {})
  return (
    <Dialog title={title} width={560} onClose={dismissLaunch} actions={<>
      <Button variant="idle" onClick={() => api.OpenInstanceFolder(launch.instanceId, launch.crashReport ? 'crash-reports' : 'logs')}>{launch.crashReport ? t.launch.openReport : t.launch.openLogs}</Button>
      {(launch.reason === 'memory' || launch.reason === 'java') && <Button variant="idle" onClick={() => { dismissLaunch(); go({ name: 'instance', id: launch.instanceId }) }}>{t.launch.instanceSettings}</Button>}
      <Button variant="primary" onClick={retry}>{t.launch.retry}</Button>
    </>}>
      <div className="flex flex-col gap-4">
        {who}
        <p className="m-0 text-muted">{hint}</p>
        {launch.detail && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">{t.launch.gameSaid}</span>
              <Button variant="ghost" size="sm" onClick={copy}>{copied ? t.launch.copied : t.launch.copy}</Button>
            </div>
            <pre className="m-0 max-h-48 overflow-auto rounded-md bg-panel-2 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all select-text">{launch.detail}</pre>
          </div>
        )}
        <code className="text-[11px] text-muted break-all select-text">{launch.crashReport || launch.logPath}</code>
      </div>
    </Dialog>
  )
}
