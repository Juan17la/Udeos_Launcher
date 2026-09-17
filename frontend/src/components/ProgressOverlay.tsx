import Dialog from './Dialog'
import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { bytes } from '../ui/time'
import { api } from '../api/bridge'

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const textDim = 'text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'

/** Shows download progress while Play prepares a version, and launch errors. */
export default function ProgressOverlay() {
  const { t, instances } = useApp()
  const { launch, dismissLaunch } = useLaunch()
  if (launch.status === 'idle') return null
  const inst = instances.find((i) => i.id === launch.instanceId)
  const name = inst?.name ?? ''

  if (launch.status === 'preparing') {
    const p = launch.progress
    const phase = (p?.phase ?? 'version') as keyof typeof t.launch.phases
    const label = t.launch.phases[phase] ?? phase
    const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
    return (
      <div className="fixed inset-0 grid place-items-center z-9000 p-4 bg-[color-mix(in_srgb,var(--color-neutral-900)_50%,transparent)]">
        <div className="relative z-9001 flex flex-col gap-3 p-4 rounded-lg bg-surface shadow-lg animate-[dialog-fade_0.12s_ease-out]" role="dialog" aria-modal="true">
          <div className="font-heading font-extrabold text-xl">{fmt(t.launch.preparing, { name })}</div>
          <div className="text-sm opacity-85 flex flex-col gap-2.5">
            <div className="flex justify-between text-[13px]">
              <span>{phase === 'done' ? t.launch.starting : label}</span>
              {p && p.total > 0 && <span className={textDim}>{p.done}/{p.total}{p.totalBytes > 0 ? ` · ${bytes(p.bytes)}` : ''}</span>}
            </div>
            <div className="h-2.5 rounded-full bg-[color-mix(in_srgb,var(--color-text)_12%,transparent)] overflow-hidden">
              <div className="w-full h-full bg-accent rounded-full origin-left transition-transform duration-200 ease" style={{ transform: `scaleX(${phase === 'done' ? 1 : pct / 100})` }} />
            </div>
            {p?.current && <div className={`${textDim} text-[11px] whitespace-nowrap overflow-hidden text-ellipsis`}>{p.current}</div>}
            <p className={`${textMuted} mt-1.5 text-xs`}>{phase === 'loader' && inst?.loader === 'Forge' ? t.launch.loaderTakesAWhile : t.launch.firstTime}</p>
          </div>
        </div>
      </div>
    )
  }

  const title = launch.status === 'error' ? t.launch.errorTitle : t.launch.exitedTitle
  return (
    <Dialog title={title} onClose={dismissLaunch} actions={<>
      {launch.status === 'exited' && <button type="button" className={`${btnBase} ${btnSecondary}`} onClick={() => api.OpenInstanceFolder(launch.instanceId, 'logs')}>{t.launch.openLogs}</button>}
      <button type="button" className={`${btnBase} ${btnPrimary}`} onClick={dismissLaunch}>{t.common.gotIt}</button>
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
