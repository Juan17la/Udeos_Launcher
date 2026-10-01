import InstanceIcon from '../components/InstanceIcon'
import Decor, { DASHBOARD_DECOR } from '../ui/Decor'
import Button from '../ui/Button'
import NewTile from '../components/NewTile'
import PlayButton from '../components/PlayButton'
import { InstanceTags } from '../components/Tags'
import { useApp } from '../state'
import { ago, hours, revealDelay } from '../utils/format'
import { fmt } from '../i18n/format'
import type { Instance } from '../api/types'

export default function Dashboard() {
  const { t, instances, go } = useApp()
  // The instance played most recently, with the version it runs: its own panel on the left.
  const last = instances.reduce<Instance | null>((best, i) => (i.lastPlayed && (!best || i.lastPlayed > best.lastPlayed!) ? i : best), null)
  return (
    <main className={`flex-1 relative overflow-clip grid items-start gap-x-8 gap-y-6 pt-8 px-10 pb-12 ${last ? 'grid-cols-[minmax(320px,380px)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
      <Decor slots={DASHBOARD_DECOR} />
      {last && <LastPlayed inst={last} />}
      <div className="relative z-1 min-w-0 flex flex-col gap-6">
        <h2 className="m-0">{t.dashboard.title}</h2>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))' }}>
          <NewTile label={t.nav.newInstance} onClick={() => go({ name: 'create' })} />
          {instances.map((inst, i) => <InstanceCard key={inst.id} inst={inst} index={i} />)}
        </div>
      </div>
    </main>
  )
}

/** The last instance played: icon, name, the version and loader it runs, when, and Play. */
function LastPlayed({ inst }: { inst: Instance }) {
  const { t, language, go } = useApp()
  return (
    <aside className="panel relative z-1 sticky top-8 h-[calc(100vh-var(--nav-h)-5rem)] flex flex-col items-center gap-6 p-8 text-center" aria-label={t.dashboard.lastPlayed}>
      <h6 className="m-0 text-muted">{t.dashboard.lastPlayed}</h6>
      <InstanceIcon inst={inst} size={112} />
      <div className="w-full min-w-0 font-bold text-2xl leading-[1.2] truncate" title={inst.name}>{inst.name}</div>
      <InstanceTags inst={inst} className="justify-center" />
      <p className="m-0 text-sm text-muted">{fmt(t.dashboard.playedAgo, { when: ago(inst.lastPlayed!, language), hours: hours(inst.playTimeSec) })}</p>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <PlayButton inst={inst} size="lg" />
        <Button variant="idle" onClick={() => go({ name: 'instance', id: inst.id })}>{t.dashboard.manage}</Button>
      </div>
    </aside>
  )
}

/** One instance in the grid: icon, name, version/loader tags, content counts,
 *  Play and Manage. The whole card opens the instance, like Manage. */
function InstanceCard({ inst, index }: { inst: Instance; index: number }) {
  const { t, go } = useApp()
  const open = () => go({ name: 'instance', id: inst.id })
  return (
    <div role="link" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open() }}
      className="reveal panel panel-hover flex flex-col gap-4 p-5 cursor-pointer" style={revealDelay(index)}>
      <div className="flex items-center gap-4">
        <InstanceIcon inst={inst} size={44} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="font-bold text-lg leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis">{inst.name}</div>
          <InstanceTags inst={inst} />
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted">
        {inst.counts.mods > 0 && <span>{inst.counts.mods} {t.dashboard.mods}</span>}
        {inst.counts.resourcePacks > 0 && <span>{inst.counts.resourcePacks} {t.dashboard.packs}</span>}
        {inst.counts.worlds > 0 && <span>{inst.counts.worlds} {t.dashboard.worlds}</span>}
        {!inst.lastPlayed && <span>{t.dashboard.neverPlayed}</span>}
      </div>
      {/* Play must not also open the card. */}
      <div className="flex gap-4 mt-auto" onClick={(e) => e.stopPropagation()}>
        <PlayButton inst={inst} className="flex-1" />
        <Button variant="idle" className="flex-1" onClick={open}>{t.dashboard.manage}</Button>
      </div>
    </div>
  )
}
