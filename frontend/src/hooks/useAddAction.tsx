import { ReactNode, useState } from 'react'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import StatusMessage from '../ui/StatusMessage'
import AddInstancePickerDialog, { SearchFilters } from '../components/AddInstancePickerDialog'
import { useApp, useContent } from '../state'
import { fmt } from '../i18n/format'
import type { SearchResult } from '../api/types'

/** The Add action every result card and the Details page share. With an
 *  instance in context (the player came from that instance's page) Add
 *  installs straight away; otherwise it opens the picker, or — with no
 *  instances at all — a dialog pointing at Create instance. A modpack
 *  always gets the picker: it can become a new instance (built from the
 *  Addons page's version/loader `filters`). Render `dialog` once in the
 *  calling screen. */
export function useAddAction(instanceId?: string, filters?: SearchFilters): { add: (result: SearchResult) => void; dialog: ReactNode } {
  const { t, instances, go } = useApp()
  const { enqueue } = useContent()
  const [picking, setPicking] = useState<SearchResult | null>(null)
  const [noInstances, setNoInstances] = useState<SearchResult | null>(null)
  const inst = instanceId ? instances.find((i) => i.id === instanceId) : undefined

  const add = (result: SearchResult) => {
    if (inst) enqueue(inst.id, result)
    else if (instances.length === 0 && result.projectType !== 'modpack') setNoInstances(result)
    else setPicking(result)
  }

  const dialog = (
    <>
      {picking && <AddInstancePickerDialog result={picking} filters={filters} onClose={() => setPicking(null)} />}
      {noInstances && (
        <Dialog title={t.content.noInstancesTitle} onClose={() => setNoInstances(null)} actions={<>
          <Button variant="idle" onClick={() => setNoInstances(null)}>{t.common.close}</Button>
          <Button variant="primary" onClick={() => { setNoInstances(null); go({ name: 'create' }) }}>{t.search.createInstance}</Button>
        </>}>
          <StatusMessage kind="error" headline={t.content.noInstancesTitle} detail={fmt(t.content.noInstancesBody, { title: noInstances.title })} />
        </Dialog>
      )}
    </>
  )

  return { add, dialog }
}
