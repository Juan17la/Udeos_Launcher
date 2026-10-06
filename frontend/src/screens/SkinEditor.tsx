import { useEffect, useMemo, useRef, useState } from 'react'
import { SkinCanvas, type CameraControls } from '../components/SkinView'
import Button from '../ui/Button'
import { ConfirmDialog } from '../ui/Dialog'
import { Input, Label } from '../ui/Field'
import AutoLoader from '../ui/Loader'
import SegmentedControl from '../ui/SegmentedControl'
import StatusMessage from '../ui/StatusMessage'
import { Bucket, Eraser, Grid, Pencil, Pipette, Redo, Reset, Undo, ZoomIn, ZoomOut } from '../ui/icons'
import { useApp } from '../state'
import { api } from '../api/bridge'
import { fmt } from '../i18n/format'
import { messageOf } from '../utils/errors'
import { Feedback } from './instance/TabParts'
import { SkinTexture, allFaces, faceAt, pngURL, usedMask, type Layer, type Part } from '../utils/skin'
import { DEFAULT_SKINS } from '../assets'
import type { SkinModel } from '../api/types'

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker'
type Texel = [number, number]
type Draft = { name: string; model: SkinModel; png: string }

/** Unsaved work per skin ('' = a new one): leaving the editor without
 *  saving (a nav click, Back) keeps it, and coming back offers it again. */
const drafts = new Map<string, Draft>()

const TOOLS: { tool: Tool; icon: JSX.Element }[] = [
  { tool: 'pencil', icon: <Pencil size={16} /> }, { tool: 'eraser', icon: <Eraser /> },
  { tool: 'fill', icon: <Bucket /> }, { tool: 'picker', icon: <Pipette /> },
]
const KEYS: Record<string, Tool> = { b: 'pencil', e: 'eraser', g: 'fill', i: 'picker' }
/** Minecraft's sixteen dye colors, then skin tones: a start for any skin. */
const PALETTE = ['#F9FFFE', '#9D9D97', '#474F52', '#1D1D21', '#835432', '#B02E26', '#F9801D', '#FED83D', '#80C71F', '#5E7C16', '#169C9C', '#3AB3DA',
  '#3C44AA', '#8932B8', '#C74EBD', '#F38BAA', '#F9D4B4', '#E0AC69', '#C68642', '#8D5524', '#5A3B26']
/** The parts toggle, laid out like the player facing you (its right arm on your left): grid area per part. */
const DOLL: [Part, string][] = [['head', '1 / 2 / 2 / 4'], ['rightArm', '2 / 1 / 3 / 2'], ['body', '2 / 2 / 3 / 4'], ['leftArm', '2 / 4 / 3 / 5'], ['rightLeg', '3 / 2 / 4 / 3'], ['leftLeg', '3 / 3 / 4 / 4']]

/** The skin editor: the 3D model fills the page and is painted directly
 *  (wheel zooms toward the pointer, right-drag turns, middle/Shift-drag
 *  moves, a texel grid shows when zoomed in); parts can be hidden to reach
 *  the ones behind. The flat 64×64 skin sits in the side panel, also
 *  paintable. Pencil, eraser, fill (stays inside the face it starts on),
 *  color picker (also right-click on the flat skin), palette, undo and
 *  redo; the layer switch shows the second layer and paints it. Texels the
 *  game never reads cannot be painted. */
