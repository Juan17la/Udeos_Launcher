import { useCallback, useEffect, useState } from 'react'
import SkinView from '../components/SkinView'
import Button from '../ui/Button'
import Dialog, { ConfirmDialog } from '../ui/Dialog'
import DropZone from '../ui/DropZone'
import { Checkbox, Input, Label } from '../ui/Field'
import SegmentedControl from '../ui/SegmentedControl'
import { Check, Folder, Pencil, X } from '../ui/icons'
import { useApp } from '../state'
import { api, on } from '../api/bridge'
import { fmt } from '../i18n/format'
import { messageOf } from '../utils/errors'
import { Feedback } from './instance/TabParts'
import type { Skin, SkinFile, SkinModel } from '../api/types'

/** The Skins page, sized to the window (only the library scrolls, inside
 *  its box): what the active profile wears on a big turning model, a drop
 *  zone for skins downloaded from the web (the main way in), and the
 *  library, where a click on a card wears it. Steve, the default, is the
 *  first card; New skin opens the editor. */
export default function Skins() {
  const { t, nickname, skins, refreshSkins, go } = useApp()
  const s = t.skins
  const [file, setFile] = useState<SkinFile | null>(null)
  const [deleting, setDeleting] = useState<Skin | null>(null)
  const [error, setError] = useState<string | null>(null)
  const worn = skins?.skins.find((k) => k.id === skins.equipped[nickname])

  const act = async (fn: () => Promise<unknown>) => {
    setError(null)
    try { await fn(); await refreshSkins() } catch (e) { setError(messageOf(e)) }
  }
  const read = useCallback(async (next: () => Promise<SkinFile>) => {
    setError(null)
    try { const f = await next(); if (f.png) setFile(f) } catch (e) { setError(messageOf(e)) }
  }, [])
  // Native drops arrive from Go with real paths; the first file is the one read.
  useEffect(() => on('files:dropped', (paths) => { read(() => api.ReadSkinFile(paths[0])) }), [read])

  const wornBy = skins ? Object.values(skins.equipped).filter((id) => id === deleting?.id).length : 0

  return (
    <main className="h-[calc(100vh-4.5rem)] overflow-hidden grid grid-cols-[minmax(340px,38%)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-8 gap-y-5 pt-6 px-10 pb-8">
      <div className="col-span-2">
        <h2 className="mb-1">{s.title}</h2>
        <p className="m-0 text-muted">{s.subtitle}</p>
      </div>

      {/* What the active profile wears: the model takes whatever height is left. */}
      <aside className="panel min-h-0 flex flex-col gap-4 p-6">
        <div className="flex justify-between gap-4 text-xs text-muted">
          <span>{s.wearing}</span>
          <span>{s.dragToTurn}</span>
        </div>
        <div className="relative flex-1 min-h-40 rounded-md bg-panel-2 shadow-neu-inset">
          <SkinView key={worn?.id ?? 'default'} png={worn?.png} model={worn?.model ?? 'classic'} spin />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="m-0 flex-1 truncate" title={worn?.name}>{worn?.name ?? 'Steve'}</h3>
          {!worn && <span className="tag bg-green-soft">{s.default}</span>}
          <span className="tag bg-tag-gray">{s.models[worn?.model ?? 'classic']}</span>
        </div>
        <p className="m-0 -mt-2 text-xs text-muted">{s.where}</p>
        {worn && <Button variant="idle" onClick={() => go({ name: 'skinEditor', id: worn.id })}><Pencil /> {s.edit}</Button>}
      </aside>

      <section className="min-h-0 flex flex-col gap-4">
        <DropZone prominent text={s.drop} hint={s.dropHint}>
          <Button variant="primary" onClick={() => read(api.PickSkinFile)}><Folder /> {s.browse}</Button>
        </DropZone>
        <Feedback error={error} note={null} onClearNote={() => {}} />
        <div className="flex items-center justify-between gap-4">
          <h4 className="m-0">{s.library} <span className="text-sm text-muted">{(skins?.skins.length ?? 0) + 1}</span></h4>
          <Button variant="idle" size="sm" onClick={() => go({ name: 'skinEditor' })}><Pencil size={12} /> {s.new}</Button>
        </div>
        {/* Padded so the cards' shadows and the worn card's outline are not clipped by the scroll box. */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-3 px-3 py-2">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            <SkinCard name="Steve" model="classic" worn={!worn} onSelect={() => act(() => api.EquipSkin(''))} />
            {skins?.skins.map((k) => (
              <SkinCard key={k.id} name={k.name} png={k.png} model={k.model} worn={k.id === worn?.id} onSelect={() => act(() => api.EquipSkin(k.id))}
                onEdit={() => go({ name: 'skinEditor', id: k.id })} onDelete={() => setDeleting(k)} />
            ))}
          </div>
        </div>
      </section>

      {file && (
        <AddSkinDialog file={file} onClose={() => setFile(null)} onAdded={(k, wear) => {
          setFile(null)
          act(async () => { if (wear) await api.EquipSkin(k.id) })
        }} />
      )}
      {deleting && (
        <ConfirmDialog danger title={s.confirmDeleteTitle} confirmLabel={t.common.delete}
          body={fmt(s.confirmDelete, { name: deleting.name }) + (wornBy ? s.confirmDeleteWorn : '')}
          onConfirm={() => { const id = deleting.id; setDeleting(null); act(() => api.DeleteSkin(id)) }} onClose={() => setDeleting(null)} />
      )}
    </main>
  )
}

type CardProps = { name: string; png?: string; model: SkinModel; worn: boolean; onSelect: () => void; onEdit?: () => void; onDelete?: () => void }

/** One skin (no png: the default, Steve): the model at the usual angle,
 *  its name and model. A click wears it; the worn one is outlined and
 *  tagged. Edit and Delete show over the model on hover or keyboard focus
 *  (never on the default), so the name keeps the card's whole width. */
function SkinCard({ name, png, model, worn, onSelect, onEdit, onDelete }: CardProps) {
  const { t } = useApp()
  return (
    <div role="button" tabIndex={0} aria-pressed={worn} title={worn ? t.skins.inUse : t.skins.use} onClick={onSelect}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onSelect() } }}
      className={`group panel panel-hover flex flex-col gap-2 p-3 cursor-pointer ${worn ? 'outline-3 outline-primary' : ''}`}>
      <div className="relative h-32 rounded-md bg-panel-2 shadow-neu-inset">
        <SkinView png={png} model={model} />
        {worn && <span className="tag bg-green-soft gap-1 absolute bottom-2 left-2"><Check size={10} /> {t.skins.inUse}</span>}
        {onEdit && onDelete && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-has-focus-visible:opacity-100">
            <Button variant="idle" size="sm" square title={t.skins.edit} onClick={(e) => { e.stopPropagation(); onEdit() }}><Pencil size={12} /></Button>
            <Button variant="danger" size="sm" square title={t.skins.remove} onClick={(e) => { e.stopPropagation(); onDelete() }}><X size={12} /></Button>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold truncate" title={name}>{name}</div>
        <div className="text-[11px] text-muted">{t.skins.models[model]}{png ? '' : ` · ${t.skins.default}`}</div>
      </div>
    </div>
  )
}

