import type { SkinModel } from '../api/types'

/* The Minecraft player model and its 64×64 texture layout, plus a small
 * canvas renderer (orthographic, painter's order) used by the library
 * cards, the preview and the editor, which also paints through it.
 * Axes are CSS-like: x right, y down, z toward the viewer; the player
 * faces +z, so its right side is at -x. Units are texels. */

export type Part = 'head' | 'body' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg'
export type Layer = 'base' | 'overlay'
export type FaceName = 'top' | 'bottom' | 'right' | 'front' | 'left' | 'back'
type Vec = [number, number, number]

/** One cuboid: its texture offset (u, v), size (w wide, h tall, d deep),
 *  centre, and how far the second layer stands off the first. */
export type Box = { part: Part; layer: Layer; u: number; v: number; w: number; h: number; d: number; c: Vec; grow: number }
/** One face: where it is in the texture, and in 3D its top-left corner
 *  `o` plus the vectors along the texture's width `du` and height `dv`. */
export type Face = { box: Box; name: FaceName; rect: [number, number, number, number]; o: Vec; du: Vec; dv: Vec; n: Vec }

export function boxes(model: SkinModel): Box[] {
  const aw = model === 'slim' ? 3 : 4
  const ax = 4 + aw / 2
  // part, base u/v, second-layer u/v, w, h, d, centre x/y
  const parts: [Part, number, number, number, number, number, number, number, number, number][] = [
    ['head', 0, 0, 32, 0, 8, 8, 8, 0, -10],
    ['body', 16, 16, 16, 32, 8, 12, 4, 0, 0],
    ['rightArm', 40, 16, 40, 32, aw, 12, 4, -ax, 0],
    ['leftArm', 32, 48, 48, 48, aw, 12, 4, ax, 0],
    ['rightLeg', 0, 16, 0, 32, 4, 12, 4, -2, 12],
    ['leftLeg', 16, 48, 0, 48, 4, 12, 4, 2, 12],
  ]
  return parts.flatMap(([part, bu, bv, ou, ov, w, h, d, x, y]): Box[] => [
    { part, layer: 'base', u: bu, v: bv, w, h, d, c: [x, y, 0], grow: 0 },
    { part, layer: 'overlay', u: ou, v: ov, w, h, d, c: [x, y, 0], grow: part === 'head' ? 0.5 : 0.25 },
  ])
}

/** The six faces of a box, mapped the way Minecraft's ModelPart.Cube maps them. */
export function faces(b: Box): Face[] {
  const { u, v, w, h, d, c } = b
  const [x, y, z] = [w / 2 + b.grow, h / 2 + b.grow, d / 2 + b.grow]
  const at = (dx: number, dy: number, dz: number): Vec => [c[0] + dx, c[1] + dy, c[2] + dz]
  const f = (name: FaceName, rect: Face['rect'], o: Vec, du: Vec, dv: Vec, n: Vec): Face => ({ box: b, name, rect, o, du, dv, n })
  return [
    f('top', [u + d, v, w, d], at(-x, -y, -z), [2 * x, 0, 0], [0, 0, 2 * z], [0, -1, 0]),
    f('bottom', [u + d + w, v, w, d], at(-x, y, -z), [2 * x, 0, 0], [0, 0, 2 * z], [0, 1, 0]),
    f('right', [u, v + d, d, h], at(-x, -y, -z), [0, 0, 2 * z], [0, 2 * y, 0], [-1, 0, 0]),
    f('front', [u + d, v + d, w, h], at(-x, -y, z), [2 * x, 0, 0], [0, 2 * y, 0], [0, 0, 1]),
    f('left', [u + d + w, v + d, d, h], at(x, -y, z), [0, 0, -2 * z], [0, 2 * y, 0], [1, 0, 0]),
    f('back', [u + 2 * d + w, v + d, w, h], at(x, -y, -z), [-2 * x, 0, 0], [0, 2 * y, 0], [0, 0, -1]),
  ]
}

/** Every face of the model, both layers. */
export const allFaces = (model: SkinModel) => boxes(model).flatMap(faces)

/** The face a texel belongs to (undefined for texels the game never shows). */
export function faceAt(model: SkinModel, px: number, py: number): Face | undefined {
  return allFaces(model).find(({ rect: [x, y, w, h] }) => px >= x && px < x + w && py >= y && py < y + h)
}

/** Which texels the game uses, as a 64×64 mask (slim arms leave a column out). */
export function usedMask(model: SkinModel): Uint8Array {
  const mask = new Uint8Array(64 * 64)
  for (const { rect: [x, y, w, h] } of allFaces(model)) {
    for (let j = y; j < y + h; j++) mask.fill(1, j * 64 + x, j * 64 + x + w)
  }
  return mask
}

/** A 64×64 skin kept in a canvas, plus shaded copies for the renderer
 *  (lit faces are the same picture, darker), rebuilt after edits. */
