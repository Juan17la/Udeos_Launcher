import PixelIcon from '../ui/PixelIcon'
import Decor, { DASHBOARD_DECOR } from '../ui/Decor'
import { Play } from '../ui/icons'
import Button from '../ui/atoms/Button'
import Tag from '../ui/atoms/Tag'
import { Panel } from '../ui/atoms/Surface'
import Card from '../ui/molecules/Card'
import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { ago, hours } from '../ui/time'
import type { Instance } from '../api/types'

export default function Dashboard() {
  const { t, instances, go } = useApp()
  const { play, launch } = useLaunch()
  const last = instances[0]
  const busy = launch.status === 'preparing'
  const preparing = (id: string) => launch.status === 'preparing' && launch.instanceId === id
  const open = (inst: Instance) => go({ name: 'instance', id: inst.id })

  return (
    <main className="flex-1 relative overflow-hidden grid grid-cols-[minmax(0,1fr)_330px] items-stretch gap-8 pt-8 px-10 pb-12">
      <Decor slots={DASHBOARD_DECOR} />

      <div className="relative z-1 min-w-0 flex flex-col gap-6">
        <div>
          <h2 className="mb-2">{t.dashboard.title}</h2>
          <p className="m-0 text-muted">{t.dashboard.subtitle}</p>
        </div>
        {instances.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-muted text-center px-5 pt-12 pb-10">
            <p className="m-0">{t.dashboard.empty}</p>
            <Button variant="primary" onClick={() => go({ name: 'create' })}>{t.dashboard.createFirst}</Button>
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
            {instances.map((inst) => (
              <Card key={inst.id} hover>
                <div className="flex items-center gap-4">
                  <PixelIcon name={inst.icon} size={44} />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="font-bold text-lg leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis">{inst.name}</div>
                    <div className="flex gap-2">
                      <Tag tone="green">{inst.version}</Tag>
                      <Tag tone="gold">{inst.loaderLabel}</Tag>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  {inst.loader !== 'Vanilla' && <span>{inst.counts.mods} {t.dashboard.mods}</span>}
                  <span>{inst.counts.resourcePacks} {t.dashboard.packs}</span>
                  <span>{inst.counts.worlds} {t.dashboard.worlds}</span>
                </div>
                <div className="flex gap-4">
                  <Button variant="primary" className="flex-1" loading={preparing(inst.id)} disabled={busy || inst.running} onClick={() => play(inst.id)}>
                    <Play /> {inst.running ? t.common.running : t.common.play}
                  </Button>
                  <Button variant="idle" className="flex-1" onClick={() => open(inst)}>{t.dashboard.manage}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {last && (
        <Panel className="relative z-1 items-center text-center p-6">
          <span className="text-[11px] tracking-[0.12em] uppercase text-muted">{t.dashboard.lastPlayed}</span>
          <PixelIcon name={last.icon} size={120} />
          <h3 className="m-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{last.name}</h3>
          <div className="flex gap-2 justify-center">
            <Tag tone="green">{last.version}</Tag>
            <Tag tone="gold">{last.loaderLabel}</Tag>
          </div>
          <p className="m-0 text-[13px] text-muted">
            {last.lastPlayed ? fmt(t.dashboard.playedAgo, { when: ago(last.lastPlayed, t), hours: hours(last.playTimeSec) }) : t.dashboard.neverPlayed}
          </p>
          <div className="flex-1" />
          <Button variant="primary" size="lg" block loading={preparing(last.id)} disabled={busy || last.running} onClick={() => play(last.id)}>
            <Play size={16} /> {last.running ? t.common.running : t.common.play}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => open(last)}>{t.dashboard.openInstance}</Button>
        </Panel>
      )}
    </main>
  )
}
