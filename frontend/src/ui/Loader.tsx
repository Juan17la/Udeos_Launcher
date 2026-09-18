/** Loader for plain fetches (search results, version lists, listings): a
 *  glass pill with a green spinner ring that appears the moment `active` is
 *  true and leaves the moment it is false. `overlay` centres it over the
 *  whole window (app boot); otherwise it is an inline block. */
export default function AutoLoader({ active, label, overlay }: { active: boolean; label?: string; overlay?: boolean }) {
  if (!active) return null
  const pill = (
    <div className="glass inline-flex items-center gap-4 px-5 py-3 animate-[dialog-fade_0.15s_ease-in-out]" role="status" aria-live="polite" aria-busy="true">
      <span aria-hidden className="inline-block shrink-0 w-5.5 h-5.5 rounded-md border-3 border-idle/60 border-t-green animate-spin" />
      {label && <span className="text-sm font-bold whitespace-nowrap">{label}</span>}
    </div>
  )
  if (overlay) return <div className="fixed inset-0 z-9000 grid place-items-center p-4 bg-black/30 backdrop-blur-xs">{pill}</div>
  return <div className="flex items-center justify-center py-4">{pill}</div>
}
