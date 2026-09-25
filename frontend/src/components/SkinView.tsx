import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SkinTexture, hitTest, pngURL, render, type Drawn, type Face, type View } from '../utils/skin'
import { DEFAULT_SKINS } from '../assets'
import type { SkinModel } from '../api/types'

/** The angle cards and previews start at: a little from above, turned toward the viewer's right. */
const START_VIEW: View = { yaw: -0.5, pitch: 0.22 }

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
   *  (and each texel dragged over); a press beside it still turns it. */
  onPaint?: (px: number, py: number, face: Face, first: boolean) => void
  /** What screen readers hear; without one the canvas is decoration. */
  label?: string
  className?: string
}

/** The player model drawn from a skin texture; drag to turn it. */
export function SkinCanvas({ tex, version, model, width, height, overlay = true, spin, onPaint, label, className = '' }: CanvasProps) {
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

  const draw = () => {
    const ctx = ref.current?.getContext('2d')
    if (ctx) drawn.current = render(ctx, tex, model, view.current, overlay)
  }
  useEffect(draw)

  useEffect(() => {
    if (!spin || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0, last = performance.now()
    const tick = (now: number) => {
      if (!touched.current) { view.current.yaw += (now - last) / 2200; draw() }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [spin, tex, version, model, overlay]) // eslint-disable-line react-hooks/exhaustive-deps

  // One gesture at a time: painting (started on the model) or turning (beside it, or the right button).
  const gesture = useRef<{ mode: 'paint' | 'turn'; x: number; y: number; last: string } | null>(null)
  const at = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return hitTest(drawn.current, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr)
  }
  const down = (e: React.PointerEvent) => {
    touched.current = true
    ref.current!.setPointerCapture(e.pointerId)
    const hit = onPaint && e.button === 0 ? at(e) : null
    gesture.current = { mode: hit ? 'paint' : 'turn', x: e.clientX, y: e.clientY, last: '' }
    if (hit) { gesture.current.last = `${hit.px},${hit.py}`; onPaint!(hit.px, hit.py, hit.face, true) }
  }
  const move = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) return
    if (g.mode === 'turn') {
      view.current.yaw += (e.clientX - g.x) / 90
      view.current.pitch = Math.max(-1.2, Math.min(1.2, view.current.pitch + (e.clientY - g.y) / 90))
      g.x = e.clientX; g.y = e.clientY
      draw()
      return
    }
    const hit = at(e)
    if (hit && `${hit.px},${hit.py}` !== g.last) { g.last = `${hit.px},${hit.py}`; onPaint!(hit.px, hit.py, hit.face, false) }
  }
  const up = () => { gesture.current = null }

  return (
    <canvas ref={ref} width={Math.round(w * dpr)} height={Math.round(h * dpr)} style={{ width: w, height: h }} role="img" aria-label={label} aria-hidden={!label || undefined}
      className={`${width && height ? 'block' : 'absolute inset-0'} touch-none ${onPaint ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} ${className}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()} />
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
