import { useEffect, useState } from 'react'
import Dialog, { ConfirmDialog } from '../ui/Dialog'
import Button from '../ui/Button'
import { Plus, X } from '../ui/icons'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { SkinFace } from './SkinView'

/** The launcher's profiles: each one is a player name with its own
 *  instances, skins, language and theme. Click one to switch (the dashboard
 *  reloads with its things), add a new one (the setup screen asks for its
 *  nickname, language and theme; it starts with no instances or skins), or remove
 *  one — its instances and skins move to the profile that stays active. */
export default function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { t, profile, nickname, setNickname, removeNickname, skins, go } = useApp()
  const faceOf = (n: string) => skins?.faces[n]
  const nicknames = profile?.nicknames ?? []
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => { api.InstanceCounts().then(setCounts).catch(() => {}) }, [profile])

  const switchTo = (n: string) => { if (n !== nickname) setNickname(n); onClose() }
  // A new profile starts on the setup screen: nickname, language and theme.
  const add = () => { onClose(); go({ name: 'login', adding: true }) }
  // Who inherits the removed profile's instances: the active one, or the next if the active goes.
  const heir = removing === nickname ? nicknames.find((n) => n !== removing) : nickname

  return (
    <Dialog title={t.profiles.title} width={480} onClose={onClose} actions={<Button variant="idle" onClick={onClose}>{t.common.close}</Button>}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-xs text-muted">{t.profiles.hint}</p>
        {/* No shadow on the rows: the scroll box would clip it into a flat
           rectangle wider than the rounded row. */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {nicknames.map((n) => {
            const active = n === nickname
            return (
              <div key={n} className={`flex items-center gap-2 rounded-md transition-colors ${active ? 'bg-primary text-on-primary has-[>button:first-child:focus-visible]:outline-on-primary' : 'bg-idle hover:bg-idle-hover has-[>button:first-child:focus-visible]:outline-primary'} has-[>button:first-child:focus-visible]:outline-2 has-[>button:first-child:focus-visible]:-outline-offset-2`}>
                <button type="button" onClick={() => switchTo(n)} aria-current={active || undefined}
                  className="flex-1 min-w-0 flex items-center gap-4 px-4 py-3 text-left bg-transparent border-0 text-inherit cursor-pointer rounded-md focus-visible:outline-none!">
                  {/* The focus ring is drawn on the whole row (see its has-[…] classes), not on this half of it. */}
                  <SkinFace png={faceOf(n)} size={24} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="font-bold truncate">{n}</span>
                    <span className={`text-xs ${active ? 'text-on-primary/80' : 'text-muted'}`}>{fmt(t.profiles.instances, { n: counts[n] ?? 0 })}</span>
                  </span>
                  {active && <span className="text-xs font-bold">{t.profiles.active}</span>}
                </button>
                {nicknames.length > 1 && (
                  <Button variant="ghost" size="sm" square className="mr-2 text-inherit !shadow-none hover:!shadow-none hover:bg-idle/40" title={t.nav.removeProfile} onClick={() => setRemoving(n)}><X size={12} /></Button>
                )}
              </div>
            )
          })}
        </div>
        <Button variant="primary" block onClick={add}><Plus size={14} /> {t.nav.addProfile}</Button>
      </div>
      {removing && (
        <ConfirmDialog danger title={fmt(t.profiles.removeTitle, { name: removing })}
          body={fmt(t.profiles.removeBody, { n: counts[removing] ?? 0, name: heir ?? '' })} confirmLabel={t.nav.removeProfile}
          onConfirm={() => { removeNickname(removing); setRemoving(null) }} onClose={() => setRemoving(null)} />
      )}
    </Dialog>
  )
}
