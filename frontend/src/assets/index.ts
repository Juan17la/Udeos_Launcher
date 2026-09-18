// Art slots for the launcher's brand and decoration. Every slot is empty
// until a real asset lands in this folder; the UI then falls back to the
// pixel-art icons in ui/pixels.ts (Logo → enderman/grass, Decor → THEME_DECOR).
//
// To ship one: drop the file here, import it and set the slot, e.g.
//   import logoDark from './logo-dark.png'
//   export const ASSETS = { logo: { light: logoLight, dark: logoDark }, ... }
// Vite inlines small files and hashes the rest; nothing else changes.

export type Theme = 'light' | 'dark'

export const ASSETS: {
  /** Brand mark (top bar, login): one image per theme. */
  logo: Record<Theme, string | undefined>
  /** Items floating behind the login and dashboard, cycled by Decor. */
  decor: Record<Theme, string[]>
} = {
  logo: { light: undefined, dark: undefined },
  decor: { light: [], dark: [] },
}
