import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import SegmentedControl from '../ui/SegmentedControl'
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
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl aria-label={s.title} value={theme} onChange={onTheme}
        options={[{ value: 'dark' as Theme, label: s.dark }, { value: 'light' as Theme, label: s.light }, { value: 'custom' as Theme, label: s.custom }]} />
      <p className="m-0 text-xs text-muted">{s.hints[theme]}</p>
      {theme === 'custom' && (
        <>
          <SegmentedControl aria-label={s.title} value={dark ? 'dark' : 'light'} onChange={(m) => onColors(paletteFrom(colors.primary, m === 'dark'))}
            options={[{ value: 'dark', label: s.dark }, { value: 'light', label: s.light }]} />
          <label className="flex items-center gap-3 px-3 py-2 rounded-md bg-panel-2 cursor-pointer">
            <input type="color" value={colors.primary} onChange={(e) => onColors(paletteFrom(e.target.value, dark))}
              className="w-10 h-10 p-0.5 rounded-md border-0 bg-idle shadow-neu cursor-pointer" />
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-sm font-bold">{s.accent}</span>
              <span className="text-xs text-muted">{s.accentHint}</span>
            </span>
            <span className="text-xs text-muted uppercase">{colors.primary}</span>
          </label>
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={() => onColors(DEFAULT_COLORS)}>{s.reset}</Button>
          </div>
        </>
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
