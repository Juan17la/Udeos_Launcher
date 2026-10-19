import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { api } from '../api/bridge'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import ErrorMessage from './ErrorMessage'

/** Why the game did not start, or why it closed. While Play prepares the game
 *  there is no modal: the progress lives in place (components/LaunchStrip on the
 *  instance) and in the Activity tray. */
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
        <ErrorMessage message={launch.message} />
      ) : (
        <div className="flex flex-col gap-2 text-xs text-muted">
          <span>{fmt(t.launch.exitBody, { code: launch.exitCode })}</span>
          <code className="break-all select-text">{launch.logPath}</code>
        </div>
      )}
    </Dialog>
  )
}
