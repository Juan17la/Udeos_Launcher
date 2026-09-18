import type { ReactNode } from 'react'
import PixelIcon from '../ui/PixelIcon'
import { ICON_CHOICES, iconLabel } from '../assets'

type Props = { value: string; onChange: (key: string) => void; /** An extra first cell (a modpack's own icon), keyed 'modpack'. */ extra?: ReactNode }

/** Grid of the instance icons (assets/ICON_CHOICES): Minecraft green when
 *  selected, the light gray button when not. Scrolls past ~5 rows. */
export default function IconPicker({ value, onChange, extra }: Props) {
  return (
    <div className="grid gap-4 max-h-80 overflow-y-auto p-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
      {extra && <Cell selected={value === 'modpack'} title="Modpack" onClick={() => onChange('modpack')}>{extra}</Cell>}
      {ICON_CHOICES.map((key) => (
        <Cell key={key} selected={value === key} title={iconLabel(key)} onClick={() => onChange(key)}>
          <PixelIcon name={key} size={32} />
        </Cell>
      ))}
    </div>
  )
}

function Cell({ selected, title, onClick, children }: { selected: boolean; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" aria-pressed={selected} title={title} onClick={onClick}
      className={`inline-flex items-center justify-center px-2.5 py-2 rounded-md border-0 cursor-pointer transition-all duration-150 ease-in-out ${selected ? 'bg-primary text-white' : 'bg-idle text-text hover:bg-idle-hover'} shadow-neu`}
    >
      {children}
    </button>
  )
}
