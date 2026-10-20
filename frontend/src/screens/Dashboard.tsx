import { useState } from 'react'
import InstanceIcon from '../components/InstanceIcon'
import SegmentedControl from '../ui/SegmentedControl'
import NewTile from '../components/NewTile'
import PlayButton from '../components/PlayButton'
import PixelIcon from '../ui/PixelIcon'
import CardLink from '../ui/CardLink'
import { InstanceTags } from '../components/Tags'
import Button from '../ui/Button'
import { Folder, List, Plus, Tiles } from '../ui/icons'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { ago, hours } from '../utils/format'
import type { Instance } from '../api/types'

type View = 'cards' | 'list'
const readView = (): View => { try { return localStorage.getItem('udeos.dashView') === 'list' ? 'list' : 'cards' } catch { return 'cards' } }

export default function Dashboard() {
  const { t, instances, go } = useApp()
  const [view, setViewState] = useState<View>(readView)
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem('udeos.dashView', v) } catch { /* the choice just is not remembered */ } }
  // Most recently played first (never played after, newest first): the first card is the one to jump back into.
  const sorted = [...instances].sort((a, b) => (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? '') || b.createdAt.localeCompare(a.createdAt))
  const last = sorted[0]?.lastPlayed ? sorted[0] : null
  const rest = last ? sorted.slice(1) : sorted
  return (
    <main className={`px-6 pt-6 pb-6 grid items-start gap-x-5 ${last ? 'grid-cols-[minmax(0,1fr)_clamp(240px,24vw,320px)]' : 'grid-cols-1'}`}>
      <section className="@container min-w-0 flex flex-col gap-4" aria-label={t.dashboard.title}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="m-0 flex items-center gap-3"><PixelIcon name="grass_block_side" size={26} />{t.dashboard.title} <span className="font-mono text-base font-normal text-muted tabular-nums">{instances.length}</span></h2>
          <SegmentedControl aria-label={t.dashboard.title} value={view} onChange={setView}
            options={[{ value: 'cards', label: <Tiles size={15} />, title: t.dashboard.grid }, { value: 'list', label: <List size={15} />, title: t.dashboard.list }]} />
        </div>
        {view === 'cards' ? (
          // Columns follow the room the grid has (beside the panel), not the window: 3 when there is space, 2 down to a tight width, 1 only when two would crush the cards.
          <div className="grid gap-4 grid-cols-1 @min-[360px]:grid-cols-2 @min-[640px]:grid-cols-3">
            {rest.map((inst) => <InstanceCard key={inst.id} inst={inst} />)}
            <NewTile label={t.nav.newInstance} onClick={() => go({ name: 'create' })} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => go({ name: 'create' })}
              className="flex items-center gap-3 h-14 px-4 rounded-lg cursor-pointer border border-dashed border-text/20 bg-transparent text-muted font-[inherit] text-sm font-medium transition-colors duration-150 hover:border-primary hover:text-text">
              <Plus size={15} /> {t.nav.newInstance}
            </button>
            {rest.map((inst) => <InstanceRow key={inst.id} inst={inst} />)}
          </div>
        )}
      </section>
      {last && <LastPlayed inst={last} />}
    </main>
  )
}

const counts = (inst: Instance, t: ReturnType<typeof useApp>['t']) => {
  const d = t.dashboard
  const n = (count: number, one: string, many: string) => count > 0 && `${count} ${count === 1 ? one : many}`
  return [n(inst.counts.mods, d.mod, d.mods), n(inst.counts.resourcePacks, d.pack, d.packs), n(inst.counts.worlds, d.world, d.worlds)].filter(Boolean) as string[]
}

/** The instance played last, out of the grid into a full-height panel on the right, on a faint translucent
 *  accent tint with a hairline, quieter than the solid feature tone but apart from the plain cards: everything worth a glance before jumping back in (when,
 *  how long, what is in it), the screen's one solid Play, and Open / Folder under it. */
