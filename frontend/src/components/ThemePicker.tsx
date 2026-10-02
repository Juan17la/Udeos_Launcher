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
  return (
    <div role="radiogroup" aria-label={s.title} className="flex flex-col gap-2">
      {order.map((v) => (
        <div key={v} className={`rounded-md bg-panel-2 border-2 ${theme === v ? 'border-primary' : 'border-transparent'}`}>
          <button type="button" role="radio" aria-checked={theme === v} onClick={() => onTheme(v)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-transparent border-0 text-left cursor-pointer text-text">
            <span className={`w-4 h-4 shrink-0 rounded-full border-2 border-primary ${theme === v ? 'bg-primary' : ''}`} />
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-sm font-bold">{s[v]}</span>
              <span className="text-xs text-muted">{s.hints[v]}</span>
            </span>
          </button>
          {v === 'custom' && theme === 'custom' && (
            <div className="flex items-center gap-3 px-3 pb-3">
              <SegmentedControl aria-label={s.title} value={dark ? 'dark' : 'light'} onChange={(m) => onColors(paletteFrom(colors.primary, m === 'dark'))}
                options={[{ value: 'light', label: <Sun size={18} />, title: s.light }, { value: 'dark', label: <Moon size={18} />, title: s.dark }]} />
              <label title={s.accent} className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden shadow-neu cursor-pointer">
                <input type="color" value={colors.primary} onChange={(e) => onColors(paletteFrom(e.target.value, dark))}
                  className="absolute -inset-2 w-[200%] h-[200%] p-0 border-0 cursor-pointer" />
              </label>
              <span className="text-xs text-muted uppercase flex-1">{colors.primary}</span>
              <Button variant="ghost" size="sm" onClick={() => onColors(DEFAULT_COLORS)}>{s.reset}</Button>
            </div>
          )}
        </div>
      ))}
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
