import PixelIcon from './PixelIcon'

/** The brand mark, the same in both themes: an ender pearl with a mace
 *  laid diagonally across it. */
export default function Logo({ size }: { size: number }) {
  return (
    <span className="relative inline-block flex-none" style={{ width: size, height: size }} aria-hidden>
      <PixelIcon name="ender_pearl" size={size} />
      <PixelIcon name="mace" size={size * 0.8} className="absolute right-0 bottom-[-5%] -rotate-78 drop-shadow-sm" />
    </span>
  )
}
