import PixelIcon from './PixelIcon'
import { ASSETS } from '../assets'
import { useApp } from '../state'

/** The brand mark: the theme's logo asset when one is set in assets/, else
 *  the ender pearl (dark) / grass block (light) texture. */
export default function Logo({ size }: { size: number }) {
  const { theme } = useApp()
  const src = ASSETS.logo[theme]
  if (src) return <img src={src} alt="" width={size} height={size} className="flex-none [image-rendering:pixelated]" />
  return <PixelIcon name={theme === 'dark' ? 'ender_pearl' : 'grass_block_side'} size={size} />
}
