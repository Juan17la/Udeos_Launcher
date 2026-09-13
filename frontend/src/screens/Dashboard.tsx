import PixelIcon from '../ui/PixelIcon'
import Decor, { DASHBOARD_DECOR } from '../ui/Decor'
import { Play } from '../ui/icons'
import { useApp } from '../state'
import { fmt } from '../i18n/format'
import { ago, hours } from '../ui/time'
import type { Instance } from '../api/types'

export default function Dashboard() {
  const { t, instances, go, play, launch } = useApp()
  const last = instances[0]
  const busy = launch.status === 'preparing'
  const open = (inst: Instance) => go({ name: 'instance', id: inst.id })

  return (
    <main className="page" style={{ padding: '36px 44px 48px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 28, alignItems: 'stretch', overflow: 'hidden' }}>
      <Decor slots={DASHBOARD_DECOR} />

      <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 6, fontSize: 34 }}>{t.dashboard.title}</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 15 }}>{t.dashboard.subtitle}</p>
        </div>
        {instances.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <p style={{ fontSize: 15, marginBottom: 16 }}>{t.dashboard.empty}</p>
            <button type="button" className="btn btn-primary" onClick={() => go({ name: 'create' })}>{t.dashboard.createFirst}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
            {instances.map((inst) => (
              <div key={inst.id} className="card elev-sm sheen" style={{ padding: 20, gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <PixelIcon name={inst.icon} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title" style={{ fontSize: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <span className="tag tag-accent">{inst.version}</span>
                      <span className="tag tag-accent-2">{inst.loaderLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="card-meta" style={{ gap: 14, fontSize: 12 }}>
                  {inst.loader !== 'Vanilla' && <span>{inst.counts.mods} {t.dashboard.mods}</span>}
                  <span>{inst.counts.resourcePacks} {t.dashboard.packs}</span>
                  <span>{inst.counts.worlds} {t.dashboard.worlds}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy || inst.running} onClick={() => play(inst.id)}>
                    <Play /> {inst.running ? t.common.running : t.common.play}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => open(inst)}>{t.dashboard.manage}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {last && (
        <aside className="card elev-md panel static" style={{ position: 'relative', zIndex: 1, padding: '26px 22px', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <span className="card-kicker">{t.dashboard.lastPlayed}</span>
          <PixelIcon name={last.icon} size={120} />
          <h3 style={{ margin: 0, fontSize: 26, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{last.name}</h3>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <span className="tag tag-accent">{last.version}</span>
            <span className="tag tag-accent-2">{last.loaderLabel}</span>
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
            {last.lastPlayed ? fmt(t.dashboard.playedAgo, { when: ago(last.lastPlayed, t), hours: hours(last.playTimeSec) }) : t.dashboard.neverPlayed}
          </p>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary btn-block" style={{ height: 48, fontSize: 18 }} disabled={busy || last.running} onClick={() => play(last.id)}>
            <Play size={16} /> {last.running ? t.common.running : t.common.play}
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => open(last)}>{t.dashboard.openInstance}</button>
        </aside>
      )}
    </main>
  )
}
