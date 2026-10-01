import { Plus } from '../ui/icons'

/** The first tile of the instance and server grids: always there, so creating
 *  is one click from where the player already looks. */
export default function NewTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 min-h-44 p-5 rounded-md cursor-pointer border-3 border-dashed border-primary/60 bg-primary/10 text-text font-bold font-[inherit] text-base transition-all duration-150 ease-in-out hover:bg-primary/20 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
      <span aria-hidden className="grid place-items-center w-12 h-12 rounded-md bg-primary text-on-primary shadow-primary"><Plus size={22} /></span>
      {label}
    </button>
  )
}
