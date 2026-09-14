// 8×8 pixel-art icons drawn with a single box-shadow, ported 1:1 from the mockup.
// Each PIXELS row is 8 characters; a character maps to a PALETTE color, '.' is empty.

export const PALETTE: Record<string, string> = {
  g: '#8fd18b', G: '#5f9e5c', d: '#b08155', D: '#8a6340', m: '#c99a6b',
  s: '#a8a8a8', S: '#828282', l: '#c6c6c6', k: '#5e5e5e', x: '#16131f',
  w: '#b07f4a', W: '#8a6136', n: '#6b4a29', i: '#dfe3e8', I: '#a8b0ba',
  y: '#f5c542', Y: '#c99a18', c: '#6fe6d8', C: '#3bb9ad', r: '#e05a4f', R: '#b23b34',
  p: '#c9a6ff', P: '#8b5cf6', t: '#79dcc4', T: '#3f9e86', h: '#6d5f63', H: '#453b40',
  o: '#f0902a', e: '#6aa84f', u: '#f2f2f2',
}

export const PIXELS: Record<string, string[]> = {
  grass: ['ggGgggGg', 'GggGgggG', 'dmdddDdm', 'dddmDdDd', 'DdddmddD', 'ddDdddmd', 'dmdDdddD', 'dddmdDdd'],
  dirt: ['dmdddDdm', 'dddmDdDd', 'DdddmddD', 'ddDdddmd', 'dmdDdddD', 'dddmdDdd', 'DddmdddD', 'dddDdmdd'],
  stone: ['slsssSls', 'sssSslss', 'lssssSss', 'sSsslsss', 'ssslsSss', 'sSssssls', 'sslsSsss', 'ssSsslss'],
  cobblestone: ['ssksslss', 'sskssSss', 'kkskkksk', 'slsskssl', 'ssksslss', 'kkkskksk', 'sslssksl', 'sskssSss'],
  furnace: ['ssssssss', 'slllllls', 'ssssssss', 'skkkkkks', 'skxxxxks', 'skxooxks', 'skkkkkks', 'ssssssss'],
  crafting_table: ['wwwwwwww', 'wnnwnnww', 'wwwwwwww', 'wnnwnnww', 'WWWWWWWW', 'WnWWnWWW', 'WWWWWWWW', 'WnWWnWWW'],
  enderman: ['xxxxxxxx', 'xxxxxxxx', 'xxxxxxxx', 'xppxxppx', 'xpuxxupx', 'xxxxxxxx', 'xxxxxxxx', 'xxxxxxxx'],
  sword: ['......ii', '.....iii', '....iii.', '...iii..', '..iii...', '.yiy....', 'yy.y....', 'n.......'],
  axe: ['..iiii..', '.iiiiii.', '.iiiiii.', '..iiiw..', '.....w..', '....w...', '...w....', '..w.....'],
  bow: ['...ww...', '..w..u..', '.w...u..', '.w...u..', '.w...u..', '.w...u..', '..w..u..', '...ww...'],
  arrow: ['......ii', '.....ii.', '....ii..', '...ii...', '..ii....', '.uu.....', 'uuu.....', 'uu......'],
  mace: ['..hhhh..', '.hhyyhh.', '.hyyyyh.', '.hhyyhh.', '..hhhh..', '...n....', '...n....', '...n....'],
  planks: ['wwwwnwww', 'WWWWnWWW', 'nnnnnnnn', 'wwnwwwww', 'WWnWWWWW', 'nnnnnnnn', 'wwwwwnww', 'WWWWWnWW'],
  pickaxe: ['.iiiiii.', 'ii....ii', '......w.', '.....w..', '....w...', '...w....', '..w.....', '.w......'],
  diamond: ['..cccc..', '.cCccCc.', 'cCccccCc', 'cCccccCc', '.cCccCc.', '..cCCc..', '...cc...', '........'],
  apple: ['....e...', '...ee...', '.rrrrrr.', 'rrrRrrrr', 'rrrrrrrr', 'rrrRrrrr', '.rrrrrr.', '..rrrr..'],
  golden_apple: ['....e...', '...ee...', '.yyyyyy.', 'yyyYyyyy', 'yyyyyyyy', 'yyyYyyyy', '.yyyyyy.', '..yyyy..'],
  ender_pearl: ['..tttt..', '.ttTTtt.', 'tTttttTt', 'ttttttTt', 'tTtttTTt', '.tTTTTt.', '..tttt..', '........'],
  netherite_sword: ['......hh', '.....hhh', '....hhh.', '...hhh..', '..hhh...', '.yhy....', 'yy.y....', 'n.......'],
  netherite_ingot: ['........', '.hhhhhh.', 'hHhhhhHh', 'hhhhhhhh', 'hHhhhhHh', '.hhhhhh.', '........', '........'],
}

export type IconName = keyof typeof PIXELS

/** Icons a player can pick for an instance (key, label). */
export const ICON_CHOICES: [IconName, string][] = [
  ['grass', 'Grass'], ['dirt', 'Dirt'], ['stone', 'Stone'], ['cobblestone', 'Cobblestone'], ['planks', 'Wood Planks'],
  ['crafting_table', 'Crafting Table'], ['furnace', 'Furnace'], ['enderman', 'Enderman'], ['sword', 'Sword'],
  ['axe', 'Axe'], ['bow', 'Bow'], ['arrow', 'Arrow'], ['mace', 'Mace'],
]

/** Decorative items scattered in page backgrounds, per theme. */
export const THEME_DECOR: Record<'light' | 'dark', IconName[]> = {
  light: ['pickaxe', 'diamond', 'apple', 'grass', 'diamond', 'pickaxe', 'apple'],
  dark: ['ender_pearl', 'netherite_sword', 'netherite_ingot', 'golden_apple', 'ender_pearl', 'netherite_ingot', 'golden_apple'],
}

// Rasterized once per (name, size): a many-layer box-shadow is expensive to
// paint and repaints on every mount (instance cards, the icon picker's ~13
// icons at once, decorative background icons on every page). A cached PNG
// data URL turns every later paint of that icon into a normal cheap image.
const dataURLCache = new Map<string, string>()

/** Rasterizes an 8×8 icon to a `size`×`size` PNG data URL, cached per (name, size). */
export function pixelIconDataURL(name: string, size: number): string {
  const key = `${name}:${size}`
  const cached = dataURLCache.get(key)
  if (cached) return cached

  const map = PIXELS[name] || PIXELS.grass
  const unit = size / 8
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  map.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      const color = PALETTE[ch]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x * unit, y * unit, unit, unit)
      }
    })
  })
  const url = canvas.toDataURL('image/png')
  dataURLCache.set(key, url)
  return url
}