function LastPlayed({ inst }: { inst: Instance }) {
  const { t, language, go } = useApp()
  const stats: [string, string | number, string][] = [
    [t.dashboard.lastPlayed, ago(inst.lastPlayed!, language), 'lantern'],
    [t.instance.playTime, `${hours(inst.playTimeSec)} h`, 'campfire'],
    inst.loader === 'Vanilla' ? [t.instance.tabs.screenshots, inst.counts.screenshots, 'spyglass'] : [t.instance.tabs.mods, inst.counts.mods, 'enchanted_book'],
    [t.instance.tabs.resourcepacks, inst.counts.resourcePacks, 'amethyst_shard'],
    [t.instance.tabs.worlds, inst.counts.worlds, 'grass_block_side'],
  ]
  const quiet = 'flex-1 basis-[110px] px-2!'
  return (
    // Sticks to the top of the page scroller; as tall as the window minus main's padding (pt-6 + pb-6).
    <aside className="reveal rounded-lg bg-[color-mix(in_srgb,color-mix(in_srgb,var(--color-primary)_12%,var(--color-panel))_90%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] sticky top-0 h-[calc(100vh-3rem)] min-h-0 flex flex-col gap-4 p-5" aria-label={t.dashboard.lastPlayed}>
      <div className="min-h-0 overflow-y-auto flex flex-col gap-4 -m-2 p-2">
        <div className="flex flex-col items-center gap-2 text-center text-text">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">{t.dashboard.lastPlayed}</span>
          <span className="rounded-2xl p-3 bg-primary/15"><InstanceIcon inst={inst} size={88} /></span>
          <div className="w-full text-2xl font-extrabold leading-[1.15] tracking-tight line-clamp-2 break-words" title={inst.name}>{inst.name}</div>
          <InstanceTags inst={inst} className="flex-wrap justify-center" />
        </div>
        <dl className="m-0 flex flex-col gap-2 text-text">
          {stats.map(([label, value, icon]) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <PixelIcon name={icon} size={16} />
              <dt className="flex-1 min-w-0 truncate">{label}</dt>
              <dd className="m-0 font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <PlayButton inst={inst} size="lg" />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className={quiet} onClick={() => go({ name: 'instance', id: inst.id })}>{t.dashboard.manage}</Button>
          <Button variant="ghost" size="sm" className={quiet} title={t.instance.folder} onClick={() => api.OpenInstanceFolder(inst.id, '')}><Folder /><span>{t.instance.folder}</span></Button>
        </div>
      </div>
    </aside>
  )
}

/** One instance in the grid: icon, name, version/loader
 *  tags, content counts and a quiet Play; the card itself opens the instance.
 *  While it launches, Play gives way to the progress strip. */
function InstanceCard({ inst }: { inst: Instance }) {
  const { t, go } = useApp()
  const open = () => go({ name: 'instance', id: inst.id })
  const meta = counts(inst, t)
  return (
    <div className="reveal panel panel-hover relative flex flex-col gap-4 p-5">
      <CardLink label={`${inst.name}, ${inst.version} ${inst.loaderLabel}`} title={t.dashboard.openInstance} onClick={open} />
      <div className="relative flex items-center gap-3.5 pointer-events-none">
        <span className="flex-none rounded-lg p-1.5 bg-panel-2"><InstanceIcon inst={inst} size={40} /></span>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="font-bold text-base leading-[1.2] truncate" title={inst.name}>{inst.name}</div>
          {/* Wraps under the name when the card is narrow, instead of cutting the loader off. */}
          <InstanceTags inst={inst} short className="flex-wrap" />
        </div>
      </div>
      {/* One line of the same height, so cards with and without counts match. */}
      <div className="relative h-4 truncate text-xs text-muted pointer-events-none">{inst.lastPlayed ? meta.join(' · ') : t.dashboard.neverPlayed}</div>
      <div className="relative flex mt-auto">
        <PlayButton inst={inst} compact quiet />
      </div>
    </div>
  )
}

/** The dense form for players with many instances: one row each, the row opens it. */
function InstanceRow({ inst }: { inst: Instance }) {
  const { t, language, go } = useApp()
  const open = () => go({ name: 'instance', id: inst.id })
  const meta = counts(inst, t)
  return (
    <div className="reveal panel panel-hover relative flex items-center gap-4 px-4 py-2.5 min-h-16">
      <CardLink label={`${inst.name}, ${inst.version} ${inst.loaderLabel}`} title={t.dashboard.openInstance} onClick={open} />
      <span className="relative flex pointer-events-none"><InstanceIcon inst={inst} size={36} /></span>
      <div className="relative flex-1 min-w-0 font-bold text-base truncate pointer-events-none">{inst.name}</div>
      <div className="relative hidden min-[1100px]:block flex-none pointer-events-none"><InstanceTags inst={inst} short /></div>
      <div className="relative hidden min-[1280px]:block flex-none w-44 truncate text-xs text-muted pointer-events-none">{inst.lastPlayed ? meta.join(' · ') || ago(inst.lastPlayed, language) : t.dashboard.neverPlayed}</div>
      <div className="relative flex-none flex w-52">
        <PlayButton inst={inst} compact quiet />
      </div>
    </div>
  )
}