export default function SkinEditor({ id }: { id?: string }) {
  const { t, scheme, skins, refreshSkins, back } = useApp()
  const e = t.skins.editor
  const saved = id ? skins?.skins.find((k) => k.id === id) : undefined
  const key = id ?? ''
  const tex = useMemo(() => new SkinTexture(), [])
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [model, setModel] = useState<SkinModel>('classic')
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#5a3b26')
  const [recent, setRecent] = useState<string[]>([])
  const [layer, setLayer] = useState<Layer>('base')
  const [hidden, setHidden] = useState<ReadonlySet<Part>>(() => new Set())
  const [grid, setGrid] = useState(true)
  const camera = useRef<CameraControls | null>(null)
  const [hover, setHover] = useState<Texel | null>(null)
  const [dirty, setDirty] = useState(false)
  const [restored, setRestored] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const undo = useRef<ImageData[]>([])
  const redo = useRef<ImageData[]>([])
  const used = useMemo(() => usedMask(model), [model])

  // The saved skin, else Steve; `draft` (left here unsaved last time) wins over both.
  const start = (draft?: Draft) => {
    const from = draft ?? (saved && { name: saved.name, model: saved.model, png: saved.png })
    setName(from?.name ?? ''); setModel(from?.model ?? 'classic')
    undo.current = []; redo.current = []
    setRestored(!!draft); setDirty(!!draft)
    tex.load(from ? pngURL(from.png) : DEFAULT_SKINS.classic).then(() => { setReady(true); bump() }).catch((err) => setError(messageOf(err)))
  }
  useEffect(() => {
    if (ready || (id && !skins)) return
    if (id && !saved) back()
    else start(drafts.get(key))
  }, [skins]) // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving with unsaved changes keeps them as the draft (Save and Cancel set `done` first).
  const done = useRef(false)
  const latest = useRef({ name, model, dirty })
  latest.current = { name, model, dirty }
  useEffect(() => () => {
    const l = latest.current
    if (l.dirty && !done.current) drafts.set(key, { name: l.name, model: l.model, png: tex.toBase64() })
  }, [key, tex])

  const pick = (px: number, py: number) => {
    const [r, g, b, a] = tex.ctx.getImageData(px, py, 1, 1).data
    if (a) { setColor('#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')); setTool('pencil') }
  }
  const paint = (px: number, py: number, first: boolean) => {
    if (px < 0 || py < 0 || px > 63 || py > 63 || !used[py * 64 + px]) return
    if (tool === 'picker') { if (first) pick(px, py); return }
    if (tool === 'fill' && !first) return
    if (first) {
      undo.current = [...undo.current.slice(-99), tex.pixels]; redo.current = []
      if (tool !== 'eraser') setRecent((r) => [color, ...r.filter((c) => c !== color)].slice(0, 12))
    }
    if (tool === 'fill') floodFill(tex, model, px, py, color)
    else if (tool === 'eraser') tex.ctx.clearRect(px, py, 1, 1)
    else { tex.ctx.fillStyle = color; tex.ctx.fillRect(px, py, 1, 1) }
    tex.changed(); setDirty(true); bump()
  }
  const step = (from: typeof undo, to: typeof undo) => {
    const img = from.current.pop()
    if (!img) return
    to.current.push(tex.pixels); tex.pixels = img; setDirty(true); bump()
  }
  // A new skin nobody painted yet follows the model: Steve for classic, Alex for slim (her arms are a pixel narrower).
  const changeModel = (m: SkinModel) => {
    setModel(m); setDirty(true)
    if (!id && !restored && undo.current.length === 0) tex.load(DEFAULT_SKINS[m]).then(bump)
  }

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return
      const k = ev.key.toLowerCase(), mod = ev.ctrlKey || ev.metaKey
      if (mod && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); step(redo, undo) }
      else if (mod && k === 'z') { ev.preventDefault(); step(undo, redo) }
      else if (!mod && !ev.altKey && KEYS[k]) setTool(KEYS[k])
      else if (!mod && (k === '+' || k === '=')) camera.current?.zoom(1.25)
      else if (!mod && k === '-') camera.current?.zoom(0.8)
      else if (!mod && k === '0') camera.current?.reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const leave = () => { done.current = true; drafts.delete(key); back() }
  const save = async () => {
    setBusy(true); setError(null)
    try { await api.SaveSkin(id ?? '', name, model, tex.toBase64()); await refreshSkins(); leave() } catch (err) { setError(messageOf(err)); setBusy(false) }
  }

  if (!ready) return <main className="flex-1 flex flex-col pt-4 px-[clamp(16px,3vw,40px)] pb-6"><AutoLoader active={!error} label={t.common.loading} /><Feedback error={error} note={null} onClearNote={() => {}} /></main>

  const face = hover && faceAt(model, hover[0], hover[1])
  const pickColor = (c: string) => { setColor(c); if (tool === 'eraser' || tool === 'picker') setTool('pencil') }
  const togglePart = (part: Part) => setHidden((cur) => { const next = new Set(cur); if (!next.delete(part)) next.add(part); return next })
  return (
    <main className="flex-1 min-h-0 flex flex-col gap-4 pt-4 px-[clamp(16px,3vw,40px)] pb-6 overflow-y-hidden!">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h2 className="mb-0 [@media(min-height:700px)]:mb-1 truncate">{id ? fmt(e.editTitle, { name: saved?.name ?? '' }) : e.newTitle}</h2>
          <p className="m-0 text-muted truncate hidden [@media(min-height:700px)]:block">{e.subtitle}</p>
        </div>
        <div className="flex gap-4 flex-none">
          <Button variant="idle" disabled={busy} onClick={() => (dirty ? setConfirmLeave(true) : leave())}>{t.common.cancel}</Button>
          <Button variant="primary" loading={busy} disabled={!name.trim()} onClick={save}>{e.save}</Button>
        </div>
      </div>
      {restored && (
        <StatusMessage kind="success" headline={e.restored} onDismiss={() => setRestored(false)}
          aside={<Button variant="ghost" size="sm" onClick={() => { drafts.delete(key); start() }}>{e.discard}</Button>} />
      )}
      <Feedback error={error} note={null} onClearNote={() => {}} />

      {/* The page never scrolls: toolbar, model and side panel all fit; only the side panel scrolls on a short window. */}
      <div className="flex-1 min-h-0 grid grid-cols-[auto_minmax(0,1fr)_clamp(250px,24vw,320px)] grid-rows-[minmax(0,1fr)] gap-[clamp(12px,2vw,24px)]">
        <nav className="panel p-2 flex flex-col gap-2 overflow-y-auto" aria-label={e.toolbar}>
          {TOOLS.map(({ tool: k, icon }) => (
            <Button key={k} square variant={tool === k ? 'primary' : 'idle'} title={e.tools[k]} aria-pressed={tool === k} onClick={() => setTool(k)}>{icon}</Button>
          ))}
          <hr className="w-full my-1 border-0 h-px bg-muted/30" />
          <Button square variant="idle" title={e.undo} disabled={!undo.current.length} onClick={() => step(undo, redo)}><Undo /></Button>
          <Button square variant="idle" title={e.redo} disabled={!redo.current.length} onClick={() => step(redo, undo)}><Redo /></Button>
          <hr className="w-full my-1 border-0 h-px bg-muted/30" />
          <Button square variant="idle" title={e.zoomIn} onClick={() => camera.current?.zoom(1.25)}><ZoomIn /></Button>
          <Button square variant="idle" title={e.zoomOut} onClick={() => camera.current?.zoom(0.8)}><ZoomOut /></Button>
          <Button square variant="idle" title={e.resetView} onClick={() => camera.current?.reset()}><Reset /></Button>
          <Button square variant={grid ? 'primary' : 'idle'} title={e.grid} aria-pressed={grid} onClick={() => setGrid(!grid)}><Grid /></Button>
        </nav>

        <section className="relative min-w-0 min-h-0 rounded-md bg-panel-2 shadow-neu-inset overflow-hidden">
          <SkinCanvas tex={tex} version={version} model={model} overlay={layer === 'overlay'} label={e.model3d} zoomable camera={camera}
            hidden={hidden} grid={grid} hover={hover} onHover={setHover} onPaint={(px, py, _face, first) => paint(px, py, first)} />
          {/* Over the model, out of its way: what to paint on (top), where the pointer is and how to move (bottom). */}
          <div className="absolute top-3 left-3" title={e.layerHint}>
            <SegmentedControl options={(['base', 'overlay'] as const).map((l) => ({ value: l, label: e.layers[l] }))} value={layer} onChange={setLayer} />
          </div>
          {/* The parts, laid out like the player facing you: click one to hide it and paint what is behind. */}
          <div className="absolute top-3 right-3 flex flex-col items-center gap-1.5 p-2 rounded-md glass" title={e.showPartsHint}>
            <span className="text-[11px] text-muted">{e.showParts}</span>
            <div className="grid grid-cols-[repeat(4,12px)] grid-rows-[24px_36px_36px] gap-0.5" role="group" aria-label={e.showParts}>
              {DOLL.map(([part, area]) => (
                <button key={part} type="button" style={{ gridArea: area }} title={e.parts[part]} aria-label={e.parts[part]} aria-pressed={!hidden.has(part)} onClick={() => togglePart(part)}
                  className={`rounded-[3px] border-0 cursor-pointer transition-colors duration-150 ${hidden.has(part) ? 'bg-transparent outline-1 outline-dashed outline-muted -outline-offset-1' : 'bg-primary hover:bg-primary-hover'}`} />
              ))}
            </div>
          </div>
          <div className="absolute bottom-3 inset-x-3 flex justify-between items-end gap-4 text-xs pointer-events-none">
            <span className={`truncate px-2 py-1 rounded-md glass ${hover ? '' : 'invisible'}`}>{hover && (face ? `${e.parts[face.box.part]} · ${e.faces[face.name]} · ${e.layers[face.box.layer]} (${hover[0]}, ${hover[1]})` : e.unused)}</span>
            <span className="truncate px-2 py-1 rounded-md glass text-muted">{e.hint3d}</span>
          </div>
        </section>

        <aside className="panel min-h-0 overflow-y-auto flex flex-col gap-4 p-4 min-w-0">
          <div>
            <Label htmlFor="skin-name">{e.name}</Label>
            <Input id="skin-name" type="text" maxLength={32} placeholder={e.namePlaceholder} value={name} onChange={(ev) => { setName(ev.target.value); setDirty(true) }} />
          </div>
          <div title={t.skins.modelHints[model]} className="flex items-center justify-between gap-3">
            <Label className="mb-0">{e.model}</Label>
            <SegmentedControl options={(['classic', 'slim'] as const).map((m) => ({ value: m, label: t.skins.models[m] }))} value={model} onChange={changeModel} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer" title={e.color}>
              <input type="color" value={color} onChange={(ev) => pickColor(ev.target.value)} className="w-10 h-10 p-0.5 rounded-md border-0 bg-idle shadow-neu cursor-pointer" />
              <span className="text-sm font-bold">{e.color}</span>
              <span className="text-xs text-muted tabular-nums">{color.toUpperCase()}</span>
            </label>
            <Swatches colors={PALETTE} color={color} onPick={pickColor} label={e.palette} />
            {/* Always there, even empty: a row appearing after the first stroke would shift the panel mid-stroke. */}
            <div className="min-h-6 flex items-center">
              {recent.length ? <Swatches colors={recent} color={color} onPick={pickColor} label={e.recent} /> : <span className="text-xs text-muted">{e.recent}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="mb-0">{e.flat}</Label>
            <FlatSkin tex={tex} version={version} model={model} dark={scheme === 'dark'} hover={hover} onHover={setHover} onPaint={paint} onPick={pick} label={e.flat} />
          </div>
        </aside>
      </div>

      {confirmLeave && (
        <ConfirmDialog danger title={e.discardTitle} body={e.discardBody} confirmLabel={e.discardConfirm}
          onConfirm={leave} onClose={() => setConfirmLeave(false)} />
      )}
    </main>
  )
}

