import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import SegmentedControl from '../ui/SegmentedControl'
import { Moon, Sun } from '../ui/icons'
import { useApp } from '../state'
import { DEFAULT_COLORS, isDark, paletteFrom, Theme } from '../utils/theme'
import type { CustomColors } from '../api/types'

/** Dark, light or custom. Custom is a light/dark base plus ONE accent colour; every
 *  other colour (surfaces, hovers, text, shadows) is derived from it, and text is chosen
 *  by contrast, so nobody has to tune it. Controlled, so the setup screen can preview
 *  without saving and the theme dialog can save. */
export default function ThemePicker({ theme, colors, onTheme, onColors }: { theme: Theme; colors: CustomColors; onTheme: (t: Theme) => void; onColors: (c: CustomColors) => void }) {
  const { t } = useApp()
  const s = t.theme
  const dark = isDark(colors.background)
  const order: Theme[] = ['light', 'dark', 'custom']
  // Each card previews the real theme: canvas, a sidebar-like panel and the accent.
  const swatch: Record<Theme, { bg: string; panel: string; accent: string }> = {
    dark: { bg: '#0E1423', panel: '#1F293C', accent: '#336CEB' },
    light: { bg: '#EEF3FC', panel: '#FFFFFF', accent: '#2563EB' },
    custom: { bg: colors.background, panel: colors.panel, accent: colors.primary },
  }
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label={s.title} className="grid grid-cols-3 gap-2">
        {order.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={theme === v} title={s.hints[v]} onClick={() => onTheme(v)}
            className={`flex flex-col gap-2 p-2 rounded-lg border-0 bg-panel-2 text-left cursor-pointer text-text transition-shadow duration-150 ${theme === v ? 'shadow-focus' : 'shadow-neu hover:bg-idle'}`}>
            <span aria-hidden className="flex gap-1.5 h-14 p-1.5 rounded-md" style={{ background: swatch[v].bg, boxShadow: 'inset 0 0 0 1px rgba(128,128,128,0.25)' }}>
              <span className="w-1/3 rounded-sm" style={{ background: swatch[v].panel }} />
              <span className="flex-1 flex flex-col gap-1 justify-center">
                <span className="h-1.5 w-3/4 rounded-sm" style={{ background: swatch[v].panel }} />
                <span className="h-3 w-1/2 rounded-sm" style={{ background: swatch[v].accent }} />
              </span>
            </span>
            <span className="px-0.5 text-[13px] font-semibold">{s[v]}</span>
          </button>
        ))}
      </div>
      {theme === 'custom' && (
        <div className="flex items-center gap-3">
          <SegmentedControl aria-label={s.title} value={dark ? 'dark' : 'light'} onChange={(m) => onColors(paletteFrom(colors.primary, m === 'dark'))}
            options={[{ value: 'light', label: <Sun size={16} />, title: s.light }, { value: 'dark', label: <Moon size={16} />, title: s.dark }]} />
          <label title={s.accent} className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden shadow-neu cursor-pointer">
            <input type="color" value={colors.primary} onChange={(e) => onColors(paletteFrom(e.target.value, dark))}
              className="absolute -inset-2 w-[200%] h-[200%] p-0 border-0 cursor-pointer" />
          </label>
          <span className="font-mono text-xs text-muted uppercase flex-1">{colors.primary}</span>
          <Button variant="ghost" size="sm" onClick={() => onColors(DEFAULT_COLORS)}>{s.reset}</Button>
        </div>
      )}
    </div>
  )
}

/** The theme picker from the account menu; choices are live and saved. */
export function ThemeDialog({ onClose }: { onClose: () => void }) {
  const { t, theme, setTheme, colors, setColors } = useApp()
  return (
    <Dialog title={t.theme.title} width={460} onClose={onClose} actions={<Button variant="primary" onClick={onClose}>{t.common.close}</Button>}>
      <ThemePicker theme={theme} colors={colors} onTheme={setTheme} onColors={setColors} />
    </Dialog>
  )
}
