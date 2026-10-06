import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { SkinTexture, hitTest, outlineTexel, pngURL, render, type Drawn, type Face, type Part, type View } from '../utils/skin'
import { DEFAULT_SKINS } from '../assets'
import type { SkinModel } from '../api/types'

/** The angle cards and previews start at: a little from above, turned toward the viewer's right. */
const START_VIEW: View = { yaw: -0.5, pitch: 0.22 }

/** What the editor's buttons can do to the camera. */
export type CameraControls = { zoom: (factor: number) => void; reset: () => void }

type CanvasProps = {
  tex: SkinTexture
  /** Bump after painting on tex so the model is drawn again. */
  version: number
  model: SkinModel
  /** CSS pixels; without them the canvas fills its parent, which must be
   *  `relative` and get its size from the layout. */
  width?: number
  height?: number
  overlay?: boolean
  /** Turn slowly until the player drags it (not with reduced motion). */
  spin?: boolean
  /** Makes it paintable: a press on the model paints the texel under it
   *  (and every texel the pointer crosses); a press beside it still turns it. */
  onPaint?: (px: number, py: number, face: Face, first: boolean) => void
  /** Editor only: wheel zooms toward the pointer, middle-drag or Shift+drag moves the model,
   *  and `camera` receives the zoom/reset controls for buttons. */
  zoomable?: boolean
  camera?: MutableRefObject<CameraControls | null>
  hidden?: ReadonlySet<Part>
  grid?: boolean
  /** The texel to outline (from either view), and the texel under the pointer as it moves. */
  hover?: [number, number] | null
  onHover?: (texel: [number, number] | null) => void
  /** What screen readers hear; without one the canvas is decoration. */
  label?: string
  className?: string
}

const ZOOM_MIN = 0.5, ZOOM_MAX = 8

