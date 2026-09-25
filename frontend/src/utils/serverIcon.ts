import { iconURL } from '../assets'

/** A block texture scaled up, pixel-sharp, to the 64×64 PNG a server shows
 *  next to its name in the multiplayer list; base64 without the data: prefix. */
export async function serverIconPNG(key: string): Promise<string> {
  const img = new Image()
  img.src = iconURL(key)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const g = canvas.getContext('2d')!
  g.imageSmoothingEnabled = false
  g.drawImage(img, 0, 0, 64, 64)
  return canvas.toDataURL('image/png').split(',')[1]
}
