import PixelIcon from '../ui/PixelIcon'
import Decor, { DASHBOARD_DECOR } from '../ui/Decor'
import { Play } from '../ui/icons'
import { useApp, useLaunch } from '../state'
import { fmt } from '../i18n/format'
import { ago, hours } from '../ui/time'
import type { Instance } from '../api/types'

const btnBase = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-extrabold tracking-[-0.01em] text-sm leading-[1.2] rounded-full border px-4 py-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'
const btnPrimary = 'bg-mc-primary border-mc-primary-border text-mc-primary-text shadow-[inset_0_-2px_0_var(--mc-primary-bottom)] hover:bg-mc-primary-hover active:bg-mc-primary-active active:shadow-none'
const btnSecondary = 'bg-mc-btn border-mc-btn-border text-mc-btn-text shadow-[inset_0_-2px_0_var(--mc-btn-bottom)] hover:bg-mc-btn-hover active:bg-mc-btn-active active:shadow-none'
const btnGhost = 'text-accent border-transparent px-1.5 bg-transparent hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]'
const cardBase = 'flex flex-col gap-2 rounded-lg bg-surface'
const cardTitle = 'font-heading font-extrabold leading-[1.2]'
const cardMeta = 'flex items-center text-[11px] text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]'
const cardKicker = 'text-[10px] tracking-[0.12em] uppercase text-accent'
const tagAccent = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap bg-accent-100 text-accent-800'
const tagAccent2 = 'inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-full whitespace-nowrap bg-accent-2-100 text-accent-2-800'
const textMuted = 'text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]'

export default function Dashboard() {
  const { t, instances, go } = useApp()
  const { play, launch } = useLaunch()
  const last = instances[0]
  const busy = launch.status === 'preparing'
  const open = (inst: Instance) => go({ name: 'instance', id: inst.id })

  return (
    <main className="flex-1 relative overflow-hidden grid grid-cols-[minmax(0,1fr)_330px] items-stretch gap-7 pt-9 px-11 pb-12">
      <Decor slots={DASHBOARD_DECOR} />

      <div className="relative z-1 min-w-0">
        <div className="mb-6">
          <h2 className="mb-1.5 text-[34px]">{t.dashboard.title}</h2>
          <p className={`${textMuted} m-0 text-[15px]`}>{t.dashboard.subtitle}</p>
        </div>
        {instances.length === 0 ? (
          <div className={`${textMuted} text-center px-5 pt-15 pb-10`}>
            <p className="text-[15px] mb-4">{t.dashboard.empty}</p>
            <button type="button" className={`${btnBase} ${btnPrimary}`} onClick={() => go({ name: 'create' })}>{t.dashboard.createFirst}</button>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
            {instances.map((inst) => (
              <div key={inst.id} className={`${cardBase} p-5 gap-3.5 shadow-sheen transition-transform duration-150 ease hover:-translate-y-0.5`}>
                <div className="flex items-center gap-3.5">
                  <PixelIcon name={inst.icon} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className={`${cardTitle} text-[19px] whitespace-nowrap overflow-hidden text-ellipsis`}>{inst.name}</div>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className={tagAccent}>{inst.version}</span>
                      <span className={tagAccent2}>{inst.loaderLabel}</span>
                    </div>
                  </div>
                </div>
                <div className={`${cardMeta} gap-3.5 text-xs`}>
                  {inst.loader !== 'Vanilla' && <span>{inst.counts.mods} {t.dashboard.mods}</span>}
                  <span>{inst.counts.resourcePacks} {t.dashboard.packs}</span>
                  <span>{inst.counts.worlds} {t.dashboard.worlds}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <button type="button" className={`${btnBase} ${btnPrimary} flex-1`} disabled={busy || inst.running} onClick={() => play(inst.id)}>
                    <Play /> {inst.running ? t.common.running : t.common.play}
                  </button>
                  <button type="button" className={`${btnBase} ${btnSecondary} flex-1`} onClick={() => open(inst)}>{t.dashboard.manage}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {last && (
        <aside className={`${cardBase} relative z-1 items-center text-center gap-3.5 py-6.5 px-5.5 bg-panel-tint shadow-sheen`}>
          <span className={cardKicker}>{t.dashboard.lastPlayed}</span>
          <PixelIcon name={last.icon} size={120} />
          <h3 className="m-0 text-[26px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{last.name}</h3>
          <div className="flex gap-1.5 justify-center">
            <span className={tagAccent}>{last.version}</span>
            <span className={tagAccent2}>{last.loaderLabel}</span>
          </div>
          <p className={`${textMuted} m-0 text-[13px]`}>
            {last.lastPlayed ? fmt(t.dashboard.playedAgo, { when: ago(last.lastPlayed, t), hours: hours(last.playTimeSec) }) : t.dashboard.neverPlayed}
          </p>
          <div className="flex-1" />
          <button type="button" className={`${btnBase} ${btnPrimary} w-full mt-2 h-12 text-lg`} disabled={busy || last.running} onClick={() => play(last.id)}>
            <Play size={16} /> {last.running ? t.common.running : t.common.play}
          </button>
          <button type="button" className={`${btnBase} ${btnGhost} text-[13px]`} onClick={() => open(last)}>{t.dashboard.openInstance}</button>
        </aside>
      )}
    </main>
  )
}
