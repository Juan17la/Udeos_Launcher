import Dialog from './Dialog'
import { useApp } from '../state'
import { fmt } from '../i18n/format'
import { bytes } from '../ui/time'
import { api } from '../api/bridge'

/** Shows download progress while Play prepares a version, and launch errors. */
export default function ProgressOverlay() {
  const { t, launch, instances, dismissLaunch } = useApp()
  if (launch.status === 'idle') return null
  const inst = instances.find((i) => i.id === launch.instanceId)
  const name = inst?.name ?? ''

  if (launch.status === 'preparing') {
    const p = launch.progress
    const phase = (p?.phase ?? 'version') as keyof typeof t.launch.phases
    const label = t.launch.phases[phase] ?? phase
    const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
    return (
      <div className="dialog-backdrop">
        <div className="dialog" role="dialog" aria-modal="true">
          <div className="dialog-title">{fmt(t.launch.preparing, { name })}</div>
          <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{phase === 'done' ? t.launch.starting : label}</span>
              {p && p.total > 0 && <span className="text-dim">{p.done}/{p.total}{p.totalBytes > 0 ? ` · ${bytes(p.bytes)}` : ''}</span>}
            </div>
            <div className="progress"><div style={{ width: `${phase === 'done' ? 100 : pct}%` }} /></div>
            {p?.current && <div className="text-dim" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.current}</div>}
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{t.launch.firstTime}</p>
          </div>
        </div>
      </div>
    )
  }

  const title = launch.status === 'error' ? t.launch.errorTitle : t.launch.exitedTitle
  return (
    <Dialog title={title} onClose={dismissLaunch} actions={<>
      {launch.status === 'exited' && <button type="button" className="btn btn-secondary" onClick={() => api.OpenInstanceFolder(launch.instanceId, 'logs')}>{t.launch.openLogs}</button>}
      <button type="button" className="btn btn-primary" onClick={dismissLaunch}>{t.common.gotIt}</button>
    </>}>
      {launch.status === 'error' ? (
        <p style={{ margin: 0, wordBreak: 'break-word' }}>{launch.message}</p>
      ) : (
        <>
          <p style={{ margin: '0 0 6px' }}>{fmt(t.launch.exitBody, { code: launch.exitCode })}</p>
          <code style={{ fontSize: 12, wordBreak: 'break-all', userSelect: 'text' }}>{launch.logPath}</code>
        </>
      )}
    </Dialog>
  )
}
