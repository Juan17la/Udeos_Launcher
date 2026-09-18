import { useEffect, useState } from 'react'
import PixelIcon from '../../ui/PixelIcon'
import { Folder, Play } from '../../ui/icons'
import Button from '../../ui/Button'
import Tag from '../../ui/Tag'
import { Panel } from '../../ui/Panel'
import { ConfirmDialog } from '../../ui/Dialog'
import SegmentedControl from '../../ui/SegmentedControl'
import { useApp, useLaunch } from '../../state'
import { api } from '../../api/bridge'
import FilesTab from './FilesTab'
import WorldsTab from './WorldsTab'
import ScreenshotsTab from './ScreenshotsTab'

type Tab = 'mods' | 'resourcepacks' | 'shaders' | 'worlds' | 'screenshots'

export default function InstancePage({ id }: { id: string }) {
  const { t, instances, refreshInstances, go } = useApp()
  const { play, launch } = useLaunch()
  const inst = instances.find((i) => i.id === id)
  const vanilla = !inst || inst.loader === 'Vanilla'
  const tabs: Tab[] = vanilla ? ['resourcepacks', 'worlds', 'screenshots'] : ['mods', 'resourcepacks', 'shaders', 'worlds', 'screenshots']
  const [tab, setTab] = useState<Tab>(tabs[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const busy = launch.status === 'preparing'
  const preparing = busy && launch.instanceId === id

  useEffect(() => { if (!inst) go({ name: 'dashboard' }) }, [inst, go])
  if (!inst) return null

  const remove = async () => {
    await api.DeleteInstance(inst.id)
    await refreshInstances()
    go({ name: 'dashboard' })
  }

  return (
    <main className="flex-1 grid items-start gap-8 pt-8 px-10 pb-12" style={{ gridTemplateColumns: '0.4fr minmax(0,0.6fr)' }}>
      <Panel className="flex flex-col items-center justify-between gap-4 text-center sticky top-6 p-6 h-full">

        <div className="flex flex-col item-center justify-center gap-4 flex-1">
          <PixelIcon className='flex flex-col flex-1 justify-center items-center' name={inst.icon} size={96} />
          <div className="max-w-full flex flex-col gap-3">
            <h1 className="m-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{inst.name}</h1>
            <div className="flex gap-2 justify-center">
              <Tag tone="green">{inst.version}</Tag>
              <Tag tone="gold">{inst.loaderLabel}</Tag>
            </div>
          </div>
          <h6 className="m-0 text-xs text-muted">{inst.installed ? t.instance.installed : t.instance.notInstalled}</h6>
        </div>

        <div className="flex flex-col w-full gap-4 min-h-0">
          <Button className='min-h-0 w-full' variant="primary" size="md" block loading={preparing} disabled={busy || inst.running} onClick={() => play(inst.id)}>
            <Play size={16} /> {inst.running ? t.common.running : t.common.play}
          </Button>

          <Button className='min-h-0 w-full' variant="idle" size="md" block onClick={() => api.OpenInstanceFolder(inst.id, '')}>
            <Folder /> {t.instance.openFolder}
          </Button>

          <Button className='min-h-0 w-full' variant="danger" size="md" block disabled={inst.running} onClick={() => setConfirmDelete(true)}>{t.instance.deleteInstance}</Button>
        </div>
      </Panel>

      <div className="min-w-0 flex flex-col gap-6">
        <SegmentedControl options={tabs.map((k) => ({ value: k, label: t.instance.tabs[k] }))} value={tab} onChange={setTab} />
        {tab === 'worlds' && <WorldsTab id={inst.id} />}
        {tab === 'screenshots' && <ScreenshotsTab id={inst.id} />}
        {(tab === 'mods' || tab === 'shaders' || tab === 'resourcepacks') && <FilesTab id={inst.id} kind={tab} />}
      </div>

      {confirmDelete && (
        <ConfirmDialog danger title={t.instance.confirmDeleteTitle} body={t.instance.confirmDelete} confirmLabel={t.common.delete}
          onConfirm={remove} onClose={() => setConfirmDelete(false)} />
      )}
    </main>
  )
}
