import PixelIcon from '../atoms/PixelIcon'

/** The first tile of the instance and server grids: always there, so creating
 *  is one click from where the player already looks. It shows the page's own item
 *  on the empty state's ground shadow (an instance is a grass block, a server an end
 *  crystal) inside a neutral dashed edge, which turns blue on hover. */
export default function NewTile({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 min-h-40 p-5 rounded-lg cursor-pointer border-[1.5px] border-dashed border-text/20 bg-transparent text-muted font-[inherit] text-sm font-semibold transition-colors hover:border-primary hover:text-text">
      <span aria-hidden className="flex flex-col items-center">
        <PixelIcon name={icon} size={32} />
        <span className="mt-1 h-1 w-7 rounded-full bg-text/15" />
      </span>
      {label}
    </button>
  )
}