/** The player model drawn from a skin texture; drag to turn it. */
export function SkinCanvas({ tex, version, model, width, height, overlay = true, spin, onPaint, zoomable, camera, hidden, grid, hover, onHover, label, className = '' }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const view = useRef<View>({ ...START_VIEW })
  const drawn = useRef<Drawn[]>([])
  const touched = useRef(false)
  const dpr = window.devicePixelRatio || 1
  const [box, setBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    if (width && height) return
    const parent = ref.current!.parentElement!
    const ro = new ResizeObserver(() => setBox({ w: parent.clientWidth, h: parent.clientHeight }))
    ro.observe(parent)
    return () => ro.disconnect()
  }, [width, height])
  const [w, h] = width && height ? [width, height] : [box.w, box.h]

  // Drawing reads the latest props through a ref, so a burst of pointer events draws once per frame.
  const props = useRef({ overlay, hidden, grid, hover, model })
  props.current = { overlay, hidden, grid, hover, model }
  const drawNow = () => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const p = props.current
    drawn.current = render(ctx, tex, p.model, view.current, p.overlay, { hidden: p.hidden, grid: p.grid })
    if (p.hover) outlineTexel(ctx, drawn.current, p.hover[0], p.hover[1], '#FFAA00')
  }
  const frame = useRef(0)
  const draw = () => { if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; drawNow() }) }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  useEffect(drawNow) // a React render (new size, skin, layer…) draws right away, without waiting a frame

  useEffect(() => {
    if (!spin || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let id = 0, last = performance.now()
    const tick = (now: number) => {
      if (!touched.current) { view.current.yaw += (now - last) / 2200; drawNow() }
      last = now
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [spin, tex, version, model, overlay]) // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom by `factor` keeping canvas point (x, y) (device px) where it is.
  const zoomAt = (factor: number, x: number, y: number) => {
    const v = view.current, z = v.zoom ?? 1
    const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)) / z
    const c = ref.current!
    const [cx, cy] = [c.width / 2, c.height / 2]
    v.zoom = z * k
    v.panX = x - cx - (x - cx - (v.panX ?? 0)) * k
    v.panY = y - cy - (y - cy - (v.panY ?? 0)) * k
    draw()
  }
  if (camera) camera.current = {
    zoom: (f) => { const c = ref.current; if (c) zoomAt(f, c.width / 2, c.height / 2) },
    reset: () => { view.current = { ...START_VIEW }; draw() },
  }
  // React's wheel listener is passive (cannot stop the page scrolling), so this one is added by hand.
  useEffect(() => {
    const c = ref.current
    if (!zoomable || !c) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = c.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr)
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // One gesture at a time: painting (started on the model), turning (beside it, or the right button) or moving (middle button, Shift).
  const gesture = useRef<{ mode: 'paint' | 'turn' | 'pan'; x: number; y: number; last: string } | null>(null)
  const hitAt = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect()
    return hitTest(drawn.current, (clientX - r.left) * dpr, (clientY - r.top) * dpr)
  }
  const lastHover = useRef('')
  const reportHover = (texel: [number, number] | null) => {
    const k = texel ? texel.join() : ''
    if (k !== lastHover.current) { lastHover.current = k; onHover?.(texel) }
  }
  const down = (e: React.PointerEvent) => {
    touched.current = true
    ref.current!.setPointerCapture(e.pointerId)
    const pan = zoomable && (e.button === 1 || (e.button === 0 && e.shiftKey))
    const hit = !pan && onPaint && e.button === 0 ? hitAt(e.clientX, e.clientY) : null
    gesture.current = { mode: pan ? 'pan' : hit ? 'paint' : 'turn', x: e.clientX, y: e.clientY, last: '' }
    if (hit) { gesture.current.last = `${hit.px},${hit.py}`; onPaint!(hit.px, hit.py, hit.face, true) }
    if (e.button === 1) e.preventDefault() // no autoscroll
  }
  const move = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) {
      if (onHover) { const hit = hitAt(e.clientX, e.clientY); reportHover(hit && [hit.px, hit.py]) }
      return
    }
    const [dx, dy] = [e.clientX - g.x, e.clientY - g.y]
    if (g.mode === 'turn') {
      view.current.yaw += dx / 90
      view.current.pitch = Math.max(-1.2, Math.min(1.2, view.current.pitch + dy / 90))
    } else if (g.mode === 'pan') {
      view.current.panX = (view.current.panX ?? 0) + dx * dpr
      view.current.panY = (view.current.panY ?? 0) + dy * dpr
    } else {
      // Every texel between the last pointer event and this one, so a quick stroke leaves no gaps.
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2))
      for (let i = 1; i <= steps; i++) {
        const hit = hitAt(g.x + dx * i / steps, g.y + dy * i / steps)
        if (hit && `${hit.px},${hit.py}` !== g.last) { g.last = `${hit.px},${hit.py}`; onPaint!(hit.px, hit.py, hit.face, false) }
      }
      if (onHover) { const hit = hitAt(e.clientX, e.clientY); reportHover(hit && [hit.px, hit.py]) }
    }
    g.x = e.clientX; g.y = e.clientY
    if (g.mode !== 'paint') draw()
  }
  const up = () => { gesture.current = null }

  return (
    <canvas ref={ref} width={Math.round(w * dpr)} height={Math.round(h * dpr)} style={{ width: w, height: h }} role="img" aria-label={label} aria-hidden={!label || undefined}
      className={`${width && height ? 'block' : 'absolute inset-0'} touch-none ${onPaint ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} ${className}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => reportHover(null)} onContextMenu={(e) => e.preventDefault()} />
  )
}

/** A saved skin (base64 PNG) on the player model; without one, the
 *  default skin (Steve). Sizes as in SkinCanvas. */
export default function SkinView({ png, model, width, height, spin, className }: { png?: string; model: SkinModel; width?: number; height?: number; spin?: boolean; className?: string }) {
  const tex = useMemo(() => new SkinTexture(), [])
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let live = true
    tex.load(png ? pngURL(png) : DEFAULT_SKINS.classic).then(() => { if (live) setVersion((v) => v + 1) }).catch(() => {})
    return () => { live = false }
  }, [png, tex])
  return <SkinCanvas tex={tex} version={version} model={model} width={width} height={height} spin={spin} className={className} />
}

/** A skin's face (default: Steve's), the head's front with its second layer on top, pixel-sharp: the player's avatar. */
export function SkinFace({ png, size }: { png?: string; size: number }) {
  const layer = (x: number) => ({
    backgroundImage: `url(${png ? pngURL(png) : DEFAULT_SKINS.classic})`, backgroundSize: `${size * 8}px`,
    backgroundPosition: `${-x * size / 8}px ${-size}px`, imageRendering: 'pixelated' as const,
  })
  return (
    <span aria-hidden className="relative flex-none inline-block rounded-md overflow-hidden bg-idle" style={{ width: size, height: size }}>
      <span className="absolute inset-0" style={layer(8)} />
      <span className="absolute inset-0" style={layer(40)} />
    </span>
  )
}
