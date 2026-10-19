import { Plus } from '../ui/icons'

/** The first tile of the instance and server grids: always there, so creating
 *  is one click from where the player already looks. */
export default function NewTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex flex-col items-center justify-center gap-3 min-h-40 p-5 rounded-lg cursor-pointer border-2 border-dashed border-primary/30 bg-primary/5 text-muted font-[inherit] text-sm font-medium transition-colors duration-150 hover:border-primary hover:bg-primary/10 hover:text-text focus-visible:outline-2 focus-visible:outline-primary">
      <span aria-hidden className="grid place-items-center w-12 h-12 rounded-xl bg-primary/15 text-primary text-text transition-colors duration-150 group-hover:bg-primary group-hover:text-on-primary"><Plus size={18} /></span>
      {label}
    </button>
  )
}