const SIZE = 512 // CSS px: 8 per texel

/** The flat 64×64 skin, 8× up: a checkerboard where the game reads it (so
 *  transparent pixels show), the unused parts veiled, a faint texel grid,
 *  each face outlined and the texel under the pointer framed. Drag to
 *  paint (lines between pointer events are filled in); right-click picks
 *  a color. */
function FlatSkin({ tex, version, model, dark, hover, onHover, onPaint, onPick, label }: {
  tex: SkinTexture; version: number; model: SkinModel; dark: boolean; hover: Texel | null; label: string
  onHover: (t: Texel | null) => void; onPaint: (px: number, py: number, first: boolean) => void; onPick: (px: number, py: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const dpr = window.devicePixelRatio || 1
  const [under, veil] = useMemo(() => backdrop(model, dark), [model, dark])

  useEffect(() => {
    const g = ref.current!.getContext('2d')!
    const s = SIZE / 64
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.imageSmoothingEnabled = false
    g.clearRect(0, 0, SIZE, SIZE)
    for (const layer of [under, tex.canvas, veil]) g.drawImage(layer, 0, 0, SIZE, SIZE)
    g.lineWidth = 1 / dpr
    g.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(54,48,43,0.07)'
    g.beginPath()
    for (let i = 1; i < 64; i++) { g.moveTo(i * s, 0); g.lineTo(i * s, SIZE); g.moveTo(0, i * s); g.lineTo(SIZE, i * s) }
    g.stroke()
    g.strokeStyle = dark ? 'rgba(237,231,242,0.35)' : 'rgba(54,48,43,0.3)'
    for (const { rect: [x, y, w, h] } of allFaces(model)) g.strokeRect(x * s, y * s, w * s, h * s)
    if (hover) {
      g.lineWidth = 2
      g.strokeStyle = dark ? '#EDE7F2' : '#36302B'
      g.strokeRect(hover[0] * s + 1, hover[1] * s + 1, s - 2, s - 2)
    }
  }, [tex, version, model, dark, hover, under, veil, dpr])

  const stroke = useRef<Texel | null>(null)
  const texel = (ev: React.PointerEvent): Texel => {
    const r = ref.current!.getBoundingClientRect()
    return [Math.floor((ev.clientX - r.left) * 64 / r.width), Math.floor((ev.clientY - r.top) * 64 / r.height)]
  }
  return (
    <canvas ref={ref} width={SIZE * dpr} height={SIZE * dpr} style={{ width: '100%', aspectRatio: '1' }} role="img" aria-label={label} className="block rounded-md cursor-crosshair touch-none"
      onContextMenu={(ev) => ev.preventDefault()}
      onPointerDown={(ev) => {
        const p = texel(ev)
        if (ev.button === 2) { onPick(...p); return }
        if (ev.button !== 0) return
        ref.current!.setPointerCapture(ev.pointerId)
        stroke.current = p
        onPaint(p[0], p[1], true)
      }}
      onPointerMove={(ev) => {
        const p = texel(ev)
        if (!hover || p[0] !== hover[0] || p[1] !== hover[1]) onHover(p[0] >= 0 && p[1] >= 0 && p[0] < 64 && p[1] < 64 ? p : null)
        if (stroke.current) { for (const [x, y] of line(stroke.current, p).slice(1)) onPaint(x, y, false); stroke.current = p }
      }}
      onPointerUp={() => { stroke.current = null }} onPointerCancel={() => { stroke.current = null }} onPointerLeave={() => onHover(null)} />
  )
}

/** A row of color buttons; the current color is ringed. */
function Swatches({ colors, color, onPick, label }: { colors: string[]; color: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(22px,1fr))] gap-1.5 w-full" role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} type="button" title={c} aria-label={c} aria-pressed={c.toLowerCase() === color.toLowerCase()} onClick={() => onPick(c.toLowerCase())}
          className={`aspect-square rounded-sm border-0 shadow-neu cursor-pointer transition-transform duration-150 hover:-translate-y-px ${c.toLowerCase() === color.toLowerCase() ? 'outline-2 outline-text outline-offset-1' : ''}`} style={{ background: c }} />
      ))}
    </div>
  )
}