export class SkinTexture {
  readonly canvas = document.createElement('canvas')
  readonly ctx: CanvasRenderingContext2D
  private shades = new Map<number, HTMLCanvasElement>()

  constructor() {
    this.canvas.width = this.canvas.height = 64
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
  }

  /** Loads a skin picture: an asset URL, or pngURL(the backend's base64). */
  async load(src: string) {
    const img = new Image()
    img.src = src
    await img.decode()
    this.ctx.clearRect(0, 0, 64, 64)
    this.ctx.drawImage(img, 0, 0)
    this.changed()
  }

  /** Call after drawing on `ctx`, so the shaded copies are rebuilt. */
  changed() { this.shades.clear() }

  get pixels() { return this.ctx.getImageData(0, 0, 64, 64) }
  set pixels(data: ImageData) { this.ctx.putImageData(data, 0, 0); this.changed() }

  /** The picture as the backend wants it: base64 PNG without the data: prefix. */
  toBase64() { return this.canvas.toDataURL('image/png').split(',')[1] }

  /** The picture at brightness level/16. */
  shade(level: number): HTMLCanvasElement {
    let c = this.shades.get(level)
    if (!c) {
      c = document.createElement('canvas')
      c.width = c.height = 64
      const img = this.pixels
      const k = level / 16
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k
      }
      c.getContext('2d')!.putImageData(img, 0, 0)
      this.shades.set(level, c)
    }
    return c
  }
}

/** A data: URL for a base64 PNG, the format the backend sends skins in. */
export const pngURL = (png: string) => `data:image/png;base64,${png}`

export type View = { yaw: number; pitch: number }
/** A face as drawn: the affine map from its texture rect to the canvas, for hit tests. */
export type Drawn = { face: Face; m: [number, number, number, number, number, number] }

const LIGHT: Vec = (() => { const l: Vec = [-0.4, -0.7, 1]; const n = Math.hypot(...l); return l.map((x) => x / n) as Vec })()

/** Draws the player on ctx (whose canvas is w×h device pixels), filling
 *  its height, and returns the faces in drawing order (last = on top). */
export function render(ctx: CanvasRenderingContext2D, tex: SkinTexture, model: SkinModel, view: View, overlay = true): Drawn[] {
  const { width: w, height: h } = ctx.canvas
  const scale = Math.min(h / 36, w / 20) // 32 texels tall plus room for the tilt
  const [cy, sy, cp, sp] = [Math.cos(view.yaw), Math.sin(view.yaw), Math.cos(view.pitch), Math.sin(view.pitch)]
  const rot = ([x, y, z]: Vec): Vec => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy
    return [x1, y * cp + z1 * sp, -y * sp + z1 * cp]
  }
  const ox = w / 2, oy = h / 2 - scale * 2 // the model spans y -14…18, so its middle is 2 below the body's centre
  const eps = 0.6 / scale // faces overlap by ~half a pixel so no seams show between them
  const drawn: Drawn[] = []
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = false
  // Painter's order: boxes far to near (a part's second layer right after it), each box's front-facing sides.
  const list = boxes(model).filter((b) => overlay || b.layer === 'base')
    .map((b) => ({ b, depth: rot(b.c)[2] }))
    .sort((a, b) => a.depth - b.depth)
  for (const { b } of list) {
    for (const f of faces(b)) {
      const n = rot(f.n)
      if (n[2] <= 0) continue
      const [fx, fy, fw, fh] = f.rect
      const o = rot(f.o), du = rot(f.du), dv = rot(f.dv)
      const m: Drawn['m'] = [du[0] * scale / fw, du[1] * scale / fw, dv[0] * scale / fh, dv[1] * scale / fh, ox + o[0] * scale, oy + o[1] * scale]
      const light = 0.6 + 0.4 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])
      ctx.setTransform(...m)
      ctx.drawImage(tex.shade(Math.round(light * 16)), fx, fy, fw, fh, -eps, -eps, fw + 2 * eps, fh + 2 * eps)
      drawn.push({ face: f, m })
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return drawn
}

/** The texel under canvas point (x, y), from the topmost face drawn there. */
export function hitTest(drawn: Drawn[], x: number, y: number): { px: number; py: number; face: Face } | null {
  for (let i = drawn.length - 1; i >= 0; i--) {
    const { face, m: [a, b, c, d, e, f] } = drawn[i]
    const det = a * d - b * c
    if (!det) continue
    const s = (d * (x - e) - c * (y - f)) / det
    const t = (a * (y - f) - b * (x - e)) / det
    const [fx, fy, fw, fh] = face.rect
    if (s >= 0 && s < fw && t >= 0 && t < fh) return { px: fx + Math.floor(s), py: fy + Math.floor(t), face }
  }
  return null
}
