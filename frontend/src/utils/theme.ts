import type { CustomColors } from '../api/types'

export type Theme = 'light' | 'dark' | 'custom'

/** Where the personalised theme starts (same as the backend's profile.DefaultColors). */
export const DEFAULT_COLORS: CustomColors = { background: '#11202B', panel: '#1A2E3C', primary: '#2DB6A3', secondary: '#3B5A74', third: '#27404F' }

type RGB = [number, number, number]
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const hex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
const rgba = (h: string, a: number) => `rgba(${rgb(h).join(', ')}, ${a})`
/** `w` of the way from a to b. */
const mix = (a: string, b: string, w: number) => { const x = rgb(a), y = rgb(b); return hex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * w) as RGB) }

/** WCAG relative luminance. */
function luminance(h: string) {
  const [r, g, b] = rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const DARK_INK = '#14121A', LIGHT_INK = '#FFFFFF'
/** The text colour that reads on all the given fills (near-black or white, whichever contrasts more). */
export function readableOn(...fills: string[]) {
  const worst = (ink: string) => Math.min(...fills.map((f) => contrast(ink, f)))
  return worst(DARK_INK) >= worst(LIGHT_INK) ? DARK_INK : LIGHT_INK
}
/** Dark canvas? Decides the decor set and the skin preview lighting. */
export const isDark = (h: string) => luminance(h) < 0.25

/** Every CSS variable a personalised theme sets; the theme blocks in tokens.css set the same names for light and dark. */
export function customVars(c: CustomColors): Record<string, string> {
  const text = readableOn(c.background, c.panel)
  // Muted text: as faint as it can be while still readable on both surfaces.
  let muted = text, w = 0.45
  for (; w > 0; w -= 0.05) { muted = mix(text, c.background, w); if (Math.min(contrast(muted, c.background), contrast(muted, c.panel)) >= 4.5) break }
  const hover = (f: string) => mix(f, luminance(f) > 0.5 ? '#000000' : '#FFFFFF', 0.12)
  const dark = isDark(c.background)
  const tag = (f: string) => (dark ? mix(f, c.background, 0.45) : mix(f, '#FFFFFF', 0.72))
  return {
    '--color-bg': c.background,
    '--color-panel': c.panel,
    '--color-panel-2': mix(c.panel, text, 0.08),
    '--color-primary': c.primary, '--color-primary-hover': hover(c.primary), '--color-on-primary': readableOn(c.primary),
    '--color-secondary': c.secondary, '--color-secondary-hover': hover(c.secondary), '--color-on-secondary': readableOn(c.secondary),
    '--color-idle': c.third, '--color-idle-hover': hover(c.third), '--color-on-idle': readableOn(c.third),
    // Tags, loader labels and the loading ring follow the palette: tints of third, primary and secondary,
    // light on a dark theme's text, dark on a light one; ink is chosen to read on all three.
    '--color-tag-gray': tag(c.third), '--color-green-soft': tag(c.primary), '--color-gold-soft': tag(c.secondary),
    '--color-ink': readableOn(tag(c.third), tag(c.primary), tag(c.secondary)),
    '--color-gold': mix(c.primary, dark ? '#FFFFFF' : '#000000', 0.35), '--color-gold-deep': c.primary,
    '--color-text': text,
    '--color-muted': muted,
    '--color-glass': rgba(c.panel, 0.72),
    '--color-glass-border': rgba(text, 0.12),
    '--shadow-neu': dark ? `0 0 0 1px ${rgba(c.primary, 0.12)}, 0 6px 18px rgba(0, 0, 0, 0.45)` : `3px 3px 8px ${rgba(text, 0.1)}, -3px -3px 8px rgba(255, 255, 255, 0.8)`,
    '--shadow-neu-inset': dark ? `inset 0 2px 8px rgba(0, 0, 0, 0.5), inset 0 0 0 1px ${rgba(c.primary, 0.1)}` : `inset 3px 3px 8px ${rgba(text, 0.08)}, inset -3px -3px 8px rgba(255, 255, 255, 0.8)`,
    '--shadow-primary': `0 4px 12px ${rgba(c.primary, 0.35)}`,
    '--shadow-secondary': `0 4px 12px ${rgba(c.secondary, 0.35)}`,
    '--decor-glow': dark ? `drop-shadow(0 0 12px ${rgba(c.primary, 0.4)})` : 'none',
  }
}

/** The whole custom palette from one accent and a light/dark base: surfaces are faint tints of the accent
 *  over white or black, so nothing else needs picking. The accent is stored as `primary`, the base is read back from the background. */
export function paletteFrom(accent: string, dark: boolean): CustomColors {
  const base = dark ? '#000000' : '#FFFFFF'
  const tint = (w: number) => mix(base, accent, w)
  return dark
    ? { background: tint(0.05), panel: tint(0.1), primary: accent, secondary: tint(0.3), third: tint(0.16) }
    : { background: tint(0.03), panel: tint(0.08), primary: accent, secondary: tint(0.28), third: tint(0.14) }
}

const VARS = Object.keys(customVars(DEFAULT_COLORS))

/** Puts the theme on the page: the data-theme attribute picks the light or dark
 *  block in tokens.css; a personalised theme also sets its derived variables inline. */
export function applyTheme(theme: Theme, colors: CustomColors) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (theme !== 'custom') { VARS.forEach((k) => root.style.removeProperty(k)); root.style.removeProperty('color-scheme'); return }
  for (const [k, v] of Object.entries(customVars(colors))) root.style.setProperty(k, v)
  root.style.setProperty('color-scheme', isDark(colors.background) ? 'dark' : 'light')
}