/** The flat view's layers under and over the skin: a checkerboard where
 *  the game reads it and a flat fill elsewhere; then a veil over the unused
 *  parts (imported skins sometimes have pixels there the game ignores). */
function backdrop(model: SkinModel, dark: boolean): [HTMLCanvasElement, HTMLCanvasElement] {
  const used = usedMask(model)
  const [a, b, off] = dark ? ['#4D4556', '#453E4D', '#2F2A35'] : ['#F3F0E8', '#E6E1D7', '#D8D2C8']
  const [under, veil] = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = c.height = 64; return c })
  const gu = under.getContext('2d')!, gv = veil.getContext('2d')!
  gv.fillStyle = off
  gv.globalAlpha = 0.85
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (used[y * 64 + x]) { gu.fillStyle = (x + y) % 2 ? a : b; gu.fillRect(x, y, 1, 1) } else { gu.fillStyle = off; gu.fillRect(x, y, 1, 1); gv.fillRect(x, y, 1, 1) }
    }
  }
  return [under, veil]
}

/** Every texel on the straight line from a to b (Bresenham), both ends included. */
function line([x0, y0]: Texel, [x1, y1]: Texel): Texel[] {
  const out: Texel[] = []
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    out.push([x0, y0])
    if (x0 === x1 && y0 === y1) return out
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

/** Fills the same-colored area around (px, py) with color, without leaving
 *  the face it starts on (the next face over belongs to another side). */
function floodFill(tex: SkinTexture, model: SkinModel, px: number, py: number, color: string) {
  const face = faceAt(model, px, py)
  if (!face) return
  const [fx, fy, fw, fh] = face.rect
  const img = tex.pixels, d = img.data
  const at = (x: number, y: number) => (y * 64 + x) * 4
  const want = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).concat(255)
  const from = Array.from(d.slice(at(px, py), at(px, py) + 4))
  if (from.every((v, i) => v === want[i])) return
  const same = (i: number) => from.every((v, k) => d[i + k] === v)
  const todo: Texel[] = [[px, py]]
  while (todo.length) {
    const [x, y] = todo.pop()!
    if (x < fx || y < fy || x >= fx + fw || y >= fy + fh || !same(at(x, y))) continue
    d.set(want, at(x, y))
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  tex.pixels = img
}
