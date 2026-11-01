/** The click target of a card that also holds its own buttons: a real button stretched
 *  over the whole card (keyboard, focus ring and screen-reader name included), so the
 *  card's buttons are siblings, not nested inside a clickable element. The card needs
 *  `relative`; its content sits above with `pointer-events-none`, and its own buttons
 *  take clicks back with `pointer-events-auto`. */
export default function CardLink({ label, title, onClick }: { label: string; title?: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={title} onClick={onClick} className="absolute inset-0 rounded-[inherit] border-0 bg-transparent cursor-pointer" />
}
