/** The live mark beside a state: a square pixel, never a round dot.
 *  on: green with a ring that grows out of it (a game being played, a server online);
 *  working: gold that breathes (starting, stopping); off: muted and still. */
export default function StatusDot({ tone }: { tone: 'on' | 'working' | 'off' }) {
  const fill = tone === 'on' ? 'bg-green' : tone === 'working' ? 'bg-gold-deep motion-safe:animate-[live-pulse_1.4s_ease-in-out_infinite]' : 'bg-muted'
  return (
    <span aria-hidden className="relative flex-none flex w-2 h-2">
      {tone === 'on' && <span className="absolute inset-0 bg-green opacity-60 motion-safe:animate-[live-ring_1.6s_ease-out_infinite]" />}
      <span className={`relative w-2 h-2 ${fill}`} />
    </span>
  )
}