/** A dropped or picked .png before it joins the library: its name (from
 *  the file), the model its pixels suggest, a turning preview that follows
 *  the model choice, and whether to wear it right away. */
function AddSkinDialog({ file, onClose, onAdded }: { file: SkinFile; onClose: () => void; onAdded: (k: Skin, wear: boolean) => void }) {
  const { t } = useApp()
  const a = t.skins.add
  const [name, setName] = useState(file.name)
  const [model, setModel] = useState<SkinModel>(file.model)
  const [wear, setWear] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    setBusy(true); setError(null)
    try { onAdded(await api.SaveSkin('', name, model, file.png), wear) } catch (e) { setError(messageOf(e)); setBusy(false) }
  }
  return (
    <Dialog title={a.title} width={560} onClose={onClose} actions={<>
      <Button variant="idle" disabled={busy} onClick={onClose}>{t.common.cancel}</Button>
      <Button variant="primary" loading={busy} disabled={!name.trim()} onClick={save}>{a.submit}</Button>
    </>}>
      <div className="flex gap-6">
        <div className="flex-none flex items-center rounded-md bg-panel-2 shadow-neu-inset px-3 py-4">
          <SkinView png={file.png} model={model} width={140} height={200} spin />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div>
            <Label htmlFor="skin-name">{a.name}</Label>
            <Input id="skin-name" type="text" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) save() }} />
          </div>
          <div>
            <Label>{a.model}</Label>
            <SegmentedControl options={(['classic', 'slim'] as const).map((m) => ({ value: m, label: t.skins.models[m] }))} value={model} onChange={setModel} />
            <p className="m-0 mt-2 text-xs text-muted">{fmt(a.detected, { model: t.skins.models[file.model].toLowerCase() })} {t.skins.modelHints[model]}</p>
          </div>
          <Checkbox checked={wear} onChange={(e) => setWear(e.target.checked)} label={a.wear} />
          <Feedback error={error} note={null} onClearNote={() => {}} />
        </div>
      </div>
    </Dialog>
  )
}
