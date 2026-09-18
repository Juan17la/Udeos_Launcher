import PixelIcon from '../ui/PixelIcon'
import Decor, { DASHBOARD_DECOR } from '../ui/Decor'
import Button from '../ui/Button'
import PlayButton from '../components/PlayButton'
import { useApp } from '../state'
import { fmt } from '../i18n/format'
import { ago, hours } from '../utils/format'
import type { Instance } from '../api/types'

export default function Dashboard() {
  const { t, language, instances, go } = useApp()
  const last = instances[0]

  return (
    <main className="flex-1 relative overflow-clip grid grid-cols-[minmax(0,1fr)_330px] items-start gap-8 pt-8 px-10 pb-12">
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
            {instances.map((inst) => <InstanceCard key={inst.id} inst={inst} />)}
          </div>
        )}
      </div>

      {last && (
        <div className="panel relative z-1 flex flex-col items-center gap-4 text-center p-6 sticky top-24 h-[calc(100vh-9.5rem)] min-h-fit">
          <span className="text-[11px] tracking-[0.12em] uppercase text-muted">{t.dashboard.lastPlayed}</span>
          <PixelIcon name={last.icon} size={120} />
          <h3 className="m-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{last.name}</h3>
          <div className="flex gap-2 justify-center">
            <span className="tag bg-green-soft">{last.version}</span>
            <span className="tag bg-gold-soft">{last.loaderLabel}</span>
          </div>
          <p className="m-0 text-[13px] text-muted">
            {last.lastPlayed ? fmt(t.dashboard.playedAgo, { when: ago(last.lastPlayed, language), hours: hours(last.playTimeSec) }) : t.dashboard.neverPlayed}
          </p>
          <div className="flex-1" />
          <PlayButton inst={last} size="lg" />
          <Button variant="idle" block onClick={() => go({ name: 'instance', id: last.id })}>{t.dashboard.openInstance}</Button>
        </div>
      )}
    </main>
  )
}

/** One instance in the grid: icon, name, version/loader tags, content counts, Play and Manage. */
function InstanceCard({ inst }: { inst: Instance }) {
  const { t, go } = useApp()
  return (
    <div className="panel panel-hover flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <PixelIcon name={inst.icon} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="font-bold text-lg leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis">{inst.name}</div>
          <div className="flex gap-2">
            <span className="tag bg-green-soft">{inst.version}</span>
            <span className="tag bg-gold-soft">{inst.loaderLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted">
        {inst.loader !== 'Vanilla' && <span>{inst.counts.mods} {t.dashboard.mods}</span>}
        <span>{inst.counts.resourcePacks} {t.dashboard.packs}</span>
        <span>{inst.counts.worlds} {t.dashboard.worlds}</span>
      </div>
      <div className="flex gap-4">
        <PlayButton inst={inst} className="flex-1" />
        <Button variant="idle" className="flex-1" onClick={() => go({ name: 'instance', id: inst.id })}>{t.dashboard.manage}</Button>
      </div>
    </div>
  )
}
