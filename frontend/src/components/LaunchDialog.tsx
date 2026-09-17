import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { api } from '../api/bridge'
import Dialog from '../ui/molecules/Dialog'
import Button from '../ui/atoms/Button'

/** Why the game did not start, or why it closed: a short headline with the
 *  message / exit code and log path as detail. Progress while preparing is
 *  a notification (see Notifications) and a loading ring on the Play button. */
export default function LaunchDialog() {
  const { t } = useApp()
  const { launch, dismissLaunch } = useLaunch()
  if (launch.status !== 'error' && launch.status !== 'exited') return null
  const error = launch.status === 'error'
  return (
    <Dialog title={error ? t.errors.launchFailed : t.errors.gameCrashed} onClose={dismissLaunch} actions={<>
      {launch.status === 'exited' && <Button variant="idle" onClick={() => api.OpenInstanceFolder(launch.instanceId, 'logs')}>{t.launch.openLogs}</Button>}
      <Button variant="primary" onClick={dismissLaunch}>{t.common.gotIt}</Button>
    </>}>
      {error ? (
        <p className="m-0 text-xs text-muted break-words">{launch.message}</p>
      ) : (
        <div className="flex flex-col gap-2 text-xs text-muted">
          <span>{fmt(t.launch.exitBody, { code: launch.exitCode })}</span>
          <code className="break-all select-text">{launch.logPath}</code>
        </div>
      )}
    </Dialog>
  )
}
